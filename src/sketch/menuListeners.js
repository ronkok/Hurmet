import { dwgMgr } from './dwg.js'
import { resolveFill, markerFamily, markerEnd } from './elementObject.js'
import { actions } from './menuHandlers.js'
import { clearTempAndSelection } from './workingState.js'
import { moveTool } from './moveTool.js'
import { selectTool } from './selectTool.js'
import { text } from './text.js'
import { groups } from './groups.js'
import { recordHistory } from './history.js'
import { resizeHandle } from './resizeHandle.js'
import { rebuildIntersectPoints } from './snap.js'
import { utils } from './utils.js'
import { shapePicker } from './shapePicker.js'
import { shapeLibrary } from './shapeLibrary.js'
import { sketchProperties } from './sketchProperties.js'
import { shapePreview } from './shapePreview.js'
import { singleClickPreview } from './singleClickPreview.js'

// Event listeners and handlers for menus and palettes.

function flashButton(btn) {
  btn.classList.add('clicked')
  setTimeout(() => btn.classList.remove('clicked'), 150)
}

// Recolor a cloned pattern-button subtree in place: wherever the button art
// used black (the button's own fixed preview color) for fill or stroke,
// substitute the actual fill color instead. Some patterns (diagonal,
// crosshatch, grid) color their lines inside a <pattern> def rather than on
// the visible element, so a fill="url(#...)" is followed to that def, which
// is cloned under a new id (recolored in turn) and appended to patternDefs.
function recolorClone(el, color, patternDefs) {
  const fillAttr = el.getAttribute('fill')
  if (fillAttr === '#000') {
    el.setAttribute('fill', color)
  } else if (fillAttr && fillAttr.startsWith('url(#')) {
    const sourceId = fillAttr.slice(5, -1)
    const sourcePattern = document.getElementById(sourceId)
    if (sourcePattern) {
      const previewId = `fp-preview-${sourceId}`
      const clonedPattern = sourcePattern.cloneNode(true)
      clonedPattern.setAttribute('id', previewId)
      recolorClone(clonedPattern, color, patternDefs)
      patternDefs.appendChild(clonedPattern)
      el.setAttribute('fill', `url(#${previewId})`)
    }
  }
  if (el.getAttribute('stroke') === '#000') el.setAttribute('stroke', color)
  for (const child of el.children) recolorClone(child, color, patternDefs)
}

// Sync the fill-display toolbar swatch with appState.fill / appState.pattern.
// For "solid", the swatch background itself is the fill color. For any other
// pattern, the background is white and the pattern's own lines/dots/shapes
// (cloned from the matching fill-pattern-btn) carry the fill color instead.
function updateFillDisplay(appState) {
  const fillPreview = document.getElementById('fill-preview')
  const group = document.getElementById('fill-pattern-preview')
  const patternDefs = document.getElementById('fill-pattern-defs')
  if (!fillPreview || !group || !patternDefs) return

  const color = appState.fill === 'none' ? 'none' : appState.fill
  const pattern = appState.pattern || 'solid'

  group.replaceChildren()
  patternDefs.replaceChildren()

  if (pattern === 'solid') {
    fillPreview.setAttribute('fill', color)
    group.removeAttribute('transform')
    return
  }

  fillPreview.setAttribute('fill', '#ffffff')

  const sourceSvg = document.querySelector(`.fill-pattern-btn[data-pattern="${pattern}"] svg`)
  if (!sourceSvg) return

  // The source button's own viewBox (e.g. 40x40 for most patterns, but some
  // custom ones are much bigger — sand is 100x100, concrete is 200x200) rarely
  // matches this toolbar swatch's small viewBox (35x21, with the visible
  // border at x=2,y=2,31x17), so the cloned content is scaled to exactly
  // fill that border (independent x/y scale factors, not aspect-preserving —
  // the border itself isn't square, so uniform scaling would only fill it in
  // one dimension and leave the pattern looking like a small square with
  // empty margins).
  const [, , vbW, vbH] = (sourceSvg.getAttribute('viewBox') || '0 0 40 40').split(/\s+/).map(Number)
  const boxX = Number(fillPreview.getAttribute('x')), boxY = Number(fillPreview.getAttribute('y'))
  const boxW = Number(fillPreview.getAttribute('width')), boxH = Number(fillPreview.getAttribute('height'))
  const scaleX = boxW / vbW, scaleY = boxH / vbH
  group.setAttribute('transform', `translate(${boxX},${boxY}) scale(${scaleX},${scaleY})`)

  // Skip <defs> (their pattern/clipPath ids are still resolvable from the
  // clone) and the button's own background/border rect; clone and recolor
  // the rest.
  Array.from(sourceSvg.children)
    .filter(node => node.tagName.toLowerCase() !== 'defs')
    .slice(1)
    .forEach(node => {
      const clone = node.cloneNode(true)
      recolorClone(clone, color, patternDefs)
      group.appendChild(clone)
    })
}

function cancelSnapAndLock(appState) {
  // Reset snap to 'none'
  document.querySelectorAll('#snap-form .palette-btn').forEach(b => {
    if (b.getAttribute('data-snap') === 'none') {
      b.classList.add('active')
    } else {
      b.classList.remove('active')
    }
  })
  appState.snap = 'none'  
  // Reset lock to 'unlock'
  document.querySelectorAll('#lock-form .palette-btn').forEach(b => {
    if (b.getAttribute('data-lock') === 'unlock') {
      b.classList.add('active')
    } else {
      b.classList.remove('active')
    }
  })
  appState.lock = 'unlock'
}

const circleCursors = ['offset', 'erase', 'reference', 'trim', 'extend', 'chamfer', 'fillet', 'join'];

// Switching to any of these tools starts a fresh drawing/editing operation
// that shouldn't inherit a leftover selection, temporary-layer content
// (dimension points, trim reference line, resize handles), or local-coord
// display from whatever was active before. See clearTempAndSelection in workingState.js.
const toolsThatClearWorkingState = [
  'measure', 'image', 'line', 'polyline', 'rect', 'oval', 'polygon', 'library',
  'arrow', 'dimension', 'text', 'trim', 'join', 'fillet', 'extend', 'erase'
];

const dashFromType = {
  solid: null,
  dashed: '12 6',
  dotted: '0 8',
  centerline: '12 6 3 6',
  border: '12 6 3 6 3 6' // Sync with elementObject.js
}
const linecapFromType = {
  solid: null,
  dashed: 'butt',
  dotted: 'round',
  centerline: 'butt',
  border: 'butt'
}

const textBoxNeeders = ['text', 'polygon', 'offset', 'fillet', 'rotate', 'array', 'extend', 'angular-array', 'resize', 'image'];

const init = (document, appState, domRefs, dwg) => {
  
  document.querySelectorAll('#tool-form .palette-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      document.querySelectorAll('#tool-form .palette-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const previousTool = appState.tool
      appState.tool = btn.getAttribute('data-tool')
      singleClickPreview.hide()
      if (previousTool === 'select' && appState.tool !== 'select') {
        // Resize handles are live only under the Select tool (resizeHandle.js).
        // Hide them now; the selection itself stays blue. Only when leaving
        // Select, because then the temporary layer holds nothing but them.
        resizeHandle.refresh(appState, dwg)
      }
      // The Measure tool's Δ reading belongs to the measurement just taken,
      // so any tool switch (Escape included) clears it.
      utils.clearMeasurement(domRefs)
      if (appState.tool !== 'library') {
        // Escape (which switches here to 'select') and every other tool button
        // route through this same handler, so this clears the armed shape (and
        // its cursor-following preview) on Escape or any switch away from the
        // library tool.
        shapeLibrary.clearArmedShape()
        shapePreview.hide()
      }
      if (toolsThatClearWorkingState.includes(appState.tool)) {
        clearTempAndSelection(appState, domRefs, dwg)
      }
      if (appState.tool === 'text') {
        // Editing a text element shows that element's position and size; new text gets appState's.
        domRefs.textPositionSelect.value = appState.textposition
        domRefs.fontSizeSelect.value = String(appState.fontsize)
      }
      if (appState.tool === 'pan') {
        domRefs.canvas.style.cursor = 'grabbing'
      } else if (appState.tool === 'select') {
        // Clear any previous temporary data, then redraw the resize handles
        // if a single click-selected image/rect/line is still selected.
        resizeHandle.refresh(appState, dwg)
        domRefs.canvas.style.cursor = 'default'
      } else if (appState.tool === 'move' && appState.selection.length > 0 && domRefs.inputBox.textContent.trim() !== "") {
        const [gotValidMeasurement, measurement] = utils.validateMeasurement(domRefs.inputBox, appState)
        if (gotValidMeasurement) {
          moveTool.moveByWrittenMeasurement(appState, dwg, domRefs, measurement[0], measurement[1])
        }
      } else if (circleCursors.includes(appState.tool)) {
        // Some tools use a small circle cursor
        domRefs.canvas.style.cursor = 'url("./circle-cursor.svg") 8 8, crosshair'
      } else {
        domRefs.canvas.style.cursor = 'crosshair'
      }
      if (appState.tool !== 'text') {
        if (domRefs.cancelButton.classList.contains('visible')) {
          domRefs.cancelButton.classList.remove('visible')
          domRefs.okButton.classList.remove('visible')  
        }
        domRefs.inputBox.textContent = ''
        domRefs.inputBox.blur()
      }
      if (!domRefs.okButton.classList.contains('visible')) {
        // Leave the scope alone while an edit is still open in the input box.
        domRefs.okButton.dataset.scope = utils.toolInputScope(appState.tool)
      }
      if (appState.tool === 'array') {
        if (appState.selection.length === 0) {
          alert("The array tool requires one or more selected elements.")
        } else {
          domRefs.okButton.classList.add('visible')
          domRefs.okButton.dataset.scope = "array"
          domRefs.cancelButton.classList.add('visible')
          domRefs.inputBox.focus()
        }
      } else if (textBoxNeeders.includes(appState.tool)) {
        domRefs.inputBox.focus()
      }
      if (appState.tool === 'select') {
        cancelSnapAndLock(appState)
      }
      if (appState.tool === 'library') {
        event.stopPropagation() // Keep the body click-listener from closing the popup this just opened.
        shapePicker.open(domRefs, btn, appState, dwg)
      }
    })
  })

  const duplicateModeBtn = document.getElementById("duplicate-mode-btn")
  duplicateModeBtn.addEventListener('click', (e) => {
    appState.duplicateOnMove = !appState.duplicateOnMove
    if (appState.duplicateOnMove) {
      duplicateModeBtn.classList.add('active')
    } else {
      duplicateModeBtn.classList.remove('active')
    }
  })

  document.querySelectorAll('#snap-form .palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#snap-form .palette-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      appState.snap = btn.getAttribute('data-snap')
    })
  })

  document.querySelectorAll('#lock-form .palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lock-form .palette-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      appState.lock = btn.getAttribute('data-lock')
    })
  })
 
  document.getElementById("grid-toggle").addEventListener('click', (e) => {
    const gridSvg = domRefs.gridSvg
    if (!gridSvg) { return }
    gridSvg.style.display = (gridSvg.style.display === 'none') ? '' : 'none'
    flashButton(e.currentTarget)
  })

  document.querySelectorAll('#grid-form .palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grid-form .palette-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      appState.lock = btn.getAttribute('data-lock')
    })
  })

  // A text element's font size, in px, as appState.fontsize holds it.
  const fontSizeOf = el => parseFloat(el.attrs.fontsize) || 13.33

  const textPositionSelect = document.getElementById('text-position')
  if (textPositionSelect) {
    textPositionSelect.addEventListener('change', function () {
      appState.textposition = textPositionSelect.value
      appState.selection.forEach(el => {
        if (el.tag === 'text') {
          // Keep the element's own font size.
          const textEl = text.createTextElement(el.text, el.modelPoint, { ...appState, fontsize: fontSizeOf(el) })
          dwgMgr.swapChild(dwg, el.attrs.id, textEl, appState, domRefs)
        }
      })
      recordHistory(null, dwg)
      rebuildIntersectPoints(dwg)
    })
  }

  domRefs.fontSizeSelect.addEventListener('change', function () {
    appState.fontsize = parseFloat(domRefs.fontSizeSelect.value)
    appState.selection.forEach(el => {
      // Dimension and arrow labels keep their fixed size. See text.createLabelElement.
      if (el.tag === 'text' && !groups.isLeafGroupMember(el)) {
        // Keep the element's own position.
        const textEl = text.createTextElement(el.text, el.modelPoint, { ...appState, textposition: el.position })
        dwgMgr.swapChild(dwg, el.attrs.id, textEl, appState, domRefs)
      }
    })
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
  })

  // Show/hide menu dialogs for Stroke and Fill (menu-dialog)
  document.querySelectorAll('.menu-heading').forEach(heading => {
    const menuType = heading.getAttribute('data-menu')
    if (menuType === 'stroke' || menuType === 'fill') {
      heading.addEventListener('click', function(e) {
        e.stopPropagation()
        const section = heading.closest('.menu-section')
        const dialog = section.querySelector('.menu-dialog')
        // Close all dialogs
        document.querySelectorAll('.menu-dialog.open').forEach(d => {
          if (d !== dialog) d.classList.remove('open')
        })
        for (const menuId of menus) {
          const menu = document.getElementById(menuId)
          menu.classList.remove('open')
        }
        // Toggle this one
        if (dialog) {
          dialog.classList.toggle('open')
        }
      })
    } else {
      heading.addEventListener('click', function(e) {
        e.stopPropagation()
        const section = heading.closest('.menu-section')
        const isOpen = section.classList.contains('open')
        // Close all dropdown menus
        document.querySelectorAll('.menu-section.open').forEach(s => {
          s.classList.remove('open')
        })
        // Close all dialogs
        document.querySelectorAll('.menu-dialog.open').forEach(d => {
          d.classList.remove('open')
        })
        // Toggle this one
        if (!isOpen) {
          section.classList.add('open')
        }
      })
    }
  })

  // Show the current ending on the Stroke menu's preview line. It borrows the
  // sketch's own markers, so an arrowhead is sized to the current stroke width.
  const updatePreviewMarker = () => {
    const strokePreview = document.getElementById('stroke-preview')
    if (!strokePreview) { return }
    if (appState.marker === 'none') {
      strokePreview.removeAttribute('marker-end')
    } else {
      strokePreview.setAttribute('marker-end', markerEnd(appState.marker, appState.strokewidth))
    }
  }

  // Close dialog when clicking a stroke option button and update appState
  const strokeDialog = document.getElementById('stroke-options')
  if (strokeDialog) {
    strokeDialog.addEventListener('click', function(e) {
      const btn = e.target.closest('button')
      if (!btn) return

      // Thickness
      if (btn.classList.contains('stroke-thickness-btn')) {
        let val = btn.getAttribute('data-thickness')
        val= val === 'none' ? 0 : parseFloat(val)
        appState.strokewidth = val
        // Update stroke display SVG
        const strokePreview = document.getElementById('stroke-preview')
        if (strokePreview) {
          strokePreview.setAttribute('stroke-width', val)
        }
        updatePreviewMarker()
        // Update active button
        document.querySelectorAll('#stroke-options .stroke-thickness-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        // Apply to selected elements
        appState.selection.forEach((el) => {
          const newAttrs = { "stroke-width": val }
          // An arrowhead is sized to suit its stroke width; swap it to match.
          const marker = el.attrs['marker-end']?.match(/^url\(#(.*)\)$/)?.[1]
          if (markerFamily(marker) !== marker) { newAttrs['marker-end'] = markerEnd(marker, val) }
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, newAttrs)
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Color
      if (btn.classList.contains('stroke-color-btn')) {
        let val = btn.getAttribute('data-color')
        appState.stroke = val
        // Update stroke display SVG
        const strokePreview = document.getElementById('stroke-preview')
        if (strokePreview) {
          strokePreview.setAttribute('stroke', val)
        }
        // Update active button
        document.querySelectorAll('#stroke-options .stroke-color-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        // Apply to selected elements
        appState.selection.forEach((el) => {
          const newAttrs = { stroke: val }
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, newAttrs)
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Ending (e.g., arrowhead, dot, etc.)
      if (btn.classList.contains('stroke-ending-btn')) {
        let val = btn.getAttribute('data-ending')
        appState.marker = val
        updatePreviewMarker()
        // Update active button
        document.querySelectorAll('#stroke-options .stroke-ending-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        // Apply to selected elements
        // Only lines and paths have line endings; ignore rects, circles, etc.
        appState.selection.forEach((el) => {
          if (el.tag !== 'line' && el.tag !== 'path') { return }
          const newAttrs = { 'marker-end': val === 'none' ? null : markerEnd(val, el.attrs['stroke-width']) }
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, newAttrs)
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Line type
      if (btn.classList.contains('linetype-btn')) {
        let linetype = btn.getAttribute('data-linetype')
        appState.linetype = linetype

        const strokePreview = document.getElementById('stroke-preview')
        if (strokePreview) {
          switch (linetype) {
            case 'solid':
              strokePreview.removeAttribute('stroke-dasharray')
              strokePreview.removeAttribute('stroke-linecap')
              break
            case 'dashed':
              strokePreview.setAttribute('stroke-dasharray', '6,4')
              strokePreview.setAttribute('stroke-linecap', 'butt')
              break
            case 'dotted':
              strokePreview.setAttribute('stroke-dasharray', '0,8')
              strokePreview.setAttribute('stroke-linecap', 'round')
              break
            case 'centerline':
              strokePreview.setAttribute('stroke-dasharray', '2,2,6,2')
              strokePreview.setAttribute('stroke-linecap', 'butt')
              break
            default:
              strokePreview.removeAttribute('stroke-dasharray')
              strokePreview.removeAttribute('stroke-linecap')
          }
        }

        // Update active button
        document.querySelectorAll('#stroke-options .linetype-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        // Apply to selected elements
        appState.selection.forEach((el) => {
          // A null value tells reviseAttributesOfChild to remove the attribute,
          // which is how 'solid' clears an existing dash pattern.
          const newAttrs = {
            "stroke-dasharray": dashFromType[linetype] ?? null,
            "stroke-linecap": linecapFromType[linetype] ?? null
          }
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, newAttrs)
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Close dialog
      strokeDialog.classList.remove('open')

      // Optionally, update the stroke display SVG here
      // updateStrokeDisplay()
    })
  }

  // Close dialog when clicking a fill option button and update appState
  const fillDialog = document.getElementById('fill-options')
  if (fillDialog) {
    fillDialog.addEventListener('click', function(e) {
      const btn = e.target.closest('button')
      if (!btn) return

      // Color
      if (btn.classList.contains('fill-color-btn')) {
        let val = btn.getAttribute('data-color')
        appState.fill = val
        updateFillDisplay(appState)

        // Apply to selected elements
        appState.selection.forEach((el) => {
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, resolveFill(appState))
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Pattern
      if (btn.classList.contains('fill-pattern-btn')) {
        let val = btn.getAttribute('data-pattern')
        appState.pattern = val
        if (val !== 'solid' && appState.fill === 'none') {
          // A pattern renders as nothing on a "none" fill background — picking
          // a pattern while fill is "none" would otherwise silently do nothing.
          appState.fill = '#000000'
        }
        updateFillDisplay(appState)

        // Apply to selected elements
        appState.selection.forEach((el) => {
          dwgMgr.reviseAttributesOfChild(dwg, el.attrs.id, resolveFill(appState))
        })
        recordHistory(null, dwg)
        rebuildIntersectPoints(dwg)
      }

      // Close dialog
      fillDialog.classList.remove('open')
    })
  }

  // Close dialogs/dropdowns if clicking outside
  document.body.addEventListener('click', function(e) {
    // Close all menu-dialogs
    document.querySelectorAll('.menu-dialog.open').forEach(d => d.classList.remove('open'))
    // Close all menu-dropdowns
    document.querySelectorAll('.menu-section.open').forEach(d => d.classList.remove('open'))
  })

  // Prevent closing when clicking inside dialogs/dropdowns
  document.querySelectorAll('.menu-dialog, .menu-dropdown').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation()
    })
  })

  sketchProperties.initialize(appState, domRefs, dwg)

  // Menu listeners
  // Edit | Cut, Copy, and Paste use the clipboard, so sketch.js handles them.
  const menus = ["main-menu", "edit-menu", "zoom-menu"];
  for (const menuId of menus) {
    const menu = document.getElementById(menuId)
    if (!menu) continue
    const actionCategory = menuId.split('-')[0]  // e.g., "main", "edit", "zoom"
    menu.children[1].querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const func = btn.getAttribute('data-menu')
        if (actionCategory === 'edit' && (func === 'undo' || func === 'redo')) {
          undoRedo(func, appState, domRefs, dwg)
        } else if (func && actions[actionCategory] && typeof actions[actionCategory][func] === 'function') {
          actions[actionCategory][func](appState, domRefs, dwg)
        }
      })
    })
    // Close menu after clicking a button
    menu.children[1].querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.closest('.menu-section')
        if (section) {
          section.classList.remove('open')
        }
      })
    })
  }

}

const digitRegex = /^[0-9]$/
const toolKeys = ['Escape', 'Escape', 'd', 'D', 'l', 'L', 'w', 'W', 'f', 'F', 'r', 'R', 'o', 'O', 't', 'T', 'a', 'A', 's', 'S'];
const snapKeys = [' ', 'g', 'G', 'e', 'E', 'c', 'C', 'm', 'M', 'n', 'N', 'p', 'P', 'i', 'I', 'j', 'J'];
const lockKeys = ['u', 'U', 'x', 'X', 'y', 'Y'];

// Undo or redo, from Ctrl+Z/Ctrl+Y or the Edit menu. The selection survives
// it, so redraw the blue resize marks for it. (They're here, not in
// menuHandlers.js, because importing resizeHandle there would make a cycle.)
const undoRedo = (action, appState, domRefs, dwg) => {
  actions.edit[action](appState, domRefs, dwg)
  resizeHandle.refresh(appState, dwg)
}

const handleKeyDown = (event, document, appState, domRefs, dwg, tool = null) => {
  if (event.type === 'toolswitch') {
    // A tool button was clicked with the mouse (see sketch.js). The button's
    // handler has already switched tools, so cancel the in-progress operation.
    if (tool && typeof tool.cancel === 'function') {
      tool.cancel(domRefs, dwg, appState)
      return true
    }
    return
  }
  const inputBox = domRefs.inputBox || document.getElementById('text-input')
  const previousTool = appState.tool
  // Ctrl+Z/Ctrl+Y must run the app's own undo/redo even when the measurement
  // box has focus — and it very often does: rotate/move/resize/offset/etc.
  // execute via a canvas click, but the canvas is a plain, non-focusable
  // <div>, so clicking it never blurs the contenteditable box. Letting the
  // event "go to the contenteditable" here means the browser's native
  // single-field undo fires instead of dwg-level undo, silently skipping
  // the drawing revert and potentially mangling whatever's left in the box.
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undoRedo('undo', appState, domRefs, dwg)
    return
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    undoRedo('redo', appState, domRefs, dwg)
    return
  }
  // Zoom shortcuts: Ctrl + '+' (zoom in), Ctrl + '-' (zoom out), Ctrl + '0' (reset zoom)
  // These also run ahead of the focus check below, since the measurement box
  // usually has focus; otherwise Ctrl+-/+ would fall through to browser page zoom.
  if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
    actions.zoom.in(appState, domRefs, dwg)
    event.preventDefault()
    return
  } else if (event.ctrlKey && event.key === '-') {
    actions.zoom.out(appState, domRefs, dwg)
    event.preventDefault()
    return
  } else if (event.ctrlKey && event.key === '0') {
    actions.zoom.reset(appState, domRefs, dwg)
    event.preventDefault()
    return
  }
  // If text-input is focused, let the event go to it
  if (document.activeElement === inputBox) {
    // Let the event go to the contenteditable
    return
  }

  if (event.ctrlKey && (event.key === 'G' || event.key === 'g')) {
    // Ctrl+G to toggle grid visibility
    const gridSvg = domRefs.gridSvg
    if (!gridSvg) { return }
    gridSvg.style.display = (gridSvg.style.display === 'none') ? '' : 'none'
    const gridToggleBtn = document.getElementById('grid-toggle')
    flashButton(gridToggleBtn)
    event.preventDefault()
    return
  } else if (event.key === 'Delete') {
    // Delete key to erase selected elements
    if (appState.selection.length === 0) { return null }
    appState.selection.forEach(el => dwgMgr.removeChild(dwg, el.attrs.id))
    clearTempAndSelection(appState, domRefs, dwg)
    dwgMgr.popRubberBand(dwg, appState)
    recordHistory(null, dwg)
    rebuildIntersectPoints(dwg)
    event.preventDefault()
    return
  }
  
  if (digitRegex.test(event.key)) {  // If key is a numeric digit, focus inputBox and insert the digit
    inputBox.focus()
    // Insert the digit at the caret position
    document.execCommand('insertText', false, event.key)
    event.preventDefault()
    return
  }

  // Tool palette shortcuts
  if (toolKeys.includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const toolBtn = Array.from(document.querySelectorAll('#tool-form .palette-btn'))
      .find(btn => (btn.getAttribute('data-key') || '').toLowerCase() === event.key.toLowerCase())
    toolBtn.click()
    if (appState.tool !== previousTool && appState.tool !== 'text') {
      inputBox.textContent = ''
      inputBox.blur()
    }
    if (appState.tool !== previousTool) {
      // Any tool switch, not just Escape, abandons an in-progress operation.
      // The tool button's handler may already have cleared the rubber band,
      // so the caller's inner loop must break rather than keep updating it.
      if (event.key === 'Escape') { cancelSnapAndLock(appState) }
      if (tool && typeof tool.cancel === 'function') {
        tool.cancel(domRefs, dwg, appState)
        return true  // Indicate that we cancelled the tool
      }
    }
    return
  }
  
  // Snap palette shortcuts
  if (snapKeys.includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
    const snapBtn = Array.from(document.querySelectorAll('#snap-form .palette-btn'))
      .find(btn => (btn.getAttribute('data-key') || '').toLowerCase() === event.key.toLowerCase())
    snapBtn.click()
    event.preventDefault()
    return
  }

  // Lock/constraint palette shortcuts
  if (lockKeys.includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
    const lockBtn = Array.from(document.querySelectorAll('#lock-form .palette-btn'))
      .find(btn => (btn.getAttribute('data-key') || '').toLowerCase() === event.key.toLowerCase())
    lockBtn.click()
    event.preventDefault()
    return
  }
  
  // Menu shortcuts (example: Alt+S for Settings, Alt+E for Export, etc.)
  if (event.altKey) {
    // Example: Alt+S for Settings
    if (event.key.toLowerCase() === 's') {
      const settingsBtn = document.querySelector('.menu-btn:nth-child(1)')
      if (settingsBtn) settingsBtn.click()
      event.preventDefault()
      return
    }
    // Add more menu shortcuts as needed
  }

  // Ctrl+A to select all elements
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectTool.selectAll(appState, domRefs, dwg)
    return
  }

}

export const menuListeners = Object.freeze({
  init,
  handleKeyDown
})
