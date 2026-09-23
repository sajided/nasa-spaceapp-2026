#!/usr/bin/env node
/**
 * Checks the built output against the budgets in docs/asset-budget.md.
 *
 * The PRD's 5 MB ceiling is measured across a full mission scroll with an empty
 * cache, which only a browser can do (Phase 6, TC-P6-01). This is the cheap
 * always-on guard: it fails the build if the static output alone blows the
 * budget, so weight creep is caught at the commit that causes it.
 */
import { readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const BUDGETS = { totalGzipKB: 5120, jsGzipKB: 250, singleAssetKB: 800 };

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`No ${DIST}/ directory. Run \`npm run build\` first.`);
  process.exit(1);
}

let totalGzip = 0;
let jsGzip = 0;
const failures = [];
const rows = [];

for (const file of files) {
  const buf = readFileSync(file);
  const gzip = gzipSync(buf).length;
  totalGzip += gzip;
  if (extname(file) === '.js') jsGzip += gzip;

  rows.push({ file, raw: buf.length, gzip });

  const rawKB = buf.length / 1024;
  if (rawKB > BUDGETS.singleAssetKB) {
    failures.push(`${file} is ${rawKB.toFixed(0)} KB raw, over the ${BUDGETS.singleAssetKB} KB per-asset ceiling`);
  }
}

rows.sort((a, b) => b.gzip - a.gzip);
console.log('  gzip     raw    file');
for (const r of rows) {
  console.log(`${kb(r.gzip).padStart(7)} ${kb(r.raw).padStart(7)}    ${r.file}`);
}
console.log(`\ntotal gzip: ${kb(totalGzip)} / ${BUDGETS.totalGzipKB} KB`);
console.log(`js gzip:    ${kb(jsGzip)} / ${BUDGETS.jsGzipKB} KB`);

if (totalGzip / 1024 > BUDGETS.totalGzipKB) {
  failures.push(`total gzip ${kb(totalGzip)} exceeds ${BUDGETS.totalGzipKB} KB`);
}
if (jsGzip / 1024 > BUDGETS.jsGzipKB) {
  failures.push(`js gzip ${kb(jsGzip)} exceeds ${BUDGETS.jsGzipKB} KB`);
}

if (failures.length) {
  console.error('\nBudget exceeded:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nWithin budget.');

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}
