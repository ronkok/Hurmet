import { insertOneHurmetVar } from "./insertOneHurmetVar"
import { prepareStatement } from "./prepareStatement"
import { improveQuantities } from "./improveQuantities"
import { evaluate } from "./evaluate"
import { scanModule } from "./module"
import { clone } from "./utils"

// This function is not used by the Hurmet.app page.
// It is provided for use by unit tests.
// If you are looking for the app's main calculation module, try evaluate.js.
export const calculate = (
  entry,
  vars = {},
  inDraftMode = false,
  decimalFormat = "1,000,000."
) => {
  let attrs = prepareStatement(entry, decimalFormat)
  improveQuantities(attrs, vars)
  if (attrs.rpn) {
    attrs = evaluate(clone(attrs), vars, decimalFormat)
  }
  if (attrs.name) {
    insertOneHurmetVar(vars, attrs)
  }
  return inDraftMode ? attrs.alt : attrs.tex
}

export const scan = entry => {
  return scanModule(entry, "1,000,000.")
}
