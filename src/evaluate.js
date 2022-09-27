import { dt, allZeros } from "./constants"
import { clone, isIn, mapMap, arrayOfRegExMatches, tablessTrim } from "./utils"
import { plugValsIntoEcho } from "./echo"
import { fromAssignment } from "./operand.js"
import { Functions, multivarFunction } from "./functions"
import { Operators, isDivByZero } from "./operations"
import { unitFromUnitName, unitsAreCompatible } from "./units"
import { Matrix, isMatrix, isVector } from "./matrix"
import { map } from "./map"
import { DataFrame } from "./dataframe"
import { propertyFromDotAccessor } from "./property"
import { textRange } from "./text"
import { compare } from "./compare"
import { errorOprnd } from "./error"
import { Rnl } from "./rational"
import { format } from "./format"
import { insertOneHurmetVar } from "./insertOneHurmetVar"
import { formatResult } from "./result"
import { Cpx } from "./complex"
import { Draw } from "./draw"

// evaluate.js

/*
 *  This module receives an RPN string and a object containing Hurmet variables.
 *  It does the calculation, doing unit-compatibility checks along the way.
 *  It returns a result in two formats: (1) a TeX string that can be displayed and
 *  (2) numeric and unit data that can used for calculations by other cells.
 *
 *  Hurmet does automatic unit conversions and checks for unit compatibility.
 *  Compatibility checks are done by keeping track of the unit exponents.
 *  So for instance if we divide an area by a length, the unit exponent calculation runs as:
 *     LENGTH^2 / LENGTH^1 = LENGTH^(2-1) = LENGTH^1
 *  We keep track of unit exponents for each of 9 base dimensions. That's why
 *  you see an array of 9 integers occuring in the code below.
 *
 *  Inside evalRpn(), Hurmet operands are each an object with three fields:
 *     value: the value of the operand
 *     unit:  holds unit info, either unit name, an array of exponents, or a unitMap
 *     dtype: an integer indicating data type.
 *
 *     Note that an operand can be two data types at once, such as RATIONAL and MATRIX.
 *     In such cases, dtype is the sum of the two underlying integers.
 *     So, in constants.js, we have enumerated the data types in powers of two.
 *     That way, we can use a bit-wise "&" operator to test for an individual type.
 *
 *     Numeric matrices and numeric maps can have math operations done to them.
 *     We distinguish numeric matrices from other matrices by the fact that
 *     (oprnd.dtype & dt.RATIONAL) returns a true if the matrix is numeric.
 *
 *     File operands.js contains further explanation of Hurmet operands.
 */

// Some helper functions

const needsMap = (...args) => {
  for (let i = 0; i < args.length; i++) {
    if ((args[i].dtype & dt.MAP) && (args[i].dtype & dt.RATIONAL)) { return true }
  }
  return false
}

const shapeOf = oprnd => {
  return oprnd.dtype === dt.COMPLEX
    ? "complex"
    : oprnd.dtype < 128
    ? "scalar"
    : Matrix.isVector(oprnd)
    ? "vector"
    : (oprnd.dtype & dt.MATRIX)
    ? "matrix"
    : oprnd.dtype === dt.DATAFRAME
    ? "dataFrame"
    : ((oprnd.dtype & dt.MAP) &&
       ((oprnd.dtype & dt.ROWVECTOR) || (oprnd.dtype & dt.COLUMNVECTOR)))
    ? "mapWithVectorValues"
    : (oprnd.dtype & dt.MAP)
    ? "map"
    : "other"
}

const binaryShapesOf = (o1, o2) => {
  let shape1 = shapeOf(o1)
  let shape2 = shapeOf(o2)
  let needsMultBreakdown = false
  if (isMatrix(o1) && isMatrix(o2)) {
    // If both operands are matrices, we need to return more information.
    // That enables the various ways to multiply two matrices.
    needsMultBreakdown = true
    if (shape1 === "vector") {
      shape1 = (o1.dtype & dt.ROWVECTOR) ? "rowVector" : "columnVector"
    }
    if (shape2 === "vector") {
      shape2 = (o2.dtype & dt.ROWVECTOR) ? "rowVector" : "columnVector"
    }
  }
  return [shape1, shape2, needsMultBreakdown]
}

const nextToken = (tokens, i) => {
  if (tokens.length < i + 2) { return undefined }
  return tokens[i + 1]
}

// array of function names that return a real number from a complex argument.
const arfn = ["abs", "argument", "Im", "Re", "Γ"]

const stringFromOperand = (oprnd, decimalFormat) => {
  return oprnd.dtype === dt.STRING
    ? oprnd.value
    : oprnd.dtype === dt.RATIONAL
    ? format(oprnd.value, "h15", decimalFormat)
    : isMatrix(oprnd.dtype)
    ? Matrix.displayAlt(oprnd, "h15", decimalFormat)
    : (oprnd.dtype & dt.MAP)
    ? map.displayAlt(oprnd.value, "h15", decimalFormat)
    : oprnd.value
}

export const evalRpn = (rpn, vars, decimalFormat, unitAware, lib) => {
  // This is the function that does calculations with the rpn string.
  const tokens = rpn.split("\u00A0")
  const stack = []
  let oPrev
  for (let i = 0; i < tokens.length; i++) {
    const tkn = tokens[i]
    const ch = tkn.charAt(0)

    if (ch === "®") {
      // A rational number.
      const r = new Array(2)
      const pos = tkn.indexOf("/")
      r[0] = BigInt(tkn.slice(1, pos))   // numerator
      r[1] = BigInt(tkn.slice(pos + 1))  // denominator
      const num = Object.create(null)
      num.value = r
      num.unit = Object.create(null)
      num.unit.expos = allZeros
      num.dtype = dt.RATIONAL
      stack.push(Object.freeze(num))

    } else if (ch === "©") {
      // A complex number.
      const ints = tkn.slice(1).split(",")
      const z = new Array(2)
      z[0] = [BigInt(ints[0]), BigInt(ints[1])]  // real part
      z[1] = [BigInt(ints[2]), BigInt(ints[3])]  // imaginary part
      const num = Object.create(null)
      num.value = z
      num.unit = Object.create(null)
      num.unit.expos = allZeros
      num.dtype = dt.COMPLEX
      stack.push(Object.freeze(num))

    } else if (ch === "¿") {
      // A variable. Get the value from vars
      const varName = tkn.substring(1)
      let oprnd = Object.create(null)
      if (varName === "undefined") {
        oprnd.value = undefined
        oprnd.unit = null
        oprnd.dtype = 0
      } else if (varName === "T" && nextToken(tokens, i) === "^" &&
        stack.length > 0 && isMatrix(stack[stack.length - 1])) {
        // Transpose a matrix.
        oprnd.value = "T"
        oprnd.unit = null
        oprnd.dtype = dt.RATIONAL
      } else {
        const cellAttrs = vars[varName]
        if (!cellAttrs) { return errorOprnd("V_NAME", varName) }
        oprnd = fromAssignment(cellAttrs, unitAware)
        if (oprnd.dtype === dt.ERROR) { return oprnd }
      }
      stack.push(Object.freeze(oprnd))

    } else if (ch === '"') {
      // A string literal.
      const chEnd = tkn.charAt(tkn.length - 1)
      const str = ch === '"' && chEnd === '"' ? tkn.slice(1, -1).trim() : tkn.trim()
      stack.push(Object.freeze({ value: str, unit: null, dtype: dt.STRING }))

    } else if (/^``/.test(tkn)) {
      stack.push(DataFrame.dataFrameFromCSV(tablessTrim(tkn.slice(2, -2)), {}))

    } else if (ch === '`') {
      // A rich text literal
      const chEnd = tkn.charAt(tkn.length - 1)
      const str = ch === '`' && chEnd === '`' ? tkn.slice(1, -1).trim() : tkn.trim()
      stack.push(Object.freeze({ value: str, unit: null, dtype: dt.RICHTEXT }))

    } else {
      switch (tkn) {
        case "true":
        case "false": {
          const bool = Object.create(null)
          bool.value = tkn === "true"
          bool.unit = null
          bool.dtype = dt.BOOLEAN
          stack.push(Object.freeze(bool))
          break
        }

        case "π": {
          const pi = Object.create(null)
          pi.value = Rnl.pi
          pi.dtype = dt.RATIONAL
          pi.unit = Object.create(null)
          pi.unit.expos = allZeros
          stack.push(Object.freeze(pi))
          break
        }

        case "e": {
          const e = Object.create(null)
          e.value = "e"
          e.dtype = dt.RATIONAL
          e.unit = Object.create(null)
          e.unit.expos = allZeros
          stack.push(Object.freeze(e))
          break
        }

        case "j": {
          // j = √(-1)
          const j = Object.create(null)
          j.value = [Rnl.zero, Rnl.one]
          j.unit = Object.create(null)
          j.unit.expos = allZeros
          j.dtype = dt.COMPLEX
          stack.push(Object.freeze(j))
          break
        }

        case "ℏ": {
          // Reduced Plank constant
          const hbar = Object.create(null)
          hbar.value = Rnl.hbar
          hbar.dtype = dt.RATIONAL
          hbar.unit = Object.create(null)
          hbar.unit.expos = Object.freeze(unitAware ? [2, 1, -1, 0, 0, 0, 0, 0] : allZeros)
          stack.push(Object.freeze(hbar))
          break
        }

        case "∠": {
          // Complex number in polar notation.
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (o1.dtype !== dt.RATIONAL || o2.dtype !== dt.RATIONAL) {
            return errorOprnd("NAN_OP")
          }
          const theta = Rnl.toNumber(o2.value)
          const z = Object.create(null)
          z.value = [
            Rnl.multiply(o1.value, Rnl.fromNumber(Math.cos(theta))), // real part
            Rnl.multiply(o1.value, Rnl.fromNumber(Math.sin(theta)))  // imaginary part
          ];
          z.unit = Object.create(null)
          z.unit.expos = allZeros
          z.dtype = dt.COMPLEX
          stack.push(Object.freeze(z))
          break
        }

        case "+":
        case "-": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          const op = tkn === "+" ? "add" : "subtract"
          if (!(((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX)) &&
                ((o2.dtype & dt.RATIONAL) || (o2.dtype & dt.COMPLEX)))) {
            return errorOprnd("NAN_OP")
          }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
              return errorOprnd("UNIT_ADD")
            }
          }
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)
          const sum = Object.create(null)
          // See file operations.js for an explanation of what goes on in the next line.
          sum.value = Operators.binary[shape1][shape2][op](o1.value, o2.value)
          if (sum.value.dtype && sum.value.dtype === dt.ERROR) { return sum.value }
          sum.unit = o1.unit
          sum.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn)
          stack.push(Object.freeze(sum))
          break
        }

        case "~": {
          // Unary minus
          const o1 = stack.pop()
          if (!((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX)) {
            return errorOprnd("NAN_OP")
          }
          const neg = Object.create(null)
          neg.value = Operators.unary[shapeOf(o1)]["negate"](o1.value)
          if (neg.value.dtype && neg.value.dtype === dt.ERROR) { return neg.value }
          neg.unit = o1.unit
          neg.dtype = o1.dtype
          stack.push(Object.freeze(neg))
          break
        }

        case "×":
        case "·":
        case "*":
        case "⌧": {
          const oprnd2 = stack.pop()
          const o2 = oprnd2.dtype === dt.DATAFRAME ? clone(oprnd2) : oprnd2
          const o1 = stack.pop()
          if (!(((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX)) &&
            ((o2.dtype & dt.RATIONAL) || (o2.dtype & dt.COMPLEX) ||
            o2.dtype === dt.DATAFRAME))) {
            return errorOprnd("NAN_OP")
          }
          const product = Object.create(null)
          let unit = Object.create(null)
          if (unitAware) {
            if ((o1.dtype === dt.DATAFRAME && o2.dtype === dt.RATIONAL) ||
                (o1.dtype === dt.RATIONAL && o2.dtype === dt.DATAFRAME)) {
              unit = o1.dtype === dt.DATAFRAME ? o1.unit : o2.unit
            } else {
              unit.expos = o1.unit.expos.map((e, j) => e + o2.unit.expos[j])
            }
          } else {
            unit.expos = allZeros
          }
          product.unit = o2.dtype === dt.DATAFRAME ? clone(o2.unit) : Object.freeze(unit)

          const [shape1, shape2, needsMultBreakdown] = binaryShapesOf(o1, o2)
          const op = needsMultBreakdown
            ? { "×": "cross", "·": "dot", "*": "asterisk", "⌧": "multiply" }[tkn]
            : "multiply"

          product.dtype = (tkn === "*" || shape1 === "scalar" || shape1 === "map" ||
            shape1 === "complex" || shape2 === "scalar" ||
            shape2 === "map" || shape2 === "complex")
            ? Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, op)
            : tkn === "·"
            ? dt.RATIONAL
            : tkn === "×"
            ? dt.COLUMNVECTOR
            : Matrix.multResultType(o1, o2)

          product.value = Operators.binary[shape1][shape2][op](o1.value, o2.value)
          if (product.value.dtype && product.value.dtype === dt.ERROR) {
            return product.value
          }

          stack.push(Object.freeze(product))
          break
        }

        case "/":
        case "//":
        case "÷":
        case "///":
        case "\u2215": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (!(((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX) &&
                ((o2.dtype & dt.RATIONAL) || o2.dtype === dt.COMPLEX))) {
            return errorOprnd("NAN_OP")
          }
          const quotient = Object.create(null)
          const unit = Object.create(null)
          unit.expos = unitAware
            ? o1.unit.expos.map((e, j) => e - o2.unit.expos[j])
            : allZeros
          quotient.unit = Object.freeze(unit)
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)
          quotient.value = Operators.binary[shape1][shape2]["divide"](o1.value, o2.value)
          quotient.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, "divide")
          if (isDivByZero(quotient.value, shapeOf(quotient))) { return errorOprnd("DIV") }
          stack.push(Object.freeze(quotient))
          break
        }

        case "^": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (Matrix.isVector(o1) && o2.value === "T") {
            // Transpose a vector
            const oprnd = clone(o1)
            oprnd.dtype = o1.dtype + ((o1.dtype & dt.ROWVECTOR)
              ? dt.COLUMNVECTOR - dt.ROWVECTOR
              : dt.ROWVECTOR - dt.COLUMNVECTOR)
            stack.push(Object.freeze(oprnd))
            break
          }
          if (!(((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX) &&
                ((o2.dtype & dt.RATIONAL) || o2.dtype === dt.COMPLEX) ||
                (isMatrix(o1) && o2.value === "T"))) {
            return errorOprnd("NAN_OP")
          }
          const power = Object.create(null)
          const unit = Object.create(null)
          unit.expos = allZeros
          if (unitAware) {
            // TODO: lots to do here
            const d = typeof o2.unit === "number" ? o2.unit : Rnl.toNumber(o2.value)
            unit.expos = o1.unit.expos.map(e => e * d)
          }
          power.unit = Object.freeze(unit)
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)
          power.value = Operators.binary[shape1][shape2]["power"](o1.value, o2.value)
          if (power.value.dtype) { return power.value } // Error
          power.dtype = Cpx.isComplex(power.value)
            ? dt.COMPLEX
            : Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn)
          stack.push(Object.freeze(power))
          break
        }

        case "^*": {
          // complex conjugate
          const oprnd = stack.pop()
          if (!(oprnd.dtype & dt.COMPLEX)) { return errorOprnd("NA_REAL"), "conjugate" }
          const o2 = {
            value: Cpx.conjugate(oprnd.value),
            unit: oprnd.unit,
            dtype: oprnd.dtype
          }
          stack.push(Object.freeze(o2))
          break
        }

        case "&":
        case "&_": {
          // Concatenation
          const o2 = stack.pop()
          const o1 = stack.pop()
          const opName = tkn === "&" ? "concat" : "unshift"
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)
          let o3 = Object.create(null)
          if (o1.dtype === dt.STRING && o1.dtype === dt.STRING) {
            const str1 = stringFromOperand(o1, decimalFormat)
            const str2 = stringFromOperand(o2, decimalFormat)
            o3.value = str1 + str2
            o3.unit = null
            o3.dtype = dt.STRING
          } else if ((o1.dtype & dt.DATAFRAME) && Matrix.isVector(o2) && tkn === "&") {
            o3 = DataFrame.append(o1, o2, vars, unitAware)
            if (o3.dtype === dt.ERROR) { return o3 }
          } else if ((o1.dtype & dt.MAP) || (o2.dtype & dt.MAP)) {
            o3 = map.append(o1, o2, shape1, shape2, vars)
            if (o3.dtype === dt.ERROR) { return o3 }
          } else {
            if (unitAware) {
              if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
                return errorOprnd("UNIT_ADD")
              }
            }
            o3.value = Operators.binary[shape1][shape2][opName](o1.value, o2.value)
            if (o3.value.dtype) { return o3.value } // Error
            o3.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn)
            o3.unit = o1.unit
          }
          stack.push(Object.freeze(o3))
          break
        }

        case "√":
        case "∛":
        case "∜": {
          const index = tkn.charCodeAt(0) - 8728
          const pow = [BigInt(1), BigInt(index)]
          const o1 = stack.pop()
          if (!((o1.dtype & dt.RATIONAL) || (o1.dtype & dt.COMPLEX))) {
            return errorOprnd("NAN_OP")
          }
          const root = Object.create(null)
          const unit = Object.create(null)
          unit.expos = allZeros
          if (unitAware) { unit.expos = o1.unit.expos.map(e => e / index) }
          root.unit = Object.freeze(unit)

          const shape1 = shapeOf(o1)
          root.value = Operators.binary[shape1]["scalar"]["power"](o1.value, pow)
          if (root.value.dtype && root.value.dtype === dt.ERROR) { return root.value }

          root.dtype = Cpx.isComplex(root.value)
            ? dt.COMPLEX
            : Operators.dtype[shape1]["scalar"](o1.dtype, dt.RATIONAL, tkn)

          stack.push(Object.freeze(root))
          break
        }

        case "root": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (!((o1.dtype & dt.RATIONAL) & (o2.dtype & dt.RATIONAL))) {
            return errorOprnd("NAN_OP")
          }
          const root = Object.create(null)
          const unit = Object.create(null)
          unit.expos = allZeros
          if (unitAware) { unit.expos = o2.unit.expos.map(e => e / Number(o1.value[0])) }
          root.unit = Object.freeze(unit)

          const pow = Rnl.reciprocal(o1.value)
          const shape1 = shapeOf(o1)
          root.value = Operators.binary[shape1]["scalar"]["power"](o2.value, pow)
          if (root.value.dtype && root.value.dtype === dt.ERROR) { return root.value }

          root.dtype = Operators.dtype[shape1]["scalar"](o1.dtype, dt.RATIONAL, tkn)
          stack.push(Object.freeze(root))
          break
        }

        case ".": {
          // Accessor of a object's property in dot notation
          const o2 = stack.pop()
          const o1 = stack.pop()
          const property = propertyFromDotAccessor(o1, o2, vars, unitAware)
          if (property.dtype === dt.ERROR) { return property }
          stack.push(Object.freeze(property))
          break
        }

        case "[]": {
          // Bracket accessor to a data frame, matrix, string, data frame, or module.
          const numArgs = Number(tokens[i + 1])
          i += 1
          const args = []
          for (let j = 0; j < numArgs; j++) { args.unshift(stack.pop()) }
          const o1 = stack.pop()
          let property
          if (o1.dtype & dt.DATAFRAME) {
            property = DataFrame.range(o1, args, vars, unitAware)

          } else if (o1.dtype & dt.MAP) {
            property = map.valueFromMap(o1, args, unitAware)

          } else if (o1.dtype === dt.STRING) {
            property = textRange(o1.value, args[0])

          } else if (o1.dtype === dt.MODULE) {
            if (numArgs === 1) {
              property = fromAssignment(o1.value[args[0].value], unitAware)
            } else {
              // Multiple assignment.
              property = { value: new Map(), unit: null, dtype: dt.TUPLE }
              for (let j = 0; j < args.length; j++) {
                const name = args[j].value
                property.value.set(name, fromAssignment(o1.value[name], unitAware))
              }
            }

          } else {
            // o1 is a matrix or a data frame
            const rowIndex = args[0]
            const colIndex = (numArgs === 2)
              ? args[1]
              : isVector(o1)
              ? null
              : { value: Rnl.zero, unit: allZeros, dtype: dt.RATIONAL }
            property = (o1.dtype & dt.DATAFRAME)
              ? DataFrame.range(o1, rowIndex, colIndex, vars, unitAware)
              : Matrix.submatrix(o1, rowIndex, colIndex)
          }
          if (property.dtype === dt.ERROR) { return property }
          stack.push(Object.freeze(property))
          break
        }

        case "..": {
          // range separator.
          const end = stack.pop()
          const o1 = stack.pop()
          if (!(o1.dtype === dt.RATIONAL || o1.dtype === dt.RANGE)) {
            return errorOprnd("NAN_OP")
          }
          const range = Object.create(null)
          range.unit = null
          range.dtype = dt.RANGE
          const step = o1.dtype !== dt.RATIONAL
            ? o1.value[2]
            : Rnl.lessThan(o1.value, end.value)
            ? Rnl.one
            : Rnl.negate(Rnl.one)
          range.value = o1.dtype === dt.RATIONAL
            ? [o1.value, step, end.value]
            : [o1.value[0], o1.value[2], end.value];
          stack.push((Object.freeze(range)))
          break
        }

        case ":": {
          const o2 = stack.pop()
          const key = stack.pop()
          if (key.dtype !== dt.STRING) { return errorOprnd("BAD_KEYSTR") }
          stack.push(Object.freeze({
            name: key.value, value: o2.value, unit: o2.unit, dtype: o2.dtype
          }))
          break
        }

        case "normal":
        case "uniform":
        case "lognormal": {
          // eslint-disable-next-line no-unused-vars
          const high = stack.pop()
          // eslint-disable-next-line no-unused-vars
          const low = stack.pop()
          // low and high define a probablility distribution. They are the ends of a
          // uniform distribution or they mark the 90% confidence interval of (log)normal.
          // TODO: Implement probability distributions as a data type.
          break
        }

        case "!": {
          // TODO: "!!" and "¡"
          const o1 = stack.pop()
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, allZeros)) { return errorOprnd("FACT") }
          }
          const x = o1.value
          if (!Rnl.isInteger(x) || Rnl.isNegative(x)) { return errorOprnd("FACT") }
          const factorial = Object.create(null)
          factorial.unit = allZeros
          factorial.dtype = dt.RATIONAL
          factorial.value = Operators.unary[shapeOf(o1)]["factorial"](x)
          if (factorial.value.dtype) { return factorial.value } // Error
          stack.push(Object.freeze(factorial))
          break
        }

        case "%": {
          // TODO: per thousand, ‰
          const o1 = stack.pop()
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          const percentage = Object.create(null)
          percentage.unit = o1.unit
          percentage.dtype = o1.dtype
          percentage.value = Operators.unary[shapeOf(o1)]["percent"](o1.value)
          if (percentage.value) { return percentage.value } // Error
          stack.push(Object.freeze(percentage))
          break
        }

        case "|":
        case "‖": {
            // Find |x| or ‖x‖
          const o1 = stack.pop()
          if (!((o1.dtype & dt.RATIONAL) || o1.dtype === dt.COMPLEX)) {
            return errorOprnd("NAN_OP")
          }
          const op = tkn === "|" ? "abs" : "norm"
          const abs = Object.create(null)
          abs.unit = o1.unit
          abs.dtype = dt.RATIONAL
          abs.value = Operators.unary[shapeOf(o1)][op](o1.value)
          if (abs.value.dtype && abs.value.dtype === dt.ERROR) { return abs.value }
          stack.push(Object.freeze(abs))
          break
        }

        case "matrix": {
          // matrix
          const numRows = Number(tokens[i + 1])
          const numCols = Number(tokens[i + 2])
          i += 2

          if (stack[stack.length - 1].dtype === dt.RANGE) {
            // Input was [start:step:end]
            stack.push(Matrix.operandFromRange(stack.pop().value))
          } else {
            stack.push(Matrix.operandFromTokenStack(stack, numRows, numCols))
          }
          break
        }

        case "startSvg":
          stack.push({ value: Draw.startSvg(), unit: null, dtype: dt.DRAWING })
          break

        case "abs":
        case "cos":
        case "sin":
        case "tan":
        case "acos":
        case "asin":
        case "atan":
        case "sec":
        case "csc":
        case "cot":
        case "asec":
        case "acsc":
        case "acot":
        case "exp":
        case "log":
        case "ln":
        case "log10":
        case "log2":
        case "cosh":
        case "sinh":
        case "tanh":
        case "sech":
        case "csch":
        case "coth":
        case "acosh":
        case "asinh":
        case "atanh":
        case "asech":
        case "acsch":
        case "acoth":
        case "Gamma":
        case "Γ":
        case "logGamma":
        case "logΓ":
        case "logFactorial":
        case "cosd":
        case "sind":
        case "tand":
        case "acosd":
        case "asind":
        case "atand":
        case "secd":
        case "cscd":
        case "cotd":
        case "asecd":
        case "acscd":
        case "acotd":
        case "Re":
        case "Im":
        case "argument":
        case "chr":
        case "round":
        case "sqrt":
        case "sign": {
          // Functions with one real or complex argument.
          const arg = stack.pop()
          if (!((arg.dtype & dt.RATIONAL) || (arg.dtype & dt.COMPLEX))) {
            return errorOprnd("UNREAL", tkn)
          }

          const output = Object.create(null)
          const unit = Object.create(null)
          unit.expos = unitAware ? Functions.functionExpos(tkn, [arg]) : allZeros
          if (unit.expos.dtype && unit.expos.dtype === dt.ERROR) { return unit.expos }
          output.unit = Object.freeze(unit)

          const shape = (arg.dtype & dt.RATIONAL) ? "scalar" : "complex"
          const value = ((arg.dtype & dt.MAP) && Matrix.isVector(arg))
            // eslint-disable-next-line max-len
            ? mapMap(arg.value, array => array.map(e => Functions.unary[shape][tkn](e)))
            : Matrix.isVector(arg)
            ? arg.value.map(e => Functions.unary[shape][tkn](e))
            : isMatrix(arg)
            ? arg.value.map(row => row.map(e => Functions.unary[shape][tkn](e)))
            : needsMap(arg)
            ? mapMap(arg.value, val => Functions.unary[shape][tkn](val))
            : Functions.unary[shape][tkn](arg.value)
          if (value.dtype && value.dtype === dt.ERROR) { return value }
          output.value = Object.freeze(value)

          output.dtype = tkn === "chr"
            ? arg.dtype - dt.RATIONAL + dt.STRING
            : (arg.dtype & dt.COMPLEX) && arfn.includes(tkn)
            ? arg.dtype - dt.COMPLEX + dt.RATIONAL
            : arg.dtype

          stack.push(Object.freeze(output))
          break
        }

        case "logn":
        case "atan2":
        case "hypot":
        case "gcd":
        case "rms":
        case "binomial":
        case "zeros": {
          // Functions with two real arguments.
          const args = []
          args.push(stack.pop())
          args.unshift(stack.pop())
          if (!(args[0].dtype & dt.RATIONAL)) { return errorOprnd("") }

          const output = Object.create(null)
          const unit = Object.create(null)
          unit.expos = unitAware ? Functions.functionExpos(tkn, args) : allZeros
          if (unit.dtype && unit.dtype === dt.ERROR) { return unit }
          output.unit = Object.freeze(unit)

          const [value, dtype] = multivarFunction("binary", tkn, args)
          output.value = Object.freeze(value)
          output.dtype = dtype
          stack.push(Object.freeze(output))
          break
        }

        case "roundn":
        case "string": {
          // Round a numeric value.
          const spec = stack.pop()
          const num = stack.pop()
          if (!(num.dtype & dt.RATIONAL)) { return errorOprnd("") }
          if (!(spec.dtype & dt.STRING)) { return errorOprnd("") }
          if (!/(?:f-?|r)\d+/.test(spec.value)) { return errorOprnd("") }
          let funcName = ""
          const output = Object.create(null)
          if (tkn === "string") {
            funcName = spec.value.charAt() === "f" ? "stringFixed" : "stringSignificant"
            output.unit = null
            output.dtype = num.dtype - dt.RATIONAL + dt.STRING
          } else {
            funcName = spec.value.charAt() === "f" ? "roundFixed" : "roundSignificant"
            output.unit = num.unit
            output.dtype = num.dtype
          }
          const n = Number(spec.value.slice(1))
          const value = ((num.dtype & dt.MAP) && Matrix.isVector(num))
            ? mapMap(num.value, array => array.map(e => Functions.binary[funcName]([e, n])))
            : Matrix.isVector(num)
            ? num.value.map(e => Functions.binary[funcName]([e, n]))
            : isMatrix(num)
            ? num.value.map(row => row.map(e => Functions.binary[funcName]([e, n])))
            : needsMap(num)
            ? mapMap(num.value, val => Functions.binary[funcName]([val, n]))
            : Functions.binary[funcName]([num.value, n])
          if (value.dtype && value.dtype === dt.ERROR) { return value }
          output.value = Object.freeze(value)
          if (num.name) { output.name = num.name }
          stack.push(Object.freeze(output))
          break
        }

        case "dataframe":
        case "max":
        case "min":
        case "sum":
        case "product":
        case "range":
        case "mean":
        case "median":
        case "variance":
        case "stddev": {
          // Functions that reduce multiple arguments to one result.
          // TODO: unit-aware reducing functions.
          const numArgs = Number(tokens[i + 1])
          i += 1
          const args = []
          for (let j = 0; j < numArgs; j++) {
            const datum = stack.pop()
            if (tkn !== "dataframe" && !(datum.dtype & dt.RATIONAL)) {
              return errorOprnd("NANARG", tkn)
            }
            args.unshift(datum)
          }

          if (tkn === "dataframe") {
            const df = DataFrame.dataFrameFromVectors(args, vars)
            if (df.dtype && df.dtype === dt.ERROR) { return df }
            stack.push(df)
            break
          }

          const output = Object.create(null)
          const unit = Object.create(null)
          unit.expos = unitAware ? Functions.functionExpos(tkn, args) : allZeros
          if (unit.dtype && unit.dtype === dt.ERROR) { return errorOprnd("") }
          output.unit = Object.freeze(unit)

          const [value, dtype] = multivarFunction("reduce", tkn, args)
          output.value = Object.freeze(value)
          output.dtype = dtype
          stack.push(Object.freeze(output))
          break
        }

        case "random": {
          // No arguments
          const num = Object.create(null)
          num.value = Rnl.fromNumber(Math.random())
          num.unit = Object.create(null)
          num.unit.expos = allZeros
          num.dtype = dt.RATIONAL
          stack.push(Object.freeze(num))
          break
        }

        case "isNaN": {
          const oprnd = stack.pop()
          const output = Object.create(null)
          output.value = !(oprnd.dtype & dt.RATIONAL)
          output.unit = null
          output.dtype = dt.BOOLEAN
          stack.push(Object.freeze(output))
          break
        }

        case "length": {
          const arg = stack.pop()
          const value = arg.value
          const length = Matrix.isVector(arg)
            ? value.length
            : (arg.dtype & dt.MATRIX)
            ? value.length * value[0].length
            : (arg.dtype === dt.STRING)
            ? value.length - arrayOfRegExMatches(/[\uD800-\uD8FF\uFE00\uFE01]/g, value).length
            : (arg.dtype & dt.MAP)
            ? arg.keys().value.length
            : 0
          const output = Object.create(null)
          output.value = Object.freeze(Rnl.fromNumber(length))
          output.unit = Object.create(null)
          output.unit.expos = allZeros
          output.dtype = dt.RATIONAL
          stack.push(Object.freeze(output))
          break
        }

        case "count": {
          const pattern = stack.pop()
          const str = stack.pop()
          if (pattern.dtype !== dt.STRING || str.dtype !== dt.STRING) {
            return errorOprnd("COUNT")
          }
          const output = Object.create(null)
          output.value = Object.freeze(
            Rnl.fromNumber(str.value.split(pattern.value).length - 1)
          )
          output.unit = Object.create(null)
          output.unit.expos = allZeros
          output.dtype = dt.RATIONAL
          stack.push(Object.freeze(output))
          break
        }

        case "format": {
          const formatSpec = stack.pop().value
          const str = format(stack.pop().value, formatSpec)
          stack.push({ value: str, unit: null, dtype: dt.STRING })
          break
        }

        case "lerp": {
          // linear interpolation function
          const args = new Array(3)
          args[2] = stack.pop()
          args[1] = stack.pop()
          args[0] = stack.pop()
          const result = Functions.lerp(args, unitAware)
          if (result.dtype === dt.ERROR) { return result }
          stack.push(result)
          break
        }

        case "matrix2table": {
          const colNames = stack.pop()
          const rowNames = stack.pop()
          const matrix = stack.pop()
          const result = DataFrame.matrix2table(matrix, rowNames, colNames, vars)
          if (result.dtype === dt.ERROR) { return result }
          stack.push(result)
          break
        }

        case "transpose":
          stack.push(Matrix.transpose(stack.pop()))
          break

        case "trace":
          stack.push(Matrix.trace(stack.pop()))
          break

        case "fetch":
          // fetch() is handled in updateCalculations.js.
          // It's easier from there to coordinate an async function with ProseMirror.
          // So if control flow get here, we have an error.
          return errorOprnd("FETCH")

        case "function": {
          // User defined function.
          const functionName = tokens[i + 1]
          const numArgs = Number(tokens[i + 2])
          i += 2
          const args = new Array(numArgs)
          for (let j = numArgs - 1; j >= 0; j--) {
            args[j] = stack.pop()
          }
          let oprnd
          if (vars.svg && (functionName === "plot" || (Draw.functions[functionName]))) {
            if (functionName === "plot") {
              args.splice(1, 0, decimalFormat)
              oprnd = plot(...args)
            } else {
              oprnd = Draw.functions[functionName](...args)
            }
          } else if (nextToken(tokens, i) === ".") {
            // Function from a module
            let lib = stack.pop().value         // remote module
            if (lib.value) { lib = lib.value }  // local module
            const udf = lib[functionName]
            if (udf === undefined) { return errorOprnd("F_NAME", functionName) }
            if (udf.dtype === dt.ERROR) { return udf }
            if (udf.isPrivate) { return errorOprnd("PRIVATE", functionName) }
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware, lib)
            i += 1
          } else if (lib && lib[functionName]) {
            // A module, "lib", was passed to this instance of evalRpn().
            const udf = lib[functionName]
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware, lib)
          } else if (vars[functionName] && vars[functionName].dtype === dt.MODULE) {
            // User-defined function from a calculation node.
            const udf = vars[functionName]["value"]
            oprnd = evalCustomFunction(udf, args, decimalFormat, unitAware)
          } else {
            return errorOprnd("BAD_FUN_NM", functionName)
          }
          if (oprnd.dtype === dt.ERROR) { return oprnd }
          stack.push(oprnd)
          break
        }

        case "=":
        case "==":
        case "<":
        case ">":
        case "<=":
        case "≤":
        case ">=":
        case "≥":
        case "≠":
        case "!=":
        case "∈":
        case "∉":
        case "⋐": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (unitAware &&
            !((o1.dtype & dt.STRING) || (o2.dtype & dt.STRING) ||
               o1.dtype === dt.NULL || o2.dtype === dt.NULL)) {
            if (!unitsAreCompatible(o1.unit.expos, o2.unit.expos)) {
              return errorOprnd("UNIT_COMP")
            }
          }
          const bool = Object.create(null)
          bool.unit = null
          const prevValue = (o1.dtype & dt.BOOLEANFROMCOMPARISON) ? oPrev.value : undefined

          if (isIn(tkn, ["∈", "∉", "⋐"])) {
            bool.value = compare(tkn, o1.value, o2.value, prevValue)
          } else {
            const [shape1, shape2, _] = binaryShapesOf(o1, o2)
            bool.value = Operators.relations[shape1][shape2].relate(tkn, o1.value,
              o2.value, prevValue)
          }
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }
          bool.dtype = dt.BOOLEANFROMCOMPARISON
          oPrev = o2
          stack.push(Object.freeze(bool))
          break
        }

        case "and":
        case "or":
        case "∧":
        case "∨":
        case "⊻": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (!(o1.dtype & dt.BOOLEAN) || !(o2.dtype & dt.BOOLEAN)) {
            return errorOprnd("LOGIC", tokens[i])
          }
          const op = { "and": "and", "or": "or", "∧": "and", "∨": "or", "⊻": "xor" }[tkn]
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)

          const bool = Object.create(null)
          bool.unit = null
          bool.value = Operators.binary[shape1][shape2][op](o1.value, o2.value)
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }

          bool.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn)
          stack.push(Object.freeze(bool))
          break
        }

        case "not":
        case "¬": {
          const o1 = stack.pop()
          if (!(o1.dtype & dt.BOOLEAN)) { return errorOprnd("LOGIC", tkn) }
          const bool = Object.create(null)
          bool.unit = null
          bool.value = Operators.unary[shapeOf(o1)]["not"](o1.value)
          if (bool.value.dtype && bool.value.dtype === dt.ERROR) { return bool.value }
          bool.dtype = dt.BOOLEAN
          stack.push(Object.freeze(bool))
          break
        }

        case "cases": {
          // A multi-line cases expression. Hurmet's ternary expression.
          const numArgs = Number(tokens[i + 1])
          i += 1
          // We evaluate cases expressions lazily. Pop the conditions into an array.
          const conditions = new Array(numArgs)
          for (let j = numArgs - 1; j >= 0; j--) {
            conditions[j] = stack.pop()
          }
          // Check each condition.
          // When we reach the first true condition, evaluate the corresponding expression.
          for (let j = 0; j < numArgs; j++) {
            if ((conditions[j].dtype & dt.BOOLEAN) === 0) {
              return errorOprnd("LOGIC", "if")
            }
            if (conditions[j].value) {
              const rpnLocal = tokens[i + j + 1].replace(/§/g, "\u00A0")
              const oprnd = evalRpn(rpnLocal, vars, decimalFormat, unitAware, lib)
              if (oprnd.dtype === dt.ERROR) { return oprnd }
              stack.push(oprnd)
              break
            }
          }
          i += numArgs  // Discard the unused expressions
          break
        }

        case "applyUnit": {
          // Pop a magnitude off the stack and apply a unit.
          // This happens where a user writes a QUANTITY literal.
          if (!unitAware) { return errorOprnd("UNIT_AWARE", tokens[i + 1]) }
          const o1 = stack.pop()
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("QUANT_NUM") }
          const unitName = tokens[i + 1]
          i += 1
          const output = Object.create(null)
          output.unit = Object.create(null)
          output.dtype = o1.dtype
          if (!unitAware) {
            output.value = o1.value
            if (o1.dtype & dt.MAP) {
              output.unit = unitFromUnitName(unitName, vars)
            } else {
              output.unit.name = unitName
            }
          } else {
            // Convert the magnitude to base units.
            const unit = unitFromUnitName(unitName, vars)
            if (unit.dtype && unit.dtype === dt.ERROR) { return unit }
            if (isMatrix(o1)) {
              output.unit.expos = o1.unit.expos.map((e, j) => e + unit.expos[j])
              output.value = Matrix.convertToBaseUnits(o1, unit.gauge, unit.factor)
            } else if (o1.dtype & dt.MAP) {
              output.unit = unitFromUnitName(o1.unit)
              output.value = o1.value
            } else {
              output.unit.expos = o1.unit.expos.map((e, j) => e + unit.expos[j])
              output.value = Rnl.multiply(Rnl.add(o1.value, unit.gauge), unit.factor)
            }
          }
          stack.push(Object.freeze(output))
          break
        }

        case "modulo": {
          const o2 = stack.pop()
          const o1 = stack.pop()
          if (!((o1.dtype & dt.RATIONAL) & (o2.dtype & dt.RATIONAL))) {
            return errorOprnd("NAN_OP")
          }
          const [shape1, shape2, _] = binaryShapesOf(o1, o2)
          const mod = Object.create(null)
          mod.unit = Object.create(null)
          mod.unit.expos = allZeros
          mod.value = Operators.binary[shape1][shape2]["modulo"](o1.value, o2.value)
          if (mod.value.dtype && mod.value.dtype === dt.ERROR) { return mod.value }
          mod.dtype = Operators.dtype[shape1][shape2](o1.dtype, o2.dtype, tkn)
          stack.push(Object.freeze(mod))
          break
        }

        case "⎾⏋":
        case "⎿⏌": {
          // ceiling or floor
          const o1 = stack.pop()
          if (!(o1.dtype & dt.RATIONAL)) { return errorOprnd("NAN_OP") }
          if (unitAware) {
            if (!unitsAreCompatible(o1.unit.expos, allZeros)) {
              // TODO: Write an error message.
              { return errorOprnd("") }
            }
          }
          const op = tkn === "⎾⏋" ? "ceil" : "floor"
          const output = Object.create(null)
          output.value = Operators.unary[shapeOf(o1)][op](o1.value)
          if (output.value.dtype && output.value.dtype === dt.ERROR) { return output.value }
          output.unit = o1.unit
          output.dtype = o1.dtype
          stack.push(Object.freeze(output))
          break
        }

        case "()": {
          // binomial
          const args = []
          args.unshift(stack.pop())
          args.unshift(stack.pop())
          if (unitAware) {
            if (!unitsAreCompatible(args[0].unit.expos, allZeros) ||
              !unitsAreCompatible(args[1].unit.expos, allZeros)) {
              return errorOprnd("BINOM")
            }
          }
          const binom = Object.create(null)
          binom.unit = Object.create(null)
          binom.unit.expos = allZeros
          const [value, dtype] = multivarFunction("binary", "binomial", args)
          binom.value = value
          binom.dtype = dtype
          stack.push(Object.freeze(binom))
          break
        }

        case "raise":
          return { value: stack.pop().value, unit: null, dtype: dt.ERROR }

        case "\\blue":
        case "\\gray":
        case "\\green":
        case "\\orange":
        case "\\pink":
        case "\\purple":
        case "\\red": {
          const color = clone(stack.pop())
          if (color.dtype === dt.STRING) { color.unit = tkn.slice(1) }
          stack.push(color)
          break
        }

        default:
          // TODO: Write an error message
      }
    }
  } // next i

  const oprnd = stack.pop()
  if (stack.length > 0) {
    return errorOprnd("ERROR")
  }

  return oprnd
}

const plot = (svg, decimalFormat, fun, numPoints, xMin, xMax) => {
  // Plot a function.
  // To avoid a circular reference, this function has to be here instead of in draw.js.
  const attrs = svg.value.temp
  numPoints = (numPoints == null) ? Rnl.fromNumber(250) : numPoints.value
  const min = (xMin == null) ? Rnl.fromNumber(attrs.xmin) : xMin.value
  const max = (xMax == null) ? Rnl.fromNumber(attrs.xmax) : xMax.value
  // Vectorize the evaluation. Start by finding a vector of the input.
  const step = Rnl.divide(Rnl.subtract(max, min), numPoints)
  const rowVector = Matrix.operandFromRange([min, step, max])
  // Transpose the row vector into a column vector.
  const arg = { value: rowVector.value, unit: null, dtype: dt.COLUMNVECTOR + dt.RATIONAL }
  // Run the function on the vector.
  let funResult
  let pathValue
  if (fun.value.dtype && fun.value.dtype === dt.MODULE) {
    funResult = evalCustomFunction(fun.value, [arg], decimalFormat, false)
    pathValue = arg.value.map((e, i) => [e, funResult.value[i]])
  } else if (fun.dtype === dt.STRING) {
    if (/§matrix§1§2$/.test(fun.value)) {
      arg.name = "t"
      pathValue = evalRpn(fun.value.replace(/§/g, "\xa0"), { t: arg }, decimalFormat, false).value
    } else {
      arg.name = "x"
      funResult = evalRpn(fun.value.replace(/§/g, "\xa0"), { x: arg }, decimalFormat, false)
      pathValue = arg.value.map((e, i) => [e, funResult.value[i]])
    }
  } else {
    //TODO: error message.
  }
  const pth = { value: pathValue, unit: null, dtype: dt.MATRIX + dt.RATIONAL }
  return Draw.functions.path(svg, pth, "L")
}

const elementFromIterable = (iterable, index, step) => {
  // A helper function. This is called by `for` loops in evalCustomFunction()
  let value
  let nextIndex = Rnl.increment(index)
  let dtype = 0
  if (iterable.dtype === dt.RANGE) {
    value = index
    nextIndex = Rnl.add(index, step)
    dtype = dt.RATIONAL
  } else if ((iterable.dtype === dt.STRING) &&
    iterable.value[Rnl.fromNumber(index)] === "\uD835") {
    value = Rnl.fromNumber(iterable.value[index] + iterable.value[index + 1])
    nextIndex = Rnl.add(index, 2)
    dtype = dt.STRING
  } else {
    value = iterable.value[Rnl.toNumber(index)]
    dtype = (iterable.dtype & dt.STRING)
      ? dt.STRING
      : (iterable.dtype & dt.ROWVECTOR)
      ? iterable.dtype - dt.ROWVECTOR
      : (iterable.dtype & dt.COLUMNVECTOR)
      ? iterable.dtype - dt.COLUMNVECTOR
      : iterable.dtype - dt.MATRIX
  }
  const oprnd = { value: value, unit: iterable.unit, dtype: dtype }
  return [oprnd, nextIndex]
}

const loopTypes = ["while", "for"];

const evalCustomFunction = (udf, args, decimalFormat, isUnitAware, lib) => {
  // UDF stands for "user-defined function"
  // lib is short for library. If not omitted, it contains a module with more functions.

  if (udf.dtype === dt.ERROR) {
    return udf
  }

  // Populate the function parameters.
  if (args.length > udf.parameters.length) { return errorOprnd("NUMARGS", udf.name) }
  const vars = Object.create(null)
  for (let i = 0; i < args.length; i++) {
    vars[udf.parameters[i]] = args[i]
  }
  if (udf.parameters.length > args.length) {
    for (let i = args.length; i < udf.parameters.length; i++) {
      vars[udf.parameters[i]] = { value: undefined, unit: null, dtype: 0 }
    }
  }
  if (udf.dtype === dt.DRAWING) {
    vars["svg"] = { value: Draw.startSvg(), unit: null, dtype: dt.DRAWING }
  }

  // Execute the function statements.
  // There will be nested flow of control, of course. So we'll create a
  // "control" stack. The topmost element contains info about the control
  // that applies to the current nesting level.
  const control = [{ type: "if", condition: true, endOfBlock: udf.statements.length - 1 }]
  for (let i = 0; i < udf.statements.length; i++) {
    const statement = udf.statements[i]
    const stype = statement.stype
    const level = control.length - 1
    switch (stype) {
      case "statement": {
        if (control[level].condition) {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
          if (result.dtype === dt.ERROR) { return result }
          if (statement.name) {
            statement.resultdisplay = isUnitAware ? "!!" : "!"
            const [stmt, _] = conditionResult(statement, result, isUnitAware)
            insertOneHurmetVar(vars, stmt, decimalFormat)
          }
        }
        break
      }

      case "if": {
        if (control[level].condition) {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
          if (result.dtype === dt.ERROR) { return result }
          control.push({
            type: "if",
            condition: result.value,
            endOfBlock: statement.endOfBlock
          })
        } else {
          // Skip this block
          i = statement.endOfBlock
        }
        break
      }

      case "else if": {
        if (control[level].type === "if" && control[level].condition) {
          i = control[level].endOfBlock
          control.pop()
        } else {
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
          if (result.dtype === dt.ERROR) { return result }
          control[control.length - 1].condition = result.value
        }
        break
      }

      case "else":
        if (control[level].type === "if" && control[level].condition) {
          i = control[level].endOfBlock
          control.pop()
        } else {
          control[level].condition = true
        }
        break

      case "while": {
        if (control[level].condition) {
          const cntrl = {
            type: "while",
            startStatement: i,
            rpn: statement.rpn,
            endOfBlock: statement.endOfBlock
          }
          const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
          if (result.dtype === dt.ERROR) { return result }
          cntrl.condition = result.value
          if (cntrl.condition === true) {
            control.push(cntrl)
          } else {
            i = statement.endOfBlock
          }
        } else {
          i = statement.endOfBlock
        }
        break
      }

      case "for": {
        const ctrl = {
          type: "for",
          condition: true,
          startStatement: i,
          endOfBlock: statement.endOfBlock
        }
        const tokens = statement.rpn.split("\u00A0")
        tokens.pop() // Discard the "for"
        ctrl.dummyVariable = tokens.shift().slice(1)
        const iterable = evalRpn(tokens.join("\u00A0"), vars, decimalFormat, isUnitAware, lib)
        ctrl.index = (iterable.dtype & dt.RANGE) ? iterable.value[0] : Rnl.fromNumber(0)
        ctrl.step = (iterable.dtype & dt.RANGE) ? iterable.value[1] : Rnl.fromNumber(0)
        ctrl.endIndex = (iterable.dtype & dt.RANGE)
          ? iterable.value[2]
          : Rnl.fromNumber(iterable.value.length - 1)
        const [oprnd, nextIndex] = elementFromIterable(iterable, ctrl.index, ctrl.step)
        ctrl.nextIndex = nextIndex
        ctrl.iterable = iterable
        control.push(ctrl)
        vars[ctrl.dummyVariable] = oprnd
        break
      }

      case "break": {
        if (control[level].condition) {
          // Find the enclosing loop and pop out of it.
          for (let j = control.length - 1; j > 0; j--) {
            if (loopTypes.includes(control[j].type) || j === 0) {
              i = control[j].endOfBlock
              control.pop()
              break
            } else {
              control.pop()
            }
          }
        }
        break
      }

      case "end": {
        // end of code block
        if (control[level].type === "if" && i >= control[level].endOfBlock) {
          control.pop()
        } else if (control[level].type === "if" && control[level].condition) {
          // Jump ahead to end of if block
          if (i < control[level].endOfBlock) { i = control[level].endOfBlock }
          control.pop()
        } else if (control[level].type === "while") {
          const result = evalRpn(control[level].rpn, vars, decimalFormat, isUnitAware, lib)
          if (result.dtype === dt.ERROR) { return result }
          control[level].condition = result.value
          if (control[level].condition) {
            i = control[level].startStatement
          } else {
            control.pop()
          }
        } else if (control[level].type === "for") {
          control[level].index = control[level].nextIndex
          const proceed = Rnl.isRational(control[level].index)
            && Rnl.isPositive(control[level].step)
            ? Rnl.lessThanOrEqualTo(control[level].index, control[level].endIndex)
            : Rnl.isRational(control[level].index)
            ? Rnl.greaterThanOrEqualTo(control[level].index, control[level].endIndex)
            : control[level].index <= control[level].endIndex
          if (proceed) {
            const [oprnd, nextIndex] = elementFromIterable(
              control[level].iterable,
              control[level].index, control[level].step
            )
            vars[control[level].dummyVariable] = oprnd
            control[level].nextIndex = nextIndex
            i = control[level].startStatement
          } else {
            control.pop()
          }
        }
        break
      }

      case "return":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
            return result
          } else {
            return { value: Rnl.zero, unit: allZeros, dtype: dt.RATIONAL }
          }
        }
        break

      case "echo":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
            if (result.dtype === dt.ERROR) { return result }
            const msg = result.dtype === dt.RATIONAL
              ? Rnl.toNumber(result.value)
              : result.dtype === dt.STRING
              ? result.value
              : isVector(result) && (result.dtype & dt.RATIONAL)
              ? result.value.map(e => Rnl.toNumber(e))
              : result.dtype === dt.MATRIX + dt.RATIONAL
              ? result.value.map(row => row.map(e => Rnl.toNumber(e)))
              : result.value
            // eslint-disable-next-line no-console
            console.log(msg)
          }
        }
        break

      case "raise":
        if (control[level].condition) {
          if (statement.rpn) {
            const result = evalRpn(statement.rpn, vars, decimalFormat, isUnitAware, lib)
            return { value: result.value, unit: null, dtype: dt.ERROR }
          } else {
            return { value: statement.rpn, unit: null, dtype: dt.ERROR }
          }
        }
        break

      default:
        // TODO: Error message.
    }
  }
}

const errorResult = (stmt, result) => {
  stmt.value = null
  stmt.resultDisplay = "\\color{firebrick}\\text{" + result.value + "}"
  stmt.altResultDisplay = result.value
  stmt.error = true
  if (stmt.resulttemplate.indexOf("!") > -1) {
    stmt.tex += "= " + stmt.resultDisplay
    stmt.alt += result.value
  } else if (stmt.resulttemplate.indexOf("@") > -1) {
    stmt.tex = stmt.resulttemplate.replace(/@@?/, stmt.resultDisplay)
    stmt.alt = stmt.altresulttemplate.replace(/@@?/, stmt.altResultDisplay)
  } else {
    stmt.tex = stmt.tex.replace(/[?%] *[?%]|[?%]/, stmt.resultDisplay)
    stmt.alt = stmt.alt.replace(/[?%] *[?%]|[?%]/, stmt.altResultDisplay)
  }
  return [stmt, result]
}

const conditionResult = (stmt, oprnd, unitAware) => {
  let result = Object.create(null)
  result.value = clone(oprnd.value)
  result.unit = clone(oprnd.unit)
  result.dtype = oprnd.dtype

  if (result.dtype === dt.COMPLEX && Rnl.isZero(Cpx.im(result.value))) {
    result.value = Cpx.re(result.value)
    result.dtype = 1
  }

  // Check unit compatibility.
  if (result.dtype !== dt.ERROR && unitAware && stmt.resultdisplay.indexOf("!") === -1 &&
    (stmt.expos || (result.unit && result.unit.expos && Array.isArray(result.unit.expos)))) {
    const expos = (stmt.expos) ? stmt.expos : allZeros
    if (!unitsAreCompatible(result.unit.expos, expos)) {
      const message = stmt.expos ? "UNIT_RES" : "UNIT_MISS"
      result = errorOprnd(message)
    }
  }
  if (result.dtype === dt.ERROR) { return errorResult(stmt, result) }

  // Check for a valid display indicator.
  if (stmt.resulttemplate && stmt.resulttemplate.indexOf("!") > -1 &&
    !(result.dtype === dt.DATAFRAME || (result.dtype & dt.MAP) || isMatrix(result)
    || (result.dtype & dt.TUPLE))) {
    return errorResult(stmt, errorOprnd("BAD_DISPLAY"))
  }

  if (result.dtype & dt.RATIONAL) {
    result.value = isVector(result)
      ? result.value.map(e => Rnl.normalize(e))
      : isMatrix(result)
      ? result.value.map(row => row.map(e => Rnl.normalize(e)))
      : result.dtype === dt.RATIONAL
      ? Rnl.normalize(result.value)
      : result.value
  } else if (result.dtype === dt.COMPLEX) {
    result.value = [Rnl.normalize(result.value[0]), Rnl.normalize(result.value[1])]
  }
  stmt.dtype = result.dtype

  // If unit-aware, convert result to desired result units.
  const unitInResultSpec = (stmt.factor && (stmt.factor !== 1 || stmt.gauge))
  if ((result.dtype & dt.DATAFRAME) || stmt.resultdisplay.indexOf("!") > -1) {
    stmt.unit = result.unit
  } else if (unitAware && (result.dtype & dt.RATIONAL)) {
    if (!unitInResultSpec & unitsAreCompatible(result.unit.expos, allZeros)) {
      stmt.factor = Rnl.one; stmt.gauge = Rnl.zero; stmt.expos = allZeros;
    }
    result.value = {
      plain: (isMatrix(result))
        ? Matrix.convertFromBaseUnits(
          { value: result.value, dtype: result.dtype },
          stmt.gauge,
          stmt.factor
          )
        : (result.dtype & dt.MAP)
        ? map.convertFromBaseUnits(result.value, stmt.gauge, stmt.factor)
        : Rnl.subtract(Rnl.divide(result.value, stmt.factor), stmt.gauge),
      inBaseUnits: result.value
    }
    stmt.dtype += dt.QUANTITY
    stmt.expos = result.unit.expos
  } else if (unitInResultSpec) {
    // A non-unit aware calculation, but with a unit attached to the result.
    result.value = {
      plain: result.value,
      inBaseUnits: (isMatrix(result) && (result.dtype & dt.MAP))
        ? mapMap(result.value, val => {
          return val.map(e => Rnl.multiply(Rnl.add(e, stmt.gauge), stmt.factor))
        })
        : (isMatrix(result))
        ? Matrix.convertToBaseUnits(
          { value: result.value, dtype: result.dtype },
          stmt.gauge,
          stmt.factor
          )
        : (result.dtype & dt.MAP)
        ? mapMap(result.value, val => {
          return Rnl.multiply(Rnl.add(val, stmt.gauge), stmt.factor)
        })
        : Rnl.multiply(Rnl.add(result.value, stmt.gauge), stmt.factor)
    }
    stmt.dtype += dt.QUANTITY

  } else if ((result.dtype & dt.RATIONAL) || (result.dtype & dt.COMPLEX) ) {
    // A numeric result with no unit specified.
    stmt.expos = allZeros
  }
  if (result.value)  { stmt.value = result.value }
  return [stmt, result]
}

export const evaluateDrawing = (stmt, vars, decimalFormat = "1,000,000.") => {
  const udf = stmt.value.draw
  const args = [];
  for (let i = 0; i < udf.parameters.length; i++) {
    const argName = udf.parameters[i]
    args.push(evalRpn("¿" + argName, vars, decimalFormat, false, {}))
  }
  const funcResult = evalCustomFunction(udf, args, decimalFormat, false, {})
  if (funcResult.dtype === dt.ERROR) {
    stmt.error = true
    stmt.tex = "\\color{firebrick}\\text{" + funcResult.value + "}"
    stmt.value = null
    stmt.dtype = dt.ERROR
  } else {
    stmt.resultdisplay = funcResult.value
    delete stmt.resultdisplay.temp
  }
  return stmt
}

export const evaluate = (stmt, vars, decimalFormat = "1,000,000.") => {
  stmt.tex = stmt.template
  stmt.alt = stmt.altTemplate
  const isUnitAware = /\?\?|!!|%%|@@|¡¡/.test(stmt.resulttemplate)

  const formatSpec = vars.format ? vars.format.value : "h15"

  if (stmt.tex.indexOf("〖") > -1) {
    // eslint-disable-next-line max-len
    const eqnWithVals = plugValsIntoEcho(stmt.tex, vars, isUnitAware, formatSpec, decimalFormat)
    if (eqnWithVals.dtype && eqnWithVals.dtype === dt.ERROR) {
      const [newStmt, _] = errorResult(stmt, eqnWithVals)
      return newStmt
    } else {
      stmt.tex = eqnWithVals
    }
  }

  if (stmt.rpn) {
    let oprnd = evalRpn(stmt.rpn, vars, decimalFormat, isUnitAware)
    if (oprnd.dtype === dt.ERROR) { [stmt, oprnd] = errorResult(stmt, oprnd); return stmt}
    let result
    [stmt, result] = conditionResult(stmt, oprnd, isUnitAware)
    if (stmt.error) { return stmt }
    stmt = formatResult(stmt, result, formatSpec, decimalFormat, isUnitAware)
  }
  return stmt
}
