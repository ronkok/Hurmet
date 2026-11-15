import { defaultAppState } from './appState.js'
import { groups } from './groups.js'
import { pathRows, tidy } from './arcStep.js'
import { arrowheadNames, markerFamily } from './elementObject.js'
import { dashMap as sharedDashMap } from './shared.js'

/* Stringify
 * This module reads the dwg and writes a text file.
 * Format follows the description at https://hurmet.org/manual#drawings.
 * Element statements typically describe the geometry of the element.
 * Attributes such line size and fill color are defined by the dwgState.
 * Attribute statements, such as `fill "color"` set properties of the dwgState.
 */

// Linetype names by stroke-dasharray, the inverse of shared.js dashMap.
const linetypeByDash = Object.fromEntries(Object.entries(sharedDashMap)
  .filter(([, dash]) => dash).map(([name, dash]) => [dash, name]))

const textPositionRegEx = /^(above|leader|middle|below)?(left|right)?$/
// A string between double quotation marks. Each " inside it is written as "",
// which parse.js reads back as one ". A backslash is just a backslash.
const quote = str => '"' + String(str).replace(/"/g, '""') + '"'
// Every number written to the source goes through tidy (see arcStep.js);
// the model itself keeps full precision.
const xy = (x, y) => `${tidy(x)}, ${tidy(y)}`
const markerEndRegEx = /^url\(#(.*)\)$/

// The id in a marker-end attribute, such as "arrow" in url(#arrow), or "none".
const markerId = el => el.attrs['marker-end']
  ? el.attrs['marker-end'].match(markerEndRegEx)[1]
  : "none"

// A straight path with an arrowhead is written as an `arrow`. Arrows have no
// radii, so a path with any arc step keeps its arrowhead via `marker` instead.
const isArrowPath = el => el.tag === 'path' && !el.attrs['data-freehand'] &&
  el.points.every(step => !step.r) && arrowheadNames.has(markerId(el))

// A circle made by a `dot` statement, still at its original radius. (A tool
// that changes the radius, e.g. scale or offset, leaves an ordinary circle.)
const isDot = el => el.tag === 'circle' && el.attrs['data-dot'] !== undefined &&
  Math.abs(el.attrs.r - Number(el.attrs['data-dot'])) <= 1e-9 * Math.abs(el.attrs.r)

// The style statements (stroke, fill, fontsize, …) that el needs and dwgState
// doesn't yet have. Updates dwgState to match.
const styleStatements = (el, dwgState) => {
  let output = ''
  if (el.attrs.stroke && el.attrs.stroke !== dwgState.stroke) {
    output += `stroke ${quote(el.attrs.stroke)}\n`
    dwgState.stroke = el.attrs.stroke
  }
  if (el.attrs['stroke-width'] && parseFloat(el.attrs['stroke-width']) !== dwgState.strokewidth) {
    output += `strokewidth ${el.attrs['stroke-width']}\n`
    dwgState.strokewidth = parseFloat(el.attrs['stroke-width'])
  }
  if (el.attrs['stroke-dasharray'] && linetypeByDash[el.attrs['stroke-dasharray']] !== dwgState.linetype) {
    output += `linetype ${quote(linetypeByDash[el.attrs['stroke-dasharray']])}\n`
    dwgState.linetype = linetypeByDash[el.attrs['stroke-dasharray']]
  } else if (!el.attrs['stroke-dasharray'] && dwgState.linetype !== "solid") {
    output += `linetype "solid"\n`
    dwgState.linetype = "solid"
  }
  // Lines, paths, arcs, and freehands read the `marker` state. An `arrow`
  // statement brings its own arrowhead, so it needs no `marker` statement.
  if (el.tag === 'line' || (el.tag === 'path' && !isArrowPath(el))) {
    // Every arrowhead size is written as "arrow", every arrowdot size as
    // "arrowdot". The strokewidth picks the size.
    const markerAttribute = markerFamily(markerId(el))
    if (markerAttribute !== dwgState.marker) {
      output += `marker ${quote(markerAttribute)}\n`
      dwgState.marker = markerAttribute
    }
  }
  if (el.attrs.fill) {
    if (el.tag !== "text" && el.attrs.fill !== dwgState.fill) {
      output += `fill ${quote(el.attrs.fill)}\n`
      dwgState.fill = el.attrs.fill
    } else if (el.tag === "text" && el.attrs.fill !== dwgState.fontcolor) {
      output += `fontcolor ${quote(el.attrs.fill)}\n`
      dwgState.fontcolor = el.attrs.fill
    }
  }
  if (el.tag !== "text" && el.attrs.pattern && el.attrs.pattern !== dwgState.pattern) {
    output += `pattern ${quote(el.attrs.pattern)}\n`
    dwgState.pattern = el.attrs.pattern
  }
  if (el.attrs.fontstyle && el.attrs.fontstyle !== dwgState.fontstyle) {
    output += `fontstyle ${quote(el.attrs.fontstyle)}\n`
    dwgState.fontstyle = el.attrs.fontstyle
  }
  if (el.attrs.fontfamily && el.attrs.fontfamily !== dwgState.fontfamily) {
    output += `fontfamily ${quote(el.attrs.fontfamily)}\n`
    dwgState.fontfamily = el.attrs.fontfamily
  }
  if (el.attrs.fontsize) {
    const fontsize = parseFloat(el.attrs.fontsize)
    if (!isNaN(fontsize) && fontsize !== dwgState.fontsize) {
      output += `fontsize ${fontsize}\n`
      dwgState.fontsize = fontsize
    }
  }
  if (el.attrs.fontweight && el.attrs.fontweight !== dwgState.fontweight) {
    output += `fontweight ${quote(el.attrs.fontweight)}\n`
    dwgState.fontweight = el.attrs.fontweight
  }
  return output
}

export const stringifyElement = (el, dwgState) => {
  // Before writing the element geometry, write any attributes that differ from the current dwgState.
  let output = styleStatements(el, dwgState)

  // Now write the element geometry.
  if (isDot(el)) {
    output += `dot [${xy(el.attrs.cx, el.attrs.cy)}]\n`
  } else if (el.tag === 'line') {
    output += `line (${xy(el.attrs.x1, el.attrs.y1)}; ${xy(el.attrs.x2, el.attrs.y2)})\n`
  } else if (el.tag === 'rect') {
    output += `rect (${xy(el.attrs.x, el.attrs.y)}; ${xy(el.attrs.x + el.attrs.width, el.attrs.y + el.attrs.height)})\n`
  } else if (el.tag === 'image') {
    output += `image (${xy(el.attrs.x, el.attrs.y)}; ${xy(el.attrs.x + el.attrs.width, el.attrs.y + el.attrs.height)}), ${quote(el.attrs.href)}, ${tidy(el.rotation || 0)}, ${el.mirrored ? "true" : "false"}\n`
  } else if (el.tag === 'circle') {
    output += `circle [${xy(el.attrs.cx, el.attrs.cy)}], ${tidy(el.attrs.r)}\n`
  } else if (el.tag === 'ellipse') {
    // The rotation angle is only written when non-zero, so axis-aligned
    // ellipses (the vast majority) keep the same output as before.
    output += `ellipse [${xy(el.attrs.cx, el.attrs.cy)}], ${tidy(el.attrs.rx)}, ${tidy(el.attrs.ry)}${el.angle ? `, ${tidy(el.angle)}` : ''}\n`
  } else if (el.tag === 'polygon') {
    // For polygons, we write the number of sides, the centroid, the inscribed radius,
    // and the rotation angle.
    // Find the inscribed radius. It will be the distance from centroids[0] to midPoints[0].
    const numSides = el.points.length
    const center = el.centroids[0]
    const dx = el.midPoints[0].x - center.x
    const dy = el.midPoints[0].y - center.y
    const radius = Math.sqrt(dx * dx + dy * dy)
    // The rotation (degrees, CCW) is measured from the flat-bottomed orientation that
    // elementObject() draws. A regular polygon looks the same after one side's worth of
    // rotation, so reduce modulo 360/numSides. Written only when non-zero, like ellipses.
    const period = 360 / numSides
    const vertexAngle = Math.atan2(el.points[0].y - center.y, el.points[0].x - center.x) * 180 / Math.PI
    let rotation = tidy((((vertexAngle + 180 / numSides + 90) % period) + period) % period)
    if (Math.abs(rotation - period) < 1e-6) { rotation = 0 }
    output += `polygon ${numSides}, [${xy(center.x, center.y)}], ${tidy(radius)}${rotation ? `, ${rotation}` : ''}\n`
  } else if (el.tag === 'path' && el.attrs['data-freehand']) {
    output += `freehand (${xy(el.points[0].x, el.points[0].y)}`
    for (let i = 1; i < el.points.length; i++) {
      output += `; ${xy(el.points[i].x, el.points[i].y)}`
    }
    output += `)\n`
  } else if (el.tag === 'path') {
    if (el.attrs.d.indexOf('A') !== -1  && el.points.length === 2) {
      if (el.points[1].r instanceof Array) {
        // This is an elliptical arc: [±rx, ry, angle]
        output += `arc (${xy(el.points[0].x, el.points[0].y)}; ${xy(el.points[1].x, el.points[1].y)}), [${el.points[1].r.map(tidy).join(', ')}]\n`
      } else {
        output += `arc (${xy(el.points[0].x, el.points[0].y)}; ${xy(el.points[1].x, el.points[1].y)}), ${tidy(el.points[1].r)}\n`
      }
    } else {
      if (isArrowPath(el)) {
        // Arrows are always straight, so they use the short (x, y; x, y) form.
        output += `arrow (${xy(el.points[0].x, el.points[0].y)}`
        for (let i = 1; i < el.points.length; i++) {
          output += `; ${xy(el.points[i].x, el.points[i].y)}`
        }
        output += `)\n`
      } else {
        // Rows of 2, 3, or 5 numbers, whichever is the narrowest that fits
        // every step. See pathRows in arcStep.js.
        output += `path (${pathRows(el.points).map(row => row.map(tidy).join(', ')).join('; ')})\n`
      }
    }
  } else if (el.tag === 'text') {
    // First, find text position relative to the defined geometrical point.
    const posMatch = (el.position || "middle").toLowerCase().match(textPositionRegEx)
    if (!posMatch) {
      console.warn(`stringify: Invalid text position "${el.position}" for text "${el.text}". Using "middle".`)
    } else {
      const position = posMatch[0] || "middle"
      // Then write the text element.
      output += `text [${xy(el.modelPoint.x, el.modelPoint.y)}], ${quote(el.text)}, ${quote(position)}\n`
    }
  } else {
    console.warn(`stringifyElement: Unknown element tag "${el.tag}". Skipping.`)
  }
  return output
}

// A dot and its label, written as one `dot` statement. If either has been
// changed so that the statement can't describe it, write them separately.
const stringifyDot = (members, dwgState) => {
  const dot = members.find(el => el.tag === 'circle')
  const label = members.find(el => el.tag === 'text')
  const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
  const position = (label?.position || "below").toLowerCase()
  if (!dot || !label || !isDot(dot) || /\n/.test(label.text) ||
      !close(label.modelPoint.x, dot.attrs.cx) ||
      !close(label.modelPoint.y, dot.attrs.cy) ||
      !/^(?:above|middle|below)?(?:left|right)?$/.test(position)) {
    return members.map(el => stringifyElement(el, dwgState)).join('')
  }
  let output = styleStatements(dot, dwgState) + styleStatements(label, dwgState)
  output += `dot [${xy(dot.attrs.cx, dot.attrs.cy)}], ${quote(label.text)}`
  output += position === "below" ? `\n` : `, ${quote(position)}\n`
  return output
}

const stringifyArrow = ([arrow, textElement], dwgState) => {
  // If the label was deleted, write a plain arrow, which parses back ungrouped.
  if (!textElement) { return stringifyElement(arrow, dwgState) }
  let output = ''
  // First, check and write any attribute changes for the arrow element.
  if (arrow.attrs.stroke && arrow.attrs.stroke !== dwgState.stroke) {
    output += `stroke ${quote(arrow.attrs.stroke)}\n`
    dwgState.stroke = arrow.attrs.stroke
  }
  if (arrow.attrs['stroke-width'] && parseFloat(arrow.attrs['stroke-width']) !== dwgState.strokewidth) {
    output += `strokewidth ${arrow.attrs['stroke-width']}\n`
    dwgState.strokewidth = parseFloat(arrow.attrs['stroke-width'])
  }
  // Now write the arrow geometry.
  output += "arrow ("
  arrow.points.forEach((step, index) => {
    output += index === 0
      ? xy(step.x, step.y) // Omit path step radius. There are no radii in an arrow.
      : `; ${xy(step.x, step.y)}`
  })
  output += `), ${quote(textElement.text)}\n`
  return output
}

// Recover the statement that built a dimension string from its elements:
// extension lines, then dimension lines, then labels.
//   form: "horizontal" or "vertical" (the original, angle-free statement)
//         or "oblique" (any other directions, written with its two angles)
//   points: the dimension points, [x, y] each
//   labelPoint: [x, y], a point on the dimension line
//   labels: one per span; the label's text (" " if erased), or null for a deleted label
//   dimAngle, extAngle: directions of the dimension and extension lines, in degrees
export const dimensionDefinition = (groupElements) => {
  // Dimension lines are always 0.5px thick and black.
  let numExtLines = 0
  let numDimLines = 0
  groupElements.forEach(child => {
    if (child.tag === 'line') {
      if (child.attrs['marker-start']) { numDimLines += 1} else { numExtLines += 1 }
    }
  })
  const extLine0 = groupElements[0];
  const dimLine0 = groupElements[numExtLines];
  const lastExtLine = groupElements[numExtLines - 1]
  // Is the string a horizontal or vertical dimension string, with extension
  // lines perpendicular to its dimension line? If not, it's oblique.
  const isHorizontal = dimLine0.attrs.y1 === dimLine0.attrs.y2 && extLine0.attrs.x1 === extLine0.attrs.x2
  const isVertical = dimLine0.attrs.x1 === dimLine0.attrs.x2 && extLine0.attrs.y1 === extLine0.attrs.y2
  const form = isHorizontal ? "horizontal" : isVertical ? "vertical" : "oblique"
  const dimAngle = Math.atan2(dimLine0.attrs.y2 - dimLine0.attrs.y1, dimLine0.attrs.x2 - dimLine0.attrs.x1) * 180 / Math.PI
  let points, labelPoint, extAngle
  if (isHorizontal || isVertical) {
    const six = isHorizontal
      ? extLine0.attrs.y2 - dimLine0.attrs.y1
      : extLine0.attrs.x2 - dimLine0.attrs.x1
    points = groupElements.slice(0, numExtLines).map(extLine => isHorizontal
      ? [extLine.attrs.x1, extLine.attrs.y1 - six]
      : [extLine.attrs.x1 - six, extLine.attrs.y1])
    // Only one coordinate pair is needed for the dimension line, as the other end can be inferred.
    labelPoint = isHorizontal
      ? [(dimLine0.attrs.x1 + lastExtLine.attrs.x1) / 2, dimLine0.attrs.y1]
      : [dimLine0.attrs.x1, (dimLine0.attrs.y1 + lastExtLine.attrs.y1) / 2]
    extAngle = isHorizontal ? 90 : 0
  } else {
    // Where each extension line meets the dimension line.
    const feet = groupElements.slice(numExtLines, numExtLines + numDimLines).map(l => [l.attrs.x1, l.attrs.y1])
    const lastDimLine = groupElements[numExtLines + numDimLines - 1]
    feet.push([lastDimLine.attrs.x2, lastDimLine.attrs.y2])
    // Each extension line overruns the dimension line by the same gap it
    // leaves at its dimension point.
    points = groupElements.slice(0, numExtLines).map((extLine, i) => [
      tidy(extLine.attrs.x1 - (extLine.attrs.x2 - feet[i][0])),
      tidy(extLine.attrs.y1 - (extLine.attrs.y2 - feet[i][1]))
    ])
    labelPoint = [tidy((feet[0][0] + feet[numExtLines - 1][0]) / 2), tidy((feet[0][1] + feet[numExtLines - 1][1]) / 2)]
    const extLine = groupElements.slice(0, numExtLines).find(l => l.attrs.x1 !== l.attrs.x2 || l.attrs.y1 !== l.attrs.y2)
    extAngle = extLine
      ? Math.atan2(extLine.attrs.y2 - extLine.attrs.y1, extLine.attrs.x2 - extLine.attrs.x1) * 180 / Math.PI
      : dimAngle + 90
  }
  // One label per span. A label may have been deleted, so match each text
  // element to the span whose midpoint is nearest, measured along the
  // dimension line, and leave null for any span left without one.
  const along = isHorizontal ? [1, 0] : isVertical ? [0, 1]
    : [Math.cos(dimAngle * Math.PI / 180), Math.sin(dimAngle * Math.PI / 180)]
  const position = ([x, y]) => x * along[0] + y * along[1]
  const spanMids = []
  for (let i = 0; i < numDimLines; i++) {
    const dimLine = groupElements[numExtLines + i]
    spanMids.push((position([dimLine.attrs.x1, dimLine.attrs.y1]) + position([dimLine.attrs.x2, dimLine.attrs.y2])) / 2)
  }
  const labels = new Array(numDimLines).fill(null)
  for (let i = numExtLines + numDimLines; i < groupElements.length; i++) {
    const textEl = groupElements[i]
    const pos = position([textEl.modelPoint.x, textEl.modelPoint.y])
    let nearest = -1
    spanMids.forEach((mid, j) => {
      if (labels[j] === null && (nearest === -1 ||
          Math.abs(mid - pos) < Math.abs(spanMids[nearest] - pos))) {
        nearest = j
      }
    })
    // An erased label is written " ", since "" means a deleted one.
    if (nearest !== -1) { labels[nearest] = textEl.text === "" ? " " : textEl.text }
  }
  return { form, points, labelPoint, labels, dimAngle: tidy(dimAngle), extAngle: tidy(extAngle) }
}

const stringifyDimension = (groupElements) => {
  const { form, points, labelPoint, labels, dimAngle, extAngle } = dimensionDefinition(groupElements)
  let output = `dimension (`
  points.forEach(([x, y]) => { output += `${xy(x, y)}; ` })
  output += `${xy(labelPoint[0], labelPoint[1])}), `
  const quoted = labels.map(label => quote(label ?? ""))
  output += "[" + quoted.join(", ") + "]"
  if (form === "oblique") { output += `, ${dimAngle}, ${extAngle}` }
  return output + "\n"
}

// If scale is 1/n for a whole number n, return n. Otherwise return null.
// Architectural scales, such as 1/192, have no exact decimal form.
export const scaleDenominator = scale => {
  const n = Math.round(1 / scale)
  return n > 1 && Math.abs(n * scale - 1) < 1e-9 ? n : null
}

// Write a scale as the mixed fraction 0 1/n when possible, so 1/192 isn't
// 0.005208333333333333. Hurmet's parser reads mixed fractions.
const scaleString = scale => {
  const n = scaleDenominator(scale)
  return n ? `0 1/${n}` : String(scale)
}

// The statements at the head of a sketch: the sketch-wide properties.
// `state` holds title, caption, position, roundingSpec, fraction, frameWidth,
// frameHeight, scale, unit, deltaOriginX, and deltaOriginY (an appState will do).
export const stringifyHeader = state => {
  // Always written, even when blank, so a blank title doesn't revert to the default.
  let output = `title ${quote(state.title)}\n`

  // Define the dwg size, scale, unit-of-measure, and origin offset.
  // These statements are always written, even if they match the defaults.
  // I may change the defaults someday.
  // The frame is in px, for Hurmet. Its position is written only when it isn't inline.
  output += `frame ${state.frameWidth}, ${state.frameHeight}` +
    (state.position !== defaultAppState.position ? `, ${quote(state.position)}\n` : `\n`)
  // Scale & unit together define the ratio of model units to real world units.
  // Note that the model space, after applying scale and unit, is then flipped vertically to get the CAD convention of y increasing upward.
  // deltaOriginX and deltaOriginY are in model-space units and define the offset of the model origin from the bottom-left corner of the SVG.
  output += `scene ${scaleString(state.scale)}, ${quote(state.unit)}, ${xy(state.deltaOriginX, state.deltaOriginY)}\n`

  // The rest are written only when they differ from the defaults.
  // Hurmet uses the caption when it renders the sketch.
  if (state.caption) { output += `caption true\n` }
  // The decimal format isn't written. Hurmet will supply it from the parent document.
  if (state.roundingSpec !== defaultAppState.roundingSpec) {
    output += `format ${quote(state.roundingSpec)}\n`
  }
  if (state.fraction !== defaultAppState.fraction) {
    output += `fraction ${state.fraction}\n`
  }
  // `grid` and `axes` come after `frame` and `scene`, which they fill.
  for (const { command, args } of state.backdrop || []) {
    const argText = args.map(arg => typeof arg === "string" ? quote(arg)
      : arg === null ? "null" : tidy(arg))
    output += argText.length > 0 ? `${command} ${argText.join(', ')}\n` : `${command}\n`
  }
  return output
}

// dwgState tracks the style statements (stroke, fontsize, …) written so far.
// Pass one in to read, afterward, the style in effect at the end of the output.
export const stringify = (appState, dwg, dwgState = structuredClone(defaultAppState)) => {
  if (dwg.children.length < 3) return '' // empty drawing
  return stringifyHeader(appState) + stringifyElements(dwg.children[2].children[0].children, dwgState)
}

// The statements for a list of elements, without the header. Also used by
// clipboard.js to write just the selected elements.
export const stringifyElements = (children, dwgState = structuredClone(defaultAppState)) => {
  let output = ''
  // Iterate through the elements and write statements for each one.
  // Group members are contiguous, so a single pass can open and close
  // `group … end` blocks as each element's group path changes.
  const open = [] // Numbers of the groups currently open, outermost first.
  const pad = () => "  ".repeat(open.length)
  let i = 0
  while (i < children.length) {
    const el = children[i]
    const fullPath = groups.groupPath(el)
    // A dimension or arrow is written as one statement, so its own (innermost)
    // group gets no `group … end` block.
    const isLeaf = fullPath.length > 0 && groups.isLeafGroupMember(el)
    const path = isLeaf ? fullPath.slice(0, -1) : fullPath

    // Close the open groups that this element isn't in, then open the new ones.
    let common = 0
    while (common < open.length && common < path.length && open[common] === path[common]) {
      common += 1
    }
    while (open.length > common) {
      open.pop()
      output += pad() + "end\n"
    }
    while (open.length < path.length) {
      output += pad() + "group\n"
      open.push(path[open.length])
    }

    if (isLeaf) {
      const leafElements = [el]
      while (i + leafElements.length < children.length &&
             children[i + leafElements.length].attrs['data-group'] === el.attrs['data-group']) {
        leafElements.push(children[i + leafElements.length])
      }
      if (leafElements.every(member => member.tag === 'text')) {
        // A copy of a dimension's or arrow's label, made without the rest of
        // it. Write it as plain text; it's parsed back as plain text.
        leafElements.forEach(member => {
          output += indent(stringifyElement(member, dwgState), pad())
        })
      } else {
        const tool = el.attrs['data-tool']
        const statement = tool === 'dimension' ? stringifyDimension(leafElements)
          : tool === 'dot' ? stringifyDot(leafElements, dwgState)
          : stringifyArrow(leafElements, dwgState)
        output += indent(statement, pad())
      }
      i += leafElements.length
    } else {
      output += indent(stringifyElement(el, dwgState), pad())
      i += 1
    }
  }
  while (open.length > 0) {
    open.pop()
    output += pad() + "end\n"
  }
  return output
}

// Indent the first line of each statement in `output`. A text statement may
// continue onto more lines, but those lines are part of the text itself, so
// they're left alone. The text statement, if any, is always the last one.
const indent = (output, pad) => {
  if (pad === "") { return output }
  const posText = output.search(/^text \[/m)
  const head = posText === -1 ? output : output.slice(0, posText)
  const tail = posText === -1 ? "" : pad + output.slice(posText)
  return head.replace(/^(?=.)/gm, pad) + tail
}
