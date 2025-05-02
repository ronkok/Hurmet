/*
 * Hurmet, copyright (c) by Ron Kok
 * Distributed under an MIT license: https://hurmet.org/LICENSE.txt
 *
 * Hurmet adds calculation cells to the ProseMirror rich text editor.
 * See https://hurmet.org and https://hurmet.org/docs/en/manual.html
 */

// utils.js

// If you modify, isValidIdentifier, also modify functionRegEx in mathprompt.js
export const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))(?:[A-Za-z0-9\u0391-\u03C9\u03D5]+|[\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1])?(?:_[A-Za-z0-9\u0391-\u03C9\u03D5]+|[₀-₉]+)?′*$/
// Detect string interpolation ${varName}
export const interpolateRegEx = /\$\{[^}\s]+\}/g

export const clone = obj => {
  // Clone a JavaScript object.
  // That is, make a deep copy that does not contain any reference to the original object.
  // This function works if the object contains only these types:
  //     boolean, number, bigint, string, null, undefined, date, array, object, Map
  // Any other type, or non-tree structure (e.g., "this"), cannot be handled by this function.
  // This is a modified version of https://stackoverflow.com/a/728694

  // Handle boolean, number, bigint, string, null, or undefined
  // eslint-disable-next-line eqeqeq
  if (null == obj || "object" != typeof obj) { return obj }

  if (obj instanceof Date) { return new Date().setTime(obj.valueOf()) }

  if (Array.isArray(obj)) {
    const copy = []
    for (let i = 0, len = obj.length; i < len; i++) {
      copy[i] = clone(obj[i])
    }
    return copy
  }

  if (obj instanceof Map) {
    const copy = new Map()
    for (const [key, value] of obj.entries()) {
      copy.set(key, clone(value))
    }
    return copy
  }

  if (obj instanceof Set) {
    return new Set([...obj])
  }

  if (typeof obj === "object") {
    const copy = Object.create(null)
    Object.entries(obj).forEach(([key, value]) => {
      copy[key] = clone(value)
    })
    return copy
  }

  throw new Error("Unable to clone obj! Its type isn't supported.")
}

export const memoizeFunction = passedFunction => {
  const cache = {}
  return function(x) {
    if (x in cache) { return cache[x] }
    cache[x] = passedFunction(x)
    return cache[x]
  }
}

// A function to return an array containing all matches to a RegEx pattern.
export const arrayOfRegExMatches = (regex, text) => {
  if (regex.constructor !== RegExp) { throw new Error('not RegExp') }
  const result = [];
  let match = null

  /* eslint-disable no-cond-assign */
  if (regex.global) {
    while (match = regex.exec(text)) {
      result.push({ value: match[0], index: match.index, length: match[0].length })
    }
  } else if (match = regex.exec(text)) {
    result.push({ value: match[0], index: match.index, length: match[0].length })
  }
  /* eslint-enable no-cond-assign */

  return result
}

export const verbatimArg = str => {
  if (str[0] !== "{" && str[0] !== "(" && str[0] !== "[") {
    return ""
  }
  const openDelimiter = str[0];
  const closeDelimiter = openDelimiter === "{"
    ? "}"
    : openDelimiter === "["
    ? "]"
    : ")"
  let result = ""
  let level = 1
  for (let i = 1; i < str.length; i++) {
    const char = str[i];
    if (char === openDelimiter && ((openDelimiter === "(" || openDelimiter === "[")
      || (i === 1 || str[i - 1] !== "\\"))) {
      level += 1
    } else if (char === closeDelimiter && ((closeDelimiter === ")" || closeDelimiter === "]")
        || (i === 1 || str[i - 1] !== "\\"))) {
      level -= 1
    }
    if (level === 0) {
      return result
    }
    result += char
  }
  return ""
}

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
}

const escapeRegEx = /[#$&%_~^]/g
const accentRegEx = /[\u0300-\u0308\u030A\u030c]/g

export const addTextEscapes = str => {
  // Insert escapes for # $ & % _ ~ ^ \ { }
  // TODO: \textbackslash.
  // TODO: How to escape { } without messing up Lex?
  if (str.length > 1) {
    let matches = arrayOfRegExMatches(escapeRegEx, str)
    let L = matches.length
    if (L > 0) {
      for (let i = L - 1; i >= 0; i--) {
        const match = matches[i]
        const pos = match.index
        if (match.value === "~") {
          str = str.slice(0, pos) + "\\textasciitilde " + str.slice(pos + 1)
        } else if (match.value === "^") {
          str = str.slice(0, pos) + "\\textasciicircum " + str.slice(pos + 1)
        } else if (pos === 0) {
          str = "\\" + str
        } else {
          const pc = str.substr(pos - 1, 1)
          if (pc !== "\\") {
            str = str.slice(0, pos) + "\\" + str.slice(pos)
          }
        }
      }
    }
    matches = arrayOfRegExMatches(accentRegEx, str)
    L = matches.length
    if (L > 0) {
      for (let i = L - 1; i >= 0; i--) {
        const match = matches[i]
        const pos = match.index
        if (pos > 0) {
          str = str.slice(0, pos - 1) + "\\" + textAccent[match.value]
              + str.slice(pos - 1, pos) + str.slice(pos + 1)
        }
      }
    }
  }
  return str
}

export const numeralFromSuperScript = ch => {
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
}

// Trim spaces except for tabs. This is used to read tab-separated values (TSV).
const leadingSpaceRegEx = /^[ \r\n\f]+/
const trailingSpaceRegEx = /[ \r\n\f]+$/
export const tablessTrim = str => {
  return str.replace(leadingSpaceRegEx, "").replace(trailingSpaceRegEx, "")
}

const midDotRegEx = /^(\*|·|\.|-[A-Za-z])/
export const exponentRegEx = /[⁰¹²³\u2074-\u2079⁻]/

export const unitTeXFromString = str => {
  // I wrap a unit name with an extra pair of braces {}.
  // Tt's a hint so that plugValsIntoEcho() can easily remove a unit name.
  let unit = " {\\text{"
  let inExponent = false

  for (let i = 0; i < str.length; i++) {
    let ch = str.charAt(i)
    if (exponentRegEx.test(ch)) {
      ch = numeralFromSuperScript(ch)
    }
    if (midDotRegEx.test(str.slice(i))) {
      unit += "}\\mkern1mu{\\cdot}\\mkern1mu\\text{"
    } else if (/[0-9-]/.test(ch)) {
      ch = ch === "-" ? "\\text{-}" : ch
      if (inExponent) {
        unit += ch
      } else {
        unit += "}^{" + ch
        inExponent = true
      }
    } else if (ch === "^") {
      unit += "}^{"
      inExponent = true
    } else if (inExponent) {
      unit += "}\\text{" + ch
      inExponent = false
    } else if (ch === "$") {
      unit += "\\$"
    } else {
      unit += ch
    }
  }

  return unit + "}}"
}
