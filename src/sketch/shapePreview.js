// shapePreview.js

// A live, cursor-following preview of the currently-armed shape-library
// entry (see shapeLibrary.js), shown while the 'library' tool is active —
// the same idea as moveTool.js's move/duplicate preview. Built once per
// armed shape and repositioned on each pointermove via a single group
// transform, rather than re-parsed/rebuilt every frame.

import { createSvgElement } from './dwg.js'
import { shapeLibrary } from './shapeLibrary.js'
import { parseShapeElements } from './shapeParse.js'
import { scaleElement } from './menuHandlers.js'
import { utils } from './utils.js'
import { resolveUnit } from './unitAliases.js'

const PREVIEW_OPACITY = 0.55

let previewGroup = null
let scaledAnchor = null

const removePreview = () => {
  if (previewGroup) { previewGroup.remove() }
  previewGroup = null
  scaledAnchor = null
}

export const shapePreview = Object.freeze({
  // (Re)build the preview for whatever shape is currently armed — call this
  // whenever a shape becomes (re-)armed. Does nothing if nothing is armed,
  // or if it can't be built (unrecognized unit, empty/invalid geometry).
  show(dwg, appState) {
    removePreview()
    const armed = shapeLibrary.getArmedShape()
    if (!armed) { return }
    const { entry, unit } = armed
    const canonicalUnit = utils.unitScaleFactors[unit] ? unit : resolveUnit(unit)
    const libraryFactor = canonicalUnit && utils.unitScaleFactors[canonicalUnit]
    const sketchFactor = utils.unitScaleFactors[appState.unit]
    if (!libraryFactor || !sketchFactor) { return }
    const elements = parseShapeElements(entry.dwg)
    if (elements.length === 0) { return }

    const unitFactor = libraryFactor / sketchFactor
    const anchor = { x: (entry.anchor && entry.anchor[0]) || 0, y: (entry.anchor && entry.anchor[1]) || 0 }
    // Scaled about the origin (not the entry's own anchor) so the same
    // uniform-factor scale used at real insert time also gives us the
    // anchor's position within this preview's own coordinate space, via a
    // matching scale of the anchor point itself, below.
    scaledAnchor = { x: anchor.x * unitFactor, y: anchor.y * unitFactor }

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('data-tool-preview', 'library')
    g.style.opacity = String(PREVIEW_OPACITY)
    g.style.pointerEvents = 'none'
    // Hidden until moveTo() first positions it — otherwise it flashes at its
    // raw, unpositioned coordinates (typically near the drawing's origin)
    // for a moment before the next pointermove over the canvas moves it.
    g.style.display = 'none'
    elements.forEach(el => {
      g.appendChild(createSvgElement(scaleElement(el, unitFactor, { x: 0, y: 0 }, appState.scaleFactor)))
    })
    dwg.model.children[1].appendChild(g)
    previewGroup = g
  },

  // Reposition the preview so its anchor sits at `modelPoint`, and reveal it
  // if it was paused/just built. Does nothing if there's no active preview.
  moveTo(modelPoint) {
    if (!previewGroup || !scaledAnchor) { return }
    previewGroup.style.display = ''
    const dx = modelPoint.x - scaledAnchor.x
    const dy = modelPoint.y - scaledAnchor.y
    previewGroup.setAttribute('transform', `translate(${dx},${dy})`)
  },

  // Hide the preview without discarding it, e.g. while the pointer is off
  // the canvas — moveTo() reveals it again on the next real position update.
  pause() {
    if (previewGroup) { previewGroup.style.display = 'none' }
  },

  hide: removePreview
})
