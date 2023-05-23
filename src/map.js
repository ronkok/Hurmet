import { dt } from "./constants"
import { Rnl } from "./rational"
import { clone } from "./utils"
import { errorOprnd } from "./error"
import { identifyRange } from "./dataframe"

/*
 * This file deals with Hurmet maps, which are similar to hash maps.
 * In a map, every value is of the same data type and has the same unit-of-measure.
 */

const checkUnitEquality = (u1, u2) => {
  let x
  let y
  if (u1.expos && u2.expos) {
    x = u1.expos
    y = u2.expos
  } else {
    x = u1
    y = u2
  }
  if (Array.isArray(x)) {
    if (Array.isArray(y)) {
      if (x.length !== y.length) { return false }
      x.forEach((e, i) => { if (e !== y[i]) { return false } })
      return true
    } else {
      return false
    }
  } else {
    return x === y
  }
}

const append = (o1, o2, shape1, shape2) => {
  let map
  let scalar
  if (o1.dtype & dt.MAP) {
    if (shape2 !== "scalar") { return errorOprnd("BAD_APPEND", shape2) }
    map = o1
    scalar = o2
  } else {
    if (shape1 !== "scalar") { return errorOprnd("BAD_APPEND", shape1) }
    map = o2
    scalar = o1
  }
  if (!(map.dtype & scalar.dtype)) { errorOprnd("MAP_APPEND") }
  if (!checkUnitEquality(map.unit, scalar.unit)) { errorOprnd("UNIT_APEND") }
  map.value.set(scalar.name, scalar.value)
  return map
}

const convertFromBaseUnits = (data, gauge, factor) => {
  data = data.map(column => Rnl.isRational(column[0])
    ? column.map(e => Rnl.divide(e, factor))
    : column
  )
  if (!Rnl.isZero(gauge)) {
    data = data.map(column => Rnl.isRational(column[0])
      ? column.map(e => Rnl.subtract(e, gauge))
      : column
    )
  }
  return data
}

const convertToBaseUnits = (data, gauge, factor) => {
  if (!Rnl.isZero(gauge)) {
    data = data.map(column => Rnl.isRational(column[0])
      ? column.map(e => Rnl.add(e, gauge))
      : column
    )
  }
  data = data.map(column => Rnl.isRational(column[0])
    ? column.map(e => Rnl.multiply(e, factor))
    : column
  )
  return data
}

const range = (map, keys) => {
  let unit = clone(map.unit)
  const [rowList, columnList, iStart, iEnd] = identifyRange(map, keys)
  if (rowList.length === 0 && iStart === iEnd && columnList.length === 1) {
    // Return one value.
    const value = map.value.data[columnList[0]][iStart];
    return { value, unit, dtype: map.dtype - dt.MAP }

  } else if (columnList.length === 1) {
    // Return data from one column, in a column vector or a quantity
    const value = map.value.data[columnList[0]].slice(iStart, iEnd + 1)
    const dtype = columnList[0] === 0
      ? dt.COLUMNVECTOR + (typeof value[0] === "string" ? dt.STRING : map.dtype - dt.MAP)
      : map.dtype - dt.MAP + dt.COLUMNVECTOR
    if (columnList[0] === -1) { unit = null }
    return { value, unit, dtype }

  } else {
    // Return a map.
    const headings = []
    const data = []
    const columnMap = Object.create(null)
    const rowMap = rowList.length === 0 ? false : Object.create(null)
    for (let j = 0; j < columnList.length; j++) {
      headings.push(map.value.headings[columnList[j]])
      columnMap[map.value.headings[j]] = j
      if (rowList.length > 0) {
        const elements = []
        for (let i = 0; i < rowList.length; i++) {
          const rowName = rowList[i]
          elements.push(map.value.data[columnList[j]][map.value.rowMap[rowName]])
          rowMap[rowName] = i
        }
        data.push(elements)
      } else {
        data.push(map.value.data[columnList[j]].slice(iStart, iEnd + 1))
      }
    }
    return {
      value: { data, headings, columnMap, rowMap },
      unit,
      dtype: map.dtype
    }
  }
}

export const map = Object.freeze({
  append,
  convertFromBaseUnits,
  convertToBaseUnits,
  range
})
