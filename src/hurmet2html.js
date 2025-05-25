import { md2ast } from "./md2ast.js"
import { updateCalcs } from "./updateCalcsForCLI.js"
import { ast2html, headingText } from "./md2html.js"

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
<div class="ProseMirror-setup">
`
  return head + html + "\n</div></article>\n</body>\n</html>"
}

export async function hurmet2html(md, title = "", inHtml = false) {
  // Convert a Hurmet document to HTML.

  // A Hurmet document is written in Markdown.
  //     To extent possible, it matches GitHub Flavored Markdown (GFM)
  //     For extensions beyond GFM, it matches, to the extent possible, Pandoc
  //     For calculations, Hurmet has its own format.

  // Start by converting the Markdown to an AST that matches
  // the Hurmet internal data structure.
  let ast = md2ast(md, inHtml)

  // Populate a Hurmet Table of Contents, if any exists.
  const tocCapture = /\n *\n{\.toc start=(\d) end=(\d)}\n/.exec(md)
  if (tocCapture) {
    const start = Number(tocCapture[1])
    const end = Number(tocCapture[2])
    const tocArray = [];
    const node = [];
    getTOCitems(ast, tocArray, start, end, node)
    node[0].attrs.body = tocArray
  }

  // Perform Hurmet calculations.
  // This is asynchronous because a caclulation may need to fetch some remote data.
  ast = await updateCalcs(ast)

  // Write the HTML
  let html = ast2html(ast)
  // If you edit the next line, do the same in md2html.js.
  html = html.replace(/<\/a><a href='[^']*'>/g, "")

  if (title.length > 0) {
    html = wrapWithHead(html, title, ast.attrs)
  }

  return html
}
