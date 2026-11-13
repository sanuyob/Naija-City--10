import * as pc from 'playcanvas';

const base=import.meta.env.BASE_URL||'/';
const assetUrl=path=>new URL(String(path).replace(/^\//,''),new URL(base,window.location.origin)).href;

function hideLegacyBuildings(app) {
  const tags=['stage08a-building','stage08a-roof','stage08b-detail','stage08d-building','stage08d-architecture'];
  let hidden=0;
  for(const tag of tags) {
    for(const entity of app.root.findByTag(tag)||[]) {
      if(entity.render?.enabled!==false) { if(entity.render) entity.render.enabled=false; hidden++; }
    }
  }
  return hidden;
}

export function createStage08EBuildings({app}) {
  const state={stage:'08E',ready:false,expectedBuildings:0,loadedBuildings:0,loadingBuildings:0,failedBuildings:0,unloadedBuildings:0,legacyBodiesHidden:0,staticBatching:false,lod0:0,lod1:0,lod2:0,lastPlayerPosition:null,lastCandidateCount:0,activeDistricts:[],failures:[],textureEncoding:'embedded PNG; hero KTX2 pilot pending',heroBuildingId:null,heroBuildingLoaded:false,heroLoadMs:null,heroTextureEncoding:'not loaded',heroPbrMaterials:[],heroLoadError:null};
  const entries=[],loading=new Set(),loaded=new Map(),sharedMaterials=new Map(),assetsById=new Map();
  let masterAssetId=null;
  const batchGroup=app.batcher?.addGroup('stage08e-static-buildings',false,96);
  let tick=0,activeLoads=0;
  const maxConcurrent=2;

  async function loadOne(item) {
    if(loading.has(item.id)||loaded.has(item.id)) return;
    const loadStarted=performance.now();
    loading.add(item.id); activeLoads++; state.loadingBuildings=loading.size;
    let asset=assetsById.get(item.id);
    if(!asset) { asset=new pc.Asset(item.id,'container',{url:assetUrl(item.url)}); assetsById.set(item.id,asset); app.assets.add(asset); }
    try {
      await new Promise((resolve,reject)=>{
        asset.once('load',resolve);
        asset.once('error',error=>reject(new Error(error?.message||String(error||'GLB load failed'))));
        app.assets.load(asset);
      });
      if(!asset.resource) throw new Error('GLB container loaded without a resource');
      const entity=asset.resource.instantiateRenderEntity();
      entity.name='stage08e-'+item.id;
      entity.setPosition(item.position[0],item.position[1],item.position[2]);
      entity.setEulerAngles(0,item.rotationY||0,0);
      const lods=[0,1,2].map(i=>entity.findByName('LOD'+i)).filter(Boolean);
      if(lods.length!==3) throw new Error('GLB must contain LOD0, LOD1 and LOD2 nodes');
      lods.forEach((lod,i)=>{lod.enabled=i===0;});
      const collision=entity.findByName('COLLISION_PROXY');
      if(collision) collision.enabled=false;
      for(const component of entity.findComponents('render')) {
        for(const instance of component.meshInstances||[]) {
          const material=instance.material;
          if(!material) continue;
          if(!sharedMaterials.has(material.name)) sharedMaterials.set(material.name,material);
          else instance.material=sharedMaterials.get(material.name);
          instance.material.update();
        }
        if(batchGroup) component.batchGroupId=batchGroup.id;
      }
      app.root.addChild(entity);
      if(masterAssetId===null) masterAssetId=item.id;
      loaded.set(item.id,{entity,asset,lods,position:item.position,kind:item.kind,distance:Infinity,hero:Boolean(item.hero)});
      if(item.hero){state.heroBuildingId=item.id;state.heroBuildingLoaded=true;state.heroLoadMs=Math.round(performance.now()-loadStarted);state.heroTextureEncoding=item.textureEncoding||'unknown';state.heroPbrMaterials=[...(item.pbrMaterials||[])];}
      state.loadedBuildings=loaded.size;
      state.staticBatching=Boolean(batchGroup);
    } catch(error) {
      state.failedBuildings++;
      if(item.hero)state.heroLoadError=error.message;
      state.failures.push(item.id+': '+error.message);
      console.error('Stage 08E GLB load failed:',item.id,error);
    } finally {
      loading.delete(item.id); activeLoads=Math.max(0,activeLoads-1); state.loadingBuildings=loading.size;
    }
  }

  async function initialize() {
    state.legacyBodiesHidden=hideLegacyBuildings(app);
    const response=await fetch(assetUrl('assets/stage-08e-manifest.json'),{cache:'no-store'});
    if(!response.ok) throw new Error('Stage 08E manifest HTTP '+response.status);
    const manifest=await response.json();
    if(manifest.stage!=='08E'||!Array.isArray(manifest.models)) throw new Error('Invalid Stage 08E asset manifest');
    entries.push(...manifest.models);
    state.expectedBuildings=entries.length;
    state.textureEncoding=manifest.textureEncoding||state.textureEncoding;
    return state;
  }

  // Persistent, low-cost world collision is derived from the full manifest, not loaded render assets.
  // This keeps buildings solid while their visual GLBs are streamed out of memory.
  const collisionRadius=0.38;
  const collisionHeight=1.8;
  function overlapsBuilding(x,z,y,item) {
    const size=item.size||[5,5,6];
    const center=item.position||[0,0,0];
    const bottom=center[1]||0, top=bottom+size[1];
    if(y+collisionHeight<=bottom||y>=top) return false;
    const nearestX=Math.max(center[0]-size[0]/2,Math.min(center[0]+size[0]/2,x));
    const nearestZ=Math.max(center[2]-size[2]/2,Math.min(center[2]+size[2]/2,z));
    const dx=x-nearestX,dz=z-nearestZ;
    return dx*dx+dz*dz<collisionRadius*collisionRadius;
  }
  function collides(x,z,y) {
    return entries.some(item=>overlapsBuilding(x,z,y,item));
  }
  function resolveMovement(current,proposed) {
    let x=proposed[0],z=proposed[2];
    const y=proposed[1];
    // Resolve axes separately so the player can slide along a facade instead of sticking.
    if(collides(x,current[2],y)) x=current[0];
    if(collides(x,z,y)) z=current[2];
    return [x,y,z];
  }

  function update(position) {
    if(!state.ready||!position) return;
    state.lastPlayerPosition=[position[0],position[1],position[2]];
    tick++;
    if(tick%8===0) {
      state.lod0=state.lod1=state.lod2=0;
      for(const item of loaded.values()) {
        const dx=position[0]-item.position[0],dz=position[2]-item.position[2];
        const distance=Math.hypot(dx,dz); item.distance=distance;
        if(distance>210&&item.asset!==undefined&&item.entity&&item.asset.name!==masterAssetId) {
          item.entity.destroy();
          item.asset.unload();
          loaded.delete(item.asset.name);
          state.unloadedBuildings++;
          state.loadedBuildings=loaded.size;
          continue;
        }
        item.entity.enabled=distance<=210;
        const level=distance<75?0:distance<145?1:2;
        item.lods.forEach((lod,i)=>{lod.enabled=item.entity.enabled&&i===level;});
        if(item.entity.enabled) state['lod'+level]++;
      }
    }
    if(activeLoads>=maxConcurrent) return;
    const candidates=entries
      .filter(item=>!loaded.has(item.id)&&!loading.has(item.id)&&!state.failures.some(f=>f.startsWith(item.id+':')))
      .map(item=>({...item,distance:Math.hypot(position[0]-item.position[0],position[2]-item.position[2])}))
      .filter(item=>item.distance<=150)
      .sort((a,b)=>Number(Boolean(b.hero))-Number(Boolean(a.hero))||a.distance-b.distance);
    state.lastCandidateCount=candidates.length;
    state.activeDistricts=[...new Set(candidates.map(item=>item.district).filter(Boolean))];
    for(const item of candidates.slice(0,maxConcurrent-activeLoads)) loadOne(item);
  }

  return {initialize:async()=>{await initialize();state.ready=true;state.collisionProxyCount=entries.length;state.collisionMode='persistent static circle-vs-AABB building colliders';state.collisionRadius=collisionRadius;return state;},update,resolveMovement,getState:()=>({...state,streaming:'distance-based progressive loading with unload/eviction outside 210m (first shared-material source is pinned)',cachedAssets:loaded.size,sharedMaterialCount:sharedMaterials.size,masterMaterialAsset:masterAssetId})};
}
