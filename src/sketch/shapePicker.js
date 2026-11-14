// shapePicker.js

// Popup for picking a shape from the currently active shape library (see
// shapeLibrary.js) and arming the 'library' tool with it, so the next canvas
// click inserts it (stage 4).

import { shapeLibrary } from './shapeLibrary.js'
import { buildShapeThumbnail } from './shapeThumbnail.js'
import { shapePreview } from './shapePreview.js'

const MARGIN = 8

// Place `dialog` next to `btn`, clamped so it stays fully inside the
// viewport. Must be called after the dialog has its real content and is
// visible (`.open` applied) — its size isn't known before that, and a
// content-heavy library (hundreds of entries) fills its full max-height, so
// naively anchoring to the button's own position (as if the dialog were
// tiny) can push a tall dialog off the bottom of the screen.
const positionNear = (dialog, btn) => {
  dialog.style.position = 'fixed' // Must precede getBoundingClientRect() below — .menu-dialog's
                                   // base CSS is position:absolute, a different coordinate space.
  const btnRect = btn.getBoundingClientRect()
  const dialogRect = dialog.getBoundingClientRect()

  let left = btnRect.right + MARGIN
  if (left + dialogRect.width > window.innerWidth - MARGIN) {
    // Doesn't fit to the right of the button — try its left side instead.
    left = btnRect.left - dialogRect.width - MARGIN
  }
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - dialogRect.width - MARGIN))
  const top = Math.max(MARGIN, Math.min(btnRect.top, window.innerHeight - dialogRect.height - MARGIN))

  dialog.style.left = `${left}px`
  dialog.style.top = `${top}px`
}

const makeShapeButton = (entry, unit, showThumbnails, domRefs, appState, dwg) => {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'shape-picker-btn'
  btn.title = entry.name
  if (showThumbnails) {
    const thumb = buildShapeThumbnail(entry)
    if (thumb) { btn.appendChild(thumb) }
    const label = document.createElement('span')
    label.className = 'shape-picker-label'
    label.textContent = entry.name
    btn.appendChild(label)
  } else {
    btn.textContent = entry.name
  }
  btn.addEventListener('click', () => {
    shapeLibrary.setArmedShape(entry, unit)
    shapePreview.show(dwg, appState)
    domRefs.shapePickerDialog.classList.remove('open')
  })
  return btn
}

const renderShapeGrid = (domRefs, library, appState, dwg) => {
  const container = domRefs.shapePickerGrid
  container.innerHTML = ''
  if (!library) {
    container.classList.remove('shape-picker-grid')
    container.classList.add('shape-picker-list')
    const msg = document.createElement('div')
    msg.className = 'shape-library-empty'
    msg.textContent = "Choose Sketch | Shape Library… first."
    container.appendChild(msg)
    return
  }
  const showThumbnails = library.data.thumbnails !== false
  container.classList.toggle('shape-picker-grid', showThumbnails)
  container.classList.toggle('shape-picker-list', !showThumbnails)
  library.data.contents.forEach(entry => {
    container.appendChild(makeShapeButton(entry, library.data.unit, showThumbnails, domRefs, appState, dwg))
  })
}

export const shapePicker = Object.freeze({
  open(domRefs, btn, appState, dwg) {
    // Render and reveal first — positionNear needs the dialog's real,
    // content-driven size (it's still display:none, with no layout, before
    // 'open' is applied), not just the clicked button's own position.
    renderShapeGrid(domRefs, shapeLibrary.getActive(), appState, dwg)
    domRefs.shapePickerDialog.classList.add('open')
    positionNear(domRefs.shapePickerDialog, btn)
  }
})
