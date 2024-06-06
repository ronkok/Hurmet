const fs = require('fs')  // Node.js file system

// I edit ProseMirror to accomplish three things:
// 1. Enable table classes.
// 2. Enable a mouse click on a calculation cell to open the cell.
// 3. Insert a Hurmet Recalc-All command after each paste event.

let str = fs.readFileSync('preview/prosemirror.js').toString('utf8')
let match = /  this\.colgroup/.exec(str)
str = str.slice(0, match.index)
  + "  this.table.className = node.attrs.class;\n    this.table.id = node.attrs.name;\n   "
  + str.slice(match.index + 1);

match = /table\.style\.minWidth = totalWidth \+ "px";\s+}/.exec(str)
const L = match.index + match[0].length
str = str.slice(0, L) + "\n    table.className = node.attrs.class\n    table.id = node.attrs.name" + str.slice(L + 1)

//match = /&& !this\.ignoreSelectionChange\(sel\)/.exec(str)
//str = str.slice(0, match.index) + str.slice(match.index + match[0].length)

// Fix a bug in prosemirror-tables. When creating a new row inside a table
// header, the refRow should always be zero.
str = str.replace("refRow = row == 0 || row == map.height ? null : 0;", "refRow = 0;")

// Insert a Hurmet Recalc-All command after each paste event.
match = /"paste"\)\);/.exec(str)
str = str.slice(0, match.index + match[0].length)
  + "\n    hurmet.updateCalculations(view, view.state.schema.nodes.calculation, true);\n"
  + str.slice(match.index + match[0].length + 1);

fs.writeFileSync('preview/prosemirror.js', str)
