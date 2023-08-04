export const round = (num, prec) => {
  // Round a number to prec significant digits.
  // Return a string. This is used for display of numbers on the diagram.
  const str = num.toPrecision(prec)
  if (str.indexOf("e") === -1) { return str }
  const pos = str.indexOf("e")
  const significand = Number.parseFloat(str.slice(0, pos))
  const exponent = Number.parseFloat(str.slice(pos + 1))
  return (significand * 10 ** exponent).toString()
}
