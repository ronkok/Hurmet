const fs = require("fs")  // Node.js file system
const ecbData = fs.readFileSync('utils/ECB Exchange Rates.xml').toString('utf8')
let unitModule = fs.readFileSync('src/units.js').toString('utf8')

const rateRegEx = /currency="([^"]+)" rate="([^"]+)"/g

let match;
while ((match = rateRegEx.exec(ecbData)) !== null) {
  const currencyCode = match[1]
  const rate = match[2]
  const pos = unitModule.indexOf('"' + currencyCode + `":`)
  if (pos > -1) {
    const str = unitModule.slice(pos + 5)
    unitModule = unitModule.slice(0, pos + 5) + str.replace(/"[^"]+/, '"' + rate)
  }
}

fs.writeFileSync('src/units.js', unitModule)
