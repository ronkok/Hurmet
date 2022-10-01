import { dt } from "./constants.js"
import { valueFromLiteral } from "./literal"
import { improveQuantities } from "./improveQuantities"
import { arrayOfRegExMatches } from "./utils"
import { parse } from "./parser.js"
import { errorOprnd } from "./error.js"

const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/
const keywordRegEx = /^(if|else if|else|return|raise|while|for|break|echo|end)\b/
const drawCommandRegEx = /^(title|frame|view|axes|grid|stroke|strokewidth|strokedasharray|fill|fontsize|fontweight|fontstyle|fontfamily|marker|line|path|plot|curve|rect|circle|ellipse|arc|text|dot|leader|dimension)\b/

// If you change functionRegEx, then also change it in mathprompt.js.
// It isn't called from there in order to avoid duplicating Hurmet code inside ProseMirror.js.
export const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/
export const drawRegEx = /^draw\(/
const startSvgRegEx = /^startSvg\(\)/
const lexRegEx = /"[^"]*"|``.*|`[^`]*`|'[^']*'|#|[^"`'#]+/g

const testForStatement = str => {
  const pos = str.indexOf("=")
  if (pos === -1) { return false }
  const leadStr = str.slice(0, pos).trim()
  if (isValidIdentifier.test(leadStr)) { return true }
  if (leadStr.indexOf(",") === -1) { return false }
  let result = true
  const arry = leadStr.split(",")
  arry.forEach(e => {
    if (!isValidIdentifier.test(e.trim())) { result = false }
  })
  return result
}

const stripComment = str => {
  // Strip the comment, if any, from the end of a code line.
  const matches = arrayOfRegExMatches(lexRegEx, str)
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].value === "#") {
      str = str.slice(0, matches[i].index)
      break
    }
  }
  return str.trim()
}

export const scanModule = (str, decimalFormat) => {
  // Scan the code and break it down into individual lines of code.
  // Assemble the lines into functions and assign each function to parent.
  const parent = Object.create(null)

  // Statements end at a newline.
  const lines = str.split(/\r?\n/g)

  for (let i = 0; i < lines.length; i++) {
    // Get a single line of code and strip off any comments.
    const line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (functionRegEx.test(line) || drawRegEx.test(line)) {
      // This line starts a new function.
      const [funcObj, endLineNum] = scanFunction(lines, decimalFormat, i)
      if (funcObj.dtype && funcObj.dtype === dt.ERROR) { return funcObj }
      parent[funcObj.name] = funcObj
      i = endLineNum
    } else if (testForStatement(line)) {
      // This line starts a Hurmet assignment.
      const [stmt, endLineNum] = scanAssignment(lines, decimalFormat, i)
      parent[stmt.name] = stmt
      i = endLineNum
    }
  }
  return { value: parent, unit: null, dtype: dt.MODULE }

}

const handleCSV = (expression, lines, startLineNum) => {
  for (let i = startLineNum + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) { continue }
    expression += "\n" + line
    if (line.slice(-2) === "``") { return [expression, i] }
  }
}

const scanFunction = (lines, decimalFormat, startLineNum) => {
  const line1 = stripComment(lines[startLineNum])
  let isDraw = line1.charAt(0) === "d"
  const posParen = line1.indexOf("(")
  let functionName = ""
  if (isDraw) {
    functionName = "draw"
  } else {
    const posFn = line1.indexOf("function")
    functionName = line1.slice(posFn + 8, posParen).trim()
  }
  const isPrivate = /^private /.test(line1)
  const parameterList =  line1.slice(posParen + 1, -1).trim()
  const parameters = parameterList.length === 0 ? [] : parameterList.split(/, */g)
  const funcObj = {
    name: functionName,
    dtype: isDraw ? dt.DRAWING : dt.MODULE,
    isPrivate,
    parameters,
    statements: []
  }

  const stackOfCtrls = []
  let expression = ""
  let prevLineEndedInContinuation = false
  let prevLine = ""
  let name = ""
  let isStatement = false

  for (let i = startLineNum + 1; i < lines.length; i++) {
    let line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (prevLineEndedInContinuation) {
      // Check if the previous character is a semi-colon just before a matrix literal closes.
      const lastChar = prevLine.slice(-1)
      line = lastChar === ";" && "})]".indexOf(line.charAt(0)) > -1
        ? prevLine.slice(0, -1).trim() + line
        : lastChar === ";" || lastChar === ","
        ? prevLine + " " + line
        : prevLine + line
    }

    // Line continuation characters are: { ( [ , ; + -
    if (/[{([,;]$/.test(line)) {
      prevLineEndedInContinuation = true
      prevLine = line
      continue
    } else if (lines.length > i + 1 && /^\s*[+\-)\]}]/.test(lines[i + 1])) {
      prevLineEndedInContinuation = true
      prevLine = line
      continue
    }

    const keyword = keywordRegEx.exec(line)
    if (keyword) {
      name = keyword[0]
      expression = line.slice(name.length).trim()
      if (expression.length > 0 && /^``/.test(expression)) {
        [expression, i] = handleCSV(expression, lines, i)
      }
    } else if (isDraw && drawCommandRegEx.test(line)) {
      name = "svg"
      expression = line.indexOf(" ") === -1
        ? line + "(svg)"
        : line.replace(" ", "(svg, ") + ")"
      isStatement = true
    } else {
      if (testForStatement(line)) {
        // We have an "=" assignment operator.
        const posEq = line.indexOf("=")
        name = line.slice(0, posEq - 1).trim()
        expression = line.slice(posEq + 1).trim()
        if (/^``/.test(expression)) { [expression, i] = handleCSV(expression, lines, i) }
        if (startSvgRegEx.test(expression)) { isDraw = true }
        isStatement = true
      } else {
        // TODO: We shouldn't get here. Write an error.
        return [errorOprnd("FUNC_LINE", functionName + ", line " + (i + 1)), i]
      }
    }

    let rpn = ""
    if (expression) {
      [, rpn] = parse(expression, decimalFormat, true)
    }
    const stype = isStatement ? "statement" : name
    if (isStatement && /[,;]/.test(name)) {
      name = name.split(/[,;]/).map(e => e.trim())
    }
    funcObj.statements.push({ name: name, rpn: rpn, stype: stype })
    if (stype === "if" || stype === "while" || stype === "for") {
      stackOfCtrls.push({ type: stype, statementNum: funcObj.statements.length - 1 })
      if (stype === "for" && rpn.indexOf("j\u00a0") === 0) { return [errorOprnd("BAD_J")] }
    } else if (stype === "end") {
      if (stackOfCtrls.length === 0) {
        // Finished the current function.
        if (isDraw) {
          funcObj.statements.splice(-1, 0, { name: "return", rpn: "¿svg", stype: "return" })
        }
        return [funcObj, i]
      }
      const ctrl = stackOfCtrls[stackOfCtrls.length - 1]
      funcObj.statements[ctrl.statementNum].endOfBlock = funcObj.statements.length - 1
      stackOfCtrls.pop()
    }

    // Reset for next statement
    isStatement = false
    prevLineEndedInContinuation = false
    prevLine = ""
    name = ""
    expression = ""
  }
  return [errorOprnd("END_MISS", functionName), 0]
}

const scanAssignment = (lines, decimalFormat, iStart) => {
  let prevLineEndedInContinuation = false
  let str = ""
  let iEnd = iStart
  for (let i = iStart; i < lines.length; i++) {
    const line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (prevLineEndedInContinuation) {
      // Check if the previous character is a semi-colon just before a matrix literal closes.
      str = str.slice(-1) === ";" && "})]".indexOf(line.charAt(0)) > -1
        ? str.slice(0, -1).trim() + line
        : str + line
    } else {
      str = line
    }

    // Line continuation characters are: { ( [ , ; + -
    if (/[{([,;]$/.test(str)) {
      prevLineEndedInContinuation = true
    } else if (lines.length > i + 1 && /^\s*[+\-)\]}]/.test(lines[i + 1])) {
      prevLineEndedInContinuation = true
    } else {
      iEnd = i
      break
    }
  }

  const posEquals = str.indexOf("=")
  let name = str.slice(0, posEquals).trim()
  if (/[,;]/.test(name)) {
    name = name.split(/[,;]/).map(e => e.trim())
  }
  const trailStr = str.slice(posEquals + 1).trim()
  const [value, unit, dtype, resultDisplay] = valueFromLiteral(trailStr, name, decimalFormat)
  const stmt = { name, value, unit, dtype, resultDisplay }
  improveQuantities(stmt, {})
  return [stmt, iEnd]
}
