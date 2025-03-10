import { isValidIdentifier } from "./utils"

export const findWordAtClickPos = (str, clickPos) => {
  // Split the string into words and punctuation/symbols
  const words = str.split(/([\w\dı_\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133\uD835\uDC00-\udc33\udc9c-\udcb5′]+)/)
  let currentPos = 0
  for (let word of words) {
    currentPos += word.length
    if (clickPos < currentPos) {
      word = word.replace(/^\d/, "")
      return isValidIdentifier.test(word) ? word : null
    }
  }
  return null
}

export const positionOfDefinition = (word, doc, nodePos) => {
  let definitionPos = -1
  doc.nodesBetween(0, nodePos, function(node, pos) {
    if (node.type.name === "calculation" && node.attrs.name && node.attrs.name === word) {
      definitionPos = pos
    }
  })
  return definitionPos
}
