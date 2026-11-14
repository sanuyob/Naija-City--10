import { savePlayerCharacter } from './player-character-store.js';

const THREE_VERSION = '0.179.1';
const THREE_BASE = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VERSION + '/';
let threeModulesPromise;

async function getThreeModules() {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import(THREE_BASE + 'build/three.module.js'),
      import(THREE_BASE + 'examples/jsm/loaders/FBXLoader.js'),
      import(THREE_BASE + 'examples/jsm/exporters/GLTFExporter.js')
    ]).then(([THREE, loaderModule, exporterModule]) => ({
      THREE,
      FBXLoader: loaderModule.FBXLoader,
      GLTFExporter: exporterModule.GLTFExporter
    })).catch(error => {
      threeModulesPromise = null;
      throw new Error('The FBX conversion tools could not load. Check your internet connection. ' + error.message);
    });
  }
  return threeModulesPromise;
}

function isGlb(buffer) {
  const bytes = new Uint8Array(buffer);
  return bytes.length >= 20 && bytes[0] === 0x67 && bytes[1] === 0x6c &&
    bytes[2] === 0x54 && bytes[3] === 0x46;
}

function inspectRig(root) {
  let bones = 0;
  let skinnedMeshes = 0;
  root.traverse(object => {
    if (object.isBone) bones++;
    if (object.isSkinnedMesh) skinnedMeshes++;
  });
  return { bones, skinnedMeshes };
}

function exportGlb(exporter, root, animations) {
  return new Promise((resolve, reject) => {
    exporter.parse(root, result => {
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('The converter did not produce a binary GLB.'));
        return;
      }
      resolve(result);
    }, error => reject(error instanceof Error ? error : new Error(String(error))), {
      binary: true,
      animations,
      onlyVisible: true,
      maxTextureSize: 512,
      trs: false
    });
  });
}

/** Converts a user-supplied rigged FBX to a mobile-sized GLB in the browser. */
export async function importPlayerCharacter(file, onProgress = () => {}) {
  if (!file || !file.name) throw new Error('Choose the Ara FBX file first.');
  if (!/\.fbx$/i.test(file.name)) throw new Error('This character importer accepts FBX files.');
  if (file.size > 40 * 1024 * 1024) throw new Error('This FBX exceeds the 40 MB mobile import limit.');

  onProgress('Reading Ara character…');
  const input = await file.arrayBuffer();
  if (input.byteLength < 1024) throw new Error('The FBX file is too small to be a valid character.');

  onProgress('Loading the FBX conversion tools…');
  const { THREE, FBXLoader, GLTFExporter } = await getThreeModules();

  onProgress('Reading mesh, skeleton, textures and animations…');
  const model = new FBXLoader().parse(input, '');
  model.animations = Array.isArray(model.animations) ? model.animations : [];
  const rig = inspectRig(model);
  if (!rig.skinnedMeshes || rig.bones < 3) {
    throw new Error('This FBX does not contain a usable skinned character rig.');
  }
  if (!model.animations.length) {
    throw new Error('This FBX contains no animation takes.');
  }

  model.updateMatrixWorld(true);
  const originalBounds = new THREE.Box3().setFromObject(model);
  const originalHeight = originalBounds.max.y - originalBounds.min.y;
  if (!Number.isFinite(originalHeight) || originalHeight < 0.5 || originalHeight > 5) {
    throw new Error('The character height could not be normalized safely.');
  }

  // Normalize the visible body to 1.8 m. Ara's exported FBX faces +Z;
  // Naija City's third-person controller faces -Z.
  model.scale.multiplyScalar(1.8 / originalHeight);
  model.rotation.y += Math.PI;
  model.updateMatrixWorld(true);
  const normalizedBounds = new THREE.Box3().setFromObject(model);
  model.position.y -= normalizedBounds.min.y;
  model.updateMatrixWorld(true);

  const animationNames = model.animations.map((clip, index) => {
    if (!clip.name) clip.name = 'Ara_Animation_' + (index + 1);
    return clip.name;
  });

  onProgress('Compressing character textures and writing GLB…');
  const output = await exportGlb(new GLTFExporter(), model, model.animations);
  if (!isGlb(output)) throw new Error('The exported file failed its GLB header check.');

  const metadata = {
    source: 'Ara 3D Gen · user-supplied FBX',
    sourceFileName: file.name,
    sourceBytes: file.size,
    format: 'GLB',
    glbBytes: output.byteLength,
    normalizedHeightMeters: 1.8,
    boneCount: rig.bones,
    skinnedMeshCount: rig.skinnedMeshes,
    animationNames,
    converter: 'Three.js FBXLoader / GLTFExporter ' + THREE_VERSION,
    textureLimit: 512
  };
  await savePlayerCharacter(output, metadata);
  return metadata;
}
