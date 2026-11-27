import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync('src/game.js', 'utf8');
const stage = fs.readFileSync('src/stage-08l-district-rollout.js', 'utf8');
const map = fs.readFileSync('src/world-map-ui.js', 'utf8');
const controller = fs.readFileSync('src/third-person-controller.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.match(game, /createStage08LDistrictRollout/, 'Stage 08L must be imported and mounted');
assert.match(game, /stage08L\.collisionProxies/, 'District collision proxies must enter player and actor physics');
assert.match(game, /stage08L\.groundColliders/, 'District ground and road colliders must enter physics');
assert.match(game, /stage08L\.update\(playerController\.getState\(\)\.position\)/, 'District visibility must follow the player/vehicle position');
assert.match(game, /districtRolloutProxies/, 'District collision coverage must be exposed');
assert.match(game, /stage08K,stage08L,getCityEconomyState/, 'Stage 08L must be accessible to runtime QA');
assert.match(controller, /clamp\(body\.position\[0\],-620,620\)/, 'Bullet movement must allow access to the expanded district map');
assert.match(controller, /clamp\(body\.position\[2\],-200,790\)/, 'Bullet movement must allow access to the Ekiti upland slice');
assert.match(controller, /clamp\(p\.x\+velocity\.x\*step,-620,620\)/, 'Fallback movement must allow access to the expanded district map');

for (const feature of [
  'face-me-face-you-rooming-house', 'market-shopfront', 'bus-terminal-apron',
  'wetland-water-retention-pond', 'estate-perimeter-wall-north', 'gated-estate-villa',
  'victoria-office-tower', 'victoria-hotel', 'converted-older-bungalow',
  'canal-sheet-pile-wall-west', 'canal-bridge-deck', 'seawall-armor-block',
  'tetrapod-cross-arm', 'agbo-ile-yard', 'courtyard-room-wing',
  'green-ridge-slope', 'granite-rock-outcrop', 'laterite-approach'
]) assert.ok(stage.includes(feature), 'Missing district feature: ' + feature);

for (const district of ['alimosho', 'lekki', 'victoriaIsland', 'ekoAtlantic', 'ekiti']) {
  assert.ok(stage.includes("const key = '" + district + "'"), 'Missing authored district section ' + district);
  const mapId = district === 'victoriaIsland' ? 'victoria-island' : district === 'ekoAtlantic' ? 'eko-atlantic' : district;
  assert.ok(stage.includes("mapRecords.push({ id: 'stage08l-" + mapId), 'Missing map atlas record for ' + district);
}

assert.match(stage, /interDistrictConnectors: 5/, 'Exactly five district connectors must be declared');
assert.match(stage, /groundZones: Object\.keys\(DISTRICTS\)\.length/, 'Every district needs its own ground support');
assert.match(stage, /sharedSurfaceMaps: Object\.keys\(surfaces\)\.length/, 'PBR-like materials must use shared low-memory texture maps');
assert.match(stage, /surfaceMapResolution: 64/, 'Shared maps must stay at the compact 64px resolution');
assert.match(stage, /lowMemoryDevice \? 320 : 460/, 'District root activation must adapt to low-memory devices');
assert.match(stage, /root\.enabled = distance <= activationRadius/, 'District geometry must be proximity streamed');
assert.doesNotMatch(stage, /Math\.random\(/, 'Procedural assets must be deterministic across builds');

for (const district of ['ALIMOSHO', 'LEKKI', 'VICTORIA ISLAND', 'EKO ATLANTIC', 'EKITI']) {
  assert.ok(map.includes("name:'" + district + "'"), 'World map must display ' + district);
}
assert.match(map, /minX:-620,maxX:620,minZ:-200,maxZ:790/, 'World atlas bounds must contain all connected districts');
assert.match(map, /const links=/, 'City atlas must show the five inter-district connectors');

assert.ok(pkg.scripts.verify.includes('stage-08l-district-rollout.test.mjs'), 'Full verification must include the Stage 08L regression test');
console.log('Stage 08L district rollout tests passed: five authored neighbourhoods, map pins, connecting roads, mobile proximity activation, shared surfaces and collision/runtime integration.');
