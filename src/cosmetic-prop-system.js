import * as pc from 'playcanvas';

const BASE = import.meta.env.BASE_URL || '/';
const resolveAssetUrl = value => new URL(String(value).replace(/^\//, ''), new URL(BASE, window.location.origin)).href;

export const COSMETIC_PROP_DEFINITIONS = Object.freeze([
  {
    id: 'm4-cosmetic',
    name: 'M4 Display Prop',
    shortName: 'M4',
    description: 'Static, non-functional cosmetic model',
    icon: 'long',
    url: 'assets/cosmetic-props/m4-cosmetic.glb',
    handScale: 0.68,
    handPosition: [0.02, -0.055, 0.12],
    handEuler: [0, 0, 0],
    viewScale: 0.53,
    viewPosition: [0.29, -0.25, -0.58],
    viewEuler: [0, 180, 0],
    triangles: 8906,
    bytes: 411520
  },
  {
    id: 'mac10-cosmetic',
    name: 'MAC-10 Display Prop',
    shortName: 'MAC-10',
    description: 'Static, non-functional cosmetic model',
    icon: 'compact',
    url: 'assets/cosmetic-props/mac10-cosmetic.glb',
    handScale: 1.12,
    handPosition: [0.025, -0.045, 0.105],
    handEuler: [0, 0, 0],
    viewScale: 0.91,
    viewPosition: [0.27, -0.24, -0.55],
    viewEuler: [0, 180, 0],
    triangles: 12791,
    bytes: 396544
  }
]);

const DEFINITION_MAP = new Map(COSMETIC_PROP_DEFINITIONS.map(item => [item.id, item]));

function findRightHandBone(root) {
  const wanted = ['righthand', 'handr', 'righthandindex1', 'mixamorigrighthand'];
  const stack = [...(root?.children || [])];
  while (stack.length) {
    const node = stack.pop();
    const normalized = String(node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (wanted.some(name => normalized === name || normalized.endsWith(name))) return node;
    stack.push(...(node.children || []));
  }
  return null;
}

/**
 * Loads supplied models as static cosmetic display props only.
 * The generated GLBs contain no animation clips or skin rigs. This system
 * only shows/hides a model and reparents it for the current camera mode.
 */
export function createCosmeticPropSystem({
  app,
  player,
  camera,
  playerController,
  onStatus = () => {}
} = {}) {
  if (!app || !player || !camera || !playerController) {
    throw new Error('Cosmetic props require the game app, player, camera and player controller.');
  }

  const handAnchor = findRightHandBone(player) || player;
  const loaded = new Map();
  const loading = new Map();
  let activeItemId = null;
  let cameraMode = playerController.getState?.().cameraMode || 'third-person';
  let destroyed = false;
  let lastMessage = '';

  const status = (message, ok = true) => {
    lastMessage = String(message || '');
    const result = { ok, message: lastMessage };
    onStatus(lastMessage, result);
    return result;
  };

  function releaseLoaded(itemId) {
    const record = loaded.get(itemId);
    if (!record) return;
    record.entity.destroy();
    try {
      record.asset.unload();
      app.assets.remove(record.asset);
    } catch {}
    loaded.delete(itemId);
  }

  function loadProp(itemId) {
    if (loaded.has(itemId)) return Promise.resolve(loaded.get(itemId));
    if (loading.has(itemId)) return loading.get(itemId);
    const definition = DEFINITION_MAP.get(itemId);
    if (!definition) return Promise.reject(new Error('Unknown cosmetic prop.'));
    const promise = new Promise((resolve, reject) => {
      const asset = new pc.Asset('naija-city-' + itemId, 'container', {
        url: resolveAssetUrl(definition.url)
      });
      app.assets.add(asset);
      asset.once('load', () => {
        try {
          const entity = asset.resource?.instantiateRenderEntity?.();
          if (!entity) throw new Error('The cosmetic GLB did not create a render entity.');
          entity.name = 'naija-city-' + itemId;
          for (const render of entity.findComponents('render')) {
            render.castShadows = false;
            render.receiveShadows = false;
            for (const meshInstance of render.meshInstances || []) {
              meshInstance.castShadow = false;
              meshInstance.receiveShadow = false;
            }
          }
          const record = { asset, entity };
          loaded.set(itemId, record);
          resolve(record);
        } catch (error) {
          try { asset.unload(); app.assets.remove(asset); } catch {}
          reject(error);
        }
      });
      asset.once('error', error => {
        try { asset.unload(); app.assets.remove(asset); } catch {}
        reject(new Error(String(error?.message || error || 'Cosmetic model failed to load.')));
      });
      app.assets.load(asset);
    }).finally(() => loading.delete(itemId));
    loading.set(itemId, promise);
    return promise;
  }

  function mountActive() {
    if (!activeItemId) return false;
    const record = loaded.get(activeItemId);
    const definition = DEFINITION_MAP.get(activeItemId);
    if (!record || !definition) return false;
    const entity = record.entity;
    const firstPerson = cameraMode === 'first-person';
    entity.reparent(firstPerson ? camera : handAnchor);
    const position = firstPerson ? definition.viewPosition : definition.handPosition;
    const euler = firstPerson ? definition.viewEuler : definition.handEuler;
    const scale = firstPerson ? definition.viewScale : definition.handScale;
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalEulerAngles(euler[0], euler[1], euler[2]);
    entity.setLocalScale(scale, scale, scale);
    entity.enabled = true;
    return true;
  }

  async function select(itemId) {
    if (destroyed) return status('Cosmetic prop display is unavailable.', false);
    if (!DEFINITION_MAP.has(itemId)) return status('Unknown cosmetic prop.', false);
    if (activeItemId === itemId) return hide();

    if (activeItemId) {
      const previous = activeItemId;
      activeItemId = null;
      releaseLoaded(previous);
    }

    status('Loading ' + DEFINITION_MAP.get(itemId).name + '…');
    try {
      await loadProp(itemId);
      if (destroyed) {
        releaseLoaded(itemId);
        return status('Cosmetic prop display was closed.', false);
      }
      activeItemId = itemId;
      mountActive();
      status(DEFINITION_MAP.get(itemId).name + ' displayed in ' +
        (cameraMode === 'first-person' ? 'first-person' : 'third-person') + ' view.');
      return getState();
    } catch (error) {
      releaseLoaded(itemId);
      status('Could not load ' + DEFINITION_MAP.get(itemId).name + ': ' + error.message, false);
      return getState();
    }
  }

  function hide() {
    if (!activeItemId) return status('No cosmetic prop is being displayed.', false);
    const previous = activeItemId;
    activeItemId = null;
    releaseLoaded(previous);
    status(DEFINITION_MAP.get(previous).name + ' hidden.');
    return getState();
  }

  function setCameraMode(mode) {
    cameraMode = mode === 'first-person' ? 'first-person' : 'third-person';
    if (activeItemId) {
      mountActive();
      status(DEFINITION_MAP.get(activeItemId).name + ' displayed in ' +
        (cameraMode === 'first-person' ? 'first-person' : 'third-person') + ' view.');
    }
    return cameraMode;
  }

  function getState() {
    return {
      activeItemId,
      cameraMode,
      displayAnchor: activeItemId ? (cameraMode === 'first-person' ? 'camera' : 'right-hand') : null,
      lastMessage,
      items: COSMETIC_PROP_DEFINITIONS.map(item => ({
        id: item.id,
        name: item.name,
        shortName: item.shortName,
        description: item.description,
        icon: item.icon,
        loaded: loaded.has(item.id),
        loading: loading.has(item.id),
        selected: activeItemId === item.id,
        triangles: item.triangles,
        bytes: item.bytes
      }))
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    activeItemId = null;
    for (const itemId of [...loaded.keys()]) releaseLoaded(itemId);
    loading.clear();
  }

  return { select, hide, setCameraMode, getState, destroy };
}
