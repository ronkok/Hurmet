// singleClickPreview.js

// A live, cursor-following preview of the shape that would be created if the
// user clicked right now, shown while a click-click tool (line, rect, oval,
// polygon) has a valid measurement typed into the input box — at that point
// clickClickTool.createFinalElement() takes over and the tool becomes a
// single-click tool (see sketch.js). Same idea as shapePreview.js's
// shape-library preview and moveTool.js's move/duplicate preview: a real SVG
// element appended to the temporary-layer, rebuilt on each pointermove.

import { createSvgElement } from './dwg.js'
import { createSingleClickElement } from './clickClickTool.js'
import { utils } from './utils.js'

const PREVIEW_OPACITY = 0.55
const eligibleTools = new Set(['line', 'rect', 'oval', 'polygon'])

let previewNode = null

const removePreview = () => {
  if (previewNode) { previewNode.remove() }
  previewNode = null
}

// Read the input box the same way sketch.js's click handler does, and report
// whether it currently holds a valid measurement for the active tool.
const readMeasurement = (appState, domRefs) => {
  if (appState.tool === 'polygon') {
    const [numSides, measurement] = utils.parsePolygonInput(domRefs.inputBox.textContent.trim(), appState)
    if (isNaN(numSides) || numSides < 3 || !(measurement[0] > 0)) { return null }
    appState.polygonSides = numSides
    return measurement
  }
  const [gotValidMeasurement, measurement] = utils.validateMeasurement(domRefs.inputBox, appState)
  return gotValidMeasurement ? measurement : null
}

export const singleClickPreview = Object.freeze({
  // Reposition/rebuild the preview for the current tool, input box, and
  // cursor position. Hides the preview if the tool isn't eligible or the
  // input box doesn't currently hold a valid measurement.
  update(modelPoint, appState, domRefs, dwg) {
    if (!eligibleTools.has(appState.tool)) {
      removePreview()
      return
    }
    const measurement = readMeasurement(appState, domRefs)
    if (!measurement) {
      removePreview()
      return
    }
    const element = createSingleClickElement(modelPoint, appState, dwg, domRefs, measurement)
    if (!element) {
      removePreview()
      return
    }
    removePreview()
    const node = createSvgElement(element)
    node.setAttribute('data-tool-preview', appState.tool)
    node.style.opacity = String(PREVIEW_OPACITY)
    node.style.pointerEvents = 'none'
    dwg.model.children[1].appendChild(node)
    previewNode = node
  },

  hide: removePreview
})
