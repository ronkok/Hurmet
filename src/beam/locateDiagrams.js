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
  let yM = mMax > 0.0005
    ? botOfV + 12 + mMax * mScale + 40
    : botOfV + 12
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
    const botOfM = Math.abs(mMin) > 0.05 * mMax
      ? yM + mMin * mScale + 40
      : yM + 14
    yDeflection = botOfM + 80 + deflectionMax * deflectionScale
    if (deflectionMax > 0.1 * (deflectionMax - deflectionMin)) {
      yDeflection = yDeflection + 20
    }
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
