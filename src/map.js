import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import { mapMap, clone, unitTeXFromString } from "./utils"
import { format } from "./format"
import { errorOprnd } from "./error"
import { formatColumnName } from "./dataframe"

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

const convertFromBaseUnits = (map, gauge, factor) => {
  map = mapMap( map, value =>  Rnl.divide(value, factor))
  if (!Rnl.isZero(gauge)) {
    map = mapMap( map, value => Rnl.subtract(value, gauge))
  }
  return  map
}

const convertToBaseUnits = (map, gauge, factor) => {
  if (!Rnl.isZero(gauge)) {
    map = mapMap(map, value => Rnl.add(value, gauge))
  }
  return mapMap(map, value => Rnl.multiply(value, factor))
}

const display = (result, formatSpec, decimalFormat, omitHeading = false) => {
  const mapValue = result.value.plain ? result.value.plain : result.value
  let topRow = ""
  let botRow = ""
  for (const [key, value] of mapValue.entries()) {
    topRow += formatColumnName(key) + " & "
    botRow += format(value, formatSpec, decimalFormat) + " & "
  }
  topRow = topRow.slice(0, -3)
  botRow = botRow.slice(0, -3)
  let str = "\\begin{array}{c}"
  if (!omitHeading) { str += topRow + " \\\\ \\hline " }
  str += botRow + "\\end{array}"
  if (result.unit && result.unit.name) {
    str += "\\;" + unitTeXFromString(result.unit.name)
  }
  return str
}

const displayAlt = (result, formatSpec, decimalFormat, omitHeading = false) => {
  const mapValue = result.value.plain ? result.value.plain : result.value
  let topRow = ""
  let botRow = ""
  for (const [key, value] of mapValue.entries()) {
    topRow += key + ' | '
    botRow += format(value, formatSpec, decimalFormat) + " | "
  }
  topRow = topRow.slice(0, -3)
  botRow = botRow.slice(0, -3)
  let str = "``"
  if (!omitHeading) { str += topRow + "\n" }
  str += botRow + "``"
  if (result.unit && result.unit.name) {
    str = `${str} '${result.unit.name}'`
  }
  return str
}

const singleValueFromMap = (map, key, isNumeric, unitAware) => {
  if (!map.value.has(key)) { return errorOprnd("BAD_KEY", key) }
  const value = clone(map.value.get(key))
  if (!isNumeric) {
    return { value, unit: map.unit, dtype: map.dtype - dt.MAP }
  } else if (unitAware) {
    return { value, unit: { expos: map.unit.expos }, dtype: map.dtype - dt.MAP }
  } else {
    return { value, unit: allZeros, dtype: map.dtype - dt.MAP }
  }
}

const valueFromMap = (map, keys, unitAware) => {
  // Return the value of a map's key/value pair.
  // `keys` is an array.
  for (let j = 0; j < keys.length; j++) {
    if (keys[j].dtype === dt.RATIONAL) { return errorOprnd("NUM_KEY") }
    keys[j] = keys[j].value
  }
  if (keys.length === 1) {
    const isNumeric = (map.dtype & dt.RATIONAL)
    const treatAsUnitAware = keys.length > 1 || unitAware
    return singleValueFromMap(map, keys[0], isNumeric, treatAsUnitAware)
  } else {
    const value = new Map()
    for (let i = 0; i < keys.length; i++) {
      value.set(keys[i], map.value.get(keys[i]))
    }
    return { value, unit: map.unit, dtype: map.dtype }
  }
}

export const map = Object.freeze({
  append,
  convertFromBaseUnits,
  convertToBaseUnits,
  display,
  displayAlt,
  valueFromMap
})
