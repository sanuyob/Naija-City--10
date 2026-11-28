import * as pc from 'playcanvas';

const DISTRICTS = {
  alimosho: { label: 'Alimosho', center: [-250, 390], half: [92, 82], description: 'Rooming-house streets, roadside market, bus interchange and open storm drainage.' },
  lekki: { label: 'Lekki', center: [250, 270], half: [92, 78], description: 'Gated modern estates, mixed-use frontage, coastal wetlands and retention drainage.' },
  victoriaIsland: { label: 'Victoria Island', center: [250, 45], half: [90, 74], description: 'Commercial towers, hotels, converted older homes, landscaped streets and plazas.' },
  ekoAtlantic: { label: 'Eko Atlantic', center: [500, 45], half: [112, 78], description: 'Planned waterfront blocks, sheet-pile canal walls, bridge spans, marina edge and rock-armoured sea defence.' },
  ekiti: { label: 'Ekiti Uplands', center: [-250, 650], half: [96, 88], description: 'Yoruba courtyard compounds, laterite surfaces, green ridges and granite outcrops.' }
};

export function createStage08LDistrictRollout({ app, box, material, lowMemoryDevice = false }) {
  const m = {
    asphalt: material([0.105, 0.12, 0.13]), asphaltPatch: material([0.17, 0.17, 0.16]),
    concrete: material([0.47, 0.46, 0.42]), curb: material([0.58, 0.56, 0.49]),
    paleConcrete: material([0.66, 0.64, 0.57]), dark: material([0.045, 0.055, 0.06]),
    plaster: [material([0.72, 0.62, 0.48]), material([0.62, 0.66, 0.61]), material([0.76, 0.72, 0.62])],
    agedPlaster: material([0.46, 0.39, 0.29]), cream: material([0.86, 0.80, 0.67]),
    terracotta: material([0.48, 0.22, 0.13]), rustRoof: material([0.31, 0.16, 0.11]),
    roof: material([0.19, 0.21, 0.21]), timber: material([0.29, 0.18, 0.11]),
    metal: material([0.19, 0.22, 0.23], 0.42), rust: material([0.38, 0.18, 0.10]),
    glass: material([0.13, 0.25, 0.28], 0.22), blueGlass: material([0.12, 0.27, 0.36], 0.20),
    green: material([0.14, 0.30, 0.19]), grass: material([0.20, 0.32, 0.18]),
    deepGrass: material([0.12, 0.25, 0.14]), leaf: material([0.15, 0.36, 0.20]),
    laterite: material([0.55, 0.30, 0.17]), rock: material([0.35, 0.34, 0.31]),
    rockLight: material([0.48, 0.46, 0.40]), sand: material([0.66, 0.55, 0.39]),
    water: material([0.035, 0.22, 0.28], 0.16), waterDark: material([0.025, 0.14, 0.19], 0.18),
    drain: material([0.045, 0.055, 0.05]), white: material([0.87, 0.85, 0.77]),
    yellow: material([0.86, 0.64, 0.16]), signBlue: material([0.035, 0.17, 0.31]),
    signGreen: material([0.035, 0.28, 0.15]), signRed: material([0.53, 0.12, 0.075]),
    canopyA: material([0.55, 0.13, 0.08]), canopyB: material([0.06, 0.28, 0.17]),
    canopyC: material([0.10, 0.20, 0.34]), produce: [material([0.62, 0.15, 0.08]), material([0.24, 0.38, 0.12]), material([0.82, 0.54, 0.11])]
  };

  const districtRoots = {};
  for (const key of Object.keys(DISTRICTS)) {
    districtRoots[key] = new pc.Entity('stage08l-district-' + key);
    app.root.addChild(districtRoots[key]);
  }
  const collisionProxies = [];
  const groundColliders = [];
  const roads = [];
  const mapRecords = [];
  const staticCandidates = [];
  const counts = {
    alimosho: { roomingHouses: 6, shopfronts: 4, marketStalls: 8, transportTerminal: 1, utilityPoles: 8, drainRuns: 2, streetlights: 8 },
    lekki: { estateVillas: 6, apartmentBlocks: 2, retailFronts: 3, wetlandPatches: 2, mangroveTrees: lowMemoryDevice ? 7 : 14, drainChannels: 2, estateGate: 1 },
    victoriaIsland: { officeTowers: 3, hotels: 2, convertedBungalows: 1, streetTrees: lowMemoryDevice ? 6 : 12, plazas: 1, parkingBays: 8 },
    ekoAtlantic: { officeTowers: 4, canalWalls: 2, canalBridges: 2, seawallSegments: 12, tetrapods: 18, marinaPontoons: 4, promenadeRuns: 2 },
    ekiti: { courtyardCompounds: 5, compoundRooms: 20, ridgeForms: 8, rockOutcrops: 10, trees: lowMemoryDevice ? 8 : 16, lateriteRoads: 2 }
  };
  const groups = Object.keys(DISTRICTS);

  // Five small shared maps give the new district family a coherent PBR-like
  // surface response without five separate downloaded texture sets.
  function makeSurfaceMap(label, seed, kind) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    let state = seed >>> 0;
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let wave = 0;
      if (kind === 'plaster') wave = Math.sin(x * 0.11) * 5 + Math.cos(y * 0.15) * 4;
      if (kind === 'metal') wave = Math.sin(y * 1.2) * 8;
      if (kind === 'asphalt') wave = Math.sin(x * 0.4 + y * 0.25) * 3;
      if (kind === 'laterite') wave = Math.sin(y * 0.08) * 8 + Math.cos(x * 0.06) * 6;
      const value = Math.max(0, Math.min(255, 218 + wave + (random() - 0.5) * 28));
      image.data[i] = value; image.data[i + 1] = value; image.data[i + 2] = value; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const texture = new pc.Texture(app.graphicsDevice, { width: size, height: size, format: pc.PIXELFORMAT_R8_G8_B8_A8, mipmaps: true });
    texture.name = 'Stage 08L ' + label;
    texture.setSource(canvas);
    texture.addressU = pc.ADDRESS_REPEAT;
    texture.addressV = pc.ADDRESS_REPEAT;
    texture.anisotropy = 2;
    return texture;
  }
  const surfaces = {
    plaster: makeSurfaceMap('shared painted plaster', 1801, 'plaster'),
    metal: makeSurfaceMap('shared galvanized metal', 1802, 'metal'),
    asphalt: makeSurfaceMap('shared worn asphalt', 1803, 'asphalt'),
    laterite: makeSurfaceMap('shared laterite earth', 1804, 'laterite')
  };
  const finish = (mat, map, tiling = [2, 2]) => {
    mat.diffuseMap = map;
    mat.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
    mat.gloss = 0.12;
    mat.shininess = 9;
    mat.update();
  };
  finish(m.asphalt, surfaces.asphalt, [3.5, 5]);
  finish(m.asphaltPatch, surfaces.asphalt, [2, 2]);
  finish(m.concrete, surfaces.plaster, [2, 2]);
  finish(m.paleConcrete, surfaces.plaster, [2, 2]);
  finish(m.plaster[0], surfaces.plaster, [2.4, 2]);
  finish(m.plaster[1], surfaces.plaster, [2.4, 2]);
  finish(m.plaster[2], surfaces.plaster, [2.4, 2]);
  finish(m.agedPlaster, surfaces.plaster, [2.4, 2]);
  finish(m.metal, surfaces.metal, [2, 3]);
  finish(m.rust, surfaces.metal, [2, 3]);
  finish(m.laterite, surfaces.laterite, [3, 3]);

  function add(district, name, position, scale, mat, yaw = 0, solid = false) {
    const entity = box('stage08l-' + district + '-' + name, position, scale, mat, districtRoots[district]);
    entity.tags.add('stage08l-district-rollout');
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    staticCandidates.push(entity.name);
    if (solid) collisionProxies.push({
      id: entity.name,
      position: position.slice(),
      halfExtents: scale.map(value => Math.abs(value) / 2),
      rotationY: yaw,
      source: 'stage08l-' + district
    });
    return entity;
  }

  function addGround(key, width, depth) {
    const [x, z] = DISTRICTS[key].center;
    add(key, 'ground-pad', [x, -0.36, z], [width, 0.5, depth], m.grass);
    groundColliders.push({
      id: 'stage08l-ground-' + key,
      position: [x, -0.2, z],
      halfExtents: [width / 2, 0.2, depth / 2],
      surface: 'grass'
    });
  }

  function roadBetween(owner, name, start, end, width, surface = 'asphalt') {
    const dx = end[0] - start[0], dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const yaw = angle * 180 / Math.PI;
    const mx = (start[0] + end[0]) / 2, mz = (start[1] + end[1]) / 2;
    const mat = surface === 'laterite' ? m.laterite : m.asphalt;
    add(owner, 'road-' + name, [mx, -0.06, mz], [width, 0.16, length], mat, yaw);
    roads.push({ district: owner, name, start: start.slice(), end: end.slice(), width, length, surface });
    groundColliders.push({
      id: 'stage08l-road-' + owner + '-' + name,
      position: [mx, -0.06, mz],
      halfExtents: [width / 2, 0.08, length / 2],
      rotationY: yaw,
      surface: surface === 'laterite' ? 'dirt' : 'asphalt'
    });
    for (const side of [-1, 1]) {
      const ox = Math.cos(angle) * side * (width / 2 + 1.15);
      const oz = -Math.sin(angle) * side * (width / 2 + 1.15);
      add(owner, 'road-' + name + '-footpath', [mx + ox, 0.015, mz + oz], [1.25, 0.16, length], m.concrete, yaw);
      add(owner, 'road-' + name + '-kerb', [mx + ox - Math.cos(angle) * side * 0.72, 0.13, mz + oz + Math.sin(angle) * side * 0.72], [0.18, 0.24, length], m.curb, yaw);
      add(owner, 'road-' + name + '-gutter', [mx + ox + Math.cos(angle) * side * 0.82, -0.01, mz + oz - Math.sin(angle) * side * 0.82], [0.24, 0.08, length], m.drain, yaw);
    }
    return { x: mx, z: mz, yaw, length };
  }

  function block(owner, name, x, z, width, depth, height, wall, roof, options = {}) {
    const front = options.front ?? 1;
    const floors = options.floors ?? Math.max(1, Math.round(height / 3.1));
    const shell = add(owner, name + '-shell', [x, height / 2, z], [width, height, depth], wall, 0, true);
    add(owner, name + '-roof', [x, height + 0.13, z], [width + 0.42, 0.26, depth + 0.42], roof);
    const faceX = x + front * (width / 2 + 0.08);
    const columns = options.columns ?? 3;
    for (let floor = 0; floor < floors; floor++) {
      const y = 1.45 + floor * (height - 1.4) / floors;
      for (let col = 0; col < columns; col++) {
        const along = (col - (columns - 1) / 2) * (depth / (columns + 0.3));
        add(owner, name + '-window-inset', [faceX, y, z + along], [0.11, 0.92, 1.0], m.dark);
        add(owner, name + '-window-glass', [faceX + front * 0.08, y, z + along], [0.07, 0.72, 0.77], options.glass || m.glass);
        add(owner, name + '-window-sill', [faceX + front * 0.15, y - 0.52, z + along], [0.2, 0.10, 1.12], m.cream);
      }
    }
    add(owner, name + '-entry', [faceX + front * 0.05, 1.12, z], [0.16, 2.22, 1.0], options.door || m.timber);
    if (options.fascia) add(owner, name + '-shop-fascia', [faceX + front * 0.13, 2.72, z], [0.18, 0.5, depth * 0.82], options.fascia);
    return shell;
  }

  function stall(owner, x, z, canopy, name) {
    add(owner, name + '-counter', [x, 0.9, z], [2.7, 0.2, 1.35], m.timber);
    add(owner, name + '-canopy', [x, 2.55, z], [3.35, 0.16, 2.8], canopy);
    for (const dx of [-1.48, 1.48]) for (const dz of [-1.18, 1.18]) {
      add(owner, name + '-post', [x + dx, 1.32, z + dz], [0.09, 2.64, 0.09], m.metal);
    }
    for (const [dx, dz, i] of [[-0.62, 0.38, 0], [0.12, 0.38, 1], [0.76, -0.25, 2]]) {
      add(owner, name + '-produce-crate', [x + dx, 1.2, z + dz], [0.61, 0.46, 0.56], m.produce[i]);
    }
    return true;
  }

  function utilityLine(owner, x, zStart, zEnd, step = 34) {
    const poles = [];
    for (let z = zStart; z <= zEnd; z += step) {
      add(owner, 'utility-pole', [x, 4.0, z], [0.2, 8, 0.2], m.roof, 0, true);
      add(owner, 'utility-crossarm', [x, 7.42, z], [1.55, 0.15, 0.16], m.metal);
      for (const offset of [-0.48, 0, 0.48]) add(owner, 'utility-insulator', [x + offset, 7.62, z], [0.12, 0.2, 0.12], m.white);
      poles.push([x, 7.65, z]);
    }
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      const length = b[2] - a[2];
      add(owner, 'overhead-wire', [x, 7.6, (a[2] + b[2]) / 2], [0.035, 0.035, length], m.dark);
    }
  }

  function addWayfinding(owner, x, z, label, colour = m.signBlue) {
    add(owner, 'wayfinding-post', [x, 1.65, z], [0.13, 3.3, 0.13], m.metal, 0, true);
    add(owner, 'wayfinding-board-' + label, [x, 3.0, z], [2.6, 0.88, 0.16], colour);
  }

  // ALIMOSHO — rooming-house rows, independent shopfronts and a crowded
  // neighbourhood market/transport interchange, with drains kept behind kerbs.
  {
    const key = 'alimosho', [cx, cz] = DISTRICTS[key].center;
    addGround(key, 170, 154);
    roadBetween(key, 'market-spine', [cx - 82, cz], [cx + 82, cz], 12);
    roadBetween(key, 'residential-link', [cx, cz - 72], [cx, cz + 72], 10);
    for (const [x, z, tone] of [
      [cx - 60, cz - 34, 0], [cx - 20, cz - 34, 1], [cx + 22, cz - 34, 2],
      [cx - 60, cz + 36, 1], [cx - 20, cz + 36, 2], [cx + 22, cz + 36, 0]
    ]) {
      const wall = m.plaster[tone];
      block(key, 'face-me-face-you-rooming-house', x, z, 17, 12, 5.2, wall, m.rustRoof, { floors: 1, columns: 4 });
      add(key, 'rooming-house-shade-veranda', [x + 8.9, 2.6, z], [1.7, 0.16, 10.5], m.roof);
    }
    for (let i = 0; i < 4; i++) {
      const x = cx - 55 + i * 36;
      block(key, 'market-shopfront', x, cz + 17, 12, 10, 5.8, m.plaster[i % 3], m.roof, { floors: 2, columns: 2, fascia: [m.signBlue, m.signGreen, m.signRed, m.yellow][i] });
      add(key, 'market-shop-security-shutter', [x + 6.15, 1.3, cz + 17], [0.12, 2.25, 4.2], m.metal);
    }
    add(key, 'market-plaza-ground', [cx + 48, -0.005, cz + 44], [32, 0.10, 30], m.concrete);
    for (let i = 0; i < 8; i++) {
      const x = cx + 35 + (i % 4) * 8.5;
      const z = cz + 32 + Math.floor(i / 4) * 12;
      stall(key, x, z, [m.canopyA, m.canopyB, m.canopyC, m.yellow][i % 4], 'roadside-market-stall');
    }
    add(key, 'bus-terminal-apron', [cx - 56, 0.02, cz + 50], [25, 0.12, 28], m.paleConcrete);
    add(key, 'bus-terminal-roof', [cx - 56, 4.0, cz + 50], [19, 0.26, 7], m.roof);
    for (const x of [cx - 64, cx - 48]) for (const z of [cz + 47, cz + 53]) add(key, 'bus-terminal-column', [x, 2, z], [0.2, 4, 0.2], m.metal, 0, true);
    add(key, 'bus-terminal-nameboard', [cx - 56, 5.2, cz + 46], [10, 0.9, 0.16], m.green);
    for (const x of [cx - 82, cx + 82]) {
      add(key, 'open-storm-drain', [x, 0.02, cz], [0.25, 0.08, 130], m.drain);
      for (let z = cz - 60; z <= cz + 60; z += 18) add(key, 'storm-drain-grate', [x, 0.10, z], [0.7, 0.08, 1.3], m.metal);
    }
    utilityLine(key, cx - 86, cz - 55, cz + 55, 32);
    utilityLine(key, cx + 86, cz - 55, cz + 55, 32);
    for (const z of [cz - 45, cz + 45]) {
      add(key, 'streetlight-pole', [cx - 10, 3.1, z], [0.14, 6.2, 0.14], m.metal, 0, true);
      add(key, 'streetlight-arm', [cx - 9.35, 6.05, z], [1.3, 0.12, 0.14], m.metal);
      add(key, 'streetlight-head', [cx - 8.75, 5.92, z], [0.55, 0.18, 0.32], m.yellow);
    }
    addWayfinding(key, cx - 77, cz - 8, 'market');
    mapRecords.push({ id: 'stage08l-alimosho-market', name: 'Alimosho Market and Bus Hub', category: 'landmark', district: 'Alimosho', position: [cx + 48, 0, cz + 44], description: DISTRICTS[key].description, enterable: false });
  }

  // LEKKI — modern gated estate edges meet mixed-use frontage, water-sensitive
  // lowland treatment, planted buffers and explicit drainage retention.
  {
    const key = 'lekki', [cx, cz] = DISTRICTS[key].center;
    addGround(key, 170, 150);
    roadBetween(key, 'estate-approach', [cx - 84, cz], [cx + 84, cz], 13);
    roadBetween(key, 'estate-avenue', [cx, cz - 70], [cx, cz + 70], 10);
    add(key, 'estate-perimeter-wall-north', [cx, 0.95, cz - 68], [160, 1.9, 0.55], m.paleConcrete, 0, true);
    add(key, 'estate-perimeter-wall-south', [cx, 0.95, cz + 68], [160, 1.9, 0.55], m.paleConcrete, 0, true);
    add(key, 'estate-entry-pillar-left', [cx - 7.5, 2.5, cz], [0.9, 5, 0.9], m.cream, 0, true);
    add(key, 'estate-entry-pillar-right', [cx + 7.5, 2.5, cz], [0.9, 5, 0.9], m.cream, 0, true);
    add(key, 'estate-entry-lintel', [cx, 4.55, cz], [16, 0.5, 0.9], m.paleConcrete);
    add(key, 'estate-gate-leaf-left', [cx - 4.5, 1.35, cz], [3.0, 2.7, 0.18], m.metal);
    add(key, 'estate-gate-leaf-right', [cx + 4.5, 1.35, cz], [3.0, 2.7, 0.18], m.metal);
    for (let i = 0; i < 6; i++) {
      const x = cx - 55 + (i % 3) * 55;
      const z = cz + (i < 3 ? -38 : 38);
      block(key, 'gated-estate-villa', x, z, 15, 13, 7.4 + (i % 2) * 1.2, m.plaster[i % 3], m.roof, { floors: 2, columns: 3, front: -1, glass: m.blueGlass });
      add(key, 'villa-balcony', [x - 8.0, 4.5, z], [1.3, 0.16, 5.5], m.concrete);
      add(key, 'villa-balcony-rail', [x - 8.6, 4.95, z], [0.08, 0.82, 5.5], m.metal);
    }
    for (let i = 0; i < 2; i++) {
      const x = cx + 60, z = cz - 34 + i * 64;
      block(key, 'estate-apartment-block', x, z, 18, 22, 13.5, m.cream, m.roof, { floors: 4, columns: 4, front: -1, glass: m.blueGlass });
    }
    for (let i = 0; i < 3; i++) {
      const x = cx - 65 + i * 28;
      block(key, 'estate-retail-front', x, cz + 58, 11, 9, 5.8, m.plaster[i], m.roof, { floors: 1, columns: 2, fascia: [m.signBlue, m.signGreen, m.signRed][i] });
    }
    add(key, 'wetland-water-retention-pond', [cx + 54, -0.12, cz - 58], [36, 0.16, 18], m.water);
    add(key, 'wetland-reed-bed', [cx + 30, 0.06, cz - 58], [13, 0.16, 18], m.deepGrass);
    for (let i = 0; i < (lowMemoryDevice ? 7 : 14); i++) {
      const x = cx - 76 + (i % 7) * 23;
      const z = cz - 58 + (i < 7 ? -6 : 6);
      add(key, 'mangrove-trunk', [x, 1.4, z], [0.25, 2.8, 0.25], m.timber);
      add(key, 'mangrove-canopy', [x, 3.1, z], [2.8, 1.25, 2.8], m.leaf);
    }
    for (const x of [cx - 78, cx + 78]) {
      add(key, 'estate-drain-channel', [x, 0.02, cz + 5], [0.28, 0.1, 106], m.drain);
      for (let z = cz - 45; z <= cz + 55; z += 20) add(key, 'estate-drain-cover', [x, 0.1, z], [0.72, 0.08, 1.5], m.metal);
    }
    addWayfinding(key, cx - 82, cz - 12, 'estate', m.signGreen);
    mapRecords.push({ id: 'stage08l-lekki-estate', name: 'Lekki Estate Gate and Wetland Edge', category: 'landmark', district: 'Lekki', position: [cx, 0, cz], description: DISTRICTS[key].description, enterable: false });
  }

  // VICTORIA ISLAND — high-value office/hospitality skyline, renovated old
  // bungalow frontage, landscaped boulevard, public hardscape and parking.
  {
    const key = 'victoriaIsland', [cx, cz] = DISTRICTS[key].center;
    addGround(key, 170, 145);
    roadBetween(key, 'commercial-boulevard', [cx - 84, cz], [cx + 84, cz], 18);
    roadBetween(key, 'hotel-connector', [cx, cz - 68], [cx, cz + 68], 12);
    for (const [x, z, height, tone] of [
      [cx - 58, cz - 34, 34, 0], [cx + 55, cz - 34, 40, 1], [cx + 58, cz + 32, 29, 2]
    ]) {
      block(key, 'victoria-office-tower', x, z, 22, 24, height, m.blueGlass, m.paleConcrete, { floors: Math.floor(height / 4), columns: 4, front: -1, glass: m.blueGlass });
      add(key, 'office-tower-crown', [x, height + 0.5, z], [22.8, 1, 24.8], m.roof);
    }
    for (let i = 0; i < 2; i++) {
      const x = cx - 52 + i * 105;
      block(key, 'victoria-hotel', x, cz + 58, 25, 19, 25 + i * 3, m.cream, m.roof, { floors: 7, columns: 4, front: -1, glass: m.blueGlass });
      add(key, 'hotel-entry-canopy', [x - 13.7, 3.1, cz + 58], [2.8, 0.3, 10], m.terracotta);
    }
    block(key, 'converted-older-bungalow', cx - 58, cz + 32, 17, 12, 4.6, m.plaster[1], m.rustRoof, { floors: 1, columns: 3, front: -1 });
    for (const z of [-45, 0, 45]) {
      add(key, 'boulevard-median-planter', [cx, 0.12, cz + z], [12, 0.24, 2.4], m.deepGrass);
      add(key, 'boulevard-kerb', [cx - 8, 0.14, cz + z], [0.2, 0.24, 5], m.curb);
      add(key, 'boulevard-kerb', [cx + 8, 0.14, cz + z], [0.2, 0.24, 5], m.curb);
    }
    for (let i = 0; i < (lowMemoryDevice ? 6 : 12); i++) {
      const x = cx - 72 + (i % 6) * 28;
      const z = cz + (i < 6 ? -57 : 57);
      add(key, 'street-tree-trunk', [x, 2.4, z], [0.35, 4.8, 0.35], m.timber);
      add(key, 'street-tree-crown', [x, 5.2, z], [3.1, 3.2, 3.1], m.leaf);
    }
    add(key, 'public-plaza-ground', [cx + 50, 0.02, cz - 46], [33, 0.12, 24], m.paleConcrete);
    for (let i = 0; i < 8; i++) add(key, 'parking-bay-line', [cx + 35 + i * 3.9, 0.10, cz - 46], [0.12, 0.025, 7], m.white);
    addWayfinding(key, cx - 79, cz - 17, 'business-district');
    mapRecords.push({ id: 'stage08l-victoria-island', name: 'Victoria Island Commercial Boulevard', category: 'landmark', district: 'Victoria Island', position: [cx, 0, cz], description: DISTRICTS[key].description, enterable: false });
  }

  // EKO ATLANTIC — engineered, planned waterfront urbanism distinct from VI:
  // straight seawall/revetment edge, sheet-pile canal, bridges, promenade, dock.
  {
    const key = 'ekoAtlantic', [cx, cz] = DISTRICTS[key].center;
    addGround(key, 205, 154);
    roadBetween(key, 'waterfront-boulevard', [cx - 98, cz + 58], [cx + 98, cz + 58], 18);
    roadBetween(key, 'canal-service-street', [cx - 86, cz - 58], [cx + 86, cz - 58], 12);
    // Four restrained high-rise blocks, laid out on a planned street grid.
    for (const [x, z, height, tone] of [
      [cx - 68, cz - 35, 38, 0], [cx - 18, cz - 35, 47, 1],
      [cx + 54, cz - 34, 42, 2], [cx + 5, cz + 40, 35, 1]
    ]) {
      block(key, 'eko-office-tower', x, z, 22, 26, height, m.blueGlass, m.paleConcrete, { floors: Math.floor(height / 4), columns: 4, front: 1, glass: m.blueGlass });
      add(key, 'tower-roof-mechanical-screen', [x, height + 0.6, z], [22.5, 1.2, 26.5], m.metal);
    }
    // The canal is represented by two continuous vertical sheet-pile walls
    // and an 18m navigable water strip, consistent with the ESIA design basis.
    add(key, 'canal-water', [cx + 28, -0.13, cz - 3], [18, 0.12, 115], m.water);
    add(key, 'canal-sheet-pile-wall-west', [cx + 18.2, 1.8, cz - 3], [0.6, 3.6, 121], m.dark, 0, true);
    add(key, 'canal-quay-cap-west', [cx + 18.2, 3.7, cz - 3], [1.0, 0.35, 121], m.concrete);
    add(key, 'canal-sheet-pile-wall-east', [cx + 37.8, 1.8, cz - 3], [0.6, 3.6, 121], m.dark, 0, true);
    add(key, 'canal-quay-cap-east', [cx + 37.8, 3.7, cz - 3], [1.0, 0.35, 121], m.concrete);
    // Two bridge decks cross the canal. Their collision boxes remain narrow.
    for (const z of [cz - 36, cz + 30]) {
      add(key, 'canal-bridge-deck', [cx + 28, 4.0, z], [27, 0.55, 7.5], m.paleConcrete, 0, true);
      for (const x of [cx + 20, cx + 36]) add(key, 'canal-bridge-pier', [x, 1.7, z], [0.8, 3.4, 1.0], m.concrete, 0, true);
      add(key, 'canal-bridge-parapet', [cx + 28, 4.55, z - 3.7], [27, 0.65, 0.25], m.cream);
      add(key, 'canal-bridge-parapet', [cx + 28, 4.55, z + 3.7], [27, 0.65, 0.25], m.cream);
    }
    // Promenade and marina pontoons are exterior-only props, not vehicle lanes.
    add(key, 'canal-promenade-west', [cx + 6, 0.08, cz - 3], [17, 0.22, 120], m.paleConcrete);
    add(key, 'canal-promenade-east', [cx + 50, 0.08, cz - 3], [17, 0.22, 120], m.paleConcrete);
    for (let i = 0; i < 4; i++) {
      const z = cz - 43 + i * 28;
      add(key, 'marina-pontoon', [cx + 7, 0.05, z], [10, 0.42, 4], m.timber);
      for (const x of [cx + 2, cx + 12]) add(key, 'marina-mooring-pole', [x, 0.9, z], [0.18, 1.8, 0.18], m.metal, 0, true);
    }
    // A line of compact cross-arm modules communicates a rock-armoured coast.
    add(key, 'sea-edge-water', [cx + 96, -0.14, cz], [36, 0.12, 148], m.waterDark);
    add(key, 'seawall-promenade', [cx + 76, 0.12, cz], [8, 0.28, 142], m.concrete);
    add(key, 'seawall-revetment-toe', [cx + 83, 0.22, cz], [5, 0.44, 142], m.rock);
    for (let i = 0; i < 12; i++) {
      const z = cz - 65 + i * 12;
      add(key, 'seawall-armor-block', [cx + 88, 0.9, z], [5.8, 1.7, 4.7], i % 2 ? m.rockLight : m.rock, (i % 2) * 18, true);
      add(key, 'seawall-armor-cap', [cx + 88, 1.8, z], [3.2, 0.65, 3.2], m.rock);
    }
    for (let i = 0; i < 18; i++) {
      const z = cz - 62 + i * 7.2;
      // Crossed blocks are a lightweight stylized tetrapod, not a detailed copy.
      add(key, 'tetrapod-core', [cx + 92, 0.55, z], [1.6, 1.4, 1.6], m.rock);
      add(key, 'tetrapod-cross-arm', [cx + 92, 0.65, z], [4.4, 0.75, 0.72], m.rockLight, 35);
      add(key, 'tetrapod-cross-arm', [cx + 92, 0.65, z], [4.4, 0.75, 0.72], m.rock, -35);
    }
    addWayfinding(key, cx - 86, cz + 48, 'marina', m.signGreen);
    mapRecords.push({ id: 'stage08l-eko-atlantic-waterfront', name: 'Eko Atlantic Canal and Sea Defence', category: 'landmark', district: 'Eko Atlantic', position: [cx + 28, 0, cz - 3], description: DISTRICTS[key].description, enterable: false });
  }

  // EKITI UPLANDS — dispersed Agbo-Ile compounds, a shared central yard,
  // laterite paths and granite/green ridge silhouettes instead of Lagos towers.
  {
    const key = 'ekiti', [cx, cz] = DISTRICTS[key].center;
    addGround(key, 178, 166);
    roadBetween(key, 'laterite-approach', [cx - 88, cz + 54], [cx + 88, cz + 26], 8, 'laterite');
    roadBetween(key, 'compound-link', [cx - 42, cz - 77], [cx + 55, cz + 74], 7, 'laterite');
    for (let compound = 0; compound < 5; compound++) {
      const x = cx - 58 + (compound % 3) * 58;
      const z = cz - 40 + Math.floor(compound / 3) * 82;
      add(key, 'agbo-ile-yard', [x, 0.01, z], [29, 0.12, 25], m.laterite);
      add(key, 'compound-gate-pillar-left', [x - 15, 1.3, z + 1], [0.65, 2.6, 0.65], m.agedPlaster, 0, true);
      add(key, 'compound-gate-pillar-right', [x + 15, 1.3, z + 1], [0.65, 2.6, 0.65], m.agedPlaster, 0, true);
      add(key, 'compound-street-wall', [x, 1.0, z + 13], [30, 2, 0.45], m.agedPlaster, 0, true);
      for (let room = 0; room < 4; room++) {
        const angle = room * Math.PI / 2;
        const rx = x + Math.cos(angle) * 8;
        const rz = z + Math.sin(angle) * 7;
        const yaw = room * 90;
        add(key, 'courtyard-room-wing', [rx, 1.7, rz], [12, 3.4, 6.2], m.plaster[(compound + room) % 3], yaw, true);
        add(key, 'courtyard-room-roof', [rx, 3.55, rz], [12.6, 0.35, 6.7], m.rustRoof, yaw);
        add(key, 'courtyard-room-door', [rx + Math.cos(angle) * 3.15, 1.1, rz + Math.sin(angle) * 3.15], [0.14, 2.1, 1], m.timber, yaw);
      }
      add(key, 'compound-cooking-shed', [x + 8, 1.45, z + 15.5], [7, 2.9, 5], m.terracotta, 0, true);
      add(key, 'compound-cooking-shed-roof', [x + 8, 3.05, z + 15.5], [7.5, 0.28, 5.5], m.rustRoof);
    }
    // Rounded-looking ridge silhouettes are layered behind the compounds.
    for (let i = 0; i < 8; i++) {
      const x = cx - 82 + i * 23;
      const z = cz - 76 + (i % 3) * 7;
      add(key, 'green-ridge-slope', [x, 7 + (i % 3), z], [29, 15 + (i % 3) * 4, 20], i % 2 ? m.deepGrass : m.grass, (i % 2 ? -1 : 1) * 18);
    }
    for (let i = 0; i < 10; i++) {
      const x = cx - 76 + (i % 5) * 35;
      const z = cz - 70 + Math.floor(i / 5) * 115;
      add(key, 'granite-rock-outcrop', [x, 2.1 + (i % 3) * 0.8, z], [7 + (i % 3), 4 + (i % 2) * 2, 6], i % 2 ? m.rock : m.rockLight, (i * 19) % 48);
    }
    for (let i = 0; i < (lowMemoryDevice ? 8 : 16); i++) {
      const x = cx - 80 + (i % 8) * 22;
      const z = cz + (i < 8 ? -70 : 70);
      add(key, 'upland-tree-trunk', [x, 2.3, z], [0.3, 4.6, 0.3], m.timber);
      add(key, 'upland-tree-crown', [x, 5.2, z], [3.1, 3.7, 3.1], m.leaf);
    }
    for (const x of [cx - 86, cx + 86]) {
      add(key, 'laterite-path-edge', [x, 0.08, cz], [0.32, 0.16, 140], m.laterite);
    }
    addWayfinding(key, cx - 83, cz + 42, 'upland-compounds', m.signGreen);
    mapRecords.push({ id: 'stage08l-ekiti-compounds', name: 'Ekiti Upland Agbo-Ile Compounds', category: 'landmark', district: 'Ekiti', position: [cx, 0, cz], description: DISTRICTS[key].description, enterable: false });
  }

  // Long links use the existing Ikeja collector edges as their tie-in points.
  function connectorVerge(owner, name, start, end, width) {
    const dx = end[0] - start[0], dz = end[1] - start[1];
    const length = Math.hypot(dx, dz), angle = Math.atan2(dx, dz), yaw = angle * 180 / Math.PI;
    const x = (start[0] + end[0]) / 2, z = (start[1] + end[1]) / 2;
    add(owner, 'connector-grass-verge-' + name, [x, -0.36, z], [width + 28, 0.5, length + 14], m.grass, yaw);
    groundColliders.push({ id: 'stage08l-verge-' + name, position: [x, -0.2, z], halfExtents: [(width + 28) / 2, 0.2, (length + 14) / 2], rotationY: yaw, surface: 'grass' });
  }
  const links = [
    { owner: 'alimosho', name: 'ikeja-west', start: [-83, 320], end: [-168, 390], width: 12, surface: 'asphalt' },
    { owner: 'lekki', name: 'ikeja-east', start: [83, 320], end: [168, 270], width: 13, surface: 'asphalt' },
    { owner: 'victoriaIsland', name: 'island', start: [83, 205], end: [250, 45], width: 13, surface: 'asphalt' },
    { owner: 'ekoAtlantic', name: 'eko-grid', start: [335, 45], end: [405, 45], width: 16, surface: 'asphalt' },
    { owner: 'ekiti', name: 'upland-north', start: [-250, 472], end: [-250, 562], width: 9, surface: 'laterite' }
  ];
  for (const link of links) {
    roadBetween(link.owner, link.name + '-connector', link.start, link.end, link.width, link.surface);
    connectorVerge(link.owner, link.name, link.start, link.end, link.width);
  }

  const activationRadius = lowMemoryDevice ? 320 : 460;
  function update(playerPosition, remoteDistrictKey = null) {
    const vectorArray = playerPosition?.toArray?.();
    const p = Array.isArray(playerPosition) ? playerPosition : ArrayBuffer.isView(playerPosition) ? Array.from(playerPosition) : Array.isArray(vectorArray) ? vectorArray : [playerPosition?.x || 0, playerPosition?.y || 0, playerPosition?.z || 0];
    for (const [key, spec] of Object.entries(DISTRICTS)) {
      const distance = Math.hypot(Number(p[0] || 0) - spec.center[0], Number(p[2] || 0) - spec.center[1]);
      const root = districtRoots[key];
      root.enabled = key === remoteDistrictKey || distance <= activationRadius + (root.enabled ? 60 : 0);
    }
  }
  update([0, 0, 0]);

  const districtBounds = {};
  for (const [key, spec] of Object.entries(DISTRICTS)) {
    districtBounds[key] = {
      min: [spec.center[0] - spec.half[0], -1, spec.center[1] - spec.half[1]],
      max: [spec.center[0] + spec.half[0], 54, spec.center[1] + spec.half[1]]
    };
  }
  return {
    stage: '08L',
    district: 'Five-district expansion',
    districts: DISTRICTS,
    districtBounds,
    counts,
    roads,
    roadNetwork: {
      interDistrictConnectors: 5,
      connectedToExistingIkejaCorridor: true,
      localRoadSegments: roads.length - 5,
      roadSurfaceColliders: roads.length,
      groundZones: Object.keys(DISTRICTS).length
    },
    collisionProxies,
    groundColliders,
    mapRecords,
    districtRoots,
    activationRadius,
    update,
    staticCandidates: staticCandidates.length,
    sharedSurfaceMaps: Object.keys(surfaces).length,
    surfaceMapResolution: 64,
    lowMemoryDevice,
    liveTrafficAdded: true,
    liveNpcAdded: false,
    features: [
      'Alimosho rooming-house blocks, independent shops, roadside market, bus terminal, open drainage and overhead utilities',
      'Lekki gated estate, modern villas/apartments, wetland retention and mangrove buffer',
      'Victoria Island office/hospitality skyline, converted bungalow, landscaped boulevard and plaza',
      'Eko Atlantic sheet-pile canal, two bridges, marina pontoons, promenade and rock-armoured seawall',
      'Ekiti Agbo-Ile courtyard compounds, laterite roads, granite outcrops and green ridge forms'
    ],
    note: 'Five playable exterior district slices connected to the compact Yaba-Ikeja road network. These are stylized game interpretations, not measured property replicas or a full metro-scale reconstruction.'
  };
}
