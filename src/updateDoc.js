import { md2ast } from "./md2ast.js"
import { updateCalcs } from "./updateCalcsForCLI.js"
import { hurmetMarkdownSerializer } from "./to_markdown"
import { schema } from "./schema.js"
import {
  mergeSavedMarkdownPathData,
  stringifyMarkdownPathDefinitions
} from "./snapshots.js"

export async function updateAndSave(md) {
  // Update the calculations of a Hurmet document and return a Hurmet Markdown
  // document with results written inline.

  let ast = md2ast(md, false)

  /*
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
  */

  ast = await updateCalcs(ast)
  const pmDoc = schema.nodeFromJSON(ast)

  const currentMarkdown = hurmetMarkdownSerializer.serialize(
    pmDoc,
    new Map(),
    [],
    false,
    true
  )

  const savedPathData = mergeSavedMarkdownPathData(
    currentMarkdown,
    ast.attrs.snapshots,
    ast.attrs.snapshotPathCache
  )

  /* eslint-disable max-len */
  let updatedMarkdown = `---------------
decimalFormat: ${ast.attrs.decimalFormat}
fontSize: ${ast.attrs.fontSize}
pageSize: ${ast.attrs.pageSize}
dateFormat: ${ast.attrs.dateFormat}
saveDate: ${new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toISOString().split("T")[0]}
---------------

${savedPathData.body}`
  /* eslint-enable max-len */

  const pathDefText = stringifyMarkdownPathDefinitions(savedPathData.pathDefs)
  if (pathDefText.length > 0) {
    updatedMarkdown += `\n\n${pathDefText}`
  }

  // updateDoc.js cannot rebuild fallback data because it has no state.doc traversal.
  for (const snapshot of savedPathData.snapshots) {
    updatedMarkdown +=
      `\n\n<!--SNAPSHOT-->\ndate: ${snapshot.date}\nmessage: ${snapshot.message}\n\n`
    updatedMarkdown += snapshot.content
  }

  return updatedMarkdown
}
