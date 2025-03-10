import { autoCorrect } from "./autocorrect"
import { codeJar, selectedText, textBeforeCursor, textAfterCursor } from "./codejar"
import { findWordAtClickPos, positionOfDefinition } from "./findDefinition"
import hurmet from "./hurmet"

const commaRegEx = /"[^"]*"|[0-9]+,[0-9]+|[A-Za-zıȷ\u0391-\u03D5\uD835][A-Za-z0-9_ıȷ\u0391-\u03D5\uD835\uDC00-\uDFFF]/g
const dotRegEx = /"[^"]*"|[0-9]+\.[0-9]+|[A-Za-zıȷ\u0391-\u03D5\uD835][A-Za-z0-9_ıȷ\u0391-\u03D5\uD835\uDC00-\uDFFF]/g
const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/

const dotFromCommaForStorage = (str) => {
  // Lex for strings, numbers, and identifiers
  let match
  while ((match = commaRegEx.exec(str)) != null) {
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
  while ((match = dotRegEx.exec(str)) !== null) {
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

  const close = () => {
    if (wrapper.parentNode) {
      wrapper.parentNode.firstChild.removeAttribute("style")
      wrapper.parentNode.removeChild(wrapper)
    }
  }

  const isCalculation = (options.encoding === "HurmetMath")
  const isTex = !isCalculation
  const decimalSymbol = isCalculation
    ? options.outerView.state.doc.attrs.decimalFormat.slice(-1)
    : ""

  const editor = wrapper.appendChild(document.createElement("div"))
  const jar = codeJar(editor, true)

  // Populate the editor.
  if (options.attrs) {
    if (isCalculation && options.attrs.entry) {
      let math = options.attrs.entry
      if (decimalSymbol === ",") { math = commaFromDotForDisplay(math) }
      jar.updateCode(math)
    } else if (options.attrs.tex) {
      jar.updateCode(options.attrs.tex)
    }
  }
  // Place the cursor at the end of the editor.
  const L = jar.toString().length
  jar.restore({ start: L, end: L, dir: undefined })

  const closeIfNotHint = _ => {
    // Close, unless the math zone was blurred to click on a hint.
    if (document.getElementsByClassName("ProseMirror-prompt").length === 0) {
      close()
    }
  }
  editor.addEventListener("blur", closeIfNotHint )

  const mathDisplay = wrapper.appendChild(document.createElement("div"))
  mathDisplay.setAttribute("class", "math-display")

  const renderMath = function(code) {
    let tex = ""
    let isUDF = false
    if (isCalculation) {
      // Check if an auto-correct is needed (after a user types a space.)
      const selText = selectedText(editor)
      if (selText.length === 0) {
        autoCorrect(jar, textBeforeCursor(editor), textAfterCursor(editor))
      }
      tex = jar.toString()
      if (decimalSymbol === ",") { tex = dotFromCommaForStorage(tex) }
      isUDF = functionRegEx.test(tex)
      if (!isUDF) {
        const formats = {
          decimalFormat: options.outerView.state.doc.attrs.decimalFormat,
          dateFormat: options.outerView.state.doc.attrs.dateFormat
        }
        tex = hurmet.parse(tex, formats, false, true)
      }
    } else {
      tex = code
    }
    if (!isUDF) {
      try {
        hurmet.render(tex, mathDisplay, {
          displayMode: options.attrs.displayMode,
          trust: (context) => context.command === '\\class' &&
                              context.class === "special-fraction",
          wrap: "=",
          errorColor: "#fff"
        })
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        while (mathDisplay.lastChild) {
          mathDisplay.removeChild(mathDisplay.lastChild)
        }
        mathDisplay.textContent = tex
      }
    }
  }
  if (jar.toString().length > 0) { renderMath(jar.toString()) }

  editor.addEventListener("input", e => {
    renderMath(jar.toString())
  })

  const submit = _ => {
    // Get the string that the user typed into the prompt box.
    let mathString = jar.toString()
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
    const formats = {
      decimalFormat: options.outerView.state.doc.attrs.decimalFormat,
      dateFormat: options.outerView.state.doc.attrs.dateFormat
    }
    const params = (isTex)
      ? { tex: mathString }
      : hurmet.compile(mathString, formats)
    params.displayMode = options.attrs.displayMode
    if (wrapper.parentNode) {
      wrapper.parentNode.firstChild.removeAttribute("style")
      if (!params.displayMode && wrapper.dataset['data-display'] &&
                                 wrapper.dataset['data-display'] === "true") {
        params.displayMode = true
      } else if (params.displayMode && !wrapper.dataset['data-display']) {
        params.displayMode = false
      }
    }
    options.callback(params)
    editor.removeEventListener('blur', close)
    if (wrapper.parentNode) {
      wrapper.remove()
    }
  }

  editor.addEventListener("submit", e => {
    e.preventDefault()
    submit()
  })

  editor.addEventListener("keydown", e => {
    if (e.keyCode === 27) {
      // Esc. Close without updating.
      e.preventDefault()
      close()
    } else if (e.keyCode === 13 && !e.shiftKey) {
      // Submit upon Enter. (Shift-Enter creates a newline.)
      e.preventDefault()
      submit()
    }
  })

  editor.addEventListener("pointerup", e => {
    if (e.ctrlKey || e.metaKey) {
      // Check if the clicked-on word is a previously defined variable
      const word = findWordAtClickPos(jar.toString(), jar.pos())
      if (word) {
        const defPos = positionOfDefinition(word, options.outerView.state.doc, options.pos)
        if (defPos > -1) {
          // Hand control to the callback, which will scroll to the definition.
          e.preventDefault()
          if (wrapper.parentNode) {
            wrapper.parentNode.classList.remove("ProseMirror-selectednode")
          }
          options.callback2(defPos)
          close()
        }
      }
    }
  })
}
