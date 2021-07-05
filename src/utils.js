/*
 * Hurmet, copyright (c) by Ron Kok
 * Distributed under an MIT license: https://Hurmet.app/LICENSE.txt
 *
 * Hurmet adds calculation cells to the ProseMirror rich text editor.
 * See https://Hurmet.app and https://Hurmet.app/docs/en/manual.html
 */

// utils.js

export const isIn = (item, arry) => {
  // Binary search to see if item is in an array
  // This works only if the array is pre-sorted.
  if (arry.length === 0) { return false }
  let i = 0
  let iLow = 0
  let iHigh = arry.length - 1
  while (iLow < iHigh) {
    i = Math.floor((iLow + iHigh) / 2)
    if (item > arry[i]) {
      iLow = i + 1
    } else {
      iHigh = i
    }
  }
  return item === arry[iLow]
}

export const clone = obj => {
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

  if (typeof obj === "object") {
    const copy = Object.create(null)
    Object.entries(obj).forEach(([key, value]) => {
      copy[key] = clone(value)
    })
    return copy
  }

  throw new Error("Unable to clone obj! Its type isn't supported.")
}


// A map function for Maps
export const mapMap = (map, fn) => {
  const newMap = new Map()
  for (const [key, value] of map.entries()) {
    newMap.set(key, fn(value))
  }
  return newMap
}


// A function to return an array containing all matches to a RegEx pattern.
export const arrayOfRegExMatches = (regex, text) => {
  if (regex.constructor !== RegExp) { throw new Error('not RegExp') }
  const result = []
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

export const addTextEscapes = str => {
  // Insert escapes for # $ & % _ ~ ^ \ { }
  // TODO: \textbackslash.
  // TODO: How to escape { } without messing up Lex?
  if (str.length > 1) {
    const matches = arrayOfRegExMatches(/[#$&%_~^]/g, str)
    const L = matches.length
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

const midDotRegEx = /^(\*|·|\.|-[A-Za-z])/
export const exponentRegEx = /[⁰¹²³\u2074-\u2079⁻]/

export const unitTeXFromString = str => {
  // This function supports function parseQuantityLiteral()

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
