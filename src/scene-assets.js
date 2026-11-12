// Runtime GLB / texture loader for the standalone PlayCanvas AppBase build.
// Add production assets here when their files are committed under /assets.
export const SCENE_ASSET_MANIFEST = [];

export async function loadSceneAssets(app, onProgress = () => {}, manifest = SCENE_ASSET_MANIFEST) {
  const result = { loaded: [], failed: [], total: manifest.length };
  if (!manifest.length) {
    onProgress({ loaded: 0, failed: 0, total: 0, current: null });
    return result;
  }
  let completed = 0;
  const tasks = manifest.map(definition => new Promise(resolve => {
    const { name, type, url, position = [0, 0, 0], scale = [1, 1, 1] } = definition;
    if (!name || !url || !['container', 'texture'].includes(type)) {
      result.failed.push({ name: name || 'unnamed asset', url: url || '', error: 'Asset needs a name, URL and supported type (container or texture).' });
      completed++;
      onProgress({ loaded: result.loaded.length, failed: result.failed.length, total: result.total, current: name || 'invalid asset' });
      resolve();
      return;
    }
    const asset = new pcAsset(name, type, { url });
    app.assets.add(asset);
    asset.on('progress', (received, total) => onProgress({ loaded: result.loaded.length, failed: result.failed.length, total: result.total, current: name, received, bytesTotal: total }));
    asset.once('load', () => {
      try {
        if (!asset.resource) throw new Error('Asset load event completed without a resource.');
        if (type === 'container') {
          const entity = asset.resource.instantiateRenderEntity();
          entity.name = name;
          entity.setLocalPosition(...position);
          entity.setLocalScale(...scale);
          app.root.addChild(entity);
        }
        result.loaded.push({ name, type, url, assetId: asset.id });
      } catch (error) {
        result.failed.push({ name, url, error: error.message });
      }
      completed++;
      onProgress({ loaded: result.loaded.length, failed: result.failed.length, total: result.total, current: name });
      resolve();
    });
    asset.once('error', error => {
      result.failed.push({ name, url, error: error?.message || String(error || 'Unknown asset loading error') });
      completed++;
      onProgress({ loaded: result.loaded.length, failed: result.failed.length, total: result.total, current: name });
      resolve();
    });
    app.assets.load(asset);
  }));
  await Promise.all(tasks);
  return result;
}

// Resolve Asset from the engine attached to the AppBase instance. The registry
// creates and owns resources; this avoids a second engine import in this module.
function pcAsset(name, type, file) {
  const Constructor = globalThis.__NAIJA_PLAYCANVAS_ASSET__;
  if (!Constructor) throw new Error('PlayCanvas Asset constructor was not registered.');
  return new Constructor(name, type, file);
}
