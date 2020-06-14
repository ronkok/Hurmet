import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import { clone } from "./utils"
import { unitsAreCompatible } from "./units"
import { Matrix } from "./matrix"
import { errorOprnd } from "./error"

const negativeOne = Rnl.negate(Rnl.one)
const oneHalf = [BigInt(1), BigInt(2)]
const thirty = [BigInt(30), BigInt(1)]
const fortyFive = [BigInt(45), BigInt(1)]
const sixty = [BigInt(60), BigInt(1)]
const ninety = [BigInt(90), BigInt(1)]

const functionExpos = (functionName, args) => {
  const numArgs = args.length

  let x = numArgs === 1 ? args[0].unit : null

  switch (functionName) {
    case "abs":
    case "real":
    case "round":
    case "roundn":
    case "sign":
    case "trace":
    case "fetch":
      return x

    case "cos":
    case "sin":
    case "tan":
    case "sec":
    case "csc":
    case "cot":
    case "acos":
    case "arccos":
    case "asin":
    case "arcsin":
    case "atan":
    case "arctan":
    case "asec":
    case "arcsec":
    case "acsc":
    case "arccsc":
    case "acot":
    case "arccot":
    case "cosd":
    case "sind":
    case "tand":
    case "secd":
    case "cscd":
    case "cotd":
    case "acosd":
    case "asind":
    case "atand":
    case "asecd":
    case "acscd":
    case "acotd":
    case "gud":
      if (!unitsAreCompatible(x, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return allZeros

    case "exp":
    case "log":
    case "ln":
    case "log10":
    case "log2":
    case "logn":
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
    case "binomial":
    case "gamma":
      if (!unitsAreCompatible(x, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return allZeros

    case "gcd":
    case "mht":
      if (!unitsAreCompatible(x, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return functionName === "hmt" ? [1, 0, 0, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0]

    case "hypot":
    case "rms":
    case "sum":
    case "mean":
    case "median":
    case "min":
    case "max":
    case "range":
    case "stddev":
    case "variance":
      x = args[0].unit
      for (let i = 1; i < args.length; i++) {
        const y = args[i].unit
        if (x.length !== y.length) { return errorOprnd("UNIT_ARG", functionName) }
        for (let j = 0; j < x.length; j++) {
          if (x[j] !== y[j]) { return errorOprnd("UNIT_ARG", functionName) }
        }
      }
      return x

    case "product":
      for (let i = 1; i < args.length; i++) {
        const p = args[i].unit
        args[0].unit.map((e, j) => e + p[j])
      }
      return args[0]

    default:
      return errorOprnd("F_NAME", functionName)
  }
}

const gamma = (z) => {
  // TODO: complex inputs

  if (Rnl.isZero(z)) {
    return errorOprnd("Γ0")
  } else if (Rnl.isPositive(z) && Rnl.isInteger(z) && Rnl.toNumber(z) < 101) {
    return Rnl.factorial(Rnl.subtract(z, Rnl.one))
  } else if (Rnl.isNegative(z) && Rnl.isInteger(z)) {
    return errorOprnd("ΓPOLE")
  } else if (Rnl.lessThan(z, oneHalf)) {
    // reflection formula
    return Rnl.fromNumber(Math.PI / (Math.sin(Math.PI * Rnl.toNumber(z)))
      * Rnl.toNumber(gamma(Rnl.subtract(Rnl.one, z))))
  } else {
    return Rnl.lanczos(z)
  }
}

const binomial = (n, k) => {
  // (n \atop k) = n! / (k! (n - k)!)
  //             = exp(log!(n) - [log!(k) + log!(n - k)])
  if (Rnl.areEqual(n, k)) { return Rnl.one }
  if (Rnl.isZero(n)) { return Rnl.zero }

  if (Rnl.isInteger(n) && Rnl.isInteger(k) && Rnl.isPositive(n) && Rnl.isPositive(k)) {
    // positive integers
//    if (Rnl.lessThan(n, twenty)) {
    return Rnl.divide(Rnl.factorial(n),
      Rnl.multiply(Rnl.factorial(k), Rnl.factorial(Rnl.subtract(n, k))))
//    } else {
//      return Rnl.fromNumber(Math.round(Math.exp(Rnl.toNumber(
//        Rnl.subtract(logFactorial(n),
//          Rnl.add(logFactorial(k), logFactorial(Rnl.subtract(n, k))))))))
//    }

  } else if (Rnl.isInteger(n) && Rnl.isInteger(k) && Rnl.isPositive(k)) {
    // negative integer n
    // (-n \atop k) = (-1)^k * multiset(n, k)
    return Rnl.multiply(Rnl.power(negativeOne, k), multiset(Rnl.negate(n), k))

  } else {
    // generalized for real or complex arguments
    // (x \atop y) = Γ(x+1) / ( Γ(y+1) Γ(x-y+1) )
    return Rnl.divide(
      gamma(Rnl.increment(n)),
      Rnl.multiply(gamma(Rnl.increment(k)), gamma(Rnl.increment(Rnl.subtract(n, k))))
    )

  }
}

const multiset = (n, k) => {
  // ((n \atop k)) = ((n+k-1) \atop k)
  // multiset(n, k) = binomial(n+k-1, k)
  return binomial(Rnl.add(n, Rnl.decrement(k)), k)
}

const piOver180 = Rnl.divide(Rnl.pi, [BigInt(180), BigInt(1)])

const unary = {
  // Functions that take one real argument.
  abs(x) {
    return Rnl.abs(x)
  },
  cos(x) {
    return Rnl.areEqual(x, Rnl.divide(Rnl.pi, Rnl.two))
       ? Rnl.zero
       : Rnl.fromNumber(Math.cos(Rnl.toNumber(x)))
  },
  sin(x) {
    return Rnl.fromNumber(Math.sin(Rnl.toNumber(x)))
  },
  tan(x) {
    if (Rnl.areEqual(x, Rnl.divide(Rnl.pi, Rnl.two))) {
      return errorOprnd("TAN90", "π/2")
    }
    return Rnl.fromNumber(Math.tan(Rnl.toNumber(x)))
  },
  acos(x) {
    if (Rnl.greaterThan(Rnl.abs(x), Rnl.one)) { return errorOprnd("ATRIG", "acos") }
    return Rnl.fromNumber(Math.acos(Rnl.toNumber(x)))
  },
  asin(x) {
    if (Rnl.greaterThan(Rnl.abs(x), Rnl.one)) { return errorOprnd("ATRIG", "asin") }
    return Rnl.fromNumber(Math.asin(Rnl.toNumber(x)))
  },
  atan(x) {
    return Rnl.fromNumber(Math.atan(Rnl.toNumber(x)))
  },
  sec(x) {
    return Rnl.fromNumber(1 / Math.cos(Rnl.toNumber(x)))
  },
  csc(x) {
    return Rnl.fromNumber(1 / Math.sin(Rnl.toNumber(x)))
  },
  cot(x) {
    if (Rnl.isZero(x)) { return errorOprnd("COT", "cotangent") }
    return  Rnl.fromNumber(1 / Math.tan(Rnl.toNumber(x)))
  },
  asec(x) {
    if (Rnl.greaterThanOrEqualTo(Rnl.abs(x), Rnl.one)) {
      return errorOprnd("ASEC", "arcecant")
    }
    const temp = Math.atn(Math.sqrt(Rnl.toNumber(Rnl.decrement(Rnl.multiply(x, x)))))
    return  (Rnl.isPositive(x))
      ? Rnl.fromNumber(temp)
      : Rnl.fromNumber(temp - Math.PI)
  },
  acot(x) {
    if (Rnl.greaterThanOrEqualTo(Rnl.abs(x), Rnl.one)) {
      return errorOprnd("ASEC", "acot")
    }
    const temp = Math.atn(1 / (Math.sqrt(Rnl.toNumber(Rnl.decrement(Rnl.multiply(x, x))))))
    return (Rnl.isPositive(x))
      ? Rnl.fromNumber(temp)
      : Rnl.fromNumber(temp - Math.PI)
  },
  acsc(x) {
    return Rnl.fromNumber(Math.atn(-Rnl.toNumber(x)) + Math.PI)
  },
  exp(x) {
    return Rnl.exp(x)
  },
  log(x) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
  },
  ln(x) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
  },
  log10(x) {
    return Rnl.fromNumber(Math.log10(Rnl.toNumber(x)))
  },
  log2(x) {
    return Rnl.fromNumber(Math.log2(Rnl.toNumber(x)))
  },
  cosh(x) {
    // cosh(n) = (eⁿ + e⁻ⁿ) / 2
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber((Math.exp(num) + Math.exp(-num)) / 2)
  },
  sinh(x) {
    // sinh(n) = (eⁿ - e⁻ⁿ) / 2
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber((Math.exp(num) - Math.exp(-num)) / 2)
  },
  tanh(x) {
    // tanh(n) = (eⁿ - e⁻ⁿ) / (eⁿ + e⁻ⁿ)
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(
      (Math.exp(num) - Math.exp(-num)) / (Math.exp(num) + Math.exp(-num))
    )
  },
  sech(x) {
    // sech(n) = 2 / (eⁿ + e⁻ⁿ)
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(2 / (Math.exp(num) + Math.exp(-num)))
  },
  csch(x) {
    // csch(n) = 2 / (eⁿ - e⁻ⁿ)
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(2 / (Math.exp(num) - Math.exp(-num)))
  },
  coth(x) {
    // coth(n) = (eⁿ + e⁻ⁿ) / (eⁿ - e⁻ⁿ)
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(
      (Math.exp(num) + Math.exp(-num)) / (Math.exp(num) - Math.exp(-num))
    )
  },
  acosh(x) {
    // acosh(x) = log( x + sqrt(x - 1) × sqrt(x + 1) )
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(Math.log( num + Math.sqrt(num - 1) * Math.sqrt(num + 1) ))
  },
  asinh(x) {
    // asinh(x) = log(x + sqrt(x² + 1))
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(Math.log(num + Math.sqrt(Math.pow(num, 2) + 1)))
  },
  atanh(x) {
    // atanh(x) = [ log(1+x) - log(1-x) ] / 2
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber((Math.log(1 + num) - Math.log(1 - num) ) / 2)
  },
  asech(x) {
    // asech(x) = log( [sqrt(-x * x + 1) + 1] / x )
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(Math.log((Math.sqrt(-num * num + 1) + 1) / num))
  },
  ascsh(x) {
    // acsch(x) = log( sqrt(1 + 1/x²) + 1/x )
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber(Math.log(Math.sqrt(1 + 1 / Math.pow(num, 2)) + 1 / num))
  },
  asoth(x) {
    // acoth(x) = [ log(1 + 1/x) - log(1 - 1/x) ] / 2
    const num = Rnl.toNumber(x)
    return Rnl.fromNumber((Math.log(1 + 1 / num) - Math.log(1 - 1 / num)) / 2)
  },
  Gamma(x) {
    return gamma(x)
  },
  Γ(x) {
    return gamma(x)
  },
//  logGamma(x) {
//    if (Rnl.isNegative(x) || Rnl.isZero(x)) { return errorOprnd("LOGΓ") }
//    return logGamma(x)
//  },
//  logΓ(x) {
//    if (Rnl.isNegative(x) || Rnl.isZero(x)) { return errorOprnd("LOGΓ") }
//    return logGamma(x)
//  },
//  logFactorial(x) {
//    return logFactorial(x)
//  },
  sign(x) {
    return Rnl.isPositive(x) ? Rnl.one : Rnl.isZero ? Rnl.zero : negativeOne
  },
  cosd(x) {
    if (Rnl.areEqual(x, ninety)) { return Rnl.zero }
    if (Rnl.areEqual(x, sixty)) { return oneHalf }
    return this.cos(Rnl.multiply(x, piOver180))
  },
  sind(x) {
    if (Rnl.areEqual(x, thirty)) { return oneHalf }
    return this.sin(Rnl.multiply(x, piOver180))
  },
  tand(x) {
    if (Rnl.areEqual(x, fortyFive)) { return Rnl.one }
    if (Rnl.areEqual(x, ninety)) { return errorOprnd("TAN90", "90°") }
    return this.tan(Rnl.multiply(x, piOver180))
  },
  cotd(x) {
    return this.cot(Rnl.multiply(x, piOver180))
  },
  cscd(x) {
    return this.csc(Rnl.multiply(x, piOver180))
  },
  secd(x) {
    return this.sec(Rnl.multiply(x, piOver180))
  },
  acosd(x) {
    const y = this.acos(x)
    return y.dtype ? y : Rnl.divide(y, piOver180)
  },
  asind(x) {
    const y = this.asin(x)
    return y.dtype ? y : Rnl.divide(y, piOver180)
  },
  atand(x) {
    return Rnl.divide(this.atan(x), piOver180)
  },
  acotd(x) {
    const y = this.acot(x)
    return y.dtype ? y : Rnl.divide(y, piOver180)
  },
  acscd(x) {
    const y = this.acsc(x)
    return y.dtype ? y : Rnl.divide(y, piOver180)
  },
  asecd(x) {
    const y = this.asec(x)
    return y.dtype ? y : Rnl.divide(y, piOver180)
  },
  chr(x) {
    return String.fromCodePoint(Number(x))
  },
  round(x) {
    return Rnl.fromString(Rnl.toString(x, 0))
  }
}

const binary = {
  logn([n, x]) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(x)) / Math.log(Rnl.toNumber(n)))
  },
  roundFixed([x, n]) {
    return Rnl.fromString(Rnl.toString(x, n))
  },
  roundSignificant([x, n]) {
    return Rnl.fromString(Rnl.toStringSignificant(x, n))
  },
  atan2([x, y]) {
    return Rnl.fromNumber(Math.atan2(Rnl.toNumber(y), Rnl.toNumber(x)))
  },
  hypot([x, y]) {
    // sqrt(x^2)
    // https://www.johndcook.com/blog/2010/06/02/whats-so-hard-about-finding-a-hypotenuse/
    const max = Rnl.max(x, y)
    const r = Rnl.divide(Rnl.min(x, y), max)
    return Rnl.multiply(max, Rnl.sqrt(Rnl.increment(Rnl.multiply(r, r))))
  },
  gcd([m, n]) {
    return Rnl.gcd(m, n)
  },
  rms([x, y]) {
    return this.hypot(x, y)
  },
  binomial([x, y]) {
    return binomial(x, y)
  },
  zeros([m, n]) {
    return Matrix.zeros(Rnl.toNumber(m), Rnl.toNumber(n))
  }
}

const reduce = {
  max(list) {
    return list.reduce((max, e) => Rnl.max(max, e))
  },
  min(list) {
    return list.reduce((min, e) => Rnl.min(min, e))
  },
  sum(list) {
    return list.reduce((sum, e) => Rnl.add(sum, e))
  },
  product(list) {
    return list.reduce((sum, e) => Rnl.multiply(sum, e))
  },
  mean(list) {
    const sum = this.sum(list)
    return Rnl.divide(sum, Rnl.fromNumber(list.length))
  },
  median(list) {
    const max = this.max(list)
    const min = this.min(list)
    return Rnl.divide(Rnl.add(max, min), Rnl.two)
  },
  range(list) {
    return Rnl.subtract(this.max(list), this.min(list))
  },
  variance(list) {
    const sum = this.sum(list)
    const mean = Rnl.divide(sum, Rnl.fromNumber(list.length))
    const num = list.reduce((num, e) => Rnl.add(num, Rnl.pow(Rnl.subtract(e, mean), Rnl.two)))
    return Rnl.divide(num, Rnl.subtract(Rnl.fromNumber(list.length), Rnl.one))
  },
  stddev(list) {
    const variance = this.variance(list)
    return Rnl.power(variance, oneHalf)
  }
}

const lerp = (args, unitAware) => {
  // linear interpolation
  for (let i = 0; i < 3; i++) {
    if (!(args[i].dtype & dt.RATIONAL)) { return errorOprnd("") }
  }
  let expos = allZeros
  if (unitAware) {
    if (args[0].expos !== args[1].expos) { return errorOprnd("") }
    if (args[1].expos !== args[2].expos) { return errorOprnd("") }
    expos = args[0].expose
  }
  const v0 = args[0].value  // a vector
  const v1 = args[1].value  // another vector
  const x = args[2].value   // the input value
  // TODO: Use binary search
  for (let i = 0; i < v0.length - 1; i++) {
    if (Rnl.lessThanOrEqualTo(v0[i], x) & Rnl.lessThanOrEqualTo(x, v0[i + 1])) {
      const slope = Rnl.divide((Rnl.subtract(v1[i + 1], v1[i])),
        (Rnl.subtract(v0[i + 1], v0[i])))
      const value = Rnl.add(v1[i], Rnl.multiply(slope, (Rnl.subtract(x, v0[i]))))
      return { value, unit: expos, dtype: dt.RATIONAL }
    }
  }
}

export const Functions = Object.freeze({
  functionExpos,
  unary,
  binary,
  reduce,
  lerp
})

export const multivarFunction = (arity, functionName, args) => {
  // Deal with a function that may have multiple arguments.

  if (args.length === 1) {
    const list = Matrix.isVector(args[0])
      ? args[0].value
      : (args.dtype & dt.MATRIX)
      // TODO: fix the next line.
      ? args[0].value.flat()
      : args[0].value

    const value = Functions[arity][functionName](list)

    let dtype = args[0].dtype
    if (arity === "reduce") {
      // Mask off any matrix or vector indicator from the dtype
      if (dtype & dt.MATRIX) { dtype -= dt.MATRIX }
      if (dtype & dt.ROWVECTOR) { dtype -= dt.ROWVECTOR }
      if (dtype & dt.COLUMNVECTOR) { dtype -= dt.COLUMNVECTOR }
    }

    return [value, dtype]

  } else {
    // We have multiple arguments.
    // Is one of them a vector?
    let iArg = 0;
    let gotVector = false;
    let dtype = args[0].dtype

    for (iArg = 0; iArg < args.length; iArg++) {
      if (Matrix.isVector(args[iArg])) {
        gotVector = true
        dtype = args[iArg].dtype
        break
      }
    }
    const list = args.map(e => e.value)
    if (!gotVector) {
      return [ Functions[arity][functionName](list), args[0].dtype ]

    } else {
      const listClone = clone(list)
      const result = []
      for (let i = 0; i < list[iArg].length; i++) {
        listClone[iArg] = list[iArg][i]
        result.push(Functions[arity][functionName](listClone))
      }
      return [ result, dtype ]
    }
  }
}

