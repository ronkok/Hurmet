// Prosemirror core modules
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
import { buildMenuItems } from "./menu"
import { buildKeymap } from "./keymap"
import { buildInputRules } from "./inputrules"
import { CalcView, TexView } from "./nodeviews"
import { updateCalculations } from "./updateCalculations"

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
    new state.Plugin({  props: { attributes: { class: "ProseMirror-example-setup-style" } } })
  ]
}

window.view = new view.EditorView(document.querySelector("#editor"), {
  state: state.EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(document.querySelector("#content")),
    plugins: pmSetup({ schema: schema })
  }),
  nodeViews: {
    calculation(node, view) { return new CalcView(node, view) },
    tex(node, view) { return new TexView(node, view) }
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

const fix = fixTables(window.view.state)
if (fix) { window.view.state = window.view.state.apply(fix.setMeta("addToHistory", false)) }

// eslint-disable-next-line no-undef
updateCalculations(window.view, schema.nodes.calculation, true)

document.execCommand("enableObjectResizing", false, false)
document.execCommand("enableInlineTableEditing", false, false)
