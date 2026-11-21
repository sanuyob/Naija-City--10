import * as pc from 'playcanvas';

const BASE = import.meta.env.BASE_URL || '/';

function resolveAssetUrl(assetPath) {
  const cleanPath = String(assetPath).startsWith('/') ? String(assetPath).slice(1) : String(assetPath);
  return new URL(cleanPath, new URL(BASE, window.location.origin)).href;
}

function loadContainer(app, assetPath, name) {
  return new Promise((resolve, reject) => {
    const url = resolveAssetUrl(assetPath);
    const asset = new pc.Asset(name, 'container', { url });
    const finish = (error = null) => {
      asset.off('load', onLoad);
      asset.off('error', onError);
      if (error) {
        try { app.assets.remove(asset); } catch {}
        reject(error instanceof Error ? error : new Error(String(error || 'Unknown GLTF load error')));
      } else {
        resolve(asset);
      }
    };
    const onLoad = () => finish();
    const onError = (error) => finish(new Error(name + ': ' + (error?.message || error || 'GLTF load failed')));
    app.assets.add(asset);
    asset.once('load', onLoad);
    asset.once('error', onError);
    app.assets.load(asset);
  });
}

function distanceToBounds(position, bounds) {
  const dx = Math.max(bounds.minX - position[0], 0, position[0] - bounds.maxX);
  const dz = Math.max(bounds.minZ - position[2], 0, position[2] - bounds.maxZ);
  return Math.hypot(dx, dz);
}

/**
 * Stream GIDI as separate 500m cells. Collision stays active slightly farther
 * than visual buildings; beyond the hard visual range no building render
 * entity remains in the scene. Shared GLTF texture URLs live outside the cells.
 */
export function createGidiWorldStreamer({
  app,
  playerPhysics,
  vehicleSystem,
  statusLabel,
  fullDetailRadius = 160,
  mediumDetailRadius = 360,
  unloadRadius = 900,
  collisionLoadRadius = 220,
  collisionUnloadRadius = 460,
  updateInterval = 0.22,
  maxLoadsPerUpdate = 2
} = {}) {
  if (!app) throw new Error('GIDI streamer requires a PlayCanvas application.');

  const records = new Map();
  const inFlight = new Map();
  const errors = [];
  // GIDI imports use offline-joined static geometry and stay in the normal
  // render path. Runtime BatchManager groups hid streamed GLTF components,
  // so they are intentionally not assigned to runtime batch groups.
  const cellBatchGroup = null;
  const infrastructureBatchGroup = null;
  let materialRefractionDowngrades = 0;
  let infrastructureRenderComponents = 0;
  let manifest = null;
  let infrastructureAsset = null;
  let infrastructureEntity = null;
  let infrastructurePromise = null;
  let ready = false;
  let destroyed = false;
  let clock = 0;
  let lastPosition = null;
  let lastDesiredCount = 0;
  let totalColliderAdds = 0;
  let totalColliderRemoves = 0;
  let totalCellLoads = 0;
  let totalCellUnloads = 0;
  let lastStatus = 'not-started';

  const setStatus = (message, state = 'loading') => {
    lastStatus = message;
    if (statusLabel) {
      statusLabel.textContent = message;
      statusLabel.dataset.state = state;
    }
  };

  async function ensureManifest() {
    if (manifest) return manifest;
    const response = await fetch(resolveAssetUrl('assets/gidi/manifest.json'), { cache: 'force-cache' });
    if (!response.ok) throw new Error('GIDI manifest HTTP ' + response.status);
    manifest = await response.json();
    if (!Array.isArray(manifest.cells) || !manifest.infrastructure) {
      throw new Error('GIDI manifest is missing cells or infrastructure asset references.');
    }
    return manifest;
  }

  function prepareStaticRenderEntity(entity, group) {
    const components = entity.findComponents('render');
    for (const component of components) {
      for (const instance of component.meshInstances || []) {
        const material = instance.material;
        if (material?.useDynamicRefraction) {
          // Keep the imported tinted glass colour, but remove per-frame scene
          // colour grab-pass refraction for the low-memory mobile renderer.
          material.useDynamicRefraction = false;
          material.refraction = 0;
          if (Number(material.opacity) >= 0.98) material.blendType = pc.BLEND_NONE;
          material.update();
          materialRefractionDowngrades++;
        }
      }
      if (group) component.batchGroupId = group.id;
    }
    return components.length;
  }

  async function ensureInfrastructure() {
    if (infrastructureEntity) return infrastructureEntity;
    if (infrastructurePromise) return infrastructurePromise;
    infrastructurePromise = (async () => {
      const data = await ensureManifest();
      setStatus('Loading GIDI roads, terrain and landscape…');
      const asset = await loadContainer(app, data.infrastructure, 'gidi-infrastructure');
      if (destroyed) {
        try { app.assets.remove(asset); } catch {}
        return null;
      }
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = 'GIDI-streamed-infrastructure';
      entity.setPosition(0, Number(data.worldYOffset) || 0, 0);
      infrastructureRenderComponents = prepareStaticRenderEntity(entity, null);
      app.root.addChild(entity);
      infrastructureAsset = asset;
      infrastructureEntity = entity;
      ready = true;
      setStatus('GIDI infrastructure ready · nearby districts stream on approach', 'ready');
      return entity;
    })().catch(error => {
      errors.push('Infrastructure: ' + error.message);
      setStatus('GIDI infrastructure failed: ' + error.message, 'error');
      throw error;
    }).finally(() => { infrastructurePromise = null; });
    return infrastructurePromise;
  }

  function getRecord(cell) {
    let record = records.get(cell.id);
    if (!record) {
      record = {
        cell,
        visual: null,
        visualAsset: null,
        visualMode: 'hidden',
        visualToken: 0,
        collisionAdded: false,
        lastDistance: Infinity,
        lastError: null,
        pendingMode: null,
        visualPromise: null,
        streamedRenderComponents: 0
      };
      records.set(cell.id, record);
    }
    return record;
  }

  function addCellCollisions(record) {
    if (record.collisionAdded) return;
    const ownerId = 'gidi-cell:' + record.cell.id;
    const yOffset = Number(manifest?.worldYOffset) || 0;
    const proxies = (record.cell.colliders || []).map(proxy => ({
      ...proxy, position: [proxy.position[0], proxy.position[1] + yOffset, proxy.position[2]]
    }));
    const playerCount = playerPhysics?.addStaticColliders?.(proxies, ownerId) || 0;
    const vehicleCount = vehicleSystem?.addStaticColliders?.(proxies, ownerId) || 0;
    record.collisionAdded = true;
    record.playerColliderCount = playerCount;
    record.vehicleColliderCount = vehicleCount;
    totalColliderAdds += playerCount;
  }

  function removeCellCollisions(record) {
    if (!record.collisionAdded) return;
    const ownerId = 'gidi-cell:' + record.cell.id;
    const playerCount = playerPhysics?.removeStaticColliders?.(ownerId) || 0;
    const vehicleCount = vehicleSystem?.removeStaticColliders?.(ownerId) || 0;
    totalColliderRemoves += playerCount;
    record.collisionAdded = false;
    record.playerColliderCount = 0;
    record.vehicleColliderCount = 0;
  }

  function destroyVisual(record) {
    if (record.visual) {
      try { record.visual.destroy(); } catch {}
      record.visual = null;
      record.streamedRenderComponents = 0;
    }
    if (record.visualAsset) {
      try { app.assets.remove(record.visualAsset); } catch {}
      record.visualAsset = null;
    }
    record.visualMode = 'hidden';
  }

  async function ensureVisual(record, mode) {
    if (destroyed || mode === 'hidden' || !record.cell[mode]) return;
    if (record.visualMode === mode && record.visual) return;
    if (record.pendingMode === mode && record.visualPromise) return record.visualPromise;
    const token = ++record.visualToken;
    destroyVisual(record);
    const cell = record.cell;
    record.pendingMode = mode;
    record.visualPromise = (async () => {
      try {
        const asset = await loadContainer(app, cell[mode], 'gidi-cell-' + cell.id.replace(',', '_') + '-' + mode + '-' + token);
        if (destroyed || token !== record.visualToken || record.lastDistance > mediumDetailRadius) {
          try { app.assets.remove(asset); } catch {}
          return;
        }
        const entity = asset.resource.instantiateRenderEntity();
        entity.name = 'GIDI-cell-' + cell.id.replace(',', '_') + '-' + mode;
        entity.setPosition(0, Number(manifest?.worldYOffset) || 0, 0);
        record.streamedRenderComponents = prepareStaticRenderEntity(entity, null);
        app.root.addChild(entity);
        record.visual = entity;
        record.visualAsset = asset;
        record.visualMode = mode;
        totalCellLoads++;
      } catch (error) {
        record.lastError = error.message;
        errors.push('Cell ' + cell.id + ' ' + mode + ': ' + error.message);
      } finally {
        if (token === record.visualToken) { record.pendingMode = null; record.visualPromise = null; }
      }
    })();
    return record.visualPromise;
  }

  function unloadCell(record) {
    record.visualToken++;
    record.pendingMode = null;
    record.visualPromise = null;
    destroyVisual(record);
    removeCellCollisions(record);
    records.delete(record.cell.id);
    totalCellUnloads++;
  }

  function wantedMode(distance) {
    if (distance <= fullDetailRadius) return 'full';
    if (distance <= mediumDetailRadius) return 'lod1';
    return 'hidden';
  }

  async function update(position, dt = 0) {
    if (destroyed) return;
    clock += Math.max(0, Number(dt) || 0);
    if (clock < updateInterval) return;
    clock = 0;
    const x = Number(position?.[0]) || 0;
    const z = Number(position?.[2]) || 0;
    const current = [x, 0, z];
    if (lastPosition && Math.hypot(current[0] - lastPosition[0], current[2] - lastPosition[2]) < 8) {
      // Still refresh mode changes and asynchronous loads, but avoid rebuilding the desired set every frame.
      for (const record of records.values()) {
        const distance = distanceToBounds(current, record.cell.bounds);
        record.lastDistance = distance;
        const mode = wantedMode(distance);
        if (mode !== record.visualMode) {
          if (mode === 'hidden') destroyVisual(record);
          else void ensureVisual(record, mode);
        }
      }
      return;
    }
    lastPosition = current;

    try {
      await ensureInfrastructure();
      const data = await ensureManifest();
      const desired = data.cells.map(cell => ({
        cell,
        distance: distanceToBounds(current, cell.bounds)
      })).filter(item => item.distance <= unloadRadius)
        .sort((a, b) => a.distance - b.distance);
      lastDesiredCount = desired.length;

      const desiredIds = new Set(desired.map(item => item.cell.id));
      for (const [id, record] of records) {
        if (!desiredIds.has(id)) unloadCell(record);
      }

      let newLoads = 0;
      for (const item of desired) {
        const record = getRecord(item.cell);
        record.lastDistance = item.distance;
        if (!record.collisionAdded && item.distance <= collisionLoadRadius) addCellCollisions(record);
        else if (record.collisionAdded && item.distance > collisionUnloadRadius) removeCellCollisions(record);
        const mode = wantedMode(item.distance);
        if (mode === 'hidden') {
          if (record.visual) destroyVisual(record);
        } else if (record.visualMode !== mode || !record.visual) {
          if (newLoads < maxLoadsPerUpdate) {
            newLoads++;
            void ensureVisual(record, mode);
          }
        }
      }
    } catch (error) {
      if (!destroyed) {
        errors.push(error.message);
        setStatus('GIDI streaming error: ' + error.message, 'error');
      }
    }
  }

  function getState() {
    let fullCells = 0, mediumCells = 0, hiddenCollisionCells = 0, visibleBuildings = 0;
    let playerCollisionCount = 0, vehicleCollisionCount = 0, streamedRenderComponents = 0;
    for (const record of records.values()) {
      if (record.visualMode === 'full') fullCells++;
      else if (record.visualMode === 'lod1') mediumCells++;
      else if (record.collisionAdded) hiddenCollisionCells++;
      playerCollisionCount += record.playerColliderCount || 0;
      vehicleCollisionCount += record.vehicleColliderCount || 0;
      streamedRenderComponents += record.streamedRenderComponents || 0;
      if (record.visual) {
        for (const render of record.visual.findComponents('render')) {
          visibleBuildings += (render.meshInstances || []).filter(mesh => mesh.visible !== false).length;
        }
      }
    }
    return {
      ready,
      lastStatus,
      cellSize: manifest?.cellSize || 500,
      fullDetailRadius,
      mediumDetailRadius,
      collisionLoadRadius,
      collisionUnloadRadius,
      visualUnloadRadius: unloadRadius,
      maxLoadsPerUpdate,
      updateInterval,
      totalCells: manifest?.cells?.length || 0,
      cellBatchGroupId: cellBatchGroup?.id ?? null,
      cellBatchCount: 0,
      infrastructureBatchGroupId: infrastructureBatchGroup?.id ?? null,
      infrastructureBatchCount: 0,
      infrastructureRenderComponents,
      materialRefractionDowngrades,
      streamedRenderComponents,
      staticImportsBatched: false,
      loadedCells: records.size,
      desiredCells: lastDesiredCount,
      fullCells,
      mediumCells,
      hiddenCollisionCells,
      visibleMeshInstances: visibleBuildings,
      playerCollisionProxies: playerCollisionCount,
      vehicleCollisionProxies: vehicleCollisionCount,
      sharedTextures: manifest?.stats?.sharedTextureCount || 0,
      sharedTextureBytes: manifest?.stats?.sharedTextureBytes || 0,
      infrastructureLoaded: Boolean(infrastructureEntity),
      infrastructureBytes: manifest?.infrastructureSizeBytes || 0,
      totalCellLoads,
      totalCellUnloads,
      totalColliderAdds,
      totalColliderRemoves,
      inFlightLoads: [...records.values()].filter(record => Boolean(record.visualPromise)).length,
      errors: errors.slice(-8)
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const record of [...records.values()]) unloadCell(record);
    if (infrastructureEntity) {
      try { infrastructureEntity.destroy(); } catch {}
      infrastructureEntity = null;
    }
    if (infrastructureAsset) {
      try { app.assets.remove(infrastructureAsset); } catch {}
      infrastructureAsset = null;
    }
    ready = false;
  }

  return {
    start: ensureInfrastructure,
    update,
    getState,
    destroy
  };
}
