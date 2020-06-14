const fs = require("fs")

// I edit ProseMirror to accomplish two things:
// 1. Enable table classes.
// 2. Enable a mouse click on a calculation cell to open the cell.
// I'll delete this step after I find a more elegant way to accomplish those things.

let str = fs.readFileSync('preview/prosemirror.js').toString('utf8')
let match = /    this\.colgroup/.exec(str)
str = str.slice(0, match.index)
  + "    this.table.className = node.attrs.class;\n"
  + str.slice(match.index + 1);

match = /table\.style\.minWidth = totalWidth \+ "px";\s+}/.exec(str)
const L = match.index + match[0].length
str = str.slice(0, L) + "\n    table.className = node.attrs.class" + str.slice(L + 1)

match = /&& !this\.ignoreSelectionChange\(sel\)/.exec(str)
str = str.slice(0, match.index) + str.slice(match.index + match[0].length)
fs.writeFileSync('preview/prosemirror.js', str)
