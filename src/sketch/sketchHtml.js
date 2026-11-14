// The Sketch dialog's markup and styles.
// Converted from Sketch's index.html <body> and sketch-styles.css, where Sketch
// owned the whole page. Inside Hurmet, the markup goes into <dialog id="sketch-dialog">
// (see sketch.js openSketch) and the styles are scoped to that dialog.

export const sketchCss = `
/* The dialog fills the window. */
#sketch-dialog {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: none;
}

#sketch-dialog {
  margin: 0;
  font-size: 14pt;
}

/* Sketch covers the whole browser window: the palettes down the left edge, the menu
   across the top, the text input and coordinates across the bottom, and the canvas
   in the space left over. Below the minimum size, which suits a laptop, the window
   scrolls instead of shrinking the canvas further. */
.sketch-app {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  gap: 0.75em;
  padding: 0.75em;
  box-sizing: border-box;
  overflow: auto;
  background: #fff;
}

.palette-column {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto; /* For a short window */
}

.canvas-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 760px;
  min-height: 560px;
}

.sketch-container {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #fff;
  border: solid 1px #ccc;
  overflow: hidden;
}

#sketch {
  outline: none;
  /* Without this, a sustained touch/pen drag (e.g. the freehand tool) gets
     hijacked partway through as a scroll/pan gesture by the browser's touch
     gesture recognizer, which stops delivering pointermove events to us —
     the drag then "stops" and jumps straight to the liftoff point. Mouse
     and touchpad-as-mouse input isn't affected by touch-action, which is
     why this only shows up with a finger or stylus on a touchscreen. */
  touch-action: none;
  /* Shift+click is the browser's "extend text selection" gesture. Most tools
     start on pointerup and never preventDefault the pointerdown, so a
     Shift+click on the canvas (e.g. during Zoom Window) would highlight the
     SVG <text> elements, or everything back to a menu label. */
  user-select: none;
  -webkit-user-select: none;
}

.palette {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5em;
  margin-right: 1.5em;
  background: #f4f4f4;
  border-radius: 8px;
  padding: 0.75em 0.5em;
  box-shadow: 0 2px 8px #0001;
  height: fit-content;
}
.palette-column .palette {
  margin-right: 0; /* .sketch-app's gap separates the palettes from the canvas */
}

.palette-btn, #duplicate-mode-btn {
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 6px;
  padding: 0.25em;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.palette-btn:hover, .palette-btn.active {
  border-color: #0078d7;
  box-shadow: 0 0 4px #0078d733;
}

.palette-btn.active {
  background: #e6f2ff;
  border-width: 2px;
  box-shadow: 0 0 8px #0078d799;
}
#duplicate-mode-btn:hover {
  border-color: #0078d7;
  box-shadow: 0 0 4px #0078d733;
}
#duplicate-mode-btn.active {
  background: #efe9f8;
  border-color: #a893c8;
  color: #5f4f84;
  border-width: 2px;
  box-shadow:
    inset 0 0 0 1px #ffffff99,
    0 0 0 2px #a893c81a;
}
#duplicate-mode-btn.active:hover {
  background: #e9e1f5;
  border-color: #9f89c3;
  box-shadow:
    inset 0 0 0 1px #ffffff99,
    0 0 0 2px #9f89c326;
}

#tool-form {
  width: 235px;
}
#tool-form .palette {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}
#snap-form, #lock-form {
  width: 190px;
  margin-left: auto;
}

#stroke-options button.active,
#fill-options button.active {
  background: #e6f2ff;
}
.stroke-color-options button.active,
.fill-color-options button.active {
  border: 3px solid #0078d7;
}

.fill-pattern-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
}

.tool-btn {
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 6px;
  padding: 0.25em;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tool-btn:hover, .tool-btn.active {
  border-color: #0078d7;
  box-shadow: 0 0 4px #0078d733;
}

.tool-btn svg {
  width: 32px;
  height: 32px;
  pointer-events: none;
}

.snap-palette, .lock-palette, .view-palette {
  margin-top: 1em;
}

.snap-btn {
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 6px;
  padding: 0.25em;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.snap-btn:hover, .snap-btn.active {
  border-color: #0078d7;
  box-shadow: 0 0 4px #0078d733;
}

.snap-btn svg {
  width: 32px;
  height: 32px;
  pointer-events: none;
}

.key-hint {
  font-size: 10px;
  color: #666;
  display: block;
  text-align: center;
  margin-top: 2px;
}

.main-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1em;
  background: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  width: fit-content;
}

.menu-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.menu-heading {
  font-weight: bold;
  font-size: 0.8;
  margin-bottom: 0.5em;
  margin-top: 0.2em;
  cursor: pointer;
  padding: 0.2em 0.8em;
  border-radius: 5px;
  background: #f4f4f4;
  transition: background 0.2s;
  border: none;
  display: flex;
  height: 25px;
  align-items: center;
  gap: 0.5em;
}

.menu-caret {
  font-size: 0.8em;
  margin-left: 0.3em;
}

.menu-dropdown {
  display: none;
  flex-direction: column;
  position: absolute;
  top: 2.2em;
  left: 0;
  background: #fff;
  box-shadow: 0 2px 8px #0002;
  border-radius: 6px;
  z-index: 10;
  min-width: 120px;
  padding: 0.3em 0.5em;
}
.menu-edit {
  min-width: 150px;
}

/* A thin line between groups of menu buttons. */
.menu-separator {
  width: 100%;
  border: none;
  border-top: 1px solid #ccc;
  margin: 0.3em 0;
}

.menu-section.open .menu-dropdown {
  display: flex;
}

.menu-btn {
  background: none;
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0.15em 0;
  font-size: 12pt;
  color: #222;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.2s;
}

.keyed {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.shortcut {
  font-size: 0.8em;
  color: #888;
  margin-left: 1em;
  text-align: right;
  flex-shrink: 0;
  /* Prevents shortcut from wrapping */
  white-space: nowrap;
}

.menu-btn:hover {
  background: #e6f2ff;
  color: #0078d7;
}

/* Overlay menu-dialogs above the UI, without displacing layout */
.menu-dialog {
  display: none; /* Hidden by default */
  position: absolute;
  z-index: 1000;
  min-width: 220px;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 12px 16px;
  top: 40px; /* Adjust as needed for your menu bar */
  left: 0;
}

/* Show dialog when active (add .open via JS) */
.menu-dialog.open {
  display: block;
}

/* Sketch Properties… dialog */
.properties-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5em 0.75em;
  align-items: center;
}

.properties-grid select,
.properties-grid input[type="text"] {
  width: 100%;
  box-sizing: border-box;
}

/* Grey out a property's label along with its disabled control. */
.properties-grid label:has(+ select:disabled) {
  color: GrayText;
}

.properties-rounding {
  display: flex;
  gap: 0.25em;
}

.properties-grid #sketch-properties-rounding-digits {
  width: auto;
}

.properties-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
  margin-top: 0.75em;
}

.shape-library-heading {
  font-weight: bold;
  font-size: 0.8em;
  color: #888;
  margin: 0.6em 0 0.2em;
}

.shape-library-heading:first-child {
  margin-top: 0;
}

.shape-library-list {
  display: flex;
  flex-direction: column;
  max-height: 200px;
  overflow-y: auto;
}

.shape-library-list .shape-library-empty {
  font-size: 0.85em;
  color: #888;
  padding: 0.15em 0;
}

.shape-library-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shape-library-remove-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.9em;
  padding: 0 0.3em;
}

.shape-library-remove-btn:hover {
  color: #c00;
}

.shape-picker-dialog {
  max-width: 260px;
}

/* Grid (thumbnail) mode needs real room for 3 columns; list mode (above)
   keeps shrinking to content within max-width. */
.shape-picker-dialog:has(.shape-picker-grid) {
  width: 300px;
  max-width: none;
}

.shape-picker-grid {
  display: grid;
  /* minmax(0, 1fr), not bare 1fr: a bare 1fr track won't shrink below its
     content's natural size, which can push the grid wider than its
     container (and trigger a horizontal scrollbar) regardless of how much
     room the dialog itself has. */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5em;
  max-height: 320px;
  overflow-y: auto;
}

.shape-picker-list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
}

.shape-picker-btn {
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 6px;
  cursor: pointer;
  padding: 0.3em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
}

.shape-picker-btn:hover {
  border-color: #0078d7;
  background: #e6f2ff;
}

.shape-picker-list .shape-picker-btn {
  flex-direction: row;
  justify-content: flex-start;
  text-align: left;
}

.shape-thumbnail {
  width: 100%;
  height: 53px;
}

.shape-picker-label {
  font-size: 0.75em;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* Ensure parent is positioned for absolute children */
.menu-section {
  position: relative;
}

.menu-dropdown .menu-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 100px;
  /* Optional: adjust padding as needed */
}

.menu-dropdown .menu-btn .key-hint {
  font-size: 0.8em;
  color: #888;
  margin-left: 1em;
  text-align: right;
  flex-shrink: 0;
  /* Prevents key-hint from wrapping */
  white-space: nowrap;
}

.rotate {
  display: inline-block;
  transform: rotate(90deg);
  /* Optional: adjust origin if needed */
  transform-origin: center center;
}

.stroke-thickness-options {
  width: 270px;
}

.fill-color-options {
  width: 240px;
}

.stroke-color-btn, .fill-color-btn {
  width: 24px;
  height: 18px;
}

/* Flex row for text input and coordinate display */
#input-coord {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 8px;
  /* Room for a 4-row coordinate display (Measure adds the 4th row), so the canvas
     doesn't shrink when a Measure Distance occurs. 12pt × line-height 1.25 per row,
     plus borders. */
  min-height: calc(4 * 1.25 * 12pt + 4px);
}

#text-input-container {
  display: flex;
  flex-direction: column; /* Stack the input box and buttons vertically */
  align-items: flex-end; /* Align items to the right */
  position: relative; /* Ensure positioning context for child elements */
}

#text-input {
  width: 400px;
  min-height: 28px;
  font-size: 14pt;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px;
  margin-right: 0;
  white-space: pre-wrap; /* Show leading spaces, e.g. the indents inside group … end */
}

#text-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  visibility: hidden; /* Hidden, not removed, so the coordinate display doesn't shift */
}

#sketch-dialog:has(#tool-form .palette-btn.active[data-tool="text"]) #text-controls,
#input-coord:has(#input-ok.visible[data-scope="0"]) #text-controls {
  visibility: visible;
}

#text-position {
  margin-left: 0;
}

#input-ok,
#input-cancel {
  display: none; /* Initially invisible */
  padding: 0.2em 0.6em;
  margin: 0.1em;
  border: 1px solid black;
  border-radius: 4px;
  background-color: white;
  color: black;
  font-size: 0.8em;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

#ok-button-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 0.5em;
  width: 100%;
  padding-right: 0.5em;
  box-sizing: border-box;
}

#input-ok:hover,
#input-cancel:hover {
  background-color: black;
  color: white;
}

#input-ok:active,
#input-cancel:active {
  background-color: #333;
}

#input-ok.visible,
#input-cancel.visible {
  display: inline-block; /* Make visible when needed */
}

#coordinate-display {
  min-width: 170px;
  margin-left: auto;
  font-size: 12pt;
  line-height: 1.25; /* Fixed, so #input-coord's min-height matches 4 rows */
  border-collapse: collapse;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

#coordinate-display th,
#coordinate-display td {
  min-width:50px;
  padding: 0 2px 0 2px;
  margin: 0;
}

#coordinate-display th {
  border-bottom: 1px solid #222;
  font-weight: normal;
}

#coordinate-display th:nth-child(2),
#coordinate-display th:nth-child(3),
#coordinate-display td:nth-child(2),
#coordinate-display td:nth-child(3) {
  text-align: center;
}

/* Highlight selected SVG elements */
svg .selected {
  stroke: #0078d7 !important;
  stroke-width: 1.5px !important;
}
svg text.selected {
  fill: #0078d7 !important;
  stroke: 0.1px !important;
}
svg image.selected {
  /* <image> has no stroke to highlight, so use an outline instead. It's
     drawn as part of the element's own (transformed) box, so it still
     wraps a rotated/mirrored image correctly. */
  outline: 1.5px solid #0078d7;
  outline-offset: -1px;
}

#duplicate-mode-btn {
  background: #fff;
  border: 1px solid #cbbdde;
  color: #6a5a8e;
}

#duplicate-mode-btn:hover {
  background: #f8f5fc;
  border-color: #b4a2cf;
  box-shadow: 0 0 0 2px #b4a2cf22;
}

#duplicate-mode-btn.active {
  background: #efe9f8;
  border-color: #a893c8;
  color: #5f4f84;
  border-width: 2px;
  box-shadow:
    inset 0 0 0 1px #ffffff99,
    0 0 0 2px #a893c81a;
}

#duplicate-mode-btn.active:hover {
  background: #e9e1f5;
  border-color: #9f89c3;
  box-shadow:
    inset 0 0 0 1px #ffffff99,
    0 0 0 2px #9f89c326;
}`

export const sketchHtml = `
    <!-- Sketch fills the browser window. See .sketch-app in sketchCss above. -->
    <div class="sketch-app">
      <!-- Column for Tool Palette & Snap Palette -->
      <div class="palette-column">
        <!-- Tool Palette Form -->
        <form id="tool-form">
          <div class="palette">
            <button type="button" class="palette-btn active" title="Select&#10;Click or click-drag" data-tool="select" data-key="Escape">
              <svg width="32" height="32" viewBox="0 0 15 15">
                <path d="M3.29227 0.048984C3.47033 -0.032338 3.67946 -0.00228214 3.8274 0.125891L12.8587 7.95026C13.0134 8.08432 13.0708 8.29916 13.0035 8.49251C12.9362 8.68586 12.7578 8.81866 12.5533 8.82768L9.21887 8.97474L11.1504 13.2187C11.2648 13.47 11.1538 13.7664 10.9026 13.8808L8.75024 14.8613C8.499 14.9758 8.20255 14.8649 8.08802 14.6137L6.15339 10.3703L3.86279 12.7855C3.72196 12.934 3.50487 12.9817 3.31479 12.9059C3.1247 12.7201 3 12.6461 3 12.4414V0.503792C3 0.308048 3.11422 0.130306 3.29227 0.048984ZM4 1.59852V11.1877L5.93799 9.14425C6.05238 9.02363 6.21924 8.96776 6.38319 8.99516C6.54715 9.02256 6.68677 9.12965 6.75573 9.2809L8.79056 13.7441L10.0332 13.178L8.00195 8.71497C7.93313 8.56376 7.94391 8.38824 8.03072 8.24659C8.11753 8.10494 8.26903 8.01566 8.435 8.00834L11.2549 7.88397L4 1.59852Z"
                fill="#000000"></path>
              </svg>
              <span class="key-hint">Esc</span>
            </button>
            <button type="button" class="palette-btn" title="Pan&#10;Click-drag" data-tool="pan" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <g stroke-width="1" stroke="black" fill="none">
                  <path stroke="none" d="M0 0h24v24H0z"></path>
                  <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5"></path>
                  <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5"></path>
                  <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5"></path>
                  <path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"></path>
                </g>
              </svg>
            </button>
            <button type="button" class="palette-btn" title="Measure distance&#10;Click-click" data-tool="measure" data-key="D">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="14" rx="2" fill="#f5f5f5" stroke="#222" stroke-width="2"/>
                <line x1="8" y1="17" x2="8" y2="24" stroke="#222" stroke-width="1"/>
                <line x1="12" y1="19" x2="12" y2="24" stroke="#222" stroke-width="1"/>
                <line x1="16" y1="17" x2="16" y2="24" stroke="#222" stroke-width="1"/>
                <line x1="20" y1="19" x2="20" y2="24" stroke="#222" stroke-width="1"/>
                <line x1="24" y1="17" x2="24" y2="24" stroke="#222" stroke-width="1"/>
              </svg>
              <span class="key-hint">D</span>
            </button>
            <button type="button" class="palette-btn" title="Insert Image&#10;Write a URL, then click." data-tool="image" data-key="">
              <svg width="32" height="32" viewBox="-1 -1 18 18">
                <path fill="#000000" d="M14.998 2c0.001 0.001 0.001 0.001 0.002 0.002v11.996c-0.001 0.001-0.001 0.001-0.002 0.002h-13.996c-0.001-0.001-0.001-0.001-0.002-0.002v-11.996c0.001-0.001 0.001-0.001 0.002-0.002h13.996zM15 1h-14c-0.55 0-1 0.45-1 1v12c0 0.55 0.45 1 1 1h14c0.55 0 1-0.45 1-1v-12c0-0.55-0.45-1-1-1v0z"></path>
                <path fill="#000000" d="M13 4.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5 0.672-1.5 1.5-1.5 1.5 0.672 1.5 1.5z"></path>
                <path fill="#000000" d="M14 13h-12v-2l3.5-6 4 5h1l3.5-3z"></path>
              </svg>
            </button>
            <button type="button" class="palette-btn" title="Line&#10;Click-click" data-tool="line" data-key="L">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="6" y1="26" x2="26" y2="6" stroke="#222" stroke-width="2"/>
              </svg>
              <span class="key-hint">L</span>
            </button>
            <button type="button" class="palette-btn" title="Polyline&#10;Multi-click. Double-click to finalize." data-tool="polyline" data-key="W">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <path d="M4 12 L10 26 L16 12 L22 26" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
              <span class="key-hint">W</span>
            </button>
            <button type="button" class="palette-btn" title="Arc&#10;Click three points&#10;or write radius, then click twice" data-tool="arc" data-key="">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <path d="M6 26 A17 17 0 0 1 26 6" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
            </button>
            <button type="button" class="palette-btn" title="Freehand&#10;Click-drag to draw" data-tool="freehand" data-key="F">
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path d="M23 14.25A3.88 3.88 0 0 0 19.25 10C16.314 10 15 12.763 15 15.5a6.493 6.493 0 0 0 .95 3.516 7.005 7.005 0 0 1-4.905-1.566A3.255 3.255 0 0 1 10 15a9.084 9.084 0 0 1 1.555-3.894A8.31 8.31 0 0 0 13 7.5 2.276 2.276 0 0 0 10.5 5c-.919 0-1.795 1.072-2.81 2.314C6.714 8.511 5.498 10 4.5 10 3.684 10 2 9.51 2 8c0-1.848 2.703-4.028 4.002-5.076l.266-.215-.632-.775-.262.212C3.845 3.379 1 5.675 1 8c0 2.07 2.047 3 3.5 3 1.473 0 2.797-1.622 3.965-3.053C9.174 7.08 10.055 6 10.5 6c1.038 0 1.5.463 1.5 1.5a7.868 7.868 0 0 1-1.313 3.11A9.681 9.681 0 0 0 9 15a4.275 4.275 0 0 0 1.357 3.176A8.438 8.438 0 0 0 16.5 20c.072 0 .144-.001.215-.003a11.08 11.08 0 0 0 6.326 2.871l.167-.986a11.16 11.16 0 0 1-5.178-2.024A5.937 5.937 0 0 0 23 14.25zm-7 1.25c0-2.24 1.005-4.5 3.25-4.5.951 0 2.75.68 2.75 3.25a5.033 5.033 0 0 1-4.857 4.722A5.396 5.396 0 0 1 16 15.5z"/>
              </svg>
              <span class="key-hint">F</span>
            </button>
            <button type="button" class="palette-btn" title="Rectangle&#10;Click-click&#10;or write width, height; then click" data-tool="rect" data-key="R">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="6" y="6" width="20" height="20" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
              <span class="key-hint">R</span>
            </button>
            <button type="button" class="palette-btn" title="Oval&#10;Click-click&#10;or write diameter, then click" data-tool="oval" data-key="O">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <ellipse cx="16" cy="16" rx="10" ry="14" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
              <span class="key-hint">O</span>
            </button>
            <button type="button" class="palette-btn" title="Regular Polygon&#10;Write number of sides and radius, then click&#10;or write number of sides and click-click" data-tool="polygon" data-key="">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <polygon points="26,16 21,24 11,24 6,16 11,8 21,8" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Insert Shape from Library" data-tool="library" data-key="">
              <svg width="32" height="32" viewBox="-1 -1 18 18">
                <path fill="#000000" d="M16 15v-1h-1v-6h1v-1h-3v1h1v6h-3v-6h1v-1h-3v1h1v6h-3v-6h1v-1h-3v1h1v6h-3v-6h1v-1h-3v1h1v6h-1v1h-1v1h17v-1h-1z"></path>
                <path fill="#000000" d="M8 0h1l8 5v1h-17v-1l8-5z"></path>
              </svg>
            </button>
            <div id="shape-picker-dialog" class="menu-dialog shape-picker-dialog">
              <div id="shape-picker-grid" class="shape-picker-grid"></div>
            </div>
            <button type="button" class="palette-btn" title="Offset&#10;Write offset distance, then click" data-tool="offset" data-key="">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="4" y1="22" x2="22" y2="4" stroke="#222" stroke-width="0.5"/>
                <line x1="8" y1="28" x2="28" y2="8" stroke="#222" stroke-width="2"/>
              </svg>
            </button>
            <button type="button" class="palette-btn" title="Arrow&#10;Multi-click. Double-click to finalize. Text optional" data-tool="arrow" data-key="A">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <polygon points="2,22 6,18 6,26" transform="rotate(-45, 2, 18)" fill="#222"/>
                <path d="M6 20 L16 10 L28 10" stroke="#222" stroke-width="2" fill="none"/>
              </svg>
              <span class="key-hint">A</span>
            </button>
            <button type="button" class="palette-btn" title="Dimension String&#10;Multi-click on dim points.&#10;Double-click where dimensions should appear.&#10;(Shift key to align arrow with two dim points)" data-tool="dimension" data-key="S">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="6" y1="16" x2="26" y2="16" stroke="#222" stroke-width="2"/>
                <line x1="6" y1="10" x2="6" y2="26" stroke="#222" stroke-width="1"/>
                <line x1="26" y1="10" x2="26" y2="26" stroke="#222" stroke-width="1"/>
                <polygon points="6,16 10,12 10,20" fill="#222"/>
                <polygon points="26,16 22,12 22,20" fill="#222"/>
              </svg>
              <span class="key-hint">S</span>
            </button>
            <button type="button" class="palette-btn" title="Text&#10;Write in input box, then click" data-tool="text" data-key="T">
              <svg width="32" height="32" viewBox="0 0 51.04 49.47">
                <path d="M28.27,17.05H23.91V32.58h3.5a3,3,0,0,1,2,.54,2.27,2.27,0,0,1,.6,1.75,2.28,2.28,0,0,1-.6,1.77,2.92,2.92,0,0,1-2,.55H15a2.89,2.89,0,0,1-2-.55,2.28,2.28,0,0,1-.6-1.77,2.29,2.29,0,0,1,.59-1.76,3,3,0,0,1,2-.53h3.5V17.05H14.19l-.13,4.23v.52a2.14,2.14,0,0,1-.55,1.56,2.07,2.07,0,0,1-1.53.56,2.27,2.27,0,0,1-1.72-.59,2.72,2.72,0,0,1-.55-1.89v-.16l.23-6.23c0-1.24.21-2,.51-2.23a3.06,3.06,0,0,1,1.82-.37H30.18a3,3,0,0,1,1.82.37c.3.25.48,1,.53,2.23l.21,6.23v.16a2.8,2.8,0,0,1-.52,1.9,2.16,2.16,0,0,1-1.69.58,2,2,0,0,1-1.61-.57,3.4,3.4,0,0,1-.53-2.07Z"/>
              </svg>
              <span class="key-hint">T</span>
            </button>

            <button type="button" id="duplicate-mode-btn" title="Duplicate&#10;Toggle switch to control move/duplicate mode for move, rotate, and mirror tools." data-tool="duplicate" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="0.5" y="7" width="6.5" height="10" fill="none" stroke="#222" stroke-width="1"/>
                <rect x="17" y="7" width="6.5" height="10" fill="none" stroke="#222" stroke-width="1"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" id="move-button" class="palette-btn" title="Move selected elements&#10;Click-click&#10;or write Δx, Δy; then click this button " data-tool="move" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <!-- Left rectangle dashed, arrow to right rectangle -->
                <rect x="0.5" y="7" width="6.5" height="10" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="2 1.5"/>
                <rect x="17" y="7" width="6.5" height="10" fill="none" stroke="#222" stroke-width="1"/>
            
                <line x1="7.6" y1="12" x2="16.9" y2="12" stroke="#222" stroke-width="1" stroke-linecap="round"/>
                <polygon points="16,12 13.6,9.8 13.6,14.2" fill="#222"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Rotate selected elements&#10;Write an angle and click" data-tool="rotate" data-key="">
              <svg width="24" height="24" viewBox="0 0 20 20">
                <path d="M10 4 A6 6 0 1 0 16 10" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
                <polygon points="16,6 20,10 12,10" fill="#222"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Mirror selected elements&#10;Click-click to define reference line" data-tool="mirror" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="4" x2="12" y2="20" stroke="#ff8c00" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6 H6 V18 H8" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"/>
                <path d="M16 6 H18 V18 H16" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="key-hint"></span>
            </button>

            <button type="button" class="palette-btn" title="Trim to reference line&#10;First click selects a reference line segment.&#10;Subsequent clicks trim other elements." data-tool="trim" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="4" y1="12" x2="20" y2="12" stroke="#ff8c00" stroke-width="2" stroke-linecap="round"/>
                <line x1="9" y1="11" x2="9" y2="1" stroke="#222" stroke-width="2" stroke-linecap="butt"/>
                <line x1="15" y1="13" x2="15" y2="23" stroke="#222" stroke-width="2" stroke-linecap="butt"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Trim both&#10;Click-click on 2 lines" data-tool="join" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18 V8 H18" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Fillet&#10;Write fillet radius, then click&#10;(Shift key to chamfer)" data-tool="fillet" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M 19 5 H12 A 7 7 0 0 0 5 13 V 19 " fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Lengthen|Shorten&#10;Write a distance and click on a line" data-tool="extend" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="2" y1="24" x2="17" y2="9" stroke="#000" stroke-width="2" />
                <line x1="17" y1="9" x2="22" y2="4" stroke="#00e676" stroke-width="2" />
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Erase Line Segment&#10;Click" data-tool="erase" data-key="">
              <svg width="24" height="24" viewBox="0 0 20 20">
                <path d="M11.1969 2.43934C11.7827 1.85355 12.7324 1.85355 13.3182 2.43934L17.5609 6.68198C18.1467 7.26777 18.1467 8.21751 17.5609 8.8033L9.36396 17.0002H14.5C14.7761 17.0002 15 17.2241 15 17.5002C15 17.7764 14.7761 18.0002 14.5 18.0002H7.81962C7.40984 18.0217 6.99291 17.876 6.67991 17.5629L2.43726 13.3203C1.85148 12.7345 1.85148 11.7848 2.43726 11.199L11.1969 2.43934ZM12.6111 3.14645C12.4159 2.95118 12.0993 2.95118 11.904 3.14645L5.53834 9.51212L10.4881 14.4619L16.8538 8.09619C17.049 7.90093 17.049 7.58435 16.8538 7.38909L12.6111 3.14645ZM9.78098 15.169L4.83123 10.2192L3.14437 11.9061C2.94911 12.1014 2.94911 12.4179 3.14437 12.6132L7.38701 16.8558C7.58227 17.0511 7.89886 17.0511 8.09412 16.8558L9.78098 15.169Z" fill="#212121"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Array the selected element(s)&#10;Write nx, ny @ Δx, Δy&#10;and click Ok" data-tool="array" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="4.5" cy="4.5" r="1.4" fill="#222"/>
                <circle cx="4.5" cy="11.5" r="1.4" fill="#222"/>
                <circle cx="4.5" cy="18.5" r="1.4" fill="#222"/>
                <circle cx="11.5" cy="4.5" r="1.4" fill="#222"/>
                <circle cx="11.5" cy="11.5" r="1.4" fill="#222"/>
                <circle cx="11.5" cy="18.5" r="1.4" fill="#222"/>
                <circle cx="18.5" cy="4.5" r="1.4" fill="#222"/>
                <circle cx="18.5" cy="11.5" r="1.4" fill="#222"/>
                <circle cx="18.5" cy="18.5" r="1.4" fill="#222"/>
              </svg>
              <span class="key-hint"> </span>
            </button>
            <button type="button" class="palette-btn" title="Angular array of selected element(s)&#10;Write n @ d (e.g., 3 @ 90)&#10;Then click at center" data-tool="angular-array" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="4.5" r="1.4" fill="#222"/>
                <circle cx="18.5" cy="8.25" r="1.4" fill="#222"/>
                <circle cx="18.5" cy="15.75" r="1.4" fill="#222"/>
                <circle cx="12" cy="19.5" r="1.4" fill="#222"/>
                <circle cx="5.5" cy="15.75" r="1.4" fill="#222"/>
                <circle cx="5.5" cy="8.25" r="1.4" fill="#222"/>
              </svg>
              <span class="key-hint"></span>
            </button>
            <button type="button" class="palette-btn" title="Scale selected elements&#10;Write scale factor, then click" data-tool="resize" data-key="">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <!-- Large square -->
                <rect x="2" y="2" width="20" height="20" fill="none" stroke="#222" stroke-width="1.8"/>

                <!-- Small square anchored to the same bottom-left corner -->
                <line x1="2" y1="13" x2="11" y2="13" stroke="#222" stroke-width="1.4" stroke-dasharray="2 2" stroke-linecap="round"/>
                <line x1="11" y1="22" x2="11" y2="13" stroke="#222" stroke-width="1.4" stroke-dasharray="2 2" stroke-linecap="round"/>

                <!-- Resize arrow -->
                <line x1="12.8" y1="11.2" x2="17.2" y2="6.8" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
                <polygon points="19.2,4.8 15.8,5.9 18.1,8.2" fill="#222"/>
              </svg>
              <span class="key-hint"></span>
            </button>
          </div>
        </form>
        <!-- Snap Palette Form -->
        <form id="snap-form">
          <div class="palette snap-palette" title="Hit space bar for no snap">
            <button type="button" class="palette-btn active" title="No Snap&#10;(Space bar)" data-snap="none" data-key=" ">
              <svg width="32" height="32" viewBox="0 0 32 32"></svg>
              <span class="key-hint"> </span>
            </button>
            <button type="button" title="Grid Snap&#10;Hit spacebar to unsnap" class="palette-btn" data-snap="grid" data-key="G">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="4" y="4" width="24" height="24" stroke="#222" stroke-width="2" fill="none"/>
                <line x1="4" y1="12" x2="28" y2="12" stroke="#222" stroke-width="1"/>
                <line x1="4" y1="20" x2="28" y2="20" stroke="#222" stroke-width="1"/>
                <line x1="12" y1="4" x2="12" y2="28" stroke="#222" stroke-width="1"/>
                <line x1="20" y1="4" x2="20" y2="28" stroke="#222" stroke-width="1"/>
              </svg>
              <span class="key-hint">G</span>
            </button>
            <button type="button" class="palette-btn" title="Endpoint snap&#10;Hit spacebar to unsnap" data-snap="end" data-key="E">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="6" y="6" width="20" height="20" stroke="#222" stroke-width="2" fill="none"/>
                <circle cx="6" cy="6" r="3" fill="#222"/>
                <circle cx="6" cy="26" r="3" fill="#222"/>
                <circle cx="26" cy="6" r="3" fill="#222"/>
                <circle cx="26" cy="26" r="3" fill="#222"/>
              </svg>
              <span class="key-hint">E</span>
            </button>
            <button type="button" class="palette-btn" title="Midpoint snap" data-snap="mid" data-key="M">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="6" y="6" width="20" height="20" stroke="#222" stroke-width="2" fill="none"/>
                <circle cx="6" cy="16" r="3" fill="#222"/>
                <circle cx="16" cy="6" r="3" fill="#222"/>
                <circle cx="16" cy="26" r="3" fill="#222"/>
                <circle cx="26" cy="16" r="3" fill="#222"/>
              </svg>
              <span class="key-hint">M</span>
            </button>
            <button type="button" class="palette-btn" title="Centroid Snap" data-snap="centroid" data-key="C">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" stroke="#222" stroke-width="2" fill="none"/>
                <circle cx="16" cy="16" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">C</span>
            </button>
            <button type="button" class="palette-btn" title="Snap Nearest" data-snap="nearest" data-key="N">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="4" y1="20" x2="28" y2="20" stroke="#222" stroke-width="2"/>
                <line x1="24" y1="4" x2="16" y2="20" stroke="#222" stroke-width="1"/>
                <circle cx="16" cy="20" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">N</span>
            </button>
            <button type="button" class="palette-btn" title="Snap Perpendicular" data-snap="perpendicular" data-key="P">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="4" y1="20" x2="28" y2="20" stroke="#222" stroke-width="2"/>
                <line x1="16" y1="4" x2="16" y2="20" stroke="#222" stroke-width="1"/>
                <circle cx="16" cy="20" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">P</span>
            </button>
            <button type="button" class="palette-btn" title="Snap Tangent" data-snap="tangent" data-key="J">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="18" cy="16" r="6" stroke="#222" stroke-width="2" fill="none"/>
                <line x1="2" y1="24" x2="13.86" y2="11.8" stroke="#222" stroke-width="2"/>
                <circle cx="13.86" cy="11.8" r="2" fill="#0078d7"/>
              </svg>
              <span class="key-hint">J</span>
            </button>
            <button type="button" class="palette-btn" title="Snap Intersection" data-snap="intersection" data-key="I">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="4" y1="20" x2="28" y2="20" stroke="#222" stroke-width="2"/>
                <line x1="16" y1="4" x2="16" y2="28" stroke="#222" stroke-width="2"/>
                <circle cx="16" cy="20" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">I</span>
            </button>
          </div>
        </form>
        <!-- Lock Palette Form -->
        <form id="lock-form">
          <div class="palette lock-palette">
            <button type="button" class="palette-btn active" title="Unlock" data-lock="unlock" data-key="U">
              <svg width="32" height="32" viewBox="0 0 32 32"></svg>
              <span class="key-hint">U</span>
            </button>
            <button type="button" class="palette-btn" title="Lock X" data-lock="x" data-key="X">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="6" y1="16" x2="24" y2="16" stroke="#222" stroke-width="2"/>
                <circle cx="24" cy="16" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">X</span>
            </button>
            <button type="button" class="palette-btn" title="Lock Y" data-lock="y" data-key="Y">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="16" y1="6" x2="16" y2="24" stroke="#222" stroke-width="2"/>
                <circle cx="16" cy="24" r="4" fill="#0078d7"/>
              </svg>
              <span class="key-hint">Y</span>
            </button>
          </div>
        </form>
      </div>
      <!-- Column for Menu, Sketching Area, and Text input -->
      <div class="canvas-column">
      <div class="main-menu">
        <div id="main-menu" class="menu-section"><!--Sketch-->
          <button type="button" class="menu-heading">Sketch <span class="menu-caret">&#9660;</span></button>
          <div class="menu-dropdown" style="width: 150px;">
            <button class="menu-btn" data-menu="properties">Sketch Properties…</button>
            <button class="menu-btn" data-menu="shape">Shape Library…</button>
            <button class="menu-btn" data-menu="editSource">Edit source</button>
            <button class="menu-btn" data-menu="close" title="Close Sketch and write the sketch into the Hurmet document.">Close</button>
            <button class="menu-btn" data-menu="cancel" title="Close Sketch and discard the changes made since it opened.">Cancel</button>
          </div>
          <div id="shape-library-dialog" class="menu-dialog">
            <div class="shape-library-heading">Recent</div>
            <div id="shape-library-recents" class="shape-library-list"></div>
            <div class="shape-library-heading">Available</div>
            <div id="shape-library-catalog" class="shape-library-list"></div>
          </div>
          <div id="sketch-properties-dialog" class="menu-dialog">
            <div class="properties-grid">
              <label for="sketch-properties-title">Title</label>
              <input type="text" id="sketch-properties-title" style="width: 300px">
              <span></span>
              <label class="properties-checkbox"><input type="checkbox" id="sketch-properties-caption"> Include a caption</label>
              <label for="sketch-properties-position">Position</label>
              <select id="sketch-properties-position" style="width: 110px">
                <option value="inline">inline</option>
                <option value="left">float left</option>
                <option value="right">float right</option>
              </select>
              <label for="sketch-properties-scale">Scale</label>
              <select id="sketch-properties-scale" style="width: 110px">
                <option value="5">5:1</option>
                <option value="2">2:1</option>
                <option value="1" selected>1:1</option>
                <option value="0.5">1:2</option>
                <option value="0.25">3:12</option>
                <option value="0.2">1:5</option>
                <option value="0.125">1¹⁄₂ : 12</option>
                <option value="0.1">1:10</option>
                <option value="0.08333333333333333">1:12</option>
                <option value="0.0625">³⁄₄ : 12</option>
                <option value="0.05">1:20</option>
                <option value="0.041666666666666667">¹⁄₂ : 12</option>
                <option value="0.03125">³⁄₈ : 12</option>
                <option value="0.020833333333333333">¹⁄₄ : 12</option>
                <option value="0.02">1:50</option>
                <option value="0.015625">³⁄₁₆ : 12</option>
                <option value="0.0104166666666666667">¹⁄₈ : 12</option>
                <option value="0.0078125">³⁄₃₂ : 12</option>
                <option value="0.005208333333333333">¹⁄₁₆ : 12</option>
                <option value="0.01">1:100</option>
                <option value="0.002">1:500</option>
                <option value="0.001">1:1000</option>
                <option value="0.0008">1:1250</option>
                <option value="0.0004">1:2500</option>
                <option value="0.0002">1:5000</option>
                <option value="0.0001">1:10000</option>
              </select>
              <label for="sketch-properties-unit">Unit</label>
              <select id="sketch-properties-unit" style="width: 110px">
                <option value="px" selected>px</option>
                <option value="pt">pt</option>
                <option value="in">inch</option>
                <option value="ft">feet.decimal</option>
                <option value="ft-in">feet′-inches″</option>
                <option value="mile">mile</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="km">km</option>
              </select>
              <label for="sketch-properties-rounding-type">Rounding</label>
              <div class="properties-rounding">
                <select id="sketch-properties-rounding-type" title="Rounding type" style="width: 2.5em">
                  <option value="f">f - fixed</option>
                  <option value="r">r - significant</option>
                  <option value="h" selected>h - significant part of fractions</option>
                </select>
                <select id="sketch-properties-rounding-digits" title="Number of digits">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3" selected>3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
              <label for="sketch-properties-fraction">Fractions</label>
              <select id="sketch-properties-fraction" title="Inch fractions in feet′-inches″ dimensions" style="width: 110px">
                <option value="8">¹⁄₈</option>
                <option value="16" selected>¹⁄₁₆</option>
                <option value="32">¹⁄₃₂</option>
                <option value="64">¹⁄₆₄</option>
              </select>
            </div>
            <div class="properties-buttons">
              <button type="button" id="sketch-properties-ok">OK</button>
              <button type="button" id="sketch-properties-cancel">Cancel</button>
            </div>
          </div>
        </div>
        <div id="edit-menu" class="menu-section"><!--Edit-->
          <button type="button" class="menu-heading">
            Edit <span class="menu-caret">&#9660;</span>
          </button>
          <div class="menu-dropdown menu-edit">
            <button class="menu-btn" data-menu="group">Group</button>
            <button class="menu-btn" data-menu="ungroup">Ungroup</button>
            <button class="menu-btn" data-menu="moveToFront">Move to front</button>
            <button class="menu-btn" data-menu="moveToBack">Move to back</button>
            <button class="menu-btn" data-menu="isoTop">…to Isometric Top</button>
            <button class="menu-btn" data-menu="isoRight">…to Isometric Right</button>
            <button class="menu-btn" data-menu="isoLeft">…to Isometric Left</button>
            <button class="menu-btn" data-menu="editElement" title="Edit selected element…">Edit element…</button>
            <hr class="menu-separator">
            <button class="menu-btn keyed" data-menu="undo" title="Undo the last change to the sketch.">Undo<span class="shortcut">Ctrl Z</span></button>
            <button class="menu-btn keyed" data-menu="redo" title="Redo the last change that was undone.">Redo<span class="shortcut">Ctrl Y</span></button>
            <button class="menu-btn keyed" data-menu="cut" title="Copy the selected shapes to the clipboard, then delete them.">Cut<span class="shortcut">Ctrl X</span></button>
            <button class="menu-btn keyed" data-menu="copy" title="Copy the selected shapes to the clipboard. Paste them into this sketch or into a sketch in another browser tab.">Copy<span class="shortcut">Ctrl C</span></button>
            <button class="menu-btn keyed" data-menu="paste" title="Paste shapes copied from a sketch. They follow the pointer. Click to place them, or press Esc to cancel. Ctrl V also pastes an image, without the browser's clipboard prompt.">Paste<span class="shortcut">Ctrl V</span></button>
            <button class="menu-btn keyed" data-menu="delete" title="Delete the selected shapes.">Delete<span class="shortcut">Del</span></button>
          </div>
        </div>
        <div id="zoom-menu" class="menu-section"><!--Zoom-->
          <button type="button" class="menu-heading">
            Zoom <span class="menu-caret">&#9660;</span>
          </button>
          <div class="menu-dropdown">
            <button class="menu-btn" data-menu="reset">Reset</button>
            <button class="menu-btn keyed" data-menu="in">In<span class="shortcut">Ctrl +</span></button>
            <button class="menu-btn keyed" data-menu="out">Out<span class="shortcut">Ctrl -</span></button>
            <button class="menu-btn" title="Zoom to window. Click-click." data-menu="window">Window</button>
            <button class="menu-btn" data-menu="extents">Extents</button>
            <button class="menu-btn" data-menu="selection">Selection</button>
            <button class="menu-btn" data-menu="previous">Previous</button>
          </div>
        </div>
        <div class="menu-section"><!--Stroke-->
          <button type="button" class="menu-heading" data-menu="stroke">
            Stroke… <span id="stroke-display">
              <svg width="32" height="16" viewBox="0 0 32 16">
                <!-- Default: 1px, black, solid -->
                <line id="stroke-preview" x1="4" y1="8" x2="28" y2="8"
                  stroke="#000"
                  stroke-width="1"
                  stroke-linecap="round"/>
              </svg>
            </span>
          </button>
          <div id="stroke-options" class="menu-dialog">
            <div class="stroke-group">
              <div class="stroke-label">Thickness</div>
              <div class="stroke-thickness-options">
                <button type="button" class="stroke-thickness-btn" data-thickness="none" title="None">
                  <svg width="32" height="8" viewBox="0 0 32 8"></svg>
                </button>
                <button type="button" class="stroke-thickness-btn" data-thickness="0.5" title="0.5 px">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="28" y2="4" stroke="#222" stroke-width="0.5px"/>
                  </svg>
                </button>
                <button type="button" class="stroke-thickness-btn active" data-thickness="1" title="1 px">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="28" y2="4" stroke="#222" stroke-width="1px"/>
                  </svg>
                </button>
                <button type="button" class="stroke-thickness-btn" data-thickness="2" title="2 px">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="28" y2="4" stroke="#222" stroke-width="2px"/>
                  </svg>
                </button>
                <button type="button" class="stroke-thickness-btn" data-thickness="3" title="3 px">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="28" y2="4" stroke="#222" stroke-width="3px"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="stroke-group">
              <div class="stroke-label">Color</div>
              <div class="stroke-color-options">
                <button type="button" class="stroke-color-btn active" data-color="#000000" style="background: #000000;" title="Black"></button>
                <button type="button" class="stroke-color-btn" data-color="#808080" style="background: #808080;" title="Gray"></button>
                <button type="button" class="stroke-color-btn" data-color="#0078d7" style="background: #0078d7;" title="Blue"></button>
                <button type="button" class="stroke-color-btn" data-color="#d70022" style="background: #d70022;" title="Red"></button>
                <button type="button" class="stroke-color-btn" data-color="#22a315" style="background: #22a315;" title="Green"></button>
                <button type="button" class="stroke-color-btn" data-color="#ffcc00" style="background: #ffcc00;" title="Yellow"></button>
                <button type="button" class="stroke-color-btn" data-color="#ffffff" style="background: #ffffff; border: 1px solid #ccc;" title="White"></button>
                <button type="button" class="stroke-color-btn" data-color="none" style="background: repeating-linear-gradient(45deg, #ccc 0 4px, #fff 4px 8px);" title="None"></button>
              </div>
            </div>
            <div class="stroke-group">
              <div class="stroke-label">Line type</div>
              <div class="stroke-linetype-options">
                <button type="button" class="linetype-btn active" data-linetype="solid" title="Solid">
                  <svg width="32" height="8" viewBox="0 0 32 8"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" stroke-width="2"/></svg>
                </button>
                <button type="button" class="linetype-btn" data-linetype="dashed" title="Dashed">
                  <svg width="32" height="8" viewBox="0 0 32 8"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" stroke-width="2" stroke-dasharray="12 6"/></svg>
                </button>
                <button type="button" class="linetype-btn" data-linetype="dotted" title="Dotted">
                  <svg width="32" height="8" viewBox="0 0 32 8"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" stroke-width="2" stroke-dasharray="0 8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="linetype-btn" data-linetype="centerline" title="Centerline">
                  <svg width="32" height="8" viewBox="0 0 32 8"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" stroke-width="2" stroke-dasharray="4,4,12,4"/></svg>
                </button>
                <button type="button" class="linetype-btn" data-linetype="border" title="Border">
                  <svg width="34" height="8" viewBox="0 0 34 8"><line x1="2" y1="4" x2="32" y2="4" stroke="#222" stroke-width="2" stroke-dasharray="12 6 3 6 3 6"/></svg>
                </button>
              </div>
            </div>
            <div class="stroke-group">
              <div class="stroke-label">Ending</div>
              <div class="stroke-ending-options">
                <button type="button" class="stroke-ending-btn active" data-ending="none" title="None">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="28" y2="4" stroke="#222" stroke-width="2"/>
                  </svg>
                </button>
                <button type="button" class="stroke-ending-btn" data-ending="arrow" title="Arrowhead">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="24" y2="4" stroke="#222" stroke-width="2"/>
                    <polygon points="28,4 22,0 22,8" fill="#222"/>
                  </svg>
                </button>
                <button type="button" class="stroke-ending-btn" data-ending="dot" title="Dot">
                  <svg width="32" height="8" viewBox="0 0 32 8">
                    <line x1="4" y1="4" x2="24" y2="4" stroke="#222" stroke-width="2"/>
                    <circle cx="28" cy="4" r="3" fill="#222"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="menu-section"><!--Fill-->
          <button type="button" class="menu-heading" data-menu="fill">Fill… <span id="fill-display">
              <svg width="35" height="21" viewBox="0 0 35 21">
                <!-- Default: fill none, solid border -->
                <defs id="fill-pattern-defs"></defs>
                <rect id="fill-preview" x="2" y="2" width="31" height="17" fill="none" stroke="#888" stroke-width="1"/>
                <g id="fill-pattern-preview"></g>
              </svg>
            </span>
          </button>
          <div id="fill-options" class="menu-dialog">
            <div class="fill-group">
              <div class="fill-label">Color</div>
              <div class="fill-color-options">
                <button type="button" class="fill-color-btn active" data-color="none" style="background: repeating-linear-gradient(45deg, #ccc 0 4px, #fff 4px 8px);" title="None"></button>
                <button type="button" class="fill-color-btn" data-color="#ffffff" style="background: #ffffff; border: 1px solid #ccc;" title="White"></button>
                <button type="button" class="fill-color-btn" data-color="#000000" style="background: #000000;" title="Black"></button>
                <button type="button" class="fill-color-btn" data-color="#808080" style="background: #808080;" title="Gray"></button>
                <button type="button" class="fill-color-btn" data-color="#0078d7" style="background: #0078d7;" title="Blue"></button>
                <button type="button" class="fill-color-btn" data-color="#d70022" style="background: #d70022;" title="Red"></button>
                <button type="button" class="fill-color-btn" data-color="#22a315" style="background: #22a315;" title="Green"></button>
                <button type="button" class="fill-color-btn" data-color="#ffcc00" style="background: #ffcc00;" title="Yellow"></button>
                <button type="button" class="fill-color-btn" data-color="#d9dde0" style="background: #d9dde0;" title="Light Gray"></button>
                <button type="button" class="fill-color-btn" data-color="#a5d8ff" style="background: #a5d8ff;" title="Pale Blue"></button>
                <button type="button" class="fill-color-btn" data-color="#ffc9c9" style="background: #ffc9c9;" title="Pink"></button>
                <button type="button" class="fill-color-btn" data-color="#b2f2bb" style="background: #b2f2bb;" title="Light Green"></button>
                <button type="button" class="fill-color-btn" data-color="#ffec99" style="background: #ffec99;" title="Light Yellow"></button>
              </div>
            </div>
            <div class="fill-group">
              <div class="fill-label">Pattern</div>
              <div class="fill-pattern-options">
                <button type="button" class="fill-pattern-btn active" data-pattern="solid" title="Solid">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <rect width="40" height="40" fill="#888" stroke="#bbb" stroke-width="1"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="diagonal" title="Diagonal">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <defs>
                      <!-- ansi31.pat: 45,0,0,0,3.175 (angle, x-origin, y-origin, x-offset, line-spacing; no dash pattern given, so a solid line), applied at scale factor 3. The line sits mid-tile (x = 4.7625), not at x = 0, so half its stroke isn't clipped off by the tile edge. -->
                      <pattern id="fp-diagonal" width="9.525" height="9.525" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                        <line x1="4.7625" y1="0" x2="4.7625" y2="9.525" stroke="#000" stroke-width="0.5"/>
                      </pattern>
                      <clipPath id="fp-diagonal-clip">
                        <rect width="40" height="40"/>
                      </clipPath>
                    </defs>
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <rect width="40" height="40" fill="url(#fp-diagonal)" clip-path="url(#fp-diagonal-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="crosshatch" title="Crosshatch">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <defs>
                      <pattern id="fp-crosshatch" width="9.525" height="9.525" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="9.525" stroke="#000" stroke-width="1"/>
                        <line x1="0" y1="0" x2="9.525" y2="0" stroke="#000" stroke-width="1"/>
                      </pattern>
                      <clipPath id="fp-crosshatch-clip">
                        <rect width="40" height="40"/>
                      </clipPath>
                    </defs>
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <rect width="40" height="40" fill="url(#fp-crosshatch)" clip-path="url(#fp-crosshatch-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="grid" title="Grid">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <defs>
                      <!-- The crosshatch tile without its 45-degree rotation, so the lines run
                           horizontal and vertical. -->
                      <pattern id="fp-grid" width="9.525" height="9.525" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="9.525" stroke="#000" stroke-width="1"/>
                        <line x1="0" y1="0" x2="9.525" y2="0" stroke="#000" stroke-width="1"/>
                      </pattern>
                      <clipPath id="fp-grid-clip">
                        <rect width="40" height="40"/>
                      </clipPath>
                    </defs>
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <rect width="40" height="40" fill="url(#fp-grid)" clip-path="url(#fp-grid-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="dots" title="Dots">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <!-- matches dwg.js's fillPatternTiles.dots (20x20 tile, 2 dots per tile at a
                         diagonal offset) tiled 2x2 across the 40x40 icon. -->
                    <circle cx="5" cy="5" r="1.3" fill="#000"/>
                    <circle cx="15" cy="15" r="1.3" fill="#000"/>
                    <circle cx="25" cy="5" r="1.3" fill="#000"/>
                    <circle cx="35" cy="15" r="1.3" fill="#000"/>
                    <circle cx="5" cy="25" r="1.3" fill="#000"/>
                    <circle cx="15" cy="35" r="1.3" fill="#000"/>
                    <circle cx="25" cy="25" r="1.3" fill="#000"/>
                    <circle cx="35" cy="35" r="1.3" fill="#000"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="earth" title="Earth">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <defs>
                      <!-- earth.pat reinterpreted (per user's own derivation, not a literal AutoCAD dash
                           reproduction — that didn't match the reference look): a checkerboard of 6.35-unit
                           blocks, each holding either 3 horizontal or 3 vertical solid lines (padded
                           symmetrically: pad=(6.35-4.7625)/2=0.79375), applied at 3x scale, so each block is
                           19.05 units. The combined 2x2 tile (38.1 x 38.1) has [H|V] on top and [V|H] below,
                           so the blocks alternate both across and down when the pattern repeats. -->
                      <pattern id="fp-earth" width="38.1" height="38.1" patternUnits="userSpaceOnUse">
                        <!-- top-left: horizontal block -->
                        <line x1="0" y1="2.38125" x2="19.05" y2="2.38125" stroke="#000" stroke-width="0.5"/>
                        <line x1="0" y1="9.525" x2="19.05" y2="9.525" stroke="#000" stroke-width="0.5"/>
                        <line x1="0" y1="16.66875" x2="19.05" y2="16.66875" stroke="#000" stroke-width="0.5"/>
                        <!-- top-right: vertical block -->
                        <line x1="21.43125" y1="0" x2="21.43125" y2="19.05" stroke="#000" stroke-width="0.5"/>
                        <line x1="28.575" y1="0" x2="28.575" y2="19.05" stroke="#000" stroke-width="0.5"/>
                        <line x1="35.71875" y1="0" x2="35.71875" y2="19.05" stroke="#000" stroke-width="0.5"/>
                        <!-- bottom-left: vertical block -->
                        <line x1="2.38125" y1="19.05" x2="2.38125" y2="38.1" stroke="#000" stroke-width="0.5"/>
                        <line x1="9.525" y1="19.05" x2="9.525" y2="38.1" stroke="#000" stroke-width="0.5"/>
                        <line x1="16.66875" y1="19.05" x2="16.66875" y2="38.1" stroke="#000" stroke-width="0.5"/>
                        <!-- bottom-right: horizontal block -->
                        <line x1="19.05" y1="21.43125" x2="38.1" y2="21.43125" stroke="#000" stroke-width="0.5"/>
                        <line x1="19.05" y1="28.575" x2="38.1" y2="28.575" stroke="#000" stroke-width="0.5"/>
                        <line x1="19.05" y1="35.71875" x2="38.1" y2="35.71875" stroke="#000" stroke-width="0.5"/>
                      </pattern>
                      <clipPath id="fp-earth-clip">
                        <rect width="40" height="40"/>
                      </clipPath>
                    </defs>
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <rect width="40" height="40" fill="url(#fp-earth)" clip-path="url(#fp-earth-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="sand" title="Sand">
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <defs>
                      <!-- ar-sand.pat, generated the same way as fp-concrete: 4 zero-length-
                           dash families (37.5/7.5/-32.5/-42.5 degrees -- the same scheme as
                           ar-conc's dots, on a denser lattice), each drawing 3 dots per repeat.
                           The 4 lattices have no common period, so this is the true pattern over
                           an 800x800 raw window (each dot kept once, coincident dots from the two
                           shared family origins deduped), y flipped from AutoCAD's y-up, scaled
                           0.75x: 1603 dots. The earlier 73.5x62.25 tile held only 10 dots, which
                           made the repeat obvious. -->
                      <pattern id="fp-sand" width="600" height="600" patternUnits="userSpaceOnUse">
                        <path stroke="#000" stroke-width="1.5" stroke-linecap="round" d="M0 600h0M0 0h0M600 600h0M600 0h0M74.42 580.52h0M73.22 543.81h0M72.02 507.11h0M70.82 470.4h0M69.62 433.7h0M68.42 396.99h0M67.22 360.28h0M66.02 323.58h0M64.82 286.87h0M63.62 250.17h0
                           M62.42 213.46h0M61.22 176.75h0M60.02 140.05h0M58.82 103.34h0M57.62 66.64h0M56.42 29.93h0M150.05 597.74h0M148.85 561.04h0M147.65 524.33h0M146.45 487.63h0M145.25 450.92h0M144.05 414.21h0M142.85 377.51h0M141.65 340.8h0
                           M140.45 304.1h0M139.25 267.39h0M138.05 230.68h0M136.85 193.98h0M135.65 157.27h0M134.45 120.57h0M133.25 83.86h0M132.05 47.15h0M130.85 10.45h0M224.47 578.26h0M223.27 541.56h0M222.07 504.85h0M220.87 468.14h0M219.67 431.44h0
                           M218.47 394.73h0M217.27 358.03h0M216.07 321.32h0M214.87 284.62h0M213.67 247.91h0M212.47 211.2h0M211.27 174.5h0M210.07 137.79h0M208.87 101.09h0M207.67 64.38h0M206.47 27.67h0M300.1 595.49h0M298.9 558.78h0M297.7 522.08h0
                           M296.5 485.37h0M295.3 448.66h0M294.1 411.96h0M292.9 375.25h0M291.7 338.55h0M290.5 301.84h0M289.3 265.13h0M288.1 228.43h0M286.9 191.72h0M285.7 155.02h0M284.5 118.31h0M283.3 81.6h0M282.1 44.9h0M280.9 8.19h0
                           M374.52 576.01h0M373.32 539.3h0M372.12 502.59h0M370.92 465.89h0M369.72 429.18h0M368.52 392.48h0M367.32 355.77h0M366.12 319.06h0M364.92 282.36h0M363.72 245.65h0M362.52 208.95h0M361.32 172.24h0M360.12 135.54h0M358.92 98.83h0
                           M357.72 62.12h0M356.52 25.42h0M450.15 593.23h0M448.95 556.53h0M447.75 519.82h0M446.55 483.11h0M445.35 446.41h0M444.15 409.7h0M442.95 373h0M441.75 336.29h0M440.55 299.58h0M439.35 262.88h0M438.15 226.17h0M436.95 189.47h0
                           M435.75 152.76h0M434.55 116.05h0M433.35 79.35h0M432.15 42.64h0M430.95 5.94h0M524.57 573.75h0M523.37 537.04h0M522.17 500.34h0M520.97 463.63h0M519.77 426.93h0M518.57 390.22h0M517.37 353.51h0M516.17 316.81h0M514.97 280.1h0
                           M513.77 243.4h0M512.57 206.69h0M511.37 169.98h0M510.17 133.28h0M508.97 96.57h0M507.77 59.87h0M506.57 23.16h0M598.99 554.27h0M-1.01 554.27h0M597.79 517.56h0M596.59 480.86h0M595.39 444.15h0M594.19 407.45h0M592.99 370.74h0
                           M591.79 334.03h0M590.59 297.33h0M589.39 260.62h0M588.19 223.92h0M586.99 187.21h0M585.79 150.5h0M584.59 113.8h0M583.39 77.09h0M582.19 40.39h0M580.99 3.68h0M22.97 582.37h0M21.77 545.67h0M20.57 508.96h0M19.37 472.25h0
                           M18.17 435.55h0M16.97 398.84h0M15.77 362.14h0M14.57 325.43h0M13.37 288.72h0M12.17 252.02h0M10.97 215.31h0M9.77 178.61h0M8.57 141.9h0M7.37 105.19h0M6.17 68.49h0M4.97 31.78h0M98.6 599.6h0M98.6 -0.4h0
                           M97.4 562.89h0M96.2 526.19h0M95 489.48h0M93.8 452.77h0M92.6 416.07h0M91.4 379.36h0M90.2 342.66h0M89 305.95h0M87.8 269.24h0M86.6 232.54h0M85.4 195.83h0M84.2 159.13h0M83 122.42h0M81.8 85.71h0
                           M80.6 49.01h0M79.4 12.3h0M173.02 580.12h0M171.82 543.41h0M170.62 506.7h0M169.42 470h0M168.22 433.29h0M167.02 396.59h0M165.82 359.88h0M164.62 323.17h0M163.42 286.47h0M162.22 249.76h0M161.02 213.06h0M159.82 176.35h0
                           M158.62 139.64h0M157.42 102.94h0M156.22 66.23h0M155.02 29.53h0M248.65 597.34h0M247.45 560.64h0M246.25 523.93h0M245.05 487.22h0M243.85 450.52h0M242.65 413.81h0M241.45 377.11h0M240.25 340.4h0M239.05 303.69h0M237.85 266.99h0
                           M236.65 230.28h0M235.45 193.58h0M234.25 156.87h0M233.05 120.16h0M231.85 83.46h0M230.65 46.75h0M229.45 10.05h0M323.07 577.86h0M321.87 541.15h0M320.67 504.45h0M319.47 467.74h0M318.27 431.04h0M317.07 394.33h0M315.87 357.62h0
                           M314.67 320.92h0M313.47 284.21h0M312.27 247.51h0M311.07 210.8h0M309.87 174.09h0M308.67 137.39h0M307.47 100.68h0M306.27 63.98h0M305.07 27.27h0M398.69 595.09h0M397.49 558.38h0M396.29 521.67h0M395.09 484.97h0M393.89 448.26h0
                           M392.69 411.56h0M391.49 374.85h0M390.29 338.14h0M389.09 301.44h0M387.89 264.73h0M386.69 228.03h0M385.49 191.32h0M384.29 154.61h0M383.09 117.91h0M381.89 81.2h0M380.69 44.5h0M379.49 7.79h0M473.12 575.6h0M471.92 538.9h0
                           M470.72 502.19h0M469.52 465.49h0M468.32 428.78h0M467.12 392.07h0M465.92 355.37h0M464.72 318.66h0M463.52 281.96h0M462.32 245.25h0M461.12 208.54h0M459.92 171.84h0M458.72 135.13h0M457.52 98.43h0M456.32 61.72h0M455.12 25.01h0
                           M548.74 592.83h0M547.54 556.12h0M546.34 519.42h0M545.14 482.71h0M543.94 446.01h0M542.74 409.3h0M541.54 372.59h0M540.34 335.89h0M539.14 299.18h0M537.94 262.48h0M536.74 225.77h0M535.54 189.06h0M534.34 152.36h0M533.14 115.65h0
                           M531.94 78.95h0M530.74 42.24h0M529.54 5.53h0M49.87 599.36h0M49.87 -0.64h0M48.67 562.66h0M47.47 525.95h0M46.27 489.25h0M45.07 452.54h0M43.86 415.83h0M42.66 379.13h0M41.46 342.42h0M40.26 305.72h0M39.06 269.01h0
                           M37.86 232.3h0M36.66 195.6h0M35.46 158.89h0M34.26 122.19h0M33.06 85.48h0M31.86 48.77h0M30.66 12.07h0M124.29 579.88h0M123.09 543.18h0M121.89 506.47h0M120.69 469.76h0M119.49 433.06h0M118.29 396.35h0M117.09 359.65h0
                           M115.89 322.94h0M114.69 286.24h0M113.49 249.53h0M112.29 212.82h0M111.09 176.12h0M109.89 139.41h0M108.69 102.71h0M107.49 66h0M106.29 29.29h0M199.91 597.11h0M198.71 560.4h0M197.51 523.7h0M196.31 486.99h0M195.11 450.28h0
                           M193.91 413.58h0M192.71 376.87h0M191.51 340.17h0M190.31 303.46h0M189.11 266.75h0M187.91 230.05h0M186.71 193.34h0M185.51 156.64h0M184.31 119.93h0M183.11 83.22h0M181.91 46.52h0M180.71 9.81h0M274.34 577.63h0M273.14 540.92h0
                           M271.94 504.21h0M270.74 467.51h0M269.54 430.8h0M268.34 394.1h0M267.14 357.39h0M265.94 320.68h0M264.74 283.98h0M263.54 247.27h0M262.34 210.57h0M261.14 173.86h0M259.94 137.15h0M258.74 100.45h0M257.54 63.74h0M256.34 27.04h0
                           M349.96 594.85h0M348.76 558.15h0M347.56 521.44h0M346.36 484.73h0M345.16 448.03h0M343.96 411.32h0M342.76 374.62h0M341.56 337.91h0M340.36 301.2h0M339.16 264.5h0M337.96 227.79h0M336.76 191.09h0M335.56 154.38h0M334.36 117.67h0
                           M333.16 80.97h0M331.96 44.26h0M330.76 7.56h0M424.39 575.37h0M423.19 538.66h0M421.99 501.96h0M420.79 465.25h0M419.59 428.55h0M418.39 391.84h0M417.19 355.13h0M415.99 318.43h0M414.79 281.72h0M413.59 245.02h0M412.39 208.31h0
                           M411.19 171.6h0M409.99 134.9h0M408.79 98.19h0M407.59 61.49h0M406.39 24.78h0M500.01 592.6h0M498.81 555.89h0M497.61 519.18h0M496.41 482.48h0M495.21 445.77h0M494.01 409.07h0M492.81 372.36h0M491.61 335.65h0M490.41 298.95h0
                           M489.21 262.24h0M488.01 225.54h0M486.81 188.83h0M485.61 152.12h0M484.41 115.42h0M483.21 78.71h0M482.01 42.01h0M480.81 5.3h0M574.44 573.11h0M573.24 536.41h0M572.04 499.7h0M570.84 463h0M569.64 426.29h0M568.44 389.58h0
                           M567.24 352.88h0M566.04 316.17h0M564.84 279.47h0M563.64 242.76h0M562.44 206.05h0M561.24 169.35h0M560.04 132.64h0M558.84 95.94h0M557.64 59.23h0M556.44 22.52h0M11.91 55.88h0M45.62 2.11h0M29.47 102.89h0M63.19 49.12h0
                           M13.32 203.66h0M47.04 149.9h0M80.75 96.14h0M114.47 42.37h0M30.89 250.67h0M64.6 196.91h0M98.32 143.15h0M132.03 89.38h0M165.74 35.62h0M14.74 351.44h0M48.45 297.68h0M82.16 243.92h0M115.88 190.16h0M149.59 136.4h0
                           M183.31 82.63h0M217.02 28.87h0M32.3 398.45h0M66.01 344.69h0M99.73 290.93h0M133.44 237.17h0M167.16 183.41h0M200.87 129.64h0M234.59 75.88h0M268.3 22.12h0M16.15 499.23h0M49.86 445.47h0M83.58 391.7h0M117.29 337.94h0
                           M151.01 284.18h0M184.72 230.42h0M218.44 176.66h0M252.15 122.89h0M285.86 69.13h0M319.58 15.37h0M33.71 546.24h0M67.43 492.48h0M101.14 438.71h0M134.86 384.95h0M168.57 331.19h0M202.29 277.43h0M236 223.67h0M269.71 169.9h0
                           M303.43 116.14h0M337.14 62.38h0M370.86 8.62h0M51.28 593.25h0M84.99 539.49h0M118.71 485.73h0M152.42 431.96h0M186.14 378.2h0M219.85 324.44h0M253.56 270.68h0M287.28 216.92h0M320.99 163.15h0M354.71 109.39h0M388.42 55.63h0
                           M422.13 1.87h0M102.56 586.5h0M136.27 532.74h0M169.99 478.97h0M203.7 425.21h0M237.41 371.45h0M271.13 317.69h0M304.84 263.93h0M338.56 210.16h0M372.27 156.4h0M405.98 102.64h0M439.7 48.88h0M153.83 579.75h0M187.55 525.99h0
                           M221.26 472.22h0M254.98 418.46h0M288.69 364.7h0M322.41 310.94h0M356.12 257.18h0M389.83 203.41h0M423.55 149.65h0M457.26 95.89h0M490.98 42.13h0M205.11 573h0M238.83 519.23h0M272.54 465.47h0M306.26 411.71h0M339.97 357.95h0
                           M373.68 304.19h0M407.4 250.43h0M441.11 196.66h0M474.83 142.9h0M508.54 89.14h0M542.26 35.38h0M256.39 566.25h0M290.11 512.48h0M323.82 458.72h0M357.53 404.96h0M391.25 351.2h0M424.96 297.44h0M458.68 243.67h0M492.39 189.91h0
                           M526.11 136.15h0M559.82 82.39h0M593.53 28.63h0M307.67 559.49h0M341.38 505.73h0M375.1 451.97h0M408.81 398.21h0M442.53 344.45h0M476.24 290.69h0M509.96 236.92h0M543.67 183.16h0M577.38 129.4h0M358.95 552.74h0M392.66 498.98h0
                           M426.38 445.22h0M460.09 391.46h0M493.8 337.7h0M527.52 283.93h0M561.23 230.17h0M594.95 176.41h0M376.51 599.75h0M376.51 -0.25h0M410.23 545.99h0M443.94 492.23h0M477.65 438.47h0M511.37 384.71h0M545.08 330.95h0M578.8 277.18h0
                           M427.79 593h0M461.5 539.24h0M495.22 485.48h0M528.93 431.72h0M562.65 377.96h0M596.36 324.19h0M479.07 586.25h0M512.78 532.49h0M546.5 478.73h0M580.21 424.97h0M530.35 579.5h0M564.06 525.74h0M597.78 471.98h0M581.63 572.75h0
                           M9.83 6.83h0M27.4 53.84h0M61.11 0.07h0M61.11 600.07h0M11.25 154.61h0M44.96 100.85h0M78.67 47.09h0M28.81 201.62h0M62.52 147.86h0M96.24 94.1h0M129.95 40.33h0M12.66 302.39h0M46.37 248.63h0M80.09 194.87h0
                           M113.8 141.11h0M147.52 87.35h0M181.23 33.58h0M30.22 349.4h0M63.94 295.64h0M97.65 241.88h0M131.37 188.12h0M165.08 134.36h0M198.8 80.59h0M232.51 26.83h0M14.07 450.18h0M47.79 396.42h0M81.5 342.65h0M115.22 288.89h0
                           M148.93 235.13h0M182.64 181.37h0M216.36 127.61h0M250.07 73.84h0M283.79 20.08h0M31.64 497.19h0M65.35 443.43h0M99.07 389.66h0M132.78 335.9h0M166.49 282.14h0M200.21 228.38h0M233.92 174.62h0M267.64 120.86h0M301.35 67.09h0
                           M335.07 13.33h0M15.49 597.96h0M49.2 544.2h0M82.92 490.44h0M116.63 436.68h0M150.34 382.91h0M184.06 329.15h0M217.77 275.39h0M251.49 221.63h0M285.2 167.87h0M318.92 114.1h0M352.63 60.34h0M386.34 6.58h0M66.77 591.21h0
                           M100.48 537.45h0M134.19 483.69h0M167.91 429.92h0M201.62 376.16h0M235.34 322.4h0M269.05 268.64h0M302.77 214.88h0M336.48 161.12h0M370.19 107.35h0M403.91 53.59h0M118.04 584.46h0M151.76 530.7h0M185.47 476.94h0M219.19 423.17h0
                           M252.9 369.41h0M286.62 315.65h0M320.33 261.89h0M354.04 208.13h0M387.76 154.36h0M421.47 100.6h0M455.19 46.84h0M169.32 577.71h0M203.04 523.95h0M236.75 470.18h0M270.46 416.42h0M304.18 362.66h0M337.89 308.9h0M371.61 255.14h0
                           M405.32 201.38h0M439.04 147.61h0M472.75 93.85h0M506.46 40.09h0M220.6 570.96h0M254.31 517.2h0M288.03 463.43h0M321.74 409.67h0M355.46 355.91h0M389.17 302.15h0M422.89 248.39h0M456.6 194.62h0M490.31 140.86h0M524.03 87.1h0
                           M557.74 33.34h0M271.88 564.21h0M305.59 510.44h0M339.31 456.68h0M373.02 402.92h0M406.74 349.16h0M440.45 295.4h0M474.16 241.64h0M507.88 187.87h0M541.59 134.11h0M575.31 80.35h0M323.16 557.46h0M356.87 503.69h0M390.59 449.93h0
                           M424.3 396.17h0M458.01 342.41h0M491.73 288.65h0M525.44 234.88h0M559.16 181.12h0M592.87 127.36h0M374.44 550.7h0M408.15 496.94h0M441.86 443.18h0M475.58 389.42h0M509.29 335.66h0M543.01 281.9h0M576.72 228.13h0M392 597.72h0
                           M425.71 543.95h0M459.43 490.19h0M493.14 436.43h0M526.86 382.67h0M560.57 328.91h0M594.28 275.14h0M443.28 590.96h0M476.99 537.2h0M510.71 483.44h0M544.42 429.68h0M578.13 375.92h0M494.56 584.21h0M528.27 530.45h0M561.98 476.69h0
                           M595.7 422.93h0M545.83 577.46h0M579.55 523.7h0M597.11 570.71h0M1.99 57.18h0M35.71 3.42h0M19.56 104.19h0M53.27 50.43h0M3.41 204.96h0M37.12 151.2h0M70.84 97.44h0M104.55 43.68h0M20.97 251.98h0M54.69 198.21h0
                           M88.4 144.45h0M122.11 90.69h0M155.83 36.93h0M4.82 352.75h0M38.53 298.99h0M72.25 245.22h0M105.96 191.46h0M139.68 137.7h0M173.39 83.94h0M207.11 30.18h0M22.38 399.76h0M56.1 346h0M89.81 292.24h0M123.53 238.47h0
                           M157.24 184.71h0M190.96 130.95h0M224.67 77.19h0M258.38 23.43h0M6.23 500.53h0M39.95 446.77h0M73.66 393.01h0M107.38 339.25h0M141.09 285.49h0M174.81 231.72h0M208.52 177.96h0M242.23 124.2h0M275.95 70.44h0M309.66 16.68h0
                           M23.8 547.54h0M57.51 493.78h0M91.23 440.02h0M124.94 386.26h0M158.66 332.5h0M192.37 278.73h0M226.08 224.97h0M259.8 171.21h0M293.51 117.45h0M327.23 63.69h0M360.94 9.92h0M41.36 594.55h0M75.08 540.79h0M108.79 487.03h0
                           M142.51 433.27h0M176.22 379.51h0M209.93 325.75h0M243.65 271.98h0M277.36 218.22h0M311.08 164.46h0M344.79 110.7h0M378.51 56.94h0M412.22 3.17h0M92.64 587.8h0M126.36 534.04h0M160.07 480.28h0M193.78 426.52h0M227.5 372.76h0
                           M261.21 318.99h0M294.93 265.23h0M328.64 211.47h0M362.35 157.71h0M396.07 103.95h0M429.78 50.18h0M143.92 581.05h0M177.63 527.29h0M211.35 473.53h0M245.06 419.77h0M278.78 366.01h0M312.49 312.24h0M346.2 258.48h0M379.92 204.72h0
                           M413.63 150.96h0M447.35 97.2h0M481.06 43.43h0M195.2 574.3h0M228.91 520.54h0M262.63 466.78h0M296.34 413.02h0M330.05 359.25h0M363.77 305.49h0M397.48 251.73h0M431.2 197.97h0M464.91 144.21h0M498.63 90.44h0M532.34 36.68h0
                           M246.48 567.55h0M280.19 513.79h0M313.9 460.03h0M347.62 406.27h0M381.33 352.5h0M415.05 298.74h0M448.76 244.98h0M482.48 191.22h0M516.19 137.46h0M549.9 83.69h0M583.62 29.93h0M297.75 560.8h0M331.47 507.04h0M365.18 453.28h0
                           M398.9 399.51h0M432.61 345.75h0M466.33 291.99h0M500.04 238.23h0M533.75 184.47h0M567.47 130.7h0M349.03 554.05h0M382.75 500.29h0M416.46 446.53h0M450.17 392.76h0M483.89 339h0M517.6 285.24h0M551.32 231.48h0M585.03 177.72h0
                           M400.31 547.3h0M434.02 493.54h0M467.74 439.77h0M501.45 386.01h0M535.17 332.25h0M568.88 278.49h0M417.87 594.31h0M451.59 540.55h0M485.3 486.79h0M519.02 433.02h0M552.73 379.26h0M586.45 325.5h0M469.15 587.56h0M502.87 533.8h0
                           M536.58 480.03h0M570.3 426.27h0M520.43 580.81h0M554.15 527.05h0M587.86 473.28h0M571.71 574.06h0M29.24 27.13h0M88.57 27.02h0M147.89 26.92h0M207.22 26.81h0M266.54 26.7h0M325.86 26.59h0M385.19 26.48h0M444.51 26.38h0
                           M503.84 26.27h0M563.16 26.16h0M44.63 74.83h0M103.95 74.73h0M163.28 74.62h0M222.6 74.51h0M281.93 74.4h0M341.25 74.3h0M400.57 74.19h0M459.9 74.08h0M519.22 73.97h0M578.55 73.86h0M0.69 122.65h0M600.69 122.65h0
                           M60.01 122.54h0M119.34 122.43h0M178.66 122.32h0M237.99 122.21h0M297.31 122.11h0M356.64 122h0M415.96 121.89h0M475.28 121.78h0M534.61 121.68h0M593.93 121.57h0M16.07 170.35h0M75.4 170.24h0M134.72 170.13h0M194.05 170.03h0
                           M253.37 169.92h0M312.7 169.81h0M372.02 169.7h0M431.35 169.59h0M490.67 169.49h0M549.99 169.38h0M31.46 218.05h0M90.78 217.94h0M150.11 217.84h0M209.43 217.73h0M268.76 217.62h0M328.08 217.51h0M387.41 217.4h0M446.73 217.3h0
                           M506.05 217.19h0M565.38 217.08h0M46.84 265.75h0M106.17 265.65h0M165.49 265.54h0M224.82 265.43h0M284.14 265.32h0M343.47 265.22h0M402.79 265.11h0M462.12 265h0M521.44 264.89h0M580.76 264.78h0M2.91 313.57h0M62.23 313.46h0
                           M121.55 313.35h0M180.88 313.24h0M240.2 313.13h0M299.53 313.03h0M358.85 312.92h0M418.18 312.81h0M477.5 312.7h0M536.83 312.6h0M596.15 312.49h0M18.29 361.27h0M77.62 361.16h0M136.94 361.05h0M196.26 360.95h0M255.59 360.84h0
                           M314.91 360.73h0M374.24 360.62h0M433.56 360.51h0M492.89 360.41h0M552.21 360.3h0M33.68 408.97h0M93 408.86h0M152.33 408.76h0M211.65 408.65h0M270.97 408.54h0M330.3 408.43h0M389.62 408.33h0M448.95 408.22h0M508.27 408.11h0
                           M567.6 408h0M49.06 456.68h0M108.39 456.57h0M167.71 456.46h0M227.03 456.35h0M286.36 456.24h0M345.68 456.14h0M405.01 456.03h0M464.33 455.92h0M523.66 455.81h0M582.98 455.7h0M5.12 504.49h0M64.45 504.38h0M123.77 504.27h0
                           M183.1 504.16h0M242.42 504.05h0M301.74 503.95h0M361.07 503.84h0M420.39 503.73h0M479.72 503.62h0M539.04 503.52h0M598.37 503.41h0M20.51 552.19h0M79.83 552.08h0M139.16 551.97h0M198.48 551.87h0M257.81 551.76h0M317.13 551.65h0
                           M376.45 551.54h0M435.78 551.43h0M495.1 551.33h0M554.43 551.22h0M35.89 599.89h0M35.89 -0.11h0M95.22 599.78h0M95.22 -0.22h0M154.54 599.68h0M154.54 -0.32h0M213.87 599.57h0M213.87 -0.43h0M273.19 599.46h0M273.19 -0.54h0
                           M332.52 599.35h0M332.52 -0.65h0M391.84 599.25h0M391.84 -0.75h0M451.16 599.14h0M451.16 -0.86h0M510.49 599.03h0M510.49 -0.97h0M569.81 598.92h0M569.81 -1.08h0M37.28 32.25h0M96.6 32.14h0M155.92 32.03h0M215.25 31.93h0
                           M274.57 31.82h0M333.9 31.71h0M393.22 31.6h0M452.55 31.49h0M511.87 31.39h0M571.2 31.28h0M52.66 79.95h0M111.99 79.84h0M171.31 79.74h0M230.63 79.63h0M289.96 79.52h0M349.28 79.41h0M408.61 79.31h0M467.93 79.2h0
                           M527.26 79.09h0M586.58 78.98h0M8.72 127.76h0M68.05 127.66h0M127.37 127.55h0M186.7 127.44h0M246.02 127.33h0M305.34 127.22h0M364.67 127.12h0M423.99 127.01h0M483.32 126.9h0M542.64 126.79h0M24.11 175.47h0M83.43 175.36h0
                           M142.76 175.25h0M202.08 175.14h0M261.41 175.04h0M320.73 174.93h0M380.05 174.82h0M439.38 174.71h0M498.7 174.6h0M558.03 174.5h0M39.49 223.17h0M98.82 223.06h0M158.14 222.95h0M217.47 222.85h0M276.79 222.74h0M336.11 222.63h0
                           M395.44 222.52h0M454.76 222.41h0M514.09 222.31h0M573.41 222.2h0M54.88 270.87h0M114.2 270.76h0M173.53 270.66h0M232.85 270.55h0M292.18 270.44h0M351.5 270.33h0M410.82 270.23h0M470.15 270.12h0M529.47 270.01h0M588.8 269.9h0
                           M10.94 318.68h0M70.26 318.58h0M129.59 318.47h0M188.91 318.36h0M248.24 318.25h0M307.56 318.14h0M366.89 318.04h0M426.21 317.93h0M485.53 317.82h0M544.86 317.71h0M26.32 366.39h0M85.65 366.28h0M144.97 366.17h0M204.3 366.06h0
                           M263.62 365.96h0M322.95 365.85h0M382.27 365.74h0M441.6 365.63h0M500.92 365.52h0M560.24 365.42h0M41.71 414.09h0M101.03 413.98h0M160.36 413.87h0M219.68 413.77h0M279.01 413.66h0M338.33 413.55h0M397.66 413.44h0M456.98 413.34h0
                           M516.3 413.23h0M575.63 413.12h0M57.09 461.79h0M116.42 461.69h0M175.74 461.58h0M235.07 461.47h0M294.39 461.36h0M353.72 461.25h0M413.04 461.15h0M472.37 461.04h0M531.69 460.93h0M591.01 460.82h0M13.16 509.6h0M72.48 509.5h0
                           M131.8 509.39h0M191.13 509.28h0M250.45 509.17h0M309.78 509.06h0M369.1 508.96h0M428.43 508.85h0M487.75 508.74h0M547.08 508.63h0M28.54 557.31h0M87.87 557.2h0M147.19 557.09h0M206.51 556.98h0M265.84 556.88h0M325.16 556.77h0
                           M384.49 556.66h0M443.81 556.55h0M503.14 556.44h0M562.46 556.34h0M50.81 2.97h0M110.14 2.86h0M169.46 2.75h0M228.78 2.65h0M288.11 2.54h0M347.43 2.43h0M406.76 2.32h0M466.08 2.22h0M525.41 2.11h0M584.73 2h0
                           M6.87 50.78h0M66.2 50.67h0M125.52 50.57h0M184.84 50.46h0M244.17 50.35h0M303.49 50.24h0M362.82 50.13h0M422.14 50.03h0M481.47 49.92h0M540.79 49.81h0M22.26 98.48h0M81.58 98.38h0M140.91 98.27h0M200.23 98.16h0
                           M259.55 98.05h0M318.88 97.95h0M378.2 97.84h0M437.53 97.73h0M496.85 97.62h0M556.18 97.51h0M37.64 146.19h0M96.97 146.08h0M156.29 145.97h0M215.62 145.86h0M274.94 145.76h0M334.26 145.65h0M393.59 145.54h0M452.91 145.43h0
                           M512.24 145.32h0M571.56 145.22h0M53.03 193.89h0M112.35 193.78h0M171.68 193.67h0M231 193.57h0M290.33 193.46h0M349.65 193.35h0M408.97 193.24h0M468.3 193.14h0M527.62 193.03h0M586.95 192.92h0M9.09 241.7h0M68.41 241.59h0
                           M127.74 241.49h0M187.06 241.38h0M246.39 241.27h0M305.71 241.16h0M365.03 241.05h0M424.36 240.95h0M483.68 240.84h0M543.01 240.73h0M24.47 289.4h0M83.8 289.3h0M143.12 289.19h0M202.45 289.08h0M261.77 288.97h0M321.1 288.87h0
                           M380.42 288.76h0M439.74 288.65h0M499.07 288.54h0M558.39 288.43h0M39.86 337.11h0M99.18 337h0M158.51 336.89h0M217.83 336.78h0M277.16 336.68h0M336.48 336.57h0M395.81 336.46h0M455.13 336.35h0M514.45 336.25h0M573.78 336.14h0
                           M55.24 384.81h0M114.57 384.7h0M173.89 384.59h0M233.22 384.49h0M292.54 384.38h0M351.87 384.27h0M411.19 384.16h0M470.52 384.06h0M529.84 383.95h0M589.16 383.84h0M11.3 432.62h0M70.63 432.51h0M129.95 432.41h0M189.28 432.3h0
                           M248.6 432.19h0M307.93 432.08h0M367.25 431.97h0M426.58 431.87h0M485.9 431.76h0M545.22 431.65h0M26.69 480.32h0M86.01 480.22h0M145.34 480.11h0M204.66 480h0M263.99 479.89h0M323.31 479.79h0M382.64 479.68h0M441.96 479.57h0
                           M501.29 479.46h0M560.61 479.35h0M42.08 528.03h0M101.4 527.92h0M160.72 527.81h0M220.05 527.7h0M279.37 527.6h0M338.7 527.49h0M398.02 527.38h0M457.35 527.27h0M516.67 527.17h0M576 527.06h0M57.46 575.73h0M116.79 575.62h0
                           M176.11 575.52h0M235.43 575.41h0M294.76 575.3h0M354.08 575.19h0M413.41 575.08h0M472.73 574.98h0M532.06 574.87h0M591.38 574.76h0M23.42 20.18h0M80.69 3.46h0M5.2 72.68h0M62.47 55.96h0M119.74 39.24h0M177 22.52h0
                           M234.27 5.8h0M44.25 108.46h0M101.51 91.74h0M158.78 75.02h0M216.05 58.3h0M273.31 41.58h0M330.58 24.86h0M387.85 8.14h0M26.03 160.95h0M83.29 144.24h0M140.56 127.52h0M197.83 110.8h0M255.09 94.08h0M312.36 77.36h0
                           M369.63 60.64h0M426.89 43.92h0M484.16 27.2h0M541.43 10.48h0M7.81 213.45h0M65.07 196.73h0M122.34 180.01h0M179.61 163.29h0M236.87 146.57h0M294.14 129.85h0M351.41 113.13h0M408.67 96.42h0M465.94 79.7h0M523.21 62.98h0
                           M580.47 46.26h0M46.85 249.23h0M104.12 232.51h0M161.38 215.79h0M218.65 199.07h0M275.92 182.35h0M333.18 165.63h0M390.45 148.91h0M447.72 132.19h0M504.98 115.47h0M562.25 98.75h0M28.63 301.73h0M85.9 285.01h0M143.16 268.29h0
                           M200.43 251.57h0M257.7 234.85h0M314.96 218.13h0M372.23 201.41h0M429.5 184.69h0M486.76 167.97h0M544.03 151.25h0M10.41 354.23h0M67.67 337.51h0M124.94 320.79h0M182.21 304.07h0M239.48 287.35h0M296.74 270.63h0M354.01 253.91h0
                           M411.28 237.19h0M468.54 220.47h0M525.81 203.75h0M583.08 187.03h0M49.45 390.01h0M106.72 373.29h0M163.99 356.57h0M221.25 339.85h0M278.52 323.13h0M335.79 306.41h0M393.05 289.69h0M450.32 272.97h0M507.59 256.25h0M564.85 239.53h0
                           M31.23 442.51h0M88.5 425.79h0M145.77 409.07h0M203.03 392.35h0M260.3 375.63h0M317.57 358.91h0M374.83 342.19h0M432.1 325.47h0M489.37 308.75h0M546.63 292.03h0M13.01 495h0M70.28 478.28h0M127.54 461.56h0M184.81 444.84h0
                           M242.08 428.12h0M299.34 411.4h0M356.61 394.69h0M413.88 377.97h0M471.14 361.25h0M528.41 344.53h0M585.68 327.81h0M52.06 530.78h0M109.32 514.06h0M166.59 497.34h0M223.86 480.62h0M281.12 463.9h0M338.39 447.18h0M395.66 430.46h0
                           M452.92 413.74h0M510.19 397.02h0M567.46 380.3h0M33.84 583.28h0M91.1 566.56h0M148.37 549.84h0M205.64 533.12h0M262.9 516.4h0M320.17 499.68h0M377.44 482.96h0M434.7 466.24h0M491.97 449.52h0M549.24 432.8h0M187.41 585.62h0
                           M244.68 568.9h0M301.95 552.18h0M359.21 535.46h0M416.48 518.74h0M473.75 502.02h0M531.01 485.3h0M588.28 468.58h0M340.99 587.96h0M398.26 571.24h0M455.53 554.52h0M512.79 537.8h0M570.06 521.08h0M494.57 590.3h0M551.84 573.58h0
                           M26.93 23.4h0M84.2 6.68h0M8.71 75.9h0M65.98 59.18h0M123.25 42.46h0M180.51 25.74h0M237.78 9.02h0M47.76 111.67h0M105.03 94.95h0M162.29 78.23h0M219.56 61.51h0M276.83 44.8h0M334.09 28.08h0M391.36 11.36h0
                           M29.54 164.17h0M86.8 147.45h0M144.07 130.73h0M201.34 114.01h0M258.6 97.29h0M315.87 80.57h0M373.14 63.85h0M430.4 47.13h0M487.67 30.41h0M544.94 13.7h0M11.32 216.67h0M68.58 199.95h0M125.85 183.23h0M183.12 166.51h0
                           M240.38 149.79h0M297.65 133.07h0M354.92 116.35h0M412.18 99.63h0M469.45 82.91h0M526.72 66.19h0M583.98 49.47h0M50.36 252.45h0M107.63 235.73h0M164.9 219.01h0M222.16 202.29h0M279.43 185.57h0M336.7 168.85h0M393.96 152.13h0
                           M451.23 135.41h0M508.5 118.69h0M565.76 101.97h0M32.14 304.95h0M89.41 288.23h0M146.67 271.51h0M203.94 254.79h0M261.21 238.07h0M318.47 221.35h0M375.74 204.63h0M433.01 187.91h0M490.27 171.19h0M547.54 154.47h0M13.92 357.45h0
                           M71.19 340.73h0M128.45 324.01h0M185.72 307.29h0M242.99 290.57h0M300.25 273.85h0M357.52 257.13h0M414.79 240.41h0M472.05 223.69h0M529.32 206.97h0M586.59 190.25h0M52.96 393.22h0M110.23 376.5h0M167.5 359.78h0M224.77 343.07h0
                           M282.03 326.35h0M339.3 309.63h0M396.57 292.91h0M453.83 276.19h0M511.1 259.47h0M568.37 242.75h0M34.74 445.72h0M92.01 429h0M149.28 412.28h0M206.54 395.56h0M263.81 378.84h0M321.08 362.12h0M378.34 345.4h0M435.61 328.68h0
                           M492.88 311.97h0M550.14 295.25h0M16.52 498.22h0M73.79 481.5h0M131.06 464.78h0M188.32 448.06h0M245.59 431.34h0M302.86 414.62h0M360.12 397.9h0M417.39 381.18h0M474.66 364.46h0M531.92 347.74h0M589.19 331.02h0M55.57 534h0
                           M112.83 517.28h0M170.1 500.56h0M227.37 483.84h0M284.63 467.12h0M341.9 450.4h0M399.17 433.68h0M456.43 416.96h0M513.7 400.24h0M570.97 383.52h0M37.35 586.5h0M94.61 569.78h0M151.88 553.06h0M209.15 536.34h0M266.41 519.62h0
                           M323.68 502.9h0M380.95 486.18h0M438.21 469.46h0M495.48 452.74h0M552.75 436.02h0M190.93 588.84h0M248.19 572.12h0M305.46 555.4h0M362.73 538.68h0M419.99 521.96h0M477.26 505.24h0M534.53 488.52h0M591.79 471.8h0M344.5 591.18h0
                           M401.77 574.46h0M459.04 557.74h0M516.3 541.02h0M573.57 524.3h0M498.08 593.52h0M555.35 576.8h0M4.46 2.81h0M43.51 38.58h0M100.77 21.86h0M158.04 5.14h0M25.29 91.08h0M82.55 74.36h0M139.82 57.64h0M197.09 40.92h0
                           M254.35 24.2h0M311.62 7.48h0M7.07 143.58h0M64.33 126.86h0M121.6 110.14h0M178.87 93.42h0M236.13 76.7h0M293.4 59.98h0M350.67 43.26h0M407.93 26.54h0M465.2 9.82h0M46.11 179.36h0M103.38 162.64h0M160.64 145.92h0
                           M217.91 129.2h0M275.18 112.48h0M332.44 95.76h0M389.71 79.04h0M446.98 62.32h0M504.24 45.6h0M561.51 28.88h0M27.89 231.86h0M85.16 215.14h0M142.42 198.42h0M199.69 181.7h0M256.96 164.98h0M314.22 148.26h0M371.49 131.54h0
                           M428.76 114.82h0M486.02 98.1h0M543.29 81.38h0M9.67 284.36h0M66.94 267.64h0M124.2 250.92h0M181.47 234.2h0M238.74 217.48h0M296 200.76h0M353.27 184.04h0M410.54 167.32h0M467.8 150.6h0M525.07 133.88h0M582.34 117.16h0
                           M48.71 320.13h0M105.98 303.41h0M163.25 286.69h0M220.51 269.98h0M277.78 253.26h0M335.05 236.54h0M392.31 219.82h0M449.58 203.1h0M506.85 186.38h0M564.11 169.66h0M30.49 372.63h0M87.76 355.91h0M145.03 339.19h0M202.29 322.47h0
                           M259.56 305.75h0M316.83 289.03h0M374.09 272.31h0M431.36 255.59h0M488.63 238.87h0M545.89 222.16h0M12.27 425.13h0M69.54 408.41h0M126.8 391.69h0M184.07 374.97h0M241.34 358.25h0M298.61 341.53h0M355.87 324.81h0M413.14 308.09h0
                           M470.41 291.37h0M527.67 274.65h0M584.94 257.93h0M51.32 460.91h0M108.58 444.19h0M165.85 427.47h0M223.12 410.75h0M280.38 394.03h0M337.65 377.31h0M394.92 360.59h0M452.18 343.87h0M509.45 327.15h0M566.72 310.43h0M33.1 513.41h0
                           M90.36 496.69h0M147.63 479.97h0M204.9 463.25h0M262.16 446.53h0M319.43 429.81h0M376.7 413.09h0M433.96 396.37h0M491.23 379.65h0M548.5 362.93h0M14.87 565.91h0M72.14 549.19h0M129.41 532.47h0M186.67 515.75h0M243.94 499.03h0
                           M301.21 482.31h0M358.47 465.59h0M415.74 448.87h0M473.01 432.15h0M530.27 415.43h0M587.54 398.71h0M111.19 584.96h0M168.45 568.24h0M225.72 551.53h0M282.99 534.81h0M340.25 518.09h0M397.52 501.37h0M454.79 484.65h0M512.05 467.93h0
                           M569.32 451.21h0M264.77 587.3h0M322.03 570.58h0M379.3 553.86h0M436.57 537.14h0M493.83 520.43h0M551.1 503.71h0M418.34 589.64h0M475.61 572.92h0M532.88 556.2h0M590.14 539.48h0M571.92 591.98h0"/>
                      </pattern>
                      <clipPath id="fp-sand-clip">
                        <rect width="100" height="100"/>
                      </clipPath>
                    </defs>
                    <rect width="100" height="100" fill="#fff" stroke="#bbb" stroke-width="2.5"/>
                    <rect width="100" height="100" fill="url(#fp-sand)" clip-path="url(#fp-sand-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="gravel" title="Gravel">
                  <svg width="40" height="40" viewBox="0 0 80 80">
                    <defs>
                      <!-- Built from ghiaia2.pat ("ghiaia" = gravel), not a literal reproduction.
                           The file is exactly periodic on a 1x1 cell: its 80 line families, split
                           at their T-junctions, form a complete planar tiling (crazy paving) of
                           33 stones per cell -- 15 large stones (area 0.016-0.11) and 18 small
                           wedge stones (0.001-0.009) sitting where three large stones meet.
                           Every edge is shared by two stones, so stones can't be individually
                           rotated/swapped without breaking the tiling, and a faithful tile shows
                           an obvious grid. So this is a new tiling of a periodic 10x10-cell
                           block with the file's statistics: the file's large-stone centroids
                           (jittered) and areas (shuffled across the whole block) seed a periodic
                           power diagram, relaxed until each stone's area matches its assigned
                           file area; then a wedge stone drawn from the file's small-stone
                           areas is cut in at each three-way corner. Generated, not hand-placed;
                           scaled 40x: 1500 large + 2016 wedge stones. -->
                      <pattern id="fp-gravel" width="400" height="400" patternUnits="userSpaceOnUse">
                        <path fill="none" stroke="#000" stroke-width="0.5" stroke-linejoin="round" d="M7.9 387.5l2.2-1.8-3-1.9 .8 3.7-.6 4.5 1.5 2.3-3.2 .2 1.7-2.5M11.7 395.4l1.2-.5 0 1.5-1.2-1-2.9-1.1M16.9 388l-.2-1.1 1.3 .3-1.1 .8-4 6.9M-0.2 380.5l3.8-.1-1.9-3.1-1.9 3.2
                           M399.8 380.5l3.8-.1M401.7 377.3l-1.9 3.2-4.2 2.3-1.7 2.5-1.4-2.2 3.1-.3M393.4 390.5l.8 2.1-2.1-.5 1.3-1.6 .5-5.2M398.7 397.2l1 .2-.7 .9-.3-1.1-4.5-4.6
                           M16.3 381l-1.4-2.9 3.3 1-1.9 1.9-.2 5.3 .6 .6M14 371.2l-2.6 .1 1.4 3.1 1.2-3.2 1.8-1.8-.6-1.9-2-1 2.5-1.7-.5 2.7M8.3 367.9l0 .3-.4-.2 .4-.1 4.9-1.4
                           M19.2 387l.4 .1-.2-.3-.2 .2-1.2 .2M14.8 399.8l3 2.2M14.8-.2l3 2.2-3.5 .9 .5-3.1M14.3 402.9l.5-3.1-1.9-3.4M28.8 393.2l.3-1 .6 .9-.9 .1-8.6 9.3
                           M41.1 394.9l3 .2-.8-2.7-2.2 2.5-3.1 1.6-.9 1.6-1.1-1.6 2 0M37.3 2.3l1.8 2.4-3 .4 1.2-2.8-.2-4.2M45.9 7.6l.4-.1 0 .4-.4-.3-6.8-2.9M22.5 378.4l1.3-.2-.6-1-.7 1.2-.8 .6-2.3 7.8
                           M33.2 382l0-.8 .6 .5-.6 .3-4.4 9.5 .3 .7M44.9 387.8l1.7-.9-1.8-1.6 .1 2.5-1.6 4.6M54.7 398l.4-.6 .4 .5-.8 .1-3.8 2.5-6.8-5.4M55 390.1l-1.2-1.5 2.3-.3-1.1 1.8 .1 7.3
                           M24.1 371.3l.8-.6-1.2-.7 .4 1.3-.9 5.9M34.9 372l-.2-.2 .4-.1-.2 .3-1.9 8.8 .2 .4M46.3 378.7l.1-2.6 1.7 1.4-1.8 1.2-2 5.1-10.5-2.1M22.5 365.7l-1.4-1.5 1.9-.7-.5 2.2 .7 3.6-7.4 .1
                           M37.1 360.4l1.5-.5-1.2-.9-.3 1.4-.8 .8-1 10.3-.2 .2M49.8 368.2l.3-2.3 1.6 1.1-1.9 1.2-4 6.4 .6 1.5M48.6 361.1l-.6-.5 .9-.2-.3 .7 1.5 4.8M26.8 357.9l1.4-.8-1.5-.5 .1 1.3-3.8 5.6
                           M5.1 359.6l1-2.2-3 .2 2 2 2.5 8.3 .3 .1M15.1 355.1l-.9-1.1 1.5 .2-.6 .9 1.9 8-1.3 1.7M1.7 336.9l.4-2.9-2.4 .6 2 2.3 1.3 3.1 1.5 1.3-1.8 .6 .3-1.9M402.1 334l-2.4 .6 2 2.3
                           M8.7 342.1l3.7-1.1-1.1 3.6-2.6-2.5-4.2-.8M14.6 339l.2-.6 .5 .3-.7 .3-2.2 2M12.2 332.2l-1.8-1.3 2.2-.6-.4 1.9 2.6 6.2M6 330.5l-1.8 .8-.2-1.8 2 1 4.4 .4
                           M397.5 348.1l-.2 2.1-1.8-1.2 2-.9 5.2-6.2M4.4 316.4l1.3-1.4-1.9 .1 .6 1.3-3 9.8 .2 1-1-.3 .8-.7M15.5 328l1-2.7 1.9 2.2-2.9 .5-2.9 2.3M15.5 318.1l-.3-.6 .6 .2-.3 .4 1 7.2
                           M21.6 353.1l2.1 .6-.4-2-1.7 1.4-5.9 1.1M33.6 353.3l1.3 .3-.3-2.1-1 1.8-4.4 3.8 7.1 4.1M25.8 345.7l1.4-1.1-1.7-.4 .3 1.5-2.5 6M17.4 338.7l2.4 .8-.4-2-2 1.2-2.1 0
                           M38.5 327.3l3.1 .6-1.5-2.9-1.6 2.3-6.4 2.3-1.5 1.3 .2-2 1.3 .7M31.8 336.1l1.8 1.4-1.9 .9 .1-2.3-1.8-4.1 .6-1.1M40.5 338.6l2.1-.8-.7 2.2-1.4-1.4-6.9-1.1
                           M44 336.2l.3-.8 .4 .7-.7 .1-1.4 1.6M44.3 330.9l-.5-1.1 .9 0-.4 1.1 0 4.5M22.3 332.7l2.4-1.2-2.4-1.4 0 2.6-2.9 4.8M41.3 345.6l1-2.3 1.5 2.1-2.5 .2-6.6 4.5-.1 1.4
                           M28.2 322.2l.4-.6 0 .7-.4-.1-6.9 6.3 1 1.6M44.3 317.9l1.6 0-.9-2-.7 2-4.4 4.8 .2 2.3M49.5 326l1-2 1.1 1.8-2.1 .2-4.8 3.8M12.5 312.2l2 1.9 1.2-3-3.2 1.1-3.4 0-1.4 .8 .1-1.7 1.3 .9
                           M4.3 301.7l.3-.9-1.1 .2 .8 .7 3.5 9.6M18.7 308.7l1-2.1 .9 2.3-1.9-.2-3 2.4M19.8 304.1l-.5-1.1 1 0-.5 1.1-.1 2.5M12.1 296.5l-1 0 .6-1 .4 1 7.2 6.5
                           M396 304.5l-.8 .9-.1-1.1 .9 .2 6.8-3.7-3.7-8.6-5.4 .4-1 .7 0-1.2 1 .5M396.5 310.3l3.1 3.2-4.1 .9 1-4.1-1.5-4.3 .2-.6M0.9 278.8l2-.4-.9-1.4-1.1 1.8-1.1 .9 1 9 1.5 1.4-2.2 .9 .7-2.3
                           M7.8 290.5l2.7-1.7 .2 3.7-2.9-2-5.5-.4M11.7 285.5l0-1.6 1 .6-1 1-1.2 3.3M11.1 281.8l-1.2-1.3 1.7-.3-.5 1.6 .6 2.1M35.9 307.4l2.1 .1-1-2.4-1.1 2.3-9.6 7.4-.1 .5-10.4 2.4
                           M21.7 290.9l1.1 .3-.1-1.3-1 1-9.9 3.8-.1 .8M26.1 297.6l.1-1.2 1.3 .5-1.4 .7-5.8 5.4M29 293.3l-2.3-3.4 4.9-1.4-2.6 4.8-.6 3.5 8.7 6.5-.1 1.8
                           M41.5 288l1.8 1.6-.3-2.2-1.5 .6-2.7-1.4-2.3-.6 2-1 .3 1.6M41.7 299.7l1.6-3 1.6 2.1-3.2 .9-4.6 3.6M17.3 283l2.3 0-2-1.2-.3 1.2-4.6 1.5M13.2 278.8l1.1 0-.6-1.2-.5 1.2-1.6 1.4
                           M30.2 276.2l.5-.6-.6-.1 .1 .7-.3 .8 0 .5-.3-.1 .3-.4M40.9 282.2l.3-2.2 1.8 1.7-2.1 .5-2.4 2.8M39.9 277.2l-1.9-1.3 1.7-1.1 .2 2.4 1.3 2.8M3.2 270.8l1.4-1.1-1.8-1.1 .4 2.2-1.2 6.2
                           M13.5 272.4l-1.8-1.9 2.8-1.3-1 3.2 .2 5.2M396.1 251.6l2.3-.3-1.6-1.6-.7 1.9-4.4 2.5-.5 .5 0-.7 .5 .2M394.6 264.2l3.3 2.6-4.2 1.5 .9-4.1-3.7-9.1 .3-.5
                           M4.7 263.5l.6-3.2 2.1 1.7-2.7 1.5-2.5 3.7-4.3-.4M4 254.4l-2.1-2.2 3.2-.5-1.1 2.7 1.3 5.9M-0.6 238.2l2.4-.8-2.4-.9M399.4 238.2l2.4-.8-2.4-.9 0 1.7-4.6 3.6 2 7.9
                           M8.7 249.5l.8-1.6 1.2 1.4-2 .2-3.6 2.2M8.5 241.1l-1.2-2.3 2.4 .7-1.2 1.6 1 6.8M19.8 266.1l2.3 .7-.7-2.3-1.6 1.6-3.9 1-1.4 2.1M37.3 269.3l1.5-.4-1.2-1-.3 1.4-6.1 6.1 6.8 .5
                           M40.7 271.4l-.2-1.5 1.3 .6-1.1 .9-1 3.4M35.5 261.9l-2.2-2.2 3.3 0-1.1 2.2 2.1 6M39.6 258.7l1.4 .3-.4-1.3-1 1-3 1M43.6 263.2l-.3-2 2.2 1.1-1.9 .9-3.8 6 .7 .7
                           M26.1 255.3l1.9-.1-1.4-2.9-.5 3-4.5 7.3-6.8-.7-.1 .1 1.2 5.1M28.8 235.5l1.6-1.4-2.1-.7 .5 2.1-.5 1.5 6 6 1.4-4.7-.9-2.7 3 .4-2.1 2.3M32.6 233.9l-.4-.1 .3-.3 .1 .4 2.2 1.7
                           M17.7 247l3.1 .1-1.6-2.7-1.5 2.6-5.8 2.7 2.9 12.2M15.3 238.6l2.5 .7-1.1-2.4-1.4 1.7-5.6 .9M43 250.3l-.6-1.9 2.3 .5-1.7 1.4-2.4 7.4M12.3 227.2l.5 .2-.1-.5-.4 .3-.3 0-6 10.5 1.3 1.1
                           M16.5 232l-1.6-3 3.4 .8-1.8 2.2 .2 4.9M-1.8 223.8l3.2-1.8-3.2-2M398.2 223.8l3.2-1.8-3.2-2 0 3.8-2.4 4.2-.3 3.3-2.3-1.5 2.6-1.8M396.3 233.8l.3 .6-.5 0 .2-.6-.8-2.5
                           M8.8 223.6l-2.8-1.3 2.7-1.3 .1 2.6 3.2 3.6M14.6 220.3l-1-2.4 3.1 .6-2.1 1.8-1.9 6.6M-0.1 197.3l1.9-1.7-1.9-.6M399.9 197.3l1.9-1.7-1.9-.6 0 2.3-.8 1.4 3.2 7.6
                           M2.3 206.3l1.7 1.5-2.1 .6 .4-2.1-3.2-7.6M7.7 208.8l3.1-.9-.8 3.1-2.3-2.2-3.7-1M14.1 204.4l1.2-3.5 2.2 2.2-3.4 1.3-3.3 3.5M15.2 197.8l-.5-.8 .9 .1-.4 .7 .1 3.1
                           M9.7 192.6l-1.5-.2 1-1.2 .5 1.4 5 4.4M25.5 230l-2.8-1 2.3-1.9 .5 2.9 2.8 3.4M42 234.2l1.2-2.5 2.3 2.4-3.5 .1-4.2 1.8M42 227.8l-1.8-1.8 2.2-.6-.4 2.4 1.2 3.9
                           M26.3 223.8l1.6-.9-1.8-1.3 .2 2.2-1.3 3.3M22.4 217.7l1.8 .9-.1-2.2-1.7 1.3-5.7 .8M33 209.4l2 0-1.2-1.3-.8 1.3-5 1.5-2.4 2.1-.1-3.2 2.5 1.1
                           M38 221.6l.7-4.2 3 3-3.7 1.2-2 2.7-.1 0-3.4 9.2M22.4 203.9l.1-.4-.4 .1 .3 .3 3.1 5.9M32.5 202.9l-2.2-2.2 3.4-.3-1.2 2.5 1.3 5.2M27.7 200.1l-.7 .1 0-.6 .7 .5 2.6 .6
                           M38.6 208l3.2-.9-2.2-1.9-1 2.8-2.3 1.8 2.4 7.6M49.5 217.8l1.3-1.6 .1 2-1.4-.4-5 3.5-2.8-.9M49.4 208.4l-1.1-.8 1.4-.6-.3 1.4 1.9 6.5-.5 1.3M16.9 196.3l1.3-.1-.5-1-.8 1.1-1.3 .8
                           M21.4 198.3l-1.1-1.4 2-.1-.9 1.5 .5 5.1-4.4-.3M37.2 198.7l.9 .5 .3-1.5-1.2 1-3.5 1.7M24.5 196.2l-.6-.2 .4-.6 .2 .8 2.5 3.4M14.5 188.1l2.7 .5-.7-2.8-2 2.3-4.9 2-.4 1.1
                           M1.4 180.9l1.3 .3-.4-1.7-.9 1.4-5.3 3.5M396.1 184.4l-.9 1.2-.3-1.4 1.2 .2 5.3-3.5M17.7 181.7l-.8-3.1 3.2 1-2.4 2.1-1.2 4.1M13.9 175.6l-2.6-.6 1.8-2.1 .8 2.7 3 3
                           M2.5 155.5l1.8-1.1-1.7-1.2-.1 2.3-1.9 4.3 0 1.5-1.1-.9 1.1-.6M400.6 161.3l-1.1-.9 1.1-.6M9.8 163.3l2.6-1.8 .6 3.7-3.2-1.9-8.7-1.1-.5-.9M13.9 155.6l-.4-.6 1-.3-.6 .9-1.5 5.9
                           M24.5 192l-1.7-1.8 3-1.2-1.3 3-.2 3.4M37.1 189l-.6-.6 .8-.2-.2 .8 1.8 7.8-.5 .9M26.6 182.6l.9-1.9-2.1 .1 1.2 1.8 .6 4.8 9.3 1M37.8 181l-.9-1.6 1.9 .3-1 1.3 0 6.8-.5 .4
                           M32 178.6l-2.1 .6 .8-1.8 1.3 1.2 3.8 .1 1.1 .7M36.6 166.1l.6-.2-.4-.4-.2 .6-2.2 2.7-.6 2.8-2.1-1.2 2.7-1.6M45.2 178.3l1-.8-.1 1.3-.9-.5-6.4 1.4
                           M44.9 170.2l-2-2.2 3-.3-1 2.5 1.7 6.5-.4 .8M25.8 171.5l2.1-1-2.4-1.7 .3 2.7-3.2 7.6-2.5 .5M23.5 166.6l.6 .3-.1-.7-.5 .4-9.1 .7-1.3 5.6M15.9 154.2l1.1 .3 0-.8-1.1 .5-.8 0-.6 .5
                           M25.4 162.1l-.7-2.2 2.5 .2-1.8 2-1.4 4.1M43 160.7l2.9 .1-.9-2.9-2 2.8-6.2 4.4 0 .4M48.3 163.5l-.3-.8 .8 0-.5 .8-.6 3.1-1.8 1.1M1.7 145.6l3.2-2.1-2.2-1.5-1 3.6-1.4 2 2.3 5.6
                           M11.4 144.4l-1.2-1.4 1.6-.1-.4 1.5 3.7 9.8M3.2 133.5l1-.5-.8-.5-.2 1-.9 1.1-.3 1-.6-.6 .9-.4M8.8 138.3l-1.8-3.6 3.8 1.2-2 2.4 .3 4.2 1.1 .5
                           M19.2 136.1l-2.1-.8 1.3-1.4 .8 2.2 1.1 1.2-.1 .3-8.4 5.3M3.3 121.4l2.6-.4-1.7-3.3-.9 3.7-2.3 3.3-.2 2.3-1.9-1.2 2.1-1.1M400.8 127l-1.9-1.2 2.1-1.1
                           M9.3 125.9l-.3-2.1 2.4 .9-2.1 1.2-4.3 7.1 2 1.7M22.9 148.5l3.8-1-3-2.4-.8 3.4-5.9 5.2M42.5 150.8l2.5 2 0-3.3-2.5 1.3-11.1-2.4-2.6 11 8 5.7
                           M33.1 143.7l-.1-3.3 2.5 1.1-2.4 2.2-1.7 4.7-4.7-.9M31.5 137l-1.8-1.6 2.1-.5-.3 2.1 1.5 3.4M27.5 134.5l-1.3 0 .7-.9 .6 .9 2.2 .9M35.2 131.5l1.9-.3-1.2-1.7-.7 2-3.4 3.4
                           M41.3 139.8l1.3-1.6 .7 2.2-2-.6-5.8 1.7M42.9 135.4l-.9-1.6 1.7-.4-.8 2-.3 2.8M27.3 129.8l1.6-2.1-2.3-.8 .7 2.9-.4 3.8M33.7 126.8l-1.8-.2 .6-1.2 1.2 1.4 2.1 1.2 .1 1.5
                           M38 126.7l3.1 .5-.9-3.6-2.2 3.1-2.2 1.3M44.8 132.1l0-.5 .5 .2-.5 .3-1.1 1.3M18.6 124.4l.9-.2-.4-.6-.5 .8-.5 .3 .3 9.2M34 118.2l3.2 .2-1.3-2.7-1.9 2.5-2.4 1-.4 .5-.2-.6 .6 .1
                           M30.9 120.5l0 .7-.3-.1 .3-.6 .3-.8M40.8 120.8l-.2-.3 .5 0-.3 .3-.6 2.8M14.1 109.2l1.7 .1-.7-1.7-1 1.6-10.2 6.1 .3 2.4M21 114.9l-.7-2 2.1 .4-1.4 1.6-1.9 8.7
                           M0.8 99.9l1.3-.3-1-.8-.3 1.1-.7 .6 .6 10.7 1.5 2.8-3.1-.8 1.6-2M402.2 114l-3.1-.8 1.6-2M12.4 102l-3.3-1.9 3.5-1.6-.2 3.5 2.9 4.3-.2 1.3
                           M7.7 85.2l1.1 .2-.5-1-.6 .8-4.4 1.6-3 1.9 .7-3.1 2.3 1.2M398.5 91l.1 1-.7-.2 .6-.8 .2-.7 1.6-1.6M17.1 93l0-.3 .4 .1-.4 .2-4.5 5.5M1.2 79l.5-.1-.2-.6-.3 .7-1 1.4-.2 1.8 1 3.4
                           M400.2 80.4l-.2 1.8-1.3-.6 1.5-1.2M-1.3 81.6l1.5-1.2M44.7 119.1l1.9-2.4 1.2 2.7-3.1-.3-3.6 1.4M47.4 111.1l-.8-2 2.2 .5-1.4 1.5-.8 5.6M44.6 107.6l-1.4-.5 1-.8 .4 1.3 2 1.5
                           M27.8 108l-2.5 1.7-.3-3 2.8 1.3 9-.5 .2-.2 6.2-.2M21.5 103.6l1.5 .4-.4-1.7-1.1 1.3-6.2 2.7M34.2 95l1.9 .5-.6-2-1.3 1.5-9.9 2.9-1.3 1.6-.7-2.2 2 .6
                           M24.2 83.3l1.6-.7-1.3-1.1-.3 1.8-6.4 9.5 4.5 4.5M36.1 90.1l-.9-2.8 2.8 1-1.9 1.8-.6 3.4M32.3 84.3l-3-1.4 1.7-1.7 1.3 3.1 2.9 3M40.5 87.9l.8 .2-.1-.7-.7 .5-2.5 .4
                           M45.6 95.8l1.2-.5-.7 1.1-.5-.6-8.5 .7-.1 10.8M10.6 73.1l2.4-1.8-3-2.2 .6 4-.7 4.4 .1 .3-.4-.1 .3-.2M15 76.4l1.8-2.4 1.6 2.8-3.4-.4-4.9 1.6-.1-.2
                           M38.2 71.4l3-.3-1.9-2.6-1.1 2.9-6.5 4.9-.8 1.6-.9-1.3 1.7-.3M46.5 78.3l.1-2.2 1.8 1.1-1.9 1.1-5.3 9.1M45.4 73.8l-1.1-1.1 1.5 0-.4 1.1 1.2 2.3
                           M21.2 68.5l3.6 1.6 .1-4.5-3.7 2.9-3.1 .8-1.4 2.4 .1 2.3M27.5 76.4l.1-.8 .7 .6-.8 .2-3.4 3.9-5.7-3.5M0.9 68.8l2.4-1.8-3-1.2 .6 3-1.3 3.6M399.6 72.4l.2 2.4-2-.9 1.8-1.5 1.3-3.6
                           M5.2 51.1l1.5-.4-1.2-.8-.3 1.2-6 3.6M399.2 54.7l-1.7 2.7-1.2-2.8 2.9 .1 6-3.6M397.2 61l.7 2-2-.5 1.3-1.5 .3-3.6M10.2 65.7l1.3-2.1 .8 2-2.1 .1-1.2 1.1 1 2.3
                           M12.3 58.5l-1.6-4.9 5 1.6-3.4 3.3-.8 5.1M3.9 40.7l3.6-.3-2.1-3.2-1.5 3.5-2.1 1.6 3.7 7.6M10.6 42.5l-.2-.6 .9 0-.7 .6-2.9 8.3 3 2.8M27.2 61.6l.5-.5-.5-.2 0 .7-2.3 4
                           M36.5 46.6l2 1.1 .3-1.9-2.3 .8-1.5-.1-2.6 6 .5 .7-1.4 .3 .9-1M38.5 53.6l1.8-1.1-.1 2.3-1.7-1.2-5.6-.4M23.4 53l2.2-.7-1.3-1.8-.9 2.5-1 1.3 4.8 6.6
                           M41.7 62.8l.4-3.1 2.4 1.9-2.8 1.2-2.7 3.5 .3 2.2M15.2 40.8l4.4 .8-1.2-3.8-3.2 3-3.9 1.1M24.2 46.1l-.9-1.9 2 .2-1.1 1.7 .1 4.4M42.2 42.7l2.9-.5-2.4-2.2-.5 2.7-3.4 3.1
                           M47.5 48.5l.5-.9 .8 .9-1.3 0-6.6 2.6-.6 1.4M31.6 43.4l-3-.4 2-2.5 1 2.9 3.4 3.1M15.9 26.2l1.1 .5 0-1.2-1.1 .7-10.1 1.1-.8 .4 .4-.8 .4 .4M20 32.7l-.4-2.3 2.1 .6-1.7 1.7-1.6 5.1
                           M396.1 27.6l-2.5 1.5-.1-3.1 2.6 1.6 8.5 .5M392.2 31.9l-.3 1.4-.8-.6 1.1-.8 1.4-2.8M392.2 36.5l1.4 3.3-3.1-1.4 1.7-1.9-.3-3.2M395.3 41.9l.5 .2-.4 .3-.1-.5-1.7-2.1
                           M5.7 17.7l1.4-2.2-2.5-.1 1.1 2.3-.3 9.2M17 21.2l-3-4.1 5-.3-2 4.4 .5 3.5-.5 .8M5.5 8.6l.9 .5-1 .4 .1-.9-6.8-9.5M31.1 37.5l-.4-1.2 1.2 .1-.8 1.1-.5 3
                           M23.6 28.2l1.2-2.1-2.2 .4 1 1.7-.4 2.3 7.5 5.8M31.4 22.5l-1.6-.2 1.2-1.8 .4 2 7.7 9.8 .1 0 3.5 7.7M43.1 28.9l1.5-3.5 2.3 1.9-3.8 1.6-3.9 3.4
                           M24.4 11.3l2.4-1.6-3.1-1.9 .7 3.5-.6 2.3 4.5 2 1.3-.8 .8 2.7-2.1-1.9M51.4 8.8l2.8-1.2-.9 3.1-1.9-1.9-5-.6-.1-.3M60.1 391.2l-.3-1.9 2.3 .7-2 1.2-4.1 6.8-.5-.1
                           M58.3 376.8l1.5-.8-1.4-.7-.1 1.5-.7 .9-.2 9.9-1.3 .7M66.3 389.8l3.5-1.7 .1 3.2-3.6-1.5-4.2 .2M69.9 379.3l-1.4-1.9 2.3 .4-.9 1.5 1.5 6.8-1.6 2
                           M66 375.7l-2.1-.4 1.8-1.2 .3 1.6 2.5 1.7M53.6 366.9l.4-.3 0 .5-.4-.2-1.9 .1M54.6 364.8l-.7-1.9 2.3 .2-1.6 1.7-.6 1.8M58.2 2.8l2.4 2-3.2 .3 .8-2.3-2.2-4.8
                           M63.2 5.5l1-.2-.2 .8-.8-.6-2.6-.7M69.6 402l2.7-4.3 2.1 4.3M69.6 2l2.7-4.3 2.1 4.3-4.8 0-5.4 3.3M73.3 393.9l1.1 .1-.3-.9-.8 .8-.7 .3-.3 3.5M77.7 4l.4-.1-.2 .5-.2-.4-3.3-2
                           M81.3 399.4l-.3-1.3 1.6 .1-1.3 1.2-3.2 4.5M75.2 389.4l-.6-2.3 2.3 1-1.7 1.3-1.1 3.7M73.9 377.6l-.6-.5 1.1-.7-.5 1.2-.5 8.4 1.2 1.1M69.2 368.5l1.2-.6-1.1-.8-.1 1.4-3.5 5.6
                           M82.1 374.7l1.2 .6 .1-1.4-1.3 .8-7.2 1.1-.5 .6M85.1 388l1.1-.4-.6 .9-.5-.5-8.2 .1M87.2 384.7l-.6-3.5 2.4 .4-1.8 3.1-.5 2.4-.5 .5M63 360.3l2.2 .3-.9-2-1.3 1.7-6.8 2.8
                           M68.1 363.4l-.9-1.3 1.5 .4-.6 .9 1.2 3.7M74.6 363.1l.8-.3-.7-.6-.1 .9-3.3 5 3.6 7.7M83.7 367.1l-1.3-1.7 2.1-.4-.8 2.1 .2 6-.5 .8
                           M52.4 347.4l2.9-.2-1.4-2.3-1.5 2.5-1.6 1.1-1.4 11.5 4.5 2.9M64.7 353.4l-1.5-2.5 3.2-.2-1.7 2.7-.4 5.2M54.1 341.6l-.9-1.6 1.8-.3-.9 1.9-.2 3.3
                           M63.2 325.4l.7 0-.3-.8-.4 .8-3.1 3-1.1 3.6-2.3-3.2 3.4-.4M59.6 334.9l.3 .3-.4 .2 .1-.5-.6-2.9M64.7 335.8l1.6-1.1 .7 1.9-2.3-.8-4.8-.6M67.5 330.3l-.8-2.6 2.8 .5-2 2.1-1.2 4.4
                           M75.7 357.7l-.6-3.1 2.8 .7-2.2 2.4-1.3 3.9 .3 .6M70.9 349.4l-.8-.5 .9-.1-.1 .6 4.2 5.2M80.9 354l1.6 .1-.5-1.3-1.1 1.2-3 1.3M86.2 363.3l.5-1.2 .7 .9-1.2 .3-1.7 1.7
                           M86.3 357.1l-1.2-1.8 2-.4-.8 2.2 .4 5M79.3 344.5l1.6 .4-.6-2-1 1.6-8.3 4.3M82.9 350l-.4-2.5 2 1.6-1.6 .9-.9 2.8M71.7 336.3l3.6 .7-1.5-3.6-2.1 2.9-3.4 1.2 1.2 11.3 .6 .1
                           M74 329.8l-.7-1.2 1.4 0-.7 1.2-.2 3.6M79.8 325l3-.1-1.9-2.6-1.1 2.7-5.1 3.6M89.7 334.2l1.1-2.8 1.8 2.6-2.9 .2-9.3 7.3-.1 1.4M57.7 319l3.6 1.2-.6-4.5-3 3.3-7.2 3 0 2
                           M80 319.1l.4 .6 .1-.7-.5 .1-2-1.1-2.3-.5 1.4-1.4 .9 1.9M73.7 317.8l-.5 .3 0-.6 .5 .3 2-.3M71.1 321.6l-.5 3.6-2.5-1.7 3-1.9 2.1-3.5M53.9 306l1.6-.5-1.5-.9-.1 1.4-9 8.5 .1 1.4
                           M51 300.5l-2-1.2 1.4-1.1 .6 2.3 3 4.1M51.2 292.9l-1.3-1.7 2.6-1-1.3 2.7-.8 5.3M69.5 312.4l-1.9-.8 1.9-1.3 0 2.1 3.7 5.1M77.4 312l-1.8-2.6 3.8-.3-2 2.9-.3 4.1
                           M71.8 308.1l-1 .3 .3-1.2 .7 .9 3.8 1.3M75.5 298.4l2 .2-.8-2-1.2 1.8-3.8 2-1.3 2.6-1.9-2.5 3.2-.1M82.4 304.9l-1-2.9 3.2 1.2-2.2 1.7-.5 2.9-2.5 1.3
                           M64.8 299.5l1-.1-.7-.8-.3 .9-8.1 6.3 4.8 7-.8 2.9M84.7 309.3l1.2-.4 .1 1.9-1.3-1.5-2.8-1.5M87.7 304.3l-.1-.7 .6 .5-.5 .2-1.8 4.6M63.1 287l1.6-1.1-1.5-.6-.1 1.7-.7 1.1 2.7 10.5
                           M77.6 290.1l-.8-2 2.1 .3-1.3 1.7-.9 6.5M73.8 285.5l-3.6-.9 2.7-2.4 .9 3.3 3 2.6M83.4 286.5l2.9 .4-1-2.8-1.9 2.4-4.5 1.9M92.6 292.5l-.1-.6 .6 .2-.5 .4-5.2 10.7 .2 .4
                           M51.7 282.6l-2.5-1.4 2.9-2.1-.4 3.5 2.1 6.3 8.6-.8M78.5 275.1l2.1 .7-.1-1.9-2 1.2-2.4 .3-1 .8-.2-1.2 1.2 .4M66.8 266.8l.5 0-.3-.6-.2 .6-6.5 8.4-.3 4.1-3.6-2.2 3.9-1.9
                           M50 271.5l-3.2-1.6 2.5-2.5 .7 4.1 3.4 5.6-1.3 2M49.8 263.9l-.6-.8 1.3-.3-.7 1.1-.5 3.5M47.5 248.3l2.1 .4-.9-1.7-1.2 1.3-2.8 .6M51.4 250.3l-.3-.6 .7 .2-.4 .4 .1 11.7-1 .8
                           M49.3 236.3l-.7-1.1 1.4-.1-.7 1.2-.6 10.7M83.5 269.6l2-.6-1.3-1.7-.7 2.3-3 4.3M88.5 280.1l2.2-3.6 2.1 3.6-4.3 0-2.7 1.5-.5 2.5M91 272.1l-1.1-1.5 1.9-.4-.8 1.9-.3 4.4
                           M74.4 260.9l1.8-.3-1.6-1-.2 1.3-7.4 4.9 0 .4M84.1 264.4l-.4-1.1 .9 .6-.5 .5 .1 2.9M65.5 264.1l1.1 .8-.1-1.4-1 .6-14-2.1
                           M77.8 244.1l1.4 .4-.1-.9-1.3 .5-.9 .1-1.6 1.4-1.4 3-1.7-1.9 3.1-1.1M88.8 252.5l-.2-.8 .9 .2-.7 .6-5.4 10.2 .3 .6M64.8 246.3l-1.7 .8 .4-1.9 1.3 1.1 7.4 .4
                           M67 260.9l.7 .3-.7 .8 0-1.1-4.7-12.8 .8-1M85.6 237.9l2.2-.5-1.2-1.6-1 2.1-6.5 5.7M92.4 248.7l.5-2.7 2 1.4-2.5 1.3-2.3 3.1-.6 .1M90.8 238.8l-.8-.7 1.1-.2-.3 .9 2.1 7.2
                           M61 236.3l1.3 1.5 .8-2-2.1 .5-8-2.3-1.3 .2 .6-1.2 .7 1M59.1 220.1l2.7-.1-1.9-1.8-.8 1.9-4.9 2.2-1.4 1.2 .1-1.7 1.3 .5M66.5 232.8l.6-2.4 2 1.5-2.6 .9-3.4 3
                           M45.3 222.5l-.8 .3 .2-.9 .6 .6 6.9 1.9 .6-.9M51.2 201.4l-1.3-2.6 3.2 .3-1.9 2.3-.8 4.9-.7 .7M44.3 195.7l-2.2-.2 1.2-1.7 1 1.9 5.6 3.1M74.8 228.2l3-.6-1.6-2.4-1.4 3-3.9 3.8 6 12.2
                           M86.7 233.2l-.3-1.6 1.1 .7-.8 .9-.1 2.6M67.5 217.8l3.4 .2-1.4-3.6-2 3.4-4.1 2.8 3.7 9.8M57.3 213.7l1.1 .6 0-1.5-1.1 .9-6 1.2M82.4 219.5l3 .7-.5-3.9-2.5 3.2-6 3.6-.2 2.1
                           M88.4 227.4l.1-2.2 2 1.2-2.1 1-2.4 3.2 .4 1M68.9 210.4l-1.6-.5 1-1.3 .6 1.8 .7 1-.1 3M79.4 209.1l3.4 1.2-1.1-3.9-2.3 2.7-9.8 2.3M53.3 206.2l2.8 1.5-.6-3.3-2.2 1.8-2.9 .1
                           M56.4 200.5l-.5-1.3 1.4 .6-.9 .7-.9 3.9M81.6 200.4l.5 .5 .3-.9-.8 .4-13 .5-.3 .3-.1-.5 .4 .2M47 186.6l3.1-.5-2.2-2.3-.9 2.8-2.6 2-.9 1.7-.9-1.3 1.8-.4
                           M55.5 189.8l-1.5-2.2 3-.2-1.5 2.4-.3 8.7-2.1 .6M50.4 161.4l.7-2 1.4 1.2-2.1 .8-1.6 1.3M50.7 157.2l-.8-.9 1.3 0-.5 .9 .4 2.2M60.3 185.4l2.8-.1-1.2-2.2-1.6 2.3-3.3 2
                           M70.6 190.3l0-.8 .5 .6-.5 .2-2.6 10.1 .2 .3M82.3 197.3l-1.9-2.6 2.5-.8-.6 3.4 .4 2.2-.3 .5M62.5 180.1l1-1.3-1.4-.4 .4 1.7-.6 3M72.5 185.2l.2-2.3 1.6 1.1-1.8 1.2-2.1 3.8 .2 .5
                           M70.9 176.1l-.5-.2 .5-.5 0 .7 1.8 6.8M57.1 172.6l2.4 1.3 .1-2.5-2.5 1.2-3.4-.1-2.4 .8 .2-1.8 2.2 1M83.9 175.9l1.1 .8 .1-1.4-1.2 .6-12.8-.9-.2 .4
                           M82.2 183.5l2.2-1.8 .8 3.1-3-1.3-7.9 .5M79.5 159.1l1.7 .9 0-2.1-1.7 1.2-4.6 .7-1.2 1.1-.5-1.6 1.7 .5M86.4 172.6l-.1-2.8 2.3 1.1-2.2 1.7-1.3 2.7M55.4 160.4l2 .8-.8-2-1.2 1.2-2.9 .2
                           M60.8 166l-1.1-2.5 2.3 .3-1.2 2.2 0 3.9-1.2 1.5M58.2 151.6l1.6-.5-1.1-1.5-.5 2-1.3 2.1-.4 1.7-.9-.6 1.3-1.1M72.3 157.4l-.9-1.2 1.4-.4-.5 1.6 .1 1 .8 .9
                           M46.6 145.9l1.9-1.5-2.3-.7 .4 2.2-1.6 3.6M52.8 144.2l-1.6-.4 1.3-.9 .3 1.3 5.7 4 .2 1.4M54.7 138.8l.1-3.2 2.4 2.1-2.5 1.1-2.2 4.1M50.5 131.7l-2.4-.4 2-1.3 .4 1.7 3.4 1.9 .9 2
                           M52.5 126.2l.5-1.9 1 1.6-1.5 .3-2.4 3.8M74.2 153.9l1.7-.4-1.1-1.5-.6 1.9-1.4 1.9M62.5 142.5l1.6-.6-1.3-1.3-.3 1.9-4 5.7M74.3 147.2l-1.8-2.4 2.8-.7-1 3.1 .5 4.8
                           M66.2 132.7l2.6-1.8-3-1 .4 2.8-3.8 6.6-5.2-1.6M77.5 141.4l.3-1.9 1.5 .9-1.8 1-2.2 2.7M73.9 130.3l-.4-.2 .4-.2 0 .4 3.9 9.2M59.5 125.6l2.5 .5-1-2.6-1.5 2.1-3.1 1.4-.6 .7-.2-.7 .8 0
                           M80 128.3l2.1 .7-.7-2.2-1.4 1.5-5.9 1.3-.2 .3M82.5 140.2l2.3-1.6 .5 2.4-2.8-.8-3.2 .2M86.7 135.3l-.2-1.7 1.7 .8-1.5 .9-1.9 3.3M59.2 120.7l1.1 .3-.4-1.2-.7 .9-6.4 2.3 .2 1.3
                           M81.6 119.4l.7 .7 .6-1.4-1.3 .7-6.1 .8-1.7 2-1.4-3 3.1 1M70.5 117.5l-.4-.1 .2-.3 .2 .4 1.9 1.7M54.5 108.4l2.8 .9-.7-3-2.1 2.1-5.7 1.2M60.2 113.7l-.6-1.8 1.7 .7-1.1 1.1-.3 6.1
                           M57.4 103.2l-.5-1.3 1.4 .1-.9 1.2-.8 3.1M53 89.9l1.7-5.3 4 3.9-5.7 1.4-5.5 4.8-.7 .6M52.8 77.5l-.5-.4 .6-.4-.1 .8 1.9 7.1M69.7 113.3l-.9-.8 1.3-.7-.4 1.5 .6 3.8
                           M82.7 112.5l-1.7-3 2.8 .2-1.1 2.8 .9 5.5-.7 .7M71 102.9l.4-.5-.7 0 .3 .5-.4 8.1 8.1-3.3 .2 0 2.1 1.8M61.7 100.1l4.3-.1-2-3.4-2.3 3.5-3.4 1.9
                           M76.2 85.9l.9 0-.3-.6-.6 .6-.4 .3-1.1 1.9-.2 3.2-2.4-1.8 2.6-1.4M76.1 95.6l1.6 1.3-2 .8 .4-2.1-1.6-4.3M80 97.3l.9-.5-.1 1.1-.8-.6-2.3-.4M85.2 90.4l.1-1.5 1.3 1-1.4 .5-4.3 6.4
                           M64.3 90.6l.7-1.1-1.3 .2 .6 .9-.3 6M82 104.1l.3-2.2 1.6 1.8-1.9 .4-3.1 3.6M57 74.4l2.7-.4-.8-1.4-1.9 1.8-3.8 1.8-.3 .5M67.4 86.1l.8-4.7 2.9 3.3-3.7 1.4-1.7 2.9 6.4 .5
                           M67.2 76.1l-.8-1.2 1.4 .1-.6 1.1 1 5.3M79.7 79.5l2.8-1.9-3.3-1.3 .5 3.2-2.9 5.8M86.7 80.3l-.7-1.9 2.1 .5-1.4 1.4-1.9 7.7 .5 .9M47.8 71.8l1.6 .3-.5-1.7-1.1 1.4-2 .9
                           M52.5 57l-.1-3.1 2.6 1.9-2.5 1.2-2.4 5.1 .1 .2-1.3 8.1M53.9 43.3l.1-.9 .8 .7-.9 .2-4.3 5.5 2.8 5.1M61.4 67l1.3-.6-1.5-1 .2 1.6-2.5 5.6M73.3 72.5l2.8 .5-1-3-1.8 2.5-5.5 2.5
                           M75.5 67.4l-.2-.7 .6 .2-.4 .5-.4 2.6M73.9 65.1l-2.3-.7 1.6-1.7 .7 2.4 1.4 1.6M57.1 62.1l2.3 1.1-1-2.5-1.3 1.4-6.9 .2M82 56l1.3 .4-.2-1.2-1.1 .8-5.9 .8-2.1 1.9-.8-3 2.9 1.1
                           M81.2 65.3l2.8-3.8 2.3 4.8-5.1-1-5.3 1.6M61.9 52.6l3.9-1.6-3.1-2.3-.8 3.9-3.3 3.4-.3 .9-.6-.6 .9-.3M69.3 51.4l-.4-.2 .3-.2 .1 .4 3.9 4.3M85 51l1.7-.8-1.8-1.4 .1 2.2-1.9 4.2
                           M90.1 54.5l.9-1.7 1.4 1.9-2.3-.2-6.1 2.6 0 4.4M79.1 41.7l3.2 1.9 .1-3.8-3.3 1.9-7.2 .2-.8 .6-.3-1 1.1 .4M55.6 33.4l-.8-3.4 3.1 .8-2.3 2.6-2 8.4 .4 .6
                           M50.1 22.3l2-2.4-3.5 0 1.5 2.4-.6 4.6 3.7 1.4 1.6 1.7M56.1 22.3l-.4-2.1 2.4 1.1-2 1-2.9 6M60.9 29.7l1.3 .1-.7-1-.6 .9-3 1.1M69.1 34.6l-1.3-1.8 2-.2-.7 2 1.1 6.4 .6 .5
                           M78.7 27.4l1.9 1.3 0-2.1-1.9 .8-2-.5-.6 .2 .2-.7 .4 .5M84.4 36.3l0-1.9 1.7 .7-1.7 1.2-2 3.5M68 16.8l.9 .1-.2-1-.7 .9-6.7 4.8-.4 .7-.5-.5 .9-.2
                           M76.1 24.1l-1.4-2.6 2.3-.1-.9 2.7 .2 2.3M78.7 19.4l-.2-.6 .5 0-.3 .6 0 .4-1.7 1.6M73.8 15.1l-2.9-.6 2.5-1.9 .4 2.5 4.7 3.7M84.9 14.7l.8-.1-.7-.5-.1 .6-5.9 4.1
                           M86.1 18.6l.5-2.3 1.2 2.2-1.7 .1-3.2 4.2 .1 .5-2.4 3.3M94.3 .7l.7-.1-.4 .5-.3-.4-10.6-3M96.1 392.8l-1.5-2.4 3-.5-1.5 2.9-.8 7.6M92.2 379l.8-2.5 1.8 2.1-2.6 .4-3.2 2.6
                           M94.2 372l.4-4 2.8 1.5-3.2 2.5-1.6 2.6 .4 1.9M93.7 364.8l-.7-.7 .9-.2-.2 .9 .9 3.2M100.4 387.7l1.9-.4-1.1-1.5-.8 1.9-2.8 2.2M100.6 2.5l5.1 0-2.4 3.9-2.7-3.9-5.3-2.1-.3 .2
                           M110.2 .6l.6-.5-.1 .7-.5-.2-4.5 1.9M109.8 391.5l-1.9-2.3 3-.5-1.1 2.8 1.3 8.1-.3 .5M119.6 398.4l1.2 .7 .3-1.6-1.5 .9-8.5 1.2M112.5 6.6l3.3 2.6-4.5 1.4 1.2-4-1.8-5.8
                           M120.9 6.8l.8-4 2.6 2.7-3.4 1.3-2 2.7-3.1-.3M115 385.2l1.1-.1-.7-1.1-.4 1.2-4.1 3.5M119.8 388.1l-1.4-1.9 2.2-.1-.8 2 1.9 8.5-.6 .9M99.6 380.8l1.3 2 .9-2.4-2.2 .4-4.8-2.2
                           M103.9 378.2l2-1.1-1.4-.9-.6 2-2.1 2.2M108 376.9l-.4-.1 .3-.3 .1 .4 7.3 6.2 .1 .9M103.8 372.7l1.3-1.8-2.8-.8 1.5 2.6 .7 3.5M108.9 372.1l-.3-1.1 1 .3-.7 .8-1 4.4
                           M117.5 368.8l1.6 .7-.5-2-1.1 1.3-7.9 2.5M120.7 375.1l.1-2.8 2.3 2-2.4 .8-5.4 8M95.3 363l1.2 .2-.2-1.4-1 1.2-1.4 .9M107.4 361.9l.2-.3-.4 0 .2 .3-.1 .4 .8 8.1 .5 .6
                           M89.3 352.8l1-.1-.6-.9-.4 1-2.2 2.1M98.1 358l-.2-.5 .7 .1-.5 .4-1.8 3.8M96.8 343.3l.5-2.1 1.6 1.6-2.1 .5-7.3 7.7 .2 .8M95.5 335.8l-.5-.6 .7 0-.2 .6 1.8 5.4
                           M95.6 324.8l.8-2.8 2.2 2.3-3 .5-5.2 4.5 .4 2.1M94.4 315.3l-2.3-2.1 2.7-1.1-.4 3.2 2 6.7M113.9 348.7l3 .5-.6-2.3-2.4 1.8-2 .4-4 12.4 10.8 4.7-.1 1.3
                           M123.5 361l.6-2 1.3 1.1-1.9 .9-4.8 5.2M123.3 354.2l-1.3-1.9 2.2 .1-.9 1.8 .8 4.8M119.2 342.1l2.6-.9-2.1-2.3-.5 3.2-2.9 4.8M126.4 344.2l-1.1-1.7 2.4-.2-1.3 1.9-.7 7.5-1.5 .7
                           M101.3 328.8l2.5 4.5-4.6-.3 2.1-4.2-.3-3.5 8.8-6.2 .9 .2 1.3 .6 .1-.7-1.4 .1M114.2 333.8l1.8-2 1.1 2.5-2.9-.5-7.4 2-3-2.5M117 325l-.4-1.1 1 .1-.6 1-1 6.8
                           M126 327.6l-1.4-1.7 2.3-.1-.9 1.8 .6 3.5-.1 .3-7.7 4.1 .9 3.4M116.4 317.5l1.5 .8 .6-2.6-2.1 1.8-4.3 1.7M97 308.7l-.2-.8 1.1 0-.9 .8-2.2 3.4
                           M98.2 295.2l1.7 3.8 2.7-3.2-4.4-.6-4.7-3.2-.4 .1M98 284.7l.2-1 .6 .8-.8 .2-4.5 7.3M106.8 310.5l-1.6-1.4 2.1-.6-.5 2 3 8.6M115.7 305.6l.6 .5 .1-.9-.7 .4-4.2 .2-2 .8 .6-1.8 1.4 1
                           M108.3 297.2l.9-1.7-2.4 0 1.5 1.7 1.8 7.6M114.1 295.3l-.7-.8 1.1 .1-.4 .7 2.7 9.4-.4 .5M120.1 293.3l1.4 .9 .4-2.1-1.8 1.2-5.6 1.3M121.7 302.2l1.1-2.6 2.2 2.3-3.3 .3-4.9 2.5
                           M105.4 289.8l1.5-2.6-3.1 0 1.6 2.6 0 5.1-2.8 .9M111.6 287.5l-1.1-1.3 1.8-.2-.7 1.5 1.2 6.8 .6 .2M114.4 284.6l2-.3-1.5-1.3-.5 1.6-2.1 1.4
                           M121.1 286.6l-1.7-1.6 1.9-.8-.2 2.4 1.6 4.3-.8 1.2M102.4 277.8l2.5-.9-1.9-1.8-.6 2.7-4.4 5.2 .2 .7M109.3 281.4l-1.2-2.8 2.7 .6-1.5 2.2 .1 4.4 1.1 .4
                           M120.6 273.1l1.1 0-.6-.8-.5 .8-5.8 2.5-1.3 1.5-.6-1.7 1.9 .2M124 278.5l-.3-3.2 3 1.1-2.7 2.1-2.7 5.7M92.6 267.4l-1.5-1.6 1.9-.8-.4 2.4 .4 1.6-1.2 1.2
                           M97.8 257.3l-.1-1.3 1.3 .7-1.2 .6-4.8 7.7M100.8 241.1l-.2-.7 1 .2-.8 .5-4.1 6.2-1.8 .1M94 236.7l-1.4 .1 .6-1.3 .8 1.2 6.6 3.7M109.3 274.1l.3-1.9 1.2 1.7-1.5 .2-2.6 3.1 1.4 1.4
                           M108.9 270.3l-.8-.3 .8-.9 0 1.2 .7 1.9M115.7 264.7l3.1 .6-1.2-2.8-1.9 2.2-4.4 1.1-1.5 1.3-.3-2 1.8 .7M104.4 258.2l-2.5-1.4 2.4-1.3 .1 2.7 5.1 6.9
                           M106.7 251.6l3-2.2-3.6-.7 .6 2.9-2.4 3.9M118.8 253.6l-1.2-2.7 3.2 .4-2 2.3-1.2 8.9M114.3 248.7l-1.4-.2 .9-1 .5 1.2 3.3 2.2M99.6 248.6l-1.3 1.3-.6-1.7 1.9 .4 4.5-1.2 2 1.3
                           M123.9 250.5l1.6 .2-.7-1.4-.9 1.2-3.1 .8M124.7 266.4l1.9-1.3 .4 2.3-2.3-1-4.1 .1 .5 5.8M130.3 255.3l-.6-1.8 2.3 .6-1.7 1.2-3.7 9.8
                           M121.6 238.8l2.6 .4-1.4-2.4-1.2 2-4.3 1.5-2.5 3-1-3.9 3.5 .9M105.5 237.3l3.1-1.3-2.2-1.8-.9 3.1-3.2 3.3-.7 0M93.1 233.1l-1-1 1.4-1-.4 2 .1 2.4
                           M98.2 218.7l-.2-1.6 2 .8-1.8 .8-6.1 7.9 2 3.3-.6 1.2M94.7 214.1l-4.4-1.2 3.4-2.8 1 4 3.3 3M95.4 205.7l-.3-2.4 2.1 .9-1.8 1.5-1.7 4.4M93.8 201.3l-.9-.6 1-.4-.1 1 1.3 2
                           M104 229.1l1 .2-.6-.8-.4 .6-9.9 .8M113.2 230l.4 0-.1-.3-.3 .3-.3 .2-2.1 5.9 3 3.3M122.2 234l-1-1.2 1.3-.4-.3 1.6 .6 2.8M102.3 217.3l1.5-.8-.6-.6-.9 1.4-.9 .6-1.4 0
                           M116.6 219.5l-.5-1.3 1.6 .2-1.1 1.1-3.1 10.2M112.5 215.8l-3.3-.6 1.4-2.2 1.9 2.8 3.6 2.4M104.8 211.6l2.8-1.5-3-2.4 .2 3.9-1.6 4.3
                           M117.3 204.7l2.8 1.4-.2-3-2.6 1.6-3 .1-.9 .6-.2-1 1.1 .4M122.3 210.1l-.2-1.5 1.4 .6-1.2 .9-3.5 8.1-1.1 .2M99.8 203.7l1.7 .2-1.1-1.1-.6 .9-2.6 .5
                           M103.3 204.9l-.5-.4 .6 0-.1 .4 1.3 2.8M97 196.7l.9-.3-.6-.8-.3 1.1-3.1 3.6M110.7 202.5l-3-.2 1.2-2.6 1.8 2.8 2.5 1.9M103.8 193l2.2-.4-2.1-1.2-.1 1.6-5.2 3.7 1.8 6.1
                           M96.9 193l-1.6-2.4 2.8 0-1.2 2.4 .4 2.6M88.3 186.4l-1-.2 .7-.6 .3 .8 7 4.2M88.9 182.9l-.8-2.9 3 .6-2.2 2.3-.9 2.7M93.2 169.7l2.5-1.7-.3 2.8-2.2-1.1-4.6 1.2
                           M96.5 162.1l-1.2-1.6 2.1-.2-.9 1.8 .3 4.3-1.1 1.6M84.4 156.1l-1.6 0 1.2-1.1 .4 1.1 10.9 4.4M100.7 189.3l1.2 .2-.5-1.3-.7 1.1-2.6 1.3M123.1 197.3l-.2-2.1 2 .8-1.8 1.3-3.2 5.8
                           M101.8 180.2l1.2-1.7-2.2 .1 1 1.6-.4 8M113.3 181.2l-2.7-1.9 2.6-1.1 .1 3 3.2 5.2-.1 .2-9 6.4 1.5 6.7M98.5 178l.6 0-.4-.4-.2 .4-7.4 2.6
                           M115.3 165.4l2.5 1.4-1.1-2.7-1.4 1.3-6.1-1.2-3.2 .4 1.9-2.4 1.3 2M103.2 165.4l.6 0-.5-.3-.1 .3-6.4 1M123.4 184.7l2.6-2.7 1.1 3.7-3.7-1-6.9 1.7
                           M127.7 174.8l-.8-3.7 3.4 1.9-2.6 1.8-1.7 7.2M113.8 156.2l2.4 2.5 1.2-3.8-3.6 1.3-3.7-.5-1 .8-.3-1.5 1.3 .7M100.2 155.5l2.2-1.5-1.9-1.4-.3 2.9-1.7 4-1.1 .8
                           M88.2 147.1l1.8-.6-1.4-1.8-.4 2.4-4.2 7.9M90.4 139.8l.2-2.2 1.7 1.2-1.9 1-2.2 3.3-2.9-2.1M95.5 129.5l1.4-2.6 1 2.7-2.4-.1-6.1 5 1.2 3.1M92.1 118.3l-2-.9 1.6-1.2 .4 2.1 5.1 6.6-.3 2
                           M101.8 149.1l2.8-.4-1.7-2.6-1.1 3-1.7 1.6 .4 1.9M107.8 150.9l-.6-.9 1.1-.1-.5 1 .1 2.9 .9 1.2M111.9 147.3l3.1-.2-1.5-2.5-1.6 2.7-3.6 2.6M120.5 151.4l.1-1.1 .9 .7-1 .4-3.1 3.5
                           M113.8 141.7l-.4-1.1 1.1 .6-.7 .5-.3 2.9M102.8 136l1.6-1.8-2.4-.6 .8 2.4-.5 3.3-10-.5M112.8 130.4l-1-1.8 2.7-.3-1.7 2.1-1.9 7.3 2.5 2.9M116.3 127.3l.6 0-.4-.4-.2 .4-1.8 1
                           M117.8 141.6l3.9-1-1.7 3.5-2.2-2.5-3.3-.4M124.9 138.1l.7-1.8 1.1 1.8-1.8 0-3.2 2.5M125.2 132.9l-1.8-2.5 2.8-.4-1 2.9 .4 3.4M107.8 123.1l-1.7-.8 1.8-1.4-.1 2.2 2.3 4.9 1.7 .6
                           M116 123.6l-2.8-2.9 3.7-1.5-.9 4.4 .5 3.3M102.6 108.8l.9 .2-.1-.8-.8 .6-7.9 2.2-1.9 1.9-.5-2.6 2.4 .7M108.5 117.1l-1.5-3.7 2.6 0-1.1 3.7 .2 2.5-.8 1.3
                           M88.4 106.3l.4-.1-.4-.1 0 .2-4.6 3.4M94.9 99.8l1-3.2 2 2.3-3 .9-5.9 6.4 3.3 4.1M94.1 92l-2-1.2 2.1-.7-.1 1.9 1.6 2.3 .2 2.3M96.3 87.5l.8-2.7 1.4 2.4-2.2 .3-2.1 2.6
                           M96.7 81.9l-.9-1.4 1.6 0-.7 1.4 .4 2.9M92.6 78.6l-1.8-.3 .8-1.2 1 1.5 3.2 1.9M111.4 111l0-.5 .5 .2-.5 .3-1.8 2.4M109.8 108.5l-2.7-1.2 2.8-1.4-.1 2.6 1.6 2
                           M113.8 110.4l2 .4-.9-1.8-1.1 1.4-1.9 .3M120 114.6l-.3-1.2 1.6 .3-1.3 .9-3.1 4.6M114.4 101.6l.5 .6 .5-.8-1 .2-.6-.1-3.9 4.4M101.4 100.3l-.7-.6 .9-.4-.2 1 2.3 7.3-.3 .6
                           M110.3 97.6l-2.9-1.1 2.4-1.8 .5 2.9 3.5 3.9M104.2 96.9l-1.4 .8 .1-1.5 1.3 .7 3.2-.4M101.9 91.2l1.6-1.6-2.3-.4 .7 2-.5 1.8 1.5 3.2M110.9 92l-.2-1 1.1 .4-.9 .6-1.1 2.7
                           M108.9 89.3l-2.2-.6 1.7-1.6 .5 2.2 1.8 1.7M116.3 91.2l.6 .5 .4-.9-1 .4-4.5 .2M116.3 100.9l.3-.5 .3 .4-.6 .1-.9 .5M102.2 65.8l2.8 1.4-.9-2.9-1.9 1.5-4.8-.4-4 1 1.9-3.4 2.1 2.4
                           M90.7 68.4l-.3 .8-.6-.6 .9-.2 2.7-2M104.1 77l2-3.1 1.7 3.4-3.7-.3-6.7 3.5M111.9 79.1l1.6 .5-.2-1.5-1.4 1-1.2 .2-2.3 7.8M118.9 85.8l-.6-2 2.2 .7-1.6 1.3-1.1 4.5-.5 .5
                           M95.6 57.7l-.8-1.6 1.9 .2-1.1 1.4-.3 5.3M95.3 48l1.7-2.5 1.2 2.2-2.9 .3-4.6 3.2 .3 1.6M97.6 42.2l-.5-1.8 1.7 .9-1.2 .9-.6 3.3M94.7 37.4l-3.3-2 2.6-1.7 .7 3.7 2.4 3
                           M119.8 71.8l1.8 .5-.2-1.6-1.6 1.1-2.1 .3-1.1 .8 0-1.2 1.1 .4M122.9 84.3l1.1-.7-.3 1.3-.8-.6-2.4 .2M127.3 78.9l.2-.6 .4 .5-.6 .1-3.3 4.7
                           M112.6 68.2l2.4 1.2 0-2.6-2.4 1.4-6.3 .6-.2 5.1M104.5 61.2l-.5-1.2 1.3-.1-.8 1.3-.4 3.1M109.5 56.3l1.1-.6-1.2-.2 .1 .8-4.2 3.6M117.2 63.6l0-.7 .7 .3-.7 .4-2.2 3.2
                           M100.1 51.4l1.3-.4-1.1-1.3-.2 1.7-2.3 4.5-1.1 .4M114.4 51.5l3.4-1.6-2.4-2.3-1 3.9-3.1 4.1 5.9 7.3M122.9 59.8l2-5.3 3.4 5-5.4 .3-4.4 3.4-.6 0
                           M102.6 42.4l-.4-.7 1.2-.2-.8 .9-2.6 6.2 .3 1.1M115 44.4l-.5-.5 .7-.2-.2 .7 .4 3.2M107.7 30.9l.7-.6-.9-.3 .2 .9-3.6 10.2 10.4 2.8M116.5 42.3l.8-1.9 1 1.1-1.8 .8-1.3 1.4
                           M117.5 37.4l-1-2.1 2.3 .3-1.3 1.8-.2 3M90.6 29l0-3.1 2.2 2.4-2.2 .7-2.9 5.7 3.7 .7M95 29.7l-.2-.3 .4 0-.2 .3-1 4M90.3 22.5l-.5-1.9 1.7 .3-1.2 1.6-.5 1.6 .8 1.8
                           M91 12.4l2.3-3.1 1.5 3.4-3.8-.3-4.7 2.3 .3 1.6M102 26l1.1-.1-.9-.6-.2 .7-6.8 3.4M120.9 34.7l.9 .2-.3-.9-.6 .7-2.1 .9M121 41.6l1.5-.9 .1 2-1.6-1.1-2.7-.1
                           M123.6 38.1l-.4-1.8 1.9 .5-1.5 1.3-1.1 2.6M117.6 23.1l2.7 1.3-.1-3-2.6 1.7-6.2 .4-.7 .6-.3-.9 1 .3M122.4 28.2l-.3-1.3 1.1 .4-.8 .9-.9 5.8M95.8 18.5l2.2 .5-.7-2.7-1.5 2.2-4.3 2.4
                           M102.9 11.5l1.1-.1-.6-.8-.5 .9-5.3 3-.3 1.8M108.6 13.2l-.3-.3 .4-.1-.1 .4 1.3 9.6 .5 .4M121.6 19.1l.2-.9 .5 .5-.7 .4-1.4 2.3M121.8 15.5l-1-3.1 2.6 1.3-1.6 1.8 0 2.7
                           M126.5 13.6l1.6-.7-.7 1.5-.9-.8-3.1 .1M129.7 11.5l.3-.4 .1 .5-.4-.1-1.6 1.4M128.9 7.5l-1-1 1.2-.5-.2 1.5 1.3 3.3-.2 .3M134.5 384.9l-1.6-2.5 3.2 .2-1.6 2.3 .1 11.9-.1 0-5.4 9.2
                           M130 380.9l-1.4 .1 .6-1.2 .8 1.1 2.9 1.5M128.7 377.3l-1.4-1.6 2.1-.4-.7 2 .5 2.5M132.2 373.1l1-2.6 1.8 2.1-2.8 .5-2.8 2.2M132.2 364.2l-1.8-2.5 2.8-.5-1 3 1 6.3
                           M141.8 392.9l3.2-.5-2.4-2.1-.8 2.6-6.8 3.9 7.6 7.6M148.8 400.6l.5-1.5 1.2 1.6M148.8 .6l.5-1.5 1.2 1.6-1.7-.1-6.2 3.8-7.6-7.6M147.7 393.3l-.3-.3 .4-.1-.1 .4 1.6 5.8
                           M152 389.9l2.1-.4-1.4-1.4-.7 1.8-4.2 3M155.7 400.5l2.5-1.8 .2 2.9M155.7 .5l2.5-1.8 .2 2.9-2.7-1.1-4.2 .8-1-.6M139.6 380.7l1.4-.7-1.2-.8-.2 1.5-.6 .9 3.6 8.7
                           M150.9 381.5l-1.9-1.4 2.6-1-.7 2.4 1.8 6.6M157.3 378.6l2.5 2.5 1.1-3.8-3.6 1.3-4.4-.7-1.3 1.2M159.5 387.6l.9-1.9 1.2 2-2.1-.1-3.9 2.2 3.6 7.1-1 1.8
                           M145.1 364.9l2.3-1.1-2.5-.8 .2 1.9-7.3 8.3-.1 .5-.4-.4 .5-.1M152.7 367.7l-1.1-2 2.4 .7-1.3 1.3 .2 10.2M156.7 366.3l1.8 .7-.1-1.4-1.7 .7-2.7 .1M163.1 374.9l.3-.9 .5 .6-.8 .3-2.2 2.4
                           M163.1 372.3l-.8-1.6 1.5 .1-.7 1.5 .3 1.7M129.1 354.7l1-.7-1.3-.4 .3 1.1-2.3 5.2 3.6 1.8M135 359.4l0-.6 .6 .3-.6 .3-1.8 1.8M164.8 359.1l1.2-.3-.9-.9-.3 1.2-6.4 6.5
                           M168.3 367.5l1.5-2.7 1 3-2.5-.3-4.5 3.3M137.6 358.7l2.5 .7-.9-2.2-1.6 1.5-2 .4M135.4 348.7l.1-2.7 2.7 1.9-2.8 .8-4.3 5.2 3.9 4.9M131 328.8l1-1.5 .6 1.8-1.6-.3-4.4 2.3
                           M130.6 324.8l-1.4-.1 .7-1.2 .7 1.3 1.6 1.3-.2 1.2M161.1 350.3l1 .4-.6-.8-.4 .4-7.5-.8-.4 .1 .3-.3 .1 .2M147 347l-3.3 0 2-2.5 1.3 2.5 6 2.7 .2-.1
                           M142 331.6l1.9 .4-.6-1.8-1.3 1.4-4.2 1-2.7 2-.2-2.9 2.9 .9M147.5 336l-.3-1.1 1.1 .2-.8 .9-1.8 8.5M157 342.7l-.2-1.2 1.4 .4-1.2 .8-3.5 6.6
                           M150.6 330.6l-.5-2 2.1 .7-1.6 1.3-1.5 4.3 7.7 6.6M148.6 327.3l-.6-.2 .2-.4 .4 .6 1.5 1.3M157.4 328.8l2.7 1.4-.1-3-2.6 1.6-5.2 .5M163.2 338.1l.4-2.4 2.4 1.5-2.8 .9-4 3.7-1 .1
                           M140.6 325l2.1 1.3 .5-2.7-2.6 1.4-8.4 1.1M158.8 312.6l.4 .3 .1-.4-.5 .1-1.8-.2-2 .8 .1-1.9 1.9 1.1M147.3 321.6l-.3 1.7-1.4-1.1 1.7-.6 7.7-8.4M164 320.6l0-.4 .3 .2-.3 .2-4 6.6
                           M129 314.1l-1.2-1 1.8-1-.6 2 .9 9.4M127.8 303l-.4-.4 .5-.2-.1 .6 2.7 8-.9 1.1M132.7 296.8l.3-2.3 1.9 1.6-2.2 .7-4.8 5.6M130 273.7l.2-2.8 1.6 2.4-1.8 .4-1.1 2.3-2.2 .4
                           M137.6 310.1l2.4 1.4 .3-3-2.7 1.6-7.1 .9M142 306.1l1-.5-.7-.6-.3 1.1-1.7 2.4M152.7 308.2l-3.3-1.9 2.6-1.8 .7 3.7 2.4 3.1M142.1 303.1l.5-1.6-1.2-.1 .7 1.7 .2 1.9
                           M153.5 298.4l-.5-1.3 1.5 0-1 1.3-1.5 6.1M150.4 295.5l-1.5 .2 .5-1.6 1 1.4 2.6 1.6M137.2 296.8l1 .6 .1-.9-1.1 .3-2.3-.7M163.2 299.5l-.7-1.2 1.8-.2-1.1 1.4-3.6 12.9-.3 .1
                           M143.1 292.2l3.6-.5-2.9-3.1-.7 3.6-4.8 4.3M156.1 289.2l2.6-.8-1.7-2.1-.9 2.9-1.2 1.7 .5 5.7-.9 .5M165.4 292.5l-2.2-2.8 3.7-1-1.5 3.8 0 5.1-1.1 .5
                           M137.1 283.7l.1-1.6 1.1 1-1.2 .6-4.8 9.3 .7 1.5M140.5 283.5l1.4 1-.1-1.8-1.3 .8-2.2-.4M143.1 279.5l.8-.9-1-.3 .2 1.2-1.3 3.2M156.9 282.3l-1.3-2.4 2.6 0-1.3 2.4 .1 4
                           M151.9 277.1l-2.8-.4 1.3-2.2 1.5 2.6 3.7 2.8M156.6 267.2l4.1 1.5-.7-3.8-3.4 2.3-2.9 .2-3.6 5.2 .3 1.9M162 277.4l1.1-1.9 1 1.9-2.1 0-3.8 2.5M163.4 271.4l-.2-.6 .5 .1-.3 .5-.3 4.1
                           M137.7 279.5l-.5-2.2 2.6 .7-2.1 1.5-.8 1.7 .3 .9M136.1 263.1l.5-2.8 2.5 1.9-3 .9-6.4 6.1 .5 1.7M133.5 239.4l2.9 1.2-.9-3.1-2 1.9-7.9 1-.8 8.9
                           M135.6 252.4l1.2-2.2 1.1 1.3-2.3 .9-1.9 1.7 2.9 6.2M145.2 263.8l.4-1.1-1.2 .3 .8 .8 1.2 5.8 1.8 2.2-2.4 .8 .6-3M151.3 264.2l-2.9-1.7 3.2-1.1-.3 2.8 2.4 3.2
                           M160.7 256.5l.6 .2-.3-.4-.3 .2-1.8-.3-2.1 .6 .4-1.8 1.7 1.2M161.8 261l.2-2.3 1.4 1.8-1.6 .5-1.8 3.9M144.1 252.1l.3-1.3-1.2 .6 .9 .7 2.1 10.1 2.2 .3
                           M155 250.5l-1.9-1.1 2.1-1.2-.2 2.3 2.2 4.5M160.3 249.7l-1.9-2.2 3.2-.4-1.3 2.6 .7 6.6M144 246.5l-3.2-3.3 4.8-.7-1.6 4 .9 3.5 8.2-.6
                           M159.3 241.8l3-.2-2-2.4-1 2.6-2.6 1.8-.7 1.4-.7-1.5 1.4 .1M164 245.7l.4-.7 .4 .7-.8 0-2.4 1.4M151.7 240.2l-2-.2 1.4-1.9 .6 2.1 3.6 3.3
                           M131.2 225l2.5 1.1-.2-2.7-2.3 1.6-3.1 .4-1.6 1-.2-1.6 1.8 .6M136.4 231.9l-.6-2.7 2.2 .9-1.6 1.8-.9 5.6M128.4 208.9l3.5 1.3-.9-3.5-2.6 2.2-4.9 .3
                           M132.2 202.1l-.3-2.5 2 1.2-1.7 1.3-1.2 4.6M151.6 235.7l-.1-1.4 1 .5-.9 .9-.5 2.4M148.8 228.2l-.6-.3 .6-.4 0 .7 2.7 6.1M158.3 233.9l.9 .6 .2-1.3-1.1 .7-5.8 .9
                           M159.3 230.6l-2-1.9 2.3-1-.3 2.9 .6 1.9-.5 .7M140.5 219.3l4.4 .7-2.5-4.1-1.9 3.4-6.1 2.4-.9 1.7M148.6 223.7l-.6-1.2 1.1 .1-.5 1.1 .4 3.3-.2 .5
                           M155.9 217.9l2.3-.2-1.2-2-1.1 2.2-6.8 4.7M161.5 224.3l0-2.7 2.3 1.1-2.3 1.6-1.9 3.4M143.4 208.1l2.6-1.9-2.7-1.1 .1 3-1.7 3-.1 1.1-.7-.5 .8-.6M157 210.3l-.4-.7 .8 0-.4 .7 0 5.4
                           M150.6 206l-1.5-.3 1-.9 .5 1.2 6 3.6M164.1 216.5l2-1.8-.6 2.7-1.4-.9-4.4 2 1.8 3.1M139.2 201l1.9 1.1-.3-2.3-1.6 1.2-5.3-.2M161 197.6l.8 .5-.1-.9-.7 .4-7.4-1.3-.9 .5-.1-1.3 1 .8
                           M142 195.8l2.6-2.7-3.8-.6 1.2 3.3-1.2 4M147.8 192.2l-.4 0 .2-.3 .2 .3 4.4 2.5 .4 .8M135.9 189.3l0-.4 .3 .4-.3 0-4.8 8.9 .8 1.4M136.5 173.8l1.7 1.4 .3-2.2-2 .8-6.2-.8
                           M139.3 182.6l.3-3.7 2.8 2.4-3.1 1.3-3.5 6 .1 .3M131.1 158.3l-.1-.6 .7 .1-.6 .5-5.8 10.7 1.6 2.1M126.1 152.6l-2.2-1.1 2.4-.4-.2 1.5 4.9 5.1M156.3 190.4l.9 0-.5-1-.4 1-4.1 4.3
                           M161.9 196.1l-.2-.8 .8 .2-.6 .6-.2 1.1M149.7 183.7l.2-.1-.2-.4 0 .5-2.1 8.2M168.3 170.3l3.1 .7-.5-2.5-2.6 1.8-5 1.1-1.6 2-1.3-2.5 2.9 .5M161.9 181.6l1 1.5-2 0 1-1.5-.2-8.2
                           M165.6 184.2l2.2-.1-.7 1.9-1.5-1.8-2.7-1.1M174.4 180.4l1.2-2.6 1.9 2.6-3.1 0-6.6 3.7M174.8 174.3l-.9-1.3 1.2-.2-.3 1.5 .8 3.5M141.7 168.7l2.8-1.2-2.3-1.9-.5 3.1-3.2 4.3
                           M150.4 182.2l.8-1.5 .7 1.1-1.5 .4-.8 .7 .1 .3M152.4 173.2l-.8-3.1 2.8 .9-2 2.2-1.2 7.5M141.1 162.2l-1.5-1.6 2-.4-.5 2 1.1 3.4M131.5 148.3l.3 .2 .2-.7-.5 .5-5.2 2.8
                           M153 164.9l2.4-.7-1.9-1.8-.5 2.5-2.8 3.4 1.4 1.8M147 155.6l2.3-.4-1.7-1.8-.6 2.2-5.4 4.6M134.9 145.7l3.6-.6-2.1-2.4-1.5 3-2.7 1.8-.2 .3M146 148.3l-2.2-2.1 2.6-1.2-.4 3.3 1.6 5.1
                           M131.2 142.4l-1.7-2.5 3 .8-1.3 1.7 1 5.1M130 126.7l1.1-2.9 1.9 2.3-3 .6-3.8 3.3M130.4 118.6l-1.8-2.4 2.9-.4-1.1 2.8 .7 5.2M155.9 153.6l3.7 .2-.9-3-2.8 2.8-5 2.1 2.6 6.7
                           M161.9 159.2l.4-2.4 1.9 1.3-2.3 1.1-4.7 5.4 1.5 5.3-4.3 1.1M151.5 140.7l3 .4-.4-2.6-2.6 2.2-3.1 1.3-.7 .6-.2-.6 .9 0M160.3 147.3l.1-.8 .3 .8-.4 0-1.6 3.5
                           M138.2 138.2l2.7-.3-1.4-2.7-1.3 3-2.1 2.1-3.6 .4M156.7 136.1l2.4 .2-.4-1.7-2 1.5-1.5 .5-1.1 1.9M165.1 141.1l.2-.9 .5 .8-.7 .1-4.7 4.9 0 .5M140.1 128l.5-.3-.2-.2-.3 .5-.3 .2-.3 7
                           M152.2 128.1l-2-2 2.9 0-.9 2 3 8.5M155.8 125.1l1.1 .4 0-1.3-1.1 .9-2.7 1M160.1 132.7l.1-1.1 1 .6-1.1 .5-1.4 1.9M133.6 114l.8-.1-.4-.7-.4 .8-2.1 1.8
                           M143.4 118.4l-.2-.6 .7 .1-.5 .5-3 9.1M154.2 113.2l.9 .6 0-1.1-.9 .5-.8-.1-7.9 4.8-.2 .5-.5-.5 .7 0M158.4 122l.1-2.4 2.1 1.3-2.2 1.1-1.5 2.2M134 111.4l-.6-1.7 1.2-.1-.6 1.8 0 1.8
                           M129.6 105l-1.7-1.3 2.1 .3-.4 1 3.8 4.7M128.1 95.3l-1.4-4.1 4.4 1.3-3 2.8-1.5 7.8 .1 .2-4.4 10.2 6.3 2.7M146.9 111.1l-.1-2.2 1.7 1.1-1.6 1.1-2.5 6.6 .4 .2
                           M145.3 106.1l-1.8-1.6 2.5 0-.7 1.6 1.5 2.8M153.1 95.6l1.6-.7-2-1.8 .4 2.5-1.9 7.3 2.2 .1 2-1.6 1.1 3-3.1-1.4M139.1 90l2.1-.7-1.2-1.6-.9 2.3-1.2 1.4-.1 .4-.2-.2 .3-.2
                           M158.5 106.9l-.1-.6 .7 .2-.6 .4-3.4 5.8M135.8 80.9l2.5 2 .2-3-2.7 1-7.9-2.1M145.4 81.6l3.7-.4-2.8-3.2-.9 3.6-5.4 4.5 0 1.6M152.4 83.4l-.4-.7 .8 0-.4 .7-.7 8.2 1 1.5
                           M141.3 76l2.2-.9-2.3-1.3 .1 2.2-2.8 3.9M124.6 49.6l.1-1.6 1.2 .7-1.3 .9-.5 .9 .8 4M134.8 68.8l2.9 1.1-1.2-3.1-1.7 2-5.1 .7-2.3 8.4 .1 .4
                           M154.1 70l2.7 1.7-.5-3.1-2.2 1.4-2.1-.3-6.8 5.7 1.1 2.6M159.2 79l.9-1.3 .5 1.5-1.4-.2-6.4 3.7M152.8 61.3l2.2 .4-1.1-2.1-1.1 1.7-1.5 .6 .7 7.8M157.3 64.6l-.4-1.3 1.4 .4-1 .9-1 4
                           M142.3 58.5l2.3-.8-2.4-1 .1 1.8-5.8 6 0 2.3M140.1 55.4l.5 0-.3-.5-.2 .5-7.7 6.2 4.1 2.9M152.2 54.2l1.3 .7 .5-2.7-1.8 2-6 3.7 5.1 4M138.3 47.3l-1.4-.9 1.6-1.3-.2 2.2 2 7.6
                           M129 36l3.9 .8-1.3-3.5-2.6 2.7-3.9 .8M138.7 42.3l-1.4-2 1.7-.3-.3 2.3 .4 1.6-.6 1.2M155.6 48.9l-.3-1.5 1.6 .4-1.3 1.1-1.6 3.3M152.5 44.7l-3.9-1.5 2.5-2.4 1.4 3.9 2.8 2.7
                           M144 31.9l1.9-1-1.9-1.2 0 2.2-5 8.1M128.6 25.8l2.5 .7-1.2-2.6-1.3 1.9-5.4 1.5M129.8 21.4l-.4-.9 .8 0-.4 .9 .1 2.5M128 19.3l-1.7-.6 1-.9 .7 1.5 1.4 1.2
                           M132.2 18.7l.4-2.6 2.4 1.2-2.8 1.4-2 1.8M141.3 25.7l.3 .2 0-.4-.3 .2-8.8 2-.9 5.6M161.3 31.9l3 2.1 .2-3.9-3.2 1.8-9.5-.5-.7 9.4M165.4 37.2l.1-.5 .3 .3-.4 .2-7.5 10.3-1 .3
                           M151.8 27.6l-1.1-2.9 2.6 .4-1.5 2.5-.2 3.5 .2 .3M137.3 16.9l.4 .2 0-.5-.4 .3-2.3 .4M138.1 15.3l1.1-1-1.2-.6 .1 1.6-.4 1.3M150.5 15.8l-.7-2.9 2.7 1.6-2 1.3-1.3 7.5 1.5 1.4
                           M137.4 12l0 .5-.4-.3 .4-.2 5.2-7.6 5.2 5 .6 1.1 .2-1.2-.8 .1M158.5 22.2l2.3-3.2 1 3.8-3.3-.6-5.2 2.9M161.3 16l-.2-.3 .5-.1-.3 .4-.5 3M163.2 12.2l-.5-4.7 4 1-3.5 3.7-1.2 3.1-.4 .3
                           M174.1 387.2l1.6 .4-.5-1.7-1.1 1.3-8 2.6-1.3 1.6-.8-1.9 2.1 .3M164.4 394.1l.7 1.6-1.7-.3 1-1.3 .4-2.7M168.8 398.9l3.6 .6-2.2 3-1.4-3.6-3.7-3.2M172.4-.5l-2.2 3-1.4-3.6
                           M176.7 397.6l1-1.8 1.3 2-2.3-.2-4.3 1.9M170.3 375.1l1.9 1.2-.2-2.2-1.7 1-6.4-.5M175.6 383.5l-.3-2 1.5 .7-1.2 1.3-.4 2.4M173 371.2l-.2-1.2 1.2 .2-1 1-1 2.9
                           M185 396.3l1.4-1.8 .9 1.6-2.3 .2-4.6 2.3-1.4-.8M187.4 389.4l-.5-1.5 1.5 .8-1 .7-1 5.1M185.8 386.8l-.7-.2 .3-.5 .4 .7 1.1 1.1M192.1 397.8l.4-.1-.2 .4-.2-.3-4.8-1.7
                           M193.8 386.8l2.5 .8-.2-3.3-2.3 2.5-4.3 2.1 3.2 8.6-.2 .2M199 395.5l.5-1.1 1.3 1.1-1.8 0-6.3 2M184.9 381.6l-1.1-.7 1.5-1-.4 1.7 .5 4.5
                           M196.2 380.4l-2.2-1.4 2.2-1.4 0 2.8 .8 1.8-.9 2.1M184.5 371l1.4-3.2-3.9 .5 2.5 2.7 1.4 8 8.1 0M197.8 374.1l.1-2.3 1.6 .9-1.7 1.4-1.6 3.5M196.7 368.4l-2-2.2 2.9-.2-.9 2.4 1.2 3.4
                           M191.9 364.9l-1.6 .1 .8-1.3 .8 1.2 2.8 1.3M207.6 388.8l.3-1.4 .8 1.4-1.1 0-5.7 6.9-1.1-.2M207.1 382.9l-.9-.7 1.2-.6-.3 1.3 .8 4.5M174.4 361.7l2.6 1.1-.5-3.3-2.1 2.2-4.5 1.1-.1 2
                           M202.2 363.2l1.1 .1-.6-1-.5 .9-4.6 2.8M203.3 372l1.2-1.6 1.3 2-2.5-.4-3.8 .7M193.3 355.1l2.5-.2-.8-1.8-1.7 2-1.5 .8-.7 7.8M202 358.8l-2.3-2.6 3.1-.9-.8 3.5 .7 3.5
                           M171.5 348.5l1 .2-.7-.9-.3 .7-8.8 2.6 2.4 6.8M172.9 353.1l.7-2.4 1.5 2.2-2.2 .2-6.1 6 3.1 3.7M172.4 334.2l1.7-2.9 1.6 1.7-3.3 1.2-4.4 3.2 3.8 10.4
                           M174.7 327.7l-.8-1.7 2 .3-1.2 1.4-.6 3.6M177.5 355.1l-.3-.9 1 0-.7 .9-1 4.4M180.2 352.8l2.2-.3-1.5-1.6-.7 1.9-2 1.4M179.6 348.3l.7 .5 .1-1.1-.8 .6-6.5 .7 .5 1.7
                           M185.8 339l-.2-.8 1 .1-.8 .7-5.4 8.7M197.3 347.7l-.5-2 2.3 .5-1.8 1.5-2.3 5.4M189.1 335l.5-5.3 3.9 2.5-4.4 2.8-1.8 3.1-.7 .2M199.8 331.5l3.6 1.6-.9-4-2.7 2.4-6.3 .7
                           M206.6 339.3l.4-.8 .1 .8-.5 0-5.9 6.6-1.6 .3M169.1 313.6l3.6-.2-.9-2.3-2.7 2.5-2.5 1.1-2 5.6 9.3 5.7M177.2 315.8l-1.1-1.3 1.5-.6-.4 1.9 1.6 9.6-.2 .2-.7 7.3-2.2 .1
                           M196 315.1l1.2 .9 .4-2.1-1.6 1.2-3.1 .5-1.5 1.7-.8-2.7 2.3 1M191.2 321.5l1.3 1-2.2 1.4 .9-2.4 .2-4.2M196.5 321.4l1.1-1.6 1.1 2-2.2-.4-4 1.1
                           M181.2 310.5l3.4-.2-1.3-2.2-2.1 2.4-2.1 .9-1.5 2.5M188.6 311.7l-1-.7 1.2-.3-.2 1 2 2.9M170.4 300.5l-1.6-1.7 2.3-.2-.7 1.9 2.7 8.6-1.3 2M169.2 286.5l.2-.7 .4 .5-.6 .2-2.3 2.2
                           M169.4 282.8l-1.5-2.8 3 .2-1.5 2.6 0 3M185 300.7l.6-.5-.8-.2 .2 .7-1.7 7.4M190 303.5l-1.1-1.8 2.2 0-1.1 1.8-.2 6.5-1 .7M176.9 295.1l2.1 .1-.8-2-1.3 1.9-5.8 3.5
                           M193.7 292.1l2.4 1.1 .2-1.5-2.6 .4-1.7-.1 0 .3 1.9 7.2 1.1 1-1.6 .2 .5-1.2M198.8 301.5l2.7-.9-1.2 2.9-1.5-2-3.8-1M178.5 290.8l.9-.8-1.2-.6 .3 1.4-.3 2.4
                           M191.3 291l-1.6-.8 1.2-.9 .4 1.7 .7 1M200.9 289.9l1.5 .9 .4-2.5-1.9 1.6-4.6 1.8M203.3 298.9l.4-.7 .5 .5-.9 .2-.5 .2-1.3 1.5M175.1 277.8l1.6 .1-.7-1.5-.9 1.4-4.2 2.4
                           M196.9 278.7l2 .7-.2-2.1-1.8 1.4-2.9 .7-1.5 1.5-.7-1.9 2.2 .4M203.8 286.4l0-.6 .6 .3-.6 .3-1 1.9M188 276l-3.7-.4 1.7-3.1 2 3.5 3.8 3M169.1 267.1l1.4 .1-.7-1.6-.7 1.5-5.4 3.8
                           M176.1 274l-.7-1.7 1.6 .3-.9 1.4-.1 2.4M173.4 259.5l.5-2.5 1.7 1.8-2.2 .7-3.5 5-.1 1.1M170.3 253.8l-3.2 .1 1.6-2.6 1.6 2.5 3.2 1.5 .4 1.7M168.8 248.9l-.2-.4 .5 0-.3 .4-.1 2.4
                           M185 269.6l.5 .1-.3-.5-.2 .4-8 3M191.4 266.7l2.2 0-1.2-1.9-1 1.9-5.7 3.2 .3 2.6M196.9 269.2l-1.1-1.2 1.6 .2-.5 1 2.5 6.7-.7 1.4M185.6 259.9l2.4 0-1.1-2.4-1.3 2.4-1.4 1.2 1 8.1
                           M200 258.3l.7 .3 0-1.1-.7 .8-7.6 4.7 0 1.8M199.5 267.7l1.3-.9-.3 1.5-1-.6-2.1 .5M202.3 264.6l.1-2.4 1.9 1.1-2 1.3-1.5 2.2M175.4 251.4l1.8-1-2-1.1 .2 2.1-1.9 3.9
                           M187.6 251.5l-.4-.5 .8-.4-.4 .9-.7 6M198.3 253.1l2 1.9 .4-2.7-2.4 .8-9.8-2.9-.5 .4M173.2 247.2l.8 .2-.3-1-.5 .8-4.1 1.3M166.7 240.4l4.2-.6-2.7-3.4-1.5 4-2.5 2 .2 2.6
                           M195.1 238.6l2.1 .1-.8-2-1.3 1.9-4.2 2.8-1.3 1.9-.7-2.1 2 .2M180.2 235.3l.8-.3-.8-.4 0 .7-6.1 5.8-.4 5.3M169.2 231.7l1-3.1 2 1.7-3 1.4-1.5 1.7 .5 3
                           M169.8 225.5l-.7-1.2 1.4 .1-.7 1.1 .4 3.1M167.6 213l.5-.6 .3 .6-.8 0-.6 .2-.9 1.5M170 202.2l-.4-1.6 1.5 .9-1.1 .7-1.9 10.2M175.4 230.1l1.5 .6-.6-1.5-.9 .9-3.2 .2
                           M192.2 227.5l.9 .2-.3-1.3-.6 1.1-10.6 7.5 7.3 6.2M196.9 234.5l-.2-1.1 .9 .3-.7 .8-.5 2.2M175.9 222.1l.3-.2-.3-.2 0 .4-.1 .2 .5 6.9M191.2 221.8l-2.3-2.4 2.8-.5-.5 2.9 1.7 3.8-.1 .8
                           M197.2 213.3l2.3-.1-1.6-2.4-.7 2.5-5.5 5.6M201.7 222.4l1.8-2.4 1.3 2.7-3.1-.3-8.8 3.2M203.7 217l-.6-1.1 1.3 .4-.7 .7-.2 3M185.5 208.5l.9-2-2.2 .4 1.3 1.6 1.4 9.8 2 1.1
                           M189 205.1l-.9 .1 .4-.8 .5 .7 8.5 3.8 .4 1.9M179.6 206.4l1.8-.4-1.5-1.3-.3 1.7-6.3 6.5-.4 2.5-2.1-1.8 2.5-.7M200.4 197.3l1.5 1.2 .1-1.9-1.6 .7-2.6-.7-2.1 .4 .2-1.6 1.9 1.2
                           M189.2 201.7l-.6 1.2-.5-1.3 1.1 .1 6.5-4.7M183.2 197.1l.4 0-.2-.6-.2 .6-3.8 6.4-8.3-2M172.3 164l-1.4-3.8 3.7 1.7-2.3 2.1-.3 2.6-1.1 1.9
                           M175.6 191.7l4.8 1.5-1.6-4.6-3.2 3.1-6.3 .9-.2 .3-6.6 2.6M190 190l1.5 .1-.7-1.8-.8 1.7-6.7 6.1 .1 .4M179.9 182.3l.4-.4-.6-.1 .2 .5-1.1 6.3
                           M185.3 182.1l-2.7-.7 2.1-1.8 .6 2.5 5.5 4.9 0 1.3M186.5 174.5l2.9-1.7-3.3-2.1 .4 3.8-1.8 5.1M200.5 180l.5-1 .3 1.1-.8-.1-9.7 7M199.6 175.9l-3.3-2.1 3.5-1.5-.2 3.6 1.5 2.4-.1 .7
                           M178.9 168.2l2.1-.4-1.4-1.3-.7 1.7-1.3 .7-2.5 3.9M201.8 169.7l.5 .1 0-1.1-.5 1-2 2.6M203.1 176l.5-3.4 2.5 .9-3 2.5-2 2.3M177.9 162.1l.6 .5 .3-.8-.9 .3-3.3-.2
                           M195.3 160l3.5 1.6-.8-3.8-2.7 2.2-6.9 .5-2 1.7-.4-2.9 2.4 1.2M163.3 153.5l3-1.1-2.9-1.7-.1 2.8-1.5 1.6 .5 1.7M166.6 133.4l-1-1.3 2.3-.9-1.3 2.2-1.4 6.2 .1 .6
                           M166.7 122.6l-2.3-1.7 2.8-1.3-.5 3 2.5 7.4-1.3 1.2M178 145.3l1.1 .1-.4-.8-.7 .7-2.5 .4-2.4 1.5-.4-2 2.8 .5M196.2 152.8l1.8 .6-.6-2.4-1.2 1.8-11.2 4.8 1 1.7
                           M189.1 140.5l1.7 .3-.8-2-.9 1.7-9.4 5.2 5.2 11.9-6.1 4.2M197.6 148.7l-.4-1.1 .9 .1-.5 1-.2 2.3M206.6 133.5l2.8-1-2.5-2.2-.3 3.2-2.1 3-.3 2.2-1.6-1.5 1.9-.7
                           M205 141.3l1.2 1.1-1.6 .4 .4-1.5-.8-2.6M207.8 142.9l.5-.3 0 .6-.5-.3-1.6-.5M212 136.6l.1-2.1 1.6 1.6-1.7 .5-3.7 6M180.4 137.2l2.6-1.6-3.1-2.6 .5 4.2-1.7 7.4
                           M193.6 127.1l2.8-1-1.7-1.9-1.1 2.9-1.4 1.6 .2 4.5 1.2 1.6-1.9 .6 .7-2.2M205.8 127.9l-.5-.3 .6-.3-.1 .6 1.1 2.4M172.9 113.6l1.6 .3-.4-1.2-1.2 .9-1 .2-4.7 5.8
                           M180.3 128.4l.8-3.8 2.5 2.5-3.3 1.3-1.6 2.1-9.5-.5M180 118.6l-1.8-2.6 3-.1-1.2 2.7 1.1 6M198.5 112.5l1.5-.6-1.3-.7-.2 1.3-2.5 2-1.4 2.9-1.6-2.6 3-.3
                           M209.3 121.4l-.3-2.3 2.6 .8-2.3 1.5-3.4 5.9M164.9 106.9l-2.9-.9 2.4-1.9 .5 2.8 7 6.9M165.9 100.5l1.9-1.2-2.2-1.2 .3 2.4-1.5 3.6M176.7 105.7l-.3-2.2 1.9 .6-1.6 1.6-2.6 7
                           M174.7 100.8l-2-1.2 2.3-.8-.3 2 1.7 2.7M164.2 96l-1.2-.6 1.1-.6 .1 1.2 1.4 2.1M167.3 87.6l-.4-2.1 2.1 .9-1.7 1.2-3.2 7.2M180.5 103.3l1.3-.1-1-.8-.3 .9-2.2 .8
                           M185.9 113l1.5-2.7 1.6 2.5-3.1 .2-4.7 2.9M187.3 105.8l-.2-.5 .5 .2-.3 .3 .1 4.5M194.8 100.8l1.2-1-1.6-.7 .4 1.7-.5 2.5 .4 2.1-1.8-.8 1.4-1.3
                           M207.3 106.1l.7-2.9 2.3 1.9-3 1-6.2 5.8 7.9 7.2M206.8 99.8l-1.5-1 1.8-1.2-.3 2.2 1.2 3.4M176.7 97.2l.7 .1-.2-1-.5 .9-1.7 1.6
                           M185.8 89.2l3.3-.1-1.9-2.4-1.4 2.5-7 3.1-1.3 1.7-.7-2.1 2 .4M208.2 95.7l.3-1.1 .6 .9-.9 .2-1.1 1.9M208.2 92.5l-1.2-1.2 1.7-1-.5 2.2 .3 2.1
                           M176.7 75.9l1.3-.5-1.1-1.2-.2 1.7-5.9 10.4 6 5.6M186.3 80l-1-1.8 1.8 .2-.8 1.6 .9 6.7M193.4 76.8l2.5 .8-1.5-2.2-1 1.4-3.3 .2-1.2 .4 .4-.9 .8 .5
                           M184.7 73.4l1.2-2-2.4 .9 1.2 1.1-.4 4 1 .8M171.2 70l2.8 .4-1.4-3.1-1.4 2.7-11.1 6.6 0 1.1M168.3 61.1l2.4 .6-1-2.4-1.4 1.8-10 2.6M169.6 55.5l-1.5-2.4 2.7-.3-1.2 2.7 .1 3.8
                           M173.8 50.3l1.3-2.4 1.3 1.7-2.6 .7-3 2.5M175.6 44.2l-.6-3.1 2.5 1.7-1.9 1.4-.5 3.7M173.6 38.5l-1.2-.7 1.2-.6 0 1.3 1.4 2.6M191.9 70.9l1.6 1.4 .1-2.5-1.7 1.1-4.3-.7-.3 .4 2 5.9
                           M195.2 64.1l.4 .5 .6-.9-1 .4-4.3 .1-2.5 2-.4-3.9 2.9 1.9M180.2 58.4l3.1-.1-1.4-2.5-1.7 2.6-8.2 4.5 .6 4.4M188.4 58.4l2-.3-1.2-1.8-.8 2.1-1.4 1.5 1 2.4
                           M196.5 62.3l-.9-1.1 1.1-.3-.2 1.4 .1 1-.4 .4M182.2 53.4l.2-.1-.3-.3 .1 .4-.3 2.4M196.9 48.7l.7-.2-.6-.4-.1 .6-7.8 6 .1 1.6M199.8 55.2l-.2-4.1 3.6 2.6-3.4 1.5-3.1 5.7
                           M179.2 50.1l1.4 .9-.4-1.6-1 .7-2.8-.5M180.6 44l-.5-.7 1-.3-.5 1-.4 5.4M198.1 35.2l1.1-.3-1-.8-.1 1.1-3 3.6-.6 4.1-3.5-2.8 4.1-1.3M203 44.3l1-4 3.3 2.8-4.3 1.2-4.9 4.4 1.5 2.4
                           M202.7 36.5l-1-.9 1.4 0-.4 .9 1.3 3.8M187.4 29.1l.4-.1-.2-.3-.2 .4-2.3 3.1-.6 3.1-2.2-1.6 2.8-1.5M185.3 38.2l.8 .8-1.2 .3 .4-1.1-.8-2.9
                           M168.8 26.2l2.1 .6-.3-2.5-1.8 1.9-2.9 1.2-1.4 2.7M174.8 35.1l0-2.1 1.8 1-1.8 1.1-1.2 2.1M189.5 17.8l4.3-.1-1.8-3.7-2.5 3.8-3.7 2.5-.6 1.7-1.5-1.5 2.1-.2
                           M193.9 25.9l3.1-3.1-.5 4.5-2.6-1.4-6.3 2.6-2.4-6.5M176.3 19.1l2.2-.4-1.3-1.6-.9 2-5 3.6-.7 1.6M180.5 6l3-.7-2.1-2.2-.9 2.9-3.1 2.9-1 2.7-1.7-2.3 2.7-.4
                           M192.6 10.4l-.2-.9 .7 .5-.5 .4-.6 3.6M191.3 7.8l-1.7-1.1 1.3-.8 .4 1.9 1.1 1.7M202.3 11l2.8 .8-.2-2.9-2.6 2.1-2.1 .8-1.8 8.1 7.6-.2 2.2-1.5 .4 2.8-2.6-1.3
                           M206.1 6.7l.1-.5 .4 .2-.5 .3-1.2 2.2M202.9 396.7l-.5-.7 .8 .3-.3 .4 3.3 9.5M207.4 394.6l.8 1.6-2.7-.1 1.9-1.5 2-5.1 3.5 1.8 .3 1.5 2.1-1.1-2.4-.4
                           M209.2 371.8l1.9-3.1 1.6 2.4-3.5 .7-2 1.5 .8 7.5-.6 .8M220 398.3l3.5-1.6-3.6-1.7 .1 3.3-4.9 6M215.1 4.3l-.1 1.1-.9-.8 1-.3 4.9-6M216.8 9.2l2.1 1.5-2 1.2-.1-2.7-1.8-3.8
                           M227.2 11.8l1.3-.6-.1 1.6-1.2-1-8.3-1.1M232.1 5.3l.3-2.2 1.4 1.6-1.7 .6-3.6 5.9M227 397l-.5-.2 .5-.2 0 .4 5 4.7 2.3-5 1.2-1.3-1.6-.1 .4 1.4
                           M234.6 390.1l1.6 1.5 .7-1.9-2.3 .4-2.2-.4-.7 .4-.1-1.1 .8 .7M231.1 392.1l.6 1.8-1.8 .1 1.2-1.9 .6-2M236.9 394.8l.2-.3 .3 .3-.5 0-1.4 .6
                           M220.6 381l.9-.2-.6-.7-.3 .9-.6 .4-3.1 10.1 3 3.5M229.1 384.7l-3.7-2.9 4.2-1-.5 3.9 2.5 4.3M242 386.4l1.7 .3-.4-2.1-1.3 1.8-5.1 3.3M241.9 396.3l1.5-.6 0 1.9-1.5-1.3-4.5-1.5
                           M245.8 391.2l-.2-2.1 2 .8-1.8 1.3-2.4 4.5M235 375.5l2.2-.5-1.6-1.8-.6 2.3-5.4 5.3M219.8 371.6l1-1.5-1.5-.1 .5 1.6-.4 1.1 1.5 7.4M235 371l-.5-1.1 .9 .3-.4 .8 .6 2.2
                           M230 364.6l-.5-.1 .4-.4 .1 .5 4.5 5.3M235.7 360.7l2.8 .5-.9-3-1.9 2.5-5.8 3 0 .4M237.5 369.3l1.8-1.6 .2 2.2-2-.6-2.1 .9M240.5 365.2l.2-1 .3 .9-.5 .1-1.2 2.5
                           M240.8 372.5l0-.9 .8 .3-.8 .6-2.1 3 5.1 7.7-.5 1.4M204.6 353l.8-.4-.7-.4-.1 .8-1.8 2.3M214.6 356l-.3-2.6 2.1 1.3-1.8 1.3-2.4 8-.2 .2-.9 4.5M203.1 325.6l-.4-1 1.1 0-.7 1-.6 3.5
                           M214.9 333.9l1.1-1.8 1.1 1.9-2.2-.1-7.8 4.1-.1 .5M215.9 326.8l-2.2-4.3 4.7 .8-2.5 3.5 .1 5.3M226.4 357.4l-4.2-2.5 3.9-2.6 .3 5.1 3.5 6.3
                           M229.3 348.2l2.4 .6-.4-2.4-2 1.8-1.7 .5-1.5 3.6M238 355.5l-.3-.7 .8 .1-.5 .6-.4 2.7M220.7 345.9l2.1 0-1.1-1.9-1 1.9-5.6 3.2-1.2 1.5-.3-1.8 1.5 .3
                           M221.5 337.9l-1.4-2.3 2.8 .2-1.4 2.1 .2 6.1M242.1 340.1l3.2 1-.8-3.3-2.4 2.3-7.6 1.7-1.7 1.4-.1-2.2 1.8 .8M248.2 351.6l.3-.5 .3 .6-.6-.1-9.7 3.3
                           M248 344.8l-.6-1.2 1.1 .1-.5 1.1 .5 6.3M229.2 335.2l-2.5-.9 2.3-2.2 .2 3.1 3.5 5.8M230.2 329.3l1-.7-1-.8 0 1.5-1.2 2.8M243.4 331l-2.4-1.8 2.7-1.4-.3 3.2 1.8 4.6-.7 2.2
                           M217.1 308.9l1.9 .1-.6-1.4-1.3 1.3-1.3 .3-3.6 4.8-1.2 3.9-2.1-3 3.3-.9M225 321.2l.9-1.7 1.3 2-2.2-.3-6.6 2.1M224.6 312.8l-2-2.4 2.9-.7-.9 3.1 1.3 6.7
                           M241.5 314.9l.4 .1-.1-.5-.3 .4-13 7.4 1.7 5.5M246.3 323.6l0-1.2 1 .6-1 .6-2.6 4.2M199.1 311.9l1.6-.2-.8-1.3-.8 1.5-.9 .7-.6 1.3M207.1 285.6l2.6-2.1 1 2.8-3.6-.7-2.7 .5
                           M211 280.2l-.2-1.7 1.5 1.1-1.3 .6-1.3 3.3M209.4 276.3l-1.8-1.1 1.4-1 .4 2.1 1.4 2.2M203.5 274.7l-2.6 .4 .9-2 1.7 1.6 4.1 .5M210.7 300.7l-2.6-1.7 3.1-1-.5 2.7 5.1 8.5
                           M235.1 306l2.6 1.3-.4-3.2-2.2 1.9-5.7 .5-1.7 .8 .4-1.6 1.3 .8M227.1 297l2.2-.5-1.1-1.9-1.1 2.4-1.1 1.2 2.1 7.5M238.2 301.3l-.4-.8 1-.1-.6 .9-.9 2.8
                           M213.4 295.9l1.2-.1-.7-1-.5 1.1-2.2 2.1M220.4 301.3l-1.3-3.1 4.2 .6-2.9 2.5-2 6.3M216.9 283.3l1.1-.3-.8-.9-.3 1.2-4 4.3 1 7.2M228.7 289l-1-1.8 2.1-.4-1.1 2.2-.5 5.6
                           M236.4 285.1l3.5 1.6-.3-3.5-3.2 1.9-4.6 .1-.6 .3 .1-.6 .5 .3M242.8 297.5l1.4-2 .7 1.9-2.1 .1-4 2.9M244.9 293.5l-.2-.9 .8 .3-.6 .6-.7 2
                           M242.5 272.4l1.4 .8-.6-1.5-.8 .7-7.3-1-3.7 1.1 1.4-3.6 2.3 2.5M229.3 274.5l-.1 .4-.3-.3 .4-.1 2.2-2M222.6 274.7l2.8-.9-2.2-2.1-.6 3-5.6 6.6 .2 .8
                           M206.9 263.1l.7 .3-.1-.7-.6 .4-2.6 .2M210.2 269.6l-.5-3.2 2.6 .7-2.1 2.5-1.2 4.6M206.3 258.3l-1.7-1.2 1.9-1-.2 2.2 1.5 3.9-.3 .5M208.7 252.4l0-3.6 3.3 1.9-3.3 1.7-2.2 3.7
                           M218.4 264.4l1.6 .3-.7-1.3-.9 1-1 .1-5.1 2.6M231.8 262.7l-1.3 0 .5-.9 .8 .9 .7 .3 .4 5.9M243.4 265.7l-1.2-1.5 2.2-.6-1 2.1-.1 6M229.5 253.7l.5-.5-1-.5 .5 1 1.5 8.1
                           M233.3 254.8l-1.1-1.3 2-.8-.9 2.1-.6 8.1-.2 .1M219.9 253.4l.9-.9-1.3-.6 .4 1.5-.6 10M231.7 246.7l2.8 1-.5-3.6-2.3 2.6-2.3 1-1 4.5 .6 .5M236 250.9l.1-.7 .7 .5-.8 .2-1.8 1.8
                           M210.9 241.9l-2.9 1.1 .9-3.1 2 2 10.2 1.1-2.2 8.2-6.9-.5M223.7 238.2l2.6-1.8-2.7-1.2 .1 3-2.5 4.7 8.2 4.8M234.6 241.4l-.1-.4 .4 .1-.3 .3-.6 2.7
                           M231.1 236.6l-1.5-.6 1.6-.8-.1 1.4 3.4 4.4M208 231.5l-.9-.6 1.2-1.1-.3 1.7 .9 8.4M209.6 216.4l-.4-.5 1-.3-.6 .8-2.8 7.7 2 4.8-.5 .9M213.2 209.9l.2-2.4 1.6 1.5-1.8 .9-2.5 5.4-.5 .3
                           M212.7 204.3l-1.8-1.9 2.7-.3-.9 2.2 .7 3.2M216.9 228l2.7 1.2-.1-3-2.6 1.8-8.1 .9M240.6 232.8l.7 .8 .5-1-1.2 .2-4.7-.9-2.7 .9 .8-2.8 1.9 1.9
                           M240.2 238.2l1.2-2.1 1.5 1.8-2.7 .3-5.3 2.9M221.5 222.5l2.5-1.7-2.8-1.1 .3 2.8-2 3.7M233 223.2l-1.5-2.3 2.7 .5-1.2 1.8 1 6.8M216.6 215.7l2.2 1.1-.6-2.4-1.6 1.3-5.9-.4
                           M239.7 220.4l3.6 1.2-1-3.6-2.6 2.4-5.5 1M221.8 207l1.9-1-2-.5 .1 1.5-2.1 1.9-.9 1.9-1-1.3 1.9-.6M231.5 212.3l-1.3-3.2 3.6 .4-2.3 2.8-1.5 7.5 1.5 1.1
                           M243.4 213.9l-.8-1.9 2.4 .2-1.6 1.7-1.1 4.1M215.8 200.8l1 .1-.2-1.1-.8 1-2.2 1.3M228.1 198.8l2-1.8-2.5-.5 .5 2.3-3.1 7 5.2 3.3M237.6 201.3l-1.3-2.6 3.3-.1-2 2.7-1.4 7.2-2.4 1
                           M218.8 194.4l1.7-1.3-1.9-.8 .2 2.1-2.2 5.4M223.9 193.2l-1.1-.4 1-.5 .1 .9 3.7 3.3M213.2 187.5l3.1 1.6 0-3.3-3.1 1.7-4.5 .3-2.6 1.5-.1-2.8 2.7 1.3
                           M205.8 160l-1.1-2.6 3.8 .2-2.7 2.4-2.9 7 0 .1-.6 1.6M221.6 180.7l2.3 1.3 .5-2.7-2.8 1.4-2 .3-3.3 4.8M225.6 189.8l.4-3.2 2.5 2.2-2.9 1-1.8 2.5
                           M239.1 190.8l1.9 2.5 .6-3.4-2.5 .9-2.9-1.2-1.4 0 1.2-.8 .2 .8M233.7 190.1l-.2 .3-.2-.3 .4 0 1.1-.5M226.2 177.4l.8-.3-.5-.5-.3 .8-1.8 1.9M238 186.1l.8-3.6 1.9 3.3-2.7 .3-2 2.7
                           M238.1 178.8l-1.3-1.2 1.7-.8-.4 2 .7 3.7M228.1 165.3l-2.3 4-2.7-4.1 5 .1 8.2-3.8 3.5 12.7-.1 1 .8-.5-.7-.5M249.7 161.8l3 2.3-.3-3.9-2.7 1.6-9.9-1.8-2.1 .5 1.3-1.8 .8 1.3
                           M249.2 173.5l3.2-2.7 .6 4.4-3.8-1.7-8.7 1.2M217.9 162.7l1 .2-.5-.8-.5 .6-.7 .2-7.1 8.4 9.5 9.7M223.8 152.1l3.7-.7-3.3-1.6-.4 2.3-2.8 1.4-1 .8 .2-1.2 .8 .4
                           M219 155.6l-.4 1.2-.6-.7 1-.5 1-1.3M231.2 152l-.7-.5 .8-.3-.1 .8 5.3 9.2 1.2-.7M219.6 146.3l1.3 .1-.3-1.5-1 1.4-.8 .7 1.4 6.1M213.5 146.9l-1.8 1.8-1.3-3.2 3.1 1.4 5.3 .1
                           M211.9 154.7l.8 .8-1.3 .6 .5-1.4-.2-6M215.8 127.9l.3-3.7 3.3 2.3-3.6 1.4-4.3 5.3 .6 1.3M235.3 147.7l.7 .4 .1-.8-.8 .4-.6 .1-3.4 3.4M239.9 155.5l-.3-2.2 1.8 .4-1.5 1.8-.9 3.2
                           M221.5 141.3l1.7-2.1-2.6 0 .9 2.1-.9 3.6M227.6 139.3l-1.6-.8 1.6-.6 0 1.4 7.1 8.5M237.2 133.3l2.3 3.3 2-3.3-4.3 0-2.9-1.2-.7 .1-.9 .6-.1-.6 1 0
                           M238.7 144.9l1.2-3.1 2 1.9-3.2 1.2-2.6 2.4M229.1 130.6l-2.2-.2 1.1-1.4 1.1 1.6 3.5 1.6M228.3 122.6l.4-.3-.4-.2 0 .5-.2 .2-.1 6.2M235.1 127.3l-.9-2.9 2.9 .6-2 2.3-.8 4.8
                           M214.1 118.5l1.6-1-1.1-.7-.5 1.7-.7 1-1.8 .4M240.8 123.7l2.7 .1-2.2-1.8-.5 1.7-3.7 1.3M212.9 105.4l.3 .4 .3-.5-.6 .1-2.6-.3M214.4 100.9l-1.9-3.6 4.5 0-2.6 3.6-.5 4.1-.4 .3
                           M209.6 88.6l0-.6 .5 .2-.5 .4-.9 1.7M204.8 79.4l-2.7-1.3 2.8-1.7-.1 3 4.8 8.6M224.1 106.5l-.7-.7 1-.4-.3 1.1 1.3 8.2-.1 .1 3 7.3M237.1 118.2l.9-2.2 .9 2.4-1.8-.2-4.7 4.4 1.8 1.8
                           M237.9 113.8l-.5-.8 .8-.2-.3 1 .1 2.2M235.9 112l-1.8-.2 1-1.3 .8 1.5 1.5 1M235.3 107.8l-.7-2 2 .9-1.3 1.1-.2 2.7M233.4 104.6l-.4-.1 .2-.2 .2 .3 1.2 1.2
                           M220.1 95.9l.5 0-.1-.5-.4 .5-3.1 1.4M225.1 100.8l-1.4-2.8 2.9 0-1.5 2.8-.2 4-.5 .6M232.7 98.3l-1.3-1.4 2.3-.6-1 2 .5 6M222.7 89.7l.5-.2-.6-.2 .1 .4-2.2 5.7
                           M236.1 94.5l2-.4-1.6-1.4-.4 1.8-2.4 1.8M239 106.9l1.3-.4-.2 1.2-1.1-.8-2.4-.2M243.2 103.9l.9-3.5 2.3 3.4-3.2 .1-2.9 2.6M242.8 96.4l-1.7-1.6 2.3-.6-.6 2.2 1.3 4
                           M212.7 71l3.3 1.2-.1-2.5-3.2 1.3-3.1-.1-1.1 .6 .1-1.2 1 .6M217 86.2l1.3-1.5 .8 1.9-2.1-.4-6.9 2M219.5 76.4l-.7-1.9 1.9 .2-1.2 1.7-1.2 8.3
                           M232.5 85.4l1.2 .5 0-1.8-1.2 1.3-9 4.1 5.2 7 2.7 .4M223.6 72.9l2.3-.3-1.8-1.5-.5 1.8-2.9 1.8M230.4 74.9l-1.6-1.4 2.1-.5-.5 1.9 3.8 8.2-.5 1M206.9 67.2l-2.5-2 2.5-1.2 0 3.2 1.7 3.1
                           M208.6 60.4l-.1-2.7 2.3 1.1-2.2 1.6-1.7 3.6M207 55.1l-.6-.4 .7-.2-.1 .6 1.5 2.6M218.2 65.1l-.4-3.5 2.7 1.8-2.3 1.7-.7 3-1.6 1.6M215 58.6l-1.4-.2 .6-.8 .8 1 1.6 .8 1.2 2.2
                           M212.8 49.9l.3-.3-.1 .4-.2-.1-5.7 4.6M211.2 44.1l-.5-.4 .5-.3 0 .7 2 5.3-.1 .2M237.7 67.4l1.3-.3-.9-.9-.4 1.2-6.8 5.6M244.3 80.9l1.3-1.6 .9 2.1-2.2-.5-10.1 2.2
                           M245.7 74.7l-.9-2.2 2 .3-1.1 1.9-.1 4.6M224.5 61l2.7-1.9-3.1-.9 .4 2.8-1.7 2.7 .5 5.9 .8 1.5M237.2 63.4l-1.8-2.6 2.9 .3-1.1 2.3 .9 2.8M232.9 58.8l-1.7-.4 1-1.1 .7 1.5 2.5 2
                           M241.8 46l.6 .2-.1-.7-.5 .5-7.8 2.4-1.7 2.3-1.4-2.9 3.1 .6M244.4 58.5l1.9-2.4 .8 3.2-2.7-.8-6.1 2.6M246.7 53l-.3-1.4 1.1 .2-.8 1.2-.4 3.1M221.4 56.3l.7 .1-.4-.8-.3 .7-4.8 3.1
                           M221.5 53.3l.9-2.2-2.5 .4 1.6 1.8 .2 2.3M234.2 38.7l4.1-.2-2.4-3.1-1.7 3.3-4.1 2.3-1.3 2.4-1.2-2.7 2.5 .3M222 37.1l2.8 .8-.8-2.8-2 2-7.2 1.4-2.4 2-.5-3 2.9 1
                           M207.6 34.2l2 .6-.4-2.1-1.6 1.5-4.5 1.4M211.1 26.3l-.4-2.4 2.2 .9-1.8 1.5-1.9 6.4M219.6 23.5l2.3 .8-.7-2.5-1.6 1.7-6.7 1.3M225.1 30.4l-.8-3.1 2.9 1.3-2.1 1.8-1.1 4.7
                           M236.7 26.4l2.2-.7-1.7-1.3-.5 2-1.6 1.5-.3 .9-.6-.5 .9-.4M245.4 35.4l.2-2.7 2.9 1.6-3.1 1.1-4.5 4.2 1.6 5.5-.2 .4M231.4 14.5l2.4 2.1 .5-2.9-2.9 .8-2.6-.8-7.3 6.4-.3 1.7
                           M238.9 8.8l1-.1-.7-1-.3 1.1-4.6 4.9M249.8 20.1l.4-.9 .7 .8-1.1 .1-9.4 5.8 5.2 6.8M249.9 15.3l-1.3-1.8 2.3 .1-1 1.7 .3 3.9M249.4 389.6l.2-.3 .2 .3-.4 0-1.8 .3
                           M249.8 383.2l-.8-.8 1.5-.6-.7 1.4-.2 6.1M251 399l2.8-1.2-.3 2.8-2.5-1.6-7-.3-5 8.3M253.8-2.2l-.3 2.8-2.5-1.6M254.9 394.1l-1.8-2.5 2.5-.5-.7 3 .3 2.1-1.4 1.6
                           M245.2 370.4l1.4-.3-1.2-.5-.2 .8-3.6 1.5M252.1 377.6l-1.3-4.1 4.1 .9-2.8 3.2-.7 3.5-.9 .7M265.1 384.2l1.3 .1-.9-.9-.4 .8-3.7 1.1-2.9 2-.5-2.4 3.4 .4
                           M260.1 398.6l5.1 0-3.5 3.8-1.6-3.8-4.9-2.4M265.2-1.4l-3.5 3.8-1.6-3.8M267.7 385.6l-.2-.6 .5 .3-.3 .3 .6 11.5-3.1 1.5M281 396.7l.8-1.2-1.8-.1 1 1.3 .5 4.8
                           M281.5 1.5l.9 .5-1.2 1 .3-1.5-.5-4.8M277.1 388.2l1.2 1.5 .8-1.9-2 .4-9.1-2.9M270.8 397.8l3.8-.7-.6 3-3.2-2.3-2.5-.7M274.6-2.9l-.6 3-3.2-2.3M278.1 394.8l.3-.5 .3 .5-.6 0-3.5 2.3
                           M276.7 378.2l2.6 .4-1-3.2-1.6 2.8-9.5 6.4 .3 .4M281 380.9l-.1-.4 .3 .2-.2 .2-.7 6-1.2 .9M270.3 366.6l-1.4-.3 1.2-.9 .2 1.2 8.1 6.3-.1 2.5M282.5 387.9l3.1-.2-1.8 2.6-1.3-2.4-2.2-1
                           M288.6 385.9l.7-1.6 1.2 1.7-1.9-.1-3 1.8M288.8 381.7l-1.4-1.1 1.6-1-.2 2.1 .5 2.6M255.6 360.9l3 1.3-1-3.1-2 1.8-3.5 0-1.8 .8 .5-1.9 1.3 1.1M248.8 363.2l-.5 1-.5-.6 1-.4 1.5-1.5
                           M261.1 365.6l-.5-1.1 1.1 .6-.6 .5 .2 6.7-6.4 2.1M280 359.9l2.3 2 .8-3.1-3.1 1.1-4.3-.8-2.6 1.2 .5-3.2 2.1 2M283.6 368.9l.4-1.4 1.2 .9-1.6 .5-5.2 4
                           M254.7 339.2l.7-2.2 1.8 1.9-2.5 .3-6.2 4.5M256.9 331.5l-.1-.8 .8 .2-.7 .6-2.1 3.8 .6 1.7M257.9 355.6l-1-1.4 1.9-.2-.9 1.6-.3 3.5M262.5 351.5l4.3-.2-2.5-3.7-1.8 3.9-3.7 2.5
                           M273.1 354.8l-.2-.3 .4-.1-.2 .4 .5 2.3M260.6 340.5l0-.9-1 .2 1 .7 3.4 3.6 2.6-3.3-.2-1.7 2.2 0-2 1.7M264 337.7l-1.5 .1 .9-1.6 .6 1.5 2.4 1.4
                           M277.5 351.8l2.3-3.3 1 3.9-3.3-.6-4.2 2.6M280.5 345.2l-.3-.9 .9 .1-.6 .8-.7 3.3M277.1 340.8l-4.1-2.2 3.7-1.8 .4 4 3.1 3.5M263.8 334.1l.9-.9-1.6-.3 .7 1.2-.4 2.1
                           M281.5 319.9l3-.8-2.6-2.3-.4 3.1-1.5 1.8 .1 6.1 .4 1.2-1-.9 .6-.3M283.3 330.1l3.2-1.1-.6 3.2-2.6-2.1-2.3-.5-.5-.6M289.2 326.2l.3-2.1 1.7 1.4-2 .7-2.7 2.8
                           M288.2 320.9l-.8-.8 1.1-.2-.3 1 1.3 3.2M255.5 318.2l2.6-.2-1.8-2.1-.8 2.3-7.4 4.8 8.7 7.7M273.2 324.7l.6-.1-.4-.6-.2 .7-7.3 8.5 4.1 5.1-1.4 .8
                           M268.7 318.1l-2-.7 1.7-1.4 .3 2.1 4.7 5.4 0 .5M253.5 308.8l.3 .2 0-.5-.3 .3-11.7 5.4 0 .3M253.5 305.2l-2.4-3.8 4-.3-1.6 4.1 .4 3.1-.1 .2
                           M257.3 297.5l-1.2-2.2 2-.3-.8 2.5 .1 1.7-2.3 1.9M251.8 292.3l-3.5-.4 2.8-2.4 .7 2.8 4.3 3M254.4 283.2l-.3-2.4 2.4 .8-2.1 1.6-3.3 6.3M248.5 275.1l-2.3-1 2.4-.9-.1 1.9 5.6 5.7
                           M260 304.7l1.1 .1-.4-1.1-.7 1-6.1 3.6M270.1 311.8l-.2-.6 .7 0-.5 .6-1.7 4.2M278.2 311.8l2 1.4 .1-2.5-2.1 1.1-7.2-.9-.4 .3M270.5 304.1l-2.4-2 3.7-1.9-1.3 3.9 .5 6.8
                           M279.4 298.1l3.2 2.3 0-3.8-3.2 1.5-4.4-.7-.9 .3 .2-1 .7 .7M284.2 304.1l0-.9 .7 .5-.7 .4-3.9 6.6M263.6 288.4l2.2-1.3-2.3-.8 .1 2.1-5.5 6.6M273.7 293.7l-1.8-3.1 2.7-.2-.9 3.3 .6 3
                           M284.6 293.2l-.2-1.8 1.9 .7-1.7 1.1-2 3.4M253.2 269.4l1.6 .1-.6-2-1 1.9-4.6 3.8M259.7 278.7l-.3-3.9 3.9 1.3-3.6 2.6-1.5 2.5-1.7 .4M268.3 285.8l1.9-.8-1.3-1.2-.6 2-.8 1.1 4.4 3.7
                           M267.3 275.7l-.6-.4 .9-.6-.3 1 1.6 8.1M250.9 262.2l-2.3-1 1.9-1.2 .4 2.2 3.6 4-.3 1.3M245.2 253.8l-2.2-2.1 3.3-.6-1.1 2.7 1.8 7.4 1.6 0M252.1 256.1l-.5-2.9 3 1.2-2.5 1.7-1.6 3.9
                           M248.9 244.5l-1-3.7 3.2 1-2.2 2.7-.8 5.3 3.5 3.4M261.5 262.5l2.8 .4-.8-3-2 2.6-7 3.7M270.7 270.9l.3-.7 .4 .6-.7 .1-3.1 3.8M281.4 279.3l-1-3.2 3.8 .2-2.8 3-2.7 6.6-.4 .1-3.7 4.4
                           M271.9 257l3.1 1.7-.3-4-2.8 2.3-7.8 .6-.6 2.3M260.3 254.2l2.6 1.4-.2-3.1-2.4 1.7-5.7 .2M283.6 249.6l3.9 1-1.4-3.6-2.5 2.6-7.3 1.3-.7 .6-.2-1 .9 .4
                           M283.8 261.9l2.1-.9 .1 1.9-2.2-1-7.5-.6-5.3 8.4 0 .5M288.1 258.4l1.2-2.7 .4 3-1.6-.3-2.2 2.6M289.8 253.3l-.1-.7 .4 .3-.3 .4-.5 2.4M264.2 248.5l2.4-1.7-2.5-1.6 .1 3.3-1.5 4
                           M273.1 247.8l-2.5-1.1 1.6-1.5 .9 2.6 2.3 2.7M277.5 235.1l3.1 0-2-2.4-1.1 2.4-4.2 2.2-.5 .7-.4-.8 .9 .1M287.2 239.3l-.6-1.1 1.4 .1-.8 1-1.1 7.7
                           M257.7 239.8l3.1 .6-1.5-2.9-1.6 2.3-6.6 2M253.1 230.3l2.6-.2-2.1-2-.5 2.2-4.8 3.1-1.8 3-1.5-2.8 3.3-.2M259.3 234.7l-.3-1 .8 .3-.5 .7 0 2.8
                           M251.8 224.7l-2.3-1.4 2.2-1.5 .1 2.9 1.8 3.4M253 218.7l0-2.2 1.5 .7-1.5 1.5-1.3 3.1M252 214.1l-1.4-1.5 2 .2-.6 1.3 1 2.4M248 211.4l-.9-.1 .4-.7 .5 .8 2.6 1.2
                           M247.6 202.4l-1.6-2.5 3.2 .1-1.6 2.4-.1 8.2M266.2 226.3l2 .6-.5-2.8-1.5 2.2-8.8 4.6 1.6 2.8M267.3 220.4l1.1-2.3-2.6-.7 1.5 3 .7 1.9 6.1-3.5 .7-1.8 1.4 1.7-2.1 .1
                           M262 214.5l1.1 0-.9-.6-.2 .6-7.5 2.7M281.1 223.5l0-1.7 1.3 1.1-1.3 .6-3.1 7.2 .6 2M274.4 214.6l-.5-1.3 1.4 .4-.9 .9-.1 1 .5 1.4M272.6 212.3l-.8-.2 .4-.6 .4 .8 1.3 1
                           M258 211.4l2.5 .6-.9-2.5-1.6 1.9-5.4 1.4M256.8 196.9l2.3 .4-1-2.3-1.3 1.9-7.6 3.1M278.9 197.5l2.2 .2-1.5-1.5-.7 1.3-5.2 1.3-1.5 1.8-1.3-2.2 2.8 .4
                           M251.1 186.1l3.4 1.3-.5-3.7-2.9 2.4-8.4 1.5-1.1 2.3M258.1 192.7l-.3-.9 .8 .2-.5 .7 0 2.3M255.4 180.1l-.2-1.5 1.3 .7-1.1 .8-1.4 3.6M253.8 155.5l-.6-3.2 3 1.2-2.4 2-1.4 4.7
                           M251.5 150.2l-.6-.4 .5-.2 .1 .6 1.7 2.1M250.2 149.7l-.4 0 .1-.3 .3 .3 .7 .1M269.2 188.3l-.7-.9 1.4 0-.7 .9 .2 9.1 1.5 1M276.6 189.6l-2.4-2 2.6-1.2-.2 3.2 3 6.6
                           M271.7 187.1l-.6 0 .5-.3 .1 .3 2.5 .5M280.1 180.6l.1 .2 .4-.3-.5 .1-1.1-.2-1.1 .4 0-1 1.1 .6M263.8 181.2l-3.5-1.9 3.5-1.8 0 3.7 4 5.9 .7 .3
                           M279.3 168.5l2.6 1-1.3-2.6-1.3 1.6-3.4 .3-2.2 .9 .9-2.1 1.3 1.2M272.1 171.1l0 .7-.8-.5 .8-.2 1.6-1.4M269.4 171.1l-1.6 .7 .2-1.9 1.4 1.2 1.9 .2
                           M279.7 164l.6 .5 .2-.9-.8 .4-4.5 .3-.8 .9-.7-1.2 1.5 .3M263.7 165.8l2.1 .8-.3-2-1.8 1.2-9.9 .6-1.4 4.4M260.8 152.8l2.2 1.2 .4-2.6-2.6 1.4-4.6 .7M266.5 162.5l0-1.1 .9 .4-.9 .7-1 2.1
                           M272.3 163.1l-.9 .2 0-1 .9 .8 1.4 .9M270.7 161.4l-.5-.2 .4-.4 .1 .6 .7 .9M247.4 144.9l-1.7-1 1.9-.9-.2 1.9 2.5 4.5M253.2 145.6l-.5-3.9 3.6 1-3.1 2.9-1.8 4
                           M271.8 156.3l-1.1-2.6 3.1 0-2 2.6-1.2 4.5M281.9 152.8l1.4 1.7 .5-2.3-1.9 .6-2.8-1-2.2 .1 1.2-1.8 1 1.7M283.1 160.5l.7-2.7 1.6 2.2-2.3 .5-2.6 3.1
                           M271.4 143.6l4 0-2.9-3.6-1.1 3.6-5.8 4-.8 1.3-.3-1.5 1.1 .2M278.5 146.1l-.3-.6 .7 .2-.4 .4-.4 4M264.7 127.2l2.1 .5-.4-2.3-1.7 1.8-2.9 1.3-1.5 1.6-.5-2 2 .4
                           M259 134.2l.4 3.9-3.1-1.1 2.7-2.8 1.3-4.1M271.7 135.5l-.6-2.4 2.2 .3-1.6 2.1-.3 1.7 1.1 2.8M279.1 130l3.7 0-2-3.2-1.7 3.2-5.8 3.4M280.6 145.5l1.6-.8-.2 1.6-1.4-.8-1.7 .2
                           M287.6 138.8l.7-2.3 1.1 2.1-1.8 .2-5.4 5.9M288.2 133.7l-1-1.4 1.6-.3-.6 1.7 .1 2.8M254.4 122.7l-3.3-.6 2.7-2.7 .6 3.3 5.4 5.4M271 121.8l6 .3-2.3-5.1-3.7 4.8-4.1 2-.5 1.6
                           M264.9 108.5l2.7-1.6-2.4-1.6-.3 3.2-3.8 6.1 .3 2.9-2.9-1 2.6-1.9M275.5 112.3l-.3-.9 1 .2-.7 .7-.8 4.7M240.7 109.7l.8-.5-.7-.3-.1 .8-2.5 3.1
                           M248.7 108.5l-1.6-.6 1.2-1.2 .4 1.8 6.1 8.7-1 2.2M247 90.4l1.4-4.2 2.7 3.4-4.1 .8-3.6 3.8M278.9 110.8l2.6 1.1-.1-3.1-2.5 2-2.7 .8M285.6 120.7l.3-1.7 1.7 1.2-2 .5-5 3.5 .2 2.6
                           M264.2 102.9l.2-.4-.6-.1 .4 .5 1 2.4M270.6 101.5l-.3-.3 .6-.4-.3 .7-.8 5.3 5.4 4.6M258.3 100.6l3.3 .2-1.8-3-1.5 2.8-9.9 4.8-.1 1.3M282.7 106.2l.1-.9 .7 .5-.8 .4-1.3 2.6
                           M281.8 103.2l-1.8-1.5 2-.9-.2 2.4 1 2.1M261 91l3.4-1.5-2.5-1.9-.9 3.4-1.7 1.7 .5 5.1M269.6 90.4l-.5-.7 .8 .1-.3 .6 1.7 10.1-.4 .3M277.7 86.1l2.1 .2-1.1-2-1 1.8-7.8 3.7
                           M257.9 79.6l1.3 .1-.7-1.1-.6 1-10 3.1 .5 3.5M269.5 80.9l1.3-1-2-1.2 .7 2.2-.8 8.5 .4 .3M278.5 82.1l-.5-.6 .8-.4-.3 1 .2 2.2M251.2 70.1l3.2-.2-2.2-2.4-1 2.6-4.4 2.7
                           M257.8 71.8l-.6-.9 1.2 0-.6 .9 .7 6.8M250.8 63l-1.2-1.3 1.8-.1-.6 1.4 1.4 4.5M250.5 50l.8-1.9 1.4 1.9-2.2 0-3 1.8M250.6 46.1l-.6-.5 .7-.4-.1 .9 .7 2
                           M259.7 70.2l1 0-.5-.8-.5 .8-1.3 .7M267.8 75.8l-1-1.9 2.1-.1-1.1 2 0 1.7 1 1.2M275.4 69l2.2-.3-1.6-1.6-.6 1.9-6.5 4.8M281.3 77.4l.4-3.8 2.9 2.3-3.3 1.5-2.5 3.7
                           M280.3 70.2l-.7-.7 1-.1-.3 .8 1.4 3.4M267.9 57.7l2.4 .1-1.4-1.8-1 1.7-5.6 2.2-1.3 1.7-.9-1.9 2.2 .2M272.8 59.3l-.6-.7 .8-.1-.2 .8 3.2 7.8M257.6 58.5l.7 0-.4-.7-.3 .7-6.2 3.1
                           M280.4 52.3l3.2-.6-2.8-2.1-.4 2.7-7.4 6.2M288.3 63.1l.8-3.1 2.7 2.4-3.5 .7-7.7 6.3M265 47.7l1.6 .1-.8-1.6-.8 1.5-6.6 3.9-1.1 2.3-1.6-2.3 2.7 0
                           M279 47.2l.4 .2-.1-.5-.3 .3-11.5 1.4 1.4 7.4M261.9 38.9l2.1 1.1-.5-2.2-1.6 1.1-5.8-.3-3.1 1.8-.5-3.7 3.6 1.9M275.5 37.3l2.1 .3-1.1-2-1 1.7-10.4 3.8 .7 5.1
                           M279.9 39.9l-.4-.9 1 .1-.6 .8-.6 7M265.7 29.4l1.6-1.1-1.9-1.2 .3 2.3-2.2 8.4M276 29.4l-.3-.3 .5-.2-.2 .5 .5 6.2M253.8 27.8l-.4-4.7 4.2 1.6-3.8 3.1-3.1 6.6 1.8 2.3
                           M253.9 12.4l2.1-1.6-.8 2.5-1.3-.9-3 1.2M257.5 9l.1-.9 .8 .4-.9 .5-1.5 1.8M264.2 25l-1-.8 1.2-.3-.2 1.1 1.2 2.1M283.4 37.5l1.3-2.6 1.8 2.5-3.1 .1-2.9 1.6
                           M284.1 31.5l-1.1-1.2 1.7-.5-.6 1.7 .6 3.4M275.4 25.2l-2.1-2.3 2.5-1-.4 3.3 1 3.4-.2 .3M269.4 21.5l-2.8 .5 1.4-2.7 1.4 2.2 3.9 1.4M253.8 19.1l2.5 .3-1.1-2.5-1.4 2.2-2.3 1.2 1.9 2.8
                           M273.2 11.7l2.9 .7-.6-2.9-2.3 2.2-3.5 1.3-1.4 1.8-1-2.1 2.4 .3M278.8 16.5l-.2-1.7 1.7 .6-1.5 1.1-3 5.4M259.4 8.2l.7 .1-.2-.6-.5 .5-1 .3
                           M278.4 4.5l-1.6 1.5-.3-2.2 1.9 .7 2.3-.6 4.5 3.4 .9 2.7 1.7-2.8-2.6 .1M283.9 15l1.5-1.4 .5 2.1-2-.7-3.6 .4M293.7 395.2l1.6-3.4 2 3.2-3.6 .2-6.3 4.6 0 .2-5 2
                           M290.6 376.5l-.3-2.9 2.7 1-2.4 1.9-1.6 3.1M290.3 362.3l.2-2.7 2.2 1.4-2.4 1.3-4 6.1 4 5.2M301 399.1l2.7 1.6M301-.9l2.7 1.6-3 2 .3-3.6
                           M300.7 402.7l.3-3.6-1.1-2.6 4.3-2.6 1.5 1.2 1 2.5 1.6-2.3-2.6-.2M312.9 392.6l1.8 .1-1-1.8-.8 1.7-4.6 2.7M311.6 5.4l1.6 .6-1.4 .9-.2-1.5-5.4-5.2-2.5 .5M317.3 402.8l1.3-3.8 2.2 2.8
                           M317.3 2.8l1.3-3.8 2.2 2.8-3.5 1-2.9 3.2-1.2 0M318.4 396.1l-.2-.3 .4 0-.2 .3 .2 2.9M304.2 387.4l.3-.3-.5-.5 .2 .8 0 6.5
                           M312.1 385.3l1-3.4-4 1.4 3 2 1.4 4 3.5-3.6 .1-3.3 3.5 2-3.6 1.3M301.6 372.1l1.1-.8-.9-.5-.2 1.3-.5 .7 3.6 10 .9 .5-.9 .6 0-1.1M316 376.2l-.8-3.2 2.9 1.4-2.1 1.8-.7 4 1.8 2.2
                           M313.2 370.4l-1.4-.6 1.1-1 .3 1.6 2 2.6M297.6 360.8l1 .8 .1-1.5-1.1 .7-4.9 .2M317.2 361.4l-3.1 2.8-.6-4.6 3.7 1.8 9.7-1.4 .2 .2 1.9 9.5-.1 .5 .5-.3-.4-.2
                           M323.8 374.5l3.4-1.8-.7 3.9-2.7-2.1-5.7-.1M303.7 356.6l5.1-.6-2.8-3.5-2.3 4.1-4.7 2.6-.3 .9M291.6 356.5l1.7-2.9 1.4 2.8-3.1 .1-1.9 1.3 .8 1.8
                           M294.4 344.3l-1.3-1.9 2.8 0-1.5 1.9-1.1 9.3M290.1 341.3l-2.1 .1 .7-1.6 1.4 1.5 3 1.1M315.3 352.4l4-1.9-3.7-2.3-.3 4.2-3.2 4.5 1.4 2.7M326.8 357l-1.4-3.2 2.5 0-1.1 3.2 .1 3
                           M305.7 347.4l1.3-1.9-2.6-.2 1.3 2.1 .3 5.1M313.4 344.3l-1.7-.6 1.6-1.4 .1 2 2.2 3.9M322.9 339l2.5 1.4 0-2.9-2.5 1.5-7.5 .4-1 .7 0-1.3 1 .6
                           M300.5 332.3l1.6-1.2-1.9-1 .3 2.2-2.9 9.4-1.7 .7M312 332.7l-3.3-2.1 3.4-2.5-.1 4.6 2.4 6.1M314.4 324.5l2.1-.4-1-1.5-1.1 1.9-1.2 .8-1.1 2.8M327.1 334.9l.2-1.5 1.1 .9-1.3 .6-1.7 2.6
                           M325.2 327.9l-2.8-2.5 3.7-1-.9 3.5 2.1 5.5M297.4 326.6l1.5 1.1 0-1.8-1.5 .7-6.2-1.1M300.1 315.8l.7 .7 0-1.1-.7 .4-2.9-1-3.4 .7 1.6-3.2 1.8 2.5
                           M301.1 321.8l.3-2.8 1.8 2-2.1 .8-2.2 4.1M317.3 310.3l.4-.1-.2-.3-.2 .4-.2 .2-1.6 12.1M329.1 321.5l.7-2.2 1.5 1.5-2.2 .7-3 2.9M329.2 314.6l-1.5-1.7 2.3-.5-.8 2.2 .6 4.7
                           M295.4 308.5l-.2-.5 .5 .1-.3 .4 0 3.8M292.6 305.3l-3-1.3 2.9-1.4 .1 2.7 2.6 2.7M296.4 308.1l.5 .4 .1-.3-.6-.1-.3-.1-.4 .1M294.4 300.1l.3-1.4 1 1.2-1.3 .2-1.9 2.5
                           M292.9 293.2l-2.3-1.5 2.8-1.6-.5 3.1 1.8 5.5M292.3 279.1l-2.5-3 4 .4-1.5 2.6 2.5 9.1-1.4 1.9M301.7 307l1.8 .8-.6-2.4-1.2 1.6-4.7 1.2M304.3 310l.1-.4 .3 .2-.4 .2-3.2 4.7-.3 .7
                           M307.3 297.8l2-.2-1.1-1.9-.9 2.1-4 3.7-.5 1.3-.9-.9 1.4-.4M318.1 304.2l-1-1.9 2.1-.1-1.1 2-.6 5.7M298 302.2l-.5-1.3 1.6 .6-1.1 .7-1.9 5.8
                           M323.6 292.2l1.2-1-1.5-1 .3 2-.9 5.9 1 1.6-2.2 .5 1.2-2.1M329.3 301.5l2.9-.7-.5 2.8-2.4-2.1-5.6-1.8M333.8 293.4l-2.4-1.8 2.7-1.3-.3 3.1 1.7 4.1-3.3 3.3
                           M299.7 286.8l5.3 .4-3.2-3.9-2.1 3.5-4.9 1.4M314 286.8l-3.7 .5 2.3-3 1.4 2.5 8.6 2.4 .7 1M298.3 275.5l2 1.2 .6-3-2.6 1.8-4.5 1M324.8 282l-1.2-2.8 3.5-.1-2.3 2.9-2.2 7.2
                           M302.6 271.4l.8-.6-.7-.3-.1 .9-1.7 2.3M298.8 263.9l1.7 1.3 .5-1.9-2.2 .6-6.2-1-2.1 .6 .5-1.8 1.6 1.2M288.6 264.8l-.6 1.1-.4-1.2 1 .1 1.9-1.3
                           M296.5 245.7l.3-1.9 1.7 1.6-2 .3-7 6.6 .2 .3M295 240.8l-2.3-1.8 2.1-1.1 .2 2.9 1.8 3M304.9 265.5l-1-2.3 2.7 .5-1.7 1.8-.9 5.1 11.3 4.1 .1 .3-2.8 9.3
                           M317.2 271.3l2.7-1.5-2.2-1.8-.5 3.3-1.9 3.4M329.6 276.7l0-2 1.2 .4-1.2 1.6-.4 1.2-2.1 1.2M328.6 271.3l-1.5-1.1 1.8-.9-.3 2 1 3.4M315.6 261.8l.9 .6 .3-1.5-1.2 .9-9 1.9
                           M312 248.9l.6 .2 0-.8-.6 .6-10.4 3.4-.1 .2-11.4 .4M310 242.4l-1.1-.9 1.4-.1-.3 1 2.7 5.4-.1 .5M321.6 244l3.3-.2-2.3-2-1 2.2-8.9 3.8M326 258.3l1.6-.9-.4 1.7-1.2-.8-8.7 1.8-.5 .8
                           M327.5 245.3l-.3-.6 .6 .2-.3 .4 .9 11.2-.8 .9M296.2 234.5l-.7-2 2.5 .3-1.8 1.7-1.4 3.4M293.9 231.4l-.4 .1 .2-.5 .2 .4 1.6 1.1
                           M302.3 229.7l.6-1.9-1.9 0 1.3 1.9 .3 1.4 7.3-4.9 .3-1.8 2.1 1.4-2.4 .4M294.4 224.8l2.4-.1-.9-2.4-1.5 2.5-1.4 1.2 .7 5M296.6 218.8l-.4-2.5 2 .9-1.6 1.6-.7 3.5
                           M294.8 213.5l-1.6-.9 1.6-1.1 0 2 1.4 2.8M296.1 209.1l.4-2 1.3 1-1.7 1-1.3 2.4M295.8 203.3l-2.3-2.9 3.6-.3-1.3 3.2 .7 3.8M288.3 197.9l-3.6-.3 2.9-2.1 .7 2.4 5.2 2.5
                           M315.9 227.1l-1.1-.8 1.1-.5 0 1.3 4.1 7.7 0 .1-9.7 6.5M315 218.6l-3.6 .5 .9-3 2.7 2.5 4.6 1.4 .1 .3-3.8 5.5M306.5 216.8l-1.9-.8 1.7-1.3 .2 2.1 2.9 3.7 2-1.4
                           M311.2 213.4l-.6-.3 .6-.4 0 .7 1.1 2.7M312.3 210.2l-.3-2 2.1 1-1.8 1-1.1 2.5M321.5 209.4l.5 .6 .6-.9-1.1 .3-7.4-.2M300.2 198l1.7-.2-1.2-1.3-.5 1.5-3.1 2.1
                           M305.2 200.1l-1.1-1.4 2 .1-.9 1.3 .5 7.5-.1 .1 1.4 5.7 3.6-.3M320.3 198.8l.3 .2 .1-.4-.4 .2-7 .1-.9 .8-.5-1.3 1.4 .5M296.1 187.3l2.6 2.8 1.1-3.4-3.7 .6-2.8-1-.3 .2 0-.5 .3 .3
                           M292.5 185l-1-.9 1.1-.4-.1 1.3 .5 1M297.1 177.5l.3-2.2 1.7 1.2-2 1-4.5 6.2M295.8 170.2l-1.4-2 2.2 .5-.8 1.5 1.6 5.1M293.2 165.6l-1.2-2 2.3-.2-1.1 2.2 0 1.7 1.2 .9
                           M305.6 181.9l.9 0-.5-.7-.4 .7-5.8 4.8M321.5 192.4l-1.4-2.7 3.1 .3-1.7 2.4-.6 6.1-.2 .1M307.5 179.8l2.2 0-.8-1.8-1.4 1.8-1.4 .8-.1 .6
                           M314.6 184.1l-.9-2 2.1-.3-1.2 2.3-.3 1.6 .1 .3-3.3 11.8 .8 .6M319.1 172.9l1.8-2.3-3.5-.8 1.7 3.1 .2 4.2 1.4 1.6-2.4 .8 1-2.4M325.7 179.2l1.9-.8-.2 2.1-1.7-1.3-5-.5
                           M328.6 176.4l-.3-1.2 .9 .1-.6 1.1-.1 .8-.9 1.2M324.6 170.4l-.8-.3 .9-.4-.1 .7 3.7 4.8M310.8 171.8l-.9-1.6 2.4-.2-1.5 1.8-1.9 6.2M297.1 161.3l2.7-.3-1.6-2.2-1.1 2.5-2.8 2.1
                           M302.2 162.5l-.3-.5 .6-.1-.3 .6 .2 5.1-5.8 1.1M323.6 159.3l2.5 .1-1.1-2.1-1.4 2-5.3 2.6-2.5 3.5-1.7-3.9 4.2 .4M326.1 168.4l.9-1.8 .6 1.8-1.5 0-1.4 1.3
                           M307.7 158.4l2.5 .1-1.2-2.5-1.3 2.4-5.2 3.5M294.6 149.1l1.8 .4-.7-1.7-1.1 1.3-10 1.9-.8 1.2M296 145.3l-.7-1.8 1.8 .4-1.1 1.4-.3 2.5M290.2 130.7l.4-1.1 .7 .6-1.1 .5-1.4 1.3
                           M300.4 149.1l4.6 .4-2.3-3.9-2.3 3.5-3 1.3 .8 8.4M309 152.5l-.6-1 1-.1-.4 1.1 0 3.5M316.8 146.1l2.4 1.1 .2-1.6-2.6 .5-1.7-.2-5.7 5.5M325.3 154l-.9-2.1 2 .2-1.1 1.9-.3 3.3
                           M302.8 142.1l.6-.2-.4-.5-.2 .7-.3 .4 .2 3.1M313.4 143.6l-2.8-1.5 2.2-1.7 .6 3.2 1.7 2.3M320.6 133.1l2.1 1.1-.4-2.1-1.7 1-4.7-.7-1 .2 .6-.7 .4 .5
                           M321.9 144.3l1-1.2 .4 1.5-1.4-.3-2.5 1.3M324.4 136.7l-.2-.9 .9 .3-.7 .6-1.5 6.4M323.8 128.3l1.9-.7-2.1-1.9 .2 2.6-1.5 3.8M330 134.6l1.5-2.1 1.4 2.4-2.9-.3-4.9 1.5
                           M296.9 117.4l3.4 2 .2-3.1-3.6 1.1-2.5-.4-5.4 3.4 1.6 9.2M303.4 124.3l-.7-1.9 1.6 .2-.9 1.7-.6 6.1-11.5-.2M319.4 124.3l-2.2 1.8-.7-3.1 2.9 1.3 3.2-.2 1 1.6
                           M312.3 118.3l-.9-.4 .9-.4 0 .8 4.2 4.7M294.5 105.6l.5-.1-.3-.3-.2 .4-.2 .2 .1 11.2M303 113.8l.5-1.4 .8 1.3-1.3 .1-2.5 2.5M303.1 109.4l-1.8-2 2.9-.5-1.1 2.5 .4 3
                           M294.4 99.3l-2-3.3 3.2-.6-1.2 3.9 .3 5.9M291.1 90.1l1.9-2.6 1 2.8-2.9-.2-4 2.4 0 .3-5.1 8M294.7 80.2l-.4-1.9 1.8 .9-1.4 1-1.7 7.3
                           M320.9 112.9l2.7 1.7 .4-2.7-3.1 1-3.4-.4-1.6 .6 .1-1.6 1.5 1M312.1 103.8l-1.1-.9 1.2-.5-.1 1.4 3.9 7.7M321.8 97.8l4.5 1.2-1.8-4.1-2.7 2.9-5.8 .9-2.2 1.4-.2-2.2 2.4 .8
                           M326.7 109.6l1.1-1.9 .7 1.9-1.8 0-2.7 2.3M310.5 94.9l-.9-.3 .7-.5 .2 .8 3.1 3M315.6 83.4l.6-.3-.6-.5 0 .8-5.3 10.7M301.4 92.1l3.3 .4-1.5-2.6-1.8 2.2-4 .9-1.8 2.4
                           M298.8 79.4l2.2 .8-.2-1.7-2 .9-2.7-.2M303.7 83.2l-.7-1.5 1.6 .2-.9 1.3-.5 6.7M320.7 75.7l2.1-.3-1.5-2.3-.6 2.6-5.4 6.5 .3 .4M325.5 77.7l-.5-.9 1.1 .1-.6 .8-.1 7.7-.3 .2-.6 9.3
                           M310.4 80.4l-3 .2 .7-2.1 2.3 1.9 4.9 1.8M296 70l3-1.7-3.4-2.6 .4 4.3-2.5 7.3 .8 1M304.5 74.2l.9-2.6 .6 2.7-1.5-.1-3.7 4.3M291.7 48.1l3-.3-1.9-2.4-1.1 2.7-6 4.2 3.4 7.7
                           M299.8 57.3l.8-2.6 1.8 1.5-2.6 1.1-5.6 5.8 1.4 2.6M299.6 50.8l-1.1-1.3 1.9 .1-.8 1.2 1 3.9M292.2 41.6l-1.5-2 2.4 0-.9 2 .6 3.8M315.3 67.5l3 1.1-1-3-2 1.9-7.6 .8-1.5 .7 .6-1.6 .9 .9
                           M314.7 59.1l2.3 1-.5-2.4-1.8 1.4-5.7 .6-1.9 2-1-3.2 2.9 1.2M320.3 60.7l3.2 .7-1.3-3.2-1.9 2.5-2.3 .7-.7 4.2M326.4 66.4l0-2 2.6 1.2-2.6 .8-5.4 5 .3 1.7
                           M304.9 54l1.4-1.6-2.1-.5 .7 2.1-.6 2.3 1.8 2.2M317.3 55.2l-.2-1.3 1.1 .6-.9 .7-.8 2.5M315 50.8l-1.9-.7 1.6-1.6 .3 2.3 2.1 3.1M321.7 54.3l.6 .7 .5-1.3-1.1 .6-3.5 .2
                           M299.2 36.1l2 .2-.7-2.1-1.3 1.9-6.1 3.5M304.7 41.6l-.7-2.8 3.1 .9-2.4 1.9-3.2 7.6-1.1 .4M316.6 44.9l.9 .2-.2-.9-.7 .7-.6 .2-1.3 3.4M324 52.3l-.1-1.3 1.5 .4-1.4 .9-1.2 1.4
                           M289 25.5l3.1-1-1.9-2-1.2 3-4.3 4.3M300.9 31.6l-.5-1.7 1.5 .4-1 1.3-.4 2.6M296.7 25.6l-1.4-.8 1-.7 .4 1.5 3.7 4.3M295.7 20.6l.9 1.1 1-1.8-1.9 .7-5.7-.4 .2 2.3
                           M311 35.9l-.3-3 2.8 1.1-2.5 1.9-1.6 3.4 6.6 5.8M308.4 29.9l-2.2-.7 1.9-1.6 .3 2.3 2.3 3M317 33.3l2.1 .7-.8-2.1-1.3 1.4-3.5 .7M321.1 36.8l-.3-1.2 1.3 .5-1 .7-3.8 7.4
                           M313.1 24.1l3.6 .7-2.1-3.1-1.5 2.4-3 .6-.7 .6 0-1 .7 .4M300.5 17.5l2.4-.3-1-2-1.4 2.3-2.9 2.4M308.3 20.7l-1.5-1.7 2-.4-.5 2.1 1.1 3.6M310.3 17.1l.9-.3-.8-.5-.1 .8-1.5 1.5
                           M313.9 18l-1.1-.9 1.5-.5-.4 1.4 .7 3.7M309 14l-2.7-1.2 2.7-1.7 0 2.9 1.4 2.3M316.7 14.4l3-.9-2.5-1.8-.5 2.7-2.4 2.2M325 23.6l1.1-2.1 1.7 2.1-2.8 0-6.3 2.5-.4 5.8
                           M324.8 15.3l-1.5-1.4 2.2-.6-.7 2 1.3 6.2M297.5 6.6l1.5 1 0-1.7-1.5 .7-8.2-.8-1.5 1.4M327.6 11.6l.7-1.5 1 1.3-1.7 .2-2.1 1.7M327.8 5.7l-2.2-2.5 3.1-1-.9 3.5 .5 4.4
                           M324.7 392.6l2.3 .7-.6-3-1.7 2.3-6.1 3.2M330.5 399.8l0-.7 .8 .3-.8 .4-1.8 2.4M324.8 385.5l-.9-.6 .9-.3 0 .9 1.9 2.8-.3 2M330.7 385l-.1-1.8 2.7 .9-2.6 .9-4 3.3
                           M328.4 381.6l-1.1 .1 .3-1.3 .8 1.2 2.2 1.6M337.2 399.2l2.1-1.8 .9 3-3-1.2-5.9 .2M339.3-2.6l.9 3-3-1.2M340.7 390l-.8-2 2.1 .1-1.3 1.9-1.4 7.4
                           M356.6 395.2l1.5 .1-.4-1.1-1.1 1-1 .3-1 2.3 .8 2.7M354.6-2.2l.8 2.7-3-.1 2.2-2.6M352.4 400.4l2.2-2.6M361.7 4.8l1.7-.4-.6 2.3-1.1-1.9-6.3-4.3
                           M346.2 3l2.3-.4-.9 1.9-1.4-1.5-4.3-.7-1.7-1.9M339.3 380.5l3.2 .1-1.5-3.8-1.7 3.7-4.2 3.6-1.8 0M353.7 380.5l3 .3-1-3.2-2 2.9-7 4.6-.1 .4 9 10
                           M360.8 387l-.7-3.1 3.3 .9-2.6 2.2-3.1 7.2M341.1 373.7l.3-.4-.5 0 .2 .4-.1 3.1M355.3 373.6l-2.1-1.9 2.2-.8-.1 2.7 .8 1.8-.4 2.2M350.1 370.5l-2.2 0 .8-1.6 1.4 1.6 3.1 1.2
                           M359.7 363.3l1-.4-.8-.8-.2 1.2-4.3 7.6M365.1 376.7l3.2-1.6-.3 3.9-2.9-2.3-9-1.3M372.2 368l.1-.7 .4 .6-.5 .1-3.9 7.1M371.4 366l-1.6-.9 .7-.7 .9 1.6 .8 .8 .1 .5
                           M335.5 369.6l2.3 .8-1-2.2-1.3 1.4-6.1 .3M336.9 364.9l-1.4-1.8 2.6-.4-1.2 2.2-.1 3.3M351.7 357.8l-1.3-.1 .7-.9 .6 1 8 3.6 .2 .7M348.1 359.2l-.9 2.5-1.8-2 2.7-.5 1.6-1.2 .7-.3
                           M341.6 349.6l1.1 .8-.2-1.3-.9 .5-5.6-1.4-3.6 1 .7-3.5 2.9 2.5M332.9 340.7l-.1-3.7 3.1 1.5-3 2.2-1.1 2.2 1.3 2.8M335.6 329.9l.8-3.9 3 2.5-3.8 1.4-4.3 4.7 1.5 2.4
                           M335.1 322.4l-1.2-1 1.6-.4-.4 1.4 1.3 3.6M344 351.4l-.4-.3 .6 .1-.2 .2 5.7 6.6M359.3 347.9l2.6 1.7 .1-3.4-2.7 1.7-4 .2-2.4 1.1 .6-2.4 1.8 1.3
                           M363.2 356.7l.4-3 2.4 2.1-2.8 .9-3.5 4.7M340.7 337.8l3.1 1-1.4-3.1-1.7 2.1-4.8 .7M352.2 342.7l-2.7-2.1 3.8-1.1-1.1 3.2 1.3 4.1M345.9 325l.8-.5-.9-.2 .1 .7-3.7 4 .2 6.7
                           M355.9 337.6l.5-.9 .5 .6-1 .3-2.6 1.9M356.6 329l-.5-.8 1 0-.5 .8-.2 7.7M358 337.4l.6 .4 0-.7-.6 .3-1.1-.1M337.3 319.5l1.7 0-.9-1.7-.8 1.7-1.8 1.5
                           M361.2 332.2l-.4-1.9 2.3 .7-1.9 1.2-2.6 4.9M353.4 316l2.7-.8-2.4-2.3-.3 3.1-6 8.3 8.7 3.9M360.1 317.8l-.8-1.4 2-.1-1.2 1.5-2.3 10.2-.7 .2M337.9 315.5l-.8-1.3 1.2-.4-.4 1.7 .2 2.3
                           M332.8 306.3l0-.5 .3 .2-.3 .3-1.6 5.1-1.2 1M334.6 305.5l1-1.3 .9 1.6-1.9-.3-1.5 .5M335.9 287.4l-.1-1.5 1.6 .6-1.5 .9-1.8 2.9M340.2 310.8l-.6-2.9 3.7 .5-3.1 2.4-1.9 3
                           M352.3 310l-1.1-1.1 1.2-.4-.1 1.5 1.4 2.9M347.2 307.4l-1 0 .6-.7 .4 .7 4 1.5M347.6 300.8l1.8-2.3-3-.4 1.2 2.7-.8 5.9M355.2 304.2l-.1-2 2 .7-1.9 1.3-2.8 4.3
                           M342 296l1.7 .3-.6-1.5-1.1 1.2-6.2 1.7-.2 6.5M363 301.6l.3-.2-.2-.2-.1 .4-.1 .2 3.4 7.8 2.4 .9-2.4 2.2 0-3.1M370.9 309.5l.2-.4 .2 .4-.4 0-2.2 1
                           M371.1 302.8l-1.3-1.3 2.2-1-.9 2.3 0 6.3M344.1 290.3l1.9-1.6-2.8-1 .9 2.6-1 4.5M352 296.1l-.4-2.6 2.4 .9-2 1.7-.6 1.7 3.7 4.4M360.9 292.7l.7 .5 .2-1.1-.9 .6-6.9 1.7
                           M341.2 286.1l.4 .2-.1-.4-.3 .2-3.8 .4M335.6 271.9l1.9-.1-1.1-1.7-.8 1.8-4.8 3.2M345.2 276.9l-.3-.9 1.1 .1-.8 .8-3.7 9M355.2 281.2l3 1.7 .1-3.7-3.1 2-2.5 .3-4.7 7.1 3.6 4.9
                           M338.3 256.8l.4 .4 .2-.5-.6 .1-9.9-.3M338.3 266.3l1-3.3 2.1 1.6-3.1 1.7-2 2.5 .1 1.3M329.2 237l-.6-1.9 2.1 .2-1.5 1.7-2.3 7.4 .3 .3M326.5 233.6l-1.5-.2 1.3-.9 .2 1.1 2.1 1.5
                           M348.1 273.2l-.2-3 2.7 1-2.5 2-1.3 2.6 5.9 5.7M353.6 270.4l1.2 .4-.3-1.3-.9 .9-3 .8M359.7 276.7l0-.3 .3 .1-.3 .2-1.4 2.5M344.5 261.7l1.6-1.5-2.2-.4 .6 1.9-.8 2.5 4.2 6
                           M356.1 263.2l-.8-3.2 3.1 .6-2.3 2.6-1.6 6.3M358.7 253.8l1.5 1.2 .3-2.4-1.8 1.2-2.4 0-1.1 .8 .2-1.5 .9 .7M360.8 259.6l.2-.4 .3 .4-.5 0-2.4 1
                           M341 246.9l1.4-1.1-1.7-1.1 .3 2.2-1.7 9.5-.4 .3M354.6 247.7l-.3-.9 .7 .7-.4 .2 .8 5.4M332.6 234.4l.8 .2-.2-.9-.6 .7-1.9 .9M340.2 242.8l-.3-.9 .8 0-.5 .9-.2 .7-12.2 1.4
                           M357.5 239.6l3.1-1.1-2.5-1.8-.6 2.9-2.3 2.2-.8 1.5-.6-1.3 1.4-.2M366.1 248.6l.5-.9 .6 .9-1.1 0-4.9 2.6-.7 1.4M366.7 245l-.8-2.8 2.4 .9-1.6 1.9-.1 2.7
                           M363.3 238.8l-.3-.2 .4-.1-.1 .3 2.6 3.4M344.2 238.8l3.5-.4-1.7-3.3-1.8 3.7-3.5 3.1M328.1 229.9l2.4-.5-1.9-2.5-.5 3-1.8 2.6M333.5 232.1l-.5-1.1 1.3 .1-.8 1-.3 1.6
                           M327.7 223.8l-1.1-1.2 1.4-.4-.3 1.6 .9 3.1M334 214.7l0-.4 .3 .3-.3 .1-6 7.5M326.7 201.9l-.7-1.7 2.6-.1-1.9 1.8-3.2 6.7 10.4 5.4 .1 .3M340.7 228.1l3 .3-1.6-2.8-1.4 2.5-6.4 3
                           M346.4 231l-.4-.9 1 .2-.6 .7-.4 4.1M351.8 229.1l3.7 1.8 .3-4.7-4 2.9-4.8 1.2M350.1 213.7l2.1 1.4-.1-2.3-2 .9-1.5-.3-5.6 3.8-1.3 2.8-1.7-2.6 3-.2
                           M362.7 206.4l.5 .2 0-.6-.5 .4-7.4 2.1-1.8 1.5-.5-1.8 2.3 .3M360.3 223.2l3.7-1.8 .1 3-3.8-1.2-2.6 .2-1.9 2.8M368.5 216.5l.1-1.9 1.9 1.2-2 .7-4.5 4.9
                           M339.1 203.5l.4 0 0-.4-.4 .4-.3 .1-4.9 10.4M348.3 211.3l-1.6-2.8 2.8-.1-1.2 2.9 .3 2.1M337 190.9l2 1.7 .9-3.1-2.9 1.4-3.7-.1-1.5 1.2-.5-2.1 2 .9
                           M340.1 202.3l.2-1.1 .7 .6-.9 .5-.6 .8M358.3 195.7l1.4 .9 .3-1.7-1.7 .8-3.3 0-2.4 1.4 .3-2.8 2.1 1.4M350.7 200.3l-.4 2.7-1.8-1.4 2.2-1.3 1.9-3.2
                           M329.7 188.2l-1.2-.3 .7-1 .5 1.3 1.6 1.7M329.4 185.3l-.2-1.2 .7 .1-.5 1.1-.2 1.6M330.8 173.7l.1-1.6 1.9 1-2 .6-1.6 1.6M341.5 187.6l.4 0-.2-.4-.2 .4-1.6 1.9
                           M352.1 191.9l-.6-.6 .7-.3-.1 .9 .8 2.4M341.8 185.5l1.2-1.5-1.8-.6 .6 2.1-.1 1.7M354.1 183l-3.6-1 2-2.8 1.6 3.8 1.8 1.9 .4 .1 4.6 8.9-.9 1
                           M339.5 181.3l.6 .5-.1-.8-.5 .3-5.2-1.5-.2 .1-4.2 4.3M356.6 168.5l2.2 .9-.2-1.9-2 1-1.6 0-1.6 1.8-1.2 3.4-2.1-1.9 3.3-1.5M361.6 182.7l2.2-2.4 1 2.5-3.2-.1-5.3 2.3
                           M365.2 176.6l-.6-2.2 2.5 .9-1.9 1.3-1.4 3.7M339.6 171l1.4 .2-.6-1.3-.8 1.1-5.4 2.4 .1 6.4M329.3 159.4l3-.4-1.8-2-1.2 2.4-1.7 .9-.6 6.3M340.4 163.8l-2.3-3.1 4.2-.7-1.9 3.8 0 6.1
                           M360.4 157.4l2 .1-1.1-2-.9 1.9-4.8 3.3-1.6 4.4-3.4-4 5-.4M364.1 159.6l-.1-.7 .9 .4-.8 .3-5.5 7.9M328.5 150.8l.7-.1-.6-.3-.1 .4-2.1 1.3
                           M333.9 148.1l1.7-3.3 2.3 2.5-4 .8-4.2 2.6 .8 6.3M336.7 128.1l.5-.7 .4 .7-.9 0-5.2 2.1 0 2.3M338.3 120.7l-.7-3.5 2.8 2-2.1 1.5-1.1 6.7M334.2 113.6l-.6-.2 .5-.2 .1 .4 2.1 1.5 1.3 2.1
                           M342.9 148.1l1.2 .6-.4-1.3-.8 .7-5-.8M356.8 147.1l2.2 .4-1.3-1.8-.9 1.4-12 2.3-.2 8.8-2.3 1.8M350 134.8l3.1 0-1.5-2.4-1.6 2.4-3.4 1.5-1.4 1.8-.9-1.9 2.3 .1
                           M337.3 134.4l3.1 0-1.8-2.5-1.3 2.5-2.6 1.4 .9 9M360.5 131.3l1.4-.3-1.2-.8-.2 1.1-5.4 4.3 2.6 10.1M366.6 145.5l1.5-1.8 1 1.5-2.5 .3-6.3 2.8 1 7.2
                           M342.6 125.1l3.6-.6-2.7-2.5-.9 3.1-4.4 3.4 .4 3.4M351.9 127.2l-.2-.8 .7 .4-.5 .4-.3 5.2M357.6 127.1l1.8 1.1-.5-2.1-1.3 1-5.2-.3
                           M357.7 120.7l1.5 1.9 1.4-2.7-2.9 .8-2.8-.5-.8 .5-.1-1.1 .9 .6M346.3 114.9l2.6-1.2-3-1 .4 2.2-3.6 4.8 .8 2.3M339.1 106.3l0-.6 .7 .3-.7 .3-5 6.9
                           M333.8 101.3l-3-.8 2.5-1.7 .5 2.5 5.3 4.4M337 91.7l-.5-3.5 3.6 1.5-3.1 2-3.7 7.1M334.5 85.9l-.6-.3 .5-.3 .1 .6 2 2.3M336.7 78.8l-.2-.6 .8 .1-.6 .5-2.3 6.5
                           M333.5 76.2l-3.9-.5 2.3-2.8 1.6 3.3 3 2M341.6 110.8l1.7 0-1.4-1.6-.3 1.6-5.3 4.3M359.6 109l3.4 2-.6-3.8-2.8 1.8-3.1-.4-.6 .2 .2-.5 .4 .3M363.4 117.7l1.1-1.9 .7 1.9-1.8 0-2.8 2.2
                           M349.6 97.2l1-.1-.7-.9-.3 1-9.3 8.9 1.6 3.1M355.2 101.9l-1.8-2.9 3.3 .9-1.5 2 .9 6.4M363.3 98.5l.1 1.7-1.9-.7 1.8-1 3.7-5.6 2.9 5.3-1 2.2 3.8 .7-2.8-2.9
                           M345.1 87.1l2.7-.4-1.9-2.6-.8 3-2.3 2.5 6.9 5.8 1.2-5.9-.5-1.2 1.4 0-.9 1.2M360.7 85l2.4 1.7-.2-2.8-2.2 1.1-1.9-.5-7 3.8M358.6 78.2l-.4-.6 .7 0-.3 .6 .2 6.3
                           M354.8 75.7l-3.2-.5 2.4-2 .8 2.5 3.4 1.9M340.1 73.9l1.8-1.4-1.9-.8 .1 2.2-2.2 4.2-.6 .2M345.2 72.2l-1.1-.2 .7-.8 .4 1 4.4 3.6 2-.6M332.6 67.4l.6-.4-.8-.5 .2 .9-.7 5.5
                           M338.6 69.1l-1.7-1.2 2.1-.5-.4 1.7 1.4 2.6M330.5 51.5l-2.4-.7 2.1-1.4 .3 2.1 6.7 6.2-5.2 8.2 .4 .6M333.9 44l-.1-.8 .9 .3-.8 .5-3.7 5.4M327.8 36.9l-2.8-1 2.7-1.4 .1 2.4 6 6.3
                           M341.9 65.3l2.4-.2-1.4-2.1-1 2.3-2.9 2.1M357.8 70.2l1.5 .4-.5-1.6-1 1.2-2.9 .7-.9 2.3M349 65.5l-1.9-.2 1.2-1.7 .7 1.9 5.9 5.4M352.3 47.6l1.2 .7 .2-1-1.4 .3-1.2-.2-.4 .1 .2-.4 .2 .3
                           M345.9 50l-.6 1-.8-.7 1.4-.3 4.8-2.5M346.5 58.6l1.1 1.8-2-.3 .9-1.5-1.2-7.6M357.4 59l1-1.2 .4 1.7-1.4-.5-8.6 2.3-1.2-.9M368.2 39.4l.3 .1-.1-.4-.2 .3-11 1.4-2 2-1.1-2.9 3.1 .9
                           M359.3 49.9l5 .6-4.1 3.2-.9-3.8-4.7-3.1 .6-4M342.1 33.8l3.2 .4-.6-2.6-2.6 2.2-2.5 1-.6 .5-.2-.6 .8 .1M330 31.6l2.2-.4-1.6-2-.6 2.4-2.3 2.9
                           M333.8 20.4l1-3.1 2.1 1.7-3.1 1.4-4.3 3.9 1.1 4.9M334.2 14.3l-.8-1.1 1.4 .1-.6 1 .6 3M346.4 28.4l.4-.2-.2-.4-.2 .6-1.7 3.2M353.3 33l-1.8-3 3.5-.9-1.7 3.9-.8 5.5-.1 .1-1.5 8.5
                           M351.1 24.5l3 .1-2.4-2.7-.6 2.6-4.5 3 0 .3M356.9 26.8l0-.4 .4 .1-.4 .3-1.9 2.3M339.6 18.8l.7 .2-.2-.7-.5 .5-2.7 .2M346 25.5l-1.7-2.8 2.5 .1-.8 2.7 .6 2
                           M340.7 16.6l1.4-1.2-1.8-.6 .4 1.8-.6 1.7M350.7 16.1l-.6-1.3 1.4 .3-.8 1-.1 3.7-3.8 3M358.8 13.5l3 .8-.4-2.8-2.6 2-7.3 1.6M358.7 26.2l1.4-.9 .1 1.3-1.5-.4-1.4 .3
                           M364.7 17.7l-.1-.8 .9 .2-.8 .6-4.6 7.6M337.2 12.6l1.5 .4-.3-1.4-1.2 1-2.4 .7M372.2 384.1l2.4 .9-.3-2-2.1 1.1-1.7 0-3.5 15.6 4.5 1.3 4.2-1.5 0 4.7
                           M371.5 1l4.2-1.5 0 4.7-4.2-3.2-4.5-1.3M380.5 392l-.5-2.6 3.2 1.2-2.7 1.4-4.8 7.5M370 383.8l-.8-.1 .3-.5 .5 .6 .5 .3M368.8 356.9l-.3-.4 .5-.1-.2 .5 1.7 7.5
                           M388.9 399.8l.7-3 2.1 2.5-2.8 .5-7.9 8.6M388.8 393.8l-.8-1.1 1.3 .2-.5 .9 .8 3M394.2 .6l1.1 .1-.7 .8-.4-.9-2.5-1.3M381.8 373.2l2.1 .2-.8-1.5-1.3 1.3-1.4 .2-6.1 9.6
                           M387 375.1l-1-.9 1.2-.4-.2 1.3 3.6 7.3-5.2 8.3 2.6 2M2 372.8l-.4 1.1-.6-1 1-.1 5.6-4.9M385.2 364.1l.3-.1-.3-.3 0 .4-2.1 7.8M392.1 368.1l.2-.9 .6 .8-.8 .1-4.9 5.7
                           M378.6 362.5l4-.3-2.4-3.3-1.6 3.6-6.4 4.3M394.1 362.5l-1.5 2.3-.9-2.4 2.4 .1 7.2-5.4-4-6.9M389.6 360.7l-1.1 0 .5-1.2 .6 1.2 2.1 1.7M375 352.3l2.7-.2-1.4-2.2-1.3 2.4-6 4.1
                           M376.3 347.5l-.2-.7 .6 .2-.4 .5 0 2.4M373.4 344l-4.6-1.3 3.6-3.3 1 4.6 2.7 2.8M373.8 335.2l-.2-1.5 1.3 .8-1.1 .7-1.4 4.2M372.1 331.5l-2.2-1 1.9-1.4 .3 2.4 1.5 2.2
                           M374.4 322.6l-.3-1 1.1 .2-.8 .8-2.6 6.5M380.4 352.1l1.7-.3-1-1.2-.7 1.5-.9 .7 .7 6.1M388.9 355.8l-2.4-3 3.9-1.1-1.5 4.1 .1 3.7M393 349.1l.5-.3-.5-.3 0 .6-2.6 2.6
                           M382.5 344.1l2.1-1.1-1.7-1-.4 2.1-1.4 1.7-.3 1-.5-.5 .8-.5M389.1 343.4l-1.7-.7 1.4-1.1 .3 1.8 3.9 5.1M392.3 335.1l-1.7 1.6-.5-2 2.2 .4 5.6-1.5 1.8 1
                           M383.3 331.9l2.7-.1-1.5-2.8-1.2 2.9-2.5 2.2-.4 1.5-1.3-.9 1.7-.6M384.4 326.3l-.3-.6 .6 0-.3 .6 .1 2.7M390.4 320.3l.3 0-.2-.4-.1 .4-5.7 5.4
                           M382.7 311.8l1.8 .5-.2-2-1.6 1.5-3 1.2-1.9 2-.9-2.2 2.8 .2M373.9 298.4l.3-1.8 1.5 .8-1.8 1-1.9 2.1M372 290.9l-1.3-.7 1.6-.8-.3 1.5 2.2 5.7
                           M372.1 280.1l-1.7-2.8 3.1 .4-1.4 2.4 1 8.5-.8 .8M367.9 275.4l-1.3-.3 .9-.9 .4 1.2 2.5 1.9M382.7 301.1l1.2-2.3-3.3-.3 2.1 2.6 2.1 7.9-.5 1.3
                           M391.6 297.7l-1.8-.8 1.7-1.5 .1 2.3 3.5 6.6M377.4 297l.5 .1-.3-.4-.2 .3-1.7 .4M383.3 283.8l3-.6-2.3-2.1-.7 2.7-5.9 4.7-.9 2.3-1.7-1.8 2.6-.5
                           M378 276.1l2.9 .4-1.1-2.6-1.8 2.2-4.5 1.6M395.9 279.1l-3.7 1.3 .7-3.5 3 2.2 3.9 .6 1.1-.9M390.8 272.2l-1-.6 1.2-.5-.2 1.1 2.1 4.7M388.5 271.6l-.6 .2-.1-.4 .7 .2 1.3 0
                           M369.9 264.9l1-.6-1.1-.7 .1 1.3-2.4 9.3M380.2 271.5l-.1-.5 .4 .1-.3 .4-.4 2.4M377.9 266.7l-1.8-1.3 2.1-.6-.3 1.9 2.2 4.3M372.7 256.8l-.2-2.3 2.2 .8-2 1.5-3.3 6 .4 .8
                           M372.3 246.3l1.3-2.5 1.6 2.5-2.9 0-4.4 2.5 4.6 5.7M385.8 270.2l-2.7-.1 .7-2 2 2.1 2 1.2M380.3 263l1.1 .2-.2-1.7-.9 1.5-2.1 1.8M381.6 259.7l-.4-.9 1 .1-.6 .8-.4 1.8
                           M382.1 242.8l1.4 .1-.4-1-1 .9-.9 .2-4.1 4.3-.8 7.6-1.6 .4M388.5 246.7l-2.2-2.5 3.3 0-1.1 2.5 2.7 7.2M386.5 233l.9-.4-.8-1.1-.1 1.5-3.4 8.9
                           M394 237.4l-1.1-1.7 1.8-.2-.7 1.9 .8 4.4-5.2 2.4M370.5 234.6l-1.6-.4 1.4-2.1 .2 2.5 3 6.9 7.7 1.5M372.6 228.9l1.1-2.7 2 1.8-3.1 .9-1.8 1.2-.5 2
                           M369.6 200.5l0-1.2 1.7 .4-1.7 .8-6.3 5.1-.1 .4M364.2 194.3l-1.9-.6 1.8-1.1 .1 1.7 5.4 5M382.4 228.2l2.7 1.1-1-2.6-1.7 1.5-6.7-.2M375.7 214.2l3.2-.1-1.2-2.5-2 2.6-3.8 1.8 1.8 10.2
                           M385 219l-1.7-3 3.7-.1-2 3.1-.9 7.7M393.9 214.5l2.1 1.6 .4-2.3-2.5 .7-2.4-.6-1 .1 .3-.8 .7 .7M380.9 203.8l2.3-.4-1.6-1.5-.7 1.9-1.5 1.1-.3 .4-.2-.4 .5 0
                           M388.6 206.2l-2.1-1.9 2.8-.7-.7 2.6 2.2 7M379.7 198.4l1.1 1 .3-1.7-1.4 .7-4.4-.6-1.9 .7 .6-2.1 1.3 1.4M396.3 198.7l-3.1 1.3 .5-2.8 2.6 1.5 2.8 0
                           M384.9 191.9l3-1.4-3.1-1.8 .1 3.2-3.8 5.8M368.2 187.4l1.4-.4-1.2-1.2-.2 1.6-4.1 5.2M373.1 189.9l-1.2-1.7 2.1 0-.9 1.7 .9 6.5M369.9 177.6l-.3-1.6 1.4 .7-1.1 .9-1.9 7.1 .4 1.1
                           M371.8 171.6l.6-4.3 3.4 2.8-4 1.5-2.8 3.6 .6 .8M369.8 161.2l-2.3-1.7 3-.8-.7 2.5 2.6 6.1M381.5 184.9l.8 .2-.3-.9-.5 .7-7.5 3.3M379.6 177.6l-1.1-.8 1.2-.7-.1 1.5 2.5 6-.1 .6
                           M395.6 172.6l2.9 1.1-.5-3-2.4 1.9-2.5 .5-.6 .3 0-.5 .6 .2M373.5 156.4l2.3-.2-1-2-1.3 2.2-3 2.3M384.7 165.4l1-2.1 .7 2.2-1.7-.1-5.7 5.4-3.2-.7
                           M391.4 158.3l-3 .8 1.2-3 1.8 2.2 8.1 2.1M375.5 150.6l-.9-2.9 2.9 .8-2 2.1-.7 3.6M373.3 139l-1.5-2.3 3.1-.1-1.6 2.4-.3 7.2 1.6 1.5M371.2 127.8l-.5-.3 .9-.7-.4 1-1.2 8.1 1.8 .8
                           M372.2 124.7l-.8-2.1 1.9-.1-1.1 2.2-.2 1.6-.4 .5M396.9 147.8l-4.2 2.1 .2-3.9 4 1.8 3.4-.2M385.8 138.1l.5-.4-.6-.1 .1 .5-6 9.8-2.3 .6M380.4 134.1l.9 .1-.4-.8-.5 .7-5.5 2.5
                           M389.9 135.1l-2.2 1.1 .5-2.5 1.7 1.4 11.5-.1M386.1 128.7l.7-.2-.5-.4-.2 .6-5.1 4.1-.1 .6M391.5 125.7l-2.9 1.3 .7-3 2.2 1.7 7.4 .1M375.5 120.4l2-.7-1.2-1.3-.8 2-2.2 2.1
                           M383.6 122l-2.4-1.8 3.1-.9-.7 2.7 2.7 6.1M391.7 114.3l-2.8 1.8-.3-2.8 3.1 1 7.4-1.1M376.1 115.1l-1.3-2.4 2.6 .3-1.3 2.1 .2 3.3M373.2 111.3l-.4-.1 .2-.3 .2 .4 1.6 1.4
                           M363.8 81.7l-.2-.6 .7 .2-.5 .4-.9 2.2M383 110.6l.7 .3 .1-1-.8 .7-5.6 2.4M384.8 109.5l-.4-.2 .4-.1 0 .3 3.8 3.8M394.5 94.2l-.8 2.6-2-2.5 2.8-.1 3.4-2.4
                           M375.3 102.3l.6 .2 0-.5-.6 .3-.5 0-1.8 8.6M384.1 91.3l2-.4-1.5-2-.5 2.4-8.2 10.7M394.5 83.9l-1.1-.9 1.4 0-.3 .9 4.2 6.4M379.8 84.7l2.8 1.3-.8-2.6-2 1.3-2.9-.4-1.2 .4 .1-1 1.1 .6
                           M373.4 80.8l-3.7-1.2 2.7-2.9 1 4.1 2.4 2.9M384.3 74.3l1.5-1.5-2.3-.2 .8 1.7-2.5 9.1M391.5 77.2l-2.1-3.3 3.8 .8-1.7 2.5 1.1 5.4 .8 .4
                           M369.7 69.9l2.3 1-.6-2.6-1.7 1.6-9.6 1.5-.7 6-.5 .2M372.1 65.3l-.3-1.8 1.4 1.1-1.1 .7-.7 3M371 62l-.6-.3 .5-.3 .1 .6 .8 1.5M372.5 55.8l-.5-2 2.1 .7-1.6 1.3-1.6 5.6
                           M377 70.8l3.2 .1-1.8-2.5-1.4 2.4-3.8 1.5-.8 4.4M382.9 61.1l1.3 0-.7-1.3-.6 1.3-4.7 4.4-.2 .4-.3-.3 .5-.1M388.2 67.3l-1.3-3.7 3.8 .8-2.5 2.9-1 5.1 2.2 1.5
                           M382.1 49.7l2.7-.8-2-2.4-.7 3.2-2.1 3.1 .1 2-2.1-.8 2-1.2M390.2 51.3l-.1-.4 .7 .1-.6 .3-6.8 7.5-3.3-4M375.1 38.9l4.1 .8-1.6-3.3-2.5 2.5-6.4 .8-1.2 9.8-3.2 1
                           M385.7 38.5l-2.7 1.2 .9-2.8 1.8 1.6 4.8-.1M373.3 32l3 .2-.8-2.9-2.2 2.7-3.3 1.9-1.2 1.9-.8-2.1 2 .2M376.7 26.3l-.3-1.3 1.4 .4-1.1 .9-1.2 3
                           M366.9 14.6l-.7-3.3 3.3 .4-2.6 2.9-.9 2.3 10.4 8.1M379.7 32.9l2.4 .4-1.3-2.2-1.1 1.8-1.6 .6-.5 2.9M380.9 23.8l2.1-.7-1.2-1.3-.9 2-1 1 .9 6.3M1.3 13.5l1.2 .3-.1-.9-1.1 .6-2.8 .1
                           M398.5 13.6l-2.3 1.6-.4-2.7 2.7 1.1 2.8-.1M393.7 10.1l-1.5-.7 1.1-.9 .4 1.6 2.1 2.4M10.1 385.7l6 .6M5.6 394.5l-5.9 2.9M405.6 394.5l-5.9 2.9M7.1 383.8l-1.1-2.2-2.4-1.2
                           M14.9 378.1l-2-1.4-6.9 4.9M11.4 371.3l-3.1-3.1M17.8 2l2.4 .5 8.6-9.3M19.6 387.1l9.2 4.4M37.1 398.1l.2 4.2M46.3 7.5l4.6-6.7 0-.3-6.8-5.4M23.8 378.2l9.2 2.6M18.2 379.1l3.5-.1
                           M50.9 .5l3.8-2.5M46.6 386.9l7.2 1.7M24.9 370.7l9.8 1.1M35.3 371.5l10.5 3.1M12.9 376.7l-.1-2.3M23.7 370l-.5-.7M17 363.1l4.1 1.1M38.6 359.9l9.4 .7M28.2 357.1l1 0
                           M14.2 354l-.9-.3-7.2 3.7M2.1 334l2.1-2.7M2.7 341.9l-5.2 6.2M-2.7 350.2l4 6.9 1.8 .5M13.3 353.7l-2-9.1M4 329.5l-2.4-2.3M15.2 317.5l-.4-.3-8-2.7-1.1 .5M26.7 356.6l-3-2.9
                           M37.4 359l-2.5-5.4M34.7 350.1l-6.4-5.7-1.1 .2M25.5 344.2l-5.7-4.7M41.6 327.9l2.2 1.9M28.3 344.4l3.4-6M30 332l-5.3-.5M41.9 340l.4 3.3M18.4 327.5l2.9 1M28.6 321.6l.1-.4-2.5-5.9
                           M45.9 317.9l4.6 4.1M30.8 328.9l-2.2-6.6M6.8 314.5l.9-1.5M14.8 317.2l-.3-3.1M4.6 300.8l6.5-4.3M2.8 300.8l-6.8 3.7M3.8 315.1l-4.2-1.6M403.8 315.1l-4.2-1.6
                           M3.5 301l-.7-.2-3.7-8.6 1-1.2M399.8 279.7l1 9M2.9 278.4l7 2.1M20.6 308.9l5.7 5.9M28.7 321.2l11.2 1.5M38 307.5l6.9 7M22.8 291.2l3.4 5.2M27.5 296.9l.9-.1M22.7 289.9l.3-.8 3.7 .8
                           M36.5 286l-2.2 .1-2.7 2.4M43.3 296.7l.8-5.8-.8-1.3M10.7 292.5l1.1 2.2M23 289.1l-1.9-5.6-1.5-.5M17.6 281.8l-3.3-3M34.3 286.1l-4.4-8.6M30.7 275.6l.5-.2M21.1 283.5l8.5-6.1
                           M4.6 269.7l7.1 .8M397.9 266.8l4.3 .4M-1.6 251.3l3.5 .9M398.4 251.3l3.5 .9M2.8 268.6l-.6-1.4M7.4 262l7.3 0M1.8 237.4l4.2 .3M30.1 275.5l-8-8.7M38.8 268.9l1 .3
                           M21.4 264.5l.4-1.7 9.5-3.7 2 .6M21.8 262.8l-.2-.2M41 259l2.3 2.2M31.3 259.1l-3.3-3.9M30.4 234.1l1.8-.3M26.6 252.3l-.3-2-5.5-3.2M10.7 249.3l1.2 .4M19.2 244.4l-.1-4-1.3-1.1
                           M26.3 250.3l8-7.2 8.1 5.3M34.3 243l0 .1M28.3 237l-9.2 3.4M12.8 227.4l2.1 1.6M399.4 236.5l-2.8-2.1M1.4 222l4.6 .3M13.6 217.9l-1.7-1-3.2 4.1M1.8 195.6l6.4-3.2M18.3 229.8l4.4-.8
                           M36 224.3l4.2 1.7M35.9 224.3l-8-1.4M26.1 221.6l-1.9-3M24.1 216.4l1.5-3.4M35 209.4l1.3 .4M22.5 203.5l4.5-3.3M41.8 207.1l6.5 .5M11.9 216.9l-1.9-5.9M22.1 203.6l-.2-.2
                           M18.2 196.2l2.1 .7M39.6 205.2l-1.5-6M22.3 196.8l1.6-.8M17.7 195.2l.9-5.2-1.4-1.4M395.2 185.6l-.3 1 5 8.4M9.6 190.1l-6.9-8.9M2.3 179.5l.3-1.1 8.7-3.4M4.3 154.4l9.2 .6
                           M18.6 190l4.2 .2M25.8 189l1.4-1.6M27.5 180.7l2.4-1.5M25.4 180.8l-2.8-1.7M35.8 178.7l-2-7.1M37.2 165.9l5.7 2.1M30.7 177.4l-1-6.5-1.8-.4M31.7 170.4l-2 .5M25.5 168.8l-1.4-1.9
                           M13 165.2l1.4 2.1M17 154.5l7.7 5.4M45.9 160.8l2.1 1.9M27.2 160.1l1.6-.7M4.9 143.5l4.2-1M2.7 142l-.7-6.4M4.2 133l.8 0M10.8 135.9l6.3-.6M3.4 132.5l-2.6-5.5M5.9 121l3.1 2.8
                           M31.4 148.4l0 0M45 157.9l.8-3.1-.8-2M20.2 137.6l3.5 7.5M20.3 137.3l5.9-2.8M37.1 131.2l4.9 2.6M28.9 127.7l3-1.1M41.1 127.2l3.7 4.4M26.6 126.9l-1.1-1.6-6-1.1M11.4 124.7l6.7 0
                           M32.5 125.4l-1.6-4.2M37.2 118.4l3.4 2.1M25.5 125.3l5.1-4.2M15.8 109.3l4.5 3.6M3.9 115.3l-1.7-1.3M2.1 99.6l7 .5M0.3 88.7l-1.6 1.6M1.1 98.8l-2.5-6.8M401.1 98.8l-2.5-6.8
                           M8.8 85.4l8.3 7.3M401 85.6l-1-3.4M8.3 84.4l0-.8-6.6-4.7M31 119.1l-7.1-6.3-1.5 .5M35.9 115.7l.9-8.2M23.9 112.8l1.4-3.1M25 106.7l-2-2.7M22.6 102.3l.4-2.8M36.1 95.5l1 1
                           M25.8 82.6l3.5 .3M47.5 94.7l0 0-6.2-6.6M17.5 92.8l.3 0M13 71.3l3.7 .4M31 81.2l-.1-3.3M41.2 71.1l3.1 1.6M24.8 70.1l2.8 5.5M1.5 78.3l0-.4 8.1-.2M8.3 83.6l1.8-5.6M1.5 77.9l-1.7-3.1
                           M401.5 77.9l-1.7-3.1M3.3 67l5.7-.2M0.3 65.8l-2.4-2.8M400.3 65.8l-2.4-2.8M6.7 50.7l1 .1M7.5 40.4l2.9 1.5M24.5 81.5l-.4-1.2M30 76.6l-1.7-.4M39 66.3l-10.8-5.3-.5 .1M18.1 69.3l-5.8-3.7
                           M38.5 47.7l2.4 3.4M28.2 61l2.6-7.1-5.2-1.6M31.5 53.5l-.7 .4M40.2 54.8l1.9 4.9M15.7 55.2l6.7-.9M19.6 41.6l3.7 2.6M48 47.6l-1-4.5-1.9-.9M25.3 44.4l3.3-1.4M5 27.7l-.4 .4 .8 9.1
                           M17 26.7l2.6 3.7M4.6 28.1l-8.5-.5M1.8 42.3l-6-.2M401.8 42.3l-6-.2M14 17.1l-5.4-2.4-1.5 .8M399 398.3l-.3 .8 6.8 9.5M-1.3 399.1l6.8 9.5M398.7-.9l6.8 9.5M6.4 9.1l.7 .2 7.2-6.4
                           M21.7 31l1.5-.5M31.9 36.4l7.2-4.1M24.8 26.1l5-3.8M17.5 24.7l5.1 1.8M44 18.3l-12.7 .8-.3 1.4M44.6 25.4l-.3-6.8-.3-.3 2.4-10.1M29.6 14.8l-.1-4.6-2.7-.5M54.2 7.6l1.3-1.7-4.6-5.1
                           M19 16.8l4.8-3.2M31.3 19.1l-.9-1.6M8.6 14.7l-1.5-5.4M20.2 2.5l3.5 5.3M36.1 5.1l-6.6 5.1M29.7 393.1l6.3 3.4M57.4 387.6l2.4 1.7M44.8 385.3l-.5-1.5M59.8 376l4.1-.7M48.9 360.4l.5-.4
                           M56 398l2.2 4.8M69.9 391.3l2.7 2.9M78.1 3.9l3.2-4.5M74.4 394l6.6 4.1M71.4 386.1l2-.1M48.1 377.5l9.5 .2M70.8 377.8l2.5-.7M70.4 367.9l.9 .2M83.3 375.3l3.3 5.9M58.4 375.3l-4.4-8.2
                           M65.2 360.6l2 1.5M75.4 362.8l7 2.6M68.7 362.5l5.7-.9M55.3 347.2l7.9 3.7M43.8 345.4l7 3.1M44.7 336.1l8.5 3.9M63.9 325.4l2.8 2.3M66.4 350.7l3.1-1.9M82.5 354.1l2.6 1.2
                           M80.9 344.9l1.6 2.6M55 339.7l4.5-4.3M67 336.6l1.3 .9M75.3 337l5.1 4.5M73.3 328.6l-2-1.1-1.8 .7M82.8 324.9l7.6 4.4M51.6 325.8l5.1 3M63.6 324.6l.1-.6-2.4-3.8M71.3 327.5l-.7-2.3
                           M80.9 322.3l-.5-2.6M63.7 324l4.4-.5M55.5 305.5l1.2 .3M44.9 298.8l4.1 .5M44.1 290.9l5.8 .3M43 287.4l1.4-5-1.4-.7M61.5 312.8l6.1-1.2M69.5 310.3l1.3-1.9M71.1 307.2l-.7-4.2
                           M77.5 298.6l3.9 3.4M68.5 300.5l-2.7-1.1M84.6 303.2l2.8 0M64.7 285.9l5.5-1.3M86.3 286.9l6.2 5M52.5 290.2l1.3-1.3M44.4 282.4l4.8-1.2M72.9 282.2l2.2-6M80.6 275.8l5.2 5.8
                           M63.2 285.3l-3.2-6M74.9 275l-7.6-8.2M41.8 270.5l5-.6M45.5 262.3l3.7 .8M49.6 248.7l1.5 1M45.5 234.1l3.1 1.1M56.4 277.1l-3 0M85.5 269l4.4 1.6M76.2 260.6l7.2 2.1M67 265.8l-.4-.9
                           M73.9 248.6l-.2 10.1 .9 .9M79.2 244.5l9.4 7.2M73.7 258.7l-6 2.5M87.8 237.4l2.2 .7M51.8 249.9l10.5-1.8M66.5 263.5l.5-1.5M50 235.1l1.7-.9M63.5 245.2l-1.2-7.4M52.3 233l-.1-8.6
                           M61.8 220l1.6 .6M42.4 225.4l2.1-2.6M44.5 221.3l.2 .6M50.9 218.2l2 3.6M38.9 196.8l3.2-1.3M69.1 231.9l1.8 .1M77.8 227.6l8.2 3M70.9 218l5.5 5.1M59.9 218.2l-1.5-3.9M85.4 220.2l3.1 5
                           M58.4 212.8l.3-1 8.6-1.9M84.9 216.3l.7-2.4-2.8-3.6M58.7 211.8l-2.6-4.1M55.2 198.5l.7 .7M68.3 208.6l0-7.4M81.7 206.4l.4-5.5M57.3 199.8l10.7 .6M43.3 193.8l.2-3.5M50.1 186.1l3.9 1.5
                           M37.8 187.8l4.8 1.2M46.1 178.8l1.8 5M45.8 154.8l4.1 1.5M63.1 185.3l7.3 3.7M71.1 190.1l9.3 4.6M63.5 178.8l6.9-2.9M46.6 176.7l4.7-3.4M62.1 178.4l-2.6-4.5M84.4 181.7l.9-4-.3-1
                           M71.1 175l-.2-.3-10.1-4.8M70.9 174.7l2.8-13.8M81.2 160l5.1 9.8M47.7 166.6l3.8 4.9M57.4 161.2l2.3 2.3M62 163.8l10.4-5.4M56.6 159.2l-.1-3.8M59.8 151.1l11.6 5.1M51.2 156.3l4.4-1.5
                           M48.5 144.4l2.7-.6M43.3 140.4l2.9 3.3M45.3 131.8l2.8-.5M47.8 119.4l5 3.6M81.2 157.9l.7-1.3-6-3.1M64.1 141.9l8.4 2.9M62.8 140.6l-.4-1.3M68.8 130.9l4.7-.8M53.9 133.6l1.9-5.9
                           M65.8 129.9l-3.8-3.8M82.1 129l4.4 4.6M54 125.9l1.6 1.1M61 123.5l0-1.9-.7-.6M74.1 129.6l-.3-7.4M81.4 126.8l.9-6.7M61 121.6l9.1-4.2M57.3 109.3l2.3 2.6M44.2 106.3l1.9-9.9
                           M47.5 94.7l9.4 7.2M48.4 77.2l3.9-.1M61.3 112.6l7.5-.1M70.1 111.8l.5-.8M78.7 107.7l-6.9-5.4-.4 .1M70.7 102.4l-4.7-2.4M77.1 85.9l7.7 2.1M71.8 102.3l3.9-4.6M65 89.5l.7-.5
                           M80.8 97.9l1.5 4M58.7 88.5l5 1.2M66.4 74.9l-.8-.5-5.9-.4M86 78.4l-1.1-.9-2.4 .1M75.8 86.2l-4.7-1.5M53.2 76.2l-3.8-4.1M44.5 61.6l5.6 .5M48.8 48.5l.8 .3M47 43.1l6.6-1.3
                           M65.6 74.4l-1.8-7.6-1.1-.4M79.2 76.3l-3.1-3.3M63.8 66.8l7.8-2.4M61.2 65.4l-1.8-2.2M73.2 62.7l.8-4M83.3 56.4l.7 .7M58.4 60.7l-.1-3.8M65.8 51l3.1 .2M86.7 50.2l4 1M55 55.8l2.7 .5
                           M62.7 48.7l-.9-2.7-7-2.9M69.2 51l1.9-8.5M84.9 48.8l-2.6-5.2M61.8 46l8.4-5M46.9 27.3l2.6-.4M55.7 20.2l-1.4-1-2.2 .7M44.3 18.6l4.3 1.3M53.3 10.7l1 8.5M62.2 29.8l5.6 3
                           M69.8 32.6l6.3-5.5M80.6 28.7l3.8 5.7M61.5 28.8l-.6-6.5M68.9 16.9l5.8 4.6M58.1 21.3l2.3 .5M78.7 19.8l4.2 3M68.7 15.9l.2-.7 2-.7M85.7 14.6l.6 .1M55.5 5.9l1.9-.8M64 6.1l4.9 9.1
                           M73.4 12.6l4.6-7.5 7 9M77.9 4.4l.1 .7M85.6 388.5l-1.9 9.2 10.6 3M95.3 .4l.8-7.6M86.7 387.1l7.9 3.3M82.6 398.2l1.1-.5M83.9 373.1l8.7 1.5M87.4 363l5.6 1.1M110.8 .1l.3-.5
                           M102.3 387.3l5.6 1.9M120.8 399.1l.9 3.7M120.8-.9l.9 3.7M116.1 385.1l2.3 1.1M101.2 385.8l-.3-3M105.9 377.1l1.7-.3M105.1 370.9l3-.5M119.1 369.5l1.7 2.8
                           M97.4 369.5l2.9-.9 .5 .1 1.5 1.4M100.3 368.6l-3.8-5.4M107.6 361.6l.3-.1M100.8 368.7l6.5-6.4M90.3 352.7l7.6 4.8M84.5 349.1l5 1.9M92.6 334l2.4 1.2M80.5 319l6-7 5.6 1.2
                           M98.6 357.6l.4-.1 8.2 4.1M116.9 349.2l5.1 3.1M99 357.5l5.4-12.9 7.5 4.5M98.9 342.8l5.5 1.8 2.4-8.8M121.8 341.2l3.5 1.3M116.6 323.9l-4.6-4M117.1 334.3l1.7 1.2M95.7 335.2l3.5-2.2
                           M98.6 324.3l2.4 1M117.6 324l.7-.4 6.3 2.3M118.3 323.6l-.4-5.3M86 310.8l.5 1.2M88.2 304.1l8.6 3.8M97.9 307.9l.6-.3 1.4-8.6M92.8 280.1l5.2 2.9M98.5 307.6l6.7 1.5M107.3 308.5l2.2-1.9
                           M118.5 315.7l.9-1.5-3.1-8.1M109.2 295.5l3.6-1.2M106.8 295.5l-1.4-.6M121.5 294.2l1.3 5.4M106.9 287.2l2.5-1.4M116.4 284.3l3 .7M98.8 284.5l5 2.7M104.9 276.9l1.8 .3
                           M113.5 277.1l-.3 1.3 1.7 4.6M123.7 275.3l-1.3-1.8-.7-.4M110.8 279.2l2.4-.8M103 275.1l-.5-2.2-9.5-3.9M84.6 263.9l6.5 1.9M97.7 256l-.5-.8-7.1-3.4M91.1 237.9l1.5-1.1
                           M102.5 272.9l5.6-2.9M112.9 275.4l-2.1-1.5M108.9 269.1l.9-2M118.8 265.3l1.8 1.2M99 256.7l2.9 .1M109.7 249.4l3.2-.9M97.2 255.2l1.1-5.3M125.5 250.7l4.2 2.8M96.7 247.3l1 .9
                           M104.1 247.4l-1.8-6.8M113.8 247.5l1-4.2M124.2 239.2l1.4 1.2M108.6 236l2.2 .1M87.5 232.3l4.6-.2M90.5 226.4l1.6 .2M85.6 213.9l4.7-1M82.7 199.5l10.2 1.2M106.4 234.2l-.9-4.5-.5-.4
                           M113.6 230l7.6 2.8M105.5 229.7l7.4 .5M104.4 228.5l-3-10.6M103.8 216.5l5.4-1.3M110.6 213l-.5-2.3-2.5-.6M110.1 210.7l3.3-5.3M120.1 206.1l2 2.5M101.5 203.9l1.3 .6M97.9 196.4l.7 .3
                           M103.4 204.5l4.3-2.2M106 192.6l1.4 .4M82.9 193.9l3.7-7.5 .7-.2M85.2 184.8l1.4 1.6M85.3 177.7l2.8 2.3M81.9 156.6l.9-.5M103.9 191.4l-2-1.9M116.4 186.6l6.5 8.6
                           M110.6 179.3l-6.3-1.4-1.3 .6M100.8 178.6l-1.7-.6M106 164.6l-1.9 .9 .2 12.4M113.2 178.2l5.9-10-1.3-1.4M95.4 170.8l3.3 6.8M104.1 165.5l-.3-.1M119.1 168.2l6.2 .8M103.3 165.1l-4.8-5.6
                           M107.9 162.2l1.2-5.7M116.7 164.1l-.5-5.4M102.4 154l5.5-.2M90 146.5l10.1 4.2M88.2 134.4l1.2 .1M88.6 144.7l-.4-1.6M83.6 118l6.5-.6M104.6 148.7l2.6 1.3M120.6 150.3l-.4-.6-5.2-2.6
                           M102.9 146.1l-.4-6.7 8.3-1.7 .1 0M102.5 139.4l-.2-.1M110.8 137.7l-4.7-4-1.7 .5M106.1 133.7l4-5.7M116.9 127.3l6.5 3.1M97.9 129.6l4.1 4M97.2 124.9l8.9-2.6M108.7 119.6l4.5 1.1
                           M91.7 116.2l1.1-3.3M103.5 109l3.5 4.4M88.8 106.2l.2 0M83.9 103.7l4.5 2.4M86.6 89.9l5.5 .9M88.1 78.9l2.7-.6M103.7 107.6l3.4-.3M115.8 110.8l3.9 2.6M114.9 109l0-6.8M97.9 98.9l2.8 .8
                           M101.6 99.3l1.2-1.6M103.5 89.6l3.2-.9M116.9 91.7l-.3 8.7M95.7 94.3l5.7-1.3M91.6 77.1l-1.2-7.9M105 67.2l1.3 1.6M113.5 79.6l4.8 4.2M98.5 87.2l2.7 2M89.8 68.6l-.8 0-4.1 8.9
                           M86.3 66.3l2.7 2.3M92.4 54.7l2.4 1.4M86.1 35.1l1.6-.4M107.8 77.3l2.9 2M113.3 78.1l3.3-5.2M121.6 72.3l5.8 5.6M116.6 71.7l-1.6-2.3M97.8 55.9l6.2 4.1M110.6 55.7l.7-.1
                           M109.4 55.5l-8-4.5M117.8 49.9l6.3 .6M98.2 47.7l1.8 .9M98.8 41.3l3.4 .4M103.4 41.5l.7-.4M116.5 35.3l-7.5-5.2-.6 .2M83 23.3l6.8 .8M92.8 28.3l2 1.1M87.8 18.5l2 2.1M94.6 1.1l-1.3 8.2
                           M107.5 30l-3.8-4-.6-.1M121.8 34.9l1.4 1.4M109 30.1l1.7-6M120.3 24.4l1.8 2.5M102.2 25.3l-4.2-6.3M103.7 26l6.2-3.2M104 11.4l4.3 1.5M111.3 10.6l-2.6 2.2M118.9 9.5l1.9 2.9
                           M94.8 12.7l2.8 1.8M103.3 6.4l.1 4.2M124.3 5.5l3.6 1M129.1 6l5.4-9.2M121.7 396.6l12.8 .2M120.6 386.1l8-5.1M123.1 374.3l4.2 1.4M125.4 360.1l1.4-.2M145 392.4l2.4 .6M154.1 389.5l1.5 .3
                           M141 380l8 .1M136.1 382.6l2.9-1M134.6 396.8l.4 0M159.8 381.1l.6 4.6M139.8 379.2l-2.1-5.5M151.6 365.7l-2.6-2-1.6 .1M158.5 367l3.8 3.7M135 372.6l2.3 .7M130.1 354l1-.1M166 358.8l.8 .3
                           M144.9 363l-4.8-3.6M125.7 351.7l3.1 1.9M135.5 346l-4.1-5.7 0 0-3.7 2M126.5 331.4l4.9 8.9 3.7-5.7M126.9 325.8l2.3-1.1M139.2 357.2l1.1-8.7-2.1-.6M149 363.7l4-14M162.1 350.7l.6 .4
                           M140.3 348.5l3.4-1.5M143.9 332l3.3 2.9M148.3 335.1l.8-.2M143.3 330.2l.3-1.3 4.4-1.8M160.1 330.2l3.5 5.5M132.6 329.1l2.3 2.6M143.6 328.9l-.9-2.6M148.2 326.7l-1.2-3.4
                           M159.2 312.9l4.8 7.3M143.2 323.6l1.2-1.6 1.2 .2M119.4 314.2l8.4-1.1M125 301.9l2.4 .7M122.7 290.9l9.6 2.1M129.7 269.2l-1.5-.6-5.8 4.9M144.4 322l-4.4-10.5M143 305.6l6.4 .7
                           M142.6 301.5l6.3-5.8M141.4 301.4l-3.2-4M155.4 296.6l7.1 1.7M149.4 294.1l-.3-1.1-2.4-1.3M158.7 288.4l4.5 1.3M128.9 276l8 5.2M143.8 288.6l-1.9-4.1M149.1 293l5.8-2.1
                           M143.9 278.6l5.2-1.9M160.7 268.7l2.5 2.1M131.8 273.3l5.4 4M127 267.4l1.2 1.2M132 254.1l1.7 0M136.8 250.2l1-8-1.4-1.6M139.8 278l2.6-.3 .5 .6M150.1 272.6l-1.9-.8M145.6 262.7l.6-.5
                           M142.4 277.7l3.4-5.1M139.1 262.2l5.3 .8M151.6 261.4l5.2-4.6M162 258.7l-.5-1.8-.2-.2M144.4 250.8l.5-.8M155.2 248.2l1-1.3 2.2 .6M137.9 251.5l5.3-.1M137.8 242.2l3 1
                           M156.2 246.9l-.2-1.9M162.3 241.6l1.9 .8M145.6 242.5l4.1-2.5M122.5 232.4l4-6M133.7 226.1l2.1 3.1M118.8 218.2l7.5 6.6M134.4 221.7l-.8-9.7-1.7-1.8M131.1 198.2l-4.6-2.5-1.6 .3
                           M138 230.1l10.2-2.2M160.3 239.2l-1.1-4.7M149 227l8.3 1.7M144.9 220l3.1 2.5M158.2 217.7l1.5 .8M142.4 215.9l-.8-3.7M146 206.2l3.1-.5M157.4 209.6l.6-.2 9 3.8M133.6 212l7.3-.3
                           M143.3 205.1l-2.2-3M150.1 204.8l2.6-8M158 209.4l4.1-10.7-.3-.6M144.6 193.1l2.8-.9M126.5 195.7l2.5-8 6.8 .9M127.1 185.7l1.9 2M138.2 175.2l1.4 3.7M121.5 151l2.4 .5
                           M140.8 192.5l-4.6-3.2M157.2 190.4l4.5 4.9M156.7 189.4l0-.8-6.8-5M142.4 181.3l7.2 1.6M171.4 171l2.5 2M144.5 167.5l5.7 .8M151.9 181.8l7.8 1.8 1.2-.5M160.4 170.9l-1.7-1
                           M131.7 157.8l.4-.1 7.5 2.9M132.1 157.7l-.3-9.2M155.4 164.2l1.8 .4M149.3 155.2l1.6 .5M138.5 145.1l5.3 1.1M120.2 149.7l-.2-5.6M126.7 138.1l2.8 1.8M121.3 113.7l1-.2
                           M136.4 142.7l-.3-2.4M159.6 153.8l2.2 1.3M146.4 145l1.3-2.4M154.5 141.1l5.9 4.9M147.5 142l-6.6-4.1M159.1 136.3l6.1 3.3M150.2 126.1l-1.8-.6-7.8 2.2M156.9 125.5l3.3 6.1
                           M133 126.1l6.8 2.1M134.4 113.9l8.8 3.9M148.4 125.5l-3.1-7.1M155.1 113.8l3.4 5.8M143.9 117.9l.5-.2M126.7 103.3l1.2 .4M116.9 100.8l9.7 2.3M126.7 91.2l-2.4-2.1-6.5 1.2
                           M123.7 84.9l.6 4.2M134.6 109.6l4.3-6.5 4.6 1.4M153.4 113.1l-3.4-3.2-1.5 .1M150 109.9l1.1-6.9-5.1 1.5M130 104l8.7-1.2 .2 .3M155.4 101.4l.7-5.8-1.4-.7M138.7 102.8l-.9-11
                           M151.1 103l.1-.1M141.2 89.3l10.5 2.3M156.5 104.4l1.9 1.9M131.1 92.5l6.5-.9M138.3 82.9l1.7 3.2M149.1 81.2l2.9 1.5M143.5 75.1l1.7 .3M121.4 70.7l.6-1.1 7.7-.1 0 0 2.3-7.8-3.7-2.2
                           M118.5 63.2l3.5 6.4M122.6 42.7l2.1 5.3M141.2 73.8l-3.5-3.9M156.8 71.7l3.3 4.9M155 61.7l1.9 1.6M132 61.7l.4-.1M144.6 57.7l1.6 .2M142.2 56.7l-1.6-1.3M153.9 59.6l-.4-4.7
                           M125.9 48.7l11-2.3M132.9 36.8l4.4 3.5M139.1 43.9l9.5-.7M145.9 30.9l5.7 .2M131.1 26.5l1.4 1.2M122.3 18.7l4 0M127.4 14.4l-.1 3.4M130.1 11.6l2.5 4.5M144 29.7l-2.4-3.8M164.3 34l1.2 2.7
                           M141.6 25.5l.1-.3 7.5-1.9M141.7 25.2l-4-8.1M149.8 12.9l-1.2-1.5-9.4 2.9M138 13.7l-.6-1.2M148.6 11.4l-.2-.9M152.5 14.5l8.6 1.2M130.2 10.8l6.8 1.4M151.5 1.3l-2.9 8M158.4 1.6l4.3 5.9
                           M177.7 395.8l-1.2-7.4-.8-.8M159.2 396.9l4.2-1.5M161.6 387.7l2.4 1.8M172.2 376.3l3.1 5.2M170.8 367.8l2 2.2M176.5 388.4l8.6-1.8M188.4 388.7l1.1 .2M196.3 387.6l3.2 6.8
                           M176.8 382.2l7-1.3M185.3 379.9l.6-.9M185.9 367.8l4.4-2.8M197 382.2l9.2 0M174 370.2l5.4-2.8 2.6 .9M179.4 367.4l-2.4-4.6M204.5 370.4l-.6-6.7-.6-.4M195.8 354.9l3.9 1.3
                           M172.5 348.7l.6 .3M161.5 349.9l-2.3-8.1M166 337.2l2 .2M164.3 320.4l.3-.1M175.1 352.9l2.1 1.3M191.8 355.9l-9.4-3.4M180.9 350.9l-.6-2.1M177.9 332.9l7.7 5.3M187.3 338.1l9.5 7.6
                           M189.6 329.7l-1.1-3.6-9.7-.7M203.4 333.1l3.7 4.9M175.9 326.3l2.7-.7M172.7 313.4l3.4 1.1M197.2 316l.4 3.8M188.5 326.1l1.8-2.2M184.6 310.3l3 .7M159.6 312.4l7 2.3M165.4 297.6l3.4 1.2
                           M164.1 277.4l3.8 2.6M179.1 311.4l-6-2.3M189.8 310l8.4 2.6M188.9 301.7l-2.8-1.6-.5 .1M184.8 300l-5.8-4.8M196.1 293.2l6.7 5.9M186.1 300.1l5.9-7.8M179.4 290l10.3 .2
                           M202.4 290.8l1.3 7.4M178.2 289.4l-.7-1-7.7-2.1M177.5 288.4l.2-9.8-1-.7M190.9 289.3l1.6-8.4M198.9 279.4l4.9 6.4M177.7 278.6l6.6-3M170.5 267.2l4.9 5.1M163.4 260.5l6.5 4
                           M161.5 256.9l5.6-3M164.8 245.7l3.8 2.8M185.5 269.7l.2 .2M193.6 266.7l2.2 1.3M188 259.9l4.4 3.1M175.6 258.8l8.6 2.3M200.7 258.6l1.7 3.6M177.2 250.4l10 .6M200.7 257.5l.2-.7-.6-1.8
                           M175.2 249.3l-1.2-1.9M170.9 239.8l3.2 1.3M188.5 250.2l1.1-6.9M200.7 252.3l5.4-7.2-8.9-6.4M181 235l.6 0M159.9 232.5l7.8 .9M169.1 224.3l-3.5-1.8-1.8 .2M165.5 217.4l.1 5.1
                           M169.6 200.6l-.7-.9-6.8-1M180.2 234.6l-3.3-3.9M193.1 227.7l3.6 5.7M176.2 221.9l10.7-3.6M170.5 224.4l5.3-2.1M199.5 213.2l3.6 2.7M186.4 206.5l1.7-1.3M175.9 221.7l-3-6.3
                           M184.2 206.9l-2.8-.9M168.4 213l2.4 .6M179.9 204.7l-.5-1.2M188.5 204.4l.1-1.5M197.5 208.9l5-9.2-.6-1.2M188.1 201.6l-4.5-4.5M168.9 199.7l.2-6.8M156.7 188.6l3-5M167.1 186l2.2 6.6
                           M170.9 160.2l-1.9-2.1-4.8 0M180.4 193.2l2.9 2.9M195.9 195.4l-4.4-5.3M180.3 181.9l2.3-.5M177.5 180.4l2.2 1.4M189.4 172.8l6.9 1M186.1 170.7l-1.3-2.3-3.8-.6M202.3 169.8l1.3 2.8
                           M172 166.6l5.6 2.3M179.6 166.5l-1.1-3.9M184.8 168.4l1.6-6.2M198.8 161.6l4.1 5.4M184.9 157.6l.1 0M169 158.1l-.3-5.3-2.4-.4M160.7 147.3l2.7 3.4M161.2 132.2l4.4-.1M160.6 120.9l3.8 0
                           M168.7 152.8l4.4-5.6M179.1 145.4l.6 .3M198 157.8l.8-2.8-.8-1.6M190.8 140.8l6.4 6.8M165.8 141l6.9 4.2M209.4 132.5l2.1 .7M190 138.8l.1-1.3-7.1-1.9M202.6 137.2l-9-2.4
                           M196.4 126.1l8.9 1.5M179.9 133l-1.2-2.5M174.5 113.9l3.7 2.1M194.7 124.2l-.1-6.8M200 111.9l1.1 0M190.1 137.5l1.6-2.1M192.2 128.7l-8.6-1.6M159.1 106.5l2.9-.5M167.8 99.3l4.9 .3
                           M156.1 95.6l6.9-.2M160.6 79.2l6.3 6.3M187.1 105.3l-.2-.3-5.1-1.8M193 114.8l-4-2M198.7 111.2l-4-5.8M196 99.8l9.3-1M180.8 102.4l-3.4-5.1M186.9 105l6.8-6.7 .7 .8M187.6 105.5l5.3-.9
                           M177.2 96.3l.3-2.3M193.7 98.3l-.6-7.6 0 0-4-1.6M193.1 90.7l13.9 .6M169 86.4l1.8-.1M178 75.4l6.3 2M187.1 78.4l1.8-1M193.1 90.7l4.1-12.1-1.3-1M185.9 71.4l1.4-.8
                           M176.9 74.2l-.2-1-2.7-2.8M170.7 61.7l1.3 1.2M157.9 47.5l10.2 5.6M165.8 37l6.6 .8M183.5 72.3l-6.8 .9M194.4 75.4l-.9-3.1M187.6 70.2l.8-4M193.6 69.8l2-5.2M183.3 58.3l3.7 1.6
                           M190.4 58.1l5.2 3.1M182.4 53.3l6.7 1.4M197.6 48.5l.5 .2M182.1 53l-1.5-2M177.5 42.8l2.6 .5M197 48.1l-2.5-5.2M199.2 34.9l2.5 .7M191 40.1l-4.9-1.1M198.2 34.1l-.5-.7-9.9-4.4
                           M170.9 26.8l3.9 6.2M161.8 22.8l4.1 4.6M162 15.3l9.3 7.4M166.7 8.5l3.1-1.6 .4-4.4M181.1 43l3.8-3.7M182.3 33.7l-5.7 .3M197 22.8l1.1-2.6-4.3-2.5M187.6 28.7l0-.2M183.7 20.5l-5.2-1.8
                           M197.7 33.4l-1.2-6.1M177.2 17.1l-.8-5.5M183.5 5.3l6.1 1.4M208.2 18.2l.6-1.9-3.7-4.5M169.8 6.9l4.9 2.4M180.4 398.6l1 4.5M180.4-1.4l1 4.5M192.3 398.1l-1.4 7.8M192.3-1.9l-1.4 7.8
                           M193.1 10l7.1 1.8M206.2 6.2l-3.3-9.5M201.9 395.7l.5 .3M208.2 396.2l1.7 .4 3.3-3.8M203.2 396.3l2.3-.2M208.7 388.8l.7 .7M205.8 372.4l1.4 .9M203.9 363.7l8.1 .5M232.4 3.1l-.4-1.4-5-4.7
                           M223.5 396.7l3 .1M231.7 393.9l2.2 1.4M236.2 391.6l.9 2.9M227 396.6l2.9-2.6M221.5 380.8l3.9 1M208 380.8l12 .6M215.3 391.7l1.6-.2M243.7 386.7l1.9 2.4M237.2 375l1.5 .5
                           M220.8 370.1l8.7-5.6M212.7 371.1l6.7 1.6M219.3 370l-7.1-6M240.7 364.2l0-.6-2.2-2.4M239.5 369.9l1.3 1.7M214.3 353.4l-.8-1.6-8.1 .8M200.7 345.9l4 6.3M198.7 321.8l4 2.8
                           M213.7 322.5l-2.6-2-7.3 4.1M216.4 354.7l5.8 .2M231.7 348.8l6 6M213.5 351.8l.4-1.2M227.6 348.7l-4.8-2.8M207.1 339.3l6.5 9.5M217.1 334l3 1.6M231.3 346.4l1.5-3.2M245.3 341.1l2.1 2.5
                           M222.9 335.8l3.8-1.5M231.2 328.6l9.8 .6M211.1 320.5l-.1-2.6M219 309l3.6 1.4M241.9 315l4.4 7.4M227.2 321.5l1.3 .8M208.9 314.9l-8.2-3.2M191.1 301.7l2.3-1M200.3 303.5l-.4 6.9
                           M199.4 275.9l1.5-.8M204.2 298.7l3.9 .3M225.5 309.7l2.2-2.4M237.7 307.3l4.1 6.9M229.3 296.5l8.5 4M214.6 295.8l4.5 2.4M226 298.2l-2.7 .6M218 283l9.7 4.2M229.8 286.8l1.4-1.3
                           M239.9 286.7l4.8 5.9M210.7 286.3l2.2 1.3M212.3 279.6l4.7 1.7M231.3 284.9l-2.1-10M239.6 283.2l4.9-9.2-.6-.8M228.9 274.6l-3.5-.8M200.5 268.3l1.3 4.8M207.6 263.4l2.1 3
                           M200.9 256.8l3.7 .3M208.7 248.8l-2.5-3.7-.1 0M223.2 271.7l-2.3-6.3-.9-.7M220.9 265.4l9.6-2.7M232.7 262.9l9.5 1.3M207.8 262.2l9.6 2.3M230 253.2l2.2 .3M220.8 252.5l7.6-.3
                           M234.5 247.7l1.6 2.5M219.5 251.9l-.6-.7M206.2 245.1l1.8-2.1M226.3 236.4l3.3-.4M221.1 243l.1-.1M197.6 233.7l9.5-2.8M204.8 222.7l2 1.4M204.4 216.3l4.8-.4M202.5 199.7l8.4 2.7
                           M223.6 235.2l-4-6M231.2 235.2l2-2.4M241.3 233.6l.1 2.5M224 220.8l6-1M221.2 219.7l-2.4-2.9M241.8 232.6l.7-.4 2.6-8.7-1.8-1.9M218.2 214.4l.6-3.6M223.7 206l1.3-.2M236.2 208.5l6.4 3.5
                           M215 209l2.8 .5M221.7 205.5l-4.9-4.6M236.3 198.7l-4.4-2.2-1.8 .5M220.5 193.1l2.3-.3M202 196.6l4.1-7.3M218.6 192.3l-2.3-3.2M201.3 180.1l4.7 6.4M206.1 173.5l3.7-2.2-6.9-4.2
                           M198.8 155l5.9 2.4M223.9 182l2.1 4.6M231.9 196.5l1.6-6.1M239.6 198.6l1.9-1-.5-4.3M228.5 188.8l4.8 1.3M209.8 171.3l.3 0M227 177.1l9.8 .5M226.5 176.6l-.7-7.3M238.5 176.8l1.2-1.6
                           M236.3 161.5l.2-.3M252.7 164.1l1.1 2.3M223.1 165.2l-4.2-2.3M217.2 162.9l-6.3-6-2.4 .7M218.4 162.1l.2-5.3M227.5 151.4l3 .1M224.2 149.8l-3.3-3.4M218 156.1l-5.3-.6M198.1 147.7l6.5-4.9
                           M210.9 156.9l.5-.8M208.3 143.2l2.1 2.3M213.4 119.5l2.7 4.7M236 148.1l3.6 5.2M226 138.5l-1.2-.1-1.6 .8M213.7 136.1l6.9 3.1M227.6 137.9l5.1-5.1M239.5 136.6l.4 5.2
                           M226.9 130.4l-1.3 .3-.8 7.7M228.7 122.3l3.7 .3M225.6 130.7l-3.4-3.8-2.8-.4M228.1 122.8l-5.9 4.1M215.7 117.5l9.6-2.7M241.5 133.3l2.6-1.2 1.3-7.4-1.9-.9M214.6 116.8l-1.4-11
                           M209.1 95.5l3.4 1.8M197.2 78.6l4.9-.5M213.9 105l9.5 .8M225.4 114.7l8.7-2.9M224.9 104.8l8.1-.3M220.6 95.9l3.1 2.1M226.6 98l2.1-1.5M223.2 89.5l.3 0M238.1 94.1l3 .7M204.9 76.4l3.6-4.9
                           M216 72.2l2.8 2.3M222.6 89.3l-3.5-2.7M236.5 92.7l-2.8-6.8M225.9 72.6l2.9 .9M196.6 63.3l7.8 1.9M203.2 53.7l3.2 1M210.8 58.8l2.8-.4M207.3 43.1l3.4 .6M217.5 68.1l5.8 1.5
                           M244.8 72.5l-4.9-5.1-.9-.3M227.2 59.1l4-.7M220.5 63.4l2.3 .3M232.2 57.3l.1-6.6M242.4 46.2l4 5.4M224.1 58.2l-2-1.8M230.9 47.8l-1.9-1.6-6.6 4.9M214.2 57.6l-1.2-7.6M213.2 49.4l6.7 2.1
                           M229 46.2l-.2-2.8M238.3 38.5l2.6 1.1M211.2 43.4l1.2-2.9M227.6 40.7l-2.8-2.8M211.9 37.5l-2.3-2.7M198.1 20.2l.3-.3M208.6 21l2.1 2.9M206.6 6.4l6.8-2-3.5-7.8M209.9 396.6l3.5 7.8
                           M221.9 24.3l2.4 3M235.9 35.4l-1.1-6.6M238.9 25.7l1.5 .2M227.2 28.6l7-.3M208.8 16.3l7.5-2.8 5.2 6.6M237.2 24.4l-3.4-7.8M216.9 11.9l-.6 1.6M228.4 12.8l.4 .9M239.9 8.7l8.7 4.8
                           M214.1 4.6l-.7-.2M232 1.7l2.3-5M233.8 4.7l5.2 2.3 5-8.3M243.4 397.6l.6 1.1M243.8 383.2l5.2-.8M249.8 389.6l3.3 2M250.8 373.5l-3.3-3.4-.9 0M241 365.1l4.4 4.5M255.6 391.1l2.9-3.8
                           M266.4 384.3l.8 .3M282.4 2l5-2 1.9 5.8M287.4 399.8l-4.5-4.5-1.1 .2M278.3 389.7l.1 4.6M251.4 381.1l6.6 3.8M279.3 378.6l1.6 1.9M265.5 383.4l-4.1-11 6.6-5.9 .9-.2M281.2 380.7l6.2-.1
                           M261.4 372.4l-.1-.1M247.5 370.1l.8-5.9M258.6 362.2l2 2.3M270.1 365.4l3-5.1M282.3 361.9l1.7 5.6M268 366.5l-6.3-1.4M240.7 363.6l7.1 0M250.8 359.8l-1.6-7.8-.4-.3M245.2 335.6l9.6-.3
                           M247.3 323l.8 0M249.2 352l7.7 2.2M266.8 351.3l6.1 3.2M260.6 339.6l1.9-1.8M264.3 347.6l-.3-3.5M257.2 338.9l2.4 .9M270 338.3l3 .3M264.7 333.2l1.2 0M284.5 319.1l2.9 1
                           M257.6 330.9l.5-.2 5 2.2M258.1 330.7l1.6-11.9-1.6-.8M276.7 336.8l4.3-7.2M279.5 328.1l-5.7-3.5M259.7 318.8l7-1.4M256.3 315.9l-2.5-6.9M244.9 297.4l6.2 4M245.5 292.9l2.8-1
                           M244.5 274l1.7 .1M261.1 304.8l8.8 6.4M280 321.7l-6.6 1.8M281.9 316.8l-1.7-3.6M260.7 303.7l.2-.8 7.2-.8M257.4 299.2l3.5 3.7M271.8 300.2l2.3-2.5M282.6 300.4l1.6 2.8
                           M265.8 287.1l1.7-.2M278.7 285.9l5.7 5.5M263.5 286.3l-5.3-5.1M254.8 269.5l4.6 5.3M278.3 286l-8.1-1M263.3 276.1l3.4-.8M244.4 263.6l2.6-2.4M236.8 250.7l6.2 1M246.3 251.1l1.8-1.3
                           M247.9 240.8l-1.5-2-3.5-.9M264.3 262.9l6.7 6.8M271.4 270.8l9 5.3M275 258.7l1.3 2.6M264.1 257.6l-1.2-2M274.7 254.7l.9-3.2M287.5 250.6l2 1.7M266.6 246.8l4-.1M272.2 245.2l.6-7.2
                           M280.6 235.1l6 3.1M264.1 245.2l-1.4-3.3-1.9-1.5M246.4 238.8l.1-2.4M255.7 230.1l1.7 .8M272.4 237.2l-.5-.4-9.2 5.1M271.9 236.8l-1.5-5.5-10.6 2.7M242.5 232.2l2.5 1.4
                           M245.1 223.5l4.4-.2M245 212.2l2.1-.9M241.5 197.6l4.5 2.3M270.4 231.3l0-.2-2.2-4.2M270.4 231.1l7.6-.4M268.4 218.1l5.9-2.5M267.7 224.1l.3-1.8M265.8 217.4l-2-2.7-.7-.2
                           M281.1 221.8l-.4-1.1-4.5-2M263.8 214.7l8-2.6M275.3 213.7l6.8-.4-1.4 7.4M262.2 213.9l-1.7-1.9M259.6 209.5l.8-11.2-1.3-1M272.2 211.5l0-10.9M282.1 213.3l.2-.2 .1-14.9-1.3-.5
                           M260.4 198.3l9-.9M254.5 187.4l3.3 4.4M240.7 185.8l2 1.8M253 175.2l2.2 3.4M241.4 153.7l8.4-4M258.6 192l9.2-4.9M269.9 187.4l1.2-.3M271.6 186.8l6.3-6M276.8 186.4l3.4-5.6
                           M256.5 179.3l3.8 0M277.9 179.8l-5.8-8M280.6 180.5l.2-.1 2.4-9.6-1.3-1.3M263.8 177.5l4-5.7M274.6 167.6l-.2-2.4M280.6 166.9l-.3-2.4M268 169.9l-.6-1.4-1.6-1.9M263 154l3.5 7.4
                           M267.4 168.5l4-5.2M267.4 161.8l2.8-.6M241.9 143.7l3.8 .2M252.7 141.7l-1.7-2.2-3.4 3.5M251 139.5l0-.4-6.9-7M241.3 122l-2.4-3.6M263.4 151.4l1.3-1.4 6 3.7M273.8 153.7l3.1-1.8
                           M283.3 154.5l.5 3.3M264.7 150l.1-1.1M275.4 143.6l2.8 1.9M256.3 142.7l4.7-1.8 .3 .2 3.2 6.3M261.3 141.1l10.1-3.9M261 140.9l-1.6-2.8M266.8 127.7l4.3 5.4M282.8 130l4.4 2.3
                           M251 139.1l5.3-2.1M245.4 124.7l5.7-2.6M277 122.1l3.6 2.1M266.9 123.8l-5.5-6.3M267.6 106.9l2.2-.1M241.5 109.2l5.6-1.3M240.1 107.7l.7 1.2M246.4 103.8l2 1.6M246.5 81.4l1.4 1.3
                           M258.5 116.5l-3.7 .7M281.5 111.9l4.4 7.1M264.4 102.5l5.9-1.3M263.8 102.4l-2.2-1.6M271.3 100.5l8.7 1.2M264.4 89.5l4.3-.1M279.8 86.3l7.3 6.2M251.1 89.6l8.2 3.1
                           M261.9 87.6l-2-7.4-.7-.5M270.8 79.9l7.2 1.6M259.9 80.2l7.9-2.7M254.4 69.9l2.8 1M239.9 67.4l8.6-6.2 1.1 .5M247.1 59.3l1.4 1.9M242.5 45.1l7.5 .5M260.7 70.2l6.1 3.7M277.6 68.7l2 .8
                           M260.2 69.4l.8-7.8M270.3 57.8l1.9 .8M260.1 59.7l-1.8-1.2M283.6 51.7l2.1 .6M257.9 57.8l-.6-3.9M266.6 47.8l.9 .8M280.8 49.6l-1.4-2.2M252.7 50l3 1.6M250.7 45.2l2.3-4.8M264 40l1.1 1.1
                           M277.6 37.6l1.9 1.4M267.3 28.3l8.4 .8M248.5 34.3l2.2 .1M250.9 20l.6 .3M239.2 7.7l-.2-.7M253.5 .6l4.1 7.5M257.6 24.7l3.6-.9 2 .4M276.4 28.6l6.6 1.7M264.4 23.9l2.2-1.9
                           M261.2 23.8l-4.9-4.4M268 19.3l.3-4.5M276.1 12.4l2.5 2.4M255.2 13.3l0 3.6M267.3 12.7l-7.2-4.4M275.5 9.5l1.3-3.5M285.4 13.6l.7-3.6M261.7 2.4l-1.8 5.3M274 .1l2.5 3.7M281.2 3l-.5 .9
                           M280 395.4l-1.3-.6M282.9 395.3l.9-5M295.3 391.8l-.3-2.6-4.5-3.2M285.2 368.4l1.1 0M283.1 358.8l1.5-1.6 5.1 .6M306.2 400.2l.5-2.6M306.2 .2l.5-2.6M314.7 392.7l3.5 3.1
                           M313.7 390.9l-.2-1.3-9-2.5M295 389.2l8.7-3 .3 .4M297.3 395l2.6 1.5M313.1 381.9l2.2-1.7M309.1 383.3l-3.5 0M302.7 371.3l9.1-1.5M303.7 386.2l1-2.3M313.5 389.6l0-.3M293 374.6l8.1-1.8
                           M301.8 370.8l-3.2-9.2M312.9 368.8l1.2-4.6M327.2 372.7l1.7-2.5M308.8 356l3.3 .9M280.8 352.4l3.8 4.8M281.1 344.4l6.9-3M285.9 332.2l2.8 7.6M299 359.2l-4.3-2.8
                           M325.4 353.8l-2.8-3.2-3.3-.1M307 345.5l4.7-1.8M304.4 345.3l-6.8-3.6M313.3 342.3l1.1-2.2M322.6 350.6l3.8-8.4-1-1.8M302.1 331.1l6.6-.5M316.5 324.1l5.9 1.3M300.2 330.1l-1.3-2.4
                           M288.5 319.9l5.3-4.4M300.8 316.5l.6 2.5M317.7 310.2l10 2.7M313.2 325.3l-10-4.3M284.9 303.7l4.7 .3M296.9 308.5l4.2 6.2M286.3 292.1l4.3-.4M289.8 276.1l-2.4-1.2-3.2 1.4
                           M303.5 307.8l.9 1.8M317.1 310.5l-12.4-.7M302.9 305.4l-.1-2.6M309.3 297.6l7.8 4.7M295.7 299.9l1.8 1M324.8 291.2l6.6 .4M301.9 301.9l-2.8-.4M308.2 295.7l0-7.1-3.2-1.4
                           M308.2 288.6l2.1-1.3M319.2 302.2l2.3-2M301.8 283.3l-1.5-6.6M315.4 275l8.2 4.2M303.4 270.8l.6-.2M287.4 274.9l.6-9M302.7 270.5l-2.2-5.3M286 262.9l1.6 1.8M289.7 258.7l1.3 3
                           M301 263.3l1.4-1.1-.9-9.7M292.7 239l-3.9-1-.8 .3M302.4 262.2l1.5 1M319.9 269.8l7.2 .4M317.7 268l-1.2-5.6M312.6 249.1l4.7 11M301.6 252.3l-1.8-6.4 8.2-4.7 .9 .3M324.9 243.8l2 .6
                           M298.5 245.4l1.3 .5M288.8 238l4.7-6.5M322.6 241.8l-2.6-6.9M310.2 224.4l-.9-1.4-6.4 4.8M298 232.8l4.5-1.5 .1-.2M301 227.8l-4.2-3.1M282.4 222.9l10.6 3.1M282.3 213.1l10.9-.5
                           M282.4 198.2l2.3-.6M308 241.2l-5.5-9.9M312.3 225.8l2.5 .5M309.3 223l.1-2.5M298.2 217.2l6.4-1.2M306.3 214.7l.7-1.3M312 208.2l-.9-1.1-5.4 .5M319.6 220l2.4-10M297.8 208.1l7.8-.4
                           M301.9 197.8l2.2 .9M311.1 207.1l1.3-7.4M322.6 209.1l.5-.5-2.5-9.6M306.1 198.8l5-1M287.6 195.5l5.4-9M300.7 196.5l-2-6.4M280.8 180.4l10.7 3.7M283.2 170.8l10-3.5M285.4 160l6.6 3.6
                           M306.5 181.9l7.8 3.8M314.4 186l5.7 3.7M309.7 179.8l4 2.3M299.1 176.5l1.5-.1 5.5 4.2M320.9 170.6l2.9-.5M300.6 176.4l1.9-8.7 7.4 2.5M312.3 170l3.2-1.5 1.9 1.3M315.8 181.8l2.5-2.3
                           M302.5 167.7l-.1-.1M299.8 161l2.1 1M315.5 168.5l.3-3.1M326.1 159.4l1.5 .9M314.1 161.5l-3.9-3M296.4 149.5l1 .9M282 146.3l2.6 4.7M289.4 138.6l5.9 4.9M287.6 120.2l1.4 .2
                           M305 149.5l3.4 2M319.2 147.2l5.2 4.7M303.4 141.9l7.2 .2M297.1 143.9l5.4-1.4M314.9 132.6l-.5 .4-1.6 7.4M322.7 134.2l1.5 1.6M303 141.4l.1-10.7 11.3 2.3M325.7 127.6l5.8 2.6
                           M303.1 130.7l-.3-.3M300.3 119.4l2.4 3M315.5 131.9l1.7-5.8M311.4 117.9l-.7 0-6.4 4.7M295 105.5l6.3 1.9M283.5 105.8l10.8 0M287.1 92.8l5.3 3.2M284.6 75.9l8.9 1.4M310.7 117.9l-6.4-4.2
                           M312.3 117.5l3.6-4.4M322.6 124.1l2.2-7.5-1.2-2M311 102.9l-1-.1-5.8 4.1M294 90.3l3.4 2.7M312.2 102.4l1.6-2.3M327.8 107.7l1-6.9-2.5-1.8M309.6 94.6l-.6 .2 1 8M316.2 83.1l8.9 2.5
                           M309 94.8l-4.3-2.3M301 80.2l2 1.5M322.8 75.4l2.2 1.4M304.6 81.9l2.8-1.3M305.4 71.6l0-1.7-6.4-1.6M291.8 62.4l2.4 .7M294.7 47.8l3.8 1.7M286.5 37.4l4.2 2.2M308.1 78.5l-2.1-4.2
                           M305.4 69.9l.8-.9M318.3 68.6l2.7 2.8M306.8 67.4l.3-5.7M317 60.1l1 1.3M302.4 56.2l1.9 .1M323.5 61.4l2.9 3M306.3 52.4l6.8-2.3M322.2 58.2l.1-3.2M304.2 51.9l-2.7-2.7M301.2 36.3l2.8 2.5
                           M317.5 45.1l6.4 5.9M307.1 39.7l2.3-.4M292.1 24.5l3.2 .3M285.9 15.7l4.1 4.5M296.3 24.1l.3-2.4M287.4 400l1.9 5.8M301.9 30.3l4.3-1.1M319.1 34l1.7 1.6M308.1 27.6l1.3-2.3
                           M316.7 24.8l2 1.3M302.9 17.2l3.9 1.8M311.2 16.8l1.6 .3M301.9 15.2l.4-1.8 4-.6M319.7 13.5l3.6 .4M302.3 13.4l-3.3-5.8M300.7 2.7l-1.7 3.2M314.4 6l2.8 5.7M320.8 1.8l4.8 1.4
                           M311.8 6.9l-2.8 4.2M328.7 2.2l1.8-2.4M327 393.3l3.5 5.8M320.6 384.4l3.3 .5M324.8 384.6l2.5-2.9M326.5 376.6l1.1 3.8M335.1 384.1l4.8 3.9M363.4 404.4l3.1-4.6-8.4-4.5M363.4 4.4l3.1-4.6
                           M352.4 .4l-3.9 2.2M342 388.1l4.6-2.6M342.5 380.6l4.2 4.5M356.7 380.8l3.4 3.1M341.4 373.3l6.5-2.8M360.7 362.9l9.1 2.2M340.9 373.3l-3.1-2.9M327.1 360.2l8.4 2.9M348.7 368.9l-1.5-7.2
                           M338.1 362.7l5.1-3.6 2.2 .6M327.9 353.8l4.5-4.6M343.2 359.1l0-8-.5-.7M326.4 342.2l5.4 .7M328.4 334.3l2.9 .3M331.3 320.8l2.6 .6M343.2 351.1l.4 0M352.9 349.2l-1.2 1.4-.6 6.2
                           M361.9 349.6l1.7 4.1M344.2 351.2l7.5-.6M342.5 349.1l2.9-8.7-1.6-1.6M345.4 340.4l4.1 .2M346.7 324.5l.7-.2M362 346.2l1-2.1-4.4-6.3M339.4 328.5l2.8 .5M345.8 324.3l-6.8-4.8
                           M357.8 328l3 2.3M356.1 315.2l3.2 1.2M331.2 311.4l5.9 2.8M331.7 303.6l1.1 2.2M335.5 297.5l.3 .2M329.2 277.9l6.6 8M336.5 305.8l3.1 2.1M343.3 308.4l2.9-1M349.4 298.5l2-.7
                           M346.4 298.1l-2.7-1.8M363.3 301.4l6.5 .1M346 288.7l2-.1M357.1 302.9l5.8-1.1M363.1 301.2l-1.5-8M343.2 287.7l-1.6-1.4M337.5 271.8l7.4 4.2M361.8 292.1l.3-.7-3.9-8.5M346 276.1l.8-.3
                           M328.9 269.3l.8-1.2 6.6 .7M327.2 259.1l2.5 9M338.7 257.2l.6 5.8M320 234.8l5-1.4M341.4 264.6l2.3-.4M354.8 270.8l4.9 5.6M355.3 260l-1.6-1.8-7.6 2M343.9 259.8l-4.6-3.4
                           M353.7 258.2l1.5-3.6M360.2 255l.8 4.2M354.3 246.8l-.3-.6-11.6-.4M355 247.5l6.2 3.7M340.7 244.7l-.7-1.2M333.4 234.6l6.5 7.3M354 246.2l.4-2.9M360.6 238.5l2.4 .1M353.8 242l-6.1-3.6
                           M330.5 229.4l2.5 1.6M319.7 220.3l6.9 2.3M323.1 208.6l.4 0M320.9 198.5l5.1 1.7M343.7 228.4l2.3 1.7M358.1 236.7l-2.6-5.8M342.1 225.6l-.4-5.6M352.2 215.1l5.5 8.3M334.3 214.6l5.7 2.8
                           M352.1 212.8l1.4-2.8M363.2 206.6l5.4 8M339.5 203.5l7.2 5M353 208.2l-1.9-1.3-1.6 1.5M338.8 203.6l-8.7-4-1.5 .5M330.1 199.6l1.7-7.6M339 192.6l1.3 8.6M351.1 206.9l-.8-3.9
                           M359.7 196.6l3.6 9M341 201.8l7.5-.2M323.2 190l5.3-2.1M327.4 180.5l1.8 3.6M328.5 177.2l5.6 2.7M327.6 168.4l3.3 3.7M341.9 187.6l9.6 3.7M352.2 191l3.7-6.1M343 184l7.5-2
                           M341.2 183.4l-1.1-1.6M352.5 179.2l-.3-5.5M358.8 169.4l5.8 5M340 181l1.7-9.2-.7-.6M350.1 171.8l-8.4 0M332.8 173.1l1.4 .3M332.3 159l5.8 1.7M355 168.5l-1-3.4M362.4 157.5l1.6 1.4
                           M350.6 161.1l-6-2.9M329.2 150.7l.5 0M323.3 144.6l5.3 5.8M332.9 134.9l1.8 .9M333.6 113.4l-.4 0-8.4 3.2M344.1 148.7l.7 .7M359 147.5l1.3 .8M343.7 147.4l1.5-9.3M353.1 134.8l2 .8
                           M344.3 136.2l-3.9-1.8M368.1 143.7l1.4-7.7-6.7-4.9-.9-.1M351.7 126.4l-.3-.5-5.2-1.4M360.7 130.2l-1.3-2M337.6 128.1l.6 .4M340.4 119.2l2.3 .5M351.4 125.9l2.7-5.2M358.9 126.1l.3-3.5
                           M354 119.6l-3.2-5.9-1.9 0M328.5 109.6l4.7 3.8M328.8 100.8l2-.3M325.4 85.4l8.5 .2M326.1 76.9l3.5-1.2M345.9 112.7l-2.6-1.9M350.8 113.7l5.1-4.9M364.5 115.8l.4-2.3-1.9-2.5
                           M350.6 97.1l2.8 1.9M339.8 106l.5 .1M363.4 100.2l.8 1.1 4.7-.9M347.8 86.7l2.6 1.6M349.9 96.2l-.2-.8M356.7 99.9l4.8-.4M367 92.9l0-.3-3.9-5.9M340.1 89.7l2.7-.1
                           M345.9 84.1l-.4-2.1-7.6-3.9M345.5 82l4.1-6.2M341.9 72.5l2.2-.5M333.2 67l3.7 .9M329 65.6l3 .3M325.4 51.4l2.7-.6M322.1 36.1l2.9-.2M344.8 71.2l1.1-5.3-1.6-.8M359.3 70.6l.8 .8
                           M345.9 65.9l1.2-.6M337.2 57.7l.2 0 5.2 3.2 .3 2.1M358.4 57.8l0-1.1-4.9-8.4M348.3 63.6l.5-2.3M342.6 60.9l3-.8M358.8 69l.7-8.6-.7-.9M334.7 43.5l.6-.1 8.3 6.8-6.2 7.5
                           M344.5 50.3l-.9-.1M368.5 39.5l.2 .2M335.3 43.4l3.7-8.1M345.3 34.2l7.1 4.4M338.8 34.7l-6.6-3.5M327.8 23.6l1.7 .7M329.3 11.4l4.1 1.8M346.8 28.2l4.7 1.8M353.7 47.3l.9-.5
                           M354.1 39.9l-1.6-1.4M354.1 24.6l2.8 1.8M340.3 19l4 3.7M351.7 21.9l-1.1-2.1M350.1 14.8l-.8-.6-7.2 1.2M361.8 14.3l2.8 2.6M340.3 14.8l-1.6-1.8M341.9 2.3l-3.5 9.3M347.6 4.5l1.7 9.7
                           M361.4 11.5l1.6-3.2-.2-1.6M374.6 385l5.4 4.4M366.5 399.8l.5-.1M363.4 384.8l5.8-1.1M368 379l1.5 4.2M366 355.8l2.5 .7M375.7 4.2l1.8 2.9 3.5 1.3 7.9-8.6M383.2 390.6l2.2 .1
                           M392.1 392.1l-2.8 .8M391.7 399.3l2.5 1.3M398.7 399.1l-3.4 1.6M398.7-.9l-3.4 1.6M392.5 383.1l-1.9-.7M383.9 373.4l2.1 .8M1.7 377.3l-.1-3.4M392.3 367.2l-.1-.6-6.7-2.6M1 372.9l-8.1-4.9
                           M401 372.9l-8.1-4.9M372.7 367.9l7.7 5.5M385.2 363.7l0-.2-2.6-1.3M1.3 357.1l-7.2 5.4M392.2 366.6l.4-1.8M385.2 363.5l3.3-2.8M377.7 352.1l1.8 .7M363 344.1l5.8-1.4M363.1 331l6.8-.5
                           M361.3 316.3l4-1.6 8.8 6.9M382.1 351.8l4.4 1M395.5 349l-2-.2M381.1 350.6l-.3-3.8M384.6 343l2.8-.3M376.7 347l3.6-.7M388.8 341.6l1.8-4.9M382.9 342l-2.5-6.4M390.1 334.7l-4.1-2.9
                           M0.6 326.9l-.7 .2M400.6 326.9l-.7 .2-2 6.5M374.9 334.5l4.2 .2M375.2 321.8l.7-.4 8.2 4.3M399.9 327.1l-9.2-6.8M375.9 321.4l1.9-6.4M390.5 319.9l0-.3-6-7.3M366.3 312.7l-1 2
                           M371.3 309.5l5.6 3.3M362.1 291.4l8.6-1.2M360 276.5l6.6-1.4M395.5 314.4l-5 5.2M395 306l-10.2 3M383.9 298.8l5.9-1.9M380.6 298.5l-2.7-1.4M391.5 295.4l1.2-2.1M377.6 296.7l-1.1-5.9
                           M392.7 292.1l-4-8.2-2.4-.7M400.1 291l-1 1.2M373.1 288.6l1.7 .4M384 281.1l-1.4-3.5-1.7-1.1M388.7 283.9l3.5-3.5M382.6 277.6l5.3-5.8M370.9 264.3l5.2 1.1M361.3 259.6l8.1 3.2
                           M367.2 248.6l.7 .2M373.6 243.8l-.2-2.1-5.1 1.4M380.5 271.1l2.6-1M393.7 268.3l-2.7 2.8M383.8 268.1l-2.4-4.9M376.3 254.9l4.9 3.9M390.9 255.1l-8.7 3.8M383.5 242.9l2.8 1.3
                           M375.2 246.3l1.9 1M373.4 241.7l.1-.2M394.8 241.8l0 0M387.4 232.6l5.5 3.1M363.4 238.5l5.5-4.3M364.1 224.4l6.7 5.7M370.5 215.8l1.4 .2M360.9 193.9l1.4-.2M386.6 231.5l-.2-.9-1.3-1.3
                           M396.1 234.4l-1.4 1.1M393.2 229.8l-6.8 .8M378.9 214.1l4.4 1.9M387 215.9l3.5-1.9M398.2 220l-2.2-3.9M377.7 211.6l1.4-6.3M383.2 203.4l3.3 .9M1.9 208.4l-5.5 5.4M401.9 208.4l-5.5 5.4
                           M378.9 204.9l-6.5-5.3-1.1 .1M372.4 199.6l1-1.1M381.6 201.9l-.8-2.5M389.3 203.6l3.9-3.6M393.7 197.2l-3.4-6.6-2.4-.1M369.6 187l2.3 1.2M364.8 182.8l3.2 1.9M367.1 175.3l1.9-.1
                           M364.9 159.3l2.6 .2M384.8 188.7l-2.5-3.6M394.9 186.6l-4.6 4M394.9 184.2l-5.1-6.5-.3 .1-7.4 5.8M371 176.7l7.5 .1M389.8 177.7l2.7-4.3M2.6 178.4l-4.1-4.7M402.6 178.4l-4.1-4.7
                           M379.7 176.1l.4-.9 9.4 2.6M1.1 162.2l-3.1 8.5M401.1 162.2l-3.1 8.5M380.1 175.2l-1.1-4.4M385.7 163.3l.2-1.5-10.1-5.6M385.9 161.8l2.5-2.7M392.5 172.9l-6.1-7.4M369.1 145.2l3.9 1
                           M369.5 136l.5-.1M362.8 131.1l7.9-3.6M365.2 117.7l6.2 4.9M389.6 156.1l-.2-2.4-9.6-5.8M0.3 147.6l-3.4 .2M389.4 153.7l3.3-3.8M392.9 146l-6.2-8.3-.4 0M385.7 137.6l-4.4-3.4
                           M1.4 135l-11.5 .1M386.7 137.7l1-1.5M388.2 133.7l-.9-5.2-.5 0M387.3 128.5l1.3-1.5M372 126.3l9 6.5M377.5 119.7l3.7 .5M388.9 116.1l-1.3 1.9 1.7 6M387.6 118l-1.7-.1-1.6 1.4
                           M364.9 113.5l7.9-2.3M362.4 107.2l1.8-5.9M372.7 101.1l2.1 1.2M359.4 77.4l4.2 3.7M385.9 117.9l-2.2-7M383.8 109.9l.3-.5 .3-.1M393.7 96.8l.6 1.9 5.8 1.8M0.1 100.5l-5.8-1.8
                           M384.1 109.4l-8.2-6.9M384.8 109.2l9.5-10.5M391.7 94.3l-5.6-3.4M384.6 88.9l-.5-1.6 8.5-4.7M367 92.6l8.7-7.9M384.1 87.3l-1.5-1.3M364.3 81.3l5.4-1.7M398.7 81.6l-3.9 1.4
                           M385.8 72.8l1.4-.4M372 70.9l1.2 1.4M359.5 60.4l10.9 1.3M358.4 56.7l1.8-3M367.5 49.5l4.5 4.3M383.5 72.6l-3.3-1.7M397.8 73.9l-4.6 .8M378.4 68.4l-.4-2.5M384.2 61.1l2.7 2.5
                           M373.2 64.6l4.5 1M395.9 62.5l-5.2 1.9M384.8 48.9l5.3 2M383.5 59.8l-.1-1M396.3 54.6l-5.1-3.7-.4 .1M374.1 54.5l3.9-.5M382.8 46.5l-1.1-5.4-2.5-1.4M395.4 42.4l-4.2 8.5
                           M381.7 41.1l1.3-1.4M368.4 39.1l.4-3.3M376.3 32.2l1.8 1.3M360.2 26.6l7.8 7.1M365.5 17.1l.5-.2M363 8.3l3.2 3M383.9 36.9l-.3-2.5-1.5-1.1M391.1 32.7l-7.5 1.7M393.5 26l-1.1-2-9.4-.9
                           M377.8 25.4l2.1-.6M392.4 24l3.8-8.8M4.6 15.4l-2.1-1.6M381.8 21.8l-.7-13.3 11.1 .9M5.4 9.5l-3 3.4M377.5 7.1l-8 4.6M381 8.4l.1 .1M394.6 1.5l-1.3 7"/>
                      </pattern>
                      <clipPath id="fp-gravel-clip">
                        <rect width="80" height="80"/>
                      </clipPath>
                    </defs>
                    <rect width="80" height="80" fill="#fff" stroke="#bbb" stroke-width="2"/>
                    <rect width="80" height="80" fill="url(#fp-gravel)" clip-path="url(#fp-gravel-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="concrete" title="Concrete">
                  <svg width="40" height="40" viewBox="0 0 200 200">
                    <defs>
                      <!-- ar-conc.pat, generated rather than hand-placed. Its 13 line families are
                           3 trios (50/355/100.451, 46.1842/96.6356/351.184, 21/326/71.4514 degrees)
                           whose members share one lattice and whose dashes meet end-to-end, so
                           every repeat closes into a triangle, plus 4 zero-length-dash families
                           (37.5/7.5/-32.5/-42.5 degrees) drawing 3 dots per repeat. Those 7
                           lattices have no common period (searched to 1200mm: every candidate
                           misses some lattice by 40-80mm) -- that's how AutoCAD makes it look
                           random -- so no tile reproduces it exactly. This tile is the true
                           pattern over a 1200x1200 raw window (each shape kept once, by its
                           centroid, and wrapped across the edges it crosses), y flipped from
                           AutoCAD's y-up, scaled 0.5625x: 100 triangles, 491 dots. A
                           large window keeps the repeat from being visually obvious. -->
                      <pattern id="fp-concrete" width="675" height="675" patternUnits="userSpaceOnUse">
                        <path fill="none" stroke="#000" stroke-width="0.5" d="M0,675L6.89,666.79 8.54,675.75ZM0,0L6.89,-8.21 8.54,0.75ZM675,675L681.89,666.79 683.54,675.75ZM675,0L681.89,-8.21 683.54,0.75ZM82.65,576.5L89.54,568.29 91.19,577.24ZM185.13,585.46L192.02,577.25 193.67,586.21ZM287.61,594.43L294.5,586.22 296.15,595.17ZM390.09,603.39L396.98,595.18 398.63,604.14Z
                           M492.57,612.36L499.46,604.15 501.11,613.11ZM595.05,621.32L601.94,613.12 603.59,622.07ZM62.83,469.03L69.72,460.82 71.37,469.77ZM165.31,477.99L172.2,469.78 173.85,478.74ZM267.79,486.96L274.68,478.75 276.33,487.71ZM370.27,495.92L377.15,487.72 378.81,496.67ZM472.75,504.89L479.63,496.68 481.29,505.64ZM575.22,513.86L582.11,505.65 583.76,514.6Z
                           M43.01,361.56L49.89,353.35 51.55,362.3ZM145.48,370.52L152.37,362.31 154.02,371.27ZM247.96,379.49L254.85,371.28 256.5,380.24ZM350.44,388.45L357.33,380.25 358.98,389.2ZM452.92,397.42L459.81,389.21 461.46,398.17ZM555.4,406.39L562.29,398.18 563.94,407.13ZM657.88,415.35L664.77,407.14 666.42,416.1ZM23.18,254.09L30.07,245.88 31.72,254.83Z
                           M125.66,263.05L132.55,254.84 134.2,263.8ZM228.14,272.02L235.03,263.81 236.68,272.77ZM330.62,280.99L337.51,272.78 339.16,281.73ZM433.1,289.95L439.98,281.74 441.64,290.7ZM535.58,298.92L542.46,290.71 544.12,299.66ZM638.05,307.88L644.94,299.67 646.59,308.63ZM3.36,146.62L10.24,138.41 11.9,147.37ZM105.84,155.58L112.72,147.38 114.38,156.33Z
                           M208.31,164.55L215.2,156.34 216.85,165.3ZM310.79,173.52L317.68,165.31 319.33,174.26ZM413.27,182.48L420.16,174.27 421.81,183.23ZM515.75,191.45L522.64,183.24 524.29,192.19ZM618.23,200.41L625.12,192.2 626.77,201.16ZM86.01,48.11L92.9,39.91 94.55,48.86ZM188.49,57.08L195.38,48.87 197.03,57.83ZM290.97,66.05L297.86,57.84 299.51,66.79Z
                           M393.45,75.01L400.34,66.8 401.99,75.76ZM495.93,83.98L502.81,75.77 504.47,84.72ZM598.41,92.94L605.29,84.73 606.95,93.69ZM0,646.43L11.13,634.83 12.71,648.4ZM675,646.43L686.13,634.83 687.71,648.4ZM152.48,670.07L163.61,658.48 165.19,672.04ZM133.54,507.25L144.67,495.65 146.25,509.22ZM286.02,530.9L297.15,519.3 298.73,532.87Z
                           M438.5,554.55L449.63,542.95 451.21,556.52ZM590.99,578.19L602.11,566.6 603.69,580.16ZM114.6,344.42L125.73,332.82 127.3,346.39ZM267.08,368.07L278.21,356.47 279.79,370.04ZM419.56,391.72L430.69,380.12 432.27,393.69ZM572.04,415.37L583.17,403.77 584.75,417.34ZM95.66,181.6L106.78,170 108.36,183.57ZM248.14,205.24L259.27,193.65 260.84,207.22Z
                           M400.62,228.89L411.75,217.3 413.33,230.86ZM553.1,252.54L564.23,240.94 565.81,254.51ZM76.71,18.77L87.84,7.17 89.42,20.74ZM229.2,42.42L240.32,30.82 241.9,44.39ZM381.68,66.07L392.81,54.47 394.38,68.04ZM534.16,89.72L545.29,78.12 546.87,91.69ZM14.29,653.57L24.29,649.73 21.39,658.36ZM49.05,549.96L59.05,546.12 56.16,554.76Z
                           M134.33,607.49L144.34,603.65 141.44,612.28ZM219.62,665.01L229.62,661.17 226.72,669.81ZM-1.47,388.83L8.53,384.99 5.64,393.63ZM673.53,388.83L683.53,384.99 680.64,393.63ZM83.81,446.36L93.82,442.52 90.92,451.15ZM169.1,503.88L179.1,500.04 176.2,508.67ZM254.38,561.41L264.38,557.57 261.49,566.2ZM339.66,618.93L349.67,615.09 346.77,623.72Z
                           M33.29,285.23L43.3,281.39 40.4,290.02ZM118.58,342.75L128.58,338.91 125.68,347.54ZM203.86,400.28L213.86,396.43 210.97,405.07ZM289.14,457.8L299.15,453.96 296.25,462.59ZM374.43,515.32L384.43,511.48 381.53,520.12ZM459.71,572.85L469.72,569.01 466.82,577.64ZM544.99,630.37L555,626.53 552.1,635.17ZM68.06,181.62L78.06,177.78 75.16,186.41Z
                           M153.34,239.14L163.35,235.3 160.45,243.94ZM238.62,296.67L248.63,292.83 245.73,301.46ZM323.91,354.19L333.91,350.35 331.01,358.99ZM409.19,411.72L419.2,407.88 416.3,416.51ZM494.47,469.24L504.48,465.4 501.58,474.04ZM579.76,526.77L589.76,522.93 586.86,531.56ZM665.04,584.29L675.05,580.45 672.15,589.08ZM-9.96,584.29L0.05,580.45 -2.85,589.08Z
                           M17.54,20.49L27.54,16.65 24.64,25.28ZM102.82,78.01L112.83,74.17 109.93,82.81ZM188.1,135.54L198.11,131.7 195.21,140.33ZM273.39,193.06L283.39,189.22 280.49,197.86ZM358.67,250.59L368.68,246.75 365.78,255.38ZM443.95,308.11L453.96,304.27 451.06,312.91ZM529.24,365.64L539.24,361.8 536.34,370.43ZM614.52,423.16L624.53,419.32 621.63,427.95Z
                           M222.87,31.93L232.87,28.09 229.97,36.73ZM308.15,89.46L318.16,85.62 315.26,94.25ZM393.43,146.98L403.44,143.14 400.54,151.78ZM478.72,204.51L488.72,200.67 485.82,209.3ZM564,262.03L574.01,258.19 571.11,266.82ZM649.28,319.55L659.29,315.71 656.39,324.35ZM428.2,43.38L438.2,39.54 435.3,48.17ZM513.48,100.9L523.49,97.06 520.59,105.69Z
                           M598.76,158.42L608.77,154.58 605.87,163.22ZM633.53,54.82L643.53,50.98 640.64,59.61Z"/>
                        <path stroke="#000" stroke-width="2" stroke-linecap="round" d="M0 675h0M0 0h0M675 675h0M675 0h0M1.74 627.44h0M3.47 579.88h0M5.21 532.31h0M6.95 484.75h0M8.69 437.19h0M10.42 389.63h0M12.16 342.06h0M13.9 294.5h0M15.64 246.94h0M17.37 199.38h0
                           M19.11 151.82h0M20.85 104.25h0M22.59 56.69h0M24.32 9.13h0M219.73 645.08h0M221.47 597.52h0M223.21 549.96h0M224.94 502.39h0M226.68 454.83h0M228.42 407.27h0M230.16 359.71h0M231.89 312.15h0M233.63 264.58h0M235.37 217.02h0
                           M237.11 169.46h0M238.84 121.9h0M240.58 74.33h0M242.32 26.77h0M437.73 662.72h0M439.46 615.16h0M441.2 567.6h0M442.94 520.04h0M444.68 472.48h0M446.41 424.91h0M448.15 377.35h0M449.89 329.79h0M451.62 282.23h0M453.36 234.66h0
                           M455.1 187.1h0M456.84 139.54h0M458.57 91.98h0M460.31 44.42h0M657.46 632.81h0M659.2 585.24h0M660.93 537.68h0M662.67 490.12h0M664.41 442.56h0M666.14 394.99h0M667.88 347.43h0M669.62 299.87h0M671.36 252.31h0M673.09 204.75h0
                           M674.83 157.18h0M-0.17 157.18h0M72.17 665.85h0M73.9 618.29h0M75.64 570.73h0M77.38 523.17h0M79.12 475.6h0M80.85 428.04h0M82.59 380.48h0M84.33 332.92h0M86.07 285.36h0M87.8 237.79h0M89.54 190.23h0M91.28 142.67h0
                           M93.02 95.11h0M94.75 47.54h0M291.9 635.93h0M293.64 588.37h0M295.37 540.81h0M297.11 493.25h0M298.85 445.69h0M300.59 398.12h0M302.32 350.56h0M304.06 303h0M305.8 255.44h0M307.53 207.87h0M309.27 160.31h0M311.01 112.75h0
                           M312.75 65.19h0M314.48 17.63h0M509.89 653.58h0M511.63 606.02h0M513.37 558.45h0M515.11 510.89h0M516.84 463.33h0M518.58 415.77h0M520.32 368.2h0M522.05 320.64h0M523.79 273.08h0M525.53 225.52h0M527.27 177.96h0M529 130.39h0
                           M530.74 82.83h0M532.48 35.27h0M146.37 655.14h0M148.11 607.58h0M149.85 560.02h0M151.59 512.45h0M153.32 464.89h0M155.06 417.33h0M156.8 369.77h0M158.54 322.21h0M160.27 274.64h0M162.01 227.08h0M163.75 179.52h0M165.49 131.96h0
                           M167.22 84.39h0M168.96 36.83h0M364.37 672.78h0M366.11 625.22h0M367.84 577.66h0M369.58 530.1h0M371.32 482.54h0M373.06 434.97h0M374.79 387.41h0M376.53 339.85h0M378.27 292.29h0M380 244.72h0M381.74 197.16h0M383.48 149.6h0
                           M385.22 102.04h0M386.95 54.48h0M388.69 6.91h0M584.1 642.87h0M585.84 595.3h0M587.58 547.74h0M589.31 500.18h0M591.05 452.62h0M592.79 405.05h0M594.52 357.49h0M596.26 309.93h0M598 262.37h0M599.74 214.81h0M601.47 167.24h0
                           M603.21 119.68h0M604.95 72.12h0M606.69 24.56h0M15.64 158.91h0M53.22 102.56h0M90.81 46.21h0M7.82 416.95h0M45.4 360.6h0M82.99 304.25h0M120.58 247.9h0M158.16 191.55h0M195.75 135.2h0M233.34 78.84h0M270.92 22.49h0
                           M37.59 618.65h0M75.17 562.3h0M112.76 505.95h0M150.34 449.59h0M187.93 393.24h0M225.52 336.89h0M263.1 280.54h0M300.69 224.19h0M338.27 167.84h0M375.86 111.48h0M413.45 55.13h0M180.11 651.29h0M217.7 594.94h0M255.28 538.58h0
                           M292.87 482.23h0M330.46 425.88h0M368.04 369.53h0M405.63 313.18h0M443.21 256.83h0M480.8 200.48h0M518.39 144.12h0M555.97 87.77h0M593.56 31.42h0M360.22 627.58h0M397.81 571.22h0M435.39 514.87h0M472.98 458.52h0M510.57 402.17h0
                           M548.15 345.82h0M585.74 289.47h0M623.33 233.11h0M660.91 176.76h0M502.75 660.22h0M540.33 603.86h0M577.92 547.51h0M615.51 491.16h0M653.09 434.81h0M2.4 6.44h0M32.16 208.14h0M69.75 151.78h0M107.34 95.43h0M144.92 39.08h0
                           M24.34 466.18h0M61.93 409.83h0M99.52 353.48h0M137.1 297.13h0M174.69 240.78h0M212.27 184.42h0M249.86 128.07h0M287.45 71.72h0M325.03 15.37h0M54.11 667.88h0M91.7 611.52h0M129.28 555.17h0M166.87 498.82h0M204.46 442.47h0
                           M242.04 386.12h0M279.63 329.77h0M317.21 273.42h0M354.8 217.06h0M392.39 160.71h0M429.97 104.36h0M467.56 48.01h0M234.22 644.16h0M271.81 587.81h0M309.39 531.46h0M346.98 475.11h0M384.57 418.76h0M422.15 362.41h0M459.74 306.05h0
                           M497.33 249.7h0M534.91 193.35h0M572.5 137h0M610.08 80.65h0M647.67 24.3h0M414.33 620.45h0M451.92 564.1h0M489.51 507.75h0M527.09 451.4h0M564.68 395.05h0M602.26 338.69h0M639.85 282.34h0M556.86 653.09h0M594.45 596.74h0
                           M632.03 540.39h0M669.62 484.04h0M17.46 107.27h0M55.04 50.91h0M9.64 365.31h0M47.22 308.96h0M84.81 252.61h0M122.4 196.26h0M159.98 139.91h0M197.57 83.55h0M235.15 27.2h0M1.82 623.36h0M39.4 567.01h0M76.99 510.65h0
                           M114.58 454.3h0M152.16 397.95h0M189.75 341.6h0M227.34 285.25h0M264.92 228.9h0M302.51 172.54h0M340.09 116.19h0M377.68 59.84h0M415.27 3.49h0M144.34 656h0M181.93 599.65h0M219.52 543.29h0M257.1 486.94h0M294.69 430.59h0
                           M332.27 374.24h0M369.86 317.89h0M407.45 261.54h0M445.03 205.18h0M482.62 148.83h0M520.2 92.48h0M557.79 36.13h0M324.46 632.28h0M362.04 575.93h0M399.63 519.58h0M437.21 463.23h0M474.8 406.88h0M512.39 350.53h0M549.97 294.18h0
                           M587.56 237.82h0M625.14 181.47h0M662.73 125.12h0M466.98 664.92h0M504.57 608.57h0M542.15 552.22h0M579.74 495.87h0M617.33 439.52h0M654.91 383.17h0M647.09 641.21h0M40.59 86.02h0M116.86 89.24h0M193.13 92.47h0M269.4 95.69h0
                           M345.67 98.91h0M421.94 102.13h0M498.21 105.36h0M574.48 108.58h0M650.75 111.8h0M60.61 234.88h0M136.88 238.1h0M213.15 241.32h0M289.42 244.54h0M365.69 247.77h0M441.96 250.99h0M518.23 254.21h0M594.5 257.43h0M670.77 260.66h0
                           M4.36 380.51h0M80.63 383.73h0M156.9 386.96h0M233.17 390.18h0M309.44 393.4h0M385.71 396.62h0M461.98 399.85h0M538.25 403.07h0M614.52 406.29h0M24.39 529.37h0M100.66 532.59h0M176.93 535.81h0M253.2 539.03h0M329.46 542.26h0
                           M405.73 545.48h0M482 548.7h0M558.27 551.92h0M634.54 555.15h0M70.71 105.21h0M146.98 108.44h0M223.25 111.66h0M299.52 114.88h0M375.79 118.1h0M452.06 121.32h0M528.33 124.55h0M604.6 127.77h0M14.47 250.85h0M90.74 254.07h0
                           M167.01 257.29h0M243.28 260.51h0M319.54 263.74h0M395.81 266.96h0M472.08 270.18h0M548.35 273.4h0M624.62 276.63h0M34.49 399.7h0M110.76 402.92h0M187.03 406.15h0M263.3 409.37h0M339.57 412.59h0M415.84 415.81h0M492.11 419.04h0
                           M568.38 422.26h0M644.65 425.48h0M54.51 548.56h0M130.78 551.78h0M207.05 555h0M283.32 558.23h0M359.59 561.45h0M435.86 564.67h0M512.13 567.89h0M588.4 571.12h0M664.67 574.34h0M68.41 13.01h0M144.68 16.23h0M220.95 19.46h0
                           M297.22 22.68h0M373.49 25.9h0M449.76 29.12h0M526.03 32.35h0M602.3 35.57h0M12.16 158.65h0M88.43 161.87h0M164.7 165.09h0M240.97 168.31h0M317.24 171.54h0M393.51 174.76h0M469.78 177.98h0M546.05 181.2h0M622.32 184.43h0
                           M32.19 307.5h0M108.46 310.72h0M184.73 313.95h0M261 317.17h0M337.26 320.39h0M413.53 323.61h0M489.8 326.84h0M566.07 330.06h0M642.34 333.28h0M52.21 456.36h0M128.48 459.58h0M204.75 462.8h0M281.02 466.03h0M357.29 469.25h0
                           M433.56 472.47h0M509.83 475.69h0M586.1 478.91h0M662.37 482.14h0M72.23 605.21h0M148.5 608.44h0M224.77 611.66h0M301.04 614.88h0M377.31 618.1h0M453.58 621.33h0M529.85 624.55h0M606.12 627.77h0M38.44 117.93h0M121.76 103.63h0
                           M205.08 89.33h0M288.41 75.03h0M371.73 60.72h0M455.05 46.42h0M538.37 32.12h0M621.7 17.82h0M38.02 298.86h0M121.34 284.55h0M204.66 270.25h0M287.98 255.95h0M371.31 241.65h0M454.63 227.34h0M537.95 213.04h0M621.28 198.74h0
                           M37.6 479.78h0M120.92 465.47h0M204.24 451.17h0M287.56 436.87h0M370.89 422.57h0M454.21 408.26h0M537.53 393.96h0M620.85 379.66h0M37.17 660.7h0M120.5 646.4h0M203.82 632.09h0M287.14 617.79h0M370.46 603.49h0M453.79 589.19h0
                           M537.11 574.88h0M620.43 560.58h0M72.67 149.3h0M156 135h0M239.32 120.7h0M322.64 106.4h0M405.96 92.1h0M489.29 77.79h0M572.61 63.49h0M655.93 49.19h0M72.25 330.23h0M155.57 315.92h0M238.9 301.62h0M322.22 287.32h0
                           M405.54 273.02h0M488.86 258.71h0M572.19 244.41h0M655.51 230.11h0M71.83 511.15h0M155.15 496.84h0M238.48 482.54h0M321.8 468.24h0M405.12 453.94h0M488.44 439.64h0M571.77 425.33h0M655.09 411.03h0M238.05 663.46h0M321.38 649.16h0
                           M404.7 634.86h0M488.02 620.56h0M571.35 606.25h0M654.67 591.95h0M44.34 32.69h0M127.66 18.38h0M210.98 4.08h0M43.92 213.61h0M127.24 199.3h0M210.56 185h0M293.88 170.7h0M377.21 156.4h0M460.53 142.1h0M543.85 127.79h0
                           M627.17 113.49h0M43.49 394.53h0M126.82 380.23h0M210.14 365.92h0M293.46 351.62h0M376.78 337.32h0M460.11 323.02h0M543.43 308.71h0M626.75 294.41h0M43.07 575.45h0M126.4 561.15h0M209.72 546.84h0M293.04 532.54h0M376.36 518.24h0
                           M459.69 503.94h0M543.01 489.63h0M626.33 475.33h0M542.59 670.56h0M625.91 656.25h0"/>
                      </pattern>
                      <clipPath id="fp-concrete-clip">
                        <rect width="200" height="200"/>
                      </clipPath>
                    </defs>
                    <rect width="200" height="200" fill="#fff" stroke="#bbb" stroke-width="5"/>
                    <rect width="200" height="200" fill="url(#fp-concrete)" clip-path="url(#fp-concrete-clip)"/>
                  </svg>
                </button>
                <button type="button" class="fill-pattern-btn" data-pattern="wood" title="Wood">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <defs>
                      <!-- legno4.pat ("legname" = wood): 3 line families at angles 216.8699,
                           206.5651, 198.4349 degrees -- i.e. 180 + atan(3/4), atan(1/2), atan(1/3),
                           three progressively shallower diagonal slopes. Each family's single
                           dash-on segment, taken literally from its origin/angle/length, ends
                           exactly where the next family's origin begins (mod the 1x1-unit repeat
                           cell) -- e.g. row 1 ends at (0,0.7), row 2 starts at (1.0,0.7), the same
                           point one tile-width over -- so the three segments chain into one
                           continuous zigzag "wavy grain" line that reconnects seamlessly across
                           tile boundaries in both x and y, per the reference: tiled end-to-end the
                           wavy diagonal should run unbroken. Scaled by 20 (raw units -> SVG units),
                           matching legno3/wood's earlier scale factor. -->
                      <pattern id="fp-wood" width="20" height="20" patternUnits="userSpaceOnUse">
                        <g stroke="#000" stroke-width="0.5" stroke-linecap="round">
                          <line x1="8" y1="20" x2="0" y2="14"/>
                          <line x1="20" y1="14" x2="0" y2="4"/>
                          <line x1="20" y1="4" x2="8" y2="0"/>
                        </g>
                      </pattern>
                      <clipPath id="fp-wood-clip">
                        <rect width="40" height="40"/>
                      </clipPath>
                    </defs>
                    <rect width="40" height="40" fill="#fff" stroke="#bbb" stroke-width="1"/>
                    <rect width="40" height="40" fill="url(#fp-wood)" clip-path="url(#fp-wood-clip)"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="menu-section"> <!--Grid toggle-->
          <!-- Grid toggle button -->
          <button type="button" class="palette-btn" id="grid-toggle" title="Toggle Grid Visibility&#10;Ctrl+G" style="margin-left: 0.2em;">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <rect x="2" y="2" width="24" height="24" stroke="#222" stroke-width="2" fill="none"/>
              <line x1="2" y1="10" x2="26" y2="10" stroke="#222" stroke-width="1"/>
              <line x1="2" y1="18" x2="26" y2="18" stroke="#222" stroke-width="1"/>
              <line x1="10" y1="2" x2="10" y2="26" stroke="#222" stroke-width="1"/>
              <line x1="18" y1="2" x2="18" y2="26" stroke="#222" stroke-width="1"/>
            </svg>
          </button>
        </div>
      </div>
      <!-- Sketch Container. It takes the space the other controls leave, and
           utils.resizeCanvas sizes the SVGs below to match it. -->
      <div class="sketch-container">
        <svg id="sketch-grid" width="720" height="500" viewBox="0 0 720 500" style="position: absolute; top: 0; left: 0; z-index: 0; pointer-events: none; display: none;">
          <!-- Elements inside the <g> are written in model coordinates. -->
          <g transform="matrix(1, 0, 0, -1, 0, 500)"></g>
        </svg>
        <div id="sketch" style="position: absolute; top: 0; left: 0; z-index: 1; pointer-events: all;">
          <svg class="active-sketch" width="720" height="500" viewBox="0 0 720 500" style="--scale: 1; --total-scale: 1;">
            <title>Sketch</title>
            <defs>
              <marker id="arrow" viewBox="0 0 12 7.8" refX="12" refY="3.9" markerWidth="12" markerHeight="7.8" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 12 3.9 L 0 7.8 z"/>
              </marker>
              <!-- Arrowheads for arrows and paths. Sizes are in stroke widths, so Sketch
                   picks the one that suits the stroke: thin 0.5px, arrow 1px, thick 2px, thicker 3px. -->
              <marker id="thinarrow" viewBox="0 0 20 12" refX="20" refY="6" markerWidth="20" markerHeight="12" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 20 6 L 0 12 z"/>
              </marker>
              <marker id="thickarrow" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="8" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 8 3 L 0 6 z"/>
              </marker>
              <marker id="thickerarrow" viewBox="0 0 6.5 4.4" refX="6.5" refY="2.2" markerWidth="6.5" markerHeight="4.4" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 6.5 2.2 L 0 4.4 z"/>
              </marker>
              <marker id="dimarrow" viewBox="0 0 18 12" refX="18" refY="6" markerWidth="18" markerHeight="12" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 18 6 L 0 12 z"/>
              </marker>
              <marker id="dot" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse">
                <circle cx="3" cy="3" r="3" fill="context-stroke"/>
              </marker>
              <!-- marker "arrowdot": a dot (as #dot) centered on the end point, with an arrowhead
                   whose tip touches the dot. One per arrowhead size, picked by stroke width. -->
              <marker id="thinarrowdot" viewBox="0 0 26 12" refX="23" refY="6" markerWidth="26" markerHeight="12" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 20 6 L 0 12 z"/>
                <circle cx="23" cy="6" r="3" fill="context-stroke"/>
              </marker>
              <marker id="arrowdot" viewBox="0 0 18 7.8" refX="15" refY="3.9" markerWidth="18" markerHeight="7.8" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 12 3.9 L 0 7.8 z"/>
                <circle cx="15" cy="3.9" r="3" fill="context-stroke"/>
              </marker>
              <marker id="thickarrowdot" viewBox="0 0 14 6" refX="11" refY="3" markerWidth="14" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 8 3 L 0 6 z"/>
                <circle cx="11" cy="3" r="3" fill="context-stroke"/>
              </marker>
              <marker id="thickerarrowdot" viewBox="0 -0.8 12.5 6" refX="9.5" refY="2.2" markerWidth="12.5" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse">
                <path style="stroke:none!important" fill="context-stroke" d="M 0 0 L 6.5 2.2 L 0 4.4 z"/>
                <circle cx="9.5" cy="2.2" r="3" fill="context-stroke"/>
              </marker>
            </defs>
            <!-- The \`grid\` and \`axes\` statements, drawn by src/gridAxes.js beneath the
                 shapes, in model coordinates. Not part of the model <g>, so no tool
                 can reach them; utils.redrawCanvas gives it the model's transform. -->
            <g id="backdrop-layer" transform="matrix(1, 0, 0, -1, 0, 500)" pointer-events="none"></g>
            <!-- Elements inside the model <g> are written in model coordinates. -->
            <g class="model" transform="matrix(1, 0, 0, -1, 0, 500)">
              <g id="shapes-layer"></g>
              <g id="temporary-layer"></g> <!-- Transient tool UI: dimension points, trim reference line, resize handles, move/duplicate preview, shape-library insert preview -->
            </g>
          </svg>
        </div>
      </div>
      <!-- Text input and coordinate display -->
      <div id="input-coord">
        <div id="text-input-container">
          <div id="ok-button-container">
            <button id="input-ok" data-scope="1">OK</button>
            <button id="input-cancel">Cancel</button>
          </div>
          <div id="text-input" contenteditable="true"></div>
        </div>
        <!-- Shown only while the Text tool is active or a text element is being edited -->
        <div id="text-controls">
          <select id="text-position" title="Text position relative to chosen point">
            <option value="above">Above</option>
            <option value="below">Below</option>
            <option value="middle" selected>Middle</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
          <!-- Values are px: 1 pt = 4/3 px -->
          <select id="font-size" title="Font size">
            <option value="10.67">8 pt</option>
            <option value="12">9 pt</option>
            <option value="13.33" selected>10 pt</option>
            <option value="16">12 pt</option>
            <option value="24">18 pt</option>
            <option value="32">24 pt</option>
            <option value="48">36 pt</option>
          </select>
        </div>
        <table id="coordinate-display">
          <tbody>
            <tr>  <th></th>         <th>x</th>  <th>y</th>  </tr>
            <tr>  <td >Global</td>  <td>0</td>  <td>0</td>  </tr>
            <tr>  <td>Local</td>    <td>0</td>  <td>0</td>  </tr>
            <tr>  <td></td>         <td></td>   <td></td>   </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`
