import { adjustForSnapAndLock, nearestElementAndSegment, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { text } from './text.js'
import { utils } from './utils.js'
import { recordHistory } from './history.js'
import { scaleElement } from './menuHandlers.js'
import { translateVirtualElement } from './moveTool.js'
import { parseShapeElements } from './shapeParse.js'
import { shapeLibrary } from './shapeLibrary.js'
import { resolveUnit } from './unitAliases.js'
import { freehandPathD } from './freehandMath.js'
import { resizeHandle } from './resizeHandle.js'
import { groups } from './groups.js'
import { ellipseTransform } from './elementObject.js'
import { rotateR, scaleR } from './arcStep.js'
import { roundCorner } from './pathGeometry.js'

const pointAlongLineFromPoint = (p, line, distance, isFillet) => {
  // p: { x, y }, line: { x1, y1, x2, y2 }
  // Always move FROM p TOWARD the opposite endpoint, so trimming from p shortens the segment.
  const d1 = utils.distance(p, { x: line.x1, y: line.y1 })
  const d2 = utils.distance(p, { x: line.x2, y: line.y2 })

  // If p is nearer x1,y1, head toward x2,y2; otherwise head toward x1,y1.
  const target = d1 <= d2
    ? { x: line.x2, y: line.y2 }
    : { x: line.x1, y: line.y1 }

  const vx = target.x - p.x
  const vy = target.y - p.y
  const len = Math.sqrt(vx * vx + vy * vy)

  if (len <= utils.EPS) return { x: p.x, y: p.y, r: 0 } // No movement possible.

  const ux = vx / len
  const uy = vy / len
  const r = isFillet ? distance : 0
  return { x: p.x + ux * distance, y: p.y + uy * distance, r }
}

// Scale a freshly-parsed (not yet inserted) shape element by `factor` about
// `anchor` (the shape-library entry's own anchor point, in its own raw,
// unconverted coordinates — see scaleElement), then translate so that anchor
// lands exactly on `target` (the model point the user clicked).
export const placeShapeElement = (el, factor, anchor, target, scaleFactor) => {
  const scaled = scaleElement(el, factor, anchor, scaleFactor)
  const dx = target.x - anchor.x
  const dy = target.y - anchor.y
  const { newAttrs, newPoints, newModelPoint } = translateVirtualElement(scaled, dx, dy)
  const placed = { ...scaled, attrs: { ...scaled.attrs, ...newAttrs } }
  if (newPoints) { placed.points = newPoints }
  if (newModelPoint) { placed.modelPoint = newModelPoint }
  if (scaled.boundingBox) {
    placed.boundingBox = { ...scaled.boundingBox, x: scaled.boundingBox.x + dx, y: scaled.boundingBox.y + dy }
  }
  return placed
}

// One copy of `el` for the angular array, rotated by `angle` degrees about
// (cx, cy). Returns null for an element type that isn't supported.
const angularArrayCopy = (el, angle, cx, cy) => {
  const theta = angle * (Math.PI / 180)
  const rotate = pt => ({
    x: cx + (pt.x - cx) * Math.cos(theta) - (pt.y - cy) * Math.sin(theta),
    y: cy + (pt.x - cx) * Math.sin(theta) + (pt.y - cy) * Math.cos(theta)
  })
  switch (el.tag) {
    case 'line': {
      const p1 = rotate({ x: el.attrs.x1, y: el.attrs.y1 })
      const p2 = rotate({ x: el.attrs.x2, y: el.attrs.y2 })
      const newLineElement = structuredClone(el)
      newLineElement.attrs.x1 = p1.x
      newLineElement.attrs.y1 = p1.y
      newLineElement.attrs.x2 = p2.x
      newLineElement.attrs.y2 = p2.y
      return newLineElement
    }
    case 'rect': {
      const x = el.attrs.x
      const y = el.attrs.y
      const width = el.attrs.width
      const height = el.attrs.height
      // Turn the rectangle's corners into points and rotate them.
      const corners = [
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x + width, y: y + height },
        { x: x, y: y + height }
      ]
      const rotatedCorners = corners.map(pt => ({ ...rotate(pt), r: 0 }))
      // Convert to a path element to preserve the rotation.
      // (A 'polygon' element is reserved for regular polygons; see stringify.js.)
      const points = rotatedCorners.slice()
      points.push(structuredClone(rotatedCorners[0])) // Close the path
      const newD = utils.pointsToD(points)
      return { tag: 'path',
        attrs: {
          id: el.attrs.id,
          d: newD,
          stroke: el.attrs.stroke,
          'stroke-width': el.attrs['stroke-width'],
          'stroke-dasharray': el.attrs['stroke-dasharray'],
          fill: el.attrs.fill || 'none',
          pattern: el.attrs.pattern
        },
        points: points
      }
    }
    case 'circle': {
      const c = rotate({ x: el.attrs.cx, y: el.attrs.cy })
      const newCircleElement = structuredClone(el)
      newCircleElement.attrs.cx = c.x
      newCircleElement.attrs.cy = c.y
      return newCircleElement
    }
    case 'ellipse': {
      const c = rotate({ x: el.attrs.cx, y: el.attrs.cy })
      // Each copy orbits the array center AND spins by the same
      // delta, exactly like the rotate tool's ellipse case.
      const newAngle = ((el.angle || 0) + angle) % 360
      const newEllipseElement = structuredClone(el)
      newEllipseElement.attrs.cx = c.x
      newEllipseElement.attrs.cy = c.y
      newEllipseElement.attrs.transform = ellipseTransform(c.x, c.y, newAngle)
      newEllipseElement.angle = newAngle
      return newEllipseElement
    }
    case 'path':
    case 'polygon': {
      const rotatedPoints = el.points.map(pt => ({ ...rotate(pt), r: rotateR(pt.r || 0, angle) }))
      const newElement = structuredClone(el)
      if (el.tag === 'polygon') {
        const newPointsAttr = rotatedPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
        newElement.attrs.points = newPointsAttr
        newElement.points = rotatedPoints
      } else {
        const newD = el.attrs['data-freehand'] ? freehandPathD(rotatedPoints) : utils.pointsToD(rotatedPoints)
        newElement.attrs.d = newD
        newElement.points = rotatedPoints
      }
      return newElement
    }
    default:
      return null
  }
}

const isCCW = (p1, p2, p3) => {
  // True if the turn from p1->p2 to p2->p3 is counterclockwise.
  const v1x = p2.x - p1.x
  const v1y = p2.y - p1.y
  const v2x = p3.x - p2.x
  const v2y = p3.y - p2.y
  const cross = v1x * v2y - v1y * v2x
  return cross > 0
}

// Insert the armed shape-library entry (see shapeLibrary.js) with its anchor
// at modelPoint, converted from the entry's unit to the sketch's. With `wrap`,
// a multi-element shape becomes a group. Returns the inserted elements, or
// null if nothing was inserted.
const insertArmedShape = (modelPoint, wrap, appState, dwg) => {
  const armed = shapeLibrary.getArmedShape()
  if (!armed) { return null }
  const { entry, unit } = armed
  const canonicalUnit = utils.unitScaleFactors[unit] ? unit : resolveUnit(unit)
  const libraryFactor = canonicalUnit && utils.unitScaleFactors[canonicalUnit]
  const sketchFactor = utils.unitScaleFactors[appState.unit]
  if (!libraryFactor || !sketchFactor) {
    alert(`Can't insert "${entry.name}": unrecognized unit "${unit}".`)
    return null
  }
  const elements = parseShapeElements(entry.dwg)
  if (elements.length === 0) {
    alert(`"${entry.name}" has no insertable geometry.`)
    return null
  }
  const unitFactor = libraryFactor / sketchFactor
  const anchor = { x: (entry.anchor && entry.anchor[0]) || 0, y: (entry.anchor && entry.anchor[1]) || 0 }
  const placed = elements.map(el => placeShapeElement(el, unitFactor, anchor, modelPoint, appState.scaleFactor))
  dwgMgr.adoptParsed(dwg, placed, wrap)
  return placed
}

export const clickTool = Object.freeze({
  execute(event, measurement, appState, dwg, domRefs) {
    // Modify the selected element(s) with a magnitude from the input box.
    // If no magnitude is given, do nothing.
    if (measurement === null) { return; }
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)    
    switch (appState.tool) {
      case 'rotate': {
        if (appState.selection.length === 0) { return; }
        const angle = measurement[0] * (Math.PI / 180) // Convert degrees to radians
        const cx = modelPoint.x
        const cy = modelPoint.y
        const groupIdMap = {}
        const newSelection = [];
        appState.selection.forEach(el => {
          switch (el.tag) {
            case 'line':
              const x1 = cx + (el.attrs.x1 - cx) * Math.cos(angle) - (el.attrs.y1 - cy) * Math.sin(angle)
              const y1 = cy + (el.attrs.x1 - cx) * Math.sin(angle) + (el.attrs.y1 - cy) * Math.cos(angle)
              const x2 = cx + (el.attrs.x2 - cx) * Math.cos(angle) - (el.attrs.y2 - cy) * Math.sin(angle)
              const y2 = cy + (el.attrs.x2 - cx) * Math.sin(angle) + (el.attrs.y2 - cy) * Math.cos(angle)
              if (appState.duplicateOnMove) {
                const newLineElement = structuredClone(el)
                newLineElement.attrs.x1 = x1
                newLineElement.attrs.x2 = x2
                newLineElement.attrs.y1 = y1
                newLineElement.attrs.y2 = y2
                utils.pushDuplicate(dwg, dwgMgr, newLineElement, groupIdMap)
                newSelection.push(newLineElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { x1, y1, x2, y2 })
              }
              break
            case 'rect': {
              // Rotate each corner point of the rectangle.
              const corners = [
                { x: el.attrs.x, y: el.attrs.y },
                { x: el.attrs.x + el.attrs.width, y: el.attrs.y },
                { x: el.attrs.x + el.attrs.width, y: el.attrs.y + el.attrs.height },
                { x: el.attrs.x, y: el.attrs.y + el.attrs.height }
              ]
              const rotatedCorners = corners.map(pt => {
                const rx = cx + (pt.x - cx) * Math.cos(angle) - (pt.y - cy) * Math.sin(angle)
                const ry = cy + (pt.x - cx) * Math.sin(angle) + (pt.y - cy) * Math.cos(angle)
                return { x: rx, y: ry, r: 0 }
              })
              // Convert the rect to a path element to preserve the rotation.
              // (A 'polygon' element is reserved for regular polygons; see stringify.js.)
              const points = structuredClone(rotatedCorners)
              points.push(structuredClone(rotatedCorners[0])) // Close the path
              const newD = utils.pointsToD(points)
              const pathElement = { tag: 'path',
                attrs: {
                  id: el.attrs.id,
                  d: newD,
                  stroke: el.attrs.stroke,
                  'stroke-width': el.attrs['stroke-width'],
                  'stroke-dasharray': el.attrs['stroke-dasharray'],
                  fill: el.attrs.fill || 'none',
                  pattern: el.attrs.pattern
                },
                points: points
              }
              if (appState.duplicateOnMove) {
                utils.pushDuplicate(dwg, dwgMgr, pathElement, groupIdMap)
                newSelection.push(pathElement)
              } else {
                dwgMgr.swapChild(dwg, el.attrs.id, pathElement, appState, domRefs)
              }
              break
            }
            case 'circle': {
              const rcx = cx + (el.attrs.cx - cx) * Math.cos(angle) - (el.attrs.cy - cy) * Math.sin(angle)
              const rcy = cy + (el.attrs.cx - cx) * Math.sin(angle) + (el.attrs.cy - cy) * Math.cos(angle)
              if (appState.duplicateOnMove) {
                const newCircleElement = structuredClone(el)
                newCircleElement.attrs.cx = rcx
                newCircleElement.attrs.cy = rcy
                utils.pushDuplicate(dwg, dwgMgr, newCircleElement, groupIdMap)
                newSelection.push(newCircleElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { cx: rcx, cy: rcy })
              }
              break
            }
            case 'ellipse': {
              // Orbit the center about the pivot exactly like circle, and add
              // the same visual-CCW delta (measurement[0], in degrees) to the
              // ellipse's own orientation.
              const rcx = cx + (el.attrs.cx - cx) * Math.cos(angle) - (el.attrs.cy - cy) * Math.sin(angle)
              const rcy = cy + (el.attrs.cx - cx) * Math.sin(angle) + (el.attrs.cy - cy) * Math.cos(angle)
              const newAngle = ((el.angle || 0) + measurement[0]) % 360
              const newTransform = ellipseTransform(rcx, rcy, newAngle)
              if (appState.duplicateOnMove) {
                const newEllipseElement = structuredClone(el)
                newEllipseElement.attrs.cx = rcx
                newEllipseElement.attrs.cy = rcy
                newEllipseElement.attrs.transform = newTransform
                newEllipseElement.angle = newAngle
                utils.pushDuplicate(dwg, dwgMgr, newEllipseElement, groupIdMap)
                newSelection.push(newEllipseElement)
              } else {
                const el2 = dwgMgr.getChildById(dwg, el.attrs.id)
                if (el2) { el2.angle = newAngle }
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { cx: rcx, cy: rcy, transform: newTransform })
              }
              break
            }
            case 'path':
            case 'polygon': {
              // For paths and polygons, we need to rotate each point.
              const rotatedPoints = el.points.map(pt => {
                const rx = cx + (pt.x - cx) * Math.cos(angle) - (pt.y - cy) * Math.sin(angle)
                const ry = cy + (pt.x - cx) * Math.sin(angle) + (pt.y - cy) * Math.cos(angle)
                return { x: rx, y: ry, r: rotateR(pt.r || 0, measurement[0]) }
              })
              if (el.tag === 'path') {
                const newD = el.attrs['data-freehand'] ? freehandPathD(rotatedPoints) : utils.pointsToD(rotatedPoints)
                if (appState.duplicateOnMove) {
                  const newPathElement = structuredClone(el)
                  newPathElement.attrs.d = newD
                  newPathElement.points = rotatedPoints
                  utils.pushDuplicate(dwg, dwgMgr, newPathElement, groupIdMap)
                  newSelection.push(newPathElement)
                } else {
                  dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { d: newD }, rotatedPoints)
                }
              } else {
                const newPointsAttr = rotatedPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
                if (appState.duplicateOnMove) {
                  const newPolygonElement = structuredClone(el)
                  newPolygonElement.attrs.points = newPointsAttr
                  newPolygonElement.points = rotatedPoints
                  utils.pushDuplicate(dwg, dwgMgr, newPolygonElement, groupIdMap)
                  newSelection.push(newPolygonElement)
                } else {
                  dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { points: newPointsAttr }, rotatedPoints)
                }
              }
              break
            }
            case 'library': {
              
              break
            }
            case 'text': {
              const clone = structuredClone(el)
              const newTextElement = text.rotateText(clone.text, el, angle, cx, cy, appState.scaleFactor)
              if (appState.duplicateOnMove) {
                utils.pushDuplicate(dwg, dwgMgr, newTextElement, groupIdMap)
                newSelection.push(newTextElement)
              } else {
                dwgMgr.swapChild(dwg, el.attrs.id, newTextElement, appState, domRefs)
              }
              break
            }
            default:
              alert(`Rotation is not yet supported for ${el.tag} elements.`)
          }
        })
        if (appState.duplicateOnMove) {
          utils.updateSelection(newSelection, appState, domRefs)
        }
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
        resizeHandle.refresh(appState, dwg)
        break
      }
      case 'extend': {
          const modelPoint = adjustForSnapAndLock(event, appState, dwg)
          const [element, segment, segIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
          if (element) {
            switch(element.tag) {
              case 'circle':
              case 'ellipse':
              case 'rect':
              case 'polygon':
              case 'text':
                // Do nothing. We don't extend these types.
                break
              case 'line': {
                // Determine which end to extend based on proximity to modelPoint.
                const distToStart = utils.distance(modelPoint, { x: segment.x1, y: segment.y1 })
                const distToEnd = utils.distance(modelPoint, { x: segment.x2, y: segment.y2 })
                let newAttrs = {}
                // Extend by measurement[0]. Positve = lengthen, negative = shorten.
                const extendBy = measurement[0] || 0
                if (distToStart < distToEnd) {
                  // Extend the start point.
                  const lineAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1)
                  const newX1 = segment.x1 - extendBy * Math.cos(lineAngle)
                  const newY1 = segment.y1 - extendBy * Math.sin(lineAngle)
                  newAttrs = { x1: newX1, y1: newY1 }
                } else {
                  // Extend the end point.
                  const lineAngle = Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1)
                  const newX2 = segment.x2 + extendBy * Math.cos(lineAngle)
                  const newY2 = segment.y2 + extendBy * Math.sin(lineAngle)
                  newAttrs = { x2: newX2, y2: newY2 }
                }
                dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, newAttrs)
                recordHistory(null, dwg)
                rebuildIntersectPoints(dwg)
                break
              }
              case 'path': {
                if (element.attrs['data-freehand']) {
                  alert("Extend is not supported for freehand strokes.")
                  break
                }
                // Extend the nearest path endpoint.
                if (!element.points || element.points.length < 2) { break }
                const startPt = element.points[0]
                const endPt = element.points[element.points.length - 1]
                const distToStart = utils.distance(modelPoint, startPt)
                const distToEnd = utils.distance(modelPoint, endPt)
                const extendBy = measurement[0] || 0
                let newPoints = structuredClone(element.points)
                if (distToStart < distToEnd) {
                  // Extend the start point.
                  const nextPt = element.points[1]
                  const lineAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x)
                  const newX = startPt.x - extendBy * Math.cos(lineAngle)
                  const newY = startPt.y - extendBy * Math.sin(lineAngle)
                  newPoints[0] = { x: newX, y: newY, r: 0 }
                } else {
                  // Extend the end point.
                  const prevPt = element.points[element.points.length - 2]
                  const lineAngle = Math.atan2(endPt.y - prevPt.y, endPt.x - prevPt.x)
                  const newX = endPt.x + extendBy * Math.cos(lineAngle)
                  const newY = endPt.y + extendBy * Math.sin(lineAngle)
                  newPoints[newPoints.length - 1] = { x: newX, y: newY, r: 0 }
                }
                const newD = utils.pointsToD(newPoints)
                dwgMgr.reviseAttributesOfChild(dwg, element.attrs.id, { d: newD }, newPoints)
                recordHistory(null, dwg)
                rebuildIntersectPoints(dwg)
                break
              }
              default:
                console.log('Extend is only supported for lines and paths right now.')
                return
            }
          }
        }
      case 'fillet': {
        const modelPoint = adjustForSnapAndLock(event, appState, dwg)
        const [element, segment, segIndex] = nearestElementAndSegment(modelPoint, appState, dwg)
        const chamferDist = measurement[0] || 0
        const tool = event.shiftKey ? 'chamfer' : 'fillet'
        if (chamferDist <= 0) { return; }
          if (element) {
          switch(element.tag) {
            case 'line':
            case 'circle':
            case 'ellipse':
            case 'text':
              // Do nothing. We don't chamfer these types.
              break
            case 'rect': {
              // Chamfer the corner nearest to modelPoint.
              // Identify which corner is nearest to modelPoint.
              let minDist = Infinity;
              let cornerPoint = null;
              let seg1Index = -1;
              let seg2Index = -1;
              for (let i = 0; i < element.segments.length; i++) {
                // Try the point at the start of each segment (rect corners).
                const localMinDist = utils.distance(modelPoint, element.endPoints[i]);
                if (localMinDist < minDist) {
                  cornerPoint = element.endPoints[i];
                  seg1Index = i
                  seg2Index = (i  + 3) % 4
                  minDist = localMinDist
                }
              }
              // We'll convert to a path, so start building the new path points.
              // Start with seg1Index and cutback chamferDist from start point.
              const chamferPt1 = pointAlongLineFromPoint(
                cornerPoint,
                element.segments[seg1Index],
                chamferDist,
                false
              )
              const points = [chamferPt1];
              for (let i = seg1Index; i < seg1Index + 3; i++) {
                const idX = i % element.segments.length
                const point = element.endPoints[(idX + 1) % element.endPoints.length];
                point.r = 0
                points.push(point)
              }
              // End with seg2Index and cutback chamferDist from end point.
              const chamferPt2 = pointAlongLineFromPoint(
                cornerPoint,
                element.segments[seg2Index],
                chamferDist,
                false
              )
              points.push(chamferPt2)
              const closePt = structuredClone(chamferPt1)
              closePt.r = tool === 'fillet' ? -1 * chamferDist : 0
              points.push(closePt) // Close the path

              const newD = utils.pointsToD(points)
              const pathElement = {
                tag: 'path',
                attrs: {
                  d: newD,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'] || 1,
                  'stroke-dasharray': element.attrs['stroke-dasharray'] || null,
                  fill: element.attrs.fill || 'none',
                  pattern: element.attrs.pattern
                },
                points: points
              }
              dwgMgr.swapChild(dwg, element.attrs.id, pathElement)
              recordHistory(null, dwg)
              rebuildIntersectPoints(dwg)
              break
            }
            case 'polygon': {
              break
            }
            case 'path': {
              if (element.attrs['data-freehand']) {
                alert(`${tool === 'fillet' ? 'Fillet' : 'Chamfer'} is not supported for freehand strokes.`)
                break
              }
              // Arrows are always straight.
              if (tool === 'fillet' && element.attrs['marker-end']) { return }
              const newPathPoints = [element.points[0]]; // Start with first point.
              let didChamfer = false;
              let refusal = null // Why a clicked corner couldn't be rounded
              // A closed path repeats its first point at the end. Its closing
              // corner joins the last segment to the first one.
              const pts = element.points
              const closed = pts.length >= 4 &&
                pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y
              for (let i = 0; i < element.segments.length; i++) {
                const seg = element.segments[i];
                const nextSeg = element.segments[(i + 1) % element.segments.length];
                const segEndPt = element.endPoints[i + 1];
                // An open path's last point is an end, not a corner.
                const isCorner = closed || i < element.segments.length - 1
                // Check if this vertex is within chamferDist of modelPoint.
                const distToVertex = utils.distance(modelPoint, segEndPt)
                // A point's r is the radius of the step that ends there.
                const rIn = pts[i + 1].r
                const rOut = (pts[i + 2] || pts[1]).r
                if (isCorner && distToVertex < chamferDist && (rIn || rOut)) {
                  // A corner next to an arc (see pathGeometry.js).
                  const result = Array.isArray(rIn) || Array.isArray(rOut)
                    ? "it is next to an elliptical arc, which isn't supported yet"
                    : roundCorner(element, i, (i + 1) % element.segments.length, chamferDist, tool)
                  if (typeof result === 'string') {
                    refusal = result
                    newPathPoints.push({ x: segEndPt.x, y: segEndPt.y, r: rIn })
                    continue
                  }
                  // Step i now ends at t1; the new step to t2 is the fillet (or chamfer).
                  newPathPoints.push({ x: result.t1.x, y: result.t1.y, r: rIn })
                  newPathPoints.push({ x: result.t2.x, y: result.t2.y, r: result.r })
                  if (i === element.segments.length - 1) {
                    // The closing corner: the path now starts at t2, and ends there too.
                    newPathPoints[0] = { x: result.t2.x, y: result.t2.y, r: 0 }
                  }
                  didChamfer = true
                } else if (isCorner && distToVertex < chamferDist) {
                  // Chamfer this corner.
                  const chamferPt1 = pointAlongLineFromPoint(
                    segEndPt,
                    seg,
                    chamferDist,
                    false
                  )
                  const chamferPt2 = pointAlongLineFromPoint(
                    segEndPt,
                    nextSeg,
                    chamferDist,
                    false
                  )
                  // Add chamfer points.
                  newPathPoints.push(chamferPt1)
                  // r should be positive for CCW, negative for clockwise.
                  // At the closing corner, the next point is the second one;
                  // the first is this corner itself.
                  const sgnR = isCCW(
                    element.points[i],
                    segEndPt,
                    element.points[i + 2] || element.points[1]
                  ) ? 1 : -1
                  chamferPt2.r = tool === 'fillet' ? sgnR * chamferDist : 0
                  newPathPoints.push(chamferPt2)
                  if (i === element.segments.length - 1) {
                    // The closing corner: the path now starts where the
                    // first segment was cut back, and ends there too.
                    newPathPoints[0] = { x: chamferPt2.x, y: chamferPt2.y, r: 0 }
                  }
                  didChamfer = true;
                } else {
                  // No chamfer; keep the end point.
                  newPathPoints.push({ x: segEndPt.x, y: segEndPt.y, r: element.points[i + 1].r } );
                }
              }
              if (!didChamfer) {
                if (refusal) {
                  alert(`Can't ${tool} that corner: ${refusal}.`)
                }
                return // Nothing to do.
              }
              const newD = utils.pointsToD(newPathPoints)
              const pathElement = {
                tag: 'path',
                attrs: {
                  d: newD,
                  stroke: element.attrs.stroke,
                  'stroke-width': element.attrs['stroke-width'] || 1,
                  'stroke-dasharray': element.attrs['stroke-dasharray'] || null,
                  fill: element.attrs.fill || 'none',
                  pattern: element.attrs.pattern,
                  'marker-end': element.attrs['marker-end'] // Keep an arrow's arrowhead.
                },
                points: newPathPoints
              }
              dwgMgr.swapChild(dwg, element.attrs.id, pathElement)
              recordHistory(null, dwg)
              rebuildIntersectPoints(dwg)
              break
            }
          }
        }
      }
      case 'resize': {
        if (appState.selection.length === 0) { return; }
        const SF = measurement[0] // Scale factor
        const cx = modelPoint.x
        const cy = modelPoint.y
        const groupIdMap = {}
        const newSelection = [];
        appState.selection.forEach(el => {
          switch (el.tag) {
            case 'line': {
              const newX1 = cx + (el.attrs.x1 - cx) * SF
              const newY1 = cy + (el.attrs.y1 - cy) * SF
              const newX2 = cx + (el.attrs.x2 - cx) * SF
              const newY2 = cy + (el.attrs.y2 - cy) * SF
              if (appState.duplicateOnMove) {
                const newLineElement = structuredClone(el)
                newLineElement.attrs.x1 = newX1
                newLineElement.attrs.y1 = newY1
                newLineElement.attrs.x2 = newX2
                newLineElement.attrs.y2 = newY2
                utils.pushDuplicate(dwg, dwgMgr, newLineElement, groupIdMap)
                newSelection.push(newLineElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { x1: newX1, y1: newY1, x2: newX2, y2: newY2 })
              }
              break
            }
            case 'rect': {
              const newX = cx + (el.attrs.x - cx) * SF
              const newY = cy + (el.attrs.y - cy) * SF
              const newWidth = el.attrs.width * SF
              const newHeight = el.attrs.height * SF
              if (appState.duplicateOnMove) {
                const newRectElement = structuredClone(el)
                newRectElement.attrs.x = newX
                newRectElement.attrs.y = newY
                newRectElement.attrs.width = newWidth
                newRectElement.attrs.height = newHeight
                utils.pushDuplicate(dwg, dwgMgr, newRectElement, groupIdMap)
                newSelection.push(newRectElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { x: newX, y: newY, width: newWidth, height: newHeight })
              }
              break
            }
            case 'circle': {
              const newCX = cx + (el.attrs.cx - cx) * SF
              const newCY = cy + (el.attrs.cy - cy) * SF
              const newR = el.attrs.r * SF
              if (appState.duplicateOnMove) {
                const newCircleElement = structuredClone(el)
                newCircleElement.attrs.cx = newCX
                newCircleElement.attrs.cy = newCY
                newCircleElement.attrs.r = newR
                utils.pushDuplicate(dwg, dwgMgr, newCircleElement, groupIdMap)
                newSelection.push(newCircleElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { cx: newCX, cy: newCY, r: newR })
              }
              break
            }
            case 'ellipse': {
              const newCX = cx + (el.attrs.cx - cx) * SF
              const newCY = cy + (el.attrs.cy - cy) * SF
              const newRX = el.attrs.rx * SF
              const newRY = el.attrs.ry * SF
              // Isotropic scale about a pivot doesn't change the ellipse's
              // orientation, but it does move cx/cy, so the rotate()
              // transform's baked-in pivot must move with it.
              const newTransform = ellipseTransform(newCX, newCY, el.angle || 0)
              if (appState.duplicateOnMove) {
                const newEllipseElement = structuredClone(el)
                newEllipseElement.attrs.cx = newCX
                newEllipseElement.attrs.cy = newCY
                newEllipseElement.attrs.rx = newRX
                newEllipseElement.attrs.ry = newRY
                newEllipseElement.attrs.transform = newTransform
                utils.pushDuplicate(dwg, dwgMgr, newEllipseElement, groupIdMap)
                newSelection.push(newEllipseElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { cx: newCX, cy: newCY, rx: newRX, ry: newRY, transform: newTransform })
              }
              break
            }
            case 'polygon': {
              const newPoints = el.points.map(pt => ({
                x: cx + (pt.x - cx) * SF,
                y: cy + (pt.y - cy) * SF,
                r: pt.r * SF || 0
              }))
              const newPointsAttr = newPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
              if (appState.duplicateOnMove) {
                const newPolygonElement = structuredClone(el)
                newPolygonElement.attrs.points = newPointsAttr
                newPolygonElement.points = newPoints
                utils.pushDuplicate(dwg, dwgMgr, newPolygonElement, groupIdMap)
                newSelection.push(newPolygonElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { points: newPointsAttr }, newPoints)
              }
              break
            }
            case 'path': {
              const newPoints = el.points.map(pt => ({
                x: cx + (pt.x - cx) * SF,
                y: cy + (pt.y - cy) * SF,
                r: pt.r ? scaleR(pt.r, SF) : 0
              }))
              const newD = el.attrs['data-freehand'] ? freehandPathD(newPoints) : utils.pointsToD(newPoints)
              if (appState.duplicateOnMove) {
                const newPathElement = structuredClone(el)
                newPathElement.attrs.d = newD
                newPathElement.points = newPoints
                utils.pushDuplicate(dwg, dwgMgr, newPathElement, groupIdMap)
                newSelection.push(newPathElement)
              } else {
                dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, { d: newD }, newPoints)
              }
              break
            }
            case 'text': {
              // Text keeps its font size. Only its point moves, scaled about (cx, cy).
              const dx = (el.modelPoint.x - cx) * (SF - 1)
              const dy = (el.modelPoint.y - cy) * (SF - 1)
              const newTextElement = text.moveText(el.text, el, dx, dy, appState.scaleFactor)
              if (appState.duplicateOnMove) {
                utils.pushDuplicate(dwg, dwgMgr, newTextElement, groupIdMap)
                newSelection.push(newTextElement)
              } else {
                dwgMgr.swapChild(dwg, el.attrs.id, newTextElement, appState, domRefs)
              }
              break
            }
            default:
              alert(`Resize is not yet supported for ${el.tag} elements.`)
          }
        })
        if (appState.duplicateOnMove) {
          utils.updateSelection(newSelection, appState, domRefs)
        }
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
        // Resizing a rect/line in place moves its corners/endpoints, so
        // redraw the resize-handle marks to match (see the 'rotate' case).
        resizeHandle.refresh(appState, dwg)
        break
      }
      case 'angular-array': {
        if (appState.selection.length === 0) { return; }
        const numCopies = measurement[0] // Number of copies
        const angle = measurement[1] // Angle between copies in degrees
        if (isNaN(numCopies) || isNaN(angle) || numCopies <= 0) {
          alert('Invalid angular array specification. Use format: n @ d (e.g., 3 @ 90)')
          return
        }
        const cx = modelPoint.x
        const cy = modelPoint.y
        // Loop copy by copy, so that each copy of a group is contiguous and
        // gets its own new group number (a fresh groupIdMap per copy).
        const selected = dwgMgr.getChildren(dwg).filter(el => appState.selection.includes(el))
        const unsupported = new Set()
        for (let i = 1; i <= numCopies; i++) {
          const groupIdMap = {}
          selected.forEach(el => {
            // Text can't be arrayed yet, so a dimension, arrow, or dot would lose its label.
            if (groups.isLeafGroupMember(el)) {
              unsupported.add('dimension strings, arrows, and labeled dots')
              return
            }
            const copy = angularArrayCopy(el, angle * i, cx, cy)
            if (copy) {
              utils.pushDuplicate(dwg, dwgMgr, copy, groupIdMap)
            } else {
              unsupported.add(`${el.tag} elements`)
            }
          })
        }
        unsupported.forEach(kind => alert(`Angular array is not yet supported for ${kind}.`))
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
        break
      }
      case 'library': {
        if (!shapeLibrary.getArmedShape()) {
          alert("Choose a shape first: click the Insert Shape from Library button, then pick a shape.")
          return
        }
        if (insertArmedShape(modelPoint, true, appState, dwg)) { // A multi-element shape becomes a group.
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
        }
        break
      }
      case 'paste': {
        // Ctrl+V armed the clipboard's shapes (see sketch.js). They keep their own groups.
        const placed = insertArmedShape(modelPoint, false, appState, dwg)
        if (placed) {
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
          utils.updateSelection(placed, appState, domRefs)
        }
        break
      }
      default:
        alert(`${appState.tool} is not yet supported.`)
    }
  }
})