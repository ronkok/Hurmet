'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

function bin(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const message = options.capture
      ? (result.stderr || result.stdout || `${command} failed`).trim()
      : `${command} ${args.join(' ')} failed with exit code ${result.status}`;
    throw new Error(message);
  }

  return options.capture ? result.stdout.trim() : '';
}

function runYarn(args, options = {}) {
  return run(bin('corepack'), ['yarn', ...args], options);
}

async function getLatestVersion(packageName) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to resolve latest version for ${packageName}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.version) {
    throw new Error(`Unable to resolve latest version for ${packageName}`);
  }

  return data.version;
}

function removeIfPresent(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findObjectRange(source, key) {
  const keyPattern = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*\\{`, 'g');
  const match = keyPattern.exec(source);

  if (!match) {
    return null;
  }

  const openBraceIndex = source.indexOf('{', match.index);
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { start: openBraceIndex, end: i };
      }
    }
  }

  throw new Error(`Unable to locate end of "${key}" object.`);
}

function replaceVersionInSection(source, sectionName, packageName, versionSpec) {
  const range = findObjectRange(source, sectionName);
  if (!range) {
    return source;
  }

  const before = source.slice(0, range.start + 1);
  const sectionBody = source.slice(range.start + 1, range.end);
  const after = source.slice(range.end);

  const pattern = new RegExp(
    `(\\r?\\n[\\t ]*"${escapeRegExp(packageName)}"\\s*:\\s*")([^"]*)(")`,
    'm'
  );

  if (!pattern.test(sectionBody)) {
    throw new Error(`Package "${packageName}" not found in "${sectionName}".`);
  }

  const updatedBody = sectionBody.replace(pattern, `$1^${versionSpec}$3`);
  return before + updatedBody + after;
}

async function main() {
  const packageJsonObject = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let packageJsonText = fs.readFileSync(packageJsonPath, 'utf8');

  for (const name of Object.keys(packageJsonObject.dependencies || {})) {
    const version = await getLatestVersion(name);
    console.log(`Setting dependency ${name} -> ^${version}`);
    packageJsonText = replaceVersionInSection(packageJsonText, 'dependencies', name, version);
  }

  for (const name of Object.keys(packageJsonObject.devDependencies || {})) {
    const version = await getLatestVersion(name);
    console.log(`Setting devDependency ${name} -> ^${version}`);
    packageJsonText = replaceVersionInSection(packageJsonText, 'devDependencies', name, version);
  }

  JSON.parse(packageJsonText);
  fs.writeFileSync(packageJsonPath, packageJsonText, 'utf8');

  console.log('Running yarn install...');
  runYarn(['install']);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});