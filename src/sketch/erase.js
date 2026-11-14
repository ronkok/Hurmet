import { adjustForModel, nearestElementAndSegment, lineCircleIntersections, lineEllipseIntersections, isAngleOnArc, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { utils } from './utils.js'
import { recordHistory } from './history.js'
import { lineArcIntersections, ellipseParam, ellipsePoint } from './arcStep.js'

const linesIntersect = (p1, p2, p3, p4) => {
  // Check if line segment p1-p2 intersects with line segment p3-p4
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
  if (det === 0) {
    return false; // Lines are parallel
  } else {
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det; 
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    if ((0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1)) {
      // return intersection point
      return {
        x: p1.x + lambda * (p2.x - p1.x),
        y: p1.y + lambda * (p2.y - p1.y)
      }
    } else {
      return false; // No intersection within the segments
    }
  }
}

const normalizeAngle = angle => {
  return (angle + 2 * Math.PI) % (2 * Math.PI)
}

const eps = 1e-6
const eqPt = (a, b) => {
  return !!a && !!b && Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

// Angle distance in [0, PI]
const angularDistance = (a, b) => {
  const d = a - b
  return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))
}

// Given intersection points on a curve centered at (cx, cy), find the two points
// that lie on either side of modelPoint when walking around the center by angle.
const bracketIntersectionsByAngle = (intersections, cx, cy, modelPoint) => {
  if (!intersections || intersections.length < 2) return { first: null, second: null }

  const modelAngle = normalizeAngle(Math.atan2(modelPoint.y - cy, modelPoint.x - cx))

  const list = intersections
    .map(pt => ({
      point: pt,
      angle: normalizeAngle(Math.atan2(pt.y - cy, pt.x - cx))
    }))
    .sort((a, b) => a.angle - b.angle)

  // If modelAngle is (almost) exactly on an intersection, pick its neighbors.
  const exactIndex = list.findIndex(p => angularDistance(p.angle, modelAngle) <= eps)
  if (exactIndex !== -1) {
    const prev = list[(exactIndex - 1 + list.length) % list.length];
    const next = list[(exactIndex + 1) % list.length];
    return { first: prev, second: next }
  }

  // Otherwise, find the immediate preceding and following angles (with wrap-around).
  let followingIndex = list.findIndex(p => p.angle > modelAngle)
  if (followingIndex === -1) followingIndex = 0
  const precedingIndex = (followingIndex - 1 + list.length) % list.length

  return { first: list[precedingIndex], second: list[followingIndex] }
}


const indexOfSeg = (segs, segment) => {
  const index = segs.indexOf(segment)
  if (index !== -1) { return index }
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.type === 'lineSegment' && eqPt({ x: seg.x1, y: seg.y1 }, { x: segment.x1, y: segment.y1 }) &&
        eqPt({ x: seg.x2, y: seg.y2 }, { x: segment.x2, y: segment.y2 })) {
      return i
    } else if (seg.type === 'arc' && eqPt({ x: seg.cx, y: seg.cy }, { x: segment.cx, y: segment.cy }) &&
               Math.abs(seg.r) === Math.abs(segment.r) &&
               Math.abs(seg.startAngle - segment.startAngle) <= eps &&
               Math.abs(seg.endAngle - segment.endAngle) <= eps) {
      return i
    }
  }
  return -1
}

const erasePathSegment = (element, segment, first, second, dwg) => {
  // Erase a fragment of a path between the two nearest cut points: first.point and second.point
  if (!first || !second || !first.point || !second.point) { return }
  if (!segment) { return }
  if (element.attrs['data-freehand']) {
    // A freehand stroke's segments are sampled curve chords, not
    // vertex-to-vertex like a real path's — the index math below assumes
    // that correspondence, so erasing a fragment isn't supported here.
    alert("Erase is not supported for freehand strokes. Select and delete the whole stroke instead.")
    return
  }

  const segs = element.segments || []
  const points = element.points || []
  if (segs.length === 0) { return }

  // Use point-to-point endpoints instead of segment.x1/x2/... (works for both lineSegment and arc)
  const segIndex = indexOfSeg(segs, segment)
  if (segIndex < 0) { return }

  const segStartPt = points[segIndex]
  const segEndPt =
    points[segIndex + 1] ??
    ((/[Zz]/.test(element.attrs?.d || '')) ? points[0] : null)

  if (!segStartPt || !segEndPt) { return }

  const segStart = { x: segStartPt.x, y: segStartPt.y }
  const segEnd = { x: segEndPt.x, y: segEndPt.y }
  // A cut point inserted in the middle of an arc segment must keep that arc's
  // radius/direction (segEndPt.r), or the surviving fragment renders as a
  // straight line instead of a curve.
  const cutR = segment.type === 'arc' || segment.type === 'ellipticalArc' ? segEndPt.r : 0

  if (element.segments.length === 1 &&
      eqPt(first.point, segStart) &&
      eqPt(second.point, segEnd)) {
    // Erase the whole path
    dwgMgr.removeChild(dwg, element.attrs.id)
  } else if (points.length >= 3 && eqPt(points[0], points[points.length - 1])) {
    // Closed path: its last point repeats its first. Remove the segment, so the
    // path opens there: a new path from second.point around to first.point.
    const newPoints = []
    if (!eqPt(segEnd, second.point)) {
      newPoints.push({ x: second.point.x, y: second.point.y, r: 0 })
    }
    for (let i = segIndex + 1; i < points.length; i++) {
      newPoints.push({ x: points[i].x, y: points[i].y, r: points[i].r })
    }
    // Continue from points[1]; points[0] is the same point as the last one.
    for (let i = 1; i <= segIndex; i++) {
      newPoints.push({ x: points[i].x, y: points[i].y, r: points[i].r })
    }
    if (!eqPt(segStart, first.point)) {
      newPoints.push({ x: first.point.x, y: first.point.y, r: cutR })
    }
    const newD = utils.pointsToD(newPoints)
    dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { d: newD }, newPoints)
  } else if (eqPt({ x: points[0].x, y: points[0].y }, first.point)) {
    // Erase from start to first cut point
    const newPoints = points.slice(1)
    if (!eqPt(segEnd, second.point)) {
      newPoints.unshift({ x: second.point.x, y: second.point.y, r: 0 })
    }
    const newD = utils.pointsToD(newPoints)
    dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { d: newD }, newPoints)
  } else if (eqPt({ x: points[points.length - 1].x, y: points[points.length - 1].y }, second.point)) {
    // Erase from second cut point to end
    const newPoints = points.slice(0, -1)
    if (!eqPt(segStart, first.point)) {
      newPoints.push({ x: first.point.x, y: first.point.y, r: cutR })
    }
    const newD = utils.pointsToD(newPoints)
    dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { d: newD }, newPoints)
  } else {
    // Middle erase: split into two paths.
    const newPoints2 = points.slice(segIndex + 1)
    if (!eqPt(segEnd, second.point)) {
      newPoints2.unshift({ x: second.point.x, y: second.point.y, r: 0 })
    }
    const newD2 = utils.pointsToD(newPoints2)

    // Revise the first path's points.
    const newPoints1 = points.slice(0, segIndex + 1)
    if (!eqPt(segStart, first.point)) {
      newPoints1.push({ x: first.point.x, y: first.point.y, r: cutR })
    }
    const newD1 = utils.pointsToD(newPoints1)

    // Update the drawing.
    dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { d: newD1 }, newPoints1)
    const newPath = {
      tag: 'path',
      attrs: {
        // copy styling attrs from original; id assigned by dwgMgr
        ...Object.fromEntries(Object.entries(element.attrs || {}).filter(([k]) => k !== 'id' && k !== 'd')),
        d: newD2
      },
      points: newPoints2
    }
    dwgMgr.insertChildAfter(dwg, newPath, element.attrs.id)
  }

  recordHistory(null, dwg)
  rebuildIntersectPoints(dwg)
  return
}

// Erase a fragment of an arc segment within a path. Unlike a straight
// segment, an arc can't be approximated by its chord for intersection
// purposes -- a crossing line hits the curve itself, not the line between
// the arc's endpoints -- so this finds real intersections against the arc's
// actual circle (restricted to its angular span) and brackets the click
// point by angle around the arc's center rather than by linear distance.
const eraseArcSegment = (element, segment, modelPoint, elements, dwg) => {
  const cx = segment.cx
  const cy = segment.cy
  const r = Math.abs(segment.r)

  const segs = element.segments || []
  const points = element.points || []
  const segIndex = indexOfSeg(segs, segment)
  if (segIndex < 0) { return }
  const segStartPt = points[segIndex]
  const segEndPt =
    points[segIndex + 1] ??
    ((/[Zz]/.test(element.attrs?.d || '')) ? points[0] : null)
  if (!segStartPt || !segEndPt) { return }
  const segStart = { x: segStartPt.x, y: segStartPt.y }
  const segEnd = { x: segEndPt.x, y: segEndPt.y }

  // Seed with the arc's own endpoints so a single real crossing still
  // brackets correctly against one end of the arc.
  const intersections = [segStart, segEnd]
  const pushUnique = pt => {
    if (!intersections.some(p => eqPt(p, pt))) { intersections.push(pt) }
  }

  elements.forEach(el => {
    switch (el.tag) {
      case 'line':
      case 'rect':
      case 'path':
      case 'polygon':
        (el.segments || []).forEach(seg => {
          if (seg.type !== 'lineSegment') { return }
          const p1 = { x: seg.x1, y: seg.y1 }
          const p2 = { x: seg.x2, y: seg.y2 }
          lineCircleIntersections(p1, p2, cx, cy, r).forEach(pt => {
            const angle = normalizeAngle(Math.atan2(pt.y - cy, pt.x - cx))
            if (isAngleOnArc(segment.startAngle, segment.endAngle, segment.r, angle)) { pushUnique(pt) }
          })
        })
        break
    }
  })

  if (intersections.length < 2) { return }

  // bracketIntersectionsByAngle sorts by raw ascending angle and calls the
  // smaller-angle neighbor `first`, the larger-angle one `second`.
  // erasePathSegment instead expects `first` nearer segStart and `second`
  // nearer segEnd, in the arc's own travel order. Ascending angle matches
  // travel order only for a CCW arc (r >= 0); a CW arc (r < 0) travels by
  // decreasing angle, so first/second come back swapped and must be flipped.
  let { first, second } = bracketIntersectionsByAngle(intersections, cx, cy, modelPoint)
  if (!first || !second) { return }
  if (segment.r < 0) { [first, second] = [second, first] }

  erasePathSegment(element, segment, first, second, dwg)
}

// Erase a fragment of an elliptical arc step within a path (see arcStep.js),
// between the crossings (or the step's own ends) on either side of the click.
// Crossings are exact, measured against the true ellipse, and ordered by the
// ellipse's parametric angle along the step's direction of travel.
const eraseEllipticalArcSegment = (element, segment, modelPoint, elements, dwg) => {
  const segIndex = element.segments.indexOf(segment)
  const segStart = element.points[segIndex]
  const segEnd = element.points[segIndex + 1]
  if (!segStart || !segEnd) { return }
  // How far along the step a point is, as parametric angle from its start.
  const along = pt => {
    const t = ellipseParam(segment, pt)
    return segment.sweep >= 0 ? normalizeAngle(t - segment.t0) : normalizeAngle(segment.t0 - t)
  }
  const cuts = [{ point: { x: segStart.x, y: segStart.y }, u: 0 }, { point: { x: segEnd.x, y: segEnd.y }, u: Math.abs(segment.sweep) }]
  elements.forEach(el => {
    if (!['line', 'rect', 'path', 'polygon'].includes(el.tag)) { return }
    (el.segments || []).forEach(seg => {
      if (seg.type !== 'lineSegment') { return }
      lineArcIntersections({ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }, segment).forEach(pt => {
        const point = { x: pt.x, y: pt.y }
        if (!cuts.some(c => eqPt(c.point, point))) { cuts.push({ point, u: along(point) }) }
      })
    })
  })
  const uClick = along(modelPoint)
  let first = null
  let second = null
  cuts.forEach(c => {
    if (c.u <= uClick && (!first || c.u > first.u)) { first = c }
    if (c.u > uClick && (!second || c.u < second.u)) { second = c }
  })
  if (!first || !second) { return }
  erasePathSegment(element, segment, first, second, dwg)
}

const convertRectToPath = (element, dwg) => {
  element.tag = 'path'
  const attrs = element.attrs
  const points = [
    {x: attrs.x, y: attrs.y + attrs.height, r: 0},
    {x: attrs.x + attrs.width, y: attrs.y + attrs.height, r: 0},
    {x: attrs.x + attrs.width, y: attrs.y, r: 0},
    {x: attrs.x, y: attrs.y, r: 0},
    {x: attrs.x, y: attrs.y + attrs.height, r: 0}
  ];
  delete element.attrs.x
  delete element.attrs.y
  delete element.attrs.width
  delete element.attrs.height
  delete element.segments
  delete element.centroids
  delete element.midPoints
  delete element.endPoints
  element.points = points
  element.attrs.d = utils.pointsToD(points.slice(0, -1)) + ' Z'
  dwgMgr.swapChild(dwg, element.attrs.id, element)
}

const convertPolygonToPath = (element, dwg) => {
  element.tag = 'path'
  element.attrs.d = utils.pointsToD(element.points) + ' Z'
  element.points = element.points.map(pt => ({ x: pt.x, y: pt.y, r: 0 }))
  element.points.push({ x: element.points[0].x, y: element.points[0].y, r: 0 })
  delete element.segments
  delete element.centroids
  delete element.midPoints
  delete element.endPoints
  dwgMgr.swapChild(dwg, element.attrs.id, element)
}

export const eraseSegment = (event, appState, dwg) => {
  // Handle segment erasure
  const modelPoint = adjustForModel(event, appState, dwg) // Don't snap.
  const [element, segment] = nearestElementAndSegment(modelPoint, appState, dwg)
  if (element) {
    if (element.tag === "rect") {
      convertRectToPath(element, dwg)
    } else if (element.tag === "polygon") {
      convertPolygonToPath(element, dwg)
    }
    const elements = dwgMgr.getChildren(dwg)
    if (element.tag === 'path' && segment && segment.type === 'arc') {
      // An arc segment can't be treated as a straight reference line (see
      // eraseArcSegment) -- handle it separately from the line/lineSegment case below.
      eraseArcSegment(element, segment, modelPoint, elements, dwg)
      return
    }
    if (element.tag === 'path' && segment && segment.type === 'ellipticalArc') {
      eraseEllipticalArcSegment(element, segment, modelPoint, elements, dwg)
      return
    }
    if (element.tag === 'line' || element.tag === 'path') {
      // Determine which, if any, segments intersect the clicked line
      // Erase only the segment in the clicked line between the nearest intersections
      let lineStart, lineEnd
      if (element.tag === 'line') {
        lineStart = { x: element.attrs.x1, y: element.attrs.y1 }
        lineEnd = { x: element.attrs.x2, y: element.attrs.y2 }
      } else {
        // For other shapes, use the segment info (segment.type === 'lineSegment' here;
        // arc segments are handled above)
        if (!segment) { return }
        if (segment.type === 'lineSegment') {
          lineStart = { x: segment.x1, y: segment.y1 }
          lineEnd = { x: segment.x2, y: segment.y2 }
        } else {
          return
        }
      }
      // Initialize `intersections` with the start and end points of the line itself
      const intersections = [lineStart, lineEnd];
      elements.forEach(el => {
        // Check if any segment of the element intersects the selection box
        switch (el.tag) {
          case 'line':
          case 'rect':
          case 'path':
          case 'polygon':
            // Check each segment of the element
            el.segments.some(seg => {
              if (seg.type === 'lineSegment') {
                const p1 = { x: seg.x1, y: seg.y1 }
                const p2 = { x: seg.x2, y: seg.y2 }
                const result = linesIntersect(lineStart, lineEnd, p1, p2)
                if (result) {
                  let mustPush = true
                  for (let pt of intersections) {
                    if (eqPt(pt, result)) { mustPush = false; break }
                  }
                  if (mustPush) { intersections.push(result) }
                }
              } else if (seg.type === 'arc') {
                const cx = seg.cx
                const cy = seg.cy
                const r = Math.abs(seg.r)
                return lineCircleIntersections(
                  lineStart, lineEnd,
                  cx, cy, r
                ).forEach(pt => {
                  // Check if pt is within the arc angles
                  const anglePt = Math.atan2(pt.y - cy, pt.x - cx)
                  if (isAngleOnArc(seg.startAngle, seg.endAngle, seg.r, anglePt)) {
                    let mustPush = true
                    for (let p of intersections) {
                      if (eqPt(p, pt)) { mustPush = false; break }
                    }
                    if (mustPush) { intersections.push(pt) }
                  }
                })
              } else if (seg.type === 'ellipticalArc') {
                lineArcIntersections(lineStart, lineEnd, seg).forEach(({ x, y }) => {
                  const pt = { x, y }
                  if (!intersections.some(p => eqPt(p, pt))) { intersections.push(pt) }
                })
              }
            })
            break
          case 'circle': {
            const intrs = lineCircleIntersections(
              lineStart, lineEnd,
              el.attrs.cx, el.attrs.cy, el.attrs.r
            )
            intrs.forEach(pt => {
              let mustPush = true
              for (let p of intersections) {
                if (eqPt(p, pt)) { mustPush = false; break }
              }
              if (mustPush) { intersections.push(pt) }
            })
            break
          }

          case 'ellipse': {
            const intrs = lineEllipseIntersections(lineStart, lineEnd, el)
            intrs.forEach(pt => {
              let mustPush = true
              for (let p of intersections) {
                if (eqPt(p, pt)) { mustPush = false; break }
              }
              if (mustPush) { intersections.push(pt) }
            })
            break
          }
        }
      })

      // Sort the intersection points along the line
      intersections.sort((a, b) => {
        const da = Math.hypot(a.x - lineStart.x, a.y - lineStart.y)
        const db = Math.hypot(b.x - lineStart.x, b.y - lineStart.y)
        return da - db
      })
      
      if (intersections.length >= 2) {
        // Find immediately preceding and following intersection points to the modelPoint
        let first = null
        let second = null
        let precedingDistance = Infinity
        let followingDistance = Infinity
        const modelDistFromStart = Math.hypot(modelPoint.x - lineStart.x, modelPoint.y - lineStart.y)
        intersections.forEach(pt => {
          const dist = Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y)
          if (dist < modelDistFromStart) {
            const diff = modelDistFromStart - dist
            if (diff < precedingDistance) {
              precedingDistance = diff
              first = { point: pt, x: pt.x, y: pt.y }
            }
          } else {
            const diff = dist - modelDistFromStart
            if (diff < followingDistance) {
              followingDistance = diff
              second = { point: pt, x: pt.x, y: pt.y }
            }
          }
        })
        if (element.tag === 'line') {
          if (first && second) {
            if (first.x === lineStart.x && first.y === lineStart.y &&
                second.x === lineEnd.x && second.y === lineEnd.y) {
              // Erasure covers the whole line
              dwgMgr.removeChild(dwg, element.attrs.id)
            } else if (first.x === lineStart.x && first.y === lineStart.y) {
              // Erasure starts at the beginning of the line
              // Update the line to start from the second intersection point
              const updatedLine = {
                tag: 'line',
                attrs: {
                  x1: second.point.x,
                  y1: second.point.y,
                  x2: element.attrs.x2,
                  y2: element.attrs.y2,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'],
                  'stroke-dasharray': element.attrs['stroke-dasharray']
                }
              }
              dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, updatedLine.attrs)
            } else if (second.x === lineEnd.x && second.y === lineEnd.y) {
              // Erasure ends at the end of the line
              // Update the line to end at the first intersection point
              const updatedLine = {
                tag: 'line',
                attrs: {
                  x1: element.attrs.x1,
                  y1: element.attrs.y1,
                  x2: first.point.x,
                  y2: first.point.y,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'],
                  'stroke-dasharray': element.attrs['stroke-dasharray']
                }
              }
              dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, updatedLine.attrs)
            } else {
              // Break the current line into two lines, omitting the erased segment
              // First line: from start to first intersection
              const firstLine = {
                tag: 'line',
                attrs: {
                  x1: element.attrs.x1,
                  y1: element.attrs.y1,
                  x2: first.point.x,
                  y2: first.point.y,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'],
                  'stroke-dasharray': element.attrs['stroke-dasharray']
                }
              }
              // Second line: from second intersection to end
              const secondLine = {
                tag: 'line',
                attrs: {
                  x1: second.point.x,
                  y1: second.point.y,
                  x2: element.attrs.x2,
                  y2: element.attrs.y2,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'],
                  'stroke-dasharray': element.attrs['stroke-dasharray']
                }
              }
              // Update the drawing
              dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, firstLine.attrs)
              dwgMgr.insertChildAfter(dwg, secondLine, element.attrs.id)
            }
          recordHistory(null, dwg) // Tecord the whole drawing state
          rebuildIntersectPoints(dwg)
          }
        } else if (element.tag === 'path') {
          erasePathSegment(element, segment, first, second, dwg)
        }
      }

    } else if (element.tag === 'circle') {
      const cx = element.attrs.cx
      const cy = element.attrs.cy
      const r = element.attrs.r
      const intersections = [];
      elements.forEach(el => {
        if (el.attrs.id === element.attrs.id) { return }
        switch (el.tag) {
          case 'line':
          case 'rect':
          case 'path':
          case 'polygon':
            el.segments.some(seg => {
              if (seg.type === 'lineSegment') {
                const p1 = { x: seg.x1, y: seg.y1 }
                const p2 = { x: seg.x2, y: seg.y2 }
                const result = lineCircleIntersections(p1, p2, cx, cy, r)
                result.forEach(pt => {
                  let mustPush = true
                  for (let p of intersections) {
                    if (eqPt(p, pt)) { mustPush = false; break }
                  }
                  if (mustPush) { intersections.push(pt) }
                })
              }
            })
            break
        }
      })
      if (intersections.length >= 2) {
        // Find the two intersection points that bracket the modelPoint around the circle
        let { first, second } = bracketIntersectionsByAngle(intersections, cx, cy, modelPoint)

        // Erase the arc segment between first.point and second.point
        if (first && second) {
          // We'll create a CCW arc from first to second
          // Find the angles of the intersection points and the modelPoint
          let angleFirst = normalizeAngle(Math.atan2(first.point.y - cy, first.point.x - cx))
          let angleSecond = normalizeAngle(Math.atan2(second.point.y - cy, second.point.x - cx))
          const angleModel = normalizeAngle(Math.atan2(modelPoint.y - cy, modelPoint.x - cx))
          let startAngle, endAngle
          // Sort first and second so that an arc runs CCW from startAngle to endAngle
          if (angleFirst > angleSecond) {
            const temp = first
            first = second
            second = temp
            let tempAngle = angleFirst
            angleFirst = angleSecond
            angleSecond = tempAngle
          }
          // Now involve the modelPoint to decide which arc to keep
          if (angleModel > angleFirst && angleModel < angleSecond) {
            startAngle = angleSecond
            endAngle = angleFirst + 2 * Math.PI
            const temp = first
            first = second
            second = temp
          } else {
            startAngle = angleFirst
            endAngle = angleSecond
          }
          const keptAngle = endAngle - startAngle
          if (Math.abs(keptAngle) <= eps) {
            // Erasure covers the whole circle
            dwgMgr.removeChild(dwg, element.attrs.id)
          } else {
            // Update the circle to a path arc excluding the erased part
            element.tag = 'path'
            delete element.attrs.cx
            delete element.attrs.cy
            delete element.attrs.r
            element.points = [
              { x: first.point.x, y: first.point.y, r: 0 },
              { x: second.point.x, y: second.point.y, r: r }
            ];
            // Sketch stringify does not support a large-arc-flag. If the remaining arc is
            // larger than 180 degrees, construct a path with two arc segments.
            let d = ''
            if (keptAngle > Math.PI) {
              const midAngle = normalizeAngle((startAngle + endAngle) / 2)
              const midPoint = {
                x: cx + r * Math.cos(midAngle),
                y: cy + r * Math.sin(midAngle)
              }
              element.points.splice(1, 0, { x: midPoint.x, y: midPoint.y, r: r })
              d = `M ${first.point.x} ${first.point.y} A ${r} ${r} 0 0 1 ${midPoint.x} ` +
                  `${midPoint.y} A ${r} ${r} 0 0 1 ${second.point.x} ${second.point.y}`
            } else {
              d = `M ${first.point.x} ${first.point.y} A ${r} ${r} 0 0 1 ${second.point.x} ${second.point.y}`
            }
            element.attrs.d = d
            dwgMgr.swapChild(dwg, element.attrs.id, element)
          }
          recordHistory(null, dwg) // Record the whole drawing state
          rebuildIntersectPoints(dwg)
        }
      } else {
        // Erase whole circle
        dwgMgr.removeChild(dwg, element.attrs.id)
        recordHistory(null, dwg) // Record the whole drawing state
        rebuildIntersectPoints(dwg)
      }
    } else if (element.tag === 'ellipse') {
      const cx = element.attrs.cx
      const cy = element.attrs.cy
      const rx = element.attrs.rx
      const ry = element.attrs.ry
      const angle = element.angle || 0
      // The whole ellipse, as an arc (see arcStep.js), for exact crossings.
      const fullEllipse = { cx, cy, rx, ry, angle, t0: 0, sweep: 2 * Math.PI }
      const intersections = [];

      elements.forEach(el => {
        if (el.attrs.id === element.attrs.id) { return }
        switch (el.tag) {
          case 'line':
          case 'rect':
          case 'path':
          case 'polygon':
            el.segments.some(seg => {
              if (seg.type === 'lineSegment') {
                const p1 = { x: seg.x1, y: seg.y1 }
                const p2 = { x: seg.x2, y: seg.y2 }

                const intrs = lineArcIntersections(p1, p2, fullEllipse)
                intrs.forEach(pt => {
                  let mustPush = true
                  for (let p of intersections) {
                    if (eqPt(p, pt)) { mustPush = false; break }
                  }
                  if (mustPush) { intersections.push({ x: pt.x, y: pt.y }) }
                })
              }
            })
            break
        }
      })
      if (intersections.length >= 2) {
        // Find the two intersection points that bracket the modelPoint around the ellipse
        let { first, second } = bracketIntersectionsByAngle(intersections, cx, cy, modelPoint)

        // Erase the arc segment between first.point and second.point
        if (first && second) {
          // We'll create a CCW arc from first to second
          // Find the angles of the intersection points and the modelPoint
          let angleFirst = normalizeAngle(Math.atan2(first.point.y - cy, first.point.x - cx));
          let angleSecond = normalizeAngle(Math.atan2(second.point.y - cy, second.point.x - cx));
          const angleModel = normalizeAngle(Math.atan2(modelPoint.y - cy, modelPoint.x - cx))
          // Sort first and second so that an arc runs CCW from first to second
          if (angleFirst > angleSecond) {
            const temp = first
            first = second
            second = temp
            let tempAngle = angleFirst
            angleFirst = angleSecond
            angleSecond = tempAngle
          }
          // Now involve the modelPoint to decide which arc to keep
          if (angleModel > angleFirst && angleModel < angleSecond) {
            const temp = first
            first = second
            second = temp
          }
          // Measure the kept arc by the ellipse's parametric angle, which is
          // what an arc step's half-ellipse limit is measured in.
          const tFirst = ellipseParam(fullEllipse, first.point)
          const keptParam = normalizeAngle(ellipseParam(fullEllipse, second.point) - tFirst)
          if (keptParam <= eps || eqPt(first.point, second.point)) {
            // Erasure covers the whole ellipse
            dwgMgr.removeChild(dwg, element.attrs.id)
          } else {
            // Update the ellipse to a path arc excluding the erased part
            element.tag = 'path'
            delete element.attrs.cx
            delete element.attrs.cy
            delete element.attrs.transform
            delete element.angle
            delete element.attrs.rx
            delete element.attrs.ry
            const r = [rx, ry, angle] // CCW (see arcStep.js)
            element.points = [
              { x: first.point.x, y: first.point.y, r: 0 },
              { x: second.point.x, y: second.point.y, r }
            ];
            // An arc step spans at most half its ellipse. If the remaining arc
            // is larger, split it in two at its midpoint.
            if (keptParam > Math.PI) {
              const midPoint = ellipsePoint(fullEllipse, tFirst + keptParam / 2)
              element.points.splice(1, 0, { x: midPoint.x, y: midPoint.y, r })
            }
            element.attrs.d = utils.pointsToD(element.points)
            dwgMgr.swapChild(dwg, element.attrs.id, element)
          }
          recordHistory(null, dwg) // Record the whole drawing state
          rebuildIntersectPoints(dwg)
        }
      } else {
        // Erase whole ellipse
        dwgMgr.removeChild(dwg, element.attrs.id)
        recordHistory(null, dwg) // Record the whole drawing state
        rebuildIntersectPoints(dwg)
      }
    }
  }
}
