const fs = require('fs')  // Node.js file system utility
const hurmet = require('../preview/hurmet.js');

// The main function has to be async because it contains an 'await' statement.
(async function main() {

  // First, a couple of helpers.
  const head = title => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
<article class="ProseMirror long-primer">
`
  const titleRegEx = /([^.\\/]+)\.md$/

  // Now define our work.
  const inputPath = 'C:/Users/ronko/OneDrive/Documents/Calcs/Haugen Remodel/Haugen Remodel.md'
  const title = titleRegEx.exec(inputPath)[1];
  const outputPath = `C:/Users/ronko/OneDrive/Documents/Calcs/Trials/${title}.html`

  // The rest is boilerplate.
  const md = fs.readFileSync(inputPath).toString('utf8')
  let html = await hurmet.md2html(md)
  html = head(title) + html + "\n</article>\n</body>\n</html>"
  fs.writeFileSync(outputPath, html)
})();
