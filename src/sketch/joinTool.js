import { adjustForSnapAndLock, nearestElementAndSegment, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { recordHistory } from './history.js'
import { utils } from './utils.js'

/* The join tool trims two line-like segments to their intersection point.
 * It only moves the endpoints of segments, never changing the middle of a segment.
 * The event code (seen elsewhere) filters out non-line segments, so this tool
 * can assume it is always working with lines or paths, not circles, arcs, or Bezier curves.
 */

const segmentToLine = (segment) => {
  if (!segment) return null

  if (segment.type === 'lineSegment' &&
      Number.isFinite(segment.x1) && Number.isFinite(segment.y1) &&
      Number.isFinite(segment.x2) && Number.isFinite(segment.y2)) {
    return { x1: segment.x1, y1: segment.y1, x2: segment.x2, y2: segment.y2 }
  }

  return null
}

const isFinitePoint = (p) =>
  !!p && Number.isFinite(p.x) && Number.isFinite(p.y)

const getSegmentEndpointsFromElement = (element, segment) => {
  if (!element || !segment) return null

  if (element.tag === 'line') {
    const a = { x: element.attrs.x1, y: element.attrs.y1 }
    const b = { x: element.attrs.x2, y: element.attrs.y2 }
    return { a, b, kind: 'line', aIndex: 0, bIndex: 1 }
  }

  if (element.tag === 'path' && !element.attrs['data-freehand']) {
    // In snap.js, segments are pushed in the same loop as points:
    // segment index i corresponds to points[i] -> points[i+1]
    // (Freehand excluded: its segments are sampled curve chords, not
    // vertex-to-vertex, so this index correspondence doesn't hold — see
    // selectTool.js, which already keeps freehand unselectable while joining.)
    const segIndex = (element.segments || []).indexOf(segment)
    if (segIndex < 0) return null
    const pts = element.points || []
    if (!pts[segIndex] || !pts[segIndex + 1]) return null
    return { a: pts[segIndex], b: pts[segIndex + 1], kind: 'path', aIndex: segIndex, bIndex: segIndex + 1 }
  }

  return null
}

const moveEndpointToIntersection = (dwg, element, segment, intersection, clickPoint) => {
  if (!dwg || !element || !segment || !isFinitePoint(intersection)) return
  const id = element?.attrs?.id
  if (!id) return

  // Only handle line-like snap segments.
  if (segment.type !== 'lineSegment') return

  const info = getSegmentEndpointsFromElement(element, segment)
  if (!info) return

  const a = { x: info.a.x, y: info.a.y }
  const b = { x: info.b.x, y: info.b.y }

  // Keep the part of the segment on the clicked side of the intersection, i.e.
  // move the end that lies beyond the intersection, as seen from the click.
  // Projecting onto a->b handles both trimming and extending. (Proximity of the
  // click to an end does not: clicking a short piece that lies past the
  // intersection is nearer the end that should be kept.)
  let moveA
  if (isFinitePoint(clickPoint)) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const tClick = (clickPoint.x - a.x) * dx + (clickPoint.y - a.y) * dy
    const tInt = (intersection.x - a.x) * dx + (intersection.y - a.y) * dy
    moveA = tClick > tInt
  } else {
    moveA = utils.distance(a, intersection) < utils.distance(b, intersection)
  }

  if (info.kind === 'line') {
    const newAttrs = moveA
      ? { x1: intersection.x, y1: intersection.y }
      : { x2: intersection.x, y2: intersection.y }

    dwgMgr.reviseAttributesOfChild(dwg, id, newAttrs)
    return
  }

  if (info.kind === 'path') {
    const idx = moveA ? info.aIndex : info.bIndex
    const oldPoints = element.points || []
    if (!oldPoints[idx]) return

    // Copy points, preserving any extra fields (notably r).
    const newPoints = oldPoints.slice()
    newPoints[idx] = { ...newPoints[idx], x: intersection.x, y: intersection.y }

    // Update DOM geometry (d) + virtual points, then re-add snap points.
    const newAttrs = { d: utils.pointsToD(newPoints) }
    dwgMgr.reviseAttributesOfChild(dwg, id, newAttrs, newPoints)
  }
}

const clearSelection = (appState, domRefs) => {
  if (appState.selection.length > 0) {
    appState.selection.forEach(selEl => {
      const domElement = domRefs.model.querySelector(`[data-id='${selEl.attrs.id}']`)
      if (domElement) {
        domElement.classList.remove('selected')
      }
    })
    appState.selection.length = 0
    appState.selection = []
  }
}

export const joinTool = Object.freeze({
  firstClick(event, appState, dwg) {
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    if (modelPoint === null) return

    const [element, segment, segIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
    if (!element || !segment) return

    appState.firstclick = [element, segment, modelPoint]
  },

  execute(event, appState, domRefs, dwg) {
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    if (modelPoint === null) return

    const first = appState.firstclick
    if (!first || first.length < 3) return
    const [firstElement, firstSegment, firstModelPoint] = first

    const [secondElement, secondSegment, secondSegIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
    if (!secondElement || !secondSegment) return

    if (secondElement.tag === 'path' && secondSegIndex !== 0 && secondSegIndex !== secondElement.segments.length - 1) {
      // For paths, only allow clicking on the first or last segment.
      return
    }

    const line1 = segmentToLine(firstSegment)
    const line2 = segmentToLine(secondSegment)
    if (!line1 || !line2) return

    const intersection = utils.lineLineIntersection(line1, line2, false)
    if (!intersection || !isFinitePoint(intersection)) return

    moveEndpointToIntersection(dwg, firstElement, firstSegment, intersection, firstModelPoint)
    moveEndpointToIntersection(dwg, secondElement, secondSegment, intersection, modelPoint)
    domRefs.model.querySelector(`[data-id='${firstElement.attrs.id}']`).classList.remove('selected')
    clearSelection(appState, domRefs)
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
  },

  cancel(domRefs, dwg, appState) {
    utils.clearLocalCoords(domRefs)
    dwgMgr.popRubberBand(dwg, appState)
    if (appState.firstclick) {
      const firstElement = appState.firstclick[0];
      appState.firstclick = null
      clearSelection(appState, domRefs)
    }
  }
})