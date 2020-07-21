import { dt } from "./constants"
import { errorOprnd } from "./error"

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
 *                          key2: { value: plain, unit: unitName, dtype: dtype },
 *                          etc
 *                        },
 *                 unit: { unitName1: unitData1, unitName2: unitData2, etc },
 *                 dtype: DICT
 *               }
 * A `resultdisplay` string is always in a DICT's cell attrs and sometimes in an operand.
 *
 * ERROR operand: { value: error message, unit: undefined, dtype: ERROR }
 *
 * When this module creates Hurmet operands, it does not make defensive copies of
 * cell attributes. The deep data is referenced. So Hurmet evaluate.js must copy whenever
 * operators or functions might change a cell attribute.
 *
 */

export const fromAssignment = (cellAttrs, unitAware) => {
  // Get the value that was assigned to a variable. Load it into an operand.
  if (cellAttrs.value === null || cellAttrs.value === undefined) {
    // No value assigned to variable. Return an error message.
    const insert = (cellAttrs.name) ? cellAttrs.name : "?"
    return errorOprnd("NULL", insert)
  }

  const oprnd = Object.create(null)
  oprnd.dtype = cellAttrs.dtype
  oprnd.name = cellAttrs.name

  // Get the unit data.
  if (cellAttrs.dtype === dt.STRING || cellAttrs.dtype === dt.BOOLEAN) {
    oprnd.unit = null
  } else if (cellAttrs.dtype & dt.MAP) {
    oprnd.unit = Object.freeze(cellAttrs.unit)
  } else if (cellAttrs.dtype === dt.DICT || cellAttrs.dtype === dt.DATAFRAME) {
    const unit = Object.create(null)
    unit.map = cellAttrs.unit
    oprnd.unit = Object.freeze(unit)
  } else {
    oprnd.unit = Object.create(null)
    if (cellAttrs.unit)  { oprnd.unit.name = cellAttrs.unit }
    if (cellAttrs.expos) { oprnd.unit.expos = cellAttrs.expos }
  }

  // Get the value.
  if (cellAttrs.dtype & dt.QUANTITY) {
    // Here we discard some of the cellAttrs information. In a unit-aware calculation,
    // number, matrix, and map operands contain only the value.inBaseUnits.
    oprnd.value = Object.freeze(unitAware
      ? cellAttrs.value.inBaseUnits
      : cellAttrs.value.plain
    )
    oprnd.dtype = cellAttrs.dtype - dt.QUANTITY

  } else if (cellAttrs.dtype === dt.STRING) {
    const str = cellAttrs.value
    const ch = str.charAt(0)
    const chEnd = str.charAt(str.length - 1)
    oprnd.value = ch === '"' && chEnd === '"' ? str.slice(1, -1).trim() : str.trim()

  } else {
    oprnd.value = cellAttrs.value
  }

  return Object.freeze(oprnd)
}
