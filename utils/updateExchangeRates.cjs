const fs = require('fs') // Node.js file system
const ecbData = fs.readFileSync('utils/ECB Exchange Rates.xml').toString('utf8')
let currencies = fs.readFileSync('utils/currencyRates.js').toString('utf8')

const rateRegEx = /currency='([^']+)' rate='([^']+)'/g

let match
while ((match = rateRegEx.exec(ecbData)) !== null) {
  const currencyCode = match[1];
  const rate = match[2];
  const regEx = RegExp(`${currencyCode}: "[^"]+"`)
  currencies = currencies.replace(regEx, `${currencyCode}: "` + rate + '"')
}

fs.writeFileSync('utils/currencyRates.js', currencies, { encoding: 'utf8' })

const scriptRegEx = /<script>const currencyExchangeRates[^<]+</

let preview = fs.readFileSync('preview/index.html').toString('utf8')
preview = preview.replace(scriptRegEx, "<script>" + currencies + "<")
fs.writeFileSync('preview/index.html', preview, { encoding: 'utf8' })

let index = fs.readFileSync('site/index.html').toString('utf8')
index = index.replace(scriptRegEx, "<script>" + currencies + "<")
fs.writeFileSync('site/index.html', index, { encoding: 'utf8' })

let offline = fs.readFileSync('site/offline.html').toString('utf8')
offline = offline.replace(scriptRegEx, "<script>" + currencies + "<")
fs.writeFileSync('site/offline.html', offline, { encoding: 'utf8' })

let sample = fs.readFileSync('site/sample.html').toString('utf8')
sample = sample.replace(scriptRegEx, "<script>" + currencies + "<")
fs.writeFileSync('site/sample.html', sample, { encoding: 'utf8' })

let manual = fs.readFileSync('docs/manual.md').toString('utf8')
manual = manual.replace(scriptRegEx, "<script>" + currencies + "<")
fs.writeFileSync('docs/manual.md', manual, { encoding: 'utf8' })
