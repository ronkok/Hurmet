import { dt } from "./constants.js"
import { valueFromLiteral } from "./literal"
import { prepareResult } from "./prepareResult"
import { arrayOfRegExMatches } from "./utils"
import { parse } from "./parser.js"
import { errorOprnd } from "./error.js"

const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/
const keywordRegEx = /^(if|else|else if|return|raise|while|for|break|echo)\b/

// If you change functionRegEx or moduleRegEx, then also change it in mathprompt.js.
// It isn't called from there in order to avoid duplicating Hurmet code inside ProseMirror.js.
export const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/
export const moduleRegEx = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′* *= * module\b/
const lexRegEx = /"[^"]*"|`[^`]*`|'[^']*'|#|[^"`'#]+/g

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
  // Keep track of indentation and write a "end" stype when indentation decreases.
  // Assemble the lines into functions and assign each function to parent.
  const parent = {}

  // Statements end at a newline.
  const lines = str.split(/\r?\n/g)

  for (let i = 0; i < lines.length; i++) {
    // Get a single line of code and strip off any comments.
    const line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (functionRegEx.test(line)) {
      // This line starts a new function.
      const [funcObj, endLineNum] = scanFunction(lines, decimalFormat, i)
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
    if (line.slice(-1) === "`") { return [expression, i] }
  }
}

const scanFunction = (lines, decimalFormat, startLineNum) => {
  const line1 = stripComment(lines[startLineNum])
  const posFn = line1.indexOf("function")
  const posParen = line1.indexOf("(")
  const functionName = line1.slice(posFn + 8, posParen).trim()
  const isPrivate = /^private /.test(line1)
  const parameterList =  line1.slice(posParen + 1, -1).trim()
  const parameters = parameterList.length === 0 ? [] : parameterList.split(/, */g)
  const funcObj = { name: functionName, isPrivate, parameters, statements: [] }

  let level = 1 // nesting level of the code blocks
  let indent = /^ */.exec(lines[startLineNum])[0].length
  const indentAtLevel = []
  indentAtLevel.push(indent) // The indentation at level 0.
  let pendingIndent = true
  const stackOfCtrls = []

  let expression = ""
  let prevLineEndedInContinuation = false
  let prevLine = ""
  let prevIndent = 0
  let name = ""
  let isStatement = false

  for (let i = startLineNum + 1; i < lines.length; i++) {
    let line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (prevLineEndedInContinuation) {
      // Check if the previous character is a semi-colon just before a matrix literal closes.
      line = prevLine.slice(-1) === ";" && "})]".indexOf(line.charAt(0)) > -1
        ? prevLine.slice(0, -1).trim() + line
        : prevLine + line
    } else {
      indent = /^ */.exec(lines[i])[0].length
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

    if (indent < prevIndent) {
      while (indent < indentAtLevel[level]) {
        funcObj.statements.push({ name: "", rpn: "", stype: "end" })
        indentAtLevel.pop()
        level -= 1
        if (stackOfCtrls.length > 0) {
          const ctrl = stackOfCtrls[stackOfCtrls.length - 1]
          if (indent < ctrl.indent || (indent === ctrl.indent &&
              ctrl.type === "while" || ctrl.type === "for" ||
              (ctrl.type === "if" && !/^\s*else\b/.test(line)))) {
            funcObj.statements[ctrl.statementNum].endOfBlock = funcObj.statements.length - 1
            stackOfCtrls.pop()
          }
        }
      }
      if (level === 0) {
        return [funcObj, i - 1] // Finished the current function.
      }
    }

    if (pendingIndent) {
      // We're in the first line of code after a for/while/if statement.
      // Get the current indent.
      indentAtLevel.push(indent)
      pendingIndent = false
    }

    const keyword = keywordRegEx.exec(line)
    if (keyword) {
      name = keyword[0]
      expression = line.slice(name.length).trim()
      if (expression.charAt(0) === "`") { [expression, i] = handleCSV(expression, lines, i) }
      if ("ifwhileforelse if".indexOf(name) > -1) {
        level += 1
        pendingIndent = true
      }

    } else {
      if (testForStatement(line)) {
        // We have an "=" assignment operator.
        const posEq = line.indexOf("=")
        name = line.slice(0, posEq - 1).trim()
        expression = line.slice(posEq + 1).trim()
        if (expression.charAt(0) === "`") { [expression, i] = handleCSV(expression, lines, i) }
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
    funcObj.statements.push({ name: name, rpn: rpn, stype: stype })
    if (stype === "if" || stype === "while" || stype === "for") {
      stackOfCtrls.push({ indent, type: stype, statementNum: funcObj.statements.length - 1 })
    }

    // Reset for next statement
    isStatement = false
    prevLineEndedInContinuation = false
    prevLine = ""
    prevIndent = indent
    name = ""
    expression = ""

  }

  // We've reached the end of the file.
  while (indentAtLevel.length > 0) {
    funcObj.statements.push({ name: "", rpn: "", stype: "end" })
    indent = indentAtLevel.pop()
    if (stackOfCtrls.length > 0) {
      const ctrl = stackOfCtrls[stackOfCtrls.length - 1]
      if (indent < ctrl.indent) {
        funcObj.statements[ctrl.statementNum].endOfBlock = funcObj.statements.length - 1
        stackOfCtrls.pop()
      }
    }

  }
  return [funcObj, lines.length]
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
  const name = str.slice(0, posEquals).trim()
  const trailStr = str.slice(posEquals + 1).trim()
  const [value, unit, dtype, resultDisplay] = valueFromLiteral(trailStr, name, decimalFormat)
  const stmt = { name, value, unit, dtype, resultDisplay }
  prepareResult(stmt, {})
  return [stmt, iEnd]
}
