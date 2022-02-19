import { isIn, addTextEscapes, unitTeXFromString, numeralFromSuperScript } from "./utils"
import { tt, lex, texFromNumStr } from "./lexer"
import { Rnl } from "./rational"

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
  "atan2", "atand", "atanh", "binomial", "chr", "cos", "cosd",
  "cosh", "cosh", "cot", "cotd", "coth", "coth", "count", "csc", "cscd", "csch", "csch", "exp",
  "fetch", "format", "gcd", "hypot", "isNaN", "length", "lerp", "ln", "log", "log10", "log2",
  "logFactorial", "logGamma", "logn", "logΓ", "matrix2table", "random", "rms", "round",
  "roundSig", "roundn", "sec", "secd", "sech", "sech", "sign", "sin", "sind", "sinh", "tan",
  "tand", "tanh", "tanh", "trace", "transpose", "zeros", "Γ"
]

const builtInReducerFunctions = ["dataframe",
  "lineChart", "max", "mean", "median", "min", "product", "range", "stddev", "sum", "variance"
]

const trigFunctions = ["cos", "cosd", "cot", "cotd", "csc", "cscd", "sec", "secd",
  "sin", "sind", "tand", "tan"]

const rationalRPN = numStr => {
  // Return a representation of a rational number that is recognized by evalRPN().
  const num = Rnl.fromString(numStr)
  return "®" + String(num[0]) + "/" + String(num[1])
}

const numberRegEx = new RegExp(Rnl.numberPattern)

const calligraphicRegEx = /^(:?\uD835[\uDC9C-\uDCCF]|[\udc9d\udca0\udca1\udca3\udca4\udca7\udca8\udcad\udcba\udcbc\udcc1\udcc4])/

const bmpCalligraphic = {
  "\u212C": "B",
  "\u2130": "E",
  "\u2131": "F",
  "\u210B": "H",
  "\u2110": "I",
  "\u2112": "L",
  "\u2133": "M",
  "\u211B": "R",
  "\u212F": "e",
  "\u210A": "g",
  "\u2113": "l",
  "\u2134": "o"
}

const assertCalligraphic = str => {
  // The Unicode code points for "fancy" letters do not distinguish between script
  // and calligraphic. Hurmet takes them to be calligraphic.
  // That currently comes naturally to MathML if the system font in use is Cambria Math.
  // For KaTeX HTML, we have to assert it, which we do here.
  // I may have to revisit this and also assert in MathML, depending on how
  // https://github.com/mathml-refresh/mathml/issues/61 is resolved.
  // I do not append \uFE00 as Murray Sargent proposes, at least not yet.
  // Ref: https://blogs.msdn.microsoft.com/murrays/2016/02/05/unicode-math-calligraphic-alphabets/
  const match = calligraphicRegEx.exec(str)
  if (!match) { return str }
  let ch = ""
  if (str.charAt(0) === "\uD835") {
    const codePoint = str.charCodeAt(1)
    ch = String.fromCharCode(codePoint - (codePoint <= 0xdcb5 ? 0xdc5b : 0xdc55))
  } else {
    // Characters in the Unicode Basic Multilingual Plane
    ch = bmpCalligraphic[str.charAt(0)]
  }
  return `\\mathcal{${ch}}` + str.slice(match[0].length)
}

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
    default:
    // do nothing
  }
  if (token.output === "-") {
    return { input: "~", output: "\\text{-}", ttype: tt.UNARYMINUS }
  } else {
    return { input: "+", output: "~+", ttype: tt.UNARYMINUS }
  }
}

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
}

const numFromSupChars = str => {
  let num = ""
  for (const ch of str) {
    num += numFromSuperChar[ch]
  }
  return num
}

const colorSpecRegEx = /^(#([a-f0-9]{6}|[a-f0-9]{3})|[a-z]+|\([^)]+\))/i

const dictSepRegEx = /^(?:′+ *)?:/

const factors = /^[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133\uD835[({√∛∜]/

const setUpIf = (rpn, tokenInput, exprStack, delim) => {
  // The Hurmet CASES expression acts lazily. To accommodate that, push the
  // sub-expression onto a stack of expressions. At the closing brace,
  // we'll pop all the expressions off the stack and place them after the conditions.
  // Later, evaluate.js will evaluate the conditions and then pick the correct expression.
  const expression = rpn.replace(/^.*\xa0/, "").replace(/§$/, "\xa0")
  exprStack.push(expression)
  rpn = rpn.length === expression.length ? "" : rpn.slice(0, rpn.length - expression.length)
  delim.numArgs += 1
  if (tokenInput === "otherwise") { rpn += "true" }
  return rpn
}

const functionExpoRegEx = /^[\^⁻⁰¹²³\u2074-\u2079]/

const openParenRegEx = /^ *\(/

const exponentOfFunction = (str, decimalFormat, isCalc) => {
  // As in: sin²()
  let expoInput = ""
  if (str.charAt(0) !== "^") {
    expoInput = /^[⁰¹²³\u2074-\u2079⁻]+/.exec(str)[0]
    expoInput = numeralFromSuperScript(expoInput)
  } else if (!openParenRegEx.test(str.slice(1))) {
    expoInput = lex(str.slice(1), decimalFormat, { input: "", output: "", ttype: 50 })[0]
  } else {
    // The exponent is in parens. Find its extent.
    expoInput = "("
    let level = 1
    for (let i = 2; i < str.length; i++) {
      const ch = str.charAt(i)
      expoInput += ch
      if ("\"'`".indexOf(ch) > -1) {
        const pos = str.indexOf(ch, i + 1)
        expoInput += str.slice(i + 1, pos + 1)
        i = pos
      } else if ("([{⟨\u2308\u23BF\u23BE\u3016".indexOf(ch) > -1) {
        level += 1
      } else if (")]}⟩\u2309\u230B\u23CC\u3017".indexOf(ch) > -1) {
        level -= 1
      }
      if (level === 0) { break }
    }
  }

  const parseInput = (expoInput.charAt(0) === "(")
    ? expoInput.slice(1, -1).trim()
    : expoInput

  if (isCalc) {
    const expoOutput = parse(parseInput, decimalFormat, true)
    return [expoInput, "{" + expoOutput[0] + "}", expoOutput[1]]
  } else {
    const expoTex = parse(parseInput, decimalFormat, false)
    return [expoInput, "{" + expoTex + "}", ""]
  }
}

const testForImplicitMult = (prevToken, texStack, str) => {
  // Some math expressions imply a multiplication without writing an explicit operator token.
  // Examples:  e = m c², y = 3(2+5), n = (a+5)x, z = 5 + 2i
  // Hurmet writes the echo expression with a more explicit written form of multiplication.
  // The echo shows each multiplication in one of three ways: a x b,  a · b, or (a)(b)
  // This sub is going to determine if such an adjustment is required for the current position.

  if (texStack.length > 0) {
    // Test for a tex unary function or a function w/ tt.SUP or tt.SUB
    const topType = texStack[texStack.length - 1].ttype
    if (topType === tt.UNARY || topType === tt.BINARY) { return false }
    if (topType === tt.SUB || topType === tt.SUP) {
      if (texStack[texStack.length - 1].isOnFunction) { return false }
    }
  }

  let isPreceededByFactor = false
  if (prevToken.output) {
    const pc = prevToken.output.charAt(prevToken.length - 1)
    if (")]}".indexOf(pc) > -1) {
      if ((pc === ")" || pc === "]") && /^[([]/.test(str)) {
        // This was already handled by the tt.RIGHTBRACKET case
        return false
      } else {
        isPreceededByFactor = true
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
          isPreceededByFactor = true
          break
        default:
          isPreceededByFactor = false
      }
    }
  }
  if (isPreceededByFactor && nextCharIsFactor(str, prevToken.ttype)) { return true }
  return false
}

const nextCharIsFactor = (str, tokenType) => {
  const st = str.replace(leadingLaTeXSpaceRegEx, "")
  const fc = st.charAt(0)

  let fcMeetsTest = false
  if (st.length > 0) {
    if (fc === "|" || fc === "‖") {
      // TODO: Work out left/right
    } else if (/^[({[√∛∜0-9]/.test(st) &&
      (isIn(tokenType, [tt.ORD, tt.VAR, tt.NUM, tt.LONGVAR, tt.RIGHTBRACKET,
        tt.CURRENCY, tt.SUPCHAR]))) {
      return true
    } else {
      if (factors.test(fc)) {
        fcMeetsTest = !/^(if|and|atop|or|else|modulo|otherwise|not|for|in|while|end)\b/.test(st)
      }
    }
  }
  return fcMeetsTest
}

const cloneToken = token => {
  return {
    input: token.input,
    output: token.output,
    ttype: token.ttype,
    closeDelim: token.closeDelim
  }
}

// The RegEx below is equal to /^\s+/ except it omits \n and the no-break space \xa0.
// I use \xa0 to precede the combining arrow accent character \u20D7.
export const leadingSpaceRegEx = /^[ \f\r\t\v\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/
const leadingLaTeXSpaceRegEx = /^(˽|\\quad|\\qquad)+/

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
]

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
]
/* eslint-enable indent-legacy */

/* Operator Precedence
TeX  RPN
  0    0    ( [ {        delimiters
  1    1    , ;  :       separators for arguments, elements, rows, and key:value pairs
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
const dNOTHING = 0
const dPAREN = 1 //           () or [] or {}, but not one of the use cases below
const dFUNCTION = 2 //        sin(x)
const dACCESSOR = 3 //        identifier[index] or identifier[start:step:end]
const dMATRIX = 4 //          [1; 2] or (1, 2; 3, 4) or {1, 2}
const dVECTORFROMRANGE = 5 // [start:end] or [start:step:end]
const dDICTIONARY = 6 //      { key:value, key:value } or { key:value; key:value }
const dCASES = 7 //           { a if b; c otherwise }
const dBINOMIAL = 8
const dSUBSCRIPT = 9 //       Parens around a subscript do not get converted into matrices.
const dDISTRIB = 10 //         A probability distribution defined by a confidence interval.

export const parse = (
  str,
  decimalFormat = "1,000,000.",
  isCalc = false,     // true when parsing the blue echo of an expression
  inRealTime = false  // true when updating a rendering with every keystroke in the editor.
) => {
  // Variable definitions
  let tex = ""
  let rpn = ""
  let token = {}
  let prevToken = { input: "", output: "", ttype: 50 }
  let mustLex = true
  let mustAlign = false
  let posOfPrevRun = 0
  let isPrecededBySpace = false
  let isFollowedBySpace = false
  let isFollowedBySpaceOrNewline = false
  let isImplicitMult = false
  let followedByFactor = false
  let op
  const texStack = [] // operator stack for TeX rendering
  const rpnStack = [] // operator stack for RPN
  const delims = [{ delimType: dNOTHING, isTall: false }] // delimiter stack
  let okToAppend = true
  let fc = ""
  let pendingFunctionName = ""
  let tokenSep = "\xa0" // no break space
  let rpnPrec = -1
  const exprStack = [] // Use for lazy evalulation of ternary (If) expressions

  // This function, parse(), is the main function for this module.
  // Before we get to the start line, we write two enclosed functions,
  // popRpnTokens() and popTexTokens().
  // They are placed here in order to share variable scope with parse().

  const popRpnTokens = rpnPrec => {
    if (isCalc && rpnPrec >= 0) {
      // Pop operators off the rpnStack and append them to the rpn string
      while (rpnStack.length > 0) {
        const topPrec = rpnStack[rpnStack.length - 1].prec
        //                         exponents, from right to left.
        if (topPrec < rpnPrec || (topPrec === 13 && rpnPrec === 13)) { break }
        rpn += rpnStack.pop().symbol + tokenSep
      }
    }
  }

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
        op = { pos: posOfPrevRun, ttype: prevToken.ttype, closeDelim: "" }
      }
      return
    }

    const topOp = texStack[texStack.length - 1]
    if (
      (texPrec === 2 || texPrec === 12  || texPrec === 14 || texPrec === 15) &&
      (prevToken.ttype !== tt.RIGHTBRACKET && prevToken.ttype !== tt.LEFTRIGHT) &&
      topOp.prec < texPrec
    ) {
      op = { pos: posOfPrevRun, ttype: prevToken.ttype, closeDelim: "" }
      return
    }

    //  Pop operators whose precedence ≥ texPrec. Append a close delimiter for each.
    let delim = {}
    while (texStack[texStack.length - 1].prec >= texPrec &&
      // Also handle exponents, from right to left, as in 3^4^5
      !(texStack[texStack.length - 1].prec === 13 && texPrec === 13)) {
      op = texStack.pop()

      // Before we append braces, check if we must hide a pair of parens.
      if (op.prec === 0) {
        // We just popped a delimiter operator.
        delim = delims[delims.length - 1]
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
                tex = tex.substring(0, op.pos) + "\\middle" + tex.substring(op.pos)
                delims[delims.length - 1].isTall = true
              }
              // Pop another delim.
              op = texStack.pop()
              delims.pop()
              delim = delims[delims.length - 1]
            }
          }

          if (delim.delimType === dDICTIONARY && delim.open.length > 3) {
            tex = tex.slice(0, op.pos) + delim.open + tex.slice(op.pos + 2)
            op.closeDelim = delim.close
          } else if (delim.delimType === dMATRIX) {
            const inc = tex.slice(op.pos, op.pos + 1) === "\\" ? 2 : 1
            tex = tex.slice(0, op.pos) + delim.open + tex.slice(op.pos + inc)
            op.closeDelim = delim.close
          } else if (delim.delimType === dCASES) {
            tex = tex.slice(0, op.pos) + delim.open + tex.slice(op.pos + 2)
            op.closeDelim = delim.close
          } else if (delim.delimType === dPAREN &&
            delim.name === "(" && /^(\/|\\atop\s)/.test(str)) {
            // The parens surround a numerator. Delete them.
            tex = tex.substring(0, op.pos) + tex.substring(op.pos + 1)
            op.closeDelim = ""
          } else if (delim.isPrecededByDiv && delim.delimType === dPAREN &&
              delim.name === "(" && (/^[^^_!%°⁻²³¹⁰⁴⁵⁶⁷⁸⁹]/.test(str) || str.length === 0)) {
            // The parens surround a denominator. Delete them.
            tex = tex.substring(0, op.pos) + tex.substring(op.pos + 1)
            op.closeDelim = ""
          } else if (delim.isTall) {
            // Make the delims tall.
            if (/^\\left/.test(tex.substring(op.pos)) === false) {
              tex = tex.substring(0, op.pos) + "\\left" + tex.substring(op.pos)
            }
            if (/\\right/.test(op.closeDelim) === false) {
              op.closeDelim = "\\right" + token.output
            }
          }
        }
      }

      tex = tex.replace(/\\, *$/, "") // Remove an implicit multiplication space.
      tex += op.closeDelim

      if (op.closeDelim.slice(-1) === "{") {
        // We just closed the first part of a binary function, e.g. root()(),
        // or a function exponent (sin^2 θ) or function subscript (log_10)
        if (op.ttype === tt.BINARY) {
          texStack.push({ prec: 12, pos: op.pos, ttype: tt.UNARY, closeDelim: "}" })
          if (isCalc) {
            rpn += tokenSep
            if (rpnStack[rpnStack.length - 1].symbol === "\\sqrt") {
              rpnStack[rpnStack.length - 1].symbol = "root"
            }
          }
        }
        op.ttype = tt.UNARY
        prevToken = { input: "", output: "", ttype: tt.UNARY }
        return
      }

      if (texStack.length === 0 || op.prec === 0) {
        return
      }
    }
  }

  // With the closed functions out of the way, execute the main parse loop.
  str = str.replace(leadingSpaceRegEx, "") //       trim leading white space from string
  str = str.replace(/\s+$/, "") //                  trim trailing white space

  while (str.length > 0) {
    // Get the next token.
    if (str.charAt(0) === "\n") {
      str = str.slice(1)
      const prevChar = prevToken ? prevToken.input.slice(-1) : "0"
      if (
        prevToken.ttype === tt.COMMENT ||
        ("{[(,;+-".indexOf(prevChar) === -1 && !/^ *[)}\]]/.test(str))
      ) {
        popTexTokens(0, true)
        tex += "\\\\ "
        const matchObj = /^ +/.exec(str)
        str = str.replace(/^ */, "")
        if (str.length > 0 && str.charAt(0) === "=" & tex.indexOf("=") > -1) {
          mustAlign = true // We'll use the TeX {aligned} environment to align = signs.
          tex += "&"
        } else if (matchObj) {
          tex += "\\quad ".repeat(matchObj[0].length - 1)
        }
      }
      str = str.trim()
    }

    mustLex = true // default

    isImplicitMult = isPrecededBySpace && okToAppend &&
      testForImplicitMult(prevToken, texStack, str)
    if (isImplicitMult) {
      const prevType = prevToken.ttype
      token = {
        input: "⌧",
        output: prevType === tt.LONGVAR || prevType === tt.NUM ? "\\," : "",
        ttype: tt.MULT
      }
      isFollowedBySpace = false
      isFollowedBySpaceOrNewline = false
      mustLex = false
    }

    if (mustLex) {
      const tkn = lex(str, decimalFormat, prevToken, inRealTime)
      token = { input: tkn[0], output: tkn[1], ttype: tkn[2], closeDelim: tkn[3] }
      str = str.substring(token.input.length)
      isFollowedBySpace = leadingSpaceRegEx.test(str) || /^(˽|\\quad|\\qquad)+/.test(str)
      isFollowedBySpaceOrNewline = /^[ \n]/.test(str)
      str = str.replace(leadingSpaceRegEx, "")
      followedByFactor = nextCharIsFactor(str, token.ttype)
    }

    switch (token.ttype) {
      case tt.SPACE: //      spaces and newlines
      case tt.BIN: //        infix math operators that render but don't calc, e.g. \bowtie
      case tt.ADD: //        infix add/subtract operators, + -
      case tt.MULT: //       infix mult/divide operators, × * · // ÷
      case tt.REL: //        relational operators, e.g  < →
      case tt.UNDEROVER: { // int, sum, lim, etc
        if (token.output.length > 0 && "- +".indexOf(token.output) > -1) {
          token = checkForUnaryMinus(token, prevToken)
        }

        if (isCalc && token.ttype !== tt.SPACE) {
          if (token.output !== "\\text{-}") { rpn += tokenSep }
          rpnPrec = rpnPrecFromType[token.ttype]
          popRpnTokens(rpnPrec)
        }

        const texPrec = texPrecFromType[token.ttype]
        popTexTokens(texPrec, okToAppend)
        tex += token.output + " "
        posOfPrevRun = tex.length

        if (token.ttype === tt.UNDEROVER && delims.length > 1) {
          delims[delims.length - 1].isTall = true
        } else if (isCalc) {
          rpnStack.push({ prec: rpnPrec, symbol: token.input })
        }

        okToAppend = true
        break
      }

      case tt.ACCESSOR:  //   dot between a dictionary name and a property, as in r.PROPERTY
      case tt.ANGLE:    // \angle. Used as a separator for complex numbers in polar notation
        token = checkForUnaryMinus(token, prevToken)
        if (isCalc) {
          rpn += tokenSep
          rpnPrec = rpnPrecFromType[token.ttype]
          popRpnTokens(rpnPrec)
          rpnStack.push({ prec: rpnPrec, symbol: token.input })
        }
        popTexTokens(texPrecFromType[token.ttype], okToAppend)
        tex += isCalc ? token.input : token.output + " "
        okToAppend = true
        break

      case tt.NUM:
      case tt.ORD:
        // Numbers and ORDs get appended directly onto rpn. Pass -1 to suppress an rpn pop.
        popTexTokens(2, okToAppend)
        if (isCalc) {
          popRpnTokens(-1)
          rpn += token.ttype === tt.NUM ? rationalRPN(token.input) : token.input
        }
        if (isPrecededBySpace) { posOfPrevRun = tex.length }
        if (isCalc &&
          (prevToken.ttype === tt.MULT || (followedByFactor && prevToken.ttype !== tt.DIV))) {
          token.output = "(" + token.output + ")"
        }
        tex += token.output + " "
        okToAppend = true

        if (!isFollowedBySpace && followedByFactor) {
          // We've encountered something like the expression "2a".
          popTexTokens(2, okToAppend)
          if (isCalc) {
            rpn += tokenSep
            popRpnTokens(7)
            rpnStack.push({ prec: rpnPrecFromType[tt.MULT], symbol: "⌧" })
          }
        }
        break

      case tt.STRING: {
        popTexTokens(2, okToAppend)
        const ch = token.input.charAt(0)
        if (isCalc) { rpn += ch + token.output + ch }  // Keep before addTextEscapes()
        if (isPrecededBySpace) { posOfPrevRun = tex.length }
        token.output = addTextEscapes(token.output)
        token.output = token.output.replace(/ +$/, "\\,") // Prevent loss of trailing space
        tex += "\\text{" + token.output + "}"
        okToAppend = true
        break
      }

      case tt.RICHTEXT: {
        popTexTokens(2, okToAppend)
        const ch = token.input.charAt(0)
        if (isCalc) { rpn += ch + token.output + ch }
        if (isPrecededBySpace) { posOfPrevRun = tex.length }
        token.output = parse(token.output, decimalFormat, false)
        tex += "{" + token.output + "}"
        okToAppend = true
        break
      }

      case tt.DATAFRAME:
        popTexTokens(2, okToAppend)
        posOfPrevRun = tex.length
        tex += token.output
        okToAppend = true
        break

      case tt.VAR:         // variable name, one letter long
      case tt.LONGVAR: {   // multi-letter variable name
        if (token.ttype === tt.LONGVAR && prevToken.input === "⌧") {
          tex += "\\," // Place a space before a long variable name.
        }
        // variables get appended directly onto rpn.
        popTexTokens(7, okToAppend)
        if (isPrecededBySpace) { posOfPrevRun = tex.length }

        let isKey = false
        if (dictSepRegEx.test(str)) {
          const topDelim = delims[delims.length - 1]
          if (topDelim.delimType === dDICTIONARY
              || (topDelim.delimType === dPAREN && topDelim.name === "{")) {
            isKey = true
          }
        }
        token.output = assertCalligraphic(token.output)

        if (!isCalc) {
          if (token.ttype === tt.LONGVAR || isKey) {
            token.output = "\\mathrm{" + token.output + "}"
          }
        } else if (prevToken.input === "for") {
          rpn += '"' + token.input + '"' // a loop index variable name.
        } else if (isKey) {
          token.output = "\\mathrm{" + token.output + "}"
          rpn += `"${token.input}"`
        } else {
          // We're in the echo of a Hurmet calculation.
          if (/^[.[]/.test(str)) {
            // When the blue echo has an index in a bracket, e.g., varName[indes], it renders
            // the name of the variable, not the value. The value of the value of the index.
            token.output = token.ttype === tt.LONGVAR
              ? "\\mathrm{" + token.output + "}"
              : token.output
          } else {
            token.output = token.input
            token.output = "〖" + token.output
          }
          rpn += "¿" + token.input
        }

        tex += token.output + (str.charAt(0) === "." ? "" : " ")
        if (isCalc) {
          // The variable's value may be tall. We don't know.
          delims[delims.length - 1].isTall = true
        }
        okToAppend = true
        break
      }

      case tt.UNIT: {  //  e.g.  'meters'
        popTexTokens(14, true)
        texStack.push({ prec: 14, pos: op.pos, ttype: tt.UNIT, closeDelim: "" })
        if (isCalc) {
          popRpnTokens(14)
          rpn += tokenSep + "applyUnit" + tokenSep + token.input.replace(/'/g, "")
        }
        if (token.input !== "°") { tex += "\\," }
        tex += token.output
        okToAppend = true
        break
      }

      case tt.PROPERTY: {
        // A word after a dot ACCESSOR operator. I.e., A property in dot notation
        // Treat somewhat similarly to tt.STRING
        popTexTokens(15, okToAppend)
        if (isCalc) {
          if (/\xa0\[\]\xa01\xa0$/.test(rpn)) {
            // Compiler magic so that varName[prop1].prop2 parses as varName[prop1, "prop2"]
            rpn = rpn.slice(0, -5) + '"' + token.output + '"\xa0[]\xa02'
            rpnStack.pop()
          } else {
            rpn += '"' + token.output + '"'
          }
        }
        const pos = token.input.indexOf("_")
        if (isCalc) {
          tex += `\\mathrm{${token.output}}`
          if (str.charAt(0) !== ".") { tex += " " }
        } else if (pos > -1) {
          tex += token.input.substring(0, pos) + "_\\mathrm{" +
            token.input.substring(pos + 1) + "}"
        } else {
          token.output = addTextEscapes(token.output)
          token.output = token.output.replace(/ +$/, "\\,") // Prevent loss of trailing space
          tex += "\\text{" + token.output + "}"
        }
        okToAppend = true
        break
      }

      case tt.TO: {
        // A probability distribution defined by its low and high values.
        // As in: (2 to 3) or [2 to 3] or {2 to 3}
        delims[delims.length - 1].delimType = dDISTRIB
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length
        tex += token.output
        if (isCalc) {
          rpn += tokenSep
          popRpnTokens(3)
          const symbol = delims[delims.length - 1].symbol
          const distribution = symbol === "("
            ? "normal"
            : symbol === "["
            ? "uniform"
            : "lognormal"
          rpnStack.push({ prec: 3, symbol: distribution })
        }
        break
      }

      case tt.COLON: {
        //   range separator, as in 1:n, or key:value separator
        let isKeyValueSeparator = false
        const topDelim = delims[delims.length - 1]
        if (topDelim.delimType === dDICTIONARY) {
          isKeyValueSeparator = true
        } else if (topDelim.delimType === dPAREN && topDelim.name === "{") {
          topDelim.delimType = dDICTIONARY
          isKeyValueSeparator = true
        } else if (topDelim.delimType === dPAREN && topDelim.name === "[")  {
          topDelim.delimType = dVECTORFROMRANGE
        }
        rpnPrec = isKeyValueSeparator ? 1 : 3

        if (isCalc) {
          rpn += tokenSep
          popRpnTokens(rpnPrec)
        }
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length

        if (isCalc) {
          rpnStack.push({ prec: rpnPrec, symbol: isKeyValueSeparator ? ":" : ".." })
          if (str.charAt(0) === "]" && !isKeyValueSeparator) {
            rpn += '"∞"' // slice of the form: identifier[n:]
          }
        }
        tex += isKeyValueSeparator ? "\\mathpunct{:}" : token.output
        break
      }

      case tt.DIV:  //  / or \atop
        if (isCalc) { rpn += tokenSep }
        popTexTokens(2, true)
        popRpnTokens(7)
        if (token.input === "//") {
          // case fraction
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}" })
          tex = tex.substring(0, op.pos) + "\\tfrac{" + tex.substring(op.pos) + "}{"
        } else if (token.input === "/" || token.input === "\\over") {
          // displaystyle fraction
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}" })
          tex = tex.substring(0, op.pos) + "\\dfrac{" + tex.substring(op.pos) + "}{"
        } else {
          // atop, for binomials
          texStack.push({ prec: 2, pos: op.pos, ttype: tt.DIV, closeDelim: "}}" })
          tex = tex.substring(0, op.pos) + "{{" + tex.substring(op.pos) + "}\\atop{"
          if (delims[delims.length - 1].name === "(") {
            delims[delims.length - 1].delimType = dBINOMIAL
          }
        }
        if (isCalc) {
          if (token.input === "\\atop") {
            if (delims[delims.length - 1].delimType === dBINOMIAL) {
              rpnStack.push({ prec: 7, symbol: "()" })
            }
          } else {
            rpnStack.push({ prec: 7, symbol: token.input })
          }
        }
        delims[delims.length - 1].isTall = true
        posOfPrevRun = tex.length
        okToAppend = false
        break

      case tt.SUB: { // _
        popTexTokens(15, true)
        const subCD = prevToken.ttype === tt.FUNCTION ? "}{" : "}"
        texStack.push({ prec: 15, pos: op.pos, ttype: tt.SUB, closeDelim: subCD })
        tex += "_{"
        if (isCalc) { rpn += "_" }
        okToAppend = false
        break
      }

      case tt.SUP: // ^
        if (isCalc) {
          if (/¿e$/.test(rpn)) {
            // e^3. Replace e with 2.7182818284590452353602874713527
            // eslint-disable-next-line max-len
            rpn = rpn.slice(0, -2) + "®27182818284590452353602874713527/10000000000000000000000000000000"
          }
          rpn += tokenSep
          popRpnTokens(13)
        }
        popTexTokens(13, true)
        if (prevToken.ttype === tt.RIGHTBRACKET) {
          texStack.push({ prec: 13, pos: op.pos, ttype: tt.SUP, closeDelim: "}" })
        } else {
          texStack.push({ prec: 13, pos: posOfPrevRun, ttype: tt.SUP, closeDelim: "}" })
        }
        if (isCalc) { rpnStack.push({ prec: 13, symbol: "^" }) }
        tex += "^{"
        okToAppend = false
        break

      case tt.SUPCHAR: { //  ²³¹⁰⁴⁵⁶⁷⁸⁹⁻
        if (isCalc) {
          if (/¿e$/.test(rpn)) {
            // e^3. Replace e with 2.7182818284590452353602874713527
            // eslint-disable-next-line max-len
            rpn = rpn.slice(0, -2) + "®27182818284590452353602874713527/10000000000000000000000000000000"
          }
          rpn += tokenSep
          popRpnTokens(13)
        }
        popTexTokens(13, true)
        const supNum = numFromSupChars(token.output)
        if (prevToken.ttype === tt.RIGHTBRACKET) {
          texStack.push({ prec: 13, pos: op.pos, ttype: tt.SUP, closeDelim: "}" })
        } else {
          texStack.push({ prec: 13, pos: posOfPrevRun, ttype: tt.SUP, closeDelim: "}" })
        }
        tex += "^{" + supNum
        if (isCalc) {
          rpnStack.push({ prec: 13, symbol: "^" })
          rpn += rationalRPN(supNum)
        }
        okToAppend = true
        break
      }

      case tt.FUNCTION: { // e.g. sin or tan,  shows parens
        popTexTokens(2, okToAppend)
        posOfPrevRun = tex.length
        // Is there an exponent on the function name?
        if (functionExpoRegEx.test(str)) {
          const [expoInput, expoTex, expoRPN] = exponentOfFunction(str, decimalFormat, isCalc)
          if (isCalc && expoRPN === `®1/1${tokenSep}~` && isIn(token.input, trigFunctions)) {
            // Inverse trig function.
            token.input = "a" + token.input
            token.output = "\\a" + token.output.slice(1)
          } else {
            if (isCalc) { token.input += tokenSep + expoRPN + tokenSep + "^" }
            token.output += "^" + expoTex
          }
          const L = expoInput.length + (str.charAt(0) === "^" ? 1 : 0)
          str = str.slice(L).trim()
        }
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: token.input })
          if (prevToken.input === "⌧") { tex += "×" }
        }
        fc = str.charAt(0)
        texStack.push({
          prec: 12,
          pos: tex.length,
          ttype: tt.FUNCTION,
          closeDelim: fc === "(" ? "" : "}"
        })
        tex += token.output
        tex += fc === "(" ? "" : "{"
        pendingFunctionName = token.input
        okToAppend = false
        break
      }

      case tt.ACCENT:
        if (isCalc) {
          rpn += tokenSep
          popRpnTokens(16)
        }
        popTexTokens(1, okToAppend)

        if (isCalc) {
          texStack.push({ prec: 16, pos: tex.length, ttype: tt.ACCENT, closeDelim: "〗" })
          tex += "〖" + token.input
          rpn += "¿" + token.input
        } else {
          texStack.push({ prec: 16, pos: tex.length, ttype: tt.ACCENT, closeDelim: "}" })
          tex += token.output + "{"
        }

        delims[delims.length - 1].isTall = true
        okToAppend = false
        break

      case tt.PRIME:
        popTexTokens(15, true)
        if (isCalc) {
          const topDelimType = delims[delims.length - 1].delimType
          const isAccessor = rpnStack.length > 0 &&
                             rpnStack[rpnStack.length - 1].symbol === "."
          if (isAccessor || (topDelimType === dDICTIONARY && rpn.length > 0 &&
              rpn.charAt(rpn.length - 1) === '"' && str.length > 0 && str.charAt(0) === ":")) {
            // prevToken is a dictionary key that the user wrote w/o surrounding quote marks.
            // The quote marks were appended above. Slip the prime into the string.
            rpn = rpn.slice(0, -1) + token.input + '"'
          } else {
            rpn += token.input
          }
        }
        tex = tex.trim() + token.output + " "
        okToAppend = true
        break

      case tt.BINARY: { // e.g. root(3)(x)
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length
        const binCD = token.input === "root" ? "]{" : "}{"
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.BINARY, closeDelim: binCD })
        if (isCalc) { rpnStack.push({ prec: 12, symbol: token.output }) }
        tex += token.output + (token.input === "root" ? "[" : "{")
        delims[delims.length - 1].isTall = true
        okToAppend = false
        break
      }

      case tt.CURRENCY: {  // e.g. $, £, etc
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.CURRENCY, closeDelim: "" })
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: "applyUnit" + tokenSep + token.input })
          if (prevToken.input === "⌧") { tex += "×" }
        }
        tex += token.output
        okToAppend = false
        break
      }

      case tt.UNARY: // e.g. bb, hat, or sqrt, or xrightarrow, hides parens
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length
        texStack.push({ prec: 12, pos: tex.length, ttype: tt.UNARY, closeDelim: "}" })
        if (isCalc) {
          rpnStack.push({ prec: 12, symbol: token.input })
          if (prevToken.input === "⌧") { tex += "×" }
        }
        tex += token.output

        if (/det|inf/.test(token.input) && str.charAt(0) === "_") {
          texStack.push({ prec: 15, pos: tex.length, ttype: tt.SUB, closeDelim: "}" })
          token = { input: "_", output: "_", ttype: tt.SUB }
          tex += "_{"
          str = str.substring(1)
          str = str.replace(/^\s+/, "")
        } else if (token.input === "\\color") {
          const colorMatch = colorSpecRegEx.exec(str)
          if (colorMatch) {
            tex += "{" + colorMatch[0].replace(/[()]/g, "") + "}"
            texStack.pop()
            str = str.slice(colorMatch[0].length).trim()
          } else {
            // User is in the middle of writing a color spec. Avoid an error message.
            tex += "{"
          }
        } else {
          tex += "{"
        }
        delims[delims.length - 1].isTall = true
        okToAppend = false
        break

      case tt.FACTORIAL:
        popTexTokens(14, true)
        texStack.push({ prec: 14, pos: op.pos, ttype: tt.FACTORIAL, closeDelim: "" })
        if (isCalc) {
          popRpnTokens(14)
          rpn += tokenSep + token.output
        }
        tex += token.output
        okToAppend = true
        break

      case tt.RETURN:
        // Special treatment in order to enable user-defined functions.
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length
        if (isCalc) {
          popRpnTokens(4)
          rpnStack.push({ prec: 4, symbol: "return" })
        }
        tex += token.output + " "
        break

      case tt.KEYWORD:
        // Either "for", "in", "while", or "break"
        popTexTokens(1, true)
        posOfPrevRun = tex.length
        if (isCalc) {
          popRpnTokens(2)
          if (token.input === "in") {
            rpn += tokenSep
            rpnStack.push({ prec: rpnPrec, symbol: "for" })
          }
        }
        tex += token.output + " "
        break

      case tt.LOGIC: {
        // logic words: if and or otherwise
        popTexTokens(1, okToAppend)
        if (isCalc) { rpn += tokenSep }
        popRpnTokens(4)
        const topDelim = delims[delims.length - 1]
        if (token.input === "if" || token.input === "otherwise") {
          if (topDelim.delimType === dPAREN && topDelim.name === "{") {
            // Change the enclosing delim pair to a CASES expression.
            topDelim.delimType = dCASES
            topDelim.close = "\\end{cases}"
            topDelim.open = "\\begin{cases}"
            // In order to get lazy evaluation of a CASES, we will have to move the
            // expressions after the conditions. Temporarily change the token separator.
            if (isCalc && tokenSep === "\xa0" && token.input === "if") {
              // Change the token separators in the preceding RPN.
              rpn = rpn.slice(0, topDelim.rpnPos) +
                rpn.slice(topDelim.rpnPos).replace(/\xa0/g, "§")
            }
          }
        }
        if (topDelim.delimType === dCASES && isIn(token.input, ["if", "otherwise"])) {
          tex += "&"
        }
        tex += token.output
        if (isCalc) {
          if (topDelim.delimType === dCASES &&
            (token.input === "if" || token.input === "otherwise")) {
            // We're in an If Expression and we just reached the end of an expression.
            rpn = setUpIf(rpn, token.input, exprStack, topDelim)
            tokenSep = "\xa0"
          } else {
            rpnStack.push({ prec: 4, symbol: token.input })
          }
        }
        posOfPrevRun = tex.length
        okToAppend = true
        break
      }

      case tt.LEFTBRACKET: {
        popTexTokens(2, okToAppend)
        const isPrecededByDiv = prevToken.ttype === tt.DIV
        let isFuncParen = false

        const texStackItem = {
          prec: 0,
          pos: tex.length,
          ttype: tt.LEFTBRACKET,
          closeDelim: token.closeDelim
        }

        if ((token.input === "(" || token.input === "[") && prevToken.ttype < 5) {
          // The delimiters are here to delimit a TeX function extent.
          // Make the delimiters invisible.
          texStackItem.closeDelim = ""
        } else if (token.input === "(" && op.ttype === tt.BINARY) {
          texStackItem.closeDelim = ""
        } else {
          texStackItem.closeDelim = token.closeDelim
          isFuncParen = (token.input === "(" || token.input === "[") &&
            prevToken.ttype === tt.FUNCTION
          tex += token.output
        }
        texStack.push(texStackItem)

        if (isCalc) {
          while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].symbol === ".") {
            rpn += tokenSep + rpnStack.pop().symbol
          }
          rpnStack.push({ prec: 0, symbol: token.output.trim() })
        }

        const numArgs = /^\s*[)}\]]/.test(str) ? 0 : 1

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
        }

        if (isFuncParen) {
          delim.delimType = dFUNCTION
          delim.name = pendingFunctionName
        } else if (prevToken.ttype === tt.SUB) {
          delim.delimType = dSUBSCRIPT
          delim.name = "("
        } else if (token.input === "{") {
          // This may change to a dDICTIONARY or a CASES.
          delim.delimType = dPAREN
          delim.rpnLength = rpn.length
        } else if (token.input === "[" &&
            (isIn(prevToken.ttype, [tt.VAR, tt.LONGVAR, tt.STRING, tt.PROPERTY]) ||
            prevToken.input === "]")) {
          rpn += tokenSep
          delim.delimType = dACCESSOR
        } else {
          // This may change to a MATRIX, but for now we'll say it's a paren.
          delim.delimType = dPAREN
          delim.name = token.input
        }
        delims.push(delim)

        pendingFunctionName = ""
        posOfPrevRun = tex.length
        okToAppend = false
        break
      }

      case tt.SEP: {
        // Either a comma or a semi-colon. Colons are handled elsewhere.
        popTexTokens(1, okToAppend)
        posOfPrevRun = tex.length

        if (token.input === "\\," || token.input === "\\;") {
          // escape characters that enable commas in a non-matrix paren.
          tex += token.output + " "
        } else {
          const delim = delims[delims.length - 1]
          if (delim.delimType === dPAREN && isFollowedBySpaceOrNewline) {
            if (token.input === "," && delim.name === "{") {
              delim.delimType = dDICTIONARY
            } else {
              delim.delimType = delim.name === "{" ? dDICTIONARY : dMATRIX
              const ch = delim.name === "["
                ? "b"
                : delim.name === "("
                ? "p"
                : delim.name === "{:"
                ? ""
                : "B"
              delim.open = `\\begin{${ch}matrix}`
              delim.close = `\\end{${ch}matrix}`
              delim.isTall = true
              token.output = token.input === "," ? "&" : "\\\\"
            }
          } else if (delim.delimType === dMATRIX && token.input === ",") {
            token.output = "&"
          } else if (delim.delimType === dDICTIONARY && token.input === ";") {
            token.output = "\\\\"
            if (!delim.open.length < 5) {
              delim.open = "\\left\\{\\begin{array}{l}"
              delim.close = "\\end{array}\\right\\}"
              delim.isTall = true
            }
          } else if (delim.delimType > 3 && token.input === ";") {
            token.output = "\\\\"
          }
          if (isCalc) {
            if (prevToken.ttype === tt.LEFTBRACKET && delim.delimType === dACCESSOR) {
              rpn += "®0/1"
            }
            rpn += tokenSep
            popRpnTokens(1)
          }

          tex += token.output + " "

          if (isCalc) {
            if (delims.length === 1) {
              rpn += token.output

            } else {
              if (token.input === ";") {
                delim.numRows += 1
                if (delims.length > 0 && delim.delimType === dCASES) {
                // We're about to begin an expression inside an If Expression.
                // Temporarily change the token separator.
                  tokenSep = "§"
                }
              }

              if (delim.numRows === 1) {
                if (token.input === ","  ||
                    (token.input === " " && (delim.delimType === dMATRIX))) {
                  if (str.charAt(0) === "]") { rpn += "®0/1" }
                }
              }
              delim.numArgs += 1
            }
          }
        }
        okToAppend = true
        break
      }

      case tt.RIGHTBRACKET: {
        popTexTokens(0, true, token.output)
        const topDelim = delims.pop()

        if (topDelim.delimType === dPAREN && (!topDelim.isControlWordParen)
            && topDelim.close !== token.output) {
          // Enable unmatched delims, such as (1.2] or |ϕ⟩
          tex = tex.slice(0, -1 * topDelim.close.length) + token.output
        }

        if (topDelim.isTall && delims.length > 1) {
          // If the inner parens are tall, then the outer parens must also be tall.
          delims[delims.length - 1].isTall = true
        }

        if (isCalc) {
          while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].prec > 0) {
            rpn += tokenSep + rpnStack.pop().symbol
          }
          if (topDelim.delimType === dCASES && prevToken.input !== "otherwise") {
            // "otherwise" is optional. We've just found a case where it is omitted.
            // So run function setUpIf as if "otherwise" were present.
            rpn = setUpIf(rpn, "otherwise", exprStack, topDelim)
            tokenSep = "\xa0"
          }
          const rpnOp = rpnStack.pop()
          const numArgs = topDelim.numArgs
          const numRows = topDelim.numRows
          const numCols = topDelim.numArgs / topDelim.numRows

          const firstSep = numArgs === 0 ? "" : tokenSep

          switch (topDelim.delimType) {
            case dFUNCTION: {
              let symbol = rpnStack.pop().symbol
              const regEx = new RegExp(tokenSep + '!$')
              if (numArgs === 2) {
                if (symbol === "log") { symbol = "logn" }
                if (symbol === "round") { symbol = "roundn" }
                if (symbol === "atan") { symbol = "atan2" }
              } else if (symbol === "log" && regEx.test(rpn)) {
                rpn = rpn.slice(0, rpn.length - 1) + "logFactorial"
                break
              }
              rpn += (symbol.slice(-1) === "^")
                ? firstSep + symbol
                : isIn(symbol, builtInFunctions)
                ? firstSep + symbol
                : isIn(symbol, builtInReducerFunctions)
                ? firstSep + symbol + tokenSep + numArgs
                : firstSep + "function" + tokenSep + symbol + tokenSep + numArgs
              break
            }

            case dACCESSOR:
              // This is the end of a […] following a variable name.
              rpn += firstSep + "[]" + tokenSep + numArgs
              break

            case dMATRIX:
              rpn += firstSep + "matrix" + tokenSep + numRows + tokenSep + numCols
              break

            case dCASES:
              tokenSep = "\xa0"
              rpn += tokenSep + "cases" + tokenSep + numRows + tokenSep
              while (exprStack.length > 0) {
                // Append the expressions that correspond to each condition.
                rpn += exprStack.shift()
              }
              rpn = rpn.slice(0, -1)
              break

            case dDICTIONARY:
              rpn += firstSep + "dictionary" + tokenSep + numArgs
              break

            case dVECTORFROMRANGE:
              // [start:step:end]
              rpn += tokenSep + "matrix" + tokenSep + "1" + tokenSep + "1"
              break

            case dDISTRIB:
              // (bottom to top)
              // Do nothing. This is handled by tt.TO above.
              break

            default:
              if (numArgs === 0 && topDelim.open === "[") {
                // Treat as an empty matrix
                rpn += "matrix" + tokenSep + 0 + tokenSep + 0
              } else if (numArgs === 1 && topDelim.open === "[") {
                rpn += tokenSep + "matrix" + tokenSep + 1 + tokenSep + 1
              }
              if (rpnOp.symbol === "\\lfloor") { rpn += tokenSep + "⎿⏌" }
              if (rpnOp.symbol === "\\lceil") { rpn += tokenSep + "⎾⏋" }
          }
          if ((token.input === ")" && nextCharIsFactor(str, tt.RIGHTBRACKET)) ||
            (token.input === "]" && /^\(/.test(str))) {
            // Implicit multiplication between parens, as in (2)(3)
            // Not between square brackets, as in dict[row][property]
            rpn += tokenSep
            popRpnTokens(rpnPrecFromType[tt.MULT])
            rpnStack.push({ prec: rpnPrecFromType[tt.MULT], symbol: "⌧" })
            isFollowedBySpace = false
          }
        }

        posOfPrevRun = tex.length
        okToAppend = op.ttype !== tt.BINARY
        break
      }

      case tt.LEFTRIGHT: {
        // A "|" or "‖" character, which are used as |x|, ‖M‖,  P(A|B),  {x|x ∈ℝ}, |ϕ⟩
        popTexTokens(1, okToAppend)
        const topDelim = delims[delims.length - 1]

        let isRightDelim = false
        if (texStack.length > 0) {
          isRightDelim =
            texStack[texStack.length - 1].ttype === tt.LEFTRIGHT ||
            texStack[texStack.length - 1].closeDelim === "\u27E9" || // Dirac ket
            texStack[texStack.length - 1].closeDelim === "\\right." ||
            texStack[texStack.length - 1].closeDelim === "\\end{vmatrix}"
        }
        if (isRightDelim) {
          // Treat as a right delimiter
          topDelim.close = token.input === "|" ? "\\vert " : "\\vert "
          texStack[texStack.length - 1].closeDelim = topDelim.close
          popTexTokens(0, okToAppend)
          delims.pop()
          if (isCalc) {
            while (rpnStack.length > 0 && rpnStack[rpnStack.length - 1].prec > 0) {
              rpn += tokenSep + rpnStack.pop().symbol
            }
            rpn += tokenSep + rpnStack.pop().symbol
          }
          okToAppend = op.ttype !== tt.BINARY
        } else if (topDelim.delimType === dPAREN && topDelim.name === "{") {
          tex += "\\mid "
          posOfPrevRun = tex.length
          okToAppend = true
        } else {
          // Treat as a left delimiter
          texStack.push({
            prec: 0,
            pos: tex.length,
            ttype: tt.LEFTRIGHT,
            closeDelim: token.input === "|" ? "\\vert " : "\\vert "
          })

          delims.push({
            delimType: dPAREN,
            name: token.input,
            isTall: false,
            open: token.input === "|" ? "\\vert " : "\\vert ",
            close: token.input === "|" ? "\\vert " : "\\vert ",
            numArgs: 1,
            numRows: 1,
            rpnPos: rpn.length,
            isPrecededByDiv: prevToken.ttype === tt.DIV
          })

          if (isCalc) {
            rpnStack.push({ prec: 0, symbol: token.output })
          }

          tex += token.input === "|" ? "\\vert " : "\\vert "
          posOfPrevRun = tex.length
          okToAppend = false
        }
        break
      }

      case tt.COMMENT:
        popTexTokens(0, true)
        tex += token.output + " "
        break

      default:
        if (isCalc) {
          rpn += tokenSep
          popRpnTokens(12)
        }
        popTexTokens(1, okToAppend)
        texStack.push({ prec: 1, pos: tex.length, ttype: tt.ORD, closeDelim: "" })
        if (isCalc) { rpnStack.push({ prec: 12, symbol: token.output }) }
        tex += token.output + " "
        posOfPrevRun = tex.length
        okToAppend = true
    }

    prevToken = cloneToken(token)
    isPrecededBySpace = isFollowedBySpace || token.input === "⌧"
  }

  popTexTokens(0, true) // Pop all the remaining close delimiters off the stack.

  if (isCalc) {
    while (rpnStack.length > 0) {
      rpn += tokenSep + rpnStack.pop().symbol
    }
    const varRegEx = /〖[^ ()]+/g
    let arr
    while ((arr = varRegEx.exec(tex)) !== null) {
      if ("¨ˆˉ˙˜".indexOf(arr[0][1]) === -1) {
        const pos = arr.index + arr[0].length
        if (tex.length > pos && tex.charAt(pos) === "(") {
          // We found a method, not a data index. Delete the 〖
          tex = tex.slice(0, arr.index) + tex.slice(arr.index + 1)
        } else {
          tex = tex.substring(0, pos) + "〗" + tex.substring(pos)
        }
      }
    }
  }

  tex = tex.replace(/ {2,}/g, " ") // Replace multiple spaces with single space.
  tex = tex.replace(/\s+(?=[_^'!)}\]〗])/g, "") // Delete spaces before right delims
  tex = tex.replace(/\s+$/, "") //                 Delete trailing space

  if (mustAlign) {
    const pos = tex.indexOf("=")
    tex = "\\begin{aligned}" + tex.slice(0, pos) + "&" + tex.slice(pos) + "\\end{aligned}"
  }

  return isCalc ? [tex, rpn] : tex
}
