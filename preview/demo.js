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

// autocorrect.js

const autoCorrectRegEx = /([!?:<>\-~/_]=| \.|~~|\+-|-\+|<-->|<->|<>|<--|<-|-->|->|=>|-:|\^\^|\|\||\/\/\/|\b(bar|hat|vec|tilde|dot|ddot|ul)|\b(bb|bbb|cc|ff|ss) [A-Za-z]|\\?[A-Za-z]{2,}|\\c|\\ |\\o|root [234]|<<|>>|\^-?[0-9]+|\|\|\||\/_|''|""|00)\s$/;

const accents = {
  acute: "\u0301",
  bar: "\u0305",
  breve: "\u0306",
  check: "\u030c",
  dot: "\u0307",
  ddot: "\u0308",
  grave: "\u0300",
  hat: "\u0302",
  harpoon: "\u20d1",
  leftharpoon: "\u20d0",
  leftrightvec: "\u20e1",
  leftvec: "\u20d6",
  ring: "\u030a",
  tilde: "\u0303",
  vec: "\u20d7",
  ul: "\u0332"
};

const autoCorrections = {
  alpha: "α",
  beta: "β",
  chi: "χ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  varepsilon: "\u025B",
  eta: "\u03B7",
  gamma: "γ",
  Gamma: "Γ",
  iota: "\u03B9",
  kappa: "\u03BA",
  lambda: "λ",
  Lambda: "Λ",
  mu: "μ",
  nu: "\u03BD",
  omega: "ω",
  Omega: "Ω",
  phi: "\u03D5",
  varphi: "\u03C6",
  Phi: "\u03A6",
  pi: "π",
  Pi: "Π",
  psi: "ψ",
  Psi: "Ψ",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  theta: "θ",
  vartheta: "\u03D1",
  Theta: "Θ",
  upsilon: "\u03C5",
  xi: "\u03BE",
  Xi: "\u039E",
  zeta: "\u03B6",
  prime: "ʹ",
  ee: "ε",
  ll: "λ",
  sqrt: "√",
  "root 2": "\u221A",
  "root 3": "\u221B",
  "root 4": "\u221C",
  AA: "∀",
  CC: "\u2102",
  EE: "∃",
  HH: "\u210D",
  NN: "\u2115",
  QQ: "\u211A",
  RR: "\u211D",
  ZZ: "\u2124",
  OO: "𝒪",
  ii: "√(-1)",
  oo: "∞", // infinity
  ooo: "°",
  not: "¬",
  "-:": "÷",
  "\\ ": "˽",  // space
  "\\c": "¢",
  "\\cdots": "\u22ef",
  "\\vdots": "\u22ee",
  "\\ddots": "\u22f1",
  "\\floor": "\u23BF\u23CC",
  "\\ceil": "\u23BE\u23CB",
  xx: "×",
  "\\int": "∫",
  "\\iint": "∬",
  "\\oint": "∮",
  "\\sum": "∑",
  nn: "∩", // cap
  nnn: "⋂",
  uu: "∪", // cup
  uuu: "⋃",
  "\\del": "∂",
  "\\grad": "∇",
  "\\hbar": "ℏ",
  "\\ell": "ℓ",
  "\\nabla": "∇",
  "\\alef": "ℵ",
  "\\subset": "⊂",
  "\\supset": "⊃",
  "\\subseteq": "⊆",
  "\\nsubset": "⊄",
  "\\nsubseteq": "⊈",
  "\\forall": "∀",
  "\\therefore": "∴",
  "\\mapsto": "↦",
  "\\checkmark": "✓",
  bar: "\u02C9",
  dot: "\u02D9",
  ddot: "\u00A8",
  hat: "\u02C6",
  tilde: "\u02DC",
  vec: "\u00A0\u20D7",
  "\\land": "∧",
  "\\lor": "∨",
  "\\not": "¬",
  "\\notin": "∉",
  "\\euro": "€",
  "\\pound": "£",
  "\\yen": "¥",
  "\\o": "ø",
  "^^": "∧",
  vv: "∨",
  vvv: "⋁",
  "\\xor": "⊻",
  "\\in": "\u2208",
  "!=": "≠",
  "<>": "≠",
  ":=": "≔",
  "?=": "≟",
  "<=": "≤",
  ">=": "≥",
  "-=": "≡",
  "~=": "≅",
  "_=": "≡",
  "~~": "≈",
  "+-": "±",
  "-+": "∓",
  "<<": "\u27E8",
  ">>": "\u27E9",
  "///": "\u2215",
  "<->": "\u2194",
  "<-": "\u2190",
  "<--": "\u27F5",
  "-->": "⟶",
  "->": "→",
  "=>": "⇒",
  "<-->": "\\xrightleftarrows",
  "\\circ": "∘",
  "\\otimes": "⊗",
  "|||": "¦",
  "||": "‖",
  "/_": "∠",
  " .": "\u00B7", // half-high dot
  "''": "\u2032", // two apostrophes → prime
  '""': "\u2033" // double prime
};

const supCharFromNum = {
  "^": "",
  "-": "⁻",
  "2": "²",
  "3": "³",
  "1": "¹",
  "0": "⁰",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "(": "",
  ")": ""
};

const superscript = str => {
  let superChar = "";
  for (const ch of str) {
    superChar += supCharFromNum[ch];
  }
  return superChar
};

const lowSurrogateDiff = {
  // captital diff, lower case diff
  bb: [0xdbbf, 0xdbb9], //  bold
  bbb: [0xdcf7, 0xdcf1], // blackboard bold
  cc: [0xdc5b, 0xdc55], // calligraphic
  ff: [0xdd5f, 0xdd59] //   sans-serif
};

// 7 blackboard bold characters (ℂ, ℍ, ℕ, ℙ, ℚ, ℝ, ℤ) have Unicode code points in the
// basic multi-lingual plane. So they must be treated differently than the other
// blackboard bold characters. Eleven calligraphic characters work the same way.
const wideExceptions = [0xdd3a, 0xdd3f, 0xdd45, 0xdd47, 0xdd48, 0xdd49, 0xdd51, // bbb
  0xdc9d, 0xdca0, 0xdca1, 0xdca3, 0xdca4, 0xdca7, 0xdca8, // calligraphic
  0xdcad, 0xdcba, 0xdcbc, 0xdcc1, 0xdcc4];

const bbb = {
  C: "\u2102",
  H: "\u210D",
  N: "\u2115",
  P: "\u2119",
  Q: "\u211A",
  R: "\u211D",
  Z: "\u2124"
};
const calligraphic = {
  B: "\u212C",
  E: "\u2130",
  F: "\u2131",
  H: "\u210B",
  I: "\u2110",
  L: "\u2112",
  M: "\u2133",
  R: "\u211B",
  e: "\u212F",
  g: "\u210A",
  l: "\u2113",
  o: "\u2134"
};

const accentedChar = str => {
  const posSpace = str.indexOf(" ");
  const ch = str.substring(posSpace + 1);
  const accentName = str.substring(0, posSpace);
  switch (accentName) {
    case "bb": // bold
    case "bbb": // blackboard bold
    case "cc": // caligraphic
    case "ff": { // sans-serif
      const code = ch.charCodeAt(0);
      let newChar = "";
      if (code < 0x0041 || code > 0x007a) { return null }
      const isSmall = code < 0x005b ? 0 : 1;
      if (accentName === "cc" && isSmall && code !== 0x006c) { return null }
      if (code > 0x005a && accentName === "bbb") { return null }
      const lowSurrogate = code + lowSurrogateDiff[accentName][isSmall];
      if (wideExceptions.includes(lowSurrogate)) {
        newChar = accentName === "bbb" ? bbb[ch] : calligraphic[ch];
      } else {
        newChar = "\uD835" + String.fromCharCode(lowSurrogate);
      }
      return newChar
    }

    default:
      return null
  }
};

const autoCorrect = (jar, preText, postText) => {
  // Auto-correct math in real time.
  // jar is an instance of a CodeJar editing box.
//  const pos = doc.getCursor()
  if (preText.length > 0 && preText.slice(-1) === " ") {
    // Auto-correct only after the user hits the space bar.
    const matches = autoCorrectRegEx.exec(preText);
    if (matches) {
      const word = matches[0].slice(0, -1); // Trim the final space.
      let correction;
      const accent = accents[word];
      if (accent) {
        const newStr = preText.slice(0, -(matches[0].length + 1)) + accent;
        jar.updateCode(newStr + postText);
        // Move the cursor to the correct location
        const L = newStr.length;
        jar.restore({ start: L, end: L, dir: undefined });
      } else {
        correction = autoCorrections[word]; // Check for a match in the lookup table.
        if (!correction) {
          // No perfect match in the lookup table. Try for a superscript or an accent.
          if (word.charAt(0) === "^") {
            correction = superscript(word); // e.g. x²
          } else {
            if (word.indexOf(" ") > 0) {
              // accented char or Unicode character. E.g. bar y   or   bb M
              correction = accentedChar(word);
            }
          }
        }
      }
      if (correction) {
        const newStr = preText.slice(0, -matches[0].length) + correction;
        jar.updateCode(newStr + postText);
        // Move the cursor to the correct location
        const L = newStr.length;
        jar.restore({ start: L, end: L, dir: undefined });
      }
    }
  }
};

// unit exponents of a number with no unit.
const allZeros = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]);

// Data types
// Some operands will be two types at the same time, e.g. RATIONAL + MATRIX.
// So we'll enumerate data types in powers of two.
// That way, we can use a bit-wise "&" operator to test for an individual type.
const dt = Object.freeze({
  NULL: 0,
  RATIONAL: 1,
  COMPLEX: 2,
  BOOLEAN: 4,
  FROMCOMPARISON: 8,
  BOOLEANFROMCOMPARISON: 12, // 4 + 8, useful for chained comparisons
  STRING: 16,
  QUANTITY: 32, // Contains both a magnitude and a unit-of-measure
  DATE: 64, //     Not currently used
  RANGE: 128, //   as in:  1:10
  TUPLE: 256, //   Used for multiple assignment from a module.
  MAP: 512,  //    A key:value store with all the same data type the same unit
  ROWVECTOR: 1024,
  COLUMNVECTOR: 2048,
  MATRIX: 4096, // two dimensional
  DATAFRAME: 8192,
  MODULE: 16384, // contains user-defined functions
  ERROR: 32768,
  UNIT: 65536, // User-defined units.
  DRAWING: 131072,
  RICHTEXT: 262144
});

/*
 * Hurmet, copyright (c) by Ron Kok
 * Distributed under an MIT license: https://Hurmet.app/LICENSE.txt
 *
 * Hurmet adds calculation cells to the ProseMirror rich text editor.
 * See https://Hurmet.app and https://Hurmet.app/docs/en/manual.html
 */

// utils.js

const isIn = (item, arry) => {
  // Binary search to see if item is in an array
  // This works only if the array is pre-sorted.
  if (arry.length === 0) { return false }
  let i = 0;
  let iLow = 0;
  let iHigh = arry.length - 1;
  while (iLow < iHigh) {
    i = Math.floor((iLow + iHigh) / 2);
    if (item > arry[i]) {
      iLow = i + 1;
    } else {
      iHigh = i;
    }
  }
  return item === arry[iLow]
};

const clone = obj => {
  // Clone a JavaScript object.
  // That is, make a deep copy that does not contain any reference to the original object.
  // This function works if the object conatains only these types:
  //     boolean, number, bigint, string, null, undefined, date, array, object, Map
  // Any other type, or non-tree structure (e.g., "this"), cannot be handled by this function.
  // This is a modified version of https://stackoverflow.com/a/728694

  // Handle boolean, number, bigint, string, null, or undefined
  // eslint-disable-next-line eqeqeq
  if (null == obj || "object" != typeof obj) { return obj }

  if (obj instanceof Date) { return new Date().setTime(obj.valueOf()) }

  if (Array.isArray(obj)) {
    const copy = [];
    for (let i = 0, len = obj.length; i < len; i++) {
      copy[i] = clone(obj[i]);
    }
    return copy
  }

  if (obj instanceof Map) {
    const copy = new Map();
    for (const [key, value] of obj.entries()) {
      copy.set(key, clone(value));
    }
    return copy
  }

  if (typeof obj === "object") {
    const copy = Object.create(null);
    Object.entries(obj).forEach(([key, value]) => {
      copy[key] = clone(value);
    });
    return copy
  }

  throw new Error("Unable to clone obj! Its type isn't supported.")
};


// A map function for Maps
const mapMap = (map, fn) => {
  const newMap = new Map();
  for (const [key, value] of map.entries()) {
    newMap.set(key, fn(value));
  }
  return newMap
};


// A function to return an array containing all matches to a RegEx pattern.
const arrayOfRegExMatches = (regex, text) => {
  if (regex.constructor !== RegExp) { throw new Error('not RegExp') }
  const result = [];
  let match = null;

  /* eslint-disable no-cond-assign */
  if (regex.global) {
    while (match = regex.exec(text)) {
      result.push({ value: match[0], index: match.index, length: match[0].length });
    }
  } else if (match = regex.exec(text)) {
    result.push({ value: match[0], index: match.index, length: match[0].length });
  }
  /* eslint-enable no-cond-assign */

  return result
};

const textAccent = {
  "\u0300": "`",
  "\u0301": "'",
  "\u0302": "^",
  "\u0303": "~",
  "\u0304": "=",
  "\u0305": "=",
  "\u0306": "u",
  "\u0307": ".",
  "\u0308": '"',
  "\u030A": 'r',
  "\u030c": "v"
};

const escapeRegEx = /[#$&%_~^]/g;
const accentRegEx = /[\u0300-\u0308\u030A\u030c]/g;

const addTextEscapes = str => {
  // Insert escapes for # $ & % _ ~ ^ \ { }
  // TODO: \textbackslash.
  // TODO: How to escape { } without messing up Lex?
  if (str.length > 1) {
    let matches = arrayOfRegExMatches(escapeRegEx, str);
    let L = matches.length;
    if (L > 0) {
      for (let i = L - 1; i >= 0; i--) {
        const match = matches[i];
        const pos = match.index;
        if (match.value === "~") {
          str = str.slice(0, pos) + "\\textasciitilde " + str.slice(pos + 1);
        } else if (match.value === "^") {
          str = str.slice(0, pos) + "\\textasciicircum " + str.slice(pos + 1);
        } else if (pos === 0) {
          str = "\\" + str;
        } else {
          const pc = str.substr(pos - 1, 1);
          if (pc !== "\\") {
            str = str.slice(0, pos) + "\\" + str.slice(pos);
          }
        }
      }
    }
    matches = arrayOfRegExMatches(accentRegEx, str);
    L = matches.length;
    if (L > 0) {
      for (let i = L - 1; i >= 0; i--) {
        const match = matches[i];
        const pos = match.index;
        if (pos > 0) {
          str = str.slice(0, pos - 1) + "\\" + textAccent[match.value]
              + str.slice(pos - 1, pos) + str.slice(pos + 1);
        }
      }
    }
  }
  return str
};

const numeralFromSuperScript = ch => {
  // convert a superscript character, ⁰¹²³ etc, to the regular numeral equivalent.
  switch (ch) {
    case "²":
      return "2"
    case "³":
      return "3"
    case "⁻":
      return "-"
    case "¹":
      return "1"
    case "⁰":
      return "0"
    default:
      return String.fromCharCode(ch.charCodeAt(0) - 0x2040)
  }
};

// Trim spaces except for tabs. This is used to read tab-delimited CSV.
const leadingSpaceRegEx = /^[ \r\n\f]+/;
const trailingSpaceRegEx = /[ \r\n\f]+$/;
const tablessTrim = str => {
  return str.replace(leadingSpaceRegEx, "").replace(trailingSpaceRegEx, "")
};

const midDotRegEx = /^(\*|·|\.|-[A-Za-z])/;
const exponentRegEx = /[⁰¹²³\u2074-\u2079⁻]/;

const unitTeXFromString = str => {
  // I wrap a unit name with an extra pair of braces {}.
  // Tt's a hint so that plugValsIntoEcho() can easily remove a unit name.
  let unit = " {\\text{";
  let inExponent = false;

  for (let i = 0; i < str.length; i++) {
    let ch = str.charAt(i);
    if (exponentRegEx.test(ch)) {
      ch = numeralFromSuperScript(ch);
    }
    if (midDotRegEx.test(str.slice(i))) {
      unit += "}\\mkern1mu{\\cdot}\\mkern1mu\\text{";
    } else if (/[0-9-]/.test(ch)) {
      ch = ch === "-" ? "\\text{-}" : ch;
      if (inExponent) {
        unit += ch;
      } else {
        unit += "}^{" + ch;
        inExponent = true;
      }
    } else if (ch === "^") {
      unit += "}^{";
      inExponent = true;
    } else if (inExponent) {
      unit += "}\\text{" + ch;
      inExponent = false;
    } else if (ch === "$") {
      unit += "\\$";
    } else {
      unit += ch;
    }
  }

  return unit + "}}"
};

const errorMessages = Object.freeze({
  EN: {
    ERROR:     "Error. Hurmet does not understand the expression.",
    ERR_FUNC:  "@",
    BAD_FUN_NM:"Error. Unrecognized function name \"@\".",
    DIV:       "Error. Divide by zero.",
    NAN:       "Error. Value of $@$ is not a numeric.",
    NANARG:    "Error. Argument to function $@$ must be numeric.",
    NULL:      "Error. Missing value for $@$.", // $@$ will be italic in TeX
    V_NAME:    "Error. Variable $@$ not found.",
    F_NAME:    "Error. Function @ not found.",
    NAN_OP:    "Error. Arithmetic operation on a non-numeric value.",
    UNIT_ADD:  "Error. Adding incompatible units.",
    UNIT_COMP: "Error. Comparing incompatible units.",
    UNIT_APEND:"Error. Apppending incompatible units.",
    UNIT_RES:  "Error. Calculated units are not compatible with the desired result unit:",
    UNIT_MISS: "Error. No units specified for the result.",
    UNIT_IN:   "Error. Incorrect unit for input to function @.",
    UNIT_ARG:  "Error. Unit mis-match between arguments to function @.",
    UNIT_COL:  "Error. Data frame column @ has no units. Do not make a unit-aware call to it.",
    UNIT_AWARE: "Error. Calculation must be unit-aware in order to apply unit @",
    DATE:      "Error. Date required.",
    LOGIC:     "Error. Logic operation “@” on a non-boolean value.",
    FACT:      "Error. Factorial may be applied only to a unit-less non-negative integer.",
    PER:       "Error. Percentage may be applied only to a unit-less number.",
    BINOM:     "Error. Binomial may be applied only to unit-less numbers.",
    LOGF:      "Error. Argument to log!() must be a non-negative integer.",
    Γ0:        "Error. Γ(0) is infinite.",
    ΓPOLE:     "Error. Γ() of a negative integer is infinite.",
    LOGΓ:      "Error. Argument to Hurmet logΓ() must be a positive number.",
    TAN90:     "Error. tan($@$) is infinite.",
    ATRIG:     "Error. Input to @ must be between -1 and 1.",
    COT:       "Error. Input to @ must not be zero.",
    ASEC:      "Error. Absolute value of input to @ must be ≥ 1",
    STRING:    "Error. Text operand required.",
    NUMARGS:   "Error. Wrong number of arguments passed to function @.",
    NONSQUARE: "Error. Only a square matrix can be inverted.",
    SINGULAR:  "Error. Matrix is singular and cannot be inverted.",
    BAD_ROW_NAME:     "Error. Data frame does not have a row named @.",
    BAD_COLUMN_NAME:  "Error. Data frame does not have a column named @.",
    SINGLE_ARG:"Error. A call to a data frame must have two arguments in the brackets.",
    BAD_TYPE:  "Error. Unrecognized data type for $@$.",
    CONCAT:    "Error. Cannot add strings. Use \"&\" if concatenation is desired.",
    MATRIX_DIV:"Error. Cannot divide one matrix by another.",
    MATRIX_MOD:"Error. Cannot take the modulo of one matrix by another.",
    BAD_INDEX: "Error. Index to a matrix must be numeric.",
    FUNC_LINE: "Error in function @.",
    BAD_BREAK: "Error in function @. break called outside of a loop",
    FETCH:     "Error. A fetch() function must be the only item in its expression.",
    STR_INDEX: "Error. The index to text may be only a real number or a range.",
    UNIT_NAME: "Error. Unrecognized unit name: @",
    INT_NUM:   "Error. Number display type \"@\" must be an integer.",
    TWO_MAPS:  "Error. Both operands are maps. Hurmet accepts only one.",
    BAD_FORMAT:"Error. Invalid format @.",
    BAD_PREC:  "Error. Significant digit specification must be between 1 and 15.",
    ZERO_ROOT: "Error. Zeroth root.",
    BAD_ROOT:  "Error while taking root.",
    UNREAL:    "Error. Argument to function \"@\" must be a real number.",
    BIGINDEX:  "Error. Index too large.",
    MIS_ELNUM: "Error. Mis-matched number of elements",
    // eslint-disable-next-line max-len
    CROSS:     "Error. Cross product can be performed only on three-vectors. Use * if you want element-wise multiplication.",
    QUANT_NUM: "Error. A Quantity must include a numeric magnitude.",
    CURRENCY:  "Error. Currency exchange rates must be defined before using a monetary unit.",
    DF_UNIT:   "Invalid unit \"&\" in data frame.",
    FORM_FRAC: "Error. Hurmet can do binary or hexadecimal format only on integers.",
    PRIVATE:   "Error. Function @ is not private.",
    GCD:       "Error. The gcd function can take only integers as arguments.",
    BAD_KEY:   "Error. Data structure does not contain key \"@\".",
    NUM_KEY:   "Error. A key must be a string, not a number.",
    IMMUT_UDF: `Error. Variable @ already contains a user-defined function.
                Hurmet cannot assign a different value to @.`,
    NO_PROP:   `Error. Cannot call a property from variable "@" because it has no properties.`,
    NOT_ARRAY: `Error. Cannot check if an element is in the second operand because
 the second operand is not an array.`,
    MULT_MIS:  "Error. Mismatch in number of multiple assignment.",
    COUNT:     "Error. The count() function works only on strings.",
    NOT_VECTOR:"Error. Arguments to dataframe() must be vectors.",
    BAD_DISPLAY:"Error. Result may not be suppressed. Use '?' display selector.",
    NA_COMPL_OP:"Error. \"@\" cannot be performed on a complex number.",
    NA_REAL:    "Error. \"@\" can be performed only a complex number.",
    ORIGIN:     "Error. Function \"@\" is undefined at the origin.",
    LOG_ZERO:   "Error. Logarithm of zero is negative infinity.",
    END_MISS:   "Error. Too few END statments in function @.",
    BAD_CONCAT: "Error. Unmatched dimensions.",
    BAD_KEYSTR: "Error. The key in a key:value pair must be a string.",
    BAD_APPEND: "Error. Can not append a @",
    MAP_APPEND: "Error. Can not append. Wrong data type.",
    BAD_J:      "Error. Do not use j for a loop index. In Hurmet, j = √(-1)"
  }
});

const errorOprnd = (errorCode, messageInsert) => {
  if (errorCode === "") { return { value: "Error", unit: null, dtype: dt.ERROR } }
  let msg = errorMessages["EN"][errorCode];
  if (msg === undefined) { return { value: "Error", unit: null, dtype: dt.ERROR } }
  if (messageInsert) {
    messageInsert = addTextEscapes(messageInsert);
    msg = msg.replace(/@/g, messageInsert);
  } else {
    msg = msg.replace(/@ ?/, "");
  }
  return { value: msg, unit: null, dtype: dt.ERROR }
};

/*
 * This file implements a rational number data type.
 * Each rational number, r, is held as an array containing two BigInts.
 * r[0] is the numerator and r[1] is the denominator.
 * Negative rationals have a negative numerator, not a negative denominator.
 *
 * The code in this file is heavily influenced by Chapter 5 of
 * __How JavaScript Works__ by Douglas Crockford
 */

const iZero = BigInt(0);
const iOne = BigInt(1);
const iTwo = BigInt(2);
const zero = [iZero, iOne];
const one = [iOne, iOne];
const two = [iTwo, iOne];
const pi$1 = [BigInt(31415926535897932384626433832795028841971693993751),
  BigInt(10000000000000000000000000000000000000000000000000)];
const e$1 = [BigInt(2718281828459045235360287471352662497757247093699959574966),
  BigInt(1000000000000000000000000000000000000000000000000000000000)];
// reduced Planck constant
const hbar = [BigInt(1054571817),
  BigInt(10000000000000000000000000000000000000000000)];

const intAbs = i => i >= iZero ? i : BigInt(-1) * i;  // absolute value of a BigInt

// eslint-disable-next-line max-len
const numberPattern = "^(-?)(?:(0x[0-9A-Fa-f]+)|([0-9]+)(?: ([0-9]+)\\/([0-9]+)|(?:\\.([0-9]+))?(?:e([+-]?[0-9]+)|(%))?))";
const numberRegEx = new RegExp(numberPattern);
// Capturing groups:
//    [1] sign
//    [2] hexadecimal integer
//    [3] integer part
//    [4] numerator of a mixed fraction
//    [5] denominator of a mixed fraction
//    [6] decimal fraction of significand, not including decimal point
//    [7] exponent of a number in scientific notation
//    [8] percentage sign

const fromNumber = num => {
  // Convert a JavaScript Number to a rational.
  if (Number.isInteger(num)) {
    return [BigInt(num), iOne]
  } else {
    const parts = num.toExponential().match(numberRegEx);
    const decimalFrac = parts[6] || "";
    const exp = BigInt(parts[7]) - BigInt(decimalFrac.length);
    if (exp < 0) {
      return [BigInt(parts[1] + parts[3] + decimalFrac), BigInt(10) ** -exp]
    } else if (parts[5]) {
      const denominator = BigInt(parts[5]);
      return normalize(
        [BigInt(parts[1] + parts[3]) * denominator + BigInt(parts[4]) ])
    } else {
      return normalize([BigInt(parts[1] + parts[3] + decimalFrac) * BigInt(10) ** exp, iOne])
    }
  }
};

const fromString = str => {
  // Convert an author's input string to a number.
  const parts = str.match(numberRegEx);
  let r;
  if (parts[5]) {
    // mixed fraction
    const denominator = BigInt(parts[5]);
    const numerator = BigInt(parts[1] + parts[3]) * denominator + BigInt(parts[4]);
    r = normalize([numerator, denominator]);

  } else if (parts[2]) {
    // hexadecimal
    r = [BigInt(parts[2]), iOne];

  } else {
    // decimal
    const decimalFrac = parts[6] || "";
    const numerator = BigInt(parts[3] + decimalFrac);
    const exp = parts[7]
      ? BigInt(parts[7]) - BigInt(decimalFrac.length)  // scientific notation.
      : parts[8]
      ? BigInt(-2) - BigInt(decimalFrac.length)  // percentage.
      : BigInt(0) - BigInt(decimalFrac.length);
    r = (exp < 0)
      ? [numerator, BigInt(10) ** -exp]
      : normalize([numerator * BigInt(10) ** exp, iOne]);
  }
  if (parts[1]) { r = negate(r); }
  return r
};

const gcdi = (a, b) => {
  // Greatest common divisor of two big integers
  a = intAbs(a);
  b = intAbs(b);
  while (b !== iZero) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a
};

const gcd = (m, n) => {
  // Greatest common divisor of two rationals
  if (!Rnl.isInteger(m) || !Rnl.isInteger(n)) { return errorOprnd("GCD") }
  return [gcdi(m[0] / m[1], n[0] / n[1]), iOne]
};

const normalize = r => {
  const [numerator, denominator] = r;
  if (denominator === iOne) { return r }
  const gcD = gcdi(numerator, denominator);
  return gcD === iOne ? r : [numerator / gcD, denominator / gcD]
};

const isRational = a => {
  return Array.isArray(a) && a.length === 2
    && typeof a[0] === "bigint" && typeof a[1] === "bigint"
};

const isInteger = r => r[1] === iOne || (r[0] % r[1]) === iZero;

const isZero = r => r[0] === iZero;

const isNegative = r => r[0] < iZero;
const isPositive = r => r[0] > iZero;

const negate = r => [BigInt(-1) * r[0], r[1]];

const abs = r => {
  const numerator = r[0] < iZero ? BigInt(-1) * r[0] : r[0];
  return [numerator, r[1]]
};

const increment = r => [r[0] + r[1], r[1]];

const decrement = r => [r[0] - r[1], r[1]];

const floor = r => {
  if (r[0] % r[1] === iZero) { return [r[0] / r[1], iOne] }
  return (r[0] >= iZero)
    ? [r[0] / r[1], iOne]
    : [r[0] / r[1] - iOne, iOne]
};

const ceil = r => {
  if (r[0] % r[1] === iZero) { return [r[0] / r[1], iOne] }
  return (r[0] >= iZero)
    ? [r[0] / r[1] + iOne, iOne]
    : [r[0] / r[1], iOne]
};

const add = (a, b) => {
  return a[1] === b[1]
    ? [a[0] + b[0], a[1]]
    : normalize([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
};

const subtract = (a, b) => {
  return (a[1] === b[1])
    ? [a[0] - b[0], a[1]]
    : normalize([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
};

const multiply = (a, b) => [a[0] * b[0], a[1] * b[1]];

const divide = (a, b) => {
  let numerator = a[0] * b[1];
  let denominator = a[1] * b[0];
  if (denominator < 0) {
    // Move the negative from the denominator to the numerator.
    numerator *= BigInt(-1);
    denominator *= BigInt(-1);
  }
  return [numerator, denominator]
};

const power = (a, b) => {
  if (b[0] === iZero) {
    return [iOne, iOne]
  } else {
    b = normalize(b);
    let result;
    try {
      result = isInteger(b) && isNegative(b)
        ? [a[1] ** (BigInt(-1) * b[0]), a[0] ** (BigInt(-1) * b[0])]
        : isInteger(b)
        ? [a[0] ** b[0], a[1] ** b[0]]
        : isPositive(a) || greaterThan(b, one) || lessThan(b, negate(one))
        ? fromNumber(toNumber(a) ** toNumber(b))
        : areEqual(modulo(b, two), one)
        ? fromNumber(-1 * (-1 * toNumber(a)) ** toNumber(b))
        : errorOprnd("BAD_ROOT");
    } catch (err) {
      result = fromNumber(toNumber(a) ** toNumber(b));
    }
    return result
  }
};

const sqrt = r => fromNumber(Math.sqrt(toNumber(r)));

const exp = r => fromNumber(Math.exp(toNumber(r)));

const reciprocal = r => {
  let numerator = r[1];
  let denominator = r[0];
  if (denominator < 0) {
    numerator *= BigInt(-1);
    denominator *= BigInt(-1);
  }
  return [numerator, denominator]
};

const hypot = (a, b) => {
  // Ref: https://www.johndcook.com/blog/2010/06/02/whats-so-hard-about-finding-a-hypotenuse/
  const absA = abs(a);
  const absB = abs(b);
  const maximum = max(absA, absB);
  const minimum = min(absA, absB);
  const r = Rnl.divide(minimum, maximum);
  return Rnl.multiply(maximum, sqrt(Rnl.increment(Rnl.multiply(r, r))))
};

const modulo = (a, b) => {
  const quotient = divide(normalize(a), normalize(b));
  return [intAbs(quotient[0] % quotient[1]), iOne]
};

const areEqual = (a, b) => {
  return (a[1] === b[1])
    ? a[0] === b[0]
    : a[0] * b[1] === a[1] * b[0]
};

const lessThan = (a, b) => {
  return (isNegative(a) !== isNegative(b))
    ? isNegative(a)
    : isNegative(subtract(a, b))
};

const greaterThan = (a, b) => {
  return (isPositive(a) !== isPositive(b))
    ? isPositive(a)
    : isPositive(subtract(a, b))
};

const lessThanOrEqualTo = (a, b) => lessThan(a, b) || areEqual(a, b);

const greaterThanOrEqualTo = (a, b) => greaterThan(a, b) || areEqual(a, b);

const max = (a, b) => greaterThan(a, b) ? [a[0], a[1]] : [b[0], b[1]];

const min = (a, b) => lessThan(a, b) ? [a[0], a[1]] : [b[0], b[1]];

const cos = x => {
  return areEqual(x, divide(pi$1, two))
    ? zero
    : fromNumber(Math.cos(toNumber(x)))
};

const sin = x => fromNumber(Math.sin(toNumber(x)));

const tan = x => {
  if (areEqual(x, divide(pi$1, two))) {
    return errorOprnd("TAN90", "π/2")
  }
  return fromNumber(Math.tan(toNumber(x)))
};

const cosh = x => {
  // cosh(n) = (eⁿ + e⁻ⁿ) / 2
  const num = toNumber(x);
  return fromNumber((Math.exp(num) + Math.exp(-num)) / 2)
};

const sinh = x => {
  // sinh(n) = (eⁿ - e⁻ⁿ) / 2
  const num = toNumber(x);
  return fromNumber((Math.exp(num) - Math.exp(-num)) / 2)
};

const tanh = x => {
  // tanh(n) = (eⁿ - e⁻ⁿ) / (eⁿ + e⁻ⁿ)
  const num = toNumber(x);
  return fromNumber(
    (Math.exp(num) - Math.exp(-num)) / (Math.exp(num) + Math.exp(-num))
  )
};

const toNumber = r => {
  // Return a JavaScript Number
  const num = Number(r[0]) / Number(r[1]);  // May be imprecise.
  if (!isNaN(num) && num !== Infinity ) { return num }
  const numStr = toStringSignificant(r, 20);
  return Number(numStr)
};

const toStringSignificant = (r, numSignificantDigits) => {
  // Return a string rounded to numSignificantDigits.
  if (isZero(r)) {
    return "0"
  } else {
    const quotient = intAbs(r[0] / r[1]);
    if (quotient > 0) {
      return toString(r, numSignificantDigits - String(quotient).length)
    } else {
      const inverseQuotientLength = String(intAbs(r[1] / r[0])).length;
      return toString(r, inverseQuotientLength + numSignificantDigits - 1)
    }
  }
};

const toString = (r, numDigitsAfterDecimal) => {
  // Return a string rounded to numDigitsAfterDecimal.
  if (isZero(r)) {
    return "0"
  } else if (numDigitsAfterDecimal < 0) {
    const N = -numDigitsAfterDecimal;
    const significand = toString(divide(r, [BigInt(10) ** BigInt(N), iOne]), 0);
    return significand + "0".repeat(N)
  } else {
    const [numerator, denominator] = normalize(r);
    const quotient = numerator / denominator;
    let remainder = numerator % denominator;
    let result = String(quotient);
    if (remainder === iZero && numDigitsAfterDecimal > 0) {
      result += "." + "0".repeat(numDigitsAfterDecimal);
    } else if (remainder !== iZero) {
      remainder = intAbs(remainder);
      const newNumerator = remainder * (BigInt(10) ** BigInt(numDigitsAfterDecimal));
      let fractus = newNumerator / denominator;
      const residue = newNumerator % denominator;
      if (numDigitsAfterDecimal === 0) {
        return (intAbs(iTwo * residue) >= intAbs(denominator))
          ? String(quotient + iOne)
          : result
      }
      if (intAbs(iTwo * residue) >= intAbs(denominator)) {
        fractus = fractus + iOne;
      }
      result += "." + String(fractus).padStart(numDigitsAfterDecimal, "0");
    }
    return result
  }
};

// eslint-disable-next-line max-len
const preComputedFactorials = ["1", "1", "2", "6", "24", "120", "720", "5040", "40320", "362880", "3628800", "39916800", "479001600", "6227020800", "87178291200", "1307674368000", "20922789888000", "355687428096000", "6402373705728000", "121645100408832000", "2432902008176640000", "51090942171709440000", "1124000727777607680000", "25852016738884976640000", "620448401733239439360000", "15511210043330985984000000", "403291461126605635584000000", "10888869450418352160768000000", "304888344611713860501504000000", "8841761993739701954543616000000", "265252859812191058636308480000000", "8222838654177922817725562880000000", "263130836933693530167218012160000000", "8683317618811886495518194401280000000", "295232799039604140847618609643520000000", "10333147966386144929666651337523200000000", "371993326789901217467999448150835200000000", "13763753091226345046315979581580902400000000", "523022617466601111760007224100074291200000000", "20397882081197443358640281739902897356800000000", "815915283247897734345611269596115894272000000000", "33452526613163807108170062053440751665152000000000", "1405006117752879898543142606244511569936384000000000", "60415263063373835637355132068513997507264512000000000", "2658271574788448768043625811014615890319638528000000000", "119622220865480194561963161495657715064383733760000000000", "5502622159812088949850305428800254892961651752960000000000", "258623241511168180642964355153611979969197632389120000000000", "12413915592536072670862289047373375038521486354677760000000000", "608281864034267560872252163321295376887552831379210240000000000", "30414093201713378043612608166064768844377641568960512000000000000", "1551118753287382280224243016469303211063259720016986112000000000000", "80658175170943878571660636856403766975289505440883277824000000000000", "4274883284060025564298013753389399649690343788366813724672000000000000", "230843697339241380472092742683027581083278564571807941132288000000000000", "12696403353658275925965100847566516959580321051449436762275840000000000000", "710998587804863451854045647463724949736497978881168458687447040000000000000", "40526919504877216755680601905432322134980384796226602145184481280000000000000", "2350561331282878571829474910515074683828862318181142924420699914240000000000000", "138683118545689835737939019720389406345902876772687432540821294940160000000000000", "8320987112741390144276341183223364380754172606361245952449277696409600000000000000", "507580213877224798800856812176625227226004528988036003099405939480985600000000000000", "31469973260387937525653122354950764088012280797258232192163168247821107200000000000000", "1982608315404440064116146708361898137544773690227268628106279599612729753600000000000000", "126886932185884164103433389335161480802865516174545192198801894375214704230400000000000000", "8247650592082470666723170306785496252186258551345437492922123134388955774976000000000000000", "544344939077443064003729240247842752644293064388798874532860126869671081148416000000000000000", "36471110918188685288249859096605464427167635314049524593701628500267962436943872000000000000000", "2480035542436830599600990418569171581047399201355367672371710738018221445712183296000000000000000", "171122452428141311372468338881272839092270544893520369393648040923257279754140647424000000000000000", "11978571669969891796072783721689098736458938142546425857555362864628009582789845319680000000000000000", "850478588567862317521167644239926010288584608120796235886430763388588680378079017697280000000000000000", "61234458376886086861524070385274672740778091784697328983823014963978384987221689274204160000000000000000", "4470115461512684340891257138125051110076800700282905015819080092370422104067183317016903680000000000000000", "330788544151938641225953028221253782145683251820934971170611926835411235700971565459250872320000000000000000", "24809140811395398091946477116594033660926243886570122837795894512655842677572867409443815424000000000000000000", "1885494701666050254987932260861146558230394535379329335672487982961844043495537923117729972224000000000000000000", "145183092028285869634070784086308284983740379224208358846781574688061991349156420080065207861248000000000000000000", "11324281178206297831457521158732046228731749579488251990048962825668835325234200766245086213177344000000000000000000", "894618213078297528685144171539831652069808216779571907213868063227837990693501860533361810841010176000000000000000000", "71569457046263802294811533723186532165584657342365752577109445058227039255480148842668944867280814080000000000000000000", "5797126020747367985879734231578109105412357244731625958745865049716390179693892056256184534249745940480000000000000000000", "475364333701284174842138206989404946643813294067993328617160934076743994734899148613007131808479167119360000000000000000000", "39455239697206586511897471180120610571436503407643446275224357528369751562996629334879591940103770870906880000000000000000000", "3314240134565353266999387579130131288000666286242049487118846032383059131291716864129885722968716753156177920000000000000000000", "281710411438055027694947944226061159480056634330574206405101912752560026159795933451040286452340924018275123200000000000000000000", "24227095383672732381765523203441259715284870552429381750838764496720162249742450276789464634901319465571660595200000000000000000000", "2107757298379527717213600518699389595229783738061356212322972511214654115727593174080683423236414793504734471782400000000000000000000", "185482642257398439114796845645546284380220968949399346684421580986889562184028199319100141244804501828416633516851200000000000000000000", "16507955160908461081216919262453619309839666236496541854913520707833171034378509739399912570787600662729080382999756800000000000000000000", "1485715964481761497309522733620825737885569961284688766942216863704985393094065876545992131370884059645617234469978112000000000000000000000", "135200152767840296255166568759495142147586866476906677791741734597153670771559994765685283954750449427751168336768008192000000000000000000000", "12438414054641307255475324325873553077577991715875414356840239582938137710983519518443046123837041347353107486982656753664000000000000000000000", "1156772507081641574759205162306240436214753229576413535186142281213246807121467315215203289516844845303838996289387078090752000000000000000000000", "108736615665674308027365285256786601004186803580182872307497374434045199869417927630229109214583415458560865651202385340530688000000000000000000000", "10329978488239059262599702099394727095397746340117372869212250571234293987594703124871765375385424468563282236864226607350415360000000000000000000000", "991677934870949689209571401541893801158183648651267795444376054838492222809091499987689476037000748982075094738965754305639874560000000000000000000000", "96192759682482119853328425949563698712343813919172976158104477319333745612481875498805879175589072651261284189679678167647067832320000000000000000000000", "9426890448883247745626185743057242473809693764078951663494238777294707070023223798882976159207729119823605850588608460429412647567360000000000000000000000", "933262154439441526816992388562667004907159682643816214685929638952175999932299156089414639761565182862536979208272237582511852109168640000000000000000000000", "93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000"];

const factorial = (n) => {
  if (lessThan(n, [BigInt(101), iOne])) {
    return fromString(preComputedFactorials[toNumber(n)])
  } else {
    return lanczos(increment(n))
  }
};

const lanczos = xPlusOne => {
  // Lanczos approximation of Gamma function.
  // Coefficients are from 2004 PhD thesis by Glendon Pugh.
  // *An Analysis of the Lanczos Gamma Approximation*
  // The following equation is from p. 116 of the Pugh thesis:
  // Γ(x+1) ≈ 2 * √(e / π) * ((x + 10.900511 + 0.5) / e) ^ (x + 0.5) * sum
  const x = subtract(xPlusOne, one);
  const term1 = multiply(two, sqrt(divide(e$1, pi$1)));
  const term2 = power(divide(add(x, fromNumber(11.400511)), e$1), add(x, [iOne, iTwo]));

  // Coefficients from Pugh, Table 8.5
  const d = ["2.48574089138753565546e-5", "1.05142378581721974210",
    "-3.45687097222016235469", "4.51227709466894823700", "-2.98285225323576655721",
    "1.05639711577126713077", "-0.195428773191645869583", "0.0170970543404441224307",
    "-0.000571926117404305781283", "0.00000463399473359905636708",
    "-0.00000000271994908488607703910"];

  // sum = d_0 + ∑_(k=1)^10 d_k/(x+k)
  let sum = fromString(d[0]);
  for (let k = 1; k <= 10; k++) {
    sum = add(sum, divide(fromString(d[k]), add(x, fromNumber(k))));
  }

  return multiply(multiply(term1, term2), sum)
};

const Rnl = Object.freeze({
  fromNumber,
  fromString,
  normalize,
  isRational,
  isInteger,
  isZero,
  isNegative,
  isPositive,
  negate,
  abs,
  increment,
  decrement,
  exp,
  floor,
  ceil,
  add,
  subtract,
  multiply,
  divide,
  reciprocal,
  gcd,
  hbar,
  modulo,
  hypot,
  one,
  pi: pi$1,
  power,
  sqrt,
  two,
  cos,
  sin,
  tan,
  cosh,
  sinh,
  tanh,
  areEqual,
  lessThan,
  greaterThan,
  lessThanOrEqualTo,
  greaterThanOrEqualTo,
  factorial,
  lanczos,
  max,
  min,
  numberPattern,
  toNumber,
  toString,
  toStringSignificant,
  zero
});

const siPrefixes = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k",
  "M", "G", "T", "P", "E", "Z", "Y"];

const groupByThreeRegEx = /\B(?=(\d{3})+$)/g;
const groupByFourRegEx = /\B(?=(\d{4})+$)/g;  // use sometimes in China
// Grouping as common in south Asia: 10,10,000
const groupByLakhCroreRegEx = /(\d)(?=(\d\d)+\d$)/g;

const formatRegEx = /^([beEfhkmprsStx%])?(-?[\d]+)?([j∠°])?$/;

const superscript$1 = str => {
  // Convert a numeral string to Unicode superscript characters.
  // Used for denominator in mixed fractions/
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    result += (charCode === 0x31)
      ? "¹"
      : charCode === 0x32
      ? "²"
      : charCode === 0x33
      ? "³"
      : String.fromCharCode(charCode + 0x2040);
  }
  return result
};

const subscript = str => {
  // Convert a numeral string to Unicode subscript characters.
  // Used for mixed fraction denominators.
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) + 0x2050);
  }
  return result
};

const texFromMixedFraction = (numParts) => {
  return (numParts[1] ? "-" : "") +
    numParts[3] + "\\,\\class{special-fraction}{\\text{" +
    superscript$1(numParts[4]) + "\u2044" + subscript(numParts[5]) + "}}"
};

const intAbs$1 = i => i >= BigInt(0) ? i : BigInt(-1) * i;  // absolute value of a BigInt

const roundedString = (r, spec) => {
  // Return a string rounded to the correct number of digits
  const N = spec.numDigits;

  switch (spec.ftype) {
    case "h": {
      // Round a fraction, but not an integer, to N significant digits.
      const integerStr = String(Rnl.toString(r, 0));
      if (integerStr.replace("-", "").length >= N) { return integerStr }
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      return Rnl.toNumber(r).toPrecision(N)
    }

    case "f":
    case "%":
      // Exactly N digits after the decimal.
      return Rnl.toString(r, N)

    case "r":
    case "p": {
      // Round to N significant digits
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      const numStr = Rnl.toNumber(r).toPrecision(N);
      return numStr.indexOf("e") > -1 ? Number(numStr).toPrecision() : numStr
    }

    case "s":
    case "S":
    case "e":
    case "E":
    case "n":
    case "N":
    case "k":
      // Some variety of scientific notation.
      if (N < 1 || N > 15) { return errorOprnd("BAD_PREC") }
      return Rnl.toNumber(r).toExponential(N - 1).replace("+", "")

    default: {
      r = Rnl.normalize(r);
      const sign =  Rnl.isNegative(r) ? "-" : "";
      const numerator = intAbs$1(r[0]);
      const denominator = r[1];

      switch (spec.ftype) {
        case "m": {
          // Mixed fraction
          const quotientStr = String(numerator / denominator);
          const remainder = numerator % denominator;
          return sign + quotientStr + "\u00a0" + superscript$1(remainder) +
            "⁄" + subscript(denominator)
        }

        case "t":
          // Truncate to integer
          return sign + String(numerator / denominator)

        case "b":
        case "x":
        case "X":
          // binary or hexadecimal integer
          if (denominator !== BigInt(1)) { return errorOprnd("INT_NUM", spec.ftype) }
          if (numerator <= Number.MAX_SAFE_INTEGER) {
            return (spec.ftype === "b")
              ? sign + "0b" + Number(numerator).toString(2)
              : spec.ftype === "x"
              ? sign + "0x" + Number(numerator).toString(16)
              : sign + "0x" + Number(numerator).toString(16).toUpperCase()
          } else {
            // TODO: display large hex or binary.
            return ""
          }
      }
    }
  }
};

const formattedInteger = (intStr, decimalFormat) => {
  const thousandsSeparator = decimalFormat.charAt(1);
  if (thousandsSeparator === "0") {
    return intStr
  } else if (decimalFormat === "1,00,000.") {
    return intStr.replace(groupByLakhCroreRegEx, "$1{,}")
  } else if (decimalFormat === "1,0000,0000.") {
    return intStr.replace(groupByFourRegEx, "$1{,}")
  } else {
    return intStr.replace(groupByThreeRegEx,
      (thousandsSeparator === ",")
      ? "{,}"
      : (thousandsSeparator === " ")
      ? "\\:"
      : (thousandsSeparator === "’")
      ? "’"
      : "."
    )
  }
};

const formattedDecimal = (numStr, decimalFormat, truncateTrailingZeros) => {
  const pos = numStr.indexOf(".");
  if (pos === -1) {
    return formattedInteger(numStr, decimalFormat)
  } else {
    const intStr = numStr.slice(0, pos);
    const decimalSeparator = decimalFormat.slice(-1);
    let frac = (decimalSeparator === "." ? "." : "{,}") + numStr.slice(pos + 1);
    if (truncateTrailingZeros) { frac = frac.replace(/(\.|{,})?0+$/, ""); }
    return formattedInteger(intStr, decimalFormat) + frac
  }
};

const parseFormatSpec = str => {
  // Do the RegEx once, at compile time, not every time a number is formatted.
  //
  // str ≔ "Tn", where:
  //    T = type, [bEefhkmNnprSstx%], default: "h"
  //    n = number of digits, [0-9]+, default: 15
  //
  //    Possible future additions: complex number format [√∠°]

  const match = formatRegEx.exec(str);
  if (!match) {
    const message = errorOprnd("BAD_FORMAT", str).value;
    return [str, undefined, dt.ERROR, "\\text{" + message + "}"]
  }

  let ftype = match[1] || "h";
  let N = Number(match[2] || "15");
  const ctype = match[3]  || "";

  // Check the specified number of digits
  switch (ftype) {
    case "b":
    case "x":
    case "X":
      return [str, undefined, dt.STRING, "\\text{" + ftype + ctype + "}" ]
    case "t":
      N = 0;
      break
    case "f":
    case "%":
      break
    default:
      if (N < 1 || N > 15) {
        const message = "\\text{" + errorOprnd("BAD_PREC").value + "}";
        return [str, undefined, dt.ERROR, message]
      }
  }

  if (ftype === "%") { ftype = "\\%"; }
  return [str, undefined, dt.STRING, "\\text{" + ftype + String(N) + ctype + "}" ]
};

const format = (num, specStr = "h3", decimalFormat = "1,000,000.") => {
  if (Rnl.isZero(num)) { return "0" }

  const spec = { ftype: specStr.charAt(0) };
  if (/[j∠°]$/.test(specStr)) { specStr = specStr.slice(0, -1); }
  if (specStr.length > 1) { spec.numDigits = Number(specStr.slice(1)); }

  if (spec.ftype === "%" || spec.ftype === "p") { num[0] = num[0] * BigInt(100); }

  if ((spec .ftype === "b" || spec.ftype === "x") && !Rnl.isInteger(num)) {
    return errorOprnd("FORM_FRAC")
  }

  // Round the number
  const numStr = roundedString(num, spec);

  // Add separators
  switch (spec.ftype) {
    case "f":
    case "r":
    case "h":
      return formattedDecimal(numStr, decimalFormat, spec.ftype === "h")
    case "t":
      return formattedInteger(numStr, decimalFormat)
    case "%":
    case "p":
      return formattedDecimal(numStr, decimalFormat) + "\\%"
    case "m":
    case "b":
    case "x":
    case "X":
      return numStr
    default: {
      // Some sort of scientific notation.
      const pos = numStr.indexOf("e");
      let significand = numStr.slice(0, pos);
      if (decimalFormat.slice(-1) === ",") { significand = significand.replace(".", "{,}"); }

      switch (spec.ftype) {
        case "e":
        case "E": {
          const result = significand + "\\text{" + spec.ftype;
          if (numStr.charAt(pos + 1) === "-") {
            return result + "-}" + numStr.slice(pos + 2)
          } else {
            return result + "}" + numStr.slice(pos + 1)
          }
        }

        case "s":
        case "S":
        case "n":
        case "N": {
          const op = spec.ftype === "S" ? "×" : "\\mkern2mu{\\cdot}\\mkern1mu";
          return significand + op + "10^{" + numStr.slice(pos + 1) + "}"
        }

        case "k": {
          const exponent = Number(numStr.slice(pos + 1));
          const quotient = exponent  / 3;
          const q = quotient >= 0 ? Math.floor(quotient) : Math.ceil(quotient);
          const modulo = exponent  % 3;
          if (modulo !== 0) {
            significand = String(Number(significand) * Math.pow(10, modulo));
          }
          return significand + siPrefixes[8 + q]
        }
      }
    }
  }
};

// units.js

/*
 *  Unit-aware calculation is a core feature of Hurmet.
 *  Dimensional analysis is used to verify that a calculation contains compatible units.
 *  Example: Check unit compatibility for:  L = '145 N·m'/'15.2 lbf' = ?? feet
 *  Analysis step 1: first operand:  N·m →  mass¹·length²·time⁻²
 *                   2nd  operand:  lbf →  mass¹·length¹·time⁻²
 *  Note the exponents of those two operands. When terms multiply, we add exponents.
 *  When terms divide, we subtract exponents. As in step 2, next line:
 *                   mass^(1-1)∙length^(2-1)∙time^(-2-(-2)) = mass⁰·length¹·time⁰ = length¹
 *  In the example, the exponents for mass and time both zero'd out.
 *  Only length has a non-zero exponent. In fact, the result dimension = length¹.
 *  This matches the desired result dimension (feet is a length), so this example checks out.
 *
 *  Hurmet automates this process of checking unit compatibility.
 *  Each instance of a Hurmet quantity operand contains an array of unit-checking exponents.
 *  Each element of that array contains an exponent of one of the Hurmet base dimensions.
 *  Those exponent values come from the unitTable, below.
 *
 *  The Hurmet base dimensions and standard units are, in order of array values:
 *      length (meter)
 *      mass (kg)
 *      time (second)
 *      electrical current (ampere)
 *      temperature (Kelvin)
 *      finite amount (1 unit)   (Yes, I know that SI uses a mole. That's just silly.)
 *      luminous intensity (cd)
 *      money (Euro)   (A user can redefine the default to some other currency)
 */

const unitsAreCompatible = (a, b) => {
  // Do a compatibility check on the unit-checking exponents  a and b.
  if (a == null && b == null) { return true }
  if (a == null || b == null) { return false }
  if (!Array.isArray(a) || !Array.isArray(b)) { return false }
  // Compare the exponents in the arrays.
  if (a.length !== b.length) { return false }
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) { return false }
  }
  return true
};

// JSON.parse() is faster than a big object literal
// eslint-disable-next-line max-len
const prefixFactor = JSON.parse('{"Y":1e24,"yotta":1e24,"Z":1e21,"zetta":1e21,"E":1e18,"exa":1e18,"P":1e15,"peta":1e15,"T":1e12,"tera":1e12,"G":1e9,"giga":1e9,"M":1e6,"mega":1e6,"k":1000,"kilo":1000,"h":100,"hecto":100,"deka":10,"d":0.1,"deci":0.1,"c":0.01,"centi":0.01,"m":0.001,"milli":0.001,"µ":1e-6,"\u00B5":1e-6,"micro":1e-6,"n":1e-9,"nano":1e-9,"p":1e-12,"pico":1e-12,"f":1e-15,"femto":1e-15,"a":1e-18,"atto":1e-18,"z":1e-21,"zepto":1e-21,"y":1e-24,"yocto":1e-24,"Ki":1024,"kibi":1024,"Mi":1048576,"mebi":1048576,"Gi":1073741824,"gibi":1073741824,"Ti":1099511627776,"tebi":1099511627776}');

  //  factor, numerator, denominator,  gauge, prefix|logarithm|currency, exponents
  //  exponent break-down: length, mass, time, elect, temp, amount, lum inten, money
  //  Each money factor is a revised weekly with data from the European Central Bank.
const unitTable = Object.freeze(JSON.parse(`{
"#":["0.45359237", "1","0","0",[0,1,0,0,0,0,0,0]],
"$":["1","1","0","USD",[0,0,0,0,0,0,0,1]],
"£":["1","1","0","GBP",[0,0,0,0,0,0,0,1]],
"'":["0.3048","1","0","0",[1,0,0,0,0,0,0,0]],
"A":["1","1","0","siSymbol",[0,0,0,1,0,0,0,0]],
"AUD":["1.5560","1","0","AUD",[0,0,0,0,0,0,0,1]],
"Adobe point":["0.0254","72","0","0",[1,0,0,0,0,0,0,0]],
"At":["1","1","0","siSymbol",[0,0,0,0,1,0,1,0]],
"Australian dollar":["1","1","0","AUD",[0,0,0,0,0,0,0,1]],
"BRL":["5.5487","1","0","BRL",[0,0,0,0,0,0,0,1]],
"BTU":["1055.056","1","0","0",[2,1,-2,0,0,0,0,0]],
"BThU":["1055.056","1","0","0",[2,1,-2,0,0,0,0,0]],
"Bq":["1","1","0","siSymbol",[0,0,-1,0,0,0,0,0]],
"Brazilian Real":["1","1","0","BRL",[0,0,0,0,0,0,0,1]],
"British Pound":["1","1","0","GBP",[0,0,0,0,0,0,0,1]],
"Btu":["1055.056","1","0","0",[2,1,-2,0,0,0,0,0]],
"C":["1","1","0","siSymbol",[0,0,1,1,0,0,0,0]],
"C$":["1","1","0","CAD",[0,0,0,0,0,0,0,1]],
"CAD":["1.4366","1","0","CAD",[0,0,0,0,0,0,0,1]],
"CCF":["1","1","0","0",[3,0,0,0,0,0,0,0]],
"CHF":["0.9896","1","0","CHF",[0,0,0,0,0,0,0,1]],
"CNY":["7.3081","1","0","CNY",[0,0,0,0,0,0,0,1]],
"CY":["0.764554857984","1","0","0",[3,0,0,0,0,0,0,0]],
"Calorie":["4186.8","1","0","0",[2,1,-2,0,0,0,0,0]],
"Canadian dollar":["1","1","0","CAD",[0,0,0,0,0,0,0,1]],
"Celsius":["1","1","273.15","0",[0,0,0,0,1,0,0,0]],
"Chinese Yuan":["1","1","0","CNY",[0,0,0,0,0,0,0,1]],
"Ci":["37000000000","1","0","siSymbol",[0,0,-1,0,0,0,0,0]],
"Ckm":["100000","1","0","siSymbol",[1,0,0,0,0,0,0,0]],
"Da":["1.66053872e-24","1","0","siSymbol",[0,1,0,0,0,0,0,0]],
"Dalton":["1.66053872e-24","1","0","0",[0,1,0,0,0,0,0,0]],
"Didot point":["15.625","41559","0","0",[1,0,0,0,0,0,0,0]],
"EB":["9223372036854770000","1","0","0",[0,0,0,0,0,1,0,0]],
"EMU":["0.01","360000","0","0",[1,0,0,0,0,0,0,0]],
"EUR":["1","1","0","EUR",[0,0,0,0,0,0,0,1]],
"EiB":["9223372036854770000","1","0","0",[0,0,0,0,0,1,0,0]],
"Euro":["1","1","0","EUR",[0,0,0,0,0,0,0,1]],
"F":["1","1","0","siSymbol",[-2,-1,4,2,0,0,0,0]],
"Fahrenheit":["5","9","459","0",[0,0,0,0,1,0,0,0]],
"G":["0.0001","1","0","siSymbol",[-2,-2,-2,-1,0,0,0,0]],
"GB":["8589934592","1","0","0",[0,0,0,0,0,1,0,0]],
"GBP":["0.88888","1","0","GBP",[0,0,0,0,0,0,0,1]],
"Gal":["0.01","1","0","siSymbol",[1,0,-2,0,0,0,0,0]],
"Gi":["10","12.5663706143592","0","siWord",[0,0,0,0,1,0,1,0]],
"GiB":["8589934592","1","0","0",[0,0,0,0,0,1,0,0]],
"Gregorian year":["31556952","1","0","0",[0,0,1,0,0,0,0,0]],
"Gy":["1","1","0","siSymbol",[2,0,-2,0,0,0,0,0]],
"H":["1","1","0","siSymbol",[2,1,-2,-2,0,0,0,0]],
"HK$":["1","1","0","HKD",[0,0,0,0,0,0,0,1]],
"HKD":["8.3349","1","0","HKD",[0,0,0,0,0,0,0,1]],
"HP":["745.69987158227","1","0","0",[2,1,-3,0,0,0,0,0]],
"Hong Kong dollar":["1","1","0","HKD",[0,0,0,0,0,0,0,1]],
"Hz":["1","1","0","siSymbol",[0,0,-1,0,0,0,0,0]],
"ILS":["3.7850","1","0","ILS",[0,0,0,0,0,0,0,1]],
"INR":["88.0210","1","0","INR",[0,0,0,0,0,0,0,1]],
"Indian Rupee":["1","1","0","INR",[0,0,0,0,0,0,0,1]],
"Israeli New Shekel":["1","1","0","ILS",[0,0,0,0,0,0,0,1]],
"J":["1","1","0","siSymbol",[2,1,-2,0,0,0,0,0]],
"JPY":["143.18","1","0","JPY",[0,0,0,0,0,0,0,1]],
"Japanese Yen":["1","1","0","JPY",[0,0,0,0,0,0,0,1]],
"Joule":["1","1","0","0",[2,1,-2,0,0,0,0,0]],
"Julian year":["31557600","1","0","0",[0,0,1,0,0,0,0,0]],
"Jy":["1e-26","1","0","siSymbol",[0,1,-2,0,0,0,0,0]],
"K":["1","1","0","0",[0,0,0,0,1,0,0,0]],
"KiB":["8192","1","0","0",[0,0,0,0,0,1,0,0]],
"KRW":["1383.32","1","0","KRW",[0,0,0,0,0,0,0,1]],
"L":["0.001","1","0","siSymbol",[3,0,0,0,0,0,0,0]],
"Lego stud":["0.008","1","0","siSymbol",[1,0,0,0,0,0,0,0]],
"MB":["8388608","1","0","0",[0,0,0,0,0,1,0,0]],
"MCM":["5.06707479097497e-07","1","0","0",[2,0,0,0,0,0,0,0]],
"MMBtu":["1055056000","1","0","0",[2,1,-2,0,0,0,0,0]],
"MMbbl":["158987.294928","1","0","0",[3,0,0,0,0,0,0,0]],
"MMbblpd":["158987.294928","86400","0","0",[3,0,-1,0,0,0,0,0]],
"MMscf":["28316.846592","1","0","0",[3,0,0,0,0,0,0,0]],
"MMscfd":["0.32774128","1","0","0",[3,0,0,0,0,0,0,0]],
"MT":["1000","1","0","0",[0,1,0,0,0,0,0,0]],
"MXN":["19.7313","1","0","MXN",[0,0,0,0,0,0,0,1]],
"Mach":["331.6","1","0","0",[1,0,-1,0,0,0,0,0]],
"Mbbl":["158.987294928","1","0","0",[3,0,0,0,0,0,0,0]],
"Mexican Peso":["1","1","0","MXN",[0,0,0,0,0,0,0,1]],
"MiB":["8388608","1","0","0",[0,0,0,0,0,1,0,0]],
"Mscfd":["0.00032774128","1","0","0",[3,0,0,0,0,0,0,0]],
"Mscfh":["0.00786579072","1","0","0",[3,0,0,0,0,0,0,0]],
"N":["1","1","0","siSymbol",[1,1,-2,0,0,0,0,0]],
"NM":["1852","1","0","0",[1,0,0,0,0,0,0,0]],
"PB":["9007199254740990","1","0","0",[0,0,0,0,0,1,0,0]],
"PS":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"Pa":["1","1","0","siSymbol",[-1,1,-2,0,0,0,0,0]],
"Pascal":["1","1","0","siWord",[-1,1,-2,0,0,0,0,0]],
"Pferdestärke":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"PiB":["9007199254740990","1","0","0",[0,0,0,0,0,1,0,0]],
"R":["0.000258","1","0","siSymbol",[0,-1,1,1,0,0,0,0]],
"R$":["1","1","0","BRL",[0,0,0,0,0,0,0,1]],
"RT":["3516.8532","1","0","0",[2,1,-3,0,0,0,0,0]],
"RUB":["1","1","0","RUB",[0,0,0,0,0,0,0,1]],
"S":["1","1","0","siSymbol",[-2,-1,3,2,0,0,0,0]],
"SF":["0.09290304","1","0","0",[2,0,0,0,0,0,0,0]],
"SY":["0.83612736","1","0","0",[2,0,0,0,0,0,0,0]],
"Sv":["1","1","0","siSymbol",[2,0,-2,0,0,0,0,0]],
"Swiss Franc":["1","1","0","CHF",[0,0,0,0,0,0,0,1]],
"T":["1","1","0","siSymbol",[-2,-2,-2,-1,0,0,0,0]],
"TB":["8796093022208","1","0","0",[0,0,0,0,0,1,0,0]],
"TWD":["1","1","0","TWD",[0,0,0,0,0,0,0,1]],
"TeX point":["0.0003515","1","0","0",[1,0,0,0,0,0,0,0]],
"TiB":["8796093022208","1","0","0",[0,0,0,0,0,1,0,0]],
"US$":["1","1","0","USD",[0,0,0,0,0,0,0,1]],
"USD":["1.0625","1","0","USD",[0,0,0,0,0,0,0,1]],
"V":["1","1","0","siSymbol",[2,1,-3,-1,0,0,0,0]],
"VA":["1","1","0","siSymbol",[2,1,-3,0,0,0,0,0]],
"W":["1","1","0","siSymbol",[2,1,-3,0,0,0,0,0]],
"Wb":["1","1","0","siSymbol",[2,1,-2,-1,0,0,0,0]],
"Wh":["3600","1","0","siSymbol",[2,1,-2,0,0,0,0,0]],
"Won":["1","1","0","KRW",[0,0,0,0,0,0,0,1]],
"Yen":["1","1","0","JPY",[0,0,0,0,0,0,0,1]],
"a":["31556925.9747","1","0","siSymbol",[0,0,1,0,0,0,0,0]],
"ac":["4046.8564224","1","0","0",[2,0,0,0,0,0,0,0]],
"acre":["4046.8564224","1","0","0",[2,0,0,0,0,0,0,0]],
"admiralty mile":["1853.188","1","0","0",[1,0,0,0,0,0,0,0]],
"af":["1233.48183754752","1","0","0",[3,0,0,0,0,0,0,0]],
"amp":["1","1","0","0",[0,0,0,1,0,0,0,0]],
"ampere":["1","1","0","siWord",[0,0,0,1,0,0,0,0]],
"ampere turn":["1","1","0","siWord",[0,0,0,0,1,0,1,0]],
"amu":["1.66053872e-24","1","0","0",[0,1,0,0,0,0,0,0]],
"angstrom":["0.0000000001","1","0","0",[1,0,0,0,0,0,0,0]],
"angstrom star":["0.00000000010000015","1","0","0",[1,0,0,0,0,0,0,0]],
"apostilb":["1","3.14159265358979","0","0",[-2,0,0,0,0,0,1,0]],
"arcminute":["3.14159265358979","10800","0","0",[0,0,0,0,0,0,0,0]],
"arcsecond":["3.14159265358979","648000","0","0",[0,0,0,0,0,0,0,0]],
"are":["100","1","0","0",[2,0,0,0,0,0,0,0]],
"as":["4.3.14159265358979","648000","0","0",[0,0,0,0,0,0,0,0]],
"asb":["1","3.14159265358979","0","0",[-2,0,0,0,0,0,1,0]],
"assay ton":["0.0875","3","0","0",[0,1,0,0,0,0,0,0]],
"astronomical unit":["149597870691","1","0","0",[1,0,0,0,0,0,0,0]],
"atmosphere":["101325","1","0","siSymbol",[-1,1,-2,0,0,0,0,0]],
"au":["149597870691","1","0","0",[1,0,0,0,0,0,0,0]],
"bar":["100000","1","0","siWord",[-1,1,-2,0,0,0,0,0]],
"barg":["100000","1","0","0",[-1,1,-2,0,0,0,0,0]],
"barleycorn":["0.0254","3","0","0",[1,0,0,0,0,0,0,0]],
"barrel":["0.158987294928","1","0","0",[3,0,0,0,0,0,0,0]],
"barrel bulk":["0.14158423296","1","0","0",[3,0,0,0,0,0,0,0]],
"basis point":["0.0001","1","0","0",[0,0,0,0,0,0,0,0]],
"baud":["1","1","0","siSymbol",[0,0,-1,0,0,1,0,0]],
"bbl":["0.158987294928","1","0","0",[3,0,0,0,0,0,0,0]],
"becquerel":["1","1","0","siWord",[0,0,-1,0,0,0,0,0]],
"beer barrel":["0.119240471196","1","0","0",[3,0,0,0,0,0,0,0]],
"bit":["1","1","0","0",[0,0,0,0,0,1,0,0]],
"blink":["0.864","1","0","0",[0,0,1,0,0,0,0,0]],
"bo":["0.158987294928","1","0","0",[3,0,0,0,0,0,0,0]],
"boe":["6119000000","1","0","0",[2,1,-2,0,0,0,0,0]],
"boiler horsepower":["9812.5","1","0","0",[2,1,-3,0,0,0,0,0]],
"bpd":["0.158987294928","86400","0","0",[3,0,-1,0,0,0,0,0]],
"bph":["0.158987294928","3600","0","0",[3,0,-1,0,0,0,0,0]],
"breadth":["0.2286","1","0","0",[1,0,0,0,0,0,0,0]],
"bushel":["0.03523907016688","1","0","0",[3,0,0,0,0,0,0,0]],
"byte":["8","1","0","0",[0,0,0,0,0,1,0,0]],
"caballo de vapor":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"cal":["4.1868","1","0","0",[2,1,-2,0,0,0,0,0]],
"calorie":["4.1868","1","0","siWord",[2,1,-2,0,0,0,0,0]],
"candela":["1","1","0","siWord",[0,0,0,0,0,0,1,0]],
"candlepower":["1","1","0","siWord",[0,0,0,0,0,0,1,0]],
"carat":["0.00002","1","0","0",[0,1,0,0,0,0,0,0]],
"cc":["0.000001","1","0","0",[3,0,0,0,0,0,0,0]],
"cd":["1","1","0","siSymbol",[0,0,0,0,0,0,1,0]],
"centipoise":["0.001","1","0","0",[-1,1,-1,0,0,0,0,0]],
"centistoke":["0.000001","1","0","0",[2,0,-1,0,0,0,0,0]],
"cfm":["0.0004719474432","1","0","0",[3,0,-1,0,0,0,0,0]],
"cfs":["0.028316846592","1","0","0",[3,0,-1,0,0,0,0,0]],
"ch":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"chain":["20.116","1","0","0",[1,0,0,0,0,0,0,0]],
"cheval vapeur":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"cmil":["5.06707479097497e-10","1","0","0",[2,0,0,0,0,0,0,0]],
"cmm":["0.00001","1","0","0",[1,0,0,0,0,0,0,0]],
"constant":["1","1","0","0",[0,0,0,0,0,0,0,0]],
"coulomb":["1","1","0","siWord",[0,0,1,1,0,0,0,0]],
"cp":["1","1","0","siWord",[0,0,0,0,0,0,1,0]],
"cps":["1","1","0","0",[0,0,-1,0,0,0,0,0]],
"cu ft":["0.028316846592","1","0","0",[3,0,0,0,0,0,0,0]],
"cu in":["0.000016387064","1","0","0",[3,0,0,0,0,0,0,0]],
"cu yd":["0.764554857984","1","0","0",[3,0,0,0,0,0,0,0]],
"cubic meter":["1","1","0","0",[3,0,0,0,0,0,0,0]],
"cubic metre":["1","1","0","0",[3,0,0,0,0,0,0,0]],
"cup":["0.0002365882365","1","0","0",[3,0,0,0,0,0,0,0]],
"curie":["37000000000","1","0","siWord",[0,0,-1,0,0,0,0,0]],
"cv":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"cy":["0.764554857984","1","0","0",[3,0,0,0,0,0,0,0]],
"d":["86400","1","0","0",[0,0,1,0,0,0,0,0]],
"daN":["10","1","0","0",[1,1,-2,0,0,0,0,0]],
"darcy":["0.0000000000009869233","1","0","0",[2,0,0,0,0,0,0,0]],
"day":["86400","1","0","0",[0,0,1,0,0,0,0,0]],
"deg":["3.14159265358979","180","0","0",[0,0,0,0,0,0,0,0]],
"degree":["3.14159265358979","180","0","0",[0,0,0,0,0,0,0,0]],
"dekan":["31.4159265358979","180","0","0",[0,0,0,0,0,0,0,0]],
"diopter":["1","1","0","0",[-1,0,0,0,0,0,0,0]],
"dioptre":["1","1","0","0",[-1,0,0,0,0,0,0,0]],
"dollar":["1","1","0","USD",[0,0,0,0,0,0,0,1]],
"drum":["0.20819764812","1","0","0",[3,0,0,0,0,0,0,0]],
"dscf":["0.028316846592","1","0","0",[3,0,0,0,0,0,0,0]],
"dyn":["0.00001","1","0","0",[1,1,-2,0,0,0,0,0]],
"dyne":["0.00001","1","0","0",[1,1,-2,0,0,0,0,0]],
"eV":["1.602176462e-19","1","0","0",[2,1,-2,0,0,0,0,0]],
"electric horsepower":["746","1","0","0",[2,1,-3,0,0,0,0,0]],
"electrical horsepower":["746","1","0","0",[2,1,-3,0,0,0,0,0]],
"electron volt":["1.602176462e-19","1","0","0",[2,1,-2,0,0,0,0,0]],
"erg":["0.0000001","1","0","0",[2,1,-2,0,0,0,0,0]],
"euro":["1","1","0","EUR",[0,0,0,0,0,0,0,1]],
"exabyte":["9223372036854770000","1","0","0",[0,0,0,0,0,1,0,0]],
"exbibyte":["9223372036854770000","1","0","0",[0,0,0,0,0,1,0,0]],
"farad":["1","1","0","siWord",[-2,-1,4,2,0,0,0,0]],
"faraday":["96485.339924","1","0","0",[0,0,1,1,0,0,0,0]],
"fathom":["1.8288","1","0","0",[1,0,0,0,0,0,0,0]],
"fc":["10.7639104167097","1","0","0",[-2,0,0,0,0,0,1,0]],
"feet":["0.3048","1","0","0",[1,0,0,0,0,0,0,0]],
"fermi":["0.000000000000001","1","0","siWord",[1,0,0,0,0,0,0,0]],
"fl oz":["0.003785411784","128","0","0",[3,0,0,0,0,0,0,0]],
"flop":["1","1","0","0",[0,0,-1,0,0,0,0,0]],
"fluid ounce":["0.003785411784","128","0","0",[3,0,0,0,0,0,0,0]],
"food calorie":["4186.8","1","0","0",[2,1,-2,0,0,0,0,0]],
"foot":["0.3048","1","0","0",[1,0,0,0,0,0,0,0]],
"footcandle":["10.7639104167097","1","0","0",[-2,0,0,0,0,0,1,0]],
"footlambert":["1","3.14159265358979","0","0",[-2,0,0,0,0,0,1,0]],
"fortnight":["1209600","1","0","0",[0,0,1,0,0,0,0,0]],
"fps":["0.3048","1","0","0",[1,0,-1,0,0,0,0,0]],
"franklin":["0.00000000033356","1","0","siWord",[0,0,1,1,0,0,0,0]],
"ft":["0.3048","1","0","0",[1,0,0,0,0,0,0,0]],
"ft water":["2988.874","1","0","0",[-1,1,-2,0,0,0,0,0]],
"ftc":["10.7639104167097","1","0","0",[-2,0,0,0,0,0,1,0]],
"ftl":["3.426259","1","0","0",[-2,0,0,0,0,0,1,0]],
"furlong":["201.168","1","0","0",[1,0,0,0,0,0,0,0]],
"g":["0.001","1","0","siSymbol",[0,1,0,0,0,0,0,0]],
"gal":["0.003785411784","1","0","0",[3,0,0,0,0,0,0,0]],
"galileo":["0.01","1","0","siWord",[1,0,-2,0,0,0,0,0]],
"gallon":["0.003785411784","1","0","0",[3,0,0,0,0,0,0,0]],
"gauss":["0.0001","1","0","siSymbol",[-2,-2,-2,-1,0,0,0,0]],
"gigabyte":["8589934592","1","0","0",[0,0,0,0,0,1,0,0]],
"gilbert":["10","12.5663706143592","0","siWord",[0,0,0,0,1,0,1,0]],
"gill":["0.003785411784","32","0","0",[3,0,0,0,0,0,0,0]],
"gon":["3.14159265358979","200","0","0",[0,0,0,0,0,0,0,0]],
"gongjin":["1","1","0","siSymbol",[0,1,0,0,0,0,0,0]],
"gongli":["1000","1","0","siSymbol",[1,0,0,0,0,0,0,0]],
"gpd":["0.003785411784","86400","0","0",[3,0,-1,0,0,0,0,0]],
"gph":["0.003785411784","3600","0","0",[3,0,-1,0,0,0,0,0]],
"gpm":["0.003785411784","60","0","0",[3,0,-1,0,0,0,0,0]],
"gps":["0.003785411784","1","0","0",[3,0,-1,0,0,0,0,0]],
"gr":["0.00006479891","1","0","0",[0,1,0,0,0,0,0,0]],
"grad":["3.14159265358979","200","0","0",[0,0,0,0,0,0,0,0]],
"grain":["0.00006479891","1","0","0",[0,1,0,0,0,0,0,0]],
"gram":["0.001","1","0","0",[0,1,0,0,0,0,0,0]],
"gramme":["0.001","1","0","0",[0,1,0,0,0,0,0,0]],
"gray":["1","1","0","0",[2,0,-2,0,0,0,0,0]],
"great year":["814000000000","1","0","0",[0,0,1,0,0,0,0,0]],
"gsm":["0.001","1","0","0",[-2,1,0,0,0,0,0,0]],
"gutenberg":["0.0254","7200","0","0",[1,0,0,0,0,0,0,0]],
"gōngjin":["1","1","0","siSymbol",[0,1,0,0,0,0,0,0]],
"gōngli":["1000","1","0","siSymbol",[1,0,0,0,0,0,0,0]],
"h":["3600","1","0","0",[0,0,1,0,0,0,0,0]],
"ha":["10000","1","0","siSymbol",[2,0,0,0,0,0,0,0]],
"hand":["0.1016","1","0","0",[1,0,0,0,0,0,0,0]],
"hectare":["10000","1","0","siWord",[2,0,0,0,0,0,0,0]],
"helek":["10","3","0","0",[0,0,1,0,0,0,0,0]],
"hemisphere":["6.28318530717959","1","0","0",[0,0,0,0,0,0,0,0]],
"henrie":["1","1","0","siWord",[2,1,-2,-2,0,0,0,0]],
"henry":["1","1","0","siWord",[2,1,-2,-2,0,0,0,0]],
"hertz":["1","1","0","siWord",[0,0,-1,0,0,0,0,0]],
"hk":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"horsepower":["745.69987158227","1","0","0",[2,1,-3,0,0,0,0,0]],
"hour":["3600","1","0","0",[0,0,1,0,0,0,0,0]],
"hp":["745.69987158227","1","0","0",[2,1,-3,0,0,0,0,0]],
"hpE":["746","1","0","0",[2,1,-3,0,0,0,0,0]],
"hpI":["745.69987158227","1","0","0",[2,1,-3,0,0,0,0,0]],
"hpM":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"hpS":["9812.5","1","0","0",[2,1,-3,0,0,0,0,0]],
"hr":["3600","1","0","0",[0,0,1,0,0,0,0,0]],
"in":["0.0254","1","0","0",[1,0,0,0,0,0,0,0]],
"in Hg":["3863.8","1","0","0",[-1,1,-2,0,0,0,0,0]],
"inch":["0.0254","1","0","0",[1,0,0,0,0,0,0,0]],
"inche":["0.0254","1","0","0",[1,0,0,0,0,0,0,0]],
"jansky":["1e-26","1","0","0",[0,1,-2,0,0,0,0,0]],
"jar":["1","900000000","0","0",[-2,-1,4,2,0,0,0,0]],
"joule":["1","1","0","0",[2,1,-2,0,0,0,0,0]],
"k":["4448.2216152605","1","0","0",[1,1,-2,0,0,0,0,0]],
"kB":["8192","1","0","0",[0,0,0,0,0,1,0,0]],
"kB":["8192","1","0","0",[0,0,0,0,0,1,0,0]],
"kairi":["1852","1","0","0",[1,0,0,0,0,0,0,0]],
"kanal":["505.8570528","1","0","0",[2,0,0,0,0,0,0,0]],
"katal":["6.02214179e+23","1","0","siWord",[0,0,-1,0,0,1,0,0]],
"kcal":["4186.8","1","0","0",[2,1,-2,0,0,0,0,0]],
"kcmil":["5.06707479097497e-07","1","0","0",[2,0,0,0,0,0,0,0]],
"keg":["0.058673882652","1","0","0",[3,0,0,0,0,0,0,0]],
"kelvin":["1","1","0","0",[0,0,0,0,1,0,0,0]],
"kgf":["9.80665","1","0","0",[1,1,-2,0,0,0,0,0]],
"kilo":["1","1","0","0",[0,1,0,0,0,0,0,0]],
"kilobyte":["8192","1","0","0",[0,0,0,0,0,1,0,0]],
"kilogram":["1","1","0","0",[0,1,0,0,0,0,0,0]],
"kilogramme":["1","1","0","0",[0,1,0,0,0,0,0,0]],
"kilopond":["9.80665","1","0","0",[1,1,-2,0,0,0,0,0]],
"kip":["4448.2216152605","1","0","0",[1,1,-2,0,0,0,0,0]],
"klf":["4448.2216152605","0.3048","0","0",[0,1,-2,0,0,0,0,0]],
"kn":["1852","3600","0","0",[1,0,-1,0,0,0,0,0]],
"knot":["1852","3600","0","0",[1,0,-1,0,0,0,0,0]],
"kp":["9.80665","1","0","0",[1,1,-2,0,0,0,0,0]],
"kpf":["4448.2216152605","0.3048","0","0",[0,1,-2,0,0,0,0,0]],
"kph":["1000/3600","1","0","0",[1,0,-1,0,0,0,0,0]],
"kpph":["1000/3600","1","0","0",[-1,1,-3,0,0,0,0,0]],
"ks":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"ksf":["47880.2589803358","1","0","0",[-1,1,-2,0,0,0,0,0]],
"ksi":["6894757.29316836","1","0","0",[-1,1,-2,0,0,0,0,0]],
"kwh":["3600000","1","0","0",[2,1,-2,0,0,0,0,0]],
"l":["0.001","1","0","siSymbol",[3,0,0,0,0,0,0,0]],
"lambert":["10000","3.14159265358979","0","0",[-2,0,0,0,0,0,1,0]],
"lb":["0.45359237","1","0","0",[0,1,0,0,0,0,0,0]],
"lbf":["4.4482216152605","1","0","0",[1,1,-2,0,0,0,0,0]],
"lbm":["0.45359237","1","0","0",[0,1,0,0,0,0,0,0]],
"league":["5556","1","0","0",[1,0,0,0,0,0,0,0]],
"lf":["0.3048","1","0","0",[1,0,0,0,0,0,0,0]],
"li":["500","1","0","0",[1,0,0,0,0,0,0,0]],
"light year":["9460730472580800","1","0","0",[1,0,0,0,0,0,0,0]],
"link":["0.201168","1","0","0",[1,0,0,0,0,0,0,0]],
"liter":["0.001","1","0","siWord",[3,0,0,0,0,0,0,0]],
"litre":["0.001","1","0","siWord",[3,0,0,0,0,0,0,0]],
"lm":["1","1","0","siSymbol",[0,0,0,0,0,0,1,0]],
"long ton":["1016.0469088","1","0","0",[0,1,0,0,0,0,0,0]],
"lt":["1016.0469088","1","0","0",[0,1,0,0,0,0,0,0]],
"ltpd":["0.0117598021851852","1","0","0",[0,1,-1,0,0,0,0,0]],
"lumen":["1","1","0","siWord",[0,0,0,0,0,0,1,0]],
"lunar day":["89416.32","1","0","0",[0,0,1,0,0,0,0,0]],
"lunar month":["2551442.976","1","0","0",[0,0,1,0,0,0,0,0]],
"lux":["1","1","0","siWord",[-2,0,0,0,0,0,1,0]],
"lx":["1","1","0","siSymbol",[-2,0,0,0,0,0,1,0]],
"m":["1","1","0","siSymbol",[1,0,0,0,0,0,0,0]],
"mD":["9.869233e-16","1","0","0",[2,0,0,0,0,0,0,0]],
"marathon":["42195","1","0","0",[1,0,0,0,0,0,0,0]],
"marla":["25.29285264","1","0","0",[2,0,0,0,0,0,0,0]],
"mas":["3.14159265358979","648000000","0","0",[0,0,0,0,0,0,0,0]],
"maxwell":["0.00000001","1","0","siSymbol",[2,1,-2,-1,0,0,0,0]],
"mb":["100","1","0","0",[-1,1,-2,0,0,0,0,0]],
"megabyte":["8388608","1","0","0",[0,0,0,0,0,1,0,0]],
"megaton TNT":["4184000000000000","1","0","0",[2,1,-2,0,0,0,0,0]],
"megatons TNT":["4184000000000000","1","0","0",[2,1,-2,0,0,0,0,0]],
"megohm":["1000000","1","0","0",[2,1,-3,-2,0,0,0,0]],
"meter":["1","1","0","siWord",[1,0,0,0,0,0,0,0]],
"metre":["1","1","0","siWord",[1,0,0,0,0,0,0,0]],
"metric horsepower":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"metric ton":["1000","1","0","0",[0,1,0,0,0,0,0,0]],
"mgd":["3785.411784","86400","0","0",[3,0,-1,0,0,0,0,0]],
"mho":["1","1","0","0",[-2,-1,3,2,0,0,0,0]],
"mi":["1609.344","1","0","0",[1,0,0,0,0,0,0,0]],
"mil":["0.0000254","1","0","0",[1,0,0,0,0,0,0,0]],
"mile":["1609.344","1","0","0",[1,0,0,0,0,0,0,0]],
"min":["60","1","0","0",[0,0,1,0,0,0,0,0]],
"minute":["60","1","0","0",[0,0,1,0,0,0,0,0]],
"moa":["3.14159265358979","10800","0","0",[0,0,0,0,0,0,0,0]],
"mol":["6.02214179e+23","1","0","0",[0,0,0,0,0,1,0,0]],
"mole":["6.02214179e+23","1","0","0",[0,0,0,0,0,1,0,0]],
"mpg":["1609.344","0.003785411784","0","0",[-2,0,0,0,0,0,0,0]],
"mph":["0.44704","1","0","0",[1,0,-1,0,0,0,0,0]],
"mt":["1000","1","0","0",[0,1,0,0,0,0,0,0]],
"nautical mile":["1852","1","0","0",[1,0,0,0,0,0,0,0]],
"newton":["1","1","0","0",[1,1,-2,0,0,0,0,0]],
"nit":["1","1","0","0",[-2,0,0,0,0,0,1,0]],
"ohm":["1","1","0","siWord",[2,1,-3,-2,0,0,0,0]],
"ounce":["0.45359237","16","0","0",[0,1,0,0,0,0,0,0]],
"oz":["0.45359237","16","0","0",[0,1,0,0,0,0,0,0]],
"oz t":["0.0311034768","1","0","0",[0,1,0,0,0,0,0,0]],
"parsec":["30856780000000000","1","0","0",[1,0,0,0,0,0,0,0]],
"pc":["0.0254","6","0","0",[1,0,0,0,0,0,0,0]],
"pcf":["4.4482216152605","0.028316846592","0","0",[-2,1,-2,0,0,0,0,0]],
"pci":["4.4482216152605","0.000016387064","0","0",[-2,1,-2,0,0,0,0,0]],
"pebibyte":["9007199254740990","1","0","0",[0,0,0,0,0,1,0,0]],
"peck":["0.00880976754172","1","0","0",[3,0,0,0,0,0,0,0]],
"perfect ream":["516","1","0","0",[0,0,0,0,0,1,0,0]],
"person":["1","1","0","0",[0,0,0,0,0,1,0,0]],
"petabyte":["9007199254740990","1","0","0",[0,0,0,0,0,1,0,0]],
"pfd":["0.5","1","0","0",[0,1,0,0,0,0,0,0]],
"pferdestärke":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"pfund":["0.5","1","0","0",[0,1,0,0,0,0,0,0]],
"phot":["10000","1","0","0",[-2,0,0,0,0,0,1,0]],
"pica":["0.0254","6","0","0",[1,0,0,0,0,0,0,0]],
"pied du roi":["9000","27706","0","0",[1,0,0,0,0,0,0,0]],
"pieze":["1000","1","0","0",[-1,1,-2,0,0,0,0,0]],
"pint":["0.000473176473","1","0","0",[3,0,0,0,0,0,0,0]],
"pk":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"platonic year":["814000000000","1","0","0",[0,0,1,0,0,0,0,0]],
"plf":["4.4482216152605","0.3048","0","0",[0,1,-2,0,0,0,0,0]],
"point":["0.0254","72","0","0",[1,0,0,0,0,0,0,0]],
"poise":["0.1","1","0","siWord",[-1,1,-1,0,0,0,0,0]],
"pound":["0.45359237","1","0","0",[0,1,0,0,0,0,0,0]],
"poundal":["4.4482216152605","32.174","0","0",[1,1,-2,0,0,0,0,0]],
"ppm":["0.000001","1","0","0",[0,0,0,0,0,0,0,0]],
"ppmdv":["0.000001","1","0","0",[0,0,0,0,0,0,0,0]],
"ppmv":["0.000001","1","0","0",[0,0,0,0,0,0,0,0]],
"ppmw":["0.000001","1","0","0",[0,0,0,0,0,0,0,0]],
"printer's point":["0.0003515","1","0","0",[1,0,0,0,0,0,0,0]],
"printer's ream":["516","1","0","0",[0,0,0,0,0,1,0,0]],
"ps":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"psf":["4.4482216152605","0.09290304","0","0",[-1,1,-2,0,0,0,0,0]],
"psi":["4.4482216152605","0.00064516","0","0",[-1,1,-2,0,0,0,0,0]],
"psia":["6894.75729316836","1","0","0",[-1,1,-2,0,0,0,0,0]],
"psig":["6894.75729316836","1","14.6959","0",[-1,1,-2,0,0,0,0,0]],
"px":["0.0254","96","0","0",[1,0,0,0,0,0,0,0]],
"pz":["1000","1","0","0",[-1,1,-2,0,0,0,0,0]],
"quart":["0.003785411784","4","0","0",[3,0,0,0,0,0,0,0]],
"quire":["25","1","0","0",[0,0,0,0,0,1,0,0]],
"rad":["1","1","0","0",[0,0,0,0,0,0,0,0]],
"radian":["1","1","0","0",[0,0,0,0,0,0,0,0]],
"rankin":["5","9","0","0",[0,0,0,0,1,0,0,0]],
"rd":["0.01","1","0","siSymbol",[2,0,-2,0,0,0,0,0]],
"real":["1","1","0","BRL",[0,0,0,0,0,0,0,1]],
"ream":["500","1","0","0",[0,0,0,0,0,1,0,0]],
"rem":["0.01","1","0","siSymbol",[2,0,-2,0,0,0,0,0]],
"rev":["6.28318530717959","1","0","0",[0,0,0,0,0,0,0,0]],
"rod":["5.0292","1","0","0",[1,0,0,0,0,0,0,0]],
"roentgen":["0.000258","1","0","siWord",[0,-1,1,1,0,0,0,0]],
"rpm":["6.28318530717959","3600","0","0",[0,0,-1,0,0,0,0,0]],
"ruble":["1","1","0","RUB",[0,0,0,0,0,0,0,1]],
"röntgen":["0.000258","1","0","siWord",[0,-1,1,1,0,0,0,0]],
"s":["1","1","0","siSymbol",[0,0,1,0,0,0,0,0]],
"saltspoon":["0.003785411784","3072","0","0",[3,0,0,0,0,0,0,0]],
"scf":["0.028316846592","1","0","0",[3,0,0,0,0,0,0,0]],
"scfd":["0.028316846592","86400","0","0",[3,0,-1,0,0,0,0,0]],
"scfh":["0.028316846592","3600","0","0",[3,0,-1,0,0,0,0,0]],
"scfm":["0.028316846592","60","0","0",[3,0,-1,0,0,0,0,0]],
"sea mile":["1852","1","0","0",[1,0,0,0,0,0,0,0]],
"sec":["1","1","0","0",[0,0,1,0,0,0,0,0]],
"second":["1","1","0","0",[0,0,1,0,0,0,0,0]],
"section":["2589988.110336","1","0","0",[2,0,0,0,0,0,0,0]],
"sennight":["604800","1","0","0",[0,0,1,0,0,0,0,0]],
"sheet":["1","1","0","0",[0,0,0,0,0,1,0,0]],
"short ream":["480","1","0","0",[0,0,0,0,0,1,0,0]],
"short ton":["907.18474","1","0","0",[0,1,0,0,0,0,0,0]],
"siemen":["1","1","0","siWord",[-2,-1,3,2,0,0,0,0]],
"sievert":["1","1","0","siWord",[2,0,-2,0,0,0,0,0]],
"slinch":["175.126835246477","1","0","0",[0,1,0,0,0,0,0,0]],
"slug":["14.5939029372064","1","0","0",[0,1,0,0,0,0,0,0]],
"smoot":["1.7018","1","0","0",[0,1,0,0,0,0,0,0]],
"span":["0.2286","1","0","0",[1,0,0,0,0,0,0,0]],
"sphere":["12.5663706143592","1","0","0",[0,0,0,0,0,0,0,0]],
"sq ft":["0.09290304","1","0","0",[2,0,0,0,0,0,0,0]],
"sq in":["0.00064516","1","0","0",[2,0,0,0,0,0,0,0]],
"sq km":["1000000","1","0","0",[2,0,0,0,0,0,0,0]],
"sq mi":["2589988.110336","1","0","0",[2,0,0,0,0,0,0,0]],
"sq yd":["0.83612736","1","0","0",[2,0,0,0,0,0,0,0]],
"square degree":["0.000304617419786709","1","0","0",[0,0,0,0,0,0,0,0]],
"square meter":["1","1","0","0",[2,0,0,0,0,0,0,0]],
"square metre":["1","1","0","0",[2,0,0,0,0,0,0,0]],
"square mi":["2589988.110336","1","0","0",[2,0,0,0,0,0,0,0]],
"sr":["1","1","0","siSymbol",[0,0,0,0,0,0,0,0]],
"ssp":["0.003785411784","3072","0","0",[3,0,0,0,0,0,0,0]],
"standard volume":["22.414","1","0","0",[3,0,0,0,0,0,0,0]],
"statampere":["0.00000000033356","1","0","0",[0,0,0,1,0,0,0,0]],
"statcoulomb":["0.00000000033356","1","0","0",[0,0,1,1,0,0,0,0]],
"statfarad":["0.0000000000011126","1","0","0",[-2,-1,4,2,0,0,0,0]],
"stathenrie":["898760000000","1","0","0",[2,1,-2,-2,0,0,0,0]],
"stathenry":["898760000000","1","0","0",[2,1,-2,-2,0,0,0,0]],
"statohm":["898760000000","1","0","0",[2,1,-3,-2,0,0,0,0]],
"statvolt":["299.79","1","0","0",[2,1,-3,-1,0,0,0,0]],
"statwatt":["0.0000001","1","0","0",[2,1,-3,0,0,0,0,0]],
"steam horsepower":["9812.5","1","0","0",[2,1,-3,0,0,0,0,0]],
"steradian":["1","1","0","0",[0,0,0,0,0,0,0,0]],
"stere":["1","1","0","0",[3,0,0,0,0,0,0,0]],
"stoke":["0.0001","1","0","0",[2,0,-1,0,0,0,0,0]],
"stone":["6.35029318","1","0","0",[0,1,0,0,0,0,0,0]],
"stpd":["0.0104998233796296","1","0","0",[0,1,-1,0,0,0,0,0]],
"stunde":["3600","1","0","0",[0,0,1,0,0,0,0,0]],
"survey feet":["1200","3937","0","0",[1,0,0,0,0,0,0,0]],
"survey foot":["1200","3937","0","0",[1,0,0,0,0,0,0,0]],
"Sv":["1","1","0","siSymbol",[2,0,-2,0,0,0,0,0]],
"sverdrup":["1000000","1","0","0",[3,0,-1,0,0,0,0,0]],
"sym":["1","1","0","siSymbol",[0,0,0,0,0,1,0,0]],
"tablespoon":["0.003785411784","256","0","0",[3,0,0,0,0,0,0,0]],
"tbsp":["0.003785411784","256","0","0",[3,0,0,0,0,0,0,0]],
"teaspoon":["0.003785411784","768","0","0",[3,0,0,0,0,0,0,0]],
"tebibyte":["8796093022208","1","0","0",[0,0,0,0,0,1,0,0]],
"terabyte":["8796093022208","1","0","0",[0,0,0,0,0,1,0,0]],
"tesla":["1","1","0","siSymbol",[-2,-2,-2,-1,0,0,0,0]],
"therm":["105480400","1","0","0",[2,1,-2,0,0,0,0,0]],
"tidal day":["89416.32","1","0","0",[0,0,1,0,0,0,0,0]],
"ton":["907.18474","1","0","0",[0,1,0,0,0,0,0,0]],
"tonf":["8896.443230521","1","0","0",[1,1,-2,0,0,0,0,0]],
"ton TNT":["4184000000","1","0","0",[2,1,-2,0,0,0,0,0]],
"ton refrigeration":["3516.8532","1","0","0",[2,1,-3,0,0,0,0,0]],
"tonne":["1000","1","0","0",[0,1,0,0,0,0,0,0]],
"tons TNT":["4184000000","1","0","0",[2,1,-2,0,0,0,0,0]],
"tons refrigeration":["3516.8532","1","0","0",[2,1,-3,0,0,0,0,0]],
"township":["93239571.972096","1","0","0",[2,0,0,0,0,0,0,0]],
"toz":["0.0311034768","1","0","0",[0,1,0,0,0,0,0,0]],
"tpy":["0.0000287475400032297","1","0","0",[0,1,-1,0,0,0,0,0]],
"tropical year":["31556925.9747","1","0","0",[0,0,1,0,0,0,0,0]],
"troy ounce":["0.0311034768","1","0","0",[0,1,0,0,0,0,0,0]],
"tsp":["0.003785411784","768","0","0",[3,0,0,0,0,0,0,0]],
"turn":["6.28318530717958","1","0","0",[0,0,0,0,0,0,0,0]],
"twip":["0.0254","1440","0","0",[1,0,0,0,0,0,0,0]],
"unit":["1","1","0","0",[0,0,0,0,0,1,0,0]],
"vapeur":["735.49875","1","0","0",[2,1,-3,0,0,0,0,0]],
"var":["1","1","0","siSymbol",[2,1,-3,0,0,0,0,0]],
"varistor":["1","1","0","siWord",[2,1,-3,0,0,0,0,0]],
"volt":["1","1","0","siWord",[2,1,-3,-1,0,0,0,0]],
"watt":["1","1","0","siWord",[2,1,-3,0,0,0,0,0]],
"weber":["1","1","0","siSymbol",[2,1,-2,-1,0,0,0,0]],
"week":["604800","1","0","0",[0,0,1,0,0,0,0,0]],
"won":["1","1","0","KRW",[0,0,0,0,0,0,0,1]],
"wppm":["0.000001","1","0","0",[0,0,0,0,0,0,0,0]],
"yard":["0.9144","1","0","0",[1,0,0,0,0,0,0,0]],
"yd":["0.9144","1","0","0",[1,0,0,0,0,0,0,0]],
"year":["31556952","1","0","0",[0,0,1,0,0,0,0,0]],
"yen":["1","1","0","JPY",[0,0,0,0,0,0,0,1]],
"£":["1","1","0","GBP",[0,0,0,0,0,0,0,1]],
"¥":["1","1","0","JPY",[0,0,0,0,0,0,0,1]],
"°":["3.14159265358979","180","0","0",[0,0,0,0,0,0,0,0]],
"°C":["1","1","273.15","0",[0,0,0,0,1,0,0,0]],
"°F":["5","9","459","0",[0,0,0,0,1,0,0,0]],
"°K":["1","1","0","0",[0,0,0,0,1,0,0,0]],
"°R":["5","9","0","0",[0,0,0,0,1,0,0,0]],
"°R":["5","9","0","0",[0,0,0,0,1,0,0,0]],
"Å":["0.0000000001","1","0","0",[1,0,0,0,0,0,0,0]],
"Ω":["1","1","0","siSymbol",[2,1,-3,-2,0,0,0,0]],
"”":["0.0254","1","0","0",[1,0,0,0,0,0,0,0]],
"₨":["1","1","0","INR",[0,0,0,0,0,0,0,1]],
"₪":["1","1","0","ILS",[0,0,0,0,0,0,0,1]],
"€":["1","1","0","EUR",[0,0,0,0,0,0,0,1]],
"℃":["1","1","273.15","0",[0,0,0,0,1,0,0,0]],
"℉":["5","9","459","0",[0,0,0,0,1,0,0,0]],
"Ω":["1","1","0","siSymbol",[2,1,-3,-2,0,0,0,0]],
"K":["1","1","0","0",[0,0,0,0,1,0,0,0]],
"Å":["0.0000000001","1","0","0",[1,0,0,0,0,0,0,0,0]]
}`));

const synonyms = Object.freeze({
  "$": "USD",
  "US$": "USD",
  "dollar": "USD",
  "A$": "AUD",
  "Australian dollar": "AUD",
  "Brazilian Real": "BRL",
  "real": "BRL",
  "R$": "BRL",
  "British Pound": "GBP",
  "£": "GBP",
  "C$": "CAD",
  "Canadian dollar": "CAD",
  "Chinese Yuan": "CNY",
  "€": "EUR",
  "Euro": "EUR",
  "euro": "EUR",
  "HK$": "HKD",
  "Hong Kong dollar":"HKD",
  "Indian Rupee": "IDR",
  "₨": "IDR",
  "Israeli New Shekel": "ILS",
  "₪": "ILS",
  "Mexican Peso": "MXN",
  "Swiss Franc": "CHF",
  "Won": "KRW",
  "won": "KRW",
  "yen": "JPY",
  "Yen": "JPY",
  "Japanese Yen": "JPY",
  "¥": "JPY"
});

const unitFromWord = (inputStr, currencies, customUnits) => {
  const str = inputStr.trim();
  const L = str.length;
  const u = {
    name: str,
    factor: Rnl.one,
    gauge: Rnl.zero,
    log: "",
    expos: [0, 0, 0, 0, 0, 0, 0, 0]
  };
  if (inputStr === "") { return u }
  let word = "";
  let unitArray;
  let doTheSearch = false;
  let prefix = "";
  let gotSiPrefixUnit = false;
  let gotMatch = false;

  for (let iPass = 1; iPass < 3; iPass++) {
    if (iPass === 1) {
      // The first pass will search with the assumption of no short-form SI prefix.
      // We will, however, check for a long form SI prefix if the word is long enough.

      doTheSearch = true;
      word = str;

      // Translate plural to signular
      if (L > 2) {
        if (word.charAt(word.length - 1) === "s") {
          if (!(word === "cfs" || (L === 3 & word.charAt(1) === "p"))) {
            word = word.slice(0, -1);
          }
        }
      }

      let prefix = "";
      if (L > 3) {
        const match = /^(yotta|zetta|exa|peta|tera|giga|mega|kilo|hecto|deka|deci|centi|milli|micro|nano|pico|femto|atto|zepto|yocto)/.exec(word);
        if (match) {
          prefix = match[0].value;
          doTheSearch = true;
          word = word.slice(prefix.length);
        }
      }
    } else {
      // We're in the second pass. Try an SI short-form prefix.
      doTheSearch = false;
      prefix = word.charAt(0);
      if ("YZEPTGMkhdcmnpfazyµμ".indexOf(prefix) > -1) {
        doTheSearch = true;
        word = word.substring(1);
      }
    }

    if ((customUnits) && (Object.hasOwnProperty.call(customUnits.value.columnMap, word))) {
      // User-defined unit
      const n = customUnits.value.columnMap[word];
      const baseUnit = customUnits.unit[customUnits.value.units[n]];
      u.factor = Rnl.multiply(Rnl.fromString(customUnits.value.data[n][0]), baseUnit.factor);
      u.expos = baseUnit.expos;
      return u
    }

    if (doTheSearch) {
      unitArray = unitTable[word];
      if (unitArray) { gotMatch = true; }
      if (iPass === 1 && gotMatch && prefix === "") {
        break
      } else if (gotMatch) {
        if (iPass === 1) {
          gotMatch = (unitArray[3] === "siWord");
          gotSiPrefixUnit = true;
          break
        } else {
          gotMatch = (unitArray[3] === "siSymbol");
          gotSiPrefixUnit = true;
        }
      }
    }
  }

  if (gotMatch) {
    u.gauge = Rnl.fromString(unitArray[2]);
    u.expos = Object.freeze(unitArray[4]);
    if (u.expos[7] === 1) {
      const currencyCode = (synonyms[word] ? synonyms[word] : word);
      if (currencies && currencies.value.has(currencyCode)) {
        // User defined currency exchange rate.
        u.factor = Rnl.reciprocal(currencies.value.get(currencyCode));
      } else {
        // Read the line whose key is the standard 3-letter currency code.
        unitArray = unitTable[currencyCode];
        if (unitArray[0] === "0") {
          return errorOprnd("CURRENCY")
        } else {
          u.factor = Rnl.reciprocal(Rnl.fromString(unitArray[0]));
        }
      }
    } else {
      // TODO: Change factor table to integers and use BigInt() instead of Rnl.fromString
      u.factor = Rnl.divide(Rnl.fromString(unitArray[0]), Rnl.fromString(unitArray[1]));
    }

    if (gotSiPrefixUnit) {
      u.factor =  Rnl.multiply(u.factor, Rnl.fromNumber(prefixFactor[prefix]));
    }

    // TODO: Logarithmic units like dB or EMM
//    const misc = unitArray[3] // SI prefix, or logarithm data, or 3-letter currency code
//    if (misc === "10") {
//      u.log = "°"
//    } else if (misc === "10+")  {
//      u.log = "10+" + " " + u.gauge + " " + u.factor
//    }

  } else {
    return errorOprnd("UNIT_NAME", str)
  }

  return Object.freeze(u)
};

const opOrNumRegEx = /[0-9·\-⁰¹²³\u2074-\u2079⁻/^()]/;
const numeralRegEx = /[0-9-]/;

const unitFromUnitName = (inputStr, vars) => {

  // TODO: Handle ° ʹ ″

  if (!inputStr) { return { name: null, factor: null, gauge: null, log: "", expos: null } }

  const currencies = vars.currencies;

  const customUnits = (vars.units) ? vars.units : null;

  let str = inputStr.trim();
  // Replace dashes & bullets with half-high dot
  str = str.replace(/[*.•×\-−](?![0-9.])/g, "·");

  // Create a unit object with default values.
  const u = { name: str, factor: Rnl.one, gauge: Rnl.zero, log: "", expos: allZeros };

  if (str === "") {
    return u
  } else if (str === "°" || str === "°ʹ" || str === "degMinSec") {
    u.factor = Rnl.fromString("0.0174532925199433");
    return u
  } else if (str === "feetInch") {
    u.unitExpos = [1, 0, 0, 0, 0, 0, 0, 0];
    u.factor = Rnl.fromString("0.3048");
    return u
  } else if (str === "″" || str === "ʹʹ") {
    // TODO: Move to unitTable
    u.unitExpos = [1, 0, 0, 0, 0, 0, 0, 0];
    u.factor = Rnl.fromString("0.0254");
    return u
  }

  // Parse str for compound units
  const tokenSep = ";";
  let inExponent = false;
  let ch = "";
  let word = "";
  let rpnString = "";
  let expoRpnString = "";
  const expoQueue = [];
  let iQueue = 0;
  const opStack = [{ symbol: "", prec: -1 }];
  let simpleUnit = "";

  // Operator Precedence for shunting yard algorithm
  // 0   ( )    parentheses
  // 1   · /    multiplication or division
  // 2   -      unary minus operator
  // 3   ^      exponentiation, right-to-left

  for (let i = 0; i < str.length; i++) {
    ch = str.charAt(i);

    if (numeralRegEx.test(ch)) {
      if (!inExponent) {
        rpnString += tokenSep;
        expoRpnString += tokenSep;
        opStack.push({ symbol: "^", prec: 3 });
        inExponent = true;
      }
      rpnString += ch;  // Append numbers directly to the RPN string.
      expoRpnString += ch;

    } else if (exponentRegEx.test(ch)) {
      if (!inExponent) {
        rpnString += tokenSep;
        expoRpnString += tokenSep;
        opStack.push({ symbol: "^", prec: 3 });
        inExponent = true;
      }
      const asciiCh = numeralFromSuperScript(ch);
      rpnString += asciiCh;  // Append numbers directly to the RPN string.
      expoRpnString += asciiCh;

    } else if (ch === "^") {
      // The "^" character is not required, but it is permitted.
      rpnString += tokenSep;
      expoRpnString += tokenSep;
      opStack.push({ symbol: "^", prec: 3 });
      inExponent = true;

    } else if (ch === "·" || ch === "/") {
      inExponent = false;
      rpnString += tokenSep;
      expoRpnString += tokenSep;
      while (opStack[opStack.length - 1].prec >= 1) {
        const symbol = opStack.pop().symbol;
        rpnString += symbol + tokenSep;
        expoRpnString += symbol + tokenSep;
      }
      opStack.push({ symbol: ch, prec: 1 });

    } else if (ch === "(") {
      opStack.push({ symbol: "(", prec: 0 });

    } else if (ch === ")") {
      while (opStack[opStack.length - 1].prec > 0) {
        const symbol = opStack.pop().symbol;
        rpnString += symbol + tokenSep;
        expoRpnString += symbol + tokenSep;
      }
      opStack.pop();  // Discard the opening parenthesis.
      inExponent = false;

    } else if (ch === "-") {  // Negative unary operator at the start of an exponent.
      inExponent = true;
      opStack.push({ symbol: "^", prec: 3 });
      opStack.push({ symbol: "-", prec: 2 });
      rpnString += tokenSep;
      expoRpnString += tokenSep;

    } else {
      inExponent = false;
      let j;
      for (j = i + 1; j < str.length; j++) {
        if (opOrNumRegEx.test(str.charAt(j))) { break }
      }
      word = str.substring(i, j);   // May actually be two words, as in "nautical miles"
      simpleUnit = unitFromWord(word, currencies, customUnits);

      if (simpleUnit.dtype && simpleUnit.dtype === dt.ERROR) { return simpleUnit }

      if (simpleUnit.factor === 0) {
        u.name = "";
        return u
      }

      rpnString += String(simpleUnit.factor[0]) + "," + String(simpleUnit.factor[1]);
      expoRpnString += "¿" + iQueue;
      expoQueue.push(simpleUnit.expos);
      iQueue += 1;

      i = j - 1;
    }

  }

  if (word === u.name) {
    return Object.freeze(simpleUnit)
  }

  // All the input characters have been addresssed. Clear the opStack.
  while (opStack.length > 1) {
    const symbol = opStack.pop().symbol;
    rpnString += tokenSep + symbol;
    expoRpnString +=  tokenSep + symbol;
  }

  // Now, resolve the RPN string
  const factors = [];
  const expoStack = [];
  const rpnArray = rpnString.split(tokenSep);
  const expoRpnArray = expoRpnString.split(tokenSep);
  let val2 = 1;
  let e2;
  iQueue = 0;

  for (let i = 0; i < rpnArray.length; i++) {
    if (/[·/\-^]/.test(rpnArray[i])) {
      val2 = factors.pop();
      e2 = expoStack.pop();
    }

    switch (rpnArray[i]) {
      case "·":
        factors[factors.length - 1] = Rnl.multiply(factors[factors.length - 1], val2);
        expoStack[expoStack.length - 1] = expoStack[expoStack.length - 1].map((el, j) => {
          return el + e2[j]
        });
        break

      case "/":
        // TODO: Rewrite next line.
        if (Rnl.isZero(val2)) { return errorOprnd("DIV") }
        factors[factors.length - 1] = Rnl.divide(factors[factors.length - 1], val2);
        expoStack[expoStack.length - 1] = expoStack[expoStack.length - 1].map((el, j) => {
          return el - e2[j]
        });
        break

      case "^":
        factors[factors.length - 1] = Rnl.power(factors[factors.length - 1], val2);
        expoStack[expoStack.length - 1] = expoStack[expoStack.length - 1].map((el) => el * e2);
        break

      case "-":   // Negative unary operator
        factors[factors.length - 1] = Rnl.negate(factors[factors.length - 1]);
        break

      default:
        if (rpnArray[i].indexOf(",") > -1) {
          const ints = rpnArray[i].split(",");
          factors.push([BigInt(ints[0]), BigInt(ints[1])]);
        } else {
          factors.push([BigInt(rpnArray[i]), BigInt(1)]);
        }
        if (expoRpnArray[i].charAt(0) === "¿") {
          expoStack.push(expoQueue[iQueue]);
          iQueue += 1;
        } else {
          expoStack.push(expoRpnArray[i]);
        }
    }
  }

  u.factor = Object.freeze(factors.pop());
  u.expos = Object.freeze(expoStack.pop());
  return Object.freeze(u)
};

/* eslint-disable */

/*
 * This file implements a complex number data type.
 * Each complex number, z, is held as an array containing two rational number.
 * z[0] is the real part and z[1] is the imaginary part.
 *
 * This module is a work in progress.
 */

const j = [Rnl.zero, Rnl.one];

const isComplex = a => {
  return Array.isArray(a) && a.length === 2
    && Rnl.isRational(a[0]) && Rnl.isRational(a[1])
};

const re = z => z[0];
const im = z => z[1];
const abs$1 = z => Rnl.hypot(z[0], z[1]);
const negate$1 = z => [Rnl.negate(z[0]), Rnl.negate(z[1])];
const conjugate = z => [z[0], Rnl.negate(z[1])];

const argument = (z) => {
    // For a complex number z, the "argument" is the angle (in radians) from
    // the positive real axis to the vector representing z.  + implies counter-clockwise.
    // Electrical engineers call this the phase angle of the complex number.
  if (Rnl.isZero(z[0]) && Rnl.isZero(z[1])) {
    return errorOprnd("ORIGIN", "argument")
  } else if (Rnl.isZero(z[1])) {
    return  Rnl.isPositive(z[0]) ? Rnl.zero : Rnl.pi
  } else if (Rnl.isZero(z[0])) {
    return  Rnl.isPositive(z[1])
      ? Rnl.divide(Rnl.pi, Rnl.two)
      : Rnl.negate(Rnl.divide(Rnl.pi, Rnl.two))
  } else {
    return  Rnl.fromNumber(Math.atan2(Rnl.toNumber(z[1]), Rnl.toNumber(z[0])))
  }
};

const add$1 = (x, y) => [Rnl.add(x[0], y[0]), Rnl.add(x[1], y[1])];
const subtract$1 = (x, y) => [Rnl.subtract(x[0], y[0]), Rnl.subtract(x[1], y[1])];

const multiply$1 = (x, y) => {
  return [
    Rnl.subtract(Rnl.multiply(x[0], y[0]), Rnl.multiply(x[1], y[1])),
    Rnl.add(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
  ]
};

const divide$1 = (x, y) => {
  if (!Rnl.isZero(x[1]) && !Rnl.isZero(y[1])) {
    if (Rnl.lessThan(Rnl.abs(y[1]), Rnl.abs(y[0]))) {
      const ratio = Rnl.divide(y[1], y[0]);
      const denom = Rnl.add(y[0], Rnl.multiply(y[1], ratio));
      return  [
        Rnl.divide(Rnl.add(x[0], Rnl.multiply(x[1], ratio)), denom),
        Rnl.divide(Rnl.subtract(x[1], Rnl.multiply(x[0], ratio)), denom),
      ]
    } else {
      const ratio = Rnl.divide(y[0], y[1]);
      const denom = Rnl.add(y[1], Rnl.multiply(y[0], ratio));
      return  [
        Rnl.divide(Rnl.add(x[1], Rnl.multiply(x[0], ratio)), denom),
        Rnl.divide(Rnl.add(Rnl.negate(x[0]), Rnl.multiply(x[1], ratio)), denom),
      ]
    }
  } else if (Rnl.isZero(x[1])) {
    // real x divided by complex y
    if (Rnl.lessThan(Rnl.abs(y[1]), Rnl.abs(y[0]))) {
      const ratio = Rnl.divide(y[1], y[0]);
      const denom = Rnl.add(y[0], Rnl.multiply(y[1], ratio));
      return  [
        Rnl.divide(x[0], denom),
        Rnl.negate(Rnl.multiply(x[0], Rnl.divide(ratio, denom))),
      ]
    } else {
      const ratio = Rnl.divide(y[0], y[1]);
      const denom = Rnl.add(y[1], Rnl.multiply(y[0], ratio));
      return  [
        Rnl.divide(Rnl.multiply(x[0], ratio), denom),
        Rnl.negate(Rnl.divide(x[0], denom)),
      ]
    }
  } else if (Rnl.isZero(y[1])) {
    // Complex x divided by real y
    if (Rnl.isZero(y[0])) ; else {
      return  [Rnl.divide(x[0], y[0]), Rnl.divide(x[1], y[0])]
    }
  } else {
    // both x and y are reals
    if (Rnl.isZero(y[0])) {
      return errorOprnd("DIV")
    } else {
      return [Rnl.divide(x[0], y[0]), Rnl.zero ]
    }
  }
};

const increment$1 = z => [Rnl.increment(z[0]), z[1]];
const decrement$1 = z => [Rnl.decrement(z[0]), z[1]];

const inverse = z => {
  // Complex inverse 1 / z
  if (Rnl.isZero(z[1])) {
    if (Rnl.isZero((z[0]))) { return errorOprnd("DIV") }
    return [Rnl.inverse(z[0]), 0]
  } else {
    return divide$1([Rnl.one, Rnl.zero], z)
  }
};

const cos$1 = z => {
  const real = Rnl.multiply(Rnl.cos(z[0]), Rnl.cosh(z[1]));
  const im = Rnl.multiply(Rnl.negate(Rnl.sin(z[0])), Rnl.sinh(z[1]));
  return [real, im]
};

const sin$1 = z => {
  const real = Rnl.multiply(Rnl.sin(z[0]), Rnl.cosh(z[1]));
  const im = Rnl.multiply(Rnl.cos(z[0]), Rnl.sinh(z[1]));
  return [real, im]
};

const log = x => {
  let z = [Rnl.zero, Rnl.zero];
  // Natural (base e) logarithm of a complex number, x
  if (Rnl.isZero(x[0]) && Rnl.isZero(x[1])) {
    return errorOprnd("ORIGIN", "log")
  } else {
    z[0] = Rnl.fromNumber(Math.log(Rnl.toNumber(Rnl.hypot(x[0], x[1]))));
    z[1] = argument(x);   // phase angle, in radians
  }
  return z
};

const isSmall = x => Rnl.lessThan(Rnl.abs(x), [BigInt(1), BigInt(100000000000000)]);

const exp$1 = x => {
  // Complex exponentiation
  let z = [Rnl.zero, Rnl.zero];
  if (isSmall(x[1])) {
    z[1] = Rnl.zero;
    z[0] = Rnl.exp(x[0]);
  } else {
    if (Rnl.isZero(x[0])) {
      z[0] = Rnl.cos(x[1]);
      if (isSmall(z[0])) { z[0] = Rnl.zero; }
      z[1] = Rnl.sin(x[1]);
      if (isSmall(z[1])) { z[1] = Rnl.zero; }
    } else {
      const realExp = Rnl.exp(x[0]);
      z[0] = Rnl.multiply(realExp, Rnl.cos(x[1]));
      z[1] = Rnl.multiply(realExp, Rnl.sin(x[1]));
    }
  }
  return z
};

const power$1 = (x, y) =>{
  let z = [Rnl.zero, Rnl.zero];
  // powers: z = e^(log(x) × y)
  if (!isComplex(y)) {
    z = log(x);
    z[0] = Rnl.multiply(z[0], y);
    z[1] = Rnl.multiply(z[1], y);
  } else if (Rnl.isZero(y[1])) {
    z = log(x);
    z[0] = Rnl.multiply(z[0], y[0]);
    z[1] = Rnl.multiply(z[1], y[0]);
  } else if (Rnl.isZero(x[1]) && !Rnl.isNegative(x[0])) { 
    x[0] = Rnl.fromNumber(Math.log(Rnl.toNumber(x[0])));
    z[0] = Rnl.multiply(x[0], y[0]);
    z[1] = Rnl.multiply(x[0], y[1]);
  } else {
    x = log(x);
    z[0] = Rnl.subtract(Rnl.multiply(x[0], y[0]), Rnl.multiply(x[1], y[1]));
    z[1] = Rnl.add(Rnl.multiply(x[1], y[0]), Rnl.multiply(x[0], y[1]));
  }
  
  z = exp$1(z);
  if (isSmall(z[1])) { z[1] = Rnl.zero; }
  if (isSmall(z[0])) { z[0] = Rnl.zero; }
  return z
};

const acosh = z => {
  // acosh(z) = log( z + √(z - 1) × √(z + 1) )
  return log(add$1(z, multiply$1(sqrt$1(decrement$1(z)), sqrt$1(increment$1(z)))))
};

const asinh = z => {
  // Log(z + Sqrt(z * z + 1))
  const s = sqrt$1(add$1(multiply$1(z, z), [Rnl.one, Rnl.zero]));
  return log(add$1(z, s))
};

const atanh = z => {
  // atanh(z) = [ log(1+z) - log(1-z) ] / 2
  return divide$1(subtract$1(log(increment$1(z)), log(subtract$1([Rnl.one, Rnl.zero], z))), [Rnl.two, Rnl.zero])
};

const asin = z => {
  // arcsinh (i * z) / i
  return divide$1(asinh(multiply$1(j, z)), j)
};

const atan = z => {
  // (Log(1 + iz) - Log(1 - iz)) / (2 * i)  cf Kahan
  const term1 = log(increment$1(multiply$1(j, z)));
  const term2 = log(subtract$1([Rnl.one, Rnl.zero],(multiply$1(j, z))));
  return divide$1(subtract$1(term1, term2), [Rnl.zero, Rnl.two])  
};

const sqrt$1 = x => {
  const z = log(x);
  z[0] = Rnl.divide(z[0], Rnl.two);
  z[1] = Rnl.divide(z[1], Rnl.two);
  return exp$1(z)
};

const lanczos$1 = zPlusOne => {
  // Lanczos approximation of Gamma function.
  // Coefficients are from 2004 PhD thesis by Glendon Pugh.
  // *An Analysis of the Lanczos Gamma Approximation*
  // The following equation is from p. 116 of the Pugh thesis:
  // Γ(z+1) ≈ 2 * √(e / π) * ((z + 10.900511 + 0.5) / e) ^ (z + 0.5) * sum
  const z = subtract$1(zPlusOne, [Rnl.one, Rnl.zero]);
  const sqr = Rnl.sqrt(Rnl.divide(e, pi));
  const term1 = multiply$1([Rnl.two, Rnl.zero], [sqr, Rnl.zero]);
  const k = Rnl.fromNumber(11.400511);
  const oneHalf = [[BigInt(1), BigInt(2)], Rnl.zero];
  const term2 = power$1(divide$1(add$1(z, [k, Rnl.zero]), [e, Rnl.zero]), add$1(z, oneHalf));

  // Coefficients from Pugh, Table 8.5
  const d = ["2.48574089138753565546e-5", "1.05142378581721974210",
    "-3.45687097222016235469", "4.51227709466894823700", "-2.98285225323576655721",
    "1.05639711577126713077", "-0.195428773191645869583", "0.0170970543404441224307",
    "-0.000571926117404305781283", "0.00000463399473359905636708",
    "-0.00000000271994908488607703910"];

  // sum = d_0 + ∑_(k=1)^10 d_k/(z+k)
  let sum = [Rnl.fromString(d[0]), Rnl.zero];
  for (let k = 1; k <= 10; k++) {
    const d = [Rnl.fromString(d[k]), Rnl.zero];
    const complexK = [Rnl.fromNumber(k), Rnl.zero];
    sum = add$1(sum, divide$1(d, add$1(z, complexK)));
  }

  return multiply$1(multiply$1(term1, term2), sum)
};

const display = (z, formatSpec, decimalFormat) => {
  const complexSpec = /[j∠°]/.test(formatSpec) ? formatSpec.slice(-1) : "j";
  let resultDisplay = "";
  let altResultDisplay = "";
  if (complexSpec === "j") {
    const real = format(z[0], formatSpec, decimalFormat);
    let im = format(z[1], formatSpec, decimalFormat);
    if (im.charAt(0) === "-") { im = "(" + im + ")"; }
    resultDisplay = real + " + j" + im;
    altResultDisplay = real + " + j" + im;
  } else {
    const mag = Rnl.hypot(z[0], z[1]);
    let angle = Cpx.argument(result.value);
    if (complexSpec === "°") {
      angle = Rnl.divide(Rnl.multiply(angle, Rnl.fromNumber(180)), Rnl.pi);
    }
    resultDisplay = format(mag, formatSpec, decimalFormat) + "∠" +
                    format(angle, formatSpec, decimalFormat) +
                    (complexSpec === "°" ? "°" : "");
    altResultDisplay = resultDisplay;
  }
  return [resultDisplay, altResultDisplay]
};

const Cpx = Object.freeze({
  j,
  re,
  im,
  abs: abs$1,
  conjugate,
  argument,
  inverse,
  increment: increment$1,
  decrement: decrement$1,
  isComplex,
  add: add$1,
  subtract: subtract$1,
  divide: divide$1,
  multiply: multiply$1,
  negate: negate$1,
  power: power$1,
  exp: exp$1,
  log,
  sqrt: sqrt$1,
  sin: sin$1,
  cos: cos$1,
  asin,
  atan,
  acosh,
  asinh,
  atanh,
  lanczos: lanczos$1,
  display
});

// Two helper functions
const isMatrix = oprnd => {
  return (
    (oprnd.dtype & dt.ROWVECTOR) ||
    (oprnd.dtype & dt.COLUMNVECTOR) ||
    (oprnd.dtype & dt.MATRIX)
  )
};
const isVector = oprnd => {
  return (((oprnd.dtype & dt.ROWVECTOR) || (oprnd.dtype & dt.COLUMNVECTOR)) > 0)
};

const convertFromBaseUnits = (oprnd, gauge, factor) => {
  let conversion = (isVector(oprnd))
    ? oprnd.value.map((e) => Rnl.divide(e, factor))
    : oprnd.value.map(row => row.map(e => Rnl.divide(e, factor)));
  if (!Rnl.isZero(gauge)) {
    conversion = (isVector(oprnd))
      ? oprnd.value.map((e) => Rnl.subtract(e, gauge))
      : oprnd.value.map(row => row.map(e => Rnl.subtract(e, gauge)));
  }
  return Object.freeze(conversion)
};

const convertToBaseUnits = (oprnd, gauge, factor) => {
  let conversion = clone(oprnd.value);
  if (!Rnl.isZero(gauge)) {
    conversion = (isVector(oprnd))
      ? oprnd.value.map((e) => Rnl.add(e, gauge))
      : oprnd.value.map(row => row.map(e => Rnl.add(e, gauge)));
  }
  conversion = (isVector(oprnd))
    ? conversion.map((e) => Rnl.multiply(e, factor))
    : conversion.map(row => row.map(e => Rnl.multiply(e, factor)));
  return Object.freeze(conversion)
};

const display$1 = (m, formatSpec, decimalFormat) => {
  let str = "\\begin";
  if (m.dtype & dt.MATRIX) {
    str += "{pmatrix}";
    const numRows = m.value.length;
    const numCols = m.value[1].length;
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        str += format(m.value[i][j], formatSpec, decimalFormat) + " &";
      }
      str = str.slice(0, -1) + " \\\\ ";
    }
    str = str.slice(0, -3).trim();
    str += "\\end{pmatrix}";
  } else {
    str += "{bmatrix}";
    const argSep = (m.dtype & dt.ROWVECTOR) ? " & " : " \\\\ ";
    if (m.value.plain) {
      const numArgs = m.value.plain.length;
      for (let i = 0; i < numArgs; i++) {
        str += format(m.value.plain[i], formatSpec, decimalFormat) +
          ((i < numArgs - 1) ? argSep : "");
      }
    } else {
      const numArgs = m.value.length;
      for (let i = 0; i < numArgs; i++) {
        const elementDisplay = m.value[i] === undefined
          ? ""
          : (m.dtype & dt.RATIONAL)
          ? format(m.value[i], formatSpec, decimalFormat)
          : (m.dtype & dt.COMPLEX)
          ? Cpx.display(m.value[i], formatSpec, decimalFormat)[0]
          : (m.dtype & dt.BOOLEAN) || (m.dtype & dt.STRING)
          ? "\\text{" + m.value[i] + "}"
          : m.value[i];
        str += elementDisplay + ((i < numArgs - 1) ? argSep : "");
      }
    }
    str += "\\end{bmatrix}";
  }
  return str
};

const displayAlt = (m, formatSpec, decimalFormat) => {
  let str = "";
  if (m.dtype & dt.MATRIX) {
    str += "(";
    const numRows = m.value.length;
    const numCols = m.value[1].length;
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        str += format(m.value[i][j], formatSpec, decimalFormat).replace(/{,}/g, ",") + ", ";
      }
      str = str.slice(0, -2) + "; ";
    }
    str = str.slice(0, -2).trim();
    str += ")";
  } else {
    str += "[";
    const argSep = (m.dtype & dt.ROWVECTOR) ? ", " : "; ";
    if (m.value.plain) {
      const numArgs = m.value.plain.length;
      for (let i = 0; i < numArgs; i++) {
        str += format(m.value.plain[i], formatSpec, decimalFormat).replace(/{,}/g, ",") +
           ((i < numArgs - 1) ? argSep : "");
      }
    } else {
      const numArgs = m.value.length;
      for (let i = 0; i < numArgs; i++) {
        const elementDisplay = m.value[i] === undefined
          ? ""
          : (m.dtype & dt.RATIONAL)
          ? format(m.value[i], formatSpec, decimalFormat).replace(/{,}/g, ",")
          : (m.dtype & dt.COMPLEX)
          ? Cpx.display(m.value[i], formatSpec, decimalFormat)[1].replace(/{,}/g, ",")
          : m.value[i];
        str += elementDisplay + ((i < numArgs - 1) ? argSep : "");
      }
    }
    str += "]";
  }
  return str
};

const displayMapOfVectors = (value, formatSpec, decimalFormat) => {
  // Display a map full of vectors
  let str = "\\begin{Bmatrix}";
  Object.keys(value).forEach(key => {
    const vector = value[key];
    str += "\\text{" + key + "}: \\begin{bmatrix}";
    const numArgs = vector.plain.length;
    if (vector.plain) {
      for (let i = 0; i < numArgs; i++) {
        str += format(vector.plain[i], formatSpec, decimalFormat) +
          ((i < numArgs - 1) ? ", " : "");
      }
    } else {
      for (let i = 0; i < numArgs; i++) {
        const elementDisplay = Rnl.isRational(vector[i])
          ? format(vector[i], formatSpec, decimalFormat)
          : (typeof vector[i] === "boolean") || (typeof vector[i] === "string")
          ? "\\text{" + vector[i] + "}"
          : vector[i];
        str += elementDisplay + ((i < numArgs - 1) ? " & " : "");
      }
    }
    str += "\\end{bmatrix} \\\\";
  });
  str = str.slice(0, -2) + "\\end{Bmatrix}";
  return str
};

const displayAltMapOfVectors = (value, formatSpec, decimalFormat) => {
  let str = "{";
  Object.keys(value).forEach(key => {
    const vector = value[key];
    str += key + ": [";
    const numArgs = vector.plain.length;
    if (vector.plain) {
      for (let i = 0; i < numArgs; i++) {
        str += format(vector.plain[i], formatSpec, decimalFormat) +
        ((i < numArgs - 1) ? ", " : "").replace(/{,}/g, ",") + " ";
      }
    } else {
      for (let i = 0; i < numArgs; i++) {
        const elementDisplay = Rnl.isRational(vector[i])
          ? format(vector[i], formatSpec, decimalFormat).replace(/{,}/g, ",") + " "
          : String(vector[i]) + "}";
        str += elementDisplay + ((i < numArgs - 1) ? " " : "");
      }
    }
    str += "];";
  });
  return str.slice(0, -1) + "}"
};


const identity = (num, mutable) => {
  const n = Rnl.isRational(num) ? Rnl.toNumber(num) : num;
  if (n === 1) {
    return  [Rnl.one]
  } else {
    const M = [];
    for (let i = 0; i < n; i++) {
      M.push(new Array(n).fill(Rnl.zero));
      M[i][i] = Rnl.one;
    }
    return mutable ? M : Object.freeze(M)
  }
};

const invert = (matrix, returnDeterminant) => {
  // Invert a square matrix via Gaussian elimination.
  // A lightly editied copy of http://blog.acipo.com/matrix-inversion-in-javascript/

  if (matrix.length !== matrix[0].length) {
    return errorOprnd("NONSQUARE")
  }
  const dim = matrix.length;
  let i = 0;
  let ii = 0;
  let j = 0;
  let temp = Rnl.zero;
  let determinant = Rnl.one;

  const C = clone(matrix);
  const I = identity(dim, true);

  for (i = 0; i < dim; i += 1) {
    // get the element temp on the diagonal
    temp = C[i][i];

    // if we have a 0 on the diagonal (we'll need to swap with a lower row)
    if (Rnl.isZero(temp)) {
      //look through every row below the i'th row
      for (ii = i + 1; ii < dim; ii++) {
        //if the ii'th row has a non-0 in the i'th col
        if (!Rnl.isZero(C[ii][i])) {
          //it would make the diagonal have a non-0 so swap it
          for (j = 0; j < dim; j++) {
            temp = C[i][j];     // temp store i'th row
            C[i][j] = C[ii][j]; // replace i'th row by ii'th
            C[ii][j] = temp;    // repace ii'th by temp
            temp = I[i][j];     // temp store i'th row
            I[i][j] = I[ii][j]; // replace i'th row by ii'th
            I[ii][j] = temp;    // repace ii'th by temp
          }
          //don't bother checking other rows since we've swapped
          break
        }
      }
      //get the new diagonal
      temp = C[i][i];
      //if it's still 0, not invertable (error)
      if (Rnl.isZero(temp)) { return errorOprnd("SINGULAR") }
    }

    if (returnDeterminant) {
      determinant = Rnl.divide(determinant, temp);
      if (i === dim - 1) {
        return determinant
      }
    }

    // Scale this row down by temp (so we have a 1 on the diagonal)
    for (j = 0; j < dim; j++) {
      C[i][j] = Rnl.divide(C[i][j], temp); //apply to original matrix
      I[i][j] = Rnl.divide(I[i][j], temp); //apply to identity
    }

    // Subtract this row (scaled appropriately for each row) from ALL of
    // the other rows so that there will be 0's in this column in the
    // rows above and below this one
    for (ii = 0; ii < dim; ii++) {
      // Only apply to other rows (we want a 1 on the diagonal)
      if (ii === i) { continue }

      // We want to change this element to 0
      temp = C[ii][i];

      // Subtract (the row above(or below) scaled by temp) from (the
      // current row) but start at the i'th column and assume all the
      // stuff left of diagonal is 0 (which it should be if we made this
      // algorithm correctly)
      for (j = 0; j < dim; j++) {
        C[ii][j] = Rnl.subtract(C[ii][j], Rnl.multiply(temp, C[i][j])); // original matrix
        I[ii][j] = Rnl.subtract(I[ii][j], Rnl.multiply(temp, I[i][j])); // identity
      }
    }
  }

  // We've finished. C should be the identity matrix.
  // Matrix I should be the inverse.
  return Object.freeze(I)
};


const submatrix = (oprnd, index, colIndex) => {
  if (!((index.dtype & dt.RATIONAL) || (index.dtype & dt.RANGE))) {
    return errorOprnd("BAD_INDEX")
  }
  let value = [];
  let dtype = oprnd.dtype;

  // Get the row index
  let start = 0;
  let step = 1;
  let end = 0;
  if (index.dtype & dt.RANGE) {
    start = Rnl.toNumber(index.value[0]);
    step = Rnl.toNumber(index.value[1]);
    end = index.value[2] === "∞"
      ? oprnd.value.length
      : Rnl.toNumber(index.value[2]);
  } else if (Rnl.areEqual(index.value, Rnl.zero)) {
    // Return all the rows
    start = 1;
    end = oprnd.value.length;
  } else {
    start = Rnl.toNumber(index.value);
    end = start;
  }

  if (isVector(oprnd)) {
    // Skip the column index. Proceed directly to load values into the result.
    if (start === end) {
      // return a scalar
      value = oprnd.value[start - 1];
      dtype = oprnd.dtype - (oprnd.dtype & dt.ROWVECTOR) -
        (oprnd.dtype & dt.COLUMNVECTOR);
    } else if (step === 1) {
      value = oprnd.value.slice(start - 1, end);
    } else {
      for (let i = start - 1; i < end; i += step) {
        value.push(oprnd.value[i]);
      }
    }
    Object.freeze(value);
    return Object.freeze({ value, unit: oprnd.unit, dtype })
  }

  // Get the column index
  let colStart = 0;
  let colStep = 1;
  let colEnd = 0;
  if (colIndex) {
    if (colIndex.dtype & dt.RANGE) {
      colStart = Rnl.toNumber(colIndex.value[0]);
      colStep = Rnl.toNumber(colIndex.value[1]);
      colEnd = colIndex.value[2] === "∞"
        ? oprnd.value[0].length
        : Rnl.toNumber(colIndex.value[2]);
    } else if (Rnl.areEqual(colIndex.value, Rnl.zero)) {
      // Return an entire row.
      colStart = 1;
      colEnd = oprnd.value[0].length;
    } else {
      colStart = Rnl.toNumber(colIndex.value);
      colEnd = colStart;
    }
  }

  // Now load values into the result
  if (start === end && colStart === colEnd) {
    // return a scalar
    value = oprnd.value[start - 1][colStart - 1];
    dtype -= dt.MATRIX;

  } else if (start === end) {
    // return a row vector
    if (colStep === 1) {
      value = oprnd.value[start - 1].slice(colStart - 1, colEnd);
    } else {
      for (let j = colStart - 1; j < colEnd; j += colStep) {
        value.push(oprnd.value[start - 1][j]);
      }
    }
    dtype = dtype - dt.MATRIX + dt.ROWVECTOR;

  } else if (colStart === colEnd) {
    // return a column vector
    for (let i = start - 1; i < end; i += step) {
      value.push(oprnd.value[i][colStart - 1]);
    }
    dtype = dtype - dt.MATRIX + dt.COLUMNVECTOR;

  } else if (colStep === 1) {
    for (let i = start - 1; i < end; i += step) {
      value.push([]);
      value[value.length - 1] = oprnd.value[i].slice(colStart - 1, colEnd);
    }

  } else {
    for (let i = start - 1; i < end; i += step) {
      value.push([]);
      for (let j = colStart - 1; j < colEnd; j += colStep) {
        value[value.length - 1].push(oprnd[i][j]);
      }
    }
  }
  Object.freeze(value);
  return Object.freeze({ value, unit: oprnd.unit, dtype })
};

const multResultType = (o1, o2) => {
  // o1 and o2 are to undergo matrix multiplication.
  // The value is found elsewhere.
  // Here we find the resulting data type.
  if ((o1.dtype & dt.ROWVECTOR) && (o2.dtype & dt.COLUMNVECTOR)) {
    return dt.RATIONAL
  } else if ((o1.dtype & dt.MATRIX) && (o2.dtype & dt.COLUMNVECTOR)) {
    return o2.dtype
  } else if ((o1.dtype & dt.ROWVECTOR) && (o2.dtype & dt.MATRIX)) {
    return o1.dtype
  } else {
    return dt.MATRIX + dt.RATIONAL
  }
};

const operandFromRange = range => {
  // Input was [start:step:end]
  // Populate a vector with values from a range
  const array = [];
  if (Rnl.greaterThan(range[2], range[0])) {
    for (let j = range[0]; Rnl.lessThan(j, range[2]); j = Rnl.add(j, range[1])) {
      array.push(j);
    }
  } else {
    for (let j = range[0]; Rnl.greaterThanOrEqualTo(j, range[2]);
        j = Rnl.add(j, range[1])) {
      array.push(j);
    }
  }
  if (!Rnl.areEqual(array[array.length - 1], range[2])) {
    array.push(range[2]);
  }
  Object.freeze(array);
  return Object.freeze({
    value: array,
    unit: { expos: allZeros },
    dtype: dt.RATIONAL + dt.ROWVECTOR
  })
};

const operandFromTokenStack = (tokenStack, numRows, numCols) => {
  // TODO: Get dtype correct for matrices that contain strings or booleans.
  if (numRows === 0 && numCols === 0) {
    return Object.freeze({ value: new Array(0), unit: null, dtype: dt.ROWVECTOR })
  } else if (numRows === 1 && numCols === 1) {
    // One element. Return a scalar.
    return tokenStack.pop()

  } else if (numRows === 1 || numCols === 1) {
    const numArgs = Math.max(numRows, numCols);
    let array;
    let dtype = tokenStack[tokenStack.length - 1].dtype;
    if (numRows === 1 && (dtype & dt.COLUMNVECTOR)) {
      // Matrix composed of column vectors appended side by side
      dtype = dtype - dt.COLUMNVECTOR + dt.MATRIX;
      array = new Array(tokenStack[0].value.length);
      for (let i = 0; i < tokenStack[0].value.length; i++) {
        array[i] = [];
        for (let j = 0; j < numArgs; j++) {
          array[i][j] = tokenStack[j].value[i];
        }
      }
      for (let i = 0; i < numArgs; i++) { tokenStack.pop(); }
    } else  {
      // Vector
      array = new Array(numArgs);
      dtype += numRows === 1 ? dt.ROWVECTOR : dt.COLUMNVECTOR;
      for (let j = numArgs - 1; j >= 0; j--) {
        array[j] = tokenStack.pop().value;
      }
    }
    Object.freeze((array));
    return Object.freeze({
      value: array,
      unit: (dtype & dt.RATIONAL) ? { expos: allZeros } : null,
      dtype
    })

  } else {
    // 2D matrix
    const array = new Array(numRows);
    const dtype = tokenStack[tokenStack.length - 1].dtype + dt.MATRIX;
    for (let j = 0; j < numRows; j++) {
      array[j] = new Array(numCols);
    }
    for (let k = numRows - 1; k >= 0; k--) {
      for (let j = numCols - 1; j >= 0; j--) {
        array[k][j] =  tokenStack.pop().value;
      }
    }
    Object.freeze((array));
    return Object.freeze({
      value: array,
      unit: (dtype & dt.RATIONAL) ? { expos: allZeros } : null,
      dtype
    })
  }
};

const zeros = (m, n) => {
  if (m === 1) {
    return {
      value: new Array(n).fill(Rnl.zero),
      unit: allZeros,
      dtype: dt.RATIONAL + dt.ROWVECTOR
    }
  } else if (n === 1) {
    return {
      value: new Array(m).fill(Rnl.zero),
      unit: allZeros,
      dtype: dt.RATIONAL + dt.COLUMNVECTOR
    }
  } else {
    const value = [];
    for (let i = 0; i < m; i++) {
      value.push(new Array(n).fill(Rnl.zero));
    }
    Object.freeze(value);
    return Object.freeze({
      value: value,
      unit: { expos: allZeros },
      dtype: dt.RATIONAL + dt.MATRIX
    })
  }
};

const Matrix = Object.freeze({
  convertFromBaseUnits,
  convertToBaseUnits,
  display: display$1,
  displayAlt,
  displayMapOfVectors,
  displayAltMapOfVectors,
  identity,
  invert,
  isVector,
  multResultType,
  operandFromRange,
  operandFromTokenStack,
  submatrix,
  zeros
});

const columnListFromRange = (start, end) => {
  const columnList = [];
  for (let i = start; i <= end; i++) {
    columnList.push(i);
  }
  return columnList
};

const valueFromDatum = datum => {
  return datum === "true"
  ? true
  : datum === "false"
  ? false
  : numberRegEx$1.test(datum)
  ? Rnl.fromString(datum)
  : datum === ""
  ? undefined
  : datum
};

const datumFromValue = (value, dtype) => {
  return value === true
    ? "true"
    : value === false
    ? "false"
    : value =  (dtype === dt.RATIONAL)
    ? "0 " + String(value[0]) + "/" + String(value[1])
    : value
};

const range = (df, args, vars, unitAware) => {
  let iStart;
  let iEnd;
  const rowList = [];
  let columnList = [];
  let unit = Object.create(null);

  // Find what must be returned. I.e. populate rowList and columnList
  if (df.value.data[0].length === 1) {
    // The source is a single-row data frame. Each argument calls a column.
    iStart = 0;
    iEnd = 0;
    for (let i = 0; i < args.length; i++) {
      if (args[i].dtype === dt.STRING) {
        columnList.push(df.value.columnMap[args[i].value]);
      } else if (args[i].dtype === dt.RATIONAL) {
        columnList.push(Rnl.toNumber(args[i].value));
      } else if (args[i].dtype === dt.RANGE) {
        const jStart = Rnl.toNumber(args[i].value[0]);
        const jEnd = Rnl.toNumber(args[i].value[1]);
        for (let j = jStart; j <= jEnd; j++) {
          columnList.push(j);
        }
      }
    }
  } else if (args.length === 1 && args[0].dtype === dt.RATIONAL) {
    iStart = Rnl.toNumber(args[0].value) - 1;
    iEnd = iStart;
    columnList = columnListFromRange(0, df.value.data.length - 1);
  } else if (args.length === 1 && args[0].dtype === dt.RANGE) {
    iStart = Rnl.toNumber(args[0].value[0]) - 1;
    iEnd = Rnl.toNumber(args[0].value[1]) - 1;
    columnList = columnListFromRange(0, df.value.data.length - 1);
  } else if (args.length === 1 && args[0].dtype === dt.STRING) {
    // Only one indicator has been given.
    // Check both the rowMap and the columnMap.
    if (df.value.rowMap && args[0].value in df.value.rowMap) {
      // Return a row
      iStart = df.value.rowMap[args[0].value];
      iEnd = iStart;
      columnList = columnListFromRange(0, df.value.data.length - 1);
    } else if (df.value.columnMap && args[0].value in df.value.columnMap) {
      // Return a column vector
      iStart = 0;
      iEnd = df.value.data[0].length - 1;
      columnList.push(df.value.columnMap[args[0].value]);
    } else {
      return errorOprnd("BAD_ROW_NAME", args[0].value)
    }
  } else if (args.length === 1 && args[0].dtype === dt.STRING + dt.COLUMNVECTOR) {
    // A vector of row names
    for (const rowName of args[0].value) {
      rowList.push(rowName);
    }
    columnList = columnListFromRange(0, df.value.data.length - 1); // All the columns.
  } else if (args.length === 1 && args[0].dtype === dt.STRING + dt.ROWVECTOR) {
    // A vector of column names
    iStart = 0;
    iEnd = df.value.data[0].length;
    for (const colName of args[0].value) {
      columnList.push(df.columnIndicator[colName]);
    }
  } else if (args.length === 2 && args[0].dtype === dt.STRING && df.value.rowMap
    && args[0].value in df.value.rowMap && args[1].dtype === dt.STRING &&
    df.value.columnMap && args[0].value in df.value.columnMap) {
    // Return a single cell value
    iStart = df.value.rowMap[args[0].value];
    iEnd = iStart;
    columnList.push(df.value.columnMap[args[0].value]);
  }

  if (rowList.length === 0 && iStart === iEnd && columnList.length === 1) {
    // Return one value.
    let dtype = df.value.dtype[columnList[0]];
    if (dtype & dt.QUANTITY) { dtype -= dt.QUANTITY; }
    const j = columnList[0];
    let value = valueFromDatum(df.value.data[j][iStart]);
    unit.expos = (dtype & dt.RATIONAL) ? allZeros : null;
    if (unitAware && df.value.units[j]) {
      const unitName = df.value.units[j] ? df.value.units[j] : undefined;
      const unitObj = unitFromUnitName(unitName, vars);
      value = Rnl.multiply(Rnl.add(value, unitObj.gauge), unitObj.factor);
      unit.expos = unitObj.expos;
    }
    return { value, unit, dtype }

  } else if (columnList.length === 1) {
    // Return data from one column, in a column vector or a quantity
    const j = columnList[0];
    const unitName = df.value.units[j] ? df.value.units[j] : {};
    unit = (df.unit && df.unit[unitName]) ? df.unit[unitName] : { expos: null };
    const value = df.value.data[j].slice(iStart, iEnd + 1).map(e => valueFromDatum(e));
    const dtype = df.value.dtype[j] + dt.COLUMNVECTOR;
    const newdf = { value, name: df.value.headings[j], unit, dtype };
    if (unitAware && unit.gauge) {
      return {
        value: Matrix.convertToBaseUnits(newdf, unit.gauge, unit.factor),
        name: df.value.headings[j],
        unit: { expos: clone(unit.expos) },
        dtype: dt.RATIONAL + dt.COLUMNVECTOR
      }
    } else {
      return newdf
    }

  } else {
    // Return a data frame.
    const headings = [];
    const units = [];
    const dtype = [];
    const data = [];
    const columnMap = Object.create(null);
    const unitMap = Object.create(null);
    const rowMap = rowList.length === 0 ? false : Object.create(null);
    for (let j = 0; j < columnList.length; j++) {
      headings.push(df.value.headings[columnList[j]]);
      const unitName = df.value.units[columnList[j]];
      units.push(unitName);
      if (unitName && !unitMap[unitName]) { unitMap[unitName] = df.unit[unitName]; }
      dtype.push(df.value.dtype[columnList[j]]);
      columnMap[df.value.headings[j]] = j;
      if (rowList.length > 0) {
        const elements = [];
        for (let i = 0; i < rowList.length; i++) {
          const rowName = rowList[i];
          elements.push(df.value.data[columnList[j]][df.value.rowMap[rowName]]);
          rowMap[rowName] = i;
        }
        data.push(elements);
      } else {
        data.push(df.value.data[columnList[j]].slice(iStart, iEnd + 1));
      }
    }
    return {
      value: {
        data: data,
        headings: headings,
        columnMap: columnMap,
        rowMap: false,
        units: units,
        dtype: dtype
      },
      unit: clone(unitMap),
      dtype: dt.DATAFRAME
    }
  }
};

// const numberRegEx = new RegExp(Rnl.numberPattern + "$")
const numberRegEx$1 = new RegExp("^(?:=|" + Rnl.numberPattern.slice(1) + "$)");
const mixedFractionRegEx = /^-?(?:[0-9]+(?: [0-9]+\/[0-9]+))$/;

const dataFrameFromCSV = (str, vars) => {
  // Load a CSV string into a data frame.
  // Data frames are loaded column-wise. The subordinate data structures are:
  const data = [];    // where the main data lives, not including column names or units.
  const headings = [];                   // An array containing the column names
  const columnMap = Object.create(null); // map of column names to column index numbers
  let rowMap =  false;                   // ditto for rows.
  const units = [];                      // array of unit names, one for each column
  const dtype = [];                      // each column's Hurmet operand type
  const unitMap = Object.create(null);   // map from unit names to unit data
  let gotUnits = false;
  // Determine if the file is tab separated or pipe separated
  const sepChar = str.indexOf("\t") > -1 ? "\t" : "|";

  if (str.charAt(0) === "`") { str = str.slice(1); }
  let row = 0;
  let col = 0;

  // Before we start loading data, let's write two closed functions, to share variable scope.
  const checkForUnitRow = _ => {
    // Determine if there is a row for unit names.
    let gotAnswer = false;
    for (let iCol = 0; iCol < data.length; iCol++) {
      if (numberRegEx$1.test(data[iCol][0])) { gotAnswer = true; break }
    }
    if (!gotAnswer) {
      for (let iCol = 0; iCol < data.length; iCol++) {
        if (numberRegEx$1.test(data[iCol][1])) { gotUnits = true; break }
      }
    }
    if (gotUnits) {
      // Shift the top row of data into units.
      for (let iCol = 0; iCol < data.length; iCol++) {
        const unitName = data[iCol].shift();
        units.push(unitName);
        if (unitName.length > 0) {
          if (!unitMap[unitName]) {
            const unit = unitFromUnitName(unitName, vars);
            if (unit) {
              unitMap[unitName] = unit;
            } else {
              return errorOprnd("DF_UNIT", unitName)
            }
          }
        }
      }
      if (rowMap) {
        Object.entries(rowMap).forEach(([key, value]) => { rowMap[key] = value - 1; });
      }
    }
  };

  const keyRegEx = /^(?:[Nn]ame|[Ii]tem|[Ll]able)$/;

  const harvest = (datum) => {
    // Load a datum into the dataTable
    datum = datum.trim();

    if (row === 3 && col === 0) { checkForUnitRow(); }

    if (row === 0) {
      headings.push(datum);
      columnMap[datum] = col;
      if (col === 0 && (datum.length === 0 || keyRegEx.test(datum))) {
        rowMap = Object.create(null);
      }
    } else {
      if (row === 1) { data.push([]); } // First data row.
      if (datum === "sumAbove()") {
        let sum = Rnl.zero;
        for (const num of data[col]) {
          if (!isNaN(num)) {
            sum = Rnl.add(sum, Rnl.fromString(num));
          }
        }
        datum = String(Rnl.toNumber(sum));
      }
      data[col].push(datum);
      if (rowMap && col === 0) {
        rowMap[datum] = row - 1 - (gotUnits ? 1 : 0);
      }
    }
  };

  // With the closure out of the way, let's load in data.
  if (str.indexOf('"') === -1) {
    // There are no quotation marks in the string. Use splits.
    const lines = str.split(/\r?\n/g);
    for (const line of lines) {
      if (line.length > 0) {
        col = 0;
        const items = line.split(sepChar);
        for (const item of items) { harvest(item.trim()); col++; }
        row += 1;
      }
    }
    if (row === 3) { checkForUnitRow(); }

  } else {
    // The string contains at least one quotation mark, so we can't rely on splits.
    // Much of this section comes from https://stackoverflow.com/a/14991797
    let datum = "";
    let inQuote = false;  // true means we're inside a quoted field
    // iterate over each character, keep track of current row and column
    for (let c = 0; c < str.length; c++) {
      const cc = str[c];       // current character
      const nc = str[c + 1];   // next character

      // If the current character is a quotation mark, and we're inside a
      // quoted field, and the next character is also a quotation mark,
      // add a quotation mark to the current datum and skip the next character
      if (cc === '"' && inQuote && nc === '"') { datum += cc; ++c; continue; }

      // If it's just one quotation mark, begin/end quoted field
      if (cc === '"') { inQuote = !inQuote; continue; }

      // If it's a separator character and we're not in a quoted field, harvest the datum
      if (cc === sepChar && !inQuote) { harvest(datum); datum = ""; ++col; continue }

      // If it's a CRLF and we're not in a quoted field, skip the next character,
      // harvest the datum, and move on to the next row and move to column 0 of that new row
      if (cc === '\r' && nc === '\n' && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }

      // If it's a CR or LF and we're not in a quoted field, skip the next character,
      // harvest the datum, and move on to the next row and move to column 0 of that new row
      if (cc === "\n" && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }
      if (cc === "\r" && !inQuote) {
        harvest(datum); datum = ""; ++row; col = 0; ++c; continue
      }

      // Otherwise, append the current character to the current datum
      datum += cc;
    }
    if (datum.length > 0) { harvest(datum); }
    if (row === 2) { checkForUnitRow(); }
  }

  // Data is loaded in. Finish by determining the operand type of each column
  for (let j = 0; j < data.length; j++) {
    for (let i = 0; i < data[0].length; i++) {
      const datum = data[j][i];
      if (datum === "") { continue } // undefined datum.
      dtype.push(
        numberRegEx$1.test(datum)
        ? dt.RATIONAL + ((units.length > 0 && units[j].length > 0) ? dt.QUANTITY : 0)
        : (datum === "true" || datum === "false")
        ? dt.BOOLEAN
        : dt.STRING
      );
      break
    }
  }

  // Check if this data qualifies as a Hurmet Map.
  let isMap = false;
  if (data[0].length === 1 && Object.keys(unitMap).length === 0) {
    isMap = true;
    for (let i = 1; i < dtype.length; i++) {
      if (dtype[i] !== dtype[0]) { isMap = false; break }
    }
  }

  if (isMap) {
    const value = new Map();
    const keys = Object.keys(columnMap);
    for (let i = 0; i < keys.length; i++) {
      value.set(keys[i], valueFromDatum(data[i][0]));
    }
    return {
      value,
      unit: (dtype[0] === dt.RATIONAL ? allZeros : null),
      dtype: dt.MAP + dtype[0]
    }
  } else {
    return {
      value: { data, headings, columnMap, rowMap, units, dtype },
      unit: unitMap,
      dtype: dt.DATAFRAME
    }
  }
};

const dataFrameFromVectors = (vectors, vars) => {
  // Take an array of vectors and return a dataframe.
  const data = [];
  const headings = [];
  const columnMap = Object.create(null);
  const units = [];
  const dtype = [];
  const unitMap = Object.create(null);
  const rowMap = (vectors[0].name && vectors[0].name === "name") ? Object.create(null) : false;
  for (let j = 0; j < vectors.length; j++) {
    const vector = vectors[j];
    const vectorType = (vector.dtype & dt.ROWVECTOR)
      ? dt.ROWVECTOR
      : (vector.dtype & dt.COLUMNVECTOR)
      ? dt.COLUMNVECTOR
      : dt.ERROR;
    if (vectorType === dt.ERROR) { return errorOprnd("NOT_VECTOR") }
    headings.push(vector.name);
    columnMap[vector.name] = j;
    const colDtype = vector.dtype - vectorType;
    data.push(vector.value.map(e => datumFromValue(e, colDtype)));
    dtype.push(colDtype);
    if (vector.unit.name) {
      units.push(vector.unit.name);
      if (!unitMap[vector.unit.name]) {
        const unit = unitFromUnitName(vector.unit.name, vars);
        unitMap[vector.unit.name] = unit;
      }
    } else {
      units.push(null);
    }
    if (rowMap) {
      const nameVector = vectors[0].value;
      for (let i = 0; i < nameVector.length; i++) {
        rowMap[nameVector[i]] = i;
      }
    }
  }
  return {
    value: {
      data: data,
      headings: headings,
      columnMap: columnMap,
      rowMap: rowMap,
      units: units,
      dtype: dtype
    },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
};

const matrix2table = (matrix, rowNames, columnNames, vars) => {
  // Use the contents of a matrix to create a dataframe.
  const data = [];
  for (let i = 0; i <= matrix.value[0].length; i++) { data.push([]); }
  const headings = columnNames.value;
  headings.unshift("");
  const columnMap = Object.create(null);
  for (let i = 1; i < columnNames.value[0].length; i++) { columnMap[headings[i]] = i; }
  const colDtype = dt.RATIONAL + (matrix.unit ? dt.QUANTITY : 0);
  const dtype = Array(matrix.value[0].length).fill(colDtype);
  dtype.unshift(null);
  let units = [];
  const unitMap = Object.create(null);
  if (matrix.unit.name) {
    units = Array(matrix.value[0].length).fill(matrix.unit.name);
    units.unshift("");
    unitMap[matrix.unit.name] = unitFromUnitName(matrix.unit.name, vars);
  }

  const rowMap = Object.create(null);
  data[0] = rowNames.value;
  const formatSpec = vars.format ? vars.format.value : "h15";
  for (let i = 0; i < rowNames.value.length; i++) { rowMap[data[0][i]] = i; }
  for (let i = 0; i < matrix.value.length; i++) {
    for (let j = 0; j < matrix.value[0].length; j++) {
      const value = matrix.value[i][j];
      data[j + 1].push(format(value, formatSpec, "1000000."));
    }
  }

  return {
    value: { data, headings, columnMap, rowMap, units, dtype },
    unit: unitMap,
    dtype: dt.DATAFRAME
  }
};

const append = (o1, o2, vars, unitAware) => {
  // Append a vector to a dataframe.
  const oprnd = clone(o1); // We employ copy-on-write for data frames.
  const numRows = o1.value.data[0].length;
  if (numRows !== o2.value.length) { return errorOprnd("BAD_CONCAT") }
  oprnd.value.headings.push(o2.name);
  oprnd.value.columnMap[o2.name] = o1.value.headings.length - 1;
  const dtype = (o2.dtype & dt.COLUMNVECTOR)
    ? o2.dtype - dt.COLUMNVECTOR
    : o2.dtype - dt.ROWVECTOR;
  if (o2.unit.name && o2.unit.name.length > 0) {
    oprnd.value.units.push(o2.unit.name);
    const unit = unitFromUnitName(o2.unit.name, vars);
    if (!oprnd.unit[o2.unit.name]) {
      oprnd.unit[o2.unit.name] = unit;
    }
    if (unitAware) {
      const v = Matrix.convertFromBaseUnits(o2, unit.gauge, unit.factor);
      oprnd.value.data.push(v.map(e => datumFromValue(e, dtype)));
    } else {
      oprnd.value.data.push(o2.value.map(e => datumFromValue(e, dtype)));
    }
  } else {
    oprnd.value.units.push(null);
  }
  oprnd.value.dtype.push(dtype);
  return oprnd
};

const quickDisplay = str => {
  // This is called from the lexer for a display that changes with every keystroke.
  // It is a quick, rough approximation of a CSV parser.
  // I use this partly for speed, partly because it is more tolerant of badly formatted CSV
  // while the author is composing the CSV. This function doesn't spit up many error messages.
  // Final rendering of a data frame does not use this function.
  // Final rendering calls dataFrameFromCSV() and display() for accurate CSV parsing.
  if (str === "") { return "" }
  str = addTextEscapes(str.trim());
  const sepRegEx = str.indexOf("\t") > -1
    ? / *\t */g
    : / *\| */g;
  const lines = str.split(/\r?\n/g);
  let tex = "";
  if (lines.length < 3) {
    tex = "\\begin{matrix}\\text{";
    for (let i = 0; i < lines.length; i++) {
      tex += tablessTrim(lines[i]).replace(sepRegEx, "} & \\text{") + "} \\\\ \\text{";
    }
    tex = tex.slice(0, -10) + "\\end{matrix}";
  } else {
    tex = "\\begin{array}{l|cccccccccccccccccccccccc}\\text{";
    const cells = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      cells[i] = tablessTrim(lines[i]).split(sepRegEx);
    }

    let gotUnits = false;
    let gotAnswer = false;
    for (let j = 0; j < cells[1].length; j++) {
      if (numberRegEx$1.test(cells[1][j])) { gotAnswer = true; break }
    }
    if (!gotAnswer) {
      // line[1] had no numbers. If any numbers are ine line[2] then line[1] is units.
      for (let j = 0; j < cells[2].length; j++) {
        if (numberRegEx$1.test(cells[2][j])) { gotUnits = true; break }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      tex += tablessTrim(lines[i]).replace(sepRegEx, "} & \\text{");
      tex += ((gotUnits && i === 1) || (!gotUnits && i === 0))
        ? "} \\\\ \\hline \\text{"
        : "} \\\\ \\text{";
    }

    tex = tex.slice(0, -10) + "\\end{array}";
  }
  tex = tex.replace(/·/g, "$·$");
  return tex
};

// The next 40 lines contain helper functions for display().
const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/;
const accentRegEx$1 = /^([^\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]+)([\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1])(.+)?/;
const subscriptRegEx = /([^_]+)(_[^']+)?(.*)?/;
const accentFromChar = Object.freeze({
  "\u0300": "\\grave",
  "\u0301": "\\acute",
  "\u0302": "\\hat",
  "\u0303": "\\tilde",
  "\u0304": "\\bar",
  "\u0305": "\\bar",
  "\u0307": "\\dot",
  "\u0308": "\\ddot",
  "\u030A": "\\mathring",
  "\u030C": "\\check",
  "\u0332": "\\underline",
  "\u20d0": "\\overleftharpoon",
  "\u20d1": "\\overrightharpoon",
  "\u20d6": "\\overleftarrow",
  "\u20d7": "\\vec",
  "\u20e1": "\\overleftrightarrow"
});
const formatColumnName = str => {
  // We can't call parse(str) because that would be a circular dependency.
  // So this module needs its own function to format dataframe column names.
  if (!isValidIdentifier.test(str)) {
    return "\\text{" + addTextEscapes(str) + "}"
  } else {
    // Format it like a Hurmet identifier.
    str = str.replace(/′/g, "'"); // primes
    let parts = str.match(accentRegEx$1);
    if (parts) {
      str = accentFromChar[parts[2]] + "{" + parts[1] + "}";
      return str + (parts[3] ? parts[3] : "")
    } else {
      parts = str.match(subscriptRegEx);
      let result = parts[1].length > 1 ? `\\text{${parts[1]}}` : parts[1];
      if (parts[2]) {
        result += "_" + `\\text{${parts[2].slice(1)}}`;
      }
      return result + (parts[3] ? parts[3] : "")
    }
  }
};

const isNotEmpty = row => {
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== "" && row[i] !== null) { return true }
  }
  return false
};

const getNumInfo =  df => {
  // Gather info for in setting numbers on a decimal tab.
  const numCols = df.data.length;
  const colInfo = new Array(numCols);
  const cellInfo = new Array(numCols);
  for (let j = 0; j < numCols; j++) {
    if (df.dtype[j] & dt.RATIONAL) {
      colInfo[j] = { hasAlignChar: false, maxLenAfterAlignChar: 0 };
      cellInfo[j] = [];
      for (let i = 0; i < df.data[0].length; i++) {
        const datum = df.data[j][i];
        const pos = datum.indexOf(".");
        const hasAlignChar = pos > -1;
        const lenAfterAlignChar = hasAlignChar ? datum.length - pos - 1 : 0;
        cellInfo[j].push({ hasAlignChar, lenAfterAlignChar });
        if (hasAlignChar) {
          colInfo[j].hasAlignChar = true;
          if (lenAfterAlignChar > colInfo[j].maxLenAfterAlignChar) {
            colInfo[j].maxLenAfterAlignChar = lenAfterAlignChar;
          }
        }
      }
    }
  }
  return [colInfo, cellInfo]
};

const displayNum = (datum, colInfo, cellInfo, decimalFormat) => {
  let str = formattedDecimal(datum, decimalFormat);
  const n = colInfo.maxLenAfterAlignChar - cellInfo.lenAfterAlignChar;
  if (colInfo.hasAlignChar && (n > 0 || !cellInfo.hasAlignChar)) {
    str += "\\phantom{";
    if (colInfo.hasAlignChar && !cellInfo.hasAlignChar) {
      str += decimalFormat.slice(-1) === "." ? "." : "{,}";
    }
    if (n > 0) { str += "0".repeat(n); }
    str += "}";
  }
  return str
};

const totalRegEx = /^(?:total|sum)/i;

const display$2 = (df, formatSpec = "h3", decimalFormat = "1,000,000.", omitHeading = false) => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length;
  const numCols = df.data.length;
  const writeRowNums = numRows > 5 && !df.rowMap;
  const numColsInHeading = numCols + (writeRowNums ? 1 : 0);
  let str = "\\begin{array}{";
  str += df.rowMap
    ? "l|"
    : writeRowNums
    ? "r|"
    : "";
  for (let j = 1; j < numColsInHeading; j++) {
    str += (df.dtype[j] & dt.RATIONAL ? "r " : "l " );
  }
  str = str.slice(0, -1) + "}";

  if (!omitHeading) {
    // Write the column names
    if (writeRowNums) { str += "&"; }
    for (let j = 0; j < numCols; j++) {
      str += "{" + formatColumnName(df.headings[j]) + "}&";
    }
    str = str.slice(0, -1) + " \\\\ ";
  }

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (writeRowNums) { str += "&"; }
    for (let j = 0; j < numCols; j++) {
      let rowTex = "";
      if (df.units[j] && df.units[j].length > 0) {
        const unitTex = unitTeXFromString(df.units[j]);
        rowTex = unitTex.replace("\\;\\, ", "");
      } else {
        rowTex = "";
      }
      str += rowTex + "&";
    }
    str = str.slice(0, -1) + " \\\\ ";
  }
  str += "\\hline ";

  const [colInfo, cellInfo] = getNumInfo(df);

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (i === numRows - 1 && totalRegEx.test(df.data[0][i])) { str += "\\hline "; }
    if (writeRowNums) { str += String(i + 1) + " & "; }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i];
      str += mixedFractionRegEx.test(datum)
        ? format(Rnl.fromString(datum), formatSpec, decimalFormat) + "&"
        : numberRegEx$1.test(datum)
        ? displayNum(datum, colInfo[j], cellInfo[j][i], decimalFormat) + "&"
//        ? formattedDecimal(datum, decimalFormat) + "&"
        : datum === ""
        ? "&"
        : "\\text{" + addTextEscapes(datum) + "}&";
    }
    str = str.slice(0, -1) + " \\\\ ";
  }

  str = str.slice(0, -3).trim();
  str += "\\end{array}";
  return str
};

const displayAlt$1 = (df, formatSpec = "h3", omitHeading = false) => {
  if (df.data.length === 0) { return "" }
  const numRows = df.data[0].length;
  const numCols = df.data.length;
  const writeRowNums = numRows > 5 && !df.rowMap;
  let str = "``";

  if (!omitHeading) {
    // Write the column names
    if (writeRowNums) { str += "|"; }
    str += ( (df.headings[0] === "name" || df.headings[0] === "item")
      ? ""
      : df.headings[0]) + "|";
    for (let j = 1; j < numCols; j++) {
      str += df.headings[j] + "|";
    }
    str = str.slice(0, -1) + "\n";
  }

  // Write the unit names
  if (isNotEmpty(df.units)) {
    if (writeRowNums) { str += "|"; }
    for (let j = 0; j < numCols; j++) {
      str += df.units[j] + "|";
    }
    str = str.slice(0, -1) + "\n";
  }

  // Write the data
  for (let i = 0; i < numRows; i++) {
    if (writeRowNums) { str += String(i + 1) + "|"; }
    for (let j = 0; j < numCols; j++) {
      const datum = df.data[j][i];
      if (mixedFractionRegEx.test(datum)) {
        str += format(Rnl.fromString(datum), formatSpec, "100000.") + "|";
      } else {
        str += datum + "|";
      }
    }
    str = str.slice(0, -1) + "\n";
  }

  str = str.slice(0, -1).trim();
  str += "``";
  return str
};

const DataFrame = Object.freeze({
  append,
  dataFrameFromCSV,
  dataFrameFromVectors,
  matrix2table,
  display: display$2,
  displayAlt: displayAlt$1,
  quickDisplay,
  range
});

/*
 * This file deals with Hurmet maps, which are similar to hash maps.
 * In a map, every value is of the same data type and has the same unit-of-measure.
 */

const checkUnitEquality = (u1, u2) => {
  let x;
  let y;
  if (u1.expos && u2.expos) {
    x = u1.expos;
    y = u2.expos;
  } else {
    x = u1;
    y = u2;
  }
  if (Array.isArray(x)) {
    if (Array.isArray(y)) {
      if (x.length !== y.length) { return false }
      x.forEach((e, i) => { if (e !== y[i]) { return false } });
      return true
    } else {
      return false
    }
  } else {
    return x === y
  }
};

const append$1 = (o1, o2, shape1, shape2) => {
  let map;
  let scalar;
  if (o1.dtype & dt.MAP) {
    if (shape2 !== "scalar") { return errorOprnd("BAD_APPEND", shape2) }
    map = o1;
    scalar = o2;
  } else {
    if (shape1 !== "scalar") { return errorOprnd("BAD_APPEND", shape1) }
    map = o2;
    scalar = o1;
  }
  if (!(map.dtype & scalar.dtype)) { errorOprnd("MAP_APPEND"); }
  if (!checkUnitEquality(map.unit, scalar.unit)) { errorOprnd("UNIT_APEND"); }
  map.value.set(scalar.name, scalar.value);
  return map
};

const convertFromBaseUnits$1 = (map, gauge, factor) => {
  map = mapMap( map, value =>  Rnl.divide(value, factor));
  if (!Rnl.isZero(gauge)) {
    map = mapMap( map, value => Rnl.subtract(value, gauge));
  }
  return  map
};

const convertToBaseUnits$1 = (map, gauge, factor) => {
  if (!Rnl.isZero(gauge)) {
    map = mapMap(map, value => Rnl.add(value, gauge));
  }
  return mapMap(map, value => Rnl.multiply(value, factor))
};

const display$3 = (result, formatSpec, decimalFormat, omitHeading = false) => {
  const mapValue = result.value.plain ? result.value.plain : result.value;
  let topRow = "";
  let botRow = "";
  for (const [key, value] of mapValue.entries()) {
    topRow += formatColumnName(key) + " & ";
    botRow += format(value, formatSpec, decimalFormat) + " & ";
  }
  topRow = topRow.slice(0, -3);
  botRow = botRow.slice(0, -3);
  let str = "\\begin{array}{c}";
  if (!omitHeading) { str += topRow + " \\\\ \\hline "; }
  str += botRow + "\\end{array}";
  if (result.unit && result.unit.name) {
    str += "\\;" + unitTeXFromString(result.unit.name);
  }
  return str
};

const displayAlt$2 = (result, formatSpec, decimalFormat, omitHeading = false) => {
  const mapValue = result.value.plain ? result.value.plain : result.value;
  let topRow = "";
  let botRow = "";
  for (const [key, value] of mapValue.entries()) {
    topRow += key + ' | ';
    botRow += format(value, formatSpec, decimalFormat) + " | ";
  }
  topRow = topRow.slice(0, -3);
  botRow = botRow.slice(0, -3);
  let str = "``";
  if (!omitHeading) { str += topRow + "\n"; }
  str += botRow + "``";
  if (result.unit && result.unit.name) {
    str = `${str} '${result.unit.name}'`;
  }
  return str
};

const singleValueFromMap = (map, key, isNumeric, unitAware) => {
  if (!map.value.has(key)) { return errorOprnd("BAD_KEY", key) }
  const value = clone(map.value.get(key));
  if (!isNumeric) {
    return { value, unit: map.unit, dtype: map.dtype - dt.MAP }
  } else if (unitAware) {
    return { value, unit: { expos: map.unit.expos }, dtype: map.dtype - dt.MAP }
  } else {
    return { value, unit: allZeros, dtype: map.dtype - dt.MAP }
  }
};

const valueFromMap = (map, keys, unitAware) => {
  // Return the value of a map's key/value pair.
  // `keys` is an array.
  for (let j = 0; j < keys.length; j++) {
    if (keys[j].dtype === dt.RATIONAL) { return errorOprnd("NUM_KEY") }
    keys[j] = keys[j].value;
  }
  if (keys.length === 1) {
    const isNumeric = (map.dtype & dt.RATIONAL);
    const treatAsUnitAware = keys.length > 1 || unitAware;
    return singleValueFromMap(map, keys[0], isNumeric, treatAsUnitAware)
  } else {
    const value = new Map();
    for (let i = 0; i < keys.length; i++) {
      value.set(keys[i], map.value.get(keys[i]));
    }
    return { value, unit: map.unit, dtype: map.dtype }
  }
};

const map = Object.freeze({
  append: append$1,
  convertFromBaseUnits: convertFromBaseUnits$1,
  convertToBaseUnits: convertToBaseUnits$1,
  display: display$3,
  displayAlt: displayAlt$2,
  valueFromMap
});

/*
 * lexer.js
 * This file supports parser.js.
 */

// Define constants for token types.
const tt = Object.freeze({
  UNARY: 0, //  unary TeX function, e.g. \sqrt
  BINARY: 1, // binary TeX function, e.g. \xrightarrow, differs from tt.BIN
  SUB: 2,
  SUP: 3,
  ACCENT: 4,
  // A left paren or bracket, ( or [], will be made invisible if located
  // directly after a token whose token type < 5.
  UNARYMINUS: 5,
  DIV: 6, //    stacked division: / \atop
  PRIME: 7,
  CURRENCY: 8, // currency symbol: $,£,¥,€, etc. Precedes its number.
  ORD: 9,
  VAR: 10,   // variable name, one letter long
  NUM: 11,
  SPACE: 12,
  LONGVAR: 13,
  LEFTBRACKET: 14,
  RIGHTBRACKET: 15,
  UNDEROVER: 16,
  LEFTRIGHT: 17, //   |
  STRING: 18,
  UNIT: 19, //    unit-of-measure, e.g., 'meters' or °
  BIN: 20, //     binary infix operators that render but don't calculate, e.g., ± \cdots
  ADD: 21, //     binary infix addition or subtraction operator: + -
  MULT: 22, //    binary infix multiplication or division operator: × * · // ÷
  REL: 23, //     relational operator:  ≟ > < ≤ ≥ etc.
  LOGIC: 24, //   if and or xor else otherwise
  SEP: 25, //     argument separators, cell separators and row separators: , ;
  FUNCTION: 26,
  ACCESSOR: 28, //   dot between a data frame name and a property, as in r.prop
  ENVIRONMENT: 29,
  FACTORIAL: 30,
  SUPCHAR: 31,
  ANGLE: 32,
  ELLIPSIS: 33, //       separator for ranges (1:n)
  KEYWORD: 34, //     keywords: for in while
  PROPERTY: 36, //    property name after a dot accessor
  COMMENT: 37,
  RETURN: 38,  // A return statement inside a user-defined function.
  TO: 39,
  DATAFRAME: 40,
  RICHTEXT: 41
});

const minusRegEx = /^-(?![-=<>:])/;
const numberRegEx$2 = new RegExp(Rnl.numberPattern);
const unitRegEx = /^(?:'[^']+'|[°ΩÅK])/;

const texFromNumStr = (numParts, decimalFormat) => {
  let num = "";
  if (numParts[2]) {
    // Hexadecimal
    num = "\\mathrm{" + numParts[2] + "}";
  } else if (numParts[5]) {
    return texFromMixedFraction(numParts)
  } else {
    // Decimal
    num = numParts[3];
    if (numParts[6]) { num += "." + numParts[6]; }
    num = formattedDecimal(num, decimalFormat);
    if (numParts[8]) {
      num += "\\%";
    } else if (numParts[7]) {
      if (numParts[7].charAt(0) === "-") {
        num += "\\text{e-}" + numParts[7].slice(1);
      } else {
        num += "\\text{e}" + numParts[7];
      }
    }
  }
  if (numParts[1]) {
    num = "\\text{-}" + num;
  }
  return num
};

const isUnary = (prevToken) => {
  switch (prevToken.ttype) {
    case tt.NUM:
    case tt.ORD:
    case tt.VAR:
    case tt.RIGHTBRACKET:
    case tt.LONGVAR:
    case tt.CURRENCY:
    case tt.SUPCHAR:
    case tt.PRIME:
    case tt.FACTORIAL:
      return false
    default:
      return true
  }
};

const wordRegEx = /^(?:(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf\udd38-\udd50]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*|!in|-->|->|left\.|right\.|log10|log2)/;

const words = Object.freeze({
  //       input,    tex output,               type, closeDelim
  "true": ["true", "\\mathord{\\text{true}}", tt.ORD, ""],
  "false": ["false", "\\mathord{\\text{false}}", tt.ORD, ""],
  j: ["j", "j", tt.ORD, ""],
  cos: ["cos", "\\cos", tt.FUNCTION, ""],
  cosd: ["cosd", "\\operatorname{\\cos_d}", tt.FUNCTION, ""],
  if: ["if", "\\mathrel{\\mathrm{if}}", tt.LOGIC, ""],
  else: ["else", "\\mathrel{\\mathrm{else}}", tt.LOGIC, ""],
  and: ["and", "\\mathrel{\\mathrm{and}}", tt.LOGIC, ""],
  or: ["or", "\\mathrel{\\mathrm{or}}", tt.LOGIC, ""],
  for: ["for", "\\mathrel{\\mathrm{for}}", tt.KEYWORD, ""],
  while: ["while", "\\mathrel{\\mathrm{while}}", tt.KEYWORD, ""],
  in: ["in", "\\mathrel{\\mathrm{in}}", tt.KEYWORD, ""],
  break: ["break", "\\mathrel{\\mathrm{break}}", tt.KEYWORD, ""],
  to: ["to", "\\mathbin{\\mathrm{to}}", tt.TO, "" ],
  raise: ["raise", "\\mathrel{\\mathrm{raise}}", tt.UNARY, ""],
  echo: ["echo", "\\mathrel{\\mathrm{echo}}", tt.UNARY, ""],
  return: ["return", "\\mathrel{\\mathrm{return}}", tt.RETURN, ""],
  sqrt: ["sqrt", "\\sqrt", tt.UNARY, ""],
  otherwise: ["otherwise", "\\mathrel{\\mathrm{otherwise}}", tt.LOGIC, ""],
  root: ["root", "\\sqrt", tt.BINARY, ""],
  sin: ["sin", "\\sin", tt.FUNCTION, ""],
  sind: ["sind", "\\operatorname{\\sin_d}", tt.FUNCTION, ""],
  tan: ["tan", "\\tan", tt.FUNCTION, ""],
  tand: ["tand", "\\operatorname{\\tan_d}", tt.FUNCTION, ""],
  cotd: ["cotd", "\\operatorname{\\cot_d}", tt.FUNCTION, ""],
  secd: ["secd", "\\operatorname{\\sec_d}", tt.FUNCTION, ""],
  cscd: ["cscd", "\\operatorname{\\csc_d}", tt.FUNCTION, ""],
  log: ["log", "\\log", tt.FUNCTION, ""],
  ln: ["ln", "\\ln", tt.FUNCTION, ""],
  log10: ["log10", "\\log_{10}", tt.FUNCTION, ""],
  log2: ["log2", "\\log_{2}", tt.FUNCTION, ""],
  "log!": ["log!", "\\operatorname{log!}", tt.FUNCTION, ""],

  π: ["π", "π", tt.ORD, ""],
  "ℓ": ["ℓ", "ℓ", tt.VAR, ""],
  modulo: ["modulo", "\\operatorname{modulo}", tt.MULT, ""],
  // A few arrows are placed here to give them priority over other arrows
  "->": ["->", "\u2192", tt.REL, ""], // right arrow
  "-->": ["-->", "\\xrightarrow", tt.UNARY, ""],
  "<-->": ["<-->", "\\xrightleftarrows", tt.UNARY, ""]
});

const miscRegEx = /^([/÷\u2215_:,;^+\\\-–−*×∘⊗⦼⊙√∛∜·.%∘|╏‖¦><=≈≟≠≡≤≥≅∈∉⊂⊄⊆⊈!¡‼¬∧∨⊻~#?⇒⟶⟵→←&@′″∀∃∫∬∮∑([{⟨⌊⎿⌈⎾〖〗⏋⌉⏌⌋⟩}\])˽∣ℂℕℚℝℤℓℏ∠¨ˆˉ˙˜▪✓\u00A0\u20D7$£¥€₨₩₪]+)/;

const miscSymbols = Object.freeze({
  //    input, output, type,  closeDelim
  "#": ["#", "#", tt.COMMENT, ""],
  "/": ["/", "\\dfrac{", tt.DIV, ""],   // displaystyle fraction
  "//": ["//", "\\tfrac{", tt.DIV, ""], // textstyle fraction
  "///": ["///", "/", tt.MULT, ""],     // inline (shilling) fraction
  "\u2215": ["\u2215", "\u2215", tt.MULT, ""], // inline (shilling) fraction
  "÷": ["÷", "÷", tt.MULT, ""],
  "_": ["_", "_", tt.SUB, ""],
  "^": ["^", "^", tt.SUP, ""],
  "+": ["+", "+", tt.ADD, ""],
  "-": ["-", "-", tt.ADD, ""],
  "–": ["-", "-", tt.ADD, ""], // \u2013 en dash
  "−": ["-", "-", tt.ADD, ""], // \u2212 math minus
  "*": ["*", "*", tt.MULT, ""],
  "×": ["×", "×", tt.MULT, ""],
  "∘": ["∘", "\\circ", tt.MULT, ""], // U+2218
  "⊗": ["⊗", "⊗", tt.MULT, ""],
  "√": ["√", "\\sqrt", tt.UNARY, ""],
  "\u221B": ["\u221B", "\\sqrt[3]", tt.UNARY, ""],
  "\u221C": ["\u221C", "\\sqrt[4]", tt.UNARY, ""],
  "+-": ["+-", "\u00B1", tt.BIN, ""],
  "**": ["**", "\\star", tt.BIN, ""],
  "·": ["·", "\u22C5", tt.MULT, ""], // dot operator
  "...": ["...", "\\dots", tt.ORD, ""],
  "%": ["%", "\\%", tt.FACTORIAL, ""],
  "^*": ["^*", "^*", tt.FACTORIAL, ""],
  "-:": ["-:", "÷", tt.MULT, ""],
  "=": ["=", "=", tt.REL, ""],
  "≈": ["≈", "≈", tt.REL, ""],
  "==": ["==", "==", tt.REL, ""],
  "≡": ["≡", "≡", tt.REL, ""],
  ">": [">", "\\gt", tt.REL, ""],
  "<": ["<", "\\lt", tt.REL, ""],
  "?=": ["?=", "\u225F", tt.REL, ""],
  "≟": ["≟", "\u225F", tt.REL, ""],
  "≠": ["≠", "≠", tt.REL, ""],
  "!=": ["!=", "≠", tt.REL, ""],
  "<>": ["<>", "≠", tt.REL, ""],
  ":=": [":=", "\u2254", tt.REL, ""],
  "<=": ["<=", "≤", tt.REL, ""],
  "≤": ["≤", "≤", tt.REL, ""],
  ">=": [">=", "\u2265", tt.REL, ""],
  "≥": ["≥", "≥", tt.REL, ""],
  "-=": ["-=", "\u2261", tt.REL, ""],
  "~=": ["~=", "\u2245", tt.REL, ""],
  "≅": ["≅", "≅", tt.REL, ""],
  "~~": ["~~", "\u2248", tt.REL, ""],
  "~": ["~", "\\sim", tt.REL, ""],
  "=>": ["=>", "\u21D2", tt.REL, ""],
  "⟶": ["⟶", "\\xrightarrow", tt.UNARY, ""],
  "⟵": ["⟵", "\\xleftarrow", tt.UNARY, ""],
  "⇒": ["⇒", "\u21D2", tt.REL, ""],
  "<=>": ["<=>", "\u21D4", tt.REL, ""],
  "-<": ["-<", "\u227A", tt.REL, ""],
  ">-": [">-", "\u227B", tt.REL, ""],
  "-<=": ["-<=", "\u2AAF", tt.REL, ""],
  ">-=": [">-=", "\u2AB0", tt.REL, ""],
  "_|_": ["_|_", "\\bot", tt.REL, ""],
  "|--": ["|--", "\u22A2", tt.REL, ""],
  "|==": ["|==", "\\models", tt.REL, ""],
  "∈": ["∈", "∈", tt.REL, ""],
  "∉": ["∉", "∉", tt.REL, ""],
  "⊆": ["⊆", "⊆", tt.REL, ""],
  "⊈": ["⊈", "⊈", tt.REL, ""],
  "▪": ["▪", "\\mathrel{▪}", tt.REL, ""],

  "!": ["!", "!", tt.FACTORIAL, ""],
  "‼": ["‼", "!!", tt.FACTORIAL, ""],
  "!!": ["!!", "!!", tt.FACTORIAL, ""],
  "¡": ["¡", "¡", tt.FACTORIAL, ""],
  "&": ["&", "\\mathbin{\\&}", tt.ADD, ""], // string concatenator
  "&_": ["&_", "\\mathbin{\\underline{\\&}}", tt.ADD, ""], // concatenate to bottom
  "′": ["′", "'", tt.PRIME, ""],
  "″": ["″", "''", tt.PRIME, ""],
  "′′": ["′′", "''", tt.PRIME, ""],
  "′′′": ["′′′", "'''", tt.PRIME, ""],

  "∀": ["∀", "∀", tt.LOGIC, ""],
  "∃": ["∃", "∃", tt.LOGIC, ""],
  "∧": ["∧", "∧", tt.LOGIC, ""],
  "∨": ["∨", "∨", tt.LOGIC, ""],
  "⊻": ["⊻", "⊻", tt.LOGIC, ""], // xor
  "¬": ["¬", "¬", tt.UNARY, ""], // logical not
  // calculations do not use a ":"" token. But LOGIC is the right precedence for display.
  ":": [":", ":", tt.LOGIC, ""],

  "\u222B": ["\u222B", "\u222B", tt.UNDEROVER, ""], // \int
  "\u222C": ["\u222C", "\u222C", tt.UNDEROVER, ""], // \iint
  "\u222E": ["\u222E", "\u222E", tt.UNDEROVER, ""], // \oint
  "\u2211": ["\u2211", "\u2211", tt.UNDEROVER, ""], // \sum

  "(": ["(", "(", tt.LEFTBRACKET, ")"],
  "[": ["[", "[", tt.LEFTBRACKET, "]"],
  "{": ["{", "\\{", tt.LEFTBRACKET, "\\}"],
  "{:": ["{:", "{", tt.LEFTBRACKET, "}"],
  "⟨": ["⟨", "⟨", tt.LEFTBRACKET, "⟩"],
  ")": [")", ")", tt.RIGHTBRACKET, ""],
  "]": ["]", "]", tt.RIGHTBRACKET, ""],
  "}": ["}", "\\}", tt.RIGHTBRACKET, ""],
  "⟩": ["⟩", "⟩", tt.RIGHTBRACKET, ""],
  ":}": [":}", "}", tt.RIGHTBRACKET, ""],
  "|": ["|", "|", tt.LEFTRIGHT, ""],
  "||": ["||", "\\Vert ", tt.LEFTRIGHT, ""],
  "‖": ["‖", "\\Vert ", tt.LEFTRIGHT, ""],
  "<<": ["<<", "\u27E8", tt.LEFTBRACKET, "\u27E9"],
  ">>": [">>", "\u27E9", tt.RIGHTBRACKET, ""],
  "\u23BF": ["\u23BF", "\\lfloor ", tt.LEFTBRACKET, "\\rfloor "],
  "\u230B": ["\u230B", "\\rfloor ", tt.RIGHTBRACKET, ""],
  "\u23CC": ["\u23CC", "\\rfloor ", tt.RIGHTBRACKET, ""],
  "\u2308": ["\u2308", "\\lceil ", tt.LEFTBRACKET, "\\rceil "],
  "\u23BE": ["\u23BE", "\\lceil ", tt.LEFTBRACKET, "\\rceil "],
  "\u2309": ["\u2309", "\\rceil ", tt.RIGHTBRACKET, ""],
  "\u23CB": ["\u23CB", "\\rceil ", tt.RIGHTBRACKET, ""],
  "\u3016": ["\u3016", "{", tt.LEFTBRACKET, "}"],
  "\u3017": ["\u3017", "}", tt.RIGHTBRACKET, ""],
  "¦": ["¦", "\\mid ", tt.REL, ""],

  // double-struck, i.e. blackboard bold
  "ℂ": ["ℂ", "\u2102", tt.ORD, ""],
  "ℕ": ["ℕ", "\u2115", tt.ORD, ""],
  "ℚ": ["ℚ", "\u211A", tt.ORD, ""],
  "ℝ": ["ℝ", "\u211D", tt.ORD, ""],
  "ℤ": ["ℤ", "\u2124", tt.ORD, ""],

  "ℏ": ["ℏ", "ℏ", tt.ORD, ""],

  //arrows
  "\u2192": ["\u2192", "\u2192", tt.REL, ""],
  "\u2190": ["\u2190", "\u2190", tt.REL, ""], // left arrow
  ">->": [">->", "\u21a3", tt.REL, ""], // \rightarrowtail
  "->>": ["->>", "\u21a0", tt.REL, ""], // \twoheadrightarrow
  "|->": ["|->", "\u21a6", tt.REL, ""], // \mapsto

  // extensible arrows
  "<--": ["<--", "\\xleftarrow", tt.UNARY, ""],
  "==>": ["==>", "\\xRightarrow", tt.UNARY, ""],
  "<==": ["<==", "\\xLeftarrow", tt.UNARY, ""],
  "<-->": ["<-->", "\\xleftrightarrow", tt.UNARY, ""],
  "<==>": ["<==>", "\\xLeftrightarrow", tt.UNARY, ""],

  "\u2220": ["\u2220", "\u2220", tt.ANGLE, ""],
  "✓": ["✓", "✓", tt.ORD, ""],
  "˽": ["˽", "~", tt.SPACE, ""],  // "~" is a no-break space in LaTeX.
  "\\,": ["\\,", ",\\:", tt.SEP, ""], // escape character to enable non-matrix comma in parens
  "\\;": ["\\;", ";\\:", tt.SEP, ""],
  "…": ["…", "…", tt.ORD, ""],

  "..": ["..", "..", tt.RANGE, ""], // range separator
  ",": [",", ",\\:", tt.SEP, ""], // function argument separator
  ";": [";", ";\\:", tt.SEP, ""], // row separator

  "$": ["$", "\\$", tt.CURRENCY, ""],
  "£": ["£", "£", tt.CURRENCY, ""],
  "¥": ["¥", "¥", tt.CURRENCY, ""],
  "€": ["€", "€", tt.CURRENCY, ""],
  "₨": ["₨", "₨", tt.CURRENCY, ""],
  "₩": ["₩", "₩", tt.CURRENCY, ""],
  "₪": ["₪", "₪", tt.CURRENCY, ""]
});

const texFunctionRegEx = /^(\\[A-Za-z]+\.?|\\([:.!\u0020]|'+))/;

const texFunctions = Object.freeze({
  //          input,    output,  type,  closeDelim
  "\\aleph": ["\\aleph", "\u2135", tt.VAR, ""],
  "\\beth": ["\\beth", "\u2136", tt.VAR, ""],
  "\\gimel": ["gimel", "\u2137", tt.VAR, ""],
  "\\daleth": ["daleth", "\u2138", tt.VAR, ""],
  "\\atop": ["\\atop", "\\atop{", tt.DIV, ""],
  "\\cdots": ["\\cdots", "\u22ef", tt.BIN, ""],
  "\\vdots": ["\\vdots", "\u22ee", tt.BIN, ""],
  "\\ddots": ["\\ddots", "\u22f1", tt.BIN, ""],
  "\\iff": ["\\iff", "\\iff", tt.LOGIC, ""],
  "\\land": ["\\land", "\\land", tt.BIN, ""],
  "\\lor": ["\\lor", "\\lor", tt.BIN, ""],
  "\\in": ["\\in", "∈", tt.REL, ""],
  "\\notin": ["\\notin", "∉", tt.REL, ""],
  "\\subset": ["\\subset", "⊂", tt.REL, ""],
  "\\subseteq": ["\\subseteq", "⊆", tt.REL, ""],
  "\\nsubset": ["\\nsubset", "⊄", tt.REL, ""],
  "\\nsubseteq": ["\\nsubseteq", "⊈", tt.REL, ""],
  "\\left.": ["\\left.", "\\left.", tt.LEFTBRACKET, "\\right."],
  "\\right.": ["\\right.", "\\right.", tt.RIGHTBRACKET, ""],
  "\\mod": ["\\mod", "\\mod", tt.BIN, ""],
  "\\diamond": ["\\diamond", "\\diamond", tt.ORD, ""],
  "\\square": ["\\square", "\\square", tt.ORD, ""],
  "\\int": ["\\int", "\\int", tt.UNDEROVER, ""],
  "\\iint": ["\\iint", "\\iint", tt.UNDEROVER, ""],
  "\\iiint": ["\\iiint", "\\iiint", tt.UNDEROVER, ""],
  "\\oint": ["\\oint", "\\oint", tt.UNDEROVER, ""],
  "\\oiint": ["\\oiint", "\\oiint", tt.UNDEROVER, ""],
  "\\oiiint": ["\\oiiint", "\\oiiint", tt.UNDEROVER, ""],
  "\\over": ["\\over", "\\dfrac{", tt.DIV],
  "\\sum": ["\\sum", "\\sum", tt.UNDEROVER, ""],
  "\\prod": ["\\prod", "\\prod", tt.UNDEROVER, ""],
  "\\quad": ["\\quad", "\\quad", tt.SPACE, ""],
  "\\qquad": ["\\qquad", "\\qquad", tt.SPACE, ""]
});

const accents$1 = Object.freeze([
  "Bbb",
  "Overrightarrow",
  "acute",
  "bar",
  "bm",
  "bold",
  "boldsymbol",
  "breve",
  "check",
  "ddot",
  "dot",
  "frak",
  "grave",
  "hat",
  "mathbb",
  "mathbf",
  "mathcal",
  "mathfrak",
  "mathit",
  "mathnormal",
  "mathring",
  "mathrm",
  "mathscr",
  "mathsf",
  "mathtt",
  "overbrace",
  "overgroup",
  "overleftarrow",
  "overleftharpoon",
  "overleftrightarrow",
  "overline",
  "overrightarrow",
  "overrightharpoon",
  "tilde",
  "underbrace",
  "undergroup",
  "underleftarrow",
  "underleftrightarrow",
  "underline",
  "underrightarrow",
  "utilde",
  "vec",
  "widecheck",
  "widehat",
  "widetilde"
]);

// Avoid "operatorname" for functions that are already math operators.
const mathOperators = Object.freeze([
  "arccos",
  "arcsin",
  "arctan",
  "arctg",
  "arcctg",
  "cos",
  "cosec",
  "cosh",
  "cot",
  "cotg",
  "coth",
  "csc",
  "ctg",
  "cth",
  "det",
  "dim",
  "exp",
  "gcd",
  "lg",
  "lim",
  "ln",
  "log",
  "max",
  "min",
  "sec",
  "sin",
  "sinh",
  "sh",
  "sqrt",
  "sup",
  "tan",
  "tanh",
  "tg",
  "th"
]);

const colors = Object.freeze([
  "blue",
  "gray",
  "green",
  "orange",
  "pink",
  "purple",
  "red"
]);

const unaries = Object.freeze([
  "bcancel",
  "boxed",
  "cancel",
  // Hurmet does not support \ce.
  "clap",
  "color",
  "llap",
  "mathclap",
  "not",
  "operatorname",
  "phantom",
  "pu",
  "rlap",
  "sout",
  "sqrt",
  "tag",
  "textbf",
  "textit",
  "textmd",
  "textnormal",
  "textrm",
  "textsc",
  "textsf",
  "texttt",
  "textup",
  "xLeftarrow",
  "xLeftrightarrow",
  "xRightarrow",
  "xcancel",
  "xleftarrow",
  "xleftrightarrow",
  "xleftharpoondown",
  "xleftharpoons",
  "xleftharpoonup",
  "xlongequal",
  "xmapsto",
  "xrightarrow",
  "xrightharpoondown",
  "xrightharpoonup",
  "xrightleftarrows",
  "xrightleftharpoons",
  "xtofrom",
  "xtwoheadleftarrow",
  "xtwoheadrightarrow"
]);

const binaries = Object.freeze([
  "dfrac",
  "frac",
  "lower",
  "overset",
  "raisebox",
  "stackrel",
  "tag",
  "tfrac",
  "underset"
]);

const texREL = Object.freeze([
  "Bumpeq", "Colonapprox", "Coloneq", "Coloneqq", "Colonsim", "Darr", "Doteq", "Downarrow",
  "Eqcolon", "Eqqcolon", "Harr", "Larr", "Leftarrow", "Leftrightarrow", "Lleftarrow",
  "Longleftarrow", "Longleftrightarrow", "Longrightarrow", "Lrarr", "Lsh", "Rarr",
  "Rightarrow", "Rrightarrow", "Rsh", "Supset", "Subset", "Uarr", "Uparrow", "Updownarrow",
  "Vdash", "Vvdash", "approx", "approxeq", "asymp", "backepsilon", "backsim", "backsimeq",
  "between", "bowtie", "bumpeq", "circeq", "circlearrowleft", "circlearrowright",
  "colonapprox", "coloneq", "coloneqq", "colonsim", "cong", "curlyeqprec", "curlyeqsucc",
  "curvearrowleft", "curvearrowright", "dArr", "darr", "dashleftarrow", "dashrightarrow",
  "dashv", "dblcolon", "doteq", "doteqdot", "downarrow", "downdownarrows", "downharpoonleft",
  "downharpoonright", "eqcirc", "eqcolon", "eqqcolon", "eqsim", "eqslantgtr", "eqslantless",
  "equiv", "fallingdotseq", "frown", "ge", "geq", "geqq", "geqslant", "gets", "gg", "ggg",
  "gggtr", "gnapprox", "gneq", "gneqq", "gnsim", "gt", "gtrapprox", "gtreqless", "gtreqqless",
  "gtrless", "gtrsim", "gvertneqq", "hArr", "harr", "hookleftarrow", "hookrightarrow", "iff",
  "impliedby", "implies", "in", "isin", "Join", "gets", "impliedby", "implies", "in", "isin",
  "lArr", "larr", "le", "leadsto", "leftarrow", "leftarrowtail", "leftharpoondown",
  "leftharpoonup", "leftleftarrows", "leftrightarrow", "leftrightarrows", "leftrightharpoons",
  "leftrightsquigarrow", "leq", "leqq", "leqslant", "lessapprox", "lesseqgtr", "lesseqqgtr",
  "lessgtr", "lesssim", "ll", "lll", "llless", "lnapprox", "lneq", "lneqq", "lnsim",
  "longleftarrow", "longleftrightarrow", "longmapsto", "longrightarrow", "looparrowleft",
  "looparrowright", "lrArr", "lrarr", "lt", "lvertneqq", "mapsto", "mid", "models",
  "multimap", "nLeftarrow", "nLeftrightarrow", "nRightarrow", "nVDash", "nVdash", "ncong",
  "ne", "nearrow", "neq", "nexists", "ngeq", "ngeqq", "ngeqslant", "ngtr", "ni", "nleftarrow",
  "nleftrightarrow", "nleq", "nleqq", "nleqslant", "nless", "nmid", "notin", "notni",
  "nparallel", "nprec", "npreceq", "nrightarrow", "nshortmid", "nshortparallel", "nsim",
  "nsubseteq", "nsubseteqq", "nsucc", "nsucceq", "nsupseteq", "nsupseteqq", "ntriangleleft",
  "ntrianglelefteq", "ntriangleright", "ntrianglerighteq", "nvDash", "nvdash", "nwarrow",
  "owns", "parallel", "perp", "pitchfork", "prec", "precapprox", "preccurlyeq", "preceq",
  "precnapprox", "precneqq", "precnsim", "precsim", "propto", "rArr", "rarr", "restriction",
  "rightarrow", "rightarrowtail", "rightharpoondown", "rightharpoonup", "rightleftarrows",
  "rightleftharpoons", "rightrightarrows", "rightsquigarrow", "risingdotseq", "searrow",
  "shortmid", "shortparallel", "sim", "simeq", "smallfrown", "smallsmile", "smile",
  "sqsubset", "sqsubseteq", "sqsupset", "sqsupseteq", "sub", "sube",
  "subseteqq", "subsetneq", "subsetneqq", "succ", "succapprox", "succcurlyeq", "succeq",
  "succnapprox", "succneqq", "succnsim", "succsim", "supe", "supset", "supseteq", "supseteqq",
  "supsetneq", "supsetneqq", "swarrow", "thickapprox", "thicksim", "to", "trianglelefteq",
  "triangleq", "trianglerighteq", "twoheadleftarrow", "twoheadrightarrow", "uArr", "uarr",
  "uparrow", "updownarrow", "upharpoonleft", "upharpoonright", "upuparrows", "varpropto",
  "varsubsetneq", "varsubsetneqq", "varsupsetneq", "varsupsetneqq", "vartriangle",
  "vartriangleleft", "vartriangleright", "vcentcolon", "vdash", "vDash"
]);

const superRegEx = /^⁻?[²³¹⁰⁴⁵⁶⁷⁸⁹]+/;

const cloneToken = tkn => [tkn[0], tkn[1], tkn[2], tkn[3]];

const accentFromChar$1 = Object.freeze({
  "\u0300": "\\grave",
  "\u0301": "\\acute",
  "\u0302": "\\hat",
  "\u0303": "\\tilde",
  "\u0304": "\\bar",
  "\u0305": "\\bar",
  "\u0307": "\\dot",
  "\u0308": "\\ddot",
  "\u030A": "\\mathring",
  "\u030C": "\\check",
  "\u0332": "\\underline",
  "\u20d0": "\\overleftharpoon",
  "\u20d1": "\\overrightharpoon",
  "\u20d6": "\\overleftarrow",
  "\u20d7": "\\vec",
  "\u20e1": "\\overleftrightarrow"
});

const wideAccentFromChar = Object.freeze({
  "\u0300": "\\grave",
  "\u0301": "\\acute",
  "\u0302": "\\widehat",
  "\u0303": "\\widetilde",
  "\u0304": "\\overline",
  "\u0305": "\\overline",
  "\u0307": "\\dot",
  "\u0308": "\\ddot",
  "\u030A": "\\mathring",
  "\u030C": "\\check",
  "\u0332": "\\underline",
  "\u20d0": "\\overleftharpoon",
  "\u20d1": "\\overrightharpoon",
  "\u20d6": "\\overleftarrow",
  "\u20d7": "\\overrightarrow",
  "\u20e1": "\\overleftrightarrow"
});

const groupSubscript = word => {
  const pos = word.indexOf("_");
  return pos === -1
    ? word
    : word.slice(0, pos + 1) + "{" + word.slice(pos + 1) + "}"
};

const checkForTrailingAccent = word => {
  const ch = word.slice(-1);
  if (/[\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]/.test(ch)) {
    word = word.slice(0, -1);
    return word === "i"
      ? accentFromChar$1[ch] + "{ı}"  // dotless i
      : word === "j"
      ? accentFromChar$1[ch] + "{ȷ}"  // dotless j
      : word.length === 1
      ? accentFromChar$1[ch] + "{" + word + "}"
      : wideAccentFromChar[ch] + "{" + word + "}"
  } else {
    return word
  }
};

const lexOneWord = (str, prevToken) => {
  const matchObj = wordRegEx.exec(str);
  if (matchObj) {
    let match = matchObj[0].replace(/_*$/, ""); // drop trailing underscores

    // Get the immediately following character
    const fc = str.charAt(match.length);

    const word = words[match];
    if (word && fc !== "′") {
      return word
    } else if (/^\(/.test(fc)) {
      // word is followed by an open paren. Treat it as a function name
      return (prevToken.ttype === tt.ACCENT)
        ? [match, match + "}{", tt.FUNCTION, ""]
        : match === "sqrt"
        ? [match, "\\sqrt", tt.UNARY, ""]
        : match === "f"
        ? [match, match, tt.FUNCTION, ""]
        : isIn(match, mathOperators)
        ? [match, "\\" + match, tt.FUNCTION, ""]
        : [match, "\\operatorname{" + groupSubscript(match) + "}", tt.FUNCTION, ""]
    } else if (prevToken.ttype === tt.ACCESSOR) {
      return [match, match, tt.PROPERTY, ""]
    } else if (/[_\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]/.test(match)) {
      let identifier = "";
      if (match.indexOf("_") === -1) {
        identifier = checkForTrailingAccent(match);
        return [match, identifier, (match.length > 2) ? tt.LONGVAR : tt.VAR, ""]
      } else {
        const segments = match.split("_");
        for (let i = segments.length - 1; i >= 0; i--) {
          segments[i] = checkForTrailingAccent(segments[i]);
          if (i > 0) {
            segments[i] = "_\\text{" + segments[i] + "}";
          }
        }
        identifier = segments.join("");
        const primes = /^′*/.exec(str.slice(match.length));
        if (primes) {
          match += primes[0];
          identifier += "'".repeat(primes[0].length);
        }
        const pos = identifier.indexOf("_");
        if (pos > -1) {
          // Cramp subscript placement by wrapping it with braces.
          // This helps Cambria Math to supply the correct size radical.
          identifier = identifier.slice(0, pos) + "{" + identifier.slice(pos) + "}";
        }
        return [match, identifier, (segments[0].length > 1) ? tt.LONGVAR : tt.VAR, ""]
      }
    } else if (match.length === 2 & match.charAt(0) === "\uD835") {
      return [match, match, tt.VAR, ""]
    } else if (match.length > 1) {
      return [match, match, tt.LONGVAR, ""]
    } else {
      // Return a single character variable name
      if (match.charAt(0) === "\uD835") {
        return [match.substring(0, 2), match.substring(0, 2), tt.VAR, ""]
      } else {
        return [match.charAt(0), match.charAt(0), tt.VAR, ""]
      }
    }
  }
};

const lex = (str, decimalFormat, prevToken, inRealTime = false) => {
  // Get the next token in str. Return an array with the token's information:
  // [input, TeX output, type, associated close delimiter]
  let pos = 0;
  let st = "";
  let matchObj;

  if (str.charAt(0) === '"') {
    // String between double quotation marks. Parser will convert it to \text{…}
    pos = str.indexOf('"', 1);
    if (pos > 0) {
      // Disallow \r or \n by truncating the string.
      st = str.substring(1, pos).replace(/\r?\n.*/, "");
      return ['"' + st + '"', st, tt.STRING, ""]
    } else {
      return [str, str.replace(/\r?\n.*/, ""), tt.STRING, ""]
    }
  }

  if (/^#/.test(str)) {
    // comment
    st = str.slice(2);
    pos = st.indexOf("\n");
    if (pos > -1) {
      const posReturn = st.indexOf("\n");
      if (posReturn > -1 && posReturn < pos) { pos = posReturn; }
    }
    if (pos > -1) {
      st = st.slice(0, pos);
    }
    return [`#${st}`, `\\text{\\texttt{ \\#${st}}}`, tt.COMMENT, ""]
  }

  if (/^``/.test(str)) {
    // inline CSV string between double back ticks, a data frame literal.
    pos = str.indexOf("`", (str.charAt(2) === "`" ? 3 : 2));
    const inputStr = (pos > 0 ? str.slice(2, pos) : str.slice(2));
    const st = tablessTrim(inputStr);
    let tex = "";
    if (inRealTime) {
      tex = DataFrame.quickDisplay(st);
    } else {
      const dataStructure = DataFrame.dataFrameFromCSV(st, {});
      if (dataStructure.dtype === dt.DATAFRAME) {
        tex = DataFrame.display(dataStructure.value, "h3", decimalFormat);
      } else {
        tex = map.display(dataStructure, "h3", decimalFormat);
      }
    }
    return ["``" + inputStr + "``", tex, tt.DATAFRAME, ""]
  }

  if (str.charAt(0) === '`') {
    // Rich text string. Usually a return from a calculation.
    // String between double quotation marks. Parser will convert it to \text{…}
    pos = str.indexOf('`', 1);
    if (pos > 0) {
      // Disallow \r or \n by truncating the string.
      st = str.substring(1, pos).replace(/\r?\n.*/, "");
      return ['`' + st + '`', st, tt.RICHTEXT, ""]
    } else {
      return [str, str.replace(/\r?\n.*/, ""), tt.RICHTEXT, ""]
    }
  }

  if (unitRegEx.test(str)) {
    // String between single quotation marks. That signals a tt.UNIT.
    pos = str.indexOf("'", 1);
    if (pos > 0) {
      st = str.substring(1, pos);
      return ["'" + st + "'", unitTeXFromString(st), tt.UNIT, ""]
    } else {
      // One of the unambiguous unit symbols, like ° or Å
      return [str.charAt(0), str.charAt(0), tt.UNIT, ""]
    }
  }

  // Strings beginning with "\" are passed through as a TeX control word.
  matchObj = texFunctionRegEx.exec(str);
  if (matchObj) {
    // TeX control word, starting with backslash. e.g. \, or \circ
    const match = matchObj[0];
    st = match.substring(1);
    if (isIn(st, accents$1)) {
      return [match, match, tt.ACCENT, ""]
    }
    if (isIn(st, unaries)) {
      return [match, match, tt.UNARY, ""]
    }
    if (isIn(st, colors)) {
      return [match, "\\textcolor{" + st + "}", tt.UNARY, ""]
    }
    if (isIn(st, binaries)) {
      return [match, match, tt.BINARY, ""]
    }
    if (isIn(st, texREL)) {
      return [match, match, tt.REL, ""]
    }
    const texFunc = texFunctions[match];
    if (texFunc) {
      return cloneToken(texFunc)
    }
    // default case is a mathord. So I have not enumerated any ORDs
    return [match, match, tt.ORD, ""]
  }

  if (minusRegEx.test(str)) {
    if (isUnary(prevToken)) {
      // Check if the unary minus is part of a number
      const numParts = str.match(numberRegEx$2);
      if (numParts) {
        // numbers
        st = texFromNumStr(numParts, decimalFormat);
        return [numParts[0], st, tt.NUM, ""]
      }
    }
    return ["-", "-", tt.ADD, ""]
  }

  const numParts = str.match(numberRegEx$2);
  if (numParts) {
    // numbers
    st = texFromNumStr(numParts, decimalFormat);
    return [numParts[0], st, tt.NUM, ""]
  }

  // Before lexing for a word, find underscores before a group
  if (/^_[([{]/.test(str)) {
    return ["_", "_", tt.SUB, ""]
  }

  const word = lexOneWord(str, prevToken);
  if (word) { return cloneToken(word) }

  const nums = superRegEx.exec(str);
  if (nums) {
    return [nums[0], nums[0], tt.SUPCHAR, ""]
  }

  //return maximal initial substring of str that appears in misc names
  matchObj = miscRegEx.exec(str);
  if (matchObj) {
    const match = matchObj[0];
    for (let i = match.length; i >= 1; i--) {
      st = match.substr(0, i);
      if (miscSymbols[st]) { return cloneToken(miscSymbols[st]) }
    }
  }

  // No keywords were matched. Return 1 character.
  const c1 = str.charAt(0);
  if (c1 === "." && (prevToken.ttype === tt.VAR || prevToken.ttype === tt.LONGVAR ||
    prevToken.ttype === tt.STRING || prevToken.input === "]" ||
    prevToken.ttype === tt.PROPERTY)) {
    // Suppress the spacing of the accessor dot.
    return [".", "{.}", tt.ACCESSOR, ""]
  }
  return [c1, addTextEscapes(c1), tt.VAR, ""]
};

/*
 * parser.js
 *
 * This file takes a text string and compiles it to TeX.
 * If the isCalc flag is set, then parse() also compiles the text to an RPN string
 * used elsewhere for further Hurmet computation.
 *
*/

// Keep the next three lists sorted, so that the isIn() binary search will work properly.
const builtInFunctions = [
  "Gamma", "Im", "Re", "abs", "acos", "acosd", "acosh", "acot", "acotd", "acoth", "acsc",
  "acscd", "acsch", "argument", "asec", "asecd", "asech", "asin", "asind", "asinh", "atan",
  "atan2", "atand", "atanh", "binomial", "chr", "cos", "cosd", "cosh", "cosh", "cot", "cotd",
  "coth", "coth", "count", "csc", "cscd", "csch", "csch", "exp",
  "fetch", "format", "gcd", "hypot", "isNaN", "length", "lerp", "ln", "log", "log10", "log2",
  "logFactorial", "logGamma", "logn", "logΓ", "matrix2table", "random", "rms", "round",
  "roundSig", "roundn", "sec", "secd", "sech", "sech", "sign", "sin", "sind", "sinh",
  "startSvg", "string", "tan", "tand", "tanh", "tanh", "trace", "transpose", "zeros", "Γ"
];

const builtInReducerFunctions = ["accumulate", "dataframe",
  "max", "mean", "median", "min", "product", "range", "stddev", "sum", "variance"
];

const trigFunctions = ["cos", "cosd", "cot", "cotd", "csc", "cscd", "sec", "secd",
  "sin", "sind", "tand", "tan"];

const rationalRPN = numStr => {
  // Return a representation of a rational number that is recognized by evalRPN().
  const num = Rnl.fromString(numStr);
  return "®" + String(num[0]) + "/" + String(num[1])
};

const checkForUnaryMinus = (token, prevToken) => {
  switch (prevToken.ttype) {
    case tt.NUM:
    case tt.ORD:
    case tt.VAR:
    case tt.RIGHTBRACKET:
    case tt.LONGVAR:
    case tt.PROPERTY:
    case tt.UNIT:
    case tt.SUPCHAR:
    case tt.PRIME:
    case tt.FACTORIAL:
      return token
    // do nothing
  }
  if (token.output === "-") {
    return { input: "~", output: "\\text{-}", ttype: tt.UNARYMINUS }
  } else {
    return { input: "+", output: "~+", ttype: tt.UNARYMINUS }
  }
};

const numFromSuperChar = {
  "⁻": "-",
  "²": "2",
  "³": "3",
  "¹": "1",
  "⁰": "0",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9"
};

const numFromSupChars = str => {
  let num = "";
  for (const ch of str) {
    num += numFromSuperChar[ch];
  }
  return num
};

const colorSpecRegEx = /^(#([a-f0-9]{6}|[a-f0-9]{3})|[a-z]+|\([^)]+\))/i;

const factors = /^[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133\uD835[({√∛∜]/;

const setUpIf = (rpn, tokenInput, exprStack, delim) => {
  // The Hurmet CASES expression acts lazily. To accommodate that, push the
  // sub-expression onto a stack of expressions. At the closing brace,
  // we'll pop all the expressions off the stack and place them after the conditions.
  // Later, evaluate.js will evaluate the conditions and then pick the correct expression.
  const expression = rpn.replace(/^.*\xa0/, "").replace(/§$/, "\xa0");
  exprStack.push(expression);
  rpn = rpn.length === expression.length ? "" : rpn.slice(0, rpn.length - expression.length);
  delim.numArgs += 1;
  if (tokenInput === "otherwise") { rpn += "true"; }
  return rpn
};

const functionExpoRegEx = /^[\^⁻⁰¹²³\u2074-\u2079]/;

const openParenRegEx = /^ *\(/;

const exponentOfFunction = (str, decimalFormat, isCalc) => {
  // As in: sin²()
  let expoInput = "";
  if (str.charAt(0) !== "^") {
    expoInput = /^[⁰¹²³\u2074-\u2079⁻]+/.exec(str)[0];
    expoInput = numeralFromSuperScript(expoInput);
  } else if (!openParenRegEx.test(str.slice(1))) {
    expoInput = lex(str.slice(1), decimalFormat, { input: "", output: "", ttype: 50 })[0];
  } else {
    // The exponent is in parens. Find its extent.
    expoInput = "(";
    let level = 1;
    for (let i = 2; i < str.length; i++) {
      const ch = str.charAt(i);
      expoInput += ch;
      if ("\"'`".indexOf(ch) > -1) {
        const pos = str.indexOf(ch, i + 1);
        expoInput += str.slice(i + 1, pos + 1);
        i = pos;
      } else if ("([{⟨\u2308\u23BF\u23BE\u3016".indexOf(ch) > -1) {
        level += 1;
      } else if (")]}⟩\u2309\u230B\u23CC\u3017".indexOf(ch) > -1) {
        level -= 1;
      }
      if (level === 0) { break }
    }
  }

  const parseInput = (expoInput.charAt(0) === "(")
    ? expoInput.slice(1, -1).trim()
    : expoInput;

  if (isCalc) {
    const expoOutput = parse(parseInput, decimalFormat, true);
    return [expoInput, "{" + expoOutput[0] + "}", expoOutput[1]]
  } else {
    const expoTex = parse(parseInput, decimalFormat, false);
    return [expoInput, "{" + expoTex + "}", ""]
  }
};

const testForImplicitMult = (prevToken, texStack, str) => {
  // Some math expressions imply a multiplication without writing an explicit operator token.
  // Examples:  e = m c², y = 3(2+5), n = (a+5)x, z = 5 + 2i
  // Hurmet writes the echo expression with a more explicit written form of multiplication.
  // The echo shows each multiplication in one of three ways: a x b,  a · b, or (a)(b)
  // This sub is going to determine if such an adjustment is required for the current position.

  if (texStack.length > 0) {
    // Test for a tex unary function or a function w/ tt.SUP or tt.SUB
    const topType = texStack[texStack.length - 1].ttype;
    if (topType === tt.UNARY || topType === tt.BINARY) { return false }
    if (topType === tt.SUB || topType === tt.SUP) {
      if (texStack[texStack.length - 1].isOnFunction) { return false }
    }
  }

  let isPreceededByFactor = false;
  if (prevToken.output) {
    const pc = prevToken.output.charAt(prevToken.length - 1);
    if (")]}".indexOf(pc) > -1) {
      if ((pc === ")" || pc === "]") && /^[([]/.test(str)) {
        // This was already handled by the tt.RIGHTBRACKET case
        return false
      } else {
        isPreceededByFactor = true;
      }
    } else {
      switch (prevToken.ttype) {
        case tt.ORD:
        case tt.NUM:
        case tt.VAR:
        case tt.LONGVAR:
        case tt.PRIME:
        case tt.SUP:
        case tt.SUPCHAR:
        case tt.SUB:
        case tt.PROPERTY:
        case tt.UNIT:
        case tt.RIGHTBRACKET:
        case tt.FACTORIAL:
          isPreceededByFactor = true;
          break
        default:
          isPreceededByFactor = false;
      }
    }
  }
  if (isPreceededByFactor && nextCharIsFactor(str, prevToken.ttype)) { return true }
  return false
};

const nextCharIsFactor = (str, tokenType) => {
  const st = str.replace(leadingLaTeXSpaceRegEx, "");
  const fc = st.charAt(0);

  let fcMeetsTest = false;
  if (st.length > 0) {
    if (fc === "|" || fc === "‖") ; else if (/^[({[√∛∜0-9]/.test(st) &&
      (isIn(tokenType, [tt.ORD, tt.VAR, tt.NUM, tt.LONGVAR, tt.RIGHTBRACKET,
        tt.CURRENCY, tt.SUPCHAR]))) {
      return true
    } else {
      if (factors.test(fc)) {
        fcMeetsTest = !/^(if|and|atop|or|else|modulo|otherwise|not|for|in|while|end)\b/.test(st);
      }
    }
  }
  return fcMeetsTest
};

const cloneToken$1 = token => {
  return {
    input: token.input,
    output: token.output,
    ttype: token.ttype,
    closeDelim: token.closeDelim
  }
};

// The RegEx below is equal to /^\s+/ except it omits \n and the no-break space \xa0.
// I use \xa0 to precede the combining arrow accent character \u20D7.
const leadingSpaceRegEx$1 = /^[ \f\r\t\v\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/;
const leadingLaTeXSpaceRegEx = /^(˽|\\quad|\\qquad)+/;

/* eslint-disable indent-legacy */
const rpnPrecFromType = [
  12, 12, 15, 13, 16, 10,
       7, 10, 12, -1, -1,
      -1,  1, -1,  0,  0,
      -1,  0, -1, 14,  0,
       6,  7,  5,  4,  1,
      -1, 16, 15, -1, 14,
      13,  9,  3,  2, 10,
      -1, -1,  4,  3, -1,
      -1
];

const texPrecFromType = [
  12, 12, 15, 13, 16, 10,
       2, 10, 12,  2,  2,
       2,  1,  2,  2,  0,
       1,  1,  2, 14,  1,
       2,  2,  1,  1,  1,
       2, -1, 15,  2, 14,
      13,  9, -1,  1, -1,
      15, -1,  1,  -1, 2,
       2
];
/* eslint-enable indent-legacy */

/* Operator Precedence
TeX  RPN
  0    0    ( [ {        delimiters
  1    1    , ;  :       separators for arguments, elements, rows, and ranges
  1    2    for in while loop keywords
  1    3    :            range separator
  1    4    if ∧ ∨       logical operators, return
  1    5    < > ≤ ≥      comparisons
  2    6    + -          addition and subtraction
  2    7    * (x)(y) /   multiplication, division
  9    9    ∠            \angle. Used as a separator for complex numbers in polar notation
 10   10    -            unary minus
 12   12    sqrt sin     unary functions, math functions, and binary functions (e.g. root 3 x)
 13   13    ^            superscript, i.e. exponent
 14   14    ! % ‰ °      factorial, percent, permil, degree
 15   15    _ ' .        subscript, prime, dot notation property accessor
 16   16    hat bb       accent and font
*/

// Delimiter types
const dNOTHING = 0;
const dPAREN = 1; //           () or [] or {}, but not one of the use cases below
const dFUNCTION = 2; //        sin(x)
const dACCESSOR = 3; //        identifier[index] or identifier[start:step:end]
const dMATRIX = 4; //          [1; 2] or (1, 2; 3, 4) or {1, 2}
const dVECTORFROMRANGE = 5; // [start:end] or [start:step:end]
const dCASES = 7; //           { a if b; c otherwise }
const dBINOMIAL = 8;
const dSUBSCRIPT = 9; //       Parens around a subscript do not get converted into matrices.
const dDISTRIB = 10; //         A probability distribution defined by a confidence interval.

const parse = (
  str,
  decimalFormat = "1,000,000.",
  isCalc = false,     // true when parsing the blue echo of an expression
  inRealTime = false  // true when updating a rendering with every keystroke in the editor.
) => {
  // Variable definitions
  let tex = "";
  let rpn = "";
  let token = {};
  let prevToken = { input: "", output: "", ttype: 50 };
  let mustLex = true;
  let mustAlign = false;
  let posOfPrevRun = 0;
  let isPrecededBySpace = false;
  let isFollowedBySpace = false;
  let isFollowedBySpaceOrNewline = false;
  let isImplicitMult = false;
  let followedByFactor = false;
  let op;
  const texStack = []; // operator stack for TeX rendering
  const rpnStack = []; // operator stack for RPN
  const delims = [{ delimType: dNOTHING, isTall: false }]; // delimiter stack
  let okToAppend = true;
  let fc = "";
  let pendingFunctionName = "";
  let tokenSep = "\xa0"; // no break space
  let rpnPrec = -1;
  const exprStack = []; // Use for lazy evalulation of ternary (If) expressions

  // This function, parse(), is the main function for this module.
  // Before we get to the start line, we write two enclosed functions,
  // popRpnTokens() and popTexTokens().
  // They are placed here in order to share variable scope with parse().

  const popRpnTokens = rpnPrec => {
    if (isCalc && rpnPrec >= 0) {
      // Pop operators off the rpnStack and append them to the rpn string
      while (rpnStack.length > 0) {
        const topPrec = rpnStack[rpnStack.length - 1].prec;
        //                         exponents, from right to left.
        if (topPrec < rpnPrec || (topPrec === 13 && rpnPrec === 13)) { break }
        rpn += rpnStack.pop().symbol + tokenSep;
      }
    }
  };

  const popTexTokens = (texPrec, okToAppend, closeDelim) => {

    if (!okToAppend) { return }

    // Pop tokens off the texStack. Append closing delimiters to the tex string.
    // When necessary, insert an opening brace before a fraction numerator.
    if (texStack.length === 0) {
      if (prevToken.ttype !== tt.RIGHTBRACKET && prevToken.ttype !== tt.LEFTRIGHT) {
        // The purpose of op.pos in general is to let some possible
        // upcoming division know where to insert a "\frac{" before the numerator.
        // If we've gotten here, then no operators are on the texStack, so set op.pos
        // at the beginning of the previous token.
        op = { pos: posOfPrevRun, ttype: prevToken.ttype, closeDelim: "" };
      }
      return
    }

    const topOp = texStack[texStack.length - 1];
    if (
      (texPrec === 2 || texPrec === 12  || texPrec === 14 || texPrec === 15) &&
      (prevToken.ttype !== tt.RIGHTBRACKET && prevToken.ttype !== tt.LEFTRIGHT) &&
      topOp.prec < texPrec
    ) {
      op = { pos: posOfPrevRun, ttype: prevToken.ttype, closeDelim: "" };
      return
    }

    //  Pop operators whose precedence ≥ texPrec. Append a close delimiter for each.
    let delim = {};
    while (texStack[texStack.length - 1].prec >= texPrec &&
      // Also handle exponents, from right to left, as in 3^4^5
      !(texStack[texStack.length - 1].prec === 13 && texPrec === 13)) {
      op = texStack.pop();

      // Before we append braces, check if we must hide a pair of parens.
      if (op.prec === 0) {
        // We just popped a delimiter operator.
        delim = delims[delims.length - 1];
        if ((op.ttype === tt.LEFTBRACKET || op.ttype === tt.LEFTRIGHT) &&
          op.closeDelim.length > 0) {
          if (texStack.length > 0) {
            if (
              op.ttype === tt.LEFTRIGHT &&
              token.output === ")" &&
              texStack[texStack.length - 1].closeDelim === ")"
            ) {
              // op is a middle |, as in P(A|B). Check if it's tall.
              if (delim.isTall) {
                tex = tex.substring(0, op.pos) + "\\middle" + tex.substring(op.pos);
                delims[delims.length - 1].isTall = true;
              }
              // Pop another delim.
              op = texStack.pop();
              delims.pop();
              delim = delims[delims.length - 1];
            }
          }

          if (delim.delimType === dMATRIX) {
            const inc = tex.slice(op.pos, op.pos + 1) === "\\" ? 2 : 1;
            tex = tex.slice(0, op.pos) + delim.open + tex.slice(op.pos + inc);
            op.closeDelim = delim.close;
          } else if (delim.delimType === dCASES) {
            tex = tex.slice(0, op.pos) + delim.open + tex.slice(op.pos + 2);
            op.closeDelim = delim.close;
          } else if (delim.delimType === dPAREN &&
            delim.name === "(" && /^(\/|\\atop\s)/.test(str)) {
            // The parens surround a numerator. Delete them.
            tex = tex.substring(0, op.pos) + tex.substring(op.pos + 1);
            op.closeDelim = "";
          } else if (delim.isPrecededByDiv && delim.delimType === dPAREN &&
              delim.name === "(" && (/^[^^_!%°⁻²³¹⁰⁴⁵⁶⁷⁸⁹]/.test(str) || str.length === 0)) {
            // The parens surround a denominator. Delete them.
            tex = tex.substring(0, op.pos) + tex.substring(op.pos + 1);
            op.closeDelim = "";
          } else if (delim.isTall) {
            // Make the delims tall.
            if (/^\\left/.test(tex.substring(op.pos)) === false) {
              tex = tex.substring(0, op.pos) + "\\left" + tex.substring(op.pos);
            }
            if (/\\right/.test(op.closeDelim) === false) {
              op.closeDelim = "\\right" + token.output;
            }
          }
        }
      }

      tex = tex.replace(/\\, *$/, ""); // Remove an implicit multiplication space.
      tex += op.closeDelim;

      if (op.closeDelim.slice(-1) === "{") {
        // We just closed the first part of a binary function, e.g. root()(),
        // or a function exponent (sin^2 θ) or function subscript (log_10)
        if (op.ttype === tt.BINARY) {
          texStack.push({ prec: 12, pos: op.pos, ttype: tt.UNARY, closeDelim: "}" });
          if (isCalc) {
            rpn += tokenSep;
            if (rpnStack[rpnStack.length - 1].symbol === "\\sqrt") {
              rpnStack[rpnStack.length - 1].symbol = "root";
            }
          }
        }
        op.ttype = tt.UNARY;
        prevToken = { input: "", output: "", ttype: tt.UNARY };
        return
      }

      if (texStack.length === 0 || op.prec === 0) {
        return
      }
    }
  };

  // With the closed functions out of the way, execute the main parse loop.
  str = str.replace(leadingSpaceRegEx$1, ""); //       trim leading white space from string
  str = str.replace(/\s+$/, ""); //                  trim trailing white space

  while (str.length > 0) {
    // Get the next token.
    if (str.charAt(0) === "\n") {
      str = str.slice(1);
      const prevChar = prevToken ? prevToken.input.slice(-1) : "0";
      if (
        prevToken.ttype === tt.COMMENT ||
        ("{[(,;+-".indexOf(prevChar) === -1 && !/^ *[)}\]]/.test(str))
      ) {
        popTexTokens(0, true);
        tex += "\\\\ ";
        const matchObj = /^ +/.exec(str);
        str = str.replace(/^ */, "");
        if (str.length > 0 && str.charAt(0) === "=" & tex.indexOf("=") > -1) {
          mustAlign = true; // We'll use the TeX {aligned} environment to align = signs.
          tex += "&";
        } else if (matchObj) {
          tex += "\\quad ".repeat(matchObj[0].length - 1);
        }
      }
      str = str.trim();
    }

    mustLex = true; // default

    isImplicitMult = isPrecededBySpace && okToAppend &&
      testForImplicitMult(prevToken, texStack, str);
    if (isImplicitMult) {
      const prevType = prevToken.ttype;
      token = {
        input: "⌧",
        output: [tt.LONGVAR, tt.NUM, tt.UNIT].includes(prevType) ? "\\," : "",
        ttype: tt.MULT
      };
      isFollowedBySpace = false;
      isFollowedBySpaceOrNewline = false;
      mustLex = false;
    }

    if (mustLex) {
      const tkn = lex(str, decimalFormat, prevToken, inRealTime);
      token = { input: tkn[0], output: tkn[1], ttype: tkn[2], closeDelim: tkn[3] };
      str = str.substring(token.input.length);
      isFollowedBySpace = leadingSpaceRegEx$1.test(str) || /^(˽|\\quad|\\qquad)+/.test(str);
      isFollowedBySpaceOrNewline = /^[ \n]/.test(str);
      str = str.replace(leadingSpaceRegEx$1, "");
      followedByFactor = nextCharIsFactor(str, token.ttype);
    }

    switch (token.ttype) {
      case tt.SPACE: //      spaces and newlines
      case tt.BIN: //        infix math operators that render but don't calc, e.g. \bowtie
      case tt.ADD: //        infix add/subtract operators, + -
      case tt.MULT: //       infix mult/divide operators, × * · // ÷
      case tt.REL: //        relational operators, e.g  < →
      case tt.UNDEROVER: { // int, sum, lim, etc
        if (token.output.length > 0 && "- +".indexOf(token.output) > -1) {
          token = checkForUnaryMinus(token, prevToken);
        }

        if (isCalc && token.ttype !== tt.SPACE) {
          if (token.output !== "\\text{-}") { rpn += tokenSep; }
          rpnPrec = rpnPrecFromType[token.ttype];
          popRpnTokens(rpnPrec);
        }

        const texPrec = texPrecFromType[token.ttype];
        popTexTokens(texPrec, okToAppend);
        tex += token.output + " ";
        posOfPrevRun = tex.length;

        if (token.ttype === tt.UNDEROVER && delims.length > 1) {
          delims[delims.length - 1].isTall = true;
        } else if (isCalc) {
          rpnStack.push({ prec: rpnPrec, symbol: token.input });
        }

        okToAppend = true;
        break
      }

      case tt.ACCESSOR:  //   dot between a map name and a property, as in r.PROPERTY
      case tt.ANGLE:    // \angle. Used as a separator for complex numbers in polar notation
        token = checkForUnaryMinus(token, prevToken);
        if (isCalc) {
          rpn += tokenSep;
          rpnPrec = rpnPrecFromType[token.ttype];
          popRpnTokens(rpnPrec);
          rpnStack.push({ prec: rpnPrec, symbol: token.input });
        }
        popTexTokens(texPrecFromType[token.ttype], okToAppend);
        tex += isCalc ? token.input : token.output + " ";
        okToAppend = true;
        break

      case tt.NUM:
      case tt.ORD:
        // Numbers and ORDs get appended directly onto rpn. Pass -1 to suppress an rpn pop.
        popTexTokens(2, okToAppend);
        if (isCalc) {
          popRpnTokens(-1);
          rpn += token.ttype === tt.NUM ? rationalRPN(token.input) : token.input;
        }
        if (isPrecededBySpace) { posOfPrevRun = tex.length; }
        if (isCalc &&
          (prevToken.ttype === tt.MULT || (followedByFactor && prevToken.ttype !== tt.DIV))) {
          token.output = "(" + token.output + ")";
        }
        tex += token.output + " ";
        okToAppend = true;

        if (!isFollowedBySpace && followedByFactor) {
          // We've encountered something like the expression "2a".
          popTexTokens(2, okToAppend);
          if (isCalc) {
            rpn += tokenSep;
            popRpnTokens(7);
            rpnStack.push({ prec: rpnPrecFromType[tt.MULT], symbol: "⌧" });
          }
        }
        break

      case tt.STRING: {
        popTexTokens(2, okToAppend);
        const ch = token.input.charAt(0);
        if (isCalc) { rpn += ch + token.output + ch; }  // Keep before addTextEscapes()
        if (isPrecededBySpace) { posOfPrevRun = tex.length; }
        token.output = addTextEscapes(token.output);
        token.output = token.output.replace(/ +$/, "\\,"); // Prevent loss of trailing space
        tex += "\\text{" + token.output + "}";
        okToAppend = true;
        break
      }

      case tt.RICHTEXT: {
        popTexTokens(2, okToAppend);
        const ch = token.input.charAt(0);
        if (isCalc) { rpn += ch + token.output + ch; }
        if (isPrecededBySpace) { posOfPrevRun = tex.length; }
        token.output = token.output === "`" ? "`" : parse(token.output, decimalFormat, false);
        tex += "{" + token.output + "}";
        okToAppend = true;
        break
      }

      case tt.DATAFRAME:
        popTexTokens(2, okToAppend);
        posOfPrevRun = tex.length;
        tex += token.output;
        okToAppend = true;
        break

      case tt.VAR:         // variable name, one letter long
      case tt.LONGVAR: {   // multi-letter variable name
        if (token.ttype === tt.LONGVAR && prevToken.input === "⌧") {
          tex += "\\,"; // Place a space before a long variable name.
        }
        // variables get appended directly onto rpn.
        popTexTokens(7, okToAppend);
        if (isPrecededBySpace) { posOfPrevRun = tex.length; }

        if (!isCalc) {
          if (token.ttype === tt.LONGVAR) {
            token.output = "\\mathrm{" + token.output + "}";
          }
        } else if (prevToken.input === "for") {
          rpn += '"' + token.input + '"'; // a loop index variable name.
        } else {
          // We're in the echo of a Hurmet calculation.
          if (/^(\.[^.]|\[)/.test(str)) {
            // When the blue echo has an index in a bracket, e.g., varName[indes], it renders
            // the name of the variable, not the value. The value of the value of the index.
            token.output = token.ttype === tt.LONGVAR
              ? "\\mathrm{" + token.output + "}"
              : token.output;
          } else {
            token.output = token.input;
            token.output = "〖" + token.output;
          }
          rpn += "¿" + token.input;
        }

        tex += token.output + (str.charAt(0) === "." ? "" : " ");
        if (isCalc) {
          // The variable's value may be tall. We don't know.
          delims[delims.length - 1].isTall = true;
        }
        okToAppend = true;
        break
      }

      case tt.UNIT: {  //  e.g.  'meters'
        popTexTokens(14, true);
        texStack.push({ prec: 14, pos: op.pos, ttype: tt.UNIT, closeDelim: "" });
        if (isCalc) {
          popRpnTokens(14);
          rpn += tokenSep + "applyUnit" + tokenSep + token.input.replace(/'/g, "");
        }
        if (!/^'?°'?$/.test(token.input)) { tex += "\\;"; }
        tex += token.output;
        okToAppend = true;
        break
      }

      case tt.PROPERTY: {
        // A word after a dot ACCESSOR operator. I.e., A property in dot notation
        // Treat somewhat similarly to tt.STRING
        popTexTokens(15, okToAppend);
        const pos = token.input.indexOf("_");
        if (isCalc) {
          rpn += '"' + token.output + '"';
          tex += `\\mathrm{${token.output}}`;
          if (str.charAt(0) !== ".") { tex += " "; }
        } else if (pos > -1) {
          tex += token.input.substring(0, pos) + "_\\mathrm{" +
            token.input.substring(pos + 1) + "}";
        } else {
          token.output = addTextEscapes(token.output);
          token.output = token.output.replace(/ +$/, "\\,"); // Prevent loss of trailing space
          tex += "\\text{" + token.output + "}";
        }
        okToAppend = true;
        break
      }

      case tt.TO: {
        // A probability distribution defined by its low and high values.
        // As in: (2 to 3) or [2 to 3] or {2 to 3}
        delims[delims.length - 1].delimType = dDISTRIB;
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;
        tex += token.output;
        if (isCalc) {
          rpn += tokenSep;
          popRpnTokens(3);
          const symbol = delims[delims.length - 1].symbol;
          const distribution = symbol === "("
            ? "normal"
            : symbol === "["
            ? "uniform"
            : "lognormal";
          rpnStack.push({ prec: 3, symbol: distribution });
        }
        break
      }

      case tt.RANGE: {
        //   range separator, as in 1..n
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;

        if (isCalc) {
          rpn += tokenSep;
          popRpnTokens(3);
          rpnStack.push({ prec: 3, symbol: ".." });
          if (str.charAt(0) === "]" || str.length === 0) {
            rpn += '"∞"'; // slice of the form: identifier[n..]
          }
        }
        tex += token.output;
        break
      }

      case tt.DIV:  //  / or \atop
        if (isCalc) { rpn += tokenSep; }
        popTexTokens(2, true);
        popRpnTokens(7);
        if (token.input === "//") {
          // case fraction
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}" });
          tex = tex.substring(0, op.pos) + "\\tfrac{" + tex.substring(op.pos) + "}{";
        } else if (token.input === "/" || token.input === "\\over") {
          // displaystyle fraction
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}" });
          tex = tex.substring(0, op.pos) + "\\dfrac{" + tex.substring(op.pos) + "}{";
        } else {
          // atop, for binomials
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}}" });
          tex = tex.substring(0, op.pos) + "{{" + tex.substring(op.pos) + "}\\atop{";
          if (delims[delims.length - 1].name === "(") {
            delims[delims.length - 1].delimType = dBINOMIAL;
          }
        }
        if (isCalc) {
          if (token.input === "\\atop") {
            if (delims[delims.length - 1].delimType === dBINOMIAL) {
              rpnStack.push({ prec: 7, symbol: "()" });
            }
          } else {
            rpnStack.push({ prec: 7, symbol: token.input });
          }
        }
        delims[delims.length - 1].isTall = true;
        posOfPrevRun = tex.length;
        okToAppend = false;
        break

      case tt.SUB: { // _
        popTexTokens(15, true);
        const subCD = prevToken.ttype === tt.FUNCTION ? "}{" : "}";
        texStack.push({ prec: 15, pos: op.pos, ttype: tt.SUB, closeDelim: subCD });
        tex += "_{";
        if (isCalc) { rpn += "_"; }
        okToAppend = false;
        break
      }

      case tt.SUP: // ^
        if (isCalc) {
          if (/¿e$/.test(rpn)) {
            // e^3. Replace e with 2.7182818284590452353602874713527
            // eslint-disable-next-line max-len
            rpn = rpn.slice(0, -2) + "®27182818284590452353602874713527/10000000000000000000000000000000";
          }
          rpn += tokenSep;
          popRpnTokens(13);
        }
        popTexTokens(13, true);
        if (prevToken.ttype === tt.RIGHTBRACKET) {
          texStack.push({ prec: 13, pos: op.pos, ttype: tt.SUP, closeDelim: "}" });
        } else {
          texStack.push({ prec: 13, pos: posOfPrevRun, ttype: tt.SUP, closeDelim: "}" });
        }
        if (isCalc) { rpnStack.push({ prec: 13, symbol: "^" }); }
        tex += "^{";
        okToAppend = false;
        break

      case tt.SUPCHAR: { //  ²³¹⁰⁴⁵⁶⁷⁸⁹⁻
        if (isCalc) {
          if (/¿e$/.test(rpn)) {
            // e^3. Replace e with 2.7182818284590452353602874713527
            // eslint-disable-next-line max-len
            rpn = rpn.slice(0, -2) + "®27182818284590452353602874713527/10000000000000000000000000000000";
          }
          rpn += tokenSep;
          popRpnTokens(13);
        }
        popTexTokens(13, true);
        const supNum = numFromSupChars(token.output);
        if (prevToken.ttype === tt.RIGHTBRACKET) {
          texStack.push({ prec: 13, pos: op.pos, ttype: tt.SUP, closeDelim: "}" });
        } else {
          texStack.push({ prec: 13, pos: posOfPrevRun, ttype: tt.SUP, closeDelim: "}" });
        }
        tex += "^{" + supNum;
        if (isCalc) {
          rpnStack.push({ prec: 13, symbol: "^" });
          rpn += rationalRPN(supNum);
        }
        okToAppend = true;
        break
      }

      case tt.FUNCTION: { // e.g. sin or tan,  shows parens
        popTexTokens(2, okToAppend);
        posOfPrevRun = tex.length;
        // Is there an exponent on the function name?
        if (functionExpoRegEx.test(str)) {
          const [expoInput, expoTex, expoRPN] = exponentOfFunction(str, decimalFormat, isCalc);
          if (isCalc && expoRPN === `®1/1${tokenSep}~` && isIn(token.input, trigFunctions)) {
            // Inverse trig function.
            token.input = "a" + token.input;
            token.output = "\\a" + token.output.slice(1);
          } else {
            if (isCalc) { token.input += tokenSep + expoRPN + tokenSep + "^"; }
            token.output += "^" + expoTex;
          }
          const L = expoInput.length + (str.charAt(0) === "^" ? 1 : 0);
          str = str.slice(L).trim();
        }
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: token.input });
          if (prevToken.input === "⌧") { tex += "×"; }
        }
        fc = str.charAt(0);
        texStack.push({
          prec: 12,
          pos: tex.length,
          ttype: tt.FUNCTION,
          closeDelim: fc === "(" ? "" : "}"
        });
        tex += token.output;
        tex += fc === "(" ? "" : "{";
        pendingFunctionName = token.input;
        okToAppend = false;
        break
      }

      case tt.ACCENT:
        if (isCalc) {
          rpn += tokenSep;
          popRpnTokens(16);
        }
        popTexTokens(1, okToAppend);

        if (isCalc) {
          texStack.push({ prec: 16, pos: tex.length, ttype: tt.ACCENT, closeDelim: "〗" });
          tex += "〖" + token.input;
          rpn += "¿" + token.input;
        } else {
          texStack.push({ prec: 16, pos: tex.length, ttype: tt.ACCENT, closeDelim: "}" });
          tex += token.output + "{";
        }

        delims[delims.length - 1].isTall = true;
        okToAppend = false;
        break

      case tt.PRIME:
        popTexTokens(15, true);
        if (isCalc) { rpn += token.input; }
        tex = tex.trim() + token.output + " ";
        okToAppend = true;
        break

      case tt.BINARY: { // e.g. root(3)(x)
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;
        const binCD = token.input === "root" ? "]{" : "}{";
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.BINARY, closeDelim: binCD });
        if (isCalc) { rpnStack.push({ prec: 12, symbol: token.output }); }
        tex += token.output + (token.input === "root" ? "[" : "{");
        delims[delims.length - 1].isTall = true;
        okToAppend = false;
        break
      }

      case tt.CURRENCY: {  // e.g. $, £, etc
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.CURRENCY, closeDelim: "" });
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: "applyUnit" + tokenSep + token.input });
          if (prevToken.input === "⌧") { tex += "×"; }
        }
        tex += token.output;
        okToAppend = false;
        break
      }

      case tt.UNARY: // e.g. bb, hat, or sqrt, or xrightarrow, hides parens
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.UNARY, closeDelim: "}" });
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: token.input });
          if (prevToken.input === "⌧") { tex += "×"; }
        }
        tex += token.output;

        if (/det|inf/.test(token.input) && str.charAt(0) === "_") {
          texStack.push({ prec: 15, pos: tex.length, ttype: tt.SUB, closeDelim: "}" });
          token = { input: "_", output: "_", ttype: tt.SUB };
          tex += "_{";
          str = str.substring(1);
          str = str.replace(/^\s+/, "");
        } else if (token.input === "\\color") {
          const colorMatch = colorSpecRegEx.exec(str);
          if (colorMatch) {
            tex += "{" + colorMatch[0].replace(/[()]/g, "") + "}";
            texStack.pop();
            str = str.slice(colorMatch[0].length).trim();
          } else {
            // User is in the middle of writing a color spec. Avoid an error message.
            tex += "{";
          }
        } else {
          tex += "{";
        }
        delims[delims.length - 1].isTall = true;
        okToAppend = false;
        break

      case tt.FACTORIAL:
        popTexTokens(14, true);
        texStack.push({ prec: 14, pos: op.pos, ttype: tt.FACTORIAL, closeDelim: "" });
        if (isCalc) {
          popRpnTokens(14);
          rpn += tokenSep + token.output;
        }
        tex += token.output;
        okToAppend = true;
        break

      case tt.RETURN:
        // Special treatment in order to enable user-defined functions.
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;
        if (isCalc) {
          popRpnTokens(4);
          rpnStack.push({ prec: 4, symbol: "return" });
        }
        tex += token.output + " ";
        break

      case tt.KEYWORD:
        // Either "for", "in", "while", or "break"
        popTexTokens(1, true);
        posOfPrevRun = tex.length;
        if (isCalc) {
          popRpnTokens(2);
          if (token.input === "in") {
            rpn += tokenSep;
            rpnStack.push({ prec: rpnPrec, symbol: "for" });
          }
        }
        tex += token.output + " ";
        break

      case tt.LOGIC: {
        // logic words: if and or otherwise
        popTexTokens(1, okToAppend);
        if (isCalc) { rpn += tokenSep; }
        popRpnTokens(4);
        const topDelim = delims[delims.length - 1];
        if (token.input === "if" || token.input === "otherwise") {
          if (topDelim.delimType === dPAREN && topDelim.name === "{") {
            // Change the enclosing delim pair to a CASES expression.
            topDelim.delimType = dCASES;
            topDelim.close = "\\end{cases}";
            topDelim.open = "\\begin{cases}";
            // In order to get lazy evaluation of a CASES, we will have to move the
            // expressions after the conditions. Temporarily change the token separator.
            if (isCalc && tokenSep === "\xa0" && token.input === "if") {
              // Change the token separators in the preceding RPN.
              rpn = rpn.slice(0, topDelim.rpnPos) +
                rpn.slice(topDelim.rpnPos).replace(/\xa0/g, "§");
            }
          }
        }
        if (topDelim.delimType === dCASES && isIn(token.input, ["if", "otherwise"])) {
          tex += "&";
        }
        if (token.input === ":"  && topDelim.delimType === dPAREN && topDelim.symbol === "{") {
          token.output = "\\colon";
        }
        tex += token.output;
        if (isCalc) {
          if (topDelim.delimType === dCASES &&
            (token.input === "if" || token.input === "otherwise")) {
            // We're in an If Expression and we just reached the end of an expression.
            rpn = setUpIf(rpn, token.input, exprStack, topDelim);
            tokenSep = "\xa0";
          } else {
            rpnStack.push({ prec: 4, symbol: token.input });
          }
        }
        posOfPrevRun = tex.length;
        okToAppend = true;
        break
      }

      case tt.LEFTBRACKET: {
        popTexTokens(2, okToAppend);
        const isPrecededByDiv = prevToken.ttype === tt.DIV;
        let isFuncParen = false;

        const texStackItem = {
          prec: 0,
          pos: tex.length,
          ttype: tt.LEFTBRACKET,
          closeDelim: token.closeDelim
        };

        if ((token.input === "(" || token.input === "[") && prevToken.ttype < 5) {
          // The delimiters are here to delimit a TeX function extent.
          // Make the delimiters invisible.
          texStackItem.closeDelim = "";
        } else if (token.input === "(" && op.ttype === tt.BINARY) {
          texStackItem.closeDelim = "";
        } else {
          texStackItem.closeDelim = token.closeDelim;
          isFuncParen = (token.input === "(" || token.input === "[") &&
            prevToken.ttype === tt.FUNCTION;
          tex += token.output;
        }
        texStack.push(texStackItem);

        if (isCalc) {
          while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].symbol === ".") {
            rpn += tokenSep + rpnStack.pop().symbol;
          }
          rpnStack.push({ prec: 0, symbol: token.output.trim() });
        }

        const numArgs = /^\s*[)}\]]/.test(str) ? 0 : 1;

        const delim = {
          name: token.input,
          isTall: false,
          open: token.output,
          close: texStackItem.closeDelim,
          numArgs,
          numRows: numArgs,
          rpnPos: rpn.length,
          isPrecededByDiv,
          isFuncParen,
          isControlWordParen: prevToken.ttype < 5
        };

        if (isFuncParen) {
          delim.delimType = dFUNCTION;
          delim.name = pendingFunctionName;
        } else if (prevToken.ttype === tt.SUB) {
          delim.delimType = dSUBSCRIPT;
          delim.name = "(";
        } else if (token.input === "{") {
          // This may change to a CASES.
          delim.delimType = dPAREN;
          delim.rpnLength = rpn.length;
        } else if (token.input === "[" &&
            (isIn(prevToken.ttype, [tt.VAR, tt.LONGVAR, tt.STRING, tt.PROPERTY]) ||
            prevToken.input === "]")) {
          rpn += tokenSep;
          delim.delimType = dACCESSOR;
        } else {
          // This may change to a MATRIX, but for now we'll say it's a paren.
          delim.delimType = dPAREN;
          delim.name = token.input;
        }
        delims.push(delim);

        pendingFunctionName = "";
        posOfPrevRun = tex.length;
        okToAppend = false;
        break
      }

      case tt.SEP: {
        // Either a comma or a semi-colon. Colons are handled elsewhere.
        popTexTokens(1, okToAppend);
        posOfPrevRun = tex.length;

        if (token.input === "\\," || token.input === "\\;") {
          // escape characters that enable commas in a non-matrix paren.
          tex += token.output + " ";
        } else {
          const delim = delims[delims.length - 1];
          if (delim.delimType === dPAREN && isFollowedBySpaceOrNewline) {
            delim.delimType = dMATRIX;
            const ch = delim.name === "["
              ? "b"
              : delim.name === "("
              ? "p"
              : delim.name === "{:"
              ? ""
              : "B";
            delim.open = `\\begin{${ch}matrix}`;
            delim.close = `\\end{${ch}matrix}`;
            delim.isTall = true;
            token.output = token.input === "," ? "&" : "\\\\";
          } else if (delim.delimType === dMATRIX && token.input === ",") {
            token.output = "&";
          } else if (delim.delimType > 3 && token.input === ";") {
            token.output = "\\\\";
          }
          if (isCalc) {
            if (prevToken.ttype === tt.LEFTBRACKET && delim.delimType === dACCESSOR) {
              rpn += "®0/1";
            }
            rpn += tokenSep;
            popRpnTokens(1);
          }

          tex += token.output + " ";

          if (isCalc) {
            if (delims.length === 1) {
              rpn += token.output;

            } else {
              if (token.input === ";") {
                delim.numRows += 1;
                if (delims.length > 0 && delim.delimType === dCASES) {
                // We're about to begin an expression inside an If Expression.
                // Temporarily change the token separator.
                  tokenSep = "§";
                }
              }

              if (delim.numRows === 1) {
                if (token.input === ","  ||
                    (token.input === " " && (delim.delimType === dMATRIX))) {
                  if (str.charAt(0) === "]") {
                    rpn += "®0/1";
                  } else if (token.input === "," && delim.delimType === dFUNCTION &&
                             delim.numArgs === 2 && delim.name === "plot" ) {
                    // The literal function for a plot() statement inside a draw()
                    // Wrap the rpn in quotation marks.
                    rpn = rpn.slice(0, delim.rpnPos + 5) + '"'
                        + rpn.slice(delim.rpnPos + 5, -1).replace(/\u00a0/g, "§") + '"' + tokenSep;
                  }
                }
              }
              delim.numArgs += 1;
            }
          }
        }
        okToAppend = true;
        break
      }

      case tt.RIGHTBRACKET: {
        popTexTokens(0, true, token.output);
        const topDelim = delims.pop();

        if (topDelim.delimType === dPAREN && (!topDelim.isControlWordParen)
            && topDelim.close !== token.output) {
          // Enable unmatched delims, such as (1.2] or |ϕ⟩
          tex = tex.slice(0, -1 * topDelim.close.length) + token.output;
        }

        if (topDelim.isTall && delims.length > 1) {
          // If the inner parens are tall, then the outer parens must also be tall.
          delims[delims.length - 1].isTall = true;
        }

        if (isCalc) {
          while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].prec > 0) {
            rpn += tokenSep + rpnStack.pop().symbol;
          }
          if (topDelim.delimType === dCASES && prevToken.input !== "otherwise") {
            // "otherwise" is optional. We've just found a case where it is omitted.
            // So run function setUpIf as if "otherwise" were present.
            rpn = setUpIf(rpn, "otherwise", exprStack, topDelim);
            tokenSep = "\xa0";
          }
          const rpnOp = rpnStack.pop();
          const numArgs = topDelim.numArgs;
          const numRows = topDelim.numRows;
          const numCols = topDelim.numArgs / topDelim.numRows;

          const firstSep = numArgs === 0 ? "" : tokenSep;

          switch (topDelim.delimType) {
            case dFUNCTION: {
              let symbol = rpnStack.pop().symbol;
              const regEx = new RegExp(tokenSep + '!$');
              if (numArgs === 2) {
                if (symbol === "log") { symbol = "logn"; }
                if (symbol === "round") { symbol = "roundn"; }
                if (symbol === "atan") { symbol = "atan2"; }
                if (symbol === "plot") {
                  rpn = rpn.slice(0, 6) + '"' + rpn.slice(6).replace(/\u00a0/g, "§") + '"';
                }
              } else if (symbol === "log" && regEx.test(rpn)) {
                rpn = rpn.slice(0, rpn.length - 1) + "logFactorial";
                break
              }
              rpn += (symbol.slice(-1) === "^")
                ? firstSep + symbol
                : isIn(symbol, builtInFunctions)
                ? firstSep + symbol
                : isIn(symbol, builtInReducerFunctions)
                ? firstSep + symbol + tokenSep + numArgs
                : firstSep + "function" + tokenSep + symbol + tokenSep + numArgs;
              break
            }

            case dACCESSOR:
              // This is the end of a […] following a variable name.
              rpn += firstSep + "[]" + tokenSep + numArgs;
              break

            case dMATRIX:
              rpn += firstSep + "matrix" + tokenSep + numRows + tokenSep + numCols;
              break

            case dCASES:
              tokenSep = "\xa0";
              rpn += tokenSep + "cases" + tokenSep + numRows + tokenSep;
              while (exprStack.length > 0) {
                // Append the expressions that correspond to each condition.
                rpn += exprStack.shift();
              }
              rpn = rpn.slice(0, -1);
              break

            case dVECTORFROMRANGE:
              // [start:step:end]
              rpn += tokenSep + "matrix" + tokenSep + "1" + tokenSep + "1";
              break

            case dDISTRIB:
              // (bottom to top)
              // Do nothing. This is handled by tt.TO above.
              break

            default:
              if (numArgs === 0 && topDelim.open === "[") {
                // Treat as an empty matrix
                rpn += "matrix" + tokenSep + 0 + tokenSep + 0;
              } else if (numArgs === 1 && topDelim.open === "[") {
                rpn += tokenSep + "matrix" + tokenSep + 1 + tokenSep + 1;
              }
              if (rpnOp.symbol === "\\lfloor") { rpn += tokenSep + "⎿⏌"; }
              if (rpnOp.symbol === "\\lceil") { rpn += tokenSep + "⎾⏋"; }
          }
          if ((token.input === ")" && nextCharIsFactor(str, tt.RIGHTBRACKET)) ||
            (token.input === "]" && /^\(/.test(str))) {
            // Implicit multiplication between parens, as in (2)(3)
            // Not between square brackets, as in dict[row][property]
            rpn += tokenSep;
            popRpnTokens(rpnPrecFromType[tt.MULT]);
            rpnStack.push({ prec: rpnPrecFromType[tt.MULT], symbol: "⌧" });
            isFollowedBySpace = false;
          }
        }

        posOfPrevRun = tex.length;
        okToAppend = op.ttype !== tt.BINARY;
        break
      }

      case tt.LEFTRIGHT: {
        // A "|" or "‖" character, which are used as |x|, ‖M‖,  P(A|B),  {x|x ∈ℝ}, |ϕ⟩
        popTexTokens(1, okToAppend);
        const topDelim = delims[delims.length - 1];

        let isRightDelim = false;
        if (texStack.length > 0) {
          isRightDelim =
            texStack[texStack.length - 1].ttype === tt.LEFTRIGHT ||
            texStack[texStack.length - 1].closeDelim === "\u27E9" || // Dirac ket
            texStack[texStack.length - 1].closeDelim === "\\right." ||
            texStack[texStack.length - 1].closeDelim === "\\end{vmatrix}";
        }
        if (isRightDelim) {
          // Treat as a right delimiter
          topDelim.close = token.input === "|" ? "\\vert " : "\\Vert ";
          texStack[texStack.length - 1].closeDelim = topDelim.close;
          popTexTokens(0, okToAppend);
          delims.pop();
          if (isCalc) {
            while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].prec > 0) {
              rpn += tokenSep + rpnStack.pop().symbol;
            }
            rpn += tokenSep + rpnStack.pop().symbol;
          }
          okToAppend = op.ttype !== tt.BINARY;
        } else if (topDelim.delimType === dPAREN && topDelim.name === "{") {
          tex += "\\mid ";
          posOfPrevRun = tex.length;
          okToAppend = true;
        } else {
          // Treat as a left delimiter
          texStack.push({
            prec: 0,
            pos: tex.length,
            ttype: tt.LEFTRIGHT,
            closeDelim: token.input === "|" ? "\\vert " : "\\Vert "
          });

          delims.push({
            delimType: dPAREN,
            name: token.input,
            isTall: false,
            open: token.input === "|" ? "\\vert " : "\\Vert ",
            close: token.input === "|" ? "\\vert " : "\\Vert ",
            numArgs: 1,
            numRows: 1,
            rpnPos: rpn.length,
            isPrecededByDiv: prevToken.ttype === tt.DIV
          });

          if (isCalc) {
            rpnStack.push({ prec: 0, symbol: token.output });
          }

          tex += token.input === "|" ? "\\vert " : "\\Vert ";
          posOfPrevRun = tex.length;
          okToAppend = false;
        }
        break
      }

      case tt.COMMENT:
        popTexTokens(0, true);
        tex += token.output + " ";
        break

      default:
        if (isCalc) {
          rpn += tokenSep;
          popRpnTokens(12);
        }
        popTexTokens(1, okToAppend);
        texStack.push({ prec: 1, pos: tex.length, ttype: tt.ORD, closeDelim: "" });
        if (isCalc) { rpnStack.push({ prec: 12, symbol: token.output }); }
        tex += token.output + " ";
        posOfPrevRun = tex.length;
        okToAppend = true;
    }

    prevToken = cloneToken$1(token);
    isPrecededBySpace = isFollowedBySpace || token.input === "⌧";
  }

  popTexTokens(0, true); // Pop all the remaining close delimiters off the stack.

  if (isCalc) {
    while (rpnStack.length > 0) {
      rpn += tokenSep + rpnStack.pop().symbol;
    }
    const varRegEx = /〖[^ ().]+/g;
    let arr;
    while ((arr = varRegEx.exec(tex)) !== null) {
      if ("¨ˆˉ˙˜".indexOf(arr[0][1]) === -1) {
        const pos = arr.index + arr[0].length;
        if (tex.length > pos && tex.charAt(pos) === "(") {
          // We found a method, not a data index. Delete the 〖
          tex = tex.slice(0, arr.index) + tex.slice(arr.index + 1);
        } else {
          tex = tex.substring(0, pos) + "〗" + tex.substring(pos);
        }
      }
    }
  }

  tex = tex.replace(/ {2,}/g, " "); // Replace multiple spaces with single space.
  tex = tex.replace(/\s+(?=[_^'!)}\]〗])/g, ""); // Delete spaces before right delims
  tex = tex.replace(/\s+$/, ""); //                 Delete trailing space

  if (mustAlign) {
    const pos = tex.indexOf("=");
    tex = "\\begin{aligned}" + tex.slice(0, pos) + "&" + tex.slice(pos) + "\\end{aligned}";
  }

  return isCalc ? [tex, rpn] : tex
};

/*
 * Hurmet operands often have numeric values. Sometimes they are the numbers originally
 * input by the writer, henceforward known as "plain". Sometimes we work instead with
 * values that have been converted to SI base units. It turns out that operands inside
 * evalRpn() can often get by with less information than in the original cell assignment attrs.
 * Some details for various data types:
 *
 * RATIONAL operand: { value: plain, unit: allZeros, dtype: RATIONAL }
 * RATIONAL cell attrs: ditto.
 * Note: "allZeros" is the array of unit-checking exponents for a number: [0,0,0,0,0,0,0,0,0]
 *
 * RATIONAL + QUANTITY unit-unaware operand: same as RATIONAL.
 * RATIONAL + QUANTITY unit-AWARE oprnd: {
 *   value: inBaseUnits, unit: expos, dtype: RATIONAL + QUANTITY
 * }
 * RATIONAL + QUANTITY cell attrs include both of the above and also a `resultdisplay` string.
 *
 * RATIONAL + ROWVECTOR is the same as RATIONAL except the value is an array of plains.
 * RATIONAL + ROWVECTOR + QUANTITY is the same as RATIONAL + QUANTITY except values are arrays.
 * COLUMNVECTOR is the same as ROWVECTOR exept that they are treated differently by operators.
 * MATRIX indicates that values are each an array of row vectors.
 * *
 * A MAP's values are all the same data type and all have the same unit of measure.
 * MAP oprnd: {name, value: see below, unit: {name, factor, gauge, expos}, dtype: dMAP + ...}
 *    where: value is: {name1: value, name2: value} or
 *    where value is: {plain: {name1: value, name2: value},
 *                     inBaseUnits: {name1: value, name2: value},
 *                     etc}
 * A `resultdisplay` string is always in a MAP's cell attrs and sometimes in an operand.
 *
 * ERROR operand: { value: error message, unit: undefined, dtype: ERROR }
 *
 * When this module creates Hurmet operands, it does not make defensive copies of
 * cell attributes. The deep data is referenced. So Hurmet evaluate.js must copy whenever
 * operators or functions might change a cell attribute.
 *
 */

const fromAssignment = (cellAttrs, unitAware) => {
  // Get the value that was assigned to a variable. Load it into an operand.
  if (cellAttrs.value === null) {
    // Return an error message.
    const insert = (cellAttrs.name) ? cellAttrs.name : "?";
    return errorOprnd("NULL", insert)
  }

  const oprnd = Object.create(null);
  oprnd.dtype = cellAttrs.dtype;
  oprnd.name = cellAttrs.name;

  // Get the unit data.
  const dtype = cellAttrs.dtype;
  if (dtype === dt.STRING || dtype === dt.BOOLEAN || dtype === dt.DRAWING ||
      dtype === dt.MODULE || dtype === dt.NULL) {
    oprnd.unit = null;
  } else if (dtype === dt.DATAFRAME || (dtype & dt.MAP)) {
    oprnd.unit = Object.freeze(clone(cellAttrs.unit));
  } else if (cellAttrs.unit && cellAttrs.unit.expos) {
    oprnd.unit = clone(cellAttrs.unit);
  } else if (cellAttrs.unit) {
    oprnd.unit = Object.create(null);
    if (cellAttrs.unit)  { oprnd.unit.name = cellAttrs.unit; }
    if (cellAttrs.expos) { oprnd.unit.expos = clone(cellAttrs.expos); }
  } else if (cellAttrs.expos && Array.isArray(cellAttrs.expos)) {
    oprnd.unit = { expos: clone(cellAttrs.expos) };
  } else {
    oprnd.unit = null;
  }

  // Get the value.
  if (cellAttrs.dtype & dt.QUANTITY) {
    // Here we discard some of the cellAttrs information. In a unit-aware calculation,
    // number, matrix, and map operands contain only the value.inBaseUnits.
    oprnd.value = Object.freeze(unitAware
      ? clone(cellAttrs.value.inBaseUnits)
      : clone(cellAttrs.value.plain)
    );
    oprnd.dtype = cellAttrs.dtype - dt.QUANTITY;

  } else if (cellAttrs.dtype === dt.STRING) {
    const str = cellAttrs.value;
    const ch = str.charAt(0);
    const chEnd = str.charAt(str.length - 1);
    oprnd.value = ch === '"' && chEnd === '"' ? str.slice(1, -1).trim() : str.trim();

  } else if (cellAttrs.dtype === dt.DATAFRAME) {
    // For data frames, Hurmet employs copy-on-write tactics.
    // So at this point, we can pass a reference to the value
    oprnd.value = cellAttrs.value;

    // Note the only operations on data frames are: (1) access, and (2) concatenate.
    // That's where the copy-on-write takes place.

  } else {
    // For all other data types, we employ copy-on-read. So we return a deep copy from here.
    oprnd.value = clone(cellAttrs.value);
  }

  return Object.freeze(oprnd)
};

function propertyFromDotAccessor(parent, index, vars, unitAware) {
  const property = Object.create(null);
  if (parent.dtype & dt.MAP) {
    return map.valueFromMap(parent, [index], unitAware)

  } else if (parent.dtype & dt.DATAFRAME) {
    return DataFrame.range(parent, [index], vars, unitAware)

  } else if ((parent.dtype === dt.STRING || (parent.dtype & dt.ARRAY)) &&
    index.dtype === dt.RATIONAL) {
    const indexVal = Rnl.toNumber(index.value);
    property.value = parent.value.slice(indexVal - 1, indexVal);
    property.unit = parent.unit;
    property.dtype = parent.dtype;
    return property

  } else if ((parent.dtype === dt.STRING || (parent.dtype & dt.ARRAY)) &&
        index.dtype === dt.RANGE) {
    const start = index.value[0] - 1;
    const step = index.value[1];
    const end = (index.value[2] === "∞") ? parent.value.length : index.value[2];
    property.unit = parent.unit;
    property.dtype = parent.dtype;
    if (step === 1) {
      property.value = parent.value.slice(start, end);
    } else {
      property.value = [];
      for (let j = start; j < end; j += step) {
        property.value.push(parent.value[j]);
      }
    }
    return property

  } else if (parent.dtype === dt.MODULE) {
    // parent is a module and index has a value assigned to it.
    return fromAssignment(parent.value[index.value], unitAware)

  } else {
    return errorOprnd("NO_PROP", parent.name)
  }
}

const display$4 = (tuple, formatSpec = "h3", decimalFormat = "1,000,000.") => {
  if (tuple.size === 0) { return "" }
  let str = "\\begin{array}{c}";

  let haveUnits = false;
  for (const attrs of tuple.values()) {
    if (attrs.unit && attrs.unit.name) { haveUnits = true; break }
  }

  // Write the unit names
  if (haveUnits) {
    let rowTex = "";
    for (const attrs of tuple.values()) {
      if (attrs.unit && attrs.unit.name) {
        rowTex += unitTeXFromString(attrs.unit.name).replace("\\;\\, ", "");
      }
      rowTex += "&";
    }
    str += rowTex.slice(0, -1) + " \\\\ ";
    str += "\\hline ";
  }

  // Write the data
  let botRow = "";
  for (const attrs of tuple.values()) {
    botRow += format(attrs.value, formatSpec, decimalFormat) + " & ";
  }
  str += botRow.slice(0, -1);
  str += "\\end{array}";
  return str
};

const displayAlt$3 = (tuple, formatSpec = "h3") => {
  if (tuple.size === 0) { return "" }
  let str = "``";

  let haveUnits = false;
  for (const attrs of tuple.values()) {
    if (attrs.unit && attrs.unit.name) { haveUnits = true; break }
  }

  // Write the unit names
  if (haveUnits) {
    let rowTex = "";
    for (const attrs of tuple.values()) {
      if (attrs.unit && attrs.unit.name) {
        rowTex += attrs.unit.name;
      }
      rowTex += " | ";
    }
    str += rowTex.slice(0, -3) + "\n";
  }

  // Write the data
  let botRow = "";
  for (const attrs of tuple.values()) {
    botRow += format(attrs.value, formatSpec, "100000.") + " | ";
  }
  str = botRow.slice(0, -3);
  return str + "``"
};

const Tuple = Object.freeze({
  display: display$4,
  displayAlt: displayAlt$3
});

// A result has been sent here from evaluate.js or updateCalculations.js.
// Format the result for display.

const numMisMatchError = _ => {
  const str = "Error. Mismatch in number of multiple assignment.";
  return [`\\color{firebrick}\\text{${str}}`, str]
};

const formatResult = (stmt, result, formatSpec, decimalFormat, isUnitAware) => {
  if (!result) { return stmt }

  if (result.dtype === dt.DRAWING) {
    stmt.resultdisplay = result.value;
    delete stmt.resultdisplay.temp;
    return stmt
  }

  const numNames = !stmt.name
    ? 0
    : !Array.isArray(stmt.name)
    ? 1
    : stmt.name.length;

  if (stmt.resulttemplate.indexOf("?") > -1 ||
      stmt.resulttemplate.indexOf("!") > -1 ||
      stmt.resulttemplate.indexOf("@") > -1 ||
      stmt.resulttemplate.indexOf("%") > -1) {
    stmt.value = result.value;
    let resultDisplay = "";
    let altResultDisplay = "";
    if (stmt.resulttemplate.indexOf("!") > -1) {
      // Suppress display of the result
      resultDisplay = "";
      altResultDisplay = "";
      return stmt

    } else if (isMatrix(result) && (result.dtype & dt.MAP)) {
      resultDisplay = Matrix.displayMapOfVectors(result.value, formatSpec, decimalFormat);
      altResultDisplay = Matrix.displayAltMapOfVectors(result.value,
        formatSpec, decimalFormat);

    } else if (isMatrix(result)) {
      resultDisplay = Matrix.display(
        isUnitAware ? { value: result.value.plain, dtype: result.dtype } : result,
        formatSpec,
        decimalFormat
      );
      altResultDisplay = Matrix.displayAlt(
        isUnitAware ? { value: result.value.plain, dtype: result.dtype } : result,
        formatSpec,
        decimalFormat
      );

    } else if (result.dtype === dt.DATAFRAME) {
      if (numNames > 1 && numNames !== result.value.data.length) {
        [resultDisplay, altResultDisplay] = numMisMatchError();
      } else {
        const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1;
        resultDisplay = DataFrame.display(result.value, formatSpec,
                                          decimalFormat, omitHeading);
        altResultDisplay = DataFrame.displayAlt(result.value, formatSpec, omitHeading);
      }

    } else if (result.dtype & dt.MAP) {
      const mapSize = (stmt.dtype & dt.QUANTITY) ? result.value.plain.size : result.value.size;
      if (numNames > 1 && numNames !== mapSize) {
        [resultDisplay, altResultDisplay] = numMisMatchError();
      } else {
        const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1;
        resultDisplay = map.display(result, formatSpec, decimalFormat, omitHeading);
        altResultDisplay = map.displayAlt(result, formatSpec, decimalFormat, omitHeading);
      }

    } else if (result.dtype === dt.TUPLE) {
      if (numNames > 1 && numNames !== result.length) {
        [resultDisplay, altResultDisplay] = numMisMatchError();
      } else {
        resultDisplay = Tuple.display(result.value, formatSpec, decimalFormat);
        altResultDisplay = Tuple.displayAlt(result.value, formatSpec);
      }

    } else if (result.dtype & dt.STRING) {
      resultDisplay = "\\text{" + addTextEscapes(result.value) + "}";
      if (result.unit) {
        // This is a hack to return a color
        resultDisplay = `\\textcolor{${result.unit}}{${resultDisplay}}`;
      }
      altResultDisplay = result.value;

    } else if (result.dtype & dt.RICHTEXT) {
      resultDisplay = parse(result.value, decimalFormat, false);
      altResultDisplay = result.value;

    } else if (result.dtype & dt.BOOLEAN) {
      resultDisplay = "\\text{" + result.value + "}";
      altResultDisplay = String(result.value);

    } else if (result.dtype === dt.COMPLEX) {
      const z = result.value;
      [resultDisplay, altResultDisplay] = Cpx.display(z, formatSpec, decimalFormat);
/*        const complexSpec = /[j∠°]/.test(formatSpec) ? formatSpec.slice(-1) : "j"
      if (complexSpec === "j") {
        const real = format(z[0], formatSpec, decimalFormat)
        let im = format(z[1], formatSpec, decimalFormat)
        if (im.charAt(0) === "-") { im = "(" + im + ")" }
        resultDisplay = real + " + j" + im
        altResultDisplay = real + " + j" + im
      } else {
        const mag = Rnl.hypot(z[0], z[1])
        let angle = Cpx.argument(result.value)
        if (complexSpec === "°") {
          angle = Rnl.divide(Rnl.multiply(angle, Rnl.fromNumber(180)), Rnl.pi)
        }
        resultDisplay = format(mag, formatSpec, decimalFormat) + "∠" +
                        format(angle, formatSpec, decimalFormat) +
                        (complexSpec === "°" ? "°" : "")
        altResultDisplay = resultDisplay
      } */

    } else if (result.value.plain) {
      resultDisplay = format(result.value.plain, formatSpec, decimalFormat);
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\\color{firebrick}\\text{" + resultDisplay.value + "}";
        altResultDisplay = resultDisplay.value;
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "");
      }

    } else if (Rnl.isRational(result.value)) {
      resultDisplay = format(result.value, formatSpec, decimalFormat);
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\\color{firebrick}\\text{" + resultDisplay.value + "}";
        altResultDisplay = resultDisplay.value;
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "");
      }

    } else if (result.dtype === dt.IMAGE) {
      return stmt

    } else {
      resultDisplay = result.value;
      altResultDisplay = resultDisplay;

    }

    // Write the string to be plugged into echos of dependent nodes
    stmt.resultdisplay = stmt.resulttemplate.replace(/(\? *\??|@ *@?|%%?)/, resultDisplay);

    // Write the TeX for this node
    if (stmt.resulttemplate.indexOf("@") > -1) {
      stmt.tex = stmt.resultdisplay;
      stmt.alt = stmt.altresulttemplate.replace(/@@?/, altResultDisplay);
    } else if (stmt.resulttemplate.indexOf("?") > -1) {
      let pos = stmt.tex.lastIndexOf("?");
      stmt.tex = stmt.tex.slice(0, pos).replace(/\? *$/, "") + resultDisplay + stmt.tex.slice(pos + 1);
      pos = stmt.alt.lastIndexOf("?");
      stmt.alt = stmt.alt.slice(0, pos).replace(/\? *$/, "") + altResultDisplay + stmt.alt.slice(pos + 1);
    } else if (stmt.resulttemplate.indexOf("%") > -1) {
      let pos = stmt.tex.lastIndexOf("%");
      stmt.tex = stmt.tex.slice(0, pos).replace(/% *$/, "") + resultDisplay + stmt.tex.slice(pos + 1);
      pos = stmt.alt.lastIndexOf("%");
      stmt.alt = stmt.alt.slice(0, pos).replace(/% *$/, "") + altResultDisplay + stmt.alt.slice(pos + 1);
    }
  }
  return stmt
};

/*
 *  This module receives a TeX template string and a object containing Hurmet variables.
 *  At each location where the template contains a variable, this module plugs in a TeX string
 *  of the variable's value, for display in the Hurmet blue echo..
 */

const varRegEx = /〖[^〗]*〗/;
const openParenRegEx$1 = /([([{|‖]|[^\\][,;:])$/;

const plugValsIntoEcho = (str, vars, unitAware, formatSpec, decimalFormat) => {
  // For each variable name in the echo string, substitute a value.
  // The parser surrounded those names with 〖〗 delimiters.
  let match;
  while ((match = varRegEx.exec(str)) !== null) {
    const varName = match[0].replace(/[〖〗()]/g, "").trim().replace(/'/g, "′");
    const matchLength = match[0].length;
    const pos = match.index;
    let hvar;
    let display = "";

    if (varName.indexOf(".") > -1) {
      // Object with a dot accessor.
      const names = varName.split(".");
      const parentName = names[0];
      if (!vars[parentName]) { return errorOprnd("V_NAME", parentName) }
      hvar = vars[parentName];
      if (hvar.dtype === dt.DATAFRAME && names.length === 2) {
        // This is a dataframe.dict. I don't want to write an entire dictionary into
        // a blue echo, so display just the names.
        display = "\\mathrm{" + vars[names[0]].name + "{.}\\mathrm{" + names[1] + "}";
        return str.substring(0, pos) + display + str.substring(pos + matchLength)
      } else {
        // we want to display the property value.
        for (let i = 1; i < names.length; i++) {
          const propName = names[i].replace("}", "").replace("\\mathrm{", "").trim();
          const indexOprnd = { value: propName, unit: null, dtype: dt.STRING };
          hvar = propertyFromDotAccessor(hvar, indexOprnd, vars, unitAware);
          if (!hvar) { return errorOprnd("V_NAME", propName) }
          const stmt = { resulttemplate: "@", altresulttemplate: "@" };
          hvar.resultdisplay = formatResult(stmt, hvar, formatSpec,
                decimalFormat).resultdisplay;
        }
      }
    } else if (!vars[varName] && varName === "T") {
      // Transposed matrix
      hvar = { dtype: dt.RATIONAL, resultdisplay: "\\text{T}" };
    } else if (varName === "e" && /^\^/.test(str.slice(pos + 3).trim())) {
      // e^x
      str = str.substring(0, pos) + "e" + str.substring(pos + matchLength);
      continue
    } else if (!vars[varName]) {
      return errorOprnd("V_NAME", varName)
    } else {
      // Get a clone in order to avoid mutating the inner properties of vars.
      hvar = {
        dtype: vars[varName].dtype,
        resultdisplay: vars[varName].resultdisplay
      };
    }

    if (!hvar || !hvar.resultdisplay) {
      const insert = (varName) ? varName : "?";
      return errorOprnd("NULL", insert)
    } else if (hvar.error) {
      return errorOprnd("NULL", varName)
    }

    let needsParens = true; // default
    if (isMatrix(hvar) || (hvar.dtype & dt.DATAFRAME)) { needsParens = false; }
    if (unitAware && (hvar.dtype & dt.QUANTITY)) { needsParens = true; }

    let isParened = false; // Is the match already nested inside parens?
    if (pos > 0) {
      const pStr = str.slice(0, pos).trim();
      if (openParenRegEx$1.test(pStr)) {
        const fStr = str.slice(pos + varName.length + 2).trim();
        isParened = fStr.length > 0 && /^([)|‖\]},;:]|\\right)/.test(fStr);
      } else if (/^\\begin{[bp]matrix}/.test(hvar.resultdisplay)) {
        isParened = /\\end{[bp]matrix}$/.test(hvar.resultdisplay);
      }
    }
    needsParens = needsParens && !isParened;

    if (hvar.dtype === dt.DATAFRAME || (hvar.dtype & dt.MAP)) {
      display = "\\mathrm{" + vars[varName].name + "}";
    } else if (unitAware) {
      display = needsParens ? "\\left(" + hvar.resultdisplay + "\\right)" : hvar.resultdisplay;
    } else {
      let displaySansUnits = hvar.resultdisplay;
      const posUnit = hvar.resultdisplay.lastIndexOf("{\\text{");
      if (posUnit > -1) {
        displaySansUnits = hvar.resultdisplay.slice(0, posUnit).trim();
        displaySansUnits = displaySansUnits.replace(/\\; *$/, "").trim();
      }
      display = needsParens ? "\\left(" + displaySansUnits + "\\right)" : displaySansUnits;
    }
    str = str.substring(0, pos) + display + str.substring(pos + matchLength);
  }
  return str
};

const negativeOne = Object.freeze(Rnl.negate(Rnl.one));
const oneHalf = [BigInt(1), BigInt(2)];
const thirty = [BigInt(30), BigInt(1)];
const fortyFive = [BigInt(45), BigInt(1)];
const sixty = [BigInt(60), BigInt(1)];
const ninety = [BigInt(90), BigInt(1)];
const halfPi = Object.freeze(Rnl.divide(Rnl.pi, Rnl.two));

const functionExpos = (functionName, args) => {
  const numArgs = args.length;

  const expos = numArgs === 1 ? args[0].unit.expos : null;

  switch (functionName) {
    case "abs":
    case "round":
    case "roundn":
    case "sign":
    case "trace":
    case "fetch":
      return expos

    case "cos":
    case "sin":
    case "tan":
    case "sec":
    case "csc":
    case "cot":
    case "acos":
    case "arccos":
    case "asin":
    case "arcsin":
    case "atan":
    case "arctan":
    case "asec":
    case "arcsec":
    case "acsc":
    case "arccsc":
    case "acot":
    case "arccot":
    case "cosd":
    case "sind":
    case "tand":
    case "secd":
    case "cscd":
    case "cotd":
    case "acosd":
    case "asind":
    case "atand":
    case "asecd":
    case "acscd":
    case "acotd":
    case "gud":
      if (!unitsAreCompatible(expos, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return allZeros

    case "exp":
    case "log":
    case "ln":
    case "log10":
    case "log2":
    case "logn":
    case "cosh":
    case "sinh":
    case "tanh":
    case "sech":
    case "csch":
    case "coth":
    case "acosh":
    case "asinh":
    case "atanh":
    case "asech":
    case "acsch":
    case "acoth":
    case "binomial":
    case "gamma":
    case "Γ":
    case "logΓ":
    case "logFactorial":
      if (!unitsAreCompatible(expos, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return allZeros

    case "sqrt":
      return expos.map(e => e / 2)

    case "gcd":
    case "mht":
      if (!unitsAreCompatible(expos, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return functionName === "hmt" ? [1, 0, 0, 0, 0, 0, 0, 0] : allZeros

    case "atan2":
    case "hypot":
    case "rms":
    case "sum":
    case "mean":
    case "median":
    case "min":
    case "max":
    case "range":
    case "stddev":
    case "variance": {
      const x = args[0].unit.expos;
      for (let i = 1; i < args.length; i++) {
        const y = args[i].unit.expos;
        if (x.length !== y.length) { return errorOprnd("UNIT_ARG", functionName) }
        for (let j = 0; j < x.length; j++) {
          if (x[j] !== y[j]) { return errorOprnd("UNIT_ARG", functionName) }
        }
      }
      return functionName === "atan2" ? allZeros : x
    }

    case "Re":
    case "Im":
    case "argument":
      return allZeros

    case "product": {
      const expos = clone(args[0].unit.expos);
      for (let i = 1; i < args.length; i++) {
        const p = args[i].unit.expos;
        expos.map((e, j) => e + p[j]);
      }
      return expos
    }

    default:
      return errorOprnd("F_NAME", functionName)
  }
};

const gamma = x => {
  if (Rnl.isZero(x)) {
    return errorOprnd("Γ0")
  } else if (Rnl.isPositive(x) && Rnl.isInteger(x) && Rnl.lessThan(x, Rnl.fromNumber(101))) {
    return Rnl.factorial(Rnl.subtract(x, Rnl.one))
  } else if (Rnl.isNegative(x) && Rnl.isInteger(x)) {
    return errorOprnd("ΓPOLE")
  } else if (Rnl.lessThan(x, oneHalf)) {
    // reflection formula
    return Rnl.fromNumber(Math.PI / (Math.sin(Math.PI * Rnl.toNumber(x)))
      * Rnl.toNumber(gamma(Rnl.subtract(Rnl.one, x))))
  } else {
    return Rnl.lanczos(x)
  }
};

const logΓ = r => {
  // logGamma function. Returns natural logarithm of the Gamma function.
  // Ref: https://www.johndcook.com/blog/2010/08/16/how-to-compute-log-factorial/
  if (Rnl.isZero(r)) { return errorOprnd("Γ0") }
  if (Rnl.isNegative(r)) { return errorOprnd("LOGΓ") }
  if (Rnl.areEqual(r, Rnl.one) || Rnl.areEqual(r, Rnl.two)) { return Rnl.zero }
  if (Rnl.lessThanOrEqualTo(r, Rnl.fromNumber(14))) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(gamma(r))))
  } else {
    const x = Rnl.toNumber(r);
    // eslint-disable-next-line max-len
    const y = (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + 1 / (12 * x) - 1 / (360 * x ** 3) + 1 / (1260 * x ** 5) - 1 / (1680 * x ** 7) + 5 / (540 * x ** 9);
    //  Error bounded by: -691/(360360 * x^11), 16 significant digits
    return Rnl.fromNumber(y)
  }
};

const binomial = (n, k) => {
  // (n \atop k) = n! / (k! (n - k)!)
  //             = exp(log!(n) - [log!(k) + log!(n - k)])
  if (Rnl.areEqual(n, k)) { return Rnl.one }
  if (Rnl.isZero(n)) { return Rnl.zero }
  if (Rnl.isNegative(k)) { return Rnl.zero }
  if (Rnl.lessThan(n, k)) { return Rnl.zero }

  if (Rnl.isInteger(n) && Rnl.isInteger(k) && Rnl.isPositive(n) && Rnl.isPositive(k)) {
    // positive integers
//    if (Rnl.lessThan(n, twenty)) {
    return Rnl.divide(Rnl.factorial(n),
      Rnl.multiply(Rnl.factorial(k), Rnl.factorial(Rnl.subtract(n, k))))
//    } else {
//      return Rnl.fromNumber(Math.round(Math.exp(Rnl.toNumber(
//        Rnl.subtract(logFactorial(n),
//          Rnl.add(logFactorial(k), logFactorial(Rnl.subtract(n, k))))))))
//    }

  } else if (Rnl.isInteger(n) && Rnl.isInteger(k) && Rnl.isPositive(k)) {
    // negative integer n
    // (-n \atop k) = (-1)^k * multiset(n, k)
    return Rnl.multiply(Rnl.power(negativeOne, k), multiset(Rnl.negate(n), k))

  } else {
    // generalized for real or complex arguments
    // (x \atop y) = Γ(x+1) / ( Γ(y+1) Γ(x-y+1) )
    return Rnl.divide(
      gamma(Rnl.increment(n)),
      Rnl.multiply(gamma(Rnl.increment(k)), gamma(Rnl.increment(Rnl.subtract(n, k))))
    )

  }
};

const multiset = (n, k) => {
  // ((n \atop k)) = ((n+k-1) \atop k)
  // multiset(n, k) = binomial(n+k-1, k)
  return binomial(Rnl.add(n, Rnl.decrement(k)), k)
};

const piOver180 = Rnl.divide(Rnl.pi, [BigInt(180), BigInt(1)]);

const unary = {
  scalar: {
    // Functions that take one real argument.
    abs(x)  { return Rnl.abs(x) },
    argument(x) { return errorOprnd("NA_REAL", "argument") },
    Re(x)   { return errorOprnd("NA_REAL", "Re") },
    Im(x)   { return errorOprnd("NA_REAL", "Im") },
    cos(x)  { return Rnl.cos(x) },
    sin(x)  { return Rnl.sin(x) },
    tan(x)  { return Rnl.tan(x) },
    cosh(x) { return Rnl.cosh(x) },
    sinh(x) { return Rnl.sinh(x) },
    tanh(x) { return Rnl.tanh(x) },
    acos(x) {
      if (Rnl.greaterThan(Rnl.abs(x), Rnl.one)) { return errorOprnd("ATRIG", "acos") }
      return Rnl.fromNumber(Math.acos(Rnl.toNumber(x)))
    },
    asin(x) {
      if (Rnl.greaterThan(Rnl.abs(x), Rnl.one)) { return errorOprnd("ATRIG", "asin") }
      return Rnl.fromNumber(Math.asin(Rnl.toNumber(x)))
    },
    atan(x) {
      return Rnl.fromNumber(Math.atan(Rnl.toNumber(x)))
    },
    sec(x) {
      return Rnl.fromNumber(1 / Math.cos(Rnl.toNumber(x)))
    },
    csc(x) {
      return Rnl.fromNumber(1 / Math.sin(Rnl.toNumber(x)))
    },
    cot(x) {
      if (Rnl.isZero(x)) { return errorOprnd("COT", "cotangent") }
      return  Rnl.fromNumber(1 / Math.tan(Rnl.toNumber(x)))
    },
    asec(x) {
      if (Rnl.greaterThanOrEqualTo(Rnl.abs(x), Rnl.one)) {
        return errorOprnd("ASEC", "arcecant")
      }
      const temp = Math.atn(Math.sqrt(Rnl.toNumber(Rnl.decrement(Rnl.multiply(x, x)))));
      return  (Rnl.isPositive(x))
        ? Rnl.fromNumber(temp)
        : Rnl.fromNumber(temp - Math.PI)
    },
    acot(x) {
      if (Rnl.greaterThanOrEqualTo(Rnl.abs(x), Rnl.one)) {
        return errorOprnd("ASEC", "acot")
      }
      const temp = Math.atn(1 / (Math.sqrt(Rnl.toNumber(Rnl.decrement(Rnl.multiply(x, x))))));
      return (Rnl.isPositive(x))
        ? Rnl.fromNumber(temp)
        : Rnl.fromNumber(temp - Math.PI)
    },
    acsc(x) {
      return Rnl.fromNumber(Math.atn(-Rnl.toNumber(x)) + Math.PI)
    },
    exp(x) {
      return Rnl.exp(x)
    },
    log(x) {
      return Rnl.isZero(x) ? errorOprnd("LOG_ZERO") : Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
    },
    ln(x) {
      return Rnl.isZero(x) ? errorOprnd("LOG_ZERO") : Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
    },
    log10(x) {
      return Rnl.isZero(x)
        ? errorOprnd("LOG_ZERO")
        : Rnl.fromNumber(Math.log10(Rnl.toNumber(x)))
    },
    log2(x) {
      return Rnl.isZero(x)
        ? errorOprnd("LOG_ZERO")
        : Rnl.fromNumber(Math.log2(Rnl.toNumber(x)))
    },
    sech(x) {
      // sech(n) = 2 / (eⁿ + e⁻ⁿ)
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(2 / (Math.exp(num) + Math.exp(-num)))
    },
    csch(x) {
      // csch(n) = 2 / (eⁿ - e⁻ⁿ)
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(2 / (Math.exp(num) - Math.exp(-num)))
    },
    coth(x) {
      // coth(n) = (eⁿ + e⁻ⁿ) / (eⁿ - e⁻ⁿ)
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(
        (Math.exp(num) + Math.exp(-num)) / (Math.exp(num) - Math.exp(-num))
      )
    },
    acosh(x) {
      // acosh(x) = log( x + sqrt(x - 1) × sqrt(x + 1) )
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(Math.log( num + Math.sqrt(num - 1) * Math.sqrt(num + 1) ))
    },
    asinh(x) {
      // asinh(x) = log(x + sqrt(x² + 1))
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(Math.log(num + Math.sqrt(Math.pow(num, 2) + 1)))
    },
    atanh(x) {
      // atanh(x) = [ log(1+x) - log(1-x) ] / 2
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber((Math.log(1 + num) - Math.log(1 - num) ) / 2)
    },
    asech(x) {
      // asech(x) = log( [sqrt(-x * x + 1) + 1] / x )
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(Math.log((Math.sqrt(-num * num + 1) + 1) / num))
    },
    ascsh(x) {
      // acsch(x) = log( sqrt(1 + 1/x²) + 1/x )
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber(Math.log(Math.sqrt(1 + 1 / Math.pow(num, 2)) + 1 / num))
    },
    acoth(x) {
      // acoth(x) = [ log(1 + 1/x) - log(1 - 1/x) ] / 2
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x);
      return Rnl.fromNumber((Math.log(1 + 1 / num) - Math.log(1 - 1 / num)) / 2)
    },
    Gamma(x) {
      return gamma(x)
    },
    Γ(x) {
      return gamma(x)
    },
    logΓ(x) {
      if (Rnl.isNegative(x) || Rnl.isZero(x)) { return errorOprnd("LOGΓ") }
      return logΓ(x)
    },
    logFactorial(x) {
      if (Rnl.isNegative(x) || !Rnl.isInteger(x)) { return errorOprnd("FACT") }
      return logΓ(Rnl.add(x, Rnl.one))
    },
    sign(x) {
      return Rnl.isPositive(x) ? Rnl.one : Rnl.isZero(x) ? Rnl.zero : negativeOne
    },
    cosd(x) {
      if (Rnl.areEqual(x, ninety)) { return Rnl.zero }
      if (Rnl.areEqual(x, sixty)) { return oneHalf }
      return this.cos(Rnl.multiply(x, piOver180))
    },
    sind(x) {
      if (Rnl.areEqual(x, thirty)) { return oneHalf }
      return this.sin(Rnl.multiply(x, piOver180))
    },
    tand(x) {
      if (Rnl.areEqual(x, fortyFive)) { return Rnl.one }
      if (Rnl.areEqual(x, ninety)) { return errorOprnd("TAN90", "90°") }
      return this.tan(Rnl.multiply(x, piOver180))
    },
    cotd(x) {
      return this.cot(Rnl.multiply(x, piOver180))
    },
    cscd(x) {
      return this.csc(Rnl.multiply(x, piOver180))
    },
    secd(x) {
      return this.sec(Rnl.multiply(x, piOver180))
    },
    acosd(x) {
      const y = this.acos(x);
      return y.dtype ? y : Rnl.divide(y, piOver180)
    },
    asind(x) {
      const y = this.asin(x);
      return y.dtype ? y : Rnl.divide(y, piOver180)
    },
    atand(x) {
      return Rnl.divide(this.atan(x), piOver180)
    },
    acotd(x) {
      const y = this.acot(x);
      return y.dtype ? y : Rnl.divide(y, piOver180)
    },
    acscd(x) {
      const y = this.acsc(x);
      return y.dtype ? y : Rnl.divide(y, piOver180)
    },
    asecd(x) {
      const y = this.asec(x);
      return y.dtype ? y : Rnl.divide(y, piOver180)
    },
    chr(x) {
      return String.fromCodePoint(Number(x))
    },
    sqrt(x) {
      const y = [BigInt(1), BigInt(2)];
      return Cpx.isComplex(x) || (Rnl.isNegative(x))
          ? Cpx.power([x, Rnl.zero], y)
          : Rnl.power(x, y)
    },
    round(x) {
      return Rnl.fromString(Rnl.toString(x, 0))
    }
  },
  complex: {
    // Functions that take one complex argument.
    abs(z)      { return Cpx.abs(z) },
    argument(z) { return Cpx.argument(z) },
    Re(z)       { return z[0] },
    Im(z)       { return z[1] },
    cos(z)      { return Cpx.cos(z) },
    sin(z)      { return Cpx.sin(z) },
    asin(z)     { return Cpx.asin(z) },
    atan(z)     { return Cpx.atan(z) },
    acos(z)     { return Cpx.subtract([halfPi, Rnl.zero], Cpx.asin(z))}, // π/2 - arcsin(z)
    tan(z)      { return Cpx.divide(Cpx.sin(z), Cpx.cos(z)) },
    cot(z)      { return Cpx.divide(Cpx.cos(z), Cpx.sin(z)) },
    sec(z) {
      const c = Cpx.cos(z);
      return c.dtype ? c : Cpx.inverse(c)
    },
    csc(z) {
      const s = Cpx.sin(z);
      return s.dtype ? s : Cpx.inverse(s)
    },
    asec(z) {
      // acos(inverse(z))
      const inv = Cpx.inverse(z);
      return Cpx.subtract([halfPi, Rnl.zero], Cpx.asin(inv))
    },
    acot(z) { return Cpx.atan(Cpx.inverse(z)) },
    acsc(z) {
      return Cpx.asin(Cpx.inverse(z))
    },
    exp(z) {
      return Cpx.exp(z)
    },
    log(z) {
      return Cpx.log(z)
    },
    ln(z) {
      return Cpx.log(z)
    },
    log10(z) {
      return Rnl.fromNumber(Math.log10(Rnl.toNumber(z)))
    },
    log2(z) {
      return Rnl.fromNumber(Math.log2(Rnl.toNumber(z)))
    },
    cosh(z) {
      // cosh(z) = (eᶻ + e⁻ᶻ) / 2
      return Cpx.divide(Cpx.add(Cpx.exp(z), Cpx.exp(Cpx.negate(z))), [Rnl.two, Rnl.zero])
    },
    sinh(z) {
      // sinh(z) = (eᶻ - e⁻ᶻ) / 2
      return Cpx.divide(Cpx.subtract(Cpx.exp(z), Cpx.exp(Cpx.negate(z))), [Rnl.two, Rnl.zero])
    },
    tanh(z) {
      // tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)
      const ez = Cpx.exp(z);
      const eMinuxZ = Cpx.exp(Cpx.negate(z));
      return Cpx.divide(Cpx.subtract(ez, eMinuxZ), Cpx.add(ez, eMinuxZ))
    },
    sech(z) {
      // sech(z) = 2 / (eᶻ + e⁻ᶻ)
      return Cpx.divide([Rnl.two, Rnl.zero], Cpx.add(Cpx.exp(z), Cpx.exp(Cpx.negate(z))))
    },
    csch(z) {
      // csch(z) = 2 / (eᶻ - e⁻ᶻ)
      return Cpx.divide([Rnl.two, Rnl.zero], Cpx.subtract(Cpx.exp(z), Cpx.exp(Cpx.negate(z))))
    },
    coth(z) {
      // coth(z) = (eᶻ + e⁻ᶻ) / (eᶻ - e⁻ᶻ)
      const ez = Cpx.exp(z);
      const eMinuxZ = Cpx.exp(Cpx.negate(z));
      return Cpx.divide(Cpx.add(ez, eMinuxZ), Cpx.subtract(ez, eMinuxZ))
    },
    acosh(z) {
      return Cpx.acosh(z)
    },
    asinh(z) {
      return Cpx.asinh(z)
    },
    atanh(z) {
      return Cpx.atanh(z)
    },
    asech(z) {
      return Cpx.acosh(Cpx.inverse(z))
    },
    acsch(z) {
      return Cpx.asinh(Cpx.inverse(z))
    },
    acoth(z) {
      return Cpx.atanh(Cpx.inverse(z))
    },
    Gamma(z) {
      return Cpx.gamma(z)
    },
    Γ(z) {
      return Cpx.gamma(z)
    },
    logΓ(z) {
      // TODO: complex logΓ
      return errorOprnd("NA_COMPL_OP", "logΓ")
    },
    sign(z) {
      if (Rnl.isZero(z[1]) && Rnl.isPositive(z[0])) {
        return Rnl.one
      } else if (Rnl.isZero(z[1]) && Rnl.isNegative(z[0])) {
        return Rnl.negate(Rnl.one)
      } else {
        return Cpx.divide(z, [Cpx.abs(z), Rnl.zero])
      }
    },
    round(z) {
      // TODO: complex round function
      return errorOprnd("NA_COMPL_OP", "round")
    }
  }
};

const binary = {
  logn([n, x]) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(x)) / Math.log(Rnl.toNumber(n)))
  },
  roundFixed([x, n]) {
    return Rnl.fromString(Rnl.toString(x, n))
  },
  roundSignificant([x, n]) {
    return Rnl.fromString(Rnl.toStringSignificant(x, n))
  },
  stringFixed([x, n]) {
    return Rnl.toString(x, n)
  },
  stringSignificant([x, n]) {
    return Rnl.toStringSignificant(x, n)
  },
  atan2([x, y]) {
    return Rnl.fromNumber(Math.atan2(Rnl.toNumber(y), Rnl.toNumber(x)))
  },
  hypot([x, y]) {
    // sqrt(x^2)
    // https://www.johndcook.com/blog/2010/06/02/whats-so-hard-about-finding-a-hypotenuse/
    const max = Rnl.max(x, y);
    const r = Rnl.divide(Rnl.min(x, y), max);
    return Rnl.multiply(max, Rnl.sqrt(Rnl.increment(Rnl.multiply(r, r))))
  },
  gcd([m, n]) {
    return Rnl.gcd(m, n)
  },
  rms([x, y]) {
    return this.hypot(x, y)
  },
  binomial([x, y]) {
    return binomial(x, y)
  },
  zeros([m, n]) {
    return Matrix.zeros(Rnl.toNumber(m), Rnl.toNumber(n))
  }
};

const reduce = {
  max(list) {
    return list.reduce((max, e) => Rnl.max(max, e))
  },
  min(list) {
    return list.reduce((min, e) => Rnl.min(min, e))
  },
  sum(list) {
    return list.reduce((sum, e) => Rnl.add(sum, e))
  },
  product(list) {
    return list.reduce((sum, e) => Rnl.multiply(sum, e))
  },
  mean(list) {
    const sum = this.sum(list);
    return Rnl.divide(sum, Rnl.fromNumber(list.length))
  },
  median(list) {
    const max = this.max(list);
    const min = this.min(list);
    return Rnl.divide(Rnl.add(max, min), Rnl.two)
  },
  range(list) {
    return Rnl.subtract(this.max(list), this.min(list))
  },
  variance(list) {
    const sum = this.sum(list);
    const mean = Rnl.divide(sum, Rnl.fromNumber(list.length));
    const num = list.reduce((num, e) => Rnl.add(num, Rnl.pow(Rnl.subtract(e, mean), Rnl.two)));
    return Rnl.divide(num, Rnl.subtract(Rnl.fromNumber(list.length), Rnl.one))
  },
  stddev(list) {
    const variance = this.variance(list);
    return Rnl.power(variance, oneHalf)
  },
  accumulate(list) {
    const v = new Array(list.length).fill(0);
    v[0] = list[0];
    for (let i = 1; i < list.length; i++) {
      v[i] = Rnl.add(v[i - 1], list[i]);
    }
    return v
  }
};

const lerp = (args, unitAware) => {
  // linear interpolation
  for (let i = 0; i < 3; i++) {
    if (!(args[i].dtype & dt.RATIONAL)) { return errorOprnd("") }
  }
  let expos = allZeros;
  if (unitAware) {
    if (args[0].expos !== args[1].expos) { return errorOprnd("") }
    if (args[1].expos !== args[2].expos) { return errorOprnd("") }
    expos = args[0].expos;
  }
  const output = Object.create(null);
  output.unit = Object.create(null);
  output.unit.expos = expos;
  output.dtype = dt.RATIONAL;

  const v0 = args[0].value;  // a vector
  const v1 = args[1].value;  // another vector
  const x = args[2].value;   // the input value
  // TODO: Use binary search
  for (let i = 0; i < v0.length - 1; i++) {
    if (Rnl.lessThanOrEqualTo(v0[i], x) & Rnl.lessThanOrEqualTo(x, v0[i + 1])) {
      const slope = Rnl.divide((Rnl.subtract(v1[i + 1], v1[i])),
        (Rnl.subtract(v0[i + 1], v0[i])));
      output.value = Rnl.add(v1[i], Rnl.multiply(slope, (Rnl.subtract(x, v0[i]))));
      return Object.freeze(output)
    }
  }
};

const Functions = Object.freeze({
  functionExpos,
  unary,
  binary,
  reduce,
  lerp
});

const multivarFunction = (arity, functionName, args) => {
  // Deal with a function that may have multiple arguments.

  if (args.length === 1) {
    const list = Matrix.isVector(args[0])
      ? args[0].value
      : (args.dtype & dt.MATRIX)
      // TODO: fix the next line.
      ? args[0].value.flat()
      : args[0].value;

    const value = Functions[arity][functionName](list);

    let dtype = args[0].dtype;
    if (arity === "reduce" && functionName !== "accumulate") {
      // Mask off any matrix or vector indicator from the dtype
      if (dtype & dt.MATRIX) { dtype -= dt.MATRIX; }
      if (dtype & dt.ROWVECTOR) { dtype -= dt.ROWVECTOR; }
      if (dtype & dt.COLUMNVECTOR) { dtype -= dt.COLUMNVECTOR; }
    }

    return [value, dtype]

  } else {
    // We have multiple arguments.
    // Is one of them a vector?
    let iArg = 0;
    let gotVector = false;
    let dtype = args[0].dtype;

    for (iArg = 0; iArg < args.length; iArg++) {
      if (Matrix.isVector(args[iArg])) {
        gotVector = true;
        dtype = args[iArg].dtype;
        break
      }
    }
    const list = args.map(e => e.value);
    if (!gotVector) {
      const result = Functions[arity][functionName](list);
      return functionName === "zeros"
        ? [result.value, result.dtype]
        : [result, args[0].dtype]

    } else {
      const listClone = clone(list);
      const result = [];
      for (let i = 0; i < list[iArg].length; i++) {
        listClone[iArg] = list[iArg][i];
        result.push(Functions[arity][functionName](listClone));
      }
      return [ result, dtype ]
    }
  }
};

// compare.js

const equals = (x, y) => {
  if (Rnl.isRational(x) && Rnl.isRational(y)) {
    return Rnl.areEqual(x, y)
  } else {
    return x === y
  }
};

const compare = (op, x, y, yPrev) => {
  // If yPrev is defined, then this is part of a chained comparison, e.g.: a < b < c
  if (x === false && yPrev) { return false }  // The chain is false if any part is false.
  if (x === true && yPrev) { x = yPrev; }  // Compare this link in the chain.

  switch (op) {
    case "=":
      return equals(x, y)

    case "≠":
    case "!=":
    case "/=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return !Rnl.areEqual(x, y)
      } else {
        return x !== y
      }

    case ">":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.greaterThan(x, y)
      } else {
        return x > y
      }

    case "<":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.lessThan(x, y)
      } else {
        return x < y
      }

    case "≥":
    case ">=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.greaterThanOrEqualTo(x, y)
      } else {
        return x >= y
      }

    case "≤":
    case "<=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.lessThanOrEqualTo(x, y)
      } else {
        return x <= y
      }

    case "∈":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) > -1
      } else if (Array.isArray(y) && !Array.isArray(x)) {
        for (let i = 0; i < y.length; i++) {
          if (equals(x, y[i])) { return true }
        }
        return false
      } else if (y instanceof Map) {
        return y.has(x)
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "⊆":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) > -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        for (let i = 0; i < y.length; i++) {
          // We test for a contiguous subset
          if (equals(x[0], y[i])) {
            if (i + x.length > y.length) { return false }
            for (let j = 1; j < x.length; j++) {
              if (!equals(x[j], y[i + j])) { return false }
            }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "∉":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) === -1
      } else if (Array.isArray(y)) {
        for (let i = 0; i < y.length; i++) {
          if (x === y[i]) { return false }
        }
        return true
      } else if (y instanceof Map) {
        return !y.has(x)
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "⊈":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) === -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        // We test for a contiguous subset
        for (let i = 0; i < y.length; i++) {
          if (equals(x[0], y[i])) {
            if (i + x.length > y.length) { continue }
            let provisional = true;
            for (let j = 1; j < x.length; j++) {
              if (!equals(x[j], y[i + j])) {
                provisional = false;
                continue
              }
            }
            if (!provisional) { continue }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

  }
};

// Hurmet math operators are overloaded to handle operands of various shapes.
// Those shapes being scalars, vectors, matrices, and maps.
// This file implements the overloading.

// Some helper functions
const transpose2D = a => a[0].map((x, i) => a.map(y => y[i]));
const dotProduct = (a, b) => {
  return a.map((e, j) => Rnl.multiply(e, b[j])).reduce((m, n) => Rnl.add(m, n))
};
const sumOfSquares = vector => {
  return vector.map((e) => Rnl.multiply(e, e)).reduce((m, n) => Rnl.add(m, n))
};
const oneTenth = [BigInt(1), BigInt(100)];

// From the object below, calculations.js will call operators using statements
// that look like this:
// resultValue = Operations.unary[shape][operator](inputValue)

const unary$1 = {
  scalar: {
    abs(x)       { return Rnl.abs(x) },
    norm(x)      { return Rnl.abs(x) },
    negate(x)    { return Rnl.negate(x) },
    exp(x)       { return Rnl.exp(x) },
    floor(x)     { return Rnl.floor(x) },
    ceil(x)      { return Rnl.ceil(x) },
    percent(x)   { return Rnl.multiply(oneTenth, x) },
    factorial(x) { return Rnl.factorial(x) },
    not(x)       { return !x }
  },

  complex: {
    abs(z)       { return Cpx.abs(z) },
    norm(z)      { return Cpx.abs(z) },
    conjugate(z) { return Cpx.conjugate(z) },
    negate(z)    { return Cpx.negate(z) },
    exp(z)       { return Cpx.exp(z) },
    floor(z)     { return errorOprnd("NA_COMPL_OP", "floor") },
    ceil(z)      { return errorOprnd("NA_COMPL_OP", "ceil") },
    percent(z)   { return errorOprnd("NA_COMPL_OP", "percent") },
    factorial(z) { return errorOprnd("NA_COMPL_OP", "factorial") },
    not(z)       { return errorOprnd("NA_COMPL_OP", "not") }
  },

  vector: {
    abs(v)       { return Rnl.sqrt(sumOfSquares(v)) },   // magnitude of a vector
    norm(v)      { return Rnl.sqrt(sumOfSquares(v)) },   // ditto
    negate(v)    { return v.map(e => Rnl.negate(e)) },
    exp(v)       { return v.map(e => Rnl.exp(e)) },
    floor(v)     { return v.map(e => Rnl.floor(e)) },
    ceil(v)      { return v.map(e => Rnl.ceil(e)) },
    percent(v)   { return v.map(e => Rnl.multiply(oneTenth, e)) },
    factorial(v) { return v.map(e => Rnl.factorial(e)) },
    not(v)       { return v.map(e => !e) }
  },

  matrix: {
    abs(m) { return Matrix.invert(m, true) },
    norm(m) {
      if (m.length === m[0].length) {
        let sum = Rnl.zero;
        for (let i = 0; i < m.length; i++) {
          sum = Rnl.add(sum, sumOfSquares(m[i]));
        }
        return sum.sqrt()
      }
    },
    negate(m)    { return m.map(row => row.map(e => Rnl.negate(e))) },
    exp(m)       { return m.map(row => row.map(e => Rnl.exp(e))) },
    floor(m)     { return m.map(row => row.map(e => Rnl.floor(e))) },
    ceil(m)      { return m.map(row => row.map(e => Rnl.ceil(e))) },
    percent(m)   { return m.map(row => row.map(e => Rnl.multiply(oneTenth, e))) },
    factorial(m) { return m.map(row => row.map(e => Rnl.factorial(e))) },
    not(m)       { return m.map(row => row.map(e => !e)) }
  },

  map: {
    abs(map)       { return mapMap(map, value => Rnl.abs(value)) },
    negate(map)    { return mapMap(map, value => Rnl.negate(value)) },
    exp(map)       { return mapMap(map, value => Rnl.exp(value)) },
    floor(map)     { return mapMap(map, value => Rnl.floor(value)) },
    ceil(map)      { return mapMap(map, value => Rnl.ceil(value)) },
    percent(map)   { return mapMap(map, value => Rnl.multiply(oneTenth, value)) },
    factorial(map) { return mapMap(map, value => Rnl.factorial(value)) },
    not(map)       { return mapMap(map, value => !value) }
  },

  mapWithVectorValues: {
    abs(map)       { return mapMap(map, array => array.map(e => Rnl.abs(e))) },
    negate(map)    { return mapMap(map, array => array.map(e => Rnl.negate(e))) },
    exp(map)       { return mapMap(map, array => array.map(e => Rnl.exp(e)))},
    floor(map)     { return mapMap(map, array => array.map(e => Rnl.floor(e))) },
    ceil(map)      { return mapMap(map, array => array.map(e => Rnl.ceil(e))) },
    percent(map)   { return mapMap(map, array => array.map(e => Rnl.multiply(oneTenth, e))) },
    factorial(map) { return mapMap(map, array => array.map(e => Rnl.factorial(e))) },
    not(map)       { return mapMap(map, array => array.map(e => !e)) }
  }
};

const condition = {
  // Deal with booleans. Return a single value, true or false.
  // If a vector or matrix is received, all elements must be
  // true in order to return a true. Otherwise return a false.
  scalar(x) { return x },
  vector(v) { return v.reduce((prev, curr) => prev && curr, true) },
  matrix(m) {
    const row = new Array(m.length);
    for (let i = 0; i < m.length; i++) {
      row[i] = m[i].reduce((prev, curr) => prev && curr, true);
    }
    return row.reduce((prev, curr) => prev && curr, true)
  }
};

const dtype = {
  // Given the shapes which are operands to a binary operator,
  // return the resulting data type.
  scalar: {
    scalar(t0, t1, tkn)     {
      return (tkn === "&" || tkn === "&_")
        ? t0 + (tkn === "&" ? dt.ROWVECTOR : dt.COLUMNVECTOR )
        : t0
    },
    complex(t0, t1, tkn)    { return t1 },
    vector(t0, t1, tkn)     { return t1 },
    matrix(t0, t1, tkn)     { return t1 },
    dataFrame(t0, t1, tkn)  { return t1 },
    map(t0, t1, tkn)        { return t1 },
    mapWithVectorValues(t0, t1, tkn) { return t1 }
  },
  complex: {
    scalar(t0, t1, tkn)  { return t0 },
    complex(t0, t1, tkn) { return t0 }
  },
  vector: {
    scalar(t0, t1, tkn) { return t0 },
    map(t0, t1, tkn)    { return t1 + (t0 & dt.ROWVECTOR) + (t0 & dt.COLUMNVECTOR) }
  },
  rowVector: {
    rowVector(t0, t1, tkn) { return tkn === "&_" ? t0 - dt.ROWVECTOR + dt.MATRIX : t0 },
    columnVector(t0, t1, tkn) { return t0 },
    matrix(t0, t1, tkn) { return tkn === "&_" ? t1 : t0 }
  },
  columnVector: {
    rowVector(t0, t1, op) {
      return op === "dot"
      ? dt.RATIONAL
      : op === "cross"
      ? t0
      : t0 - dt.COLUMNVECTOR + dt.MATRIX
    },
    columnVector(t0, t1, tkn) { return tkn === "&" ? t0 - dt.COLUMNVECTOR + dt.MATRIX : t0 },
    matrix(t0, t1, tkn) { return t1 }
  },
  matrix: {
    scalar(t0, t1, tkn) { return t0 },
    rowVector(t0, t1, tkn) { return t0 },
    columnVector(t0, t1, tkn) { return tkn === "&" ? t0 : t1 },
    matrix(t0, t1, tkn) { return t0 },
    map(t0, t1, tkn)    { return 0 }
  },
  dataFrame: {
    scalar(t0, t1, tkn) { return t0 }
  },
  map: {
    scalar(t0, t1, tkn) { return t0 },
    vector(t0, t1, tkn) { return t0 + (t1 & dt.ROWVECTOR) + (t1 & dt.COLUMNVECTOR) },
    matrix(t0, t1, tkn) { return 0 },
    map(t0, t1, tkn)    { return t0 }
  },
  mapWithVectorValues: {
    scalar(t0, t1, tkn) { return t0 }
  }
};


// The binary operators below are called like this:
// resultValue = Operations.binary[shape_0][shape_1][operator](input_0, input_1)

const binary$1 = {
  scalar: {
    scalar: {
      // Binary operations on two scalars
      add(x, y)      { return Rnl.add(x, y) },
      subtract(x, y) { return Rnl.subtract(x, y) },
      multiply(x, y) { return Rnl.multiply(x, y) },
      divide(x, y)   { return Rnl.divide(x, y) },
      power(x, y)    {
        // eslint-disable-next-line max-len
        return Cpx.isComplex(x) || (Rnl.isNegative(x) && Rnl.isPositive(y) && Rnl.lessThan(y, Rnl.one))
          ? Cpx.power([x, Rnl.zero], y)
          : Rnl.power(x, y)
      },
      hypot(x, y)    { return Rnl.hypot(x, y) },
      modulo(x, y)   { return Rnl.modulo(x, y) },
      and(x, y)      { return x && y },
      or(x, y)       { return x || y },
      xor(x, y)      { return x !== y },
      concat(x, y)   { return [x, y] },
      unshift(x, y)  { return [x, y] }
    },
    complex: {
      add(x, z)      { return [Rnl.add(x, z[0]), z[1]] },
      subtract(x, z) { return [Rnl.subtract(x, z[0]), Rnl.negate(z[1])] },
      multiply(x, z) { return [Rnl.multiply(x, z[0]), Rnl.multiply(x, z[1])] },
      divide(x, z)   { return Cpx.divide([x, Rnl.zero], z) },
      power(x, z)    { return Cpx.power([x, Rnl.zero], z) },
      modulo(x, z)   { return errorOprnd("NA_COMPL_OP", "modulo") },
      and(x, z)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(x, z)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(x, z)      { return errorOprnd("NA_COMPL_OP", "xor") }
    },
    vector: {
      // Binary operations with a scalar and a vector.
      // Perform element-wise operations.
      add(x, v)      { return v.map(e => Rnl.add(x, e)) },
      subtract(x, v) { return v.map(e => Rnl.subtract(x, e)) },
      multiply(x, v) { return v.map(e => Rnl.multiply(x, e)) },
      divide(x, v)   { return v.map(e => Rnl.divide(x, e)) },
      power(x, v)    { return v.map(e => Rnl.power(x, e)) },
      modulo(x, v)   { return v.map(e => Rnl.modulo(x, e)) },
      and(x, v)      { return v.map(e => x && e) },
      or(x, v)       { return v.map(e => x || e) },
      xor(x, v)      { return v.map(e => x !== e) },
      concat(x, v)   { return [x, ...v] }
    },
    matrix: {
      // Binary operations with a scalar and a matrix.
      // Perform element-wise operations.
      add(x, m)      { return m.map(row => row.map(e => Rnl.add(x, e))) },
      subtract(x, m) { return m.map(row => row.map(e => Rnl.subtract(x, e))) },
      multiply(x, m) { return m.map(row => row.map(e => Rnl.multiply(x, e))) },
      divide(x, m)   { return m.map(row => row.map(e => Rnl.divide(x, e))) },
      power(x, m)    { return m.map(row => row.map(e => Rnl.power(x, e))) },
      modulo(x, m)   { return m.map(row => row.map(e => Rnl.modulo(x, e))) },
      and(x, m)      { return m.map(row => row.map(e => x && e)) },
      or(x, m)       { return m.map(row => row.map(e => x || e)) },
      xor(x, m)      { return m.map(row => row.map(e => x !== e)) },
      concat(x, m)   { return errorOprnd("BAD_CONCAT") }
    },
    dataFrame: {
      multiply(x, df) {
        df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
          let L = e.length;
          if (e.indexOf(".")) { L -= 1; }
          return Rnl.toStringSignificant(Rnl.multiply(x, Rnl.fromString(e)), L)
        }));
        return df
      },
      divide(x, df) {
        df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
          let L = e.length;
          if (e.indexOf(".")) { L -= 1; }
          return Rnl.toStringSignificant(Rnl.divide(x, Rnl.fromString(e)), L)
        }));
        return df
      }
    },
    map: {
      // Binary operations with a scalar and a map.
      // Perform element-wise operations.
      add(scalar, map) {
        return mapMap(map, value => Rnl.add(scalar, value))
      },
      subtract(scalar, map) {
        return mapMap(map, value => Rnl.subtract(scalar, value))
      },
      multiply(scalar, map) {
        return mapMap(map, value => Rnl.multiply(scalar, value))
      },
      divide(scalar, map) {
        return mapMap(map, value => Rnl.divide(scalar, value))
      },
      power(scalar, map) {
        return mapMap(map, value => Rnl.power(scalar, value))
      },
      modulo(scalar, map) {
        return mapMap(map, value => Rnl.modulo(scalar, value))
      },
      and(scalar, map) {
        return mapMap(map, value => scalar && value)
      },
      or(scalar, map) {
        return mapMap(map, value => scalar || value)
      },
      xor(scalar, map) {
        return mapMap(map, value => scalar !== value)
      }
    },
    mapWithVectorValues: {
      add(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.add(scalar, e)))
      },
      subtract(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.subtract(scalar, e)))
      },
      multiply(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.multiply(scalar, e)))
      },
      divide(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.divide(scalar, e)))
      },
      power(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.power(scalar, e)))
      },
      modulo(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.modulo(scalar, e)))
      },
      and(scalar, map) {
        return mapMap(map, array => array.map(e => scalar && e))
      },
      or(scalar, map) {
        return mapMap(map, array => array.map(e => scalar || e))
      },
      xor(scalar, map) {
        return mapMap(map, array => array.map(e => scalar !== e))
      }
    }
  },

  complex: {
    scalar: {
      add(z, y)      { return [Rnl.add(z[0], y), z[1]] },
      subtract(z, y) { return [Rnl.subtract(z[0], y), z[1]] },
      multiply(z, y) { return [Rnl.multiply(z[0], y), Rnl.multiply(z[1], y) ] },
      divide(z, y)   { return Cpx.divide(z, [y, Rnl.zero]) },
      power(z, y)    { return Cpx.power(z, [y, Rnl.zero]) },
      modulo(z, y)   { return errorOprnd("NA_COMPL_OP", "modulo") },
      and(z, y)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(z, y)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(z, y)      { return errorOprnd("NA_COMPL_OP", "xor") }
    },
    complex: {
      add(x, y)      { return [Rnl.add(x[0], y[0]), Rnl.add(x[1], y[1])] },
      subtract(x, y) { return [Rnl.subtract(x[0], y[0]), Rnl.subtract(x[1], y[1])] },
      multiply(x, y) { return Cpx.multiply(x, y) },
      divide(x, y)   { return Cpx.divide(x, y) },
      power(x, y)    { return Cpx.power(x, y) },
      modulo(x, y)   { return errorOprnd("NA_COMPL_OP", "modulo") },
      and(x, y)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(x, y)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(x, y)      { return errorOprnd("NA_COMPL_OP", "xor") }

    }
  },

  vector: {
    scalar: {
      // Binary operations with a vector and a scalar.
      // Perform element-wise operations.
      add(v, x)      { return v.map(e => Rnl.add(e, x)) },
      subtract(v, x) { return v.map(e => Rnl.subtract(e, x)) },
      multiply(v, x) { return v.map(e => Rnl.multiply(e, x)) },
      divide(v, x)   { return v.map(e => Rnl.divide(e, x)) },
      power(v, x)    { return v.map(e => Rnl.power(e, x)) },
      modulo(v, x)   { return v.map(e => Rnl.modulo(e, x)) },
      and(v, x)      { return v.map(e => e && x) },
      or(v, x)       { return v.map(e => e || x) },
      xor(v, x)      { return v.map(e => e !== x) },
      concat(v, x)   { return [...v, x]}
    },
    map: {
      // Binary operations with a vector and a map
      add(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.add(val, e)))
      },
      subtract(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.subtract(val, e)))
      },
      multiply(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.multiply(val, e)))
      },
      divide(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.divide(val, e)))
      },
      power(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.power(val, e)))
      },
      modulo(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.modulo(val, e)))
      },
      and(vector, map) {
        return mapMap(map, val => vector.map(e => val && e))
      },
      or(vector, map) {
        return mapMap(map, val => vector.map(e => val || e))
      },
      xor(vector, map) {
        return mapMap(map, val => vector.map(e => val !== e))
      }
    }
  },

  rowVector: {
    rowVector: {
      // Binary operations on two row vectors.
      add(x, y) {
        // element-wise addition
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.add(e, y[i]))
      },
      subtract(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.subtract(e, y[i]))
      },
      divide(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.divide(e, y[i]))
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero];
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]));
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]));
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]));
        return v
      },
      multiply(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.multiply(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      asterisk(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.power(e, y[i]))
      },
      modulo(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.modulo(e, y[i]))
      },
      and(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e && y[i])
      },
      or(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e || y[i])
      },
      xor(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e !== y[i])
      },
      concat(x, y) { return x.concat(y) },
      unshift(x, y) { return [x, y] }
    },
    columnVector: {
      // Binary operations on a row vector and a column vector.
      // Except for multiplication, these work only if both vectors have only one element.
      add(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.add(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      subtract(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.subtract(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero];
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]));
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]));
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]));
        return v
      },
      multiply(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      asterisk(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.modulo(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      and(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] && y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      or(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] || y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      xor(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] !== y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      concat(x, y)  { return "BAD_CONCAT" },
      unshift(x, y) { return "BAD_CONCAT" }
    },
    matrix: {
      // Binary operations on a row vector and a 2-D matrix.
      add(v, m) {
        // Add the row vector to each row in the matrix
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.add(v[i], e)))
      },
      subtract(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.subtract(v[i], e)))
      },
      concat(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("BAD_CONCAT") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("BAD_CONCAT") }
        return [v, ...m]
      }
    }
  },

  columnVector: {
    rowVector: {
      // Binary operations on a column vector and a row vector.
      // Except for multiplication, these work only if both vectors have only one element.
      add(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.add(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      subtract(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.subtract(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero];
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]));
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]));
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]));
        return v
      },
      multiply(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      divide(x, y) {
        return x.map(m => y.map(e => Rnl.divide(m, e)))
      },
      asterisk(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.modulo(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      and(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] && y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      or(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] || y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      xor(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] !== y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      concat(x, y)  { return "BAD_CONCAT" },
      unshift(x, y) { return "BAD_CONCAT" }
    },
    columnVector: {
      // Binary operations on two column vectors.
      add(x, y) {
        // element-wise addition
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.add(e, y[i]))
      },
      subtract(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.subtract(e, y[i]))
      },
      divide(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.divide(e, y[i]))
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero];
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]));
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]));
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]));
        return v
      },
      multiply(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.multiply(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      asterisk(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.power(e, y[i]))
      },
      modulo(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.modulo(e, y[i]))
      },
      and(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e && y[i])
      },
      or(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e || y[i])
      },
      xor(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e !== y[i])
      },
      concat(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => [e, y[i]])
      },
      unshift(x, y) { return x.concat(y) }
    },

    matrix: {
      // Binary operations on a column vector and a 2-D matrix.
      add(v, m) {
        // Add the column vector to each column of the matrix
        const result = clone(m);
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[0].length; j++) {
            result[i][j] = Rnl.add(m[i][j], v[j]);
          }
        }
        return result
      },
      subtract(v, m) {
        // Add the column vector to each column of the matrix
        const result = clone(m);
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[0].length; j++) {
            result[i][j] = Rnl.subtract(m[i][j], v[j]);
          }
        }
        return result
      },
      concat(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(x, y) { return "BAD_CONCAT" }
    }
  },

  matrix: {
    scalar: {
      // Binary operations with a matrix and a scalar.
      // Perform element-wise operations.
      add(m, x)      { return m.map(row => row.map(e => Rnl.add(e, x))) },
      subtract(m, x) { return m.map(row => row.map(e => Rnl.subtract(e, x))) },
      multiply(m, x) { return m.map(row => row.map(e => Rnl.multiply(e, x))) },
      divide(m, x)   { return m.map(row => row.map(e => Rnl.divide(e, x))) },
      power(m, x)    {
        if (x === "T") { return transpose2D(m) }
        if (m.length === m[0].length && Rnl.areEqual(x, [BigInt(-1), BigInt(1)])) {
          return Matrix.invert(m)
        }
        return m.map(row => row.map(e => Rnl.power(e, x)))
      },
      modulo(m, x)   { return m.map(row => row.map(e => Rnl.modulo(e, x))) }
    },
    rowVector: {
      add(m, v)      { return m.map(row => row.map((e, i) => Rnl.add(e, v[i]) )) },
      subtract(m, v) { return m.map(row => row.map((e, i) => Rnl.subtract(e, v[i]) )) },
      multiply(m, v) { return m.map(row => row.map((e, i) => Rnl.multiply(e, v[i]) )) },
      divide(m, v)   { return m.map(row => row.map((e, i) => Rnl.divide(e, v[i]) )) },
      power(m, v)    { return m.map(row => row.map((e, i) => Rnl.power(e, v[i]) )) },
      unshift(m, v) {
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return [...m, v]
      }
    },
    columnVector: {
      add(m, v)      { return m.map(row => row.map((e, i) => Rnl.add(e, v[i]) )) },
      subtract(m, v) { return m.map(row => row.map((e, i) => Rnl.subtract(e, v[i]) )) },
      multiply(m, v) {
        // Multiply a matrix times a column vector
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => dotProduct(row, v))
      },
      concat(m, v) {
        if (m.length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => [...row, v[i]])
      }
    },
    matrix: {
      // Binary operations on two 2-D matrices.
      add(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.add(n, y[i][j])))
      },
      subtract(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.subtract(n, y[i][j])))
      },
      dot(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((row, i) => dotProduct(row, y[i])).reduce((m, n) => Rnl.add(m, n))
      },
      cross(x, y) {
        return errorOprnd("CROSS")
      },
      multiply(x, y) {

      },
      asterisk(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.multiply(n, y[i][j])))
      },
      divide(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.divide(n, y[i][j])))
      },
      power(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.power(n, y[i][j])))
      },
      modulo(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.modulo(n, y[i][j])))
      },
      and(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n && y[i][j]))
      },
      or(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n || y[i][j]))
      },
      xor(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n !== y[i][j]))
      },
      concat(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((row, i) => row.concat(y[i]))
      },
      unshift(x, y) {
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.concat(y)
      }
    },
    map: {

    }
  },

  dataFrame: {
    multiply(df, scalar) {
      df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
        let L = e.length;
        if (e.indexOf(".")) { L -= 1; }
        return Rnl.toStringSignificant(Rnl.multiply(scalar, Rnl.fromString(e)), L)
      }));
      return df
    },
    divide(df, scalar) {
      df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
        let L = e.length;
        if (e.indexOf(".")) { L -= 1; }
        return Rnl.toStringSignificant(Rnl.divide(scalar, Rnl.fromString(e)), L)
      }));
      return df
    }
  },

  map: {
    scalar: {
      // Binary opertions on a map and a scalar
      add(map, scalar) {
        return mapMap(map, value => Rnl.add(value, scalar))
      },
      subtract(map, scalar) {
        return mapMap(map, value => Rnl.subtract(value, scalar))
      },
      multiply(map, scalar) {
        return mapMap(map, value => Rnl.multiply(value, scalar))
      },
      divide(map, scalar) {
        return mapMap(map, value => Rnl.divide(value, scalar))
      },
      power(map, scalar) {
        return mapMap(map, value => Rnl.power(value, scalar))
      },
      modulo(map, scalar) {
        return mapMap(map, value => Rnl.modulo(value, scalar))
      },
      and(map, scalar) {
        return mapMap(map, value => value && scalar)
      },
      or(map, scalar) {
        return mapMap(map, value => value || scalar)
      },
      xor(map, scalar) {
        return mapMap(map, value => value !== scalar)
      }
    },
    vector: {
      add(map, array) {
        return mapMap(map, value => array.map(e => Rnl.add(value, e)))
      },
      subtract(map, array) {
        return mapMap(map, value => array.map(e => Rnl.subtract(value, e)))
      },
      multiply(map, array) {
        return mapMap(map, value => array.map(e => Rnl.multiply(value, e)))
      },
      divide(map, array) {
        return mapMap(map, value => array.map(e => Rnl.divide(value, e)))
      },
      power(map, array) {
        return mapMap(map, value => array.map(e => Rnl.power(value, e)))
      },
      modulo(map, array) {
        return mapMap(map, value => array.map(e => Rnl.modulo(value, e)))
      },
      and(map, array) {
        return mapMap(map, value => array.map(e => value && e))
      },
      or(map, array) {
        return mapMap(map, value => array.map(e => value || e))
      },
      xor(map, array) {
        return mapMap(map, value => array.map(e => value !== e))
      }
    },
    matrix: {

    },
    map: {

    }
  },
  mapWithVectorValues: {
    scalar: {
      add(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.add(e, scalar)))
      },
      subtract(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.subtract(e, scalar)))
      },
      multiply(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.multiply(e, scalar)))
      },
      divide(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.divide(e, scalar)))
      },
      power(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.power(e, scalar)))
      },
      modulo(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.modulo(e, scalar)))
      },
      and(map, scalar) {
        return mapMap(map, array => array.map(e => e && scalar))
      },
      or(map, scalar) {
        return mapMap(map, array => array.map(e => e || scalar))
      },
      xor(map, scalar) {
        return mapMap(map, array => array.map(e => e !== scalar))
      }

    },
    vector: {

    },
    matrix: {

    },
    map: {

    },
    mapWithVectorValues: {

    }
  }
};

// Binary relations get their own object, separate from other binary operations.
// That's because Hurmet allows chained comparisons, as in  a < b < c.
// So we have to pass yPrev as well as the two current operands.

const relations = {
  scalar: {
    scalar: {
      relate(op, x, y, yPrev) { return compare(op, x, y, yPrev) }
    },
    vector: {
      relate(op, x, v, yPrev) {
        if (yPrev === undefined) {
          return v.map(e => compare(op, x, e, undefined))
        } else if (typeof yPrev !== "object") {
          return v.map(e => compare(op, x, e, yPrev))
        } else if (Array.isArray(yPrev)) {
          return v.map((e, i) => compare(op, x, e, yPrev[i]))
        }
      }
    },
    matrix: {
      relate(op, x, m, yPrev) {
        if (yPrev === undefined) {
          return m.map(row => row.map(e => compare(op, x, e, undefined)))
        } else if (typeof yPrev !== "object") {
          return m.map(row => row.map(e => compare(op, x, e, yPrev)))
        } else if (Array.isArray(yPrev)) {
          return m.map((row, i) => row.map((e, j) => compare(op, x, e, yPrev[i][j])))
        }
      }
    },
    map: {
      relate(op, x, map, yPrev) {
        if (yPrev === undefined) {
          return mapMap(map, value => compare(op, x, value, undefined))
        } else if (typeof yPrev !== "object") {
          return mapMap(map, value => compare(op, x, value, yPrev))
        } else {
          const newMap = new Map();
          for (const [key, value] of map.entries()) {
            newMap.set(key,  compare(op, x, value, yPrev[key]));
          }
          return newMap
        }
      }
    }
  },
  vector: {
    scalar: {
      relate(op, v, y, yPrev) {
        if (yPrev === undefined) {
          return v.map(e => compare(op, e, y, undefined))
        } else if (typeof yPrev !== "object") {
          return v.map(e => compare(op, e, y, yPrev))
        } else if (Array.isArray(yPrev)) {
          return v.map((e, i) => compare(op, e, y, yPrev[i]))
        }
      }
    }
  },
  rowVector: {
    rowVector: {
      relate(op, x, y, yPrev) {
        if (yPrev === undefined) {
          return x.map((e, i) => compare(op, e, y[i], undefined))
        }
      }
    }
  },
  columnVector: {
    columnVector: {
      relate(op, x, y, yPrev) {
        if (yPrev === undefined) {
          return x.map((e, i) => compare(op, e, y[i], undefined))
        }
      }
    }
  },
  matrix: {
    scalar: {
      relate(op, m, y, yPrev) {
        if (yPrev === undefined) {
          return m.map(row => row.map(e => compare(op, e, y, undefined)))
        } else if (typeof yPrev !== "object") {
          return m.map(row => row.map(e => compare(op, e, y, yPrev)))
        } else if (Array.isArray(yPrev)) {
          return m.map((row, i) => row.map((e, j) => compare(op, e, y, yPrev[i][j])))
        }
      }
    }
  }
};

const isDivByZero = (quotient, shape) => {
  switch (shape) {
    case "scalar":
      return quotient[1] === BigInt(0)
    case "vector":
      for (let i = 0; i < quotient.length; i++) {
        if (quotient[i][1] === BigInt(0)) { return true }
      }
      return false
    case "matrix":
      for (let i = 0; i < quotient.length; i++) {
        for (let j = 0; j < quotient[0].length; j++) {
          if (quotient[i][j][1] === BigInt(0)) { return true }
        }
      }
      return false
    case "map":
      for (const [_, value] of Object.entries(quotient)) {
        if (value[1] === BigInt(0)) { return true }
      }
      return false
    case "mapWithVectorValues":
      for (const [_, value] of Object.entries(quotient)) {
        for (let i = 0; i < value.length; i++) {
          if (value[i][1] === BigInt(0)) { return true }
        }
      }
      return false
    default:
      return false
  }
};

const Operators = Object.freeze({
  unary: unary$1,
  binary: binary$1,
  relations,
  condition,
  dtype
});

const wideCharRegEx = /[\uD800-\uDBFF][\uDC00-\uDFFF][\uFE00\uFE01]?/g;

const textRange = (str, index) => {
  // Find a range of the string str
  if (index.dtype !== dt.RATIONAL && index.dtype !== dt.RANGE) {
    return errorOprnd("STR_INDEX")
  }

  const wideCharMatches = arrayOfRegExMatches(wideCharRegEx, str);
  let value = "";

  if (wideCharMatches.length === 0) {
    // No surrogate pairs were found.
    // Each text character is one UTF-16 code unit.
    // So do a naive access of the string.
    if (index.dtype === dt.RATIONAL) {
      value = str.charAt(Rnl.toNumber(index.value) - 1);
    } else if (index.dtype === dt.RANGE) {
      const start = Rnl.toNumber(index.value[0]);
      const step = Rnl.toNumber(index.value[1]);
      const end = index.value[2] === "∞"
        ? str.length
        : Rnl.toNumber(index.value[2]);
      if (step === 1) {
        // No step size specified.
        value = str.slice(start - 1, end);
      } else {
        for (let i = start - 1; i < end; i += step) {
          value += str.charAt(i);
        }
      }
    }
  } else {
    // We must account for surrogate pairs and variation selectors.
    let discardLength = 0;
    let endOfPrevWideChar = 0;
    let cleanString = "";
    let start = 0;
    let step = 0;
    let end = 0;
    if (index.dtype === dt.RATIONAL) {
      // Return one character.
      start = Rnl.toNumber(index.value);
      step = 1;
      end = start;
    } else {
      // index is a range and str contains at least one surrogate pair.
      start = Rnl.toNumber(index.value[0]);
      step = Rnl.toNumber(index.value[1]);
      end = Rnl.toNumber(index.value[2]);
    }
    let realIndex = start;

    for (let i = 0; i < wideCharMatches.length; i++) {
      const posWideChar = wideCharMatches[i].index;
      cleanString = str.slice(endOfPrevWideChar, posWideChar);
      while (realIndex <= end && discardLength + cleanString.length >= realIndex) {
        value += cleanString[realIndex - discardLength - 1];
        realIndex += step;
      }
      if (realIndex <= end && discardLength + cleanString.length === realIndex - 1) {
        value += wideCharMatches[i].value;
        realIndex += step;
      }
      if (realIndex > end) {
        return { value, unit: null, dtype: dt.STRING }
      }
      discardLength += cleanString.length + 1;
      endOfPrevWideChar = posWideChar + wideCharMatches[i].length;
    }
    if (realIndex >= discardLength && realIndex <= end) {
      cleanString = str.slice(endOfPrevWideChar);
      while (realIndex <= end && discardLength + cleanString.length >= realIndex) {
        value += cleanString[realIndex - discardLength - 1];
        realIndex += step;
      }
    } else {
      return errorOprnd("BIGINDEX")
    }
  }
  return { value, unit: null, dtype: dt.STRING }
};

function insertOneHurmetVar(hurmetVars, attrs, decimalFormat) {
  // hurmetVars is a key:value store of variable names and attributes.
  // This function is called to insert an assignment into hurmetVars.
  const formatSpec = hurmetVars.format ? hurmetVars.format.value : "h15";

  if (!Array.isArray(attrs.name)) {
    // This is the typical case.
    hurmetVars[attrs.name] = attrs;

  } else if (attrs.value === null) {
    for (let i = 0; i < attrs.name.length; i++) {
      hurmetVars[attrs.name[i]] = { value: null };
    }

  } else if (isMatrix(attrs)) {
    // Assign to a matrix of names
    const isQuantity = Boolean(attrs.dtype & dt.QUANTITY);
    let resultDisplay = attrs.resultdisplay;
    resultDisplay = resultDisplay.replace(/\\(begin|end){[bp]matrix}/g, "").trim();
    const displays = resultDisplay.split(/&|\\\\/);
    if (attrs.dtype & dt.MATRIX) {
      // A 2 dimensional matrix.
      const dtype = attrs.dtype - dt.MATRIX;
      const numRows = isQuantity ? attrs.value.plain.length : attrs.value.length;
      const numCols = attrs.name.length / numRows;
      let iName = 0;
      for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
          const value = isQuantity
            ? { plain: attrs.value.plain[i][j], inBaseUnits: attrs.value.inBaseUnits[i][j] }
            : attrs.value[i][j];
          hurmetVars[attrs.name[i]] = {
            name: attrs.name[iName],
            value,
            resultdisplay: isQuantity
              ? parse(displays[iName].trim() + " '" + attrs.unit + "'")
              : displays[iName].trim(),
            expos: attrs.expos,
            unit: isQuantity ? attrs.unit : undefined,
            dtype
          };
          iName += 1;
        }
      }
    } else {
      // Assign to a vector of names.
      const isColumn = Boolean(attrs.dtype & dt.COLUMNVECTOR);
      const dtype = attrs.dtype - (isColumn ? dt.COLUMNVECTOR : dt.ROWVECTOR);
      for (let i = 0; i < attrs.name.length; i++) {
        const value = isQuantity
          ? { plain: attrs.value.plain[i], inBaseUnits: attrs.value.inBaseUnits[i] }
          : attrs.value[i];
        hurmetVars[attrs.name[i]] = {
          name: attrs.name[i],
          value,
          resultdisplay: isQuantity
            ? parse(displays[i].trim() + " '" + attrs.unit + "'")
            : displays[i].trim(),
          expos: attrs.expos,
          unit: isQuantity ? attrs.unit : undefined,
          dtype
        };
      }
    }

  // From this point forward, we're dealing with multiple assignment
  } else if (attrs.dtype & dt.MAP) {
    const unit = attrs.value.unit;
    const unitName = unit && unit.name ? unit.name : undefined;
    const dtype = attrs.dtype - dt.MAP;
    let i = 0;
    if (attrs.dtype & dt.QUANTITY) {
      for (const value of attrs.value.plain.values()) {
        const result = {
          value: { plain: value },
          expos: attrs.expos,
          factor: attrs.factor,
          dtype
        };
        result.resultdisplay = format(value, formatSpec, decimalFormat);
        if (unitName) { result.resultdisplay += " " + unitTeXFromString(unitName); }
        hurmetVars[attrs.name[i]] = result;
        i += 1;
      }
      i = 0;
      for (const value of attrs.value.inBaseUnits.values()) {
        hurmetVars[attrs.name[i]].value.inBaseUnits = value;
        i += 1;
      }
    } else {
      for (const value of attrs.value.values()) {
        const result = { value, expos: attrs.expos, factor: attrs.factor, dtype };
        result.resultdisplay = Rnl.isRational(value)
          ? format(value, formatSpec, decimalFormat)
          : String(value);
        if (unitName) { result.resultdisplay += " " + unitTeXFromString(unitName); }
        hurmetVars[attrs.name[i]] = result;
        i += 1;
      }
    }
  } else if (attrs.dtype === dt.DATAFRAME) {
    for (let i = 0; i < attrs.name.length; i++) {
      const datum = attrs.value.data[i][0];
      const dtype = attrs.value.dtype[i];
      const val = (dtype & dt.RATIONAL) ? Rnl.fromString(datum) : datum;
      const result = {
        value: val,
        unit: attrs.unit[attrs.value.units[i]],
        dtype,
        resultdisplay: (dtype & dt.RATIONAL) ? parse(format(val)) : parse(val)
      };
      if (attrs.value.units[i]) {
        result.value = { plain: result.value };
        const unit = attrs.unit[attrs.value.units[i]];
        result.value.inBaseUnits =
          Rnl.multiply(Rnl.add(result.value.plain, unit.gauge), unit.factor);
        result.expos = unit.expos;
        result.resultdisplay += " " + unitTeXFromString(result.unit.name);
      }
      hurmetVars[attrs.name[i]] = result;
    }
  } else if (attrs.dtype === dt.TUPLE) {
    let i = 0;
    for (const value of attrs.value.values()) {
      hurmetVars[attrs.name[i]] = value;
      i += 1;
    }
  } else if (attrs.dtype === dt.MODULE) {
    if (attrs.name.length !== attrs.value.length) {
      return errorOprnd("MULT_MIS")
    } else {
      let i = 0;
      for (const value of attrs.value.values()) {
        const result = clone(value);
        hurmetVars[attrs.name[i]] = result;
        i += 1;
      }
    }
  }
}

/**
 * # hurmetMark.js
 *
 * Hurmet.app can export to its own flavor of Markdown.
 * This version of Markdown is stricter in some ways than CommonMark or
 * Gruber's original Markdown. So the parser can be considerably simplified.
 * md2ast() returns an AST that matches the memory structure  of a Hurmet.app document.
 *
 * ## Ways in which this syntax is more strict than Markdown.
 *
 * 1. Emphasis: _emphasis_ only. Asterisks do not create standard emphasis.
 * 2. Strong emphasis: **strong emphasis** only. Underlines do not create strong emphasis.
 * 3. Code blocks must be fenced by triple backticks.
 *    Indented text does not indicate a code block.
 * 4. A blank line must precede the beginning of a list, even a nested list.
 * 5. A hard line break is indicated when a line ends with "\". Double spaces do not count.
 * 6. "Shortcut" reference links [ref] are not recognized.
 *    Implicit reference links are recognized and are expanded, see below.
 *
 * ## Extensions
 *
 * 1. Hurmet inline calculation is delimited ¢…¢.
 *    Hurmet display calculation is fenced ¢¢\n … \n¢¢.
 * 2. LaTeX inline math is delimited $…$. $ and \\ are escaped \$ & \\\\.
 *    LaTeX display math is fenced  $$\n … \n$$.
 * 3. ~subscript~
 * 4. ~~strikethrough~~
 * 5. ©comment©
 * 6. Pipe tables as per Github Flavored Markdown (GFM).
 * 7. Grid tables as per reStructuredText, with two exceptions:
 *    a. The top border contains ":" characters to indicate column justtification.
 *    b. Top & left borders contain "+" characters at border locations, even where
 *       a merged cell prevents a border from extending to the tables outer edge.
 * 8. Implicit reference links [title][<ref>] & implicit reference images ![alt|caption][<ref>]
 *    ⋮
 *    [alt]: path
 *    Reference images can have captions and directives. Format is:
 *    ![alt text][<ref>]   or \n!![caption][]
 *      ⋮
 *    [def]: target
 *    {.class #id width=number}
 * 9. Table directives. They are placed on the line after the table. The format is:
 *    {.class #id width="num1 num2 …" caption}
 * 10. Lists that allow the user to pick list ordering.
 *       1. →  1. 2. 3.  etc.
 *       A. →  A. B. C.  etc. (future)
 *       a) →  (a) (b) (c)  etc. (future)
 * 11. Table of Contents
 *     {.toc start=N end=N}
 * 12. Definition lists, per Pandoc.  (future)
 * 13. Blurbs set an attribute on a block element, as in Markua.
 *     Blurbs are denoted by a symbol in the left margin.
 *     Subsequent indented text blocks are children of the blurb.
 *     Blurb symbols:
 *       i> indented block
 *       C> Centered block
 *       H> print header element, <header>
 *       I> Information admonition (future)
 *       W> Warning admonition (future)
 *       T> Tip admonition (future)
 *       c> Comment admonition (future)
 * 14. [^1] is a reference to a footnote. (future)
 *     [^1]: The body of the footnote is deferred, similar to reference links.
 * 15. [#1] is a reference to a citation. (future)
 *     [#1]: The body of the citation is deferred, similar to reference links.
 * 16. Line blocks begin with "| ", as per Pandoc. (future)
 *
 * hurmetMark.js copyright (c) 2021, 2022 Ron Kok
 *
 * This file has been adapted (and heavily modified) from Simple-Markdown.
 * Simple-Markdown copyright (c) 2014-2019 Khan Academy & Aria Buckles.
 *
 * Portions of Simple-Markdown were adapted from marked.js copyright (c) 2011-2014
 * Christopher Jeffrey (https://github.com/chjj/).
 *
 * LICENSE (MIT):
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


const CR_NEWLINE_R = /\r\n?/g;
const TAB_R = /\t/g;
const FORMFEED_R = /\f/g;
const CLASS_R = /(?:^| )\.([a-z-]+)(?: |$)/;
const WIDTH_R = /(?:^| )width="?([\d.a-z]+"?)(?: |$)/;
const COL_WIDTHS_R = /(?:^| )colWidths="([^"]*)"/;
const ID_R = /(?:^| )#([a-z-]+)(?: |$)/;

// Turn various whitespace into easy-to-process whitespace
const preprocess = function(source) {
  return source.replace(CR_NEWLINE_R, "\n").replace(FORMFEED_R, "").replace(TAB_R, "    ");
};

// Creates a match function for an inline scoped element from a regex
const inlineRegex = function(regex) {
  const match = function(source, state) {
    return state.inline ? regex.exec(source) : null
  };
  match.regex = regex;
  return match;
};

// Creates a match function for a block scoped element from a regex
const blockRegex = function(regex) {
  const match = function(source, state) {
    return state.inline ? null : regex.exec(source)
  };
  match.regex = regex;
  return match;
};

// Creates a match function from a regex, ignoring block/inline scope
const anyScopeRegex = function(regex) {
  const match = function(source, state) {
    return regex.exec(source);
  };
  match.regex = regex;
  return match;
};

const UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;
const unescapeUrl = function(rawUrlString) {
  return rawUrlString.replace(UNESCAPE_URL_R, "$1");
};

const parseList = (str, state) => {
  const items = str.replace(LIST_BLOCK_END_R, "\n").match(LIST_ITEM_R);
  const isTight = state.inHtml && !/\n\n(?!$)/.test(str);
  const itemContent = items.map(function(item, i) {
    // We need to see how far indented this item is:
    const prefixCapture = LIST_ITEM_PREFIX_R.exec(item);
    const space = prefixCapture ? prefixCapture[0].length : 0;
    // And then we construct a regex to "unindent" the subsequent
    // lines of the items by that amount:
    const spaceRegex = new RegExp("^ {1," + space + "}", "gm");

    // Before processing the item, we need a couple things
    const content = item
      // remove indents on trailing lines:
      .replace(spaceRegex, "")
      // remove the bullet:
      .replace(LIST_ITEM_PREFIX_R, "");

    // backup our state for restoration afterwards. We're going to
    // want to set state._list to true, and state.inline depending
    // on our list's looseness.
    const oldStateInline = state.inline;
    const oldStateList = state._list;
    state._list = true;
    const oldStateTightness = state.isTight;
    state.isTight = isTight;

    // Parse the list item
    state.inline = isTight;
    const adjustedContent = content.replace(LIST_ITEM_END_R, "");
    const result = isTight
      ? { type: "list_item", content: parseInline(adjustedContent, state) }
      : { type: "list_item", content: parse$1(adjustedContent, state) };

    // Restore our state before returning
    state.inline = oldStateInline;
    state._list = oldStateList;
    state.isTight = oldStateTightness;
    return result;
  });

  return itemContent
};

const TABLES = (function() {
  const TABLE_ROW_SEPARATOR_TRIM = /^ *\| *| *\| *$/g;
  const TABLE_RIGHT_ALIGN = /^[-=]+:$/;
  const TABLE_CENTER_ALIGN = /^:[-=]+:$/;

  const parseTableAlign = function(source) {
    // Inspect ":" characters to set column justification.
    // Return class names that specify center or right justification on specific columns.
    source = source.replace(TABLE_ROW_SEPARATOR_TRIM, "");
    const alignArr = source.trim().split(/[|+*]/);
    let alignStr = "";
    for (let i = 0; i < alignArr.length; i++) {
      alignStr += TABLE_CENTER_ALIGN.test(alignArr[i])
        ? ` c${String(i + 1)}c`
        : (TABLE_RIGHT_ALIGN.test(alignArr[i])
        ? ` c${String(i + 1)}r`
        : "");
    }
    return alignStr.trim()
  };

  const tableDirectives = (directives, align) => {
    // Get CSS class, ID, and column widths, if any.
    if (!directives && align === "") { return ["", "", null] }
    const userDefClass = CLASS_R.exec(directives);
    let myClass = (userDefClass) ? userDefClass[1] : "";
    if (align.length > 0) { myClass += (myClass.length > 0 ? " " : "") + align; }
    const userDefId = ID_R.exec(directives);
    const myID = (userDefId) ? userDefId[1] : "";
    const colWidthMatch = COL_WIDTHS_R.exec(directives);
    const colWidths = (colWidthMatch) ? colWidthMatch[1].split(" ") : null;
    return [myClass, myID, colWidths]
  };

  const parsePipeTableRow = function(source, parse, state, colWidths, inHeader) {
    const prevInTable = state.inTable;
    state.inTable = true;
    const tableRow = parse(source.trim(), state);
    consolidate(tableRow);
    state.inTable = prevInTable;

    const row = {
      type: "table_row",
      content: []
    };
    let j = -1;
    tableRow.forEach(function(node, i) {
      if (node.type === "text") { node.text = node.text.trim(); }
      if (node.type === "tableSeparator") {
        if (i !== tableRow.length - 1) {  // Filter out the row's  last table separator
          // Create a new cell
          j += 1;
          row.content.push({
            "type": inHeader ? "table_header" : "table_cell",
            "attrs": {
              "colspan": 1,
              "rowspan": 1,
              "colwidth": (colWidths) ? [Number(colWidths[j])] : null,
              "background": null
            },
            content: (state.inHtml ? [] : [{ "type": "paragraph", "content": [] }])
          });
        }
      } else if (state.inHtml) {
        // For direct to HTML, write the inline contents directly into the <td> element.
        // row   cell    content      text
        row.content[j].content.push(node);
      } else {
        // Hurmet.app table cells always contain a paragraph.
        // row   cell  paragraph  content      text
        row.content[j].content[0].content.push(node);
      }
    });

    return row;
  };

  const parsePipeTable = function() {
    return function(capture, state) {
      state.inline = true;
      const align = parseTableAlign(capture[2]);
      const [myClass, myID, colWidths] = tableDirectives(capture[4], align);
      const table = {
        type: "table",
        attrs: {},
        content: []
      };
      if (myID) { table.attrs.id = myID; }
      if (myClass) { table.attrs.class = myClass; }
      table.content.push(parsePipeTableRow(capture[1], parse$1, state, colWidths, true));
      const tableBody = capture[3].trim().split("\n");
      tableBody.forEach(row => {
        table.content.push(parsePipeTableRow(row, parse$1, state, colWidths, false));
      });
      state.inline = false;
      return table
    };
  };

  const headerRegEx = /^\+:?=/;

  const parseGridTable = function() {
    return function(capture, state) {
      const topBorder = capture[2];
      const align = parseTableAlign(topBorder.slice(1));
      const [myClass, myID, colWidths] = tableDirectives(capture[3], align);
      const lines = capture[1].slice(0, -1).split("\n");

      // Does the grid table contain a line separating header from table body?
      let headerExists = false;
      let headerSepLine = lines.length + 10;
      for (let i = 0; i < lines.length; i++) {
        if (headerRegEx.test(lines[i])) {
          headerExists = true;
          headerSepLine = i;
          break
        }
      }

      // Read the top & left borders to find the locations of the cell corners.
      const xCorners = [0];
      for (let j = 1; j < topBorder.length; j++) {
        const ch = topBorder.charAt(j);
        // A "+" character indicates a column border.
        if (ch === "+") { xCorners.push(j); }
      }
      const yCorners = [0];
      for (let i = 1; i < lines.length; i++) {
        const ch = lines[i].charAt(0);
        if (ch === "+") { yCorners.push(i); }
      }

      const numCols = xCorners.length - 1;
      const numRows = yCorners.length - 1;
      const gridTable = [];

      // Create default rows and cells. They may be merged later.
      for (let i = 0; i < numRows; i++) {
        const row = new Array(numCols);
        for (let j = 0; j < numCols; j++) { row[j] = { rowspan: 1 }; }
        gridTable.push(row);
      }

      for (let i = 0; i < numRows; i++) {
        const row = gridTable[i];
        // Determine the actual rowspan and colspan of each cell.
        for (let j = 0; j < numCols; j++) {
          const cell = row[j];
          if (cell.rowspan === 0) { continue }
          cell.colspan = 1;
          const lastTextRow = lines[yCorners[i + 1] - 1];
          for (let k = j + 1; k < xCorners.length; k++) {
            if (lastTextRow.charAt(xCorners[k]) === "|") { break }
            cell.colspan += 1;
            row[k].rowspan = 0;
          }
          for (let k = i + 1; k < yCorners.length; k++) {
            const ch = lines[yCorners[k]].charAt(xCorners[j] + 1);
            if (ch === "-" || ch === "=") { break }
            cell.rowspan += 1;
            for (let jj = 0; jj < cell.colspan; jj++) {
              gridTable[k][j + jj].rowspan = 0;
            }
          }
          // Now that we know the cell extents, get the cell contents.
          const xStart = xCorners[j] + 2;
          const xEnd = xCorners[j + cell.colspan] - 1;
          const yStart = yCorners[i] + 1;
          const yEnd = yCorners[i + cell.rowspan];
          let str = "";
          for (let ii = yStart; ii < yEnd; ii++) {
            str += lines[ii].slice(xStart, xEnd).replace(/ +$/, "") + "\n";
          }
          cell.blob = str.slice(0, -1).replace(/^\n+/, "");

          cell.inHeader = (headerExists && yStart < headerSepLine);

          if (colWidths) {
            // Set an attribute used by ProseMirror.
            let cellWidth = 0;
            for (let k = 0; k < cell.colspan; k++) {
              cellWidth += Number(colWidths[j + k]);
            }
            cell.width = cellWidth;
          }
        }
      }

      const table = {
        type: "table",
        attrs: {},
        content: []
      };
      if (myID) { table.attrs.id = myID; }
      if (myClass) { table.attrs.class = myClass; }
      for (let i = 0; i < numRows; i++) {
        table.content.push({ type: "table_row", content: [] } );
        for (let j = 0; j < numCols; j++) {
          if (gridTable[i][j].rowspan === 0) { continue }
          const cell = gridTable[i][j];
          state.inline = false;
          let content = parse$1(cell.blob, state);
          if (state.inHtml && content.length === 1 && content[0].type === "paragraph") {
            content = content[0].content;
          }
          table.content[i].content.push({
            "type": cell.inHeader ? "table_header" : "table_cell",
            "attrs": {
              "colspan": cell.colspan,
              "rowspan": cell.rowspan,
              "colwidth": (colWidths) ? [cell.width] : null,
              "background": null
            },
            content: content
          });
        }
      }
      state.inline = false;
      return table
    };
  };

  return {
    parsePipeTable: parsePipeTable(),
    PIPE_TABLE_REGEX: /^(\|.+)\n\|([-:]+[-| :]*)\n((?:\|.*(?:\n|$))*)(?:\{([^\n}]+)\}\n)?\n*/,
    parseGridTable: parseGridTable(),
    GRID_TABLE_REGEX: /^((\+(?:[-:=]+\+)+)\n(?:[+|][^\n]+[+|]\n)+)(?:\{([^\n}]+)\}\n)?\n*/
  };
})();

const LINK_INSIDE = "(?:\\[[^\\]]*\\]|[^\\[\\]]|\\](?=[^\\[]*\\]))*";
const LINK_HREF_AND_TITLE =
  "\\s*<?((?:\\([^)]*\\)|[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";

const linkIndex = marks => {
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].type === "link") { return i }
  }
};

const parseRef = function(capture, state, refNode) {
  // Handle implicit refs: [title][<ref>], ![alt][<ref>], and  \n!![caption][<ref>]
  let ref = capture[2] ? capture[2] : capture[1];
  ref = ref.replace(/\s+/g, " ");

  // We store information about previously seen defs in state._defs
  // (_ to deconflict with client-defined state).
  if (state._defs && state._defs[ref]) {
    // The def for this reflink/refimage has already been seen.
    // in rules.set("def", ).  We can use its target/source here:
    const def = state._defs[ref];
    if (refNode.type === "figure") {
      refNode = { type: "figure", content: [
        { type: "figimg", attrs: def.attrs },
        { type: "figcaption", content: parseInline(refNode.attrs.alt, state) }
      ] };
      refNode.content[0].attrs.src = def.target;
    } else if (refNode.type === "image") {
      refNode.attrs.src = def.target;
      refNode.attrs = def.attrs;
    } else {
      // refNode is a link
      refNode.attrs.href = def.target;
    }
  }

  // In case we haven't seen our def yet (or if someone
  // overwrites that def later on), we add this node
  // to the list of ref nodes for that def. Then, when
  // we find the def, we can modify this link/image AST
  // node :).
  state._refs = state._refs || {};
  state._refs[ref] = state._refs[ref] || [];
  state._refs[ref].push(refNode);

  return refNode;
};

const parseTextMark = (capture, state, mark) => {
  const text = parseInline(capture, state);
  if (Array.isArray(text) && text.length === 0) { return text }
  consolidate(text);
  for (const range of text) {
    if (range.marks) {
      range.marks.push({ type: mark });
    } else {
      range.marks = [{ type: mark }];
    }
  }
  return text
};

const BLOCK_HTML = /^ *(?:<(head|h[1-6]|p|pre|script|style|table)[\s>][\s\S]*?(?:<\/\1>[^\n]*\n)|<!--[^>]+-->[^\n]*\n|<\/?(?:body|details|(div|input|label)(?: [^>]+)?|!DOCTYPE[a-z ]*|html[a-z ="]*|br|dl(?: class="[a-z-]+")?|li|main[a-z\- ="]*|nav|ol|ul(?: [^>]+)?)\/?>[^\n]*?(?:\n|$))/;
const divType = { C: "centered_div", H: "header", "i": "indented_div" };

// Rules must be applied in a specific order, so use a Map instead of an object.
const rules = new Map();
rules.set("html", {
  isLeaf: true,
  match: blockRegex(BLOCK_HTML),
  parse: function(capture, state) {
    if (!state.inHtml) { return null }
    return { type: "html", text: capture[0] }
  }
});
rules.set("heading", {
  isLeaf: false,
  match: blockRegex(/^ *(#{1,6})([^\n]+?)#* *(?:\n *)+\n/),
  parse: function(capture, state) {
    return {
      attrs: { level: capture[1].length },
      content: parseInline(capture[2].trim(), state)
    };
  }
});
rules.set("dt", {  // description term
  isLeaf: false,
  match: blockRegex(/^(([^\n]*)\n)(?=<dd>|\n:)/),
  parse: function(capture, state) {
    return { content: parseInline(capture[2].trim(), state) }
  }
});
rules.set("horizontal_rule", {
  isLeaf: true,
  match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
  parse: function(capture, parse, state) {
    return { type: "horizontal_rule" };
  }
});
rules.set("lheading", {
  isLeaf: false,
  match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
  parse: function(capture, parse, state) {
    return {
      type: "heading",
      level: capture[2] === '=' ? 1 : 2,
      content: parseInline(parse, capture[1])
    };
  }
});
rules.set("fence", {
  isLeaf: true,
  match: blockRegex(/^(`{3,}) *(?:(\S+) *)?\n([\s\S]+?)\n?\1 *(?:\n *)+\n/),
  parse: function(capture, state) {
    return {
      type: "code_block",
//      lang: capture[2] || undefined,
      content: [{ type: "text", text: capture[3] }]
    };
  }
});
rules.set("blockquote", {
  isLeaf: false,
  match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  parse: function(capture, state) {
    const content = capture[0].replace(/^ *> ?/gm, "");
    return { content: parse$1(content, state) };
  }
});
rules.set("ordered_list", {
  isLeaf: false,
  match: blockRegex(/^( {0,3})(\d{1,9}\.) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:\d{1,9}\.) )\n*|\s*$)/),
  parse: function(capture, state) {
    const start = Number(capture[2].trim());
    return { attrs: { order: start }, content: parseList(capture[0], state, capture[1]) }
  }
});
rules.set("bullet_list", {
  isLeaf: false,
  match: blockRegex(/^( {0,3})([*+-]) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:[*+-]) )\n*|\s*$)/),
  parse: function(capture, state) {
    return { content: parseList(capture[0], state, capture[1]) }
  }
});
rules.set("dd", {  // description details
  isLeaf: false,
  match: blockRegex(/^:( +)[\s\S]+?(?:\n{2,}(?! |:)(?!\1)\n*|\s*$)/),
  parse: function(capture, state) {
    let div = " " + capture[0].slice(1);
    const indent = 1 + capture[1].length;
    const spaceRegex = new RegExp("^ {" + indent + "," + indent + "}", "gm");
    div = div.replace(spaceRegex, ""); // remove indents on trailing lines:
    return { content: parse$1(div, state) };
  }
});
rules.set("special_div", {
  isLeaf: false,
  match: blockRegex(/^(C|H|i)>( {1,})[\s\S]+?(?:\n{2,}(?! {2,2}\2)\n*|\s*$)/),
  parse: function(capture, state) {
    const type = divType[capture[1]];
    let div = "  " + capture[0].slice(2);
    const indent = 2 + capture[2].length;
    const spaceRegex = new RegExp("^ {" + indent + "," + indent + "}", "gm");
    div = div.replace(spaceRegex, ""); // remove indents on trailing lines:
    return { type, content: parse$1(div, state) };
  }
});
rules.set("figure", {
  isLeaf: true,
  match: blockRegex(/^!!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]\s*(?:\n+|$)/),
  parse: function(capture, state) {
    return parseRef(capture, state, {
      type: "figure",
      attrs: { alt: capture[1] }
    });
  }
});
rules.set("def", {
  // Handle (link|image) definition
  // [def]: target
  // {.class #id width=number}

  isLeaf: true,
  // TODO(ron): Need to enable a escaped right bracket inside capture[1], the def
  match: blockRegex(/^\[((?:\\[\s\S]|[^\\])+?)\]: *<?([^\n>]*)>? *\n(?:\{([^\n}]*)\}\n)?/),
  parse: function(capture, state) {
    const def = capture[1].replace(/\s+/g, " ");
    const target = capture[2];
    const directives = capture[3] || "";

    const attrs = { alt: def };
    if (directives) {
      const matchClass = CLASS_R.exec(directives);
      const matchWidth = WIDTH_R.exec(directives);
      const matchID = ID_R.exec(directives);
      if (matchClass) { attrs.class = matchClass[1]; }
      if (matchWidth) { attrs.width = matchWidth[1]; }
      if (matchID)    { attrs.id = matchID[1]; }
    }

    // Look for previous links/images using this def
    // If any links/images using this def have already been declared in parseRef(),
    // they will have added themselves to the state._refs[def] list
    // (_ to deconflict with client-defined state). We look through
    // that list of reflinks for this def, and modify those AST nodes
    // with our newly found information now.
    if (state._refs && state._refs[def]) {
      // `refNode` can be a link or an image
      state._refs[def].forEach(function(refNode) {
        if (refNode.type === "figure" || refNode.type === "image") {
          const type = refNode.type === "figure" ? "figimg" : "image";
          const imgNode = { type, attrs: { src: target, alt: def } };
          if (attrs.class) { imgNode.attrs.class = attrs.class; }
          if (attrs.width) { imgNode.attrs.width = attrs.width; }
          if (attrs.id)    { imgNode.attrs.id = attrs.id; }
          if (refNode.type === "figure") {
            const caption = {
              type: "figcaption",
              content: parseInline(refNode.attrs.alt, state)
            };
            refNode.content = [imgNode, caption];
            attrs.caption = caption;
          } else {
            refNode.attrs = imgNode.attrs;
          }
        } else {
          // link node
          refNode.attrs.href = target;
        }
      });
    }

    // Add this def to our map of defs for any future links/images
    // In case we haven't found any or all of the refs referring to
    // this def yet, we add our def to the table of known defs, so
    // that future reflinks can modify themselves appropriately with
    // this information.
    state._defs = state._defs || {};
    state._defs[def] = { target, attrs };

    // return the relevant parsed information
    // for debugging only.
    return {
      def: def,
      target: target,
      directives: directives
    };
  }
});
rules.set("toc", {
  isLeaf: true,
  match: blockRegex(/^{\.toc start=(\d) end=(\d)}\n/),
  parse: function(capture, state) {
    return { attrs: { start: Number(capture[1]), end: Number(capture[2]), body: [] } }
  }
});
rules.set("pipeTable", {
  isLeaf: false,
  match: blockRegex(TABLES.PIPE_TABLE_REGEX),
  parse: TABLES.parsePipeTable
});
rules.set("gridTable", {
  isLeaf: false,
  match: blockRegex(TABLES.GRID_TABLE_REGEX),
  parse: TABLES.parseGridTable
});
rules.set("newline", {
  isLeaf: true,
  match: blockRegex(/^(?:\n *)*\n/),
  parse: function() { return { type: "null" } }
});
rules.set("paragraph", {
  isLeaf: false,
  match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
  parse: function(capture, state) {
    return { content: parseInline(capture[1], state) };
  }
});
rules.set("escape", {
  // We don't allow escaping numbers, letters, or spaces here so that
  // backslashes used in plain text still get rendered. But allowing
  // escaping anything else provides a very flexible escape mechanism,
  // regardless of how this grammar is extended.
  isLeaf: true,
  match: inlineRegex(/^\\([^0-9A-Za-z\s])/),
  parse: function(capture, state) {
    return {
      type: "text",
      text: capture[1]
    };
  }
});
rules.set("tableSeparator", {
  isLeaf: true,
  match: function(source, state) {
    if (!state.inTable) {
      return null;
    }
    return /^ *\| */.exec(source);
  },
  parse: function() {
    return { type: "tableSeparator" };
  }
});
rules.set("calculation", {
  isLeaf: true,
  match: anyScopeRegex(/^(?:¢((?:\\[\s\S]|[^\\])+?)¢|¢¢\n?((?:\\[\s\S]|[^\\])+?)\n?¢¢)/),
  parse: function(capture, state) {
    if (capture[1]) {
      let entry = capture[1].trim();
      if (!/^(?:function|draw\()/.test(entry) && entry.indexOf("``") === -1) {
        entry = entry.replace(/\n/g, " ");
      }
      return { content: "", attrs: { entry } }
    } else {
      const entry = capture[2].trim();
      return { content: "", attrs: { entry, displayMode: true } }
    }
  }
});
rules.set("tex", {
  isLeaf: true,
  match: anyScopeRegex(/^(?:\$\$\n?((?:\\[\s\S]|[^\\])+?)\n?\$\$|\$((?:\\[\s\S]|[^\\])+?)\$)/),
  parse: function(capture, state) {
    if (capture[2]) {
      const tex = capture[2].trim().replace(/\n/g, " ");
      return { content: "", attrs: { tex } }
    } else {
      const tex = capture[1].trim();
      return { content: "", attrs: { tex, displayMode: true } }
    }
  }
});
rules.set("comment", {
  isLeaf: true,
  match: inlineRegex(/^©((?:\\[\s\S]|[^\\])+?)©/),
  parse: function(capture, state) {
    return { content: "", attrs: { comment: capture[1] } }
  }
});
rules.set("link", {
  isLeaf: true,
  match: inlineRegex(
    new RegExp("^\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)")
  ),
  parse: function(capture, state) {
    const textNode = parseTextMark(capture[1], state, "link" )[0];
    const i = linkIndex(textNode.marks);
    textNode.marks[i].attrs = { href: unescapeUrl(capture[2]) };
    return textNode
  }
});
rules.set("image", {
  isLeaf: true,
  match: inlineRegex(
    new RegExp("^!\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)")
  ),
  parse: function(capture, state) {
    return { attrs: { alt: capture[1], src: unescapeUrl(capture[2]) } }
  }
});
rules.set("reflink", {
  isLeaf: true,
  match: inlineRegex(/^\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]/),
  parse: function(capture, state) {
    const textNode = parseTextMark(capture[1], state, "link" )[0];
    const i = linkIndex(textNode.marks);
    textNode.marks[i].attrs = { href: null };
    if (capture[2]) {
      textNode.marks[i].attrs.title = capture[2];
    }
    parseRef(capture, state, textNode.marks[i]);
    return textNode
  }
});
rules.set("refimage", {
  isLeaf: true,
  match: inlineRegex(/^!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]/),
  parse: function(capture, state) {
    return parseRef(capture, state, {
      type: "image",
      attrs: { alt: capture[1] }
    });
  }
});
rules.set("code", {
  isLeaf: true,
  match: inlineRegex(/^(`+)([\s\S]*?[^`])\1(?!`)/),
  parse: function(capture, state) {
    const text = capture[2].trim();
    return [{ type: "text", text, marks: [{ type: "code" }] }]
/*    state.inCode = true
    const code = parseTextMark(text, state, "code" )
    state.inCode = false
    return code */
  }
});
rules.set("em", {
  isLeaf: true,
  match: inlineRegex(/^_((?:\\[\s\S]|[^\\])+?)_/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "em" )
  }
});
rules.set("strong", {
  isLeaf: true,
  match: inlineRegex(/^\*\*(?=\S)((?:\\[\s\S]|\*(?!\*)|[^\s*\\]|\s(?!\*\*))+?)\*\*/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "strong" )
  }
});
rules.set("strikethru", {
  isLeaf: true,
  match: inlineRegex(/^~~(?=\S)((?:\\[\s\S]|~(?!~)|[^\s~\\]|\s(?!~~))+?)~~/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "strikethru" )
  }
});
rules.set("superscript", {
  isLeaf: true,
  match: inlineRegex(/^<sup>([\s\S]*?)<\/sup>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "superscript" )
  }
});
rules.set("subscript", {
  isLeaf: true,
  match: inlineRegex(/^~((?:\\[\s\S]|[^\\])+?)~/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "subscript" )
  }
});
rules.set("underline", {
  isLeaf: true,
  match: inlineRegex(/^<u>([\s\S]*?)<\/u>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "underline" )
  }
});
rules.set("highlight", {
  isLeaf: true,
  match: inlineRegex(/^<mark>([\s\S]*?)<\/mark>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "highlight" )
  }
});
rules.set("hard_break", {
  isLeaf: true,
  match: anyScopeRegex(/^\\\n/),
  parse: function() { return { text: "\n" } }
});
rules.set("inline_break", {
  isLeaf: true,
  match: anyScopeRegex(/^<br>/),
  parse: function() { return { type: "hard_break", text: "\n" } }
});
rules.set("span", {
  isLeaf: true,
  match: inlineRegex(/^<span [a-z =":]+>[^<]+<\/span>/),
  parse: function(capture, state) {
    return !state.inHtml ? null : { type: "html", text: capture[0] }
  }
});
rules.set("text", {
  // Here we look for anything followed by non-symbols,
  // double newlines, or double-space-newlines
  // We break on any symbol characters so that this grammar
  // is easy to extend without needing to modify this regex
  isLeaf: true,
  match: anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff]|\n\n| {2,}\n|\w+:\S|$)/),
  parse: function(capture, state) {
    return {
      text: capture[0].replace(/\n/g, " ")
    };
  }
});

const doNotEscape = ["calculation", "code", "tex"];
const textModeRegEx = /\\(ce|text|hbox|raisebox|fbox)\{/;

const identifyTeX = (source) => {
  // In TeX, a pair of $…$ delimiters can be nested inside \text{…}.
  // Parse the string and do not end on a $ inside a {} group.
  let prevChar = "$";
  let groupLevel = 0;
  for (let i = 1; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === "{" && prevChar !== "\\") { groupLevel += 1; }
    if (ch === "}" && prevChar !== "\\") { groupLevel -= 1; }
    if (ch === "$" && prevChar !== "\\" && groupLevel === 0) {
      return [source.slice(0, i + 1), null, source.slice(1, i)]
    }
    prevChar = ch;
  }
  return [source, null, source.slice(1, -1)]
};

const parse$1 = (source, state) => {
  if (!state.inline) { source += "\n\n"; }
  source = preprocess(source);
  const result = [];
  while (source) {
    // store the best match and its rule:
    let capture = null;
    let ruleName = null;
    let rule = null;
    for (const [currRuleName, currRule] of rules) {
      if (state.inCode && doNotEscape.includes(currRuleName)) { continue }
      capture = currRule.match(source, state);
      if (capture) {
        rule = currRule;
        ruleName = currRuleName;
        break
      }
    }
    if (ruleName === "tex" && capture[2] && textModeRegEx.test(capture[2])) {
      capture = identifyTeX(source);  // Check a TeX string for nested $
    }
    const parsed = rule.parse(capture, state);
    if (Array.isArray(parsed)) {
      Array.prototype.push.apply(result, parsed);
    } else {
      if (parsed.type == null) { parsed.type = ruleName; }
      result.push(parsed);
    }
    source = source.substring(capture[0].length);
  }
  return result
};



/**
 * Parse some content with the parser `parse`, with state.inline
 * set to true. Useful for block elements; not generally necessary
 * to be used by inline elements (where state.inline is already true.
 */
const parseInline = function(content, state) {
  const isCurrentlyInline = state.inline || false;
  state.inline = true;
  const result = parse$1(content, state);
  state.inline = isCurrentlyInline;
  return result;
};


// recognize a `*` `-`, `+`, `1.`, `2.`... list bullet
const LIST_BULLET = "(?:[*+-]|\\d+\\.)";
// recognize the start of a list item:
// leading space plus a bullet plus a space (`   * `)
const LIST_ITEM_PREFIX = "( *)(" + LIST_BULLET + ") +";
const LIST_ITEM_PREFIX_R = new RegExp("^" + LIST_ITEM_PREFIX);
// recognize an individual list item:
//  * hi
//    this is part of the same item
//
//    as is this, which is a new paragraph in the same item
//
//  * but this is not part of the same item
const LIST_ITEM_R = new RegExp(
  LIST_ITEM_PREFIX + "[^\\n]*(?:\\n" + "(?!\\1" + LIST_BULLET + " )[^\\n]*)*(\n|$)",
  "gm"
);
const BLOCK_END_R = /\n{2,}$/;
// recognize the end of a paragraph block inside a list item:
// two or more newlines at end end of the item
const LIST_BLOCK_END_R = BLOCK_END_R;
const LIST_ITEM_END_R = / *\n+$/;

const ignore = ["def", "newline", "null"];

const consolidate = arr => {
  if (Array.isArray(arr) && arr.length > 0) {
    // Group any text nodes together into a single string output.
    for (let i = arr.length - 1; i > 0; i--) {
      const node = arr[i];
      const prevNode = arr[i - 1];
      if (node.type === 'text' && prevNode.type === 'text' &&
          !node.marks && !prevNode.marks) {
        prevNode.text += node.text;
        arr.splice(i, 1);
      } else if (ignore.includes(node.type)) {
        arr.splice(i, 1);
      } else if (!rules.has(node.type) || !rules.get(node.type).isLeaf) {
        consolidate(node.content);
      }
    }

    if (!rules.has(arr[0].type) || !rules.get(arr[0].type).isLeaf) {
      consolidate(arr[0].content);
    }
  }
};

const populateTOC = ast => {
  let tocNode;
  for (const node of ast) {
    if (node.type === "toc") { tocNode = node; break }
  }
  if (!tocNode) { return }
  const start = tocNode.attrs.start;
  const end = tocNode.attrs.end;
  for (const node of ast) {
    if (node.type === "heading") {
      const level = node.attrs.level;
      if (start <= level && level <= end) {
        const tocEntry = [];
        let str = "";
        for (const range of node.content) { str += range.text; }
        tocEntry.push(str);
        tocEntry.push(level);
        tocEntry.push(0); // page number unknown
        tocEntry.push(0); // element number unknown
        tocNode.attrs.body.push(tocEntry);
      }
    }
  }
};

const md2ast = (md, inHtml = false) => {
  const ast = parse$1(md, { inline: false, inHtml });
  if (Array.isArray(ast) && ast.length > 0 && ast[0].type === "null") { ast.shift(); }
  consolidate(ast);
  populateTOC(ast);
  return ast
};

const startSvg = _ => {
  return {
    tag: 'svg',
    children: [],
    attrs: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 250,
      height: 250,
      style: "display: inline;"
    },
    temp: {
      width: 250,
      height: 250,
      xmin: 0,
      xmax: 5,
      ymin: 0,
      ymax: 5,
      xunitlength: 20,  // px
      yunitlength: 20,  // px
      origin: [0, 0],   // in px (default is bottom left corner)
      stroke: "black",
      strokewidth: 1,
      strokedasharray: null,
      fill: "none",
      fontstyle: "normal",
      fontfamily: "sans-serif",
      fontsize: 13.33, // px, ~10 pt
      fontweight: "normal",
      markerstrokewidth: 1,
      markerstroke: "black",
      markerfill: "yellow",
      markersize: 4,
      marker: "none",
      dotradius: 4,
      axesstroke: "black",
      gridstroke: "grey",
      isDim: false
    }
  }
};

// Helpers
const setStrokeAndFill = (node, attrs) => {
  node.attrs["stroke-width"] = attrs.strokewidth;
  node.attrs.stroke = attrs.stroke;
  node.attrs.fill = attrs.fill;
  if (attrs.strokedasharray != null && attrs.strokedasharray !== "none") {
    node.attrs["stroke-dasharray"] = attrs.strokedasharray;
  }
};

const pointZeroRegEx = /\.0+$/;
const chopZ = str => {
  const k = str.indexOf(".");
  if (k === -1) { return str }
  if (pointZeroRegEx.test(str)) { return str.replace(pointZeroRegEx, "") }
  let i;
  for (i = str.length - 1; i > k && str.charAt(i) === "0"; i--) {
    if (i === k) { i--; }
  }
  return str.slice(0, i + 1)
};

const markerDot = (center, attrs, s, f) => { // coordinates in units, radius in pixel
  if (s == null) { s = attrs.stroke; }
  if (f == null) { f = attrs.fill; }
  const node = { tag: "circle", attrs: {} };
  node.attrs.cx = center[0] * attrs.xunitlength + attrs.origin[0];
  node.attrs.cy = attrs.height - center[1] * attrs.yunitlength - attrs.origin[1];
  node.attrs.r = attrs.markersize;
  node.attrs["stroke-width"] = attrs.strokewidth;
  node.attrs.stroke = s;
  node.attrs.fill = f;
  return node
};

const arrowhead = (svg, p, q) => { // draw arrowhead at q (in units)
  const attrs = svg.temp;
  const v = [p[0] * attrs.xunitlength + attrs.origin[0], attrs.height -
             p[1] * attrs.yunitlength - attrs.origin[1]];
  const w = [q[0] * attrs.xunitlength + attrs.origin[0], attrs.height -
             q[1] * attrs.yunitlength - attrs.origin[1]];
  let u = [w[0] - v[0], w[1] - v[1]];
  const d = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
  if (d > 0.00000001) {
    u = [u[0] / d, u[1] / d];
    const z = attrs.marker === "markerdot" ? 3 : attrs.isDim ? 0 : 1;
    const up = [-u[1], u[0]];
    const node = { tag: "path", attrs: {} };
    node.attrs.d = "M " + (w[0] - 12.5 * u[0] - 3 * up[0]) + "," +
      (w[1] - 12.5 * u[1] - 3 * up[1]) + " L " + (w[0] - z * u[0]) + "," + (w[1] - z * u[1]) +
      " L " + (w[0] - 12.5 * u[0] + 3 * up[0]) + "," + (w[1] - 12.5 * u[1] + 3 * up[1]) + " z";
    if (attrs.isDim) {
      node.attrs.stroke = "none";
    } else {
      node.attrs["stroke-width"] = attrs.markerstrokewidth;
      node.attrs.stroke = attrs.stroke;
    }
    node.attrs.fill = attrs.stroke;
    svg.children.push(node);
  }
};

const markAttribute = {
  em:         ["font-style", "italic"],
  strong:     ["font-weight", "bold"],
  code:       ["font-family", "monospace"],
  strikethru: ["text-decoration", "line-through"],
  subscript:  ["font-size", "0.8em"]
};

const textLocal = (svg, p, str, pos) => {
  const attrs = svg.temp;
  let textanchor = "middle";
  let dx = 0;
  let dy = attrs.fontsize / 3;
  if (pos != null) {
    if (pos.slice(0, 5) === "above") { dy = -attrs.fontsize / 2; }
    if (pos.slice(0, 5) === "below") { dy = 1.25 * attrs.fontsize; }
    if (pos.slice(0, 5) === "right" || pos.slice(5, 10) === "right") {
      textanchor = "start";
      dx = attrs.fontsize / 2;
    }
    if (pos.slice(0, 4) === "left" || pos.slice(5, 9) === "left") {
      textanchor = "end";
      dx = -attrs.fontsize / 2;
    }
  }
  const textNode = { tag: "text", children: [], attrs: {} };
  textNode.attrs["text"] = str;
  textNode.attrs.x = p[0] * attrs.xunitlength + attrs.origin[0] + dx;
  textNode.attrs.y = attrs.height - p[1] * attrs.yunitlength - attrs.origin[1] + dy;
  textNode.attrs["font-family"] = attrs.fontfamily;
  textNode.attrs["font-size"] = attrs.fontsize;
  textNode.attrs["text-anchor"] = textanchor;
  // Load Markdown into an AST
  const ast = md2ast(str)[0].content;
  // Load content of AST into <tspan> nodes.
  if (Array.isArray(ast)) {
    let prevNodeContainedSubscript = false;
    for (const markNode of ast) {
      const tspan = { tag: "tspan", text: markNode.text };
      let currentNodeContainsSubscript = false;
      if (markNode.marks) {
        tspan.attrs = {};
        for (const mark of markNode.marks) {
          const markAttr = markAttribute[mark.type];
          tspan.attrs[markAttr[0]] = markAttr[1];
          if (mark.type === "subscript") { currentNodeContainsSubscript = true; }
        }
      }
      if (currentNodeContainsSubscript) {
        if (!prevNodeContainedSubscript) { tspan.attrs.dy  = "2"; }
      } else if (prevNodeContainedSubscript) {
        if (!markNode.marks) { tspan.attrs = {}; }
        tspan.attrs.dy  = "-2";
      }
      prevNodeContainedSubscript = currentNodeContainsSubscript;
      textNode.children.push(tspan);
    }
  }
  svg.children.push(textNode);
  return svg
};

const functions = {
  // Set attributes
  stroke(svgOprnd, color) {
    svgOprnd.value.temp.stroke = color.value;
    return svgOprnd
  },

  strokewidth(svgOprnd, num) {
    svgOprnd.value.temp.strokewidth = Rnl.toNumber(num.value);
    return svgOprnd
  },

  strokedasharray(svgOprnd, str) {
    svgOprnd.value.temp.strokedasharray = str.value;
    return svgOprnd
  },

  fill(svgOprnd, color) {
    svgOprnd.value.temp.fill = color.value;
    return svgOprnd
  },

  fontsize(svgOprnd, size) {
    svgOprnd.value.temp.fontsize = Rnl.toNumber(size.value);
    return svgOprnd
  },

  fontfamily(svgOprnd, str) {
    svgOprnd.value.temp.fontfamily = str.value; // "sansserif"|"serif"|"fixed"|"monotype"
    return svgOprnd
  },

  marker(svgOprnd, str) {
    svgOprnd.value.temp.marker = str.value; // "none" | "dot" | "arrow" | "arrowdot"
    return svgOprnd
  },

  // Initialize the svg.

  title(svgOprnd, strOprnd) {
    svgOprnd.value.children.push( { tag: "title", attrs: { text: strOprnd.value } });
    return svgOprnd
  },

  frame(svgOprnd, width = 250, height = 250, position = "inline") {
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    attrs.width = typeof width === "number" ? width : Rnl.toNumber(width.value);
    svg.attrs.width = attrs.width;
    attrs.height = typeof height === "number" ? height : Rnl.toNumber(height.value);
    svg.attrs.height = attrs.height;
    if (typeof position !== "string") { position = position.value; }
    svg.attrs.style = `float: ${position}`;
    attrs.xunitlength = attrs.width / (attrs.xmax - attrs.xmin);
    attrs.yunitlength = attrs.height / (attrs.ymax - attrs.ymin);
    attrs.origin = [-attrs.xmin * attrs.xunitlength, -attrs.ymin * attrs.yunitlength];
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  view(svgOprnd, xmin = 0, xmax = 5, ymin, ymax) {
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    attrs.xmin = typeof xmin === "number" ? xmin : Rnl.toNumber(xmin.value);
    attrs.xmax = typeof xmax === "number" ? xmax : Rnl.toNumber(xmax.value);
    attrs.xunitlength = attrs.width / (attrs.xmax - attrs.xmin);
    attrs.yunitlength = attrs.xunitlength; // This may change below.
    if (ymin == null) {
      attrs.origin = [-attrs.xmin * attrs.xunitlength, attrs.height / 2];
      attrs.ymin = -attrs.height / (2 * attrs.yunitlength);
      attrs.ymax = -attrs.ymin;
    } else {
      attrs.ymin = Rnl.toNumber(ymin.value);
      if (ymax != null) {
        attrs.ymax = Rnl.toNumber(ymax.value);
        attrs.yunitlength = attrs.height / (attrs.ymax - attrs.ymin);
      } else {
        attrs.ymax = attrs.height / attrs.yunitlength + attrs.ymin;
      }
      attrs.origin = [-attrs.xmin * attrs.xunitlength, -attrs.ymin * attrs.yunitlength];
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  // Draw things

  grid(svgOprnd, gdx, gdy, isLocal) {
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    gdx = gdx == null ? attrs.xunitlength : Rnl.toNumber(gdx.value) * attrs.xunitlength;
    gdy = gdy == null ? gdx : Rnl.toNumber(gdy.value) * attrs.yunitlength;
    const pnode = { tag: "path", attrs: {} };
    let str = "";
    for (let x = attrs.origin[0]; x < attrs.width; x += gdx) {
      str += " M" + x + ",0 " + x + "," + attrs.height;
    }
    for (let x = attrs.origin[0] - gdx; x > 0; x -= gdx) {
      str += " M" + x + ",0 " + x + "," + attrs.height;
    }
    for (let y = attrs.height - attrs.origin[1]; y < attrs.height; y += gdy) {
      str += " M0," + y + " " + attrs.width + "," + y;
    }
    for (let y = attrs.height - attrs.origin[1] - gdy; y > 0; y -= gdy) {
      str += " M0," + y + " " + attrs.width + "," + y;
    }
    pnode.attrs.d = str;
    pnode.attrs["stroke-width"] = 0.5;
    pnode.attrs.stroke = attrs.gridstroke;
    pnode.attrs.fill = attrs.fill;
    svg.children.push(pnode);
    if (!isLocal) {
      return { value: svg, unit: null, dtype: dt.DRAWING }
    }
  },

  axes(svgOprnd, dx, dy, labels, gdx, gdy) {
    let svg = svgOprnd.value;
    const attrs = svg.temp;
    dx = (dx == null ? attrs.xunitlength : Rnl.toNumber(dx.value) * attrs.xunitlength);
    dy = (dy == null ? dx : Rnl.toNumber(dy.value) * attrs.yunitlength);
    const parentFontsize = attrs.fontsize;
    attrs.fontsize = Math.min(dx / 2, dy / 2, 10);
    const ticklength = attrs.fontsize / 4;
    if (gdx != null) {
      this.grid(svgOprnd, gdx, gdy, true);
    }
    const pnode = { tag: "path", attrs: {} };
    let str = "M0," + (attrs.height - attrs.origin[1]) + " " + attrs.width + "," +
      (attrs.height - attrs.origin[1]) + " M" + attrs.origin[0] + ",0 " +
      attrs.origin[0] + "," + attrs.height;
    for (let x = attrs.origin[0] + dx; x < attrs.width; x += dx) {
      str += " M" + x + " " + (attrs.height - attrs.origin[1] + ticklength) + " " + x
            + "," + (attrs.height - attrs.origin[1] - ticklength);
    }
    for (let x = attrs.origin[0] - dx; x > 0; x -= dx) {
      str += " M" + x + "," + (attrs.height - attrs.origin[1] + ticklength) + " " + x
            + "," + (attrs.height - attrs.origin[1] - ticklength);
    }
    for (let y = attrs.height - attrs.origin[1] + dy; y < attrs.height; y += dy) {
      str += " M" + (attrs.origin[0] + ticklength) + "," + y + " " +
                   (attrs.origin[0] - ticklength) + "," + y;
    }
    for (let y = attrs.height - attrs.origin[1] - dy; y > 0; y -= dy) {
      str += " M" + (attrs.origin[0] + ticklength) + "," + y + " " +
                   (attrs.origin[0] - ticklength) + "," + y;
    }
    if (labels != null) {
      const ldx = dx / attrs.xunitlength;
      const ldy = dy / attrs.yunitlength;
      const lx = (attrs.xmin > 0 || attrs.xmax < 0 ? attrs.xmin : 0);
      const ly = (attrs.ymin > 0 || attrs.ymax < 0 ? attrs.ymin : 0);
      const lxp = (ly === 0 ? "below" : "above");
      const lyp = (lx === 0 ? "left" : "right");
      const ddx = Math.floor(1.1 - Math.log(ldx) / Math.log(10)) + 1;
      const ddy = Math.floor(1.1 - Math.log(ldy) / Math.log(10)) + 1;
      for (let x = ldx; x <= attrs.xmax; x += ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp);
      }
      for (let x = -ldx; attrs.xmin <= x; x -= ldx) {
        svg = textLocal(svg, [x, ly], chopZ(x.toFixed(ddx)), lxp);
      }
      for (let y = ldy; y <= attrs.ymax; y += ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp);
      }
      for (let y = -ldy; attrs.ymin <= y; y -= ldy) {
        svg = textLocal(svg, [lx, y], chopZ(y.toFixed(ddy)), lyp);
      }
    }
    pnode.attrs.d = str;
    pnode.attrs["stroke-width"] = 0.5;
    pnode.attrs.stroke = attrs.axesstroke;
    pnode.attrs.fill = attrs.fill;
    svg.temp.fontsize = parentFontsize;
    svg.children.push(pnode);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  line(svgOprnd, m) { // segment connecting points p,q (coordinates in units)
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "path", attrs: {} };
    const p = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])];
    const q = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])];
    node.attrs.d = "M" + (p[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - p[1] * attrs.yunitlength - attrs.origin[1]) + " " +
      (q[0] * attrs.xunitlength + attrs.origin[0]) + "," + (attrs.height -
       q[1] * attrs.yunitlength - attrs.origin[1]);
    setStrokeAndFill(node, attrs);
    svg.children.push(node);
    if (attrs.marker === "dot" || attrs.marker === "arrowdot") {
      svg.children.push(markerDot(p, attrs, attrs.markerstroke, attrs.markerfill));
      if (attrs.marker === "arrowdot") { arrowhead(svg, p, q); }
      svg.children.push(markerDot(q, attrs, attrs.markerstroke, attrs.markerfill));
    } else if (attrs.marker === "arrow") {
      arrowhead(svg, p, q);
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  path(svgOprnd, plistOprnd, c) {
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "path", attrs: {} };
    // Get the "d" attribute of a path
    let str = "";
    let plist;
    if (typeof plistOprnd === "string") {
      str = plistOprnd.value;
    } else {
      plist = plistOprnd.value.map(row => row.map(e => Rnl.toNumber(e)));
      if (c == null) {
        c = new Array(plist.length).fill("L");
        c[0] = "M";
      } else if (c.dtype === dt.STRING) {
        c = new Array(plist.length).fill(c.value);
        c[0] = "M";
      } else if (typeof c === "string") {
        c = new Array(plist.length).fill(c);
        c[0] = "M";
      } else if ((c.dtype & dt.ROWVECTOR) || (c.dtype & dt.COLUMNVECTOR)) {
        c = c.value.map(e => {
          if (Rnl.isZero(e)) { return "L" }
          const radius = Rnl.toNumber(e) * attrs.xunitlength;
          return `A${radius} ${radius} 0 0 0 `
        });
        c.unshift("M");
      } else {
        c = new Array(plist.length).fill("L");
        c[0] = "M";
      }
      for (let i = 0; i < plist.length; i++) {
        str += c[i] + (plist[i][0] * attrs.xunitlength + attrs.origin[0]) + ","
            + (attrs.height - plist[i][1] * attrs.yunitlength - attrs.origin[1]) + " ";
      }
    }
    node.attrs.d = str;
    node.attrs["stroke-width"] = attrs.strokewidth;
    if (attrs.strokedasharray != null) {
      node.attrs["stroke-dasharray"] = attrs.strokedasharray;
    }
    node.attrs.stroke = attrs.stroke;
    node.attrs.fill = attrs.fill;
    if (attrs.marker === "dot" || attrs.marker === "arrowdot") {
      for (let i = 0; i < plist.length; i++) {
        if (c !== "C" && c !== "T" || i !== 1 && i !== 2) {
          svg.children.push(markerDot(plist[i], attrs, attrs.markerstroke, attrs.markerfill));
        }
      }
    } else if (attrs.marker === "arrow") {
      arrowhead(svg, plist[plist.length - 2], plist[plist.length - 1]);
    }
    svg.children.push(node);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  curve(svgOprnd, plist) {
    return functions.path(svgOprnd, plist, "T")
  },

  rect(svgOprnd, m, r) { // opposite corners in units, rounded by radius
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "rect", attrs: {} };
    const p = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])];
    const q = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])];
    node.attrs.x = p[0] * attrs.xunitlength + attrs.origin[0];
    node.attrs.y = attrs.height - q[1] * attrs.yunitlength - attrs.origin[1];
    node.attrs.width = (q[0] - p[0]) * attrs.xunitlength;
    node.attrs.height = (q[1] - p[1]) * attrs.yunitlength;
    if (r != null) {
      const rNum = Rnl.toNumber(r.value) * attrs.xunitlength;
      node.attrs.rx = rNum;
      node.attrs.ry = rNum;
    }
    setStrokeAndFill(node, attrs);
    svg.children.push(node);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  circle(svgOprnd, center, radius) { // coordinates in units
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "circle", attrs: {} };
    node.attrs.cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0];
    node.attrs.cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
                  - attrs.origin[1];
    node.attrs.r = Rnl.toNumber(radius.value) * attrs.xunitlength;
    setStrokeAndFill(node, attrs);
    svg.children.push(node);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  ellipse(svgOprnd, center, rx, ry) { // coordinates in units
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "ellipse", attrs: {} };
    node.attrs.cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0];
    node.attrs.cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
                    - attrs.origin[1];
    node.attrs.rx = Rnl.toNumber(rx.value) * attrs.xunitlength;
    node.attrs.ry = Rnl.toNumber(ry.value) * attrs.yunitlength;
    setStrokeAndFill(node, attrs);
    svg.children.push(node);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  arc(svgOprnd, m, radius) { // coordinates in units
    const svg = svgOprnd.value;
    const attrs = svg.temp;
    const node = { tag: "path", attrs: {} };
    const start = [Rnl.toNumber(m.value[0][0]), Rnl.toNumber(m.value[0][1])];
    const end = [Rnl.toNumber(m.value[1][0]), Rnl.toNumber(m.value[1][1])];
    if (radius == null) {
      const v = [end[0] - start[0], end[1] - start[1]];
      radius = (Math.sqrt(v[0] * v[0] + v[1] * v[1])) * attrs.yunitlength;
    } else if (isVector(radius)) {
      radius = radius.value.map(e => Rnl.toNumber(e) * attrs.yunitlength);
    } else {
      radius = Rnl.toNumber(radius.value) * attrs.yunitlength;
    }
    let str = "M" + (start[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - start[1] * attrs.yunitlength - attrs.origin[1]) + " A";
    str += Array.isArray(radius) ? radius[0] + "," + radius[1] : radius + "," + radius;
    str += " 0 0,0 " + (end[0] * attrs.xunitlength + attrs.origin[0]) + "," +
      (attrs.height - end[1] * attrs.yunitlength - attrs.origin[1]);
    node.attrs.d = str;
    setStrokeAndFill(node, attrs);
    let v = 0;
    if (attrs.marker === "arrow" || attrs.marker === "arrowdot") {
      const u = [(end[1] - start[1]) / 4, (start[0] - end[0]) / 4];
      v = [(end[0] - start[0]) / 2, (end[1] - start[1]) / 2];
      v = [start[0] + v[0] + u[0], start[1] + v[1] + u[1]];
    } else {
      v = [start[0], start[1]];
    }
    if (attrs.marker === "dot" || attrs.marker === "arrowdot") {
      svg.children.push(markerDot(start, attrs, attrs.markerstroke, attrs.markerfill));
      if (attrs.marker === "arrowdot") { arrowhead(svg,  v, end); }
      svg.children.push(markerDot(end, attrs, attrs.markerstroke, attrs.markerfill));
    } else if (attrs.marker === "arrow") {
      arrowhead(svg, v, end);
    }
    svg.children.push(node);
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  text(svgOprnd, p, str, pos) {
    const svg = textLocal(
      svgOprnd.value,
      [Rnl.toNumber(p.value[0]), Rnl.toNumber(p.value[1])],
      str.value,
      pos == null ? null : pos.value
      );
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dot(svgOprnd, center, typ, label, pos) {
    let svg = svgOprnd.value;
    const attrs = svg.temp;
    let node;
    const cx = Rnl.toNumber(center.value[0]) * attrs.xunitlength + attrs.origin[0];
    const cy = attrs.height - Rnl.toNumber(center.value[1]) * attrs.yunitlength
             - attrs.origin[1];
    if (typ.value === "+" || typ.value === "-" || typ.value === "|") {
      node = { tag: "path", attrs: {} };
      if (typ.value === "+") {
        node.attrs.d = " M " + (cx - attrs.ticklength) + "," + cy
                    + " L " + ( cx + attrs.ticklength) + "," + cy
                    + " M " + cx + "," + (cy - attrs.ticklength) + " L " + cx
                    + "," + (cy + attrs.ticklength);
        node.attrs["stroke-width"] = 0.5;
        node.attrs.stroke = attrs.axesstroke;
      } else {
        if (typ.value === "-") {
          node.attrs.d = " M " + (cx - attrs.ticklength) + "," + cy
                       + " L " + (cx + attrs.ticklength) + "," + cy;
        } else {
          node.attrs.d = " M " + cx + "," + (cy - attrs.ticklength)
                       + " L " + cx + "," + (cy + attrs.ticklength);
        }
        node.attrs["stroke-width"] = attrs.strokewidth;
        node.attrs["stroke"] = attrs.stroke;
      }
    } else {
      node = { tag: "circle", attrs: {} };
      node.attrs.cx = cx;
      node.attrs.cy = cy;
      node.attrs.r = attrs.dotradius;
      node.attrs["stroke-width"] = attrs.strokewidth;
      node.attrs.stroke = attrs.stroke;
      node.attrs.fill =  (typ.value === "open" ? "white" : attrs.stroke);
    }
    svg.children.push(node);
    if (label != null) {
      svg = textLocal(
        svg,
        [Rnl.toNumber(center.value[0]), Rnl.toNumber(center.value[1])],
        label.value,
        (pos == null ? "below" : pos.value)
        );
    }
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  leader(svgOprnd, plistOprnd, label) {
    const marker = svgOprnd.value.temp.marker;
    svgOprnd.value.temp.marker = "arrow";
    svgOprnd.value.temp.isDim = true;
    const plistCopy = clone(plistOprnd);
    plistCopy.value.reverse();
    svgOprnd = this.path(svgOprnd, plistCopy, "L");
    const p = plistCopy.value[0].map(e => Rnl.toNumber(e));
    const q = plistCopy.value[1].map(e => Rnl.toNumber(e));
    let pos = "right";
    if (Math.abs(p[0] - q[0]) >= Math.abs(p[1] - q[1])) {
      pos = p[0] >= q[0] ? "right" : "left";
    } else {
      pos = p[1] < q[1] ? "below" : "above";
    }
    const svg = textLocal(svgOprnd.value, p, label.value, pos);
    svg.temp.marker = marker;
    svg.temp.isDim = false;
    return { value: svg, unit: null, dtype: dt.DRAWING }
  },

  dimension(svgOprnd, plistOprnd, label) {
    const p = clone(plistOprnd.value);
    const q = p.pop();
    const origstrokewidth = svgOprnd.value.temp.strokewidth;
    svgOprnd.value.temp.strokewidth = 0.5;
    svgOprnd.value.temp.isDim = true; // set small arrowhead
    let six = Rnl.fromNumber(6 / svgOprnd.value.temp.xunitlength);
    const pEnd = p[p.length - 1];
    let svg;
    // Is the label y-coord between the y-coords of the end points?
    if ((Rnl.lessThan(p[0][1], q[1]) && Rnl.lessThan(q[1], pEnd[1])) ||
        (Rnl.lessThan(pEnd[1], q[1]) && Rnl.lessThan(q[1], p[0][1]))) {
      if (!Rnl.lessThan(pEnd[0], q[0])) { six = Rnl.negate(six); }
      p.forEach(e => {
        svgOprnd = this.line(svgOprnd, { value: [
          [Rnl.add(e[0], six), e[1]],
          [Rnl.add(q[0], six), e[1]]
        ] });
      });
      svgOprnd.value.temp.marker = "arrow";
      const pos = Rnl.lessThanOrEqualTo(pEnd[0], q[0]) ? "right" : "left";
      for (let i = 0; i < p.length - 1; i++) {
        svgOprnd = this.line(svgOprnd, { value : [[q[0], p[i][1]], [q[0], p[i + 1][1]]],
          unit: null, dtype: dt.MATRIX });
        svgOprnd = this.line(svgOprnd, { value : [[q[0], p[i + 1][1]], [q[0], p[i][1]]],
          unit: null, dtype: dt.MATRIX });
        const p3 = [
          Rnl.toNumber(q[0]),
          (Rnl.toNumber(p[i][1]) + Rnl.toNumber(p[i + 1][1])) / 2
        ];
        const str = p.length === 2 ? label.value : label.value[i];
        svg = textLocal(svgOprnd.value, p3, str, pos);
      }
    } else {
      if (!Rnl.lessThan(pEnd[1], q[1])) { six = Rnl.negate(six); }
      p.forEach(e => {
        svgOprnd = this.line(svgOprnd, { value: [
          [e[0], Rnl.add(e[1], six)],
          [e[0], Rnl.add(q[1], six)]
        ] });
      });
      svgOprnd.value.temp.marker = "arrow";
      const pos = Rnl.lessThanOrEqualTo(pEnd[1], q[1]) ? "above" : "below";
      for (let i = 0; i < p.length - 1; i++) {
        svgOprnd = this.line(svgOprnd, { value: [ [p[i][0], q[1]], [ p[i + 1][0], q[1]] ],
          unit: null, dtype: dt.MATRIX });
        svgOprnd = this.line(svgOprnd, { value: [ [ p[i + 1][0], q[1]], [p[i][0], q[1]] ],
          unit: null, dtype: dt.MATRIX });
        const p3 = [
          (Rnl.toNumber(p[i][0]) + Rnl.toNumber(p[i + 1][0])) / 2,
          Rnl.toNumber(q[1])
        ];
        const str = p.length === 2 ? label.value : label.value[i];
        svg = textLocal(svgOprnd.value, p3, str, pos);
      }
    }
    svg.temp.strokewidth = origstrokewidth;
    svg.temp.marker = "none";
    svg.temp.isDim = false;
    return { value: svg, unit: null, dtype: dt.DRAWING }
  }

};

const renderSVG = dwg => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.keys(dwg.attrs).forEach(key => {
    svg.setAttribute(key, dwg.attrs[key]);
  });
  dwg.children.forEach(el => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", el.tag);
    Object.keys(el.attrs).forEach(attr => {
      node.setAttribute(attr, el.attrs[attr]);
      if (attr === "title") {
        node.appendChild(document.createTextNode(el.attrs["text"]));
      } else {
        node.setAttribute(attr, el.attrs[attr]);
      }
    });
    if (el.tag === "text") {
      el.children.forEach(child => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        if (child.attrs) {
          Object.keys(child.attrs).forEach(mark => {
            tspan.setAttribute(mark, child.attrs[mark]);
          });
        }
        tspan.appendChild(document.createTextNode(child.text));
        node.appendChild(tspan);
      });
    }
    svg.appendChild(node);
  });
  return svg
};

const draw = Object.freeze({
  startSvg,
  functions,
  renderSVG
});

// evaluate.js

/*
 *  This module receives an RPN string and a object containing Hurmet variables.
 *  It does the calculation, doing unit-compatibility checks along the way.
 *  It returns a result in two formats: (1) a TeX string that can be displayed and
 *  (2) numeric and unit data that can used for calculations by other cells.
 *
 *  Hurmet does automatic unit conversions and checks for unit compatibility.
 *  Compatibility checks are done by keeping track of the unit exponents.
 *  So for instance if we divide an area by a length, the unit exponent calculation runs as:
 *     LENGTH^2 / LENGTH^1 = LENGTH^(2-1) = LENGTH^1
 *  We keep track of unit exponents for each of 9 base dimensions. That's why
 *  you see an array of 9 integers occuring in the code below.
 *
 *  Inside evalRpn(), Hurmet operands are each an object with three fields:
 *     value: the value of the operand
 *     unit:  holds unit info, either unit name, an array of exponents, or a unitMap
 *     dtype: an integer indicating data type.
 *
 *     Note that an operand can be two data types at once, such as RATIONAL and MATRIX.
 *     In such cases, dtype is the sum of the two underlying integers.
 *     So, in constants.js, we have enumerated the data types in powers of two.
 *     That way, we can use a bit-wise "&" operator to test for an individual type.
 *
 *     Numeric matrices and numeric maps can have math operations done to them.
 *     We distinguish numeric matrices from other matrices by the fact that
 *     (oprnd.dtype & dt.RATIONAL) returns a true if the matrix is numeric.
 *
 *     File operands.js contains further explanation of Hurmet operands.
 */

// Some helper functions

const needsMap = (...args) => {
  for (let i = 0; i < args.length; i++) {
    if ((args[i].dtype & dt.MAP) && (args[i].dtype & dt.RATIONAL)) { return true }
  }
  return false
};

const shapeOf = oprnd => {
  return oprnd.dtype === dt.COMPLEX
    ? "complex"
    : oprnd.dtype < 128
    ? "scalar"
    : Matrix.isVector(oprnd)
    ? "vector"
    : (oprnd.dtype & dt.MATRIX)
    ? "matrix"
    : oprnd.dtype === dt.DATAFRAME
    ? "dataFrame"
    : ((oprnd.dtype & dt.MAP) &&
       ((oprnd.dtype & dt.ROWVECTOR) || (oprnd.dtype & dt.COLUMNVECTOR)))
    ? "mapWithVectorValues"
    : (oprnd.dtype & dt.MAP)
    ? "map"
    : "other"
};

const binaryShapesOf = (o1, o2) => {
  let shape1 = shapeOf(o1);
  let shape2 = shapeOf(o2);
  let needsMultBreakdown = false;
  if (isMatrix(o1) && isMatrix(o2)) {
    // If both operands are matrices, we need to return more information.
    // That enables the various ways to multiply two matrices.
    needsMultBreakdown = true;
    if (shape1 === "vector") {
      shape1 = (o1.dtype & dt.ROWVECTOR) ? "rowVector" : "columnVector";
    }
    if (shape2 === "vector") {
      shape2 = (o2.dtype & dt.ROWVECTOR) ? "rowVector" : "columnVector";
    }
  }
  return [shape1, shape2, needsMultBreakdown]
};

const nextToken = (tokens, i) => {
  if (tokens.length < i + 2) { return undefined }
  return tokens[i + 1]
};

// array of function names that return a real number from a complex argument.
const arfn = ["abs", "argument", "Im", "Re", "Γ"];

const stringFromOperand = (oprnd, decimalFormat) => {
  return oprnd.dtype === dt.STRING
    ? oprnd.value
    : oprnd.dtype === dt.RATIONAL
    ? format(oprnd.value, "h15", decimalFormat)
    : isMatrix(oprnd.dtype)
    ? Matrix.displayAlt(oprnd, "h15", decimalFormat)
    : (oprnd.dtype & dt.MAP)
    ? map.displayAlt(oprnd.value, "h15", decimalFormat)
    : oprnd.value
};

const evalRpn = (rpn, vars, decimalFormat, unitAware, lib) => {
  // This is the function that does calculations with the rpn string.
  const tokens = rpn.split("\u00A0");
  const stack = [];
  let oPrev;
  for (let i = 0; i < tokens.length; i++) {
    const tkn = tokens[i];
    const ch = tkn.charAt(0);

    if (ch === "®") {
      // A rational number.
      const r = new Array(2);
      const pos = tkn.indexOf("/");
      r[0] = BigInt(tkn.slice(1, pos));   // numerator
      r[1] = BigInt(tkn.slice(pos + 1));  // denominator
      const num = Object.create(null);
      num.value = r;
      num.unit = Object.create(null);
      num.unit.expos = allZeros;
      num.dtype = dt.RATIONAL;
      stack.push(Object.freeze(num));

    } else if (ch === "©") {
      // A complex number.
      const ints = tkn.slice(1).split(",");
      const z = new Array(2);
      z[0] = [BigInt(ints[0]), BigInt(ints[1])];  // real part
      z[1] = [BigInt(ints[2]), BigInt(ints[3])];  // imaginary part
      const num = Object.create(null);
      num.value = z;
      num.unit = Object.create(null);
      num.unit.expos = allZeros;
      num.dtype = dt.COMPLEX;
      stack.push(Object.freeze(num));

    } else if (ch === "¿") {
      // A variable. Get the value from vars
      const varName = tkn.substring(1);
      let oprnd = Object.create(null);
      if (varName === "undefined") {
        oprnd.value = undefined;
        oprnd.unit = null;
        oprnd.dtype = 0;
      } else if (varName === "T" && nextToken(tokens, i) === "^" &&
        stack.length > 0 && isMatrix(stack[stack.length - 1])) {
        // Transpose a matrix.
        oprnd.value = "T";
        oprnd.unit = null;
        oprnd.dtype = dt.RATIONAL;
      } else {
        const cellAttrs = vars[varName];
        if (!cellAttrs) { return errorOprnd("V_NAME", varName) }
        oprnd = fromAssignment(cellAttrs, unitAware);
        if (oprnd.dtype === dt.ERROR) { return oprnd }
      }
      stack.push(Object.freeze(oprnd));

    } else if (ch === '"') {
      // A string literal.
      const chEnd = tkn.charAt(tkn.length - 1);
      const str = ch === '"' && chEnd === '"' ? tkn.slice(1, -1).trim() : tkn.trim();
      stack.push(Object.freeze({ value: str, unit: null, dtype: dt.STRING }));

    } else if (/^``/.test(tkn)) {
      stack.push(DataFrame.dataFrameFromCSV(tablessTrim(tkn.slice(2, -2)), {}));

    } else if (ch === '`') {
      // A rich text literal
      const chEnd = tkn.charAt(tkn.length - 1);
      const str = ch === '`' && chEnd === '`' ? tkn.slice(1, -1).trim() : tkn.trim();
      stack.push(Object.freeze({ value: str, unit: null, dtype: dt.RICHTEXT }));

    } else {
      switch (tkn) {
        case "true":
        case "false": {
          const bool = Object.create(null);
          bool.value = tkn === "true";
          bool.unit = null;
          bool.dtype = dt.BOOLEAN;
          stack.push(Object.freeze(bool));
          break
        }

        case "π": {
          const pi = Object.create(null);
          pi.value = Rnl.pi;
          pi.dtype = dt.RATIONAL;
          pi.unit = Object.create(null);
          pi.unit.expos = allZeros;
          stack.push(Object.freeze(pi));
          break
        }

        case "e": {
          const e = Object.create(null);
          e.value = "e";
          e.dtype = dt.RATIONAL;
          e.unit = Object.create(null);
          e.unit.expos = allZeros;
          stack.push(Object.freeze(e));
          break
        }

        case "j": {
          // j = √(-1)
          const j = Object.create(null);
          j.value = [Rnl.zero, Rnl.one];
          j.unit = Object.create(null);
          j.unit.expos = allZeros;
          j.dtype = dt.COMPLEX;
          stack.push(Object.freeze(j));
          break
        }

        case "ℏ": {
          // Reduced Plank constant
          const hbar = Object.create(null);
          hbar.value = Rnl.hbar;
          hbar.dtype = dt.RATIONAL;
          hbar.unit = Object.create(null);
          hbar.unit.expos = Object.freeze(unitAware ? [2, 1, -1, 0, 0, 0, 0, 0] : allZeros);
          stack.push(Object.freeze(hbar));
          break
        }

        case "∠": {
          // Complex number in polar notation.
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (o1.dtype !== dt.RATIONAL || o2.dtype !== dt.RATIONAL) {
            return errorOprnd("NAN_OP")
          }
          const theta = Rnl.toNumber(o2.value);
          const z = Object.create(null);
          z.value = [
            Rnl.multiply(o1.value, Rnl.fromNumber(Math.cos(theta))), // real part
            Rnl.multiply(o1.value, Rnl.fromNumber(Math.sin(theta)))  // imaginary part
          ];
          z.unit = Object.create(null);
          z.unit.expos = allZeros;
          z.dtype = dt.COMPLEX;
          stack.push(Object.freeze(z));
          break
        }

        case "+":
        case "-": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          const op = tkn === "+" ? "add" : "subtract";
          if (!(((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX)) &&
                ((o2.dtype & dt.RATIONAL) || (o2.dtype & dt.COMPLEX)))) {
            return errorOprnd("NAN_OP")
          }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
              return errorOprnd("UNIT_ADD")
            }
          }
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);
          const sum = Object.create(null);
          // See file operations.js for an explanation of what goes on in the next line.
          sum.value = Operators.binary[shape1][shape2][op](o1.value, o2.value);
          if (sum.value.dtype && sum.value.dtype === dt.ERROR) { return sum.value }
          sum.unit = o1.unit;
          sum.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn);
          stack.push(Object.freeze(sum));
          break
        }

        case "~": {
          // Unary minus
          const o1 = stack.pop();
          if (!((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX)) {
            return errorOprnd("NAN_OP")
          }
          const neg = Object.create(null);
          neg.value = Operators.unary[shapeOf(o1)]["negate"](o1.value);
          if (neg.value.dtype && neg.value.dtype === dt.ERROR) { return neg.value }
          neg.unit = o1.unit;
          neg.dtype = o1.dtype;
          stack.push(Object.freeze(neg));
          break
        }

        case "×":
        case "·":
        case "*":
        case "⌧": {
          const oprnd2 = stack.pop();
          const o2 = oprnd2.dtype === dt.DATAFRAME ? clone(oprnd2) : oprnd2;
          const o1 = stack.pop();
          if (!(((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX)) &&
            ((o2.dtype & dt.RATIONAL) || (o2.dtype & dt.COMPLEX) ||
            o2.dtype === dt.DATAFRAME))) {
            return errorOprnd("NAN_OP")
          }
          const product = Object.create(null);
          let unit = Object.create(null);
          if (unitAware) {
            if ((o1.dtype === dt.DATAFRAME && o2.dtype === dt.RATIONAL) ||
                (o1.dtype === dt.RATIONAL && o2.dtype === dt.DATAFRAME)) {
              unit = o1.dtype === dt.DATAFRAME ? o1.unit : o2.unit;
            } else {
              unit.expos = o1.unit.expos.map((e, j) => e + o2.unit.expos[j]);
            }
          } else {
            unit.expos = allZeros;
          }
          product.unit = o2.dtype === dt.DATAFRAME ? clone(o2.unit) : Object.freeze(unit);

          const [shape1, shape2, needsMultBreakdown] = binaryShapesOf(o1, o2);
          const op = needsMultBreakdown
            ? { "×": "cross", "·": "dot", "*": "asterisk", "⌧": "multiply" }[tkn]
            : "multiply";

          product.dtype = (tkn === "*" || shape1 === "scalar" || shape1 === "map" ||
            shape1 === "complex" || shape2 === "scalar" ||
            shape2 === "map" || shape2 === "complex")
            ? Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, op)
            : tkn === "·"
            ? dt.RATIONAL
            : tkn === "×"
            ? dt.COLUMNVECTOR
            : Matrix.multResultType(o1, o2);

          product.value = Operators.binary[shape1][shape2][op](o1.value, o2.value);
          if (product.value.dtype && product.value.dtype === dt.ERROR) {
            return product.value
          }

          stack.push(Object.freeze(product));
          break
        }

        case "/":
        case "//":
        case "÷":
        case "///":
        case "\u2215": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (!(((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX) &&
                ((o2.dtype & dt.RATIONAL) || o2.dtype === dt.COMPLEX))) {
            return errorOprnd("NAN_OP")
          }
          const quotient = Object.create(null);
          const unit = Object.create(null);
          unit.expos = unitAware
            ? o1.unit.expos.map((e, j) => e - o2.unit.expos[j])
            : allZeros;
          quotient.unit = Object.freeze(unit);
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);
          quotient.value = Operators.binary[shape1][shape2]["divide"](o1.value, o2.value);
          quotient.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, "divide");
          if (isDivByZero(quotient.value, shapeOf(quotient))) { return errorOprnd("DIV") }
          stack.push(Object.freeze(quotient));
          break
        }

        case "^": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (Matrix.isVector(o1) && o2.value === "T") {
            // Transpose a vector
            const oprnd = clone(o1);
            oprnd.dtype = o1.dtype + ((o1.dtype & dt.ROWVECTOR)
              ? dt.COLUMNVECTOR - dt.ROWVECTOR
              : dt.ROWVECTOR - dt.COLUMNVECTOR);
            stack.push(Object.freeze(oprnd));
            break
          }
          if (!(((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX) &&
                ((o2.dtype & dt.RATIONAL) || o2.dtype === dt.COMPLEX) ||
                (isMatrix(o1) && o2.value === "T"))) {
            return errorOprnd("NAN_OP")
          }
          const power = Object.create(null);
          const unit = Object.create(null);
          unit.expos = allZeros;
          if (unitAware) {
            // TODO: lots to do here
            const d = typeof o2.unit === "number" ? o2.unit : Rnl.toNumber(o2.value);
            unit.expos = o1.unit.expos.map(e => e * d);
          }
          power.unit = Object.freeze(unit);
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);
          power.value = Operators.binary[shape1][shape2]["power"](o1.value, o2.value);
          if (power.value.dtype) { return power.value } // Error
          power.dtype = Cpx.isComplex(power.value)
            ? dt.COMPLEX
            : Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn);
          stack.push(Object.freeze(power));
          break
        }

        case "^*": {
          // complex conjugate
          const oprnd = stack.pop();
          if (!(oprnd.dtype & dt.COMPLEX)) { return errorOprnd("NA_REAL"), "conjugate" }
          const o2 = {
            value: Cpx.conjugate(oprnd.value),
            unit: oprnd.unit,
            dtype: oprnd.dtype
          };
          stack.push(Object.freeze(o2));
          break
        }

        case "&":
        case "&_": {
          // Concatenation
          const o2 = stack.pop();
          const o1 = stack.pop();
          const opName = tkn === "&" ? "concat" : "unshift";
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);
          let o3 = Object.create(null);
          if (o1.dtype === dt.STRING && o1.dtype === dt.STRING) {
            const str1 = stringFromOperand(o1, decimalFormat);
            const str2 = stringFromOperand(o2, decimalFormat);
            o3.value = str1 + str2;
            o3.unit = null;
            o3.dtype = dt.STRING;
          } else if ((o1.dtype & dt.DATAFRAME) && Matrix.isVector(o2) && tkn === "&") {
            o3 = DataFrame.append(o1, o2, vars, unitAware);
            if (o3.dtype === dt.ERROR) { return o3 }
          } else if ((o1.dtype & dt.MAP) || (o2.dtype & dt.MAP)) {
            o3 = map.append(o1, o2, shape1, shape2, vars);
            if (o3.dtype === dt.ERROR) { return o3 }
          } else {
            if (unitAware) {
              if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
                return errorOprnd("UNIT_ADD")
              }
            }
            o3.value = Operators.binary[shape1][shape2][opName](o1.value, o2.value);
            if (o3.value.dtype) { return o3.value } // Error
            o3.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn);
            o3.unit = o1.unit;
          }
          stack.push(Object.freeze(o3));
          break
        }

        case "√":
        case "∛":
        case "∜": {
          const index = tkn.charCodeAt(0) - 8728;
          const pow = [BigInt(1), BigInt(index)];
          const o1 = stack.pop();
          if (!((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX))) {
            return errorOprnd("NAN_OP")
          }
          const root = Object.create(null);
          const unit = Object.create(null);
          unit.expos = allZeros;
          if (unitAware) { unit.expos = o1.unit.expos.map(e => e / index); }
          root.unit = Object.freeze(unit);

          const shape1 = shapeOf(o1);
          root.value = Operators.binary[shape1]["scalar"]["power"](o1.value, pow);
          if (root.value.dtype && root.value.dtype === dt.ERROR) { return root.value }

          root.dtype = Cpx.isComplex(root.value)
            ? dt.COMPLEX
            : Operators.dtype[shape1]["scalar"](o1.dtype, dt.RATIONAL, tkn);

          stack.push(Object.freeze(root));
          break
        }

        case "root": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (!((o1.dtype & dt.RATIONAL) & (o2.dtype & dt.RATIONAL))) {
            return errorOprnd("NAN_OP")
          }
          const root = Object.create(null);
          const unit = Object.create(null);
          unit.expos = allZeros;
          if (unitAware) { unit.expos = o2.unit.expos.map(e => e / Number(o1.value[0])); }
          root.unit = Object.freeze(unit);

          const pow = Rnl.reciprocal(o1.value);
          const shape1 = shapeOf(o1);
          root.value = Operators.binary[shape1]["scalar"]["power"](o2.value, pow);
          if (root.value.dtype && root.value.dtype === dt.ERROR) { return root.value }

          root.dtype = Operators.dtype[shape1]["scalar"](o1.dtype, dt.RATIONAL, tkn);
          stack.push(Object.freeze(root));
          break
        }

        case ".": {
          // Accessor of a object's property in dot notation
          const o2 = stack.pop();
          const o1 = stack.pop();
          const property = propertyFromDotAccessor(o1, o2, vars, unitAware);
          if (property.dtype === dt.ERROR) { return property }
          stack.push(Object.freeze(property));
          break
        }

        case "[]": {
          // Bracket accessor to a data frame, matrix, string, data frame, or module.
          const numArgs = Number(tokens[i + 1]);
          i += 1;
          const args = [];
          for (let j = 0; j < numArgs; j++) { args.unshift(stack.pop()); }
          const o1 = stack.pop();
          let property;
          if (o1.dtype & dt.DATAFRAME) {
            property = DataFrame.range(o1, args, vars, unitAware);

          } else if (o1.dtype & dt.MAP) {
            property = map.valueFromMap(o1, args, unitAware);

          } else if (o1.dtype === dt.STRING) {
            property = textRange(o1.value, args[0]);

          } else if (o1.dtype === dt.MODULE) {
            if (numArgs === 1) {
              property = fromAssignment(o1.value[args[0].value], unitAware);
            } else {
              // Multiple assignment.
              property = { value: new Map(), unit: null, dtype: dt.TUPLE };
              for (let j = 0; j < args.length; j++) {
                const name = args[j].value;
                property.value.set(name, fromAssignment(o1.value[name], unitAware));
              }
            }

          } else {
            // o1 is a matrix or a data frame
            const rowIndex = args[0];
            const colIndex = (numArgs === 2)
              ? args[1]
              : isVector(o1)
              ? null
              : { value: Rnl.zero, unit: allZeros, dtype: dt.RATIONAL };
            property = (o1.dtype & dt.DATAFRAME)
              ? DataFrame.range(o1, rowIndex, colIndex, vars, unitAware)
              : Matrix.submatrix(o1, rowIndex, colIndex);
          }
          if (property.dtype === dt.ERROR) { return property }
          stack.push(Object.freeze(property));
          break
        }

        case "..": {
          // range separator.
          const end = stack.pop();
          const o1 = stack.pop();
          if (!(o1.dtype === dt.RATIONAL || o1.dtype === dt.RANGE)) {
            return errorOprnd("NAN_OP")
          }
          const range = Object.create(null);
          range.unit = null;
          range.dtype = dt.RANGE;
          const step = o1.dtype !== dt.RATIONAL
            ? o1.value[2]
            : end.value === "∞" || Rnl.lessThan(o1.value, end.value)
            ? Rnl.one
            : Rnl.negate(Rnl.one);
          range.value = o1.dtype === dt.RATIONAL
            ? [o1.value, step, end.value]
            : [o1.value[0], o1.value[2], end.value];
          stack.push((Object.freeze(range)));
          break
        }

        case ":": {
          const o2 = stack.pop();
          const key = stack.pop();
          if (key.dtype !== dt.STRING) { return errorOprnd("BAD_KEYSTR") }
          stack.push(Object.freeze({
            name: key.value, value: o2.value, unit: o2.unit, dtype: o2.dtype
          }));
          break
        }

        case "normal":
        case "uniform":
        case "lognormal": {
          // eslint-disable-next-line no-unused-vars
          const high = stack.pop();
          // eslint-disable-next-line no-unused-vars
          const low = stack.pop();
          // low and high define a probablility distribution. They are the ends of a
          // uniform distribution or they mark the 90% confidence interval of (log)normal.
          // TODO: Implement probability distributions as a data type.
          break
        }

        case "!": {
          // TODO: "!!" and "¡"
          const o1 = stack.pop();
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, allZeros)) { return errorOprnd("FACT") }
          }
          const x = o1.value;
          if (!Rnl.isInteger(x) || Rnl.isNegative(x)) { return errorOprnd("FACT") }
          const factorial = Object.create(null);
          factorial.unit = allZeros;
          factorial.dtype = dt.RATIONAL;
          factorial.value = Operators.unary[shapeOf(o1)]["factorial"](x);
          if (factorial.value.dtype) { return factorial.value } // Error
          stack.push(Object.freeze(factorial));
          break
        }

        case "%": {
          // TODO: per thousand, ‰
          const o1 = stack.pop();
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          const percentage = Object.create(null);
          percentage.unit = o1.unit;
          percentage.dtype = o1.dtype;
          percentage.value = Operators.unary[shapeOf(o1)]["percent"](o1.value);
          if (percentage.value) { return percentage.value } // Error
          stack.push(Object.freeze(percentage));
          break
        }

        case "|":
        case "‖": {
            // Find |x| or ‖x‖
          const o1 = stack.pop();
          if (!((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX)) {
            return errorOprnd("NAN_OP")
          }
          const op = tkn === "|" ? "abs" : "norm";
          const abs = Object.create(null);
          abs.unit = o1.unit;
          abs.dtype = dt.RATIONAL;
          abs.value = Operators.unary[shapeOf(o1)][op](o1.value);
          if (abs.value.dtype && abs.value.dtype === dt.ERROR) { return abs.value }
          stack.push(Object.freeze(abs));
          break
        }

        case "matrix": {
          // matrix
          const numRows = Number(tokens[i + 1]);
          const numCols = Number(tokens[i + 2]);
          i += 2;

          if (stack[stack.length - 1].dtype === dt.RANGE) {
            // Input was [start:step:end]
            stack.push(Matrix.operandFromRange(stack.pop().value));
          } else {
            stack.push(Matrix.operandFromTokenStack(stack, numRows, numCols));
          }
          break
        }

        case "startSvg":
          stack.push({ value: draw.startSvg(), unit: null, dtype: dt.DRAWING });
          break

        case "abs":
        case "cos":
        case "sin":
        case "tan":
        case "acos":
        case "asin":
        case "atan":
        case "sec":
        case "csc":
        case "cot":
        case "asec":
        case "acsc":
        case "acot":
        case "exp":
        case "log":
        case "ln":
        case "log10":
        case "log2":
        case "cosh":
        case "sinh":
        case "tanh":
        case "sech":
        case "csch":
        case "coth":
        case "acosh":
        case "asinh":
        case "atanh":
        case "asech":
        case "acsch":
        case "acoth":
        case "Gamma":
        case "Γ":
        case "logGamma":
        case "logΓ":
        case "logFactorial":
        case "cosd":
        case "sind":
        case "tand":
        case "acosd":
        case "asind":
        case "atand":
        case "secd":
        case "cscd":
        case "cotd":
        case "asecd":
        case "acscd":
        case "acotd":
        case "Re":
        case "Im":
        case "argument":
        case "chr":
        case "round":
        case "sqrt":
        case "sign": {
          // Functions with one real or complex argument.
          const arg = stack.pop();
          if (!((arg.dtype & dt.RATIONAL) || (arg.dtype & dt.COMPLEX))) {
            return errorOprnd("UNREAL", tkn)
          }

          const output = Object.create(null);
          const unit = Object.create(null);
          unit.expos = unitAware ? Functions.functionExpos(tkn, [arg]) : allZeros;
          if (unit.expos.dtype && unit.expos.dtype === dt.ERROR) { return unit.expos }
          output.unit = Object.freeze(unit);

          const shape = (arg.dtype & dt.RATIONAL) ? "scalar" : "complex";
          const value = ((arg.dtype & dt.MAP) && Matrix.isVector(arg))
            // eslint-disable-next-line max-len
            ? mapMap(arg.value, array => array.map(e => Functions.unary[shape][tkn](e)))
            : Matrix.isVector(arg)
            ? arg.value.map(e => Functions.unary[shape][tkn](e))
            : isMatrix(arg)
            ? arg.value.map(row => row.map(e => Functions.unary[shape][tkn](e)))
            : needsMap(arg)
            ? mapMap(arg.value, val => Functions.unary[shape][tkn](val))
            : Functions.unary[shape][tkn](arg.value);
          if (value.dtype && value.dtype === dt.ERROR) { return value }
          output.value = Object.freeze(value);

          output.dtype = tkn === "chr"
            ? arg.dtype - dt.RATIONAL + dt.STRING
            : (arg.dtype & dt.COMPLEX) && arfn.includes(tkn)
            ? arg.dtype - dt.COMPLEX + dt.RATIONAL
            : arg.dtype;

          stack.push(Object.freeze(output));
          break
        }

        case "logn":
        case "atan2":
        case "hypot":
        case "gcd":
        case "rms":
        case "binomial":
        case "zeros": {
          // Functions with two real arguments.
          const args = [];
          args.push(stack.pop());
          args.unshift(stack.pop());
          if (!(args[0].dtype & dt.RATIONAL)) { return errorOprnd("") }

          const output = Object.create(null);
          const unit = Object.create(null);
          unit.expos = unitAware ? Functions.functionExpos(tkn, args) : allZeros;
          if (unit.dtype && unit.dtype === dt.ERROR) { return unit }
          output.unit = Object.freeze(unit);

          const [value, dtype] = multivarFunction("binary", tkn, args);
          output.value = Object.freeze(value);
          output.dtype = dtype;
          stack.push(Object.freeze(output));
          break
        }

        case "roundn":
        case "string": {
          // Round a numeric value.
          const spec = stack.pop();
          const num = stack.pop();
          if (!(num.dtype & dt.RATIONAL)) { return errorOprnd("") }
          if (!(spec.dtype & dt.STRING)) { return errorOprnd("") }
          if (!/(?:f-?|r)\d+/.test(spec.value)) { return errorOprnd("") }
          let funcName = "";
          const output = Object.create(null);
          if (tkn === "string") {
            funcName = spec.value.charAt() === "f" ? "stringFixed" : "stringSignificant";
            output.unit = null;
            output.dtype = num.dtype - dt.RATIONAL + dt.STRING;
          } else {
            funcName = spec.value.charAt() === "f" ? "roundFixed" : "roundSignificant";
            output.unit = num.unit;
            output.dtype = num.dtype;
          }
          const n = Number(spec.value.slice(1));
          const value = ((num.dtype & dt.MAP) && Matrix.isVector(num))
            ? mapMap(num.value, array => array.map(e => Functions.binary[funcName]([e, n])))
            : Matrix.isVector(num)
            ? num.value.map(e => Functions.binary[funcName]([e, n]))
            : isMatrix(num)
            ? num.value.map(row => row.map(e => Functions.binary[funcName]([e, n])))
            : needsMap(num)
            ? mapMap(num.value, val => Functions.binary[funcName]([val, n]))
            : Functions.binary[funcName]([num.value, n]);
          if (value.dtype && value.dtype === dt.ERROR) { return value }
          output.value = Object.freeze(value);
          if (num.name) { output.name = num.name; }
          stack.push(Object.freeze(output));
          break
        }

        case "dataframe":
        case "max":
        case "min":
        case "sum":
        case "product":
        case "range":
        case "mean":
        case "median":
        case "variance":
        case "stddev":
        case "accumulate": {
          // Functions that reduce multiple arguments to one result.
          // TODO: unit-aware reducing functions.
          const numArgs = Number(tokens[i + 1]);
          i += 1;
          const args = [];
          for (let j = 0; j < numArgs; j++) {
            const datum = stack.pop();
            if (tkn !== "dataframe" && !(datum.dtype & dt.RATIONAL)) {
              return errorOprnd("NANARG", tkn)
            }
            args.unshift(datum);
          }

          if (tkn === "dataframe") {
            const df = DataFrame.dataFrameFromVectors(args, vars);
            if (df.dtype && df.dtype === dt.ERROR) { return df }
            stack.push(df);
            break
          }

          const output = Object.create(null);
          const unit = Object.create(null);
          unit.expos = unitAware ? Functions.functionExpos(tkn, args) : allZeros;
          if (unit.dtype && unit.dtype === dt.ERROR) { return errorOprnd("") }
          output.unit = Object.freeze(unit);

          const [value, dtype] = multivarFunction("reduce", tkn, args);
          output.value = Object.freeze(value);
          output.dtype = dtype;
          stack.push(Object.freeze(output));
          break
        }

        case "random": {
          // No arguments
          const num = Object.create(null);
          num.value = Rnl.fromNumber(Math.random());
          num.unit = Object.create(null);
          num.unit.expos = allZeros;
          num.dtype = dt.RATIONAL;
          stack.push(Object.freeze(num));
          break
        }

        case "isNaN": {
          const oprnd = stack.pop();
          const output = Object.create(null);
          output.value = !(oprnd.dtype & dt.RATIONAL);
          output.unit = null;
          output.dtype = dt.BOOLEAN;
          stack.push(Object.freeze(output));
          break
        }

        case "length": {
          const arg = stack.pop();
          const value = arg.value;
          const length = Matrix.isVector(arg)
            ? value.length
            : (arg.dtype & dt.MATRIX)
            ? value.length * value[0].length
            : (arg.dtype === dt.STRING)
            ? value.length - arrayOfRegExMatches(/[\uD800-\uD8FF\uFE00\uFE01]/g, value).length
            : (arg.dtype & dt.MAP)
            ? arg.keys().value.length
            : 0;
          const output = Object.create(null);
          output.value = Object.freeze(Rnl.fromNumber(length));
          output.unit = Object.create(null);
          output.unit.expos = allZeros;
          output.dtype = dt.RATIONAL;
          stack.push(Object.freeze(output));
          break
        }

        case "count": {
          const pattern = stack.pop();
          const str = stack.pop();
          if (pattern.dtype !== dt.STRING || str.dtype !== dt.STRING) {
            return errorOprnd("COUNT")
          }
          const output = Object.create(null);
          output.value = Object.freeze(
            Rnl.fromNumber(str.value.split(pattern.value).length - 1)
          );
          output.unit = Object.create(null);
          output.unit.expos = allZeros;
          output.dtype = dt.RATIONAL;
          stack.push(Object.freeze(output));
          break
        }

        case "format": {
          const formatSpec = stack.pop().value;
          const str = format(stack.pop().value, formatSpec);
          stack.push({ value: str, unit: null, dtype: dt.STRING });
          break
        }

        case "lerp": {
          // linear interpolation function
          const args = new Array(3);
          args[2] = stack.pop();
          args[1] = stack.pop();
          args[0] = stack.pop();
          const result = Functions.lerp(args, unitAware);
          if (result.dtype === dt.ERROR) { return result }
          stack.push(result);
          break
        }

        case "matrix2table": {
          const colNames = stack.pop();
          const rowNames = stack.pop();
          const matrix = stack.pop();
          const result = DataFrame.matrix2table(matrix, rowNames, colNames, vars);
          if (result.dtype === dt.ERROR) { return result }
          stack.push(result);
          break
        }

        case "transpose":
          stack.push(Matrix.transpose(stack.pop()));
          break

        case "trace":
          stack.push(Matrix.trace(stack.pop()));
          break

        case "fetch":
          // fetch() is handled in updateCalculations.js.
          // It's easier from there to coordinate an async function with ProseMirror.
          // So if control flow get here, we have an error.
          return errorOprnd("FETCH")

        case "function": {
          // User defined function.
          const functionName = tokens[i + 1];
          const numArgs = Number(tokens[i + 2]);
          i += 2;
          const args = new Array(numArgs);
          for (let j = numArgs - 1; j >= 0; j--) {
            args[j] = stack.pop();
          }
          let oprnd;
          if (vars.svg && (functionName === "plot" || (draw.functions[functionName]))) {
            if (functionName === "plot") {
              args.splice(1, 0, decimalFormat);
              oprnd = plot(...args);
            } else {
              oprnd = draw.functions[functionName](...args);
            }
          } else if (nextToken(tokens, i) === ".") {
            // Function from a module
            let lib = stack.pop().value;         // remote module
            if (lib.value) { lib = lib.value; }  // local module
            const udf = lib[functionName];
            if (udf === undefined) { return errorOprnd("F_NAME", functionName) }
            if (udf.dtype === dt.ERROR) { return udf }
            if (udf.isPrivate) { return errorOprnd("PRIVATE", functionName) }
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware, lib);
            i += 1;
          } else if (lib && lib[functionName]) {
            // A module, "lib", was passed to this instance of evalRpn().
            const udf = lib[functionName];
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware, lib);
          } else if (vars[functionName] && vars[functionName].dtype === dt.MODULE) {
            // User-defined function from a calculation node.
            const udf = vars[functionName]["value"];
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware);
          } else {
            return errorOprnd("BAD_FUN_NM", functionName)
          }
          if (oprnd.dtype === dt.ERROR) { return oprnd }
          stack.push(oprnd);
          break
        }

        case "=":
        case "==":
        case "<":
        case ">":
        case "<=":
        case "≤":
        case ">=":
        case "≥":
        case "≠":
        case "!=":
        case "∈":
        case "∉":
        case "⊆":
        case "⊈": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (unitAware &&
            !((o1.dtype & dt.STRING) || (o2.dtype & dt.STRING) ||
               o1.dtype === dt.NULL || o2.dtype === dt.NULL)) {
            if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
              return errorOprnd("UNIT_COMP")
            }
          }
          const bool = Object.create(null);
          bool.unit = null;
          const prevValue = (o1.dtype & dt.BOOLEANFROMCOMPARISON) ? oPrev.value : undefined;

          if (isIn(tkn, ["∈", "∉", "⊆", "⊈"])) {
            bool.value = compare(tkn, o1.value, o2.value, prevValue);
          } else {
            const [shape1, shape2, _] = binaryShapesOf(o1, o2);
            bool.value = Operators.relations[shape1][shape2].relate(tkn, o1.value,
              o2.value, prevValue);
          }
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }
          bool.dtype = o1.dtype + dt.BOOLEANFROMCOMPARISON;
          if (bool.dtype & dt.RATIONAL) { bool.dtype -= dt.RATIONAL; }
          if (bool.dtype & dt.COMPLEX) { bool.dtype -= dt.COMPLEX; }
          if (bool.dtype & dt.STRING) { bool.dtype -= dt.STRING; }
          oPrev = o2;
          stack.push(Object.freeze(bool));
          break
        }

        case "and":
        case "or":
        case "∧":
        case "∨":
        case "⊻": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (!(o1.dtype & dt.BOOLEAN) || !(o2.dtype & dt.BOOLEAN)) {
            return errorOprnd("LOGIC", tokens[i])
          }
          const op = { "and": "and", "or": "or", "∧": "and", "∨": "or", "⊻": "xor" }[tkn];
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);

          const bool = Object.create(null);
          bool.unit = null;
          bool.value = Operators.binary[shape1][shape2][op](o1.value, o2.value);
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }

          bool.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn);
          stack.push(Object.freeze(bool));
          break
        }

        case "not":
        case "¬": {
          const o1 = stack.pop();
          if (!(o1.dtype & dt.BOOLEAN)) { return errorOprnd("LOGIC", tkn) }
          const bool = Object.create(null);
          bool.unit = null;
          bool.value = Operators.unary[shapeOf(o1)]["not"](o1.value);
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }
          bool.dtype = dt.BOOLEAN;
          stack.push(Object.freeze(bool));
          break
        }

        case "cases": {
          // A multi-line cases expression. Hurmet's ternary expression.
          const numArgs = Number(tokens[i + 1]);
          i += 1;
          // We evaluate cases expressions lazily. Pop the conditions into an array.
          const conditions = new Array(numArgs);
          for (let j = numArgs - 1; j >= 0; j--) {
            conditions[j] = stack.pop();
          }
          // Check each condition.
          // When we reach the first true condition, evaluate the corresponding expression.
          for (let j = 0; j < numArgs; j++) {
            if ((conditions[j].dtype & dt.BOOLEAN) === 0) {
              return errorOprnd("LOGIC", "if")
            }
            const val = Operators.condition[shapeOf(conditions[j])](conditions[j].value);
            if (val) {
              const rpnLocal = tokens[i + j + 1].replace(/§/g, "\u00A0");
              const oprnd = evalRpn(rpnLocal, vars, decimalFormat, unitAware, lib);
              if (oprnd.dtype === dt.ERROR) { return oprnd }
              stack.push(oprnd);
              break
            }
          }
          i += numArgs;  // Discard the unused expressions
          break
        }

        case "applyUnit": {
          // Pop a magnitude off the stack and apply a unit.
          // This happens where a user writes a QUANTITY literal.
          if (!unitAware) { return errorOprnd("UNIT_AWARE", tokens[i + 1]) }
          const o1 = stack.pop();
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("QUANT_NUM") }
          const unitName = tokens[i + 1];
          i += 1;
          const output = Object.create(null);
          output.unit = Object.create(null);
          output.dtype = o1.dtype;
          if (!unitAware) {
            output.value = o1.value;
            if (o1.dtype & dt.MAP) {
              output.unit = unitFromUnitName(unitName, vars);
            } else {
              output.unit.name = unitName;
            }
          } else {
            // Convert the magnitude to base units.
            const unit = unitFromUnitName(unitName, vars);
            if (unit.dtype && unit.dtype === dt.ERROR) { return unit }
            if (isMatrix(o1)) {
              output.unit.expos = o1.unit.expos.map((e, j) => e + unit.expos[j]);
              output.value = Matrix.convertToBaseUnits(o1, unit.gauge, unit.factor);
            } else if (o1.dtype & dt.MAP) {
              output.unit = unitFromUnitName(o1.unit);
              output.value = o1.value;
            } else {
              output.unit.expos = o1.unit.expos.map((e, j) => e + unit.expos[j]);
              output.value = Rnl.multiply(Rnl.add(o1.value, unit.gauge), unit.factor);
            }
          }
          stack.push(Object.freeze(output));
          break
        }

        case "modulo": {
          const o2 = stack.pop();
          const o1 = stack.pop();
          if (!((o1.dtype & dt.RATIONAL) & (o2.dtype & dt.RATIONAL))) {
            return errorOprnd("NAN_OP")
          }
          const [shape1, shape2, _] = binaryShapesOf(o1, o2);
          const mod = Object.create(null);
          mod.unit = Object.create(null);
          mod.unit.expos = allZeros;
          mod.value = Operators.binary[shape1][shape2]["modulo"](o1.value, o2.value);
          if (mod.value.dtype && mod.value.dtype === dt.ERROR) { return mod.value }
          mod.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn);
          stack.push(Object.freeze(mod));
          break
        }

        case "⎾⏋":
        case "⎿⏌": {
          // ceiling or floor
          const o1 = stack.pop();
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, allZeros)) {
              // TODO: Write an error message.
              { return errorOprnd("") }
            }
          }
          const op = tkn === "⎾⏋" ? "ceil" : "floor";
          const output = Object.create(null);
          output.value = Operators.unary[shapeOf(o1)][op](o1.value);
          if (output.value.dtype && output.value.dtype === dt.ERROR) { return output.value }
          output.unit = o1.unit;
          output.dtype = o1.dtype;
          stack.push(Object.freeze(output));
          break
        }

        case "()": {
          // binomial
          const args = [];
          args.unshift(stack.pop());
          args.unshift(stack.pop());
          if (unitAware) {
            if (!unitsAreCompatible(args[0].unit.expos, allZeros) ||
              !unitsAreCompatible(args[1].unit.expos, allZeros)) {
              return errorOprnd("BINOM")
            }
          }
          const binom = Object.create(null);
          binom.unit = Object.create(null);
          binom.unit.expos = allZeros;
          const [value, dtype] = multivarFunction("binary", "binomial", args);
          binom.value = value;
          binom.dtype = dtype;
          stack.push(Object.freeze(binom));
          break
        }

        case "raise":
          return { value: stack.pop().value, unit: null, dtype: dt.ERROR }

        case "\\blue":
        case "\\gray":
        case "\\green":
        case "\\orange":
        case "\\pink":
        case "\\purple":
        case "\\red": {
          const color = clone(stack.pop());
          if (color.dtype === dt.STRING) { color.unit = tkn.slice(1); }
          stack.push(color);
          break
        }
          // TODO: Write an error message
      }
    }
  } // next i

  const oprnd = stack.pop();
  if (stack.length > 0) {
    return errorOprnd("ERROR")
  }

  return oprnd
};

const plot = (svg, decimalFormat, fun, numPoints, xMin, xMax) => {
  // Plot a function.
  // To avoid a circular reference, this function has to be here instead of in draw.js.
  const attrs = svg.value.temp;
  numPoints = (numPoints == null) ? Rnl.fromNumber(250) : numPoints.value;
  const min = (xMin == null) ? Rnl.fromNumber(attrs.xmin) : xMin.value;
  const max = (xMax == null) ? Rnl.fromNumber(attrs.xmax) : xMax.value;
  // Vectorize the evaluation. Start by finding a vector of the input.
  const step = Rnl.divide(Rnl.subtract(max, min), numPoints);
  const rowVector = Matrix.operandFromRange([min, step, max]);
  // Transpose the row vector into a column vector.
  const arg = { value: rowVector.value, unit: null, dtype: dt.COLUMNVECTOR + dt.RATIONAL };
  // Run the function on the vector.
  let funResult;
  let pathValue;
  if (fun.value.dtype && fun.value.dtype === dt.MODULE) {
    funResult = evalCustomFunction(fun.value, [arg], decimalFormat, false);
    pathValue = arg.value.map((e, i) => [e, funResult.value[i]]);
  } else if (fun.dtype === dt.STRING) {
    if (/§matrix§1§2$/.test(fun.value)) {
      arg.name = "t";
      pathValue = evalRpn(fun.value.replace(/§/g, "\xa0"), { t: arg }, decimalFormat, false).value;
    } else {
      arg.name = "x";
      funResult = evalRpn(fun.value.replace(/§/g, "\xa0"), { x: arg }, decimalFormat, false);
      pathValue = arg.value.map((e, i) => [e, funResult.value[i]]);
    }
  }
  const pth = { value: pathValue, unit: null, dtype: dt.MATRIX + dt.RATIONAL };
  return draw.functions.path(svg, pth, "L")
};

const elementFromIterable = (iterable, index, step) => {
  // A helper function. This is called by `for` loops in evalCustomFunction()
  let value;
  let nextIndex = Rnl.increment(index);
  let dtype = 0;
  if (iterable.dtype === dt.RANGE) {
    value = index;
    nextIndex = Rnl.add(index, step);
    dtype = dt.RATIONAL;
  } else if ((iterable.dtype === dt.STRING) &&
    iterable.value[Rnl.fromNumber(index)] === "\uD835") {
    value = Rnl.fromNumber(iterable.value[index] + iterable.value[index + 1]);
    nextIndex = Rnl.add(index, 2);
    dtype = dt.STRING;
  } else {
    value = iterable.value[Rnl.toNumber(index)];
    dtype = (iterable.dtype & dt.STRING)
      ? dt.STRING
      : (iterable.dtype & dt.ROWVECTOR)
      ? iterable.dtype - dt.ROWVECTOR
      : (iterable.dtype & dt.COLUMNVECTOR)
      ? iterable.dtype - dt.COLUMNVECTOR
      : iterable.dtype - dt.MATRIX;
  }
  const oprnd = { value: value, unit: iterable.unit, dtype: dtype };
  return [oprnd, nextIndex]
};

const loopTypes = ["while", "for"];

const evalCustomFunction = (udf, args, decimalFormat, isUnitAware, lib) => {
  // UDF stands for "user-defined function"
  // lib is short for library. If not omitted, it contains a module with more functions.

  if (udf.dtype === dt.ERROR) {
    return udf
  }

  // Populate the function parameters.
  if (args.length > udf.parameters.length) { return errorOprnd("NUMARGS", udf.name) }
  const vars = Object.create(null);
  for (let i = 0; i < args.length; i++) {
    vars[udf.parameters[i]] = args[i];
  }
  if (udf.parameters.length > args.length) {
    for (let i = args.length; i < udf.parameters.length; i++) {
      vars[udf.parameters[i]] = { value: undefined, unit: null, dtype: 0 };
    }
  }
  if (udf.dtype === dt.DRAWING) {
    vars["svg"] = { value: draw.startSvg(), unit: null, dtype: dt.DRAWING };
  }

  // Execute the function statements.
  // There will be nested flow of control, of course. So we'll create a
  // "control" stack. The topmost element contains info about the control
  // that applies to the current nesting level.
  const control = [{ type: "if", condition: true, endOfBlock: udf.statements.length - 1 }];
  for (let i = 0; i < udf.statements.length; i++) {
    const statement = udf.statements[i];
    const stype = statement.stype;
    const level = control.length - 1;
    switch (stype) {
      case "statement": {
        if (control[level].condition) {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
          if (result.dtype === dt.ERROR) { return result }
          if (statement.name) {
            statement.resultdisplay = isUnitAware ? "!!" : "!";
            const [stmt, _] = conditionResult(statement, result, isUnitAware);
            insertOneHurmetVar(vars, stmt, decimalFormat);
          }
        }
        break
      }

      case "if": {
        if (control[level].condition) {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
          if (result.dtype === dt.ERROR) { return result }
          const val = Operators.condition[shapeOf(result)](result.value);
          control.push({
            type: "if",
            condition: val,
            endOfBlock: statement.endOfBlock
          });
        } else {
          // Skip this block
          i = statement.endOfBlock;
        }
        break
      }

      case "else if": {
        if (control[level].type === "if" && control[level].condition) {
          i = control[level].endOfBlock;
          control.pop();
        } else {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
          if (result.dtype === dt.ERROR) { return result }
          const val = Operators.condition[shapeOf(result)](result.value);
          control[control.length - 1].condition = val;
        }
        break
      }

      case "else":
        if (control[level].type === "if" && control[level].condition) {
          i = control[level].endOfBlock;
          control.pop();
        } else {
          control[level].condition = true;
        }
        break

      case "while": {
        if (control[level].condition) {
          const cntrl = {
            type: "while",
            startStatement: i,
            rpn: statement.rpn,
            endOfBlock: statement.endOfBlock
          };
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
          if (result.dtype === dt.ERROR) { return result }
          const val = Operators.condition[shapeOf(result)](result.value);
          cntrl.condition = val;
          if (cntrl.condition === true) {
            control.push(cntrl);
          } else {
            i = statement.endOfBlock;
          }
        } else {
          i = statement.endOfBlock;
        }
        break
      }

      case "for": {
        const ctrl = {
          type: "for",
          condition: true,
          startStatement: i,
          endOfBlock: statement.endOfBlock
        };
        const tokens = statement.rpn.split("\u00A0");
        tokens.pop(); // Discard the "for"
        ctrl.dummyVariable = tokens.shift().slice(1);
        const iterable = evalRpn(tokens.join("\u00A0"), vars, decimalFormat, isUnitAware, lib);
        ctrl.index = (iterable.dtype & dt.RANGE) ? iterable.value[0] : Rnl.fromNumber(0);
        ctrl.step = (iterable.dtype & dt.RANGE) ? iterable.value[1] : Rnl.fromNumber(0);
        ctrl.endIndex = (iterable.dtype & dt.RANGE)
          ? iterable.value[2]
          : Rnl.fromNumber(iterable.value.length - 1);
        const [oprnd, nextIndex] = elementFromIterable(iterable, ctrl.index, ctrl.step);
        ctrl.nextIndex = nextIndex;
        ctrl.iterable = iterable;
        control.push(ctrl);
        vars[ctrl.dummyVariable] = oprnd;
        break
      }

      case "break": {
        if (control[level].condition) {
          // Find the enclosing loop and pop out of it.
          for (let j = control.length - 1; j > 0; j--) {
            if (loopTypes.includes(control[j].type) || j === 0) {
              i = control[j].endOfBlock;
              control.pop();
              break
            } else {
              control.pop();
            }
          }
        }
        break
      }

      case "end": {
        // end of code block
        if (control[level].type === "if" && i >= control[level].endOfBlock) {
          control.pop();
        } else if (control[level].type === "if" && control[level].condition) {
          // Jump ahead to end of if block
          if (i < control[level].endOfBlock) { i = control[level].endOfBlock; }
          control.pop();
        } else if (control[level].type === "while") {
          const result = evalRpn(control[level].rpn, vars, decimalFormat, isUnitAware, lib);
          if (result.dtype === dt.ERROR) { return result }
          control[level].condition = result.value;
          if (control[level].condition) {
            i = control[level].startStatement;
          } else {
            control.pop();
          }
        } else if (control[level].type === "for") {
          control[level].index = control[level].nextIndex;
          const proceed = Rnl.isRational(control[level].index)
            && Rnl.isPositive(control[level].step)
            ? Rnl.lessThanOrEqualTo(control[level].index, control[level].endIndex)
            : Rnl.isRational(control[level].index)
            ? Rnl.greaterThanOrEqualTo(control[level].index, control[level].endIndex)
            : control[level].index <= control[level].endIndex;
          if (proceed) {
            const [oprnd, nextIndex] = elementFromIterable(
              control[level].iterable,
              control[level].index, control[level].step
            );
            vars[control[level].dummyVariable] = oprnd;
            control[level].nextIndex = nextIndex;
            i = control[level].startStatement;
          } else {
            control.pop();
          }
        }
        break
      }

      case "return":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
            return result
          } else {
            return { value: Rnl.zero, unit: allZeros, dtype: dt.RATIONAL }
          }
        }
        break

      case "echo":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
            if (result.dtype === dt.ERROR) { return result }
            const msg = result.dtype === dt.RATIONAL
              ? Rnl.toNumber(result.value)
              : result.dtype === dt.STRING
              ? result.value
              : isVector(result) && (result.dtype & dt.RATIONAL)
              ? result.value.map(e => Rnl.toNumber(e))
              : result.dtype === dt.MATRIX + dt.RATIONAL
              ? result.value.map(row => row.map(e => Rnl.toNumber(e)))
              : result.value;
            // eslint-disable-next-line no-console
            console.log(msg);
          }
        }
        break

      case "raise":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib);
            return { value: result.value, unit: null, dtype: dt.ERROR }
          } else {
            return { value: statement.rpn, unit: null, dtype: dt.ERROR }
          }
        }
        break
        // TODO: Error message.
    }
  }
};

const errorResult = (stmt, result) => {
  stmt.value = null;
  stmt.resultDisplay = "\\color{firebrick}\\text{" + result.value + "}";
  stmt.altResultDisplay = result.value;
  stmt.error = true;
  if (stmt.resulttemplate.indexOf("!") > -1) {
    stmt.tex += "= " + stmt.resultDisplay;
    stmt.alt += result.value;
  } else if (stmt.resulttemplate.indexOf("@") > -1) {
    stmt.tex = stmt.resulttemplate.replace(/@@?/, stmt.resultDisplay);
    stmt.alt = stmt.altresulttemplate.replace(/@@?/, stmt.altResultDisplay);
  } else {
    stmt.tex = stmt.tex.replace(/[?%] *[?%]|[?%]/, stmt.resultDisplay);
    stmt.alt = stmt.alt.replace(/[?%] *[?%]|[?%]/, stmt.altResultDisplay);
  }
  return [stmt, result]
};

const conditionResult = (stmt, oprnd, unitAware) => {
  let result = Object.create(null);
  result.value = clone(oprnd.value);
  result.unit = clone(oprnd.unit);
  result.dtype = oprnd.dtype;

  if (result.dtype === dt.COMPLEX && Rnl.isZero(Cpx.im(result.value))) {
    result.value = Cpx.re(result.value);
    result.dtype = 1;
  }

  // Check unit compatibility.
  if (result.dtype !== dt.ERROR && unitAware && stmt.resultdisplay.indexOf("!") === -1 &&
    (stmt.expos || (result.unit && result.unit.expos && Array.isArray(result.unit.expos)))) {
    const expos = (stmt.expos) ? stmt.expos : allZeros;
    if (!unitsAreCompatible(result.unit.expos, expos)) {
      const message = stmt.expos ? "UNIT_RES" : "UNIT_MISS";
      result = errorOprnd(message);
    }
  }
  if (result.dtype === dt.ERROR) { return errorResult(stmt, result) }

  // Check for a valid display indicator.
  if (stmt.resulttemplate && stmt.resulttemplate.indexOf("!") > -1 &&
    !(result.dtype === dt.DATAFRAME || (result.dtype & dt.MAP) || isMatrix(result)
    || (result.dtype & dt.TUPLE))) {
    return errorResult(stmt, errorOprnd("BAD_DISPLAY"))
  }

  if (result.dtype & dt.RATIONAL) {
    result.value = isVector(result)
      ? result.value.map(e => Rnl.normalize(e))
      : isMatrix(result)
      ? result.value.map(row => row.map(e => Rnl.normalize(e)))
      : result.dtype === dt.RATIONAL
      ? Rnl.normalize(result.value)
      : result.value;
  } else if (result.dtype === dt.COMPLEX) {
    result.value = [Rnl.normalize(result.value[0]), Rnl.normalize(result.value[1])];
  }
  stmt.dtype = result.dtype;

  // If unit-aware, convert result to desired result units.
  const unitInResultSpec = (stmt.factor && (stmt.factor !== 1 || stmt.gauge));
  if ((result.dtype & dt.DATAFRAME) ||
      (typeof stmt.resultdisplay === "string" && stmt.resultdisplay.indexOf("!") > -1)) {
    stmt.unit = result.unit;
  } else if (unitAware && (result.dtype & dt.RATIONAL)) {
    if (!unitInResultSpec & unitsAreCompatible(result.unit.expos, allZeros)) {
      stmt.factor = Rnl.one; stmt.gauge = Rnl.zero; stmt.expos = allZeros;
    }
    result.value = {
      plain: (isMatrix(result))
        ? Matrix.convertFromBaseUnits(
          { value: result.value, dtype: result.dtype },
          stmt.gauge,
          stmt.factor
          )
        : (result.dtype & dt.MAP)
        ? map.convertFromBaseUnits(result.value, stmt.gauge, stmt.factor)
        : Rnl.subtract(Rnl.divide(result.value, stmt.factor), stmt.gauge),
      inBaseUnits: result.value
    };
    stmt.dtype += dt.QUANTITY;
    stmt.expos = result.unit.expos;
  } else if (unitInResultSpec) {
    // A non-unit aware calculation, but with a unit attached to the result.
    result.value = {
      plain: result.value,
      inBaseUnits: (isMatrix(result) && (result.dtype & dt.MAP))
        ? mapMap(result.value, val => {
          return val.map(e => Rnl.multiply(Rnl.add(e, stmt.gauge), stmt.factor))
        })
        : (isMatrix(result))
        ? Matrix.convertToBaseUnits(
          { value: result.value, dtype: result.dtype },
          stmt.gauge,
          stmt.factor
          )
        : (result.dtype & dt.MAP)
        ? mapMap(result.value, val => {
          return Rnl.multiply(Rnl.add(val, stmt.gauge), stmt.factor)
        })
        : Rnl.multiply(Rnl.add(result.value, stmt.gauge), stmt.factor)
    };
    stmt.dtype += dt.QUANTITY;

  } else if ((result.dtype & dt.RATIONAL) || (result.dtype & dt.COMPLEX) ) {
    // A numeric result with no unit specified.
    stmt.expos = allZeros;
  }
  if (result.value)  { stmt.value = result.value; }
  return [stmt, result]
};

const evaluateDrawing = (stmt, vars, decimalFormat = "1,000,000.") => {
  // eslint-disable-next-line no-prototype-builtins
  const udf = stmt.value;
  const args = [];
  for (let i = 0; i < udf.parameters.length; i++) {
    const argName = udf.parameters[i];
    args.push(evalRpn("¿" + argName, vars, decimalFormat, false, {}));
  }
  const funcResult = evalCustomFunction(udf, args, decimalFormat, false, {});
  if (funcResult.dtype === dt.ERROR) {
    stmt.error = true;
    stmt.tex = "\\color{firebrick}\\text{" + funcResult.value + "}";
    stmt.value = null;
    stmt.dtype = dt.ERROR;
  } else {
    stmt.resultdisplay = funcResult.value;
    delete stmt.resultdisplay.temp;
  }
  return stmt
};

const evaluate = (stmt, vars, decimalFormat = "1,000,000.") => {
  stmt.tex = stmt.template;
  stmt.alt = stmt.altTemplate;
  const isUnitAware = /\?\?|!!|%%|@@|¡¡/.test(stmt.resulttemplate);

  const formatSpec = vars.format ? vars.format.value : "h15";

  if (stmt.tex.indexOf("〖") > -1) {
    // eslint-disable-next-line max-len
    const eqnWithVals = plugValsIntoEcho(stmt.tex, vars, isUnitAware, formatSpec, decimalFormat);
    if (eqnWithVals.dtype && eqnWithVals.dtype === dt.ERROR) {
      const [newStmt, _] = errorResult(stmt, eqnWithVals);
      return newStmt
    } else {
      stmt.tex = eqnWithVals;
    }
  }

  if (stmt.rpn) {
    let oprnd = evalRpn(stmt.rpn, vars, decimalFormat, isUnitAware);
    if (oprnd.dtype === dt.ERROR) { [stmt, oprnd] = errorResult(stmt, oprnd); return stmt}
    let result;
    [stmt, result] = conditionResult(stmt, oprnd, isUnitAware);
    if (stmt.error) { return stmt }
    stmt = formatResult(stmt, result, formatSpec, decimalFormat, isUnitAware);
  }
  return stmt
};

const numberRegEx$3 = new RegExp(Rnl.numberPattern);
const unitRegEx$1 = /('[^']+'|[°ΩÅK])$/;
/* eslint-disable max-len */

const numStr = "(-?(?:0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?)))";
const nonNegNumStr = "(0x[0-9A-Fa-f]+|[0-9]+(?: [0-9]+\\/[0-9]+|(?:\\.[0-9]+)?(?:e[+-]?[0-9]+|%)?))";
const complexRegEx = new RegExp("^" + numStr + "(?: *([+-]) *j +" + nonNegNumStr + "|∠" + numStr + "(°)?)");
// const complexRegEx = /^(number)(?: *([+-]) *j +(non-negative number)|∠(number)(°)?)/
/* eslint-enable max-len */
// Capturing groups:
//    [1] First number, either a in a + j b, or r in r∠θ
//    [2] + or -. Gives the sign of the imaginary part in an a + j b.
//    [3] b, the imaginary part in an a + j b expression
//    [4] theta, the argument (phase angle ) of an r∠θ expression
//    [5] °, optional trailing degree sign in an r∠θ expression

const valueFromLiteral = (str, name, decimalFormat) => {
  // Read a literal string and return a value
  // The return should take the form: [value, unit, dtype, resultDisplay]

  // Start by checking for a unit
  let unitName = "";
  let unitDisplay = "";
  const unitMatch = unitRegEx$1.exec(str);
  if (unitMatch) {
    unitName = unitMatch[0].replace(/'/g, "").trim();
    str = str.slice(0, -unitMatch[0].length).trim();
    unitDisplay = unitTeXFromString(unitName);
  }

  if (/^[({[].* to /.test(str)) {
    // str defines a quantity distribution, (a to b). That is handled by calculation.js.
    // This is not a valid literal.
    return [0, null, dt.ERROR, ""]

  } else if (str === "true" || str === "false") {
    return [Boolean(str), null, dt.BOOLEAN, `\\mathord{\\text{${str}}}`]

  } else if (/^\x22.+\x22/.test(str)) {
    // str contains text between quotation marks
    if (name === "format") {
      return parseFormatSpec(str.slice(1, -1).trim())
    } else {
      const tex = parse(str, decimalFormat);
      return [str, undefined, dt.STRING, tex]
    }

  } else if (/^[([]/.test(str)) {
    // We're processing a matrix
    const [tex, rpn] = parse(str, decimalFormat, true);
    const oprnd = evalRpn(rpn, {}, decimalFormat, false, {});
    let unit = (oprnd.dtype & dt.RATIONAL) ? allZeros : null;
    let dtype = oprnd.dtype;
    if (unitName) {
      unit = unitName;
      dtype += dt.QUANTITY;
      return [oprnd.value, unit, dtype, tex + "\\," + unitDisplay]
    } else {
      return [oprnd.value, unit, dtype, tex]
    }

  } else if (/^``/.test(str)) {
    // A CSV between double back ticks.
    // Read the CSV into a data frame.
    str = tablessTrim(str.slice(2, -2));
    const dataStructure = DataFrame.dataFrameFromCSV(str, {});
    if (dataStructure.dtype === dt.DATAFRAME) {
      return [dataStructure.value, dataStructure.unit, dt.DATAFRAME,
        DataFrame.display(dataStructure.value, "h3", decimalFormat)]
    } else {
      // It's a Hurmet Map
      if (unitName) {
        dataStructure.unit = unitName;
        dataStructure.dtype = dt.MAP + dt.RATIONAL + dt.QUANTITY;
      }
      return [dataStructure.value, dataStructure.unit, dataStructure.dtype,
        map.display(dataStructure, "h3", decimalFormat) + "\\;" + unitDisplay]
    }

  } else if (complexRegEx.test(str)) {
    // str is a complex number.
    const resultDisplay = parse(str, decimalFormat);
    const parts = str.match(complexRegEx);
    let real;
    let im;
    if (parts[3]) {
      // a + j b expression
      real = Rnl.fromString(parts[1]);
      im = Rnl.fromString(parts[3]);
      if (parts[2] === "-") { im = Rnl.negate(im); }
    } else {
      // r∠θ expression
      const r = Rnl.fromString(parts[1]);
      let theta = Rnl.fromString(parts[4]);
      if (parts[5]) { theta = Rnl.divide(Rnl.multiply(theta, Rnl.pi), Rnl.fromNumber(180)); }
      real = Rnl.multiply(r, Rnl.fromNumber(Math.cos(Rnl.toNumber(theta))));
      im = Rnl.multiply(r, Rnl.fromNumber(Math.sin(Rnl.toNumber(theta))));
    }
    return [[real, im], allZeros, dt.COMPLEX, resultDisplay]

  } else if (str.match(numberRegEx$3)) {
    // str is a number.
    const resultDisplay = parse(str, decimalFormat);
    if (unitName) {
      return [Rnl.fromString(str), unitName, dt.RATIONAL + dt.QUANTITY,
        resultDisplay + "\\;" + unitDisplay]
    } else {
      return [Rnl.fromString(str), allZeros, dt.RATIONAL, resultDisplay]
    }

  } else {
    return [0, null, dt.ERROR, ""]

  }
};

/*  This module, like prepareStatement.js, is called only when
 *  (1) an author submits a Hurmet calculation dialog box, or
 *  (2) when a new document is opened, or (3) when recalculate-all is called.
 *  Here we process literal values of assignment statements.
 */

const improveQuantities = (attrs, vars) => {
  if (attrs.name && attrs.value && (attrs.dtype & dt.QUANTITY)) {
    // Assignment of a quantity. Get it in base units
    const unit = (attrs.unit === undefined)
      ? {
        name: "",
        factor: Rnl.one,
        gauge: Rnl.zero,
        log: "",
        expos: allZeros
      }
      : typeof attrs.unit === "string"
      ? unitFromUnitName(attrs.unit, vars)
      : attrs.unit; // unit from a MAP is already expanded.

    if (unit.dtype && unit.dtype === dt.ERROR) {
      attrs.tex += "\u00a0\\color{firebrick}{\\text{" + unit.value + "}}";
      attrs.alt += unit.value;
      return attrs
    }

    attrs.expos = unit.expos;
    if (Rnl.isRational(attrs.value)) {
      attrs.value = {
        plain: attrs.value,
        inBaseUnits: Rnl.multiply(Rnl.add(attrs.value, unit.gauge), unit.factor)
      };
    } else if (isMatrix(attrs)) {
      attrs.value = {
        plain: attrs.value,
        inBaseUnits: Matrix.convertToBaseUnits(attrs, unit.gauge, unit.factor)
      };
    } else if (attrs.dtype & dt.MAP) {
      const plain = clone(attrs.value);
      const inBaseUnits = map.convertToBaseUnits(plain, unit.gauge, unit.factor);
      attrs.value = { plain, inBaseUnits };
      attrs.unit = { expos: unit.expos };
    }
  }
  if (attrs.rpn && !attrs.value) {
    if (attrs.unit) {
      const unit = (attrs.unit)
        ? unitFromUnitName(attrs.unit, vars)
        : { factor: 1, gauge: 0, expos: allZeros };
      // We save factor and gauge with the cell attrs so that the result of
      // a later calculation can be converted into the desired display units.
      attrs.factor = unit.factor;
      attrs.gauge = unit.gauge;
      attrs.expos = unit.expos;
    }
  }

};

const isValidIdentifier$1 = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/;
const keywordRegEx = /^(if|else if|else|return|raise|while|for|break|echo|end)\b/;
const drawCommandRegEx = /^(title|frame|view|axes|grid|stroke|strokewidth|strokedasharray|fill|fontsize|fontweight|fontstyle|fontfamily|marker|line|path|plot|curve|rect|circle|ellipse|arc|text|dot|leader|dimension)\b/;

// If you change functionRegEx, then also change it in mathprompt.js.
// It isn't called from there in order to avoid duplicating Hurmet code inside ProseMirror.js.
const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/;
const drawRegEx = /^draw\(/;
const startSvgRegEx = /^startSvg\(\)/;
const lexRegEx = /"[^"]*"|``.*|`[^`]*`|'[^']*'|#|[^"`'#]+/g;

const testForStatement = str => {
  const pos = str.indexOf("=");
  if (pos === -1) { return false }
  const leadStr = str.slice(0, pos).trim();
  if (isValidIdentifier$1.test(leadStr)) { return true }
  if (leadStr.indexOf(",") === -1) { return false }
  let result = true;
  const arry = leadStr.split(",");
  arry.forEach(e => {
    if (!isValidIdentifier$1.test(e.trim())) { result = false; }
  });
  return result
};

const stripComment = str => {
  // Strip the comment, if any, from the end of a code line.
  const matches = arrayOfRegExMatches(lexRegEx, str);
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].value === "#") {
      str = str.slice(0, matches[i].index);
      break
    }
  }
  return str.trim()
};

const scanModule = (str, decimalFormat) => {
  // Scan the code and break it down into individual lines of code.
  // Assemble the lines into functions and assign each function to parent.
  const parent = Object.create(null);

  // Statements end at a newline.
  const lines = str.split(/\r?\n/g);

  for (let i = 0; i < lines.length; i++) {
    // Get a single line of code and strip off any comments.
    const line = stripComment(lines[i]);
    if (line.length === 0) { continue }

    if (functionRegEx.test(line) || drawRegEx.test(line)) {
      // This line starts a new function.
      const [funcObj, endLineNum] = scanFunction(lines, decimalFormat, i);
      if (funcObj.dtype && funcObj.dtype === dt.ERROR) { return funcObj }
      parent[funcObj.name] = funcObj;
      i = endLineNum;
    } else if (testForStatement(line)) {
      // This line starts a Hurmet assignment.
      const [stmt, endLineNum] = scanAssignment(lines, decimalFormat, i);
      parent[stmt.name] = stmt;
      i = endLineNum;
    }
  }
  return { value: parent, unit: null, dtype: dt.MODULE }

};

const handleCSV = (expression, lines, startLineNum) => {
  for (let i = startLineNum + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) { continue }
    expression += "\n" + line;
    if (line.slice(-2) === "``") { return [expression, i] }
  }
};

const scanFunction = (lines, decimalFormat, startLineNum) => {
  const line1 = stripComment(lines[startLineNum]);
  let isDraw = line1.charAt(0) === "d";
  const posParen = line1.indexOf("(");
  let functionName = "";
  if (isDraw) {
    functionName = "draw";
  } else {
    const posFn = line1.indexOf("function");
    functionName = line1.slice(posFn + 8, posParen).trim();
  }
  const isPrivate = /^private /.test(line1);
  const parameterList =  line1.slice(posParen + 1, -1).trim();
  const parameters = parameterList.length === 0 ? [] : parameterList.split(/, */g);
  const funcObj = {
    name: functionName,
    dtype: isDraw ? dt.DRAWING : dt.MODULE,
    isPrivate,
    parameters,
    statements: []
  };

  const stackOfCtrls = [];
  let expression = "";
  let prevLineEndedInContinuation = false;
  let prevLine = "";
  let name = "";
  let isStatement = false;

  for (let i = startLineNum + 1; i < lines.length; i++) {
    let line = stripComment(lines[i]);
    if (line.length === 0) { continue }

    if (prevLineEndedInContinuation) {
      // Check if the previous character is a semi-colon just before a matrix literal closes.
      const lastChar = prevLine.slice(-1);
      line = lastChar === ";" && "})]".indexOf(line.charAt(0)) > -1
        ? prevLine.slice(0, -1).trim() + line
        : lastChar === ";" || lastChar === ","
        ? prevLine + " " + line
        : prevLine + line;
    }

    // Line continuation characters are: { ( [ , ; + -
    if (/[{([,;]$/.test(line)) {
      prevLineEndedInContinuation = true;
      prevLine = line;
      continue
    } else if (lines.length > i + 1 && /^\s*[+\-)\]}]/.test(lines[i + 1])) {
      prevLineEndedInContinuation = true;
      prevLine = line;
      continue
    }

    const keyword = keywordRegEx.exec(line);
    if (keyword) {
      name = keyword[0];
      expression = line.slice(name.length).trim();
      if (expression.length > 0 && /^``/.test(expression)) {
        [expression, i] = handleCSV(expression, lines, i);
      }
    } else if (isDraw && drawCommandRegEx.test(line)) {
      name = "svg";
      expression = line.indexOf(" ") === -1
        ? line + "(svg)"
        : line.replace(" ", "(svg, ") + ")";
      isStatement = true;
    } else {
      if (testForStatement(line)) {
        // We have an "=" assignment operator.
        const posEq = line.indexOf("=");
        name = line.slice(0, posEq - 1).trim();
        expression = line.slice(posEq + 1).trim();
        if (/^``/.test(expression)) { [expression, i] = handleCSV(expression, lines, i); }
        if (startSvgRegEx.test(expression)) { isDraw = true; }
        isStatement = true;
      } else {
        // TODO: We shouldn't get here. Write an error.
        return [errorOprnd("FUNC_LINE", functionName + ", line " + (i + 1)), i]
      }
    }

    let rpn = "";
    if (expression) {
      [, rpn] = parse(expression, decimalFormat, true);
    }
    const stype = isStatement ? "statement" : name;
    if (isStatement && /[,;]/.test(name)) {
      name = name.split(/[,;]/).map(e => e.trim());
    }
    funcObj.statements.push({ name: name, rpn: rpn, stype: stype });
    if (stype === "if" || stype === "while" || stype === "for") {
      stackOfCtrls.push({ type: stype, statementNum: funcObj.statements.length - 1 });
      if (stype === "for" && rpn.indexOf("j\u00a0") === 0) { return [errorOprnd("BAD_J")] }
    } else if (stype === "end") {
      if (stackOfCtrls.length === 0) {
        // Finished the current function.
        if (isDraw) {
          funcObj.statements.splice(-1, 0, { name: "return", rpn: "¿svg", stype: "return" });
        }
        return [funcObj, i]
      }
      const ctrl = stackOfCtrls[stackOfCtrls.length - 1];
      funcObj.statements[ctrl.statementNum].endOfBlock = funcObj.statements.length - 1;
      stackOfCtrls.pop();
    }

    // Reset for next statement
    isStatement = false;
    prevLineEndedInContinuation = false;
    prevLine = "";
    name = "";
    expression = "";
  }
  return [errorOprnd("END_MISS", functionName), 0]
};

const scanAssignment = (lines, decimalFormat, iStart) => {
  let prevLineEndedInContinuation = false;
  let str = "";
  let iEnd = iStart;
  for (let i = iStart; i < lines.length; i++) {
    const line = stripComment(lines[i]);
    if (line.length === 0) { continue }

    if (prevLineEndedInContinuation) {
      // Check if the previous character is a semi-colon just before a matrix literal closes.
      str = str.slice(-1) === ";" && "})]".indexOf(line.charAt(0)) > -1
        ? str.slice(0, -1).trim() + line
        : str + line;
    } else {
      str = line;
    }

    // Line continuation characters are: { ( [ , ; + -
    if (/[{([,;]$/.test(str)) {
      prevLineEndedInContinuation = true;
    } else if (lines.length > i + 1 && /^\s*[+\-)\]}]/.test(lines[i + 1])) {
      prevLineEndedInContinuation = true;
    } else {
      iEnd = i;
      break
    }
  }

  const posEquals = str.indexOf("=");
  let name = str.slice(0, posEquals).trim();
  if (/[,;]/.test(name)) {
    name = name.split(/[,;]/).map(e => e.trim());
  }
  const trailStr = str.slice(posEquals + 1).trim();
  const [value, unit, dtype, resultDisplay] = valueFromLiteral(trailStr, name, decimalFormat);
  const stmt = { name, value, unit, dtype, resultDisplay };
  improveQuantities(stmt, {});
  return [stmt, iEnd]
};

/*  prepareStatement.js
 *
 *  This module is called when: (1) an author submits a Hurmet calculation dialog box, or
 *  (2) when a new document is opened, or (3) when recalculate-all is called.
 *  Here we do some preparation in a calculation cell prior to calculation.
 *
 *  This module does NOT calculate the result of an expression. It stops just short of that.
 *  How do we choose where to draw the line between tasks done here and tasks done later?
 *  We do as much here as we can without knowing the values that other cells have assigned
 *  to variables. The goal is to minimize the amount of work done by each dependent cell
 *  when an author changes an assigned value.  Later, calculation updates will not have to
 *  repeat the work done in this module, so updates will be faster.
 *
 *  Variable inputStr contains the string that an author wrote into the dialog box.
 *
 *  From that entry this module will:
 *    1. Determine the name of the cell, as in "x" from "x = 12"
 *    2. Parse the entry string into TeX, to be passed later to Temml for rendering.
 *    3. If the input asks for a calculation:
 *       a. Parse the expression into an echo string (in TeX) with placeholders that will be
 *          filled in later with values when the calculation is done.
 *       b. Parse the expression into RPN (postfix) to be passed later to evaluate().
 *       c. Process the unit of measure, if any, of the result. Save it for later calculation.
 *    4. If an assigned value is static, not calculated, find its value.
 *    5. If a unit has been defined in a staic assignment, find the value in Hurmet base units.
 *    6. Append all the display strings together.
 *    7. Return the result. Hurmet will attach it to ProseMirror "attrs" of that node.
 */

const containsOperator = /[+\-×·*∘⌧/^%‰&√!¡|‖&=<>≟≠≤≥∈∉⋐∧∨⊻¬]|\xa0(function|modulo|\\atop|root|sum|abs|cos|sin|tan|acos|asin|atan|sec|csc|cot|asec|acsc|acot|exp|log|ln|log10|log2|cosh|sinh|tanh|sech|csch|coth|acosh|asinh|atanh|asech|acsch|acoth|Gamma|Γ|logGamma|logΓ|logFactorial|cosd|sind|tand|acosd|asind|atand|secd|cscd|cotd|asecd|acscd|acotd|Re|Im|argument|chr|round|sqrt|sign|\?{}|%|⎾⏋|⎿⏌|\[\]|\(\))\xa0/;
const mustDoCalculation = /^(``.+``|[$$£¥\u20A0-\u20CF]?(\?{1,2}|@{1,2}|%{1,2}|!{1,2})[^=!(?@%!{})]*)$/;
const assignDataFrameRegEx = /^[^=]+=\s*``/;
const currencyRegEx = /^[$£¥\u20A0-\u20CF]/;
const isValidIdentifier$2 = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/;
const matrixOfNames = /^[([](?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*[,;].+[)\]]$/;
const isKeyWord = /^(π|true|false|root|if|else|and|or|otherwise|modulo|for|while|break|return|raise)$/;

const shortcut = (str, decimalFormat) => {
  // No calculation in str. Parse it just for presentation.
  const tex = parse(str, decimalFormat);
  return { entry: str, tex, alt: str }
};

const prepareStatement = (inputStr, decimalFormat = "1,000,000.") => {
  let leadStr = "";
  let mainStr = "";
  let trailStr = "";
  let isCalc = false;
  let suppressResultDisplay = false;
  let displayResultOnly = false;
  let omitEcho = false;
  let mustAlign = false;
  let posOfFirstEquals = 0;
  let expression = "";
  let echo = "";
  let rpn = "";
  let resultDisplay = "";
  let name = "";
  let leadsWithCurrency = false;
  let value;
  let unit;
  let dtype;
  let str = "";

  const isDraw = drawRegEx.test(inputStr);
  if (functionRegEx.test(inputStr) || isDraw) {
    // This cell contains a custom function.
    let name = "";
    if (isDraw) {
      name = "draw";
    } else {
      const posFn = inputStr.indexOf("function");
      const posParen = inputStr.indexOf("(");
      name = inputStr.slice(posFn + 8, posParen).trim();
    }
    const module = scanModule(inputStr, decimalFormat);
    const isError = module.dtype && module.dtype === dt.ERROR;
    if (isError) {
      // eslint-disable-next-line no-alert
      window.alert(module.value);
    }
    const attrs = {
      entry: inputStr,
      name,
      value: (isError) ? module.value : module.value[name],
      // TODO: what to do with comma decimals?
      dtype: isError ? dt.ERROR : name === "draw" ? dt.DRAWING : dt.MODULE,
      error: isError
    };
    return attrs
  }

  str = inputStr;

  const isDataFrameAssigment = assignDataFrameRegEx.test(str);
  const posOfLastEquals = isDataFrameAssigment
    ? str.indexOf("=") + 1
    : str.lastIndexOf("=") + 1;

  if (posOfLastEquals > 1) {
    // input has form:  mainStr = trailStr
    mainStr = str.substring(0, posOfLastEquals - 1).replace(/ +$/, "");
    if (mainStr.length > 0 && /;\s*$/.test(mainStr)) {
      mustAlign = true;
      mainStr = mainStr.replace(/;\s*$/, "");
    }
    mainStr = mainStr.trim();
    trailStr = str.substring(posOfLastEquals).trim();

    if (mustDoCalculation.test(trailStr)) {
      // trailStr contains a ? or a @ or a % or a !. In other words,
      // input has form:  mainStr = something [?@%!] something
      // The [?@%!] signals that the author wants a calculation done.
      isCalc = true;

      // A ! tells us to calculate and save the result, but to NOT display the result.
      suppressResultDisplay = trailStr.indexOf("!") > -1;

      // A @ tells us to display only the result.
      displayResultOnly = trailStr.indexOf("@") > -1;

      omitEcho = trailStr.indexOf("%") > -1;

      posOfFirstEquals = mainStr.indexOf("=") + 1;
      if (posOfFirstEquals) {
        // input has form:  leadStr = something = trailStr
        leadStr = mainStr.slice(0, posOfFirstEquals - 1).trim();

        // Input has form:  name = expression = trailStr, or
        //                  name1, name2, = expression = trailStr
        expression = mainStr.substring(posOfFirstEquals).trim();
        if (matrixOfNames.test(leadStr)) { leadStr = leadStr.slice(1, -1).trim(); }
        if (/[,;]/.test(leadStr)) {
          const potentialIdentifiers = leadStr.split(/[,;]/);
          for (let i = 0; i < potentialIdentifiers.length; i++) {
            const candidate = potentialIdentifiers[i].trim();
            if (isKeyWord.test(candidate) || !isValidIdentifier$2.test(candidate)) {
              // leadStr is not a list of valid identifiers.
              // So this isn't a valid calculation statement. Let's finish early.
              return shortcut(str, decimalFormat)
            }
          }
          // multiple assignment.
          name = potentialIdentifiers.map(e => e.trim());

        } else {
          if (isValidIdentifier$2.test(leadStr) && !isKeyWord.test(leadStr)) {
            name = leadStr;
          } else {
            // The "=" sign is inside an expression. There is no lead identifier.
            // This statement does not assign a value to a variable. But it may do a calc.
            // input has form:  expression = trailStr
            expression = mainStr;
          }
        }
      } else {
        // This calculation string contains only one "=" character.
        // input has form:  expression = trailStr
        expression = mainStr;
      }
    } else if (isDataFrameAssigment) {
      name = mainStr;
      expression = trailStr;
    } else  if (isValidIdentifier$2.test(mainStr) && !isKeyWord.test(mainStr)) {
      // No calculation display selector is present,
      // but there is one "=" and a valid idendtifier.
      // It may be an assignment statement.
      // input has form:  name = trailStr
      name = mainStr;
      if (trailStr === "") {
        const tex = parse(str, decimalFormat);
        return { entry: str, tex, alt: str }
      }
    } else {
      // input has form:  mainStr = trailStr.
      // It almost works as an assignment statment, but mainStr is not a valid identifier.
      // So we'll finish early.
      return shortcut(str, decimalFormat)
    }
  } else {
    // str contains no "=" character. Let's fnish early.
    return shortcut(str, decimalFormat)
  }

  if (expression.length > 0) {
    // The author may want a calculaltion done on the expression.
    if (/^\s*fetch\(/.test(expression)) {
      // fetch() functions are handled in updateCalculations.js, not here.
      // It's easier from there to send a fetch() callback to a ProseMirror transaction.
      echo = "";

    } else {
      // Parse the expression. Stop short of doing the calculation.
      [echo, rpn] = parse(expression, decimalFormat, true);

      // Shoulld we display an echo of the expression, with values shown for each variable?
      if (suppressResultDisplay || displayResultOnly || echo.indexOf("〖") === -1
          || /\u00a0for\u00a0/.test(rpn)) {
        // No.
        echo = "";
      } else if (omitEcho) {
        echo = "";
      } else {
        // The expression calls a variable.
        // If it also contains an operator or a function, then we need to show the echo.
        if (containsOperator.test("\xa0" + rpn + "\xa0")) {
          echo = "{\\color{#0000ff}" + echo + "}";
        } else {
          echo = "";
        }
      }
    }
  }

  // Now let's turn our attention from the expression to the trailStr.
  if (currencyRegEx.test(trailStr)) {
    leadsWithCurrency = true;
    unit = trailStr.charAt(0);
  }

  if (isCalc) {
    // trailStr contains a display selector.
    value = null;

    if (!leadsWithCurrency) {
      // Check for a unit, even if it isn't a unit-aware calculation
      unit = trailStr.replace(/[?@%!']/g, "").trim();
    }

    if (suppressResultDisplay) {
      resultDisplay = trailStr;
    } else {
      if (unit) {
        resultDisplay = trailStr.trim().replace(/([^ ?!@%]+)$/, "'" + "$1" + "'");
        resultDisplay = parse(resultDisplay, decimalFormat).replace(/\\%/g, "%").replace("@ @", "@@");
      } else {
        resultDisplay = parse(trailStr, decimalFormat).replace(/\\%/g, "%").replace("@ @", "@@");
      }
      resultDisplay = resultDisplay.replace(/\\text\{(\?\??|%%?)\}/, "$1");
      resultDisplay = resultDisplay.replace(/([?%]) ([?%])/, "$1" + "$2");
    }

  } else {
    // trailStr may be a static value in an assignment statement.
    // Check if trailStr is a valid literal.
    [value, unit, dtype, resultDisplay] = valueFromLiteral(trailStr, name, decimalFormat);

    if (dtype === dt.ERROR) { return shortcut(str, decimalFormat) }
    rpn = "";
  }

  // Assemble the equation to display
  let eqn = "";
  let altEqn = "";
  if (!displayResultOnly) {
    eqn = parse(mainStr, decimalFormat);
    if (mustAlign) {
      eqn = "\\begin{aligned}" + eqn;
      const pos = eqn.indexOf("=");
      eqn = eqn.slice(0, pos) + "&" + eqn.slice(pos);
    }
    const alignChar = mustAlign ? "\\\\ &" : "";
    altEqn = mainStr;
    if (echo.length > 0 && !omitEcho) {
      eqn += ` ${alignChar}= ` + echo;
    }
    if (!suppressResultDisplay) {
      eqn += " " + (mustAlign ? "\\\\&" : "") + "= " + resultDisplay;
      altEqn += " = " + trailStr;
    }
    if (mustAlign) { eqn += "\\end{aligned}"; }
  }

  // Populate the object to be returned.
  // It will eventually be attached to ProseMirror schema attrs, so call it "attrs".
  const attrs = {
    entry: str,
    template: eqn,
    altTemplate: altEqn,
    resultdisplay: resultDisplay,
    dtype: dtype,
    error: false
  };

  if (name) { attrs.name = name; }
  if (isCalc) {
    attrs.resulttemplate = resultDisplay;
    attrs.altresulttemplate = trailStr;
  } else {
    attrs.tex = eqn;
    attrs.alt = altEqn;
  }
  if (rpn) { attrs.rpn = rpn; }
  if (value) { attrs.value = value; }
  if (unit) {
    if (Array.isArray(unit)) {
      attrs.expos = unit;
    } else {
      attrs.unit = unit;
    }
  }

  return attrs
};

/*
 *  This module mostly organizes one or two passes through the data structure of a Hurmet
 *  document, calling for a calculation to be done on each Hurmet calculation cell.
 *  If you are looking for the calculation itself, look at evaluate.js.
 *
 *  To be more precise, this module is called:
 *    1. When an author submits one calculation cell, or
 *    2. When a new Hurmet.app instance has opened (from index.js), or
 *    3. When a user has opened a new file         (from openFile.js), or
 *    4. When a recalculate-all has been called, possibly after a paste. (from menu.js)
 *
 *  Case 1 calculates the submitted cell and all dependent calculation cells.
 *  Cases 2 thru 4 re-calculate the entire document. I.e., isCalcAll is set to true.
 *  After calculation is complete, we send the results to ProseMirror to be
 *  rendered in the document.
 *
 *   This module's main exported function is updateCalculations(…)
 */

/*
* Note 1: state.selection shenanigans
*
* Before creating a ProseMirror (PM) transaction, this module first changes `state.selection`.
* That is to say, I change the PM state without running that change thru a PM transaction.
* PM docs advise against that, so I want to explain why I do so.
*
* For Undo purposes, a calculation should be atomic.
* An Undo of a calculation should return the doc to the condition before the
* calculation cell was edited. That will feel natural to people accustomed to Excel.
* When a calculation is submitted, Hurmet creates a single PM transaction and into it,
* Hurmet collects all the changes that the calculation makes to the original cell and
* also all the changes to dependent cells.
* When a user submits a calculation, the cell is open, so a PM Undo would ordinarily return
* the state to a condition that once again has the cell open.
*
* But now consider a user who wants to Undo twice. The first Undo retreats to a condition in
* which a cell is open. The user thinks a second Undo will change the PM document. But no!
* Because the cell is open, the CodeMirror plain text editor is active and the Undo is captured
* by CodeMirror. An Undo affects CodeMirror but not the outer document. It's very confusing!
* So the Undo should return to a condition in which the cell is closed. That's why I change
* the PM state.selection object _before_ I create the PM transaction. I don't want an Undo to
* open that cell and so I don't want the Undo to finish with the selection point inside the
* cell. Before creating the transaction, I move the selection point to just after the cell.
*/

const fetchRegEx = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′* *= *(?:fetch|import)\(/;
const importRegEx = /^[^=]+= *import/;
const fileErrorRegEx = /^Error while reading file. Status Code: \d*$/;
const textRegEx = /\\text{[^}]+}/;

const urlFromEntry = entry => {
  // Get the URL from the entry input string.
  const str = entry.replace(/^[^()]+\("?/, "");
  return str.replace(/"?\).*$/, "").trim()
};

// Helper function.
const processFetchedString = (entry, text, hurmetVars, decimalFormat) => {
  const attrs = Object.create(null);
  attrs.entry = entry;
  attrs.name = entry.replace(/=.+$/, "").trim();
  let str = parse(entry.replace(/\s*=\s*[$$£¥\u20A0-\u20CF]?(?:!{1,2}).*$/, ""), decimalFormat);
  const url = urlFromEntry(entry);
  if (/\.(?:csv|txt)$/.test(url)) {
    // Shorten the URL.
    const fileName = url.replace(/.+\//, "");
    const match = textRegEx.exec(str);
    str = str.slice(0, match.index) + "\\text{" + addTextEscapes(fileName) + "})";
  }
  attrs.tex = str;
  attrs.alt = entry;
  if (text === "File not found." || fileErrorRegEx.test(text)) {
    attrs.dtype = dt.ERROR;
    attrs.tex += ` = \\red{\\text{${text}}}`;
    attrs.alt = " = " + text;
    attrs.value = null;
    return attrs
  }
  const data = importRegEx.test(entry)
    ? scanModule(text, decimalFormat)               // import code
    : DataFrame.dataFrameFromCSV(text, hurmetVars);  // fetch data

  // Append the data to attrs
  attrs.value = data.value;
  attrs.dtype = data.dtype;
  attrs.unit = data.unit;
  attrs.isFetch = true;
  if (data.dtype === dt.MODULE && /^importedParameters *=/.test(entry)) {
    // Assign to multiple variables, not one namespace.
    let nameTex = "\\begin{matrix}";
    let i = 0;
    Object.entries(data.value).forEach(([key, value]) => {
      hurmetVars[key] =  value;
      nameTex += parse(value.name) + " & ";
      i += 1;
      if (i === 5) {
        nameTex = nameTex.slice(0, -1) + "\\\\ ";
        i = 0;
      }
    });
    nameTex = nameTex.slice(0, (i === 0 ? -2 : -1)) + "\\end{matrix}";
    attrs.tex = attrs.tex.replace("\\mathrm{importedParameters}", nameTex);
  }
  return attrs
};

const workAsync = (
  view,
  calcNodeSchema,
  isCalcAll,
  nodeAttrs,
  curPos,
  hurmetVars,
  urls,
  fetchPositions
) => {

  // Here we fetch the remote data.
  const doc = view.state.doc;
  const inDraftMode = doc.attrs.inDraftMode;
  const decimalFormat = doc.attrs.decimalFormat;

  Promise.all(
    urls.map(url => fetch(url, {
      method: "GET",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      mode: "cors"
    }))
  ).then(fetchResponses => {
    // The fetch promises have resolved. Now we extract their text.
    return Promise.all(fetchResponses.map(r => {
      if (r.status !== 200 && r.status !== 0) {
        return r.status === 404
          ? 'File not found.'
          : 'Error while reading file. Status Code: ' + r.status
      }
      return r.text()
    }))
  }).then((texts) => {
    // At this point, we have the text of each Hurmet fetch and import.
    // Create a ProseMirror transacation.
    // Each node update below will be one step in the transaction.
    const state = view.state;
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1));
    }
    const tr = state.tr;

    // Load in the data from the fetch statements
    for (let i = 0; i < texts.length; i++) {
      const pos = fetchPositions[i];
      const entry = isCalcAll
        ? doc.nodeAt(pos).attrs.entry
        : nodeAttrs.entry;
      const attrs = processFetchedString(entry, texts[i], hurmetVars, decimalFormat);
      attrs.inDraftMode = inDraftMode;
      tr.replaceWith(pos, pos + 1, calcNodeSchema.createAndFill(attrs));
      if (attrs.name) {
        insertOneHurmetVar(hurmetVars, attrs, decimalFormat);
      }
    }
    // There. Fetches are done and are loaded into the document.
    // Now proceed to the rest of the work.
    try {
      proceedAfterFetch(view, calcNodeSchema, isCalcAll, nodeAttrs,
                        curPos, hurmetVars, tr);
    } catch (err) {
      console.log(err); // eslint-disable-line no-console
      const pos = nodeAttrs.template.indexOf(nodeAttrs.resultdisplay);
      nodeAttrs.tex = nodeAttrs.template.slice(0, pos) + "\\text{" + err + "}";
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs));
      tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)));
      view.dispatch(tr);
      view.focus();
    }
  });
};

const proceedAfterFetch = (
  view,
  calcNodeSchema,
  isCalcAll,
  nodeAttrs,
  curPos,
  hurmetVars,
  tr
) => {
  // This function happens either
  //   1. After remote, fetched data has been processed, or
  //   2. After we know that no fetch statements need be processed.
  const doc = view.state.doc;
  const decimalFormat = doc.attrs.decimalFormat;

  if (!isCalcAll && (nodeAttrs.name || nodeAttrs.rpn ||
    (nodeAttrs.dtype && nodeAttrs.dtype === dt.DRAWING))) {
    // Load hurmetVars with values from earlier in the document.
    doc.nodesBetween(0, curPos, function(node) {
      if (node.type.name === "calculation") {
        const attrs = node.attrs;
        if (attrs.name) {
          if (attrs.name === "importedParameters") {
            Object.entries(attrs.value).forEach(([key, value]) => {
              hurmetVars[key] =  value;
            });
          } else {
            insertOneHurmetVar(hurmetVars, attrs, decimalFormat);
          }
        }
      }
    });

    // Hoist any user-defined functions located below the selection.
    doc.nodesBetween(curPos + 1, doc.content.size, function(node, pos) {
      if (node.type.name === "calculation" && node.attrs.dtype === dt.MODULE) {
        insertOneHurmetVar(hurmetVars, node.attrs, decimalFormat);
      }
    });

    // Calculate the current node.
    if (!fetchRegEx.test(nodeAttrs.entry)) {
      // This is the typical calculation statement. We'll evalutate it.
      let attrs = clone(nodeAttrs); // prepareStatement was already run in mathprompt.js.
      // The mathPrompt dialog box did not have accesss to hurmetVars, so it
      // did not do unit conversions on the result template. Do that first.
      improveQuantities(attrs, hurmetVars);
      // Now proceed to do the calculation of the cell.
      if (attrs.rpn || (nodeAttrs.dtype && nodeAttrs.dtype === dt.DRAWING)) {
        attrs = attrs.dtype && attrs.dtype === dt.DRAWING
          ? evaluateDrawing(attrs, hurmetVars, decimalFormat)
          : evaluate(attrs, hurmetVars, decimalFormat);
      }
      if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs, decimalFormat); }
      attrs.displayMode = nodeAttrs.displayMode;
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(attrs));
    }
  }

  // Finally, update calculations after startPos.
  const startPos = isCalcAll ? 0 : (curPos + 1);
  doc.nodesBetween(startPos, doc.content.size, function(node, pos) {
    if (node.type.name === "calculation") {
      const mustCalc = isCalcAll ? !fetchRegEx.test(node.attrs.entry) : !node.attrs.isFetch;
      if (mustCalc) {
        const entry = node.attrs.entry;
        let attrs = isCalcAll
          ? prepareStatement(entry, decimalFormat)
          : clone(node.attrs);
        attrs.displayMode = node.attrs.displayMode;
        const mustRedraw = attrs.dtype && attrs.dtype === dt.DRAWING &&
          (attrs.rpn || (attrs.value.parameters.length > 0 || isCalcAll));
        if (isCalcAll || attrs.rpn || mustRedraw || (attrs.name && !(hurmetVars[attrs.name] &&
          hurmetVars[attrs.name].isFetch))) {
          if (isCalcAll) { improveQuantities(attrs, hurmetVars); }
          if (attrs.rpn || mustRedraw) {
            attrs = attrs.rpn // attrs.dtype && attrs.dtype === dt.DRAWING
              ? evaluate(attrs, hurmetVars, decimalFormat)
              : evaluateDrawing(attrs, hurmetVars, decimalFormat);
          }
          if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs, decimalFormat); }
          if (isCalcAll || attrs.rpn || mustRedraw) {
            tr.replaceWith(pos, pos + 1, calcNodeSchema.createAndFill(attrs));
          }
        }
      } else if (node.attrs.name && !(isCalcAll && node.attrs.isFetch)) {
        if (node.attrs.name) {
          if (node.attrs.name === "importedParameters") {
            Object.entries(node.attrs.value).forEach(([key, value]) => {
              hurmetVars[key] =  value;
            });
          } else {
            insertOneHurmetVar(hurmetVars, node.attrs, decimalFormat);
          }
        }
      }
    }
  });

  // All the steps are now loaded into the transaction.
  // Dispatch the transaction to ProseMirror, which will re-render the document.
  if (!isCalcAll) {
    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)));
  }
  view.dispatch(tr);
  view.focus();
};

function updateCalculations(
  view,
  calcNodeSchema,
  isCalcAll = false,
  nodeAttrs,
  curPos
) {
  const doc = view.state.doc;

  if (!(isCalcAll || nodeAttrs.name || nodeAttrs.rpn ||
      (nodeAttrs.dtype && nodeAttrs.dtype === dt.DRAWING))) {
    // No calculation is required. Just render the node and get out.
    const state = view.state;
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1));
    }
    const tr = state.tr;
    try {
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs));
    } catch (err) {
      // nada
    } finally {
      view.dispatch(tr);
      view.focus();
    }
    return
  }

  // Create an object in which we'll hold variable values.
  const hurmetVars = Object.create(null);
  hurmetVars.format = { value: "h15" }; // default rounding format

  // Get an array of all the URLs called by fetch statements.
  const urls = [];
  const fetchPositions = [];
  if (!isCalcAll) {
    // The author has submitted a single calculation cell.
    const entry = nodeAttrs.entry;
    if (fetchRegEx.test(entry)) {
      urls.push(urlFromEntry(entry));
      fetchPositions.push(curPos);
    }
  } else {
    // We're updating the entire document.
    doc.nodesBetween(0, doc.content.size, function(node, pos) {
      if (node.type.name === "calculation" && !node.attrs.value) {
        const entry = node.attrs.entry;
        if (fetchRegEx.test(entry)) {
          urls.push(urlFromEntry(entry));
          fetchPositions.push(pos);
        } else if (/^function /.test(entry)) {
          node.attrs = prepareStatement(entry, doc.attrs.decimalFormat);
          insertOneHurmetVar(hurmetVars, node.attrs, doc.attrs.decimalFormat);
        }
      } else if (node.attrs.isFetch || (node.attrs.dtype && node.attrs.dtype === dt.MODULE)) {
        insertOneHurmetVar(hurmetVars, node.attrs, doc.attrs.decimalFormat);
      }
    });
  }

  if (urls.length > 0) {
    // We have to fetch some remote data. Asynchronous work ahead.
    workAsync(view, calcNodeSchema, isCalcAll, nodeAttrs, curPos,
              hurmetVars, urls, fetchPositions);
  } else {
    // Skip the fetches and go directly to work that we can do synchronously.
    const state = view.state;
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1));
    }
    const tr = state.tr;
    try {
      proceedAfterFetch(view, calcNodeSchema, isCalcAll, nodeAttrs, curPos, hurmetVars, tr);
    } catch (err) {
      console.log(err); // eslint-disable-line no-console
      const pos = nodeAttrs.template.indexOf(nodeAttrs.resultdisplay);
      nodeAttrs.tex = nodeAttrs.template.slice(0, pos) + "\\text{" + err + "}";
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs));
      tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)));
      view.dispatch(tr);
      view.focus();
    }
  }
}

// This function is not used by the Hurmet.app page.
// It is provided for use by unit tests.
// If you are looking for the app's main calculation module, try evaluate.js.
const calculate = (
  entry,
  vars = {},
  inDraftMode = false,
  decimalFormat = "1,000,000."
) => {
  let attrs = prepareStatement(entry, decimalFormat);
  improveQuantities(attrs, vars);
  if (attrs.rpn) {
    attrs = evaluate(clone(attrs), vars, decimalFormat);
  } else if (attrs.dtype && attrs.dtype === dt.DRAWING) {
    attrs = evaluateDrawing(attrs, vars, decimalFormat);
  }
  if (attrs.name) {
    insertOneHurmetVar(vars, attrs);
  }
  return attrs.dtype && attrs.dtype === dt.DRAWING
   ? attrs
   : inDraftMode
   ? attrs.alt
   : attrs.tex
};

/**
 * This is the ParseError class, which is the main error thrown by Temml
 * functions when something has gone wrong. This is used to distinguish internal
 * errors from errors in the expression that the user provided.
 *
 * If possible, a caller should provide a Token or ParseNode with information
 * about where in the source string the problem occurred.
 */
class ParseError {
  constructor(
    message, // The error message
    token // An object providing position information
  ) {
    let error = " " + message;
    let start;

    const loc = token && token.loc;
    if (loc && loc.start <= loc.end) {
      // If we have the input and a position, make the error a bit fancier

      // Get the input
      const input = loc.lexer.input;

      // Prepend some information
      start = loc.start;
      const end = loc.end;
      if (start === input.length) {
        error += " at end of input: ";
      } else {
        error += " at position " + (start + 1) + ": ";
      }

      // Underline token in question using combining underscores
      const underlined = input.slice(start, end).replace(/[^]/g, "$&\u0332");

      // Extract some context from the input and add it to the error
      let left;
      if (start > 15) {
        left = "…" + input.slice(start - 15, start);
      } else {
        left = input.slice(0, start);
      }
      let right;
      if (end + 15 < input.length) {
        right = input.slice(end, end + 15) + "…";
      } else {
        right = input.slice(end);
      }
      error += left + underlined + right;
    }

    // Some hackery to make ParseError a prototype of Error
    // See http://stackoverflow.com/a/8460753
    const self = new Error(error);
    self.name = "ParseError";
    self.__proto__ = ParseError.prototype;
    self.position = start;
    return self;
  }
}

ParseError.prototype.__proto__ = Error.prototype;

//
/**
 * This file contains a list of utility functions which are useful in other
 * files.
 */

/**
 * Provide a default value if a setting is undefined
 */
const deflt = function(setting, defaultIfUndefined) {
  return setting === undefined ? defaultIfUndefined : setting;
};

// hyphenate and escape adapted from Facebook's React under Apache 2 license

const uppercase = /([A-Z])/g;
const hyphenate = function(str) {
  return str.replace(uppercase, "-$1").toLowerCase();
};

const ESCAPE_LOOKUP = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  '"': "&quot;",
  "'": "&#x27;"
};

const ESCAPE_REGEX = /[&><"']/g;

/**
 * Escapes text to prevent scripting attacks.
 */
function escape(text) {
  return String(text).replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

/**
 * Sometimes we want to pull out the innermost element of a group. In most
 * cases, this will just be the group itself, but when ordgroups and colors have
 * a single element, we want to pull that out.
 */
const getBaseElem = function(group) {
  if (group.type === "ordgroup") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "color") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "font") {
    return getBaseElem(group.body);
  } else {
    return group;
  }
};

/**
 * TeXbook algorithms often reference "character boxes", which are simply groups
 * with a single character in them. To decide if something is a character box,
 * we find its innermost group, and see if it is a single character.
 */
const isCharacterBox = function(group) {
  const baseElem = getBaseElem(group);

  // These are all the types of groups which hold single characters
  return baseElem.type === "mathord" || baseElem.type === "textord" || baseElem.type === "atom"
};

const assert = function(value) {
  if (!value) {
    throw new Error("Expected non-null, but got " + String(value));
  }
  return value;
};

/**
 * Return the protocol of a URL, or "_relative" if the URL does not specify a
 * protocol (and thus is relative).
 */
const protocolFromUrl = function(url) {
  const protocol = /^\s*([^\\/#]*?)(?::|&#0*58|&#x0*3a)/i.exec(url);
  return protocol != null ? protocol[1] : "_relative";
};

/**
 * Round `n` to 4 decimal places, or to the nearest 1/10,000th em. The TeXbook
 * gives an acceptable rounding error of 100sp (which would be the nearest
 * 1/6551.6em with our ptPerEm = 10):
 * http://www.ctex.org/documents/shredder/src/texbook.pdf#page=69
 */
const round = function(n) {
  return +n.toFixed(4);
};

var utils = {
  deflt,
  escape,
  hyphenate,
  getBaseElem,
  isCharacterBox,
  protocolFromUrl,
  round
};

/**
 * This is a module for storing settings passed into Temml. It correctly handles
 * default settings.
 */

/**
 * The main Settings object
 */
class Settings {
  constructor(options) {
    // allow null options
    options = options || {};
    this.displayMode = utils.deflt(options.displayMode, false);    // boolean
    this.annotate = utils.deflt(options.annotate, false);           // boolean
    this.leqno = utils.deflt(options.leqno, false);                // boolean
    this.errorColor = utils.deflt(options.errorColor, "#b22222");  // string
    this.macros = options.macros || {};
    this.wrap = utils.deflt(options.wrap, "tex");                    // "tex" | "="
    this.xml = utils.deflt(options.xml, false);                     // boolean
    this.colorIsTextColor = utils.deflt(options.colorIsTextColor, false);  // booelean
    this.strict = utils.deflt(options.strict, false);    // boolean
    this.trust = utils.deflt(options.trust, false);  // trust context. See html.js.
    this.maxSize = (options.maxSize === undefined
      ? [Infinity, Infinity]
      : Array.isArray(options.maxSize)
      ? options.maxSize
      : [Infinity, Infinity]
    );
    this.maxExpand = Math.max(0, utils.deflt(options.maxExpand, 1000)); // number
  }

  /**
   * Check whether to test potentially dangerous input, and return
   * `true` (trusted) or `false` (untrusted).  The sole argument `context`
   * should be an object with `command` field specifying the relevant LaTeX
   * command (as a string starting with `\`), and any other arguments, etc.
   * If `context` has a `url` field, a `protocol` field will automatically
   * get added by this function (changing the specified object).
   */
  isTrusted(context) {
    if (context.url && !context.protocol) {
      context.protocol = utils.protocolFromUrl(context.url);
    }
    const trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
    return Boolean(trust);
  }
}

/**
 * All registered functions.
 * `functions.js` just exports this same dictionary again and makes it public.
 * `Parser.js` requires this dictionary.
 */
const _functions = {};

/**
 * All MathML builders. Should be only used in the `define*` and the `build*ML`
 * functions.
 */
const _mathmlGroupBuilders = {};

function defineFunction({
  type,
  names,
  props,
  handler,
  mathmlBuilder
}) {
  // Set default values of functions
  const data = {
    type,
    numArgs: props.numArgs,
    argTypes: props.argTypes,
    allowedInArgument: !!props.allowedInArgument,
    allowedInText: !!props.allowedInText,
    allowedInMath: props.allowedInMath === undefined ? true : props.allowedInMath,
    numOptionalArgs: props.numOptionalArgs || 0,
    infix: !!props.infix,
    primitive: !!props.primitive,
    handler: handler
  };
  for (let i = 0; i < names.length; ++i) {
    _functions[names[i]] = data;
  }
  if (type) {
    if (mathmlBuilder) {
      _mathmlGroupBuilders[type] = mathmlBuilder;
    }
  }
}

/**
 * Use this to register only the MathML builder for a function(e.g.
 * if the function's ParseNode is generated in Parser.js rather than via a
 * stand-alone handler provided to `defineFunction`).
 */
function defineFunctionBuilders({ type, mathmlBuilder }) {
  defineFunction({
    type,
    names: [],
    props: { numArgs: 0 },
    handler() {
      throw new Error("Should never be called.")
    },
    mathmlBuilder
  });
}

const normalizeArgument = function(arg) {
  return arg.type === "ordgroup" && arg.body.length === 1 ? arg.body[0] : arg
};

// Since the corresponding buildMathML function expects a
// list of elements, we normalize for different kinds of arguments
const ordargument = function(arg) {
  return arg.type === "ordgroup" ? arg.body : [arg]
};

/**
 * This node represents a document fragment, which contains elements, but when
 * placed into the DOM doesn't have any representation itself. It only contains
 * children and doesn't have any DOM node properties.
 */
class DocumentFragment {
  constructor(children) {
    this.children = children;
    this.classes = [];
    this.style = {};
  }

  hasClass(className) {
    return this.classes.includes(className);
  }

  /** Convert the fragment into a node. */
  toNode() {
    const frag = document.createDocumentFragment();

    for (let i = 0; i < this.children.length; i++) {
      frag.appendChild(this.children[i].toNode());
    }

    return frag;
  }

  /** Convert the fragment into HTML markup. */
  toMarkup() {
    let markup = "";

    // Simply concatenate the markup for the children together.
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }

    return markup;
  }

  /**
   * Converts the math node into a string, similar to innerText. Applies to
   * MathDomNode's only.
   */
  toText() {
    // To avoid this, we would subclass documentFragment separately for
    // MathML, but polyfills for subclassing is expensive per PR 1469.
    const toText = (child) => child.toText();
    return this.children.map(toText).join("");
  }
}

/**
 * These objects store the data about the DOM nodes we create, as well as some
 * extra data. They can then be transformed into real DOM nodes with the
 * `toNode` function or HTML markup using `toMarkup`. They are useful for both
 * storing extra properties on the nodes, as well as providing a way to easily
 * work with the DOM.
 *
 * Similar functions for working with MathML nodes exist in mathMLTree.js.
 *
 */

/**
 * Create an HTML className based on a list of classes. In addition to joining
 * with spaces, we also remove empty classes.
 */
const createClass = function(classes) {
  return classes.filter((cls) => cls).join(" ");
};

const initNode = function(classes, style) {
  this.classes = classes || [];
  this.attributes = {};
  this.style = style || {};
};

/**
 * Convert into an HTML node
 */
const toNode = function(tagName) {
  const node = document.createElement(tagName);

  // Apply the class
  node.className = createClass(this.classes);

  // Apply inline styles
  for (const style in this.style) {
    if (Object.prototype.hasOwnProperty.call(this.style, style )) {
      node.style[style] = this.style[style];
    }
  }

  // Apply attributes
  for (const attr in this.attributes) {
    if (Object.prototype.hasOwnProperty.call(this.attributes, attr )) {
      node.setAttribute(attr, this.attributes[attr]);
    }
  }

  // Append the children, also as HTML nodes
  for (let i = 0; i < this.children.length; i++) {
    node.appendChild(this.children[i].toNode());
  }

  return node;
};

/**
 * Convert into an HTML markup string
 */
const toMarkup = function(tagName) {
  let markup = `<${tagName}`;

  // Add the class
  if (this.classes.length) {
    markup += ` class="${utils.escape(createClass(this.classes))}"`;
  }

  let styles = "";

  // Add the styles, after hyphenation
  for (const style in this.style) {
    if (Object.prototype.hasOwnProperty.call(this.style, style )) {
      styles += `${utils.hyphenate(style)}:${this.style[style]};`;
    }
  }

  if (styles) {
    markup += ` style="${styles}"`;
  }

  // Add the attributes
  for (const attr in this.attributes) {
    if (Object.prototype.hasOwnProperty.call(this.attributes, attr )) {
      markup += ` ${attr}="${utils.escape(this.attributes[attr])}"`;
    }
  }

  markup += ">";

  // Add the markup of the children, also as markup
  for (let i = 0; i < this.children.length; i++) {
    markup += this.children[i].toMarkup();
  }

  markup += `</${tagName}>`;

  return markup;
};

/**
 * This node represents a span node, with a className, a list of children, and
 * an inline style.
 *
 */
class Span {
  constructor(classes, children, style) {
    initNode.call(this, classes, style);
    this.children = children || [];
  }

  setAttribute(attribute, value) {
    this.attributes[attribute] = value;
  }

  toNode() {
    return toNode.call(this, "span");
  }

  toMarkup() {
    return toMarkup.call(this, "span");
  }
}

class TextNode$1 {
  constructor(text) {
    this.text = text;
  }
  toNode() {
    return document.createTextNode(this.text);
  }
  toMarkup() {
    return utils.escape(this.text);
  }
}

/**
 * This node represents an image embed (<img>) element.
 */
class Img {
  constructor(src, alt, style) {
    this.alt = alt;
    this.src = src;
    this.classes = ["mord"];
    this.style = style;
  }

  hasClass(className) {
    return this.classes.includes(className);
  }

  toNode() {
    const node = document.createElement("img");
    node.src = this.src;
    node.alt = this.alt;
    node.className = "mord";

    // Apply inline styles
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style )) {
        node.style[style] = this.style[style];
      }
    }

    return node;
  }

  toMarkup() {
    let markup = `<img src='${this.src}' alt='${this.alt}'`;

    // Add the styles, after hyphenation
    let styles = "";
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style )) {
        styles += `${utils.hyphenate(style)}:${this.style[style]};`;
      }
    }
    if (styles) {
      markup += ` style="${utils.escape(styles)}"`;
    }

    markup += "/>";
    return markup;
  }
}

//

function newDocumentFragment(children) {
  return new DocumentFragment(children);
}

/**
 * This node represents a general purpose MathML node of any type,
 * for example, `"mo"` or `"mspace"`, corresponding to `<mo>` and
 * `<mspace>` tags).
 */
class MathNode {
  constructor(type, children, classes, style) {
    this.type = type;
    this.attributes = {};
    this.children = children || [];
    this.classes = classes || [];
    this.style = style || {};   // Used for <mstyle> elements
  }

  /**
   * Sets an attribute on a MathML node. MathML depends on attributes to convey a
   * semantic content, so this is used heavily.
   */
  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  /**
   * Gets an attribute on a MathML node.
   */
  getAttribute(name) {
    return this.attributes[name];
  }

  /**
   * Converts the math node into a MathML-namespaced DOM element.
   */
  toNode() {
    const node = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);

    for (const attr in this.attributes) {
      if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
        node.setAttribute(attr, this.attributes[attr]);
      }
    }

    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }

    // Apply inline styles
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style )) {
        node.style[style] = this.style[style];
      }
    }

    for (let i = 0; i < this.children.length; i++) {
      node.appendChild(this.children[i].toNode());
    }

    return node;
  }

  /**
   * Converts the math node into an HTML markup string.
   */
  toMarkup() {
    let markup = "<" + this.type;

    // Add the attributes
    for (const attr in this.attributes) {
      if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
        markup += " " + attr + '="';
        markup += utils.escape(this.attributes[attr]);
        markup += '"';
      }
    }

    if (this.classes.length > 0) {
      markup += ` class="${utils.escape(createClass(this.classes))}"`;
    }

    let styles = "";

    // Add the styles, after hyphenation
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style )) {
        styles += `${utils.hyphenate(style)}:${this.style[style]};`;
      }
    }

    if (styles) {
      markup += ` style="${styles}"`;
    }

    markup += ">";

    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }

    markup += "</" + this.type + ">";

    return markup;
  }

  /**
   * Converts the math node into a string, similar to innerText, but escaped.
   */
  toText() {
    return this.children.map((child) => child.toText()).join("");
  }
}

/**
 * This node represents a piece of text.
 */
class TextNode {
  constructor(text) {
    this.text = text;
  }

  /**
   * Converts the text node into a DOM text node.
   */
  toNode() {
    return document.createTextNode(this.text);
  }

  /**
   * Converts the text node into escaped HTML markup
   * (representing the text itself).
   */
  toMarkup() {
    return utils.escape(this.toText());
  }

  /**
   * Converts the text node into a string
   * (representing the text itself).
   */
  toText() {
    return this.text;
  }
}

// Do not make an <mrow> the only child of a <mstyle>.
// An <mstyle> acts as its own implicit <mrow>.
const wrapWithMstyle = expression => {
  let node;
  if (expression.length === 1 && expression[0].type === "mrow") {
    node = expression.pop();
    node.type = "mstyle";
  } else {
    node = new MathNode("mstyle", expression);
  }
  return node
};

var mathMLTree = {
  MathNode,
  TextNode,
  newDocumentFragment
};

/**
 * This file provides support for building horizontal stretchy elements.
 */

const stretchyCodePoint = {
  widehat: "^",
  widecheck: "ˇ",
  widetilde: "~",
  wideparen: "⏜", // \u23dc
  utilde: "~",
  overleftarrow: "\u2190",
  underleftarrow: "\u2190",
  xleftarrow: "\u2190",
  overrightarrow: "\u2192",
  underrightarrow: "\u2192",
  xrightarrow: "\u2192",
  underbrace: "\u23df",
  overbrace: "\u23de",
  overgroup: "\u23e0",
  overparen: "⏜",
  undergroup: "\u23e1",
  underparen: "\u23dd",
  overleftrightarrow: "\u2194",
  underleftrightarrow: "\u2194",
  xleftrightarrow: "\u2194",
  Overrightarrow: "\u21d2",
  xRightarrow: "\u21d2",
  overleftharpoon: "\u21bc",
  xleftharpoonup: "\u21bc",
  overrightharpoon: "\u21c0",
  xrightharpoonup: "\u21c0",
  xLeftarrow: "\u21d0",
  xLeftrightarrow: "\u21d4",
  xhookleftarrow: "\u21a9",
  xhookrightarrow: "\u21aa",
  xmapsto: "\u21a6",
  xrightharpoondown: "\u21c1",
  xleftharpoondown: "\u21bd",
  xtwoheadleftarrow: "\u219e",
  xtwoheadrightarrow: "\u21a0",
  xlongequal: "=",
  xrightleftarrows: "\u21c4",
  yields: "\u2192",
  yieldsLeft: "\u2190",
  mesomerism: "\u2194",
  longrightharpoonup: "\u21c0",
  longleftharpoondown: "\u21bd",
  eqrightharpoonup: "\u21c0",
  eqleftharpoondown: "\u21bd",
  "\\cdrightarrow": "\u2192",
  "\\cdleftarrow": "\u2190",
  "\\cdlongequal": "="
};

const mathMLnode = function(label) {
  const child = new mathMLTree.TextNode(stretchyCodePoint[label.slice(1)]);
  const node = new mathMLTree.MathNode("mo", [child]);
  node.setAttribute("stretchy", "true");
  return node
};

var stretchy = {
  mathMLnode
};

/**
 * This file holds a list of all no-argument functions and single-character
 * symbols (like 'a' or ';').
 *
 * For each of the symbols, there are two properties they can have:
 * - group (required): the ParseNode group type the symbol should have (i.e.
     "textord", "mathord", etc).
 * - replace: the character that this symbol or function should be
 *   replaced with (i.e. "\phi" has a replace value of "\u03d5", the phi
 *   character in the main font).
 *
 * The outermost map in the table indicates what mode the symbols should be
 * accepted in (e.g. "math" or "text").
 */

// Some of these have a "-token" suffix since these are also used as `ParseNode`
// types for raw text tokens, and we want to avoid conflicts with higher-level
// `ParseNode` types. These `ParseNode`s are constructed within `Parser` by
// looking up the `symbols` map.
const ATOMS = {
  bin: 1,
  close: 1,
  inner: 1,
  open: 1,
  punct: 1,
  rel: 1
};
const NON_ATOMS = {
  "accent-token": 1,
  mathord: 1,
  "op-token": 1,
  spacing: 1,
  textord: 1
};

const symbols = {
  math: {},
  text: {}
};

/** `acceptUnicodeChar = true` is only applicable if `replace` is set. */
function defineSymbol(mode, group, replace, name, acceptUnicodeChar) {
  symbols[mode][name] = { group, replace };

  if (acceptUnicodeChar && replace) {
    symbols[mode][replace] = symbols[mode][name];
  }
}

// Some abbreviations for commonly used strings.
// This helps minify the code, and also spotting typos using jshint.

// modes:
const math = "math";
const text = "text";

// groups:
const accent = "accent-token";
const bin = "bin";
const close = "close";
const inner = "inner";
const mathord = "mathord";
const op = "op-token";
const open = "open";
const punct = "punct";
const rel = "rel";
const spacing = "spacing";
const textord = "textord";

// Now comes the symbol table

// Relation Symbols
defineSymbol(math, rel, "\u2261", "\\equiv", true);
defineSymbol(math, rel, "\u227a", "\\prec", true);
defineSymbol(math, rel, "\u227b", "\\succ", true);
defineSymbol(math, rel, "\u223c", "\\sim", true);
defineSymbol(math, rel, "\u27c2", "\\perp", true);
defineSymbol(math, rel, "\u2aaf", "\\preceq", true);
defineSymbol(math, rel, "\u2ab0", "\\succeq", true);
defineSymbol(math, rel, "\u2243", "\\simeq", true);
defineSymbol(math, rel, "\u224c", "\\backcong", true);
defineSymbol(math, rel, "|", "\\mid", true);
defineSymbol(math, rel, "\u226a", "\\ll", true);
defineSymbol(math, rel, "\u226b", "\\gg", true);
defineSymbol(math, rel, "\u224d", "\\asymp", true);
defineSymbol(math, rel, "\u2225", "\\parallel");
defineSymbol(math, rel, "\u2323", "\\smile", true);
defineSymbol(math, rel, "\u2291", "\\sqsubseteq", true);
defineSymbol(math, rel, "\u2292", "\\sqsupseteq", true);
defineSymbol(math, rel, "\u2250", "\\doteq", true);
defineSymbol(math, rel, "\u2322", "\\frown", true);
defineSymbol(math, rel, "\u220b", "\\ni", true);
defineSymbol(math, rel, "\u220c", "\\notni", true);
defineSymbol(math, rel, "\u221d", "\\propto", true);
defineSymbol(math, rel, "\u22a2", "\\vdash", true);
defineSymbol(math, rel, "\u22a3", "\\dashv", true);
defineSymbol(math, rel, "\u220b", "\\owns");
defineSymbol(math, rel, "\u2258", "\\arceq", true);
defineSymbol(math, rel, "\u2259", "\\wedgeq", true);
defineSymbol(math, rel, "\u225a", "\\veeeq", true);
defineSymbol(math, rel, "\u225b", "\\stareq", true);
defineSymbol(math, rel, "\u225d", "\\eqdef", true);
defineSymbol(math, rel, "\u225e", "\\measeq", true);
defineSymbol(math, rel, "\u225f", "\\questeq", true);
defineSymbol(math, rel, "\u2260", "\\ne", true);
defineSymbol(math, rel, "\u2260", "\\neq");
// mathtools.sty
defineSymbol(math, rel, "\u2237", "\\dblcolon", true);
defineSymbol(math, rel, "\u2254", "\\coloneqq", true);
defineSymbol(math, rel, "\u2255", "\\eqqcolon", true);
defineSymbol(math, rel, "\u2239", "\\eqcolon", true);
defineSymbol(math, rel, "\u2A74", "\\Coloneqq", true);

// Punctuation
defineSymbol(math, punct, "\u002e", "\\ldotp");
defineSymbol(math, punct, "\u00b7", "\\cdotp");

// Misc Symbols
defineSymbol(math, textord, "\u0023", "\\#");
defineSymbol(text, textord, "\u0023", "\\#");
defineSymbol(math, textord, "\u0026", "\\&");
defineSymbol(text, textord, "\u0026", "\\&");
defineSymbol(math, textord, "\u2135", "\\aleph", true);
defineSymbol(math, textord, "\u2200", "\\forall", true);
defineSymbol(math, textord, "\u210f", "\\hbar", true);
defineSymbol(math, textord, "\u2203", "\\exists", true);
defineSymbol(math, textord, "\u2207", "\\nabla", true);
defineSymbol(math, textord, "\u266d", "\\flat", true);
defineSymbol(math, textord, "\u2113", "\\ell", true);
defineSymbol(math, textord, "\u266e", "\\natural", true);
defineSymbol(math, textord, "Å", "\\AA", true);
defineSymbol(text, textord, "Å", "\\AA", true);
defineSymbol(math, textord, "\u2663", "\\clubsuit", true);
defineSymbol(math, textord, "\u2667", "\\varclubsuit", true);
defineSymbol(math, textord, "\u2118", "\\wp", true);
defineSymbol(math, textord, "\u266f", "\\sharp", true);
defineSymbol(math, textord, "\u2662", "\\diamondsuit", true);
defineSymbol(math, textord, "\u2666", "\\vardiamondsuit", true);
defineSymbol(math, textord, "\u211c", "\\Re", true);
defineSymbol(math, textord, "\u2661", "\\heartsuit", true);
defineSymbol(math, textord, "\u2665", "\\varheartsuit", true);
defineSymbol(math, textord, "\u2111", "\\Im", true);
defineSymbol(math, textord, "\u2660", "\\spadesuit", true);
defineSymbol(math, textord, "\u2664", "\\varspadesuit", true);
defineSymbol(math, textord, "\u2640", "\\female", true);
defineSymbol(math, textord, "\u2642", "\\male", true);
defineSymbol(math, textord, "\u00a7", "\\S", true);
defineSymbol(text, textord, "\u00a7", "\\S");
defineSymbol(math, textord, "\u00b6", "\\P", true);
defineSymbol(text, textord, "\u00b6", "\\P");
defineSymbol(text, textord, "\u263a", "\\smiley", true);
defineSymbol(math, textord, "\u263a", "\\smiley", true);

// Math and Text
defineSymbol(math, textord, "\u2020", "\\dag");
defineSymbol(text, textord, "\u2020", "\\dag");
defineSymbol(text, textord, "\u2020", "\\textdagger");
defineSymbol(math, textord, "\u2021", "\\ddag");
defineSymbol(text, textord, "\u2021", "\\ddag");
defineSymbol(text, textord, "\u2021", "\\textdaggerdbl");

// Large Delimiters
defineSymbol(math, close, "\u23b1", "\\rmoustache", true);
defineSymbol(math, open, "\u23b0", "\\lmoustache", true);
defineSymbol(math, close, "\u27ef", "\\rgroup", true);
defineSymbol(math, open, "\u27ee", "\\lgroup", true);

// Binary Operators
defineSymbol(math, bin, "\u2213", "\\mp", true);
defineSymbol(math, bin, "\u2296", "\\ominus", true);
defineSymbol(math, bin, "\u228e", "\\uplus", true);
defineSymbol(math, bin, "\u2293", "\\sqcap", true);
defineSymbol(math, bin, "\u2217", "\\ast");
defineSymbol(math, bin, "\u2294", "\\sqcup", true);
defineSymbol(math, bin, "\u25ef", "\\bigcirc", true);
defineSymbol(math, bin, "\u2219", "\\bullet", true);
defineSymbol(math, bin, "\u2021", "\\ddagger");
defineSymbol(math, bin, "\u2240", "\\wr", true);
defineSymbol(math, bin, "\u2a3f", "\\amalg");
defineSymbol(math, bin, "\u0026", "\\And"); // from amsmath

// Arrow Symbols
defineSymbol(math, rel, "\u27f5", "\\longleftarrow", true);
defineSymbol(math, rel, "\u21d0", "\\Leftarrow", true);
defineSymbol(math, rel, "\u27f8", "\\Longleftarrow", true);
defineSymbol(math, rel, "\u27f6", "\\longrightarrow", true);
defineSymbol(math, rel, "\u21d2", "\\Rightarrow", true);
defineSymbol(math, rel, "\u27f9", "\\Longrightarrow", true);
defineSymbol(math, rel, "\u2194", "\\leftrightarrow", true);
defineSymbol(math, rel, "\u27f7", "\\longleftrightarrow", true);
defineSymbol(math, rel, "\u21d4", "\\Leftrightarrow", true);
defineSymbol(math, rel, "\u27fa", "\\Longleftrightarrow", true);
defineSymbol(math, rel, "\u21a4", "\\mapsfrom", true);
defineSymbol(math, rel, "\u21a6", "\\mapsto", true);
defineSymbol(math, rel, "\u27fc", "\\longmapsto", true);
defineSymbol(math, rel, "\u2197", "\\nearrow", true);
defineSymbol(math, rel, "\u21a9", "\\hookleftarrow", true);
defineSymbol(math, rel, "\u21aa", "\\hookrightarrow", true);
defineSymbol(math, rel, "\u2198", "\\searrow", true);
defineSymbol(math, rel, "\u21bc", "\\leftharpoonup", true);
defineSymbol(math, rel, "\u21c0", "\\rightharpoonup", true);
defineSymbol(math, rel, "\u2199", "\\swarrow", true);
defineSymbol(math, rel, "\u21bd", "\\leftharpoondown", true);
defineSymbol(math, rel, "\u21c1", "\\rightharpoondown", true);
defineSymbol(math, rel, "\u2196", "\\nwarrow", true);
defineSymbol(math, rel, "\u21cc", "\\rightleftharpoons", true);
defineSymbol(math, mathord, "\u21af", "\\lightning", true);
defineSymbol(math, mathord, "\u2030", "\\permil", true);
defineSymbol(text, textord, "\u2030", "\\permil");

// AMS Negated Binary Relations
defineSymbol(math, rel, "\u226e", "\\nless", true);
// Symbol names preceeded by "@" each have a corresponding macro.
defineSymbol(math, rel, "\u2a87", "\\lneq", true);
defineSymbol(math, rel, "\u2268", "\\lneqq", true);
defineSymbol(math, rel, "\u2268\ufe00", "\\lvertneqq");
defineSymbol(math, rel, "\u22e6", "\\lnsim", true);
defineSymbol(math, rel, "\u2a89", "\\lnapprox", true);
defineSymbol(math, rel, "\u2280", "\\nprec", true);
// unicode-math maps \u22e0 to \npreccurlyeq. We'll use the AMS synonym.
defineSymbol(math, rel, "\u22e0", "\\npreceq", true);
defineSymbol(math, rel, "\u22e8", "\\precnsim", true);
defineSymbol(math, rel, "\u2ab9", "\\precnapprox", true);
defineSymbol(math, rel, "\u2241", "\\nsim", true);
defineSymbol(math, rel, "\u2224", "\\nmid", true);
defineSymbol(math, rel, "\u2224", "\\nshortmid");
defineSymbol(math, rel, "\u22ac", "\\nvdash", true);
defineSymbol(math, rel, "\u22ad", "\\nvDash", true);
defineSymbol(math, rel, "\u22ea", "\\ntriangleleft");
defineSymbol(math, rel, "\u22ec", "\\ntrianglelefteq", true);
defineSymbol(math, rel, "\u2284", "\\nsubset", true);
defineSymbol(math, rel, "\u2285", "\\nsupset", true);
defineSymbol(math, rel, "\u228a", "\\subsetneq", true);
defineSymbol(math, rel, "\u228a\ufe00", "\\varsubsetneq");
defineSymbol(math, rel, "\u2acb", "\\subsetneqq", true);
defineSymbol(math, rel, "\u2acb\ufe00", "\\varsubsetneqq");
defineSymbol(math, rel, "\u226f", "\\ngtr", true);
defineSymbol(math, rel, "\u2a88", "\\gneq", true);
defineSymbol(math, rel, "\u2269", "\\gneqq", true);
defineSymbol(math, rel, "\u2269\ufe00", "\\gvertneqq");
defineSymbol(math, rel, "\u22e7", "\\gnsim", true);
defineSymbol(math, rel, "\u2a8a", "\\gnapprox", true);
defineSymbol(math, rel, "\u2281", "\\nsucc", true);
// unicode-math maps \u22e1 to \nsucccurlyeq. We'll use the AMS synonym.
defineSymbol(math, rel, "\u22e1", "\\nsucceq", true);
defineSymbol(math, rel, "\u22e9", "\\succnsim", true);
defineSymbol(math, rel, "\u2aba", "\\succnapprox", true);
// unicode-math maps \u2246 to \simneqq. We'll use the AMS synonym.
defineSymbol(math, rel, "\u2246", "\\ncong", true);
defineSymbol(math, rel, "\u2226", "\\nparallel", true);
defineSymbol(math, rel, "\u2226", "\\nshortparallel");
defineSymbol(math, rel, "\u22af", "\\nVDash", true);
defineSymbol(math, rel, "\u22eb", "\\ntriangleright");
defineSymbol(math, rel, "\u22ed", "\\ntrianglerighteq", true);
defineSymbol(math, rel, "\u228b", "\\supsetneq", true);
defineSymbol(math, rel, "\u228b", "\\varsupsetneq");
defineSymbol(math, rel, "\u2acc", "\\supsetneqq", true);
defineSymbol(math, rel, "\u2acc\ufe00", "\\varsupsetneqq");
defineSymbol(math, rel, "\u22ae", "\\nVdash", true);
defineSymbol(math, rel, "\u2ab5", "\\precneqq", true);
defineSymbol(math, rel, "\u2ab6", "\\succneqq", true);
defineSymbol(math, bin, "\u22b4", "\\unlhd");
defineSymbol(math, bin, "\u22b5", "\\unrhd");

// AMS Negated Arrows
defineSymbol(math, rel, "\u219a", "\\nleftarrow", true);
defineSymbol(math, rel, "\u219b", "\\nrightarrow", true);
defineSymbol(math, rel, "\u21cd", "\\nLeftarrow", true);
defineSymbol(math, rel, "\u21cf", "\\nRightarrow", true);
defineSymbol(math, rel, "\u21ae", "\\nleftrightarrow", true);
defineSymbol(math, rel, "\u21ce", "\\nLeftrightarrow", true);

// AMS Misc
defineSymbol(math, rel, "\u25b3", "\\vartriangle");
defineSymbol(math, textord, "\u210f", "\\hslash");
defineSymbol(math, textord, "\u25bd", "\\triangledown");
defineSymbol(math, textord, "\u25ca", "\\lozenge");
defineSymbol(math, textord, "\u24c8", "\\circledS");
defineSymbol(math, textord, "\u00ae", "\\circledR", true);
defineSymbol(text, textord, "\u00ae", "\\circledR");
defineSymbol(text, textord, "\u00ae", "\\textregistered");
defineSymbol(math, textord, "\u2221", "\\measuredangle", true);
defineSymbol(math, textord, "\u2204", "\\nexists");
defineSymbol(math, textord, "\u2127", "\\mho");
defineSymbol(math, textord, "\u2132", "\\Finv", true);
defineSymbol(math, textord, "\u2141", "\\Game", true);
defineSymbol(math, textord, "\u2035", "\\backprime");
defineSymbol(math, textord, "\u25b2", "\\blacktriangle");
defineSymbol(math, textord, "\u25bc", "\\blacktriangledown");
defineSymbol(math, textord, "\u25a0", "\\blacksquare");
defineSymbol(math, textord, "\u29eb", "\\blacklozenge");
defineSymbol(math, textord, "\u2605", "\\bigstar");
defineSymbol(math, textord, "\u2222", "\\sphericalangle", true);
defineSymbol(math, textord, "\u2201", "\\complement", true);
// unicode-math maps U+F0 to \matheth. We map to AMS function \eth
defineSymbol(math, textord, "\u00f0", "\\eth", true);
defineSymbol(text, textord, "\u00f0", "\u00f0");
defineSymbol(math, textord, "\u2571", "\\diagup");
defineSymbol(math, textord, "\u2572", "\\diagdown");
defineSymbol(math, textord, "\u25a1", "\\square");
defineSymbol(math, textord, "\u25a1", "\\Box");
defineSymbol(math, textord, "\u25ca", "\\Diamond");
// unicode-math maps U+A5 to \mathyen. We map to AMS function \yen
defineSymbol(math, textord, "\u00a5", "\\yen", true);
defineSymbol(text, textord, "\u00a5", "\\yen", true);
defineSymbol(math, textord, "\u2713", "\\checkmark", true);
defineSymbol(text, textord, "\u2713", "\\checkmark");
defineSymbol(math, textord, "\u2717", "\\ballotx", true);
defineSymbol(text, textord, "\u2717", "\\ballotx");
defineSymbol(text, textord, "\u2022", "\\textbullet");

// AMS Hebrew
defineSymbol(math, textord, "\u2136", "\\beth", true);
defineSymbol(math, textord, "\u2138", "\\daleth", true);
defineSymbol(math, textord, "\u2137", "\\gimel", true);

// AMS Greek
defineSymbol(math, textord, "\u03dd", "\\digamma", true);
defineSymbol(math, textord, "\u03f0", "\\varkappa");

// AMS Delimiters
defineSymbol(math, open, "\u231C", "\\ulcorner", true);
defineSymbol(math, close, "\u231D", "\\urcorner", true);
defineSymbol(math, open, "\u231E", "\\llcorner", true);
defineSymbol(math, close, "\u231F", "\\lrcorner", true);

// AMS Binary Relations
defineSymbol(math, rel, "\u2266", "\\leqq", true);
defineSymbol(math, rel, "\u2a7d", "\\leqslant", true);
defineSymbol(math, rel, "\u2a95", "\\eqslantless", true);
defineSymbol(math, rel, "\u2272", "\\lesssim", true);
defineSymbol(math, rel, "\u2a85", "\\lessapprox", true);
defineSymbol(math, rel, "\u224a", "\\approxeq", true);
defineSymbol(math, bin, "\u22d6", "\\lessdot");
defineSymbol(math, rel, "\u22d8", "\\lll", true);
defineSymbol(math, rel, "\u2276", "\\lessgtr", true);
defineSymbol(math, rel, "\u22da", "\\lesseqgtr", true);
defineSymbol(math, rel, "\u2a8b", "\\lesseqqgtr", true);
defineSymbol(math, rel, "\u2251", "\\doteqdot");
defineSymbol(math, rel, "\u2253", "\\risingdotseq", true);
defineSymbol(math, rel, "\u2252", "\\fallingdotseq", true);
defineSymbol(math, rel, "\u223d", "\\backsim", true);
defineSymbol(math, rel, "\u22cd", "\\backsimeq", true);
defineSymbol(math, rel, "\u2ac5", "\\subseteqq", true);
defineSymbol(math, rel, "\u22d0", "\\Subset", true);
defineSymbol(math, rel, "\u228f", "\\sqsubset", true);
defineSymbol(math, rel, "\u227c", "\\preccurlyeq", true);
defineSymbol(math, rel, "\u22de", "\\curlyeqprec", true);
defineSymbol(math, rel, "\u227e", "\\precsim", true);
defineSymbol(math, rel, "\u2ab7", "\\precapprox", true);
defineSymbol(math, rel, "\u22b2", "\\vartriangleleft");
defineSymbol(math, rel, "\u22b4", "\\trianglelefteq");
defineSymbol(math, rel, "\u22a8", "\\vDash", true);
defineSymbol(math, rel, "\u22aa", "\\Vvdash", true);
defineSymbol(math, rel, "\u2323", "\\smallsmile");
defineSymbol(math, rel, "\u2322", "\\smallfrown");
defineSymbol(math, rel, "\u224f", "\\bumpeq", true);
defineSymbol(math, rel, "\u224e", "\\Bumpeq", true);
defineSymbol(math, rel, "\u2267", "\\geqq", true);
defineSymbol(math, rel, "\u2a7e", "\\geqslant", true);
defineSymbol(math, rel, "\u2a96", "\\eqslantgtr", true);
defineSymbol(math, rel, "\u2273", "\\gtrsim", true);
defineSymbol(math, rel, "\u2a86", "\\gtrapprox", true);
defineSymbol(math, bin, "\u22d7", "\\gtrdot");
defineSymbol(math, rel, "\u22d9", "\\ggg", true);
defineSymbol(math, rel, "\u2277", "\\gtrless", true);
defineSymbol(math, rel, "\u22db", "\\gtreqless", true);
defineSymbol(math, rel, "\u2a8c", "\\gtreqqless", true);
defineSymbol(math, rel, "\u2256", "\\eqcirc", true);
defineSymbol(math, rel, "\u2257", "\\circeq", true);
defineSymbol(math, rel, "\u225c", "\\triangleq", true);
defineSymbol(math, rel, "\u223c", "\\thicksim");
defineSymbol(math, rel, "\u2248", "\\thickapprox");
defineSymbol(math, rel, "\u2ac6", "\\supseteqq", true);
defineSymbol(math, rel, "\u22d1", "\\Supset", true);
defineSymbol(math, rel, "\u2290", "\\sqsupset", true);
defineSymbol(math, rel, "\u227d", "\\succcurlyeq", true);
defineSymbol(math, rel, "\u22df", "\\curlyeqsucc", true);
defineSymbol(math, rel, "\u227f", "\\succsim", true);
defineSymbol(math, rel, "\u2ab8", "\\succapprox", true);
defineSymbol(math, rel, "\u22b3", "\\vartriangleright");
defineSymbol(math, rel, "\u22b5", "\\trianglerighteq");
defineSymbol(math, rel, "\u22a9", "\\Vdash", true);
defineSymbol(math, rel, "\u2223", "\\shortmid");
defineSymbol(math, rel, "\u2225", "\\shortparallel");
defineSymbol(math, rel, "\u226c", "\\between", true);
defineSymbol(math, rel, "\u22d4", "\\pitchfork", true);
defineSymbol(math, rel, "\u221d", "\\varpropto");
defineSymbol(math, rel, "\u25c0", "\\blacktriangleleft");
// unicode-math says that \therefore is a mathord atom.
// We kept the amssymb atom type, which is rel.
defineSymbol(math, rel, "\u2234", "\\therefore", true);
defineSymbol(math, rel, "\u220d", "\\backepsilon");
defineSymbol(math, rel, "\u25b6", "\\blacktriangleright");
// unicode-math says that \because is a mathord atom.
// We kept the amssymb atom type, which is rel.
defineSymbol(math, rel, "\u2235", "\\because", true);
defineSymbol(math, rel, "\u22d8", "\\llless");
defineSymbol(math, rel, "\u22d9", "\\gggtr");
defineSymbol(math, bin, "\u22b2", "\\lhd");
defineSymbol(math, bin, "\u22b3", "\\rhd");
defineSymbol(math, rel, "\u2242", "\\eqsim", true);
defineSymbol(math, rel, "\u2251", "\\Doteq", true);
defineSymbol(math, rel, "\u297d", "\\strictif", true);
defineSymbol(math, rel, "\u297c", "\\strictfi", true);

// AMS Binary Operators
defineSymbol(math, bin, "\u2214", "\\dotplus", true);
defineSymbol(math, bin, "\u2216", "\\smallsetminus");
defineSymbol(math, bin, "\u22d2", "\\Cap", true);
defineSymbol(math, bin, "\u22d3", "\\Cup", true);
defineSymbol(math, bin, "\u2a5e", "\\doublebarwedge", true);
defineSymbol(math, bin, "\u229f", "\\boxminus", true);
defineSymbol(math, bin, "\u229e", "\\boxplus", true);
defineSymbol(math, bin, "\u22c7", "\\divideontimes", true);
defineSymbol(math, bin, "\u22c9", "\\ltimes", true);
defineSymbol(math, bin, "\u22ca", "\\rtimes", true);
defineSymbol(math, bin, "\u22cb", "\\leftthreetimes", true);
defineSymbol(math, bin, "\u22cc", "\\rightthreetimes", true);
defineSymbol(math, bin, "\u22cf", "\\curlywedge", true);
defineSymbol(math, bin, "\u22ce", "\\curlyvee", true);
defineSymbol(math, bin, "\u229d", "\\circleddash", true);
defineSymbol(math, bin, "\u229b", "\\circledast", true);
defineSymbol(math, bin, "\u22ba", "\\intercal", true);
defineSymbol(math, bin, "\u22d2", "\\doublecap");
defineSymbol(math, bin, "\u22d3", "\\doublecup");
defineSymbol(math, bin, "\u22a0", "\\boxtimes", true);
defineSymbol(math, bin, "\u22c8", "\\bowtie", true);
defineSymbol(math, bin, "\u22c8", "\\Join");
defineSymbol(math, bin, "\u27d5", "\\leftouterjoin", true);
defineSymbol(math, bin, "\u27d6", "\\rightouterjoin", true);
defineSymbol(math, bin, "\u27d7", "\\fullouterjoin", true);

// AMS Arrows
// Note: unicode-math maps \u21e2 to their own function \rightdasharrow.
// We'll map it to AMS function \dashrightarrow. It produces the same atom.
defineSymbol(math, rel, "\u21e2", "\\dashrightarrow", true);
// unicode-math maps \u21e0 to \leftdasharrow. We'll use the AMS synonym.
defineSymbol(math, rel, "\u21e0", "\\dashleftarrow", true);
defineSymbol(math, rel, "\u21c7", "\\leftleftarrows", true);
defineSymbol(math, rel, "\u21c6", "\\leftrightarrows", true);
defineSymbol(math, rel, "\u21da", "\\Lleftarrow", true);
defineSymbol(math, rel, "\u219e", "\\twoheadleftarrow", true);
defineSymbol(math, rel, "\u21a2", "\\leftarrowtail", true);
defineSymbol(math, rel, "\u21ab", "\\looparrowleft", true);
defineSymbol(math, rel, "\u21cb", "\\leftrightharpoons", true);
defineSymbol(math, rel, "\u21b6", "\\curvearrowleft", true);
// unicode-math maps \u21ba to \acwopencirclearrow. We'll use the AMS synonym.
defineSymbol(math, rel, "\u21ba", "\\circlearrowleft", true);
defineSymbol(math, rel, "\u21b0", "\\Lsh", true);
defineSymbol(math, rel, "\u21c8", "\\upuparrows", true);
defineSymbol(math, rel, "\u21bf", "\\upharpoonleft", true);
defineSymbol(math, rel, "\u21c3", "\\downharpoonleft", true);
defineSymbol(math, rel, "\u22b6", "\\origof", true);
defineSymbol(math, rel, "\u22b7", "\\imageof", true);
defineSymbol(math, rel, "\u22b8", "\\multimap", true);
defineSymbol(math, rel, "\u21ad", "\\leftrightsquigarrow", true);
defineSymbol(math, rel, "\u21c9", "\\rightrightarrows", true);
defineSymbol(math, rel, "\u21c4", "\\rightleftarrows", true);
defineSymbol(math, rel, "\u21a0", "\\twoheadrightarrow", true);
defineSymbol(math, rel, "\u21a3", "\\rightarrowtail", true);
defineSymbol(math, rel, "\u21ac", "\\looparrowright", true);
defineSymbol(math, rel, "\u21b7", "\\curvearrowright", true);
// unicode-math maps \u21bb to \cwopencirclearrow. We'll use the AMS synonym.
defineSymbol(math, rel, "\u21bb", "\\circlearrowright", true);
defineSymbol(math, rel, "\u21b1", "\\Rsh", true);
defineSymbol(math, rel, "\u21ca", "\\downdownarrows", true);
defineSymbol(math, rel, "\u21be", "\\upharpoonright", true);
defineSymbol(math, rel, "\u21c2", "\\downharpoonright", true);
defineSymbol(math, rel, "\u21dd", "\\rightsquigarrow", true);
defineSymbol(math, rel, "\u21dd", "\\leadsto");
defineSymbol(math, rel, "\u21db", "\\Rrightarrow", true);
defineSymbol(math, rel, "\u21be", "\\restriction");

defineSymbol(math, textord, "\u2018", "`");
defineSymbol(math, textord, "$", "\\$");
defineSymbol(text, textord, "$", "\\$");
defineSymbol(text, textord, "$", "\\textdollar");
defineSymbol(math, textord, "¢", "\\cent");
defineSymbol(text, textord, "¢", "\\cent");
defineSymbol(math, textord, "%", "\\%");
defineSymbol(text, textord, "%", "\\%");
defineSymbol(math, textord, "_", "\\_");
defineSymbol(text, textord, "_", "\\_");
defineSymbol(text, textord, "_", "\\textunderscore");
defineSymbol(text, textord, "\u2423", "\\textvisiblespace", true);
defineSymbol(math, textord, "\u2220", "\\angle", true);
defineSymbol(math, textord, "\u221e", "\\infty", true);
defineSymbol(math, textord, "\u2032", "\\prime");
defineSymbol(math, textord, "\u25b3", "\\triangle");
defineSymbol(text, textord, "\u0391", "\\Alpha", true);
defineSymbol(text, textord, "\u0392", "\\Beta", true);
defineSymbol(text, textord, "\u0393", "\\Gamma", true);
defineSymbol(text, textord, "\u0394", "\\Delta", true);
defineSymbol(text, textord, "\u0395", "\\Epsilon", true);
defineSymbol(text, textord, "\u0396", "\\Zeta", true);
defineSymbol(text, textord, "\u0397", "\\Eta", true);
defineSymbol(text, textord, "\u0398", "\\Theta", true);
defineSymbol(text, textord, "\u0399", "\\Iota", true);
defineSymbol(text, textord, "\u039a", "\\Kappa", true);
defineSymbol(text, textord, "\u039b", "\\Lambda", true);
defineSymbol(text, textord, "\u039c", "\\Mu", true);
defineSymbol(text, textord, "\u039d", "\\Nu", true);
defineSymbol(text, textord, "\u039e", "\\Xi", true);
defineSymbol(text, textord, "\u039f", "\\Omicron", true);
defineSymbol(text, textord, "\u03a0", "\\Pi", true);
defineSymbol(text, textord, "\u03a1", "\\Rho", true);
defineSymbol(text, textord, "\u03a3", "\\Sigma", true);
defineSymbol(text, textord, "\u03a4", "\\Tau", true);
defineSymbol(text, textord, "\u03a5", "\\Upsilon", true);
defineSymbol(text, textord, "\u03a6", "\\Phi", true);
defineSymbol(text, textord, "\u03a7", "\\Chi", true);
defineSymbol(text, textord, "\u03a8", "\\Psi", true);
defineSymbol(text, textord, "\u03a9", "\\Omega", true);
defineSymbol(math, mathord, "\u0391", "\\Alpha", true);
defineSymbol(math, mathord, "\u0392", "\\Beta", true);
defineSymbol(math, mathord, "\u0393", "\\Gamma", true);
defineSymbol(math, mathord, "\u0394", "\\Delta", true);
defineSymbol(math, mathord, "\u0395", "\\Epsilon", true);
defineSymbol(math, mathord, "\u0396", "\\Zeta", true);
defineSymbol(math, mathord, "\u0397", "\\Eta", true);
defineSymbol(math, mathord, "\u0398", "\\Theta", true);
defineSymbol(math, mathord, "\u0399", "\\Iota", true);
defineSymbol(math, mathord, "\u039a", "\\Kappa", true);
defineSymbol(math, mathord, "\u039b", "\\Lambda", true);
defineSymbol(math, mathord, "\u039c", "\\Mu", true);
defineSymbol(math, mathord, "\u039d", "\\Nu", true);
defineSymbol(math, mathord, "\u039e", "\\Xi", true);
defineSymbol(math, mathord, "\u039f", "\\Omicron", true);
defineSymbol(math, mathord, "\u03a0", "\\Pi", true);
defineSymbol(math, mathord, "\u03a1", "\\Rho", true);
defineSymbol(math, mathord, "\u03a3", "\\Sigma", true);
defineSymbol(math, mathord, "\u03a4", "\\Tau", true);
defineSymbol(math, mathord, "\u03a5", "\\Upsilon", true);
defineSymbol(math, mathord, "\u03a6", "\\Phi", true);
defineSymbol(math, mathord, "\u03a7", "\\Chi", true);
defineSymbol(math, mathord, "\u03a8", "\\Psi", true);
defineSymbol(math, mathord, "\u03a9", "\\Omega", true);
defineSymbol(math, open, "\u00ac", "\\neg", true);
defineSymbol(math, open, "\u00ac", "\\lnot");
defineSymbol(math, textord, "\u22a4", "\\top");
defineSymbol(math, textord, "\u22a5", "\\bot");
defineSymbol(math, textord, "\u2205", "\\emptyset");
defineSymbol(math, textord, "\u00f8", "\\varnothing");
defineSymbol(math, mathord, "\u03b1", "\\alpha", true);
defineSymbol(math, mathord, "\u03b2", "\\beta", true);
defineSymbol(math, mathord, "\u03b3", "\\gamma", true);
defineSymbol(math, mathord, "\u03b4", "\\delta", true);
defineSymbol(math, mathord, "\u03f5", "\\epsilon", true);
defineSymbol(math, mathord, "\u03b6", "\\zeta", true);
defineSymbol(math, mathord, "\u03b7", "\\eta", true);
defineSymbol(math, mathord, "\u03b8", "\\theta", true);
defineSymbol(math, mathord, "\u03b9", "\\iota", true);
defineSymbol(math, mathord, "\u03ba", "\\kappa", true);
defineSymbol(math, mathord, "\u03bb", "\\lambda", true);
defineSymbol(math, mathord, "\u03bc", "\\mu", true);
defineSymbol(math, mathord, "\u03bd", "\\nu", true);
defineSymbol(math, mathord, "\u03be", "\\xi", true);
defineSymbol(math, mathord, "\u03bf", "\\omicron", true);
defineSymbol(math, mathord, "\u03c0", "\\pi", true);
defineSymbol(math, mathord, "\u03c1", "\\rho", true);
defineSymbol(math, mathord, "\u03c3", "\\sigma", true);
defineSymbol(math, mathord, "\u03c4", "\\tau", true);
defineSymbol(math, mathord, "\u03c5", "\\upsilon", true);
defineSymbol(math, mathord, "\u03d5", "\\phi", true);
defineSymbol(math, mathord, "\u03c7", "\\chi", true);
defineSymbol(math, mathord, "\u03c8", "\\psi", true);
defineSymbol(math, mathord, "\u03c9", "\\omega", true);
defineSymbol(math, mathord, "\u03b5", "\\varepsilon", true);
defineSymbol(math, mathord, "\u03d1", "\\vartheta", true);
defineSymbol(math, mathord, "\u03d6", "\\varpi", true);
defineSymbol(math, mathord, "\u03f1", "\\varrho", true);
defineSymbol(math, mathord, "\u03c2", "\\varsigma", true);
defineSymbol(math, mathord, "\u03c6", "\\varphi", true);
defineSymbol(math, mathord, "\u03d8", "\\Coppa", true);
defineSymbol(math, mathord, "\u03d9", "\\coppa", true);
defineSymbol(math, mathord, "\u03d9", "\\varcoppa", true);
defineSymbol(math, mathord, "\u03de", "\\Koppa", true);
defineSymbol(math, mathord, "\u03df", "\\koppa", true);
defineSymbol(math, mathord, "\u03e0", "\\Sampi", true);
defineSymbol(math, mathord, "\u03e1", "\\sampi", true);
defineSymbol(math, mathord, "\u03da", "\\Stigma", true);
defineSymbol(math, mathord, "\u03db", "\\stigma", true);
defineSymbol(math, mathord, "\u2aeb", "\\Bot");
defineSymbol(math, bin, "\u2217", "\u2217", true);
defineSymbol(math, bin, "+", "+");
defineSymbol(math, bin, "*", "*");
defineSymbol(math, bin, "\u2044", "\u2044");
defineSymbol(math, bin, "\u2212", "-", true);
defineSymbol(math, bin, "\u22c5", "\\cdot", true);
defineSymbol(math, bin, "\u2218", "\\circ", true);
defineSymbol(math, bin, "\u00f7", "\\div", true);
defineSymbol(math, bin, "\u00b1", "\\pm", true);
defineSymbol(math, bin, "\u00d7", "\\times", true);
defineSymbol(math, bin, "\u2229", "\\cap", true);
defineSymbol(math, bin, "\u222a", "\\cup", true);
defineSymbol(math, bin, "\u2216", "\\setminus", true);
defineSymbol(math, bin, "\u2227", "\\land");
defineSymbol(math, bin, "\u2228", "\\lor");
defineSymbol(math, bin, "\u2227", "\\wedge", true);
defineSymbol(math, bin, "\u2228", "\\vee", true);
defineSymbol(math, open, "\u27e6", "\\llbracket", true); // stmaryrd/semantic packages
defineSymbol(math, close, "\u27e7", "\\rrbracket", true);
defineSymbol(math, open, "\u27e8", "\\langle", true);
defineSymbol(math, open, "|", "\\lvert");
defineSymbol(math, open, "\u2016", "\\lVert");
defineSymbol(math, textord, "!", "\\oc"); // cmll package
defineSymbol(math, textord, "?", "\\wn");
defineSymbol(math, textord, "\u2193", "\\shpos");
defineSymbol(math, textord, "\u2195", "\\shift");
defineSymbol(math, textord, "\u2191", "\\shneg");
defineSymbol(math, close, "?", "?");
defineSymbol(math, close, "!", "!");
defineSymbol(math, close, "‼", "‼");
defineSymbol(math, close, "\u27e9", "\\rangle", true);
defineSymbol(math, close, "|", "\\rvert");
defineSymbol(math, close, "\u2016", "\\rVert");
defineSymbol(math, open, "\u2983", "\\lBrace", true); // stmaryrd/semantic packages
defineSymbol(math, close, "\u2984", "\\rBrace", true);
defineSymbol(math, rel, "=", "\\equal", true);
defineSymbol(math, rel, ":", ":");
defineSymbol(math, rel, "\u2248", "\\approx", true);
defineSymbol(math, rel, "\u2245", "\\cong", true);
defineSymbol(math, rel, "\u2265", "\\ge");
defineSymbol(math, rel, "\u2265", "\\geq", true);
defineSymbol(math, rel, "\u2190", "\\gets");
defineSymbol(math, rel, ">", "\\gt", true);
defineSymbol(math, rel, "\u2208", "\\in", true);
defineSymbol(math, rel, "\u2209", "\\notin", true);
defineSymbol(math, rel, "\ue020", "\\@not");
defineSymbol(math, rel, "\u2282", "\\subset", true);
defineSymbol(math, rel, "\u2283", "\\supset", true);
defineSymbol(math, rel, "\u2286", "\\subseteq", true);
defineSymbol(math, rel, "\u2287", "\\supseteq", true);
defineSymbol(math, rel, "\u2288", "\\nsubseteq", true);
defineSymbol(math, rel, "\u2288", "\\nsubseteqq");
defineSymbol(math, rel, "\u2289", "\\nsupseteq", true);
defineSymbol(math, rel, "\u2289", "\\nsupseteqq");
defineSymbol(math, rel, "\u22a8", "\\models");
defineSymbol(math, rel, "\u2190", "\\leftarrow", true);
defineSymbol(math, rel, "\u2264", "\\le");
defineSymbol(math, rel, "\u2264", "\\leq", true);
defineSymbol(math, rel, "<", "\\lt", true);
defineSymbol(math, rel, "\u2192", "\\rightarrow", true);
defineSymbol(math, rel, "\u2192", "\\to");
defineSymbol(math, rel, "\u2271", "\\ngeq", true);
defineSymbol(math, rel, "\u2271", "\\ngeqq");
defineSymbol(math, rel, "\u2271", "\\ngeqslant");
defineSymbol(math, rel, "\u2270", "\\nleq", true);
defineSymbol(math, rel, "\u2270", "\\nleqq");
defineSymbol(math, rel, "\u2270", "\\nleqslant");
defineSymbol(math, rel, "\u2aeb", "\\Perp", true); //cmll package
defineSymbol(math, spacing, "\u00a0", "\\ ");
defineSymbol(math, spacing, "\u00a0", "\\space");
// Ref: LaTeX Source 2e: \DeclareRobustCommand{\nobreakspace}{%
defineSymbol(math, spacing, "\u00a0", "\\nobreakspace");
defineSymbol(text, spacing, "\u00a0", "\\ ");
defineSymbol(text, spacing, "\u00a0", " ");
defineSymbol(text, spacing, "\u00a0", "\\space");
defineSymbol(text, spacing, "\u00a0", "\\nobreakspace");
defineSymbol(math, spacing, null, "\\nobreak");
defineSymbol(math, spacing, null, "\\allowbreak");
defineSymbol(math, punct, ",", ",");
defineSymbol(text, punct, ":", ":");
defineSymbol(math, punct, ";", ";");
defineSymbol(math, bin, "\u22bc", "\\barwedge", true);
defineSymbol(math, bin, "\u22bb", "\\veebar", true);
defineSymbol(math, bin, "\u2299", "\\odot", true);
defineSymbol(math, bin, "\u2295", "\\oplus", true);
defineSymbol(math, bin, "\u2297", "\\otimes", true);
defineSymbol(math, textord, "\u2202", "\\partial", true);
defineSymbol(math, bin, "\u2298", "\\oslash", true);
defineSymbol(math, bin, "\u229a", "\\circledcirc", true);
defineSymbol(math, bin, "\u22a1", "\\boxdot", true);
defineSymbol(math, bin, "\u25b3", "\\bigtriangleup");
defineSymbol(math, bin, "\u25bd", "\\bigtriangledown");
defineSymbol(math, bin, "\u2020", "\\dagger");
defineSymbol(math, bin, "\u22c4", "\\diamond");
defineSymbol(math, bin, "\u22c6", "\\star");
defineSymbol(math, bin, "\u25c3", "\\triangleleft");
defineSymbol(math, bin, "\u25b9", "\\triangleright");
defineSymbol(math, open, "{", "\\{");
defineSymbol(text, textord, "{", "\\{");
defineSymbol(text, textord, "{", "\\textbraceleft");
defineSymbol(math, close, "}", "\\}");
defineSymbol(text, textord, "}", "\\}");
defineSymbol(text, textord, "}", "\\textbraceright");
defineSymbol(math, open, "{", "\\lbrace");
defineSymbol(math, close, "}", "\\rbrace");
defineSymbol(math, open, "[", "\\lbrack", true);
defineSymbol(text, textord, "[", "\\lbrack", true);
defineSymbol(math, close, "]", "\\rbrack", true);
defineSymbol(text, textord, "]", "\\rbrack", true);
defineSymbol(math, open, "(", "\\lparen", true);
defineSymbol(math, close, ")", "\\rparen", true);
defineSymbol(text, textord, "<", "\\textless", true); // in T1 fontenc
defineSymbol(text, textord, ">", "\\textgreater", true); // in T1 fontenc
defineSymbol(math, open, "\u230a", "\\lfloor", true);
defineSymbol(math, close, "\u230b", "\\rfloor", true);
defineSymbol(math, open, "\u2308", "\\lceil", true);
defineSymbol(math, close, "\u2309", "\\rceil", true);
defineSymbol(math, textord, "\\", "\\backslash");
defineSymbol(math, textord, "|", "|");
defineSymbol(math, textord, "|", "\\vert");
defineSymbol(text, textord, "|", "\\textbar", true); // in T1 fontenc
defineSymbol(math, textord, "\u2016", "\\|");
defineSymbol(math, textord, "\u2016", "\\Vert");
defineSymbol(text, textord, "\u2016", "\\textbardbl");
defineSymbol(text, textord, "~", "\\textasciitilde");
defineSymbol(text, textord, "\\", "\\textbackslash");
defineSymbol(text, textord, "^", "\\textasciicircum");
defineSymbol(math, rel, "\u2191", "\\uparrow", true);
defineSymbol(math, rel, "\u21d1", "\\Uparrow", true);
defineSymbol(math, rel, "\u2193", "\\downarrow", true);
defineSymbol(math, rel, "\u21d3", "\\Downarrow", true);
defineSymbol(math, rel, "\u2195", "\\updownarrow", true);
defineSymbol(math, rel, "\u21d5", "\\Updownarrow", true);
defineSymbol(math, op, "\u2210", "\\coprod");
defineSymbol(math, op, "\u22c1", "\\bigvee");
defineSymbol(math, op, "\u22c0", "\\bigwedge");
defineSymbol(math, op, "\u2a04", "\\biguplus");
defineSymbol(math, op, "\u22c2", "\\bigcap");
defineSymbol(math, op, "\u22c3", "\\bigcup");
defineSymbol(math, op, "\u222b", "\\int");
defineSymbol(math, op, "\u222b", "\\intop");
defineSymbol(math, op, "\u222c", "\\iint");
defineSymbol(math, op, "\u222d", "\\iiint");
defineSymbol(math, op, "\u220f", "\\prod");
defineSymbol(math, op, "\u2211", "\\sum");
defineSymbol(math, op, "\u2a02", "\\bigotimes");
defineSymbol(math, op, "\u2a01", "\\bigoplus");
defineSymbol(math, op, "\u2a00", "\\bigodot");
defineSymbol(math, op, "\u222e", "\\oint");
defineSymbol(math, op, "\u222f", "\\oiint");
defineSymbol(math, op, "\u2230", "\\oiiint");
defineSymbol(math, op, "\u2231", "\\intclockwise");
defineSymbol(math, op, "\u2232", "\\varointclockwise");
defineSymbol(math, op, "\u2a0c", "\\iiiint");
defineSymbol(math, op, "\u2a0d", "\\intbar");
defineSymbol(math, op, "\u2a0e", "\\intBar");
defineSymbol(math, op, "\u2a0f", "\\fint");
defineSymbol(math, op, "\u2a12", "\\rppolint");
defineSymbol(math, op, "\u2a13", "\\scpolint");
defineSymbol(math, op, "\u2a15", "\\pointint");
defineSymbol(math, op, "\u2a16", "\\sqint");
defineSymbol(math, op, "\u2a17", "\\intlarhk");
defineSymbol(math, op, "\u2a18", "\\intx");
defineSymbol(math, op, "\u2a19", "\\intcap");
defineSymbol(math, op, "\u2a1a", "\\intcup");
defineSymbol(math, op, "\u2a05", "\\bigsqcap");
defineSymbol(math, op, "\u2a06", "\\bigsqcup");
defineSymbol(math, op, "\u222b", "\\smallint");
defineSymbol(text, inner, "\u2026", "\\textellipsis");
defineSymbol(math, inner, "\u2026", "\\mathellipsis");
defineSymbol(text, inner, "\u2026", "\\ldots", true);
defineSymbol(math, inner, "\u2026", "\\ldots", true);
defineSymbol(math, inner, "\u22f0", "\\iddots", true);
defineSymbol(math, inner, "\u22ef", "\\@cdots", true);
defineSymbol(math, inner, "\u22f1", "\\ddots", true);
defineSymbol(math, textord, "\u22ee", "\\varvdots"); // \vdots is a macro
defineSymbol(math, accent, "\u02ca", "\\acute");
defineSymbol(math, accent, "\u0060", "\\grave");
defineSymbol(math, accent, "\u00a8", "\\ddot");
defineSymbol(math, accent, "\u2026", "\\dddot");
defineSymbol(math, accent, "\u2026\u002e", "\\ddddot");
defineSymbol(math, accent, "\u007e", "\\tilde");
defineSymbol(math, accent, "\u203e", "\\bar");
defineSymbol(math, accent, "\u02d8", "\\breve");
defineSymbol(math, accent, "\u02c7", "\\check");
defineSymbol(math, accent, "\u005e", "\\hat");
defineSymbol(math, accent, "\u2192", "\\vec");
defineSymbol(math, accent, "\u02d9", "\\dot");
defineSymbol(math, accent, "\u02da", "\\mathring");
defineSymbol(math, mathord, "\u0131", "\\imath", true);
defineSymbol(math, mathord, "\u0237", "\\jmath", true);
defineSymbol(math, textord, "\u0131", "\u0131");
defineSymbol(math, textord, "\u0237", "\u0237");
defineSymbol(text, textord, "\u0131", "\\i", true);
defineSymbol(text, textord, "\u0237", "\\j", true);
defineSymbol(text, textord, "\u00df", "\\ss", true);
defineSymbol(text, textord, "\u00e6", "\\ae", true);
defineSymbol(text, textord, "\u0153", "\\oe", true);
defineSymbol(text, textord, "\u00f8", "\\o", true);
defineSymbol(math, mathord, "\u00f8", "\\o", true);
defineSymbol(text, textord, "\u00c6", "\\AE", true);
defineSymbol(text, textord, "\u0152", "\\OE", true);
defineSymbol(text, textord, "\u00d8", "\\O", true);
defineSymbol(math, mathord, "\u00d8", "\\O", true);
defineSymbol(text, accent, "\u02ca", "\\'"); // acute
defineSymbol(text, accent, "\u02cb", "\\`"); // grave
defineSymbol(text, accent, "\u02c6", "\\^"); // circumflex
defineSymbol(text, accent, "\u02dc", "\\~"); // tilde
defineSymbol(text, accent, "\u02c9", "\\="); // macron
defineSymbol(text, accent, "\u02d8", "\\u"); // breve
defineSymbol(text, accent, "\u02d9", "\\."); // dot above
defineSymbol(text, accent, "\u00b8", "\\c"); // cedilla
defineSymbol(text, accent, "\u02da", "\\r"); // ring above
defineSymbol(text, accent, "\u02c7", "\\v"); // caron
defineSymbol(text, accent, "\u00a8", '\\"'); // diaresis
defineSymbol(text, accent, "\u02dd", "\\H"); // double acute
defineSymbol(math, accent, "\u02ca", "\\'"); // acute
defineSymbol(math, accent, "\u02cb", "\\`"); // grave
defineSymbol(math, accent, "\u02c6", "\\^"); // circumflex
defineSymbol(math, accent, "\u02dc", "\\~"); // tilde
defineSymbol(math, accent, "\u02c9", "\\="); // macron
defineSymbol(math, accent, "\u02d8", "\\u"); // breve
defineSymbol(math, accent, "\u02d9", "\\."); // dot above
defineSymbol(math, accent, "\u00b8", "\\c"); // cedilla
defineSymbol(math, accent, "\u02da", "\\r"); // ring above
defineSymbol(math, accent, "\u02c7", "\\v"); // caron
defineSymbol(math, accent, "\u00a8", '\\"'); // diaresis
defineSymbol(math, accent, "\u02dd", "\\H"); // double acute

// These ligatures are detected and created in Parser.js's `formLigatures`.
const ligatures = {
  "--": true,
  "---": true,
  "``": true,
  "''": true
};

defineSymbol(text, textord, "\u2013", "--", true);
defineSymbol(text, textord, "\u2013", "\\textendash");
defineSymbol(text, textord, "\u2014", "---", true);
defineSymbol(text, textord, "\u2014", "\\textemdash");
defineSymbol(text, textord, "\u2018", "`", true);
defineSymbol(text, textord, "\u2018", "\\textquoteleft");
defineSymbol(text, textord, "\u2019", "'", true);
defineSymbol(text, textord, "\u2019", "\\textquoteright");
defineSymbol(text, textord, "\u201c", "``", true);
defineSymbol(text, textord, "\u201c", "\\textquotedblleft");
defineSymbol(text, textord, "\u201d", "''", true);
defineSymbol(text, textord, "\u201d", "\\textquotedblright");
//  \degree from gensymb package
defineSymbol(math, textord, "\u00b0", "\\degree", true);
defineSymbol(text, textord, "\u00b0", "\\degree");
// \textdegree from inputenc package
defineSymbol(text, textord, "\u00b0", "\\textdegree", true);
// TODO: In LaTeX, \pounds can generate a different character in text and math
// mode, but among our fonts, only Main-Regular defines this character "163".
defineSymbol(math, textord, "\u00a3", "\\pounds");
defineSymbol(math, textord, "\u00a3", "\\mathsterling", true);
defineSymbol(text, textord, "\u00a3", "\\pounds");
defineSymbol(text, textord, "\u00a3", "\\textsterling", true);
defineSymbol(math, textord, "\u2720", "\\maltese");
defineSymbol(text, textord, "\u2720", "\\maltese");
defineSymbol(math, textord, "\u20ac", "\\euro", true);
defineSymbol(text, textord, "\u20ac", "\\euro", true);
defineSymbol(text, textord, "\u20ac", "\\texteuro");
defineSymbol(math, textord, "\u00a9", "\\copyright", true);
defineSymbol(text, textord, "\u00a9", "\\textcopyright");

// Italic Greek
defineSymbol(math, textord, "𝛤", "\\varGamma");
defineSymbol(math, textord, "𝛥", "\\varDelta");
defineSymbol(math, textord, "𝛩", "\\varTheta");
defineSymbol(math, textord, "𝛬", "\\varLambda");
defineSymbol(math, textord, "𝛯", "\\varXi");
defineSymbol(math, textord, "𝛱", "\\varPi");
defineSymbol(math, textord, "𝛴", "\\varSigma");
defineSymbol(math, textord, "𝛶", "\\varUpsilon");
defineSymbol(math, textord, "𝛷", "\\varPhi");
defineSymbol(math, textord, "𝛹", "\\varPsi");
defineSymbol(math, textord, "𝛺", "\\varOmega");
defineSymbol(text, textord, "𝛤", "\\varGamma");
defineSymbol(text, textord, "𝛥", "\\varDelta");
defineSymbol(text, textord, "𝛩", "\\varTheta");
defineSymbol(text, textord, "𝛬", "\\varLambda");
defineSymbol(text, textord, "𝛯", "\\varXi");
defineSymbol(text, textord, "𝛱", "\\varPi");
defineSymbol(text, textord, "𝛴", "\\varSigma");
defineSymbol(text, textord, "𝛶", "\\varUpsilon");
defineSymbol(text, textord, "𝛷", "\\varPhi");
defineSymbol(text, textord, "𝛹", "\\varPsi");
defineSymbol(text, textord, "𝛺", "\\varOmega");


// There are lots of symbols which are the same, so we add them in afterwards.
// All of these are textords in math mode
const mathTextSymbols = '0123456789/@."';
for (let i = 0; i < mathTextSymbols.length; i++) {
  const ch = mathTextSymbols.charAt(i);
  defineSymbol(math, textord, ch, ch);
}

// All of these are textords in text mode
const textSymbols = '0123456789!@*()-=+";:?/.,';
for (let i = 0; i < textSymbols.length; i++) {
  const ch = textSymbols.charAt(i);
  defineSymbol(text, textord, ch, ch);
}

// All of these are textords in text mode, and mathords in math mode
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < letters.length; i++) {
  const ch = letters.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}

// Some more letters in Unicode Basic Multilingual Plane.
const narrow = "ÇÐÞçþℂℍℕℙℚℝℤℎℏℊℋℌℐℑℒℓ℘ℛℜℬℰℱℳℭℨ";
for (let i = 0; i < narrow.length; i++) {
  const ch = narrow.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}

// The next loop loads wide (surrogate pair) characters.
// We support some letters in the Unicode range U+1D400 to U+1D7FF,
// Mathematical Alphanumeric Symbols.
let wideChar = "";
for (let i = 0; i < letters.length; i++) {
  // The hex numbers in the next line are a surrogate pair.
  // 0xD835 is the high surrogate for all letters in the range we support.
  // 0xDC00 is the low surrogate for bold A.
  wideChar = String.fromCharCode(0xd835, 0xdc00 + i); // A-Z a-z bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdc34 + i); // A-Z a-z italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdc68 + i); // A-Z a-z bold italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdd04 + i); // A-Z a-z Fractur
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdda0 + i); // A-Z a-z sans-serif
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xddd4 + i); // A-Z a-z sans bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xde08 + i); // A-Z a-z sans italic
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xde70 + i); // A-Z a-z monospace
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdd38 + i); // A-Z a-z double struck
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  const ch = letters.charAt(i);
  wideChar = String.fromCharCode(0xd835, 0xdc9c + i); // A-Z a-z calligraphic
  defineSymbol(math, mathord, ch, wideChar);
  defineSymbol(text, textord, ch, wideChar);
}

// Next, some wide character numerals
for (let i = 0; i < 10; i++) {
  wideChar = String.fromCharCode(0xd835, 0xdfce + i); // 0-9 bold
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdfe2 + i); // 0-9 sans serif
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdfec + i); // 0-9 bold sans
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);

  wideChar = String.fromCharCode(0xd835, 0xdff6 + i); // 0-9 monospace
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
}

/*
 * Neither Firefox nor Chrome support hard line breaks or soft line breaks.
 * (Despite https://www.w3.org/Math/draft-spec/mathml.html#chapter3_presm.lbattrs)
 * So Temml has work-arounds for both hard and soft breaks.
 * The work-arounds sadly do not work simultaneously. Any top-level hard
 * break makes soft line breaks impossible.
 *
 * Hard breaks are simulated by creating a <mtable> and putting each line in its own <mtr>.
 *
 * To create soft line breaks, Temml avoids using the <semantics> and <annotation> tags.
 * Then the top level of a <math> element can be occupied by <mrow> elements, and the browser
 * will break after a <mrow> if the expression extends beyond the container limit.
 *
 * The default is for soft line breaks after each top-level binary or
 * relational operator, per TeXbook p. 173. So we gather the expression into <mrow>s so that
 * each <mrow> ends in a binary or relational operator.
 *
 * An option is for soft line breaks before an "=" sign. That changes the <mrow>s.
 *
 * Soft line breaks will not work in Chromium and Safari, only Firefox.
 *
 * Hopefully browsers will someday do their own linebreaking and we will be able to delete
 * much of this module.
 */

function setLineBreaks(expression, wrapMode, isDisplayMode) {
  const mtrs = [];
  let mrows = [];
  let block = [];
  let numTopLevelEquals = 0;
  let canBeBIN = false; // The first node cannot be an infix binary operator.
  let i = 0;
  while (i < expression.length) {
    while (expression[i] instanceof DocumentFragment) {
      expression.splice(i, 1, ...expression[i].children); // Expand the fragment.
    }
    const node = expression[i];
    if (node.attributes && node.attributes.linebreak &&
      node.attributes.linebreak === "newline") {
      // A hard line break. Create a <mtr> for the current block.
      if (block.length > 0) {
        mrows.push(new mathMLTree.MathNode("mrow", block));
      }
      mrows.push(node);
      block = [];
      const mtd = new mathMLTree.MathNode("mtd", mrows);
      mtd.style.textAlign = "left";
      mtrs.push(new mathMLTree.MathNode("mtr", [mtd]));
      mrows = [];
      i += 1;
      continue
    }
    block.push(node);
    if (node.type && node.type === "mo" && node.children.length === 1) {
      if (wrapMode === "=" && node.children[0].text === "=") {
        numTopLevelEquals += 1;
        if (numTopLevelEquals > 1) {
          block.pop();
          // Start a new block. (Insert a soft linebreak.)
          const element = new mathMLTree.MathNode("mrow", block);
          mrows.push(element);
          block = [node];
        }
      } else if (wrapMode === "tex") {
        // This may be a place for a soft line break.
        if (canBeBIN && !node.attributes.form) {
          // Check if the following node is a \nobreak text node, e.g. "~""
          const next = i < expression.length - 1 ? expression[i + 1] : null;
          let glueIsFreeOfNobreak = true;
          if (
            !(
              next &&
              next.type === "mtext" &&
              next.attributes.linebreak &&
              next.attributes.linebreak === "nobreak"
            )
          ) {
            // We may need to start a new block.
            // First, put any post-operator glue on same line as operator.
            for (let j = i + 1; j < expression.length; j++) {
              const nd = expression[j];
              if (
                nd.type &&
                nd.type === "mspace" &&
                !(nd.attributes.linebreak && nd.attributes.linebreak === "newline")
              ) {
                block.push(nd);
                i += 1;
                if (
                  nd.attributes &&
                  nd.attributes.linebreak &&
                  nd.attributes.linebreak === "nobreak"
                ) {
                  glueIsFreeOfNobreak = false;
                }
              } else {
                break;
              }
            }
          }
          if (glueIsFreeOfNobreak) {
            // Start a new block. (Insert a soft linebreak.)
            const element = new mathMLTree.MathNode("mrow", block);
            mrows.push(element);
            block = [];
          }
          canBeBIN = false;
        }
        const isOpenDelimiter = node.attributes.form && node.attributes.form === "prefix";
        // Any operator that follows an open delimiter is unary.
        canBeBIN = !(node.attributes.separator || isOpenDelimiter);
      } else {
        canBeBIN = true;
      }
    } else {
      canBeBIN = true;
    }
    i += 1;
  }
  if (block.length > 0) {
    const element = new mathMLTree.MathNode("mrow", block);
    mrows.push(element);
  }
  if (mtrs.length > 0) {
    const mtd = new mathMLTree.MathNode("mtd", mrows);
    mtd.style.textAlign = "left";
    const mtr = new mathMLTree.MathNode("mtr", [mtd]);
    mtrs.push(mtr);
    const mtable = new mathMLTree.MathNode("mtable", mtrs);
    if (!isDisplayMode) {
      mtable.setAttribute("columnalign", "left");
      mtable.setAttribute("rowspacing", "0em");
    }
    return mtable
  }
  return mathMLTree.newDocumentFragment(mrows);
}

/**
 * This file converts a parse tree into a corresponding MathML tree. The main
 * entry point is the `buildMathML` function, which takes a parse tree from the
 * parser.
 */

/**
 * Takes a symbol and converts it into a MathML text node after performing
 * optional replacement from symbols.js.
 */
const makeText = function(text, mode, style) {
  if (
    symbols[mode][text] &&
    symbols[mode][text].replace &&
    text.charCodeAt(0) !== 0xd835 &&
    !(
      Object.prototype.hasOwnProperty.call(ligatures, text) &&
      style &&
      ((style.fontFamily && style.fontFamily.slice(4, 6) === "tt") ||
        (style.font && style.font.slice(4, 6) === "tt"))
    )
  ) {
    text = symbols[mode][text].replace;
  }

  return new mathMLTree.TextNode(text);
};

const consolidateText = mrow => {
  // If possible, consolidate adjacent <mtext> elements into a single element.
  if (mrow.type !== "mrow") { return mrow }
  if (mrow.children.length === 0) { return mrow } // empty group, e.g., \text{}
  if (!mrow.children[0].attributes || mrow.children[0].type !== "mtext") { return mrow }
  const variant = mrow.children[0].attributes.mathvariant || "";
  const mtext = new mathMLTree.MathNode(
    "mtext",
    [new mathMLTree.TextNode(mrow.children[0].children[0].text)]
  );
  for (let i = 1; i < mrow.children.length; i++) {
    // Check each child and, if possible, copy the character into child[0].
    const localVariant = mrow.children[i].attributes.mathvariant || "";
    if (mrow.children[i].type === "mrow") {
      const childRow = mrow.children[i];
      for (let j = 0; j < childRow.children.length; j++) {
        // We'll also check the children of a mrow. One level only. No recursion.
        const childVariant = childRow.children[j].attributes.mathvariant || "";
        if (childVariant !== variant || childRow.children[j].type !== "mtext") {
          return mrow // At least one element cannot be consolidated. Get out.
        } else {
          mtext.children[0].text += childRow.children[j].children[0].text;
        }
      }
    } else if (localVariant !== variant || mrow.children[i].type !== "mtext") {
      return mrow
    } else {
      mtext.children[0].text += mrow.children[i].children[0].text;
    }
  }
  // Firefox does not render a space at either end of an <mtext> string.
  // To get proper rendering, we replace leading or trailing spaces with no-break spaces.
  if (mtext.children[0].text.charAt(0) === " ") {
    mtext.children[0].text = "\u00a0" + mtext.children[0].text.slice(1);
  }
  const L = mtext.children[0].text.length;
  if (L > 0 && mtext.children[0].text.charAt(L - 1) === " ") {
    mtext.children[0].text = mtext.children[0].text.slice(0, -1) + "\u00a0";
  }
  return mtext
};

const numberRegEx$1$1 = /^[0-9]$/;
const isCommaOrDot = node => {
  return (node.type === "atom" && node.text === ",") ||
         (node.type === "textord" && node.text === ".")
};
const consolidateNumbers = expression => {
  // Consolidate adjacent numbers. We want to return <mn>1,506.3</mn>,
  // not <mn>1</mn><mo>,</mo><mn>5</mn><mn>0</mn><mn>6</mn><mi>.</mi><mn>3</mn>
  if (expression.length < 2) { return }
  const nums = [];
  let inNum = false;
  // Find adjacent numerals
  for (let i = 0; i < expression.length; i++) {
    const node = expression[i];
    if (node.type === "textord" && numberRegEx$1$1.test(node.text)) {
      if (!inNum) { nums.push({ start: i }); }
      inNum = true;
    } else {
      if (inNum) { nums[nums.length - 1].end = i - 1; }
      inNum = false;
    }
  }
  if (inNum) { nums[nums.length - 1].end = expression.length - 1; }

  // Determine if numeral groups are separated by a comma or dot.
  for (let i = nums.length - 1; i > 0; i--) {
    if (nums[i - 1].end === nums[i].start - 2 && isCommaOrDot(expression[nums[i].start - 1])) {
      // Merge the two groups.
      nums[i - 1].end = nums[i].end;
      nums.splice(i, 1);
    }
  }

  // Consolidate the number nodes
  for (let i = nums.length - 1; i >= 0; i--) {
    for (let j = nums[i].start + 1; j <= nums[i].end; j++) {
      expression[nums[i].start].text += expression[j].text;
    }
    expression.splice(nums[i].start + 1, nums[i].end - nums[i].start);
  }
};

/**
 * Wrap the given array of nodes in an <mrow> node if needed, i.e.,
 * unless the array has length 1.  Always returns a single node.
 */
const makeRow = function(body) {
  if (body.length === 1 && !(body[0] instanceof DocumentFragment)) {
    return body[0];
  } else {
    return new mathMLTree.MathNode("mrow", body);
  }
};

const isRel = item => {
  return (item.type === "atom" && item.family === "rel") ||
      (item.type === "mclass" && item.mclass === "mrel")
};

/**
 * Takes a list of nodes, builds them, and returns a list of the generated
 * MathML nodes.  Also do a couple chores along the way:
 * (1) Suppress spacing when an author wraps an operator w/braces, as in {=}.
 * (2) Suppress spacing between two adjacent relations.
 */
const buildExpression = function(expression, style, isOrdgroup) {
  if (expression.length === 1) {
    const group = buildGroup$1(expression[0], style);
    if (isOrdgroup && group instanceof MathNode && group.type === "mo") {
      // When TeX writers want to suppress spacing on an operator,
      // they often put the operator by itself inside braces.
      group.setAttribute("lspace", "0em");
      group.setAttribute("rspace", "0em");
    }
    return [group];
  }

  consolidateNumbers(expression);

  const groups = [];
  for (let i = 0; i < expression.length; i++) {
    const group = buildGroup$1(expression[i], style);
    // Suppress spacing between adjacent relations
    if (i < expression.length - 1 && isRel(expression[i]) && isRel(expression[i + 1])) {
      group.setAttribute("rspace", "0em");
    }
    if (i > 0 && isRel(expression[i]) && isRel(expression[i - 1])) {
      group.setAttribute("lspace", "0em");
    }
    groups.push(group);
  }
  return groups;
};

/**
 * Equivalent to buildExpression, but wraps the elements in an <mrow>
 * if there's more than one.  Returns a single node instead of an array.
 */
const buildExpressionRow = function(expression, style, isOrdgroup) {
  return makeRow(buildExpression(expression, style, isOrdgroup));
};

/**
 * Takes a group from the parser and calls the appropriate groupBuilders function
 * on it to produce a MathML node.
 */
const buildGroup$1 = function(group, style) {
  if (!group) {
    return new mathMLTree.MathNode("mrow");
  }

  if (_mathmlGroupBuilders[group.type]) {
    // Call the groupBuilders function
    const result = _mathmlGroupBuilders[group.type](group, style);
    return result;
  } else {
    throw new ParseError("Got group of unknown type: '" + group.type + "'");
  }
};

const glue$1 = _ => {
  return new mathMLTree.MathNode("mtd", [], [], { padding: "0", width: "50%" })
};

const taggedExpression = (expression, tag, style, leqno) => {
  tag = buildExpressionRow(tag[0].body, style);
  tag = consolidateText(tag);
  tag.classes.push("tml-tag");

  expression = new mathMLTree.MathNode("mtd", [expression]);
  const rowArray = [glue$1(), expression, glue$1()];
  if (leqno) {
    rowArray[0].children.push(tag);
    rowArray[0].style.textAlign = "-webkit-left";
  } else {
    rowArray[2].children.push(tag);
    rowArray[2].style.textAlign = "-webkit-right";
  }
  const mtr = new mathMLTree.MathNode("mtr", rowArray, ["tml-tageqn"]);
  const table = new mathMLTree.MathNode("mtable", [mtr]);
  table.style.width = "100%";
  table.setAttribute("displaystyle", "true");
  return table
};

/**
 * Takes a full parse tree and settings and builds a MathML representation of
 * it.
 */
function buildMathML(tree, texExpression, style, settings) {
  // Strip off outer tag wrapper for processing below.
  let tag = null;
  if (tree.length === 1 && tree[0].type === "tag") {
    tag = tree[0].tag;
    tree = tree[0].body;
  }

  const expression = buildExpression(tree, style);
  const wrap = (settings.displayMode || settings.annotate) ? "none" : settings.wrap;

  const n1 = expression.length === 0 ? null : expression[0];
  let wrapper = expression.length === 1 && tag === null && (n1 instanceof MathNode)
      ? expression[0]
      : setLineBreaks(expression, wrap, settings.displayMode);

  if (tag) {
    wrapper = taggedExpression(wrapper, tag, style, settings.leqno);
  }

  if (settings.annotate) {
    // Build a TeX annotation of the source
    const annotation = new mathMLTree.MathNode(
      "annotation", [new mathMLTree.TextNode(texExpression)]);
    annotation.setAttribute("encoding", "application/x-tex");
    wrapper = new mathMLTree.MathNode("semantics", [wrapper, annotation]);
  }

  const math = new mathMLTree.MathNode("math", [wrapper]);

  if (settings.xml) {
    math.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
  }
  if (settings.displayMode) {
    math.setAttribute("display", "block");
    math.style.display = math.children.length === 1 && math.children[0].type === "mtable"
      ? "inline"
      : "inline-block";
  }
  return math;
}

const mathmlBuilder$a = (group, style) => {
  const accentNode = group.isStretchy
    ? stretchy.mathMLnode(group.label)
    : new mathMLTree.MathNode("mo", [makeText(group.label, group.mode)]);

  if (group.label === "\\vec") {
    accentNode.style.transform = "scale(0.75) translate(10%, 30%)";
  } else {
    accentNode.style.mathStyle = "normal";
    accentNode.style.mathDepth = "0";
  }
  if (!group.isStretchy) {
    accentNode.setAttribute("stretchy", "false");
  }

  const node = new mathMLTree.MathNode((group.label === "\\c" ? "munder" : "mover"),
    [buildGroup$1(group.base, style), accentNode]
  );

  return node;
};

const NON_STRETCHY_ACCENT_REGEX = new RegExp(
  [
    "\\acute",
    "\\grave",
    "\\ddot",
    "\\dddot",
    "\\ddddot",
    "\\tilde",
    "\\bar",
    "\\breve",
    "\\check",
    "\\hat",
    "\\vec",
    "\\dot",
    "\\mathring"
  ]
    .map((accent) => `\\${accent}`)
    .join("|")
);

// Accents
defineFunction({
  type: "accent",
  names: [
    "\\acute",
    "\\grave",
    "\\ddot",
    "\\dddot",
    "\\ddddot",
    "\\tilde",
    "\\bar",
    "\\breve",
    "\\check",
    "\\hat",
    "\\vec",
    "\\dot",
    "\\mathring",
    "\\overparen",
    "\\widecheck",
    "\\widehat",
    "\\wideparen",
    "\\widetilde",
    "\\overrightarrow",
    "\\overleftarrow",
    "\\Overrightarrow",
    "\\overleftrightarrow",
    "\\overgroup",
    "\\overleftharpoon",
    "\\overrightharpoon"
  ],
  props: {
    numArgs: 1
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);

    const isStretchy = !NON_STRETCHY_ACCENT_REGEX.test(context.funcName);

    return {
      type: "accent",
      mode: context.parser.mode,
      label: context.funcName,
      isStretchy: isStretchy,
      base: base
    };
  },
  mathmlBuilder: mathmlBuilder$a
});

// Text-mode accents
defineFunction({
  type: "accent",
  names: ["\\'", "\\`", "\\^", "\\~", "\\=", "\\c", "\\u", "\\.", '\\"', "\\r", "\\H", "\\v"],
  props: {
    numArgs: 1,
    allowedInText: true,
    allowedInMath: true,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);
    const mode = context.parser.mode;

    if (mode === "math" && context.parser.settings.strict) {
      // LaTeX only writes a warning. It doesn't stop. We'll issue the same warning.
      // eslint-disable-next-line no-console
      console.log(`Temml parse error: Command ${context.funcName} is invalid in math mode.`);
    }

    return {
      type: "accent",
      mode: mode,
      label: context.funcName,
      isStretchy: false,
      isShifty: true,
      base: base
    };
  },
  mathmlBuilder: mathmlBuilder$a
});

defineFunction({
  type: "accentUnder",
  names: [
    "\\underleftarrow",
    "\\underrightarrow",
    "\\underleftrightarrow",
    "\\undergroup",
    "\\underparen",
    "\\utilde"
  ],
  props: {
    numArgs: 1
  },
  handler: ({ parser, funcName }, args) => {
    const base = args[0];
    return {
      type: "accentUnder",
      mode: parser.mode,
      label: funcName,
      base: base
    };
  },
  mathmlBuilder: (group, style) => {
    const accentNode = stretchy.mathMLnode(group.label);
    accentNode.style["math-depth"] = 0;
    const node = new mathMLTree.MathNode("munder", [
      buildGroup$1(group.base, style),
      accentNode
    ]);
    return node;
  }
});

/**
 * This file does conversion between units.  In particular, it provides
 * calculateSize to convert other units into CSS units.
 */

const ptPerUnit = {
  // Convert to CSS (Postscipt) points, not TeX points
  // https://en.wikibooks.org/wiki/LaTeX/Lengths and
  // https://tex.stackexchange.com/a/8263
  pt: 800 / 803, // convert TeX point to CSS (Postscript) point
  pc: (12 * 800) / 803, // pica
  dd: ((1238 / 1157) * 800) / 803, // didot
  cc: ((14856 / 1157) * 800) / 803, // cicero (12 didot)
  nd: ((685 / 642) * 800) / 803, // new didot
  nc: ((1370 / 107) * 800) / 803, // new cicero (12 new didot)
  sp: ((1 / 65536) * 800) / 803, // scaled point (TeX's internal smallest unit)
  mm: (25.4 / 72),
  cm: (2.54 / 72),
  in: (1 / 72),
  px: (96 / 72)
};

/**
 * Determine whether the specified unit (either a string defining the unit
 * or a "size" parse node containing a unit field) is valid.
 */
const validUnits = [
  "em",
  "ex",
  "mu",
  "pt",
  "mm",
  "cm",
  "in",
  "px",
  "bp",
  "pc",
  "dd",
  "cc",
  "nd",
  "nc",
  "sp"
];

const validUnit = function(unit) {
  if (typeof unit !== "string") {
    unit = unit.unit;
  }
  return validUnits.indexOf(unit) > -1
};

const emScale = styleLevel => {
  const scriptLevel = Math.max(styleLevel - 1, 0);
  return [1, 0.7, 0.5][scriptLevel]
};

/*
 * Convert a "size" parse node (with numeric "number" and string "unit" fields,
 * as parsed by functions.js argType "size") into a CSS value.
 */
const calculateSize = function(sizeValue, style) {
  let number = sizeValue.number;
  if (style.maxSize[0] < 0 && number > 0) {
    return { number: 0, unit: "em" }
  }
  const unit = sizeValue.unit;
  switch (unit) {
    case "mm":
    case "cm":
    case "in":
    case "px": {
      const numInCssPts = number * ptPerUnit[unit];
      if (numInCssPts > style.maxSize[1]) {
        return { number: style.maxSize[1], unit: "pt" }
      }
      return { number, unit }; // absolute CSS units.
    }
    case "em":
    case "ex": {
      // In TeX, em and ex do not change size in \scriptstyle.
      if (unit === "ex") { number *= 0.431; }
      number = Math.min(number / emScale(style.level), style.maxSize[0]);
      return { number: utils.round(number), unit: "em" };
    }
    case "bp": {
      if (number > style.maxSize[1]) { number = style.maxSize[1]; }
      return { number, unit: "pt" }; // TeX bp is a CSS pt. (1/72 inch).
    }
    case "pt":
    case "pc":
    case "dd":
    case "cc":
    case "nd":
    case "nc":
    case "sp": {
      number = Math.min(number * ptPerUnit[unit], style.maxSize[1]);
      return { number: utils.round(number), unit: "pt" }
    }
    case "mu": {
      number = Math.min(number / 18, style.maxSize[0]);
      return { number: utils.round(number), unit: "em" }
    }
    default:
      throw new ParseError("Invalid unit: '" + unit + "'")
  }
};

// Helper functions

const padding$2 = width => {
  const node = new mathMLTree.MathNode("mspace");
  node.setAttribute("width", width + "em");
  return node
};

const paddedNode = (group, lspace = 0.3, rspace = 0) => {
  if (group == null && rspace === 0) { return padding$2(lspace) }
  const row = group ? [group] : [];
  if (lspace !== 0)   { row.unshift(padding$2(lspace)); }
  if (rspace > 0) { row.push(padding$2(rspace)); }
  return new mathMLTree.MathNode("mrow", row)
};

const labelSize = (size, scriptLevel) =>  (size / emScale(scriptLevel)).toFixed(4);

const munderoverNode = (name, body, below, style) => {
  const arrowNode = stretchy.mathMLnode(name);
  // Is this the short part of a mhchem equilibrium arrow?
  const isEq = name.slice(1, 3) === "eq";
  const minWidth = name.charAt(1) === "x"
    ? "1.75"  // mathtools extensible arrows are 1.75em long
    : name.slice(2, 4) === "cd"
    ? "3.0"  // cd package arrows
    : isEq
    ? "1.0"  // The shorter harpoon of a mhchem equilibrium arrow
    : "2.0"; // other mhchem arrows
  arrowNode.setAttribute("minsize", String(minWidth) + "em");
  arrowNode.setAttribute("lspace", "0");
  arrowNode.setAttribute("rspace", (isEq ? "0.5em" : "0"));

  // <munderover> upper and lower labels are set to scriptlevel by MathML
  // So we have to adjust our dimensions accordingly.
  const labelStyle = style.withLevel(style.level < 2 ? 2 : 3);
  const emptyLabelWidth = labelSize(minWidth, labelStyle.level);
  const lspace = labelSize((isEq ? 0 : 0.3), labelStyle.level);
  const rspace = labelSize((isEq ? 0 : 0.3), labelStyle.level);

  const upperNode = (body && body.body &&
    // \hphantom        visible content
    (body.body.body || body.body.length > 0))
    ? paddedNode(buildGroup$1(body, labelStyle), lspace, rspace)
      // Since Firefox does not recognize minsize set on the arrow,
      // create an upper node w/correct width.
    : paddedNode(null, emptyLabelWidth, 0);
  const lowerNode = (below && below.body &&
    (below.body.body || below.body.length > 0))
    ? paddedNode(buildGroup$1(below, labelStyle), lspace, rspace)
    : paddedNode(null, emptyLabelWidth, 0);
  const node = new mathMLTree.MathNode("munderover", [arrowNode, lowerNode, upperNode]);
  if (minWidth === "3.0") { node.style.height = "1em"; }
  return node
};

// Stretchy arrows with an optional argument
defineFunction({
  type: "xArrow",
  names: [
    "\\xleftarrow",
    "\\xrightarrow",
    "\\xLeftarrow",
    "\\xRightarrow",
    "\\xleftrightarrow",
    "\\xLeftrightarrow",
    "\\xhookleftarrow",
    "\\xhookrightarrow",
    "\\xmapsto",
    "\\xrightharpoondown",
    "\\xrightharpoonup",
    "\\xleftharpoondown",
    "\\xleftharpoonup",
    "\\xlongequal",
    "\\xtwoheadrightarrow",
    "\\xtwoheadleftarrow",
    // The next 5 functions are here only to support mhchem
    "\\yields",
    "\\yieldsLeft",
    "\\mesomerism",
    "\\longrightharpoonup",
    "\\longleftharpoondown",
    // The next 3 functions are here only to support the {CD} environment.
    "\\\\cdrightarrow",
    "\\\\cdleftarrow",
    "\\\\cdlongequal"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    return {
      type: "xArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    // Build the arrow and its labels.
    const node = munderoverNode(group.name, group.body, group.below, style);
    // Create operator spacing for a relation.
    const row = [node];
    row.unshift(padding$2(0.2778));
    row.push(padding$2(0.2778));
    return new mathMLTree.MathNode("mrow", row)
  }
});

const arrowComponent = {
  "\\xtofrom": ["\\xrightarrow", "\\xleftarrow"],
  "\\xleftrightharpoons": ["\\xleftharpoonup", "\\xrightharpoondown"],
  "\\xrightleftharpoons": ["\\xrightharpoonup", "\\xleftharpoondown"],
  "\\yieldsLeftRight": ["\\yields", "\\yieldsLeft"],
  // The next three all get the same harpoon glyphs. Only the lengths and paddings differ.
  "\\equilibrium": ["\\longrightharpoonup", "\\longleftharpoondown"],
  "\\equilibriumRight": ["\\longrightharpoonup", "\\eqleftharpoondown"],
  "\\equilibriumLeft": ["\\eqrightharpoonup", "\\longleftharpoondown"]
};

// Browsers are not good at stretching a glyph that contains a pair of stacked arrows such as ⇄.
// So we stack a pair of single arrows.
defineFunction({
  type: "stackedArrow",
  names: [
    "\\xtofrom",              // expfeil
    "\\xleftrightharpoons",   // mathtools
    "\\xrightleftharpoons",   // mathtools
    "\\yieldsLeftRight",      // mhchem
    "\\equilibrium",           // mhchem
    "\\equilibriumRight",
    "\\equilibriumLeft"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    const lowerArrowBody = args[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: args[0]
      }
      : null;
    const upperArrowBelow = optArgs[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: optArgs[0]
      }
      : null;
    return {
      type: "stackedArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      upperArrowBelow,
      lowerArrowBody,
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    const topLabel = arrowComponent[group.name][0];
    const botLabel = arrowComponent[group.name][1];
    const topArrow = munderoverNode(topLabel, group.body, group.upperArrowBelow, style);
    const botArrow = munderoverNode(botLabel, group.lowerArrowBody, group.below, style);
    let wrapper;

    const raiseNode = new mathMLTree.MathNode("mpadded", [topArrow]);
    raiseNode.setAttribute("voffset", "0.3em");
    raiseNode.setAttribute("height", "+0.3em");
    raiseNode.setAttribute("depth", "-0.3em");
    // One of the arrows is given ~zero width. so the other has the same horzontal alignment.
    if (group.name === "\\equilibriumLeft") {
      const botNode =  new mathMLTree.MathNode("mpadded", [botArrow]);
      botNode.setAttribute("width", "0.5em");
      wrapper = new mathMLTree.MathNode(
        "mpadded",
        [padding$2(0.2778), botNode, raiseNode, padding$2(0.2778)]
      );
    } else {
      raiseNode.setAttribute("width", (group.name === "\\equilibriumRight" ? "0.5em" : "0"));
      wrapper = new mathMLTree.MathNode(
        "mpadded",
        [padding$2(0.2778), raiseNode, botArrow, padding$2(0.2778)]
      );
    }

    wrapper.setAttribute("voffset", "-0.18em");
    wrapper.setAttribute("height", "-0.18em");
    wrapper.setAttribute("depth", "+0.18em");
    return wrapper
  }
});

/**
 * Asserts that the node is of the given type and returns it with stricter
 * typing. Throws if the node's type does not match.
 */
function assertNodeType(node, type) {
  if (!node || node.type !== type) {
    throw new Error(
      `Expected node of type ${type}, but got ` +
        (node ? `node of type ${node.type}` : String(node))
    );
  }
  return node;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
function assertSymbolNodeType(node) {
  const typedNode = checkSymbolNodeType(node);
  if (!typedNode) {
    throw new Error(
      `Expected node of symbol group type, but got ` +
        (node ? `node of type ${node.type}` : String(node))
    );
  }
  return typedNode;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
function checkSymbolNodeType(node) {
  if (node && (node.type === "atom" ||
      Object.prototype.hasOwnProperty.call(NON_ATOMS, node.type))) {
    return node;
  }
  return null;
}

const cdArrowFunctionName = {
  ">": "\\\\cdrightarrow",
  "<": "\\\\cdleftarrow",
  "=": "\\\\cdlongequal",
  A: "\\uparrow",
  V: "\\downarrow",
  "|": "\\Vert",
  ".": "no arrow"
};

const newCell = () => {
  // Create an empty cell, to be filled below with parse nodes.
  return { type: "styling", body: [], mode: "math", scriptLevel: "display" };
};

const isStartOfArrow = (node) => {
  return node.type === "textord" && node.text === "@";
};

const isLabelEnd = (node, endChar) => {
  return (node.type === "mathord" || node.type === "atom") && node.text === endChar;
};

function cdArrow(arrowChar, labels, parser) {
  // Return a parse tree of an arrow and its labels.
  // This acts in a way similar to a macro expansion.
  const funcName = cdArrowFunctionName[arrowChar];
  switch (funcName) {
    case "\\\\cdrightarrow":
    case "\\\\cdleftarrow":
      return parser.callFunction(funcName, [labels[0]], [labels[1]]);
    case "\\uparrow":
    case "\\downarrow": {
      const leftLabel = parser.callFunction("\\\\cdleft", [labels[0]], []);
      const bareArrow = {
        type: "atom",
        text: funcName,
        mode: "math",
        family: "rel"
      };
      const sizedArrow = parser.callFunction("\\Big", [bareArrow], []);
      const rightLabel = parser.callFunction("\\\\cdright", [labels[1]], []);
      const arrowGroup = {
        type: "ordgroup",
        mode: "math",
        body: [leftLabel, sizedArrow, rightLabel]
      };
      return parser.callFunction("\\\\cdparent", [arrowGroup], []);
    }
    case "\\\\cdlongequal":
      return parser.callFunction("\\\\cdlongequal", [], []);
    case "\\Vert": {
      const arrow = { type: "textord", text: "\\Vert", mode: "math" };
      return parser.callFunction("\\Big", [arrow], []);
    }
    default:
      return { type: "textord", text: " ", mode: "math" };
  }
}

function parseCD(parser) {
  // Get the array's parse nodes with \\ temporarily mapped to \cr.
  const parsedRows = [];
  parser.gullet.beginGroup();
  parser.gullet.macros.set("\\cr", "\\\\\\relax");
  parser.gullet.beginGroup();
  while (true) { // eslint-disable-line no-constant-condition
    // Get the parse nodes for the next row.
    parsedRows.push(parser.parseExpression(false, "\\\\"));
    parser.gullet.endGroup();
    parser.gullet.beginGroup();
    const next = parser.fetch().text;
    if (next === "&" || next === "\\\\") {
      parser.consume();
    } else if (next === "\\end") {
      if (parsedRows[parsedRows.length - 1].length === 0) {
        parsedRows.pop(); // final row ended in \\
      }
      break;
    } else {
      throw new ParseError("Expected \\\\ or \\cr or \\end", parser.nextToken);
    }
  }

  let row = [];
  const body = [row];

  // Loop thru the parse nodes. Collect them into cells and arrows.
  for (let i = 0; i < parsedRows.length; i++) {
    // Start a new row.
    const rowNodes = parsedRows[i];
    // Create the first cell.
    let cell = newCell();

    for (let j = 0; j < rowNodes.length; j++) {
      if (!isStartOfArrow(rowNodes[j])) {
        // If a parseNode is not an arrow, it goes into a cell.
        cell.body.push(rowNodes[j]);
      } else {
        // Parse node j is an "@", the start of an arrow.
        // Before starting on the arrow, push the cell into `row`.
        row.push(cell);

        // Now collect parseNodes into an arrow.
        // The character after "@" defines the arrow type.
        j += 1;
        const arrowChar = assertSymbolNodeType(rowNodes[j]).text;

        // Create two empty label nodes. We may or may not use them.
        const labels = new Array(2);
        labels[0] = { type: "ordgroup", mode: "math", body: [] };
        labels[1] = { type: "ordgroup", mode: "math", body: [] };

        // Process the arrow.
        if ("=|.".indexOf(arrowChar) > -1) ; else if ("<>AV".indexOf(arrowChar) > -1) {
          // Four arrows, `@>>>`, `@<<<`, `@AAA`, and `@VVV`, each take
          // two optional labels. E.g. the right-point arrow syntax is
          // really:  @>{optional label}>{optional label}>
          // Collect parseNodes into labels.
          for (let labelNum = 0; labelNum < 2; labelNum++) {
            let inLabel = true;
            for (let k = j + 1; k < rowNodes.length; k++) {
              if (isLabelEnd(rowNodes[k], arrowChar)) {
                inLabel = false;
                j = k;
                break;
              }
              if (isStartOfArrow(rowNodes[k])) {
                throw new ParseError(
                  "Missing a " + arrowChar + " character to complete a CD arrow.",
                  rowNodes[k]
                );
              }

              labels[labelNum].body.push(rowNodes[k]);
            }
            if (inLabel) {
              // isLabelEnd never returned a true.
              throw new ParseError(
                "Missing a " + arrowChar + " character to complete a CD arrow.",
                rowNodes[j]
              );
            }
          }
        } else {
          throw new ParseError(`Expected one of "<>AV=|." after @.`);
        }

        // Now join the arrow to its labels.
        const arrow = cdArrow(arrowChar, labels, parser);

        // Wrap the arrow in a styling node
        row.push(arrow);
        // In CD's syntax, cells are implicit. That is, everything that
        // is not an arrow gets collected into a cell. So create an empty
        // cell now. It will collect upcoming parseNodes.
        cell = newCell();
      }
    }
    if (i % 2 === 0) {
      // Even-numbered rows consist of: cell, arrow, cell, arrow, ... cell
      // The last cell is not yet pushed into `row`, so:
      row.push(cell);
    } else {
      // Odd-numbered rows consist of: vert arrow, empty cell, ... vert arrow
      // Remove the empty cell that was placed at the beginning of `row`.
      row.shift();
    }
    row = [];
    body.push(row);
  }
  body.pop();

  // End row group
  parser.gullet.endGroup();
  // End array group defining \\
  parser.gullet.endGroup();

  return {
    type: "array",
    mode: "math",
    body,
    envClasses: ["jot", "cd"],
    cols: [],
    hLinesBeforeRow: new Array(body.length + 1).fill([])
  };
}

// The functions below are not available for general use.
// They are here only for internal use by the {CD} environment in placing labels
// next to vertical arrows.

// We don't need any such functions for horizontal arrows because we can reuse
// the functionality that already exists for extensible arrows.

defineFunction({
  type: "cdlabel",
  names: ["\\\\cdleft", "\\\\cdright"],
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    return {
      type: "cdlabel",
      mode: parser.mode,
      side: funcName.slice(4),
      label: args[0]
    };
  },
  mathmlBuilder(group, style) {
    let label = new mathMLTree.MathNode("mrow", [buildGroup$1(group.label, style)]);
    label = new mathMLTree.MathNode("mpadded", [label]);
    label.setAttribute("width", "0");
    if (group.side === "left") {
      label.setAttribute("lspace", "-1width");
    }
    // We have to guess at vertical alignment. We know the arrow is 1.8em tall,
    // But we don't know the height or depth of the label.
    label.setAttribute("voffset", "0.7em");
    label = new mathMLTree.MathNode("mstyle", [label]);
    label.setAttribute("displaystyle", "false");
    label.setAttribute("scriptlevel", "1");
    return label;
  }
});

defineFunction({
  type: "cdlabelparent",
  names: ["\\\\cdparent"],
  props: {
    numArgs: 1
  },
  handler({ parser }, args) {
    return {
      type: "cdlabelparent",
      mode: parser.mode,
      fragment: args[0]
    };
  },
  mathmlBuilder(group, style) {
    return new mathMLTree.MathNode("mrow", [buildGroup$1(group.fragment, style)]);
  }
});

// \@char is an internal function that takes a grouped decimal argument like
// {123} and converts into symbol with code 123.  It is used by the *macro*
// \char defined in macros.js.
defineFunction({
  type: "textord",
  names: ["\\@char"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser, token }, args) {
    const arg = assertNodeType(args[0], "ordgroup");
    const group = arg.body;
    let number = "";
    for (let i = 0; i < group.length; i++) {
      const node = assertNodeType(group[i], "textord");
      number += node.text;
    }
    const code = parseInt(number);
    if (isNaN(code)) {
      throw new ParseError(`\\@char has non-numeric argument ${number}`, token)
    }
    return {
      type: "textord",
      mode: parser.mode,
      text: String.fromCodePoint(code)
    }
  }
});

// Helpers
const htmlRegEx = /^(#[a-f0-9]{3}|#?[a-f0-9]{6})$/i;
const htmlOrNameRegEx = /^(#[a-f0-9]{3}|#?[a-f0-9]{6}|[a-z]+)$/i;
const RGBregEx = /^ *\d{1,3} *(?:, *\d{1,3} *){2}$/;
const rgbRegEx = /^ *[10](?:\.\d*)? *(?:, *[10](?:\.\d*)? *){2}$/;
const xcolorHtmlRegEx = /^[a-f0-9]{6}$/i;
const toHex = num => {
  let str = num.toString(16);
  if (str.length === 1) { str = "0" + str; }
  return str
};

// Colors from Tables 4.1 and 4.2 of the xcolor package.
// Table 4.1 (lower case) RGB values are taken from chroma and xcolor.dtx.
// Table 4.2 (Capitalizzed) values were sampled, because Chroma contains a unreliable
// conversion from cmyk to RGB. See https://tex.stackexchange.com/a/537274.
const xcolors = JSON.parse(`{
  "Apricot": "#ffb484",
  "Aquamarine": "#08b4bc",
  "Bittersweet": "#c84c14",
  "blue": "#0000FF",
  "Blue": "#303494",
  "BlueGreen": "#08b4bc",
  "BlueViolet": "#503c94",
  "BrickRed": "#b8341c",
  "brown": "#BF8040",
  "Brown": "#802404",
  "BurntOrange": "#f8941c",
  "CadetBlue": "#78749c",
  "CarnationPink": "#f884b4",
  "Cerulean": "#08a4e4",
  "CornflowerBlue": "#40ace4",
  "cyan": "#00FFFF",
  "Cyan": "#08acec",
  "Dandelion": "#ffbc44",
  "darkgray": "#404040",
  "DarkOrchid": "#a8548c",
  "Emerald": "#08ac9c",
  "ForestGreen": "#089c54",
  "Fuchsia": "#90348c",
  "Goldenrod": "#ffdc44",
  "gray": "#808080",
  "Gray": "#98949c",
  "green": "#00FF00",
  "Green": "#08a44c",
  "GreenYellow": "#e0e474",
  "JungleGreen": "#08ac9c",
  "Lavender": "#f89cc4",
  "lightgray": "#c0c0c0",
  "lime": "#BFFF00",
  "LimeGreen": "#90c43c",
  "magenta": "#FF00FF",
  "Magenta": "#f0048c",
  "Mahogany": "#b0341c",
  "Maroon": "#b03434",
  "Melon": "#f89c7c",
  "MidnightBlue": "#086494",
  "Mulberry": "#b03c94",
  "NavyBlue": "#086cbc",
  "olive": "#7F7F00",
  "OliveGreen": "#407c34",
  "orange": "#FF8000",
  "Orange": "#f8843c",
  "OrangeRed": "#f0145c",
  "Orchid": "#b074ac",
  "Peach": "#f8945c",
  "Periwinkle": "#8074bc",
  "PineGreen": "#088c74",
  "pink": "#ff7f7f",
  "Plum": "#98248c",
  "ProcessBlue": "#08b4ec",
  "purple": "#BF0040",
  "Purple": "#a0449c",
  "RawSienna": "#983c04",
  "red": "#ff0000",
  "Red": "#f01c24",
  "RedOrange": "#f86434",
  "RedViolet": "#a0246c",
  "Rhodamine": "#f0549c",
  "Royallue": "#0874bc",
  "RoyalPurple": "#683c9c",
  "RubineRed": "#f0047c",
  "Salmon": "#f8948c",
  "SeaGreen": "#30bc9c",
  "Sepia": "#701404",
  "SkyBlue": "#48c4dc",
  "SpringGreen": "#c8dc64",
  "Tan": "#e09c74",
  "teal": "#007F7F",
  "TealBlue": "#08acb4",
  "Thistle": "#d884b4",
  "Turquoise": "#08b4cc",
  "violet": "#800080",
  "Violet": "#60449c",
  "VioletRed": "#f054a4",
  "WildStrawberry": "#f0246c",
  "yellow": "#FFFF00",
  "Yellow": "#fff404",
  "YellowGreen": "#98cc6c",
  "YellowOrange": "#ffa41c"
}`);

const colorFromSpec = (model, spec) => {
  let color = "";
  if (model === "HTML") {
    if (!htmlRegEx.test(spec)) {
      throw new ParseError("Invalid HTML input.")
    }
    color = spec;
  } else if (model === "RGB") {
    if (!RGBregEx.test(spec)) {
      throw new ParseError("Invalid RGB input.")
    }
    spec.split(",").map(e => { color += toHex(Number(e.trim())); });
  } else {
    if (!rgbRegEx.test(spec)) {
      throw new ParseError("Invalid rbg input.")
    }
    spec.split(",").map(e => {
      const num = Number(e.trim());
      if (num > 1) { throw new ParseError("Color rgb input must be < 1.") }
      color += toHex(Number((num * 255).toFixed(0)));
    });
  }
  if (color.charAt(0) !== "#") { color = "#" + color; }
  return color
};

const validateColor = (color, macros, token) => {
  const macroName = `\\\\color@${color}`; // from \defineColor.
  const match = htmlOrNameRegEx.exec(color);
  if (!match) { throw new ParseError("Invalid color: '" + color + "'", token) }
  // We allow a 6-digit HTML color spec without a leading "#".
  // This follows the xcolor package's HTML color model.
  // Predefined color names are all missed by this RegEx pattern.
  if (xcolorHtmlRegEx.test(color)) {
    return "#" + color
  } else if (color.charAt(0) === "#") {
    return color
  } else if (macros.has(macroName)) {
    color = macros.get(macroName).tokens[0].text;
  } else if (xcolors[color]) {
    color = xcolors[color];
  }
  return color
};

const mathmlBuilder$9 = (group, style) => {
  // In LaTeX, color is not supposed to change the spacing of any node.
  // So instead of wrapping the group in an <mstyle>, we apply
  // the color individually to each node and return a document fragment.
  let expr = buildExpression(group.body, style.withColor(group.color));
  expr = expr.map(e => {
    e.style.color = group.color;
    return e
  });
  return mathMLTree.newDocumentFragment(expr)
};

defineFunction({
  type: "color",
  names: ["\\textcolor"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "original"]
  },
  handler({ parser, token }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros, token);
    }
    const body = args[1];
    return {
      type: "color",
      mode: parser.mode,
      color,
      body: ordargument(body)
    }
  },
  mathmlBuilder: mathmlBuilder$9
});

defineFunction({
  type: "color",
  names: ["\\color"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw"]
  },
  handler({ parser, token }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros, token);
    }

    // Set macro \current@color in current namespace to store the current
    // color, mimicking the behavior of color.sty.
    // This is currently used just to correctly color a \right
    // that follows a \color command.
    parser.gullet.macros.set("\\current@color", color);

    // Parse out the implicit body that should be colored.
    // Since \color nodes should not be nested, break on \color.
    const body = parser.parseExpression(true, "\\color");

    return {
      type: "color",
      mode: parser.mode,
      color,
      body
    }
  },
  mathmlBuilder: mathmlBuilder$9
});

defineFunction({
  type: "color",
  names: ["\\definecolor"],
  props: {
    numArgs: 3,
    allowedInText: true,
    argTypes: ["raw", "raw", "raw"]
  },
  handler({ parser, funcName, token }, args) {
    const name = assertNodeType(args[0], "raw").string;
    if (!/^[A-Za-z]+$/.test(name)) {
      throw new ParseError("Color name must be latin letters.", token)
    }
    const model = assertNodeType(args[1], "raw").string;
    if (!["HTML", "RGB", "rgb"].includes(model)) {
      throw new ParseError("Color model must be HTML, RGB, or rgb.", token)
    }
    const spec = assertNodeType(args[2], "raw").string;
    const color = colorFromSpec(model, spec);
    parser.gullet.macros.set(`\\\\color@${name}`, { tokens: [{ text: color }], numArgs: 0 });
    return { type: "internal", mode: parser.mode }
  }
  // No mathmlBuilder. The point of \definecolor is to set a macro.
});

// Row breaks within tabular environments, and line breaks at top level

// \DeclareRobustCommand\\{...\@xnewline}
defineFunction({
  type: "cr",
  names: ["\\\\"],
  props: {
    numArgs: 0,
    numOptionalArgs: 0,
    allowedInText: true
  },

  handler({ parser }, args, optArgs) {
    const size = parser.gullet.future().text === "[" ? parser.parseSizeGroup(true) : null;
    const newLine = !parser.settings.displayMode;
    return {
      type: "cr",
      mode: parser.mode,
      newLine,
      size: size && assertNodeType(size, "size").value
    }
  },

  // The following builder is called only at the top level,
  // not within tabular/array environments.

  mathmlBuilder(group, style) {
    // MathML 3.0 calls for newline to occur in an <mo> or an <mspace>.
    // Ref: https://www.w3.org/TR/MathML3/chapter3.html#presm.linebreaking
    const node = new mathMLTree.MathNode("mo");
    if (group.newLine) {
      node.setAttribute("linebreak", "newline");
      if (group.size) {
        const size = calculateSize(group.size, style);
        node.setAttribute("height", size.number + size.unit);
      }
    }
    return node
  }
});

const globalMap = {
  "\\global": "\\global",
  "\\long": "\\\\globallong",
  "\\\\globallong": "\\\\globallong",
  "\\def": "\\gdef",
  "\\gdef": "\\gdef",
  "\\edef": "\\xdef",
  "\\xdef": "\\xdef",
  "\\let": "\\\\globallet",
  "\\futurelet": "\\\\globalfuture"
};

const checkControlSequence = (tok) => {
  const name = tok.text;
  if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) {
    throw new ParseError("Expected a control sequence", tok);
  }
  return name;
};

const getRHS = (parser) => {
  let tok = parser.gullet.popToken();
  if (tok.text === "=") {
    // consume optional equals
    tok = parser.gullet.popToken();
    if (tok.text === " ") {
      // consume one optional space
      tok = parser.gullet.popToken();
    }
  }
  return tok;
};

const letCommand = (parser, name, tok, global) => {
  let macro = parser.gullet.macros.get(tok.text);
  if (macro == null) {
    // don't expand it later even if a macro with the same name is defined
    // e.g., \let\foo=\frac \def\frac{\relax} \frac12
    tok.noexpand = true;
    macro = {
      tokens: [tok],
      numArgs: 0,
      // reproduce the same behavior in expansion
      unexpandable: !parser.gullet.isExpandable(tok.text)
    };
  }
  parser.gullet.macros.set(name, macro, global);
};

// <assignment> -> <non-macro assignment>|<macro assignment>
// <non-macro assignment> -> <simple assignment>|\global<non-macro assignment>
// <macro assignment> -> <definition>|<prefix><macro assignment>
// <prefix> -> \global|\long|\outer
defineFunction({
  type: "internal",
  names: [
    "\\global",
    "\\long",
    "\\\\globallong" // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler({ parser, funcName }) {
    parser.consumeSpaces();
    const token = parser.fetch();
    if (globalMap[token.text]) {
      // Temml doesn't have \par, so ignore \long
      if (funcName === "\\global" || funcName === "\\\\globallong") {
        token.text = globalMap[token.text];
      }
      return assertNodeType(parser.parseFunction(), "internal");
    }
    throw new ParseError(`Invalid token after macro prefix`, token);
  }
});

// Basic support for macro definitions: \def, \gdef, \edef, \xdef
// <definition> -> <def><control sequence><definition text>
// <def> -> \def|\gdef|\edef|\xdef
// <definition text> -> <parameter text><left brace><balanced text><right brace>
defineFunction({
  type: "internal",
  names: ["\\def", "\\gdef", "\\edef", "\\xdef"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    let tok = parser.gullet.popToken();
    const name = tok.text;
    if (/^(?:[\\{}$&#^_]|EOF)$/.test(name)) {
      throw new ParseError("Expected a control sequence", tok);
    }

    let numArgs = 0;
    let insert;
    const delimiters = [[]];
    // <parameter text> contains no braces
    while (parser.gullet.future().text !== "{") {
      tok = parser.gullet.popToken();
      if (tok.text === "#") {
        // If the very last character of the <parameter text> is #, so that
        // this # is immediately followed by {, TeX will behave as if the {
        // had been inserted at the right end of both the parameter text
        // and the replacement text.
        if (parser.gullet.future().text === "{") {
          insert = parser.gullet.future();
          delimiters[numArgs].push("{");
          break;
        }

        // A parameter, the first appearance of # must be followed by 1,
        // the next by 2, and so on; up to nine #’s are allowed
        tok = parser.gullet.popToken();
        if (!/^[1-9]$/.test(tok.text)) {
          throw new ParseError(`Invalid argument number "${tok.text}"`);
        }
        if (parseInt(tok.text) !== numArgs + 1) {
          throw new ParseError(`Argument number "${tok.text}" out of order`);
        }
        numArgs++;
        delimiters.push([]);
      } else if (tok.text === "EOF") {
        throw new ParseError("Expected a macro definition");
      } else {
        delimiters[numArgs].push(tok.text);
      }
    }
    // replacement text, enclosed in '{' and '}' and properly nested
    let { tokens } = parser.gullet.consumeArg();
    if (insert) {
      tokens.unshift(insert);
    }

    if (funcName === "\\edef" || funcName === "\\xdef") {
      tokens = parser.gullet.expandTokens(tokens);
      tokens.reverse(); // to fit in with stack order
    }
    // Final arg is the expansion of the macro
    parser.gullet.macros.set(
      name,
      { tokens, numArgs, delimiters },
      funcName === globalMap[funcName]
    );
    return { type: "internal", mode: parser.mode };
  }
});

// <simple assignment> -> <let assignment>
// <let assignment> -> \futurelet<control sequence><token><token>
//     | \let<control sequence><equals><one optional space><token>
// <equals> -> <optional spaces>|<optional spaces>=
defineFunction({
  type: "internal",
  names: [
    "\\let",
    "\\\\globallet" // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    const name = checkControlSequence(parser.gullet.popToken());
    parser.gullet.consumeSpaces();
    const tok = getRHS(parser);
    letCommand(parser, name, tok, funcName === "\\\\globallet");
    return { type: "internal", mode: parser.mode };
  }
});

// ref: https://www.tug.org/TUGboat/tb09-3/tb22bechtolsheim.pdf
defineFunction({
  type: "internal",
  names: [
    "\\futurelet",
    "\\\\globalfuture" // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    const name = checkControlSequence(parser.gullet.popToken());
    const middle = parser.gullet.popToken();
    const tok = parser.gullet.popToken();
    letCommand(parser, name, tok, funcName === "\\\\globalfuture");
    parser.gullet.pushToken(tok);
    parser.gullet.pushToken(middle);
    return { type: "internal", mode: parser.mode };
  }
});

defineFunction({
  type: "internal",
  names: ["\\newcommand", "\\renewcommand", "\\providecommand"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    let name = "";
    const tok = parser.gullet.popToken();
    if (tok.text === "{") {
      name = checkControlSequence(parser.gullet.popToken());
      parser.gullet.popToken();
    } else {
      name = checkControlSequence(tok);
    }

    const exists = parser.gullet.isDefined(name);
    if (exists && funcName === "\\newcommand") {
      throw new ParseError(
        `\\newcommand{${name}} attempting to redefine ${name}; use \\renewcommand`
      );
    }
    if (!exists && funcName === "\\renewcommand") {
      throw new ParseError(
        `\\renewcommand{${name}} when command ${name} does not yet exist; use \\newcommand`
      );
    }

    let numArgs = 0;
    if (parser.gullet.future().text === "[") {
      let tok = parser.gullet.popToken();
      tok = parser.gullet.popToken();
      if (!/^[0-9]$/.test(tok.text)) {
        throw new ParseError(`Invalid number of arguments: "${tok.text}"`);
      }
      numArgs = parseInt(tok.text);
      tok = parser.gullet.popToken();
      if (tok.text !== "]") {
        throw new ParseError(`Invalid argument "${tok.text}"`);
      }
    }

    // replacement text, enclosed in '{' and '}' and properly nested
    const { tokens } = parser.gullet.consumeArg();

    parser.gullet.macros.set(
      name,
      { tokens, numArgs },
      !parser.settings.strict
    );

    return { type: "internal", mode: parser.mode };

  }
});

// Extra data needed for the delimiter handler down below
const delimiterSizes = {
  "\\bigl": { mclass: "mopen", size: 1 },
  "\\Bigl": { mclass: "mopen", size: 2 },
  "\\biggl": { mclass: "mopen", size: 3 },
  "\\Biggl": { mclass: "mopen", size: 4 },
  "\\bigr": { mclass: "mclose", size: 1 },
  "\\Bigr": { mclass: "mclose", size: 2 },
  "\\biggr": { mclass: "mclose", size: 3 },
  "\\Biggr": { mclass: "mclose", size: 4 },
  "\\bigm": { mclass: "mrel", size: 1 },
  "\\Bigm": { mclass: "mrel", size: 2 },
  "\\biggm": { mclass: "mrel", size: 3 },
  "\\Biggm": { mclass: "mrel", size: 4 },
  "\\big": { mclass: "mord", size: 1 },
  "\\Big": { mclass: "mord", size: 2 },
  "\\bigg": { mclass: "mord", size: 3 },
  "\\Bigg": { mclass: "mord", size: 4 }
};

const delimiters = [
  "(",
  "\\lparen",
  ")",
  "\\rparen",
  "[",
  "\\lbrack",
  "]",
  "\\rbrack",
  "\\{",
  "\\lbrace",
  "\\}",
  "\\rbrace",
  "\\lfloor",
  "\\rfloor",
  "\u230a",
  "\u230b",
  "\\lceil",
  "\\rceil",
  "\u2308",
  "\u2309",
  "<",
  ">",
  "\\langle",
  "\u27e8",
  "\\rangle",
  "\u27e9",
  "\\lt",
  "\\gt",
  "\\lvert",
  "\\rvert",
  "\\lVert",
  "\\rVert",
  "\\lgroup",
  "\\rgroup",
  "\u27ee",
  "\u27ef",
  "\\lmoustache",
  "\\rmoustache",
  "\u23b0",
  "\u23b1",
  "\\llbracket",
  "\\rrbracket",
  "\u27e6",
  "\u27e6",
  "\\lBrace",
  "\\rBrace",
  "\u2983",
  "\u2984",
  "/",
  "\\backslash",
  "|",
  "\\vert",
  "\\|",
  "\\Vert",
  "\\uparrow",
  "\\Uparrow",
  "\\downarrow",
  "\\Downarrow",
  "\\updownarrow",
  "\\Updownarrow",
  "."
];

// Export isDelimiter for benefit of parser.
const dels = ["}", "\\left", "\\middle", "\\right"];
const isDelimiter = str => str.length > 0 &&
  (delimiters.includes(str) || delimiterSizes[str] || dels.includes(str));

// Metrics of the different sizes. Found by looking at TeX's output of
// $\bigl| // \Bigl| \biggl| \Biggl| \showlists$
// Used to create stacked delimiters of appropriate sizes in makeSizedDelim.
const sizeToMaxHeight = [0, 1.2, 1.8, 2.4, 3.0];

// Delimiter functions
function checkDelimiter(delim, context) {
  if (delim.type === "ordgroup" && delim.body.length === 1 && delim.body[0].text === "\u2044") {
    // Recover "/" from the zero spacing group. (See macros.js)
    delim = { type: "textord", text: "/", mode: "math" };
  }
  const symDelim = checkSymbolNodeType(delim);
  if (symDelim && delimiters.includes(symDelim.text)) {
    // If a character is not in the MathML operator dictionary, it will not stretch.
    // Replace such characters w/characters that will stretch.
    if (["<", "\\lt"].includes(symDelim.text)) { symDelim.text = "⟨"; }
    if ([">", "\\gt"].includes(symDelim.text)) { symDelim.text = "⟩"; }
    if (symDelim.text === "/") { symDelim.text = "\u2215"; }
    if (symDelim.text === "\\backslash") { symDelim.text = "\u2216"; }
    return symDelim;
  } else if (symDelim) {
    throw new ParseError(`Invalid delimiter '${symDelim.text}' after '${context.funcName}'`, delim);
  } else {
    throw new ParseError(`Invalid delimiter type '${delim.type}'`, delim);
  }
}

defineFunction({
  type: "delimsizing",
  names: [
    "\\bigl",
    "\\Bigl",
    "\\biggl",
    "\\Biggl",
    "\\bigr",
    "\\Bigr",
    "\\biggr",
    "\\Biggr",
    "\\bigm",
    "\\Bigm",
    "\\biggm",
    "\\Biggm",
    "\\big",
    "\\Big",
    "\\bigg",
    "\\Bigg"
  ],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);

    return {
      type: "delimsizing",
      mode: context.parser.mode,
      size: delimiterSizes[context.funcName].size,
      mclass: delimiterSizes[context.funcName].mclass,
      delim: delim.text
    };
  },
  mathmlBuilder: (group) => {
    const children = [];

    if (group.delim === ".") { group.delim = ""; }
    children.push(makeText(group.delim, group.mode));

    const node = new mathMLTree.MathNode("mo", children);

    if (group.mclass === "mopen" || group.mclass === "mclose") {
      // Only some of the delimsizing functions act as fences, and they
      // return "mopen" or "mclose" mclass.
      node.setAttribute("fence", "true");
    } else {
      // Explicitly disable fencing if it's not a fence, to override the
      // defaults.
      node.setAttribute("fence", "false");
    }
    if (group.delim === "\u2216" || group.delim.indexOf("arrow") > -1) {
      // \backslash is not in the operator dictionary,
      // so we have to explicitly set stretchy to true.
      node.setAttribute("stretchy", "true");
    }

    node.setAttribute("symmetric", "true"); // Needed for tall arrows in Firefox.
    node.setAttribute("minsize", sizeToMaxHeight[group.size] + "em");
    // Don't set the maxsize attribute. It's broken in Chromium.
    return node;
  }
});

function assertParsed(group) {
  if (!group.body) {
    throw new Error("Bug: The leftright ParseNode wasn't fully parsed.");
  }
}

defineFunction({
  type: "leftright-right",
  names: ["\\right"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    // \left case below triggers parsing of \right in
    //   `const right = parser.parseFunction();`
    // uses this return value.
    const color = context.parser.gullet.macros.get("\\current@color");
    if (color && typeof color !== "string") {
      throw new ParseError("\\current@color set to non-string in \\right");
    }
    return {
      type: "leftright-right",
      mode: context.parser.mode,
      delim: checkDelimiter(args[0], context).text,
      color // undefined if not set via \color
    };
  }
});

defineFunction({
  type: "leftright",
  names: ["\\left"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);

    const parser = context.parser;
    // Parse out the implicit body
    ++parser.leftrightDepth;
    // parseExpression stops before '\\right'
    const body = parser.parseExpression(false);
    --parser.leftrightDepth;
    // Check the next token
    parser.expect("\\right", false);
    const right = assertNodeType(parser.parseFunction(), "leftright-right");
    return {
      type: "leftright",
      mode: parser.mode,
      body,
      left: delim.text,
      right: right.delim,
      rightColor: right.color
    };
  },
  mathmlBuilder: (group, style) => {
    assertParsed(group);
    const inner = buildExpression(group.body, style);

    if (group.left === ".") { group.left = ""; }
    const leftNode = new mathMLTree.MathNode("mo", [makeText(group.left, group.mode)]);
    leftNode.setAttribute("fence", "true");
    leftNode.setAttribute("form", "prefix");
    if (group.left === "\u2216" || group.left.indexOf("arrow") > -1) {
      leftNode.setAttribute("stretchy", "true");
    }
    inner.unshift(leftNode);

    if (group.right === ".") { group.right = ""; }
    const rightNode = new mathMLTree.MathNode("mo", [makeText(group.right, group.mode)]);
    rightNode.setAttribute("fence", "true");
    rightNode.setAttribute("form", "postfix");
    if (group.right === "\u2216" || group.right.indexOf("arrow") > -1) {
      rightNode.setAttribute("stretchy", "true");
    }
    if (group.rightColor) { rightNode.style.color =  group.rightColor; }
    inner.push(rightNode);

    return makeRow(inner);
  }
});

defineFunction({
  type: "middle",
  names: ["\\middle"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);
    if (!context.parser.leftrightDepth) {
      throw new ParseError("\\middle without preceding \\left", delim);
    }

    return {
      type: "middle",
      mode: context.parser.mode,
      delim: delim.text
    };
  },
  mathmlBuilder: (group, style) => {
    const textNode = makeText(group.delim, group.mode);
    const middleNode = new mathMLTree.MathNode("mo", [textNode]);
    middleNode.setAttribute("fence", "true");
    if (group.delim.indexOf("arrow") > -1) {
      middleNode.setAttribute("stretchy", "true");
    }
    // The next line is not semantically correct, but
    // Chromium fails to stretch if it is not there.
    middleNode.setAttribute("form", "prefix");
    // MathML gives 5/18em spacing to each <mo> element.
    // \middle should get delimiter spacing instead.
    middleNode.setAttribute("lspace", "0.05em");
    middleNode.setAttribute("rspace", "0.05em");
    return middleNode;
  }
});

const padding$1 = _ => {
  const node = new mathMLTree.MathNode("mspace");
  node.setAttribute("width", "3pt");
  return node
};

const mathmlBuilder$8 = (group, style) => {
  let node;
  if (group.label.indexOf("colorbox") > -1) {
    // Chrome mpadded +width attribute is broken. Insert <mspace>
    node = new mathMLTree.MathNode("mpadded", [
      padding$1(),
      buildGroup$1(group.body, style),
      padding$1()
    ]);
  } else {
    node = new mathMLTree.MathNode("menclose", [buildGroup$1(group.body, style)]);
  }
  switch (group.label) {
    case "\\overline":
      node.setAttribute("notation", "top");
      node.style.padding = "0.1em 0 0 0";
      node.style.borderTop = "0.065em solid";
      break
    case "\\underline":
      node.setAttribute("notation", "bottom");
      node.style.padding = "0 0 0.1em 0";
      node.style.borderBottom = "0.065em solid";
      break
    case "\\cancel":
      node.setAttribute("notation", "updiagonalstrike");
      node.classes.push("cancel");
      break
    case "\\bcancel":
      node.setAttribute("notation", "downdiagonalstrike");
      node.classes.push("bcancel");
      break
    /*
    case "\\longdiv":
      node.setAttribute("notation", "longdiv");
      break
    case "\\phase":
      node.setAttribute("notation", "phasorangle");
      break */
    case "\\angl":
      node.setAttribute("notation", "actuarial");
      node.style.padding = "0.03889em 0.03889em 0 0.03889em";
      node.style.borderTop = "0.049em solid";
      node.style.borderRight = "0.049em solid";
      node.style.marginRight = "0.03889em";
      break
    case "\\sout":
      node.setAttribute("notation", "horizontalstrike");
      node.style["text-decoration"] = "line-through 0.08em solid";
      break
    case "\\fbox":
      node.setAttribute("notation", "box");
      node.style = { padding: "3pt", border: "1px solid" };
      break
    case "\\fcolorbox":
    case "\\colorbox": {
      // <menclose> doesn't have a good notation option for \colorbox.
      // So use <mpadded> instead. Set some attributes that come
      // included with <menclose>.
      //const fboxsep = 3; // 3 pt from LaTeX source2e
      //node.setAttribute("height", `+${2 * fboxsep}pt`)
      //node.setAttribute("voffset", `${fboxsep}pt`)
      const style = { padding: "3pt 0 3pt 0" };

      if (group.label === "\\fcolorbox") {
        style.border = "0.06em solid " + String(group.borderColor);
      }
      node.style = style;
      break
    }
    case "\\xcancel":
      node.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
      node.classes.push("xcancel");
      break
  }
  if (group.backgroundColor) {
    node.setAttribute("mathbackground", group.backgroundColor);
  }
  return node;
};

defineFunction({
  type: "enclose",
  names: ["\\colorbox"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "text"]
  },
  handler({ parser, funcName }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros);
    }
    const body = args[1];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor: color,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$8
});

defineFunction({
  type: "enclose",
  names: ["\\fcolorbox"],
  props: {
    numArgs: 3,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "raw", "text"]
  },
  handler({ parser, funcName }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let borderColor = "";
    let backgroundColor;
    if (model) {
      const borderSpec = assertNodeType(args[0], "raw").string;
      const backgroundSpec = assertNodeType(args[0], "raw").string;
      borderColor = colorFromSpec(model, borderSpec);
      backgroundColor = colorFromSpec(model, backgroundSpec);
    } else {
      borderColor = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros);
      backgroundColor = validateColor(assertNodeType(args[1], "raw").string, parser.gullet.macros);
    }
    const body = args[2];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor,
      borderColor,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$8
});

defineFunction({
  type: "enclose",
  names: ["\\fbox"],
  props: {
    numArgs: 1,
    argTypes: ["hbox"],
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "enclose",
      mode: parser.mode,
      label: "\\fbox",
      body: args[0]
    };
  }
});

defineFunction({
  type: "enclose",
  names: ["\\angl", "\\cancel", "\\bcancel", "\\xcancel", "\\sout", "\\overline"],
   // , "\\phase", "\\longdiv"
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$8
});

defineFunction({
  type: "enclose",
  names: ["\\underline"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$8
});

/**
 * All registered environments.
 * `environments.js` exports this same dictionary again and makes it public.
 * `Parser.js` requires this dictionary via `environments.js`.
 */
const _environments = {};

function defineEnvironment({ type, names, props, handler, mathmlBuilder }) {
  // Set default values of environments.
  const data = {
    type,
    numArgs: props.numArgs || 0,
    allowedInText: false,
    numOptionalArgs: 0,
    handler
  };
  for (let i = 0; i < names.length; ++i) {
    _environments[names[i]] = data;
  }
  if (mathmlBuilder) {
    _mathmlGroupBuilders[type] = mathmlBuilder;
  }
}

// In TeX, there are actually three sets of dimensions, one for each of

// Math style is not quite the same thing as script level.
const StyleLevel = {
  DISPLAY: 0,
  TEXT: 1,
  SCRIPT: 2,
  SCRIPTSCRIPT: 3
};

// Helper functions
function getHLines(parser) {
  // Return an array. The array length = number of hlines.
  // Each element in the array tells if the line is dashed.
  const hlineInfo = [];
  parser.consumeSpaces();
  let nxt = parser.fetch().text;
  if (nxt === "\\relax") {
    parser.consume();
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  while (nxt === "\\hline" || nxt === "\\hdashline") {
    parser.consume();
    hlineInfo.push(nxt === "\\hdashline");
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  return hlineInfo;
}

const validateAmsEnvironmentContext = context => {
  const settings = context.parser.settings;
  if (!settings.displayMode) {
    throw new ParseError(`{${context.envName}} can be used only in display mode.`);
  }
};

const getTag = (group, style, rowNum) => {
  let tag;
  const tagContents = group.tags.shift();
  if (tagContents) {
    // The author has written a \tag or a \notag in this row.
    if (tagContents.body) {
      tag = buildExpressionRow(tagContents.body, style);
      tag.classes = ["tml-tag"];
    } else {
      // \notag. Return an empty span.
      tag = new mathMLTree.MathNode("mtext", [], []);
      return tag
    }
  } else if (group.envClasses.includes("multline") &&
    ((group.leqno && rowNum !== 0) || (!group.leqno && rowNum !== group.body.length - 1))) {
    // A multiline that does not receive a tag. Return an empty cell.
    tag = new mathMLTree.MathNode("mtext", [], []);
    return tag
  } else {
    // AMS automatcally numbered equaton.
    // Insert a class so the element can be populated by a post-processor.
    tag = new mathMLTree.MathNode("mtext", [], ["tml-eqn"]);
  }
  return tag
};

/**
 * Parse the body of the environment, with rows delimited by \\ and
 * columns delimited by &, and create a nested list in row-major order
 * with one group per cell.  If given an optional argument scriptLevel
 * ("text", "display", etc.), then each cell is cast into that scriptLevel.
 */
function parseArray(
  parser,
  {
    cols, // [{ type: string , align: l|c|r|null }]
    envClasses, // align(ed|at|edat) | array | cases | cd | small | multline
    addEqnNum, // boolean
    singleRow, // boolean
    emptySingleRow, // boolean
    maxNumCols, // number
    leqno // boolean
  },
  scriptLevel
) {
  parser.gullet.beginGroup();
  if (!singleRow) {
    // \cr is equivalent to \\ without the optional size argument (see below)
    // TODO: provide helpful error when \cr is used outside array environment
    parser.gullet.macros.set("\\cr", "\\\\\\relax");
  }
  if (addEqnNum) {
    parser.gullet.macros.set("\\tag", "\\env@tag{\\text{#1}}");
    parser.gullet.macros.set("\\notag", "\\env@notag");
    parser.gullet.macros.set("\\nonumber", "\\env@notag");
  }

  // Start group for first cell
  parser.gullet.beginGroup();

  let row = [];
  const body = [row];
  const rowGaps = [];
  const tags = [];
  let rowTag;
  const hLinesBeforeRow = [];

  // Test for \hline at the top of the array.
  hLinesBeforeRow.push(getHLines(parser));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Parse each cell in its own group (namespace)
    let cell = parser.parseExpression(false, singleRow ? "\\end" : "\\\\");

    if (addEqnNum && !rowTag) {
      // Check if the author wrote a \tag{} inside this cell.
      for (let i = 0; i < cell.length; i++) {
        if (cell[i].type === "envTag" || cell[i].type === "noTag") {
          // Get the contents of the \text{} nested inside the \env@Tag{}
          rowTag = cell[i].type === "envTag"
            ? cell.splice(i, 1)[0].body.body[0]
            : { body: null };
          break
        }
      }
    }
    parser.gullet.endGroup();
    parser.gullet.beginGroup();

    cell = {
      type: "ordgroup",
      mode: parser.mode,
      body: cell
    };
    row.push(cell);
    const next = parser.fetch().text;
    if (next === "&") {
      if (maxNumCols && row.length === maxNumCols) {
        if (envClasses.includes("array")) {
          if (parser.settings.strict) {
            throw new ParseError("Too few columns " + "specified in the {array} column argument.",
              parser.nextToken)
          }
        } else if (maxNumCols === 2) {
          throw new ParseError("The split environment accepts no more than two columns",
            parser.nextToken);
        } else {
          throw new ParseError("The equation environment accepts only one column",
            parser.nextToken)
        }
      }
      parser.consume();
    } else if (next === "\\end") {
      // Arrays terminate newlines with `\crcr` which consumes a `\cr` if
      // the last line is empty.  However, AMS environments keep the
      // empty row if it's the only one.
      // NOTE: Currently, `cell` is the last item added into `row`.
      if (row.length === 1 && cell.body.length === 0 && (body.length > 1 || !emptySingleRow)) {
        body.pop();
      }
      if (hLinesBeforeRow.length < body.length + 1) {
        hLinesBeforeRow.push([]);
      }
      break;
    } else if (next === "\\\\") {
      parser.consume();
      let size;
      // \def\Let@{\let\\\math@cr}
      // \def\math@cr{...\math@cr@}
      // \def\math@cr@{\new@ifnextchar[\math@cr@@{\math@cr@@[\z@]}}
      // \def\math@cr@@[#1]{...\math@cr@@@...}
      // \def\math@cr@@@{\cr}
      if (parser.gullet.future().text !== " ") {
        size = parser.parseSizeGroup(true);
      }
      rowGaps.push(size ? size.value : null);

      tags.push(rowTag);

      // check for \hline(s) following the row separator
      hLinesBeforeRow.push(getHLines(parser));

      row = [];
      rowTag = null;
      body.push(row);
    } else {
      throw new ParseError("Expected & or \\\\ or \\cr or \\end", parser.nextToken);
    }
  }

  // End cell group
  parser.gullet.endGroup();
  // End array group defining \cr
  parser.gullet.endGroup();

  tags.push(rowTag);

  return {
    type: "array",
    mode: parser.mode,
    body,
    cols,
    rowGaps,
    hLinesBeforeRow,
    envClasses,
    addEqnNum,
    scriptLevel,
    tags,
    leqno
  };
}

// Decides on a scriptLevel for cells in an array according to whether the given
// environment name starts with the letter 'd'.
function dCellStyle(envName) {
  return envName.slice(0, 1) === "d" ? "display" : "text"
}

const alignMap = {
  c: "center ",
  l: "left ",
  r: "right "
};

const glue = group => {
  const glueNode = new mathMLTree.MathNode("mtd", []);
  glueNode.style = { padding: "0", width: "50%" };
  if (group.envClasses.includes("multline")) {
    glueNode.style.width = "7.5%";
  }
  return glueNode
};

const mathmlBuilder$7 = function(group, style) {
  const tbl = [];
  const numRows = group.body.length;
  const hlines = group.hLinesBeforeRow;

  for (let i = 0; i < numRows; i++) {
    const rw = group.body[i];
    const row = [];
    const cellLevel = group.scriptLevel === "text"
      ? StyleLevel.TEXT
      : group.scriptLevel === "script"
      ? StyleLevel.SCRIPT
      : StyleLevel.DISPLAY;

    for (let j = 0; j < rw.length; j++) {
      const mtd = new mathMLTree.MathNode(
        "mtd",
        [buildGroup$1(rw[j], style.withLevel(cellLevel))]
      );

      if (group.envClasses.includes("multline")) {
        const align = i === 0 ? "left" : i === numRows - 1 ? "right" : "center";
        mtd.setAttribute("columnalign", align);
        if (align !== "center") {
          mtd.style.textAlign = "-webkit-" + align;
        }
      }
      row.push(mtd);
    }
    if (group.addEqnNum) {
      row.unshift(glue(group));
      row.push(glue(group));
      const tag = getTag(group, style.withLevel(cellLevel), i);
      if (group.leqno) {
        row[0].children.push(tag);
        row[0].style.textAlign = "-webkit-left";
      } else {
        row[row.length - 1].children.push(tag);
        row[row.length - 1].style.textAlign = "-webkit-right";
      }
    }
    const mtr = new mathMLTree.MathNode("mtr", row, []);
    // Write horizontal rules
    if (i === 0 && hlines[0].length > 0) {
      if (hlines[0].length === 2) {
        mtr.classes.push("tml-top-double");
      } else {
        mtr.classes.push(hlines[0][0] ? "tml-top-dashed" : "tml-top-solid");
      }
    }
    if (hlines[i + 1].length > 0) {
      if (hlines[i + 1].length === 2) {
        mtr.classes.push("tml-hline-double");
      } else {
        mtr.classes.push(hlines[i + 1][0] ? "tml-hline-dashed" : "tml-hline-solid");
      }
    }
    tbl.push(mtr);
  }
  let table = new mathMLTree.MathNode("mtable", tbl);
  if (group.envClasses.length > 0) {
    table.classes = group.envClasses.map(e => "tml-" + e);
  }
  if (group.scriptLevel === "display") { table.setAttribute("displaystyle", "true"); }

  if (group.addEqnNum || group.envClasses.includes("multline")) {
    table.style.width = "100%";
  }

  // Column separator lines and column alignment
  let align = "";

  if (group.cols && group.cols.length > 0) {
    const cols = group.cols;
    let prevTypeWasAlign = false;
    let iStart = 0;
    let iEnd = cols.length;

    while (cols[iStart].type === "separator") {
      iStart += 1;
    }
    while (cols[iEnd - 1].type === "separator") {
      iEnd -= 1;
    }

    if (cols[0].type === "separator") {
      const sep = cols[1].type === "separator"
        ? "0.15em double"
        : cols[0].separator === "|"
        ? "0.06em solid "
        : "0.06em dashed ";
      for (const row of table.children) {
        row.children[0].style.borderLeft = sep;
      }
    }
    let iCol = group.addEqnNum ? 0 : -1;
    for (let i = iStart; i < iEnd; i++) {
      if (cols[i].type === "align") {
        const colAlign = alignMap[cols[i].align];
        align += colAlign;
        iCol += 1;
        for (const row of table.children) {
          if (colAlign.trim() !== "center" && iCol < row.children.length) {
            row.children[iCol].style.textAlign = "-webkit-" + colAlign.trim();
          }
        }
        prevTypeWasAlign = true;
      } else if (cols[i].type === "separator") {
        // MathML accepts only single lines between cells.
        // So we read only the first of consecutive separators.
        if (prevTypeWasAlign) {
          const sep = cols[i + 1].type === "separator"
            ? "0.15em double"
            : cols[i].separator === "|"
            ? "0.06em solid"
            : "0.06em dashed";
          for (const row of table.children) {
            if (iCol < row.children.length) {
              row.children[iCol].style.borderRight = sep;
            }
          }
        }
        prevTypeWasAlign = false;
      }
    }
    if (cols[cols.length - 1].type === "separator") {
      const sep = cols[cols.length - 2].type === "separator"
        ? "0.15em double"
        : cols[cols.length - 1].separator === "|"
        ? "0.06em solid"
        : "0.06em dashed";
      for (const row of table.children) {
        row.children[row.children.length - 1].style.borderRight = sep;
        row.children[row.children.length - 1].style.paddingRight = "0.4em";
      }
    }
  }
  if (group.addEqnNum) {
     // allow for glue cells on each side
    align = "left " + (align.length > 0 ? align : "center ") + "right ";
  }
  if (align) {
    table.setAttribute("columnalign", align.trim());
  }

  if (group.envClasses.includes("small")) {
    // A small array. Wrap in scriptstyle.
    table = new mathMLTree.MathNode("mstyle", [table]);
    table.setAttribute("scriptlevel", "1");
  }

  return table
};

// Convenience function for align, align*, aligned, alignat, alignat*, alignedat, split.
const alignedHandler = function(context, args) {
  if (context.envName.indexOf("ed") === -1) {
    validateAmsEnvironmentContext(context);
  }
  const cols = [];
  const res = parseArray(
    context.parser,
    {
      cols,
      addEqnNum: context.envName === "align" || context.envName === "alignat",
      emptySingleRow: true,
      envClasses: ["jot", "abut"], // set row spacing & provisional column spacing
      maxNumCols: context.envName === "split" ? 2 : undefined,
      leqno: context.parser.settings.leqno
    },
    "display"
  );

  // Determining number of columns.
  // 1. If the first argument is given, we use it as a number of columns,
  //    and makes sure that each row doesn't exceed that number.
  // 2. Otherwise, just count number of columns = maximum number
  //    of cells in each row ("aligned" mode -- isAligned will be true).
  //
  // At the same time, prepend empty group {} at beginning of every second
  // cell in each row (starting with second cell) so that operators become
  // binary.  This behavior is implemented in amsmath's \start@aligned.
  let numMaths;
  let numCols = 0;
  if (args[0] && args[0].type === "ordgroup") {
    let arg0 = "";
    for (let i = 0; i < args[0].body.length; i++) {
      const textord = assertNodeType(args[0].body[i], "textord");
      arg0 += textord.text;
    }
    numMaths = Number(arg0);
    numCols = numMaths * 2;
  }
  const isAligned = !numCols;
  res.body.forEach(function(row) {
    if (!isAligned) {
      // Case 1
      const curMaths = row.length / 2;
      if (numMaths < curMaths) {
        throw new ParseError(
          "Too many math in a row: " + `expected ${numMaths}, but got ${curMaths}`,
          row[0]
        );
      }
    } else if (numCols < row.length) {
      // Case 2
      numCols = row.length;
    }
  });

  // Adjusting alignment.
  // In aligned mode, we add one \qquad between columns;
  // otherwise we add nothing.
  for (let i = 0; i < numCols; ++i) {
    let align = "r";
    if (i % 2 === 1) {
      align = "l";
    }
    cols[i] = {
      type: "align",
      align: align
    };
  }
  if (context.envName === "split") ; else if (context.envName.indexOf("ed") > -1) {
    res.envClasses.push("aligned"); // Sets justification
  } else if (isAligned) {
    res.envClasses[1] = context.envName === "align*"
      ? "align-star"
      : "align"; // Sets column spacing & justification
  } else {
    res.envClasses.push("aligned"); // Sets justification
  }
  return res;
};

// Arrays are part of LaTeX, defined in lttab.dtx so its documentation
// is part of the source2e.pdf file of LaTeX2e source documentation.
// {darray} is an {array} environment where cells are set in \displaystyle,
// as defined in nccmath.sty.
defineEnvironment({
  type: "array",
  names: ["array", "darray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    // Since no types are specified above, the two possibilities are
    // - The argument is wrapped in {} or [], in which case Parser's
    //   parseGroup() returns an "ordgroup" wrapping some symbol node.
    // - The argument is a bare symbol node.
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    const cols = colalign.map(function(nde) {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      if ("lcr".indexOf(ca) !== -1) {
        return {
          type: "align",
          align: ca
        };
      } else if (ca === "|") {
        return {
          type: "separator",
          separator: "|"
        };
      } else if (ca === ":") {
        return {
          type: "separator",
          separator: ":"
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    const res = {
      cols,
      envClasses: ["array"],
      maxNumCols: cols.length
    };
    return parseArray(context.parser, res, dCellStyle(context.envName));
  },
  mathmlBuilder: mathmlBuilder$7
});

// The matrix environments of amsmath builds on the array environment
// of LaTeX, which is discussed above.
// The mathtools package adds starred versions of the same environments.
// These have an optional argument to choose left|center|right justification.
defineEnvironment({
  type: "array",
  names: [
    "matrix",
    "pmatrix",
    "bmatrix",
    "Bmatrix",
    "vmatrix",
    "Vmatrix",
    "matrix*",
    "pmatrix*",
    "bmatrix*",
    "Bmatrix*",
    "vmatrix*",
    "Vmatrix*"
  ],
  props: {
    numArgs: 0
  },
  handler(context) {
    const delimiters = {
      matrix: null,
      pmatrix: ["(", ")"],
      bmatrix: ["[", "]"],
      Bmatrix: ["\\{", "\\}"],
      vmatrix: ["|", "|"],
      Vmatrix: ["\\Vert", "\\Vert"]
    }[context.envName.replace("*", "")];
    // \hskip -\arraycolsep in amsmath
    let colAlign = "c";
    const payload = {
      envClasses: [],
      cols: []
    };
    if (context.envName.charAt(context.envName.length - 1) === "*") {
      // It's one of the mathtools starred functions.
      // Parse the optional alignment argument.
      const parser = context.parser;
      parser.consumeSpaces();
      if (parser.fetch().text === "[") {
        parser.consume();
        parser.consumeSpaces();
        colAlign = parser.fetch().text;
        if ("lcr".indexOf(colAlign) === -1) {
          throw new ParseError("Expected l or c or r", parser.nextToken);
        }
        parser.consume();
        parser.consumeSpaces();
        parser.expect("]");
        parser.consume();
        payload.cols = [];
      }
    }
    const res = parseArray(context.parser, payload, "text");
    res.cols = new Array(res.body[0].length).fill({ type: "align", align: colAlign });
    return delimiters
      ? {
        type: "leftright",
        mode: context.mode,
        body: [res],
        left: delimiters[0],
        right: delimiters[1],
        rightColor: undefined // \right uninfluenced by \color in array
      }
      : res;
  },
  mathmlBuilder: mathmlBuilder$7
});

defineEnvironment({
  type: "array",
  names: ["smallmatrix"],
  props: {
    numArgs: 0
  },
  handler(context) {
    const payload = { type: "small" };
    const res = parseArray(context.parser, payload, "script");
    res.envClasses = ["small"];
    return res;
  },
  mathmlBuilder: mathmlBuilder$7
});

defineEnvironment({
  type: "array",
  names: ["subarray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    // Parsing of {subarray} is similar to {array}
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    const cols = colalign.map(function(nde) {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      // {subarray} only recognizes "l" & "c"
      if ("lc".indexOf(ca) !== -1) {
        return {
          type: "align",
          align: ca
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    if (cols.length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    let res = {
      cols,
      envClasses: ["small"]
    };
    res = parseArray(context.parser, res, "script");
    if (res.body.length > 0 && res.body[0].length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    return res;
  },
  mathmlBuilder: mathmlBuilder$7
});

// A cases environment (in amsmath.sty) is almost equivalent to
// \def
// \left\{\begin{array}{@{}l@{\quad}l@{}} … \end{array}\right.
// {dcases} is a {cases} environment where cells are set in \displaystyle,
// as defined in mathtools.sty.
// {rcases} is another mathtools environment. It's brace is on the right side.
defineEnvironment({
  type: "array",
  names: ["cases", "dcases", "rcases", "drcases"],
  props: {
    numArgs: 0
  },
  handler(context) {
    const payload = {
      cols: [],
      envClasses: ["cases"]
    };
    const res = parseArray(context.parser, payload, dCellStyle(context.envName));
    return {
      type: "leftright",
      mode: context.mode,
      body: [res],
      left: context.envName.indexOf("r") > -1 ? "." : "\\{",
      right: context.envName.indexOf("r") > -1 ? "\\}" : ".",
      rightColor: undefined
    };
  },
  mathmlBuilder: mathmlBuilder$7
});

// In the align environment, one uses ampersands, &, to specify number of
// columns in each row, and to locate spacing between each column.
// align gets automatic numbering. align* and aligned do not.
// The alignedat environment can be used in math mode.
defineEnvironment({
  type: "array",
  names: ["align", "align*", "aligned", "split"],
  props: {
    numArgs: 0
  },
  handler: alignedHandler,
  mathmlBuilder: mathmlBuilder$7
});

// alignat environment is like an align environment, but one must explicitly
// specify maximum number of columns in each row, and can adjust where spacing occurs.
defineEnvironment({
  type: "array",
  names: ["alignat", "alignat*", "alignedat"],
  props: {
    numArgs: 1
  },
  handler: alignedHandler,
  mathmlBuilder: mathmlBuilder$7
});

// A gathered environment is like an array environment with one centered
// column, but where rows are considered lines so get \jot line spacing
// and contents are set in \displaystyle.
defineEnvironment({
  type: "array",
  names: ["gathered", "gather", "gather*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    if (context.envName !== "gathered") {
      validateAmsEnvironmentContext(context);
    }
    const res = {
      cols: [],
      envClasses: ["jot", "abut"],
      addEqnNum: context.envName === "gather",
      emptySingleRow: true,
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$7
});

defineEnvironment({
  type: "array",
  names: ["equation", "equation*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      addEqnNum: context.envName === "equation",
      emptySingleRow: true,
      singleRow: true,
      maxNumCols: 1,
      envClasses: ["align"],
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$7
});

defineEnvironment({
  type: "array",
  names: ["multline", "multline*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      addEqnNum: context.envName === "multline",
      maxNumCols: 1,
      envClasses: ["jot", "multline"],
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$7
});

defineEnvironment({
  type: "array",
  names: ["CD"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    return parseCD(context.parser);
  },
  mathmlBuilder: mathmlBuilder$7
});

// Catch \hline outside array environment
defineFunction({
  type: "text", // Doesn't matter what this is.
  names: ["\\hline", "\\hdashline"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: true
  },
  handler(context, args) {
    throw new ParseError(`${context.funcName} valid only within array environment`);
  }
});

const environments = _environments;

// Environment delimiters. HTML/MathML rendering is defined in the corresponding
// defineEnvironment definitions.
defineFunction({
  type: "environment",
  names: ["\\begin", "\\end"],
  props: {
    numArgs: 1,
    argTypes: ["text"]
  },
  handler({ parser, funcName }, args) {
    const nameGroup = args[0];
    if (nameGroup.type !== "ordgroup") {
      throw new ParseError("Invalid environment name", nameGroup);
    }
    let envName = "";
    for (let i = 0; i < nameGroup.body.length; ++i) {
      envName += assertNodeType(nameGroup.body[i], "textord").text;
    }

    if (funcName === "\\begin") {
      // begin...end is similar to left...right
      if (!Object.prototype.hasOwnProperty.call(environments, envName )) {
        throw new ParseError("No such environment: " + envName, nameGroup);
      }
      // Build the environment object. Arguments and other information will
      // be made available to the begin and end methods using properties.
      const env = environments[envName];
      const { args, optArgs } = parser.parseArguments("\\begin{" + envName + "}", env);
      const context = {
        mode: parser.mode,
        envName,
        parser
      };
      const result = env.handler(context, args, optArgs);
      parser.expect("\\end", false);
      const endNameToken = parser.nextToken;
      const end = assertNodeType(parser.parseFunction(), "environment");
      if (end.name !== envName) {
        throw new ParseError(
          `Mismatch: \\begin{${envName}} matched by \\end{${end.name}}`,
          endNameToken
        );
      }
      return result;
    }

    return {
      type: "environment",
      mode: parser.mode,
      name: envName,
      nameGroup
    };
  }
});

defineFunction({
  type: "envTag",
  names: ["\\env@tag"],
  props: {
    numArgs: 1,
    argTypes: ["math"]
  },
  handler({ parser }, args) {
    return {
      type: "envTag",
      mode: parser.mode,
      body: args[0]
    };
  },
  mathmlBuilder(group, style) {
    return new mathMLTree.MathNode("mrow");
  }
});

defineFunction({
  type: "noTag",
  names: ["\\env@notag"],
  props: {
    numArgs: 0
  },
  handler({ parser }) {
    return {
      type: "noTag",
      mode: parser.mode
    };
  },
  mathmlBuilder(group, style) {
    return new mathMLTree.MathNode("mrow");
  }
});

const mathmlBuilder$6 = (group, style) => {
  const font = group.font;
  const newStyle = style.withFont(font);
  const mathGroup = buildGroup$1(group.body, newStyle);

  if (mathGroup.children.length === 0) { return mathGroup } // empty group, e.g., \mathrm{}
  if (font === "boldsymbol" && ["mo", "mpadded"].includes(mathGroup.type)) {
    mathGroup.style.fontWeight = "bold";
    return mathGroup
  }
  // Check if it is possible to consolidate elements into a single <mi> element.
  let canConsolidate = mathGroup.children[0].type === "mo";
  for (let i = 1; i < mathGroup.children.length; i++) {
    if (mathGroup.children[i].type === "mo" && font === "boldsymbol") {
      mathGroup.children[i].style.fontWeight = "bold";
    }
    if (mathGroup.children[i].type !== "mi") { canConsolidate = false; }
    const localVariant = mathGroup.children[i].attributes &&
      mathGroup.children[i].attributes.mathvariant || "";
    if (localVariant !== "normal") { canConsolidate = false; }
  }
  if (!canConsolidate) { return mathGroup }
  // Consolidate the <mi> elements.
  const mi = mathGroup.children[0];
  for (let i = 1; i < mathGroup.children.length; i++) {
    mi.children.push(mathGroup.children[i].children[0]);
  }
  if (mi.attributes.mathvariant && mi.attributes.mathvariant === "normal") {
    // Workaround for a Firefox bug that renders spurious space around
    // a <mi mathvariant="normal">
    // Ref: https://bugs.webkit.org/show_bug.cgi?id=129097
    // We insert a text node that contains a zero-width space and wrap in an mrow.
    // TODO: Get rid of this <mi> workaround when the Firefox bug is fixed.
    const bogus = new mathMLTree.MathNode("mtext", new mathMLTree.TextNode("\u200b"));
    return new mathMLTree.MathNode("mrow", [bogus, mi])
  }
  return mi
};

const fontAliases = {
  "\\Bbb": "\\mathbb",
  "\\bold": "\\mathbf",
  "\\frak": "\\mathfrak",
  "\\bm": "\\boldsymbol"
};

defineFunction({
  type: "font",
  names: [
    // styles
    "\\mathrm",
    "\\mathit",
    "\\mathbf",
    "\\mathnormal",
    "\\up@greek",
    "\\boldsymbol",

    // families
    "\\mathbb",
    "\\mathcal",
    "\\mathfrak",
    "\\mathscr",
    "\\mathsf",
    "\\mathtt",

    // aliases
    "\\Bbb",
    "\\bm",
    "\\bold",
    "\\frak"
  ],
  props: {
    numArgs: 1,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const body = normalizeArgument(args[0]);
    let func = funcName;
    if (func in fontAliases) {
      func = fontAliases[func];
    }
    return {
      type: "font",
      mode: parser.mode,
      font: func.slice(1),
      body
    };
  },
  mathmlBuilder: mathmlBuilder$6
});

// Old font changing functions
defineFunction({
  type: "font",
  names: ["\\rm", "\\sf", "\\tt", "\\bf", "\\it", "\\cal"],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler: ({ parser, funcName, breakOnTokenText }, args) => {
    const { mode } = parser;
    const body = parser.parseExpression(true, breakOnTokenText);
    const fontStyle = `math${funcName.slice(1)}`;

    return {
      type: "font",
      mode: mode,
      font: fontStyle,
      body: {
        type: "ordgroup",
        mode: parser.mode,
        body
      }
    };
  },
  mathmlBuilder: mathmlBuilder$6
});

const stylArray = ["display", "text", "script", "scriptscript"];
const scriptLevel = { auto: -1, display: 0, text: 0, script: 1, scriptscript: 2 };

const mathmlBuilder$5 = (group, style) => {
  // Track the scriptLevel of the numerator and denominator.
  // We may need that info for \mathchoice or for adjusting em dimensions.
  const childOptions = group.scriptLevel === "auto"
    ? style.incrementLevel()
    : group.scriptLevel === "display"
    ? style.withLevel(StyleLevel.TEXT)
    : group.scriptLevel === "text"
    ? style.withLevel(StyleLevel.SCRIPT)
    : style.withLevel(StyleLevel.SCRIPTSCRIPT);

  let node = new mathMLTree.MathNode("mfrac", [
    buildGroup$1(group.numer, childOptions),
    buildGroup$1(group.denom, childOptions)
  ]);

  if (!group.hasBarLine) {
    node.setAttribute("linethickness", "0px");
  } else if (group.barSize) {
    const ruleWidth = calculateSize(group.barSize, style);
    node.setAttribute("linethickness", ruleWidth.number + ruleWidth.unit);
  }

  if (group.leftDelim != null || group.rightDelim != null) {
    const withDelims = [];

    if (group.leftDelim != null) {
      const leftOp = new mathMLTree.MathNode("mo", [
        new mathMLTree.TextNode(group.leftDelim.replace("\\", ""))
      ]);
      leftOp.setAttribute("fence", "true");
      withDelims.push(leftOp);
    }

    withDelims.push(node);

    if (group.rightDelim != null) {
      const rightOp = new mathMLTree.MathNode("mo", [
        new mathMLTree.TextNode(group.rightDelim.replace("\\", ""))
      ]);
      rightOp.setAttribute("fence", "true");
      withDelims.push(rightOp);
    }

    node = makeRow(withDelims);
  }

  if (group.scriptLevel !== "auto") {
    node = new mathMLTree.MathNode("mstyle", [node]);
    node.setAttribute("displaystyle", String(group.scriptLevel === "display"));
    node.setAttribute("scriptlevel", scriptLevel[group.scriptLevel]);
  }

  return node;
};

defineFunction({
  type: "genfrac",
  names: [
    "\\dfrac",
    "\\frac",
    "\\tfrac",
    "\\dbinom",
    "\\binom",
    "\\tbinom",
    "\\\\atopfrac", // can’t be entered directly
    "\\\\bracefrac",
    "\\\\brackfrac" // ditto
  ],
  props: {
    numArgs: 2,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const numer = args[0];
    const denom = args[1];
    let hasBarLine = false;
    let leftDelim = null;
    let rightDelim = null;
    let scriptLevel = "auto";

    switch (funcName) {
      case "\\dfrac":
      case "\\frac":
      case "\\tfrac":
        hasBarLine = true;
        break;
      case "\\\\atopfrac":
        hasBarLine = false;
        break;
      case "\\dbinom":
      case "\\binom":
      case "\\tbinom":
        leftDelim = "(";
        rightDelim = ")";
        break;
      case "\\\\bracefrac":
        leftDelim = "\\{";
        rightDelim = "\\}";
        break;
      case "\\\\brackfrac":
        leftDelim = "[";
        rightDelim = "]";
        break;
      default:
        throw new Error("Unrecognized genfrac command");
    }

    switch (funcName) {
      case "\\dfrac":
      case "\\dbinom":
        scriptLevel = "display";
        break;
      case "\\tfrac":
      case "\\tbinom":
        scriptLevel = "text";
        break;
    }

    return {
      type: "genfrac",
      mode: parser.mode,
      continued: false,
      numer,
      denom,
      hasBarLine,
      leftDelim,
      rightDelim,
      scriptLevel,
      barSize: null
    };
  },
  mathmlBuilder: mathmlBuilder$5
});

defineFunction({
  type: "genfrac",
  names: ["\\cfrac"],
  props: {
    numArgs: 2
  },
  handler: ({ parser, funcName }, args) => {
    const numer = args[0];
    const denom = args[1];

    return {
      type: "genfrac",
      mode: parser.mode,
      continued: true,
      numer,
      denom,
      hasBarLine: true,
      leftDelim: null,
      rightDelim: null,
      scriptLevel: "display",
      barSize: null
    };
  }
});

// Infix generalized fractions -- these are not rendered directly, but replaced
// immediately by one of the variants above.
defineFunction({
  type: "infix",
  names: ["\\over", "\\choose", "\\atop", "\\brace", "\\brack"],
  props: {
    numArgs: 0,
    infix: true
  },
  handler({ parser, funcName, token }) {
    let replaceWith;
    switch (funcName) {
      case "\\over":
        replaceWith = "\\frac";
        break;
      case "\\choose":
        replaceWith = "\\binom";
        break;
      case "\\atop":
        replaceWith = "\\\\atopfrac";
        break;
      case "\\brace":
        replaceWith = "\\\\bracefrac";
        break;
      case "\\brack":
        replaceWith = "\\\\brackfrac";
        break;
      default:
        throw new Error("Unrecognized infix genfrac command");
    }
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith,
      token
    };
  }
});

const delimFromValue = function(delimString) {
  let delim = null;
  if (delimString.length > 0) {
    delim = delimString;
    delim = delim === "." ? null : delim;
  }
  return delim;
};

defineFunction({
  type: "genfrac",
  names: ["\\genfrac"],
  props: {
    numArgs: 6,
    allowedInArgument: true,
    argTypes: ["math", "math", "size", "text", "math", "math"]
  },
  handler({ parser }, args) {
    const numer = args[4];
    const denom = args[5];

    // Look into the parse nodes to get the desired delimiters.
    const leftNode = normalizeArgument(args[0]);
    const leftDelim = leftNode.type === "atom" && leftNode.family === "open"
      ? delimFromValue(leftNode.text)
      : null;
    const rightNode = normalizeArgument(args[1]);
    const rightDelim =
      rightNode.type === "atom" && rightNode.family === "close"
        ? delimFromValue(rightNode.text)
        : null;

    const barNode = assertNodeType(args[2], "size");
    let hasBarLine;
    let barSize = null;
    if (barNode.isBlank) {
      // \genfrac acts differently than \above.
      // \genfrac treats an empty size group as a signal to use a
      // standard bar size. \above would see size = 0 and omit the bar.
      hasBarLine = true;
    } else {
      barSize = barNode.value;
      hasBarLine = barSize.number > 0;
    }

    // Find out if we want displaystyle, textstyle, etc.
    let scriptLevel = "auto";
    let styl = args[3];
    if (styl.type === "ordgroup") {
      if (styl.body.length > 0) {
        const textOrd = assertNodeType(styl.body[0], "textord");
        scriptLevel = stylArray[Number(textOrd.text)];
      }
    } else {
      styl = assertNodeType(styl, "textord");
      scriptLevel = stylArray[Number(styl.text)];
    }

    return {
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim,
      rightDelim,
      scriptLevel
    };
  },
  mathmlBuilder: mathmlBuilder$5
});

// \above is an infix fraction that also defines a fraction bar size.
defineFunction({
  type: "infix",
  names: ["\\above"],
  props: {
    numArgs: 1,
    argTypes: ["size"],
    infix: true
  },
  handler({ parser, funcName, token }, args) {
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith: "\\\\abovefrac",
      barSize: assertNodeType(args[0], "size").value,
      token
    };
  }
});

defineFunction({
  type: "genfrac",
  names: ["\\\\abovefrac"],
  props: {
    numArgs: 3,
    argTypes: ["math", "size", "math"]
  },
  handler: ({ parser, funcName }, args) => {
    const numer = args[0];
    const barSize = assert(assertNodeType(args[1], "infix").barSize);
    const denom = args[2];

    const hasBarLine = barSize.number > 0;
    return {
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim: null,
      rightDelim: null,
      scriptLevel: "auto"
    };
  },

  mathmlBuilder: mathmlBuilder$5
});

const mathmlBuilder$4 = (group, style) => {
  const accentNode = stretchy.mathMLnode(group.label);
  accentNode.style["math-depth"] = 0;
  return new mathMLTree.MathNode(group.isOver ? "mover" : "munder", [
    buildGroup$1(group.base, style),
    accentNode
  ]);
};

// Horizontal stretchy braces
defineFunction({
  type: "horizBrace",
  names: ["\\overbrace", "\\underbrace"],
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    return {
      type: "horizBrace",
      mode: parser.mode,
      label: funcName,
      isOver: /^\\over/.test(funcName),
      base: args[0]
    };
  },
  mathmlBuilder: mathmlBuilder$4
});

defineFunction({
  type: "href",
  names: ["\\href"],
  props: {
    numArgs: 2,
    argTypes: ["url", "original"],
    allowedInText: true
  },
  handler: ({ parser, token }, args) => {
    const body = args[1];
    const href = assertNodeType(args[0], "url").url;

    if (
      !parser.settings.isTrusted({
        command: "\\href",
        url: href
      })
    ) {
      throw new ParseError(`Function "\\href" is not trusted`, token)
    }

    return {
      type: "href",
      mode: parser.mode,
      href,
      body: ordargument(body)
    };
  },
  mathmlBuilder: (group, style) => {
    let math = buildExpressionRow(group.body, style);
    if (!(math instanceof MathNode)) {
      math = new MathNode("mrow", [math]);
    }
    math.setAttribute("href", group.href);
    return math;
  }
});

defineFunction({
  type: "href",
  names: ["\\url"],
  props: {
    numArgs: 1,
    argTypes: ["url"],
    allowedInText: true
  },
  handler: ({ parser, token }, args) => {
    const href = assertNodeType(args[0], "url").url;

    if (
      !parser.settings.isTrusted({
        command: "\\url",
        url: href
      })
    ) {
      throw new ParseError(`Function "\\url" is not trusted`, token)
    }

    const chars = [];
    for (let i = 0; i < href.length; i++) {
      let c = href[i];
      if (c === "~") {
        c = "\\textasciitilde";
      }
      chars.push({
        type: "textord",
        mode: "text",
        text: c
      });
    }
    const body = {
      type: "text",
      mode: parser.mode,
      font: "\\texttt",
      body: chars
    };
    return {
      type: "href",
      mode: parser.mode,
      href,
      body: ordargument(body)
    };
  }
});

defineFunction({
  type: "html",
  names: ["\\class", "\\id", "\\style", "\\data"],
  props: {
    numArgs: 2,
    argTypes: ["raw", "original"],
    allowedInText: true
  },
  handler: ({ parser, funcName, token }, args) => {
    const value = assertNodeType(args[0], "raw").string;
    const body = args[1];

    if (parser.settings.strict) {
      throw new ParseError(`Function "${funcName}" is disabled in strict mode`, token)
    }

    let trustContext;
    const attributes = {};

    switch (funcName) {
      case "\\class":
        attributes.class = value;
        trustContext = {
          command: "\\class",
          class: value
        };
        break;
      case "\\id":
        attributes.id = value;
        trustContext = {
          command: "\\id",
          id: value
        };
        break;
      case "\\style":
        attributes.style = value;
        trustContext = {
          command: "\\style",
          style: value
        };
        break;
      case "\\data": {
        const data = value.split(",");
        for (let i = 0; i < data.length; i++) {
          const keyVal = data[i].split("=");
          if (keyVal.length !== 2) {
            throw new ParseError("Error parsing key-value for \\data");
          }
          attributes["data-" + keyVal[0].trim()] = keyVal[1].trim();
        }

        trustContext = {
          command: "\\data",
          attributes
        };
        break;
      }
      default:
        throw new Error("Unrecognized html command");
    }

    if (!parser.settings.isTrusted(trustContext)) {
      throw new ParseError(`Function "${funcName}" is not trusted`, token)
    }
    return {
      type: "html",
      mode: parser.mode,
      attributes,
      body: ordargument(body)
    };
  },
  mathmlBuilder: (group, style) => {
    const element =  buildExpressionRow(group.body, style);

    const classes = [];
    if (group.attributes.class) {
      classes.push(...group.attributes.class.trim().split(/\s+/));
    }
    element.classes = classes;

    for (const attr in group.attributes) {
      if (attr !== "class" && Object.prototype.hasOwnProperty.call(group.attributes, attr)) {
        element.setAttribute(attr, group.attributes[attr]);
      }
    }

    return element;
  }
});

const sizeData = function(str) {
  if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    // str is a number with no unit specified.
    // default unit is bp, per graphix package.
    return { number: +str, unit: "bp" }
  } else {
    const match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
    if (!match) {
      throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
    }
    const data = {
      number: +(match[1] + match[2]), // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
    }
    return data
  }
};

defineFunction({
  type: "includegraphics",
  names: ["\\includegraphics"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    argTypes: ["raw", "url"],
    allowedInText: false
  },
  handler: ({ parser, token }, args, optArgs) => {
    let width = { number: 0, unit: "em" };
    let height = { number: 0.9, unit: "em" };  // sorta character sized.
    let totalheight = { number: 0, unit: "em" };
    let alt = "";

    if (optArgs[0]) {
      const attributeStr = assertNodeType(optArgs[0], "raw").string;

      // Parser.js does not parse key/value pairs. We get a string.
      const attributes = attributeStr.split(",");
      for (let i = 0; i < attributes.length; i++) {
        const keyVal = attributes[i].split("=");
        if (keyVal.length === 2) {
          const str = keyVal[1].trim();
          switch (keyVal[0].trim()) {
            case "alt":
              alt = str;
              break
            case "width":
              width = sizeData(str);
              break
            case "height":
              height = sizeData(str);
              break
            case "totalheight":
              totalheight = sizeData(str);
              break
            default:
              throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.")
          }
        }
      }
    }

    const src = assertNodeType(args[0], "url").url;

    if (alt === "") {
      // No alt given. Use the file name. Strip away the path.
      alt = src;
      alt = alt.replace(/^.*[\\/]/, "");
      alt = alt.substring(0, alt.lastIndexOf("."));
    }

    if (
      !parser.settings.isTrusted({
        command: "\\includegraphics",
        url: src
      })
    ) {
      throw new ParseError(`Function "\\includegraphics" is not trusted`, token)
    }

    return {
      type: "includegraphics",
      mode: parser.mode,
      alt: alt,
      width: width,
      height: height,
      totalheight: totalheight,
      src: src
    }
  },
  mathmlBuilder: (group, style) => {
    const height = calculateSize(group.height, style);
    const depth = { number: 0, unit: "em" };

    if (group.totalheight.number > 0) {
      if (group.totalheight.unit === height.unit &&
        group.totalheight.number > height.number) {
        depth.number = group.totalheight.number - height.number;
        depth.unit = height.unit;
      }
    }

    let width = 0;
    if (group.width.number > 0) {
      width = calculateSize(group.width, style);
    }

    const graphicStyle = { height: height.number + depth.number + "em" };
    if (width.number > 0) {
      graphicStyle.width = width.number + width.unit;
    }
    if (depth.number > 0) {
      graphicStyle.verticalAlign = -depth.number + depth.unit;
    }

    const node = new Img(group.src, group.alt, graphicStyle);
    node.height = height;
    node.depth = depth;
    return new mathMLTree.MathNode("mtext", [node])
  }
});

// Horizontal spacing commands

// TODO: \hskip and \mskip should support plus and minus in lengths

defineFunction({
  type: "kern",
  names: ["\\kern", "\\mkern", "\\hskip", "\\mskip"],
  props: {
    numArgs: 1,
    argTypes: ["size"],
    primitive: true,
    allowedInText: true
  },
  handler({ parser, funcName, token }, args) {
    const size = assertNodeType(args[0], "size");
    if (parser.settings.strict) {
      const mathFunction = funcName[1] === "m"; // \mkern, \mskip
      const muUnit = size.value.unit === "mu";
      if (mathFunction) {
        if (!muUnit) {
          throw new ParseError(`LaTeX's ${funcName} supports only mu units, ` +
            `not ${size.value.unit} units`, token)
        }
        if (parser.mode !== "math") {
          throw new ParseError(`LaTeX's ${funcName} works only in math mode`, token)
        }
      } else {
        // !mathFunction
        if (muUnit) {
          throw new ParseError(`LaTeX's ${funcName} doesn't support mu units`, token)
        }
      }
    }
    return {
      type: "kern",
      mode: parser.mode,
      dimension: size.value
    };
  },
  mathmlBuilder(group, style) {
    const dimension = calculateSize(group.dimension, style);
    const ch = dimension.unit === "em" ? spaceCharacter(dimension.number) : "";
    if (group.mode === "text" && ch.length > 0) {
      const character = new mathMLTree.TextNode(ch);
      return new mathMLTree.MathNode("mtext", [character]);
    } else {
      const node = new mathMLTree.MathNode("mspace");
      node.setAttribute("width", dimension.number + dimension.unit);
      if (dimension.number < 0) {
        node.style.marginLeft = dimension.number + dimension.unit;
      }
      return node;
    }
  }
});

const spaceCharacter = function(width) {
  if (width >= 0.05555 && width <= 0.05556) {
    return "\u200a"; // &VeryThinSpace;
  } else if (width >= 0.1666 && width <= 0.1667) {
    return "\u2009"; // &ThinSpace;
  } else if (width >= 0.2222 && width <= 0.2223) {
    return "\u2005"; // &MediumSpace;
  } else if (width >= 0.2777 && width <= 0.2778) {
    return "\u2005\u200a"; // &ThickSpace;
  } else {
    return "";
  }
};

// Limit valid characters to a small set, for safety.
const invalidIdRegEx = /[^A-Za-z_0-9-]/g;

defineFunction({
  type: "label",
  names: ["\\label"],
  props: {
    numArgs: 1,
    argTypes: ["raw"]
  },
  handler({ parser }, args) {
    return {
      type: "label",
      mode: parser.mode,
      string: args[0].string.replace(invalidIdRegEx, "")
    };
  },
  mathmlBuilder(group, style) {
    // Return a no-width, no-ink element with an HTML id.
    const node = new mathMLTree.MathNode("mrow", [], ["tml-label"]);
    if (group.string.length > 0) {
      node.setAttribute("id", group.string);
    }
    return node
  }
});

// Horizontal overlap functions

const textModeLap = ["\\clap", "\\llap", "\\rlap"];

defineFunction({
  type: "lap",
  names: ["\\mathllap", "\\mathrlap", "\\mathclap", "\\clap", "\\llap", "\\rlap"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser, funcName, token }, args) => {
    if (textModeLap.includes(funcName)) {
      if (parser.settings.strict && parser.mode !== "text") {
        throw new ParseError(`{${funcName}} can be used only in text mode.
 Try \\math${funcName.slice(1)}`, token)
      }
      funcName = funcName.slice(1);
    } else {
      funcName = funcName.slice(5);
    }
    const body = args[0];
    return {
      type: "lap",
      mode: parser.mode,
      alignment: funcName,
      body
    }
  },
  mathmlBuilder: (group, style) => {
    // mathllap, mathrlap, mathclap
    let strut;
    if (group.alignment === "llap") {
      // We need an invisible strut with the same depth as the group.
      // We can't just read the depth, so we use \vphantom methods.
      const phantomInner = buildExpression(ordargument(group.body), style);
      const phantom = new mathMLTree.MathNode("mphantom", phantomInner);
      strut = new mathMLTree.MathNode("mpadded", [phantom]);
      strut.setAttribute("width", "0px");
    }

    const inner = buildGroup$1(group.body, style);
    let node;
    if (group.alignment === "llap") {
      inner.style.position = "absolute";
      inner.style.right = "0";
      inner.style.bottom = `0`; // If we could have read the ink depth, it would go here.
      node = new mathMLTree.MathNode("mpadded", [strut, inner]);
    } else {
      node = new mathMLTree.MathNode("mpadded", [inner]);
    }

    if (group.alignment === "rlap") {
      if (group.body.body.length > 0 && group.body.body[0].type === "genfrac") {
        // In Firefox, a <mpadded> squashes the 3/18em padding of a child \frac. Put it back.
        node.setAttribute("lspace", "0.16667em");
      }
    } else {
      const offset = group.alignment === "llap" ? "-1" : "-0.5";
      node.setAttribute("lspace", offset + "width");
      if (group.alignment === "llap") {
        node.style.position = "relative";
      } else {
        node.style.display = "flex";
        node.style.justifyContent = "center";
      }
    }
    node.setAttribute("width", "0px");
    return node
  }
});

// Switching from text mode back to math mode
defineFunction({
  type: "ordgroup",
  names: ["\\(", "$"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: false
  },
  handler({ funcName, parser }, args) {
    const outerMode = parser.mode;
    parser.switchMode("math");
    const close = funcName === "\\(" ? "\\)" : "$";
    const body = parser.parseExpression(false, close);
    parser.expect(close);
    parser.switchMode(outerMode);
    return {
      type: "ordgroup",
      mode: parser.mode,
      body
    };
  }
});

// Check for extra closing math delimiters
defineFunction({
  type: "text", // Doesn't matter what this is.
  names: ["\\)", "\\]"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: false
  },
  handler(context, token) {
    throw new ParseError(`Mismatched ${context.funcName}`, token);
  }
});

const chooseStyle = (group, style) => {
  switch (style.level) {
    case StyleLevel.DISPLAY:       // 0
      return group.display;
    case StyleLevel.TEXT:          // 1
      return group.text;
    case StyleLevel.SCRIPT:        // 2
      return group.script;
    case StyleLevel.SCRIPTSCRIPT:  // 3
      return group.scriptscript;
    default:
      return group.text;
  }
};

defineFunction({
  type: "mathchoice",
  names: ["\\mathchoice"],
  props: {
    numArgs: 4,
    primitive: true
  },
  handler: ({ parser }, args) => {
    return {
      type: "mathchoice",
      mode: parser.mode,
      display: ordargument(args[0]),
      text: ordargument(args[1]),
      script: ordargument(args[2]),
      scriptscript: ordargument(args[3])
    };
  },
  mathmlBuilder: (group, style) => {
    const body = chooseStyle(group, style);
    return buildExpressionRow(body, style);
  }
});

const textAtomTypes = ["text", "textord", "mathord", "atom"];

const padding = width => {
  const node = new mathMLTree.MathNode("mspace");
  node.setAttribute("width", width + "em");
  return node
};

function mathmlBuilder$3(group, style) {
  let node;
  const inner = buildExpression(group.body, style);

  if (group.mclass === "minner") {
    node = new mathMLTree.MathNode("mpadded", inner);
  } else if (group.mclass === "mord") {
    if (group.isCharacterBox || inner[0].type === "mathord") {
      node = inner[0];
      node.type = "mi";
    } else {
      node = new mathMLTree.MathNode("mi", inner);
    }
  } else {
    node = new mathMLTree.MathNode("mrow", inner);
    if (group.mustPromote) {
      node = inner[0];
      node.type = "mo";
      if (group.isCharacterBox && group.body[0].text && /[A-Za-z]/.test(group.body[0].text)) {
        node.setAttribute("mathvariant", "italic");
      }
    } else {
      node = new mathMLTree.MathNode("mrow", inner);
    }

    // Set spacing based on what is the most likely adjacent atom type.
    // See TeXbook p170.
    const doSpacing = style.level < 2; // Operator spacing is zero inside a (sub|super)script.
    if (node.type === "mrow") {
      if (doSpacing ) {
        if (group.mclass === "mbin") {
          // medium space
          node.children.unshift(padding(0.2222));
          node.children.push(padding(0.2222));
        } else if (group.mclass === "mrel") {
          // thickspace
          node.children.unshift(padding(0.2778));
          node.children.push(padding(0.2778));
        } else if (group.mclass === "mpunct") {
          node.children.push(padding(0.1667));
        } else if (group.mclass === "minner") {
          node.children.unshift(padding(0.0556));  // 1 mu is the most likely option
          node.children.push(padding(0.0556));
        }
      }
    } else {
      if (group.mclass === "mbin") {
        // medium space
        node.attributes.lspace = (doSpacing ? "0.2222em" : "0");
        node.attributes.rspace = (doSpacing ? "0.2222em" : "0");
      } else if (group.mclass === "mrel") {
        // thickspace
        node.attributes.lspace = (doSpacing ? "0.2778em" : "0");
        node.attributes.rspace = (doSpacing ? "0.2778em" : "0");
      } else if (group.mclass === "mpunct") {
        node.attributes.lspace = "0em";
        node.attributes.rspace = (doSpacing ? "0.1667em" : "0");
      } else if (group.mclass === "mopen" || group.mclass === "mclose") {
        node.attributes.lspace = "0em";
        node.attributes.rspace = "0em";
      } else if (group.mclass === "minner" && doSpacing) {
        node.attributes.lspace = "0.0556em"; // 1 mu is the most likely option
        node.attributes.width = "+0.1111em";
      }
    }

    if (!(group.mclass === "mopen" || group.mclass === "mclose")) {
      delete node.attributes.stretchy;
      delete node.attributes.form;
    }
  }
  return node;
}

// Math class commands except \mathop
defineFunction({
  type: "mclass",
  names: [
    "\\mathord",
    "\\mathbin",
    "\\mathrel",
    "\\mathopen",
    "\\mathclose",
    "\\mathpunct",
    "\\mathinner"
  ],
  props: {
    numArgs: 1,
    primitive: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    const isCharacterBox = utils.isCharacterBox(body);
    // We should not wrap a <mo> around a <mi> or <mord>. That would be invalid MathML.
    // In that case, we instead promote the text contents of the body to the parent.
    let mustPromote = true;
    const mord = { type: "mathord", text: "", mode: parser.mode };
    const arr = (body.body) ? body.body : [body];
    for (const arg of arr) {
      if (textAtomTypes.includes(arg.type)) {
        if (arg.text) {
          mord.text += arg.text;
        } else if (arg.body) {
          arg.body.map(e => { mord.text += e.text; });
        }
      } else {
        mustPromote = false;
        break
      }
    }
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: "m" + funcName.slice(5),
      body: ordargument(mustPromote ? mord : body),
      isCharacterBox,
      mustPromote
    };
  },
  mathmlBuilder: mathmlBuilder$3
});

const binrelClass = (arg) => {
  // \binrel@ spacing varies with (bin|rel|ord) of the atom in the argument.
  // (by rendering separately and with {}s before and after, and measuring
  // the change in spacing).  We'll do roughly the same by detecting the
  // atom type directly.
  const atom = arg.type === "ordgroup" && arg.body.length ? arg.body[0] : arg;
  if (atom.type === "atom" && (atom.family === "bin" || atom.family === "rel")) {
    return "m" + atom.family;
  } else {
    return "mord";
  }
};

// \@binrel{x}{y} renders like y but as mbin/mrel/mord if x is mbin/mrel/mord.
// This is equivalent to \binrel@{x}\binrel@@{y} in AMSTeX.
defineFunction({
  type: "mclass",
  names: ["\\@binrel"],
  props: {
    numArgs: 2
  },
  handler({ parser }, args) {
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: binrelClass(args[0]),
      body: ordargument(args[1]),
      isCharacterBox: utils.isCharacterBox(args[1])
    };
  }
});

// Build a relation or stacked op by placing one symbol on top of another
defineFunction({
  type: "mclass",
  names: ["\\stackrel", "\\overset", "\\underset"],
  props: {
    numArgs: 2
  },
  handler({ parser, funcName }, args) {
    const baseArg = args[1];
    const shiftedArg = args[0];

    const baseOp = {
      type: "op",
      mode: baseArg.mode,
      limits: true,
      alwaysHandleSupSub: true,
      parentIsSupSub: false,
      symbol: false,
      stack: true,
      suppressBaseShift: funcName !== "\\stackrel",
      body: ordargument(baseArg)
    };

    return {
      type: "supsub",
      mode: shiftedArg.mode,
      base: baseOp,
      sup: funcName === "\\underset" ? null : shiftedArg,
      sub: funcName === "\\underset" ? shiftedArg : null
    };
  },
  mathmlBuilder: mathmlBuilder$3
});

// Helper function
const buildGroup = (el, style, noneNode) => {
  if (!el) { return noneNode }
  const node = buildGroup$1(el, style);
  if (node.type === "mrow" && node.children.length === 0) { return noneNode }
  return node
};

defineFunction({
  type: "multiscript",
  names: ["\\sideset", "\\pres@cript"], // See macros.js for \prescript
  props: {
    numArgs: 3
  },
  handler({ parser, funcName, token }, args) {
    if (args[2].body.length === 0) {
      throw new ParseError(funcName + `cannot parse an empty base.`)
    }
    const base = args[2].body[0];
    if (parser.settings.strict && funcName === "\\sideset" && !base.symbol) {
      throw new ParseError(`The base of \\sideset must be a big operator. Try \\prescript.`)
    }

    if ((args[0].body.length > 0 && args[0].body[0].type !== "supsub") ||
        (args[1].body.length > 0 && args[1].body[0].type !== "supsub")) {
      throw new ParseError("\\sideset can parse only subscripts and " +
                            "superscripts in its first two arguments", token)
    }

    // The prescripts and postscripts come wrapped in a supsub.
    const prescripts = args[0].body.length > 0 ? args[0].body[0] : null;
    const postscripts = args[1].body.length > 0 ? args[1].body[0] : null;

    if (!prescripts && !postscripts) {
      return base
    } else if (!prescripts) {
      // It's not a multi-script. Get a \textstyle supsub.
      return {
        type: "styling",
        mode: parser.mode,
        scriptLevel: "text",
        body: [{
          type: "supsub",
          mode: parser.mode,
          base,
          sup: postscripts.sup,
          sub: postscripts.sub
        }]
      }
    } else {
      return {
        type: "multiscript",
        mode: parser.mode,
        isSideset: funcName === "\\sideset",
        prescripts,
        postscripts,
        base
      }
    }
  },
  mathmlBuilder(group, style) {
    const base =  buildGroup$1(group.base, style);

    const prescriptsNode = new mathMLTree.MathNode("mprescripts");
    const noneNode = new mathMLTree.MathNode("none");
    let children = [];

    const preSub = buildGroup(group.prescripts.sub, style, noneNode);
    const preSup = buildGroup(group.prescripts.sup, style, noneNode);
    if (group.isSideset) {
      // This seems silly, but LaTeX does this. Firefox ignores it, which does not make me sad.
      preSub.setAttribute("style", "text-align: left;");
      preSup.setAttribute("style", "text-align: left;");
    }

    if (group.postscripts) {
      const postSub = buildGroup(group.postscripts.sub, style, noneNode);
      const postSup = buildGroup(group.postscripts.sup, style, noneNode);
      children = [base, postSub, postSup, prescriptsNode, preSub, preSup];
    } else {
      children = [base, prescriptsNode, preSub, preSup];
    }

    return new mathMLTree.MathNode("mmultiscripts", children);
  }
});

defineFunction({
  type: "not",
  names: ["\\not"],
  props: {
    numArgs: 1,
    primitive: true,
    allowedInText: false
  },
  handler({ parser }, args) {
    const isCharacterBox = utils.isCharacterBox(args[0]);
    let body;
    if (isCharacterBox) {
      body = ordargument(args[0]);
      if (body[0].text.charAt(0) === "\\") {
        body[0].text = symbols.math[body[0].text].replace;
      }
      // \u0338 is the Unicode Combining Long Solidus Overlay
      body[0].text = body[0].text.slice(0, 1) + "\u0338" + body[0].text.slice(1);
    } else {
      // When the argument is not a character box, TeX does an awkward, poorly placed overlay.
      // We'll do the same.
      const notNode = { type: "textord", mode: "math", text: "\u0338" };
      const kernNode = { type: "kern", mode: "math", dimension: { number: -0.6, unit: "em" } };
      body = [notNode, kernNode, args[0]];
    }
    return {
      type: "not",
      mode: parser.mode,
      body,
      isCharacterBox
    };
  },
  mathmlBuilder(group, style) {
    if (group.isCharacterBox) {
      const inner = buildExpression(group.body, style);
      return inner[0]
    } else {
      return buildExpressionRow(group.body, style, true)
    }
  }
});

// Limits, symbols

// Some helpers

const ordAtomTypes = ["textord", "mathord", "atom"];

// Most operators have a large successor symbol, but these don't.
const noSuccessor = ["\\smallint"];

// Math operators (e.g. \sin) need a space between these types and themselves:
const ordTypes = ["textord", "mathord", "ordgroup", "close", "leftright"];

// NOTE: Unlike most `builders`s, this one handles not only "op", but also
// "supsub" since some of them (like \int) can affect super/subscripting.

const mathmlBuilder$2 = (group, style) => {
  let node;

  if (group.symbol) {
    // This is a symbol. Just add the symbol.
    node = new MathNode("mo", [makeText(group.name, group.mode)]);
    if (noSuccessor.includes(group.name)) {
      node.setAttribute("largeop", "false");
    } else {
      node.setAttribute("movablelimits", "false");
    }
  } else if (group.body) {
    // This is an operator with children. Add them.
    node = new MathNode("mo", buildExpression(group.body, style));
  } else {
    // This is a text operator. Add all of the characters from the operator's name.
    node = new MathNode("mi", [new TextNode(group.name.slice(1))]);

    if (!group.parentIsSupSub) {
      // Append an invisible <mo>&ApplyFunction;</mo>.
      // ref: https://www.w3.org/TR/REC-MathML/chap3_2.html#sec3.2.4
      const operator = new MathNode("mo", [makeText("\u2061", "text")]);
      const row = [node, operator];
      // Set spacing
      if (group.needsLeadingSpace) {
        const lead = new MathNode("mspace");
        lead.setAttribute("width", "0.1667em"); // thin space.
        row.unshift(lead);
      }
      if (!group.isFollowedByDelimiter) {
        const trail = new MathNode("mspace");
        trail.setAttribute("width", "0.1667em"); // thin space.
        row.push(trail);
      }
      node = new MathNode("mrow", row);
    }
  }

  return node;
};

const singleCharBigOps = {
  "\u220F": "\\prod",
  "\u2210": "\\coprod",
  "\u2211": "\\sum",
  "\u22c0": "\\bigwedge",
  "\u22c1": "\\bigvee",
  "\u22c2": "\\bigcap",
  "\u22c3": "\\bigcup",
  "\u2a00": "\\bigodot",
  "\u2a01": "\\bigoplus",
  "\u2a02": "\\bigotimes",
  "\u2a04": "\\biguplus",
  "\u2a05": "\\bigsqcap",
  "\u2a06": "\\bigsqcup"
};

defineFunction({
  type: "op",
  names: [
    "\\coprod",
    "\\bigvee",
    "\\bigwedge",
    "\\biguplus",
    "\\bigcap",
    "\\bigcup",
    "\\intop",
    "\\prod",
    "\\sum",
    "\\bigotimes",
    "\\bigoplus",
    "\\bigodot",
    "\\bigsqcap",
    "\\bigsqcup",
    "\\smallint",
    "\u220F",
    "\u2210",
    "\u2211",
    "\u22c0",
    "\u22c1",
    "\u22c2",
    "\u22c3",
    "\u2a00",
    "\u2a01",
    "\u2a02",
    "\u2a04",
    "\u2a06"
  ],
  props: {
    numArgs: 0
  },
  handler: ({ parser, funcName }, args) => {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharBigOps[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: true,
      stack: false, // This is true for \stackrel{}, not here.
      name: fName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});

// Note: calling defineFunction with a type that's already been defined only
// works because the same mathmlBuilder is being used.
defineFunction({
  type: "op",
  names: ["\\mathop"],
  props: {
    numArgs: 1,
    primitive: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    // It would be convienient to just wrap a <mo> around the argument.
    // But if the argument is a <mi> or <mord>, that would be invalid MathML.
    // In that case, we instead promote the text contents of the body to the parent.
    const arr = (body.body) ? body.body : [body];
    const isSymbol = arr.length === 1 && ordAtomTypes.includes(arr[0].type);
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: isSymbol,
      stack: false,
      name: isSymbol ? arr[0].text : null,
      body: isSymbol ? null : ordargument(body)
    };
  },
  mathmlBuilder: mathmlBuilder$2
});

// There are 2 flags for operators; whether they produce limits in
// displaystyle, and whether they are symbols and should grow in
// displaystyle. These four groups cover the four possible choices.

const singleCharIntegrals = {
  "\u222b": "\\int",
  "\u222c": "\\iint",
  "\u222d": "\\iiint",
  "\u222e": "\\oint",
  "\u222f": "\\oiint",
  "\u2230": "\\oiiint",
  "\u2231": "\\intclockwise",
  "\u2232": "\\varointclockwise",
  "\u2a0c": "\\iiiint",
  "\u2a0d": "\\intbar",
  "\u2a0e": "\\intBar",
  "\u2a0f": "\\fint",
  "\u2a12": "\\rppolint",
  "\u2a13": "\\scpolint",
  "\u2a15": "\\pointint",
  "\u2a16": "\\sqint",
  "\u2a17": "\\intlarhk",
  "\u2a18": "\\intx",
  "\u2a19": "\\intcap",
  "\u2a1a": "\\intcup"
};

// No limits, not symbols
defineFunction({
  type: "op",
  names: [
    "\\arcsin",
    "\\arccos",
    "\\arctan",
    "\\arctg",
    "\\arcctg",
    "\\arg",
    "\\ch",
    "\\cos",
    "\\cosec",
    "\\cosh",
    "\\cot",
    "\\cotg",
    "\\coth",
    "\\csc",
    "\\ctg",
    "\\cth",
    "\\deg",
    "\\dim",
    "\\exp",
    "\\hom",
    "\\ker",
    "\\lg",
    "\\ln",
    "\\log",
    "\\sec",
    "\\sin",
    "\\sinh",
    "\\sh",
    "\\sgn",
    "\\tan",
    "\\tanh",
    "\\tg",
    "\\th"
  ],
  props: {
    numArgs: 0
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});

// Limits, not symbols
defineFunction({
  type: "op",
  names: ["\\det", "\\gcd", "\\inf", "\\lim", "\\max", "\\min", "\\Pr", "\\sup"],
  props: {
    numArgs: 0
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});

// No limits, symbols
defineFunction({
  type: "op",
  names: [
    "\\int",
    "\\iint",
    "\\iiint",
    "\\iiiint",
    "\\oint",
    "\\oiint",
    "\\oiiint",
    "\\intclockwise",
    "\\varointclockwise",
    "\\intbar",
    "\\intBar",
    "\\fint",
    "\\rppolint",
    "\\scpolint",
    "\\pointint",
    "\\sqint",
    "\\intlarhk",
    "\\intx",
    "\\intcap",
    "\\intcup",
    "\u222b",
    "\u222c",
    "\u222d",
    "\u222e",
    "\u222f",
    "\u2230",
    "\u2231",
    "\u2232",
    "\u2a0c",
    "\u2a0d",
    "\u2a0e",
    "\u2a0f",
    "\u2a12",
    "\u2a13",
    "\u2a15",
    "\u2a16",
    "\u2a17",
    "\u2a18",
    "\u2a19",
    "\u2a1a"
  ],
  props: {
    numArgs: 0
  },
  handler({ parser, funcName }) {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharIntegrals[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: true,
      stack: false,
      name: fName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});

/**
 * All registered global/built-in macros.
 * `macros.js` exports this same dictionary again and makes it public.
 * `Parser.js` requires this dictionary via `macros.js`.
 */
const _macros = {};

// This function might one day accept an additional argument and do more things.
function defineMacro(name, body) {
  _macros[name] = body;
}

// NOTE: Unlike most builders, this one handles not only
// "operatorname", but also  "supsub" since \operatorname* can
// affect super/subscripting.

const mathmlBuilder$1 = (group, style) => {
  let expression = buildExpression(group.body, style.withFont("mathrm"));

  // Is expression a string or has it something like a fraction?
  let isAllString = true; // default
  for (let i = 0; i < expression.length; i++) {
    let node = expression[i];
    if (node instanceof mathMLTree.MathNode) {
      if (node.type === "mrow" && node.children.length === 1 &&
          node.children[0] instanceof mathMLTree.MathNode) {
        node = node.children[0];
      }
      switch (node.type) {
        case "mi":
        case "mn":
        case "ms":
        case "mtext":
          break; // Do nothing yet.
        case "mspace":
          {
            if (node.attributes.width) {
              const width = node.attributes.width.replace("em", "");
              const ch = spaceCharacter(Number(width));
              if (ch === "") {
                isAllString = false;
              } else {
                expression[i] = new mathMLTree.MathNode("mtext", [new mathMLTree.TextNode(ch)]);
              }
            }
          }
          break
        case "mo": {
          const child = node.children[0];
          if (node.children.length === 1 && child instanceof mathMLTree.TextNode) {
            child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
          } else {
            isAllString = false;
          }
          break
        }
        default:
          isAllString = false;
      }
    } else {
      isAllString = false;
    }
  }

  if (isAllString) {
    // Write a single TextNode instead of multiple nested tags.
    const word = expression.map((node) => node.toText()).join("");
    expression = [new mathMLTree.TextNode(word)];
  } else if (
    expression.length === 1
    && ["mover", "munder"].includes(expression[0].type) &&
    (expression[0].children[0].type === "mi" || expression[0].children[0].type === "mtext")
  ) {
    expression[0].children[0].type = "mi";
    if (group.parentIsSupSub) {
      return new mathMLTree.MathNode("mrow", expression)
    } else {
      const operator = new mathMLTree.MathNode("mo", [makeText("\u2061", "text")]);
      return mathMLTree.newDocumentFragment([expression[0], operator])
    }
  }

  let wrapper;
  if (isAllString) {
    wrapper = new mathMLTree.MathNode("mi", expression);
    if (expression[0].text.length === 1) {
      wrapper.setAttribute("mathvariant", "normal");
    }
  } else {
    wrapper = new mathMLTree.MathNode("mrow", expression);
  }

  if (!group.parentIsSupSub) {
    // Append an <mo>&ApplyFunction;</mo>.
    // ref: https://www.w3.org/TR/REC-MathML/chap3_2.html#sec3.2.4
    const operator = new mathMLTree.MathNode("mo", [makeText("\u2061", "text")]);
    const fragment = [wrapper, operator];
    if (group.needsLeadingSpace) {
      // LaTeX gives operator spacing, but a <mi> gets ord spacing.
      // So add a leading space.
      const space = new mathMLTree.MathNode("mspace");
      space.setAttribute("width", "0.1667em"); // thin space.
      fragment.unshift(space);
    }
    if (!group.isFollowedByDelimiter) {
      const trail = new mathMLTree.MathNode("mspace");
      trail.setAttribute("width", "0.1667em"); // thin space.
      fragment.push(trail);
    }
    return mathMLTree.newDocumentFragment(fragment)
  }

  return wrapper
};

// \operatorname
// amsopn.dtx: \mathop{#1\kern\z@\operator@font#3}\newmcodes@
defineFunction({
  type: "operatorname",
  names: ["\\operatorname@", "\\operatornamewithlimits"],
  props: {
    numArgs: 1,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const body = args[0];
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "operatorname",
      mode: parser.mode,
      body: ordargument(body),
      alwaysHandleSupSub: (funcName === "\\operatornamewithlimits"),
      limits: false,
      parentIsSupSub: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType)
    };
  },
  mathmlBuilder: mathmlBuilder$1
});

defineMacro("\\operatorname",
  "\\@ifstar\\operatornamewithlimits\\operatorname@");

defineFunctionBuilders({
  type: "ordgroup",
  mathmlBuilder(group, style) {
    return buildExpressionRow(group.body, style, true);
  }
});

defineFunction({
  type: "phantom",
  names: ["\\phantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "phantom",
      mode: parser.mode,
      body: ordargument(body)
    };
  },
  mathmlBuilder: (group, style) => {
    const inner = buildExpression(group.body, style);
    return new mathMLTree.MathNode("mphantom", inner);
  }
});

defineFunction({
  type: "hphantom",
  names: ["\\hphantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "hphantom",
      mode: parser.mode,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const inner = buildExpression(ordargument(group.body), style);
    const phantom = new mathMLTree.MathNode("mphantom", inner);
    const node = new mathMLTree.MathNode("mpadded", [phantom]);
    node.setAttribute("height", "0px");
    node.setAttribute("depth", "0px");
    return node;
  }
});

defineFunction({
  type: "vphantom",
  names: ["\\vphantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "vphantom",
      mode: parser.mode,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const inner = buildExpression(ordargument(group.body), style);
    const phantom = new mathMLTree.MathNode("mphantom", inner);
    const node = new mathMLTree.MathNode("mpadded", [phantom]);
    node.setAttribute("width", "0px");
    return node;
  }
});

// In LaTeX, \pmb is a simulation of bold font.
// The version of \pmb in ambsy.sty works by typesetting three copies of the argument
// with small offsets. We use CSS font-weight:bold.

defineFunction({
  type: "pmb",
  names: ["\\pmb"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "pmb",
      mode: parser.mode,
      body: ordargument(args[0])
    }
  },
  mathmlBuilder(group, style) {
    const inner = buildExpression(group.body, style);
    // Wrap with an <mstyle> element.
    const node = wrapWithMstyle(inner);
    node.setAttribute("style", "font-weight:bold");
    return node
  }
});

const sign = num => num >= 0 ? "+" : "-";

// \raise, \lower, and \raisebox

const mathmlBuilder = (group, style) => {
  const newStyle = style.withLevel(StyleLevel.TEXT);
  const node = new mathMLTree.MathNode("mpadded", [buildGroup$1(group.body, newStyle)]);
  const dy = calculateSize(group.dy, style);
  node.setAttribute("voffset", dy.number + dy.unit);
  const dyAbs = Math.abs(dy.number);
  // The next two lines do not work in Chromium.
  // TODO: Find some other way to adjust height and depth.
  node.setAttribute("height", sign(dy.number) +  dyAbs + dy.unit);
  node.setAttribute("depth", sign(-dy.number) +  dyAbs + dy.unit);
  return node
};

defineFunction({
  type: "raise",
  names: ["\\raise", "\\lower"],
  props: {
    numArgs: 2,
    argTypes: ["size", "primitive"],
    primitive: true
  },
  handler({ parser, funcName }, args) {
    const amount = assertNodeType(args[0], "size").value;
    if (funcName === "\\lower") { amount.number *= -1; }
    const body = args[1];
    return {
      type: "raise",
      mode: parser.mode,
      dy: amount,
      body
    };
  },
  mathmlBuilder
});


defineFunction({
  type: "raise",
  names: ["\\raisebox"],
  props: {
    numArgs: 2,
    argTypes: ["size", "hbox"],
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const amount = assertNodeType(args[0], "size").value;
    const body = args[1];
    return {
      type: "raise",
      mode: parser.mode,
      dy: amount,
      body
    };
  },
  mathmlBuilder
});

defineFunction({
  type: "ref",
  names: ["\\ref", "\\eqref"],
  props: {
    numArgs: 1,
    argTypes: ["raw"]
  },
  handler({ parser, funcName }, args) {
    return {
      type: "ref",
      mode: parser.mode,
      funcName,
      string: args[0].string.replace(invalidIdRegEx, "")
    };
  },
  mathmlBuilder(group, style) {
    // Create an empty text node. Set a class and an href.
    // The post-processor will populate with the target's tag or equation number.
    const classes = group.funcName === "\\ref" ? ["tml-ref"] : ["tml-ref", "tml-eqref"];
    const node = new mathMLTree.MathNode("mtext", [new mathMLTree.TextNode("")], classes);
    node.setAttribute("href", "#" + group.string);
    return node
  }
});

defineFunction({
  type: "internal",
  names: ["\\relax"],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler({ parser }) {
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});

defineFunction({
  type: "rule",
  names: ["\\rule"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    argTypes: ["size", "size", "size"]
  },
  handler({ parser }, args, optArgs) {
    const shift = optArgs[0];
    const width = assertNodeType(args[0], "size");
    const height = assertNodeType(args[1], "size");
    return {
      type: "rule",
      mode: parser.mode,
      shift: shift && assertNodeType(shift, "size").value,
      width: width.value,
      height: height.value
    };
  },
  mathmlBuilder(group, style) {
    const width = calculateSize(group.width, style);
    const height = calculateSize(group.height, style);
    const shift = group.shift
      ? calculateSize(group.shift, style)
      : { number: 0, unit: "em" };
    const color = (style.color && style.getColor()) || "black";

    const rule = new mathMLTree.MathNode("mspace");
    if (width.number > 0 && height.number > 0) {
      rule.setAttribute("mathbackground", color);
    }
    rule.setAttribute("width", width.number + width.unit);
    rule.setAttribute("height", height.number + height.unit);
    if (shift.number === 0) { return rule }

    const wrapper = new mathMLTree.MathNode("mpadded", [rule]);
    if (shift.number >= 0) {
      wrapper.setAttribute("height", "+" + shift.number + shift.unit);
    } else {
      wrapper.setAttribute("height", shift.number + shift.unit);
      wrapper.setAttribute("depth", "+" + -shift.number + shift.unit);
    }
    wrapper.setAttribute("voffset", shift.number + shift.unit);
    return wrapper;
  }
});

// The size mappings are taken from TeX with \normalsize=10pt.
// We don't have to track script level. MathML does that.
const sizeMap = {
  "\\tiny": 0.5,
  "\\sixptsize": 0.6,
  "\\Tiny": 0.6,
  "\\scriptsize": 0.7,
  "\\footnotesize": 0.8,
  "\\small": 0.9,
  "\\normalsize": 1.0,
  "\\large": 1.2,
  "\\Large": 1.44,
  "\\LARGE": 1.728,
  "\\huge": 2.074,
  "\\Huge": 2.488
};

defineFunction({
  type: "sizing",
  names: [
    "\\tiny",
    "\\sixptsize",
    "\\Tiny",
    "\\scriptsize",
    "\\footnotesize",
    "\\small",
    "\\normalsize",
    "\\large",
    "\\Large",
    "\\LARGE",
    "\\huge",
    "\\Huge"
  ],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler: ({ breakOnTokenText, funcName, parser }, args) => {
    if (parser.settings.strict && parser.mode === "math") {
      // eslint-disable-next-line no-console
      console.log(`Temml strict-mode warning: Command ${funcName} is invalid in math mode.`);
    }
    const body = parser.parseExpression(false, breakOnTokenText);
    return {
      type: "sizing",
      mode: parser.mode,
      funcName,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const newStyle = style.withFontSize(sizeMap[group.funcName]);
    const inner = buildExpression(group.body, newStyle);
    // Wrap with an <mstyle> element.
    const node = wrapWithMstyle(inner);
    const factor = (sizeMap[group.funcName] / style.fontSize).toFixed(4);
    node.setAttribute("mathsize", factor + "em");
    return node;
  }
});

// smash, with optional [tb], as in AMS

defineFunction({
  type: "smash",
  names: ["\\smash"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args, optArgs) => {
    let smashHeight = false;
    let smashDepth = false;
    const tbArg = optArgs[0] && assertNodeType(optArgs[0], "ordgroup");
    if (tbArg) {
      // Optional [tb] argument is engaged.
      // ref: amsmath: \renewcommand{\smash}[1][tb]{%
      //               def\mb@t{\ht}\def\mb@b{\dp}\def\mb@tb{\ht\z@\z@\dp}%
      let letter = "";
      for (let i = 0; i < tbArg.body.length; ++i) {
        const node = tbArg.body[i];
        // TODO: Write an AssertSymbolNode
        letter = node.text;
        if (letter === "t") {
          smashHeight = true;
        } else if (letter === "b") {
          smashDepth = true;
        } else {
          smashHeight = false;
          smashDepth = false;
          break;
        }
      }
    } else {
      smashHeight = true;
      smashDepth = true;
    }

    const body = args[0];
    return {
      type: "smash",
      mode: parser.mode,
      body,
      smashHeight,
      smashDepth
    };
  },
  mathmlBuilder: (group, style) => {
    const node = new mathMLTree.MathNode("mpadded", [buildGroup$1(group.body, style)]);

    if (group.smashHeight) {
      node.setAttribute("height", "0px");
    }

    if (group.smashDepth) {
      node.setAttribute("depth", "0px");
    }

    return node;
  }
});

defineFunction({
  type: "sqrt",
  names: ["\\sqrt"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser }, args, optArgs) {
    const index = optArgs[0];
    const body = args[0];
    return {
      type: "sqrt",
      mode: parser.mode,
      body,
      index
    };
  },
  mathmlBuilder(group, style) {
    const { body, index } = group;
    return index
      ? new mathMLTree.MathNode("mroot", [
        buildGroup$1(body, style),
        buildGroup$1(index, style.incrementLevel())
      ])
    : new mathMLTree.MathNode("msqrt", [buildGroup$1(body, style)]);
  }
});

const styleMap = {
  display: 0,
  text: 1,
  script: 2,
  scriptscript: 3
};

const styleAttributes = {
  display: ["0", "true"],
  text: ["0", "false"],
  script: ["1", "false"],
  scriptscript: ["2", "false"]
};

defineFunction({
  type: "styling",
  names: ["\\displaystyle", "\\textstyle", "\\scriptstyle", "\\scriptscriptstyle"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ breakOnTokenText, funcName, parser }, args) {
    // parse out the implicit body
    const body = parser.parseExpression(true, breakOnTokenText);

    const scriptLevel = funcName.slice(1, funcName.length - 5);
    return {
      type: "styling",
      mode: parser.mode,
      // Figure out what scriptLevel to use by pulling out the scriptLevel from
      // the function name
      scriptLevel,
      body
    };
  },
  mathmlBuilder(group, style) {
    // Figure out what scriptLevel we're changing to.
    const newStyle = style.withLevel(styleMap[group.scriptLevel]);
    // The style argument in the next line does NOT directly set a MathML script level.
    // It just tracks the style level, in case we need to know it for supsub or mathchoice.
    const inner = buildExpression(group.body, newStyle);
    // Wrap with an <mstyle> element.
    const node = wrapWithMstyle(inner);

    const attr = styleAttributes[group.scriptLevel];

    // Here is where we set the MathML script level.
    node.setAttribute("scriptlevel", attr[0]);
    node.setAttribute("displaystyle", attr[1]);

    return node;
  }
});

/**
 * Sometimes, groups perform special rules when they have superscripts or
 * subscripts attached to them. This function lets the `supsub` group know that
 * Sometimes, groups perform special rules when they have superscripts or
 * its inner element should handle the superscripts and subscripts instead of
 * handling them itself.
 */

// Helpers
const symbolRegEx = /^m(over|under|underover)$/;

// Super scripts and subscripts, whose precise placement can depend on other
// functions that precede them.
defineFunctionBuilders({
  type: "supsub",
  mathmlBuilder(group, style) {
    // Is the inner group a relevant horizonal brace?
    let isBrace = false;
    let isOver;
    let isSup;
    let appendApplyFunction = false;
    let appendSpace = false;
    let needsLeadingSpace = false;

    if (group.base && group.base.type === "horizBrace") {
      isSup = !!group.sup;
      if (isSup === group.base.isOver) {
        isBrace = true;
        isOver = group.base.isOver;
      }
    }

    if (group.base && !group.base.stack &&
      (group.base.type === "op" || group.base.type === "operatorname")) {
      group.base.parentIsSupSub = true;
      appendApplyFunction = !group.base.symbol;
      appendSpace = appendApplyFunction && !group.isFollowedByDelimiter;
      needsLeadingSpace = group.base.needsLeadingSpace;
    }

    const children = group.base && group.base.stack
      ? [buildGroup$1(group.base.body[0], style)]
      : [buildGroup$1(group.base, style)];

    const childStyle = style.inSubOrSup();
    if (group.sub) {
      children.push(buildGroup$1(group.sub, childStyle));
    }

    if (group.sup) {
      children.push(buildGroup$1(group.sup, childStyle));
    }

    let nodeType;
    if (isBrace) {
      nodeType = isOver ? "mover" : "munder";
    } else if (!group.sub) {
      const base = group.base;
      if (
        base &&
        base.type === "op" &&
        base.limits &&
        (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)
      ) {
        nodeType = "mover";
      } else if (
        base &&
        base.type === "operatorname" &&
        base.alwaysHandleSupSub &&
        (base.limits || style.level === StyleLevel.DISPLAY)
      ) {
        nodeType = "mover";
      } else {
        nodeType = "msup";
      }
    } else if (!group.sup) {
      const base = group.base;
      if (
        base &&
        base.type === "op" &&
        base.limits &&
        (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)
      ) {
        nodeType = "munder";
      } else if (
        base &&
        base.type === "operatorname" &&
        base.alwaysHandleSupSub &&
        (base.limits || style.level === StyleLevel.DISPLAY)
      ) {
        nodeType = "munder";
      } else {
        nodeType = "msub";
      }
    } else {
      const base = group.base;
      if (base && ((base.type === "op" && base.limits) || base.type === "multiscript") &&
        (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)
      ) {
        nodeType = "munderover";
      } else if (
        base &&
        base.type === "operatorname" &&
        base.alwaysHandleSupSub &&
        (style.level === StyleLevel.DISPLAY || base.limits)
      ) {
        nodeType = "munderover";
      } else {
        nodeType = "msubsup";
      }
    }

    let node = new mathMLTree.MathNode(nodeType, children);
    if (appendApplyFunction) {
      // Append an <mo>&ApplyFunction;</mo>.
      // ref: https://www.w3.org/TR/REC-MathML/chap3_2.html#sec3.2.4
      const operator = new mathMLTree.MathNode("mo", [makeText("\u2061", "text")]);
      if (needsLeadingSpace) {
        const space = new mathMLTree.MathNode("mspace");
        space.setAttribute("width", "0.1667em"); // thin space.
        node = mathMLTree.newDocumentFragment([space, node, operator]);
      } else {
        node = mathMLTree.newDocumentFragment([node, operator]);
      }
      if (appendSpace) {
        const space = new mathMLTree.MathNode("mspace");
        space.setAttribute("width", "0.1667em"); // thin space.
        node.children.push(space);
      }
    } else if (symbolRegEx.test(nodeType)) {
      // Wrap in a <mrow>. Otherwise Firefox stretchy parens will not stretch to include limits.
      node = new mathMLTree.MathNode("mrow", [node]);
    }

    return node
  }
});

// Operator ParseNodes created in Parser.js from symbol Groups in src/symbols.js.

const short = ["\\shortmid", "\\nshortmid", "\\shortparallel",
  "\\nshortparallel", "\\smallsetminus"];

const arrows = ["\\Rsh", "\\Lsh", "\\restriction"];

const isArrow = str => {
  if (str.length === 1) {
    const codePoint = str.codePointAt(0);
    return (0x218f < codePoint && codePoint < 0x2200)
  }
  return str.indexOf("arrow") > -1 || str.indexOf("harpoon") > -1 || arrows.includes(str)
};

defineFunctionBuilders({
  type: "atom",
  mathmlBuilder(group, style) {
    const node = new mathMLTree.MathNode("mo", [makeText(group.text, group.mode)]);
    if (group.family === "punct") {
      node.setAttribute("separator", "true");
    } else if (group.family === "open" || group.family === "close") {
      // Delims built here should not stretch vertically.
      // See delimsizing.js for stretchy delims.
      if (group.family === "open") {
        node.setAttribute("form", "prefix");
        // Set an explicit attribute for stretch. Otherwise Firefox may do it wrong.
        node.setAttribute("stretchy", "false");
      } else if (group.family === "close") {
        node.setAttribute("form", "postfix");
        node.setAttribute("stretchy", "false");
      }
    } else if (group.text === "\\mid") {
      // Firefox messes up this spacing if at the end of an <mrow>. See it explicitly.
      node.setAttribute("lspace", "0.22em"); // medium space
      node.setAttribute("rspace", "0.22em");
      node.setAttribute("stretchy", "false");
    } else if (group.family === "rel" && isArrow(group.text)) {
      node.setAttribute("stretchy", "false");
    } else if (short.includes(group.text)) {
      node.setAttribute("mathsize", "70%");
    } else if (group.text === ":") {
      // ":" is not in the MathML operator dictionary. Give it BIN spacing.
      node.attributes.lspace = "0.2222em";
      node.attributes.rspace = "0.2222em";
    }
    return node;
  }
});

/**
 * Maps TeX font commands to "mathvariant" attribute in buildMathML.js
 */
const fontMap = {
  // styles
  mathbf: "bold",
  mathrm: "normal",
  textit: "italic",
  mathit: "italic",
  mathnormal: "italic",

  // families
  mathbb: "double-struck",
  mathcal: "script",
  mathfrak: "fraktur",
  mathscr: "script",
  mathsf: "sans-serif",
  mathtt: "monospace"
};

/**
 * Returns the math variant as a string or null if none is required.
 */
const getVariant = function(group, style) {
  // Handle font specifiers as best we can.
  // Chromium does not support the MathML mathvariant attribute.
  // So we'll use Unicode replacement characters instead.
  // But first, determine the math variant.

  // Deal with the \textit, \textbf, etc., functions.
  if (style.fontFamily === "texttt") {
    return "monospace"
  } else if (style.fontFamily === "textsc") {
    return "normal"; // handled via character substitution in symbolsOrd.js.
  } else if (style.fontFamily === "textsf") {
    if (style.fontShape === "textit" && style.fontWeight === "textbf") {
      return "sans-serif-bold-italic"
    } else if (style.fontShape === "textit") {
      return "sans-serif-italic"
    } else if (style.fontWeight === "textbf") {
      return "sans-serif-bold"
    } else {
      return "sans-serif"
    }
  } else if (style.fontShape === "textit" && style.fontWeight === "textbf") {
    return "bold-italic"
  } else if (style.fontShape === "textit") {
    return "italic"
  } else if (style.fontWeight === "textbf") {
    return "bold"
  }

  // Deal with the \mathit, mathbf, etc, functions.
  const font = style.font;
  if (!font || font === "mathnormal") {
    return null
  }

  const mode = group.mode;
  switch (font) {
    case "mathit":
      return "italic"
    case "mathrm": {
      const codePoint = group.text.codePointAt(0);
      // LaTeX \mathrm returns italic for Greek characters.
      return  (0x03ab < codePoint && codePoint < 0x03cf) ? "italic" : "normal"
    }
    case "greekItalic":
      return "italic"
    case "up@greek":
      return "normal"
    case "boldsymbol":
    case "mathboldsymbol":
      return "bold-italic"
    case "mathbf":
      return "bold"
    case "mathbb":
      return "double-struck"
    case "mathfrak":
      return "fraktur"
    case "mathscr":
    case "mathcal":
      return "script"
    case "mathsf":
      return "sans-serif"
    case "mathtt":
      return "monospace"
  }

  let text = group.text;
  if (symbols[mode][text] && symbols[mode][text].replace) {
    text = symbols[mode][text].replace;
  }

  return Object.prototype.hasOwnProperty.call(fontMap, font) ? fontMap[font] : null
};

// Chromium does not support the MathML `mathvariant` attribute.
// Instead, we replace ASCII characters with Unicode characters that
// are defined in the font as bold, italic, double-struck, etc.
// This module identifies those Unicode code points.

// First, a few helpers.
const script = Object.freeze({
  B: 0x20EA, // Offset from ASCII B to Unicode script B
  E: 0x20EB,
  F: 0x20EB,
  H: 0x20C3,
  I: 0x20C7,
  L: 0x20C6,
  M: 0x20E6,
  R: 0x20C9,
  e: 0x20CA,
  g: 0x20A3,
  o: 0x20C5
});

const frak = Object.freeze({
  C: 0x20EA,
  H: 0x20C4,
  I: 0x20C8,
  R: 0x20CA,
  Z: 0x20CE
});

const bbb$1 = Object.freeze({
  C: 0x20BF, // blackboard bold
  H: 0x20C5,
  N: 0x20C7,
  P: 0x20C9,
  Q: 0x20C9,
  R: 0x20CB,
  Z: 0x20CA
});

const bold = Object.freeze({
  "\u03f5": 0x1D2E7, // lunate epsilon
  "\u03d1": 0x1D30C, // vartheta
  "\u03f0": 0x1D2EE, // varkappa
  "\u03c6": 0x1D319, // varphi
  "\u03f1": 0x1D2EF, // varrho
  "\u03d6": 0x1D30B  // varpi
});

const boldItalic = Object.freeze({
  "\u03f5": 0x1D35B, // lunate epsilon
  "\u03d1": 0x1D380, // vartheta
  "\u03f0": 0x1D362, // varkappa
  "\u03c6": 0x1D38D, // varphi
  "\u03f1": 0x1D363, // varrho
  "\u03d6": 0x1D37F  // varpi
});

const boldsf = Object.freeze({
  "\u03f5": 0x1D395, // lunate epsilon
  "\u03d1": 0x1D3BA, // vartheta
  "\u03f0": 0x1D39C, // varkappa
  "\u03c6": 0x1D3C7, // varphi
  "\u03f1": 0x1D39D, // varrho
  "\u03d6": 0x1D3B9  // varpi
});

const bisf = Object.freeze({
  "\u03f5": 0x1D3CF, // lunate epsilon
  "\u03d1": 0x1D3F4, // vartheta
  "\u03f0": 0x1D3D6, // varkappa
  "\u03c6": 0x1D401, // varphi
  "\u03f1": 0x1D3D7, // varrho
  "\u03d6": 0x1D3F3  // varpi
});

// Code point offsets below are derived from https://www.unicode.org/charts/PDF/U1D400.pdf
const offset = Object.freeze({
  upperCaseLatin: { // A-Z
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return 0x1D3BF },
    "italic": ch =>                 { return 0x1D3F3 },
    "bold-italic": ch =>            { return 0x1D427 },
    "script": ch =>                 { return script[ch] || 0x1D45B },
    "script-bold": ch =>            { return 0x1D48F },
    "fraktur": ch =>                { return frak[ch] || 0x1D4C3 },
    "fraktur-bold": ch =>           { return 0x1D52B },
    "double-struck": ch =>          { return bbb$1[ch] || 0x1D4F7 },
    "sans-serif": ch =>             { return 0x1D55F },
    "sans-serif-bold": ch =>        { return 0x1D593 },
    "sans-serif-italic": ch =>      { return 0x1D5C7 },
    "sans-serif-bold-italic": ch => { return 0x1D63C },
    "monospace": ch =>              { return 0x1D62F }
  },
  lowerCaseLatin: { // a-z
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return 0x1D3B9 },
    "italic": ch =>                 { return ch === "h" ? 0x20A6 : 0x1D3ED },
    "bold-italic": ch =>            { return 0x1D421 },
    "script": ch =>                 { return script[ch] || 0x1D455 },
    "script-bold": ch =>            { return 0x1D489 },
    "fraktur": ch =>                { return 0x1D4BD },
    "fraktur-bold": ch =>           { return 0x1D525 },
    "double-struck": ch =>          { return 0x1D4F1 },
    "sans-serif": ch =>             { return 0x1D559 },
    "sans-serif-bold": ch =>        { return 0x1D58D },
    "sans-serif-italic": ch =>      { return 0x1D5C1 },
    "sans-serif-bold-italic": ch => { return 0x1D5F5 },
    "monospace": ch =>              { return 0x1D629 }
  },
  upperCaseGreek: { // A-Ω ∇
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return ch === "∇" ? 0x1B4BA : 0x1D317 },
    "italic": ch =>                 { return ch === "∇" ? 0x1B4F4 : 0x1D351 },
    // \boldsymbol actually returns upright bold for upperCaseGreek
    "bold-italic": ch =>            { return ch === "∇" ? 0x1B4BA : 0x1D317 },
    "script": ch =>                 { return 0 },
    "script-bold": ch =>            { return 0 },
    "fraktur": ch =>                { return 0 },
    "fraktur-bold": ch =>           { return 0 },
    "double-struck": ch =>          { return 0 },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    "sans-serif": ch =>             { return ch === "∇" ? 0x1B568 : 0x1D3C5 },
    "sans-serif-bold": ch =>        { return ch === "∇" ? 0x1B568 : 0x1D3C5 },
    "sans-serif-italic": ch =>      { return 0 },
    "sans-serif-bold-italic": ch => { return ch === "∇" ? 0x1B5A2 : 0x1D3FF },
    "monospace": ch =>              { return 0 }
  },
  lowerCaseGreek: { // α-ω
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return 0x1D311 },
    "italic": ch =>                 { return 0x1D34B },
    "bold-italic": ch =>            { return ch === "\u03d5" ? 0x1D37E : 0x1D385 },
    "script": ch =>                 { return 0 },
    "script-bold": ch =>            { return 0 },
    "fraktur": ch =>                { return 0 },
    "fraktur-bold": ch =>           { return 0 },
    "double-struck": ch =>          { return 0 },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    "sans-serif": ch =>             { return 0x1D3BF },
    "sans-serif-bold": ch =>        { return 0x1D3BF },
    "sans-serif-italic": ch =>      { return 0 },
    "sans-serif-bold-italic": ch => { return 0x1D3F9 },
    "monospace": ch =>              { return 0 }
  },
  varGreek: { // \varGamma, etc
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return  bold[ch] || -51 },
    "italic": ch =>                 { return 0 },
    "bold-italic": ch =>            { return boldItalic[ch] || 0x3A },
    "script": ch =>                 { return 0 },
    "script-bold": ch =>            { return 0 },
    "fraktur": ch =>                { return 0 },
    "fraktur-bold": ch =>           { return 0 },
    "double-struck": ch =>          { return 0 },
    "sans-serif": ch =>             { return boldsf[ch] || 0x74 },
    "sans-serif-bold": ch =>        { return boldsf[ch] || 0x74 },
    "sans-serif-italic": ch =>      { return 0 },
    "sans-serif-bold-italic": ch => { return bisf[ch] || 0xAE },
    "monospace": ch =>              { return 0 }
  },
  numeral: { // 0-9
    "normal": ch =>                 { return 0 },
    "bold": ch =>                   { return 0x1D79E },
    "italic": ch =>                 { return 0 },
    "bold-italic": ch =>            { return 0 },
    "script": ch =>                 { return 0 },
    "script-bold": ch =>            { return 0 },
    "fraktur": ch =>                { return 0 },
    "fraktur-bold": ch =>           { return 0 },
    "double-struck": ch =>          { return 0x1D7A8 },
    "sans-serif": ch =>             { return 0x1D7B2 },
    "sans-serif-bold": ch =>        { return 0x1D7BC },
    "sans-serif-italic": ch =>      { return 0 },
    "sans-serif-bold-italic": ch => { return 0 },
    "monospace": ch =>              { return 0x1D7C6 }
  }
});

const variantChar = (ch, variant) => {
  const codePoint = ch.codePointAt(0);
  const block = 0x40 < codePoint && codePoint < 0x5b
    ? "upperCaseLatin"
    : 0x60 < codePoint && codePoint < 0x7b
    ? "lowerCaseLatin"
    : (0x390  < codePoint && codePoint < 0x3AA) || ch === "∇"
    ? "upperCaseGreek"
    : 0x3B0 < codePoint && codePoint < 0x3CA || ch === "\u03d5"
    ? "lowerCaseGreek"
    : 0x1D6E1 < codePoint && codePoint < 0x1D6FC  || bold[ch]
    ? "varGreek"
    : (0x2F < codePoint && codePoint <  0x3A)
    ? "numeral"
    : "other";
  return block === "other"
    ? ch
    : String.fromCodePoint(codePoint + offset[block][variant](ch))
};

const smallCaps = Object.freeze({
  a: "ᴀ",
  b: "ʙ",
  c: "ᴄ",
  d: "ᴅ",
  e: "ᴇ",
  f: "ꜰ",
  g: "ɢ",
  h: "ʜ",
  i: "ɪ",
  j: "ᴊ",
  k: "ᴋ",
  l: "ʟ",
  m: "ᴍ",
  n: "ɴ",
  o: "ᴏ",
  p: "ᴘ",
  q: "ǫ",
  r: "ʀ",
  s: "s",
  t: "ᴛ",
  u: "ᴜ",
  v: "ᴠ",
  w: "ᴡ",
  x: "x",
  y: "ʏ",
  z: "ᴢ"
});

// "mathord" and "textord" ParseNodes created in Parser.js from symbol Groups in
// src/symbols.js.

const numberRegEx$4 = /^\d(?:[\d,.]*\d)?$/;
const latinRegEx = /[A-Ba-z]/;

const italicNumber = (text, variant, tag) => {
  const mn = new mathMLTree.MathNode(tag, [text]);
  const wrapper = new mathMLTree.MathNode("mstyle", [mn]);
  wrapper.style["font-style"] = "italic";
  wrapper.style["font-family"] = "Cambria, 'Times New Roman', serif";
  if (variant === "bold-italic") { wrapper.style["font-weight"] = "bold"; }
  return wrapper
};

defineFunctionBuilders({
  type: "mathord",
  mathmlBuilder(group, style) {
    const text = makeText(group.text, group.mode, style);
    const codePoint = text.text.codePointAt(0);
    // Test for upper-case Greek
    const defaultVariant = (0x0390 < codePoint && codePoint < 0x03aa) ? "normal" : "italic";
    const variant = getVariant(group, style) || defaultVariant;
    if (variant === "script") {
      text.text = variantChar(text.text, variant);
      return new mathMLTree.MathNode("mi", [text], [style.font])
    } else if (variant !== "italic") {
      text.text = variantChar(text.text, variant);
    }
    let node = new mathMLTree.MathNode("mi", [text]);
    // TODO: Handle U+1D49C - U+1D4CF per https://www.unicode.org/charts/PDF/U1D400.pdf
    if (variant === "normal") {
      node.setAttribute("mathvariant", "normal");
      if (text.text.length === 1) {
        // A Firefox bug will apply spacing here, but there should be none. Fix it.
        node = new mathMLTree.MathNode("mrow", [node]);
      }
    }
    return node
  }
});

defineFunctionBuilders({
  type: "textord",
  mathmlBuilder(group, style) {
    let ch = group.text;
    const codePoint = ch.codePointAt(0);
    if (style.fontFamily === "textsc") {
      // Convert small latin letters to small caps.
      if (96 < codePoint && codePoint < 123) {
        ch = smallCaps[ch];
      }
    }
    const text = makeText(ch, group.mode, style);
    const variant = getVariant(group, style) || "normal";

    let node;
    if (numberRegEx$4.test(group.text)) {
      const tag = group.mode === "text" ? "mtext" : "mn";
      if (variant === "italic" || variant === "bold-italic") {
        return italicNumber(text, variant, tag)
      } else {
        if (variant !== "normal") {
          text.text = text.text.split("").map(c => variantChar(c, variant)).join("");
        }
        node = new mathMLTree.MathNode(tag, [text]);
      }
    } else if (group.mode === "text") {
      if (variant !== "normal") {
        text.text = variantChar(text.text, variant);
      }
      node = new mathMLTree.MathNode("mtext", [text]);
    } else if (group.text === "\\prime") {
      node = new mathMLTree.MathNode("mo", [text]);
      // TODO: If/when Chromium uses ssty variant for prime, remove the next line.
      node.classes.push("tml-prime");
    } else {
      const origText = text.text;
      if (variant !== "italic") {
        text.text = variantChar(text.text, variant);
      }
      node = new mathMLTree.MathNode("mi", [text]);
      if (text.text === origText && latinRegEx.test(origText)) {
        node.setAttribute("mathvariant", "italic");
      }
    }
    return node
  }
});

// A map of CSS-based spacing functions to their CSS class.
const cssSpace = {
  "\\nobreak": "nobreak",
  "\\allowbreak": "allowbreak"
};

// A lookup table to determine whether a spacing function/symbol should be
// treated like a regular space character.  If a symbol or command is a key
// in this table, then it should be a regular space character.  Furthermore,
// the associated value may have a `className` specifying an extra CSS class
// to add to the created `span`.
const regularSpace = {
  " ": {},
  "\\ ": {},
  "~": {
    className: "nobreak"
  },
  "\\space": {},
  "\\nobreakspace": {
    className: "nobreak"
  }
};

// ParseNode<"spacing"> created in Parser.js from the "spacing" symbol Groups in
// src/symbols.js.
defineFunctionBuilders({
  type: "spacing",
  mathmlBuilder(group, style) {
    let node;

    if (Object.prototype.hasOwnProperty.call(regularSpace, group.text)) {
      // Firefox does not render a space in a <mtext> </mtext>. So write a no-break space.
      // TODO: If Firefox fixes that bug, uncomment the next line and write ch into the node.
      //const ch = (regularSpace[group.text].className === "nobreak") ? "\u00a0" : " "
      node = new mathMLTree.MathNode("mtext", [new mathMLTree.TextNode("\u00a0")]);
    } else if (Object.prototype.hasOwnProperty.call(cssSpace, group.text)) {
      // MathML 3.0 calls for nobreak to occur in an <mo>, not an <mtext>
      // Ref: https://www.w3.org/Math/draft-spec/mathml.html#chapter3_presm.lbattrs
      node = new mathMLTree.MathNode("mo");
      if (group.text === "\\nobreak") {
        node.setAttribute("linebreak", "nobreak");
      }
    } else {
      throw new ParseError(`Unknown type of space "${group.text}"`)
    }

    return node
  }
});

defineFunctionBuilders({
  type: "tag"
});

// For a \tag, the work usually done in a mathmlBuilder is instead done in buildMathML.js.
// That way, a \tag can be pulled out of the parse tree and wrapped around the outer node.

// Non-mathy text, possibly in a font
const textFontFamilies = {
  "\\text": undefined,
  "\\textrm": "textrm",
  "\\textsf": "textsf",
  "\\texttt": "texttt",
  "\\textnormal": "textrm",
  "\\textsc": "textsc"      // small caps
};

const textFontWeights = {
  "\\textbf": "textbf",
  "\\textmd": "textmd"
};

const textFontShapes = {
  "\\textit": "textit",
  "\\textup": "textup"
};

const styleWithFont = (group, style) => {
  const font = group.font;
  // Checks if the argument is a font family or a font style.
  if (!font) {
    return style;
  } else if (textFontFamilies[font]) {
    return style.withTextFontFamily(textFontFamilies[font]);
  } else if (textFontWeights[font]) {
    return style.withTextFontWeight(textFontWeights[font]);
  } else {
    return style.withTextFontShape(textFontShapes[font]);
  }
};

defineFunction({
  type: "text",
  names: [
    // Font families
    "\\text",
    "\\textrm",
    "\\textsf",
    "\\texttt",
    "\\textnormal",
    "\\textsc",
    // Font weights
    "\\textbf",
    "\\textmd",
    // Font Shapes
    "\\textit",
    "\\textup"
  ],
  props: {
    numArgs: 1,
    argTypes: ["text"],
    allowedInArgument: true,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "text",
      mode: parser.mode,
      body: ordargument(body),
      font: funcName
    };
  },
  mathmlBuilder(group, style) {
    const newStyle = styleWithFont(group, style);
    const mrow = buildExpressionRow(group.body, newStyle);
    return consolidateText(mrow)
  }
});

defineFunction({
  type: "verb",
  names: ["\\verb"],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler(context, args, optArgs) {
    // \verb and \verb* are dealt with directly in Parser.js.
    // If we end up here, it's because of a failure to match the two delimiters
    // in the regex in Lexer.js.  LaTeX raises the following error when \verb is
    // terminated by end of line (or file).
    throw new ParseError("\\verb ended by end of line instead of matching delimiter");
  },
  mathmlBuilder(group, style) {
    const text = new mathMLTree.TextNode(makeVerb(group));
    const node = new mathMLTree.MathNode("mtext", [text]);
    node.setAttribute("mathvariant", "monospace");
    return node;
  }
});

/**
 * Converts verb group into body string.
 *
 * \verb* replaces each space with an open box \u2423
 * \verb replaces each space with a no-break space \xA0
 */
const makeVerb = (group) => group.body.replace(/ /g, group.star ? "\u2423" : "\xA0");

/** Include this to ensure that all functions are defined. */

const functions$1 = _functions;

/**
 * Lexing or parsing positional information for error reporting.
 * This object is immutable.
 */
class SourceLocation {
  constructor(lexer, start, end) {
    this.lexer = lexer; // Lexer holding the input string.
    this.start = start; // Start offset, zero-based inclusive.
    this.end = end;     // End offset, zero-based exclusive.
  }

  /**
   * Merges two `SourceLocation`s from location providers, given they are
   * provided in order of appearance.
   * - Returns the first one's location if only the first is provided.
   * - Returns a merged range of the first and the last if both are provided
   *   and their lexers match.
   * - Otherwise, returns null.
   */
  static range(first, second) {
    if (!second) {
      return first && first.loc;
    } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
      return null;
    } else {
      return new SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
    }
  }
}

/**
 * Interface required to break circular dependency between Token, Lexer, and
 * ParseError.
 */

/**
 * The resulting token returned from `lex`.
 *
 * It consists of the token text plus some position information.
 * The position information is essentially a range in an input string,
 * but instead of referencing the bare input string, we refer to the lexer.
 * That way it is possible to attach extra metadata to the input string,
 * like for example a file name or similar.
 *
 * The position information is optional, so it is OK to construct synthetic
 * tokens if appropriate. Not providing available position information may
 * lead to degraded error reporting, though.
 */
class Token {
  constructor(
    text, // the text of this token
    loc
  ) {
    this.text = text;
    this.loc = loc;
  }

  /**
   * Given a pair of tokens (this and endToken), compute a `Token` encompassing
   * the whole input range enclosed by these two.
   */
  range(
    endToken, // last token of the range, inclusive
    text // the text of the newly constructed token
  ) {
    return new Token(text, SourceLocation.range(this, endToken));
  }
}

/**
 * The Lexer class handles tokenizing the input in various ways. Since our
 * parser expects us to be able to backtrack, the lexer allows lexing from any
 * given starting point.
 *
 * Its main exposed function is the `lex` function, which takes a position to
 * lex from and a type of token to lex. It defers to the appropriate `_innerLex`
 * function.
 *
 * The various `_innerLex` functions perform the actual lexing of different
 * kinds.
 */

/* The following tokenRegex
 * - matches typical whitespace (but not NBSP etc.) using its first two groups
 * - does not match any control character \x00-\x1f except whitespace
 * - does not match a bare backslash
 * - matches any ASCII character except those just mentioned
 * - does not match the BMP private use area \uE000-\uF8FF
 * - does not match bare surrogate code units
 * - matches any BMP character except for those just described
 * - matches any valid Unicode surrogate pair
 * - mathches numerals
 * - matches a backslash followed by one or more whitespace characters
 * - matches a backslash followed by one or more letters then whitespace
 * - matches a backslash followed by any BMP character
 * Capturing groups:
 *   [1] regular whitespace
 *   [2] backslash followed by whitespace
 *   [3] anything else, which may include:
 *     [4] left character of \verb*
 *     [5] left character of \verb
 *     [6] backslash followed by word, excluding any trailing whitespace
 * Just because the Lexer matches something doesn't mean it's valid input:
 * If there is no matching function or symbol definition, the Parser will
 * still reject the input.
 */
const spaceRegexString = "[ \r\n\t]";
const controlWordRegexString = "\\\\[a-zA-Z@]+";
const controlSymbolRegexString = "\\\\[^\uD800-\uDFFF]";
const controlWordWhitespaceRegexString = `(${controlWordRegexString})${spaceRegexString}*`;
const controlSpaceRegexString = "\\\\(\n|[ \r\t]+\n?)[ \r\t]*";
const combiningDiacriticalMarkString = "[\u0300-\u036f]";
const combiningDiacriticalMarksEndRegex = new RegExp(`${combiningDiacriticalMarkString}+$`);
const tokenRegexString =
  `(${spaceRegexString}+)|` + // whitespace
  `${controlSpaceRegexString}|` +  // whitespace
  "([!-\\[\\]-\u2027\u202A-\uD7FF\uF900-\uFFFF]" + // single codepoint
  `${combiningDiacriticalMarkString}*` + // ...plus accents
  "|[\uD800-\uDBFF][\uDC00-\uDFFF]" + // surrogate pair
  `${combiningDiacriticalMarkString}*` + // ...plus accents
  "|\\\\verb\\*([^]).*?\\4" + // \verb*
  "|\\\\verb([^*a-zA-Z]).*?\\5" + // \verb unstarred
  `|${controlWordWhitespaceRegexString}` + // \macroName + spaces
  `|${controlSymbolRegexString})`; // \\, \', etc.

/** Main Lexer class */
class Lexer {
  constructor(input, settings) {
    // Separate accents from characters
    this.input = input;
    this.settings = settings;
    this.tokenRegex = new RegExp(tokenRegexString, 'g');
    // Category codes. The lexer only supports comment characters (14) for now.
    // MacroExpander additionally distinguishes active (13).
    this.catcodes = {
      "%": 14, // comment character
      "~": 13  // active character
    };
  }

  setCatcode(char, code) {
    this.catcodes[char] = code;
  }

  /**
   * This function lexes a single token.
   */
  lex() {
    const input = this.input;
    const pos = this.tokenRegex.lastIndex;
    if (pos === input.length) {
      return new Token("EOF", new SourceLocation(this, pos, pos));
    }
    const match = this.tokenRegex.exec(input);
    if (match === null || match.index !== pos) {
      throw new ParseError(
        `Unexpected character: '${input[pos]}'`,
        new Token(input[pos], new SourceLocation(this, pos, pos + 1))
      );
    }
    const text = match[6] || match[3] || (match[2] ? "\\ " : " ");

    if (this.catcodes[text] === 14) {
      // comment character
      const nlIndex = input.indexOf("\n", this.tokenRegex.lastIndex);
      if (nlIndex === -1) {
        this.tokenRegex.lastIndex = input.length; // EOF
        if (this.settings.strict) {
          throw new ParseError("% comment has no terminating newline; LaTeX would " +
              "fail because of commenting the end of math mode")
        }
      } else {
        this.tokenRegex.lastIndex = nlIndex + 1;
      }
      return this.lex();
    }

    return new Token(text, new SourceLocation(this, pos, this.tokenRegex.lastIndex));
  }
}

/**
 * A `Namespace` refers to a space of nameable things like macros or lengths,
 * which can be `set` either globally or local to a nested group, using an
 * undo stack similar to how TeX implements this functionality.
 * Performance-wise, `get` and local `set` take constant time, while global
 * `set` takes time proportional to the depth of group nesting.
 */

class Namespace {
  /**
   * Both arguments are optional.  The first argument is an object of
   * built-in mappings which never change.  The second argument is an object
   * of initial (global-level) mappings, which will constantly change
   * according to any global/top-level `set`s done.
   */
  constructor(builtins = {}, globalMacros = {}) {
    this.current = globalMacros;
    this.builtins = builtins;
    this.undefStack = [];
  }

  /**
   * Start a new nested group, affecting future local `set`s.
   */
  beginGroup() {
    this.undefStack.push({});
  }

  /**
   * End current nested group, restoring values before the group began.
   */
  endGroup() {
    if (this.undefStack.length === 0) {
      throw new ParseError(
        "Unbalanced namespace destruction: attempt " +
          "to pop global namespace; please report this as a bug"
      );
    }
    const undefs = this.undefStack.pop();
    for (const undef in undefs) {
      if (Object.prototype.hasOwnProperty.call(undefs, undef )) {
        if (undefs[undef] === undefined) {
          delete this.current[undef];
        } else {
          this.current[undef] = undefs[undef];
        }
      }
    }
  }

  /**
   * Detect whether `name` has a definition.  Equivalent to
   * `get(name) != null`.
   */
  has(name) {
    return Object.prototype.hasOwnProperty.call(this.current, name ) ||
    Object.prototype.hasOwnProperty.call(this.builtins, name );
  }

  /**
   * Get the current value of a name, or `undefined` if there is no value.
   *
   * Note: Do not use `if (namespace.get(...))` to detect whether a macro
   * is defined, as the definition may be the empty string which evaluates
   * to `false` in JavaScript.  Use `if (namespace.get(...) != null)` or
   * `if (namespace.has(...))`.
   */
  get(name) {
    if (Object.prototype.hasOwnProperty.call(this.current, name )) {
      return this.current[name];
    } else {
      return this.builtins[name];
    }
  }

  /**
   * Set the current value of a name, and optionally set it globally too.
   * Local set() sets the current value and (when appropriate) adds an undo
   * operation to the undo stack.  Global set() may change the undo
   * operation at every level, so takes time linear in their number.
   */
  set(name, value, global = false) {
    if (global) {
      // Global set is equivalent to setting in all groups.  Simulate this
      // by destroying any undos currently scheduled for this name,
      // and adding an undo with the *new* value (in case it later gets
      // locally reset within this environment).
      for (let i = 0; i < this.undefStack.length; i++) {
        delete this.undefStack[i][name];
      }
      if (this.undefStack.length > 0) {
        this.undefStack[this.undefStack.length - 1][name] = value;
      }
    } else {
      // Undo this set at end of this group (possibly to `undefined`),
      // unless an undo is already in place, in which case that older
      // value is the correct one.
      const top = this.undefStack[this.undefStack.length - 1];
      if (top && !Object.prototype.hasOwnProperty.call(top, name )) {
        top[name] = this.current[name];
      }
    }
    this.current[name] = value;
  }
}

/**
 * Predefined macros for Temml.
 * This can be used to define some commands in terms of others.
 */
const macros = _macros;

//////////////////////////////////////////////////////////////////////
// macro tools

defineMacro("\\noexpand", function(context) {
  // The expansion is the token itself; but that token is interpreted
  // as if its meaning were ‘\relax’ if it is a control sequence that
  // would ordinarily be expanded by TeX’s expansion rules.
  const t = context.popToken();
  if (context.isExpandable(t.text)) {
    t.noexpand = true;
    t.treatAsRelax = true;
  }
  return { tokens: [t], numArgs: 0 };
});

defineMacro("\\expandafter", function(context) {
  // TeX first reads the token that comes immediately after \expandafter,
  // without expanding it; let’s call this token t. Then TeX reads the
  // token that comes after t (and possibly more tokens, if that token
  // has an argument), replacing it by its expansion. Finally TeX puts
  // t back in front of that expansion.
  const t = context.popToken();
  context.expandOnce(true); // expand only an expandable token
  return { tokens: [t], numArgs: 0 };
});

// LaTeX's \@firstoftwo{#1}{#2} expands to #1, skipping #2
// TeX source: \long\def\@firstoftwo#1#2{#1}
defineMacro("\\@firstoftwo", function(context) {
  const args = context.consumeArgs(2);
  return { tokens: args[0], numArgs: 0 };
});

// LaTeX's \@secondoftwo{#1}{#2} expands to #2, skipping #1
// TeX source: \long\def\@secondoftwo#1#2{#2}
defineMacro("\\@secondoftwo", function(context) {
  const args = context.consumeArgs(2);
  return { tokens: args[1], numArgs: 0 };
});

// LaTeX's \@ifnextchar{#1}{#2}{#3} looks ahead to the next (unexpanded)
// symbol that isn't a space, consuming any spaces but not consuming the
// first nonspace character.  If that nonspace character matches #1, then
// the macro expands to #2; otherwise, it expands to #3.
defineMacro("\\@ifnextchar", function(context) {
  const args = context.consumeArgs(3); // symbol, if, else
  context.consumeSpaces();
  const nextToken = context.future();
  if (args[0].length === 1 && args[0][0].text === nextToken.text) {
    return { tokens: args[1], numArgs: 0 };
  } else {
    return { tokens: args[2], numArgs: 0 };
  }
});

// LaTeX's \@ifstar{#1}{#2} looks ahead to the next (unexpanded) symbol.
// If it is `*`, then it consumes the symbol, and the macro expands to #1;
// otherwise, the macro expands to #2 (without consuming the symbol).
// TeX source: \def\@ifstar#1{\@ifnextchar *{\@firstoftwo{#1}}}
defineMacro("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}");

// LaTeX's \TextOrMath{#1}{#2} expands to #1 in text mode, #2 in math mode
defineMacro("\\TextOrMath", function(context) {
  const args = context.consumeArgs(2);
  if (context.mode === "text") {
    return { tokens: args[0], numArgs: 0 };
  } else {
    return { tokens: args[1], numArgs: 0 };
  }
});

const stringFromArg = arg => {
  // Reverse the order of the arg and return a string.
  let str = "";
  for (let i = arg.length - 1; i > -1; i--) {
    str += arg[i].text;
  }
  return str
};

// Lookup table for parsing numbers in base 8 through 16
const digitToNumber = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  A: 10,
  b: 11,
  B: 11,
  c: 12,
  C: 12,
  d: 13,
  D: 13,
  e: 14,
  E: 14,
  f: 15,
  F: 15
};

const nextCharNumber = context => {
  const numStr = context.future().text;
  if (numStr === "EOF") { return [null, ""] }
  return [digitToNumber[numStr.charAt(0)], numStr]
};

const appendCharNumbers = (number, numStr, base) => {
  for (let i = 1; i < numStr.length; i++) {
    const digit = digitToNumber[numStr.charAt(i)];
    number *= base;
    number += digit;
  }
  return number
};

// TeX \char makes a literal character (catcode 12) using the following forms:
// (see The TeXBook, p. 43)
//   \char123  -- decimal
//   \char'123 -- octal
//   \char"123 -- hex
//   \char`x   -- character that can be written (i.e. isn't active)
//   \char`\x  -- character that cannot be written (e.g. %)
// These all refer to characters from the font, so we turn them into special
// calls to a function \@char dealt with in the Parser.
defineMacro("\\char", function(context) {
  let token = context.popToken();
  let base;
  let number = "";
  if (token.text === "'") {
    base = 8;
    token = context.popToken();
  } else if (token.text === '"') {
    base = 16;
    token = context.popToken();
  } else if (token.text === "`") {
    token = context.popToken();
    if (token.text[0] === "\\") {
      number = token.text.charCodeAt(1);
    } else if (token.text === "EOF") {
      throw new ParseError("\\char` missing argument");
    } else {
      number = token.text.charCodeAt(0);
    }
  } else {
    base = 10;
  }
  if (base) {
    // Parse a number in the given base, starting with first `token`.
    let numStr = token.text;
    number = digitToNumber[numStr.charAt(0)];
    if (number == null || number >= base) {
      throw new ParseError(`Invalid base-${base} digit ${token.text}`);
    }
    number = appendCharNumbers(number, numStr, base);
    let digit;
    [digit, numStr] = nextCharNumber(context);
    while (digit != null && digit < base) {
      number *= base;
      number += digit;
      number = appendCharNumbers(number, numStr, base);
      context.popToken();
      [digit, numStr] = nextCharNumber(context);
    }
  }
  return `\\@char{${number}}`;
});

// The Latin Modern font renders <mi>√</mi> at the wrong vertical alignment.
// This macro provides a better rendering.
defineMacro("\\surd", '\\sqrt{\\vphantom{|}}');

defineMacro("\\hbox", "\\text{#1}");

// Per TeXbook p.122, "/" gets zero operator spacing.
// And MDN recommends using U+2044 instead of / for inline
defineMacro("/", "{\u2044}");

// Since Temml has no \par, ignore \long.
defineMacro("\\long", "");

//////////////////////////////////////////////////////////////////////
// Grouping
// \let\bgroup={ \let\egroup=}
defineMacro("\\bgroup", "{");
defineMacro("\\egroup", "}");

// Symbols from latex.ltx:
// \def~{\nobreakspace{}}
// \def\lq{`}
// \def\rq{'}
// \def \aa {\r a}
defineMacro("~", "\\nobreakspace");
defineMacro("\\lq", "`");
defineMacro("\\rq", "'");
defineMacro("\\aa", "\\r a");

defineMacro("\\Bbbk", "\\Bbb{k}");

// \mathstrut from the TeXbook, p 360
defineMacro("\\mathstrut", "\\vphantom{(}");

// \underbar from TeXbook p 353
defineMacro("\\underbar", "\\underline{\\text{#1}}");

//////////////////////////////////////////////////////////////////////
// LaTeX_2ε

// \vdots{\vbox{\baselineskip4\p@  \lineskiplimit\z@
// \kern6\p@\hbox{.}\hbox{.}\hbox{.}}}
// We'll call \varvdots, which gets a glyph from symbols.js.
// The zero-width rule gets us an equivalent to the vertical 6pt kern.
defineMacro("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}");
defineMacro("\u22ee", "\\vdots");

//////////////////////////////////////////////////////////////////////
// amsmath.sty
// http://mirrors.concertpass.com/tex-archive/macros/latex/required/amsmath/amsmath.pdf

//\newcommand{\substack}[1]{\subarray{c}#1\endsubarray}
defineMacro("\\substack", "\\begin{subarray}{c}#1\\end{subarray}");

// \newcommand{\boxed}[1]{\fbox{\m@th$\displaystyle#1$}}
defineMacro("\\boxed", "\\fbox{$\\displaystyle{#1}$}");

// \def\iff{\DOTSB\;\Longleftrightarrow\;}
// \def\implies{\DOTSB\;\Longrightarrow\;}
// \def\impliedby{\DOTSB\;\Longleftarrow\;}
defineMacro("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;");
defineMacro("\\implies", "\\DOTSB\\;\\Longrightarrow\\;");
defineMacro("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;");

// AMSMath's automatic \dots, based on \mdots@@ macro.
const dotsByToken = {
  ",": "\\dotsc",
  "\\not": "\\dotsb",
  // \keybin@ checks for the following:
  "+": "\\dotsb",
  "=": "\\dotsb",
  "<": "\\dotsb",
  ">": "\\dotsb",
  "-": "\\dotsb",
  "*": "\\dotsb",
  ":": "\\dotsb",
  // Symbols whose definition starts with \DOTSB:
  "\\DOTSB": "\\dotsb",
  "\\coprod": "\\dotsb",
  "\\bigvee": "\\dotsb",
  "\\bigwedge": "\\dotsb",
  "\\biguplus": "\\dotsb",
  "\\bigcap": "\\dotsb",
  "\\bigcup": "\\dotsb",
  "\\prod": "\\dotsb",
  "\\sum": "\\dotsb",
  "\\bigotimes": "\\dotsb",
  "\\bigoplus": "\\dotsb",
  "\\bigodot": "\\dotsb",
  "\\bigsqcap": "\\dotsb",
  "\\bigsqcup": "\\dotsb",
  "\\And": "\\dotsb",
  "\\longrightarrow": "\\dotsb",
  "\\Longrightarrow": "\\dotsb",
  "\\longleftarrow": "\\dotsb",
  "\\Longleftarrow": "\\dotsb",
  "\\longleftrightarrow": "\\dotsb",
  "\\Longleftrightarrow": "\\dotsb",
  "\\mapsto": "\\dotsb",
  "\\longmapsto": "\\dotsb",
  "\\hookrightarrow": "\\dotsb",
  "\\doteq": "\\dotsb",
  // Symbols whose definition starts with \mathbin:
  "\\mathbin": "\\dotsb",
  // Symbols whose definition starts with \mathrel:
  "\\mathrel": "\\dotsb",
  "\\relbar": "\\dotsb",
  "\\Relbar": "\\dotsb",
  "\\xrightarrow": "\\dotsb",
  "\\xleftarrow": "\\dotsb",
  // Symbols whose definition starts with \DOTSI:
  "\\DOTSI": "\\dotsi",
  "\\int": "\\dotsi",
  "\\oint": "\\dotsi",
  "\\iint": "\\dotsi",
  "\\iiint": "\\dotsi",
  "\\iiiint": "\\dotsi",
  "\\idotsint": "\\dotsi",
  // Symbols whose definition starts with \DOTSX:
  "\\DOTSX": "\\dotsx"
};

defineMacro("\\dots", function(context) {
  // TODO: If used in text mode, should expand to \textellipsis.
  // However, in Temml, \textellipsis and \ldots behave the same
  // (in text mode), and it's unlikely we'd see any of the math commands
  // that affect the behavior of \dots when in text mode.  So fine for now
  // (until we support \ifmmode ... \else ... \fi).
  let thedots = "\\dotso";
  const next = context.expandAfterFuture().text;
  if (next in dotsByToken) {
    thedots = dotsByToken[next];
  } else if (next.slice(0, 4) === "\\not") {
    thedots = "\\dotsb";
  } else if (next in symbols.math) {
    if (["bin", "rel"].includes(symbols.math[next].group)) {
      thedots = "\\dotsb";
    }
  }
  return thedots;
});

const spaceAfterDots = {
  // \rightdelim@ checks for the following:
  ")": true,
  "]": true,
  "\\rbrack": true,
  "\\}": true,
  "\\rbrace": true,
  "\\rangle": true,
  "\\rceil": true,
  "\\rfloor": true,
  "\\rgroup": true,
  "\\rmoustache": true,
  "\\right": true,
  "\\bigr": true,
  "\\biggr": true,
  "\\Bigr": true,
  "\\Biggr": true,
  // \extra@ also tests for the following:
  $: true,
  // \extrap@ checks for the following:
  ";": true,
  ".": true,
  ",": true
};

defineMacro("\\dotso", function(context) {
  const next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});

defineMacro("\\dotsc", function(context) {
  const next = context.future().text;
  // \dotsc uses \extra@ but not \extrap@, instead specially checking for
  // ';' and '.', but doesn't check for ','.
  if (next in spaceAfterDots && next !== ",") {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});

defineMacro("\\cdots", function(context) {
  const next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\@cdots\\,";
  } else {
    return "\\@cdots";
  }
});

defineMacro("\\dotsb", "\\cdots");
defineMacro("\\dotsm", "\\cdots");
defineMacro("\\dotsi", "\\!\\cdots");
defineMacro("\\idotsint", "\\dotsi");
// amsmath doesn't actually define \dotsx, but \dots followed by a macro
// starting with \DOTSX implies \dotso, and then \extra@ detects this case
// and forces the added `\,`.
defineMacro("\\dotsx", "\\ldots\\,");

// \let\DOTSI\relax
// \let\DOTSB\relax
// \let\DOTSX\relax
defineMacro("\\DOTSI", "\\relax");
defineMacro("\\DOTSB", "\\relax");
defineMacro("\\DOTSX", "\\relax");

// Spacing, based on amsmath.sty's override of LaTeX defaults
// \DeclareRobustCommand{\tmspace}[3]{%
//   \ifmmode\mskip#1#2\else\kern#1#3\fi\relax}
defineMacro("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax");
// \renewcommand{\,}{\tmspace+\thinmuskip{.1667em}}
// TODO: math mode should use \thinmuskip
defineMacro("\\,", "{\\tmspace+{3mu}{.1667em}}");
// \let\thinspace\,
defineMacro("\\thinspace", "\\,");
// \def\>{\mskip\medmuskip}
// \renewcommand{\:}{\tmspace+\medmuskip{.2222em}}
// TODO: \> and math mode of \: should use \medmuskip = 4mu plus 2mu minus 4mu
defineMacro("\\>", "\\mskip{4mu}");
defineMacro("\\:", "{\\tmspace+{4mu}{.2222em}}");
// \let\medspace\:
defineMacro("\\medspace", "\\:");
// \renewcommand{\;}{\tmspace+\thickmuskip{.2777em}}
// TODO: math mode should use \thickmuskip = 5mu plus 5mu
defineMacro("\\;", "{\\tmspace+{5mu}{.2777em}}");
// \let\thickspace\;
defineMacro("\\thickspace", "\\;");
// \renewcommand{\!}{\tmspace-\thinmuskip{.1667em}}
// TODO: math mode should use \thinmuskip
defineMacro("\\!", "{\\tmspace-{3mu}{.1667em}}");
// \let\negthinspace\!
defineMacro("\\negthinspace", "\\!");
// \newcommand{\negmedspace}{\tmspace-\medmuskip{.2222em}}
// TODO: math mode should use \medmuskip
defineMacro("\\negmedspace", "{\\tmspace-{4mu}{.2222em}}");
// \newcommand{\negthickspace}{\tmspace-\thickmuskip{.2777em}}
// TODO: math mode should use \thickmuskip
defineMacro("\\negthickspace", "{\\tmspace-{5mu}{.277em}}");
// \def\enspace{\kern.5em }
defineMacro("\\enspace", "\\kern.5em ");
// \def\enskip{\hskip.5em\relax}
defineMacro("\\enskip", "\\hskip.5em\\relax");
// \def\quad{\hskip1em\relax}
defineMacro("\\quad", "\\hskip1em\\relax");
// \def\qquad{\hskip2em\relax}
defineMacro("\\qquad", "\\hskip2em\\relax");

// \tag@in@display form of \tag
defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
defineMacro("\\tag@literal", (context) => {
  if (context.macros.get("\\df@tag")) {
    throw new ParseError("Multiple \\tag");
  }
  return "\\def\\df@tag{\\text{#1}}";
});

// \renewcommand{\bmod}{\nonscript\mskip-\medmuskip\mkern5mu\mathbin
//   {\operator@font mod}\penalty900
//   \mkern5mu\nonscript\mskip-\medmuskip}
// \newcommand{\pod}[1]{\allowbreak
//   \if@display\mkern18mu\else\mkern8mu\fi(#1)}
// \renewcommand{\pmod}[1]{\pod{{\operator@font mod}\mkern6mu#1}}
// \newcommand{\mod}[1]{\allowbreak\if@display\mkern18mu
//   \else\mkern12mu\fi{\operator@font mod}\,\,#1}
// TODO: math mode should use \medmuskip = 4mu plus 2mu minus 4mu
defineMacro("\\bmod", "\\mathbin{\\text{mod}}");
defineMacro(
  "\\pod",
  "\\allowbreak" + "\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"
);
defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
defineMacro(
  "\\mod",
  "\\allowbreak" +
    "\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}" +
    "{\\rm mod}\\,\\,#1"
);

//////////////////////////////////////////////////////////////////////
// LaTeX source2e

// \expandafter\let\expandafter\@normalcr
//     \csname\expandafter\@gobble\string\\ \endcsname
// \DeclareRobustCommand\newline{\@normalcr\relax}
defineMacro("\\newline", "\\\\\\relax");

// \def\TeX{T\kern-.1667em\lower.5ex\hbox{E}\kern-.125emX\@}
// TODO: Doesn't normally work in math mode because \@ fails.
defineMacro("\\TeX", "\\textrm{T}\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125em\\textrm{X}");

defineMacro(
  "\\LaTeX",
    "\\textrm{L}\\kern-.35em\\raisebox{0.2em}{\\scriptstyle A}\\kern-.15em\\TeX"
);

defineMacro(
  "\\Temml",
  // eslint-disable-next-line max-len
  "\\textrm{T}\\kern-0.2em\\lower{0.2em}\\textrm{E}\\kern-0.08em{\\textrm{M}\\kern-0.08em\\raise{0.2em}\\textrm{M}\\kern-0.08em\\textrm{L}}"
);

// \DeclareRobustCommand\hspace{\@ifstar\@hspacer\@hspace}
// \def\@hspace#1{\hskip  #1\relax}
// \def\@hspacer#1{\vrule \@width\z@\nobreak
//                 \hskip #1\hskip \z@skip}
defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
defineMacro("\\@hspace", "\\hskip #1\\relax");
defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax");

defineMacro("\\colon", `\\mathpunct{\\char"3a}`);

//////////////////////////////////////////////////////////////////////
// mathtools.sty

defineMacro("\\prescript", "\\pres@cript{_{#1}^{#2}}{}{#3}");

//\providecommand\ordinarycolon{:}
defineMacro("\\ordinarycolon", `\\char"3a`);
// Raise to center on the math axis, as closely as possible.
defineMacro("\\vcentcolon", "\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}}");
// \providecommand*\coloneq{\vcentcolon\mathrel{\mkern-1.2mu}\mathrel{-}}
defineMacro("\\coloneq", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2212}');
// \providecommand*\Coloneq{\dblcolon\mathrel{\mkern-1.2mu}\mathrel{-}}
defineMacro("\\Coloneq", '\\mathrel{\\char"2237\\char"2212}');
// \providecommand*\Eqqcolon{=\mathrel{\mkern-1.2mu}\dblcolon}
defineMacro("\\Eqqcolon", '\\mathrel{\\char"3d\\char"2237}');
// \providecommand*\Eqcolon{\mathrel{-}\mathrel{\mkern-1.2mu}\dblcolon}
defineMacro("\\Eqcolon", '\\mathrel{\\char"2212\\char"2237}');
// \providecommand*\colonapprox{\vcentcolon\mathrel{\mkern-1.2mu}\approx}
defineMacro("\\colonapprox", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2248}');
// \providecommand*\Colonapprox{\dblcolon\mathrel{\mkern-1.2mu}\approx}
defineMacro("\\Colonapprox", '\\mathrel{\\char"2237\\char"2248}');
// \providecommand*\colonsim{\vcentcolon\mathrel{\mkern-1.2mu}\sim}
defineMacro("\\colonsim", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}');
// \providecommand*\Colonsim{\dblcolon\mathrel{\mkern-1.2mu}\sim}
defineMacro("\\Colonsim", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}');

//////////////////////////////////////////////////////////////////////
// colonequals.sty

// Alternate names for mathtools's macros:
defineMacro("\\ratio", "\\vcentcolon");
defineMacro("\\coloncolon", "\\dblcolon");
defineMacro("\\colonequals", "\\coloneqq");
defineMacro("\\coloncolonequals", "\\Coloneqq");
defineMacro("\\equalscolon", "\\eqqcolon");
defineMacro("\\equalscoloncolon", "\\Eqqcolon");
defineMacro("\\colonminus", "\\coloneq");
defineMacro("\\coloncolonminus", "\\Coloneq");
defineMacro("\\minuscolon", "\\eqcolon");
defineMacro("\\minuscoloncolon", "\\Eqcolon");
// \colonapprox name is same in mathtools and colonequals.
defineMacro("\\coloncolonapprox", "\\Colonapprox");
// \colonsim name is same in mathtools and colonequals.
defineMacro("\\coloncolonsim", "\\Colonsim");

// Present in newtxmath, pxfonts and txfonts
defineMacro("\\notni", "\\mathrel{\\char`\u220C}");
defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}");

//////////////////////////////////////////////////////////////////////
// From amsopn.sty
defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{\\text{lim}}}");
defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{\\text{lim}}}");
defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{\\text{lim}}}");
defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{\\text{lim}}}");

defineMacro("\\centerdot", "{\\medspace\\rule{0.167em}{0.189em}\\medspace}");

//////////////////////////////////////////////////////////////////////
// statmath.sty
// https://ctan.math.illinois.edu/macros/latex/contrib/statmath/statmath.pdf

defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
defineMacro("\\plim", "\\DOTSB\\operatorname*{plim}");

//////////////////////////////////////////////////////////////////////
// braket.sty
// http://ctan.math.washington.edu/tex-archive/macros/latex/contrib/braket/braket.pdf

defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
defineMacro("\\Bra", "\\left\\langle#1\\right|");
defineMacro("\\Ket", "\\left|#1\\right\\rangle");
const braketHelper = (one) => (context) => {
  const left = context.consumeArg().tokens;
  const middle = context.consumeArg().tokens;
  const middleDouble = context.consumeArg().tokens;
  const right = context.consumeArg().tokens;
  const oldMiddle = context.macros.get("|");
  const oldMiddleDouble = context.macros.get("\\|");
  context.macros.beginGroup();
  const midMacro = (double) => (context) => {
    if (one) {
      // Only modify the first instance of | or \|
      context.macros.set("|", oldMiddle);
      if (middleDouble.length) {
        context.macros.set("\\|", oldMiddleDouble);
      }
    }
    let doubled = double;
    if (!double && middleDouble.length) {
      // Mimic \@ifnextchar
      const nextToken = context.future();
      if (nextToken.text === "|") {
        context.popToken();
        doubled = true;
      }
    }
    return {
      tokens: doubled ? middleDouble : middle,
      numArgs: 0
    };
  };
  context.macros.set("|", midMacro(false));
  if (middleDouble.length) {
    context.macros.set("\\|", midMacro(true));
  }
  const arg = context.consumeArg().tokens;
  const expanded = context.expandTokens([...right, ...arg, ...left]);  // reversed
  context.macros.endGroup();
  return {
    tokens: expanded.reverse(),
    numArgs: 0
  };
};
defineMacro("\\bra@ket", braketHelper(false));
defineMacro("\\bra@set", braketHelper(true));
defineMacro("\\Braket", "\\bra@ket{\\left\\langle}" +
  "{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}");
defineMacro("\\Set", "\\bra@set{\\left\\{\\:}" +
  "{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}");
defineMacro("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}");
  // has no support for special || or \|

//////////////////////////////////////////////////////////////////////
// actuarialangle.dtx
defineMacro("\\angln", "{\\angl n}");

//////////////////////////////////////////////////////////////////////
// derivative.sty
defineMacro("\\odv", "\\@ifstar\\odv@next\\odv@numerator");
defineMacro("\\odv@numerator", "\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}");
defineMacro("\\odv@next", "\\frac{\\mathrm{d}}{\\mathrm{d}#2}#1");
defineMacro("\\pdv", "\\@ifstar\\pdv@next\\pdv@numerator");

const pdvHelper = args => {
  const numerator = args[0][0].text;
  const denoms = stringFromArg(args[1]).split(",");
  const power = String(denoms.length);
  const numOp = power === "1" ? "\\partial" : `\\partial^${power}`;
  let denominator = "";
  denoms.map(e => { denominator += "\\partial " + e.trim() +  "\\,";});
  return [numerator, numOp,  denominator.replace(/\\,$/, "")]
};
defineMacro("\\pdv@numerator", function(context) {
  const [numerator, numOp, denominator] = pdvHelper(context.consumeArgs(2));
  return `\\frac{${numOp} ${numerator}}{${denominator}}`
});
defineMacro("\\pdv@next", function(context) {
  const [numerator, numOp, denominator] = pdvHelper(context.consumeArgs(2));
  return `\\frac{${numOp}}{${denominator}} ${numerator}`
});

//////////////////////////////////////////////////////////////////////
// upgreek.dtx
defineMacro("\\upalpha", "\\up@greek{\\alpha}");
defineMacro("\\upbeta", "\\up@greek{\\beta}");
defineMacro("\\upgamma", "\\up@greek{\\gamma}");
defineMacro("\\updelta", "\\up@greek{\\delta}");
defineMacro("\\upepsilon", "\\up@greek{\\epsilon}");
defineMacro("\\upzeta", "\\up@greek{\\zeta}");
defineMacro("\\upeta", "\\up@greek{\\eta}");
defineMacro("\\uptheta", "\\up@greek{\\theta}");
defineMacro("\\upiota", "\\up@greek{\\iota}");
defineMacro("\\upkappa", "\\up@greek{\\kappa}");
defineMacro("\\uplambda", "\\up@greek{\\lambda}");
defineMacro("\\upmu", "\\up@greek{\\mu}");
defineMacro("\\upnu", "\\up@greek{\\nu}");
defineMacro("\\upxi", "\\up@greek{\\xi}");
defineMacro("\\upomicron", "\\up@greek{\\omicron}");
defineMacro("\\uppi", "\\up@greek{\\pi}");
defineMacro("\\upalpha", "\\up@greek{\\alpha}");
defineMacro("\\uprho", "\\up@greek{\\rho}");
defineMacro("\\upsigma", "\\up@greek{\\sigma}");
defineMacro("\\uptau", "\\up@greek{\\tau}");
defineMacro("\\upupsilon", "\\up@greek{\\upsilon}");
defineMacro("\\upphi", "\\up@greek{\\phi}");
defineMacro("\\upchi", "\\up@greek{\\chi}");
defineMacro("\\uppsi", "\\up@greek{\\psi}");
defineMacro("\\upomega", "\\up@greek{\\omega}");

//////////////////////////////////////////////////////////////////////
// cmll package
defineMacro("\\invamp", '\\mathbin{\\char"214b}');
defineMacro("\\parr", '\\mathbin{\\char"214b}');
defineMacro("\\with", '\\mathbin{\\char"26}');
defineMacro("\\multimapinv", '\\mathrel{\\char"27dc}');
defineMacro("\\multimapboth", '\\mathrel{\\char"29df}');
defineMacro("\\scoh", '{\\mkern5mu\\char"2322\\mkern5mu}');
defineMacro("\\sincoh", '{\\mkern5mu\\char"2323\\mkern5mu}');
defineMacro("\\coh", `{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2322}}}
{\\smash{\\lower4mu{\\char"2323}}}\\mkern5mu}`);
defineMacro("\\incoh", `{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2323}}}
{\\smash{\\lower4mu{\\char"2322}}}\\mkern5mu}`);


//////////////////////////////////////////////////////////////////////
// chemstyle package
defineMacro("\\standardstate", "\\text{\\tiny\\char`⦵}");

﻿/* eslint-disable */
/* -*- Mode: JavaScript; indent-tabs-mode:nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */

/*************************************************************
 *
 *  Temml mhchem.js
 *
 *  This file implements a Temml version of mhchem version 3.3.0.
 *  It is adapted from MathJax/extensions/TeX/mhchem.js
 *  It differs from the MathJax version as follows:
 *    1. The interface is changed so that it can be called from Temml, not MathJax.
 *    2. \rlap and \llap are replaced with \mathrlap and \mathllap.
 *    3. The reaction arrow code is simplified. All reaction arrows are rendered
 *       using Temml extensible arrows instead of building non-extensible arrows.
 *    4. The ~bond forms are composed entirely of \rule elements.
 *    5. Two dashes in _getBond are wrapped in braces to suppress spacing. i.e., {-}
 *    6. The electron dot uses \textbullet instead of \bullet.
 *
 *    This code, as other Temml code, is released under the MIT license.
 * 
 * /*************************************************************
 *
 *  MathJax/extensions/TeX/mhchem.js
 *
 *  Implements the \ce command for handling chemical formulas
 *  from the mhchem LaTeX package.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2011-2015 The MathJax Consortium
 *  Copyright (c) 2015-2018 Martin Hensel
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

//
// Coding Style
//   - use '' for identifiers that can by minified/uglified
//   - use "" for strings that need to stay untouched

// version: "3.3.0" for MathJax and Temml


// Add \ce, \pu, and \tripleDash to the Temml macros.

defineMacro("\\ce", function(context) {
  return chemParse(context.consumeArgs(1)[0], "ce")
});

defineMacro("\\pu", function(context) {
  return chemParse(context.consumeArgs(1)[0], "pu");
});

// Math fonts do not include glyphs for the ~ form of bonds. So we'll send path geometry
// So we'll compose characters built from \rule elements.
defineMacro("\\uniDash", `{\\rule{0.672em}{0.06em}}`);
defineMacro("\\triDash", `{\\rule{0.15em}{0.06em}\\kern2mu\\rule{0.15em}{0.06em}\\kern2mu\\rule{0.15em}{0.06em}}`);
defineMacro("\\tripleDash", `\\kern0.075em\\raise0.25em{\\triDash}\\kern0.075em`);
defineMacro("\\tripleDashOverLine", `\\kern0.075em\\mathrlap{\\raise0.125em{\\uniDash}}\\raise0.34em{\\triDash}\\kern0.075em`);
defineMacro("\\tripleDashOverDoubleLine", `\\kern0.075em\\mathrlap{\\mathrlap{\\raise0.48em{\\triDash}}\\raise0.27em{\\uniDash}}{\\raise0.05em{\\uniDash}}\\kern0.075em`);
defineMacro("\\tripleDashBetweenDoubleLine", `\\kern0.075em\\mathrlap{\\mathrlap{\\raise0.48em{\\uniDash}}\\raise0.27em{\\triDash}}{\\raise0.05em{\\uniDash}}\\kern0.075em`);

  //
  //  This is the main function for handing the \ce and \pu commands.
  //  It takes the argument to \ce or \pu and returns the corresponding TeX string.
  //

  var chemParse = function (tokens, stateMachine) {
    // Recreate the argument string from Temml's array of tokens.
    var str = "";
    var expectedLoc = tokens.length && tokens[tokens.length - 1].loc.start;
    for (var i = tokens.length - 1; i >= 0; i--) {
      if(tokens[i].loc.start > expectedLoc) {
        // context.consumeArgs has eaten a space.
        str += " ";
        expectedLoc = tokens[i].loc.start;
      }
      str += tokens[i].text;
      expectedLoc += tokens[i].text.length;
    }
    // Call the mhchem core parser.
    var tex = texify.go(mhchemParser.go(str, stateMachine));
    return tex;
  };

  //
  // Core parser for mhchem syntax  (recursive)
  //
  /** @type {MhchemParser} */
  var mhchemParser = {
    //
    // Parses mchem \ce syntax
    //
    // Call like
    //   go("H2O");
    //
    go: function (input, stateMachine) {
      if (!input) { return []; }
      if (stateMachine === undefined) { stateMachine = 'ce'; }
      var state = '0';

      //
      // String buffers for parsing:
      //
      // buffer.a == amount
      // buffer.o == element
      // buffer.b == left-side superscript
      // buffer.p == left-side subscript
      // buffer.q == right-side subscript
      // buffer.d == right-side superscript
      //
      // buffer.r == arrow
      // buffer.rdt == arrow, script above, type
      // buffer.rd == arrow, script above, content
      // buffer.rqt == arrow, script below, type
      // buffer.rq == arrow, script below, content
      //
      // buffer.text_
      // buffer.rm
      // etc.
      //
      // buffer.parenthesisLevel == int, starting at 0
      // buffer.sb == bool, space before
      // buffer.beginsWithBond == bool
      //
      // These letters are also used as state names.
      //
      // Other states:
      // 0 == begin of main part (arrow/operator unlikely)
      // 1 == next entity
      // 2 == next entity (arrow/operator unlikely)
      // 3 == next atom
      // c == macro
      //
      /** @type {Buffer} */
      var buffer = {};
      buffer['parenthesisLevel'] = 0;

      input = input.replace(/\n/g, " ");
      input = input.replace(/[\u2212\u2013\u2014\u2010]/g, "-");
      input = input.replace(/[\u2026]/g, "...");

      //
      // Looks through mhchemParser.transitions, to execute a matching action
      // (recursive)
      //
      var lastInput;
      var watchdog = 10;
      /** @type {ParserOutput[]} */
      var output = [];
      while (true) {
        if (lastInput !== input) {
          watchdog = 10;
          lastInput = input;
        } else {
          watchdog--;
        }
        //
        // Find actions in transition table
        //
        var machine = mhchemParser.stateMachines[stateMachine];
        var t = machine.transitions[state] || machine.transitions['*'];
        iterateTransitions:
        for (var i=0; i<t.length; i++) {
          var matches = mhchemParser.patterns.match_(t[i].pattern, input);
          if (matches) {
            //
            // Execute actions
            //
            var task = t[i].task;
            for (var iA=0; iA<task.action_.length; iA++) {
              var o;
              //
              // Find and execute action
              //
              if (machine.actions[task.action_[iA].type_]) {
                o = machine.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
              } else if (mhchemParser.actions[task.action_[iA].type_]) {
                o = mhchemParser.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
              } else {
                throw ["MhchemBugA", "mhchem bug A. Please report. (" + task.action_[iA].type_ + ")"];  // Trying to use non-existing action
              }
              //
              // Add output
              //
              mhchemParser.concatArray(output, o);
            }
            //
            // Set next state,
            // Shorten input,
            // Continue with next character
            //   (= apply only one transition per position)
            //
            state = task.nextState || state;
            if (input.length > 0) {
              if (!task.revisit) {
                input = matches.remainder;
              }
              if (!task.toContinue) {
                break iterateTransitions;
              }
            } else {
              return output;
            }
          }
        }
        //
        // Prevent infinite loop
        //
        if (watchdog <= 0) {
          throw ["MhchemBugU", "mhchem bug U. Please report."];  // Unexpected character
        }
      }
    },
    concatArray: function (a, b) {
      if (b) {
        if (Array.isArray(b)) {
          for (var iB=0; iB<b.length; iB++) {
            a.push(b[iB]);
          }
        } else {
          a.push(b);
        }
      }
    },

    patterns: {
      //
      // Matching patterns
      // either regexps or function that return null or {match_:"a", remainder:"bc"}
      //
      patterns: {
        // property names must not look like integers ("2") for correct property traversal order, later on
        'empty': /^$/,
        'else': /^./,
        'else2': /^./,
        'space': /^\s/,
        'space A': /^\s(?=[A-Z\\$])/,
        'space$': /^\s$/,
        'a-z': /^[a-z]/,
        'x': /^x/,
        'x$': /^x$/,
        'i$': /^i$/,
        'letters': /^(?:[a-zA-Z\u03B1-\u03C9\u0391-\u03A9?@]|(?:\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))))+/,
        '\\greek': /^\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))/,
        'one lowercase latin letter $': /^(?:([a-z])(?:$|[^a-zA-Z]))$/,
        '$one lowercase latin letter$ $': /^\$(?:([a-z])(?:$|[^a-zA-Z]))\$$/,
        'one lowercase greek letter $': /^(?:\$?[\u03B1-\u03C9]\$?|\$?\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s*\$?)(?:\s+|\{\}|(?![a-zA-Z]))$/,
        'digits': /^[0-9]+/,
        '-9.,9': /^[+\-]?(?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))/,
        '-9.,9 no missing 0': /^[+\-]?[0-9]+(?:[.,][0-9]+)?/,
        '(-)(9.,9)(e)(99)': function (input) {
          var m = input.match(/^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))?(\((?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))\))?(?:([eE]|\s*(\*|x|\\times|\u00D7)\s*10\^)([+\-]?[0-9]+|\{[+\-]?[0-9]+\}))?/);
          if (m && m[0]) {
            return { match_: m.splice(1), remainder: input.substr(m[0].length) };
          }
          return null;
        },
        '(-)(9)^(-9)': function (input) {
          var m = input.match(/^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+)?)\^([+\-]?[0-9]+|\{[+\-]?[0-9]+\})/);
          if (m && m[0]) {
            return { match_: m.splice(1), remainder: input.substr(m[0].length) };
          }
          return null;
        },
        'state of aggregation $': function (input) {  // ... or crystal system
          var a = mhchemParser.patterns.findObserveGroups(input, "", /^\([a-z]{1,3}(?=[\),])/, ")", "");  // (aq), (aq,$\infty$), (aq, sat)
          if (a  &&  a.remainder.match(/^($|[\s,;\)\]\}])/)) { return a; }  //  AND end of 'phrase'
          var m = input.match(/^(?:\((?:\\ca\s?)?\$[amothc]\$\))/);  // OR crystal system ($o$) (\ca$c$)
          if (m) {
            return { match_: m[0], remainder: input.substr(m[0].length) };
          }
          return null;
        },
        '_{(state of aggregation)}$': /^_\{(\([a-z]{1,3}\))\}/,
        '{[(': /^(?:\\\{|\[|\()/,
        ')]}': /^(?:\)|\]|\\\})/,
        ', ': /^[,;]\s*/,
        ',': /^[,;]/,
        '.': /^[.]/,
        '. ': /^([.\u22C5\u00B7\u2022])\s*/,
        '...': /^\.\.\.(?=$|[^.])/,
        '* ': /^([*])\s*/,
        '^{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "^{", "", "", "}"); },
        '^($...$)': function (input) { return mhchemParser.patterns.findObserveGroups(input, "^", "$", "$", ""); },
        '^a': /^\^([0-9]+|[^\\_])/,
        '^\\x{}{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true); },
        '^\\x{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", ""); },
        '^\\x': /^\^(\\[a-zA-Z]+)\s*/,
        '^(-1)': /^\^(-?\d+)/,
        '\'': /^'/,
        '_{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "_{", "", "", "}"); },
        '_($...$)': function (input) { return mhchemParser.patterns.findObserveGroups(input, "_", "$", "$", ""); },
        '_9': /^_([+\-]?[0-9]+|[^\\])/,
        '_\\x{}{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true); },
        '_\\x{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", ""); },
        '_\\x': /^_(\\[a-zA-Z]+)\s*/,
        '^_': /^(?:\^(?=_)|\_(?=\^)|[\^_]$)/,
        '{}': /^\{\}/,
        '{...}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "", "{", "}", ""); },
        '{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "{", "", "", "}"); },
        '$...$': function (input) { return mhchemParser.patterns.findObserveGroups(input, "", "$", "$", ""); },
        '${(...)}$': function (input) { return mhchemParser.patterns.findObserveGroups(input, "${", "", "", "}$"); },
        '$(...)$': function (input) { return mhchemParser.patterns.findObserveGroups(input, "$", "", "", "$"); },
        '=<>': /^[=<>]/,
        '#': /^[#\u2261]/,
        '+': /^\+/,
        '-$': /^-(?=[\s_},;\]/]|$|\([a-z]+\))/,  // -space -, -; -] -/ -$ -state-of-aggregation
        '-9': /^-(?=[0-9])/,
        '- orbital overlap': /^-(?=(?:[spd]|sp)(?:$|[\s,;\)\]\}]))/,
        '-': /^-/,
        'pm-operator': /^(?:\\pm|\$\\pm\$|\+-|\+\/-)/,
        'operator': /^(?:\+|(?:[\-=<>]|<<|>>|\\approx|\$\\approx\$)(?=\s|$|-?[0-9]))/,
        'arrowUpDown': /^(?:v|\(v\)|\^|\(\^\))(?=$|[\s,;\)\]\}])/,
        '\\bond{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\bond{", "", "", "}"); },
        '->': /^(?:<->|<-->|->|<-|<=>>|<<=>|<=>|[\u2192\u27F6\u21CC])/,
        'CMT': /^[CMT](?=\[)/,
        '[(...)]': function (input) { return mhchemParser.patterns.findObserveGroups(input, "[", "", "", "]"); },
        '1st-level escape': /^(&|\\\\|\\hline)\s*/,
        '\\,': /^(?:\\[,\ ;:])/,  // \\x - but output no space before
        '\\x{}{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true); },
        '\\x{}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", ""); },
        '\\ca': /^\\ca(?:\s+|(?![a-zA-Z]))/,
        '\\x': /^(?:\\[a-zA-Z]+\s*|\\[_&{}%])/,
        'orbital': /^(?:[0-9]{1,2}[spdfgh]|[0-9]{0,2}sp)(?=$|[^a-zA-Z])/,  // only those with numbers in front, because the others will be formatted correctly anyway
        'others': /^[\/~|]/,
        '\\frac{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\frac{", "", "", "}", "{", "", "", "}"); },
        '\\overset{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\overset{", "", "", "}", "{", "", "", "}"); },
        '\\underset{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\underset{", "", "", "}", "{", "", "", "}"); },
        '\\underbrace{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\underbrace{", "", "", "}_", "{", "", "", "}"); },
        '\\color{(...)}0': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}"); },
        '\\color{(...)}{(...)}1': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}", "{", "", "", "}"); },
        '\\color(...){(...)}2': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\color", "\\", "", /^(?=\{)/, "{", "", "", "}"); },
        '\\ce{(...)}': function (input) { return mhchemParser.patterns.findObserveGroups(input, "\\ce{", "", "", "}"); },
        'oxidation$': /^(?:[+-][IVX]+|\\pm\s*0|\$\\pm\$\s*0)$/,
        'd-oxidation$': /^(?:[+-]?\s?[IVX]+|\\pm\s*0|\$\\pm\$\s*0)$/,  // 0 could be oxidation or charge
        'roman numeral': /^[IVX]+/,
        '1/2$': /^[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+(?:\$[a-z]\$|[a-z])?$/,
        'amount': function (input) {
          var match;
          // e.g. 2, 0.5, 1/2, -2, n/2, +;  $a$ could be added later in parsing
          match = input.match(/^(?:(?:(?:\([+\-]?[0-9]+\/[0-9]+\)|[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+|[+\-]?[0-9]+[.,][0-9]+|[+\-]?\.[0-9]+|[+\-]?[0-9]+)(?:[a-z](?=\s*[A-Z]))?)|[+\-]?[a-z](?=\s*[A-Z])|\+(?!\s))/);
          if (match) {
            return { match_: match[0], remainder: input.substr(match[0].length) };
          }
          var a = mhchemParser.patterns.findObserveGroups(input, "", "$", "$", "");
          if (a) {  // e.g. $2n-1$, $-$
            match = a.match_.match(/^\$(?:\(?[+\-]?(?:[0-9]*[a-z]?[+\-])?[0-9]*[a-z](?:[+\-][0-9]*[a-z]?)?\)?|\+|-)\$$/);
            if (match) {
              return { match_: match[0], remainder: input.substr(match[0].length) };
            }
          }
          return null;
        },
        'amount2': function (input) { return this['amount'](input); },
        '(KV letters),': /^(?:[A-Z][a-z]{0,2}|i)(?=,)/,
        'formula$': function (input) {
          if (input.match(/^\([a-z]+\)$/)) { return null; }  // state of aggregation = no formula
          var match = input.match(/^(?:[a-z]|(?:[0-9\ \+\-\,\.\(\)]+[a-z])+[0-9\ \+\-\,\.\(\)]*|(?:[a-z][0-9\ \+\-\,\.\(\)]+)+[a-z]?)$/);
          if (match) {
            return { match_: match[0], remainder: input.substr(match[0].length) };
          }
          return null;
        },
        'uprightEntities': /^(?:pH|pOH|pC|pK|iPr|iBu)(?=$|[^a-zA-Z])/,
        '/': /^\s*(\/)\s*/,
        '//': /^\s*(\/\/)\s*/,
        '*': /^\s*[*.]\s*/
      },
      findObserveGroups: function (input, begExcl, begIncl, endIncl, endExcl, beg2Excl, beg2Incl, end2Incl, end2Excl, combine) {
        /** @type {{(input: string, pattern: string | RegExp): string | string[] | null;}} */
        var _match = function (input, pattern) {
          if (typeof pattern === "string") {
            if (input.indexOf(pattern) !== 0) { return null; }
            return pattern;
          } else {
            var match = input.match(pattern);
            if (!match) { return null; }
            return match[0];
          }
        };
        /** @type {{(input: string, i: number, endChars: string | RegExp): {endMatchBegin: number, endMatchEnd: number} | null;}} */
        var _findObserveGroups = function (input, i, endChars) {
          var braces = 0;
          while (i < input.length) {
            var a = input.charAt(i);
            var match = _match(input.substr(i), endChars);
            if (match !== null  &&  braces === 0) {
              return { endMatchBegin: i, endMatchEnd: i + match.length };
            } else if (a === "{") {
              braces++;
            } else if (a === "}") {
              if (braces === 0) {
                throw ["ExtraCloseMissingOpen", "Extra close brace or missing open brace"];
              } else {
                braces--;
              }
            }
            i++;
          }
          if (braces > 0) {
            return null;
          }
          return null;
        };
        var match = _match(input, begExcl);
        if (match === null) { return null; }
        input = input.substr(match.length);
        match = _match(input, begIncl);
        if (match === null) { return null; }
        var e = _findObserveGroups(input, match.length, endIncl || endExcl);
        if (e === null) { return null; }
        var match1 = input.substring(0, (endIncl ? e.endMatchEnd : e.endMatchBegin));
        if (!(beg2Excl || beg2Incl)) {
          return {
            match_: match1,
            remainder: input.substr(e.endMatchEnd)
          };
        } else {
          var group2 = this.findObserveGroups(input.substr(e.endMatchEnd), beg2Excl, beg2Incl, end2Incl, end2Excl);
          if (group2 === null) { return null; }
          /** @type {string[]} */
          var matchRet = [match1, group2.match_];
          return {
            match_: (combine ? matchRet.join("") : matchRet),
            remainder: group2.remainder
          };
        }
      },

      //
      // Matching function
      // e.g. match("a", input) will look for the regexp called "a" and see if it matches
      // returns null or {match_:"a", remainder:"bc"}
      //
      match_: function (m, input) {
        var pattern = mhchemParser.patterns.patterns[m];
        if (pattern === undefined) {
          throw ["MhchemBugP", "mhchem bug P. Please report. (" + m + ")"];  // Trying to use non-existing pattern
        } else if (typeof pattern === "function") {
          return mhchemParser.patterns.patterns[m](input);  // cannot use cached var pattern here, because some pattern functions need this===mhchemParser
        } else {  // RegExp
          var match = input.match(pattern);
          if (match) {
            var mm;
            if (match[2]) {
              mm = [ match[1], match[2] ];
            } else if (match[1]) {
              mm = match[1];
            } else {
              mm = match[0];
            }
            return { match_: mm, remainder: input.substr(match[0].length) };
          }
          return null;
        }
      }
    },

    //
    // Generic state machine actions
    //
    actions: {
      'a=': function (buffer, m) { buffer.a = (buffer.a || "") + m; },
      'b=': function (buffer, m) { buffer.b = (buffer.b || "") + m; },
      'p=': function (buffer, m) { buffer.p = (buffer.p || "") + m; },
      'o=': function (buffer, m) { buffer.o = (buffer.o || "") + m; },
      'q=': function (buffer, m) { buffer.q = (buffer.q || "") + m; },
      'd=': function (buffer, m) { buffer.d = (buffer.d || "") + m; },
      'rm=': function (buffer, m) { buffer.rm = (buffer.rm || "") + m; },
      'text=': function (buffer, m) { buffer.text_ = (buffer.text_ || "") + m; },
      'insert': function (buffer, m, a) { return { type_: a }; },
      'insert+p1': function (buffer, m, a) { return { type_: a, p1: m }; },
      'insert+p1+p2': function (buffer, m, a) { return { type_: a, p1: m[0], p2: m[1] }; },
      'copy': function (buffer, m) { return m; },
      'rm': function (buffer, m) { return { type_: 'rm', p1: m || ""}; },
      'text': function (buffer, m) { return mhchemParser.go(m, 'text'); },
      '{text}': function (buffer, m) {
        var ret = [ "{" ];
        mhchemParser.concatArray(ret, mhchemParser.go(m, 'text'));
        ret.push("}");
        return ret;
      },
      'tex-math': function (buffer, m) { return mhchemParser.go(m, 'tex-math'); },
      'tex-math tight': function (buffer, m) { return mhchemParser.go(m, 'tex-math tight'); },
      'bond': function (buffer, m, k) { return { type_: 'bond', kind_: k || m }; },
      'color0-output': function (buffer, m) { return { type_: 'color0', color: m[0] }; },
      'ce': function (buffer, m) { return mhchemParser.go(m); },
      '1/2': function (buffer, m) {
        /** @type {ParserOutput[]} */
        var ret = [];
        if (m.match(/^[+\-]/)) {
          ret.push(m.substr(0, 1));
          m = m.substr(1);
        }
        var n = m.match(/^([0-9]+|\$[a-z]\$|[a-z])\/([0-9]+)(\$[a-z]\$|[a-z])?$/);
        n[1] = n[1].replace(/\$/g, "");
        ret.push({ type_: 'frac', p1: n[1], p2: n[2] });
        if (n[3]) {
          n[3] = n[3].replace(/\$/g, "");
          ret.push({ type_: 'tex-math', p1: n[3] });
        }
        return ret;
      },
      '9,9': function (buffer, m) { return mhchemParser.go(m, '9,9'); }
    },
    //
    // createTransitions
    // convert  { 'letter': { 'state': { action_: 'output' } } }  to  { 'state' => [ { pattern: 'letter', task: { action_: [{type_: 'output'}] } } ] }
    // with expansion of 'a|b' to 'a' and 'b' (at 2 places)
    //
    createTransitions: function (o) {
      var pattern, state;
      /** @type {string[]} */
      var stateArray;
      var i;
      //
      // 1. Collect all states
      //
      /** @type {Transitions} */
      var transitions = {};
      for (pattern in o) {
        for (state in o[pattern]) {
          stateArray = state.split("|");
          o[pattern][state].stateArray = stateArray;
          for (i=0; i<stateArray.length; i++) {
            transitions[stateArray[i]] = [];
          }
        }
      }
      //
      // 2. Fill states
      //
      for (pattern in o) {
        for (state in o[pattern]) {
          stateArray = o[pattern][state].stateArray || [];
          for (i=0; i<stateArray.length; i++) {
            //
            // 2a. Normalize actions into array:  'text=' ==> [{type_:'text='}]
            // (Note to myself: Resolving the function here would be problematic. It would need .bind (for *this*) and currying (for *option*).)
            //
            /** @type {any} */
            var p = o[pattern][state];
            if (p.action_) {
              p.action_ = [].concat(p.action_);
              for (var k=0; k<p.action_.length; k++) {
                if (typeof p.action_[k] === "string") {
                  p.action_[k] = { type_: p.action_[k] };
                }
              }
            } else {
              p.action_ = [];
            }
            //
            // 2.b Multi-insert
            //
            var patternArray = pattern.split("|");
            for (var j=0; j<patternArray.length; j++) {
              if (stateArray[i] === '*') {  // insert into all
                for (var t in transitions) {
                  transitions[t].push({ pattern: patternArray[j], task: p });
                }
              } else {
                transitions[stateArray[i]].push({ pattern: patternArray[j], task: p });
              }
            }
          }
        }
      }
      return transitions;
    },
    stateMachines: {}
  };

  //
  // Definition of state machines
  //
  mhchemParser.stateMachines = {
    //
    // \ce state machines
    //
    //#region ce
    'ce': {  // main parser
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        'else':  {
          '0|1|2': { action_: 'beginsWithBond=false', revisit: true, toContinue: true } },
        'oxidation$': {
          '0': { action_: 'oxidation-output' } },
        'CMT': {
          'r': { action_: 'rdt=', nextState: 'rt' },
          'rd': { action_: 'rqt=', nextState: 'rdt' } },
        'arrowUpDown': {
          '0|1|2|as': { action_: [ 'sb=false', 'output', 'operator' ], nextState: '1' } },
        'uprightEntities': {
          '0|1|2': { action_: [ 'o=', 'output' ], nextState: '1' } },
        'orbital': {
          '0|1|2|3': { action_: 'o=', nextState: 'o' } },
        '->': {
          '0|1|2|3': { action_: 'r=', nextState: 'r' },
          'a|as': { action_: [ 'output', 'r=' ], nextState: 'r' },
          '*': { action_: [ 'output', 'r=' ], nextState: 'r' } },
        '+': {
          'o': { action_: 'd= kv',  nextState: 'd' },
          'd|D': { action_: 'd=', nextState: 'd' },
          'q': { action_: 'd=',  nextState: 'qd' },
          'qd|qD': { action_: 'd=', nextState: 'qd' },
          'dq': { action_: [ 'output', 'd=' ], nextState: 'd' },
          '3': { action_: [ 'sb=false', 'output', 'operator' ], nextState: '0' } },
        'amount': {
          '0|2': { action_: 'a=', nextState: 'a' } },
        'pm-operator': {
          '0|1|2|a|as': { action_: [ 'sb=false', 'output', { type_: 'operator', option: '\\pm' } ], nextState: '0' } },
        'operator': {
          '0|1|2|a|as': { action_: [ 'sb=false', 'output', 'operator' ], nextState: '0' } },
        '-$': {
          'o|q': { action_: [ 'charge or bond', 'output' ],  nextState: 'qd' },
          'd': { action_: 'd=', nextState: 'd' },
          'D': { action_: [ 'output', { type_: 'bond', option: "-" } ], nextState: '3' },
          'q': { action_: 'd=',  nextState: 'qd' },
          'qd': { action_: 'd=', nextState: 'qd' },
          'qD|dq': { action_: [ 'output', { type_: 'bond', option: "-" } ], nextState: '3' } },
        '-9': {
          '3|o': { action_: [ 'output', { type_: 'insert', option: 'hyphen' } ], nextState: '3' } },
        '- orbital overlap': {
          'o': { action_: [ 'output', { type_: 'insert', option: 'hyphen' } ], nextState: '2' },
          'd': { action_: [ 'output', { type_: 'insert', option: 'hyphen' } ], nextState: '2' } },
        '-': {
          '0|1|2': { action_: [ { type_: 'output', option: 1 }, 'beginsWithBond=true', { type_: 'bond', option: "-" } ], nextState: '3' },
          '3': { action_: { type_: 'bond', option: "-" } },
          'a': { action_: [ 'output', { type_: 'insert', option: 'hyphen' } ], nextState: '2' },
          'as': { action_: [ { type_: 'output', option: 2 }, { type_: 'bond', option: "-" } ], nextState: '3' },
          'b': { action_: 'b=' },
          'o': { action_: { type_: '- after o/d', option: false }, nextState: '2' },
          'q': { action_: { type_: '- after o/d', option: false }, nextState: '2' },
          'd|qd|dq': { action_: { type_: '- after o/d', option: true }, nextState: '2' },
          'D|qD|p': { action_: [ 'output', { type_: 'bond', option: "-" } ], nextState: '3' } },
        'amount2': {
          '1|3': { action_: 'a=', nextState: 'a' } },
        'letters': {
          '0|1|2|3|a|as|b|p|bp|o': { action_: 'o=', nextState: 'o' },
          'q|dq': { action_: ['output', 'o='], nextState: 'o' },
          'd|D|qd|qD': { action_: 'o after d', nextState: 'o' } },
        'digits': {
          'o': { action_: 'q=', nextState: 'q' },
          'd|D': { action_: 'q=', nextState: 'dq' },
          'q': { action_: [ 'output', 'o=' ], nextState: 'o' },
          'a': { action_: 'o=', nextState: 'o' } },
        'space A': {
          'b|p|bp': {} },
        'space': {
          'a': { nextState: 'as' },
          '0': { action_: 'sb=false' },
          '1|2': { action_: 'sb=true' },
          'r|rt|rd|rdt|rdq': { action_: 'output', nextState: '0' },
          '*': { action_: [ 'output', 'sb=true' ], nextState: '1'} },
        '1st-level escape': {
          '1|2': { action_: [ 'output', { type_: 'insert+p1', option: '1st-level escape' } ] },
          '*': { action_: [ 'output', { type_: 'insert+p1', option: '1st-level escape' } ], nextState: '0' } },
        '[(...)]': {
          'r|rt': { action_: 'rd=', nextState: 'rd' },
          'rd|rdt': { action_: 'rq=', nextState: 'rdq' } },
        '...': {
          'o|d|D|dq|qd|qD': { action_: [ 'output', { type_: 'bond', option: "..." } ], nextState: '3' },
          '*': { action_: [ { type_: 'output', option: 1 }, { type_: 'insert', option: 'ellipsis' } ], nextState: '1' } },
        '. |* ': {
          '*': { action_: [ 'output', { type_: 'insert', option: 'addition compound' } ], nextState: '1' } },
        'state of aggregation $': {
          '*': { action_: [ 'output', 'state of aggregation' ], nextState: '1' } },
        '{[(': {
          'a|as|o': { action_: [ 'o=', 'output', 'parenthesisLevel++' ], nextState: '2' },
          '0|1|2|3': { action_: [ 'o=', 'output', 'parenthesisLevel++' ], nextState: '2' },
          '*': { action_: [ 'output', 'o=', 'output', 'parenthesisLevel++' ], nextState: '2' } },
        ')]}': {
          '0|1|2|3|b|p|bp|o': { action_: [ 'o=', 'parenthesisLevel--' ], nextState: 'o' },
          'a|as|d|D|q|qd|qD|dq': { action_: [ 'output', 'o=', 'parenthesisLevel--' ], nextState: 'o' } },
        ', ': {
          '*': { action_: [ 'output', 'comma' ], nextState: '0' } },
        '^_': {  // ^ and _ without a sensible argument
          '*': { } },
        '^{(...)}|^($...$)': {
          '0|1|2|as': { action_: 'b=', nextState: 'b' },
          'p': { action_: 'b=', nextState: 'bp' },
          '3|o': { action_: 'd= kv', nextState: 'D' },
          'q': { action_: 'd=', nextState: 'qD' },
          'd|D|qd|qD|dq': { action_: [ 'output', 'd=' ], nextState: 'D' } },
        '^a|^\\x{}{}|^\\x{}|^\\x|\'': {
          '0|1|2|as': { action_: 'b=', nextState: 'b' },
          'p': { action_: 'b=', nextState: 'bp' },
          '3|o': { action_: 'd= kv', nextState: 'd' },
          'q': { action_: 'd=', nextState: 'qd' },
          'd|qd|D|qD': { action_: 'd=' },
          'dq': { action_: [ 'output', 'd=' ], nextState: 'd' } },
        '_{(state of aggregation)}$': {
          'd|D|q|qd|qD|dq': { action_: [ 'output', 'q=' ], nextState: 'q' } },
        '_{(...)}|_($...$)|_9|_\\x{}{}|_\\x{}|_\\x': {
          '0|1|2|as': { action_: 'p=', nextState: 'p' },
          'b': { action_: 'p=', nextState: 'bp' },
          '3|o': { action_: 'q=', nextState: 'q' },
          'd|D': { action_: 'q=', nextState: 'dq' },
          'q|qd|qD|dq': { action_: [ 'output', 'q=' ], nextState: 'q' } },
        '=<>': {
          '0|1|2|3|a|as|o|q|d|D|qd|qD|dq': { action_: [ { type_: 'output', option: 2 }, 'bond' ], nextState: '3' } },
        '#': {
          '0|1|2|3|a|as|o': { action_: [ { type_: 'output', option: 2 }, { type_: 'bond', option: "#" } ], nextState: '3' } },
        '{}': {
          '*': { action_: { type_: 'output', option: 1 },  nextState: '1' } },
        '{...}': {
          '0|1|2|3|a|as|b|p|bp': { action_: 'o=', nextState: 'o' },
          'o|d|D|q|qd|qD|dq': { action_: [ 'output', 'o=' ], nextState: 'o' } },
        '$...$': {
          'a': { action_: 'a=' },  // 2$n$
          '0|1|2|3|as|b|p|bp|o': { action_: 'o=', nextState: 'o' },  // not 'amount'
          'as|o': { action_: 'o=' },
          'q|d|D|qd|qD|dq': { action_: [ 'output', 'o=' ], nextState: 'o' } },
        '\\bond{(...)}': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'bond' ], nextState: "3" } },
        '\\frac{(...)}': {
          '*': { action_: [ { type_: 'output', option: 1 }, 'frac-output' ], nextState: '3' } },
        '\\overset{(...)}': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'overset-output' ], nextState: '3' } },
        '\\underset{(...)}': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'underset-output' ], nextState: '3' } },
        '\\underbrace{(...)}': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'underbrace-output' ], nextState: '3' } },
        '\\color{(...)}{(...)}1|\\color(...){(...)}2': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'color-output' ], nextState: '3' } },
        '\\color{(...)}0': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'color0-output' ] } },
        '\\ce{(...)}': {
          '*': { action_: [ { type_: 'output', option: 2 }, 'ce' ], nextState: '3' } },
        '\\,': {
          '*': { action_: [ { type_: 'output', option: 1 }, 'copy' ], nextState: '1' } },
        '\\x{}{}|\\x{}|\\x': {
          '0|1|2|3|a|as|b|p|bp|o|c0': { action_: [ 'o=', 'output' ], nextState: '3' },
          '*': { action_: ['output', 'o=', 'output' ], nextState: '3' } },
        'others': {
          '*': { action_: [ { type_: 'output', option: 1 }, 'copy' ], nextState: '3' } },
        'else2': {
          'a': { action_: 'a to o', nextState: 'o', revisit: true },
          'as': { action_: [ 'output', 'sb=true' ], nextState: '1', revisit: true },
          'r|rt|rd|rdt|rdq': { action_: [ 'output' ], nextState: '0', revisit: true },
          '*': { action_: [ 'output', 'copy' ], nextState: '3' } }
      }),
      actions: {
        'o after d': function (buffer, m) {
          var ret;
          if ((buffer.d || "").match(/^[0-9]+$/)) {
            var tmp = buffer.d;
            buffer.d = undefined;
            ret = this['output'](buffer);
            buffer.b = tmp;
          } else {
            ret = this['output'](buffer);
          }
          mhchemParser.actions['o='](buffer, m);
          return ret;
        },
        'd= kv': function (buffer, m) {
          buffer.d = m;
          buffer.dType = 'kv';
        },
        'charge or bond': function (buffer, m) {
          if (buffer['beginsWithBond']) {
            /** @type {ParserOutput[]} */
            var ret = [];
            mhchemParser.concatArray(ret, this['output'](buffer));
            mhchemParser.concatArray(ret, mhchemParser.actions['bond'](buffer, m, "-"));
            return ret;
          } else {
            buffer.d = m;
          }
        },
        '- after o/d': function (buffer, m, isAfterD) {
          var c1 = mhchemParser.patterns.match_('orbital', buffer.o || "");
          var c2 = mhchemParser.patterns.match_('one lowercase greek letter $', buffer.o || "");
          var c3 = mhchemParser.patterns.match_('one lowercase latin letter $', buffer.o || "");
          var c4 = mhchemParser.patterns.match_('$one lowercase latin letter$ $', buffer.o || "");
          var hyphenFollows =  m==="-" && ( c1 && c1.remainder===""  ||  c2  ||  c3  ||  c4 );
          if (hyphenFollows && !buffer.a && !buffer.b && !buffer.p && !buffer.d && !buffer.q && !c1 && c3) {
            buffer.o = '$' + buffer.o + '$';
          }
          /** @type {ParserOutput[]} */
          var ret = [];
          if (hyphenFollows) {
            mhchemParser.concatArray(ret, this['output'](buffer));
            ret.push({ type_: 'hyphen' });
          } else {
            c1 = mhchemParser.patterns.match_('digits', buffer.d || "");
            if (isAfterD && c1 && c1.remainder==='') {
              mhchemParser.concatArray(ret, mhchemParser.actions['d='](buffer, m));
              mhchemParser.concatArray(ret, this['output'](buffer));
            } else {
              mhchemParser.concatArray(ret, this['output'](buffer));
              mhchemParser.concatArray(ret, mhchemParser.actions['bond'](buffer, m, "-"));
            }
          }
          return ret;
        },
        'a to o': function (buffer) {
          buffer.o = buffer.a;
          buffer.a = undefined;
        },
        'sb=true': function (buffer) { buffer.sb = true; },
        'sb=false': function (buffer) { buffer.sb = false; },
        'beginsWithBond=true': function (buffer) { buffer['beginsWithBond'] = true; },
        'beginsWithBond=false': function (buffer) { buffer['beginsWithBond'] = false; },
        'parenthesisLevel++': function (buffer) { buffer['parenthesisLevel']++; },
        'parenthesisLevel--': function (buffer) { buffer['parenthesisLevel']--; },
        'state of aggregation': function (buffer, m) {
          return { type_: 'state of aggregation', p1: mhchemParser.go(m, 'o') };
        },
        'comma': function (buffer, m) {
          var a = m.replace(/\s*$/, '');
          var withSpace = (a !== m);
          if (withSpace  &&  buffer['parenthesisLevel'] === 0) {
            return { type_: 'comma enumeration L', p1: a };
          } else {
            return { type_: 'comma enumeration M', p1: a };
          }
        },
        'output': function (buffer, m, entityFollows) {
          // entityFollows:
          //   undefined = if we have nothing else to output, also ignore the just read space (buffer.sb)
          //   1 = an entity follows, never omit the space if there was one just read before (can only apply to state 1)
          //   2 = 1 + the entity can have an amount, so output a\, instead of converting it to o (can only apply to states a|as)
          /** @type {ParserOutput | ParserOutput[]} */
          var ret;
          if (!buffer.r) {
            ret = [];
            if (!buffer.a && !buffer.b && !buffer.p && !buffer.o && !buffer.q && !buffer.d && !entityFollows) ; else {
              if (buffer.sb) {
                ret.push({ type_: 'entitySkip' });
              }
              if (!buffer.o && !buffer.q && !buffer.d && !buffer.b && !buffer.p && entityFollows!==2) {
                buffer.o = buffer.a;
                buffer.a = undefined;
              } else if (!buffer.o && !buffer.q && !buffer.d && (buffer.b || buffer.p)) {
                buffer.o = buffer.a;
                buffer.d = buffer.b;
                buffer.q = buffer.p;
                buffer.a = buffer.b = buffer.p = undefined;
              } else {
                if (buffer.o && buffer.dType==='kv' && mhchemParser.patterns.match_('d-oxidation$', buffer.d || "")) {
                  buffer.dType = 'oxidation';
                } else if (buffer.o && buffer.dType==='kv' && !buffer.q) {
                  buffer.dType = undefined;
                }
              }
              ret.push({
                type_: 'chemfive',
                a: mhchemParser.go(buffer.a, 'a'),
                b: mhchemParser.go(buffer.b, 'bd'),
                p: mhchemParser.go(buffer.p, 'pq'),
                o: mhchemParser.go(buffer.o, 'o'),
                q: mhchemParser.go(buffer.q, 'pq'),
                d: mhchemParser.go(buffer.d, (buffer.dType === 'oxidation' ? 'oxidation' : 'bd')),
                dType: buffer.dType
              });
            }
          } else {  // r
            /** @type {ParserOutput[]} */
            var rd;
            if (buffer.rdt === 'M') {
              rd = mhchemParser.go(buffer.rd, 'tex-math');
            } else if (buffer.rdt === 'T') {
              rd = [ { type_: 'text', p1: buffer.rd || "" } ];
            } else {
              rd = mhchemParser.go(buffer.rd);
            }
            /** @type {ParserOutput[]} */
            var rq;
            if (buffer.rqt === 'M') {
              rq = mhchemParser.go(buffer.rq, 'tex-math');
            } else if (buffer.rqt === 'T') {
              rq = [ { type_: 'text', p1: buffer.rq || ""} ];
            } else {
              rq = mhchemParser.go(buffer.rq);
            }
            ret = {
              type_: 'arrow',
              r: buffer.r,
              rd: rd,
              rq: rq
            };
          }
          for (var p in buffer) {
            if (p !== 'parenthesisLevel'  &&  p !== 'beginsWithBond') {
              delete buffer[p];
            }
          }
          return ret;
        },
        'oxidation-output': function (buffer, m) {
          var ret = [ "{" ];
          mhchemParser.concatArray(ret, mhchemParser.go(m, 'oxidation'));
          ret.push("}");
          return ret;
        },
        'frac-output': function (buffer, m) {
          return { type_: 'frac-ce', p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
        },
        'overset-output': function (buffer, m) {
          return { type_: 'overset', p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
        },
        'underset-output': function (buffer, m) {
          return { type_: 'underset', p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
        },
        'underbrace-output': function (buffer, m) {
          return { type_: 'underbrace', p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
        },
        'color-output': function (buffer, m) {
          return { type_: 'color', color1: m[0], color2: mhchemParser.go(m[1]) };
        },
        'r=': function (buffer, m) { buffer.r = m; },
        'rdt=': function (buffer, m) { buffer.rdt = m; },
        'rd=': function (buffer, m) { buffer.rd = m; },
        'rqt=': function (buffer, m) { buffer.rqt = m; },
        'rq=': function (buffer, m) { buffer.rq = m; },
        'operator': function (buffer, m, p1) { return { type_: 'operator', kind_: (p1 || m) }; }
      }
    },
    'a': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        '1/2$': {
          '0': { action_: '1/2' } },
        'else': {
          '0': { nextState: '1', revisit: true } },
        '$(...)$': {
          '*': { action_: 'tex-math tight', nextState: '1' } },
        ',': {
          '*': { action_: { type_: 'insert', option: 'commaDecimal' } } },
        'else2': {
          '*': { action_: 'copy' } }
      }),
      actions: {}
    },
    'o': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        '1/2$': {
          '0': { action_: '1/2' } },
        'else': {
          '0': { nextState: '1', revisit: true } },
        'letters': {
          '*': { action_: 'rm' } },
        '\\ca': {
          '*': { action_: { type_: 'insert', option: 'circa' } } },
        '\\x{}{}|\\x{}|\\x': {
          '*': { action_: 'copy' } },
        '${(...)}$|$(...)$': {
          '*': { action_: 'tex-math' } },
        '{(...)}': {
          '*': { action_: '{text}' } },
        'else2': {
          '*': { action_: 'copy' } }
      }),
      actions: {}
    },
    'text': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        '{...}': {
          '*': { action_: 'text=' } },
        '${(...)}$|$(...)$': {
          '*': { action_: 'tex-math' } },
        '\\greek': {
          '*': { action_: [ 'output', 'rm' ] } },
        '\\,|\\x{}{}|\\x{}|\\x': {
          '*': { action_: [ 'output', 'copy' ] } },
        'else': {
          '*': { action_: 'text=' } }
      }),
      actions: {
        'output': function (buffer) {
          if (buffer.text_) {
            /** @type {ParserOutput} */
            var ret = { type_: 'text', p1: buffer.text_ };
            for (var p in buffer) { delete buffer[p]; }
            return ret;
          }
        }
      }
    },
    'pq': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        'state of aggregation $': {
          '*': { action_: 'state of aggregation' } },
        'i$': {
          '0': { nextState: '!f', revisit: true } },
        '(KV letters),': {
          '0': { action_: 'rm', nextState: '0' } },
        'formula$': {
          '0': { nextState: 'f', revisit: true } },
        '1/2$': {
          '0': { action_: '1/2' } },
        'else': {
          '0': { nextState: '!f', revisit: true } },
        '${(...)}$|$(...)$': {
          '*': { action_: 'tex-math' } },
        '{(...)}': {
          '*': { action_: 'text' } },
        'a-z': {
          'f': { action_: 'tex-math' } },
        'letters': {
          '*': { action_: 'rm' } },
        '-9.,9': {
          '*': { action_: '9,9'  } },
        ',': {
          '*': { action_: { type_: 'insert+p1', option: 'comma enumeration S' } } },
        '\\color{(...)}{(...)}1|\\color(...){(...)}2': {
          '*': { action_: 'color-output' } },
        '\\color{(...)}0': {
          '*': { action_: 'color0-output' } },
        '\\ce{(...)}': {
          '*': { action_: 'ce' } },
        '\\,|\\x{}{}|\\x{}|\\x': {
          '*': { action_: 'copy' } },
        'else2': {
          '*': { action_: 'copy' } }
      }),
      actions: {
        'state of aggregation': function (buffer, m) {
          return { type_: 'state of aggregation subscript', p1: mhchemParser.go(m, 'o') };
        },
        'color-output': function (buffer, m) {
          return { type_: 'color', color1: m[0], color2: mhchemParser.go(m[1], 'pq') };
        }
      }
    },
    'bd': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        'x$': {
          '0': { nextState: '!f', revisit: true } },
        'formula$': {
          '0': { nextState: 'f', revisit: true } },
        'else': {
          '0': { nextState: '!f', revisit: true } },
        '-9.,9 no missing 0': {
          '*': { action_: '9,9' } },
        '.': {
          '*': { action_: { type_: 'insert', option: 'electron dot' } } },
        'a-z': {
          'f': { action_: 'tex-math' } },
        'x': {
          '*': { action_: { type_: 'insert', option: 'KV x' } } },
        'letters': {
          '*': { action_: 'rm' } },
        '\'': {
          '*': { action_: { type_: 'insert', option: 'prime' } } },
        '${(...)}$|$(...)$': {
          '*': { action_: 'tex-math' } },
        '{(...)}': {
          '*': { action_: 'text' } },
        '\\color{(...)}{(...)}1|\\color(...){(...)}2': {
          '*': { action_: 'color-output' } },
        '\\color{(...)}0': {
          '*': { action_: 'color0-output' } },
        '\\ce{(...)}': {
          '*': { action_: 'ce' } },
        '\\,|\\x{}{}|\\x{}|\\x': {
          '*': { action_: 'copy' } },
        'else2': {
          '*': { action_: 'copy' } }
      }),
      actions: {
        'color-output': function (buffer, m) {
          return { type_: 'color', color1: m[0], color2: mhchemParser.go(m[1], 'bd') };
        }
      }
    },
    'oxidation': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        'roman numeral': {
          '*': { action_: 'roman-numeral' } },
        '${(...)}$|$(...)$': {
          '*': { action_: 'tex-math' } },
        'else': {
          '*': { action_: 'copy' } }
      }),
      actions: {
        'roman-numeral': function (buffer, m) { return { type_: 'roman numeral', p1: m || "" }; }
      }
    },
    'tex-math': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        '\\ce{(...)}': {
          '*': { action_: [ 'output', 'ce' ] } },
        '{...}|\\,|\\x{}{}|\\x{}|\\x': {
          '*': { action_: 'o=' } },
        'else': {
          '*': { action_: 'o=' } }
      }),
      actions: {
        'output': function (buffer) {
          if (buffer.o) {
            /** @type {ParserOutput} */
            var ret = { type_: 'tex-math', p1: buffer.o };
            for (var p in buffer) { delete buffer[p]; }
            return ret;
          }
        }
      }
    },
    'tex-math tight': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        '\\ce{(...)}': {
          '*': { action_: [ 'output', 'ce' ] } },
        '{...}|\\,|\\x{}{}|\\x{}|\\x': {
          '*': { action_: 'o=' } },
        '-|+': {
          '*': { action_: 'tight operator' } },
        'else': {
          '*': { action_: 'o=' } }
      }),
      actions: {
        'tight operator': function (buffer, m) { buffer.o = (buffer.o || "") + "{"+m+"}"; },
        'output': function (buffer) {
          if (buffer.o) {
            /** @type {ParserOutput} */
            var ret = { type_: 'tex-math', p1: buffer.o };
            for (var p in buffer) { delete buffer[p]; }
            return ret;
          }
        }
      }
    },
    '9,9': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': {} },
        ',': {
          '*': { action_: 'comma' } },
        'else': {
          '*': { action_: 'copy' } }
      }),
      actions: {
        'comma': function () { return { type_: 'commaDecimal' }; }
      }
    },
    //#endregion
    //
    // \pu state machines
    //
    //#region pu
    'pu': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        'space$': {
          '*': { action_: [ 'output', 'space' ] } },
        '{[(|)]}': {
          '0|a': { action_: 'copy' } },
        '(-)(9)^(-9)': {
          '0': { action_: 'number^', nextState: 'a' } },
        '(-)(9.,9)(e)(99)': {
          '0': { action_: 'enumber', nextState: 'a' } },
        'space': {
          '0|a': {} },
        'pm-operator': {
          '0|a': { action_: { type_: 'operator', option: '\\pm' }, nextState: '0' } },
        'operator': {
          '0|a': { action_: 'copy', nextState: '0' } },
        '//': {
          'd': { action_: 'o=', nextState: '/' } },
        '/': {
          'd': { action_: 'o=', nextState: '/' } },
        '{...}|else': {
          '0|d': { action_: 'd=', nextState: 'd' },
          'a': { action_: [ 'space', 'd=' ], nextState: 'd' },
          '/|q': { action_: 'q=', nextState: 'q' } }
      }),
      actions: {
        'enumber': function (buffer, m) {
          /** @type {ParserOutput[]} */
          var ret = [];
          if (m[0] === "+-"  ||  m[0] === "+/-") {
            ret.push("\\pm ");
          } else if (m[0]) {
            ret.push(m[0]);
          }
          if (m[1]) {
            mhchemParser.concatArray(ret, mhchemParser.go(m[1], 'pu-9,9'));
            if (m[2]) {
              if (m[2].match(/[,.]/)) {
                mhchemParser.concatArray(ret, mhchemParser.go(m[2], 'pu-9,9'));
              } else {
                ret.push(m[2]);
              }
            }
            m[3] = m[4] || m[3];
            if (m[3]) {
              m[3] = m[3].trim();
              if (m[3] === "e"  ||  m[3].substr(0, 1) === "*") {
                ret.push({ type_: 'cdot' });
              } else {
                ret.push({ type_: 'times' });
              }
            }
          }
          if (m[3]) {
            ret.push("10^{"+m[5]+"}");
          }
          return ret;
        },
        'number^': function (buffer, m) {
          /** @type {ParserOutput[]} */
          var ret = [];
          if (m[0] === "+-"  ||  m[0] === "+/-") {
            ret.push("\\pm ");
          } else if (m[0]) {
            ret.push(m[0]);
          }
          mhchemParser.concatArray(ret, mhchemParser.go(m[1], 'pu-9,9'));
          ret.push("^{"+m[2]+"}");
          return ret;
        },
        'operator': function (buffer, m, p1) { return { type_: 'operator', kind_: (p1 || m) }; },
        'space': function () { return { type_: 'pu-space-1' }; },
        'output': function (buffer) {
          /** @type {ParserOutput | ParserOutput[]} */
          var ret;
          var md = mhchemParser.patterns.match_('{(...)}', buffer.d || "");
          if (md  &&  md.remainder === '') { buffer.d = md.match_; }
          var mq = mhchemParser.patterns.match_('{(...)}', buffer.q || "");
          if (mq  &&  mq.remainder === '') { buffer.q = mq.match_; }
          if (buffer.d) {
            buffer.d = buffer.d.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
            buffer.d = buffer.d.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
          }
          if (buffer.q) {  // fraction
            buffer.q = buffer.q.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
            buffer.q = buffer.q.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
            var b5 = {
              d: mhchemParser.go(buffer.d, 'pu'),
              q: mhchemParser.go(buffer.q, 'pu')
            };
            if (buffer.o === '//') {
              ret = { type_: 'pu-frac', p1: b5.d, p2: b5.q };
            } else {
              ret = b5.d;
              if (b5.d.length > 1  ||  b5.q.length > 1) {
                ret.push({ type_: ' / ' });
              } else {
                ret.push({ type_: '/' });
              }
              mhchemParser.concatArray(ret, b5.q);
            }
          } else {  // no fraction
            ret = mhchemParser.go(buffer.d, 'pu-2');
          }
          for (var p in buffer) { delete buffer[p]; }
          return ret;
        }
      }
    },
    'pu-2': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '*': { action_: 'output' } },
        '*': {
          '*': { action_: [ 'output', 'cdot' ], nextState: '0' } },
        '\\x': {
          '*': { action_: 'rm=' } },
        'space': {
          '*': { action_: [ 'output', 'space' ], nextState: '0' } },
        '^{(...)}|^(-1)': {
          '1': { action_: '^(-1)' } },
        '-9.,9': {
          '0': { action_: 'rm=', nextState: '0' },
          '1': { action_: '^(-1)', nextState: '0' } },
        '{...}|else': {
          '*': { action_: 'rm=', nextState: '1' } }
      }),
      actions: {
        'cdot': function () { return { type_: 'tight cdot' }; },
        '^(-1)': function (buffer, m) { buffer.rm += "^{"+m+"}"; },
        'space': function () { return { type_: 'pu-space-2' }; },
        'output': function (buffer) {
          /** @type {ParserOutput | ParserOutput[]} */
          var ret = [];
          if (buffer.rm) {
            var mrm = mhchemParser.patterns.match_('{(...)}', buffer.rm || "");
            if (mrm  &&  mrm.remainder === '') {
              ret = mhchemParser.go(mrm.match_, 'pu');
            } else {
              ret = { type_: 'rm', p1: buffer.rm };
            }
          }
          for (var p in buffer) { delete buffer[p]; }
          return ret;
        }
      }
    },
    'pu-9,9': {
      transitions: mhchemParser.createTransitions({
        'empty': {
          '0': { action_: 'output-0' },
          'o': { action_: 'output-o' } },
        ',': {
          '0': { action_: [ 'output-0', 'comma' ], nextState: 'o' } },
        '.': {
          '0': { action_: [ 'output-0', 'copy' ], nextState: 'o' } },
        'else': {
          '*': { action_: 'text=' } }
      }),
      actions: {
        'comma': function () { return { type_: 'commaDecimal' }; },
        'output-0': function (buffer) {
          /** @type {ParserOutput[]} */
          var ret = [];
          buffer.text_ = buffer.text_ || "";
          if (buffer.text_.length > 4) {
            var a = buffer.text_.length % 3;
            if (a === 0) { a = 3; }
            for (var i=buffer.text_.length-3; i>0; i-=3) {
              ret.push(buffer.text_.substr(i, 3));
              ret.push({ type_: '1000 separator' });
            }
            ret.push(buffer.text_.substr(0, a));
            ret.reverse();
          } else {
            ret.push(buffer.text_);
          }
          for (var p in buffer) { delete buffer[p]; }
          return ret;
        },
        'output-o': function (buffer) {
          /** @type {ParserOutput[]} */
          var ret = [];
          buffer.text_ = buffer.text_ || "";
          if (buffer.text_.length > 4) {
            var a = buffer.text_.length - 3;
            for (var i=0; i<a; i+=3) {
              ret.push(buffer.text_.substr(i, 3));
              ret.push({ type_: '1000 separator' });
            }
            ret.push(buffer.text_.substr(i));
          } else {
            ret.push(buffer.text_);
          }
          for (var p in buffer) { delete buffer[p]; }
          return ret;
        }
      }
    }
    //#endregion
  };

  //
  // texify: Take MhchemParser output and convert it to TeX
  //
  /** @type {Texify} */
  var texify = {
    go: function (input, isInner) {  // (recursive, max 4 levels)
      if (!input) { return ""; }
      var res = "";
      var cee = false;
      for (var i=0; i < input.length; i++) {
        var inputi = input[i];
        if (typeof inputi === "string") {
          res += inputi;
        } else {
          res += texify._go2(inputi);
          if (inputi.type_ === '1st-level escape') { cee = true; }
        }
      }
      if (!isInner && !cee && res) {
        res = "{" + res + "}";
      }
      return res;
    },
    _goInner: function (input) {
      if (!input) { return input; }
      return texify.go(input, true);
    },
    _go2: function (buf) {
      /** @type {undefined | string} */
      var res;
      switch (buf.type_) {
        case 'chemfive':
          res = "";
          var b5 = {
            a: texify._goInner(buf.a),
            b: texify._goInner(buf.b),
            p: texify._goInner(buf.p),
            o: texify._goInner(buf.o),
            q: texify._goInner(buf.q),
            d: texify._goInner(buf.d)
          };
          //
          // a
          //
          if (b5.a) {
            if (b5.a.match(/^[+\-]/)) { b5.a = "{"+b5.a+"}"; }
            res += b5.a + "\\,";
          }
          //
          // b and p
          //
          if (b5.b || b5.p) {
            res += "{\\vphantom{X}}";
            res += "^{\\hphantom{"+(b5.b||"")+"}}_{\\hphantom{"+(b5.p||"")+"}}";
            res += "{\\vphantom{X}}";
            res += "^{\\smash[t]{\\vphantom{2}}\\mathllap{"+(b5.b||"")+"}}";
            res += "_{\\vphantom{2}\\mathllap{\\smash[t]{"+(b5.p||"")+"}}}";
          }
          //
          // o
          //
          if (b5.o) {
            if (b5.o.match(/^[+\-]/)) { b5.o = "{"+b5.o+"}"; }
            res += b5.o;
          }
          //
          // q and d
          //
          if (buf.dType === 'kv') {
            if (b5.d || b5.q) {
              res += "{\\vphantom{X}}";
            }
            if (b5.d) {
              res += "^{"+b5.d+"}";
            }
            if (b5.q) {
              res += "_{\\smash[t]{"+b5.q+"}}";
            }
          } else if (buf.dType === 'oxidation') {
            if (b5.d) {
              res += "{\\vphantom{X}}";
              res += "^{"+b5.d+"}";
            }
            if (b5.q) {
              // A Firefox bug adds a bogus depth to <mphantom>, so we change \vphantom{X} to {}
              // TODO: Reinstate \vphantom{X} when the Firefox bug is fixed.
//              res += "{\\vphantom{X}}";
              res += "{{}}";
              res += "_{\\smash[t]{"+b5.q+"}}";
            }
          } else {
            if (b5.q) {
              // TODO: Reinstate \vphantom{X} when the Firefox bug is fixed.
//              res += "{\\vphantom{X}}";
              res += "{{}}";
              res += "_{\\smash[t]{"+b5.q+"}}";
            }
            if (b5.d) {
              // TODO: Reinstate \vphantom{X} when the Firefox bug is fixed.
//              res += "{\\vphantom{X}}";
              res += "{{}}";
              res += "^{"+b5.d+"}";
            }
          }
          break;
        case 'rm':
          res = "\\mathrm{"+buf.p1+"}";
          break;
        case 'text':
          if (buf.p1.match(/[\^_]/)) {
            buf.p1 = buf.p1.replace(" ", "~").replace("-", "\\text{-}");
            res = "\\mathrm{"+buf.p1+"}";
          } else {
            res = "\\text{"+buf.p1+"}";
          }
          break;
        case 'roman numeral':
          res = "\\mathrm{"+buf.p1+"}";
          break;
        case 'state of aggregation':
          res = "\\mskip2mu "+texify._goInner(buf.p1);
          break;
        case 'state of aggregation subscript':
          res = "\\mskip1mu "+texify._goInner(buf.p1);
          break;
        case 'bond':
          res = texify._getBond(buf.kind_);
          if (!res) {
            throw ["MhchemErrorBond", "mhchem Error. Unknown bond type (" + buf.kind_ + ")"];
          }
          break;
        case 'frac':
          var c = "\\frac{" + buf.p1 + "}{" + buf.p2 + "}";
          res = "\\mathchoice{\\textstyle"+c+"}{"+c+"}{"+c+"}{"+c+"}";
          break;
        case 'pu-frac':
          var d = "\\frac{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
          res = "\\mathchoice{\\textstyle"+d+"}{"+d+"}{"+d+"}{"+d+"}";
          break;
        case 'tex-math':
          res = buf.p1 + " ";
          break;
        case 'frac-ce':
          res = "\\frac{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
          break;
        case 'overset':
          res = "\\overset{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
          break;
        case 'underset':
          res = "\\underset{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
          break;
        case 'underbrace':
          res =  "\\underbrace{" + texify._goInner(buf.p1) + "}_{" + texify._goInner(buf.p2) + "}";
          break;
        case 'color':
          res = "{\\color{" + buf.color1 + "}{" + texify._goInner(buf.color2) + "}}";
          break;
        case 'color0':
          res = "\\color{" + buf.color + "}";
          break;
        case 'arrow':
          var b6 = {
            rd: texify._goInner(buf.rd),
            rq: texify._goInner(buf.rq)
          };
          var arrow = texify._getArrow(buf.r);
          if (b6.rq) { arrow += "[{\\rm " + b6.rq + "}]"; }
          if (b6.rd) {
            arrow += "{\\rm " + b6.rd + "}";
          } else {
            arrow += "{}";
          }
          res = arrow;
          break;
        case 'operator':
          res = texify._getOperator(buf.kind_);
          break;
        case '1st-level escape':
          res = buf.p1+" ";  // &, \\\\, \\hlin
          break;
        case 'space':
          res = " ";
          break;
        case 'entitySkip':
          res = "~";
          break;
        case 'pu-space-1':
          res = "~";
          break;
        case 'pu-space-2':
          res = "\\mkern3mu ";
          break;
        case '1000 separator':
          res = "\\mkern2mu ";
          break;
        case 'commaDecimal':
          res = "{,}";
          break;
          case 'comma enumeration L':
          res = "{"+buf.p1+"}\\mkern6mu ";
          break;
        case 'comma enumeration M':
          res = "{"+buf.p1+"}\\mkern3mu ";
          break;
        case 'comma enumeration S':
          res = "{"+buf.p1+"}\\mkern1mu ";
          break;
        case 'hyphen':
          res = "\\text{-}";
          break;
        case 'addition compound':
          res = "\\,{\\cdot}\\,";
          break;
        case 'electron dot':
          res = "\\mkern1mu \\text{\\textbullet}\\mkern1mu ";
          break;
        case 'KV x':
          res = "{\\times}";
          break;
        case 'prime':
          res = "\\prime ";
          break;
        case 'cdot':
          res = "\\cdot ";
          break;
        case 'tight cdot':
          res = "\\mkern1mu{\\cdot}\\mkern1mu ";
          break;
        case 'times':
          res = "\\times ";
          break;
        case 'circa':
          res = "{\\sim}";
          break;
        case '^':
          res = "uparrow";
          break;
        case 'v':
          res = "downarrow";
          break;
        case 'ellipsis':
          res = "\\ldots ";
          break;
        case '/':
          res = "/";
          break;
        case ' / ':
          res = "\\,/\\,";
          break;
        default:
          throw ["MhchemBugT", "mhchem bug T. Please report."];  // Missing texify rule or unknown MhchemParser output
      }
      return res;
    },
    _getArrow: function (a) {
      switch (a) {
        case "->": return "\\yields";
        case "\u2192": return "\\yields";
        case "\u27F6": return "\\yields";
        case "<-": return "\\yieldsLeft";
        case "<->": return "\\mesomerism";
        case "<-->": return "\\yieldsLeftRight";
        case "<=>": return "\\equilibrium";
        case "\u21CC": return "\\equilibrium";
        case "<=>>": return "\\equilibriumRight";
        case "<<=>": return "\\equilibriumLeft";
        default:
          throw ["MhchemBugT", "mhchem bug T. Please report."];
      }
    },
    _getBond: function (a) {
      switch (a) {
        case "-": return "{-}";
        case "1": return "{-}";
        case "=": return "{=}";
        case "2": return "{=}";
        case "#": return "{\\equiv}";
        case "3": return "{\\equiv}";
        case "~": return "{\\tripleDash}";
        case "~-": return "{\\tripleDashOverLine}";
        case "~=": return "{\\tripleDashOverDoubleLine}";
        case "~--": return "{\\tripleDashOverDoubleLine}";
        case "-~-": return "{\\tripleDashBetweenDoubleLine}";
        case "...": return "{{\\cdot}{\\cdot}{\\cdot}}";
        case "....": return "{{\\cdot}{\\cdot}{\\cdot}{\\cdot}}";
        case "->": return "{\\rightarrow}";
        case "<-": return "{\\leftarrow}";
        case "<": return "{<}";
        case ">": return "{>}";
        default:
          throw ["MhchemBugT", "mhchem bug T. Please report."];
      }
    },
    _getOperator: function (a) {
      switch (a) {
        case "+": return " {}+{} ";
        case "-": return " {}-{} ";
        case "=": return " {}={} ";
        case "<": return " {}<{} ";
        case ">": return " {}>{} ";
        case "<<": return " {}\\ll{} ";
        case ">>": return " {}\\gg{} ";
        case "\\pm": return " {}\\pm{} ";
        case "\\approx": return " {}\\approx{} ";
        case "$\\approx$": return " {}\\approx{} ";
        case "v": return " \\downarrow{} ";
        case "(v)": return " \\downarrow{} ";
        case "^": return " \\uparrow{} ";
        case "(^)": return " \\uparrow{} ";
        default:
          throw ["MhchemBugT", "mhchem bug T. Please report."];
      }
    }
  };

/* eslint-disable no-undef */

//////////////////////////////////////////////////////////////////////
// texvc.sty

// The texvc package contains macros available in mediawiki pages.
// We omit the functions deprecated at
// https://en.wikipedia.org/wiki/Help:Displaying_a_formula#Deprecated_syntax

// We also omit texvc's \O, which conflicts with \text{\O}

defineMacro("\\darr", "\\downarrow");
defineMacro("\\dArr", "\\Downarrow");
defineMacro("\\Darr", "\\Downarrow");
defineMacro("\\lang", "\\langle");
defineMacro("\\rang", "\\rangle");
defineMacro("\\uarr", "\\uparrow");
defineMacro("\\uArr", "\\Uparrow");
defineMacro("\\Uarr", "\\Uparrow");
defineMacro("\\N", "\\mathbb{N}");
defineMacro("\\R", "\\mathbb{R}");
defineMacro("\\Z", "\\mathbb{Z}");
defineMacro("\\alef", "\\aleph");
defineMacro("\\alefsym", "\\aleph");
defineMacro("\\bull", "\\bullet");
defineMacro("\\clubs", "\\clubsuit");
defineMacro("\\cnums", "\\mathbb{C}");
defineMacro("\\Complex", "\\mathbb{C}");
defineMacro("\\Dagger", "\\ddagger");
defineMacro("\\diamonds", "\\diamondsuit");
defineMacro("\\empty", "\\emptyset");
defineMacro("\\exist", "\\exists");
defineMacro("\\harr", "\\leftrightarrow");
defineMacro("\\hArr", "\\Leftrightarrow");
defineMacro("\\Harr", "\\Leftrightarrow");
defineMacro("\\hearts", "\\heartsuit");
defineMacro("\\image", "\\Im");
defineMacro("\\infin", "\\infty");
defineMacro("\\isin", "\\in");
defineMacro("\\larr", "\\leftarrow");
defineMacro("\\lArr", "\\Leftarrow");
defineMacro("\\Larr", "\\Leftarrow");
defineMacro("\\lrarr", "\\leftrightarrow");
defineMacro("\\lrArr", "\\Leftrightarrow");
defineMacro("\\Lrarr", "\\Leftrightarrow");
defineMacro("\\natnums", "\\mathbb{N}");
defineMacro("\\plusmn", "\\pm");
defineMacro("\\rarr", "\\rightarrow");
defineMacro("\\rArr", "\\Rightarrow");
defineMacro("\\Rarr", "\\Rightarrow");
defineMacro("\\real", "\\Re");
defineMacro("\\reals", "\\mathbb{R}");
defineMacro("\\Reals", "\\mathbb{R}");
defineMacro("\\sdot", "\\cdot");
defineMacro("\\sect", "\\S");
defineMacro("\\spades", "\\spadesuit");
defineMacro("\\sub", "\\subset");
defineMacro("\\sube", "\\subseteq");
defineMacro("\\supe", "\\supseteq");
defineMacro("\\thetasym", "\\vartheta");
defineMacro("\\weierp", "\\wp");

/* eslint-disable no-undef */

/****************************************************
 *
 *  physics.js
 *
 *  Implements the Physics Package for LaTeX input.
 *
 *  ---------------------------------------------------------------------
 *
 *  The original version of this file is licensed as follows:
 *  Copyright (c) 2015-2016 Kolen Cheung <https://github.com/ickc/MathJax-third-party-extensions>.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  ---------------------------------------------------------------------
 *
 *  This file has been revised from the original in the following ways:
 *  1. The interface is changed so that it can be called from Temml, not MathJax.
 *  2. \Re and \Im are not used, to avoid conflict with existing LaTeX letters.
 *
 *  This revision of the file is released under the MIT license.
 *  https://mit-license.org/
 */
defineMacro("\\quantity", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\qty", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\pqty", "{\\left( #1 \\right)}");
defineMacro("\\bqty", "{\\left[ #1 \\right]}");
defineMacro("\\vqty", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\Bqty", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\absolutevalue", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\abs", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\norm", "{\\left\\Vert #1 \\right\\Vert}");
defineMacro("\\evaluated", "{\\left.#1 \\right\\vert}");
defineMacro("\\eval", "{\\left.#1 \\right\\vert}");
defineMacro("\\order", "{\\mathcal{O} \\left( #1 \\right)}");
defineMacro("\\commutator", "{\\left[ #1 , #2 \\right]}");
defineMacro("\\comm", "{\\left[ #1 , #2 \\right]}");
defineMacro("\\anticommutator", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\acomm", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\poissonbracket", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\pb", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\vectorbold", "{\\boldsymbol{ #1 }}");
defineMacro("\\vb", "{\\boldsymbol{ #1 }}");
defineMacro("\\vectorarrow", "{\\vec{\\boldsymbol{ #1 }}}");
defineMacro("\\va", "{\\vec{\\boldsymbol{ #1 }}}");
defineMacro("\\vectorunit", "{{\\boldsymbol{\\hat{ #1 }}}}");
defineMacro("\\vu", "{{\\boldsymbol{\\hat{ #1 }}}}");
defineMacro("\\dotproduct", "\\mathbin{\\boldsymbol\\cdot}");
defineMacro("\\vdot", "{\\boldsymbol\\cdot}");
defineMacro("\\crossproduct", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\cross", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\cp", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\gradient", "{\\boldsymbol\\nabla}");
defineMacro("\\grad", "{\\boldsymbol\\nabla}");
defineMacro("\\divergence", "{\\grad\\vdot}");
//defineMacro("\\div", "{\\grad\\vdot}"); Not included in Temml. Conflicts w/LaTeX \div
defineMacro("\\curl", "{\\grad\\cross}");
defineMacro("\\laplacian", "\\nabla^2");
defineMacro("\\tr", "{\\operatorname{tr}}");
defineMacro("\\Tr", "{\\operatorname{Tr}}");
defineMacro("\\rank", "{\\operatorname{rank}}");
defineMacro("\\erf", "{\\operatorname{erf}}");
defineMacro("\\Res", "{\\operatorname{Res}}");
defineMacro("\\principalvalue", "{\\mathcal{P}}");
defineMacro("\\pv", "{\\mathcal{P}}");
defineMacro("\\PV", "{\\operatorname{P.V.}}");
// Temml does not use the next two lines. They conflict with LaTeX letters.
//defineMacro("\\Re", "{\\operatorname{Re} \\left\\{ #1 \\right\\}}");
//defineMacro("\\Im", "{\\operatorname{Im} \\left\\{ #1 \\right\\}}");
defineMacro("\\qqtext", "{\\quad\\text{ #1 }\\quad}");
defineMacro("\\qq", "{\\quad\\text{ #1 }\\quad}");
defineMacro("\\qcomma", "{\\text{,}\\quad}");
defineMacro("\\qc", "{\\text{,}\\quad}");
defineMacro("\\qcc", "{\\quad\\text{c.c.}\\quad}");
defineMacro("\\qif", "{\\quad\\text{if}\\quad}");
defineMacro("\\qthen", "{\\quad\\text{then}\\quad}");
defineMacro("\\qelse", "{\\quad\\text{else}\\quad}");
defineMacro("\\qotherwise", "{\\quad\\text{otherwise}\\quad}");
defineMacro("\\qunless", "{\\quad\\text{unless}\\quad}");
defineMacro("\\qgiven", "{\\quad\\text{given}\\quad}");
defineMacro("\\qusing", "{\\quad\\text{using}\\quad}");
defineMacro("\\qassume", "{\\quad\\text{assume}\\quad}");
defineMacro("\\qsince", "{\\quad\\text{since}\\quad}");
defineMacro("\\qlet", "{\\quad\\text{let}\\quad}");
defineMacro("\\qfor", "{\\quad\\text{for}\\quad}");
defineMacro("\\qall", "{\\quad\\text{all}\\quad}");
defineMacro("\\qeven", "{\\quad\\text{even}\\quad}");
defineMacro("\\qodd", "{\\quad\\text{odd}\\quad}");
defineMacro("\\qinteger", "{\\quad\\text{integer}\\quad}");
defineMacro("\\qand", "{\\quad\\text{and}\\quad}");
defineMacro("\\qor", "{\\quad\\text{or}\\quad}");
defineMacro("\\qas", "{\\quad\\text{as}\\quad}");
defineMacro("\\qin", "{\\quad\\text{in}\\quad}");
defineMacro("\\differential", "{\\text{d}}");
defineMacro("\\dd", "{\\text{d}}");
defineMacro("\\derivative", "{\\frac{\\text{d}{ #1 }}{\\text{d}{ #2 }}}");
defineMacro("\\dv", "{\\frac{\\text{d}{ #1 }}{\\text{d}{ #2 }}}");
defineMacro("\\partialderivative", "{\\frac{\\partial{ #1 }}{\\partial{ #2 }}}");
defineMacro("\\variation", "{\\delta}");
defineMacro("\\var", "{\\delta}");
defineMacro("\\functionalderivative", "{\\frac{\\delta{ #1 }}{\\delta{ #2 }}}");
defineMacro("\\fdv", "{\\frac{\\delta{ #1 }}{\\delta{ #2 }}}");
defineMacro("\\innerproduct", "{\\left\\langle {#1} \\mid { #2} \\right\\rangle}");
defineMacro("\\outerproduct",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}");
defineMacro("\\dyad",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}");
defineMacro("\\ketbra",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}");
defineMacro("\\op",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}");
defineMacro("\\expectationvalue", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro("\\expval", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro("\\ev", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro("\\matrixelement",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}");
defineMacro("\\matrixel",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}");
defineMacro("\\mel",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}");

/**
 * This file contains the “gullet” where macros are expanded
 * until only non-macro tokens remain.
 */

// List of commands that act like macros but aren't defined as a macro,
// function, or symbol.  Used in `isDefined`.
const implicitCommands = {
  "^": true, // Parser.js
  _: true, // Parser.js
  "\\limits": true, // Parser.js
  "\\nolimits": true // Parser.js
};

class MacroExpander {
  constructor(input, settings, mode) {
    this.settings = settings;
    this.expansionCount = 0;
    this.feed(input);
    // Make new global namespace
    this.macros = new Namespace(macros, settings.macros);
    this.mode = mode;
    this.stack = []; // contains tokens in REVERSE order
  }

  /**
   * Feed a new input string to the same MacroExpander
   * (with existing macros etc.).
   */
  feed(input) {
    this.lexer = new Lexer(input, this.settings);
  }

  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
  }

  /**
   * Start a new group nesting within all namespaces.
   */
  beginGroup() {
    this.macros.beginGroup();
  }

  /**
   * End current group nesting within all namespaces.
   */
  endGroup() {
    this.macros.endGroup();
  }

  /**
   * Returns the topmost token on the stack, without expanding it.
   * Similar in behavior to TeX's `\futurelet`.
   */
  future() {
    if (this.stack.length === 0) {
      this.pushToken(this.lexer.lex());
    }
    return this.stack[this.stack.length - 1]
  }

  /**
   * Remove and return the next unexpanded token.
   */
  popToken() {
    this.future(); // ensure non-empty stack
    return this.stack.pop();
  }

  /**
   * Add a given token to the token stack.  In particular, this get be used
   * to put back a token returned from one of the other methods.
   */
  pushToken(token) {
    this.stack.push(token);
  }

  /**
   * Append an array of tokens to the token stack.
   */
  pushTokens(tokens) {
    this.stack.push(...tokens);
  }

  /**
   * Find an macro argument without expanding tokens and append the array of
   * tokens to the token stack. Uses Token as a container for the result.
   */
  scanArgument(isOptional) {
    let start;
    let end;
    let tokens;
    if (isOptional) {
      this.consumeSpaces(); // \@ifnextchar gobbles any space following it
      if (this.future().text !== "[") {
        return null;
      }
      start = this.popToken(); // don't include [ in tokens
      ({ tokens, end } = this.consumeArg(["]"]));
    } else {
      ({ tokens, start, end } = this.consumeArg());
    }

    // indicate the end of an argument
    this.pushToken(new Token("EOF", end.loc));

    this.pushTokens(tokens);
    return start.range(end, "");
  }

  /**
   * Consume all following space tokens, without expansion.
   */
  consumeSpaces() {
    for (;;) {
      const token = this.future();
      if (token.text === " ") {
        this.stack.pop();
      } else {
        break;
      }
    }
  }

  /**
   * Consume an argument from the token stream, and return the resulting array
   * of tokens and start/end token.
   */
  consumeArg(delims) {
    // The argument for a delimited parameter is the shortest (possibly
    // empty) sequence of tokens with properly nested {...} groups that is
    // followed ... by this particular list of non-parameter tokens.
    // The argument for an undelimited parameter is the next nonblank
    // token, unless that token is ‘{’, when the argument will be the
    // entire {...} group that follows.
    const tokens = [];
    const isDelimited = delims && delims.length > 0;
    if (!isDelimited) {
      // Ignore spaces between arguments.  As the TeXbook says:
      // "After you have said ‘\def\row#1#2{...}’, you are allowed to
      //  put spaces between the arguments (e.g., ‘\row x n’), because
      //  TeX doesn’t use single spaces as undelimited arguments."
      this.consumeSpaces();
    }
    const start = this.future();
    let tok;
    let depth = 0;
    let match = 0;
    do {
      tok = this.popToken();
      tokens.push(tok);
      if (tok.text === "{") {
        ++depth;
      } else if (tok.text === "}") {
        --depth;
        if (depth === -1) {
          throw new ParseError("Extra }", tok);
        }
      } else if (tok.text === "EOF") {
        throw new ParseError(
          "Unexpected end of input in a macro argument" +
            ", expected '" +
            (delims && isDelimited ? delims[match] : "}") +
            "'",
          tok
        );
      }
      if (delims && isDelimited) {
        if ((depth === 0 || (depth === 1 && delims[match] === "{")) && tok.text === delims[match]) {
          ++match;
          if (match === delims.length) {
            // don't include delims in tokens
            tokens.splice(-match, match);
            break;
          }
        } else {
          match = 0;
        }
      }
    } while (depth !== 0 || isDelimited);
    // If the argument found ... has the form ‘{<nested tokens>}’,
    // ... the outermost braces enclosing the argument are removed
    if (start.text === "{" && tokens[tokens.length - 1].text === "}") {
      tokens.pop();
      tokens.shift();
    }
    tokens.reverse(); // to fit in with stack order
    return { tokens, start, end: tok };
  }

  /**
   * Consume the specified number of (delimited) arguments from the token
   * stream and return the resulting array of arguments.
   */
  consumeArgs(numArgs, delimiters) {
    if (delimiters) {
      if (delimiters.length !== numArgs + 1) {
        throw new ParseError("The length of delimiters doesn't match the number of args!");
      }
      const delims = delimiters[0];
      for (let i = 0; i < delims.length; i++) {
        const tok = this.popToken();
        if (delims[i] !== tok.text) {
          throw new ParseError("Use of the macro doesn't match its definition", tok);
        }
      }
    }

    const args = [];
    for (let i = 0; i < numArgs; i++) {
      args.push(this.consumeArg(delimiters && delimiters[i + 1]).tokens);
    }
    return args;
  }

  /**
   * Expand the next token only once if possible.
   *
   * If the token is expanded, the resulting tokens will be pushed onto
   * the stack in reverse order, and the number of such tokens will be
   * returned.  This number might be zero or positive.
   *
   * If not, the return value is `false`, and the next token remains at the
   * top of the stack.
   *
   * In either case, the next token will be on the top of the stack,
   * or the stack will be empty (in case of empty expansion
   * and no other tokens).
   *
   * Used to implement `expandAfterFuture` and `expandNextToken`.
   *
   * If expandableOnly, only expandable tokens are expanded and
   * an undefined control sequence results in an error.
   */
  expandOnce(expandableOnly) {
    const topToken = this.popToken();
    const name = topToken.text;
    const expansion = !topToken.noexpand ? this._getExpansion(name) : null;
    if (expansion == null || (expandableOnly && expansion.unexpandable)) {
      if (expandableOnly && expansion == null && name[0] === "\\" && !this.isDefined(name)) {
        throw new ParseError("Undefined control sequence: " + name);
      }
      this.pushToken(topToken);
      return false;
    }
    this.expansionCount++;
    if (this.expansionCount > this.settings.maxExpand) {
      throw new ParseError(
        "Too many expansions: infinite loop or " + "need to increase maxExpand setting"
      );
    }
    let tokens = expansion.tokens;
    const args = this.consumeArgs(expansion.numArgs, expansion.delimiters);
    if (expansion.numArgs) {
      // paste arguments in place of the placeholders
      tokens = tokens.slice(); // make a shallow copy
      for (let i = tokens.length - 1; i >= 0; --i) {
        let tok = tokens[i];
        if (tok.text === "#") {
          if (i === 0) {
            throw new ParseError("Incomplete placeholder at end of macro body", tok);
          }
          tok = tokens[--i]; // next token on stack
          if (tok.text === "#") {
            // ## → #
            tokens.splice(i + 1, 1); // drop first #
          } else if (/^[1-9]$/.test(tok.text)) {
            // replace the placeholder with the indicated argument
            tokens.splice(i, 2, ...args[+tok.text - 1]);
          } else {
            throw new ParseError("Not a valid argument number", tok);
          }
        }
      }
    }
    // Concatenate expansion onto top of stack.
    this.pushTokens(tokens);
    return tokens.length;
  }

  /**
   * Expand the next token only once (if possible), and return the resulting
   * top token on the stack (without removing anything from the stack).
   * Similar in behavior to TeX's `\expandafter\futurelet`.
   * Equivalent to expandOnce() followed by future().
   */
  expandAfterFuture() {
    this.expandOnce();
    return this.future();
  }

  /**
   * Recursively expand first token, then return first non-expandable token.
   */
  expandNextToken() {
    for (;;) {
      if (this.expandOnce() === false) { // fully expanded
        const token = this.stack.pop();
        // The token after \noexpand is interpreted as if its meaning were ‘\relax’
        if (token.treatAsRelax) {
          token.text = "\\relax";
        }
        return token
      }
    }

    // This pathway is impossible.
    throw new Error(); // eslint-disable-line no-unreachable
  }

  /**
   * Fully expand the given macro name and return the resulting list of
   * tokens, or return `undefined` if no such macro is defined.
   */
  expandMacro(name) {
    return this.macros.has(name) ? this.expandTokens([new Token(name)]) : undefined;
  }

  /**
   * Fully expand the given token stream and return the resulting list of
   * tokens.  Note that the input tokens are in reverse order, but the
   * output tokens are in forward order.
   */
  expandTokens(tokens) {
    const output = [];
    const oldStackLength = this.stack.length;
    this.pushTokens(tokens);
    while (this.stack.length > oldStackLength) {
      // Expand only expandable tokens
      if (this.expandOnce(true) === false) {  // fully expanded
        const token = this.stack.pop();
        if (token.treatAsRelax) {
          // the expansion of \noexpand is the token itself
          token.noexpand = false;
          token.treatAsRelax = false;
        }
        output.push(token);
      }
    }
    return output;
  }

  /**
   * Fully expand the given macro name and return the result as a string,
   * or return `undefined` if no such macro is defined.
   */
  expandMacroAsText(name) {
    const tokens = this.expandMacro(name);
    if (tokens) {
      return tokens.map((token) => token.text).join("");
    } else {
      return tokens;
    }
  }

  /**
   * Returns the expanded macro as a reversed array of tokens and a macro
   * argument count.  Or returns `null` if no such macro.
   */
  _getExpansion(name) {
    const definition = this.macros.get(name);
    if (definition == null) {
      // mainly checking for undefined here
      return definition;
    }
    // If a single character has an associated catcode other than 13
    // (active character), then don't expand it.
    if (name.length === 1) {
      const catcode = this.lexer.catcodes[name];
      if (catcode != null && catcode !== 13) {
        return
      }
    }
    const expansion = typeof definition === "function" ? definition(this) : definition;
    if (typeof expansion === "string") {
      let numArgs = 0;
      if (expansion.indexOf("#") !== -1) {
        const stripped = expansion.replace(/##/g, "");
        while (stripped.indexOf("#" + (numArgs + 1)) !== -1) {
          ++numArgs;
        }
      }
      const bodyLexer = new Lexer(expansion, this.settings);
      const tokens = [];
      let tok = bodyLexer.lex();
      while (tok.text !== "EOF") {
        tokens.push(tok);
        tok = bodyLexer.lex();
      }
      tokens.reverse(); // to fit in with stack using push and pop
      const expanded = { tokens, numArgs };
      return expanded;
    }

    return expansion;
  }

  /**
   * Determine whether a command is currently "defined" (has some
   * functionality), meaning that it's a macro (in the current group),
   * a function, a symbol, or one of the special commands listed in
   * `implicitCommands`.
   */
  isDefined(name) {
    return (
      this.macros.has(name) ||
      Object.prototype.hasOwnProperty.call(functions$1, name ) ||
      Object.prototype.hasOwnProperty.call(symbols.math, name ) ||
      Object.prototype.hasOwnProperty.call(symbols.text, name ) ||
      Object.prototype.hasOwnProperty.call(implicitCommands, name )
    );
  }

  /**
   * Determine whether a command is expandable.
   */
  isExpandable(name) {
    const macro = this.macros.get(name);
    return macro != null
      ? typeof macro === "string" || typeof macro === "function" || !macro.unexpandable
      : Object.prototype.hasOwnProperty.call(functions$1, name ) && !functions$1[name].primitive;
  }
}

/*
 * This file defines the Unicode scripts and script families that we
 * support. To add new scripts or families, just add a new entry to the
 * scriptData array below. Adding scripts to the scriptData array allows
 * characters from that script to appear in \text{} environments.
 */

/**
 * Each script or script family has a name and an array of blocks.
 * Each block is an array of two numbers which specify the start and
 * end points (inclusive) of a block of Unicode codepoints.

/**
 * Unicode block data for the families of scripts we support in \text{}.
 * Scripts only need to appear here if they do not have font metrics.
 */
const scriptData = [
  {
    // Latin characters beyond the Latin-1 characters we have metrics for.
    // Needed for Czech, Hungarian and Turkish text, for example.
    name: "latin",
    blocks: [
      [0x0100, 0x024f], // Latin Extended-A and Latin Extended-B
      [0x0300, 0x036f] // Combining Diacritical marks
    ]
  },
  {
    // The Cyrillic script used by Russian and related languages.
    // A Cyrillic subset used to be supported as explicitly defined
    // symbols in symbols.js
    name: "cyrillic",
    blocks: [[0x0400, 0x04ff]]
  },
  {
    // Armenian
    name: "armenian",
    blocks: [[0x0530, 0x058f]]
  },
  {
    // The Brahmic scripts of South and Southeast Asia
    // Devanagari (0900–097F)
    // Bengali (0980–09FF)
    // Gurmukhi (0A00–0A7F)
    // Gujarati (0A80–0AFF)
    // Oriya (0B00–0B7F)
    // Tamil (0B80–0BFF)
    // Telugu (0C00–0C7F)
    // Kannada (0C80–0CFF)
    // Malayalam (0D00–0D7F)
    // Sinhala (0D80–0DFF)
    // Thai (0E00–0E7F)
    // Lao (0E80–0EFF)
    // Tibetan (0F00–0FFF)
    // Myanmar (1000–109F)
    name: "brahmic",
    blocks: [[0x0900, 0x109f]]
  },
  {
    name: "georgian",
    blocks: [[0x10a0, 0x10ff]]
  },
  {
    // Chinese and Japanese.
    // The "k" in cjk is for Korean, but we've separated Korean out
    name: "cjk",
    blocks: [
      [0x3000, 0x30ff], // CJK symbols and punctuation, Hiragana, Katakana
      [0x4e00, 0x9faf], // CJK ideograms
      [0xff00, 0xff60] // Fullwidth punctuation
      // TODO: add halfwidth Katakana and Romanji glyphs
    ]
  },
  {
    // Korean
    name: "hangul",
    blocks: [[0xac00, 0xd7af]]
  }
];

/**
 * A flattened version of all the supported blocks in a single array.
 * This is an optimization to make supportedCodepoint() fast.
 */
const allBlocks = [];
scriptData.forEach((s) => s.blocks.forEach((b) => allBlocks.push(...b)));

/**
 * Given a codepoint, return true if it falls within one of the
 * scripts or script families defined above and false otherwise.
 *
 * Micro benchmarks shows that this is faster than
 * /[\u3000-\u30FF\u4E00-\u9FAF\uFF00-\uFF60\uAC00-\uD7AF\u0900-\u109F]/.test()
 * in Firefox, Chrome and Node.
 */
function supportedCodepoint(codepoint) {
  for (let i = 0; i < allBlocks.length; i += 2) {
    if (codepoint >= allBlocks[i] && codepoint <= allBlocks[i + 1]) {
      return true;
    }
  }
  return false;
}

// Helpers for Parser.js handling of Unicode (sub|super)script characters.

const unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;

const uSubsAndSups = Object.freeze({
  '₊': '+',
  '₋': '-',
  '₌': '=',
  '₍': '(',
  '₎': ')',
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '\u2090': 'a',
  '\u2091': 'e',
  '\u2095': 'h',
  '\u1D62': 'i',
  '\u2C7C': 'j',
  '\u2096': 'k',
  '\u2097': 'l',
  '\u2098': 'm',
  '\u2099': 'n',
  '\u2092': 'o',
  '\u209A': 'p',
  '\u1D63': 'r',
  '\u209B': 's',
  '\u209C': 't',
  '\u1D64': 'u',
  '\u1D65': 'v',
  '\u2093': 'x',
  '\u1D66': 'β',
  '\u1D67': 'γ',
  '\u1D68': 'ρ',
  '\u1D69': '\u03d5',
  '\u1D6A': 'χ',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '\u1D2C': 'A',
  '\u1D2E': 'B',
  '\u1D30': 'D',
  '\u1D31': 'E',
  '\u1D33': 'G',
  '\u1D34': 'H',
  '\u1D35': 'I',
  '\u1D36': 'J',
  '\u1D37': 'K',
  '\u1D38': 'L',
  '\u1D39': 'M',
  '\u1D3A': 'N',
  '\u1D3C': 'O',
  '\u1D3E': 'P',
  '\u1D3F': 'R',
  '\u1D40': 'T',
  '\u1D41': 'U',
  '\u2C7D': 'V',
  '\u1D42': 'W',
  '\u1D43': 'a',
  '\u1D47': 'b',
  '\u1D9C': 'c',
  '\u1D48': 'd',
  '\u1D49': 'e',
  '\u1DA0': 'f',
  '\u1D4D': 'g',
  '\u02B0': 'h',
  '\u2071': 'i',
  '\u02B2': 'j',
  '\u1D4F': 'k',
  '\u02E1': 'l',
  '\u1D50': 'm',
  '\u207F': 'n',
  '\u1D52': 'o',
  '\u1D56': 'p',
  '\u02B3': 'r',
  '\u02E2': 's',
  '\u1D57': 't',
  '\u1D58': 'u',
  '\u1D5B': 'v',
  '\u02B7': 'w',
  '\u02E3': 'x',
  '\u02B8': 'y',
  '\u1DBB': 'z',
  '\u1D5D': 'β',
  '\u1D5E': 'γ',
  '\u1D5F': 'δ',
  '\u1D60': '\u03d5',
  '\u1D61': 'χ',
  '\u1DBF': 'θ'
});

// Used for Unicode input of calligraphic and script letters
const asciiFromScript = Object.freeze({
  "\ud835\udc9c": "A",
  "\u212c": "B",
  "\ud835\udc9e": "C",
  "\ud835\udc9f": "D",
  "\u2130": "E",
  "\u2131": "F",
  "\ud835\udca2": "G",
  "\u210B": "H",
  "\u2110": "I",
  "\ud835\udca5": "J",
  "\ud835\udca6": "K",
  "\u2112": "L",
  "\u2133": "M",
  "\ud835\udca9": "N",
  "\ud835\udcaa": "O",
  "\ud835\udcab": "P",
  "\ud835\udcac": "Q",
  "\u211B": "R",
  "\ud835\udcae": "S",
  "\ud835\udcaf": "T",
  "\ud835\udcb0": "U",
  "\ud835\udcb1": "V",
  "\ud835\udcb2": "W",
  "\ud835\udcb3": "X",
  "\ud835\udcb4": "Y",
  "\ud835\udcb5": "Z"
});

// Mapping of Unicode accent characters to their LaTeX equivalent in text and
// math mode (when they exist).
var unicodeAccents = {
  "\u0301": { text: "\\'", math: "\\acute" },
  "\u0300": { text: "\\`", math: "\\grave" },
  "\u0308": { text: '\\"', math: "\\ddot" },
  "\u0303": { text: "\\~", math: "\\tilde" },
  "\u0304": { text: "\\=", math: "\\bar" },
  "\u0306": { text: "\\u", math: "\\breve" },
  "\u030c": { text: "\\v", math: "\\check" },
  "\u0302": { text: "\\^", math: "\\hat" },
  "\u0307": { text: "\\.", math: "\\dot" },
  "\u030a": { text: "\\r", math: "\\mathring" },
  "\u030b": { text: "\\H" },
  '\u0327': { text: '\\c' }
};

var unicodeSymbols = {
  "á": "á",
  "à": "à",
  "ä": "ä",
  "ǟ": "ǟ",
  "ã": "ã",
  "ā": "ā",
  "ă": "ă",
  "ắ": "ắ",
  "ằ": "ằ",
  "ẵ": "ẵ",
  "ǎ": "ǎ",
  "â": "â",
  "ấ": "ấ",
  "ầ": "ầ",
  "ẫ": "ẫ",
  "ȧ": "ȧ",
  "ǡ": "ǡ",
  "å": "å",
  "ǻ": "ǻ",
  "ḃ": "ḃ",
  "ć": "ć",
  "č": "č",
  "ĉ": "ĉ",
  "ċ": "ċ",
  "ď": "ď",
  "ḋ": "ḋ",
  "é": "é",
  "è": "è",
  "ë": "ë",
  "ẽ": "ẽ",
  "ē": "ē",
  "ḗ": "ḗ",
  "ḕ": "ḕ",
  "ĕ": "ĕ",
  "ě": "ě",
  "ê": "ê",
  "ế": "ế",
  "ề": "ề",
  "ễ": "ễ",
  "ė": "ė",
  "ḟ": "ḟ",
  "ǵ": "ǵ",
  "ḡ": "ḡ",
  "ğ": "ğ",
  "ǧ": "ǧ",
  "ĝ": "ĝ",
  "ġ": "ġ",
  "ḧ": "ḧ",
  "ȟ": "ȟ",
  "ĥ": "ĥ",
  "ḣ": "ḣ",
  "í": "í",
  "ì": "ì",
  "ï": "ï",
  "ḯ": "ḯ",
  "ĩ": "ĩ",
  "ī": "ī",
  "ĭ": "ĭ",
  "ǐ": "ǐ",
  "î": "î",
  "ǰ": "ǰ",
  "ĵ": "ĵ",
  "ḱ": "ḱ",
  "ǩ": "ǩ",
  "ĺ": "ĺ",
  "ľ": "ľ",
  "ḿ": "ḿ",
  "ṁ": "ṁ",
  "ń": "ń",
  "ǹ": "ǹ",
  "ñ": "ñ",
  "ň": "ň",
  "ṅ": "ṅ",
  "ó": "ó",
  "ò": "ò",
  "ö": "ö",
  "ȫ": "ȫ",
  "õ": "õ",
  "ṍ": "ṍ",
  "ṏ": "ṏ",
  "ȭ": "ȭ",
  "ō": "ō",
  "ṓ": "ṓ",
  "ṑ": "ṑ",
  "ŏ": "ŏ",
  "ǒ": "ǒ",
  "ô": "ô",
  "ố": "ố",
  "ồ": "ồ",
  "ỗ": "ỗ",
  "ȯ": "ȯ",
  "ȱ": "ȱ",
  "ő": "ő",
  "ṕ": "ṕ",
  "ṗ": "ṗ",
  "ŕ": "ŕ",
  "ř": "ř",
  "ṙ": "ṙ",
  "ś": "ś",
  "ṥ": "ṥ",
  "š": "š",
  "ṧ": "ṧ",
  "ŝ": "ŝ",
  "ṡ": "ṡ",
  "ẗ": "ẗ",
  "ť": "ť",
  "ṫ": "ṫ",
  "ú": "ú",
  "ù": "ù",
  "ü": "ü",
  "ǘ": "ǘ",
  "ǜ": "ǜ",
  "ǖ": "ǖ",
  "ǚ": "ǚ",
  "ũ": "ũ",
  "ṹ": "ṹ",
  "ū": "ū",
  "ṻ": "ṻ",
  "ŭ": "ŭ",
  "ǔ": "ǔ",
  "û": "û",
  "ů": "ů",
  "ű": "ű",
  "ṽ": "ṽ",
  "ẃ": "ẃ",
  "ẁ": "ẁ",
  "ẅ": "ẅ",
  "ŵ": "ŵ",
  "ẇ": "ẇ",
  "ẘ": "ẘ",
  "ẍ": "ẍ",
  "ẋ": "ẋ",
  "ý": "ý",
  "ỳ": "ỳ",
  "ÿ": "ÿ",
  "ỹ": "ỹ",
  "ȳ": "ȳ",
  "ŷ": "ŷ",
  "ẏ": "ẏ",
  "ẙ": "ẙ",
  "ź": "ź",
  "ž": "ž",
  "ẑ": "ẑ",
  "ż": "ż",
  "Á": "Á",
  "À": "À",
  "Ä": "Ä",
  "Ǟ": "Ǟ",
  "Ã": "Ã",
  "Ā": "Ā",
  "Ă": "Ă",
  "Ắ": "Ắ",
  "Ằ": "Ằ",
  "Ẵ": "Ẵ",
  "Ǎ": "Ǎ",
  "Â": "Â",
  "Ấ": "Ấ",
  "Ầ": "Ầ",
  "Ẫ": "Ẫ",
  "Ȧ": "Ȧ",
  "Ǡ": "Ǡ",
  "Å": "Å",
  "Ǻ": "Ǻ",
  "Ḃ": "Ḃ",
  "Ć": "Ć",
  "Č": "Č",
  "Ĉ": "Ĉ",
  "Ċ": "Ċ",
  "Ď": "Ď",
  "Ḋ": "Ḋ",
  "É": "É",
  "È": "È",
  "Ë": "Ë",
  "Ẽ": "Ẽ",
  "Ē": "Ē",
  "Ḗ": "Ḗ",
  "Ḕ": "Ḕ",
  "Ĕ": "Ĕ",
  "Ě": "Ě",
  "Ê": "Ê",
  "Ế": "Ế",
  "Ề": "Ề",
  "Ễ": "Ễ",
  "Ė": "Ė",
  "Ḟ": "Ḟ",
  "Ǵ": "Ǵ",
  "Ḡ": "Ḡ",
  "Ğ": "Ğ",
  "Ǧ": "Ǧ",
  "Ĝ": "Ĝ",
  "Ġ": "Ġ",
  "Ḧ": "Ḧ",
  "Ȟ": "Ȟ",
  "Ĥ": "Ĥ",
  "Ḣ": "Ḣ",
  "Í": "Í",
  "Ì": "Ì",
  "Ï": "Ï",
  "Ḯ": "Ḯ",
  "Ĩ": "Ĩ",
  "Ī": "Ī",
  "Ĭ": "Ĭ",
  "Ǐ": "Ǐ",
  "Î": "Î",
  "İ": "İ",
  "Ĵ": "Ĵ",
  "Ḱ": "Ḱ",
  "Ǩ": "Ǩ",
  "Ĺ": "Ĺ",
  "Ľ": "Ľ",
  "Ḿ": "Ḿ",
  "Ṁ": "Ṁ",
  "Ń": "Ń",
  "Ǹ": "Ǹ",
  "Ñ": "Ñ",
  "Ň": "Ň",
  "Ṅ": "Ṅ",
  "Ó": "Ó",
  "Ò": "Ò",
  "Ö": "Ö",
  "Ȫ": "Ȫ",
  "Õ": "Õ",
  "Ṍ": "Ṍ",
  "Ṏ": "Ṏ",
  "Ȭ": "Ȭ",
  "Ō": "Ō",
  "Ṓ": "Ṓ",
  "Ṑ": "Ṑ",
  "Ŏ": "Ŏ",
  "Ǒ": "Ǒ",
  "Ô": "Ô",
  "Ố": "Ố",
  "Ồ": "Ồ",
  "Ỗ": "Ỗ",
  "Ȯ": "Ȯ",
  "Ȱ": "Ȱ",
  "Ő": "Ő",
  "Ṕ": "Ṕ",
  "Ṗ": "Ṗ",
  "Ŕ": "Ŕ",
  "Ř": "Ř",
  "Ṙ": "Ṙ",
  "Ś": "Ś",
  "Ṥ": "Ṥ",
  "Š": "Š",
  "Ṧ": "Ṧ",
  "Ŝ": "Ŝ",
  "Ṡ": "Ṡ",
  "Ť": "Ť",
  "Ṫ": "Ṫ",
  "Ú": "Ú",
  "Ù": "Ù",
  "Ü": "Ü",
  "Ǘ": "Ǘ",
  "Ǜ": "Ǜ",
  "Ǖ": "Ǖ",
  "Ǚ": "Ǚ",
  "Ũ": "Ũ",
  "Ṹ": "Ṹ",
  "Ū": "Ū",
  "Ṻ": "Ṻ",
  "Ŭ": "Ŭ",
  "Ǔ": "Ǔ",
  "Û": "Û",
  "Ů": "Ů",
  "Ű": "Ű",
  "Ṽ": "Ṽ",
  "Ẃ": "Ẃ",
  "Ẁ": "Ẁ",
  "Ẅ": "Ẅ",
  "Ŵ": "Ŵ",
  "Ẇ": "Ẇ",
  "Ẍ": "Ẍ",
  "Ẋ": "Ẋ",
  "Ý": "Ý",
  "Ỳ": "Ỳ",
  "Ÿ": "Ÿ",
  "Ỹ": "Ỹ",
  "Ȳ": "Ȳ",
  "Ŷ": "Ŷ",
  "Ẏ": "Ẏ",
  "Ź": "Ź",
  "Ž": "Ž",
  "Ẑ": "Ẑ",
  "Ż": "Ż",
  "ά": "ά",
  "ὰ": "ὰ",
  "ᾱ": "ᾱ",
  "ᾰ": "ᾰ",
  "έ": "έ",
  "ὲ": "ὲ",
  "ή": "ή",
  "ὴ": "ὴ",
  "ί": "ί",
  "ὶ": "ὶ",
  "ϊ": "ϊ",
  "ΐ": "ΐ",
  "ῒ": "ῒ",
  "ῑ": "ῑ",
  "ῐ": "ῐ",
  "ό": "ό",
  "ὸ": "ὸ",
  "ύ": "ύ",
  "ὺ": "ὺ",
  "ϋ": "ϋ",
  "ΰ": "ΰ",
  "ῢ": "ῢ",
  "ῡ": "ῡ",
  "ῠ": "ῠ",
  "ώ": "ώ",
  "ὼ": "ὼ",
  "Ύ": "Ύ",
  "Ὺ": "Ὺ",
  "Ϋ": "Ϋ",
  "Ῡ": "Ῡ",
  "Ῠ": "Ῠ",
  "Ώ": "Ώ",
  "Ὼ": "Ὼ"
};

/* eslint no-constant-condition:0 */

/**
 * This file contains the parser used to parse out a TeX expression from the
 * input. Since TeX isn't context-free, standard parsers don't work particularly
 * well.
 *
 * The strategy of this parser is as such:
 *
 * The main functions (the `.parse...` ones) take a position in the current
 * parse string to parse tokens from. The lexer (found in Lexer.js, stored at
 * this.gullet.lexer) also supports pulling out tokens at arbitrary places. When
 * individual tokens are needed at a position, the lexer is called to pull out a
 * token, which is then used.
 *
 * The parser has a property called "mode" indicating the mode that
 * the parser is currently in. Currently it has to be one of "math" or
 * "text", which denotes whether the current environment is a math-y
 * one or a text-y one (e.g. inside \text). Currently, this serves to
 * limit the functions which can be used in text mode.
 *
 * The main functions then return an object which contains the useful data that
 * was parsed at its given point, and a new position at the end of the parsed
 * data. The main functions can call each other and continue the parsing by
 * using the returned position as a new starting point.
 *
 * There are also extra `.handle...` functions, which pull out some reused
 * functionality into self-contained functions.
 *
 * The functions return ParseNodes.
 */

class Parser {
  constructor(input, settings, isPreamble = false) {
    // Start in math mode
    this.mode = "math";
    // Create a new macro expander (gullet) and (indirectly via that) also a
    // new lexer (mouth) for this parser (stomach, in the language of TeX)
    this.gullet = new MacroExpander(input, settings, this.mode);
    // Store the settings for use in parsing
    this.settings = settings;
    // Are we defining a preamble?
    this.isPreamble = isPreamble;
    // Count leftright depth (for \middle errors)
    this.leftrightDepth = 0;
    this.prevAtomType = "";
  }

  /**
   * Checks a result to make sure it has the right type, and throws an
   * appropriate error otherwise.
   */
  expect(text, consume = true) {
    if (this.fetch().text !== text) {
      throw new ParseError(`Expected '${text}', got '${this.fetch().text}'`, this.fetch());
    }
    if (consume) {
      this.consume();
    }
  }

  /**
   * Discards the current lookahead token, considering it consumed.
   */
  consume() {
    this.nextToken = null;
  }

  /**
   * Return the current lookahead token, or if there isn't one (at the
   * beginning, or if the previous lookahead token was consume()d),
   * fetch the next token as the new lookahead token and return it.
   */
  fetch() {
    if (this.nextToken == null) {
      this.nextToken = this.gullet.expandNextToken();
    }
    return this.nextToken;
  }

  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
    this.gullet.switchMode(newMode);
  }

  /**
   * Main parsing function, which parses an entire input.
   */
  parse() {
    // Create a group namespace for every $...$, $$...$$, \[...\].)
    // A \def is then valid only within that pair of delimiters.
    this.gullet.beginGroup();

    if (this.settings.colorIsTextColor) {
      // Use old \color behavior (same as LaTeX's \textcolor) if requested.
      // We do this within the group for the math expression, so it doesn't
      // pollute settings.macros.
      this.gullet.macros.set("\\color", "\\textcolor");
    }

    // Try to parse the input
    const parse = this.parseExpression(false);

    // If we succeeded, make sure there's an EOF at the end
    this.expect("EOF");

    if (this.isPreamble) {
      const macros = Object.create(null);
      Object.entries(this.gullet.macros.current).forEach(([key, value]) => {
        macros[key] = value;
      });
      this.gullet.endGroup();
      return macros
    }

    // The only local macro that we want to save is from \tag.
    const tag = this.gullet.macros.get("\\df@tag");

    // End the group namespace for the expression
    this.gullet.endGroup();

    if (tag) { this.gullet.macros.current["\\df@tag"] = tag; }

    return parse;
  }

  static get endOfExpression() {
    return ["}", "\\endgroup", "\\end", "\\right", "\\endtoggle", "&"];
  }

  /**
   * Fully parse a separate sequence of tokens as a separate job.
   * Tokens should be specified in reverse order, as in a MacroDefinition.
   */
  subparse(tokens) {
    // Save the next token from the current job.
    const oldToken = this.nextToken;
    this.consume();

    // Run the new job, terminating it with an excess '}'
    this.gullet.pushToken(new Token("}"));
    this.gullet.pushTokens(tokens);
    const parse = this.parseExpression(false);
    this.expect("}");

    // Restore the next token from the current job.
    this.nextToken = oldToken;

    return parse;
  }

/**
   * Parses an "expression", which is a list of atoms.
   *
   * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
   *                 happens when functions have higher precedence han infix
   *                 nodes in implicit parses.
   *
   * `breakOnTokenText`: The text of the token that the expression should end
   *                     with, or `null` if something else should end the
   *                     expression.
   */
  parseExpression(breakOnInfix, breakOnTokenText) {
    const body = [];
    // Keep adding atoms to the body until we can't parse any more atoms (either
    // we reached the end, a }, or a \right)
    while (true) {
      // Ignore spaces in math mode
      if (this.mode === "math") {
        this.consumeSpaces();
      }
      const lex = this.fetch();
      if (Parser.endOfExpression.indexOf(lex.text) !== -1) {
        break;
      }
      if (breakOnTokenText && lex.text === breakOnTokenText) {
        break;
      }
      if (breakOnInfix && functions$1[lex.text] && functions$1[lex.text].infix) {
        break;
      }
      const atom = this.parseAtom(breakOnTokenText);
      if (!atom) {
        break;
      } else if (atom.type === "internal") {
        continue;
      }
      body.push(atom);
      // Keep a record of the atom type, so that op.js can set correct spacing.
      this.prevAtomType = atom.type === "atom" ? atom.family : atom.type;
    }
    if (this.mode === "text") {
      this.formLigatures(body);
    }
    return this.handleInfixNodes(body);
  }

  /**
   * Rewrites infix operators such as \over with corresponding commands such
   * as \frac.
   *
   * There can only be one infix operator per group.  If there's more than one
   * then the expression is ambiguous.  This can be resolved by adding {}.
   */
  handleInfixNodes(body) {
    let overIndex = -1;
    let funcName;

    for (let i = 0; i < body.length; i++) {
      if (body[i].type === "infix") {
        if (overIndex !== -1) {
          throw new ParseError("only one infix operator per group", body[i].token);
        }
        overIndex = i;
        funcName = body[i].replaceWith;
      }
    }

    if (overIndex !== -1 && funcName) {
      let numerNode;
      let denomNode;

      const numerBody = body.slice(0, overIndex);
      const denomBody = body.slice(overIndex + 1);

      if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
        numerNode = numerBody[0];
      } else {
        numerNode = { type: "ordgroup", mode: this.mode, body: numerBody };
      }

      if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
        denomNode = denomBody[0];
      } else {
        denomNode = { type: "ordgroup", mode: this.mode, body: denomBody };
      }

      let node;
      if (funcName === "\\\\abovefrac") {
        node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
      } else {
        node = this.callFunction(funcName, [numerNode, denomNode], []);
      }
      return [node];
    } else {
      return body;
    }
  }

  /**
   * Handle a subscript or superscript with nice errors.
   */
  handleSupSubscript(
    name // For error reporting.
  ) {
    const symbolToken = this.fetch();
    const symbol = symbolToken.text;
    this.consume();
    this.consumeSpaces(); // ignore spaces before sup/subscript argument
    const group = this.parseGroup(name);

    if (!group) {
      throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
    }

    return group;
  }

  /**
   * Converts the textual input of an unsupported command into a text node
   * contained within a color node whose color is determined by errorColor
   */
  formatUnsupportedCmd(text) {
    const textordArray = [];

    for (let i = 0; i < text.length; i++) {
      textordArray.push({ type: "textord", mode: "text", text: text[i] });
    }

    const textNode = {
      type: "text",
      mode: this.mode,
      body: textordArray
    };

    const colorNode = {
      type: "color",
      mode: this.mode,
      color: this.settings.errorColor,
      body: [textNode]
    };

    return colorNode;
  }

  /**
   * Parses a group with optional super/subscripts.
   */
  parseAtom(breakOnTokenText) {
    // The body of an atom is an implicit group, so that things like
    // \left(x\right)^2 work correctly.
    const base = this.parseGroup("atom", breakOnTokenText);

    // In text mode, we don't have superscripts or subscripts
    if (this.mode === "text") {
      return base;
    }

    // Note that base may be empty (i.e. null) at this point.

    let superscript;
    let subscript;
    while (true) {
      // Guaranteed in math mode, so eat any spaces first.
      this.consumeSpaces();

      // Lex the first token
      const lex = this.fetch();

      if (lex.text === "\\limits" || lex.text === "\\nolimits") {
        // We got a limit control
        if (base && base.type === "op") {
          const limits = lex.text === "\\limits";
          base.limits = limits;
          base.alwaysHandleSupSub = true;
        } else if (base && base.type === "operatorname") {
          if (base.alwaysHandleSupSub) {
            base.limits = lex.text === "\\limits";
          }
        } else {
          throw new ParseError("Limit controls must follow a math operator", lex);
        }
        this.consume();
      } else if (lex.text === "^") {
        // We got a superscript start
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        superscript = this.handleSupSubscript("superscript");
      } else if (lex.text === "_") {
        // We got a subscript start
        if (subscript) {
          throw new ParseError("Double subscript", lex);
        }
        subscript = this.handleSupSubscript("subscript");
      } else if (lex.text === "'") {
        // We got a prime
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        const prime = { type: "textord", mode: this.mode, text: "\\prime" };

        // Many primes can be grouped together, so we handle this here
        const primes = [prime];
        this.consume();
        // Keep lexing tokens until we get something that's not a prime
        while (this.fetch().text === "'") {
          // For each one, add another prime to the list
          primes.push(prime);
          this.consume();
        }
        // If there's a superscript following the primes, combine that
        // superscript in with the primes.
        if (this.fetch().text === "^") {
          primes.push(this.handleSupSubscript("superscript"));
        }
        // Put everything into an ordgroup as the superscript
        superscript = { type: "ordgroup", mode: this.mode, body: primes };
      } else if (uSubsAndSups[lex.text]) {
        // A Unicode subscript or superscript character.
        // We treat these similarly to the unicode-math package.
        // So we render a string of Unicode (sub|super)scripts the
        // same as a (sub|super)script of regular characters.
        const isSub = unicodeSubRegEx.test(lex.text);
        const subsupTokens = [];
        subsupTokens.push(new Token(uSubsAndSups[lex.text]));
        this.consume();
        // Continue fetching tokens to fill out the group.
        while (true) {
          const token = this.fetch().text;
          if (!(uSubsAndSups[token])) { break }
          if (unicodeSubRegEx.test(token) !== isSub) { break }
          subsupTokens.unshift(new Token(uSubsAndSups[token]));
          this.consume();
        }
        // Now create a (sub|super)script.
        const body = this.subparse(subsupTokens);
        if (isSub) {
          subscript = { type: "ordgroup", mode: "math", body };
        } else {
          superscript = { type: "ordgroup", mode: "math", body };
        }
      } else {
        // If it wasn't ^, _, a Unicode (sub|super)script, or ', stop parsing super/subscripts
        break;
      }
    }

    if (superscript || subscript) {
      if (base && base.type === "multiscript" && !base.postscripts) {
        // base is the result of a \prescript function.
        // Write the sub- & superscripts into the multiscript element.
        base.postscripts = { sup: superscript, sub: subscript };
        return base
      } else {
        // We got either a superscript or subscript, create a supsub
        const isFollowedByDelimiter = (!base || base.type !== "op" && base.type !== "operatorname")
          ? undefined
          : isDelimiter(this.nextToken.text);
        return {
          type: "supsub",
          mode: this.mode,
          base: base,
          sup: superscript,
          sub: subscript,
          isFollowedByDelimiter
        }
      }
    } else {
      // Otherwise return the original body
      return base;
    }
  }

  /**
   * Parses an entire function, including its base and all of its arguments.
   */
  parseFunction(
    breakOnTokenText,
    name // For determining its context
  ) {
    const token = this.fetch();
    const func = token.text;
    const funcData = functions$1[func];
    if (!funcData) {
      return null;
    }
    this.consume(); // consume command token

    if (name && name !== "atom" && !funcData.allowedInArgument) {
      throw new ParseError(
        "Got function '" + func + "' with no arguments" + (name ? " as " + name : ""),
        token
      );
    } else if (this.mode === "text" && !funcData.allowedInText) {
      throw new ParseError("Can't use function '" + func + "' in text mode", token);
    } else if (this.mode === "math" && funcData.allowedInMath === false) {
      throw new ParseError("Can't use function '" + func + "' in math mode", token);
    }

    const prevAtomType = this.prevAtomType;
    const { args, optArgs } = this.parseArguments(func, funcData);
    this.prevAtomType = prevAtomType;
    return this.callFunction(func, args, optArgs, token, breakOnTokenText);
  }

  /**
   * Call a function handler with a suitable context and arguments.
   */
  callFunction(name, args, optArgs, token, breakOnTokenText) {
    const context = {
      funcName: name,
      parser: this,
      token,
      breakOnTokenText
    };
    const func = functions$1[name];
    if (func && func.handler) {
      return func.handler(context, args, optArgs);
    } else {
      throw new ParseError(`No function handler for ${name}`);
    }
  }

  /**
   * Parses the arguments of a function or environment
   */
  parseArguments(
    func, // Should look like "\name" or "\begin{name}".
    funcData
  ) {
    const totalArgs = funcData.numArgs + funcData.numOptionalArgs;
    if (totalArgs === 0) {
      return { args: [], optArgs: [] };
    }

    const args = [];
    const optArgs = [];

    for (let i = 0; i < totalArgs; i++) {
      let argType = funcData.argTypes && funcData.argTypes[i];
      const isOptional = i < funcData.numOptionalArgs;

      if (
        (funcData.primitive && argType == null) ||
        // \sqrt expands into primitive if optional argument doesn't exist
        (funcData.type === "sqrt" && i === 1 && optArgs[0] == null)
      ) {
        argType = "primitive";
      }

      const arg = this.parseGroupOfType(`argument to '${func}'`, argType, isOptional);
      if (isOptional) {
        optArgs.push(arg);
      } else if (arg != null) {
        args.push(arg);
      } else {
        // should be unreachable
        throw new ParseError("Null argument, please report this as a bug");
      }
    }

    return { args, optArgs };
  }

  /**
   * Parses a group when the mode is changing.
   */
  parseGroupOfType(name, type, optional) {
    switch (type) {
      case "size":
        return this.parseSizeGroup(optional);
      case "url":
        return this.parseUrlGroup(optional);
      case "math":
      case "text":
        return this.parseArgumentGroup(optional, type);
      case "hbox": {
        // hbox argument type wraps the argument in the equivalent of
        // \hbox, which is like \text but switching to \textstyle size.
        const group = this.parseArgumentGroup(optional, "text");
        return group != null
          ? {
            type: "styling",
            mode: group.mode,
            body: [group],
            scriptLevel: "text" // simulate \textstyle
          }
          : null;
      }
      case "raw": {
        const token = this.parseStringGroup("raw", optional);
        return token != null
          ? {
            type: "raw",
            mode: "text",
            string: token.text
          }
          : null;
      }
      case "primitive": {
        if (optional) {
          throw new ParseError("A primitive argument cannot be optional");
        }
        const group = this.parseGroup(name);
        if (group == null) {
          throw new ParseError("Expected group as " + name, this.fetch());
        }
        return group;
      }
      case "original":
      case null:
      case undefined:
        return this.parseArgumentGroup(optional);
      default:
        throw new ParseError("Unknown group type as " + name, this.fetch());
    }
  }

  /**
   * Discard any space tokens, fetching the next non-space token.
   */
  consumeSpaces() {
    while (true) {
      const ch = this.fetch().text;
      // \ufe0e is the Unicode variation selector to supress emoji. Ignore it.
      if (ch === " " || ch === "\u00a0" || ch === "\ufe0e") {
        this.consume();
      } else {
        break
      }
    }
  }

  /**
   * Parses a group, essentially returning the string formed by the
   * brace-enclosed tokens plus some position information.
   */
  parseStringGroup(
    modeName, // Used to describe the mode in error messages.
    optional
  ) {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    let str = "";
    let nextToken;
    while ((nextToken = this.fetch()).text !== "EOF") {
      str += nextToken.text;
      this.consume();
    }
    this.consume(); // consume the end of the argument
    argToken.text = str;
    return argToken;
  }

  /**
   * Parses a regex-delimited group: the largest sequence of tokens
   * whose concatenated strings match `regex`. Returns the string
   * formed by the tokens plus some position information.
   */
  parseRegexGroup(
    regex,
    modeName // Used to describe the mode in error messages.
  ) {
    const firstToken = this.fetch();
    let lastToken = firstToken;
    let str = "";
    let nextToken;
    while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
      lastToken = nextToken;
      str += lastToken.text;
      this.consume();
    }
    if (str === "") {
      throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
    }
    return firstToken.range(lastToken, str);
  }

  /**
   * Parses a size specification, consisting of magnitude and unit.
   */
  parseSizeGroup(optional) {
    let res;
    let isBlank = false;
    // don't expand before parseStringGroup
    this.gullet.consumeSpaces();
    if (!optional && this.gullet.future().text !== "{") {
      res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
    } else {
      res = this.parseStringGroup("size", optional);
    }
    if (!res) {
      return null;
    }
    if (!optional && res.text.length === 0) {
      // Because we've tested for what is !optional, this block won't
      // affect \kern, \hspace, etc. It will capture the mandatory arguments
      // to \genfrac and \above.
      res.text = "0pt"; // Enable \above{}
      isBlank = true; // This is here specifically for \genfrac
    }
    const match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(res.text);
    if (!match) {
      throw new ParseError("Invalid size: '" + res.text + "'", res);
    }
    const data = {
      number: +(match[1] + match[2]), // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "'", res);
    }
    return {
      type: "size",
      mode: this.mode,
      value: data,
      isBlank
    };
  }

  /**
   * Parses an URL, checking escaped letters and allowed protocols,
   * and setting the catcode of % as an active character (as in \hyperref).
   */
  parseUrlGroup(optional) {
    this.gullet.lexer.setCatcode("%", 13); // active character
    this.gullet.lexer.setCatcode("~", 12); // other character
    const res = this.parseStringGroup("url", optional);
    this.gullet.lexer.setCatcode("%", 14); // comment character
    this.gullet.lexer.setCatcode("~", 13); // active character
    if (res == null) {
      return null;
    }
    // hyperref package allows backslashes alone in href, but doesn't
    // generate valid links in such cases; we interpret this as
    // "undefined" behaviour, and keep them as-is. Some browser will
    // replace backslashes with forward slashes.
    let url = res.text.replace(/\\([#$%&~_^{}])/g, "$1");
    url = res.text.replace(/{\u2044}/g, "/");
    return {
      type: "url",
      mode: this.mode,
      url
    };
  }

  /**
   * Parses an argument with the mode specified.
   */
  parseArgumentGroup(optional, mode) {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    const outerMode = this.mode;
    if (mode) {
      // Switch to specified mode
      this.switchMode(mode);
    }

    this.gullet.beginGroup();
    const expression = this.parseExpression(false, "EOF");
    // TODO: find an alternative way to denote the end
    this.expect("EOF"); // expect the end of the argument
    this.gullet.endGroup();
    const result = {
      type: "ordgroup",
      mode: this.mode,
      loc: argToken.loc,
      body: expression
    };

    if (mode) {
      // Switch mode back
      this.switchMode(outerMode);
    }
    return result;
  }

  /**
   * Parses an ordinary group, which is either a single nucleus (like "x")
   * or an expression in braces (like "{x+y}") or an implicit group, a group
   * that starts at the current position, and ends right before a higher explicit
   * group ends, or at EOF.
   */
  parseGroup(
    name, // For error reporting.
    breakOnTokenText
  ) {
    const firstToken = this.fetch();
    const text = firstToken.text;

    let result;
    // Try to parse an open brace or \begingroup
    if (text === "{" || text === "\\begingroup" || text === "\\toggle") {
      this.consume();
      const groupEnd = text === "{"
        ? "}"
        : text === "\\begingroup"
        ? "\\endgroup"
        : "\\endtoggle";

      this.gullet.beginGroup();
      // If we get a brace, parse an expression
      const expression = this.parseExpression(false, groupEnd);
      const lastToken = this.fetch();
      this.expect(groupEnd); // Check that we got a matching closing brace
      this.gullet.endGroup();
      result = {
        type: (lastToken.text === "\\endtoggle" ? "toggle" : "ordgroup"),
        mode: this.mode,
        loc: SourceLocation.range(firstToken, lastToken),
        body: expression,
        // A group formed by \begingroup...\endgroup is a semi-simple group
        // which doesn't affect spacing in math mode, i.e., is transparent.
        // https://tex.stackexchange.com/questions/1930/when-should-one-
        // use-begingroup-instead-of-bgroup
        semisimple: text === "\\begingroup" || undefined
      };
    } else {
      // If there exists a function with this name, parse the function.
      // Otherwise, just return a nucleus
      result = this.parseFunction(breakOnTokenText, name) || this.parseSymbol();
      if (result == null && text[0] === "\\" &&
          !Object.prototype.hasOwnProperty.call(implicitCommands, text )) {
        result = this.formatUnsupportedCmd(text);
        this.consume();
      }
    }
    return result;
  }

  /**
   * Form ligature-like combinations of characters for text mode.
   * This includes inputs like "--", "---", "``" and "''".
   * The result will simply replace multiple textord nodes with a single
   * character in each value by a single textord node having multiple
   * characters in its value.  The representation is still ASCII source.
   * The group will be modified in place.
   */
  formLigatures(group) {
    let n = group.length - 1;
    for (let i = 0; i < n; ++i) {
      const a = group[i];
      const v = a.text;
      if (v === "-" && group[i + 1].text === "-") {
        if (i + 1 < n && group[i + 2].text === "-") {
          group.splice(i, 3, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 2]),
            text: "---"
          });
          n -= 2;
        } else {
          group.splice(i, 2, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 1]),
            text: "--"
          });
          n -= 1;
        }
      }
      if ((v === "'" || v === "`") && group[i + 1].text === v) {
        group.splice(i, 2, {
          type: "textord",
          mode: "text",
          loc: SourceLocation.range(a, group[i + 1]),
          text: v + v
        });
        n -= 1;
      }
    }
  }

  /**
   * Parse a single symbol out of the string. Here, we handle single character
   * symbols and special functions like \verb.
   */
  parseSymbol() {
    const nucleus = this.fetch();
    let text = nucleus.text;

    if (/^\\verb[^a-zA-Z]/.test(text)) {
      this.consume();
      let arg = text.slice(5);
      const star = arg.charAt(0) === "*";
      if (star) {
        arg = arg.slice(1);
      }
      // Lexer's tokenRegex is constructed to always have matching
      // first/last characters.
      if (arg.length < 2 || arg.charAt(0) !== arg.slice(-1)) {
        throw new ParseError(`\\verb assertion failed --
                    please report what input caused this bug`);
      }
      arg = arg.slice(1, -1); // remove first and last char
      return {
        type: "verb",
        mode: "text",
        body: arg,
        star
      };
    }
    // At this point, we should have a symbol, possibly with accents.
    // First expand any accented base symbol according to unicodeSymbols.
    if (Object.prototype.hasOwnProperty.call(unicodeSymbols, text[0]) &&
        !symbols[this.mode][text[0]]) {
      // This behavior is not strict (XeTeX-compatible) in math mode.
      if (this.settings.strict && this.mode === "math") {
        throw new ParseError(`Accented Unicode text character "${text[0]}" used in ` + `math mode`,
          nucleus
        );
      }
      text = unicodeSymbols[text[0]] + text.slice(1);
    }
    // Strip off any combining characters
    const match = combiningDiacriticalMarksEndRegex.exec(text);
    if (match) {
      text = text.substring(0, match.index);
      if (text === "i") {
        text = "\u0131"; // dotless i, in math and text mode
      } else if (text === "j") {
        text = "\u0237"; // dotless j, in math and text mode
      }
    }
    // Recognize base symbol
    let symbol;
    if (symbols[this.mode][text]) {
      const group = symbols[this.mode][text].group;
      const loc = SourceLocation.range(nucleus);
      let s;
      if (Object.prototype.hasOwnProperty.call(ATOMS, group )) {
        const family = group;
        s = {
          type: "atom",
          mode: this.mode,
          family,
          loc,
          text
        };
      } else {
        if (asciiFromScript[text]) {
          // Unicode 14 disambiguates chancery from roundhand.
          // See https://www.unicode.org/charts/PDF/U1D400.pdf
          this.consume();
          const nextCode = this.fetch().text.charCodeAt(0);
          // mathcal is Temml default. Use mathscript if called for.
          const font = nextCode === 0xfe01 ? "mathscr" : "mathcal";
          if (nextCode === 0xfe00 || nextCode === 0xfe01) { this.consume(); }
          return {
            type: "font",
            mode: "math",
            font,
            body: { type: "mathord", mode: "math", loc, text: asciiFromScript[text] }
          }
        }
        // Default ord character. No disambiguation necessary.
        s = {
          type: group,
          mode: this.mode,
          loc,
          text
        };
      }
      symbol = s;
    } else if (text.charCodeAt(0) >= 0x80) {
      // no symbol for e.g. ^
      if (this.settings.strict) {
        if (!supportedCodepoint(text.charCodeAt(0))) {
          throw new ParseError(`Unrecognized Unicode character "${text[0]}"` +
          ` (${text.charCodeAt(0)})`, nucleus);
        } else if (this.mode === "math") {
          throw new ParseError(`Unicode text character "${text[0]}" used in math mode`, nucleus)
        }
      }
      // All nonmathematical Unicode characters are rendered as if they
      // are in text mode (wrapped in \text) because that's what it
      // takes to render them in LaTeX.
      symbol = {
        type: "textord",
        mode: "text",
        loc: SourceLocation.range(nucleus),
        text
      };
    } else {
      return null; // EOF, ^, _, {, }, etc.
    }
    this.consume();
    // Transform combining characters into accents
    if (match) {
      for (let i = 0; i < match[0].length; i++) {
        const accent = match[0][i];
        if (!unicodeAccents[accent]) {
          throw new ParseError(`Unknown accent ' ${accent}'`, nucleus);
        }
        const command = unicodeAccents[accent][this.mode] ||
                        unicodeAccents[accent].text;
        if (!command) {
          throw new ParseError(`Accent ${accent} unsupported in ${this.mode} mode`, nucleus);
        }
        symbol = {
          type: "accent",
          mode: this.mode,
          loc: SourceLocation.range(nucleus),
          label: command,
          isStretchy: false,
          isShifty: true,
          base: symbol
        };
      }
    }
    return symbol;
  }
}

/**
 * Parses an expression using a Parser, then returns the parsed result.
 */
const parseTree = function(toParse, settings) {
  if (!(typeof toParse === "string" || toParse instanceof String)) {
    throw new TypeError("Temml can only parse string typed expression")
  }
  const parser = new Parser(toParse, settings);
  // Blank out any \df@tag to avoid spurious "Duplicate \tag" errors
  delete parser.gullet.macros.current["\\df@tag"];

  let tree = parser.parse();

  // LaTeX ignores a \tag placed outside an AMS environment.
  if (!(tree.length > 0 &&  tree[0].type && tree[0].type === "array" && tree[0].addEqnNum)) {
    // If the input used \tag, it will set the \df@tag macro to the tag.
    // In this case, we separately parse the tag and wrap the tree.
    if (parser.gullet.macros.get("\\df@tag")) {
      if (!settings.displayMode) {
        throw new ParseError("\\tag works only in display mode")
      }
      parser.gullet.feed("\\df@tag");
      tree = [
        {
          type: "tag",
          mode: "text",
          body: tree,
          tag: parser.parse()
        }
      ];
    }
  }

  return tree
};

/**
 * This file contains information about the style that the mathmlBuilder carries
 * around with it. Data is held in an `Style` object, and when
 * recursing, a new `Style` object can be created with the `.with*` functions.
 */

const subOrSupLevel = [2, 2, 3, 3];

/**
 * This is the main Style class. It contains the current style.level, color, and font.
 *
 * Style objects should not be modified. To create a new Style with
 * different properties, call a `.with*` method.
 */
class Style {
  constructor(data) {
    // Style.level can be 0 | 1 | 2 | 3, which correspond to
    //       displaystyle, textstyle, scriptstyle, and scriptscriptstyle.
    // style.level does not directly set MathML's script level. MathML does that itself.
    // We use style.level to track, not set, math style so that we can get the
    // correct scriptlevel when needed in supsub.js, mathchoice.js, or for dimensions in em.
    this.level = data.level;
    this.color = data.color;  // string | void
    // A font family applies to a group of fonts (i.e. SansSerif), while a font
    // represents a specific font (i.e. SansSerif Bold).
    // See: https://tex.stackexchange.com/questions/22350/difference-between-textrm-and-mathrm
    this.font = data.font || "";                // string
    this.fontFamily = data.fontFamily || "";    // string
    this.fontSize = data.fontSize || 1.0;       // number
    this.fontWeight = data.fontWeight || "";
    this.fontShape = data.fontShape || "";
    this.maxSize = data.maxSize;                // [number, number]
  }

  /**
   * Returns a new style object with the same properties as "this".  Properties
   * from "extension" will be copied to the new style object.
   */
  extend(extension) {
    const data = {
      level: this.level,
      color: this.color,
      font: this.font,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontShape: this.fontShape,
      maxSize: this.maxSize
    };

    for (const key in extension) {
      if (Object.prototype.hasOwnProperty.call(extension, key)) {
        data[key] = extension[key];
      }
    }

    return new Style(data);
  }

  withLevel(n) {
    return this.extend({
      level: n
    });
  }

  incrementLevel() {
    return this.extend({
      level: Math.min(this.level + 1, 3)
    });
  }

  inSubOrSup() {
    return this.extend({
      level: subOrSupLevel[this.level]
    })
  }

  /**
   * Create a new style object with the given color.
   */
  withColor(color) {
    return this.extend({
      color: color
    });
  }

  /**
   * Creates a new style object with the given math font or old text font.
   * @type {[type]}
   */
  withFont(font) {
    return this.extend({
      font
    });
  }

  /**
   * Create a new style objects with the given fontFamily.
   */
  withTextFontFamily(fontFamily) {
    return this.extend({
      fontFamily,
      font: ""
    });
  }

  /**
   * Creates a new style object with the given font size
   */
  withFontSize(num) {
    return this.extend({
      fontSize: num
    });
  }

  /**
   * Creates a new style object with the given font weight
   */
  withTextFontWeight(fontWeight) {
    return this.extend({
      fontWeight,
      font: ""
    });
  }

  /**
   * Creates a new style object with the given font weight
   */
  withTextFontShape(fontShape) {
    return this.extend({
      fontShape,
      font: ""
    });
  }

  /**
   * Gets the CSS color of the current style object
   */
  getColor() {
    return this.color;
  }
}

/* Temml Post Process
 * Perform two tasks not done by Temml when it created each individual Temml <math> element.
 * Given a block,
 *   1. At each AMS auto-numbered environment, assign an id.
 *   2. Populate the text contents of each \ref & \eqref
 *
 * As with other Temml code, this file is released under terms of the MIT license.
 * https://mit-license.org/
 */

const version = "0.10.9";

function postProcess(block) {
  const labelMap = {};
  let i = 0;

  // Get a collection of the parents of each \tag & auto-numbered equation
  const parents = block.getElementsByClassName("tml-tageqn");
  for (const parent of parents) {
    const eqns = parent.getElementsByClassName("tml-eqn");
    if (eqns. length > 0 ) {
      // AMS automatically numbered equation.
      // Assign an id.
      i += 1;
      eqns[0].id = "tml-eqn-" + i;
      // No need to write a number into the text content of the element.
      // A CSS counter does that even if this postProcess() function is not used.
    }
    // If there is a \label, add it to labelMap
    const labels = parent.getElementsByClassName("tml-label");
    if (labels.length === 0) { continue }
    if (eqns.length > 0) {
      labelMap[labels[0].id] = String(i);
    } else {
      const tags = parent.getElementsByClassName("tml-tag");
      if (tags.length > 0) {
        labelMap[labels[0].id] = tags[0].textContent;
      }
    }
  }

  // Populate \ref & \eqref text content
  const refs = block.getElementsByClassName("tml-ref");
  [...refs].forEach(ref => {
    let str = labelMap[ref.getAttribute("href").slice(1)];
    if (ref.className.indexOf("tml-eqref") === -1) {
      // \ref. Omit parens.
      str = str.replace(/^\(/, "");
      str = str.replace(/\($/, "");
    }  {
      // \eqref. Include parens
      if (str.charAt(0) !== "(") { str = "(" + str; }
      if (str.slice(-1) !== ")") { str =  str + ")"; }
    }
    ref.textContent = str;
  });
}

/* eslint no-console:0 */

/**
 * Parse and build an expression, and place that expression in the DOM node
 * given.
 */
let render = function(expression, baseNode, options) {
  baseNode.textContent = "";
  const alreadyInMathElement = baseNode.tagName === "MATH";
  if (alreadyInMathElement) { options.wrap = "none"; }
  const math = renderToMathMLTree(expression, options);
  if (alreadyInMathElement) {
    // The <math> element already exists. Populate it.
    baseNode.textContent = "";
    math.children.forEach(e => { baseNode.appendChild(e.toNode()); });
  } else if (math.children.length > 1) {
    baseNode.textContent = "";
    math.children.forEach(e => { baseNode.appendChild(e.toNode()); });
  } else {
    baseNode.appendChild(math.toNode());
  }
};

// Temml's styles don't work properly in quirks mode. Print out an error, and
// disable rendering.
if (typeof document !== "undefined") {
  if (document.compatMode !== "CSS1Compat") {
    typeof console !== "undefined" &&
      console.warn(
        "Warning: Temml doesn't work in quirks mode. Make sure your " +
          "website has a suitable doctype."
      );

    render = function() {
      throw new ParseError("Temml doesn't work in quirks mode.");
    };
  }
}

/**
 * Parse and build an expression, and return the markup for that.
 */
const renderToString = function(expression, options) {
  const markup = renderToMathMLTree(expression, options).toMarkup();
  return markup;
};

/**
 * Parse an expression and return the parse tree.
 */
const generateParseTree = function(expression, options) {
  const settings = new Settings(options);
  return parseTree(expression, settings);
};

/**
 * Take an expression which contains a preamble.
 * Parse it and return the macros.
 */
const definePreamble = function(expression, options) {
  const settings = new Settings(options);
  settings.macros = {};
  if (!(typeof expression === "string" || expression instanceof String)) {
    throw new TypeError("Temml can only parse string typed expression")
  }
  const parser = new Parser(expression, settings, true);
  // Blank out any \df@tag to avoid spurious "Duplicate \tag" errors
  delete parser.gullet.macros.current["\\df@tag"];
  const macros = parser.parse();
  return macros
};

/**
 * If the given error is a Temml ParseError,
 * renders the invalid LaTeX as a span with hover title giving the Temml
 * error message.  Otherwise, simply throws the error.
 */
const renderError = function(error, expression, options) {
  if (options.throwOnError || !(error instanceof ParseError)) {
    throw error;
  }
  const node = new Span(["temml-error"], [new TextNode$1(expression + "\n" + error.toString())]);
  node.style.color = options.errorColor;
  node.style.whiteSpace = "pre-line";
  return node;
};

/**
 * Generates and returns the Temml build tree. This is used for advanced
 * use cases (like rendering to custom output).
 */
const renderToMathMLTree = function(expression, options) {
  const settings = new Settings(options);
  try {
    const tree = parseTree(expression, settings);
    const style = new Style({
      level: settings.displayMode ? StyleLevel.DISPLAY : StyleLevel.TEXT,
      maxSize: settings.maxSize
    });
    return buildMathML(tree, expression, style, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};

var temml = {
  /**
   * Current Temml version
   */
  version: version,
  /**
   * Renders the given LaTeX into MathML, and adds
   * it as a child to the specified DOM node.
   */
  render,
  /**
   * Renders the given LaTeX into MathML string,
   * for sending to the client.
   */
  renderToString,
  /**
   * Post-process an entire HTML block.
   * Writes AMS auto-numbers and implements \ref{}.
   * Typcally called once, after a loop has rendered many individual spans.
   */
  postProcess,
  /**
   * Temml error, usually during parsing.
   */
  ParseError,
  /**
   * Creates a set of macros with document-wide scope.
   */
  definePreamble,
  /**
   * Parses the given LaTeX into Temml's internal parse tree structure,
   * without rendering to HTML or MathML.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __parse: generateParseTree,
  /**
   * Renders the given LaTeX into a MathML internal DOM tree
   * representation, without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToMathMLTree: renderToMathMLTree,
  /**
   * adds a new symbol to builtin symbols table
   */
  __defineSymbol: defineSymbol,
  /**
   * adds a new macro to builtin macro list
   */
  __defineMacro: defineMacro
};

const sanitizeUrl = function(url) {
  if (url == null) {
    return null;
  }
  try {
    const prot = decodeURIComponent(url)
      .replace(/[^A-Za-z0-9/:]/g, "")
      .toLowerCase();
    if (
      prot.indexOf("javascript:") === 0 ||
      prot.indexOf("vbscript:") === 0 ||
      prot.indexOf("data:") === 0
    ) {
      return null;
    }
  } catch (e) {
    // decodeURIComponent sometimes throws a URIError
    // See `decodeURIComponent('a%AFc');`
    // http://stackoverflow.com/questions/9064536/javascript-decodeuricomponent-malformed-uri-exception
    return null;
  }
  return url;
};

const SANITIZE_TEXT_R = /[<>&"']/g;
const SANITIZE_TEXT_CODES = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;"
};
const sanitizeText = function(text /* : Attr */) {
  return String(text).replace(SANITIZE_TEXT_R, function(chr) {
    return SANITIZE_TEXT_CODES[chr];
  });
};

const htmlTag = (tagName, content, attributes = {}, isClosed = true) => {
  let attributeString = "";
  for (const attr in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, attr)) {
      const attribute = attributes[attr];
    // Removes falsey attributes
      if (attribute) {
        const sanitizedAttribute = attr === "src"
          ? attribute.replace(/</g, "%3C").replace(/>/g, "%3E")
          : sanitizeText(attribute);
        attributeString += " " + sanitizeText(attr) + '="' + sanitizedAttribute + '"';
      }
    }
  }

  const unclosedTag = "<" + tagName + attributeString + ">";

  if (isClosed) {
    return unclosedTag + content + "</" + tagName + ">";
  } else {
    return unclosedTag;
  }
};

const tagName = {
  em: "em",
  strong: "strong",
  code: "code",
  strikethru: "del",
  subscript: "sub",
  superscript: "sup",
  underline: "u",
  highlight: "mark"
};

const nodes = {
  html(node) { return node.text },
  heading(node)    {
    const text = output(node.content);
    let tag = "h" + node.attrs.level;
    tag = htmlTag(tag, text);
    // Add id so others can link to it.
    tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/,/g, "").replace(/\s+/g, '-') + "'" + tag.slice(3);
    return tag + "\n"
  },
  paragraph(node)  { return htmlTag("p", output(node.content)) + "\n" },
  blockquote(node) {return htmlTag("blockquote", output(node.content)) },
  code_block(node) {
    return htmlTag("pre", htmlTag("code", sanitizeText(node.content[0].text)))
  },
  hard_break(node) { return "<br>" },
  def(node)        { return "" },
  newline(node)    { return "\n" },
  horizontal_rule(node) { return "<hr>\n" },
  ordered_list(node) {
    const attributes = node.attrs.order !== 1 ? { start: node.attrs.order } : undefined;
    return htmlTag("ol", output(node.content), attributes) + "\n"
  },
  bullet_list(node)  { return htmlTag("ul", output(node.content)) + "\n" },
  list_item(node)    { return htmlTag("li", output(node.content)) + "\n" },
  table(node)        { return htmlTag("table", output(node.content), node.attrs) + "\n" },
  table_row(node)    { return htmlTag("tr", output(node.content)) + "\n" },
  table_header(node) {
    const attributes = {};
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan; }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan; }
    if (node.attrs.colwidth !== null && !isNaN(node.attrs.colwidth) ) {
      attributes.style = `width: ${node.attrs.colwidth}px`;
    }
    return htmlTag("th", output(node.content), attributes) + "\n"
  },
  table_cell(node) {
    const attributes = {};
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan; }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan; }
    if (node.attrs.colwidth !== null && !isNaN(node.attrs.colwidth) ) {
      attributes.style = `width: ${node.attrs.colwidth}px`;
    }
    return htmlTag("td", output(node.content), attributes)
  },
  link(node) {
    const attributes = { href: sanitizeUrl(node.attrs.href), title: node.attrs.title };
    return htmlTag("a", output(node.content), attributes);
  },
  image(node) {
    const attributes = { src: node.attrs.src };
    if (node.attrs.alt)   { attributes.alt = node.attrs.alt; }
    if (node.attrs.class) { attributes.class = node.attrs.class; }
    if (node.attrs.id)    { attributes.id = node.attrs.id; }
    if (node.attrs.width) { attributes.width = node.attrs.width; }
    return htmlTag("img", "", attributes, false);
  },
  figure(node)     { return htmlTag("figure", output(node.content)) + "\n" },
  figcaption(node) { return htmlTag("figcaption", output(node.content)) },
  figimg(node) {
    const attributes = { src: node.attrs.src, class: "figimg" };
    if (node.attrs.alt)   { attributes.alt = node.attrs.alt; }
    if (node.attrs.id)    { attributes.id = node.attrs.id; }
    if (node.attrs.width) { attributes.width = node.attrs.width; }
    return htmlTag("img", "", attributes, false) + "\n";
  },
  calculation(node) {
    const tex = parse(node.attrs.entry);
    return temml.renderToString(
      tex,
      { trust: true, displayMode: (node.attrs.displayMode || false) }
    )
  },
  tex(node) {
    return temml.renderToString(
      node.attrs.tex,
      { trust: true, displayMode: (node.attrs.displayMode || false) }
    )
  },
  indented_div(node)    { return htmlTag("div", output(node.content), { class: 'indented' }) },
  centered_div(node)    {
    return htmlTag("div", output(node.content), { class: 'centered' } )
  },
  dt(node)    {
    let text = output(node.content);
    let tag = htmlTag("dt", text);
    // Add id so others can link to it.
    const pos = text.indexOf("(");
    if (pos > -1) { text = text.slice(0, pos).replace("_", "-"); }
    tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/\s+/g, '-') + "'" + tag.slice(3);
    return tag + "\n"
  },
  dd(node)    { return htmlTag("dd", output(node.content)) + "\n" },
  text(node) {
    const text = sanitizeText(node.text);
    if (!node.marks) {
      return text
    } else {
      let span = text;
      for (const mark of node.marks) {
        if (mark.type === "link") {
          let tag = `<a href='${mark.attrs.href}'`;
          if (mark.attrs.title) { tag += ` title='${mark.attrs.title}''`; }
          span = tag + ">" + span + "</a>";
        } else {
          const tag = tagName[mark.type];
          span = `<${tag}>${span}</${tag}>`;
        }
      }
      return span
    }
  }
};

const output = ast => {
  // Return HTML.
  let html = "";
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      html += output(ast[i]);
    }
  } else if (ast.type !== "null") {
    html += nodes[ast.type](ast);
  }
  return html
};

const md2html = (md, inHtml = false) => {
  const ast = md2ast(md, inHtml);
  return output(ast)
};

/*
 * This file bundles together and exposes the calculation parts of Hurmet.
 * I use Rollup to create a UMD module from this code.
 * That way, one file can expose the same functionality to (1) the Hurmet.app web page,
 * (2) the REPL in the reference manual, (3) the script that transpiles
 * the Hurmet reference manual from Markdown to HTML, and (4) unit testing.
 *
 * Some of Hurmet’s exported functions are valuable only to the Hurmet.app web page.
 * If you wish to use Hurmet’s math parsing and/or calculation abilities,
 * the two functions you want are:
 *   parse(entry: string, decimalFormat?: string)
 *   calculate(entry: string, vars?: Object, draftMode?: boolean, decimalFormat?: string)
 *
 *   parse() returns a TeX string.
 *   calculate() returns either a TeX string or a string in Hurmet calculation syntax.
 *
 * The parameters of those two function are:
 *   entry: The string that a user types into a calculation editing box.
 *   draftMode: Determines if result is in TeX or in Hurmet calculation syntax.
 *   decimalFormat: A string containing one of the options available in the Hurmet ● menu.
 *   vars: If you want to evaluate several statements, the variable "vars" holds variable data.
 *         Initialize it as: vars = {}
 *         Or, if you want to specify a rounding format, initialize it as:
 *             vars = { format: { value: "h3" } }
 *         vars is updated with new variable data each time calculate() is called.
 */

const hurmet = {
  dt,
  parse,
  calculate,
  autoCorrect,
  prepareStatement,
  improveQuantities,
  draw,
  evaluate,
  md2ast,
  md2html,
  scanModule,
  updateCalculations
};

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
      temml.render(tex, demoOutput, {
        trust: (context) => context.command === "\\class" && context.class === "special-fraction",
        wrap: "="
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
