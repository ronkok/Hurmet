import { dt, allZeros } from "./constants" // operand type enumeration
import { Rnl } from "./rational"
import { clone, addTextEscapes, unitTeXFromString, tablessTrim } from "./utils"
import { unitFromUnitName } from "./units"
import { errorOprnd } from "./error"
import { Matrix } from "./matrix"
import { format, formattedDecimal } from "./format"

const columnListFromRange = (start, end) => {
  const columnList = []
  for (let i = start; i <= end; i++) {
    columnList.push(i)
  }
  return columnList
}

const valueFromDatum = datum => {
  return datum === "true"
  ? true
  : datum === "false"
  ? false
  : numberRegEx.test(datum)
  ? Rnl.fromString(datum)
  : datum === ""
  ? undefined
  : datum
}

const datumFromValue = (value, dtype) => {
  return value === true
    ? "true"
    : value === false
    ? "false"
    : value = undefined
    ? ""
    : (dtype === dt.RATIONAL)
    ? "0 " + String(value[0]) + "/" + String(value[1])
    : value
}

const range = (df, args, vars, unitAware) => {
  let iStart
  let iEnd
  const rowList = []
  let columnList = []
  let unit = Object.create(null)

  // Find what must be returned. I.e. populate rowList and columnList
  if (df.value.data[0].length === 1) {
    // The source is a single-row data frame. Each argument calls a column.
    iStart = 0
    iEnd = 0
    for (let i = 0; i < args.length; i++) {
      if (args[i].dtype === dt.STRING) {
        columnList.push(df.value.columnMap[args[i].value])
      } else if (args[i].dtype === dt.RATIONAL) {
        columnList.push(Rnl.toNumber(args[i].value))
      } else if (args[i].dtype === dt.RANGE) {
        const jStart = Rnl.toNumber(args[i].value[0])
        const jEnd = Rnl.toNumber(args[i].value[1])
        for (let j = jStart; j <= jEnd; j++) {
          columnList.push(j)
        }
      }
    }
  } else if (args.length === 1 && args[0].dtype === dt.RATIONAL) {
    iStart = Rnl.toNumber(args[0].value) - 1
    iEnd = iStart
    columnList = columnListFromRange(0, df.value.data.length - 1)
  } else if (args.length === 1 && args[0].dtype === dt.RANGE) {
    iStart = Rnl.toNumber(args[0].value[0]) - 1
    iEnd = Rnl.toNumber(args[0].value[1]) - 1
    columnList = columnListFromRange(0, df.value.data.length - 1)
  } else if (args.length === 1 && args[0].dtype === dt.STRING) {
    // Only one indicator has been given.
    // Check both the rowMap and the columnMap.
    if (df.value.rowMap && args[0].value in df.value.rowMap) {
      // Return a row
      iStart = df.value.rowMap[args[0].value]
      iEnd = iStart
      columnList = columnListFromRange(0, df.value.data.length - 1)
    } else if (df.value.columnMap && args[0].value in df.value.columnMap) {
      // Return a column vector
      iStart = 0
      iEnd = df.value.data[0].length - 1
      columnList.push(df.value.columnMap[args[0].value])
    } else {
      return errorOprnd("BAD_ROW_NAME", args[0].value)
    }
  } else if (args.length === 1 && args[0].dtype === dt.STRING + dt.COLUMNVECTOR) {
    // A vector of row names
    for (const rowName of args[0].value) {
      rowList.push(rowName)
    }
    columnList = columnListFromRange(0, df.value.data.length - 1) // All the columns.
  } else if (args.length === 1 && args[0].dtype === dt.STRING + dt.ROWVECTOR) {
    // A vector of column names
    iStart = 0
    iEnd = df.value.data[0].length
    for (const colName of args[0].value) {
      columnList.push(df.columnIndicator[colName])
    }
  } else if (args.length === 2 && args[0].dtype === dt.STRING && df.value.rowMap
    && args[0].value in df.value.rowMap && args[1].dtype === dt.STRING &&
    df.value.columnMap && args[0].value in df.value.columnMap) {
    // Return a single cell value
    iStart = df.value.rowMap[args[0].value]
    iEnd = iStart
    columnList.push(df.value.columnMap[args[0].value])
  }

  if (rowList.length === 0 && iStart === iEnd && columnList.length === 1) {
    // Return one value.
    let dtype = df.value.dtype[columnList[0]]
    if (dtype & dt.QUANTITY) { dtype -= dt.QUANTITY }
    const j = columnList[0]
    let value = valueFromDatum(df.value.data[j][iStart])
    unit.expos = (dtype & dt.RATIONAL) ? allZeros : null
    if (unitAware && df.value.units[j]) {
      const unitName = df.value.units[j] ? df.value.units[j] : undefined
      const unitObj = unitFromUnitName(unitName, vars)
      value = Rnl.multiply(Rnl.add(value, unitObj.gauge), unitObj.factor)
      unit.expos = unitObj.expos
    }
    return { value, unit, dtype }

  } else if (columnList.length === 1) {
    // Return data from one column, in a column vector or a quantity
    const j = columnList[0]
    const unitName = df.value.units[j] ? df.value.units[j] : {}
    unit = (df.unit && df.unit[unitName]) ? df.unit[unitName] : { expos: null }
    const value = df.value.data[j].slice(iStart, iEnd + 1).map(e => valueFromDatum(e))
    const dtype = df.value.dtype[j] + dt.COLUMNVECTOR
    const newdf = { value, name: df.value.headings[j], unit, dtype }
    if (unitAware && unit.gauge) {
      return {
        value: Matrix.convertToBaseUnits(newdf, unit.gauge, unit.factor),
        name: df.value.headings[j],
        unit: { expos: clone(unit.expos) },
        dtype: dt.RATIONAL + dt.COLUMNVECTOR
      }
    } else {
      return newdf
    }

  } else {
    // Return a data frame.
    const headings = []
    const units = []
    const dtype = []
    const data = []
    const columnMap = Object.create(null)
    const unitMap = Object.create(null)
    const rowMap = rowList.length === 0 ? false : Object.create(null)
    for (let j = 0; j < columnList.length; j++) {
      headings.push(df.value.headings[columnList[j]])
      const unitName = df.value.units[columnList[j]]
      units.push(unitName)
      if (unitName && !unitMap[unitName]) { unitMap[unitName] = df.unit[unitName] }
      dtype.push(df.value.dtype[columnList[j]])
      columnMap[df.value.headings[j]] = j
      if (rowList.length > 0) {
        const elements = []
        for (let i = 0; i < rowList.length; i++) {
          const rowName = rowList[i]
          elements.push(df.value.data[columnList[j]][df.value.rowMap[rowName]])
          rowMap[rowName] = i
        }
        data.push(elements)
      } else {
        data.push(df.value.data[columnList[j]].slice(iStart, iEnd + 1))
      }
    }
    return {
      value: {
        data: data,
        headings: headings,
        columnMap: columnMap,
        rowMap: false,
        units: units,
        dtype: dtype
      },
      unit: clone(unitMap),
      dtype: dt.DATAFRAME
    }
  }
}

// const numberRegEx = new RegExp(Rnl.numberPattern + "$")
const numberRegEx = new RegExp("^(?:=|" + Rnl.numberPattern.slice(1) + "$)")
const mixedFractionRegEx = /^-?(?:[0-9]+(?: [0-9]+\/[0-9]+))$/

const dataFrameFromCSV = (str, vars) => {
  // Load a CSV string into a data frame.
  // Data frames are loaded column-wise. The subordinate data structures are:
  const data = []    // where the main data lives, not including column names or units.
  const headings = []                   // An array containing the column names
  const columnMap = Object.create(null) // map of column names to column index numbers
  let rowMap =  false                   // ditto for rows.
  const units = []                      // array of unit names, one for each column
  const dtype = []                      // each column's Hurmet operand type
  const unitMap = Object.create(null)   // map from unit names to unit data
  let gotUnits = false
  // Determine if the file is tab separated or pipe separated
  const sepChar = str.indexOf("\t") > -1 ? "\t" : "|"

  if (str.charAt(0) === "`") { str = str.slice(1) }
  let row = 0
  let col = 0

  // Before we start loading data, let's write two closed functions, to share variable scope.
  const checkForUnitRow = _ => {
    // Determine if there is a row for unit names.
    let gotAnswer = false
    for (let iCol = 0; iCol < data.length; iCol++) {
      if (numberRegEx.test(data[iCol][0])) { gotAnswer = true; break }
    }
    if (!gotAnswer) {
      for (let iCol = 0; iCol < data.length; iCol++) {
        if (numberRegEx.test(data[iCol][1])) { gotUnits = true; break }
      }
    }
    if (gotUnits) {
      // Shift the top row of data into units.
      for (let iCol = 0; iCol < data.length; iCol++) {
        const unitName = data[iCol].shift()
        units.push(unitName)
        if (unitName.length > 0) {
          if (!unitMap[unitName]) {
            const unit = unitFromUnitName(unitName, vars)
            if (unit) {
              unitMap[unitName] = unit
            } else {
              return errorOprnd("DF_UNIT", unitName)
            }
          }
        }
      }
      if (rowMap) {
        Object.entries(rowMap).forEach(([key, value]) => { rowMap[key] = value - 1 })
      }
    }
  }

  const harvest = (datum) => {
    // Load a datum into the dataTable
    datum = datum.trim()

    if (row === 3 && col === 0) { checkForUnitRow() }

    if (row === 0) {
      headings.push(datum)
      columnMap[datum] = col
      if (col === 0 && (datum.length === 0 || datum === "name" || datum === "label")) {
        rowMap = Object.create(null)
      }
    } else {
      if (row === 1) { data.push([]) } // First data row.
      data[col].push(datum)
      if (rowMap && col === 0) {
        rowMap[datum] = row - 1 - (gotUnits ? 1 : 0)
      }
    }
  }

  // With the closure out of the way, let's load in data.
  if (str.indexOf('"') === -1) {
    // There are no quotation marks in the string. Use splits.
    const lines = str.split(/\r?\n/g)
    for (const line of lines) {
      if (line.length > 0) {
        col = 0
        const items = line.split(sepChar)
        for (const item of items) { harvest(item.trim()); col++ }
        row += 1
      }
    }
    if (row === 3) { checkForUnitRow() }

  } else {
    // The string contains at least one quotation mark, so we can't rely on splits.
    // Much of this section comes from https://stackoverflow.com/a/14991797
    let datum = ""
    let inQuote = false  // true means we're inside a quoted field
    // iterate over each character, keep track of current row and column
    for (let c = 0; c < str.length; c++) {
      const cc = str[c]       // current character
      const nc = str[c + 1]   // next character

      // If the current character is a quotation mark, and we're inside a
      // quoted field, and the next character is also a quotation mark,
      // add a quotation mark to the current datum and skip the next character
      if (cc === '"' && inQuote && nc === '"') { datum += cc; ++c; continue; }

      // If it's just one quotation mark, begin/end quoted field
      if (cc === '"') { inQuote = !inQuote; continue; }

      // If it's a separator character and we're not in a quoted field, harvest the datum
      if (cc === sepChar && !inQuote) { harvest(datum); datum = ""; ++col; continue }

      // If it's a CRLF and we're not in a quoted field, skip the next character,
      // harvest the datum, and move on to the next row and move to column 0 of that new row
      if (cc === '\r' && nc === '\n' && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }

      // If it's a CR or LF and we're not in a quoted field, skip the next character,
      // harvest the datum, and move on to the next row and move to column 0 of that new row
      if (cc === "\n" && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }
      if (cc === "\r" && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }

      // Otherwise, append the current character to the current datum
      datum += cc
    }
    if (datum.length > 0) { harvest(datum) }
    if (row === 2) { checkForUnitRow() }
  }

  // Data is loaded in. Finish by determining the operand type of each column
  for (let j = 0; j < data.length; j++) {
    for (let i = 0; i < data[0].length; i++) {
      const datum = data[j][i]
      if (datum === "") { continue } // undefined datum.
      dtype.push(
        numberRegEx.test(datum)
        ? dt.RATIONAL + ((units.length > 0 && units[j].length > 0) ? dt.QUANTITY : 0)
        : (datum === "true" || datum === "false")
        ? dt.BOOLEAN
        : dt.STRING
      )
      break
    }
  }

  // Check if this data qualifies as a Hurmet Map.
  let isMap = false
  if (data[0].length === 1 && Object.keys(unitMap).length === 0) {
    isMap = true
    for (let i = 1; i < dtype.length; i++) {
      if (dtype[i] !== dtype[0]) { isMap = false; break }
    }
  }

  if (isMap) {
    const value = new Map()
    const keys = Object.keys(columnMap)
    for (let i = 0; i < keys.length; i++) {
      value.set(keys[i], valueFromDatum(data[i][0]))
    }
    return {
      value,
      unit: (dtype[0] === dt.RATIONAL ? allZeros : null),
      dtype: dt.MAP + dtype[0]
    }
  } else {
    return {
      value: { data, headings, columnMap, rowMap, units, dtype },
      unit: unitMap,
      dtype: dt.DATAFRAME
    }
  }
}

const dataFrameFromVectors = (vectors, vars) => {
  // Take an array of vectors and return a dataframe.
  const data = []
  const headings = []
  const columnMap = Object.create(null)
  const units = []
  const dtype = []
  const unitMap = Object.create(null)
  const rowMap = (vectors[0].name && vectors[0].name === "name") ? Object.create(null) : false
  for (let j = 0; j < vectors.length; j++) {
    const vector = vectors[j]
    const vectorType = (vector.dtype & dt.ROWVECTOR)
      ? dt.ROWVECTOR
      : (vector.dtype & dt.COLUMNVECTOR)
      ? dt.COLUMNVECTOR
      : dt.ERROR
    if (vectorType === dt.ERROR) { return errorOprnd("NOT_VECTOR") }
    headings.push(vector.name)
    columnMap[vector.name] = j
    const colDtype = vector.dtype - vectorType
    data.push(vector.value.map(e => datumFromValue(e, colDtype)))
    dtype.push(colDtype)
    if (vector.unit.name) {
      units.push(vector.unit.name)
      if (!unitMap[vector.unit.name]) {
        const unit = unitFromUnitName(vector.unit.name, vars)
        unitMap[vector.unit.name] = unit
      }
    } else {
      units.push(null)
    }
    if (rowMap) {
      const nameVector = vectors[0].value
      for (let i = 0; i < nameVector.length; i++) {
        rowMap[nameVector[i]] = i
      }
    }
  }
  return {
    value: {
      data: data,
      headings: headings,
      columnMap: columnMap,
      rowMap: rowMap,
      units: units,
      dtype: dtype
    },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
}

const matrix2table = (matrix, rowNames, columnNames, vars) => {
  // Use the contents of a matrix to create a dataframe.
  const data = []
  for (let i = 0; i <= matrix.value[0].length; i++) { data.push([]) }
  const headings = columnNames.value
  headings.unshift("")
  const columnMap = Object.create(null)
  for (let i = 1; i < columnNames.value[0].length; i++) { columnMap[headings[i]] = i }
  const colDtype = dt.RATIONAL + (matrix.unit ? dt.QUANTITY : 0)
  const dtype = Array(matrix.value[0].length).fill(colDtype)
  dtype.unshift(null)
  let units = []
  const unitMap = Object.create(null)
  if (matrix.unit.name) {
    units = Array(matrix.value[0].length).fill(matrix.unit.name)
    units.unshift("")
    unitMap[matrix.unit.name] = unitFromUnitName(matrix.unit.name, vars)
  }

  const rowMap = Object.create(null)
  data[0] = rowNames.value
  const formatSpec = vars.format ? vars.format.value : "h15"
  for (let i = 0; i < rowNames.value.length; i++) { rowMap[data[0][i]] = i }
  for (let i = 0; i < matrix.value.length; i++) {
    for (let j = 0; j < matrix.value[0].length; j++) {
      const value = matrix.value[i][j];
      data[j + 1].push(format(value, formatSpec, "1000000."))
    }
  }

  return {
    value: { data, headings, columnMap, rowMap, units, dtype },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
}

const append = (o1, o2, vars, unitAware) => {
  // Append a vector to a dataframe.
  const oprnd = clone(o1) // We employ copy-on-write for data frames.
  const numRows = o1.value.data[0].length
  if (numRows !== o2.value.length) { return errorOprnd("BAD_CONCAT") }
  oprnd.value.headings.push(o2.name)
  oprnd.value.columnMap[o2.name] = o1.value.headings.length - 1
  const dtype = (o2.dtype & dt.COLUMNVECTOR)
    ? o2.dtype - dt.COLUMNVECTOR
    : o2.dtype - dt.ROWVECTOR
  if (o2.unit.name && o2.unit.name.length > 0) {
    oprnd.value.units.push(o2.unit.name)
    const unit = unitFromUnitName(o2.unit.name, vars)
    if (!oprnd.unit[o2.unit.name]) {
      oprnd.unit[o2.unit.name] = unit
    }
    if (unitAware) {
      const v = Matrix.convertFromBaseUnits(o2, unit.gauge, unit.factor)
      oprnd.value.data.push(v.map(e => datumFromValue(e, dtype)))
    } else {
      oprnd.value.data.push(o2.value.map(e => datumFromValue(e, dtype)))
    }
  } else {
    oprnd.value.units.push(null)
  }
  oprnd.value.dtype.push(dtype)
  return oprnd
}

const quickDisplay = str => {
  // This is called from the lexer for a display that changes with every keystroke.
  // It is a quick, rough approximation of a CSV parser.
  // I use this partly for speed, partly because it is more tolerant of badly formatted CSV
  // while the author is composing the CSV. This function doesn't spit up many error messages.
  // Final rendering of a data frame does not use this function.
  // Final rendering calls dataFrameFromCSV() and display() for accurate CSV parsing.
  if (str === "") { return "" }
  str = addTextEscapes(str.trim())
  const sepRegEx = str.indexOf("\t") > -1
    ? / *\t */g
    : / *\| */g
  const lines = str.split(/\r?\n/g)
  let tex = ""
  if (lines.length < 3) {
    tex = "\\begin{matrix}\\text{"
    for (let i = 0; i < lines.length; i++) {
      tex += tablessTrim(lines[i]).replace(sepRegEx, "} & \\text{") + "} \\\\ \\text{"
    }
    tex = tex.slice(0, -10) + "\\end{matrix}"
  } else {
    tex = "\\begin{array}{l|cccccccccccccccccccccccc}\\text{"
    const cells = new Array(lines.length)
    for (let i = 0; i < lines.length; i++) {
      cells[i] = tablessTrim(lines[i]).split(sepRegEx)
    }

    let gotUnits = false
    let gotAnswer = false
    for (let j = 0; j < cells[1].length; j++) {
      if (numberRegEx.test(cells[1][j])) { gotAnswer = true; break }
    }
    if (!gotAnswer) {
      // line[1] had no numbers. If any numbers are ine line[2] then line[1] is units.
      for (let j = 0; j < cells[2].length; j++) {
        if (numberRegEx.test(cells[2][j])) { gotUnits = true; break }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      tex += tablessTrim(lines[i]).replace(sepRegEx, "} & \\text{")
      tex += ((gotUnits && i === 1) || (!gotUnits && i === 0))
        ? "} \\\\ \\hline \\text{"
        : "} \\\\ \\text{"
    }

    tex = tex.slice(0, -10) + "\\end{array}"
  }
  tex = tex.replace(/·/g, "$·$")
  return tex
}

// The next 40 lines contain helper functions for display().
const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/
const accentRegEx = /^([^\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]+)([\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1])(.+)?/
const subscriptRegEx = /([^_]+)(_[^']+)?(.*)?/
const accentFromChar = Object.freeze({
  "\u0300": "\\grave",
  "\u0301": "\\acute",
  "\u0302": "\\hat",
  "\u0303": "\\tilde",
  "\u0304": "\\bar",
  "\u0305": "\\bar",
  "\u0307": "\\dot",
  "\u0308": "\\ddot",
  "\u030A": "\\mathring",
  "\u030C": "\\check",
  "\u0332": "\\underline",
  "\u20d0": "\\overleftharpoon",
  "\u20d1": "\\overrightharpoon",
  "\u20d6": "\\overleftarrow",
  "\u20d7": "\\vec",
  "\u20e1": "\\overleftrightarrow"
})
export const formatColumnName = str => {
  // We can't call parse(str) because that would be a circular dependency.
  // So this module needs its own function to format dataframe column names.
  if (!isValidIdentifier.test(str)) {
    return "\\text{" + addTextEscapes(str) + "}"
  } else {
    // Format it like a Hurmet identifier.
    str = str.replace(/′/g, "'") // primes
    let parts = str.match(accentRegEx)
    if (parts) {
      str = accentFromChar[parts[2]] + "{" + parts[1] + "}"
      return str + (parts[3] ? parts[3] : "")
    } else {
      parts = str.match(subscriptRegEx)
      let result = parts[1].length > 1 ? `\\text{${parts[1]}}` : parts[1]
      if (parts[2]) {
        result += "_" + `\\text{${parts[2].slice(1)}}`
      }
      return result + (parts[3] ? parts[3] : "")
    }
  }
}

const isNotEmpty = row => {
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== "" && row[i] !== null) { return true }
  }
  return false
}

const getNumInfo =  df => {
  // Gather info for in setting numbers on a decimal tab.
  const numCols = df.data.length
  const colInfo = new Array(numCols)
  const cellInfo = new Array(numCols)
  for (let j = 0; j < numCols; j++) {
    if (df.dtype[j] & dt.RATIONAL) {
      colInfo[j] = { hasAlignChar: false, maxLenAfterAlignChar: 0 }
      cellInfo[j] = []
      for (let i = 0; i < df.data[0].length; i++) {
        const datum = df.data[j][i]
        const pos = datum.indexOf(".")
        const hasAlignChar = pos > -1
        const lenAfterAlignChar = hasAlignChar ? datum.length - pos - 1 : 0
        cellInfo[j].push({ hasAlignChar, lenAfterAlignChar })
        if (hasAlignChar) {
          colInfo[j].hasAlignChar = true
          if (lenAfterAlignChar > colInfo[j].maxLenAfterAlignChar) {
            colInfo[j].maxLenAfterAlignChar = lenAfterAlignChar
          }
        }
      }
    }
  }
  return [colInfo, cellInfo]
}

const displayNum = (datum, colInfo, cellInfo, decimalFormat) => {
  let str = formattedDecimal(datum, decimalFormat)
  const n = colInfo.maxLenAfterAlignChar - cellInfo.lenAfterAlignChar
  if (colInfo.hasAlignChar && (n > 0 || !cellInfo.hasAlignChar)) {
    str += "\\phantom{"
    if (colInfo.hasAlignChar && !cellInfo.hasAlignChar) {
      str += decimalFormat.slice(-1) === "." ? "." : "{,}"
    }
    if (n > 0) { str += "0".repeat(n) }
    str += "}"
  }
  return str
}

const display = (df, formatSpec = "h3", decimalFormat = "1,000,000.", omitHeading = false) => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length
  const numCols = df.data.length
  const writeRowNums = numRows > 5 && !df.rowMap
  const numColsInHeading = numCols + (writeRowNums ? 1 : 0)
  let str = "\\begin{array}{"
  str += df.rowMap
    ? "l|"
    : writeRowNums
    ? "r|"
    : ""
  for (let j = 1; j < numColsInHeading; j++) {
    str += (df.dtype[j] & dt.RATIONAL ? "r " : "l " )
  }
  str = str.slice(0, -1) + "}"

  if (!omitHeading) {
    // Write the column names
    if (writeRowNums) { str += "&" }
    for (let j = 0; j < numCols; j++) {
      str += "{" + formatColumnName(df.headings[j]) + "}&"
    }
    str = str.slice(0, -1) + " \\\\ "
  }

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (writeRowNums) { str += "&" }
    for (let j = 0; j < numCols; j++) {
      let rowTex = ""
      if (df.units[j] && df.units[j].length > 0) {
        const unitTex = unitTeXFromString(df.units[j])
        rowTex = unitTex.replace("\\;\\, ", "")
      } else {
        rowTex = ""
      }
      str += rowTex + "&"
    }
    str = str.slice(0, -1) + " \\\\ "
  }
  str += "\\hline "

  const [colInfo, cellInfo] = getNumInfo(df)

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (writeRowNums) { str += String(i + 1) + " & " }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i]
      str += mixedFractionRegEx.test(datum)
        ? format(Rnl.fromString(datum), formatSpec, decimalFormat) + "&"
        : numberRegEx.test(datum)
        ? displayNum(datum, colInfo[j], cellInfo[j][i], decimalFormat) + "&"
//        ? formattedDecimal(datum, decimalFormat) + "&"
        : datum === ""
        ? "&"
        : "\\text{" + addTextEscapes(datum) + "}&"
    }
    str = str.slice(0, -1) + " \\\\ "
  }

  str = str.slice(0, -3).trim()
  str += "\\end{array}"
  return str
}

const displayAlt = (df, formatSpec = "h3", omitHeading = false) => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length
  const numCols = df.data.length
  const writeRowNums = numRows > 5 && !df.rowMap
  let str = "``"

  if (!omitHeading) {
    // Write the column names
    if (writeRowNums) { str += "|" }
    str += ( df.headings[0] === "name" ? "" : df.headings[0]) + "|"
    for (let j = 1; j < numCols; j++) {
      str += df.headings[j] + "|"
    }
    str = str.slice(0, -1) + "\n"
  }

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (writeRowNums) { str += "|" }
    for (let j = 0; j < numCols; j++) {
      str += df.units[j] + "|"
    }
    str = str.slice(0, -1) + "\n"
  }

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (writeRowNums) { str += String(i + 1) + "|" }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i]
      if (mixedFractionRegEx.test(datum)) {
        str += format(Rnl.fromString(datum), formatSpec, "100000.") + "|"
      } else {
        str += datum + "|"
      }
    }
    str = str.slice(0, -1) + "\n"
  }

  str = str.slice(0, -1).trim()
  str += "``"
  return str
}

export const DataFrame = Object.freeze({
  append,
  dataFrameFromCSV,
  dataFrameFromVectors,
  matrix2table,
  display,
  displayAlt,
  quickDisplay,
  range
})
