import { dwgMgr } from './dwg.js'
import { clearTempAndSelection } from './workingState.js'
import { utils } from './utils.js'
import { text } from './text.js'
import { stringify, stringifyElement } from './stringify.js'
import { recordHistory, handleUndoRedo, sceneHeaderOf } from './history.js'
import { rebuildIntersectPoints } from './snap.js'
import { shapeLibrary } from './shapeLibrary.js'
import { path, ellipseTransform } from './elementObject.js'
import { freehandPathD } from './freehandMath.js'
import { groups } from './groups.js'
import { projectIsometric } from './isometric.js'
import { scaleR, pathRows } from './arcStep.js'
import { sketchProperties } from './sketchProperties.js'

// Handle menu choices

// First, some helpers

// The selected elements, each widened to everything in its outermost group,
// in array order. Normally a selection is already whole groups, but the text
// of a dimension or arrow can be selected alone; this pulls in the rest of it.
export const selectedUnits = (appState, kids) => {
  const selectedIds = new Set(appState.selection.map(el => String(el.attrs.id)))
  const outerGroups = new Set()
  kids.forEach(el => {
    if (selectedIds.has(String(el.attrs.id)) && groups.isGrouped(el)) {
      outerGroups.add(groups.outermostGroup(el))
    }
  })
  return kids.filter(el => selectedIds.has(String(el.attrs.id)) ||
                           outerGroups.has(groups.outermostGroup(el)))
}

export const zoomStack = [{ zoom: 1, deltaOriginX: 0, deltaOriginY: 0 }]

// A throwaway stand-in for appState, passed to elementObject.js's path()
// helper when only its computed `d` string is wanted (see scaleElement) —
// the stroke/fill attrs it also builds are discarded.
const pathBuilderStub = { stroke: 'none', strokewidth: 1, fill: 'none', pattern: 'solid' }

const zoomToFit = (domRefs, bbox, appState) => {
  // Zoom and pan to fit the specified bounding box (in SVG coordinates) within the viewport.
  if (!(bbox.width > 0 || bbox.height > 0)) { return } // A lone point has no extent to fit
  const viewWidth = domRefs.canvas.clientWidth
  const viewHeight = domRefs.canvas.clientHeight
  const scaleX = viewWidth / bbox.width
  const scaleY = viewHeight / bbox.height
  // S is screen pixels per model unit, i.e. scaleFactor * zoom.
  const S = Math.min(scaleX, scaleY) * 0.9 // Add some padding around the edges
  const scale = S / appState.scaleFactor
  const centerX = bbox.x + bbox.width / 2
  const centerY = bbox.y + bbox.height / 2
  const deltaOriginX = viewWidth / (2 * S) - centerX
  const deltaOriginY = viewHeight / (2 * S) - centerY
  appState.zoom = scale
  appState.deltaOriginX = deltaOriginX
  appState.deltaOriginY = deltaOriginY
  utils.redrawCanvas(appState, domRefs)
  zoomStack.push({ zoom: scale, deltaOriginX, deltaOriginY })
}

export const getSelectionBoundingBox = (selection, dwg) => {
  // Returns the bounding box of the current selection, {x, y, width, height}, in model coordinates.
  // getBBox() is in each element's own user space, before its own transform
  // (e.g. text's scale(1, -1)), so map its corners through that transform.
  if (selection.length === 0) { return null }
  const toModel = dwg.model.children[0].getCTM().inverse()
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity
  selection.forEach(el => {
    const domEl = dwgMgr.getDomChildById(dwg, el.attrs.id)
    if (!domEl) { return }
    const bbox = domEl.getBBox()
    const matrix = toModel.multiply(domEl.getCTM())
    const corners = [
      [bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y],
      [bbox.x, bbox.y + bbox.height], [bbox.x + bbox.width, bbox.y + bbox.height]
    ]
    corners.forEach(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(matrix)
      xmin = Math.min(xmin, p.x)
      ymin = Math.min(ymin, p.y)
      xmax = Math.max(xmax, p.x)
      ymax = Math.max(ymax, p.y)
    })
  })
  if (xmin === Infinity) { return null }
  return { x: xmin, y: ymin, width: xmax - xmin, height: ymax - ymin }
}

// Exported for clickTools.js's 'library' case, which reuses this to apply a
// shape-library entry's unit-conversion factor about its anchor point.
export const scaleElement = (el, factor, anchor, scaleFactor) => {
  // Returns a new element with the same attributes as the original,
  // but with its position and size scaled by the specified factor from the anchor point.
  const newEl = structuredClone(el)
  const scaleCoord = (coord, anchorCoord) => anchorCoord + factor * (coord - anchorCoord)
  if (el.tag === 'text') {
    // Text is placed from its modelPoint, not attrs.x/y directly (see
    // text.js's moveText/rotateText/mirrorText) — scale modelPoint, then
    // rederive attrs.x/y and boundingBox from it the same way those do.
    // Font size is a screen-pixel property (see dwg.js's "Keep font size
    // consistent during zooming"), so it is deliberately left unscaled.
    const newModelPoint = {
      x: scaleCoord(el.modelPoint.x, anchor.x),
      y: scaleCoord(el.modelPoint.y, anchor.y)
    }
    const localAppState = structuredClone(el.attrs)
    localAppState.textposition = el.position
    localAppState.fontsize = parseFloat(el.attrs.fontsize) || 13.33
    localAppState.scaleFactor = scaleFactor
    const textPoint = text.adjustTextPoint(
      { ...newModelPoint },
      el.position,
      localAppState,
      el.text.split('\n').length
    )
    newEl.attrs.x = textPoint.x
    newEl.attrs.y = -1 * textPoint.y
    newEl.modelPoint = newModelPoint
    newEl.boundingBox = text.getTextBoundingBox(el.text, newModelPoint, localAppState)
  } else if ('x' in el.attrs) { // e.g., rect, image
    newEl.attrs.x = scaleCoord(parseFloat(el.attrs.x), anchor.x);
    newEl.attrs.y = scaleCoord(parseFloat(el.attrs.y), anchor.y);
    if ('width' in el.attrs) {
      newEl.attrs.width = parseFloat(el.attrs.width) * factor
    }
    if ('height' in el.attrs) {
      newEl.attrs.height = parseFloat(el.attrs.height) * factor
    }
  } else if ('cx' in el.attrs) { // e.g., circle, ellipse
    newEl.attrs.cx = scaleCoord(parseFloat(el.attrs.cx), anchor.x);
    newEl.attrs.cy = scaleCoord(parseFloat(el.attrs.cy), anchor.y);
    if ('r' in el.attrs) {
      newEl.attrs.r = parseFloat(el.attrs.r) * factor
    }
    if (el.tag === 'ellipse') {
      if ('rx' in el.attrs) {
        newEl.attrs.rx = parseFloat(el.attrs.rx) * factor
      }
      if ('ry' in el.attrs) {
        newEl.attrs.ry = parseFloat(el.attrs.ry) * factor
      }
      // The rotate() transform bakes in cx/cy as its pivot, which just moved.
      newEl.attrs.transform = ellipseTransform(newEl.attrs.cx, newEl.attrs.cy, newEl.angle || 0)
    }
  } else if ('x1' in el.attrs) { // e.g., line
    newEl.attrs.x1 = scaleCoord(parseFloat(el.attrs.x1), anchor.x);
    newEl.attrs.y1 = scaleCoord(parseFloat(el.attrs.y1), anchor.y);
    newEl.attrs.x2 = scaleCoord(parseFloat(el.attrs.x2), anchor.x);
    newEl.attrs.y2 = scaleCoord(parseFloat(el.attrs.y2), anchor.y);
  } else if (el.attrs.points) { // polygon
    const points = el.attrs.points.trim().split(/\s+/).map(pt => {
      const [x, y] = pt.split(',').map(coord => parseFloat(coord))
      return [scaleCoord(x, anchor.x), scaleCoord(y, anchor.y)];
    })
    newEl.attrs.points = points.map(pt => pt.join(',')).join(' ')
    if (newEl.points) {
      // Keep the parallel points array (used for snapping and by other
      // tools) in sync with the attrs.points string scaled just above.
      // point.r is legitimately 0 for a straight polygon corner — using the
      // ternary's else branch to fall through to "undefined" would corrupt
      // that (see the path branch below for where this exact mistake breaks
      // things), so a falsy point.r is passed through unchanged instead.
      newEl.points = newEl.points.map(point => ({
        x: scaleCoord(point.x, anchor.x),
        y: scaleCoord(point.y, anchor.y),
        r: point.r ? point.r * factor : point.r
      }))
    }
  } else if (el.tag === 'path' && el.attrs.d) { // path
    if (newEl.points) {
      // point.r is legitimately 0 for a straight (non-arc) path point; keep
      // it 0, not undefined (see the matching note in the polygon branch).
      const scaledPoints = newEl.points.map(point => ({
        x: scaleCoord(point.x, anchor.x),
        y: scaleCoord(point.y, anchor.y),
        r: point.r ? scaleR(point.r, factor) : point.r
      }))
      newEl.points = scaledPoints
      if (el.attrs['data-freehand']) {
        // A freehand path has no arc points to worry about — refit the
        // curve directly from the scaled points.
        newEl.attrs.d = freehandPathD(scaledPoints)
      } else {
        // Rebuild `d` from the scaled points, via the same builder parse.js
        // uses, rather than scaling the original `d` string textually. A
        // per-token multiply can't tell an arc command's rotation/large-arc/
        // sweep-flag tokens (which must stay exactly 0 or 1, never scaled)
        // from its radius/endpoint tokens (which should scale) — it corrupts
        // the flags into arbitrary numbers, which the browser then rejects as
        // invalid `d` syntax.
        newEl.attrs.d = path(pathRows(scaledPoints), pathBuilderStub).attrs.d
      }
    } else {
      console.warn(`scaleElement: path element id=${el.attrs.id} has no points array; leaving its d unscaled.`)
    }
  } else {
    console.warn(`scaleElement: Unsupported element type or missing position attributes for id=${el.attrs.id}`)
    return el
  }
  return newEl
}

// Project the selection onto one face of an isometric drawing, in place.
const isometric = (face, appState, domRefs, dwg) => {
  if (appState.selection.length === 0) {
    alert("Select the elements to project first.")
    return null
  }
  const skipped = projectIsometric(face, selectedUnits(appState, dwgMgr.getChildren(dwg)), appState, domRefs, dwg)
  // A resize handle would still mark a rect's or line's old corners.
  dwgMgr.clearTempElements(dwg)
  recordHistory(null, dwg)
  rebuildIntersectPoints(dwg)
  if (skipped.length > 0) {
    const counts = {}
    skipped.forEach(kind => { counts[kind] = (counts[kind] || 0) + 1 })
    const list = Object.entries(counts).map(([kind, n]) => `${n} ${kind}${n > 1 ? 's' : ''}`).join(', ')
    alert(`These can't be projected yet, and were left as they were: ${list}.`)
  }
  return null
}

// --- Shape Library… dialog -----------------------------------------------

const renderEmptyRow = (container, message) => {
  const row = document.createElement('div')
  row.className = 'shape-library-empty'
  row.textContent = message
  container.appendChild(row)
}

const makeLibraryButton = (title, url, domRefs) => {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'menu-btn'
  btn.textContent = title
  btn.addEventListener('click', () => {
    shapeLibrary.fetchLibraryData(url).then(data => {
      shapeLibrary.setActive(title, url, data)
      shapeLibrary.recordUsage(title, url)
      domRefs.shapeLibraryDialog.classList.remove('open')
    }).catch(err => {
      alert(`Could not load "${title}":\n${err.message}`)
    })
  })
  return btn
}

const renderRecents = domRefs => {
  const container = domRefs.shapeLibraryRecents
  container.innerHTML = ''
  const recents = shapeLibrary.getRecents()
  if (recents.length === 0) {
    renderEmptyRow(container, "No recent libraries")
    return
  }
  recents.forEach(({ title, url }) => {
    const row = document.createElement('div')
    row.className = 'shape-library-row'
    row.appendChild(makeLibraryButton(title, url, domRefs))
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'shape-library-remove-btn'
    removeBtn.title = `Remove "${title}" from recent libraries`
    removeBtn.textContent = '✕'
    removeBtn.addEventListener('click', e => {
      e.stopPropagation()
      shapeLibrary.removeRecent(url)
      renderRecents(domRefs)
    })
    row.appendChild(removeBtn)
    container.appendChild(row)
  })
}

const renderCatalog = domRefs => {
  const container = domRefs.shapeLibraryCatalog
  container.innerHTML = ''
  renderEmptyRow(container, "Loading…")
  shapeLibrary.fetchCatalog().then(catalog => {
    container.innerHTML = ''
    if (!catalog || catalog.length === 0) {
      renderEmptyRow(container, "No libraries found")
      return
    }
    catalog.forEach(({ title, url }) => {
      container.appendChild(makeLibraryButton(title, url, domRefs))
    })
  }).catch(err => {
    container.innerHTML = ''
    renderEmptyRow(container, `Could not reach the library catalog: ${err.message}`)
  })
}

// Now the main event handlers for menu actions

export const actions = Object.freeze({
  main: {
    properties(appState, domRefs, dwg) {
      sketchProperties.open(appState, domRefs)
      return null
    },
    shape(appState, domRefs, dwg) {
      domRefs.shapeLibraryDialog.classList.add('open')
      renderRecents(domRefs)
      renderCatalog(domRefs)
      return null
    },
    editSource(appState, domRefs, dwg) {
      // Write the scene statement's origin, not the current view's.
      text.setContentEditableText(domRefs.inputBox, stringify({ ...appState, ...sceneHeaderOf(appState) }, dwg))
      domRefs.okButton.classList.add('visible')
      domRefs.okButton.setAttribute('data-scope', "all")  // Indicate we're editing the whole drawing
      domRefs.cancelButton.classList.add('visible')
      domRefs.inputBox.focus()
      return null
    }
  },
  zoom: {
    reset(appState, domRefs, dwg) {
      // Return to the origin offset given by the `scene` statement.
      const deltaOriginX = appState.sceneOriginX
      const deltaOriginY = appState.sceneOriginY
      appState.zoom = 1
      appState.deltaOriginX = deltaOriginX
      appState.deltaOriginY = deltaOriginY
      utils.redrawCanvas(appState, domRefs)
      zoomStack.push({ zoom: 1, deltaOriginX, deltaOriginY })
      return null
    },
    in(appState, domRefs, dwg) { 
      appState.zoom *= 1.2
      utils.redrawCanvas(appState, domRefs)
      zoomStack.push({ zoom: appState.zoom, deltaOriginX: appState.deltaOriginX, deltaOriginY: appState.deltaOriginY })
      return null
    },
    out(appState, domRefs, dwg) { 
      appState.zoom /= 1.2
      utils.redrawCanvas(appState, domRefs)
      zoomStack.push({ zoom: appState.zoom, deltaOriginX: appState.deltaOriginX, deltaOriginY: appState.deltaOriginY })
      return null
    },
    window(appState, domRefs, dwg) {
      document.querySelectorAll('#tool-form .palette-btn').forEach(btn => {
        btn.classList.remove('active')
      })
      appState.tool = 'zoom'
      return null
    },
    extents(appState, domRefs, dwg) {
      const bbox = dwg.model.children[0].getBBox()
      if (!bbox) { return null }
      zoomToFit(domRefs, bbox, appState)
      return null
    },
    selection(appState, domRefs, dwg) {
      if (appState.selection.length === 0) { return null }
      const bbox = getSelectionBoundingBox(appState.selection, dwg)
      if (!bbox) { return null }
      zoomToFit(domRefs, bbox, appState)
      return null
    },
    previous(appState, domRefs, dwg) {
      if (zoomStack.length <= 1) { return null }
      zoomStack.pop() // Remove the current zoom state
      const previousZoom = zoomStack[zoomStack.length - 1]
      appState.zoom = previousZoom.zoom
      appState.deltaOriginX = previousZoom.deltaOriginX
      appState.deltaOriginY = previousZoom.deltaOriginY
      utils.redrawCanvas(appState, domRefs)
      return null
    }
  },

  edit: {
    // handleUndoRedo rebuilds the drawing from a text snapshot, restoring each
    // element's old id, and re-points the selection at the rebuilt elements.
    // The Ctrl+Z/Ctrl+Y shortcuts call these too (menuListeners.js).
    undo(appState, domRefs, dwg) {
      handleUndoRedo('undo', dwg, appState, domRefs)
      return null
    },
    redo(appState, domRefs, dwg) {
      handleUndoRedo('redo', dwg, appState, domRefs)
      return null
    },
    delete(appState, domRefs, dwg) {
      if (appState.selection.length === 0) { return null }
      appState.selection.forEach(el => dwgMgr.removeChild(dwg, el.attrs.id))
      clearTempAndSelection(appState, domRefs, dwg)
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
      return null
    },
    moveToFront(appState, domRefs, dwg) {
      // Move each selected element to the end of the children array, which brings it to the front in SVG rendering order.
      // Whole groups, in array order, so each group stays contiguous and in its own order.
      selectedUnits(appState, dwgMgr.getChildren(dwg)).forEach(el => {
        dwgMgr.moveToFront(dwg, el.attrs.id)
      })
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
      return null
    },
    moveToBack(appState, domRefs, dwg) {
      // Move each selected element to the beginning of the children array, which sends it to the back in SVG rendering order.
      // We need to reverse the selection order to maintain the relative order of the selected elements.
      // Whole groups, in array order, so each group stays contiguous and in its own order.
      selectedUnits(appState, dwgMgr.getChildren(dwg)).reverse().forEach(el => {
        dwgMgr.moveToBack(dwg, el.attrs.id)
      })
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
      return null
    },
    group(appState, domRefs, dwg) {
      const kids = dwgMgr.getChildren(dwg)
      const members = selectedUnits(appState, kids)
      const numUnits = new Set(members.map(el => groups.outermostGroup(el) ?? el)).size
      if (numUnits < 2) {
        alert("Select two or more items to group.")
        return null
      }
      const groupNum = dwgMgr.nextId(dwg)
      members.forEach(el => dwgMgr.setGroupPath(dwg, el, [groupNum, ...groups.groupPath(el)]))
      dwgMgr.gatherAtTop(dwg, members)
      utils.updateSelection(members, appState, domRefs)
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
      return null
    },
    ungroup(appState, domRefs, dwg) {
      const kids = dwgMgr.getChildren(dwg)
      const members = selectedUnits(appState, kids)
      // Remove one level: the outermost group of each selected item.
      const outerGroups = new Set(members.map(groups.outermostGroup).filter(g => g !== null))
      let numUngrouped = 0
      let numLeaf = 0
      outerGroups.forEach(g => {
        const groupMembers = groups.membersOf(kids, g)
        // A free-standing dimension string or arrow can't be ungrouped.
        const first = groupMembers[0]
        if (groups.groupPath(first).length === 1 && groups.isLeafGroupMember(first)) {
          numLeaf += 1
          return
        }
        groupMembers.forEach(el => dwgMgr.setGroupPath(dwg, el, groups.groupPath(el).slice(1)))
        numUngrouped += 1
      })
      if (numUngrouped === 0) {
        alert(numLeaf > 0
          ? "Dimension strings, arrows, and labeled dots can't be ungrouped."
          : "Nothing selected is a group.")
        return null
      }
      recordHistory(null, dwg)
      return null
    },
    isoTop(appState, domRefs, dwg) {
      return isometric('top', appState, domRefs, dwg)
    },
    isoLeft(appState, domRefs, dwg) {
      return isometric('left', appState, domRefs, dwg)
    },
    isoRight(appState, domRefs, dwg) {
      return isometric('right', appState, domRefs, dwg)
    },
    editElement(appState, domRefs, dwg) {
      if (appState.selection.length === 0) {
        return null
      } else if (appState.selection.length > 1) { 
        alert("Edit | Edit… can only edit one element at a time.")
        return null
      } else {
        // Write the styles that differ from the current ones. Pass a copy, since
        // stringifyElement updates the state it's given to the styles it writes.
        text.setContentEditableText(domRefs.inputBox, stringifyElement(appState.selection[0], { ...appState }))
        domRefs.okButton.classList.add('visible')
        domRefs.okButton.setAttribute('data-scope', 2)  // Indicate we're editing an element's source
        domRefs.cancelButton.classList.add('visible')  
        domRefs.inputBox.focus()
        return null
      }
    }
  }
})
