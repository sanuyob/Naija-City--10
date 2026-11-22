import { Color } from 'playcanvas';

/**
 * Phase 1 daylight system for Naija City.
 *
 * One fixed directional sun, flat ambient fill and a single nearby shadow map.
 * Clouds, fog, sky simulation and post-processing are deliberately deferred.
 */
export function createWorldLighting({ app, camera, sun, lowMemoryDevice = false }) {
  sun.setEulerAngles(48, 28, 0);
  sun.light.isStatic = true;
  sun.light.color = new Color(1.0, 0.96, 0.90);
  sun.light.intensity = 1.35;

  // One realtime directional shadow map, one cascade, default PCF 3x3 filter.
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 42 : 68;
  sun.light.numCascades = 1;
  sun.light.shadowIntensity = 0.62;

  // Neutral sky fill keeps shaded facades readable without washing out sunlight.
  const ambient = new Color(0.50, 0.52, 0.56);
  app.scene.ambientLight = ambient;
  app.scene.exposure = 1.0;
  camera.camera.clearColor = new Color(0.46, 0.65, 0.84);

  const importantArchitecture = /residential-house-shell|residential-house-roof|mixed-use-commercial-shell|commercial-roof-parapet|transport-hall-main-shell|transport-hall-roof|bridge-(deck|pier|abutment|girder|support)|streetlight-pole|utility-pole|bus-shelter-roof|shelter-roof/i;
  const detailArchitecture = /roof|tank|canopy|parapet|plinth/i;
  const neighbourhoodStructure = /-(rear-wall|left-wall|right-wall|front-left|front-right|door-lintel|roof)$/i;
  const gidiBuildingName = /building|house|tower|mall|office|apartment|warehouse|shop|structure|facade|residential|commercial/i;

  function shouldCastShadow(component) {
    // Retain dynamic character silhouettes while excluding small static clutter.
    if (component.meshInstances?.some(instance => Boolean(instance.skinInstance))) return true;

    const pathNames = [];
    let node = component.entity;
    while (node) {
      const lowerName = String(node.name || '').toLowerCase();
      pathNames.push(lowerName);
      const tags = node.tags;

      if (lowerName.startsWith('stage08e-')) return true;
      if (tags?.has('stage08a-building') || tags?.has('stage08a-roof') ||
          tags?.has('stage08d-building')) return true;
      if (tags?.has('stage08d-architecture') && detailArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08i-ikeja-district') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08n-neighbourhood') && neighbourhoodStructure.test(lowerName)) return true;
      if (tags?.has('stage08c-street-detail') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08k-gidi-road-detail') &&
          /bridge-(deck|pier|abutment|girder|support)/i.test(lowerName)) return true;

      // GIDI cells contain named building/structure meshes beneath a cell root.
      // Check the complete descendant-to-root name path once the cell is found.
      if (lowerName.startsWith('gidi-cell-') && gidiBuildingName.test(pathNames.join(' '))) return true;
      node = node.parent;
    }
    return false;
  }

  const shadowPolicy = {
    fullSceneScans: 0,
    componentsSeen: 0,
    castingComponents: 0,
    receivingComponents: 0,
    registeredEntities: 0,
    registeredComponents: 0,
    initialScanMs: 0,
    lastEntityApplyMs: 0
  };

  function applyComponents(components) {
    let casting = 0;
    let receiving = 0;
    for (const component of components) {
      const cast = shouldCastShadow(component);
      // Avoid reassigning unchanged flags; this keeps newly streamed registration cheap.
      if (component.castShadows !== cast) component.castShadows = cast;
      if (component.receiveShadows !== true) component.receiveShadows = true;
      if (cast) casting++;
      if (component.receiveShadows) receiving++;
    }
    return { casting, receiving, count: components.length };
  }

  let initialScanDone = false;
  function applyInitialShadowPolicy() {
    if (initialScanDone) return { ...shadowPolicy };
    const started = typeof performance !== 'undefined' ? performance.now() : 0;
    const components = app.root.findComponents('render') || [];
    const result = applyComponents(components);
    shadowPolicy.fullSceneScans = 1;
    shadowPolicy.componentsSeen = result.count;
    shadowPolicy.castingComponents = result.casting;
    shadowPolicy.receivingComponents = result.receiving;
    shadowPolicy.initialScanMs = Number(((typeof performance !== 'undefined' ? performance.now() : started) - started).toFixed(2));
    initialScanDone = true;
    return { ...shadowPolicy };
  }

  // Called only for a newly streamed GLB/root, never as a whole-scene update loop.
  function applyToEntity(entity) {
    if (!entity) return { casting: 0, receiving: 0, count: 0 };
    const started = typeof performance !== 'undefined' ? performance.now() : 0;
    const components = entity.findComponents?.('render') || [];
    const result = applyComponents(components);
    shadowPolicy.registeredEntities++;
    shadowPolicy.registeredComponents += result.count;
    shadowPolicy.castingComponents += result.casting;
    shadowPolicy.receivingComponents += result.receiving;
    shadowPolicy.lastEntityApplyMs = Number(((typeof performance !== 'undefined' ? performance.now() : started) - started).toFixed(2));
    return result;
  }

  return {
    update() {
      // No per-frame lighting simulation or hierarchy-wide shadow scan.
    },
    applyInitialShadowPolicy,
    applyToEntity,
    getState() {
      return {
        enabled: true,
        mode: 'static-daylight-baseline',
        sunIntensity: sun.light.intensity,
        sunColor: sun.light.color.toArray(),
        ambientLight: ambient.toArray(),
        exposure: app.scene.exposure,
        shadows: sun.light.castShadows,
        shadowResolution: sun.light.shadowResolution,
        shadowDistance: sun.light.shadowDistance,
        shadowCascades: sun.light.numCascades,
        shadowIntensity: sun.light.shadowIntensity,
        shadowUpdateMode: 'realtime-for-moving-actors',
        shadowPolicy: { ...shadowPolicy },
        atmosphericEffects: false
      };
    },
    destroy() {
      // No post effects or auxiliary GPU resources are allocated.
    }
  };
}
