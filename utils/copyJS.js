const fs = require("fs")  // Node.js file system

// Hurmet inlines all JavaScript. This enables the offline app to
// work even if disconnected from the internet.
// This file copies minified JavaScript files into HTML files.

const hurmet = fs.readFileSync('preview/hurmet.min.js').toString('utf8')
const pm = fs.readFileSync('preview/prosemirror.min.js').toString('utf8')

// Start with the home page.
let index = fs.readFileSync('site/index.html').toString('utf8')
let pos = index.indexOf("<!--hurmet.min.js-->")
pos = index.indexOf(pos, "<script>")
let pos2 = index.indexOf(pos, "</script>")

index = index.slice(0, pos) + hurmet + index.slice(pos2)
pos = index.indexOf("<!--prosemirror.min.js-->")
pos = index.indexOf(pos, "<script>")
pos2 = index.indexOf(pos, "</script>")
index = index.slice(0, pos) + pm + index.slice(pos2)

fs.writeFileSync('site/index.html', index)

// Similarly for examples.html
let examples = fs.readFileSync('site/examples.html').toString('utf8')
pos = examples.indexOf("<!--hurmet.min.js-->")
pos = examples.indexOf(pos, "<script>")
pos2 = examples.indexOf(pos, "</script>")
examples = examples.slice(0, pos) + hurmet + examples.slice(pos2)

pos = examples.indexOf("<!--prosemirror.min.js-->")
pos = examples.indexOf(pos, "<script>")
pos2 = examples.indexOf(pos, "</script>")
examples = examples.slice(0, pos) + pm + examples.slice(pos2)
fs.writeFileSync('site/examples.html', examples)

// docs
let docs = fs.readFileSync('docs/en/manual.md').toString('utf8')
pos = docs.indexOf("<!--hurmet.min.js-->")
pos = docs.indexOf(pos, "<script>")
pos2 = docs.indexOf(pos, "</script>")
docs = docs.slice(0, pos) + hurmet + docs.slice(pos2)
fs.writeFileSync('docs/en/manual.md', docs)
