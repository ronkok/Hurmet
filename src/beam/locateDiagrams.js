export function locateDiagrams(beam, extremes) {
  // Find the y-coordinates for the shear, moment, and deflection diagrams.

  // First, find out how many reaction vectors will be written onto the load diagram.
  const [vMax, vMin, mMax, mMin, deflectionMax, deflectionMin, , , ] = extremes

  const vScale = vMax - vMin > 0 ? 60 / (vMax - vMin) : 0
  const mScale = mMax - mMin > 0 ? 60 / (mMax - mMin) : 0
  const reactionTextHeight = 16

  let yV = vMax > 0.0005
    ? beam.yLoad + 12 + reactionTextHeight + vMax * vScale + 70
    : beam.yLoad + 12 + reactionTextHeight
  yV = Math.round(yV)
  const botOfV = vMin < -0.0005
    ? yV + vMin * vScale + 50
    : yV + 70
  const momentMax = beam.convention === 1 ? mMax : Math.abs(mMin)
  const momentMin = beam.convention === 1 ? Math.abs(mMin) : mMax
  let yM = momentMax > 0.0005
    ? botOfV + 12 + momentMax * mScale + 40
    : botOfV + 12 + 40
  yM = Math.round(yM)
  let yMax = yM

  // Get yText for moment
  let yText = yM - mScale * mMin
  if (yText > yMax) { yMax = yText }

  let yDeflection = 0
  let deflectionScale = 0
  if (beam.EI !== 1) {
    // eslint-disable-next-line max-len
    if (deflectionMax > deflectionMin) { deflectionScale = 30 / (deflectionMax - deflectionMin) }
    const botOfM = momentMin > (0.05 * momentMax)
      ? yM + momentMin * mScale + 14
      : yM + 14
    yDeflection = botOfM + 40 + deflectionMax * deflectionScale
    yDeflection = Math.round(yDeflection)
    yMax = yDeflection
    if (Math.abs(deflectionMin) > 0.2 * (deflectionMax - deflectionMin)) {
      yText = yDeflection - deflectionScale * deflectionMin
      if (yText > yMax) { yMax = yText }
    }
  }
  yMax += 20

  return [yV, yM, yDeflection, vScale, mScale, deflectionScale, yMax]

}
