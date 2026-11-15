import { Selection } from "prosemirror-state"
import { schema } from "./schema"
import { sketchAttrs } from "./renderSketch"
import { sketchHasCaption, sketchTitle, sketchPosition } from "./sketchSource"

// Write the result of the Sketch dialog into the document.
// `source` is the new sketch source, "" for an emptied sketch, or null for Cancel.
// `node` and `pos` give the sketch or figsketch that was edited. Without them,
// a new sketch is inserted at the selection.
// A sketch whose source says `caption true` goes into a figure, with its title as
// the caption. The source is the authority, so the caption is rewritten from the
// title each time. Without `caption true`, the sketch is an inline node.
// Afterward, the cursor goes after the sketch. If the sketch stayed selected,
// a click on it would not select it again, so it would not reopen the dialog.
export const placeSketch = (view, source, node = null, pos = null) => {
  const { state } = view
  const tr = state.tr
  // The range that the new node replaces.
  let from = state.selection.from
  let to = state.selection.to
  let isInFigure = false
  if (node) {
    from = pos
    to = pos + node.nodeSize
    if (node.type.name === "figsketch") {
      // Replace the whole figure, caption and all.
      const $pos = state.doc.resolve(pos)
      from = $pos.before()
      to = $pos.after()
      isInFigure = true
    }
  }
  if (source === null) {
    // Cancel
    if (!node) { return }
  } else if (source === "") {
    // An emptied sketch is deleted.
    if (!node) { return }
    tr.delete(from, to)
  } else {
    const attrs = sketchAttrs(source, state.doc)
    if (sketchHasCaption(source)) {
      const title = sketchTitle(source)
      const caption = schema.nodes.figcaption.create(null, title ? schema.text(title) : null)
      const figure = schema.nodes.figure.create(
        { class: sketchPosition(source) },
        [schema.nodes.figsketch.create(attrs), caption]
      )
      if (!isInFigure) {
        // A figure is a block. If the sketch stands alone in its paragraph, or a new
        // sketch goes into an empty paragraph, the figure replaces the paragraph.
        // Otherwise, the paragraph is split around the figure.
        const $from = state.doc.resolve(from)
        const parent = $from.parent
        const isAlone = node
          ? parent.childCount === 1
          : parent.content.size === 0
        if (parent.type.name === "paragraph" && isAlone) {
          from = $from.before()
          to = $from.after()
        }
      }
      tr.replaceWith(from, to, figure)
    } else {
      const sketch = schema.nodes.sketch.create(attrs)
      tr.replaceWith(from, to, isInFigure
        ? schema.nodes.paragraph.create(null, sketch)
        : sketch)
    }
  }
  tr.setSelection(Selection.near(tr.doc.resolve(tr.mapping.map(to))))
  view.dispatch(tr)
  view.focus()
}
