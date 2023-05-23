import { dt, allZeros } from "./constants"
import { tablessTrim, unitTeXFromString } from "./utils"
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
const complexRegEx = new RegExp("^" + numStr + "(?: *([+-]) *" + nonNegNumStr + " *im|∠" + numStr + "(°)?)")
// const complexRegEx = /^(number)(?: *([+-]) *(non-negative number) *im|∠(number)(°)?)/
/* eslint-enable max-len */
// Capturing groups:
//    [1] First number, either a in a ± b im, or r in r∠θ
//    [2] + or -. Gives the sign of the imaginary part in an a ± b im.
//    [3] b, the imaginary part in an a ± b im expression
//    [4] theta, the argument (phase angle ) of an r∠θ expression
//    [5] °, optional trailing degree sign in an r∠θ expression

export const valueFromLiteral = (str, name, decimalFormat) => {
  // Read a literal string and return a value
  // The return should take the form: [value, unit, dtype, resultDisplay]

  // Start by checking for a unit
  let unitName = ""
  let unitDisplay = ""
  const unitMatch = unitRegEx.exec(str)
  if (unitMatch) {
    unitName = unitMatch[0].replace(/'/g, "").trim()
    str = str.slice(0, -unitMatch[0].length).trim()
    unitDisplay = unitTeXFromString(unitName)
  }

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
    let unit = (oprnd.dtype & dt.RATIONAL) ? allZeros : null
    let dtype = oprnd.dtype
    if (unitName) {
      unit = unitName
      dtype += dt.QUANTITY
      return [oprnd.value, unit, dtype, tex + "\\," + unitDisplay]
    } else {
      return [oprnd.value, unit, dtype, tex]
    }

  } else if (/^``/.test(str)) {
    // A TSV between double back ticks.
    // Read the TSV into a data frame.
    str = tablessTrim(str.slice(2, -2))
    const dataStructure = DataFrame.dataFrameFromTSV(str, {})
    if (dataStructure.dtype === dt.DATAFRAME) {
      return [dataStructure.value, dataStructure.unit, dt.DATAFRAME,
        DataFrame.display(dataStructure.value, "h3", decimalFormat)]
    } else {
      // It's a Hurmet Map
      if (unitName) {
        dataStructure.unit = unitName
        dataStructure.dtype = dt.MAP + dt.RATIONAL + dt.QUANTITY
      }
      return [dataStructure.value, dataStructure.unit, dataStructure.dtype,
        DataFrame.display(dataStructure.value, "h3", decimalFormat) + "\\;" + unitDisplay]
    }

  } else if (complexRegEx.test(str)) {
    // str is a complex number.
    const resultDisplay = parse(str, decimalFormat)
    const parts = str.match(complexRegEx)
    let realPart
    let imPart
    if (parts[3]) {
      // a + b im expression
      realPart = Rnl.fromString(parts[1])
      imPart = Rnl.fromString(parts[3])
      if (parts[2] === "-") { imPart = Rnl.negate(imPart) }
    } else {
      // r∠θ expression
      const r = Rnl.fromString(parts[1])
      let theta = Rnl.fromString(parts[4])
      if (parts[5]) { theta = Rnl.divide(Rnl.multiply(theta, Rnl.pi), Rnl.fromNumber(180)) }
      realPart = Rnl.multiply(r, Rnl.fromNumber(Math.cos(Rnl.toNumber(theta))))
      imPart = Rnl.multiply(r, Rnl.fromNumber(Math.sin(Rnl.toNumber(theta))))
    }
    return [[realPart, imPart], allZeros, dt.COMPLEX, resultDisplay]

  } else if (str.match(numberRegEx)) {
    // str is a number.
    const resultDisplay = parse(str, decimalFormat)
    if (unitName) {
      return [Rnl.fromString(str), unitName, dt.RATIONAL + dt.QUANTITY,
        resultDisplay + "\\;" + unitDisplay]
    } else {
      return [Rnl.fromString(str), { expos: allZeros }, dt.RATIONAL, resultDisplay]
    }

  } else {
    return [0, null, dt.ERROR, ""]

  }
}

