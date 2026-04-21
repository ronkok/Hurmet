import { md2ast } from "./md2ast.js"
import { updateCalcs } from "./updateCalcsForCLI.js"
import { hurmetMarkdownSerializer } from "./to_markdown"
import { headingText } from "./md2html.js"

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

export async function updateHurmetDocWithResults(md) {
  // Update the calculations of a Hurmet document and return a Hurmet Markdown
  // document with results written inline.

  // A Hurmet document is written in Markdown.
  //     To extent possible, it matches GitHub Flavored Markdown (GFM)
  //     For extensions beyond GFM, it matches, to the extent possible, Pandoc
  //     For calculations, Hurmet has its own format.

  // Start by converting the Markdown to an AST that matches
  // the Hurmet internal data structure.
  let ast = md2ast(md, false)

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
  // This is asynchronous because a calculation may need to fetch some remote data.
  ast = await updateCalcs(ast)

  // Write the updated Markdown
  const updatedMarkdown = hurmetMarkdownSerializer.serialize(ast, new Map(), [],
                                                             false, false, true)
  return updatedMarkdown
}
