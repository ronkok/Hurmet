import { Rnl } from "./rational"

// compare.js

export const compare = (op, x, y, yPrev) => {
  // If yPrev is defined, then this is part of a chained comparison, e.g.: a < b < c
  if (x === false && yPrev) { return false }  // The chain is false if any part is false.
  if (x === true && yPrev) { x = yPrev }  // Compare this link in the chain.

  switch (op) {
    case "=":
      if (Rnl.isRational(x) && Rnl.isRational(y)) {
        return Rnl.areEqual(x, y)
      } else {
        return x === y
      }

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
    case "⋐":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) > -1
      }
      // TODO: element of an array.
      break

    case "∉":
      if (typeof x === "string" && typeof y === "string") {
        return y.indexOf(x) === -1
      }
  }
}
