import { Color } from 'playcanvas';

/**
 * Phase 1 daylight system for Naija City.
 *
 * Uses one fixed directional sun, flat ambient fill and a single nearby
 * shadow map. Expensive atmosphere and post-processing are deliberately absent.
 */
export function createWorldLighting({ app, camera, sun, lowMemoryDevice = false }) {
  // Fixed, neutral-warm daylight. isStatic is an optimization hint: the
  // directional light never moves. Shadows remain realtime for moving actors.
  sun.setEulerAngles(48, 28, 0);
  sun.light.isStatic = true;
  sun.light.color = new Color(1.0, 0.96, 0.90);
  sun.light.intensity = 1.35;

  // One directional shadow map; keep the default PCF 3x3 filter and one cascade.
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 42 : 68;
  sun.light.numCascades = 1;
  sun.light.shadowIntensity = 0.62;

  // Slightly stronger neutral sky fill lifts facades facing away from the sun.
  // Exposure stays neutral so bright plaster and concrete do not wash out.
  const ambient = new Color(0.38, 0.40, 0.43);
  app.scene.ambientLight = ambient;
  app.scene.exposure = 1.0;
  camera.camera.clearColor = new Color(0.46, 0.65, 0.84);

  // Only substantial building shells, roofs and essential tall structures cast
  // realtime shadows. Windows, grilles, small props, furniture and road decals
  // still receive shadows but do not all enter the shadow pass.
  const importantArchitecture = /residential-house-shell|residential-house-roof|mixed-use-commercial-shell|commercial-roof-parapet|transport-hall-main-shell|transport-hall-roof|bridge-(deck|pier|abutment|girder|support)|streetlight-pole|utility-pole|bus-shelter-roof|shelter-roof/i;
  const detailArchitecture = /roof|tank|canopy|parapet|plinth/i;
  const neighbourhoodStructure = /-(rear-wall|left-wall|right-wall|front-left|front-right|door-lintel|roof)$/i;
  const gidiBuildingName = /building|house|tower|mall|office|apartment|warehouse|shop|structure|facade|residential|commercial/i;

  function shouldCastShadow(component) {
    // Keep actual skinned characters casting a silhouette, but avoid shadows
    // from every decorative pedestrian prop and static street-detail mesh.
    if (component.meshInstances?.some(instance => Boolean(instance.skinInstance))) return true;

    let node = component.entity;
    let insideGidiCell = false;
    while (node) {
      const name = String(node.name || '');
      const lowerName = name.toLowerCase();
      const tags = node.tags;
      if (lowerName.startsWith('stage08e-')) return true;

      if (tags?.has('stage08a-building') || tags?.has('stage08a-roof') ||
          tags?.has('stage08d-building')) return true;

      if (tags?.has('stage08d-architecture') && detailArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08i-ikeja-district') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08n-neighbourhood') && neighbourhoodStructure.test(lowerName)) return true;
      if (tags?.has('stage08c-street-detail') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08k-gidi-road-detail') && /bridge-(deck|pier|abutment|girder|support)/i.test(lowerName)) return true;

      if (lowerName.startsWith('gidi-cell-')) insideGidiCell = true;
      if (insideGidiCell && gidiBuildingName.test(lowerName)) return true;
      node = node.parent;
    }
    return false;
  }

  const shadowPolicy = {
    scans: 0,
    componentsSeen: 0,
    castingComponents: 0,
    receivingComponents: 0,
    lastScanMs: 0
  };

  function applyShadowPolicy() {
    const started = (typeof performance !== 'undefined' ? performance.now() : 0);
    const components = app.root.findComponents('render') || [];
    let casting = 0;
    let receiving = 0;
    for (const component of components) {
      const cast = shouldCastShadow(component);
      component.castShadows = cast;
      // Preserve receive-side shading on every visible material, including props.
      component.receiveShadows = true;
      if (cast) casting++;
      if (component.receiveShadows) receiving++;
    }
    shadowPolicy.scans++;
    shadowPolicy.componentsSeen = components.length;
    shadowPolicy.castingComponents = casting;
    shadowPolicy.receivingComponents = receiving;
    const ended = (typeof performance !== 'undefined' ? performance.now() : started);
    shadowPolicy.lastScanMs = Number((ended - started).toFixed(2));
  }

  let scanElapsed = 0;
  let initialScanDone = false;
  const update = (dt = 0) => {
    scanElapsed += Math.max(0, Math.min(Number(dt) || 0, 0.1));
    // Scan at low frequency to include GLBs as they stream in without paying
    // for a full hierarchy traversal every rendered frame.
    if (!initialScanDone || scanElapsed >= 1.0) {
      scanElapsed = 0;
      applyShadowPolicy();
      initialScanDone = true;
    }
  };

  const getState = () => ({
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
  });

  return {
    update,
    getState,
    destroy() {
      // No post effects or auxiliary GPU resources are allocated.
    }
  };
}
