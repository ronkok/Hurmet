// clipboard.js

// Cut, Copy, and Paste between Sketch instances, e.g. from one browser tab to
// another, through the system clipboard. sketch.js's copy/cut/paste listeners
// call this module. Only the browser's clipboard events are used (Ctrl+C/X/V),
// because reading the clipboard from a button click brings up a permission
// prompt or a "Paste" pop-up.
//
// The clipboard text is JSON in the shape-library format (see shapeLibrary.js):
// one entry whose "dwg" is the selected elements' source, moved so that their
// lower-left corner is at 0, 0, plus the sketch's unit. So a paste can reuse
// the shape-library insert, including its unit conversion.

import { dwgMgr } from './dwg.js'
import { stringifyElements } from './stringify.js'
import { selectedUnits, getSelectionBoundingBox } from './menuHandlers.js'
import { placeShapeElement } from './clickTools.js'
import { addSnapPoints } from './snap.js'

const VERSION = 1

export const clipboard = Object.freeze({
  // The clipboard text for the current selection, or null if nothing is selected.
  // Whole groups are copied, so a dimension label selected alone brings its dimension.
  buildPayload(appState, dwg) {
    const units = selectedUnits(appState, dwgMgr.getChildren(dwg))
    if (units.length === 0) { return null }
    const box = getSelectionBoundingBox(units, dwg)
    if (!box) { return null }
    const corner = { x: box.x, y: box.y }
    const moved = units.map(el => placeShapeElement(el, 1, corner, { x: 0, y: 0 }, appState.scaleFactor))
    // stringify reads a polygon's center and size from its snap points, which
    // are otherwise rebuilt only when an element is added to the drawing.
    moved.forEach(addSnapPoints)
    return JSON.stringify({
      sketchClipboard: VERSION,
      unit: appState.unit,
      contents: [{ name: "Pasted shapes", dwg: stringifyElements(moved), anchor: [0, 0] }]
    })
  },

  // The shape-library entry and unit in clipboard text, or null if the text
  // isn't something Sketch copied.
  readPayload(str) {
    if (!str) { return null }
    let payload
    try {
      payload = JSON.parse(str)
    } catch {
      return null
    }
    if (!payload || payload.sketchClipboard !== VERSION) { return null }
    const entry = Array.isArray(payload.contents) ? payload.contents[0] : null
    if (!entry || typeof entry.dwg !== 'string' || typeof payload.unit !== 'string') { return null }
    return { entry, unit: payload.unit }
  }
})
