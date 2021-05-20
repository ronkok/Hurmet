import { dt, allZeros } from "./constants"
import { parse } from "./parser"
import { evalRpn } from "./evaluate"
import { Rnl } from "./rational"
import { parseFormatSpec } from "./format"
import { DataFrame } from "./dataframe"

const numberRegEx = new RegExp(Rnl.numberPattern)

export const valueFromLiteral = (str, name, decimalFormat) => {
  // Read a literal string and return a value
  // The return should take the form: [value, unit, dtype, resultDisplay]
  if (/^[({[].* to /.test(str)) {
    // str defines a quantity distribution, (a to b). That is handled by calculation.js.
    // This is not a valid literal.
    return [0, null, dt.ERROR, ""]

  } else if (str === "true" || str === "false") {
    return [Boolean(str), null, dt.BOOLEAN, `\\mathord{\\text{${str}}}`]

  } else if (/^'.+'/.test(str)) {
    // str is a QUANTITY
    const [tex, rpn] = parse(str, decimalFormat, true)
    const oprnd = evalRpn(rpn, {}, decimalFormat, false, {})
    const unit = (oprnd.dtype & dt.MAP) ? oprnd.unit : oprnd.unit.name
    return [oprnd.value, unit, oprnd.dtype + dt.QUANTITY, tex]

  } else if (/^\x22.+\x22/.test(str)) {
    // str contains text between quotation marks
    if (name === "format") {
      return parseFormatSpec(str.slice(1, -1).trim())
    } else {
      const tex = parse(str, decimalFormat)
      return [str, undefined, dt.STRING, tex]
    }

  } else if (/^\\[([]/.test(str)) {
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
    const unit = (oprnd.dtype & dt.MAP) ? oprnd.unit : oprnd.unit.map
    return [oprnd.value, unit, oprnd.dtype, tex]

  } else if (str.charAt(0) === "`") {
    // A CSV between back ticks.
    // Read the CSV into a data frame.
    const pos = str.indexOf('`', 1)
    str = str.slice(1, pos).trim()
    const dataFrame = DataFrame.dataFrameFromCSV(str, {})
    return [dataFrame.value, dataFrame.unit, dt.DATAFRAME,
      DataFrame.display(dataFrame.value, "h3", decimalFormat)]

  } else if (str.match(numberRegEx)) {
    // str is a number.
    const resultDisplay = parse(str, decimalFormat)
    return [Rnl.fromString(str), allZeros, dt.RATIONAL, resultDisplay]

  } else {
    return [0, null, dt.ERROR, ""]

  }
}

