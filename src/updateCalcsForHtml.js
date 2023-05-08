import { dt } from "./constants"
import { helpers } from "./updateCalculations"
import { insertOneHurmetVar } from "./insertOneHurmetVar"
import { prepareStatement } from "./prepareStatement"
import { improveQuantities } from "./improveQuantities"
import { evaluate, evaluateDrawing } from "./evaluate"

/*
 *  This module is like updateCalculations.js, but written for the Hurmet CLI
 *  app instead of a ProseMirror document. For further explanatory
 *  notes, see updateCalculations.js
 */

const workAsync = (doc, calcNodes, hurmetVars, urls, callers) => {
  // Here we fetch the remote data.
  const decimalFormat = doc.attrs.decimalFormat

  Promise.all(
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
    // Load in the data from the fetch statements
    for (let i = 0; i < texts.length; i++) {
      const node = callers[i]
      const entry = node.attrs.entry
      node.attrs = helpers.processFetchedString(entry, texts[i], hurmetVars, decimalFormat)
      if (node.attrs.name) {
        insertOneHurmetVar(hurmetVars, node.attrs, decimalFormat)
      }
    }
    // There. Fetches are done and are loaded into the document.
    // Now proceed to the rest of the work.
    try {
      proceedAfterFetch(doc, calcNodes, hurmetVars)
    } catch (err) {
      console.log(err) // eslint-disable-line no-console
    }
  })
}

const proceedAfterFetch = (doc, calcNodes, hurmetVars) => {
  // This function happens either
  //   1. After remote, fetched data has been processed, or
  //   2. After we know that no fetch statements need be processed.
  const decimalFormat = doc.attrs.decimalFormat

  for (const node of calcNodes) {
    if (node.type.name === "calculation") {
      const mustCalc = !helpers.fetchRegEx.test(node.attrs.entry)
      if (mustCalc) {
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
        if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs, decimalFormat) }
        node.attrs = attrs
      } else if (node.attrs.name && !node.attrs.isFetch) {
        if (node.attrs.name) {
          if (node.attrs.name === "importedParameters") {
            Object.entries(node.attrs.value).forEach(([key, value]) => {
              hurmetVars[key] =  value
            })
          } else {
            insertOneHurmetVar(hurmetVars, node.attrs, decimalFormat)
          }
        }
      }
    }
  }
}

const getCalcNodes = (ast, calcNodes) => {
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; i++) {
      getCalcNodes(ast[i], calcNodes)
    }
  } else if (ast && ast.type === "calculation") {
    calcNodes.push(ast)
  }
}

export function updateCalcsForHtml(doc) {
  // Create an object in which we'll hold variable values.
  const hurmetVars = Object.create(null)
  hurmetVars.format = { value: "h15" } // default rounding format

  // Get an array of all the calculation nodes in the document
  const calcNodes = [];
  getCalcNodes(doc.content, calcNodes)

  // Get an array of all the URLs called by fetch statements.
  const urls = [];
  const callers = [];

  for (const node of calcNodes) {
    if (node.type.name === "calculation" && !node.attrs.value) {
      const entry = node.attrs.entry
      if (helpers.fetchRegEx.test(entry)) {
        urls.push(helpers.urlFromEntry(entry))
        callers.push(node)
      } else if (/^function /.test(entry)) {
        node.attrs = prepareStatement(entry, doc.attrs.decimalFormat)
        insertOneHurmetVar(hurmetVars, node.attrs, doc.attrs.decimalFormat)
      }
    } else if (node.attrs.isFetch || (node.attrs.dtype && node.attrs.dtype === dt.MODULE)) {
      insertOneHurmetVar(hurmetVars, node.attrs, doc.attrs.decimalFormat)
    }
  }

  if (urls.length > 0) {
    // We have to fetch some remote data. Asynchronous work ahead.
    workAsync(doc, calcNodes, hurmetVars, urls, callers)
  } else {
    // Skip the fetches and go directly to work that we can do synchronously.
    try {
      proceedAfterFetch(doc, calcNodes, hurmetVars)
    } catch (err) {
      console.log(err) // eslint-disable-line no-console
    }
  }
}
