// Each of the methods in this module draws some item.

const circle = (x, y, radius) => {
  return { tag: "circle", attrs: { cx: x, cy: y, r: radius } }
}

const restraint = (node, beam) => {
  const value = [];
  const x = beam.xDiagram + beam.xScale * node.x
  if (node.fixity === "hinge" || node.fixity === "proppedHinge") {
    value.push(circle(beam.xDiagram + beam.xScale * node.x, beam.yLoad, 4))
  }
  const path = { tag: "path", attrs: { d: "" } }
  if (node.fixity === "pinned" || node.fixity === "proppedHinge") {
    // draw a triangle
    const y = node.fixity === "pinned" ? beam.yLoad + 0.75 : beam.yLoad + 4
    path.attrs.d = `M${x} ${y} l5 10 h-10 z`
    path.attrs.style = "fill-opacity:1.0"
  } else if (node.fixity === "fixed") {
    const xd = (node.x === 0 ? -1 : 1) * 7
    // eslint-disable-next-line max-len
    path.attrs.d = `M${x} ${beam.yLoad - 7} v14 m0 -14 l${xd} 7 M${x} ${beam.yLoad} l${xd} 7 M${x} ${beam.yLoad + 7} l${xd} 7`
  } else if (node.fixity === "spring") {
    const y = beam.yLoad + .75
    path.attrs.d = `M${x} ${y} v3 l6 1.5 -12 3 12 3 -12 3 6 1.5 v3 m-6 0 h12`
  }
  value.push(path)
  return value
}

const pointForce = (x, y, load, fixity, isReaction = false) => {
  const sgn = (load < 0 ? -1 : 1) // -1 is down
  const lengthAdjustment = fixity === "fixed"
    ? 7
    : fixity === "pinned" && isReaction
    ? 10
    : fixity === "proppedHinge" && isReaction
    ? 18
    : fixity === "hinge"
    ? 4
    : fixity === "spring" && isReaction
    ? 18
    : 0
  const length = 40 - lengthAdjustment
  // Reactions are drawn below the beam line. Imposed loads are drawn above the beam line.
  const yText = y + (isReaction ? 55 : -45)
  // Set x and y at the tip of the arrowhead
  if (isReaction) { y += lengthAdjustment + 0.75 } else { y -= 0.75 }
  if (sgn === -1 && isReaction) { y += length }
  if (sgn === 1 && !isReaction) { y -= length }
  const arrow = {
    tag: "path",
    attrs: {
      style: "fill: #000; fill-opacity:1.0",
      // eslint-disable-next-line max-len
      d: `M${x} ${y} l${sgn * 4} ${sgn * 8} h${-sgn * 3.5} v${sgn * (length - 8)} h${-sgn * 1} v${-sgn * (length - 8)} h${-sgn * 3}z`
    }
  }
  const text = textNode(String(Math.abs(load)), x, yText, "middle")
  return [arrow, text]
}

const pointMoment = (x, y, load, isReaction = false) => {
  let isCounterClockwise = load >= 0 // = (load < 0 ? -1 : 1) // 1 is counter-clockwise
  load = Math.abs(load)
  let arrow
  let text
  if (!isReaction) {
    arrow = momentArrow(x, y, (isCounterClockwise ? 165 : 15), 150, isCounterClockwise)
    text = textNode(String(load), x, y - 25, "middle")
  } else {
    // The moment is a reaction
    isCounterClockwise = !isCounterClockwise
    if (x < 100) {  // left end
      arrow = momentArrow(x, y, (isCounterClockwise ? 260 : 100), 140, isCounterClockwise)
      text = textNode(String(load), x - 15, y - 15, "end")
    } else {
      arrow = momentArrow(x, y, (isCounterClockwise ? 80 : 280), 140, isCounterClockwise)
      text = textNode(String(load), x + 16, y - 15)
    }
  }
  return [...arrow, text]
}

const momentArrow = (xCtr, yCtr, thetaAtArrowPoint, subtendedAngle, isCounterClockwise) => {
  // Draw a circular arc with an arrowhead.
  // Find startAngle and endAngle: the begining and ending of the arc
  // theta = 0 at 3 o'clock.  theta is + for counterclockwise
  const startAngle = thetaAtArrowPoint * (Math.PI / 180)
  const sgn = isCounterClockwise ? 1 : -1
  const endAngle = startAngle - sgn * subtendedAngle * (Math.PI / 180)
  // sgn = 1 for counterclockwise, -1 for clockwise
  const diameter = 35
  const r = diameter / 2 // radius
  const arrowHeadLength = 8
  const startAnglePrime = startAngle - sgn * (2 * 0.9 * arrowHeadLength / diameter)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  let xStart = 0
  let yStart = 0
  let xEnd = 0
  let yEnd = 0
  if (sgn > 0) {
    xEnd = (xCtr + r * Math.cos(startAnglePrime)).toFixed(2)   // arrow end
    yEnd = (yCtr - r * Math.sin(startAnglePrime)).toFixed(2)
    xStart = (xCtr + r * Math.cos(endAngle)).toFixed(2)
    yStart = (yCtr - r * Math.sin(endAngle)).toFixed(2)
  } else {
    xStart = (xCtr + r * Math.cos(startAnglePrime)).toFixed(2)
    yStart = (yCtr - r * Math.sin(startAnglePrime)).toFixed(2)
    xEnd = (xCtr + r * Math.cos(endAngle)).toFixed(2)
    yEnd = (yCtr - r * Math.sin(endAngle)).toFixed(2)
  }

  const path = {
    tag: "path",
    attrs: { d: `M${xStart} ${yStart}A${r} ${r} 0 ${largeArcFlag} 0 ${xEnd} ${yEnd}` }
  }

  // Draw the arrow head
  const xTip = xCtr + r * Math.cos(startAngle)
  const yTip = yCtr - r * Math.sin(startAngle)
  const alpha = startAngle - sgn * 100 / 180 * Math.PI // rotate by 100°
  const beta = 22.5 * Math.PI / 180    // angle subtended by half-arrowhead
  const x = Array(3).fill("")
  const y = Array(3).fill("")
  x[0] = xTip.toFixed(2)
  y[0] = yTip.toFixed(2)
  x[1] = (xTip + arrowHeadLength * Math.cos(alpha - beta)).toFixed(2)
  y[1] = (yTip - arrowHeadLength * Math.sin(alpha - beta)).toFixed(2)
  x[2] = (xTip + arrowHeadLength * Math.cos(alpha + beta)).toFixed(2)
  y[2] = (yTip - arrowHeadLength * Math.sin(alpha + beta)).toFixed(2)

  let points = ""
  for (let i = 0; i < x.length; i++) {
    points += `${x[i]} ${y[i]} `
  }
  const polygon = { tag: "polygon", attrs: { points } }
  return [path, polygon]
}

const polyline = (x, y) => {
  let d = `M${x[0]} ${y[0]}`
  for (let i = 1; i < x.length; i++) {
    d += ` L${x[i]} ${y[i]}`
  }
  return { tag: "path", attrs: { d } }
}

const textNode = (str, x, y, horizAlign) => {
  const node = { tag: "text", attrs: { x: String(x), y: String(y) } }
  if (horizAlign === "middle" || horizAlign === "end") {
    node.attrs["text-anchor"] = horizAlign
  }
  node.children = [{ tag: "tspan", text: str }];
  return node
}

export const Draw = Object.freeze({
  pointForce,
  pointMoment,
  polyline,
  restraint,
  textNode
})

