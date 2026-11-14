// arcStep.js
//
// Helpers for the arc steps of a path. A path point's r describes the segment
// that ends at that point:
//   0                  a straight segment
//   a number           a circular arc: its signed radius, + for CCW, − for CW
//   [±rx, ry, angle]   an elliptical arc on an ellipse with radii rx, ry,
//                      rotated `angle` degrees CCW; the sign of rx gives the
//                      direction, + for CCW, − for CW
// Like a circular arc, an elliptical arc spans at most half of its ellipse, so
// the SVG large-arc flag is always 0.
//
// This module imports nothing, so any module can use it.

const TAU = 2 * Math.PI
const norm = a => ((a % TAU) + TAU) % TAU

export const isElliptical = r => Array.isArray(r)

// A step's r in its simplest form. An elliptical r with a zero radius is a
// straight step (as in SVG), and one with equal radii is a circular arc.
export const simplifyR = r => {
  if (!Array.isArray(r)) { return r || 0 }
  const [srx, ry, angle = 0] = r
  if (srx === 0 || ry === 0) { return 0 }
  if (Math.abs(srx) === Math.abs(ry)) { return srx }
  return [srx, ry, angle]
}

// The rows of a path statement. Hurmet matrix rows must all be the same
// length, so the narrowest form that fits every step is used for all rows:
//   [x, y]                    when every step is straight
//   [x, y, r]                 when any step is a circular arc
//   [x, y, ±rx, ry, angle]    when any step is an elliptical arc
export const pathRows = points => {
  const rs = points.map((pt, i) => (i === 0 ? 0 : simplifyR(pt.r)))
  const width = rs.some(Array.isArray) ? 5 : rs.some(r => r !== 0) ? 3 : 2
  return points.map((pt, i) => {
    const r = rs[i]
    if (width === 2) { return [pt.x, pt.y] }
    if (width === 3) { return [pt.x, pt.y, r] }
    return Array.isArray(r) ? [pt.x, pt.y, ...r] : [pt.x, pt.y, r, Math.abs(r), 0]
  })
}

// Round away floating-point noise (e.g. 30.000000000000004, or 1.8e-15 for
// 0) from a number that was computed rather than typed, so that saving and
// reloading doesn't drift. (+ 0 turns -0 into 0.)
export const tidy = x => Math.round(x * 1e9) / 1e9 + 0
const tidyDegrees = deg => tidy(((deg % 360) + 360) % 360)

// The SVG path command that draws an arc step ending at (x, y).
export const arcCommand = (r, x, y) => {
  if (Array.isArray(r)) {
    const [srx, ry, angle = 0] = r
    return `A ${Math.abs(srx)} ${Math.abs(ry)} ${angle} 0 ${srx >= 0 ? 1 : 0} ${x} ${y}`
  }
  return `A ${Math.abs(r)} ${Math.abs(r)} 0 0 ${r >= 0 ? 1 : 0} ${x} ${y}`
}

// A step's r after rotating the path `deg` degrees CCW.
export const rotateR = (r, deg) => Array.isArray(r) ? [r[0], r[1], tidyDegrees((r[2] || 0) + deg)] : r

// A step's r after mirroring the path across a line at `lineDeg` degrees.
// Reflection reverses the direction, and reflects the ellipse's orientation.
export const mirrorR = (r, lineDeg) => Array.isArray(r)
  ? [-r[0], r[1], tidyDegrees(2 * lineDeg - (r[2] || 0))]
  : r * -1

// A step's r after scaling the path by `factor` about any point.
export const scaleR = (r, factor) => Array.isArray(r)
  ? [r[0] * factor, r[1] * Math.abs(factor), r[2] || 0]
  : r * factor

// The ellipse that an elliptical arc step from p0 to p1 lies on, or null if
// the points are too far apart for its radii.
//   cx, cy, rx, ry, angle (degrees): the ellipse
//   ccw: its direction
//   t0, t1: the parametric angles of p0 and p1, where a point's parametric
//     angle t puts it at center + R(angle)·(rx cos t, ry sin t)
//   sweep: signed parametric sweep from t0 to t1, at most π in size
export const ellipticalArcParams = (p0, p1, r) => {
  const [srx, sry, angle = 0] = r
  const rx = Math.abs(srx)
  const ry = Math.abs(sry)
  if (!(rx > 0) || !(ry > 0)) { return null }
  const ccw = srx >= 0
  const rad = angle * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // Into the ellipse's own frame, scaled so the ellipse is a unit circle.
  const toUnit = p => ({ x: (p.x * cos + p.y * sin) / rx, y: (-p.x * sin + p.y * cos) / ry })
  const a = toUnit(p0)
  const b = toUnit(p1)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const q = Math.hypot(dx, dy)
  // A half-ellipse's ends are exactly a diameter apart, which floating-point
  // error can nudge just past it.
  if (q === 0 || q > 2 + 1e-9) { return null }
  const h = Math.sqrt(Math.max(1 - q * q / 4, 0))
  // A CCW arc's center is to the left of the chord from p0 to p1.
  const side = ccw ? 1 : -1
  const c = { x: (a.x + b.x) / 2 - side * h * dy / q, y: (a.y + b.y) / 2 + side * h * dx / q }
  const t0 = norm(Math.atan2(a.y - c.y, a.x - c.x))
  const t1 = norm(Math.atan2(b.y - c.y, b.x - c.x))
  const sweep = ccw ? norm(t1 - t0) : -norm(t0 - t1)
  // Back to model coordinates
  const ux = c.x * rx
  const uy = c.y * ry
  return {
    cx: ux * cos - uy * sin,
    cy: ux * sin + uy * cos,
    rx, ry, angle, ccw, t0, t1, sweep
  }
}

// The point at parametric angle t on the ellipse of `e`.
export const ellipsePoint = (e, t) => {
  const rad = e.angle * Math.PI / 180
  const x = e.rx * Math.cos(t)
  const y = e.ry * Math.sin(t)
  return {
    x: e.cx + x * Math.cos(rad) - y * Math.sin(rad),
    y: e.cy + x * Math.sin(rad) + y * Math.cos(rad)
  }
}

// The parametric angle of a point on (or near) the ellipse of `e`.
export const ellipseParam = (e, p) => {
  const rad = e.angle * Math.PI / 180
  const dx = p.x - e.cx
  const dy = p.y - e.cy
  return norm(Math.atan2((-dx * Math.sin(rad) + dy * Math.cos(rad)) / e.ry, (dx * Math.cos(rad) + dy * Math.sin(rad)) / e.rx))
}

// Is parametric angle t on the arc of `e`?
export const isParamOnArc = (e, t, eps = 1e-9) => e.sweep >= 0
  ? norm(t - e.t0) <= e.sweep + eps || norm(t - e.t0) >= TAU - eps
  : norm(e.t0 - t) <= -e.sweep + eps || norm(e.t0 - t) >= TAU - eps

// Where the line through p1 and p2 crosses the arc of `e`, exactly, as
// [{ x, y, s }], where s is the position along the line (0 at p1, 1 at p2).
// With `bounded`, only crossings between p1 and p2.
export const lineArcIntersections = (p1, p2, e, bounded = true) => {
  const rad = e.angle * Math.PI / 180
  const toUnit = p => {
    const dx = p.x - e.cx
    const dy = p.y - e.cy
    return { x: (dx * Math.cos(rad) + dy * Math.sin(rad)) / e.rx, y: (-dx * Math.sin(rad) + dy * Math.cos(rad)) / e.ry }
  }
  const a = toUnit(p1)
  const b = toUnit(p2)
  const d = { x: b.x - a.x, y: b.y - a.y }
  // |a + s·d|² = 1
  const A = d.x * d.x + d.y * d.y
  const B = 2 * (a.x * d.x + a.y * d.y)
  const C = a.x * a.x + a.y * a.y - 1
  const disc = B * B - 4 * A * C
  if (A === 0 || disc < 0) { return [] }
  const root = Math.sqrt(disc)
  const roots = root === 0 ? [-B / (2 * A)] : [(-B - root) / (2 * A), (-B + root) / (2 * A)]
  return roots
    .filter(s => !bounded || (s >= -1e-9 && s <= 1 + 1e-9))
    .map(s => ({ s, t: norm(Math.atan2(a.y + s * d.y, a.x + s * d.x)) }))
    .filter(({ t }) => isParamOnArc(e, t))
    .map(({ s }) => ({ x: p1.x + s * (p2.x - p1.x), y: p1.y + s * (p2.y - p1.y), s }))
}
