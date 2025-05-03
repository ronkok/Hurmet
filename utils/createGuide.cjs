// Read a Markdown file, run the calcs, and write an HTML file.
const fs = require('fs')
const hurmet = require('./hurmet.cjs')
const temml = require('./temml.cjs');
// eslint-disable-next-line no-undef
globalThis.temml = temml;

// This file is typically called as per:   node utils\createGuide.cjs <title>

// Get the document title from the args passed to the call to node.js
const args = process.argv.slice(2) // Skip the first two elements (node & script path)
const title = args[0];

// The main function has to be async.
(async function main() {
  const inputPath = `docs/${title}.md`
  const outputPath = `./site/guides/${title}.html`
  // Read the file.
  const md = fs.readFileSync(inputPath).toString('utf8')
  // Run the calculations and convert to HTML.
  let html = await hurmet.hurmet2html(md, title.replace("-", " "), true)
  html = html.replace("<body>", `<body>
  <nav>
   <ul>
     <li><a href="../index.html">Hurmet</a></li>
     <li><a href="../manual.html">Documentation</a></li>
   </ul>
  </nav>`)
  fs.writeFileSync(outputPath, html)
})();
