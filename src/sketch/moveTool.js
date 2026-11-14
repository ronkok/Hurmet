import { adjustForSnapAndLock, rebuildIntersectPoints } from './snap.js'
import { dwgMgr } from './dwg.js'
import { text } from './text.js'
import { recordHistory } from './history.js'
import { utils } from './utils.js'
import { resizeHandle } from './resizeHandle.js'
import { freehandPathD } from './freehandMath.js'
import { ellipseTransform } from './elementObject.js'

const PREVIEW_OPACITY = 0.55

function rafThrottleLatest(fn) {
  let scheduled = false
  let latestArgs = null
  return (...args) => {
    latestArgs = args
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      fn(...latestArgs)
    })
  }
}

function toNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export const translatePathD = (dString, dx, dy) => {
  // This is a simplified handling that assumes only absolute coordinates for lines and arcs.
  const d = dString.trim().split(/(?=[MLAZ])/)
  const newD = d.map(cmd => {
    const type = cmd[0];
    if (type === 'Z') { return cmd } // closepath
    const coords = cmd.slice(1).trim().split(/[,\s]+/).map(Number)
    if (type === 'A') {
      // Arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
      coords[5] += dx;
      coords[6] += dy;
    } else {
      for (let i = 0; i < coords.length; i += 2) {
        coords[i] += dx;
        coords[i + 1] += dy;
      }
    }
    return type + ' ' + coords.join(' ')
  })
  return newD.join(' ')
}

export function translateVirtualElement(el, dx, dy) {
  const a = el.attrs || {}
  const newAttrs = Object.create(null)
  let newPoints = null
  let newModelPoint = null

  switch (el.tag) {
    case 'line': {
      const x1 = toNum(a.x1), y1 = toNum(a.y1), x2 = toNum(a.x2), y2 = toNum(a.y2)
      if (x1 === null || y1 === null || x2 === null || y2 === null) break
      newAttrs.x1 = x1 + dx
      newAttrs.y1 = y1 + dy
      newAttrs.x2 = x2 + dx
      newAttrs.y2 = y2 + dy
      break
    }
    case 'rect':
    case 'image': {
      const x = toNum(a.x), y = toNum(a.y)
      if (x === null || y === null) break
      newAttrs.x = x + dx
      newAttrs.y = y + dy
      break
    }
    case 'circle': {
      const cx = toNum(a.cx), cy = toNum(a.cy)
      if (cx === null || cy === null) break
      newAttrs.cx = cx + dx
      newAttrs.cy = cy + dy
      break
    }
    case 'ellipse': {
      const cx = toNum(a.cx), cy = toNum(a.cy)
      if (cx === null || cy === null) break
      newAttrs.cx = cx + dx
      newAttrs.cy = cy + dy
      // The rotate() transform bakes in cx, cy as its pivot, so it must be
      // recomputed at the new center or a rotated ellipse would drift.
      newAttrs.transform = ellipseTransform(newAttrs.cx, newAttrs.cy, el.angle || 0)
      break
    }
    case 'text': {
      const x = toNum(a.x), y = toNum(a.y)
      if (x === null || y === null) break
      newAttrs.x = x + dx
      newAttrs.y = y - dy // SVG y-axis is flipped relative to model space — see text.js's moveText
      if (el.modelPoint) {
        newModelPoint = { x: el.modelPoint.x + dx, y: el.modelPoint.y + dy }
      }
      break
    }
    case 'polygon': {
      newPoints = el.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }))
      newAttrs.points = newPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
      break
    }
    case 'path': {
      if (a['data-freehand']) {
        // translatePathD only understands L/A commands — a freehand path's
        // 'd' is all cubic Beziers, so rebuild it from the translated points
        // instead of shifting the 'd' string in place.
        newPoints = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        newAttrs.d = freehandPathD(newPoints)
        break
      }
      newAttrs.d = translatePathD(a.d, dx, dy)
      // Preserve any extra point props (e.g., r)
      newPoints = el.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }))
      newAttrs.points = newPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
      break
    }
    default: {
      // Extend here if you add more element types (e.g., path).
      break
    }
  }

  return { newAttrs, newPoints, newModelPoint }
}

function clearSelectedForIds(dwg, ids) {
  for (const id of ids) {
    const dom = dwgMgr.getDomChildById(dwg, id)
    if (dom) dom.classList.remove('selected')
  }
}

function addSelectedForIds(dwg, ids) {
  for (const id of ids) {
    const dom = dwgMgr.getDomChildById(dwg, id)
    if (dom) dom.classList.add('selected')
  }
}

function ensureState(appState) {
  if (!appState._moveState) {
    appState._moveState = {
      mode: null, // 'move' | 'duplicate'
      startPoint: null,
      previewGroup: null,
      hiddenDomNodes: [],
      dx: 0,
      dy: 0,
      updatePreviewThrottled: null
    }
  }
  return appState._moveState
}

function cleanup(appState, dwg) {
  const st = appState._moveState
  if (!st) return

  for (const node of st.hiddenDomNodes) {
    if (node) node.style.visibility = ''
  }
  st.hiddenDomNodes = []

  dwgMgr.clearTempElements(dwg)

  st.mode = null
  st.startPoint = null
  st.previewGroup = null
  st.dx = 0
  st.dy = 0
  st.updatePreviewThrottled = null
}

const moveSelection = (dwg, domRefs, appState, dx, dy) => {
  const groupIdMap = {}
  const newSelection = [];
  for (const selEl of appState.selection) {
    const id = selEl?.attrs?.id
    if (id == null) continue
    const el = dwgMgr.getChildById(dwg, id)
    if (!el) continue
    if (el.tag === 'text') {
      const newTextElement = text.moveText(el.text, el, dx, dy, appState.scaleFactor)
      if (appState.duplicateOnMove) {
        utils.pushDuplicate(dwg, dwgMgr, newTextElement, groupIdMap)
        newSelection.push(newTextElement)
      } else {
        dwgMgr.reviseAttributesOfChild(dwg, id, newTextElement.attrs, null, {
          text: newTextElement.text,
          position: newTextElement.position,
          modelPoint: newTextElement.modelPoint,
          boundingBox: newTextElement.boundingBox
        })
      }
    } else {
      const { newAttrs, newPoints } = translateVirtualElement(el, dx, dy)
      if (appState.duplicateOnMove) {
        const clone = structuredClone(el)
        delete clone?.segments
        clone.attrs = { ...(clone.attrs || {}), ...newAttrs }
        if (newPoints) clone.points = newPoints
        utils.pushDuplicate(dwg, dwgMgr, clone, groupIdMap)
        newSelection.push(clone)
      } else {
        if (Object.keys(newAttrs).length > 0 || newPoints) {
          dwgMgr.reviseAttributesOfChild(dwg, id, newAttrs, newPoints)
        }
      }
    }
  }
  if (appState.duplicateOnMove) {
    utils.updateSelection(newSelection, appState, domRefs)
  }
}

export const moveTool = Object.freeze({
  start(event, appState, dwg, mode) {
    const st = ensureState(appState)
    cleanup(appState, dwg)

    st.mode = mode
    st.startPoint = adjustForSnapAndLock(event, appState, dwg)

    const previewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    previewGroup.setAttribute('data-tool-preview', mode)
    previewGroup.style.pointerEvents = 'none'
    st.previewGroup = previewGroup
    dwg.model.children[1].appendChild(previewGroup)

    // Clone selected DOM nodes into a temporary-layer preview group. Grabbing
    // this selection to move it also clears any resize corner marks it was
    // showing (see cleanup() above) — they're redrawn at the new position
    // once the move finishes (resizeHandle.refresh() in finalize()).
    for (const selEl of appState.selection) {
      const id = selEl?.attrs?.id
      if (id == null) continue

      const dom = dwgMgr.getDomChildById(dwg, id)
      if (!dom) continue

      const clone = dom.cloneNode(true)
      // Prevent id collisions in querySelector('[data-id=...]')
      clone.removeAttribute('data-id')
      clone.setAttribute('data-preview-id', String(id))
      clone.style.opacity = String(PREVIEW_OPACITY)
      clone.style.pointerEvents = 'none'
      previewGroup.appendChild(clone)

      if (mode === 'move') {
        dom.style.visibility = 'hidden'
        st.hiddenDomNodes.push(dom)
      }
    }

    st.updatePreviewThrottled = rafThrottleLatest((dx, dy) => {
      if (!st.previewGroup) return
      st.previewGroup.setAttribute('transform', `translate(${dx},${dy})`)
    })
  },

  update(event, appState, dwg, domRefs) {
    const st = appState._moveState
    if (!st?.startPoint || !st?.updatePreviewThrottled) return

    const p = adjustForSnapAndLock(event, appState, dwg)
    const dx = p.x - st.startPoint.x
    const dy = p.y - st.startPoint.y
    st.dx = dx
    st.dy = dy

    st.updatePreviewThrottled(dx, dy)
    utils.updateLocalCoords(domRefs, st.startPoint, p, appState)
  },

  finalize(event, appState, dwg, domRefs) {
    utils.clearLocalCoords(domRefs)
    if (appState.selection.length === 0) {
      cleanup(appState, dwg)
      return
    }
    const st = appState._moveState
    if (!st?.startPoint) return false

    const end = adjustForSnapAndLock(event, appState, dwg)
    const dx = end.x - st.startPoint.x
    const dy = end.y - st.startPoint.y

    if (dx === 0 && dy === 0) {
      cleanup(appState, dwg)
      return true
    }

    moveSelection(dwg, domRefs, appState, dx, dy)
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
    cleanup(appState, dwg)
    resizeHandle.refresh(appState, dwg)
    return false
  },

  moveByWrittenMeasurement(appState, dwg, domRefs, dx, dy) {
    if (appState.selection.length === 0) return
    moveSelection(dwg, domRefs, appState, dx, dy)
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
    resizeHandle.refresh(appState, dwg)
  },

  cancel(domRefs, dwg, appState) {
    // matches handleKeyDown patterns (extra args are harmless)
    utils.clearLocalCoords(domRefs)
    cleanup(appState, dwg)
    if (domRefs?.canvas) domRefs.canvas.style.cursor = 'default'
  }
})
