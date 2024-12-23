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

export const tocLevels = entry => {
  // Determine the start and end heading levels
  const parts = entry.match(levelRegEx)
  const startLevel = Number(parts[1])
  const endLevel = Number(parts[2] ? parts[2] : startLevel)
  return [startLevel, endLevel]
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

const getDraftTocArray = (doc, startLevel, endLevel) => {
  const tocArray = [];
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "heading" && startLevel <= node.attrs.level
                                     && node.attrs.level <= endLevel) {
      tocArray.push([node.textContent, node.attrs.level, 0])
    }
  })
  return tocArray
}

// Check footnote height
const getElementFootnoteData = (element, footnotes, ftNote, ctx ) => {
  // Check for footnote(s) in the element
  ftNote.numFtNotesInElem = 0
  ftNote.elemNotesHeight = 0
  const footnoteNodeList = element.querySelectorAll("footnote")
  if (footnoteNodeList.length > 0) {
    if (ftNote.end === -1) {
      // The current page has no previous footnotes.
      ftNote.elemNotesHeight += ftNote.hrHeight  // For the <hr> above the footnote block
      ftNote.end = ftNote.start - 1
    }
    for (let i = ftNote.totalNum; i < ftNote.totalNum + footnoteNodeList.length; i++) {
      const text = footnotes[i].text;
      // A footnote has 620 px available width. We'll use 615 to allow for text styles.
      const numLines = Math.ceil(ctx.measureText(text).width / 615)
      ftNote.elemNotesHeight += (numLines * ftNote.lineBoxHeight) + ftNote.botMargin
      ftNote.numFtNotesInElem += 1
    }
  }
}

const populatePage = (startElement, endElement, header, pageNum, pageTop,
          pageHeight, headerHeight, ftNote, footnotes, destination, listIndex) => {
  // Create a page
  const page = document.createDocumentFragment()
  if (header && pageNum > 1) {
    const printHeader = header.cloneNode(true)
    printHeader.style.breakBefore = "page"
    page.append(printHeader)
  }
  // Create a body div
  const printBody = document.createElement("div")
  printBody.className = "print-body"
  if (!(header && pageNum > 1)) {
    printBody.style.breakBefore = "page"
  }

  // Define the appropriate range of elements and append a copy of the range.
  const range = new Range()
  range.setStartBefore(startElement)
  range.setEndAfter(endElement)
  printBody.appendChild(range.cloneContents())
  if (listIndex >= 0) {
    // The page break occurred in the middle of an ordered list. Fix the start.
    const lists = printBody.getElementsByTagName("OL")
    lists[0].setAttribute("start", String(listIndex + 2))
  }
  page.appendChild(printBody)

  if (ftNote.end >= 0) {
    // Write footnotes at the bottom of the page.
    const bodyHeight = endElement.getBoundingClientRect().bottom - pageTop
    const gap = pageHeight - headerHeight - bodyHeight - ftNote.pageNotesHeight
    if (gap > 0) {
      const spacer = document.createElement("div")
      spacer.style.height = (gap - 2) + "px"
      page.append(spacer)
    }
    page.append(document.createElement("hr"))
    const ol = document.createElement("ol")
    if (ftNote.start > 0) {
      ol.setAttribute("start", String(ftNote.start + 1))
    }
    for (let j = ftNote.start; j <= ftNote.end; j++) {
      const graf = document.createElement("p")
      graf.innerHTML = footnotes[j].innerHTML
      const li = document.createElement("li")
      li.appendChild(graf)
      ol.appendChild(li)
    }
    page.append(ol)
  }
  // Append the page
  destination.append(page)

  // Check if the ending page break occcurred in the middle of an ordered list
  listIndex = (endElement.tagName === "LI" && endElement.parentElement.tagName === "OL")
    ? [...endElement.parentElement.children].indexOf(endElement)
    : -1
  return listIndex
}

const turnThePage = (topElement, pageNum, stdHdrHeight, ftNote, editor) => {
  // Set some values for the next page.
  ftNote.pageNotesHeight = 0
  ftNote.start = ftNote.totalNum
  ftNote.end = -1
  pageNum += 1
  const top = topElement
    ? topElement.getBoundingClientRect().top
    : editor.getBoundingClientRect().bottom
  return [topElement, null, pageNum, stdHdrHeight, top];
}



export function paginate(view, tocSchema, purpose, startLevel, endLevel) {
  const doc = view.state.doc
  const [tocNode, nodePos] = findTOC(doc)
  if (startLevel || tocNode) {
    if (tocNode && !startLevel) {
      startLevel = tocNode.attrs.start
      endLevel = tocNode.attrs.end
    }
    const tocArray = getDraftTocArray(doc, startLevel, endLevel)
    // Write a Table of Contents into the document.
    // TODO: Dispatch a transaction only if necessary to get the length correct.
    const attrs = {
      start: tocNode.attrs.start,
      end: tocNode.attrs.end,
      body: tocArray
    }
    const tr = view.state.tr
    tr.replaceWith(nodePos, nodePos + 1, tocSchema.createAndFill(attrs))
    view.dispatch(tr)
  }

  // Note: 1 inch = 96 px & 16 mm margins = 121 px
  const pageHeight = (doc.attrs.pageSize === "letter" ? 11 * 96 : 297 / 25.4 * 96) - 121

  // A closed function
  const isOrphan = nextElement => {
    if (!nextElement) { return false }
    const rect = nextElement.getBoundingClientRect()
    if (pageHeight - headerHeight - ftNote.pageNotesHeight - minElemHeight <
      rect.top - pageTop) {
      return true
    }
    if (nextElement.tagName === "DIV" && nextElement.className === "tableWrapper") {
      if (pageHeight - headerHeight - ftNote.pageNotesHeight < rect.bottom - pageTop) {
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
    return (pageHeight - headerHeight - ftNote.pageNotesHeight < imageBottom - pageTop)
  }

  // This closed function is the main effort. A recursive function to work thru the doc.
  function processChildren(element) {
    const children = element.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const bottom = bottomOf(child)
      const rect = child.getBoundingClientRect()
      // Get the next element in the doc
      let el = child
      let nextElement = el.nextElementSibling
      while (nextElement === null && el.className !== "editor") {
        el = el.parentElement
        nextElement = el.nextElementSibling
      }
      // Investigate the element for footnotes
      getElementFootnoteData(child, footnotes, ftNote, ctx)

      if (child.tagName === "H1" && rect.top - pageTop > 0.75 * pageHeight) {
        // Prevent an H1 heading near the bottom of the page. Start a new page.
        listIndex = populatePage(startElement, endElement, header, pageNum, pageTop,
                pageHeight, headerHeight, ftNote, footnotes, destination, listIndex)
        ;[startElement, endElement, pageNum, headerHeight, pageTop] =
            turnThePage(child, pageNum, stdHdrHeight, ftNote, editor)

      } else if (headsRegEx.test(child.tagName) && isOrphan(nextElement)) {
        // Prevent a heading directly above an orphan. Start a new page.
        listIndex = populatePage(startElement, endElement, header, pageNum, pageTop,
                 pageHeight, headerHeight, ftNote, footnotes, destination, listIndex)
        ;[startElement, endElement, pageNum, headerHeight, pageTop] =
            turnThePage(child, pageNum, stdHdrHeight, ftNote, editor)

      } else if ((child.tagName === "OL" || child.tagName === "UL") &&
                  rect.botton - pageTop < 32) {
        // Prevent a list orphan.
        listIndex = populatePage(startElement, endElement, header, pageNum, pageTop,
                pageHeight, headerHeight, ftNote, footnotes, destination, listIndex)
        ;[startElement, endElement, pageNum, headerHeight, pageTop] =
            turnThePage(child, pageNum, stdHdrHeight, ftNote, editor)

      } else if (pageHeight - headerHeight - ftNote.pageNotesHeight - ftNote.elemNotesHeight
                  >= bottom - pageTop) {
        // Include this element in the page.
        endElement = child
        ftNote.pageNotesHeight += ftNote.elemNotesHeight
        ftNote.totalNum += ftNote.numFtNotesInElem
        ftNote.end += ftNote.numFtNotesInElem

      } else if (child.tagName !== "P" &&
          !(child.tagName === "DIV" && child.className === "tableWrapper")) {
        // Examime the children of this element. Maybe some of them fit onto the page.
        processChildren(child)

      } else {
        // Wrap up the current page and start a new page.
        listIndex = populatePage(startElement, endElement, header, pageNum, pageTop,
                 pageHeight, headerHeight, ftNote, footnotes, destination, listIndex)
        ;[startElement, endElement, pageNum, headerHeight, pageTop] =
            turnThePage(child, pageNum, stdHdrHeight, ftNote, editor)
      }
    }
  }

  // Now proceed to paginate the document.
  const [editor] = document.getElementsByClassName("ProseMirror-setup")
  let pageTop = editor.children[0].getBoundingClientRect().top
  const destination = document.getElementById("print-div")
  destination.innerHTML = ""
  let startElement = editor.children[0];
  let endElement = null
  let header = null
  let stdHdrHeight = 0
  let headerHeight = 0
  let listIndex = -1
  const ftNote = { totalNum: 0, start: 0, end: -1, pageNotesHeight: 0 }
  const minElemHeight = 3.2 * doc.attrs.fontSize
  let pageNum = 1

  if (doc.nodeAt(0).type.name === "header") {
    header = document.getElementsByTagName("header")[0].children[0].children[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace(
      "$PAGE",
      '&nbsp;<span class="page-display"></span>'
    )
    const origHeader = document.getElementsByTagName("header")[0];
    const headerRect = origHeader.getBoundingClientRect()
    stdHdrHeight = headerRect.bottom - headerRect.top
  }

  // Spin up a canvas for measurement of footnote width
  const measurementCanvas = document.createElement('canvas')
  const ctx =  measurementCanvas.getContext('2d')
  ctx.font = `${String(doc.attrs.fontSize)}pt Calibri, san-serif`
  ftNote.hrHeight = doc.attrs.fontSize === 12 ? 33 : 29
  ftNote.lineBoxHeight = doc.attrs.fontSize === 12 ? 19.2 : 16
  ftNote.botMargin = doc.attrs.fontSize === 12 ? 16 : 13.333

  // Get the content of each footnote
  const footnotes = [];
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "footnote") {
      footnotes.push(footnoteContents(node.content.content))
    }
  })

  // Start the pagination.
  processChildren(editor)
  populatePage(startElement, editor, header, pageNum, pageTop, pageHeight, headerHeight,
    ftNote, footnotes, destination, listIndex)
}





function findOverflowingSpan(paragraphNode, paragraphYCoordinate, maxHeightAllowed) {
  const spans = Array.from(paragraphNode.getElementsByTagName('span'))

  function measureHeight(node) {
    const rect = node.getBoundingClientRect()
    return rect.bottom - paragraphYCoordinate
  }

  function binarySearchTextNode(spanNode, start, end, maxHeight) {
    while (start < end) {
      const mid = Math.floor((start + end) / 2)
      const textNode = spanNode.childNodes[mid]
      textNode.splitText(textNode.length / 2)

      if (measureHeight(spanNode) > maxHeight) {
        end = mid
      } else {
        start = mid + 1
      }

      spanNode.normalize()
    }
    return start
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    const spanBottom = measureHeight(span)

    if (spanBottom > maxHeightAllowed) {
      const textNodeIndex = binarySearchTextNode(span, 0, span.childNodes.length - 1, maxHeightAllowed)
      return { spanIndex: i, textNodeIndex }
    }
  }

  return { spanIndex: -1, textNodeIndex: -1 }
}
