import { parse } from "./parser"
import { md2ast } from "./md2ast"

/* Render inline Markdown, given an AST */

const tagName = {
  em: "em",
  strong: "strong",
  code: "code",
  strikethru: "del",
  subscript: "sub",
  superscript: "sup",
  underline: "u",
  highlight: "mark"
}

const nodes = {
  calculation(node) {
    const tex = parse(node.attrs.entry)
    const dom = document.createElement('span')
    const isFF = 'MozAppearance' in document.documentElement.style
    if (isFF) {
      // eslint-disable-next-line no-undef
      temml.render(tex, dom)
    } else {
      // eslint-disable-next-line no-undef
      katex.render(tex, dom, {
        output: "html",
        strict: false,
        throwOnError: false,
        minRuleThickness: 0.06
      })
    }
    return dom
  },
  tex(node) {
    const dom = document.createElement('span')
    dom.classList = "hurmet-tex"
    // eslint-disable-next-line no-undef
    katex.render(node.attrs.tex, dom, { strict: false,
      throwOnError: false, minRuleThickness: 0.06 })
    return dom
  },
  text(node) {
    let dom = document.createTextNode(node.text)
    if (!node.marks) {
      return document.createElement('span').appendChild(dom)
    } else {
      for (const mark of node.marks) {
        const oldDom = dom.cloneNode(true)
        dom = document.createElement(tagName[mark.type])
        dom.appendChild(oldDom)
      }
      return dom
    }
  }
}

const output = ast => {
  const dom = document.createElement("span")
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      dom.appendChild(output(ast[i]))
    }
  } else if (ast.type !== "null") {
    dom.appendChild(nodes[ast.type](ast))
  }
  return dom
}

export const renderMD = md => {
  const ast = md2ast(md)[0].content
  return output(ast)
}
