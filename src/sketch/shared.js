// shared.js

// Definitions that Sketch shares with Hurmet's draw() function (../draw.js).
// This module must not import anything or touch the DOM: draw.js also runs in
// Node, in the Hurmet CLI and in the unit tests.

// px per model unit, before the scene's scale is applied.
export const unitScaleFactors = Object.freeze({
  px: 1,
  in: 96,
  ft: 1152,       // 12 inches per foot
  'ft-in': 96,    // Model units are inches. Labels are written in feet & inches (feetInches.js).
  mile: 609600,   // 5280 feet per mile
  pt: 96 / 72,    // 1 point = 1/72 inch
  mm: 96 / 25.4,
  cm: 960 / 25.4,
  m: 96000 / 25.4,
  km: 96000000 / 25.4
})

// Line types. Dash lengths are in px.
export const dashMap = Object.freeze({
  solid: null,
  dashed: "12 6",
  dotted: "0 8",
  centerline: "12 6 3 6",
  border: "12 6 3 6 3 6" // Sync with menuListeners.js and stringify.js
})
export const linecapMap = Object.freeze({
  solid: null,
  dashed: null,
  dotted: "round",
  centerline: null,
  border: null
})

// The full set of recognized fill-pattern names, in menu order. "solid" means no pattern.
export const fillPatternNames = Object.freeze([
  'solid', 'diagonal', 'crosshatch', 'grid', 'dots', 'wood', 'sand', 'gravel', 'earth', 'concrete'
])

// Arrowhead markers are sized in stroke widths (markerUnits="strokeWidth"),
// which looks right only near the width each was drawn for. So the user just
// asks for "arrow" and Sketch picks the marker that suits the stroke width.
// Dimensions keep their own `dimarrow`, which is not part of this family.
export const arrowheadNames = new Set(['thinarrow', 'arrow', 'thickarrow', 'thickerarrow'])
export const arrowdotNames = new Set([...arrowheadNames].map(name => name + 'dot'))

// The marker statement value for a marker id: every arrowhead size is "arrow",
// every arrowdot size is "arrowdot". Any other id is its own value.
export const markerFamily = id => {
  return arrowheadNames.has(id) ? 'arrow' : arrowdotNames.has(id) ? 'arrowdot' : id
}

// A fill pattern's id includes its color. A <pattern> def can't take its color
// from the element that refers to it, so each pattern and color needs a def of its own.
export const sanitizeForId = str => String(str).replace(/[^a-zA-Z0-9]/g, '_')

// The `format` statement's rounding spec, and the `fraction` statement's denominators.
export const roundingSpecRegEx = /^[frh][1-6]$/
export const inchFractions = new Set([8, 16, 32, 64])

// A dot's label position. Unlike a text position, "leader" isn't allowed.
export const dotLabelPositionRegEx = /^(?:above|middle|below)?(?:left|right)?$/i

// SVG attributes for the Markdown marks allowed in text.
export const markAttribute = Object.freeze({
  em:          ["font-style", "italic"],
  strong:      ["font-weight", "bold"],
  code:        ["font-family", "monospace"],
  strikethru:  ["text-decoration", "line-through"],
  subscript:   ["font-size", "0.8em"],
  superscript: ["font-size", "0.8em"]
})
