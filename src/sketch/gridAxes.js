// gridAxes.js
// Sketch versions of the `grid` and `axes` statements in Hurmet's draw.js.
// They aren't drawing elements. parse.js keeps each statement in
// appState.backdrop, stringify.js writes it back after the header, and render()
// draws it, from the frame and scene, in #backdrop-layer, beneath the shapes.
// No tool can pick, snap to, or change what's in that layer.
// As in Hurmet, stroke widths, tick lengths, and font sizes are in px. They
// don't change with the scale. Everything else is in model units.

import { elementObject } from "./elementObject.js"
import { text } from "./text.js"
import { createSvgElement } from "./dwg.js"

const eps = 1e-9

// Drop floating-point noise, e.g. 3 * 0.1 = 0.30000000000000004, from the source.
const round = v => Number(v.toPrecision(12))

// The frame's limits, in model units.
const frameLimits = appState => {
  const S = appState.scaleFactor
  return {
    xmin: round(-appState.deltaOriginX),
    xmax: round(appState.frameWidth / S - appState.deltaOriginX),
    ymin: round(-appState.deltaOriginY),
    ymax: round(appState.frameHeight / S - appState.deltaOriginY)
  }
}

// The multiples of `step` between lo and hi. `inclusive` says whether lo and hi
// themselves count. Hurmet clips at the frame edge, so lines stay strictly inside.
const multiples = (step, lo, hi, inclusive) => {
  const kmin = inclusive ? Math.ceil(lo / step - eps) : Math.floor(lo / step + eps) + 1
  const kmax = inclusive ? Math.floor(hi / step + eps) : Math.ceil(hi / step - eps) - 1
  const values = []
  for (let k = kmin; k <= kmax; k++) { values.push(round(k * step)) }
  return values
}

const lineStyle = (appState, stroke) => ({
  ...appState, stroke, strokewidth: 0.5, linetype: "solid", marker: "none", fill: "none"
})

const line = (p, q, style) => elementObject("line", [p, q], style)

// Hurmet: grid dx, dy. Grey lines every dx and dy model units, through the origin.
const gridLines = (appState, dx = 1, dy = dx) => {
  const { xmin, xmax, ymin, ymax } = frameLimits(appState)
  const style = lineStyle(appState, "grey")
  return [
    ...multiples(dx, xmin, xmax, false).map(x => line([x, ymin], [x, ymax], style)),
    ...multiples(dy, ymin, ymax, false).map(y => line([xmin, y], [xmax, y], style))
  ]
}

// Hurmet: axes dx, dy, "labels", gdx, gdy
// Axis lines through the origin, with a tick every dx and dy model units.
// "labels" writes a number at each tick. gdx and gdy add a grid.
const axesElements = (appState, dx = 1, dy = dx, labels = false, gdx, gdy) => {
  const S = appState.scaleFactor
  const { xmin, xmax, ymin, ymax } = frameLimits(appState)
  const fontsize = Math.min(dx * S / 2, dy * S / 2, 10) // px
  const tick = fontsize / 4 / S // Half the tick length, in model units
  const style = lineStyle(appState, "black")
  const elements = gdx === undefined ? [] : gridLines(appState, gdx, gdy)

  // An axis outside the frame isn't drawn. Neither are its ticks.
  if (ymin <= 0 && 0 <= ymax) {
    elements.push(line([xmin, 0], [xmax, 0], style))
    for (const x of multiples(dx, xmin, xmax, false)) {
      if (x !== 0) { elements.push(line([x, -tick], [x, tick], style)) }
    }
  }
  if (xmin <= 0 && 0 <= xmax) {
    elements.push(line([0, ymin], [0, ymax], style))
    for (const y of multiples(dy, ymin, ymax, false)) {
      if (y !== 0) { elements.push(line([-tick, y], [tick, y], style)) }
    }
  }

  if (labels) {
    // If an axis is outside the frame, its labels go along the frame's edge.
    const lx = xmin > 0 || xmax < 0 ? xmin : 0
    const ly = ymin > 0 || ymax < 0 ? ymin : 0
    const textStyle = {
      ...appState, fontsize, fontcolor: "black", fontweight: "normal", fontstyle: "normal"
    }
    // Hurmet's digit count, floored at zero so a big step can't throw.
    const digits = step => Math.max(0, Math.floor(1.1 - Math.log10(step)) + 1)
    const label = (value, point, position, step) => text.createTextElement(
      String(Number(value.toFixed(digits(step)))),
      { x: point[0], y: point[1] },
      { ...textStyle, textposition: position }
    )
    for (const x of multiples(dx, xmin, xmax, true)) {
      if (x !== 0) { elements.push(label(x, [x, ly], ly === 0 ? "below" : "above", dx)) }
    }
    for (const y of multiples(dy, ymin, ymax, true)) {
      if (y !== 0) { elements.push(label(y, [lx, y], lx === 0 ? "left" : "right", dy)) }
    }
  }
  return elements
}

// The elements that draw one backdrop statement, { command, args }.
// appState's deltaOriginX and deltaOriginY must be the scene's origin.
const statementElements = (appState, { command, args }) => command === "grid"
  ? gridLines(appState, ...args)
  : axesElements(appState, args[0], args[1], args[2] === "labels", args[3], args[4])

// Redraw #backdrop-layer from appState.backdrop. The grid and axes fill the
// frame that the `scene` origin places, not the current (panned) view.
const render = (appState, domRefs) => {
  const layer = domRefs.backdrop
  if (!layer) { return }
  layer.replaceChildren()
  if (!appState.backdrop || appState.backdrop.length === 0) { return }
  const sceneState = {
    ...appState, deltaOriginX: appState.sceneOriginX, deltaOriginY: appState.sceneOriginY
  }
  const defs = domRefs.canvas.querySelector('defs')
  for (const statement of appState.backdrop) {
    for (const element of statementElements(sceneState, statement)) {
      layer.appendChild(createSvgElement(element, defs))
    }
  }
}

export const gridAxes = Object.freeze({ gridLines, axesElements, statementElements, render })
