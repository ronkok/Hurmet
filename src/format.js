import { Rnl } from "./rational"
import { dt } from "./constants"
import { errorOprnd } from "./error"

const siPrefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k",
  "M", "G", "T", "P", "E", "Z", "Y"]

const groupByThreeRegEx = /\B(?=(\d{3})+$)/g
const groupByFourRegEx = /\B(?=(\d{4})+$)/g  // use sometimes in China
// Grouping as common in south Asia: 10,10,000
const groupByLakhCroreRegEx = /(\d)(?=(\d\d)+\d$)/g

const formatRegEx = /^([beEfhkmprsStx%])?(-?[\d]+)?([i∠°])?$/

const superscript = str => {
  // Convert a numeral string to Unicode superscript characters.
  // Used for denominator in mixed fractions/
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    result += (charCode === 0x31)
      ? "¹"
      : charCode === 0x32
      ? "²"
      : charCode === 0x33
      ? "³"
      : String.fromCharCode(charCode + 0x2040)
  }
  return result
}

const subscript = str => {
  // Convert a numeral string to Unicode subscript characters.
  // Used for mixed fraction denominators.
  let result = ""
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) + 0x2050)
  }
  return result
}

export const texFromMixedFraction = (numParts) => {
  return (numParts[1] ? "-" : "") +
    numParts[3] + "\\,\\class{special-fraction}{\\text{" +
    superscript(numParts[4]) + "\u2044" + subscript(numParts[5]) + "}}"
}

const intAbs = i => i >= BigInt(0) ? i : BigInt(-1) * i  // absolute value of a BigInt

const roundedString = (r, spec) => {
  // Return a string rounded to the correct number of digits
  const N = spec.numDigits

  switch (spec.ftype) {
    case "h": {
      // Round a fraction, but not an integer, to N significant digits.
      const integerStr = String(Rnl.toString(r, 0))
      if (integerStr.replace("-", "").length >= N) { return integerStr }
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      return Rnl.toNumber(r).toPrecision(N)
    }

    case "f":
    case "%":
      // Exactly N digits after the decimal.
      return Rnl.toString(r, N)

    case "r":
    case "p": {
      // Round to N significant digits
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      const numStr = Rnl.toNumber(r).toPrecision(N)
      return numStr.indexOf("e") > -1 ? Number(numStr).toPrecision() : numStr
    }

    case "s":
    case "S":
    case "e":
    case "E":
    case "n":
    case "N":
    case "k":
      // Some variety of scientific notation.
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      return Rnl.toNumber(r).toExponential(N - 1).replace("+", "")

    default: {
      r = Rnl.normalize(r)
      const sign =  Rnl.isNegative(r) ? "-" : ""
      const numerator = intAbs(r[0])
      const denominator = r[1]

      switch (spec.ftype) {
        case "m": {
          // Mixed fraction
          const quotientStr = String(numerator / denominator)
          const remainder = numerator % denominator
          return sign + quotientStr + "\u00a0" + superscript(remainder) +
            "⁄" + subscript(denominator)
        }

        case "t":
          // Truncate to integer
          return sign + String(numerator / denominator)

        case "b":
        case "x":
        case "X":
          // binary or hexadecimal integer
          if (denominator !== BigInt(1)) { return errorOprnd("INT_NUM", spec.ftype) }
          if (numerator <= Number.MAX_SAFE_INTEGER) {
            return (spec.ftype === "b")
              ? sign + "0b" + Number(numerator).toString(2)
              : spec.ftype === "x"
              ? sign + "0x" + Number(numerator).toString(16)
              : sign + "0x" + Number(numerator).toString(16).toUpperCase()
          } else {
            // TODO: display large hex or binary.
            return ""
          }
      }
    }
  }
}

const formattedInteger = (intStr, decimalFormat) => {
  const thousandsSeparator = decimalFormat.charAt(1)
  if (thousandsSeparator === "0") {
    return intStr
  } else if (decimalFormat === "1,00,000.") {
    return intStr.replace(groupByLakhCroreRegEx, "$1{,}")
  } else if (decimalFormat === "1,0000,0000.") {
    return intStr.replace(groupByFourRegEx, "$1{,}")
  } else {
    return intStr.replace(groupByThreeRegEx,
      (thousandsSeparator === ",")
      ? "{,}"
      : (thousandsSeparator === " ")
      ? "\\:"
      : (thousandsSeparator === "’")
      ? "’"
      : "."
    )
  }
}

export const formattedDecimal = (numStr, decimalFormat, truncateTrailingZeros) => {
  const pos = numStr.indexOf(".")
  if (pos === -1) {
    return formattedInteger(numStr, decimalFormat)
  } else {
    const intStr = numStr.slice(0, pos)
    const decimalSeparator = decimalFormat.slice(-1)
    let frac = (decimalSeparator === "." ? "." : "{,}") + numStr.slice(pos + 1)
    if (truncateTrailingZeros) { frac = frac.replace(/(\.|{,})?0+$/, "") }
    return formattedInteger(intStr, decimalFormat) + frac
  }
}

export const parseFormatSpec = str => {
  // Do the RegEx once, at compile time, not every time a number is formatted.
  //
  // str ≔ "Tn", where:
  //    T = type, [bEefhkmNnprSstx%], default: "h"
  //    n = number of digits, [0-9]+, default: 15
  //
  //    Possible future additions: complex number format [√∠°]

  const match = formatRegEx.exec(str)
  if (!match) {
    const message = errorOprnd("BAD_FORMAT", str).value
    return [str, undefined, dt.ERROR, "\\text{" + message + "}"]
  }

  let ftype = match[1] || "h"
  let N = Number(match[2] || "15")
  const ctype = match[3]  || ""

  // Check the specified number of digits
  switch (ftype) {
    case "b":
    case "x":
    case "X":
      return [str, undefined, dt.STRING, "\\text{" + ftype + ctype + "}" ]
    case "t":
      N = 0
      break
    case "f":
    case "%":
      break
    default:
      if (N < 1 || N > 15) {
        const message = "\\text{" + errorOprnd("BAD_PREC").value + "}"
        return [str, undefined, dt.ERROR, message]
      }
  }

  if (ftype === "%") { ftype = "\\%" }
  return [str, undefined, dt.STRING, "\\text{" + ftype + String(N) + ctype + "}" ]
}

export const format = (num, specStr = "h3", decimalFormat = "1,000,000.") => {
  if (Rnl.isZero(num)) { return "0" }

  const spec = { ftype: specStr.charAt(0) }
  if (/[i∠°]$/.test(specStr)) { specStr = specStr.slice(0, -1) }
  if (specStr.length > 1) { spec.numDigits = Number(specStr.slice(1)) }

  if (spec.ftype === "%" || spec.ftype === "p") { num[0] = num[0] * BigInt(100) }

  if ((spec .ftype === "b" || spec.ftype === "x") && !Rnl.isInteger(num)) {
    return errorOprnd("FORM_FRAC")
  }

  // Round the number
  const numStr = roundedString(num, spec)

  // Add separators
  switch (spec.ftype) {
    case "f":
    case "r":
    case "h":
      return formattedDecimal(numStr, decimalFormat, spec.ftype === "h")
    case "t":
      return formattedInteger(numStr, decimalFormat)
    case "%":
    case "p":
      return formattedDecimal(numStr, decimalFormat) + "\\%"
    case "m":
    case "b":
    case "x":
    case "X":
      return numStr
    default: {
      // Some sort of scientific notation.
      const pos = numStr.indexOf("e")
      let significand = numStr.slice(0, pos)
      if (decimalFormat.slice(-1) === ",") { significand = significand.replace(".", "{,}") }

      switch (spec.ftype) {
        case "e":
        case "E": {
          const result = significand + "\\text{" + spec.ftype
          if (numStr.charAt(pos + 1) === "-") {
            return result + "-}" + numStr.slice(pos + 2)
          } else {
            return result + "}" + numStr.slice(pos + 1)
          }
        }

        case "s":
        case "S":
        case "n":
        case "N": {
          const op = spec.ftype === "S" ? "×" : "\\mkern2mu{\\cdot}\\mkern1mu"
          return significand + op + "10^{" + numStr.slice(pos + 1) + "}"
        }

        case "k": {
          const exponent = Number(numStr.slice(pos + 1))
          const quotient = exponent  / 3
          const q = quotient >= 0 ? Math.floor(quotient) : Math.ceil(quotient)
          const modulo = exponent  % 3
          if (modulo !== 0) {
            significand = String(Number(significand) * Math.pow(10, modulo))
          }
          return significand + siPrefixes[8 + q]
        }
      }
    }
  }
}
