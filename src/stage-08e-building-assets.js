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
  const state={stage:'08E',ready:false,expectedBuildings:0,loadedBuildings:0,loadingBuildings:0,failedBuildings:0,unloadedBuildings:0,legacyBodiesHidden:0,staticBatching:false,lod0:0,lod1:0,lod2:0,failures:[],textureEncoding:'embedded PNG; Basis/KTX2 compression pending'};
  const entries=[],loading=new Set(),loaded=new Map(),sharedMaterials=new Map(),assetsById=new Map();
  let masterAssetId=null;
  const batchGroup=app.batcher?.addGroup('stage08e-static-buildings',false,96);
  let tick=0,activeLoads=0;
  const maxConcurrent=2;

  async function loadOne(item) {
    if(loading.has(item.id)||loaded.has(item.id)) return;
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
      loaded.set(item.id,{entity,asset,lods,position:item.position,kind:item.kind,distance:Infinity});
      state.loadedBuildings=loaded.size;
      state.staticBatching=Boolean(batchGroup);
    } catch(error) {
      state.failedBuildings++;
      state.failures.push(item.id+': '+error.message);
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

  function update(position) {
    if(!state.ready||!position) return;
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
      .sort((a,b)=>a.distance-b.distance);
    state.activeDistricts=[...new Set(candidates.map(item=>item.district).filter(Boolean))];
    for(const item of candidates.slice(0,maxConcurrent-activeLoads)) loadOne(item);
  }

  return {initialize:async()=>{await initialize();state.ready=true;return state;},update,getState:()=>({...state,streaming:'distance-based progressive loading with unload/eviction outside 210m (first shared-material source is pinned)',cachedAssets:loaded.size,sharedMaterialCount:sharedMaterials.size,masterMaterialAsset:masterAssetId})};
}
