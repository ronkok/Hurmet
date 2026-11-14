import { adjustForSnapAndLock } from './snap.js'
import { mirror } from './mirror.js'
import { dwgMgr } from './dwg.js'
import { elementObject } from "./elementObject.js"
import { recordHistory } from './history.js'
import { zoomStack } from './menuHandlers.js'
import { utils } from './utils.js'
import { coordinateText } from './feetInches.js'

// Helper
const zoomToWindow = (appState, domRefs, zoomWindow) => {
  const x = zoomWindow.x
  const y = zoomWindow.y
  const width = zoomWindow.width
  const height = zoomWindow.height
  // S is screen pixels per model unit, i.e. scaleFactor * zoom.
  const scaleX = domRefs.canvas.clientWidth / width
  const scaleY = domRefs.canvas.clientHeight / height
  const S = Math.min(scaleX, scaleY)
  const scale = S / appState.scaleFactor
  const centerX = x + width / 2
  const centerY = y + height / 2
  const deltaOriginX = domRefs.canvas.clientWidth / (2 * S) - centerX
  const deltaOriginY = domRefs.canvas.clientHeight / (2 * S) - centerY
  appState.zoom = scale
  appState.deltaOriginX = deltaOriginX
  appState.deltaOriginY = deltaOriginY
  utils.redrawCanvas(appState, domRefs)    
  zoomStack.push({ zoom: scale, deltaOriginX, deltaOriginY })
}

// Click-click tools like line, rectangle, oval, text, and measure.

const createElement = (modelPoint, appState, dwg) => {
  switch (appState.tool) {
    case 'line': {
      const args = [[modelPoint.x, modelPoint.y], [modelPoint.x, modelPoint.y]];
      const line = elementObject('line', args, appState)
      line.firstPoint = { x: modelPoint.x, y: modelPoint.y }
      return line
    }
    case 'rect': {
      const args = [[modelPoint.x, modelPoint.y], [modelPoint.x, modelPoint.y]];
      const rect = elementObject('rect', args, appState)
      rect.firstPoint = { x: modelPoint.x, y: modelPoint.y }
      return rect
    }
    case 'zoom': {
      return {
        tag: 'rect',
        attrs: {
          x: modelPoint.x,
          y: modelPoint.y,
          width: 0,
          height: 0,
          fill: 'rgba(0, 116, 217, 0.3)',
          stroke: '#0074D9',
          'stroke-width': 1,
          'stroke-dasharray': "4,2"
        },
        firstPoint: { x: modelPoint.x, y: modelPoint.y }
      }
    }
    case 'oval': {
      const args = [[modelPoint.x, modelPoint.y], 0, 0];
      const ellipse = elementObject('ellipse', args, appState)
      ellipse.firstPoint = { x: modelPoint.x, y: modelPoint.y }
      return ellipse
    }
    case 'polygon': {
      const args = [
        appState.polygonSides || 6,   // Number of sides. Default to 6 if not set.
        [modelPoint.x, modelPoint.y], // Center point
        0                             // Initial radius
      ];
      const polygon = elementObject('polygon', args, appState)
      polygon.firstPoint = { x: modelPoint.x, y: modelPoint.y }
      return polygon
    }
    case 'text': {
      return {
        tag: 'text',
        attrs: {
          x: modelPoint.x,
          y: modelPoint.y,
          'font-size': 12,
          'text-anchor': 'start',
          'dominant-baseline': 'middle',
          fill: 'black'
        },
        firstPoint: { x: modelPoint.x, y: modelPoint.y }
      }
    }
    case 'measure':
    case 'mirror': {
      const tempLine = {
        tag: 'line',
        attrs: {
          x1: modelPoint.x,
          y1: modelPoint.y,
          x2: modelPoint.x,
          y2: modelPoint.y,
          'stroke-width': '1.5px',
          'stroke-dasharray': "4,2"
        },
        firstPoint: { x: modelPoint.x, y: modelPoint.y }
      }
      tempLine.attrs.stroke = appState.tool === 'measure' ? "#0074D9" : "#ff8c00"
      return tempLine
    }
  }
}


export const updateLatestPointInElement = (tool, element, modelPoint) => {
  switch (tool) {
    case 'line':
    case 'measure':
    case 'mirror': {
      element.attrs.x1 = element.firstPoint.x
      element.attrs.y1 = element.firstPoint.y
      element.attrs.x2 = modelPoint.x
      element.attrs.y2 = modelPoint.y
      return element
    }
    case 'rect':
    case 'zoom': {
      element.attrs.x = Math.min(element.firstPoint.x, modelPoint.x)
      element.attrs.y = Math.min(element.firstPoint.y, modelPoint.y)
      element.attrs.width = Math.abs(modelPoint.x - element.firstPoint.x)
      element.attrs.height = Math.abs(modelPoint.y - element.firstPoint.y)
      return element
    }
    case 'text': {
      element.attrs = { x: modelPoint.x, y: modelPoint.y, 'font-size': 12, 'text-anchor': 'start', 'dominant-baseline': 'middle', fill: 'black' }
      return element
    }
    case 'oval': {
      element.attrs.cx = (modelPoint.x + element.firstPoint.x) / 2
      element.attrs.cy = (modelPoint.y + element.firstPoint.y) / 2
      element.attrs.rx = Math.abs(modelPoint.x - element.firstPoint.x) / 2
      element.attrs.ry = Math.abs(modelPoint.y - element.firstPoint.y) / 2
      return element
    }
    case 'polygon': {
      const sides = element.numSides || 6
      const centroid = {
        x: (modelPoint.x + element.firstPoint.x) / 2,
        y: (modelPoint.y + element.firstPoint.y) / 2
      }
      // Circumscribed radius
      const radius = Math.min(
        Math.abs(modelPoint.x - element.firstPoint.x),
        Math.abs(modelPoint.y - element.firstPoint.y)
      ) / 2 / Math.cos(Math.PI / sides)
      const points = [];
      // Start angle so bottom is flat
      const startAngle = -Math.PI / sides - Math.PI / 2
      for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI / sides) * i + startAngle
        points.push({
          x: centroid.x + radius * Math.cos(angle),
          y: centroid.y + radius * Math.sin(angle)
        })
      }
      element.attrs.points = points.map(p => `${p.x},${p.y}`).join(" ")
      element.points = points
      return element
    }
  }
}

export const createSingleClickElement = (modelPoint, appState, dwg, domRefs, measurement) => {
  switch (appState.tool) {
    case 'line': {
      const args = [[modelPoint.x, modelPoint.y], [modelPoint.x + measurement[0], modelPoint.y + measurement[1]]];
      return elementObject('line', args, appState)
    }
    case 'rect': {
      const args = [[modelPoint.x, modelPoint.y], [modelPoint.x + measurement[0], modelPoint.y + measurement[1]]];
      return elementObject('rect', args, appState)
    }
    case 'zoom': {
      const zoomWindow = {
        x: Math.min(modelPoint.x, modelPoint.x + measurement[0]),
        y: Math.min(modelPoint.y, modelPoint.y + measurement[1]),
        width: Math.abs(measurement[0]),
        height: Math.abs(measurement[1]),
      }
      zoomToWindow(appState, domRefs, zoomWindow)
      return null // Don't actually add an element to the drawing for the zoom tool
    }
    case 'oval': {
      let element
      const rx = Math.abs(measurement[0]) / 2
      const ry = Math.abs(measurement[1]) / 2
      // No alert here: the hover preview calls this on every pointermove.
      if (rx === 0 && ry === 0) { return null }
      if (rx === ry || ry === 0) {
        // Create a circle
        const args = [[modelPoint.x, modelPoint.y], rx];
        element = elementObject('circle', args, appState)
      } else {
        // Create an ellipse
        const args = [[modelPoint.x, modelPoint.y], rx, ry];
        element = elementObject('ellipse', args, appState)
      }
      element.firstPoint = { x: modelPoint.x, y: modelPoint.y }
      return element
    }
    case 'polygon': {
      const sides = appState.polygonSides || 6
      const args = [sides, [modelPoint.x, modelPoint.y], measurement[0]];
      const polygon = elementObject('polygon', args, appState)
      polygon.firstPoint = modelPoint
      return polygon
    }
    case 'text': {
      return {
        tag: 'text',
        attrs: {
          x: modelPoint.x,
          y: modelPoint.y,
          fill: appState.fill,
          'font-size': appState.fontsize,
          'font-family': appState.fontfamily
        }
      }
    }
  }
}

export const clickClickTool = Object.freeze({
  createFinalElement(event, measurement, appState, domRefs, dwg) {
    // Create a one-click element using a measurement from the input box
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = createSingleClickElement(modelPoint, appState, dwg, domRefs, measurement)
    if (!element) {
      if (appState.tool === 'oval') {
        alert("Invalid measurement for oval. Both width and height cannot be zero.")
      }
      return
    }
    dwgMgr.pushChild(dwg, element)
    recordHistory(element, dwg)
  },
  createTempElement(event, appState, domRefs, dwg) {
    // Create the temporary rubber band element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const element = createElement(modelPoint, appState, dwg)
    utils.clearMeasurement(domRefs)
    dwgMgr.pushTemp(dwg, element)
  },
  update(event, appState, domRefs, dwg) {
    // Update the temporary rubber band element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    let element = dwgMgr.popRubberBand(dwg, appState)
    element = updateLatestPointInElement(appState.tool, element, modelPoint)
    dwgMgr.pushTemp(dwg, element)
    utils.updateLocalCoords(domRefs, element.firstPoint, modelPoint, appState)
  },
  finalize(event, appState, domRefs, dwg) {
    // Finalize the temporary element
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const tempElement = dwgMgr.getTemp(dwg)
    if (modelPoint.x === tempElement.firstPoint.x && modelPoint.y === tempElement.firstPoint.y) {
      // Don't create zero-length elements
      return false
    }
    if (appState.tool === 'measure') {
      // For measure tool, calculate and display the length.
      // Leave the Local readout showing until the next operation begins.
      const element = dwgMgr.popRubberBand(dwg, appState)
      const deltaX = modelPoint.x - element.firstPoint.x
      const deltaY = modelPoint.y - element.firstPoint.y
      const length = Math.hypot(deltaX, deltaY)
      domRefs.coordTable.children[0].children[3].children[0].textContent = "Δ = " + coordinateText(length, appState.unit, 2)
      domRefs.coordTable.children[0].children[3].children[1].textContent = coordinateText(deltaX, appState.unit, 2)
      domRefs.coordTable.children[0].children[3].children[2].textContent = coordinateText(deltaY, appState.unit, 2)
    } else if (appState.tool === 'mirror') {
      const modelPoint = adjustForSnapAndLock(event, appState, dwg)
      if (modelPoint.x === tempElement.firstPoint.x && modelPoint.y === tempElement.firstPoint.y) {
        // Don't mirror about a point
        return false
      }
      const refLine = { x1: tempElement.firstPoint.x, y1: tempElement.firstPoint.y, x2: modelPoint.x, y2: modelPoint.y }
      this.cancel(domRefs, dwg, appState) // Cancel the temporary element before mirroring
      mirror(appState, refLine, dwg, dwgMgr, domRefs)
    } else if (appState.tool === 'zoom') {
      // For zoom tool, zoom to the area of the rectangle
      const element = dwgMgr.popRubberBand(dwg, appState)
      zoomToWindow(appState, domRefs, element.attrs)
      utils.clearLocalCoords(domRefs)
    } else {
      let element = dwgMgr.popRubberBand(dwg, appState)
      element = updateLatestPointInElement(appState.tool, element, modelPoint)
      if (appState.tool === 'oval' && element.attrs.rx === element.attrs.ry) {
        // Change to circle
        element.tag = 'circle'
        element.attrs.r = element.attrs.rx
        delete element.attrs.rx
        delete element.attrs.ry
      }
      element.firstPoint = null // So the check for circle/square in snap.js will work properly.
      dwgMgr.pushChild(dwg, element)
      recordHistory(element, dwg)
      utils.clearLocalCoords(domRefs)
    }
    return true
},
  cancel(domRefs, dwg, appState) {
    // Cancel the temporary element
    utils.clearLocalCoords(domRefs)
    dwgMgr.popRubberBand(dwg, appState)
    domRefs.canvas.style.cursor = 'default'
}
})
