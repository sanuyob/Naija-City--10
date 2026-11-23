import * as pc from 'playcanvas';

function makeCloudMesh(device) {
  const positions = [], normals = [], indices = [], segments = 10;
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI * 0.2, radius = 390 + (i % 3) * 35;
    const nx = Math.cos(angle), nz = Math.sin(angle), tx = -nz, tz = nx;
    for (let j = 0; j < 3; j++) {
      const offset = (j - 1) * 27, cx = nx * radius + tx * offset, cz = nz * radius + tz * offset;
      const cy = j === 1 ? 0 : (j === 0 ? 4 : -3), rx = j === 1 ? 54 : 40, ry = j === 1 ? 15 : 12;
      const base = positions.length / 3;
      positions.push(cx, cy, cz); normals.push(-nx, 0, -nz);
      for (let s = 0; s < segments; s++) {
        const a = s * Math.PI * 2 / segments, ca = Math.cos(a), sa = Math.sin(a);
        positions.push(cx + tx * ca * rx, cy + sa * ry, cz + tz * ca * rx);
        normals.push(-nx, 0, -nz);
      }
      for (let s = 0; s < segments; s++) indices.push(base, base + 1 + s, base + 1 + ((s + 1) % segments));
    }
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(new Float32Array(positions));
  mesh.setNormals(new Float32Array(normals));
  mesh.setIndices(new Uint16Array(indices));
  mesh.update();
  return { mesh, puffCount: 30, triangleCount: indices.length / 3 };
}

const DAY_PROFILE = [
  [0,0.025,0.38,0.44,0.68,0.22,0.25,0.34,0.055,0.075,0.15,0.25],
  [6,0.18,1.00,0.48,0.25,0.22,0.20,0.23,0.78,0.38,0.25,0.55],
  [9.25,1.35,1.00,0.96,0.90,0.50,0.52,0.56,0.46,0.65,0.84,0.72],
  [12,1.42,1.00,0.98,0.94,0.49,0.52,0.57,0.39,0.61,0.85,0.72],
  [18,0.48,1.00,0.52,0.29,0.30,0.26,0.28,0.91,0.47,0.29,0.58],
  [20,0.025,0.38,0.44,0.68,0.22,0.25,0.34,0.055,0.075,0.15,0.25],
];

function sampleProfile(hours) {
  const h = ((hours % 24) + 24) % 24;
  let i = 1;
  while (i < DAY_PROFILE.length - 1 && DAY_PROFILE[i][0] < h) i++;
  const a = DAY_PROFILE[i - 1], b = DAY_PROFILE[i];
  const t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
  const v = n => a[n] + (b[n] - a[n]) * t;
  return {
    intensity: v(1),
    sun: [v(2), v(3), v(4)],
    ambient: [v(5), v(6), v(7)],
    sky: [v(8), v(9), v(10)],
    cloudOpacity: v(11)
  };
}

function sunElevation(hours) {
  if (hours < 6) return -10;
  if (hours <= 9.25) return 42 * ((hours - 6) / 3.25);
  if (hours <= 12) return 42 + 23 * ((hours - 9.25) / 2.75);
  if (hours <= 18) return 65 * ((18 - hours) / 6);
  if (hours <= 20) return -10 * ((hours - 18) / 2);
  return -10;
}

/**
 * Mobile-first daylight and atmosphere.
 * Daylight at 09:15 retains the approved sun, ambient fill, exposure and shadows.
 * Clouds use one merged mesh (one extra draw call), with no shadow pass.
 * Night fill is lifted slightly so unlit streets remain readable without adding light sources.
 */
export function createWorldLighting({ app, camera, sun, lowMemoryDevice = false }) {
  sun.setEulerAngles(48, 28, 0);
  sun.light.isStatic = false;
  sun.light.color = new pc.Color(1.0, 0.96, 0.90);
  sun.light.intensity = 1.35;
  sun.light.castShadows = true;
  sun.light.shadowResolution = lowMemoryDevice ? 512 : 1024;
  sun.light.shadowDistance = lowMemoryDevice ? 42 : 68;
  sun.light.numCascades = 1;
  sun.light.shadowIntensity = 0.62;

  const ambient = new pc.Color(0.50, 0.52, 0.56);
  app.scene.ambientLight = ambient;
  app.scene.exposure = 1.0;
  // One scene-wide linear fog pass: no extra geometry, lights or post-processing.
  app.scene.fog.type = pc.FOG_LINEAR;
  app.scene.fog.start = lowMemoryDevice ? 235 : 285;
  app.scene.fog.end = lowMemoryDevice ? 610 : 790;
  app.scene.fog.color = new pc.Color(0.46, 0.65, 0.84);
  camera.camera.clearColor = new pc.Color(0.46, 0.65, 0.84);

  const cloudData = makeCloudMesh(app.graphicsDevice);
  const cloudMaterial = new pc.StandardMaterial();
  cloudMaterial.name = 'NaijaCity_LowCost_CloudLayer';
  cloudMaterial.diffuse = new pc.Color(0.92, 0.95, 0.99);
  cloudMaterial.emissive = new pc.Color(0.10, 0.11, 0.13);
  cloudMaterial.opacity = 0.72;
  cloudMaterial.blendType = pc.BLEND_NORMAL;
  cloudMaterial.depthWrite = false;
  cloudMaterial.cull = pc.CULLFACE_NONE;
  cloudMaterial.update();

  const cloudInstance = new pc.MeshInstance(cloudData.mesh, cloudMaterial);
  cloudInstance.castShadow = false;
  cloudInstance.receiveShadow = false;
  const cloudEntity = new pc.Entity('naija-city-single-batch-cloud-layer');
  cloudEntity.addComponent('render', { meshInstances: [cloudInstance] });
  cloudEntity.render.castShadows = false;
  cloudEntity.render.receiveShadows = false;
  app.root.addChild(cloudEntity);

  const importantArchitecture = /residential-house-shell|residential-house-roof|mixed-use-commercial-shell|commercial-roof-parapet|transport-hall-main-shell|transport-hall-roof|bridge-(deck|pier|abutment|girder|support)|streetlight-pole|utility-pole|bus-shelter-roof|shelter-roof/i;
  const detailArchitecture = /roof|tank|canopy|parapet|plinth/i;
  const neighbourhoodStructure = /-(rear-wall|left-wall|right-wall|front-left|front-right|door-lintel|roof)$/i;
  const gidiBuildingName = /building|house|tower|mall|office|apartment|warehouse|shop|structure|facade|residential|commercial/i;

  function shouldCastShadow(component) {
    if (component.meshInstances?.some(instance => Boolean(instance.skinInstance))) return true;
    const pathNames = [];
    let node = component.entity;
    while (node) {
      const lowerName = String(node.name || '').toLowerCase();
      pathNames.push(lowerName);
      const tags = node.tags;
      if (lowerName.startsWith('stage08e-')) return true;
      if (tags?.has('stage08a-building') || tags?.has('stage08a-roof') || tags?.has('stage08d-building')) return true;
      if (tags?.has('stage08d-architecture') && detailArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08i-ikeja-district') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08n-neighbourhood') && neighbourhoodStructure.test(lowerName)) return true;
      if (tags?.has('stage08c-street-detail') && importantArchitecture.test(lowerName)) return true;
      if (tags?.has('stage08k-gidi-road-detail') && /bridge-(deck|pier|abutment|girder|support)/i.test(lowerName)) return true;
      if (lowerName.startsWith('gidi-cell-') && gidiBuildingName.test(pathNames.join(' '))) return true;
      node = node.parent;
    }
    return false;
  }

  const shadowPolicy = {
    fullSceneScans: 0, componentsSeen: 0, castingComponents: 0, receivingComponents: 0,
    registeredEntities: 0, registeredComponents: 0, initialScanMs: 0, lastEntityApplyMs: 0
  };

  function applyComponents(components) {
    let casting = 0, receiving = 0;
    for (const component of components) {
      const cloudLayer = component.entity?.name === 'naija-city-single-batch-cloud-layer';
      const cast = cloudLayer ? false : shouldCastShadow(component);
      const receive = !cloudLayer;
      if (component.castShadows !== cast) component.castShadows = cast;
      if (component.receiveShadows !== receive) component.receiveShadows = receive;
      if (cast) casting++;
      if (receive) receiving++;
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

  let gameHours = 9.25;
  let profileAccumulator = 0;
  let shadowAccumulator = 0;
  let lastSunElevation = 42;

  function applyProfile() {
    const profile = sampleProfile(gameHours);
    sun.light.intensity = profile.intensity;
    sun.light.color = new pc.Color(...profile.sun);
    app.scene.ambientLight = new pc.Color(...profile.ambient);
    camera.camera.clearColor = new pc.Color(...profile.sky);
    // Match fog to the sky so distant buildings fade naturally into the horizon.
    app.scene.fog.color = new pc.Color(...profile.sky);
    const night = gameHours >= 19 || gameHours < 6;
    app.scene.fog.start = night ? (lowMemoryDevice ? 165 : 205) : (lowMemoryDevice ? 235 : 285);
    app.scene.fog.end = night ? (lowMemoryDevice ? 500 : 650) : (lowMemoryDevice ? 610 : 790);
    // The existing directional light becomes a soft cool moonlight at night;
    // it remains the only directional light and never casts night shadows.
    sun.light.castShadows = !night && gameHours >= 6.15 && gameHours <= 18.6;
    cloudMaterial.opacity = night ? 0.18 : 0.72;
    cloudMaterial.update();
  }

  function applySunAndShadow() {
    const elevation = sunElevation(gameHours);
    lastSunElevation = elevation;
    const azimuth = 28 + (gameHours - 9.25) * 15;
    sun.setEulerAngles(90 - elevation, azimuth, 0);
    const daylight = gameHours >= 6.15 && gameHours <= 18.6;
    sun.light.castShadows = daylight;
    sun.light.shadowUpdateMode = daylight ? pc.SHADOWUPDATE_THISFRAME : pc.SHADOWUPDATE_NONE;
  }

  function setTimeHours(hours) {
    gameHours = ((Number(hours) % 24) + 24) % 24;
    applyProfile();
    applySunAndShadow();
    shadowAccumulator = 0;
    profileAccumulator = 0;
    return Number(gameHours.toFixed(3));
  }

  applyProfile();
  applySunAndShadow();

  return {
    update(dt) {
      const delta = Math.max(0, Math.min(Number(dt) || 0, 0.1));
      gameHours = (gameHours + delta / 60) % 24;
      profileAccumulator += delta;
      shadowAccumulator += delta;

      if (profileAccumulator >= 1) {
        profileAccumulator %= 1;
        applyProfile();
      }
      // Update the directional shadow map only once every two real seconds.
      // At the 24-minute day length this advances the sun by about half a degree.
      if (shadowAccumulator >= 2) {
        shadowAccumulator %= 2;
        applySunAndShadow();
      }

      const cameraPosition = camera.getPosition();
      cloudEntity.setPosition(cameraPosition.x, 245, cameraPosition.z);
    },
    setTimeHours,
    applyInitialShadowPolicy,
    applyToEntity,
    getState() {
      const profile = sampleProfile(gameHours);
      const hour = Math.floor(gameHours), minute = Math.floor((gameHours - hour) * 60);
      return {
        enabled: true,
        mode: 'low-cost-day-night-cycle',
        timeHours: Number(gameHours.toFixed(3)),
        timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        sunIntensity: Number(sun.light.intensity.toFixed(3)),
        sunColor: sun.light.color.toArray(),
        ambientLight: app.scene.ambientLight.toArray(),
        exposure: app.scene.exposure,
        sunElevation: Number(lastSunElevation.toFixed(1)),
        shadows: sun.light.castShadows,
        shadowResolution: sun.light.shadowResolution,
        shadowDistance: sun.light.shadowDistance,
        shadowCascades: sun.light.numCascades,
        shadowIntensity: sun.light.shadowIntensity,
        shadowUpdateMode: 'on-demand-every-2-seconds',
        shadowPolicy: { ...shadowPolicy },
        clouds: { enabled: true, drawCalls: 1, puffCount: cloudData.puffCount, triangles: cloudData.triangleCount, nightOpacity: 0.18 },
        fog: { enabled: true, type: 'linear', start: app.scene.fog.start, end: app.scene.fog.end, color: app.scene.fog.color.toArray(), sceneWide: true, extraDrawCalls: 0 },
        nightLighting: { enabled: true, method: 'cool low-intensity directional moonlight + blue ambient fill', extraLights: 0, night: gameHours >= 19 || gameHours < 6 },
        skySimulation: 'disabled',
        environmentBake: 'disabled'
      };
    },
    destroy() {
      cloudEntity.destroy();
      cloudData.mesh.destroy();
      cloudMaterial.destroy();
    }
  };
}
