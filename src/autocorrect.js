// autocorrect.js

const autoCorrectRegEx = /([!?:<>\-~/_]=| \.|~~|\+-|-\+|<-->|<->|<>|<--|<-|-->|->|=>|-:|\^\^|\|\||\/\/\/|\b(bar|hat|vec|tilde|dot|ddot|ul)|\b(bb|bbb|cc|ff|ss) [A-Za-z]|\\?[A-Za-z]{2,}|\\c|\\ |\\o|root [234]|<<|>>|\^-?[0-9]+|\|\|\||\/_|''|""|00)\s$/

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
}

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
  "contains": "⊆",
  "owns": "∋",
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
}

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
}

const superscript = str => {
  let superChar = ""
  for (const ch of str) {
    superChar += supCharFromNum[ch]
  }
  return superChar
}

const lowSurrogateDiff = {
  // captital diff, lower case diff
  bb: [0xdbbf, 0xdbb9], //  bold
  bbb: [0xdcf7, 0xdcf1], // blackboard bold
  cc: [0xdc5b, 0xdc55], // calligraphic
  ff: [0xdd5f, 0xdd59] //   sans-serif
}

// 7 blackboard bold characters (ℂ, ℍ, ℕ, ℙ, ℚ, ℝ, ℤ) have Unicode code points in the
// basic multi-lingual plane. So they must be treated differently than the other
// blackboard bold characters. Eleven calligraphic characters work the same way.
const wideExceptions = [0xdd3a, 0xdd3f, 0xdd45, 0xdd47, 0xdd48, 0xdd49, 0xdd51, // bbb
  0xdc9d, 0xdca0, 0xdca1, 0xdca3, 0xdca4, 0xdca7, 0xdca8, // calligraphic
  0xdcad, 0xdcba, 0xdcbc, 0xdcc1, 0xdcc4]

const bbb = {
  C: "\u2102",
  H: "\u210D",
  N: "\u2115",
  P: "\u2119",
  Q: "\u211A",
  R: "\u211D",
  Z: "\u2124"
}
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
}

const accentedChar = str => {
  const posSpace = str.indexOf(" ")
  const ch = str.substring(posSpace + 1)
  const accentName = str.substring(0, posSpace)
  switch (accentName) {
    case "bb": // bold
    case "bbb": // blackboard bold
    case "cc": // caligraphic
    case "ff": { // sans-serif
      const code = ch.charCodeAt(0)
      let newChar = ""
      if (code < 0x0041 || code > 0x007a) { return null }
      const isSmall = code < 0x005b ? 0 : 1
      if (accentName === "cc" && isSmall && code !== 0x006c) { return null }
      if (code > 0x005a && accentName === "bbb") { return null }
      const lowSurrogate = code + lowSurrogateDiff[accentName][isSmall]
      if (wideExceptions.includes(lowSurrogate)) {
        newChar = accentName === "bbb" ? bbb[ch] : calligraphic[ch]
      } else {
        newChar = "\uD835" + String.fromCharCode(lowSurrogate)
      }
      return newChar
    }

    default:
      return null
  }
}

export const autoCorrect = (jar, preText, postText) => {
  // Auto-correct math in real time.
  // jar is an instance of a CodeJar editing box.
//  const pos = doc.getCursor()
  if (preText.length > 0 && preText.slice(-1) === " ") {
    // Auto-correct only after the user hits the space bar.
    const matches = autoCorrectRegEx.exec(preText)
    if (matches) {
      const word = matches[0].slice(0, -1) // Trim the final space.
      let correction
      const accent = accents[word]
      if (accent) {
        const newStr = preText.slice(0, -(matches[0].length + 1)) + accent
        jar.updateCode(newStr + postText)
        // Move the cursor to the correct location
        const L = newStr.length
        jar.restore({ start: L, end: L, dir: undefined })
      } else {
        correction = autoCorrections[word] // Check for a match in the lookup table.
        if (!correction) {
          // No perfect match in the lookup table. Try for a superscript or an accent.
          if (word.charAt(0) === "^") {
            correction = superscript(word) // e.g. x²
          } else {
            if (word.indexOf(" ") > 0) {
              // accented char or Unicode character. E.g. bar y   or   bb M
              correction = accentedChar(word)
            }
          }
        }
      }
      if (correction) {
        const newStr = preText.slice(0, -matches[0].length) + correction
        jar.updateCode(newStr + postText)
        // Move the cursor to the correct location
        const L = newStr.length
        jar.restore({ start: L, end: L, dir: undefined })
      }
    }
  }
}
