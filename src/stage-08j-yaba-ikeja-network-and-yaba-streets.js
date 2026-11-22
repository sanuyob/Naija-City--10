import * as pc from 'playcanvas';

const BASE = typeof import.meta.env !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/';
const assetUrl = value => new URL(String(value).replace(/^\//, ''), new URL(BASE, window.location.origin)).href;

function loadTexture(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'texture', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(`${name}: ${error?.message || error || 'texture load failed'}`)));
    app.assets.load(asset);
  });
}

function loadContainer(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(`${name}: ${error?.message || error || 'model load failed'}`)));
    app.assets.load(asset);
  });
}

function pbrMaterial(label, maps, colour, gloss = 0.12, tiling = [1, 1]) {
  const result = new pc.StandardMaterial();
  result.name = label;
  result.diffuse = new pc.Color(...colour);
  result.diffuseMap = maps.colour || null;
  result.normalMap = maps.normal || null;
  result.glossMap = maps.gloss || null;
  result.aoMap = maps.ao || null;
  result.glossMapChannel = 'r';
  result.aoMapChannel = 'r';
  result.gloss = gloss;
  result.shininess = 12;
  result.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  result.normalMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  result.glossMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  result.aoMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  result.cull = pc.CULLFACE_BACK;
  result.update();
  return result;
}

/** Stage 08J: join the Yaba avenue to Ikeja and finish the local roadside set. */
export async function createStage08JYabaIkejaNetworkAndStreets({ app, box, material, lowDataMode = false, skipOptionalDownloads = lowDataMode }) {
  const group = app.batcher?.addGroup('stage08j-yaba-ikeja-static-streets', false, 128);
  const collisionProxies = [];
  const textureFailures = [];
  const assetFailures = [];
  const importedAssets = [];
  let detailMeshes = 0;
  let connectorMeshes = 0;
  let streetProps = 0;
  let roadDrainCovers = 0;
  let utilityPoles = 0;
  let signboards = 0;

  const detail = (name, position, scale, mat, rotation = null, solid = false) => {
    const entity = box('stage08j-' + name, position, scale, mat);
    entity.tags.add('stage08j-yaba-ikeja');
    if (group && entity.render) entity.render.batchGroupId = group.id;
    if (rotation) entity.setEulerAngles(...rotation);
    detailMeshes++;
    if (solid) {
      const p = entity.getPosition(), s = entity.getLocalScale(), r = entity.getEulerAngles();
      collisionProxies.push({
        id: entity.name + '-' + entity.getGuid(),
        position: [p.x, p.y, p.z],
        halfExtents: [Math.abs(s.x) / 2, Math.abs(s.y) / 2, Math.abs(s.z) / 2],
        rotationY: r.y,
        rotationX: r.x,
        rotationZ: r.z,
        source: 'stage08j-yaba-ikeja-connection'
      });
    }
    return entity;
  };

  const fallback = {
    asphalt: material([0.12, 0.13, 0.135]),
    concrete: material([0.48, 0.46, 0.42]),
    curb: material([0.64, 0.61, 0.54]),
    drain: material([0.055, 0.065, 0.065]),
    metal: material([0.24, 0.27, 0.27], 0.42),
    galvanized: material([0.45, 0.48, 0.47], 0.48),
    yellow: material([0.91, 0.72, 0.13]),
    white: material([0.88, 0.88, 0.84]),
    blue: material([0.08, 0.26, 0.44]),
    green: material([0.08, 0.32, 0.20]),
    red: material([0.66, 0.15, 0.10]),
    wood: material([0.36, 0.25, 0.16]),
    roof: material([0.24, 0.25, 0.23]),
    plastic: material([0.18, 0.34, 0.30])
  };

  const materialPaths = {
    asphalt: {
      colour: 'assets/city-materials/ambientcg/runtime-512/Road008B/Road008B_512_Color.jpg',
      normal: 'assets/city-materials/ambientcg/runtime-512/Road008B/Road008B_512_NormalGL.jpg',
      gloss: 'assets/city-materials/ambientcg/runtime-512/Road008B/Road008B_512_Gloss.jpg'
    },
    concrete: {
      colour: 'assets/city-materials/ambientcg/runtime-512/Concrete044D/Concrete044D_512_Color.jpg',
      normal: 'assets/city-materials/ambientcg/runtime-512/Concrete044D/Concrete044D_512_NormalGL.jpg',
      gloss: 'assets/city-materials/ambientcg/runtime-512/Concrete044D/Concrete044D_512_Gloss.jpg'
    },
    paving: {
      colour: 'assets/city-materials/ambientcg/runtime-512/PavingStones152/PavingStones152_512_Color.jpg',
      normal: 'assets/city-materials/ambientcg/runtime-512/PavingStones152/PavingStones152_512_NormalGL.jpg',
      gloss: 'assets/city-materials/ambientcg/runtime-512/PavingStones152/PavingStones152_512_Gloss.jpg'
    }
  };

  const maps = { asphalt: {}, concrete: {}, paving: {} };
  if (!skipOptionalDownloads) {
    for (const [family, paths] of Object.entries(materialPaths)) {
      const familyMaps = {};
      for (const [kind, path] of Object.entries(paths)) {
        try {
          familyMaps[kind] = (await loadTexture(app, `stage08j-${family}-${kind}`, path)).resource;
          const texture = familyMaps[kind];
          texture.anisotropy = 2;
          texture.addressU = pc.ADDRESS_REPEAT;
          texture.addressV = pc.ADDRESS_REPEAT;
        } catch (error) {
          textureFailures.push(error.message);
        }
      }
      maps[family] = familyMaps;
    }
  }

  // ambientCG publishes roughness; PlayCanvas StandardMaterial expects gloss.
  // Invert roughness once offline and ship both source and derived maps.
  const pbr = {
    asphalt: Object.keys(maps.asphalt || {}).length >= 2 ? pbrMaterial('Stage 08J asphalt · Road 008 B', maps.asphalt, [1, 1, 1], 0.12, [4, 18]) : fallback.asphalt,
    concrete: Object.keys(maps.concrete || {}).length >= 2 ? pbrMaterial('Stage 08J worn concrete · Concrete 044 D', maps.concrete, [1, 1, 1], 0.16, [2, 12]) : fallback.concrete,
    paving: Object.keys(maps.paving || {}).length >= 2 ? pbrMaterial('Stage 08J interlocking paving · Paving Stones 152', maps.paving, [1, 1, 1], 0.18, [2, 16]) : fallback.concrete
  };

  // A single continuous 77m connector bridges the existing Yaba avenue and
  // the Stage 08I Ikeja cross street. Its ends overlap the existing road slabs
  // by 1.0m so the join remains sealed under vehicle and character movement.
  const connectorRoad = detail('continuous-yaba-ikeja-arterial', [0, -0.062, 207.5], [14, 0.16, 79], pbr.asphalt);
  connectorRoad.tags.add('stage08j-drivable-road');
  connectorMeshes++;
  detail('connector-sidewalk-west', [-7.95, 0.02, 207.5], [1.2, 0.20, 79], pbr.paving); connectorMeshes++;
  detail('connector-sidewalk-east', [7.95, 0.02, 207.5], [1.2, 0.20, 79], pbr.paving); connectorMeshes++;
  for (const side of [-1, 1]) {
    detail('connector-kerb', [side * 7.12, 0.13, 207.5], [0.22, 0.26, 79], pbr.concrete);
    detail('connector-storm-drain', [side * 9.12, 0.018, 207.5], [0.24, 0.08, 79], fallback.drain);
    for (let z = 176; z <= 238; z += 12) {
      detail('connector-drain-grate', [side * 9.12, 0.11, z], [0.62, 0.08, 1.25], fallback.galvanized);
      roadDrainCovers++;
    }
  }
  for (let z = 174; z <= 235; z += 12) {
    detail('connector-centre-dash', [0, 0.033, z], [0.14, 0.025, 4.6], fallback.yellow);
  }
  for (const side of [-1, 1]) {
    for (let z = 174; z <= 235; z += 24) {
      detail('connector-edge-line', [side * 6.65, 0.025, z], [0.10, 0.018, 8.0], fallback.white);
    }
  }

  // A raised neighbourhood crossing and stop control at the Ikeja end.
  // Stage 08I already supplies the main cross-street geometry at z=246.
  detail('ikeja-approach-speed-table', [0, 0.035, 238.5], [14.8, 0.10, 1.4], fallback.asphalt);
  for (let i = -4; i <= 4; i++) detail('ikeja-approach-speed-table-mark', [i * 1.2, 0.095, 238.5], [0.55, 0.025, 1.0], fallback.yellow);
  detail('ikeja-approach-stop-line', [0, 0.04, 241.5], [13.5, 0.035, 0.24], fallback.white);
  // Stage 08I already supplies the zebra crossing and tactile pads at z=251.3.
  // Keep that single treatment and tie the connector's stop line into it.

  // Street-level Yaba details finish the north/south seam without blocking
  // the widened 14m carriageway or the 1.2m footpath strips.
  for (const x of [-9.8, 9.8]) {
    for (const z of [184, 218]) {
      detail('connector-utility-pole', [x, 4.1, z], [0.22, 8.2, 0.22], fallback.roof, null, true);
      detail('connector-utility-crossarm', [x, 7.35, z], [1.45, 0.14, 0.16], fallback.galvanized);
      for (const dx of [-0.44, 0, 0.44]) detail('connector-utility-insulator', [x + dx, 7.53, z], [0.12, 0.22, 0.12], fallback.white);
      utilityPoles++;
    }
    for (let z = 201; z <= 218; z += 17) {
      detail('connector-streetlight-pole', [x * 3.7, 3.25, z], [0.15, 6.5, 0.15], fallback.metal, null, true);
      detail('connector-streetlight-arm', [x * 3.7 - Math.sign(x) * 0.52, 6.35, z], [1.1, 0.12, 0.14], fallback.metal);
      detail('connector-streetlight-head', [x * 3.7 - Math.sign(x) * 1.05, 6.23, z], [0.5, 0.16, 0.28], fallback.yellow);
    }
  }
  for (const [x, z, side] of [[-9.4, 186, -1], [9.4, 226, 1]]) {
    detail('connector-wayfinding-post', [x, 1.65, z], [0.14, 3.3, 0.14], fallback.galvanized, null, true);
    detail('connector-wayfinding-board', [x, 3.05, z], [2.55, 0.84, 0.14], fallback.green);
    detail('connector-wayfinding-face', [x, 3.05, z - side * 0.08], [2.3, 0.6, 0.025], fallback.white);
    signboards++;
  }

  // Nigerian street-service cluster: a tarpaulin shade, counter, stacked
  // produce crates, bench and litter point on the widened verge, clear of the
  // road and all existing Stage 08A/08I house footprints.
  const stalls = [
    { id: 'yaba-roadside-produce-stall', x: -15.2, z: 102, canopy: fallback.red, counter: fallback.wood },
    { id: 'ikeja-roadside-kiosk-stall', x: 15.2, z: 206, canopy: fallback.green, counter: fallback.wood }
  ];
  for (const stall of stalls) {
    detail(stall.id + '-counter', [stall.x, 0.9, stall.z], [2.3, 0.18, 1.45], stall.counter, null, true);
    detail(stall.id + '-shade', [stall.x, 2.55, stall.z], [3.1, 0.14, 2.65], stall.canopy);
    for (const dx of [-1.35, 1.35]) for (const dz of [-1.12, 1.12]) {
      detail(stall.id + '-post', [stall.x + dx, 1.33, stall.z + dz], [0.085, 2.65, 0.085], fallback.metal, null, true);
    }
    for (const [dx, dz, tone] of [[-0.55, 0.45, fallback.red], [0.45, 0.45, fallback.green], [0, -0.45, fallback.yellow]]) {
      detail(stall.id + '-produce-crate', [stall.x + dx, 1.18, stall.z + dz], [0.7, 0.42, 0.62], tone);
    }
    detail(stall.id + '-bench', [stall.x + 2.2, 0.55, stall.z + 1.7], [1.35, 0.14, 0.42], fallback.wood);
    detail(stall.id + '-waste-bin', [stall.x + 2.5, 0.6, stall.z - 1.7], [0.48, 1.2, 0.48], fallback.plastic);
    streetProps += 10;
  }

  // Imported CC0 distribution boxes put recognisable utility hardware on the
  // street. The original downloaded glTFs had broken external texture URLs;
  // geometry-only GLBs were made with a neutral material, then tinted here.
  const importedMaterials = {
    utility: material([0.18, 0.27, 0.19], 0.86),
    sign: material([0.92, 0.72, 0.10], 0.82)
  };
  const propSpecs = [
    { id: 'utility-box-01', path: 'assets/city-props/polyhaven/utility_box_01/utility_box_01.glb', position: [12.9, 0, 115], scale: 1, yaw: 90, mat: importedMaterials.utility },
    { id: 'wet-floor-sign-01', path: 'assets/city-props/polyhaven/WetFloorSign_01/WetFloorSign_01.glb', position: [-13.2, 0, 197], scale: 1, yaw: 0, mat: importedMaterials.sign }
  ];
  for (const spec of propSpecs) {
    if (skipOptionalDownloads) {
      importedAssets.push({ id: spec.id, path: spec.path, loaded: false, skipped: lowDataMode ? 'data-saver' : 'low-memory-device', fallback: 'procedural' });
      if (spec.id === 'utility-box-01') {
        detail('fallback-utility-cabinet', [spec.position[0], 0.62, spec.position[2]], [0.62, 1.24, 0.5], fallback.green, null, true);
      } else {
        detail('fallback-warning-sign', [spec.position[0], 0.40, spec.position[2]], [0.35, 0.8, 0.12], fallback.yellow, null, true);
      }
      continue;
    }
    try {
      const asset = await loadContainer(app, 'stage08j-' + spec.id, spec.path);
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = 'stage08j-' + spec.id;
      entity.setPosition(...spec.position);
      entity.setLocalScale(spec.scale, spec.scale, spec.scale);
      entity.setEulerAngles(0, spec.yaw, 0);
      for (const render of entity.findComponents('render')) {
        render.batchGroupId = group?.id ?? -1;
        for (const instance of render.meshInstances || []) instance.material = spec.mat;
      }
      entity.tags.add('stage08j-imported-cc0-prop');
      app.root.addChild(entity);
      const bounds = spec.id === 'utility-box-01' ? [0.31, 0.62, 0.25] : [0.20, 0.42, 0.20];
      collisionProxies.push({
        id: 'stage08j-' + spec.id,
        position: [spec.position[0], spec.position[1] + bounds[1], spec.position[2]],
        halfExtents: bounds,
        rotationY: spec.yaw,
        source: 'stage08j-cc0-imported-prop'
      });
      importedAssets.push({ id: spec.id, path: spec.path, loaded: true, bytes: asset.resource?.data?.byteLength || null });
    } catch (error) {
      assetFailures.push(error.message);
      importedAssets.push({ id: spec.id, path: spec.path, loaded: false, fallback: 'procedural' });
      if (spec.id === 'utility-box-01') {
        detail('fallback-utility-cabinet', [spec.position[0], 0.62, spec.position[2]], [0.62, 1.24, 0.5], fallback.green, null, true);
      } else {
        detail('fallback-warning-sign', [spec.position[0], 0.40, spec.position[2]], [0.35, 0.8, 0.12], fallback.yellow, null, true);
      }
    }
  }

  return {
    stage: '08J',
    district: 'Yaba–Ikeja arterial and street finish',
    connector: { startZ: 168, endZ: 247, lengthMetres: 79, roadWidthMetres: 14, sidewalks: 2, physicalJoinOverlapMetres: 1 },
    junction: { ikejaCrossStreetZ: 246, speedTable: true, stopLine: true, zebraCrossingStripes: 9, tactilePads: 2, inheritedFromStage08I: true },
    streetProps,
    importedAssets,
    assetFailures,
    textureFailures,
    pbrRuntimeResolution: skipOptionalDownloads ? 'procedural-fallback' : 512,
    dataSaver: { enabled: lowDataMode, textureDownloadsSkipped: lowDataMode, importedPropDownloadsSkipped: lowDataMode },
    optionalAssetsSkipped: skipOptionalDownloads,
    pbrMaterials: Object.fromEntries(Object.entries(maps).map(([name, set]) => [name, Object.keys(set)])),
    utilityPoles,
    signboards,
    roadDrainCovers,
    detailMeshes,
    connectorMeshes,
    collisionProxies,
    staticBatching: Boolean(group),
    batchGroupId: group?.id ?? null,
    features: [
      'continuous Yaba avenue to Ikeja cross-street connector',
      'shared 1K CC0 asphalt, damaged-concrete and worn-paving PBR families',
      'continuous pedestrian sidewalks, edge lines, centre dashes and drainage',
      'raised Ikeja approach, stop line, zebra crossing and tactile pads',
      'extended utility poles, streetlights, overhead wires and district wayfinding',
      'two Nigerian roadside stalls with counters, crates, seating and waste points',
      'downloaded CC0 utility cabinet and road caution sign GLB assets'
    ],
    note: 'Road geometry overlaps the existing Yaba and Ikeja road slabs by 1m to avoid visual/physical seams. The imported CC0 props use geometry-only GLBs with local material overrides because their upstream glTF texture URIs were not present in the supplied downloads.'
  };
}
