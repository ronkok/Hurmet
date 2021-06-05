import { schema } from "./schema"
import { openMathPrompt } from "./mathprompt"

// nodeviews.js

export class CalcView {
  constructor(node, view) {
    this.node = node
    this.outerView = view
    this.dom = schema.nodes.calculation.spec.toDOM(node)
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode")

    // ProseMirror is built to undo things keystroke by keystroke.
    // It wants an Undo to open the calc cell, to enable further undos
    // of keystrokes done inside the cell.
    // But I want an Undo to jump to the condition before the previous
    // edit of the cell. That is how Excel works, and it feels natural.
    // To simulate my desired behavior, I decline to open a calc cell just
    // after an Undo event. It's a horrible hack. After an Undo, authors can not
    // open the most recently edited cell by selecting it because it is already
    // selected. They have to select something else, then come back and
    // select the cell. Not good. but I can't think of anything better.
    if (this.outerView.state.history$.prevTime === 0) {
      if (!this.outerView.state.doc.attrs.recentUndo) {
        this.outerView.state.doc.attrs.recentUndo = true
        return
      }
    }
    this.outerView.state.doc.attrs.recentUndo = false

    const attrs = this.node.attrs
    const pos = this.outerView.state.selection.from
    // A CalcView node is a ProseMirror atom. It does not enable direct ProseMirror editing.
    // Instead we temporarily open a CodeMirror instance in the node location.
    // Then, we update all dependent calculations only if the node is submitted.
    openMathPrompt({
      encoding: "HurmetMath",
      attrs: attrs,
      outerView: this.outerView,
      dom: this.dom,
      callback(attrs) {
        // eslint-disable-next-line no-undef
        hurmet.updateCalculations(this.outerView, schema.nodes.calculation, false, attrs, pos)
      }
    })
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode")
  }
  stopEvent() { return true }
}

export class TexView {
  constructor(node, view) {
    this.node = node
    this.outerView = view
    this.dom = schema.nodes.tex.spec.toDOM(node)
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode")
    if (this.outerView.state.history$.prevTime === 0) {
      if (!this.outerView.state.doc.attrs.recentUndo) {
        this.outerView.state.doc.attrs.recentUndo = true
        return
      }
    }
    this.outerView.state.doc.attrs.recentUndo = false
    const attrs = this.node.attrs
    openMathPrompt({
      // Create a user interface for TeX that is similar to CalcView.
      // The need for a CodeMirror instance is not as great here as it is in CalcView,
      // but I want the look and feel to be similar for both.
      encoding: "TeX",
      attrs: attrs,
      outerView: this.outerView,
      dom: this.dom,
      callback(attrs) {
        const oView = this.outerView
        oView.dispatch(
          oView.state.tr.replaceSelectionWith(schema.nodes.tex.createAndFill(attrs))
        )
        oView.focus()
      }
    })
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode")
  }
  stopEvent() { return true }
}

