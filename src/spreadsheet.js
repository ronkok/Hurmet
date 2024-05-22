
export const sheetLimits = (doc, inputPos) => {
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
  // Get the extent of the document that the transaction will replace.
  let i = -1
  let startOfRow1 = 0
  let endOfLastRow = 0
  doc.nodesBetween(tableStart, tableEnd, function(node, pos) {
    if (node.type.name === "table_row") {
      i += 1
      if (i === 1) { startOfRow1 = pos }
      endOfLastRow = pos + node.nodeSize
    }
  })
  return [tableStart, tableEnd, startOfRow1, endOfLastRow]
}

export const compileCell = (entry, decimalFormat = "1,000,000.") {

}