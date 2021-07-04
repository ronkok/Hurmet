const fs = require("fs")  // Node.js file system
const ecbData = fs.readFileSync('utils/ECB Exchange Rates.xml').toString('utf8')
let unitModule = fs.readFileSync('src/units.js').toString('utf8')

const rateRegEx = /currency="([^"]+)" rate="([^"]+)"/g

const matchArray = []
let match = null
while ((match = rateRegEx.exec(ecbData)) !== null) {
  matchArray.push({
    currencyCode: match[1],
    rate: match[2]
  })
}

for (let i = matchArray.length - 1; i >= 0; i--) {
  const posDef = unitModule.indexOf('"' + matchArray[i].currencyCode + `":`)
  if (posDef > -1) {
    const str = unitModule.slice(posDef + 5)
    unitModule = unitModule.slice(0, posDef + 5) + str.replace(/"[^"]+/, '"' + matchArray[i].rate)
  }
}

fs.writeFileSync('units.js', unitModule)
