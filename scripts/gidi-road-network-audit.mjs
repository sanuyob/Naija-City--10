import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const manifest = JSON.parse(await fs.readFile('public/assets/gidi/manifest.json', 'utf8'));
const roads = (manifest.cells || []).flatMap(cell => (cell.colliders || [])
  .filter(collider => collider.kind === 'road')
  .map(collider => ({ ...collider, cell: cell.id })));

assert.ok(roads.length > 0, 'GIDI manifest should contain road collision tiles');
const invalid = roads.filter(road =>
  !Array.isArray(road.position) || road.position.length !== 3 ||
  !road.position.every(Number.isFinite) ||
  !Array.isArray(road.halfExtents) || road.halfExtents.length !== 3 ||
  !road.halfExtents.every(value => Number.isFinite(value) && value > 0) ||
  road.surface !== 'asphalt'
);
assert.deepEqual(invalid, [], `Invalid/non-asphalt road collider(s): ${invalid.map(x => x.id).join(', ')}`);

// Convert each axis-aligned or Y-rotated rectangle into its world-space X/Z AABB.
const rectangles = roads.map((road, index) => {
  const yaw = (Number(road.rotationY) || 0) * Math.PI / 180;
  const halfX = Math.abs(Math.cos(yaw)) * road.halfExtents[0] + Math.abs(Math.sin(yaw)) * road.halfExtents[2];
  const halfZ = Math.abs(Math.sin(yaw)) * road.halfExtents[0] + Math.abs(Math.cos(yaw)) * road.halfExtents[2];
  return {
    index,
    minX: road.position[0] - halfX,
    maxX: road.position[0] + halfX,
    minZ: road.position[2] - halfZ,
    maxZ: road.position[2] + halfZ
  };
});

// Spatial hashing avoids an O(n²) all-pairs scan for the full 42-cell road map.
const bucketSize = 32;
const buckets = new Map();
for (const rect of rectangles) {
  for (let x = Math.floor(rect.minX / bucketSize); x <= Math.floor(rect.maxX / bucketSize); x++) {
    for (let z = Math.floor(rect.minZ / bucketSize); z <= Math.floor(rect.maxZ / bucketSize); z++) {
      const key = `${x},${z}`;
      const list = buckets.get(key) || [];
      list.push(rect.index);
      buckets.set(key, list);
    }
  }
}

const adjacency = Array.from({ length: roads.length }, () => []);
const checkedPairs = new Set();
let adjacencyPairs = 0;
const connectivityToleranceMetres = 0.75;
for (const indices of buckets.values()) {
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) {
      const i = indices[a], j = indices[b];
      if (i === j) continue;
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (checkedPairs.has(key)) continue;
      checkedPairs.add(key);
      const A = rectangles[i], B = rectangles[j];
      const gapX = Math.max(A.minX - B.maxX, B.minX - A.maxX, 0);
      const gapZ = Math.max(A.minZ - B.maxZ, B.minZ - A.maxZ, 0);
      if (gapX <= connectivityToleranceMetres && gapZ <= connectivityToleranceMetres) {
        adjacency[i].push(j);
        adjacency[j].push(i);
        adjacencyPairs++;
      }
    }
  }
}

const visited = new Set();
const components = [];
for (let start = 0; start < roads.length; start++) {
  if (visited.has(start)) continue;
  const stack = [start];
  visited.add(start);
  let size = 0;
  while (stack.length) {
    const current = stack.pop();
    size++;
    for (const next of adjacency[current]) {
      if (visited.has(next)) continue;
      visited.add(next);
      stack.push(next);
    }
  }
  components.push(size);
}

const isolated = adjacency.flatMap((list, index) => list.length === 0 ? [roads[index].id] : []);
assert.equal(components.length, 1, `Expected one connected GIDI road network; found ${components.length} components (sizes ${components.slice(0, 12).join(', ')})`);
assert.deepEqual(isolated, [], `Isolated road tiles: ${isolated.join(', ')}`);

console.log(JSON.stringify({
  pass: true,
  cells: manifest.cells.length,
  roadTiles: roads.length,
  validAsphaltColliders: roads.length - invalid.length,
  adjacencyPairs,
  connectivityToleranceMetres,
  connectedComponents: components.length,
  largestComponentTiles: Math.max(...components),
  isolatedTiles: isolated.length
}, null, 2));
