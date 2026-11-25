import * as pc from 'playcanvas';

const BASE = import.meta.env.BASE_URL || '/';
const assetUrl = path => new URL(String(path).replace(/^\//, ''), new URL(BASE, window.location.origin)).href;

const TECH_ASSETS = [
  {
    id: 'sci-fi-terminal',
    name: 'Mide Tech Hub · City Terminal',
    path: 'assets/tech/grab3d/mobile/sci-fi-terminal.glb',
    source: 'https://grab3d.com/models/sci-fi/sci-fi-terminal/',
    position: [-24.76, 1.43, 98.8],
    scale: 0.55,
    yaw: 90,
    dimensions: [0.64, 1.38828, 0.5025],
    triangles: 10280,
    collision: true
  },
  {
    id: 'hologram-projector',
    name: 'Mide Tech Hub · Hologram Projector',
    path: 'assets/tech/grab3d/mobile/hologram-projector.glb',
    source: 'https://grab3d.com/models/sci-fi/hologram-projector/',
    position: [-24.76, 1.43, 100.0],
    scale: 0.48,
    yaw: 0,
    dimensions: [0.464, 0.99, 0.464],
    triangles: 9056,
    collision: true
  },
  {
    id: 'data-pad',
    inventoryId: 'tech-data-pad',
    name: 'Mide Tech Hub · Data Pad',
    path: 'assets/tech/grab3d/mobile/data-pad.glb',
    source: 'https://grab3d.com/models/sci-fi/data-pad/',
    position: [-24.76, 1.43, 101.25],
    scale: 1,
    yaw: -12,
    dimensions: [0.25, 0.01976, 0.1725],
    triangles: 3496,
    collision: false
  },
  {
    id: 'walkie-talkie',
    inventoryId: 'tech-field-radio',
    name: 'Mide Tech Hub · Field Radio',
    path: 'assets/tech/grab3d/mobile/walkie-talkie.glb',
    source: 'https://grab3d.com/models/electronics/walkie-talkie/',
    position: [-24.76, 1.43, 102.55],
    scale: 1,
    yaw: 8,
    dimensions: [0.0653, 0.2285, 0.04792],
    triangles: 6716,
    collision: false
  }
];

function loadContainer(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(name + ': ' + (error?.message || error || 'GLB load failed'))));
    app.assets.load(asset);
  });
}

export async function createStage09TechEquipment({ app, economy } = {}) {
  if (!app) throw new Error('Stage 09 tech equipment requires a PlayCanvas app.');

  const root = new pc.Entity('stage09-yaba-tech-equipment');
  root.tags.add('stage09-tech-equipment');
  app.root.addChild(root);

  const collisionProxies = [];
  const importedAssets = [];
  const failures = [];
  const retainedAssets = [];
  const equipmentEntities = new Map();
  let interactionSystemRef = null;

  for (const spec of TECH_ASSETS) {
    try {
      const asset = await loadContainer(app, 'stage09-' + spec.id, spec.path);
      retainedAssets.push(asset);
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = 'stage09-' + spec.id;
      entity.setPosition(...spec.position);
      entity.setLocalScale(spec.scale, spec.scale, spec.scale);
      entity.setEulerAngles(0, spec.yaw, 0);
      entity.tags.add('stage09-tech-equipment');
      entity.tags.add('stage09-mide-tech-hub');
      for (const component of entity.findComponents('render')) {
        component.batchGroupId = -1;
        component.castShadows = false;
        component.receiveShadows = true;
      }
      root.addChild(entity);
      equipmentEntities.set(spec.id, entity);
      if (spec.inventoryId && (Number(economy?.getState?.().inventory?.[spec.inventoryId]) || 0) > 0) entity.enabled = false;

      if (spec.collision) {
        const [width, height, depth] = spec.dimensions;
        collisionProxies.push({
          id: 'stage09-tech-' + spec.id,
          kind: 'tech-equipment',
          source: 'stage09-yaba-tech-equipment',
          position: [spec.position[0], spec.position[1] + height * spec.scale / 2, spec.position[2]],
          halfExtents: [width * spec.scale / 2, height * spec.scale / 2, depth * spec.scale / 2],
          rotationY: spec.yaw,
          surface: 'metal'
        });
      }

      importedAssets.push({
        id: spec.id,
        name: spec.name,
        source: spec.source,
        loaded: true,
        triangles: spec.triangles,
        scale: spec.scale,
        hasBulletCollision: spec.collision
      });
    } catch (error) {
      failures.push({ id: spec.id, message: error.message });
      importedAssets.push({
        id: spec.id,
        name: spec.name,
        source: spec.source,
        loaded: false,
        triangles: spec.triangles,
        hasBulletCollision: false
      });
    }
  }

  const itemDetails = {
    'tech-data-pad': {
      id: 'tech-data-pad', name: 'City Data Pad', category: 'PORTABLE CITY DEVICE',
      description: 'A compact field tablet used by city workers to check district information, saved points and local service notes.',
      details: ['Offline district reference', 'Saved place notes', 'Portable inspection tool']
    },
    'tech-field-radio': {
      id: 'tech-field-radio', name: 'Field Radio', category: 'PORTABLE COMMUNICATION DEVICE',
      description: 'A short-range city service radio for fictional in-game status checks and local crew messages.',
      details: ['Local service status', 'Crew check-in panel', 'No real-world radio transmission']
    }
  };

  function isCollected(inventoryId) {
    return (Number(economy?.getState?.().inventory?.[inventoryId]) || 0) > 0;
  }

  function collectItem(inventoryId) {
    const spec = TECH_ASSETS.find(item => item.inventoryId === inventoryId);
    if (!spec) return { success: false, message: 'That device cannot be collected.' };
    if (isCollected(inventoryId)) return { success: false, duplicate: true, state: economy?.getState?.(), message: spec.name + ' is already in your inventory.' };
    const result = economy?.addItem?.(inventoryId, 1);
    if (!result?.success) return { success: false, message: 'Inventory storage is unavailable. Try again.' };
    const entity = equipmentEntities.get(spec.id);
    if (entity) entity.enabled = false;
    interactionSystemRef?.setEnabled?.('mide-tech-item-' + spec.id, false);
    return { success: true, state: result.state || economy.getState(), message: spec.name + ' added to your field kit.' };
  }

  function useItem(inventoryId) {
    if (!isCollected(inventoryId)) return { success: false, message: 'Collect the device before using it.' };
    if (inventoryId === 'tech-data-pad') return { success: true, item: inventoryId, action: 'open-map', message: 'DATA PAD · Opening the Naija City atlas.' };
    if (inventoryId === 'tech-field-radio') return { success: true, item: inventoryId, message: 'FIELD RADIO · Local channel check complete. The city network is a game-only communication system.' };
    return { success: false, message: 'This device has no available action.' };
  }

  function registerInteractions(interactionSystem) {
    if (!interactionSystem?.register) return 0;
    interactionSystemRef = interactionSystem;
    let registered = 0;
    for (const spec of TECH_ASSETS.filter(item => item.inventoryId)) {
      if (!importedAssets.find(item => item.id === spec.id)?.loaded || isCollected(spec.inventoryId)) continue;
      const detail = itemDetails[spec.inventoryId];
      interactionSystem.register({
        id: 'mide-tech-item-' + spec.id,
        name: detail.name,
        position: spec.position,
        range: 2.8,
        requiresLineOfSight: false, // The tabletop surface can occlude a ray from a standing player.
        eyeHeight: 0.18,
        prompt: 'INSPECT · ' + detail.name.toUpperCase(),
        canInteract: () => !isCollected(spec.inventoryId),
        onInteract: () => {
          const opened = window.__NAIJA_RPG_UI__?.inspectItem?.(detail);
          return opened ? { message: 'Inspecting ' + detail.name + '.' } : { message: 'Open your inventory to inspect this device.' };
        }
      });
      registered++;
    }
    interactionSystem.register({
      id: 'mide-tech-hub-demo',
      name: 'Mide Tech Hub',
      position: [-22.35, 0.65, 101.0],
      range: 3.25,
      prompt: 'CHECK · MIDE TECH HUB',
      onInteract: () => ({ message: 'MIDE TECH HUB · Inspect the City Data Pad and Field Radio on the counter to collect them.' })
    });
    return registered + 1;
  }

  const loaded = importedAssets.filter(item => item.loaded);
  return {
    stage: '09-tech-equipment',
    district: 'Yaba · Mide Tech Hub',
    root,
    collisionProxies,
    importedAssets,
    assetFailures: failures,
    registerInteractions,
    collectItem,
    useItem,
    getState: () => ({
      stage: '09-tech-equipment',
      district: 'Yaba · Mide Tech Hub',
      assetsRequested: TECH_ASSETS.length,
      assetsLoaded: importedAssets.filter(item => item.loaded).length,
      assetsFailed: failures.length,
      inventoryItems: { dataPadCollected: isCollected('tech-data-pad'), fieldRadioCollected: isCollected('tech-field-radio') },
      estimatedTriangles: loaded.reduce((sum, item) => sum + item.triangles, 0),
      collisionProxies: collisionProxies.length,
      importedAssets: importedAssets.map(item => ({ ...item })),
      assetFailures: failures.map(item => ({ ...item })),
      sourceLicense: 'CC0 1.0',
      textureMaxDimension: 512,
      physics: 'Static Bullet box proxies for the terminal and projector; handheld props remain interaction-only.'
    }),
    destroy: () => {
      interactionSystemRef = null;
      try { root.destroy(); } catch {}
      for (const asset of retainedAssets) {
        try { app.assets.remove(asset); } catch {}
      }
    }
  };
}
