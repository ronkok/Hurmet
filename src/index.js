﻿// Prosemirror core modules
import { DOMParser } from "prosemirror-model"
import * as state from "prosemirror-state"
import * as view from "prosemirror-view"
import { history } from "prosemirror-history"
//import { dropCursor } from "../node_modules/prosemirror-dropcursor/dist/dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { baseKeymap } from "prosemirror-commands"
import { columnResizing, tableEditing } from "prosemirror-tables"
import * as keymap from "prosemirror-keymap"
import * as menu from "prosemirror-menu"
import { fixTables } from "prosemirror-tables"

// Hurmet customized modules
import { schema } from "./schema"
import { dt } from "./constants"
import { buildMenuItems } from "./menu"
import { buildKeymap } from "./keymap"
import { buildInputRules } from "./inputrules"
import { CalcView, TexView, FootnoteView } from "./nodeviews"
import { DataFrame } from "./dataframe"
import hurmet from "./hurmet"

// Bundle together the plugins.
function pmSetup(options) {
  return [
    buildInputRules(options.schema),
    keymap.keymap(buildKeymap(options.schema, options.mapKeys)),
    keymap.keymap(baseKeymap),
//    dropCursor(),
    gapCursor(),
    menu.menuBar({ floating: true, content: buildMenuItems(options.schema).fullMenu }),
    history(),
    columnResizing(),
    tableEditing(),
    new state.Plugin({  props: { attributes: { class: "ProseMirror-setup" } } })
  ]
}

window.view = new view.EditorView(document.querySelector("#editor"), {
  state: state.EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(document.querySelector("#content")),
    plugins: pmSetup({ schema: schema })
  }),
  nodeViews: {
    calculation(node, view) { return new CalcView(node, view) },
    tex(node, view) { return new TexView(node, view) },
    footnote(node, view, getPos) { return new FootnoteView(node, view, getPos) }
  },
  clipboardTextSerializer: (content, view) => {
    // If the selection consists of a single calc with a numeric result, return the result.
    if (content.content && content.content.content.length === 1
        && content.content.content[0].type.name === "paragraph"
        && content.content.content[0].content && content.content.content[0].content.content
        && content.content.content[0].content.content.length === 1
        && content.content.content[0].content.content[0].type.name === "calculation") {
      const attrs = content.content.content[0].content.content[0].attrs
      const value = attrs.value
      if (value.plain && hurmet.Rnl.isRational(value.plain)) {
        return hurmet.Rnl.toNumber(value.plain)
      } else if (hurmet.Rnl.isRational(value)) {
        return hurmet.Rnl.toNumber(value)
      } else if (Array.isArray(value) && hurmet.Rnl.isRational(value[0])) {
        return value.map(e => hurmet.Rnl.toNumber(e))
      } else if (attrs.dtype === dt.DATAFRAME) {
        return DataFrame.displayAlt(value)
      }
      return value
    } else {
      // Otherwise, return the default.
      return content.content.textBetween(0, content.content.size, "\n\n")
    }
  }
})

// Set decimal separator display per the browser language.
const userLanguageTag = navigator.language || navigator.userLanguage
const parts = userLanguageTag.match(/([A-Za-z]{1,2})-(\w{1,3})(?:-(\w{2,3}))?/)
const userLanguage = parts[1];
const userRegion = parts[3] ? parts[3] : parts[2];
if (["BD", "IN", "LK", "MV", "MP", "PK"].includes(userRegion)) {
  window.view.state.doc.attrs.decimalFormat = "1,00,000."  // south Asia
} else if (userLanguage === "en" ||
  ["BN", "BU", "BW", "DO", "EG", "ET", "GH", "GT", "GY", "HN", "IE", "IL", "JO", "JP", "KE",
    "KH", "KP", "KR", "LB", "LY", "MM", "MN", "MT", "MX", "MY", "NG", "NI", "PA", "PH", "PR",
    "QA", "PS", "SG", "SV", "TH", "TW", "TZ", "UG", "ZW"].includes(userRegion)) {
  window.view.state.doc.attrs.decimalFormat = "1,000,000."
} else if (userLanguage === "zh") {
  window.view.state.doc.attrs.decimalFormat = "1,0000,0000."  // China
}
// default is 1.000.000,

const tidyUp = _ => {
  const fix = fixTables(window.view.state)
  if (fix) { window.view.state = window.view.state.apply(fix.setMeta("addToHistory", false)) }

  hurmet.updateCalculations(window.view, schema.nodes.calculation, true)

  document.execCommand("enableObjectResizing", false, false)
  document.execCommand("enableInlineTableEditing", false, false)
}

const loadRemoteFile = md => {
  // eslint-disable-next-line no-undef
  const ast = hurmet.md2ast(md)
  let doc = {
    type: "doc",
    "attrs": {
      "decimalFormat": "1,000,000.",
      "inDraftMode": false,
      "fontSize": 12,
      "fileHandle": null,
      "pageSize": "letter"
    },
    "content": ast
  }
  doc = JSON.parse(JSON.stringify(doc))
  window.view.dispatch(
    window.view.state.tr.replaceWith(
      0,
      window.view.state.doc.content.size,
      schema.nodeFromJSON(doc))
  )
  tidyUp()
}

const gistRegEx = /^https:\/\/gist\.githubusercontent\.com\/.+\.md$/
async function loadURL(hash) {
  const url = decodeURIComponent(hash.slice(1))
  if (gistRegEx.test(url)) {
    const response = await fetch(url);
    if (response.ok) { // if HTTP-status is 200-299
      // get the response body (the method explained below)
      const str = await response.text()
      loadRemoteFile(str)
    }
  } else {
    tidyUp()
  }
}

const hash = location.hash
if (hash && hash.length > 1) {
  loadURL(hash)
} else {
  tidyUp()
}
