const fs = require("fs")  // Node.js file system
const marked = require("./marked")

// This file builds the Hurmet documentation.
// Start by translating the reference manual from Markdown to HTML.
// I use a version of marked.js that has been lightly edited.
// It transpiles the math strings, ¢…¢, to TeX spans, so they can be rendered client-side.
let manual = fs.readFileSync('docs/en/manual.md').toString('utf8')
// convert Markdown to HTML
manual =  marked(manual, { smartypants: false })
// Fix a marked bug
manual = manual.replace("<p><!DOCTYPE html></p>", "<!DOCTYPE html>")
fs.writeFileSync('site/docs/en/manual.html', manual)

// Now translate the unit-definitions file from Markdown to HTML.
let units = fs.readFileSync('docs/en/unit-definitions.md').toString('utf8')
// Substitute some headings.
units = units.replace("| L  | M  | Ti | E  | Te | # | LI | $ | SA |",
  "| length | mass | time | electric<br>current | temp | amount | luminous<br>intensity | money | solid<br>angle |")
units =  marked(units, { smartypants: false })
units = units.replace("<p><!DOCTYPE html></p>", "<!DOCTYPE html>")

// Replace factor fractions with stacked fractions
const fractionRegEx = /<td>([\d.]+)\/([\d.]+)<\/td>/g
let parts = []
while ((parts = fractionRegEx.exec(units)) !== null) {
  units = units.slice(0, parts.index)
    + "<td><span class='fraction'><span>" + parts[1] + "</span>"
    + "<span class='rule'></span>"
    + "<span>" + parts[2] + "</span></span></td>"
    + units.slice(parts.index + parts[0].length)
}
fs.writeFileSync('site/docs/en/unit-definitions.html', units)
