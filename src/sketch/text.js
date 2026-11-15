import { adjustForSnapAndLock } from './snap.js'
import { dwgMgr } from './dwg.js';
import { inlineMd2ast } from "../md2ast.js"
import { markAttribute } from "./shared.js"

// Module for text-handling


// Get text from the inputBox contenteditable, including newlines
// A blank line typed with Enter is <div><br></div> (Chrome, Edge). Its <div>
// alone starts the new line; the <br> only props the empty div open.
const EMPTY_LINE_REGEX = /<(div|p)><br\s*\/?><\/\1>/gi
const BR_REGEX = /<br\s*\/?>/gi
const SPAN_REGEX = /<span(?:[^>]*)?>/gi
const DIV_REGEX = /<div>|<p>/gi
const CLOSE_REGEX = /<\/div>|<\/p>|<\/span>/gi
function getInputBoxText(inputBox) {
  // Replace <br>, <span>, <div> with newlines
  const str = inputBox.innerHTML
    .replace(EMPTY_LINE_REGEX, '\n')
    .replace(BR_REGEX, '\n')
    .replace(SPAN_REGEX, '')
    .replace(DIV_REGEX, '\n')
    .replace(CLOSE_REGEX, '') // Remove closing tags
    .trim()
  // Decode HTML escape sequences
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

// Estimate the bounding box of a text element based on its content and font size.
// This is a rough estimate since we don't have actual text metrics without rendering.
// We assume average character width is about 0.6em and line height is about 1.2em.
// We also adjust the bounding box based on horizontal and vertical text alignment.
// S is the scale factor (appState.scaleFactor), fontSize is in px.
// We return an array of the endpoints of the rectangle for snapping and selecting purposes.
const getTextBoundingBox = (text, modelPoint, appState) => {
  // Fallbacks for missing attributes
  const x = modelPoint.x || 0;
  const y = modelPoint.y || 0;
  const fontSize = appState.fontsize || 13.33; // in px
  const S = appState.scaleFactor || 1; // Do not include zoom factor
  // Get the text content, which may include tspans with line breaks
  // Estimate bounding box
  let width = 0;
  let height = 0;
  const lines = text.split('\n');
  // Estimate width: average character width ~0.6em. Count only the characters
  // that getTspans draws (no Markdown markup); subscripts and superscripts
  // are drawn at 0.8em. Convert px to model units.
  const lineWidth = line => inlineMd2ast(line).reduce((sum, node) => {
    const small = (node.marks || []).some(m => m.type === 'subscript' || m.type === 'superscript')
    return sum + node.text.length * (small ? 0.8 : 1)
  }, 0)
  // An empty label (a dimension label whose text was erased) still needs a box
  // the select tool can click, so give it the width of two characters.
  width = (Math.max(...lines.map(lineWidth)) || 2) * fontSize * 0.6 / S;
  // Estimate height: 1em per line
  height = lines.length * fontSize / S;
  // Define position, { x, y, width, height}, where (x,y) is the bottom-left corner
  // x, y, width, height all in model coordinates
  const position = { width, height }
  if (appState.textposition.indexOf("right") !== -1) {
    position.x = x;
  } else if (appState.textposition.indexOf("left") !== -1) {
    position.x = x - width;
  } else {
    // horizontally centered
    position.x = x - width / 2;
  }

  if (appState.textposition.indexOf("above") !== -1) {
    position.y = y;
  } else if (appState.textposition.indexOf("below") !== -1) {
      position.y = y - height;
  } else {
    // vertically centered
    position.y = y - height / 2;
  }

  // Return points that define the bounding box in model coordinates
  return position;
};

// `textPoint` is the point as defined for an SVG <text> element, which is the starting point of the text baseline.
// This is different from the modelPoint, which is the point in model coordinates where the user clicked to place the text.
// appState.textposition determines how the textPoint is adjusted relative to the modelPoint (in model coordinates).
// appState.textposition can be "above", "below", "left", "right", "middle", or combinations like "aboveleft".
// It can have a "leader" prefix, e.g., "leaderleft", which means the text is aligned to the left of a leader line
// rather than be aligned to the vertical center of the text block.

const adjustTextPoint = (textPoint, textPosition, appState, numLines) => {
  const fontSize = appState.fontsize || 13.33;
  const scale = appState.scaleFactor || 1; // Do not include zoom factor
  textPosition = (textPosition || "centered").toLowerCase();
  // Find the starting position of the <text> element based on user chosen alignment.
  // Note: SVG text y position is at the middle of the line, so we need to adjust.
  // Approximate baseline adjustment: 1.2 * fontSize per line
  textPoint.y = textPosition.indexOf("above") !== -1
    ? textPoint.y + (fontSize * (1.2 * (numLines - 1) + 0.7)) / scale
    : textPosition.indexOf("below") !== -1
      ? textPoint.y - fontSize * 0.8 / scale
      : textPosition.indexOf("leader") !== -1
        ? textPoint.y // No adjustment needed for 'text' position
        : numLines === 1
          ? textPoint.y // No adjustment needed for single line middle
          : textPoint.y + (fontSize * 1.2 * ((numLines - 1) / 2)) / scale  // middle
  // To prevent tight horizontal fit, we add a small padding based on font size.
  textPoint.x = textPosition.indexOf("right") !== -1
    ? textPoint.x + fontSize * 0.3 / scale
    : textPosition.indexOf("left") !== -1
      ? textPoint.x - fontSize * 0.3 / scale
      : textPoint.x // centered
  return textPoint;
}

const setContentEditableText = (el, str) => {
  el.innerHTML = ""; // Clear existing content
  const lines = str.split('\n');
  lines.forEach((line, i) => {
    el.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) {
      el.appendChild(document.createElement("br"));
    }
  });
}

const getTspans = (str, appState, textPoint) => {
  // Create tspans for each line with appropriate dy
  // Handle multi-line text by splitting on \n and creating tspans
  const lines = str.split('\n')
  const fontSize = appState.fontsize || 13.33
  const scale = appState.scaleFactor || 1 // Do not include zoom factor


  // Create tspans for each line with appropriate dy
  const tspans = [];
  // A blank line yields no tspan (inlineMd2ast('') is []), and browsers ignore
  // dy on a tspan with no characters. So count the line spacing owed since the
  // last drawn line and give it all to the next line's first tspan.
  let linesOwed = 0
  lines.forEach((lineStr, i) => {
    if (i > 0) { linesOwed += 1 }
    // Convert lineStr from Markdown to an AST which matches the ProseMirror/Hurmet schema.
    // We are only handling inline text styles, not block elements.
    const mdast = inlineMd2ast(lineStr)
    // The ast is an array of ProseMirror markNodes.
    // In a ProseMirror schema, mark nodes are not nested. We can proceed linearly.
    // Every markNode has text. It may have one or more (style) marks.
    // We will create a tspan for each markNode.
    // If a markNode has multiple marks, we will apply all of them to the tspan.
    // We will handle subscripts and superscripts by adjusting dy values.
    // Only the first tspan in a line gets dy. dwg.js's createSvgElement gives
    // that tspan the text's x when it draws it, which resets each line.
    mdast.forEach((markNode, j) => {
      const tspan = {
        tag: 'tspan',
        attrs: {},
        children: [ markNode.text ]
      }
      if (j === 0) {
        tspan.attrs.dy = linesOwed * fontSize * 1.2 / scale // 1.2em line spacing
        linesOwed = 0
      }
      if (markNode.marks) {
        for (const mark of markNode.marks) {
          const markAttr = markAttribute[mark.type];
          if (!markAttr) { continue } // e.g. a link: draw its text plain
          tspan.attrs[markAttr[0]] = markAttr[1];
          if (mark.type === "subscript") {
            tspan.attrs['baseline-shift'] = "sub"
          } else if (mark.type === "superscript") {
            tspan.attrs['baseline-shift'] = "super"
          }
        }
      }
      tspans.push(tspan)
    })
  })
  return tspans
}

const createTextElement = (str, modelPoint, appState) => {
  const textPosition = (appState.textposition || "middle").toLowerCase();
  let textPoint = { ...modelPoint }  // Copy to avoid modifying original
  textPoint = adjustTextPoint(textPoint, textPosition, appState, str.split('\n').length)
  const textanchor = textPosition.indexOf("right") !== -1
    ? "start"
    : textPosition.indexOf("left") !== -1
      ? "end"
      : "middle"

  // Create the text element with tspans for each line
  // and appropriate attributes for font, style, and alignment
  // We set fill to black if appState.fill is "none" to ensure visibility.
  // The actual fill color can be changed later via the Fill menu.
  // We set font-size using calc() to keep it consistent during zooming.
  const tspans = getTspans(str, appState, textPoint)
  const boundingBox = getTextBoundingBox(str, modelPoint, appState)

  return {
    tag: 'text',
    attrs: {
      x: textPoint.x,
      y: -1 * textPoint.y,       // Because of the transform on the next line
      transform: `scale(1, -1)`, // To reverse the SVG y-axis direction
                                 // Otherwise text is displayed upside down
      'fontfamily': appState.fontfamily,
      'fontsize': `${appState.fontsize}px`, // This will be scaled in dwg.js
      'fontweight': appState.fontweight,
      'fontstyle': appState.fontstyle,
      fill: appState.fontcolor,
      'text-anchor': textanchor,
      'dominant-baseline': "middle"
    },
    children: tspans,
    text: str,
    position: textPosition,  // For stringify
    modelPoint: modelPoint,  // Original point in model coordinates
    boundingBox: boundingBox // For snapping and selecting
  }
}

// Dimension and arrow labels keep the default font size, whatever appState.fontsize
// is. Neither the dimension statement nor the arrow statement saves a font size.
const labelFontSize = 13.33 // px
const createLabelElement = (str, modelPoint, appState) =>
  createTextElement(str, modelPoint, { ...appState, fontsize: labelFontSize })

const replaceText = (newText, el, scaleFactor) => {
  // Given a text element and new text string, replace the text content
  // and update the bounding box.
  // We assume the element position and font attributes remain unchanged.
  const textPoint = { x: parseFloat(el.attrs.x), y: -1 * parseFloat(el.attrs.y) }
  const newEl = {
    tag: 'text',
    attrs: { ...el.attrs }, // Copy existing attributes
    children: [],           // To be filled below
    text: newText,
    position: el.position,  // Preserve original text position setting
    boundingBox: {}         // To be recalculated below
  }
  const localAppState = structuredClone(el.attrs)
  localAppState.textposition = el.position
  localAppState.fontsize = parseFloat(el.attrs.fontsize.slice(0, -2)) || 13.33
  localAppState.scaleFactor = scaleFactor
  newEl.children = getTspans(newText, localAppState, textPoint)
  newEl.position = el.position
  newEl.modelPoint = { x: el.modelPoint.x, y: el.modelPoint.y }
  newEl.text = newText
  newEl.boundingBox = getTextBoundingBox(newText, el.modelPoint, localAppState)
  return newEl
}

const moveText = (str, el, dx, dy, scaleFactor) => {
  // Move the text element by dx, dy in model coordinates
  const newX = parseFloat(el.attrs.x) + dx
  const newY = parseFloat(el.attrs.y) - dy // Because of SVG y-axis direction
  const newEl = {
    tag: 'text',
    attrs: { ...el.attrs, x: newX, y: newY },
    children: el.children,
    text: str,
    position: el.position,
    modelPoint: { x: el.modelPoint.x + dx, y: el.modelPoint.y + dy },
    boundingBox: {} // To be recalculated below
  }
  newEl.position = el.position
  newEl.modelPoint = { x: el.modelPoint.x + dx, y: el.modelPoint.y + dy }
  newEl.text = str
  // Update bounding box
  const localAppState = structuredClone(el.attrs)
  localAppState.textposition = el.position
  localAppState.fontsize = parseFloat(el.attrs.fontsize.slice(0, -2)) || 13.33
  localAppState.scaleFactor = scaleFactor
  newEl.boundingBox = getTextBoundingBox(str, newEl.modelPoint, localAppState)
  return newEl
}

const rotatedTextPosition = (textPosition, angle, cx, cy) => {
  const position = (textPosition || "middle").toLowerCase()
  const isLeader = position.startsWith("leader")

  if (position === "middle" || position === "centered") {
    return position
  }

  const basePosition = isLeader
    ? position.slice("leader".length)
    : position

  // The eight positions sit at 45-degree intervals around the compass.
  // Index each one by its angle (in units of 45 degrees) from "right".
  const compass = ["right", "aboveright", "above", "aboveleft", "left", "belowleft", "below", "belowright"]
  const index = compass.indexOf(basePosition)
  if (index === -1) {
    return position
  }

  // Rotate the text's relative-position direction in model coordinates,
  // then snap to the nearest of the eight compass directions.
  const twoPi = 2 * Math.PI
  const originalAngle = index * (Math.PI / 4)
  const newAngle = ((originalAngle + angle) % twoPi + twoPi) % twoPi
  const newIndex = Math.round(newAngle / (Math.PI / 4)) % 8
  const rotatedPosition = compass[newIndex]

  // Leader text has only left/right variants.
  if (isLeader) {
    return rotatedPosition === "middle"
      ? "leader"
      : rotatedPosition.includes("left")
        ? "leaderleft"
        : "leaderright"
  }

  return rotatedPosition
}

const rotateText = (str, el, angle, cx, cy, scaleFactor) => {
  // Rotate the text element around point (cx, cy) by angle in radians
  const x = el.modelPoint.x // model space coordinate
  const y = el.modelPoint.y
  const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  const currentAngle = Math.atan2(y - cy, x - cx)
  const newAngle = currentAngle + angle
  const newModelX = cx + Math.cos(newAngle) * radius
  const newModelY = cy + Math.sin(newAngle) * radius // model space coordinate
  const textPosition = rotatedTextPosition(el.position, angle, cx, cy)
  const localAppState = structuredClone(el.attrs)
  localAppState.textposition = textPosition
  localAppState.fontsize =
    parseFloat(el.attrs.fontsize?.replace('px', '')) || 13.33
  localAppState.scaleFactor = scaleFactor
  const textanchor = textPosition.indexOf("right") !== -1
    ? "start"
    : textPosition.indexOf("left") !== -1
      ? "end"
      : "middle"

  const textPoint = adjustTextPoint(
    { x: newModelX, y: newModelY },
    textPosition,
    localAppState,
    str.split('\n').length
  )
  const newEl = {
    tag: 'text',
    attrs: { ...el.attrs,
      x: textPoint.x,
      y: -1 * textPoint.y,              // Because of following line
      transform: `scale(1, -1)`,  // to display text right side up in SVG
      'text-anchor': textanchor,
    },
    children: el.children,
    text: str,
    position: textPosition,
    modelPoint: { x: newModelX, y: newModelY },
    boundingBox: {} // To be recalculated below
  }
  // Update bounding box
  newEl.boundingBox = getTextBoundingBox(str, newEl.modelPoint, localAppState)
  return newEl
}

const mirrorTextPosition = (textPosition, refLine) => {
  const position = (textPosition || "middle").toLowerCase();

  // Preserve the special vertical alignment behavior of leader text.
  const isLeader = position.startsWith("leader");

  const vectors = {
    above:       { x: 0,  y: 1 },
    below:       { x: 0,  y: -1 },
    left:        { x: -1, y: 0 },
    right:       { x: 1,  y: 0 },
    aboveleft:   { x: -1, y: 1 },
    aboveright:  { x: 1,  y: 1 },
    belowleft:   { x: -1, y: -1 },
    belowright:  { x: 1, y: -1 }
  }

  if (position === "middle" || position === "leader") {
    return position;
  }

  const basePosition = isLeader
    ? position.slice("leader".length)
    : position

  const vector = vectors[basePosition]
  if (!vector) {
    return position
  }

  // Reflect a direction vector across the reference line.
  const A = refLine.y2 - refLine.y1
  const B = refLine.x1 - refLine.x2
  const denominator = A * A + B * B

  if (denominator === 0) {
    return position
  }

  const factor = 2 * (A * vector.x + B * vector.y) / denominator
  const mirrored = {
    x: vector.x - A * factor,
    y: vector.y - B * factor
  }

  const epsilon = 1e-10
  const horizontal =
    mirrored.x > epsilon ? "right" :
    mirrored.x < -epsilon ? "left" :
    ""

  const vertical =
    mirrored.y > epsilon ? "above" :
    mirrored.y < -epsilon ? "below" :
    ""

  let mirroredPosition
  if (vertical && horizontal) {
    mirroredPosition = `${vertical}${horizontal}`
  } else {
    mirroredPosition = vertical || horizontal || "middle"
  }

  return isLeader
    ? mirroredPosition === "middle"
      ? "leader"
      : mirroredPosition.includes("left")
        ? "leaderleft"
        : "leaderright"
    : mirroredPosition
}

const mirrorText = (str, el, newModelPoint, refLine, scaleFactor) => {
  const mirroredTextPosition = mirrorTextPosition(el.position, refLine)
  const numLines = str.split('\n').length

  const localAppState = structuredClone(el.attrs)
  localAppState.textposition = mirroredTextPosition
  localAppState.fontsize =
    parseFloat(el.attrs.fontsize?.replace('px', '')) || 13.33
  localAppState.scaleFactor = scaleFactor

  // Convert the model point into the SVG text baseline position.
  const textPoint = adjustTextPoint(
    { ...newModelPoint },
    mirroredTextPosition,
    localAppState,
    numLines
  )

  const textanchor = mirroredTextPosition.indexOf("right") !== -1
    ? "start"
    : mirroredTextPosition.indexOf("left") !== -1
      ? "end"
      : "middle"

  const newEl = {
    tag: 'text',
    attrs: {
      ...el.attrs,
      x: textPoint.x,
      y: -textPoint.y,
      'text-anchor': textanchor,
      transform: 'scale(1, -1)'
    },
    children: el.children,
    text: str,
    position: mirroredTextPosition,
    modelPoint: { ...newModelPoint },
    boundingBox: {}
  }

  localAppState.textposition = mirroredTextPosition
  newEl.boundingBox = getTextBoundingBox(
    str,
    newEl.modelPoint,
    localAppState
  )

  return newEl
}

export const text = Object.freeze({
  createElement(event, str, appState, dwg) {
    // Create a one-click element using text from the input box
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = createTextElement(str, modelPoint, appState, dwg)
    dwgMgr.pushChild(dwg, element)
    return element
  },
  createTextElement,
  createLabelElement,
  adjustTextPoint,
  getTextBoundingBox,
  getInputBoxText,
  getTspans,
  mirrorText,
  moveText,
  replaceText,
  rotateText,
  setContentEditableText
})
