import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as pc from 'playcanvas';
import { createStage08NDistrictNeighbourhoods } from '../src/stage-08n-district-neighbourhoods.js';

// The stage is tested with lightweight entities; browser runtime owns real rendering and Bullet.
pc.Entity.prototype.addComponent=function(){};
const app={root:new pc.Entity('test-root'),batcher:{next:1,addGroup(name){return{id:this.next++,name};}}};
 app.root._enabled=true;app.root._enabledInHierarchy=true;
const box=(name,position,scale,mat,parent=app.root)=>{const entity=new pc.Entity(name);entity.setLocalPosition(...position);entity.setLocalScale(...scale);parent.addChild(entity);return entity;};
const material=(colour)=>({colour});
const manifest=JSON.parse(fs.readFileSync('public/assets/gidi/manifest.json','utf8'));
const stage=createStage08NDistrictNeighbourhoods({app,box,material,manifest});
const state=stage.getState();
assert.equal(state.buildingCount,20);
assert.equal(state.enterableInteriors,20,'all residential and commercial/office buildings must be enterable');
assert.equal(state.doorCount,20);
assert.equal(new Set(stage.doors.map(door=>door.id)).size,20,'every door needs a unique interaction ID');
assert.equal(state.npcSpawns,20,'four local NPCs per district');
assert.equal(state.activeDistrictNpcs,0,'distant district NPCs start inactive');
assert.equal(state.trafficVehicles,20,'four lane-following cars per district');
assert.equal(state.shops.length,5);
assert.equal(state.batchGroups,5);
assert.deepEqual(state.roofProfiles,{'flat-parapet':5,'sheet-pitch':5,'service-roof':5,'pergola':5},'each district should contain all four distinct roof profiles');
assert.equal(state.weatheredBuildings,7,'only a minority of the neighbourhood buildings should receive localized weathering');
assert.equal(state.vegetationPlanters,10,'each district gets two restrained planted forecourt planters');
assert.ok(state.buildings.every(building=>building.roofProfile&&typeof building.weathered==='boolean'));
assert.ok(state.collisionProxies>=220,'interior floors, entry steps and paths need collision support');
assert.equal(state.doorCollisionProxies,20);
assert.ok(state.detailMeshes>=400);
assert.ok(state.buildings.every(building=>building.enterable&&building.doorId));

const owners=new Map();
const playerPhysics={
  addStaticColliders(items,owner){owners.set(owner,{items,enabled:items.map(()=>true)});return items.length;},
  setStaticColliderEnabled(owner,index,enabled){const group=owners.get(owner);if(!group||index<0||index>=group.items.length)return false;group.enabled[index]=Boolean(enabled);return true;},
  removeStaticColliders(owner){return owners.delete(owner)?1:0;}
};
const attached=stage.attachRuntime({playerPhysics});
assert.equal(attached.doors,20);
assert.equal(attached.doorColliders,20);
assert.ok(attached.wallColliders>=160);

const targets=new Map();
const messages=[];
const interaction={register(target){targets.set(target.id,target);return()=>targets.delete(target.id);},setEnabled(id,enabled){const target=targets.get(id);if(target)target.enabled=enabled;return !!target;}};
const economy={purchase(id,price){return{success:true,message:`Purchased ${id} for ${price}`};}};
stage.registerInteractions(interaction,{economy});
const firstDoor=stage.doors[0];
stage.update(.016,{position:[1140,-3.9,-935]},{roster:[]});
assert.deepEqual(stage.getState().activeDistricts,['eko-cbd']);
assert.equal(stage.getState().activeDistrictNpcs,4);
assert.equal(stage.getState().activeTrafficVehicles,4);
assert.equal(firstDoor.root.enabled,true);
const doorTarget=targets.get(firstDoor.id);
assert.ok(doorTarget);
assert.equal(doorTarget.onInteract().message.startsWith('Door opened'),true);
assert.equal(firstDoor.open,true);
assert.equal(owners.get('stage08n-doors-eko-cbd').enabled[firstDoor.doorColliderLocalIndex],false,'opening a door must remove its collision blocker');
for(let i=0;i<24;i++)stage.update(.05,{position:[1140,-3.9,-935]},{roster:[]});
assert.ok(firstDoor.angle<=-95,'hinged door should animate to its open angle');
const shop=stage.shops[0];
const shopTarget=targets.get(shop.id);
assert.equal(shopTarget.canInteract(),true,'shop should become available when its door is open');
assert.equal(shopTarget.onInteract().message.includes('Purchased'),true);
assert.equal(doorTarget.onInteract().message.startsWith('Door closed'),true);
assert.equal(owners.get('stage08n-doors-eko-cbd').enabled[firstDoor.doorColliderLocalIndex],true,'closing a door must restore its collision blocker');

// NPCs are district-local, move on short routes, and traffic yields when a pedestrian is in its lane.
const car=stage.trafficVehicles.find(vehicle=>vehicle.districtId==='eko-cbd');
assert.ok(car);
stage.update(.05,{position:[1140,-3.9,-935]},{roster:[{district:'Eko CBD',position:car.position.slice()}]});
assert.equal(car.state,'yielding-to-pedestrian');
for(let i=0;i<180;i++)stage.update(.05,{position:[1140,-3.9,-935]},{roster:[]});
const residentDoor=stage.doors.find(door=>door.id==='stage08n-door-eko-cbd-1');
assert.equal(residentDoor.open,true,'resident NPC should open the home door while following its route');
assert.equal(residentDoor.manual,false,'NPC door opening must remain automatic');
assert.ok(stage.districtNpcs.some(actor=>actor.position.some((value,index)=>Math.abs(value-actor.route[0][index])>.2)),'district NPCs should leave their spawn point and follow routines');

// Interior roof hides when the player enters a building.
const building=stage.buildings[0];
const roof=firstDoor.roof;
stage.update(.016,{position:[building.position[0],building.position[1]+.2,building.position[2]]},{roster:[]});
assert.equal(roof.enabled,false);
assert.ok(firstDoor.roofElements.every(part=>part.enabled===false),'all roof accessories should hide with the base roof inside an interior');

stage.destroy();
assert.equal(owners.size,0,'district collision owners should be removed during cleanup');
console.log(JSON.stringify({pass:true,buildings:state.buildingCount,enterableInteriors:state.enterableInteriors,hingedDoors:state.doorCount,shops:state.shops.length,npcs:state.npcSpawns,trafficVehicles:state.trafficVehicles,collisionProxies:state.collisionProxies,doorColliders:state.doorCollisionProxies,detailMeshes:state.detailMeshes},null,2));
