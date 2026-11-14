// shapeThumbnail.js

// Renders a small preview <svg> for a shape-library entry, by parsing its
// "dwg" input string with the same parser "Edit source" uses (parseDwg).
// There is no separate stored thumbnail image — the geometry is small, so
// parsing it live is cheap.
//
// Shape-library convention: every shape is authored with its bottom-left
// corner at (0,0), and its library entry carries the resulting `width` and
// `height` (see the library JSON schema). That means the thumbnail's viewBox
// is just arithmetic on numbers already in hand — no need to attach the
// parsed elements to the document and measure them with getBBox(), which
// forces a synchronous layout per shape and would add up fast over a picker
// grid of many thumbnails.

import { parseShapeElements } from './shapeParse.js'
import { createSvgElement } from './dwg.js'

const SVG_NS = "http://www.w3.org/2000/svg"

// Build a small <svg> preview of a shape, or null if it fails to parse into
// any elements, or has no valid width/height.
export function buildShapeThumbnail(entry) {
  const elements = parseShapeElements(entry.dwg)
  if (elements.length === 0) { return null }
  const { width, height } = entry
  if (!(width > 0) || !(height > 0)) { return null }

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'shape-thumbnail')
  // createSvgElement() writes a text element's font-size as
  // `calc(<size> / var(--scale))` — Sketch's way of keeping text legible as
  // the live canvas is zoomed (see dwg.js). --scale only exists as an inline
  // style on .active-sketch, so it's undefined here; set it locally to 1 (a
  // thumbnail isn't zoomed, so "no compensation" is exactly the right value)
  // rather than leave font-size resolving to an inherited fallback.
  svg.style.setProperty('--scale', '1')
  // Same reasoning for --total-scale, which dwg.js's createPatternDef reads
  // (via getCurrentScale) to size each fill-pattern def's patternTransform
  // so it stays a constant apparent size regardless of the live drawing's
  // scale/zoom — not applicable to a thumbnail, so 1 (no compensation) here.
  svg.style.setProperty('--total-scale', '1')
  // A defs local to this thumbnail, so fill-pattern defs (see dwg.js's
  // ensureFillPatternDef) never get written into the live drawing.
  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(defs)

  const g = document.createElementNS(SVG_NS, 'g')
  g.setAttribute('transform', 'scale(1,-1)') // Match Sketch's y-up input convention.
  elements.forEach(el => g.appendChild(createSvgElement(el, defs)))
  svg.appendChild(g)

  // With the bottom-left-at-origin convention, the shape spans x:[0,width],
  // y:[0,height] before the y-flip above, so x:[0,width], y:[-height,0] after.
  const pad = Math.max(width, height) * 0.08 || 1
  svg.setAttribute('viewBox',
    `${-pad} ${-height - pad} ${width + 2 * pad} ${height + 2 * pad}`)
  return svg
}
