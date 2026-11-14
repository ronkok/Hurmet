import { adjustForSnapAndLock, isAngleOnArc, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { dashMap, linecapMap, resolveFill, markerEnd } from './elementObject.js'
import { text } from './text.js'
import { recordHistory } from './history.js'
import { utils } from './utils.js'
import { arcCommand } from './arcStep.js'

// Multi-click tools like polyline, arc, and arrow.

// In multiClick tools, the `points` array defines the geometry of the element segments.
// points = [{x: x0, y: y0, r: 0}, {x: x1, y: y1, r: r1},  ... {x: xn, y: yn, r: rn}]
//   where r is the radius for arcs. r=0 means a straight line segment.
// For polylines, all r=0. For arcs, the first point has r=0.
// Paths can have a mix of r=0 and r>0 segments. Arcs are always drawn CCW.
// points are created and updated in multiClickTool.update() and multiClickTool.addPoint().
// They are used in snap.js to calculate snap points such as segment endpoints and midpoints.

const createElement = (modelPoint, appState) => {
  const path ={
    tag: 'path',
    attrs: {
      d: `M ${modelPoint.x} ${modelPoint.y}`,
      fill: 'none',
      stroke: appState.stroke,
      'stroke-width': appState.strokewidth
    },
    points: [{ x: modelPoint.x, y: modelPoint.y, r: 0 }], // For snap calculations
    firstPoint: { x: modelPoint.x, y: modelPoint.y } // To enable a lock constraint
  }
  if (appState.linetype && appState.linetype !== "solid") {
    path.attrs['stroke-dasharray'] = dashMap[appState.linetype]
    if (linecapMap[appState.linetype]) {
      path.attrs['stroke-linecap'] = linecapMap[appState.linetype]
    }
  }
  if (appState.marker !== "none") {
    path.attrs['marker-end'] = markerEnd(appState.marker, appState.strokewidth)
  }
return path
}

// The rubber band's d holds the clicked vertices (element.points) plus, once
// the mouse has moved, one more vertex that tracks the cursor.
const hasCursorVertex = element => {
  return (element.attrs.d.match(/ L /g) || []).length + 1 > element.points.length
}

// Move the cursor vertex to modelPoint, adding it if there isn't one yet.
// Never duplicating a vertex keeps the last segment from having zero length,
// which would leave an arrowhead with no direction to point (it turns horizontal).
const updateShape = (element, modelPoint) => {
  const d = element.attrs.d
  if (hasCursorVertex(element)) {
    element.attrs.d = d.substring(0, d.lastIndexOf(' L ') + 3) + ` ${modelPoint.x} ${modelPoint.y}`
  } else {
    element.attrs.d = d + ` L ${modelPoint.x} ${modelPoint.y}`
  }
  return element
}

const updateLatestPointInElement = (element, modelPoint) => {
  element.attrs.d += ` L ${modelPoint.x} ${modelPoint.y}`
  element.points.push({ x: modelPoint.x, y: modelPoint.y, r: 0 })
  return element
}

export const multiClickTool = {
  createTempElement(event, appState, domRefs, dwg) {
    // Create the temporary rubber band element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = createElement(modelPoint, appState)
    utils.clearMeasurement(domRefs)
    dwgMgr.pushTemp(dwg, element)
  },
  update(event, appState, domRefs, dwg) {
    // Update the temporary rubber band element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    let element = dwgMgr.popRubberBand(dwg, appState)
    element = updateShape(element, modelPoint)
    dwgMgr.pushTemp(dwg, element)
    // Local deltas run from the most recent click, giving each segment's Δx, Δy.
    utils.updateLocalCoords(domRefs, element.points.at(-1), modelPoint, appState)
  },
  addPoint(event, appState, domRefs, dwg) {
    // Add a point to the temporary element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = dwgMgr.popRubberBand(dwg, appState)
    if (modelPoint.x === element.points[0].x && modelPoint.y === element.points[0].y && element.points.length > 2) {
      // Close the polyline if clicking on the first point and there are at least 3 points
      element.attrs.d += ' Z'
      Object.assign(element.attrs, resolveFill(appState)) // Fill the closed shape
      element.points.push({ x: element.points[0].x, y: element.points[0].y, r: 0 })
      utils.clearLocalCoords(domRefs)
      dwgMgr.pushChild(dwg, element)
      recordHistory(element, dwg)
      return
    }
    // The cursor vertex becomes a clicked vertex. The next mouse move adds a new cursor vertex.
    updateShape(element, modelPoint)
    element.points.push({ x: modelPoint.x, y: modelPoint.y, r: 0 })
    dwgMgr.pushTemp(dwg, element)
    utils.updateLocalCoords(domRefs, element.points.at(-1), modelPoint, appState)
  },
  finalize(appState, dwg, domRefs) {
    // Finalize the temporary element
    const element = dwgMgr.popRubberBand(dwg, appState)
    if (hasCursorVertex(element)) {
      // Drop the vertex that was tracking the cursor; it was never clicked.
      element.attrs.d = element.attrs.d.slice(0, element.attrs.d.lastIndexOf(' L ')).trim()
    }
    if (appState.tool === 'polyline') {
      dwgMgr.pushChild(dwg, element)
      recordHistory(element, dwg)
      utils.clearLocalCoords(domRefs)
    } else if (appState.tool === 'arrow') {
      // Add an arrowhead to the end of the arrow shaft
      element.attrs['marker-end'] = markerEnd('arrow', appState.strokewidth)
      // Optionally add a text note
      if (domRefs.inputBox.textContent.trim() !== '') {
        // Create a note for the leader
        // Position the text opposite the arrow's direction (away from the arrowhead),
        // based on whichever of dx, dy dominates the first segment.
        const dx = element.points[1].x - element.points[0].x
        const dy = element.points[1].y - element.points[0].y
        const textposition = Math.abs(dy) > Math.abs(dx)
          ? (dy > 0 ? 'below' : 'above')
          : (dx > 0 ? 'leaderLeft' : 'leaderRight')
        // Leave appState.textposition alone. It's the Text tool's setting.
        const textElement = text.createLabelElement(
          text.getInputBoxText(domRefs.inputBox),
          element.points[0],
          { ...appState, textposition }
        )
        // Create a group to hold the arrow and text.
        dwgMgr.pushGroup(dwg, [element, textElement], "arrow")
      } else {
        dwgMgr.pushChild(dwg, element)
      }
      recordHistory(null, dwg) // Record the whole drawing
      rebuildIntersectPoints(dwg)
      domRefs.inputBox.textContent = ''
      utils.clearLocalCoords(domRefs)
    }
  },
  cancel(domRefs, dwg, appState) {
    // Cancel the temporary element
    utils.clearLocalCoords(domRefs)
    dwgMgr.popRubberBand(dwg, appState)
  }
}

export const arcTool = Object.freeze({
  finalize(event, appState, domRefs, dwg, radius) {
    // Finalize the arc element.
    // We use an SVG path element with an "A" command.
    // For a 2-click (radius-specified) arc, we always draw a CCW arc from the
    // first point to the last point, so sweep=1 (it's 1, not 0, because we're
    // inside a <g> element that has been flipped vertically).
    // For a 3-click (through-3-points) arc, the sweep direction instead
    // depends on which arc between the first and third points actually
    // passes through the second (apex) point -- see the third-click branch
    // below. This app's path format has no large-arc-flag; an arc over 180
    // degrees is represented as two <=180-degree arc segments instead.
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    let element = dwgMgr.popRubberBand(dwg, appState)
    element = updateLatestPointInElement(element, modelPoint)
    let d = "M " + element.points[0].x + " " + element.points[0].y + " A "
    if (radius) {
      // event was the second click. Use radius to make circular or elliptical arc.
      element.points[1].r = radius[1] > 0
        ? [radius[0], radius[1], 0] // Elliptical arc
        : radius[0]                 // Circular arc
      d = `M ${element.points[0].x} ${element.points[0].y} ` +
          arcCommand(element.points[1].r, modelPoint.x, modelPoint.y)
    } else {
      // event was the third click. Find the circle through all three points.
      const x1 = element.firstPoint.x
      const y1 = element.firstPoint.y
      const x2 = modelPoint.x
      const y2 = modelPoint.y
      const x0 = element.points[1].x
      const y0 = element.points[1].y
      const a = Math.hypot(x1 - x0, y1 - y0)
      const b = Math.hypot(x2 - x0, y2 - y0)
      const c = Math.hypot(x2 - x1, y2 - y1)
      const radius = Math.abs((a * b * c) / Math.sqrt((a + b + c) * (b + c - a) * (c + a - b) * (a + b - c)))

      // Three points determine one circle, but there are two possible arcs
      // between the first and third points on it -- only one of them passes
      // through the apex (the middle click). Find the circumcenter so we can
      // tell which arc that is, from the *actual* winding of the three
      // clicks, instead of assuming a fixed sweep direction.
      const D = 2 * (x1 * (y0 - y2) + x0 * (y2 - y1) + x2 * (y1 - y0))
      const cx = ((x1 * x1 + y1 * y1) * (y0 - y2) + (x0 * x0 + y0 * y0) * (y2 - y1) + (x2 * x2 + y2 * y2) * (y1 - y0)) / D
      const cy = ((x1 * x1 + y1 * y1) * (x2 - x0) + (x0 * x0 + y0 * y0) * (x1 - x2) + (x2 * x2 + y2 * y2) * (x0 - x1)) / D
      const norm = angle => (angle + 2 * Math.PI) % (2 * Math.PI)
      const angleA = norm(Math.atan2(y1 - cy, x1 - cx))
      const angleP = norm(Math.atan2(y0 - cy, x0 - cx))
      const angleB = norm(Math.atan2(y2 - cy, x2 - cx))

      // Does the apex lie on the CCW arc from A to B? If so the arc is CCW
      // (sweep=1, r > 0); otherwise it's CW (sweep=0, r < 0) -- same sign
      // convention used everywhere else (pointsToD, getCircularArcParams).
      const isCCW = isAngleOnArc(angleA, angleB, 1, angleP)
      const sweep = isCCW ? 1 : 0
      const signedRadius = isCCW ? radius : -radius
      const rStr = radius.toFixed(4) // Avoid floating point issues

      // Remove the middle element (the apex point) in points, since it is not a start or end point.
      element.points.splice(1, 1);

      // This app's path format has no large-arc-flag support (see erase.js's
      // circle-erase code); an arc over 180 degrees is instead represented as
      // two <=180-degree arc segments through a synthetic midpoint.
      const keptAngle = isCCW ? norm(angleB - angleA) : norm(angleA - angleB)
      if (keptAngle > Math.PI) {
        const midAngle = isCCW ? angleA + keptAngle / 2 : angleA - keptAngle / 2
        const midPoint = { x: cx + radius * Math.cos(midAngle), y: cy + radius * Math.sin(midAngle) }
        element.points.splice(1, 0, { x: midPoint.x, y: midPoint.y, r: signedRadius })
        element.points[2].r = signedRadius
        d += `${rStr} ${rStr} 0 0 ${sweep} ${midPoint.x} ${midPoint.y} A ${rStr} ${rStr} 0 0 ${sweep} ${x2} ${y2}`
      } else {
        element.points[1].r = signedRadius
        d += `${rStr} ${rStr} 0 0 ${sweep} ${x2} ${y2}`
      }
    }
    element.attrs.d = d
    utils.clearLocalCoords(domRefs)
    element.firstPoint = null
    dwgMgr.pushChild(dwg, element)
    recordHistory(element, dwg)
  }
})
