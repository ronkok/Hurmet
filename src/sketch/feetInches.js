import { numberPattern, numberValue, decimalCommasToDots } from "./numberInput.js"

// Lengths written in feet and inches, e.g. 4′-3.5″.
//
// A sketch whose unit is "ft-in" keeps its model coordinates in inches, so the
// source stays plain decimal numbers. Only the display (the coordinate box,
// dimension labels) and the input box use feet and inches.

const INCHES_PER_FOOT = 12
const PX_PER_INCH = 96

// Write `value` (in inches) as 4′-3.5″, as 3.5″ when it's under a foot, or as
// 4′ when the inch part rounds to zero. `writeInches` rounds and writes the
// inch part; `writeFeet` writes the whole number of feet.
const write = (value, writeInches, writeFeet = String) => {
  const sign = value < 0 ? "-" : ""
  let feet = Math.floor(Math.abs(value) / INCHES_PER_FOOT)
  let inStr = writeInches(Math.abs(value) - feet * INCHES_PER_FOOT)
  const inchValue = str => Number(str.replace(",", "."))
  if (inchValue(inStr) >= INCHES_PER_FOOT) {
    // The inch part rounded up to a whole foot.
    feet += 1
    inStr = writeInches(0)
  }
  if (feet === 0) {
    return inchValue(inStr) === 0 ? "0″" : `${sign}${inStr}″`
  }
  return inchValue(inStr) === 0
    ? `${sign}${writeFeet(feet)}′`
    : `${sign}${writeFeet(feet)}′-${inStr}″`
}

// Up to three decimals, without trailing zeros.
const trimmedFixed = num => num.toFixed(3).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")

// The text for one cell of the coordinate box.
export const coordinateText = (value, unit, digits) => {
  return unit === "ft-in" ? write(value, trimmedFixed) : value.toFixed(digits)
}

const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹"
const subscripts = "₀₁₂₃₄₅₆₇₈₉"
const toScript = (n, digits) => String(n).replace(/\d/g, d => digits[d])

// Write `value` (in inches, ≥ 0) as whole inches and a fraction rounded to the
// nearest 1/denominator, e.g. 3³⁄₈. The fraction is reduced, so 4/16 is ¹⁄₄.
const fractionalInches = denominator => value => {
  const ticks = Math.round(value * denominator)
  const whole = Math.floor(ticks / denominator)
  let num = ticks - whole * denominator
  let den = denominator
  if (num === 0) { return String(whole) }
  while (num % 2 === 0) { num /= 2; den /= 2 }
  return `${whole}${toScript(num, superscripts)}⁄${toScript(den, subscripts)}`
}

// A dimension label in feet and inches, such as 4′-3³⁄₈″. `formatNum(num)`
// writes the number of feet with the sketch's rounding spec and decimal format.
// The inches are written to the nearest 1/denominator of an inch.
export const feetInchesLabel = (value, formatNum, denominator) => {
  return write(value, fractionalInches(denominator), formatNum)
    .replace(/^(-?)0(?=[⁰¹²³⁴⁵⁶⁷⁸⁹])/, "$1") // ³⁄₈″, not 0³⁄₈″, when under a foot
}

// Both the Unicode marks ′ ″ and the ASCII marks ' " are accepted. After a
// number of feet, the inch mark may be left off: 4' 3.5 means 4' 3.5".
// The inches may be a mixed fraction: 4' 3 3/8".
const num = `(${numberPattern})`
const feetInchesRegEx = new RegExp(
  String.raw`^([+-])?\s*(?:${num}\s*[′'])?\s*-?\s*(?:${num}\s*[″"]?)?$`
)
const markRegEx = /[′'″"]/
// Like parseFloat, read the number at the start and ignore whatever follows it.
const leadingNumberRegEx = new RegExp(String.raw`^[+-]?\s*${num}`)

// Read a length typed into the input box and return it in model units.
// A bare number is already in model units. A length written with feet and/or
// inch marks, such as 4′-3.5″, 4′ 3.5″, 4'3.5", 4' 3.5, 4′, or 3.5″, is
// converted from inches. A decimal comma is read as a decimal point, and any
// number may be a mixed fraction, such as 3 3/8. `pxPerModelUnit` is the
// sketch unit's entry in utils.unitScaleFactors.
// Returns NaN if the text can't be read.
export const parseLength = (str, pxPerModelUnit) => {
  str = decimalCommasToDots(str.trim())
  if (!markRegEx.test(str)) {
    const match = leadingNumberRegEx.exec(str)
    return match ? numberValue(match[0]) : NaN
  }
  const match = feetInchesRegEx.exec(str)
  if (!match || (match[2] === undefined && match[3] === undefined)) { return NaN }
  const feet = match[2] === undefined ? 0 : numberValue(match[2])
  const inches = match[3] === undefined ? 0 : numberValue(match[3])
  const sign = match[1] === "-" ? -1 : 1
  return sign * (feet * INCHES_PER_FOOT + inches) * PX_PER_INCH / pxPerModelUnit
}

