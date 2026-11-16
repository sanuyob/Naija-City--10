import * as pc from 'playcanvas';
import { loadSavedPlayerCharacter } from './player-character-store.js';

const base = import.meta.env.BASE_URL || '/';
const resolveAssetUrl = value => new URL(String(value).replace(/^\//, ''), new URL(base, window.location.origin)).href;

// Ara's source preset has no crouch take. Build two compact skeletal clips
// against her existing Mixamo-style rig; the game still owns root translation.
function createAraCrouchTracks(root) {
  const bones = new Map();
  for (const render of root.findComponents('render')) {
    for (const meshInstance of render.meshInstances || []) {
      for (const bone of meshInstance.skinInstance?.bones || []) {
        if (bone?.name) bones.set(bone.name.toLowerCase().replace(/[^a-z0-9]/g, ''), bone);
      }
    }
  }
  const pick = (...names) => {
    for (const name of names) {
      const target = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, bone] of bones) if (key === target || key.endsWith(target)) return bone;
    }
    return null;
  };
  const roles = { hips: pick('Hips','Pelvis'), spine: pick('Spine2','Chest','Spine') };
  const pathFor = node => {
    const path = []; let current = node;
    while (current && current !== root) { path.unshift(current.name); current = current.parent; }
    return current === root && path.length ? path : null;
  };
  const times = [0, .25, .5, .75, 1];
  const duration = .96;
  const makeTrack = (name, walking) => {
    const input = new pc.AnimData(1, new Float32Array(times.map(t => t * duration)));
    const outputs = [], curves = [];
    const addCurve = (bone, property, components, frames) => {
      if (!bone) return;
      const path = pathFor(bone); if (!path) return;
      const data = [];
      if (property === 'localRotation') {
        const baseRotation = bone.getLocalRotation().clone();
        for (const angles of frames) {
          const delta = new pc.Quat().setFromEulerAngles(angles[0], angles[1], angles[2]);
          const rotation = baseRotation.clone().mul(delta);
          data.push(rotation.x, rotation.y, rotation.z, rotation.w);
        }
      } else {
        const basePosition = bone.getLocalPosition();
        for (const offset of frames) data.push(basePosition.x, basePosition.y + offset, basePosition.z);
      }
      const outputIndex = outputs.length;
      outputs.push(new pc.AnimData(components, new Float32Array(data)));
      curves.push(new pc.AnimCurve([{ entityPath: path, component: 'graph', propertyPath: [property] }], 0, outputIndex, pc.INTERPOLATION_LINEAR));
    };
    const phases = times.map(t => t * Math.PI * 2);
    // The source rig's bind pose already carries strong leg orientation.
    // Large extra thigh, knee and torso rotations collapsed its silhouette.
    const spine = times.map(() => walking ? [2.5, 0, 0] : [3.5, 0, 0]);
    addCurve(roles.hips, 'localPosition', 3,
      times.map(t => walking ? -.055 - .008 * Math.sin(t * Math.PI * 2) : -.07));
    addCurve(roles.spine, 'localRotation', 4, spine);
    if (!curves.length) throw new Error('Ara crouch animation could not bind to the character skeleton.');
    return new pc.AnimTrack(name, duration, [input], outputs, curves);
  };
  return [makeTrack('Ara_Crouch', false), makeTrack('Ara_CrouchWalk', true)];
}


// Ara's short door/vehicle interaction poses are local to her existing rig.
// Ladder mount, climb and dismount are authored and baked in Blender, then
// imported as ordinary GLB animation tracks (no runtime limb IK).
function createAraTraversalTracks(root) {
  const bones = new Map();
  for (const render of root.findComponents('render')) {
    for (const meshInstance of render.meshInstances || []) {
      for (const bone of meshInstance.skinInstance?.bones || []) {
        if (bone?.name) bones.set(bone.name.toLowerCase().replace(/[^a-z0-9]/g, ''), bone);
      }
    }
  }
  const pick = (...names) => {
    for (const name of names) {
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [candidate, bone] of bones) if (candidate === key || candidate.endsWith(key)) return bone;
    }
    return null;
  };
  const roles = {
    hips: pick('Hips'), spine: pick('Spine2','Chest','Spine'),
    leftUpperArm: pick('LeftArm','UpperArm_L'), rightUpperArm: pick('RightArm','UpperArm_R'),
    leftForeArm: pick('LeftForeArm','LowerArm_L'), rightForeArm: pick('RightForeArm','LowerArm_R'),
    leftThigh: pick('LeftUpLeg','Thigh_L'), rightThigh: pick('RightUpLeg','Thigh_R'),
    leftKnee: pick('LeftLeg','Shin_L'), rightKnee: pick('RightLeg','Shin_R')
  };
  const pathFor = node => {
    const path=[]; let current=node;
    while(current&&current!==root){path.unshift(current.name);current=current.parent;}
    return current===root&&path.length?path:null;
  };
  const times=[0,.25,.5,.75,1];
  const makeTrack=(name,duration,pose)=>{
    const input=new pc.AnimData(1,new Float32Array(times.map(t=>t*duration)));
    const outputs=[],curves=[];
    const addRotation=(bone,frames)=>{
      if(!bone||!frames)return;
      const path=pathFor(bone);if(!path)return;
      const base=bone.getLocalRotation().clone(),data=[];
      for(const angles of frames){
        const delta=new pc.Quat().setFromEulerAngles(angles[0],angles[1],angles[2]);
        const q=base.clone().mul(delta);data.push(q.x,q.y,q.z,q.w);
      }
      const index=outputs.length;outputs.push(new pc.AnimData(4,new Float32Array(data)));
      curves.push(new pc.AnimCurve([{entityPath:path,component:'graph',propertyPath:['localRotation']}],0,index,pc.INTERPOLATION_LINEAR));
    };
    const addPosition=(bone,frames)=>{
      if(!bone||!frames)return;
      const path=pathFor(bone);if(!path)return;
      const base=bone.getLocalPosition(),data=[];
      for(const offset of frames)data.push(base.x+offset[0],base.y+offset[1],base.z+offset[2]);
      const index=outputs.length;outputs.push(new pc.AnimData(3,new Float32Array(data)));
      curves.push(new pc.AnimCurve([{entityPath:path,component:'graph',propertyPath:['localPosition']}],0,index,pc.INTERPOLATION_LINEAR));
    };
    addPosition(roles.hips,pose.hips);
    addRotation(roles.spine,pose.spine);
    addRotation(roles.leftUpperArm,pose.leftUpperArm);
    addRotation(roles.rightUpperArm,pose.rightUpperArm);
    addRotation(roles.leftForeArm,pose.leftForeArm);
    addRotation(roles.rightForeArm,pose.rightForeArm);
    addRotation(roles.leftThigh,pose.leftThigh);
    addRotation(roles.rightThigh,pose.rightThigh);
    addRotation(roles.leftKnee,pose.leftKnee);
    addRotation(roles.rightKnee,pose.rightKnee);
    if(!curves.length)throw new Error('Ara ladder animation could not bind to the character skeleton.');
    return new pc.AnimTrack(name,duration,[input],outputs,curves);
  };
  return [
    makeTrack('Ara_DoorOpen',.56,{
      spine:[[0,0,0],[-3,0,0],[-5,0,0],[-3,0,0],[0,0,0]],
      rightUpperArm:[[0,0,0],[-10,0,-22],[-12,0,-34],[-7,0,-25],[0,0,0]],
      rightForeArm:[[0,0,0],[0,0,-24],[0,0,-46],[0,0,-25],[0,0,0]],
      leftUpperArm:[[0,0,0],[-3,0,8],[-4,0,10],[-2,0,5],[0,0,0]]
    }),
    makeTrack('Ara_EnterVehicle',.78,{
      hips:[[0,0,0],[0,-.04,.015],[0,-.13,.07],[0,-.08,.04],[0,0,0]],
      spine:[[0,0,0],[9,0,0],[17,0,0],[11,0,0],[0,0,0]],
      rightUpperArm:[[0,0,0],[-12,0,-18],[-16,0,-30],[-8,0,-14],[0,0,0]],
      leftUpperArm:[[0,0,0],[-8,0,13],[-12,0,22],[-5,0,10],[0,0,0]],
      rightForeArm:[[0,0,0],[0,0,-24],[0,0,-38],[0,0,-18],[0,0,0]],
      leftForeArm:[[0,0,0],[0,0,18],[0,0,32],[0,0,12],[0,0,0]],
      leftThigh:[[0,0,0],[12,0,0],[32,0,0],[24,0,0],[0,0,0]],
      rightThigh:[[0,0,0],[18,0,0],[46,0,0],[32,0,0],[0,0,0]],
      leftKnee:[[0,0,0],[18,0,0],[34,0,0],[24,0,0],[0,0,0]],
      rightKnee:[[0,0,0],[22,0,0],[48,0,0],[30,0,0],[0,0,0]]
    }),
    makeTrack('Ara_ExitVehicle',.72,{
      hips:[[0,0,0],[0,-.12,.06],[0,-.06,.02],[0,-.02,0],[0,0,0]],
      spine:[[0,0,0],[14,0,0],[10,0,0],[4,0,0],[0,0,0]],
      rightUpperArm:[[-5,0,-16],[-12,0,-28],[-10,0,-20],[-4,0,-8],[0,0,0]],
      leftUpperArm:[[-5,0,10],[-10,0,20],[-7,0,14],[-2,0,5],[0,0,0]],
      rightForeArm:[[0,0,-18],[0,0,-34],[0,0,-24],[0,0,-10],[0,0,0]],
      leftForeArm:[[0,0,16],[0,0,28],[0,0,18],[0,0,8],[0,0,0]],
      leftThigh:[[30,0,0],[22,0,0],[10,0,0],[4,0,0],[0,0,0]],
      rightThigh:[[42,0,0],[30,0,0],[14,0,0],[5,0,0],[0,0,0]],
      leftKnee:[[32,0,0],[24,0,0],[10,0,0],[2,0,0],[0,0,0]],
      rightKnee:[[46,0,0],[32,0,0],[14,0,0],[3,0,0],[0,0,0]]
    })
  ];
}

function loadAsset(app, name, type, url) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, type, { url: resolveAssetUrl(url) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(`${name} (${url}): ${error?.message || error || 'unknown load error'}`)));
    app.assets.load(asset);
  });
}

function applyTexture(entity, texture, mapName = 'diffuseMap') {
  const components = entity.findComponents('render');
  let applied = 0;
  for (const component of components) {
    for (const instance of component.meshInstances || []) {
      const material = instance.material;
      if (!material) continue;
      if (mapName === 'diffuseMap') {
        material.diffuseMap = texture;
        material.diffuse = new pc.Color(1, 1, 1);
      } else if (mapName === 'emissiveMap') {
        material.emissiveMap = texture;
        material.emissive = new pc.Color(1, 1, 1);
      } else {
        if (!(mapName in material)) throw new Error(`Unsupported texture slot "${mapName}".`);
        material[mapName] = texture;
      }
      material.update();
      applied++;
    }
  }
  if (!applied) throw new Error(`No compatible material slot "${mapName}" found on target model.`);
  return applied;
}

export async function loadSceneAssets(app, { statusLabel } = {}) {
  const report = { modelsLoaded: 0, texturesLoaded: 0, failures: [], modelNames: [], textureNames: [] };
  const setStatus = (message, state = 'loading') => {
    if (!statusLabel) return;
    statusLabel.textContent = message;
    statusLabel.dataset.state = state;
  };
  let manifest;
  try {
    const response = await fetch(new URL('assets/manifest.json', new URL(base, window.location.origin)), { cache: 'no-store' });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    const message = `Asset manifest failed: ${error.message}`;
    setStatus(message, 'error');
    report.failures.push(message);
    return report;
  }

  const models = Array.isArray(manifest.models) ? manifest.models : [];
  const textures = Array.isArray(manifest.textures) ? manifest.textures : [];
  const total = models.length + textures.length;
  if (!total) {
    setStatus('Assets: no external models configured; procedural scene active', 'ready');
    return report;
  }
  let completed = 0;
  const progress = name => {
    completed++;
    setStatus(`Loading assets ${completed}/${total} · ${Math.round(completed / total * 100)}% · ${name}`);
  };
  const modelEntities = new Map();

  for (const model of models) {
    try {
      const asset = await loadAsset(app, model.name, 'container', model.url);
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = model.name;
      const p = model.position || [0, 0, 0], s = model.scale || [1, 1, 1];
      entity.setLocalPosition(p[0], p[1], p[2]);
      entity.setLocalScale(s[0], s[1], s[2]);
      app.root.addChild(entity);
      modelEntities.set(model.name, entity);
      report.modelsLoaded++;
      report.modelNames.push(model.name);
      progress(model.name);
    } catch (error) {
      const message = `GLB load failed: ${error.message}`;
      report.failures.push(message);
      setStatus(message, 'error');
    }
  }

  for (const item of textures) {
    try {
      const asset = await loadAsset(app, item.name, 'texture', item.url);
      if (item.applyTo) {
        const target = modelEntities.get(item.applyTo);
        if (!target) throw new Error(`target model "${item.applyTo}" did not load`);
        applyTexture(target, asset.resource, item.map || 'diffuseMap');
      }
      report.texturesLoaded++;
      report.textureNames.push(item.name);
      progress(item.name);
    } catch (error) {
      const message = `Texture load failed: ${error.message}`;
      report.failures.push(message);
      setStatus(message, 'error');
    }
  }

  if (report.failures.length) setStatus(`Asset error: ${report.failures.join(' | ')}`, 'error');
  else setStatus(`Assets: ${report.modelsLoaded} GLB + ${report.texturesLoaded} texture(s) loaded successfully`, 'ready');
  return report;
}


/**
 * Load Ara only from a validated conversion of the actual Ara 3D Gen FBX.
 * Hero 01 is loaded separately for the city NPC population.
 */
export async function loadHeroCharacter(app, {
  urls = ['assets/hero/NaijaCityHero01_60clips.glb.b64'],
  characterId = 'hero01',
  statusLabel,
  bundledUrl = null
} = {}) {
  if (!['hero01', 'ara-female'].includes(characterId)) {
    throw new Error('Unknown character in player roster: ' + characterId);
  }
  const setStatus = message => {
    if (statusLabel) statusLabel.textContent = message;
  };

  let blobUrl = null;
  let asset = null;
  let source = 'bundled-hero-01';
  let metadata = null;

  try {
    if (characterId === 'ara-female') {
      setStatus('Loading Ara 3D Gen female character…');
      if (bundledUrl) {
        const response = await fetch(resolveAssetUrl(bundledUrl), { cache: 'no-store' });
        if (!response.ok) throw new Error('Ara character GLB HTTP ' + response.status);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes.length < 20 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) throw new Error('Bundled Ara character is not a valid GLB.');
        metadata = { source: 'Ara 3D Gen · ready-made Female Executive preset', sourceFileName: 'Ara_Female_Executive_Animated_Ladder.glb', glbBytes: bytes.length };
        source = 'ara-3d-gen-female-preset';
        blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'model/gltf-binary' }));
      } else {
        const saved = await loadSavedPlayerCharacter('ara-female');
        if (!(saved?.buffer instanceof ArrayBuffer) || saved.buffer.byteLength <= 20) throw new Error('Ara 3D female character asset is missing.');
        source = 'ara-3d-gen-female'; metadata = saved.metadata || null;
        blobUrl = URL.createObjectURL(new Blob([saved.buffer], { type: 'model/gltf-binary' }));
      }
    } else {
      source = 'bundled-hero-01';
      setStatus('Loading Hero 01 character…');
      const responses = await Promise.all(urls.map(path => fetch(
        new URL(String(path).replace(/^\//, ''), new URL(base, window.location.origin)),
        { cache: 'no-store' }
      )));
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) throw new Error('Hero GLB payload part ' + (i + 1) + ' HTTP ' + responses[i].status);
      }
      const encoded = (await Promise.all(responses.map(response => response.text()))).join('').replace(/\s+/g, '');
      if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
        throw new Error('Bundled Hero GLB payload is incomplete or invalid');
      }
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length < 20 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) {
        throw new Error('Decoded Hero asset is not a GLB file');
      }
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
    }

    asset = new pc.Asset(
      characterId === 'ara-female' ? 'naija-city-ara-female' : 'naija-city-hero-01',
      'container',
      { url: blobUrl }
    );

    app.assets.add(asset);
    await new Promise((resolve, reject) => {
      asset.once('load', resolve);
      asset.once('error', error => reject(new Error('Character GLB load failed: ' + (error?.message || error || 'unknown error'))));
      app.assets.load(asset);
    });

    const animationAssets = asset.resource.animations || [];
    const clipNames = [];
    const clipDurations = {};
    for (const animation of animationAssets) {
      const track = animation?.resource || animation;
      const name = track?.name || animation?.name;
      if (!name || !track) continue;
      clipNames.push(name);
      clipDurations[name] = Number.isFinite(track.duration) ? track.duration : 1.9;
    }
    if (!clipNames.length) throw new Error('The character GLB has no playable animation clips.');
    if (characterId === 'ara-female') {
      clipNames.push('Ara_Crouch', 'Ara_CrouchWalk', 'Ara_DoorOpen', 'Ara_EnterVehicle', 'Ara_ExitVehicle');
      clipDurations.Ara_Crouch = .96;
      clipDurations.Ara_CrouchWalk = .96;
      clipDurations.Ara_DoorOpen = .56;
      clipDurations.Ara_EnterVehicle = .78;
      clipDurations.Ara_ExitVehicle = .72;
    }

    const findClip = patterns => clipNames.find(name => patterns.some(pattern => pattern.test(name)));
    const defaultClips = {
      idle: findClip([/^idle$/i, /idle/i, /stand/i]) || clipNames[0],
      walk: findClip([/^walk$/i, /walk/i]) || findClip([/jog/i]) || findClip([/run|sprint/i]) || clipNames[0],
      run: findClip([/^run$/i, /run|sprint/i]) || findClip([/jog/i]) || findClip([/walk/i]) || clipNames[0],
      jumpStart: findClip([/jump.*start|take.?off/i]) || findClip([/^jump$/i]) || null,
      jump: findClip([/jump.*in.?air|in.?air/i]) || findClip([/^jump$/i]) || findClip([/jump|leap/i]) || null,
      landing: findClip([/jump.*land|land(ing)?/i]) || findClip([/idle/i]) || null,
      vault: findClip([/vault/i]) || null,
      climb: findClip([/climb up ledge|ledge|mantle/i]) || findClip([/^climb$/i, /climb(?!.*ladder)/i]) || null,
      roll: findClip([/roll/i]) || null,
      dodgeLeft: findClip([/dodge.*left|left.*dodge/i]) || null,
      dodgeRight: findClip([/dodge.*right|right.*dodge/i]) || null,
      crouch: characterId === 'ara-female' ? 'Ara_Crouch' : (findClip([/crouch|duck/i]) || null),
      crouchWalk: characterId === 'ara-female' ? 'Ara_CrouchWalk' : (findClip([/crouch.*walk|duck.*walk/i]) || null)
    };
    // Locomotion and idle clips must loop when this rig is used for either
    // the player or a route-driven city NPC.
    const loopable = new Set(clipNames.filter(name =>
      /(?:^|_)(?:idle|walk|jog|run|sprint|crouch)(?:_|$)/i.test(name)
    ));
    // A long ladder route repeats a short rung cycle until the character reaches the roof.
    loopable.add('Hero01_LadderClimb');
    loopable.add('Ara_LadderClimb');
    for (const name of [defaultClips.idle, defaultClips.walk, defaultClips.run, defaultClips.crouch, defaultClips.crouchWalk]) {
      if (name) loopable.add(name);
    }

    function createAnimatedInstance(instanceName, tint = [1, 1, 1]) {
      const instanceRoot = asset.resource.instantiateRenderEntity();
      instanceRoot.name = instanceName;
      instanceRoot.addComponent('anim', { activate: true });
      if (!instanceRoot.anim) throw new Error('PlayCanvas did not create animation component for ' + instanceName);
      if (characterId === 'ara-female') {
        const customTracks = [...createAraCrouchTracks(instanceRoot), ...createAraTraversalTracks(instanceRoot)];
        const tracks = new Map();
        for (const animation of animationAssets) {
          const track = animation?.resource || animation;
          const name = track?.name || animation?.name;
          if (name && track) tracks.set(name, track);
        }
        for (const track of customTracks) tracks.set(track.name, track);
        const actionNames = [...tracks.keys()].filter(name =>
          ![defaultClips.idle, defaultClips.walk, defaultClips.run, defaultClips.crouch, defaultClips.crouchWalk].includes(name)
        );
        // Use separate locomotion states rather than blending Walk and Run.
        // Their source clips have different foot-contact phases and cycle
        // durations; mixing them made the stance feet drift even when each
        // clip's playback rate matched the physics velocity. State transitions
        // give us one gait authority at a time, with the fade kept short.
        const stateNames = [...new Set([
          defaultClips.idle, defaultClips.walk, defaultClips.run,
          defaultClips.crouch, defaultClips.crouchWalk, ...actionNames
        ].filter(Boolean))];
        const states = [
          { name: 'START' },
          ...stateNames.map(name => ({ name, loop: loopable.has(name) ||
            [defaultClips.idle, defaultClips.walk, defaultClips.run,
             defaultClips.crouch, defaultClips.crouchWalk].includes(name),
            ...(name === defaultClips.idle ? { defaultState: true } : {}) }))
        ];
        instanceRoot.anim.loadStateGraph({
          layers: [{ name: 'Base', states, transitions: [{ from: 'START', to: defaultClips.idle }] }],
          parameters: {}
        });
        const layer = instanceRoot.anim.baseLayer;
        layer.assignAnimation(defaultClips.idle, tracks.get(defaultClips.idle), 1, true);
        layer.assignAnimation(defaultClips.walk, tracks.get(defaultClips.walk), 1, true);
        layer.assignAnimation(defaultClips.run, tracks.get(defaultClips.run), 1, true);
        layer.assignAnimation(defaultClips.crouch, tracks.get(defaultClips.crouch), 1, true);
        layer.assignAnimation(defaultClips.crouchWalk, tracks.get(defaultClips.crouchWalk), 1, true);
        for (const name of actionNames) layer.assignAnimation(name, tracks.get(name), 1, loopable.has(name));
        layer.transition(defaultClips.idle, .12);
      } else {
        for (const animation of animationAssets) {
          const track = animation?.resource || animation;
          const name = track?.name || animation?.name;
          if (name && track) instanceRoot.anim.assignAnimation(name, track, undefined, 1, loopable.has(name));
        }
        instanceRoot.anim.baseLayer.transition(defaultClips.idle, 0.12);
      }
      for (const render of instanceRoot.findComponents('render')) {
        for (const meshInstance of render.meshInstances || []) {
          if (!meshInstance.material) continue;
          const material = meshInstance.material.clone();
          const name = material.name.toLowerCase();
          if (tint.some(value => value !== 1) &&
              (name.includes('shirt') || name.includes('overshirt') || name.includes('trouser') || name.includes('bag'))) {
            material.diffuse = new pc.Color(
              material.diffuse.r * tint[0],
              material.diffuse.g * tint[1],
              material.diffuse.b * tint[2]
            );
            material.update();
            meshInstance.material = material;
          }
        }
      }
      return instanceRoot;
    }

    const root = createAnimatedInstance(characterId === 'ara-female' ? 'Ara3DFemale' : 'NaijaCityHero01');
    const renderMeshInstances = root.findComponents('render').flatMap(component => component.meshInstances || []);
    const skinnedMeshCount = renderMeshInstances.filter(mesh => !!mesh.skinInstance).length;
    if (!renderMeshInstances.length) throw new Error('The character GLB loaded but contains no visible render meshes.');
    if (characterId === 'ara-female' && !skinnedMeshCount) throw new Error('Ara loaded without a skinned mesh.');
    const morphInstances = [];
    const morphNames = new Set();
    for (const render of root.findComponents('render')) {
      for (const meshInstance of render.meshInstances || []) {
        const morphInstance = meshInstance.morphInstance;
        if (!morphInstance) continue;
        morphInstances.push(morphInstance);
        for (const target of morphInstance.morph?.targets || []) {
          if (target.name) morphNames.add(target.name);
        }
      }
    }

    // Ara parkour actions are now exported as real skeletal animation clips during FBX import.
    // Do not add Euler offsets after animation playback: that accumulates joint rotation and corrupts the pose.
    const setProceduralPose = () => false;


    const getVisualBounds = () => {
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(const render of root.findComponents('render'))for(const mesh of render.meshInstances||[]){
        const bounds=mesh.aabb;if(!bounds)continue;const lo=bounds.getMin(),hi=bounds.getMax();
        min[0]=Math.min(min[0],lo.x);min[1]=Math.min(min[1],lo.y);min[2]=Math.min(min[2],lo.z);
        max[0]=Math.max(max[0],hi.x);max[1]=Math.max(max[1],hi.y);max[2]=Math.max(max[2],hi.z);
      }
      return Number.isFinite(min[0])?{min,max}:null;
    };

    const bindPoseBounds=getVisualBounds();
    // The updated Walk/Run clips are foot-locked against the shoe-sole markers.
    // Do not lift the whole character to hide the old toe dip; keep only a
    // bind-pose correction when the model itself extends below its floor plane.
    const visualGroundOffset=bindPoseBounds?.min?.[1]<0?Math.max(0,-bindPoseBounds.min[1]+.015):0;

    const getRigSnapshot = () => {
      const boneMap = new Map();
      let skinnedMeshCount = 0, weightedVertexCount = 0;
      for (const render of root.findComponents('render')) for (const meshInstance of render.meshInstances || []) {
        if (!meshInstance.skinInstance) continue;
        skinnedMeshCount++;
        weightedVertexCount += meshInstance.mesh?.vertexBuffer?.numVertices || 0;
        for (const bone of meshInstance.skinInstance.bones || []) if (bone?.name) boneMap.set(bone.name, bone);
      }
      return {
        skinnedMeshCount, weightedVertexCount,
        boneCount: boneMap.size,
        bones: [...boneMap.values()].map(node => {
          const p = node.getLocalPosition?.(), rotation = node.getLocalEulerAngles?.();
          const path = []; let parent = node;
          while (parent && parent !== root) { path.unshift(parent.name); parent = parent.parent; }
          return { name: node.name, path, position: p ? [p.x, p.y, p.z] : [0, 0, 0],
            rotation: rotation ? [rotation.x, rotation.y, rotation.z] : [0, 0, 0] };
        })
      };
    };

    const skinBones = renderMeshInstances.flatMap(mesh => mesh.skinInstance?.bones || []);
    const normalizedBoneName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const findBone = (...aliases) => {
      const targets = aliases.map(normalizedBoneName);
      return skinBones.find(bone => targets.includes(normalizedBoneName(bone?.name))) || null;
    };
    const hipsBone = findBone('Hips','Pelvis');
    const leftFootBone = findBone('LeftToeBase','LeftFoot','Foot_L','LFoot') || root.findByName('LeftToeBase') || root.findByName('LeftFoot');
    const rightFootBone = findBone('RightToeBase','RightFoot','Foot_R','RFoot') || root.findByName('RightToeBase') || root.findByName('RightFoot');
    // Keep the support point used by footstep/raycast effects, and expose the
    // actual toe-tip joints separately for stance/sliding diagnostics.
    const leftToeTipBone = findBone('LeftToe_End','LeftToeEnd') || leftFootBone;
    const rightToeTipBone = findBone('RightToe_End','RightToeEnd') || rightFootBone;
    // Blender-authored sole landmarks are ordinary non-rendered glTF nodes,
    // bone-parented to the actual foot joints. They measure the shoe contact
    // surface without adding runtime IK or influencing the skinned mesh.
    const leftSoleToe = root.findByName('Ara_Left_SoleToe') || null;
    const leftSoleHeel = root.findByName('Ara_Left_SoleHeel') || null;
    const rightSoleToe = root.findByName('Ara_Right_SoleToe') || null;
    const rightSoleHeel = root.findByName('Ara_Right_SoleHeel') || null;
    const leftHandBone = findBone('LeftHand','Hand_L','LHand','LeftWrist');
    const rightHandBone = findBone('RightHand','Hand_R','RHand','RightWrist');
    const leftHandTipBone = findBone('LeftHandIndex1','LeftHandMiddle1','LeftHand');
    const rightHandTipBone = findBone('RightHandIndex1','RightHandMiddle1','RightHand');
    const leftAnkleBone = findBone('LeftFoot');
    const rightAnkleBone = findBone('RightFoot');
    const leftUpperArm = findBone('LeftArm','UpperArm_L');
    const rightUpperArm = findBone('RightArm','UpperArm_R');
    const leftForeArm = findBone('LeftForeArm','LowerArm_L');
    const rightForeArm = findBone('RightForeArm','LowerArm_R');
    const leftUpperLeg = findBone('LeftUpLeg','Thigh_L');
    const rightUpperLeg = findBone('RightUpLeg','Thigh_R');
    const leftLowerLeg = findBone('LeftLeg','Shin_L');
    const rightLowerLeg = findBone('RightLeg','Shin_R');
    const readRigPoint = bone => {
      if (!bone) return null;
      const p = bone.getPosition();
      return [p.x, p.y, p.z];
    };
    const getFootPositions = () => ({ left: readRigPoint(leftFootBone), right: readRigPoint(rightFootBone) });
    const describeMarker = node => {
      if (!node) return null;
      const local=node.getLocalPosition?.();
      return {name:node.name,parent:node.parent?.name||null,parentType:node._parent?._type||null,
        localPosition:local?[local.x,local.y,local.z]:null};
    };
    const getSoleMarkerInfo = () => ({leftToe:describeMarker(leftSoleToe),leftHeel:describeMarker(leftSoleHeel),
      rightToe:describeMarker(rightSoleToe),rightHeel:describeMarker(rightSoleHeel)});
    const applyHipsWorldOffset = offset => {
      if (!hipsBone || !Array.isArray(offset) || offset.length < 3 || !offset.every(Number.isFinite)) return false;
      const parent=hipsBone.parent;
      if (!parent?.getWorldTransform) return false;
      const inverse=parent.getWorldTransform().clone().invert();
      const local=inverse.transformVector(new pc.Vec3(offset[0],offset[1],offset[2]),new pc.Vec3());
      const p=hipsBone.getLocalPosition();
      hipsBone.setLocalPosition(p.x+local.x,p.y+local.y,p.z+local.z);
      return true;
    };
    const getLimbPositions = () => ({
      leftHand: readRigPoint(leftHandBone), rightHand: readRigPoint(rightHandBone),
      leftHandTip: readRigPoint(leftHandTipBone), rightHandTip: readRigPoint(rightHandTipBone),
      leftFoot: readRigPoint(leftFootBone), rightFoot: readRigPoint(rightFootBone),
      leftToeTip: readRigPoint(leftToeTipBone), rightToeTip: readRigPoint(rightToeTipBone),
      leftSoleToe: readRigPoint(leftSoleToe), leftSoleHeel: readRigPoint(leftSoleHeel),
      rightSoleToe: readRigPoint(rightSoleToe), rightSoleHeel: readRigPoint(rightSoleHeel),
      leftAnkle: readRigPoint(leftAnkleBone), rightAnkle: readRigPoint(rightAnkleBone)
    });
    const getFacingDirection = () => {
      const head = findBone('Head');
      const leftEye = findBone('LeftEye');
      const rightEye = findBone('RightEye');
      if (!head || !leftEye || !rightEye) return null;
      const h = head.getPosition(), l = leftEye.getPosition(), r = rightEye.getPosition();
      const x = (l.x + r.x) * .5 - h.x;
      const y = (l.y + r.y) * .5 - h.y;
      const z = (l.z + r.z) * .5 - h.z;
      const length = Math.hypot(x, y, z) || 1;
      return [x / length, y / length, z / length];
    };
    // The bundled Ara preset's face points along local +Z. The game controller
    // moves forward along -Z, so rotate the visual root once to align them.
    const initialFacing = getFacingDirection();
    let forwardAxisCorrectionDegrees = 0;
    if (initialFacing) {
      const heading = Math.atan2(initialFacing[0], initialFacing[2]);
      forwardAxisCorrectionDegrees = (Math.PI - heading) * 180 / Math.PI;
      root.setLocalEulerAngles(0, forwardAxisCorrectionDegrees, 0);
    }

    const setFaceExpression = (name, weight = 1) => {
      const normalized = Math.max(0, Math.min(1, Number(weight) || 0));
      let applied = false;
      for (const morphInstance of morphInstances) {
        if (!(morphInstance.morph?.targets || []).some(target => target.name === name)) continue;
        morphInstance.setWeight(name, normalized);
        applied = true;
      }
      return applied;
    };

    setStatus((characterId === 'ara-female' ? 'Ara 3D female ready' : 'Hero 01 ready') +
      ' · ' + clipNames.length + ' animation clips');
    return {
      root, asset, characterId, displayName: characterId === 'ara-female' ? 'Ara 3D Female' : 'Hero 01', clipNames, clipDurations, defaultClips, source, metadata,
      renderMeshCount: renderMeshInstances.length, skinnedMeshCount, visualGroundOffset,
      morphNames: Array.from(morphNames).sort(),
      setFaceExpression, getRigSnapshot, getVisualBounds, getFootPositions, getLimbPositions, getSoleMarkerInfo, applyHipsWorldOffset, getFacingDirection, forwardAxisCorrectionDegrees, createInstance: createAnimatedInstance,
      setProceduralPose, hasAnimation: name => clipNames.includes(name),
      proceduralPoseNames: [], semanticBoneCount: 0
    };
  } catch (error) {
    if (asset) {
      asset.unload?.();
      app.assets.remove(asset);
    }
    throw error;
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}
