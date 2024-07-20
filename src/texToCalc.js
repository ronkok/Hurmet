import { cloneToken } from "./parser"
import { tt, lex } from "./lexer"

/*
 * teXtoCalc.js
 * This file takes a text string and compiles from TeX to Hurmet calculation format.
 *
*/

// Delimiter types
const PAREN = 1 // default
const FRAC = 2
const TFRAC = 4
const BINARY = 8
const ENV = 16  // environment
const CASES = 32
const SUB = 64

const  charAccents = {
  "\\bar": "\u0304",
  "\\grave": "\u0300",
  "\\acute": "\u0301",
  "\\hat": "\u0302",
  "\\tilde": "\u0303",
  "\\dot": "\u0307",
  "\\ddot": "\u0308",
  "\\mathring": "\u030A",
  "\\check": "\u030C",
  "\\underline": "\u0332",
  "\\overleftharpoon": "\u20d0",
  "\\overrightharpoon": "\u20d1",
  "\\overleftarrow": "\u20d6",
  "\\vec": "\u20d7",
  "\\overleftrightarrow": "\u20e1"
}
const openParenRegEx = /^ *(?:\\(?:left|big|Big|bigg|Bigg))? *\(/
const leadingSpaceRegEx = /^\s+/
const trailingSpaceRegEx = / +$/
const inlineFracRegEx = /^\/(?!\/)/
const ignoreRegEx = /^\\(left(?!\.)|right(?!\.)|middle|big|Big|bigg|Bigg)/
const subRegEx = /^\("([A-Za-z\u0391-\u03c9][A-Za-z0-9\u0391-\u03c9]*)"$/
const enviroRegEx = /^\\begin\{(?:(cases)|(|p|b|B|v|V)matrix)\}/
const endEnviroRegEx = /^\\end\{(?:cases|(?:|p|b|B|v|V)matrix)\}/
// eslint-disable-next-line max-len
const greekAlternatives = "Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|varphi"
const greekRegEx = RegExp("^\\\\(" + greekAlternatives + ")\\b")
// eslint-disable-next-line max-len
const bracedCharRegEx = RegExp("^\\{([A-Za-z0-9\u0391-\u03c9]|\\\\(" + greekAlternatives + "))\\}")
const greekLetters = {
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Zeta: "Ζ",
  Eta: "Η",
  Theta: "Θ",
  Iota: "Ι",
  Kappa: "Κ",
  Lambda: "Λ",
  Mu: "Μ",
  Nu: "Ν",
  Xi: "Ξ",
  Omicron: "Ο",
  Pi: "Π",
  Rho: "Ρ",
  Sigma: "Σ",
  Tau: "Τ",
  Upsilon: "Υ",
  Phi: "Φ",
  Chi: "Χ",
  Psi: "Ψ",
  Omega: "Ω",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "ϕ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  varphi: "φ"
}

const matrices = {
  m: ["{:", ":}"],
  p: ["(", ")"],
  b: ["[", "]"],
  B: ["{", "}"],
  v: ["|", "|"],
  V: ["‖", "‖"]
}

const eatOneChar = str => {
  str = str.slice(1)
  str = str.replace(leadingSpaceRegEx, "")
  return str
}

const eatMatch = (str, match) => {
  str = str.slice(match[0].length)
  str = str.replace(leadingSpaceRegEx, "")
  return str
}

export const texToCalc = str => {
  // Variable definitions
  let calc = ""
  let token = {}
  let prevToken = { input: "", output: "", ttype: 50 }
  const delims = [{ ch: "", pos: -1, type: 0 }] ; // delimiter stack
  let splitLongVars = true

  // Trim the input string
  str = str.replace(leadingSpaceRegEx, "") //       trim leading white space from string
  str = str.replace(/\s+$/, "") //                  trim trailing white space

  // Execute the main parse loop.
  while (str.length > 0) {
    // Get the next token.

    while (str.length > 0 && str.charAt(0) === "'") {
      // The lexer will not handle an apostrophe properly. Lex it locally.
      calc += "′"
      str = eatOneChar(str)
    }

    while (inlineFracRegEx.test(str)) {
      calc += "\u2215" // ∕
      str = eatOneChar(str)
    }

    while (str.length > 0 && str.charAt(0) === "\n") {
      calc += "\n"
      str = eatOneChar(str)
    }

    while (greekRegEx.test(str)) {
      const greekFunction = greekRegEx.exec(str)[0];
      calc += greekLetters[greekFunction.slice(1)] + " "
      str = str.slice(greekFunction.length)
      str = str.replace(leadingSpaceRegEx, "")
    }

    while (enviroRegEx.test(str)) {
      const match = enviroRegEx.exec(str)
      if (match[1]) {
        // {cases} environment
        delims.push({ ch: ":}", pos: calc.length, type: ENV + CASES })
        calc += "{"
      } else {
        const matrixType = match[2] ? match[2] : "m"
        delims.push({ ch: matrices[matrixType][1], pos: calc.length, type: ENV })
        calc += matrices[matrixType][0];
      }
      str = eatMatch(str, match)
    }

    while (endEnviroRegEx.test(str)) {
      const match = endEnviroRegEx.exec(str)
      const delim = delims.pop()
      if (match[0].indexOf("cases") > -1) {
        // {cases} environment. Clean up the if statements
        let casesText = calc.slice(delim.pos + 1)
        casesText = casesText.replace(/"if *"/g, "if ")
        calc = calc.slice(0, delim.pos + 1) + casesText
      }
      calc += delim.ch
      str = eatMatch(str, match)
    }

    while (ignoreRegEx.test(str)) {
      const match = ignoreRegEx.exec(str)
      str = eatMatch(str, match)
    }

    const tkn = lex(str, "10000000.", prevToken)
    token = { input: tkn[0], output: tkn[2], ttype: tkn[3], closeDelim: tkn[4] }
    str = str.slice(token.input.length)
    str = str.replace(leadingSpaceRegEx, "")

    switch (token.ttype) {
      case tt.SPACE: //      spaces and newlines
        calc += token.output
        break

      case tt.SUPCHAR:
        if (calc.slice(-1) === " ") { calc = calc.slice(0, -1) }
        calc += token.output
        break

      case tt.SUB:
      case tt.SUP:
        calc += token.output
        if (str.length > 0 && str.charAt(0) === "{") {
          const delimType = token.ttype === tt.SUB ? SUB : PAREN
          delims.push({ ch: ")", pos: calc.length, type: delimType })
          calc += "("
          str = eatOneChar(str)
        }
        break

      case tt.NUM:
      case tt.ORD:
      case tt.VAR:
      case tt.ADD: //        infix add/subtract operators, + -
      case tt.MULT: //       infix mult/divide operators, × * · // ÷
      case tt.REL: //        relational operators, e.g  < == →
      case tt.BIN: //    infix math operators that render but don't calc, e.g. \bowtie
      case tt.BIG_OPERATOR:  // integral, sum, etc
      case tt.FACTORIAL:
        if (token.input === "&" && (delims[delims.length - 1].type & ENV)) {
          // Write a comma separator for environments (except cases)
          if (delims[delims.length - 1].type === ENV) {
            calc += ", "
          }
        } else {
          calc += token.output + " "
        }
        break

      case tt.LONGVAR:
        calc += splitLongVars ? token.output.split("").join(" ") + " " : token.output
        break

      case tt.ACCENT: {
        if (charAccents[token.input] && bracedCharRegEx.test(str)) {
          delims.push({ ch: charAccents[token.input], pos: calc.length, type: PAREN })
          str = eatOneChar(str)
        } else if ( token.input === "\\mathrm") {
          splitLongVars = false
          delims.push({ ch: '', pos: calc.length, type: PAREN })
          str = eatOneChar(str)
        } else {
          calc += token.output
          if (str.length > 0 && str.charAt(0) === "{") {
            calc += "("
            delims.push( { ch: ")", pos: calc.length, type: PAREN })
            str = eatOneChar(str)
          }
        }
        break
      }

      case tt.UNARY: {
        if (token.input === "\\text") {
          delims.push({ ch: '"', pos: calc.length, type: PAREN })
          calc += '"'
          splitLongVars = false
          str =  str.slice(1)
        } else {
          calc += token.output
          if (str.length > 0 && str.charAt(0) === "{") {
            delims.push({ ch: ")", pos: calc.length, type: PAREN })
            calc +=  '('
            str = eatOneChar(str)
          }
        }
        break
      }

      case tt.BINARY: {
        const pos = calc.length
        if (token.input === "\\frac" || token.input === "\\dfrac") {
          calc += "("
          delims.push({ ch: ")/(", pos, type: FRAC })
        } else if (token.input === "\\tfrac") {
          calc += "("
          delims.push({ ch: ")//(", pos, type: TFRAC })
        } else {
          calc += token.input + "{"
          delims.push({ ch: "}{", pos, type: BINARY })
        }
        str = eatOneChar(str)
        break
      }

      case tt.DIV: {
        const pos = delims[delims.length - 1].pos
        calc = calc.slice(0, pos) + "(" + calc.slice(pos + 1)
        delims.pop()
        calc += token.input === "\\over" ? ")/(" : ")" + token.input + "("
        delims.push({ ch: ")", pos: calc.length - 1, type: PAREN })
        break
      }

      case tt.FUNCTION: {
        calc += token.output
        const pos = calc.length
        const match = openParenRegEx.exec(str)
        if (match) {
          calc += "("
          delims.push({ ch: ")", pos, type: PAREN })
          str = eatMatch(str, match)
        } else {
          calc += " "
        }
        break
      }

      case tt.LEFTBRACKET: {
        delims.push({ ch: token.closeDelim, pos: calc.length, type: PAREN })
        calc += token.output
        break
      }

      case tt.SEP: {
        const inEnvironment = (delims[delims.length - 1].type & ENV)
        if (token.input === "//" && inEnvironment) {
          calc += ";"
        } else {
          calc += token.output
        }
        break
      }

      case tt.RIGHTBRACKET: {
        const delim = delims.pop()
        calc = calc.replace(trailingSpaceRegEx, "")
        if (/ $/.test(calc)) { calc = calc.slice(0, -1) }
        if (delim.type === FRAC) {
          calc += ") / ("
          str = eatOneChar(str)
          delims.push({ ch: ")", pos: calc.length - 1, type: PAREN })
        } else if (delim.type === TFRAC) {
          calc += ")//("
          str = eatOneChar(str)
          delims.push({ ch: ")", pos: calc.length - 1, type: PAREN })
        } else if (delim.type === BINARY) {
          calc += "}{"
          str = eatOneChar(str)
          delims.push({ ch: "}", pos: calc.length - 1, type: PAREN })
        } else if (delim.type === SUB) {
          let subText = calc.slice(delim.pos)
          if (subRegEx.test(subText)) {
            // Replace _("subscript") with _subscript
            subText = subText.replace(subRegEx, "$1")
            calc = calc.slice(0, delim.pos) + subText + " "
          } else {
            calc += delim.ch + " "
          }
        } else {
          calc += delim.ch + " "
        }
        if (delim.ch === '"' || delim.ch === "") { splitLongVars = true }
        break
      }

      default:
        calc += token.output
    }

    prevToken = cloneToken(token)
  }
  calc = calc.replace(/ {2,}/g, " ") // Replace multiple spaces with single space.
  calc = calc.replace(/\s+(?=[_^'′!)}\]〗])/g, "") // Delete spaces before right delims
  calc = calc.replace(/\s+$/, "") //                 Delete trailing space

  return calc
}
