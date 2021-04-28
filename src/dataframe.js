import { dt, allZeros } from "./constants" // operand type enumeration
import { Rnl } from "./rational"
import { clone, addTextEscapes, unitTeXFromString } from "./utils"
import { unitFromUnitName } from "./units"
import { errorOprnd } from "./error"
import { Matrix } from "./matrix"
import { format } from "./format"

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

const range = (oprnd, rowIndicator, columnIndicator, vars, unitAware) => {
  let iStart
  let iEnd
  let columnList = []
  let unitMap
  let unit = Object.create(null)
  if ((!columnIndicator || (columnIndicator.dtype === 1 &&
      Rnl.isZero(columnIndicator.value))) && rowIndicator.dtype === dt.RATIONAL) {
    iStart = Rnl.toNumber(rowIndicator.value) - 1
    iEnd = iStart
    columnList = columnListFromRange(0, oprnd.value.data.length - 1)
  } else if ((!columnIndicator || (columnIndicator.dtype === 1 &&
      Rnl.isZero(columnIndicator.value))) && rowIndicator.dtype === dt.STRING) {
    // Only one indicator has been given.
    // Check both the rowMap and the columnMap.
    if (oprnd.value.rowMap && rowIndicator.value in oprnd.value.rowMap) {
      iStart = oprnd.value.rowMap[rowIndicator.value]
      iEnd = iStart
      columnList = columnListFromRange(0, oprnd.value.data.length - 1)
    } else if (oprnd.value.columnMap && rowIndicator.value in oprnd.value.columnMap) {
      iStart = 0
      iEnd = oprnd.value.data[0].length - 1
      columnList.push(oprnd.value.columnMap[rowIndicator.value])
    } else {
      return errorOprnd("BAD_ROW_NAME", rowIndicator.value)
    }
  } else {
    if (rowIndicator.dtype === dt.STRING) {
      iStart = oprnd.value.rowMap[rowIndicator.value]
      if (isNaN(iStart)) {
        return errorOprnd("BAD_ROW_NAME", rowIndicator.value)
      }
      iEnd = iStart
    } else if (rowIndicator.dtype === dt.RATIONAL) {
      if (Rnl.toNumber(rowIndicator.value) === 0) {
        // Return all the rows, in a column vector
        iStart = 0
        iEnd = oprnd.value.data[0].length - 1
      } else {
        iStart = Rnl.toNumber(rowIndicator.value) - 1
        iEnd = iStart
      }
    } else if (rowIndicator.dtype === dt.RANGE) {
      iStart = Rnl.toNumber(rowIndicator.value[0]) - 1
      iEnd = Rnl.toNumber(rowIndicator.value[2]) - 1
    } else if (Matrix.isVector(rowIndicator)) {
      // iStart and iEnd aren't relevant.
    } else {
      // TODO: Write an error message.
    }

    // Populate an array with a list of the desired columns
    if (columnIndicator.dtype === dt.STRING) {
      const j = oprnd.value.columnMap[columnIndicator.value]
      if (isNaN(j)) {
        return errorOprnd("BAD_COLUMN_NAME", columnIndicator.value)
      }
      columnList.push(j)
    } else if (columnIndicator.dtype === dt.RATIONAL) {
      if (Rnl.isZero(columnIndicator.value)) {
        // Get all the columns.
        columnList = columnListFromRange(0, oprnd.value.data.length - 1)
      } else {
        const j = Rnl.toNumber(columnIndicator.value) - 1
        columnList = columnListFromRange(j, j)
      }
    } else if (columnIndicator.dtype === dt.RANGE) {
      const jStart = Rnl.toNumber(columnIndicator.value[0]) - 1
      const jEnd = Rnl.toNumber(columnIndicator.value[2]) - 1
      columnList = columnListFromRange(jStart, jEnd)
    } else if (Matrix.isVector(columnIndicator)) {
      columnList = columnIndicator.value.map(e => {
        return Rnl.isRational(e) ? Rnl.toNumber(e - 1) : oprnd.value.columnMap[e]
      })
    } else {
      // TODO: Write an error message
    }
  }

  if (Matrix.isVector(rowIndicator) && columnList.length === 1) {
    // Return a vector of values
    // TODO: This vector section is wrong and must be fixed.
    const j = columnList[0]
    let dtype = oprnd.value.dtype[j]
    dtype += (rowIndicator.dtype & dt.COLUMNVECTOR) ? dt.COLUMNVECTOR : dt.ROWVECTOR
    unit.expos = (dtype & dt.RATIONAL) ? allZeros : null
    let value = rowIndicator.value.map(e => {
      return valueFromDatum(oprnd.value.data[j][oprnd.value.rowMap[e]])
    })
    if (unitAware && (dtype & dt.QUANTITY)) {
      const unitName = oprnd.value.units[j] ? oprnd.value.units[j] : undefined
      const unitObj = unitFromUnitName(unitName, vars)
      unit.expos = unitObj.expos
      value = value.map(e => Rnl.multiply(Rnl.add(e, unitObj.gauge), unitObj.factor))
    }
    return { value, unit, dtype }

  } else if (iStart === iEnd && columnList.length === 1) {
    // Return one value.
    let dtype = oprnd.value.dtype[columnList[0]]
    if (dtype & dt.QUANTITY) { dtype -= dt.QUANTITY }
    const j = columnList[0]
    let value = valueFromDatum(oprnd.value.data[j][iStart])
    unit.expos = (dtype & dt.RATIONAL) ? allZeros : null
    if (unitAware && oprnd.value.units[j]) {
      const unitName = oprnd.value.units[j] ? oprnd.value.units[j] : undefined
      const unitObj = unitFromUnitName(unitName, vars)
      value = Rnl.multiply(Rnl.add(value, unitObj.gauge), unitObj.factor)
      unit.expos = unitObj.expos
    }
    return { value, unit, dtype }

  } else if (iStart === iEnd) {
    // Get data from one row. Return it in a dictionary.
    const value = new Map()
    unitMap = Object.create(null)
    for (let j = 0; j < columnList.length; j++) {
      const localValue = valueFromDatum(oprnd.value.data[columnList[j]][iStart])
      const unitName = oprnd.value.units[columnList[j]]
        ? oprnd.value.units[columnList[j]]
        : undefined
      if (unitName) {
        const unitData = unitFromUnitName(unitName, vars)
        if (unitData.dtype & unitData.dtype === dt.ERROR) { return unitData }
        if (unitData && !unitMap[unitName]) { unitMap[unitName] = unitData }
      }
      value.set(oprnd.value.columns[columnList[j]], {
        value: localValue,
        unit: { name: unitName },
        dtype: oprnd.value.dtype[columnList[j]]
      })
    }
    return { value, unit: unitMap, dtype: dt.DICT }

  } else if (columnList.length === 1) {
    // Return data from one column, in a column vector or a quantity
    const j = columnList[0]
    const unitName = oprnd.value.units[j] ? oprnd.value.units[j] : null
    unit = (oprnd.unit.map) ? oprnd.unit.map[unitName] : { expos: null }
    const value = oprnd.value.data[j].slice(iStart, iEnd + 1).map(e => valueFromDatum(e))
    const dtype = oprnd.value.dtype[j] + dt.COLUMNVECTOR
    const newOprnd = { value, name: oprnd.value.columns[j], unit, dtype }
    if (unitAware && unit.gauge) {
      const newVal = Matrix.convertToBaseUnits(newOprnd, unit.gauge, unit.factor)
      return {
        value: newVal,
        name: oprnd.value.columns[j],
        unit: { expos: unit.expos },
        dtype: dt.RATIONAL + dt.COLUMNVECTOR
      }
    } else {
      return newOprnd
    }

  } else {
    // Return a data frame.
    const columns = []
    const units = []
    const dtype = []
    const data = []
    const columnMap = Object.create(null)
    const unitMap = Object.create(null)
    for (let j = 0; j < columnList.length; j++) {
      columns.push(oprnd.columns[columnList[j]])
      units.push(oprnd.units[columnList[j]])
      dtype.push(oprnd.dtype[columnList[j]])
      data.push(oprnd.data[columnList[j]].slice(iStart, iEnd + 1))
      columnMap[oprnd.columns[j]] = j
    }
    return clone({
      value: {
        data: data,
        columns: columns,
        columnMap: columnMap,
        rowMap: false,
        units: units,
        dtype: dtype
      },
      unit: { map: unitMap },
      dtype: dt.DATAFRAME
    })
  }
}

const numberRegEx = new RegExp(Rnl.numberPattern + "$")
const mixedFractionRegEx = /^-?(?:[0-9]+(?: [0-9]+\/[0-9]+))$/

const dataFrameFromCSV = (str, vars) => {
  // Load a CSV string into a data frame.
  // Data frames are loaded column-wise. The subordinate data structures are:
  const data = []    // where the main data lives, not including column names or units.
  const columns = []                    // An array containing the column names
  const columnMap = Object.create(null) // map of column names to column index numbers
  const rowMap = /^(?:[Nn]ame|[Ii]ndex)\s*,/.test(str) ? Object.create(null) : false
  const units = []                     // array of unit names, one for each column
  const dtype = []                     // each column's Hurmet operand type
  const unitMap = Object.create(null)  // map from unit names to unit data

  const pos = /^ï»¿/.test(str) ? 3 : 0  // Check for a BOM
  let row = 0
  let col = 0

  // Before we start loading data, let's write a closed function, to share variable scope.
  const harvest = (datum) => {
    // Load a datum into the dataTable
    datum = datum.trim()

    if (row === 0) {
      columns.push(datum)
      columnMap[datum] = col
    } else {
      if (row === 1) { data.push([]) } // First data row.
      data[col].push(datum)
      if (rowMap && col === 0) {
        rowMap[datum] = row - 1
      }
    }

    // Determine if there is a row for unit names.
    let gotUnits = false
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
        Object.entries(rowMap).forEach(([key, value]) => {
          rowMap[key] = value - 1
        })
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
        const items = line.split(",")
        for (const item of items) { harvest(item.trim()); col++ }
        row += 1
      }
    }

  } else {
    // The string contains at least one quotation mark, so we can't rely on splits.
    // Much of this section comes from https://stackoverflow.com/a/14991797
    let datum = ""
    let inQuote = false  // true means we're inside a quoted field
    // iterate over each character, keep track of current row and column
    for (let c = pos; c < str.length; c++) {
      const cc = str[c]       // current character
      const nc = str[c + 1]   // next character

      // If the current character is a quotation mark, and we're inside a
      // quoted field, and the next character is also a quotation mark,
      // add a quotation mark to the current datum and skip the next character
      if (cc === '"' && inQuote && nc === '"') { datum += cc; ++c; continue; }

      // If it's just one quotation mark, begin/end quoted field
      if (cc === '"') { inQuote = !inQuote; continue; }

      // If it's a comma and we're not in a quoted field, harvest the datum
      if (cc === ',' && !inQuote) { harvest(datum); datum = ""; ++col; continue }

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
  return {
    value: {
      data: data,
      columns: columns,
      columnMap: columnMap,
      rowMap: rowMap,
      units: units,
      dtype: dtype
    },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
}

const dataFrameFromVectors = (vectors, vars) => {
  // Take an array of vectors and return a dataframe.
  const data = []
  const columns = []
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
    columns.push(vector.name)
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
      columns: columns,
      columnMap: columnMap,
      rowMap: rowMap,
      units: units,
      dtype: dtype
    },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
}

const append = (o1, o2, vars) => {
  // Append a vector to a dataframe.
  const numRows = o1.value.data[0].length
  if (o2.value.length !== numRows) { return errorOprnd("") }
  const oprnd = clone(o1)
  oprnd.value.columns.push(o2.name)
  oprnd.value.columnMap[o2.name] = o1.value.columns.length - 1
  const dtype = o2.dtype - dt.COLUMNVECTOR
  oprnd.value.data.push(o2.value.map(e => datumFromValue(e, dtype)))
  oprnd.value.dtype.push(dtype)
  oprnd.value.units.push(o2.unit.name || null)
  if (o2.unit.name && !oprnd.unit[o2.unit.name]) {
    const unit = unitFromUnitName(o2.unit.name, vars)
    oprnd.unit[o2.unit.name] = unit
  }
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
  const lines = str.split(/\r?\n/g)
  let tex = ""
  if (lines.length < 3) {
    tex = "\\begin{matrix}\\text{"
    for (let i = 0; i < lines.length; i++) {
      tex += lines[i].trim().replace(/ *, */g, "} & \\text{") + "} \\\\ \\text{"
    }
    tex = tex.slice(0, -10) + "\\end{matrix}"
  } else {
    tex = "\\begin{array}"
    const cells = new Array(lines.length)
    for (let i = 0; i < lines.length; i++) {
      cells[i] = lines[i].trim().split(/ *, */)
    }

    const gotNames = cells[0][1] === "name"
    tex += gotNames ? "{1|cccccccccccccccccccccccc}\\text" : "{c}\\text{"

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
      tex += lines[i].trim().replace(/ *, */g, "} & \\text{")
      tex += ((gotUnits && i === 1) || (!gotUnits && i === 0))
        ? "} \\\\ \\hline \\text{"
        : "} \\\\ \\text{"
    }

    tex = tex.slice(0, -10) + "\\end{array}"
  }
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
const formatColumnName = str => {
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

const display = (df, formatSpec = "h3", decimalFormat = "1,000,000.") => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length
  const numCols = df.data.length
  const numColsInHeading = numCols + (df.rowMap ? 0 : 1)
  let str = "\\begin{array}{"
  str += df.rowMap ? "l|" : "r|"
  for (let j = 1; j < numColsInHeading; j++) {
    str += "c "
  }
  str = str.slice(0, -1) + "}"

  // Write the column names
  if (!df.rowMap) { str += "&" }
  str += df.columns[0] === "name"
    ? "&"
    : "{" + formatColumnName(df.columns[0]) + "}&"
  for (let j = 1; j < numCols; j++) {
    str += "{" + formatColumnName(df.columns[j]) + "}&"
  }
  str = str.slice(0, -1) + " \\\\ "

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (!df.rowMap) { str += "&" }
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

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (!df.rowMap) { str += String(i + 1) + " & " }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i]
      str += mixedFractionRegEx.test(datum)
        ? format(Rnl.fromString(datum), formatSpec, decimalFormat) + "&"
        : numberRegEx.test(datum)
        ? datum.replace("%", "\\%") + "&"
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

const displayAlt = (df, formatSpec = "h3", decimalFormat = "1,000,000.") => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length
  const numCols = df.data.length
  let str = "`"

  // Write the column names
  if (!df.rowMap) { str += "," }
  str += ( df.columns[0] === "name" ? "" : df.columns[0]) + ","
  for (let j = 1; j < numCols; j++) {
    str += df.columns[j] + ","
  }
  str = str.slice(0, -1) + "\n"

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (!df.rowMap) { str += "," }
    for (let j = 0; j < numCols; j++) {
      str += df.units[j] + ","
    }
    str = str.slice(0, -1) + "\n"
  }

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (!df.rowMap) { str += String(i + 1) + "," }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i]
      if (mixedFractionRegEx.test(datum)) {
        str += format(Rnl.fromString(datum), formatSpec, "100000.") + ","
      } else {
        str += datum + ","
      }
    }
    str = str.slice(0, -1) + "\n"
  }

  str = str.slice(0, -1).trim()
  str += "`"
  return str
}

export const DataFrame = Object.freeze({
  append,
  dataFrameFromCSV,
  dataFrameFromVectors,
  display,
  displayAlt,
  quickDisplay,
  range
})
