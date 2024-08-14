/* eslint-disable */
import { autoCorrect } from "./autocorrect"
import { renderSVG } from "./renderSVG"
import hurmet from "./hurmet"
import { dt } from "./constants"
import { codeJar, selectedText, textBeforeCursor, textAfterCursor } from "./codejar"

'use strict'

// Set up the REPL in the reference manual.
// Define some variables and store their data in hurmetVars.
const hurmetVars = Object.create(null)
hurmet.calculate(`x = 5`, hurmetVars)
hurmet.calculate(`w = 100 'lbf/ft'`, hurmetVars)
hurmet.calculate(`L = 3.1 'm'`, hurmetVars)
hurmet.calculate(`name = "James"`, hurmetVars)
hurmet.calculate(`s = "abcde"`, hurmetVars)
hurmet.calculate(`𝐕 = [1, 2, 3, 4, 5]`, hurmetVars)
hurmet.calculate(`𝐌 = (1, 2, 3; 4, 5, 6; 7, 8, 9)`, hurmetVars)
const df = "``" + `name,w,area\n,in,in²\nA,4,10\nB,6,22` + "``"
hurmet.calculate(`DF =` + df, hurmetVars)
hurmet.calculate(`A = 8`, hurmetVars)
const wideFlanges = "``" + `name|weight|A|d|bf|tw|Ix|Sx|rx\n|lbf/ft|in^2|in|in|in|in^4|in^3|in\nW14X90|90|26.5|14|14.5|0.44|999|143|6.14\nW12X65|65|19.1|12.1|12|0.39|533|87.9|5.28\nW10X49|49|14.4|10|10|0.34|272|54.6|4.35\nW8X31|31|9.13|8|8|0.285|110|27.5|3.47\nW8X18|18|5.26|8.14|5.25|0.23|61.9|15.2|3.43\nW6X15|15|4.43|5.99|5.99|0.23|29.1|9.72|2.56\nW4X13|13|3.83|4.16|4.06|0.28|11.3|5.46|1.72` + "``"
hurmet.calculate(`wideFlanges =` + wideFlanges, hurmetVars)
const dict = `{"#4": 0.22, "#5": 0.31} 'in2'`
hurmet.calculate(`barArea =` + dict, hurmetVars)
const module = "E = 29000 'ksi'\n\nv = [4, 6, 8]\n\nfunction multiply(a, b)\n  return a × b\nend"
hurmetVars["mod"] = hurmet.scanModule(module, "1,000,000.")

const renderMath = (jar, demoOutput) => {
  let entry = jar.toString()
  const selText = selectedText(editor)
  if (selText.length === 0) {
    autoCorrect(jar, textBeforeCursor(editor), textAfterCursor(editor))
  }
  entry = jar.toString()
  const format = document.getElementById("formatBox").value.trim()
  hurmetVars.format = { value: format }
  const tex = hurmet.calculate(entry, hurmetVars)

  try {
    if (typeof tex === "object" && tex.dtype && tex.dtype === dt.DRAWING) {
      demoOutput.appendChild(renderSVG(tex.resultdisplay))
    } else {
      hurmet.render(tex, demoOutput, {
        trust: (context) => context.command === "\\class" && context.class === "special-fraction",
        wrap: "="
      })
    }
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

const prompts = {
  "statement-container": "2 + 2 = ?",
  "arithmetic-container": "2 × 4 + 3^2/7 = ?",
  "variable-container": "b = 2 L = ?",
  "greek-container": "theta + x dot + f''",
  "q-container": "2 × 3.1 'm' = ?? ft",
  "markup": "(a, b; c, d)",
  "auto-correct": "theta hat <= bb M xx sqrt 3 . f''",
  "display-selectors": "b = 2 L = ?? ft",
  "accessor-container": "𝐕[2] = ?",
  "calculation-forms": "x = 2 A = ?",
  "identifiers": "f_c′ = 4500",
  "identi-correct": "bb M != h_sub +  theta bar + f''",
  "data-types": `"a string" ≠ 2.3`,
  "number": "33 / 2.45 × 3.2% + 3 7/8 + 3.1e1 = ?",
  "complex-number": "4∠30° = ??",
  "unit": "9.807 'm/s²' = ?? ft/s²",
  "matrix": "[2.1; -15.3]",
  "matrix-mult": "[1, 2, 3] [3; 2; 1] = ?",
  "data-frame": "wideFlanges.W10X49.A = ?? in2",
  "single-row": 'A = barArea["#4"] = ?',
  "functions": "sin(π/6) = ?",
  "if-expressions": `x = {1 if 12 < 30; 0 otherwise} = ?`,
  "summation": `∑_(n=0)^4 2 n = ?`,
  "unit-aware-calculations": "4 'ft' + 3 'yards' = ?? m",
  "remote-modules": "mod.E = ?? psi",
  "tests": "@test 2 ≤ 3"
}

// Start the demonstration editor
const editor = document.getElementById("demo-input")
const jar = codeJar(editor, false)
const demoOutput = document.getElementById("demo-output");
editor.addEventListener("input", e => {
  renderMath(jar, demoOutput)
})
jar.updateCode("Hi!")
renderMath(jar, demoOutput)

const formatOutput = document.getElementById("formatBox")
formatOutput.addEventListener("input", e => {
  renderMath(jar, demoOutput)
})

// Change the content of the demonstration box to match the currently scrolled topic.
var observer = new IntersectionObserver(function(entries) {
  for (const entry of entries) {
    if (entry.intersectionRatio === 1.0) {
      jar.updateCode(prompts[entry.target.id])
      renderMath(jar, demoOutput)
      break
    }
  }
}, {
root: null,
rootMargin: '0px',
threshold: 1.0
});

observer.observe(document.getElementById("statement-container"))
observer.observe(document.getElementById("arithmetic-container"))
observer.observe(document.getElementById("variable-container"))
observer.observe(document.getElementById("greek-container"))
observer.observe(document.getElementById("q-container"))
observer.observe(document.getElementById("markup"))
observer.observe(document.getElementById("auto-correct"))
observer.observe(document.getElementById("display-selectors"))
observer.observe(document.getElementById("accessor-container"))
observer.observe(document.getElementById("calculation-forms"))
observer.observe(document.getElementById("identifiers"))
observer.observe(document.getElementById("identi-correct"))
observer.observe(document.getElementById("data-types"))
observer.observe(document.getElementById("number"))
observer.observe(document.getElementById("complex-number"))
observer.observe(document.getElementById("unit"))
observer.observe(document.getElementById("matrix"))
observer.observe(document.getElementById("matrix-mult"))
observer.observe(document.getElementById("data-frame"))
observer.observe(document.getElementById("functions"))
observer.observe(document.getElementById("summation"))
observer.observe(document.getElementById("if-expressions"))
observer.observe(document.getElementById("unit-aware-calculations"))
observer.observe(document.getElementById("remote-modules"))
observer.observe(document.getElementById("tests"))
