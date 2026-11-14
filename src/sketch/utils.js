// Utility functions

import { dwgMgr, updateFillPatternScale } from './dwg.js'
import { groups } from './groups.js'
import { arcCommand } from './arcStep.js'
import { parseLength, coordinateText } from './feetInches.js'
import { unitScaleFactors } from './shared.js'

const TAU = Math.PI * 2
const EPS = 1e-9
const norm = (a) => {
  a = a % TAU
  return a < 0 ? a + TAU : a
}

const clearMeasurement = domRefs => {
  domRefs.coordTable.children[0].children[3].children[0].textContent = ""
  domRefs.coordTable.children[0].children[3].children[1].textContent = ""
  domRefs.coordTable.children[0].children[3].children[2].textContent = ""
}

const clearLocalCoords = domRefs => {
  domRefs.coordTable.children[0].children[2].children[1].textContent = "0"
  domRefs.coordTable.children[0].children[2].children[2].textContent = "0"
}

// Read a length from the input box: a number in model units, or a length
// written in feet and inches, such as 4′-3.5″ (see feetInches.js).
const readLength = (str, appState) => parseLength(str, unitScaleFactors[appState.unit])

// The OK button's data-scope tells what the input box holds:
//   0       text, read verbatim (text tool, arrow label, image URL, a clicked text element)
//   1       numbers, in which 0,5 means 0.5 (all other tools)
//   2       the source of one element (Edit | Edit…)
//   "all"   the source of the whole sketch (Edit Source)
//   "array" the array tool's spec, nx, ny @ Δx, Δy. Also numbers.
// Returns the scope the input box has while `tool` is active.
const textInputTools = ['text', 'arrow', 'image']
const toolInputScope = tool => textInputTools.includes(tool) ? 0 : 1

// Hide the OK and Cancel buttons, clear the input box, and return its scope to the tool's.
const closeInputBox = (appState, domRefs) => {
  domRefs.okButton.classList.remove('visible')
  domRefs.okButton.dataset.scope = toolInputScope(appState.tool)
  domRefs.cancelButton.classList.remove('visible')
  domRefs.inputBox.innerHTML = ''
  domRefs.inputBox.blur()
}

// Two numbers are separated by a comma and a space, as in 3,5, 2, or by @.
const measurementSplitRegEx = /,\s+|\s*@\s*/
const validateMeasurement = (textInputBox, appState) => {
  let gotValidMeasurement = false
  let measurement = [0, 0];
  if (textInputBox && textInputBox.textContent.trim() !== '') {
    const parts = textInputBox.textContent.trim().split(measurementSplitRegEx)
    if (parts.length === 2) {
      // Handle a pair of measurements, e.g., a coordinate pair or a number @ angle
      const x = readLength(parts[0], appState)
      const y = readLength(parts[1], appState)
      if (!isNaN(x) && !isNaN(y)) {
        gotValidMeasurement = true
        measurement = [x, y];
      }
    } else {
      const x = readLength(textInputBox.textContent, appState)
      gotValidMeasurement = !isNaN(x)
      measurement = [x, 0];
    }
  }
  return [gotValidMeasurement, measurement];
}

const polygonRegEx = /^(\d+)(?:,?\s+(\S.*))?$/
const parsePolygonInput = (input, appState) => {
  const match = input.match(polygonRegEx)
  if (match) {
    const numSides = parseInt(match[1])
    const radius = match[2] ? readLength(match[2], appState) : 0
    if (isNaN(radius)) { return [0, [0, 0]] }
    return [numSides, [radius, 0]];
  }
  return [0, [0, 0]];
}

// Grid sizes for a feet-and-inches sketch, in inches. Grid lines are drawn at
// every other grid size, so the lines fall at 1/8″, 1/4″, 1/2″, 1″, 2″, 3″,
// 6″, then 1′, 2′, 5′, 10′, 20′, 50′, and so on.
const feetInchesGridSizes = (() => {
  const sizes = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 1.5, 3]
  for (let feet = 1; feet <= 1e6; feet *= 10) {
    sizes.push(6 * feet, 12 * feet, 30 * feet)
  }
  return sizes
})()

function chooseGridSpacing(appState) {
  // 1. Calculate screen px per model unit
  const zoom = appState.zoom || 1
  const scale = appState.scaleFactor || 1
  const S = zoom * scale;  // screenPxPerModelUnit

  // 2. Target screen spacing (in px)
  const minPx = 10, maxPx = 30, targetPx = 15

  if (appState.unit === "ft-in") {
    // The grid size whose screen spacing is nearest targetPx, by ratio.
    const misfit = size => Math.abs(Math.log(size * S / targetPx))
    return feetInchesGridSizes.reduce((best, size) => misfit(size) < misfit(best) ? size : best)
  }

  // 3. What model spacing gives us targetPx on screen?
  let rawModelSpacing = targetPx / S

  // 4. Find the nearest "nice" number >= rawModelSpacing
  let niceFactors
  if (appState.unit === "in" && S > 30) {
    niceFactors = [0.0625, 0.125, 0.25, 0.50];
  } else {
    niceFactors = [1, 2, 3, 4, 5];
  }
  const exponent = Math.floor(Math.log10(rawModelSpacing))
  let bestSpacing = null

  for (let exp = exponent - 1; exp <= exponent + 2; exp++) {
    for (let f of niceFactors) {
      let spacing = f * Math.pow(10, exp)
      let px = spacing * S
      if (px >= minPx && px <= maxPx) {
        if (!bestSpacing || Math.abs(px - targetPx) < Math.abs(bestSpacing * S - targetPx)) {
          // Strip floating-point noise, e.g. 3 * 0.1 = 0.30000000000000004.
          // (Don't round to an integer: that turned 0.25 into 0 and 0.5 into 1.)
          bestSpacing = parseFloat(spacing.toPrecision(12))
        }
      }
    }
  }

  // Fallback: if nothing found, just use the raw value
  if (!bestSpacing) { bestSpacing = rawModelSpacing; }

  // An inch grid of 10″ or more doesn't line up with feet, so use whole feet.
  // The foot grid may be ½′, whose lines (every other grid size) fall on feet.
  if (appState.unit === "in" && bestSpacing >= 10) {
    const feetState = { ...appState, unit: "ft", scaleFactor: scale * 12 }
    return 12 * chooseGridSpacing(feetState)
  }

  return bestSpacing
}

function generateGridLines(appState, domRefs) {
  const gridSvg = domRefs.gridSvg
  if (!gridSvg || !gridSvg.children[0]) { return }
  const gridGroup = gridSvg.children[0]  // First child is the <g> element

  // Clear any existing lines
  gridGroup.innerHTML = ''

  // Find scale factors
  const S = appState.scaleFactor * appState.zoom
  // Width, height, and gridSize are in model space coordinates
  const width = (appState.width || 720) / S
  const height = (appState.height || 500) / S
  appState.gridSize = chooseGridSpacing(appState)
  const gridSize = appState.gridSize

  // Model-space bounds visible in the SVG
  // For X: left edge (svg x=0) to right edge (svg x=widthPx)
  // For Y: top edge (svg y=0) to bottom edge (svg y=heightPx)
  const modelXmin = 0 - appState.deltaOriginX
  const modelXmax = width - appState.deltaOriginX
  // Y axis is typically inverted in SVG transforms for CAD: y increases upward in model space
  const modelYmin = 0 - appState.deltaOriginY
  const modelYmax = height - appState.deltaOriginY

  // Determine line style pattern
  // If the unit is not inches, every 5th line is solid.
  // If the unit is inches, make a solid line at each 1 foot mark.
  const modulo = appState.unit != "in"
    ? 5
    : appState.gridSize === 1
    ? 12
    : appState.gridSize === 2
    ? 6
    : appState.gridSize === 3
    ? 4
    : appState.gridSize === 4
    ? 3
    : 5
  // In feet and inches, lines under a foot apart are solid at each foot mark.
  // Lines a foot or more apart are solid at every 5th line.
  const isSolid = appState.unit === "ft-in"
    ? i => (gridSize < 6 ? (i * gridSize) % 12 === 0 : i % 10 === 0)
    : i => i % modulo === 0

  // Now draw the lines, which are not the same as the grid spacing.
  // We draw a line at every other grid spacing, so if gridSize=1,
  // we draw a line at every 2 units: ..., -4, -2, 0, 2, 4, ...
  // We draw solid lines at every 5th line (or every 12th grid space if inches).

  let gridLines = ""
  // Vertical lines
  if (modelXmin < 0) {
    for (let i = 0, x = 0; x >= modelXmin; i += 2, x = i * -gridSize) {
      const solid = isSolid(i)
      gridLines += `<line x1="${x}" y1="${modelYmin}" x2="${x}" y2="${modelYmax}" stroke="#ccc" stroke-width="0.5" ${solid ? '' : 'stroke-dasharray="4,4"'} vector-effect="non-scaling-stroke"/>`
    }
  }
  if (modelXmax > 0) {
    for (let i = 0, x = 0; x <= modelXmax; i += 2, x = i * gridSize) {
      const solid = isSolid(i)
      gridLines += `<line x1="${x}" y1="${modelYmin}" x2="${x}" y2="${modelYmax}" stroke="#ccc" stroke-width="0.5" ${solid ? '' : 'stroke-dasharray="4,4"'} vector-effect="non-scaling-stroke"/>`
    }
  }
  // Horizontal lines
  if (modelYmin < 0) {
    for (let j = 0, y = 0; y >= modelYmin; j += 2, y = j * -gridSize) {
      const solid = isSolid(j)
      gridLines += `<line x1="${modelXmin}" y1="${y}" x2="${modelXmax}" y2="${y}" stroke="#ccc" stroke-width="0.5" ${solid ? '' : 'stroke-dasharray="4,4"'} vector-effect="non-scaling-stroke"/>`
    }
  }
  if (modelYmax > 0) {
    for (let j = 0, y = 0; y <= modelYmax; j += 2, y = j * gridSize) {
      const solid = isSolid(j)
      gridLines += `<line x1="${modelXmin}" y1="${y}" x2="${modelXmax}" y2="${y}" stroke="#ccc" stroke-width="0.5" ${solid ? '' : 'stroke-dasharray="4,4"'} vector-effect="non-scaling-stroke"/>`
    }
  }
  gridGroup.innerHTML = gridLines
}


const redrawCanvas = (appState, domRefs) => {
  const S = appState.scaleFactor * appState.zoom
  const tx = S * appState.deltaOriginX
  const ty = appState.height - S * appState.deltaOriginY
  generateGridLines(appState, domRefs)
  domRefs.model.setAttribute('transform', `matrix(${S}, 0, 0, -${S}, ${tx}, ${ty})`)
  domRefs.backdrop?.setAttribute('transform', `matrix(${S}, 0, 0, -${S}, ${tx}, ${ty})`)
  domRefs.gridSvg.children[0].setAttribute('transform', `matrix(${S}, 0, 0, -${S}, ${tx}, ${ty})`)
  // Fill-pattern defs (see dwg.js) can't counteract scale/zoom declaratively
  // the way vector-effect="non-scaling-stroke" or a fontsize calc() can —
  // neither applies to a <pattern>'s tile spacing. --total-scale records the
  // current S for defs created from here on, and updateFillPatternScale
  // rewrites the ones that already exist, so every fill pattern's apparent
  // size on screen — spacing and stroke weight alike — stays constant.
  domRefs.canvas.style.setProperty('--total-scale', S)
  updateFillPatternScale(S)
}

// Fit the canvas and grid SVGs to a new size, in px, e.g. after a browser window resize.
// The view's lower-left corner stays put, since deltaOrigin is measured from it.
const resizeCanvas = (appState, domRefs, width, height) => {
  appState.width = width
  appState.height = height
  for (const svg of [domRefs.canvas, domRefs.gridSvg]) {
    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  redrawCanvas(appState, domRefs)
}

// The `frame` and `scene` origin to hand to Hurmet: a frame just big enough
// for the drawing's extents, with the scene origin moved so the drawing's
// lower-left corner sits `margin` px in from the frame's lower-left corner.
// Uses scaleFactor, not zoom, so the GUI zoom doesn't affect the result.
// Returns null for an empty drawing.
const computeFrame = (appState, domRefs, margin = 4) => {
  // A grid or axes fills the frame, so the frame given by the source stays put.
  if (appState.backdrop?.length > 0) {
    return {
      frameWidth: appState.frameWidth,
      frameHeight: appState.frameHeight,
      deltaOriginX: appState.sceneOriginX,
      deltaOriginY: appState.sceneOriginY
    }
  }
  // getBBox works in the shapes layer's own (model) units and includes text,
  // dimension labels, and exact curves. It ignores stroke width and
  // arrowheads, which the margin covers.
  const box = domRefs.model.querySelector('#shapes-layer').getBBox()
  if (box.width === 0 && box.height === 0) { return null }
  const S = appState.scaleFactor
  const round = v => Math.round(v * 1e4) / 1e4
  const deltaOriginX = round(margin / S - box.x)
  const deltaOriginY = round(margin / S - box.y)
  // Size the frame from the rounded origin, so the rounding can't clip the drawing.
  return {
    frameWidth: Math.ceil(S * (box.x + box.width + deltaOriginX) + margin),
    frameHeight: Math.ceil(S * (box.y + box.height + deltaOriginY) + margin),
    deltaOriginX,
    deltaOriginY
  }
}

const setZoom = (zoom, appState, domRefs, cursor) => {
  const oldZoom = appState.zoom || 1
  const scale = appState.scaleFactor || 1
  let deltaOriginX = appState.deltaOriginX || 0
  let deltaOriginY = appState.deltaOriginY || 0

  if (cursor && typeof cursor.offsetX === 'number' && typeof cursor.offsetY === 'number') {
    // Model coordinates under cursor before zoom
    const modelX = (cursor.offsetX / (scale * oldZoom)) - deltaOriginX
    const modelY = ((appState.height - cursor.offsetY) / (scale * oldZoom)) - deltaOriginY

    // After zoom, solve for new deltaOrigin so modelX/Y stays under cursor
    deltaOriginX = (cursor.offsetX / (scale * zoom)) - modelX
    deltaOriginY = ((appState.height - cursor.offsetY) / (scale * zoom)) - modelY
  }

  appState.zoom = zoom
  appState.deltaOriginX = deltaOriginX
  appState.deltaOriginY = deltaOriginY

  redrawCanvas(appState, domRefs)
}

// Show the cursor's offset from `anchor`, the most recent click of the
// operation in progress. Tools clear it with clearLocalCoords when they
// finish, except Measure, whose reading stays until the next operation begins.
const updateLocalCoords = (domRefs, anchor, modelPoint, appState) => {
  if (!anchor) { return }
  domRefs.coordTable.children[0].children[2].children[1].textContent = coordinateText(modelPoint.x - anchor.x, appState.unit, 3)
  domRefs.coordTable.children[0].children[2].children[2].textContent = coordinateText(modelPoint.y - anchor.y, appState.unit, 3)
}

const pointsToD = pts => {
  if (!pts || pts.length < 2) { return '' }
  // Keep it simple: M + chain of L commands.
  return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => {
    return p.r ? arcCommand(p.r, p.x, p.y) : `L ${p.x} ${p.y}`
  }).join(' ')
}

const distance = (p1, p2) => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

const lineLineIntersection = (line1, line2, boundsCheck = false) => {
  // line1 and line2 are objects with x1, y1, x2, y2 points
  const x1 = line1.x1, y1 = line1.y1
  const x2 = line1.x2, y2 = line1.y2
  const x3 = line2.x1, y3 = line2.y1
  const x4 = line2.x2, y4 = line2.y2
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (denom === 0) {
    return null // Parallel lines
  }
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
  if (boundsCheck) {
    // Check if the intersection point lies within the bounds of both line segments
    if (
      (px < Math.min(x1, x2) || px > Math.max(x1, x2)) ||
      (py < Math.min(y1, y2) || py > Math.max(y1, y2)) ||
      (px < Math.min(x3, x4) || px > Math.max(x3, x4)) ||
      (py < Math.min(y3, y4) || py > Math.max(y3, y4))
    ) {
      return null
    }
  }
  return { x: px, y: py }
}


// Push a copy of an existing element. On entry, `el` holds the original's id,
// because callers build the copy from the original. That id is used once, to
// find the original, and then pushChild replaces it with a new, unique id.
// Create one groupIdMap per operation, so that all copied members of a group
// land in the same new group.
const pushDuplicate = (dwg, dwgMgr, el, groupIdMap) => {
  // A copy built from scratch may carry only the id, not the original's
  // membership, so read the membership from the original.
  groups.inheritMembership(el, dwgMgr.getChildById(dwg, el.attrs.id))
  const path = groups.groupPath(el)
  if (path.length > 0) {
    groups.setGroupPath(el, groups.remapPath(path, groupIdMap, () => dwgMgr.nextId(dwg)))
  }
  dwgMgr.pushChild(dwg, el)
}

const updateSelection = (newSelection, appState, domRefs) => {
  // Clear previous selection
  domRefs.model.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))
  // Update selection
  appState.selection = newSelection
  // Add 'selected' class to new selection
  newSelection.forEach(el => {
    const domElement = domRefs.model.querySelector(`[data-id='${el.attrs.id}']`)
    if (domElement) {
      domElement.classList.add('selected')
    }
  })
}

// Reset everything a new drawing/editing operation shouldn't inherit from
// whatever was active before: the temporary layer (dimension points, trim
// reference line, resize handles), the current selection (both
// appState.selection and the DOM 'selected' classes), the local-coordinate
// readout, and the trim tool's in-progress reference line. Called when
// switching to a tool that starts a fresh operation (see
// toolsThatClearWorkingState in menuListeners.js) and on Delete.
const clearTempAndSelection = (appState, domRefs, dwg) => {
  dwgMgr.clearTempElements(dwg)
  updateSelection([], appState, domRefs)
  clearLocalCoords(domRefs)
  appState.referenceLine = null
}

export const utils = Object.freeze({
  EPS,
  TAU,
  clearLocalCoords,
  clearMeasurement,
  clearTempAndSelection,
  closeInputBox,
  computeFrame,
  distance,
  generateGridLines,
  lineLineIntersection,
  norm,
  parsePolygonInput,
  pointsToD,
  pushDuplicate,
  readLength,
  redrawCanvas,
  resizeCanvas,
  setZoom,
  toolInputScope,
  unitScaleFactors,
  updateLocalCoords,
  updateSelection,
  validateMeasurement
})
