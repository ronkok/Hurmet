/* eslint-disable */
const demonstration = (function(exports) {
  'use strict'

  // Set up the REPL in the reference manual.
  // Define some variables and store their data in hurmetVars.
  const hurmetVars = Object.create(null)
  hurmet.calculate(`x = 5`, hurmetVars)
  hurmet.calculate(`w = '100 lbf/ft'`, hurmetVars)
  hurmet.calculate(`L = '3.1 m'`, hurmetVars)
  hurmet.calculate(`name = "James"`, hurmetVars)
  hurmet.calculate(`s = "abcde"`, hurmetVars)
  hurmet.calculate(`𝐕 = [1, 2, 3, 4, 5]`, hurmetVars)
  hurmet.calculate(`𝐌 = (1, 2, 3; 4, 5, 6; 7, 8, 9)`, hurmetVars)
  hurmet.calculate(`D = {"w": 31, "h": 9.13}`, hurmetVars)
  const df = "``" + `name,w,area\n,in,in²\nA,4,10\nB,6,22` + "``"
  hurmet.calculate(`DF =` + df, hurmetVars)
  hurmet.calculate(`A = 8`, hurmetVars)
  const wideFlanges = "``" + `name|weight|A|d|bf|tw|Ix|Sx|rx\n|lbf/ft|in^2|in|in|in|in^4|in^3|in\nW14X90|90|26.5|14|14.5|0.44|999|143|6.14\nW12X65|65|19.1|12.1|12|0.39|533|87.9|5.28\nW10X49|49|14.4|10|10|0.34|272|54.6|4.35\nW8X31|31|9.13|8|8|0.285|110|27.5|3.47\nW8X18|18|5.26|8.14|5.25|0.23|61.9|15.2|3.43\nW6X15|15|4.43|5.99|5.99|0.23|29.1|9.72|2.56\nW4X13|13|3.83|4.16|4.06|0.28|11.3|5.46|1.72` + "``"
  hurmet.calculate(`wideFlanges =` + wideFlanges, hurmetVars)
  const dict = `'{"#4": 0.22, "#5": 0.31} in2'`
  hurmet.calculate(`barArea =` + dict, hurmetVars)
  const module = `E = '29000 ksi'

  v = [4, 6, 8]
  
  function multiply(a, b)
     return a × b
  end`
  hurmetVars["mod"] = hurmet.scanModule(module)

  const renderMath = (doc, demoOutput) => {
    hurmet.autoCorrect(doc)
    const entry = doc.getValue()
    const format = document.getElementById("formatBox").value.trim()
    hurmetVars.format = { value: format }
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

  exports.renderMath = renderMath
  exports.prompts = {
    "statement-container": "2 + 2 = ?",
    "arithmetic-container": "2 × 4 + 3^2/7 = ?",
    "variable-container": "b = 2 L = ?",
    "greek-container": "theta + x dot + f''",
    "q-container": "2 × '3.1 m' = ?? ft",
    "markup": "(a, b; c, d)",
    "auto-correct": "theta hat <= bb M xx sqrt 3 . f''",
    "display-selectors": "b = 2 L = ?? ft",
    "accessor-container": "𝐕[2] = ?",
    "calculation-forms": "x = 2 A = ?",
    "identifiers": "f_c′ = 4500",
    "identi-correct": "bb M != h_sub +  theta bar + f''",
    "data-types": `"a string" ≠ 2.3`,
    "number-rr": "33 / 2.45 × 3.2% + 3 7/8 + 3.1e1 = ?",
    "complex-number": "4∠30° = ?",
    "quantity": "'9.807 m/s²' = ?? ft/s²",
    "matrix": "[2.1; -15.3]",
    "matrix-mult": "[1, 2, 3] [3; 2; 1] = ?",
    "data-frame": "wideFlanges.W10X49.A = ?? in2",
    "dictionary": 'A = barArea["#4"] = ?',
    "functions": "sin(π/6) = ?",
    "if-expressions": `x = {1 if 12 < 30; 0 otherwise} = ?`,
    "unit-aware-calculations": "'4 ft' + '3 yards' = ?? m",
    "remote-modules": "mod.E = ?? psi"
  }

  return exports

}({}))
