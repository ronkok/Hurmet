/* eslint-disable */

/* I've revised this version of CodeJar for Hurmet math zones.
 * I've removed CodeJare history. It had a delay and Hurmet needs speed
 * in order to update a view of the math with every keystroke.
 */

import { boldPrevChar } from "./autocorrect"

const highlight = (editor) => {
  const code = editor.textContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\t/gm, '<span style="background-color: lemonchiffon">\t</span>')
  editor.innerHTML = code
}

export const codeJar = (editor, isMathPrompt) => {
  const options = {
    tab: "\t",
    indentOn: /{$/,
    catchTab: true,
    preserveIdent: true,
    addClosing: true
  }

  const document = window.document

  const listeners = []
  let callback
  let prev

  editor.setAttribute("contenteditable", "plaintext-only")
  editor.setAttribute("spellcheck", "false")
  editor.style.outline = "none"
  editor.style.overflowWrap = "break-word"
  editor.style.overflowY = "auto"
  editor.style.whiteSpace = "pre-wrap"

  const doHighlight = (editor) => {
    highlight(editor)
  }
  
  let isLegacy = false // true if plaintext-only is not supported

  if (editor.contentEditable !== "plaintext-only") isLegacy = true
  if (isLegacy) editor.setAttribute("contenteditable", "true")

  const debounceHighlight = debounce(() => {
    const pos = save()
    doHighlight(editor)
    restore(pos)
  }, 30)

  const on = (type, fn) => {
    listeners.push([type, fn])
    editor.addEventListener(type, fn)
  }

  ;on("keydown", event => {
    // The next five lines are Hurmet customization. Not part of vanilla CodeJar.
    if (isMathPrompt && event.keyCode === 13 && !event.shiftKey) return
    if (isMathPrompt && event.keyCode === 66 && event.ctrlKey) {
      // Make the previous letter bold.
      const preText = textBeforeCursor(editor)
      const ch = boldPrevChar(preText)
      if (ch) {
        const L = preText.length
        editor.textContent = preText.slice(0, -1) + ch + textAfterCursor(editor)
        restore({ start: L, end: L, dir: undefined })
      }
    }
    if (event.keyCode === 65 && event.ctrlKey ) {
      window.getSelection().selectAllChildren(editor)
      event.preventDefault()
    }
    if (event.defaultPrevented) return
    prev = toString()
    if (options.preserveIdent) handleNewLine(event)
    else legacyNewLineFix(event)
    if (options.catchTab) handleTabCharacters(event)
    if (options.addClosing) handleSelfClosingCharacters(event)
    if (isLegacy) restore(save())
  })

  ;on("keyup", event => {
    if (event.defaultPrevented) return
    if (event.isComposing) return
    if (prev !== toString()) debounceHighlight()
    if (callback) callback(toString())
  })

  ;on("paste", event => {
    handlePaste(event)
  })

  function save() {
    const s = getSelection()
    const pos = { start: 0, end: 0, dir: undefined }

    let { anchorNode, anchorOffset, focusNode, focusOffset } = s
    if (!anchorNode || !focusNode) throw "error1"

    // Selection anchor and focus are expected to be text nodes,
    // so normalize them.
    if (anchorNode.nodeType === Node.ELEMENT_NODE) {
      const node = document.createTextNode("")
      anchorNode.insertBefore(node, anchorNode.childNodes[anchorOffset])
      anchorNode = node
      anchorOffset = 0
    }
    if (focusNode.nodeType === Node.ELEMENT_NODE) {
      const node = document.createTextNode("")
      focusNode.insertBefore(node, focusNode.childNodes[focusOffset])
      focusNode = node
      focusOffset = 0
    }

    visit(editor, el => {
      if (el === anchorNode && el === focusNode) {
        pos.start += anchorOffset
        pos.end += focusOffset
        pos.dir = anchorOffset <= focusOffset ? "->" : "<-"
        return "stop"
      }

      if (el === anchorNode) {
        pos.start += anchorOffset
        if (!pos.dir) {
          pos.dir = "->"
        } else {
          return "stop"
        }
      } else if (el === focusNode) {
        pos.end += focusOffset
        if (!pos.dir) {
          pos.dir = "<-"
        } else {
          return "stop"
        }
      }

      if (el.nodeType === Node.TEXT_NODE) {
        if (pos.dir != "->") pos.start += el.nodeValue.length
        if (pos.dir != "<-") pos.end += el.nodeValue.length
      }
    })

    // collapse empty text nodes
    editor.normalize()

    return pos
  }

  function restore(pos) {
    const s = getSelection()
    let startNode,
      startOffset = 0
    let endNode,
      endOffset = 0

    if (!pos.dir) pos.dir = "->"
    if (pos.start < 0) pos.start = 0
    if (pos.end < 0) pos.end = 0

    // Flip start and end if the direction reversed
    if (pos.dir == "<-") {
      const { start, end } = pos
      pos.start = end
      pos.end = start
    }

    let current = 0

    visit(editor, el => {
      if (el.nodeType !== Node.TEXT_NODE) return

      const len = (el.nodeValue || "").length
      if (current + len > pos.start) {
        if (!startNode) {
          startNode = el
          startOffset = pos.start - current
        }
        if (current + len > pos.end) {
          endNode = el
          endOffset = pos.end - current
          return "stop"
        }
      }
      current += len
    })

    if (!startNode)
      (startNode = editor), (startOffset = editor.childNodes.length)
    if (!endNode) (endNode = editor), (endOffset = editor.childNodes.length)

    // Flip back the selection
    if (pos.dir == "<-") {
      ;[startNode, startOffset, endNode, endOffset] = [
        endNode,
        endOffset,
        startNode,
        startOffset
      ]
    }

    s.setBaseAndExtent(startNode, startOffset, endNode, endOffset)
  }

  function beforeCursor() {
    const s = getSelection()
    const r0 = s.getRangeAt(0)
    const r = document.createRange()
    r.selectNodeContents(editor)
    r.setEnd(r0.startContainer, r0.startOffset)
    return r.toString()
  }

  function afterCursor() {
    const s = getSelection()
    const r0 = s.getRangeAt(0)
    const r = document.createRange()
    r.selectNodeContents(editor)
    r.setStart(r0.endContainer, r0.endOffset)
    return r.toString()
  }

  function handleNewLine(event) {
    if (event.key === "Enter") {
      const before = beforeCursor()
      const after = afterCursor()

      let [padding] = findPadding(before)
      let newLinePadding = padding

      // If last symbol is "{" ident new line
      // Allow user defines indent rule
      if (options.indentOn.test(before)) {
        newLinePadding += options.tab
      }

      // Preserve padding
      if (newLinePadding.length > 0) {
        preventDefault(event)
        event.stopPropagation()
        insert("\n" + newLinePadding)
      } else {
        legacyNewLineFix(event)
      }

      // Place adjacent "}" on next line
      if (newLinePadding !== padding && after[0] === "}") {
        const pos = save()
        insert("\n" + padding)
        restore(pos)
      }
    }
  }

  function legacyNewLineFix(event) {
    // Firefox does not support plaintext-only mode
    // and puts <div><br></div> on Enter. Let's help.
    if (isLegacy && event.key === "Enter") {
      preventDefault(event)
      event.stopPropagation()
      if (afterCursor() == "") {
        insert("\n ")
        const pos = save()
        pos.start = --pos.end
        restore(pos)
      } else {
        insert("\n")
      }
    }
  }

  function handleSelfClosingCharacters(event) {
    const open = `([{'"`
    const close = `)]}'"`
    const codeAfter = afterCursor()
    const codeBefore = beforeCursor()
    const escapeCharacter = codeBefore.substr(codeBefore.length - 1) === "\\"
    const charAfter = codeAfter.substr(0, 1)
    if (
      close.includes(event.key) &&
      !escapeCharacter &&
      charAfter === event.key
    ) {
      // We already have closing char next to cursor.
      // Move one char to right.
      const pos = save()
      preventDefault(event)
      pos.start = ++pos.end
      restore(pos)
    } else if (
      open.includes(event.key) &&
      !escapeCharacter &&
      (`"'`.includes(event.key) || ["", " ", "\n"].includes(charAfter))
    ) {
      preventDefault(event)
      const pos = save()
      const wrapText = pos.start == pos.end ? "" : getSelection().toString()
      const text = event.key + wrapText + close[open.indexOf(event.key)]
      insert(text)
      pos.start++
      pos.end++
      restore(pos)
    }
  }

  function handleTabCharacters(event) {
    if (event.key === "Tab") {
      preventDefault(event)
      if (event.shiftKey) {
        const before = beforeCursor()
        let [padding, start] = findPadding(before)
        if (padding.length > 0) {
          const pos = save()
          // Remove full length tab or just remaining padding
          const len = Math.min(options.tab.length, padding.length)
          restore({ start, end: start + len })
          document.execCommand("delete")
          pos.start -= len
          pos.end -= len
          restore(pos)
        }
      } else {
        insert(options.tab)
      }
    }
  }

  function handlePaste(event) {
    preventDefault(event)
    const text = (event.originalEvent || event).clipboardData
      .getData("text/plain")
      .replace(/\r/g, "")
    const pos = save()
    insert(text)
    doHighlight(editor)
    restore({ start: pos.start + text.length, end: pos.start + text.length })
  }

  function visit(editor, visitor) {
    const queue = []

    if (editor.firstChild) queue.push(editor.firstChild)

    let el = queue.pop()

    while (el) {
      if (visitor(el) === "stop") break

      if (el.nextSibling) queue.push(el.nextSibling)
      if (el.firstChild) queue.push(el.firstChild)

      el = queue.pop()
    }
  }

  function isCtrl(event) {
    return event.metaKey || event.ctrlKey
  }

  function insert(text) {
    text = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
    document.execCommand("insertHTML", false, text)
  }

  function debounce(cb, wait) {
    let timeout = 0
    return (...args) => {
      clearTimeout(timeout)
      timeout = window.setTimeout(() => cb(...args), wait)
    }
  }

  function findPadding(text) {
    // Find beginning of previous line.
    let i = text.length - 1
    while (i >= 0 && text[i] !== "\n") i--
    i++
    // Find padding of the line.
    let j = i
    while (j < text.length && /[ \t]/.test(text[j])) j++
    return [text.substring(i, j) || "", i, j]
  }

  function toString() {
    return editor.textContent || ""
  }

  function preventDefault(event) {
    event.preventDefault()
  }

  function getSelection() {
    if (editor.parentNode && editor.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
      return editor.parentNode.getSelection()
    }
    return window.getSelection()
  }

  function pos() {
    return window.getSelection().anchorOffset
  }

  return {
    updateOptions(newOptions) {
      Object.assign(options, newOptions)
    },
    updateCode(code) {
      editor.textContent = code
      doHighlight(editor)
    },
    onUpdate(cb) {
      callback = cb
    },
    toString,
    pos,
    save,
    restore,
    destroy() {
      for (let [type, fn] of listeners) {
        editor.removeEventListener(type, fn)
      }
    }
  }
}

/**
 * Returns selected text.
 */
export function selectedText() {
  const s = window.getSelection()
  if (s.rangeCount === 0) return ""
  return s.getRangeAt(0).toString()
}

/**
 * Returns text before the cursor.
 * @param editor Editor DOM node.
 */
export function textBeforeCursor(editor) {
  const s = window.getSelection()
  if (s.rangeCount === 0) return ""

  const r0 = s.getRangeAt(0)
  const r = document.createRange()
  r.selectNodeContents(editor)
  r.setEnd(r0.startContainer, r0.startOffset)
  return r.toString()
}

/**
 * Returns text after the cursor.
 * @param editor Editor DOM node.
 */
export function textAfterCursor(editor) {
  const s = window.getSelection()
  if (s.rangeCount === 0) return ""

  const r0 = s.getRangeAt(0)
  const r = document.createRange()
  r.selectNodeContents(editor)
  r.setStart(r0.endContainer, r0.endOffset)
  return r.toString()
}
