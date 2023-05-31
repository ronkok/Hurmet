import { errorOprnd } from "./error"
import { Rnl } from "./rational"

// compare.js

const equals = (x, y) => {
  if (Rnl.isRational(x) && Rnl.isRational(y)) {
    return Rnl.areEqual(x, y)
  } else {
    return x === y
  }
}

export const compare = (op, x, y, yPrev) => {
  // If yPrev is defined, then this is part of a chained comparison, e.g.: a < b < c
  if (x === false && yPrev) { return false }  // The chain is false if any part is false.
  if (x === true && yPrev) { x = yPrev }  // Compare this link in the chain.

  switch (op) {
    case "=":
      return errorOprnd("BAD_EQ")

    case "==":
    case "⩵":
      return equals(x, y)

    case "≠":
    case "!=":
    case "/=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return !Rnl.areEqual(x, y)
      } else {
        return x !== y
      }

    case ">":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.greaterThan(x, y)
      } else {
        return x > y
      }

    case "<":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.lessThan(x, y)
      } else {
        return x < y
      }

    case "≥":
    case ">=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.greaterThanOrEqualTo(x, y)
      } else {
        return x >= y
      }

    case "≤":
    case "<=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.lessThanOrEqualTo(x, y)
      } else {
        return x <= y
      }

    case "∈":
    case "in":
      if (typeof x === "string" && typeof y === "string") {
        if (Array.from(x).length > 1) { return false }
        return y.indexOf(x) > -1
      } else if (Array.isArray(y) && Rnl.isRational(y[0]) && Rnl.isRational(x)) {
        for (let i = 0; i < y.length; i++) {
          if (Rnl.areEqual(x, y[i])) { return true }
        }
        return false
      } else if (Array.isArray(y) && !Array.isArray(x)) {
        for (let i = 0; i < y.length; i++) {
          if (equals(x, y[i])) { return true }
        }
        return false
      } else if (y instanceof Map) {
        return y.has(x)
      } else if (typeof x === "string" && typeof y === "object" &&
                 Object.hasOwnProperty.call(y, "headings")) {
        // Is x a property of dataframe y?
        return Boolean(y.headings.includes(x) ||
                      (y.rowMap && Object.hasOwnProperty.call(y.rowMap, x)))
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "∋":
      if (typeof x === "string" && typeof y === "string") {
        if (Array.from(x).length > 1) { return false }
        return y.indexOf(x) > -1
      } else if (x instanceof Map) {
        return x.has(y)
      } else if (typeof x === "object" && typeof y === "string" &&
                  Object.hasOwnProperty.call(x, "headings")) {
        // Is y a property of dataframe x?
        return Boolean(x.headings.includes(y) ||
                      (x.rowMap && Object.hasOwnProperty.call(x.rowMap, y)))
      } else {
        return errorOprnd("NO_PROP", x.name)
      }

    case "⊃":
      if (typeof x === "string" && typeof y === "string") {
        return x.indexOf(y) > -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        for (let i = 0; i < x.length; i++) {
          // We test for a contiguous subset
          if (equals(y[0], x[i])) {
            if (i + y.length > x.length) { return false }
            for (let j = 1; j < y.length; j++) {
              if (!equals(y[j], x[i + j])) { return false }
            }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "∉":
    case "!in":
      if (typeof x === "string" && typeof y === "string") {
        if (Array.from(x).length === 1) { return false }
        return y.indexOf(x) === -1
      } else if (Array.isArray(y) && Rnl.isRational(y[0]) && Rnl.isRational(x)) {
        for (let i = 0; i < y.length; i++) {
          if (Rnl.areEqual(x, y[i])) { return false }
        }
        return true
      } else if (Array.isArray(y)) {
        for (let i = 0; i < y.length; i++) {
          if (x === y[i]) { return false }
        }
        return true
      } else if (y instanceof Map) {
        return !y.has(x)
      } else if (typeof x === "string" && typeof y === "object" &&
                 Object.hasOwnProperty.call(y, "headings")) {
        // Is x a property of dataframe x?
        return !(y.headings.includes(x) ||
                (y.rowMap && Object.hasOwnProperty.call(y.rowMap, x)))
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "∌":
      if (typeof x === "string" && typeof y === "string") {
        if (Array.from(y).length === 1) { return false }
        return x.indexOf(y) === -1
      } else if (x instanceof Map) {
        return !x.has(y)
      } else if (typeof x === "object" && typeof y === "string" &&
                  Object.hasOwnProperty.call(x, "headings")) {
        // Is y a property of dataframe x?
        return !(x.headings.includes(y) ||
                (x.rowMap && Object.hasOwnProperty.call(x.rowMap, y)))
      } else {
        return errorOprnd("NO_PROP", x.name)
      }

    case "⊄":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) === -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        // We test for a contiguous subset
        for (let i = 0; i < y.length; i++) {
          if (equals(x[0], y[i])) {
            if (i + x.length > y.length) { continue }
            let provisional = true
            for (let j = 1; j < x.length; j++) {
              if (!equals(x[j], y[i + j])) {
                provisional = false
                continue
              }
            }
            if (!provisional) { continue }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "⊅":
      if (typeof x === "string" && typeof y === "string") {
        return x.indexOf(y) === -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        // We test for a contiguous subset
        for (let i = 0; i < x.length; i++) {
          if (equals(y[0], x[i])) {
            if (i + y.length > x.length) { continue }
            let provisional = true
            for (let j = 1; j < y.length; j++) {
              if (!equals(y[j], x[i + j])) {
                provisional = false
                continue
              }
            }
            if (!provisional) { continue }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }
  }
}
