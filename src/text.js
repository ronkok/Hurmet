import { dt } from "./constants" // operand type enumeration
import { arrayOfRegExMatches } from "./utils"
import { Rnl } from "./rational"
import { errorOprnd } from "./error"

const wideCharRegEx = /[\uD800-\uDBFF][\uDC00-\uDFFF][\uFE00\uFE01]?/g

export const textRange = (str, index) => {
  // Find a range of the string str
  if (index.dtype !== dt.RATIONAL && index.dtype !== dt.RANGE) {
    return errorOprnd("STR_INDEX")
  }

  const wideCharMatches = arrayOfRegExMatches(wideCharRegEx, str)
  let value = ""

  if (wideCharMatches.length === 0) {
    // No surrogate pairs were found.
    // Each text character is one UTF-16 code unit.
    // So do a naive access of the string.
    if (index.dtype === dt.RATIONAL) {
      value = str.charAt(Rnl.toNumber(index.value) - 1)
    } else if (index.dtype === dt.RANGE) {
      const start = Rnl.toNumber(index.value[0])
      const step = Rnl.toNumber(index.value[1])
      const end = index.value[2] === "∞"
        ? str.length
        : Rnl.toNumber(index.value[2])
      if (step === 1) {
        // No step size specified.
        value = str.slice(start - 1, end)
      } else {
        for (let i = start - 1; i < end; i += step) {
          value += str.charAt(i)
        }
      }
    }
  } else {
    // We must account for surrogate pairs and variation selectors.
    let discardLength = 0
    let endOfPrevWideChar = 0
    let cleanString = ""
    let start = 0
    let step = 0
    let end = 0
    if (index.dtype === dt.RATIONAL) {
      // Return one character.
      start = Rnl.toNumber(index.value)
      step = 1
      end = start
    } else {
      // index is a range and str contains at least one surrogate pair.
      start = Rnl.toNumber(index.value[0])
      step = Rnl.toNumber(index.value[1])
      end = Rnl.toNumber(index.value[2])
    }
    let realIndex = start

    for (let i = 0; i < wideCharMatches.length; i++) {
      const posWideChar = wideCharMatches[i].index
      cleanString = str.slice(endOfPrevWideChar, posWideChar)
      while (realIndex <= end && discardLength + cleanString.length >= realIndex) {
        value += cleanString[realIndex - discardLength - 1]
        realIndex += step
      }
      if (realIndex <= end && discardLength + cleanString.length === realIndex - 1) {
        value += wideCharMatches[i].value
        realIndex += step
      }
      if (realIndex > end) {
        return { value, unit: null, dtype: dt.STRING }
      }
      discardLength += cleanString.length + 1
      endOfPrevWideChar = posWideChar + wideCharMatches[i].length
    }
    if (realIndex >= discardLength && realIndex <= end) {
      cleanString = str.slice(endOfPrevWideChar)
      while (realIndex <= end && discardLength + cleanString.length >= realIndex) {
        value += cleanString[realIndex - discardLength - 1]
        realIndex += step
      }
    } else {
      return errorOprnd("BIGINDEX")
    }
  }
  return { value, unit: null, dtype: dt.STRING }
}
