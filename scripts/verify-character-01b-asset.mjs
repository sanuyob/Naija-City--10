import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node scripts/verify-character-01b-asset.mjs <path-to-hero.glb>');
const filePath = path.resolve(filename);
const bytes = await readFile(filePath);
assert.ok(bytes.length >= 20, 'GLB is too small to contain a valid header');
assert.equal(bytes.toString('ascii', 0, 4), 'glTF', 'Missing GLB magic');
assert.equal(bytes.readUInt32LE(4), 2, 'Expected GLB version 2');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB declared length differs from actual file size');

const jsonLength = bytes.readUInt32LE(12);
assert.equal(bytes.readUInt32LE(16), 0x4E4F534A, 'First GLB chunk must be JSON');
const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).replace(/\u0000+$/g, '').trim());
assert.equal(document.asset?.version, '2.0', 'Expected glTF 2.0 document');

const report = await validator.validateBytes(new Uint8Array(bytes), {
  uri: path.basename(filename),
  format: 'glb',
  writeTimestamp: false,
  maxIssues: 200
});
assert.equal(report.issues?.numErrors || 0, 0, 'Khronos glTF Validator reported errors');

const nodes = document.nodes || [];
const meshes = document.meshes || [];
const skins = document.skins || [];
const materials = document.materials || [];
const textures = document.textures || [];
const images = document.images || [];
const primitives = meshes.flatMap(mesh => mesh.primitives || []);
const drawCalls = primitives.length;
const triangles = primitives.reduce((sum, primitive) => {
  if (primitive.mode !== undefined && primitive.mode !== 4) return sum;
  const indexAccessor = primitive.indices === undefined ? null : document.accessors?.[primitive.indices];
  const positionAccessor = document.accessors?.[primitive.attributes?.POSITION];
  const count = indexAccessor?.count ?? positionAccessor?.count ?? 0;
  return sum + Math.floor(count / 3);
}, 0);
const nodeNames = new Set(nodes.map(node => node.name).filter(Boolean));
const skinJointNames = new Set(
  skins.flatMap(skin => skin.joints || []).map(index => nodes[index]?.name).filter(Boolean)
);
const normalizedNames = new Set([...nodeNames, ...skinJointNames].map(name => name.split(':').at(-1)));

const requiredBones = [
  'Hips','Spine','Spine1','Spine2','Neck','Head',
  'LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand'
];
const missingBones = requiredBones.filter(name => !normalizedNames.has(name));
assert.ok(meshes.length > 0, 'No mesh resources found');
assert.ok(skins.length > 0, 'No skinned armature found');
assert.ok((skins[0].joints || []).length >= 30, 'Skin has fewer than 30 joints; expected a full-body humanoid hand/finger rig');
assert.deepEqual(missingBones, [], 'Missing required humanoid bones: ' + missingBones.join(', '));
assert.ok(primitives.some(primitive =>
  primitive.attributes?.JOINTS_0 !== undefined && primitive.attributes?.WEIGHTS_0 !== undefined
), 'No mesh primitive includes joint and weight attributes');
assert.ok(materials.length >= 4, 'Expected skin/clothing/material families; got ' + materials.length);
assert.ok(drawCalls <= 2048, 'Draw calls ' + drawCalls + ' exceed 2048');
assert.ok(triangles <= 250000, 'Triangles ' + triangles + ' exceed 250000');
assert.ok(bytes.length <= 16 * 1024 * 1024, 'GLB ' + bytes.length + ' bytes exceeds 16 MiB');
const externalImages = images.filter(image => image.uri && !image.uri.startsWith('data:'));
assert.deepEqual(externalImages, [], 'GLB must embed its image resources; external image URI found');
assert.equal((document.animations || []).length, 0, 'Stage 01B should contain a rigged static hero, not an incomplete animation library');

const result = {
  file: filePath,
  bytes: bytes.length,
  meshes: meshes.length,
  primitives: drawCalls,
  triangles,
  skins: skins.length,
  joints: skins[0].joints.length,
  materials: materials.length,
  textures: textures.length,
  images: images.length,
  animations: (document.animations || []).length,
  validatorErrors: report.issues?.numErrors || 0,
  validatorWarnings: report.issues?.numWarnings || 0,
  requiredBones: requiredBones.length,
  passed: true
};
console.log(JSON.stringify(result, null, 2));
