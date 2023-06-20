export const renderSVG = dwg => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  Object.keys(dwg.attrs).forEach(key => {
    if (key === "float") {
      svg.style.float = dwg.attrs.float
    } else {
      svg.setAttribute(key, dwg.attrs[key])
    }
  })
  dwg.children.forEach(el => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", el.tag)
    Object.keys(el.attrs).forEach(attr => {
      node.setAttribute(attr, el.attrs[attr])
      if (attr === "title") {
        node.appendChild(document.createTextNode(el.attrs["text"]))
      } else {
        node.setAttribute(attr, el.attrs[attr])
      }
    })
    if (el.tag === "text") {
      el.children.forEach(child => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan")
        if (child.attrs) {
          Object.keys(child.attrs).forEach(mark => {
            tspan.setAttribute(mark, child.attrs[mark])
          })
        }
        tspan.appendChild(document.createTextNode(child.text))
        node.appendChild(tspan)
      })
    } else if (el.tag === "defs") {
      const styleNode = document.createElementNS("http://www.w3.org/2000/svg", "style")
      styleNode.appendChild(document.createTextNode(el.style))
      node.appendChild(styleNode)
    }
    svg.appendChild(node)
  })
  return svg
}
