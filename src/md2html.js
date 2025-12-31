import { parse } from "./parser.js"
import { md2ast } from "./md2ast.js"
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
  // eslint-disable-next-line no-unused-vars
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
export const sanitizeText = function(text /* : Attr */) {
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

export const tagName = {
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

export const headingText = content => {
  let str = ""
  for (const node of content) {
    if (node.type && node.type === "text") {
      str += node.text
    }
  }
  return sanitizeText(str)
}

const headings = [];
const headingLinkRegEx = /[,()]/g

const nodes = {
  html(node) { return node.text },
  heading(node) {
    const text = headingText(node.content)
    let tag = "h" + node.attrs.level
    tag = htmlTag(tag, text)
    if (!headings.includes(text)) {
    // Add an id so others can link to it.
      tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(headingLinkRegEx, "").replace(/\s+/g, '-') + "'" + tag.slice(3)
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
    const attributes = { class: node.attrs.class, start: node.attrs.order }
    return htmlTag("ol", ast2html(node.content), attributes) + "\n"
  },
  bullet_list(node)  { return htmlTag("ul", ast2html(node.content)) + "\n" },
  list_item(node)    { return htmlTag("li", ast2html(node.content)) + "\n" },
  tight_list_item(node) {
    return htmlTag("li", ast2html(node.content), { class: "tight" }) + "\n"
  },
  table(node) {
    const attributes = ("dtype" in node.attrs) && node.attrs.dtype === dt.SPREADSHEET
      ? {  class: node.attrs.class, dtype: dt.SPREADSHEET }
      : {  class: node.attrs.class }
    return htmlTag("table", ast2html(node.content), attributes) + "\n"
  },
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
  spreadsheet_cell(node) {
    const display = node.attrs.display ? node.attrs.display : node.attrs.entry
    return `<div class='hurmet-cell' data-entry=${dataStr(node.attrs.entry)}>` + display
           + '</div>'
  },
  link_node(node) {
    const href = sanitizeUrl(node.attrs.href)
    return htmlTag("a", ast2html(node.content), { href, title: href })
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
  footnote(node)   { return htmlTag("footnote", "") },
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
      const mathML = globalThis.temml.renderToString(
        tex,
        { trust: true, wrap: "=", displayMode: (node.attrs.displayMode || false) }
      )
      const tag = node.attrs.displayMode ? "p" : "span"
      return `<${tag} class='hurmet-calc' data-entry=${dataStr(node.attrs.entry)}>` +
              `${mathML}</${tag}>`
    }
  },
  tex(node) {
    const mathML = globalThis.temml.renderToString(
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
  right_justified(node) {
    return htmlTag("div", ast2html(node.content), { class: 'right_justified' }) + "\n"
  },
  hidden(node) {
    return htmlTag("div", ast2html(node.content), { class: 'hidden' }) + "\n"
  },
  epigraph(node) {
    return htmlTag("blockquote", ast2html(node.content), { class: 'epigraph' }) + "\n"
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
      let iLink = -1
      for (let i = 0; i < node.marks.length; i++) {
        const mark = node.marks[i];
        if (mark.type === "link") {
          iLink = i
        } else {
          const tag = tagName[mark.type];
          span = `<${tag}>${span}</${tag}>`
        }
      }
      if (iLink >= 0) {
        // The <a> tag must be the outermost tag on text elements.
        // That enables the regex replace trick used in md2html() below.
        const mark = node.marks[iLink];
        const tag = `<a href='${mark.attrs.href}'`
        span = tag + ">" + span + "</a>"
      }
      return span
    }
  }
}

const getFootnotes = (ast, footnotes) => {
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      getFootnotes(ast[i], footnotes)
    }
  } else if (ast && ast.type === "footnote") {
    footnotes.push(ast.content)
  // eslint-disable-next-line no-prototype-builtins
  } else if (ast.hasOwnProperty("content")) {
    for (let j = 0; j < ast.content.length; j++) {
      getFootnotes(ast.content[j], footnotes)
    }
  }
}

export const ast2html = ast => {
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

const ast2text = ast => {
  let text = ""
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      text += ast2text(ast[i])
    }
  } else if (typeof ast === "object" && "content" in ast) {
    for (let i = 0; i < ast.content.length; i++) {
      text += ast2text(ast.content[i])
    }
  } else if ((ast && ast.type === "text")) {
    text += ast.text
  } else if (ast && ast.type === "hard_break") {
    text += "\n"
  } else if (ast && ast.type !== "null") {
    text += ""
  }
  return text
}

export const md2text = md => {
  // Get the text content of some inlne Markdown
  const ast = md2ast(md, false)
  return ast2text(ast)
}

export const md2html = (md, inHtml = false) => {
  const ast = md2ast(md, inHtml)
  let html = ast2html(ast)
  // If you edit the next line, do the same in hurmet2html.js.
  html = html.replace(/<\/a><a href='[^']*'>/g, "")

  // Write the footnotes, if any.
  const footnotes = [];
  getFootnotes(ast, footnotes)
  if (footnotes.length > 0) {
    html += "\n<hr>\n<ol>\n"
    for (const footnote of footnotes) {
      html += "<li><p>" + ast2html(footnote) + "</p></li>\n"
    }
    html += "</ol>\n"
  }
  return html
}
