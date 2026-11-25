import { access, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = process.cwd();
const base = resolve(root, 'public/assets/yaba-street-library/grab3d');
const manifest = JSON.parse(await readFile(join(base, 'manifest.json'), 'utf8'));
const failures = [];
const checked = [];

async function checkFile(relative, label, glb = false) {
  const file = resolve(base, relative);
  try {
    await access(file);
    if (glb) {
      const bytes = await readFile(file);
      if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF') {
        throw new Error('GLB magic/header is missing');
      }
      const declaredLength = bytes.readUInt32LE(8);
      if (declaredLength !== bytes.length) {
        throw new Error(`GLB header length ${declaredLength} does not match file length ${bytes.length}`);
      }
    }
    checked.push(label);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

for (const asset of manifest.assets ?? []) {
  await checkFile(asset.original, `${asset.id} original`, true);
  await checkFile(asset.mobile, `${asset.id} mobile`, true);
  if (asset.mobileLite) await checkFile(asset.mobileLite, `${asset.id} mobile-lite`, true);
  await checkFile(asset.licenseFile, `${asset.id} licence`);
  if (asset.alternateOriginal) await checkFile(asset.alternateOriginal, `${asset.id} alternate original`, true);
}
for (const asset of manifest.customAssets ?? []) {
  await checkFile(asset.path, `${asset.id} custom`, true);
  if (asset.mobilePath) await checkFile(asset.mobilePath, `${asset.id} mobile custom`, true);
}
for (const texture of manifest.signageTextures ?? []) {
  const file = resolve(base, texture.path);
  try {
    await access(file);
    const header = await readFile(file);
    if (header.length < 24 || header.readUInt32BE(16) !== 1024 || header.readUInt32BE(20) !== 512) {
      throw new Error('Expected 1024×512 PNG texture');
    }
    checked.push(`${texture.id} signage texture`);
  } catch (error) {
    failures.push(`${texture.id} signage texture: ${error.message}`);
  }
}

console.log(`Yaba street library: ${manifest.assets.length} downloaded models, ${manifest.customAssets.length} custom 3D assets, ${manifest.signageTextures.length} signage textures.`);
console.log(`Checked ${checked.length} files.`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PASS: all referenced originals, mobile copies, licence files, custom GLBs and PNG textures exist and have valid file headers.');
