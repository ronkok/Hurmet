// snapMarker.js

// A gray dot at the point an End, Mid, Center, Nearest, or Intersect snap has
// found, so the user can see where the next click will land, even before the
// first click of a tool, when there is no rubber band to show it. Like
// singleClickPreview.js, it is a real SVG element appended to the
// temporary-layer, but not tracked in dwg.children[2].children[1], so it never
// becomes dwgMgr.getTemp() or one of the dimension tool's blue dots.

import { createSvgElement } from './dwg.js'
import { getSnapHit } from './snap.js'

// Tools whose clicks place points. Tools whose clicks pick an element are left out.
const eligibleTools = new Set([
  'line', 'rect', 'oval', 'polygon', 'polyline', 'arrow', 'arc', 'dimension', 'text',
  'measure', 'move', 'duplicate', 'rotate', 'mirror', 'resize', 'library', 'image'
])

let markerNode = null

const removeMarker = () => {
  if (markerNode) { markerNode.remove() }
  markerNode = null
}

export const snapMarker = Object.freeze({
  // Call right after adjustForSnapAndLock(), whose snap hit this shows.
  update(appState, dwg) {
    const hit = getSnapHit()
    if (!hit || !eligibleTools.has(appState.tool)) {
      removeMarker()
      return
    }
    const r = 3 / (appState.scaleFactor * appState.zoom)
    // clearTempElements() empties the temporary-layer, which detaches the node.
    if (!markerNode || !markerNode.isConnected) {
      markerNode = createSvgElement({
        tag: 'circle',
        attrs: { cx: hit.x, cy: hit.y, r, fill: 'gray', stroke: 'none' }
      })
      markerNode.setAttribute('data-snap-marker', '')
      markerNode.style.pointerEvents = 'none'
      // First child, so blue dimension dots and resize handles draw over it.
      dwg.model.children[1].prepend(markerNode)
    } else {
      markerNode.setAttribute('cx', hit.x)
      markerNode.setAttribute('cy', hit.y)
      markerNode.setAttribute('r', r)
    }
  },

  hide: removeMarker
})
