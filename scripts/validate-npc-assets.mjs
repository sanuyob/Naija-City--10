import fs from 'node:fs/promises';
import path from 'node:path';
import validator from 'gltf-validator';
import { NodeIO } from '@gltf-transform/core';

const root = path.resolve('public/assets/npcs/gobkit-cc0/roster');
const io = new NodeIO();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.count !== 64 || manifest.characters?.length !== 64) throw new Error('Expected a 64-character processing manifest.');
const files = manifest.characters.map(item => path.resolve(item.url.replace(/^assets\//, 'public/assets/')));
if (new Set(files).size !== 64) throw new Error('Manifest contains duplicate model paths.');
let errors = 0, warnings = 0, clips = 0, joints = 0, bytes = 0, garmentMeshes = 0;
const failures = [];
for (let index = 0; index < files.length; index++) {
  const file = files[index], record = manifest.characters[index];
  const buffer = await fs.readFile(file);
  bytes += buffer.byteLength;
  const result = await validator.validateBytes(new Uint8Array(buffer), { uri: path.basename(file) });
  errors += result.issues.numErrors;
  warnings += result.issues.numWarnings;
  if (result.issues.numErrors || result.issues.numWarnings) failures.push({ file, errors: result.issues.numErrors, warnings: result.issues.numWarnings, messages: result.issues.messages.filter(item => item.severity <= 1).slice(0, 4) });
  const doc = await io.read(file), info = doc.getRoot(), skins = info.listSkins();
  const animationNames = info.listAnimations().map(animation => animation.getName());
  const clothingNodes = info.listNodes().filter(node => node.getName().startsWith('NaijaCity Outfit'));
  const badSkinParents = info.listNodes().filter(node => node.getSkin() && node.getParentNode());
  if (skins.length !== 1 || skins[0].listJoints().length !== 13 || !animationNames.some(name => /^idle$/i.test(name)) ||
      !info.listTextures().length || !info.listMaterials().length || clothingNodes.length < 3 || badSkinParents.length) {
    throw new Error('Processed model structure mismatch: ' + file + JSON.stringify({ skins: skins.length, joints: skins[0]?.listJoints().length, clips: animationNames.length, textures: info.listTextures().length, garments: clothingNodes.length, badSkinParents: badSkinParents.length }));
  }
  if (record.garmentMeshCount !== clothingNodes.length || !record.outfitStyle || !record.fabricFamily) throw new Error('Manifest clothing metadata mismatch: ' + file);
  garmentMeshes += clothingNodes.length;
  clips += animationNames.length;
  joints += skins[0].listJoints().length;
}
console.log(JSON.stringify({ files: files.length, errors, warnings, garmentMeshes, averageGarmentsPerModel: Number((garmentMeshes / files.length).toFixed(2)), averageClips: Number((clips / files.length).toFixed(2)), averageJointsPerModel: Number((joints / files.length).toFixed(2)), manifestBytes: manifest.totalOutputBytes, measuredMiB: Number((bytes / 1048576).toFixed(2)), failures }, null, 2));
if (errors || warnings) process.exitCode = 1;
