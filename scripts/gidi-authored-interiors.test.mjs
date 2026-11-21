import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  getGidiAuthoredInteriorDefinitions,
  isPlayerInteriorReplacementCollider,
  GIDI_AUTHORED_INTERIOR_COLLIDER_IDS
} from '../src/gidi-authored-interiors.js';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const interiors = getGidiAuthoredInteriorDefinitions();
assert.equal(interiors.length, 5, 'the four authored buildings plus the hotel guest room must be represented');
assert.equal(interiors.reduce((sum, item) => sum + item.colliders.length, 0), 70, '70 source-aligned player wall/floor collision proxies are registered');
assert.deepEqual(interiors.map(item => item.id), ['fresh-cut','mide-tech-hub','grand-hotel-lobby','grand-hotel-guestroom-01','player-home']);

const manifest = JSON.parse(fs.readFileSync('public/assets/gidi/manifest.json','utf8'));
const cellById = new Map(manifest.cells.map(cell => [cell.id, cell]));
const expectedNodes = {
  '0,-4': ['FC_ARCH_CEILING_ROOF_SLAB'],
  '1,-4': ['MIDE_TECH_HUB_BLOCKOUT_ROOF'],
  '1,-5': ['YABA_NEIGHBORHOOD_HOTEL_BLOCKOUT_ROOF'],
  '0,-5': ['PLAYER_HOME_ROOF']
};
const expectedRawNodes = {
  '0,-4': ['FC_ARCH_FLOOR_SLAB','FC_ARCH_ENTRY_DOOR_LEAF_OPEN'],
  '1,-4': ['MIDE_INT_CONTINUOUS_FLOOR','MIDE_MEETING_WALL_SOUTH_BOOLEAN'],
  '1,-5': ['HOTEL_GUESTROOM_01_DOOR_LEAF_OPEN','HOTEL_GUESTROOM_01_WALL_ENTRY_BOOLEAN'],
  '0,-5': ['INT_FLOOR_FINISH_TILED','EXT_WALL_FRONT_WEST']
};
for (const [cellId, requiredNames] of Object.entries(expectedNodes)) {
  const cell = cellById.get(cellId);
  assert.ok(cell, `GIDI cell ${cellId} exists`);
  const doc = await io.read(`public/${cell.full}`);
  const names = new Set();
  doc.getRoot().listScenes()[0].traverse(node => names.add(node.getName()));
  for (const name of requiredNames) assert.ok(names.has(name), `${cellId} retains runtime-controlled authored node ${name}`);
  const rawFile = `public/assets/gidi/cells/cell_${cellId.replace(',', '_')}_full.gltf`;
  const rawDoc = await io.read(rawFile);
  const rawNames = new Set();
  rawDoc.getRoot().listScenes()[0].traverse(node => rawNames.add(node.getName()));
  for (const name of expectedRawNodes[cellId]) assert.ok(rawNames.has(name), `raw r106 source cell contains authored geometry ${name}`);
}

for (const interior of interiors) {
  assert.ok(cellById.has(interior.cellId), `${interior.id} uses a streamed GIDI cell`);
  assert.ok(interior.colliders.length > 0, `${interior.id} has collision geometry`);
  for (const collider of interior.colliders) {
    assert.ok(collider.position.every(Number.isFinite), `${collider.id} has finite position`);
    assert.ok(collider.halfExtents.every(value => Number.isFinite(value) && value >= 0.04), `${collider.id} has valid primitive extents`);
  }
}

// Doorway centerlines must remain clear in the replacement collision set.
const doorways = {
  'fresh-cut': [314.9, 0.9, -1810],
  'mide-tech-hub': [550.9, 1.1, -1830],
  'grand-hotel-lobby': [870, 1.1, -2054.9],
  'grand-hotel-guestroom-01': [855.5, 1.1, -2077.3],
  'player-home': [300, 2.0, -2100.9]
};
function segmentHitsAabb(a, b, collider) {
  let lo = 0, hi = 1;
  const min = collider.position.map((v,i)=>v-collider.halfExtents[i]);
  const max = collider.position.map((v,i)=>v+collider.halfExtents[i]);
  for (let axis=0; axis<3; axis++) {
    const d=b[axis]-a[axis];
    if (Math.abs(d)<1e-8) { if (a[axis]<min[axis] || a[axis]>max[axis]) return false; continue; }
    let t0=(min[axis]-a[axis])/d, t1=(max[axis]-a[axis])/d;
    if (t0>t1) [t0,t1]=[t1,t0];
    lo=Math.max(lo,t0); hi=Math.min(hi,t1);
    if (lo>hi) return false;
  }
  return true;
}
for (const interior of interiors) {
  const p=doorways[interior.id];
  const a=p, b=[p[0]+(interior.id==='fresh-cut'?2:interior.id==='mide-tech-hub'?2:interior.id==='player-home'?0:0),p[1],p[2]];
  if (interior.id==='grand-hotel-lobby') b[2]-=2;
  if (interior.id==='grand-hotel-guestroom-01') b[2]-=2;
  if (interior.id==='player-home') b[2]-=2;
  const hits=interior.colliders.filter(c=>segmentHitsAabb(a,b,c));
  assert.equal(hits.length,0,`${interior.id} doorway path is clear; blocked by ${hits.map(h=>h.id).join(', ')}`);
}

assert.deepEqual(GIDI_AUTHORED_INTERIOR_COLLIDER_IDS.sort(), ['building:12,-73','building:22,-74','building:33,-84','building:34,-84','building:35,-84'].sort());
for (const id of GIDI_AUTHORED_INTERIOR_COLLIDER_IDS) assert.equal(isPlayerInteriorReplacementCollider({id,kind:'building'}),true);
assert.equal(isPlayerInteriorReplacementCollider({id:'building:12,-73',kind:'road'}),false);
assert.equal(isPlayerInteriorReplacementCollider({id:'building:12,-72',kind:'building'}),false);
console.log(`PASS · ${interiors.length} authored spaces · ${interiors.reduce((n,x)=>n+x.colliders.length,0)} replacement wall/floor colliders · source GLB node checks · doorway clearance`);
