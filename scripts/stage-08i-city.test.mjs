import assert from 'node:assert/strict';
import { createStage08ICityDistrictExpansion } from '../src/stage-08i-ikeja-city-expansion.js';

let nextGuid = 0;
const entities = [];
const app = {
  batcher: {
    addGroup(name, dynamic, maxAabbSize) {
      assert.equal(dynamic, false, 'city geometry must remain static');
      assert.equal(maxAabbSize, 96, 'batch bounds should remain spatially limited');
      return { id: 81, name };
    }
  }
};
const material = (...args) => ({ args });
const box = (name, position, scale, mat) => {
  const entity = {
    name, position, scale, mat, render: {}, batchGroup: null,
    tags: { add() {} },
    setEulerAngles(...angles) { this.rotation = angles; },
    getGuid() { return String(++nextGuid); }
  };
  entities.push(entity);
  return entity;
};

const district = createStage08ICityDistrictExpansion({ app, box, material });
assert.equal(district.stage, '08I');
assert.equal(district.district, 'Ikeja');
assert.equal(district.residentialBuildings, 9);
assert.equal(district.commercialBuildings, 4);
assert.equal(district.marketStalls, 6);
assert.equal(district.roadNetwork.collectorRoads, 2);
assert.equal(district.roadNetwork.outerResidentialRoads, 2);
assert.equal(district.roadNetwork.crossStreets, 4);
assert.equal(district.roadNetwork.connectedJunctions, 20);
assert.equal(district.roadNetwork.principalJunctions, 12);
assert.equal(district.roadNetwork.connectedToExistingIkejaCorridor, true);
assert.equal(district.roadNetwork.approachRoadInheritedFromStage08G, true);
assert.equal(district.groundColliders.length, 3);
assert.ok(district.collisionProxies.length >= 20);
assert.ok(district.detailMeshes >= 300);
assert.equal(district.staticBatching, true);
assert.equal(district.liveTrafficAdded, false);
assert.equal(district.liveNpcAdded, false);

const solids = district.collisionProxies;
const houseSolids = solids.filter(item => item.id.includes('residential-house-shell'));
const commercialSolids = solids.filter(item => item.id.includes('mixed-use-commercial-shell'));
const hall = solids.find(item => item.id.includes('transport-hall-main-shell'));
assert.equal(houseSolids.length, 9);
assert.equal(commercialSolids.length, 4);
assert.ok(hall, 'transport/community hall must have a collision proxy');

function overlaps(a, b) {
  return [0, 2].every(axis => {
    const distance = Math.abs(a.position[axis] - b.position[axis]);
    return distance < a.halfExtents[axis] + b.halfExtents[axis] - 0.05;
  });
}
for (let i = 0; i < houseSolids.length; i++) {
  for (let j = i + 1; j < houseSolids.length; j++) assert.equal(overlaps(houseSolids[i], houseSolids[j]), false, 'residential shells must not overlap');
  for (const shop of commercialSolids) assert.equal(overlaps(houseSolids[i], shop), false, 'residential and commercial shells must not overlap');
  assert.equal(overlaps(houseSolids[i], hall), false, 'residential shells must not overlap the civic landmark');
}

const mainRoad = district.roads.find(road => road.name === 'collector-east');
const crossRoad = district.roads.find(road => road.name === 'cross-310');
assert.ok(mainRoad && crossRoad, 'collector and cross-street network must exist');
assert.ok(Math.abs(mainRoad.position[0]) < 60, 'collector should sit inside the expanded neighbourhood bounds');
assert.ok(crossRoad.dimensions[0] >= 180, 'cross street should reach both outer access streets');
assert.ok(entities.every(entity => entity.name.startsWith('stage08i-')), 'new entities must be stage-tagged by name');
console.log(JSON.stringify({
  stage: district.stage,
  roads: district.roads.length,
  intersections: district.roadNetwork.connectedJunctions,
  houses: district.residentialBuildings,
  commercialBlocks: district.commercialBuildings,
  marketStalls: district.marketStalls,
  landmarks: 1,
  meshes: district.detailMeshes,
  collisionProxies: district.collisionProxies.length,
  groundColliders: district.groundColliders.length,
  staticBatching: district.staticBatching,
  overlapAudit: 'passed'
}, null, 2));
