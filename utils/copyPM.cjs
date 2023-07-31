const fs = require('fs') // Node.js file system

// Copy prosemirror.min.js into a <script> tag inside offline.html

const pm = fs.readFileSync('../site/prosemirror.min.js').toString('utf8').replace(/\n/g, "")
let offline = fs.readFileSync('../site/offline.html').toString('utf8')
const regExJS = /<script id="pmjs">[^\n]+<\/script>\n/
offline = offline.replace(regExJS, '<script id="pmjs">' + pm + '</script>\n')
fs.writeFileSync('../site/offline.html', offline)
