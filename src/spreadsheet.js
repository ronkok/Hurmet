
export const cellPositions = (doc, inputPos) => {
  // Return a column-wise array of cell positions
  // First, find the extent of the table
  let tableStart = 0
  let tableEnd = 0
  for (let d = inputPos.depth; d > 0; d--) {
    const node = inputPos.node(d)
    if (node.type.spec.tableRole === 'table') {
      tableStart = inputPos.before(d)
      tableEnd =  inputPos.after(d)
      break
    }
  }
  // Now traverse the table
  const rows = [];
  let i = -1
  doc.nodesBetween(tableStart, tableEnd, function(node, pos) {
    if (node.type.name === "table_row") {
      rows.push([])
      i += 1
    } else if (node.type.name === "table_cell") {
      rows[i].push(pos + 1)
    }
  })
  // Transpose the array
  const positions = [];
  for (let j = 0; j < rows[0].length; j++) {
    positions.push([])
  }
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[0].length; j++) {
      positions[j].push(rows[i][j])
    }
  }
  return positions
}

export const compileCells = (inputStr, doc, inputPos, decimalFormat = "1,000,000.") {

}