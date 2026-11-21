import fs from 'node:fs/promises';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { copyToDocument, createDefaultPropertyResolver, cloneDocument, meshopt, prune, simplify, weld } from '@gltf-transform/functions';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const SOURCE = process.env.GIDI_SOURCE;
if (!SOURCE) throw new Error('Set GIDI_SOURCE to the Revision 106 source GLB before regenerating GIDI assets.');
const OUT = 'public/assets/gidi';
const CELLS_DIR = path.join(OUT, 'cells');
const TEXTURE_DIR = path.join(OUT, 'shared', 'textures');
const CELL_SIZE = 500;
const TERRAIN_TILE = 100;
const ROAD_COLLISION_TILE = 25;
const BUILDING_BIN = 25;

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(CELLS_DIR, { recursive: true });
await fs.mkdir(TEXTURE_DIR, { recursive: true });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const source = await io.read(SOURCE);
const scene = source.getRoot().listScenes()[0];
const roots = scene.listChildren();
const sourceNodes = [];
scene.traverse(node => sourceNodes.push(node));

function xyzBounds(node) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let vertexCount = 0;
  node.traverse(current => {
    const mesh = current.getMesh();
    if (!mesh) return;
    const matrix = current.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      const accessor = primitive.getAttribute('POSITION');
      const array = accessor?.getArray();
      if (!array) continue;
      for (let i = 0; i < array.length; i += 3) {
        const x = array[i], y = array[i + 1], z = array[i + 2];
        const p = [
          matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
          matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
          matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
        ];
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], p[axis]);
          max[axis] = Math.max(max[axis], p[axis]);
        }
        vertexCount++;
      }
    }
  });
  return vertexCount ? { min, max, vertexCount } : null;
}
const boundsByNode = new Map();
for (const node of roots) {
  const bounds = xyzBounds(node);
  if (bounds) boundsByNode.set(node, bounds);
}

const excludedPattern = /^(TXT_|MARKER_|ZONE_|RESERVE_|SCALE_|WORLD_FOOTPRINT|MASTER_BOUNDARY|DISTRICT_LABEL)|VEGETATION_(DENSITY|MOISTURE)_MAP|BACKUP|PRE_REPAIR|DBG_|NPC_(SPAWN|PATH)|PLAYER_ROOT_GIDI/i;
function excludeNode(node) {
  const name = node.getName() || '';
  if (excludedPattern.test(name)) return true;
  if (/^GIDI_NPC_.*_RIG$/i.test(name)) return true;
  return false;
}
function isInfrastructure(name) {
  return /^(TERRAIN_BASE_10KM2|ATLANTIC_OCEAN|KURAMO_LAGOON|EKO_CANAL_SPINE|EKO_CANAL_CROSS|LAGOS_LAGOON_ARM|ROAD_SURFACE__|BRIDGE_DECK_SURFACE_|BRIDGE_RAMP_|PRIMARY_|SECONDARY_|ROAD_YB-|SIDEWALK_YB-|DRAIN_YB-)/i.test(name)
    || /^GIDI_BRIDGE_[AB]_(CONTINUOUS_DRIVABLE_DECK|STRUCTURAL_DETAILS_AND_LIGHTS)$/i.test(name)
    || /^GIDI_(KERBS_PRIMARY_AND_SECONDARY|LANE_MARKINGS|PEDESTRIAN_CROSSWALKS|PRIMARY_MEDIAN_BLOCKOUT|ROUNDABOUT_CIRCULATING_LANES|ROUNDABOUT_RAISED_ISLANDS|SERVICE_LANES_CONNECTED|SERVICE_LANE_MARKINGS|SERVICE_LANE_SIDEWALKS|SIDEWALKS_PRIMARY_AND_SECONDARY|SHALLOW_DRAINAGE_CORRIDORS|WATERFRONT_PUBLIC_AND_EXPLORATION_PATHS|WATERFRONT_PROMENADE_BLOCKOUT|WATERFRONT_SAFETY_PARAPETS|WATERFRONT_LOW_ENERGY_LIGHTING|EKO_MARINA_PUBLIC_DECK|ATLANTIC_ENGINEERED_REVETMENT|ENGINEERED_WATERFRONT_REVETMENTS)$/i.test(name)
    || /^GIDI_WATERFRONT_TREE_\d+$/i.test(name)
    || /^EKO_BOULEVARD_CROSSWALK_/i.test(name)
    || /^EKO_BOULEVARD_LIGHT_(HEAD|POLE)_/i.test(name)
    || /^EKO_EXCHANGE_CROWN_BRIDGE$/i.test(name)
    || /^EKITI_(HIGHLANDS_TERRAIN_BLOCKOUT_V1|GRASS_LAYER_COMBINED_V1|DRAINAGE_GROUND_COVER_COMBINED_V1)$/i.test(name)
    || /^EKO_CANAL_PROMENADE_SEGMENT_/i.test(name)
    || /^EKO_PROMENADE_WATER_EDGE_RAIL_/i.test(name)
    || /^PRIMARY_BANK_/i.test(name);
}
function isLikelyBuilding(name, b) {
  if (!b) return false;
  if (/ROAD|PATH|WATER|CANAL|LAGOON|BRIDGE|SIDEWALK|DRAIN|CROSSWALK|GATE|SPAWN|MARKER|LABEL|ZONE|LANDMARK|TERRAIN|GRASS|TREE|SHRUB|PLANT|PARK|SIGN|POLE|LIGHT|FENCE|RAIL|KERB|PITCH|FOOD|BUS|TRAFFIC|NPC|VEH|ASSET|GROUND|GUIDE|BACKUP|PAVEMENT/i.test(name)) return false;
  if (/EKO_BATCH_|VI_CBD_CONFERENCE_AND_HQ_LANDMARKS_MESH|BUILDING|BLDG|TOWER|OFFICE|HOTEL|SHOP|STORE|RESIDENCE|VILLA|HOUSE|FACADE|MALL|PAVILION|CLUB|CHURCH|COMMERCIAL|APARTMENT|WORKSHOP|AFTERHOURS|FRESH_CUT|MARKET_CLUSTER|LEKKI_ESTATE|IKOYI|YABA_HOME|NEIGHBOURHOOD_HOTEL|NEIGHBORHOOD_HOTEL/i.test(name)) return true;
  const span = b.max.map((v, i) => v - b.min[i]);
  return span[1] > 3.2 && span[0] > 4 && span[2] > 4 && span[0] < 120 && span[2] < 120;
}
const cellKey = (x, z) => String(Math.floor(x / CELL_SIZE)) + ',' + String(Math.floor(z / CELL_SIZE));
const cellMap = new Map();
const infraRoots = [];
let copiedNodes = 0;
let splitNodes = 0;
let excludedNodes = 0;
function ensureCell(key) {
  if (!cellMap.has(key)) cellMap.set(key, { key, roots: [], splitMeshes: [], colliders: [], nodeNames: [] });
  return cellMap.get(key);
}

const buildingBins = new Map();
function addBuildingBounds(min, max) {
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const bx = Math.floor(cx / BUILDING_BIN);
  const bz = Math.floor(cz / BUILDING_BIN);
  const cell = cellKey(cx, cz);
  const key = cell + '|' + bx + ',' + bz;
  const current = buildingBins.get(key);
  if (current) {
    for (let i = 0; i < 3; i++) {
      current.min[i] = Math.min(current.min[i], min[i]);
      current.max[i] = Math.max(current.max[i], max[i]);
    }
  } else {
    buildingBins.set(key, { cell, min: min.slice(), max: max.slice() });
  }
}
function addBuildingTriangles(node) {
  const matrix = node.getWorldMatrix();
  const mesh = node.getMesh();
  if (!mesh) return;
  for (const primitive of mesh.listPrimitives()) {
    if ((primitive.getMode() ?? 4) !== 4) continue;
    const pos = primitive.getAttribute('POSITION')?.getArray();
    if (!pos) continue;
    const indexArray = primitive.getIndices()?.getArray();
    const count = indexArray ? indexArray.length : pos.length / 3;
    for (let i = 0; i + 2 < count; i += 3) {
      const ids = indexArray ? [indexArray[i], indexArray[i + 1], indexArray[i + 2]] : [i, i + 1, i + 2];
      const pts = ids.map(id => {
        const x = pos[id * 3], y = pos[id * 3 + 1], z = pos[id * 3 + 2];
        return [
          matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
          matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
          matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
        ];
      });
      const centroid = [0, 1, 2].map(axis => (pts[0][axis] + pts[1][axis] + pts[2][axis]) / 3);
      const cell = cellKey(centroid[0], centroid[2]);
      const bx = Math.floor(centroid[0] / BUILDING_BIN);
      const bz = Math.floor(centroid[2] / BUILDING_BIN);
      const key = cell + '|' + bx + ',' + bz;
      let bin = buildingBins.get(key);
      if (!bin) {
        bin = { cell, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        buildingBins.set(key, bin);
      }
      for (const p of pts) for (let axis = 0; axis < 3; axis++) {
        bin.min[axis] = Math.min(bin.min[axis], p[axis]);
        bin.max[axis] = Math.max(bin.max[axis], p[axis]);
      }
    }
  }
}

for (const node of roots) {
  const name = node.getName() || '';
  const b = boundsByNode.get(node);
  if (excludeNode(node) || !b) { excludedNodes++; continue; }

  if (isInfrastructure(name)) {
    infraRoots.push(node);
    continue;
  }

  if (isLikelyBuilding(name, b)) {
    const spanX = b.max[0] - b.min[0];
    const spanZ = b.max[2] - b.min[2];
    if (spanX > 160 || spanZ > 160) addBuildingTriangles(node);
    else addBuildingBounds(b.min, b.max);
  }

  const spanX = b.max[0] - b.min[0];
  const spanZ = b.max[2] - b.min[2];
  const isBigMergedMesh = Boolean(node.getMesh()) && (spanX > CELL_SIZE * 0.55 || spanZ > CELL_SIZE * 0.55);
  if (isBigMergedMesh && node.listChildren().length === 0) {
    const partsByCell = new Map();
    const matrix = node.getWorldMatrix();
    for (const primitive of node.getMesh().listPrimitives()) {
      if ((primitive.getMode() ?? 4) !== 4) continue;
      const posAcc = primitive.getAttribute('POSITION');
      const pos = posAcc?.getArray();
      if (!pos) continue;
      const attrs = primitive.listSemantics().map(semantic => ({ semantic, accessor: primitive.getAttribute(semantic), array: primitive.getAttribute(semantic).getArray() }));
      const indexArray = primitive.getIndices()?.getArray();
      const indexCount = indexArray ? indexArray.length : pos.length / 3;
      for (let i = 0; i + 2 < indexCount; i += 3) {
        const ids = indexArray ? [indexArray[i], indexArray[i + 1], indexArray[i + 2]] : [i, i + 1, i + 2];
        const centroid = [0, 0, 0];
        for (const id of ids) {
          const x = pos[id * 3], y = pos[id * 3 + 1], z = pos[id * 3 + 2];
          centroid[0] += (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / 3;
          centroid[1] += (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / 3;
          centroid[2] += (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / 3;
        }
        const key = cellKey(centroid[0], centroid[2]);
        if (!partsByCell.has(key)) partsByCell.set(key, new Map());
        const byPrimitive = partsByCell.get(key);
        if (!byPrimitive.has(primitive)) byPrimitive.set(primitive, attrs.map(a => ({ ...a, values: [] })));
        const outputAttrs = byPrimitive.get(primitive);
        for (let a = 0; a < attrs.length; a++) {
          const sourceArray = attrs[a].array;
          const components = attrs[a].accessor.getElementSize();
          for (const id of ids) {
            const start = id * components;
            for (let j = 0; j < components; j++) outputAttrs[a].values.push(sourceArray[start + j]);
          }
        }
      }
    }
    for (const [key, primitives] of partsByCell) {
      const cell = ensureCell(key);
      cell.splitMeshes.push({ node, primitives, key });
      cell.nodeNames.push(name);
      splitNodes++;
    }
    continue;
  }

  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const cell = ensureCell(cellKey(cx, cz));
  cell.roots.push(node);
  cell.nodeNames.push(name);
  copiedNodes++;
}

// Terrain support proxies are sampled per 100m tile; water rectangles are deliberately excluded.
const terrainTiles = new Map();
const roadTiles = new Map();
const waterBounds = [];
for (const node of roots) {
  if (/ATLANTIC_OCEAN|KURAMO_LAGOON|EKO_CANAL_SPINE|EKO_CANAL_CROSS|LAGOS_LAGOON_ARM/i.test(node.getName() || '')) {
    const b = boundsByNode.get(node);
    if (b) waterBounds.push(b);
  }
}
function collidesWater(x, z) {
  return waterBounds.some(b => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2]);
}
function sampleRoadSurface(node) {
  const nodeName = node.getName() || 'road-surface';
  node.traverse(current => {
    const mesh = current.getMesh();
    if (!mesh) return;
    const transform = current.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      if ((primitive.getMode() ?? 4) !== 4) continue;
      const pos = primitive.getAttribute('POSITION')?.getArray();
      if (!pos) continue;
      const indices = primitive.getIndices()?.getArray();
      const length = indices ? indices.length : pos.length / 3;
      for (let i = 0; i + 2 < length; i += 3) {
        const ids = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2];
        const points = ids.map(id => {
          const x = pos[id * 3], y = pos[id * 3 + 1], z = pos[id * 3 + 2];
          return [
            transform[0] * x + transform[4] * y + transform[8] * z + transform[12],
            transform[1] * x + transform[5] * y + transform[9] * z + transform[13],
            transform[2] * x + transform[6] * y + transform[10] * z + transform[14]
          ];
        });
        const center = [0, 1, 2].map(axis => (points[0][axis] + points[1][axis] + points[2][axis]) / 3);
        const cell = cellKey(center[0], center[2]);
        const tx = Math.floor(center[0] / ROAD_COLLISION_TILE);
        const tz = Math.floor(center[2] / ROAD_COLLISION_TILE);
        const key = cell + '|' + tx + ',' + tz;
        let tile = roadTiles.get(key);
        if (!tile) {
          tile = { cell, tx, tz, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], sourceNames: new Set() };
          roadTiles.set(key, tile);
        }
        tile.sourceNames.add(nodeName);
        for (const point of points) for (let axis = 0; axis < 3; axis++) {
          tile.min[axis] = Math.min(tile.min[axis], point[axis]);
          tile.max[axis] = Math.max(tile.max[axis], point[axis]);
        }
      }
    }
  });
}
for (const node of roots) {
  const name = node.getName() || '';
  if (/^ROAD_SURFACE__|^BRIDGE_DECK_SURFACE_|^BRIDGE_RAMP_|^COASTAL_ACCESS_SURFACE_B05$|^GIDI_BRIDGE_[AB]_CONTINUOUS_DRIVABLE_DECK$/i.test(name)) sampleRoadSurface(node);
}

function sampleTerrain(node) {
  node.traverse(current => {
    const mesh = current.getMesh();
    if (!mesh) return;
    const m = current.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      const pos = primitive.getAttribute('POSITION')?.getArray();
      if (!pos) continue;
      for (let i = 0; i < pos.length; i += 3) {
        const x = m[0] * pos[i] + m[4] * pos[i + 1] + m[8] * pos[i + 2] + m[12];
        const y = m[1] * pos[i] + m[5] * pos[i + 1] + m[9] * pos[i + 2] + m[13];
        const z = m[2] * pos[i] + m[6] * pos[i + 1] + m[10] * pos[i + 2] + m[14];
        const tx = Math.floor(x / TERRAIN_TILE), tz = Math.floor(z / TERRAIN_TILE);
        const key = tx + ',' + tz;
        let tile = terrainTiles.get(key);
        if (!tile) {
          tile = { tx, tz, minY: Infinity, maxY: -Infinity, sumY: 0, count: 0 };
          terrainTiles.set(key, tile);
        }
        tile.minY = Math.min(tile.minY, y);
        tile.maxY = Math.max(tile.maxY, y);
        tile.sumY += y;
        tile.count++;
      }
    }
  });
}
for (const node of roots) {
  if (/^TERRAIN_BASE_10KM2$|^EKITI_HIGHLANDS_TERRAIN_BLOCKOUT_V1$/i.test(node.getName() || '')) sampleTerrain(node);
}

function createTargetDocument() {
  const doc = new Document();
  for (const ext of source.getRoot().listExtensionsUsed()) {
    const copied = doc.createExtension(ext.constructor);
    if (ext.isRequired()) copied.setRequired(true);
  }
  return { doc, scene: doc.createScene('GIDI'), resolver: createDefaultPropertyResolver(doc, source), buffer: doc.createBuffer('GIDI Cell Buffer') };
}
function copyNode(doc, targetScene, resolver, sourceNode) {
  const map = copyToDocument(doc, source, [sourceNode], resolver);
  const targetNode = map.get(sourceNode);
  targetScene.addChild(targetNode);
  for (const [from, to] of map) {
    if (from.propertyType === 'Texture') {
      const sourceIndex = source.getRoot().listTextures().indexOf(from);
      const mime = from.getMimeType() || 'image/png';
      const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
      to.setURI('../shared/textures/gidi-' + sourceIndex + '.' + extension);
    }
  }
  return { map, targetNode };
}
function copyTransform(targetNode, sourceNode) {
  targetNode.setName(sourceNode.getName());
  targetNode.setTranslation(sourceNode.getTranslation());
  targetNode.setRotation(sourceNode.getRotation());
  targetNode.setScale(sourceNode.getScale());
  targetNode.setExtras(structuredClone(sourceNode.getExtras() || {}));
  const matrix = sourceNode.getMatrix();
  if (matrix) targetNode.setMatrix(matrix);
}
function createSplitNode(doc, targetScene, resolver, buffer, sourceNode, primitiveParts, key) {
  const node = doc.createNode(sourceNode.getName() + '__' + key.replace(',', '_'));
  copyTransform(node, sourceNode);
  const mesh = doc.createMesh(sourceNode.getName() + '__' + key.replace(',', '_'));
  for (const [sourcePrimitive, attrs] of primitiveParts) {
    const primitive = doc.createPrimitive().setMode(sourcePrimitive.getMode() ?? 4);
    for (const attr of attrs) {
      const sourceAccessor = attr.accessor;
      const values = new (sourceAccessor.getArray().constructor)(attr.values);
      const accessor = doc.createAccessor(sourceNode.getName() + '_' + attr.semantic)
        .setType(sourceAccessor.getType())
        .setNormalized(sourceAccessor.getNormalized())
        .setArray(values)
        .setBuffer(buffer);
      primitive.setAttribute(attr.semantic, accessor);
    }
    const sourceMaterial = sourcePrimitive.getMaterial();
    if (sourceMaterial) {
      const materialMap = copyToDocument(doc, source, [sourceMaterial], resolver);
      primitive.setMaterial(materialMap.get(sourceMaterial));
      for (const [from, to] of materialMap) {
        if (from.propertyType === 'Texture') {
          const sourceIndex = source.getRoot().listTextures().indexOf(from);
          const mime = from.getMimeType() || 'image/png';
          const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
          to.setURI('../shared/textures/gidi-' + sourceIndex + '.' + extension);
        }
      }
    }
    mesh.addPrimitive(primitive);
  }
  node.setMesh(mesh);
  targetScene.addChild(node);
}
function createCollisionForCell(cell) {
  const out = cell.colliders;
  // Road and bridge colliders are rasterized from authored road-surface triangles.
  // This preserves shoreline gaps and does not invent colliders across unapproved crossings.
  for (const tile of roadTiles.values()) {
    if (tile.cell !== cell.key) continue;
    const span = tile.max.map((value, axis) => value - tile.min[axis]);
    out.push({
      id: 'road-mesh:' + tile.tx + ',' + tile.tz,
      kind: 'road',
      position: [(tile.min[0] + tile.max[0]) / 2, tile.max[1] - 0.22, (tile.min[2] + tile.max[2]) / 2],
      halfExtents: [Math.max(0.18, span[0] / 2 + 0.25), 0.22, Math.max(0.18, span[2] / 2 + 0.25)],
      rotationY: 0,
      surface: 'asphalt'
    });
  }
  for (const tile of terrainTiles.values()) {
    const x = (tile.tx + 0.5) * TERRAIN_TILE;
    const z = (tile.tz + 0.5) * TERRAIN_TILE;
    if (cellKey(x, z) !== cell.key || collidesWater(x, z)) continue;
    const top = Math.max(-8, Math.min(30, tile.count ? tile.sumY / tile.count : tile.maxY));
    out.push({
      id: 'terrain:' + tile.tx + ',' + tile.tz,
      kind: 'terrain',
      position: [x, top - 0.45, z],
      halfExtents: [TERRAIN_TILE / 2, 0.45, TERRAIN_TILE / 2],
      rotationY: 0,
      surface: 'grass'
    });
  }
  return out;
}
function finalizeBuildingColliders() {
  for (const bin of buildingBins.values()) {
    const span = bin.max.map((v, i) => v - bin.min[i]);
    if (span[1] < 2.6 || span[0] < 0.5 || span[2] < 0.5) continue;
    const cell = ensureCell(bin.cell);
    cell.colliders.push({
      id: 'building:' + Math.floor(bin.min[0] / BUILDING_BIN) + ',' + Math.floor(bin.min[2] / BUILDING_BIN),
      kind: 'building',
      position: [(bin.min[0] + bin.max[0]) / 2, (bin.min[1] + bin.max[1]) / 2, (bin.min[2] + bin.max[2]) / 2],
      halfExtents: [Math.max(0.45, span[0] / 2 + 0.28), Math.max(1.3, span[1] / 2), Math.max(0.45, span[2] / 2 + 0.28)],
      rotationY: 0,
      surface: 'concrete'
    });
  }
}
finalizeBuildingColliders();
for (const cell of cellMap.values()) createCollisionForCell(cell);

for (const [index, texture] of source.getRoot().listTextures().entries()) {
  const mime = texture.getMimeType() || 'image/png';
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const filename = 'gidi-' + index + '.' + extension;
  await fs.writeFile(path.join(TEXTURE_DIR, filename), texture.getImage());
}
function applySharedTextureUris(doc) {
  for (const texture of doc.getRoot().listTextures()) {
    const sourceTexture = source.getRoot().listTextures().find(t => t.getName() === texture.getName());
    const index = source.getRoot().listTextures().indexOf(sourceTexture);
    const mime = sourceTexture?.getMimeType() || 'image/png';
    const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
    texture.setURI('../shared/textures/gidi-' + index + '.' + extension);
  }
}
const MEDIUM_DETAIL_PATTERN = /TEXT|LABEL|SUBTITLE|WAYFINDING|SPRAY_BOTTLE|WASTE_BIN_(LINER|RIM)|SIGN_TEXT|SIGN_SUBTITLE|INTERACTION_MARKER_RING/i;
function geometryStats(doc) {
  const out = { meshCount: 0, primitiveCount: 0, vertices: 0, triangles: 0 };
  const meshes = doc.getRoot().listMeshes();
  out.meshCount = meshes.length;
  for (const mesh of meshes) for (const primitive of mesh.listPrimitives()) {
    if ((primitive.getMode() ?? 4) !== 4) continue;
    const positions = primitive.getAttribute('POSITION');
    if (!positions) continue;
    out.primitiveCount++;
    out.vertices += positions.getCount();
    out.triangles += Math.floor((primitive.getIndices()?.getCount() ?? positions.getCount()) / 3);
  }
  return out;
}
function removeMediumDistanceDetails(doc) {
  const removed = [];
  for (const node of doc.getRoot().listNodes()) {
    if (!MEDIUM_DETAIL_PATTERN.test(node.getName() || '')) continue;
    const parent = node.getParentNode();
    if (!parent) continue;
    parent.removeChild(node);
    removed.push(node.getName());
  }
  return removed;
}
async function writeDoc(doc, filename, medium = false) {
  applySharedTextureUris(doc);
  const outIO = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  let removedMediumDetails = [];
  if (medium) {
    removedMediumDetails = removeMediumDistanceDetails(doc);
    await doc.transform(prune());
    try {
      // Keep topological borders locked so independent cells do not open visible seams.
      // Text, micro-signage and small interior clutter are removed first because they
      // cannot contribute useful silhouette at the 160–360m medium-detail range.
      await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.20, error: 0.10, lockBorder: true }), prune());
    } catch (error) {
      console.warn('LOD simplify failed for ' + filename + ': ' + error.message);
    }
  } else {
    await doc.transform(weld(), prune());
  }
  const geometry = geometryStats(doc);
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const gltfPath = path.join(CELLS_DIR, filename);
  await outIO.write(gltfPath, doc);
  // Compact the textual GLTF wrapper; geometry remains in Meshopt-compressed buffers.
  const gltfJSON = JSON.parse(await fs.readFile(gltfPath, 'utf8'));
  await fs.writeFile(gltfPath, JSON.stringify(gltfJSON));
  const prefix = filename.replace(/\.gltf$/, '');
  const outputFiles = await fs.readdir(CELLS_DIR);
  let byteTotal = 0;
  for (const outputFile of outputFiles) {
    if (outputFile === filename || outputFile === prefix + '.bin' || outputFile.startsWith(prefix + '_')) {
      byteTotal += (await fs.stat(path.join(CELLS_DIR, outputFile))).size;
    }
  }
  return { bytes: byteTotal, geometry, removedMediumDetailNodeCount: removedMediumDetails.length };
}
async function buildDocument(sourceRoots, splitEntries = []) {
  const { doc, scene: targetScene, resolver, buffer } = createTargetDocument();
  for (const node of sourceRoots) copyNode(doc, targetScene, resolver, node);
  for (const entry of splitEntries) createSplitNode(doc, targetScene, resolver, buffer, entry.node, entry.primitives, entry.key);
  return doc;
}

const infraDoc = await buildDocument(infraRoots);
const infrastructureResult = await writeDoc(infraDoc, 'infrastructure.gltf', false);
const infraSize = infrastructureResult.bytes;

const manifestCells = [];
let fullBytes = 0, mediumBytes = 0, cellMeshCount = 0;
const fullGeometryTotals = { meshCount: 0, primitiveCount: 0, vertices: 0, triangles: 0 };
const mediumGeometryTotals = { meshCount: 0, primitiveCount: 0, vertices: 0, triangles: 0 };
let mediumDetailNodesRemoved = 0;
for (const cell of [...cellMap.values()].sort((a, b) => a.key.localeCompare(b.key))) {
  if (!cell.roots.length && !cell.splitMeshes.length && !cell.colliders.length) continue;
  const doc = await buildDocument(cell.roots, cell.splitMeshes);
  const coords = cell.key.split(',').map(Number);
  const cx = coords[0], cz = coords[1];
  const fullName = 'cell_' + cx + '_' + cz + '_full.gltf';
  const mediumName = 'cell_' + cx + '_' + cz + '_lod1.gltf';
  const fullResult = await writeDoc(doc, fullName, false);
  const mediumDoc = cloneDocument(doc);
  const mediumResult = await writeDoc(mediumDoc, mediumName, true);
  const fullSize = fullResult.bytes;
  const mediumSize = mediumResult.bytes;
  fullBytes += fullSize;
  mediumBytes += mediumSize;
  for (const key of Object.keys(fullGeometryTotals)) { fullGeometryTotals[key] += fullResult.geometry[key]; mediumGeometryTotals[key] += mediumResult.geometry[key]; }
  mediumDetailNodesRemoved += mediumResult.removedMediumDetailNodeCount;
  cellMeshCount++;
  manifestCells.push({
    id: cell.key,
    x: cx, z: cz, cellSize: CELL_SIZE,
    bounds: { minX: cx * CELL_SIZE, maxX: (cx + 1) * CELL_SIZE, minZ: cz * CELL_SIZE, maxZ: (cz + 1) * CELL_SIZE },
    full: 'assets/gidi/cells/' + fullName,
    lod1: 'assets/gidi/cells/' + mediumName,
    nodeCount: cell.roots.length + cell.splitMeshes.length,
    colliderCount: cell.colliders.length,
    geometry: { full: fullResult.geometry, lod1: mediumResult.geometry, removedDetailNodeCount: mediumResult.removedMediumDetailNodeCount },
    colliders: cell.colliders
  });
  if (cellMeshCount % 8 === 0) console.log('Generated ' + cellMeshCount + '/' + cellMap.size + ' cells…');
}

const manifest = {
  version: 1,
  source: 'GIDI_R106_BATCH02_BUILDING_FACADE_PILOT.glb',
  sourceRevision: 'Revision 106',
  sourceProject: { name: 'GIDI 02 REBUILD', projectId: '5d0b57d1-197f-4532-bb0f-4ca703c3224a', revision: 106, sceneSequence: 2 },
  coordinateSystem: 'glTF Y-up; source X east and source north maps to negative Z',
  worldYOffset: -0.3,
  cellSize: CELL_SIZE,
  fullDetailRadius: 160,
  mediumDetailRadius: 360,
  unloadRadius: 900,
  collisionLoadRadius: 220,
  collisionUnloadRadius: 460,
  lodProfile: { ratio: 0.20, error: 0.10, lockBorder: true, mediumDetailCull: 'text-label-wayfinding-and-small-interior-clutter' },
  geometryCompression: 'EXT_meshopt_compression, high level; streamed per cell',
  infrastructure: 'assets/gidi/cells/infrastructure.gltf',
  infrastructureSizeBytes: infraSize,
  cells: manifestCells,
  stats: {
    cellCount: manifestCells.length,
    cellSize: CELL_SIZE,
    fullAssetBytes: fullBytes,
    mediumAssetBytes: mediumBytes,
    infrastructureBytes: infraSize,
    fullGeometry: fullGeometryTotals,
    mediumGeometry: mediumGeometryTotals,
    vertexReduction: fullGeometryTotals.vertices ? 1 - mediumGeometryTotals.vertices / fullGeometryTotals.vertices : 0,
    triangleReduction: fullGeometryTotals.triangles ? 1 - mediumGeometryTotals.triangles / fullGeometryTotals.triangles : 0,
    mediumDetailNodesRemoved,
    sharedTextureCount: source.getRoot().listTextures().length,
    sharedTextureBytes: source.getRoot().listTextures().reduce((n, t) => n + (t.getImage()?.byteLength || 0), 0),
    rootMeshTreeCount: boundsByNode.size,
    copiedNodes, splitNodes, excludedNodes,
    terrainCollisionTiles: terrainTiles.size,
    roadCollisionTiles: roadTiles.size,
    buildingCollisionBins: buildingBins.size,
    collisionProxyCount: manifestCells.reduce((n, c) => n + c.colliderCount, 0)
  }
};
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
await fs.writeFile(path.join(OUT, 'build-report.json'), JSON.stringify({
  sourceProject: manifest.sourceProject,
  stats: manifest.stats,
  infrastructureNodeCount: infraRoots.length,
  cells: manifestCells.map(c => ({ id: c.id, nodes: c.nodeCount, colliders: c.colliderCount, geometry: c.geometry }))
}, null, 2));
console.log('GIDI_BUILD_REPORT', JSON.stringify(manifest.stats));
