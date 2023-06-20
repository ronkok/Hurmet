import { Rnl } from "../rational.js"

// Some helper functions and objects.

// Lengths and x-coordinates are written as rational numbers, not floating point.
// That way, we can make a lessThanOrEqualTo comparison w/o floating point errors.

const nodeFixity = { p: "pinned", f: "fixed", h: "hinge", ph: "proppedHinge", s: "spring" }
const ord = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

const loadType = {
  // type 0 is total service load, an accumulation of all of the others.
  dead: 1,  D: 1, d: 1, load: 1, // dead
  fluid: 2, F: 2, f: 2, // fluid
  live: 3,  L: 3, l: 3, // live
  H: 4, h: 4, // horizontal load, usually soil against a retaining wall
  roof: 5,  Lr: 5, lr: 5, LR: 5, lR: 5, // roof live
  snow: 6,  S: 6, s: 6, // snow
  rain: 7,  R: 7, r: 7, // rain
  wind: 8,  W: 8, w: 8, // wind
  EQ: 9,    E: 9, e: 9  // earthquake
}

const newNode = (fixity, k, xCoordinate) => {
  return {
    fixity,
    k: (fixity === "spring" ? k : 0),
    x: xCoordinate,
    P: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Pr: [0, 0, 0, 0, 0, 0, 0, 0, 0], // "r" stands for reaction
    PrMin: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Mr: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    MrMin: [0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
}

const incrementDoF = fixity => {
  switch (fixity) {
    case "pinned":
      return 1
    case "fixed":
      return 0
    case "hinge":
      return 3
    default:
      return 2
  }
}

const newSegment = (length, xOfLeftEnd) => {
  // A "segment" is a beam section between points of load discontinuity.
  return {
    length,
    xOfLeftEnd,
    // Point load applied at left end of segments.
    // Array dim'ed to 9 for different load types, e.g., dead, live, wind, etc.
    P: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0],  // point moment
    Pf: 0, // factored point load at left end
    Mf: 0,
    w1: [0, 0, 0, 0, 0, 0, 0, 0, 0], // distributed load at left end of segments.
    w2: [0, 0, 0, 0, 0, 0, 0, 0, 0], // at right end.
    Vmax: {
      left: { value: 0, case: 0 },
      mid: { value: 0, case: 0, x: 0 },
      right: { value: 0, case: 0 }
    },
    Vmin: {
      left: { value: 0, case: 0 },
      mid: { value: 0, case: 0, x: 0 },
      right: { value: 0, case: 0 }
    },
    Mmax: {
      left: { value: 0, case: 0 },
      mid: { value: 0, case: 0, x: 0 },
      right: { value: 0, case: 0 }
    },
    Mmin: {
      left: { value: 0, case: 0 },
      mid: { value: 0, case: 0, x: 0 },
      right: { value: 0, case: 0 }
    }
  }
}

const identifySegment = (xGlobal, span) => {
  // Which segment contains xGlobal?
  for (let i = 0; i < span.segments.length; i++) {
    const xSegEnd = Rnl.add(span.segments[i].xOfLeftEnd, span.segments[i].length)
    if (Rnl.lessThanOrEqualTo(xGlobal, xSegEnd)) { return i }
  }
  return -1
}

const splitSegment = (segments, iSeg, xGlobal) => {
  // segments` is an array.
  // We need to split the element at segments[iSeg] into two elements.
  const length = Rnl.subtract(xGlobal, segments[iSeg].xOfLeftEnd)
  if (iSeg === 0) {
    segments.unshift(newSegment(length, segments[0].xOfLeftEnd))
  } else {
    const s1 = segments.slice(0, iSeg)
    s1.push(newSegment(length, segments[iSeg].xOfLeftEnd))
    segments =  s1.concat(segments.slice(iSeg))
  }
  const seg = segments[iSeg + 1]
  const newSeg = segments[iSeg]
  for (let i = 0; i < 9; i++) {
    const slope = (seg.w2[i] - seg.w1[i]) / Rnl.toNumber(seg.length)
    newSeg.w1[i] = seg.w1[i]
    newSeg.w2[i] = seg.w1[i]
    seg.w1[i] = seg.w1[i] + slope * Rnl.toNumber(length)
    newSeg.P[i] = seg.P[i]
    seg.P[i] = 0
    newSeg.M[i] = seg.M[i]
    seg.M[i] = 0
  }
  seg.xOfLeftEnd = xGlobal
  seg.length = Rnl.subtract(seg.length, newSeg.length)
  return segments
}

// Here's the main function of this module.
// Take the raw input strings, validate them, and load them
// into data structures for use by the analyze function.
export function populateData(input) {
  const errorMsg = ""
  const beam = {
    E: 0, // modulus of elasticity
    I: 0, // moment of inertia
    k: 0, // spring constant
    convention: input.convention ? 1 : -1, // Plot positive moment on comp or tension side.
    SI: input.SI || false, // boolean. Are we using SI units?
    doLiveLoadPatterns: input.patterns,
    comboName: input.combinations,
    LLF: input.LLF,
    SDS: input.SDS,
    gotType: [false, false, false, false, false, false, false, false, false],
    wMax: 0, // default line load maximum
    x: 180, // x coordinate of the beam's left end inside the SVG, in px
    allLoadsAreUniform: true // subject to change below
  }

  if (input.E === 1 || input.E === 0) {
    // We don't know E or I, so we won't do a deflection diagram.
    // But we will still do the shear and moment diagrams.
    beam.E = 1
    beam.I = 1
    beam.k = 0
  } else {
    beam.E = input.E  // Modulus of elasticity
    beam.I = input.I  // Moment of inertia, I
    beam.k = input.k  // Spring constant
  }
  if (beam.E === 1 && beam.I === 1 && input.k !== 0) {
    return ["E and I are necessary for an analysis with spring supports."]
  }
  beam.EI = beam.E * beam.I

  // Load in node data and span data.
  // Definitions
  // (1) A "span" is a section of beam between two user-defined nodes.
  // (2) A "segment" is a section of beam between nodes or points of load discontinuity.
  // Each span thus contains one or more segments.
  let i = 0
  let cummulativeLength = Rnl.zero
  const nodes = []
  const spans = []
  beam.numDegreesOfFreedom = 0
  for (i = 0; i < input.nodes.length; i++) {
    // Process node input.
    const fixity = input.nodes[i] === "none" ? "continuous" : nodeFixity[input.nodes[i]];
    if (!fixity) { return [`The ${ord[i]} node designation is invalid.`] }
    if (fixity === "spring" && input.k === 0) {
      return ["Error. A model with a spring needs a spring constant, k."]
    }
    nodes.push(newNode(fixity, beam.k, cummulativeLength))
    beam.numDegreesOfFreedom += incrementDoF(fixity)
    if (i < input.spanLength.length) {
      // Process span input.
      const length = input.spanLength[i]
      spans.push({
        length,
        segments: Array(1).fill(newSegment(length, cummulativeLength))
      })
      cummulativeLength = Rnl.add(cummulativeLength, length)
    }
  }
  if (spans.length === 0) { return [`No span lengths.`] }
  const numSpans =  spans.length
  beam.numSegments = numSpans
  beam.length = nodes[nodes.length - 1].x

  // Point Loads
  for (i = 0; i < input.loads.length; i++) {
    const load = input.loads[i]
    if (load.shape === "w") {
      // Skip the distributed loads for now. We'll pick them up later.
      continue
    }
    if (load.from === 0) { continue }
    let type = load.type === "none" ? 0 : loadType[load.type]
    if (type === 0) {
      if (beam.comboName !== "service") {
        return [`The ${ord[i]} load must have a load type defined.`]
      } else {
        type = 1 // In a service load analysis, treat unlabled loads as Dead loads.
      }
    }

    const P = input.loads[i].P
    const M = input.loads[i].M
    const x = input.loads[i].from

    let foundAHome = false
    for (let j = 0; j < nodes.length; j++) {
      if (Rnl.areEqual(x, nodes[j].x)) {
        nodes[j].P[0] += P
        nodes[j].M[0] += M
        if (type !== 0) { nodes[j].P[type] += P }
        foundAHome = true
        break
      }
    }
    if (foundAHome) { continue }

    for (let j = 0; j < spans.length; j++) {
      if (Rnl.greaterThan(x, nodes[j].x) && Rnl.lessThan(x, nodes[j + 1].x)) {
        const span = spans[j]
        const iSeg = identifySegment(x, span)
        if (Rnl.greaterThan(x, span.segments[iSeg].xOfLeftEnd)) {
          span.segments = splitSegment(span.segments, iSeg, x)
          beam.numSegments += 1
        }
        beam.gotType[0] = true
        span.segments[iSeg + 1].P[0] += P      // add to sum of service loads
        span.segments[iSeg + 1].M[0] += M
        if (type !== 0) {
          beam.gotType[type] = true
          span.segments[iSeg + 1].P[type] += P
          span.segments[iSeg + 1].M[type] += M
        }
      }
    }
  }

  // Distributied loads
  beam.allLoadsAreUniform = true  // initialize the variable
  for (i = 0; i < input.loads.length; i++) {
    const load = input.loads[i];
    if (load.shape !== "w") { continue }
    let type = load.type === "none" ? 0 : loadType[load.type]
    if (type === 0) {
      if (beam.comboName !== "service") {
        return [`The ${ord[i]} load must have a load type defined.`]
      } else {
        type = 1 // In a service load analysis, treat unlabled loads as Dead loads.
      }
    }

    const wStart = load.wStart
    const wEnd = load.wEnd

    if (Math.abs(wStart) > beam.wMax) { beam.wMax = Math.abs(wStart) }
    if (Math.abs(wEnd) > beam.wMax) { beam.wMax = Math.abs(wEnd) }

    const xStart = load.from
    const xEnd = Rnl.isZero(load.to)
      ? cummulativeLength
      : load.to

    const slope = (wEnd - wStart) / Rnl.toNumber(Rnl.subtract(xEnd, xStart))
    if (slope !== 0) {beam.allLoadsAreUniform = false}

    let iStartSpan = 0
    let iEndSpan = 0
    let iStartSeg = 0
    let iEndSeg = 0

    // If necessary, split segments at points of load discontinuity.
    for (let j = 0; j < spans.length; j++) {
      if (Rnl.areEqual(xStart, nodes[j].x)) {
        iStartSpan = j
        iStartSeg = 0
        break
      }
      if (Rnl.greaterThan(xStart, nodes[j].x) && Rnl.lessThan(xStart, nodes[j + 1].x)) {
        for (let k = 0; k < spans[j].segments.length; k++) {
          const seg = spans[j].segments[k]
          if (Rnl.areEqual(xStart, seg.xOfLeftEnd)) {
            iStartSpan = j
            iStartSeg = k
            break
          }
          const segEnd = k < spans[j].segments.length - 1
            ? spans[j].segments[k + 1].xOfLeftEnd
            : nodes[j + 1].x
          if (Rnl.greaterThan(xStart, seg.xOfLeftEnd) && Rnl.lessThan(xStart, segEnd)) {
            spans[j].segments = splitSegment(spans[j].segments, k, xStart)
            beam.numSegments += 1
            iStartSpan = j
            iStartSeg = k + 1
            break
          }
        }
      }
    }

    for (let j = 0; j < spans.length; j++) {
      if (Rnl.areEqual(xEnd, nodes[j + 1].x)) {
        iEndSpan = j
        iEndSeg = spans[j].segments.length - 1
        break
      }
      if (Rnl.greaterThan(xEnd, nodes[j].x) && Rnl.lessThan(xEnd, nodes[j + 1].x)) {
        for (let k = 0; k < spans[j].segments.length; k++) {
          const seg = spans[j].segments[k]
          const segEnd = k < spans[j].segments.length - 1
            ? spans[j].segments[k + 1].xOfLeftEnd
            : nodes[j + 1].x
          if (Rnl.areEqual(xEnd, segEnd)) {
            iEndSpan = j
            iEndSeg = k
            break
          }
          if (Rnl.greaterThan(xEnd, seg.xOfLeftEnd) && Rnl.lessThan(xEnd, segEnd)) {
            spans[j].segments = splitSegment(spans[j].segments, k, xEnd)
            beam.numSegments += 1
            iEndSpan = j
            iEndSeg = k
            break
          }
        }
      }
    }

    // Now apply distributed loads
    for (let iSpan = iStartSpan; iSpan <= iEndSpan; iSpan++) {
      const span = spans[iSpan]
      const startSeg = (iSpan  === iStartSpan ? iStartSeg : 0)
      const endSeg = (iSpan  === iEndSpan ? iEndSeg : spans[iSpan].segments.length - 1)
      for (let iSeg = startSeg; iSeg <= endSeg; iSeg++) {
        const xLeft = span.segments[iSeg].xOfLeftEnd
        const w1 = wStart + slope * Rnl.toNumber(Rnl.subtract(xLeft, xStart))
        const xRight = Rnl.add(span.segments[iSeg].xOfLeftEnd, span.segments[iSeg].length)
        const w2 = wStart + slope * Rnl.toNumber(Rnl.subtract(xRight, xStart))
        // add to sum of service loads
        span.segments[iSeg].w1[0] += w1
        span.segments[iSeg].w2[0] += w2
        // add to specific load type, e.g., dead, live, etc.
        span.segments[iSeg].w1[type] += w1
        span.segments[iSeg].w2[type] += w2
      }
    }

    beam.gotType[0] = true
    if (type !== 0) {
      beam.gotType[type] = true
    }
  }

  // Henceforward there are no <= comparisons.
  // Change lengths into floating point numbers.
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = Rnl.toNumber(nodes[i].x)
  }
  for (let i = 0; i < spans.length; i++) {
    spans[i].length = Rnl.toNumber(spans[i].length)
    for (let j = 0; j < spans[i].segments.length; j++) {
      spans[i].segments[j].length = Rnl.toNumber(spans[i].segments[j].length)
      spans[i].segments[j].xOfLeftEnd = Rnl.toNumber(spans[i].segments[j].xOfLeftEnd)
    }
  }
  beam.length = Rnl.toNumber(beam.length)

  return [errorMsg, beam, nodes, spans]

}
