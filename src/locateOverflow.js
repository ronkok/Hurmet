import { tagName, sanitizeText } from "./md2html"

// Items related to pagination and Table of Contents

const headsRegEx = /^H[1-6]$/
const levelRegEx = /(\d+)(?:[^\d]+(\d+))?/
const lists = ["OL", "UL"]
const blockRegEx = /^(centered|indented|right_justified)$/
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

function addElementToPage(element, parent, level, branch) {
  const clone = element.cloneNode(true)
  for (let i = level; i < branch.length; i++) {
    const el = document.createElement(branch[i].tag)
    if (branch[i].class) { el.className = branch[i].class }
    if (branch[i].tag === "LI" && i > 0 && branch[i - 1].tag === "OL") {
      document.setAttribute("start", branch[i].index + 1)
    }
    parent.appendChild(el)
    parent = el
  }
  parent.appendChild(clone)
}

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

const getNextElement = (element, editor, branch, i) => {
  let parent = element.parentElement
  let nextElement
  if (parent.children.length > i + 1) {
    nextElement = parent.children[i + 1];
  } else {
    let j = branch.length - 1
    while (j > 0) {
      parent = parent.parentElement
      if (parent.children.length > branch[j].index + 1) {
        nextElement = parent.children[branch[j].index + 1];
        break
      }
      j -= 1
    }
    return null
  }
  return nextElement
}

const getTop = (nextElement, editor) => {
  if (nextElement) {
    return nextElement.getBoundingClientRect().top
  } else {
    return editor.getBoundingClientRect().bottom
  }
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
const elementFootnoteData = (element, footnotes, ftNote, ctx ) => {
  // Check for footnote(s) in the element
  let numElemFtNotes = 0
  let elemFtNotesHeight = 0
  const footnoteNodeList = element.querySelectorAll("footnote")
  if (footnoteNodeList.length > 0) {
    // If the current page has no previous footnotes, add 25 ps for a <hr>
    elemFtNotesHeight += (ftNote.height === 0 ? 25 : 0)
    for (let i = 0; i < footnoteNodeList.length; i++) {
      // TODO: Check the following index. Looks wrong.
      const text = footnotes[ftNote.num].text;
      // A footnote has 620 px available width. We'll use 615 to allow for text styles.
      const numLines = Math.ceil(ctx.measureText(text).width / 615)
      elemFtNotesHeight += (numLines * ftNote.lineBoxHeight) + ftNote.botMargin
      numElemFtNotes += 1
    }
  }
  return [numElemFtNotes, elemFtNotesHeight]
}



export function paginate(view, tocSchema, startLevel, endLevel = 0) {
  const doc = view.state.doc
  let tocNode
  let nodePos = 0
  if (endLevel === 0) {
    [tocNode, nodePos] = findTOC(doc)
    if (tocNode) {
      startLevel = tocNode.attrs.start
      endLevel = tocNode.attrs.end
    }
  }
  const tocArray = getDraftTocArray(doc, startLevel, endLevel)
  // Write a Table of Contents into the document.
  const attrs = {
    start: tocNode.attrs.start,
    end: tocNode.attrs.end,
    body: tocArray
  }
  const tr = view.state.tr
  tr.replaceWith(nodePos, nodePos + 1, tocSchema.createAndFill(attrs))
  view.dispatch(tr)

  // Note: 1 inch = 96 px & 16 mm margins = 121 px
  const pageHeight = (doc.attrs.pageSize === "letter" ? 11 * 96 : 297 / 25.4 * 96) - 121

  // A closed function
  function createNewPage(nextElement) {
    const newPage = document.createDocumentFragment()
    if (header && pageNum > 1) {
      newPage.append(header.cloneNode(true))
    }
    // Create a body div
    const div = document.createElement("div")
    div.className = "print-body"
    // Recreate nested elements
    for (let i = 0; i < branch.length; i++) {
      const el = document.createElement(branch[i].tag)
      if (branch[i].class) { el.className = branch[i].class }
      if (branch[i].tag === "LI" && branch[i - 1].tag === "OL") {
        document.setAttribute("start", branch[i].index + 1)
      }
      div.appendChild(el)
    }
    pageNum += 1
    headerHeight = stdHeaderHeight
    pageNotesHeight = 0
    top = getTop(nextElement, editor)
    return newPage
  }

  // Another closed function
  const isOrphan = nextElement => {
    if (!nextElement) { return false }
    const elemTop = nextElement.getBoundingClientRect().top
    if (pageHeight - headerHeight - pageNotesHeight < elemTop - top - minElemHeight) {
      return true
    }
    let imageBottom = elemTop
    const images = nextElement.getElementsByTagName("img")
    if (images) {
      imageBottom = images[0].getBoundingClientRect().bottom
    }
    const svgs = nextElement.getElementsByTagName("svg")
    if (svgs) { imageBottom = Math.max(imageBottom, svgs[0].getBoundingClientRect().bottom) }
    return (pageHeight - headerHeight - pageNotesHeight < imageBottom - top)
  }

  // This closed function is the main effort. A recursive function to work thru the doc.
  function processChildren(element, page, pageElement) {
    const children = Array.from(element.children)
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const bottom = bottomOf(child)
      const nextElement = getNextElement(editor, branch, i)
      const [numElemFtNotes, elemFtNotesHeight] = elementFootnoteData(child, ftNote.height)

      if (child.tagName === "H1"
          && child.getBoundingClientRect().top - top > 0.75 * pageHeight) {
        // Prevent an H1 heading near the bottom of the page. Start a new page.
        destination.appendChild(page)
        currentPage = createNewPage(nextElement)
        i -= 1

      } else if (headsRegEx.test(child.tagName) && isOrphan(nextElement)) {
        // Prevent a heading directly above an orphan. Start a new page.
        destination.appendChild(page)
        currentPage = createNewPage(nextElement)
        i -= 1

      } else if (pageHeight - headerHeight - pageNotesHeight >= bottom - top) {
        addElementToPage(child, pageElement, level, branch)

      } else if (element.tagName !== "P" && element.tagName !== "TABLE") {
        // Examime the children of this element. Maybe some of them fit onto the page.
        branch.push({ index: i, tag: child.tagName, class: child.className })
        const pageChild = pageElement.childNodes(pageElement.childNodes.length - 1)
        processChildren(child, page, pageChild)

      } else {
        // Wrap up the current page and start a new page.
        // First, check if the previous element was a heading. If so, move it to the new page.
        destination.appendChild(page)
        currentPage = createNewPage(nextElement)
        i -= 1
      }
    }
    branch.pop()
  }

  // Now proceed to paginate the document.
  const [editor] = document.getElementsByClassName("ProseMirror-setup")
  let top = editor.children[0].getBoundingClientRect().top
  const destination = document.getElementById("print-div")
  destination.innerHTML = ""
  const branch = [];
  let level = 0
  let currentPage = createNewPage()
  let header = null
  let stdHeaderHeight = 0
  let headerHeight = 0
  let pageNotesHeight = 0
  const ftNote = { num: 0, prevNum: 0, height: 0 }
  let gap = 0
  let pageNum = 1

  if (doc.nodeAt(0).type.name === "header") {
    header = document.getElementsByTagName("header")[0].children[0].children[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace(
      "$PAGE",
      '&nbsp;<span class="page-display"></span>'
    )
    const headerRect = document.getElementsByTagName("header")[0].getBoundingClientRect()
    stdHeaderHeight = headerRect.bottom - headerRect.top
  }

  // Spin up a canvas for measurement of footnote width
  const measurementCanvas = document.createElement('canvas')
  const ctx =  measurementCanvas.getContext('2d')
  ctx.font = `${String(doc.attrs.fontSize)}pt Calibri, san-serif`
  ftNote.lineBoxHeight = doc.attrs.fontSize === 12 ? 19.2 : 16
  ftNote.botMargin = doc.attrs.fontSize === 12 ? 16 : 13.333

  // Get the content of each footnote
  const footnotes = [];
  doc.nodesBetween(0, doc.content.size, function(node, pos) {
    if (node.type.name === "footnote") {
      footnotes.push(footnoteContents(node.content.content))
    }
  })

  processChildren(editor, currentPage)
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
