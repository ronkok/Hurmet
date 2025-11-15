import { dt, allZeros } from "./constants"
import { tablessTrim, unitTeXFromString } from "./utils"
import { parse } from "./parser"
import { evalRpn } from "./evaluate"
import { Rnl } from "./rational"
import { Matrix } from "./matrix"
import { unitFromUnitName } from "./units"
import { validateFormatSpec } from "./format"
import { DataFrame } from "./dataframe"
import { map } from "./map"
import { dateRegEx, dateInSecondsFromIsoString, formatDate } from "./date"

const numberRegEx = new RegExp(Rnl.numberPattern)
const matrixRegEx = /^[([] *(?:(?:-?[0-9.]+|"[^"]+"|true|false) *[,;\t]? *)+[)\]]/
/* eslint-disable max-len */

const numStr = "(-?(?:0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?)))"
const nonNegNumStr = "(0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?))"
export const complexRegEx = new RegExp("^" + numStr + "(?: *([+-]) *(?: j *" + nonNegNumStr + "|" + nonNegNumStr + " *∠" + numStr + "(°)?))")
// const complexRegEx = /^(number)(?: *([+-]) *(non-negative number) *j(number)(°)?)/
/* eslint-enable max-len */
// Capturing groups:
//    [1] First number, either a in a ± b im, or r in r∠θ
//    [2] + or -. Gives the sign of the imaginary part in an a ± b im.
//    [3] b, the imaginary part in an a ± b im expression
//    [4] theta, the argument (phase angle ) of an r∠θ expression
//    [5] °, optional trailing degree sign in an r∠θ expression

const unitFromString = str => {
  if (str.length === 0) { return ["", ""] }
  const unitName = str.replace(/'/g, "").trim()
  const unit = unitFromUnitName(unitName)
  const unitDisplay = (unit.dtype && unit.dtype === dt.ERROR)
    ? ""
    : unitTeXFromString(unitName)
  return [unit, unitDisplay]
}

const literalWithUnit = (oprnd, tex, unitStr) => {
  let unit = (oprnd.dtype & dt.RATIONAL) ? { expos: allZeros } : null
  let unitDisplay = ""
  let value = oprnd.value
  if (unitStr.length > 0) {
    [unit, unitDisplay] = unitFromString(unitStr)
    if (unit.dtype && unit.dtype === dt.ERROR) {
      return [0, null, dt.ERROR, unit.value]
    }
    value = oprnd.dtype === dt.RATIONAL
      ? {
        plain: oprnd.value,
        inBaseUnits: Rnl.multiply(Rnl.add(oprnd.value, unit.gauge), unit.factor)
      }
      : {
        plain: oprnd.value,
        inBaseUnits: Matrix.convertToBaseUnits(oprnd, unit.gauge, unit.factor)
      }
  }
  let dtype = oprnd.dtype
  if (unitDisplay.length > 0) {
    dtype += dt.QUANTITY
    return [value, unit, dtype, tex + "\\," + unitDisplay]
  } else {
    return [value, unit, dtype, tex]
  }
}

export const valueFromLiteral = (str, name, formats) => {
  // Read a literal string and return a value
  // The return should take the form: [value, unit, dtype, resultDisplay]

  if (/^[({[].* to /.test(str)) {
    // str defines a quantity distribution, (a to b). That is handled by calculation.js.
    // This is not a valid literal.
    return [0, null, dt.ERROR, ""]

  } else if (str === "true" || str === "false") {
    return [Boolean(str), null, dt.BOOLEAN, `\\mathord{\\text{${str}}}`]

  } else if (str.length > 3 && str.slice(0, 3) === '"""') {
    // str contains a macro
    return [str.slice(3, -3), undefined, dt.MACRO, ""]

  } else if (/^\x22.+\x22/.test(str)) {
    // str contains text between quotation marks
    if (name === "format") {
      return validateFormatSpec(str.slice(1, -1).trim())
    } else {
      const tex = parse(str, formats)
      return [str.slice(1, -1), undefined, dt.STRING, tex]
    }

  } else if (matrixRegEx.test(str)) {
    // We're processing a matrix
    const matrixStr = matrixRegEx.exec(str)[0];
    const [tex, rpn, _] = parse(matrixStr, formats, true)
    const oprnd = evalRpn(rpn, {}, formats, false, {})
    const unitStr = str.slice(matrixStr.length).trim()
    return literalWithUnit(oprnd, tex, unitStr)

  } else if (/^``/.test(str)) {
    // A TSV between double back ticks.
    // Read the TSV into a data frame.
    const pos = str.indexOf("``", 2)
    const tsv = tablessTrim(str.slice(2, pos))
    const oprnd = DataFrame.dataFrameFromTSV(tsv)
    if (oprnd.dtype === dt.DATAFRAME) {
      return [oprnd.value, oprnd.unit, dt.DATAFRAME,
        DataFrame.display(oprnd.value, "h3", formats.decimalFormat)]
    } else {
      // It's a Hurmet Map
      const unitStr = str.slice(pos + 2).trim()
      let unit
      let unitDisplay = ""
      if (unitStr.length > 0) {
        [unit, unitDisplay] = unitFromString(unitStr)
        if (unit.dtype && unit.dtype === dt.ERROR) { return [0, null, dt.ERROR, ""] }
        oprnd.unit = unit
        oprnd.dtype = dt.MAP + dt.RATIONAL + dt.QUANTITY
        oprnd.value.data = {
          plain: oprnd.value.data,
          inBaseUnits: map.convertToBaseUnits(oprnd.value.data, unit.gauge, unit.factor)
        }
      }
      return [oprnd.value, unit, oprnd.dtype,
        DataFrame.display(oprnd.value, "h3", formats.decimalFormat) + "\\;" + unitDisplay]
    }

  } else if (complexRegEx.test(str)) {
    // str is a complex number.
    const resultDisplay = parse(str, formats)
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

  } else if (dateRegEx.test(str)) {
    const rnlDate = [BigInt(dateInSecondsFromIsoString(str)), BigInt(1)];
    const dateTex = formatDate(rnlDate, formats.dateFormat)
    return [rnlDate, { expos: [0, 0, 1, 0, 0, 0, 0, 0] }, dt.DATE, dateTex]

  } else {
    const match = numberRegEx.exec(str)
    if (match) {
      // str begins with a number.
      const numStr = match[0];
      const unitStr = str.slice(numStr.length).trim()
      const [tex, rpn, _] = parse(numStr, formats, true)
      const oprnd = evalRpn(rpn, {}, formats, false, {})
      return literalWithUnit(oprnd, tex, unitStr)

    } else {
      // TODO: Preceding currency symbol, e.g., $25.20
      return [0, null, dt.ERROR, ""]
    }
  }
}

