// Review the segments. Find out which comberns should be displayed
export function selectCases(spans) {
  const shearCases = []
  const bendingCases = []
  for (let i = 1; i < spans.length; i++) {
    for (let j = 0; j < spans[i].segments.length; j++) {
      const seg = spans[i].segments[j]
      if (seg.Vmax.left.value > 0) {
        if (!shearCases.includes(seg.Vmax.left.case)) {
          shearCases.push(seg.Vmax.left.case)
        }
      }
      if (seg.Vmin.left.value < 0) {
        if (!shearCases.includes(seg.Vmin.left.case)) {
          shearCases.push(seg.Vmin.left.case)
        }
      }
      if (seg.Mmax.left.value > 0) {
        if (!bendingCases.includes(seg.Mmax.left.case)) {
          bendingCases.push(seg.Mmax.left.case)
        }
      }
      if (seg.Mmin.left.value < 0) {
        if (!bendingCases.includes(seg.Mmin.left.case)) {
          bendingCases.push(seg.Mmin.left.case)
        }
      }
      if (seg.Vmax.mid.value > 0) {
        if (!shearCases.includes(seg.Vmax.mid.case)) {
          shearCases.push(seg.Vmax.mid.case)
        }
      }
      if (seg.Vmin.mid.value < 0) {
        if (!shearCases.includes(seg.Vmin.mid.case)) {
          shearCases.push(seg.Vmin.mid.case)
        }
      }
      if (seg.Mmax.mid.value > 0) {
        if (!bendingCases.includes(seg.Mmax.mid.case)) {
          bendingCases.push(seg.Mmax.mid.case)
        }
      }
      if (seg.Mmin.mid.value < 0) {
        if (!bendingCases.includes(seg.Mmin.mid.case)) {
          bendingCases.push(seg.Mmin.mid.case)
        }
      }
      if (seg.Vmax.right.value > 0) {
        if (!shearCases.includes(seg.Vmax.right.case)) {
          shearCases.push(seg.Vmax.right.case)
        }
      }
      if (seg.Vmin.right.value < 0) {
        if (!shearCases.includes(seg.Vmin.right.case)) {
          shearCases.push(seg.Vmin.right.case)
        }
      }
      if (seg.Mmax.right.value > 0) {
        if (!bendingCases.includes(seg.Mmax.right.case)) {
          bendingCases.push(seg.Mmax.right.case)
        }
      }
      if (seg.Mmin.right.value < 0) {
        if (!bendingCases.includes(seg.Mmin.right.case)) {
          bendingCases.push(seg.Mmin.right.case)
        }
      }
    }
  }
  return [shearCases, bendingCases]
}
