import { dt, allZeros } from "./constants"
import { clone } from "./utils"
import { errorOprnd } from "./error"
import { isMatrix } from "./matrix"

/*
 * Hurmet operands often have numeric values. Sometimes they are the numbers originally
 * input by the writer, henceforward known as "plain". Sometimes we work instead with
 * values that have been converted to SI base units. It turns out that operands inside
 * evalRpn() can often get by with less information than in the original cell assignment attrs.
 * Some details for various data types:
 *
 * RATIONAL operand: { value: plain, unit: allZeros, dtype: RATIONAL }
 * RATIONAL cell attrs: ditto.
 * Note: "allZeros" is the array of unit-checking exponents for a number: [0,0,0,0,0,0,0,0,0]
 *
 * RATIONAL + QUANTITY unit-unaware operand: same as RATIONAL.
 * RATIONAL + QUANTITY unit-AWARE oprnd: {
 *   value: inBaseUnits, unit: expos, dtype: RATIONAL + QUANTITY
 * }
 * RATIONAL + QUANTITY cell attrs include both of the above and also a `resultdisplay` string.
 *
 * RATIONAL + ROWVECTOR is the same as RATIONAL except the value is an array of plains.
 * RATIONAL + ROWVECTOR + QUANTITY is the same as RATIONAL + QUANTITY except values are arrays.
 * COLUMNVECTOR is the same as ROWVECTOR exept that they are treated differently by operators.
 * MATRIX indicates that values are each an array of row vectors.
 *
 * MAP and DICT both implement a key:value store. They look the same to the user.
 * We don't save values inBaseUnits in either one.
 * If a unit-aware calculation calls a value from a dictionary, we convert on the fly.
 *
 * A MAP's values are all the same data type and all have the same unit of measure.
 * MAP oprnd: { value: {key1: plain, key2: plain, etc}, unit: unitData, dtype: MAP + RATIONAL }
 *    where: unitData is an object containing { name, factor, gauge, expos }
 * A `resultdisplay` string is always in a MAP's cell attrs and sometimes in an operand.
 *
 * DICT operand: { value: { key1: { value: plain, unit: unitName, dtype: dtype },
 *                            key2: { value: plain, unit: unitName, dtype: dtype },
 *                            etc
 *                          },
 *                   unit: { unitName1: unitData1, unitName2: unitData2, etc },
 *                   dtype: DICT
 *                  }
 * A `resultdisplay` string is always in a DICT's cell attrs and sometimes in an operand.
 *
 * ERROR operand: { value: error message, unit: undefined, dtype: ERROR }
 *
 */

const fromAssignment = (cellAttrs, unitAware) => {
  // Get the value that was assigned to a variable. Load it into an operand.
  if (cellAttrs.value === null || cellAttrs.value === undefined) {
    // No value assigned to variable. Return an error message.
    const insert = (cellAttrs.name) ? cellAttrs.name : "?"
    return errorOprnd("NULL", insert)
  }

  if (cellAttrs.dtype === dt.RATIONAL) {
    return clone(cellAttrs)

  } else if (cellAttrs.dtype & dt.BOOLEAN) {
    return clone(cellAttrs)

  } else if (cellAttrs.dtype === dt.STRING) {
    return fromString(cellAttrs.value)

  } else if (cellAttrs.dtype === dt.DATAFRAME) {
    // No defensive copy here. Data frames are immutable.
    return  { value: cellAttrs.value, unit: cellAttrs.unit, dtype: dt.DATAFRAME }

  } else if (cellAttrs.dtype & dt.DICT) {
    return clone(cellAttrs)

  } else if (cellAttrs.dtype & dt.QUANTITY) {
    // Here we discard some of the cellAttrs information. In a unit-aware calculation,
    // number and matrix operands contain only the value.inBaseUnits and the unit exponents.
    // In the non-unit aware case, cellAttrs.unit is returned in case they are needed
    // to build a dictionary out of some assembled operands.
    const dtype = cellAttrs.dtype - dt.QUANTITY
    const value = clone(unitAware ? cellAttrs.value.inBaseUnits : cellAttrs.value.plain)
    return { value, unit: clone(unitAware ? cellAttrs.expos : allZeros), dtype }

  } else if (isMatrix(cellAttrs)) {
    const expos = (cellAttrs.dtype & dt.RATIONAL) ? allZeros : null
    return clone({ value: cellAttrs.value, unit: expos, dtype: cellAttrs.dtype })

  } else if (cellAttrs.dtype & dt.MAP) {
    const unit = (cellAttrs.dtype & dt.RATIONAL) ? allZeros : null
    return clone({ value: cellAttrs.value, unit, dtype: cellAttrs.dtype })

  } else if (cellAttrs.dtype === dt.MODULE) {
    return { value: cellAttrs.value, unit: null, dtype: dt.MODULE }

  } else {
    const insert = (cellAttrs.name) ? cellAttrs.name : "?"
    return errorOprnd("BAD_TYPE", insert)
  }
}

const fromString = (str) => {
  const ch = str.charAt(0)
  const chEnd = str.charAt(str.length - 1)
  return {
    value: ch === '"' && chEnd === '"' ? str.slice(1, -1).trim() : str.trim(),
    unit: null,
    dtype: dt.STRING
  }
}

export const Operand = Object.freeze({
  fromAssignment,
  fromString
})
