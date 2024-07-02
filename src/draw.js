import { dt } from "./constants"
import { clone } from "./utils"
import { isVector } from "./matrix"
import { Rnl } from "./rational"
import { inlineMd2ast } from "./md2ast"

const startSvg = _ => {
  return {
    tag: 'svg',
    children: [],
    attrs: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 250,
      height: 250,
      style: "display: inline;"
    },
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
      stroke: "black",
      strokewidth: 1,
      strokedasharray: null,
      fill: "none",
      fontstyle: "normal",
      fontfamily: "sans-serif",
      fontsize: 13.33, // px, ~10 pt
      fontweight: "normal",
      markerstrokewidth: 1,
      markerstroke: "black",
      markerfill: "yellow",
      markersize: 4,
      marker: "none",
      dotradius: 4,
      axesstroke: "black",
      gridstroke: "grey",
      isDim: false
    }
  }
}

// Helpers
const setStrokeAndFill = (node, attrs) => {
  node.attrs["stroke-width"] = attrs.strokewidth
  node.attrs.stroke = attrs.stroke
  node.attrs.fill = attrs.fill
  if (attrs.strokedasharray != null && attrs.strokedasharray !== "none") {
    node.attrs["stroke-dasharray"] = attrs.strokedasharray
  }
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

const markerDot = (center, attrs, s, f) => { // coordinates in units, radius in pixel
  if (s == null) { s = attrs.stroke }
  if (f == null) { f = attrs.fill }
  const node = { tag: "circle", attrs: {} }
  node.attrs.cx = center[0] * attrs.xunitlength + attrs.origin[0];
  node.attrs.cy = attrs.height - center[1] * attrs.yunitlength - attrs.origin[1];
  node.attrs.r = attrs.markersize
  node.attrs["stroke-width"] = attrs.strokewidth
  node.attrs.stroke = s
  node.attrs.fill = f
  return node
}

const rationals2numbers = array => {
  const newArray = [];
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    if (element.dtype) {
      newArray[i] = rationals2numbers(element.value)
    } else if (Rnl.isRational(element)) {
      newArray[i] = Rnl.toNumber(element)
    } else {
      newArray[i] = rationals2numbers(element)
    }
  }
  return newArray
}

const arrowhead = (svg, p, q) => { // draw arrowhead at q (in units)
  const attrs = svg.temp
  const v = [p[0] * attrs.xunitlength + attrs.origin[0], attrs.height -
             p[1] * attrs.yunitlength - attrs.origin[1]];
  const w = [q[0] * attrs.xunitlength + attrs.origin[0], attrs.height -
             q[1] * attrs.yunitlength - attrs.origin[1]];
  let u = [w[0] - v[0], w[1] - v[1]]
  const d = Math.sqrt(u[0] * u[0] + u[1] * u[1])
  if (d > 0.00000001) {
    u = [u[0] / d, u[1] / d];
    const z = attrs.marker === "markerdot" ? 3 : attrs.isDim ? 0 : 1
    const up = [-u[1], u[0]];
    const L = d > 12 ? 12.5 : 7.8125
    const S = d > 12 ? 3 : 1.875
    const node = { tag: "path", attrs: {} }
    node.attrs.d = "M " + (w[0] - L * u[0] - S * up[0]) + "," +
      (w[1] - L * u[1] - S * up[1]) + " L " + (w[0] - z * u[0]) + "," + (w[1] - z * u[1]) +
      " L " + (w[0] - L * u[0] + S * up[0]) + "," + (w[1] - L * u[1] + S * up[1]) + " z"
    if (attrs.isDim) {
      node.attrs.stroke = "none"
    } else {
      node.attrs["stroke-width"] = attrs.markerstrokewidth
      node.attrs.stroke = attrs.stroke
    }
    node.attrs.fill = attrs.stroke
    svg.children.push(node)
  }
}

const markAttribute = {
  em:         ["font-style", "italic"],
  strong:     ["font-weight", "bold"],
  code:       ["font-family", "monospace"],
  strikethru: ["text-decoration", "line-through"],
  subscript:  ["font-size", "0.8em"]
}

const textLocal = (svg, p, str, pos) => {
  const attrs = svg.temp
  let textanchor = "middle"
  let dx = 0
  let dy = attrs.fontsize / 3
  if (pos != null) {
    if (pos.slice(0, 5) === "above") { dy = -attrs.fontsize / 2 }
    if (pos.slice(0, 5) === "below") { dy = 1.25 * attrs.fontsize }
    if (pos.slice(0, 5) === "right" || pos.slice(5, 10) === "right") {
      textanchor = "start"
      dx = attrs.fontsize / 2
    }
    if (pos.slice(0, 4) === "left" || pos.slice(5, 9) === "left") {
      textanchor = "end"
      dx = -attrs.fontsize / 2
    }
  }
  const textNode = { tag: "text", children: [], attrs: {} }
  textNode.attrs["text"] = str
  textNode.attrs.x = p[0] * attrs.xunitlength + attrs.origin[0] + dx
  textNode.attrs.y = attrs.height - p[1] * attrs.yunitlength - attrs.origin[1] + dy
  textNode.attrs["font-family"] = attrs.fontfamily
  textNode.attrs["font-size"] = attrs.fontsize
  textNode.attrs["text-anchor"] = textanchor
  // Load Markdown into an AST
  const ast = inlineMd2ast(str)
  // Load content of AST into <tspan> nodes.
  if (Array.isArray(ast)) {
    let prevNodeContainedSubscript = false
    for (const markNode of ast) {
      const tspan = { tag: "tspan", text: markNode.text }
      let currentNodeContainsSubscript = false
      if (markNode.marks) {
        tspan.attrs = {}
        for (const mark of markNode.marks) {
          const markAttr = markAttribute[mark.type]
          tspan.attrs[markAttr[0]] = markAttr[1]
          if (mark.type === "subscript") { currentNodeContainsSubscript = true }
        }
      }
      if (currentNodeContainsSubscript) {
        if (!prevNodeContainedSubscript) { tspan.attrs.dy  = "2" }
      } else if (prevNodeContainedSubscript) {
        if (!markNode.marks) { tspan.attrs = {} }
        tspan.attrs.dy  = "-2"
      }
      prevNodeContainedSubscript = currentNodeContainsSubscript
      textNode.children.push(tspan)
    }
  }
  svg.children.push(textNode)
  return svg
}

const pointText = (point, attrs) => {
  return (point[0] * attrs.xunitlength + attrs.origin[0]).toFixed(4) + ","
    + (attrs.height - point[1] * attrs.yunitlength - attrs.origin[1]).toFixed(4)
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

  strokedasharray(svgOprnd, str) {
    svgOprnd.value.temp.strokedasharray = str.value
    return svgOprnd
  },

  fill(svgOprnd, color) {
    svgOprnd.value.temp.fill = color.value
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
    svgOprnd.value.temp.marker = str.value // "none" | "dot" | "arrow" | "arrowdot"
    return svgOprnd
  },

  // Initialize the svg.

  title(svgOprnd, strOprnd) {
    svgOprnd.value.children.push( { tag: "title", attrs: { text: strOprnd.value } })
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
    attrs.xunitlength = attrs.width / (attrs.xmax - attrs.xmin)
    attrs.yunitlength = attrs.height / (attrs.ymax - attrs.ymin)
    attrs.origin = [-attrs.xmin * attrs.xunitlength, -attrs.ymin * attrs.yunitlength]
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  view(svgOprnd, xmin = 0, xmax = 5, ymin, ymax) {
    const svg = svgOprnd.value
    const attrs = svg.temp
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

  grid(svgOprnd, gdx, gdy, isLocal) {
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
    pnode.attrs.fill = attrs.fill
    svg.children.push(pnode)
    if (!isLocal) {
      return { value: svg, unit: null, dtype: dt.DRAWING }
    }
  },

  axes(svgOprnd, dx, dy, labels, gdx, gdy) {
    let svg = svgOprnd.value
    const attrs = svg.temp
    dx = (dx == null ? attrs.xunitlength : Rnl.toNumber(dx.value) * attrs.xunitlength)
    dy = (dy == null ? dx : Rnl.toNumber(dy.value) * attrs.yunitlength)
    const parentFontsize = attrs.fontsize
    attrs.fontsize = Math.min(dx / 2, dy / 2, 10)
    const ticklength = attrs.fontsize / 4
    if (gdx != null) {
      this.grid(svgOprnd, gdx, gdy, true)
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
      const ddx = Math.floor(1.1 - Math.log(ldx) / Math.log(10)) + 1
      const ddy = Math.floor(1.1 - Math.log(ldy) / Math.log(10)) + 1
      for (let x = ldx; x <= attrs.xmax; x += ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp)
      }
      for (let x = -ldx; attrs.xmin <= x; x -= ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp)
      }
      for (let y = ldy; y <= attrs.ymax; y += ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp)
      }
      for (let y = -ldy; attrs.ymin <= y; y -= ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp)
      }
    }
    pnode.attrs.d = str
    pnode.attrs["stroke-width"] = 0.5
    pnode.attrs.stroke = attrs.axesstroke
    pnode.attrs.fill = attrs.fill
    svg.temp.fontsize = parentFontsize
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
    setStrokeAndFill(node, attrs)
    svg.children.push(node)
    if (attrs.marker === "dot" || attrs.marker === "arrowdot") {
      svg.children.push(markerDot(p, attrs, attrs.markerstroke, attrs.markerfill))
      if (attrs.marker === "arrowdot") { arrowhead(svg, p, q) }
      svg.children.push(markerDot(q, attrs, attrs.markerstroke, attrs.markerfill))
    } else if (attrs.marker === "arrow") {
      arrowhead(svg, p, q)
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  path(svgOprnd, args) {
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "path", attrs: {} }
    // Get the "d" attribute of a path
    let str = ""
    if (args[0].dtype && args[0].dtype === dt.STRING) {
      str = args[0].value
    } else {
      const segs = rationals2numbers(args[0].value)
      if (segs[0].length === 2) {
        // A path made up of line segments
        str = "M" + pointText(segs[0], attrs) + " L"
        for (let i = 1; i < segs.length; i++) {
          str += " " + pointText(segs[i], attrs)
        }
      } else if (segs[0].length === 3) {
        // Some segments are circular arcs.
        str = "M" + pointText(segs[0], attrs)
        for (let i = 1; i < segs.length; i++) {
          if (segs[i][2] === 0) {
            str += " L" + pointText(segs[i], attrs)
          } else {
            const r = String(Math.abs(segs[i][2]) * attrs.xunitlength)
            const sweep = Math.sign(segs[i][2]) > 0 ? 0 : 1
            str += ` A${r},${r} 0 0 ${sweep} ${pointText(segs[i], attrs)}`
          }
        }
      }
    }
    node.attrs.d = str
    node.attrs["stroke-width"] = attrs.strokewidth
    if (attrs.strokedasharray != null) {
      node.attrs["stroke-dasharray"] = attrs.strokedasharray
    }
    node.attrs.stroke = attrs.stroke
    node.attrs.fill = attrs.fill
    if (attrs.marker === "dot") {
      for (let i = 0; i < args.length; i++) {
        const el = args[i];
        if (typeof el[0] === "number") {
          svg.children.push(markerDot(el, attrs, attrs.markerstroke, attrs.markerfill))
        } else {
          for (const row of el) {
            svg.children.push(markerDot(row, attrs, attrs.markerstroke, attrs.markerfill))
          }
        }
      }
    } else if (attrs.marker === "arrow" || attrs.marker === "arrowdot") {
      const segs = rationals2numbers(args[0].value)
      if (typeof segs[0] !== "number") {
        const end = segs[segs.length - 1]
        arrowhead(svg, segs[segs.length - 2], end)
        if (attrs.marker === "arrowdot") {
          svg.children.push(markerDot(end, attrs, attrs.markerstroke, attrs.markerfill))
        }
      } else if (typeof segs[0] === "number") {
        const prevEl = args[args.length - 2];
        const end = segs
        let start
        if (typeof prevEl[0] === "number") {
          start = prevEl
        } else {
          start = prevEl[prevEl.length - 1]
        }
        arrowhead(svg, start, end)
        if (attrs.marker === "arrowdot") {
          svg.children.push(markerDot(end, attrs, attrs.markerstroke, attrs.markerfill))
        }
      }
    }
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  rect(svgOprnd, m, r) { // opposite corners in units, rounded by radius
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "rect", attrs: {} }
    const p = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])]
    const q = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])]
    node.attrs.x = Math.min(p[0], q[0]) * attrs.xunitlength + attrs.origin[0]
    node.attrs.y = attrs.height - Math.max(p[1], q[1]) * attrs.yunitlength - attrs.origin[1]
    node.attrs.width = Math.abs((q[0] - p[0]) * attrs.xunitlength)
    node.attrs.height = Math.abs((q[1] - p[1]) * attrs.yunitlength)
    if (r != null) {
      const rNum = Rnl.toNumber(r.value) * attrs.xunitlength
      node.attrs.rx = rNum
      node.attrs.ry = rNum
    }
    setStrokeAndFill(node, attrs)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  circle(svgOprnd, center, radius) { // coordinates in units
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "circle", attrs: {} }
    node.attrs.cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0]
    node.attrs.cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
                  - attrs.origin[1];
    node.attrs.r = Rnl.toNumber(radius.value) * attrs.xunitlength
    setStrokeAndFill(node, attrs)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  ellipse(svgOprnd, center, rx, ry) { // coordinates in units
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "ellipse", attrs: {} }
    node.attrs.cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0];
    node.attrs.cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
                    - attrs.origin[1];
    node.attrs.rx = Rnl.toNumber(rx.value) * attrs.xunitlength
    node.attrs.ry = Rnl.toNumber(ry.value) * attrs.yunitlength
    setStrokeAndFill(node, attrs)
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  arc(svgOprnd, m, radius) { // coordinates in units
    const svg = svgOprnd.value
    const attrs = svg.temp
    const node = { tag: "path", attrs: {} }
    const start = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])]
    const end = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])]
    if (radius == null) {
      const v = [end[0] - start[0], end[1] - start[1]];
      radius = (Math.sqrt(v[0] * v[0] + v[1] * v[1])) * attrs.yunitlength
    } else if (isVector(radius)) {
      radius = radius.value.map(e => Rnl.toNumber(e) * attrs.yunitlength)
    } else {
      radius = Rnl.toNumber(radius.value) * attrs.yunitlength
    }
    let str = "M" + (start[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - start[1] * attrs.yunitlength - attrs.origin[1]) + " A"
    str += Array.isArray(radius) ? radius[0] + "," + radius[1] : radius + "," + radius
    str += " 0 0,0 " + (end[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - end[1] * attrs.yunitlength - attrs.origin[1])
    node.attrs.d = str
    setStrokeAndFill(node, attrs)
    let v = 0
    if (attrs.marker === "arrow" || attrs.marker === "arrowdot") {
      const u = [(end[1] - start[1]) / 4, (start[0] - end[0]) / 4];
      v = [(end[0] - start[0]) / 2, (end[1] - start[1]) / 2];
      v = [start[0] + v[0] + u[0], start[1] + v[1] + u[1]];
    } else {
      v = [start[0], start[1]]
    }
    if (attrs.marker === "dot" || attrs.marker === "arrowdot") {
      svg.children.push(markerDot(start, attrs, attrs.markerstroke, attrs.markerfill))
      if (attrs.marker === "arrowdot") { arrowhead(svg,  v, end) }
      svg.children.push(markerDot(end, attrs, attrs.markerstroke, attrs.markerfill))
    } else if (attrs.marker === "arrow") {
      arrowhead(svg, v, end)
    }
    svg.children.push(node)
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  text(svgOprnd, p, str, pos) {
    const svg = textLocal(
      svgOprnd.value,
      [Rnl.toNumber(p.value[0]), Rnl.toNumber(p.value[1])],
      str.value,
      pos == null ? null : pos.value
      )
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dot(svgOprnd, center, typ, label, pos) {
    let svg = svgOprnd.value
    const attrs = svg.temp
    let node
    const cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0];
    const cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
             - attrs.origin[1];
    if (typ.value === "+" || typ.value === "-" || typ.value === "|") {
      node = { tag: "path", attrs: {} }
      if (typ.value === "+") {
        node.attrs.d = " M " + (cx - attrs.ticklength) + "," + cy
                    + " L " + ( cx + attrs.ticklength) + "," + cy
                    + " M " + cx + "," + (cy - attrs.ticklength) + " L " + cx
                    + "," + (cy + attrs.ticklength)
        node.attrs["stroke-width"] = 0.5
        node.attrs.stroke = attrs.axesstroke
      } else {
        if (typ.value === "-") {
          node.attrs.d = " M " + (cx - attrs.ticklength) + "," + cy
                       + " L " + (cx + attrs.ticklength) + "," + cy
        } else {
          node.attrs.d = " M " + cx + "," + (cy - attrs.ticklength)
                       + " L " + cx + "," + (cy + attrs.ticklength)
        }
        node.attrs["stroke-width"] = attrs.strokewidth
        node.attrs["stroke"] = attrs.stroke
      }
    } else {
      node = { tag: "circle", attrs: {} }
      node.attrs.cx = cx
      node.attrs.cy = cy
      node.attrs.r = attrs.dotradius
      node.attrs["stroke-width"] = attrs.strokewidth
      node.attrs.stroke = attrs.stroke
      node.attrs.fill =  (typ.value === "open" ? "white" : attrs.stroke)
    }
    svg.children.push(node)
    if (label != null) {
      svg = textLocal(
        svg,
        [Rnl.toNumber(center.value[0]), Rnl.toNumber(center.value[1])],
        label.value,
        (pos == null ? "below" : pos.value)
        )
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  leader(svgOprnd, plistOprnd, label) {
    const marker = svgOprnd.value.temp.marker
    svgOprnd.value.temp.marker = "arrow"
    svgOprnd.value.temp.isDim = true
    const plistCopy = clone(plistOprnd) // Copy to an un-frozen object.
    plistCopy.value.reverse()
    svgOprnd = this.path(plistCopy)
    const p = rationals2numbers(plistCopy.value[0])
    const q = rationals2numbers(plistCopy.value[plistCopy.value.length - 1])
    let pos = "right"
    if (Math.abs(p[0] - q[0]) >= Math.abs(p[1] - q[1])) {
      pos = p[0] >= q[0] ? "right" : "left"
    } else {
      pos = p[1] < q[1] ? "below" : "above"
    }
    const svg = textLocal(svgOprnd.value, p, label.value, pos, null)
    svg.temp.marker = marker
    svg.temp.isDim = false
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dimension(svgOprnd, plistOprnd, label) {
    const p = clone(plistOprnd.value)
    const q = p.pop()
    const origstrokewidth = svgOprnd.value.temp.strokewidth
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
    svg.temp.marker = "none"
    svg.temp.isDim = false
    return { value: svg, unit: null, dtype: dt.DRAWING }
  }

}

export const draw = Object.freeze({
  startSvg,
  functions
})
