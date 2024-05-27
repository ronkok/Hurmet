/* eslint-disable no-alert */
import { dt, allZeros } from "./constants"
import { parse } from "./parser"
import hurmet from "./hurmet"
import { Rnl } from "./rational"
import { hurmetMarkdownSerializer } from "./to_markdown"
import { syncMD2html } from "./md2html"
import { md2ast } from "./md2ast"
import { valueFromLiteral, complexRegEx } from "./literal"
import { unitFromUnitName } from "./units"
import { arrayOfRegExMatches } from "./utils"

const numberRegEx = new RegExp(Rnl.numberPattern)
const cellRefRegEx = /"[A-Z][1-9]\d*"/g
const sumRegEx = /¿(up|left)([\xa0§])sum[\xa0§]1(?=[\xa0§]|$)/g
const endRegEx = /([\xa0§]|^)¿([A-Z])_end([\xa0§]|$)/g
// TODO: Edit the regex so that the sheetName is a valid identifier
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

export const compileCell = (attrs, sheetAttrs, unit, previousRPN, prevResultTemplate, prevUnit,
                     decimalFormat = "1,000,000.") => {
  const newAttrs = { entry: attrs.entry, name: attrs.name }
  const entry = attrs.entry
  const numRows = Object.keys(sheetAttrs.rowMap).length
  if (entry.length === 0) {
    newAttrs.value = null
    newAttrs.dtype = dt.NULL
  } else if (entry.slice(0, 1) === "=") {
    // Get the RPN of an expression
    const expression = entry.replace(/^==?/, "").trim()
    // TODO: Revise the parser to handle spreadsheet cell names & sheetname
    // eslint-disable-next-line prefer-const
    let [_, rpn, dependencies] = parse(expression, decimalFormat, true, false, sheetAttrs.name)

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

    // Implement A_end
    // Orig RPN:    ¿A_end
    // Desired RPN: sheetname "A6" .
    let endMatch
    while ((endMatch = endRegEx.exec(rpn)) !== null) {
      const tokenSep = endMatch[1]
        ? endMatch[1]
        : endMatch[3]
        ? endMatch[3]
        : "\xa0"
      rpn = rpn.slice(0, endMatch.index) + endMatch[1] + '¿' + sheetAttrs.name + tokenSep + '"'
            + endMatch[2] + numRows + '"' + tokenSep + "."
            + endMatch[3] + rpn.slice(endMatch.index + endMatch[0].length)
    }

    newAttrs.rpn = rpn
    newAttrs.dependencies = dependencies
    newAttrs.resulttemplate = (entry.length > 1 &&  entry.slice(1, 2) !== "=")
      ? "@@"
      : "@"
    newAttrs.unit = unit ? unit : { factor: Rnl.one, gauge: Rnl.zero, expos: allZeros }
  } else if (entry === '"' || entry === '“') {
    // The ditto of the previous cell's RPN
    let rpn = previousRPN
    const matches = arrayOfRegExMatches(cellRefRegEx, rpn)
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const rowNum = Math.min(numRows, Number(match.value.slice(2, -1)) + 1)
      rpn = rpn.slice(0, match.index + 2) + String(rowNum)
          + rpn.slice(match.index + match.length - 1)
    }
    newAttrs.rpn = rpn
    newAttrs.resulttemplate = prevResultTemplate
    newAttrs.unit = prevUnit
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
      const [value, unit, dtype, _] = valueFromLiteral(entry, attrs.name, decimalFormat)
      newAttrs.value = value
      newAttrs.dtype = dtype
    } else {
      newAttrs.value = entry
      newAttrs.dtype = dt.STRING
    }
  }
  return newAttrs
}

export const tableToSheet = (state, view, table) => {
  // Copy table to an object w/o all the ProseMirror methods.
  const tableObj = table.toJSON()
  tableObj.attrs.isSpreadsheet = true
  tableObj.attrs.columnMap = {}
  tableObj.attrs.rowMap = {}
  tableObj.attrs.unitMap = [];
  tableObj.attrs.units = {}
  tableObj.attrs.dependencies = {}

  const [tableStart, tableEnd, parent] = sheetLimits(state.doc, state.selection.$from)

  // Get the spreadsheet's name
  if (parent.content.content === 1 ||
      parent.content.content[1].type.name !== "figcaption") {
    alert("Table must have a caption that begins with the spreadsheet’s name.")
  }
  const caption = parent.content.content[1];
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
  tableObj.attrs.name = sheetName

  // Freeze the cells.
  const numRows = tableObj.content.length
  const numCols = tableObj.content[0].content.length
  const decimalFormat = state.doc.decimalFormat
  // Proceed column-wise thru the table.
  for (let j = 0; j < numCols; j++) {
    let previousRPN = ""
    let prevResultTemplate
    let prevUnit
    for (let i = 0; i < numRows; i++) {
      const cell = table.content.content[i].content.content[j];
      const cellName = String.fromCodePoint(65 + j) + String(i)
      let entry
      if (i === 0) {
        entry = hurmetMarkdownSerializer.serialize(cell, new Map(), [])
        const str = cell.textContent
        let heading = ""
        let unitName = ""
        const posNewline = entry.indexOf("\\\n")
        if (posNewline === -1) {
          heading = cell.textContent.trim()
        } else {
          const rawUnitName = entry.slice(posNewline + 2)
          // TODO: Accommodate Markdown exponents in unitName
          unitName = rawUnitName.trim()
          heading = str.slice(0, str.length - rawUnitName.length).trim()
        }
        tableObj.attrs.columnMap[heading] = j
        if (unitName.length > 0) {
          const unit = unitFromUnitName(unitName)
          if (unit.dtype && unit.dtype === dt.ERROR) {
            unitName = ""
          } else {
            tableObj.attrs.units[unitName] = unit
          }
        }
        tableObj.attrs.unitMap.push(unitName)
      } else {
        // A data cell, not a top row heading
        entry = cell.textContent
        if (j === 0) { tableObj.attrs.rowMap[entry] = i }
      }
      const newCell = { type: "spreadsheet_cell", attrs: { entry } }
      if (i === 0) {
        newCell.attrs.display = syncMD2html(entry)
      } else {
        newCell.attrs.name = cellName
        const unit = (tableObj.attrs.unitMap[j] === "")
          ? tableObj.attrs.units[tableObj.attrs.unitMap[j]]
          : null
        newCell.attrs = compileCell(newCell.attrs, tableObj.attrs, unit, previousRPN,
                                    prevResultTemplate, prevUnit, decimalFormat)
        if (newCell.attrs.rpn) {
          previousRPN = newCell.attrs.rpn
          prevResultTemplate = newCell.attrs.prevResultTemplate
          prevUnit = unit
        }
      }
      tableObj.content[i].content[j].content = [newCell];
    }
  }

  const tr = state.tr
  tr.replaceWith(tableStart, tableEnd, state.schema.nodeFromJSON(tableObj))
  view.dispatch(tr)
  hurmet.updateCalculations(view, false, tableObj.attrs, tableStart)
}

export const sheetToTable = (state, view, table) => {
  const tableObj = table.toJSON()
  tableObj.attrs = { class: tableObj.attrs.class, isSpreadsheet: false }
  // Un-freeze the data cells. Display the entries.
  const rows = tableObj.content
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].content;
    for (let j = 0; j < row.length; j++) {
      if (i === 0) {
        row[j].content = md2ast(row[j].content[0].attrs.entry)
      } else {
        const text = row[j].content[0].attrs.entry
        if (text.length > 0) {
          row[j].content = [{ type: "paragraph", content: [{ type: "text", text }] }]
        } else {
          row[j].content = [{ type: "paragraph", content: [] }]
        }
      }
    }
  }
  const [tableStart, tableEnd, _] = sheetLimits(state.doc, state.selection.$from)
  const tr = state.tr
  tr.replaceWith(tableStart, tableEnd, state.schema.nodeFromJSON(tableObj))
  view.dispatch(tr)
}
