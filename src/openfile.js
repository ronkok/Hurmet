const handleContents = (view, schema, str, format) => {
  // Strip the BOM, if any, from the beginning of the result string.
  if (/^ï»¿/.test(str)) { str = str.substring(3) }

  let doc

  if (format === "hurmet") {
    doc = JSON.parse(str)
  } else if (format === "markdown") {
    // eslint-disable-next-line no-undef
    const ast = hurmet.md2ast(str)
    if (typeof ast === "object" && ast.type && ast.type === "doc") {
      doc = ast
    } else {
      doc = {
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
    }
    doc = JSON.parse(JSON.stringify(doc))
  }
  const fontSize = (doc.attrs.fontSize) ? Number(doc.attrs.fontSize) : 12
  document.getElementById("editor").className = fontSize === 12 ? "pica" : "long-primer"
  document.getElementById("print-div").className = fontSize === 12
    ? "ProseMirror pica"
    : "ProseMirror long-primer"
  const pageSize = (doc.attrs.pageSize) ? doc.attrs.pageSize : "letter"
  const style = document.getElementById("pageStyle")
  style.innerHTML = pageSize === "letter"
  ? `@media print {@page{size: letter; margin: 16mm 0.75in 16mm 0.75in;}}`
  : `@media print {@page{size: A4; margin: 16mm 16.1mm 16mm 16.1mm;}}`

  // Write the document with just the entries.
  // If a Hurmet error occurs later, the document is at least loaded and rendered.
  view.dispatch(
    view.state.tr.replaceWith(0, view.state.doc.content.size, schema.nodeFromJSON(doc))
  )
  view.state.doc.attrs.fontSize = fontSize
  view.state.doc.attrs.pageSize = pageSize
  if (doc.attrs.snapshots) { view.state.doc.attrs.snapshots = doc.attrs.snapshots }

  // Update all the calculation nodes and refresh the document display.
  // eslint-disable-next-line no-undef
  hurmet.updateCalculations(view, schema.nodes.calculation, true)
}

async function getFile(view, schema, format) {
  const pickerOpts = {
    types: [{ description: 'Text', accept: { 'text/*': ['.md'] } }],
    excludeAcceptAllOption: true,
    multiple: false
  };
  const [fileHandle] = await window.showOpenFilePicker(pickerOpts)
  const file = await fileHandle.getFile()
  const contents = await file.text()
  // doc.attrs is not updated by a ProseMirror transaction. Update fileHandle separately.
  view.state.doc.attrs.fileHandle = fileHandle
  // Now update the rest of the document.
  handleContents(view, schema, contents, format)
}

export function readFile(state, _, view, schema, format) {
  if (window.showOpenFilePicker && !(format === "hurmet")) {
    // Use the Chromium File System Access API, so users can Ctrl-S to save a document.
    getFile(view, schema, format)
  } else {
    // Legacy file open system for Firefox and Safari
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
        const str = evt.target.result
        handleContents(view, schema, str, format)
      }
      reader.readAsText(fileName)
    }
    input.click()
  }
}
