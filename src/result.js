import { dt } from "./constants"
import { Rnl } from "./rational"
import { format } from "./format"
import { addTextEscapes } from "./utils"
import { Matrix, isMatrix } from "./matrix"
import { DataFrame } from "./dataframe"
import { map } from "./map"
import { Dictionary } from "./dictionary"

// A result has been sent here from evaluate.js or updateCalculations.js.
// Format the result for display.

export const formatResult = (stmt, result, formatSpec, decimalFormat, isUnitAware) => {
  if (result) {
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

      } else if (result.dtype === dt.DICT) {
        resultDisplay = Dictionary.display(result.value, formatSpec, decimalFormat)
        altResultDisplay = Dictionary.displayAlt(result.value, formatSpec, decimalFormat)

      } else if (isMatrix(result) && (result.dtype & dt.MAP)) {
        resultDisplay = Matrix.displayMapOfVectors(result.value, formatSpec, decimalFormat)
        altResultDisplay = Matrix.displayAltMapOfVectors(result.value,
          formatSpec, decimalFormat)

      } else if (isMatrix(result)) {
        resultDisplay = Matrix.display(
          isUnitAware ? { value: result.value.plain, dtype: result.dtype } : result,
          formatSpec,
          decimalFormat
        )
        altResultDisplay = Matrix.displayAlt(
          isUnitAware ? { value: result.value.plain, dtype: result.dtype } : result,
          formatSpec,
          decimalFormat
        )

      } else if (result.dtype === dt.DATAFRAME) {
        resultDisplay = DataFrame.display(result.value, formatSpec, decimalFormat)
        altResultDisplay = DataFrame.displayAlt(result.value, formatSpec, decimalFormat)

      } else if (result.dtype & dt.MAP) {
        resultDisplay = map.display(
          result.value.plain ? result.value.plain : result.value,
          formatSpec,
          decimalFormat
        )
        altResultDisplay = map.displayAlt(
          result.value.plain ? result.value.plain : result.value,
          formatSpec,
          decimalFormat
        )

      } else if (result.dtype & dt.STRING) {
        resultDisplay = "\\text{" + addTextEscapes(result.value) + "}"
        if (result.unit) { resultDisplay = `${result.unit}{${resultDisplay}}` }
        altResultDisplay = result.value

      } else if (result.dtype & dt.BOOLEAN) {
        resultDisplay = "\\text{" + result.value + "}"
        altResultDisplay = String(result.value)

      } else if (result.value.plain) {
        resultDisplay = format(result.value.plain, formatSpec, decimalFormat)
        if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
          resultDisplay = "\\color{firebrick}\\text{" + resultDisplay.value + "}"
          altResultDisplay = resultDisplay.value
        } else {
          altResultDisplay = resultDisplay.replace("{,}", ",")
        }

      } else if (Rnl.isRational(result.value)) {
        resultDisplay = format(result.value, formatSpec, decimalFormat)
        if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
          resultDisplay = "\\color{firebrick}\\text{" + resultDisplay.value + "}"
          altResultDisplay = resultDisplay.value
        } else {
          altResultDisplay = resultDisplay.replace("{,}", ",")
        }

      } else if (result.dtype === dt.IMAGE) {
        return stmt

      } else {
        resultDisplay = result.value
        altResultDisplay = resultDisplay

      }

      // Write the string to be plugged into echos of dependent nodes
      stmt.resultdisplay = stmt.resulttemplate.replace(/(\? *\??|@@?|%%?)/, resultDisplay)

      // Write the TeX for this node
      if (stmt.resulttemplate.indexOf("@") > -1) {
        stmt.tex = stmt.resultdisplay
        stmt.alt = stmt.altresulttemplate.replace(/@@?/, altResultDisplay)
      } else {
        stmt.tex = stmt.tex.replace(/[?%] *[?%]|[?%]/, resultDisplay)
        stmt.alt = stmt.alt.replace(/[?%] *[?%]|[?%]/, altResultDisplay)
      }
    }
  }
  return stmt
}
