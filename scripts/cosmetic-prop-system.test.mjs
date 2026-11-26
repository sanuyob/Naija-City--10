import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { COSMETIC_PROP_DEFINITIONS } from '../src/cosmetic-prop-system.js';

const base = path.resolve('public/assets/cosmetic-props');
assert.equal(COSMETIC_PROP_DEFINITIONS.length, 2);
assert.deepEqual(COSMETIC_PROP_DEFINITIONS.map(item => item.id), ['m4-cosmetic', 'mac10-cosmetic']);

for (const item of COSMETIC_PROP_DEFINITIONS) {
  const file = path.join(base, item.id === 'm4-cosmetic' ? 'm4-cosmetic.glb' : 'mac10-cosmetic.glb');
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', `${item.id} has a GLB header`);
  assert.equal(buffer.readUInt32LE(4), 2, `${item.id} uses GLB 2.0`);
  assert.equal(buffer.readUInt32LE(8), buffer.length, `${item.id} byte length matches`);
  const jsonLength = buffer.readUInt32LE(12);
  const document = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).replace(/\0+$/g, '').trim());
  assert.ok((document.meshes || []).length > 0, `${item.id} contains visible meshes`);
  assert.equal((document.animations || []).length, 0, `${item.id} has no gameplay animations`);
  assert.equal((document.skins || []).length, 0, `${item.id} is a static, non-skinned prop`);
  assert.ok(item.triangles <= 13000, `${item.id} stays within the mobile triangle budget`);
  assert.ok(buffer.length <= 450000, `${item.id} stays within the mobile GLB budget`);
}

console.log('Cosmetic prop tests passed: two static GLBs, mobile asset budgets, no animations and no skinned rigs.');
