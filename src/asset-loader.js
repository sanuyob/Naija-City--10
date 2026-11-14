import * as pc from 'playcanvas';

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
 * Loads Naija City Hero 01 from the repository's base64-wrapped GLB.
 * The wrapper keeps the generated binary asset intact through the repository text-file API;
 * it is decoded once at runtime to a Blob URL before PlayCanvas ContainerHandler loads it.
 */
export async function loadHeroCharacter(app, {
  url = 'assets/hero/NaijaCityHero01_18clips.glb.b64',
  statusLabel
} = {}) {
  const setStatus = message => {
    if (statusLabel) statusLabel.textContent = message;
  };
  setStatus('Loading Hero 01 character and animation library…');
  const response = await fetch(new URL(String(url).replace(/^\//, ''), new URL(base, window.location.origin)), {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Hero GLB payload HTTP ' + response.status);
  const encoded = (await response.text()).replace(/\s+/g, '');
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(encoded)) {
    throw new Error('Hero GLB base64 payload is incomplete or invalid');
  }

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 20 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) {
    throw new Error('Decoded Hero asset is not a GLB file');
  }

  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
  const asset = new pc.Asset('naija-city-hero-01', 'container', { url: blobUrl });
  try {
    app.assets.add(asset);
    await new Promise((resolve, reject) => {
      asset.once('load', resolve);
      asset.once('error', error => reject(new Error('Hero GLB load failed: ' + (error?.message || error || 'unknown error'))));
      app.assets.load(asset);
    });

    const root = asset.resource.instantiateRenderEntity();
    root.name = 'NaijaCityHero01';
    root.addComponent('anim', { activate: true });
    if (!root.anim) throw new Error('PlayCanvas did not create the Hero animation component');

    const clipNames = [];
    const clipDurations = {};
    const loopable = new Set([
      'Hero01_Idle', 'Hero01_Walk', 'Hero01_Run', 'Hero01_Sprint',
      'Hero01_Crouch', 'Hero01_CrouchWalk', 'Hero01_TiredIdle', 'Hero01_SitIdle'
    ]);
    const animationAssets = asset.resource.animations || [];
    for (const animation of animationAssets) {
      const track = animation?.resource || animation;
      const name = track?.name || animation?.name;
      if (!name || !track) continue;
      root.anim.assignAnimation(name, track, undefined, 1, loopable.has(name));
      clipDurations[name] = Number.isFinite(track.duration) ? track.duration : 1.9;
      clipNames.push(name);
    }
    if (!clipNames.includes('Hero01_Idle')) {
      throw new Error('Hero GLB did not expose its expected Hero01_Idle animation');
    }
    root.anim.baseLayer.transition('Hero01_Idle', 0.1);
    setStatus('Hero 01 ready · ' + clipNames.length + ' named animations loaded');
    return { root, asset, clipNames, clipDurations };
  } catch (error) {
    asset.unload?.();
    app.assets.remove(asset);
    throw error;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
