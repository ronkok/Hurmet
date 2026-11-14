import { calculate } from "./calculate"

// A sketch node holds the source written by the Sketch dialog (src/sketch/).
// Every Sketch statement is also a `draw` statement, so Hurmet renders a sketch by
// running its source as the body of a draw() function, through the same compiler
// and draw.js methods that render a draw() calculation.
// Unlike a draw() calculation, a sketch is not redrawn by updateCalculations.

// Returns { svg, error }: the SVG tree that renderSVG writes, or an error message.
export const renderSketch = (source, formats) => {
  try {
    const result = calculate(`draw()\n${source}\nend`, {}, true, formats)
    return typeof result === "string"
      ? { svg: null, error: result }
      : { svg: result.resultdisplay, error: null }
  } catch (err) {
    // The node keeps its source either way, so the sketch can be reopened and fixed.
    return { svg: null, error: err.message }
  }
}

// The attrs of a sketch node, rendered with the document's number formats.
export const sketchAttrs = (source, doc) => {
  const formats = {
    decimalFormat: doc.attrs.decimalFormat,
    dateFormat: doc.attrs.dateFormat
  }
  const { svg, error } = renderSketch(source, formats)
  if (error) {
    // eslint-disable-next-line no-alert
    alert("Hurmet could not draw this sketch:\n" + error)
  }
  return { source, svg }
}
