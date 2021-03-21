import { dt } from "./constants"
import { isMatrix } from "./matrix"
import { errorOprnd } from "./error"

/*
 *  This module receives a TeX template string and a object containing Hurmet variables.
 *  At each location where the template contains a variable, this module plugs in the value.
 *  Then it does the calculation, doing unit-compatibility checks along the way.
 *  It returns a result in two formats: (1) a TeX string that can be displayed and
 *  (2) numeric and unit data that can used for calculations by other cells.
 *
 */

const varRegEx = /〖[^〗]*〗/
const isRecordIsh = oprnd => ((oprnd.dtype & dt.DICT) || (oprnd.dtype & dt.MAP) ||
  (oprnd.dtype & dt.DATAFRAME))
const openParenRegEx = /([([{|‖]|[^\\][,;:])$/

export const plugValsIntoEcho = (str, vars, unitAware) => {
  // For each variable name in the echo string, substitute a value.
  // The parser surrounded those names with 〖〗 delimiters.
  let match
  while ((match = varRegEx.exec(str)) !== null) {
    const varName = match[0].replace(/[〖〗()]/g, "").trim().replace(/'/g, "′")
    let matchLength = match[0].length
    let pos = match.index
    let hvar
    if (!vars[varName] && varName === "T") {
      // Transposed matrix
      hvar = { dtype: dt.RATIONAL, resultdisplay: "\\text{T}" }
    } else if (varName === "e" && /^^/.test(str.slice(pos + 4).trim())) {
      // e^x
      str = str.substring(0, pos) + "e" + str.substring(pos + matchLength);
      continue
    } else if (!vars[varName]) {
      return errorOprnd("V_NAME", varName)
    } else {
      // Get a clone in order to avoid mutating the inner properties of vars.
      hvar = {
        dtype: vars[varName].dtype,
        resultdisplay: vars[varName].resultdisplay
      }
    }

    let displayVarNameOnly = false
    if ((isRecordIsh(hvar) || isMatrix(hvar) || (hvar.dtype & dt.STRING))
      && /^(?:\\left)?[.[]/.test(str.slice(pos + match[0].length).trim())) {
      // The variable is a dictionary, map, or data frame, followed by an index or key.
      // Display the name, not the value.
      displayVarNameOnly = true
      const posAtStartOfName = pos
      str = str.slice(0, pos) + "\\text{" + varName + "}" + str.slice(pos + matchLength)
      pos += varName.length + 7
      matchLength = pos - posAtStartOfName
      pos = posAtStartOfName
      continue
    }

    if (!hvar || !hvar.resultdisplay) {
      const insert = (varName) ? varName : "?"
      return errorOprnd("NULL", insert)
    } else if (hvar.error) {
      return errorOprnd("NULL", varName)
    }

    let needsParens = true // default
    if (isMatrix(hvar)) { needsParens = false }
    if (unitAware && (hvar.dtype & dt.QUANTITY)) { needsParens = true }

    let isParened = false // Is the match already nested inside parens?
    if (pos > 0) {
      const pStr = str.slice(0, pos).trim()
      if (openParenRegEx.test(pStr)) {
        const fStr = str.slice(pos + varName.length + 2).trim()
        isParened = fStr.length > 0 && /^([)|‖\]},;:]|\\right)/.test(fStr)
      } else if (/^\\begin{[bp]matrix}/.test(hvar.resultdisplay)) {
        isParened = /\\end{[bp]matrix}$/.test(hvar.resultdisplay)
      }
    }
    needsParens = needsParens && !isParened

    let display = ""

    if (displayVarNameOnly) {
      display = "\\text{" + varName + "}"
    } else if (unitAware) {
      display = needsParens ? "\\left(" + hvar.resultdisplay + "\\right)" : hvar.resultdisplay
    } else {
      let displaySansUnits = hvar.resultdisplay
      const posUnit = hvar.resultdisplay.lastIndexOf("{\\text{")
      if (posUnit > -1) {
        displaySansUnits = hvar.resultdisplay.slice(0, posUnit).trim()
        displaySansUnits = displaySansUnits.replace(/\\; *$/, "").trim()
      }
      display = needsParens ? "\\left(" + displaySansUnits + "\\right)" : displaySansUnits

    }
    str = str.substring(0, pos) + display + str.substring(pos + matchLength)
  }
  return str
}

