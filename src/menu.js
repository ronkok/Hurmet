/* eslint-disable */
import {
  wrapItem,
  blockTypeItem,
  Dropdown,
  joinUpItem,
  DropdownSubmenu,
  undoItem,
  redoItem,
  icons,
  MenuItem
} from "prosemirror-menu"
import { NodeSelection, TextSelection } from "prosemirror-state"
import { insertPoint } from "prosemirror-transform"
import { lift, selectParentNode, toggleMark } from "prosemirror-commands"
import { schema, wrapInList } from "./schema"
import { TextField, TextAreaField, openPrompt } from "./prompt"
import { openSelectPrompt } from "./selectprompt"
import { isInTable, addColumnBefore, deleteColumn,
  addRowBefore, deleteRow, mergeCells, splitCell,
  toggleHeaderColumn, deleteTable, CellSelection,
  TableMap } from "prosemirror-tables"

import hurmet from "./hurmet"
import { draftMode } from "./draftMode"
import { hurmetMarkdownSerializer } from "./to_markdown"
import { readFile } from "./openfile"
import { saveAs } from "filesaver.js-npm"
import { findPageBreaks, forToC, forPrint } from "./paginate.js"
import { diff_match_patch } from "./diffMatchPatch"
import { dt } from "./constants.js"

// Menu icons that are not included in node-module menu.js
const hurmetIcons = {
  navicon: {
    width: 16,
    height: 16,
    path: "M3 4h10v1.5h-20z M3 8h10v1.5h-20z M3 12h10v1.5h-20z"
  },
  recalc: {
    width: 16,
    height: 16,
    path: "M0 9c0 2.389 1.048 4.534 2.709 6l1.323-1.5c-1.246-1.099-2.031-2.708-2.031-4.5 0-3.314 2.686-6 6-6 1.657 0 3.157 0.672 4.243 1.757l-2.243 2.243h6v-6l-2.343 2.343c-1.448-1.448-3.448-2.343-5.657-2.343-4.418 0-8 3.582-8 8z"
  },
  subscript: { text: "X₂", css: "font-weight: bold" },
  superscript: { text: "X²", css: "font-weight: bold" },
  strikethru: {
    width: 1024,
    height: 1024,
    path:
      "M1024 512v64h-234.506c27.504 38.51 42.506 82.692 42.506 128 0 70.878-36.66 139.026-100.58 186.964-59.358 44.518-137.284 69.036-219.42 69.036-82.138 0-160.062-24.518-219.42-69.036-63.92-47.938-100.58-116.086-100.58-186.964h128c0 69.382 87.926 128 192 128s192-58.618 192-128c0-69.382-87.926-128-192-128h-512v-64h299.518c-2.338-1.654-4.656-3.324-6.938-5.036-63.92-47.94-100.58-116.086-100.58-186.964s36.66-139.024 100.58-186.964c59.358-44.518 137.282-69.036 219.42-69.036 82.136 0 160.062 24.518 219.42 69.036 63.92 47.94 100.58 116.086 100.58 186.964h-128c0-69.382-87.926-128-192-128s-192 58.618-192 128c0 69.382 87.926 128 192 128 78.978 0 154.054 22.678 212.482 64h299.518z"
  },
  underline: {
    width: 1024,
    height: 1024,
    path:
      "M704 64h128v416c0 159.058-143.268 288-320 288-176.73 0-320-128.942-320-288v-416h128v416c0 40.166 18.238 78.704 51.354 108.506 36.896 33.204 86.846 51.494 140.646 51.494s103.75-18.29 140.646-51.494c33.116-29.802 51.354-68.34 51.354-108.506v-416zM192 832h640v128h-640z"
  },
  highlight: { text: "🟨" },
  paragraph: {
    width: 24,
    height: 24,
    path: "M22.5.248H7.228a6.977,6.977,0,1,0,0,13.954H9.546a.25.25,0,0,1,.25.25V22.5a1.25,1.25,0,0,0,2.5,0V3a.25.25,0,0,1,.25-.25h3.682a.25.25,0,0,1,.25.25V22.5a1.25,1.25,0,0,0,2.5,0V3a.249.249,0,0,1,.25-.25H22.5a1.25,1.25,0,0,0,0-2.5ZM9.8,11.452a.25.25,0,0,1-.25.25H7.228a4.477,4.477,0,1,1,0-8.954H9.546A.25.25,0,0,1,9.8,3Z"
  },
  upload: {
    width: 16,
    height: 16,
    path: "M7 9h2v-4h3l-4-4-4 4h3zM10 6.75v1.542l4.579 1.708-6.579 2.453-6.579-2.453 4.579-1.708v-1.542l-6 2.25v4l8 3 8-3v-4z"
  },
  image: {
    width: 16,
    height: 16,
    path: "M14.998 2c0.001 0.001 0.001 0.001 0.002 0.002v11.996c-0.001 0.001-0.001 0.001-0.002 0.002h-13.996c-0.001-0.001-0.001-0.001-0.002-0.002v-11.996c0.001-0.001 0.001-0.001 0.002-0.002h13.996zM15 1h-14c-0.55 0-1 0.45-1 1v12c0 0.55 0.45 1 1 1h14c0.55 0 1-0.45 1-1v-12c0-0.55-0.45-1-1-1v0z M13 4.5c0 0.828-0.672 1.5-1.5 1.5s-1.5-0.672-1.5-1.5 0.672-1.5 1.5-1.5 1.5 0.672 1.5 1.5z M14 13h-12v-2l3.5-6 4 5h1l3.5-3z"
  },
  "T": {
    width: 16,
    height: 16,
    path: "M.8 4.5V.3c.1-.5.6-.2 1-.3h12.8c.4.2.2.7.3 1v3.5c-.4.7-1.1-.1-1-.7a4 4 0 0 0-2.7-2.7C10.8 1 9.8.6 9.7 1v12.8c0 .8.3 1.5 1.2 1.3.6-.2 1.6.5.8.9H3.9c-.8-.6.4-1 1-.9 1 .2 1-.8 1-1.6V.8c-1.2.2-2.6.5-3.4 1.5-.7.7-.8 1.6-1 2.4-.2.2-.6.1-.7-.2ZM2.6 1c.4-.2.3-.2 0-.2h-1V2ZM9 7.8v-7H6.8l-.1 13.5c.1.4-.4 1 .2.9H9c-.3-.5.1-1.2 0-1.7Zm4.8-6.1c.1 0 .4.5.3 0V.9h-1.3l1 .9z"
  },
  "C": {
    width: 16,
    height: 16,
    path: "M14.8 12.3c.9.2 0 1.1-.4 1.4-.7.6-1.4 1-2.2 1.5-1.8.8-3.8 1-5.8.5a7 7 0 0 1-4.3-2.9 8 8 0 0 1-1.2-5c-.1-2.2.8-4.6 2.6-6.1A8 8 0 0 1 8 0a6 6 0 0 1 2.7.4c.8.4 1.8.6 2.7.6.5-.2.4-1.4 1.1-.9.2.4 0 .8.1 1.1v3.7c-.4.8-1-.3-1.1-.8A6.3 6.3 0 0 0 9.6 1c-1-.2-2.3-.1-3 .7-1.4 1.4-1.7 3.4-1.9 5.2-.1 2.1.1 4.3 1 6.1.7 1.2 2 2 3.3 1.9 2 0 4-1 5.5-2.5l.3-.1ZM5.5 1.7c.4-.3.3-.5-.1-.2-1.5.7-2.7 1.9-3.3 3.4a8.5 8.5 0 0 0-.2 5.3 6 6 0 0 0 3.2 4.2c.4.2 1.3.7.7 0-1.2-1.2-1.6-3-1.8-4.6V6c.3-1.5.6-3 1.5-4.2Zm8 1c.2.3.4.3.3 0v-1c-.3.2-.7 0-1 .1.1.4.4.6.7.9z"
  },
  comment: {
    width: 1024,
    height: 1024,
    path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
  },
  tighten: {
    width: 16,
    height: 16,
    path: "M0 4h3v2.75h-3z M4.5 4H16v2.75H4.5z M0 9h3v2.75h-3z M4.5 9H16v2.75H4.5z M7 0H13.5L10.25 4 M7 16L10.25 12L13.5 16z"
  },
  table: {
    width: 24,
    height: 24,
    path: "M17,17 L17,22 L19,22 C20.6568542,22 22,20.6568542 22,19 L22,17 L17,17 Z M15,17 L9,17 L9,22 L15,22 L15,17 Z M17,15 L22,15 L22,9 L17,9 L17,15 Z M15,15 L15,9 L9,9 L9,15 L15,15 Z M17,7 L22,7 L22,5 C22,3.34314575 20.6568542,2 19,2 L17,2 L17,7 Z M15,7 L15,2 L9,2 L9,7 L15,7 Z M24,16.1768671 L24,19 C24,21.7614237 21.7614237,24 19,24 L5,24 C2.23857625,24 2.11453371e-15,21.7614237 1.77635684e-15,19 L0,5 C-3.38176876e-16,2.23857625 2.23857625,2.28362215e-15 5,0 L19,0 C21.7614237,-5.07265313e-16 24,2.23857625 24,5 L24,7.82313285 C24.0122947,7.88054124 24.0187107,7.93964623 24.0187107,8 C24.0187107,8.06035377 24.0122947,8.11945876 24,8.17686715 L24,15.8231329 C24.0122947,15.8805412 24.0187107,15.9396462 24.0187107,16 C24.0187107,16.0603538 24.0122947,16.1194588 24,16.1768671 Z M7,2 L5,2 C3.34314575,2 2,3.34314575 2,5 L2,7 L7,7 L7,2 Z M2,9 L2,15 L7,15 L7,9 L2,9 Z M2,17 L2,19 C2,20.6568542 3.34314575,22 5,22 L7,22 L7,17 L2,17 Z"
  },
  delete_table: {
    width: 24,
    height: 24,
    path: "M19,14 C21.7600532,14.0033061 23.9966939,16.2399468 24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 C14,16.2385763 16.2385763,14 19,14 Z M16.5,19.9375 L21.5,19.9375 C22.017767,19.9375 22.4375,19.517767 22.4375,19 C22.4375,18.482233 22.017767,18.0625 21.5,18.0625 L16.5,18.0625 C15.982233,18.0625 15.5625,18.482233 15.5625,19 C15.5625,19.517767 15.982233,19.9375 16.5,19.9375 Z M12.2898787,17 L9,17 L9,22 L12.6736312,22 C13.0297295,22.7496048 13.515133,23.4258795 14.1010173,24 L5,24 C2.23857625,24 -1.43817996e-15,21.7614237 -1.77635684e-15,19 L-3.55271368e-15,5 C-3.89089055e-15,2.23857625 2.23857625,5.07265313e-16 5,-1.77635684e-15 L19,-1.77635684e-15 C21.7614237,-2.28362215e-15 24,2.23857625 24,5 L24,7.82313285 C24.0122947,7.88054124 24.0187107,7.93964623 24.0187107,8 C24.0187107,8.06035377 24.0122947,8.11945876 24,8.17686715 L24,14.1010173 C23.4258795,13.515133 22.7496048,13.0297295 22,12.6736312 L22,9 L17,9 L17,12.2898787 C16.2775651,12.5048858 15.6040072,12.8333806 15,13.2546893 L15,9 L9,9 L9,15 L13.2546893,15 C12.8333806,15.6040072 12.5048858,16.2775651 12.2898787,17 Z M17,7 L22,7 L22,5 C22,3.34314575 20.6568542,2 19,2 L17,2 L17,7 Z M15,7 L15,2 L9,2 L9,7 L15,7 Z M7,2 L5,2 C3.34314575,2 2,3.34314575 2,5 L2,7 L7,7 L7,2 Z M2,9 L2,15 L7,15 L7,9 L2,9 Z M2,17 L2,19 C2,20.6568542 3.34314575,22 5,22 L7,22 L7,17 L2,17 Z"
  },
  add_col_before: {
    width: 24,
    height: 24,
    path: "M19,14 C21.7600532,14.0033061 23.9966939,16.2399468 24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 C14,16.2385763 16.2385763,14 19,14 Z M21.5,19.9375 C22.017767,19.9375 22.4375,19.517767 22.4375,19 C22.4375,18.482233 22.017767,18.0625 21.5,18.0625 L20.25,18.0625 C20.077411,18.0625 19.9375,17.922589 19.9375,17.75 L19.9375,16.5 C19.9375,15.982233 19.517767,15.5625 19,15.5625 C18.482233,15.5625 18.0625,15.982233 18.0625,16.5 L18.0625,17.75 C18.0625,17.922589 17.922589,18.0625 17.75,18.0625 L16.5,18.0625 C15.982233,18.0625 15.5625,18.482233 15.5625,19 C15.5625,19.517767 15.982233,19.9375 16.5,19.9375 L17.75,19.9375 C17.922589,19.9375 18.0625,20.077411 18.0625,20.25 L18.0625,21.5 C18.0625,22.017767 18.482233,22.4375 19,22.4375 C19.517767,22.4375 19.9375,22.017767 19.9375,21.5 L19.9375,20.25 C19.9375,20.077411 20.077411,19.9375 20.25,19.9375 L21.5,19.9375 Z M2,19 C2,20.6568542 3.34314575,22 5,22 C6.65685425,22 8,20.6568542 8,19 L8,5 C8,3.34314575 6.65685425,2 5,2 C3.34314575,2 2,3.34314575 2,5 L2,19 Z M-2.7585502e-16,19 L5.81397739e-16,5 C-1.37692243e-16,2.23857625 2.23857625,0 5,0 C7.76142375,0 10,2.23857625 10,5 L10,19 C10,21.7614237 7.76142375,24 5,24 C2.23857625,24 4.43234962e-16,21.7614237 -2.7585502e-16,19 Z"
  },
  add_col_after: {
    width: 24,
    height: 24,
    path: "M5,14 C7.76005315,14.0033061 9.99669388,16.2399468 10,19 C10,21.7614237 7.76142375,24 5,24 C2.23857625,24 1.77635684e-15,21.7614237 1.77635684e-15,19 C1.77635684e-15,16.2385763 2.23857625,14 5,14 Z M7.5,19.9375 C8.01776695,19.9375 8.4375,19.517767 8.4375,19 C8.4375,18.482233 8.01776695,18.0625 7.5,18.0625 L6.25,18.0625 C6.07741102,18.0625 5.9375,17.922589 5.9375,17.75 L5.9375,16.5 C5.9375,15.982233 5.51776695,15.5625 5,15.5625 C4.48223305,15.5625 4.0625,15.982233 4.0625,16.5 L4.0625,17.75 C4.0625,17.922589 3.92258898,18.0625 3.75,18.0625 L2.5,18.0625 C1.98223305,18.0625 1.5625,18.482233 1.5625,19 C1.5625,19.517767 1.98223305,19.9375 2.5,19.9375 L3.75,19.9375 C3.92258898,19.9375 4.0625,20.077411 4.0625,20.25 L4.0625,21.5 C4.0625,22.017767 4.48223305,22.4375 5,22.4375 C5.51776695,22.4375 5.9375,22.017767 5.9375,21.5 L5.9375,20.25 C5.9375,20.077411 6.07741102,19.9375 6.25,19.9375 L7.5,19.9375 Z M16,19 C16,20.6568542 17.3431458,22 19,22 C20.6568542,22 22,20.6568542 22,19 L22,5 C22,3.34314575 20.6568542,2 19,2 C17.3431458,2 16,3.34314575 16,5 L16,19 Z M14,19 L14,5 C14,2.23857625 16.2385763,0 19,0 C21.7614237,0 24,2.23857625 24,5 L24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 Z"
  },
  add_row_before: {
    width: 24,
    height: 24,
    path: "M19,14 C21.7600532,14.0033061 23.9966939,16.2399468 24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 C14,16.2385763 16.2385763,14 19,14 Z M21.5,19.9375 C22.017767,19.9375 22.4375,19.517767 22.4375,19 C22.4375,18.482233 22.017767,18.0625 21.5,18.0625 L20.25,18.0625 C20.077411,18.0625 19.9375,17.922589 19.9375,17.75 L19.9375,16.5 C19.9375,15.982233 19.517767,15.5625 19,15.5625 C18.482233,15.5625 18.0625,15.982233 18.0625,16.5 L18.0625,17.75 C18.0625,17.922589 17.922589,18.0625 17.75,18.0625 L16.5,18.0625 C15.982233,18.0625 15.5625,18.482233 15.5625,19 C15.5625,19.517767 15.982233,19.9375 16.5,19.9375 L17.75,19.9375 C17.922589,19.9375 18.0625,20.077411 18.0625,20.25 L18.0625,21.5 C18.0625,22.017767 18.482233,22.4375 19,22.4375 C19.517767,22.4375 19.9375,22.017767 19.9375,21.5 L19.9375,20.25 C19.9375,20.077411 20.077411,19.9375 20.25,19.9375 L21.5,19.9375 Z M5,2 C3.34314575,2 2,3.34314575 2,5 C2,6.65685425 3.34314575,8 5,8 L19,8 C20.6568542,8 22,6.65685425 22,5 C22,3.34314575 20.6568542,2 19,2 L5,2 Z M5,0 L19,0 C21.7614237,-5.07265313e-16 24,2.23857625 24,5 C24,7.76142375 21.7614237,10 19,10 L5,10 C2.23857625,10 3.38176876e-16,7.76142375 0,5 C-1.2263553e-15,2.23857625 2.23857625,5.07265313e-16 5,0 Z"
  },
  add_row_after: {
    width: 24,
    height: 24,
    path: "M19,0 C21.7600532,0.00330611633 23.9966939,2.23994685 24,5 C24,7.76142375 21.7614237,10 19,10 C16.2385763,10 14,7.76142375 14,5 C14,2.23857625 16.2385763,0 19,0 Z M21.5,5.9375 C22.017767,5.9375 22.4375,5.51776695 22.4375,5 C22.4375,4.48223305 22.017767,4.0625 21.5,4.0625 L20.25,4.0625 C20.077411,4.0625 19.9375,3.92258898 19.9375,3.75 L19.9375,2.5 C19.9375,1.98223305 19.517767,1.5625 19,1.5625 C18.482233,1.5625 18.0625,1.98223305 18.0625,2.5 L18.0625,3.75 C18.0625,3.92258898 17.922589,4.0625 17.75,4.0625 L16.5,4.0625 C15.982233,4.0625 15.5625,4.48223305 15.5625,5 C15.5625,5.51776695 15.982233,5.9375 16.5,5.9375 L17.75,5.9375 C17.922589,5.9375 18.0625,6.07741102 18.0625,6.25 L18.0625,7.5 C18.0625,8.01776695 18.482233,8.4375 19,8.4375 C19.517767,8.4375 19.9375,8.01776695 19.9375,7.5 L19.9375,6.25 C19.9375,6.07741102 20.077411,5.9375 20.25,5.9375 L21.5,5.9375 Z M5,16 C3.34314575,16 2,17.3431458 2,19 C2,20.6568542 3.34314575,22 5,22 L19,22 C20.6568542,22 22,20.6568542 22,19 C22,17.3431458 20.6568542,16 19,16 L5,16 Z M5,14 L19,14 C21.7614237,14 24,16.2385763 24,19 C24,21.7614237 21.7614237,24 19,24 L5,24 C2.23857625,24 3.38176876e-16,21.7614237 0,19 C-1.2263553e-15,16.2385763 2.23857625,14 5,14 Z"
  },
  combine_cells: {
    width: 24,
    height: 24,
    path: "M2,19 C2,20.6568542 3.34314575,22 5,22 L19,22 C20.6568542,22 22,20.6568542 22,19 L22,5 C22,3.34314575 20.6568542,2 19,2 L5,2 C3.34314575,2 2,3.34314575 2,5 L2,19 Z M-1.16403344e-15,19 L-3.0678068e-16,5 C-6.44957556e-16,2.23857625 2.23857625,0 5,0 L19,0 C21.7614237,0 24,2.23857625 24,5 L24,19 C24,21.7614237 21.7614237,24 19,24 L5,24 C2.23857625,24 9.50500275e-16,21.7614237 -1.16403344e-15,19 Z M12,10 C12.5522847,10 13,10.4477153 13,11 L13,13 C13,13.5522847 12.5522847,14 12,14 C11.4477153,14 11,13.5522847 11,13 L11,11 C11,10.4477153 11.4477153,10 12,10 Z M12,16 C12.5522847,16 13,16.4477153 13,17 L13,20 C13,20.5522847 12.5522847,21 12,21 C11.4477153,21 11,20.5522847 11,20 L11,17 C11,16.4477153 11.4477153,16 12,16 Z M12,3 C12.5522847,3 13,3.44771525 13,4 L13,7 C13,7.55228475 12.5522847,8 12,8 C11.4477153,8 11,7.55228475 11,7 L11,4 C11,3.44771525 11.4477153,3 12,3 Z"
  },
  delete_col: {
    width: 24,
    height: 24,
    path: "M12.6414391,21.9312708 C12.9358807,22.5689168 13.3234155,23.1547532 13.7866134,23.6713497 C13.2317936,23.8836754 12.6294813,24 12,24 C9.23857625,24 7,21.7614237 7,19 L7,5 C7,2.23857625 9.23857625,0 12,0 C14.7614237,0 17,2.23857625 17,5 L17,12.2898787 C16.2775651,12.5048858 15.6040072,12.8333806 15,13.2546893 L15,5 C15,3.34314575 13.6568542,2 12,2 C10.3431458,2 9,3.34314575 9,5 L9,19 C9,20.6568542 10.3431458,22 12,22 C12.220157,22 12.4347751,21.9762852 12.6414391,21.9312708 Z M19,14 C21.7600532,14.0033061 23.9966939,16.2399468 24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 C14,16.2385763 16.2385763,14 19,14 Z M16.5,19.9375 L21.5,19.9375 C22.017767,19.9375 22.4375,19.517767 22.4375,19 C22.4375,18.482233 22.017767,18.0625 21.5,18.0625 L16.5,18.0625 C15.982233,18.0625 15.5625,18.482233 15.5625,19 C15.5625,19.517767 15.982233,19.9375 16.5,19.9375 Z"
  },
  delete_row: {
    width: 24,
    height: 24,
    path: "M13.2546893,15 C12.8333806,15.6040072 12.5048858,16.2775651 12.2898787,17 L5,17 C2.23857625,17 3.38176876e-16,14.7614237 0,12 C-1.2263553e-15,9.23857625 2.23857625,7 5,7 L19,7 C21.7614237,7 24,9.23857625 24,12 C24,12.6294813 23.8836754,13.2317936 23.6713497,13.7866134 C23.1547532,13.3234155 22.5689168,12.9358807 21.9312708,12.6414391 C21.9762852,12.4347751 22,12.220157 22,12 C22,10.3431458 20.6568542,9 19,9 L5,9 C3.34314575,9 2,10.3431458 2,12 C2,13.6568542 3.34314575,15 5,15 L13.2546893,15 Z M19,14 C21.7600532,14.0033061 23.9966939,16.2399468 24,19 C24,21.7614237 21.7614237,24 19,24 C16.2385763,24 14,21.7614237 14,19 C14,16.2385763 16.2385763,14 19,14 Z M16.5,19.9375 L21.5,19.9375 C22.017767,19.9375 22.4375,19.517767 22.4375,19 C22.4375,18.482233 22.017767,18.0625 21.5,18.0625 L16.5,18.0625 C15.982233,18.0625 15.5625,18.482233 15.5625,19 C15.5625,19.517767 15.982233,19.9375 16.5,19.9375 Z"
  },
  grid: {
    width: 16,
    height: 16,
    path: "M0 1v13h16v-13h-16zM6 9v-3h4v3h-4zM10 10v3h-4v-3h4zM10 2v3h-4v-3h4zM5 2v3h-4v-3h4zM1 6h4v3h-4v-3zM11 6h4v3h-4v-3zM11 5v-3h4v3h-4zM1 10h4v3h-4v-3zM11 13v-3h4v3h-4z"
  },
  nogrid: {text: "\u2b1a", css: "font-weight: bold"},
  oneRule: {
    width: 16,
    height: 16,
    path: "M0 2h16v-1.5h-16z"
  },
  twoRules: {
    width: 16,
    height: 16,
    path: "M0 2h16v-1h-16zM0 14h16v-1h-16z"
  },
  threeRules: {
    width: 16,
    height: 16,
    path: "M0 2h16v-2h-16zM0 5h16v-1h-16zM0 16h16v-2h-16z"
  },
  fourRules: {
    width: 16,
    height: 16,
    path: "M0 2h16v-2h-16zM0 5h16v-1h-16zM0 12h16v-1h-16zM0 16h16v-2h-16z"
  },
  rules: {
    width: 16,
    height: 16,
    path: "M0 1h16v1h-16zM0 5h16v1h-16zM0 9h16v1h-16zM0 13h16v1h-16z"
  },
  striped: {
    width: 16,
    height: 16,
    path: "M0 1h16v3h-16zM0 9h16v3h-16z"
  },
  cog: {
    width: 16,
    height: 16,
    path: "M14.59 9.535c-0.839-1.454-0.335-3.317 1.127-4.164l-1.572-2.723c-0.449 0.263-0.972 0.414-1.529 0.414-1.68 0-3.042-1.371-3.042-3.062h-3.145c0.004 0.522-0.126 1.051-0.406 1.535-0.839 1.454-2.706 1.948-4.17 1.106l-1.572 2.723c0.453 0.257 0.845 0.634 1.123 1.117 0.838 1.452 0.336 3.311-1.12 4.16l1.572 2.723c0.448-0.261 0.967-0.41 1.522-0.41 1.675 0 3.033 1.362 3.042 3.046h3.145c-0.001-0.517 0.129-1.040 0.406-1.519 0.838-1.452 2.7-1.947 4.163-1.11l1.572-2.723c-0.45-0.257-0.839-0.633-1.116-1.113zM8 11.24c-1.789 0-3.24-1.45-3.24-3.24s1.45-3.24 3.24-3.24c1.789 0 3.24 1.45 3.24 3.24s-1.45 3.24-3.24 3.24z"
  },
  "align-left": {
    width: 16,
    height: 16,
    path: "M0 1h16v2h-16zM0 4h10v2h-10zM0 10h10v2h-10zM0 7h16v2h-16zM0 13h16v2h-16"
  },
  "align-center": {
    width: 16,
    height: 16,
    path: "M0 1h16v2h-16zM3 4h10v2h-10zM3 10h10v2h-10zM0 7h16v2h-16zM0 13h16v2h-16z"
  },
  "align-right": {
    width: 16,
    height: 16,
    path: "M0 1h16v2h-16zM6 4h10v2h-10zM6 10h10v2h-10zM0 7h16v2h-16zM0 13h16v2h-16z"
  },
  info: {
    width: 16,
    height: 16,
    path: "M7 4.75c0-0.412 0.338-0.75 0.75-0.75h0.5c0.412 0 0.75 0.338 0.75 0.75v0.5c0 0.412-0.338 0.75-0.75 0.75h-0.5c-0.412 0-0.75-0.338-0.75-0.75v-0.5z M10 12h-4v-1h1v-3h-1v-1h3v4h1z M8 0c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zM8 14.5c-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5 6.5 2.91 6.5 6.5-2.91 6.5-6.5 6.5z"
  }
}


// Helpers to create specific types of items

function canInsert(state, nodeType) {
  let $from = state.selection.$from
  for (let d = $from.depth; d >= 0; d--) {
    let index = $from.index(d)
    if ($from.node(d).canReplaceWith(index, index, nodeType)) return true
  }
  return false
}

export function insertHeader(state, dispatch) {
  return new MenuItem({
    title: "Insert a print header",
    label: "Print header",
    enable() {
      return true
    },
    run(state, dispatch) {
      window.scrollTo(0, 0)

      // Don't overwrite an existing header.
      if (state.doc.nodeAt(0).type.name === "header") { return }

      // Insert the <header> element and an enclosed one-row <table>.
      dispatch(state.tr.insert(0, schema.nodeFromJSON(JSON.parse(
        `{"type":"header","content":[{"type":"table","attrs":{"class":"one-rule c2c c3r"},
"content":[{"type":"table_row","content":[{"type":"table_header","content":[
{"type":"paragraph","content":[{"type":"text","text":"left"}]}]},
{"type":"table_header","content":[{"type":"paragraph","content":[{"type":"text","text":"center"}]}]},
{"type":"table_header","content":[{"type":"paragraph","content":[{"type":"text","text":"$PAGE"}]}]}]}]}]}`
      ))))
    }
  })
}

const navigate = () => {
  return new MenuItem({
    title: "Navigate",
    icon: hurmetIcons.navicon,
    run(state, _, view) {
      // Get an array of the h1 nodes
      const buttons = [{ textContent: "Top", pos: 0 }]
      const bottom = view.dom.getBoundingClientRect().bottom - 320
      state.doc.nodesBetween(0, state.doc.content.size, function(node, pos) {
        if (node.type.name === "heading" && (node.attrs.level === 1 || node.attrs.level === 2)) {
          buttons.push({textContent: (node.attrs.level === 1)
            ? node.textContent
            : "\xa0\xa0\xa0\xa0" + node.textContent,
            pos: pos})
        }
      })
      buttons.push({ textContent: "Bottom", pos: bottom })
      // Open a dialog box and populate with buttons
      const callback = pos => {
        const headingTop = view.coordsAtPos(pos).top
        const boundingTop = view.dom.getBoundingClientRect().top
        window.scrollTo(0, headingTop - boundingTop + 180)
      }
      openSelectPrompt("Scroll to…", buttons, callback)
    }
  })
}

const tighten = () => {
  return new MenuItem({
    title: "Tighten list item",
    icon: hurmetIcons.tighten,
    select: state => {
      // Make the button visible only when inside a list item.
      const {$from, $to, node} = state.selection
      const parent = $from.node(-1)
      return ($from.node().type.name == "paragraph" && 
              parent.type.name == "list_item" &&
              parent.childCount < 2 &&
              $from.pos === $to.pos)
    },
    run(state, _, view) {
      const {$from, $to, node} = state.selection
      const pos = $from.pos
      const list = $from.node(-2)
      const listPos = $from.start(-2) - 1
      const ast = list.toJSON()
      for (const item of ast.content) {
        item.type = "tight_list_item"
      }
      const tightList = schema.nodeFromJSON(ast)
      const tr = state.tr
      tr.replaceWith(listPos, listPos + list.nodeSize, tightList)
      tr.setSelection(TextSelection.create(tr.doc, pos))
      view.dispatch(tr)
    }
  })
}

const findParentNode = predicate => selection => {
  const { $from } = selection;
  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (predicate(node)) {
      return {
        pos: i > 0 ? $from.before(i) : 0,
        start: $from.start(i),
        depth: i,
        node
      }
    }
  }
}

const print = () => {
  return new MenuItem({
    title: "Print",
    label: "Print…",
    run(state, _, view) {
      findPageBreaks(view, state, forPrint, schema.nodes.toc)
      window.print()
    }
  })
} 

const findTable = selection =>
  findParentNode(
    node => node.type.spec.tableRole && node.type.spec.tableRole === 'table'
  )(selection)

const isCellSelection = selection => {
  return selection instanceof CellSelection;
}
  // :: (selection: Selection) → ?{left: number, right: number, top: number, bottom: number}
// Get the selection rectangle. Returns `undefined` if selection is not a CellSelection.
const getSelectionRect = selection => {
  if (!isCellSelection(selection)) {
    return;
  }
  const start = selection.$anchorCell.start(-1);
  const map = TableMap.get(selection.$anchorCell.node(-1));
  return map.rectBetween(
    selection.$anchorCell.pos - start,
    selection.$headCell.pos - start
  )
}

const pruneHurmet = (state, view) => {
  const positions = [];
  const tr = state.tr
  // Traverse the doc and find locations of empty calculation zones.
  state.doc.nodesBetween(0, state.doc.content.size, function(node, pos) {
    if ((node.type.name === "calculation" && node.attrs.entry.length === 0) || 
        (node.type.name === "tex" && node.attrs.tex.length === 0)) {
      positions.push(pos)
    }
  })
  // Delete the empty nodes
  for (let i = positions.length - 1; i >= 0; i--) {
    tr.delete(positions[i], positions[i] + 1)
  }
  view.dispatch(tr)
}

export function deleteComments(state, dispatch) {
  return new MenuItem({
    title: "Delete all comments",
    label: "Delete all comments",
    enable() {
      return true
    },
    run(state, dispatch) {
      // Traverse the document tree and locate all comment nodes
      const positions = [];
      const tr = state.tr
      state.doc.nodesBetween(0, state.doc.content.size, function(node, pos) {
        if (node.type.name === "comment") {
          positions.push({ start: pos, end: pos + node.nodeSize })
        }
      })
      // Delete the comments
      for (let i = positions.length - 1; i >= 0; i--) {
        tr.delete(positions[i].start, positions[i].end)
      }
      dispatch(tr)
    }
  })
}

async function writeFile(fileHandle, contents) {
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();
  // Write the contents of the file to the stream.
  await writable.write(contents);
  // Close the file and write the contents to disk.
  await writable.close();
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Export saveFileAsMarkdown so that it is available in keymap.js
export function saveFileAsMarkdown(state, view) {
  // Prune the Hurmet math parts down to just the entry. Then stringify it.
  pruneHurmet(state, view)
  let str = `---------------
decimalFormat: ${state.doc.attrs.decimalFormat}
fontSize: ${state.doc.attrs.fontSize}
pageSize: ${state.doc.attrs.pageSize}
---------------

` + hurmetMarkdownSerializer.serialize(state.doc, new Map())

  // Save some fetched data as a fallback for when the internet is down.
  let gottaFallback = false
  const fallbacks = {}
  state.doc.nodesBetween(0, state.doc.content.size, function(node, pos) {
    if (node.type.name === "calculation" && node.attrs.isFetch) {
      gottaFallback = true
      const url = node.attrs.entry.replace(/^[^()]+\("?/, "").replace(/"?\).*$/, "").trim()
      let text = ""
      if (node.attrs.dtype === dt.MODULE) {
        text = node.attrs.fallback
      } else if (node.attrs.dtype === dt.DATAFRAME) {
        text += node.attrs.value.rowMap ? "#" : ""
        text += node.attrs.value.headings.join("\t")
        if (node.attrs.value.units) { text += "\n" + node.attrs.value.units.join("\t") }
        Array.from(node.attrs.value.usedRows).sort((a, b) => a - b).forEach(row => {
          let rowText = "\n"
          for (let j = 0; j < node.attrs.value.headings.length; j++) {
            rowText += node.attrs.value.data[j][row] + "\t"
          }
          text += rowText.slice(0, -1)
        })
      }
      fallbacks[node.attrs.name] = { url, text }
    }
  })
  if (gottaFallback) {
    str += `\n<!--FALLBACKS-->\n` + JSON.stringify(fallbacks)
  }

  for (const snapshot of state.doc.attrs.snapshots) {
    str += `\n<!--SNAPSHOT-->\ndate: ${snapshot.date}\nmessage: ${snapshot.message}\n\n`
    str += snapshot.content
  }
  str =  str
  if (window.showOpenFilePicker && state.doc.attrs.fileHandle) {
    // Use the Chromium File System Access API, so users can click to save a document.
    const button = document.getElementsByClassName("ProseMirror-menubar").item(0).children[1]
    // Blink the button, so the author knows that a save takes place.
    button.classList.add("ProseMirror-menu-active")
    writeFile(state.doc.attrs.fileHandle, str)
    sleep(500).then(() => {
      button.classList.remove("ProseMirror-menu-active")
    });
  } else {
    // Legacy method for Firefox and Safari
    const blob = new Blob([str], {type: "text/plain;charset=utf-8"})
    saveAs(blob, "HurmetFile.md", { autoBom : false });
  }
}

function saveFile() {
  return new MenuItem({
    title: "Save file...   Ctrl-S",
    label: "Save",
    run(state, _, view) {
      saveFileAsMarkdown(state, view)
    }
  })
}

function openFile() {
  return new MenuItem({
    title: "Open file...",
    label: "Open…",
    run(state, _, view) {
      readFile(state, _, view, schema, "markdown")
    }
  })
}

function copyText(state, isGFM) {
  const text = hurmetMarkdownSerializer.serialize(state.selection.content().content, new Map(), isGFM)
  const type = "text/plain"
  const blob = new Blob([text], { type })
  const data = [new ClipboardItem({ [type]: blob })];
  navigator.clipboard.write(data)
}

function copyAsMarkdown() {
  return new MenuItem({
    label: "Copy as Hurmet Markdown",
    run(state, _, view) {
      copyText(state, false)
    }
  })
}

function copyAsGFM() {
  return new MenuItem({
    label: "Copy as GitHub Markdown",
    title: "Copy as GitHub Flavored Markdown",
    run(state, _, view) {
      copyText(state, true)
    }
  })
}

function pasteAsMarkdown() {
  return new MenuItem({
    label: "Paste from Markdown",
    run(state, _, view) {
      navigator.clipboard
        .readText()
        .then((clipText) => {
          const ast = hurmet.md2ast(clipText)
          const fragment = { type: "fragment", content: ast }
          const {$from, $to} = state.selection
          view.dispatch(
            view.state.tr.replaceWith($from.pos, $to.pos, schema.nodeFromJSON(fragment))
          )
          hurmet.updateCalculations(view, schema.nodes.calculation, true)
        })
    }
  })
}

function uploadImage(nodeType) {
  return new MenuItem({
    title: "Upload image file",
    icon: hurmetIcons.upload,
    enable(state) {
      return canInsert(state, nodeType)
    },
    run(state, _, view) {
      const input = document.createElement('input');
      input.type = 'file'
      input.accept = ".gif,.jpg,.jpeg,.png,.svg"
      input.onchange = _ => {
        const file = input.files[0]
        const alt = file.name.replace(/\..+$/, "")
        const reader = new FileReader()
        reader.onload = function(evt) {
          const url = evt.target.result
          const pos = view.state.selection.from
          view.dispatch(view.state.tr.replaceWith(pos, pos, schema.nodes.image.create(
            { src: url, alt }
          )))
        }
        reader.readAsDataURL(file)
      }
      input.click()
    }
  })
}

function insertImage(nodeType) {
  return new MenuItem({
    title: "Insert link to image or edit existing image",
    icon: hurmetIcons.image,
    enable(state) {
      if (state.selection.node && state.selection.node.type.name == "figimg") {
        nodeType = schema.nodes.figimg
      }
      return canInsert(state, nodeType)
    },
    run(state, _, view) {
      let { from, to } = state.selection,
        attrs = null
      if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType)
        attrs = state.selection.node.attrs
      const promptOptions = {
        title: attrs && attrs.src ? "Edit image" : "Insert image",
        fields: {
//          src: new TextField({ label: "File path", required: true, value: attrs && attrs.src }),
          alt: new TextField({
            label: "Description",
            value: attrs ? attrs.alt : state.doc.textBetween(from, to, " ")
          }),
          width: new TextField({ label: "Width", value: attrs && attrs.width })
        },
        radioButtons: {
          name: "position",
          labels: ["inline", "left", "center", "right"],
          current: attrs && attrs.class ? attrs.class : "inline"
        },
        callback(attrs) {
          const tr = view.state.tr
          if (attrs.checkbox) {
            const str = attrs.alt ? attrs.alt : "caption"
            const caption = schema.nodes.figcaption.createAndFill(null, [schema.text(str)])
            const image = schema.nodes.figimg.createAndFill(attrs)
            tr.replaceSelectionWith(schema.nodes.figure.createAndFill(null, [image, caption]))
          } else {
            tr.replaceSelectionWith(nodeType.createAndFill(attrs))
          }
          view.dispatch(tr)
          view.focus()
        }
      }
      if (!(attrs && attrs.src) || (attrs && attrs.src && attrs.src.length < 400)) {
        promptOptions.fields = {
          src: new TextField({ label: "File path", required: true, value: attrs && attrs.src }),
          ...promptOptions.fields
        }
      } else if (attrs && attrs.src) {
        promptOptions.src = attrs.src
      }
      if (!attrs) {
        promptOptions.checkbox = {
          name: "Include a caption",
          checked: false
        }
      }
      openPrompt(promptOptions)
    }
  })
}

function insertComment(nodeType) {
  return new MenuItem({
    title: "Insert a comment",
    icon: hurmetIcons.comment,
    enable(state) {
      return canInsert(state, nodeType)
    },
    run(state, dispatch, view) {
      if (state.selection instanceof NodeSelection && state.selection.node.type.name == "comment") {
        return
      }
      const resolvedPos = state.doc.resolve(state.selection.from)
      const parent = resolvedPos.parent
      if (parent.type.name === "comment") { return }
      const tr = state.tr
      let pos = 0
      // Anchor the comment at a point preceding the parent block.
      const blockPos = resolvedPos.before(resolvedPos.depth)
      tr.insert(blockPos, nodeType.create())
      pos = blockPos + 1
      tr.setSelection(TextSelection.create(tr.doc, pos))
      view.dispatch(tr)
    }
  })
}

function takeSnapshot() {
  return new MenuItem({
    title: "Take and save a snapshot of the current document",
    label: "Take a snapshot...",
    run(state, _, view) {
      const attrs = {}
      openPrompt({
        title: "Snapshot",
        fields: { message: new TextField({ label: "Commit message", required: true }) },
        callback(attrs) {
          const dateStr = new Date().toISOString().replace(/T.+/, "")
          let md = hurmetMarkdownSerializer.serialize(state.doc, new Map(), false, true)
          // Ignore path definitions
          md = md.replace(/\n\n\[[^\]]+\\: .+/, "")
          state.doc.attrs.snapshots.push({ message: attrs.message, date: dateStr, content: md })
        }
      })
    }
  })
}

function showDiff() {
  return new MenuItem({
    label: "Show diff...",
    run(state, _, view) {
      const title = "Show the difference since:"
      const buttons = [];
      const snapshots = state.doc.attrs.snapshots
      if (state.doc.attrs.snapshots.length === 0) {
        alert('There are no snapshots to diff.')
        return
      }
      for (let i = 0; i < state.doc.attrs.snapshots.length; i++) {
        buttons.push({
          textContent: (new Date(snapshots[i].date)).toISOString().replace(/T.+/, "") + "  " + snapshots[i].message,
          pos: i
        })
      }
      const callback = pos => {
        const dmp = new diff_match_patch()
        const text1 = state.doc.attrs.snapshots[pos].content
        const text2 = hurmetMarkdownSerializer.serialize(state.doc, new Map(), false, true)
        dmp.Diff_Timeout = 2
        dmp.Diff_EditCost = 4
        let d = dmp.diff_main(text1, text2)
        dmp.diff_cleanupSemantic(d);
        const ds = dmp.diff_prettyHtml(d)
        const wrapper = document.body.appendChild(document.createElement("div"))
        wrapper.className = "ProseMirror-prompt"
        wrapper.style = "width: 650px; max-height: 500px; overflow: scroll;"
        wrapper.id = ""
        wrapper.innerHTML = ds
        const button = document.createElement("button")
        button.type = "button"
        button.className = "ProseMirror-prompt-cancel"
        button.textContent = "Close"
        button.onclick = function(e) { wrapper.parentNode.removeChild(wrapper) }
        wrapper.appendChild(button)
        const box = wrapper.getBoundingClientRect()
        wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px"
        wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px"
      }
      openSelectPrompt(title, buttons, callback)
    }
  })
}

function deleteSnapshots() {
  return new MenuItem({
    label: "Delete all snapshots...",
    run(state, _, view) {
      openPrompt({
        title: "Delete Snapshots",
        note: "This will delete all snapshots. It cannot be undone.",
        useOkButton: true,
        callback() {
          state.doc.attrs.snapshots = [];
        }
      })
    }
  })
}

function insertToC(nodeType) {
  // Table of Contents
  return new MenuItem({
    title: "Insert or edit a Table of Contents",
    label: "ToC",
    enable(state) {
      return canInsert(state, nodeType)
    },
    run(state, dispatch, view) {
      let { from, to } = state.selection,
        attrs = null
      if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType)
        attrs = state.selection.node.attrs
      if (!attrs) { attrs = { start: 1, end: 2, body: [] } }
      openPrompt({
        title: "Table of Contents",
        note: "Set a range of heading levels:",
        fields: {
          start: new TextField({ label: "Start", required: true, value: attrs && attrs.start,
            validate(str) { if (!/^[1-6]$/.test(str)) { return "Input must be an integer between 1 and 6." }  }
          }),
          end: new TextField({ label: "End", required: true, value: attrs && attrs.end,
            validate(str) { if (!/^[1-6]$/.test(str)) { return "Input must be an integer between 1 and 6." }  }
          }),
        },
        callback(attrs) {
          const {$from, $to} = state.selection
          const same = $from.sharedDepth($to)
          const startPos = same !== 0 ? $from.before(same) : $from.pos
          const endPos = same !== 0 ? $from.after(same) : startPos + 1
          attrs.body = findPageBreaks(view, state, forToC, schema.nodes.toc, attrs.start, attrs.end)
          dispatch(state.tr.replaceWith(startPos, endPos, nodeType.createAndFill(attrs)))
        }
      })
    }
  })
}

export function insertMath(state, view, encoding) {
  // Create a new math cell.
  // This function is exported so that it can be called from keymap.js.
  const nodeType = (encoding === "calculation") ? schema.nodes.calculation : schema.nodes.tex
  let attrs = (encoding === "calculation") ? { entry: "" } : { tex: "" }
  if (state.selection instanceof NodeSelection && state.selection.node.type == nodeType) {
    attrs = state.selection.node.attrs
  }
  const tr = view.state.tr
  const pos = tr.selection.from

  // Check if the cell should be type set as display mode.
  const resolvedPos = state.doc.resolve(pos)
  const grandParent = state.doc.resolve(resolvedPos.before(resolvedPos.depth)).parent
  if (grandParent.type.name === "centered") { attrs.displayMode = true }

  tr.replaceSelectionWith(nodeType.createAndFill(attrs))
  tr.setSelection(NodeSelection.create(tr.doc, pos))
  view.dispatch(tr)
}

function mathMenuItem(nodeType, encoding) {
  return new MenuItem({
    title: "Insert " + ((encoding === "calculation") ? "a calculation cell  Alt-C" : "a TeX cell"),
    icon: (encoding === "calculation") ? hurmetIcons.C : hurmetIcons.T,
    enable(state) { return canInsert(state, nodeType) },
    run(state, _, view) {
      insertMath(state, view, encoding);
    }
  })
}

const createTable = (schema, rowsCount = 3, colsCount = 3, withHeaderRow = true) => {
  const cells = [];
  const headerCells = [];
  for (let i = 0; i < colsCount; i++) {
    cells.push(schema.nodes.table_cell.createAndFill());

    if (withHeaderRow) {
      headerCells.push(schema.nodes.table_header.createAndFill());
    }
  }

  const rows = [];
  for (let i = 0; i < rowsCount; i++) {
    rows.push(
      schema.nodes.table_row.createChecked(
        null,
        withHeaderRow && i === 0 ? headerCells : cells
      )
    );
  }

  return schema.nodes.table.create(null, rows);
}

function cmdItem(cmd, options) {
  let passedOptions = {
    label: options.title,
    run: cmd
  }
  for (let prop in options) passedOptions[prop] = options[prop]
  if (!options.enable || options.enable === true)
    passedOptions["enable"] = state => cmd(state)

  return new MenuItem(passedOptions)
}

function markActive(state, type) {
  let { from, $from, to, empty } = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())
  else return state.doc.rangeHasMark(from, to, type)
}

function markItem(markType, options) {
  let passedOptions = {
    active(state) {
      return markActive(state, markType)
    },
    enable: true
  }
  for (let prop in options) passedOptions[prop] = options[prop]
  return cmdItem(toggleMark(markType), passedOptions)
}

function toggleDraftMode() {
  return new MenuItem({
    title: "Toggle draft mode",
    label: "Draft mode",
    enable() { return true },
    active(state) {return state.doc.attrs.inDraftMode},
    run(state, dispatch) {
      draftMode(state, dispatch, schema.nodes.calculation)
    }
  })
}

function tableItem(title, icon, cmd, cell) {
  return new MenuItem({
    title: title,
    icon: hurmetIcons[icon],
    select(state) {
      return isInTable(state)
    },
    run(state, dispatch) {
      cmd(state, dispatch)
    }
  })
}

function reCalcAll() {
  return new MenuItem({
    title: "Recalculate all",
    icon: hurmetIcons.recalc,
    run(state, _, view) {
      hurmet.updateCalculations(view, schema.nodes.calculation, true)
    }
  })
}

function setDecimalFormat(label) {
  return new MenuItem({
    label: label,
    run(state, _, view) {
      state.doc.attrs.decimalFormat = label
      hurmet.updateCalculations(view, schema.nodes.calculation, true)
    }
  })
}

function setFontSize(size) {
  return new MenuItem({
    label: String(size) + " pt",
    run(state, _, view) {
      state.doc.attrs.fontSize = size
      document.getElementById("editor").className = size === 12 ? "pica" : "long-primer"
      document.getElementById("print-div").className = size === 12 ? "ProseMirror pica" : "ProseMirror long-primer"
    }
  })
}

function setPageSize(size) {
  return new MenuItem({
    label: size,
    run(state, _, view) {
      state.doc.attrs.pageSize = size
      const style = document.getElementById("pageStyle")
      style.innerHTML = size === "letter"
        ? `@media print {@page{size: letter; margin: 16mm 0.75in 16mm 0.75in;}}`
        : `@media print {@page{size: A4; margin: 16mm 16.1mm 16mm 16.1mm;}}`
    }
  })
}

function tableStyle(title, className, icon) {
  return new MenuItem({
    title: title,
    icon: hurmetIcons[icon],
    select(state) {
      return isInTable(state)
    },
    run(state, dispatch) {
      const table = findTable(state.selection)
      // Get an array of the table CSS classes.
      // These are of two types:
      // classes[0] defines a table style: grid, striped, etc.
      // The rest of the classes all set a column alignment: c1c, c2r, c3c, etc.
      // We don't write a "c1l" because the default alignment is left.
      const classes = table.node.attrs.class.split(" ")
      const tr = state.tr
      if (/^align/.test(className)) {
        const align = className.slice(6, 7) //  l  c  r
        const rect = getSelectionRect(state.selection)
        if (rect) {
          for (let i = rect.left + 1; i < rect.right + 1; i++) {
            let gotMatch = false
            for (let j = 0; j < classes.length; j ++) {
              const ch = classes[j].slice(1, 2)
              if (!isNaN(ch)) {
                if (Number(ch) === i) {
                  gotMatch = true
                  // default alignment is left. 
                  classes[j] = align === "l" ? "" : "c" + ch + align
                }
              }
            }
            if (!gotMatch) classes.push("c" + i + align)
          }
        }
      } else {
        classes[0] = className
      }
      const classList = classes.join(" ").replace(/ {2,}/g, " ")
      const attrs = { class: classList }
      tr.setNodeMarkup(table.pos, undefined, attrs)
      dispatch(tr)
    } 
  })
}

// :: MenuItem
// Menu item for the `lift` command.
const liftItem = new MenuItem({
  title: "Lift out of enclosing block",
  run: lift,
  select: state => lift(state),
  icon: icons.lift
})

// :: MenuItem
// Menu item for the `selectParentNode` command.
const selectParentNodeItem = new MenuItem({
  title: "Select parent node",
  run: selectParentNode,
  enable: state => selectParentNode(state),
  icon: icons.selectParentNode
})

function linkItem(markType) {
  return new MenuItem({
    title: "Add or remove link",
    icon: icons.link,
    active(state) {
      return markActive(state, markType)
    },
    enable(state) {
      return !state.selection.empty
    },
    run(state, dispatch, view) {
      if (markActive(state, markType)) {
        toggleMark(markType)(state, dispatch)
        return true
      }
      openPrompt({
        title: "Create a link",
        fields: {
          href: new TextField({ label: "Link target", required: true })
        },
        callback(attrs) {
          toggleMark(markType, attrs)(view.state, view.dispatch)
          view.focus()
        }
      })
    }
  })
}

function wrapListItem(nodeType, options) {
  return cmdItem(wrapInList(nodeType, options.attrs), options)
}

// :: (Schema) → Object
// Given a schema, look for default mark and node types in it and
// return an object with relevant menu items relating to those marks:
//
// **`toggleStrong`**`: MenuItem`
//   : A menu item to toggle the [strong mark](#schema-basic.StrongMark).
//
// **`toggleEm`**`: MenuItem`
//   : A menu item to toggle the [emphasis mark](#schema-basic.EmMark).
//
// **`toggleCode`**`: MenuItem`
//   : A menu item to toggle the [code font mark](#schema-basic.CodeMark).
//
// **`toggleLink`**`: MenuItem`
//   : A menu item to toggle the [link mark](#schema-basic.LinkMark).
//
// **`insertImage`**`: MenuItem`
//   : A menu item to insert an [image](#schema-basic.Image).
//
// **`wrapBulletList`**`: MenuItem`
//   : A menu item to wrap the selection in a [bullet list](#schema-list.BulletList).
//
// **`wrapOrderedList`**`: MenuItem`
//   : A menu item to wrap the selection in an [ordered list](#schema-list.OrderedList).
//
// **`wrapBlockQuote`**`: MenuItem`
//   : A menu item to wrap the selection in a [block quote](#schema-basic.BlockQuote).
//
// **`makeParagraph`**`: MenuItem`
//   : A menu item to set the current textblock to be a normal
//     [paragraph](#schema-basic.Paragraph).
//
// **`makeCodeBlock`**`: MenuItem`
//   : A menu item to set the current textblock to be a
//     [code block](#schema-basic.CodeBlock).
//
// **`makeHead[N]`**`: MenuItem`
//   : Where _N_ is 1 to 6. Menu items to set the current textblock to
//     be a [heading](#schema-basic.Heading) of level _N_.
//
// **`insertHorizontalRule`**`: MenuItem`
//   : A menu item to insert a horizontal rule.
//
// The return value also contains some prefabricated menu elements and
// menus, that you can use instead of composing your own menu from
// scratch:
//
// **`insertMenu`**`: Dropdown`
//   : A dropdown containing the `insertImage` and
//     `insertHorizontalRule` items.
//
// **`typeMenu`**`: Dropdown`
//   : A dropdown containing the items for making the current
//     textblock a paragraph, code block, or heading.
//
// **`fullMenu`**`: [[MenuElement]]`
//   : An array of arrays of menu elements for use as the full menu
//     for, for example the [menu bar](https://github.com/prosemirror/prosemirror-menu#user-content-menubar).
export function buildMenuItems(schema) {
  const r = {}
  let type

  r.navigate = navigate()
  r.openFile = openFile()
  r.saveFile = saveFile()
  r.insertHeader = insertHeader()

  r.dot = setDecimalFormat("1000000.")
  r.commadot = setDecimalFormat("1,000,000.")
  r.lakh = setDecimalFormat("1,00,000.")
  r.cn = setDecimalFormat("1,0000,0000.")
  r.comma = setDecimalFormat("1000000,")
  r.spacecomma = setDecimalFormat("1 000 000,")
  r.apostrophecomma = setDecimalFormat("1’000’000,")
  r.dotcomma = setDecimalFormat("1.000.000,")

  r.pica = setFontSize(12)
  r.longprimer = setFontSize(10)
  r.letter = setPageSize("letter")
  r.A4 = setPageSize("A4")

  r.toggleDraftMode = toggleDraftMode()
  r.recalcAll = reCalcAll(schema)
  r.deleteComments = deleteComments()
  r.takeSnapshot = takeSnapshot()
  r.showDiff = showDiff()
  r.deleteSnapshots = deleteSnapshots()
  r.print = print()

  if ((type = schema.marks.strong))
    r.toggleStrong = markItem(type, { title: "Toggle strong style", icon: icons.strong })
  if ((type = schema.marks.em))
    r.toggleEm = markItem(type, { title: "Toggle emphasis", icon: icons.em })
  if ((type = schema.marks.code))
    r.toggleCode = markItem(type, { title: "Toggle code font  Ctrl-`", icon: icons.code })
  if ((type = schema.marks.subscript))
    r.toggleSubscript = markItem(type, {
      title: "Toggle subscript  Ctrl-,",
      icon: hurmetIcons.subscript
    })
  if ((type = schema.marks.superscript))
    r.toggleSuperscript = markItem(type, {
      title: "Toggle superscript  Ctrl-.",
      icon: hurmetIcons.superscript
    })
  if ((type = schema.marks.strikethru))
    r.toggleStrikethru = markItem(type, {
      title: "Toggle strikethrough",
      icon: hurmetIcons.strikethru
    })
  if ((type = schema.marks.underline))
    r.toggleUnderline = markItem(type, {
      title: "Toggle underline  Ctrl-u",
      icon: hurmetIcons.underline
    })
  if ((type = schema.marks.highlight))
  r.toggleHighlight = markItem(type, {
    title: "Toggle highlight",
    icon: hurmetIcons.highlight
  })
  if ((type = schema.marks.link)) r.toggleLink = linkItem(type)

  if ((type = schema.nodes.image)) r.imageUpload = uploadImage(type)
  if ((type = schema.nodes.image)) r.imageLink = insertImage(type)
  if ((type = schema.nodes.toc)) r.toc = insertToC(type)
  if ((type = schema.nodes.calculation)) r.insertCalclation = mathMenuItem(type, "calculation")
  if ((type = schema.nodes.tex)) r.insertTeX = mathMenuItem(type, "tex")
  if ((type = schema.nodes.comment)) r.insertComment = insertComment(type)
  if ((type = schema.nodes.tight_list_item)) r.tighten = tighten()

  if ((type = schema.nodes.bullet_list))
    r.wrapBulletList = wrapListItem(type, {
      title: "Wrap in bullet list",
      icon: icons.bulletList
    })
  if ((type = schema.nodes.ordered_list))
    r.wrapOrderedList = wrapListItem(type, {
      title: "Wrap in ordered list",
      icon: icons.orderedList
    })
  if ((type = schema.nodes.blockquote))
    r.wrapBlockQuote = wrapItem(type, {
      title: "Wrap in block quote",
      icon: icons.blockquote
    })
  if ((type = schema.nodes.centered))
    r.wrapCentered = wrapItem(type, {
      title: "Center block",
      label: "Centered"
    })
  if ((type = schema.nodes.indented))
    r.wrapIndent = wrapItem(type, {
      title: "Indent block  Alt-I",
      label: "Indented  Alt-I"
    })
  if ((type = schema.nodes.boxed))
    r.wrapBoxed = wrapItem(type, {
      title: "Draw box around block",
      label: "Boxed"
  })
  if ((type = schema.nodes.note))
    r.wrapNote = wrapItem(type, {
      title: "Note alert",
      label: "Note"
  })
  if ((type = schema.nodes.tip))
    r.wrapTip = wrapItem(type, {
      title: "Tip alert",
      label: "Tip"
  })
  if ((type = schema.nodes.important))
    r.wrapImportant = wrapItem(type, {
      title: "Alert as important",
      label: "Important"
  })
  if ((type = schema.nodes.warning))
    r.wrapWarning = wrapItem(type, {
      title: "Warning alert",
      label: "Warning"
  })
  if ((type = schema.nodes.paragraph))
    r.makeParagraph = blockTypeItem(type, {
      title: "Change to plain paragraph",
      icon: hurmetIcons.paragraph
    })
  if ((type = schema.nodes.code_block))
    r.makeCodeBlock = blockTypeItem(type, {
      title: "Change to code block",
      icon: icons.code
    })
  if ((type = schema.nodes.heading))
    for (let i = 1; i <= 6; i++)
      r["makeHead" + i] = blockTypeItem(type, {
        title: "Change to heading " + i,
        label: "\xa0H" + i + "\xa0",
        attrs: { level: i }
      })
  if ((type = schema.nodes.horizontal_rule)) {
    let hr = type
    r.insertHorizontalRule = new MenuItem({
      title: "Insert horizontal rule",
      label: "\u2015",
      enable(state) {
        return canInsert(state, hr)
      },
      run(state, dispatch) {
        dispatch(state.tr.replaceSelectionWith(hr.create()))
      }
    })
  }
  if ((type = schema.nodes.table)) {
    let table = type
    r.insertTable = new MenuItem({
      title: "Insert Table",
      icon: hurmetIcons.table,
      enable(state) {
        return  canInsert(state, table)
      },
      run(state, dispatch) {
        dispatch(state.tr.replaceSelectionWith(createTable(schema, 3, 3, true)))
      }
    })
  }

  let cell = type
  r.deleteTable = tableItem("Delete table", "delete_table", deleteTable, cell)
  r.addRowBefore = tableItem("Insert row before", "add_row_before", addRowBefore, cell)
  r.deleteRow = tableItem("Delete row", "delete_row", deleteRow, cell)
  r.addColumnBefore = tableItem("Insert column before", "add_col_before", addColumnBefore, cell)
  r.deleteColumn = tableItem("Delete column", "delete_col", deleteColumn, cell)
  r.toggleCellMerge = new MenuItem({
    title: "Toggle cell merge",
    icon: hurmetIcons.combine_cells,
      select(state) {
        return isInTable(state)
      },
      run(state, dispatch) {
        if (mergeCells(state, dispatch)) {
          return
        }
      splitCell(state, dispatch)
    }
  })
  r.grid = tableStyle("Grid", "grid", "grid")
  r.nogrid = tableStyle("No borders", "nogrid", "nogrid")
  r.oneRule = tableStyle("Border below header", "one-rule", "oneRule")
  r.twoRules = tableStyle("Borders below header and above bottom line.", "two-rules", "twoRules")
  r.threeRules = tableStyle("Three rules", "three-rules", "threeRules")
  r.fourRules = tableStyle("Four rules", "four-rules", "fourRules")
  r.rules = tableStyle("All rules", "rules", "rules")
  r.striped = tableStyle("striped", "striped", "striped")
  r.alignColLeft = tableStyle("Align Column Left", "align-left", "align-left")
  r.alignColCenter = tableStyle("Align Column Center", "align-center", "align-center")
  r.alignColRight = tableStyle("Align Column Right", "align-right", "align-right")

  r.help = blockTypeItem(type, {
    title: "Help",
    icon: hurmetIcons.info,
    enable() {
      return true
    },
    run() {
      window.open("manual.html")
    } 
  })
  r.hint = blockTypeItem(type, {
    title: "Math Quick Reference",
    label: "Q",
    enable() {
      return true
    },
    run() {
      const body = document.getElementsByTagName("body")[0]
      if (body.className === "show-hint") {
        body.className = ""
      } else {
        body.className = "show-hint"
        document.getElementById("hint").style.top = String(window.scrollY + 40) + "px"
      }
    } 
  })

  // Now that the menu buttons are created, assemble them into the menu.
  
  let cut = arr => arr.filter(x => x)
  
  r.fontsize = new DropdownSubmenu([r.pica, r.longprimer], { label: "Font size" })
  r.pagesize = new DropdownSubmenu([r.letter, r.A4], { label: "Page size" })
  r.separators = new DropdownSubmenu(
    [r.dot, r.commadot, r.lakh, r.cn, r.comma, r.spacecomma, r.apostrophecomma, r.dotcomma],
    {title: "Set decimal format", label: "Set Decimal"}
  )
  r.fileDropDown = new Dropdown([
    r.openFile,
    r.saveFile,
    r.takeSnapshot,
    r.showDiff,
    r.deleteSnapshots,
    r.pagesize,
    r.print
  ],
  { label: "File" }
  )
  r.documentDropDown = new Dropdown([
    r.separators,
    r.fontsize,
    r.toggleDraftMode,
    r.insertHeader,
    r.deleteComments
  ],
  { label: "Doc" }
  )
  r.fileMenu = [[
    r.navigate,
    r.fileDropDown,
    r.documentDropDown,
    r.recalcAll,
  ]]

  r.inlineMenu = [[
    r.toggleStrong,
    r.toggleEm,
    r.toggleCode,
    r.toggleSubscript,
    r.toggleSuperscript,
    r.toggleStrikethru,
    r.toggleUnderline,
    r.toggleHighlight
  ]]

  r.insertMenu = [[
    r.toggleLink,
    r.insertHorizontalRule,
    r.imageUpload,
    r.imageLink,
    r.toc,
    r.insertCalclation,
    r.insertTeX,
    r.insertComment
  ]]

  r.headingDropDown = new Dropdown([
    r.makeHead4,
    r.makeHead5,
    r.makeHead6,
  ],
  { label: "H*" }
  )
  r.typeMenu = [cut([
      r.makeParagraph,
      r.makeCodeBlock,
      r.makeHead1, r.makeHead2, r.makeHead3, r.headingDropDown
    ])]

  r.blockMenu = [
    [
      r.wrapBulletList,
      r.wrapOrderedList,
      r.tighten,
      r.wrapBlockQuote,
      r.blockDropDown = new Dropdown([
        r.wrapCentered,
        r.wrapIndent,
        r.wrapBoxed,
        r.wrapNote,
        r.wrapTip,
        r.wrapImportant,
        r.wrapWarning
        ],
        { label: "⎕", title: "Block format" }
      ),
      joinUpItem,
      liftItem,
      selectParentNodeItem
    ]
  ]

  r.tableStyle = new Dropdown([r.grid, r.nogrid, r.oneRule, r.twoRules, r.threeRules, r.fourRules, r.rules, r.striped], {label: "Tbl Style"})
  r.tableMenu = [cut([
    r.insertTable,
    r.addRowBefore,
    r.addColumnBefore,
    r.deleteTable,
    r.deleteRow,
    r.deleteColumn,
    r.toggleCellMerge,
    r.alignColLeft,
    r.alignColCenter,
    r.alignColRight,
    r.tableStyle
  ])];

  r.copyAsMarkdown = copyAsMarkdown()
  r.copyAsGFM = copyAsGFM()
  r.pasteAsMarkdown = pasteAsMarkdown()
  r.Markdown = new Dropdown([r.copyAsMarkdown, r.copyAsGFM, r.pasteAsMarkdown], {label: "𝐌"})

  r.fullMenu = r.fileMenu.concat(
    [[undoItem, redoItem, r.Markdown]],
    r.inlineMenu,
    r.insertMenu,
    r.typeMenu,
    r.blockMenu,
    r.tableMenu,
    [[r.help]]
  )

  return r
}
