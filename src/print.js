// Items related to printing and Table of Contents

const headingsRegEx = /^H[1-6]$/
const levelRegEx = /(\d+)(?:[^\d]+(\d+))?/
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
  // Called by schema. Renders a Table of Contents.
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

const pushToToC = (element, tocArray, targetRegEx, iPass, startLevel, pageNum) => {
  if (iPass === 0 && targetRegEx && targetRegEx.test(element.tagName)) {
    const level = Number(element.tagName.slice(1)) - startLevel
    tocArray.push([element.textContent, level, pageNum])
  }
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
  let targetRegEx
  if (endLevel > 0) {
    let targetStr = "^("
    for (let i = startLevel; i <= endLevel; i++) {
      targetStr += "H" + i + "|"
    }
    targetStr = targetStr.slice(0, -1) + ")$"
    targetRegEx = targetStr.length > 0 ? RegExp(targetStr) : null
  }
  const tocArray = []
  const [editor] = document.getElementsByClassName("ProseMirror-example-setup-style")
  const source = editor.cloneNode(true)
  const destination = document.getElementById("print-div")
  const frag = document.createDocumentFragment()
  let header
  let pageHeight = 0
  if (headerExists) {
    // eslint-disable-next-line max-len
    header = document.getElementsByTagName("header")[0].childNodes[0].childNodes[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace("$PAGE", '<span class="page-display"></span>')
    const headerRect = document.getElementsByTagName("header")[0].getBoundingClientRect()
    pageHeight = 11 * 96 - 137 /*margins*/  -  (headerRect.bottom - headerRect.top)
  } else {
    pageHeight = 11 * 96 - 137
  }

  const numPasses = purpose === forPrint ? 2 : 1
  let iStart = 1
  let iEnd = 0
  let pageNum = 0
  const numEls = source.childNodes.length
  for (let iPass = 0; iPass < numPasses; iPass++) {
    destination.innerHTML = ""
    iStart = 1
    iEnd = 0
    pageNum = 0
    while (iStart < numEls) {
      const top = editor.children[iStart].getBoundingClientRect().top
      // Iterate on the top level elements. Check the bottom coordinate of each.
      for (let i = iStart + 1; i < numEls; i++) {
        const element = editor.children[i]
        if (element.tagName === "H1" &&
          element.getBoundingClientRect().top - top > 0.75 * pageHeight) {
          // Prevent a H! near the bottom of a page.
          iEnd = i - 1
          pushToToC(element, tocArray, targetRegEx, iPass, startLevel, pageNum + 1)
          break
        }
        if (element.tagName === "H2" &&
          element.getBoundingClientRect().top - top > 0.85 * pageHeight) {
          // Prevent a H! near the bottom of a page.
          iEnd = i - 1
          pushToToC(element, tocArray, targetRegEx, iPass, startLevel, pageNum + 1)
          break
        }
        let bottom = element.getBoundingClientRect().bottom
        const images = element.getElementsByTagName("img")
        for (let j = 0; j < images.length; j++) {
          bottom = Math.max(bottom, images[j].getBoundingClientRect().bottom)
        }
        if (bottom - top > pageHeight) {
          iEnd = (headingsRegEx.test(editor.children[i - 1].tagName) ||
                  element.className === "indented")
            ? i - 2
            : i - 1
          pushToToC(editor.children[iEnd + 1], tocArray, targetRegEx,
              iPass, startLevel, pageNum + 1)
          break
        }
        pushToToC(element, tocArray, targetRegEx, iPass, startLevel, pageNum)
      }
      // The loop has found enough elements to fill a page.
      if (iEnd === iStart - 1) { iEnd = numEls - 1 }
      if (purpose === forPrint) {
        // Copy the identified elements to the destination div.
        if (headerExists && pageNum > 0) {
          frag.append(header.cloneNode(true))
        }
        // Create a body div
        const div = document.createElement("div")
        div.className = "print-body"
        for (let i = iStart; i <= iEnd; i++) {
          div.append(source.children[i].cloneNode(true))
        }
        frag.append(div)
        destination.append(frag)
      }
      iStart = iEnd + 1
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
