const fs = require("fs")  // Node.js file system
const hurmetMark = require("./hurmetMark.cjs")

const trialHtml =  hurmetMark.hmd.md2html("Text with **bold** L~bear~.")