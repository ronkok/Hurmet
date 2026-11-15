// Read-only lookups into the virtual drawing (see the layout notes in dwg.js).
// They live here, with no imports, so that snap.js can read the drawing
// without importing dwg.js, which itself imports snap.js to keep each
// element's snap points current.

// The drawing elements: dwg.children[2].children[0].children.
export const getChildren = dwg => dwg.children[2].children[0].children

// The current rubber-band (temporary) element, or null.
export const getTemp = dwg => dwg.tempEl.length === 0 ? null : dwg.tempEl[dwg.tempEl.length - 1]
