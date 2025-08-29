/* eslint-disable no-alert */
import { dt, allZeros } from "./constants"
import { hurmetMarkdownSerializer } from "./to_markdown"
import { md2text, md2html } from "./md2html"
import { unitFromUnitName } from "./units"
import { parse } from "./parser"
import { Rnl } from "./rational"
import { valueFromLiteral, complexRegEx } from "./literal"
import { arrayOfRegExMatches } from "./utils"

// TODO: Edit the sheetName regex to ensure that the sheetName is a valid identifier
const sheetNameRegEx = /^[\w]+\b/

export const sheetLimits = (doc, inputPos) => {
  // Find the extent of the table
  let tableStart = 0
  let tableEnd = 0
  let parent
  for (let d = inputPos.depth; d > 0; d--) {
    const node = inputPos.node(d)
    if (node.type.spec.tableRole === 'table') {
      tableStart = inputPos.before(d)
      tableEnd =  inputPos.after(d)
      parent = inputPos.node(d - 1)
      break
    }
  }
  return [tableStart, tableEnd, parent]
}

const numberRegEx = new RegExp(Rnl.numberPattern)
const cellRefRegEx = /"[A-Z][1-9]+"/g
const innerRefRegEx = /^(?:[A-Z](?:\d+|_end)|up|left)$/
const sumRegEx = /¿(up|left)([\xa0§])sum[\xa0§]1(?=[\xa0§]|$)/g
const spreadsheetRegEx = / spreadsheet\b/
const grafRegEx = /\n\n/

// Compile a spreadsheet cell.

export const compileCell = (attrs, sheetAttrs, unit, previousAttrs,
                            formats = "1,000,000.") => {
  const newAttrs = { entry: attrs.entry, name: attrs.name }
  const entry = attrs.entry
  if (entry.length === 0) {
    newAttrs.value = null
    newAttrs.dtype = dt.NULL
  } else if (entry.slice(0, 1) === "=") {
    // Get the RPN of an expression
    const expression = entry.replace(/^==?/, "").trim()
    // TODO: Revise the parser to handle spreadsheet cell names & sheetname
    // eslint-disable-next-line prefer-const
    let [_, rpn, dependencies] = parse(expression, formats, true, false, sheetAttrs.name)
    const outerDependencies = new Set()
    for (const dependency of dependencies) {
      if (!innerRefRegEx.test(dependency)) {
        outerDependencies.add(dependency)
      }
    }

    // Implement sum(up) and sum(left)
    // Orig RPN:    ¿up sum 1
    // Desired RPN: ¿sheetName "D" spreadsheetSum   or   ¿sheetName "3" spreadsheetSum
    let sumMatch
    while ((sumMatch = sumRegEx.exec(rpn)) !== null) {
      const str = sumMatch[1] === "up" ? attrs.name.slice(0, 1) : attrs.name.slice(1, 2)
      rpn = rpn.slice(0, sumMatch.index) + `¿${sheetAttrs.name}` + sumMatch[2]
            + `"${str}"` + sumMatch[2] + "spreadsheetSum"
            + rpn.slice(sumMatch.index + sumMatch[0].length)
    }

    newAttrs.rpn = rpn
    newAttrs.dependencies = outerDependencies.size > 0
      ? [...(outerDependencies.values())]
      : [];
    newAttrs.resulttemplate = (entry.length > 1 &&  entry.slice(1, 2) === "=")
      ? "@@"
      : "@"
    newAttrs.altresulttemplate = newAttrs.resulttemplate
    newAttrs.resultdisplay = newAttrs.resulttemplate
    newAttrs.unit = unit ? unit : { factor: Rnl.one, gauge: Rnl.zero, expos: allZeros }
  } else if (entry === '"' || entry === '“') {
    // The ditto of the previous cell
    if (previousAttrs.rpn) {
      let rpn = previousAttrs.rpn
      const matches = arrayOfRegExMatches(cellRefRegEx, rpn)
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const rowNum = Math.min(sheetAttrs.numRows - 1, Number(match.value.slice(2, -1)) + 1)
        rpn = rpn.slice(0, match.index + 2) + String(rowNum)
            + rpn.slice(match.index + match.length - String(rowNum).length)
      }
      newAttrs.rpn = rpn
      newAttrs.resulttemplate = previousAttrs.resulttemplate
      newAttrs.altresulttemplate = newAttrs.resulttemplate
      newAttrs.resultdisplay = newAttrs.resulttemplate
      newAttrs.unit = previousAttrs.unit
    } else {
      newAttrs.value = previousAttrs.value
      newAttrs.dtype = previousAttrs.dtype
      newAttrs.display = previousAttrs.display ? previousAttrs.display : previousAttrs.entry
    }
    // TODO: unitAware, dependencies
  } else {
    // A literal value
    const numCandidate = entry.replace(/,/g, "")
    if (numberRegEx.test(numCandidate)) {
      let value = Rnl.fromString(numCandidate)
      let dtype = dt.RATIONAL
      if (unit) {
        value = {
          plain: value,
          inBaseUnits: Rnl.multiply(Rnl.add(value, unit.gauge), unit.factor)
        }
        dtype += dt.QUANTITY
      }
      newAttrs.value = value
      newAttrs.dtype = dtype
    } else if (entry === "true" || entry === "false") {
      newAttrs.value = Boolean(entry)
      newAttrs.dtype = dt.BOOLEAN
    } else if (complexRegEx.test(entry)) {
      // eslint-disable-next-line no-unused-vars
      const [value, unit, dtype, _] = valueFromLiteral(entry, attrs.name, formats)
      newAttrs.value = value
      newAttrs.dtype = dtype
    } else {
      newAttrs.value = entry
      newAttrs.dtype = dt.STRING
    }
  }
  return newAttrs
}

// Compile a spreadsheet

export const compileSheet = (table, formats) => {
  // The cell entries and the sheet name are already known.
  // Proceed to compile the rest of the table and cell attributes.
  // Stop short of calculations.
  table.attrs.numRows = table.content.length
  table.attrs.columnMap = {}
  table.attrs.rowMap = {}
  table.attrs.unitMap = [];
  table.attrs.units = {}
  table.attrs.dependencies = [];
  table.attrs.dtype = dt.SPREADSHEET
  if (table.content[0].type === "colGroup") { table.content.shift() }

  const numRows = table.content.length
  table.attrs.numRows = numRows
  const numCols = table.content[0].content.length
  // Proceed column-wise thru the table.
  for (let j = 0; j < numCols; j++) {
    let previousAttrs = {}
    for (let i = 0; i < numRows; i++) {
      const cell = table.content[i].content[j].content[0];
      const cellName = String.fromCodePoint(65 + j) + String(i)
      const entry = cell.attrs.entry
      if (i === 0) {
        const str = md2text(entry)
        let heading = ""
        let unitName = ""
        const posNewline = str.indexOf("\n")
        if (posNewline === -1) {
          heading = str.trim()
        } else {
          unitName = str.slice(posNewline + 1).trim()
          heading = str.slice(0, posNewline).trim()
        }
        table.attrs.columnMap[heading] = cellName.slice(0, 1)
        if (unitName.length > 0) {
          const unit = unitFromUnitName(unitName)
          if (unit.dtype && unit.dtype === dt.ERROR) {
            unitName = ""
          } else {
            table.attrs.units[unitName] = unit
          }
        }
        table.attrs.unitMap.push(unitName)
      } else {
        // A data cell, not a top row heading
        if (j === 0) { table.attrs.rowMap[entry] = i }
      }
      const newCell = { type: "spreadsheet_cell", attrs: { entry } }
      if (i === 0) {
        newCell.attrs.display = md2html(entry)
      } else {
        newCell.attrs.name = cellName
        const unit = (table.attrs.unitMap[j].length > 0)
          ? table.attrs.units[table.attrs.unitMap[j]]
          : null
        newCell.attrs = compileCell(newCell.attrs, table.attrs, unit, previousAttrs,
                                    formats)
        previousAttrs = newCell.attrs
        previousAttrs.unit = unit
        if (newCell.attrs.dependencies) {
          for (const d of newCell.attrs.dependencies) {
            if (!table.attrs.dependencies.includes(d)) {
              table.attrs.dependencies.push(d)
            }
          }
        }
      }
      table.content[i].content[j].content = [newCell];
    }
  }
  return table
}

export const tableToSheet = (state, tableNode) => {
  // Get the extent of the table.
  const [tableStart, tableEnd, parent] = sheetLimits(state.doc, state.selection.$from)

  // Get the spreadsheet's name
  if (parent.content.content === 1 ||
      parent.content.content[0].type.name !== "figcaption") {
    alert("Table must have a caption that begins with the spreadsheet’s name.")
  }
  const caption = parent.content.content[0];
  const str = caption.textContent
  if (str.length === 0) {
    alert("Table caption must contain a string that begins with the spreadsheet’s name.")
    return
  }
  const match = sheetNameRegEx.exec(str)
  if (!match) {
    alert("Table caption must begin with a valid identifier for the spreadsheet’s name.")
    return
  }
  const sheetName = match[0];

  // Copy tableNode to an object w/o all the ProseMirror methods.
  let table = tableNode.toJSON()
  table.attrs.name = sheetName

  // Get the cell entries.
  const numRows = table.content.length
  const numCols = table.content[0].content.length
  // Proceed column-wise thru the table.
  for (let j = 0; j < numCols; j++) {
    for (let i = 0; i < numRows; i++) {
      const cell = tableNode.content.content[i].content.content[j];
      let entry = (i === 0)
        ? hurmetMarkdownSerializer.serialize(cell, new Map(), [])
        : cell.textContent
      if (i === 0) {
        entry = entry.replace(grafRegEx, "\\\n")
        if (entry === "¶") { entry = "" }
      }
      const newCell = { type: "spreadsheet_cell", attrs: { entry } }
      if (i === 0) { newCell.attrs.display = md2html(entry) }
      table.content[i].content[j].content = [newCell];
    }
  }
  const formats = {
    decimalFormat: state.doc.attrs.decimalFormat,
    dateFormat: state.doc.attrs.dateFormat
  }
  table = compileSheet(table, formats)
  table.attrs.class += " spreadsheet"
  table.attrs.dtype = dt.SPREADSHEET
  return [table, tableStart, tableEnd]
}

export const sheetToTable = (state, tableNode) => {
  const table = tableNode.toJSON()
  const classes = table.attrs.class.replace(spreadsheetRegEx, "")
  table.attrs = { class: classes, dtype: dt.NULL }
  // Un-freeze the data cells. Display the entries.
  const rows = table.content
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].content;
    for (let j = 0; j < row.length; j++) {
      const text = row[j].content[0].attrs.entry
      if (text.length > 0) {
        row[j].content = [{ type: "paragraph", content: [{ type: "text", text }] }]
      } else {
        row[j].content = [{ type: "paragraph", content: [] }]
      }
    }
  }
  const [tableStart, tableEnd, _] = sheetLimits(state.doc, state.selection.$from)
  return [table, tableStart, tableEnd]
}
