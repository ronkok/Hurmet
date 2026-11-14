import { adjustForSnapAndLock, nearestElementAndSegment, isAngleOnArc, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { utils } from './utils.js'
import { lineCircleIntersections, lineEllipseIntersections } from './snap.js'
import { recordHistory } from './history.js'
import { ellipseParam, ellipsePoint } from './arcStep.js'

// CCW sweep angle from aStart to aEnd, in [0, 2*PI).
const ccwDelta = (aStart, aEnd) => {
  const d = utils.norm(aEnd) - utils.norm(aStart)
  return d >= 0 ? d : d + utils.TAU
}

// Helpers
const sideOfLine = (line, p) => {
  // Positive/negative indicates which side of the (infinite) directed line p lies on.
  const vx = line.x2 - line.x1
  const vy = line.y2 - line.y1
  const wx = p.x - line.x1
  const wy = p.y - line.y1
  const c = vx * wy - vy * wx
  if (Math.abs(c) <= utils.EPS) return 0
  return c > 0 ? 1 : -1
}

const intersectionOnLineSegment = (line, seg) => {
  // seg is a finite line segment. line is treated as infinite (consistent with other trim cases).
  const pt = intersectionOfTwoLines(line, seg)
  if (!pt) return null
  const minX = Math.min(seg.x1, seg.x2)
  const maxX = Math.max(seg.x1, seg.x2)
  const minY = Math.min(seg.y1, seg.y2)
  const maxY = Math.max(seg.y1, seg.y2)
  if (pt.x < minX - utils.EPS || pt.x > maxX + utils.EPS || pt.y < minY - utils.EPS || pt.y > maxY + utils.EPS) return null
  return pt
}

const tOnLineSegment = (seg, pt) => {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dx) <= utils.EPS) return 0
    return (pt.x - seg.x1) / dx
  } else {
    if (Math.abs(dy) <= utils.EPS) return 0
    return (pt.y - seg.y1) / dy
  }
}

const intersectionOfTwoLines = (line1, line2) => {
  // line1 and line2 are objects with x1, y1, x2, y2
  const x1 = line1.x1
  const y1 = line1.y1
  const x2 = line1.x2
  const y2 = line1.y2
  const x3 = line2.x1
  const y3 = line2.y1
  const x4 = line2.x2
  const y4 = line2.y2

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (denom === 0) {
    return null // Lines are parallel
  }
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
  return { x: px, y: py }
}

const intersectionOfLineAndSegments = (line, segments) => {
  const segmentIndices = [];
  const intersectPts = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const pt = intersectionOfTwoLines(line, seg);
    if (pt) {
      // Check if the intersection point is within the segment bounds
      const minX = Math.min(seg.x1, seg.x2)
      const maxX = Math.max(seg.x1, seg.x2)
      const minY = Math.min(seg.y1, seg.y2)
      const maxY = Math.max(seg.y1, seg.y2)
      if (pt.x >= minX - utils.EPS && pt.x <= maxX + utils.EPS && pt.y >= minY - utils.EPS && pt.y <= maxY + utils.EPS) {
        // Avoid duplicates
        let isDuplicate = false;
        for (let j = 0; j < intersectPts.length; j++) {
          if (Math.abs(intersectPts[j].x - pt.x) < utils.EPS && Math.abs(intersectPts[j].y - pt.y) < utils.EPS) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          intersectPts.push(pt)
          segmentIndices.push(i)
        }
      }
    }
  }
  return [intersectPts, segmentIndices];
}

// How far along an arc segment's own travel direction (0 at startAngle, 1 at
// endAngle -- CCW for r >= 0, CW for r < 0) a given angle falls. Callers must
// only pass an angle already known to lie on the segment (e.g. via isAngleOnArc).
const arcTravelFraction = (seg, angle) => {
  const isCCW = seg.r >= 0
  const span = isCCW ? ccwDelta(seg.startAngle, seg.endAngle) : ccwDelta(seg.endAngle, seg.startAngle)
  const pos = isCCW ? ccwDelta(seg.startAngle, angle) : ccwDelta(angle, seg.startAngle)
  return span > utils.EPS ? pos / span : 0
}

// The arc segment's true geometric midpoint (its visual "apex"), respecting
// its actual travel direction -- NOT its chord midpoint, which can fall on
// the wrong side of a reference line that crosses the curve without crossing
// the chord. Mirrors getCircularArcParams's (fixed) apex computation.
const arcApexPoint = seg => {
  const isCCW = seg.r >= 0
  const delta = isCCW ? ccwDelta(seg.startAngle, seg.endAngle) : -ccwDelta(seg.endAngle, seg.startAngle)
  const midAngle = utils.norm(seg.startAngle + delta / 2)
  const r = Math.abs(seg.r)
  return { x: seg.cx + r * Math.cos(midAngle), y: seg.cy + r * Math.sin(midAngle) }
}

// Where an (infinite) reference line crosses an arc segment's visible curve.
// Unlike a straight segment, this commonly returns two points, not zero or one.
const intersectionsOnArcSegment = (line, seg) => {
  const r = Math.abs(seg.r)
  const candidates = lineCircleIntersections(
    { x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 },
    seg.cx, seg.cy, r,
    false // the reference line is infinite, consistent with intersectionOnLineSegment
  )
  const hits = []
  for (const pt of candidates) {
    const angle = utils.norm(Math.atan2(pt.y - seg.cy, pt.x - seg.cx))
    if (!isAngleOnArc(seg.startAngle, seg.endAngle, seg.r, angle)) continue
    hits.push({ pt, t: arcTravelFraction(seg, angle) })
  }
  return hits
}

// Where a path's free end (its very first or very last point) would land if
// EXTENDED along its own segment's geometry to meet the (infinite) reference
// line -- or null if extension is geometrically impossible: parallel lines
// for a straight segment, or (per the caller's short-radius question) a
// circular arc whose radius can't reach a reference line that passes farther
// from its center than the radius, regardless of angular span.
// Callers must only call this when the segment is already known to have NO
// intersection with the reference line within its current extent.
const extendedEndpoint = (seg, isFirst, referenceLine) => {
  if (seg.type === 'lineSegment') {
    const pt = intersectionOfTwoLines(referenceLine, seg)
    if (!pt) return null // parallel; can't extend
    // The extended point must continue PAST the free end, away from the
    // segment's other (anchored) end -- not require the segment to run
    // backward through its own anchor to reach the line.
    const anchor = isFirst ? { x: seg.x2, y: seg.y2 } : { x: seg.x1, y: seg.y1 }
    const free = isFirst ? { x: seg.x1, y: seg.y1 } : { x: seg.x2, y: seg.y2 }
    const dirX = free.x - anchor.x, dirY = free.y - anchor.y
    const extX = pt.x - free.x, extY = pt.y - free.y
    if (dirX * extX + dirY * extY < 0) return null
    return { x: pt.x, y: pt.y, r: 0 }
  } else if (seg.type === 'arc') {
    const r = Math.abs(seg.r)
    // Full-circle intersections -- NOT bounded to the segment's current
    // angular span, since extending means growing that span to reach the line.
    const candidates = lineCircleIntersections(
      { x: referenceLine.x1, y: referenceLine.y1 }, { x: referenceLine.x2, y: referenceLine.y2 },
      seg.cx, seg.cy, r,
      false
    )
    if (candidates.length === 0) return null // reference line doesn't come within the circle's radius
    // Two candidates are possible; extend toward whichever needs the LEAST
    // additional sweep, continuing the arc's own travel direction PAST this
    // free end (away from its other, anchored end) -- not toward whichever
    // is nearer in straight-line distance, which could pick the wrong side
    // of the circle and make the arc balloon most of the way around.
    const isCCW = seg.r >= 0
    let best = null, bestExtra = Infinity
    for (const pt of candidates) {
      const angle = utils.norm(Math.atan2(pt.y - seg.cy, pt.x - seg.cx))
      const extra = isFirst
        ? (isCCW ? ccwDelta(angle, seg.startAngle) : ccwDelta(seg.startAngle, angle))
        : (isCCW ? ccwDelta(seg.endAngle, angle) : ccwDelta(angle, seg.endAngle))
      if (extra < bestExtra) { bestExtra = extra; best = { x: pt.x, y: pt.y } }
    }
    return { x: best.x, y: best.y, r: seg.r }
  }
  return null
}

/**
 * Given exactly two intersection points with a curve centered at (cx, cy),
 * choose the endpoint ordering (x1,y1)->(x2,y2) such that the CCW arc from
 * start to end contains the clicked point angle.
 *
 * Returns: { x1, y1, x2, y2, aStart, aEnd, sweepAngle }
 */
// The path that replaces a trimmed circle or ellipse: its kept arc, through
// `points`, with the original's stroke and fill.
const keptArcElement = (element, points) => {
  const attrs = withoutKeys(element.attrs, ['cx', 'cy', 'r', 'rx', 'ry', 'transform'])
  attrs.d = utils.pointsToD(points)
  return { tag: 'path', attrs, points }
}

// A copy of attrs without the given keys.
const withoutKeys = (attrs, keys) => Object.fromEntries(Object.entries(attrs).filter(([k]) => !keys.includes(k)))

const chooseCCWArcEndpoints = (intersectPts, cx, cy, clickedPoint) => {
  // True if aTest lies on the CCW arc from aStart to aEnd (inclusive)
  const onCCWArc = (aStart, aTest, aEnd) => {
    const span = ccwDelta(aStart, aEnd)
    const at = ccwDelta(aStart, aTest)
    return at <= span + utils.EPS
  }

  const modelAngle = utils.norm(Math.atan2(clickedPoint.y - cy, clickedPoint.x - cx))

  const a0 = utils.norm(Math.atan2(intersectPts[0].y - cy, intersectPts[0].x - cx))
  const a1 = utils.norm(Math.atan2(intersectPts[1].y - cy, intersectPts[1].x - cx))

  // Choose the endpoint ordering whose CCW arc contains the clicked modelAngle.
  let x1, y1, x2, y2, aStart, aEnd
  if (onCCWArc(a0, modelAngle, a1)) {
    x1 = intersectPts[0].x; y1 = intersectPts[0].y
    x2 = intersectPts[1].x; y2 = intersectPts[1].y
    aStart = a0; aEnd = a1
  } else {
    x1 = intersectPts[1].x; y1 = intersectPts[1].y
    x2 = intersectPts[0].x; y2 = intersectPts[0].y
    aStart = a1; aEnd = a0
  }

  const sweepAngle = ccwDelta(aStart, aEnd)
  return { x1, y1, x2, y2, aStart, aEnd, sweepAngle }
}

export const trimTool = Object.freeze({
  setReferenceLineSegment(event, appState, dwg) {
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const [element, segment, segIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
    if (element && segment && segment.type !== 'lineSegment') {
      // The reference "line" must be straight -- the whole tool (sideOfLine,
      // intersectionOfTwoLines, etc.) assumes x1/y1/x2/y2, which an arc or
      // circle segment doesn't have. Clicking a curve here would otherwise
      // silently store garbage and corrupt every trim done against it.
      console.warn('Trim: the reference line must be straight; a curved segment cannot be used as the reference line.')
      return
    }
    if (element && segment) {
      // Find the end coords of the reference segment. Store the reference line in appState.
      appState.referenceLine = structuredClone(segment)
      // In the temporary layer, draw an orange line indicating the reference line.
      const refLineId = 'reference-line'
      // Remove any existing reference line.
      dwgMgr.clearTempElements(dwg)
      // Create new reference line element.
      const lineElement = {
        tag: 'line',
        attrs: {
          id: refLineId,
          x1: appState.referenceLine.x1,
          y1: appState.referenceLine.y1,
          x2: appState.referenceLine.x2,
          y2: appState.referenceLine.y2,
          stroke: '#ff8c00',
          'stroke-width': 2,
          'stroke-linecap': 'round'
        }
      }
      dwgMgr.pushTempElement(dwg, lineElement)
    } else {
      appState.referenceLine = null          
    }
  },
  trimElement(event, appState, dwg) {
    // Trim a single element to appState.referenceLine.
    if (!appState.referenceLine) { return; }
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const [element, segment, segIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
    if (element) {
      switch(element.tag) {
        case 'line': {          
          // Find intersection point of this line with appState.referenceLine.
          // Trim the line to that point. Delete the clicked segment.
          const intersectPt = intersectionOfTwoLines(appState.referenceLine, segment)
          if (!intersectPt) { return; }
          // Determine which part of the line was clicked, and keep that part.
          let keepSide = sideOfLine(appState.referenceLine, modelPoint)
          if (keepSide === 0) { return; }
          // Move the end that lies beyond the intersection, as seen from the click.
          // Projecting onto the segment handles both trimming and extending. (Asking
          // which side of the reference line the start point is on does not: when the
          // whole line is on one side, that always moved the end point.)
          const dx = segment.x2 - segment.x1
          const dy = segment.y2 - segment.y1
          const tClick = (modelPoint.x - segment.x1) * dx + (modelPoint.y - segment.y1) * dy
          const tInt = (intersectPt.x - segment.x1) * dx + (intersectPt.y - segment.y1) * dy
          if (tClick > tInt) {
            // Trim the start point to the intersection.
            dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { x1: intersectPt.x, y1: intersectPt.y })
          } else {
            // Trim the end point to the intersection.
            dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { x2: intersectPt.x, y2: intersectPt.y })
          }
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
          break
        }
        case 'rect': {
          // Trim a rect to the reference line by converting it to a path (open polyline)
          // and keeping the perimeter run that contains the clicked segment.
          // IMPORTANT: Do not read geometry from attrs; use element.segments (top, right, bottom, left).
          if (!element.segments || element.segments.length !== 4) { return; }

          const [intersectPts, intersectedSegmentIndices] = intersectionOfLineAndSegments(
            appState.referenceLine,
            element.segments
          )
          if (!intersectPts || intersectPts.length < 2) { return; }

          // Identify which rect segment was clicked (0..3) by matching coords.
          const clickedSegIndex = segIndex;
          if (clickedSegIndex === -1) { return; }

          const numSides = element.segments.length // 4

          // For a convex polygon (rect), the reference line intersects in at most 2 distinct points.
          // Choose the direction along element.segments order (top,right,bottom,left) that includes clickedSegIndex.
          let startIdx = intersectedSegmentIndices[0]
          let endIdx = intersectedSegmentIndices[1]
          let startPoint = intersectPts[0]
          let endPoint = intersectPts[1]

          if (startIdx < clickedSegIndex && clickedSegIndex < endIdx) {
            // Keep as-is.
          } else if (startIdx === clickedSegIndex) {
            // Decide which of the two intersections is "ahead" along this segment, relative to the click.
            const segStartPt = { x: element.segments[startIdx].x1, y: element.segments[startIdx].y1 }
            const distToStartPoint = utils.distance(segStartPt, startPoint)
            const distToModelPoint = utils.distance(segStartPt, modelPoint)
            if (distToModelPoint < distToStartPoint) {
              // Swap
              ;[startIdx, endIdx] = [endIdx, startIdx]
              startPoint = intersectPts[1]
              endPoint = intersectPts[0]
            }
          } else if (endIdx === clickedSegIndex) {
            // Symmetric decision when clicked segment equals endIdx.
            const segStartPt = { x: element.segments[endIdx].x1, y: element.segments[endIdx].y1 }
            const distToEndPoint = utils.distance(segStartPt, endPoint)
            const distToModelPoint = utils.distance(segStartPt, modelPoint)
            if (distToModelPoint > distToEndPoint) {
              // Swap
              ;[startIdx, endIdx] = [endIdx, startIdx]
              startPoint = intersectPts[1]
              endPoint = intersectPts[0]
            }
          } else {
            // clickedSegIndex is outside [startIdx, endIdx] in cyclic order; swap to take the wrapped run.
            ;[startIdx, endIdx] = [endIdx, startIdx]
            startPoint = intersectPts[1]
            endPoint = intersectPts[0]
          }

          if (endIdx < startIdx) {
            endIdx += numSides
          }

          // Build new path points starting at startPoint, walking along rect edges in stored order,
          // and ending at endPoint (open path).
          const newPathPoints = [{ x: startPoint.x, y: startPoint.y, r: 0 }]
          for (let i = startIdx; i < endIdx; i++) {
            const currIdx = i % numSides
            newPathPoints.push({
              x: element.segments[currIdx].x2,
              y: element.segments[currIdx].y2,
              r: 0
            })
          }
          newPathPoints.push({ x: endPoint.x, y: endPoint.y, r: 0 })

          const pathElement = {
            tag: 'path',
            // All of the rect's own attrs (stroke, width, dash, fill, groups…), with the new geometry.
            attrs: { ...withoutKeys(element.attrs, ['x', 'y', 'width', 'height']), d: utils.pointsToD(newPathPoints) },
            points: newPathPoints
          }

          dwgMgr.swapChild(dwg, element.attrs.id, pathElement)
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
          break
        }
        case 'circle': {
          const intersectPts = lineCircleIntersections(
            {x: appState.referenceLine.x1, y: appState.referenceLine.y1},
            {x: appState.referenceLine.x2, y: appState.referenceLine.y2},
            element.attrs.cx, element.attrs.cy, element.attrs.r, false
          )
          if (!intersectPts || intersectPts.length < 2) { return; }

          const cx = element.attrs.cx
          const cy = element.attrs.cy

          const { x1, y1, x2, y2, aStart, sweepAngle } =
            chooseCCWArcEndpoints(intersectPts, cx, cy, modelPoint)

          // The kept arc runs CCW (positive r). An arc step spans at most
          // half its circle, so split a longer one at its midpoint.
          const r = element.attrs.r
          const points = [{ x: x1, y: y1, r: 0 }, { x: x2, y: y2, r }]
          if (sweepAngle > Math.PI) {
            const mid = aStart + sweepAngle / 2
            points.splice(1, 0, { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid), r })
          }
          const arcElement = keptArcElement(element, points)

          dwgMgr.swapChild(dwg, element.attrs.id, arcElement)
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
          break
        }
        case 'ellipse': {
          const intersectPts = lineEllipseIntersections(
            {x: appState.referenceLine.x1, y: appState.referenceLine.y1},
            {x: appState.referenceLine.x2, y: appState.referenceLine.y2},
            element,
            false
          )
          if (!intersectPts || intersectPts.length < 2) { return; }

          const cx = element.attrs.cx
          const cy = element.attrs.cy

          const { x1, y1, x2, y2 } =
            chooseCCWArcEndpoints(intersectPts, cx, cy, modelPoint)

          // The kept arc runs CCW, as an elliptical arc step (see arcStep.js).
          // A step spans at most half its ellipse, measured by parametric
          // angle, so split a longer one at its midpoint.
          const { rx, ry } = element.attrs
          const whole = { cx, cy, rx, ry, angle: element.angle || 0 }
          const r = [rx, ry, whole.angle]
          const points = [{ x: x1, y: y1, r: 0 }, { x: x2, y: y2, r }]
          const t1 = ellipseParam(whole, { x: x1, y: y1 })
          const kept = utils.norm(ellipseParam(whole, { x: x2, y: y2 }) - t1)
          if (kept > Math.PI) {
            points.splice(1, 0, { ...ellipsePoint(whole, t1 + kept / 2), r })
          }
          const arcElement = keptArcElement(element, points)

          dwgMgr.swapChild(dwg, element.attrs.id, arcElement)
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
          break
        }
        case 'polygon': {
          const [intersectPts, intersectedSegmentIndices] = intersectionOfLineAndSegments(
            appState.referenceLine,
            element.segments
          )
          if (intersectPts.length < 2) { return; }
          // Identify which segment was clicked. We want to keep it.
          // Use the nearest segment's index, as for rects. (Not the click's angle around the
          // centroid: that assumed the unrotated, CCW polygon the polygon tool draws, which
          // a rotated or mirrored polygon isn't.)
          const numSides = element.segments.length;
          const clickedSegIndex = segIndex;
          if (clickedSegIndex === -1) { return; }

          // Walk element.segments in stored order from intersectPts[0] to intersectPts[1].
          // If we reach clickedSegIndex first, we keep that run and trim to intersectPts[1].
          // Otherwise, we keep the wrapped run from intersectPts[1] to intersectPts[0].

          let startIdx = intersectedSegmentIndices[0];
          let endIdx = intersectedSegmentIndices[1];
          let startPoint = intersectPts[0];
          let endPoint = intersectPts[1];
          if (startIdx < clickedSegIndex && clickedSegIndex < endIdx) {
            // Keep startIdx and endIdx as is.
          } else if (startIdx === clickedSegIndex) {
            // Keep startIdx as is if the distance from segStartPt to modelPoint
            // is larger than distance from segStartPt to startPoint. Otherwise, swap.
            const segStartPt = { x: element.segments[startIdx].x1, y: element.segments[startIdx].y1 };
            const distToStartPoint = utils.distance(segStartPt, startPoint);
            const distToModelPoint = utils.distance(segStartPt, modelPoint);
            if (distToModelPoint < distToStartPoint) {
              // Swap
              ;[startIdx, endIdx] = [endIdx, startIdx];
              startPoint = intersectPts[1];
              endPoint = intersectPts[0];
            }
          } else if (endIdx === clickedSegIndex) {
            // Keep endIdx as is if the distance from segStartPt to modelPoint is less than
            // distance from segStartPt to endPoint. Otherwise, swap.
            const segStartPt = { x: element.segments[endIdx].x1, y: element.segments[endIdx].y1 };
            const distToEndPoint = utils.distance(segStartPt, endPoint)
            const distToModelPoint = utils.distance(segStartPt, modelPoint)
            if (distToModelPoint > distToEndPoint) {
              // Swap
              ;[startIdx, endIdx] = [endIdx, startIdx];
              startPoint = intersectPts[1];
              endPoint = intersectPts[0];
            }
          } else {
            // Swap startIdx and endIdx
            ;[startIdx, endIdx] = [endIdx, startIdx];
            startPoint = intersectPts[1];
            endPoint = intersectPts[0];
          }
          if (endIdx < startIdx) {
            endIdx += numSides;
          }

          // Build new path points starting from startIdx, in stored order, to the next intersection.
          const newPathPoints = [startPoint];
          for (let i = startIdx; i < endIdx; i++) {
            const currIdx = i % element.segments.length;
            // Add segment end point
            newPathPoints.push({ x: element.segments[currIdx].x2, y: element.segments[currIdx].y2, r: 0 })
          }
          endPoint.r = 0
          newPathPoints.push(endPoint)

          const pathElement = {
            tag: 'path',
            // All of the polygon's own attrs (stroke, width, dash, fill, groups…), with the new geometry.
            attrs: { ...withoutKeys(element.attrs, ['points']), d: utils.pointsToD(newPathPoints) },
            points: newPathPoints
          };
          dwgMgr.swapChild(dwg, element.attrs.id, pathElement);
          recordHistory(null, dwg);
          rebuildIntersectPoints(dwg)
          break
        }
        case 'path': {
          if (element.attrs['data-freehand']) {
            // A freehand stroke's segments are sampled curve chords, not
            // vertex-to-vertex like a real path's, so the vertex-index math
            // below doesn't apply. Trim isn't supported for freehand.
            alert("Trim is not supported for freehand strokes.")
            return
          }
          if (element.segments.some(seg => seg.type === 'ellipticalArc')) {
            alert("Trim and extend are not yet supported for a path with an elliptical arc.")
            return
          }
          // Trim a polyline/arc-mixed path against appState.referenceLine.
          // Keep all path portions on the SAME side of the reference line as the clicked segment.
          // If the path zig-zags across the line, this can create multiple kept pieces => multiple new paths.
          if (!element.segments || element.segments.length === 0) { return }

          // Find clicked segment index (in element.segments order).
          const clickedSegIndex = element.segments.findIndex(s => {
            if (!s || !segment || s.type !== segment.type) return false
            if (s.type === 'lineSegment') {
              return Math.abs(s.x1 - segment.x1) < 1e-6 &&
                     Math.abs(s.y1 - segment.y1) < 1e-6 &&
                     Math.abs(s.x2 - segment.x2) < 1e-6 &&
                     Math.abs(s.y2 - segment.y2) < 1e-6
            } else if (s.type === 'arc') {
              return Math.abs(s.cx - segment.cx) < 1e-6 &&
                     Math.abs(s.cy - segment.cy) < 1e-6 &&
                     Math.abs(Math.abs(s.r) - Math.abs(segment.r)) < 1e-6 &&
                     Math.abs(s.startAngle - segment.startAngle) < 1e-6 &&
                     Math.abs(s.endAngle - segment.endAngle) < 1e-6
            }
            return false
          })
          if (clickedSegIndex === -1) { return }

          // Determine which side we should KEEP, based on the modelPoint.
          let keepSide = sideOfLine(appState.referenceLine, modelPoint)
          if (keepSide === 0) { return }

          // Collect all intersections between the reference line and the path segments.
          // An arc segment commonly contributes two intersections, not zero or one.
          const rawIntersections = []
          for (let i = 0; i < element.segments.length; i++) {
            const seg = element.segments[i]
            if (seg.type === 'arc') {
              for (const hit of intersectionsOnArcSegment(appState.referenceLine, seg)) {
                rawIntersections.push({ segIndex: i, t: hit.t, pt: hit.pt })
              }
            } else {
              const pt = intersectionOnLineSegment(appState.referenceLine, seg)
              if (!pt) continue
              rawIntersections.push({ segIndex: i, t: tOnLineSegment(seg, pt), pt })
            }
          }
          // Note: don't bail out here even if rawIntersections is empty --
          // a path with no crossings at all may still need a free end
          // EXTENDED to meet the reference line (handled in the walk below);
          // the final "keptPieces.length === 0" check still catches the case
          // where nothing could be kept or extended.

          // Sort in traversal order and de-duplicate (handles vertex hits counted twice).
          rawIntersections.sort((a, b) => (a.segIndex - b.segIndex) || (a.t - b.t))
          const intersections = []
          for (const it of rawIntersections) {
            const last = intersections[intersections.length - 1]
            if (last && Math.abs(last.pt.x - it.pt.x) < 1e-6 && Math.abs(last.pt.y - it.pt.y) < 1e-6) continue
            intersections.push(it)
          }

          // Map intersections per segment for fast lookup.
          const intsBySeg = new Map()
          for (const it of intersections) {
            if (!intsBySeg.has(it.segIndex)) intsBySeg.set(it.segIndex, [])
            intsBySeg.get(it.segIndex).push(it)
          }
          for (const arr of intsBySeg.values()) arr.sort((a, b) => a.t - b.t)

          // Use element.points (preferred) or element.endPoints (fallback).
          // In this app, element.points is the authoritative path geometry for pointsToD().
          const pts = element.points || element.endPoints
          if (!pts || pts.length < 2) { return }

          // Determine the starting side along the path traversal, so the
          // "toggle on each crossing" logic stays aligned with the path.
          // The path's own first point is the reliable signal: a segment's
          // midpoint is only a safe stand-in when that segment has NO
          // crossing of its own, which isn't true in general -- a path whose
          // very first segment is cut (e.g. any single-arc path, a common
          // shape) would otherwise seed the wrong starting side.
          let currentSide = sideOfLine(appState.referenceLine, { x: pts[0].x, y: pts[0].y })
          if (currentSide === 0) {
            // Degenerate: the path starts exactly on the reference line.
            // Fall back to scanning for a segment whose own midpoint/apex
            // clearly indicates a side.
            for (let i = 0; i < element.segments.length; i++) {
              const s = element.segments[i]
              const mid = s.type === 'arc' ? arcApexPoint(s) : { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 }
              const sd = sideOfLine(appState.referenceLine, mid)
              if (sd !== 0) { currentSide = sd; break }
            }
          }
          if (currentSide === 0) currentSide = keepSide

          const keptPieces = []
          let curr = null

          // `r` overrides the pushed point's own r (used when a fresh
          // intersection point terminates a kept arc fragment, since it must
          // carry the arc's radius/direction, not collapse to a straight
          // line); otherwise the point's own r (e.g. a path vertex) is kept.
          const pushPoint = (p, r) => {
            const pt = { x: p.x, y: p.y, r: r !== undefined ? r : (p.r ?? 0) }
            if (!curr) { curr = [pt]; return }
            const last = curr[curr.length - 1]
            if (Math.abs(last.x - pt.x) < 1e-6 && Math.abs(last.y - pt.y) < 1e-6) return
            curr.push(pt)
          }

          const finishCurr = () => {
            if (!curr || curr.length < 2) { curr = null; return }
            // Drop zero-length final segments
            const a = curr[curr.length - 2]
            const b = curr[curr.length - 1]
            if (utils.distance(a, b) <= 1e-6) { curr = null; return }
            keptPieces.push(curr)
            curr = null
          }

          // Walk the path segment-by-segment and cut at each intersection.
          for (let i = 0; i < element.segments.length; i++) {
            const seg = element.segments[i]
            // pts[i+1].r is this segment's own signed radius (0 for a
            // straight segment); carrying it through is what lets a kept arc
            // fragment render as a curve instead of collapsing to a line.
            let segStart = { x: pts[i].x, y: pts[i].y, r: pts[i].r }
            let segEnd = { x: pts[i + 1].x, y: pts[i + 1].y, r: pts[i + 1].r }
            const cutR = seg.type === 'arc' ? seg.r : 0
            const segInts = intsBySeg.get(i) || []

            if (segInts.length === 0) {
              // This segment doesn't reach the reference line at all. If it's
              // one of the path's two free ends AND it would be kept anyway
              // (currentSide === keepSide), EXTEND it out to meet the line
              // instead of leaving a piece that falls short of the boundary
              // -- mirrors how the standalone 'line' case always reaches the
              // reference line, trimming or extending as needed. (Comparing
              // the free end's own side to keepSide would not work here: with
              // no crossing on this segment, the whole segment -- including
              // wherever you clicked to establish keepSide -- is trivially on
              // one side already.)
              //
              // A single-segment path (e.g. any lone arc-tool arc) is BOTH
              // the first and last segment at once, so both ends pass the
              // currentSide check identically regardless of which one was
              // clicked -- that check alone can't tell them apart. Break the
              // tie by proximity to the actual click so the end nearer the
              // click is the one that extends.
              const isOnlySegment = element.segments.length === 1
              const wantStart = !isOnlySegment ||
                utils.distance(modelPoint, segStart) <= utils.distance(modelPoint, segEnd)
              const wantEnd = !isOnlySegment ||
                utils.distance(modelPoint, segEnd) < utils.distance(modelPoint, segStart)

              if (i === 0 && currentSide === keepSide && wantStart) {
                const ext = extendedEndpoint(seg, true, appState.referenceLine)
                if (ext) {
                  segStart = ext
                  if (!curr) pushPoint(segStart)
                  pushPoint(segEnd)
                  continue
                }
                // Extension impossible (e.g. an arc whose radius can't reach
                // the line, or a straight segment that would have to run
                // backward through its own anchor) -- fall through and keep
                // this end at its original, unextended position.
              }
              if (i === element.segments.length - 1 && currentSide === keepSide && wantEnd) {
                const ext = extendedEndpoint(seg, false, appState.referenceLine)
                if (ext) {
                  segEnd = ext
                  if (!curr) pushPoint(segStart)
                  pushPoint(segEnd)
                  continue
                }
              }
              if (currentSide === keepSide) {
                if (!curr) pushPoint(segStart)
                pushPoint(segEnd)
              }
              continue
            }

            // A straight segment crosses an infinite line at most once (more
            // would be a degenerate case); an arc segment commonly crosses
            // it twice, both handled the same way here.
            let localStart = segStart
            for (const it of segInts) {
              const ip = it.pt

              // Part from localStart -> ip is on currentSide. ip terminates
              // this fragment, so if it's cut from an arc it must carry the
              // arc's radius/direction, not default to a straight line.
              if (currentSide === keepSide) {
                if (!curr) pushPoint(localStart)
                pushPoint(ip, cutR)
                finishCurr() // cut at intersection
              }

              // Cross the line => toggle side for the remainder
              currentSide = -currentSide

              localStart = ip

              // If we are now on keep side, start a new kept piece at the intersection
              if (currentSide === keepSide) {
                pushPoint(localStart)
              }
            }

            // Remainder from last intersection -> segEnd
            if (currentSide === keepSide) {
              if (!curr) pushPoint(localStart)
              pushPoint(segEnd)
            }
          }
          finishCurr()

          if (keptPieces.length === 0) { return }

          // Each kept piece keeps all of the path's own attrs (stroke, width,
          // dash, fill, groups…), with its own geometry.
          const mkPathEl = (pathPts) => ({
            tag: 'path',
            attrs: { ...element.attrs, d: utils.pointsToD(pathPts) },
            points: pathPts
          })

          // Replace original with the first kept piece; if more pieces remain,
          // add them right after it, so they stay within its groups.
          dwgMgr.swapChild(dwg, element.attrs.id, mkPathEl(keptPieces[0]))
          let afterId = element.attrs.id
          for (let k = 1; k < keptPieces.length; k++) {
            afterId = dwgMgr.insertChildAfter(dwg, mkPathEl(keptPieces[k]), afterId)
          }

          recordHistory(null, dwg);
          rebuildIntersectPoints(dwg)
          break
        }
        default: {
          console.log('Trimming is only supported for lines, rectangles, circles, paths, and polygons.')
          return
        }
      }
    }
    // clear selection
    if (appState.selection.length > 0) {
      appState.selection.forEach(selEl => {
        const domElement = domRefs.model.querySelector(`[data-id='${selEl.attrs.id}']`)
        if (domElement) {
          domElement.classList.remove('selected')
        }
      })
      appState.selection.length = 0
      appState.selection = [];
    }
  }
})