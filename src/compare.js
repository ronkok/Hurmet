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
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) > -1
      } else if (Array.isArray(y) && !Array.isArray(x)) {
        for (let i = 0; i < y.length; i++) {
          if (equals(x, y[i])) { return true }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "⋐":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) > -1
      } else if (Array.isArray(x) && Array.isArray(y)) {
        for (let i = 0; i < y.length; i++) {
          if (equals(x[0], y[i])) {
            if (i + x.length > y.length) { return false }
            for (let j = 1; j < x.length; j++) {
              if (!equals(x[j], y[i + j])) { return false }
            }
            return true
          }
        }
        return false
      } else {
        return errorOprnd("NOT_ARRAY")
      }

    case "∉":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) === -1
      } else if (Array.isArray(y)) {
        for (let i = 0; i < y.length; i++) {
          if (x === y[i]) { return false }
        }
        return true
      } else {
        return errorOprnd("NOT_ARRAY")
      }
    }
}
