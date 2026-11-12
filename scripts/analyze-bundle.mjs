import { readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const root = new URL('../dist/assets/', import.meta.url);
const files = await readdir(root);
const jsFiles = files.filter(name => name.endsWith('.js'));
assert.ok(jsFiles.length, 'No production JavaScript assets found');
let raw = 0, compressed = 0;
for (const name of jsFiles) {
  const bytes = await (await import('node:fs/promises')).readFile(new URL(name, root));
  raw += bytes.byteLength;
  compressed += gzipSync(bytes, { level: 9 }).byteLength;
}
console.log(`Production JS: ${(raw/1024).toFixed(1)} KiB minified; ${(compressed/1024).toFixed(1)} KiB gzip across ${jsFiles.length} chunk(s).`);
console.log('Budget: 1,400 KiB raw / 400 KiB gzip. The raw budget is a hard regression guard; Vite warnings remain visible.');
assert.ok(raw <= 1400*1024, `Raw JavaScript exceeds 1,400 KiB budget (${raw} bytes)`);
assert.ok(compressed <= 400*1024, `Gzip JavaScript exceeds 400 KiB budget (${compressed} bytes)`);
