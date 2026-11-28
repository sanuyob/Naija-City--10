import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import validator from 'gltf-validator';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample } from '@gltf-transform/functions';
import { NPC_DEFINITIONS } from '../src/npc-roster.js';

const SOURCE_ROOT = '/workspace/naija-city-asset-staging/civilian-npc-library-2026-11-28/gobkit/extracted';
const LIBRARY_ROOT = '/workspace/naija-city-asset-staging/civilian-npc-library-2026-11-28';
const OUTPUT_ROOT = path.resolve('public/assets/npcs/gobkit-cc0/roster');
const PACKS = [
  'gobkit-human001-pack', 'gobkit-human002-pack', 'gobkit-human008-pack',
  'gobkit-human015-pack', 'gobkit-human017-pack', 'gobkit-human019-pack',
  'gobkit-human020-pack', 'gobkit-human021-pack'
];
const io = new NodeIO();
const slug = value => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function inspect(doc) {
  const root = doc.getRoot(), skins = root.listSkins(), animations = root.listAnimations().map(item => item.getName());
  return { skins: skins.length, joints: skins.map(skin => skin.listJoints().length), animations,
    materials: root.listMaterials().length, textures: root.listTextures().length, meshes: root.listMeshes().length,
    primitives: root.listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().length, 0),
    clothingNodes: root.listNodes().filter(node => node.getName().startsWith('NaijaCity Outfit')).length };
}
function assertCompatible(info, label) {
  if (info.skins !== 1 || !info.joints.every(count => count === 13)) throw new Error(label + ': expected one compatible 13-joint character rig.');
  if (!info.animations.length || !info.animations.some(name => /^idle$/i.test(name))) throw new Error(label + ': missing animation clips or Idle.');
  if (!info.materials || !info.textures || !info.meshes || info.clothingNodes < 2) throw new Error(label + ': missing materials, textures, or fitted garment meshes.');
}

function fabricFamily(style) {
  if (style === 'sanitation-green') return 'sanitation';
  if (/adire/.test(style)) return 'adire';
  if (/ankara|yoruba|performance/.test(style)) return 'ankara';
  if (/school/.test(style)) return 'school';
  if (/office|smart|executive|tech/.test(style)) return 'office';
  if (/security|police|official|responder/.test(style)) return 'uniform';
  if (/farm|field/.test(style)) return 'farm';
  if (/chef|service|hospitality|market-apron/.test(style)) return 'service';
  if (/high-vis|hardhat|workwear|courier|transport/.test(style)) return 'work';
  return 'casual';
}

function texturePixels(family) {
  const width = 128, height = 128, png = new PNG({ width, height });
  const palettes = {
    adire: [[13, 31, 78], [35, 73, 143], [128, 178, 209], [231, 235, 219]],
    ankara: [[14, 91, 96], [225, 103, 55], [244, 188, 73], [42, 38, 83]],
    sanitation: [[15, 75, 48], [24, 104, 65], [41, 126, 83], [185, 213, 66]],
    school: [[24, 43, 77], [33, 58, 99], [229, 224, 204], [175, 190, 203]],
    office: [[37, 49, 67], [55, 72, 92], [111, 132, 151], [205, 211, 211]],
    uniform: [[25, 43, 56], [39, 65, 78], [90, 111, 117], [201, 180, 111]],
    farm: [[67, 77, 38], [98, 104, 52], [147, 111, 62], [206, 180, 119]],
    service: [[235, 229, 211], [205, 213, 206], [36, 74, 79], [170, 112, 60]],
    work: [[61, 72, 75], [87, 99, 96], [133, 117, 74], [213, 153, 54]],
    casual: [[42, 76, 98], [62, 112, 125], [191, 156, 117], [226, 215, 192]]
  };
  const colors = palettes[family] || palettes.casual;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const tx = x % 32, ty = y % 32;
    let index = 0;
    if (family === 'adire') {
      const diamond = Math.abs(tx - 16) + Math.abs(ty - 16);
      index = diamond < 5 ? 3 : diamond < 9 ? 2 : ((tx + ty) % 13 < 2 ? 1 : 0);
    } else if (family === 'ankara') {
      const dx = tx - 16, dy = ty - 16, radius = Math.sqrt(dx * dx + dy * dy);
      index = radius < 5 ? 2 : radius < 8 ? 1 : ((Math.abs(dx) < 2 || Math.abs(dy) < 2) ? 3 : 0);
    } else if (family === 'sanitation') {
      index = ((x + y * 2) % 24 < 2 || (tx > 12 && tx < 15 && ty > 12 && ty < 15)) ? 3 : ((tx + ty) % 19 < 2 ? 2 : (x % 11 === 0 ? 1 : 0));
    } else if (family === 'school' || family === 'office' || family === 'uniform') {
      index = (x % 24 === 0 || (family === 'school' && y % 32 < 2)) ? 2 : (((x + 2 * y) % 37 === 0) ? 3 : 0);
    } else if (family === 'farm' || family === 'work' || family === 'service' || family === 'casual') {
      index = ((x + y) % 29 < 2 || y % 17 === 0) ? 2 : (((x * 3 + y) % 47 === 0) ? 3 : (x % 13 === 0 ? 1 : 0));
    }
    const color = colors[index], i = (y * width + x) * 4;
    png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2]; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function createMaterials(doc) {
  const materials = new Map();
  for (const family of ['adire','ankara','sanitation','school','office','uniform','farm','service','work','casual']) {
    const tex = doc.createTexture('NaijaCity Fabric ' + family).setImage(texturePixels(family)).setMimeType('image/png');
    const mat = doc.createMaterial('NaijaCity Fabric ' + family)
      .setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(tex)
      .setMetallicFactor(0).setRoughnessFactor(0.92).setDoubleSided(true);
    materials.set(family, mat);
  }
  const reflective = doc.createMaterial('NaijaCity Reflective Safety Tape')
    .setBaseColorFactor([0.78, 0.95, 0.12, 1]).setMetallicFactor(0).setRoughnessFactor(0.42).setDoubleSided(true);
  const dark = doc.createMaterial('NaijaCity Sanitation Work Trousers')
    .setBaseColorFactor([0.035, 0.12, 0.085, 1]).setMetallicFactor(0).setRoughnessFactor(0.96).setDoubleSided(true);
  return { fabrics: materials, reflective, dark };
}

function buildTubeY({ rings, segments = 16, centerX = 0, centerZ = 0, joints = [], vStart = 0, vEnd = 1 }) {
  const positions = [], normals = [], uv = [], joints0 = [], weights0 = [], indices = [];
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let s = 0; s <= segments; s++) {
      const a = s / segments * Math.PI * 2, c = Math.cos(a), q = Math.sin(a);
      positions.push(centerX + c * ring.rx, ring.y, centerZ + q * ring.rz);
      const nx = c / Math.max(0.0001, ring.rx), nz = q / Math.max(0.0001, ring.rz), nl = Math.hypot(nx, nz);
      normals.push(nx / nl, 0, nz / nl);
      uv.push(s / segments * 2, vStart + (vEnd - vStart) * r / Math.max(1, rings.length - 1));
      const blend = ring.blend || 0;
      joints0.push(ring.joint, blend ? ring.joint2 : 0, 0, 0);
      weights0.push(1 - blend, blend, 0, 0);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < segments; s++) {
    const a = r * (segments + 1) + s, b = a + segments + 1, c = a + 1, d = b + 1;
    indices.push(a, b, c, b, d, c);
  }
  return { positions, normals, uv, joints0, weights0, indices };
}

function buildSleeve(side, segments = 12) {
  const positions = [], normals = [], uv = [], joints0 = [], weights0 = [], indices = [];
  const upperJoint = side > 0 ? 7 : 9, forearmJoint = side > 0 ? 8 : 10;
  const rows = [
    { x: 0.028, ry: 0.0135, rz: 0.022, joint: upperJoint },
    { x: 0.052, ry: 0.0140, rz: 0.022, joint: upperJoint, joint2: forearmJoint, blend: 0.18 },
    { x: 0.082, ry: 0.0125, rz: 0.018, joint: forearmJoint },
    { x: 0.105, ry: 0.0100, rz: 0.014, joint: forearmJoint }
  ];
  for (let r = 0; r < rows.length; r++) {
    const ring = rows[r];
    for (let s = 0; s <= segments; s++) {
      const a = s / segments * Math.PI * 2, c = Math.cos(a), q = Math.sin(a);
      positions.push(side * ring.x, 0.047 + c * ring.ry, 0.002 + q * ring.rz);
      normals.push(0, c, q); uv.push(s / segments * 2, r / (rows.length - 1));
      joints0.push(ring.joint, ring.blend ? ring.joint2 : 0, 0, 0);
      weights0.push(1 - (ring.blend || 0), ring.blend || 0, 0, 0);
    }
  }
  for (let r = 0; r < rows.length - 1; r++) for (let s = 0; s < segments; s++) {
    const a = r * (segments + 1) + s, b = a + segments + 1, c = a + 1, d = b + 1;
    if (side > 0) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
  }
  return { positions, normals, uv, joints0, weights0, indices };
}

function buildApron() {
  const positions = [], normals = [], uv = [], joints0 = [], weights0 = [], indices = [];
  const cols = 6, rows = 6;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = c / (cols - 1), v = r / (rows - 1);
    positions.push((u - 0.5) * 0.074, 0.028 + v * 0.052, 0.048 + Math.sin(u * Math.PI) * 0.002);
    normals.push(0, 0, 1); uv.push(u, v);
    const blend = v > 0.72 ? 0.2 : 0;
    joints0.push(6, 0, 0, 0); weights0.push(1, 0, 0, 0);
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + cols, cc = a + 1, d = b + 1;
    indices.push(a, b, cc, b, d, cc);
  }
  return { positions, normals, uv, joints0, weights0, indices };
}

function makeAccessor(doc, buffer, type, array, min = null, max = null) {
  const accessor = doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  return accessor;
}
function addGarment(doc, scene, buffer, skin, name, geometry, material) {
  if (!geometry.indices.length) return;
  const mesh = doc.createMesh(name), primitive = doc.createPrimitive();
  const pos = geometry.positions, mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mins[k] = Math.min(mins[k], pos[i + k]); maxs[k] = Math.max(maxs[k], pos[i + k]); }
  primitive.setAttribute('POSITION', makeAccessor(doc, buffer, 'VEC3', new Float32Array(pos), mins, maxs));
  primitive.setAttribute('NORMAL', makeAccessor(doc, buffer, 'VEC3', new Float32Array(geometry.normals)));
  primitive.setAttribute('TEXCOORD_0', makeAccessor(doc, buffer, 'VEC2', new Float32Array(geometry.uv)));
  primitive.setAttribute('JOINTS_0', makeAccessor(doc, buffer, 'VEC4', new Uint16Array(geometry.joints0)));
  primitive.setAttribute('WEIGHTS_0', makeAccessor(doc, buffer, 'VEC4', new Float32Array(geometry.weights0)));
  primitive.setIndices(makeAccessor(doc, buffer, 'SCALAR', new Uint16Array(geometry.indices)));
  primitive.setMaterial(material);
  mesh.addPrimitive(primitive);
  const node = doc.createNode(name).setMesh(mesh).setSkin(skin);
  scene.addChild(node);
}

function addOutfit(doc, scene, buffer, skin, style, model) {
  const family = fabricFamily(style), { fabrics, reflective, dark } = createMaterials(doc);
  const cloth = fabrics.get(family);
  const lowerIsWrap = /ankara|yoruba|performance|adire-apron/.test(style);
  const apron = /apron/.test(style);
  const safety = /sanitation|high-vis|hardhat|courier|responder|workwear/.test(style);
  const shirt = buildTubeY({ rings: [
    { y: 0.030, rx: 0.031, rz: 0.034, joint: 6 },
    { y: 0.038, rx: 0.034, rz: 0.043, joint: 6 },
    { y: 0.061, rx: 0.034, rz: 0.043, joint: 6 },
    { y: 0.077, rx: 0.028, rz: 0.035, joint: 6 }
  ] });
  addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Shirt', shirt, cloth);
  addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Sleeve L', buildSleeve(-1), cloth);
  addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Sleeve R', buildSleeve(1), cloth);
  if (lowerIsWrap) {
    const wrapper = buildTubeY({ rings: [
      { y: 0.015, rx: 0.031, rz: 0.032, joint: 6 },
      { y: 0.021, rx: 0.034, rz: 0.034, joint: 6 },
      { y: 0.044, rx: 0.037, rz: 0.038, joint: 6 }
    ] });
    addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Wrapper', wrapper, cloth);
  } else {
    for (const side of [-1, 1]) {
      const upper = side > 0 ? 2 : 4, lower = side > 0 ? 3 : 5;
      const leg = buildTubeY({ centerX: side * 0.014, centerZ: -0.003, rings: [
        { y: 0.002, rx: 0.013, rz: 0.026, joint: 6 },
        { y: 0.018, rx: 0.014, rz: 0.028, joint: 6 },
        { y: 0.040, rx: 0.014, rz: 0.027, joint: 6 }
      ] });
      addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + (side > 0 ? ' Trouser R' : ' Trouser L'), leg, family === 'sanitation' ? dark : cloth);
    }
  }
  if (apron) addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Apron', buildApron(), cloth);
  if (safety) {
    for (const y of [0.041, 0.066]) {
      const band = buildTubeY({ rings: [
        { y, rx: 0.036, rz: 0.046, joint: 6 },
        { y: y + 0.003, rx: 0.036, rz: 0.046, joint: 6 }
      ], segments: 24 });
      addGarment(doc, scene, buffer, skin, 'NaijaCity Outfit ' + style + ' Reflective Band', band, reflective);
    }
  }
  return { style, family, garments: doc.getRoot().listNodes().filter(node => node.getName().startsWith('NaijaCity Outfit')).length };
}

function detachSkinnedMeshFromTransformedParent(doc, label) {
  const root = doc.getRoot(), scene = root.listScenes()[0];
  const skinnedNodes = root.listNodes().filter(node => node.getSkin());
  if (skinnedNodes.length !== 1) throw new Error(label + ': expected one skinned base mesh node, found ' + skinnedNodes.length);
  const node = skinnedNodes[0], parent = node.getParentNode();
  if (!parent) throw new Error(label + ': source mesh is unexpectedly parentless.');
  // Khronos requires skinned mesh nodes to be scene roots without local TRS.
  // Keep the source skeleton hierarchy untouched: PlayCanvas resolves its
  // animation tracks through those node paths, so only detach the mesh node.
  parent.removeChild(node);
  scene.addChild(node);
  node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  return node.getSkin();
}

await fs.mkdir(OUTPUT_ROOT, { recursive: true });
const manifest = [];
for (const pack of PACKS) {
  const sourceDir = path.join(SOURCE_ROOT, pack);
  const files = (await fs.readdir(sourceDir)).filter(file => file.toLowerCase().endsWith('.glb')).sort();
  if (files.length !== 8) throw new Error(pack + ': expected 8 GLB characters, found ' + files.length);
  const outputDir = path.join(OUTPUT_ROOT, pack);
  await fs.mkdir(outputDir, { recursive: true });
  for (const file of files) {
    const source = path.join(sourceDir, file), model = path.parse(file).name;
    const output = path.join(outputDir, slug(model) + '.glb');
    const inputBytes = (await fs.stat(source)).size;
    const doc = await io.read(source), before = inspect(doc);
    const skin = detachSkinnedMeshFromTransformedParent(doc, pack + '/' + file);
    const style = NPC_DEFINITIONS.find(actor => actor.pack === pack && actor.model.toLowerCase() === model.toLowerCase())?.outfitStyle || 'casual';
    const scene = doc.getRoot().listScenes()[0], buffer = doc.getRoot().listBuffers()[0];
    const outfit = addOutfit(doc, scene, buffer, skin, style, model);
    await doc.transform(dedup(), prune(), resample());
    const binary = await io.writeBinary(doc);
    if (binary.byteLength < 20 || binary[0] !== 0x67 || binary[1] !== 0x6c || binary[2] !== 0x54 || binary[3] !== 0x46) {
      throw new Error(pack + '/' + file + ': transform did not produce a valid GLB header.');
    }
    const khronos = await validator.validateBytes(new Uint8Array(binary), { uri: slug(model) + '.glb' });
    if (khronos.issues.numErrors || khronos.issues.numWarnings) {
      const messages = khronos.issues.messages.filter(item => item.severity <= 1);
      throw new Error(pack + '/' + file + ': Khronos validation failed: ' + JSON.stringify(messages.slice(0, 8)));
    }
    await fs.writeFile(output, binary);
    const verified = await io.read(output), after = inspect(verified);
    assertCompatible(after, pack + '/' + file + ' (processed)');
    if (JSON.stringify(before.animations) !== JSON.stringify(after.animations)) throw new Error(pack + '/' + file + ': animation clip names changed.');
    if (JSON.stringify(before.joints) !== JSON.stringify(after.joints)) throw new Error(pack + '/' + file + ': skeleton joint counts changed.');
    if (after.clothingNodes < 3 || after.clothingNodes !== outfit.garments) throw new Error(pack + '/' + file + ': fitted garment meshes missing after processing.');
    if (after.textures < 2 || after.materials < 2 || after.meshes < before.meshes + 3) throw new Error(pack + '/' + file + ': garment materials/textures/meshes were not retained.');
    const outputBytes = binary.byteLength;
    manifest.push({ pack, character: model, slug: slug(model), outfitStyle: style, fabricFamily: outfit.family,
      garmentMeshCount: after.clothingNodes, source: path.relative(LIBRARY_ROOT, source),
      url: 'assets/npcs/gobkit-cc0/roster/' + pack + '/' + slug(model) + '.glb',
      license: 'CC0-1.0', inputBytes, outputBytes, savingsBytes: inputBytes - outputBytes,
      skins: after.skins, joints: after.joints, clips: after.animations,
      materials: after.materials, textures: after.textures, meshes: after.meshes, primitives: after.primitives,
      khronosErrors: khronos.issues.numErrors, khronosWarnings: khronos.issues.numWarnings });
    console.log(pack + '/' + model + ': ' + (inputBytes / 1024).toFixed(0) + 'KB -> ' + (outputBytes / 1024).toFixed(0) + 'KB; ' + after.clothingNodes + ' fitted garment meshes; ' + after.animations.length + ' clips; Khronos clean.');
  }
}
if (manifest.length !== 64) throw new Error('Expected 64 unique characters, produced ' + manifest.length + '.');
const report = { schemaVersion: 2, generatedAt: new Date().toISOString(),
  pipeline: 'glTF Transform Node SDK: fitted skinned clothing geometry, embedded procedural fabric textures, skin-node normalization, dedup, prune, resample, Khronos validation',
  source: 'Gobkit CC0 civilian character packs', license: 'CC0-1.0', count: manifest.length,
  totalInputBytes: manifest.reduce((sum, item) => sum + item.inputBytes, 0),
  totalOutputBytes: manifest.reduce((sum, item) => sum + item.outputBytes, 0),
  totalGarmentMeshes: manifest.reduce((sum, item) => sum + item.garmentMeshCount, 0),
  khronosErrors: manifest.reduce((sum, item) => sum + item.khronosErrors, 0),
  khronosWarnings: manifest.reduce((sum, item) => sum + item.khronosWarnings, 0), characters: manifest };
await fs.writeFile(path.join(OUTPUT_ROOT, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(path.join(OUTPUT_ROOT, 'README.md'), [
  '# Naija City civilian character roster', '',
  '64 unique skinned and animated Gobkit CC0 characters with fitted, skinned Nigerian-context clothing geometry.', '',
  '- Source licence: CC0 1.0 (pack licence files retained in the asset staging library).',
  '- Processing: fitted shirt/sleeve meshes, trousers or wrapper meshes, role-specific aprons and safety trim; embedded procedural Adire/Ankara-inspired and workwear fabric textures.',
  '- Rigging: clothing geometry is bound to each character’s shared 13-joint skin; base skinned mesh nodes normalized to scene roots.',
  '- Validation: every output passed Khronos glTF Validator with zero errors and zero warnings; animation names and joint counts preserved.',
  '- Streaming: game loads the active district roster and unloads the previous district when leaving it.', '',
  'See manifest.json for per-character outfit style, garment mesh count, source, animation and byte-size records.', ''
].join('\n'));
console.log('\nProcessed ' + manifest.length + ' unique characters with ' + report.totalGarmentMeshes + ' garment meshes: ' + (report.totalInputBytes / 1048576).toFixed(2) + ' MiB source -> ' + (report.totalOutputBytes / 1048576).toFixed(2) + ' MiB. Khronos validation: ' + report.khronosErrors + ' errors, ' + report.khronosWarnings + ' warnings.');
