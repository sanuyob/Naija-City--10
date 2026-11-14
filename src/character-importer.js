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

/**
 * Ara's walk/run takes carry horizontal root drift. Remove only the linear
 * X/Z displacement over each clip, retaining the small cyclic pelvis sway and
 * vertical bob. The game controller owns world translation.
 */
function stripRootMotion(animations) {
  let adjustedTracks = 0;
  for (const clip of animations) {
    for (const track of clip.tracks || []) {
      if (!/position$/i.test(track.name || '') || !/(root|hips|pelvis)/i.test(track.name || '')) continue;
      const values = track.values;
      const size = track.getValueSize?.() || 3;
      if (!values || size !== 3 || values.length < 6 || values.length % 3 !== 0) continue;
      const last = values.length - 3;
      const driftX = values[last] - values[0];
      const driftZ = values[last + 2] - values[2];
      if (Math.hypot(driftX, driftZ) < 0.025) continue;
      const frames = values.length / 3 - 1;
      for (let i = 0; i <= frames; i++) {
        const t = frames ? i / frames : 0;
        values[i * 3] -= driftX * t;
        values[i * 3 + 2] -= driftZ * t;
      }
      adjustedTracks++;
    }
  }
  return adjustedTracks;
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

function addTraversalAnimationClips(THREE, model) {
  const byName = new Map();
  model.traverse(node => {
    if (node.isBone) byName.set(String(node.name).toLowerCase().replace(/[^a-z]/g, ''), node);
  });
  const pick = (...names) => {
    for (const name of names) {
      for (const [key, node] of byName) if (key === name || key.endsWith(name)) return node;
    }
    return null;
  };
  const bones = {
    spine: pick('spine2','spine1','spine','chest'),
    leftArm: pick('leftarm','larm'), rightArm: pick('rightarm','rarm'),
    leftForeArm: pick('leftforearm','leftlowerarm'), rightForeArm: pick('rightforearm','rightlowerarm'),
    leftUpLeg: pick('leftupleg','leftthigh'), rightUpLeg: pick('rightupleg','rightthigh'),
    leftLeg: pick('leftleg','leftcalf','leftlowerleg'), rightLeg: pick('rightleg','rightcalf','rightlowerleg')
  };
  const neutral = {};
  const pose = (spine=0, arm=0, hip=0, knee=0, twist=0) => ({
    spine:[spine,0,twist], leftArm:[arm,0,-12], rightArm:[arm,0,12],
    leftUpLeg:[hip,0,0], rightUpLeg:[hip,0,0], leftLeg:[knee,0,0], rightLeg:[knee,0,0]
  });
  const defs = {
    Hero01_Jump:[.82,[pose(-8,-42,-28,42),pose(-12,-78,-48,68),pose(-5,-28,-18,28),pose()]],
    Hero01_Landing:[.62,[pose(8,-28,-42,58),pose(16,-18,-58,72),pose(4,-8,-16,22),pose()]],
    Hero01_StepUp:[.72,[{...pose(-6,-24,-32,44),rightUpLeg:[8,0,0]},{...pose(-12,-46,-48,58),rightUpLeg:[-18,0,0]},{...pose(-4,-18,-12,20),rightUpLeg:[-30,0,0]},pose()]],
    Hero01_VaultLow:[.94,[pose(-16,-62,-34,44),pose(-24,-98,-52,68),pose(-10,-48,-22,32),pose()]],
    Hero01_VaultHigh:[1.08,[pose(-20,-74,-44,54),pose(-28,-112,-66,78),pose(-12,-58,-28,38),pose()]],
    Hero01_Mantle:[1.22,[pose(-18,-92,-30,38),pose(-30,-132,-42,52),pose(-12,-68,-22,28),pose()]],
    Hero01_LedgeHang:[.92,[pose(-8,-132,-18,28),pose(-10,-148,-26,38),pose(-8,-132,-18,28),pose(-8,-132,-18,28)]],
    Hero01_LedgeShimmyLeft:[.74,[{...pose(0,-142,-16,24),spine:[0,0,-8]},{...pose(0,-154,-24,34),spine:[0,0,-14]},{...pose(0,-132,-18,28),spine:[0,0,-4]},pose(-8,-132,-18,28)]],
    Hero01_LedgePullUp:[1.12,[pose(-10,-148,-24,36),pose(-28,-116,-46,56),pose(-12,-56,-26,30),pose()]],
    Hero01_LadderMount:[.62,[{...pose(-8,-110,-28,34),rightArm:[-70,0,18]},{...pose(-10,-142,-34,42),rightArm:[-92,0,18]},{...pose(-8,-100,12,0),rightArm:[-132,0,16]},pose()]],
    Hero01_LadderClimb:[1.05,[{...pose(-8,-140,-34,52),rightArm:[-92,0,18],rightUpLeg:[18,0,0],rightLeg:[-12,0,0]},{...pose(-8,-92,18,-12),rightArm:[-140,0,18],leftUpLeg:[18,0,0],leftLeg:[-12,0,0]},{...pose(-8,-140,-34,52),rightArm:[-92,0,18],rightUpLeg:[18,0,0],rightLeg:[-12,0,0]},pose()]],
    Hero01_LadderDismount:[.64,[pose(-8,-120,-24,0),pose(8,-52,-38,48),pose(0,-8,0,0),pose()]],
    Hero01_WallHop:[.88,[{...pose(-10,-76,-42,48),spine:[-10,0,-14]},{...pose(-18,-104,-58,62),spine:[-18,0,-22]},{...pose(-4,-38,-12,18),spine:[-4,0,-8]},pose()]],
    Hero01_DropDown:[.68,[pose(12,-34,-24,32),pose(8,-50,-32,42),pose(2,-18,-10,18),pose()]],
    Hero01_Crouch:[.9,[pose(16,-18,-52,68),pose(16,-18,-52,68),pose(16,-18,-52,68),pose(16,-18,-52,68)]],
    Hero01_CrouchWalk:[.9,[{...pose(14,-22,-46,60),rightUpLeg:[-12,0,0],rightLeg:[22,0,0]},{...pose(14,-14,-12,22),leftUpLeg:[-12,0,0],leftLeg:[22,0,0]},pose(14,-22,-46,60),pose(14,-22,-46,60)]]
  };
  const generated = [];
  for (const [name, [duration, frames]] of Object.entries(defs)) {
    const times = frames.map((_, i) => duration * i / (frames.length - 1));
    const tracks = [];
    for (const [role, bone] of Object.entries(bones)) {
      if (!bone) continue;
      const base = bone.quaternion.clone();
      const values = [];
      for (const frame of frames) {
        const a = frame[role] || [0,0,0];
        const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
          THREE.MathUtils.degToRad(a[0]), THREE.MathUtils.degToRad(a[1]),
          THREE.MathUtils.degToRad(a[2]), 'XYZ'
        ));
        const q = base.clone().multiply(delta);
        values.push(q.x,q.y,q.z,q.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', times, values));
    }
    if (tracks.length) generated.push(new THREE.AnimationClip(name, duration, tracks));
  }
  model.animations = [...(model.animations || []), ...generated];
  return { generatedClipNames: generated.map(clip => clip.name), semanticBoneCount: Object.values(bones).filter(Boolean).length };
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
  const rootMotionTracksAdjusted = stripRootMotion(model.animations);
  const traversalAnimations = addTraversalAnimationClips(THREE, model);
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
    rootMotionTracksAdjusted,
    generatedTraversalClips: traversalAnimations.generatedClipNames,
    semanticBoneCount: traversalAnimations.semanticBoneCount,
    locomotionCycles: { walkSeconds: 1.067, runSeconds: 0.733 },
    converter: 'Three.js FBXLoader / GLTFExporter ' + THREE_VERSION,
    textureLimit: 512
  };
  await savePlayerCharacter(output, metadata);
  return metadata;
}
