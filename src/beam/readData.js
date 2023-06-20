import { Rnl } from "../rational.js"
import { unitFromUnitName } from "../units.js"
import { loadCombinations } from "./loadCombinations.js"

const ftRegEx = /′/g
const numberRegEx = new RegExp(Rnl.numberPattern)
const metricLengths = ["m", "cm", "mm"];
const vars = Object.create(null)

const readNumber = str => {
  const matches = numberRegEx.exec(str)
  if (matches) {
    const numStr = matches[0];
    return [Rnl.fromString(numStr), numStr.length];
  } else {
    return ["Error", null]
  }
}

const convertToBaseUnit = (num, unitName) => {
  const unit = unitFromUnitName(unitName, vars)
  return Rnl.multiply(Rnl.add(num, unit.gauge), unit.factor)
}

export const readInputData = data => {
  const input = Object.create(null)
  // Set some defaults
  input.nodes = [];
  input.spanLength = [];
  input.loads = [];
  input.E = 1
  input.I = 1
  input.LLF = 0
  input.SDS = 0
  input.k = 0
  input.SI = false
  input.combinations = "service"
  // Read the input and overwrite the defaults.
  for (let i = 0; i < data[0].length; i++) {
    const item = data[0][i].trim()
    let datum = data[1][i].trim()
    switch (item) {
      case "E": {
        const [E, pos] = readNumber(datum)
        if (typeof E === "string") { return "Error. Non-numeric E." }
        const unitName = datum.slice(pos).trim()
        input.E = Rnl.toNumber(convertToBaseUnit(E, unitName))
        break
      }

      case "I": {
        const [I, pos] = readNumber(datum)
        if (typeof I === "string") { return "Error. Non-numeric I." }
        const unitName = datum.slice(pos).trim()
        input.I = Rnl.toNumber(convertToBaseUnit(I, unitName))
        break
      }

      case "k": {
        const [k, pos] = readNumber(datum)
        if (typeof k === "string") { return "Error. Non-numeric k." }
        const unitName = datum.slice(pos).trim()
        input.k = Rnl.toNumber(convertToBaseUnit(k, unitName))
        break
      }

      case "setup": {
        if (numberRegEx.test(datum)) { input.nodes.push("none") }
        const elements = datum.split(/ +/g)
        for (let k = 0; k < elements.length; k++) {
          switch (elements[k]) {
            case "p":
            case "f":
            case "h":
            case "ph":
            case "s":
            case "-":
              input.nodes.push(elements[k] === "-" ? "none" : elements[k])
              break
            default: {
              const element = elements[k].replace(ftRegEx, "ft")
              const [L, pos] = readNumber(element)
              if (typeof L === "string") { return "Error. Non-numeric length." }
              let unitName = element.slice(pos).trim()
              if (unitName === "") { unitName = "mm" }
              if (metricLengths.includes(unitName)) { input.SI = true }
              input.spanLength.push(convertToBaseUnit(L, unitName))
              break
            }
          }
        }
        if (numberRegEx.test(elements[elements.length - 1])) { input.nodes.push("none") }
        break
      }

      case "dead":
      case "D":
      case "load":
      case "live":
      case "L":
      case "snow":
      case "S":
      case "wind":
      case "W":
      case "EQ":
      case "F":
      case "H":
      case "rain":
      case "roof":
      case "R": {
        const load = Object.create(null)
        datum = datum.replace(ftRegEx, "ft")
        const elements = datum.split(",")
        let str = elements[0]
        load.type = item
        load.from = Rnl.zero
        load.to = Rnl.zero
        load.P = 0
        load.M = 0
        load.wStart = 0
        load.wEnd = 0
        let [num1, pos] = readNumber(str)  // eslint-disable-line prefer-const
        if (typeof num1 === "string") { return "Error. Non-numeric load." }
        let num2 = num1
        str = str.slice(pos).trim()
        if (str.slice(0, 1) === ":") {
          str = str.slice(1).trim();
          [num2, pos] = readNumber(str)
          str = str.slice(pos).trim()
        }
        const unitName = str.trim()
        const unit = unitFromUnitName(unitName, vars)
        // Read the load from & to points, if any
        let L1 = 0
        let L2 = 0
        let lengthUnitName = ""
        if (elements.length > 1) {
          str = elements[1].trim();
          [L1, pos] = readNumber(str)
          str = str.slice(pos).trim()
          if (str.slice(0, 1) === ":") {
            str = str.slice(1).trim();
            [L2, pos] = readNumber(str)
            str = str.slice(pos).trim()
          } else {
            L2 = L1
          }
          lengthUnitName = str.trim()
          if (lengthUnitName === "") { lengthUnitName = "mm" }
        }
        const expos = unit.expos.join("")
        if (expos === "01-200000") {
          load.shape = "w"
          load.wStart = Rnl.toNumber(convertToBaseUnit(num1, unitName))
          load.wEnd = Rnl.toNumber(convertToBaseUnit(num2, unitName))
        } else if (expos === "11-200000") {
          load.shape = "P"
          load.P = Rnl.toNumber(convertToBaseUnit(num1, unitName))
        } else if (expos === "21-200000") {
          load.shape = "M"
          load.M = Rnl.toNumber(convertToBaseUnit(num1, unitName))
        } else {
          return `Error. ${unitName} is not a force, line load, or moment.`
        }
        if (L1 !== 0) { load.from = convertToBaseUnit(L1, lengthUnitName) }
        if (L2 !== 0) { load.to = convertToBaseUnit(L2, lengthUnitName) }
        input.loads.push(load)
        break
      }

      case "combo": {
        const validCombos = Object.keys(loadCombinations)
        if (!validCombos.includes(datum)) {
          // eslint-disable-next-line max-len
          return `Error. Unsupported combo. Supported combos are:}\\\\ \\text{${validCombos.join(", ")}`
        }
        input.combinations = datum
        break
      }

      case "LLF": {
        const [LLF, _] = readNumber(datum)
        if (typeof LLF === "string") { return "Error. LLF is non-numeric." }
        input.LLF = Rnl.toNumber(LLF)
        break
      }

      case "SDS": {
        const [SDS, _] = readNumber(datum)
        if (typeof SDS === "string") { return "Error. SDS is non-numeric." }
        input.SDS = Rnl.toNumber(SDS)
        break
      }

      default:
        return `Error. Unrecognized item ${item}`
    }
  }
  return input
}
