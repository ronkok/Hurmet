import { dt } from "./constants"
import { mapMap, clone } from "./utils"
import { errorOprnd } from "./error"
import { Rnl } from "./rational"
import { Cpx } from "./complex"
import { Matrix } from "./matrix"
import { compare } from "./compare"

// Hurmet math operators are overloaded to handle operands of various shapes.
// Those shapes being scalars, vectors, matrices, and maps.
// This file implements the overloading.

// Some helper functions
const transpose2D = a => a[0].map((x, i) => a.map(y => y[i]))
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
    not(m)       { return m.map(row => row.map(e => !e)) }
  },

  map: {
    abs(map)       { return mapMap(map, value => Rnl.abs(value)) },
    negate(map)    { return mapMap(map, value => Rnl.negate(value)) },
    exp(map)       { return mapMap(map, value => Rnl.exp(value)) },
    floor(map)     { return mapMap(map, value => Rnl.floor(value)) },
    ceil(map)      { return mapMap(map, value => Rnl.ceil(value)) },
    percent(map)   { return mapMap(map, value => Rnl.multiply(oneTenth, value)) },
    factorial(map) { return mapMap(map, value => Rnl.factorial(value)) },
    not(map)       { return mapMap(map, value => !value) }
  },

  mapWithVectorValues: {
    abs(map)       { return mapMap(map, array => array.map(e => Rnl.abs(e))) },
    negate(map)    { return mapMap(map, array => array.map(e => Rnl.negate(e))) },
    exp(map)       { return mapMap(map, array => array.map(e => Rnl.exp(e)))},
    floor(map)     { return mapMap(map, array => array.map(e => Rnl.floor(e))) },
    ceil(map)      { return mapMap(map, array => array.map(e => Rnl.ceil(e))) },
    percent(map)   { return mapMap(map, array => array.map(e => Rnl.multiply(oneTenth, e))) },
    factorial(map) { return mapMap(map, array => array.map(e => Rnl.factorial(e))) },
    not(map)       { return mapMap(map, array => array.map(e => !e)) }
  }
}

const dtype = {
  // Given the shapes which are operands to a binary operator,
  // return the resulting data type.
  scalar: {
    scalar(t0, t1, tkn)     {
      return (tkn === "&" || tkn === "&_")
        ? t0 + (tkn === "&" ? dt.ROWVECTOR : dt.COLUMNVECTOR )
        : t0
    },
    complex(t0, t1, tkn)    { return t1 },
    vector(t0, t1, tkn)     { return t1 },
    matrix(t0, t1, tkn)     { return t1 },
    dataFrame(t0, t1, tkn)  { return t1 },
    map(t0, t1, tkn)        { return t1 },
    mapWithVectorValues(t0, t1, tkn) { return t1 }
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
    rowVector(t0, t1, tkn) { return tkn === "&_" ? t0 - dt.ROWVECTOR + dt.MATRIX : t0 },
    columnVector(t0, t1, tkn) { return t0 },
    matrix(t0, t1, tkn) { return tkn === "&_" ? t1 : t0 }
  },
  columnVector: {
    rowVector(t0, t1, op) {
      return op === "dot"
      ? dt.RATIONAL
      : op === "cross"
      ? t0
      : t0 - dt.COLUMNVECTOR + dt.MATRIX
    },
    columnVector(t0, t1, tkn) { return tkn === "&" ? t0 - dt.COLUMNVECTOR + dt.MATRIX : t0 },
    matrix(t0, t1, tkn) { return t1 }
  },
  matrix: {
    scalar(t0, t1, tkn) { return t0 },
    rowVector(t0, t1, tkn) { return t0 },
    columnVector(t0, t1, tkn) { return tkn === "&" ? t0 : t1 },
    matrix(t0, t1, tkn) { return t0 },
    map(t0, t1, tkn)    { return 0 }
  },
  dataFrame: {
    scalar(t0, t1, tkn) { return t0 }
  },
  map: {
    scalar(t0, t1, tkn) { return t0 },
    vector(t0, t1, tkn) { return t0 + (t1 & dt.ROWVECTOR) + (t1 & dt.COLUMNVECTOR) },
    matrix(t0, t1, tkn) { return 0 },
    map(t0, t1, tkn)    { return t0 }
  },
  mapWithVectorValues: {
    scalar(t0, t1, tkn) { return t0 }
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
      hypot(x, y)    { return Rnl.hypot(x, y) },
      modulo(x, y)   { return Rnl.modulo(x, y) },
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
      modulo(x, z)   { return errorOprnd("NA_COMPL_OP", "modulo") },
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
      modulo(x, v)   { return v.map(e => Rnl.modulo(x, e)) },
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
      modulo(x, m)   { return m.map(row => row.map(e => Rnl.modulo(x, e))) },
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
        return mapMap(map, value => Rnl.add(scalar, value))
      },
      subtract(scalar, map) {
        return mapMap(map, value => Rnl.subtract(scalar, value))
      },
      multiply(scalar, map) {
        return mapMap(map, value => Rnl.multiply(scalar, value))
      },
      divide(scalar, map) {
        return mapMap(map, value => Rnl.divide(scalar, value))
      },
      power(scalar, map) {
        return mapMap(map, value => Rnl.power(scalar, value))
      },
      modulo(scalar, map) {
        return mapMap(map, value => Rnl.modulo(scalar, value))
      },
      and(scalar, map) {
        return mapMap(map, value => scalar && value)
      },
      or(scalar, map) {
        return mapMap(map, value => scalar || value)
      },
      xor(scalar, map) {
        return mapMap(map, value => scalar !== value)
      }
    },
    mapWithVectorValues: {
      add(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.add(scalar, e)))
      },
      subtract(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.subtract(scalar, e)))
      },
      multiply(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.multiply(scalar, e)))
      },
      divide(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.divide(scalar, e)))
      },
      power(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.power(scalar, e)))
      },
      modulo(scalar, map) {
        return mapMap(map, array => array.map(e => Rnl.modulo(scalar, e)))
      },
      and(scalar, map) {
        return mapMap(map, array => array.map(e => scalar && e))
      },
      or(scalar, map) {
        return mapMap(map, array => array.map(e => scalar || e))
      },
      xor(scalar, map) {
        return mapMap(map, array => array.map(e => scalar !== e))
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
      modulo(z, y)   { return errorOprnd("NA_COMPL_OP", "modulo") },
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
      modulo(x, y)   { return errorOprnd("NA_COMPL_OP", "modulo") },
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
      modulo(v, x)   { return v.map(e => Rnl.modulo(e, x)) },
      and(v, x)      { return v.map(e => e && x) },
      or(v, x)       { return v.map(e => e || x) },
      xor(v, x)      { return v.map(e => e !== x) },
      concat(v, x)   { return [...v, x]}
    },
    map: {
      // Binary operations with a vector and a map
      add(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.add(val, e)))
      },
      subtract(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.subtract(val, e)))
      },
      multiply(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.multiply(val, e)))
      },
      divide(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.divide(val, e)))
      },
      power(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.power(val, e)))
      },
      modulo(vector, map) {
        return mapMap(map, val => vector.map(e => Rnl.modulo(val, e)))
      },
      and(vector, map) {
        return mapMap(map, val => vector.map(e => val && e))
      },
      or(vector, map) {
        return mapMap(map, val => vector.map(e => val || e))
      },
      xor(vector, map) {
        return mapMap(map, val => vector.map(e => val !== e))
      }
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
      asterisk(x, y) {
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
        return x.map((e, i) => Rnl.modulo(e, y[i]))
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
      asterisk(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.modulo(x[0], y[0])] }
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
      concat(v, m) {
        if (v.length !== m[0].length) { return errorOprnd("BAD_CONCAT") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(v, m) {
        if (v.length !== m.length) { return errorOprnd("BAD_CONCAT") }
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
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return dotProduct(x, y)
      },
      divide(x, y) {
        return x.map(m => y.map(e => Rnl.divide(m, e)))
      },
      asterisk(x, y) {
        if (x.length !== y.length) { return errorOprnd("MIS_ELNUM") }
        return x.map((e, i) => Rnl.multiply(e, y[i]))
      },
      power(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.power(x[0], y[0])] }
        return errorOprnd("MIS_ELNUM")
      },
      modulo(x, y) {
        if (x.length === 1 && y.length === 1) { return [Rnl.modulo(x[0], y[0])] }
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
      asterisk(x, y) {
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
        return x.map((e, i) => Rnl.modulo(e, y[i]))
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
        // Add the column vector to each column of the matrix
        const result = clone(m)
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[0].length; j++) {
            result[i][j] = Rnl.add(m[i][j], v[j])
          }
        }
        return result
      },
      subtract(v, m) {
        // Add the column vector to each column of the matrix
        const result = clone(m)
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[0].length; j++) {
            result[i][j] = Rnl.subtract(m[i][j], v[j])
          }
        }
        return result
      },
      concat(v, m) {
        if (v.length !== m.length) { return errorOprnd("MIS_ELNUM") }
        return m.map((row, i) => [v[i], ...row])
      },
      unshift(x, y) { return "BAD_CONCAT" }
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
        if (x === "T") { return transpose2D(m) }
        if (m.length === m[0].length && Rnl.areEqual(x, [BigInt(-1), BigInt(1)])) {
          return Matrix.invert(m)
        }
        return m.map(row => row.map(e => Rnl.power(e, x)))
      },
      modulo(m, x)   { return m.map(row => row.map(e => Rnl.modulo(e, x))) }
    },
    rowVector: {
      unshift(m, v) {
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return [...m, v]
      }
    },
    columnVector: {
      multiply(m, v) {
        // Multiply a matrix times a column vector
        if (m[0].length !== v.length) { return errorOprnd("MIS_ELNUM") }
        return m.map(row => dotProduct(row, v))
      },
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
      asterisk(x, y) {
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
        return x.map((m, i) => m.map((n, j) => Rnl.modulo(n, y[i][j])))
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
        return mapMap(map, value => Rnl.add(value, scalar))
      },
      subtract(map, scalar) {
        return mapMap(map, value => Rnl.subtract(value, scalar))
      },
      multiply(map, scalar) {
        return mapMap(map, value => Rnl.multiply(value, scalar))
      },
      divide(map, scalar) {
        return mapMap(map, value => Rnl.divide(value, scalar))
      },
      power(map, scalar) {
        return mapMap(map, value => Rnl.power(value, scalar))
      },
      modulo(map, scalar) {
        return mapMap(map, value => Rnl.modulo(value, scalar))
      },
      and(map, scalar) {
        return mapMap(map, value => value && scalar)
      },
      or(map, scalar) {
        return mapMap(map, value => value || scalar)
      },
      xor(map, scalar) {
        return mapMap(map, value => value !== scalar)
      }
    },
    vector: {
      add(map, array) {
        return mapMap(map, value => array.map(e => Rnl.add(value, e)))
      },
      subtract(map, array) {
        return mapMap(map, value => array.map(e => Rnl.subtract(value, e)))
      },
      multiply(map, array) {
        return mapMap(map, value => array.map(e => Rnl.multiply(value, e)))
      },
      divide(map, array) {
        return mapMap(map, value => array.map(e => Rnl.divide(value, e)))
      },
      power(map, array) {
        return mapMap(map, value => array.map(e => Rnl.power(value, e)))
      },
      modulo(map, array) {
        return mapMap(map, value => array.map(e => Rnl.modulo(value, e)))
      },
      and(map, array) {
        return mapMap(map, value => array.map(e => value && e))
      },
      or(map, array) {
        return mapMap(map, value => array.map(e => value || e))
      },
      xor(map, array) {
        return mapMap(map, value => array.map(e => value !== e))
      }
    },
    matrix: {

    },
    map: {

    }
  },
  mapWithVectorValues: {
    scalar: {
      add(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.add(e, scalar)))
      },
      subtract(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.subtract(e, scalar)))
      },
      multiply(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.multiply(e, scalar)))
      },
      divide(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.divide(e, scalar)))
      },
      power(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.power(e, scalar)))
      },
      modulo(map, scalar) {
        return mapMap(map, array => array.map(e => Rnl.modulo(e, scalar)))
      },
      and(map, scalar) {
        return mapMap(map, array => array.map(e => e && scalar))
      },
      or(map, scalar) {
        return mapMap(map, array => array.map(e => e || scalar))
      },
      xor(map, scalar) {
        return mapMap(map, array => array.map(e => e !== scalar))
      }

    },
    vector: {

    },
    matrix: {

    },
    map: {

    },
    mapWithVectorValues: {

    }
  }
}

// Binary relations get their own object, separate from other binary operations.
// That's because Hurmet allows chained comparisons, as in  a < b < c.
// So we have to pass yPrev as well as the two current operands.

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
          return mapMap(map, value => compare(op, x, value, undefined))
        } else if (typeof yPrev !== "object") {
          return mapMap(map, value => compare(op, x, value, yPrev))
        } else {
          const newMap = new Map()
          for (const [key, value] of map.entries()) {
            newMap.set(key,  compare(op, x, value, yPrev[key]))
          }
          return newMap
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
    }
  },
  columnVector: {
    columnVector: {
      relate(op, x, y, yPrev) {
        if (yPrev === undefined) {
          return x.map((e, i) => compare(op, e, y[i], undefined))
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
      for (const [_, value] of Object.entries(quotient)) {
        if (value[1] === BigInt(0)) { return true }
      }
      return false
    case "mapWithVectorValues":
      for (const [_, value] of Object.entries(quotient)) {
        for (let i = 0; i < value.length; i++) {
          if (value[i][1] === BigInt(0)) { return true }
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
  dtype
})
