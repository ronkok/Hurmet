import { adjustForSnapAndLock, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { recordHistory } from './history.js'
import { updateLatestPointInElement } from './clickClickTool.js'

// Resize handles for a single selected image, rect, or line. The corners (or,
// for a line, endpoints) already recorded in the element's own snap points
// (see snap.js) double as drag handles — grabbing one starts a rubber-band
// preview that becomes the element's new geometry on release. Handles only
// appear when exactly one image/rect/line was selected by clicking it with
// the select tool (appState.selectedByClick) — not via a window-select or
// Select All, even if those happen to net exactly one such element, to avoid
// cluttering a multi-element selection with drag handles. They also appear
// only while the Select tool is active: under Rotate, Move, Mirror, etc. the
// element stays selected (blue) but its handles are hidden and can't be
// grabbed, so a click on a line's endpoint reaches that tool as a snap point
// (e.g. a rotation pivot) instead of starting a resize.
//
// Image resizing is aspect-locked (the rotate tool doesn't operate on images
// — see clickTools.js — so there's no rotation to reconcile the corners
// against either) and always drags from the opposite corner, matching its
// existing behavior. Rect resizing also drags from the opposite corner but
// is never aspect-locked — it freely reshapes to reach the cursor. Line
// resizing just drags the grabbed endpoint; the other endpoint's x/y attrs
// are left untouched so a directional marker (e.g. an arrowhead on x2/y2)
// stays on the end that wasn't moved.

const HANDLE_PICK_DISTANCE_PX = 8 // generous square around each corner, easier to grab than a line
const MIN_SIZE = 4 // model units; keeps a rect/image's width/height from collapsing to ~0
const MIN_LENGTH = 4 // model units; keeps a line from collapsing to ~0 length
const MARK_STROKE_WIDTH_PX = 8 // screen px; constant regardless of zoom (see cornerMark below)

// endPoints ordering from snap.js's 'rect'/'image' cases: 0 = bottom-left,
// 1 = bottom-right, 2 = top-right, 3 = top-left. This is each index's
// diagonally-opposite corner, i.e. the resize anchor.
const OPPOSITE_CORNER = [2, 3, 0, 1]

function selectedResizable(appState) {
  if (appState.tool !== 'select') { return null }
  if (appState.selection.length !== 1 || !appState.selectedByClick) { return null }
  const el = appState.selection[0]
  if (el.tag === 'image') { return { el, kind: 'image' } }
  if (el.tag === 'rect') { return { el, kind: 'rect' } }
  if (el.tag === 'line') { return { el, kind: 'line' } }
  return null
}

// Rubber-band box from `anchor` to `modelPoint`, constrained to `aspectRatio`
// (the image's original width / height): whichever axis moved further
// relative to the image's original size drives the resize, and the other
// axis is derived from `aspectRatio`. Used for image resizing only.
function computeRubberBand(anchor, modelPoint, aspectRatio) {
  const dx = modelPoint.x - anchor.x
  const dy = modelPoint.y - anchor.y
  let width = Math.abs(dx)
  let height = Math.abs(dy)
  if (width / aspectRatio >= height) {
    height = width / aspectRatio
  } else {
    width = height * aspectRatio
  }
  const x = dx >= 0 ? anchor.x : anchor.x - width
  const y = dy >= 0 ? anchor.y : anchor.y - height
  return { x, y, width, height }
}

// Free (non-aspect-locked) rect box from `anchor` to `modelPoint`, reusing
// the same min/max math the rect drawing tool uses (clickClickTool.js).
function computeFreeRect(anchor, modelPoint) {
  const scratch = { attrs: {}, firstPoint: anchor }
  updateLatestPointInElement('rect', scratch, modelPoint)
  return scratch.attrs
}

// A round dot at `pt`, sized entirely by (non-scaling) stroke-width rather
// than by radius, so it stays a constant size on screen at any zoom without
// needing to be refreshed when the zoom changes — a zero-length `line` with
// a round linecap renders as a dot; a zero-radius `circle` would not render
// at all.
function cornerMark(pt) {
  return {
    tag: 'line',
    attrs: {
      x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y,
      stroke: '#0078d7',
      'stroke-width': MARK_STROKE_WIDTH_PX,
      'stroke-linecap': 'round',
      'pointer-events': 'none'
    }
  }
}

// Redraw the selected element's corner/endpoint marks (or clear them if the
// selection doesn't qualify, or the Select tool isn't active). Call whenever
// the selection, a selected element's geometry, or the active tool changes.
function refresh(appState, dwg) {
  dwgMgr.clearTempElements(dwg)
  const sel = selectedResizable(appState)
  if (!sel || !sel.el.endPoints) { return }
  sel.el.endPoints.forEach(pt => dwgMgr.pushTempElement(dwg, cornerMark(pt)))
}

// A live preview element styled like the real element being resized (so the
// rubber band shows its actual stroke/fill/pattern/markers), minus its id
// (the real element keeps that; the temp preview isn't in the drawing).
function previewAttrs(el) {
  const attrs = { ...el.attrs, 'pointer-events': 'none' }
  delete attrs.id
  return attrs
}

export const resizeHandle = Object.freeze({
  refresh,

  // Returns the grabbed corner/endpoint's index, or null if `event` isn't
  // near any handle of the currently-selected image/rect/line (or no single
  // such element is selected-by-click, or the Select tool isn't active). Safe
  // to call on every pointerdown, regardless of active tool.
  hitTest(event, appState, dwg) {
    const sel = selectedResizable(appState)
    if (!sel || !sel.el.endPoints) { return null }
    const S = appState.scaleFactor * appState.zoom
    const pickDistance = HANDLE_PICK_DISTANCE_PX / S
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    let best = null
    let bestDist = Infinity
    sel.el.endPoints.forEach((pt, i) => {
      const dist = Math.hypot(pt.x - modelPoint.x, pt.y - modelPoint.y)
      if (dist <= pickDistance && dist < bestDist) {
        best = i
        bestDist = dist
      }
    })
    return best
  },

  start(event, appState, dwg, index) {
    dwgMgr.popRubberBand(dwg, appState)
    const sel = selectedResizable(appState)
    const { el, kind } = sel
    if (kind === 'image') {
      const anchor = el.endPoints[OPPOSITE_CORNER[index]]
      appState._resizeState = {
        id: el.attrs.id,
        kind,
        anchor: { x: anchor.x, y: anchor.y },
        aspectRatio: el.attrs.width / el.attrs.height
      }
      dwgMgr.pushTemp(dwg, {
        tag: 'rect',
        attrs: {
          x: anchor.x, y: anchor.y, width: 0, height: 0,
          fill: 'rgba(0, 120, 215, 0.15)',
          stroke: '#0078d7',
          'stroke-dasharray': '4 2',
          'pointer-events': 'none'
        },
        firstPoint: { x: anchor.x, y: anchor.y }
      })
    } else if (kind === 'rect') {
      const anchor = el.endPoints[OPPOSITE_CORNER[index]]
      appState._resizeState = { id: el.attrs.id, kind, anchor: { x: anchor.x, y: anchor.y } }
      dwgMgr.pushTemp(dwg, {
        tag: 'rect',
        attrs: previewAttrs(el),
        firstPoint: { x: anchor.x, y: anchor.y }
      })
    } else if (kind === 'line') {
      const anchor = el.endPoints[1 - index]
      appState._resizeState = { id: el.attrs.id, kind, dragIndex: index, anchor: { x: anchor.x, y: anchor.y } }
      dwgMgr.pushTemp(dwg, {
        tag: 'line',
        attrs: previewAttrs(el),
        firstPoint: { x: anchor.x, y: anchor.y }
      })
    }
  },

  update(event, appState, dwg) {
    const st = appState._resizeState
    if (!st) { return }
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = dwgMgr.popRubberBand(dwg, appState)
    if (st.kind === 'image') {
      const rect = computeRubberBand(st.anchor, modelPoint, st.aspectRatio)
      element.attrs.x = rect.x
      element.attrs.y = rect.y
      element.attrs.width = rect.width
      element.attrs.height = rect.height
    } else if (st.kind === 'rect') {
      const rect = computeFreeRect(st.anchor, modelPoint)
      element.attrs.x = rect.x
      element.attrs.y = rect.y
      element.attrs.width = rect.width
      element.attrs.height = rect.height
    } else if (st.kind === 'line') {
      if (st.dragIndex === 0) {
        element.attrs.x1 = modelPoint.x
        element.attrs.y1 = modelPoint.y
      } else {
        element.attrs.x2 = modelPoint.x
        element.attrs.y2 = modelPoint.y
      }
    }
    dwgMgr.pushTemp(dwg, element)
  },

  finalize(event, appState, dwg) {
    const st = appState._resizeState
    if (!st) { return }
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    dwgMgr.popRubberBand(dwg, appState)
    if (st.kind === 'image') {
      const rect = computeRubberBand(st.anchor, modelPoint, st.aspectRatio)
      if (rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
        dwgMgr.reviseAttributesOfChild(dwg, st.id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }
    } else if (st.kind === 'rect') {
      const rect = computeFreeRect(st.anchor, modelPoint)
      if (rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
        dwgMgr.reviseAttributesOfChild(dwg, st.id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }
    } else if (st.kind === 'line') {
      const length = Math.hypot(modelPoint.x - st.anchor.x, modelPoint.y - st.anchor.y)
      if (length >= MIN_LENGTH) {
        const patch = st.dragIndex === 0
          ? { x1: modelPoint.x, y1: modelPoint.y }
          : { x2: modelPoint.x, y2: modelPoint.y }
        dwgMgr.reviseAttributesOfChild(dwg, st.id, patch)
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }
    }
    refresh(appState, dwg)
    delete appState._resizeState
  },

  cancel(domRefs, dwg, appState) {
    dwgMgr.popRubberBand(dwg, appState)
    delete appState._resizeState
  }
})
