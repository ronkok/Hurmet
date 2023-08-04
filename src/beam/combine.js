import { getLoadPatterns } from "./loadPatterns"
import { populateMAM } from "./populateMAM"

export function combine(beam, nodes, spans, actions, deflections, comboSet) {
  // We already have member end actions for each load type on each span.
  // In this function, we superimpose the load combinations and live load patterns and
  // find the maximum and minimum shears and moments.
  const numSpans = spans.length - 1
  const isService = comboSet === "service"
  if (isService) { comboSet = [[0, 1, 1, 1, 1, 1, 1, 1, 1, 1]] }
  const liveLoadPatterns = getLoadPatterns(beam, numSpans)
  const numPatterns = liveLoadPatterns.length

  let vMin = 0
  let vMax = 0
  let mMin = 0
  let mMax = 0
  let deflectionMax = 0
  let deflMaxCase = 0
  let deflectionMin = 0
  let deflMinCase = 0

  // Get ready to do lots of different load combinations.
  // Definition: "combern" is a conflation of the words "combination" and "pattern".
  const numComberns = getNumComberns(comboSet, isService, beam, numPatterns)

  for (let i = 1; i <= numSpans; i++) {
    for (let j = 0; j < spans[i].segments.length; j++) {
      const seg = spans[i].segments[j]
      seg.w1f = new Array(numComberns).fill(0)
      seg.w2f = 0
      seg.slope = new Array(numComberns).fill(0)
      seg.V1 = new Array(numComberns).fill(0)
      seg.M1 = new Array(numComberns).fill(0)
      if (beam.EI !== 1) {
        seg.theta1 = new Array(numPatterns).fill(0)
        seg.delta1 = new Array(numPatterns).fill(0)
      }
    }
  }

  // The number of interations through this next loop will be a function of
  // both the number of load combinations and the number of load patterns.
  // I define "combern" as a conflation of the words "combination" & "pattern"
  // "combern" will be the loop index as we look at unique combinations of both
  // load combinations and live load patterns.
  // Each time through the loop, we;ll get the factored loads and the factored MAM
  // To do this, we'll make much use of a subroutine called "PopulateMAM"
  // It's called as:  PopulateMAM  loadFactors, combern, iPattern
  // The load factors are factors from the ASCE or NBCC load combinations

  // As you can see below, we'll find a unique MAM for each iCombo and live load pattern.
  // Then, we'll use the MAM to find the segment shears, moments, etc.

  let combern = 0

  // iCombo 0 is for deflections only. We'll go thru each load pattern.
  // iCombo 1 thru comboSet.length is for finding shear and moment extremes. As code
  // requires, this often means testing many load combinations.

  for (let iCombo = 0; iCombo <= comboSet.length; iCombo++) {
    const  isReqd = iCombo === 0 && beam.EI !== 0
      ? true  // Go thru each load pattern and find deflection extremes.
      : isService
      ? true
      : isReqdCombo(comboSet[iCombo - 1], beam.gotType)

    if (isReqd) {
      const loadFactors = iCombo === 0 && beam.EI !== 0
        ? [0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        : comboSet[iCombo - 1]

      for (let iPattern = 0; iPattern < numPatterns; iPattern++) {
        const loadPattern = liveLoadPatterns[iPattern]

        // Get the Member Action Matrix, MAM, for this combern.
        // A MAM contains the end shears and end moments for each span.
        const mam = populateMAM(loadFactors, combern, loadPattern, beam, nodes, spans, actions)

        let dm
        if (iCombo === 0 && beam.EI !== 1) {
          // Create a Displacement Matrix, DM, for this load combination and load pattern.
          dm = new Array(beam.numDegreesOfFreedom + 1).fill(0)
          for (let iLoadType = 1; iLoadType < 10; iLoadType++) {
            if (beam.gotType[iLoadType]) {
              if (beam.getsPattern[iLoadType]) {
                dm = getLiveDM(dm, deflections[iLoadType], loadPattern, numSpans)
              } else {
                dm = dm.map((e, i) => e + deflections[iLoadType][i])
              }
            }
          }
        }

        let iDM = 0
        for (let iSpan = 1; iSpan <= numSpans; iSpan++) {
          let vMid = 0
          let vEnd = 0
          let mMid = 0
          let mEnd = 0
          let slopeEnd = 0
          let deflectionEnd = 0
          let deflectionMid = 0
          for (let k = 0; k < spans[iSpan].segments.length; k++) {
            const seg = spans[iSpan].segments[k]

            if (k === 0) {
              // The first segment in this span.
              seg.V1[combern] = -mam[5 * iSpan - 3]
              seg.M1[combern] = mam[5 * iSpan - 2]
              if (iCombo === 0 && beam.EI !== 1) {
                iDM = getThetaAndDelta(nodes[iSpan].fixity, dm, seg, combern, iDM)
              }
            } else {
              // Subsequent segments.
              seg.V1[combern] = vEnd + seg.Pf
              seg.M1[combern] = mEnd - seg.Mf
              if (iCombo === 0 && beam.EI !== 1) {
                seg.theta1[combern] = slopeEnd
                seg.delta1[combern] = deflectionEnd
              }
            }

            vEnd = seg.V1[combern] + seg.w1f[combern] * seg.length
                 + 0.5 * seg.slope[combern] * seg.length ** 2
            if (Math.abs(vEnd) < 0.00000000000001) { vEnd = 0 }

            mEnd = seg.M1[combern] + seg.V1[combern] * seg.length
                 + 0.5 * seg.w1f[combern] * seg.length ** 2
                 + seg.slope[combern] * seg.length ** 3 / 6
            if (Math.abs(mEnd) < 0.00000000000001) { mEnd = 0 }

            if (iCombo === 0) {
              // Check if this load pattern contains a deflection extreme.
              if (beam.EI !== 1) {
                slopeEnd = seg.theta1[combern] + (seg.M1[combern] * seg.length
                  + 0.5 * seg.V1[combern] * seg.length ** 2
                  + seg.w1f[combern] * seg.length ** 3 / 6
                  + seg.slope[combern] * seg.length ** 4 / 24) / beam.EI
                deflectionMid = seg.delta1[combern] + seg.theta1[combern] * 0.5 * seg.length
                    + (0.5 * seg.M1[combern] * (0.5 * seg.length) ** 2
                    + seg.V1[combern] * (0.5 * seg.length) ** 3 / 6
                    + seg.w1f[combern] * (0.5 * seg.length) ** 4 / 24
                    + seg.slope[combern] * (0.5 * seg.length) ** 5 / 120) / beam.EI
                deflectionEnd = seg.delta1[combern] + seg.theta1[combern] * seg.length
                    + (0.5 * seg.M1[combern] * seg.length ** 2
                        + seg.V1[combern] * seg.length ** 3 / 6
                    + seg.w1f[combern] * seg.length ** 4 / 24
                    + seg.slope[combern] * seg.length ** 5 / 120) / beam.EI
                if (seg.delta1[combern] > deflectionMax) {
                  deflectionMax = seg.delta1[combern]
                  deflMaxCase = combern
                }
                if (seg.delta1[combern] < deflectionMin) {
                  deflectionMin = seg.delta1[combern]
                  deflMaxCase = combern
                }
                if (deflectionEnd > deflectionMax) {
                  deflectionMax = deflectionEnd
                  deflMaxCase = combern
                }
                if (deflectionEnd < deflectionMin) {
                  deflectionMin = deflectionEnd
                  deflMinCase = combern
                }
                if (deflectionMid > deflectionMax) {
                  deflectionMax = deflectionMid
                  deflMaxCase = combern
                }
                if (deflectionMid < deflectionMin) {
                  deflectionMin = deflectionMid
                  deflMinCase = combern
                }
              }
            } else {
              // Determine if this combern contains a shear or moment extreme.
              // Start by finding the shear value in the middle of the segment
              let xCross = 0 // initialze the variable
              if (seg.slope[combern] !== 0) {
                xCross = -1 * seg.w1f[combern] / seg.slope[combern]
                if (xCross > 0 && xCross < seg.length) {
                  vMid = seg.V1[combern] + seg.w1f[combern] * xCross
                        + 0.5 * seg.slope[combern] * xCross ** 2
                } else {
                  vMid = seg.V1[combern] + seg.w1f[combern] * (seg.length / 2)
                        + 0.5 * seg.slope[combern] * (seg.length / 2) ** 2
                }
              } else {
                vMid = seg.V1[combern] + seg.w1f[combern] * (seg.length / 2)
                      + 0.5 * seg.slope[combern] * (seg.length / 2) ** 2
              }

              // Find the moment in the middle of the segment
              xCross = 0 // initialze the variable
              if (seg.slope[combern] === 0) {
                if (seg.w1f[combern] !== 0) {
                  xCross = -seg.V1[combern] / seg.w1f[combern]
                }
              } else {
                if ((seg.w1f[combern] ** 2 - 2 * seg.slope[combern] * seg.V1[combern]) > 0) {
                  xCross = -(seg.w1f[combern] + Math.sqrt(seg.w1f[combern] ** 2
                          - 2 * seg.slope[combern] * seg.V1[combern])) / seg.slope[combern]
                }
              }
              if (xCross > 0 && xCross < seg.length) {
                mMid = seg.M1[combern] + seg.V1[combern] * xCross
                      + 0.5 * seg.w1f[combern] * xCross ** 2
                      + seg.slope[combern] * xCross ** 3 / 6
              } else {
                mMid = seg.M1[combern] + seg.V1[combern] * (seg.length / 2)
                    + 0.5 * seg.w1f[combern] * (seg.length / 2) ** 2
                    + seg.slope[combern] * (seg.length / 2) ** 3 / 6
              }

              // Check for local maximums and minimums
              if (seg.V1[combern] > seg.Vmax.left.value && seg.V1[combern] > 0.01) {
                seg.Vmax.left.value = seg.V1[combern]
                seg.Vmax.left.case = combern   // This is a case that we// ll want to plot
                if (seg.V1[combern] > vMax) { vMax = seg.V1[combern] }
              }

              if (vMid > seg.Vmax.mid.value && vMid > 0.01) {
                seg.Vmax.mid.value = vMid
                seg.Vmax.mid.case = combern
                if (vMid > vMax) { vMax = vMid }
              }

              if (vEnd > seg.Vmax.right.value && vEnd > 0.01) {
                seg.Vmax.right.value = vEnd
                seg.Vmax.right.case = combern
                if (vEnd > vMax) { vMax = vEnd }
              }

              if (seg.V1[combern] < seg.Vmin.left.value && seg.V1[combern] < -0.01) {
                seg.Vmin.left.value = seg.V1[combern]
                seg.Vmin.left.case = combern
                if (seg.V1[combern] < vMin) { vMin = seg.V1[combern] }
              }

              if (vMid < seg.Vmin.mid.value && vMid < -0.01) {
                seg.Vmin.mid.value = vMid
                seg.Vmin.mid.case = combern
                if (vMid < vMin) { vMin = vMid }
              }

              if (vEnd < seg.Vmin.right.value && vEnd < -0.01) {
                seg.Vmin.right.value = vEnd
                seg.Vmin.right.case = combern
                if (vEnd < vMin) { vMin = vEnd }
              }

              if (seg.M1[combern] > seg.Mmax.left.value && seg.M1[combern] > 0.01) {
                seg.Mmax.left.value = seg.M1[combern]
                seg.Mmax.left.case = combern
                if (seg.M1[combern] > mMax) { mMax = seg.M1[combern] }
              }

              if (mMid > seg.Mmax.mid.value && mMid > 0.01) {
                seg.Mmax.mid.value = mMid
                seg.Mmax.mid.case = combern
                seg.Mmax.mid.x = seg.xOfLeftEnd + xCross
                if (mMid > mMax) { mMax = mMid }
              }

              if (mEnd > seg.Mmax.right.value && mEnd > 0.01) {
                seg.Mmax.right.value = mEnd
                seg.Mmax.right.case = combern
                if (mEnd > mMax) { mMax = mEnd }
              }

              if (seg.M1[combern] < seg.Mmin.left.value && seg.M1[combern] < -0.01) {
                seg.Mmin.left.value = seg.M1[combern]
                seg.Mmin.left.case = combern
                if (seg.M1[combern] < mMin) { mMin = seg.M1[combern] }
              }

              if (mMid < seg.Mmin.mid.value && mMid < -0.01) {
                seg.Mmin.mid.value = mMid
                seg.Mmin.mid.case = combern
                seg.Mmin.mid.x = seg.xOfLeftEnd + xCross
                if (mMid < mMin) { mMin = mMid }
              }

              if (mEnd < seg.Mmin.right.value && mEnd < -0.01) {
                seg.Mmin.right.value = mEnd
                seg.Mmin.right.case = combern
                if (mEnd < mMin) { mMin = mEnd }
              }
            }

          }
        }
        combern += 1
      }
    }
  }
  return [vMax, vMin, mMax, mMin, deflectionMax, deflectionMin,
    deflMaxCase, deflMinCase, numComberns]
}

const isReqdCombo = (combo, gotType) => {
  let isDeadLoadOnly = true
  for (let j = 2; j < combo.length; j++) {
    if (combo[j] > 0) {
      isDeadLoadOnly = false
      if (gotType[j]) { return true }
    }
  }
  return isDeadLoadOnly
}

/*const comboContainsLive = (combo, beam) => {
  for (let i = 1; i <= beam.numLoadTypes; i++) {
    if (beam.getsPattern[i] && combo[i] !== 0) { return true }
  }
  return false
}*/

const getNumComberns = (comboSet, isService, beam, numPatterns) => {
  // We'll do a superposition of forces for each load combination and each live load pattern.
  // How many is that?
  // First, count the number of comberns needed to do the deflection superpositions.
  let numComberns = beam.EI === 1 ? 1 : numPatterns
  // Then add a combern for each superposition done to get shears and moments.
  for (let i = 0; i < comboSet.length; i++) {
    if (isService || isReqdCombo(comboSet[i], beam.gotType)) {
      numComberns += numPatterns
    }
  }
  return numComberns
}

const getLiveDM = (a, b, loadPattern, numSpans) => {
  if (Array.isArray(b[1])) {
    for (let k = 1; k <= numSpans; k++) {
      if (loadPattern.includes(k)) {
        a = a.map((e, i) => e + b[i][k])
      }
    }
  } else {
    a = a.map((e, i) => e  + b[i])
  }
  return a
}

const getThetaAndDelta = (fixity, dm, seg, i, iDM) => {
  if (fixity === "fixed") {
    seg.delta1[i] = 0
    seg.theta1[i] = 0
  } else if (fixity === "pinned") {
    seg.delta1[i] = 0
    iDM = iDM + 1
    seg.theta1[i] = -dm[iDM]
  } else if (fixity === "continuous") {
    iDM = iDM + 1
    seg.delta1[i] = -dm[iDM]
    iDM = iDM + 1
    seg.theta1[i] = -dm[iDM]
  } else if (fixity === "spring") {
    iDM = iDM + 1
    seg.delta1[i] = -dm[iDM]
    iDM = iDM + 1
    seg.theta1[i] = -dm[iDM]
  } else if (fixity === "proppedHinge") {
    iDM = iDM + 1
    seg.delta1[i] = 0
    iDM = iDM + 1
    seg.theta1[i] = -dm[iDM]
  } else if (fixity === "hinge") {
    iDM = iDM + 1
    seg.delta1[i] = -dm[iDM]
    iDM = iDM + 1
    iDM = iDM + 1
    seg.theta1[i] = -dm[iDM]
  }
  return iDM
}
