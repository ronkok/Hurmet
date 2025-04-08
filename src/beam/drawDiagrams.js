import { Draw } from "./draw"
import { round } from "./utils"

export function drawDiagrams(beam, nodes, spans, cases, yCoords, extremes, combinations) {
  let diagram = [];
  // Now go thru the comberns again.  Draw the line work this time.
  const numSpans = spans.length - 1
  const [vMax, vMin, mMax, mMin, , , deflMaxCase, deflMinCase, numComberns] = extremes
  const [shearCases, bendingCases] = cases
  const [yV, yM, yDeflection, vScale, mScale, deflectionScale] = yCoords
  const vSmall = 0.01 * (vMax - vMin)
  const mSmall = 0.05 * (mMax - mMin)
  let deflectionMax = 0
  let deflectionMin = 0
  let xDeflectionMax = 0
  let xDeflectionMin = 0
  const xIncrement = beam.length / 50
  const wV = [];
  const wVx = [];
  const wM = [];
  const wMx = [];
  const horizAlign = "middle"

  // Draw the horizontal lines for the shear and moment diagrams
  diagram.push(Draw.textNode("shear", 20, yV + 2))
  diagram.push(Draw.textNode(`(${beam.SI ? "kN" : "kips"})`, 20, yV + 16))
  diagram.push({
    tag: "path",
    attrs: { d: `M${beam.xDiagram} ${yV} h300`, stroke: "black", "stroke-width": '1.5px' }
  })
  diagram.push(Draw.textNode("bending", 20, yM + 2))
  diagram.push(Draw.textNode(`(${beam.SI ? "kN-m" : "kip-ft"})`, 20, yM + 16))
  diagram.push({
    tag: "path",
    attrs: { d: `M${beam.xDiagram} ${yM} h300`, stroke: "black", "stroke-width": '1.5px' }
  })

  if (combinations !== "service") {
    diagram.push(Draw.textNode("factored", 20, yV - 12))
    diagram.push(Draw.textNode("factored", 20, yM - 12))
  }

  // Draw the reactions.
  let f = 0
  for (let i = 1; i < nodes.length; i++) {
    const x = beam.xDiagram + beam.xScale * nodes[i].x
    if (Math.abs(nodes[i].Pr[0]) > 0) {
      f = 1 / (beam.SI ? 1000 : 4448.2216152605)
      const sText = round(nodes[i].Pr[0] * f, 3)
      diagram = diagram.concat(Draw.pointForce(x, beam.yLoad, sText, nodes[i].fixity, true))
    }
    if (Math.abs(nodes[i].Mr[0]) > 0) {
      f = 1 / (beam.SI ? 1000 : 4448.2216152605 * 0.3048)
      const sText = round(nodes[i].Mr[0] * f, 3)
      diagram = diagram.concat(Draw.pointMoment(x, beam.yLoad, sText, true))
    }
  }

  for (let combern = 0; combern <= numComberns; combern++) {
    // Are we in a deflection combern?
    const inaDeflCase = (deflMinCase === combern || deflMaxCase === combern) && beam.EI !== 1
    // Should we plot this combern?
    if (!(shearCases.includes(combern) || bendingCases.includes(combern) || inaDeflCase)) {
      continue // Skip this combern.
    }
    // This is a combern for which we should plot the line work
    // Find detailed shear and moments for the diagrams.  And we check local maximums to see
    // if we should write their values onto the diagram.
    let lastVend = 0
    let lastW2f = 0
    const x = inaDeflCase ? [] : [0];
    const deflection = [];
    const v = [];
    const m = [];
    if (!inaDeflCase) {
      v.push(0)
      m.push(0)
    }
    let k = 0
    for (let i = 1; i <= numSpans; i++) {
      for (let j = 0; j < spans[i].segments.length; j++) {
        const seg = spans[i].segments[j]
        const vEnd = seg.V1[combern] + seg.w1f[combern] * seg.length
            + 0.5 * seg.slope[combern] * seg.length ** 2
        const mEnd = seg.M1[combern] + seg.V1[combern] * seg.length
          + 0.5 * seg.w1f[combern] * seg.length ** 2 + seg.slope[combern] * seg.length ** 3 / 6
        const w2f = seg.w1f[combern] + seg.slope[combern] * seg.length
        let deflectionEnd = 0
        if (inaDeflCase) {
          deflectionEnd = seg.delta1[combern] + seg.theta1[combern] * seg.length
            + (0.5 * seg.M1[combern] * seg.length ** 2 + seg.V1[combern] * seg.length ** 3 / 6
            + seg.w1f[combern] * seg.length ** 4 / 24
            + seg.slope[combern] * seg.length ** 5 / 120) / beam.EI
        }
        // Details for line work
        let xLocal = 0
        k += 1
        x.push(seg.xOfLeftEnd)
        if (inaDeflCase) {
          deflection.push(seg.delta1[combern])
          if (seg.delta1[combern] > deflectionMax) {
            deflectionMax = seg.delta1[combern]
            xDeflectionMax = seg.xOfLeftEnd
          }
          if (seg.delta1[combern] < deflectionMin) {
            deflectionMin = seg.delta1[combern]
            xDeflectionMin = seg.xOfLeftEnd
          }
          if (deflectionEnd > deflectionMax) {
            deflectionMax = deflectionEnd
            xDeflectionMax = seg.xOfLeftEnd + seg.length
          }
          if (deflectionEnd < deflectionMin) {
            deflectionMin = deflectionEnd
            xDeflectionMin = seg.xOfLeftEnd + seg.length
          }
        } else {
          v.push(seg.V1[combern])
          m.push(seg.M1[combern])
        }

        for (let ii = 1; ii <= Math.trunc(seg.length / xIncrement); ii++) {
          k = k + 1
          x.push(x[x.length - 1] + xIncrement)
          xLocal += xIncrement
          if (inaDeflCase) {
            deflection.push(seg.delta1[combern] + seg.theta1[combern] * xLocal
                + (0.5 * seg.M1[combern] * xLocal ** 2
                + seg.V1[combern] * xLocal ** 3 / 6 + seg.w1f[combern] * xLocal ** 4 / 24
                + seg.slope[combern] * xLocal ** 5 / 120) / beam.EI)
            if (deflection[deflection.length - 1] > deflectionMax) {
              deflectionMax = deflection[deflection.length - 1]
              xDeflectionMax = seg.xOfLeftEnd + xLocal
            }
            if (deflection[deflection.length - 1] < deflectionMin) {
              deflectionMin = deflection[deflection.length - 1]
              xDeflectionMin = seg.xOfLeftEnd + xLocal
            }
          } else {
            v.push(seg.V1[combern] + seg.w1f[combern] * xLocal
              + 0.5 * seg.slope[combern] * xLocal ** 2)
            m.push(seg.M1[combern] + seg.V1[combern] * xLocal
              + 0.5 * seg.w1f[combern] * xLocal ** 2 + seg.slope[combern] * xLocal ** 3 / 6)
          }
        }

        k += 1
        x.push(seg.xOfLeftEnd + seg.length)
        if (inaDeflCase) {
          deflection.push(deflectionEnd)
        } else {
          v.push(vEnd)
          m.push(mEnd)
        }

        // Check for local maximums and minimums
        if (seg.Vmax.left.case === combern || seg.Vmin.left.case === combern) {
          // Do we also want to write this value onto the shear diagram?
          if (i === 1 && j === 0) {
            if (Math.abs(seg.V1[combern]) > vSmall) {
              checkVs(seg.V1[combern], 0, wV, wVx, spans, beam.length)
            }
          } else if (!(lastW2f === seg.w1f[combern] &&
              Math.abs(seg.V1[combern] - lastVend) < vSmall)) {
            checkVs(seg.V1[combern], seg.xOfLeftEnd, wV, wVx, spans, beam.length)
          }
        }

        if (seg.Vmax.mid.case === combern || seg.Vmin.mid.case === combern) {
          let xCross = 0
          if (seg.slope[combern] !== 0) {
            xCross = -1 * seg.w1f[combern] / seg.slope[combern]
            if (xCross > 0 && xCross < seg.length) {
              const vMid = seg.V1[combern] + seg.w1f[combern] * xCross
                  + 0.5 * seg.slope[combern] * xCross ** 2
              checkVs(vMid, seg.xOfLeftEnd + xCross, wV, wVx, spans, beam.length)
            }
          }
        }

        if (seg.Vmax.right.case === combern || seg.Vmin.right.case === combern) {
          if (Math.abs(vEnd) > vSmall) {
            checkVs(vEnd, seg.xOfLeftEnd + seg.length, wV, wVx, spans, beam.length)
          }
        }

        if (seg.Mmax.left.case === combern || seg.Mmin.left.case === combern) {
          if (i === 1 && j === 0) {
            if (Math.abs(seg.M1[combern]) > mSmall) {
              checkMs(seg.M1[combern], 0, wM, wMx, spans, beam.length, mSmall)
            }
          } else {
            checkMs(seg.M1[combern], seg.xOfLeftEnd, wM,
              wMx, spans, beam.length, mSmall)
          }
        }

        if (seg.Mmax.mid.case === combern || seg.Mmin.mid.case === combern) {
          let xCross = 0 // initialze the variable
          let mMid = 0
          if (seg.slope[combern] === 0) {
            if (seg.w1f[combern] !== 0) {
              xCross = -seg.V1[combern] / seg.w1f[combern]
              if (xCross > 0 && xCross < seg.length) {
                mMid = seg.M1[combern] + seg.V1[combern] * xCross
                  + 0.5 * seg.w1f[combern] * xCross ** 2 + seg.slope[combern] * xCross ** 3 / 6
                checkMs(mMid, seg.xOfLeftEnd + xCross, wM, wMx, spans, beam.length, mSmall)
              }
            }
          } else {
            let mMid1 = 0
            let mMid2 = 0
            let xCross1 = 0
            let xCross2 = 0
            if ((seg.w1f[combern] ** 2 - 2 * seg.slope[combern] * seg.V1[combern]) > 0) {
              const determinant = Math.sqrt(seg.w1f[combern] ** 2
                    - 2 * seg.slope[combern] * seg.V1[combern])
              xCross1 = -(seg.w1f[combern] - determinant) / seg.slope[combern]
              xCross2 = -(seg.w1f[combern] + determinant) / seg.slope[combern]
              if (xCross1 > 0 && xCross1 < seg.length) {
                xCross = xCross1
                mMid1 = seg.M1[combern] + seg.V1[combern] * xCross
                  + 0.5 * seg.w1f[combern] * xCross ** 2 + seg.slope[combern] * xCross ** 3 / 6
              }
              if (xCross2 > 0 && xCross2 < seg.length) {
                xCross = xCross2
                mMid2 = seg.M1[combern] + seg.V1[combern] * xCross
                  + 0.5 * seg.w1f[combern] * xCross ** 2 + seg.slope[combern] * xCross ** 3 / 6
              }
            }
            if (mMid1 > 0 || mMid2 > 0) {
              if (mMid1 > mMid2) {
                mMid = mMid1
                xCross = xCross1
              } else {
                mMid = mMid2
                xCross = xCross2
              }
            }
            if (xCross > 0 && xCross < seg.length) {
              mMid = seg.M1[combern] + seg.V1[combern] * xCross
                  + 0.5 * seg.w1f[combern] * xCross ** 2 + seg.slope[combern] * xCross ** 3 / 6
              checkMs(mMid, seg.xOfLeftEnd + xCross, wM, wMx, spans, beam.length, mSmall)
            }
          }
        }

        if (seg.Mmax.right.case === combern || seg.Mmin.right.case === combern) {
          checkMs(mEnd, seg.xOfLeftEnd + seg.length, wM, wMx, spans, beam.length, mSmall)
        }

        lastW2f = w2f
        lastVend = vEnd
      }
    }

    // Plot diagrams
    const numDataPoints = k

    // Draw the shear diagrams
    if (shearCases.includes(combern)) {
      let xPoly
      let yPoly

      if (beam.allLoadsAreUniform) {
        // Make the shear diagram out of straight lines.
        let linearV = new Array(2 * beam.numSegments + 3).fill(0)
        linearV = linearV.map(e => [0, 0])
        k = 1
        linearV[k][0] = beam.xDiagram
        linearV[k][1] = yV
        for (let i = 1; i <= numSpans; i++) {
          for (let j = 0; j < spans[i].segments.length; j++) {
            const seg = spans[i].segments[j]
            k = k + 1
            linearV[k][0] = beam.xDiagram + beam.xScale * seg.xOfLeftEnd
            linearV[k][1] = yV - vScale * seg.V1[combern]
            k = k + 1
            linearV[k][0] = beam.xDiagram + beam.xScale * (seg.xOfLeftEnd + seg.length)
            const vEnd = seg.V1[combern] + seg.w1f[combern] * seg.length
                + 0.5 * seg.slope[combern] * seg.length ** 2
            linearV[k][1] = yV - vScale * vEnd
          }
        }
        k = k + 1
        linearV[k][0] = beam.xDiagram + beam.xScale * beam.length
        linearV[k][1] = yV
        const numOfShearDataPoints = k

        xPoly = new Array(numOfShearDataPoints - 1)
        yPoly = new Array(numOfShearDataPoints - 1)
        for (let ii = 1; ii <= numOfShearDataPoints; ii++) {
          xPoly[ii - 1] = linearV[ii][0].toFixed(2)
          yPoly[ii - 1] = linearV[ii][1].toFixed(2)
        }

      } else {
        xPoly = new Array(numDataPoints + 1).fill(0)
        yPoly = new Array(numDataPoints + 1).fill(0)
        for (let ii = 0; ii < numDataPoints; ii++) {
          xPoly[ii] = (beam.xDiagram + beam.xScale * x[ii]).toFixed(2) // x(ii)
          yPoly[ii] = (yV - vScale * v.shift()).toFixed(2)
        }
        xPoly[numDataPoints] = beam.xDiagram + 300
        yPoly[numDataPoints] = yV
      }
      diagram.push(Draw.polyline(xPoly, yPoly))
    }

    // Draw the moment diagram
    if (bendingCases.includes(combern)) {
      const xPoly = new Array(numDataPoints + 1).fill(0)
      const yPoly = new Array(numDataPoints + 1).fill(0)
      for (let ii = 0; ii <= numDataPoints; ii++) {
        xPoly[ii] = (beam.xDiagram + beam.xScale * x[ii]).toFixed(2) // x(ii)
        yPoly[ii] = (yM - beam.convention * mScale * m.shift()).toFixed(2) // M(ii)
      }
      xPoly[numDataPoints + 1] = beam.xDiagram + 300
      yPoly[numDataPoints + 1] = yM
      diagram.push(Draw.polyline(xPoly, yPoly))
    }

    if (inaDeflCase) {
      // Draw the deflection diagram
      diagram.push(Draw.textNode("deflection", 20, yDeflection + 2))
      diagram.push({
        tag: "path",
        attrs: { d: `M${beam.xDiagram} ${yDeflection} h300`,
          stroke: "black", "stroke-width": '1.5px' }
      })
      const xPoly = new Array(numDataPoints - 1).fill(0)
      const yPoly = new Array(numDataPoints - 1).fill(0)
      xPoly[0] = beam.xDiagram.toFixed(2)
      yPoly[0] = yDeflection.toFixed(2)
      for (let ii = 1; ii <= numDataPoints - 1; ii++) {
        xPoly[ii] = (beam.xDiagram + beam.xScale * x[ii]).toFixed(2) // x(ii)
        yPoly[ii] = (yDeflection - deflectionScale * deflection[ii]).toFixed(2)
      }
      diagram.push(Draw.polyline(xPoly, yPoly))
    }
  }

  // Write the values of the local shear maximums onto the diagrams.
  f = 1 / (beam.SI ? 1000 : 4448.2216152605) // conversion factor for N to kips or MN
  while (wV.length > 0) {
    const xText = (beam.xDiagram + beam.xScale * wVx.shift()).toFixed(2)
    const fudge = wV[0] > 0 ? -2 : 13
    const yText = (yV - vScale * wV[0] + fudge).toFixed(2)
    // horizAlign is middle
    diagram.push(Draw.textNode(round(wV.shift() * f, 3), xText, yText, horizAlign))
  }

  // Write the values of the local bending maximums onto the diagrams.
  f = beam.convention / (beam.SI ? 1000 : 4448.2216152605 * 0.3048)
  while (wM.length > 0) {
    const xText = (beam.xDiagram + beam.xScale * wMx.shift()).toFixed(2)
    const fudge = beam.convention * wM[0] > 0 ? -2 : 13
    const yText = (yM - beam.convention * mScale * wM[0] + fudge).toFixed(2)
    const sText = round(wM.shift() * f, 3)
    diagram.push(Draw.textNode(sText, xText, yText, horizAlign))
  }

  if (beam.EI !== 1) {
    // Insert the max and min deflection values
    beam.deflectionMax = Math.max(Math.abs(deflectionMax), Math.abs(deflectionMin))
    f = beam.SI ? 1000 : (12 / 0.3048)
    let sText = ""
    let xText = 0
    let yText = 0
    if (deflectionMax > 0.2 * (deflectionMax - deflectionMin)) {
      xText = beam.xDiagram + beam.xScale * xDeflectionMax
      yText = yDeflection - deflectionScale * deflectionMax - 2
      if (beam.SI) {
        sText = (deflectionMax * f).toFixed(0) + " mm"
      } else {
        sText = round(deflectionMax * f, 2) + '″'
      }
      diagram.push(Draw.textNode(sText, xText, yText, horizAlign))
    }
    if (Math.abs(deflectionMin) > 0.2 * (deflectionMax - deflectionMin)) {
      xText = beam.xDiagram + beam.xScale * xDeflectionMin
      yText = yDeflection - deflectionScale * deflectionMin + 13
      if (beam.SI) {
        sText = (f * deflectionMin).toFixed(0) + " mm"
      } else {
        sText = round(f * deflectionMin, 2) + '″'
      }
      diagram.push(Draw.textNode(sText, xText, yText, horizAlign))
    }
  }

  return diagram
}

const checkVs = (v, x, wV, wVx, spans, beamLength) => {
  // Check if we should write this value onto the shear diagram
  let gottaWrite = true // initialize the variable
  const shortDistance = 0.15 * beamLength

  for (let i = 1; i < spans.length; i++) {
    for (let k = 0; k < spans[i].segments.length; k++) {
      const seg = spans[i].segments[k]
      const xOfRightEnd = seg.xOfLeftEnd + seg.length
      if (xOfRightEnd < x -  shortDistance) { continue }
      if (seg.xOfLeftEnd > x + shortDistance) { continue }

      if (Math.abs(seg.xOfLeftEnd - x) < shortDistance) {
        if (v > 0) {
          if (seg.Vmax.left.value > v) {
            gottaWrite = false
            break
          }
        } else if (seg.Vmin.left.value < v) {
          gottaWrite = false
          break
        }
      }

      const xRightEnd = seg.xOfLeftEnd + seg.length
      if (Math.abs(x - xRightEnd < shortDistance)) {
        if (v > 0) {
          if (seg.Vmax.right.value > v) {
            gottaWrite = false
            break
          }
        } else if (seg.Vmin.right.value < v) {
          gottaWrite = false
          break
        }
      }
    }
  }

  if (gottaWrite) {
    wV.push(v)
    wVx.push(x)
  }
}

const checkMs = (m, x, wM, wMx, spans, beamLength, mSmall) => {
  // Check if we should write this value onto the moment diagram
  if (Math.abs(m) < mSmall) { return false }
  let gottaWrite = true // initialize the variable
  const shortDistance = 0.15 * beamLength

  for (let i = 1; i < spans.length; i++) {
    for (let k = 0; k < spans[i].segments.length; k++) {
      const seg = spans[i].segments[k]
      const xOfRightEnd = seg.xOfLeftEnd + seg.length
      if (xOfRightEnd < x -  shortDistance) { continue }
      if (seg.xOfLeftEnd > x + shortDistance) { continue }

      if (Math.abs(seg.xOfLeftEnd - x) < shortDistance) {
        if (m > 0) {
          if (seg.Mmax.left.value > m) {
            gottaWrite = false
            break
          }
        } else if (seg.Mmin.left.value < m) {
          gottaWrite = false
          break
        }
      }

      if (m > 0 && Math.abs(seg.Mmax.mid.x - x) < shortDistance) {
        if (seg.Mmax.mid.value > m) {
          gottaWrite = false
          break
        }
      }
      if (m < 0 && Math.abs(seg.Mmin.mid.x - x) < shortDistance) {
        if (seg.Mmin.mid.value < m) {
          gottaWrite = false
          break
        }
      }

      const xRightEnd = seg.xOfLeftEnd + seg.length
      if (Math.abs(x - xRightEnd < shortDistance)) {
        if (m > 0) {
          if (seg.Mmax.right.value > m) {
            gottaWrite = false
            break
          }
        } else if (seg.Mmin.right.value < m) {
          gottaWrite = false
          break
        }
      }
    }
  }

  if (gottaWrite) {
    wM.push(m)
    wMx.push(x)
  }
}

