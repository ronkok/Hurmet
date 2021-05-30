import { TextField } from "./prompt"

const commaRegEx = /"[^"]*"|[0-9]+,[0-9]+|[A-Za-zıȷ\u0391-\u03D5\uD835][A-Za-z0-9_ıȷ\u0391-\u03D5\uD835\uDC00-\uDFFF]/
const dotRegEx = /"[^"]*"|[0-9]+\.[0-9]+|[A-Za-zıȷ\u0391-\u03D5\uD835][A-Za-z0-9_ıȷ\u0391-\u03D5\uD835\uDC00-\uDFFF]/
const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/
const moduleRegEx = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′* *= * module\b/

const dotFromCommaForStorage = (str) => {
  // Lex for strings, numbers, and identifiers
  let match
  // eslint-disable-next-line no-cond-assign
  while (match = commaRegEx.exec(str)) {
    if ("0123456789".indexOf(match[0].charAt(0)) > -1) {
      // Change comma decimal to dot decimal.
      const pos = match.index + match[0].indexOf(",")
      str = str.slice(0, pos) + "." + str.slice(pos + 1)
    }
  }
  return str
}

const commaFromDotForDisplay = (str) => {
  let match
  // eslint-disable-next-line no-cond-assign
  while (match = dotRegEx.exec(str)) {
    if ("0123456789".indexOf(match[0].charAt(0)) > -1) {
      // Change dot decimal to comma decimal.
      const pos = match.index + match[0].indexOf(".")
      str = str.slice(0, pos) + "," + str.slice(pos + 1)
    }
  }
  return str
}

export function openMathPrompt(options) {
  const wrapper = options.dom.appendChild(document.createElement("div"))
  wrapper.className = "math-code"
  wrapper.parentNode.firstChild.style.display = "none"

  const mouseOutside = e => {
    const target = e.target
    // wrapper.contains(target) will, in my experience, sometimes give a false negative.
    // So I've added conditions to ensure target is not a CodeMirror node.
    if (!wrapper.contains(target) && target.getAttribute("role") !== "presentation") {
      const targetClass = target.getAttribute("class")
      if (!targetClass || targetClass.slice(0, 2) !== "cm") {
        close()
      }
    }
  }
  setTimeout(() => window.addEventListener("mousedown", mouseOutside), 500)
  const close = () => {
    window.removeEventListener("mousedown", mouseOutside)
    wrapper.parentNode.firstChild.style.display = "inline"
    if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper) }
  }

  const isCalculation = (options.encoding === "HurmetMath")
  const isTex = !isCalculation
  const decimalSymbol = isCalculation ? options.decimalFormat.slice(-1) : ""

  const form = wrapper.appendChild(document.createElement("form"))
  const field = (new TextField({ required: true, value: "" })).render()
  form.appendChild(field)

  if (isCalculation) {
    // Define syntax highlighting for Hurmet calculation cells.
    // eslint-disable-next-line no-undef
    CodeMirror.defineSimpleMode("hurmet", {
      // The start state contains the rules that are intially used
      start: [
        // The regex matches the token, the token property contains the type
        { regex: /"[^"]*"|`[^`]*`/, token: "string" },
        { regex: /(function)(\s+)((?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′)/,
          token: ["keyword", null, "variable-2"] },
        { regex: /(')([$£¥₨₪€])?(-?(?:[0-9]+(?: [0-9]+\/[0-9]+|(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)?|0x[0-9A-Fa-f]+)) *([^']*)(')/,
          token: ["attribute", "attribute", "number", "attribute", "attribute"] },
        { regex: /(?:function|export|return|if|for|in|while|else|otherwise|and|or|modulo|break|echo|raise)\b/,
          token: "keyword" },
        { regex: /π|ℏ|true|false/, token: "atom" },
        { regex: /(-?)(?:([0-9]+)(?: ([0-9]+)\/([0-9]+)|(?:\.([0-9]+))?(?:e([+-]?[0-9]+))?)|(0x[0-9A-Fa-f]+))/,
          token: "number" },
        { regex: /#.*/, token: "comment" },
        { regex: /\\[A-Za-z]+/, token: "variable-3" },
        { regex: /[-+/*×·∘⊗⌧^%‰&√!¡|‖&=<>≟≠≅≤≥∈∉⋐∧∨⊻¬]+/, token: "operator" },
        // indent and dedent properties guide autoindentation
        { regex: /[{[(]/, indent: true },
        { regex: /[}\])]/, dedent: true },
        { regex: /(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*(?=\()/,
          token: "builtin" },
        { regex: /(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*/,
          token: "variable" }
      ],
      meta: {
        dontIndentStates: ["comment"],
        lineComment: "//"
      }
    })
  }

  // eslint-disable-next-line no-undef
  const mathEditor = CodeMirror.fromTextArea(field, {
    mode: (isCalculation ? "hurmet" : null),
    indentUnit: 3,
    smartIndent: false,
    tabSize: 3,
    autoCloseBrackets: true,
    autofocus: true,
    lineWrapping: true,
    electricChars: false,
    matchBrackets: true
  })

  const mathDoc = mathEditor.doc  // The CodeMirror document object.
  if (options.attrs) {
    if (isCalculation && options.attrs.entry) {
      let math = options.attrs.entry
      if (decimalSymbol === ",") { math = commaFromDotForDisplay(math) }
      mathDoc.setValue(math)
    } else if (options.attrs.tex) {
      mathDoc.setValue(options.attrs.tex)
    }
  }

  mathDoc.setCursor(mathDoc.lineCount(), 0);
  const mathDisplay = form.appendChild(document.createElement("div"))
  mathDisplay.setAttribute("class", "math-display")

  const renderMath = function() {
    let tex = ""
    let isUDF = false
    if (isCalculation) {
      // eslint-disable-next-line no-undef
      hurmet.autoCorrect(mathDoc)
      tex = (mathDoc.getValue())
      if (decimalSymbol === ",") { tex = dotFromCommaForStorage(tex) }
      isUDF = functionRegEx.test(tex) || moduleRegEx.test(tex)
      if (!isUDF) {
        // eslint-disable-next-line no-undef
        tex = hurmet.parse(tex, options.decimalFormat, false, true)
      }
    } else {
      tex = mathDoc.getValue()
    }
    if (!isUDF) {
      try {
        const isFF = 'MozAppearance' in document.documentElement.style
        // eslint-disable-next-line no-undef
        katex.render(tex, mathDisplay, { displayMode: options.attrs.displayMode, strict: false,
          output: isFF ? "mathml" : "htmlAndMathml" })
      } catch (err) {
        while (mathDisplay.lastChild) {
          mathDisplay.removeChild(mathDisplay.lastChild)
        }
        mathDisplay.textContent = tex
      }
    }
  }
  if (mathDoc.getValue().length > 0) { renderMath() }

  mathEditor.on('change', function() {
    renderMath()
  })

  const submit = _ => {
    // Get the string that the user typed into the prompt box.
    let mathString = mathDoc.getValue()
    // Strip leading spaces and trailing spaces
    mathString = mathString.replace(/^[\s\u200b]+/, "")
    mathString = mathString.replace(/[\s\u200b]+$/, "")
    mathString = mathString.replace(/\r?\n/g, "\n")
    // Save all number strings with no thousands separator and with a
    // dot for a decimal separator. Later functions will display numbers
    // in the reader's preference for decimal separator.
    if (isCalculation && decimalSymbol === ",") {
      mathString = dotFromCommaForStorage(mathString)
    }
    const params = (isTex)
      ? { tex: mathString }
      // eslint-disable-next-line no-undef
      : hurmet.prepareStatement(mathString, options.decimalFormat)
    params.displayMode = options.attrs.displayMode
    close()
    options.callback(params)
  }

  form.addEventListener("submit", e => {
    e.preventDefault()
    submit()
  })

  form.addEventListener("keydown", e => {
    if (e.keyCode === 27) {
      // Esc. Close without updating.
      e.preventDefault()
      close()
    } else if (e.keyCode === 13 && !e.shiftKey) {
      // Submit upon Enter. (Shift-Enter creates a newline.)
      e.preventDefault()
      submit()
    } else if (e.keyCode === 9) {
      // tab
      window.setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) { close() }
      }, 500)
    }
  })

  const input = form.elements[0]
  if (input) { input.focus() }
}
