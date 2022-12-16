/* eslint-disable */

/* I've revised this version of CodeJar for Hurmet math zones.
 * I've removed history and highlighting. They each had a delay and Hurmet
 * needs speed in order to update a view of the math with every keystroke.
 */

const codeJar = (editor, isMathPrompt) => {
  const options = {
    tab: "   ",
    indentOn: /{$/,
    catchTab: true,
    preserveIdent: true,
    addClosing: true
  };

  const document = window.document;

  const listeners = [];
  let callback;

  editor.setAttribute("contenteditable", "plaintext-only");
  editor.setAttribute("spellcheck", "false");
  editor.style.outline = "none";
  editor.style.overflowWrap = "break-word";
  editor.style.overflowY = "auto";
  editor.style.whiteSpace = "pre-wrap";

  let isLegacy = false; // true if plaintext-only is not supported

  if (editor.contentEditable !== "plaintext-only") isLegacy = true;
  if (isLegacy) editor.setAttribute("contenteditable", "true");

  const on = (type, fn) => {
    listeners.push([type, fn]);
    editor.addEventListener(type, fn);
  }

  ;on("keydown", event => {
    // The next five lines are Hurmet customization. Not part of vanilla CodeJar.
    if (isMathPrompt && event.keyCode === 13 && !event.shiftKey) return
    if (event.keyCode === 65 && event.ctrlKey ) {
      window.getSelection().selectAllChildren(editor);
      event.preventDefault();
    }
    if (event.defaultPrevented) return
    if (options.preserveIdent) handleNewLine(event);
    else legacyNewLineFix(event);
    if (options.catchTab) handleTabCharacters(event);
    if (options.addClosing) handleSelfClosingCharacters(event);
    if (isLegacy) restore(save());
  })

  ;on("keyup", event => {
    if (event.defaultPrevented) return
    if (event.isComposing) return
    if (callback) callback(toString());
  })

  ;on("paste", event => {
    handlePaste(event);
    if (callback) callback(toString());
  });

  function save() {
    const s = getSelection();
    const pos = { start: 0, end: 0, dir: undefined };

    let { anchorNode, anchorOffset, focusNode, focusOffset } = s;
    if (!anchorNode || !focusNode) throw "error1"

    // Selection anchor and focus are expected to be text nodes,
    // so normalize them.
    if (anchorNode.nodeType === Node.ELEMENT_NODE) {
      const node = document.createTextNode("");
      anchorNode.insertBefore(node, anchorNode.childNodes[anchorOffset]);
      anchorNode = node;
      anchorOffset = 0;
    }
    if (focusNode.nodeType === Node.ELEMENT_NODE) {
      const node = document.createTextNode("");
      focusNode.insertBefore(node, focusNode.childNodes[focusOffset]);
      focusNode = node;
      focusOffset = 0;
    }

    visit(editor, el => {
      if (el === anchorNode && el === focusNode) {
        pos.start += anchorOffset;
        pos.end += focusOffset;
        pos.dir = anchorOffset <= focusOffset ? "->" : "<-";
        return "stop"
      }

      if (el === anchorNode) {
        pos.start += anchorOffset;
        if (!pos.dir) {
          pos.dir = "->";
        } else {
          return "stop"
        }
      } else if (el === focusNode) {
        pos.end += focusOffset;
        if (!pos.dir) {
          pos.dir = "<-";
        } else {
          return "stop"
        }
      }

      if (el.nodeType === Node.TEXT_NODE) {
        if (pos.dir != "->") pos.start += el.nodeValue.length;
        if (pos.dir != "<-") pos.end += el.nodeValue.length;
      }
    });

    // collapse empty text nodes
    editor.normalize();

    return pos
  }

  function restore(pos) {
    const s = getSelection();
    let startNode,
      startOffset = 0;
    let endNode,
      endOffset = 0;

    if (!pos.dir) pos.dir = "->";
    if (pos.start < 0) pos.start = 0;
    if (pos.end < 0) pos.end = 0;

    // Flip start and end if the direction reversed
    if (pos.dir == "<-") {
      const { start, end } = pos;
      pos.start = end;
      pos.end = start;
    }

    let current = 0;

    visit(editor, el => {
      if (el.nodeType !== Node.TEXT_NODE) return

      const len = (el.nodeValue || "").length;
      if (current + len > pos.start) {
        if (!startNode) {
          startNode = el;
          startOffset = pos.start - current;
        }
        if (current + len > pos.end) {
          endNode = el;
          endOffset = pos.end - current;
          return "stop"
        }
      }
      current += len;
    });

    if (!startNode)
      (startNode = editor), (startOffset = editor.childNodes.length);
    if (!endNode) (endNode = editor), (endOffset = editor.childNodes.length);

    // Flip back the selection
    if (pos.dir == "<-") {
[startNode, startOffset, endNode, endOffset] = [
        endNode,
        endOffset,
        startNode,
        startOffset
      ];
    }

    s.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
  }

  function beforeCursor() {
    const s = getSelection();
    const r0 = s.getRangeAt(0);
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.setEnd(r0.startContainer, r0.startOffset);
    return r.toString()
  }

  function afterCursor() {
    const s = getSelection();
    const r0 = s.getRangeAt(0);
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.setStart(r0.endContainer, r0.endOffset);
    return r.toString()
  }

  function handleNewLine(event) {
    if (event.key === "Enter") {
      const before = beforeCursor();
      const after = afterCursor();

      let [padding] = findPadding(before);
      let newLinePadding = padding;

      // If last symbol is "{" ident new line
      // Allow user defines indent rule
      if (options.indentOn.test(before)) {
        newLinePadding += options.tab;
      }

      // Preserve padding
      if (newLinePadding.length > 0) {
        preventDefault(event);
        event.stopPropagation();
        insert("\n" + newLinePadding);
      } else {
        legacyNewLineFix(event);
      }

      // Place adjacent "}" on next line
      if (newLinePadding !== padding && after[0] === "}") {
        const pos = save();
        insert("\n" + padding);
        restore(pos);
      }
    }
  }

  function legacyNewLineFix(event) {
    // Firefox does not support plaintext-only mode
    // and puts <div><br></div> on Enter. Let's help.
    if (isLegacy && event.key === "Enter") {
      preventDefault(event);
      event.stopPropagation();
      if (afterCursor() == "") {
        insert("\n ");
        const pos = save();
        pos.start = --pos.end;
        restore(pos);
      } else {
        insert("\n");
      }
    }
  }

  function handleSelfClosingCharacters(event) {
    const open = `([{'"`;
    const close = `)]}'"`;
    const codeAfter = afterCursor();
    const codeBefore = beforeCursor();
    const escapeCharacter = codeBefore.substr(codeBefore.length - 1) === "\\";
    const charAfter = codeAfter.substr(0, 1);
    if (
      close.includes(event.key) &&
      !escapeCharacter &&
      charAfter === event.key
    ) {
      // We already have closing char next to cursor.
      // Move one char to right.
      const pos = save();
      preventDefault(event);
      pos.start = ++pos.end;
      restore(pos);
    } else if (
      open.includes(event.key) &&
      !escapeCharacter &&
      (`"'`.includes(event.key) || ["", " ", "\n"].includes(charAfter))
    ) {
      preventDefault(event);
      const pos = save();
      const wrapText = pos.start == pos.end ? "" : getSelection().toString();
      const text = event.key + wrapText + close[open.indexOf(event.key)];
      insert(text);
      pos.start++;
      pos.end++;
      restore(pos);
    }
  }

  function handleTabCharacters(event) {
    if (event.key === "Tab") {
      preventDefault(event);
      if (event.shiftKey) {
        const before = beforeCursor();
        let [padding, start] = findPadding(before);
        if (padding.length > 0) {
          const pos = save();
          // Remove full length tab or just remaining padding
          const len = Math.min(options.tab.length, padding.length);
          restore({ start, end: start + len });
          document.execCommand("delete");
          pos.start -= len;
          pos.end -= len;
          restore(pos);
        }
      } else {
        insert(options.tab);
      }
    }
  }

  function handlePaste(event) {
    preventDefault(event);
    const text = (event.originalEvent || event).clipboardData
      .getData("text/plain")
      .replace(/\r/g, "");
    const pos = save();
    insert(text);
    restore({ start: pos.start + text.length, end: pos.start + text.length });
  }

  function visit(editor, visitor) {
    const queue = [];

    if (editor.firstChild) queue.push(editor.firstChild);

    let el = queue.pop();

    while (el) {
      if (visitor(el) === "stop") break

      if (el.nextSibling) queue.push(el.nextSibling);
      if (el.firstChild) queue.push(el.firstChild);

      el = queue.pop();
    }
  }

  function insert(text) {
    text = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    document.execCommand("insertHTML", false, text);
  }

  function findPadding(text) {
    // Find beginning of previous line.
    let i = text.length - 1;
    while (i >= 0 && text[i] !== "\n") i--;
    i++;
    // Find padding of the line.
    let j = i;
    while (j < text.length && /[ \t]/.test(text[j])) j++;
    return [text.substring(i, j) || "", i, j]
  }

  function toString() {
    return editor.textContent || ""
  }

  function preventDefault(event) {
    event.preventDefault();
  }

  function getSelection() {
    if (editor.parentNode && editor.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
      return editor.parentNode.getSelection()
    }
    return window.getSelection()
  }

  return {
    updateOptions(newOptions) {
      Object.assign(options, newOptions);
    },
    updateCode(code) {
      editor.textContent = code;
    },
    onUpdate(cb) {
      callback = cb;
    },
    toString,
    save,
    restore,
    destroy() {
      for (let [type, fn] of listeners) {
        editor.removeEventListener(type, fn);
      }
    }
  }
};

/**
 * Returns selected text.
 */
function selectedText() {
  const s = window.getSelection();
  if (s.rangeCount === 0) return ""
  return s.getRangeAt(0).toString()
}

/**
 * Returns text before the cursor.
 * @param editor Editor DOM node.
 */
function textBeforeCursor(editor) {
  const s = window.getSelection();
  if (s.rangeCount === 0) return ""

  const r0 = s.getRangeAt(0);
  const r = document.createRange();
  r.selectNodeContents(editor);
  r.setEnd(r0.startContainer, r0.startOffset);
  return r.toString()
}

/**
 * Returns text after the cursor.
 * @param editor Editor DOM node.
 */
function textAfterCursor(editor) {
  const s = window.getSelection();
  if (s.rangeCount === 0) return ""

  const r0 = s.getRangeAt(0);
  const r = document.createRange();
  r.selectNodeContents(editor);
  r.setStart(r0.endContainer, r0.endOffset);
  return r.toString()
}

/* eslint-disable */

// Set up the REPL in the reference manual.
// Define some variables and store their data in hurmetVars.
const hurmetVars = Object.create(null);
hurmet.calculate(`x = 5`, hurmetVars);
hurmet.calculate(`w = 100 'lbf/ft'`, hurmetVars);
hurmet.calculate(`L = 3.1 'm'`, hurmetVars);
hurmet.calculate(`name = "James"`, hurmetVars);
hurmet.calculate(`s = "abcde"`, hurmetVars);
hurmet.calculate(`𝐕 = [1, 2, 3, 4, 5]`, hurmetVars);
hurmet.calculate(`𝐌 = (1, 2, 3; 4, 5, 6; 7, 8, 9)`, hurmetVars);
const df = "``" + `name,w,area\n,in,in²\nA,4,10\nB,6,22` + "``";
hurmet.calculate(`DF =` + df, hurmetVars);
hurmet.calculate(`A = 8`, hurmetVars);
const wideFlanges = "``" + `name|weight|A|d|bf|tw|Ix|Sx|rx\n|lbf/ft|in^2|in|in|in|in^4|in^3|in\nW14X90|90|26.5|14|14.5|0.44|999|143|6.14\nW12X65|65|19.1|12.1|12|0.39|533|87.9|5.28\nW10X49|49|14.4|10|10|0.34|272|54.6|4.35\nW8X31|31|9.13|8|8|0.285|110|27.5|3.47\nW8X18|18|5.26|8.14|5.25|0.23|61.9|15.2|3.43\nW6X15|15|4.43|5.99|5.99|0.23|29.1|9.72|2.56\nW4X13|13|3.83|4.16|4.06|0.28|11.3|5.46|1.72` + "``";
hurmet.calculate(`wideFlanges =` + wideFlanges, hurmetVars);
const dict = `{"#4": 0.22, "#5": 0.31} 'in2'`;
hurmet.calculate(`barArea =` + dict, hurmetVars);
const module = "E = 29000 'ksi'\n\nv = [4, 6, 8]\n\nfunction multiply(a, b)\n  return a × b\nend";
hurmetVars["mod"] = hurmet.scanModule(module);

const renderMath = (jar, demoOutput) => {
  let entry = jar.toString();
  const selText = selectedText();
  if (selText.length === 0) {
    // eslint-disable-next-line no-undef
    hurmet.autoCorrect(jar, textBeforeCursor(editor), textAfterCursor(editor));
  }
  entry = jar.toString();
  const format = document.getElementById("formatBox").value.trim();
  hurmetVars.format = { value: format };
  const tex = hurmet.calculate(entry, hurmetVars);

  try {
    if (typeof tex === "object" && tex.dtype && tex.dtype === hurmet.dt.DRAWING) {
      demoOutput.appendChild(hurmet.Draw.renderSVG(tex.resultdisplay));
    } else {
      katex.render(tex, demoOutput, {
        strict: false,
        macros: {"\\class": "\\htmlClass"},
        trust: (context) => context.command === "\\htmlClass" && context.class === "special-fraction",
        throwOnError: false
      });
    }
  } catch(err) {
    while(demoOutput.lastChild) {
      demoOutput.removeChild(demoOutput.lastChild);
    }
    const msgNode = document.createTextNode(err.message);
    const span = document.createElement("span");
    span.appendChild(msgNode);
    demoOutput.appendChild(span);
    span.setAttribute("class", "errorMessage");
  }
};

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
  "number-rr": "33 / 2.45 × 3.2% + 3 7/8 + 3.1e1 = ?",
  "complex-number": "4∠30° = ??",
  "unit": "9.807 'm/s²' = ?? ft/s²",
  "matrix": "[2.1; -15.3]",
  "matrix-mult": "[1, 2, 3] [3; 2; 1] = ?",
  "data-frame": "wideFlanges.W10X49.A = ?? in2",
  "dictionary": 'A = barArea["#4"] = ?',
  "functions": "sin(π/6) = ?",
  "if-expressions": `x = {1 if 12 < 30; 0 otherwise} = ?`,
  "unit-aware-calculations": "4 'ft' + 3 'yards' = ?? m",
  "remote-modules": "mod.E = ?? psi"
};

// Render math via KaTeX.
const texSpans = document.getElementsByClassName("tex");
[...texSpans].forEach(span => {
  const tex = span.dataset.tex.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  katex.render(tex, span, { strict: false, throwOnError: false });
});

// Start the demonstration editor
const editor = document.getElementById("demo-input");
const jar = codeJar(editor, false);
const demoOutput = document.getElementById("demo-output");
editor.addEventListener("input", e => {
  renderMath(jar, demoOutput);
});
jar.updateCode("Hi!");
renderMath(jar, demoOutput);

// Change the content of the demonstration box to match the currently scrolled topic.
var observer = new IntersectionObserver(function(entries) {
  for (const entry of entries) {
    if (entry.intersectionRatio === 1.0) {
      jar.updateCode(prompts[entry.target.id]);
      renderMath(jar, demoOutput);
      break
    }
  }
}, {
root: null,
rootMargin: '0px',
threshold: 1.0
});

observer.observe(document.getElementById("statement-container"));
observer.observe(document.getElementById("arithmetic-container"));
observer.observe(document.getElementById("variable-container"));
observer.observe(document.getElementById("greek-container"));
observer.observe(document.getElementById("q-container"));
observer.observe(document.getElementById("markup"));
observer.observe(document.getElementById("auto-correct"));
observer.observe(document.getElementById("display-selectors"));
observer.observe(document.getElementById("accessor-container"));
observer.observe(document.getElementById("calculation-forms"));
observer.observe(document.getElementById("identifiers"));
observer.observe(document.getElementById("identi-correct"));
observer.observe(document.getElementById("data-types"));
observer.observe(document.getElementById("number-rr"));
observer.observe(document.getElementById("complex-number"));
observer.observe(document.getElementById("unit"));
observer.observe(document.getElementById("matrix"));
observer.observe(document.getElementById("matrix-mult"));
observer.observe(document.getElementById("data-frame"));
observer.observe(document.getElementById("functions"));
observer.observe(document.getElementById("if-expressions"));
observer.observe(document.getElementById("unit-aware-calculations"));
observer.observe(document.getElementById("remote-modules"));
