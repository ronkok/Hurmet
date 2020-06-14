import { prepareStatement } from "./prepareStatement"
import { prepareResult } from "./prepareResult"
import { evaluate } from "./evaluate"
import { clone } from "./utils"
import { insertOneHurmetVar } from "./updateCalculations"

// This function is not used by the Hurmet.net page.
// It is provided for use by unit tests.
export const calculate = (
  entry,
  vars = {},
  inDraftMode = false,
  decimalFormat = "1,000,000."
) => {
  let attrs = prepareStatement(entry, decimalFormat)
  prepareResult(attrs, vars)
  if (attrs.rpn) {
    attrs = evaluate(clone(attrs), vars, decimalFormat)
  }
  if (attrs.name) {
    insertOneHurmetVar(vars, attrs)
  }
  return inDraftMode ? attrs.alt : attrs.tex
}
