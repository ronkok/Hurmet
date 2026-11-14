import { adjustForSnapAndLock, pointToSegmentDistance } from './snap.js'
import { dwgMgr } from './dwg.js'
import { updateLatestPointInElement } from './clickClickTool.js'
import { text } from './text.js'
import { utils } from './utils.js'
import { resizeHandle } from './resizeHandle.js'
import { groups } from './groups.js'

// Module for the select tool

// Half-width/half-height of a (possibly rotated) ellipse's true axis-aligned
// bounding box, centered on its own cx/cy.
function ellipseBoundingHalfExtents(el) {
  const { rx, ry } = el.attrs
  if (!el.angle) { return { halfW: rx, halfH: ry } }
  const θ = el.angle * Math.PI / 180
  const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
  return {
    halfW: Math.hypot(rx * cosθ, ry * sinθ),
    halfH: Math.hypot(rx * sinθ, ry * cosθ)
  }
}

// Helper: does a line segment (p1, p2) intersect the rectangle (xMin, yMin, xMax, yMax)?
function segmentIntersectsRect(p1, p2, xMin, yMin, xMax, yMax) {
  // Check if either endpoint is inside the box
  if (
    (p1.x >= xMin && p1.x <= xMax && p1.y >= yMin && p1.y <= yMax) ||
    (p2.x >= xMin && p2.x <= xMax && p2.y >= yMin && p2.y <= yMax)
  ) return true;

  // Check for intersection with each edge of the rectangle
  const rectEdges = [
    [{x: xMin, y: yMin}, {x: xMax, y: yMin}], // top
    [{x: xMax, y: yMin}, {x: xMax, y: yMax}], // right
    [{x: xMax, y: yMax}, {x: xMin, y: yMax}], // bottom
    [{x: xMin, y: yMax}, {x: xMin, y: yMin}]  // left
  ];
  for (const [r1, r2] of rectEdges) {
    if (segmentsIntersect(p1, p2, r1, r2)) return true;
  }
  return false;
}

// Helper: do two line segments (p1,p2) and (q1,q2) intersect?
function segmentsIntersect(p1, p2, q1, q2) {
  function ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
    ccw(p1, p2, q1) !== ccw(p1, p2, q2)
  );
}

// Selecting a grouped element selects its whole outermost group, except that
// the text of a dimension or arrow is selected alone, so its label can be edited.
const selectsAsGroup = element => {
  return groups.isGrouped(element) &&
         !(element.tag === 'text' && groups.isLeafGroupMember(element))
}

const pushUnique = (array, element) => {
  if (!array.includes(element)) {
    array.push(element)
  }
}

export const selectTool = Object.freeze({
  // showResizeHandles is false when the join tool reuses this to establish
  // its first click's selection (sketch.js) — join immediately wants a
  // second click on a different element, not a resize interaction, so it
  // should never leave resize handles showing.
  checkForClickOnElement(event, appState, domRefs, dwg, inputBox, showResizeHandles = true) {
    // TODO: Check if the click is on a point and not the middle of a segment
    //       After dist to a segment is confirmed, we can check el.endPoints
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const S_model = appState.scaleFactor
    const S_zoom = appState.zoom
    const S = S_model * S_zoom
    const selectDistance = 6 / S // in px

    const elements = dwgMgr.getChildren(dwg)
    const selection = appState.selection || [];
    let selectedElement = null
    for (let i = elements.length - 1; i >= 0; i--) { // Check topmost elements first
      if (selectedElement) { break } // Already found an element
      const el = elements[i];
      switch (el.tag) {
        case 'line':
        case 'path': {
          if (appState.tool === 'join' && el.attrs['data-freehand']) { break } // Freehand strokes aren't joinable
          // Check each segment of the element
          for (let j = 0; j < el.segments.length; j++) {
            const seg = el.segments[j];
            if (appState.tool !== 'join' || el.tag === 'line' || j === 0 || j === el.segments.length - 1) {
              const [dist, _] = pointToSegmentDistance(modelPoint, seg)
              if (dist <= selectDistance) {
                selectedElement = el
                break
              }
            }
          }
          break
        }
        case 'polygon':
        case 'rect':
        case 'ellipse': {
          if (appState.tool === 'join') { break }
          // Check each segment of the element
          for (const seg of el.segments) {
            const [dist, _] = pointToSegmentDistance(modelPoint, seg)
            if (dist <= selectDistance) {
              selectedElement = el
              break
            }
          }
          break
        }
        case 'image': {
          // Unlike other shapes, an image commonly has no visible stroke to
          // click near, and its whole interior is the point — so select it
          // by clicking anywhere inside its (unrotated) bounding box rather
          // than testing proximity to an edge. Same known limitation as its
          // snap points (see snap.js): a rotated image's clickable area is
          // its unrotated box, not its displayed footprint.
          if (appState.tool === 'join') { break }
          const { x, y, width, height } = el.attrs
          if (
            modelPoint.x >= x && modelPoint.x <= x + width &&
            modelPoint.y >= y && modelPoint.y <= y + height
          ) {
            selectedElement = el
          }
          break
        }
        case 'circle': {
          if (appState.tool === 'join') { break }
          const cx = el.attrs.cx;
          const cy = el.attrs.cy;
          const dx = modelPoint.x - cx;
          const dy = modelPoint.y - cy;
          let dist;
          const r = el.attrs.r;
          const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
          dist = Math.abs(distanceToCenter - r); // Distance to the circle boundary
          if (dist <= selectDistance) {
            selectedElement = el
            break
          }
          break
        }
        case 'text': {
          if (appState.tool === 'join') { break }
          const boundingBox = el.boundingBox;
          if (
            modelPoint.x >= boundingBox.x &&
            modelPoint.x <= boundingBox.x + boundingBox.width &&
            modelPoint.y >= boundingBox.y &&
            modelPoint.y <= boundingBox.y + boundingBox.height
          ) {
            selectedElement = el
            // Change the dropdown textposition box. Display the position of the text element
            domRefs.textPositionSelect.value = el.position
            // Likewise the font size. A size not on the list (say, a scaled text) shows blank.
            domRefs.fontSizeSelect.value = String(parseFloat(el.attrs.fontsize) || 13.33)
            // Write text into the input box for editing
            text.setContentEditableText(inputBox, el.text)
            domRefs.okButton.classList.add('visible')
            domRefs.okButton.dataset.scope = 0  // Plain text
            domRefs.cancelButton.classList.add('visible')
            domRefs.inputBox.focus()
            break
          }
          break
        }
        default:
          // Unsupported element type for selection
          break;
      }
    }
    if (selectedElement) {
      // An element was clicked on
      dwgMgr.popRubberBand(dwg, appState)  // Remove the temporary selection window (if it exists)
      // Handle selection logic
      if (event.shiftKey) {
        // If shift key is held, toggle selection of this element
        const index = selection.indexOf(selectedElement)
        if (index === -1) {
          if (selectsAsGroup(selectedElement)) {
            const groupElements = groups.selectionUnit(elements, selectedElement)
            groupElements.forEach(el => {
              const domElement = domRefs.model.querySelector(`[data-id="${el.attrs.id}"]`)
              domElement.classList.add('selected')
              pushUnique(appState.selection, el)
            })   
          } else {
            pushUnique(appState.selection, selectedElement)
            // Set a class on the selected element to visually indicate selection
            const domElement = domRefs.model.querySelector(`[data-id='${selectedElement.attrs.id}']`)
            domElement.classList.add('selected')
          }
        } else {
          // Deselect the element, or its whole group, just as it was selected.
          const deselected = selectsAsGroup(selectedElement)
            ? groups.selectionUnit(elements, selectedElement)
            : [selectedElement]
          deselected.forEach(el => {
            const i = appState.selection.indexOf(el)
            if (i !== -1) { appState.selection.splice(i, 1) }
            // Remove the class from the deselected element
            const domElement = domRefs.model.querySelector(`[data-id='${el.attrs.id}']`)
            if (domElement) {
              domElement.classList.remove('selected')
            }
          })
        }
      } else {
        // Without shift key, clear previous selection and select this element
        selection.forEach(selEl => {
          const domElement = domRefs.model.querySelector(`[data-id='${selEl.attrs.id}']`)
          if (domElement) {
            domElement.classList.remove('selected')
          }
        })
        selection.length = 0
        if (selectsAsGroup(selectedElement)) {
          const groupElements = groups.selectionUnit(elements, selectedElement)
          groupElements.forEach(el => {
            const domElement = domRefs.model.querySelector(`[data-id="${el.attrs.id}"]`)
            domElement.classList.add('selected')
            pushUnique(appState.selection, el)
          })
        } else {
          appState.selection = [selectedElement]; // Select only this element
          const domElement = domRefs.model.querySelector(`[data-id='${selectedElement.attrs.id}']`)
          domElement.classList.add('selected')
        }
      }
      appState.selectedByClick = true
      if (showResizeHandles) { resizeHandle.refresh(appState, dwg) }
      return true
    } else {
      // Clicked on empty space; clear selection
      if (selection.length > 0) {
        selection.forEach(selEl => {
          const domElement = domRefs.model.querySelector(`[data-id='${selEl.attrs.id}']`)
          if (domElement) {
            domElement.classList.remove('selected')
          }
        })
        selection.length = 0
        appState.selection = [];
      }
      utils.closeInputBox(appState, domRefs) // Hide the text edit Ok/Cancel buttons and clear the input box
    }
    appState.selectedByClick = true
    if (showResizeHandles) { resizeHandle.refresh(appState, dwg) }
    return false
  },
  createTempWindow(event, appState, dwg) {
    // Create a temporary selection window element similar to the rectangle tool
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const tempElement = {
      tag: 'rect',
      attrs: {
        x: modelPoint.x,
        y: modelPoint.y,
        width: 0,
        height: 0,
        fill: 'rgba(0, 120, 215, 0.3)',
        stroke: '#0078d7',
        'stroke-dasharray': '4 2',
        'pointer-events': 'none',
        id: 'temp-selection-window'
      },
      firstPoint: { x: modelPoint.x, y: modelPoint.y }
    }
    dwgMgr.pushTemp(dwg, tempElement)
  },
  update(event, appState, domRefs, dwg) {
    // Update the temporary selection window based on pointer movement
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    let element = dwgMgr.popRubberBand(dwg, appState)
    element = updateLatestPointInElement('rect', element, modelPoint)
    dwgMgr.pushTemp(dwg, element)
    utils.updateLocalCoords(domRefs, element.firstPoint, modelPoint, appState)
  },
  selectAll(appState, domRefs, dwg) {
    // Select all elements in the drawing
    const elements = dwgMgr.getChildren(dwg)
    appState.selection = [];
    elements.forEach(el => {
      pushUnique(appState.selection, el)
      const domElement = domRefs.model.querySelector(`[data-id='${el.attrs.id}']`)
      if (domElement) {
        domElement.classList.add('selected')
      }
    })
    appState.selectedByClick = false
    resizeHandle.refresh(appState, dwg)
  },
  selectTheWindow(event, appState, domRefs, dwg) {
    // Identify elements within or intersecting the selection window
    // Add them to appState.selection
    // Remove the temporary selection window
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    const tempElement = dwgMgr.getTemp(dwg)
    const firstPoint = tempElement.firstPoint
    // Clear previous selection
    if (appState.selection && appState.selection.length > 0) {
      appState.selection.forEach(selEl => {
        const domElement = domRefs.model.querySelector(`[data-id='${selEl.attrs.id}']`)
        if (domElement) {
          domElement.classList.remove('selected')
        }
      })
      appState.selection = [];
    }
    if (modelPoint.x > firstPoint.x) {
      // Dragged to the right, select elements entirely within the box
      const xMin = firstPoint.x
      const xMax = modelPoint.x
      const yMin = Math.min(firstPoint.y, modelPoint.y)
      const yMax = Math.max(firstPoint.y, modelPoint.y)
      const elements = dwgMgr.getChildren(dwg)
      appState.selection = [] // Elements entirely within the selection box
      const isInside = el => {
        // Check if all segments of the element are within the selection box
        let elementIsInside = false
        switch (el.tag) {
          case 'line':
          case 'rect':
          case 'image':
          case 'polygon':
            elementIsInside = el.endPoints.every(pt => pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax)
            break
          case 'path':
            elementIsInside = el.attrs['data-freehand']
              // A freehand stroke keeps endPoints empty on purpose (see
              // snap.js — it would otherwise bloat endpoint-snap's search
              // pool), so check containment against its sampled segments
              // instead.
              ? el.segments.every(seg => seg.x1 >= xMin && seg.x1 <= xMax && seg.y1 >= yMin && seg.y1 <= yMax &&
                                          seg.x2 >= xMin && seg.x2 <= xMax && seg.y2 >= yMin && seg.y2 <= yMax)
              : el.endPoints.every(pt => pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax)
            break
          case 'circle':
            elementIsInside = (el.attrs.cx - el.attrs.r >= xMin) &&
                              (el.attrs.cx + el.attrs.r <= xMax) &&
                              (el.attrs.cy - el.attrs.r >= yMin) &&
                              (el.attrs.cy + el.attrs.r <= yMax)
            break
          case 'ellipse': {
            const { halfW, halfH } = ellipseBoundingHalfExtents(el)
            elementIsInside = (el.attrs.cx - halfW >= xMin) &&
                              (el.attrs.cx + halfW <= xMax) &&
                              (el.attrs.cy - halfH >= yMin) &&
                              (el.attrs.cy + halfH <= yMax)
            break
          }
          case 'text':
            const box = el.boundingBox
            elementIsInside = (box.x >= xMin) &&
                             (box.x + box.width <= xMax) &&
                             (box.y >= yMin) &&
                             (box.y + box.height <= yMax)
            break
          default:
            elementIsInside = false
        }
        return elementIsInside
      }
      elements.forEach(el => {
        if (!isInside(el)) { return }
        // A grouped element is selected only along with its whole group, and
        // only when every member of that group is inside the box. The text of
        // a dimension or arrow may still be selected alone.
        const unit = selectsAsGroup(el) ? groups.selectionUnit(elements, el) : [el]
        if (unit.length > 1 && !unit.every(isInside)) { return }
        unit.forEach(unitEl => {
          pushUnique(appState.selection, unitEl)
          // Add a class to visually indicate selection
          const domElement = domRefs.model.querySelector(`[data-id='${unitEl.attrs.id}']`)
          domElement.classList.add('selected')
        })
      })
    } else {
      // Dragged to the left, select elements that intersect the box
      const xMin = modelPoint.x
      const xMax = firstPoint.x
      const yMin = Math.min(firstPoint.y, modelPoint.y)
      const yMax = Math.max(firstPoint.y, modelPoint.y)
      const elements = dwgMgr.getChildren(dwg)
      appState.selection = [] // Elements that intersect the selection box
      elements.forEach(el => {
        // Check if any segment of the element intersects the selection box
        let intersects = false
        switch (el.tag) {
          case 'line':
          case 'rect':
          case 'image':
          case 'path':
          case 'polygon':
            // Check each segment of the element
            intersects = el.segments.some(seg => {
              if (seg.type === 'lineSegment') {
                const p1 = {x: seg.x1, y: seg.y1};
                const p2 = {x: seg.x2, y: seg.y2};
                return segmentIntersectsRect(p1, p2, xMin, yMin, xMax, yMax);
              }
            });
            break
          case 'circle': {
            // Check if the circle intersects the selection box
            const cx = el.attrs.cx;
            const cy = el.attrs.cy;
            const r = el.attrs.r;
            // Find the closest point on the rectangle to the circle's center
            const closestX = Math.max(xMin, Math.min(cx, xMax));
            const closestY = Math.max(yMin, Math.min(cy, yMax));
            // Calculate the distance between the circle's center and this closest point
            const dx = cx - closestX;
            const dy = cy - closestY;
            intersects = (dx * dx + dy * dy) <= (r * r);
            break
          }
          case 'ellipse': {
            // Approximate ellipse intersection by checking bounding box intersection
            const cx = el.attrs.cx;
            const cy = el.attrs.cy;
            const { halfW, halfH } = ellipseBoundingHalfExtents(el)
            const ellipseXMin = cx - halfW;
            const ellipseXMax = cx + halfW;
            const ellipseYMin = cy - halfH;
            const ellipseYMax = cy + halfH;
            intersects = !(ellipseXMax < xMin || ellipseXMin > xMax || ellipseYMax < yMin || ellipseYMin > yMax);
            break
          }
          case 'text': {
            const box = el.boundingBox
            intersects = !(box.x > xMax || box.x + box.width < xMin || box.y > yMax || box.y + box.height < yMin)
            break
          }
          default:
            intersects = false
            break
        }
        if (intersects) {
          if (selectsAsGroup(el)) {
            const groupElements = groups.selectionUnit(elements, el)
            groupElements.forEach(groupEl => {
              const domElement = domRefs.model.querySelector(`[data-id="${groupEl.attrs.id}"]`)
              domElement.classList.add('selected')
              pushUnique(appState.selection, groupEl)
            })
          } else {
            pushUnique(appState.selection, el)
            // Add a class to visually indicate selection
            const domElement = domRefs.model.querySelector(`[data-id='${el.attrs.id}']`)
            domElement.classList.add('selected')
          }
        }
      })
    }
    dwgMgr.popRubberBand(dwg, appState)
    appState.selectedByClick = false
    resizeHandle.refresh(appState, dwg)
  },
  cancel(domRefs, dwg, appState) {
    utils.clearLocalCoords(domRefs)
    dwgMgr.popRubberBand(dwg, appState)
    appState.textposition = 'middle' // Reset to default
    domRefs.textPositionSelect.value = 'middle' // Reset to default
    // appState.fontsize is the user's choice, not a default, so the dropdown goes back to it.
    domRefs.fontSizeSelect.value = String(appState.fontsize)
  }
})
