import { dt, allZeros } from "./constants"
import { Rnl } from "./rational"
import { Cpx } from "./complex"
import { clone } from "./utils"
import { unitsAreCompatible } from "./units"
import { Matrix, isVector, isMatrix } from "./matrix"
import { errorOprnd } from "./error"

const negativeOne = Object.freeze(Rnl.negate(Rnl.one))
const oneHalf = [BigInt(1), BigInt(2)]
const thirty = [BigInt(30), BigInt(1)]
const fortyFive = [BigInt(45), BigInt(1)]
const sixty = [BigInt(60), BigInt(1)]
const ninety = [BigInt(90), BigInt(1)]
const halfPi = Object.freeze(Rnl.divide(Rnl.pi, Rnl.two))

const functionExpos = (functionName, args) => {
  const numArgs = args.length

  const expos = numArgs === 1 ? args[0].unit.expos : null

  switch (functionName) {
    case "abs":
    case "round":
    case "roundn":
    case "sign":
    case "trace":
    case "fetch":
      return expos

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
      if (!unitsAreCompatible(expos, allZeros)) {
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
    case "Γ":
    case "lgamma":
    case "lfact":
    case "factorial":
      if (!unitsAreCompatible(expos, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return allZeros

    case "sqrt":
      return expos.map(e => e / 2)

    case "gcd":
    case "mht":
      if (!unitsAreCompatible(expos, allZeros)) {
        return errorOprnd("UNIT_IN", functionName)
      }
      return functionName === "hmt" ? [1, 0, 0, 0, 0, 0, 0, 0] : allZeros

    case "atan2":
    case "hypot":
    case "rms":
    case "ceil":
    case "floor":
    case "sum":
    case "mean":
    case "median":
    case "min":
    case "max":
    case "range":
    case "stddev":
    case "variance": {
      const x = args[0].unit.expos
      for (let i = 1; i < args.length; i++) {
        const y = args[i].unit.expos
        if (x.length !== y.length) { return errorOprnd("UNIT_ARG", functionName) }
        for (let j = 0; j < x.length; j++) {
          if (x[j] !== y[j]) { return errorOprnd("UNIT_ARG", functionName) }
        }
      }
      return functionName === "atan2" ? allZeros : x
    }

    case "real":
    case "imag":
    case "angle":
    case "conj":
      return allZeros

    case "product": {
      const expos = clone(args[0].unit.expos)
      for (let i = 1; i < args.length; i++) {
        const p = args[i].unit.expos
        expos.map((e, j) => e + p[j])
      }
      return expos
    }

    default:
      return errorOprnd("F_NAME", functionName)
  }
}

const gamma = x => {
  if (Rnl.isZero(x)) {
    return errorOprnd("Γ0")
  } else if (Rnl.isPositive(x) && Rnl.isInteger(x) && Rnl.lessThan(x, Rnl.fromNumber(101))) {
    return Rnl.factorial(Rnl.subtract(x, Rnl.one))
  } else if (Rnl.isNegative(x) && Rnl.isInteger(x)) {
    return errorOprnd("ΓPOLE")
  } else if (Rnl.lessThan(x, oneHalf)) {
    // reflection formula
    return Rnl.fromNumber(Math.PI / (Math.sin(Math.PI * Rnl.toNumber(x)))
      * Rnl.toNumber(gamma(Rnl.subtract(Rnl.one, x))))
  } else {
    return Rnl.lanczos(x)
  }
}

const lgamma = r => {
  // Returns natural logarithm of the Gamma function.
  // Ref: https://www.johndcook.com/blog/2010/08/16/how-to-compute-log-factorial/
  if (Rnl.isZero(r)) { return errorOprnd("Γ0") }
  if (Rnl.isNegative(r)) { return errorOprnd("LOGΓ") }
  if (Rnl.areEqual(r, Rnl.one) || Rnl.areEqual(r, Rnl.two)) { return Rnl.zero }
  if (Rnl.lessThanOrEqualTo(r, Rnl.fromNumber(14))) {
    return Rnl.fromNumber(Math.log(Rnl.toNumber(gamma(r))))
  } else {
    const x = Rnl.toNumber(r)
    // eslint-disable-next-line max-len
    const y = (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + 1 / (12 * x) - 1 / (360 * x ** 3) + 1 / (1260 * x ** 5) - 1 / (1680 * x ** 7) + 5 / (540 * x ** 9)
    //  Error bounded by: -691/(360360 * x^11), 16 significant digits
    return Rnl.fromNumber(y)
  }
}

const binomial = (n, k) => {
  // (n \atop k) = n! / (k! (n - k)!)
  //             = exp(log!(n) - [log!(k) + log!(n - k)])
  if (Rnl.areEqual(n, k)) { return Rnl.one }
  if (Rnl.isZero(n)) { return Rnl.zero }
  if (Rnl.isNegative(k)) { return Rnl.zero }
  if (Rnl.lessThan(n, k)) { return Rnl.zero }

  if (Rnl.isInteger(n) && Rnl.isInteger(k) && Rnl.isPositive(n) && Rnl.isPositive(k)) {
    // positive integers
//    if (Rnl.lessThan(n, twenty)) {
    return Rnl.divide(Rnl.factorial(n),
      Rnl.multiply(Rnl.factorial(k), Rnl.factorial(Rnl.subtract(n, k))))
//    } else {
//      return Rnl.fromNumber(Math.round(Math.exp(Rnl.toNumber(
//        Rnl.subtract(lfact(n),
//          Rnl.add(lfact(k), lfact(Rnl.subtract(n, k))))))))
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
  scalar: {
    // Functions that take one real argument.
    abs(x)  { return Rnl.abs(x) },
    angle(x) { return errorOprnd("NA_REAL", "angle") },
    real(x)   { return errorOprnd("NA_REAL", "real") },
    imag(x)   { return errorOprnd("NA_REAL", "imag") },
    conj(x)   { return errorOprnd("NA_REAL", "conj") },
    cos(x)  { return Rnl.cos(x) },
    sin(x)  { return Rnl.sin(x) },
    tan(x)  { return Rnl.tan(x) },
    cosh(x) { return Rnl.cosh(x) },
    sinh(x) { return Rnl.sinh(x) },
    tanh(x) { return Rnl.tanh(x) },
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
      return Rnl.isZero(x) ? errorOprnd("LOG_ZERO") : Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
    },
    ln(x) {
      return Rnl.isZero(x) ? errorOprnd("LOG_ZERO") : Rnl.fromNumber(Math.log(Rnl.toNumber(x)))
    },
    log10(x) {
      return Rnl.isZero(x)
        ? errorOprnd("LOG_ZERO")
        : Rnl.fromNumber(Math.log10(Rnl.toNumber(x)))
    },
    log2(x) {
      return Rnl.isZero(x)
        ? errorOprnd("LOG_ZERO")
        : Rnl.fromNumber(Math.log2(Rnl.toNumber(x)))
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
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x)
      return Rnl.fromNumber(Math.log((Math.sqrt(-num * num + 1) + 1) / num))
    },
    ascsh(x) {
      // acsch(x) = log( sqrt(1 + 1/x²) + 1/x )
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x)
      return Rnl.fromNumber(Math.log(Math.sqrt(1 + 1 / Math.pow(num, 2)) + 1 / num))
    },
    acoth(x) {
      // acoth(x) = [ log(1 + 1/x) - log(1 - 1/x) ] / 2
      if (Rnl.isZero(x)) { return errorOprnd("DIV") }
      const num = Rnl.toNumber(x)
      return Rnl.fromNumber((Math.log(1 + 1 / num) - Math.log(1 - 1 / num)) / 2)
    },
    ceil(x) {
      return Rnl.ceil(x)
    },
    floor(x) {
      return Rnl.floor(x)
    },
    gamma(x) {
      return gamma(x)
    },
    Γ(x) {
      return gamma(x)
    },
    lgamma(x) {
      if (Rnl.isNegative(x) || Rnl.isZero(x)) { return errorOprnd("LOGΓ") }
      return lgamma(x)
    },
    lfact(x) {
      if (Rnl.isNegative(x) || !Rnl.isInteger(x)) { return errorOprnd("FACT") }
      return lgamma(Rnl.add(x, Rnl.one))
    },
    factorial(x) {
      return Rnl.factorial(x)
    },
    sign(x) {
      return Rnl.isPositive(x) ? Rnl.one : Rnl.isZero(x) ? Rnl.zero : negativeOne
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
    Char(x) {
      return String.fromCodePoint(Rnl.toNumber(x))
    },
    sqrt(x) {
      const y = [BigInt(1), BigInt(2)]
      return Cpx.isComplex(x) || (Rnl.isNegative(x))
          ? Cpx.power([x, Rnl.zero], y)
          : Rnl.power(x, y)
    },
    round(x) {
      return Rnl.fromString(Rnl.toString(x, 0))
    }
  },
  complex: {
    // Functions that take one complex argument.
    abs(z)   { return Cpx.abs(z) },
    angle(z) { return Cpx.angle(z) },
    real(z)  { return z[0] },
    imag(z)  { return z[1] },
    conj(z)  { return Cpx.conjugate(z) },
    cos(z)   { return Cpx.cos(z) },
    sin(z)   { return Cpx.sin(z) },
    asin(z)  { return Cpx.asin(z) },
    atan(z)  { return Cpx.atan(z) },
    acos(z)  { return Cpx.subtract([halfPi, Rnl.zero], Cpx.asin(z))}, // π/2 - arcsin(z)
    tan(z)   { return Cpx.divide(Cpx.sin(z), Cpx.cos(z)) },
    cot(z)   { return Cpx.divide(Cpx.cos(z), Cpx.sin(z)) },
    sec(z) {
      const c = Cpx.cos(z)
      return c.dtype ? c : Cpx.inverse(c)
    },
    csc(z) {
      const s = Cpx.sin(z)
      return s.dtype ? s : Cpx.inverse(s)
    },
    asec(z) {
      // acos(inverse(z))
      const inv = Cpx.inverse(z)
      return Cpx.subtract([halfPi, Rnl.zero], Cpx.asin(inv))
    },
    acot(z) { return Cpx.atan(Cpx.inverse(z)) },
    acsc(z) {
      return Cpx.asin(Cpx.inverse(z))
    },
    exp(z) {
      return Cpx.exp(z)
    },
    log(z) {
      return Cpx.log(z)
    },
    ln(z) {
      return Cpx.log(z)
    },
    log10(z) {
      return Rnl.fromNumber(Math.log10(Rnl.toNumber(z)))
    },
    log2(z) {
      return Rnl.fromNumber(Math.log2(Rnl.toNumber(z)))
    },
    cosh(z) {
      // cosh(z) = (eᶻ + e⁻ᶻ) / 2
      return Cpx.divide(Cpx.add(Cpx.exp(z), Cpx.exp(Cpx.negate(z))), [Rnl.two, Rnl.zero])
    },
    sinh(z) {
      // sinh(z) = (eᶻ - e⁻ᶻ) / 2
      return Cpx.divide(Cpx.subtract(Cpx.exp(z), Cpx.exp(Cpx.negate(z))), [Rnl.two, Rnl.zero])
    },
    tanh(z) {
      // tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)
      const ez = Cpx.exp(z)
      const eMinuxZ = Cpx.exp(Cpx.negate(z))
      return Cpx.divide(Cpx.subtract(ez, eMinuxZ), Cpx.add(ez, eMinuxZ))
    },
    sech(z) {
      // sech(z) = 2 / (eᶻ + e⁻ᶻ)
      return Cpx.divide([Rnl.two, Rnl.zero], Cpx.add(Cpx.exp(z), Cpx.exp(Cpx.negate(z))))
    },
    csch(z) {
      // csch(z) = 2 / (eᶻ - e⁻ᶻ)
      return Cpx.divide([Rnl.two, Rnl.zero], Cpx.subtract(Cpx.exp(z), Cpx.exp(Cpx.negate(z))))
    },
    coth(z) {
      // coth(z) = (eᶻ + e⁻ᶻ) / (eᶻ - e⁻ᶻ)
      const ez = Cpx.exp(z)
      const eMinuxZ = Cpx.exp(Cpx.negate(z))
      return Cpx.divide(Cpx.add(ez, eMinuxZ), Cpx.subtract(ez, eMinuxZ))
    },
    acosh(z) {
      return Cpx.acosh(z)
    },
    asinh(z) {
      return Cpx.asinh(z)
    },
    atanh(z) {
      return Cpx.atanh(z)
    },
    asech(z) {
      return Cpx.acosh(Cpx.inverse(z))
    },
    acsch(z) {
      return Cpx.asinh(Cpx.inverse(z))
    },
    acoth(z) {
      return Cpx.atanh(Cpx.inverse(z))
    },
    ceil(z) {
      return errorOprnd("NA_COMPL_OP", "ceil")
    },
    floor(z) {
      return errorOprnd("NA_COMPL_OP", "ceil")
    },
    gamma(z) {
      return Cpx.gamma(z)
    },
    Γ(z) {
      return Cpx.gamma(z)
    },
    lgamma(z) {
      // TODO: complex log of gamma()
      return errorOprnd("NA_COMPL_OP", "lgamma")
    },
    factorial(z) {
      return errorOprnd("NA_COMPL_OP", "factorial")
    },
    sign(z) {
      if (Rnl.isZero(z[1]) && Rnl.isPositive(z[0])) {
        return Rnl.one
      } else if (Rnl.isZero(z[1]) && Rnl.isNegative(z[0])) {
        return Rnl.negate(Rnl.one)
      } else {
        return Cpx.divide(z, [Cpx.abs(z), Rnl.zero])
      }
    },
    round(z) {
      // TODO: complex round function
      return errorOprnd("NA_COMPL_OP", "round")
    }
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
  stringFixed([x, n]) {
    return Rnl.toString(x, n)
  },
  stringSignificant([x, n]) {
    return Rnl.toStringSignificant(x, n)
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
  ones([m, n]) {
    return Matrix.ones(Rnl.toNumber(m), Rnl.toNumber(n))
  },
  zeros([m, n]) {
    return Matrix.zeros(Rnl.toNumber(m), Rnl.toNumber(n))
  },
  mod([x, y]) {
    return Rnl.mod(x, y)
  },
  rem([x, y]) {
    return Rnl.rem(x, y)
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
  },
  accumulate(list) {
    const v = new Array(list.length).fill(0)
    v[0] = list[0]
    for (let i = 1; i < list.length; i++) {
      v[i] = Rnl.add(v[i - 1], list[i])
    }
    return v
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
    expos = args[0].expos
  }
  const output = Object.create(null)
  output.unit = Object.create(null)
  output.unit.expos = expos
  output.dtype = dt.RATIONAL

  const v0 = args[0].value  // a vector
  const v1 = args[1].value  // another vector
  const x = args[2].value   // the input value
  // TODO: Use binary search
  for (let i = 0; i < v0.length - 1; i++) {
    if (Rnl.lessThanOrEqualTo(v0[i], x) & Rnl.lessThanOrEqualTo(x, v0[i + 1])) {
      const slope = Rnl.divide((Rnl.subtract(v1[i + 1], v1[i])),
        (Rnl.subtract(v0[i + 1], v0[i])))
      output.value = Rnl.add(v1[i], Rnl.multiply(slope, (Rnl.subtract(x, v0[i]))))
      return Object.freeze(output)
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
    const list = isVector(args[0])
      ? args[0].value
      : (args.dtype & dt.MATRIX)
      // TODO: fix the next line.
      ? args[0].value.flat()
      : args[0].value

    const value = Functions[arity][functionName](list)

    let dtype = args[0].dtype
    if (arity === "reduce" && functionName !== "accumulate") {
      // Mask off any matrix or vector indicator from the dtype
      if (dtype & dt.MATRIX) { dtype -= dt.MATRIX }
      if (dtype & dt.ROWVECTOR) { dtype -= dt.ROWVECTOR }
      if (dtype & dt.COLUMNVECTOR) { dtype -= dt.COLUMNVECTOR }
    }

    return [value, dtype]

  } else if (functionName === "sum" && args.length === 2 && isMatrix(args[0])
    && args[1].dtype === dt.RATIONAL) {
    if (Rnl.areEqual(args[1].value, Rnl.two)) {
      const dtype = dt.COLUMNVECTOR + dt.RATIONAL
      const result = args[0].value.map(row => row.reduce((sum, e) => Rnl.add(sum, e)))
      return [ result, dtype ]
    } else if (Rnl.areEqual(args[1].value, Rnl.one)) {
      const dtype = dt.ROWVECTOR + dt.RATIONAL
      const result = Matrix.transpose(args[0]).value.map(
        row => row.reduce((sum, e) => Rnl.add(sum, e))
      )
      return [ result, dtype ]
    } else {
      return [errorOprnd("BAD_SUM"), dt.ERROR]
    }
  } else {
    // We have multiple arguments.
    // Is one of them a vector or a matrix?
    let iArg = 0;
    let gotVector = false;
    let gotMatrix = false
    let dtype = args[0].dtype

    for (iArg = 0; iArg < args.length; iArg++) {
      if (isVector(args[iArg])) {
        gotVector = true
        dtype = args[iArg].dtype
        break
      } else if (isMatrix(args[iArg])) {
        gotMatrix = true
        dtype = args[iArg].dtype
        break
      }
    }
    const list = args.map(e => e.value)
    if (!(gotVector || gotMatrix)) {
      const result = Functions[arity][functionName](list)
      return functionName === "zeros" || functionName === "ones"
        ? [result.value, result.dtype]
        : [result, args[0].dtype]

    } else {
      const result = []
      if (gotVector) {
        const listClone = clone(list)
        for (let i = 0; i < list[iArg].length; i++) {
          listClone[iArg] = list[iArg][i]
          result.push(Functions[arity][functionName](listClone))
        }
      } else {
        const listClone = clone(list)
        for (let i = 0; i < list[iArg].length; i++) {
          result.push([])
          for (let j = 0; j < list[iArg][0].length; j++) {
            listClone[iArg] = list[iArg][i][j]
            result[i].push(Functions[arity][functionName](listClone))
          }
        }
      }
      return [ result, dtype ]
    }
  }
}

