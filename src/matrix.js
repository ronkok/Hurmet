import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import { Cpx } from "./complex"
import { clone } from "./utils"
import { format } from "./format"
import { errorOprnd } from "./error"

// Two helper functions
export const isMatrix = oprnd => {
  return (
    (oprnd.dtype & dt.ROWVECTOR) ||
    (oprnd.dtype & dt.COLUMNVECTOR) ||
    (oprnd.dtype & dt.MATRIX)
  )
}
export const isVector = oprnd => {
  return (((oprnd.dtype & dt.ROWVECTOR) || (oprnd.dtype & dt.COLUMNVECTOR)) > 0)
}

const transpose = oprnd => {
  const result = { unit: oprnd.unit }
  if (isVector(oprnd)) {
    result.value = oprnd.value;
    const delta = ((oprnd.dtype & dt.ROWVECTOR) ? 1  : -1 ) * (dt.COLUMNVECTOR - dt.ROWVECTOR)
    result.dtype = oprnd.dtype + delta
  } else if (oprnd.dtype & dt.MATRIX) {
    result.value = oprnd.value[0].map((x, i) => oprnd.value.map(y => y[i]))
    result.dtype = oprnd.dtype
  } else {
    return errorOprnd("BAD_TRANS")
  }
  return result
}

const convertFromBaseUnits = (oprnd, gauge, factor) => {
  let conversion = (isVector(oprnd))
    ? oprnd.value.map((e) => Rnl.divide(e, factor))
    : oprnd.value.map(row => row.map(e => Rnl.divide(e, factor)))
  if (!Rnl.isZero(gauge)) {
    conversion = (isVector(oprnd))
      ? oprnd.value.map((e) => Rnl.subtract(e, gauge))
      : oprnd.value.map(row => row.map(e => Rnl.subtract(e, gauge)))
  }
  return Object.freeze(conversion)
}

const convertToBaseUnits = (oprnd, gauge, factor) => {
  let conversion = clone(oprnd.value)
  if (!Rnl.isZero(gauge)) {
    conversion = (isVector(oprnd))
      ? oprnd.value.map((e) => Rnl.add(e, gauge))
      : oprnd.value.map(row => row.map(e => Rnl.add(e, gauge)))
  }
  conversion = (isVector(oprnd))
    ? conversion.map((e) => Rnl.multiply(e, factor))
    : conversion.map(row => row.map(e => Rnl.multiply(e, factor)))
  return Object.freeze(conversion)
}

const elementDisplay = (value, dtype, formatSpec, decimalFormat, isAlt = false) => {
  let display = value === undefined
    ? ""
    : (dtype & dt.RATIONAL)
    ? format(value, formatSpec, decimalFormat)
    : (dtype & dt.COMPLEX)
    ? Cpx.display(value, formatSpec, decimalFormat)[0]
    : (dtype & dt.BOOLEAN) || (dtype & dt.STRING)
    ? (isAlt ? value : "\\text{" + value + "}")
    : value
  if (isAlt && ((dtype & dt.RATIONAL) || (dtype & dt.COMPLEX))) {
    display = display.replace(/{,}/g, ",")
  }
  return display
}

const display = (m, formatSpec, decimalFormat) => {
  let str = ""
  if (m.dtype & dt.MATRIX) {
    str += "\\begin{pmatrix}"
    const numRows = m.value.length
    const numCols = m.value[0].length
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        str += elementDisplay(m.value[i][j], m.dtype, formatSpec, decimalFormat) + " &"
      }
      str = str.slice(0, -1) + " \\\\ "
    }
    str = str.slice(0, -3).trim()
    str += "\\end{pmatrix}"
  } else {
    const numArgs = m.value.plain ? m.value.plain.length : m.value.length
    if (numArgs === 0) {
      str += "[\\,]"
    } else {
      str += "\\begin{bmatrix}"
      const argSep = (m.dtype & dt.ROWVECTOR) ? " & " : " \\\\ "
      if (m.value.plain) {
        for (let i = 0; i < numArgs; i++) {
          str += elementDisplay(m.value.plain[i], m.dtype, formatSpec, decimalFormat) +
                ((i < numArgs - 1) ? argSep : "")
        }
      } else {
        for (let i = 0; i < numArgs; i++) {
          str += elementDisplay(m.value[i], m.dtype, formatSpec, decimalFormat) +
                ((i < numArgs - 1) ? argSep : "")
        }
      }
      str += "\\end{bmatrix}"
    }
  }
  return str
}

const displayAlt = (m, formatSpec, decimalFormat) => {
  let str = ""
  if (m.dtype & dt.MATRIX) {
    str += "("
    const numRows = m.value.length
    const numCols = m.value[0].length
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        str += elementDisplay(m.value[i][j], m.dtype, formatSpec, decimalFormat, true) + ", "
      }
      str = str.slice(0, -2) + "; "
    }
    str = str.slice(0, -2).trim()
    str += ")"
  } else {
    str += "["
    const argSep = (m.dtype & dt.ROWVECTOR) ? ", " : "; "
    if (m.value.plain) {
      const numArgs = m.value.plain.length
      for (let i = 0; i < numArgs; i++) {
        str += elementDisplay(m.value.plain[i], m.dtype, formatSpec, decimalFormat, true) +
           ((i < numArgs - 1) ? argSep : "")
      }
    } else {
      const numArgs = m.value.length
      for (let i = 0; i < numArgs; i++) {
        str += elementDisplay(m.value[i], m.dtype, formatSpec, decimalFormat, true) +
               ((i < numArgs - 1) ? argSep : "")
      }
    }
    str += "]"
  }
  return str
}

const findfirst = (el, array) => {
  if (!isVector(array)) { return errorOprnd("NOT_VECTOR", "findfirst") }
  const isNumeric = Rnl.isRational(el)
  for (let i = 0; i < array.value.length; i++) {
    const val = array.value[i]
    if ((isNumeric & Rnl.areEqual(val, el)) || val === el ) {
      return Rnl.fromNumber(i + 1)
    }
  }
  return Rnl.zero
}

const identity = (num, mutable) => {
  const n = Rnl.isRational(num) ? Rnl.toNumber(num) : num
  if (n === 1) {
    return  [Rnl.one]
  } else {
    const M = []
    for (let i = 0; i < n; i++) {
      M.push(new Array(n).fill(Rnl.zero))
      M[i][i] = Rnl.one
    }
    return mutable ? M : Object.freeze(M)
  }
}

const invert = (matrix, returnDeterminant) => {
  // Invert a square matrix via Gaussian elimination.
  // A lightly editied copy of http://blog.acipo.com/matrix-inversion-in-javascript/

  if (matrix.length !== matrix[0].length) {
    return errorOprnd("NONSQUARE")
  }
  const dim = matrix.length
  let i = 0
  let ii = 0
  let j = 0
  let temp = Rnl.zero
  let determinant = Rnl.one

  const C = clone(matrix)
  const I = identity(dim, true)

  for (i = 0; i < dim; i += 1) {
    // get the element temp on the diagonal
    temp = C[i][i]

    // if we have a 0 on the diagonal (we'll need to swap with a lower row)
    if (Rnl.isZero(temp)) {
      //look through every row below the i'th row
      for (ii = i + 1; ii < dim; ii++) {
        //if the ii'th row has a non-0 in the i'th col
        if (!Rnl.isZero(C[ii][i])) {
          //it would make the diagonal have a non-0 so swap it
          for (j = 0; j < dim; j++) {
            temp = C[i][j]     // temp store i'th row
            C[i][j] = C[ii][j] // replace i'th row by ii'th
            C[ii][j] = temp    // repace ii'th by temp
            temp = I[i][j]     // temp store i'th row
            I[i][j] = I[ii][j] // replace i'th row by ii'th
            I[ii][j] = temp    // repace ii'th by temp
          }
          //don't bother checking other rows since we've swapped
          break
        }
      }
      //get the new diagonal
      temp = C[i][i]
      //if it's still 0, not invertable (error)
      if (Rnl.isZero(temp)) { return errorOprnd("SINGULAR") }
    }

    if (returnDeterminant) {
      determinant = Rnl.divide(determinant, temp)
      if (i === dim - 1) {
        return determinant
      }
    }

    // Scale this row down by temp (so we have a 1 on the diagonal)
    for (j = 0; j < dim; j++) {
      C[i][j] = Rnl.divide(C[i][j], temp) //apply to original matrix
      I[i][j] = Rnl.divide(I[i][j], temp) //apply to identity
    }

    // Subtract this row (scaled appropriately for each row) from ALL of
    // the other rows so that there will be 0's in this column in the
    // rows above and below this one
    for (ii = 0; ii < dim; ii++) {
      // Only apply to other rows (we want a 1 on the diagonal)
      if (ii === i) { continue }

      // We want to change this element to 0
      temp = C[ii][i]

      // Subtract (the row above(or below) scaled by temp) from (the
      // current row) but start at the i'th column and assume all the
      // stuff left of diagonal is 0 (which it should be if we made this
      // algorithm correctly)
      for (j = 0; j < dim; j++) {
        C[ii][j] = Rnl.subtract(C[ii][j], Rnl.multiply(temp, C[i][j])) // original matrix
        I[ii][j] = Rnl.subtract(I[ii][j], Rnl.multiply(temp, I[i][j])) // identity
      }
    }
  }

  // We've finished. C should be the identity matrix.
  // Matrix I should be the inverse.
  return Object.freeze(I)
}


const submatrix = (oprnd, index, colIndex) => {
  if (!((index.dtype & dt.RATIONAL) || (index.dtype & dt.RANGE))) {
    return errorOprnd("BAD_INDEX")
  }
  let value = []
  let dtype = oprnd.dtype

  // Get the row index
  let start = 0
  let step = 1
  let end = 0
  if (index.dtype & dt.RANGE) {
    start = Rnl.toNumber(index.value[0])
    step = Rnl.toNumber(index.value[1])
    end = index.value[2] === "∞"
      ? oprnd.value.length
      : Rnl.toNumber(index.value[2])
  } else if (Rnl.areEqual(index.value, Rnl.zero)) {
    // Return all the rows
    start = 1
    end = oprnd.value.length
  } else {
    start = Rnl.toNumber(index.value)
    end = start
  }

  if (isVector(oprnd)) {
    // Skip the column index. Proceed directly to load values into the result.
    if (start === end) {
      // return a scalar
      value = oprnd.value[start - 1]
      dtype = oprnd.dtype - (oprnd.dtype & dt.ROWVECTOR) -
        (oprnd.dtype & dt.COLUMNVECTOR)
    } else if (step === 1) {
      value = oprnd.value.slice(start - 1, end)
    } else {
      for (let i = start - 1; i < end; i += step) {
        value.push(oprnd.value[i])
      }
    }
    Object.freeze(value)
    return Object.freeze({ value, unit: oprnd.unit, dtype })
  }

  // Get the column index
  let colStart = 0
  let colStep = 1
  let colEnd = 0
  if (colIndex) {
    if (colIndex.dtype & dt.RANGE) {
      colStart = Rnl.toNumber(colIndex.value[0])
      colStep = Rnl.toNumber(colIndex.value[1])
      colEnd = colIndex.value[2] === "∞"
        ? oprnd.value[0].length
        : Rnl.toNumber(colIndex.value[2])
    } else if (Rnl.areEqual(colIndex.value, Rnl.zero)) {
      // Return an entire row.
      colStart = 1
      colEnd = oprnd.value[0].length
    } else {
      colStart = Rnl.toNumber(colIndex.value)
      colEnd = colStart
    }
  }

  // Now load values into the result
  if (start === end && colStart === colEnd) {
    // return a scalar
    value = oprnd.value[start - 1][colStart - 1]
    dtype -= dt.MATRIX

  } else if (start === end) {
    // return a row vector
    if (colStep === 1) {
      value = oprnd.value[start - 1].slice(colStart - 1, colEnd)
    } else {
      for (let j = colStart - 1; j < colEnd; j += colStep) {
        value.push(oprnd.value[start - 1][j])
      }
    }
    dtype = dtype - dt.MATRIX + dt.ROWVECTOR

  } else if (colStart === colEnd) {
    // return a column vector
    for (let i = start - 1; i < end; i += step) {
      value.push(oprnd.value[i][colStart - 1])
    }
    dtype = dtype - dt.MATRIX + dt.COLUMNVECTOR

  } else if (colStep === 1) {
    for (let i = start - 1; i < end; i += step) {
      value.push([])
      value[value.length - 1] = oprnd.value[i].slice(colStart - 1, colEnd)
    }

  } else {
    for (let i = start - 1; i < end; i += step) {
      value.push([])
      for (let j = colStart - 1; j < colEnd; j += colStep) {
        value[value.length - 1].push(oprnd[i][j])
      }
    }
  }
  Object.freeze(value)
  return Object.freeze({ value, unit: oprnd.unit, dtype })
}

const multResultType = (o1, o2) => {
  // o1 and o2 are to undergo matrix multiplication.
  // The value is found elsewhere.
  // Here we find the resulting data type.
  if ((o1.dtype & dt.ROWVECTOR) && (o2.dtype & dt.COLUMNVECTOR)) {
    return dt.RATIONAL
  } else if ((o1.dtype & dt.MATRIX) && (o2.dtype & dt.COLUMNVECTOR)) {
    return o2.dtype
  } else if ((o1.dtype & dt.ROWVECTOR) && (o2.dtype & dt.MATRIX)) {
    return o1.dtype
  } else {
    return dt.MATRIX + dt.RATIONAL
  }
}

const operandFromRange = range => {
  // Input was [start:step:end...]
  // Populate a vector with values from a range
  const array = []
  if (Rnl.greaterThan(range[2], range[0])) {
    for (let j = range[0]; Rnl.lessThan(j, range[2]); j = Rnl.add(j, range[1])) {
      array.push(j)
    }
  } else {
    for (let j = range[0]; Rnl.greaterThanOrEqualTo(j, range[2]);
        j = Rnl.add(j, range[1])) {
      array.push(j)
    }
  }
  if (!Rnl.areEqual(array[array.length - 1], range[2])) {
    array.push(range[2])
  }
  Object.freeze(array)
  return Object.freeze({
    value: array,
    unit: { expos: allZeros },
    dtype: dt.RATIONAL + dt.COLUMNVECTOR
  })
}

const operandFromTokenStack = (tokenStack, numRows, numCols) => {
  // TODO: Get dtype correct for matrices that contain strings or booleans.
  if (numRows === 0 && numCols === 0) {
    return Object.freeze({ value: new Array(0), unit: null, dtype: dt.COLUMNVECTOR })
  } else if (numRows === 1 && numCols === 1) {
    // One element. Return a scalar.
    return tokenStack.pop()

  } else if (numRows === 1 || numCols === 1) {
    const numArgs = Math.max(numRows, numCols)
    let array
    let dtype = tokenStack[tokenStack.length - 1].dtype
    if (numRows === 1 && (dtype & dt.COLUMNVECTOR)) {
      // Matrix composed of column vectors appended side by side
      dtype = dtype - dt.COLUMNVECTOR + dt.MATRIX
      array = new Array(tokenStack[0].value.length)
      for (let i = 0; i < tokenStack[0].value.length; i++) {
        array[i] = []
        for (let j = 0; j < numArgs; j++) {
          array[i][j] = tokenStack[j].value[i]
        }
      }
      for (let i = 0; i < numArgs; i++) { tokenStack.pop() }
    } else  {
      // Vector
      array = new Array(numArgs)
      dtype += numRows === 1 ? dt.ROWVECTOR : dt.COLUMNVECTOR
      for (let j = numArgs - 1; j >= 0; j--) {
        array[j] = tokenStack.pop().value
      }
    }
    Object.freeze((array))
    return Object.freeze({
      value: array,
      unit: (dtype & dt.RATIONAL) ? { expos: allZeros } : null,
      dtype
    })

  } else {
    // 2D matrix
    const array = new Array(numRows)
    const dtype = tokenStack[tokenStack.length - 1].dtype + dt.MATRIX
    for (let j = 0; j < numRows; j++) {
      array[j] = new Array(numCols)
    }
    for (let k = numRows - 1; k >= 0; k--) {
      for (let j = numCols - 1; j >= 0; j--) {
        array[k][j] =  tokenStack.pop().value
      }
    }
    Object.freeze((array))
    return Object.freeze({
      value: array,
      unit: (dtype & dt.RATIONAL) ? { expos: allZeros } : null,
      dtype
    })
  }
}

const ones = (m, n) => {
  if (m === 1 || n === 1) {
    return {
      value: new Array(n).fill(Rnl.one),
      unit: allZeros,
      dtype: dt.RATIONAL + (m === 1 ? dt.ROWVECTOR : dt.COLUMNVECTOR)
    }
  } else {
    const value = []
    for (let i = 0; i < m; i++) {
      value.push(new Array(n).fill(Rnl.one))
    }
    Object.freeze(value)
    return Object.freeze({
      value: value,
      unit: { expos: allZeros },
      dtype: dt.RATIONAL + dt.MATRIX
    })
  }
}

const zeros = (m, n) => {
  if (m === 1 || n === 1) {
    return {
      value: new Array(n).fill(Rnl.zero),
      unit: allZeros,
      dtype: dt.RATIONAL + (m === 1 ? dt.ROWVECTOR : dt.COLUMNVECTOR)
    }
  } else {
    const value = []
    for (let i = 0; i < m; i++) {
      value.push(new Array(n).fill(Rnl.zero))
    }
    Object.freeze(value)
    return Object.freeze({
      value: value,
      unit: { expos: allZeros },
      dtype: dt.RATIONAL + dt.MATRIX
    })
  }
}

export const Matrix = Object.freeze({
  convertFromBaseUnits,
  convertToBaseUnits,
  display,
  displayAlt,
  elementDisplay,
  findfirst,
  identity,
  invert,
  multResultType,
  ones,
  operandFromRange,
  operandFromTokenStack,
  submatrix,
  transpose,
  zeros
})
