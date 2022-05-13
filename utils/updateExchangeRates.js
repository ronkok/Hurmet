const fs = require("fs")  // Node.js file system
const ecbData = fs.readFileSync('utils/ECB Exchange Rates.xml').toString('utf8')
let rates = fs.readFileSync('src/currencyRates.js').toString('utf8')

const rateRegEx = /currency="([^"]+)" rate="([^"]+)"/g

let match;
while ((match = rateRegEx.exec(ecbData)) !== null) {
  const currencyCode = match[1]
  const rate = match[2]
  const pos = rates.indexOf('"' + currencyCode + `":`)
  if (pos > -1) {
    const str = rates.slice(pos + 5)
    rates = rates.slice(0, pos + 5) + str.replace(/"[^"]+/, '"' + rate)
  }
}

fs.writeFileSync('src/currencyRates.js', rates)
