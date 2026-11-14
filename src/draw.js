import { dt } from "./constants"
import { format } from "./format"
import { isVector } from "./matrix"
import { Rnl } from "./rational"
import { inlineMd2ast } from "./md2ast"
import { errorOprnd } from "./error"
import {
  unitScaleFactors, dashMap, linecapMap, fillPatternNames, arrowheadNames, arrowdotNames,
  markerFamily, sanitizeForId, roundingSpecRegEx, inchFractions, dotLabelPositionRegEx,
  markAttribute
} from "./sketch/shared.js"
import { resolveUnit } from "./sketch/unitAliases.js"
import { simplifyR } from "./sketch/arcStep.js"

// Sketch (src/sketch/) and draw() read the same statements. Their shared definitions
// live in Sketch's shared.js, unitAliases.js, and arcStep.js, which import nothing.

// decimalFormat and roundingSpec come from the parent document. A format statement
// in the drawing overrides roundingSpec.
const startSvg = (decimalFormat = "1,000,000.", roundingSpec = "h3") => {
  return {
    tag: 'svg',
    children: [],
    attrs: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 250,
      height: 250,
      style: "display: inline;"
    },
    // Fields outside attrs are not written as SVG attributes.
    caption: false,  // If true, Hurmet writes the title as a caption.
    patterns: [],    // The { name, color } of each fill pattern used. The renderer
                     // writes a <pattern> def for each.
    temp: {
      width: 250,
      height: 250,
      xmin: 0,
      xmax: 5,
      ymin: 0,
      ymax: 5,
      xunitlength: 20,  // px
      yunitlength: 20,  // px
      origin: [0, 0],   // in px (default is bottom left corner)
      scene: null,      // { S, dx, dy } from a scene statement. S is px per model unit.
      unit: "px",       // The scene's unit
      roundingSpec,     // Rounding of dimension labels
      fraction: 16,     // Denominator of the inch fractions in "ft-in" dimension labels
      decimalFormat,    // From the parent document
      stroke: "black",
      strokewidth: 1,
      linetype: "solid",
      fill: "none",
      pattern: "solid",
      fontcolor: "black",
      fontstyle: "normal",
      fontfamily: "sans-serif",
      fontsize: 13.33, // px, ~10 pt
      fontweight: "normal",
      marker: "none",
      dotradius: 4,
      axesstroke: "black",
      gridstroke: "grey"
    }
  }
}

// Helpers
const isString = oprnd => oprnd != null && oprnd.dtype === dt.STRING
const isNumber = oprnd => oprnd != null && Rnl.isRational(oprnd.value)
const drawError = statement => errorOprnd("DRAW_ARG", statement)

// A model point, in px.
const toPx = (attrs, x, y) => [
  x * attrs.xunitlength + attrs.origin[0],
  attrs.height - y * attrs.yunitlength - attrs.origin[1]
]

// The fill paint for an element: the fill color, or, while a fill pattern is
// in effect, a reference to that pattern in the fill color. Records each
// pattern used, so the renderer can write its <pattern> def.
const fillPaint = svg => {
  const { fill, pattern } = svg.temp
  if (pattern === "solid" || !fill || fill === "none") { return fill }
  if (!svg.patterns.some(p => p.name === pattern && p.color === fill)) {
    svg.patterns.push({ name: pattern, color: fill })
  }
  return `url(#fp-${pattern}-${sanitizeForId(fill)})`
}

// Set an element's stroke, line type and fill. Elements with no inside, such
// as lines, get no fill.
const setStrokeAndFill = (node, svg, hasFill = true) => {
  const attrs = svg.temp
  node.attrs["stroke-width"] = attrs.strokewidth
  node.attrs.stroke = attrs.stroke
  node.attrs.fill = hasFill ? fillPaint(svg) : "none"
  if (dashMap[attrs.linetype]) {
    node.attrs["stroke-dasharray"] = dashMap[attrs.linetype]
    if (linecapMap[attrs.linetype]) {
      node.attrs["stroke-linecap"] = linecapMap[attrs.linetype]
    }
  }
}

// Give the model-to-px mapping of a scene statement to attrs.
const applyScene = attrs => {
  const { S, dx, dy } = attrs.scene
  attrs.xunitlength = S
  attrs.yunitlength = S
  attrs.origin = [S * dx, S * dy]
  attrs.xmin = -dx
  attrs.xmax = attrs.width / S - dx
  attrs.ymin = -dy
  attrs.ymax = attrs.height / S - dy
}

const pointZeroRegEx = /\.0+$/
const chopZ = str => {
  const k = str.indexOf(".")
  if (k === -1) { return str }
  if (pointZeroRegEx.test(str)) { return str.replace(pointZeroRegEx, "") }
  let i
  for (i = str.length - 1; i > k && str.charAt(i) === "0"; i--) {
    if (i === k) { i-- }
  }
  return str.slice(0, i + 1)
}

// The [x, y] numbers of a point operand, or null.
const pointOf = oprnd => oprnd != null && Array.isArray(oprnd.value) &&
  oprnd.value.length === 2 && oprnd.value.every(Rnl.isRational)
  ? oprnd.value.map(e => Rnl.toNumber(e))
  : null

// The rows of a matrix operand, as numbers, or null. A single row may be written as a
// vector. Every row must have the same length.
const numberRows = oprnd => {
  if (oprnd == null || !Array.isArray(oprnd.value) || oprnd.value.length === 0) {
    return null
  }
  const value = oprnd.value
  if (value.every(Rnl.isRational)) { return [value.map(e => Rnl.toNumber(e))] }
  if (!value.every(row => Array.isArray(row) && !Rnl.isRational(row) &&
      row.length === value[0].length && row.every(Rnl.isRational))) {
    return null
  }
  return value.map(row => row.map(e => Rnl.toNumber(e)))
}

// The r of a path row written as [x, y], [x, y, r], or [x, y, ±rx, ry, angle].
// As in Sketch's elementObject.js stepR().
const stepR = row => row.length === 5
  ? simplifyR([row[2], row[3], row[4]])
  : row.length === 3
  ? row[2]
  : 0

// Arrow and dimension labels keep the default font size, as in Sketch's text.js.
const labelFontSize = 13.33 // px

const pxText = p => `${p[0].toFixed(4)},${p[1].toFixed(4)}`

// Cubic Bezier segments through px points, from a uniform Catmull-Rom spline whose end
// points are their own neighbors. As in Sketch's freehandMath.js.
const catmullRomToBezier = pts => {
  const n = pts.length
  const segments = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2 < n ? i + 2 : n - 1]
    segments.push({
      cp1: [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      cp2: [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      end: p2
    })
  }
  return segments
}

// Markers
// Sketch draws markers as <marker> defs sized in stroke widths. Hurmet draws the same
// shapes inline, as plain <path> and <circle> elements, so that the SVG renders alike
// everywhere. Each marker is filled with the stroke color.

// The marker statement accepts Sketch's marker names. Every arrowhead size is "arrow",
// every arrowdot size is "arrowdot" (markerFamily in shared.js).
const markerNames = new Set(["none", "dot", ...arrowheadNames, ...arrowdotNames])

// Arrowhead [length, width], in stroke widths. The size suits the stroke width,
// as in Sketch's arrowheadFor() and its marker defs in index.html.
const arrowheadSize = sw => sw < 0.75
  ? [20, 12]   // thinarrow
  : sw < 1.5
  ? [12, 7.8]  // arrow
  : sw < 2.5
  ? [8, 6]     // thickarrow
  : [6.5, 4.4] // thickerarrow
const dimArrowSize = [18, 12] // dimarrow
const markerDotRadius = 3 // in stroke widths

// A filled arrowhead whose tip is at px point `tip`, pointing along unit vector u.
const arrowheadNode = (tip, u, [length, width], sw, color) => {
  const n = [-u[1], u[0]]
  const base = [tip[0] - length * sw * u[0], tip[1] - length * sw * u[1]]
  const h = width / 2 * sw
  return {
    tag: "path",
    attrs: {
      d: `M${base[0] + h * n[0]},${base[1] + h * n[1]} L${tip[0]},${tip[1]} ` +
         `L${base[0] - h * n[0]},${base[1] - h * n[1]} Z`,
      fill: color,
      stroke: "none"
    }
  }
}

// Draw the current marker at px point `end`, where an element ends while heading
// along px unit vector u.
const drawMarker = (svg, end, u) => {
  const { marker, strokewidth: sw, stroke } = svg.temp
  if (marker === "none") { return }
  if (marker === "dot" || marker === "arrowdot") {
    svg.children.push({ tag: "circle", attrs: {
      cx: end[0], cy: end[1], r: markerDotRadius * sw, fill: stroke, stroke: "none"
    } })
  }
  const size = arrowheadSize(sw)
  if (marker === "arrow") {
    svg.children.push(arrowheadNode(end, u, size, sw, stroke))
  } else if (marker === "arrowdot") {
    // The arrowhead's tip touches the dot.
    const tip = [end[0] - markerDotRadius * sw * u[0], end[1] - markerDotRadius * sw * u[1]]
    svg.children.push(arrowheadNode(tip, u, size, sw, stroke))
  }
}

// The px unit vector of a model-space vector v. A zero vector points right, as in SVG.
const pxDirection = (attrs, v) => {
  const w = [v[0] * attrs.xunitlength, -v[1] * attrs.yunitlength]
  const d = Math.hypot(w[0], w[1])
  return d > 0 ? [w[0] / d, w[1] / d] : [1, 0]
}

// The direction, in model space, in which a path step from p to q is heading when it
// reaches q. The step's r is 0 (straight), a signed radius (circular arc, + for CCW),
// or [±rx, ry, angle] (elliptical arc, the sign of rx gives the direction). As in
// Sketch's arcStep.js, an arc spans at most half its circle or ellipse, and radii too
// small for the chord are scaled up, as SVG does.
const endDirection = (p, q, r) => {
  if (!r || (Array.isArray(r) && (r[0] === 0 || r[1] === 0))) {
    return [q[0] - p[0], q[1] - p[1]]
  }
  const [srx, sry, angle = 0] = Array.isArray(r) ? r : [r, r, 0]
  const rx = Math.abs(srx)
  const ry = Math.abs(sry)
  const ccw = srx >= 0
  const rad = angle * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // Into the ellipse's own frame, scaled so that the ellipse is a unit circle.
  const toUnit = pt => [(pt[0] * cos + pt[1] * sin) / rx, (-pt[0] * sin + pt[1] * cos) / ry]
  const a = toUnit(p)
  const b = toUnit(q)
  const chord = [b[0] - a[0], b[1] - a[1]]
  const len = Math.hypot(chord[0], chord[1])
  if (len === 0) { return [q[0] - p[0], q[1] - p[1]] }
  const h = Math.sqrt(Math.max(1 - len * len / 4, 0))
  // A CCW arc's center is to the left of the chord.
  const side = ccw ? 1 : -1
  const c = [(a[0] + b[0]) / 2 - side * h * chord[1] / len,
    (a[1] + b[1]) / 2 + side * h * chord[0] / len]
  const t = Math.atan2(b[1] - c[1], b[0] - c[0])
  // d/dt of center + R(angle)·(rx cos t, ry sin t), reversed for a CW arc.
  const dx = -rx * Math.sin(t) * side
  const dy = ry * Math.cos(t) * side
  return [dx * cos - dy * sin, dx * sin + dy * cos]
}


// A text position, as in Sketch: e.g., "above", "belowright", "leaderleft".
// The default is "middle".
const textPositionRegEx = /^(?:above|leader|middle|below)?(?:left|right)?$/

// In a string, scanFunction in module.js writes a line break as ␤ (U+2424).
const lineBreakInString = /␤/g

// Write text at model point p. The geometry is that of Sketch's text.js
// (adjustTextPoint, getTspans), converted to px. `style` may override the
// current fontsize and fontcolor, e.g. for axes labels.
const textLocal = (svg, p, str, pos, style = {}) => {
  const attrs = svg.temp
  const fontsize = style.fontsize ?? attrs.fontsize
  const fontcolor = style.fontcolor ?? attrs.fontcolor
  const position = (pos || "middle").toLowerCase()
  const lines = str.replace(lineBreakInString, "\n").split("\n")
  const numLines = lines.length
  let [x, y] = toPx(attrs, p[0], p[1])
  // Each line's y is at the line's middle (dominant-baseline="middle").
  if (position.includes("above")) {
    y -= fontsize * (1.2 * (numLines - 1) + 0.7)
  } else if (position.includes("below")) {
    y += fontsize * 0.8
  } else if (!position.includes("leader")) {
    // Center the block of lines vertically. Leader text starts at the point.
    y -= fontsize * 0.6 * (numLines - 1)
  }
  const textanchor = position.includes("right")
    ? "start"
    : position.includes("left")
    ? "end"
    : "middle"
  // A little padding, so that the text doesn't crowd the point.
  if (textanchor === "start") { x += fontsize * 0.3 }
  if (textanchor === "end") { x -= fontsize * 0.3 }

  const textNode = { tag: "text", children: [], attrs: {} }
  textNode.attrs.x = x
  textNode.attrs.y = y
  textNode.attrs["font-family"] = attrs.fontfamily
  textNode.attrs["font-size"] = fontsize
  textNode.attrs.fill = fontcolor
  textNode.attrs["text-anchor"] = textanchor
  textNode.attrs["dominant-baseline"] = "middle"

  // Each line is a series of <tspan> nodes, one per Markdown mark node. Each line's
  // first tspan returns to x and moves down 1.2 em. A blank line has no tspan, so its
  // line spacing goes to the next line that has one.
  let linesOwed = 0
  lines.forEach((line, i) => {
    if (i > 0) { linesOwed += 1 }
    const ast = inlineMd2ast(line)
    if (!Array.isArray(ast)) { return }
    ast.forEach((markNode, j) => {
      const tspan = { tag: "tspan", text: markNode.text, attrs: {} }
      if (j === 0) {
        tspan.attrs.x = x
        tspan.attrs.dy = linesOwed * fontsize * 1.2
        linesOwed = 0
      }
      for (const mark of (markNode.marks || [])) {
        const markAttr = markAttribute[mark.type]
        if (!markAttr) { continue } // e.g., a link. Write its text plain.
        tspan.attrs[markAttr[0]] = markAttr[1]
        if (mark.type === "subscript") {
          tspan.attrs["baseline-shift"] = "sub"
        } else if (mark.type === "superscript") {
          tspan.attrs["baseline-shift"] = "super"
        }
      }
      textNode.children.push(tspan)
    })
  })
  svg.children.push(textNode)
  return svg
}

const pointText = (point, attrs) => {
  return toPx(attrs, point[0], point[1]).map(n => n.toFixed(4)).join(",")
}

// The SVG command for an arc step that ends at model point q. r is a signed radius
// (+ for CCW) or [±rx, ry, angle]. As in Sketch's arcStep.js arcCommand(), but in px,
// where the y-axis points down, so CCW is sweep 0 and the rotation is negated.
const arcCommand = (attrs, r, q) => {
  const [srx, ry, angle = 0] = Array.isArray(r) ? r : [r, r, 0]
  const sweep = srx >= 0 ? 0 : 1
  const rxPx = Math.abs(srx) * attrs.xunitlength
  const ryPx = Math.abs(ry) * attrs.yunitlength
  return `A${rxPx},${ryPx} ${angle === 0 ? 0 : -angle} 0 ${sweep} ${pointText(q, attrs)}`
}

// Fitting the SVG to its contents
// As in Sketch's utils.js computeFrame(), a drawing with a scene and no grid or axes is
// sized to the extent of its elements plus a margin. The elements keep their px
// coordinates; a viewBox brings the box into view. Like Sketch, the box ignores stroke
// widths, which the margin covers. Unlike Sketch, it includes arrowheads and marker dots,
// which Hurmet draws as elements, and it estimates text from character counts, since
// Hurmet can't measure glyphs while it calculates.

const fitMargin = 4 // px

// A 2D affine matrix [a, b, c, d, e, f] maps (x, y) to (a·x + c·y + e, b·x + d·y + f).
const identity = [1, 0, 0, 1, 0, 0]
const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
]
const applyMatrix = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

// The matrix of an SVG transform attribute: translate, scale, and rotate.
const transformMatrix = str => {
  let m = identity
  for (const [, fn, argStr] of (str || "").matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = argStr.split(/[\s,]+/).filter(s => s !== "").map(Number)
    if (fn === "translate") {
      m = multiply(m, [1, 0, 0, 1, a[0], a[1] || 0])
    } else if (fn === "scale") {
      m = multiply(m, [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0])
    } else if (fn === "rotate") {
      const rad = a[0] * Math.PI / 180
      const [cos, sin] = [Math.cos(rad), Math.sin(rad)]
      const [cx, cy] = a.length === 3 ? [a[1], a[2]] : [0, 0]
      m = multiply(m, [1, 0, 0, 1, cx, cy])
      m = multiply(m, [cos, sin, -sin, cos, 0, 0])
      m = multiply(m, [1, 0, 0, 1, -cx, -cy])
    }
  }
  return m
}

// The parameters in [0, 1] where a cubic Bézier coordinate reaches an extreme.
const cubicExtrema = (p0, p1, p2, p3) => {
  // The derivative is a quadratic: a·t² + b·t + c
  const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3)
  const b = 6 * (p0 - 2 * p1 + p2)
  const c = 3 * (p1 - p0)
  const roots = []
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) { roots.push(-c / b) }
  } else {
    const disc = b * b - 4 * a * c
    if (disc >= 0) {
      const root = Math.sqrt(disc)
      roots.push((-b + root) / (2 * a), (-b - root) / (2 * a))
    }
  }
  return roots.filter(t => t > 0 && t < 1)
}
const cubicPoint = (p0, p1, p2, p3, t) => {
  const mt = 1 - t
  return [0, 1].map(k => mt * mt * mt * p0[k] + 3 * mt * mt * t * p1[k] +
    3 * mt * t * t * p2[k] + t * t * t * p3[k])
}

// The points that bound an SVG elliptical arc: its end points and any extreme points
// along the way. See the SVG spec, "Elliptical arc implementation notes", F.6.5.
const arcExtremePoints = (p1, rx, ry, degrees, largeArc, sweep, p2) => {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (rx === 0 || ry === 0) { return [p2] }
  const phi = degrees * Math.PI / 180
  const [cos, sin] = [Math.cos(phi), Math.sin(phi)]
  const dx = (p1[0] - p2[0]) / 2
  const dy = (p1[1] - p2[1]) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) {
    // The radii are too small for the chord, so scale them up, as SVG does.
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den))
  const cxp = coef * rx * y1 / ry
  const cyp = -coef * ry * x1 / rx
  const cx = cos * cxp - sin * cyp + (p1[0] + p2[0]) / 2
  const cy = sin * cxp + cos * cyp + (p1[1] + p2[1]) / 2
  const theta1 = Math.atan2((y1 - cyp) / ry, (x1 - cxp) / rx)
  let delta = Math.atan2((-y1 - cyp) / ry, (-x1 - cxp) / rx) - theta1
  if (sweep && delta < 0) { delta += 2 * Math.PI }
  if (!sweep && delta > 0) { delta -= 2 * Math.PI }
  const point = theta => [
    cx + rx * cos * Math.cos(theta) - ry * sin * Math.sin(theta),
    cy + rx * sin * Math.cos(theta) + ry * cos * Math.sin(theta)
  ]
  const tau = 2 * Math.PI
  const onArc = theta => {
    const t = delta >= 0
      ? ((theta - theta1) % tau + tau) % tau
      : ((theta1 - theta) % tau + tau) % tau
    return t <= Math.abs(delta)
  }
  const thetaX = Math.atan2(-ry * sin, rx * cos)
  const thetaY = Math.atan2(ry * cos, rx * sin)
  const candidates = [thetaX, thetaX + Math.PI, thetaY, thetaY + Math.PI]
  return [p2, ...candidates.filter(onArc).map(point)]
}

// The points that bound an SVG path's d attribute. Handles every path command.
const pathPoints = d => {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || []
  const points = []
  let i = 0
  let cmd = ""
  let cur = [0, 0]
  let start = [0, 0]
  let lastControl = null // For S and T
  let lastCmd = ""
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++]
    } else if (cmd === "M") {
      cmd = "L" // Coordinates after a moveto are implicit linetos.
    } else if (cmd === "m") {
      cmd = "l"
    }
    const rel = cmd === cmd.toLowerCase()
    const pt = () => {
      const x = num()
      const y = num()
      return rel ? [cur[0] + x, cur[1] + y] : [x, y]
    }
    const upper = cmd.toUpperCase()
    let control = null
    if (upper === "Z") {
      cur = start
    } else if (upper === "M") {
      cur = pt()
      start = cur
      points.push(cur)
    } else if (upper === "L" || upper === "T") {
      const p = pt()
      if (upper === "T") {
        // A quadratic whose control point reflects the last one
        const q = lastControl && /[QT]/.test(lastCmd)
          ? [2 * cur[0] - lastControl[0], 2 * cur[1] - lastControl[1]]
          : cur
        control = q
        const c1 = [cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1])]
        const c2 = [p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1])]
        for (const k of [0, 1]) {
          for (const t of cubicExtrema(cur[k], c1[k], c2[k], p[k])) {
            points.push(cubicPoint(cur, c1, c2, p, t))
          }
        }
      }
      cur = p
      points.push(cur)
    } else if (upper === "H") {
      cur = [rel ? cur[0] + num() : num(), cur[1]]
      points.push(cur)
    } else if (upper === "V") {
      cur = [cur[0], rel ? cur[1] + num() : num()]
      points.push(cur)
    } else if (upper === "C" || upper === "S" || upper === "Q") {
      let c1
      let c2
      let p
      if (upper === "C") {
        c1 = pt()
        c2 = pt()
        p = pt()
        control = c2
      } else if (upper === "S") {
        c1 = lastControl && /[CS]/.test(lastCmd)
          ? [2 * cur[0] - lastControl[0], 2 * cur[1] - lastControl[1]]
          : cur
        c2 = pt()
        p = pt()
        control = c2
      } else {
        const q = pt()
        p = pt()
        control = q
        c1 = [cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1])]
        c2 = [p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1])]
      }
      for (const k of [0, 1]) {
        for (const t of cubicExtrema(cur[k], c1[k], c2[k], p[k])) {
          points.push(cubicPoint(cur, c1, c2, p, t))
        }
      }
      cur = p
      points.push(cur)
    } else if (upper === "A") {
      const [rx, ry, angle, largeArc, sweep] = [num(), num(), num(), num(), num()]
      const p = pt()
      points.push(...arcExtremePoints(cur, rx, ry, angle, largeArc, sweep, p))
      cur = p
    } else {
      break // Not a path command
    }
    lastControl = control
    lastCmd = upper
  }
  return points
}

// The estimated px box of a <text> element, from its character count. As in Sketch's
// text.js, a character is 0.6 em wide, or 0.8 of that in a subscript or superscript.
// Each line is 1.2 em tall, centered on its y (dominant-baseline="middle").
const textBox = el => {
  const fs = Number(el.attrs["font-size"]) || 13.33
  const x = Number(el.attrs.x)
  const y = Number(el.attrs.y)
  const lineWidths = []
  let lineY = y
  let top = Infinity
  let bottom = -Infinity
  el.children.forEach((tspan, k) => {
    const attrs = tspan.attrs || {}
    if (k === 0 || attrs.dy != null) {
      if (k > 0) { lineY += Number(attrs.dy) }
      lineWidths.push(0)
      top = Math.min(top, lineY - 0.6 * fs)
      bottom = Math.max(bottom, lineY + 0.6 * fs)
    }
    const scale = attrs["baseline-shift"] ? 0.8 : 1
    lineWidths[lineWidths.length - 1] += tspan.text.length * 0.6 * fs * scale
  })
  if (lineWidths.length === 0) { return null }
  const width = Math.max(...lineWidths)
  const anchor = el.attrs["text-anchor"]
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2
  return [[left, top], [left + width, bottom]]
}

// The points that bound one element, in px.
const elementPoints = el => {
  const a = el.attrs
  const m = transformMatrix(a.transform)
  switch (el.tag) {
    case "path":
      return pathPoints(a.d)
    case "polygon":
    case "polyline":
      return a.points.trim().split(/\s+/).map(p => p.split(",").map(Number))
    case "rect":
    case "image": {
      const [x, y, w, h] = [a.x, a.y, a.width, a.height].map(Number)
      return [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(p => applyMatrix(m, p))
    }
    case "circle":
    case "ellipse": {
      const rx = Number(el.tag === "circle" ? a.r : a.rx)
      const ry = Number(el.tag === "circle" ? a.r : a.ry)
      const [cx, cy] = applyMatrix(m, [Number(a.cx), Number(a.cy)])
      // The extent of an ellipse after a linear map
      const halfW = Math.hypot(m[0] * rx, m[2] * ry)
      const halfH = Math.hypot(m[1] * rx, m[3] * ry)
      return [[cx - halfW, cy - halfH], [cx + halfW, cy + halfH]]
    }
    case "text":
      return textBox(el) || []
    default:
      return []
  }
}

// Size a drawing to its elements, as described above.
const fitToContent = svg => {
  const attrs = svg.temp
  if (!attrs || !attrs.scene || attrs.hasBackdrop) { return }
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const el of svg.children) {
    for (const [x, y] of elementPoints(el)) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) { continue }
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (minX === Infinity) { return } // An empty drawing keeps its frame.
  const round = v => Math.round(v * 1e4) / 1e4
  const left = round(minX - fitMargin)
  const top = round(minY - fitMargin)
  svg.attrs.width = Math.ceil(maxX + fitMargin - left)
  svg.attrs.height = Math.ceil(maxY + fitMargin - top)
  svg.attrs.viewBox = `${left} ${top} ${svg.attrs.width} ${svg.attrs.height}`
}

// Dimensions

const dimStrokeWidth = 0.5 // px
const dimGap = 6 // px between a dimension point and its extension line

const dimLineNode = (attrs, a, b) => {
  return { tag: "path", attrs: {
    d: `M${pointText(a, attrs)} ${pointText(b, attrs)}`,
    "stroke-width": dimStrokeWidth, stroke: "black", fill: "none"
  } }
}

// A unit vector at `deg` degrees. Multiples of 90° come out exact.
// As in Sketch's elementObject.js.
const unitVector = deg => {
  const quarterTurns = deg / 90
  if (Number.isInteger(quarterTurns)) {
    return [[1, 0], [0, 1], [-1, 0], [0, -1]][((quarterTurns % 4) + 4) % 4]
  }
  const rad = deg * Math.PI / 180
  return [Math.cos(rad), Math.sin(rad)]
}

// From a dimension's label list, a function that returns the label written for span i:
// a string, "" for a blank span, or null if none was written.
const labelList = oprnd => {
  if (oprnd == null) { return () => null }
  // Hurmet reads a one-element list, ["x"], as the string "x". Sketch writes ["x"] for
  // a dimension with one span, so a string is a list of one label.
  const list = Array.isArray(oprnd.value) ? oprnd.value : [oprnd.value]
  return i => {
    const label = list[i]
    return typeof label === "string"
      ? label
      : label != null && typeof label.value === "string"
      ? label.value
      : null
  }
}

// A horizontal or vertical dimension string, in model coordinates, as in Sketch's
// elementObject.js dimensionGroup(). Returns null if labelPoint is not between the end
// points, either vertically or horizontally.
const orthoDimension = (pts, lp, attrs) => {
  const n = pts.length
  const [first, last] = [pts[0], pts[n - 1]]
  const between = k => (first[k] < last[k] && first[k] < lp[k] && lp[k] < last[k]) ||
    (last[k] < first[k] && last[k] < lp[k] && lp[k] < first[k])
  const result = { extLines: [], dimLines: [], mids: [], values: [] }
  if (between(1)) {
    // A vertical string of dimensions
    const six = dimGap / attrs.xunitlength * Math.sign(lp[0] - first[0])
    for (const p of pts) { result.extLines.push([[p[0] + six, p[1]], [lp[0] + six, p[1]]]) }
    for (let i = 0; i < n - 1; i++) {
      result.dimLines.push([[lp[0], pts[i][1]], [lp[0], pts[i + 1][1]]])
      result.mids.push([lp[0], (pts[i][1] + pts[i + 1][1]) / 2])
      result.values.push(Math.abs(pts[i + 1][1] - pts[i][1]))
    }
    result.pos = six > 0 ? "right" : "left"
  } else if (between(0)) {
    // A horizontal string of dimensions
    const six = dimGap / attrs.yunitlength * Math.sign(lp[1] - first[1])
    for (const p of pts) { result.extLines.push([[p[0], p[1] + six], [p[0], lp[1] + six]]) }
    for (let i = 0; i < n - 1; i++) {
      result.dimLines.push([[pts[i][0], lp[1]], [pts[i + 1][0], lp[1]]])
      result.mids.push([(pts[i][0] + pts[i + 1][0]) / 2, lp[1]])
      result.values.push(Math.abs(pts[i + 1][0] - pts[i][0]))
    }
    result.pos = six > 0 ? "above" : "below"
  } else {
    return null
  }
  return result
}

// A dimension string whose dimension line runs at dimAngle through labelPoint, and
// whose extension lines run at extAngle. As in Sketch's obliqueDimensionGroup().
const obliqueDimension = (pts, lp, dimAngle, extAngle, attrs) => {
  const n = pts.length
  const u = unitVector(dimAngle) // Along the dimension line
  const e = unitVector(extAngle) // Along the extension lines
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0]
  const denominator = cross(e, u)
  if (Math.abs(denominator) < 1e-9) { return null } // Parallel lines never meet
  // Distance from each point to the dimension line, along e.
  const t = pts.map(p => -cross([p[0] - lp[0], p[1] - lp[1]], u) / denominator)
  const feet = pts.map((p, i) => [p[0] + t[i] * e[0], p[1] + t[i] * e[1]])
  // The direction from the points toward the dimension line.
  const sign = Math.sign(t.find(ti => Math.abs(ti) > 1e-9) ?? 1)
  const six = dimGap / attrs.xunitlength
  const gap = [sign * six * e[0], sign * six * e[1]]
  const result = { extLines: [], dimLines: [], mids: [], values: [] }
  for (let i = 0; i < n; i++) {
    result.extLines.push([[pts[i][0] + gap[0], pts[i][1] + gap[1]],
      [feet[i][0] + gap[0], feet[i][1] + gap[1]]])
  }
  for (let i = 0; i < n - 1; i++) {
    result.dimLines.push([feet[i], feet[i + 1]])
    result.mids.push([(feet[i][0] + feet[i + 1][0]) / 2, (feet[i][1] + feet[i + 1][1]) / 2])
    result.values.push(Math.abs((feet[i + 1][0] - feet[i][0]) * u[0] +
      (feet[i + 1][1] - feet[i][1]) * u[1]))
  }
  // Put the labels on the far side of the dimension line from the points.
  const away = [sign * e[0], sign * e[1]]
  if (Math.abs(u[0]) < 1e-9) {
    result.pos = away[0] > 0 ? "right" : "left"
  } else if (Math.abs(u[1]) < 1e-9) {
    result.pos = away[1] > 0 ? "above" : "below"
  } else {
    // A sloped line. Hang the label off its lower end, so it clears the line.
    const rising = u[0] * u[1] > 0
    result.pos = away[1] > 0
      ? (rising ? "aboveleft" : "aboveright")
      : (rising ? "belowright" : "belowleft")
  }
  return result
}

// Lengths in feet and inches, as in Sketch's feetInches.js.
const superscriptDigits = "⁰¹²³⁴⁵⁶⁷⁸⁹"
const subscriptDigits = "₀₁₂₃₄₅₆₇₈₉"
const toScript = (n, digits) => String(n).replace(/\d/g, d => digits[d])

// Write `value` (in inches, ≥ 0) as whole inches and a reduced fraction rounded to the
// nearest 1/denominator, e.g. 3³⁄₈.
const fractionalInches = denominator => value => {
  const ticks = Math.round(value * denominator)
  const whole = Math.floor(ticks / denominator)
  let num = ticks - whole * denominator
  let den = denominator
  if (num === 0) { return String(whole) }
  while (num % 2 === 0) { num /= 2; den /= 2 }
  return `${whole}${toScript(num, superscriptDigits)}⁄${toScript(den, subscriptDigits)}`
}

// A label such as 4′-3³⁄₈″, 3³⁄₈″, or 4′. `formatNum` writes the number of feet.
const feetInchesLabel = (value, formatNum, denominator) => {
  const writeInches = fractionalInches(denominator)
  const sign = value < 0 ? "-" : ""
  let feet = Math.floor(Math.abs(value) / 12)
  let inStr = writeInches(Math.abs(value) - feet * 12)
  const inchValue = str => Number(str.replace(",", "."))
  if (inchValue(inStr) >= 12) {
    // The inch part rounded up to a whole foot.
    feet += 1
    inStr = writeInches(0)
  }
  const label = feet === 0
    ? (inchValue(inStr) === 0 ? "0″" : `${sign}${inStr}″`)
    : inchValue(inStr) === 0
    ? `${sign}${formatNum(feet)}′`
    : `${sign}${formatNum(feet)}′-${inStr}″`
  return label.replace(/^(-?)0(?=[⁰¹²³⁴⁵⁶⁷⁸⁹])/, "$1") // ³⁄₈″, not 0³⁄₈″
}

// The measured length of a dimension span, written with the drawing's rounding spec and
// the document's decimal format. As in Sketch's elementObject.js dimensionLabel().
const dimensionLabel = (value, attrs) => {
  const formatNum = num => format(Rnl.fromNumber(num), attrs.roundingSpec,
    attrs.decimalFormat, "plain")
  return attrs.unit === "ft-in"
    ? feetInchesLabel(value, formatNum, attrs.fraction)
    : formatNum(value)
}

const functions = {
  // Set attributes
  stroke(svgOprnd, color) {
    svgOprnd.value.temp.stroke = color.value
    return svgOprnd
  },

  strokewidth(svgOprnd, num) {
    svgOprnd.value.temp.strokewidth = Rnl.toNumber(num.value)
    return svgOprnd
  },

  linetype(svgOprnd, str) {
    // "solid" | "dashed" | "dotted" | "centerline" | "border"
    if (!isString(str) || !Object.hasOwn(dashMap, str.value)) {
      return drawError("linetype")
    }
    svgOprnd.value.temp.linetype = str.value
    return svgOprnd
  },

  fill(svgOprnd, color) {
    svgOprnd.value.temp.fill = color.value
    return svgOprnd
  },

  pattern(svgOprnd, str) {
    // A fill pattern, drawn in the current fill color. "solid" means no pattern.
    if (!isString(str) || !fillPatternNames.includes(str.value)) {
      return drawError("pattern")
    }
    svgOprnd.value.temp.pattern = str.value
    return svgOprnd
  },

  fontcolor(svgOprnd, color) {
    if (!isString(color)) { return drawError("fontcolor") }
    svgOprnd.value.temp.fontcolor = color.value
    return svgOprnd
  },

  fontsize(svgOprnd, size) {
    svgOprnd.value.temp.fontsize = Rnl.toNumber(size.value)
    return svgOprnd
  },

  fontfamily(svgOprnd, str) {
    svgOprnd.value.temp.fontfamily = str.value // "sansserif"|"serif"|"fixed"|"monotype"
    return svgOprnd
  },

  marker(svgOprnd, str) {
    // "none" | "arrow" | "dot" | "arrowdot", or one of Sketch's sized marker names
    if (!isString(str) || !markerNames.has(str.value.trim())) {
      return drawError("marker")
    }
    svgOprnd.value.temp.marker = markerFamily(str.value.trim())
    return svgOprnd
  },

  // Initialize the svg.

  title(svgOprnd, strOprnd) {
    svgOprnd.value.children.push( { tag: "title", attrs: { text: strOprnd.value } })
    return svgOprnd
  },

  caption(svgOprnd, bool) {
    // caption true: Hurmet writes the title as a caption.
    if (bool == null || typeof bool.value !== "boolean") { return drawError("caption") }
    svgOprnd.value.caption = bool.value
    return svgOprnd
  },

  format(svgOprnd, spec) {
    // The rounding spec of dimension labels, e.g., "h3". Sketch wrote a decimal
    // format as a second argument in older sketches. It's ignored. The decimal
    // format comes from the parent document.
    if (!isString(spec) || !roundingSpecRegEx.test(spec.value)) {
      return drawError("format")
    }
    svgOprnd.value.temp.roundingSpec = spec.value
    return svgOprnd
  },

  fraction(svgOprnd, num) {
    // The denominator of the inch fractions in "ft-in" dimension labels.
    const denominator = isNumber(num) ? Rnl.toNumber(num.value) : NaN
    if (!inchFractions.has(denominator)) { return drawError("fraction") }
    svgOprnd.value.temp.fraction = denominator
    return svgOprnd
  },

  frame(svgOprnd, width = 250, height = 250, position = "inline") {
    const svg = svgOprnd.value
    const attrs = svg.temp
    attrs.width = typeof width === "number" ? width : Rnl.toNumber(width.value)
    svg.attrs.width = attrs.width
    attrs.height = typeof height === "number" ? height : Rnl.toNumber(height.value)
    svg.attrs.height = attrs.height
    if (typeof position !== "string") { position = position.value }
    if (position !== "inline") { svg.attrs.float = position }
    if (attrs.scene) {
      applyScene(attrs)
    } else {
      attrs.xunitlength = attrs.width / (attrs.xmax - attrs.xmin)
      attrs.yunitlength = attrs.height / (attrs.ymax - attrs.ymin)
      attrs.origin = [-attrs.xmin * attrs.xunitlength, -attrs.ymin * attrs.yunitlength]
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  scene(svgOprnd, scale, unit, dx, dy) {
    // scene scale, "unit", dx, dy
    // A model point (x, y) is drawn at px (S·(x + dx), frameHeight − S·(y + dy)),
    // where S = scale × unitScaleFactors[unit] is px per model unit.
    if (!isNumber(scale) || !isString(unit) || !isNumber(dx) || !isNumber(dy)) {
      return drawError("scene")
    }
    const scaleNum = Rnl.toNumber(scale.value)
    const unitName = unit.value.trim()
    const canonicalUnit = Object.hasOwn(unitScaleFactors, unitName)
      ? unitName
      : resolveUnit(unitName)
    if (!(scaleNum > 0 && Number.isFinite(scaleNum)) || !canonicalUnit) {
      return drawError("scene")
    }
    const svg = svgOprnd.value
    const attrs = svg.temp
    attrs.unit = canonicalUnit
    attrs.scene = {
      S: scaleNum * unitScaleFactors[canonicalUnit],
      dx: Rnl.toNumber(dx.value),
      dy: Rnl.toNumber(dy.value)
    }
    applyScene(attrs)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  view(svgOprnd, xmin = 0, xmax = 5, ymin, ymax) {
    const svg = svgOprnd.value
    const attrs = svg.temp
    attrs.scene = null // Of scene and view, the later one applies.
    attrs.xmin = typeof xmin === "number" ? xmin : Rnl.toNumber(xmin.value)
    attrs.xmax = typeof xmax === "number" ? xmax : Rnl.toNumber(xmax.value)
    attrs.xunitlength = attrs.width / (attrs.xmax - attrs.xmin)
    attrs.yunitlength = attrs.xunitlength // This may change below.
    if (ymin == null) {
      attrs.origin = [-attrs.xmin * attrs.xunitlength, attrs.height / 2];
      attrs.ymin = -attrs.height / (2 * attrs.yunitlength)
      attrs.ymax = -attrs.ymin
    } else {
      attrs.ymin = Rnl.toNumber(ymin.value)
      if (ymax != null) {
        attrs.ymax = Rnl.toNumber(ymax.value)
        attrs.yunitlength = attrs.height / (attrs.ymax - attrs.ymin)
      } else {
        attrs.ymax = attrs.height / attrs.yunitlength + attrs.ymin
      }
      attrs.origin = [-attrs.xmin * attrs.xunitlength, -attrs.ymin * attrs.yunitlength];
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  // Draw things

  grid(svgOprnd, gdx, gdy) {
    const svg = svgOprnd.value
    const attrs = svg.temp
    gdx = gdx == null ? attrs.xunitlength : Rnl.toNumber(gdx.value) * attrs.xunitlength
    gdy = gdy == null ? gdx : Rnl.toNumber(gdy.value) * attrs.yunitlength
    attrs.hasBackdrop = true // A grid fills the frame, so the frame keeps its size.
    const pnode = { tag: "path", attrs: {} }
    let str = ""
    for (let x = attrs.origin[0]; x < attrs.width; x += gdx) {
      str += " M" + x + ",0 " + x + "," + attrs.height
    }
    for (let x = attrs.origin[0] - gdx; x > 0; x -= gdx) {
      str += " M" + x + ",0 " + x + "," + attrs.height
    }
    for (let y = attrs.height - attrs.origin[1]; y < attrs.height; y += gdy) {
      str += " M0," + y + " " + attrs.width + "," + y
    }
    for (let y = attrs.height - attrs.origin[1] - gdy; y > 0; y -= gdy) {
      str += " M0," + y + " " + attrs.width + "," + y
    }
    pnode.attrs.d = str
    pnode.attrs["stroke-width"] = 0.5
    pnode.attrs.stroke = attrs.gridstroke
    pnode.attrs.fill = "none"
    svg.children.push(pnode)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  axes(svgOprnd, dx, dy, labels, gdx, gdy) {
    let svg = svgOprnd.value
    const attrs = svg.temp
    dx = (dx == null ? attrs.xunitlength : Rnl.toNumber(dx.value) * attrs.xunitlength)
    dy = (dy == null ? dx : Rnl.toNumber(dy.value) * attrs.yunitlength)
    // Axes labels are black, in a font size that fits the ticks, as in Sketch.
    const labelStyle = { fontsize: Math.min(dx / 2, dy / 2, 10), fontcolor: "black" }
    const ticklength = labelStyle.fontsize / 4
    attrs.hasBackdrop = true // Axes fill the frame, so the frame keeps its size.
    if (gdx != null) {
      this.grid(svgOprnd, gdx, gdy)
    }
    const pnode = { tag: "path", attrs: {} }
    let str = "M0," + (attrs.height - attrs.origin[1]) + " " + attrs.width + "," +
      (attrs.height - attrs.origin[1]) + " M" + attrs.origin[0] + ",0 " +
      attrs.origin[0] + "," + attrs.height
    for (let x = attrs.origin[0] + dx; x < attrs.width; x += dx) {
      str += " M" + x + " " + (attrs.height - attrs.origin[1] + ticklength) + " " + x
            + "," + (attrs.height - attrs.origin[1] - ticklength)
    }
    for (let x = attrs.origin[0] - dx; x > 0; x -= dx) {
      str += " M" + x + "," + (attrs.height - attrs.origin[1] + ticklength) + " " + x
            + "," + (attrs.height - attrs.origin[1] - ticklength)
    }
    for (let y = attrs.height - attrs.origin[1] + dy; y < attrs.height; y += dy) {
      str += " M" + (attrs.origin[0] + ticklength) + "," + y + " " +
                   (attrs.origin[0] - ticklength) + "," + y
    }
    for (let y = attrs.height - attrs.origin[1] - dy; y > 0; y -= dy) {
      str += " M" + (attrs.origin[0] + ticklength) + "," + y + " " +
                   (attrs.origin[0] - ticklength) + "," + y
    }
    if (labels != null) {
      const ldx = dx / attrs.xunitlength
      const ldy = dy / attrs.yunitlength
      const lx = (attrs.xmin > 0 || attrs.xmax < 0 ? attrs.xmin : 0)
      const ly = (attrs.ymin > 0 || attrs.ymax < 0 ? attrs.ymin : 0)
      const lxp = (ly === 0 ? "below" : "above")
      const lyp = (lx === 0 ? "left" : "right")
      // Digits after the decimal point. Never negative, or toFixed would throw.
      const ddx = Math.max(0, Math.floor(1.1 - Math.log10(ldx)) + 1)
      const ddy = Math.max(0, Math.floor(1.1 - Math.log10(ldy)) + 1)
      for (let x = ldx; x <= attrs.xmax; x += ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp, labelStyle)
      }
      for (let x = -ldx; attrs.xmin <= x; x -= ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp, labelStyle)
      }
      for (let y = ldy; y <= attrs.ymax; y += ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp, labelStyle)
      }
      for (let y = -ldy; attrs.ymin <= y; y -= ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp, labelStyle)
      }
    }
    pnode.attrs.d = str
    pnode.attrs["stroke-width"] = 0.5
    pnode.attrs.stroke = attrs.axesstroke
    pnode.attrs.fill = "none"
    svg.children.push(pnode)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  line(svgOprnd, m) { // segment connecting points p,q (coordinates in units)
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "path", attrs: {} }
    const p = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])]
    const q = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])]
    node.attrs.d = "M" + (p[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - p[1] * attrs.yunitlength - attrs.origin[1]) + " " +
      (q[0] * attrs.xunitlength + attrs.origin[0]) + "," + (attrs.height -
       q[1] * attrs.yunitlength - attrs.origin[1]);
    setStrokeAndFill(node, svg, false)
    svg.children.push(node)
    drawMarker(svg, toPx(attrs, q[0], q[1]), pxDirection(attrs, [q[0] - p[0], q[1] - p[1]]))
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  path(svgOprnd, args) {
    // path (x, y; x, y; …)                 Straight steps
    // path (x, y, r; x, y, r; …)           r ≠ 0 makes a circular arc, + for CCW
    // path (x, y, ±rx, ry, angle; …)       An elliptical arc, as in the arc statement.
    //                                      ±rx, ry = 0 makes a straight step.
    // Every row has the same length. The r of the first row is ignored.
    // Hurmet also accepts an SVG path string, path "M…".
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "path", attrs: {} }
    if (isString(args[0])) {
      node.attrs.d = args[0].value
      setStrokeAndFill(node, svg)
      svg.children.push(node)
      return { value: svg, unit: null, dtype: dt.DRAWING }
    }
    const rows = numberRows(args[0])
    if (!rows || rows.length < 2 || ![2, 3, 5].includes(rows[0].length)) {
      return drawError("path")
    }
    let d = "M" + pointText(rows[0], attrs)
    for (let i = 1; i < rows.length; i++) {
      const r = stepR(rows[i])
      d += " " + (r ? arcCommand(attrs, r, rows[i]) : "L" + pointText(rows[i], attrs))
    }
    node.attrs.d = d
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    const q = rows[rows.length - 1]
    const dir = endDirection(rows[rows.length - 2], q, stepR(q))
    drawMarker(svg, toPx(attrs, q[0], q[1]), pxDirection(attrs, dir))
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  arrow(svgOprnd, m, label) {
    // arrow (x, y; x, y; …), "label"
    // As in Sketch, an arrow is always straight. Any radii in its rows are ignored.
    // It always ends in an arrowhead sized for the stroke width, whatever the current
    // marker. The label is optional. It's written at the first point, on the side away
    // from the arrow, always in the default font size.
    let svg = svgOprnd.value
    const attrs = svg.temp
    const rows = numberRows(m)
    if (!rows || rows.length < 2 || ![2, 3, 5].includes(rows[0].length) ||
        (label != null && !isString(label))) {
      return drawError("arrow")
    }
    const pts = rows.map(row => row.slice(0, 2))
    const d = "M" + pts.map(p => pointText(p, attrs)).join(" L")
    const node = { tag: "path", attrs: { d } }
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    const [p, q] = pts.slice(-2)
    const marker = attrs.marker
    attrs.marker = "arrow"
    drawMarker(svg, toPx(attrs, q[0], q[1]), pxDirection(attrs, [q[0] - p[0], q[1] - p[1]]))
    attrs.marker = marker
    if (label != null && label.value !== "") {
      // As in Sketch's arrowGroup(), the first step picks the label's position.
      const dx = pts[1][0] - pts[0][0]
      const dy = pts[1][1] - pts[0][1]
      const pos = Math.abs(dy) > Math.abs(dx)
        ? (dy > 0 ? "below" : "above")
        : (dx > 0 ? "leaderleft" : "leaderright")
      svg = textLocal(svg, pts[0], label.value, pos, { fontsize: labelFontSize })
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  freehand(svgOprnd, m) {
    // freehand (x, y; x, y; …)
    // A smooth curve through the points, as Sketch's freehand tool draws it.
    const svg = svgOprnd.value
    const attrs = svg.temp
    const rows = numberRows(m)
    if (!rows || rows[0].length !== 2) { return drawError("freehand") }
    // The Catmull-Rom fit commutes with the model-to-px mapping, so fit in px.
    const pts = rows.map(([x, y]) => toPx(attrs, x, y))
    let d = "M" + pxText(pts[0])
    let u = [1, 0]
    if (pts.length === 1) {
      // A zero-length path, so that the round cap still draws a dot.
      d += " L" + pxText(pts[0])
    } else {
      for (const seg of catmullRomToBezier(pts)) {
        d += ` C${pxText(seg.cp1)} ${pxText(seg.cp2)} ${pxText(seg.end)}`
      }
      const last = catmullRomToBezier(pts.slice(-3)).pop()
      const v = [last.end[0] - last.cp2[0], last.end[1] - last.cp2[1]]
      const len = Math.hypot(v[0], v[1])
      if (len > 0) { u = [v[0] / len, v[1] / len] }
    }
    const node = { tag: "path", attrs: { d } }
    setStrokeAndFill(node, svg, false)
    node.attrs["stroke-linecap"] = "round"
    node.attrs["stroke-linejoin"] = "round"
    svg.children.push(node)
    drawMarker(svg, pts[pts.length - 1], u)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  rect(svgOprnd, m) { // opposite corners in units
    const svg = svgOprnd.value
    const attrs = svg.temp
    const rows = numberRows(m)
    if (!rows || rows.length !== 2 || rows[0].length !== 2) { return drawError("rect") }
    const [p, q] = rows
    const node = { tag: "rect", attrs: {} }
    node.attrs.x = Math.min(p[0], q[0]) * attrs.xunitlength + attrs.origin[0]
    node.attrs.y = attrs.height - Math.max(p[1], q[1]) * attrs.yunitlength - attrs.origin[1]
    node.attrs.width = Math.abs((q[0] - p[0]) * attrs.xunitlength)
    node.attrs.height = Math.abs((q[1] - p[1]) * attrs.yunitlength)
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  circle(svgOprnd, center, radius) { // coordinates in units
    const svg = svgOprnd.value
    const attrs = svg.temp
    const c = pointOf(center)
    const r = isNumber(radius) ? Rnl.toNumber(radius.value) : NaN
    if (!c || !(r > 0)) { return drawError("circle") }
    const [cx, cy] = toPx(attrs, c[0], c[1])
    const node = { tag: "circle", attrs: { cx, cy, r: r * attrs.xunitlength } }
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  ellipse(svgOprnd, center, rx, ry, angle) {
    // ellipse [x, y], rx, ry, angle
    // The ellipse is rotated angle° CCW about its center. angle is optional.
    const svg = svgOprnd.value
    const attrs = svg.temp
    const c = pointOf(center)
    const radii = [rx, ry].map(r => isNumber(r) ? Rnl.toNumber(r.value) : NaN)
    if (!c || !radii.every(r => r > 0) || (angle != null && !isNumber(angle))) {
      return drawError("ellipse")
    }
    const [cx, cy] = toPx(attrs, c[0], c[1])
    const node = { tag: "ellipse", attrs: {
      cx, cy, rx: radii[0] * attrs.xunitlength, ry: radii[1] * attrs.yunitlength
    } }
    const degrees = angle == null ? 0 : Rnl.toNumber(angle.value)
    // In px, the y-axis points down, so a CCW rotation is negative.
    if (degrees !== 0) { node.attrs.transform = `rotate(${-degrees}, ${cx}, ${cy})` }
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  polygon(svgOprnd, numSides, center, radius, angle) {
    // polygon n, [x, y], r, angle
    // A regular polygon with n sides and inscribed radius r. With angle = 0 (the
    // default), its bottom side is level. angle rotates it CCW, in degrees.
    // As in Sketch's elementObject.js.
    const svg = svgOprnd.value
    const attrs = svg.temp
    const n = isNumber(numSides) ? Rnl.toNumber(numSides.value) : NaN
    const c = pointOf(center)
    const r = isNumber(radius) ? Rnl.toNumber(radius.value) : NaN
    if (!(Number.isInteger(n) && n >= 3) || !c || !(r > 0) ||
        (angle != null && !isNumber(angle))) {
      return drawError("polygon")
    }
    const rotation = (angle == null ? 0 : Rnl.toNumber(angle.value)) * Math.PI / 180
    const circumscribedRadius = r / Math.cos(Math.PI / n)
    const startAngle = -Math.PI / n - Math.PI / 2 + rotation
    const points = []
    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI / n) * i + startAngle
      points.push(pointText([c[0] + circumscribedRadius * Math.cos(theta),
        c[1] + circumscribedRadius * Math.sin(theta)], attrs))
    }
    const node = { tag: "polygon", attrs: { points: points.join(" ") } }
    setStrokeAndFill(node, svg)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  image(svgOprnd, m, href, rotation, mirrored) {
    // image (x, y; x, y), "href", rotation, mirrored
    // The points are opposite corners of the image before rotation. As in Sketch,
    // rotation is in degrees, positive for CW, about the image's center. mirrored
    // flips the image top to bottom before the rotation. Both are optional. The
    // defaults are 0 and false.
    const svg = svgOprnd.value
    const attrs = svg.temp
    const rows = numberRows(m)
    if (!rows || rows.length !== 2 || rows[0].length !== 2 || !isString(href) ||
        (rotation != null && !isNumber(rotation)) ||
        (mirrored != null && typeof mirrored.value !== "boolean")) {
      return drawError("image")
    }
    const [p, q] = rows
    const [x, y] = toPx(attrs, Math.min(p[0], q[0]), Math.max(p[1], q[1]))
    const width = Math.abs(q[0] - p[0]) * attrs.xunitlength
    const height = Math.abs(q[1] - p[1]) * attrs.yunitlength
    const node = { tag: "image", attrs: { x, y, width, height, href: href.value } }
    const degrees = rotation == null ? 0 : Rnl.toNumber(rotation.value)
    const [cx, cy] = [x + width / 2, y + height / 2]
    if (mirrored != null && mirrored.value) {
      node.attrs.transform =
        `translate(${cx}, ${cy}) scale(1, -1) rotate(${degrees}) translate(${-cx}, ${-cy})`
    } else if (degrees !== 0) {
      node.attrs.transform = `rotate(${degrees}, ${cx}, ${cy})`
    }
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  arc(svgOprnd, m, radius) {
    // arc (p1; p2), r          A circular arc. r > 0 for CCW, r < 0 for CW.
    // arc (p1; p2), [±rx, ry, angle]   An elliptical arc on an ellipse rotated angle°
    //                          CCW. The sign of rx gives the direction. angle is optional.
    // With no radius, a CCW circular arc whose radius is the chord length.
    // As in Sketch, an arc spans at most half of its circle or ellipse.
    const svg = svgOprnd.value
    const attrs = svg.temp
    const start = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])]
    const end = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])]
    let r
    if (radius == null) {
      r = Math.hypot(end[0] - start[0], end[1] - start[1])
    } else if (isVector(radius)) {
      if (radius.value.length < 2 || radius.value.length > 3) { return drawError("arc") }
      r = radius.value.map(e => Rnl.toNumber(e))
      if (r.length === 2) { r.push(0) }
    } else if (isNumber(radius)) {
      r = Rnl.toNumber(radius.value)
    } else {
      return drawError("arc")
    }
    const node = { tag: "path", attrs: {} }
    node.attrs.d = `M${pointText(start, attrs)} ${arcCommand(attrs, r, end)}`
    setStrokeAndFill(node, svg, false)
    svg.children.push(node)
    const direction = pxDirection(attrs, endDirection(start, end, r))
    drawMarker(svg, toPx(attrs, end[0], end[1]), direction)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  text(svgOprnd, p, str, pos) {
    // text [x, y], "string", position
    // The string may span several lines. As in Sketch, it's trimmed.
    if (p == null || !Array.isArray(p.value) || p.value.length !== 2 ||
        !p.value.every(Rnl.isRational) || !isString(str) ||
        (pos != null && !(isString(pos) && textPositionRegEx.test(pos.value.toLowerCase())))) {
      return drawError("text")
    }
    const content = str.value.replace(lineBreakInString, "\n").trim()
    const svg = textLocal(
      svgOprnd.value,
      [Rnl.toNumber(p.value[0]), Rnl.toNumber(p.value[1])],
      content,
      pos == null ? null : pos.value
      )
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dot(svgOprnd, center, label, pos) {
    // dot [x, y], "label", position
    // As in Sketch, the radius is dotradius px at any scale. The outline takes the
    // current stroke and stroke width; the inside takes the current fill, so fill "none"
    // gives a hollow dot. The label and its position are optional. The default position
    // is "below".
    let svg = svgOprnd.value
    const attrs = svg.temp
    if (center == null || !Array.isArray(center.value) || center.value.length !== 2 ||
        !center.value.every(Rnl.isRational) || (label != null && !isString(label)) ||
        (pos != null && !(isString(pos) && pos.value !== "" &&
          dotLabelPositionRegEx.test(pos.value.toLowerCase())))) {
      return drawError("dot")
    }
    const p = [Rnl.toNumber(center.value[0]), Rnl.toNumber(center.value[1])]
    const [cx, cy] = toPx(attrs, p[0], p[1])
    svg.children.push({ tag: "circle", attrs: {
      cx, cy, r: attrs.dotradius,
      "stroke-width": attrs.strokewidth, stroke: attrs.stroke, fill: fillPaint(svg)
    } })
    if (label != null && label.value !== "") {
      svg = textLocal(svg, p, label.value, pos == null ? "below" : pos.value)
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dimension(svgOprnd, plistOprnd, arg1, arg2, arg3) {
    // dimension (p1; p2; …; labelPoint), ["label", …]
    // dimension (p1; p2; …; labelPoint), ["label", …], dimAngle, extAngle
    // As in Sketch. The label list is optional. A label "" leaves its span blank, and a
    // span with no label shows its measured length. The dimension line runs through
    // labelPoint. With no angles, it's horizontal or vertical, whichever puts
    // labelPoint between the end points. With angles (in degrees), the dimension line
    // runs at dimAngle and the extension lines run at extAngle.
    // Dimensions are always drawn in black, 0.5 px wide, with labels in the default
    // font size.
    let svg = svgOprnd.value
    const attrs = svg.temp
    const rows = numberRows(plistOprnd)
    let labels = arg1
    let angles = [arg2, arg3]
    if (isNumber(arg1)) {
      labels = null
      angles = [arg1, arg2] // No label list
    }
    if (!rows || rows.length < 3 || rows[0].length !== 2 ||
        (angles[0] != null && !isNumber(angles[0])) ||
        (angles[1] != null && !isNumber(angles[1])) ||
        (angles[0] != null) !== (angles[1] != null)) {
      return drawError("dimension")
    }
    const writtenLabel = labelList(labels)
    const pts = rows.slice(0, -1)
    const labelPoint = rows[rows.length - 1]
    const elements = angles[0] == null
      ? orthoDimension(pts, labelPoint, attrs)
      : obliqueDimension(pts, labelPoint, Rnl.toNumber(angles[0].value),
        Rnl.toNumber(angles[1].value), attrs)
    if (!elements) { return drawError("dimension") }
    const { extLines, dimLines, mids, values, pos } = elements
    for (const [a, b] of extLines) { svg.children.push(dimLineNode(attrs, a, b)) }
    for (const [a, b] of dimLines) {
      svg.children.push(dimLineNode(attrs, a, b))
      // Arrowheads at both ends, pointing outward, as Sketch's dimarrow.
      const pa = toPx(attrs, a[0], a[1])
      const pb = toPx(attrs, b[0], b[1])
      const u = pxDirection(attrs, [b[0] - a[0], b[1] - a[1]])
      svg.children.push(arrowheadNode(pa, [-u[0], -u[1]], dimArrowSize, dimStrokeWidth,
        "black"))
      svg.children.push(arrowheadNode(pb, u, dimArrowSize, dimStrokeWidth, "black"))
    }
    mids.forEach((mid, i) => {
      const label = writtenLabel(i)
      if (label === "") { return }
      const str = label ?? dimensionLabel(values[i], attrs)
      svg = textLocal(svg, mid, str, pos, { fontsize: labelFontSize })
    })
    return { value: svg, unit: null, dtype: dt.DRAWING }
  }

}

export const draw = Object.freeze({
  startSvg,
  fitToContent,
  functions
})
