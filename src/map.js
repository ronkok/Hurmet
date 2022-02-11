import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import { mapMap, clone, addTextEscapes, unitTeXFromString } from "./utils"
import { format } from "./format"
import { errorOprnd } from "./error"

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

const display = (result, formatSpec, decimalFormat) => {
  const mapValue = result.value.plain ? result.value.plain : result.value
  let str = "\\{"
  for (const [key, value] of mapValue.entries()) {
    str += "\\text{" + addTextEscapes(key) + "}: "
    str += format(value, formatSpec, decimalFormat) + ",\\:"
  }
  str = str.slice(0, -3) + "\\}"
  if (result.unit.name) {
    str += "\\," + unitTeXFromString(result.unit.name)
  }
  return str
}

const displayAlt = (result, formatSpec, decimalFormat) => {
  const mapValue = result.value.plain ? result.value.plain : result.value
  let str = "{"
  for (const [key, value] of mapValue.entries()) {
    str += '"' + key + '": '
    str += format(value, formatSpec, decimalFormat) + ", "
  }
  str = str.slice(0, -2) + "}"
  if (result.unit.name) {
    str = `'${str} ${result.unit.name}'`
  }
  return str
}

const valueFromMap = (map, keys, unitAware) => {
  // Return the value of a map's key/value pair.
  // `keys` is an array. It contains > 1 key if the author wants multiple assignment
  // as in A, B = map[a, b]
  const isNumeric = (map.dtype & dt.RATIONAL)
  const treatAsUnitAware = (unitAware && (map.dtype & dt.QUANTITY) > 0)
  if (keys.length === 1) {
    const key = keys[0]
    if (!map.value.has(key)) { return errorOprnd("BAD_KEY", key) }
    const value = clone(map.value.get(key))
    if (!isNumeric) {
      return { value, unit: undefined, dtype: map.dtype - dt.MAP }

    } else if (treatAsUnitAware) {
      const dtype = map.dtype - dt.MAP - dt.QUANTITY
      return { value, unit: { expos: map.unit.expos }, dtype: dtype }

    } else {
      return { value, unit: allZeros, dtype: map.dtype - dt.MAP - (map.dtype & dt.QUANTITY) }
    }

  } else {
    const value = new Map()
    for (let i = 0; i < keys.length; i++) {
      value.set(keys[i], clone(map.value.get(keys[i])))
    }
    return { value, unit: clone(map.unit), dtype: map.dtype }
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
