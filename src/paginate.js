import { clone } from "./utils"
import { tagName, sanitizeText } from "./md2html"

// Items related to pagination and Table of Contents

const headsRegEx = /^H[1-6]$/
const levelRegEx = /(\d+)(?:[^\d]+(\d+))?/
const lists = ["OL", "UL"]
const blockRegEx = /^(centered|indented|right_justified)$/
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

const footnoteContents = textNodes => {
  let text = ""
  let innerHTML = ""
  for (const node of textNodes) {
    text += node.text
    let span = sanitizeText(node.text)
    for (const mark of node.marks) {
      const tag = tagName[mark.type.name];
      span = `<${tag}>${span}</${tag}>`
    }
    innerHTML += span
  }
  return { text, innerHTML }
}

const getTop = (editor, pageData) => {
  // Find the y-coordinate at the top of the next page
  const prevElement = pageData[pageData.length - 1];
  const iStart = prevElement.all ? 0 : prevElement.end + 1
  const top = prevElement.all
    ? editor.children[prevElement.index + 1].getBoundingClientRect().top
    : editor.children[prevElement.index].children[iStart].getBoundingClientRect().top
  return top
}

const increment = oldPageData => {
  const pageData = clone(oldPageData)
  pageData.start = pageData.end
  pageData.end += 1
  return pageData
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
  const tocArray = [];
  let header
  // Note: 1 inch = 96 px
  let grossPageHeight = doc.attrs.pageSize === "letter" ? 11 * 96 : 297 / 25.4 * 96
  grossPageHeight = grossPageHeight - 121   // 16 mm margins
  let pageHeight = grossPageHeight          // w/o accounting for header
  let headerHeight = 0
  if (headerExists) {
    // eslint-disable-next-line max-len
    header = document.getElementsByTagName("header")[0].children[0].children[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace(
      "$PAGE",
      '&nbsp;<span class="page-display"></span>'
    )
    const headerRect = document.getElementsByTagName("header")[0].getBoundingClientRect()
    headerHeight = headerRect.bottom - headerRect.top
  }

  // Spin up a canvas for measurement of footnote width
  const measurementCanvas = document.createElement('canvas')
  const ctx =  measurementCanvas.getContext('2d')
  ctx.font = `${String(doc.attrs.fontSize)}pt Calibri, san-serif`
  const lineBoxHeight = doc.attrs.fontSize === 12 ? 19.2 : 16
  const footnoteBotMargin = doc.attrs.fontSize === 12 ? 16 : 13.333

  // Get the content of each footnote
  const footnotes = [];
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "footnote") {
      footnotes.push(footnoteContents(node.content.content))
    }
  })

  // A closed function for checking footnote height
  const checkFootnotes = (element, noteBlockHeight) => {
    // Check for footnote(s) in the element
    const local = { numFootnotes: 0, deltaBlock: 0 }
    const footnoteNodeList = element.querySelectorAll("footnote")
    if (footnoteNodeList.length > 0) {
      local.deltaBlock += noteBlockHeight === 0 ? 25 : 0 // <hr> is 25 px high
      // eslint-disable-next-line no-unused-vars
      for (const node of footnoteNodeList) {
        const text = footnotes[numFootnotes].text;
        // A footnote has 620 px available width. We'll use 615 to allow for text styles.
        const numLines = Math.ceil(ctx.measureText(text).width / 615)
        local.deltaBlock += (numLines * lineBoxHeight) + footnoteBotMargin
        local.numFootnotes += 1
      }
    }
    return local
  }

  // A second closed function, to split the elements into pages.
  const pageSplit = (iParent, iStart, iPass, pageData, elementData, top) => {
    const elements = iParent === null ? editor.children : editor.children[iParent].children;
    for (let i = iStart; i < elements.length; i++) {
      const el = elements[i];
      elementData = (iParent === null) ? { index: i, all: true } : elementData

      if (iParent === null && el.children.length > 1 && (lists.includes(el.tagName) ||
             (el.tagName === "DIV" && blockRegEx.test(el.className)))) {
        elementData.all = false
        elementData.start = 0
        elementData.end = 0
        elementData.tagName = el.tagName
        elementData.className = el.className
        elementData.breaks = [];
        // Recursive call. Loop thru the children of the current top-level element.
        [pageData, top] = pageSplit(i, 0, iPass, pageData, elementData, top)
        continue

      } else {
        if (el.tagName === "H1" && el.getBoundingClientRect().top - top > 0.75 * pageHeight) {
          // prevent an H1 near the bottom of the page
          if (purpose === forPrint && iPass === 1) {
            pageHeight = populatePage(pageData, gap)
          }
          top = getTop(editor, pageData);
          pageData = [elementData];
          [noteBlockHeight, prevNumNotes, pageNum] = [0, numFootnotes, pageNum + 1];
          if (iParent !== null) { elementData = increment(elementData) }
          if (iPass === 0 && tocRegEx && tocRegEx.test(el.tagName)) {
            const level = Number(el.tagName.slice(1)) - startLevel
            tocArray.push([el.textContent, level, pageNum])
          }
          continue
        }

        if (headsRegEx.test(el.tagName)) {
          // This element is a heading.
          // Look ahead one element. Prevent a heading orphan.
          let nextFits = true  // default
          if (i + 1 === elements.length) {
            nextFits = true
          } else {
            const element = elements[i + 1];
            let next = checkFootnotes(element, noteBlockHeight)
            if (pageHeight - (noteBlockHeight + next.deltaBlock) > bottomOf(element) - top) {
              nextFits = true
            } else if (element.children.length > 1 && (lists.includes(element.tagName) ||
                   (element.tagName === "DIV" && blockRegEx.test(element.className)))) {
              const firstBot = bottomOf(element.children[0])
              next = checkFootnotes(element.children[0], noteBlockHeight)
              nextFits = (firstBot - top > pageHeight - (noteBlockHeight + next.deltaBlock))
            } else {
              nextFits = false
            }
          }
          if (!nextFits) {
            if (!headerExists) {
              if (iParent === null) {
                elementData.breakBefore = true
              } else {
                elementData.breaks.push(i)
              }
            }
            if (purpose === forPrint && iPass === 1) {
              pageHeight = populatePage(pageData, gap)
            }
            top = getTop(editor, pageData)
            pageData = [elementData];
            [noteBlockHeight, prevNumNotes, pageNum] = [0, numFootnotes, pageNum + 1];
            if (iParent !== null) { elementData = increment(elementData) }
            if (iPass === 0 && tocRegEx && tocRegEx.test(el.tagName)) {
              const level = Number(el.tagName.slice(1)) - startLevel
              tocArray.push([el.textContent, level, pageNum])
            }
            continue
          }
        }

        const bottom = bottomOf(el)
        const local = checkFootnotes(el, noteBlockHeight)

        if (pageHeight - (noteBlockHeight + local.deltaBlock) > bottom - top) {
          numFootnotes += local.numFootnotes
          noteBlockHeight += local.deltaBlock
          if (iParent === null) {
            pageData.push(elementData)
          } else {
            elementData.end += 1
          }
          // Update the gap between the text and the footnote block
          gap = pageHeight - noteBlockHeight - (bottom - top)
        } else {
          if (purpose === forPrint && iPass === 1) {
            if (iParent !== null) { pageData.push(clone(elementData)) }
            pageHeight = populatePage(pageData, gap)
          }
          top = getTop(editor, pageData);
          if (iParent !== null) { elementData.start = i }
          pageData = [clone(elementData)];
          [noteBlockHeight, prevNumNotes, pageNum] = [0, numFootnotes, pageNum + 1];
          if (iParent !== null) { elementData = increment(elementData) }
        }

        if (iPass === 0 && tocRegEx && tocRegEx.test(el.tagName)) {
          const level = Number(el.tagName.slice(1)) - startLevel
          tocArray.push([el.textContent, level, pageNum])
        }
      }
    }
    if (iParent !== null) {
      if (elementData.start === 0 &&
          elementData.end === editor.children[iParent].children.length) {
        elementData.all = true // Transfer in one block
      }
      pageData.push(elementData)
    } else if (purpose === forPrint && iPass === 1) {
      pageHeight = populatePage(pageData, gap)
    }
    return [pageData, top]
  }

  // A third closed function, to create one printed page.
  const populatePage = (pageData, gap) => {
    // Copy the identified elements to the destination div.
    const page = document.createDocumentFragment()
    if (headerExists && pageNum > 1) {
      page.append(header.cloneNode(true))
    }
    // Create a body div
    const div = document.createElement("div")
    div.className = "print-body"
    for (const elementData of pageData) {
      const i = elementData.index
      if (elementData.all) {
        div.append(editor.children[i].cloneNode(true))
        if (elementData.breakBefore) {
          div.lastChild.style.breakBefore = "page"
        }
      } else {
        const el = document.createElement(elementData.tagName)
        if (elementData.className) { el.classList.add(elementData.className) }
        if (elementData.breaks.includes(i)) { el.style["break-before"] = "page" }
        if (elementData.tagName === "OL" && elementData.start > 0) {
          el.setAttribute("start", elementData.start)
        }
        for (let j = elementData.start; j < elementData.end; j++) {
          el.appendChild(editor.children[i].children[j].cloneNode(true))
        }
        div.append(el)
      }
    }
    page.append(div)
    if (numFootnotes > prevNumNotes) {
      // Write footnotes at the bottom of the page.
      if (gap > 0) {
        const spacer = document.createElement("div")
        spacer.style.height = (gap - 2) + "px"
        page.append(spacer)
      }
      page.append(document.createElement("hr"))
      const ol = document.createElement("ol")
      if (prevNumNotes > 0) {
        ol.setAttribute("start", String(prevNumNotes + 1))
      }
      for (let j = prevNumNotes; j < numFootnotes; j++) {
        const graf = document.createElement("p")
        graf.innerHTML = footnotes[j].innerHTML
        const li = document.createElement("li")
        li.appendChild(graf)
        ol.appendChild(li)
      }
      page.append(ol)
      prevNumNotes = numFootnotes
    }
    destination.append(page)
    return grossPageHeight - headerHeight
  }

  // Now that the closed functions are written, proceed to pagination
  const [editor] = document.getElementsByClassName("ProseMirror-setup")
  const destination = document.getElementById("print-div")
  destination.innerHTML = ""
  let numFootnotes = 0
  let prevNumNotes = 0
  let noteBlockHeight = 0
  let gap = 0
  let pageNum = 1

  // For printing, make two passes of the next loop.
  //   (0) Update the Table of Contents.
  //   (1) Copy elements to the print div.
  // Otherwise, one pass to populate the table of contents.
  const numPasses = purpose === forPrint ? 2 : 1
  for (let iPass = 0; iPass < numPasses; iPass++) {
    const iStart = headerExists ? 1 : 0
    const top = editor.children[0].getBoundingClientRect().top

    pageSplit(null, iStart, iPass, [], null, top)

    if (iPass === 0 && purpose === forPrint && tocNode) {
      // Write a Table of Contents into the document, with correct page numbers.
      const attrs = {
        start: tocNode.attrs.start,
        end: tocNode.attrs.end,
        body: tocArray
      }
      const tr = state.tr
      tr.replaceWith(nodePos, nodePos + 1, tocSchema.createAndFill(attrs))
      view.dispatch(tr)
    }
    pageNum = 1
    numFootnotes = 0
    prevNumNotes = 0
    noteBlockHeight = 0
  }

  if (purpose === forToC) {
    return tocArray
  }
}
