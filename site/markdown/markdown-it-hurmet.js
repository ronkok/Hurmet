'use strict'
const hurmet = require('../hurmet.min.js')

// I use a modified version of markdown-it.
// I added one character, ¢, to the list of terminator characters in
// markdown-it/lib/rules_inline/text.js

const regEx = /^¢([^\s\\]|[^¢]+[^\\])¢/

const hurmetInline = (state, silent) => {
  const pos = state.pos
  const str = state.src
  if (str.charCodeAt(pos) !== 0xA2/* ¢ */) { return false }
  const prev = pos === 0 ? false : str.charCodeAt(pos - 1)
  // Previous character may not be a backslash or a numeral [0-9]
  if (prev && (prev === 0x5C || (0x2F < prev && prev < 0x39))) { return false }
  const match = regEx.exec(str.slice(pos))
  if (!match) { return false }
  if (!silent) {
    const token = state.push('hurmet_inline', 'math', 0)
    token.content = match[1]
    token.markup = '¢'
  }
  state.pos += match[0].length
  return match
}

function hurmetMath(md) {
  md.inline.ruler.before('escape', 'hurmet_inline', hurmetInline)

  // The next line is used only to do Hurmet documentation.
  // I convert here from Hurmet to TeX, then a client-side script converts to HTML.
  // TODO: After Chromium reads MathML, convert to MathML in this script.
  md.renderer.rules['hurmet_inline'] = (tokens, i) => {
    return "<span class='tex'>" + hurmet.parse(tokens[i].content) + "</span>"
  }
}

module.exports = hurmetMath
