import { dwgMgr } from './dwg.js'
import { adjustForSnapAndLock } from './snap.js'

// Module for creating "image" elements: engineers dropping a screenshot or
// diagram into a sketch, either via the Insert Image palette button (type a
// URL, then click to place) or Ctrl-V paste from the clipboard.

// SVG <image> elements support only these three formats.
export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/svg+xml'])

// The model group (see dwg.js's `matrix(1,0,0,-1,0,500)`) flips everything
// vertically so the model behaves as y-up. Rect/circle/etc. don't care
// because they're symmetric, but an image's pixel content is not, so we
// counter the flip locally with `transform-box: fill-box` (origin at the
// image's own center, independent of its x/y position) plus `scaleY(-1)`.
// x/y/width/height on the element stay plain true-model coordinates, the
// same convention `rect` uses (y = bottom edge, y + height = top edge) —
// which is also why the move tool's existing rect/image case needs no
// changes to translate an image.
//
// `rotation` (degrees) and `mirrored` (bool) are bookkeeping fields (not
// DOM attrs) recording the image's current orientation so repeated
// rotate/mirror operations compose correctly. They round-trip through
// stringify/parse. `rotation` is literally the argument passed to the local
// CSS `rotate()` function above, NOT a "visual" angle — the parent flip
// reverses the handedness of anything expressed in this pre-flip local
// frame, so a further visual CCW rotation by delta (the same sign
// convention as the orbit math elsewhere in the rotate tool, e.g. circle's
// cx/cy) moves `rotation` in the OPPOSITE direction while unmirrored, and
// the SAME direction once mirrored (mirroring reverses handedness again).
// The update rules (see mirror.js and clickTools.js's rotate case), derived
// from composing the parent flip with each operation's own rotation/
// reflection matrix:
//   rotate by delta (true-model, visual CCW degrees):
//     rotation += mirrored ? delta : -delta
//   mirror across a line at true-model (visual) angle alpha:
//     rotation += mirrored ? -2*alpha : 2*alpha ; mirrored = !mirrored
// `-webkit-user-drag: none` (plus the `draggable="false"` attr set below)
// disables the browser's native "drag this image" gesture. Without it, a
// window-select drag that passes over or ends on the image can be hijacked
// into an OS-level image drag partway through, silently breaking the
// pointermove/pointerup sequence the select tool listens for. No other
// element type in Sketch needs this — only raster/image content is
// natively draggable.
const NO_NATIVE_DRAG_STYLE = '-webkit-user-drag: none; user-select: none;'

export function computeImageStyle(rotation, mirrored) {
  const r = rotation || 0
  const flip = mirrored
    ? `transform: rotate(${r}deg)`
    : `transform: scaleY(-1) rotate(${r}deg)`
  return `transform-box: fill-box; transform-origin: center; ${flip}; ${NO_NATIVE_DRAG_STYLE}`
}

// Low-level constructor shared by creation (URL/paste) and history parsing.
// x, y is the bottom-left corner of the (unrotated) bounding box.
export function buildImageElement(x, y, width, height, href, rotation = 0, mirrored = false) {
  return {
    tag: 'image',
    attrs: {
      x, y, width, height, href,
      draggable: false, // Belt-and-suspenders alongside the CSS above.
      style: computeImageStyle(rotation, mirrored)
    },
    rotation,
    mirrored
  }
}

// Recompute an image element's `style` attribute after its rotation/mirrored
// bookkeeping has changed (used by the mirror and rotate tools).
export function refreshImageStyle(element) {
  element.attrs.style = computeImageStyle(element.rotation, element.mirrored)
}

function loadNaturalSize(href) {
  return new Promise((resolve, reject) => {
    const probe = new Image()
    probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight })
    probe.onerror = () => reject(new Error(`Could not load image from "${href}".`))
    probe.src = href
  })
}

// Size the image for insertion: use its natural pixel size directly unless
// that would dwarf the current view, in which case scale it down (preserving
// aspect ratio) to fit within a reasonable fraction of the visible sketch
// window.
function fitToViewport(naturalWidth, naturalHeight, appState) {
  const S = appState.scaleFactor * appState.zoom
  const maxModelDim = (Math.min(appState.width, appState.height) * 0.6) / S
  const largestDim = Math.max(naturalWidth, naturalHeight)
  const scale = largestDim > maxModelDim ? maxModelDim / largestDim : 1
  return { width: naturalWidth * scale, height: naturalHeight * scale }
}

// Returns the created element (so the caller can record history once it
// resolves), or undefined if the image failed to load.
async function placeAndCommit(href, anchorModelPoint, appState, dwg) {
  let naturalWidth, naturalHeight
  try {
    ;({ width: naturalWidth, height: naturalHeight } = await loadNaturalSize(href))
  } catch (e) {
    alert(e.message)
    return
  }
  const { width, height } = fitToViewport(naturalWidth, naturalHeight, appState)
  const x = anchorModelPoint.x - width / 2
  const y = anchorModelPoint.y - height / 2
  const element = buildImageElement(x, y, width, height, href)
  dwgMgr.pushChild(dwg, element)
  return element
}

// Center of the currently visible sketch window, in model coordinates.
// Mirrors the formula in snap.js's adjustForModel, but there's no pointer
// event to read offsetX/offsetY from (a paste has no click point), so the
// viewport's own center is used in their place.
function viewportCenterModelPoint(appState) {
  const S = appState.scaleFactor * appState.zoom
  return {
    x: (appState.width / 2) / S - appState.deltaOriginX,
    y: (appState.height - appState.height / 2) / S - appState.deltaOriginY
  }
}

export const image = Object.freeze({
  ALLOWED_MIME_TYPES: ALLOWED_IMAGE_MIME_TYPES,

  // Palette-button flow: the user typed a URL into the input box, then
  // clicked a point in the sketch to place it.
  createFromUrl(event, url, appState, dwg) {
    const anchorModelPoint = adjustForSnapAndLock(event, appState, dwg)
    return placeAndCommit(url, anchorModelPoint, appState, dwg)
  },

  // Ctrl-V flow: image bytes come off the clipboard as a data URL. There's
  // no click point, so the image is centered in the current view.
  createFromDataUrl(dataUrl, appState, dwg) {
    return placeAndCommit(dataUrl, viewportCenterModelPoint(appState), appState, dwg)
  }
})
