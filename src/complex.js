/* eslint-disable */
import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import {errorOprnd} from "./error"

/*
 * This file implements a complex number data type.
 * Each complex number, z, is held as an array containing two rational number.
 * z[0] is the real part and z[1] is the imaginary part.
 *
 * This module is a work in progress.
 */

const j = [Rnl.zero, Rnl.one]

const isComplex = a => {
  return Array.isArray(a) && a.length === 2
    && Rnl.isRational(a[0]) && Rnl.isRational(a[1])
}

const Re = z => z[0]
const Im = z => z[1]
const abs = z => Rnl.hypot(z[0], z[1])
const negate = z => [Rnl.negate(z[0]), Rnl.negate(z[1])]
const conjugate = z => [z[0], Rnl.negate(z[1])]

const argument = (z) => {
    // For a complex number z, the "argument" is the angle (in radians) from
    // the positive real axis to the vector representing z.  + implies counter-clockwise.
    // Electrical engineers call this the phase angle of the complex number.
  if (Rnl.isZero(z[0]) && Rnl.isZero(z[1])) {
    return errorOprnd("ORIGIN", "argument")
  } else if (Rnl.isZero(z[1])) {
    return  Rnl.isPositive(z[0]) ? Rnl.zero : Rnl.pi
  } else if (Rnl.isZero(z[0])) {
    return  Rnl.isPositive(z[1])
      ? Rnl.divide(Rnl.pi, Rnl.two)
      : Rnl.negate(Rnl.divide(Rnl.pi, Rnl.two))
  } else {
    return  Rnl.fromNumber(Math.atan2(Rnl.toNumber(z[1]), Rnl.toNumber(z[0])))
  }
}

const add = (x, y) => [Rnl.add(x[0], y[0]), Rnl.add(x[1], y[1])]
const subtract = (x, y) => [Rnl.subtract(x[0], y[0]), Rnl.subtract(x[1], y[1])]

const multiply = (x, y) => {
  return [
    Rnl.subtract(Rnl.multiply(x[0], y[0]), Rnl.multiply(x[1], y[1])),
    Rnl.add(Rnl.multiply(x[0], y[1]), Rnl.multiply(x[1], y[0]))
  ]
}

const divide = (x, y) => {
  if (!Rnl.isZero(x[1]) && !Rnl.isZero(y[1])) {
    if (Rnl.lessThan(Rnl.abs(y[1]), Rnl.abs(y[0]))) {
      const ratio = Rnl.divide(y[1], y[0])
      const denom = Rnl.add(y[0], Rnl.multiply(y[1], ratio))
      return  [
        Rnl.divide(Rnl.add(x[0], Rnl.multiply(x[1], ratio)), denom),
        Rnl.divide(Rnl.subtract(x[1], Rnl.multiply(x[0], ratio)), denom),
      ]
    } else {
      const ratio = Rnl.divide(y[0], y[1])
      const denom = Rnl.add(y[1], Rnl.multiply(y[0], ratio))
      return  [
        Rnl.divide(Rnl.add(x[1], Rnl.multiply(x[0], ratio)), denom),
        Rnl.divide(Rnl.add(Rnl.negate(x[0]), Rnl.multiply(x[1], ratio)), denom),
      ]
    }
  } else if (Rnl.isZero(x[1])) {
    // real x divided by complex y
    if (Rnl.lessThan(Rnl.abs(y[1]), Rnl.abs(y[0]))) {
      const ratio = Rnl.divide(y[1], y[0])
      const denom = Rnl.add(y[0], Rnl.multiply(y[1], ratio))
      return  [
        Rnl.divide(x[0], denom),
        Rnl.negate(Rnl.multiply(x[0], Rnl.divide(ratio, denom))),
      ]
    } else {
      const ratio = Rnl.divide(y[0], y[1])
      const denom = Rnl.add(y[1], Rnl.multiply(y[0], ratio))
      return  [
        Rnl.divide(Rnl.multiply(x[0], ratio), denom),
        Rnl.negate(Rnl.divide(x[0], denom)),
      ]
    }
  } else if (Rnl.isZero(y[1])) {
    // Complex x divided by real y
    if (Rnl.isZero(y[0])) {
      // TODO: divide by zero error message
    } else {
      return  [Rnl.divide(x[0], y[0]), Rnl.divide(x[1], y[0])]
    }
  } else {
    // both x and y are reals
    if (Rnl.isZero(y[0])) {
      return errorOprnd("DIV")
    } else {
      return [Rnl.divide(x[0], y[0]), Rnl.zero ]
    }
  }
}

const increment = z => [Rnl.increment(z[0]), z[1]]
const decrement = z => [Rnl.decrement(z[0]), z[1]]

const inverse = z => {
  // Complex inverse 1 / z
  if (Rnl.isZero(z[1])) {
    if (Rnl.isZero((z[0]))) { return errorOprnd("DIV") }
    return [Rnl.inverse(z[0]), 0]
  } else {
    return divide([Rnl.one, Rnl.zero], z)
  }
}

const cos = z => {
  const real = Rnl.multiply(Rnl.cos(z[0]), Rnl.cosh(z[1]))
  const im = Rnl.multiply(Rnl.negate(Rnl.sin(z[0])), Rnl.sinh(z[1]))
  return [real, im]
}

const sin = z => {
  const real = Rnl.multiply(Rnl.sin(z[0]), Rnl.cosh(z[1]))
  const im = Rnl.multiply(Rnl.cos(z[0]), Rnl.sinh(z[1]))
  return [real, im]
}

const log = x => {
  let z = [Rnl.zero, Rnl.zero]
  // Natural (base e) logarithm of a complex number, x
  if (Rnl.isZero(x[0]) && Rnl.isZero(x[1])) {
    return errorOprnd("ORIGIN", "log")
  } else {
    z[0] = Rnl.fromNumber(Math.log(Rnl.toNumber(Rnl.hypot(x[0], x[1]))))
    z[1] = argument(x)   // phase angle, in radians
  }
  return z
}

const isSmall = x => Rnl.lessThan(Rnl.abs(x), [BigInt(1), BigInt(100000000000000)])

const exp = x => {
  // Complex exponentiation
  let z = [Rnl.zero, Rnl.zero]
  if (isSmall(x[1])) {
    z[1] = Rnl.zero
    z[0] = Rnl.exp(x[0])
  } else {
    if (Rnl.isZero(x[0])) {
      z[0] = Rnl.cos(x[1])
      if (isSmall(z[0])) { z[0] = Rnl.zero }
      z[1] = Rnl.sin(x[1])
      if (isSmall(z[1])) { z[1] = Rnl.zero }
    } else {
      const realExp = Rnl.exp(x[0])
      z[0] = Rnl.multiply(realExp, Rnl.cos(x[1]))
      z[1] = Rnl.multiply(realExp, Rnl.sin(x[1]))
    }
  }
  return z
}

const power = (x, y) =>{
  let z = [Rnl.zero, Rnl.zero]
  // powers: z = e^(log(x) × y)
  if (!isComplex(y)) {
    z = log(x)
    z[0] = Rnl.multiply(z[0], y)
    z[1] = Rnl.multiply(z[1], y)
  } else if (Rnl.isZero(y[1])) {
    z = log(x)
    z[0] = Rnl.multiply(z[0], y[0])
    z[1] = Rnl.multiply(z[1], y[0])
  } else if (Rnl.isZero(x[1]) && !Rnl.isNegative(x[0])) { 
    x[0] = Rnl.fromNumber(Math.log(Rnl.toNumber(x[0])))
    z[0] = Rnl.multiply(x[0], y[0])
    z[1] = Rnl.multiply(x[0], y[1])
  } else {
    x = log(x)
    z[0] = Rnl.subtract(Rnl.multiply(x[0], y[0]), Rnl.multiply(x[1], y[1]))
    z[1] = Rnl.add(Rnl.multiply(x[1], y[0]), Rnl.multiply(x[0], y[1]))
  }
  
  z = exp(z)
  if (isSmall(z[1])) { z[1] = Rnl.zero }
  if (isSmall(z[0])) { z[0] = Rnl.zero }
  return z
}

const acosh = z => {
  // acosh(z) = log( z + √(z - 1) × √(z + 1) )
  return log(add(z, multiply(sqrt(decrement(z)), sqrt(increment(z)))))
}

const asinh = z => {
  // Log(z + Sqrt(z * z + 1))
  const s = sqrt(add(multiply(z, z), [Rnl.one, Rnl.zero]))
  return log(add(z, s))
}

const atanh = z => {
  // atanh(z) = [ log(1+z) - log(1-z) ] / 2
  return divide(subtract(log(increment(z)), log(subtract([Rnl.one, Rnl.zero], z))), [Rnl.two, Rnl.zero])
}

const asin = z => {
  // arcsinh (i * z) / i
  return divide(asinh(multiply(j, z)), j)
}

const atan = z => {
  // (Log(1 + iz) - Log(1 - iz)) / (2 * i)  cf Kahan
  const term1 = log(increment(multiply(j, z)))
  const term2 = log(subtract([Rnl.one, Rnl.zero],(multiply(j, z))))
  return divide(subtract(term1, term2), [Rnl.zero, Rnl.two])  
}

const sqrt = x => {
  const z = log(x)
  z[0] = Rnl.divide(z[0], Rnl.two)
  z[1] = Rnl.divide(z[1], Rnl.two)
  return exp(z)
}

const lanczos = zPlusOne => {
  // Lanczos approximation of Gamma function.
  // Coefficients are from 2004 PhD thesis by Glendon Pugh.
  // *An Analysis of the Lanczos Gamma Approximation*
  // The following equation is from p. 116 of the Pugh thesis:
  // Γ(z+1) ≈ 2 * √(e / π) * ((z + 10.900511 + 0.5) / e) ^ (z + 0.5) * sum
  const z = subtract(zPlusOne, [Rnl.one, Rnl.zero])
  const sqr = Rnl.sqrt(Rnl.divide(e, pi))
  const term1 = multiply([Rnl.two, Rnl.zero], [sqr, Rnl.zero])
  const k = Rnl.fromNumber(11.400511)
  const oneHalf = [[BigInt(1), BigInt(2)], Rnl.zero]
  const term2 = power(divide(add(z, [k, Rnl.zero]), [e, Rnl.zero]), add(z, oneHalf))

  // Coefficients from Pugh, Table 8.5
  const d = ["2.48574089138753565546e-5", "1.05142378581721974210",
    "-3.45687097222016235469", "4.51227709466894823700", "-2.98285225323576655721",
    "1.05639711577126713077", "-0.195428773191645869583", "0.0170970543404441224307",
    "-0.000571926117404305781283", "0.00000463399473359905636708",
    "-0.00000000271994908488607703910"]

  // sum = d_0 + ∑_(k=1)^10 d_k/(z+k)
  let sum = [Rnl.fromString(d[0]), Rnl.zero]
  for (let k = 1; k <= 10; k++) {
    const d = [Rnl.fromString(d[k]), Rnl.zero]
    const complexK = [Rnl.fromNumber(k), Rnl.zero]
    sum = add(sum, divide(d, add(z, complexK)))
  }

  return multiply(multiply(term1, term2), sum)
}

export const Cpx = Object.freeze({
  j,
  Re,
  Im,
  abs,
  conjugate,
  argument,
  inverse,
  increment,
  decrement,
  isComplex,
  add,
  subtract,
  divide,
  multiply,
  negate,
  power,
  exp,
  log,
  sqrt,
  sin,
  cos,
  asin,
  atan,
  acosh,
  asinh,
  atanh,
  lanczos
})
