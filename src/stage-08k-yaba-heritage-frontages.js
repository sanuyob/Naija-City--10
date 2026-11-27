import * as pc from 'playcanvas';

const BASE = typeof import.meta.env !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/';
const assetUrl = path => new URL(String(path).replace(/^\//, ''), new URL(BASE, window.location.origin)).href;

function loadModel(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(`${name}: ${error?.message || error || 'model load failed'}`)));
    app.assets.load(asset);
  });
}

/** Stage 08K: Nigerian-specific Yaba architecture layered over the existing blockout. */
export async function createStage08KYabaHeritageFrontages({ app, box, material, lowMemoryDevice = false }) {
  const batch = app.batcher?.addGroup('stage08k-yaba-heritage-static', false, 128);
  const colliders = [];
  const counts = { bungalowFacades: 0, tenementFacades: 0, compoundModules: 0, marketStalls: 0, signage: 0, drains: 0, importedModels: 0 };
  const mats = {
    plaster: [material([0.72,0.64,0.50]), material([0.66,0.69,0.63]), material([0.73,0.70,0.61])],
    aged: material([0.43,0.40,0.34]), cream: material([0.86,0.80,0.65]), terracotta: material([0.48,0.22,0.14]),
    roof: material([0.20,0.22,0.22]), timber: material([0.30,0.20,0.13]), dark: material([0.055,0.075,0.08]),
    glass: material([0.10,0.22,0.25],0.25), metal: material([0.19,0.22,0.23],0.42), rust: material([0.39,0.19,0.12]),
    signBlue: material([0.035,0.19,0.35]), signGreen: material([0.04,0.29,0.16]), signRed: material([0.58,0.12,0.075]),
    yellow: material([0.88,0.66,0.12]), white: material([0.88,0.86,0.78]), concrete: material([0.48,0.46,0.41]),
    drain: material([0.055,0.065,0.06]), produce: [material([0.60,0.14,0.08]), material([0.22,0.39,0.12]), material([0.83,0.56,0.10])]
  };
  // Small shared procedural surface maps keep the custom Nigerian frontage kit
  // from looking like untextured blockout geometry, without adding network fetches.
  const makeSurfaceMap = (name, seed, pattern = 'grain') => {
    const size = 128, canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const image = ctx.createImageData(size, size);
    let state = seed >>> 0;
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const broad = pattern === 'timber' ? Math.sin(y * 0.42 + Math.sin(x * 0.11) * 1.7) * 8
        : pattern === 'plaster' ? Math.sin(x * 0.055) * 3 + Math.cos(y * 0.07) * 3
        : pattern === 'metal' ? Math.sin(y * 1.3) * 4 : 0;
      const grit = (random() - 0.5) * (pattern === 'plaster' ? 34 : 24);
      const value = Math.max(0, Math.min(255, 222 + broad + grit));
      image.data[i] = value; image.data[i + 1] = value; image.data[i + 2] = value; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    if (pattern === 'plaster' || pattern === 'aged') {
      ctx.globalAlpha = pattern === 'aged' ? 0.14 : 0.08;
      for (let i = 0; i < 22; i++) {
        const x = random() * size, y = random() * size;
        ctx.strokeStyle = i % 3 ? '#635c50' : '#fff4df'; ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 15 - 7, y + random() * 26); ctx.stroke();
      }
    }
    if (pattern === 'timber') {
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#53402c';
      for (let y = 4; y < size; y += 13) { ctx.lineWidth = 1 + random(); ctx.beginPath(); ctx.moveTo(0,y); ctx.bezierCurveTo(34,y-3,82,y+3,size,y-1); ctx.stroke(); }
    }
    if (pattern === 'metal') {
      ctx.globalAlpha = 0.12; ctx.strokeStyle = '#444a49';
      for (let x = 8; x < size; x += 18) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, size); ctx.stroke(); }
    }
    const texture = new pc.Texture(app.graphicsDevice, { width:size, height:size, format:pc.PIXELFORMAT_R8_G8_B8_A8, mipmaps:true });
    texture.name = `Stage 08K ${name} surface`; texture.setSource(canvas);
    texture.addressU = pc.ADDRESS_REPEAT; texture.addressV = pc.ADDRESS_REPEAT; texture.anisotropy = 2;
    return texture;
  };
  const surfaceMaps = {
    plaster: makeSurfaceMap('painted plaster', 811, 'plaster'),
    aged: makeSurfaceMap('weathered plaster', 812, 'aged'),
    timber: makeSurfaceMap('timber grain', 813, 'timber'),
    metal: makeSurfaceMap('galvanized metal', 814, 'metal'),
    concrete: makeSurfaceMap('cast concrete', 815, 'concrete')
  };
  const applySurfaceMap = (target, map, tiling = [1.5, 1.5]) => {
    target.diffuseMap = map; target.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
    target.gloss = 0.12; target.shininess = 10; target.update();
  };
  for (const target of mats.plaster) applySurfaceMap(target, surfaceMaps.plaster, [2.5, 2]);
  applySurfaceMap(mats.aged, surfaceMaps.aged, [2, 2]);
  applySurfaceMap(mats.cream, surfaceMaps.plaster, [2.2, 2]);
  applySurfaceMap(mats.timber, surfaceMaps.timber, [1.2, 2.4]);
  applySurfaceMap(mats.roof, surfaceMaps.metal, [2.8, 3.2]);
  applySurfaceMap(mats.metal, surfaceMaps.metal, [1.8, 2.2]);
  applySurfaceMap(mats.rust, surfaceMaps.metal, [1.8, 2.2]);
  applySurfaceMap(mats.concrete, surfaceMaps.concrete, [2, 3]);

  const makeSignMaterial = (label, background) => {
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle=background; ctx.fillRect(0,0,512,128);
    ctx.strokeStyle='#e7c36a'; ctx.lineWidth=8; ctx.strokeRect(8,8,496,112);
    ctx.fillStyle='#fff4d8'; ctx.textAlign='center'; ctx.textBaseline='middle';
    let size=42; ctx.font=`700 ${size}px Arial`;
    while(ctx.measureText(label).width>450 && size>22){size-=2;ctx.font=`700 ${size}px Arial`;}
    ctx.fillText(label,256,66);
    const texture=new pc.Texture(app.graphicsDevice,{width:512,height:128,format:pc.PIXELFORMAT_R8_G8_B8_A8,mipmaps:true});
    texture.setSource(canvas);
    const face=new pc.StandardMaterial(); face.name=`Yaba sign · ${label}`; face.diffuse=new pc.Color(1,1,1); face.diffuseMap=texture; face.emissive=new pc.Color(0.12,0.12,0.12); face.update();
    return face;
  };
  const add = (name, pos, scale, mat, yaw = 0, solid = false) => {
    const e = box(`stage08k-${name}`, pos, scale, mat);
    e.tags.add('stage08k-yaba-heritage');
    if (batch && e.render) e.render.batchGroupId = batch.id;
    if (yaw) e.setEulerAngles(0,yaw,0);
    if (solid) colliders.push({ id:e.name, position:[...pos], halfExtents:scale.map(v=>Math.abs(v)/2), rotationY:yaw, source:'stage08k-yaba-heritage' });
    return e;
  };

  // Older Afro-Brazilian/colonial-influenced bungalow fronts: deep veranda,
  // arched openings, stucco banding, timber shutters and low pitched roof.
  for (const side of [-1,1]) {
    const frontX = side * 6.52;
    for (const z of [-76,-38,0,38,76]) {
      const face = side < 0 ? 0 : 1;
      const tone = mats.plaster[(Math.abs(z/38)+face)%mats.plaster.length];
      add('bungalow-veranda-roof',[frontX,3.55,z],[0.72,0.16,6.5],mats.roof);
      add('bungalow-veranda-beam',[frontX,3.05,z],[0.16,0.18,6.0],mats.timber);
      for (const dz of [-2.65,2.65]) add('bungalow-veranda-column',[frontX,1.55,z+dz],[0.18,3.1,0.18],mats.cream,0,true);
      add('bungalow-fascia-band',[frontX-side*0.12,3.92,z],[0.16,0.20,6.6],mats.cream);
      // Arched window effect: side piers, curved-looking lintel segments, sill and dark inset.
      for (const dz of [-1.35,1.35]) {
        add('bungalow-window-reveal',[frontX-side*0.11,2.10,z+dz],[0.12,1.75,0.95],mats.dark);
        add('bungalow-window-shutter',[frontX-side*0.19,2.10,z+dz],[0.08,1.48,0.72],mats.timber);
        add('bungalow-window-sill',[frontX-side*0.20,1.26,z+dz],[0.20,0.12,1.08],mats.cream);
        for (let segment = -1; segment <= 1; segment++) {
          const archRise = 0.12 + (1 - Math.abs(segment)) * 0.28;
          add('bungalow-window-arch-voussoir',[frontX-side*0.18,2.88+archRise,z+dz+segment*0.40],[0.18,0.15,0.40],mats.cream);
        }
      }
      add('bungalow-entry-door',[frontX-side*0.12,1.45,z],[0.16,2.55,0.92],mats.timber,0,true);
      add('bungalow-step',[frontX-side*0.52,0.12,z],[0.78,0.24,1.45],mats.concrete);
      add('bungalow-plinth',[frontX-side*0.12,0.42,z],[0.18,0.36,6.5],mats.aged);
      counts.bungalowFacades++;
    }
  }

  // Three/four-storey Lagos tenement language: repetitive window bays,
  // shallow balconies, external service pipes and painted shop-level shutters.
  for (const side of [-1,1]) {
    const frontX=side*6.58;
    for (const z of [-58,-19,20,59]) {
      const height=5.4+(Math.abs(z/20)%2)*0.9;
      add('tenement-shop-shutter',[frontX,1.35,z],[0.15,2.35,3.4],mats.dark);
      add('tenement-shop-header',[frontX-side*0.12,2.68,z],[0.16,0.24,3.8],mats.signBlue);
      add('tenement-cornice',[frontX-side*0.14,height,z],[0.20,0.18,5.8],mats.cream);
      for (let floor=0;floor<2;floor++) for (const dz of [-1.65,0,1.65]) {
        const y=3.35+floor*1.55;
        add('tenement-window-inset',[frontX-side*0.10,y,z+dz],[0.12,1.02,0.92],mats.dark);
        add('tenement-window-glass',[frontX-side*0.18,y,z+dz],[0.07,0.78,0.68],mats.glass);
        add('tenement-window-frame',[frontX-side*0.23,y,z+dz],[0.08,0.10,1.02],mats.cream);
        add('tenement-balcony-slab',[frontX-side*0.55,y-0.48,z+dz],[0.85,0.12,1.25],mats.concrete);
        add('tenement-balcony-rail',[frontX-side*0.93,y-0.10,z+dz],[0.08,0.62,1.22],mats.metal);
      }
      for (const dz of [-2.5,2.5]) add('tenement-rain-pipe',[frontX-side*0.22,2.8,z+dz],[0.10,5.5,0.10],mats.rust);
      add('tenement-roof-tank',[frontX-side*0.4,height+0.85,z],[1.1,1.4,1.1],mats.dark);
      counts.tenementFacades++;
    }
  }

  // A family compound: room wings around an open agbo'le courtyard, with a
  // street wall and gate. Replace one outer residential blockout shell.
  const target=app.root.findByTag('stage08a-building')?.find(e=>e.name.includes('residential') && Math.abs(e.getPosition().x-42.5)<1 && Math.abs(e.getPosition().z+155)<1);
  if (target) target.render.enabled=false;
  for (const roof of app.root.findByTag('stage08a-roof')||[]) {
    const p=roof.getPosition(); if (Math.abs(p.x-42.5)<1 && Math.abs(p.z+155)<1) roof.render.enabled=false;
  }
  const cx=42.5, cz=-155;
  add('compound-courtyard-floor',[cx,0.04,cz],[5.8,0.10,6.2],mats.concrete);
  // Room blocks on north/south/east; west side is entry court and gate.
  for (const [dx,dz,w,d] of [[0,-5.0,11.5,2.2],[0,5.0,11.5,2.2],[4.8,0,2.0,7.8]]) {
    add('compound-room-wing',[cx+dx,1.55,cz+dz],[w,3.1,d],mats.plaster[0],0,true);
    add('compound-flat-roof',[cx+dx,3.18,cz+dz],[w+0.25,0.22,d+0.25],mats.roof);
  }
  add('compound-perimeter-north',[cx,1.1,cz-7.0],[13.5,2.2,0.22],mats.aged,0,true);
  add('compound-perimeter-south',[cx,1.1,cz+7.0],[13.5,2.2,0.22],mats.aged,0,true);
  add('compound-gate-pier',[cx-6.6,1.35,cz],[0.65,2.7,0.65],mats.cream,0,true);
  add('compound-gate-pier',[cx-6.6,1.35,cz-2.3],[0.65,2.7,0.65],mats.cream,0,true);
  add('compound-metal-gate',[cx-6.6,1.1,cz-1.15],[0.12,2.0,1.55],mats.metal,0,true);
  add('compound-courtyard-tree-trunk',[cx+1.4,1.2,cz],[0.25,2.4,0.25],mats.timber);
  add('compound-courtyard-tree-canopy',[cx+1.4,2.7,cz],[2.3,1.8,2.3],mats.produce[1]);
  add('compound-courtyard-water-pot',[cx-2.0,0.5,cz+1.4],[0.65,0.9,0.65],mats.terracotta);
  for (const dz of [-5.0,5.0]) for (const dx of [-3.6,0,3.6]) add('compound-window',[cx+dx,1.75,cz+dz+(dz<0?-0.2:0.2)],[1.05,1.0,0.12],mats.dark);
  counts.compoundModules=18;

  // Fictional, locally legible shop signage and stall fascia (no copied logos).
  const signs=[
    {x:-6.45,z:-77,text:'MAMA TITI FOODS',mat:mats.signGreen},
    {x:6.45,z:-39,text:'YABA TECH REPAIRS',mat:mats.signBlue},
    {x:-6.45,z:0,text:'ALHAJI STORES',mat:mats.signRed},
    {x:6.45,z:39,text:'FRESH MARKET',mat:mats.signGreen},
    {x:-6.45,z:78,text:'LAGOS PRINT HUB',mat:mats.signBlue}
  ];
  for (const s of signs) {
    const board=add('shop-signboard',[s.x,2.85,s.z],[0.18,0.78,4.5],s.mat);
    board.render.material=makeSignMaterial(s.text,s.mat===mats.signGreen?'#164b2a':s.mat===mats.signRed?'#7a2018':'#143b67');
    add('shop-sign-trim',[s.x*1.015,3.28,s.z],[0.12,0.08,4.65],mats.yellow);
    counts.signage++;
  }

  // Market frontage: tarpaulin canopy, steel legs, counter, crates and a
  // compact produce display on the existing roadside verge, not in the lane.
  for (const [x,z,canopy] of [[-15.3,-15,mats.signRed],[15.3,48,mats.signGreen],[-15.3,94,mats.signBlue]]) {
    add('market-stall-counter',[x,0.92,z],[2.7,0.18,1.3],mats.timber,0,true);
    add('market-stall-tarpaulin',[x,2.65,z],[3.3,0.14,2.4],canopy);
    for (const dx of [-1.45,1.45]) for (const dz of [-1.0,1.0]) add('market-stall-leg',[x+dx,1.36,z+dz],[0.08,2.7,0.08],mats.metal,0,true);
    for (const [dx,dz,i] of [[-0.65,0.35,0],[0.1,0.35,1],[0.75,-0.3,2]]) add('market-produce-crate',[x+dx,1.20,z+dz],[0.65,0.48,0.58],mats.produce[i]);
    add('market-stall-fascia',[x,2.25,z-1.18],[2.5,0.42,0.12],mats.yellow);
    counts.marketStalls++;
  }

  // Covered open drains and grates: a repeatable roadside module, deliberately
  // set behind the kerb so it does not obstruct the walkable footpath.
  for (const side of [-1,1]) {
    // One continuous drainage run per side, with repeated maintenance grates.
    add('open-roadside-drain-run',[side*6.95,0.035,10],[0.34,0.10,230],mats.drain);
    for (let z=-105;z<=125;z+=5.5) {
      add('drain-grate',[side*6.95,0.105,z],[0.38,0.035,0.82],mats.metal);
      counts.drains++;
    }
  }

  // Reuse a verified CC0 streetlight GLB from the downloaded asset library.
  // On low-memory devices skip the container and keep the existing procedural lights.
  let importedModel=null;
  if (!lowMemoryDevice) {
    try {
      const asset=await loadModel(app,'stage08k-cc0-yaba-streetlight','assets/fictional-lagos/library/roads/roads__light-curved.glb');
      importedModel=asset.resource.instantiateRenderEntity();
      importedModel.name='stage08k-cc0-yaba-streetlight';
      importedModel.setPosition(-10.5,0,12);
      importedModel.setLocalScale(1.0,1.0,1.0);
      for (const render of importedModel.findComponents('render')) if (batch) render.batchGroupId=batch.id;
      importedModel.tags.add('stage08k-yaba-heritage');
      app.root.addChild(importedModel);
      counts.importedModels++;
    } catch (error) { console.warn('Yaba CC0 streetlight GLB fallback:',error.message); }
  }

  return {
    stage:'08K', district:'Yaba heritage and market frontage',
    counts, collisionProxies:colliders, staticBatching:Boolean(batch), batchGroupId:batch?.id??null,
    architecture:'Afro-Brazilian-inspired veranda bungalow fronts, low-rise Lagos tenement balconies, and an open-courtyard Yoruba family compound',
    materials:'weathered stucco, painted plaster, timber, galvanized metal, cast concrete and restrained painted shop fascia',
    materialFinish:{proceduralSurfaceMaps:Object.keys(surfaceMaps).length,mapResolution:128,sharedTextures:true,textureBytesApprox:5*128*128*4,signageCanvasTextures:counts.signage},
    importedModels:importedModel?['roads__light-curved.glb']:[],
    mobilePolicy:{lowMemoryDevice,sharedMaterials:true,customGeometry:true,optionalGlbSkipped:lowMemoryDevice},
    note:'The compound and facade modules are fictionalized architectural interpretations, not measured reproductions of a specific heritage building.'
  };
}
