import { inputRules, wrappingInputRule, textblockTypeInputRule,
        smartQuotes, emDash, ellipsis } from "prosemirror-inputrules"

// : (NodeType) → InputRule
// Given a blockquote node type, returns an input rule that turns `"> "`
// at the start of a textblock into a blockquote.
export function blockQuoteRule(nodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a number
// followed by a dot at the start of a textblock into an ordered list.
export function orderedListRule(nodeType) {
  return wrappingInputRule(
    /^(?:(\d+)|([A-Z])|([a-z]))\.\s$/,
    nodeType, match => ({
      class: match[2] ? "upper-alpha" : match[3] ? "lower-alpha" : "decimal",
      order: match[1]
        ? +match[1]
        : match[2]
        ? match[2].codePointAt(0) - 64
        : match[3].codePointAt(0) - 96
    }),
    (match, node) => match[1] ? node.childCount + node.attrs.order === +match[1] : false)
}

// : (NodeType) → InputRule
// Given a list node type, returns an input rule that turns a bullet
// (dash, plush, or asterisk) at the start of a textblock into a
// bullet list.
export function bulletListRule(nodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType)
}

// : (NodeType) → InputRule
// Given a code block node type, returns an input rule that turns a
// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType) {
  return textblockTypeInputRule(/^```$/, nodeType)
}

// : (NodeType, number) → InputRule
// Given a node type and a maximum level, creates an input rule that
// turns up to that number of `#` characters followed by a space at
// the start of a textblock into a heading whose level corresponds to
// the number of `#` signs.
export function headingRule(nodeType, maxLevel) {
  return textblockTypeInputRule(new RegExp("^(#{1," + maxLevel + "})\\s$"),
                                nodeType, match => ({ level: match[1].length }))
}

// : (Schema) → Plugin
// A set of input rules for creating the basic block quotes, lists,
// code blocks, and heading.
export function buildInputRules(schema) {
  let rules = smartQuotes.concat(ellipsis, emDash), type
  if (type = schema.nodes.blockquote) { rules.push(blockQuoteRule(type)) }
  if (type = schema.nodes.ordered_list) { rules.push(orderedListRule(type)) }
  if (type = schema.nodes.bullet_list) { rules.push(bulletListRule(type)) }
  if (type = schema.nodes.code_block) { rules.push(codeBlockRule(type)) }
  if (type = schema.nodes.heading) { rules.push(headingRule(type, 6)) }
  return inputRules({ rules })
}
