// Constants
export const DEAD = 1
export const FLUID = 2
export const LIVE = 3
export const HORIZ = 4
export const ROOFLIVE = 5
export const SNOW = 6
export const RAIN = 7
export const WIND = 8
export const EQ = 9

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
