import { adjustForModel } from './snap.js'
import { utils } from './utils.js'

// The bottom-left corner of the visible canvas is at model point
// (-deltaOriginX, -deltaOriginY). With Grid Snap on, round the origin so
// that corner lands on a grid point.
const snapOriginToGrid = appState => {
  if (appState.snap !== 'grid') { return }
  const gridSize = appState.gridSize
  appState.deltaOriginX = Math.round(appState.deltaOriginX / gridSize) * gridSize
  appState.deltaOriginY = Math.round(appState.deltaOriginY / gridSize) * gridSize
}

export const pan = {
  startPan(event, appState, dwg) {
    appState.panRevertPoint = { x: appState.deltaOriginX, y: appState.deltaOriginY }
    const modelPoint = adjustForModel(event, appState, dwg)
    appState.panStart = { x: modelPoint.x, y: modelPoint.y }
  },
  move(event, appState, domRefs, dwg) {
    const modelPoint = adjustForModel(event, appState, dwg)
    const dx = (modelPoint.x - appState.panStart.x)
    const dy = (modelPoint.y - appState.panStart.y)
    appState.deltaOriginX += dx
    appState.deltaOriginY += dy
    snapOriginToGrid(appState)
    utils.redrawCanvas(appState, domRefs)
  },
  finalize(event, appState, domRefs, dwg) {
    const modelPoint = adjustForModel(event, appState, dwg)
    const dx = (modelPoint.x - appState.panStart.x)
    const dy = (modelPoint.y - appState.panStart.y)
    appState.deltaOriginX += dx
    appState.deltaOriginY += dy
    snapOriginToGrid(appState)
    utils.redrawCanvas(appState, domRefs)
    appState.panStart = null
  },
  cancel(domRefs, dwg, appState) {
    domRefs.canvas.style.cursor = 'default'
    // Revert to original position
    appState.deltaOriginX = appState.panRevertPoint.x
    appState.deltaOriginY = appState.panRevertPoint.y
    utils.redrawCanvas(appState, domRefs)
    appState.panStart = null
    appState.panRevertPoint = null
  }
}
