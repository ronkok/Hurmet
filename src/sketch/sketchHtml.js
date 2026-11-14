// The Sketch dialog's markup and styles.
// Converted from Sketch's index.html <body> and sketch-styles.css, where Sketch
// owned the whole page. Inside Hurmet, the markup goes into <dialog id="sketch-dialog">
// (see sketch.js openSketch) and the styles are scoped to that dialog.

import { fillPatternDef } from "./fillPatterns.js"

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
                      ${fillPatternDef("diagonal", "fp-diagonal")}
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
                      ${fillPatternDef("crosshatch", "fp-crosshatch")}
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
                      ${fillPatternDef("grid", "fp-grid")}
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
                      ${fillPatternDef("earth", "fp-earth")}
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
                      ${fillPatternDef("sand", "fp-sand")}
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
                      ${fillPatternDef("gravel", "fp-gravel")}
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
                      ${fillPatternDef("concrete", "fp-concrete")}
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
                      ${fillPatternDef("wood", "fp-wood")}
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
