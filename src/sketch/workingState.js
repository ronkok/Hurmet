import { dwgMgr } from './dwg.js'
import { utils } from './utils.js'

// Reset everything a new drawing/editing operation shouldn't inherit from
// whatever was active before: the temporary layer (dimension points, trim
// reference line, resize handles), the current selection (both
// appState.selection and the DOM 'selected' classes), the local-coordinate
// readout, and the trim tool's in-progress reference line. Called when
// switching to a tool that starts a fresh operation (see
// toolsThatClearWorkingState in menuListeners.js) and on Delete.
// It lives here rather than in utils.js so that utils.js need not import dwg.js.
export const clearTempAndSelection = (appState, domRefs, dwg) => {
  dwgMgr.clearTempElements(dwg)
  utils.updateSelection([], appState, domRefs)
  utils.clearLocalCoords(domRefs)
  appState.referenceLine = null
}
