import { parse } from "./parser"
import { dt } from "./constants"
import { valueFromLiteral } from "./literal"
import { functionRegEx, scanModule } from "./module"

/*  prepareStatement.js
 *
 *  This module is called when: (1) an author submits a Hurmet calculation dialog box, or
 *  (2) when a new document is opened, or (3) when recalculate-all is called.
 *  Here we do some preparation in a calculation cell prior to calculation.
 *
 *  This module does NOT calculate the result of an expression. It stops just short of that.
 *  How do we choose where to draw the line between tasks done here and tasks done later?
 *  We do as much here as we can without knowing the values that other cells have assigned
 *  to variables. The goal is to minimize the amount of work done by each dependent cell
 *  when an author changes an assigned value.  Later, calculation updates will not have to
 *  repeat the work done in this module, so updates will be faster.
 *
 *  Variable inputStr contains the string that an author wrote into the dialog box.
 *
 *  From that entry this module will:
 *    1. Determine the name of the cell, as in "x" from "x = 12"
 *    2. Parse the entry string into TeX, to be passed later to KaTeX for rendering.
 *    3. If the input asks for a calculation:
 *       a. Parse the expression into an echo string (in TeX) with placeholders that will be
 *          filled in later with values when the calculation is done.
 *       b. Parse the expression into RPN (postfix) to be passed later to evaluate().
 *       c. Process the unit of measure, if any, of the result. Save it for later calculation.
 *    4. If an assigned value is static, not calculated, find its value.
 *    5. If a unit has been defined in a staic assignment, find the value in Hurmet base units.
 *    6. Append all the display strings together.
 *    7. Return the result. Hurmet will attach it to ProseMirror "attrs" of that node.
 */

const containsOperator = /[+\-×·*∘⌧/^%‰&√!¡|‖&=<>≟≠≤≥∈∉⋐∧∨⊻¬]|\xa0(function|modulo|\\atop|root|sum|\?{}|%|⎾⏋|⎿⏌|\[\]|\(\))\xa0/
const mustDoCalculation = /^(``.+``|[$$£¥\u20A0-\u20CF]?(\?{1,2}|@{1,2}|%{1,2}|!{1,2})[^=!(?@%!{})]*)$/
const assignDataFrameRegEx = /^[^=]+=\s*``/
const currencyRegEx = /^[$£¥\u20A0-\u20CF]/
const isValidIdentifier = /^(?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*$/
const matrixOfNames = /^[([](?:[A-Za-zıȷ\u0391-\u03C9\u03D5\u210B\u210F\u2110\u2112\u2113\u211B\u212C\u2130\u2131\u2133]|(?:\uD835[\uDC00-\udc33\udc9c-\udcb5]))[A-Za-z0-9_\u0391-\u03C9\u03D5\u0300-\u0308\u030A\u030C\u0332\u20d0\u20d1\u20d6\u20d7\u20e1]*′*[,;].+[)\]]$/
const isKeyWord = /^(π|true|false|root|if|else|and|or|otherwise|modulo|for|while|break|return|raise)$/

const shortcut = (str, decimalFormat) => {
  // No calculation in str. Parse it just for presentation.
  const tex = parse(str, decimalFormat)
  return { entry: str, tex, alt: str }
}

export const prepareStatement = (inputStr, decimalFormat = "1,000,000.") => {
  let leadStr = ""
  let mainStr = ""
  let trailStr = ""
  let isCalc = false
  let suppressResultDisplay = false
  let displayResultOnly = false
  let omitEcho = false
  let mustAlign = false
  let posOfFirstEquals = 0
  let expression = ""
  let echo = ""
  let rpn = ""
  let resultDisplay = ""
  let name = ""
  let leadsWithCurrency = false
  let value
  let unit
  let dtype
  let str = ""

  if (functionRegEx.test(inputStr)) {
    // This cell contains a custom function.
    let name = ""
    const posFn = inputStr.indexOf("function")
    const posParen = inputStr.indexOf("(")
    name = inputStr.slice(posFn + 8, posParen).trim()
    const module = scanModule(inputStr, decimalFormat)
    const isError = module.dtype && module.dtype === dt.ERROR
    if (isError) {
      // eslint-disable-next-line no-alert
      window.alert(module.value)
    }
    const attrs = {
      entry: inputStr,
      name,
      value: isError ? module.value : module.value[name],
      // TODO: what to do with comma decimals?
      dtype: isError ? dt.ERROR : dt.MODULE,
      error: isError
    }
    return attrs
  }

  str = inputStr

  const isDataFrameAssigment = assignDataFrameRegEx.test(str)
  const posOfLastEquals = isDataFrameAssigment
    ? str.indexOf("=") + 1
    : str.lastIndexOf("=") + 1

  if (posOfLastEquals > 1) {
    // input has form:  mainStr = trailStr
    mainStr = str.substring(0, posOfLastEquals - 1).replace(/ +$/, "")
    if (mainStr.length > 0 && /;\s*$/.test(mainStr)) {
      mustAlign = true
      mainStr = mainStr.replace(/;\s*$/, "")
    }
    mainStr = mainStr.trim()
    trailStr = str.substring(posOfLastEquals).trim()

    if (mustDoCalculation.test(trailStr)) {
      // trailStr contains a ? or a @ or a % or a !. In other words,
      // input has form:  mainStr = something [?@%!] something
      // The [?@%!] signals that the author wants a calculation done.
      isCalc = true

      // A ! tells us to calculate and save the result, but to NOT display the result.
      suppressResultDisplay = trailStr.indexOf("!") > -1

      // A @ tells us to display only the result.
      displayResultOnly = trailStr.indexOf("@") > -1

      omitEcho = trailStr.indexOf("%") > -1

      posOfFirstEquals = mainStr.indexOf("=") + 1
      if (posOfFirstEquals) {
        // input has form:  leadStr = something = trailStr
        leadStr = mainStr.slice(0, posOfFirstEquals - 1).trim()

        // Input has form:  name = expression = trailStr, or
        //                  name1, name2, = expression = trailStr
        expression = mainStr.substring(posOfFirstEquals).trim()
        if (matrixOfNames.test(leadStr)) { leadStr = leadStr.slice(1, -1).trim() }
        if (/[,;]/.test(leadStr)) {
          const potentialIdentifiers = leadStr.split(/[,;]/)
          for (let i = 0; i < potentialIdentifiers.length; i++) {
            const candidate = potentialIdentifiers[i].trim()
            if (isKeyWord.test(candidate) || !isValidIdentifier.test(candidate)) {
              // leadStr is not a list of valid identifiers.
              // So this isn't a valid calculation statement. Let's finish early.
              return shortcut(str, decimalFormat)
            }
          }
          // multiple assignment.
          name = potentialIdentifiers.map(e => e.trim())

        } else {
          if (isValidIdentifier.test(leadStr) && !isKeyWord.test(leadStr)) {
            name = leadStr
          } else {
            // The "=" sign is inside an expression. There is no lead identifier.
            // This statement does not assign a value to a variable. But it may do a calc.
            // input has form:  expression = trailStr
            expression = mainStr
          }
        }
      } else {
        // This calculation string contains only one "=" character.
        // input has form:  expression = trailStr
        expression = mainStr
      }
    } else if (isDataFrameAssigment) {
      name = mainStr
      expression = trailStr
    } else  if (isValidIdentifier.test(mainStr) && !isKeyWord.test(mainStr)) {
      // No calculation display selector is present,
      // but there is one "=" and a valid idendtifier.
      // It may be an assignment statement.
      // input has form:  name = trailStr
      name = mainStr
      if (trailStr === "") {
        const tex = parse(str, decimalFormat)
        return { entry: str, tex, alt: str }
      }
    } else {
      // input has form:  mainStr = trailStr.
      // It almost works as an assignment statment, but mainStr is not a valid identifier.
      // So we'll finish early.
      return shortcut(str, decimalFormat)
    }
  } else {
    // str contains no "=" character. Let's fnish early.
    return shortcut(str, decimalFormat)
  }

  if (expression.length > 0) {
    // The author may want a calculaltion done on the expression.
    if (/^\s*fetch\(/.test(expression)) {
      // fetch() functions are handled in updateCalculations.js, not here.
      // It's easier from there to send a fetch() callback to a ProseMirror transaction.
      echo = ""

    } else {
      // Parse the expression. Stop short of doing the calculation.
      [echo, rpn] = parse(expression, decimalFormat, true)

      // Shoulld we display an echo of the expression, with values shown for each variable?
      if (suppressResultDisplay || displayResultOnly || echo.indexOf("〖") === -1
          || /\u00a0for\u00a0/.test(rpn)) {
        // No.
        echo = ""
      } else if (omitEcho) {
        echo = ""
      } else {
        // The expression calls a variable.
        // If it also contains an operator or a function, then we need to show the echo.
        if (containsOperator.test("\xa0" + rpn + "\xa0")) {
          echo = "{\\color{#0000ff}" + echo + "}"
        } else {
          echo = ""
        }
      }
    }
  }

  // Now let's turn our attention from the expression to the trailStr.
  if (currencyRegEx.test(trailStr)) {
    leadsWithCurrency = true
    unit = trailStr.charAt(0)
  }

  if (isCalc) {
    // trailStr contains a display selector.
    value = null

    if (!leadsWithCurrency) {
      // Check for a unit, even if it isn't a unit-aware calculation
      unit = trailStr.replace(/[?@%!']/g, "").trim()
    }

    if (suppressResultDisplay) {
      resultDisplay = "!"
    } else {
      if (unit) {
        resultDisplay = trailStr.trim().replace(/([^ ?!@%]+)$/, "'" + "$1" + "'")
        resultDisplay = parse(resultDisplay, decimalFormat).replace(/\\%/g, "%")
      } else {
        resultDisplay = parse(trailStr, decimalFormat).replace(/\\%/g, "%")
      }
      resultDisplay = resultDisplay.replace(/\\text\{(\?\??|%%?)\}/, "$1")
      resultDisplay = resultDisplay.replace(/([?%]) ([?%])/, "$1" + "$2")
    }

  } else {
    // trailStr may be a static value in an assignment statement.
    // Check if trailStr is a valid literal.
    [value, unit, dtype, resultDisplay] = valueFromLiteral(trailStr, name, decimalFormat)

    if (dtype === dt.ERROR) { return shortcut(str, decimalFormat) }
  }

  // Assemble the equation to display
  let eqn = ""
  let altEqn = ""
  if (!displayResultOnly) {
    eqn = parse(mainStr, decimalFormat)
    if (mustAlign) {
      eqn = "\\begin{aligned}" + eqn
      const pos = eqn.indexOf("=")
      eqn = eqn.slice(0, pos) + "&" + eqn.slice(pos)
    }
    const alignChar = mustAlign ? "\\\\ &" : ""
    altEqn = mainStr
    if (echo.length > 0 && !omitEcho) {
      eqn += ` ${alignChar}= ` + echo
    }
    if (!suppressResultDisplay) {
      eqn += " " + (mustAlign ? "\\\\&" : "") + "= " + resultDisplay
      altEqn += " = " + trailStr
    }
    if (mustAlign) { eqn += "\\end{aligned}" }
  }

  // Populate the object to be returned.
  // It will eventually be attached to ProseMirror schema attrs, so call it "attrs".
  const attrs = {
    entry: str,
    template: eqn,
    altTemplate: altEqn,
    resultdisplay: resultDisplay,
    dtype: dtype,
    error: false
  }

  if (name) { attrs.name = name }
  if (isCalc) {
    attrs.resulttemplate = resultDisplay
    attrs.altresulttemplate = trailStr
  } else {
    attrs.tex = eqn
    attrs.alt = altEqn
  }
  if (rpn) { attrs.rpn = rpn }
  if (value) { attrs.value = value }
  if (unit) {
    if (Array.isArray(unit)) {
      attrs.expos = unit
    } else {
      attrs.unit = unit
    }
  }

  return attrs
}
