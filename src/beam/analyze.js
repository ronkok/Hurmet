import { DEAD, FLUID, LIVE, ROOFLIVE, HORIZ, SNOW, RAIN, WIND, EQ } from "./utils"
import { clone } from "../utils"

const dotProduct = (a, b) => a.map((e, i) => (e * b[i])).reduce((m, n) => m + n)
const isLiveish = loadType => loadType === LIVE || loadType === ROOFLIVE || loadType === SNOW

export function doAnalysis(beam, nodes, spans) {
  const numNodes = nodes.length
  const numSpans = spans.length
  const gotType = beam.gotType
  const numDegreesOfFreedom = beam.numDegreesOfFreedom
  const numEndActions = 4 * numSpans + numNodes // include the node spring actions.
  beam.numEndActions = numEndActions
  const EI = beam.EI

  // The Direct Stiffness Method employs matrix methods to solve indeterminate structures.
  // Textbooks describe the Direct Stiffness Method with one-based matrices.
  // To avoid confusion, the code below employs arrays as if they were one-based.
  // Since JavaScript arrays are actually zero-based, we will dimension each array with one
  // element more than it needs. Then we'll leave array[0] unused. All our loops will be
  // written as if we had one-based arrays.

  // Prepend elements to arrays `nodes` & `spans` so that they act like 1-based arrays.
  nodes.unshift(0)
  spans.unshift(0)

  // Find the Span Stiffness Matrix, SSM
  // Imagine that a fixed-end span undergoes a displacement, Δ, down at its right end.
  // ▄                                                         █
  // █                                                         █
  // █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,█
  // █             ▀▀▀▀▀▀▀▄▄▄▄                                 █
  // █                         ▀▀▀▌▄▄g                         █
  // █                                 ▀▀▀▀▌▄▄▄▄,              █
  //                                             ▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
  //                                                           █
  // If we draw the free-body diagram of the span, we would see these forces:
  // V_left = 6EIΔ/L², upward
  // M_left = 12EIΔ/L³, clockwise
  // V_right = 6EIΔ/L², downward
  // M_right = 12EIΔ/L³, clockwise
  // The Span Stiffness Matrix is populated, for each span, with just those stiffnesses.

  const ssm = [];
  ssm.push([0, 0, 0, 0, 0])
  for (let i = 1; i <= numSpans; i++) {
    const subMatrix = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ]
    subMatrix[1][1] = EI * 12 / spans[i].length ** 3
    subMatrix[1][2] = EI * 6 / spans[i].length ** 2
    subMatrix[1][3] = -EI * 12 / spans[i].length ** 3
    subMatrix[1][4] = EI * 6 / spans[i].length ** 2
    subMatrix[2][1] = EI * 6 / spans[i].length ** 2
    subMatrix[2][2] = EI * 4 / spans[i].length
    subMatrix[2][3] = -EI * 6 / spans[i].length ** 2
    subMatrix[2][4] = EI * 2 / spans[i].length
    subMatrix[3][1] = -EI * 12 / spans[i].length ** 3
    subMatrix[3][2] = -EI * 6 / spans[i].length ** 2
    subMatrix[3][3] = EI * 12 / spans[i].length ** 3
    subMatrix[3][4] = -EI * 6 / spans[i].length ** 2
    subMatrix[4][1] = EI * 6 / spans[i].length ** 2
    subMatrix[4][2] = EI * 2 / spans[i].length
    subMatrix[4][3] = -EI * 6 / spans[i].length ** 2
    subMatrix[4][4] = EI * 4 / spans[i].length
    ssm.push(subMatrix)
  }

  //Find dtm, the Displacement Transformation Matrix
  const dtm = new Array(numEndActions + 1).fill(0).map(e => {
    return new Array(numDegreesOfFreedom + 1).fill(0)
  })
  let j = 0
  for (let i = 1; i <= numNodes; i++) {
    if (i === 1) {
      if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
        dtm[1][1] = 1
        dtm[2][1] = 1
        dtm[3][2] = 1
        j = 2
      } else if (nodes[i].fixity === "fixed") {
        //do nothing
      } else if (nodes[i].fixity === "pinned") {
        dtm[3][1] = 1
        j = 1
      }
    } else if (i === numNodes) {
      if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
        j = j + 1
        dtm[5 * numSpans - 1][j] = 1
        j = j + 1
        dtm[5 * numSpans][j] = 1
        dtm[5 * numSpans + 1][j - 1] = 1
      } else if (nodes[i].fixity === "fixed") {
        //do nothing
      } else if (nodes[i].fixity === "pinned") {
        j = j + 1
        dtm[5 * numSpans][j] = 1
      }
    } else {
      if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
        j = j + 1
        dtm[5 * (i - 1) - 1][j] = 1
        dtm[5 * (i - 1) + 1][j] = 1
        dtm[5 * (i - 1) + 2][j] = 1
        j = j + 1
        dtm[5 * (i - 1)][j] = 1
        dtm[5 * (i - 1) + 3][j] = 1
      } else if (nodes[i].fixity === "hinge") {
        j = j + 1
        dtm[5 * (i - 1) - 1][j] = 1
        dtm[5 * (i - 1) + 1][j] = 1
        dtm[5 * (i - 1) + 2][j] = 1
        j = j + 1
        dtm[5 * (i - 1)][j] = 1
        j = j + 1
        dtm[5 * (i - 1) + 3][j] = 1
      } else if (nodes[i].fixity === "proppedHinge") {
        j = j + 1
        dtm[5 * (i - 1)][j] = 1
        j = j + 1
        dtm[5 * (i - 1) + 3][j] = 1
      } else if (nodes[i].fixity === "fixed") {
        //do nothing
      } else if (nodes[i].fixity === "pinned") {
        j = j + 1
        dtm[5 * (i - 1)][j] = 1
        dtm[5 * (i - 1) + 3][j] = 1
      }
    }
  }

  //Now do the first  matrix operations
  const lsmDtm = createLsmDtm(ssm, dtm, nodes, numEndActions, numDegreesOfFreedom)
  // Create the Stiffness Matrix.
  const [sm, bandWidth] = createSM(dtm, lsmDtm, numDegreesOfFreedom)

  let diag = []
  let ltm = []
  if (numDegreesOfFreedom > 1) {
    [diag, ltm] = luDecomposition(sm, bandWidth)
  }

  //Find the number of load patterns
  beam.containsLive = beam.gotType[LIVE] || beam.gotType[ROOFLIVE] || beam.gotType[SNOW]
  const numPatterns = !beam.containsLive
    ? 1
    : !beam.doLiveLoadPatterns
    ? 1
    : numSpans > 7
    ? 2
    : beam.patterns
    ? 2 ** (numSpans - 1)
    : 2
  beam.numPatterns = numPatterns

  // Initialize some variables
  const feam = new Array(numEndActions + 1).fill(0)       // Fixed End Action Matrix
  const nfm = new Array(numDegreesOfFreedom + 1).fill(0)  // Nodal Force Matrix
  let mam  // Member Action Matrix
  let dm   // Displacement Matrix
  let mamD = new Array(numEndActions).fill(0)       // mam for Dead load
  let dmD = new Array(numDegreesOfFreedom).fill(0)  // Displacement Matrix for Dead Load
  let mamL // Live
  let dmL
  let mamLr // Roof Live
  let dmLr
  let mamS // Snow
  let dmS
  let mamF = new Array(numEndActions).fill(0) // Fluid
  let dmF = new Array(numDegreesOfFreedom).fill(0)
  let mamH = new Array(numEndActions).fill(0) // HORIZ
  let dmH = new Array(numDegreesOfFreedom).fill(0)
  let mamR = new Array(numEndActions).fill(0) // RAIN
  let dmR = new Array(numDegreesOfFreedom).fill(0)
  let mamW = new Array(numEndActions).fill(0) // WIND
  let dmW = new Array(numDegreesOfFreedom).fill(0)
  let mamE = new Array(numEndActions).fill(0) // EQ
  let dmE = new Array(numDegreesOfFreedom).fill(0)
  if (numPatterns > 1 && beam.containsLive) {
    mamL = new Array(numEndActions + 1).fill(0)
    mamL = mamL.map(e => new Array(numDegreesOfFreedom + 1).fill(0))
    dmL = new Array(numDegreesOfFreedom + 1).fill(0)
    dmL = dmL.map(e => new Array(numSpans + 1).fill(0))
    mamLr = new Array(numEndActions + 1).fill(0)
    mamLr = mamLr.map(e => new Array(numDegreesOfFreedom + 1).fill(0))
    dmLr = new Array(numDegreesOfFreedom + 1).fill(0)
    dmLr = dmLr.map(e => new Array(numSpans + 1).fill(0))
    mamS = new Array(numEndActions + 1).fill(0)
    mamS = mamS.map(e => new Array(numDegreesOfFreedom + 1).fill(0))
    dmS = new Array(numDegreesOfFreedom + 1).fill(0)
    dmS = dmS.map(e => new Array(numSpans + 1).fill(0))
  } else {
    mamL = new Array(numEndActions).fill(0)
    dmL = new Array(numDegreesOfFreedom).fill(0)
    mamLr = new Array(numEndActions).fill(0)
    dmLr = new Array(numDegreesOfFreedom).fill(0)
    mamS = new Array(numEndActions).fill(0)
    dmS = new Array(numDegreesOfFreedom).fill(0)
  }

  //Find a Member end Action Matrix, mam for each type of load, Service, D, L, S, W, E, etc
  //For the live loads, find a different mam due to loads on each individual span.
  for (let loadType = 0; loadType <= EQ; loadType++) {
    if (loadType === 0 || gotType[loadType]) {
      let lastK = 0
      let doPatterns = false // patterned live loads
      if (loadType === 0) {
        doPatterns = false
        lastK = 1
      } else if (isLiveish(loadType) && numPatterns > 1) {
        doPatterns = true
        // To do load patterns, we have to get a Member Action Matrix, mam, for each span.
        lastK = numSpans
      } else {
        doPatterns = false
        lastK = 1
      }

      for (let k = 1; k <= lastK; k++) {
        for (let i = 1;  i <= numSpans; i++) {
          const L = spans[i].length
          const iSpring = 5 * i - 4
          const i1 = 5 * i - 3
          const i2 = 5 * i - 2
          const i3 = 5 * i - 1
          const i4 = 5 * i

          // Find the fixed end actions
          feam[iSpring] = 0
          feam[i1] = 0 //The left end reaction if this segment were a fixed/fixed beam.
          feam[i2] = 0 //The left fixed end moment
          feam[i3] = 0 //The right end reaction
          feam[i4] = 0 //The right fixed end moment
          let applyLoadsFromThisSpan = false
          if (!doPatterns) {
            // We are not doing live load patterns.
            // So make one pass thru the beam and get a MAM that is the result of all loads.
            applyLoadsFromThisSpan = true
          } else {
            // We are doing live load patterns.
            // k = number of spans.
            // Make k passes thru the beam.
            // In the kth pass, we calclate a MAM for the entire beam that results from
            // live loads on just the kth span.
            // The other spans have FEAM = [0, 0, etc] as their contribution to this MAM.
            // Having k MAMs will enable us later to superimpose forces for each pattern.
            applyLoadsFromThisSpan = i === k
          }

          if (applyLoadsFromThisSpan) {
            for (let iSeg = 0; iSeg < spans[i].segments.length; iSeg++) {
              const seg = spans[i].segments[iSeg]
              // In the next few lines,
              // a is the distance from the beginning of the span to the load point.
              // b is the length of the load.
              // c is the distance from the end of the load to the right edge of the span.
              // e is the distance from the left edge of the load to the right end of the span.
              // d is the distance from the right edge of the load to the left edge of the span
              let w = 0
              let s = 0
              const a = seg.xOfLeftEnd - nodes[i].x
              let b = seg.length
              let c = L - a - b
              let d = a + b
              const e = b + c
              let gotOppSigns = false
              let a2 = 0
              let b2 = 0
              let c2 = 0
              let d2 = 0
              let e2 = 0

              if (Math.abs(seg.w1[loadType]) < 0.000000001) { seg.w1[loadType] = 0 }
              if (Math.abs(seg.w2[loadType]) < 0.000000001) { seg.w2[loadType] = 0 }

              if (seg.w1[loadType] !== 0 && seg.w2[loadType] !== 0 &&
                      Math.sign(seg.w1[loadType]) !== Math.sign(seg.w2[loadType])) {
                gotOppSigns = true
                w = 0
                s = (seg.w2[loadType] - seg.w1[loadType]) / b   //slope of line load
                a2 = a - seg.w1[loadType] / s
                b2 = d - a2
                c2 = c
                d2 = d
                e2 = d2 - b2
                b = a2 - a
                d = a + b
                c = L - d

              } else {
                gotOppSigns = false
                w = Math.abs(seg.w1[loadType]) < Math.abs(seg.w2[loadType])
                  ? seg.w1[loadType]
                  : seg.w2[loadType]
              }

              if (a === 0) {
                feam[iSpring] = seg.P[loadType]
              } else {
                //FEA for point loads
                feam[i2] = feam[i2] + seg.P[loadType] * a * e ** 2 / L ** 2
                feam[i4] = feam[i4] - seg.P[loadType] * a ** 2 * e / L ** 2
                feam[i2] = feam[i2] - seg.M[loadType] * (-1 + 4 * a / L - 3 * a ** 2 / L ** 2)
                feam[i4] = feam[i4] - seg.M[loadType] * a / L * (2 - 3 * a / L)
                feam[i1] = feam[i1] + seg.P[loadType] * e ** 2 / L ** 3 * (3 * a + e)
                feam[i3] = feam[i3] + seg.P[loadType] * a ** 2 / L ** 3 * (a + 3 * e)
                feam[i1] = feam[i1] - 6 * seg.M[loadType] * a / L ** 2 * (1 - a / L)
                feam[i3] = feam[i3] + 6 * seg.M[loadType] * a / L ** 2 * (1 - a / L)
              }

              //FEA for uniform loads
              if (w !== 0) {
                const mA = (w * b / (12 * L ** 2 * b)) * (e ** 3 * (4 * L - 3 * e)
                    - c ** 3 * (4 * L - 3 * c))
                feam[i2] = feam[i2] + mA
                const mB = (w * b / (12 * L ** 2 * b)) * (d ** 3 * (4 * L - 3 * d)
                    - a ** 3 * (4 * L - 3 * a))
                feam[i4] = feam[i4] - mB
                feam[i1] = feam[i1] + (w * b / (2 * L)) * (2 * c + b) + (mA - mB) / L
                feam[i3] = feam[i3] + (w * b / (2 * L)) * (2 * a + b) + (mB - mA) / L
              }

              //FEA for triangular loads
              if (Math.abs(seg.w1[loadType]) > Math.abs(seg.w2[loadType]) || gotOppSigns) {
                const wL = seg.w1[loadType] - w
                // const wR = 0
                const wT = wL
                const centerOfTriangle = a + b / 3
                const wF = wT * d / b
                const mA = (wF * L ** 2 / 60) * (d / L) ** 2 * (10 - 10 * d / L
                    + 3 * d ** 2 / L ** 2)
                    - ((wF - wT) * L ** 2 / 60) * (a / L) ** 2
                      * (10 - 10 * a / L + 3 * a ** 2 / L ** 2)
                    - (wT * L ** 2 / 12) * (a / L) ** 2 * (6 - 8 * a / L + 3 * a ** 2 / L ** 2)
                feam[i2] = feam[i2] + mA
                const mB = (wF * L ** 2 / 60) * (d / L) ** 3 * (5 - 3 * d / L)
                    - ((wF - wT) * L ** 2 / 60) * (a / L) ** 3 * (5 - 3 * a / L)
                    - (wT * L ** 2 / 12) * (a / L) ** 3 * (4 - 3 * a / L)
                feam[i4] = feam[i4] - mB
                feam[i1] = feam[i1]
                          + 0.5 * (wT * b) * (L - centerOfTriangle) / L + (mA - mB) / L
                feam[i3] = feam[i3] + 0.5 * (wT * b) * centerOfTriangle / L + (mB - mA) / L

              } else if (Math.abs(seg.w2[loadType]) > Math.abs(seg.w1[loadType])) {
                // const wL = 0
                const wR = seg.w2[loadType] - w
                const wT = wR
                const centerOfTriangle = a + 2 * b / 3
                const wF = wT * e / b
                const mA = (wF * L ** 2 / 60) * (e / L) ** 3 * (5 - 3 * e / L)
                    - ((wF - wT) * L ** 2 / 60) * (c / L) ** 3 * (5 - 3 * c / L)
                    - (wT * L ** 2 / 12) * (c / L) ** 3 * (4 - 3 * c / L)
                feam[i2] = feam[i2] + mA
                const mB = (wF * L ** 2 / 60) * (e / L) ** 2
                      * (10 - 10 * e / L + 3 * e ** 2 / L ** 2)
                    - ((wF - wT) * L ** 2 / 60) * (c / L) ** 2
                      * (10 - 10 * c / L + 3 * c ** 2 / L ** 2)
                    - (wT * L ** 2 / 12) * (c / L) ** 2 * (6 - 8 * c / L + 3 * c ** 2 / L ** 2)
                feam[i4] = feam[i4] - mB
                feam[i1] = feam[i1]
                           + 0.5 * (wT * b) * (L - centerOfTriangle) / L + (mA - mB) / L
                feam[i3] = feam[i3] + 0.5 * (wT * b) * centerOfTriangle / L + (mB - mA) / L
              }
              if (gotOppSigns) {
                //Do the right-hand triangle load
                // const wL = 0
                // const wR = seg.w2[loadType]
                const wT = seg.w2[loadType]
                const centerOfTriangle = a2 + 2 * b2 / 3
                const wF = wT * e2 / b2
                const mA = (wF * L ** 2 / 60) * (e2 / L) ** 3 * (5 - 3 * e2 / L)
                    - ((wF - wT) * L ** 2 / 60) * (c2 / L) ** 3 * (5 - 3 * c2 / L)
                    - (wT * L ** 2 / 12) * (c2 / L) ** 3 * (4 - 3 * c2 / L)
                feam[i2] = feam[i2] + mA
                const mB = (wF * L ** 2 / 60) * (e2 / L) ** 2
                    * (10 - 10 * e2 / L + 3 * e2 ** 2 / L ** 2)
                    - ((wF - wT) * L ** 2 / 60) * (c2 / L) ** 2
                    * (10 - 10 * c2 / L + 3 * c2 ** 2 / L ** 2)
                    // eslint-disable-next-line max-len
                    - (wT * L ** 2 / 12) * (c2 / L) ** 2 * (6 - 8 * c2 / L + 3 * c2 ** 2 / L ** 2)
                feam[i4] = feam[i4] - mB
                feam[i1] = feam[i1]
                          + 0.5 * (wT * b2) * (L - centerOfTriangle) / L + (mA - mB) / L
                feam[i3] = feam[i3] + 0.5 * (wT * b2) * centerOfTriangle / L + (mB - mA) / L
              }
            }
          }
        }

        //Find the Nodal Force Matrix, NFM
        let j = 0
        for (let i = 1; i <= numNodes; i++) {
          if (i === 1) {
            if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
              nfm[1] = -feam[1] - feam[2]
              nfm[2] = -feam[3]
              if (isLiveish(loadType) && numPatterns > 1) {
                if (k === 0) {
                  nfm[1] = nfm[1] - nodes[1].P[loadType]
                  nfm[2] = nfm[2] - nodes[1].M[loadType]
                }
              } else {
                nfm[1] = nfm[1] - nodes[1].P[loadType]
                nfm[2] = nfm[2] - nodes[1].M[loadType]
              }

              j = 2
            } else if (nodes[i].fixity === "fixed") {
              //do nothing
            } else if (nodes[i].fixity === "pinned") {
              j += 1
              nfm[1] = -feam[3]
              if (isLiveish(loadType) && numPatterns > 1) {
                if (k === 1) {
                  nfm[j] = nfm[j] - nodes[1].M[loadType]
                }
              } else {
                nfm[j] = nfm[j] - nodes[1].M[loadType]
              }
            }
          } else if (i === numNodes) {
            if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
              j += 1
              nfm[j] = -feam[5 * numSpans - 1] - feam[5 * numSpans + 1]
              j += 1
              nfm[j] = -feam[5 * numSpans]
              if (isLiveish(loadType) && numPatterns > 1) {
                if (k === numSpans) {
                  nfm[j - 1] = nfm[j - 1] - nodes[numNodes].P[loadType]
                  nfm[j] = nfm[j] - nodes[numNodes].M[loadType]
                }
              } else {
                nfm[j - 1] = nfm[j - 1] - nodes[numNodes].P[loadType]
                nfm[j] = nfm[j] - nodes[numNodes].M[loadType]
              }
            } else if (nodes[i].fixity === "fixed") {
              //do nothing
            } else if (nodes[i].fixity === "pinned") {
              j += 1
              nfm[j] = -feam[5 * numSpans]
              if (isLiveish(loadType) && numPatterns > 1) {
                if (k === numSpans) {
                  nfm[j] = nfm[j] - nodes[numNodes].M[loadType]
                }
              } else {
                nfm[j] = nfm[j] - nodes[numNodes].M[loadType]
              }
            }
          } else {
            if (nodes[i].fixity === "continuous" || nodes[i].fixity === "spring") {
              j += 1
              nfm[j] = -feam[5 * (i - 1) - 1] - feam[5 * (i - 1) + 1] - feam[5 * (i - 1) + 2]
              j += 1
              nfm[j] = -feam[5 * (i - 1)] - feam[5 * (i - 1) + 3]
              if ((loadType === 3 || loadType === 5 || loadType === 6) && numPatterns > 1) {
                if (k === i) {
                  nfm[j - 1] = nfm[j - 1] - nodes[i].P[loadType]
                  nfm[j] = nfm[j] - nodes[i].M[loadType]
                }
              } else {
                nfm[j - 1] = nfm[j - 1] - nodes[i].P[loadType]
                nfm[j] = nfm[j] - nodes[i].M[loadType]
              }
            } else if (nodes[i].fixity === "hinge") {
              j += 1
              nfm[j] = -feam[5 * (i - 1) - 1] - feam[5 * (i - 1) + 1] - feam[5 * (i - 1) + 2]
              j += 1
              nfm[j] = -feam[5 * (i - 1)]
              if ((loadType === 3 || loadType === 5 || loadType === 6) && numPatterns > 1) {
                if (k === i) {
                  nfm[j - 1] = nfm[j - 1] - nodes[i].P[loadType]
                  nfm[j] = nfm[j] - nodes[i].M[loadType]
                }
              } else {
                nfm[j - 1] = nfm[j - 1] - nodes[i].P[loadType]
                nfm[j] = nfm[j] - nodes[i].M[loadType]
              }

              j += 1
              nfm[j] = -feam[5 * (i - 1) + 3]
            } else if (nodes[i].fixity === "proppedHinge") {
              j += 1
              nfm[j] = -feam[5 * (i - 1)]
              j += 1
              nfm[j] = -feam[5 * (i - 1) + 3]
            } else if (nodes[i].fixity === "fixed") {
              //do nothing
            } else if (nodes[i].fixity === "pinned") {
              j += 1
              nfm[j] = -feam[5 * (i - 1)] - feam[5 * (i - 1) + 3]
              if ((loadType === 3 || loadType === 5 || loadType === 6) && numPatterns > 1) {
                if (k === i) {
                  nfm[j] = nfm[j] - nodes[i].M[loadType]
                }
              } else {
                nfm[j] = nfm[j] - nodes[i].M[loadType]
              }
            }
          }
        }

        //Now do the rest of the matrix operations for the current load type
        if (numDegreesOfFreedom === 0) {
          dm = [0]
        } else if (numDegreesOfFreedom === 1) {
          dm = [0, nfm[1] / sm[1][1]]
        } else {
          dm = solveViaLDLt(diag, ltm, nfm, bandWidth)
        }

        // Get the Member Action Matrix, MAM.
        // Multiply lsmDtm times dm, then add the resulting column vector to the FEAM
        mam = lsmDtm.map(row => dotProduct(row, dm)).map((e, i) => e + feam[i])

        //Set elements of mam = 0 where fixity so dictates
        for (let i = 1; i <= numEndActions; i++) {
          if (Math.abs(mam[i]) < 0.00000000000001) { mam[i] = 0 }
        }

        switch (loadType) {
          case DEAD:
            mamD = clone(mam)
            if (EI !== 1) { dmD = clone(dm) }
            break
          case FLUID:
            mamF = clone(mam)
            if (EI !== 1) { dmF = clone(dm) }
            break
          case LIVE:
            if (typeof mamL[0] === "number") {
              mamL = clone(mam)
              if (EI !== 1) { dmL = clone(dm) }
            } else {
              for (let j = 1; j < 5 * numSpans + 1; j++) {
                mamL[j][k - 1] = mam[j] //mam for live loads on span k
              }
              if (EI !== 1) {
                for (let j = 1; j <= numDegreesOfFreedom; j++) {
                  dmL[j][k] = dm[j]
                }
              }
            }
            break
          case HORIZ:
            mamH = clone(mam)
            if (EI !== 1) { dmH = clone(dm) }
            break
          case ROOFLIVE:
            if (typeof mamLr[0] === "number") {
              mamLr = clone(mam)
              if (EI !== 1) { dmLr = clone(dm) }
            } else {
              for (let j = 1; j < 5 * numSpans + 1; j++) {
                mamLr[j][k - 1] = mam[j]
              }
              if (EI !== 1) {
                for (let j = 0; j < numDegreesOfFreedom; j++) {
                  dmLr[j][k] = dm[j]
                }
              }
            }
            break
          case SNOW:
            if (typeof mamS[0] === "number") {
              mamS = clone(mam)
              dmS = clone(dm)
            } else {
              for (let j = 1; j < 5 * numSpans + 1; j++) {
                mamS[j][k - 1] = mam[j]
              }
              if (EI !== 1) {
                for (let j = 0; j < numDegreesOfFreedom; j++) {
                  dmS[j][k] = dm[j]
                }
              }
            }
            break
          case RAIN:
            mamR = clone(mam)
            if (EI !== 1) { dmR = clone(dm) }
            break
          case WIND:
            mamW = clone(mam)
            if (EI !== 1) { dmW = clone(dm) }
            break
          case EQ:
            mamE = clone(mam)
            if (EI !== 1) { dmE = clone(dm) }
            break
        }

        // Find the reactions
        if (numPatterns === 1 || !(beam.containsLive && isLiveish(loadType))) {
          if (nodes[1].fixity === "fixed") {
            nodes[1].Mr[loadType] = mam[3] + nodes[1].M[loadType]
          }
          if (nodes[1].fixity === "spring") {
            nodes[1].Pr[loadType] = mam[1]
          } else if (nodes[1].fixity !== "continuous") {
            nodes[1].Pr[loadType] = -mam[2] - nodes[1].P[loadType]
          }

          for (let j = 2; j <= numSpans; j++) {
            if (nodes[j].fixity === "fixed") {
              nodes[j].Mr[loadType] = mam[5 * (j - 1)]
                                       + mam[5 * (j - 1) + 3] + nodes[j].M[loadType]
            }
            if (nodes[j].fixity === "spring") {
              nodes[j].Pr[loadType] = mam[5 * (j - 1) + 1]
            } else if (nodes[j].fixity !== "continuous") {
              nodes[j].Pr[loadType] = -mam[5 * (j - 1) - 1] - mam[5 * (j - 1) + 2]
                  - nodes[j].P[loadType]
            }
          }

          if (nodes[numNodes].fixity === "fixed") {
            nodes[numNodes].Mr[loadType] = mam[5 * numSpans] + nodes[numNodes].M[loadType]
          }
          if (nodes[numNodes].fixity === "spring") {
            nodes[numNodes].Pr[loadType] = mam[5 * numSpans + 1]
          } else if (nodes[numNodes].fixity !== "continuous") {
            nodes[numNodes].Pr[loadType] = -mam[5 * numSpans - 1] - nodes[numNodes].P[loadType]
          }
        } else {
          let mTest = 0
          if (nodes[1].fixity === "fixed") {
            mTest = mam[3] + nodes[1].M[loadType]
            if (mTest > 0) { nodes[1].Mr[loadType] = nodes[1].Mr[loadType] + mTest }
            if (mTest < 0) { nodes[1].MrMin[loadType] = nodes[1].MrMin[loadType] + mTest }
          }
          let pTest = 0
          if (nodes[1].fixity === "spring") {
            pTest = mam[1]
          } else if (nodes[1].fixity !== "continuous") {
            pTest = -mam[2] - nodes[1].P[loadType]
          }
          if (pTest > 0) { nodes[1].Pr[loadType] = nodes[1].Pr[loadType] + pTest }
          if (pTest < 0) { nodes[1].PrMin[loadType] = nodes[1].PrMin[loadType] + pTest }

          for (let j = 1; j < numSpans; j++) {
            if (nodes[j].fixity === "fixed") {
              mTest = mam[5 * (j - 1)] + mam[5 * (j - 1) + 3] + nodes[j].M[loadType]
              if (mTest > 0) { nodes[j].Mr[loadType] = nodes[j].Mr[loadType] + mTest }
              if (mTest < 0) { nodes[j].MrMin[loadType] = nodes[j].MrMin[loadType] + mTest }
            }
            pTest = 0
            if (nodes[j].fixity === "spring") {
              nodes[j].Pr[loadType] = nodes[j].Pr[loadType] + mam[5 * (j - 1) + 1]
            } else if (nodes[j].fixity !== "continuous") {
              pTest = -mam[5 * (j - 1) - 1] - mam[5 * (j - 1) + 2] - nodes[j].P[loadType]
            }
            if (pTest > 0) { nodes[j].Pr[loadType] = nodes[j].Pr[loadType] + pTest }
            if (pTest < 0) { nodes[j].PrMin[loadType] = nodes[j].PrMin[loadType] + pTest }
          }

          if (nodes[numNodes].fixity === "fixed") {
            mTest = mam[5 * numSpans] + nodes[numSpans].M[loadType]
            if (mTest > 0) {
              nodes[numNodes].Mr[loadType] = nodes[numNodes].Mr[loadType] + mTest
            }
            if (mTest < 0) {
              nodes[numNodes].MrMin[loadType] = nodes[numNodes].MrMin[loadType] + mTest
            }
          }

          pTest = 0
          if (nodes[numNodes].fixity === "spring") {
            nodes[numNodes].Pr[loadType] = nodes[numNodes].Pr[loadType] + mam[5 * numSpans + 1]
          } else if (nodes[numNodes].fixity !== "continuous") {
            pTest = -mam[5 * numSpans - 1] - nodes[j].P[loadType]
          }
          if (pTest > 0) {
            nodes[numNodes].Pr[loadType] = nodes[numNodes].Pr[loadType] + pTest
          }
          if (pTest < 0) {
            nodes[numNodes].PrMin[loadType] = nodes[numNodes].PrMin[loadType] + pTest
          }
        } //finished finding the reactions

      }
    }
  }
  return [
    [mamD, mamL, mamLr, mamS, mamF, mamH, mamR, mamW, mamE],
    [dmD, dmL, dmLr, dmS, dmF, dmH, dmR, dmW, dmE]
  ]
}

const createLsmDtm = (ssm, dtm, nodes, numEndActions, numDegreesOfFreedom) => {
// Create LSM × DTM

  let lsmDtm = new Array(numEndActions + 1).fill(0)
  lsmDtm = lsmDtm.map(e => new Array(numDegreesOfFreedom + 1).fill(0))

  for (let i = 1; i <= numEndActions; i++) {
    const iSpan = Math.trunc((i - 1) / 5) + 1
    const g = i - 1 - 5 * (iSpan - 1)

    for (let j = 1; j <= numDegreesOfFreedom; j++) {
      if (g === 0) {
        lsmDtm[i][j] = nodes[iSpan].k * dtm[i][j]
      } else {
        const kStart = 5 * iSpan - 3
        const kEnd = 5 * iSpan
        let h = 0
        for (let k = kStart; k <= kEnd; k++) {
          h += 1
          lsmDtm[i][j] = lsmDtm[i][j] + ssm[iSpan][g][h] * dtm[k][j]
        }
      }
    }
  }
  return lsmDtm
}

const createSM = (dtm, lsmDtm, numDegreesOfFreedom) => {
  // Create the Stiffness Matrix, SM.
  // SM = DTM**T × LsmDtm
  let sm = Array(numDegreesOfFreedom + 1).fill(0)
  sm = sm.map(e => Array(numDegreesOfFreedom + 1).fill(0))
  const h = lsmDtm.length - 1
  let bandWidth = 1
  for (let i = 1; i < dtm[0].length; i++) {
    for (let j = 1; j <= i; j++) {                       // Only the lower half of SM.
      for (let k = 1; k <= h; k++) {
        sm[i][j] = sm[i][j] + dtm[k][i] * lsmDtm[k][j]   // DTM**T, not DTM.
      }
      if (sm[i][j] !== 0 && i - j > bandWidth) { bandWidth = i - j}  // lower band width
    }
  }
  return [sm, bandWidth]
}

const luDecomposition = (sm, bandWidth) => {
  // Perform the LU Decomposition of the stiffness matrix, SM.
  // This is in preparation for the LDL**T matrix solution to come later.

  const diag = new Array(sm.length).fill(0)
  // Lower Triangular matrix, ltm
  let ltm = new Array(sm.length).fill(0)
  ltm = ltm.map(e => new Array(sm.length - 1).fill(0))

  const n = sm.length - 1    // number of equations

  for (let j = 1; j <= n; j++) {
    let kStar = Math.max(j - bandWidth, 1)
    diag[j] = sm[j][j]
    for (let k = kStar; k <= j - 1; k++) {
      diag[j] = diag[j] - diag[k] * ltm[j][k] * ltm[j][k]
    }

    const iMax = Math.min(j + bandWidth, n)
    for (let i = j + 1; i <= iMax; i++) {
      kStar =  Math.max(i - bandWidth, 1)
      let sum = 0
      for (let k = kStar; k <= j - 1; k++) {
        sum = sum + diag[k] * ltm[j][k] * ltm[i][k]
      }
      ltm[i][j] = (sm[i][j] - sum) / diag[j]
    }
  }
  return [diag, ltm]
}

const solveViaLDLt = (diag, ltm, b, bandWidth) => {
  // Solve for dm() in a system of equations expressed by matrices: SM()× dm() = NFM()

  // This sub// s method is a banded version of the LDL**T solver.
  // LDL**T takes advantage of the fact that SM is a symmetric, positive-definite matrix.
  // The algorithm will overwrite b(), which starts out as NFM and ends as dm.
  // We already have the diag & ltm matrices, so we can go directly to the LU solution.

  const n = b.length - 1       // number of equations

  // Forward substitution
  for (let i = 2; i <= n; i++) {
    const kStar = i - bandWidth < 1 ? 1 : i - bandWidth
    for (let k = kStar; k <= i - 1; k++) {
      b[i] = b[i] - ltm[i][k] * b[k]
    }
  }

  // Diagonal scaling and backward substitution
  b[n] = b[n] / diag[n]
  for (let i = n - 1; i >= 1; i--) {
    b[i] = b[i] / diag[i]
    const kStar = Math.min(n, i + bandWidth)
    for (let k = i + 1; k <= kStar; k++) {
      b[i] = b[i] - ltm[k][i] * b[k]
    }
  }

  return b
}
