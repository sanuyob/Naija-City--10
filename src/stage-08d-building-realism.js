import * as pc from 'playcanvas';

// Stage 08D: shared, mobile-conscious PBR surfaces and modular Nigerian facade dressing.
function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvasTexture(device, canvas, name, srgb = false) {
  const texture = new pc.Texture(device, {
    name, width: canvas.width, height: canvas.height,
    format: pc.PIXELFORMAT_RGBA8, mipmaps: true,
    minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR, magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_REPEAT, addressV: pc.ADDRESS_REPEAT,
    anisotropy: 1, srgb
  });
  texture.setSource(canvas);
  return texture;
}

function paintCanvas(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  return canvas;
}

function makePlaster(device, size) {
  const rand = seededNoise(0x51a7);
  const albedoCanvas = paintCanvas(size, size, (ctx, s) => {
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const fine = (rand() - 0.5) * 15;
      const broad = Math.sin((x + y * 0.23) * 0.043) * 3 + Math.sin(y * 0.075) * 2;
      const dirt = Math.max(0, y / s - 0.74) * 25;
      const stain = Math.max(0, Math.sin(x * 0.13 + y * 0.021) - 0.78) * 18;
      pixels.data[i] = Math.max(0, Math.min(255, 184 + fine + broad - dirt - stain));
      pixels.data[i + 1] = Math.max(0, Math.min(255, 171 + fine + broad - dirt - stain));
      pixels.data[i + 2] = Math.max(0, Math.min(255, 149 + fine + broad - dirt - stain));
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(67,58,47,' + (0.025 + rand() * 0.035).toFixed(3) + ')';
      ctx.fillRect(rand() * s, rand() * s, 2 + rand() * 12, 6 + rand() * 38);
    }
  });

  const normalCanvas = paintCanvas(size, size, (ctx, s) => {
    const height = new Float32Array(s * s);
    for (let i = 0; i < height.length; i++) height[i] = rand() * 0.045 + Math.sin((i % s) * 0.16) * 0.01;
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const left = height[y * s + (x + s - 1) % s];
      const right = height[y * s + (x + 1) % s];
      const up = height[((y + s - 1) % s) * s + x];
      const down = height[((y + 1) % s) * s + x];
      let nx = (left - right) * 3, ny = (up - down) * 3, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * s + x) * 4;
      pixels.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      pixels.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      pixels.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });

  const glossCanvas = paintCanvas(size, size, (ctx, s) => {
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const value = Math.max(22, Math.min(76, 42 + (rand() - 0.5) * 18 - Math.max(0, y / s - 0.8) * 16));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });

  return {
    albedo: canvasTexture(device, albedoCanvas, '08D-weathered-plaster-albedo', true),
    normal: canvasTexture(device, normalCanvas, '08D-plaster-normal', false),
    gloss: canvasTexture(device, glossCanvas, '08D-plaster-gloss', false)
  };
}

function makeBusinessSign(device, title, accent, index) {
  const canvas = paintCanvas(512, 128, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#17242a');
    gradient.addColorStop(1, '#303b3b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 12, h);
    ctx.fillRect(w - 12, 0, 12, h);
    ctx.fillStyle = '#f1e9d9';
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, 48, 450);
    ctx.fillStyle = accent;
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText('YABA  /  LAGOS', w / 2, 103);
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(36, 78); ctx.lineTo(476, 78); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(18, 8 + index, 476, 2);
  });
  return canvasTexture(device, canvas, '08D-business-sign-' + index, true);
}

function pbrMaterial(name, color, maps, config = {}) {
  const material = new pc.StandardMaterial();
  material.name = name;
  material.diffuse = new pc.Color(...color);
  material.useMetalness = true;
  material.metalness = config.metalness ?? 0;
  material.gloss = config.gloss ?? 0.22;
  if (maps.albedo) {
    material.diffuseMap = maps.albedo;
    material.diffuseMapTiling = new pc.Vec2(1.35, 1.35);
  }
  if (maps.normal) {
    material.normalMap = maps.normal;
    material.normalMapTiling = new pc.Vec2(1.35, 1.35);
    material.bumpiness = config.bumpiness ?? 0.2;
  }
  if (maps.gloss) {
    material.glossMap = maps.gloss;
    material.glossMapTiling = new pc.Vec2(1.35, 1.35);
  }
  if (config.fresnel && pc.FRESNEL_SCHLICK !== undefined) material.fresnelModel = pc.FRESNEL_SCHLICK;
  material.update();
  return material;
}

export function createStage08DBuildingRealism({ app, box, graphicsDevice, buildings = [] }) {
  const textureResolution = 256;
  const maps = makePlaster(graphicsDevice, textureResolution);
  const wallPalette = [
    [0.96, 0.92, 0.83], [0.85, 0.89, 0.84], [0.93, 0.84, 0.72],
    [0.80, 0.85, 0.87], [0.89, 0.87, 0.78]
  ];
  const walls = wallPalette.map((color, index) => pbrMaterial('08D-painted-plaster-' + index, color, maps));
  const concrete = pbrMaterial('08D-weathered-concrete', [0.79, 0.78, 0.72], maps, { gloss: 0.15, bumpiness: 0.28 });
  const roofConcrete = pbrMaterial('08D-roof-concrete', [0.54, 0.55, 0.52], maps, { gloss: 0.12, bumpiness: 0.3 });
  const steel = pbrMaterial('08D-painted-and-galvanized-steel', [0.38, 0.42, 0.42], maps, { metalness: 0.7, gloss: 0.46, bumpiness: 0.1 });
  const glass = pbrMaterial('08D-tinted-glazing', [0.30, 0.44, 0.49], {}, { metalness: 0.08, gloss: 0.9, fresnel: true });
  const tankPlastic = pbrMaterial('08D-poly-water-tank', [0.12, 0.25, 0.49], {}, { metalness: 0, gloss: 0.5 });

  const signSpecs = [
    ['CITY MART', '#d89a43'], ['PHONE CLINIC', '#4e9bb0'],
    ['FRESH CUTS', '#c25e4c'], ['YABA ELECTRICS', '#80a86c']
  ];
  const signMaterials = signSpecs.map(([title, accent], index) =>
    pbrMaterial('08D-business-sign-' + index, [1, 1, 1],
      { albedo: makeBusinessSign(graphicsDevice, title, accent, index) }, { gloss: 0.3 }));

  const batchGroup = app.batcher?.addGroup('stage08d-static-architecture', false, 72);
  let detailMeshes = 0, buildingsTextured = 0, commercialDetailed = 0, residentialDetailed = 0;
  const detail = (name, position, scale, material) => {
    const entity = box(name, position, scale, material);
    entity.tags.add('stage08d-architecture');
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    detailMeshes++;
    return entity;
  };

  buildings.forEach((building, index) => {
    const entity = building.entity;
    if (!entity?.render) return;
    entity.render.material = building.kind === 'residential'
      ? walls[(index + 1) % walls.length] : walls[index % walls.length];
    if (batchGroup) entity.render.batchGroupId = batchGroup.id;
    entity.tags.add('stage08d-building');
    buildingsTextured++;

    const { x, z, width, height, depth, side, kind, source } = building;
    const frontX = x - side * width * 0.5;
    const face = offset => frontX - side * offset;
    const halfDepth = depth * 0.5;

    // Four restrained architectural additions replace the plain block silhouette.
    detail('stage08d-concrete-plinth', [face(0.09), 0.23, z], [0.16, 0.38, depth - 0.12], concrete);
    detail('stage08d-front-cornice', [face(0.13), height + 0.08, z], [0.24, 0.18, depth + 0.3], roofConcrete);
    detail('stage08d-rainwater-downpipe', [face(0.25), height * 0.54, z + side * (halfDepth - 0.5)], [0.09, height * 0.9, 0.09], steel);

    if (kind === 'commercial') {
      commercialDetailed++;
      const signWidth = Math.max(3.8, Math.min(depth - 0.7, depth * 0.76));
      const signY = Math.min(height - 0.44, source === 'core' ? 3.5 : 3.72);
      const sign = signMaterials[(index + Math.round(Math.abs(z))) % signMaterials.length];
      detail('stage08d-readable-business-sign', [face(0.42), signY, z], [0.16, 0.68, signWidth], sign);

      if (source === 'core') {
        // Original Yaba retail row: glazing, security bars, doors and a light canopy.
        detail('stage08d-core-shop-canopy', [face(0.6), Math.min(2.92, height - 0.55), z], [0.72, 0.12, depth + 0.08], steel);
        for (const windowZ of [-1.72, 1.72]) {
          detail('stage08d-core-shop-display-glass', [face(0.13), 1.98, z + windowZ], [0.1, 1.28, 1.32], glass);
          detail('stage08d-core-shop-security-grille', [face(0.22), 1.98, z + windowZ], [0.08, 1.34, 1.36], steel);
        }
        detail('stage08d-core-shop-glazed-door', [face(0.16), 1.08, z], [0.12, 2.08, 1.02], glass);
        detail('stage08d-core-shop-door-frame', [face(0.24), 1.1, z], [0.12, 2.2, 1.14], steel);
      } else {
        // Stage 08B already supplies shutters and awnings; add only a pair of stone returns.
        detail('stage08d-shopfront-stone-return', [face(0.27), 2.42, z - halfDepth + 0.5], [0.2, 3.6, 0.26], concrete);
        detail('stage08d-shopfront-stone-return', [face(0.27), 2.42, z + halfDepth - 0.5], [0.2, 3.6, 0.26], concrete);
      }
    } else {
      residentialDetailed++;
      detail('stage08d-home-window-lintel', [face(0.22), 3.72, z], [0.22, 0.16, Math.min(8.7, depth - 0.6)], concrete);
      detail('stage08d-home-window-sill', [face(0.24), 2.38, z], [0.28, 0.14, Math.min(8.9, depth - 0.4)], concrete);
      for (const railOffset of [-2.8, 0, 2.8]) {
        detail('stage08d-home-facade-mullion', [face(0.18), 3.05, z + railOffset], [0.1, 1.12, 0.07], steel);
      }
      detail('stage08d-home-entry-canopy', [face(0.54), 2.42, z - halfDepth + 1.15], [0.82, 0.12, 2.05], roofConcrete);
      detail('stage08d-home-entry-door', [face(0.18), 1.12, z - halfDepth + 1.15], [0.13, 2.12, 1.22], steel);
      detail('stage08d-home-door-inset', [face(0.25), 1.18, z - halfDepth + 1.15], [0.07, 1.8, 0.9], walls[(index + 2) % walls.length]);
    }
  });

  // Bring all earlier 08B architectural details into the same PBR material families.
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
    textureResolution,
    detailMeshes,
    batching: Boolean(batchGroup),
    batchGroupId: batchGroup?.id ?? null,
    geometrySource: 'procedural modular facades over existing building plots',
    note: 'Semi-photoreal PBR facade treatment; not scanned or individually authored high-detail GLB building assets.'
  };
}
