import { dwgMgr } from './dwg.js'
import { text } from './text.js'
import { groups } from './groups.js'
import { path, ellipseTransform, elementObject } from './elementObject.js'
import { freehandPathD } from './freehandMath.js'
import { dimensionDefinition } from './stringify.js'
import { isElliptical, pathRows } from './arcStep.js'

// Isometric projection. Turn a selection drawn as an orthographic view (a
// plan, a front elevation, or a right-side elevation) into one face of an
// isometric drawing, in place. It's a true 120° isometric at full scale, so a
// distance measured along an isometric axis is the real distance.
//
// Each face is a linear map, in model coordinates (y up), written as the
// images of the unit x and y vectors of the orthographic view:
//   x' = a·x + b·y
//   y' = c·x + d·y
// The front view goes on the left face and the right-side view on the right
// face, with all three faces meeting at the near corner.
const C = Math.cos(Math.PI / 6)
const S = 0.5
const faces = Object.freeze({
  top: { a: C, b: C, c: -S, d: S },   // plan x → down-right, plan y → up-right
  left: { a: C, b: 0, c: -S, d: 1 },  // front view x → down-right, y → up
  right: { a: C, b: 0, c: S, d: 1 }   // right-side view x → up-right, y → up
})

// Apply face matrix m to a vector.
const mapVector = (m, v) => ({ x: m.a * v.x + m.b * v.y, y: m.c * v.x + m.d * v.y })

// The direction, in degrees, that a direction of `deg` degrees maps to.
const mapAngle = (m, deg) => {
  const rad = deg * Math.PI / 180
  const v = mapVector(m, { x: Math.cos(rad), y: Math.sin(rad) })
  return Math.atan2(v.y, v.x) * 180 / Math.PI
}

// The image of an ellipse (radii rx, ry, rotated `angle` degrees CCW) under
// m, as a new { rx, ry, angle }. The ellipse is the image of the unit circle
// under A = M·R(angle)·diag(rx, ry), so its radii are the square roots of
// the eigenvalues of A·Aᵀ, and its major axis is the eigenvector of the
// larger one.
export const mapEllipse = (m, rx, ry, angle) => {
  const rad = (angle || 0) * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // Columns of A: the images of the ellipse's two semi-axes.
  const p = mapVector(m, { x: rx * cos, y: rx * sin })
  const q = mapVector(m, { x: -ry * sin, y: ry * cos })
  // A·Aᵀ = [[s11, s12], [s12, s22]]
  const s11 = p.x * p.x + q.x * q.x
  const s12 = p.x * p.y + q.x * q.y
  const s22 = p.y * p.y + q.y * q.y
  const mean = (s11 + s22) / 2
  const spread = Math.hypot((s11 - s22) / 2, s12)
  const newAngle = Math.atan2(2 * s12, s11 - s22) / 2 * 180 / Math.PI
  return {
    rx: Math.sqrt(mean + spread),
    ry: Math.sqrt(Math.max(mean - spread, 0)),
    // Round away floating-point noise, so 60 isn't written as 59.99999999999999.
    angle: Number(newAngle.toPrecision(12))
  }
}

// A path arc step's r (see arcStep.js) after projection. A circular arc
// becomes an elliptical one.
const mapArcR = (m, r) => {
  const [signedRx, ry, angle] = isElliptical(r) ? r : [r, Math.abs(r), 0]
  const e = mapEllipse(m, Math.abs(signedRx), ry, angle)
  return [Math.sign(signedRx) * e.rx, e.ry, e.angle]
}

// The center of the extreme x and y coordinates of the elements.
const selectionCenter = elements => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const include = (x, y) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  elements.forEach(el => {
    const a = el.attrs
    switch (el.tag) {
      case 'line':
        include(a.x1, a.y1)
        include(a.x2, a.y2)
        break
      case 'rect':
        include(a.x, a.y)
        include(a.x + a.width, a.y + a.height)
        break
      case 'circle':
        include(a.cx - a.r, a.cy - a.r)
        include(a.cx + a.r, a.cy + a.r)
        break
      case 'ellipse': {
        // Half-widths of the (possibly rotated) ellipse's bounding box.
        const rad = (el.angle || 0) * Math.PI / 180
        const hw = Math.hypot(a.rx * Math.cos(rad), a.ry * Math.sin(rad))
        const hh = Math.hypot(a.rx * Math.sin(rad), a.ry * Math.cos(rad))
        include(a.cx - hw, a.cy - hh)
        include(a.cx + hw, a.cy + hh)
        break
      }
      case 'polygon':
      case 'path':
        el.points.forEach(pt => include(pt.x, pt.y))
        break
      case 'text':
        include(el.modelPoint.x, el.modelPoint.y)
        break
    }
  })
  if (minX === Infinity) { return null }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

// Keep a text's shape; only move its anchor to `point`, and optionally give
// it a new position relative to that anchor.
const placeText = (el, point, appState, position = el.position) => {
  position = position.toLowerCase()
  if (position === el.position) {
    return text.moveText(el.text, el, point.x - el.modelPoint.x, point.y - el.modelPoint.y, appState.scaleFactor)
  }
  const localAppState = {
    ...appState,
    fontfamily: el.attrs.fontfamily,
    fontsize: parseFloat(el.attrs.fontsize) || 13.33,
    fontweight: el.attrs.fontweight,
    fontstyle: el.attrs.fontstyle,
    fontcolor: el.attrs.fill,
    textposition: position
  }
  const newEl = text.createTextElement(el.text, point, localAppState)
  newEl.attrs = { ...el.attrs, ...newEl.attrs }
  return newEl
}

// A closed path through `points`, carrying over `el`'s attrs other than those
// in `drop`. For a rect or polygon, which can't stay a rect or a regular
// polygon once projected.
const closedPath = (el, points, drop) => {
  const pathElement = path([...points, points[0]].map(pt => [pt.x, pt.y]), { stroke: 'none', strokewidth: 1 })
  const attrs = { ...el.attrs }
  drop.forEach(key => delete attrs[key])
  pathElement.attrs = { ...attrs, d: pathElement.attrs.d }
  return pathElement
}

// The label position a reloaded arrow statement would give its note (see
// elementObject.js's arrowGroup), so the projected arrow reloads unchanged.
const arrowNotePosition = points => {
  const dx = points[1].x - points[0].x
  const dy = points[1].y - points[0].y
  return Math.abs(dy) > Math.abs(dx)
    ? (dy > 0 ? 'below' : 'above')
    : (dx > 0 ? 'leaderLeft' : 'leaderRight')
}

// The projected replacement for one element, or null if it can't be projected.
const projectElement = (el, project, m, appState) => {
  switch (el.tag) {
    case 'line': {
      const p1 = project({ x: el.attrs.x1, y: el.attrs.y1 })
      const p2 = project({ x: el.attrs.x2, y: el.attrs.y2 })
      const newEl = structuredClone(el)
      Object.assign(newEl.attrs, { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      return newEl
    }
    case 'rect': {
      const { x, y, width, height } = el.attrs
      const corners = [
        { x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }
      ].map(project)
      return closedPath(el, corners, ['x', 'y', 'width', 'height'])
    }
    case 'polygon':
      return closedPath(el, el.points.map(project), ['points'])
    case 'circle':
    case 'ellipse': {
      const center = project({ x: el.attrs.cx, y: el.attrs.cy })
      if (el.attrs['data-dot'] !== undefined) {
        // A dot is a mark of fixed size, so it moves but stays round.
        const newEl = structuredClone(el)
        Object.assign(newEl.attrs, { cx: center.x, cy: center.y })
        return newEl
      }
      const { rx, ry, angle } = el.tag === 'circle'
        ? mapEllipse(m, el.attrs.r, el.attrs.r, 0)
        : mapEllipse(m, el.attrs.rx, el.attrs.ry, el.angle)
      const attrs = { ...el.attrs }
      delete attrs.r
      return {
        tag: 'ellipse',
        angle,
        attrs: {
          ...attrs,
          cx: center.x,
          cy: center.y,
          rx,
          ry,
          transform: ellipseTransform(center.x, center.y, angle)
        }
      }
    }
    case 'path': {
      if (el.attrs['data-freehand']) {
        const points = el.points.map(project)
        const newEl = structuredClone(el)
        newEl.points = points
        newEl.attrs.d = freehandPathD(points)
        return newEl
      }
      // Every face keeps the drawing's handedness, so an arc keeps its
      // direction: the sign of its (x) radius carries over.
      const points = el.points.map(pt => ({ ...project(pt), r: pt.r ? mapArcR(m, pt.r) : 0 }))
      const newEl = structuredClone(el)
      newEl.points = points
      newEl.attrs.d = path(pathRows(points), { stroke: 'none', strokewidth: 1 }).attrs.d
      return newEl
    }
    case 'text':
      return placeText(el, project(el.modelPoint), appState)
    default:
      return null // e.g., image
  }
}

// Replace the members of a group, in order, with `newElements`. The new ones
// inherit the old ones' group paths (see dwgMgr.swapChild).
export const replaceMembers = (dwg, oldMembers, newElements, appState, domRefs) => {
  const count = Math.min(oldMembers.length, newElements.length)
  for (let i = 0; i < count; i++) {
    dwgMgr.swapChild(dwg, oldMembers[i].attrs.id, newElements[i], appState, domRefs)
  }
  for (let i = count; i < oldMembers.length; i++) {
    dwgMgr.removeChild(dwg, oldMembers[i].attrs.id)
  }
  let afterId = newElements[count - 1]?.attrs.id
  for (let i = count; i < newElements.length; i++) {
    afterId = dwgMgr.insertChildAfter(dwg, newElements[i], afterId)
  }
}

const projectDimension = (members, project, m, appState) => {
  const def = dimensionDefinition(members)
  const points = def.points.map(([x, y]) => project({ x, y }))
  const labelPoint = project({ x: def.labelPoint[0], y: def.labelPoint[1] })
  // Keep the label text (the real dimension); a deleted label stays deleted.
  const labels = def.labels.map(label => label ?? "")
  const label = members.find(el => el.tag === 'text')
  const localAppState = { ...appState }
  if (label) {
    Object.assign(localAppState, {
      fontfamily: label.attrs.fontfamily,
      fontsize: parseFloat(label.attrs.fontsize) || appState.fontsize,
      fontweight: label.attrs.fontweight,
      fontstyle: label.attrs.fontstyle,
      fontcolor: label.attrs.fill
    })
  }
  return elementObject("dimension", [
    [...points.map(pt => [pt.x, pt.y]), [labelPoint.x, labelPoint.y]],
    labels,
    mapAngle(m, def.dimAngle),
    mapAngle(m, def.extAngle)
  ], localAppState)
}

// Project `elements` (whole groups, in array order) onto an isometric face,
// about the center of their extents. Returns a list of what was skipped.
export const projectIsometric = (face, elements, appState, domRefs, dwg) => {
  const m = faces[face]
  const center = selectionCenter(elements)
  const skipped = []
  if (!center) { return skipped }
  const project = pt => {
    const v = mapVector(m, { x: pt.x - center.x, y: pt.y - center.y })
    return { x: center.x + v.x, y: center.y + v.y }
  }
  // Dimension strings and arrow/label pairs are projected as a whole.
  const leafGroups = new Map()
  elements.forEach(el => {
    if (groups.isLeafGroupMember(el)) {
      const path = groups.groupPath(el)
      const key = path[path.length - 1]
      if (!leafGroups.has(key)) { leafGroups.set(key, []) }
      leafGroups.get(key).push(el)
    }
  })
  leafGroups.forEach(members => {
    if (members.every(el => el.tag === 'text')) {
      // A dimension or arrow label copied without the rest of it.
      members.forEach(el => dwgMgr.swapChild(dwg, el.attrs.id, projectElement(el, project, m, appState), appState, domRefs))
    } else if (members[0].attrs['data-tool'] === 'dimension') {
      const newMembers = projectDimension(members, project, m, appState)
      if (newMembers) {
        replaceMembers(dwg, members, newMembers, appState, domRefs)
      } else {
        skipped.push('dimension string')
      }
    } else if (members[0].attrs['data-tool'] === 'dot') {
      // A dot and its label: each keeps its size and moves to its projected point.
      members.forEach(el => {
        const newEl = el.tag === 'text'
          ? placeText(el, project(el.modelPoint), appState)
          : projectElement(el, project, m, appState)
        dwgMgr.swapChild(dwg, el.attrs.id, newEl, appState, domRefs)
      })
    } else {
      // An arrow and its note
      const arrow = members.find(el => el.tag === 'path')
      const newArrow = projectElement(arrow, project, m, appState)
      if (!newArrow) {
        skipped.push('arrow')
        return
      }
      dwgMgr.swapChild(dwg, arrow.attrs.id, newArrow, appState, domRefs)
      members.filter(el => el.tag === 'text').forEach(note => {
        const newNote = placeText(note, project(note.modelPoint), appState, arrowNotePosition(newArrow.points))
        dwgMgr.swapChild(dwg, note.attrs.id, newNote, appState, domRefs)
      })
    }
  })
  elements.filter(el => !groups.isLeafGroupMember(el)).forEach(el => {
    const newEl = projectElement(el, project, m, appState)
    if (newEl) {
      dwgMgr.swapChild(dwg, el.attrs.id, newEl, appState, domRefs)
    } else {
      skipped.push(el.tag)
    }
  })
  return skipped
}
