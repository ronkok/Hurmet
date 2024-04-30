import { dt, allZeros } from "./constants" // operand type enumeration
import { Rnl } from "./rational"
import { clone, addTextEscapes, unitTeXFromString, tablessTrim,
         isValidIdentifier, interpolateRegEx, arrayOfRegExMatches } from "./utils"
import { fromAssignment } from "./operand.js"
import { unitFromUnitName } from "./units"
import { errorOprnd } from "./error"
import { Matrix, isMatrix } from "./matrix"
import { Cpx } from "./complex"
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

const datumFromValue = (value, dtype, formatSpec) => {
  return value === true
    ? "true"
    : value === false
    ? "false"
    : value = undefined
    ? ""
    : (dtype === dt.RATIONAL)
    ? format(value, formatSpec, "1000000.")
    : value
}

export const identifyRange = (df, args) => {
  // A helper function for range(). Also used by map.range()

  let iStart
  let iEnd
  let rowList = [];
  let columnList = [];

  // Find what must be returned. I.e. populate rowList and columnList
  if (df.value.data[0].length === 1) {
    // The source is a single-row data frame. Each argument calls a column.
    iStart = 0
    iEnd = 0
    if (df.dtype === dt.DATAFRAME) { df.value.usedRows.add(0) }
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
    // Return a column vector
    iStart = 0
    iEnd = df.value.data[0].length - 1
    columnList.push(Rnl.toNumber(args[0].value) - 1)
  } else if (args.length === 1 && args[0].dtype === dt.RANGE) {
    iStart = Rnl.toNumber(args[0].value[0]) - 1
    iEnd = Rnl.toNumber(args[0].value[1]) - 1
    if (df.dtype === dt.DATAFRAME) {
      for (let i = iStart; i <= iEnd; i++) { df.value.usedRows.add(i) }
    }
    columnList = columnListFromRange(0, df.value.data.length - 1)
  } else if (args.length === 1 && args[0].dtype === dt.STRING) {
    // Only one indicator has been given.
    // Check both the rowMap and the columnMap.
    if (df.value.rowMap && args[0].value in df.value.rowMap) {
      // Return a row
      iStart = df.value.rowMap[args[0].value]
      iEnd = iStart
      if (df.dtype === dt.DATAFRAME) { df.value.usedRows.add(iStart) }
      columnList = columnListFromRange(0, df.value.data.length - 1)
    } else if (df.value.columnMap && args[0].value in df.value.columnMap) {
      // Return a column vector
      iStart = 0
      iEnd = df.value.data[0].length - 1
      columnList.push(df.value.columnMap[args[0].value])
    } else {
      return [errorOprnd("BAD_ROW_NAME", args[0].value), null, null, null]
    }
  } else if (args.length === 1 && args[0].dtype === dt.STRING + dt.COLUMNVECTOR) {
    // A vector of row names
    for (const rowName of args[0].value) {
      rowList.push(rowName)
      if (df.dtype === dt.DATAFRAME) { df.value.usedRows.add(df.value.rowMap[rowName]) }
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
    if (df.dtype === dt.DATAFRAME) { df.value.usedRows.add(iStart) }
    columnList.push(df.value.columnMap[args[0].value])
  } else {
    // Default for args is a list of (row|column) names
    iStart = 0
    iEnd = args.length
    if (df.value.rowMap && df.value.rowMap[args[iEnd - 1].value]) {
      // A row list
      rowList = args.map(arg => arg.value)
      columnList = columnListFromRange(0, df.value.data.length - 1) // All the columns.
    } else {
      // A column list
      columnList = args.map(arg => df.value.columnMap[arg.value])
    }
  }
  return [rowList, columnList, iStart, iEnd]
}

const range = (df, args, unitAware) => {
  let unit = Object.create(null)
  const [rowList, columnList, iStart, iEnd] = identifyRange(df, args)
  if (rowList.dtype && rowList.dtype === dt.ERROR) { return rowList }
  if (rowList.length === 0 && iStart === iEnd && columnList.length === 1) {
    // Return one value.
    let dtype = df.value.dtype[columnList[0]]
    if (dtype & dt.QUANTITY) { dtype -= dt.QUANTITY }
    const j = columnList[0]
    let value = valueFromDatum(df.value.data[j][iStart])
    unit.expos = (dtype & dt.RATIONAL) ? allZeros : null
    if (unitAware && df.value.units[j]) {
      const unitName = df.value.units[j] ? df.value.units[j] : undefined
      const unitObj = unitFromUnitName(unitName)
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
    const headings = [];
    const units = [];
    const dtype = [];
    const data = [];
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
        data,
        headings,
        columnMap,
        rowMap,
        units,
        usedRows: new Set(),
        dtype
      },
      unit: clone(unitMap),
      dtype: dt.DATAFRAME
    }
  }
}

// const numberRegEx = new RegExp(Rnl.numberPattern + "$")
const numberRegEx = new RegExp("^(?:=|" + Rnl.numberPattern.slice(1) + "$)")
const mixedFractionRegEx = /^-?(?:[0-9]+(?: [0-9]+\/[0-9]+))$/
const escRegEx = /^\\#/

const hasUnitRow = lines => {
  // Determine if there is a row for unit names.
  if (lines.length < 3) { return false }
  const units = lines[1].split("\t").map(el => el.trim())
  for (const unitName of units) {
    if (numberRegEx.test(unitName)) { return false }
  }
  const firstDataLine = lines[2].split("\t").map(el => el.trim())
  for (const datum of firstDataLine) {
    if (numberRegEx.test(datum)) { return true }
  }
  return false
}

const dataFrameFromTSV = (str, vars) => {
  // Load a TSV string into a data frame.
  // Data frames are loaded column-wise. The subordinate data structures are:
  let data = [];   // where the main data lives, not including column names or units.
  const headings = [];                  // An array containing the column names
  const columnMap = Object.create(null) // map of column names to column index numbers
  let rowMap =  false                   // ditto for rows.
  const units = [];                     // array of unit names, one for each column
  const dtype = [];                     // each column's Hurmet operand type
  const unitMap = Object.create(null)   // map from unit names to unit data
  const usedRows = new Set()

  if (str.charAt(0) === "`") { str = str.slice(1) }

  if (vars) {
    // Substitute values in for string interpolation, ${…}
    const matches = arrayOfRegExMatches(interpolateRegEx, str)
    for (let i = matches.length - 1; i >= 0; i--) {
      const mch = matches[i];
      const varName = mch.value.slice(2, -1)
      let value = ""
      if (varName === "undefined") {
        value = ""
      } else if (varName === "j" && !vars.j) {
        value = "j"
      } else {
        const cellAttrs = vars[varName];
        if (!cellAttrs) { return errorOprnd("V_NAME", varName) }
        const oprnd = fromAssignment(cellAttrs, false)
        if (oprnd.dtype === dt.ERROR) { return oprnd }
        value = Rnl.isRational(oprnd.value) ? String(Rnl.toNumber(oprnd.value)) : oprnd.value
      }
      str = str.slice(0, mch.index) + value + str.slice(mch.index + mch.length)
    }
  }

  // It's tab-separated values, so we can use splits to load in the data.
  const lines = str.split(/\r?\n/g)
  const gotUnits = hasUnitRow(lines)

  // Read in the column headings.
  const cols = lines[0].split('\t')
  if (cols[0].length > 0 && cols[0].charAt(0) === "#") {
    // Create a rowMap. The first datum in each row is a key to the row.
    rowMap = Object.create(null)
    cols[0] = cols[0].slice(1)
  } else if (escRegEx.test(cols[0])) {
    cols[0] = cols[0].slice(1)
  }
  cols.forEach((datum, col) => {
    datum = datum.trim()
    headings.push(datum)
    columnMap[datum] = col
    data.push([])
  })

  // Units
  if (gotUnits) {
    const unitNames = lines[1].split('\t')
    unitNames.forEach(unitName => {
      unitName = unitName.trim()
      units.push(unitName)
      if (unitName.length > 0 && !unitMap[unitName]) {
        const unit = unitFromUnitName(unitName)
        if (unit) {
          unitMap[unitName] = unit
        } else {
          return errorOprnd("DF_UNIT", unitName)
        }
      }
    })
  }

  // Data
  let row = -1
  for (let i = (gotUnits ? 2 : 1); i < lines.length; i++) {
    const line = lines[i];
    row += 1
    line.split('\t').forEach((datum, col) => {
      datum = datum.trim()
      if (datum === "sumAbove()") {
        let sum = Rnl.zero
        for (const num of data[col]) {
          if (!isNaN(num)) {
            sum = Rnl.add(sum, Rnl.fromString(num))
          }
        }
        datum = String(Rnl.toNumber(sum))
      }
      data[col].push(datum)
      if (rowMap && col === 0) {
        rowMap[datum] = row
      }
    })
  }

  // Data is loaded in. Determinine the operand type of each column
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
  let iStart = 0
  if (Object.keys(unitMap).length === 0) {
    isMap = true
    iStart = (rowMap) ? 1 : 0
    for (let i = iStart + 1; i < dtype.length; i++) {
      if (dtype[i] !== dtype[iStart]) { isMap = false; break }
    }
  }

  if (isMap) {
    if (dtype[iStart] === dt.RATIONAL) {
      data = data.map((col, i) => dtype[i] === dt.RATIONAL
        ? col.map(el => Rnl.fromString(el))
        : col
      )
    }
    return {
      value: { data, headings, columnMap, rowMap, usedRows },
      unit: (dtype[0] === dt.RATIONAL ? { expos: allZeros } : null),
      dtype: dt.MAP + dtype[iStart]
    }
  } else {
    return {
      value: { data, headings, columnMap, rowMap, units, usedRows, dtype },
      unit: unitMap,
      dtype: dt.DATAFRAME
    }
  }
}

const dataFrameFromVectors = (vectors, formatSpec) => {
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
    if (vectorType === dt.ERROR) { return errorOprnd("NOT_VECTOR", "dataframe") }
    headings.push(vector.name)
    columnMap[vector.name] = j
    const colDtype = vector.dtype - vectorType
    data.push(vector.value.map(e => datumFromValue(e, colDtype, formatSpec)))
    dtype.push(colDtype)
    if (vector.unit.name) {
      units.push(vector.unit.name)
      if (!unitMap[vector.unit.name]) {
        const unit = unitFromUnitName(vector.unit.name)
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
      usedRows: new Set(),
      dtype: dtype
    },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
}

const matrix2table = (matrix, headings, rowHeadings) => {
  // Use the contents of a matrix to create a dataframe.
  if (rowHeadings.length > 0) { headings = [""].concat(headings) }
  const columnMap = Object.create(null)
  for (let i = 0; i < headings.length; i++) {
    columnMap[headings[i]] = i
  }
  let rowMap = false
  if (rowHeadings.length > 0) {
    rowMap = Object.create(null)
    for (let i = 0; i < rowHeadings.length; i++) {
      rowMap[rowHeadings[i]] = i
    }
  }
  const data = new Array(headings.length)
  let delta = 0
  if (rowHeadings.length > 0) {
    data[0] = rowHeadings
    delta = 1
  }
  for (let j = 0; j < matrix.value[0].length; j++) {
    const k = j + delta
    data[k] = [];
    for (let i = 0; i < matrix.value.length; i++) {
      data[k].push(matrix.value[i][j])
    }
  }
  return {
    value: { data, headings, columnMap, rowMap },
    unit: matrix.unit,
    dtype: matrix.dtype - dt.MATRIX + dt.MAP
  }
}

const append = (o1, o2, formatSpec, unitAware) => {
  // Append a vector or single value to a dataframe.
  // We use copy-on-write for dataframes, so copy it here.
  const oprnd = o1.dtype === dt.DATAFRAME ? clone(o1) : clone(o2)
  const addend = o1.dtype === dt.DATAFRAME ? o2 : o1
  if (o1.dtype === dt.DATAFRAME) {
    oprnd.value.columnMap[addend.name] = oprnd.value.headings.length
    oprnd.value.headings.push(addend.name)
  } else {
    for (const [key, value] of Object.entries(oprnd.value.columnMap)) {
      oprnd.value.columnMap[key] = value + 1
    }
    oprnd.value.columnMap[addend.name] = 0
    oprnd.value.headings.unshift(addend.name)
  }
  let unit
  if (addend.unit && addend.unit.name && addend.unit.name.length > 0) {
    if (o1.dtype === dt.DATAFRAME) {
      oprnd.value.units.push(addend.unit.name)
    } else {
      oprnd.value.units.unshift(addend.unit.name)
    }
    unit = unitFromUnitName(addend.unit.name)
    if (!oprnd.unit[addend.unit.name]) {
      oprnd.unit[addend.unit.name] = unit
    }
  }
  const dtype = addend.dype === dt.RATIONAL && unit
    ? dt.RATIONAL + dt.QUANTITY
    : !isMatrix(addend)
    ? addend.dtype
    : (addend.dtype & dt.COLUMNVECTOR)
    ? addend.dtype - dt.COLUMNVECTOR
    : addend.dtype - dt.ROWVECTOR
  const numRows = oprnd.value.data[0].length
  if (numRows === 1 && !isMatrix(addend)) {
    const v = unitAware && dtype === dt.RATIONAL && unit
      ? Rnl.subtract(Rnl.divide(addend.value, unit.factor), unit.gauge)
      : addend.value
    if (o1.dtype === dt.DATAFRAME) {
      oprnd.value.data.push([datumFromValue(v, dtype, formatSpec)])
    } else {
      oprnd.value.data.unshift([datumFromValue(v, dtype, formatSpec)])
    }
  } else {
    if (unitAware && dtype === dt.RATIONAL && unit) {
      const v = Matrix.convertFromBaseUnits(addend, unit.gauge, unit.factor)
      if (o1.dtype === dt.DATAFRAME) {
        oprnd.value.data.push(v.map(e => datumFromValue(e, dtype, formatSpec)))
      } else {
        oprnd.value.data.unshift(v.map(e => datumFromValue(e, dtype, formatSpec)))
      }
    } else {
      if (o1.dtype === dt.DATAFRAME) {
        oprnd.value.data.push(addend.value.map(
          e => datumFromValue(e, dtype, formatSpec)
        ))
      } else {
        oprnd.value.data.unshift(addend.value.map(
          e => datumFromValue(e, dtype, formatSpec)
        ))
      }
    }
  }
  if (o1.dtype === dt.DATAFRAME) {
    oprnd.value.dtype.push(dtype)
  } else {
    oprnd.value.dtype.unshift(dtype)
  }
  return oprnd
}

const quickDisplay = str => {
  // This is called from the lexer for a display that changes with every keystroke.
  if (str === "") { return "" }
  str = str.trim()
  let arrayFormat = ""
  if (str.charAt(0) === "#") {
    str = str.slice(1).trim()
    arrayFormat = "l|cccccccccccccccccccccccc"
  } else {
    arrayFormat = "c"
  }
  str = addTextEscapes(str)
  const sepRegEx = / *\t */g
  const lines = str.split(/\r?\n/g)
  let tex = ""
  if (lines.length < 3) {
    tex = "\\begin{matrix}\\text{"
    for (let i = 0; i < lines.length; i++) {
      tex += tablessTrim(lines[i]).replace(sepRegEx, "} & \\text{") + "} \\\\ \\text{"
    }
    tex = tex.slice(0, -10) + "\\end{matrix}"
  } else {
    tex = `\\begin{array}{${arrayFormat}}\\text{`
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
      // line[1] had no numbers. If any numbers are in line[2] then line[1] is units.
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
  if (!row) { return false }
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== "" && row[i] !== null) { return true }
  }
  return false
}

const getNumInfo =  df => {
  // Gather info for in setting numbers on a decimal tab.
  const data = df.data.plain ? df.data.plain : df.data
  const numCols = data.length
  const colInfo = new Array(numCols)
  const cellInfo = new Array(numCols)
  const DFisRational = !df.dtype && Rnl.isRational(data[0][0])
  for (let j = 0; j < numCols; j++) {
    if (DFisRational || (df.dtype && df.dtype[j] & dt.RATIONAL)) {
      colInfo[j] = { hasAlignChar: false, maxLenAfterAlignChar: 0 }
      cellInfo[j] = []
      for (let i = 0; i < data[0].length; i++) {
        const datum = data[j][i]
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

const totalRegEx = /^(?:total|sum)/i

const display = (df, formatSpec = "h3", decimalFormat = "1,000,000.", omitHeading = false) => {
  const data = df.data.plain ? df.data.plain : df.data
  if (data.length === 0) { return "" }
  const numRows = data[0].length
  const numCols = data.length
  const writeRowNums = numRows > 5 && !df.rowMap
  const isMap = !df.dtype
  let str = "\\renewcommand{\\arraycolsep}{8pt}\\renewcommand{\\arraystretch}{1.15}"
  str += "\\begin{array}{"
  str += df.rowMap
    ? "l|"
    : writeRowNums
    ? "r|"
    : ""
  for (let j = 1; j < numCols; j++) {
    str += isMap
      ? "c "
      : numRows === 1
      ? "c "
      : Rnl.isRational(data[j][0])
      ? "r "
      : "l "
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
    if (i === numRows - 1 && totalRegEx.test(data[0][i])) { str += "\\hline " }
    if (writeRowNums) { str += String(i + 1) + " & " }
    for (let j = 0; j < numCols; j++) {
      const datum = data[j][i]
      if (isMap) {
        str += datum === undefined
        ? " & "
        : Rnl.isRational(datum)
        ? format(datum, formatSpec, decimalFormat) + "&"
        : Cpx.isComplex(datum)
        ? Cpx.display(datum, formatSpec, decimalFormat)[0] + "&"
        : "\\text{" + addTextEscapes(datum) + "} &"
      } else {
        str += mixedFractionRegEx.test(datum)
          ? format(Rnl.fromString(datum), formatSpec, decimalFormat) + "&"
          : numberRegEx.test(datum)
          ? displayNum(datum, colInfo[j], cellInfo[j][i], decimalFormat) + "&"
          : datum === ""
          ? "&"
          : "\\text{" + addTextEscapes(datum) + "}&"
      }
    }
    str = str.slice(0, -1) + " \\\\ "
  }

  str = str.slice(0, -3).trim()
  str += "\\end{array}"
  return str
}

const displayAlt = (df, formatSpec = "h3", decimalFormat = "1,000,000.",
                   omitHeading = false) => {
  const data = df.data.plain ? df.data.plain : df.data
  if (data.length === 0) { return "" }
  const numRows = data[0].length
  const numCols = data.length
  const writeRowNums = numRows > 5 && !df.rowMap
  let str = "``"

  if (!omitHeading) {
    // Write the column names
    if (writeRowNums) { str += "\t" }
    str += ( (df.headings[0] === "name" || df.headings[0] === "item")
      ? ""
      : df.headings[0]) + "\t"
    for (let j = 1; j < numCols; j++) {
      str += df.headings[j] + "\t"
    }
    str = str.slice(0, -1) + "\n"
  }

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (writeRowNums) { str += "\t" }
    for (let j = 0; j < numCols; j++) {
      str += df.units[j] + "\t"
    }
    str = str.slice(0, -1) + "\n"
  }

  // Write the data
  const isMap = !df.dtype
  for (let i = 0; i < numRows; i++) {
    if (writeRowNums) { str += String(i + 1) + "\t" }
    for (let j = 0; j < numCols; j++) {
      const datum = data[j][i];
      if (isMap) {
        str += datum === undefined
          ? "\t"
          : Rnl.isRational(datum)
          ? format(datum, formatSpec, decimalFormat).replace(/{,}/g, ",") + "\t"
          : Cpx.isComplex(datum)
          ? Cpx.display(datum, formatSpec, decimalFormat)[1].replace(/{,}/g, ",") + "\t"
          : datum + "\t"
      } else {
        if (mixedFractionRegEx.test(datum)) {
          str += format(Rnl.fromString(datum), formatSpec, "100000.") + "\t"
        } else {
          str += datum + "\t"
        }
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
  dataFrameFromTSV,
  dataFrameFromVectors,
  matrix2table,
  display,
  displayAlt,
  quickDisplay,
  range
})
