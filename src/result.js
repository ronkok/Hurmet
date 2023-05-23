import { dt } from "./constants"
import { Rnl } from "./rational"
import { parse } from "./parser"
import { format } from "./format"
import { addTextEscapes, clone } from "./utils"
import { Matrix, isMatrix } from "./matrix"
import { DataFrame } from "./dataframe"
import { Tuple } from "./tuple"
import { Cpx } from "./complex"

// A result has been sent here from evaluate.js or updateCalculations.js.
// Format the result for display.

const numMisMatchError = _ => {
  const str = "Error. Mismatch in number of multiple assignment."
  return [`\\textcolor{firebrick}{\\text{${str}}}`, str]
}

export const formatResult = (stmt, result, formatSpec, decimalFormat, isUnitAware) => {
  if (!result) { return stmt }

  if (result.dtype === dt.DRAWING) {
    stmt.resultdisplay = result.value
    delete stmt.resultdisplay.temp
    return stmt
  }

  const numNames = !stmt.name
    ? 0
    : !Array.isArray(stmt.name)
    ? 1
    : stmt.name.length

  if (stmt.resulttemplate.indexOf("?") > -1 ||
      stmt.resulttemplate.indexOf("!") > -1 ||
      stmt.resulttemplate.indexOf("@") > -1 ||
      stmt.resulttemplate.indexOf("%") > -1) {
    stmt.value = result.value
    let resultDisplay = ""
    let altResultDisplay = ""
    if (stmt.resulttemplate.indexOf("!") > -1) {
      // Suppress display of the result
      resultDisplay = ""
      altResultDisplay = ""
      return stmt

    } else if (isMatrix(result)) {
      resultDisplay = Matrix.display((isUnitAware || result.value.plain)
          ? { value: result.value.plain, dtype: result.dtype }
          : result,
        formatSpec,
        decimalFormat
      )
      altResultDisplay = Matrix.displayAlt((isUnitAware || result.value.plain)
          ? { value: result.value.plain, dtype: result.dtype }
          : result,
        formatSpec,
        decimalFormat
      )

    } else if (result.dtype === dt.DATAFRAME) {
      if (numNames > 1 && numNames !== result.value.data.length) {
        [resultDisplay, altResultDisplay] = numMisMatchError()
      } else {
        const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1
        resultDisplay = DataFrame.display(result.value, formatSpec,
                                          decimalFormat, omitHeading)
        altResultDisplay = DataFrame.displayAlt(result.value, formatSpec, omitHeading)
      }

    } else if (result.dtype & dt.MAP) {
      let localValue
      if (isUnitAware || result.value.data.plain) {
        localValue = clone(result.value)
        localValue.data = result.value.data.plain
      } else {
        localValue = result.value
      }
      const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1
      resultDisplay = DataFrame.display(localValue, formatSpec, decimalFormat, omitHeading)
      altResultDisplay = DataFrame.displayAlt(localValue, formatSpec,
                                              decimalFormat, omitHeading)

    } else if (result.dtype === dt.TUPLE) {
      if (numNames > 1 && numNames !== result.length) {
        [resultDisplay, altResultDisplay] = numMisMatchError()
      } else {
        resultDisplay = Tuple.display(result.value, formatSpec, decimalFormat)
        altResultDisplay = Tuple.displayAlt(result.value, formatSpec)
      }

    } else if (result.dtype & dt.STRING) {
      resultDisplay = "\\text{" + addTextEscapes(result.value) + "}"
      if (result.unit) {
        // This is a hack to return a color
        resultDisplay = `\\textcolor{${result.unit}}{${resultDisplay}}`
      }
      altResultDisplay = result.value

    } else if (result.dtype & dt.RICHTEXT) {
      resultDisplay = parse(result.value, decimalFormat, false)
      altResultDisplay = result.value

    } else if (result.dtype & dt.BOOLEAN) {
      resultDisplay = "\\text{" + result.value + "}"
      altResultDisplay = String(result.value)

    } else if (result.dtype === dt.COMPLEX) {
      const z = result.value;
      [resultDisplay, altResultDisplay] = Cpx.display(z, formatSpec, decimalFormat)
/*        const complexSpec = /[j∠°]/.test(formatSpec) ? formatSpec.slice(-1) : "j"
      if (complexSpec === "j") {
        const real = format(z[0], formatSpec, decimalFormat)
        let im = format(z[1], formatSpec, decimalFormat)
        if (im.charAt(0) === "-") { im = "(" + im + ")" }
        resultDisplay = real + " + j" + im
        altResultDisplay = real + " + j" + im
      } else {
        const mag = Rnl.hypot(z[0], z[1])
        let angle = Cpx.argument(result.value)
        if (complexSpec === "°") {
          angle = Rnl.divide(Rnl.multiply(angle, Rnl.fromNumber(180)), Rnl.pi)
        }
        resultDisplay = format(mag, formatSpec, decimalFormat) + "∠" +
                        format(angle, formatSpec, decimalFormat) +
                        (complexSpec === "°" ? "°" : "")
        altResultDisplay = resultDisplay
      } */

    } else if (result.value.plain) {
      resultDisplay = format(result.value.plain, formatSpec, decimalFormat)
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\textcolor{firebrick}{\\text{" + resultDisplay.value + "}}"
        altResultDisplay = resultDisplay.value
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "")
      }

    } else if (Rnl.isRational(result.value)) {
      resultDisplay = format(result.value, formatSpec, decimalFormat)
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\\textcolor{firebrick}{\\text{" + resultDisplay.value + "}}"
        altResultDisplay = resultDisplay.value
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "")
      }

    } else if (result.dtype === dt.IMAGE) {
      return stmt

    } else {
      resultDisplay = result.value
      altResultDisplay = resultDisplay

    }

    // Write the string to be plugged into echos of dependent nodes
    stmt.resultdisplay = stmt.resulttemplate.replace(/(\? *\??|@ *@?|%%?)/, resultDisplay)

    // Write the TeX for this node
    if (stmt.resulttemplate.indexOf("@") > -1) {
      stmt.tex = stmt.resultdisplay
      stmt.alt = stmt.altresulttemplate.replace(/@@?/, altResultDisplay)
    } else if (stmt.resulttemplate.indexOf("?") > -1) {
      let pos = stmt.tex.lastIndexOf("?")
      stmt.tex = stmt.tex.slice(0, pos).replace(/\? *$/, "") + resultDisplay + stmt.tex.slice(pos + 1)
      pos = stmt.alt.lastIndexOf("?")
      stmt.alt = stmt.alt.slice(0, pos).replace(/\? *$/, "") + altResultDisplay + stmt.alt.slice(pos + 1)
    } else if (stmt.resulttemplate.indexOf("%") > -1) {
      let pos = stmt.tex.lastIndexOf("%")
      stmt.tex = stmt.tex.slice(0, pos).replace(/% *$/, "") + resultDisplay + stmt.tex.slice(pos + 1)
      pos = stmt.alt.lastIndexOf("%")
      stmt.alt = stmt.alt.slice(0, pos).replace(/% *$/, "") + altResultDisplay + stmt.alt.slice(pos + 1)
    }
  }
  return stmt
}
