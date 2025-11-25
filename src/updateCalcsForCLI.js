import { compile } from "./compile"
import { compileSheet } from "./spreadsheet"
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
  } else if (ast && ast.type === "table" && "name" in ast.attrs) {
    calcNodes.push(ast)
  } else if ("content" in ast) {
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
  hurmetVars["@savedate"] = doc.attrs.saveDate
  const formats = {
    decimalFormat: doc.attrs.decimalFormat,
    dateFormat: doc.attrs.dateFormat
  }

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
      let url = helpers.urlFromEntry(entry)
      if (!/\.(tsv|txt)$/.test(url)) {
        const pos = url.lastIndexOf("/")
        url = url.slice(pos + 1)
        // eslint-disable-next-line no-console
        console.log(`Warning: Only .tsv and .txt files can be fetched.\n${url}`)
      } else {
        urls.push(url)
        callers.push(node)
      }
    } else if (/^function /.test(entry)) {
      node.attrs = compile(entry, formats)
      insertOneHurmetVar(hurmetVars, node.attrs, null, formats.decimalFormat)
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
      node.attrs = helpers.processFetchedString(entry, texts[i], hurmetVars, formats)
      if (node.attrs.name) {
        if (node.attrs.name === "importedParameters") {
          Object.entries(node.attrs.value).forEach(([key, value]) => {
            hurmetVars[key] =  value
          })
        } else {
          insertOneHurmetVar(hurmetVars, node.attrs, null, formats.decimalFormat)
        }
      }
    }
  }

  // Fetches, if any, are now complete and loaded into hurmetVars.
  // Make a pass through the calculation nodes and calculate each result.
  try {
    for (const node of calcNodes) {
      if (node.type === "calculation") {
        if (!helpers.fetchRegEx.test(node.attrs.entry)) {
          const entry = node.attrs.entry
          let attrs = compile(entry, formats)
          attrs.displayMode = node.attrs.displayMode
          const mustDraw = attrs.dtype && attrs.dtype === dt.DRAWING
          if (attrs.rpn || mustDraw) {
            attrs = attrs.rpn
              ? evaluate(attrs, hurmetVars, formats)
              : evaluateDrawing(attrs, hurmetVars, formats)
          }
          if (attrs.name) {
            insertOneHurmetVar(hurmetVars, attrs, null, formats.decimalFormat)
          }
          // When we modify a node, we are also mutating the container doc.
          node.attrs = attrs
        }
      } else if ("dtype" in node.attrs && node.attrs.dtype === dt.SPREADSHEET) {
        // node is a spreadsheet
        const sheet = compileSheet(node, formats)
        const sheetName = sheet.attrs.name
        hurmetVars[sheetName] = sheet.attrs
        hurmetVars[sheetName].value = {}
        const numRows = sheet.content.length
        const numCols = sheet.content[0].content.length
        sheet.attrs.rowMap = {}
        // Proceed column-wise thru the sheet.
        for (let j = 0; j < numCols; j++) {
          for (let i = 1; i < numRows; i++) {
            const cell = sheet.content[i].content[j].content[0];
            if (cell.attrs.rpn) {
              cell.attrs.altresulttemplate = cell.attrs.resulttemplate
              cell.attrs = evaluate(cell.attrs, hurmetVars, formats)
              cell.attrs.display = cell.attrs.alt
              if (j === 0) { sheet.attrs.rowMap[cell.attrs.alt] = i }
            } else if (j === 0 && typeof cell.attrs.value === "string") {
              sheet.attrs.rowMap[cell.attrs.value] = i
            }
            hurmetVars[sheetName].value[cell.attrs.name] = cell.attrs
          }
        }
        node.attrs = sheet.attrs
        node.content = sheet.content
      }
    }
    return doc
  } catch (err) {
    console.log(err) // eslint-disable-line no-console
  }
}

