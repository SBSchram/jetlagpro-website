#!/usr/bin/env node
/**
 * Bump static asset cache-busting tokens before deploy.
 *
 * Usage:
 *   npm run bump-cache -- 20260526130000
 *   npm run bump-cache -- --dry-run
 *
 * If no version is provided, the script uses UTC YYYYMMDDHHMMSS.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const explicitVersion = args.find((arg) => !arg.startsWith('--'));

function defaultVersion() {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}

const version = explicitVersion || defaultVersion();

if (!/^[0-9A-Za-z._-]+$/.test(version)) {
  console.error(`Invalid cache version: ${version}`);
  console.error('Use letters, numbers, dot, underscore, or hyphen only.');
  process.exit(1);
}

const editableExtensions = new Set(['.html', '.js', '.json']);
const skippedDirectories = new Set([
  '.git',
  '.firebase',
  'node_modules',
  'coverage',
  'dist',
  'build'
]);

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (editableExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function updateContent(content) {
  return content
    .replace(/\?v=[0-9A-Za-z._-]+/g, `?v=${version}`)
    .replace(/(const\s+DEPLOY_VERSION\s*=\s*['"])[^'"]+(['"])/g, `$1${version}$2`)
    .replace(/(const\s+SITE_VERSION\s*=\s*['"])[^'"]+(['"])/g, `$1${version}$2`);
}

const changedFiles = [];

for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = updateContent(original);

  if (updated !== original) {
    changedFiles.push(path.relative(root, file));
    if (!dryRun) {
      fs.writeFileSync(file, updated);
    }
  }
}

const action = dryRun ? 'Would update' : 'Updated';
console.log(`${action} ${changedFiles.length} file(s) to cache version ${version}.`);
for (const file of changedFiles) {
  console.log(`- ${file}`);
}
