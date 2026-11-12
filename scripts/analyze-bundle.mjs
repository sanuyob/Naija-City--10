import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const root = new URL('../dist/assets/', import.meta.url);
const files = (await readdir(root)).filter(name => name.endsWith('.js'));
assert.ok(files.length, 'No production JavaScript assets found');
let raw = 0, compressed = 0;
let entryRaw = 0, entryGzip = 0;
for (const name of files) {
  const bytes = await readFile(new URL(name, root));
  const gzipBytes = gzipSync(bytes, { level: 9 }).byteLength;
  raw += bytes.byteLength;
  compressed += gzipBytes;
  const isEntry = name.startsWith('index-') || name.startsWith('main-');
  if (isEntry) { entryRaw += bytes.byteLength; entryGzip += gzipBytes; }
  console.log(`  ${name}: ${(bytes.byteLength/1024).toFixed(1)} KiB raw / ${(gzipBytes/1024).toFixed(1)} KiB gzip${isEntry ? ' (initial entry)' : ''}`);
}
console.log(`Total production JS: ${(raw/1024).toFixed(1)} KiB minified; ${(compressed/1024).toFixed(1)} KiB gzip across ${files.length} chunk(s).`);
console.log('Budgets: initial entry <= 50 KiB raw / 20 KiB gzip; total <= 1,400 KiB raw / 400 KiB gzip.');
assert.ok(entryRaw > 0, 'Could not identify the initial JavaScript entry chunk');
assert.ok(entryRaw <= 50*1024, `Initial entry exceeds 50 KiB (${entryRaw} bytes)`);
assert.ok(entryGzip <= 20*1024, `Initial entry exceeds 20 KiB gzip (${entryGzip} bytes)`);
assert.ok(raw <= 1400*1024, `Total raw JavaScript exceeds 1,400 KiB (${raw} bytes)`);
assert.ok(compressed <= 400*1024, `Total gzip JavaScript exceeds 400 KiB (${compressed} bytes)`);
