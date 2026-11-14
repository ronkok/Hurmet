import { dwgMgr } from './dwg.js'
import { elementObject } from './elementObject.js'
import { recordHistory } from './history.js'
import { simplifyPoints } from './freehandMath.js'

// The freehand tool. Unlike snap-aware tools, a hand-drawn stroke should
// track the raw pointer path, not jump to the grid or nearby geometry — so
// this converts screen to model coordinates directly rather than going
// through adjustForSnapAndLock.
const toModelPoint = (event, appState) => {
  const S = appState.scaleFactor * appState.zoom
  return {
    x: event.offsetX / S - appState.deltaOriginX,
    y: (appState.height - event.offsetY) / S - appState.deltaOriginY
  }
}

// Live preview while dragging is a plain polyline through the raw captured
// points — cheap to rebuild every pointermove. The smooth Bezier fit only
// happens once, in finalize(), on the much smaller simplified point set.
const previewAttrs = appState => ({
  points: '',
  stroke: appState.stroke,
  'stroke-width': appState.strokewidth,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  fill: 'none'
})

const pointsToPolylineAttr = points => points.map(p => `${p.x},${p.y}`).join(' ')

// Model-unit tolerance for simplify-js's Douglas-Peucker pass (see
// freehandMath.js). Small enough to keep curves faithful to the drawn
// stroke, large enough to meaningfully cut point count on longer strokes.
const SIMPLIFY_TOLERANCE = 1.0

// Touch and pen drags are also fragile if the pointer strays outside the
// element that's tracking them mid-stroke (easy to do with a fast freehand
// gesture near the canvas edge) — pointer capture keeps every subsequent
// event for this pointerId routed to the same target regardless. Wrapped in
// try/catch since releasing an id the browser already released on its own
// (e.g. after pointercancel) throws in some browsers.
const capturePointer = event => {
  try { event.target.setPointerCapture(event.pointerId) } catch { /* not critical */ }
}
const releasePointer = event => {
  try { event.target.releasePointerCapture(event.pointerId) } catch { /* not critical */ }
}

export const freehandTool = Object.freeze({
  start(event, appState, dwg) {
    capturePointer(event)
    const modelPoint = toModelPoint(event, appState)
    appState.freehandPoints = [modelPoint]
    const attrs = previewAttrs(appState)
    attrs.points = pointsToPolylineAttr(appState.freehandPoints)
    dwgMgr.pushTemp(dwg, { tag: 'polyline', attrs })
  },
  update(event, appState, dwg) {
    const modelPoint = toModelPoint(event, appState)
    const points = appState.freehandPoints
    const lastPoint = points[points.length - 1]
    if (lastPoint.x === modelPoint.x && lastPoint.y === modelPoint.y) { return }
    points.push(modelPoint)
    dwgMgr.popRubberBand(dwg, appState)
    const attrs = previewAttrs(appState)
    attrs.points = pointsToPolylineAttr(points)
    dwgMgr.pushTemp(dwg, { tag: 'polyline', attrs })
  },
  finalize(event, appState, dwg) {
    releasePointer(event)
    dwgMgr.popRubberBand(dwg, appState)
    const rawPoints = appState.freehandPoints
    appState.freehandPoints = null
    if (!rawPoints || rawPoints.length === 0) { return }
    const points = rawPoints.length < 3 ? rawPoints : simplifyPoints(rawPoints, SIMPLIFY_TOLERANCE)
    const args = [points.map(p => [p.x, p.y])]
    const element = elementObject('freehand', args, appState)
    dwgMgr.pushChild(dwg, element)
    recordHistory(element, dwg)
  },
  cancel(domRefs, dwg, appState) {
    dwgMgr.popRubberBand(dwg, appState)
    appState.freehandPoints = null
    domRefs.canvas.style.cursor = 'default'
  }
})
