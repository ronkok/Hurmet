import { updateCalculations } from "./updateCalculations"

export function readHurmetFile(state, _, view, schema) {
  // A couple of definitions for use below.
//  const decimalFormat = state.doc.attrs.decimalFormat
//  const hurmetVars = {}
  // Open a dialog box.
  const input = document.createElement('input')
  // Populate the dialog with a list of available file names.
  input.type = 'file'
  input.accept = ".hurmet"
  // Wait for the user to select a filename.
  input.onchange = _ => {
    const fileName = input.files[0]  // The file name selected by the user.
    // Spin up the JavaScript FileReader object to read the file.
    const reader = new FileReader()
    reader.onload = function(evt) {
      // We're now inside the event handler for after the file is loaded.
      // Strip the BOM from the beginning of the result string.
      // Parse the JSON into a ProseMirror document object.
      const docObj = JSON.parse(evt.target.result.substring(3))

      // Write the document with just the entries.
      // If a Hurmet error occurs later, the document is at least loaded and rendered.
      view.dispatch(
        view.state.tr.replaceWith(0, view.state.doc.content.size, schema.nodeFromJSON(docObj))
      )

      // Update all the calculation nodes and refresh the document display.
      updateCalculations(view, schema.nodes.calculation, true)
    }
    reader.readAsText(fileName)
  }
  input.click()
}
