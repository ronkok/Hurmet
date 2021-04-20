import { dt } from "./constants"
import { propertyFromDotAccessor } from "./property"
import { isMatrix } from "./matrix"
import { errorOprnd } from "./error"
import { formatResult } from "./result"

/*
 *  This module receives a TeX template string and a object containing Hurmet variables.
 *  At each location where the template contains a variable, this module plugs in a TeX string
 *  for display in the Hurmet blue echo..
 */

const varRegEx = /〖[^〗]*〗/
const openParenRegEx = /([([{|‖]|[^\\][,;:])$/

export const plugValsIntoEcho = (str, vars, unitAware, formatSpec, decimalFormat) => {
  // For each variable name in the echo string, substitute a value.
  // The parser surrounded those names with 〖〗 delimiters.
  let match
  while ((match = varRegEx.exec(str)) !== null) {
    const varName = match[0].replace(/[〖〗()]/g, "").trim().replace(/'/g, "′")
    const matchLength = match[0].length
    const pos = match.index
    let hvar

    if (varName.indexOf(".") > -1) {
      // Object with a dot accessor.
      const names = varName.split(".")
      const parentName = names[0]
      if (!vars[parentName]) { return errorOprnd("V_NAME", parentName) }
      hvar = vars[parentName]
      for (let i = 1; i < names.length; i++) {
        const propName = names[i].replace("}", "").replace("\\mathrm{", "").trim()
        const indexOprnd = { value: propName, unit: null, dtype: dt.STRING }
        hvar = propertyFromDotAccessor(hvar, indexOprnd, vars, unitAware)
        if (!hvar) { return errorOprnd("V_NAME", propName) }
        const stmt = { resulttemplate: "@", altresulttemplate: "@" }
        hvar.resultdisplay = formatResult(stmt, hvar, formatSpec, decimalFormat).resultdisplay
      }
    } else if (!vars[varName] && varName === "T") {
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

    if (unitAware) {
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

