// shapeParse.js

// Parses a shape-library entry's "dwg" string into virtual elements, reusing
// parseDwg — the same parser "Edit source" uses for a whole document. Shared
// by shapeThumbnail.js (a preview), shapePreview.js, and clickTools.js's
// 'library' case (an actual insert). parseDwg is virtual-only, so parsing a
// shape leaves the open drawing untouched.
import { parseDwg } from './parse.js'

export function parseShapeElements(dwgString) {
  let parsed
  try {
    parsed = parseDwg(dwgString || "", 0)
  } catch {
    return []
  }
  return parsed.children[2].children[0].children
}
