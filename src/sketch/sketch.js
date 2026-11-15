import { defaultAppState } from './appState.js'
import { dwgMgr, defaultDwg } from './dwg.js'
import { menuListeners } from './menuListeners.js'
import { parseDwg, parseLine } from './parse.js'
import { numberSeparatorRegEx } from './numberInput.js'
import { adjustForSnapAndLock, rebuildIntersectPoints } from './snap.js'
import { clickTool } from './clickTools.js'
import { clickClickTool } from './clickClickTool.js'
import { trimTool } from './trimTool.js'
import { joinTool } from './joinTool.js'
import { moveTool } from './moveTool.js'
import { multiClickTool, arcTool } from './multiClickTool.js'
import { dimensionTool } from './dimensionTool.js'
import { pan } from './pan.js'
import { freehandTool } from './freehandTool.js'
import { selectTool } from './selectTool.js'
import { resizeHandle } from './resizeHandle.js'
import { text } from './text.js'
import { image } from './importImage.js'
import { offset } from './offset.js'
import { translateVirtualElement } from './moveTool.js'
import { eraseSegment } from './erase.js'
import { recordHistory, applyMeta, resetHistory, sceneHeaderOf } from './history.js'
import { utils } from './utils.js'
import { clearTempAndSelection } from './workingState.js'
import { coordinateText } from './feetInches.js'
import { groups } from './groups.js'
import { shapePreview } from './shapePreview.js'
import { singleClickPreview } from './singleClickPreview.js'
import { snapMarker } from './snapMarker.js'
import { clipboard } from './clipboard.js'
import { shapeLibrary } from './shapeLibrary.js'
import { selectedUnits, zoomStack } from './menuHandlers.js'
import { stringify } from './stringify.js'
import { sketchHtml, sketchCss } from './sketchHtml.js'

// This module is the entry point for Javascript code in Hurmet's sketch utility.
// It contains the sketch-canvas event listeners and the sketch-canvas event loop.
// Event listeners for the menu and palettes are in file `menu.js`.

const dwg = structuredClone(defaultDwg)           // Virtual representation of the current drawing
const appState = structuredClone(defaultAppState) // The current application state
// The page elements Sketch works with. Inside Hurmet, the Sketch markup is added to the
// page only when Sketch first opens, so findDomRefs runs then, from init.
const domRefs = {}
const findDomRefs = () => Object.assign(domRefs, {
  inputBox: document.getElementById('text-input'),             // The text input box
  canvas: document.querySelector('.active-sketch'),            // The sketch SVG canvas
  model: document.querySelector(".active-sketch").querySelector(".model"), // The model space <g> element
  backdrop: document.getElementById('backdrop-layer'),         // Grid and axes, beneath the model (src/gridAxes.js)
  gridSvg: document.getElementById('sketch-grid'),             // The SVG element for the grid lines
  coordTable: document.getElementById('coordinate-display'),   // The coordinate display
  okButton: document.getElementById('input-ok'),               // The OK button for the input box
  cancelButton: document.getElementById('input-cancel'),       // The Cancel button for the input box
  textPositionSelect: document.getElementById('text-position'), // The dropdown for text position
  fontSizeSelect: document.getElementById('font-size'),        // The dropdown for font size
  shapeLibraryDialog: document.getElementById('shape-library-dialog'),   // shape Library… popup
  shapeLibraryRecents: document.getElementById('shape-library-recents'), // Its "Recent" list
  shapeLibraryCatalog: document.getElementById('shape-library-catalog'), // Its "Available" list
  shapePickerDialog: document.getElementById('shape-picker-dialog'), // Insert Shape from Library popup
  shapePickerGrid: document.getElementById('shape-picker-grid'),    // Its shape grid/list
  propertiesDialog: document.getElementById('sketch-properties-dialog') // Sketch Properties… popup
})

// True while the Sketch dialog is open and showing.
const isSketchActive = () => Boolean(domRefs.canvas) && domRefs.canvas.isConnected &&
  domRefs.canvas.getClientRects().length > 0

function coroutine(f) {
  // This is a wrapper which provides a little sugar for the coroutine object below.
  // This wrapper returns a function which we can call directly instead of calling 
  // "next" on the coroutine object.
  // Credit: https://x.st/javascript-coroutines/
  const o = f()          // Instantiate the coroutine.
  o.next()               // Execute until the first yield.
  let running = false
  return function(x) {   // Return a function which we can call directly.
    // Drop an event raised while the coroutine itself is running, e.g. the
    // 'toolswitch' from a tool button that handleKeyDown clicks. Calling
    // o.next() re-entrantly would throw "Generator is already running".
    if (running) { return }
    running = true
    try {
      o.next(x)
    } finally {
      running = false
    }
  }
}

// The loop for handling events in the sketch canvas. init creates it, after findDomRefs.
let eventLoop = null
const eventLoopBody = function*() {
  // Since this is a coroutine, it will suspend itself at each `yield` keyword.
  // We can then resume it by sending it a value, which in our case is an event. The event
  // will appear as the return value of yield and execution will resume until the next yield.
  // Placement of the `yield` keywords thus determines part of the program state.
  const inputBox = domRefs.inputBox // document.getElementById('text-input')
  let event
  let lastTapTime = 0
  while (event = yield) {
    // First, ensure that the event is a pointer event inside the sketch area
    const isPointerEvent = event.type.startsWith('pointer')
    const isInsideSketch = event.target === sketch || sketch.contains(event.target)
    // Grabbing a corner (or, for a line, an endpoint) of a selected
    // image/rect/line's blue selection marks resizes it. This is checked
    // ahead of the per-tool branches below, but hitTest() returns null unless
    // the Select tool is active — see resizeHandle.js.
    const resizeCorner = (isPointerEvent && isInsideSketch && event.type === 'pointerdown' && event.button === 0)
      ? resizeHandle.hitTest(event, appState, dwg)
      : null
    if (isPointerEvent && isInsideSketch && event.type === 'pointerdown' && event.button === 0) {
      // A new operation begins. Clear the Local readout, which the Measure
      // tool leaves showing after it finishes.
      utils.clearLocalCoords(domRefs)
    }
    if (event.type == 'keydown') {
      menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, null)
    } else if (!(isPointerEvent && isInsideSketch)) {
      // Ignore the event
    } else if (resizeCorner !== null) {
      event.preventDefault()
      resizeHandle.start(event, appState, dwg, resizeCorner)
      while (event = yield) {
        if (event.type === 'keydown' || event.type === 'toolswitch') {
          const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, resizeHandle)
          if (mustBreak) { break }
        } else if (event.type == 'pointermove') {
          resizeHandle.update(event, appState, dwg)
        } else if (event.type == 'pointerup') {
          resizeHandle.finalize(event, appState, dwg)
          break
        }
      }
    } else if (event.type == 'pointerdown' && appState.tool === 'select' && event.button === 0) {
      event.preventDefault()  // stop Chrome from trying to select text
      // Unlike most tools, the select tool is a click-drag tool, initiated by a pointerdown.
      selectTool.createTempWindow(event, appState, dwg)
      while (event = yield) {
        if (event.type === 'keydown' || event.type === 'toolswitch') {
          const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, selectTool)
          if (mustBreak) { break }
        } else if (event.type == 'pointermove') {
          selectTool.update(event, appState, domRefs, dwg)
        } else if (event.type == 'pointerup') {
          utils.clearLocalCoords(domRefs) // The drag is over.
          // If the pointerup is on the same point as pointerdown, check for click on element
          // Find firstPoint in px in same reference frame as event.offset.
          const S = appState.scaleFactor * appState.zoom
          const firstPoint = dwgMgr.getTemp(dwg).firstPoint // in model coordinates
          const firstPtOffset = {
            x: (firstPoint.x + appState.deltaOriginX) * S,
            y: appState.height - ((firstPoint.y + appState.deltaOriginY) * S)
          } // in px
          const dist = Math.hypot(event.offsetX - firstPtOffset.x, event.offsetY - firstPtOffset.y)
          // If the pointerup is within 5 px of the pointerdown, treat it as a click
          if (dist < 5) {
            const clickWasOnElement = selectTool.checkForClickOnElement(event, appState, domRefs, dwg, inputBox)
            if (clickWasOnElement) {
              // An element was clicked and selected. appState.selection was updated.
            } else {
              selectTool.cancel(domRefs, dwg, appState)
            }
          } else {
            selectTool.selectTheWindow(event, appState, domRefs, dwg)
          }
          break
        }
      }
    } else if (event.type == 'pointerdown' && appState.tool === 'pan' && event.button === 0) {
      // The pan tool is a click-drag tool
      event.preventDefault()
      pan.startPan(event, appState, dwg)
      while (event = yield) {
        if (event.type === 'keydown' || event.type === 'toolswitch') {
          const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, pan)
          if (mustBreak) {
            break // pan.cancel will be called in menuListeners
          }
        } else if (event.type == 'pointermove') {
          pan.move(event, appState, domRefs, dwg)
        } else if (event.type == 'pointerup') {
          // Finalize the pan action
          pan.finalize(event, appState, domRefs, dwg)
          break
        }
      }
    } else if (event.type == 'pointerdown' && appState.tool === 'freehand' && event.button === 0) {
      // The freehand tool is a click-drag tool, initiated by a pointerdown.
      event.preventDefault()
      freehandTool.start(event, appState, dwg)
      while (event = yield) {
        if (event.type === 'keydown' || event.type === 'toolswitch') {
          const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, freehandTool)
          if (mustBreak) { break }
        } else if (event.type == 'pointermove') {
          freehandTool.update(event, appState, dwg)
        } else if (event.type == 'pointerup') {
          freehandTool.finalize(event, appState, dwg)
          break
        }
      }
    } else if (event.type == 'pointerup') {
      // Most tools are single-click or click-click tools, initiated by a pointerup.
      event.preventDefault()
      switch (appState.tool) {
        case 'image': {
          const url = inputBox.textContent.trim()
          if (url) {
            image.createFromUrl(event, url, appState, dwg).then(element => {
              if (element) {
                recordHistory(element, dwg)
                rebuildIntersectPoints(dwg)
              }
            })
            inputBox.textContent = "" // Clear the input box
          }
          break
        }
        case 'erase': {
          eraseSegment(event, appState, dwg)
          break
        }
        case 'offset': {
          const offsetDistance = utils.readLength(inputBox.textContent, appState)
          if (isNaN(offsetDistance) || offsetDistance === 0) {
            window.alert('Offset: enter a nonzero number in the text box.');
          } else {
            offset(event, appState, offsetDistance, dwg)
          }
          break
        }
        case 'rotate':
        case 'extend':
        case 'resize':
        case 'angular-array':
        case 'fillet':
        case 'library':
        case 'paste': {
          // Single-click actions
          const [gotValidMeasurement, measurement] = utils.validateMeasurement(inputBox, appState)
          clickTool.execute(event, measurement, appState, dwg, domRefs)
          if (appState.tool === 'paste') {
            // A paste is one click. The Select tool's button also clears the armed shapes.
            document.querySelector('#tool-form .palette-btn[data-tool="select"]').click()
            resizeHandle.refresh(appState, dwg)
          }
          break
        }
        case 'array': {
          if (appState.selection.length === 0) {
            alert("The array tool requires one or more selected elements.")
          } else {
            domRefs.okButton.classList.add('visible')
            domRefs.okButton.dataset.scope = "array"
            domRefs.cancelButton.classList.add('visible')
            domRefs.inputBox.focus()
          }
          break
        }
        case 'trim': {
          // First click selects a reference line segment, drawn in the temporary layer.
          // Subsequent clicks trim other segments to the reference segment.
          if (appState.referenceLine == null) {
            trimTool.setReferenceLineSegment(event, appState, dwg)
          } else {
            trimTool.trimElement(event, appState, dwg)
          }
          break
        }
        case 'join': {
          // Trim two elements to their intersection point and join them into one element.
          if (appState.selection.length === 0) {
            const clickWasOnElement = selectTool.checkForClickOnElement(event, appState, domRefs, dwg, inputBox, false)
            if (clickWasOnElement) {
              // Collect some data from the first selected element.
              joinTool.firstClick(event, appState, dwg)
              // Now wait for the second click.
              while (event = yield) {
                if (event.type === 'keydown' || event.type === 'toolswitch') {
                  const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, joinTool)
                  if (mustBreak) { 
                    joinTool.cancel(domRefs, dwg, appState)
                    break
                  }
                } else if (event.type === 'pointerup') {
                  joinTool.execute(event, appState, domRefs, dwg)
                  break
                }
              }
            }
          } else {
            joinTool.cancel(domRefs, dwg, appState)
          }
          break
        }
        case 'text': {
          const str = text.getInputBoxText(inputBox)
          if (str) {
            const element = text.createElement(event, str, appState, dwg)
            inputBox.textContent = "" // Clear the input box
            recordHistory(element, dwg)
          }
          break
        }
        case 'line':
        case 'rect':
        case 'oval':
        case 'polygon':
        case 'measure':
        case 'mirror':
        case 'move':
        case 'zoom': {
          // Click-click actions
          let gotValidMeasurement = false
          let measurement = [0, 0];
          let numSides = 0
          if (appState.tool === 'polygon') {
            ;[numSides, measurement] = utils.parsePolygonInput(inputBox.textContent.trim(), appState)
            // Check for a leading integer in the text box. It stands for the number of sides.
            if (isNaN(numSides) || numSides < 3) {
              alert("Enter the number of sides (3 or more) in the text box before clicking for a polygon.")
              break
            }
            appState.polygonSides = numSides
          } else {
            ;[gotValidMeasurement, measurement] = utils.validateMeasurement(inputBox, appState)
          }
          if ((appState.tool === 'polygon' && numSides > 0 && measurement[0] > 0) ||
              (gotValidMeasurement && appState.tool !== 'measure')) {
            // This becomes a single-click tool. Point 2 is set by the measurement.
            clickClickTool.createFinalElement(event, measurement, appState, domRefs, dwg)
            singleClickPreview.hide()
            break
          } else if (appState.tool === 'move') {
            // Move & duplicate differ from other click-click tools in that they operate
            // on multiple selected elements.
            if (appState.selection.length === 0) {
              alert(`The ${appState.tool} tool requires one or more selected elements.`)
              break
            }
            const mode = appState.duplicateOnMove ? "duplicate" : "move"
            moveTool.start(event, appState, dwg, mode)
            while (event = yield) {
              if (event.type === 'keydown' || event.type === 'toolswitch') {
                const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, moveTool)
                if (mustBreak) break
              } else if (event.type === 'pointermove') {
                moveTool.update(event, appState, dwg, domRefs)
              } else if (event.type === 'pointerup' && event.button === 0) {
                moveTool.finalize(event, appState, dwg, domRefs)
                break
              }
            }
            break
          } else {
            // Create a rubber-band element that tracks the mouse movement.
            clickClickTool.createTempElement(event, appState, domRefs, dwg)
            while (event = yield) {
              if (event.type === 'keydown' || event.type === 'toolswitch') { 
                const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, clickClickTool)
                if (mustBreak) { break }
              } else if (event.type == 'pointermove') {
                clickClickTool.update(event, appState, domRefs, dwg)
              } else if (event.type == 'pointerup') {
                // Finalize the element
                const createdNonZeroElement = clickClickTool.finalize(event, appState, domRefs, dwg)
                if (appState.tool === 'mirror' && createdNonZeroElement) {
                  recordHistory(null, dwg)
                  rebuildIntersectPoints(dwg)
                  resizeHandle.refresh(appState, dwg)
                }
                if (appState.tool === 'zoom') {
                  // Set the select tool button to active
                  document.querySelector('#tool-form .palette-btn[data-tool="select"]').click()
                }
                if (createdNonZeroElement) { break }
              }
            }
            break
          }
        }
        case 'arc': {
          multiClickTool.createTempElement(event, appState, domRefs, dwg)
          while (event = yield) {
            if (event.type === 'pointerup') {
              const [gotValidMeasurement, measurement] = utils.validateMeasurement(inputBox, appState)
              if (gotValidMeasurement) {
                // Finalize the arc as a circular or elliptical arc with the given radius.
                arcTool.finalize(event, appState, domRefs, dwg, measurement)
                break
              }
              // Otherwise, add a point to define the arc.
              multiClickTool.addPoint(event, appState, domRefs, dwg)
              while (event = yield) {
                if (event.type === 'keydown' || event.type === 'toolswitch') { 
                  const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, multiClickTool)
                  if (mustBreak) { break }
                } else if (event.type == 'pointermove') {
                  multiClickTool.update(event, appState, domRefs, dwg)
                } else if (event.type == 'pointerup') {
                  // Finalize the element
                  arcTool.finalize(event, appState, domRefs, dwg, undefined)
                  break
                }
              }
              break
            } else if (event.type === 'pointermove') {
              // Update the preview of the next segment
              multiClickTool.update(event, appState, domRefs, dwg)
            } else if (event.type === 'keydown' || event.type === 'toolswitch') {
              const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, multiClickTool)
              if (mustBreak) { break }
            }
          }
          break
        }
        case 'polyline':
        case 'arrow': {
          // Multi-click actions. Finalize with double click. Abort with a tool change.
          // Start the element with the first click
          multiClickTool.createTempElement(event, appState, domRefs, dwg)
          lastTapTime = Date.now()
          while (event = yield) {
            event.preventDefault()
            if (event.type === 'pointerup') {
              const currentTime = Date.now()
              if (currentTime - lastTapTime > 300) {
                const currentMaxId = dwg.maxId
                multiClickTool.addPoint(event, appState, domRefs, dwg)
                if (dwg.maxId > currentMaxId) { break } // A path closed.
                lastTapTime = currentTime
              } else {
                multiClickTool.finalize(appState, dwg, domRefs)
                break
              }
            } else if (event.type === 'pointermove') {
              // Update the preview of the next segment
              multiClickTool.update(event, appState, domRefs, dwg)
            } else if (event.type === 'keydown' || event.type === 'toolswitch') {
              const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, multiClickTool)
              if (mustBreak) { break }
              /*if (event.key === "Escape" && document.activeElement !== domRefs.inputBox) {
                appState.tool = currentTool // Restore the tool in case it was changed to Escape
                multiClickTool.finalize(appState, dwg, domRefs)
                break
              }*/
            }
          }
          break
        }
        case 'dimension': {
          // Multi-click action. Finalize with double click. Abort with a tool change.
          dimensionTool.initiate(event, appState, domRefs, dwg)
          dimensionTool.addPoint(event, appState, domRefs, dwg)
          lastTapTime = Date.now()
          while (event = yield) {
            event.preventDefault()
            if (event.type === 'pointerup') {
              const currentTime = Date.now()
              if (currentTime - lastTapTime > 300) {
                dimensionTool.addPoint(event, appState, domRefs, dwg)
                lastTapTime = currentTime
              } else {
                dimensionTool.finalize(event, appState, domRefs, dwg)
                break
              }
            } else if (event.type === 'keydown' || event.type === 'toolswitch') {
              const mustBreak = menuListeners.handleKeyDown(event, document, appState, domRefs, dwg, dimensionTool)
              if (mustBreak) { break }
            }
          }
          break
        }
        default: {
          //
        }
      }
    }
  }
}

function init(sketch) {
  findDomRefs()
  eventLoop = coroutine(eventLoopBody)
  dwg.model = document.querySelector(".active-sketch").querySelector(".model")
  // Find the highest number in use, as an element id or a group number.
  // Both come from the same counter (see groups.js).
  dwgMgr.getChildren(dwg).forEach(el => {
    const numbers = [parseInt(el.attrs.id, 10), ...groups.groupPath(el)]
    numbers.forEach(n => {
      if (!isNaN(n) && n > dwg.maxId) { dwg.maxId = n }
    })
  })
  utils.generateGridLines(appState, domRefs)  // Draw the initial grid, invisibly at first.

  // The canvas fills whatever space the layout gives .sketch-container, so follow its
  // size. A window resize can report many sizes per frame; apply only the latest.
  const container = document.querySelector('.sketch-container')
  let resizeFrame = null
  new ResizeObserver(() => {
    if (resizeFrame) { return }
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null
      const width = container.clientWidth
      const height = container.clientHeight
      const changed = width !== appState.width || height !== appState.height
      if (width > 0 && height > 0 && changed) {
        utils.resizeCanvas(appState, domRefs, width, height)
      }
    })
  }).observe(container)

  // register the listeners:
  sketch.addEventListener('pointermove', (event) => {
    const modelPoint = adjustForSnapAndLock(event, appState, dwg)
    snapMarker.update(appState, dwg)
    const round = modelPoint.x >= 100 || modelPoint.y >= 100 ? 2 : 3
    domRefs.coordTable.children[0].children[1].children[1].textContent = coordinateText(modelPoint.x, appState.unit, round)
    domRefs.coordTable.children[0].children[1].children[2].textContent = coordinateText(modelPoint.y, appState.unit, round)
    if (appState.tool === 'library' || appState.tool === 'paste') {
      shapePreview.moveTo(modelPoint)
    } else {
      singleClickPreview.update(modelPoint, appState, domRefs, dwg)
    }
  })

  sketch.addEventListener('pointerleave', () => {
    shapePreview.pause()
    singleClickPreview.hide()
    snapMarker.hide()
  })

  // Mouse wheel scroll event. Also captures pinch-zoom on laptop trackpads.
  sketch.addEventListener("wheel", (event) => {
    event.preventDefault()
    // Two finger zoom on a trackpad generates a wheel event, but it scales very fast.
    // So we limit zoom speed: use a small factor and multiplicative scaling
    const zoomFactor = Math.exp(-event.deltaY * 0.004); // 0.004 is a good starting value
    const newZoom = appState.zoom * zoomFactor
    utils.setZoom(newZoom, appState, domRefs, { offsetX: event.offsetX, offsetY: event.offsetY })
  }, { passive: false })

  // Touch events for pinch-zoom on the screen
  let lastPinchDist = null
  sketch.addEventListener('touchstart', (event) => {
    if (event.touches.length === 2) {
      // Two fingers: start pinch
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      lastPinchDist = Math.hypot(dx, dy)
    }
  }, { passive: false })
  
  sketch.addEventListener('touchmove', (event) => {
    if (event.touches.length === 2 && lastPinchDist !== null) {
      event.preventDefault(); // Prevent scrolling/zooming the page
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
  
      // Calculate zoom factor
      const zoomChange = newDist / lastPinchDist
      let newZoom = appState.zoom * zoomChange
      newZoom = Math.max(0.1, Math.min(newZoom, 10)); // Clamp zoom
  
      // Optionally, use the midpoint between the two touches as the zoom center
      let midX = (event.touches[0].clientX + event.touches[1].clientX) / 2
      let midY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      const rect = sketch.getBoundingClientRect()
      midX -= rect.left
      midY -= rect.top

      // Call your zoom utility (update origin if you want zoom-to-point)
      utils.setZoom(newZoom, appState, domRefs, { offsetX: midX, offsetY: midY })

      lastPinchDist = newDist
    }
  }, { passive: false })
  
  sketch.addEventListener('touchend', (event) => {
    if (event.touches.length < 2) {
      lastPinchDist = null
    }
  })

  domRefs.okButton.addEventListener("click", () => {
    // Button to accept text input for editing one element or replacing the entire drawing.
    // See utils.toolInputScope for the meaning of each scope.
    if (!domRefs.okButton.classList.contains('visible')) { return } // OK button is not active
    try {
      acceptInput(domRefs.okButton.dataset.scope)
    } catch (error) {
      // E.g., a source line Sketch can't parse. Show it to the user, not just the
      // console, and leave the input box open so they can fix it.
      alert(error.message)
    }
  })

  const acceptInput = scope => {
    if (scope === "all") {
      // OK button for batch input of multiple lines
      const input = text.getInputBoxText(domRefs.inputBox)
      const newDwg = parseDwg(input, dwg.maxId)
      dwgMgr.clearChildren(dwg)
      dwgMgr.adoptParsed(dwg, newDwg.children[2].children[0].children)
      applyMeta(newDwg.meta, appState, domRefs, dwg)
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
    } else if (Number(scope) === 0 || Number(scope) === 2) {
      // OK button for editing a single selected element:
      // the text of a clicked text element (0) or the element's source (2)
      if (appState.selection.length > 1) {
        throw new Error("Edit | Edit… can only edit one element at a time.")
      } else if (appState.selection.length === 0) {
        throw new Error("Select one element before editing.")
      }
      const el = appState.selection[0];
      const str = text.getInputBoxText(domRefs.inputBox)
      const newEl = Number(scope) === 0
        ? text.replaceText(str, el, appState.scaleFactor)
        : parseLine(str, { ...appState }) // A copy, so the source's style statements don't stick
      if (!newEl) { throw new Error("Sketch can't read this line:\n" + str.trim()) }
      dwgMgr.swapChild(dwg, el.attrs.id, newEl)
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
      domRefs.okButton.classList.remove('visible')
      domRefs.cancelButton.classList.remove('visible')
    } else if (scope === "array") {
      // OK button for array tool
      const arraySpecStr = text.getInputBoxText(domRefs.inputBox)
      if (arraySpecStr.trim() === "" || !arraySpecStr.includes('@')) {
        alert("Array: enter nx, ny @ Δx, Δy in the text box before clicking OK.")
        return
      }
      const [numCopiesStr, deltaStr] = arraySpecStr.split('@').map(s => s.trim())
      if (!numCopiesStr || !deltaStr) {
        alert("Array: enter nx, ny @ Δx, Δy in the text box before clicking OK.")
      } else {
        const [nx, ny] = numCopiesStr.split(numberSeparatorRegEx).map(s => parseInt(s.trim()))
        const [dx, dy] = deltaStr.split(numberSeparatorRegEx).map(s => utils.readLength(s, appState))
        if (isNaN(nx) || isNaN(ny) || isNaN(dx) || isNaN(dy)) {
          alert("Array: enter valid numbers for nx, ny, Δx, and Δy.")
        } else {
          // Perform the array operation. Loop copy by copy, so that each copy
          // of a group is contiguous and gets its own new group number.
          const selected = dwgMgr.getChildren(dwg).filter(el => appState.selection.includes(el))
          for (let i = 0; i <= nx; i++) {
            for (let j = 0; j <= ny; j++) {
              if (i === 0 && j === 0) continue; // Skip the original element
              const groupIdMap = {}
              selected.forEach(el => {
                let clone
                if (el.tag === 'text') {
                  clone = text.moveText(el.text, el, i * dx, j * dy, appState.scaleFactor)
                } else {
                  const { newAttrs, newPoints } = translateVirtualElement(el, i * dx, j * dy)
                  clone = structuredClone(el)
                  delete clone?.segments
                  clone.attrs = { ...(clone.attrs || {}), ...newAttrs }
                  if (newPoints) clone.points = newPoints
                }
                utils.pushDuplicate(dwg, dwgMgr, clone, groupIdMap)
              })
            }
          }
          recordHistory(null, dwg)
          rebuildIntersectPoints(dwg)
        }
      }
    } else {
      throw new Error(`Unknown OK button scope: ${scope}`)
    }
    utils.closeInputBox(appState, domRefs)
  }

  domRefs.cancelButton.addEventListener("click", () => utils.closeInputBox(appState, domRefs))

  // Event listeners for the sketch canvas. Invoke the event loop above.
  sketch.addEventListener( "pointerdown", eventLoop)
  sketch.parentElement.addEventListener("pointermove", eventLoop)
  sketch.addEventListener('mouseenter', () => { sketch.focus() })
  // The window and document listeners also hear events meant for Hurmet's editor
  // while the Sketch dialog is closed, so they act only while Sketch is showing.
  window.addEventListener("pointerup", (event) => {
    if (!isSketchActive()) { return }
    // A click on a tool, snap, or lock button is not the next point of an
    // in-progress element. Its pointerup arrives before its click event.
    if (event.target.closest?.('#tool-form, #snap-form, #lock-form')) { return }
    eventLoop(event)
  })
  document.addEventListener("keydown", (event) => {
    if (isSketchActive()) { eventLoop(event) }
  })
  // Tell the event loop about a tool switch made by clicking a tool button,
  // so that an in-progress operation is cancelled, as a tool shortcut key
  // does. The capture listener runs before the button's own handler in
  // menuListeners.js and the bubble listener runs after it.
  const toolForm = document.getElementById('tool-form')
  let toolBeforeClick = appState.tool
  toolForm.addEventListener("click", () => { toolBeforeClick = appState.tool }, true)
  toolForm.addEventListener("click", (event) => {
    if (event.target.closest('.palette-btn') && appState.tool !== toolBeforeClick) {
      eventLoop({ type: 'toolswitch', target: null })
    }
  })
  // Ctrl+C, Ctrl+X, Ctrl+V. Handled as their own listeners (rather than inside
  // menuListeners.handleKeyDown, which only sees `keydown` events) because
  // the clipboard data only comes with the browser's copy/cut/paste events.
  // The listeners are on `document`, so leave the event alone while Sketch is
  // hidden (inside Hurmet, Sketch is a dialog) or a text field other than the
  // input box has focus, e.g. in the Sketch Properties dialog. The input box
  // often keeps focus after a measurement is typed, since the canvas can't take focus.
  const isTextField = el => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  const wantsClipboardEvent = () => {
    const el = document.activeElement
    return isSketchActive() && !(el !== domRefs.inputBox && isTextField(el))
  }

  // Copy and Cut write the selected shapes. Selected text, e.g. in the input box, is copied as usual.
  const copySelection = event => {
    if (!wantsClipboardEvent() || String(window.getSelection()) !== '') { return false }
    const payload = clipboard.buildPayload(appState, dwg)
    if (!payload) { return false }
    event.clipboardData.setData('text/plain', payload)
    event.preventDefault()
    return true
  }
  // The second half of a Cut: delete what was copied, as one undo step.
  const deleteCopied = () => {
    eventLoop({ type: 'toolswitch', target: null }) // Cancel an operation in progress.
    selectedUnits(appState, dwgMgr.getChildren(dwg)).forEach(el => dwgMgr.removeChild(dwg, el.attrs.id))
    clearTempAndSelection(appState, domRefs, dwg)
    dwgMgr.popRubberBand(dwg, appState)
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
  }
  document.addEventListener('copy', copySelection)
  document.addEventListener('cut', (event) => {
    if (copySelection(event)) { deleteCopied() }
  })

  // Paste shapes that Sketch copied: attach them to the cursor, as if picked
  // from a shape library. The next click places them (see clickTools.js).
  const armPaste = armed => {
    eventLoop({ type: 'toolswitch', target: null }) // Cancel an operation in progress.
    document.querySelector('#tool-form .palette-btn[data-tool="select"]').click() // Reset, as Escape does.
    appState.tool = 'paste'
    document.querySelectorAll('#tool-form .palette-btn').forEach(b => b.classList.remove('active'))
    domRefs.canvas.style.cursor = 'crosshair'
    clearTempAndSelection(appState, domRefs, dwg)
    shapeLibrary.setArmedShape(armed.entry, armed.unit)
    shapePreview.show(dwg, appState)
  }

  // Ctrl+V: paste shapes or an image from the clipboard.
  document.addEventListener('paste', (event) => {
    if (!wantsClipboardEvent()) { return }
    const armed = clipboard.readPayload(event.clipboardData && event.clipboardData.getData('text/plain'))
    if (armed) {
      event.preventDefault()
      armPaste(armed)
      return
    }
    if (document.activeElement === domRefs.inputBox) {
      // The input box is a contenteditable, so a normal paste would bring in
      // the clipboard's HTML (e.g. a copied URL arrives as an <a> link).
      // Insert only the plain text. execCommand is deprecated but universally
      // supported, and unlike a direct DOM edit it keeps the caret in place.
      event.preventDefault()
      const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
      if (text) { document.execCommand('insertText', false, text) }
      return
    }
    const items = event.clipboardData && event.clipboardData.items
    if (!items) { return }
    const imageItem = Array.from(items).find(item => image.ALLOWED_MIME_TYPES.has(item.type))
    if (!imageItem) { return } // No image on the clipboard; let the default paste behavior proceed.
    event.preventDefault()
    const file = imageItem.getAsFile()
    const reader = new FileReader()
    reader.onload = () => {
      image.createFromDataUrl(reader.result, appState, dwg).then(element => {
        if (element) {
          recordHistory(element, dwg)
          rebuildIntersectPoints(dwg)
        }
      })
    }
    reader.readAsDataURL(file)
  })
  // Edit | Cut, Copy, and Paste. A button click can't use the clipboard
  // events above, so these use navigator.clipboard. Writing needs no
  // permission, but reading brings up the browser's clipboard prompt, which
  // Ctrl+V avoids. The buttons are there so that users can find the feature.
  const editMenuButton = name => document.querySelector(`#edit-menu .menu-btn[data-menu="${name}"]`)
  const copyFromMenu = verb => {
    const payload = clipboard.buildPayload(appState, dwg)
    if (!payload) {
      alert(`${verb}: select one or more shapes first.`)
      return Promise.resolve(false)
    }
    if (!navigator.clipboard) {
      alert(`${verb}: this browser won't let Sketch use the clipboard from a menu. Press Ctrl+${verb === 'Cut' ? 'X' : 'C'} instead.`)
      return Promise.resolve(false)
    }
    return navigator.clipboard.writeText(payload).then(() => true, () => {
      alert(`${verb}: the browser didn't allow Sketch to use the clipboard. Press Ctrl+${verb === 'Cut' ? 'X' : 'C'} instead.`)
      return false
    })
  }
  editMenuButton('copy').addEventListener('click', () => { copyFromMenu('Copy') })
  editMenuButton('cut').addEventListener('click', () => {
    // Delete only after the copy succeeds, so a failed copy never loses shapes.
    copyFromMenu('Cut').then(copied => { if (copied) { deleteCopied() } })
  })
  editMenuButton('paste').addEventListener('click', () => {
    const refused = () => alert("Paste: the browser didn't allow Sketch to read the clipboard. Press Ctrl+V instead.")
    if (!navigator.clipboard || !navigator.clipboard.readText) { refused(); return }
    navigator.clipboard.readText().then(str => {
      const armed = clipboard.readPayload(str)
      if (armed) {
        armPaste(armed)
      } else {
        alert("Paste: the clipboard has no shapes copied from a sketch. To paste an image, press Ctrl+V.")
      }
    }, refused)
  })

  // See menuListeners.js for the menu and palette event listeners.
  menuListeners.init(document, appState, domRefs, dwg)
}

// Hurmet opens Sketch as a modal dialog. See SketchView in ../nodeviews.js.
let dialog = null
let closeCallback = null // Given the sketch's source on Close.

// Cancel any operation in progress and clear the selection and the input box.
const settle = () => {
  eventLoop({ type: 'toolswitch', target: null })
  dwgMgr.popRubberBand(dwg, appState)
  clearTempAndSelection(appState, domRefs, dwg)
  utils.closeInputBox(appState, domRefs)
}

// Replace the drawing with the one written in `source`, as Edit source does, but
// also start a fresh undo history and view the sketch at zoom 1 from its scene origin.
const loadSource = source => {
  const newDwg = parseDwg(source, 0) // Parse first: if it throws, the drawing is untouched.
  settle()
  document.querySelector('#tool-form .palette-btn[data-tool="select"]').click()
  dwgMgr.clearChildren(dwg)
  dwg.maxId = 0
  dwgMgr.adoptParsed(dwg, newDwg.children[2].children[0].children)
  // NaN differs from every origin, so applyMeta moves the view to the scene origin.
  appState.sceneOriginX = NaN
  appState.sceneOriginY = NaN
  appState.zoom = 1
  applyMeta(newDwg.meta, appState, domRefs, dwg)
  zoomStack.length = 0
  zoomStack.push({ zoom: 1, deltaOriginX: appState.deltaOriginX, deltaOriginY: appState.deltaOriginY })
  resetHistory(dwg)
  rebuildIntersectPoints(dwg)
}

// Close the dialog. With `keep` (the Close button), pass the sketch's source to the
// callback, with `frame` and `scene` fitted to the drawing. An empty sketch gives "".
// Without it (the Cancel button), the changes are discarded and the callback gets null.
const closeSketch = keep => {
  settle()
  let source = null
  if (keep) {
    source = ""
    // computeFrame measures the rendered drawing, so it runs before the dialog closes.
    const frame = utils.computeFrame(appState, domRefs)
    if (frame) {
      source = stringify({ ...appState, ...sceneHeaderOf(appState), ...frame }, dwg)
    }
  }
  const callback = closeCallback
  closeCallback = null
  dialog.close()
  if (callback) { callback(source) }
}

const createDialog = () => {
  const style = document.createElement('style')
  style.textContent = sketchCss
  document.head.appendChild(style)
  dialog = document.createElement('dialog')
  dialog.id = 'sketch-dialog'
  dialog.innerHTML = sketchHtml
  document.body.appendChild(dialog)
  // Esc is the Select tool's key, so it must not close the dialog.
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault() }
  })
  dialog.addEventListener('cancel', event => event.preventDefault())
  // If the browser closes the dialog anyway, treat it as Cancel.
  // The close event arrives asynchronously, so the dialog may have been reopened
  // since. Its callback then belongs to the new session.
  dialog.addEventListener('close', () => {
    if (dialog.open) { return }
    const callback = closeCallback
    closeCallback = null
    if (callback) { callback(null) }
  })
  const mainMenuButton = name => dialog.querySelector(`#main-menu .menu-btn[data-menu="${name}"]`)
  mainMenuButton('close').addEventListener('click', () => closeSketch(true))
  mainMenuButton('cancel').addEventListener('click', () => closeSketch(false))
}

// Open the Sketch dialog on the drawing written in `source` ("" for a new sketch).
// On Close, `callback` gets the new source, or "" if the sketch is empty.
// On Cancel, it gets null.
const openSketch = (source, callback) => {
  const isFirstOpen = !dialog
  if (isFirstOpen) { createDialog() }
  dialog.showModal() // Before init, so that the canvas has a size.
  if (isFirstOpen) { init(document.getElementById('sketch')) }
  try {
    loadSource(source)
  } catch (error) {
    dialog.close()
    alert("Sketch can't open this sketch:\n" + error.message)
    return
  }
  closeCallback = callback
}

export { init, openSketch }
