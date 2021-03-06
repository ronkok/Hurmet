import { schema } from "./schema"
import { openMathPrompt } from "./mathprompt"

// nodeviews.js

export class CalcView {
  constructor(node, view) {
    this.node = node
    this.outerView = view
    this.dom = schema.nodes.calculation.spec.toDOM(node)
    this.decimalFormat = view.state.doc.attrs.decimalFormat
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode")
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
      decimalFormat: this.decimalFormat,
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

