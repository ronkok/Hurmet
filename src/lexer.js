import { addTextEscapes, tablessTrim, unitTeXFromString } from "./utils"
import { Rnl } from "./rational"
import { formattedDecimal, texFromMixedFraction } from "./format"
import { DataFrame } from "./dataframe"
import { dateDisplayFromIsoString } from "./date"

/*
 * lexer.js
 * This file supports parser.js.
 */

// Define constants for token types.
export const tt = Object.freeze({
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
  BIG_OPERATOR: 16,
  LEFTRIGHT: 17, //   |
  STRING: 18,
  UNIT: 19, //    unit-of-measure, e.g., 'meters' or °
  BIN: 20, //     binary infix operators that render but don't calculate, e.g., ± \cdots
  ADD: 21, //     binary infix addition or subtraction operator: + -
  MULT: 22, //    binary infix multiplication or division operator: × * · // ÷ modulo
  REL: 23, //     relational operator:  ≟ > < ≤ ≥ etc.
  LOGIC: 24, //   if and or xor else otherwise
  SEP: 25, //     argument separators, cell separators and row separators: , ;
  FUNCTION: 26,
  ACCESSOR: 28, //   dot between a data frame name and a property, as in r.prop
  ENVIRONMENT: 29,
  FACTORIAL: 30,
  SUPCHAR: 31,
  ANGLE: 32,
  RANGE: 33, //       separator for ranges (1:n)
  KEYWORD: 34, //     keywords: for in while
  PROPERTY: 36, //    property name after a dot accessor
  COMMENT: 37,
  RETURN: 38,  // A return statement inside a user-defined function.
  TO: 39,
  DATAFRAME: 40,
  RICHTEXT: 41,
  BOOLEAN: 42,
  MACRO: 43,
  DATE: 44  // Input format is 'yyyy-mm-dd'
})

const minusRegEx = /^-(?![-=<>:])/
const numberRegEx = new RegExp(Rnl.numberPattern)
const unitRegEx = /^(?:'[^']+'|[°ΩÅK])/
const dateRegEx = /^'\d{4}-\d{1,2}-\d{1,2}'/

export const texFromNumStr = (numParts, decimalFormat) => {
  let num = ""
  if (numParts[2]) {
    // Hexadecimal
    num = "\\mathrm{" + numParts[2] + "}"
  } else if (numParts[5]) {
    return texFromMixedFraction(numParts)
  } else {
    // Decimal
    num = numParts[3]
    if (numParts[6]) { num += "." + numParts[6] }
    num = formattedDecimal(num, decimalFormat)
    if (numParts[8]) {
      num += "\\%"
    } else if (numParts[7]) {
      if (numParts[7].charAt(0) === "-") {
        num += "\\text{e-}" + numParts[7].slice(1)
      } else {
        num += "\\text{e}" + numParts[7]
      }
    }
  }
  if (numParts[1]) {
    num = "\\text{-}" + num
  }
  return num
}

const isUnary = (prevToken) => {
  switch (prevToken.ttype) {
    case tt.NUM:
    case tt.ORD:
    case tt.VAR:
    case tt.DATE:
    case tt.RIGHTBRACKET:
    case tt.LONGVAR:
    case tt.UNIT:
    case tt.CURRENCY:
    case tt.SUPCHAR:
    case tt.PRIME:
    case tt.FACTORIAL:
      return false
    default:
      return true
  }
}

const wordRegEx = /^(?:(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf\udd38-\udd50]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*|!in|-->|->|left\.|right\.|log10|log2)/

const words = Object.freeze({
  //       input,    tex output,          calc output, type, closeDelim
  "true": ["true", "\\mathord{\\text{true}}", "true", tt.BOOLEAN, ""],
  "false": ["false", "\\mathord{\\text{false}}", "false", tt.BOOLEAN, ""],
  cos: ["cos", "\\cos", "cos", tt.FUNCTION, ""],
  cosd: ["cosd", "\\operatorname{\\cos_d}", "cosd", tt.FUNCTION, ""],
  if: ["if", "\\mathrel{\\mathrm{if}}", "if", tt.LOGIC, ""],
  else: ["else", "\\mathrel{\\mathrm{else}}", "else", tt.LOGIC, ""],
  elseif: ["elseif", "\\mathrel{\\mathrm{elseif}}", "elseif", tt.LOGIC, ""],
  and: ["and", "\\mathrel{\\mathrm{and}}", "and", tt.LOGIC, ""],
  or: ["or", "\\mathrel{\\mathrm{or}}", "or", tt.LOGIC, ""],
  for: ["for", "\\mathrel{\\mathrm{for}}", "for", tt.KEYWORD, ""],
  while: ["while", "\\mathrel{\\mathrm{while}}", "while", tt.KEYWORD, ""],
  in: ["in", "\\mathrel{\\mathrm{in}}", "in", tt.REL, ""],
  "!in": ["!in", "\\mathrel{\\mathrm{!in}}", "∉", tt.REL, ""],
  break: ["break", "\\mathrel{\\mathrm{break}}", "break", tt.KEYWORD, ""],
  to: ["to", "\\mathbin{\\mathrm{to}}", "to", tt.TO, "" ],
  throw: ["throw", "\\mathrel{\\mathrm{throw}}", "throw", tt.UNARY, ""],
  print: ["print", "\\mathrel{\\mathrm{print}}", "print", tt.UNARY, ""],
  return: ["return", "\\mathrel{\\mathrm{return}}", "print", tt.RETURN, ""],
  sqrt: ["sqrt", "\\sqrt", "√", tt.UNARY, ""],
  otherwise: ["otherwise", "\\mathrel{\\mathrm{otherwise}}", "otherwise", tt.LOGIC, ""],
  root: ["root", "\\sqrt", "root", tt.BINARY, ""],
  modulo: ["modulo", "\\mathbin{modulo}", "modulo", tt.MULT],
  sin: ["sin", "\\sin", "sin", tt.FUNCTION, ""],
  sind: ["sind", "\\operatorname{\\sin_d}", "sind", tt.FUNCTION, ""],
  tan: ["tan", "\\tan", "tan", tt.FUNCTION, ""],
  tand: ["tand", "\\operatorname{\\tan_d}", "tand", tt.FUNCTION, ""],
  cotd: ["cotd", "\\operatorname{\\cot_d}", "cotd", tt.FUNCTION, ""],
  secd: ["secd", "\\operatorname{\\sec_d}", "secd", tt.FUNCTION, ""],
  cscd: ["cscd", "\\operatorname{\\csc_d}", "cscd", tt.FUNCTION, ""],
  log: ["log", "\\log", "log", tt.FUNCTION, ""],
  ln: ["ln", "\\ln", "ln", tt.FUNCTION, ""],
  log10: ["log10", "\\log_{10}", "log10", tt.FUNCTION, ""],
  log2: ["log2", "\\log_{2}", "log2", tt.FUNCTION, ""],
  "log!": ["log!", "\\operatorname{log!}", "log!", tt.FUNCTION, ""],
  pi: ["pi", "\\mathrm{pi}", "π", tt.ORD, ""],
  π: ["π", "π", "π", tt.ORD, ""],
  "ℓ": ["ℓ", "ℓ", "ℓ", tt.VAR, ""],
  // A few arrows are placed here to give them priority over other arrows
  "->": ["->", "\u2192", "\u2192", tt.REL, ""], // right arrow
  "-->": ["-->", "\\xrightarrow", "-->", tt.UNARY, ""],
  "<-->": ["<-->", "\\xrightleftarrows", "<-->", tt.UNARY, ""]
})

const miscRegEx = /^([/÷\u2215_:,;\t^+\\\-–−*∗×∘⊗⦼⊙√∛∜·.%|╏‖¦><=≈≟≠≡≤≥≅∈∉∋∌⊂⊄⊆⊈⊃⊇⊉!¡‼¬∧∨⊻~#?⇒⟶⟵→←&@′″∀∃∫∬∮∑([{⟨⌊⎿⌈⎾〖〗⏋⌉⏌⌋⟩}\])˽∣ℂℕℚℝℤℓℏ∠¨ˆˉ˙˜▪✓\u00A0\u20D7$£¥€₨₩₪]+)/

const miscSymbols = Object.freeze({
  //    input, output, type,  closeDelim
  "#": ["#", "#", "#", tt.COMMENT, ""],
  "/": ["/", "\\dfrac{", "///", tt.DIV, ""],   // displaystyle fraction
  "//": ["//", "\\tfrac{", "//", tt.DIV, ""], // textstyle fraction
  "///": ["///", "/", "\u2215", tt.MULT, ""],     // inline (shilling) fraction
  "\u2215": ["\u2215", "\u2215", "\u2215", tt.MULT, ""], // inline (shilling) fraction
  "÷": ["÷", "÷", "÷", tt.MULT, ""],
  "./": ["./", "\\mathbin{.'}", "./", tt.MULT, ""],
  "_": ["_", "_", "_", tt.SUB, ""],
  "^": ["^", "^", "^", tt.SUP, ""],
  ".^": [".^", "\\mathbin{.^}", ".^", tt.SUP, ""],
  "+": ["+", "+", "+", tt.ADD, ""],
  "-": ["-", "-", "-", tt.ADD, ""],
  "–": ["-", "-", "-", tt.ADD, ""], // \u2013 en dash
  "−": ["-", "-", "-", tt.ADD, ""], // \u2212 math minus
  ".+": [".+", "\\mathbin{.+}", ".+", tt.ADD, ""],
  ".-": [".-", "\\mathbin{.-}", ".-", tt.ADD, ""],
  "*": ["*", "*", "*", tt.MULT, ""],
  "∗": ["∗", "∗", "∗", tt.MULT, ""],
  "×": ["×", "×", "×", tt.MULT, ""],
  "∘": ["∘", "∘", "∘", tt.MULT, ""], // U+2218
  "⊗": ["⊗", "⊗", "⊗", tt.MULT, ""],
  ".*": [".*", "\\mathbin{.*}", ".*", tt.MULT, ""],
  "√": ["√", "\\sqrt", "√", tt.UNARY, ""],
  "\u221B": ["\u221B", "\\sqrt[3]", "\u221B", tt.UNARY, ""],
  "\u221C": ["\u221C", "\\sqrt[4]", "\u221C", tt.UNARY, ""],
  "+-": ["+-", "\u00B1", "\u00B1", tt.BIN, ""],
  "**": ["**", "\\star", "**", tt.BIN, ""],
  "·": ["·", "\u22C5", "·", tt.MULT, ""], // dot operator
  "...": ["...", "\\dots", "...", tt.RANGE, ""],
  "\\dots": ["\\dots", "\\dots", "...", tt.RANGE, ""],
  "%": ["%", "\\%", "%", tt.FACTORIAL, ""],
  "-:": ["-:", "÷", "÷", tt.MULT, ""],
  "=": ["=", "=", "=", tt.REL, ""],
  "≈": ["≈", "≈", "≈", tt.REL, ""],
  "==": ["==", "⩵", "==", tt.REL, ""],
  "≡": ["≡", "≡", "≡", tt.REL, ""],
  ">": [">", "\\gt", ">", tt.REL, ""],
  "\u226f": ["\u226f", "\\ngtr", "\u226f", tt.REL, ""],
  "<": ["<", "\\lt", "<", tt.REL, ""],
  "\u226e": ["\u226e", "\\nless", "\u226e", tt.REL, ""],
  "?=": ["?=", "\u225F", "\u225F", tt.REL, ""],
  "≟": ["≟", "\u225F", "\u225F", tt.REL, ""],
  "≠": ["≠", "≠", "≠", tt.REL, ""],
  "!=": ["!=", "≠", "≠", tt.REL, ""],
  "<>": ["<>", "≠", "≠", tt.REL, ""],
  ":=": [":=", "\u2254", "\u2254", tt.REL, ""],
  "<=": ["<=", "≤", "≤", tt.REL, ""],
  "≤": ["≤", "≤", "≤", tt.REL, ""],
  ">=": [">=", "\u2265", "\u2265", tt.REL, ""],
  "≥": ["≥", "≥", "≥", tt.REL, ""],
  "-=": ["-=", "\u2261", "\u2261", tt.REL, ""],
  "~=": ["~=", "\u2245", "\u2245", tt.REL, ""],
  "≅": ["≅", "≅", "≅", tt.REL, ""],
  "~~": ["~~", "\u2248", "\u2248", tt.REL, ""],
  "~": ["~", "\\sim", "˽", tt.REL, ""],
  "=>": ["=>", "\u21D2", "\u21D2", tt.REL, ""],
  "⇒": ["⇒", "\u21D2", tt.REL, ""],
  "⟶": ["⟶", "\\xrightarrow", "⟶", tt.UNARY, ""],
  "⟵": ["⟵", "\\xleftarrow", "⟵", tt.UNARY, ""],
  "<=>": ["<=>", "\u21D4", "\u21D4", tt.REL, ""],
  "-<": ["-<", "\u227A", "\u227A", tt.REL, ""],
  ">-": [">-", "\u227B", "\u227B", tt.REL, ""],
  "-<=": ["-<=", "\u2AAF", "\u2AAF", tt.REL, ""],
  ">-=": [">-=", "\u2AB0", "\u2AB0", tt.REL, ""],
  "_|_": ["_|_", "\\bot", "_|_", tt.REL, ""],
  "|--": ["|--", "\u22A2", "\u22A2", tt.REL, ""],
  "|==": ["|==", "\\models", "⊨", tt.REL, ""],
  "∈": ["∈", "∈", "∈", tt.REL, ""],
  "∉": ["∉", "∉", "∉", tt.REL, ""],
  "∋": ["∋", "∋", "∋", tt.REL, ""],
  "∌": ["∌", "∌", "∌", tt.REL, ""],
  "⊂": ["⊂", "⊂", "⊂", tt.REL, ""],
  "⊃": ["⊃", "⊃", "⊃", tt.REL, ""],
  "⊄": ["⊄", "⊄", "⊄", tt.REL, ""],
  "⊅": ["⊅", "⊅", "⊅", tt.REL, ""],
  "⊆": ["⊆", "⊆", "⊆", tt.REL, ""],
  "⊈": ["⊈", "⊈", "⊈", tt.REL, ""],
  "⊇": ["⊇", "⊇", "⊇", tt.REL, ""],
  "⊉": ["⊉", "⊉", "⊉", tt.REL, ""],
  "▪": ["▪", "\\mathrel{▪}", "▪", tt.REL, ""],

  "!": ["!", "!", "!", tt.FACTORIAL, ""],
  "‼": ["‼", "!!", "‼", tt.FACTORIAL, ""],
  "!!": ["!!", "!!", "‼", tt.FACTORIAL, ""],
  "¡": ["¡", "¡", "¡", tt.FACTORIAL, ""],
  "&": ["&", "\\mathbin{\\&}", "&", tt.ADD, ""], // string concatenator
  "&_": ["&_", "\\mathbin{\\underline{\\&}}", "&_", tt.ADD, ""], // concatenate to bottom
  "′": ["′", "'", "′", tt.PRIME, ""],
  "″": ["″", "''", "″", tt.PRIME, ""],
  "′′": ["′′", "''", "′′", tt.PRIME, ""],
  "′′′": ["′′′", "'''", "′′′", tt.PRIME, ""],

  "∀": ["∀", "∀", "∀", tt.LOGIC, ""],
  "∃": ["∃", "∃", "∃", tt.LOGIC, ""],
  "∧": ["∧", "∧", "∧", tt.LOGIC, ""],
  "∨": ["∨", "∨", "∨", tt.LOGIC, ""],
  "⊻": ["⊻", "⊻", "⊻", tt.LOGIC, ""], // xor
  "¬": ["¬", "¬", "¬", tt.UNARY, ""], // logical not
  "&&": ["&&", "{\\;\\&\\&\\;}", "&&", tt.LOGIC, ""],

  "∫": ["∫", "∫", "∫", tt.BIG_OPERATOR, ""], // \int
  "∬": ["∬", "∬", "∬", tt.BIG_OPERATOR, ""], // \iint
  "∮": ["∮", "∮", "∮", tt.BIG_OPERATOR, ""], // \oint
  "\u2211": ["\u2211", "\u2211", "\u2211", tt.BIG_OPERATOR, ""], // \sum

  "(": ["(", "(", "(", tt.LEFTBRACKET, ")"],
  "[": ["[", "[", "[", tt.LEFTBRACKET, "]"],
  "{": ["{", "\\{", "{", tt.LEFTBRACKET, "\\}"],
  "{:": ["{:", "{", "{:", tt.LEFTBRACKET, "}"],
  "⟨": ["⟨", "⟨", "⟨", tt.LEFTBRACKET, "⟩"],
  ")": [")", ")", ")", tt.RIGHTBRACKET, ""],
  "]": ["]", "]", "]", tt.RIGHTBRACKET, ""],
  "}": ["}", "\\}", "}", tt.RIGHTBRACKET, ""],
  "⟩": ["⟩", "⟩", "⟩", tt.RIGHTBRACKET, ""],
  ":}": [":}", "}", ":}", tt.RIGHTBRACKET, ""],
  "|": ["|", "|", "|", tt.LEFTRIGHT, ""],
  "||": ["||", "\\mathbin{||}", "||", tt.BIN, ""],
  "\\|": ["\\|", "‖", "‖", tt.LEFTRIGHT, ""],
  "‖": ["‖", "‖", "‖", tt.LEFTRIGHT, ""],
  "<<": ["<<", "\u27E8", "\u27E8", tt.LEFTBRACKET, "\u27E9"],
  ">>": [">>", "\u27E9", "\u27E9", tt.RIGHTBRACKET, ""],
  "\u230A": ["\u230A", "\\lfloor ", "\u230A", tt.LEFTBRACKET, "\u230B"],
  "\u23BF": ["\u23BF", "\\lfloor ", "\u230A", tt.LEFTBRACKET, "\u230B"],
  "\u230B": ["\u230B", "\\rfloor ", "\u230B", tt.RIGHTBRACKET, ""],
  "\u23CC": ["\u23CC", "\\rfloor ", "\u230B", tt.RIGHTBRACKET, ""],
  "\u2308": ["\u2308", "\\lceil ", "\u2308", tt.LEFTBRACKET, "\u2309"],
  "\u23BE": ["\u23BE", "\\lceil ", "\u2308", tt.LEFTBRACKET, "\u2309"],
  "\u2309": ["\u2309", "\\rceil ", "\u2309", tt.RIGHTBRACKET, ""],
  "\u23CB": ["\u23CB", "\\rceil ", "\u2309", tt.RIGHTBRACKET, ""],
  "\u3016": ["\u3016", "{", "\u3016", tt.LEFTBRACKET, "\u3017"],
  "\u3017": ["\u3017", "}", "\u3017", tt.RIGHTBRACKET, "\u3017"],
  "¦": ["¦", "\\mid ", "¦", tt.REL, ""],

  // double-struck, i.e. blackboard bold
  "ℂ": ["ℂ", "\u2102", "ℂ", tt.ORD, ""],
  "ℕ": ["ℕ", "\u2115", "ℕ", tt.ORD, ""],
  "ℚ": ["ℚ", "\u211A", "ℚ", tt.ORD, ""],
  "ℝ": ["ℝ", "\u211D", "ℝ", tt.ORD, ""],
  "ℤ": ["ℤ", "\u2124", "ℤ", tt.ORD, ""],

  "ℏ": ["ℏ", "ℏ", "ℏ", tt.ORD, ""],

  //arrows
  "\u2192": ["\u2192", "\u2192", "\u2192", tt.REL, ""],
  "\u2190": ["\u2190", "\u2190", "\u2190", tt.REL, ""], // left arrow
  ">->": [">->", "\u21a3", "\u21a3", tt.REL, ""], // \rightarrowtail
  "->>": ["->>", "\u21a0", "\u21a0", tt.REL, ""], // \twoheadrightarrow
  "|->": ["|->", "\u21a6", "\u21a6", tt.REL, ""], // \mapsto

  // extensible arrows
  "<--": ["<--", "\\xleftarrow", "\u27f5", tt.UNARY, ""],
  "==>": ["==>", "\\xRightarrow", "==>", tt.UNARY, ""],
  "<==": ["<==", "\\xLeftarrow", "<==", tt.UNARY, ""],
  "<-->": ["<-->", "\\xleftrightarrow", "<-->", tt.UNARY, ""],
  "<==>": ["<==>", "\\xLeftrightarrow", "<==>", tt.UNARY, ""],

  "\u2220": ["\u2220", "\u2220", "\u2220", tt.ANGLE, ""],
  "✓": ["✓", "✓", "✓", tt.ORD, ""],
  "˽": ["˽", "~", "˽", tt.SPACE, ""],  // "~" is a no-break space in LaTeX.
  "\\;": ["\\;", ";\\:", "\\;", tt.SEP, ""],
  "…": ["…", "…", "…", tt.ORD, ""],

  ":": [":", "{:}", ":", tt.RANGE, ""], // range separator
  ",": [",", ",\\:", ", ", tt.SEP, ""], // function argument or matrix element separator
  "\t": ["\t", " & ", "\t", tt.SEP, ""],  // dataframe element separator
  ";": [";", " \\\\ ", ";", tt.SEP, ""], // row separator
  "\\\\": ["\\\\", " \\\\ ", ";", tt.SEP, ""], // row separator
  "\\cr": ["\\cr", " \\\\ ", ";", tt.SEP, ""], // row separator

  "$": ["$", "\\$", "$", tt.CURRENCY, ""],
  "£": ["£", "£", "£", tt.CURRENCY, ""],
  "¥": ["¥", "¥", "¥", tt.CURRENCY, ""],
  "€": ["€", "€", "€", tt.CURRENCY, ""],
  "₨": ["₨", "₨", "₨", tt.CURRENCY, ""],
  "₩": ["₩", "₩", "₩", tt.CURRENCY, ""],
  "₪": ["₪", "₪", "₪", tt.CURRENCY, ""]
})

const texFunctionRegEx = /^(\\[A-Za-z]+\.?|\\([:.!\u0020\u220F-\u2211\u222B-\u2230]|'+))/

const texFunctions = Object.freeze({
  //       input, tex output, calc output,  type,  closeDelim
  "\\aleph": ["\\aleph", "\u2135", "\u2135", tt.VAR, ""],
  "\\beth": ["\\beth", "\u2136", "\u2136", tt.VAR, ""],
  "\\gimel": ["\\gimel", "\u2137", "\u2137", tt.VAR, ""],
  "\\daleth": ["\\daleth", "\u2138", "\u2138", tt.VAR, ""],
  "\\ast": ["\\ast", "∗", "∗", tt.MULT, ""],
  "\\div": ["\\div", "÷", "÷", tt.MULT, ""],
  "\\times": ["\\times", "×", "×", tt.MULT, ""],
  "\\pm": ["\\pm", "±", "±", tt.BIN, ""],
  "\\bmod": ["\\bmod", "\\bmod", "modulo", tt.MULT],
  "\\circ": ["\\circ", "∘", "∘", tt.MULT, ""], // U+2218
  "\\nabla": ["\\nabla", "∇", "∇", tt.ORD, ""],
  "\\otimes": ["\\otimes", "⊗", "⊗", tt.MULT, ""],
  "\\ne": ["\\ne", "≠", "≠", tt.REL, ""],
  "\\cdot": ["\\cdot", "\u22C5", "·", tt.MULT, ""], // dot operator
  "\\le": ["\\le", "≤", "≤", tt.REL, ""],
  "\\leq": ["\\leq", "≤", "≤", tt.REL, ""],
  "\\ge": ["\\ge", "≥", "≥", tt.REL, ""],
  "\\geq": ["\\geq", "≥", "≥", tt.REL, ""],
  "\\equiv": ["\\equiv", "\u2261", "\u2261", tt.REL, ""],
  "\\cong": ["\\cong", "≅", "≅", tt.REL, ""],
  "\\approx": ["\\approx", "\u2248", "\u2248", tt.REL, ""],
  "\\Rightarrow": ["\\Rightarrow", "\u21D2", "\u21D2", tt.REL, ""],
  "\\forall": ["\\forall", "∀", "∀", tt.LOGIC, ""],
  "\\exists": ["\\exists", "∃", "∃", tt.LOGIC, ""],
  "\\infty": ["\\infty", "∞", "∞", tt.ORD, ""],
  "\\sqrt": ["\\sqrt", "\\sqrt", "√", tt.UNARY, ""],
  "\\atop": ["\\atop", "\\atop{", "\\atop", tt.DIV, ""],
  "\\cdots": ["\\cdots", "\u22ef", "\u22ef", tt.BIN, ""],
  "\\vdots": ["\\vdots", "\u22ee", "\u22ee", tt.BIN, ""],
  "\\ddots": ["\\ddots", "\u22f1", "\u22f1", tt.BIN, ""],
  "\\iff": ["\\iff", "\\iff", "\\iff", tt.LOGIC, ""],
  "\\land": ["\\land", "\\land", "\\land", tt.BIN, ""],
  "\\lor": ["\\lor", "\\lor", "\\lor", tt.BIN, ""],
  "\\ngtr": ["\\ngtr", "\\ngtr", "\u226f", tt.REL, ""],
  "\\nless": ["\\nless", "\\nless", "\u226E", tt.REL, ""],
  "\\nleq": ["\\nleq", "\\nleq", "\u2270", tt.REL, ""],
  "\\ngeq": ["\\ngeq", "\\ngeq", "\u2271", tt.REL, ""],
  "\\in": ["\\in", "∈", "∈", tt.REL, ""],
  "\\notin": ["\\notin", "∉", "∉", tt.REL, ""],
  "\\subset": ["\\subset", "⊂", "⊂", tt.REL, ""],
  "\\subseteq": ["\\subseteq", "⊆", "⊆", tt.REL, ""],
  "\\nsubset": ["\\nsubset", "⊄", "⊄", tt.REL, ""],
  "\\nsubseteq": ["\\nsubseteq", "⊈", "⊈", tt.REL, ""],
  "\\supset": ["\\supset", "⊃", "⊃", tt.REL, ""],
  "\\left.": ["\\left.", "\\left.", "{:", tt.LEFTBRACKET, "\\right."],
  "\\right.": ["\\right.", "\\right.", ":}", tt.RIGHTBRACKET, ""],
  "\\mod": ["\\mod", "\\mod", "\\mod", tt.BIN, ""],
  "\\lim": ["\\lim", "\\lim", "\\lim", tt.ORD, ""],
  "\\diamond": ["\\diamond", "\\diamond", "\\diamond", tt.ORD, ""],
  "\\square": ["\\square", "\\square", "\\square", tt.ORD, ""],
  "\\int": ["\\int", "∫", "∫", tt.BIG_OPERATOR, ""],
  "\\iint": ["\\iint", "∬", "∬", tt.BIG_OPERATOR, ""],
  "\\iiint": ["\\iiint", "∭", "∭", tt.BIG_OPERATOR, ""],
  "\\oint": ["\\oint", "∮", "∮", tt.BIG_OPERATOR, ""],
  "\\oiint": ["\\oiint", "∯", "∯", tt.BIG_OPERATOR, ""],
  "\\oiiint": ["\\oiiint", "∰", "∰", tt.BIG_OPERATOR, ""],
  "\\∫": ["\\∫", "\\displaystyle∫", "\\∫", tt.BIG_OPERATOR, ""],
  "\\∬": ["\\∬", "\\displaystyle∬", "\\∬", tt.BIG_OPERATOR, ""],
  "\\∭": ["\\∭", "\\displaystyle∭", "\\∭", tt.BIG_OPERATOR, ""],
  "\\∮": ["\\∮", "\\displaystyle∮", "\\∮", tt.BIG_OPERATOR, ""],
  "\\∯": ["\\∯", "\\displaystyle∯", "\\∯", tt.BIG_OPERATOR, ""],
  "\\∰": ["\\∰", "\\displaystyle∰", "\\∰", tt.BIG_OPERATOR, ""],
  "\\over": ["\\over", "\\dfrac{", "\\over", tt.DIV],
  "\\sum": ["\\sum", "\\displaystyle∑", "∑", tt.BIG_OPERATOR, ""],
  "\\∑": ["\\∑", "∑", "\\∑", tt.BIG_OPERATOR, ""],
  "\\prod": ["\\prod", "∏", "∏", tt.BIG_OPERATOR, ""],
  "\\∏": ["\\∏", "\\displaystyle∏", "\\∏", tt.BIG_OPERATOR, ""],
  "\\quad": ["\\quad", "\\quad", "\\quad", tt.SPACE, ""],
  "\\qquad": ["\\qquad", "\\qquad", "\\qquad", tt.SPACE, ""],
  "\\align": ["\\align", "\\begin{align}", "\\align", tt.UNARY, "\\end{align}"],
  "\\cases": ["\\cases", "\\begin{cases}", "\\cases", tt.UNARY, "\\end{cases}"],
  "\\rcases": ["\\rcases", "\\begin{rcases}", "\\rcases", tt.UNARY, "\\end{rcases}"],
  "\\smallmatrix": ["\\smallmatrix", "\\begin{smallmatrix}", "\\smallmatrix", tt.UNARY,
    "\\end{smallmatrix}"],
  "\\bordermatrix": ["\\bordermatrix", "\\bordermatrix", "\\bordermatrix", tt.UNARY, "}"],
  "\\equation": ["\\equation", "\\begin{equation}", "\\equation", tt.UNARY, "\\end{equation}"],
  "\\split": ["\\split", "\\begin{split}", "\\split", tt.UNARY, "\\end{split}"],
  "\\gather": ["\\gather", "\\begin{gather}", "\\gather", tt.UNARY, "\\end{gather}"],
  "\\CD": ["\\CD", "\\begin{CD}", "\\CD", tt.UNARY, "\\end{CD}"],
  "\\multline": ["\\multline", "\\begin{multline}", "\\multline", tt.UNARY, "\\end{multline}"]
})

const accents = new Set([
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
  "mathring",
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
])

// Avoid "operatorname" for functions that are already math operators.
const mathOperators = new Set([
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
])

const colors = new Set([
  "blue",
  "firebrick",
  "gray",
  "green",
  "orange",
  "pink",
  "purple",
  "red"
])

const unaries = new Set([
  "bcancel",
  "boxed",
  "Bra",
  "bra",
  "braket",
  "cancel",
  "ce",
  "clap",
  "color",
  "Ket",
  "ket",
  "label",
  "llap",
  "longdiv",
  "mathclap",
  "mathbb",
  "mathbf",
  "mathcal",
  "mathfrak",
  "mathit",
  "mathnormal",
  "mathrm",
  "mathscr",
  "mathsf",
  "mathtt",
  "not",
  "operatorname",
  "phantom",
  "phase",
  "pu",
  "reflectbox",
  "rlap",
  "sout",
  "tag",
  "text",
  "textbf",
  "textcircled",
  "textit",
  "textmd",
  "textnormal",
  "textrm",
  "textsc",
  "textsf",
  "texttt",
  "textup",
  "vcenter",
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
])

const greek = {
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
  zeta: "\u03B6"
}

const binaries = new Set([
  "dfrac",
  "frac",
  "lower",
  "overset",
  "raisebox",
  "stackrel",
  "tag",
  "tfrac",
  "underset"
])

const texREL = new Set([
  "Bumpeq", "Colonapprox", "Coloneq", "Coloneqq", "Colonsim", "Darr", "Doteq", "Downarrow",
  "Eqcolon", "Eqqcolon", "Harr", "Larr", "Leftarrow", "Leftrightarrow", "Lleftarrow",
  "Longleftarrow", "Longleftrightarrow", "Longrightarrow", "Lrarr", "Lsh", "Rarr",
  "Rrightarrow", "Rsh", "Supset", "Subset", "Uarr", "Uparrow", "Updownarrow",
  "Vdash", "Vvdash", "approxeq", "asymp", "backepsilon", "backsim", "backsimeq",
  "between", "bowtie", "bumpeq", "circeq", "circlearrowleft", "circlearrowright",
  "colonapprox", "coloneq", "coloneqq", "colonsim", "curlyeqprec", "curlyeqsucc",
  "curvearrowleft", "curvearrowright", "dArr", "darr", "dashleftarrow", "dashrightarrow",
  "dashv", "dblcolon", "doteq", "doteqdot", "downarrow", "downdownarrows", "downharpoonleft",
  "downharpoonright", "eqcirc", "eqcolon", "eqqcolon", "eqsim", "eqslantgtr", "eqslantless",
  "fallingdotseq", "frown", "geqq", "geqslant", "gets", "gg", "ggg",
  "gggtr", "gnapprox", "gneq", "gneqq", "gnsim", "gt", "gtrapprox", "gtreqless", "gtreqqless",
  "gtrless", "gtrsim", "gvertneqq", "hArr", "harr", "hookleftarrow", "hookrightarrow",
  "impliedby", "implies", "isin", "Join", "gets", "impliedby", "implies",
  "lArr", "larr", "leadsto", "leftarrow", "leftarrowtail", "leftharpoondown",
  "leftharpoonup", "leftleftarrows", "leftrightarrow", "leftrightarrows", "leftrightharpoons",
  "leftrightsquigarrow", "leqq", "leqslant", "lessapprox", "lesseqgtr", "lesseqqgtr",
  "lessgtr", "lesssim", "ll", "lll", "llless", "lnapprox", "lneq", "lneqq", "lnsim",
  "longleftarrow", "longleftrightarrow", "longmapsto", "longrightarrow", "looparrowleft",
  "looparrowright", "lrArr", "lrarr", "lt", "lvertneqq", "mapsto", "mid", "models",
  "multimap", "nLeftarrow", "nLeftrightarrow", "nRightarrow", "nVDash", "nVdash", "ncong",
  "nearrow", "neq", "nexists", "ngeq", "ngeqq", "ngeqslant", "ngtr", "ni", "nleftarrow",
  "nleftrightarrow", "nleq", "nleqq", "nleqslant", "nless", "nmid", "notni",
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
])

const superRegEx = /^⁻?[²³¹⁰⁴⁵⁶⁷⁸⁹]+/

const cloneToken = tkn => [tkn[0], tkn[1], tkn[2], tkn[3], tkn[4]]

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
})

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
})

const groupSubscript = word => {
  const pos = word.indexOf("_")
  return pos === -1
    ? word
    : word.slice(0, pos + 1) + "{" + word.slice(pos + 1) + "}"
}

const checkForTrailingAccent = word => {
  const ch = word.slice(-1)
  if (/[\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]/.test(ch)) {
    word = word.slice(0, -1)
    return word === "i"
      ? accentFromChar[ch] + "{ı}"  // dotless i
      : word === "j"
      ? accentFromChar[ch] + "{ȷ}"  // dotless j
      : word.length === 1
      ? accentFromChar[ch] + "{" + word + "}"
      : wideAccentFromChar[ch] + "{" + word + "}"
  } else {
    return word
  }
}

const lexOneWord = (str, prevToken) => {
  const matchObj = wordRegEx.exec(str)
  if (matchObj) {
    let match = matchObj[0].replace(/_*$/, "") // drop trailing underscores

    // Get the immediately following character
    const fc = str.charAt(match.length)

    const word = words[match]
    if (word && fc !== "′") {
      return word
    } else if (/^\(/.test(fc)) {
      // word is followed by an open paren. Treat it as a function name
      return (prevToken.ttype === tt.ACCENT)
        ? [match, match + "}{", match + "}{", tt.FUNCTION, ""]
        : match === "sqrt"
        ? [match, "\\sqrt", "√", tt.UNARY, ""]
        : match === "f"
        ? [match, match, "f", tt.FUNCTION, ""]
        : mathOperators.has(match)
        ? [match, "\\" + match, match, tt.FUNCTION, ""]
        : [match, "\\operatorname{" + groupSubscript(match) + "}", match, tt.FUNCTION, ""]
    } else if (prevToken.ttype === tt.ACCESSOR) {
      return [match, match, match, tt.PROPERTY, ""]
    } else if (/[_\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]/.test(match)) {
      let identifier = ""
      if (match.indexOf("_") === -1) {
        identifier = checkForTrailingAccent(match)
        return [match, identifier, match, (match.length > 2) ? tt.LONGVAR : tt.VAR, ""]
      } else {
        const segments = match.split("_")
        for (let i = segments.length - 1; i >= 0; i--) {
          segments[i] = checkForTrailingAccent(segments[i])
          if (i > 0) {
            segments[i] = "_\\text{" + segments[i] + "}"
          }
        }
        identifier = segments.join("")
        const primes = /^′*/.exec(str.slice(match.length))
        if (primes) {
          match += primes[0]
          identifier += "'".repeat(primes[0].length)
        }
        const pos = identifier.indexOf("_")
        if (pos > -1) {
          // Cramp subscript placement by wrapping it with braces.
          // This helps Cambria Math to supply the correct size radical.
          identifier = identifier.slice(0, pos) + "{" + identifier.slice(pos) + "}"
        }
        return [match, identifier, match, (segments[0].length > 1) ? tt.LONGVAR : tt.VAR, ""]
      }
    } else if (match.length === 2 & match.charAt(0) === "\uD835") {
      return [match, match, match, tt.VAR, ""]
    } else if (match.length > 1) {
      return [match, match, match, tt.LONGVAR, ""]
    } else {
      // Return a single character variable name
      if (match.charAt(0) === "\uD835") {
        return [match.substring(0, 2), match.substring(0, 2),
          match.substring(0, 2), tt.VAR, ""]
      } else {
        return [match.charAt(0), match.charAt(0), match.charAt(0), tt.VAR, ""]
      }
    }
  }
}

// Support a unit name written w/o a space after a number
export const unitStartRegEx = /^(?:[A-Za-z°ʹ″$£¥₨₪€ÅΩ℃℉ΩKÅ]|ʹʹ)/
const unitAndExpo = "(?:(?:[A-Za-z][A-Za-zōö]*\\$?|[°ʹ″$£¥₨₪€ÅΩ℃℉ΩKÅ]|ʹʹ)(?:(?:(?:(?:\\^|\\^-)"
  + "[1-9][0-9]*)|(?:\\^\\(-?[1-9][0-9]*\\))|⁻?[¹²³\\u2074-\\u2079][⁰¹²³\\u2074-\\u2079]*))?)"
const productOfUnits = "(?:" + unitAndExpo + "(?:[*·.•×]" + unitAndExpo + ")*)"
const unitNameRegEx = new RegExp("^" + productOfUnits + "(?:\\/" + productOfUnits + ")?")
export const lexUnitName = str => {
  const match = unitNameRegEx.exec(str)
  return [match[0], unitTeXFromString(match[0]), match[0], tt.UNIT, ""]
}

export const lex = (str, formats, prevToken, inRealTime = false) => {
  // Get the next token in str. Return an array with the token's information:
  // [input, TeX output, calc output, type, associated close delimiter]
  let pos = 0
  let st = ""
  let matchObj

  if (str.length > 3 && str.slice(0, 3) === "===") {
    // A macro between triple-double quotation marks.
    pos = str.indexOf('"""', 3)
    if (pos > 0) {
      st = str.slice(3, pos)
      return ['"""' + st + '"""', st, st, tt.MACRO, ""]
    } else {
      return [str, str.slice(3), str.slice(3), tt.MACRO, ""]
    }
  }

  if (str.charAt(0) === '"') {
    // String between double quotation marks. Parser will convert it to \text{…}
    pos = str.indexOf('"', 1)
    if (pos > 0) {
      // Disallow \r or \n by truncating the string.
      st = str.substring(1, pos).replace(/\r?\n.*/, "")
      return ['"' + st + '"', st, st, tt.STRING, ""]
    } else {
      return [str, str.replace(/\r?\n.*/, ""), str.replace(/\r?\n.*/, ""), tt.STRING, ""]
    }
  }

  if (/^#/.test(str)) {
    // comment
    st = str.slice(2)
    pos = st.indexOf("\n")
    if (pos > -1) {
      const posReturn = st.indexOf("\n")
      if (posReturn > -1 && posReturn < pos) { pos = posReturn }
    }
    if (pos > -1) {
      st = st.slice(0, pos)
    }
    return [`#${st}`, `\\text{\\texttt{ \\#${st}}}`, `#${st}`, tt.COMMENT, ""]
  }

  if (/^``/.test(str)) {
    // inline TSV string between double back ticks, a data frame literal.
    pos = str.indexOf("`", (str.charAt(2) === "`" ? 3 : 2))
    const inputStr = (pos > 0 ? str.slice(2, pos) : str.slice(2))
    const st = tablessTrim(inputStr)
    let tex = ""
    if (inRealTime) {
      tex = DataFrame.quickDisplay(st)
    } else {
      const dataStructure = DataFrame.dataFrameFromTSV(st)
      tex = DataFrame.display(dataStructure.value, "h3", formats.decimalFormat)
    }
    return ["``" + inputStr + "``", tex, inputStr, tt.DATAFRAME, ""]
  }

  if (str.charAt(0) === '`') {
    // Rich text string. Usually a return from a calculation.
    // String between double quotation marks. Parser will convert it to \text{…}
    pos = str.indexOf('`', 1)
    if (pos > 0) {
      // Disallow \r or \n by truncating the string.
      st = str.substring(1, pos).replace(/\r?\n.*/, "")
      return ['`' + st + '`', st, st, tt.RICHTEXT, ""]
    } else {
      return [str, str.replace(/\r?\n.*/, ""), str, tt.RICHTEXT, ""]
    }
  }

  if (unitRegEx.test(str)) {
    // String between single quotation marks. That signals a tt.UNIT or a tt.DATE.
    pos = str.indexOf("'", 1)
    if (pos > 0) {
      st = str.substring(1, pos)
      const strWithDelimiters = "'" + st + "'"
      if (dateRegEx.test(str)) {
        const dateTex = dateDisplayFromIsoString(strWithDelimiters, formats.dateFormat, true)
        return [strWithDelimiters, dateTex, st, tt.DATE, ""]
      } else {
        return [strWithDelimiters, unitTeXFromString(st), st, tt.UNIT, ""]
      }
    } else {
      // One of the unambiguous unit symbols, like ° or Å
      return [str.charAt(0), str.charAt(0), str.charAt(0), tt.UNIT, ""]
    }
  }

  // Strings beginning with "\" are passed through as a TeX control word.
  matchObj = texFunctionRegEx.exec(str)
  if (matchObj) {
    // TeX control word, starting with backslash. e.g. \, or \circ
    const match = matchObj[0]
    st = match.slice(1)
    if (accents.has(st)) {
      return [match, match, match, tt.ACCENT, ""]
    }
    if (unaries.has(st)) {
      return [match, match, match, tt.UNARY, ""]
    }
    if (colors.has(st)) {
      return [match, "\\textcolor{" + st + "}", match, tt.UNARY, ""]
    }
    if (binaries.has(st)) {
      return [match, match, match, tt.BINARY, ""]
    }
    if (texREL.has(st)) {
      return [match, match, match, tt.REL, ""]
    }
    const texFunc = texFunctions[match]
    if (texFunc) {
      return cloneToken(texFunc)
    }
    if (mathOperators.has(st)) {
      return [match, match, st, tt.FUNCTION, ""]
    }
    if (greek[st]) {
      const ch = greek[st];
      return [match, ch, ch, tt.VAR, ""]
    }

    // default case is a mathord. So I have not enumerated any ORDs
    return [match, match, match, tt.ORD, ""]
  }

  if (minusRegEx.test(str)) {
    if (isUnary(prevToken)) {
      // Check if the unary minus is part of a number
      const numParts = str.match(numberRegEx)
      if (numParts) {
        // numbers
        st = texFromNumStr(numParts, formats.decimalFormat)
        return [numParts[0], st, numParts[0], tt.NUM, ""]
      }
    }
    return ["-", "-", "-", tt.ADD, ""]
  }

  const numParts = str.match(numberRegEx)
  if (numParts) {
    // numbers
    st = texFromNumStr(numParts, formats.decimalFormat)
    return [numParts[0], st, numParts[0], tt.NUM, ""]
  }

  // Before lexing for a word, find underscores before a group
  if (/^_[([{]/.test(str)) {
    return ["_", "_", "_", tt.SUB, ""]
  }

  const word = lexOneWord(str, prevToken)
  if (word) { return cloneToken(word) }

  const nums = superRegEx.exec(str)
  if (nums) {
    return [nums[0], nums[0], nums[0], tt.SUPCHAR, ""]
  }

  //return maximal initial substring of str that appears in misc names
  matchObj = miscRegEx.exec(str)
  if (matchObj) {
    const match = matchObj[0]
    for (let i = match.length; i >= 1; i--) {
      st = match.slice(0, i)
      if (miscSymbols[st]) { return cloneToken(miscSymbols[st]) }
    }
  }

  // No keywords were matched. Return 1 character.
  const c1 = str.charAt(0)
  if (c1 === "." && (prevToken.ttype === tt.VAR || prevToken.ttype === tt.LONGVAR ||
    prevToken.ttype === tt.STRING || prevToken.input === "]" || prevToken.input === ")" ||
    prevToken.ttype === tt.PROPERTY)) {
    // Suppress the spacing of the accessor dot.
    return [".", "{.}", ",", tt.ACCESSOR, ""]
  }
  return [c1, addTextEscapes(c1), c1, tt.VAR, ""]
}
