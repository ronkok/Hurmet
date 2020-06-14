export function draftMode(state, dispatch, calcNode) {
  // Toggle the document's draft mode.
  // When in draft mode, Hurmet displays calc zones in plain text and omits the blue echo.
  const inDraftMode = !state.doc.attrs.inDraftMode
  state.doc.attrs.inDraftMode = inDraftMode
  const tr = state.tr  // Create a ProseMirror transacation.
  state.doc.nodesBetween(0, state.doc.content.size, function(node, pos) {
    if (node.type.name === "calculation") {
      const attrs = Object.assign({}, node.attrs)
      attrs.inDraftMode = inDraftMode
      tr.replaceWith(pos, pos + 1, calcNode.createAndFill(attrs))
    }
  })
  dispatch(tr)
}
