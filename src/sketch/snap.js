import { getChildren, getTemp } from './dwgAccess.js'
import {  utils } from './utils.js'
import { catmullRomToBezierSegments, bezierSegmentsToLineSegments } from './freehandMath.js'
import { isElliptical, ellipticalArcParams, ellipsePoint, isParamOnArc, lineArcIntersections } from './arcStep.js'

// snap.js. Tools for snapping and locking points

const ovalOrRect = ['oval', 'rect'];

// The point found by the most recent end/mid/centroid/nearest/intersection snap,
// or null if that call found none in range (or used another snap mode).
// Read by snapMarker.js to show the user where the next click will land.
let snapHit = null
export const getSnapHit = () => snapHit

// The point in `points` closest to modelPoint, if within snapDistance, else null.
const closestPoint = (points, modelPoint, snapDistance) => {
  let best = null
  let bestDist = snapDistance
  for (const point of points) {
    const dist = Math.hypot(point.x - modelPoint.x, point.y - modelPoint.y)
    if (dist < bestDist) {
      best = point
      bestDist = dist
    }
  }
  return best
}

// The point that perpendicular/tangent snaps and x/y locks measure from: the
// most recently clicked vertex of a polyline/arrow/arc rubber band, else firstPoint.
// (A polygon's points are its vertices, not clicks, so it keeps firstPoint, its center.)
const anchorPoint = element => {
  if (!element || !element.firstPoint) { return null }
  if (element.tag === 'path' && element.points && element.points.length > 0) {
    return element.points[element.points.length - 1]
  }
  return element.firstPoint
}

// Elements eligible to participate in 'intersection' snap. A freehand stroke
// approximates its curve with dozens/hundreds of tiny line segments (see the
// 'path' case in addSnapPoints below), and text's segments are just its
// bounding box -- neither is a meaningful "intersect with this" target.
// A segment, or for an elliptical arc step, the circular arcs that approximate it.
const withPieces = seg => seg.type === 'ellipticalArc' ? seg.pieces : [seg]

const isIntersectionCandidate = element =>
  element.tag !== 'text' && !(element.tag === 'path' && element.attrs['data-freehand'])

// A path is closed when its defining points loop back to the start (same
// check offset.js uses to decide whether to treat a path as a polygon); a
// polygon/rect/image's segments always wrap around back to their first point
// by construction (see addSnapPoints below).
const isClosedElement = element => {
  if (element.tag === 'polygon' || element.tag === 'rect' || element.tag === 'image') { return true }
  if (element.tag === 'path' && element.points && element.points.length > 1) {
    const first = element.points[0]
    const last = element.points[element.points.length - 1]
    return first.x === last.x && first.y === last.y
  }
  return false
}

// Intersection point(s) between two primitive segments (lineSegment, arc, or
// circle). circleCircleIntersections(), lineCircleIntersections() and
// pointOnArc() are defined further down this file; referencing them here is
// fine since this is only ever called after the module has finished loading.
const findSegmentIntersections = (seg1, seg2) => {
  // An elliptical arc step meets others through its approximating circular arcs.
  if (seg1.type === 'ellipticalArc') { return seg1.pieces.flatMap(piece => findSegmentIntersections(piece, seg2)) }
  if (seg2.type === 'ellipticalArc') { return seg2.pieces.flatMap(piece => findSegmentIntersections(seg1, piece)) }
  if (seg1.type === 'lineSegment' && seg2.type === 'lineSegment') {
    const pt = utils.lineLineIntersection(
      { x1: seg1.x1, y1: seg1.y1, x2: seg1.x2, y2: seg1.y2 },
      { x1: seg2.x1, y1: seg2.y1, x2: seg2.x2, y2: seg2.y2 },
      true // bounded
    )
    return pt ? [pt] : []
  }

  const isCircleLike = seg => seg.type === 'circle' || seg.type === 'arc'

  if (isCircleLike(seg1) && isCircleLike(seg2)) {
    const pts = circleCircleIntersections(
      seg1.cx, seg1.cy, Math.abs(seg1.r),
      seg2.cx, seg2.cy, Math.abs(seg2.r)
    )
    return pts.filter(pt =>
      (seg1.type !== 'arc' || pointOnArc(pt, seg1)) &&
      (seg2.type !== 'arc' || pointOnArc(pt, seg2))
    )
  }

  let circleLike = null
  let lineLike = null
  if (isCircleLike(seg1) && seg2.type === 'lineSegment') {
    circleLike = seg1
    lineLike = seg2
  } else if (isCircleLike(seg2) && seg1.type === 'lineSegment') {
    circleLike = seg2
    lineLike = seg1
  } else {
    return [] // Neither a recognized combination nor same-type non-circle/line (shouldn't occur).
  }

  const pts = lineCircleIntersections(
    { x: lineLike.x1, y: lineLike.y1 }, { x: lineLike.x2, y: lineLike.y2 },
    circleLike.cx, circleLike.cy, circleLike.r
  )
  return circleLike.type === 'arc' ? pts.filter(pt => pointOnArc(pt, circleLike)) : pts
}

// An element's own segment list can cross itself (a self-intersecting path
// or polygon). Consecutive segments (and, for a closed shape, the first and
// last) share an endpoint by construction -- that shared point satisfies
// both segments' equations, so it must be excluded or it would be reported
// as a spurious self-intersection at every vertex (a polygon corner, a
// path's line-into-arc joint, etc.). That's what 'end' snap is for.
const selfIntersections = element => {
  const segs = element.segments || []
  const n = segs.length
  if (n < 2) { return [] }
  const closed = isClosedElement(element)
  const points = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = j - i
      if (diff === 1) { continue } // consecutive: shares a joint
      if (closed && diff === n - 1) { continue } // wraparound: last shares a joint with first
      points.push(...findSegmentIntersections(segs[i], segs[j]))
    }
  }
  return points
}

// Every crossing between two different elements' segments. Unlike
// selfIntersections(), no adjacency filtering applies here -- two distinct
// elements never share a "joint" the way an element's own consecutive
// segments do.
const crossIntersections = (elA, elB) => {
  const points = []
  for (const segA of (elA.segments || [])) {
    for (const segB of (elB.segments || [])) {
      points.push(...findSegmentIntersections(segA, segB))
    }
  }
  return points
}

// Called right after addSnapPoints(element) whenever a single new element is
// added to the drawing (see dwg.js's pushChild/insertChildAfter/pushGroup/
// pushElement). O(current drawing size): compares the new element against
// every element already in the drawing, plus itself. The resulting points
// are stored only on the new element -- existing elements' intersectPoints
// are left untouched, since nothing about their own geometry changed.
export const addIntersectPointsForNewElement = (dwg, element) => {
  if (!isIntersectionCandidate(element)) {
    element.intersectPoints = []
    return
  }
  const points = selfIntersections(element)
  const others = getChildren(dwg).filter(el => el !== element && isIntersectionCandidate(el))
  for (const other of others) {
    points.push(...crossIntersections(element, other))
  }
  element.intersectPoints = points
}

// Called whenever an element is deleted or modified (its own geometry
// changed, or it was removed/replaced), since either can invalidate
// intersectPoints stored on other elements too. Recomputes every candidate
// element's intersectPoints from scratch. Each pair is only checked once:
// element[i]'s scan (i.e. j from i+1 on) covers its intersections with every
// later element, so those points are stored only on element[i], never on
// both.
export const rebuildIntersectPoints = dwg => {
  const elements = getChildren(dwg)
  elements.forEach(el => { el.intersectPoints = [] })
  const candidates = elements.filter(isIntersectionCandidate)
  for (let i = 0; i < candidates.length; i++) {
    const elA = candidates[i]
    elA.intersectPoints.push(...selfIntersections(elA))
    for (let j = i + 1; j < candidates.length; j++) {
      elA.intersectPoints.push(...crossIntersections(elA, candidates[j]))
    }
  }
}

export const adjustForModel = (event, appState, dwg) => {
  const S_model = appState.scaleFactor
  const S_zoom = appState.zoom
  const S = S_model * S_zoom
  const snapDistance = 10 / S // in model coordinates
  const deltaOriginX = appState.deltaOriginX
  const deltaOriginY = appState.deltaOriginY
  const modelPoint = {
    x: event.offsetX / S - deltaOriginX,
    y: (appState.height - event.offsetY) / S - deltaOriginY
  }
  return modelPoint
}

export const adjustForSnapAndLock = (event, appState, dwg) => {
  const S_model = appState.scaleFactor
  const S_zoom = appState.zoom
  const S = S_model * S_zoom
  const snapDistance = 10 / S // in model coordinates
  const deltaOriginX = appState.deltaOriginX
  const deltaOriginY = appState.deltaOriginY
  const modelPoint = {
    x: event.offsetX / S - deltaOriginX,
    y: (appState.height - event.offsetY) / S - deltaOriginY
  }

  // Apply snapping
  snapHit = null
  switch (appState.snap) {
    case 'none':
      // No snapping
      break
    case 'grid': {
      // Snap to grid
      const gridSize = appState.gridSize
      modelPoint.x = Math.round(modelPoint.x / gridSize) * gridSize
      modelPoint.y = Math.round(modelPoint.y / gridSize) * gridSize
      break
    }
    case 'end': {
      // Snap to nearest end point of existing lines, within 10 pixels
      const endPoints = getChildren(dwg).flatMap(child => child.endPoints || [])
      snapHit = closestPoint(endPoints, modelPoint, snapDistance)
      break
    }
    case 'mid': {
      // Snap to nearest mid point of existing lines, within 10 pixels
      const midPoints = getChildren(dwg).flatMap(child => child.midPoints || [])
      snapHit = closestPoint(midPoints, modelPoint, snapDistance)
      break
    }
    case 'centroid': {
      // Snap to nearest centroid of existing shapes, within 10 pixels
      const centroids = getChildren(dwg).flatMap(child => child.centroids || [])
      snapHit = closestPoint(centroids, modelPoint, snapDistance)
      break
    }
    case 'nearest': {
      // Snap to nearest point on existing lines, within 10 pixels
      const segments = getChildren(dwg).flatMap(child => child.segments || [])
      const closest = segments.reduce((closest, seg) => {
        const [dist, nearest] = pointToSegmentDistance(modelPoint, seg)
        if (dist < snapDistance && dist < closest.dist) {
          return { point: nearest, dist }
        } else {
          return closest
        }
      }, { dist: Infinity })
      if (closest.dist < snapDistance) {
        snapHit = closest.point
      }
      break
    }
    case 'perpendicular': {
      // Find the nearest line segment to the current modelPoint, within 10 pixels.
      // Snap to a point perpendicular to the extension of that line segment.
      const firstPoint = anchorPoint(getTemp(dwg))
      if (!firstPoint) break; // Need a first point to define the line
      const segments = getChildren(dwg).flatMap(child => child.segments || []).flatMap(withPieces)
      // Find the nearest point and the segment it lies on
      let minDist = Infinity
      let bestSeg = null
      let dist = 0
      let nearest = null
      for (const seg of segments) {
        ;[dist, nearest] = pointToSegmentDistance(modelPoint, seg)
        if (dist < minDist) {
          minDist = dist
          bestSeg = seg
        }
      }
      if (minDist < snapDistance && bestSeg) {
        if (bestSeg.type === 'lineSegment') {
          // Now, find the intersection of the perpendicular from firstPoint to the infinite line AB
          const A = { x: bestSeg.x1, y: bestSeg.y1 }
          const B = { x: bestSeg.x2, y: bestSeg.y2 }
          const AB = { x: B.x - A.x, y: B.y - A.y }
          const ab2 = AB.x * AB.x + AB.y * AB.y
          if (ab2 !== 0) {
            const AP = { x: firstPoint.x - A.x, y: firstPoint.y - A.y }
            const t = (AP.x * AB.x + AP.y * AB.y) / ab2
            const perp = { x: A.x + t * AB.x, y: A.y + t * AB.y }
            modelPoint.x = perp.x
            modelPoint.y = perp.y
          }
        } else if (bestSeg.type === 'circle' || bestSeg.type === 'arc') {
          // Find the line from firstPoint to the center of the circle
          const cx = bestSeg.cx
          const cy = bestSeg.cy
          const dx = firstPoint.x - cx
          const dy = firstPoint.y - cy
          const distToCenter = Math.hypot(dx, dy)
          if (distToCenter === 0) { break } // Avoid division by zero
          if (bestSeg.type === 'arc') {
            // Check that the perpendicular point lies within the arc angles.
            // (isAngleOnArc, since a CW arc's angles run the other way.)
            const angle = normalizeAngle(Math.atan2(dy, dx))
            if (!isAngleOnArc(bestSeg.startAngle, bestSeg.endAngle, bestSeg.r, angle)) {
              break // Perpendicular point is not on the arc
            }
          }
          // Find the point on the circle that is perpendicular to this line
          modelPoint.x = cx + (dx / distToCenter) * Math.abs(bestSeg.r)
          modelPoint.y = cy + (dy / distToCenter) * Math.abs(bestSeg.r)
        }
      }
      break
    }
    case 'tangent': {
      // Snap to a point on a circle or ellipse that is tangent to the line from firstPoint to modelPoint
      const firstPoint = anchorPoint(getTemp(dwg))
      if (!firstPoint) break; // Need a first point to define the line
      const segments = getChildren(dwg).flatMap(child => child.segments || []).flatMap(withPieces)
      // Find the nearest circle or ellipse to the current modelPoint
      let minDist = Infinity
      let bestSeg = null
      let dist = 0
      let nearest = null
      for (const seg of segments) {
        if (seg.type === 'circle' || seg.type === 'arc') { // Future: add ellipse
          ;[dist, nearest] = pointToSegmentDistance(modelPoint, seg)
          if (dist < minDist) {
            minDist = dist
            bestSeg = seg
          }
        }
      }
      if (minDist < snapDistance && bestSeg) {
        // Find the tangent point on the circle or ellipse from firstPoint
        const cx = bestSeg.cx
        const cy = bestSeg.cy
        if (bestSeg.type === 'circle' || bestSeg.type === 'arc') {
          const r = bestSeg.r || 0
          const rMag = Math.abs(r) // the geometry below needs the radius magnitude, not its CW/CCW sign
          const dx = firstPoint.x - cx
          const dy = firstPoint.y - cy
          const distToCenter = Math.hypot(dx, dy)
          if (distToCenter === 0) { break } // Avoid division by zero
          // Find the two tangent points from firstPoint to the circle or ellipse
          const angleDC = Math.atan2(dy, dx)
          const angleOffset = Math.acos(rMag / distToCenter)
          const angleT1 = angleDC + angleOffset
          const angleT2 = angleDC - angleOffset
          // Choose the tangent point closest to modelPoint
          const t1 = { x: cx + rMag * Math.cos(angleT1), y: cy + rMag * Math.sin(angleT1) }
          const t2 = { x: cx + rMag * Math.cos(angleT2), y: cy + rMag * Math.sin(angleT2) }
          if (bestSeg.type === 'arc') {
            // Check that the tangent points lie within the arc angles
            const normalizeAngle = angle => (angle + 2 * Math.PI) % (2 * Math.PI)
            const t1Angle = normalizeAngle(Math.atan2(t1.y - cy, t1.x - cx))
            const t2Angle = normalizeAngle(Math.atan2(t2.y - cy, t2.x - cx))
            const isT1OnArc = isAngleOnArc(bestSeg.startAngle, bestSeg.endAngle, r, t1Angle)
            const isT2OnArc = isAngleOnArc(bestSeg.startAngle, bestSeg.endAngle, r, t2Angle)
            if (!isT1OnArc && !isT2OnArc) {
              break // Neither tangent point is on the arc
            } else if (isT1OnArc && !isT2OnArc) {
              modelPoint.x = t1.x
              modelPoint.y = t1.y
              break
            } else if (!isT1OnArc && isT2OnArc) {
              modelPoint.x = t2.x
              modelPoint.y = t2.y
              break
            }
          }
          const dist1 = Math.hypot(t1.x - modelPoint.x, t1.y - modelPoint.y)
          const dist2 = Math.hypot(t2.x - modelPoint.x, t2.y - modelPoint.y)
          if (dist1 < dist2) {
            modelPoint.x = t1.x
            modelPoint.y = t1.y
          } else {
            modelPoint.x = t2.x
            modelPoint.y = t2.y
          }
        }
      }
      break
    }
    case 'intersection': {
      // Snap to the nearest precomputed intersection point, within
      // snapDistance. Points are maintained on each candidate element's
      // intersectPoints by addIntersectPointsForNewElement() and
      // rebuildIntersectPoints() (see dwg.js and their call sites) rather
      // than being searched for here, since a full pairwise segment search
      // is too expensive to redo on every pointermove.
      // Line and circle/arc (circles, path arcs, and ellipses, which are
      // approximated as 4 circular arcs -- see quasiEllipseSegments) can
      // intersect in any combination (see findSegmentIntersections);
      // freehand strokes and text are not candidates (see
      // isIntersectionCandidate).

      const points = getChildren(dwg).flatMap(child => child.intersectPoints || [])
      snapHit = closestPoint(points, modelPoint, snapDistance)
      break
    }
    default:
      console.warn("Unknown snap mode:", appState.snap)
  }
  if (snapHit) {
    modelPoint.x = snapHit.x
    modelPoint.y = snapHit.y
  }

  // Check for an oval tool or rect tool while the shift key is down
  if (ovalOrRect.includes(appState.tool) && event.shiftKey) {
    // Check if this is the second point of the element.
    const element = getTemp(dwg)
    if (element && element.firstPoint && element.tag == (appState.tool === 'oval' ? 'ellipse' : 'rect')) {
      // Constrain to circle or square
      const dx = modelPoint.x - element.firstPoint.x
      const dy = modelPoint.y - element.firstPoint.y
      const minDist = Math.min(Math.abs(dx), Math.abs(dy))
      modelPoint.x = element.firstPoint.x + minDist * Math.sign(dx)
      modelPoint.y = element.firstPoint.y + minDist * Math.sign(dy)
    }
  }

  // Apply lock
  switch (appState.lock) {
    case 'unlock':
      break
    case 'x': {
      const anchor = anchorPoint(getTemp(dwg))
      if (anchor) { modelPoint.y = anchor.y }
      break
    }
    case 'y': {
      const anchor = anchorPoint(getTemp(dwg))
      if (anchor) { modelPoint.x = anchor.x }
      break
    }
    default:
      console.warn("Unknown lock mode:", appState.lock)
  }
  return modelPoint
}

export const nearestElementAndSegment = (modelPoint, appState, dwg) => {
  const S_model = appState.scaleFactor
  const S_zoom = appState.zoom
  const S = S_model * S_zoom
  const snapDistance = 20 / S // in model coordinates
  const elements = getChildren(dwg)
  let closestDist = Infinity
  let closestEl = null
  let closestSeg = null
  let iSeg = 0
  // Search in reverse order (topmost elements first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    const segments = el.segments || [];
    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const [dist, _] = pointToSegmentDistance(modelPoint, seg)
      if (dist < snapDistance && dist < closestDist) {
        closestDist = dist
        closestEl = el
        closestSeg = seg
        iSeg = j
      }
    }
  }
  return [closestEl, closestSeg, iSeg];
};


const normalizeAngle = angle => {
  return (angle + 2 * Math.PI) % (2 * Math.PI);
}

export const lineCircleIntersections = (lineStart, lineEnd, cx, cy, r, bounded = true) => {
  // Returns an array of intersection points between the line segment and the circle.
  // If bounded is false, treats the line as infinite.
  const intersections = [];

  // Translate so the circle is centered at the origin.
  const x1 = lineStart.x - cx
  const y1 = lineStart.y - cy
  const x2 = lineEnd.x - cx
  const y2 = lineEnd.y - cy

  const dx = x2 - x1
  const dy = y2 - y1
  const dr2 = dx * dx + dy * dy
  const dr = Math.sqrt(dr2)
  if (dr === 0) { return [] }

  const D = x1 * y2 - x2 * y1
  const discriminant = r * r * dr2 - D * D

  if (discriminant < 0) {
    return []
  }

  const sqrtDisc = Math.sqrt(discriminant)
  const signDy = dy < 0 ? -1 : 1
  const absDy = Math.abs(dy)

  const denom = dr2
  const baseX = D * dy
  const baseY = -D * dx
  const offsetX = signDy * dx * sqrtDisc
  const offsetY = absDy * sqrtDisc

  const candidates = []

  // First ("+") solution
  candidates.push({
    x: (baseX + offsetX) / denom + cx,
    y: (baseY + offsetY) / denom + cy
  })

  // Second ("-") solution if not tangent
  if (discriminant > 0) {
    candidates.push({
      x: (baseX - offsetX) / denom + cx,
      y: (baseY - offsetY) / denom + cy
    })
  }

  const segDx = lineEnd.x - lineStart.x
  const segDy = lineEnd.y - lineStart.y

  candidates.forEach(pt => {
    // Parameter t along the line segment where 0 <= t <= 1.
    let t
    if (Math.abs(segDx) >= Math.abs(segDy)) {
      if (segDx === 0) { return }
      t = (pt.x - lineStart.x) / segDx
    } else {
      if (segDy === 0) { return }
      t = (pt.y - lineStart.y) / segDy
    }
    if (!bounded || (t >= 0 && t <= 1)) {
      intersections.push(pt)
    }
  })

  return intersections
}

// Returns 0, 1 (tangent), or 2 points where two full circles cross. Radii
// are taken as magnitudes -- callers pass Math.abs(seg.r), since an 'arc'
// segment's r can be signed for CW/CCW (see isAngleOnArc's comment above).
// Filtering a result down to an actual arc's angular span (rather than the
// full circle) is the caller's job, via pointOnArc.
export const circleCircleIntersections = (cx1, cy1, r1, cx2, cy2, r2) => {
  const dx = cx2 - cx1
  const dy = cy2 - cy1
  const d = Math.hypot(dx, dy)
  if (d === 0) { return [] } // concentric: no well-defined finite intersection set
  if (d > r1 + r2 || d < Math.abs(r1 - r2)) { return [] } // too far apart, or one nested inside the other

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h2 = r1 * r1 - a * a
  const h = h2 > 0 ? Math.sqrt(h2) : 0

  const px = cx1 + a * dx / d
  const py = cy1 + a * dy / d

  if (h < 1e-6) {
    // Tangent (or close enough, within floating-point noise): one point.
    return [{ x: px, y: py }]
  }
  return [
    { x: px + h * dy / d, y: py - h * dx / d },
    { x: px - h * dy / d, y: py + h * dx / d }
  ]
}

const eps = 1e-6
const eqPt = (a, b) => {
  return !!a && !!b && Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

// isAngleOnArc (below) is the authority on which way an arc actually sweeps
// -- CCW for r >= 0, CW for r < 0. Delegating to it here (rather than
// assuming CCW outright, as this used to) matters once callers can pass a
// path's own fillet-drawn CW arcs: without the sign of r, a CW arc's raw
// startAngle > endAngle would otherwise read as the reflex (270°-plus) arc
// instead of the actual, minor rendered one.
const pointOnArc = (pt, arc) => {
  const angle = normalizeAngle(Math.atan2(pt.y - arc.cy, pt.x - arc.cx))
  return isAngleOnArc(arc.startAngle, arc.endAngle, arc.r, angle)
}

// Is `angle` within the arc's angular span, from startAngle to endAngle?
// getCircularArcParams sets startAngle/endAngle to the raw angles of the arc's
// two endpoints from its center -- which of the two ways around the circle is
// actually the rendered arc depends on the sign of r (Sketch's stand-in for
// SVG's sweep-flag): CCW (increasing angle) for r >= 0, CW (decreasing angle)
// for r < 0. This must stay in sync with pointsToD()'s sweep-flag choice.
export const isAngleOnArc = (startAngle, endAngle, r, angle) => {
  if (r >= 0) {
    return (startAngle <= endAngle)
      ? (angle >= startAngle && angle <= endAngle)
      : (angle >= startAngle || angle <= endAngle)
  } else {
    return (startAngle >= endAngle)
      ? (angle <= startAngle && angle >= endAngle)
      : (angle <= startAngle || angle >= endAngle)
  }
}

export const lineEllipseIntersections = (lineStart, lineEnd, ellipse, bounded = true) => {
  // Exact intersections between a line segment and an ellipse element. Only
  // tools call this, once per click, so it needn't use the approximating
  // arcs that snapping does.
  const { cx, cy, rx, ry } = ellipse.attrs
  const whole = { cx, cy, rx, ry, angle: ellipse.angle || 0, t0: 0, sweep: 2 * Math.PI }
  return lineArcIntersections(lineStart, lineEnd, whole, bounded).map(({ x, y }) => ({ x, y }))
}

export const pointToSegmentDistance = (p, seg) => {
  if (seg.type === 'ellipticalArc') {
    // Use the circular arcs that approximate it (see ellipticalArcSegment).
    return seg.pieces.reduce((best, piece) => {
      const result = pointToSegmentDistance(p, piece)
      return result[0] < best[0] ? result : best
    }, [Infinity, null])
  }
  // Compute nearest point on line segment to point p
  if (seg.type === 'lineSegment') {
    const A = { x: seg.x1, y: seg.y1 }
    const B = { x: seg.x2, y: seg.y2 }
    const AB = { x: B.x - A.x, y: B.y - A.y }
    const AP = { x: p.x - A.x, y: p.y - A.y }
    const ab2 = AB.x * AB.x + AB.y * AB.y
    const ap_ab = AP.x * AB.x + AP.y * AB.y
    let t = ap_ab / ab2
    t = Math.max(0, Math.min(1, t)); // Clamp to segment
    const nearest = { x: A.x + t * AB.x, y: A.y + t * AB.y }
    const dist = Math.hypot(nearest.x - p.x, nearest.y - p.y)
    return [dist, nearest];
  } else if (seg.type === 'circle') {
    const dx = p.x - seg.cx
    const dy = p.y - seg.cy
    const distToCenter = Math.hypot(dx, dy)
    if (distToCenter === 0) return [Infinity, null]; // Avoid division by zero
    const nearest = {
      x: seg.cx + (dx / distToCenter) * seg.r,
      y: seg.cy + (dy / distToCenter) * seg.r
    }
    const dist = Math.hypot(nearest.x - p.x, nearest.y - p.y)
    return [dist, nearest];
  } else if (seg.type === 'arc') {
    // Compute nearest point on circular arc to point p
    const dx = p.x - seg.cx
    const dy = p.y - seg.cy
    if (Math.hypot(dx, dy) === 0) { return [Infinity, null] } // Avoid division by zero
    // Find angle from center to point p. Normalize angle to [0, 2π).
    const angle = normalizeAngle(Math.atan2(dy, dx))
    const nearest = { x: 0, y: 0 }
    const isOnArc = isAngleOnArc(seg.startAngle, seg.endAngle, seg.r, angle)
    if (isOnArc) {
      // Find point at intersection of arc with line at this angle
      nearest.x = seg.cx + Math.abs(seg.r) * Math.cos(angle)
      nearest.y = seg.cy + Math.abs(seg.r) * Math.sin(angle)
    } else {
      return [Infinity, null];
    }
    const dist = Math.hypot(nearest.x - p.x, nearest.y - p.y)
    return [dist, nearest];
  } else if (seg.type === 'ellipse') {
    // Currently not used. Instead, we use 4 circular arcs in quasiEllipseSegments().
    // That method is approximate. It's good for the update of a temporary element.
    // TODO: For the final snap point on an ellipse, we should switch to this.
    //       But first, this needs debugging and testing.
    // Approximate nearest point on ellipse to point p using iterative method
    const cx = seg.cx
    const cy = seg.cy
    const rx = seg.rx
    const ry = seg.ry
    let theta = Math.atan2(p.y - cy, p.x - cx)
    let nearest = {
      x: cx + rx * Math.cos(theta),
      y: cy + ry * Math.sin(theta)
    }
    // Refine using a few iterations of Newton's method
    for (let i = 0; i < 5; i++) {
      const dx = nearest.x - p.x
      const dy = nearest.y - p.y
      const dEllipse = ((nearest.x - cx) ** 2) / (rx ** 2) + ((nearest.y - cy) ** 2) / (ry ** 2) - 1
      const grad = {
        x: (2 * (nearest.x - cx)) / (rx ** 2),
        y: (2 * (nearest.y - cy)) / (ry ** 2)
      }
      const gradNorm2 = grad.x * grad.x + grad.y * grad.y
      if (gradNorm2 === 0) break; // Avoid division by zero
      const lambda = dEllipse / gradNorm2
      nearest.x -= lambda * grad.x
      nearest.y -= lambda * grad.y
    }
    const dist = Math.hypot(nearest.x - p.x, nearest.y - p.y)
    return [dist, nearest];
  }
  return [Infinity, null];
}

const getCircularArcParams = (points) => {
  if (!points || points.length < 2) return [null, null, null, null];
  const signedRadius = points[1].r
  // Given two path points {x,y,r}, where the SECOND point's r encodes arc radius and direction:
  //   r > 0 => CCW arc
  //   r < 0 => CW arc
  // Returns: [{x: cx, y: cy}, apex, startAngle, endAngle, radius]
  // Angles are returned as a CCW parameterization (so existing "pointOnArc" logic works).
  // radius is the signed radius actually used, which can be larger than r. See below.

  const A = { x: points[0].x, y: points[0].y }
  const B = { x: points[1].x, y: points[1].y }

  if (!Number.isFinite(signedRadius) || signedRadius === 0) {
    console.warn('getCircularArcParams: invalid arc radius (r).')
    return [null, null, null, null]
  }

  const isCCW = signedRadius > 0

  const dx = B.x - A.x
  const dy = B.y - A.y
  const q = Math.hypot(dx, dy)
  if (q === 0) {
    console.warn('getCircularArcParams: start/end points are identical.')
    return [null, null, null, null]
  }
  // A radius too short to reach from A to B, e.g. a semicircle whose source rounded
  // its radius down, is stretched to half the chord. That's what the browser does
  // when it draws the SVG arc, so the snap geometry matches what's on screen.
  const R = Math.max(Math.abs(signedRadius), q / 2)

  const TAU = 2 * Math.PI
  const norm = ang => (ang + TAU) % TAU
  const ccwDelta = (a, b) => (b - a + TAU) % TAU

  // Midpoint of chord AB
  const mx = (A.x + B.x) / 2
  const my = (A.y + B.y) / 2

  // Distance from midpoint to each circle center along perpendicular
  let h2 = R * R - (q * q) / 4
  if (h2 < 0) h2 = 0 // guard against tiny negative from floating point
  const h = Math.sqrt(h2)

  // Unit left-normal to chord AB
  const nx = -dy / q
  const ny = dx / q

  const C1 = { x: mx + h * nx, y: my + h * ny }
  const C2 = { x: mx - h * nx, y: my - h * ny }

  // Cross product (AB x AC): sign indicates which side of AB the center lies on.
  const crossFor = (C) => dx * (C.y - A.y) - dy * (C.x - A.x)

  let C = C1
  if (h > 1e-12) {
    const cross1 = crossFor(C1)
    // For CCW we want center on the "left" of AB => cross >= 0; for CW => cross <= 0.
    if (isCCW) {
      C = cross1 >= 0 ? C1 : C2
    } else {
      C = cross1 <= 0 ? C1 : C2
    }
  } else {
    // Tangent case: only one center (C1 == C2)
    C = C1
  }

  const startAngle = norm(Math.atan2(A.y - C.y, A.x - C.x))
  const endAngle = norm(Math.atan2(B.y - C.y, B.x - C.x))

  // The apex (visual midpoint) must walk from startAngle toward endAngle in
  // the arc's actual travel direction -- CCW (increasing angle) for r >= 0,
  // CW (decreasing angle) for r < 0 -- not always CCW, or it lands on the
  // wrong half of the circle for a CW arc.
  const delta = isCCW ? ccwDelta(startAngle, endAngle) : -ccwDelta(endAngle, startAngle)
  const midAngle = norm(startAngle + delta / 2)
  const apex = {
    x: C.x + R * Math.cos(midAngle),
    y: C.y + R * Math.sin(midAngle)
  }

  return [{ x: C.x, y: C.y }, apex, startAngle, endAngle, isCCW ? R : -R]
}

export const addSnapPoints = element => {
  // Add references to significant element points for use by function adjustForSnapAndLock().
  if (!element) return

  // Create arrays to hold snap points
  switch (element.tag) {
    case 'line':
      element.endPoints = [
        { x: element.attrs.x1, y: element.attrs.y1 },
        { x: element.attrs.x2, y: element.attrs.y2 }
      ];
      element.midPoints = [
        { x: (element.attrs.x1 + element.attrs.x2) / 2, y: (element.attrs.y1 + element.attrs.y2) / 2 }
      ];
      element.centroids = [
        { x: (element.attrs.x1 + element.attrs.x2) / 2, y: (element.attrs.y1 + element.attrs.y2) / 2 }
      ];
      // Add references to line segments, for use by 'nearest' and 'perpendicular' snap
      element.segments = [
        { type: 'lineSegment', x1: element.attrs.x1, y1: element.attrs.y1, x2: element.attrs.x2, y2: element.attrs.y2 }
      ];
      break
    case 'rect':
      element.endPoints = [
        { x: element.attrs.x, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y },
        { x: element.attrs.x, y: element.attrs.y }
      ];
      element.midPoints = [
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y },
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x, y: element.attrs.y + element.attrs.height / 2 },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y + element.attrs.height / 2 }
      ];
      element.centroids = [
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y + element.attrs.height / 2 }
      ];
      element.segments = [
        { type: 'lineSegment', x1: element.attrs.x, y1: element.attrs.y + element.attrs.height, x2: element.attrs.x + element.attrs.width, y2: element.attrs.y + element.attrs.height },
        { type: 'lineSegment', x1: element.attrs.x + element.attrs.width, y1: element.attrs.y + element.attrs.height, x2: element.attrs.x + element.attrs.width, y2: element.attrs.y },
        { type: 'lineSegment', x1: element.attrs.x + element.attrs.width, y1: element.attrs.y, x2: element.attrs.x, y2: element.attrs.y },
        { type: 'lineSegment', x1: element.attrs.x, y1: element.attrs.y, x2: element.attrs.x, y2: element.attrs.y + element.attrs.height }
      ];
      break
    case 'image':
      // Same corner/edge/center geometry as 'rect' (x, y is the bottom-left
      // corner). Note: these are the element's *unrotated* bounding box —
      // rotating an image is done with a CSS transform rather than by
      // rewriting x/y/width/height (see importImage.js), so snap points on a
      // rotated image will reflect its unrotated box, not its displayed one.
      element.endPoints = [
        { x: element.attrs.x, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y },
        { x: element.attrs.x, y: element.attrs.y }
      ];
      element.midPoints = [
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y },
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y + element.attrs.height },
        { x: element.attrs.x, y: element.attrs.y + element.attrs.height / 2 },
        { x: element.attrs.x + element.attrs.width, y: element.attrs.y + element.attrs.height / 2 }
      ];
      element.centroids = [
        { x: element.attrs.x + element.attrs.width / 2, y: element.attrs.y + element.attrs.height / 2 }
      ];
      element.segments = [
        { type: 'lineSegment', x1: element.attrs.x, y1: element.attrs.y + element.attrs.height, x2: element.attrs.x + element.attrs.width, y2: element.attrs.y + element.attrs.height },
        { type: 'lineSegment', x1: element.attrs.x + element.attrs.width, y1: element.attrs.y + element.attrs.height, x2: element.attrs.x + element.attrs.width, y2: element.attrs.y },
        { type: 'lineSegment', x1: element.attrs.x + element.attrs.width, y1: element.attrs.y, x2: element.attrs.x, y2: element.attrs.y },
        { type: 'lineSegment', x1: element.attrs.x, y1: element.attrs.y, x2: element.attrs.x, y2: element.attrs.y + element.attrs.height }
      ];
      break
    case 'ellipse': {
      const ecx = element.attrs.cx, ecy = element.attrs.cy
      // The ends of the major/minor axes, on the ellipse boundary — same
      // convention as circle's own cx±r/cy±r cardinal midpoints below.
      const rawMidPoints = [
        { x: ecx - element.attrs.rx, y: ecy },
        { x: ecx + element.attrs.rx, y: ecy },
        { x: ecx, y: ecy - element.attrs.ry },
        { x: ecx, y: ecy + element.attrs.ry }
      ];
      if (element.angle) {
        const δ = element.angle * Math.PI / 180
        const cosδ = Math.cos(δ), sinδ = Math.sin(δ)
        element.midPoints = rawMidPoints.map(pt => ({
          x: ecx + (pt.x - ecx) * cosδ - (pt.y - ecy) * sinδ,
          y: ecy + (pt.x - ecx) * sinδ + (pt.y - ecy) * cosδ
        }))
      } else {
        element.midPoints = rawMidPoints
      }
      element.endPoints = [];
      element.centroids = [
        { x: ecx, y: ecy }
      ];
      element.segments = quasiEllipseSegments(element)
      break
    }
    case 'circle':
      element.endPoints = [];
      element.midPoints = [
        { x: element.attrs.cx - element.attrs.r, y: element.attrs.cy },
        { x: element.attrs.cx + element.attrs.r, y: element.attrs.cy },
        { x: element.attrs.cx, y: element.attrs.cy - element.attrs.r },
        { x: element.attrs.cx, y: element.attrs.cy + element.attrs.r }
      ];
      element.centroids = [
        { x: element.attrs.cx, y: element.attrs.cy }
      ];
      element.segments = [
        { type: 'circle', cx: element.attrs.cx, cy: element.attrs.cy, r: element.attrs.r }
      ];
      break
    case 'polygon': {
      element.endPoints = element.points.map(pt => ({ x: pt.x, y: pt.y }))
      element.midPoints = [];
      element.points.forEach((pt, i) => {
        const nextPt = element.points[(i + 1) % element.points.length];
        element.midPoints.push({
          x: (pt.x + nextPt.x) / 2,
          y: (pt.y + nextPt.y) / 2
        })
      })
      const sum = element.points.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 })
      element.centroids = [
        { x: sum.x / element.points.length, y: sum.y / element.points.length }
      ];
      element.segments = [];
      for (let i = 0; i < element.points.length; i++) {
        const pt = element.points[i];
        const nextPt = element.points[(i + 1) % element.points.length];
        element.segments.push({
          type: 'lineSegment',
          x1: pt.x,
          y1: pt.y,
          x2: nextPt.x,
          y2: nextPt.y
        })
      }
      break
    }
    case 'path':
      if (element.attrs['data-freehand']) {
        // A freehand stroke's two real ends (where the drag started/ended)
        // are legitimate 'end'-snap targets, same as a line's endpoints —
        // but only those two points. 'end'-snap (see adjustForSnapAndLock's
        // 'end' case above) flat-scans every element's endPoints on every
        // pointermove, and a freehand stroke can sample into hundreds of
        // hit-test segments (below), so endPoints must NOT be built from
        // those samples the way segments/midPoints could be — that's what
        // caused a real perf regression previously. selectTool.js's
        // window-select also special-cases freehand to check segments
        // directly instead of endPoints, so this doesn't need to double as
        // window-select's containment list either.
        element.endPoints = [
          { x: element.points[0].x, y: element.points[0].y },
          { x: element.points[element.points.length - 1].x, y: element.points[element.points.length - 1].y }
        ];
        element.midPoints = [];
        element.centroids = [];
        element.segments = element.points.length < 2
          // A tap with no drag: pointToSegmentDistance needs a non-zero-length
          // segment (a true zero-length one divides by zero), so nudge the
          // second endpoint by a negligible amount — still selects like a point.
          ? [{ type: 'lineSegment', x1: element.points[0].x, y1: element.points[0].y, x2: element.points[0].x + 1e-6, y2: element.points[0].y }]
          : bezierSegmentsToLineSegments(catmullRomToBezierSegments(element.points))
        break
      }
    // Handle polylines and circular arcs, not Beziers.
      element.endPoints = [];
      element.midPoints = [];
      element.centroids = [];
      element.segments = [];
      const numPoints = element.points.length;
      for (let i = 0; i < numPoints - 1; i++) {
        element.endPoints.push({ x: element.points[i].x, y: element.points[i].y });
        if (element.points[i + 1].r === 0) {
          // It's a line segment
          element.midPoints.push({
            x: (element.points[i].x + element.points[i + 1].x) / 2,
            y: (element.points[i].y + element.points[i + 1].y) / 2
          });
          element.centroids.push({
            x: (element.points[i].x + element.points[i + 1].x) / 2,
            y: (element.points[i].y + element.points[i + 1].y) / 2
          });
          element.segments.push({
            type: 'lineSegment',
            x1: element.points[i].x,
            y1: element.points[i].y,
            x2: element.points[i + 1].x,
            y2: element.points[i + 1].y
          })
        } else {
          // It's an arc segment
          const radius = element.points[i + 1].r
          if (!isElliptical(radius)) {
            const [center, apex, startAngle, endAngle, r] = getCircularArcParams([element.points[i], element.points[i + 1]])
            element.midPoints.push({ x: apex.x, y: apex.y });
            element.centroids.push({ x: center.x, y: center.y });
            element.segments.push({
              type: 'arc',
              cx: center.x,
              cy: center.y,
              r,
              startAngle,
              endAngle
            })
          } else {
            const seg = ellipticalArcSegment(element.points[i], element.points[i + 1])
            element.centroids.push({ x: seg.cx, y: seg.cy })
            // Same midpoints as a whole ellipse: the ends of its axes, here
            // only those that lie on this step's arc. A step too short to
            // reach any of them falls back to the halfway point of its arc.
            let reachesApex = false
            for (const t of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
              if (seg.type !== 'ellipticalArc' || !isParamOnArc(seg, t, 1e-6)) { continue }
              reachesApex = true
              const apex = ellipsePoint(seg, t)
              if (element.midPoints.some(pt => Math.hypot(pt.x - apex.x, pt.y - apex.y) < 1e-6)) { continue }
              element.midPoints.push(apex)
            }
            if (!reachesApex) {
              element.midPoints.push(ellipsePoint(seg, seg.t0 + seg.sweep / 2))
            }
            element.segments.push(seg)
          }
        }
      }
      element.endPoints.push({ x: element.points[numPoints - 1].x, y: element.points[numPoints - 1].y });
      break
    case 'text':
      // element.boundingBox was created in text.js.
      // It contains { x, y, width, height } in model coordinates.
      const box = element.boundingBox;
      if (!box) {
        element.endPoints = [];
        element.midPoints = [];
        element.centroids = [];
        element.segments = [];
        break
      }
      element.endPoints = [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x, y: box.y + box.height },
        { x: box.x + box.width, y: box.y + box.height }
      ];
      element.midPoints = [
        { x: box.x + box.width / 2, y: box.y },
        { x: box.x + box.width / 2, y: box.y + box.height },
        { x: box.x, y: box.y + box.height / 2 },
        { x: box.x + box.width, y: box.y + box.height / 2 }
      ];
      element.centroids = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
      element.segments = [];
      element.segments.push({
        type: 'lineSegment',
        x1: box.x,
        y1: box.y,
        x2: box.x + box.width,
        y2: box.y
      });
      element.segments.push({
        type: 'lineSegment',
        x1: box.x + box.width,
        y1: box.y,
        x2: box.x + box.width,
        y2: box.y + box.height
      });
      element.segments.push({
        type: 'lineSegment',
        x1: box.x + box.width,
        y1: box.y + box.height,
        x2: box.x,
        y2: box.y + box.height
      });
      element.segments.push({
        type: 'lineSegment',
        x1: box.x,
        y1: box.y + box.height,
        x2: box.x,
        y2: box.y
      });
      break
    case 'image':
      // For now, ignore images
      element.endPoints = [];
      element.midPoints = [];
      element.centroids = [];
      element.segments = [];
      break
    default:
      element.endPoints = [];
      element.midPoints = [];
      element.centroids = [];
      element.segments = [];
  }
}

// The single segment for an elliptical arc step of a path (see arcStep.js).
// It carries the exact ellipse, for tools that edit the path, plus `pieces`:
// the circular arcs that approximate it, cut to the step's own span. Snapping
// and hit-testing use the pieces, since exact distances to an ellipse are too
// costly to compute on every mouse move. The pieces are computed once, here.
const ellipticalArcSegment = (p0, p1) => {
  const e = ellipticalArcParams(p0, p1, p1.r)
  if (!e) {
    // The points are too far apart for the radii. Treat it as straight, so
    // the path still selects and snaps somewhere near where it's drawn.
    console.warn('An elliptical arc step is too short for its radii.')
    return { type: 'lineSegment', x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, cx: (p0.x + p1.x) / 2, cy: (p0.y + p1.y) / 2, t0: 0, sweep: 0, rx: 0, ry: 0, angle: 0 }
  }
  const quasi = quasiEllipseSegments({ attrs: { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry }, angle: e.angle })
  // Work in polar angles about the ellipse's center, going CCW.
  const polar = pt => normalizeAngle(Math.atan2(pt.y - e.cy, pt.x - e.cx))
  const [from, to] = e.ccw ? [p0, p1] : [p1, p0]
  const spanStart = polar(from)
  const spanLength = normalizeAngle(polar(to) - spanStart)
  const pieces = []
  quasi.forEach(q => {
    const pieceStart = polar({ x: q.cx + q.r * Math.cos(q.startAngle), y: q.cy + q.r * Math.sin(q.startAngle) })
    const pieceEnd = polar({ x: q.cx + q.r * Math.cos(q.endAngle), y: q.cy + q.r * Math.sin(q.endAngle) })
    const pieceLength = normalizeAngle(pieceEnd - pieceStart)
    // Relative to the span's start, the piece may begin a full turn earlier.
    const offset = normalizeAngle(pieceStart - spanStart)
    for (const u of [offset, offset - 2 * Math.PI]) {
      const lo = Math.max(u, 0)
      const hi = Math.min(u + pieceLength, spanLength)
      if (hi - lo < 1e-9) { continue }
      // Where the overlap ends at the step's own end, cut the piece there.
      const angleAt = pt => normalizeAngle(Math.atan2(pt.y - q.cy, pt.x - q.cx))
      pieces.push({
        type: 'arc',
        cx: q.cx,
        cy: q.cy,
        r: q.r,
        startAngle: lo > u ? angleAt(from) : q.startAngle,
        endAngle: hi < u + pieceLength ? angleAt(to) : q.endAngle
      })
    }
  })
  return { type: 'ellipticalArc', ...e, r: p1.r, pieces }
}

const quasiEllipseSegments = element => {
  // Approximate an ellipse with 4 circular arcs for snapping purposes.
  // Circular arcs are more mathmatically tractable when snapping to points.
  // Ref: Chandrupatla and Osler, Approximating an Ellipse with Four Circular Arcs, 2008
  const cx = element.attrs.cx // center x
  const cy = element.attrs.cy // center y
  const a = element.attrs.rx > element.attrs.ry ? element.attrs.rx : element.attrs.ry  // semi-major axis
  const b = element.attrs.rx > element.attrs.ry ? element.attrs.ry : element.attrs.rx  // semi-minor axis
  const diag = Math.hypot(a, b) // distance between ends of axes
  const ϕ = Math.acos(a / diag) // angle between semi-major axis and diagonal
  const θ = Math.PI / 2 - ϕ
  const r1 = (a * Math.sin(θ) + b * Math.cos(θ) - a) / (Math.sin(θ) + Math.cos(θ) - 1) // short radius
  const r2 = (a * Math.sin(θ) + b * Math.cos(θ) - b) / (Math.sin(θ) + Math.cos(θ) - 1) // long radius
  const c = a - r1 // distance from center to center of small-radius arcs
  const d = r2 - b // distance from center to center of large-radius arcs

  // For snapping purposes, define 4 circular arcs that make up the ellipse.
  // Each arc is defined by its center, radius, start angle, and end angle.
  const top = (element.attrs.rx > element.attrs.ry)
    ? { type: 'arc', cx: cx, cy: cy - d, r: r2, startAngle: θ, endAngle: Math.PI - θ }
    : { type: 'arc', cx: cx, cy: cy + c, r: r1, startAngle: θ, endAngle: Math.PI - θ }
  const left = (element.attrs.rx > element.attrs.ry)
    ? { type: 'arc', cx: cx - c, cy: cy, r: r1, startAngle: Math.PI - θ, endAngle: Math.PI + θ }
    : { type: 'arc', cx: cx + d, cy: cy, r: r2, startAngle: Math.PI - θ, endAngle: Math.PI + θ }
  const bottom = (element.attrs.rx > element.attrs.ry)
    ? { type: 'arc', cx: cx, cy: cy + d, r: r2, startAngle: Math.PI + θ, endAngle: 2 * Math.PI - θ }
    : { type: 'arc', cx: cx, cy: cy - c, r: r1, startAngle: Math.PI + θ, endAngle: 2 * Math.PI - θ }
  const right = (element.attrs.rx > element.attrs.ry)
    ? { type: 'arc', cx: cx + c, cy: cy, r: r1, startAngle: 2 * Math.PI - θ, endAngle: θ }
    : { type: 'arc', cx: cx - d, cy: cy, r: r2, startAngle: 2 * Math.PI - θ, endAngle: θ }
  const arcs = [top, left, bottom, right];
  if (!element.angle) { return arcs }

  // The ellipse is rotated: the 4-arc approximation above was built assuming
  // rx/ry lie on the horizontal/vertical axes, so rigidly rotate the whole
  // assembly (each arc's center, plus its angle range) about the ellipse's
  // own center by the same amount. This is valid because rotating every
  // traced point of an arc by δ is equivalent to rotating its center about
  // the ellipse center by δ and shifting its start/end angles by δ.
  const δ = element.angle * Math.PI / 180
  const cosδ = Math.cos(δ), sinδ = Math.sin(δ)
  return arcs.map(arc => ({
    type: 'arc',
    cx: cx + (arc.cx - cx) * cosδ - (arc.cy - cy) * sinδ,
    cy: cy + (arc.cx - cx) * sinδ + (arc.cy - cy) * cosδ,
    r: arc.r,
    // Keep angles within [0, 2π), as isAngleOnArc expects.
    startAngle: normalizeAngle(arc.startAngle + δ),
    endAngle: normalizeAngle(arc.endAngle + δ)
  }))
}
