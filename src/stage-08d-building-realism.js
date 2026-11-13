import * as pc from 'playcanvas';

// Stage 08D: semi-photoreal building surfaces and architectural dressing.
// Textures are generated once at runtime, shared by the whole district and kept small
// enough for mobile. Geometry remains modular so later GLB replacements can reuse plots.
function makeSeededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeCanvas(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  paint(ctx, size);
  return canvas;
}

function textureFromCanvas(device, canvas, name, srgb = false) {
  const texture = new pc.Texture(device, {
    name,
    width: canvas.width,
    height: canvas.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: true,
    minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_REPEAT,
    addressV: pc.ADDRESS_REPEAT,
    anisotropy: 1,
    srgb
  });
  texture.setSource(canvas);
  return texture;
}

function makePlasterAlbedo(size) {
  return makeCanvas(size, (ctx, s) => {
    const rand = makeSeededNoise(0x51a7);
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const fine = (rand() - 0.5) * 17;
        const broad = Math.sin((x + y * 0.23) * 0.043) * 3.2 + Math.sin(y * 0.075) * 2.4;
        const bottomDirt = Math.max(0, (y / s - 0.74)) * 26;
        const stain = Math.max(0, Math.sin(x * 0.13 + y * 0.021) - 0.78) * 19;
        pixels.data[i] = Math.max(0, Math.min(255, 183 + fine + broad - bottomDirt - stain));
        pixels.data[i + 1] = Math.max(0, Math.min(255, 170 + fine + broad - bottomDirt - stain));
        pixels.data[i + 2] = Math.max(0, Math.min(255, 148 + fine + broad - bottomDirt - stain));
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    // Very restrained plaster variation: this is surface wear, not baked lighting.
    for (let i = 0; i < 24; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const w = 2 + rand() * 14;
      const h = 6 + rand() * 48;
      ctx.fillStyle = 'rgba(75,65,52,' + (0.025 + rand() * 0.035).toFixed(3) + ')';
      ctx.fillRect(x, y, w, h);
    }
    for (let i = 0; i < 12; i++) {
      const x = rand() * s;
      const y = rand() * s;
      ctx.strokeStyle = 'rgba(65,58,48,0.12)';
      ctx.lineWidth = 0.45 + rand() * 0.55;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 5, y + 8 + rand() * 22);
      ctx.stroke();
    }
  });
}

function makeNormalMap(size) {
  const rand = makeSeededNoise(0x8d31);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    height[i] = rand() * 0.055 + Math.sin(i % size * 0.16) * 0.012;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = height[y * size + (x + size - 1) % size];
      const right = height[y * size + (x + 1) % size];
      const up = height[((y + size - 1) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      let nx = (left - right) * 3.2;
      let ny = (up - down) * 3.2;
      let nz = 1;
      const length = Math.hypot(nx, ny, nz);
      nx /= length; ny /= length; nz /= length;
      const i = (y * size + x) * 4;
      image.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function makeGlossMap(size) {
  return makeCanvas(size, (ctx, s) => {
    const rand = makeSeededNoise(0x2e91);
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const gloss = Math.max(22, Math.min(82, 40 + (rand() - 0.5) * 20 - Math.max(0, y / s - 0.8) * 18));
        pixels.data[i] = gloss;
        pixels.data[i + 1] = gloss;
        pixels.data[i + 2] = gloss;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
}

function makeShopSign(device, title, accent, index) {
  const canvas = makeCanvas(512, (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#18242a');
    gradient.addColorStop(1, '#303b3b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 13, 128);
    ctx.fillRect(499, 0, 13, 128);
    ctx.fillStyle = '#f0e8d8';
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 53, 455);
    ctx.fillStyle = accent;
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('YABA  /  LAGOS', 256, 101);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(38, 82);
    ctx.lineTo(474, 82);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(18, 12 + index * 2, 476, 2);
  });
  return textureFromCanvas(device, canvas, '08D-sign-' + index, true);
}

function makePbrMaterial(name, color, maps, options = {}) {
  const mat = new pc.StandardMaterial();
  mat.name = name;
  mat.diffuse = new pc.Color(color[0], color[1], color[2]);
  mat.useMetalness = true;
  mat.metalness = options.metalness ?? 0;
  mat.gloss = options.gloss ?? 0.22;
  if (maps.albedo) {
    mat.diffuseMap = maps.albedo;
    mat.diffuseMapTiling = new pc.Vec2(1.35, 1.35);
  }
  if (maps.normal) {
    mat.normalMap = maps.normal;
    mat.normalMapTiling = new pc.Vec2(1.35, 1.35);
    mat.bumpiness = options.bumpiness ?? 0.22;
  }
  if (maps.gloss) {
    mat.glossMap = maps.gloss;
    mat.glossMapTiling = new pc.Vec2(1.35, 1.35);
  }
  if (options.fresnel && pc.FRESNEL_SCHLICK !== undefined) mat.fresnelModel = pc.FRESNEL_SCHLICK;
  mat.update();
  return mat;
}

export function createStage08DBuildingRealism({ app, box, graphicsDevice, buildings = [] }) {
  const textureSize = 256;
  const maps = {
    albedo: textureFromCanvas(graphicsDevice, makePlasterAlbedo(textureSize), '08D-weathered-plaster-albedo', true),
    normal: textureFromCanvas(graphicsDevice, makeNormalMap(textureSize), '08D-plaster-normal', false),
    gloss: textureFromCanvas(graphicsDevice, makeGlossMap(textureSize), '08D-plaster-gloss', false)
  };
  const wallPalette = [
    [0.95, 0.91, 0.82],
    [0.83, 0.87, 0.82],
    [0.91, 0.82, 0.70],
    [0.78, 0.83, 0.85],
    [0.88, 0.86, 0.77]
  ];
  const walls = wallPalette.map((color, index) => makePbrMaterial('08D-painted-plaster-' + index, color, maps));
  const concrete = makePbrMaterial('08D-weathered-concrete', [0.79, 0.78, 0.72], maps, { gloss: 0.16, bumpiness: 0.3 });
  const roofConcrete = makePbrMaterial('08D-roof-concrete', [0.53, 0.55, 0.52], maps, { gloss: 0.12, bumpiness: 0.32 });
  const steel = makePbrMaterial('08D-galvanized-and-painted-steel', [0.38, 0.42, 0.42], maps, { metalness: 0.72, gloss: 0.48, bumpiness: 0.12 });
  const glass = makePbrMaterial('08D-tinted-window-glass', [0.30, 0.43, 0.48], {}, { metalness: 0.08, gloss: 0.88, fresnel: true });
  const tankPlastic = makePbrMaterial('08D-poly-water-tank', [0.12, 0.25, 0.49], {}, { metalness: 0, gloss: 0.48 });

  const signTitles = [
    ['CITY MART', '#d89a43'],
    ['PHONE CLINIC', '#4e9bb0'],
    ['FRESH CUTS', '#c25e4c'],
    ['YABA ELECTRICS', '#80a86c']
  ];
  const signMaterials = signTitles.map((entry, index) => {
    const signMap = makeShopSign(graphicsDevice, entry[0], entry[1], index);
    return makePbrMaterial('08D-business-sign-' + index, [1, 1, 1], { albedo: signMap }, { gloss: 0.3 });
  });

  const batchGroup = app.batcher?.addGroup('stage08d-static-architecture', false, 72);
  let detailMeshes = 0;
  let buildingsTextured = 0;
  let commercialDetailed = 0;
  let residentialDetailed = 0;

  const detail = (name, position, scale, mat, rotation = null) => {
    const entity = box(name, position, scale, mat);
    entity.tags.add('stage08d-architecture');
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    if (rotation) entity.setEulerAngles(...rotation);
    detailMeshes++;
    return entity;
  };

  // Apply one of five shared facade tints to every original Yaba and expansion building.
  buildings.forEach((building, index) => {
    const entity = building.entity;
    if (!entity?.render) return;
    entity.render.material = building.kind === 'residential'
      ? walls[(index + 1) % walls.length]
      : walls[index % walls.length];
    if (batchGroup) entity.render.batchGroupId = batchGroup.id;
    entity.tags.add('stage08d-building');
    buildingsTextured++;

    const { x, z, width, height, depth, side, kind, source } = building;
    const frontX = x - side * (width * 0.5);
    const face = offset => frontX - side * offset;
    const halfDepth = depth * 0.5;
    const trimZ = Math.max(0.35, halfDepth - 0.24);

    // Concrete plinth, roof edge and narrow corner pilasters break the single-box silhouette.
    detail('stage08d-plinth', [face(0.09), 0.24, z], [0.16, 0.42, depth - 0.12], concrete);
    detail('stage08d-front-cornice', [face(0.13), height + 0.08, z], [0.26, 0.2, depth + 0.36], roofConcrete);
    detail('stage08d-front-pilaster', [face(0.18), height * 0.52, z - trimZ], [0.22, height - 0.35, 0.28], concrete);
    detail('stage08d-front-pilaster', [face(0.18), height * 0.52, z + trimZ], [0.22, height - 0.35, 0.28], concrete);

    // A slim rainwater downpipe, meter housing and service conduit make the wall feel inhabited.
    const pipeZ = z + side * (halfDepth - 0.55);
    detail('stage08d-rainwater-downpipe', [face(0.28), height * 0.55, pipeZ], [0.10, height * 0.92, 0.10], steel);
    detail('stage08d-electric-meter-box', [face(0.32), 1.12, z - side * (halfDepth - 0.95)], [0.16, 0.42, 0.32], concrete);
    detail('stage08d-service-conduit', [face(0.34), 1.9, z - side * (halfDepth - 0.95)], [0.07, 1.35, 0.07], steel);

    if (kind === 'commercial') {
      commercialDetailed++;
      const signWidth = Math.max(3.8, Math.min(depth - 0.7, depth * 0.76));
      const signY = Math.min(height - 0.44, source === 'core' ? 3.5 : 3.72);
      const signMaterial = signMaterials[(index + Math.round(Math.abs(z))) % signMaterials.length];
      detail('stage08d-readable-business-sign', [face(0.42), signY, z], [0.16, 0.7, signWidth], signMaterial);

      if (source === 'core') {
        // Original Yaba shops gain a recognisable glazed entrance and protected display windows.
        detail('stage08d-core-shop-canopy', [face(0.62), 3.0, z], [0.78, 0.12, depth + 0.1], steel);
        for (const windowZ of [-1.75, 1.75]) {
          detail('stage08d-core-shop-display-glass', [face(0.13), 2.0, z + windowZ], [0.1, 1.3, 1.34], glass);
          for (const barOffset of [-0.42, 0, 0.42]) {
            detail('stage08d-core-shop-security-bar', [face(0.24), 2.0, z + windowZ + barOffset], [0.09, 1.35, 0.045], steel);
          }
          detail('stage08d-core-shop-window-sill', [face(0.23), 1.28, z + windowZ], [0.24, 0.12, 1.52], concrete);
        }
        detail('stage08d-core-shop-door', [face(0.16), 1.12, z], [0.12, 2.18, 1.1], glass);
        detail('stage08d-core-shop-door-frame', [face(0.25), 1.14, z], [0.12, 2.28, 1.22], steel);
      } else {
        // Stage 08A shops already have the Stage 08B shutter, fascia and awning.
        detail('stage08d-shopfront-column-cap', [face(0.28), 2.65, z - halfDepth + 0.55], [0.22, 3.9, 0.28], concrete);
        detail('stage08d-shopfront-column-cap', [face(0.28), 2.65, z + halfDepth - 0.55], [0.22, 3.9, 0.28], concrete);
        detail('stage08d-shopfront-window-mullion', [face(0.2), 4.55, z], [0.12, 0.86, 0.1], steel);
      }
      detail('stage08d-wall-vent', [face(0.25), Math.min(2.95, height - 0.7), z + halfDepth - 0.78], [0.12, 0.28, 0.58], steel);
    } else {
      residentialDetailed++;
      // Residential windows receive projecting lintels and sills rather than flat painted bands.
      detail('stage08d-home-window-lintel', [face(0.22), 3.72, z], [0.22, 0.18, Math.min(8.8, depth - 0.6)], concrete);
      detail('stage08d-home-window-sill', [face(0.25), 2.38, z], [0.32, 0.16, Math.min(9.0, depth - 0.4)], concrete);
      for (const railOffset of [-3.2, -1.6, 0, 1.6, 3.2]) {
        detail('stage08d-home-facade-mullion', [face(0.18), 3.05, z + railOffset], [0.1, 1.2, 0.07], steel);
      }
      detail('stage08d-home-entry-canopy', [face(0.58), 2.42, z - halfDepth + 1.15], [0.9, 0.12, 2.1], roofConcrete);
      detail('stage08d-home-entry-door', [face(0.18), 1.12, z - halfDepth + 1.15], [0.13, 2.14, 1.24], steel);
      detail('stage08d-home-entry-door-inset', [face(0.27), 1.18, z - halfDepth + 1.15], [0.07, 1.82, 0.92], walls[(index + 2) % walls.length]);
      detail('stage08d-home-window-reveal', [face(0.26), 3.04, z], [0.16, 1.38, depth - 1.1], concrete);
    }

    // Low parapet strips and a shallow roof cap finish the top edge without a heavy roof mesh.
    detail('stage08d-roof-cap', [x, height + 0.16, z], [width + 0.28, 0.16, depth + 0.34], roofConcrete);
    detail('stage08d-roof-front-parapet', [face(0.18), height + 0.48, z], [0.2, 0.52, depth + 0.4], concrete);
  });

  // Re-surface existing 08B facade parts with the same concrete, steel and glass response.
  const stage08BParts = app.root.findByTag ? app.root.findByTag('stage08b-detail') : [];
  for (const entity of stage08BParts) {
    if (!entity.render) continue;
    const name = entity.name || '';
    if (name.includes('window') || name.includes('upper-glazing')) entity.render.material = glass;
    else if (name.includes('parapet') || name.includes('balcony-slab') || name.includes('sill')) entity.render.material = concrete;
    else if (name.includes('baluster') || name.includes('grille') || name.includes('roller-shutter') || name.includes('awning') || name.includes('security-door')) entity.render.material = steel;
    else if (name.includes('water-tank')) entity.render.material = tankPlastic;
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
  }

  return {
    stage: '08D',
    style: 'semi-photoreal Nigerian urban architecture',
    buildingsTextured,
    commercialBuildingsDetailed: commercialDetailed,
    residentialBuildingsDetailed: residentialDetailed,
    originalYabaBuildings: buildings.filter(building => building.source === 'core').length,
    expansionBuildings: buildings.filter(building => building.source === '08A').length,
    pbrMaterialFamilies: wallPalette.length + 5,
    proceduralTextureMaps: 3,
    signVariants: signMaterials.length,
    textureResolution: textureSize,
    detailMeshes,
    batching: Boolean(batchGroup),
    batchGroupId: batchGroup?.id ?? null,
    geometrySource: 'procedural modular facade additions over existing building plot masses',
    note: 'Semi-photoreal surface and facade upgrade. These are not scanned or individually authored high-detail building GLBs; replaceable plot records are preserved for future asset imports.'
  };
}
