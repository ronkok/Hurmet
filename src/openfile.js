import { md2ast } from "./md2ast"

export function readFile(state, _, view, schema, format) {
  // Open a dialog box.
  const input = document.createElement('input')
  // Populate the dialog with a list of available file names.
  input.type = 'file'
  input.accept = format === "hurmet" ? ".hurmet" : ".md"
  // Wait for the user to select a filename.
  input.onchange = _ => {
    const fileName = input.files[0]  // The file name selected by the user.
    // Spin up the JavaScript FileReader object to read the file.
    const reader = new FileReader()
    reader.onload = function(evt) {
      // We're now inside the event handler for after the file is loaded.

      // Strip the BOM, if any, from the beginning of the result string.
      let str = evt.target.result
      if (/^ï»¿/.test(str)) { str = str.substring(3) }

      let doc

      if (format === "hurmet") {
        str = str.replace(/(?:indented_paragraph|folded_paragraph)/g, "paragraph")
        doc = JSON.parse(str)
      } else if (format === "markdown") {
        const ast = md2ast(str)
        doc = {
          type: "doc",
          "attrs": {
            "decimalFormat": "1,000,000.",
            "inDraftMode": false
          },
          "content": ast
        }
        doc = JSON.parse(JSON.stringify(doc))
      }

      // Write the document with just the entries.
      // If a Hurmet error occurs later, the document is at least loaded and rendered.
      view.dispatch(
        view.state.tr.replaceWith(0, view.state.doc.content.size, schema.nodeFromJSON(doc))
      )

      // Update all the calculation nodes and refresh the document display.
      // eslint-disable-next-line no-undef
      hurmet.updateCalculations(view, schema.nodes.calculation, true)
    }
    reader.readAsText(fileName)
  }
  input.click()
}
