import { cloneToken, verbatimUnaries } from "./parser"
import { tt, lex } from "./lexer"
import { verbatimArg } from "./utils.js"

/*
 * teXtoCalc.js
 * This file takes a text string and compiles from TeX to Hurmet calculation format.
*/

// Delimiter types
const PAREN = 1 // default
const FRAC = 2
const TFRAC = 4
const BINARY = 8
const ENV = 16  // environment

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
const textSubRegEx = /^(?:(?:\\text|\\mathrm)?{([A-Za-z\u0391-\u03c9][A-Za-z0-9\u0391-\u03c9]*)}|{(?:\\text|\\mathrm)\{([A-Za-z\u0391-\u03c9][A-Za-z0-9\u0391-\u03c9]*)}})/
const enviroRegEx = /^\\begin\{(?:(cases|rcases|align|equation|split|gather|CD|multline|smallmatrix)|(|p|b|B|v|V)matrix)\}/
const endEnviroRegEx = /^\\end\{(?:(cases|rcases|align|equation|split|gather|CD|multline|smallmatrix)|(|p|b|B|v|V)matrix)\}/
// eslint-disable-next-line max-len
const greekAlternatives = "Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|varphi"
const greekRegEx = RegExp("^\\\\(" + greekAlternatives + ")\\b")
const mathOperatorRegEx = /^\\(arcsin|arccos|arctan|arctg|arcctg|arg|ch|cos|cosec|cosh|cot|cotg|coth|csc|ctg|cth|deg|dim|exp|hom|ker|lg|ln|log|sec|sin|sinh|sh|sgn|tan|tanh|tg|th|max|min|gcd)\b/
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
const boldRegEx = /^\\mathbf{([A-Za-z])}/

const matrices = {
  m: ["{:", ":}"],
  p: ["(", ")"],
  b: ["[", "]"],
  B: ["{", "}"],
  v: ["|", "|"],
  V: ["‖", "‖"]
}

const donotConvert = ["\\begin{CD}"];

const eatOpenBrace = str => {
  if (str.length === 0) { return ["", true] }
  let didNotFindBrace = false
  if (str[0] === "{") {
    str = str.slice(1)
  } else {
    didNotFindBrace = true
  }
  str = str.replace(leadingSpaceRegEx, "")
  return [str, didNotFindBrace]
}

const eatMatch = (str, match) => {
  str = str.slice(match[0].length)
  str = str.replace(leadingSpaceRegEx, "")
  return str
}

export const tex2Calc = (str, displayMode = false) => {
  // Variable definitions
  let calc = ""
  let token = {}
  let prevToken = { input: "", output: "", ttype: 50 }
  const delims = [{ ch: "", pos: -1, type: 0 }] ; // delimiter stack
  let splitLongVars = true
  let waitingForUnbracedArg = false
  let justGotUnbracedArg = false

  // Trim the input string
  str = str.replace(leadingSpaceRegEx, "") //  trim leading white space
  str = str.replace(/\s+$/, "") //             trim trailing white space

  // Execute the main parse loop.
  while (str.length > 0 || justGotUnbracedArg) {
    // Get the next token.

    while (str.length > 0 && str.charAt(0) === "\n") {
      calc += "\n"
      str = str.replace(leadingSpaceRegEx, "")
    }

    if (justGotUnbracedArg) {
      token = { input: "", output: "", ttype: tt.RIGHTBRACKET, closeDelim: "" }
      justGotUnbracedArg = false

    } else if (str.length > 0 && str.charAt(0) === "'") {
      // The lexer will not handle an apostrophe properly. Lex it locally.
      token = { input: "'", output: "′", ttype: tt.PRIME, closeDelim: "" }
      str = str.slice(1)
      str = str.replace(leadingSpaceRegEx, "")

    } else if (inlineFracRegEx.test(str)) {
      token = { input: "/", output: "\u2215", ttype: tt.MULT, closeDelim: "" }
      str = str.slice(1)
      str = str.replace(leadingSpaceRegEx, "")

    } else if (mathOperatorRegEx.test(str)) {
      const match = mathOperatorRegEx.exec(str)
      token = { input: match[0], output: match[1], ttype: tt.FUNCTION, closeDelim: "" }
      str = eatMatch(str, match)

    } else if (greekRegEx.test(str)) {
      const match = greekRegEx.exec(str)
      token = {
        input: match[0],
        output: greekLetters[match[0].slice(1)],
        ttype: tt.VAR,
        closeDelim: ""
      }
      str = eatMatch(str, match)

    } else if (boldRegEx.test(str)) {
      const match = boldRegEx.exec(str)
      const codePoint = match[1].codePointAt(0)
      const offset = codePoint < 91 ? 0x1D3BF : 0x1D3B9
      const ch = String.fromCodePoint(codePoint + offset)
      token = { input: match[0], output: ch, ttype: tt.VAR, closeDelim: "" }
      str = eatMatch(str, match)

    } else if (enviroRegEx.test(str)) {
      const match = enviroRegEx.exec(str)
      if (match[1]) {
        if (donotConvert.includes(match[0])) { return `"Unable to convert ${match[1]}"` }
        token = { input: match[0], output:`\\${match[1]}(`,
          ttype: tt.ENVIRONMENT, closeDelim: ")" }
      } else {
        const matrixType = match[2] || "m"
        token = { input: match[0], output: matrices[matrixType][0],
          ttype: tt.ENVIRONMENT, closeDelim: matrices[matrixType][1] }
      }
      str = eatMatch(str, match)

    } else if (endEnviroRegEx.test(str)) {
      const match = endEnviroRegEx.exec(str)
      token = { input: match[0], output: match[1], ttype: tt.RIGHTBRACKET, closeDelim: "" }
      str = eatMatch(str, match)

    } else if (ignoreRegEx.test(str)) {
      const match = ignoreRegEx.exec(str)
      str = eatMatch(str, match)

    } else {
      // Many, many symbols are the same in TeX and in Hurmet calcs.
      // So we can use the Hurmet lexer to identify them.
      const tkn = lex(str, { decimalFormat: "10000000.", dateFormat: "yyyy-mm-dd" }, prevToken)
      if (donotConvert.includes(tkn[0])) { return `'"Unable to convert ${tkn[1]}"` }
      if (waitingForUnbracedArg && (tkn[3] === tt.LONGVAR || tkn[3] === tt.NUM)) {
        token = { input: tkn[0][0], output: tkn[2][0], ttype: tkn[3], closeDelim: "" }
        str = str.slice(1)
      } else {
        token = { input: tkn[0], output: tkn[2], ttype: tkn[3], closeDelim: tkn[4] }
        str = str.slice(token.input.length)
      }
      str = str.replace(leadingSpaceRegEx, "")
    }

    switch (token.ttype) {
      case tt.SPACE: //      spaces and newlines
        calc += token.output
        break

      case tt.SUPCHAR:
        calc = calc.replace(trailingSpaceRegEx, "")
        calc += token.output
        break

      case tt.SUB:
      case tt.SUP:
        calc = calc.replace(trailingSpaceRegEx, "")
        calc += token.output
        if (token.ttype === tt.SUB && textSubRegEx.test(str)) {
          const match = textSubRegEx.exec(str)
          const subscript = match[1] ? match[1] : match[2]
          calc += subscript + " "
          str = str.slice(match[0].length)
        } else if (str.length > 0 && str.charAt(0) === "{") {
          [str, waitingForUnbracedArg] = eatOpenBrace(str)
          delims.push({ ch: ")", pos: calc.length, type: PAREN })
          calc += "("
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
      case tt.FACTORIAL: {
        if (token.input === "&" && (delims[delims.length - 1].type === ENV)) {
          calc += ", "   // Write a comma separator for environments
        } else {
          calc += token.output + " "
        }
        if (waitingForUnbracedArg) {
          justGotUnbracedArg = true
          waitingForUnbracedArg = false
        }
        break
      }

      case tt.LONGVAR:
        calc += splitLongVars ? token.output.split("").join(" ") + " " : token.output
        break

      case tt.PRIME:
        calc = calc.trim() + token.output
        break

      case tt.ACCENT: {
        if (charAccents[token.input] && bracedCharRegEx.test(str)) {
          delims.push({ ch: charAccents[token.input], pos: calc.length, type: PAREN });
          [str, waitingForUnbracedArg] = eatOpenBrace(str)
        } else {
          calc += token.output
          if (str.length > 0 && str.charAt(0) === "{") {
            calc += "("
            delims.push( { ch: ")", pos: calc.length, type: PAREN });
            [str, waitingForUnbracedArg] = eatOpenBrace(str)
          }
        }
        break
      }

      case tt.UNARY: {
        if (verbatimUnaries.has(token.input)) {
          const arg = verbatimArg(str)
          calc += token.input === "\\text"
            ? '"' + arg + '"'
            : token.input === "\\mathrm" && arg.length > 1 && arg.indexOf(" ") === -1
            ? arg
            : token.input + "(" + arg + ")"
          if (token.input === "\\mathrm" && waitingForUnbracedArg) {
            justGotUnbracedArg = true
            waitingForUnbracedArg = false
          }
          str = str.slice(arg.length + 2)
          str = str.replace(leadingSpaceRegEx, "")
        } else if (token.input === "\\sqrt") {
          if (str.slice(0, 1) === "[") {
            const root = verbatimArg(str)
            str = str.slice(root.length + 2)
            str = str.replace(leadingSpaceRegEx, "")
            calc += (root === "3") ? "∛(" : (root === "4") ? "∜(" : `root(${root})(`
          } else {
            calc += "√("
          }
          delims.push({ ch: ")", pos: calc.length, type: PAREN });
          [str, waitingForUnbracedArg] = eatOpenBrace(str)
        } else {
          calc += token.output + "("
          if (str.length > 0 && str.charAt(0) === "{") {
            delims.push({
              ch: ")",
              pos: calc.length,
              type: token.input === "\\bordermatrix" ? ENV : PAREN
            })
          }
          [str, waitingForUnbracedArg] = eatOpenBrace(str)
        }
        break
      }

      case tt.BINARY: {
        const pos = calc.length
        if (token.input === "\\dfrac" || (token.input === "\\frac" && displayMode)) {
          calc += "("
          delims.push({ ch: ")/(", pos, type: FRAC })
        } else if (token.input === "\\tfrac" || (token.input === "\\frac" && !displayMode)) {
          calc += "("
          delims.push({ ch: ")//(", pos, type: TFRAC })
        } else {
          calc += token.input + "("
          delims.push({ ch: ")(", pos, type: BINARY })
        };
        [str, waitingForUnbracedArg] = eatOpenBrace(str)
        break
      }

      case tt.DIV: {   // \over, \atop
        const pos = delims[delims.length - 1].pos
        calc = calc.slice(0, pos) + "(" + calc.slice(pos + 1)
        delims.pop()
        calc += token.input === "\\over" ? ")/(" : ")" + token.output + "("
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

      case tt.LEFTBRACKET:
      case tt.ENVIRONMENT:   {
        delims.push({
          ch: token.closeDelim,
          pos: calc.length,
          type: token.ttype === tt.ENVIRONMENT ? ENV : PAREN
        })
        calc += token.output
        break
      }

      case tt.SEP: {
        const inEnvironment = (delims[delims.length - 1].type === ENV)
        if ((token.input === "\\\\" || token.input === "\\cr") && inEnvironment) {
          calc += "; "
        } else {
          calc += (token.input === "&" && inEnvironment) ?  ", " : token.output
        }
        break
      }

      case tt.RIGHTBRACKET: {
        // TODO: Check for cases environment and convert to Hurmet IF, if possible
        const delim = delims.pop()
        calc = calc.replace(trailingSpaceRegEx, "")

        if (delim.type === FRAC || delim.type === TFRAC) {
          calc += delim.type === FRAC ? ") / (" : ")//("
          delims.push({ ch: ")", pos: calc.length - 1, type: PAREN });
          [str, waitingForUnbracedArg] = eatOpenBrace(str)

        } else if (delim.type === BINARY) {
          calc += ")("
          delims.push({ ch: ")", pos: calc.length - 1, type: PAREN });
          [str, waitingForUnbracedArg] = eatOpenBrace(str)

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
  calc = calc.replace(/\s+(?=[_^'′!,;)}\]〗])/g, "") // Delete spaces before right delims
  calc = calc.replace(/\s+$/, "") //                 Delete trailing space

  return calc
}
