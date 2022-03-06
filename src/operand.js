import { dt } from "./constants"
import { errorOprnd } from "./error"
import { clone } from "./utils"

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
 * *
 * A MAP's values are all the same data type and all have the same unit of measure.
 * MAP oprnd: {name, value: see below, unit: {name, factor, gauge, expos}, dtype: dMAP + ...}
 *    where: value is: {name1: value, name2: value} or
 *    where value is: {plain: {name1: value, name2: value},
 *                     inBaseUnits: {name1: value, name2: value},
 *                     etc}
 * A `resultdisplay` string is always in a MAP's cell attrs and sometimes in an operand.
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
  if (cellAttrs.value === null) {
    // Return an error message.
    const insert = (cellAttrs.name) ? cellAttrs.name : "?"
    return errorOprnd("NULL", insert)
  }

  const oprnd = Object.create(null)
  oprnd.dtype = cellAttrs.dtype
  oprnd.name = cellAttrs.name

  // Get the unit data.
  if (cellAttrs.dtype === dt.STRING || cellAttrs.dtype === dt.BOOLEAN ||
      cellAttrs.dtype === dt.NULL) {
    oprnd.unit = null
  } else if (cellAttrs.dtype === dt.DATAFRAME || (cellAttrs.dtype & dt.MAP)) {
    oprnd.unit = Object.freeze(clone(cellAttrs.unit))

  } else if (cellAttrs.unit && cellAttrs.unit.expos) {
    oprnd.unit = clone(cellAttrs.unit)
  } else {
    oprnd.unit = Object.create(null)
    if (cellAttrs.unit)  { oprnd.unit.name = cellAttrs.unit }
    if (cellAttrs.expos) { oprnd.unit.expos = clone(cellAttrs.expos) }
  }

  // Get the value.
  if (cellAttrs.dtype & dt.QUANTITY) {
    // Here we discard some of the cellAttrs information. In a unit-aware calculation,
    // number, matrix, and map operands contain only the value.inBaseUnits.
    oprnd.value = Object.freeze(unitAware
      ? clone(cellAttrs.value.inBaseUnits)
      : clone(cellAttrs.value.plain)
    )
    oprnd.dtype = cellAttrs.dtype - dt.QUANTITY

  } else if (cellAttrs.dtype === dt.STRING) {
    const str = cellAttrs.value
    const ch = str.charAt(0)
    const chEnd = str.charAt(str.length - 1)
    oprnd.value = ch === '"' && chEnd === '"' ? str.slice(1, -1).trim() : str.trim()

  } else if (cellAttrs.dtype === dt.DATAFRAME) {
    // For data frames, Hurmet employs copy-on-write tactics.
    // So at this point, we can pass a reference to the value
    oprnd.value = cellAttrs.value

    // Note the only operations on data frames are: (1) access, and (2) concatenate.
    // That's where the copy-on-write takes place.

  } else {
    // For all other data types, we employ copy-on-read. So we return a deep copy from here.
    oprnd.value = clone(cellAttrs.value)
  }

  return Object.freeze(oprnd)
}

