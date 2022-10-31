const fs = require("fs")  // Node.js file system
const hurmetMark = require("./hurmetMark.cjs")

// This file builds the Hurmet documentation.
// Start by translating the reference manual from Markdown to HTML.
let manual = fs.readFileSync('docs/manual.md').toString('utf8')
// convert Markdown to HTML
manual =  hurmetMark.md2html(manual, true)
fs.writeFileSync('site/manual.html', manual)
manual = manual.replace("../demo.min.mjs", "demo.mjs")
fs.writeFileSync('preview/manual.html', manual)

// Now translate the unit-definitions file from Markdown to HTML.
let units = fs.readFileSync('docs/unit-definitions.md').toString('utf8')
// Substitute some headings.
units = units.replace("| L  | M  | Ti | E  | Te | # | LI | $ |",
  "| length | mass | time | electric<br>current | temp | amount | luminous<br>intensity " +
  "| money |")
units =  hurmetMark.md2html(units, true)

// In the unit-definition file, replace factor fractions with stacked fractions.
const fractionRegEx = /<td>([\d.]+)\/([\d.]+)<\/td>/g
let parts = []
while ((parts = fractionRegEx.exec(units)) !== null) {
  units = units.slice(0, parts.index)
    + "<td><span class='fraction'><span>" + parts[1] + "</span>"
    + "<span class='rule'></span>"
    + "<span>" + parts[2] + "</span></span></td>"
    + units.slice(parts.index + parts[0].length)
}
fs.writeFileSync('preview/unit-definitions.html', units)
fs.writeFileSync('site/unit-definitions.html', units)
