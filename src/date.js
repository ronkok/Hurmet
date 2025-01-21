import { Rnl } from "./rational"

export const dateFormatRegEx = /^(?:(w{3,4}), )?(y{1,4}|m{3,4}|d{1,2})([- .]| de )(m{2,4}|d{1,2})([- .]|, | de )(y{4}|d{2})(?: ([a-z]{2,3}))?$/
// Capturing groups:
//  [1] weekday, optional
//  [2] day, month, or year
//  [3] separator between first & second [dmy]
//  [4] day or month
//  [5] separator
//  [6] day or year
//  [7] language code, optional


export const dateRegEx = /^'(\d{4})-(\d{1,2})-(\d{1,2})'$/
export const dateInSecondsFromIsoString = dateStr => {
  // Return the number of seconds after the start January 1, 1970, UTC.
  const match = dateStr.match(dateRegEx)
  const timeZoneOffset = new Date().getTimezoneOffset() / 60 // in hours
  const date = new Date( match[1], match[2] - 1, match[3], -timeZoneOffset )
  return Math.floor(date.getTime() / 1000) // seconds after Jan 1, 1970, UTC
}

export const dateInSecondsFromToday = _ => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const isoString = `'${year}-${month}-${day}'`
  return dateInSecondsFromIsoString(isoString)
}

export const dateRPN = dateStr => {
  return "⌾" + String(dateInSecondsFromIsoString(dateStr))
}

export const dateDisplayFromIsoString = (str, dateFormatSpec, inExpression = false) => {
  const rnlDate = [BigInt(dateInSecondsFromIsoString(str)), BigInt(1)]
  return formatDate(rnlDate, dateFormatSpec, inExpression)
}

const processDMY = (dmy, date, language, inExpression) => {
  return dmy === "d"
    ? String(date.getUTCDate())
    : dmy === "dd"
    ? String(date.getUTCDate()).padStart(2, '0')
    : dmy === "mm"
    ? String(date.getUTCMonth() + 1).padStart(2, '0')
    : dmy === "mmm" || (inExpression && dmy === "mmmm")
    ? new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'GMT' }).format(date)
    : dmy === "mmmm"
    ? new Intl.DateTimeFormat(language, { month: 'long', timeZone: 'GMT' }).format(date)
    : String(date.getUTCFullYear())
}

export const formatDate = (dateValue, dateFormatSpec, inExpression = false) => {
  // dateValue = number of seconds after start of January 1, 1970
  const date = new Date(Rnl.toNumber(dateValue) * 1000)
  // Write results in the document's main font.
  const dateClass = inExpression ? "" : "\\class{date-result}{"

  if (!dateFormatSpec || dateFormatSpec === "yyyy-mm-dd" ||
    (inExpression && dateFormatSpec.indexOf("de") > -1)) {
    let result = `${dateClass}\\text{${date.toISOString().split("T")[0]}}`
    if (!inExpression)  { result += "}" }
    return result
  }

  const match = dateFormatRegEx.exec(dateFormatSpec)
  const language = match[7] ? match[7] : "en"

  let str = ""
  if (match[1] && !inExpression) {
    const length = match[1].length === "3" ? "short" : "long"
    str += new Intl.DateTimeFormat(language, { weekday: length, timeZone: 'GMT' }).format(date)
    str += ", "
  }
  str += processDMY(match[2], date, language, inExpression)
  str += match[3];
  str += processDMY(match[4], date, language, inExpression)
  str += match[5];
  str += processDMY(match[6], date, language, inExpression)

  let result = `${dateClass}\\text{${str}}`
  if (!inExpression)  { result += "}" }
  return result
}

