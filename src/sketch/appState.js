// appState.js

// Create an object to hold the application state.
// Populate with default values.
// This object will be updated as the user interacts with the application.
export const defaultAppState = {
  // The GUI canvas, in px; not the `frame` statement. It follows the window's size
  // (see utils.resizeCanvas). These are only the starting values.
  width: 720,
  height: 500,
  // The `frame` statement: the size, in px, Hurmet gives the rendered sketch.
  // It has no effect in the Sketch GUI. See utils.computeFrame.
  frameWidth: 720,
  frameHeight: 500,
  xmin: 0,
  xmax: 720,
  ymin: 0,
  ymax: 500,
  zoom: 1.0,
  deltaOriginX: 0,
  deltaOriginY: 0,
  // The origin offset from the last `scene` statement applied by Edit source.
  // Zoom | Reset returns to it. Panning and zooming change only deltaOrigin.
  sceneOriginX: 0,
  sceneOriginY: 0,
  polygonSides: 6,
  tool: "select",
  snap: "none",
  duplicateOnMove: false,
  // Sketch properties. Set in the Sketch Properties… dialog (src/sketchProperties.js).
  title: "Sketch",
  caption: false, // When true, Hurmet writes the title as a caption.
  position: "inline", // Where Hurmet places the sketch: inline, left or right (floats), or center. Written in `frame`.
  decimalFormat: "1,000,000.", // Thousands and decimal separators for dimension labels
  roundingSpec: "h3", // Hurmet rounding spec for dimension labels: f|r|h, then a digit count
  fraction: 16, // Denominator of the inch fractions in "ft-in" dimension labels: 8, 16, 32, or 64
  // The `grid` and `axes` statements, { command, args } each, in source order.
  // They aren't elements; src/gridAxes.js draws them in #backdrop-layer.
  backdrop: [],
  unit: "px",
  scale: 1, // Ratio of model to real world.
  //unitScaleFactor: ratio of user unit to px. E.g., "in" = 96.
  scaleFactor: 1, // scale * unitScaleFactor. Ratio of model unit to px.
  gridSize: 20,
  lock: "unlock",
  stroke: "black",
  strokewidth: 1,
  linetype: "solid", // solid, dashed, dotted, centterline, etc.
                     // Sets value of stroke-dasharray and endcap.
  fill: "none",
  pattern: "solid", // fill pattern: solid, diagonal, crosshatch, grid, dots, wood, sand, gravel
  fontcolor: "black",
  fontstyle: "normal",
  fontfamily: "sans-serif",
  fontsize: 13.33,
  fontweight: "normal",
  textposition: "middle",
  mirrorline: null,
  trimline: null,
  markerstrokewidth: 1,
  markerstroke: "black",
  markerfill: "yellow",
  markersize: 4,
  marker: "none",
  dotradius: 4,
  axesstroke: "black",
  gridstroke: "grey",
  firstpoint: null,
  firstclick: null,
  tempel: null,
  freehandPoints: null, // Raw points captured mid-stroke by the freehand tool (src/freehandTool.js)
  referenceLine: null,
  selection: [],
  // True if the current selection was made by clicking a single element with
  // the select tool (as opposed to a window-select or Select All) — gates
  // whether resize handles appear (see resizeHandle.js).
  selectedByClick: false
}
