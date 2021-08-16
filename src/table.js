import { parse } from "./parser"
import { evaluate } from "./evaluate"
import { Rnl } from "./rational"
import { DataFrame } from "./dataframe"
import { arrayOfRegExMatches, clone } from "./utils"

const varRegEx = /¿[^\xa0]+/g
const tableVarRegEx = /¿¿[^\xa0]+/g
const dotPropRegEx = /^\xa0"[^"]+"\xa0\.(?:\xa0|$)/
const sumRegEx = /\bsum\xa00(?:\xa0|$)/

// attrs: [row, col, entry, rpn, tex, template, altTemplate , numRows]

const prepare = (attrs, vars, decimalFormat) => {
  for (let i = 0; i < attrs.value.attrs.length; i++) {
    const j = attrs.value.attrs[i].col
    attrs.value.attrs[i].tex = ""
    attrs.value.attrs[i].template = ""
    attrs.value.attrs[i].altTemplate = ""
    let expression = attrs.value.attrs[i].entry.slice(1).trim()
    const isUnitAware = expression.charAt(0) === ":"
    if (isUnitAware) { expression = expression.slice(1).trim() }
    attrs.value.attrs[i].resulttemplate = isUnitAware ? "@@" : "@"
    attrs.value.attrs[i].resultdisplay = isUnitAware ? "@@" : "@"
    attrs.value.attrs[i].altresulttemplate = isUnitAware ? "@@" : "@"

    for (let k = i + 1; k < attrs.value.attrs.length; k++) {
      if (attrs.value.attrs[k].col === j) {
        attrs.value.attrs[i].numRows = attrs.value.attrs[k].row - attrs.value.attrs[i].row
        break
      }
    }
    if (!attrs.value.attrs[i].numRows) {
      attrs.value.attrs[i].numRows = attrs.value.data[j].length - attrs.value.attrs[i].row
    }

    // eslint-disable-next-line prefer-const
    let [_, rpn] = parse(expression, decimalFormat, true)
    const matches = arrayOfRegExMatches(varRegEx, rpn)
    for (let j = matches.length - 1; j >= 0; j--) {
      let varName = matches[j].value.slice(1)
      const trailStr = rpn.slice(matches[j].index + matches[j].length)
      if (!vars[varName] && dotPropRegEx.test(trailStr)) {
        const posDot = trailStr.indexOf("\xa0.")
        const varName2 = trailStr.slice(2, posDot - 1)
        rpn = rpn.slice(0, matches[j].index) + "¿" + attrs.name + `\xa0"` + varName2
            + `"\xa0"` + varName + `"\xa0[]\xa02` + trailStr.slice(posDot + 2)
      } else {
        if (varName.charAt(varName.length - 1) === "′") { varName = varName.slice(0, -1) }
        if (attrs.value.columnMap[varName]) {
          rpn = rpn.slice(0, matches[j].index) + "¿" + matches[j].value
              + rpn.slice(matches[j].index + matches[j].length)
        }
      }
    }
    attrs.value.attrs[i].rpn = rpn
  }
  return attrs
}

const evaluateTbl = (attrs, hurmetVars, decimalFormat) => {
  const columnMap = attrs.value.columnMap
  let gotSum = false
  for (let i = 0; i < attrs.value.attrs.length; i++) {
    const cell = attrs.value.attrs[i]
    const parentRpn = cell.rpn
    for (let row = cell.row; row < cell.row + cell.numRows; row++) {
      let cellAttrs = clone(cell)
      let rpn = parentRpn
      const isUnitAware = cellAttrs.resulttemplate === "@@" && attrs.value.units[cell.col]
      if (isUnitAware) {
        cellAttrs.unit = attrs.value.units[cell.col]
        const unit = attrs.unit[cellAttrs.unit]
        cellAttrs.expos = unit.expos
        cellAttrs.factor = unit.factor
        cellAttrs.gauge = unit.gauge
      }

      const match = sumRegEx.exec(rpn)
      if (match) {
        gotSum = true
        let sum = Rnl.zero
        for (let j = 0; j  < row; j++) {
          const datum = attrs.value.data[cell.col][j]
          let value = Rnl.fromString(datum)
          if (isUnitAware) {
            value = Rnl.multiply(Rnl.add(value, cellAttrs.gauge), cellAttrs.factor)
          }
          sum = Rnl.add(sum, value)
        }
        if (isUnitAware) {
          sum = Rnl.subtract(Rnl.divide(sum, cellAttrs.factor), cellAttrs.gauge)
        }
        // eslint-disable-next-line prefer-const
        let [_, value] = parse(String(Rnl.toNumber(sum)), "1000000.", true)
        if (isUnitAware) {
          value += "\xa0applyUnit\xa0" + attrs.value.units[cell.col]
        }
        rpn = rpn.slice(0, match.index) + value + rpn.slice(match.index + 5)
      }

      const matches = arrayOfRegExMatches(tableVarRegEx, rpn)
      for (let j = matches.length - 1; j >= 0; j--) {
        let varName = matches[j].value.slice(2)
        let gotPrime = false
        if (varName.charAt(varName.length - 1) === "′") {
          varName = varName.slice(0, -1)
          gotPrime = true
        }
        const datum = attrs.value.data[columnMap[varName]][(gotPrime ? (row - 1) : row)]
        // eslint-disable-next-line prefer-const
        let [_, value] = parse(datum, "1000000.", true)
        if (isUnitAware) {
          value += "\xa0applyUnit\xa0" + attrs.value.units[columnMap[varName]]
        }
        rpn = rpn.slice(0, matches[j].index) + value + rpn.slice(matches[j].index
            + matches[j].length)
      }
      cellAttrs.rpn = rpn
      cellAttrs = evaluate(cellAttrs, hurmetVars, "1000000.")
      attrs.value.data[cell.col][row] = cellAttrs.resultdisplay
      hurmetVars[attrs.name] = attrs
    }
  }
  let pos = attrs.tex.indexOf("=")
  const formatSpec = hurmetVars.format ? hurmetVars.format.value : "h15"
  attrs.tex = attrs.tex.slice(0, pos + 1)
            + DataFrame.display(attrs.value, formatSpec, decimalFormat)
  if (gotSum) {
    pos = attrs.tex.lastIndexOf("\\\\ ")
    attrs.tex = attrs.tex.slice(0, pos + 2) + "\\hline" + attrs.tex.slice(pos + 2)
  }
  pos = attrs.alt.indexOf("=")
  attrs.alt = attrs.alt.slice(0, pos + 1)
            + DataFrame.displayAlt(attrs.value, formatSpec, decimalFormat)
  return attrs
}

export const Tbl = Object.freeze({
  prepare,
  evaluate: evaluateTbl
})
