import { text } from './text.js'
import { utils } from './utils.js'
import { path, ellipseTransform } from './elementObject.js'
import { refreshImageStyle } from './importImage.js'
import { freehandPathD } from './freehandMath.js'
import { mirrorR } from './arcStep.js'

const mirrorPointAcrossLine = (p, line) => {
  // p: { x, y }, line: { x1, y1, x2, y2 }
  const A = line.y2 - line.y1
  const B = line.x1 - line.x2
  const C = line.x2 * line.y1 - line.x1 * line.y2
  const D = (A * p.x + B * p.y + C) / (A * A + B * B)
  const mx = p.x - 2 * A * D
  const my = p.y - 2 * B * D
  return { x: mx, y: my, r: p.r }
}

// A copy of attrs without the given keys.
const withoutKeys = (attrs, keys) => Object.fromEntries(Object.entries(attrs).filter(([k]) => !keys.includes(k)))

export const mirror = (appState, refLine, dwg, dwgMgr, domRefs) => {
  const groupIdMap = {}
  const newSelection = [];
  appState.selection.forEach(el => {
    switch (el.tag) {
      case 'line': {
        // Compute mirrored endpoints.
        const pt1 = mirrorPointAcrossLine(
          el.endPoints[0],
          refLine
        )
        const pt2 = mirrorPointAcrossLine(
          el.endPoints[1],
          refLine
        )
        const newLineElement = structuredClone(el)
        newLineElement.attrs.x1 = pt1.x
        newLineElement.attrs.x2 = pt2.x
        newLineElement.attrs.y1 = pt1.y
        newLineElement.attrs.y2 = pt2.y
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, newLineElement, groupIdMap)
          newSelection.push(newLineElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, newLineElement, appState, domRefs)
        }
        break
      }
      case 'rect': {
        const corners = [
          { x: el.attrs.x, y: el.attrs.y },
          { x: el.attrs.x + el.attrs.width, y: el.attrs.y },
          { x: el.attrs.x + el.attrs.width, y: el.attrs.y + el.attrs.height },
          { x: el.attrs.x, y: el.attrs.y + el.attrs.height },
          { x: el.attrs.x, y: el.attrs.y } // Close the rectangle by repeating the first corner
        ];
        const mirroredCorners = corners.map(corner => mirrorPointAcrossLine(corner, refLine))
        // Convert to points array for path creation
        const points = mirroredCorners.map(corner => [corner.x, corner.y, el.attrs.r || 0]);
        // Create new path element, with all of the rect's own attrs
        // (stroke, width, dash, fill, groups…) except its geometry.
        const pathElement = path(points, appState)
        pathElement.attrs = { ...withoutKeys(el.attrs, ['x', 'y', 'width', 'height']), d: pathElement.attrs.d }
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, pathElement, groupIdMap)
          newSelection.push(pathElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, pathElement, appState, domRefs)
        }
        break
      }
      case 'circle': {
        const center = el.centroids[0];
        const mirroredCenter = mirrorPointAcrossLine(center, refLine)
        // Create new mirrored circle el.
        const newCircleElement = structuredClone(el)
        newCircleElement.attrs.cx = mirroredCenter.x
        newCircleElement.attrs.cy = mirroredCenter.y
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, newCircleElement, groupIdMap)
          newSelection.push(newCircleElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, newCircleElement, appState, domRefs)
        }
        break
      }
      case 'ellipse': {
        const center = el.centroids[0];
        const mirroredCenter = mirrorPointAcrossLine(center, refLine)
        const lineAngleDeg = Math.atan2(refLine.y2 - refLine.y1, refLine.x2 - refLine.x1) * (180 / Math.PI)
        // Reflecting a direction at angle φ across a line at angle α yields
        // 2α − φ (verified against horizontal/vertical mirror lines: a
        // horizontal line negates φ, a vertical line gives 180° − φ, both
        // match). Unlike image, an ellipse has no separate "mirrored"
        // handedness flag — rx/ry are symmetric, so only the orientation
        // angle needs to flip.
        const newAngle = (2 * lineAngleDeg - (el.angle || 0)) % 360
        // Create new mirrored ellipse el.
        const newEllipseElement = structuredClone(el)
        newEllipseElement.angle = newAngle
        newEllipseElement.attrs.cx = mirroredCenter.x
        newEllipseElement.attrs.cy = mirroredCenter.y
        newEllipseElement.attrs.transform = ellipseTransform(mirroredCenter.x, mirroredCenter.y, newAngle)
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, newEllipseElement, groupIdMap)
          newSelection.push(newEllipseElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, newEllipseElement, appState, domRefs)
        }
        break
      }
      case 'path': {
        if (el.attrs['data-freehand']) {
          // A freehand path's points have no 'r' (arc radius) and its 'd' is
          // cubic Beziers, not L/A — refit the curve from mirrored points
          // rather than reusing utils.pointsToD (line/arc only).
          const mirroredPoints = el.points.map(pt => {
            const m = mirrorPointAcrossLine(pt, refLine)
            return { x: m.x, y: m.y }
          })
          const freehandElement = {
            tag: 'path',
            attrs: {
              id: el.attrs.id,
              d: freehandPathD(mirroredPoints),
              stroke: el.attrs.stroke,
              'stroke-width': el.attrs['stroke-width'] || 1,
              'stroke-dasharray': el.attrs['stroke-dasharray'] || null,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              fill: 'none',
              'data-freehand': 1
            },
            points: mirroredPoints
          }
          if (appState.duplicateOnMove) {
            utils.pushDuplicate(dwg, dwgMgr, freehandElement, groupIdMap)
            newSelection.push(freehandElement)
          } else {
            dwgMgr.swapChild(dwg, el.attrs.id, freehandElement, appState, domRefs)
          }
          break
        }
        let mirroredPoints = el.points.map(pt => mirrorPointAcrossLine(pt, refLine))
        // A mirrored arc runs the other way; an elliptical one is reflected too.
        const lineAngleDeg = Math.atan2(refLine.y2 - refLine.y1, refLine.x2 - refLine.x1) * (180 / Math.PI)
        mirroredPoints = mirroredPoints.map(pt => ({ ...pt, r: mirrorR(pt.r, lineAngleDeg) }))
        const newD = utils.pointsToD(mirroredPoints)
        // Create new mirrored path el.
        const pathElement = structuredClone(el)
        pathElement.attrs.d = newD
        pathElement.points = mirroredPoints
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, pathElement, groupIdMap)
          newSelection.push(pathElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, pathElement, appState, domRefs)
        }
        break
      }
      case 'polygon': {
        const mirroredPoints = el.points.map(pt => mirrorPointAcrossLine(pt, refLine))
        const pointsAttr = mirroredPoints.map(pt => `${pt.x},${pt.y}`).join(' ')
        // Create new mirrored polygon el.
        const polygonElement = structuredClone(el)
        polygonElement.attrs.points = pointsAttr
        polygonElement.points = mirroredPoints
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, polygonElement, groupIdMap)
          newSelection.push(polygonElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, polygonElement, appState, domRefs)
        }
        break
      }
      case 'text': {
        const clone = structuredClone(el)
        const newModelPoint = mirrorPointAcrossLine(el.modelPoint, refLine)
        const newTextElement = text.mirrorText(clone.text, clone, newModelPoint, refLine, appState.scaleFactor)
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, newTextElement, groupIdMap)
          newSelection.push(newTextElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, newTextElement, appState, domRefs)
        }
        break
      }
      case 'image': {
        // An image can't be corner-remapped like `rect` (its pixel content
        // is fixed), so mirroring recomputes its position from the
        // reflected bounding-box center, and folds the reflection into its
        // local `style` transform alongside any existing rotation/mirror
        // state — see importImage.js for the derivation of these update
        // rules.
        const center = el.centroids[0]
        const mirroredCenter = mirrorPointAcrossLine(center, refLine)
        const lineAngleDeg = Math.atan2(refLine.y2 - refLine.y1, refLine.x2 - refLine.x1) * (180 / Math.PI)
        // Same y-axis-flip handedness reversal as the rotate tool (see
        // importImage.js) applies here too, so this branch is the mirror
        // image of clickTools.js's rotate case: ADD when already mirrored,
        // SUBTRACT when not.
        const newRotation = (el.rotation || 0) + (el.mirrored ? -2 * lineAngleDeg : 2 * lineAngleDeg)
        // Images can't be rotated (the rotate tool refuses them — see
        // clickTools.js) because a rotated box no longer matches the
        // axis-aligned corners recorded in the image's snap points, which
        // are also what the resize handle (resizeHandle.js) hit-tests
        // and anchors on. Mirroring across anything but a horizontal or
        // vertical reference line would land the image at a rotation other
        // than a multiple of 180°, reintroducing that same mismatch — so
        // skip the image rather than mirror it askew.
        const ANGLE_EPS = 1e-6
        const normalizedRotation = ((newRotation % 180) + 180) % 180
        if (normalizedRotation > ANGLE_EPS && normalizedRotation < 180 - ANGLE_EPS) {
          console.warn(`Mirror: skipped image #${el.attrs.id} — images can only be mirrored across a horizontal or vertical reference line.`)
          return
        }
        const newImageElement = structuredClone(el)
        newImageElement.attrs.x = mirroredCenter.x - el.attrs.width / 2
        newImageElement.attrs.y = mirroredCenter.y - el.attrs.height / 2
        newImageElement.rotation = newRotation
        newImageElement.mirrored = !el.mirrored
        refreshImageStyle(newImageElement)
        if (appState.duplicateOnMove) {
          utils.pushDuplicate(dwg, dwgMgr, newImageElement, groupIdMap)
          newSelection.push(newImageElement)
        } else {
          dwgMgr.swapChild(dwg, el.attrs.id, newImageElement, appState, domRefs)
        }
        break
      }
      default:
        alert(`Mirror is not yet supported for ${el.tag} elements.`)
        return
    }
  })
  if (appState.duplicateOnMove) {
    utils.updateSelection(newSelection, appState, domRefs)
  }
  // The caller, sketch.js's eventLoopBody, records history, rebuilds
  // intersect points, and refreshes the resize handles.
}