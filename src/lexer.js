﻿import { isIn, addTextEscapes } from "./utils"
import { Rnl } from "./rational"
import { formattedDecimal, texFromMixedFraction } from "./format"

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
  //  tt.PROPERTY: 8,
  ORD: 9,
  VAR: 10,   // variable name, one letter long
  NUM: 11,
  PUNCT: 12,
  LONGVAR: 13,
  LEFTBRACKET: 14,
  RIGHTBRACKET: 15,
  UNDEROVER: 16,
  LEFTRIGHT: 17, //   |
  STRING: 18,
  QUANTITY: 19, // physical quantity, with both magnitude and unit, e.g., '5 meters'
  BIN: 20, //     binary infix operators that render but don't calculate, e.g., ± \cdots
  ADD: 21, //     binary infix addition or subtraction operator: + -
  MULT: 22, //    binary infix multiplication or division operator: × * · // ÷
  REL: 23, //     relational operator:  ≟ > < ≤ ≥ etc.
  LOGIC: 24, //   if and or xor else otherwise
  SEP: 25, //     argument separators, cell separators and row separators: , ;
  FUNCTION: 26,
  ACCESSOR: 28, //   dot between a dictionary name and a property, as in r.prop
  ENVIRONMENT: 29,
  FACTORIAL: 30,
  SUPCHAR: 31,
  ANGLE: 32,
  COLON: 33, //       separator for ranges (1:n) or key:value pairs
  KEYWORD: 34, //     keywords: for in while
  PROPERTY: 36, //    property name after a dot accessor
  COMMENT: 37,
  RETURN: 38,
  TO: 39
})

const minusRegEx = /^-(?![-=<>:])/
const numberRegEx = new RegExp(Rnl.numberPattern)

export const texFromNumStr = (numParts, decimalFormat) => {
  let num = ""
  if (numParts[7]) {
    // Hexadecimal
    num = "\\mathrm{" & numParts[7] & "}"
  } else if (numParts[4]) {
    return texFromMixedFraction(numParts)
  } else {
    // Decimal
    num = numParts[2]
    if (numParts[5]) { num += "." + numParts[5] }
    num = formattedDecimal(num, decimalFormat)
    if (numParts[6]) {
      if (numParts[6].charAt(0) === "-") {
        return num + "\\text{e-}" + numParts[6].slice(1)
      } else {
        return num + "\\text{e}" + numParts[6]
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
    case tt.RIGHTBRACKET:
    case tt.LONGVAR:
    case tt.QUANTITY:
    case tt.SUPCHAR:
    case tt.PRIME:
    case tt.FACTORIAL:
      return false
    default:
      return true
  }
}

const wordRegEx = /^(?:(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|(?:\uD835[\uDC00-\udc33\udc9c-\udccf]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*|!in|-->|->|left\.|right\.|log10|log2)/

const words = Object.freeze({
  //       input,    tex output,               type, closeDelim
  "true": ["true", "\\mathord{\\text{true}}", tt.ORD, ""],
  "false": ["false", "\\mathord{\\text{false}}", tt.ORD, ""],
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
})

const miscRegEx = /^([/÷\u2215_:,;^+\\\-–−*×∘⊗⦼⊙√∛∜·.%∘|╏‖¦><=≟≠≡≤≥≅∈∉⋐!¡‼¬∧∨⊻~#?⇒⟶⟵→←&@′″∀∃∫∬∮∑([{⟨⌊⎿⌈⎾〖〗⏋⌉⏌⌋⟩}\])˽∣ℂℕℚℝℤℓℏ∠¨ˆˉ˙˜▪✓\u00A0\u20D7]+)/

const miscSymbols = Object.freeze({
  //    input, output, type,  closeDelim
  "#": ["#", "#", tt.COMMENT, ""],
  "/": ["/", "\\frac{", tt.DIV, ""],
  "//": ["//", "\\dfrac{", tt.DIV, ""], // display style fraction
  "///": ["///", "/", tt.MULT, ""], // inline (shilling) fraction
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
  "-:": ["-:", "÷", tt.MULT, ""],
  "=": ["=", "=", tt.REL, ""],
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
  "⋐": ["⋐", "⋐", tt.REL, ""],
  "▪": ["▪", "\\mathrel{▪}", tt.REL, ""],

  "!": ["!", "!", tt.FACTORIAL, ""],
  "‼": ["‼", "!!", tt.FACTORIAL, ""],
  "!!": ["!!", "!!", tt.FACTORIAL, ""],
  "¡": ["¡", "¡", tt.FACTORIAL, ""],
  "&": ["&", "\\mathbin{\\&}", tt.ADD, ""], // string concatenator
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
  "˽": ["˽", "~", tt.PUNCT, ""],
  "\\,": ["\\,", ",\\:", tt.SEP, ""], // escape character to enable non-matrix comma in parens
  "\\;": ["\\;", ";\\:", tt.SEP, ""],

  ":": [":", ":", tt.COLON, ""], // key:value or range separator
  ",": [",", ",\\:", tt.SEP, ""], // function argument separator
  ";": [";", ";\\:", tt.SEP] // row separator
})

const texFunctionRegEx = /^(\\[A-Za-z]+\.?|\\([:.!\u0020]|'+))/

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
  "\\Subset": ["\\Subset", "⋐", tt.REL, ""],
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
  "\\sum": ["\\sum", "\\sum", tt.UNDEROVER, ""],
  "\\prod": ["\\prod", "\\prod", tt.UNDEROVER, ""],
  "\\quad": ["\\quad", "\\quad", tt.PUNCT, ""],
  "\\qquad": ["\\qquad", "\\qquad", tt.PUNCT, ""]
})

const accents = Object.freeze([
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
  "overlinesegment",
  "overrightarrow",
  "overrightharpoon",
  "textbf",
  "textit",
  "textrm",
  "textsf",
  "texttt",
  "tilde",
  "underbrace",
  "undergroup",
  "underleftarrow",
  "underleftrightarrow",
  "underline",
  "underlinesegment",
  "underrightarrow",
  "utilde",
  "vec",
  "widecheck",
  "widehat",
  "widetilde"
])

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
  "sup",
  "tan",
  "tanh",
  "tg",
  "th"
])

const unaries = Object.freeze([
  "bcancel",
  "blue",
  "boxed",
  "cancel",
  // Hurmet does not support \ce.
  "clap",
  "color",
  "gray",
  "green",
  "llap",
  "mathclap",
  "not",
  "operatorname",
  "orange",
  "phantom",
  "pink",
  "pu",
  "purple",
  "red",
  "rlap",
  "sout",
  "sqrt",
  "tag",
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
])

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
  "sqsubset", "sqsubseteq", "sqsupset", "sqsupseteq", "sub", "sube", "subset", "subseteq",
  "subseteqq", "subsetneq", "subsetneqq", "succ", "succapprox", "succcurlyeq", "succeq",
  "succnapprox", "succneqq", "succnsim", "succsim", "supe", "supset", "supseteq", "supseteqq",
  "supsetneq", "supsetneqq", "swarrow", "thickapprox", "thicksim", "to", "trianglelefteq",
  "triangleq", "trianglerighteq", "twoheadleftarrow", "twoheadrightarrow", "uArr", "uarr",
  "uparrow", "updownarrow", "upharpoonleft", "upharpoonright", "upuparrows", "varpropto",
  "varsubsetneq", "varsubsetneqq", "varsupsetneq", "varsupsetneqq", "vartriangle",
  "vartriangleleft", "vartriangleright", "vcentcolon", "vdash", "vDash"
])

const superRegEx = /^⁻?[²³¹⁰⁴⁵⁶⁷⁸⁹]+/

const cloneToken = tkn => [tkn[0], tkn[1], tkn[2], tkn[3]]

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
  return (!(/[\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]/.test(ch)))
    ? word
    : (word.length === 2)
    ? accentFromChar[ch] + "{" + word.slice(0, -1) + "}"
    : wideAccentFromChar[ch] + "{" + word.slice(0, -1) + "}"
}

const lexOneWord = (str, prevToken) => {
  const matchObj = wordRegEx.exec(str)
  if (matchObj) {
    const match = matchObj[0].replace(/_*$/, "") // drop trailing underscores

    // Get the immediately following character
    const fc = str.charAt(match.length)

    const word = words[match]
    if (word) {
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
      let identifier = ""
      if (match.indexOf("_") === -1) {
        identifier = checkForTrailingAccent(match)
        return [match, identifier, (match.length > 2) ? tt.LONGVAR : tt.VAR, ""]
      } else {
        const segments = match.split("_")
        for (let i = segments.length - 1; i >= 0; i--) {
          segments[i] = checkForTrailingAccent(segments[i])
          if (i > 0) {
            segments[i] = "_\\mathrm{" + segments[i] + "}"
          }
        }
        identifier = segments.join("")
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
}

export const lex = (str, decimalFormat, prevToken) => {
  // Get the next token in str. Return an array with the token's information:
  // [input, TeX output, type, associated close delimiter]
  let pos = 0
  let st = ""
  let matchObj

  if (str.charAt(0) === '"') {
    // String between double quotation marks. Parser will convert it to \text{…}
    pos = str.indexOf('"', 1)
    if (pos > 0) {
      // Disallow \r or \n by truncating the string.
      st = str.substring(1, pos).replace(/\r?\n.*/, "")
      return ['"' + st + '"', st, tt.STRING, ""]
    } else {
      return [str, str.replace(/\r?\n.*/, ""), tt.STRING, ""]
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
    return [`#${st}`, `\\text{\\texttt{ \\#${st}}}`, tt.COMMENT, ""]
  }

  if (str.charAt(0) === "`") {
    // inline CSV string between back ticks, a data frame literal.
    pos = str.indexOf("`", 1)
    if (pos > 0) {
      st = str.slice(1, pos)
      return ["`" + st + "`", st, tt.STRING, ""]
    } else {
      return [str, str, tt.STRING, ""]
    }
  }

  if (str.charAt(0) === "'") {
    // String between single quotation marks. That signals a tt.QUANTITY.
    pos = str.indexOf("'", 1)
    if (pos > 0) {
      st = str.substring(1, pos)
      return ["'" + st + "'", st, tt.QUANTITY, ""]
    } else {
      return [str, str, tt.PRIME, ""]
    }
  }

  // Strings beginning with "\" are passed through as a TeX control word.
  matchObj = texFunctionRegEx.exec(str)
  if (matchObj) {
    // TeX control word, starting with backslash. e.g. \, or \circ
    const match = matchObj[0]
    st = match.substring(1)
    if (isIn(st, accents)) {
      return [match, match, tt.ACCENT, ""]
    }
    if (isIn(st, unaries)) {
      return [match, match, tt.UNARY, ""]
    }
    if (isIn(st, binaries)) {
      return [match, match, tt.BINARY, ""]
    }
    if (isIn(st, texREL)) {
      return [match, match, tt.REL, ""]
    }
    const texFunc = texFunctions[match]
    if (texFunc) {
      return cloneToken(texFunc)
    }
    // default case is a mathord. So I have not enumerated any ORDs
    return [match, match, tt.ORD, ""]
  }

  if (minusRegEx.test(str)) {
    if (isUnary(prevToken)) {
      // Check if the unary minus is part of a number
      const numParts = str.match(numberRegEx)
      if (numParts) {
        // numbers
        st = texFromNumStr(numParts, decimalFormat)
        return [numParts[0], st, tt.NUM, ""]
      }
    }
    return ["-", "-", tt.ADD, ""]
  }

  const numParts = str.match(numberRegEx)
  if (numParts) {
    // numbers
    st = texFromNumStr(numParts, decimalFormat)
    return [numParts[0], st, tt.NUM, ""]
  }

  // Before lexing for a word, find underscores before a group
  if (/^_[([{]/.test(str)) {
    return ["_", "_", tt.SUB, ""]
  }

  const word = lexOneWord(str, prevToken)
  if (word) { return cloneToken(word) }

  const nums = superRegEx.exec(str)
  if (nums) {
    return [nums[0], nums[0], tt.SUPCHAR, ""]
  }

  //return maximal initial substring of str that appears in misc names
  matchObj = miscRegEx.exec(str)
  if (matchObj) {
    const match = matchObj[0]
    for (let i = match.length; i >= 1; i--) {
      st = match.substr(0, i)
      if (miscSymbols[st]) { return cloneToken(miscSymbols[st]) }
    }
  }

  // No keywords were matched. Return 1 character.
  const c1 = str.charAt(0)
  if (c1 === "." && (prevToken.ttype === tt.VAR || prevToken.ttype === tt.LONGVAR ||
    prevToken.ttype === tt.STRING || prevToken.input === "]" ||
    prevToken.ttype === tt.PROPERTY)) {
    // Suppress the spacing of the accessor dot.
    return [".", "{.}", tt.ACCESSOR, ""]
  }
  return [c1, addTextEscapes(c1), tt.VAR, ""]
}
