import { clone } from "./utils"

// Items related to pagination and Table of Contents

const headsRegEx = /^H[1-6]$/
const levelRegEx = /(\d+)(?:[^\d]+(\d+))?/
const lists = ["OL", "UL"]
const blockRegEx = /^(centered|indented|right_justified)$/
const headingRegEx = /^H[1-6]$/
export const forToC = 0
export const forPrint = 1

const findTOC = doc => {
  // Called by a print event.
  // Is there a Table of Contents node?
  let tocNode = undefined
  let nodePos = 0
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "toc") {
      tocNode = node
      nodePos = pos
    }
  })
  return [tocNode, nodePos]
}

export const tocLevels = entry => {
  // Determine the start and end heading levels
  const parts = entry.match(levelRegEx)
  const startLevel = Number(parts[1])
  const endLevel = Number(parts[2] ? parts[2] : startLevel)
  return [startLevel, endLevel]
}

export const renderToC = (tocArray, ul) => {
  // Called by schema.js. Renders a Table of Contents.
  ul.innerHTML = ""
  ul.className = "toc"
  for (const item of tocArray) {
    const li = document.createElement("li")
    if (item[1] > 0) { li.style.marginLeft = String(1.5 * item[1]) + "em" }
    const title = document.createElement("span")
    title.textContent = item[0].trim()
    li.appendChild(title)
    const pageNum = document.createElement("span")
    pageNum.textContent = String(item[2]).trim()
    li.appendChild(pageNum)
    ul.appendChild(li)
  }
}

const doesNotFit = (iNext, editor, pageHeight, top) => {
  if (iNext >= editor.children.length - 1) { return false }
  const element = editor.children[iNext];
  if (pageHeight > bottomOf(element) - top) { return false }
  if (element.children.length > 1 && (lists.includes(element.tagName) ||
         (element.tagName === "DIV" && blockRegEx.test(element.className)))) {
    const firstBot = bottomOf(element.children[0])
    return (firstBot - top > pageHeight)
  } else {
    return true
  }
}

const bottomOf = element => {
  let bottom = element.getBoundingClientRect().bottom
  const images = element.getElementsByTagName("img")
  for (let i = 0; i < images.length; i++) {
    bottom = Math.max(bottom, images[i].getBoundingClientRect().bottom)
  }
  const svgs = element.getElementsByTagName("svg")
  for (let i = 0; i < svgs.length; i++) {
    bottom = Math.max(bottom, svgs[i].getBoundingClientRect().bottom)
  }
  return bottom
}

export const findPageBreaks = (view, state, purpose, tocSchema, startLevel, endLevel = 0) => {
  const doc = state.doc
  const headerExists = doc.nodeAt(0).type.name === "header"
  let tocNode
  let nodePos = 0
  if (purpose === forPrint) {
    [tocNode, nodePos] = findTOC(doc)
    if (tocNode) {
      startLevel = tocNode.attrs.start
      endLevel = tocNode.attrs.end
    }
  }
  let tocRegEx
  if (endLevel > 0) {
    let targetStr = "^("
    for (let i = startLevel; i <= endLevel; i++) {
      targetStr += "H" + i + "|"
    }
    targetStr = targetStr.slice(0, -1) + ")$"
    tocRegEx = targetStr.length > 0 ? RegExp(targetStr) : null
  }
  const tocArray = []
  const destination = document.getElementById("print-div")
  const frag = document.createDocumentFragment()
  let header
  let pageHeight = doc.attrs.pageSize === "letter" ? 11 * 96 : 297 / 25.4 * 96
  if (headerExists) {
    // eslint-disable-next-line max-len
    header = document.getElementsByTagName("header")[0].childNodes[0].childNodes[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace("$PAGE", '<span class="page-display"></span>')
    const headerRect = document.getElementsByTagName("header")[0].getBoundingClientRect()
    pageHeight = pageHeight - 121 /* 16 mm margins*/  -  (headerRect.bottom - headerRect.top)
  } else {
    pageHeight = pageHeight - 121
  }

  const numPasses = purpose === forPrint ? 2 : 1

  let packet = [];
  destination.innerHTML = ""

  for (let iPass = 0; iPass < numPasses; iPass++) {
    const [editor] = document.getElementsByClassName("ProseMirror-example-setup-style")
    const source = editor.cloneNode(true)
    const numEls = source.childNodes.length
    let prevElement = { index: headerExists ? 0 : -1, all: true }
    let iStart = prevElement.all ? prevElement.index + 1 : prevElement.index
    let pageNum = 1  // Loop will increment pageNum. Odd numbers will be on recto side.
    while (iStart < numEls) {
      const top = prevElement.all
        ? editor.children[iStart].getBoundingClientRect().top
        : editor.children[iStart].children[prevElement.end].getBoundingClientRect().top
      packet = [];

      // Iterate on the top level elements. Check the bottom coordinate of each.
      for (let i = iStart; i < numEls; i++) {
        const element = editor.children[i]; // A top level element.
        let elementData = { index: i, all: true }

        if (i === iStart && !prevElement.all) {
          // Continue to print a block that was begun on the previous page.
          elementData = { index: i, all: false, tag: element.tagName,
            class: element.className, start: prevElement.end }
          for (let j = prevElement.end; j < element.children.length; j++) {
            const bot = bottomOf(element.children[j])
            if (bot - top > pageHeight) {
              elementData.end = j - 1
              break
            }
          }
          if (!elementData.end) { elementData.end = element.children.length }
          packet.push(elementData)
          if (elementData.end < element.children.length) {
            break
          } else {
            continue
          }
        }

        if (element.tagName === "H1" &&
            element.getBoundingClientRect().top - top > 0.75 * pageHeight) {
          // prevent an H1 near the bottom of the
          element.style.breakBefore = "page"
          break
        }
        if (headingRegEx.test(element.tagName)) {
          if (doesNotFit(i + 1, editor, pageHeight, top)) { // Prevent a heading orphan
            element.style.breakBefore = "page"
            break
          }
        }

        const bottom = bottomOf(element)
        if (pageHeight > bottom - top) {
          packet.push(elementData)
        } else {
          // element runs past the bottom of the page.
          // Check if element is a list or an (indented|centered) div
          if (element.children.length > 1 && (lists.includes(element.tagName) ||
          (element.tagName === "DIV" && blockRegEx.test(element.className)))) {
            const firstBot = bottomOf(element.children[0])
            if (firstBot - top > pageHeight) {
              if (headsRegEx.test(editor.children[i - 1].tagName)) {
                packet.pop()
                if (iPass === 0 && tocRegEx && tocRegEx.test(editor.children[i - 1].tagName)) {
                  tocArray.pop()
                }
              }
              break
            }
            for (let j = 0; j < element.children.length; j++) {
              const bot = bottomOf(element.children[j])
              if (bot - top > pageHeight) {
                elementData = { index: i, all: false, tag: element.tagName,
                  class: element.className, start: 0, end: j - 1 }
                break
              }
            }
            if (elementData.end < element.children.length) {
              packet.push(elementData)
              break
            }
          }
          if (headsRegEx.test(editor.children[i - 1].tagName)) {
            packet.pop()
            if (iPass === 0 && tocRegEx && tocRegEx.test(editor.children[i - 1].tagName)) {
              tocArray.pop()
            }
          }
          break
        }
        if (iPass === 0 && tocRegEx && tocRegEx.test(element.tagName)) {
          const level = Number(element.tagName.slice(1)) - startLevel
          tocArray.push([element.textContent, level, pageNum])
        }
      }

      // The loop has found enough elements to fill a page.
      if (purpose === forPrint && iPass === 1) {
        // Copy the identified elements to the destination div.
        if (headerExists && pageNum > 1) {
          frag.append(header.cloneNode(true))
        }
        // Create a body div
        const div = document.createElement("div")
        div.className = "print-body"
        for (const elementData of packet) {
          const i = elementData.index
          if (elementData.all) {
            div.append(source.children[i].cloneNode(true))
          } else {
            const el = document.createElement(elementData.tag)
            if (elementData.class) { el.className = elementData.class }
            if (elementData.tag === "OL" && elementData.start > 0) {
              el.setAttribute("start", elementData.start)
            }
            for (let j = elementData.start; j < elementData.end; j++) {
              el.append(source.children[i].children[j].cloneNode(true))
            }
            div.append(el)
          }
        }
        frag.append(div)
        destination.append(frag)
      }
      prevElement = clone(packet[packet.length - 1])
      iStart = prevElement.all ? prevElement.index + 1 : prevElement.index
      pageNum += 1
    }
    if (purpose === forPrint && tocNode && iPass === 0) {
      // Write a TOC into the document, so that pagination will be correct.
      const attrs = {
        start: tocNode.attrs.start,
        end: tocNode.attrs.end,
        body: tocArray
      }
      const tr = state.tr
      tr.replaceWith(nodePos, nodePos + 1, tocSchema.createAndFill(attrs))
      view.dispatch(tr)
    }
  }
  // That concludes the loop.
  if (purpose === forToC) {
    return tocArray
  }
}
