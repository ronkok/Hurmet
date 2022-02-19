import { parse } from "./parser"
import { dt } from "./constants"
import { clone } from "./utils"
import { format } from "./format"
import { Rnl } from "./rational"
import { isMatrix } from "./matrix"

export function insertOneHurmetVar(hurmetVars, attrs) {
  // hurmetVars is a key:value store of variable names and attributes.
  // This function is called to insert an assignment into hurmetVars.

  if (!Array.isArray(attrs.name)) {
    // This is the typical case.
    hurmetVars[attrs.name] = attrs

  } else if (attrs.value === null) {
    for (let i = 0; i < attrs.name.length; i++) {
      hurmetVars[attrs.name[i]] = { value: null }
    }
  } else if (isMatrix(attrs)) {
    // Assign to a matrix of names
    const isQuantity = Boolean(attrs.dtype & dt.QUANTITY)
    let resultDisplay = attrs.resultdisplay
    resultDisplay = resultDisplay.replace(/\\(begin|end){[bp]matrix}/g, "").trim()
    const displays = resultDisplay.split(/&|\\\\/)
    if (attrs.dtype & dt.MATRIX) {
      // A 2 dimensional matrix.
      const dtype = attrs.dtype - dt.MATRIX
      const numRows = isQuantity ? attrs.value.plain.length : attrs.value.length
      const numCols = attrs.name.length / numRows
      let iName = 0
      for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
          const value = isQuantity
            ? { plain: attrs.value.plain[i][j], inBaseUnits: attrs.value.inBaseUnits[i][j] }
            : attrs.value[i][j]
          hurmetVars[attrs.name[i]] = {
            name: attrs.name[iName],
            value,
            resultdisplay: isQuantity
              ? parse(displays[iName].trim() + " '" + attrs.unit + "'")
              : displays[iName].trim(),
            expos: attrs.expos,
            unit: isQuantity ? attrs.unit : undefined,
            dtype
          }
          iName += 1
        }
      }
    } else {
      // A vector.
      const isColumn = Boolean(attrs.dtype & dt.COLUMNVECTOR)
      const dtype = attrs.dtype - (isColumn ? dt.COLUMNVECTOR : dt.ROWVECTOR)
      for (let i = 0; i < attrs.name.length; i++) {
        const value = isQuantity
          ? { plain: attrs.value.plain[i], inBaseUnits: attrs.value.inBaseUnits[i] }
          : attrs.value[i]
        hurmetVars[attrs.name[i]] = {
          name: attrs.name[i],
          value,
          resultdisplay: isQuantity
            ? parse(displays[i].trim() + " '" + attrs.unit + "'")
            : displays[i].trim(),
          expos: attrs.expos,
          unit: isQuantity ? attrs.unit : undefined,
          dtype
        }
      }
    }

  } else if (attrs.dtype === dt.DICT) {
    // multiple assignment from a dictionary
    if (attrs.name.length !== attrs.value.size) {
      // TODO: Error
      // Multiple assignments don't print a result, so this is awkward.
    } else {
      let i = 0
      for (const value of attrs.value.values()) {
        const result = clone(value)
        if (result.unit && result.unit.name) {
          // A quantity. Get the value in both plain and base units.
          const plain = result.value
          const unit = attrs.unit[result.unit.name]
          const inBaseUnits = Rnl.multiply(Rnl.add(plain, unit.gauge), unit.factor)
          result.value = { plain, inBaseUnits }
          result.expos = unit.expos
          result.resultdisplay = parse(format(plain) + " '" + result.unit.name + "'")
        } else if (Rnl.isRational(result.value)) {
          result.expos = result.unit
          result.resultdisplay = parse(format(result.value))
        } else {
          result.resultdisplay = result.value
        }
        hurmetVars[attrs.name[i]] = result
        i += 1
      }
    }
  } else if (attrs.dtype & dt.MAP) {
    if (attrs.name.length !== attrs.value.size) {
      // TODO: Error
      // Multiple assignments don't print a result, so this is awkward.
    } else {
      for (const [key, value] of attrs.value) {
        const result = { value }
        if (attrs.unit && attrs.unit.name) {
          // A quantity. Get the value in both plain and base units.
          const inBaseUnits = value
          const unit = attrs.unit
          const plain = Rnl.subtract(Rnl.divide(inBaseUnits, unit.factor), unit.gauge)
          result.value = { plain, inBaseUnits }
          result.expos = unit.expos
          result.resultdisplay = parse(format(plain) + " '" + unit.name + "'")
        } else if (Rnl.isRational(result.value)) {
          result.expos = attrs.unit
          result.resultdisplay = parse(format(result.value))
        } else {
          result.resultdisplay = result.value
        }
        result.dtype = attrs.dtype - dt.MAP
        hurmetVars[key] = result
      }
    }
  }  else if (attrs.dtype === dt.MODULE) {
    // multiple assignment from a module
    if (attrs.name.length !== attrs.value.length) {
      // TODO: Error
      // Multiple assignments don't print a result, so this is awkward.
    } else {
      let i = 0
      for (const value of attrs.value.values()) {
        const result = clone(value)
        hurmetVars[attrs.name[i]] = result
        i += 1
      }
    }
  } else {
    // TODO: Write an error message.
  }
}
