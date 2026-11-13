import * as pc from 'playcanvas';

// Stage 08H: material and prop-art pass for the Ikeja street-life prototype.
// Textures are original, deterministic, procedural PBR maps; no external
// image rights or runtime downloads are required for this stage.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
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
    anisotropy: 2,
    srgb
  });
  texture.setSource(canvas);
  return texture;
}

function makeCanvas(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  return canvas;
}

function makeSurfaceMaps(device, size, seed, base, type) {
  const random = seeded(seed);
  const heightField = new Float32Array(size * size);
  const albedo = makeCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const grain = (random() - 0.5) * (type === 'metal' ? 16 : 22);
        const lowWave = Math.sin(x * 0.027 + y * 0.013) * 5 +
          Math.sin(y * 0.061 + x * 0.009) * 3;
        const aggregate = type === 'asphalt'
          ? (Math.sin(x * 0.19) * Math.cos(y * 0.17) * 11) +
            (random() - 0.5) * 13
          : type === 'concrete' ? (random() - 0.5) * 10 : 0;
        const verticalStreak = (type === 'plaster' || type === 'metal')
          ? Math.max(0, Math.sin(x * 0.14 + Math.sin(y * 0.018) * 2)) *
            Math.max(0, (y / s - 0.52)) * 17 : 0;
        const contactGrime = type === 'plastic' || type === 'wood' || type === 'cardboard'
          ? Math.max(0, 1 - y / (s * 0.22)) * 10 : 0;
        const ripple = type === 'fabric'
          ? Math.sin((x + y) * 0.31) * 4 + Math.sin((x - y) * 0.08) * 3 : 0;
        const value = grain + lowWave + aggregate - verticalStreak - contactGrime + ripple;
        heightField[y * s + x] = value / 255;
        for (let c = 0; c < 3; c++) {
          const channel = Math.max(0, Math.min(255, base[c] + value));
          image.data[i + c] = channel;
        }
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Fine scratches and worn spots vary by surface instead of using one generic noise layer.
    const scratchCount = type === 'metal' ? Math.round(s * 0.42) : Math.round(s * 0.12);
    for (let i = 0; i < scratchCount; i++) {
      const alpha = type === 'metal' ? 0.045 + random() * 0.12 : 0.025 + random() * 0.065;
      const light = random() > 0.53;
      ctx.fillStyle = light
        ? 'rgba(235,226,204,' + alpha.toFixed(3) + ')'
        : 'rgba(35,31,27,' + alpha.toFixed(3) + ')';
      const x = random() * s, y = random() * s;
      if (type === 'metal') {
        ctx.fillRect(x, y, 1 + random() * 2, 3 + random() * 20);
      } else {
        ctx.fillRect(x, y, 1 + random() * 4, 1 + random() * 4);
      }
    }
  });

  const normal = makeCanvas(size, (ctx, s) => {
    const pixels = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const left = heightField[y * s + ((x + s - 1) % s)];
        const right = heightField[y * s + ((x + 1) % s)];
        const up = heightField[((y + s - 1) % s) * s + x];
        const down = heightField[((y + 1) % s) * s + x];
        const strength = type === 'asphalt' ? 1.8 : type === 'metal' ? 2.5 : 1.35;
        let nx = (left - right) * strength;
        let ny = (up - down) * strength;
        let nz = 1;
        const length = Math.hypot(nx, ny, nz);
        nx /= length; ny /= length; nz /= length;
        const i = (y * s + x) * 4;
        pixels.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
        pixels.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        pixels.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });

  const gloss = makeCanvas(size, (ctx, s) => {
    const pixels = ctx.createImageData(s, s);
    const range = ({
      asphalt: [12, 35], concrete: [18, 45], plaster: [20, 48],
      metal: [78, 148], wood: [25, 67], plastic: [72, 126],
      rubber: [10, 29], fabric: [16, 42], cardboard: [12, 32]
    })[type] || [24, 58];
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = Math.round(range[0] + random() * (range[1] - range[0]));
      pixels.data[i] = value;
      pixels.data[i + 1] = value;
      pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });

  return {
    albedo: textureFromCanvas(device, albedo, '08H-' + type + '-albedo', true),
    normal: textureFromCanvas(device, normal, '08H-' + type + '-normal', false),
    gloss: textureFromCanvas(device, gloss, '08H-' + type + '-gloss', false)
  };
}

function createPbrMaterial(name, color, maps, options = {}) {
  const material = new pc.StandardMaterial();
  material.name = name;
  material.diffuse = new pc.Color(...color);
  material.useMetalness = true;
  material.metalness = options.metalness ?? 0;
  material.gloss = options.gloss ?? 0.2;
  if (maps.albedo) {
    material.diffuseMap = maps.albedo;
    material.diffuseMapTiling = new pc.Vec2(1.6, 1.6);
  }
  if (maps.normal) {
    material.normalMap = maps.normal;
    material.normalMapTiling = new pc.Vec2(1.6, 1.6);
    material.bumpiness = options.bumpiness ?? 0.18;
  }
  if (maps.gloss) {
    material.glossMap = maps.gloss;
    material.glossMapTiling = new pc.Vec2(1.6, 1.6);
  }
  material.update();
  return material;
}

function tintedVariant(source, name, tint) {
  const variant = source.clone();
  variant.name = name;
  variant.diffuse = new pc.Color(
    source.diffuse.r * tint[0],
    source.diffuse.g * tint[1],
    source.diffuse.b * tint[2]
  );
  variant.update();
  return variant;
}

export function createStage08HIkejaPropRealism({ app, graphicsDevice }) {
  const group = app.batcher?.addGroup('stage08h-ikeja-realistic-prop-details', false, 72);
  const mapCache = new Map();
  const map = (type, size, seed, color) => {
    const key = type + ':' + seed;
    if (!mapCache.has(key)) {
      mapCache.set(key, makeSurfaceMaps(graphicsDevice, size, seed, color, type));
    }
    return mapCache.get(key);
  };

  // Nine compact procedural texture families plus a physically tuned glass material cover street-level surfaces.
  const asphalt = createPbrMaterial('08H-asphalt-aggregate-and-bitumen', [0.98,0.98,0.98],
    map('asphalt', 512, 0x81a5, [111,113,111]), { gloss:0.12, bumpiness:0.34 });
  asphalt.diffuseMapTiling = new pc.Vec2(8, 74);
  asphalt.normalMapTiling = new pc.Vec2(8, 74);
  asphalt.glossMapTiling = new pc.Vec2(8, 74);
  asphalt.update();
  const patchAsphalt = tintedVariant(asphalt, '08H-recent-asphalt-repair', [0.72,0.75,0.74]);
  const concrete = createPbrMaterial('08H-cast-concrete-dust-and-aggregate', [0.91,0.89,0.83],
    map('concrete', 256, 0x73b2, [159,157,147]), { gloss:0.14, bumpiness:0.28 });
  concrete.diffuseMapTiling = new pc.Vec2(2.6, 30);
  concrete.normalMapTiling = new pc.Vec2(2.6, 30);
  concrete.glossMapTiling = new pc.Vec2(2.6, 30);
  concrete.update();
  const plaster = createPbrMaterial('08H-faded-painted-plaster', [0.98,0.96,0.88],
    map('plaster', 256, 0x14c3, [191,178,151]), { gloss:0.1, bumpiness:0.2 });
  const paintMetal = createPbrMaterial('08H-painted-steel-chipped-edges', [0.74,0.78,0.76],
    map('metal', 256, 0x9021, [123,129,125]), { metalness:0, gloss:0.43, bumpiness:0.16 });
  const galvanized = createPbrMaterial('08H-galvanized-metal', [0.82,0.85,0.83],
    map('metal', 256, 0x9021, [145,151,148]), { metalness:0.62, gloss:0.5, bumpiness:0.1 });
  const silt = createPbrMaterial('08H-drain-silt-and-street-dust', [0.88,0.82,0.7],
    map('concrete', 256, 0x3348, [111,91,66]), { gloss:0.06, bumpiness:0.24 });
  const wood = createPbrMaterial('08H-market-wood-grain', [0.93,0.88,0.76],
    map('wood', 256, 0x1173, [128,91,58]), { gloss:0.18, bumpiness:0.14 });
  const plastic = createPbrMaterial('08H-moulded-plastic-surface', [0.95,0.97,0.96],
    map('plastic', 256, 0x1234, [177,182,176]), { gloss:0.38, bumpiness:0.08 });
  const rubber = createPbrMaterial('08H-worn-tyre-rubber', [0.45,0.46,0.45],
    map('rubber', 256, 0x4721, [52,54,52]), { gloss:0.08, bumpiness:0.13 });
  const fabric = createPbrMaterial('08H-vendor-canopy-fabric', [0.97,0.94,0.88],
    map('fabric', 256, 0x5541, [156,142,119]), { gloss:0.12, bumpiness:0.12 });
  const cardboard = createPbrMaterial('08H-shipping-carton-kraft-cardboard', [0.95,0.91,0.82],
    map('cardboard', 256, 0x2918, [155,119,78]), { gloss:0.08, bumpiness:0.09 });
  const glass = new pc.StandardMaterial();
  glass.name = '08H-smoked-shopfront-glass';
  glass.diffuse = new pc.Color(0.25,0.38,0.42);
  glass.useMetalness = true;
  glass.metalness = 0.04;
  glass.gloss = 0.82;
  glass.update();

  const clean = {
    asphalt, concrete, plaster, metal: galvanized, paintMetal, wood, plastic, rubber,
    fabric, cardboard, glass, silt,
    roadPatch: patchAsphalt
  };
  const used = {
    ...clean,
    plaster: tintedVariant(plaster, '08H-plaster-with-rain-and-dust', [0.87,0.84,0.77]),
    concrete: tintedVariant(concrete, '08H-used-concrete', [0.87,0.86,0.82]),
    metal: tintedVariant(galvanized, '08H-dull-galvanized-metal', [0.88,0.88,0.84]),
    paintMetal: tintedVariant(paintMetal, '08H-worn-painted-metal', [0.88,0.84,0.78]),
    wood: tintedVariant(wood, '08H-scuffed-market-wood', [0.84,0.78,0.68]),
    plastic: tintedVariant(plastic, '08H-used-plastic', [0.88,0.87,0.82]),
    fabric: tintedVariant(fabric, '08H-sun-faded-fabric', [0.86,0.82,0.73]),
    cardboard: tintedVariant(cardboard, '08H-worn-cardboard', [0.87,0.82,0.74])
  };
  const weathered = {
    ...used,
    concrete: tintedVariant(concrete, '08H-drain-edge-concrete-grime', [0.65,0.64,0.59]),
    plaster: tintedVariant(plaster, '08H-weathered-low-wall-plaster', [0.69,0.65,0.57]),
    metal: tintedVariant(galvanized, '08H-oxidised-and-dirty-metal', [0.67,0.58,0.48]),
    paintMetal: tintedVariant(paintMetal, '08H-chipped-and-dirty-painted-metal', [0.69,0.61,0.52]),
    wood: tintedVariant(wood, '08H-weathered-market-wood', [0.67,0.58,0.48]),
    plastic: tintedVariant(plastic, '08H-dirty-ground-contact-plastic', [0.68,0.65,0.58]),
    rubber: tintedVariant(rubber, '08H-dust-coated-rubber', [0.78,0.76,0.71]),
    cardboard: tintedVariant(cardboard, '08H-damp-stained-cardboard', [0.67,0.57,0.46]),
    silt: tintedVariant(silt, '08H-dark-drain-silt', [0.73,0.68,0.6])
  };

  const entities = app.root.findByTag('stage08g-ikeja-street-life') || [];
  let texturedProps = 0, cleanProps = 0, usedProps = 0, weatheredProps = 0;
  const assigned = [];

  function selectWear(name, position, index) {
    if (/bottle-litter|carton-litter|sachet-litter|gutter-silt|shallow-road-depression/.test(name)) return 'weathered';
    if (/generator|open-gutter|drain-cover|utility-pole|pole-crossarm|asphalt-repair|security-grille/.test(name)) return 'weathered';
    if (/shopfront-glazing|upper-window|direction-sign-board/.test(name)) return 'clean';
    if (/plastic-chair|vendor-table|beverage-crate|jerrycan|handcart|wheelbarrow|parked-|awning|umbrella/.test(name)) {
      return index % 3 === 0 ? 'clean' : index % 3 === 1 ? 'used' : 'weathered';
    }
    if (/mixed-use-shop-shell|shop-sign-fascia|sidewalk|approach-.*walkway|kerb/.test(name)) {
      return position[2] > 310 ? 'used' : index % 2 ? 'clean' : 'used';
    }
    return 'used';
  }

  function getMaterial(name, wear) {
    const mats = wear === 'clean' ? clean : wear === 'weathered' ? weathered : used;
    if (/main-road|approach-road|asphalt-repair|shallow-road/.test(name)) {
      return /repair/.test(name) ? mats.roadPatch : mats.asphalt;
    }
    if (/gutter-silt/.test(name)) return mats.silt;
    if (/open-gutter|drainage/.test(name)) return mats.concrete;
    if (/drain-cover/.test(name)) return mats.metal;
    if (/sidewalk|kerb|approach-.*walkway/.test(name)) return mats.concrete;
    if (/mixed-use-shop-shell/.test(name)) return mats.plaster;
    if (/shopfront-glazing|upper-window|window/.test(name)) return mats.glass;
    if (/security-grille|utility-pole|pole-crossarm|streetlight|direction-sign-post|generator-frame|table-leg/.test(name)) return mats.paintMetal;
    if (/direction-sign-board|shop-sign-fascia|pos-sign/.test(name)) return mats.paintMetal;
    if (/vendor-table|handcart-platform/.test(name)) return mats.wood;
    if (/umbrella-canopy|awning/.test(name)) return mats.fabric;
    if (/plastic-chair|beverage-crate|jerrycan|pos-kiosk|bottle-litter|sachet-litter/.test(name)) return mats.plastic;
    if (/carton/.test(name)) return mats.cardboard;
    if (/wheel|tyre/.test(name)) return mats.rubber;
    if (/wheelbarrow-tray|handcart|generator/.test(name)) return mats.paintMetal;
    if (/parked-.*window/.test(name)) return mats.glass;
    if (/parked-/.test(name)) return mats.paintMetal;
    if (/pedestrian/.test(name)) return mats.plastic;
    return mats.concrete;
  }

  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index];
    if (!entity.render) continue;
    const name = entity.name.replace(/^stage08g-/, '');
    const pos = entity.getPosition();
    const position = [pos.x, pos.y, pos.z];
    const wear = selectWear(name, position, index);
    entity.render.material = getMaterial(name, wear);
    if (/parked-.*-body$/.test(name)) {
      const bodyPaint = name.includes('danfo')
        ? tintedVariant(paintMetal,'08H-danfo-yellow-painted-metal',[1.24,1.04,0.62])
        : name.includes('keke')
          ? tintedVariant(paintMetal,'08H-keke-green-painted-metal',[0.62,1.08,0.72])
          : tintedVariant(paintMetal,'08H-sedan-light-painted-metal',[1.12,1.12,1.08]);
      entity.render.material = bodyPaint;
      const roof = entities.find(candidate => candidate.name === entity.name.replace('-body','-roof'));
      if (roof?.render) roof.render.material = bodyPaint;
    }
    if (group && entity.render) entity.render.batchGroupId = group.id;
    texturedProps++;
    if (wear === 'clean') cleanProps++;
    else if (wear === 'weathered') weatheredProps++;
    else usedProps++;
    assigned.push({ name, wear });
  }

  // Add small, batchable shape details to break up the box-only silhouette language.
  let addedDetails = 0;
  const detail = (name, type, position, scale, material, rotation = null) => {
    const entity = new pc.Entity('stage08h-' + name);
    entity.addComponent('render', { type, material });
    entity.setPosition(...position);
    entity.setLocalScale(...scale);
    if (rotation) entity.setEulerAngles(...rotation);
    if (group && entity.render) entity.render.batchGroupId = group.id;
    entity.tags.add('stage08h-ikeja-prop-detail');
    app.root.addChild(entity);
    addedDetails++;
    return entity;
  };
  const hide = name => {
    for (const entity of entities) {
      if (entity.name === 'stage08g-' + name && entity.render) entity.render.enabled = false;
    }
  };

  // Vendor umbrellas: replace the flat square lid with a shallow segmented canopy form.
  for (const [canopyIndex, entity] of entities.filter(item => item.name === 'stage08g-umbrella-canopy').entries()) {
    const p = entity.getPosition();
    entity.render.enabled = false;
    detail('umbrella-canopy', 'cone', [p.x,p.y+0.08,p.z], [2.7,0.62,2.7],
      [clean.fabric,used.fabric,weathered.fabric][canopyIndex % 3],
      [0,0,0]);
    detail('umbrella-finial', 'sphere', [p.x,p.y+0.4,p.z], [0.11,0.12,0.11], galvanized);
    for (let rib = 0; rib < 8; rib++) {
      const angle = rib * Math.PI / 4;
      detail('umbrella-rib', 'box',
        [p.x+Math.cos(angle)*0.58,p.y-0.13,p.z+Math.sin(angle)*0.58],
        [0.035,0.035,1.12], paintMetal, [0, -angle*180/Math.PI, 0]);
    }
  }

  // The umbrella mast is round metal tubing rather than a square post.
  for (const entity of entities.filter(item => item.name === 'stage08g-umbrella-pole')) {
    const p = entity.getPosition();
    entity.render.enabled = false;
    detail('umbrella-mast', 'cylinder', [p.x,p.y,p.z], [0.07,1.9,0.07], galvanized);
  }

  // Replace the blocky chair with a moulded seat, back, and narrow supports.
  for (const [chairIndex, entity] of entities.filter(item => item.name === 'stage08g-plastic-chair').entries()) {
    const p = entity.getPosition();
    entity.render.enabled = false;
    const seatMat = [clean.plastic,used.plastic,weathered.plastic][chairIndex % 3];
    detail('chair-seat', 'box', [p.x,p.y-0.035,p.z], [0.56,0.095,0.52], seatMat);
    detail('chair-back', 'box', [p.x,p.y+0.19,p.z+0.205], [0.56,0.43,0.085], seatMat, [-5,0,0]);
    for (const dx of [-0.21,0.21]) for (const dz of [-0.19,0.19]) {
      detail('chair-leg', 'cylinder', [p.x+dx,p.y-0.25,p.z+dz], [0.055,0.48,0.055], paintMetal);
    }
  }

  // Bottles become small cylindrical pieces with shoulders, necks, and caps.
  for (const entity of entities.filter(item => item.name === 'stage08g-bottle-litter')) {
    const p = entity.getPosition();
    entity.render.enabled = false;
    const angle = (p.x + p.z) * 7;
    detail('discarded-bottle-body', 'cylinder', [p.x,p.y,p.z], [0.18,0.23,0.18], weathered.plastic, [0,0,angle]);
    detail('discarded-bottle-neck', 'cylinder', [p.x,p.y+0.14,p.z], [0.075,0.1,0.075], weathered.plastic);
    detail('discarded-bottle-cap', 'cylinder', [p.x,p.y+0.2,p.z], [0.08,0.035,0.08], paintMetal);
  }

  // Jerrycans gain necks, screw caps and moulded carry handles.
  for (const [canIndex, entity] of entities.filter(item => item.name === 'stage08g-jerrycan').entries()) {
    const p = entity.getPosition();
    const canMaterial = [clean.plastic,used.plastic,weathered.plastic][canIndex % 3];
    detail('jerrycan-neck', 'cylinder', [p.x-0.08,p.y+0.39,p.z], [0.12,0.12,0.12], canMaterial);
    detail('jerrycan-cap', 'cylinder', [p.x-0.08,p.y+0.47,p.z], [0.15,0.045,0.15], galvanized);
    for (const dz of [-0.085,0.085]) {
      detail('jerrycan-handle-riser', 'box', [p.x+0.11,p.y+0.39,p.z+dz], [0.07,0.16,0.07], canMaterial);
    }
    detail('jerrycan-handle-grip', 'box', [p.x+0.11,p.y+0.47,p.z], [0.075,0.055,0.2], canMaterial);
  }

  // More legible generator: cooling vents, service controls and a short exhaust.
  for (const entity of entities.filter(item => item.name === 'stage08g-small-generator')) {
    const p = entity.getPosition();
    for (let slot = 0; slot < 6; slot++) {
      detail('generator-vent', 'box', [p.x+0.47,p.y-0.28+slot*0.11,p.z+0.18],
        [0.035,0.045,0.43], galvanized);
    }
    detail('generator-control-panel', 'box', [p.x+0.48,p.y+0.08,p.z-0.28],
      [0.04,0.3,0.27], paintMetal);
    detail('generator-exhaust', 'cylinder', [p.x-0.27,p.y+0.48,p.z+0.25],
      [0.1,0.3,0.1], galvanized, [0,0,18]);
  }

  // Crates get a top rim and vented side rails instead of a solid blue block.
  for (const entity of entities.filter(item => item.name === 'stage08g-beverage-crate')) {
    const p = entity.getPosition();
    for (const dx of [-0.3,0.3]) {
      detail('crate-rim', 'box', [p.x+dx,p.y+0.27,p.z], [0.07,0.07,0.58], clean.plastic);
    }
    for (let slot = 0; slot < 4; slot++) {
      detail('crate-side-rail', 'box', [p.x,p.y-0.12+slot*0.13,p.z+0.31],
        [0.62,0.035,0.045], clean.plastic);
    }
  }

  // Wheelbarrow and handcart receive their real working silhouette cues.
  for (const entity of entities.filter(item => item.name === 'stage08g-wheelbarrow-tray')) {
    const p = entity.getPosition();
    for (const dx of [-0.42,0.42]) {
      detail('wheelbarrow-handle', 'box', [p.x+dx,p.y+0.02,p.z+0.78],
        [0.07,0.07,1.12], paintMetal, [7,0,0]);
      detail('wheelbarrow-grip', 'cylinder', [p.x+dx,p.y+0.02,p.z+1.31],
        [0.085,0.24,0.085], rubber, [90,0,0]);
      detail('wheelbarrow-support', 'cylinder', [p.x+dx,p.y-0.29,p.z+0.22],
        [0.055,0.58,0.055], galvanized, [0,0,7]);
    }
    detail('wheelbarrow-front-lip', 'box', [p.x,p.y+0.15,p.z-0.34],
      [1.26,0.08,0.08], galvanized);
  }
  for (const entity of entities.filter(item => item.name === 'stage08g-handcart-platform')) {
    const p = entity.getPosition();
    for (const dx of [-0.58,0.58]) {
      detail('handcart-upright-frame', 'cylinder', [p.x+dx,p.y+0.65,p.z+0.42],
        [0.055,1.25,0.055], galvanized);
      detail('handcart-side-rail', 'cylinder', [p.x+dx,p.y+0.62,p.z-0.12],
        [0.05,0.95,0.05], paintMetal, [90,0,0]);
    }
    detail('handcart-push-grip', 'cylinder', [p.x,p.y+1.27,p.z+0.42],
      [0.065,1.2,0.065], rubber, [0,0,90]);
  }
  for (const entity of entities.filter(item => item.name === 'stage08g-wheelbarrow-wheel' || item.name === 'stage08g-handcart-wheel')) {
    const p = entity.getPosition();
    detail('small-cart-wheel-hub', 'cylinder', [p.x,p.y,p.z], [0.075,0.13,0.13], galvanized, [0,0,90]);
  }

  // Packaging has tape seams and folded top flaps; these stay localized, not repeated everywhere.
  for (const entity of entities.filter(item => item.name === 'stage08g-stacked-carton' || item.name === 'stage08g-carton-litter')) {
    const p = entity.getPosition();
    detail('carton-tape-seam', 'box', [p.x,p.y+0.02,p.z], [0.045,0.13,0.27], used.cardboard);
  }

  // Tyres and public-transport shells get small reflective hardware, not extra dynamic lights.
  for (const entity of entities.filter(item => /stage08g-parked-.*-wheel$/.test(item.name))) {
    const p = entity.getPosition();
    detail('wheel-hub', 'cylinder', [p.x,p.y,p.z], [0.11,0.16,0.16], galvanized, [0,0,90]);
  }
  for (const entity of entities.filter(item => /stage08g-parked-.*-body$/.test(item.name))) {
    const p = entity.getPosition();
    const zSize = entity.getLocalScale().z;
    const vehiclePaint = entity.name.includes('danfo')
      ? tintedVariant(paintMetal,'08H-danfo-yellow-painted-metal',[1.24,1.04,0.62])
      : entity.name.includes('keke')
        ? tintedVariant(paintMetal,'08H-keke-green-painted-metal',[0.62,1.08,0.72])
        : tintedVariant(paintMetal,'08H-sedan-light-painted-metal',[1.12,1.12,1.08]);
    detail('vehicle-front-bumper', 'box', [p.x,p.y-0.27,p.z-zSize*0.48],
      [entity.getLocalScale().x*0.96,0.16,0.12], weathered.paintMetal);
    detail('vehicle-rear-bumper', 'box', [p.x,p.y-0.27,p.z+zSize*0.48],
      [entity.getLocalScale().x*0.96,0.16,0.12], vehiclePaint);
    detail('vehicle-headlamp-left', 'box', [p.x-entity.getLocalScale().x*0.38,p.y+0.12,p.z-zSize*0.5],
      [0.22,0.16,0.035], glass);
    detail('vehicle-headlamp-right', 'box', [p.x+entity.getLocalScale().x*0.38,p.y+0.12,p.z-zSize*0.5],
      [0.22,0.16,0.035], glass);
  }

  return {
    stage:'08H',
    district:'Ikeja',
    materialSystem:'original procedural PBR maps (albedo, tangent normal, gloss)',
    materialFamilies:['asphalt','concrete','weathered plaster','painted steel','galvanized metal','wood','plastic','rubber','fabric','cardboard','glass'],
    taggedPropCount:entities.length,
    texturedProps,
    wearDistribution:{clean:cleanProps,used:usedProps,weathered:weatheredProps},
    addedDetailMeshes:addedDetails,
    textureResolutions:{asphalt:512,otherFamilies:256},
    texturedMaterialFamilies:9,
    textureMapsPerFamily:3,
    staticBatching:Boolean(group),
    sourceAttribution:'Original procedural maps generated in project; no third-party image textures.',
    limitations:[
      'Surface maps are procedural, not scans of the actual street materials.',
      'Existing 08G pedestrian figures and parked vehicles remain static scene props.',
      'No real device visual or thermal acceptance has been performed.'
    ]
  };
}
