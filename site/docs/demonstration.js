/* eslint-disable */
const demonstration = (function(exports) {
  'use strict'

  // Set up the REPL in the reference manual.
  // Define a couple of variables and store their data in hurmetVars.
  const hurmetVars = Object.create(null)
  hurmet.calculate(`w = '100 lbf/ft'`, hurmetVars)
  hurmet.calculate(`L = '3.1 m'`, hurmetVars)

  const renderMath = (doc, demoOutput) => {
    hurmet.autoCorrect(doc)
    const value = doc.getValue()
    const entry = value.replace("\n", "").trim()
    const tex = hurmet.calculate(entry, hurmetVars)

    try {
      const isFF = 'MozAppearance' in document.documentElement.style
      katex.render(tex, demoOutput, { strict: false, throwOnError: false,
        output: isFF ? "mathml" : "htmlAndMathml" })
    } catch(err) {
      while(demoOutput.lastChild) {
        demoOutput.removeChild(demoOutput.lastChild);
      }
      const msgNode = document.createTextNode(err.message)
      const span = document.createElement("span")
      span.appendChild(msgNode)
      demoOutput.appendChild(span)
      span.setAttribute("class", "errorMessage")
    }
  }

  const startEditor = () => {
    const demoOutput = document.getElementById("demo-output");
    const editor = CodeMirror.fromTextArea(document.getElementById("demo-input"), {
        autoCloseBrackets: true,
        lineWrapping: true,
        matchBrackets: true
      });

      const doc = editor.doc
      doc.setValue("(w L²)/8 = ?? lbf·ft")
      renderMath(doc, demoOutput)
      editor.on('change', function(){
        renderMath(doc, demoOutput)
      })
  }

  exports.startEditor = startEditor

  return exports

}({}))
