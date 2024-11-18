import { dt } from "./constants"
import { errorOprnd } from "./error"
import { Rnl } from "./rational"
import { Cpx } from "./complex"
import { Matrix } from "./matrix"
import { compare } from "./compare"

// Hurmet math operators are overloaded to handle operands of various shapes.
// Those shapes being scalars, vectors, matrices, and maps.
// This file implements the overloading.

// Some helper functions
const dotProduct = (a, b) => {
  return a.map((e, j) => Rnl.multiply(e, b[j])).reduce((m, n) => Rnl.add(m, n))
}
const sumOfSquares = vector => {
  return vector.map((e) => Rnl.multiply(e, e)).reduce((m, n) => Rnl.add(m, n))
}
const oneTenth = [BigInt(1), BigInt(100)]

// From the object below, calculations.js will call operators using statements
// that look like this:
// resultValue = Operations.unary[shape][operator](inputValue)

const unary = {
  scalar: {
    abs(x)       { return Rnl.abs(x) },
    norm(x)      { return Rnl.abs(x) },
    negate(x)    { return Rnl.negate(x) },
    exp(x)       { return Rnl.exp(x) },
    floor(x)     { return Rnl.floor(x) },
    ceil(x)      { return Rnl.ceil(x) },
    percent(x)   { return Rnl.multiply(oneTenth, x) },
    factorial(x) { return Rnl.factorial(x) },
    doubleFactorial(x) { return Rnl.doubleFactorial(x) },
    not(x)       { return !x }
  },

  complex: {
    abs(z)       { return Cpx.abs(z) },
    norm(z)      { return Cpx.abs(z) },
    conjugate(z) { return Cpx.conjugate(z) },
    negate(z)    { return Cpx.negate(z) },
    exp(z)       { return Cpx.exp(z) },
    floor(z)     { return errorOprnd("NA_COMPL_OP", "floor") },
    ceil(z)      { return errorOprnd("NA_COMPL_OP", "ceil") },
    percent(z)   { return errorOprnd("NA_COMPL_OP", "percent") },
    factorial(z) { return errorOprnd("NA_COMPL_OP", "factorial") },
    doubleFactorial(z) { return errorOprnd("NA_COMPL_OP", "factorial") },
    not(z)       { return errorOprnd("NA_COMPL_OP", "not") }
  },

  vector: {
    abs(v)       { return Rnl.sqrt(sumOfSquares(v)) },   // magnitude of a vector
    norm(v)      { return Rnl.sqrt(sumOfSquares(v)) },   // ditto
    negate(v)    { return v.map(e => Rnl.negate(e)) },
    exp(v)       { return v.map(e => Rnl.exp(e)) },
    floor(v)     { return v.map(e => Rnl.floor(e)) },
    ceil(v)      { return v.map(e => Rnl.ceil(e)) },
    percent(v)   { return v.map(e => Rnl.multiply(oneTenth, e)) },
    factorial(v) { return v.map(e => Rnl.factorial(e)) },
    doubleFactorial(v) { return v.map(e => Rnl.doubleFactorial(e)) },
    not(v)       { return v.map(e => !e) }
  },

  matrix: {
    abs(m) { return Matrix.invert(m, true) },
    norm(m) {
      if (m.length === m[0].length) {
        let sum = Rnl.zero
        for (let i = 0; i < m.length; i++) {
          sum = Rnl.add(sum, sumOfSquares(m[i]))
        }
        return sum.sqrt()
      } else {
        // TODO: ||matrix|| when matrix is not square.
      }
    },
    negate(m)    { return m.map(row => row.map(e => Rnl.negate(e))) },
    exp(m)       { return m.map(row => row.map(e => Rnl.exp(e))) },
    floor(m)     { return m.map(row => row.map(e => Rnl.floor(e))) },
    ceil(m)      { return m.map(row => row.map(e => Rnl.ceil(e))) },
    percent(m)   { return m.map(row => row.map(e => Rnl.multiply(oneTenth, e))) },
    factorial(m) { return m.map(row => row.map(e => Rnl.factorial(e))) },
    doubleFactorial(m) { return m.map(row => row.map(e => Rnl.doubleFactorial(e))) },
    not(m)       { return m.map(row => row.map(e => !e)) }
  },

  map: {
    abs(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
      ? column.map(e => Rnl.abs(e))
      : column
    )
      return map
    },
    negate(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
      ? column.map(e => Rnl.negate(e))
      : column
    )
      return map
    },
    exp(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.exp(e))
        : column
      )
      return map
    },
    floor(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.floor(e))
        : column
      )
      return map
    },
    ceil(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.ceil(e))
        : column)
      return map
    },
    percent(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.multiply(oneTenth, e))
        : column
      )
      return map
    },
    factorial(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.factorial(e))
        : column
      )
      return map
    },
    doubleFactorial(map) {
      map.data = map.data.map(column => Rnl.isRational(column[0])
        ? column.map(e => Rnl.doubleFactorial(e))
        : column
      )
      return map
    },
    not(map) {
      map.data = map.data.map(column => typeof column[0] === "boolean"
       ? column.map(e => !e)
       : column
      )
      return map
    }
  }
}

const condition = {
  // Deal with booleans. Return a single value, true or false.
  // If a vector or matrix is received, all elements must be
  // true in order to return a true. Otherwise return a false.
  scalar(x) { return x },
  vector(v) { return v.reduce((prev, curr) => prev && curr, true) },
  matrix(m) {
    const row = new Array(m.length)
    for (let i = 0; i < m.length; i++) {
      row[i] = m[i].reduce((prev, curr) => prev && curr, true)
    }
    return row.reduce((prev, curr) => prev && curr, true)
  }
}

const dtype = {
  // Given the shapes which are operands to a binary operator,
  // return the resulting data type.
  scalar: {
    scalar(t0, t1, tkn)     {
      return (tkn === "&" || tkn === "hcat" || tkn === "vcat")
        ? t0 + ((tkn === "&" || tkn === "hcat") ? dt.ROWVECTOR : dt.COLUMNVECTOR )
        : t0
    },
    complex(t0, t1, tkn)    { return t1 },
    vector(t0, t1, tkn)     { return t1 },
    matrix(t0, t1, tkn)     { return t1 },
    dataFrame(t0, t1, tkn)  { return t1 },
    map(t0, t1, tkn)        { return t1 }
  },
  complex: {
    scalar(t0, t1, tkn)  { return t0 },
    complex(t0, t1, tkn) { return t0 }
  },
  vector: {
    scalar(t0, t1, tkn) { return t0 },
    map(t0, t1, tkn)    { return t1 + (t0 & dt.ROWVECTOR) + (t0 & dt.COLUMNVECTOR) }
  },
  rowVector: {
    rowVector(t0, t1, tkn) { return tkn === "vcat" ? t0 - dt.ROWVECTOR + dt.MATRIX : t0 },
    columnVector(t0, t1, tkn) { return t0 },
    matrix(t0, t1, tkn) { return tkn === "multiply" ? t0 : t1 }
  },
  columnVector: {
    rowVector(t0, t1, op) {
      return op === "dot"
      ? dt.RATIONAL
      : op === "cross"
      ? t0
      : t0 - dt.COLUMNVECTOR + dt.MATRIX
    },
    columnVector(t0, t1, tkn) {
      return tkn === "&" || tkn === "hcat"
        ? t0 - dt.COLUMNVECTOR + dt.MATRIX
        : t0
    },
    matrix(t0, t1, tkn) { return t1 }
  },
  matrix: {
    scalar(t0, t1, tkn) { return t0 },
    rowVector(t0, t1, tkn) { return t0 },
    columnVector(t0, t1, tkn) { return tkn === "*" || tkn === "⌧" ? t1 : t0 },
    matrix(t0, t1, tkn) { return t0 },
    map(t0, t1, tkn)    { return 0 }
  },
  dataFrame: {
    scalar(t0, t1, tkn) { return t0 }
  },
  map: {
    scalar(t0, t1, tkn) { return t0 },
    vector(t0, t1, tkn) { return t0 },
    matrix(t0, t1, tkn) { return 0 },
    map(t0, t1, tkn)    { return t0 }
  }
}


// The binary operators below are called like this:
// resultValue = Operations.binary[shape_0][shape_1][operator](input_0, input_1)

const binary = {
  scalar: {
    scalar: {
      // Binary operations on two scalars
      add(x, y)      { return Rnl.add(x, y) },
      subtract(x, y) { return Rnl.subtract(x, y) },
      multiply(x, y) { return Rnl.multiply(x, y) },
      divide(x, y)   { return Rnl.divide(x, y) },
      power(x, y)    {
        // eslint-disable-next-line max-len
        return Cpx.isComplex(x) || (Rnl.isNegative(x) && Rnl.isPositive(y) && Rnl.lessThan(y, Rnl.one))
          ? Cpx.power([x, Rnl.zero], y)
          : Rnl.power(x, y)
      },
      modulo(x, y)   { return Rnl.mod(x, y) },
      hypot(x, y)    { return Rnl.hypot(x, y) },
      rem(x, y)      { return Rnl.rem(x, y) },
      and(x, y)      { return x && y },
      or(x, y)       { return x || y },
      xor(x, y)      { return x !== y },
      concat(x, y)   { return [x, y] },
      unshift(x, y)  { return [x, y] }
    },
    complex: {
      add(x, z)      { return [Rnl.add(x, z[0]), z[1]] },
      subtract(x, z) { return [Rnl.subtract(x, z[0]), Rnl.negate(z[1])] },
      multiply(x, z) { return [Rnl.multiply(x, z[0]), Rnl.multiply(x, z[1])] },
      divide(x, z)   { return Cpx.divide([x, Rnl.zero], z) },
      power(x, z)    { return Cpx.power([x, Rnl.zero], z) },
      rem(x, z)      { return errorOprnd("NA_COMPL_OP", "rem") },
      and(x, z)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(x, z)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(x, z)      { return errorOprnd("NA_COMPL_OP", "xor") }
    },
    vector: {
      // Binary operations with a scalar and a vector.
      // Perform element-wise operations.
      add(x, v)      { return v.map(e => Rnl.add(x, e)) },
      subtract(x, v) { return v.map(e => Rnl.subtract(x, e)) },
      multiply(x, v) { return v.map(e => Rnl.multiply(x, e)) },
      divide(x, v)   { return v.map(e => Rnl.divide(x, e)) },
      power(x, v)    { return v.map(e => Rnl.power(x, e)) },
      modulo(x, v)   { return v.map(e => Rnl.mod(x, e)) },
      rem(x, v)      { return v.map(e => Rnl.rem(x, e)) },
      and(x, v)      { return v.map(e => x && e) },
      or(x, v)       { return v.map(e => x || e) },
      xor(x, v)      { return v.map(e => x !== e) },
      concat(x, v)   { return [x, ...v] }
    },
    matrix: {
      // Binary operations with a scalar and a matrix.
      // Perform element-wise operations.
      add(x, m)      { return m.map(row => row.map(e => Rnl.add(x, e))) },
      subtract(x, m) { return m.map(row => row.map(e => Rnl.subtract(x, e))) },
      multiply(x, m) { return m.map(row => row.map(e => Rnl.multiply(x, e))) },
      divide(x, m)   { return m.map(row => row.map(e => Rnl.divide(x, e))) },
      power(x, m)    { return m.map(row => row.map(e => Rnl.power(x, e))) },
      modulo(x, m)   { return m.map(row => row.map(e => Rnl.mod(x, e))) },
      rem(x, m)      { return m.map(row => row.map(e => Rnl.rem(x, e))) },
      and(x, m)      { return m.map(row => row.map(e => x && e)) },
      or(x, m)       { return m.map(row => row.map(e => x || e)) },
      xor(x, m)      { return m.map(row => row.map(e => x !== e)) },
      concat(x, m)   { return errorOprnd("BAD_CONCAT") }
    },
    dataFrame: {
      multiply(x, df) {
        df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
          let L = e.length
          if (e.indexOf(".")) { L -= 1 }
          return Rnl.toStringSignificant(Rnl.multiply(x, Rnl.fromString(e)), L)
        }))
        return df
      },
      divide(x, df) {
        df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
          let L = e.length
          if (e.indexOf(".")) { L -= 1 }
          return Rnl.toStringSignificant(Rnl.divide(x, Rnl.fromString(e)), L)
        }))
        return df
      }
    },
    map: {
      // Binary operations with a scalar and a map.
      // Perform element-wise operations.
      add(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.add(scalar, e))
          : col
        )
        return map
      },
      subtract(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.subtract(scalar, e))
          : col
        )
        return map
      },
      multiply(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.multiply(scalar, e))
          : col
        )
        return map
      },
      divide(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.divide(scalar, e))
          : col
        )
        return map
      },
      power(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.power(scalar, e))
          : col
        )
        return map
      },
      modulo(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.mod(scalar, e))
          : col
        )
        return map
      },
      rem(scalar, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.rem(scalar, e))
          : col
        )
        return map
      },
      and(scalar, map) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map(e => scalar && e)
          : col
        )
        return map
      },
      or(scalar, map) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map(e => scalar || e)
          : col
        )
        return map
      },
      xor(scalar, map) {
        map.data =  map.data.map(col =>  typeof col[0] === "boolean"
          ? col.map(e => scalar !== e)
          : col
        )
        return map
      }
    }
  },

  complex: {
    scalar: {
      add(z, y)      { return [Rnl.add(z[0], y), z[1]] },
      subtract(z, y) { return [Rnl.subtract(z[0], y), z[1]] },
      multiply(z, y) { return [Rnl.multiply(z[0], y), Rnl.multiply(z[1], y) ] },
      divide(z, y)   { return Cpx.divide(z, [y, Rnl.zero]) },
      power(z, y)    { return Cpx.power(z, [y, Rnl.zero]) },
      rem(z, y)      { return errorOprnd("NA_COMPL_OP", "rem") },
      and(z, y)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(z, y)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(z, y)      { return errorOprnd("NA_COMPL_OP", "xor") }
    },
    complex: {
      add(x, y)      { return [Rnl.add(x[0], y[0]), Rnl.add(x[1], y[1])] },
      subtract(x, y) { return [Rnl.subtract(x[0], y[0]), Rnl.subtract(x[1], y[1])] },
      multiply(x, y) { return Cpx.multiply(x, y) },
      divide(x, y)   { return Cpx.divide(x, y) },
      power(x, y)    { return Cpx.power(x, y) },
      rem(x, y)      { return errorOprnd("NA_COMPL_OP", "rem") },
      and(x, y)      { return errorOprnd("NA_COMPL_OP", "and") },
      or(x, y)       { return errorOprnd("NA_COMPL_OP", "or") },
      xor(x, y)      { return errorOprnd("NA_COMPL_OP", "xor") }

    }
  },

  vector: {
    scalar: {
      // Binary operations with a vector and a scalar.
      // Perform element-wise operations.
      add(v, x)      { return v.map(e => Rnl.add(e, x)) },
      subtract(v, x) { return v.map(e => Rnl.subtract(e, x)) },
      multiply(v, x) { return v.map(e => Rnl.multiply(e, x)) },
      divide(v, x)   { return v.map(e => Rnl.divide(e, x)) },
      power(v, x)    { return v.map(e => Rnl.power(e, x)) },
      modulo(v, x)   { return v.map(e => Rnl.mod(e, x)) },
      rem(v, x)      { return v.map(e => Rnl.rem(e, x)) },
      and(v, x)      { return v.map(e => e && x) },
      or(v, x)       { return v.map(e => e || x) },
      xor(v, x)      { return v.map(e => e !== x) },
      concat(v, x)   { return [...v, x]}
    }
  },

  rowVector: {
    rowVector: {
      // Binary operations on two row vectors.
      add(x, y) {
        // element-wise addition
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.add(e, y[i]))
      },
      subtract(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.subtract(e, y[i]))
      },
      divide(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.divide(e, y[i]))
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero]
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]))
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]))
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
        return v
      },
      multiply(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.multiply(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      circ(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.power(e, y[i]))
      },
      modulo(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.mod(e, y[i]))
      },
      and(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e && y[i])
      },
      or(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e || y[i])
      },
      xor(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e !== y[i])
      },
      concat(x, y) { return x.concat(y) },
      unshift(x, y) { return [x, y] }
    },
    columnVector: {
      // Binary operations on a row vector and a column vector.
      // Except for multiplication, these work only if both vectors have only one element.
      add(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.add(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      subtract(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.subtract(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero]
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]))
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]))
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
        return v
      },
      multiply(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      circ(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.mod(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      and(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] && y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      or(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] || y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      xor(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] !== y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      concat(x, y)  { return "BAD_CONCAT" },
      unshift(x, y) { return "BAD_CONCAT" }
    },
    matrix: {
      // Binary operations on a row vector and a 2-D matrix.
      add(v, m) {
        // Add the row vector to each row in the matrix
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.add(v[i], e)))
      },
      subtract(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.subtract(v[i], e)))
      },
      multiply(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        m = m[0].map((x, i) => m.map(y => y[i])) // Transpose m
        return m.map(row => dotProduct(v, row))
      },
      circ(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.multiply(v[i], e)))
      },
      divide(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.divide(v[i], e)))
      },
      power(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.power(v[i], e)))
      },
      modulo(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => row.map((e, i) => Rnl.mod(v[i], e)))
      },
      concat(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("BAD_CONCAT") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("BAD_CONCAT") }
        return [v, ...m]
      }
    }
  },

  columnVector: {
    rowVector: {
      // Binary operations on a column vector and a row vector.
      // Except for multiplication, these work only if both vectors have only one element.
      add(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.add(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      subtract(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.subtract(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero]
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]))
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]))
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
        return v
      },
      multiply(x, y) {
        if (x[0].length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map(row => y.map(e => Rnl.multiply(row, e)))
      },
      divide(x, y) {
        return x.map(m => y.map(e => Rnl.divide(m, e)))
      },
      circ(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.mod(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      and(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] && y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      or(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] || y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      xor(x, y) {
        if (x.length === 1 && y.length === 1) { return [x[0] !== y[0]] }
        return errorOprnd("MIS_ELNUM")
      },
      concat(x, y)  { return "BAD_CONCAT" },
      unshift(x, y) { return "BAD_CONCAT" }
    },
    columnVector: {
      // Binary operations on two column vectors.
      add(x, y) {
        // element-wise addition
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.add(e, y[i]))
      },
      subtract(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.subtract(e, y[i]))
      },
      divide(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.divide(e, y[i]))
      },
      dot(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      cross(x, y) {
        if (x.length !== 3 || y.length !== 3) { return errorOprnd("CROSS") }
        const v = [Rnl.zero, Rnl.zero, Rnl.zero]
        v[0] = Rnl.subtract(Rnl.multiply(x[1], y[2]), Rnl.multiply(x[2], y[1]))
        v[1] = Rnl.subtract(Rnl.multiply(x[2], y[0]), Rnl.multiply(x[0], y[2]))
        v[2] = Rnl.subtract(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
        return v
      },
      multiply(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.multiply(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      circ(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.power(e, y[i]))
      },
      modulo(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.mod(e, y[i]))
      },
      rem(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.rem(e, y[i]))
      },
      and(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e && y[i])
      },
      or(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e || y[i])
      },
      xor(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => e !== y[i])
      },
      concat(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => [e, y[i]])
      },
      unshift(x, y) { return x.concat(y) }
    },
    matrix: {
      // Binary operations on a column vector and a 2-D matrix.
      add(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.add(v[i], e)))
      },
      subtract(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.subtract(v[i], e)))
      },
      multiply(v, m) {
        if (m.length !== 1) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.multiply(v[i], e)))
      },
      circ(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.multiply(v[i], e)))
      },
      divide(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.divide(v[i], e)))
      },
      power(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.power(v[i], e)))
      },
      mod(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => row.map(e => Rnl.mod(v[i], e)))
      },
      concat(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(x, y) { return "BAD_CONCAT" }
    },
    map: {
      // Binary operations between a column vector and a map
      add(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.add(vector[i], e))
          : col
        )
        return map
      },
      subtract(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.subtract(vector[i], e))
          : col
        )
        return map
      },
      multiply(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.multiply(vector[i], e))
          : col
        )
        return map
      },
      divide(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.divide(vector[i], e))
          : col
        )
        return map
      },
      power(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.power(vector[i], e))
          : col
        )
        return map
      },
      modulo(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.mod(vector[i], e))
          : col
        )
        return map
      },
      rem(vector, map) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.rem(vector[i], e))
          : col
        )
        return map
      },
      and(vector, map) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => vector[i] && e)
          : col
        )
        return map
      },
      or(vector, map) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => vector[i] || e)
          : col
        )
        return map
      },
      xor(vector, map) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => vector[i] !== e)
          : col
        )
        return map
      }
    }
  },

  matrix: {
    scalar: {
      // Binary operations with a matrix and a scalar.
      // Perform element-wise operations.
      add(m, x)      { return m.map(row => row.map(e => Rnl.add(e, x))) },
      subtract(m, x) { return m.map(row => row.map(e => Rnl.subtract(e, x))) },
      multiply(m, x) { return m.map(row => row.map(e => Rnl.multiply(e, x))) },
      divide(m, x)   { return m.map(row => row.map(e => Rnl.divide(e, x))) },
      power(m, x)    {
        if (m.length === m[0].length && Rnl.areEqual(x, [BigInt(-1), BigInt(1)])) {
          return Matrix.invert(m)
        }
        return m.map(row => row.map(e => Rnl.power(e, x)))
      },
      modulo(m, x) { return m.map(row => row.map(e => Rnl.mod(e, x))) },
      rem(m, x)    { return m.map(row => row.map(e => Rnl.rem(e, x))) }
    },
    rowVector: {
      add(m, v)      { return m.map(row => row.map((e, i) => Rnl.add(e, v[i]) )) },
      subtract(m, v) { return m.map(row => row.map((e, i) => Rnl.subtract(e, v[i]) )) },
      multiply(m, v) { return m.map(row => row.map((e, i) => Rnl.multiply(e, v[i]) )) },
      circ(m, v) { return m.map(row => row.map((e, i) => Rnl.multiply(e, v[i]) )) },
      divide(m, v)   { return m.map(row => row.map((e, i) => Rnl.divide(e, v[i]) )) },
      power(m, v)    { return m.map(row => row.map((e, i) => Rnl.power(e, v[i]) )) },
      modulo(m, v)   { return m.map(row => row.map((e, i) => Rnl.mod(e, v[i]) )) },
      rem(m, v)      { return m.map(row => row.map((e, i) => Rnl.rem(e, v[i]) )) },
      unshift(m, v) {
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return [...m, v]
      }
    },
    columnVector: {
      add(m, v)      { return m.map((row, i) => row.map(e => Rnl.add(e, v[i]) )) },
      subtract(m, v) { return m.map((row, i) => row.map(e => Rnl.subtract(e, v[i]) )) },
      multiply(m, v) {
        // Multiply a matrix times a column vector
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => dotProduct(row, v))
      },
      circ(m, v) { return m.map((row, i) => row.map(e => Rnl.multiply(e, v[i]) )) },
      divide(m, v)   { return m.map((row, i) => row.map(e => Rnl.divide(e, v[i]) )) },
      power(m, v)    { return m.map((row, i) => row.map(e => Rnl.power(e, v[i]) )) },
      modulo(m, v)   { return m.map((row, i) => row.map(e => Rnl.mod(e, v[i]) )) },
      rem(m, v)      { return m.map((row, i) => row.map(e => Rnl.rem(e, v[i]) )) },
      concat(m, v) {
        if (m.length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => [...row, v[i]])
      }
    },
    matrix: {
      // Binary operations on two 2-D matrices.
      add(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.add(n, y[i][j])))
      },
      subtract(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.subtract(n, y[i][j])))
      },
      dot(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((row, i) => dotProduct(row, y[i])).reduce((m, n) => Rnl.add(m, n))
      },
      cross(x, y) {
        return errorOprnd("CROSS")
      },
      multiply(x, y) {

      },
      circ(x, y) {
        // Element-wise multiplication
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.multiply(n, y[i][j])))
      },
      divide(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.divide(n, y[i][j])))
      },
      power(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.power(n, y[i][j])))
      },
      modulo(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.mod(n, y[i][j])))
      },
      rem(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => Rnl.rem(n, y[i][j])))
      },
      and(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n && y[i][j]))
      },
      or(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n || y[i][j]))
      },
      xor(x, y) {
        if (x.length !== y.length)       { return errorOprnd("MIS_ELNUM") }
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.map((m, i) => m.map((n, j) => n !== y[i][j]))
      },
      concat(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((row, i) => row.concat(y[i]))
      },
      unshift(x, y) {
        if (x[0].length !== y[0].length) { return errorOprnd("MIS_ELNUM") }
        return x.concat(y)
      }
    },
    map: {

    }
  },

  dataFrame: {
    multiply(df, scalar) {
      df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
        let L = e.length
        if (e.indexOf(".")) { L -= 1 }
        return Rnl.toStringSignificant(Rnl.multiply(scalar, Rnl.fromString(e)), L)
      }))
      return df
    },
    divide(df, scalar) {
      df.data = df.data.map(col => isNaN(col[0]) ? col : col.map(e => {
        let L = e.length
        if (e.indexOf(".")) { L -= 1 }
        return Rnl.toStringSignificant(Rnl.divide(scalar, Rnl.fromString(e)), L)
      }))
      return df
    }
  },

  map: {
    scalar: {
      // Binary opertions on a map and a scalar
      add(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.add(e, scalar))
          : col
        )
        return map
      },
      subtract(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.subtract(e, scalar))
          : col
        )
        return map
      },
      multiply(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.multiply(e, scalar))
          : col
        )
        return map
      },
      divide(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.divide(e, scalar))
          : col
        )
        return map
      },
      power(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.power(e, scalar))
          : col
        )
        return map
      },
      modulo(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.mod(e, scalar))
          : col
        )
        return map
      },
      rem(map, scalar) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map(e => Rnl.rem(e, scalar))
          : col
        )
        return map
      },
      and(map, scalar) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map(e => e && scalar)
          : col
        )
        return map
      },
      or(map, scalar) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map(e => e || scalar)
          : col
        )
        return map
      },
      xor(map, scalar) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map(e => e !== scalar)
          : col
        )
        return map
      }
    },
    columnVector: {
      add(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.add(e, vector[i]))
          : col
        )
        return map
      },
      subtract(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.subtract(e, vector[i]))
          : col
        )
        return map
      },
      multiply(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.multiply(e, vector[i]))
          : col
        )
        return map
      },
      divide(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.divide(e, vector[i]))
          : col
        )
        return map
      },
      power(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.power(e, vector[i]))
          : col
        )
        return map
      },
      modulo(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.mod(e, vector[i]))
          : col
        )
        return map
      },
      rem(map, vector) {
        map.data =  map.data.map(col => Rnl.isRational(col[0])
          ? col.map((e, i) => Rnl.rem(e, vector[i]))
          : col
        )
        return map
      },
      and(map, vector) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => e && vector[i])
          : col
        )
        return map
      },
      or(map, vector) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => e || vector[i])
          : col
        )
        return map
      },
      xor(map, vector) {
        map.data =  map.data.map(col => typeof col[0] === "boolean"
          ? col.map((e, i) => e !== vector[i])
          : col
        )
        return map
      }
    },
    matrix: {

    },
    map: {

    }
  }
}

// Binary relations get their own object, separate from other binary operations.
// That's because Hurmet allows chained comparisons, as in  a < b < c.
// So we have to pass yPrev as well as the two current operands.

const strOps = ["∈", "in", "∋", "⊇", "∉", "!in", "∌", "⊈", "⊉"]

const relations = {
  scalar: {
    scalar: {
      relate(op, x, y, yPrev) { return compare(op, x, y, yPrev) }
    },
    vector: {
      relate(op, x, v, yPrev) {
        if (yPrev === undefined) {
          return v.map(e => compare(op, x, e, undefined))
        } else if (typeof yPrev !== "object") {
          return v.map(e => compare(op, x, e, yPrev))
        } else if (Array.isArray(yPrev)) {
          return v.map((e, i) => compare(op, x, e, yPrev[i]))
        } else {
          // TODO: error message.
        }
      }
    },
    matrix: {
      relate(op, x, m, yPrev) {
        if (yPrev === undefined) {
          return m.map(row => row.map(e => compare(op, x, e, undefined)))
        } else if (typeof yPrev !== "object") {
          return m.map(row => row.map(e => compare(op, x, e, yPrev)))
        } else if (Array.isArray(yPrev)) {
          return m.map((row, i) => row.map((e, j) => compare(op, x, e, yPrev[i][j])))
        } else {
          // Error.
        }
      }
    },
    map: {
      relate(op, x, map, yPrev) {
        if (yPrev === undefined) {
          map.data =  map.data.map((column, j) =>
            j > 0 || typeof column[0] !== "string" || strOps.includes(op)
            ? column.map(e => compare(op, x, e, undefined))
            : column
          )
          return map
        } else {
          // Error.
        }
      }
    }
  },
  vector: {
    scalar: {
      relate(op, v, y, yPrev) {
        if (yPrev === undefined) {
          return v.map(e => compare(op, e, y, undefined))
        } else if (typeof yPrev !== "object") {
          return v.map(e => compare(op, e, y, yPrev))
        } else if (Array.isArray(yPrev)) {
          return v.map((e, i) => compare(op, e, y, yPrev[i]))
        } else {
          // TODO: error message.
        }
      }
    }
  },
  rowVector: {
    rowVector: {
      relate(op, x, y, yPrev) {
        if (yPrev === undefined) {
          return x.map((e, i) => compare(op, e, y[i], undefined))
        }
      }
    },
    matrix: {
      relate(op, v, m, yPrev) {
        if (yPrev === undefined) {
          if (v.length !== m[0].length) { return errorOprnd("MIS_ELNUM") }
          return m.map(row => row.map((e, i) => compare(op, v[i], e, undefined)))
        }
      }
    }
  },
  columnVector: {
    columnVector: {
      relate(op, x, y, yPrev) {
        if (yPrev === undefined) {
          return x.map((e, i) => compare(op, e, y[i], undefined))
        }
      }
    },
    map: {
      relate(op, v, map, yPrev) {
        if (yPrev === undefined) {
          map.data =  map.data.map((column, j) =>
            j > 0 || typeof column[0] !== "string" || strOps.includes(op)
            ? column.map((e, i) => compare(op, v[i], e, undefined))
            : column
          )
          return map
        }
      }
    }
  },
  matrix: {
    scalar: {
      relate(op, m, y, yPrev) {
        if (yPrev === undefined) {
          return m.map(row => row.map(e => compare(op, e, y, undefined)))
        } else if (typeof yPrev !== "object") {
          return m.map(row => row.map(e => compare(op, e, y, yPrev)))
        } else if (Array.isArray(yPrev)) {
          return m.map((row, i) => row.map((e, j) => compare(op, e, y, yPrev[i][j])))
        } else {
          // Error.
        }
      }
    },
    matrix: {
      relate(op, m1, m2, yPrev) {
        if (yPrev === undefined) {
          return m1.map((e, i) => compare(op, e, m2[i], undefined))
        }
      }
    }
  }
}

export const isDivByZero = (quotient, shape) => {
  switch (shape) {
    case "scalar":
      return quotient[1] === BigInt(0)
    case "vector":
      for (let i = 0; i < quotient.length; i++) {
        if (quotient[i][1] === BigInt(0)) { return true }
      }
      return false
    case "matrix":
      for (let i = 0; i < quotient.length; i++) {
        for (let j = 0; j < quotient[0].length; j++) {
          if (quotient[i][j][1] === BigInt(0)) { return true }
        }
      }
      return false
    case "map":
      for (let j = 0; j < quotient.data[0].length; j++) {
        if (Rnl.isRational(quotient.data[j][0])) {
          for (let i = 0; i < quotient.data.length; i++) {
            if (quotient.data[i][j][1] === BigInt(0)) { return true }
          }
        }
      }
      return false
    default:
      return false
  }
}

export const Operators = Object.freeze({
  unary,
  binary,
  relations,
  condition,
  dtype
})
