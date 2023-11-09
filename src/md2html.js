import { parse } from "./parser.js"
import temml from "./temml.js"
import { md2ast } from "./md2ast.js"
import { updateCalcs } from "./updateCalcsForCLI.js"
import { dt } from "./constants"

const sanitizeUrl = function(url) {
  if (url == null) {
    return null;
  }
  try {
    const prot = decodeURIComponent(url)
      .replace(/[^A-Za-z0-9/:]/g, "")
      .toLowerCase();
    if (
      prot.indexOf("javascript:") === 0 ||
      prot.indexOf("vbscript:") === 0 ||
      prot.indexOf("data:") === 0
    ) {
      return null;
    }
  } catch (e) {
    // decodeURIComponent sometimes throws a URIError
    // See `decodeURIComponent('a%AFc');`
    // http://stackoverflow.com/questions/9064536/javascript-decodeuricomponent-malformed-uri-exception
    return null;
  }
  return url;
};

const SANITIZE_TEXT_R = /[<>&"']/g;
const SANITIZE_TEXT_CODES = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;"
};
const sanitizeText = function(text /* : Attr */) {
  return String(text).replace(SANITIZE_TEXT_R, function(chr) {
    return SANITIZE_TEXT_CODES[chr];
  });
};

const htmlTag = (tagName, content, attributes = {}, isClosed = true) => {
  let attributeString = "";
  for (const attr in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, attr)) {
      const attribute = attributes[attr];
    // Removes falsey attributes
      if (attribute) {
        const sanitizedAttribute = attr === "src"
          ? attribute.replace(/</g, "%3C").replace(/>/g, "%3E")
          : sanitizeText(attribute)
        attributeString += " " + sanitizeText(attr) + '="' + sanitizedAttribute + '"';
      }
    }
  }

  const unclosedTag = "<" + tagName + attributeString + ">";

  if (isClosed) {
    if (content.charAt(content.length - 1) === "\n") {
      content = content.slice(0, -1)
    }
    return unclosedTag + content + "</" + tagName + ">";
  } else {
    return unclosedTag;
  }
};

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

const quoteRegEx = /"/g
const dataStr = str => {
  if (str.indexOf("'") === -1) {
    return `'${str}'`
  } else if (str.indexOf('"') === -1) {
    return `"${str}"`
  } else {
    return `"${str.replace(quoteRegEx, "&quot;")}"`
  }
}

const writeSVG = dwg => {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg"'
  Object.keys(dwg.attrs).forEach(key => {
    svg += ` ${key}='${dwg.attrs[key]}'`
  })
  svg += ">\n"
  dwg.children.forEach(el => {
    svg += `<${el.tag}`
    Object.keys(el.attrs).forEach(attr => {
      if (el.tag !== "title") {
        svg += ` ${attr}='${el.attrs[attr]}'`
      }
    })
    svg += ">\n"
    if (el.tag === "text") {
      el.children.forEach(child => {
        svg += '<tspan'
        if (child.attrs) {
          Object.keys(child.attrs).forEach(mark => {
            svg += ` ${mark}='${child.attrs[mark]}'`
          })
        }
        svg += `>${sanitizeText(child.text)}</tspan>`
      })
    } else if (el.tag === "defs") {
      svg += `<style>${sanitizeText(el.style)}</style>`
    } else if (el.tag === "title") {
      svg += sanitizeText(el.attrs.text)
    }
    svg += `</${el.tag}>\n`
  })
  svg += "</svg>"
  return svg
}

const functionOrModuleRegEx = /^ *(?:function|module) /

const writeTOC = node => {
  let toc = "<ul class='toc'>\n"
  for (const item of node.attrs.body) {
    let li = "  <li"
    if (item[1] > 0) { li += ` style= 'margin-left: ${String(1.5 * item[1])}em'` }
    li += `><span>${item[0]}</span><span>0</span></li>\n`
    toc += li
  }
  return toc + "</ul>\n"
}

const headingText = content => {
  let str = ""
  for (const node of content) {
    if (node.type && node.type === "text") {
      str += node.text
    }
  }
  return sanitizeText(str)
}

const headings = [];

const nodes = {
  html(node) { return node.text },
  heading(node) {
    const text = headingText(node.content)
    let tag = "h" + node.attrs.level
    tag = htmlTag(tag, text)
    if (!headings.includes(text)) {
    // Add an id so others can link to it.
      tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/,/g, "").replace(/\s+/g, '-') + "'" + tag.slice(3)
      headings.push(text)
    }
    return tag + "\n"
  },
  paragraph(node)  { return htmlTag("p", ast2html(node.content)) + "\n" },
  blockquote(node) { return htmlTag("blockquote", ast2html(node.content)) },
  code_block(node) {
    return htmlTag("pre", htmlTag("code", sanitizeText(node.content[0].text)))
  },
  hard_break(node) { return "<br>" },
  def(node)        { return "" },
  newline(node)    { return "\n" },
  horizontal_rule(node) { return "<hr>\n" },
  ordered_list(node) {
    const attributes = node.attrs.order !== 1 ? { start: node.attrs.order } : undefined
    return htmlTag("ol", ast2html(node.content), attributes) + "\n"
  },
  bullet_list(node)  { return htmlTag("ul", ast2html(node.content)) + "\n" },
  list_item(node)    { return htmlTag("li", ast2html(node.content)) + "\n" },
  tight_list_item(node) {
    return htmlTag("li", ast2html(node.content), { class: "tight" }) + "\n"
  },
  table(node)        { return htmlTag("table", ast2html(node.content), node.attrs) + "\n" },
  colGroup(node)     {
    return "\n" + htmlTag("colgroup", ast2html(node.content), node.attrs) + "\n"
  },
  col(node)          { return htmlTag("col", "", node.attrs[0], false) },
  table_row(node)    { return htmlTag("tr", ast2html(node.content)) + "\n" },
  table_header(node) {
    const attributes = {}
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan }
    return htmlTag("th", ast2html(node.content), attributes) + "\n"
  },
  table_cell(node) {
    const attributes = {}
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan }
    return htmlTag("td", ast2html(node.content), attributes)
  },
  link(node) {
    const attributes = { href: sanitizeUrl(node.attrs.href), title: node.attrs.title };
    return htmlTag("a", ast2html(node.content), attributes);
  },
  image(node) {
    const attributes = { src: node.attrs.src };
    if (node.attrs.alt)   { attributes.alt = node.attrs.alt }
    if (node.attrs.class) { attributes.class = node.attrs.class }
    if (node.attrs.id)    { attributes.id = node.attrs.id }
    if (node.attrs.width) { attributes.width = node.attrs.width }
    return htmlTag("img", "", attributes, false);
  },
  figure(node)     { return htmlTag("figure", ast2html(node.content)) + "\n" },
  figcaption(node) { return htmlTag("figcaption", ast2html(node.content)) },
  figimg(node) {
    const attributes = { src: node.attrs.src, class: "figimg" };
    if (node.attrs.alt)   { attributes.alt = node.attrs.alt }
    if (node.attrs.id)    { attributes.id = node.attrs.id }
    if (node.attrs.width) { attributes.width = node.attrs.width }
    return htmlTag("img", "", attributes, false) + "\n";
  },
  calculation(node) {
    if (node.attrs.dtype && node.attrs.dtype === dt.DRAWING) {
      const svg = writeSVG(node.attrs.resultdisplay)
      const style = svg.indexOf('float="right"' > -1) ? " style='float: right;'" : ""
      return `<span class='hurmet-calc' data-entry=${dataStr(node.attrs.entry)}${style}>` +
        `${svg}</span>`
    } else if (node.attrs.dtype && node.attrs.dtype === dt.MODULE &&
               functionOrModuleRegEx.test(node.attrs.entry)) {
      return `<span class='hurmet-calc' data-entry=${dataStr(node.attrs.entry)}>`
        + `<span class='hmt-code'>${sanitizeText(node.attrs.entry)}</span></span>`
    } else {
      const tex = node.attrs.tex ? node.attrs.tex : parse(node.attrs.entry)
      const mathML = temml.renderToString(
        tex,
        { trust: true, wrap: "=", displayMode: (node.attrs.displayMode || false) }
      )
      const tag = node.attrs.displayMode ? "p" : "span"
      return `<${tag} class='hurmet-calc' data-entry=${dataStr(node.attrs.entry)}>` +
              `${mathML}</${tag}>`
    }
  },
  tex(node) {
    const mathML = temml.renderToString(
      node.attrs.tex,
      { trust: true, displayMode: (node.attrs.displayMode || false) }
    )
    const tag = node.attrs.displayMode ? "p" : "span"
    return `<${tag} class='hurmet-tex' data-entry=${dataStr(node.attrs.tex)}>` +
            `${mathML}</${tag}>`
  },
  indented(node) {
    return htmlTag("div", ast2html(node.content), { class: 'indented' }) + "\n"
  },
  boxed(node) {
    return htmlTag("div", ast2html(node.content), { class: 'boxed' }) + "\n"
  },
  centered(node) {
    return htmlTag("div", ast2html(node.content), { class: 'centered' }) + "\n"
  },
  hidden(node) {
    return htmlTag("div", ast2html(node.content), { class: 'hidden' }) + "\n"
  },
  note(node) {
    return htmlTag("div", ast2html(node.content), { class: 'note' }) + "\n"
  },
  tip(node) {
    return htmlTag("div", ast2html(node.content), { class: 'tip' }) + "\n"
  },
  important(node) {
    return htmlTag("div", ast2html(node.content), { class: 'important' }) + "\n"
  },
  warning(node) {
    return htmlTag("div", ast2html(node.content), { class: 'warning' }) + "\n"
  },
  header(node)   {
    return htmlTag("header", ast2html(node.content)) + "\n"
  },
  toc(node)      { return writeTOC(node) },
  comment(node)  {
    return htmlTag("aside", ast2html(node.content), { class: 'comment' }) + "\n"
  },
  dt(node)    {
    let text = ast2html(node.content)
    let tag = htmlTag("dt", text)
    // Add id so others can link to it.
    const pos = text.indexOf("(")
    if (pos > -1) { text = text.slice(0, pos).replace("_", "-") }
    tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/\s+/g, '-') + "'" + tag.slice(3)
    return tag + "\n"
  },
  dd(node)    { return htmlTag("dd", ast2html(node.content)) + "\n" },
  text(node) {
    const text = sanitizeText(node.text)
    if (!node.marks) {
      return text
    } else {
      let span = text
      for (const mark of node.marks) {
        if (mark.type === "link") {
          let tag = `<a href='${mark.attrs.href}'`
          if (mark.attrs.title) { tag += ` title='${mark.attrs.title}''` }
          span = tag + ">" + span + "</a>"
        } else {
          const tag = tagName[mark.type]
          span = `<${tag}>${span}</${tag}>`
        }
      }
      return span
    }
  }
}

const getTOCitems = (ast, tocArray, start, end, node) => {
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      getTOCitems(ast[i], tocArray, start, end, node)
    }
  } else if (ast && ast.type === "heading") {
    const level = ast.attrs.level
    if (start <= level && level <= end) {
      tocArray.push([headingText(ast.content), level - start])
    }
  } else if (ast.type === "toc") {
    node.push(ast)
  // eslint-disable-next-line no-prototype-builtins
  } else if (ast.hasOwnProperty("content")) {
    for (let j = 0; j < ast.content.length; j++) {
      getTOCitems(ast.content[j], tocArray, start, end, node)
    }
  }
}

const ast2html = ast => {
  // Return HTML.
  let html = ""
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      html += ast2html(ast[i])
    }
  } else if (ast && ast.type === "doc") {
    html += ast2html(ast.content)
  } else if (ast && ast.type !== "null") {
    html += nodes[ast.type](ast)
  }
  return html
}

const wrapWithHead = (html, title, attrs) => {
  title = title ? title : "Hurmet doc"
  const fontClass = attrs && attrs.fontSize
    ? { "10": "long-primer", "12": "pica", "18": "great-primer" }[attrs.fontSize]
    : "long-primer"
  const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
<article class="ProseMirror ${fontClass}">
`
  return head + html + "\n</article>\n</body>\n</html>"
}

export async function md2html(md, title = "", inHtml = false) {
  // Convert the Markdown to an AST that matches the Hurmet internal data structure.
  let ast = md2ast(md, inHtml)

  // Populate a Table of Contents, if any exists.
  const tocCapture = /\n *\n{\.toc start=(\d) end=(\d)}\n/.exec(md)
  if (tocCapture) {
    const start = Number(tocCapture[1])
    const end = Number(tocCapture[2])
    const tocArray = [];
    const node = [];
    getTOCitems(ast, tocArray, start, end, node)
    node[0].attrs.body = tocArray
  }

  // Perform calculations
  ast = await updateCalcs(ast)

  // Write the HTML
  let html = ast2html(ast)

  if (title.length > 0) {
    html = wrapWithHead(html, title, ast.attrs)
  }

  return html
}
