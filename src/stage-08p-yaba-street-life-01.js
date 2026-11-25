import * as pc from 'playcanvas';

const BASE = typeof import.meta.env !== 'undefined' && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : '/';
const assetUrl = value => new URL(String(value).replace(/^\//, ''), new URL(BASE, window.location.origin)).href;

const ASSETS = [
  { id:'market-stall', name:'Market Stall · Light', path:'assets/yaba-street-library/grab3d/mobile-lite/market-stall-light.glb', position:[-19.6,0.02,98.6], yaw:90, triangles:13316, role:'produce-market-stall' },
  { id:'food-cart', name:'Roadside Food Cart · Light', path:'assets/yaba-street-library/grab3d/mobile-lite/hot-dog-cart-light.glb', position:[-14.2,0.02,106.0], yaw:90, triangles:10193, role:'roadside-food-vendor' },
  { id:'generator', name:'Portable Petrol Generator', path:'assets/yaba-street-library/grab3d/mobile-lite/generator.glb', position:[-26.1,0.02,107.5], yaw:180, triangles:8556, role:'shop-generator' },
  { id:'gas-cylinder', name:'Gas Cylinder', path:'assets/yaba-street-library/grab3d/mobile-lite/gas-cylinder.glb', position:[-12.5,0.02,109.2], yaw:0, triangles:5003, role:'food-vendor-gas-cylinder' },
  { id:'vegetable-crate', name:'Vegetable Crate', path:'assets/yaba-street-library/grab3d/mobile-lite/vegetable-crate.glb', position:[-21.1,0.02,103.0], yaw:16, triangles:15538, role:'market-stock' },
  { id:'wooden-crate', name:'Wooden Market Crate', path:'assets/yaba-street-library/grab3d/mobile-lite/wooden-crate.glb', position:[-22.8,0.02,105.2], yaw:-8, triangles:5540, role:'market-stock' },
  { id:'cash-register', name:'Shop Cash Register', path:'assets/yaba-street-library/grab3d/mobile-lite/cash-register.glb', position:[-18.5,0.94,99.7], yaw:90, triangles:8190, role:'shop-counter-equipment' },
  { id:'cooking-pot', name:'Vendor Cooking Pot', path:'assets/yaba-street-library/grab3d/mobile-lite/cooking-pot.glb', position:[-13.8,0.90,106.0], yaw:0, triangles:6590, role:'food-preparation' }
];

const SIGNS = [
  { id:'yaba-provisions', path:'assets/yaba-street-library/signage/yaba-provisions.png', position:[-23.48,3.42,98.8], scale:[0.10,1.12,2.24], yaw:0 },
  { id:'mide-phone-repairs', path:'assets/yaba-street-library/signage/mide-phone-repairs.png', position:[-23.48,3.42,103.2], scale:[0.10,1.12,2.24], yaw:0 },
  { id:'pos-and-transfers', path:'assets/yaba-street-library/signage/pos-and-transfers.png', position:[-23.40,2.50,101.0], scale:[0.10,0.62,1.24], yaw:0 },
  { id:'mama-ts-kitchen', path:'assets/yaba-street-library/signage/mama-ts-kitchen.png', position:[-12.25,2.88,104.7], scale:[0.10,0.92,1.84], yaw:0 },
  { id:'akara-and-pap', path:'assets/yaba-street-library/signage/akara-and-pap.png', position:[-12.25,2.88,108.1], scale:[0.10,0.92,1.84], yaw:0 },
  { id:'suya-and-grill', path:'assets/yaba-street-library/signage/suya-and-grill.png', position:[-18.0,2.82,96.2], scale:[0.10,0.84,1.68], yaw:0 },
  { id:'cold-drinks', path:'assets/yaba-street-library/signage/cold-drinks.png', position:[-18.0,2.82,100.0], scale:[0.10,0.84,1.68], yaw:0 }
];

function loadContainer(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(`${name}: ${error?.message || error || 'model load failed'}`)));
    app.assets.load(asset);
  });
}

function loadTexture(app, name, path) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'texture', { url: assetUrl(path) });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset.resource));
    asset.once('error', error => reject(new Error(`${name}: ${error?.message || error || 'texture load failed'}`)));
    app.assets.load(asset);
  });
}

function makeMaterial(colour, roughness = 0.82) {
  const value = new pc.StandardMaterial();
  value.diffuse = new pc.Color(...colour);
  value.shininess = (1 - roughness) * 80;
  value.useMetalness = false;
  value.update();
  return value;
}

function makeTexturedMaterial(texture, name) {
  const value = new pc.StandardMaterial();
  value.name = name;
  value.diffuse = new pc.Color(1, 1, 1);
  value.diffuseMap = texture;
  value.diffuseMapAddressU = pc.ADDRESS_CLAMP_TO_EDGE;
  value.diffuseMapAddressV = pc.ADDRESS_CLAMP_TO_EDGE;
  value.shininess = 7;
  value.cull = pc.CULLFACE_NONE;
  value.update();
  return value;
}

export async function createYabaStreetLife01({ app, material, lowDataMode = false, lowMemoryDevice = false, surfaceMaterials = {} } = {}) {
  if (!app || typeof material !== 'function') throw new Error('Yaba Street Life 01 requires the PlayCanvas app and material helper.');

  const root = new pc.Entity('stage08p-yaba-street-life-01');
  root.setPosition(0, 0, 0);
  app.root.addChild(root);

  const batchGroup = app.batcher?.addGroup('stage08p-yaba-street-life-01-static', false, 64) || null;
  const collisionProxies = [];
  const importedAssets = [];
  const textureFailures = [];
  const assetFailures = [];
  const importedEntities = [];
  const localEntities = [];
  const textureResources = [];
  const retainedAssets = [];
  let customMeshes = 0;
  let hideLegacyProps = 0;

  const mats = {
    concrete: surfaceMaterials.concrete || material([0.47, 0.45, 0.40]),
    paving: surfaceMaterials.paving || material([0.50, 0.48, 0.42]),
    wood: material([0.31, 0.20, 0.12]),
    fadedWood: material([0.43, 0.31, 0.20]),
    zinc: material([0.26, 0.29, 0.29], 0.50),
    darkMetal: material([0.09, 0.12, 0.12], 0.45),
    red: material([0.54, 0.12, 0.08]),
    blue: material([0.07, 0.20, 0.32]),
    cream: material([0.82, 0.76, 0.61]),
    plastic: material([0.12, 0.30, 0.22]),
    glass: material([0.10, 0.22, 0.24], 0.3),
    cable: material([0.025, 0.029, 0.032], 0.9),
    galvanized: material([0.47, 0.49, 0.47], 0.5),
    yellow: material([0.86, 0.66, 0.10])
  };

  const addBox = (name, position, scale, mat, { yaw = 0, collision = false, batch = true } = {}) => {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type:'box', material:mat });
    entity.setLocalPosition(...position);
    entity.setLocalScale(...scale);
    entity.setLocalEulerAngles(0, yaw, 0);
    root.addChild(entity);
    // Register the component with the batch manager only after its entity is
    // inside the active scene graph; pre-parent assignment is not indexed.
    if (batch && batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    entity.tags.add('stage08p-yaba-street-life-01');
    localEntities.push(entity);
    customMeshes++;
    if (collision) collisionProxies.push({
      id:'stage08p:'+name,
      position:[position[0],position[1],position[2]],
      halfExtents:scale.map(value=>Math.abs(value)/2),
      rotationY:yaw,
      source:'stage08p-yaba-street-life-01'
    });
    return entity;
  };

  // Replace only the old roadside produce-stall blockout. The surrounding Yaba
  // shops, road, sidewalks, crossings and traffic remain unchanged.
  for (const entity of app.root.findByTag?.('stage08j-yaba-ikeja') || []) {
    if (String(entity.name || '').includes('yaba-roadside-produce-stall')) {
      entity.enabled = false;
      hideLegacyProps++;
    }
  }

  // A compact paved trading bay sits on the existing southern Yaba expansion pad.
  addBox('market-paved-apron',[-19.3,0.035,103.0],[18.8,0.12,15.2],mats.paving,{batch:true});
  addBox('market-kerb-west',[-28.8,0.16,103.0],[0.18,0.28,15.4],mats.concrete);
  addBox('market-kerb-south',[-19.3,0.16,110.7],[18.8,0.28,0.18],mats.concrete);
  addBox('market-walkway-edge-line',[-19.3,0.11,109.2],[18.2,0.035,0.08],mats.cream);

  // A small local shopfront provides a recognisable backdrop for the vendor bay.
  addBox('provisions-shop-floor',[-26.0,0.17,101.0],[4.6,0.18,9.0],mats.concrete,{collision:true});
  addBox('provisions-shop-back-wall',[-28.25,2.05,101.0],[0.22,3.8,9.0],mats.cream,{collision:true});
  addBox('provisions-shop-side-wall-north',[-26.0,2.05,96.55],[4.6,3.8,0.18],mats.cream,{collision:true});
  addBox('provisions-shop-side-wall-south',[-26.0,2.05,105.45],[4.6,3.8,0.18],mats.cream,{collision:true});
  addBox('provisions-shop-roof',[-26.0,4.02,101.0],[5.0,0.22,9.5],mats.zinc,{collision:true});
  addBox('provisions-shop-window-left',[-23.76,1.92,98.9],[0.10,1.72,2.45],mats.glass,{batch:false});
  addBox('provisions-shop-window-right',[-23.76,1.92,103.1],[0.10,1.72,2.45],mats.glass,{batch:false});
  addBox('provisions-shop-entrance-door',[-23.77,1.18,101.0],[0.12,2.16,1.26],mats.darkMetal,{batch:false,collision:true});
  addBox('provisions-shop-door-glazing',[-23.68,1.52,101.0],[0.035,1.32,0.94],mats.glass,{batch:false});
  addBox('provisions-shop-counter',[-24.9,0.68,101.0],[1.05,1.28,5.0],mats.wood,{collision:true});
  addBox('provisions-shop-counter-top',[-24.76,1.36,101.0],[1.28,0.12,5.2],mats.fadedWood);
  addBox('shopfront-awning-frame',[-23.2,2.93,101.0],[0.90,0.14,6.4],mats.darkMetal);
  addBox('shopfront-awning-fabric',[-22.95,2.86,101.0],[1.25,0.16,6.5],mats.red);
  addBox('shopfront-centre-divider',[-23.72,1.93,101.0],[0.10,1.7,0.12],mats.zinc);
  for (const z of [97.95,98.55,99.15,102.15,102.75,103.35]) {
    addBox('shopfront-window-security-bar',[-23.63,1.93,z],[0.055,1.72,0.055],mats.darkMetal,{batch:false});
  }
  for (const z of [98.9,103.1]) addBox('shopfront-window-security-rail',[-23.62,1.55,z],[0.06,0.07,2.45],mats.darkMetal,{batch:false});
  addBox('shopfront-shelf-upper',[-25.5,2.12,101.0],[0.42,0.08,4.9],mats.fadedWood);
  addBox('shopfront-shelf-lower',[-25.5,1.45,101.0],[0.42,0.08,4.9],mats.fadedWood);

  // Existing catalogue models are the main visual anchors. All imports use the
  // simplified 512px mobile GLBs, not the untouched original high-res files.
  if (!lowDataMode) {
    for (const spec of ASSETS) {
      try {
        const asset = await loadContainer(app, 'stage08p-' + spec.id, spec.path);
        retainedAssets.push(asset);
        const entity = asset.resource.instantiateRenderEntity();
        entity.name = 'stage08p-' + spec.id;
        entity.setPosition(...spec.position);
        entity.setEulerAngles(0, spec.yaw, 0);
        const scale = spec.id === 'market-stall' ? 1.0 : (spec.id === 'food-cart' ? 0.92 : 1.0);
        entity.setLocalScale(scale, scale, scale);
        entity.tags.add('stage08p-yaba-street-life-01');
        entity.tags.add('stage08p-imported-cc0');
        for (const component of entity.findComponents('render')) {
          component.batchGroupId = -1;
          component.castShadows = false;
          component.receiveShadows = false;
        }
        root.addChild(entity);
        importedEntities.push(entity);
        importedAssets.push({ id:spec.id, name:spec.name, role:spec.role, path:spec.path, loaded:true, estimatedTriangles:spec.triangles });
      } catch (error) {
        assetFailures.push(error.message);
        importedAssets.push({ id:spec.id, name:spec.name, role:spec.role, path:spec.path, loaded:false, error:error.message });
      }
    }
  } else {
    for (const spec of ASSETS) importedAssets.push({ id:spec.id, name:spec.name, role:spec.role, path:spec.path, loaded:false, skipped:'data-saver' });
  }

  // Vendor surfaces and props are placed around the shopfront and stalls.
  addBox('market-stall-vendor-table',[-19.7,0.63,101.2],[1.05,1.15,2.6],mats.wood,{collision:true});
  addBox('market-stall-table-top',[-19.0,1.25,101.2],[0.32,0.10,2.8],mats.fadedWood);
  addBox('food-vendor-prep-counter',[-13.5,0.57,106.3],[1.05,1.05,2.6],mats.zinc,{collision:true});
  addBox('food-vendor-prep-top',[-13.0,1.13,106.3],[0.16,0.10,2.8],mats.wood);
  addBox('vendor-umbrella-post',[-11.9,1.65,106.3],[0.09,3.3,0.09],mats.darkMetal,{collision:true});
  addBox('vendor-umbrella-canopy',[-12.6,3.36,106.3],[2.0,0.16,3.0],mats.red);
  addBox('vendor-bench',[-17.1,0.46,110.0],[1.55,0.12,0.48],mats.fadedWood);
  addBox('market-produce-display-crate',[-21.4,0.33,104.6],[0.62,0.62,0.62],mats.wood);
  addBox('market-stacked-empty-crate',[-23.0,0.34,105.2],[0.68,0.68,0.72],mats.fadedWood);
  addBox('market-shade-post',[-21.8,1.55,98.0],[0.08,3.1,0.08],mats.darkMetal);
  addBox('market-shade-post',[-17.4,1.55,98.0],[0.08,3.1,0.08],mats.darkMetal);
  addBox('market-shade-crossbar',[-19.6,3.05,98.0],[4.5,0.10,0.10],mats.darkMetal);
  addBox('market-shade-canopy',[-19.6,3.12,98.9],[4.7,0.12,2.2],mats.plastic);
  addBox('market-shade-canopy-front-valance',[-19.6,2.98,100.0],[4.7,0.22,0.12],mats.red);
  addBox('market-stock-table',[-22.4,0.60,102.7],[1.25,1.1,2.3],mats.fadedWood,{collision:true});
  addBox('market-stock-table-top',[-21.9,1.19,102.7],[0.18,0.12,2.45],mats.wood);
  addBox('market-vegetable-tray-one',[-21.8,1.32,102.0],[0.48,0.20,0.72],mats.plastic);
  addBox('market-vegetable-tray-two',[-21.8,1.32,103.1],[0.48,0.20,0.72],mats.red);
  addBox('market-fish-display-table',[-16.6,0.48,101.5],[1.0,0.9,1.9],mats.zinc,{collision:true});
  addBox('market-fish-display-top',[-16.1,0.96,101.5],[0.18,0.10,2.0],mats.darkMetal);
  addBox('market-wooden-crate-stack-a',[-24.1,0.38,106.0],[0.72,0.72,0.72],mats.wood);
  addBox('market-wooden-crate-stack-b',[-24.1,1.12,106.0],[0.72,0.72,0.72],mats.fadedWood);
  addBox('market-vegetable-sack-one',[-20.2,0.30,106.0],[0.70,0.58,0.66],mats.plastic);
  addBox('market-vegetable-sack-two',[-19.4,0.30,106.2],[0.65,0.56,0.58],mats.yellow);
  addBox('market-water-bucket',[-17.7,0.31,108.8],[0.42,0.60,0.42],mats.galvanized);
  addBox('food-vendor-charcoal-grill',[-13.4,0.60,108.5],[0.58,0.84,1.25],mats.darkMetal,{collision:true});
  addBox('food-vendor-grill-top',[-13.1,1.06,108.5],[0.12,0.10,1.3],mats.zinc);
  addBox('food-vendor-sauce-shelf',[-13.8,1.36,104.5],[0.35,0.12,1.25],mats.wood);
  addBox('food-vendor-cooler',[-11.3,0.55,104.1],[0.78,1.0,0.72],mats.blue,{collision:true});
  addBox('food-vendor-cooler-lid',[-10.9,1.08,104.1],[0.84,0.10,0.78],mats.cream);
  const addPlasticStool=(id,x,z,seatMat)=>{
    addBox(id+'-seat',[x,0.43,z],[0.62,0.12,0.62],seatMat);
    for(const [dx,dz] of [[-0.21,-0.21],[-0.21,0.21],[0.21,-0.21],[0.21,0.21]]) addBox(id+'-leg',[x+dx,0.22,z+dz],[0.09,0.42,0.09],seatMat);
  };
  addPlasticStool('vendor-plastic-stool-green',-15.0,110.0,mats.plastic);
  addPlasticStool('vendor-plastic-stool-red',-12.6,110.0,mats.red);
  addPlasticStool('market-customer-stool',-18.7,106.7,mats.blue);
  addBox('market-waste-bin',[-10.6,0.58,109.6],[0.55,1.12,0.62],mats.plastic,{collision:true});

  // Street signage uses original Naija City artwork, not placeholder text meshes.
  for (const spec of SIGNS) {
    if (lowDataMode) {
      const fallbackSign = spec.id.includes('mama') || spec.id.includes('akara') ? mats.red : mats.blue;
      addBox('yaba-sign-fallback-' + spec.id, spec.position, spec.scale, fallbackSign, { yaw:spec.yaw, batch:false });
      continue;
    }
    try {
      const texture = await loadTexture(app, 'stage08p-sign-' + spec.id, spec.path);
      texture.anisotropy = 1;
      texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
      texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
      textureResources.push(texture);
      const signMaterial = makeTexturedMaterial(texture, 'Yaba business sign · ' + spec.id);
      addBox('yaba-sign-' + spec.id, spec.position, spec.scale, signMaterial, { yaw:spec.yaw, batch:false });
    } catch (error) {
      textureFailures.push(error.message);
      const fallbackSign = spec.id.includes('mama') || spec.id.includes('akara') ? mats.red : mats.blue;
      addBox('yaba-sign-fallback-' + spec.id, spec.position, spec.scale, fallbackSign, { yaw:spec.yaw, batch:false });
    }
  }

  // Three roadside poles support two connected overhead spans. Wires are a
  // project-authored low-poly cable asset, not a downloaded American powerline.
  const poleXs = [-30.0, -8.7, 8.7];
  for (let index=0; index<poleXs.length; index++) {
    const x = poleXs[index];
    addBox('yaba-street-power-pole-' + index,[x,3.85,111.4],[0.18,7.7,0.18],mats.fadedWood,{collision:true});
    addBox('yaba-street-power-crossarm-' + index,[x,7.25,111.4],[1.5,0.14,0.16],mats.zinc);
    for (const offset of [-0.55,0,0.55]) addBox('yaba-street-power-insulator-' + index,[x+offset,7.48,111.4],[0.15,0.22,0.15],mats.cream);
    addBox('yaba-street-power-brace-' + index,[x,6.45,111.4],[0.9,0.08,0.12],mats.darkMetal);
  }

  if (!lowDataMode) {
    try {
      const wireAsset = await loadContainer(app,'stage08p-overhead-wire-span','assets/yaba-street-library/grab3d/custom/overhead-wire-span-mobile.glb');
      retainedAssets.push(wireAsset);
      const wireSpecs = [
        { position:[-19.35,7.65,111.4], scale:[1.78,1,1] },
        { position:[0,7.65,111.4], scale:[1.45,1,1] }
      ];
      wireSpecs.forEach((spec,index)=>{
        const entity=wireAsset.resource.instantiateRenderEntity();
        entity.name='stage08p-overhead-wire-span-'+index;
        entity.setPosition(...spec.position);
        entity.setLocalScale(...spec.scale);
        entity.tags.add('stage08p-yaba-street-life-01');
        for(const component of entity.findComponents('render')){
          component.batchGroupId=-1;component.castShadows=false;component.receiveShadows=false;
        }
        root.addChild(entity);importedEntities.push(entity);
      });
    } catch(error) { assetFailures.push('overhead-wire-span: '+error.message); }
  }

  // Conservative gameplay collision boxes: the pole, stall, vendor counter,
  // kiosk and parked generator are obstacles; roof, wire and signs stay visual.
  const proxies = [
    {id:'market-stall',position:[-19.6,1.15,98.6],halfExtents:[1.6,1.15,1.8],rotationY:90},
    {id:'food-cart',position:[-14.2,0.8,106.0],halfExtents:[1.1,0.8,0.9],rotationY:90},
    {id:'shopfront-counter',position:[-24.9,0.68,101.0],halfExtents:[0.55,0.64,2.5],rotationY:0},
    {id:'generator',position:[-26.1,0.32,107.5],halfExtents:[0.5,0.32,0.36],rotationY:180},
    {id:'gas-cylinder',position:[-12.5,0.48,109.2],halfExtents:[0.18,0.48,0.18],rotationY:0}
  ];
  proxies.push(...poleXs.map((x,index)=>({id:'pole-'+index,position:[x,3.85,111.4],halfExtents:[0.12,3.85,0.12],rotationY:0})));
  for (const proxy of proxies) collisionProxies.push({ ...proxy, source:'stage08p-yaba-street-life-01' });

  const importedCount = importedAssets.filter(item=>item.loaded).length;
  const estimatedTriangles = importedAssets.filter(item=>item.loaded).reduce((sum,item)=>sum+(item.estimatedTriangles||0),0) + (importedEntities.length>ASSETS.length?1176*2:0);
  const state = {
    stage:'08P', id:'yaba-street-life-01', district:'Yaba · Lagos',
    layout:{ center:[-19.3,0,103], footprint:[19,15.5], roadConnection:'existing south Yaba distributor road', existingYabaPreserved:true, replacedLegacyPlaceholder:true, hiddenLegacyProps:hideLegacyProps },
    assetsRequested:ASSETS.length, assetsLoaded:importedCount, importedAssets, assetFailures, textureFailures,
    customMeshes, importedRenderComponents:importedEntities.reduce((sum,entity)=>sum+entity.findComponents('render').length,0),
    importedMeshInstances:importedEntities.reduce((sum,entity)=>sum+entity.findComponents('render').reduce((n,component)=>n+(component.meshInstances||[]).length,0),0),
    estimatedTriangles, collisionProxies:collisionProxies.length, customSigns:SIGNS.length-textureFailures.length,
    overheadWireSpans:lowDataMode?0:2, powerPoles:poleXs.length,
    staticBatching:Boolean(batchGroup), batchGroupId:batchGroup?.id??null, staticBatches:batchGroup?app.batcher?.getBatches?.(batchGroup.id)?.length||0:0,
    mobileAssetProfile:'512px textures · simplified geometry · geometry not Draco-compressed',
    dataSaverFallback:lowDataMode
  };

  return {
    stage:'08P', root, batchGroupId:batchGroup?.id??null, collisionProxies, importedAssets, assetFailures, textureFailures,
    getState:()=>({...state, staticBatches:batchGroup?app.batcher?.getBatches?.(batchGroup.id)?.length||0:0, staticBatchMembers:(()=>{const group=batchGroup?app.batcher?.getGroupById?.(batchGroup.id):null;return group?Object.values(group._obj||{}).reduce((sum,list)=>sum+(Array.isArray(list)?list.length:0),0):0;})(), importedAssets:state.importedAssets.map(item=>({...item}))}),
    destroy:()=>{
      try { root.destroy(); } catch {}
      for (const asset of retainedAssets) { try { app.assets.remove(asset); } catch {} }
    }
  };
}
