import { DEAD, FLUID, LIVE, ROOFLIVE, HORIZ, SNOW, RAIN, WIND, EQ } from "./utils"

export function populateMAM(loadFactors, combern, loadPattern, beam, nodes, spans, actions) {
  const [mamD, mamL, mamLr, mamS, mamF, mamH, mamR, mamW, mamE] = actions
  let mam = new Array(beam.numEndActions).fill(0)
  let gotFullSnow = false
  const numSpans = spans.length - 1
  const numNodes = nodes.length - 1
  const numPatterns = beam.numPatterns
  const didNode = new Array(numNodes)
  const didHalfLoad = new Array(numNodes)

  if (loadFactors[DEAD] > 0 && beam.gotType[DEAD]) {
    //do the dead load
    const df = loadFactors[DEAD];
    mam = mam.map((e, i) => mamD[i])
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = df * nodes[i].P[1]
      nodes[i].Mf = df * nodes[i].M[1]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = df * seg.w1[1]
        seg.w2f = df * seg.w2[1]
        seg.Pf = df * seg.P[1]
        seg.Mf = df * seg.M[1]
      }
    }
  }

  if (loadFactors[FLUID] > 0 && beam.gotType[FLUID]) {
    //Do the fluid load
    const ff = loadFactors[FLUID]
    mam = mam.map((e, i) => e + ff * mamF[i])
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = nodes[i].Pf + ff * nodes[i].P[2]
      nodes[i].Mf = nodes[i].Mf + ff * nodes[i].M[2]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = seg.w1f[combern] + ff * seg.w1[2]
        seg.w2f = seg.w2f + ff * seg.w2[2]
        seg.Pf = seg.Pf + ff * seg.P[2]
        seg.Mf = seg.Mf + ff * seg.M[2]
      }
    }
  }

  if (loadFactors[LIVE] > 0 && beam.gotType[LIVE]) {
    //do the live load
    const liveFactor = loadFactors[LIVE]
    if (numPatterns === 1) {
      for (let i = 1; i < mam.length; i++) {
        mam[i] = mam[i] + liveFactor * mamL[i]
      }
      for (let i = 1; i <= numSpans; i++) {
        nodes[i].Pf = nodes[i].Pf + liveFactor * nodes[i].P[LIVE]
        nodes[i].Mf = nodes[i].Mf + liveFactor * nodes[i].M[LIVE]
        for (let j = 0; j < spans[i].segments.length; j++) {
          const seg = spans[i].segments[j]
          seg.w1f[combern] = seg.w1f[combern] + liveFactor * seg.w1[LIVE]
          seg.w2f = seg.w2f + liveFactor * seg.w2[LIVE]
          seg.Pf = seg.Pf + liveFactor * seg.P[LIVE]
          seg.Mf = seg.Mf + liveFactor * seg.M[LIVE]
        }
      }
    } else {
      for (let k = 1; k <= numSpans; k++) {
        if (loadPattern.includes(k)) {
          let ii = 0
          for (let j = 1; j <= numSpans; j++) {
            ii = 5 * j - 4
            mam[ii] = mam[ii] + liveFactor * mamL[ii][k - 1]
            mam[ii + 1] = mam[ii + 1] + liveFactor * mamL[ii + 1][k - 1]
            mam[ii + 2] = mam[ii + 2] + liveFactor * mamL[ii + 2][k - 1]
            mam[ii + 3] = mam[ii + 3] + liveFactor * mamL[ii + 3][k - 1]
            mam[ii + 4] = mam[ii + 4] + liveFactor * mamL[ii + 4][k - 1]
          }
          mam[ii + 5] = mam[ii + 5] + liveFactor * mamL[ii + 5][k - 1]
        }
      }

      //Do node loads.  Include a node load if the span on either side is in the load pattern.
      didNode.fill(false)
      for (let i = 1; i <= numSpans; i++) {
        if (loadPattern.includes(i)) {
          if (!didNode[i]) {
            nodes[i].Pf = nodes[i].Pf + liveFactor * nodes[i].P[LIVE]
            nodes[i].Mf = nodes[i].Mf + liveFactor * nodes[i].M[LIVE]
            didNode[i] = true
          }
          if (!didNode[i + 1]) {
            nodes[i + 1].Pf = nodes[i + 1].Pf + liveFactor * nodes[i + 1].P[LIVE]
            nodes[i + 1].Mf = nodes[i + 1].Mf + liveFactor * nodes[i + 1].M[LIVE]
            didNode[i + 1] = true
          }
        }
        for (let j = 0; j < spans[i].segments.length; j++) {
          const seg = spans[i].segments[j]
          if (loadPattern.includes(i)) {
            seg.w1f[combern] = seg.w1f[combern] + liveFactor * seg.w1[LIVE]
            seg.w2f = seg.w2f + liveFactor * seg.w2[LIVE]
            seg.Pf = seg.Pf + liveFactor * seg.P[LIVE]
            seg.Mf = seg.Mf + liveFactor * seg.M[LIVE]
          }
        }
      }
    }
  }

  if (loadFactors[HORIZ] > 0 && beam.gotType[HORIZ]) {
    //Do the lateral earth pressure load
    const hf = loadFactors[HORIZ]
    for (let i = 1; i < mam.length; i++) {
      mam[i] = mam[i] + hf * mamH[i]
    }
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = nodes[i].Pf + hf * nodes[i].P[HORIZ]
      nodes[i].Mf = nodes[i].Mf + hf * nodes[i].M[HORIZ]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = seg.w1f[combern] + hf * seg.w1[HORIZ]
        seg.w2f = seg.w2f + hf * seg.w2[HORIZ]
        seg.Pf = seg.Pf + hf * seg.P[HORIZ]
        seg.Mf = seg.Mf + hf * seg.M[HORIZ]
      }
    }
  }

  if (loadFactors[ROOFLIVE] > 0 && beam.gotType[ROOFLIVE]) {
    //do the roof live load
    const lrF = loadFactors[ROOFLIVE]
    if (numPatterns === 1) {
      for (let i = 1; i < mam.length; i++) {
        mam[i] = mam[i] + lrF * mamH[i]
      }
      for (let i = 1; i <= numSpans; i++) {
        nodes[i].Pf = nodes[i].Pf + lrF * nodes[i].P[ROOFLIVE]
        nodes[i].Mf = nodes[i].Mf + lrF * nodes[i].M[ROOFLIVE]
        for (let j = 0; j < spans[i].segments.length; j++) {
          const seg = spans[i].segments[j]
          seg.w1f[combern] = seg.w1f[combern] + lrF * seg.w1[ROOFLIVE]
          seg.w2f = seg.w2f + lrF * seg.w2[5]
          seg.Pf = seg.Pf + lrF * seg.P[ROOFLIVE]
          seg.Mf = seg.Mf + lrF * seg.M[ROOFLIVE]
        }
      }
    } else {
      for (let k = 1; k <= numSpans; k++) {
        if (loadPattern.includes(k)) {
          let ii = 0
          for (let j = 1; j <= numSpans; j++) {
            ii = 5 * j - 4
            mam[ii] = mam[ii] + lrF * mamLr[ii][k - 1]
            mam[ii + 1] = mam[ii + 1] + lrF * mamLr[ii + 1][k - 1]
            mam[ii + 2] = mam[ii + 2] + lrF * mamLr[ii + 2][k - 1]
            mam[ii + 3] = mam[ii + 3] + lrF * mamLr[ii + 3][k - 1]
            mam[ii + 4] = mam[ii + 4] + lrF * mamLr[ii + 4][k - 1]
          }
          mam[ii + 5] = mam[ii + 5] + lrF * mamLr[ii + 4, k - 1]
        }
      }

      didNode.fill(false)
      for (let k = 1; k <= numSpans; k++) {
        if (loadPattern.includes(k)) {
          if (!didNode[k]) {
            nodes[k].Pf = nodes[k].Pf + lrF * nodes[k].P[ROOFLIVE]
            nodes[k].Mf = nodes[k].Mf + lrF * nodes[k].M[ROOFLIVE]
            didNode[k] = true
          }
          if (!didNode[k + 1]) {
            nodes[k + 1].Pf = nodes[k + 1].Pf + lrF * nodes[k + 1].P[ROOFLIVE]
            nodes[k + 1].Mf = nodes[k + 1].Mf + lrF * nodes[k + 1].M[ROOFLIVE]
            didNode[k + 1] = true
          }
        }
      }

      for (let i = 1; i <= numSpans; i++) {
        if (loadPattern.includes(i)) {
          for (let j = 0; j < spans[i].segments.length; j++) {
            const seg = spans[i].segments[j]
            seg.w1f[combern] = seg.w1f[combern] + lrF * seg.w1[ROOFLIVE]
            seg.w2f = seg.w2f + lrF * seg.w2[ROOFLIVE]
            seg.Pf = seg.Pf + lrF * seg.P[ROOFLIVE]
            seg.Mf = seg.Mf + lrF * seg.M[ROOFLIVE]
          }
        }
      }
    }
  }

  if (loadFactors[SNOW] > 0 && beam.gotType[SNOW]) {
    const sf = loadFactors[SNOW]
    if (numPatterns === 1) {
      for (let i = 1; i < mam.length; i++) {
        mam[i] = mam[i] + sf * mamS[i]
      }
      for (let i = 1; i <= numSpans; i++) {
        nodes[i].Pf = nodes[i].Pf + sf * nodes[i].P[SNOW]
        nodes[i].Mf = nodes[i].Mf + sf * nodes[i].M[SNOW]
        for (let j = 0; j < spans[i].segments.length; j++) {
          const seg = spans[i].segments[j]
          seg.w1f[combern] = seg.w1f[combern] + sf * seg.w1[SNOW]
          seg.w2f = seg.w2f + sf * seg.w2[SNOW]
          seg.Pf = seg.Pf + sf * seg.P[SNOW]
          seg.Mf = seg.Mf + sf * seg.M[SNOW]
        }
      }
    } else {
      for (let k = 1; k <= numSpans; k++) {
        let f = loadPattern.includes(k) ? 1 : 0.5
        if (loadPattern.length === 0) { f = 0 }
        let ii = 0
        for (let j = 1; j <= numSpans; j++) {
          ii = 5 * j - 4
          mam[ii] = mam[ii] + f * sf * mamS[ii][k - 1]
          mam[ii + 1] = mam[ii + 1] + f * sf * mamS[ii + 1][k - 1]
          mam[ii + 2] = mam[ii + 2] + f * sf * mamS[ii + 2][k - 1]
          mam[ii + 3] = mam[ii + 3] + f * sf * mamS[ii + 3][k - 1]
          mam[ii + 4] = mam[ii + 4] + f * sf * mamS[ii + 4][k - 1]
        }
        mam[ii + 5] = mam[ii + 5] + f * sf * mamS[ii + 5][k - 1]
      }

      //Do node loads
      didNode.fill(false)
      didHalfLoad.fill(false)
      for (let k = 1; k <= numSpans; k++) {
        if (loadPattern.length > 0) {
          gotFullSnow = loadPattern.includes(k)
          //Check node k
          if (didNode[k]) {
            //do nothing more
          } else if (!gotFullSnow && didHalfLoad[k]) {
            //Do nothing more to node k
          } else if (gotFullSnow && !didHalfLoad[k]) {
            nodes[k].Pf = nodes[k].Pf + sf * nodes[k].P[SNOW]
            nodes[k].Mf = nodes[k].Mf + sf * nodes[k].M[SNOW]
            didNode[k] = true
          } else if (!gotFullSnow && !didHalfLoad[k]) {
            nodes[k].Pf = nodes[k].Pf + 0.5 * sf * nodes[k].P[SNOW]
            nodes[k].Mf = nodes[k].Mf + 0.5 * sf * nodes[k].M[SNOW]
            didHalfLoad[k] = true
          }

          //Check node k+1
          if (gotFullSnow) {
            nodes[k + 1].Pf = nodes[k + 1].Pf + sf * nodes[k + 1].P[SNOW]
            nodes[k + 1].Mf = nodes[k + 1].Mf + sf * nodes[k + 1].M[SNOW]
            didNode[k + 1] = true
          } else {
            nodes[k + 1].Pf = nodes[k + 1].Pf + 0.5 * sf * nodes[k + 1].P[SNOW]
            nodes[k + 1].Mf = nodes[k + 1].Mf + 0.5 * sf * nodes[k + 1].M[SNOW]
            didHalfLoad[k + 1] = true
          }
        }
      }

      for (let i = 1; i <= numSpans; i++) {
        for (let j = 0; j < spans[i].segments.length; j++) {
          const seg = spans[i].segments[j]
          let f = loadPattern.includes(i) ? 1 : 0.5
          if (loadPattern.length === 0) { f = 0 }
          seg.w1f[combern] = seg.w1f[combern] + f * sf * seg.w1[6]
          seg.w2f = seg.w2f + f * sf * seg.w2[6]
          seg.Pf = seg.Pf + f * sf * seg.P[6]
          seg.Mf = seg.Mf + f * sf * seg.M[6]
        }
      }
    }
  }

  if (loadFactors[RAIN] > 0 && beam.gotType[RAIN]) {
    const rf = loadFactors[RAIN]
    for (let i = 1; i < mam.length; i++) {
      mam[i] = mam[i] + rf * mamR[i]
    }
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = nodes[i].Pf + rf * nodes[i].P[RAIN]
      nodes[i].Mf = nodes[i].Mf + rf * nodes[i].M[RAIN]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = seg.w1f[combern] + rf * seg.w1[RAIN]
        seg.w2f = seg.w2f + rf * seg.w2[RAIN]
        seg.Pf = seg.Pf + rf * seg.P[RAIN]
        seg.Mf = seg.Mf + rf * seg.M[RAIN]
      }
    }
  }

  if (loadFactors[WIND] > 0 && beam.gotType[WIND]) {
    const wf = loadFactors[WIND]
    for (let i = 1; i < mam.length; i++) {
      mam[i] = mam[i] + wf * mamW[i]
    }
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = nodes[i].Pf + wf * nodes[i].P[WIND]
      nodes[i].Mf = nodes[i].Mf + wf * nodes[i].M[WIND]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = seg.w1f[combern] + wf * seg.w1[WIND]
        seg.w2f = seg.w2f + wf * seg.w2[WIND]
        seg.Pf = seg.Pf + wf * seg.P[WIND]
        seg.Mf = seg.Mf + wf * seg.M[WIND]
      }
    }
  }

  if (loadFactors[EQ] > 0 && beam.gotType[EQ]) {
    const ef = loadFactors[EQ]
    for (let i = 1; i < mam.length; i++) {
      mam[i] = mam[i] + ef * mamE[i]
    }
    for (let i = 1; i <= numSpans; i++) {
      nodes[i].Pf = nodes[i].Pf + ef * nodes[i].P[EQ]
      nodes[i].Mf = nodes[i].Mf + ef * nodes[i].M[EQ]
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        seg.w1f[combern] = seg.w1f[combern] + ef * seg.w1[EQ]
        seg.w2f = seg.w2f + ef * seg.w2[EQ]
        seg.Pf = seg.Pf + ef * seg.P[EQ]
        seg.Mf = seg.Mf + ef * seg.M[EQ]
      }
    }
  }

  for (let i = 1; i <= numSpans; i++) {
    for (let j = 0; j < spans[i].segments.length; j++) {
      const seg = spans[i].segments[j]
      if (seg.length !== 0) {
        seg.slope[combern] = (seg.w2f - seg.w1f[combern]) / seg.length
      }
    }
  }
  return mam
}
