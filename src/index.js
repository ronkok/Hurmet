// Prosemirror core modules
import { DOMParser } from "prosemirror-model"
import * as state from "prosemirror-state"
import * as view from "prosemirror-view"
import { history } from "prosemirror-history"
//import { dropCursor } from "../node_modules/prosemirror-dropcursor/dist/dropcursor"
//import { GapCursor } from "../node_modules/prosemirror-gapcursor/dist/gapcursor"
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

// Bundle together the plugins.
function pmSetup(options) {
  return [
    buildInputRules(options.schema),
    keymap.keymap(buildKeymap(options.schema, options.mapKeys)),
    keymap.keymap(baseKeymap),
//    dropCursor(),
//    GapCursor(),
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
const fix = fixTables(window.view.state)
if (fix) { window.view.state = window.view.state.apply(fix.setMeta("addToHistory", false)) }

// eslint-disable-next-line no-undef
hurmet.updateCalculations(window.view, schema.nodes.calculation, true)

document.execCommand("enableObjectResizing", false, false)
document.execCommand("enableInlineTableEditing", false, false)
