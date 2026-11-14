import { defaultAppState } from './appState.js'
import { dwgMgr } from './dwg.js'
import { parseDwg } from './parse.js'
import { stringifyElement, stringify } from './stringify.js'
import { utils } from './utils.js'
import { groups } from './groups.js'
import { gridAxes } from './gridAxes.js'

const maxHistory = 100
let at = -1
const history = [];
// historyIds[i] lists the element ids, in drawing order, of snapshot history[i].
// The source text can't carry ids, so without this an undo would give every
// element a new id, and the selection would no longer point at anything.
const historyIds = [];
let previousAppState = structuredClone(defaultAppState)
// The lowest snapshot an undo may return to. When Sketch opens an existing sketch,
// its starting state is snapshot 0, and undo must not go back past it to a blank drawing.
let floor = -1

// The sketch-wide properties written at the head of each snapshot.
const headerKeys = ['title', 'caption', 'position', 'roundingSpec', 'fraction', 'backdrop',
  'frameWidth', 'frameHeight', 'scale', 'unit', 'deltaOriginX', 'deltaOriginY']
const headerOf = state => Object.fromEntries(headerKeys.map(key => [key, state[key]]))
// The header for the next whole-drawing snapshot. Kept up to date by
// applyMeta, since recordHistory isn't given appState.
let header = headerOf(defaultAppState)

// Make the sketch-wide properties in `meta` (a parsed dwg's meta, or any
// object with the header keys) the current ones.
// In `meta`, deltaOriginX and deltaOriginY are the `scene` statement's origin
// offset, which is kept in appState.sceneOriginX and sceneOriginY. In appState,
// deltaOriginX and deltaOriginY are the current view, which Pan and Zoom change
// without writing history. So the view moves only when the scene origin
// changes, as by Edit Source or by an undo or redo across one.
export function applyMeta(meta, appState, domRefs, dwg) {
  const { deltaOriginX, deltaOriginY, ...rest } = headerOf(meta)
  Object.assign(appState, rest)
  if (deltaOriginX !== appState.sceneOriginX || deltaOriginY !== appState.sceneOriginY) {
    appState.sceneOriginX = appState.deltaOriginX = deltaOriginX
    appState.sceneOriginY = appState.deltaOriginY = deltaOriginY
  }
  appState.scaleFactor = appState.scale * utils.unitScaleFactors[appState.unit]
  dwg.children[0].attrs.text = appState.title
  domRefs.canvas.children[0].textContent = appState.title
  domRefs.canvas.style.setProperty('--scale', appState.scaleFactor)
  utils.redrawCanvas(appState, domRefs)
  // Grid and axes fill the frame, so redraw them whenever the header changes.
  gridAxes.render(appState, domRefs)
  header = sceneHeaderOf(appState)
}

// appState's header properties, with the scene origin rather than the view's.
// Use it wherever appState is written out as source.
export const sceneHeaderOf = appState => ({
  ...headerOf(appState),
  deltaOriginX: appState.sceneOriginX,
  deltaOriginY: appState.sceneOriginY
})

export function handleUndoRedo(action, dwg, appState, domRefs) {
  if (action === 'redo' && at + 1 >= history.length) { return } // Nothing to redo
  if (action === 'undo' && at - 1 < floor) { return } // Nothing to undo
  if (action === 'undo') { at-- } else if (action === 'redo') { at++ }
  const snapshot = history[at];
  const selectedIds = new Set(appState.selection.map(el => String(el.attrs.id)))
  if (snapshot) {
    const newDwg = parseDwg(snapshot, 0)
    const elements = newDwg.children[2].children[0].children
    let ids = historyIds[at]
    if (ids && ids.length !== elements.length) {
      console.warn(`Undo: ${ids.length} recorded ids for ${elements.length} elements; ids not restored.`)
      ids = null
    }
    dwgMgr.clearChildren(dwg)
    dwgMgr.adoptParsed(dwg, elements, false, ids)
    applyMeta(newDwg.meta, appState, domRefs, dwg)
  } else {
    // Undone back to the start
    dwgMgr.clearChildren(dwg)
    applyMeta(defaultAppState, appState, domRefs, dwg)
  }
  if (action === 'undo' && at < 0) {
    at = -1 // Reset to initial state
  }
  // The rebuild replaced every element object, so point the selection at the
  // new objects. Selected elements that the undo/redo removed drop out.
  const reselected = dwgMgr.getChildren(dwg).filter(el => selectedIds.has(String(el.attrs.id)))
  utils.updateSelection(reselected, appState, domRefs)
}

export function recordHistory(element, dwg) {
  at += 1
  let snapshot = ""
  let ids = null
  if (element && at > 0) {
    // Append an element to the previous snapshot
    snapshot = history[at - 1] + stringifyElement(element, previousAppState)
    ids = historyIds[at - 1] && [...historyIds[at - 1], element.attrs.id]
  } else if (dwg) {
    // Create a snapshot from the whole drawing
    const broken = groups.findBrokenGroups(dwgMgr.getChildren(dwg))
    if (broken.length > 0) {
      console.warn(`Group members aren't contiguous for group(s) ${broken.join(', ')}.`)
    }
    previousAppState = structuredClone(defaultAppState)
    snapshot = stringify(header, dwg, previousAppState)
    ids = dwgMgr.getChildren(dwg).map(el => el.attrs.id)
  } else {
    // We should never reach here
    alert("recordHistory called without element or dwg")
    return
  }
  
  // Note that the stringify function has also updated previousAppState.

  history[at] = snapshot  // Append the new snapshot
  historyIds[at] = ids
  history.splice(at + 1)  // Discard the redo stack
  historyIds.splice(at + 1)

  if (at > maxHistory) {
    at = maxHistory
    history.splice(0, 1)
    historyIds.splice(0, 1)
  }
}

// Start a fresh history, as when Sketch opens a sketch. Call it after applyMeta has
// applied the sketch's header. The drawing as opened becomes snapshot 0, the floor for undo.
export function resetHistory(dwg) {
  at = -1
  history.length = 0
  historyIds.length = 0
  previousAppState = structuredClone(defaultAppState)
  recordHistory(null, dwg)
  floor = 0
}
