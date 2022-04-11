const headingsRegEx = /^H[1-6]$/

export const printDoc = headerExists => {
  // Copy document contents to a separate <div>.
  const [sourceElement] = document.getElementsByClassName("ProseMirror-example-setup-style")
  const source = sourceElement.cloneNode(true)
  const destination = document.getElementById("print-div")
  if (headerExists) {
    // Reproduce the header on each page.
    // To do that, we have to measure element locations and set page breaks.
    destination.innerHTML = ""
    const frag = document.createDocumentFragment()
    // eslint-disable-next-line max-len
    const header = document.getElementsByTagName("header")[0].childNodes[0].childNodes[0].cloneNode(true)
    header.classList.add("header")
    header.innerHTML = header.innerHTML.replace("$PAGE", '<span class="page-display"></span>')
    let iStart = 1
    let iEnd = 0
    let pageNum = 0
    const numEls = source.childNodes.length
    const headerRect = header.getBoundingClientRect()
    const L = 11 * 96 - 121 /*margins*/  -  (headerRect.bottom - headerRect.top)
    while (iStart < numEls) {
      const top = sourceElement.children[iStart].getBoundingClientRect().top
      // Iterate on the top level elements. Check the bottom coordinate.
      // TODO: Break on paragraphs inside top level divs.
      for (let i = iStart + 1; i < numEls; i++) {
        if (sourceElement.children[i].tagName === "H1" &&
        sourceElement.children[i].getBoundingClientRect().top - top > 0.75 * L) {
          // Prevent a H! near the bottom of a page.
          iEnd = i - 1
          break
        }
        let bottom = sourceElement.children[i].getBoundingClientRect().bottom
        const images = sourceElement.children[i].getElementsByTagName("img")
        for (let j = 0; j < images.length; j++) {
          bottom = Math.max(bottom, images[j].getBoundingClientRect().bottom)
        }
        if (bottom - top > L) {
          iEnd = (headingsRegEx.test(sourceElement.children[i - 1].tagName) ||
                  sourceElement.children[i].className === "indented")
          ? i - 2
          : i - 1
          break
        }
      }
      if (iEnd === iStart - 1) { iEnd = numEls - 1 }
      // Append a header
      if (pageNum > 0) {
        frag.append(header.cloneNode(true))
      }
      // Create a body div
      const div = document.createElement("div")
      div.className = "print-body"
      for (let i = iStart; i <= iEnd; i++) {
        div.append(source.children[i].cloneNode(true))
      }
      frag.append(div)
      iStart = iEnd + 1
      pageNum += 1
    }
    destination.append(frag)
  } else {
    destination.append(source)
  }
  window.print()
}
