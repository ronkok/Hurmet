import { dt, allZeros } from "./constants"
import { tablessTrim } from "./utils"
import { parse } from "./parser"
import { evalRpn } from "./evaluate"
import { Rnl } from "./rational"
import { parseFormatSpec } from "./format"
import { DataFrame } from "./dataframe"

const numberRegEx = new RegExp(Rnl.numberPattern)
const unitRegEx = /('[^']+'|[°ΩÅK])$/
/* eslint-disable max-len */

const numStr = "(-?(?:0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?)))"
const nonNegNumStr = "(0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?))"
const complexRegEx = new RegExp("^" + numStr + "(?: *([+-]) *j +" + nonNegNumStr + "|∠" + numStr + "(°)?)")
// const complexRegEx = /^(number)(?: *([+-]) *j +(non-negative number)|∠(number)(°)?)/
/* eslint-enable max-len */
// Capturing groups:
//    [1] First number, either a in a + j b, or r in r∠θ
//    [2] + or -. Gives the sign of the imaginary part in an a + j b.
//    [3] b, the imaginary part in an a + j b expression
//    [4] theta, the argument (phase angle ) of an r∠θ expression
//    [5] °, optional trailing degree sign in an r∠θ expression

export const valueFromLiteral = (str, name, decimalFormat) => {
  // Read a literal string and return a value
  // The return should take the form: [value, unit, dtype, resultDisplay]

  // Start by checking for a unit
  const unitMatch = unitRegEx.exec(str)
  const unitName = (unitMatch) ? unitMatch[0].replace(/'/g, "").trim() : undefined

  if (/^[({[].* to /.test(str)) {
    // str defines a quantity distribution, (a to b). That is handled by calculation.js.
    // This is not a valid literal.
    return [0, null, dt.ERROR, ""]

  } else if (str === "true" || str === "false") {
    return [Boolean(str), null, dt.BOOLEAN, `\\mathord{\\text{${str}}}`]

  } else if (/^\x22.+\x22/.test(str)) {
    // str contains text between quotation marks
    if (name === "format") {
      return parseFormatSpec(str.slice(1, -1).trim())
    } else {
      const tex = parse(str, decimalFormat)
      return [str, undefined, dt.STRING, tex]
    }

  } else if (/^[([]/.test(str)) {
    // We're processing a matrix
    const [tex, rpn] = parse(str, decimalFormat, true)
    const oprnd = evalRpn(rpn, {}, decimalFormat, false, {})
    const unit = (oprnd.dtype & dt.RATIONAL) ? allZeros : null
    return [oprnd.value, unit, oprnd.dtype, tex]

  } else if (/^(\{)/.test(str)) {
    // We're assigning a dictionary.
    const [tex, rpn] = parse(str, decimalFormat, true)
    if (!/\xa0dictionary\xa0\d+$/.test(rpn)) { return [0, null, dt.ERROR, ""]  }
    const oprnd = evalRpn(rpn, {}, decimalFormat, false, {})
    return [oprnd.value, oprnd.unit, oprnd.dtype, tex]

  } else if (/^``/.test(str)) {
    // A CSV between double back ticks.
    // Read the CSV into a data frame.
    const pos = str.indexOf('`', (str.charAt(2) === "`" ? 3 : 2))
    str = tablessTrim(str.slice(2, pos))
    const dataFrame = DataFrame.dataFrameFromCSV(str, {})
    return [dataFrame.value, dataFrame.unit, dt.DATAFRAME,
      DataFrame.display(dataFrame.value, "h3", decimalFormat)]

  } else if (complexRegEx.test(str)) {
    // str is a complex number.
    const resultDisplay = parse(str, decimalFormat)
    const parts = str.match(complexRegEx)
    let real
    let im
    if (parts[3]) {
      // a + j b expression
      real = Rnl.fromString(parts[1])
      im = Rnl.fromString(parts[3])
      if (parts[2] === "-") { im = Rnl.negate(im) }
    } else {
      // r∠θ expression
      const r = Rnl.fromString(parts[1])
      let theta = Rnl.fromString(parts[4])
      if (parts[5]) { theta = Rnl.divide(Rnl.multiply(theta, Rnl.pi), Rnl.fromNumber(180)) }
      real = Rnl.multiply(r, Rnl.fromNumber(Math.cos(Rnl.toNumber(theta))))
      im = Rnl.multiply(r, Rnl.fromNumber(Math.sin(Rnl.toNumber(theta))))
    }
    return [[real, im], allZeros, dt.COMPLEX, resultDisplay]

  } else if (str.match(numberRegEx)) {
    // str is a number.
    const resultDisplay = parse(str, decimalFormat)
    if (unitName) {
      return [Rnl.fromString(str), unitName, dt.RATIONAL + dt.QUANTITY, resultDisplay]
    } else {
      return [Rnl.fromString(str), allZeros, dt.RATIONAL, resultDisplay]
    }

  } else {
    return [0, null, dt.ERROR, ""]

  }
}

