import { dt } from "./constants"
import { clone } from "./utils"
import { isVector } from "./matrix"
import { Rnl } from "./rational"
import { inlineMd2ast } from "./md2ast"
import { errorOprnd } from "./error"

// px per model unit, before the scene's scale is applied. As in Sketch's utils.js.
const unitScaleFactors = Object.freeze({
  px: 1,
  in: 96,
  ft: 1152,
  "ft-in": 96, // Model units are inches. Dimension labels are written in feet & inches.
  mile: 609600,
  pt: 96 / 72,
  mm: 96 / 25.4,
  cm: 960 / 25.4,
  m: 96000 / 25.4,
  km: 96000000 / 25.4
})

// Other spellings of the unit names above, as in Sketch's unitAliases.js.
const unitAliases = Object.freeze({
  inch: "in", "″": "in",
  foot: "ft", feet: "ft", lf: "ft", "′": "ft",
  mi: "mile",
  meter: "m", metre: "m",
  millimeter: "mm", millimetre: "mm",
  centimeter: "cm", centimetre: "cm",
  kilometer: "km", kilometre: "km",
  point: "pt", "Adobe point": "pt"
})

// Line types, as in Sketch's elementObject.js. Dash lengths are in px.
const dashMap = Object.freeze({
  solid: null,
  dashed: "12 6",
  dotted: "0 8",
  centerline: "12 6 3 6",
  border: "12 6 3 6 3 6"
})
const linecapMap = Object.freeze({ dotted: "round" })

// Fill patterns, as in Sketch's elementObject.js. "solid" means no pattern.
const fillPatternNames = new Set([
  "solid", "diagonal", "crosshatch", "grid", "dots", "wood", "sand", "gravel", "earth",
  "concrete"
])

const roundingSpecRegEx = /^[frh][1-6]$/
const inchFractions = new Set([8, 16, 32, 64])

// A pattern's id includes its color, as in Sketch's dwg.js. A <pattern> def
// can't take its color from the element that refers to it, so each
// combination of pattern and color needs a def of its own.
const sanitizeForId = str => String(str).replace(/[^a-zA-Z0-9]/g, "_")

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
      gridstroke: "grey",
      isDim: false
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

// A step's r in its simplest form, as in Sketch's arcStep.js simplifyR(). An elliptical
// r with a zero radius is a straight step, and one with equal radii is a circular arc.
const simplifyR = r => {
  if (!Array.isArray(r)) { return r || 0 }
  const [srx, ry, angle = 0] = r
  if (srx === 0 || ry === 0) { return 0 }
  if (Math.abs(srx) === Math.abs(ry)) { return srx }
  return [srx, ry, angle]
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
// every arrowdot size is "arrowdot". As in Sketch's elementObject.js, markerFamily.
const markerFamilies = Object.freeze({
  none: "none", dot: "dot",
  arrow: "arrow", thinarrow: "arrow", thickarrow: "arrow", thickerarrow: "arrow",
  arrowdot: "arrowdot", thinarrowdot: "arrowdot", thickarrowdot: "arrowdot",
  thickerarrowdot: "arrowdot"
})

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
  // A dimension line gets Sketch's dimarrow.
  const size = svg.temp.isDim ? dimArrowSize : arrowheadSize(sw)
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

const markAttribute = {
  em:          ["font-style", "italic"],
  strong:      ["font-weight", "bold"],
  code:        ["font-family", "monospace"],
  strikethru:  ["text-decoration", "line-through"],
  subscript:   ["font-size", "0.8em"],
  superscript: ["font-size", "0.8em"]
}

// A text position, as in Sketch: e.g., "above", "belowright", "leaderleft".
// The default is "middle".
const textPositionRegEx = /^(?:above|leader|middle|below)?(?:left|right)?$/
// A dot's label position, as in Sketch's parse.js. "leader" isn't allowed.
const dotLabelPositionRegEx = /^(?:above|middle|below)?(?:left|right)?$/

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
    if (!isString(str) || !fillPatternNames.has(str.value)) {
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
    if (!isString(str) || !Object.hasOwn(markerFamilies, str.value.trim())) {
      return drawError("marker")
    }
    svgOprnd.value.temp.marker = markerFamilies[str.value.trim()]
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
      : unitAliases[unitName]
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

  dimension(svgOprnd, plistOprnd, label) {
    const p = clone(plistOprnd.value)
    const q = p.pop()
    const origstrokewidth = svgOprnd.value.temp.strokewidth
    const origMarker = svgOprnd.value.temp.marker
    svgOprnd.value.temp.marker = "none" // Extension lines have no marker.
    svgOprnd.value.temp.strokewidth = 0.5
    svgOprnd.value.temp.isDim = true // set small arrowhead
    let six = Rnl.fromNumber(6 / svgOprnd.value.temp.xunitlength)
    const pEnd = p[p.length - 1]
    let svg
    // Is the label y-coord between the y-coords of the end points?
    if ((Rnl.lessThan(p[0][1], q[1]) && Rnl.lessThan(q[1], pEnd[1])) ||
        (Rnl.lessThan(pEnd[1], q[1]) && Rnl.lessThan(q[1], p[0][1]))) {
      if (!Rnl.lessThan(pEnd[0], q[0])) { six = Rnl.negate(six) }
      p.forEach(e => {
        svgOprnd = this.line(svgOprnd, { value: [
          [Rnl.add(e[0], six), e[1]],
          [Rnl.add(q[0], six), e[1]]
        ] })
      });
      svgOprnd.value.temp.marker = "arrow"
      const pos = Rnl.lessThanOrEqualTo(pEnd[0], q[0]) ? "right" : "left"
      for (let i = 0; i < p.length - 1; i++) {
        svgOprnd = this.line(svgOprnd, { value : [[q[0], p[i][1]], [q[0], p[i + 1][1]]],
          unit: null, dtype: dt.MATRIX })
        svgOprnd = this.line(svgOprnd, { value : [[q[0], p[i + 1][1]], [q[0], p[i][1]]],
          unit: null, dtype: dt.MATRIX })
        const p3 = [
          Rnl.toNumber(q[0]),
          (Rnl.toNumber(p[i][1]) + Rnl.toNumber(p[i + 1][1])) / 2
        ];
        const str = p.length === 2 ? label.value : label.value[i];
        svg = textLocal(svgOprnd.value, p3, str, pos)
      }
    } else {
      if (!Rnl.lessThan(pEnd[1], q[1])) { six = Rnl.negate(six) }
      p.forEach(e => {
        svgOprnd = this.line(svgOprnd, { value: [
          [e[0], Rnl.add(e[1], six)],
          [e[0], Rnl.add(q[1], six)]
        ] })
      });
      svgOprnd.value.temp.marker = "arrow"
      const pos = Rnl.lessThanOrEqualTo(pEnd[1], q[1]) ? "above" : "below"
      for (let i = 0; i < p.length - 1; i++) {
        svgOprnd = this.line(svgOprnd, { value: [ [p[i][0], q[1]], [ p[i + 1][0], q[1]] ],
          unit: null, dtype: dt.MATRIX })
        svgOprnd = this.line(svgOprnd, { value: [ [ p[i + 1][0], q[1]], [p[i][0], q[1]] ],
          unit: null, dtype: dt.MATRIX })
        const p3 = [
          (Rnl.toNumber(p[i][0]) + Rnl.toNumber(p[i + 1][0])) / 2,
          Rnl.toNumber(q[1])
        ];
        const str = p.length === 2 ? label.value : label.value[i];
        svg = textLocal(svgOprnd.value, p3, str, pos)
      }
    }
    svg.temp.strokewidth = origstrokewidth
    svg.temp.marker = origMarker
    svg.temp.isDim = false
    return { value: svg, unit: null, dtype: dt.DRAWING }
  }

}

export const draw = Object.freeze({
  startSvg,
  functions
})
