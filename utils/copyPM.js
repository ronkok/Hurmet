import * as fs from 'fs';  // Node.js file system

const pm = fs.readFileSync('site/prosemirror.min.js').toString('utf8')
const styles = fs.readFileSync('site/styles.min.css').toString('utf8')
let offline = fs.readFileSync('site/offline.html').toString('utf8')

let pos = offline.indexOf("<!--styles.min.css-->")
pos += "<!--styles.min.css-->\n<style>".length
let posEnd = offline.indexOf("</style>", pos)
offline = offline.slice(0, pos) + styles + offline.slice(posEnd)

pos = offline.indexOf("<!--prosemirror.min.js-->")
pos += "<!--prosemirror.min.js-->\n<script>".length
posEnd = offline.indexOf("</script>", pos)
offline = offline.slice(0, pos) + pm + offline.slice(posEnd)
fs.writeFileSync('site/offline.html', offline)
