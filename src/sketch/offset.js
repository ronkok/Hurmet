import { adjustForSnapAndLock, nearestElementAndSegment } from './snap.js'
import { dwgMgr } from './dwg.js'
import { recordHistory } from './history.js'
import { ellipseTransform, path as buildPath } from './elementObject.js'
import { offsetPathPoints } from './pathGeometry.js'
import { pathRows } from './arcStep.js'

// Offsets a line segment by a perpendicular distance (positive magnitude) toward modelPoint side.
function calculateOffsetLine(segment, modelPoint, offsetDistance) {
  if (!segment) { return null }
  const { x1, y1, x2, y2 } = segment
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) { return null }
  // Left-hand unit normal
  const nx = -dy / len
  const ny = dx / len
  // Determine which side modelPoint is on: signed distance along normal
  let sign = 1
  if (modelPoint) {
    const d = (modelPoint.x - x1) * nx + (modelPoint.y - y1) * ny
    // If modelPoint is on the right side (d < 0), flip the normal
    sign = d >= 0 ? 1 : -1
  }
  const ox = nx * offsetDistance * sign
  const oy = ny * offsetDistance * sign
  return {
    x1: x1 + ox,
    y1: y1 + oy,
    x2: x2 + ox,
    y2: y2 + oy
  }
}

// Compute an offset rectangle (returns attrs for new rect or null if invalid)
const calculateOffsetRect = (rectAttrs, modelPoint, offsetDistance) => {
  const { x, y, width, height } = rectAttrs
  if (width === 0 || height === 0) { return null }

  // Determine inside/outside
  const inside =
    modelPoint &&
    modelPoint.x >= x &&
    modelPoint.x <= x + width &&
    modelPoint.y >= y &&
    modelPoint.y <= y + height

  if (inside) {
    const newWidth = width - 2 * offsetDistance
    const newHeight = height - 2 * offsetDistance
    if (newWidth <= 0 || newHeight <= 0) {
      console.warn('Offset too large; rectangle would collapse.')
      return null
    }
    return {
      x: x + offsetDistance,
      y: y + offsetDistance,
      width: newWidth,
      height: newHeight
    }
  } else {
    return {
      x: x - offsetDistance,
      y: y - offsetDistance,
      width: width + 2 * offsetDistance,
      height: height + 2 * offsetDistance
    }
  }
}

// Offset circle (returns new attrs or null)
const calculateOffsetCircle = (circleAttrs, modelPoint, offsetDistance) => {
  const { cx, cy, r } = circleAttrs
  if (r <= 0) return null
  let inside = false
  if (modelPoint) {
    const dx = modelPoint.x - cx
    const dy = modelPoint.y - cy
    inside = (dx * dx + dy * dy) <= r * r
  }
  const newR = inside ? (r - offsetDistance) : (r + offsetDistance)
  if (newR <= 0) {
    console.warn('Offset too large; circle would collapse.')
    return null
  }
  return { cx, cy, r: newR }
}

// Offset ellipse (returns new attrs or null)
const calculateOffsetEllipse = (ellipseAttrs, modelPoint, offsetDistance, angle = 0) => {
  const { cx, cy, rx, ry } = ellipseAttrs
  if (rx <= 0 || ry <= 0) return null
  let inside = false
  if (modelPoint) {
    // Rotate the test point into the ellipse's own (unrotated) local frame
    // by -angle before the standard axis-aligned inside/outside test.
    let dx = modelPoint.x - cx
    let dy = modelPoint.y - cy
    if (angle) {
      const δ = -angle * Math.PI / 180
      const cosδ = Math.cos(δ), sinδ = Math.sin(δ)
      const localDx = dx * cosδ - dy * sinδ
      const localDy = dx * sinδ + dy * cosδ
      dx = localDx
      dy = localDy
    }
    inside = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
  }
  const newRx = inside ? (rx - offsetDistance) : (rx + offsetDistance)
  const newRy = inside ? (ry - offsetDistance) : (ry + offsetDistance)
  if (newRx <= 0 || newRy <= 0) {
    console.warn('Offset too large; ellipse would collapse.')
    return null
  }
  return { cx, cy, rx: newRx, ry: newRy, transform: ellipseTransform(cx, cy, angle) }
}

const getArcOffsetParams = (element, modelPoint, offsetDistance) => {
  const arcCenter = element.centroids[0];
  const inside = modelPoint &&
    Math.hypot(modelPoint.x - arcCenter.x, modelPoint.y - arcCenter.y) <
    Math.hypot(element.points[1].x - arcCenter.x, element.points[1].y - arcCenter.y)
  // element.points[1].r is signed (negative for a CW arc); offset the radius
  // magnitude, not the signed value, or a CW arc's already-negative r looks
  // "too large" no matter which direction it's offset.
  const sign = element.points[1].r < 0 ? -1 : 1
  const magnitude = Math.abs(element.points[1].r) + (inside ? -offsetDistance : offsetDistance)
  if (magnitude <= 0) {
    console.warn('Offset too large; arc would collapse.')
    return
  }
  const r = sign * magnitude
  // Find the start and end point by increasing/decreasing the radius from the center
  // along the line from center to the original point. Use segments[0] to find startAngle and endAngle.
  const startAngle = element.segments[0].startAngle
  const endAngle = element.segments[0].endAngle
  const startPoint = {
    x: arcCenter.x + magnitude * Math.cos(startAngle),
    y: arcCenter.y + magnitude * Math.sin(startAngle)
  }
  const endPoint = {
    x: arcCenter.x + magnitude * Math.cos(endAngle),
    y: arcCenter.y + magnitude * Math.sin(endAngle)
  }
  return { r, startPoint, endPoint }
}

function polygonSignedArea(pts) {
  let a = 0
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % n]
    a += p.x * q.y - q.x * p.y
  }
  return 0.5 * a
}

function pointInPolygon(pt, pts) {
  // Ray casting
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y
    const xj = pts[j].x, yj = pts[j].y
    const intersect =
      ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 0.0000001) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function lineIntersection(n1, c1, n2, c2) {
  const det = n1.x * n2.y - n1.y * n2.x
  if (Math.abs(det) < 1e-12) return null // Parallel / nearly parallel
  const x = (c1 * n2.y - n1.y * c2) / det
  const y = (n1.x * c2 - c1 * n2.x) / det
  return { x, y }
}

const getPolygonNormal = (pts, modelPoint, offsetDistance) => {
  if (pts.length < 3) { return [null, null] }

  // Determine orientation (positive => CCW)
  const area = polygonSignedArea(pts)
  if (Math.abs(area) < 1e-16) {
    console.warn('Degenerate polygon (area ~ 0)')
    return [null, null]
  }
  const ccw = area > 0

  // Determine if modelPoint is inside (for direction)
  const inside = modelPoint ? pointInPolygon(modelPoint, pts) : false

  // Outward normal for each directed edge
  // For CCW polygon, interior is to the LEFT of each edge.
  // Left normal = (-dy, dx). Outward normal = RIGHT normal = (dy, -dx) for CCW.
  // For CW polygon, interior is to the RIGHT, so outward normal = LEFT normal = (-dy, dx).
  const outwardNormal = (dx, dy) => {
    return ccw ? { x: dy, y: -dx } : { x: -dy, y: dx }
  }

  // Direction multiplier: outside -> expand (outward), inside -> shrink (inward)
  const dir = inside ? -1 : 1
  const delta = dir * offsetDistance
  return [delta, outwardNormal];
}

const getSegmentNormal = (segment, modelPoint, offsetDistance) => {
  if (!segment) { return [null, null] }
  const { x1, y1, x2, y2 } = segment
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) { return [null, null] }
  // At point {x1,y1} examine the angle subtended by the segment and modelPoint.
  // Determine which side modelPoint is on: signed distance along normal.
  const sideSign = ((modelPoint.x - x1) * dy - (modelPoint.y - y1) * dx) >= 0 ? -1 : 1
  const segmentNormal = (dx, dy) => {
    return sideSign === 1 ? { x: -dy, y: dx } : { x: dy, y: -dx }
  }
  return [offsetDistance, segmentNormal]
}

const offsetPoints = (pts, delta, segmentNormal, closed) => {
  // Build offset segments for polygons and paths: n • X = c
  const segments = [];
  // An open polyline has no closing edge from its last point back to its first.
  const numEdges = closed ? pts.length : pts.length - 1
  for (let i = 0; i < numEdges; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const dx = q.x - p.x
    const dy = q.y - p.y
    const len = Math.hypot(dx, dy)
    if (len === 0) {
      console.warn('Zero-length edge in polygon')
      return null
    }
    let n = segmentNormal(dx, dy)
    // Normalize
    const nl = Math.hypot(n.x, n.y)
    n.x /= nl
    n.y /= nl
    // Offset line: n • X = n • P + delta
    const c = n.x * p.x + n.y * p.y + delta
    segments.push({ n, c })
  }

  // Intersections of consecutive offset segments become new vertices.
  // An open polyline's end points have only one segment each, so they're
  // simply moved along that segment's normal instead.
  const newPts = [];
  for (let i = 0; i < pts.length; i++) {
    if (!closed && (i === 0 || i === pts.length - 1)) {
      const n = segments[i === 0 ? 0 : segments.length - 1].n
      newPts.push({ x: pts[i].x + delta * n.x, y: pts[i].y + delta * n.y })
      continue
    }
    const L1 = segments[(i - 1 + segments.length) % segments.length]
    const L2 = segments[i]
    const inter = lineIntersection(L1.n, L1.c, L2.n, L2.c)
    if (!inter) {
      console.warn('Failed to intersect adjacent offset edges (possibly too large offset)')
      return null
    }
    newPts.push(inter)
  }

  // Validate no invalid coordinates
  if (newPts.some(p => !isFinite(p.x) || !isFinite(p.y))) {
    console.warn('Invalid coordinates in offset polygon')
    return null
  }

  return newPts
}

const adjustStrokeAttrs = (newElement, originalElement) => {
  if (originalElement.attrs['stroke-width'] && originalElement.attrs['stroke-width'] !== 1) {
    newElement.attrs['stroke-width'] = originalElement.attrs['stroke-width']
  }
  if (originalElement.attrs['stroke-dasharray']) {
    newElement.attrs['stroke-dasharray'] = originalElement.attrs['stroke-dasharray']
  }
  if (originalElement.attrs['stroke-linecap']) {
    newElement.attrs['stroke-linecap'] = originalElement.attrs['stroke-linecap']
  }
  if (originalElement.attrs['marker-end']) {
    newElement.attrs['marker-end'] = originalElement.attrs['marker-end']
  }
}

export const offset = (event, appState, offsetDistance, dwg) => {
  // Handle offsetting a shape
  const modelPoint = adjustForSnapAndLock(event, appState, dwg)
  const [element, segment] = nearestElementAndSegment(modelPoint, appState, dwg)
  if (element) {
    switch(element.tag) {
      case 'line': {
        const newSegment = calculateOffsetLine(segment, modelPoint, offsetDistance)
        if (!newSegment) {
          console.error("Failed to calculate offset line")
          return
        }
        const newLine = {
          tag: 'line', 
          attrs: {
            x1: newSegment.x1,
            y1: newSegment.y1,
            x2: newSegment.x2,
            y2: newSegment.y2,
            stroke: element.attrs.stroke
          }
        }
        adjustStrokeAttrs(newLine, element)
        dwgMgr.pushChild(dwg, newLine)
        recordHistory(newLine, dwg)
        break
      }
      case 'rect': {
        const rectAttrs = element.attrs
        const newRectAttrs = calculateOffsetRect(rectAttrs, modelPoint, offsetDistance)
        if (!newRectAttrs) { return }
        const newRect = {
          tag: 'rect',
          attrs: {
            ...newRectAttrs,
            stroke: element.attrs.stroke,
            fill: rectAttrs.fill || 'none',
            pattern: rectAttrs.pattern
          }
        }
        adjustStrokeAttrs(newRect, element)
        dwgMgr.pushChild(dwg, newRect)
        recordHistory(newRect, dwg)
        break
      }
      case 'circle': {
        const newAttrs = calculateOffsetCircle(element.attrs, modelPoint, offsetDistance)
        if (!newAttrs) return
        const circ = {
          tag: 'circle',
          attrs: {
            ...newAttrs,
            stroke: element.attrs.stroke,
            fill: element.attrs.fill || 'none',
            pattern: element.attrs.pattern
          }
        }
        adjustStrokeAttrs(circ, element)
        dwgMgr.pushChild(dwg, circ)
        recordHistory(circ, dwg)
        break
      }
      case 'ellipse': {
        const newAttrs = calculateOffsetEllipse(element.attrs, modelPoint, offsetDistance, element.angle || 0)
        if (!newAttrs) return
        const ellipse = {
          tag: 'ellipse',
          angle: element.angle || 0,
          attrs: {
            ...newAttrs,
            stroke: element.attrs.stroke,
            fill: element.attrs.fill || 'none',
            pattern: element.attrs.pattern
          }
        }
        adjustStrokeAttrs(ellipse, element)
        dwgMgr.pushChild(dwg, ellipse)
        recordHistory(ellipse, dwg)
        break
      }
      case 'polygon': {
        const [d, segmentNormal] = getPolygonNormal(element.points, modelPoint, offsetDistance)
        if (d === 0) {
          console.warn('Model point is on the polygon; cannot determine offset direction.')
          return
        }
        const newPoints = offsetPoints(element.points, d, segmentNormal, true)
        if (!newPoints) return
        const polygon = {
          tag: 'polygon',
          attrs: {
            points: newPoints.map(p => `${p.x},${p.y}`).join(' '),
            stroke: element.attrs.stroke,
            fill: element.attrs.fill || 'none',
            pattern: element.attrs.pattern
          },
          points: newPoints
        }
        adjustStrokeAttrs(polygon, element)
        dwgMgr.pushChild(dwg, polygon)
        recordHistory(polygon, dwg)
        break
      }
      case 'path': {
        if (element.attrs['data-freehand']) {
          alert("Offset is not supported for freehand strokes.")
          break
        }
        const pts = element.points
        if (pts.slice(1).some(pt => Array.isArray(pt.r))) {
          alert("Offset is not yet supported for elliptical arcs.")
          break
        }
        const hasArc = pts.slice(1).some(pt => pt.r)
        let newPoints
        if (pts.length === 2 && hasArc) {
          // For an arc, just offset the radius
          const arcOffsetParams = getArcOffsetParams(element, modelPoint, offsetDistance)
          if (!arcOffsetParams) return
          const { startPoint, endPoint, r } = arcOffsetParams
          newPoints = [{ x: startPoint.x, y: startPoint.y, r: 0 }, { x: endPoint.x, y: endPoint.y, r }]
        } else if (hasArc) {
          // Straight steps and circular arcs. Offset to the left of the
          // direction of travel by `delta` (negative for the right).
          const first = pts[0]
          const last = pts[pts.length - 1]
          const closed = pts.length >= 3 && first.x === last.x && first.y === last.y
          // The side is judged against the clicked step itself, which the click
          // is near. (Not against the polygon through the path's points: that
          // cuts straight across an arc, so a click inside the arc's bulge
          // would count as outside the shape.)
          let delta
          if (segment.type === 'lineSegment') {
            const cross = (segment.x2 - segment.x1) * (modelPoint.y - segment.y1) - (segment.y2 - segment.y1) * (modelPoint.x - segment.x1)
            delta = (cross > 0 ? 1 : -1) * offsetDistance
          } else {
            // A CCW arc's center is on its left; inside its circle is toward the center.
            const inside = Math.hypot(modelPoint.x - segment.cx, modelPoint.y - segment.cy) < Math.abs(segment.r)
            delta = (inside ? 1 : -1) * Math.sign(segment.r) * offsetDistance
          }
          const result = offsetPathPoints(element, closed, delta)
          if (typeof result === 'string') {
            alert(`Offset failed: ${result}.`)
            break
          }
          newPoints = result
        } else {
          // A closed path repeats its first point at the end.
          const first = pts[0]
          const last = pts[pts.length - 1]
          const closed = pts.length >= 4 && first.x === last.x && first.y === last.y
          const polyPoints = closed ? pts.slice(0, -1) : pts
          const [delta, segmentNormal] = closed
            ? getPolygonNormal(polyPoints, modelPoint, offsetDistance)
            // For open paths, use the nearest segment's normal
            : getSegmentNormal(segment, modelPoint, offsetDistance)
          if (!delta) { return null }
          const offsetPts = offsetPoints(polyPoints, delta, segmentNormal, closed)
          if (!offsetPts) { return null }
          newPoints = (closed ? [...offsetPts, offsetPts[0]] : offsetPts).map(p => ({ x: p.x, y: p.y, r: 0 }))
        }
        // Build `d` the same way parse.js does, so the new path matches its saved form.
        const newPath = buildPath(pathRows(newPoints), appState)
        const path = {
          tag: 'path',
          attrs: {
            d: newPath.attrs.d,
            stroke: element.attrs.stroke,
            fill: element.attrs.fill || 'none',
            pattern: element.attrs.pattern
          },
          points: newPoints
        }
        adjustStrokeAttrs(path, element)

        dwgMgr.pushChild(dwg, path)
        recordHistory(path, dwg)
        break
      }
    }
  }
}
