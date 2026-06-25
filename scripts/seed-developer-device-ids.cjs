#!/usr/bin/env node
/**
 * Seed _system/developerDeviceIds in jetlagpro-research.
 *
 * Usage (with gcloud auth):
 *   node scripts/seed-developer-device-ids.cjs
 *
 * Or paste firestore-seed/developerDeviceIds.document.json in Firebase Console:
 *   Firestore → _system → developerDeviceIds
 */
const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const projectId = 'jetlagpro-research';
const docPath = '_system/developerDeviceIds';
const seedFile = path.join(
  __dirname,
  '..',
  'firestore-seed',
  'developerDeviceIds.document.json',
);

if (!fs.existsSync(seedFile)) {
  console.error('Missing seed file:', seedFile);
  process.exit(1);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}?updateMask.fieldPaths=suffixes&updateMask.fieldPaths=updatedAt`;

console.log('Firestore developer device allowlist seed');
console.log('  project:', projectId);
console.log('  document:', docPath);
console.log('');

let token;
try {
  token = execSync('gcloud auth print-access-token', {encoding: 'utf8'}).trim();
} catch {
  console.log('gcloud not available or not logged in.');
  console.log('');
  console.log('Manual: Firebase Console → Firestore → _system → developerDeviceIds');
  console.log('  Use fields from:', seedFile);
  console.log('');
  console.log('Or after `gcloud auth login`:');
  console.log(
    `  curl -X PATCH "${url}" -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" --data-binary @${seedFile}`,
  );
  process.exit(0);
}

try {
  execSync(
    `curl -sS -X PATCH "${url}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" --data-binary @"${seedFile.replace(/\\/g, '/')}"`,
    {stdio: 'inherit', shell: true},
  );
  console.log('Seed complete.');
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}
