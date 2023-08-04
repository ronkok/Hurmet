export function populateMAM(loadFactors, combern, loadPattern, beam, nodes, spans, actions) {
  let mam = new Array(beam.numEndActions).fill(0) // Member end Action Matrix
  const numSpans = spans.length - 1
  const numNodes = nodes.length - 1
  const numPatterns = beam.numPatterns
  const didNode = new Array(numNodes)

  // Fill mam with dead load
  const deadLoadFactor = loadFactors[1];
  mam = mam.map((e, i) => deadLoadFactor * actions[1][i])
  for (let i = 1; i <= numSpans; i++) {
    nodes[i].Pf = deadLoadFactor * nodes[i].P[1];
    nodes[i].Mf = deadLoadFactor * nodes[i].M[1];
    for (let j = 0; j < spans[i].segments.length; j++) {
      const seg = spans[i].segments[j];
      seg.w1f[combern] = deadLoadFactor * seg.w1[1];
      seg.w2f = deadLoadFactor * seg.w2[1];
      seg.Pf = deadLoadFactor * seg.P[1];
      seg.Mf = deadLoadFactor * seg.M[1];
    }
  }

  // Superimpose the other load types onto mam.
  for (let iLoadType = 2; iLoadType <= 9; iLoadType++) {
    const loadFactor = loadFactors[iLoadType];
    if (loadFactor > 0 && beam.gotType[iLoadType]) {
      if (!beam.getsPattern[iLoadType] || numPatterns === 1) {
        mam = mam.map((e, i) => e + loadFactor * actions[iLoadType][i])
        for (let i = 1; i <= numSpans; i++) {
          nodes[i].Pf = nodes[i].Pf + loadFactor * nodes[i].P[iLoadType];
          nodes[i].Mf = nodes[i].Mf + loadFactor * nodes[i].M[iLoadType];
          for (let j = 0; j < spans[i].segments.length; j++) {
            const seg = spans[i].segments[j];
            seg.w1f[combern] = seg.w1f[combern] + loadFactor * seg.w1[iLoadType];
            seg.w2f = seg.w2f + loadFactor * seg.w2[iLoadType];
            seg.Pf = seg.Pf + loadFactor * seg.P[iLoadType];
            seg.Mf = seg.Mf + loadFactor * seg.M[iLoadType];
          }
        }
      } else {
        // load case includes live load patterns
        for (let k = 1; k <= numSpans; k++) {
          if (loadPattern.includes(k)) {
            let ii = 0
            for (let j = 1; j <= numSpans; j++) {
              ii = 5 * j - 4
              mam[ii] = mam[ii] + loadFactor * actions[iLoadType][ii][k - 1]
              mam[ii + 1] = mam[ii + 1] + loadFactor * actions[iLoadType][ii + 1][k - 1]
              mam[ii + 2] = mam[ii + 2] + loadFactor * actions[iLoadType][ii + 2][k - 1]
              mam[ii + 3] = mam[ii + 3] + loadFactor * actions[iLoadType][ii + 3][k - 1]
              mam[ii + 4] = mam[ii + 4] + loadFactor * actions[iLoadType][ii + 4][k - 1]
            }
            mam[ii + 5] = mam[ii + 5] + loadFactor * actions[iLoadType][ii + 5][k - 1]
          }
        }

        // Do node loads.
        // Include a node load if the span on either side is in the load pattern.
        didNode.fill(false)
        for (let i = 1; i <= numSpans; i++) {
          if (loadPattern.includes(i)) {
            if (!didNode[i]) {
              nodes[i].Pf = nodes[i].Pf + loadFactor * nodes[i].P[iLoadType]
              nodes[i].Mf = nodes[i].Mf + loadFactor * nodes[i].M[iLoadType]
              didNode[i] = true
            }
            if (!didNode[i + 1]) {
              nodes[i + 1].Pf = nodes[i + 1].Pf + loadFactor * nodes[i + 1].P[iLoadType]
              nodes[i + 1].Mf = nodes[i + 1].Mf + loadFactor * nodes[i + 1].M[iLoadType]
              didNode[i + 1] = true
            }
          }
          for (let j = 0; j < spans[i].segments.length; j++) {
            const seg = spans[i].segments[j]
            if (loadPattern.includes(i)) {
              seg.w1f[combern] = seg.w1f[combern] + loadFactor * seg.w1[iLoadType]
              seg.w2f = seg.w2f + loadFactor * seg.w2[iLoadType]
              seg.Pf = seg.Pf + loadFactor * seg.P[iLoadType]
              seg.Mf = seg.Mf + loadFactor * seg.M[iLoadType]
            }
          }
        }
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
