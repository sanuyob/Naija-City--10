import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createStage08LGidiDistrictActivities } from '../src/stage-08l-gidi-district-activities.js';

const manifest=JSON.parse(fs.readFileSync('public/assets/gidi/manifest.json','utf8'));
const entities=[];
let nextGroupId=1;const app={root:{addChild(){}},batcher:{addGroup(name,transparent,maxAabb){return{id:nextGroupId++,name,transparent,maxAabb};}}};
const box=(name,position,scale,mat)=>{const entity={name,position,scale,tags:{add(){}},getGuid:()=>String(entities.length)};entities.push(entity);return entity;};
const material=(colour)=>({colour});
const stage=createStage08LGidiDistrictActivities({app,box,material});
assert.equal(stage.stage,'08L');
assert.equal(stage.enterableInteriors,5);
assert.equal(stage.activityCount,5);
assert.equal(stage.pickupCount,15);
assert.equal(stage.batchGroupIds.length,5,'district hubs should use spatially bounded static batches');
assert.equal(stage.collisionProxies.length,40,'eight structural and counter/shelf collision proxies per hub');
assert.ok(stage.detailMeshes>=100,'interior hubs should have real architectural and activity detail');

for(const hub of stage.hubs){
  const [x,y,z]=hub.center;
  const manifestX=hub.district==='Eko CBD'?1150:hub.district==='Victoria Island'?1650:hub.district==='Ikoyi'?2150:hub.district==='Lekki'?2950:3450;
  const manifestZ=hub.district==='Eko CBD'?-950:hub.district==='Victoria Island'?-1350:hub.district==='Ikoyi'?-950:hub.district==='Lekki'?-1350:-550;
  assert.ok(Math.abs(x-manifestX)<=50&&Math.abs(z-manifestZ)<=50,`${hub.district}: activity should remain inside its surveyed terrain tile`);
  assert.ok(y<0,'hub floor should follow the surveyed GIDI terrain height');
  const colliders=manifest.cells.flatMap(cell=>cell.colliders||[]);
  const terrain=colliders.find(proxy=>proxy.kind==='terrain'&&Math.abs(x-proxy.position[0])<=proxy.halfExtents[0]&&Math.abs(z-proxy.position[2])<=proxy.halfExtents[2]);
  assert.ok(terrain,`${hub.district}: hub must be on a surveyed land tile`);
  assert.ok(Math.abs(y-(terrain.position[1]+terrain.halfExtents[1]+manifest.worldYOffset))<0.02,`${hub.district}: floor must align with streamed terrain height`);
  let roadClearance=Infinity,buildingClearance=Infinity;
  for(const proxy of colliders){
    const dx=Math.max(Math.abs(x-proxy.position[0])-proxy.halfExtents[0],0),dz=Math.max(Math.abs(z-proxy.position[2])-proxy.halfExtents[2],0),distance=Math.hypot(dx,dz);
    if(proxy.kind==='road')roadClearance=Math.min(roadClearance,distance);
    if(proxy.kind==='building')buildingClearance=Math.min(buildingClearance,distance);
  }
  assert.ok(roadClearance>=9,`${hub.district}: hub footprint must clear the carriageway`);
  assert.ok(buildingClearance>=10,`${hub.district}: hub must not overlap an existing GIDI building`);
  assert.equal(hub.pickups.length,3);
  for(const pickup of hub.pickups){
    assert.ok(Math.hypot(pickup.position[0]-x,pickup.position[2]-z)<4.5,'all activity pickups must be reachable inside the hub');
  }
}

const targets=new Map();
const fakeInteraction={
  register(target){targets.set(target.id,target);return()=>targets.delete(target.id);},
  setEnabled(id,enabled){const target=targets.get(id);if(target)target.enabled=enabled;return !!target;}
};
stage.registerInteractions(fakeInteraction);
for(const hub of stage.hubs){
  for(const pickup of hub.pickups){
    const target=targets.get(pickup.id);
    assert.ok(target,`missing pickup target ${pickup.id}`);
    const result=target.onInteract();
    assert.equal(result.message.includes('1/3')||result.message.includes('2/3')||result.message.includes('3/3'),true);
  }
  const station=targets.get(hub.id+'-counter');
  assert.ok(station);
  const completed=station.onInteract();
  assert.ok(completed.message.startsWith('ACTIVITY COMPLETE'));
  assert.equal(hub.completed,true);
}
console.log(JSON.stringify({pass:true,stage:stage.stage,interiors:stage.enterableInteriors,activities:stage.activityCount,pickups:stage.pickupCount,collisionProxies:stage.collisionProxies.length,detailMeshes:stage.detailMeshes},null,2));
