import { dt } from "./constants"
import { insertOneHurmetVar } from "./insertOneHurmetVar"
import { compile } from "./compile"
import { evaluate, evaluateDrawing } from "./evaluate"
import { clone } from "./utils"

// This function is not used by the hurmet.org page.
// It is provided for use by unit tests and by the demo box in the manual page.
// If you are looking for the app's main calculation module, try evaluate.js.
export const calculate = (
  entry,
  vars = {},
  inDraftMode = false,
  formats = { decimalFormat: "1,000,000.", dateFormat: "yyyy-mm-dd" }
) => {
  let attrs = compile(entry, formats)
  if (attrs.rpn) {
    attrs = evaluate(clone(attrs), vars, formats)
  } else if (attrs.dtype && attrs.dtype === dt.DRAWING) {
    attrs = evaluateDrawing(attrs, vars, formats)
  }
  if (attrs.name) {
    insertOneHurmetVar(vars, attrs)
  }
  return attrs.dtype && attrs.dtype === dt.DRAWING
   ? attrs
   : inDraftMode
   ? attrs.alt
   : attrs.tex
}
