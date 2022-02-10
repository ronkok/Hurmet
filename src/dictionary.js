import { dt, allZeros } from "./constants"
import { isIn, addTextEscapes, unitTeXFromString } from "./utils"
import { Rnl } from "./rational"
import { unitFromUnitName } from "./units"
import { format } from "./format"
import { errorOprnd } from "./error"

const fromTokenStack = (stack, numPairs, vars) => {
  // Create a dictionary or map from a stack of tokens.
  const targetStackLength = stack.length - numPairs
  const lastType = stack[stack.length - 1].dtype

  // A Hurmet map is a dictionary whose values all have the same data type and unit.
  // Check if this set of tokens is a map.
  let isRegular = isIn(lastType, [dt.RATIONAL, dt.BOOLEAN, dt.STRING])
  if (isRegular) {
    for (let j = stack.length - numPairs; j < stack.length; j++) {
      if (stack[j].dtype !== lastType) { isRegular = false; break }
      if (lastType === dt.RATIONAL) {
        if (stack[j].unit.expos !== allZeros) { isRegular = false; break }
      } else {
        if (stack[j].unit !== null) { isRegular = false; break }
      }
    }
  }

  const localStack = []
  while (stack.length > targetStackLength) {
    localStack.push(stack.pop())
  }

  if (isRegular) {
    // We hold a map in a data structure that is simpler than a more varied dictionary.
    // We only save unit and dtype info once, at the top level.
    const map = Object.create(null)
    map.dtype = lastType + dt.MAP
    map.unit = Object.create(null)
    if (lastType === dt.RATIONAL) {
      map.unit.expos = allZeros
    } else {
      map.unit = null
    }
    map.value = new Map()
    while (localStack.length > 0) {
      const oprnd = localStack.pop()
      map.value.set(oprnd.name, oprnd.value)
    }
    return Object.freeze(map)
  } else {
    // This data structure is more complex than a map.
    // Each key:value pair has its own unit and dtype inside dictionary.value
    const dictionary = new Map()
    const unitMap = Object.create(null)
    while (localStack.length > 0) {
      const oprnd = localStack.pop()
      const key = oprnd.name
      const unitName = (oprnd.unit) ? oprnd.unit.name : null
      if (typeof unitName === "string") {
        if (!unitMap[unitName]) {
          const unit = unitFromUnitName(unitName, vars)
          if (unit.dtype & unit.dtype === dt.ERROR) { return unitName }
          if (unit) { unitMap[unitName] = unit }
        }
      }
      dictionary.set(key, { value: oprnd.value, unit: unitName, dtype: oprnd.dtype })
    }
    const dict = Object.create(null)
    dict.value = Object.freeze(dictionary)
    dict.unit = Object.freeze(unitMap)
    dict.dtype = dt.DICT
    return Object.freeze(dict)
  }
}

// A map function for Hurmet dictionaries
// Each Hurmet dictionary contains a Javascript Map of key:value pairs.
// Each of those nested values is an object containing: { value, unit: unitName, dtype }
export const dictMap = (dictionaryValue, fn) => {
  const dictVal = dictionaryValue
  const newMap = new Map()
  for (const [key, oprnd] of dictVal.entries()) {
    const value = Object.create(null)
    value.value = fn(oprnd.value)
    value.unit = oprnd.unit
    value.dtype = oprnd.dtype
    newMap.set(key, Object.freeze(value))
  }
  return newMap
}

const toValue = (dictionary, keys, unitAware) => {
  // Return the value of a dictionary's key/value pair(s).
  // Return a scalar if there is only one key, else return a didtionary.

  // Create the container.
  const properties = new Map()

  // Load in the values
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const property = dictionary.value.get(key)
    if (property === undefined) { return errorOprnd("BAD_KEY", key) }

    if (keys.length > 1) {
      properties.set(key, property)
    } else {
      // Return one value. Prep it similar to operands.js.
      if (property.unit && (property.dtype & dt.RATIONAL)) {
        const unitName = property.unit
        property.unit = Object.create(null)
        if (unitAware) {
          const unit = dictionary.unit[unitName]
          property.value = Rnl.multiply(Rnl.add(property.value, unit.gauge), unit.factor)
          property.unit.expos = unit.expos
        } else {
          property.unit.expos = allZeros
        }
        property.dtype = dt.RATIONAL
      }
      return property
    }
  }
  const output = Object.create(null)
  output.value = Object.freeze(properties)
  output.unit = dictionary.unit
  output.dtype = dt.DICT
  return Object.freeze(output)
}

const append = (o1, o2, shape1, shape2) => {
  let dict
  let scalar
  if (o1.dtype === dt.DICT) {
    if (shape2 !== "scalar") { return errorOprnd("BAD_APPEND", shape2) }
    dict = o1
    scalar = o2
  } else {
    if (shape1 !== "scalar") { return errorOprnd("BAD_APPEND", shape1) }
    dict = o2
    scalar = o1
  }
  const value = Object.create(null)
  value.value = scalar.value
  value.unit = (scalar.unit.name)
    ? scalar.unit.name
    : typeof scalar.unit === "string"
    ? scalar.unit
    : null
  value.dtype = scalar.dtype
  dict.set(scalar.name, Object.freeze(value))
  if (value.unit && !dict.unit[value.unit]) {
    dict.unit[value.unit] = unitFromUnitName(value.unit)
  }
  return dict
}

const display = (dictionary, formatSpec, decimalFormat) => {
  let str = "\\{"
  for (const [key, val] of dictionary.entries()) {
    str += "\\text{" + addTextEscapes(key) + "}: "
    // TODO: value is a row vector.
    const valStr = val.value === undefined
      ? ""
      : val.dtype === dt.RATIONAL
      ? format(val.value, formatSpec, decimalFormat)
      : val.dtype === dt.RATIONAL + dt.QUANTITY
      ? format(val.value, formatSpec, decimalFormat) + "\\," + unitTeXFromString(val.unit.name)
      : val.dtype === dt.STRING
      ? "\\text{" + addTextEscapes(val.value) + "}"
      : "\\text{" + addTextEscapes(String(val.value)) + "}"
    str += valStr + ",\\:"
  }
  return str.slice(0, -3) + "\\}"
}

const displayAlt = (dictionary, formatSpec, decimalFormat) => {
  let str = "{"
  for (const [key, val] of dictionary.entries()) {
    str += key + ": "
    // TODO: value is a row vector.
    const valStr = val.value === undefined
      ? ""
      : val.dtype === dt.RATIONAL
      ? format(val.value, formatSpec, decimalFormat)
      : val.dtype === dt.RATIONAL + dt.QUANTITY
      ? format(val.value, formatSpec, decimalFormat).replace("{,}", ",") + " " + val.unit.name
      : val.dtype === dt.STRING
      ? val.value
      : String(val.value)
    str += valStr + ", "
  }
  return str.slice(0, -2) + "}"
}

export const Dictionary = Object.freeze({
  fromTokenStack,
  append,
  display,
  displayAlt,
  toValue
})
