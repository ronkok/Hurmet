import { errorOprnd } from "./error"

/*
 * This file implements a rational number data type.
 * Each rational number, r, is held as an array containing two BigInts.
 * r[0] is the numerator and r[1] is the denominator.
 * Negative rationals have a negative numerator, not a negative denominator.
 *
 * The code in this file is heavily influenced by Chapter 5 of
 * __How JavaScript Works__ by Douglas Crockford
 */

const iZero = BigInt(0)
const iOne = BigInt(1)
const iTwo = BigInt(2)
const zero = [iZero, iOne]
const one = [iOne, iOne]
const two = [iTwo, iOne]
const pi = [BigInt("31415926535897932384626433832795028841971693993751"),
  BigInt("10000000000000000000000000000000000000000000000000")]
const e = [BigInt("2718281828459045235360287471352662497757247093699959574966"),
  BigInt("1000000000000000000000000000000000000000000000000000000000")]
// reduced Planck constant
const hbar = [BigInt(1054571817),
  BigInt("10000000000000000000000000000000000000000000")]

const intAbs = i => i >= iZero ? i : BigInt(-1) * i  // absolute value of a BigInt

// eslint-disable-next-line max-len
const numberPattern = "^(-?)(?:(0x[0-9A-Fa-f]+)|([0-9]+)(?: ([0-9]+)\\/([0-9]+)|(?:\\.([0-9]+))?(?:e([+-]?[0-9]+)|(%))?))"
const numberRegEx = new RegExp(numberPattern)
// Capturing groups:
//    [1] sign
//    [2] hexadecimal integer
//    [3] integer part
//    [4] numerator of a mixed fraction
//    [5] denominator of a mixed fraction
//    [6] decimal fraction of significand, not including decimal point
//    [7] exponent of a number in scientific notation
//    [8] percentage sign

const fromNumber = num => {
  // Convert a JavaScript Number to a rational.
  if (Number.isInteger(num)) {
    return [BigInt(num), iOne]
  } else {
    const parts = num.toExponential().match(numberRegEx)
    const decimalFrac = parts[6] || ""
    const exp = BigInt(parts[7]) - BigInt(decimalFrac.length)
    if (exp < 0) {
      return [BigInt(parts[1] + parts[3] + decimalFrac), BigInt(10) ** -exp]
    } else if (parts[5]) {
      const denominator = BigInt(parts[5])
      return normalize(
        [BigInt(parts[1] + parts[3]) * denominator + BigInt(parts[4]) ], denominator
      )
    } else {
      return normalize([BigInt(parts[1] + parts[3] + decimalFrac) * BigInt(10) ** exp, iOne])
    }
  }
}

const fromString = str => {
  // Convert an author's input string to a number.
  const parts = str.match(numberRegEx)
  let r
  if (!parts) {
    // TODO: write an error message.
  }
  if (parts[5]) {
    // mixed fraction
    const denominator = BigInt(parts[5])
    const numerator = BigInt(parts[1] + parts[3]) * denominator + BigInt(parts[4])
    r = normalize([numerator, denominator])

  } else if (parts[2]) {
    // hexadecimal
    r = [BigInt(parts[2]), iOne]

  } else {
    // decimal
    const decimalFrac = parts[6] || ""
    const numerator = BigInt(parts[3] + decimalFrac)
    const exp = parts[7]
      ? BigInt(parts[7]) - BigInt(decimalFrac.length)  // scientific notation.
      : parts[8]
      ? BigInt(-2) - BigInt(decimalFrac.length)  // percentage.
      : BigInt(0) - BigInt(decimalFrac.length);
    r = (exp < 0)
      ? [numerator, BigInt(10) ** -exp]
      : normalize([numerator * BigInt(10) ** exp, iOne])
  }
  if (parts[1]) { r = negate(r) }
  return r
}

const gcdi = (a, b) => {
  // Greatest common divisor of two big integers
  a = intAbs(a)
  b = intAbs(b)
  while (b !== iZero) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

const gcd = (m, n) => {
  // Greatest common divisor of two rationals
  if (!Rnl.isInteger(m) || !Rnl.isInteger(n)) { return errorOprnd("INT_ARG", "gcd") }
  return [gcdi(m[0] / m[1], n[0] / n[1]), iOne]
}

const normalize = r => {
  const [numerator, denominator] = r
  if (denominator === iOne) { return r }
  const gcD = gcdi(numerator, denominator)
  return gcD === iOne ? r : [numerator / gcD, denominator / gcD]
}

const isRational = a => {
  return Array.isArray(a) && a.length === 2
    && typeof a[0] === "bigint" && typeof a[1] === "bigint"
}

const isInteger = r => r[1] === iOne || (r[0] % r[1]) === iZero

const isZero = r => r[0] === iZero

const isNegative = r => r[0] < iZero
const isPositive = r => r[0] > iZero
const intSign = i => i >= iZero ? iOne : BigInt(-1)
const sign = r => isPositive(r) ? one : isZero(r) ? zero : negate(one)

const negate = r => [BigInt(-1) * r[0], r[1]]

const abs = r => {
  const numerator = r[0] < iZero ? BigInt(-1) * r[0] : r[0]
  return [numerator, r[1]]
}

const increment = r => [r[0] + r[1], r[1]]

const decrement = r => [r[0] - r[1], r[1]]

const floor = r => {
  if (r[0] % r[1] === iZero) { return [r[0] / r[1], iOne] }
  return (r[0] >= iZero)
    ? [r[0] / r[1], iOne]
    : [r[0] / r[1] - iOne, iOne]
}

const ceil = r => {
  if (r[0] % r[1] === iZero) { return [r[0] / r[1], iOne] }
  return (r[0] >= iZero)
    ? [r[0] / r[1] + iOne, iOne]
    : [r[0] / r[1], iOne]
}

const add = (a, b) => {
  return a[1] === b[1]
    ? [a[0] + b[0], a[1]]
    : normalize([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
}

const subtract = (a, b) => {
  return (a[1] === b[1])
    ? [a[0] - b[0], a[1]]
    : normalize([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
}

const multiply = (a, b) => [a[0] * b[0], a[1] * b[1]]

const divide = (a, b) => {
  let numerator = a[0] * b[1]
  let denominator = a[1] * b[0]
  if (denominator < 0) {
    // Move the negative from the denominator to the numerator.
    numerator *= BigInt(-1)
    denominator *= BigInt(-1)
  }
  return [numerator, denominator]
}

const power = (a, b) => {
  if (b[0] === iZero) {
    return [iOne, iOne]
  } else {
    b = normalize(b)
    let result
    try {
      result = isInteger(b) && isNegative(b)
        ? [a[1] ** (BigInt(-1) * b[0]), a[0] ** (BigInt(-1) * b[0])]
        : isInteger(b)
        ? [a[0] ** b[0], a[1] ** b[0]]
        : isPositive(a) || greaterThan(b, one) || lessThan(b, negate(one))
        ? fromNumber(toNumber(a) ** toNumber(b))
        : areEqual(mod(b, two), one)
        ? fromNumber(-1 * (-1 * toNumber(a)) ** toNumber(b))
        : errorOprnd("BAD_ROOT")
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      result = fromNumber(toNumber(a) ** toNumber(b))
    }
    return result
  }
}

const sqrt = r => fromNumber(Math.sqrt(toNumber(r)))

const exp = r => fromNumber(Math.exp(toNumber(r)))

const reciprocal = r => {
  let numerator = r[1]
  let denominator = r[0]
  if (denominator < 0) {
    numerator *= BigInt(-1)
    denominator *= BigInt(-1)
  }
  return [numerator, denominator]
}

const hypot = (a, b) => {
  // Ref: https://www.johndcook.com/blog/2010/06/02/whats-so-hard-about-finding-a-hypotenuse/
  const absA = abs(a)
  const absB = abs(b)
  const maximum = max(absA, absB)
  const minimum = min(absA, absB)
  const r = Rnl.divide(minimum, maximum)
  return Rnl.multiply(maximum, sqrt(Rnl.increment(Rnl.multiply(r, r))))
}

const mod = (a, b) => {
  const quotient = divide(normalize(a), normalize(b))
  return [intAbs(quotient[0] % quotient[1]), iOne]
}

const rem = (a, b) => {
  const quotient = divide(normalize(a), normalize(b))
  return [quotient[0] % quotient[1], iOne]
}

const areEqual = (a, b) => {
  return (a[1] === b[1])
    ? a[0] === b[0]
    : a[0] * b[1] === a[1] * b[0]
}

const lessThan = (a, b) => {
  return (isNegative(a) !== isNegative(b))
    ? isNegative(a)
    : isNegative(subtract(a, b))
}

const greaterThan = (a, b) => {
  return (isPositive(a) !== isPositive(b))
    ? isPositive(a)
    : isPositive(subtract(a, b))
}

const lessThanOrEqualTo = (a, b) => lessThan(a, b) || areEqual(a, b)

const greaterThanOrEqualTo = (a, b) => greaterThan(a, b) || areEqual(a, b)

const max = (a, b) => greaterThan(a, b) ? [a[0], a[1]] : [b[0], b[1]]

const min = (a, b) => lessThan(a, b) ? [a[0], a[1]] : [b[0], b[1]]

const cos = x => {
  return areEqual(x, divide(pi, two))
    ? zero
    : fromNumber(Math.cos(toNumber(x)))
}

const sin = x => fromNumber(Math.sin(toNumber(x)))

const tan = x => {
  if (areEqual(x, divide(pi, two))) {
    return errorOprnd("TAN90", "π/2")
  }
  return fromNumber(Math.tan(toNumber(x)))
}

const cosh = x => {
  // cosh(n) = (eⁿ + e⁻ⁿ) / 2
  const num = toNumber(x)
  return fromNumber((Math.exp(num) + Math.exp(-num)) / 2)
}

const sinh = x => {
  // sinh(n) = (eⁿ - e⁻ⁿ) / 2
  const num = toNumber(x)
  return fromNumber((Math.exp(num) - Math.exp(-num)) / 2)
}

const tanh = x => {
  // tanh(n) = (eⁿ - e⁻ⁿ) / (eⁿ + e⁻ⁿ)
  const num = toNumber(x)
  return fromNumber(
    (Math.exp(num) - Math.exp(-num)) / (Math.exp(num) + Math.exp(-num))
  )
}

const toNumber = r => {
  // Return a JavaScript Number
  const num = Number(r[0]) / Number(r[1])  // May be imprecise.
  if (!isNaN(num) && num !== Infinity ) { return num }
  const numStr = toStringSignificant(r, 20)
  return Number(numStr)
}

const toStringSignificant = (r, numSignificantDigits) => {
  // Return a string rounded to numSignificantDigits.
  if (isZero(r)) {
    return "0"
  } else {
    const quotient = intAbs(r[0] / r[1])
    if (quotient > 0) {
      return toString(r, numSignificantDigits - String(quotient).length)
    } else {
      const inverseQuotientLength = String(intAbs(r[1] / r[0])).length
      return toString(r, inverseQuotientLength + numSignificantDigits - 1)
    }
  }
}

const toString = (r, numDigitsAfterDecimal) => {
  // Return a string rounded to numDigitsAfterDecimal.
  if (isZero(r)) {
    return "0"
  } else if (numDigitsAfterDecimal < 0) {
    const N = -numDigitsAfterDecimal
    const significand = toString(divide(r, [BigInt(10) ** BigInt(N), iOne]), 0)
    return significand + "0".repeat(N)
  } else {
    const [numerator, denominator] = normalize(r)
    const quotient = numerator / denominator
    let remainder = numerator % denominator
    let result = String(quotient)
    if (remainder === iZero && numDigitsAfterDecimal > 0) {
      result += "." + "0".repeat(numDigitsAfterDecimal)
    } else if (remainder !== iZero) {
      remainder = intAbs(remainder)
      const newNumerator = remainder * (BigInt(10) ** BigInt(numDigitsAfterDecimal))
      let fractus = newNumerator / denominator
      const residue = newNumerator % denominator
      if (numDigitsAfterDecimal === 0) {
        return (intAbs(iTwo * residue) >= intAbs(denominator))
          ? String((intAbs(quotient) + iOne) * intSign(quotient))
          : result
      }
      if (intAbs(iTwo * residue) >= intAbs(denominator)) {
        fractus = fractus + iOne
      }
      result += "." + String(fractus).padStart(numDigitsAfterDecimal, "0")
    }
    return result
  }
}

// eslint-disable-next-line max-len
const preComputedFactorials = ["1", "1", "2", "6", "24", "120", "720", "5040", "40320", "362880", "3628800", "39916800", "479001600", "6227020800", "87178291200", "1307674368000", "20922789888000", "355687428096000", "6402373705728000", "121645100408832000", "2432902008176640000", "51090942171709440000", "1124000727777607680000", "25852016738884976640000", "620448401733239439360000", "15511210043330985984000000", "403291461126605635584000000", "10888869450418352160768000000", "304888344611713860501504000000", "8841761993739701954543616000000", "265252859812191058636308480000000", "8222838654177922817725562880000000", "263130836933693530167218012160000000", "8683317618811886495518194401280000000", "295232799039604140847618609643520000000", "10333147966386144929666651337523200000000", "371993326789901217467999448150835200000000", "13763753091226345046315979581580902400000000", "523022617466601111760007224100074291200000000", "20397882081197443358640281739902897356800000000", "815915283247897734345611269596115894272000000000", "33452526613163807108170062053440751665152000000000", "1405006117752879898543142606244511569936384000000000", "60415263063373835637355132068513997507264512000000000", "2658271574788448768043625811014615890319638528000000000", "119622220865480194561963161495657715064383733760000000000", "5502622159812088949850305428800254892961651752960000000000", "258623241511168180642964355153611979969197632389120000000000", "12413915592536072670862289047373375038521486354677760000000000", "608281864034267560872252163321295376887552831379210240000000000", "30414093201713378043612608166064768844377641568960512000000000000", "1551118753287382280224243016469303211063259720016986112000000000000", "80658175170943878571660636856403766975289505440883277824000000000000", "4274883284060025564298013753389399649690343788366813724672000000000000", "230843697339241380472092742683027581083278564571807941132288000000000000", "12696403353658275925965100847566516959580321051449436762275840000000000000", "710998587804863451854045647463724949736497978881168458687447040000000000000", "40526919504877216755680601905432322134980384796226602145184481280000000000000", "2350561331282878571829474910515074683828862318181142924420699914240000000000000", "138683118545689835737939019720389406345902876772687432540821294940160000000000000", "8320987112741390144276341183223364380754172606361245952449277696409600000000000000", "507580213877224798800856812176625227226004528988036003099405939480985600000000000000", "31469973260387937525653122354950764088012280797258232192163168247821107200000000000000", "1982608315404440064116146708361898137544773690227268628106279599612729753600000000000000", "126886932185884164103433389335161480802865516174545192198801894375214704230400000000000000", "8247650592082470666723170306785496252186258551345437492922123134388955774976000000000000000", "544344939077443064003729240247842752644293064388798874532860126869671081148416000000000000000", "36471110918188685288249859096605464427167635314049524593701628500267962436943872000000000000000", "2480035542436830599600990418569171581047399201355367672371710738018221445712183296000000000000000", "171122452428141311372468338881272839092270544893520369393648040923257279754140647424000000000000000", "11978571669969891796072783721689098736458938142546425857555362864628009582789845319680000000000000000", "850478588567862317521167644239926010288584608120796235886430763388588680378079017697280000000000000000", "61234458376886086861524070385274672740778091784697328983823014963978384987221689274204160000000000000000", "4470115461512684340891257138125051110076800700282905015819080092370422104067183317016903680000000000000000", "330788544151938641225953028221253782145683251820934971170611926835411235700971565459250872320000000000000000", "24809140811395398091946477116594033660926243886570122837795894512655842677572867409443815424000000000000000000", "1885494701666050254987932260861146558230394535379329335672487982961844043495537923117729972224000000000000000000", "145183092028285869634070784086308284983740379224208358846781574688061991349156420080065207861248000000000000000000", "11324281178206297831457521158732046228731749579488251990048962825668835325234200766245086213177344000000000000000000", "894618213078297528685144171539831652069808216779571907213868063227837990693501860533361810841010176000000000000000000", "71569457046263802294811533723186532165584657342365752577109445058227039255480148842668944867280814080000000000000000000", "5797126020747367985879734231578109105412357244731625958745865049716390179693892056256184534249745940480000000000000000000", "475364333701284174842138206989404946643813294067993328617160934076743994734899148613007131808479167119360000000000000000000", "39455239697206586511897471180120610571436503407643446275224357528369751562996629334879591940103770870906880000000000000000000", "3314240134565353266999387579130131288000666286242049487118846032383059131291716864129885722968716753156177920000000000000000000", "281710411438055027694947944226061159480056634330574206405101912752560026159795933451040286452340924018275123200000000000000000000", "24227095383672732381765523203441259715284870552429381750838764496720162249742450276789464634901319465571660595200000000000000000000", "2107757298379527717213600518699389595229783738061356212322972511214654115727593174080683423236414793504734471782400000000000000000000", "185482642257398439114796845645546284380220968949399346684421580986889562184028199319100141244804501828416633516851200000000000000000000", "16507955160908461081216919262453619309839666236496541854913520707833171034378509739399912570787600662729080382999756800000000000000000000", "1485715964481761497309522733620825737885569961284688766942216863704985393094065876545992131370884059645617234469978112000000000000000000000", "135200152767840296255166568759495142147586866476906677791741734597153670771559994765685283954750449427751168336768008192000000000000000000000", "12438414054641307255475324325873553077577991715875414356840239582938137710983519518443046123837041347353107486982656753664000000000000000000000", "1156772507081641574759205162306240436214753229576413535186142281213246807121467315215203289516844845303838996289387078090752000000000000000000000", "108736615665674308027365285256786601004186803580182872307497374434045199869417927630229109214583415458560865651202385340530688000000000000000000000", "10329978488239059262599702099394727095397746340117372869212250571234293987594703124871765375385424468563282236864226607350415360000000000000000000000", "991677934870949689209571401541893801158183648651267795444376054838492222809091499987689476037000748982075094738965754305639874560000000000000000000000", "96192759682482119853328425949563698712343813919172976158104477319333745612481875498805879175589072651261284189679678167647067832320000000000000000000000", "9426890448883247745626185743057242473809693764078951663494238777294707070023223798882976159207729119823605850588608460429412647567360000000000000000000000", "933262154439441526816992388562667004907159682643816214685929638952175999932299156089414639761565182862536979208272237582511852109168640000000000000000000000", "93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000"];
// eslint-disable-next-line max-len
const preComputedDoubleFactorials = ["1", "1", "2", "3", "8", "15", "48", "105", "384", "945", "3840", "10395", "46080", "135135", "645120", "2027025", "10321920", "34459425", "185794560", "654729075", "3715891200", "13749310575", "81749606400", "316234143225", "1961990553600", "7905853580625", "51011754393600", "213458046676875", "1428329123020800"];

const factorial = (n) => {
  if (lessThan(n, [BigInt(101), iOne])) {
    return fromString(preComputedFactorials[toNumber(n)])
  } else {
    return lanczos(increment(n))
  }
}

const doubleFactorial = n => {
  if (lessThan(n, [BigInt(29), iOne])) {
    return fromString(preComputedDoubleFactorials[toNumber(n)])
  } else {
    let r = n
    for (let i = Rnl.toNumber(n) - 2; i > 0; i -= 2) {
      r = multiply(r, fromNumber(i))
    }
    return r
  }
}

const lanczos = xPlusOne => {
  // Lanczos approximation of Gamma function.
  // Coefficients are from 2004 PhD thesis by Glendon Pugh.
  // *An Analysis of the Lanczos Gamma Approximation*
  // The following equation is from p. 116 of the Pugh thesis:
  // Γ(x+1) ≈ 2 * √(e / π) * ((x + 10.900511 + 0.5) / e) ^ (x + 0.5) * sum
  const x = subtract(xPlusOne, one)
  const term1 = multiply(two, sqrt(divide(e, pi)))
  const term2 = power(divide(add(x, fromNumber(11.400511)), e), add(x, [iOne, iTwo]))

  // Coefficients from Pugh, Table 8.5
  const d = ["2.48574089138753565546e-5", "1.05142378581721974210",
    "-3.45687097222016235469", "4.51227709466894823700", "-2.98285225323576655721",
    "1.05639711577126713077", "-0.195428773191645869583", "0.0170970543404441224307",
    "-0.000571926117404305781283", "0.00000463399473359905636708",
    "-0.00000000271994908488607703910"]

  // sum = d_0 + ∑_(k=1)^10 d_k/(x+k)
  let sum = fromString(d[0])
  for (let k = 1; k <= 10; k++) {
    sum = add(sum, divide(fromString(d[k]), add(x, fromNumber(k))))
  }

  return multiply(multiply(term1, term2), sum)
}

export const Rnl = Object.freeze({
  fromNumber,
  fromString,
  normalize,
  isRational,
  isInteger,
  isZero,
  isNegative,
  isPositive,
  sign,
  negate,
  abs,
  increment,
  decrement,
  exp,
  floor,
  ceil,
  add,
  subtract,
  multiply,
  divide,
  reciprocal,
  gcd,
  hbar,
  mod,
  rem,
  hypot,
  one,
  pi,
  power,
  sqrt,
  two,
  cos,
  sin,
  tan,
  cosh,
  sinh,
  tanh,
  areEqual,
  lessThan,
  greaterThan,
  lessThanOrEqualTo,
  greaterThanOrEqualTo,
  factorial,
  doubleFactorial,
  lanczos,
  max,
  min,
  numberPattern,
  toNumber,
  toString,
  toStringSignificant,
  zero
})
