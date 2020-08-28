import { dt, allZeros } from "./constants" // operand type enumeration
import { Rnl } from "./rational"
import { clone } from "./utils"
import { unitFromUnitName } from "./units"
import { addTextEscapes } from "./lexer"
import { errorOprnd } from "./error"
import { parse } from "./parser"
import { Matrix } from "./matrix"

const columnListFromRange = (start, end) => {
  const columnList = []
  for (let i = start; i <= end; i++) {
    columnList.push(i)
  }
  return columnList
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
    let value = rowIndicator.value.map(e => oprnd.value.data[j][oprnd.value.rowMap[e]])
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
    let value = oprnd.value.data[j][iStart]
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
      const localValue = oprnd.value.data[columnList[j]][iStart]
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
    unit = oprnd.unit.map[unitName]
    const value = oprnd.value.data[j].slice(iStart, iEnd + 1)
    const dtype = oprnd.value.dtype[j] + dt.COLUMNVECTOR
    const newOprnd = { value, unit, dtype }
    if (unitAware) {
      const newVal = Matrix.convertToBaseUnits(newOprnd, unit.gauge, unit.factor)
      return {
        value: newVal,
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
    } else if (row === 1) {
      // This is the unit row
      units.push(datum)
      if (col === 0 && /^[Uu]nit$/.test(datum)) { return }
      if (datum.length > 0) {
        if (!unitMap[datum]) {
          const unit = unitFromUnitName(datum, vars)
          if (unit) {
            unitMap[datum] = unit
          } else {
            return errorOprnd("DF_UNIT", datum)
          }
        }
      }
    } else {
      if (row === 2) { data.push([]) } // First data row.
      const value = (datum === "true")
        ? true
        : datum === "false"
        ? false
        : numberRegEx.test(datum)
        ? Rnl.fromString(datum)
        : datum === ""
        ? undefined
        : datum
      data[col].push(value)
      if (rowMap && col === 0) {
        rowMap[datum] = row - 2
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
      if (datum === undefined) { continue }
      dtype.push(
        Rnl.isRational(datum)
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

const append = (o1, o2, vars) => {
  const numRows = o1.value.data[0].length
  if (o2.value.length !== numRows) { return errorOprnd("") }
  const oprnd = clone(o1)
  oprnd.value.columns.push(o2.name)
  oprnd.value.columnMap[o2.name] = o1.value.columns.length - 1
  oprnd.value.data.push(o2.value)
  oprnd.value.dtype.push(o2.dtype - dt.COLUMNVECTOR)
  oprnd.value.units.push(o2.unit.name || null)
  if (o2.unit.name && !oprnd.unit.map[o2.unit.name]) {
    const unit = unitFromUnitName(o2.unit.name, vars)
    oprnd.unit.map[o2.unit.name] = unit
  }
  return oprnd
}

const display = df => {
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
  for (let j = 0; j < numCols; j++) {
    str += parse(df.columns[j]) + "&"
  }
  str = str.slice(0, -1) + " \\\\ "

  // Write the unit names
  if ( df.units.length > 0) {
    if (!df.rowMap) { str += "&" }
    for (let j = 0; j < numCols; j++) {
      let rowTex = ""
      if (df.units[j].length > 0) {
        const unitTex = parse("'" + df.units[j] + "'")
        rowTex = unitTex.replace("\\;\\, ", "")
      }
      str += rowTex + "&"
    }
    str = str.slice(0, -1) + " \\\\ "
  }
  str += "\\hline"

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (!df.rowMap) { str += String(i + 1) + " &" }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i]
      str += datum === undefined
        ? "&"
        : (df.dtype[j] & dt.RATIONAL)
        ? Rnl.toString(datum, Math.floor(Math.log10(Number(datum[1]))))
            .replace(",", "{,}") + " &"
        : (df.dtype[j] & dt.STRING)
        ? "\\text{" + addTextEscapes(datum) + "}&"
        : (df.dtype[j] & dt.BOOLEAN)
        ? "\\text{" + datum + "}&"
        : datum + " &"
    }
    str = str.slice(0, -1) + " \\\\ "
  }

  str = str.slice(0, -3).trim()
  str += "\\end{array}"
  return str
}

const displayAlt = df => {
  const numRows = df.data[0].length
  const numCols = df.data.length
  let str = "`"

  // Write the column names
  if (!df.rowMap) { str += "," }
  for (let j = 0; j < numCols; j++) {
    str += df.columns[j] + ","
  }
  str = str.slice(0, -1) + "\n"

  // Write the unit names
  if ( df.units.length > 0) {
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
      str += (df.dtype[j] & dt.RATIONAL)
        ? Rnl.toString(datum, Math.floor(Math.log10(Number(datum[1]))))
            .replace(",", "{,}") + ","
        : datum + ","
    }
    str = str.slice(0, -1) + "\n"
  }

  str = str.slice(0, 2).trim()
  str += "`"
  return str
}

export const DataFrame = Object.freeze({
  append,
  dataFrameFromCSV,
  display,
  displayAlt,
  range
})
