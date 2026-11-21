import assert from 'node:assert/strict';
import { createCityTrafficAI } from '../src/city-traffic-ai.js';
function vehicle(name,route,x,z,dir=1,speed=6){const position={x,y:0,z};return {name,route,dir,speed,currentSpeed:speed,entity:{getPosition:()=>({...position}),setPosition:p=>Object.assign(position,p),setEulerAngles(){}}};}
const lead=vehicle('lead','main',-2.65,-35,1,3);
const follower=vehicle('follower','main',-2.65,-43,1,7);
const crossing=vehicle('cross','cross',-8,-25,1,5);
const pedestrian=vehicle('unused','none',0,0);
const ai=createCityTrafficAI({traffic:[lead,follower,crossing],junctionZ:-25});
const red=ai.update(.05,{mainGreen:false,pedestrians:[]});
assert.equal(lead.aiState,'stopped-at-red');
assert.equal(crossing.aiState,'cruising','cross traffic should receive green while the main road is red');
assert.ok(red.redLightStops>=1);
ai.update(.05,{mainGreen:true,pedestrians:[{position:[-2.65,0,-43]}]});
assert.equal(crossing.aiState,'stopped-at-red','cross traffic must stop when the main road receives green');
assert.equal(follower.aiState,'yielding-to-pedestrian');
assert.ok(follower.currentSpeed<7);
ai.update(.05,{mainGreen:true,pedestrians:[]});
assert.ok(['following-vehicle','cruising'].includes(follower.aiState));
console.log(JSON.stringify({pass:true,vehicles:ai.getState().vehicles,redLightStops:ai.getState().redLightStops,pedestrianYields:ai.getState().pedestrianYields,vehicleFollowing:ai.getState().vehicleFollowing},null,2));
