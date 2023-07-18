import { unitTeXFromString } from "./utils"
import { format } from "./format"

const display = (tuple, formatSpec = "h3", decimalFormat = "1,000,000.") => {
  if (tuple.size === 0) { return "" }
  let str = "\\begin{array}{c}"

  let haveUnits = false
  for (const attrs of tuple.values()) {
    if (attrs.unit && attrs.unit.name) { haveUnits = true; break }
  }

  // Write the unit names
  if (haveUnits) {
    let rowTex = ""
    for (const attrs of tuple.values()) {
      if (attrs.unit && attrs.unit.name) {
        rowTex += unitTeXFromString(attrs.unit.name).replace("\\;\\, ", "")
      }
      rowTex += "&"
    }
    str += rowTex.slice(0, -1) + " \\\\ "
    str += "\\hline "
  }

  // Write the data
  let botRow = ""
  for (const attrs of tuple.values()) {
    botRow += format(attrs.value, formatSpec, decimalFormat) + " & "
  }
  str += botRow.slice(0, -1)
  str += "\\end{array}"
  return str
}

const displayAlt = (tuple, formatSpec = "h3") => {
  if (tuple.size === 0) { return "" }
  let str = "``"

  let haveUnits = false
  for (const attrs of tuple.values()) {
    if (attrs.unit && attrs.unit.name) { haveUnits = true; break }
  }

  // Write the unit names
  if (haveUnits) {
    let rowTex = ""
    for (const attrs of tuple.values()) {
      if (attrs.unit && attrs.unit.name) {
        rowTex += attrs.unit.name
      }
      rowTex += "\t"
    }
    str += rowTex.slice(0, -1) + "\n"
  }

  // Write the data
  let botRow = ""
  for (const attrs of tuple.values()) {
    botRow += format(attrs.value, formatSpec, "100000.") + "\t"
  }
  str += botRow.slice(0, -1)
  return str + "``"
}

export const Tuple = Object.freeze({
  display,
  displayAlt
})
