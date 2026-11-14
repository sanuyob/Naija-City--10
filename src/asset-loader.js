import * as pc from 'playcanvas';
import { loadSavedPlayerCharacter } from './player-character-store.js';

const base = import.meta.env.BASE_URL || '/';
const resolveAssetUrl = value => new URL(String(value).replace(/^\//, ''), new URL(base, window.location.origin)).href;

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
 * Load the locally imported Ara character first. If none is saved, keep the
 * bundled Hero 01 model as a fallback. Both use PlayCanvas ContainerAsset.
 */
export async function loadHeroCharacter(app, {
  urls = ['assets/hero/NaijaCityHero01_60clips.glb.b64'],
  characterId = 'hero01',
  statusLabel
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
      const saved = await loadSavedPlayerCharacter('ara-female');
      if (!(saved?.buffer instanceof ArrayBuffer) || saved.buffer.byteLength <= 20) {
        throw new Error('Ara 3D female is not installed yet. Import The_Female_Executive.fbx from the Player menu first.');
      }
      source = 'ara-3d-gen-female';
      metadata = saved.metadata || null;
      blobUrl = URL.createObjectURL(new Blob([saved.buffer], { type: 'model/gltf-binary' }));
      setStatus('Loading Ara 3D female character…');
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

    const findClip = patterns => clipNames.find(name => patterns.some(pattern => pattern.test(name)));
    const defaultClips = {
      idle: findClip([/idle/i, /stand/i]) || clipNames[0],
      walk: findClip([/walk/i]) || findClip([/jog/i]) || findClip([/run|sprint/i]) || clipNames[0],
      run: findClip([/run|sprint/i]) || findClip([/jog/i]) || findClip([/walk/i]) || clipNames[0],
      jump: findClip([/jump/i]) || findClip([/leap/i]) || null,
      landing: findClip([/land/i]) || findClip([/idle/i]) || null,
      crouch: findClip([/crouch|duck/i]) || null
    };
    // Locomotion and idle clips must loop when this rig is used for either
    // the player or a route-driven city NPC.
    const loopable = new Set(clipNames.filter(name =>
      /(?:^|_)(?:idle|walk|jog|run|sprint|crouch)(?:_|$)/i.test(name)
    ));
    for (const name of [defaultClips.idle, defaultClips.walk, defaultClips.run, defaultClips.crouch]) {
      if (name) loopable.add(name);
    }

    function createAnimatedInstance(instanceName, tint = [1, 1, 1]) {
      const instanceRoot = asset.resource.instantiateRenderEntity();
      instanceRoot.name = instanceName;
      instanceRoot.addComponent('anim', { activate: true });
      if (!instanceRoot.anim) throw new Error('PlayCanvas did not create animation component for ' + instanceName);
      for (const animation of animationAssets) {
        const track = animation?.resource || animation;
        const name = track?.name || animation?.name;
        if (name && track) instanceRoot.anim.assignAnimation(name, track, undefined, 1, loopable.has(name));
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
      instanceRoot.anim.baseLayer.transition(defaultClips.idle, 0.12);
      return instanceRoot;
    }

    const root = createAnimatedInstance(characterId === 'ara-female' ? 'Ara3DFemale' : 'NaijaCityHero01');
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
          return { name: node.name, position: p ? [p.x, p.y, p.z] : [0, 0, 0],
            rotation: rotation ? [rotation.x, rotation.y, rotation.z] : [0, 0, 0] };
        })
      };
    };

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
      morphNames: Array.from(morphNames).sort(),
      setFaceExpression, getRigSnapshot, createInstance: createAnimatedInstance,
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
