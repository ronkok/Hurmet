'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ECB_DAILY_XML_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

function getGlobalDataDir(appName = 'Hurmet') {
  const home = os.homedir();

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || home, appName);
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', appName);
  }

  return path.join(home, '.config', appName);
}

async function scrapeCurrencyRates() {
  const response = await fetch(ECB_DAILY_XML_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Hurmet CLI'
    }
  });

  if (!response.ok) {
    throw new Error(`ECB fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const currencyRates = Object.create(null);
  const rateRegEx = /currency='([^']+)' rate='([^']+)'/g;

  let match;
  while ((match = rateRegEx.exec(xml)) !== null) {
    currencyRates[match[1]] = match[2];
  }

  currencyRates.EUR = '1.0';

  const dataDir = getGlobalDataDir();
  fs.mkdirSync(dataDir, { recursive: true });

  const outPath = path.join(dataDir, 'currencyRates.json');
  fs.writeFileSync(outPath, JSON.stringify(currencyRates, null, 2), 'utf8');

  return currencyRates;
}

module.exports = scrapeCurrencyRates;

if (require.main === module) {
  scrapeCurrencyRates().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
