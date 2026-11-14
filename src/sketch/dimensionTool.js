import { adjustForSnapAndLock, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { text } from './text.js'
import { recordHistory } from './history.js'
import { utils } from './utils.js'
import { elementObject, dimensionLabel } from './elementObject.js'

// Dimension string tool

export const dimensionTool = {
  initiate(event, appState, domRefs, dwg) {
    utils.clearLocalCoords(domRefs)
    dwgMgr.clearTempElements(dwg)
  },
  addPoint(event, appState, domRefs, dwg) {
    // Add a temporary blue dot to the temporary layer
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const blueDot = {
      tag: 'circle',
      attrs: {
        cx: modelPoint.x,
        cy: modelPoint.y,
        r: 3 / (appState.scaleFactor * appState.zoom),
        fill: 'blue',
        stroke: 'none'
      }
    }
    dwgMgr.pushTempElement(dwg, blueDot)
  },
  finalize(event, appState, domRefs, dwg) {
    // Finalize the dimension string
    const labelPoint = adjustForSnapAndLock(event, appState, dwg)// Last point is label position
    // Collect the points from the temporary blue dots and create a dimension string.
    const dimPts = [];
    for (let i = 0; i < dwg.children[2].children[1].children.length - 1; i++) {
      dimPts.push({
        x: dwg.children[2].children[1].children[i].attrs.cx,
        y: dwg.children[2].children[1].children[i].attrs.cy
      })
    }
    // Validate label position
    const n = dimPts.length
    // Not zoom: a reloaded (or undone) drawing is built at zoom 1, so zoom would change the gaps.
    const SF = appState.scaleFactor // scale factor
    const six = 6  / SF  // 6 px in model coords
    const elements = [];
    const textposition = appState.textposition; // Save current text position

    if (event.shiftKey && n === 2) {
      // Aligned dimension: the dimension line is parallel to the line through
      // the two points, and the extension lines are perpendicular to it.
      // Built the same way parse.js rebuilds it from its saved oblique form.
      const p0 = dimPts[0]
      const p1 = dimPts[1]
      if (p0.x === p1.x && p0.y === p1.y) {
        // Degenerate line. Abort.
        utils.clearLocalCoords(domRefs)
        dwgMgr.clearTempElements(dwg)
        return
      }
      const dimAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI
      const group = elementObject("dimension", [
        [[p0.x, p0.y], [p1.x, p1.y], [labelPoint.x, labelPoint.y]], null, dimAngle, dimAngle + 90
      ], appState)
      if (!group) {
        utils.clearLocalCoords(domRefs)
        dwgMgr.clearTempElements(dwg)
        return
      }
      elements.push(...group)

    // Check if label y coord is in between end dimPts y coords
    } else if ((dimPts[0].y < dimPts[n - 1].y && dimPts[0].y < labelPoint.y  && labelPoint.y < dimPts[n - 1].y) ||
        (dimPts[n - 1].y < dimPts[0].y &&  dimPts[n - 1].y < labelPoint.y && labelPoint.y < dimPts[0].y)) {
      // A vertical string of dimensions
      const sign = Math.sign(labelPoint.x - dimPts[0].x)
      for (let i = 0; i < n; i++) {
        // Draw extension lines
        elements.push({
          tag: 'line', 
          attrs: {
            x1: dimPts[i].x >= labelPoint.x ? dimPts[i].x - six : dimPts[i].x + six,
            y1: dimPts[i].y,
            x2: dimPts[i].x >= labelPoint.x ? labelPoint.x - six : labelPoint.x + six,
            y2: dimPts[i].y,
            stroke: "black",
            'stroke-width': 0.5,
            'stroke-dasharray': null
          }
        })
      }
      appState.textposition = sign > 0 ? 'right' : 'left'
      for (let i = 0; i < n - 1; i++) {
        // Draw dimension lines with arrows
        elements.push({
          tag: 'line', 
          attrs: {
            x1: labelPoint.x,
            y1: dimPts[i].y,
            x2: labelPoint.x,
            y2: dimPts[i + 1].y,
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
        const dimValue = Math.abs(dimPts[i + 1].y - dimPts[i].y);
        const midPoint = {
          x: labelPoint.x,
          y: (dimPts[i].y + dimPts[i + 1].y) / 2
        }
        const textElement = text.createLabelElement(
          dimensionLabel(dimValue, appState),
          midPoint,
          appState,
          dwg
        )
        elements.push(textElement)
      }
    } else if (dimPts[0].x < dimPts[n - 1].x && dimPts[0].x < labelPoint.x  && labelPoint.x < dimPts[n - 1].x ||
                dimPts[0].x > dimPts[n - 1].x &&  dimPts[n - 1].x < labelPoint.x && labelPoint.x < dimPts[0].x) {
      // A horizontal string of dimensions
      const sign = Math.sign(labelPoint.y - dimPts[0].y)
      for (let i = 0; i < n; i++) {
        // Draw extension lines
        elements.push({
          tag: 'line', 
          attrs: {
            x1: dimPts[i].x,
            y1: dimPts[i].y >= labelPoint.y ? dimPts[i].y - six : dimPts[i].y + six,
            x2: dimPts[i].x,
            y2: dimPts[i].y >= labelPoint.y ? labelPoint.y - six : labelPoint.y + six,
            stroke: "black",
            'stroke-width': 0.5,
            'stroke-dasharray': null
          }
        })
      }
      appState.textposition = sign > 0 ? 'above' : 'below'
      for (let i = 0; i < n - 1; i++) {
        // Draw dimension lines with arrows
        elements.push({
          tag: 'line', 
          attrs: {
            x1: dimPts[i].x,
            y1: labelPoint.y,
            x2: dimPts[i + 1].x,
            y2: labelPoint.y,
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
        const dimValue = Math.abs(dimPts[i + 1].x - dimPts[i].x);
        const midPoint = {
          x: (dimPts[i].x + dimPts[i + 1].x) / 2,
          y: labelPoint.y
        }
        const textElement = text.createLabelElement(
          dimensionLabel(dimValue, appState),
          midPoint,
          appState,
          dwg
        )
        elements.push(textElement)
      }
    } else {
      // Invalid label position. Abort.
      utils.clearLocalCoords(domRefs)
      dwgMgr.clearTempElements(dwg)
      return
    }
    dwgMgr.pushGroup(dwg, elements, "dimension")
    dwgMgr.clearTempElements(dwg)
    recordHistory(null, dwg) // Record the whole drawing
    rebuildIntersectPoints(dwg)
    appState.textposition = textposition; // Restore text position
    utils.clearLocalCoords(domRefs)
  },
  cancel(domRefs, dwg, _) {
    // Cancel the dimension string
    utils.clearLocalCoords(domRefs)
    dwgMgr.clearTempElements(dwg)
  }
}
