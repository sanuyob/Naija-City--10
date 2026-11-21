import assert from 'node:assert/strict';
import { createStage08ICityDistrictExpansion } from '../src/stage-08i-ikeja-city-expansion.js';

let nextGuid = 0;
const entities = [];
const app = {
  batcher: {
    addGroup(name, dynamic, maxAabbSize) {
      assert.equal(dynamic, false, 'city geometry must remain static');
      assert.equal(maxAabbSize, 128, 'batch bounds should remain spatially limited');
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
assert.equal(district.groundColliders.filter(item => item.surface === 'grass').length, 3);
assert.equal(district.groundColliders.filter(item => item.surface === 'asphalt').length, 8);
assert.equal(district.groundColliders.length, 11);
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
assert.equal(mainRoad.dimensions[0], 9.5, 'collector roads should be widened to 9.5m');
assert.equal(crossRoad.dimensions[2], 9.5, 'cross streets should be widened to 9.5m');
assert.deepEqual(district.roadNetwork.roadWidthsMetres, { collector: 9.5, outerResidential: 9, crossStreet: 9.5 });
assert.ok(district.groundColliders.some(item => item.id === 'stage08i-road-outer-residential-west'));
assert.ok(district.groundColliders.some(item => item.id === 'stage08i-road-cross-438'));
assert.equal(district.treesRemoved, 2);
assert.equal(district.overheadMarketGateRemoved, true);
assert.equal(district.mainAvenueWayfindingMovedToVerge, true);

// Solid props must not intrude into any vehicle carriageway. Bounds are
// axis-aligned for these road and building assets; include inherited 08G lanes.
const roadCorridors = [
  { name: 'Ikeja approach', minX: -7, maxX: 7, minZ: 164, maxZ: 246 },
  { name: 'Ikeja commercial avenue', minX: -9, maxX: 9, minZ: 235, maxZ: 385 },
  ...[-45,45].map(x => ({ name: 'collector ' + x, minX: x-4.75, maxX: x+4.75, minZ: 190, maxZ: 450 })),
  ...[-83,83].map(x => ({ name: 'residential ' + x, minX: x-4.5, maxX: x+4.5, minZ: 195, maxZ: 445 })),
  ...[246,310,374,438].map(z => ({ name: 'cross street ' + z, minX: -95, maxX: 95, minZ: z-4.75, maxZ: z+4.75 }))
];
const laneIntrusions = [];
for (const proxy of district.collisionProxies) {
  const [x,,z] = proxy.position;
  const [hx,,hz] = proxy.halfExtents;
  const yaw = (Number(proxy.rotationY)||0) * Math.PI / 180;
  const halfX = Math.abs(Math.cos(yaw))*hx + Math.abs(Math.sin(yaw))*hz;
  const halfZ = Math.abs(Math.sin(yaw))*hx + Math.abs(Math.cos(yaw))*hz;
  for (const road of roadCorridors) {
    if (x+halfX > road.minX+0.05 && x-halfX < road.maxX-0.05 && z+halfZ > road.minZ+0.05 && z-halfZ < road.maxZ-0.05) {
      laneIntrusions.push({ prop: proxy.id, road: road.name });
    }
  }
}
assert.deepEqual(laneIntrusions, [], 'solid Ikeja objects must stay clear of all widened road corridors: ' + JSON.stringify(laneIntrusions));
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
