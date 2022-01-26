const hurmet = require("../preview/hurmet.js")
import { md2ast } from "../src/md2ast"

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
        attributeString += " " + sanitizeText(attr) + '="' + sanitizeText(attribute) + '"';
      }
    }
  }

  const unclosedTag = "<" + tagName + attributeString + ">";

  if (isClosed) {
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

const nodes = {
  html(node) { return node.text },
  heading(node)    {
    const text = output(node.content)
    let tag = "h" + node.attrs.level
    tag = htmlTag(tag, text)
    // Add id so others can link to it.
    tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/,/g, "").replace(/\s+/g, '-') + "'" + tag.slice(3)
    return tag + "\n"
  },
  paragraph(node)  { return htmlTag("p", output(node.content)) + "\n" },
  blockquote(node) {return htmlTag("blockquote", output(node.content)) },
  code_block(node) {
    return htmlTag("pre", htmlTag("code", sanitizeText(node.content[0].text)))
  },
  hard_break(node) { return "<br>" },
  def(node)        { return "" },
  newline(node)    { return "\n" },
  horizontal_rule(node) { return "<hr>\n" },
  ordered_list(node) {
    const attributes = node.attrs.order !== 1 ? { start: node.attrs.order } : undefined
    return htmlTag("ol", output(node.content), attributes) + "\n"
  },
  bullet_list(node)  { return htmlTag("ul", output(node.content)) + "\n" },
  list_item(node)    { return htmlTag("li", output(node.content)) + "\n" },
  table(node)        { return htmlTag("table", output(node.content), node.attrs) + "\n" },
  table_row(node)    { return htmlTag("tr", output(node.content)) + "\n" },
  table_header(node) {
    const attributes = {}
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan }
    if (node.attrs.colwidth !== null && !isNaN(node.attrs.colwidth) ) {
      attributes.style = `width: ${node.attrs.colwidth}px`
    }
    return htmlTag("th", output(node.content), attributes) + "\n"
  },
  table_cell(node) {
    const attributes = {}
    if (node.attrs.colspan !== 1) { attributes.colspan = node.attrs.colspan }
    if (node.attrs.rowspan !== 1) { attributes.rowspan = node.attrs.rowspan }
    if (node.attrs.colwidth !== null && !isNaN(node.attrs.colwidth) ) {
      attributes.style = `width: ${node.attrs.colwidth}px`
    }
    return htmlTag("td", output(node.content), attributes)
  },
  link(node) {
    const attributes = { href: sanitizeUrl(node.attrs.href), title: node.attrs.title };
    return htmlTag("a", output(node.content), attributes);
  },
  image(node) {
    const attributes = { src: sanitizeUrl(node.attrs.src), alt: node.attrs.alt };
    if (node.attrs.class) { attributes.class = node.attrs.class }
    if (node.attrs.id)    { attributes.id = node.attrs.id }
    if (node.attrs.width) { attributes.width = node.attrs.width }
    return htmlTag("img", "", attributes, false);
  },
  calculation(node) {
    const tex = hurmet.parse(node.attrs.entry)
    return htmlTag("span", "", { class: "tex", "data-tex": tex })
  },
  tex(node) {
    return htmlTag("span", "", { class: "hurmet-tex", "data-tex": node.tex })
  },
  indented_div(node)    { return htmlTag("div", output(node.content), { class: 'indented' }) },
  centered_div(node)    {
    return htmlTag("div", output(node.content), { class: 'centered' } )
  },
  dt(node)    {
    let text = output(node.content)
    let tag = htmlTag("dt", text)
    // Add id so others can link to it.
    const pos = text.indexOf("(")
    if (pos > -1) { text = text.slice(0, pos).replace("_", "-") }
    tag = tag.slice(0, 3) + " id='" + text.toLowerCase().replace(/\s+/g, '-') + "'" + tag.slice(3)
    return tag + "\n"
  },
  dd(node)    { return htmlTag("dd", output(node.content)) + "\n" },
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

const output = ast => {
  // Return HTML.
  let html = ""
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      html += output(ast[i])
    }
  } else if (ast.type !== "null") {
    html += nodes[ast.type](ast)
  }
  return html
}

const md2html = (md, inHtml = false) => {
  const ast = md2ast(md, inHtml)
  return output(ast)
}

export const hmd = {
  md2ast,
  md2html
}
