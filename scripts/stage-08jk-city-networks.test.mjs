import assert from 'node:assert/strict';
import { createStage08JYabaIkejaNetworkAndStreets } from '../src/stage-08j-yaba-ikeja-network-and-yaba-streets.js';
import { createStage08KGidiDistrictRoadsAndBridges } from '../src/stage-08k-gidi-district-roads-and-bridges.js';

// Unit tests use deterministic asset-load failures for GLB/texture requests;
// the standalone browser smoke exercises the real downloaded files.
globalThis.window = { location: { origin: 'http://localhost' } };
let guid = 0;
const entities = [];
const material = (color, roughness = 0.85) => ({ color: color.slice(), roughness });
const box = (name, position, scale, mat) => {
  const e = {
    name, mat, render: {}, position: position.slice(), scale: scale.slice(), rotation: [0, 0, 0],
    tags: { add() {} },
    getPosition() { const [x, y, z] = this.position; return { x, y, z }; },
    getLocalScale() { const [x, y, z] = this.scale; return { x, y, z }; },
    getEulerAngles() { const [x, y, z] = this.rotation; return { x, y, z }; },
    setEulerAngles(...value) { this.rotation = value; },
    getGuid() { return String(++guid); }
  };
  entities.push(e);
  return e;
};
const app = {
  batcher: {
    groups: [],
    addGroup(name, dynamic, maxAabbSize) {
      assert.equal(dynamic, false);
      const group = { id: this.groups.length + 100, name, dynamic, maxAabbSize };
      this.groups.push(group);
      return group;
    }
  },
  assets: {
    add() {},
    load(asset) { queueMicrotask(() => asset.fire('error', new Error('unit test uses no network assets'))); }
  },
  root: { addChild() {} }
};

const stage08J = await createStage08JYabaIkejaNetworkAndStreets({ app, box, material });
assert.equal(stage08J.stage, '08J');
assert.equal(stage08J.connector.startZ, 168);
assert.equal(stage08J.connector.endZ, 247);
assert.equal(stage08J.connector.lengthMetres, 79);
assert.equal(stage08J.connector.roadWidthMetres, 14);
assert.equal(stage08J.connector.physicalJoinOverlapMetres, 1);
assert.equal(stage08J.junction.ikejaCrossStreetZ, 246);
assert.equal(stage08J.junction.inheritedFromStage08I, true);
assert.equal(stage08J.junction.zebraCrossingStripes, 9);
assert.equal(stage08J.junction.tactilePads, 2);
assert.equal(stage08J.importedAssets.length, 2);
assert.ok(stage08J.importedAssets.every(item => item.loaded === false && item.fallback === 'procedural'));
assert.ok(stage08J.collisionProxies.length >= 15);
assert.ok(stage08J.utilityPoles >= 4);
assert.ok(stage08J.signboards >= 2);
assert.ok(stage08J.roadDrainCovers >= 10);
assert.equal(stage08J.staticBatching, true);
assert.ok(stage08J.detailMeshes >= 100);
assert.deepEqual(Object.keys(stage08J.pbrMaterials).sort(), ['asphalt', 'concrete', 'paving']);
assert.ok(stage08J.textureFailures.length >= 9, 'Unit test asset requests must fail predictably');

const stage08K = createStage08KGidiDistrictRoadsAndBridges({ app, box, material });
assert.equal(stage08K.stage, '08K');
assert.deepEqual(stage08K.districtCoverage, ['Yaba', 'Eko CBD', 'Victoria Island', 'Ikoyi Waterfront', 'Lekki', 'Ekiti Highlands']);
assert.equal(stage08K.existingNetworkPreserved, true);
assert.deepEqual(stage08K.existingRoadGraph, { colliderTiles: 3049, connectedComponents: 1, sourceCells: 42 });
assert.equal(stage08K.bridgeTreatments.length, 4);
assert.deepEqual(stage08K.bridgeTreatments.map(item => item.id), ['B01', 'B02', 'B03', 'B04']);
assert.equal(stage08K.junctions.length, 5);
assert.equal(stage08K.crosswalkStripes, 90);
assert.equal(stage08K.tactilePads, 20);
assert.equal(stage08K.districtSigns.length, 9);
assert.equal(stage08K.wayfindingSigns, 9);
assert.ok(stage08K.bridgeReflectors >= 30);
assert.ok(stage08K.drainGrates >= 22);
assert.ok(stage08K.streetlights >= 50);
assert.ok(stage08K.collisionProxies.length >= 35);
assert.ok(stage08K.detailMeshes >= 200);
assert.equal(stage08K.staticBatching, true);
assert.equal(stage08K.roadsDuplicated, 0);

const names = entities.map(entity => entity.name);
assert.ok(names.some(name => name.includes('continuous-yaba-ikeja-arterial')));
assert.ok(names.some(name => name.includes('bridge-a-north-warning')));
assert.ok(names.some(name => name.includes('bridge-d-south-approach')));
assert.ok(names.some(name => name.includes('vi-cbd-primary-junction')));
assert.ok(names.some(name => name.includes('district-ekiti-highlands')));
assert.ok(app.batcher.groups.some(group => group.name === 'stage08j-yaba-ikeja-static-streets'));
assert.ok(app.batcher.groups.some(group => group.name === 'stage08k-gidi-district-road-details'));

console.log(JSON.stringify({
  pass: true,
  stage08J: {
    connector: stage08J.connector,
    streetProps: stage08J.streetProps,
    importedAssets: stage08J.importedAssets,
    textureFailures: stage08J.textureFailures.length,
    detailMeshes: stage08J.detailMeshes,
    collisionProxies: stage08J.collisionProxies.length,
    drainGrates: stage08J.roadDrainCovers
  },
  stage08K: {
    districtCoverage: stage08K.districtCoverage,
    bridges: stage08K.bridgeTreatments.length,
    junctions: stage08K.junctions.length,
    crosswalkStripes: stage08K.crosswalkStripes,
    tactilePads: stage08K.tactilePads,
    districtSigns: stage08K.wayfindingSigns,
    detailMeshes: stage08K.detailMeshes,
    collisionProxies: stage08K.collisionProxies.length
  }
}, null, 2));
