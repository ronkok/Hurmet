import { tagName, sanitizeText } from "./md2html"

// Items related to pagination and Table of Contents

const headsRegEx = /^H[1-6]$/
const levelRegEx = /(\d+)(?:[^\d]+(\d+))?/
export const forToC = 0
export const forPrint = 1

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

const findTOC = doc => {
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

export const tocLevels = (entry, attrs) => {
  // Determine the start and end heading levels
  const parts = entry.match(levelRegEx)
  attrs.tocStartLevel = Number(parts[1])
  attrs.tocEndLevel = Number(parts[2] ? parts[2] : attrs.tocStartLevel)
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

const getDraftTocArray = (doc, attrs) => {
  const tocArray = [];
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "heading" && attrs.tocStartLevel <= node.attrs.level
                                     && node.attrs.level <= attrs.tocEndLevel) {
      tocArray.push([node.textContent, node.attrs.level, -1])
    }
  })
  return tocArray
}

const numHeads = (fragment, attrs) => {
  if (attrs.tocEndLevel === 0) { return 0 }
  let numHeadings = 0
  for (let i = attrs.tocStartLevel; i <= attrs.tocEndLevel; i++) {
    const headings = fragment.getElementsByTagName("H" + String(i))
    numHeadings += headings.length
  }
  return numHeadings
}

// Check footnote height
const getElementFootnoteData = (element, attrs, ctx ) => {
  // Check for footnote(s) in the element
  attrs.ftNote.numFtNotesInElem = 0
  attrs.ftNote.elemNotesHeight = 0
  const footnoteNodeList = element.querySelectorAll("footnote")
  if (footnoteNodeList.length > 0) {
    if (attrs.ftNote.end === -1) {
      // The current page has no previous footnotes.
      attrs.ftNote.elemNotesHeight += attrs.ftNote.hrHeight  // For the <hr>
      attrs.ftNote.end = attrs.ftNote.start - 1
    }
    for (let i = attrs.ftNote.totalNum;
             i < attrs.ftNote.totalNum + footnoteNodeList.length; i++) {
      const text = attrs.footnotes[i].text;
      // A footnote has 620 px available width. We'll use 615 to allow for text styles.
      const numLines = Math.ceil(ctx.measureText(text).width / 615)
      attrs.ftNote.elemNotesHeight += (numLines * attrs.ftNote.lineBoxHeight) +
                                       attrs.ftNote.botMargin
      attrs.ftNote.numFtNotesInElem += 1
    }
  }
}

const isOrphan = (nextElement, attrs) => {
  // Is nextElement an orphan?
  if (!nextElement) { return false }
  const rect = nextElement.getBoundingClientRect()
  if (attrs.pageHeight - attrs.headerHeight - attrs.ftNote.pageNotesHeight -
      attrs.minElemHeight - attrs.tocAdjustment <  rect.top - attrs.pageTop) {
    return true
  }
  if (nextElement.tagName === "DIV" && nextElement.className === "tableWrapper") {
    if (attrs.pageHeight - attrs.headerHeight - attrs.ftNote.pageNotesHeight -
      attrs.tocAdjustment < rect.bottom - attrs.pageTop) {
      return true
    }
  }

  let imageBottom = rect.top
  const images = nextElement.getElementsByTagName("img")
  if (images.length > 0) {
    imageBottom = images[0].getBoundingClientRect().bottom
  }
  const svgs = nextElement.getElementsByTagName("svg")
  if (svgs.length > 0) {
    imageBottom = Math.max(imageBottom, svgs[0].getBoundingClientRect().bottom)
  }
  return (attrs.pageHeight - attrs.headerHeight - attrs.ftNote.pageNotesHeight -
          attrs.tocAdjustment < imageBottom - attrs.pageTop)
}

const populatePage = (startElement, endElement, header, destination, attrs) => {
  // Create a page in `print-div` and populate it with elements.
  const page = document.createDocumentFragment()
  if (header && attrs.pageNum > 0) {
    const printHeader = header.cloneNode(true)
    printHeader.style.breakBefore = "page"
    page.append(printHeader)
  }
  // Create a body div
  const printBody = document.createElement("div")
  printBody.className = "print-body"
  if (!(header && attrs.pageNum > 0)) {
    printBody.style.breakBefore = "page"
  }

  // Define the appropriate range of elements and append a copy of the range.
  const range = new Range()

  if (attrs.pageTopChild === -1 || (attrs.pageTopChild === 0 && attrs.pageTopOffset === 0)) {
    range.setStartBefore(startElement)
  } else {
    range.setStart(startElement.childNodes[attrs.pageTopChild], attrs.pageTopOffset)
  }
  if (attrs.pageBottomChild === -1) {
    range.setEndAfter(endElement)
  } else {
    range.setEnd(endElement.childNodes[attrs.pageBottomChild], attrs.pageBottomOffset)
  }

  printBody.appendChild(range.cloneContents())
  if (attrs.listIndex >= 0) {
    // The page break occurred in the middle of an ordered list. Fix the start.
    const lists = printBody.getElementsByTagName("OL")
    lists[0].setAttribute("start", String(attrs.listIndex + 2))
  }
  page.appendChild(printBody)

  // Update table of contents array
  const numHeadingsInThisPage = numHeads(printBody, attrs)
  if (numHeadingsInThisPage > 0) {
    let j = 0
    for (let i = 0; i < attrs.tocArray.length; i++) {
      if (attrs.tocArray[i][2] === -1) { j = i; break }
    }
    for (let i = 0; i < numHeadingsInThisPage; i++) {
      attrs.tocArray[j][2] = attrs.pageNum
      j += 1
    }
  }

  if (attrs.ftNote.end >= 0) {
    // Write footnotes at the bottom of the page.
    const bodyHeight = endElement.getBoundingClientRect().bottom - attrs.pageTop
    const gap = attrs.pageHeight - attrs.headerHeight - bodyHeight -
                attrs.ftNote.pageNotesHeight
    if (gap > 0) {
      const spacer = document.createElement("div")
      spacer.style.height = (gap - 2) + "px"
      page.append(spacer)
    }
    page.append(document.createElement("hr"))
    const ol = document.createElement("ol")
    if (attrs.ftNote.start > 0) {
      ol.setAttribute("start", String(attrs.ftNote.start + 1))
    }
    for (let j = attrs.ftNote.start; j <= attrs.ftNote.end; j++) {
      const graf = document.createElement("p")
      graf.innerHTML = attrs.footnotes[j].innerHTML
      const li = document.createElement("li")
      li.appendChild(graf)
      ol.appendChild(li)
    }
    page.append(ol)
  }
  // Append the page
  destination.append(page)

  // Check if the ending page break occcurred in the middle of an ordered list
  attrs.listIndex = (endElement.tagName === "LI" && endElement.parentElement.tagName === "OL")
    ? [...endElement.parentElement.children].indexOf(endElement)
    : -1
  return
}

const turnThePage = (topElement, attrs, editor) => {
  // Set some values for the next page.
  attrs.headerHeight = attrs.stdHdrHeight
  attrs.ftNote.pageNotesHeight = 0
  attrs.ftNote.start = attrs.ftNote.totalNum
  attrs.ftNote.end = -1
  attrs.pageNum += 1
  if (topElement) {
    if (attrs.pageBottomChild >= 0 && attrs.pageBottomOffset > 0) {
      const range = new Range()
      const textNode = topElement.childNodes[attrs.pageBottomChild];
      range.setStart(textNode, attrs.pageBottomOffset)
      range.setEnd(textNode, attrs.pageBottomOffset + 1)
      attrs.pageTop = range.getBoundingClientRect().top
      attrs.topMargin = 0
    } else {
      attrs.pageTop = topElement.getBoundingClientRect().top
      const computedStyle = window.getComputedStyle(topElement)
      attrs.topMargin = computedStyle.marginTop
    }
  }  else {
    attrs.pageTop = editor.getBoundingClientRect().bottom
  }
  /*attrs.pageTop = topElement
    ? topElement.getBoundingClientRect().top
    : editor.getBoundingClientRect().bottom */
  attrs.pageTopChild = attrs.pageBottomChild
  attrs.pageTopOffset = attrs.pageBottomOffset
  attrs.pageBottomChild = -1
  attrs.pageBottomOffset = 0
  return [topElement, null]
}

export function paginate(view, tocSchema, purpose, tocStartLevel, tocEndLevel) {

  // This closed function is recursive. It will work thru the entire doc.
  function processChildren(element) {
    const children = element.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const bottom = bottomOf(child)
      attrs.tocAdjustment = 0
      if (mustAdjustToC && attrs.pageTop <= attrs.tocTop && attrs.tocTop < bottom) {
        attrs.tocAdjustment = deltaToC
      }
      const rect = child.getBoundingClientRect()
      // Get the next element in the doc
      let el = child
      let nextElement = el.nextElementSibling
      while (nextElement === null && el.className !== "editor") {
        el = el.parentElement
        nextElement = el.nextElementSibling
      }
      // Find out if child contains any footnotes.
      getElementFootnoteData(child, attrs, ctx)

      if (child.tagName === "H1" && rect.top - attrs.pageTop > 0.75 * attrs.pageHeight) {
        // Prevent an H1 heading near the bottom of the page. Start a new page.
        populatePage(startElement, endElement, header, destination, attrs)
        ;[startElement, endElement] = turnThePage(child, attrs, editor)

      } else if (headsRegEx.test(child.tagName) && isOrphan(nextElement, attrs)) {
        // Prevent a heading directly above an orphan. Start a new page.
        populatePage(startElement, endElement, header, destination, attrs)
        ;[startElement, endElement] = turnThePage(child, attrs, editor)

      } else if ((child.tagName === "OL" || child.tagName === "UL") &&
                  rect.botton - attrs.pageTop < 32) {
        // Prevent a list orphan. Insist on more than one item on a page.
        populatePage(startElement, endElement, header, destination, attrs)
        ;[startElement, endElement] = turnThePage(child, attrs, editor)

      } else if (attrs.pageHeight - attrs.headerHeight - attrs.ftNote.pageNotesHeight -
                 attrs.ftNote.elemNotesHeight >= bottom + attrs.tocAdjustment -
                 attrs.pageTop) {
        // Add this element to the printed page.
        endElement = child
        attrs.ftNote.pageNotesHeight += attrs.ftNote.elemNotesHeight
        attrs.ftNote.totalNum += attrs.ftNote.numFtNotesInElem
        attrs.ftNote.end += attrs.ftNote.numFtNotesInElem

      } else if ((child.tagName !== "P" && child.tagName !== "PRE") &&
        !(child.tagName === "DIV" && child.className === "tableWrapper")) {
        // Examime the children of this element. Maybe some of them fit onto the page.
        processChildren(child) // A recursive call.

      } else if ((child.tagName === "P" || child.tagName === "PRE") && rect.height > 64) {
        // We may break in the middle of a long paragraph.
        const elem = child.tagName === "PRE" ? child.childNodes[0] : child
        const yMax = attrs.pageTop + attrs.pageHeight - attrs.headerHeight -
                     attrs.ftNote.pageNotesHeight - attrs.ftNote.elemNotesHeight -
                     attrs.tocAdjustment
        const [childIndex, offset] = findParagraphOverflowPoint(elem, yMax)
        if (childIndex === -1 || (childIndex === 0 && offset === 0)) {
          // Put the entire paragraph onto the next page
          populatePage(startElement, endElement, header, destination, attrs)
          ;[startElement, endElement] = turnThePage(child, attrs, editor)
        } else {
          // Split the paragraph
          attrs.pageBottomChild = childIndex
          attrs.pageBottomOffset = offset
          populatePage(startElement, child, header, destination, attrs)
          ;[startElement, endElement] = turnThePage(child, attrs, editor)
        }

      } else {
        // Wrap up the current page and start a new page.
        populatePage(startElement, endElement, header, destination, attrs)
        ;[startElement, endElement] = turnThePage(child, attrs, editor)
      }
    }
  }

  // That completes the closed function. Now proceed to paginate the document.
  const doc = view.state.doc
  const [editor] = document.getElementsByClassName("ProseMirror-setup")
  let header = null
  // Create an attrs object to hold several values.
  // Otherwise, the populatePage() function would have to pass ~15 parameters.
  const attrs = {
    pageNum: 0,
    pageTop: 0,
    pageHeight: 0,
    minElemHeight: 3.2 * doc.attrs.fontSize,
    stdHdrHeight: 0,
    headerHeight: 0,
    tocArray: null,
    tocStartLevel: tocStartLevel,
    tocEndLevel: tocEndLevel,
    tocAdjustment: 0,
    ftNote: { totalNum: 0, start: 0, end: -1, pageNotesHeight: 0 },
    footNotes: [],
    listIndex: -1,
    pageTopChild: -1,
    pageTopOffset: 0,
    pageBottomChild: -1,
    pageBottomOffset: 0
  }

  // Collect info about the Table of Contents, if any.
  let mustAdjustToC = false
  let deltaToC = 0
  const [tocNode, nodePos] = findTOC(doc)
  if (tocStartLevel || tocNode) {
    if (tocNode && !tocStartLevel) {
      attrs.tocStartLevel = tocNode.attrs.start
      attrs.tocEndLevel = tocNode.attrs.end
    }
    attrs.tocArray = getDraftTocArray(doc, attrs)
    if ((!tocNode) || tocNode.attrs.body.length !== attrs.tocArray.length) {
      // Get a corrected height of the Table of Contents
      mustAdjustToC = true
      const tocElem = editor.getElementsByClassName("toc")
      if (tocElem.length > 0) { attrs.tocTop = tocElem[0].getBoundingClientRect().top }
      // How much taller will the revised ToC be than the existing ToC?
      const deltaPerLine = doc.attrs.fontSize === 10 ? 16 : 19.195
      if (tocNode) {
        deltaToC = (attrs.tocArray.length - tocNode.attrs.body.length) * deltaPerLine
      } else {
        const tocMargin = doc.attrs.fontSize === 10 ? 20 : 24
        deltaToC = attrs.tocArray.length * deltaPerLine + tocMargin
      }
    }
  }

  // Note: 1 inch = 96 px & 16 mm margins = 121 px
  attrs.pageHeight = (doc.attrs.pageSize === "letter" ? 11 * 96 : 297 / 25.4 * 96) - 121
  attrs.pageTop = editor.children[0].getBoundingClientRect().top
  const destination = document.getElementById("print-div")
  destination.innerHTML = ""
  let startElement = editor.children[0];
  let endElement = null
  attrs.pageNum = 0

  // Get info about the print header, if any.
  if (doc.nodeAt(0).type.name === "header") {
    header = document.getElementsByTagName("header")[0].children[0].children[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace(
      "$PAGE",
      '&nbsp;<span class="page-display"></span>'
    )
    const origHeader = document.getElementsByTagName("header")[0];
    const headerRect = origHeader.getBoundingClientRect()
    attrs.stdHdrHeight = headerRect.bottom - headerRect.top
  }

  // Spin up a canvas for measurement of footnote width
  const measurementCanvas = document.createElement('canvas')
  const ctx =  measurementCanvas.getContext('2d')
  ctx.font = `${String(doc.attrs.fontSize)}pt Calibri, san-serif`
  attrs.ftNote.hrHeight = doc.attrs.fontSize === 12 ? 33 : 29
  attrs.ftNote.lineBoxHeight = doc.attrs.fontSize === 12 ? 19.2 : 16
  attrs.ftNote.botMargin = doc.attrs.fontSize === 12 ? 16 : 13.333

  // Get the content of each footnote
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "footnote") {
      attrs.footnotes.push(footnoteContents(node.content.content))
    }
  })

  // Start the pagination with a call to a recursive function.
  processChildren(editor)

  // Create the final page.
  populatePage(startElement, editor.lastChild, header, destination, attrs)

  // Update the Table of Contents in the document.
  if (attrs.tocArray && purpose === forPrint) {
    const tocAttrs = {
      start: tocNode.attrs.start,
      end: tocNode.attrs.end,
      body: attrs.tocArray
    }
    const tr = view.state.tr
    tr.replaceWith(nodePos, nodePos + 1, tocSchema.createAndFill(tocAttrs))
    view.dispatch(tr)
    // Copy the editor ToC to the print-div
    const editorToC = editor.getElementsByClassName("toc")[0];
    const printToC = destination.getElementsByClassName("toc")[0];
    printToC.innerHTML = editorToC.innerHTML
  }
  return attrs.tocArray
}


const binarySearchForOverflow = (textNode, yMax) => {
  // Do a binary search to find the approximate point of overflow.
  let rngStart = 0
  let rngEnd = textNode.length
  let offset = Math.floor(textNode.length / 2)
  const topRange = new Range()
  topRange.setStart(textNode, 0)
  const bottomRange = new Range
  bottomRange.setEnd(textNode, textNode.length)
  let topRect
  let bottomRect
  while (rngEnd - rngStart > 2) {
    topRange.setStart(textNode, rngStart)
    topRange.setEnd(textNode, rngStart + offset)
    topRect = topRange.getBoundingClientRect()
    if (topRect.bottom < yMax) {
      if (yMax - topRect.bottom < 40) {
        // We're close to the break. Shift to linear search.
        return rngStart + offset
      }
      rngStart = rngStart + offset
      offset = Math.floor((rngEnd - rngStart) / 2)
    } else {
      bottomRange.setStart(textNode, rngStart + offset)
      bottomRange.setEnd(textNode, rngEnd)
      bottomRect = bottomRange.getBoundingClientRect()
      if (bottomRect.top > yMax) {
        rngEnd = rngStart + offset
        offset = Math.floor((rngEnd - rngStart) / 2)
      } else {
        // The currenct index occurs in the overlap of topRect and bottomRect.
        // Subtract 280 to reliably get to a space in the previous line.
        return Math.max(rngStart + offset - 280, 0)
      }
    }
  }
  return rngStart + offset
}

// TODO: Include hyphens
const nonBreak = /^[\S\u202F\u00A0]$/

const linearSearchForOverflow = (textNode, yMax, offset) => {
  // `offset` is near the overflow point.
  // Do a linear search to find the exact point.
  const str = textNode.wholeText
  let char = ""
  const range = new Range()
  range.setStart(textNode, offset)
  let prevWordEnd = offset
  let startIndex = 0
  for (let i = offset; i < str.length; i++) {
    char = str.slice(i, i + 1)
    if (nonBreak.test(char)) {
      startIndex = i;
      prevWordEnd = i - 1
      break
    }
  }
  for (let i = startIndex; i < str.length; i++) {
    char = str.slice(i, i + 1)
    if (!nonBreak.test(char)) {
      range.setEnd(textNode, i)
      if (range.getBoundingClientRect().bottom > yMax) {
        for (let j = prevWordEnd + 1; j < str.length; j++) {
          char = str.slice(j, j + 1)
          if (nonBreak.test(char)) {
            return j - 1
          }
        }
        return textNode.length
      }
      prevWordEnd = i - 1
    }
  }
  return textNode.length
}

const unsplittableClasses = ["hurmet-calc", "hurmet-tex"];
const unsplittableTags = ["IMG", "FIGCAPTION", "BR", "FOOTNOTE"];

const findParagraphOverflowPoint = (paragraph, yMax) => {
  // Find the page break inside the <p> or <code>.
  const range = new Range()

  for (let i = 0; i < paragraph.childNodes.length; i++) {
    const grafChild = paragraph.childNodes[i];
    let rect
    if (grafChild.nodeType === 3) {
      range.setStartBefore(grafChild)
      range.setEndAfter(grafChild)
      rect = range.getBoundingClientRect()
    } else {
      rect = grafChild.getBoundingClientRect()
    }

    if (rect.bottom < yMax) { continue }

    if (grafChild.nodeType === 3) {
      // The child node is a text node.
      let offset = binarySearchForOverflow(grafChild, yMax)
      offset = linearSearchForOverflow(grafChild, yMax, offset)
      return [i, offset]
    } else {
      // The child node is a tagged element. Find out if it can be split.
      if (unsplittableClasses.includes(grafChild.className) ||
          unsplittableTags.includes(grafChild.tagName)) {
        if (i === 0) {
          return [-1, 0]
        } else {
          return [i, 0]
        }
      }
      // The child node is a span. Find where to split it.
      // Note: ProseMirror does not nest spans more than one level deep.
      let offset = binarySearchForOverflow(grafChild.childNodes[0], yMax)
      offset = linearSearchForOverflow(grafChild.childNodes[0], yMax, offset)
      return [i, offset]
    }
  }
  return [-1, 0]
}
