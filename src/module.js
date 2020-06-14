import { dt } from "./constants.js"
import { arrayOfRegExMatches } from "./utils"
import { parse } from "./parser.js"
import { valueFromLiteral } from "./literal.js"
import { prepareResult } from "./prepareResult"
import { errorOprnd } from "./error.js"

const statementRegEx = /^(([A-Za-zıȷ\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134]|\uD835[\uDC00-\udc33\udc9c-\udccf])([A-Za-z0-9_\u0391-\u03C9\u03D5\u212C\u2130\u2131\u210B\u2110\u2112\u2133\u211B\u212F\u210A\u2113\u2134\uD835\uDC00-\udc33\udc9c-\udccf]*|[\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]))′*\s*=/
const keywordRegEx = /^(if|else|else if|return|raise|while|for|break|echo)\b/
//const assignmentOperatorRegEx = /^[^<>/!"]+=(?!=)/

// If you change functionRegEx, then also change it in mathprompt.js.
// It isn't called from there in order to avoid duplicating Hurmet code inside ProseMirror.js.
export const functionRegEx = /^(?:private +)?function (?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*\(/

const lexRegEx = /"[^"]*"|`[^`]*`|'[^']*'|#|[^"`'#]+/g

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
  let lines = str.split(/\r?\n/g)

  // Check each line to see if we split at an invalid newline (a newline inside a string).
  let i = 0
  while (i < lines.length) {
    let numQuoteMarks = 0
    let pos = lines[i].indexOf('"')
    while (pos > -1) {
      numQuoteMarks += 1
      pos = lines[i].indexOf('"', pos + 1)
    }
    if (numQuoteMarks % 2 !== 0) {
      // Oops, we split on an invalid newline.
      lines[i] = lines[i] + lines[i + 1]
      lines = lines.slice(0, i + 1).concat(lines.slice(i + 2, lines.length))
    } else {
      i += 1
    }
  }

  for (i = 0; i < lines.length; i++) {
    // Get a single line of code and strip off any comments.
    const line = stripComment(lines[i])
    if (line.length === 0) { continue }

    if (functionRegEx.test(line)) {
      // This line starts a new function.
      const [funcObj, endLineNum] = scanFunction(lines, decimalFormat, i)
      parent[funcObj.name] = funcObj
      i = endLineNum
    } else if (statementRegEx.test(line)) {
      // An assignment to a variable of a boolean, string, number, matrix, or dictionary.
      const posEq = line.indexOf("=")
      const varName = line.slice(0, posEq).trim()
      const isCSV = (/^`/.test(line.slice(posEq + 1).trim()))
      // eslint-disable-next-line prefer-const
      let [literalStr, endLineNo] = scanStatement(lines, i, isCSV)
      literalStr = literalStr.slice(posEq + 1).trim()
      const [value, unit, dtype, _] = valueFromLiteral(literalStr, varName, decimalFormat)
      const attrs = { name: varName, value, unit, dtype }
      prepareResult(attrs, {})
      parent[varName] = { value: attrs.value, unit: attrs.unit,
        expos: attrs.expos, dtype: attrs.dtype }
      i = endLineNo
    }
  }
  return { value: parent, unit: null, dtype: dt.MODULE }

}

const scanStatement = (lines, startLineNum, isCSV) => {
  let literalStr = ""
  for (let i = startLineNum; i < lines.length; i++) {
    const line = stripComment(lines[i])
    if (line.length === 0) { continue }
    literalStr += line
    if (isCSV && line.slice(-1) === "`") { return [literalStr, i] }
    if (isCSV || /[{([,;]$/.test(line)) { continue }
    if (lines.length > i + 1 && /^\s*[+\-)\]}]/.test(lines[i + 1])) { continue }
    return [literalStr, i]
  }
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
      if (statementRegEx.test(line)) {
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
