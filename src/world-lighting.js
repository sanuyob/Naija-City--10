import * as pc from 'playcanvas';

function makeCloudMesh(device) {
  const positions = [], normals = [], indices = [];
  const segments = 8, rings = 4;
  const puffs = [];

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const radius = 390 + (i % 3) * 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    puffs.push([x, 0, z, 54, 15, 36]);
    puffs.push([x + Math.cos(angle + 0.9) * 34, 2, z + Math.sin(angle + 0.9) * 34, 39, 12, 29]);
    puffs.push([x + Math.cos(angle - 0.8) * 31, -1, z + Math.sin(angle - 0.8) * 31, 42, 13, 30]);
  }

  for (const [cx, cy, cz, rx, ry, rz] of puffs) {
    const base = positions.length / 3;
    for (let ring = 0; ring <= rings; ring++) {
      const phi = (ring / rings) * Math.PI;
      const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
      for (let segment = 0; segment <= segments; segment++) {
        const theta = (segment / segments) * Math.PI * 2;
        const ux = Math.cos(theta) * sinPhi;
        const uy = cosPhi;
        const uz = Math.sin(theta) * sinPhi;
        positions.push(cx + ux * rx, cy + uy * ry, cz + uz * rz);
        const nx = ux / rx, ny = uy / ry, nz = uz / rz;
        const length = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / length, ny / length, nz / length);
      }
    }
    for (let ring = 0; ring < rings; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = base + ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  const mesh = new pc.Mesh(device);
  mesh.setPositions(new Float32Array(positions));
  mesh.setNormals(new Float32Array(normals));
  mesh.setIndices(new Uint16Array(indices));
  mesh.update();
  return { mesh, puffCount: puffs.length, triangleCount: indices.length / 3 };
}

const DAY_PROFILE = [
  { h: 0, intensity: 0.015, sun: [0.34, 0.40, 0.62], ambient: [0.13, 0.15, 0.23], sky: [0.035, 0.055, 0.13], cloud: [0.30, 0.35, 0.48], cloudOpacity: 0.25 },
  { h: 5, intensity: 0.015, sun: [0.38, 0.42, 0.62], ambient: [0.13, 0.15, 0.23], sky: [0.045, 0.065, 0.15], cloud: [0.32, 0.37, 0.50], cloudOpacity: 0.25 },
  { h: 6, intensity: 0.18, sun: [1.00, 0.48, 0.25], ambient: [0.22, 0.20, 0.23], sky: [0.78, 0.38, 0.25], cloud: [0.70, 0.55, 0.52], cloudOpacity: 0.55 },
  { h: 7, intensity: 0.72, sun: [1.00, 0.72, 0.50], ambient: [0.35, 0.34, 0.38], sky: [0.55, 0.68, 0.82], cloud: [0.84, 0.84, 0.85], cloudOpacity: 0.68 },
  { h: 9.25, intensity: 1.35, sun: [1.00, 0.96, 0.90], ambient: [0.50, 0.52, 0.56], sky: [0.46, 0.65, 0.84], cloud: [0.92, 0.95, 0.99], cloudOpacity: 0.72 },
  { h: 12, intensity: 1.42, sun: [1.00, 0.98, 0.94], ambient: [0.49, 0.52, 0.57], sky: [0.39, 0.61, 0.85], cloud: [0.94, 0.96, 1.00], cloudOpacity: 0.72 },
  { h: 16, intensity: 1.12, sun: [1.00, 0.84, 0.68], ambient: [0.43, 0.45, 0.50], sky: [0.72, 0.64, 0.53], cloud: [0.91, 0.88, 0.84], cloudOpacity: 0.68 },
  { h: 18, intensity: 0.48, sun: [1.00, 0.52, 0.29], ambient: [0.30, 0.26, 0.28], sky: [0.91, 0.47, 0.29], cloud: [0.76, 0.55, 0.48], cloudOpacity: 0.58 },
  { h: 19, intensity: 0.08, sun: [0.62, 0.43, 0.42], ambient: [0.17, 0.17, 0.24], sky: [0.15, 0.16, 0.28], cloud: [0.42, 0.43, 0.56], cloudOpacity: 0.38 },
  { h: 20, intensity: 0.015, sun: [0.34, 0.40, 0.62], ambient: [0.13, 0.15, 0.23], sky: [0.035, 0.055, 0.13], cloud: [0.30, 0.35, 0.48], cloudOpacity: 0.25 },
  { h: 24, intensity: 0.015, sun: [0.34, 0.40, 0.62], ambient: [0.13, 0.15, 0.23], sky: [0.035, 0.055, 0.13], cloud: [0.30, 0.35, 0.48], cloudOpacity: 0.25 }
];

function sampleProfile(hours) {
  const h = ((hours % 24) + 24) % 24;
  let nextIndex = DAY_PROFILE.findIndex(point => point.h >= h);
  if (nextIndex <= 0) nextIndex = 1;
  const a = DAY_PROFILE[nextIndex - 1], b = DAY_PROFILE[nextIndex];
  const t = Math.max(0, Math.min(1, (h - a.h) / (b.h - a.h)));
  const mix = key => a[key].map((value, index) => value + (b[key][index] - value) * t);
  return {
    intensity: a.intensity + (b.intensity - a.intensity) * t,
    sun: mix('sun'), ambient: mix('ambient'), sky: mix('sky'), cloud: mix('cloud'),
    cloudOpacity: a.cloudOpacity + (b.cloudOpacity - a.cloudOpacity) * t
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
 * Fog and volumetric sky effects remain disabled until the draw-call pass is complete.
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
  let shadowUpdates = 0;
  let lastSunElevation = 42;
  let elapsed = 0;

  function applyProfile() {
    const profile = sampleProfile(gameHours);
    sun.light.intensity = profile.intensity;
    sun.light.color = new pc.Color(...profile.sun);
    app.scene.ambientLight = new pc.Color(...profile.ambient);
    camera.camera.clearColor = new pc.Color(...profile.sky);
    cloudMaterial.diffuse = new pc.Color(...profile.cloud);
    cloudMaterial.opacity = profile.cloudOpacity;
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
    if (daylight) shadowUpdates++;
  }

  function setTimeHours(hours) {
    gameHours = ((Number(hours) % 24) + 24) % 24;
    applyProfile();
    applySunAndShadow();
    shadowAccumulator = 0;
    profileAccumulator = 0;
    return getState();
  }

  applyProfile();
  applySunAndShadow();

  return {
    update(dt) {
      const delta = Math.max(0, Math.min(Number(dt) || 0, 0.1));
      elapsed += delta;
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
        dayLengthMinutes: 24,
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
        shadowUpdates,
        shadowPolicy: { ...shadowPolicy },
        clouds: { enabled: true, drawCalls: 1, puffCount: cloudData.puffCount, triangles: cloudData.triangleCount },
        fog: { enabled: false, deferredUntilDrawCallOptimization: true },
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
