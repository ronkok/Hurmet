import { prepareStatement } from "./prepareStatement"
import { improveQuantities } from "./improveQuantities"
import { evaluate, evaluateDrawing } from "./evaluate"
import { dt } from "./constants"
import { helpers } from "./updateCalculations"
import { insertOneHurmetVar } from "./insertOneHurmetVar"

async function fetchTexts(urls) {
  // Here we fetch remote data.
  return Promise.all(
    urls.map(url => fetch(url, {
      method: "GET",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      mode: "cors"
    }))
  ).then(fetchResponses => {
    // The fetch promises have resolved. Now we extract their text.
    return Promise.all(fetchResponses.map(r => {
      if (r.status !== 200 && r.status !== 0) {
        return r.status === 404
          ? 'File not found.'
          : 'Error while reading file. Status Code: ' + r.status
      }
      return r.text()
    }))
  }).then((texts) => {
    // At this point, we have the text of each Hurmet fetch and import.
    return texts
  })
}

async function getRemoteTexts(urls) {
  // This is necessary to return text, not just a promise of text.
  return await fetchTexts(urls)
}

const getCalcNodes = (ast, calcNodes) => {
  // Create an array of calculation nodes.
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      getCalcNodes(ast[i], calcNodes)
    }
  } else if (ast && ast.type === "calculation") {
    calcNodes.push(ast)
  // eslint-disable-next-line no-prototype-builtins
  } else if (ast.hasOwnProperty("content")) {
    for (let j = 0; j < ast.content.length; j++) {
      getCalcNodes(ast.content[j], calcNodes)
    }
  }
}

export async function updateCalcs(doc) {
  // This function is a lot like what updateCalculations.js does for the Hurmet web site.

  // Create an object in which we'll hold variable values.
  const hurmetVars = Object.create(null)
  hurmetVars.format = { value: "h15" } // default rounding format
  const decimalFormat = doc.attrs ? doc.attrs.decimalFormat : '1,000,000.'

  // Create an array of all the calculation nodes in the document
  const calcNodes = [];
  getCalcNodes(Array.isArray(doc) ? doc : doc.content, calcNodes)
  if (calcNodes.length === 0) { return doc }

  // Get an array of all the URLs called by fetch statements.
  const urls = [];
  const callers = [];
  for (const node of calcNodes) {
    const entry = node.attrs.entry
    if (helpers.fetchRegEx.test(entry)) {
      urls.push(helpers.urlFromEntry(entry))
      callers.push(node)
    } else if (/^function /.test(entry)) {
      node.attrs = prepareStatement(entry, decimalFormat)
      insertOneHurmetVar(hurmetVars, node.attrs, null, decimalFormat)
    }
  }

  if (urls.length > 0) {
    // We have to fetch some remote data.
    const texts = await getRemoteTexts(urls)
    // Fetches are now complete. Load in the data.
    for (let i = 0; i < texts.length; i++) {
      const node = callers[i]
      const entry = node.attrs.entry
      // When we modify a node, we are also mutating the container doc.
      node.attrs = helpers.processFetchedString(entry, texts[i], hurmetVars, decimalFormat)
      if (node.attrs.name) {
        if (node.attrs.name === "importedParameters") {
          Object.entries(node.attrs.value).forEach(([key, value]) => {
            hurmetVars[key] =  value
          })
        } else {
          insertOneHurmetVar(hurmetVars, node.attrs, null, decimalFormat)
        }
      }
    }
  }

  // Fetches, if any, are now complete and loaded into hurmetVars.
  // Make a pass through the calculation nodes and calculate each result.
  try {
    for (const node of calcNodes) {
      if (!helpers.fetchRegEx.test(node.attrs.entry)) {
        const entry = node.attrs.entry
        let attrs = prepareStatement(entry, decimalFormat)
        attrs.displayMode = node.attrs.displayMode
        const mustDraw = attrs.dtype && attrs.dtype === dt.DRAWING
        improveQuantities(attrs, hurmetVars)
        if (attrs.rpn || mustDraw) {
          attrs = attrs.rpn
            ? evaluate(attrs, hurmetVars, decimalFormat)
            : evaluateDrawing(attrs, hurmetVars, decimalFormat)
        }
        if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs, null, decimalFormat) }
        // When we modify a node, we are also mutating the container doc.
        node.attrs = attrs
      }
    }
    return doc
  } catch (err) {
    console.log(err) // eslint-disable-line no-console
  }
}

