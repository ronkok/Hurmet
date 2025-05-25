// Read a Markdown file, run the calcs, and write an HTML file.
const fs = require('fs')  // Node.js file system
const hurmet = require('../utils/hurmet.cjs')
const temml = require('../utils/temml.cjs') // Math rendering library
globalThis.temml = temml
const titleRegEx = /([^.\\/]+)\.md$/;  // A helper.

// The main function has to be async.
(async function main() {
  const inputPath = './trial.md'
  const title = titleRegEx.exec(inputPath)[1];
  const outputPath = `../preview/${title}.html`
  // Read the file.
  const md = fs.readFileSync(inputPath).toString('utf8')
  // Run the calculations and convert to HTML.
  const html = await hurmet.md2html(md, title)
  fs.writeFileSync(outputPath, html)
})();
