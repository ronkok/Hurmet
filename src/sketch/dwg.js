import { addSnapPoints, addIntersectPointsForNewElement } from './snap.js'
import { groups } from './groups.js'
import { sanitizeForId } from './shared.js'

// This file creates a virtual representation of the drawing
// and provides methods to manipulate both the virtual representation
// and the actual SVG DOM elements.

// Lines and shapes in SVG can have a "vector-effect" attribute set to "non-scaling-stroke"
// so that their stroke width does not change when the SVG is scaled.
// We want this behavior for most elements, but not for text elements,
// so we define a set of tags that should not have this attribute applied.
const nonStrokeTags = new Set(['text', 'tspan'])
const domKeys = {
  strokewidth: 'stroke-width',
  strokedasharray: 'stroke-dasharray',
  strokelinecap: 'stroke-linecap',
  fontcolor: 'color',
  fontstyle: 'font-style',
  fontfamily: 'font-family',
  fontsize: 'font-size',
  fontweight: 'font-weight'
}

// --- Fill pattern rendering --------------------------------------------
// Elements carry their fill as plain, serializable data: a color (or
// "none") plus a pattern name (see elementObject.js's resolveFill).
// Turning that pair into an actual SVG paint — a flat color, or a url()
// reference to a <pattern> colored to match — is done here, at the point a
// real DOM element is created or revised, so the virtual/serialized model
// never has to store a generated pattern id.
//
// Tile geometry for the fill patterns built from raw shapes rather than a
// <pattern> already defined on their menu button (see index.html's
// .fill-pattern-options). Diagonal/crosshatch/grid/earth/wood/gravel/
// concrete/sand are left out of this map because they already have a
// tileable <pattern> defined inline on their own fill-pattern-btn; that
// gets reused (see
// fillPatternButtonIds below) rather than redescribing the same geometry
// here.
const fillPatternTiles = {
  dots: {
    width: 20, height: 20,
    shapes: (color) =>
      `<circle cx="5" cy="5" r="1.2" fill="${color}"/>` +
      `<circle cx="15" cy="15" r="1.2" fill="${color}"/>`
  }
}
const fillPatternButtonIds = { diagonal: 'fp-diagonal', crosshatch: 'fp-crosshatch', grid: 'fp-grid', earth: 'fp-earth', wood: 'fp-wood', gravel: 'fp-gravel', concrete: 'fp-concrete', sand: 'fp-sand' }


function recolorPatternDef(el, color) {
  if (el.getAttribute('fill') === '#000') el.setAttribute('fill', color)
  if (el.getAttribute('stroke') === '#000') el.setAttribute('stroke', color)
  for (const child of el.children) recolorPatternDef(child, color)
}

// A <pattern>'s tile-repeat spacing (its width/height, mapped through the
// referencing element's ambient transform) scales along with the drawing —
// unlike fill/stroke/stroke-width, width/height aren't CSS-stylable, so
// there's no calc() equivalent, and vector-effect="non-scaling-stroke" has
// no effect on content inside a pattern def either. What *does* work: adding
// an extra scale(1/S) to patternTransform, on top of its existing flip/
// rotate — that's a single transform applied uniformly to the whole pattern
// (both its tile positioning and its content), so it counteracts the
// ambient scale everywhere at once, spacing and stroke weight alike,
// without width/height ever needing to change. (An earlier attempt also
// shrank width/height to match — that's wrong: width/height are the
// tile-repeat pitch in the *target* coordinate system patternTransform maps
// onto, not pitch in pattern-local space, so shrinking both double-counted
// and collapsed the tile to nothing.) patternTransform can't take a live
// calc()/var() the way stroke-width can, so it's recomputed imperatively
// here whenever S changes, not just once at creation — each def keeps its
// S=1 "base" transform (the flip/rotate part) in a data-base-transform
// attribute so this can be redone at any time.
//
// Read the current S for whichever <svg> `defs` actually belongs to: the
// live drawing's own defs sees .active-sketch's live-updated value (see
// utils.redrawCanvas); a caller-supplied local defs (e.g. a shape
// thumbnail's — see shapeThumbnail.js) sees that svg's own fixed value
// (1 — a thumbnail is never itself scaled/zoomed) via ordinary DOM
// ancestry. `defs` may not be attached to the document yet, so this reads
// the ancestor's own inline style directly rather than using
// getComputedStyle, which needs a connected element to resolve inheritance.
function getCurrentScale(defs) {
  const svgRoot = defs && defs.closest && defs.closest('svg')
  const S = svgRoot && parseFloat(svgRoot.style.getPropertyValue('--total-scale'))
  return S > 0 ? S : 1
}

function setPatternScale(patternEl, S) {
  const baseTransform = patternEl.getAttribute('data-base-transform') || ''
  patternEl.setAttribute('patternTransform', `scale(${1 / S}) ${baseTransform}`.trim())
}

// Called from utils.redrawCanvas whenever S changes, to keep every
// already-created fill-pattern def in the live drawing (not shape
// thumbnails — see getCurrentScale) at a constant apparent size.
export function updateFillPatternScale(S) {
  const canvas = document.querySelector('.active-sketch')
  if (!canvas) return
  canvas.querySelectorAll('defs pattern[data-base-transform]').forEach(patternEl => {
    setPatternScale(patternEl, S)
  })
}

// Cache the drawing's <defs> element rather than re-querying it on every
// call to ensureFillPatternDef — this runs on every fill-attribute render,
// including once per mousemove while dragging a rubber-band shape.
let cachedDefs = null
function getSketchDefs() {
  if (!cachedDefs || !cachedDefs.isConnected) {
    cachedDefs = document.querySelector('.active-sketch defs')
  }
  return cachedDefs
}

// Give each caller-supplied <defs> element (e.g. a shape thumbnail's own,
// local one — see shapeThumbnail.js) a stable, unique scope id the first
// time it's used, so its generated pattern ids can never collide with the
// live drawing's own, or another thumbnail's.
const defsScopes = new WeakMap()
let nextDefsScopeId = 0
function scopeIdFor(defs) {
  if (!defsScopes.has(defs)) {
    defsScopes.set(defs, nextDefsScopeId++)
  }
  return defsScopes.get(defs)
}

// Create the <pattern> def itself (tile-based, or cloned from the matching
// fill-pattern-btn) under `defs`, colored for `color`. Returns defId, or null
// if `pattern` has no known source. See ensureFillPatternDef for the flip
// note, and setPatternScale above for how its size stays constant on screen.
function createPatternDef(defs, defId, pattern, color) {
  const S = getCurrentScale(defs)
  const tile = fillPatternTiles[pattern]
  if (tile) {
    const patternEl = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    patternEl.setAttribute('id', defId)
    patternEl.setAttribute('width', tile.width)
    patternEl.setAttribute('height', tile.height)
    patternEl.setAttribute('patternUnits', 'userSpaceOnUse')
    patternEl.setAttribute('data-base-transform', 'scale(1,-1)')
    setPatternScale(patternEl, S)
    patternEl.innerHTML = tile.shapes(color)
    defs.appendChild(patternEl)
    return defId
  }

  const sourceId = fillPatternButtonIds[pattern]
  const sourcePattern = sourceId && document.getElementById(sourceId)
  if (!sourcePattern) return null
  const clonedPattern = sourcePattern.cloneNode(true)
  clonedPattern.setAttribute('id', defId)
  const sourceTransform = sourcePattern.getAttribute('patternTransform') || ''
  clonedPattern.setAttribute('data-base-transform', `scale(1,-1) ${sourceTransform}`.trim())
  setPatternScale(clonedPattern, S)
  recolorPatternDef(clonedPattern, color)
  defs.appendChild(clonedPattern)
  return defId
}

// Ensure a <pattern> def colored for this pattern+color combo exists,
// creating and caching it, by id, on first use. Returns the def's id, or
// null if there's nowhere to put it.
//
// `defs` defaults to the live drawing's own <defs>, the original behavior.
// Pass a different, caller-owned <defs> (e.g. a shape thumbnail's own) to
// keep generated pattern defs out of the live drawing entirely — that defs
// element may not be attached to the document yet, so in that case dedup is
// done by searching it directly rather than via document.getElementById.
//
// Drawing elements sit inside the model <g>'s matrix(1,0,0,-1,0,500) flip
// (the same reason text elements carry their own transform: scale(1,-1)).
// A pattern's tile content is drawn in that same flipped coordinate space,
// so without a compensating flip here, patterns render mirrored vertically
// — e.g. the diagonal hatch runs the wrong way. The menu-button previews
// aren't inside that flipped group, so their own pattern defs are left as
// drawn; this flip is applied only to the defs generated here for real
// drawing elements.
function ensureFillPatternDef(pattern, color, defs) {
  if (defs) {
    const defId = `fp-local${scopeIdFor(defs)}-${pattern}-${sanitizeForId(color)}`
    if (defs.querySelector(`#${defId}`)) { return defId }
    return createPatternDef(defs, defId, pattern, color)
  }
  const sketchDefs = getSketchDefs()
  if (!sketchDefs) return null
  const defId = `fp-${pattern}-${sanitizeForId(color)}`
  if (document.getElementById(defId)) return defId
  return createPatternDef(sketchDefs, defId, pattern, color)
}

function resolvePaint(color, pattern, defs) {
  if (!pattern || pattern === 'solid' || !color || color === 'none') { return color }
  const defId = ensureFillPatternDef(pattern, color, defs)
  return defId ? `url(#${defId})` : color
}

// Helper to create a DOM element. Exported for shapeThumbnail.js, which reuses
// it to render shape-library previews from parsed (but not yet inserted)
// elements. `defs` is where fill-pattern defs get written (see
// ensureFillPatternDef); omit it for the normal, live-drawing behavior.
export function createSvgElement(virtualElement, defs) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", virtualElement.tag)
  Object.entries(virtualElement.attrs).forEach(([key, value]) => {
    // Skip null/undefined attributes to avoid e.g. stroke-dasharray="null"
    if (value === null || value === undefined) { return }

    if (key === 'id') {
      // Use data-id to avoid conflicts with HTML element IDs
      element.setAttribute('data-id', value)
    } else if (key === 'fontsize') {
      element.style.fontSize = `calc(${value} / var(--scale))` // Keep font size consistent during zooming
    } else if (key === 'fill') {
      element.setAttribute('fill', resolvePaint(value, virtualElement.attrs.pattern, defs))
    } else {
      element.setAttribute(domKeys[key] || key, value)
    }
  })
  if (!nonStrokeTags.has(virtualElement.tag)) {
    element.setAttribute("vector-effect", "non-scaling-stroke")
  }
  if (virtualElement.children) {
    // Used for <td> elements inside <text> elements
    virtualElement.children.forEach(child => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child))
      } else {
        const childElement = createSvgElement(child, defs)
        element.appendChild(childElement)
      }
    })
  }
  if (virtualElement.tag === 'text') { syncLineStartX(element) }
  return element
}

// A multi-line text's line-start tspans (see text.js's getTspans; only they
// carry dy) must return to the text's x, or each line starts where the
// previous one ended. This is done on the DOM only, not in the virtual
// tspans, so the tools that move a text element need only change its attrs.x.
// Call it wherever a text's DOM x changes.
function syncLineStartX(textDomElement) {
  const x = textDomElement.getAttribute('x')
  textDomElement.querySelectorAll(':scope > tspan[dy]').forEach(tspan => {
    if (x === null) { tspan.removeAttribute('x') } else { tspan.setAttribute('x', x) }
  })
}

// Create a virtual representation of the drawing
export const defaultDwg = {
  tag: 'svg',
  attrs: {
    xmlns: "http://www.w3.org/2000/svg",
    // TODO: make width and height adjustable
    width: 720,
    height: 500,
    viewBox: "0 0 720 500",
    style: "display: inline;"
  },
  children: [
    { tag: 'title', attrs: { text: "Sketch" } }, // Title. User may overwrite.
    { tag: 'defs', attrs: {}, children: [] }, // for markers.
    { tag: 'g',
      attrs: { class: "model", transform: "matrix(1,0,0,-1,0,500)" },
      children: [
        { tag: 'g', attrs: { id: "shapes-layer" }, children: [] }, // Drawing elements go here
                                                                   // Also snap points for each child
        { tag: 'g', attrs: { id: "temporary-layer" }, children: [] } // Transient tool UI — see pushTempElement/clearTempElements below
      ]
    }
  ],
  tempEl: [],       // to hold temporary rubber band element while drawing
  model: null,      // to be set to the model space <g> DOM element of the actual SVG element
  maxId: 0,         // to track the highest numeric ID assigned to any element in the model
  meta: { scale: 1, unit: "px", frameWidth: 720, frameHeight: 500, deltaOriginX: 0, deltaOriginY: 0 }
}

// Put the elements of a new dimension string or arrow/label into a new group,
// as the innermost segment of each one's path.
function labelLeafGroup(dwg, elements, type) {
  const groupNum = dwgMgr.nextId(dwg)
  elements.forEach(element => {
    groups.setGroupPath(element, [...groups.groupPath(element), groupNum])
    if (type) { element.attrs['data-tool'] = type }
  })
}

// Methods for manipulating the virtual drawing and the actual SVG DOM.
export const dwgMgr = Object.freeze({
  // During intermediate steps of drawing, the temporary element is stored in tempEl.
  pushTemp(dwg, element) {
    dwg.tempEl.push(element)
    dwg.model.children[0].appendChild(createSvgElement(element))
  },
  // Discard the current rubber-band element, if any, and return it so the
  // caller can revise it and push it back (the click-click/multi-click
  // tools' per-frame update, and a resize-handle drag). Safe to call even
  // when nothing is pending, so it also serves as a plain "cancel" for
  // tools that don't need the returned element.
  popRubberBand(dwg, appState) {
    delete appState._moveState // From moveTool.js.
    if (dwg.tempEl.length === 0) { return null }
    dwg.model.children[0].lastElementChild.remove()
    return dwg.tempEl.pop()
  },
  getTemp(dwg) {
    if (dwg.tempEl.length === 0) { return null; }
    return dwg.tempEl[dwg.tempEl.length - 1];
  },

  // dwg.children[0] and dwg.children[1] are static elements (title and defs)
  // dwg.children[2] is the transform group, defining model coordinates
  // dwg.children[2].children[0].children, is where drawing elements go.
  //   These elements are the virtual representation of the drawing elements.
  //   These elements contain attrs for use in creating DOM elements.
  //   They also contain snap point data for each element, stored in element.segments.
  // dwg.children[2].children[1].children is the tracked subset of the
  //   temporary-layer's contents — see pushTempElement/clearTempElements below.
  // Below are methods for manipulating dwg.children[2].children[0].children, the dynamic part of the dwg.
  // The one counter for both element ids and group numbers (see groups.js).
  nextId(dwg) {
    dwg.maxId += 1
    return dwg.maxId
  },
  // `id` is given only by undo/redo, to give a restored element back its old id.
  pushChild(dwg, element, id = this.nextId(dwg)) {
    element.attrs.id = id
    dwg.model.children[0].appendChild(createSvgElement(element))
    addSnapPoints(element); // Note: snap points are added to the virtual element, not to DOM elements.
    addIntersectPointsForNewElement(dwg, element)
    dwg.children[2].children[0].children.push(element)
    return element.attrs.id;
  },
  insertChildAfter(dwg, element, afterId) {
    element.attrs.id = this.nextId(dwg)
    const i = dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(afterId))
    // E.g., erase splitting a line: the new piece stays in the original's groups.
    groups.inheritMembership(element, dwg.children[2].children[0].children[i])
    dwg.children[2].children[0].children.splice(i + 1, 0, element)
    const domElement = createSvgElement(element)
    // The shapes layer's DOM children match the element array one-for-one.
    const refNode = dwg.model.children[0].children[i + 1] || null
    dwg.model.children[0].insertBefore(domElement, refNode)
    addSnapPoints(element)
    addIntersectPointsForNewElement(dwg, element)
    return element.attrs.id;
  },
  // Push the members of a new leaf group (dimension string or arrow/label).
  // The new group becomes the innermost segment of each member's path.
  pushGroup(dwg, elements, type) {
    labelLeafGroup(dwg, elements, type)
    elements.forEach(element => this.pushChild(dwg, element))
  },
  // Like pushGroup, but virtual only, as pushElement is to pushChild. Used by
  // the parser, which must not touch the live drawing's DOM.
  pushElementGroup(dwg, elements, type) {
    labelLeafGroup(dwg, elements, type)
    elements.forEach(element => this.pushElement(dwg, element))
  },
  // Push elements from a parse into the live drawing. The parser numbered
  // their groups with its own counter, so renumber them from the live one.
  // With `wrap` (a library insert), a multi-element result is also placed in
  // a new outermost group.
  // `ids` (undo/redo only) gives each element back the id it had when its
  // history snapshot was recorded, so a selection survives the rebuild.
  adoptParsed(dwg, elements, wrap = false, ids = null) {
    const groupIdMap = {}
    const nextNumber = () => this.nextId(dwg)
    const outer = wrap && elements.length > 1 ? [nextNumber()] : []
    elements.forEach((element, i) => {
      const inner = groups.remapPath(groups.groupPath(element), groupIdMap, nextNumber)
      groups.setGroupPath(element, [...outer, ...inner])
      this.pushChild(dwg, element, ids ? ids[i] : undefined)
    })
  },
  // Change the group path of an element that's already drawn. Its DOM node
  // carries data-group too, so keep that in step.
  setGroupPath(dwg, element, path) {
    groups.setGroupPath(element, path)
    const domEl = this.getDomChildById(dwg, element.attrs.id)
    if (!domEl) { return }
    const value = element.attrs['data-group']
    if (value === undefined) {
      domEl.removeAttribute('data-group')
    } else {
      domEl.setAttribute('data-group', value)
    }
  },
  // Move `members` into one unbroken run in the element array (and the DOM),
  // ending where the topmost of them is now. They keep their relative order.
  // Elements that were between them end up below the run, so grouping never
  // sends anything that was on top further down.
  gatherAtTop(dwg, members) {
    const kids = dwg.children[2].children[0].children
    const memberSet = new Set(members)
    const run = kids.filter(el => memberSet.has(el))
    if (run.length < 2) { return }
    const others = kids.filter(el => !memberSet.has(el))
    // Every other member is below the topmost one, so this is where the run
    // must start for the topmost member to keep its index.
    const start = kids.indexOf(run[run.length - 1]) - (run.length - 1)
    others.splice(start, 0, ...run)
    kids.splice(0, kids.length, ...others) // In place; others hold this array.
    const layer = dwg.model.children[0]
    const next = kids[start + run.length]
    const refNode = next ? this.getDomChildById(dwg, next.attrs.id) : null
    run.forEach(el => layer.insertBefore(this.getDomChildById(dwg, el.attrs.id), refNode))
  },
  pushElement(dwg, element) {
    // This method differs from pushChild in that it does not immediately
    // render a DOM element. It is used when editing the entire sketch at once;
    // we want to add all elements to the virtual representation first, then
    // render them all at once.
    addSnapPoints(element);
    addIntersectPointsForNewElement(dwg, element)
    dwg.children[2].children[0].children.push(element)
    return element.attrs.id
  },
  popChild(dwg) {
    const child = dwg.children[2].children[0].children.pop()
    dwg.model.children[0].lastElementChild.remove()
    return child
  },
  removeChild(dwg, id) {
    const element = dwg.model.children[0].querySelector(`[data-id="${id}"]`) // DOM element
    if (!element) { return }
    element.remove()
    const i = dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(id))
    if (i !== -1) { dwg.children[2].children[0].children.splice(i, 1) } // Remove from virtual representation
  },
  clearChildren(dwg) {
    dwg.children[2].children[0].children = [];
    dwg.model.children[0].innerHTML = ''
    // Resize handles (see resizeHandle.js) point at elements this wipes out,
    // so they'd otherwise be left dangling.
    dwg.children[2].children[1].children = [];
    dwg.model.children[1].innerHTML = ''
  },
  getChild(dwg, i) {
    return dwg.children[2].children[0].children[i];
  },
  getTopChild(dwg) {
    if (dwg.children[2].children[0].children.length === 0) { return null; }
    return dwg.children[2].children[0].children[dwg.children[2].children[0].children.length - 1];
  },
  getChildren(dwg) {
    return dwg.children[2].children[0].children
  },
  getChildById(dwg, id) {
    return dwg.children[2].children[0].children.find(child => String(child.attrs.id) === String(id))
  },
  getChildIndexById(dwg, id) {
    return dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(id))
  },
  swapChild(dwg, id, newElement, appState = null, domRefs = null) {
    const oldDomElement = dwg.model.children[0].querySelector(`[data-id="${id}"]`)
    const parent = oldDomElement.parentNode
    const i = dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(id))
    newElement.attrs.id = id
    // The replacement is often built from scratch; keep it in the old one's groups.
    groups.inheritMembership(newElement, dwg.children[2].children[0].children[i])
    dwg.children[2].children[0].children.splice(i, 1, newElement)
    const newDomElement = createSvgElement(newElement)
    parent.replaceChild(newDomElement, oldDomElement)
    addSnapPoints(newElement)
    if (appState) {
      // This is used when mirroring or rotating a rect or a text. Update the selection.
      const selectionIndex = appState.selection.findIndex(el => String(el.attrs.id) === String(id))
      if (selectionIndex !== -1) {
        appState.selection[selectionIndex] = newElement
      }
      const domElement = domRefs.model.querySelector(`[data-id="${newElement.attrs.id}"]`)
      domElement.classList.add('selected')
    }
    return newElement
  },
  reviseAttributesOfChild(dwg, id, newAttrs, newPoints = null, textProps = null) {
    const el = this.getChildById(dwg, id)
    if (!el) { return }
    const domEl = dwg.model.children[0].querySelector(`[data-id="${id}"]`)
    if (!domEl) { return }

    Object.entries(newAttrs).forEach(([key, value]) => {
      if (key === 'id') { return }

      // Update virtual attrs
      el.attrs[key] = value

      // 'fill' needs paint resolution against 'pattern' (see resolvePaint
      // above); handle it after this loop, once both are settled. 'pattern'
      // itself is still written below like any other plain bookkeeping attr.
      if (key === 'fill') { return }

      const domKey = domKeys[key] || key

      // IMPORTANT: remove attributes instead of setting "null"
      if (value === null || value === undefined) {
        domEl.removeAttribute(domKey)
      } else {
        domEl.setAttribute(domKey, value)
      }
    })

    if ('fill' in newAttrs || 'pattern' in newAttrs) {
      const paint = resolvePaint(el.attrs.fill, el.attrs.pattern)
      if (paint === null || paint === undefined) {
        domEl.removeAttribute('fill')
      } else {
        domEl.setAttribute('fill', paint)
      }
    }

    if (el.tag === 'text' && 'x' in newAttrs) { syncLineStartX(domEl) }

    if (newPoints) {
      el.points = newPoints // for paths and polygons
    } else if (textProps) {
      Object.entries(textProps).forEach(([key, value]) => {
        // For position, modelPoint, and boundingBox, we update the virtual element only.
        el[key] = value
      })
    }
    addSnapPoints(el)
  },
  getDomChildById(dwg, id) {
    return dwg.model.children[0].querySelector(`[data-id="${id}"]`)
  },
  moveToFront(dwg, id) {
    const element = dwg.model.children[0].querySelector(`[data-id="${id}"]`)
    if (element) {
      element.parentNode.appendChild(element)
      const i = dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(id))
      if (i !== -1) {
        const child = dwg.children[2].children[0].children.splice(i, 1)[0]
        dwg.children[2].children[0].children.push(child)
      }
    }
  },
  moveToBack(dwg, id) {
    const element = dwg.model.children[0].querySelector(`[data-id="${id}"]`)
    if (element) {
      element.parentNode.insertBefore(element, element.parentNode.firstChild)
      const i = dwg.children[2].children[0].children.findIndex(child => String(child.attrs.id) === String(id))
      if (i !== -1) {
        const child = dwg.children[2].children[0].children.splice(i, 1)[0]
        dwg.children[2].children[0].children.unshift(child)
      }
    }
  },
  // dwg.model.children[1] ("temporary-layer") holds transient, tool-specific
  // UI that outlives a single rubber-band frame: dimension points
  // (dimensionTool.js), the trim reference line (trimTool.js), and resize
  // handles' corner/endpoint marks (resizeHandle.js) are tracked here via
  // pushTempElement/clearTempElements so they can be read back as data (e.g.
  // dimensionTool reads the dots' cx/cy to build the dimension string). The
  // move/duplicate drag preview (moveTool.js) and the shape-library insert
  // preview (shapePreview.js) are appended directly to the same DOM node —
  // they're never read back, so they skip the tracked array — and are wiped
  // by the same clearTempElements() call. All of the above are mutually
  // exclusive, since only one tool is ever active at a time. Expand this
  // list if a new kind of temporary tool UI is ever added.
  pushTempElement(dwg, element) {
    dwg.model.children[1].appendChild(createSvgElement(element))
    dwg.children[2].children[1].children.push(element)
  },
  clearTempElements(dwg) {
    dwg.model.children[1].innerHTML = ''
    dwg.children[2].children[1].children = [];
  }
})
