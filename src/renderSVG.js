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
      if (el.tag === "title" || el.tag === "style") {
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
    } else if (el.tag === "defs" && el.children) {
      // <marker> elements
      el.children.forEach(child => {
        const defNode = document.createElementNS("http://www.w3.org/2000/svg", child.tag)
        Object.keys(child.attrs).forEach(attr => {
          defNode.setAttribute(attr, child.attrs[attr])
        })
        node.appendChild(defNode)
      })
    } else if (el.tag === "g" && el.children) {
      el.children.forEach(child => {
        // The top <g> is a matrix transform from model space to viewport space.
        const gChild = document.createElementNS("http://www.w3.org/2000/svg", child.tag)
        if (gChild.tag === "g" && gChild.children) {
          // Grandchildren are components of multi-element items, such as dimensions.
          gChild.children.forEach(grandChild => {
            if (grandChild.tag === "text") {
              grandChild.children.forEach(grandChild => {
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan")
                if (grandChild.attrs) {
                  Object.keys(grandChild.attrs).forEach(mark => {
                    tspan.setAttribute(mark, grandChild.attrs[mark])
                  })
                }
                tspan.appendChild(document.createTextNode(grandChild.text))
                node.appendChild(tspan)
              })
            } else {
              const ggChild = document.createElementNS("http://www.w3.org/2000/svg", grandChild.tag)
              Object.keys(grandChild.attrs).forEach(attr => {
                ggChild.setAttribute(attr, grandChild.attrs[attr])
              })
              ggChild.setAttribute("vector-effect", "non-scaling-stroke")
              gChild.appendChild(ggChild)
            }
          })
        } else {
          // Primitive shape, e.g., <rect>, <circle>. Apply attributes directly.
          Object.keys(child.attrs).forEach(attr => {
            gChild.setAttribute(attr, child.attrs[attr])
          })
          gChild.setAttribute("vector-effect", "non-scaling-stroke")
        }
        node.appendChild(gChild)
      })
    } else {
      // Primitive shape, e.g., <rect>, <circle>. Apply attributes directly.
      Object.keys(el.attrs).forEach(attr => {
        node.setAttribute(attr, el.attrs[attr])
      })
      node.setAttribute("vector-effect", "non-scaling-stroke")
    }
    svg.appendChild(node)
  })
  return svg
}
