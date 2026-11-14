// freehandMath.js
// Point reduction and curve fitting for the freehand drawing tool.
// Pipeline: raw pointer samples -> simplify (Douglas-Peucker, preceded by its
// usual radial-distance pass) -> Catmull-Rom fit -> cubic Bezier segments.
// simplifyPoints is a port of https://github.com/mourner/simplify-js (ISC License).

const getSqDist = (p1, p2) => {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return dx * dx + dy * dy
}

const getSqSegDist = (p, p1, p2) => {
  let x = p1.x, y = p1.y
  let dx = p2.x - x, dy = p2.y - y
  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = p2.x
      y = p2.y
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }
  dx = p.x - x
  dy = p.y - y
  return dx * dx + dy * dy
}

const simplifyRadialDist = (points, sqTolerance) => {
  let prevPoint = points[0]
  const newPoints = [prevPoint]
  let point
  for (let i = 1; i < points.length; i++) {
    point = points[i]
    if (getSqDist(point, prevPoint) > sqTolerance) {
      newPoints.push(point)
      prevPoint = point
    }
  }
  if (prevPoint !== point) { newPoints.push(point) }
  return newPoints
}

const simplifyDPStep = (points, first, last, sqTolerance, simplified) => {
  let maxSqDist = sqTolerance
  let index = -1
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last])
    if (sqDist > maxSqDist) {
      index = i
      maxSqDist = sqDist
    }
  }
  if (index > -1) {
    if (index - first > 1) { simplifyDPStep(points, first, index, sqTolerance, simplified) }
    simplified.push(points[index])
    if (last - index > 1) { simplifyDPStep(points, index, last, sqTolerance, simplified) }
  }
}

const simplifyDouglasPeucker = (points, sqTolerance) => {
  const last = points.length - 1
  const simplified = [points[0]]
  simplifyDPStep(points, 0, last, sqTolerance, simplified)
  simplified.push(points[last])
  return simplified
}

// Reduce the number of points in a stroke while preserving its shape.
// `tolerance` is in model units; larger values drop more points. The
// radial-distance pass (run unless highestQuality) already discards points
// that are too close together, so callers don't need a separate velocity/
// distance filter before calling this.
export const simplifyPoints = (points, tolerance = 1, highestQuality = false) => {
  if (points.length <= 2) { return points }
  const sqTolerance = tolerance * tolerance
  points = highestQuality ? points : simplifyRadialDist(points, sqTolerance)
  points = simplifyDouglasPeucker(points, sqTolerance)
  return points
}

// Fit a smooth curve through `points` (length >= 2) using a uniform
// Catmull-Rom spline, expressed as cubic Bezier segments. Each segment is
// { p0, cp1, cp2, p1 }. End points are clamped by reusing the first/last
// point as their own neighbor.
export const catmullRomToBezierSegments = points => {
  const n = points.length
  if (n < 2) { return [] }
  const segments = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < n ? i + 2 : n - 1]
    segments.push({
      p0: p1,
      cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p1: p2
    })
  }
  return segments
}

export const bezierSegmentsToD = segments => {
  if (segments.length === 0) { return '' }
  let d = `M ${segments[0].p0.x} ${segments[0].p0.y}`
  segments.forEach(seg => {
    d += ` C ${seg.cp1.x} ${seg.cp1.y}, ${seg.cp2.x} ${seg.cp2.y}, ${seg.p1.x} ${seg.p1.y}`
  })
  return d
}

const evalCubic = (p0, cp1, cp2, p1, t) => {
  const mt = 1 - t
  const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t
  return {
    x: a * p0.x + b * cp1.x + c * cp2.x + d * p1.x,
    y: a * p0.y + b * cp1.y + c * cp2.y + d * p1.y
  }
}

// Sample each Bezier segment into short straight chords, for use as
// element.segments (see snap.js/selectTool.js). Sampling the curve avoids
// needing separate point-to-Bezier-distance and Bezier-rectangle-intersection
// math; the existing 'lineSegment' hit-testing just works on the result.
export const bezierSegmentsToLineSegments = (segments, subdivisions = 8) => {
  const lineSegments = []
  segments.forEach(seg => {
    let prev = seg.p0
    for (let s = 1; s <= subdivisions; s++) {
      const t = s / subdivisions
      const next = t === 1 ? seg.p1 : evalCubic(seg.p0, seg.cp1, seg.cp2, seg.p1, t)
      lineSegments.push({ type: 'lineSegment', x1: prev.x, y1: prev.y, x2: next.x, y2: next.y })
      prev = next
    }
  })
  return lineSegments
}

// Build the SVG path `d` string for a freehand stroke from its stored
// (already-simplified) waypoints.
export const freehandPathD = points => {
  if (points.length === 1) {
    // A tap with no drag: draw a zero-length path so stroke-linecap: round
    // still renders a dot.
    return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`
  }
  return bezierSegmentsToD(catmullRomToBezierSegments(points))
}
