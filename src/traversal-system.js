/** Contextual parkour and authored climbing routes. */
const PROFILES={
 step:{clips:["Hero01_StepUp"],duration:.78,apex:.15,mode:"step"},
 "low-vault":{clips:["Hero01_VaultLow"],duration:.92,apex:.34,mode:"vault"},
 "high-vault":{clips:["Hero01_VaultHigh"],duration:1.12,apex:.48,mode:"vault"},
 mantle:{clips:["Hero01_Mantle"],duration:1.34,apex:.54,mode:"mantle"},
 ledge:{clips:["Hero01_LedgeHang","Hero01_LedgeShimmyLeft","Hero01_LedgePullUp"],duration:1.48,apex:.26,mode:"ledge"},
 ladder:{clips:["Ara_LadderMount","Ara_LadderClimb","Ara_LadderDismount"],duration:2.02,apex:.18,mode:"ladder"},
 "wall-run":{clips:["Hero01_Run","Hero01_WallHop"],duration:1.08,apex:.20,mode:"wall-run"},
 drop:{clips:["Hero01_DropDown","Hero01_Landing"],duration:.92,apex:.08,mode:"drop"}
};

export function createTraversalSystem({playerController,physics=null,obstacles=[],onEffect}={}) {
 if(!playerController)throw new Error("Traversal requires player controller");
 const list=obstacles.filter(o=>o?.entity&&PROFILES[o.type]);
 let activeId=null,timer=0,started=0,completed=0,last=null,blocked=null,activeColliderIndices=[];
 function resolveMovement(current,proposed){
  for(const o of list){
   if(o.id===activeId)continue;
   const p=o.entity.getPosition(),s=o.entity.getLocalScale();
   if((proposed[1]||0)>o.height+.15)continue;
   if(Math.abs(proposed[0]-p.x)<Math.abs(s.x)*.5+.32&&Math.abs(proposed[2]-p.z)<Math.abs(s.z)*.5+.32)return current;
  }
  return proposed;
 }
 function tryContextualTraversal(state=playerController.getState(),targetObstacleId=null){
  if(!state?.grounded||state.traversing||timer>0){blocked="Player must be grounded and free";return false;}
  const yaw=(Number(state.facingYaw)||0)*Math.PI/180,fx=-Math.sin(yaw),fz=-Math.cos(yaw),[x,y,z]=state.position;
  let best=null;
  for(const o of list){
   if(targetObstacleId&&o.id!==targetObstacleId)continue;
   const p=o.entity.getPosition(),s=o.entity.getLocalScale(),dx=p.x-x,dz=p.z-z;
   const along=dx*fx+dz*fz,lateral=Math.abs(dx*fz-dz*fx);
   const maxReach=o.type==="ladder"?3.0:5.2;
   if(along<.12||along>maxReach||lateral>Math.abs(s.x)*.5+1.15)continue;
   if(!best||along<best.along)best={o,along};
  }
  if(!best){blocked="No traversal surface in front — move closer and face the obstacle";return false;}
  const profile=PROFILES[best.o.type],s=best.o.entity.getLocalScale(),obstaclePosition=best.o.entity.getPosition();
  const climbToTop=new Set(["step","mantle","ledge","ladder"]).has(best.o.type);
  const targetY=climbToTop?Math.max(y,Number(best.o.height)||0):Math.max(0,y);
  const normal=Array.isArray(best.o.approach)?best.o.approach.slice(0,2):[x-obstaclePosition.x,z-obstaclePosition.z];
  const normalLength=Math.hypot(normal[0],normal[1])||1;
  normal[0]/=normalLength;normal[1]/=normalLength;
  // Controller forward convention is (-sin(yaw), -cos(yaw)). The outward
  // normal points from the wall to the player, so face its opposite.
  const facingYaw=Number.isFinite(best.o.approachYaw)?best.o.approachYaw:Math.atan2(normal[0],normal[1])*180/Math.PI;
  const isLadder=best.o.type==="ladder";
  // Stand on the approach side of the ladder. Its normal points from the
  // obstacle toward the player; subtracting it sent the character through
  // the ladder/wall to the far side.
  const ladderHalfDepth=Math.abs(normal[0])*Math.abs(s.x)*.5+Math.abs(normal[1])*Math.abs(s.z)*.5;
  const ladderStandOff=ladderHalfDepth+.31+.08;
  const destination=best.o.destination
   ? best.o.destination.map((value,index)=>index===1?targetY:value)
   : climbToTop
    ? isLadder
      ? [obstaclePosition.x+normal[0]*ladderStandOff,targetY,obstaclePosition.z+normal[1]*ladderStandOff]
      : [obstaclePosition.x,targetY,obstaclePosition.z]
    : [x+fx*(best.along+Math.abs(s.z)*.5+.72),targetY,z+fz*(best.along+Math.abs(s.z)*.5+.72)];
  const clearanceMargin=best.o.type==="step"?.30:best.o.type==="ladder"?.34:.46;
  const requiredApex=Math.min(1.55,Math.max(profile.apex,Number(best.o.height||0)+clearanceMargin));
  const requestedColliderIndices=Array.isArray(best.o.physicsColliderIndices)?best.o.physicsColliderIndices:[list.indexOf(best.o)];
  // A ladder is an authored trigger rail, not the whole building. Release
  // only that narrow rail collider while climbing; keep the building proxy
  // active so the player capsule still has real Bullet wall/roof collision.
  const colliderIndices=isLadder?requestedColliderIndices.slice(0,1):requestedColliderIndices;
  let ladderOptions={};
  let actionDuration=profile.duration;
  if(isLadder){
   // Mount, alternate hands/feet on real rungs, then step onto the roof.
   // Ara's generated climb clip contains two rung pulls in 0.92 s, so the
   // body advances exactly one authored rung per 0.46 s animation cycle.
   const mountPosition=[obstaclePosition.x+normal[0]*ladderStandOff,y,obstaclePosition.z+normal[1]*ladderStandOff];
   const rungSpacing=Math.max(.25,Number(best.o.rungSpacing)||.4);
   const climbHeight=Math.max(.25,destination[1]-mountPosition[1]);
   const rungCount=Math.max(1,Math.ceil(climbHeight/rungSpacing));
   // The Blender-authored loop alternates both hands and feet twice per
   // full clip. Each half-cycle is one physical rung, so root travel advances
   // one rung every half of the exported clip duration.
   const mountDuration=playerController.getClipDuration?.('Ara_LadderMount')||.75;
   const climbCycle=playerController.getClipDuration?.('Ara_LadderClimb')||.958;
   const rungDuration=climbCycle*.5;
   const dismountDuration=playerController.getClipDuration?.('Ara_LadderDismount')||.75;
   const climbDuration=Math.max(.5,rungCount*rungDuration);
   const phaseDurations=[mountDuration,climbDuration,dismountDuration];
   actionDuration=phaseDurations.reduce((sum,value)=>sum+value,0);
   ladderOptions={mountPosition,ladderPosition:[obstaclePosition.x,obstaclePosition.y-Math.abs(s.y)*.5,obstaclePosition.z],
    ladderNormal:normal,rungSpacing,rungCount,ladderStandOff,phaseDurations};
  }
  const ok=playerController.performTraversal(profile.clips[0],destination,{
   duration:actionDuration,apex:requiredApex,mode:profile.mode,clips:profile.clips,
   obstacleId:best.o.id,obstacleHeight:best.o.height,facingYaw,...ladderOptions
  });
  if(!ok){blocked="Traversal is blocked here — reposition in front of the obstacle";return false;}
  activeId=best.o.id;activeColliderIndices=colliderIndices.slice();
  for(const colliderIndex of activeColliderIndices)physics?.setColliderEnabled?.(colliderIndex,false);
  timer=Math.max(2.4,actionDuration*2.2);started++;blocked=null;
  last={obstacle:best.o.id,type:best.o.type,clip:profile.clips[0],clips:profile.clips.slice(),destination,
   facingYaw,normal,roofRoute:Boolean(best.o.roofRoute),buildingId:best.o.buildingId||null,
   duration:actionDuration,collidersReleased:colliderIndices.length,
   ...(isLadder?{rungSpacing:ladderOptions.rungSpacing,rungCount:ladderOptions.rungCount,
     ladderStandOff:ladderOptions.ladderStandOff,phaseDurations:ladderOptions.phaseDurations}: {})};
  onEffect?.("parkour",state.position);return true;
 }
 function update(dt){
  if(timer<=0)return;
  timer=Math.max(0,timer-Math.min(.05,Math.max(0,dt)));
  const finished=!playerController.getState().traversing;
  if(finished||timer===0){
   for(const colliderIndex of activeColliderIndices)physics?.setColliderEnabled?.(colliderIndex,true);
   activeColliderIndices=[];activeId=null;timer=0;completed++;
  }
 }
 return {tryContextualTraversal,resolveMovement,update,getState:()=>({stage:"09-traversal",obstacleCount:list.length,
  buildingRouteCount:new Set(list.filter(o=>o.roofRoute).map(o=>o.buildingId)).size,
  buildingAccessPointCount:list.filter(o=>o.roofRoute).length,availableTypes:[...new Set(list.map(o=>o.type))],
  traversalsStarted:started,traversalsCompleted:completed,activeObstacleId:activeId,lastTraversal:last,lastBlockedReason:blocked,
  obstacles:list.map(o=>({id:o.id,type:o.type,height:o.height,roofRoute:Boolean(o.roofRoute),buildingId:o.buildingId||null}))})};
}
