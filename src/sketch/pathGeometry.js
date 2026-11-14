import { lineCircleIntersections, circleCircleIntersections, isAngleOnArc } from './snap.js'
import { utils } from './utils.js'

// pathGeometry.js
//
// Geometry for editing a path whose steps are straight or circular arcs
// (see arcStep.js): offsetting it, and rounding one of its corners. Each step
// lies on a "curve" -- a whole line or circle -- traveled in the step's own
// direction:
//   { kind: 'line', p, u }            through point p, in unit direction u
//   { kind: 'circle', c, R, sign }    center c, radius R, sign +1 for CCW, −1 for CW

// The curve that step i (from points[i] to points[i + 1]) lies on, or null
// for a zero-length straight step.
export const stepCurve = (element, i) => {
  const a = element.points[i]
  const b = element.points[i + 1]
  if (!b.r) {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    return len === 0 ? null : { kind: 'line', p: { x: a.x, y: a.y }, u: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } }
  }
  const seg = element.segments[i]
  return { kind: 'circle', c: { x: seg.cx, y: seg.cy }, R: Math.abs(b.r), sign: Math.sign(b.r) }
}

// The direction of travel along a curve at point p on it.
export const tangentAt = (curve, p) => curve.kind === 'line'
  ? curve.u
  : { x: -curve.sign * (p.y - curve.c.y) / curve.R, y: curve.sign * (p.x - curve.c.x) / curve.R }

// The curve moved `delta` to the left of its direction of travel (right, for
// a negative delta). A circle's center is on the left of a CCW arc, so moving
// left shrinks a CCW arc's circle and grows a CW one's.
export const offsetCurve = (curve, delta) => curve.kind === 'line'
  ? { ...curve, p: { x: curve.p.x - delta * curve.u.y, y: curve.p.y + delta * curve.u.x } }
  : { ...curve, R: curve.R - delta * curve.sign }

// The point on a curve nearest to p.
export const footOn = (curve, p) => {
  if (curve.kind === 'line') {
    const s = (p.x - curve.p.x) * curve.u.x + (p.y - curve.p.y) * curve.u.y
    return { x: curve.p.x + s * curve.u.x, y: curve.p.y + s * curve.u.y }
  }
  const d = Math.hypot(p.x - curve.c.x, p.y - curve.c.y)
  return { x: curve.c.x + curve.R * (p.x - curve.c.x) / d, y: curve.c.y + curve.R * (p.y - curve.c.y) / d }
}

// Where two curves, taken whole, cross.
export const curveIntersections = (A, B) => {
  if (A.kind === 'line' && B.kind === 'line') {
    const pt = utils.lineLineIntersection(
      { x1: A.p.x, y1: A.p.y, x2: A.p.x + A.u.x, y2: A.p.y + A.u.y },
      { x1: B.p.x, y1: B.p.y, x2: B.p.x + B.u.x, y2: B.p.y + B.u.y },
      false
    )
    return pt ? [pt] : []
  }
  if (A.kind === 'circle' && B.kind === 'circle') {
    return circleCircleIntersections(A.c.x, A.c.y, A.R, B.c.x, B.c.y, B.R)
  }
  const [line, circle] = A.kind === 'line' ? [A, B] : [B, A]
  return lineCircleIntersections(line.p, { x: line.p.x + line.u.x, y: line.p.y + line.u.y }, circle.c.x, circle.c.y, circle.R, false)
}

const nearestTo = (points, p) => points.reduce((best, q) =>
  !best || Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? q : best, null)

// Is point p (on step i's curve) within step i?
const isOnStep = (element, i, p) => {
  const a = element.points[i]
  const b = element.points[i + 1]
  const tol = 1e-9 * (1 + Math.hypot(b.x - a.x, b.y - a.y))
  if (!b.r) {
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
    const s = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2
    return s >= -tol && s <= 1 + tol
  }
  const seg = element.segments[i]
  const angle = utils.norm(Math.atan2(p.y - seg.cy, p.x - seg.cx))
  return isAngleOnArc(seg.startAngle, seg.endAngle, seg.r, angle) ||
    Math.hypot(p.x - a.x, p.y - a.y) <= tol || Math.hypot(p.x - b.x, p.y - b.y) <= tol
}

// Round the corner where step i ends and step j begins, with a fillet of
// radius `size` or, for tool 'chamfer', a straight cut `size` from the corner
// along each step. Returns { t1, t2, r }: the new end of step i, the new
// start of step j, and the r of the new step between them. Returns a string
// saying why, if the corner can't be rounded.
export const roundCorner = (element, i, j, size, tool) => {
  const V = element.points[i + 1]
  const A = stepCurve(element, i)
  const B = stepCurve(element, j)
  if (!A || !B) { return "a step has no length" }
  const tIn = tangentAt(A, V)
  const tOut = tangentAt(B, V)
  const turn = tIn.x * tOut.y - tIn.y * tOut.x
  if (Math.abs(turn) < 1e-9) { return "the path is already smooth there" }
  // The inside of the corner is to the left of travel for a left (CCW) turn.
  const side = turn > 0 ? 1 : -1
  let t1, t2
  if (tool === 'fillet') {
    // The fillet's center is `size` inside both curves.
    const OA = offsetCurve(A, side * size)
    const OB = offsetCurve(B, side * size)
    if ((OA.kind === 'circle' && OA.R <= 0) || (OB.kind === 'circle' && OB.R <= 0)) { return "the radius is too large" }
    const center = nearestTo(curveIntersections(OA, OB), V)
    if (!center) { return "the radius is too large" }
    t1 = footOn(A, center)
    t2 = footOn(B, center)
  } else {
    // `size` from the corner, backward along step i and forward along step j.
    const along = (curve, direction, sign) => {
      if (curve.kind === 'line') {
        return { x: V.x + sign * size * curve.u.x, y: V.y + sign * size * curve.u.y }
      }
      const candidates = circleCircleIntersections(curve.c.x, curve.c.y, curve.R, V.x, V.y, size)
      return candidates.find(p => sign * ((p.x - V.x) * direction.x + (p.y - V.y) * direction.y) > 0)
    }
    t1 = along(A, tIn, -1)
    t2 = along(B, tOut, 1)
    if (!t1 || !t2) { return "the distance is too large" }
  }
  if (!isOnStep(element, i, t1) || !isOnStep(element, j, t2)) {
    return tool === 'fillet' ? "the radius is too large" : "the distance is too large"
  }
  return { t1, t2, r: tool === 'fillet' ? side * size : 0 }
}

// Offset a path of straight and circular-arc steps by `delta` to the left of
// its direction of travel (right, for a negative delta). Corners that were
// smooth stay smooth; the offset steps at other corners are extended or cut
// back to meet. Returns the new points, or a string saying why it failed.
export const offsetPathPoints = (element, closed, delta) => {
  const pts = element.points
  const n = pts.length - 1
  const curves = []
  for (let i = 0; i < n; i++) {
    const curve = stepCurve(element, i)
    if (!curve) { return "the path has a step of zero length" }
    const moved = offsetCurve(curve, delta)
    if (moved.kind === 'circle' && moved.R <= 1e-9) { return "the offset is larger than an arc's radius" }
    curves.push(moved)
  }
  // Where offset step i meets offset step j, at the original corner V.
  const joint = (i, j) => {
    const V = pts[i + 1]
    const end = footOn(curves[i], V)
    const start = footOn(curves[j], V)
    if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-7) {
      return { x: (end.x + start.x) / 2, y: (end.y + start.y) / 2 }
    }
    return nearestTo(curveIntersections(curves[i], curves[j]), V)
  }
  const newPoints = [closed ? joint(n - 1, 0) : footOn(curves[0], pts[0])]
  for (let i = 0; i < n; i++) {
    const p = i < n - 1 ? joint(i, i + 1) : closed ? newPoints[0] : footOn(curves[i], pts[n])
    if (!p || !newPoints[0]) { return "the offset steps don't meet" }
    const curve = curves[i]
    newPoints.push({ x: p.x, y: p.y, r: curve.kind === 'circle' ? curve.sign * curve.R : 0 })
  }
  newPoints[0] = { x: newPoints[0].x, y: newPoints[0].y, r: 0 }
  return newPoints
}
