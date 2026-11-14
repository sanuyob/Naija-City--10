/** Contextual parkour: step, vault, mantle, ledge, ladder, wall-run/wall-hop and drop. */
const PROFILES={
 step:{clips:["Hero01_StepUp"],duration:.78,apex:.15,mode:"step"},
 "low-vault":{clips:["Hero01_VaultLow"],duration:.92,apex:.34,mode:"vault"},
 "high-vault":{clips:["Hero01_VaultHigh"],duration:1.12,apex:.48,mode:"vault"},
 mantle:{clips:["Hero01_Mantle"],duration:1.34,apex:.54,mode:"mantle"},
 ledge:{clips:["Hero01_LedgeHang","Hero01_LedgeShimmyLeft","Hero01_LedgePullUp"],duration:1.48,apex:.26,mode:"ledge"},
 ladder:{clips:["Hero01_LadderMount","Hero01_LadderClimb","Hero01_LadderDismount"],duration:1.62,apex:.18,mode:"ladder"},
 "wall-run":{clips:["Hero01_Run","Hero01_WallHop"],duration:1.08,apex:.20,mode:"wall-run"},
 drop:{clips:["Hero01_DropDown","Hero01_Landing"],duration:.92,apex:.08,mode:"drop"}
};
export function createTraversalSystem({playerController,obstacles=[],onEffect}={}) {
 if(!playerController)throw new Error("Traversal requires player controller");
 const list=obstacles.filter(o=>o?.entity&&PROFILES[o.type]);let activeId=null,timer=0,started=0,completed=0,last=null,blocked=null;
 function resolveMovement(current,proposed){for(const o of list){if(o.id===activeId)continue;const p=o.entity.getPosition(),s=o.entity.getLocalScale();if((proposed[1]||0)>o.height+.15)continue;if(Math.abs(proposed[0]-p.x)<Math.abs(s.x)*.5+.32&&Math.abs(proposed[2]-p.z)<Math.abs(s.z)*.5+.32)return current;}return proposed;}
 function tryContextualTraversal(state=playerController.getState()){
  if(!state?.grounded||state.traversing||timer>0){blocked="Player must be grounded and free";return false;}
  const yaw=(Number(state.facingYaw)||0)*Math.PI/180,fx=Math.sin(yaw),fz=-Math.cos(yaw),[x,y,z]=state.position;let best=null;
  for(const o of list){const p=o.entity.getPosition(),s=o.entity.getLocalScale(),dx=p.x-x,dz=p.z-z,along=dx*fx+dz*fz,lateral=Math.abs(dx*fz-dz*fx);if(along<.2||along>3.8||lateral>Math.abs(s.x)*.5+.82)continue;if(!best||along<best.along)best={o,along};}
  if(!best){blocked="Face a marked step, vault, ledge, ladder or wall";return false;}
  const profile=PROFILES[best.o.type],s=best.o.entity.getLocalScale(),clearance=best.along+Math.abs(s.z)*.5+.72,destination=[x+fx*clearance,Math.max(0,y),z+fz*clearance];
  const clearanceMargin=best.o.type==="step"?.30:best.o.type==="ladder"?.34:.46;
  const requiredApex=Math.min(4.0,Math.max(profile.apex,Number(best.o.height||0)+clearanceMargin));
  const ok=playerController.performTraversal(profile.clips[0],destination,{duration:profile.duration,apex:requiredApex,mode:profile.mode,clips:profile.clips,obstacleId:best.o.id,obstacleHeight:best.o.height});
  if(!ok){blocked="Get closer to the obstacle and face it";return false;}activeId=best.o.id;timer=profile.duration+.22;started++;blocked=null;last={obstacle:best.o.id,type:best.o.type,clip:profile.clips[0],clips:profile.clips.slice(),destination};onEffect?.("parkour",state.position);return true;
 }
 function update(dt){if(timer<=0)return;timer=Math.max(0,timer-Math.min(.05,Math.max(0,dt)));if(timer===0){activeId=null;completed++;}}
 return {tryContextualTraversal,resolveMovement,update,getState:()=>({stage:"09-traversal",obstacleCount:list.length,availableTypes:[...new Set(list.map(o=>o.type))],traversalsStarted:started,traversalsCompleted:completed,activeObstacleId:activeId,lastTraversal:last,lastBlockedReason:blocked,obstacles:list.map(o=>({id:o.id,type:o.type,height:o.height}))})};
}