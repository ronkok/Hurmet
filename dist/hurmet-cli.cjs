#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const hurmetModule = require('./hurmet.cjs');
const hurmet = hurmetModule && hurmetModule.default ? hurmetModule.default : hurmetModule;
const watch = require('./watch.cjs');

const [cmd, ...args] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'updateAndSave': {
      const currencyRates = await getCurrencyRates();
      globalThis.currencyRates = currencyRates;

      let md = fs.readFileSync(args[0], 'utf8');
      md = await hurmet.updateAndSave(md);
      fs.writeFileSync(args[0], md, 'utf8');
      break;
    }

    case 'scrapeCurrencyRates': {
      const scrapeCurrencyRates = require('./scrapeCurrencyRates.cjs');
      await scrapeCurrencyRates();
      break;
    }

    case 'watch': {
      const filepath = args[0];
      const portNumber = args[1];
      watch(filepath, portNumber);
      break;
    }

    case 'version':
      // eslint-disable-next-line no-console
      console.log(typeof hurmet.version === 'function' ? hurmet.version() : hurmet.version);
      break;

    default:
      // eslint-disable-next-line no-console
      console.log('Commands: updateAndSave, scrapeCurrencyRates, watch, version');
  }
}

function getHurmetDataDir() {
  const home = os.homedir();

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || home, 'Hurmet');
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Hurmet');
  }

  return path.join(home, '.config', 'Hurmet');
}

const currencyRatesPath = path.join(getHurmetDataDir(), 'currencyRates.json');

function loadCurrencyRatesFallback() {
  try {
    const text = fs.readFileSync(currencyRatesPath, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getCurrencyRates() {
  const fallback = loadCurrencyRatesFallback();
  if (fallback) {
    return fallback;
  }

  throw new Error('No currency rates available.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
});
