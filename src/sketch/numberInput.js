import { Rnl } from "../rational.js"

// Numbers, as typed into the input box or written in the sketch source.
//
// As in a Hurmet math zone, a number typed into the input box may use either
// a dot or a comma for its decimal separator. A comma followed by a space
// separates two numbers. So 1,5 is 1.5, but 1, 5 is two numbers.
// The sketch source always uses a dot for the decimal separator.
//
// A number may also be written as a mixed fraction, 3 3/8, or a fraction, 3/8.
// A lexer must look for a mixed fraction before it looks for a decimal number.
// Then the space in 3 3/8 is never mistaken for a gap between two numbers.

// An unsigned number, mixed fraction first.
export const numberPattern = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+`

// What separates the numbers in a list, such as nx, ny in the array spec.
export const numberSeparatorRegEx = /,\s+/

// Turn each decimal comma in a numeric input into a dot, so 1,5 becomes 1.5.
// A comma followed by a space is left alone.
export const decimalCommasToDots = str => str.replace(/(\d),(?=\d)/g, "$1.")

// The value of a number that matches numberPattern, with an optional sign.
export const numberValue = str => {
  str = str.trim()
  const sign = str.charAt(0) === "-" ? -1 : 1
  str = str.replace(/^[+-]\s*/, "").replace(/\s+/g, " ")
  if (!str.includes("/")) { return sign * Number(str) }
  if (/\/0+$/.test(str)) { return NaN }  // Zero denominator
  // Rnl.fromString reads a mixed fraction, so write a plain fraction as one.
  // The sign is applied here because Rnl.fromString gets -3 3/8 wrong.
  return sign * Rnl.toNumber(Rnl.fromString(str.includes(" ") ? str : "0 " + str))
}
