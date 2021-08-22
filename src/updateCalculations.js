import { parse } from "./parser"
import { insertOneHurmetVar } from "./insertOneHurmetVar"
import { prepareStatement } from "./prepareStatement"
import { improveQuantities } from "./improveQuantities"
import { evaluate } from "./evaluate"
import { scanModule } from "./module"
import { DataFrame } from "./dataframe"
import { Tbl } from "./table"
import { dt } from "./constants"
import { clone, addTextEscapes } from "./utils"

/*
 *  This module mostly organizes one or two passes through the data structure of a Hurmet
 *  document, calling for a calculation to be done on each Hurmet calculation cell.
 *  If you are looking for the calculation itself, look at evaluate.js.
 *
 *  To be more precise, this module is called:
 *    1. When an author submits one calculation cell, or
 *    2. When a new Hurmet.app instance has opened (from index.js), or
 *    3. When a user has opened a new file         (from openFile.js), or
 *    4. When a recalculate-all has been called, possibly after a paste. (from menu.js)
 *
 *  Case 1 calculates the submitted cell and all dependent calculation cells.
 *  Cases 2 thru 4 re-calculate the entire document. I.e., isCalcAll is set to true.
 *  After calculation is complete, we send the results to ProseMirror to be
 *  rendered in the document.
 *
 *   This module's main exported function is updateCalculations(…)
 */

/*
* Note 1: state.selection shenanigans
*
* Before creating a ProseMirror (PM) transaction, this module first changes `state.selection`.
* That is to say, I change the PM state without running that change thru a PM transaction.
* PM docs advise against that, so I want to explain why I do so.
*
* For Undo purposes, a calculation should be atomic.
* An Undo of a calculation should return the doc to the condition before the
* calculation cell was edited. That will feel natural to people accustomed to Excel.
* When a calculation is submitted, Hurmet creates a single PM transaction and into it,
* Hurmet collects all the changes that the calculation makes to the original cell and
* also all the changes to dependent cells.
* When a user submits a calculation, the cell is open, so a PM Undo would ordinarily return
* the state to a condition that once again has the cell open.
*
* But now consider a user who wants to Undo twice. The first Undo retreats to a condition in
* which a cell is open. The user thinks a second Undo will change the PM document. But no!
* Because the cell is open, the CodeMirror plain text editor is active and the Undo is captured
* by CodeMirror. An Undo affects CodeMirror but not the outer document. It's very confusing!
* So the Undo should return to a condition in which the cell is closed. That's why I change
* the PM state.selection object _before_ I create the PM transaction. I don't want an Undo to
* open that cell and so I don't want the Undo to finish with the selection point inside the
* cell. Before creating the transaction, I move the selection point to just after the cell.
*/

const fetchRegEx = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′* *= *(?:fetch|import)\(/
const importRegEx = /^[^=]+= *import/
const fileErrorRegEx = /^Error while reading file. Status Code: \d*$/
const textRegEx = /\\text{[^}]+}/
const lineChartRegEx = /^lineChart/

const urlFromEntry = entry => {
  // Get the URL from the entry input string.
  const str = entry.replace(/^[^()]+\("?/, "")
  return str.replace(/"?\).*$/, "").trim()
}

// Helper function.
const processFetchedString = (entry, text, hurmetVars, decimalFormat) => {
  const attrs = Object.create(null)
  attrs.entry = entry
  attrs.name = entry.replace(/=.+$/, "").trim()
  let str = parse(entry.replace(/\s*=\s*[$$£¥\u20A0-\u20CF]?(?:!{1,2}).*$/, ""), decimalFormat)
  const url = urlFromEntry(entry)
  if (/\.(?:csv|hrms)$/.test(url)) {
    // Shorten the URL. Provide a clickable link.
    const fileName = url.replace(/.+\//, "")
    const match = textRegEx.exec(str)
    str = str.slice(0, match.index) + "\\href{" + url + "}{\\text{" +
          addTextEscapes(fileName) + "}}" + str.slice(match.index + match[0].length)
  }
  attrs.tex = str
  attrs.alt = entry
  if (text === "File not found." || fileErrorRegEx.test(text)) {
    attrs.dtype = dt.ERROR
    attrs.tex += ` = \\red{\\text{${text}}}`
    attrs.alt = " = " + text
    attrs.value = null
    return attrs
  }
  const data = importRegEx.test(entry)
    ? scanModule(text, decimalFormat)               // import code
    : DataFrame.dataFrameFromCSV(text, hurmetVars)  // fetch data

  // Append the data to attrs
  attrs.value = data.value
  attrs.dtype = data.dtype
  attrs.unit = data.unit
  attrs.isFetch = true
  if (data.dtype === dt.MODULE && /^importedParameters *=/.test(entry)) {
    // Assign to multiple variables, not one namespace.
    let nameTex = "\\begin{matrix}"
    let i = 0
    Object.entries(data.value).forEach(([key, value]) => {
      hurmetVars[key] =  value
      nameTex += parse(value.name) + " & "
      i += 1
      if (i === 5) {
        nameTex = nameTex.slice(0, -1) + "\\\\ "
        i = 0
      }
    })
    nameTex = nameTex.slice(0, (i === 0 ? -2 : -1)) + "\\end{matrix}"
    attrs.tex = attrs.tex.replace("\\mathrm{importedParameters}", nameTex)
  }
  return attrs
}

const workAsync = (
  view,
  calcNodeSchema,
  isCalcAll,
  nodeAttrs,
  curPos,
  hurmetVars,
  urls,
  fetchPositions
) => {

  // Here we fetch the remote data.
  const doc = view.state.doc
  const inDraftMode = doc.attrs.inDraftMode
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
    // Create a ProseMirror transacation.
    // Each node update below will be one step in the transaction.
    const state = view.state
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1))
    }
    const tr = state.tr

    // Load in the data from the fetch statements
    for (let i = 0; i < texts.length; i++) {
      const pos = fetchPositions[i]
      const entry = isCalcAll
        ? doc.nodeAt(pos).attrs.entry
        : nodeAttrs.entry
      const attrs = processFetchedString(entry, texts[i], hurmetVars, decimalFormat)
      attrs.inDraftMode = inDraftMode
      tr.replaceWith(pos, pos + 1, calcNodeSchema.createAndFill(attrs))
      if (attrs.name) {
        insertOneHurmetVar(hurmetVars, attrs)
      }
    }
    // There. Fetches are done and are loaded into the document.
    // Now proceed to the rest of the work.
    try {
      proceedAfterFetch(view, calcNodeSchema, isCalcAll, nodeAttrs,
                        curPos, hurmetVars, tr)
    } catch (err) {
      const pos = nodeAttrs.template.indexOf(nodeAttrs.resultdisplay)
      nodeAttrs.tex = nodeAttrs.template.slice(0, pos) + "\\text{" + err + "}"
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs))
      tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)))
      view.dispatch(tr)
      view.focus()
    }
  })
}

const proceedAfterFetch = (
  view,
  calcNodeSchema,
  isCalcAll,
  nodeAttrs,
  curPos,
  hurmetVars,
  tr
) => {
  // This function happens either
  //   1. After remote, fetched data has been processed, or
  //   2. After we know that no fetch statements need be processed.
  const doc = view.state.doc
  const decimalFormat = doc.attrs.decimalFormat

  if (!isCalcAll && (nodeAttrs.name || nodeAttrs.rpn)) {
    // Load hurmetVars with values from earlier in the document.
    doc.nodesBetween(0, curPos, function(node) {
      if (node.type.name === "calculation") {
        const attrs = node.attrs
        if (attrs.name) {
          if (attrs.name === "importedParameters") {
            Object.entries(attrs.value).forEach(([key, value]) => {
              hurmetVars[key] =  value
            })
          } else {
            insertOneHurmetVar(hurmetVars, attrs)
          }
        }
      }
    })

    // Calculate the current node.
    if (!fetchRegEx.test(nodeAttrs.entry)) {
      // This is the typical calculation statement. We'll evalutate it.
      let attrs = clone(nodeAttrs) // prepareStatement was already run in mathprompt.js.
      // The mathPrompt dialog box did not have accesss to hurmetVars, so it
      // did not do unit conversions on the result template. Do that first.
      improveQuantities(attrs, hurmetVars)
      // Now proceed to do the calculation of the cell.
      if (attrs.dtype === dt.DATAFRAME && attrs.value.attrs && attrs.value.attrs.length > 0) {
        attrs = Tbl.prepare(attrs, hurmetVars, decimalFormat)
        attrs = Tbl.evaluate(attrs, hurmetVars, decimalFormat)
      } else if (attrs.rpn) {
        attrs = evaluate(attrs, hurmetVars, decimalFormat)
      }
      if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs) }
      attrs.displayMode = nodeAttrs.displayMode
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(attrs))
    }
  }

  // Finally, update calculations after startPos.
  const startPos = isCalcAll ? 0 : (curPos + 1)
  doc.nodesBetween(startPos, doc.content.size, function(node, pos) {
    if (node.type.name === "calculation") {
      const mustCalc = isCalcAll ? !fetchRegEx.test(node.attrs.entry) : !node.attrs.isFetch
      if (mustCalc) {
        const entry = node.attrs.entry
        let attrs = isCalcAll || lineChartRegEx.test(entry)
          ? prepareStatement(entry, decimalFormat)
          : clone(node.attrs)
        attrs.displayMode = node.attrs.displayMode
        if (isCalcAll || attrs.rpn || (attrs.name && !(hurmetVars[attrs.name] &&
          hurmetVars[attrs.name].isFetch))) {
          if (isCalcAll) { improveQuantities(attrs, hurmetVars) }
          if (attrs.dtype === dt.DATAFRAME && attrs.value.attrs &&
              attrs.value.attrs.length > 0) {
            attrs = Tbl.prepare(attrs, decimalFormat)
            attrs = Tbl.evaluate(attrs, hurmetVars, decimalFormat)
          } else if (attrs.rpn) {
            attrs = evaluate(attrs, hurmetVars, decimalFormat)
          }
          if (attrs.name) { insertOneHurmetVar(hurmetVars, attrs) }
          if (isCalcAll || attrs.rpn) {
            tr.replaceWith(pos, pos + 1, calcNodeSchema.createAndFill(attrs))
          }
        } else if (attrs.name && !(isCalcAll && attrs.isFetch)) {
          if (attrs.name) {
            if (attrs.name === "importedParameters") {
              Object.entries(attrs.value).forEach(([key, value]) => {
                hurmetVars[key] =  value
              })
            } else {
              insertOneHurmetVar(hurmetVars, attrs)
            }
          }
        }
      }
    }
  })

  // All the steps are now loaded into the transaction.
  // Dispatch the transaction to ProseMirror, which will re-render the document.
  if (!isCalcAll) {
    tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)))
  }
  view.dispatch(tr)
  view.focus()
}

export function updateCalculations(
  view,
  calcNodeSchema,
  isCalcAll = false,
  nodeAttrs,
  curPos
) {
  const doc = view.state.doc

  if (!(isCalcAll || nodeAttrs.name || nodeAttrs.rpn)) {
    // No calculation is required. Just render the node and get out.
    const state = view.state
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1))
    }
    const tr = state.tr
    try {
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs))
    } catch (err) {
      // nada
    } finally {
      view.dispatch(tr)
      view.focus()
    }
    return
  }

  // Create an object in which we'll hold variable values.
  const hurmetVars = Object.create(null)
  hurmetVars.format = { value: "h15" } // default rounding format

  // Get an array of all the URLs called by fetch statements.
  const urls = []
  const fetchPositions = []
  if (!isCalcAll) {
    // The author has submitted a single calculation cell.
    const entry = nodeAttrs.entry
    if (fetchRegEx.test(entry)) {
      urls.push(urlFromEntry(entry))
      fetchPositions.push(curPos)
    }
  } else {
    // We're updating the entire document.
    doc.nodesBetween(0, doc.content.size, function(node, pos) {
      if (node.type.name === "calculation" && !node.attrs.value) {
        const entry = node.attrs.entry
        if (fetchRegEx.test(entry)) {
          urls.push(urlFromEntry(entry))
          fetchPositions.push(pos)
        }
      } else if (node.attrs.isFetch) {
        insertOneHurmetVar(hurmetVars, node.attrs)
      }
    })
  }

  if (urls.length > 0) {
    // We have to fetch some remote data. Asynchronous work ahead.
    workAsync(view, calcNodeSchema, isCalcAll, nodeAttrs, curPos,
              hurmetVars, urls, fetchPositions)
  } else {
    // Skip the fetches and go directly to work that we can do synchronously.
    const state = view.state
    if (state.selection.to === curPos + 1) {
      // See Note 1 above for an explanation of the state.selection shenanigans.
      state.selection = state.selection.constructor.near(state.doc.resolve(curPos + 1))
    }
    const tr = state.tr
    try {
      proceedAfterFetch(view, calcNodeSchema, isCalcAll, nodeAttrs, curPos, hurmetVars, tr)
    } catch (err) {
      const pos = nodeAttrs.template.indexOf(nodeAttrs.resultdisplay)
      nodeAttrs.tex = nodeAttrs.template.slice(0, pos) + "\\text{" + err + "}"
      tr.replaceWith(curPos, curPos + 1, calcNodeSchema.createAndFill(nodeAttrs))
      tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(curPos + 1)))
      view.dispatch(tr)
      view.focus()
    }
  }
}
