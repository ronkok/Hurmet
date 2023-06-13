import { dt } from "./constants" // operand type enumeration
import { Rnl } from "./rational"
import { arrayOfRegExMatches } from "./utils"
import { errorOprnd } from "./error"

const wideCharRegEx = /[\uD800-\uDBFF][\uDC00-\uDFFF][\uFE00\uFE01]?/g

export const findfirst = (searchString, str) => {
  const index = str.value.indexOf(searchString.value)
  const wideCharMatches = arrayOfRegExMatches(wideCharRegEx, str.value.slice(0, index))
  return Rnl.fromNumber(index + wideCharMatches.length + 1)
}

export const textRange = (str, index) => {
  // Find a range of the string str
  if (index.dtype !== dt.RATIONAL && index.dtype !== dt.RANGE) {
    return errorOprnd("STR_INDEX")
  }

  const strArray = Array.from(str)
  let value = ""
  if (index.dtype === dt.RATIONAL) {
    const pos = Rnl.toNumber(index.value) - 1
    value = strArray.at(pos)
  } else if (index.dtype === dt.RANGE) {
    const start = Rnl.toNumber(index.value[0])
    const step = Rnl.toNumber(index.value[1])
    const end = index.value[2] === "∞"
      ? str.length
      : Rnl.toNumber(index.value[2])
    if (step === 1) {
      value = strArray.slice(start - 1, end).join("")
    } else {
      for (let i = start - 1; i < end; i += step) {
        value += strArray.at(i)
      }

    }
  }

  return { value, unit: null, dtype: dt.STRING }
}
