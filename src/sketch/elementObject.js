import { text } from './text.js'
import { formatFloat } from '../format.js'
import { feetInchesLabel } from './feetInches.js'
import { freehandPathD } from './freehandMath.js'
import { arcCommand, simplifyR } from './arcStep.js'
import { dashMap, linecapMap, fillPatternNames, arrowheadNames, arrowdotNames, markerFamily } from './shared.js'

// dashMap, linecapMap, fillPatternNames, arrowheadNames, arrowdotNames, and markerFamily
// are shared with Hurmet's draw.js, so they live in shared.js.
export { dashMap, linecapMap, fillPatternNames, arrowheadNames, arrowdotNames, markerFamily }


export const arrowheadFor = strokewidth => {
  const width = Number(strokewidth ?? 1)
  return width < 0.75 ? 'thinarrow'
    : width < 1.5 ? 'arrow'
    : width < 2.5 ? 'thickarrow'
    : 'thickerarrow'
}

// Hurmet's "arrowdot" (arrowdotNames in shared.js): an arrowhead whose tip touches a
// dot on the end point. One marker per arrowhead size, named after it, e.g. "thickarrowdot".

// The marker-end attribute for a marker name, such as appState.marker.
export const markerEnd = (marker, strokewidth) => {
  const family = markerFamily(marker)
  const id = family === 'arrow' ? arrowheadFor(strokewidth)
    : family === 'arrowdot' ? arrowheadFor(strokewidth) + 'dot'
    : marker
  return `url(#${id})`
}

// Given the current fill color and pattern in appState, return the attrs a
// permanent element needs for its fill: a plain color (or "none") plus a
// pattern attribute recording which pattern is in effect. This stays as
// plain, serializable data — turning {fill, pattern} into the actual SVG
// paint (a flat color, or a url() reference to a colored <pattern>) is a
// rendering concern handled in dwg.js, at the point a real DOM element is
// created or revised.
export function resolveFill(appState) {
  return { fill: appState.fill || 'none', pattern: appState.pattern || 'solid' }
}

// SVG's native <ellipse> has no rotation attribute, so an ellipse's tilt is
// carried as a plain top-level `angle` field (degrees, positive = CCW,
// matching the rotate tool's convention elsewhere) and rendered via this
// derived `transform`. Model-space coordinates (cx, cy, and this rotate())
// live in the same pre-flip frame as every other element's raw coordinates,
// so — unlike image's local counter-flip trick — no sign correction for the
// model group's y-flip is needed: rotate(angle, cx, cy) here is visually CCW
// for positive angle, verified numerically against clickTools.js's identical
// point-rotation formula for rect/line/circle/path.
// Every site that sets an ellipse's cx, cy, or angle must call this and
// store the result as attrs.transform (undefined when angle is 0, so an
// axis-aligned ellipse's attrs stay exactly as before).
export function ellipseTransform(cx, cy, angle) {
  return angle ? `rotate(${angle}, ${cx}, ${cy})` : undefined
}

// Given a valid command and its arguments, return the corresponding object.
// Export to click tools and parse.js
export const elementObject = (command, args, appState, dwg = null) => {
  switch (command.toLowerCase()) {
    case "line": {
      // args is a 2x2 array containing 2 points.
      const line = {
        tag: 'line',
        attrs: {
          x1: args[0][0],
          y1: args[0][1],
          x2: args[1][0],
          y2: args[1][1],
          stroke: appState.stroke
        },
        firstPoint: { x: args[0][0], y: args[0][1] } // To enable a lock constraint
      }
      if (appState.strokewidth !== 1) { line.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        line.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          line.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      if (appState.marker !== "none") {
        line.attrs['marker-end'] = markerEnd(appState.marker, appState.strokewidth)
      }
      return line
    }
    case 'rect': {
      // args is a 2x2 array containing 2 points.
      const width = Math.abs(args[1][0] - args[0][0])
      const height = Math.abs(args[1][1] - args[0][1])
      const rect = {
        tag: 'rect',
        attrs: {
          x: Math.min(args[0][0], args[1][0]),
          y: Math.min(args[0][1], args[1][1]),
          width: width,
          height: height,
          stroke: appState.stroke,
          ...resolveFill(appState)
        },
        firstPoint: { x: args[0][0], y: args[0][1] }
      }
      if (appState.strokewidth !== 1) { rect.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        rect.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          rect.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      return rect
    }
    case 'circle': {
      // args is an array containing a center point and a radius.
      const center = args[0];
      const radius = args[1];
      const circle = {
        tag: 'circle',
        attrs: {
          cx: center[0],
          cy: center[1],
          r: radius,
          stroke: appState.stroke,
          ...resolveFill(appState)
        }
      }
      if (appState.strokewidth !== 1) { circle.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        circle.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          circle.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      return circle
    }
    case 'ellipse': {
      // args is an array containing a center point, an x radius, a y radius,
      // and an optional rotation angle (degrees, positive = CCW).
      const center = args[0];
      const rx = args[1];
      const ry = args[2];
      const angle = args[3] || 0;
      const ellipse = {
        tag: 'ellipse',
        angle: angle,
        attrs: {
          cx: center[0],
          cy: center[1],
          rx: rx,
          ry: ry,
          transform: ellipseTransform(center[0], center[1], angle),
          stroke: appState.stroke,
          ...resolveFill(appState)
        }
      }
      if (appState.strokewidth !== 1) { ellipse.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        ellipse.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          ellipse.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      return ellipse
    }
    case 'polygon': {
      // args is an array containing the number of sides, the center point, the inscribed radius,
      // and an optional rotation angle (degrees, positive = CCW).
      const numSides = args[0];
      const center = args[1];
      const radius = args[2];  // Inscribed radius
      const rotation = (args[3] || 0) * Math.PI / 180
      const circumscribedRadius = radius / Math.cos(Math.PI / numSides)
      const points = [];
      // Start angle so bottom is flat, before rotation
      const startAngle = -Math.PI / numSides - Math.PI / 2 + rotation
      for (let i = 0; i < numSides; i++) {
        const angle = (2 * Math.PI / numSides) * i + startAngle
        points.push({
          x: center[0] + circumscribedRadius * Math.cos(angle),
          y: center[1] + circumscribedRadius * Math.sin(angle)
        })
      }
      const polygon = {
        tag: 'polygon',
        attrs: {
          points: points.map(p => `${p.x},${p.y}`).join(" "),
          stroke: appState.stroke,
          ...resolveFill(appState)
        },
        numSides: numSides,
        points: points
      }
      if (appState.strokewidth !== 1) { polygon.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        polygon.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          polygon.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      return polygon
    }
    case 'arc': {
      // args is an array containing 2 arrays
      // args[0] contains a start point and an end point
      // args[1] contains a signed radius (positive for CCW, negative for CW),
      // or, for an elliptical arc, [±rx, ry] or [±rx, ry, angle] (see arcStep.js).
      const r = typeof args[1] === "number"
        ? args[1]
        : [args[1][0], args[1][1], args[1][2] || 0]
      const points = args[0];
      const startPoint = points[0];
      const endPoint = points[1];
      const d = 'M ' + startPoint[0] + ',' + startPoint[1] + ' ' + arcCommand(r, endPoint[0], endPoint[1])
      const arc = {
        tag: 'path',
        attrs: {
          d: d,
          stroke: appState.stroke,
          fill: "none"
        },
        points: [{ x: startPoint[0], y: startPoint[1], r: 0 }, { x: endPoint[0], y: endPoint[1], r }]
      }
      if (appState.strokewidth !== 1) { arc.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        arc.attrs['stroke-dasharray'] = dashMap[appState.linetype]
        if (linecapMap[appState.linetype]) {
          arc.attrs['stroke-linecap'] = linecapMap[appState.linetype]
        }
      }
      if (appState.marker !== "none") {
        arc.attrs['marker-end'] = markerEnd(appState.marker, appState.strokewidth)
      }
      return arc
    }
    case 'freehand': {
      // args is an array containing an array of [x, y] waypoints (already
      // simplified — see freehandTool.js). data-freehand marks this element
      // for stringify/snap/move/mirror, since its DOM tag is 'path' too.
      const points = args[0].map(([x, y]) => ({ x, y }))
      const freehand = {
        tag: 'path',
        attrs: {
          d: freehandPathD(points),
          stroke: appState.stroke,
          fill: 'none',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'data-freehand': 1
        },
        points
      }
      if (appState.strokewidth !== 1) { freehand.attrs['stroke-width'] = appState.strokewidth }
      if (appState.linetype && appState.linetype !== "solid") {
        freehand.attrs['stroke-dasharray'] = dashMap[appState.linetype]
      }
      if (appState.marker !== "none") {
        freehand.attrs['marker-end'] = markerEnd(appState.marker, appState.strokewidth)
      }
      return freehand
    }
    case 'arrow':
    case 'path': {
      // args is an array containing an array of points, and optionally a note string.
      if (command === 'arrow') {
        // Arrows are always straight, so ignore any radius written on a step.
        args = [args[0].map(step => Array.isArray(step) ? step.slice(0, 2) : step), ...args.slice(1)]
      }
      if (args.length === 2 && typeof args[1] === "string") {
        // A note has been appended to an arrow
        return arrowGroup(args, appState)
      } else {
        const pathElement = path(args[0], appState)
        if (command === 'arrow') {
          pathElement.attrs['marker-end'] = markerEnd('arrow', appState.strokewidth)
        } else if (appState.marker !== "none") {
          pathElement.attrs['marker-end'] = markerEnd(appState.marker, appState.strokewidth)
        }
        applyLinetype(pathElement, appState)
        return pathElement
      }      
    }
    case 'dimension': {
      // args is an array containing an array of points, and optionally a note string.
      return dimensionGroup(args, appState, dwg)
    }
    case 'dot': {
      // args: a point [x, y], then an optional label and label position.
      // As in Hurmet, the dot's radius is in px (appState.dotradius), so it
      // doesn't change with the scale. Its outline takes the stroke, and its
      // inside takes the fill, so fill "none" gives a hollow dot.
      const r = appState.dotradius / appState.scaleFactor
      const dot = {
        tag: 'circle',
        attrs: {
          cx: args[0][0],
          cy: args[0][1],
          r,
          stroke: appState.stroke,
          ...resolveFill(appState),
          // Marks the circle as a dot, and records its radius. stringify.js
          // writes a `dot` only while the radius is unchanged.
          'data-dot': r
        }
      }
      if (appState.strokewidth !== 1) { dot.attrs['stroke-width'] = appState.strokewidth }
      const label = args[1]
      if (typeof label !== "string" || label === "") { return dot }
      const textElement = text.createTextElement(
        label,
        { x: args[0][0], y: args[0][1] },
        { ...appState, textposition: args[2] || "below" }
      )
      return [dot, textElement]
    }
    default:
      return null
  }
}

// Give an element the dash pattern (and line cap) of the current linetype.
const applyLinetype = (element, appState) => {
  if (appState.linetype && appState.linetype !== "solid") {
    element.attrs['stroke-dasharray'] = dashMap[appState.linetype]
    if (linecapMap[appState.linetype]) {
      element.attrs['stroke-linecap'] = linecapMap[appState.linetype]
    }
  }
}

const arrowGroup = (args, appState) => {
  const pathElement = path(args[0], appState)
  pathElement.attrs['marker-end'] = markerEnd('arrow', appState.strokewidth)
  applyLinetype(pathElement, appState)
  const oldTextPosition = appState.textposition
  // Position the text opposite the arrow's direction (away from the arrowhead),
  // based on whichever of dx, dy dominates the first segment.
  const dx = pathElement.points[1].x - pathElement.points[0].x
  const dy = pathElement.points[1].y - pathElement.points[0].y
  appState.textposition = Math.abs(dy) > Math.abs(dx)
    ? (dy > 0 ? 'below' : 'above')
    : (dx > 0 ? 'leaderLeft' : 'leaderRight')
  const textElement = text.createLabelElement(
    args[1],
    pathElement.points[0],
    appState
  )
  const group = [pathElement, textElement];
  appState.textposition = oldTextPosition
  return group
}

// A unit vector at `deg` degrees. Multiples of 90° come out exact, so a
// vertical or horizontal line built from one stays exactly vertical or
// horizontal (cos 90° is 6e-17, not 0).
export const unitVector = deg => {
  const quarterTurns = deg / 90
  if (Number.isInteger(quarterTurns)) {
    return [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }][((quarterTurns % 4) + 4) % 4]
  }
  const rad = deg * Math.PI / 180
  return { x: Math.cos(rad), y: Math.sin(rad) }
}

// The label for a dimension of length `value`, written with the sketch's
// rounding spec and decimal format. format.js writes Hurmet's TeX, e.g. 1{,}500,
// so convert it to plain text the way Hurmet does. A feet-and-inches sketch
// gets labels such as 4′-3³⁄₈″, with the inches rounded to appState.fraction.
export const dimensionLabel = (value, appState) => {
  const formatNum = num => formatFloat(num, appState.roundingSpec, appState.decimalFormat)
    .replace(/{,}/g, ",").replace(/\\/g, "")
  return appState.unit === "ft-in"
    ? feetInchesLabel(value, formatNum, appState.fraction)
    : formatNum(value)
}

const dimensionGroup = (args, appState, dwg) => {
  // Optional trailing angles make an oblique dimension string:
  //   dimension (points; labelPoint), [labels], dimAngle, extAngle
  // The labels may be omitted: dimension (points; labelPoint), dimAngle, extAngle
  if (typeof args[1] === "number") { args = [args[0], null, ...args.slice(1)] }
  if (typeof args[2] === "number" && typeof args[3] === "number") {
    return obliqueDimensionGroup(args, appState)
  }
  const labels = args[1];
  // The label written for span i. "" means leave the span
  // blank. null means none was written, so show the measured length.
  const writtenLabel = i => {
    const label = Array.isArray(labels) ? labels[i] : undefined
    return typeof label === "string" ? label : null
  }
  const labelPoint = args[0].pop()
  const dimPts = args[0];
  // Not zoom: a reloaded (or undone) drawing is built at zoom 1, so zoom would change the gaps.
  const SF = appState.scaleFactor
  const elements = [];
  const n = dimPts.length;
  const textposition = appState.textposition; // Save current text position
  if ((dimPts[0][1] < dimPts[n - 1][1] && dimPts[0][1] < labelPoint[1]  && labelPoint[1] < dimPts[n - 1][1]) ||
      (dimPts[n - 1][1] < dimPts[0][1] &&  dimPts[n - 1][1] < labelPoint[1] && labelPoint[1] < dimPts[0][1])) {
    // A vertical string of dimensions
    const six = 6  / SF * Math.sign(labelPoint[0] - dimPts[0][0])
    for (let i = 0; i < n; i++) {
      // Draw extension lines
      elements.push({
        tag: 'line', 
        attrs: {
          x1: dimPts[i][0] + six,
          y1: dimPts[i][1],
          x2: labelPoint[0] + six,
          y2: dimPts[i][1],
          stroke: "black",
          'stroke-width': 0.5,
          'stroke-dasharray': null
        }
      })
    }
    appState.textposition = Math.sign(six) > 0 ? 'right' : 'left'
    for (let i = 0; i < n - 1; i++) {
      // Draw dimension lines with arrows
      elements.push({
        tag: 'line', 
        attrs: {
          x1: labelPoint[0],
          y1: dimPts[i][1],
          x2: labelPoint[0],
          y2: dimPts[i + 1][1],
          stroke: "black",
          'stroke-width': 0.5,
          'stroke-dasharray': null,
          'marker-start': `url(#dimarrow)`,
          'marker-end': `url(#dimarrow)`
        }
      })
    }
    for (let i = 0; i < n - 1; i++) {
      // Write dimension text in between extension lines
      const label = writtenLabel(i)
      if (label === "") { continue }
      const dimValue = Math.abs(dimPts[i + 1][1] - dimPts[i][1]);
      const midPoint = {
        x: labelPoint[0],
        y: (dimPts[i][1] + dimPts[i + 1][1]) / 2
      }
      const textElement = text.createLabelElement(
        label ?? dimensionLabel(dimValue, appState),
        midPoint,
        appState
      )
      elements.push(textElement)
    }
  } else if ((dimPts[0][0] < dimPts[n - 1][0] && dimPts[0][0] < labelPoint[0]  && labelPoint[0] < dimPts[n - 1][0]) ||
            (dimPts[n - 1][0] < dimPts[0][0] &&  dimPts[n - 1][0] < labelPoint[0] && labelPoint[0] < dimPts[0][0])) {
    // A horizontal string of dimensions
    const six = 6  / SF * Math.sign(labelPoint[1] - dimPts[0][1])
    for (let i = 0; i < n; i++) {
      // Draw extension lines
      elements.push({
        tag: 'line', 
        attrs: {
          x1: dimPts[i][0],
          y1: dimPts[i][1] + six,
          x2: dimPts[i][0],
          y2: labelPoint[1] + six,
          stroke: "black",
          'stroke-width': 0.5,
          'stroke-dasharray': null
        }
      })
    }
    appState.textposition = Math.sign(six) > 0 ? 'above' : 'below'
    for (let i = 0; i < n - 1; i++) {
      // Draw dimension lines with arrows
      elements.push({
        tag: 'line', 
        attrs: {
          x1: dimPts[i][0],
          y1: labelPoint[1],
          x2: dimPts[i + 1][0],
          y2: labelPoint[1],
          stroke: "black",
          'stroke-width': 0.5,
          'stroke-dasharray': null,
          'marker-start': `url(#dimarrow)`,
          'marker-end': `url(#dimarrow)`
        }
      })
    }
    for (let i = 0; i < n - 1; i++) {
      // Write dimension text in between extension lines
      const label = writtenLabel(i)
      if (label === "") { continue }
      const dimValue = Math.abs(dimPts[i + 1][0] - dimPts[i][0]);
      const midPoint = {
        x: (dimPts[i][0] + dimPts[i + 1][0]) / 2,
        y: labelPoint[1]
      }
      const textElement = text.createLabelElement(
        label ?? dimensionLabel(dimValue, appState),
        midPoint,
        appState
      )
      elements.push(textElement)
    }
  } else {
    // Invalid label position. Abort.
    appState.textposition = textposition;
    return null;
  }
  appState.textposition = textposition;
  return elements
}

// A dimension string whose dimension line runs at dimAngle through the label
// point, and whose extension lines run at extAngle. Each dimension point is
// carried onto the dimension line along the extension direction. This covers
// aligned dimensions (extAngle = dimAngle + 90) and isometric ones, whose
// extension lines needn't be perpendicular to the dimension line.
const obliqueDimensionGroup = (args, appState) => {
  const labels = args[1]
  const writtenLabel = i => {
    const label = Array.isArray(labels) ? labels[i] : undefined
    return typeof label === "string" ? label : null
  }
  const pts = args[0].map(([x, y]) => ({ x, y }))
  const labelPoint = pts.pop()
  const n = pts.length
  const u = unitVector(args[2]) // Along the dimension line
  const e = unitVector(args[3]) // Along the extension lines
  const cross = (a, b) => a.x * b.y - a.y * b.x
  const denominator = cross(e, u)
  if (n < 2 || Math.abs(denominator) < 1e-9) { return null } // Parallel lines never meet
  // Distance from each point to the dimension line, along e.
  const t = pts.map(p => -cross({ x: p.x - labelPoint.x, y: p.y - labelPoint.y }, u) / denominator)
  const feet = pts.map((p, i) => ({ x: p.x + t[i] * e.x, y: p.y + t[i] * e.y }))
  // The direction from the points toward the dimension line.
  const sign = Math.sign(t.find(ti => Math.abs(ti) > 1e-9) ?? 1)
  // Not zoom: a reloaded (or undone) drawing is built at zoom 1, so zoom would change the gaps.
  const SF = appState.scaleFactor
  const six = 6 / SF
  const gap = { x: sign * six * e.x, y: sign * six * e.y }
  const elements = []
  for (let i = 0; i < n; i++) {
    // Extension lines, from six px beyond each point to six px past the dimension line
    elements.push({
      tag: 'line',
      attrs: {
        x1: pts[i].x + gap.x,
        y1: pts[i].y + gap.y,
        x2: feet[i].x + gap.x,
        y2: feet[i].y + gap.y,
        stroke: "black",
        'stroke-width': 0.5,
        'stroke-dasharray': null
      }
    })
  }
  for (let i = 0; i < n - 1; i++) {
    // Dimension lines with arrows
    elements.push({
      tag: 'line',
      attrs: {
        x1: feet[i].x,
        y1: feet[i].y,
        x2: feet[i + 1].x,
        y2: feet[i + 1].y,
        stroke: "black",
        'stroke-width': 0.5,
        'stroke-dasharray': null,
        'marker-start': `url(#dimarrow)`,
        'marker-end': `url(#dimarrow)`
      }
    })
  }
  // Put the labels on the far side of the dimension line from the points.
  const away = { x: sign * e.x, y: sign * e.y }
  const EPS = 1e-9
  const textposition = appState.textposition
  if (Math.abs(u.x) < EPS) {
    appState.textposition = away.x > 0 ? 'right' : 'left'
  } else if (Math.abs(u.y) < EPS) {
    appState.textposition = away.y > 0 ? 'above' : 'below'
  } else {
    // A sloped line. Hang the label off its lower end, so it clears the line.
    const rising = u.x * u.y > 0
    appState.textposition = away.y > 0
      ? (rising ? 'aboveleft' : 'aboveright')
      : (rising ? 'belowright' : 'belowleft')
  }
  for (let i = 0; i < n - 1; i++) {
    const label = writtenLabel(i)
    if (label === "") { continue }
    const dimValue = Math.abs((feet[i + 1].x - feet[i].x) * u.x + (feet[i + 1].y - feet[i].y) * u.y)
    const midPoint = {
      x: (feet[i].x + feet[i + 1].x) / 2,
      y: (feet[i].y + feet[i + 1].y) / 2
    }
    elements.push(text.createLabelElement(label ?? dimensionLabel(dimValue, appState), midPoint, appState))
  }
  appState.textposition = textposition
  return elements
}

// The r of a path step written as [x, y], [x, y, r], or [x, y, ±rx, ry, angle]
// (see arcStep.js). A five-number row may hold a straight step or a circular
// arc, which simplifyR turns back into 0 or a number.
const stepR = step => step.length === 5 ? simplifyR([step[2], step[3], step[4]])
  : step.length === 3 ? step[2]
  : 0

// `points` holds the rows of a path statement, all of one width: 2, 3, or 5
// (see pathRows in arcStep.js).
export const path = (points, appState) => {
  const width = Array.isArray(points[0]) ? points[0].length : 0
  if (![2, 3, 5].includes(width) || points.some(step => !Array.isArray(step) || step.length !== width)) {
    throw new Error(`Invalid path: every row must have 2, 3, or 5 numbers, the same in each row`)
  }
  let d = 'M ' + points[0][0] + ',' + points[0][1];
  for (let i = 1; i < points.length; i++) {
    const step = points[i];
    const r = stepR(step)
    d += ' ' + (r ? arcCommand(r, step[0], step[1]) : 'L ' + step[0] + ',' + step[1])
  }
  return {
    tag: 'path',
    attrs: {
      d: d,
      stroke: appState.stroke,
      'stroke-width': appState.strokewidth,
      ...resolveFill(appState)
    },
    points: points.map((step, i) => ({ x: step[0], y: step[1], r: i === 0 ? 0 : stepR(step) }))
  }
}

