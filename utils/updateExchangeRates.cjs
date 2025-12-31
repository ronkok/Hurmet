/*
 * Downloads the ECB daily FX reference rates XML.
 *
 * Why this exists:
 * - Browser fetch is blocked by CORS (server does not allow cross-origin reads).
 * - Node.js fetch has no CORS enforcement, so this works for CLI tooling.
 */

const fs = require("fs")

const ECB_DAILY_XML_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"

async function main() {
  const response = await fetch(ECB_DAILY_XML_URL, {
    method: "GET",
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      // Some servers behave better with an explicit UA.
      "User-Agent": "Hurmet CLI"
    }
  })

  if (!response.ok) {
    throw new Error(`ECB fetch failed: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()

  // Now use the XML to create an object with exchange rates.
  const currencyRates = Object.create(null)
  const rateRegEx = /currency='([^']+)' rate='([^']+)'/g
  let match
  while ((match = rateRegEx.exec(xml)) !== null) {
    const currencyCode = match[1];
    const rate = match[2];
    currencyRates[currencyCode] = rate
  }
  // Always include EUR at 1.0
  currencyRates["EUR"] = "1.0"

  // Stringify the object for writing to file.
  const outData = JSON.stringify(currencyRates, null, 2)
  const flatOutData = JSON.stringify(currencyRates)

  // Write the data to file.
  // eslint-disable-next-line max-len
  fs.writeFileSync('C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\site\\currencyRates.json', outData, "utf8")
  // Replace the value of `globalThis.currencyRates` in site HTML files with the same JSON.
  const siteHtmlPaths = [
    'C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\site\\index.html',
    'C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\site\\sample.html',
    'C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\site\\offline.html',
    'C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\preview\\index.html',
    'C:\\Users\\ronko\\OneDrive\\Documents\\GitHub\\Hurmet\\docs\\manual.md'
  ];
  for (const path of siteHtmlPaths) {
    let siteHtml = fs.readFileSync(path, "utf8")
    const currencyRatesRegEx = /globalThis\.currencyRates\s*=\s*{[^}]*}/
    siteHtml = siteHtml.replace(currencyRatesRegEx,
      `globalThis.currencyRates = ${flatOutData}`)
    fs.writeFileSync(path, siteHtml, "utf8")
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
