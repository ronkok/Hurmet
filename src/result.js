import { dt } from "./constants"
import { Rnl } from "./rational"
import { parse } from "./parser"
import { format } from "./format"
import { addTextEscapes, clone } from "./utils"
import { Matrix, isMatrix, isVector } from "./matrix"
import { DataFrame } from "./dataframe"
import { Tuple } from "./tuple"
import { Cpx } from "./complex"

// A result has been sent here from evaluate.js or updateCalculations.js.
// Format the result for display.

const numMisMatchError = _ => {
  const str = "Error. Mismatch in number of multiple assignment."
  return [`\\textcolor{firebrick}{\\text{${str}}}`, str]
}
const testRegEx = /^@{1,2}test /
const compRegEx = /\u00a0([⩵≠><>≤≥∋∈∉∌⊂⊃⊄⊅]|==|in|!in|!=|=>|<=)$/
const negatedComp = {
  "⩵": ["≠", "≠"],
  "==": ["≠", "≠"],
  "≠": ["==", "=="],
  ">": ["\\ngtr", "!>"],
  "<": ["\\nless", "!<"],
  "≤": ["\\nleq", "!≤"],
  "≥": ["\\ngeq", "!≥"],
  "∋": ["∌", "∌"],
  "∈": ["∉", "∉"],
  "⊂": ["⊄", "⊄"],
  "⊃": ["⊅", "⊅"],
  "∉": ["∈", "∈"],
  "∌": ["∋", "∋"],
  "⊄": ["⊂", "⊂"],
  "⊅": ["⊃", "⊃"],
  "in": ["∉", "∉"],
  "!in": ["in", "in"],
  "!=": ["==", "=="],
  "=>": ["\\ngeq", "!≥"],
  "<=": ["\\ngeq", "!≥"]
}

export const formatResult = (stmt, result, formatSpec, decimalFormat, assert, isUnitAware) => {
  if (!result) { return stmt }

  if (result.dtype === dt.DRAWING) {
    stmt.resultdisplay = result.value
    delete stmt.resultdisplay.temp
    return stmt
  }

  const numNames = !stmt.name
    ? 0
    : !Array.isArray(stmt.name)
    ? 1
    : stmt.name.length

  if (stmt.resulttemplate.indexOf("?") > -1 ||
      stmt.resulttemplate.indexOf("!") > -1 ||
      stmt.resulttemplate.indexOf("@") > -1 ||
      stmt.resulttemplate.indexOf("%") > -1) {
    stmt.value = result.value
    let resultDisplay = ""
    let altResultDisplay = ""
    if (stmt.resulttemplate.indexOf("!") > -1) {
      // Suppress display of the result
      resultDisplay = ""
      altResultDisplay = ""
      return stmt

    } else if (result.dtype & dt.BOOLEAN && testRegEx.test(stmt.entry) &&
      compRegEx.test(stmt.rpn)) {
      if (testValue(result) === true) {
        resultDisplay = parse(stmt.entry.replace(testRegEx, "")) +
          ",\\text{ ok }✓"
        altResultDisplay = stmt.entry.replace(testRegEx, "") + ", ok ✓"
      } else {
        const op = compRegEx.exec(stmt.rpn).slice(1)
        const negOp = negatedComp[op]
        if (assert) {
          const assertStr = assert.value.replace(/\.$/, "")
          resultDisplay = "\\colorbox{Salmon}{" + assertStr + ", but $" +
              parse(stmt.entry.replace(testRegEx, "").replace(op, negOp[0])) + "$}"
          altResultDisplay = assertStr + ", but " +
              stmt.entry.replace(testRegEx, "").replace(op, negOp[1])
        } else {
          resultDisplay = parse(stmt.entry.replace(testRegEx, "").replace(op, negOp[0])) +
              ",\\colorbox{Salmon}{ n.g.}"
          altResultDisplay = stmt.entry.replace(testRegEx, "").replace(op, negOp[1]) +
              ", n.g."
        }
        // eslint-disable-next-line no-console
        console.log(altResultDisplay)
      }

    } else if (isMatrix(result)) {
      resultDisplay = Matrix.display((isUnitAware || result.value.plain)
          ? { value: result.value.plain, dtype: result.dtype }
          : result,
        formatSpec,
        decimalFormat
      )
      altResultDisplay = Matrix.displayAlt((isUnitAware || result.value.plain)
          ? { value: result.value.plain, dtype: result.dtype }
          : result,
        formatSpec,
        decimalFormat
      )

    } else if (result.dtype === dt.DATAFRAME) {
      if (numNames > 1 && numNames !== result.value.data.length) {
        [resultDisplay, altResultDisplay] = numMisMatchError()
      } else {
        const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1
        resultDisplay = DataFrame.display(result.value, formatSpec,
                                          decimalFormat, omitHeading)
        altResultDisplay = DataFrame.displayAlt(result.value, formatSpec, omitHeading)
      }

    } else if (result.dtype & dt.MAP) {
      let localValue
      if (isUnitAware || result.value.data.plain) {
        localValue = clone(result.value)
        localValue.data = result.value.data.plain
      } else {
        localValue = result.value
      }
      const omitHeading = stmt.name && Array.isArray(stmt.name) && stmt.name.length > 1
      resultDisplay = DataFrame.display(localValue, formatSpec, decimalFormat, omitHeading)
      altResultDisplay = DataFrame.displayAlt(localValue, formatSpec,
                                              decimalFormat, omitHeading)

    } else if (result.dtype === dt.TUPLE) {
      if (numNames > 1 && numNames !== result.value.size) {
        [resultDisplay, altResultDisplay] = numMisMatchError()
      } else {
        resultDisplay = Tuple.display(result.value, formatSpec, decimalFormat)
        altResultDisplay = Tuple.displayAlt(result.value, formatSpec)
      }

    } else if (result.dtype & dt.STRING) {
      resultDisplay = "\\text{" + addTextEscapes(result.value) + "}"
      if (result.unit) {
        // This is a hack to return a color
        resultDisplay = `\\textcolor{${result.unit}}{${resultDisplay}}`
      }
      altResultDisplay = result.value

    } else if (result.dtype & dt.RICHTEXT) {
      resultDisplay = parse(result.value, decimalFormat, false)
      altResultDisplay = result.value

    } else if (result.dtype & dt.BOOLEAN) {
      resultDisplay = "\\text{" + result.value + "}"
      altResultDisplay = String(result.value)

    } else if (result.dtype === dt.COMPLEX) {
      const z = result.value;
      [resultDisplay, altResultDisplay] = Cpx.display(z, formatSpec, decimalFormat)

    } else if (result.value.plain) {
      resultDisplay = format(result.value.plain, formatSpec, decimalFormat)
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\textcolor{firebrick}{\\text{" + resultDisplay.value + "}}"
        altResultDisplay = resultDisplay.value
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "")
      }

    } else if (Rnl.isRational(result.value)) {
      resultDisplay = format(result.value, formatSpec, decimalFormat)
      if (resultDisplay.dtype && resultDisplay.dtype === dt.ERROR) {
        resultDisplay = "\\textcolor{firebrick}{\\text{" + resultDisplay.value + "}}"
        altResultDisplay = resultDisplay.value
      } else {
        altResultDisplay = resultDisplay.replace(/{,}/g, ",").replace("\\", "")
      }

    } else if (result.dtype === dt.IMAGE) {
      return stmt

    } else {
      resultDisplay = result.value
      altResultDisplay = resultDisplay

    }

    // Write the string to be plugged into echos of dependent nodes
    stmt.resultdisplay = stmt.resulttemplate.replace(/(\? *\??|@ *@?|%%?)/, resultDisplay)

    // Write the TeX for this node
    if (stmt.resulttemplate.indexOf("@") > -1) {
      stmt.tex = stmt.resultdisplay
      stmt.displaySelector = stmt.altresulttemplate.indexOf("@@") > -1 ? "@@" : "@"
      stmt.alt = stmt.altresulttemplate.replace(/@@?/, altResultDisplay)
    } else if (stmt.resulttemplate.indexOf("?") > -1) {
      let pos = stmt.tex.lastIndexOf("?")
      stmt.tex = stmt.tex.slice(0, pos).replace(/\? *$/, "") + resultDisplay + stmt.tex.slice(pos + 1)
      stmt.displaySelector = stmt.altresulttemplate.indexOf("??") > -1 ? "??" : "?"
      pos = stmt.alt.lastIndexOf(stmt.displaySelector)
      stmt.alt = stmt.alt.slice(0, pos) + altResultDisplay
          + stmt.alt.slice(pos + stmt.displaySelector.length)
    } else if (stmt.resulttemplate.indexOf("%") > -1) {
      let pos = stmt.tex.lastIndexOf("%")
      stmt.tex = stmt.tex.slice(0, pos).replace(/% *$/, "") + resultDisplay + stmt.tex.slice(pos + 1)
      stmt.displaySelector = stmt.altresulttemplate.indexOf("%%") > -1 ? "%%" : "%"
      pos = stmt.alt.lastIndexOf(stmt.displaySelector)
      stmt.alt = stmt.alt.slice(0, pos) + altResultDisplay
          + stmt.alt.slice(pos + stmt.displaySelector.length)
    }
  }
  return stmt
}

const testValue = oprnd => {
  if (isVector(oprnd)) {
    for (let i = 0; i < oprnd.value.length; i++) {
      if (!oprnd.value[i]) { return false }
    }
  } else if (isMatrix(oprnd)) {
    for (let i = 0; i < oprnd.value.length; i++) {
      for (let j = 0; j < oprnd.value[0].length; j++) {
        if (!oprnd.value[i][j]) { return false }
      }
    }
  } else if (oprnd.dtype & dt.MAP) {
    for (let j = 0; j < oprnd.value.data.length; j++) {
      for (let i = 0; i < oprnd.value.data[0].length; i++) {
        if (!oprnd.value.data[j][i]) { return false }
      }
    }
  } else {
    return oprnd.value
  }
  return true
}
