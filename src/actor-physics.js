/** Shared mobile kinematic capsule physics: acceleration, gravity, AABB collision and agent separation. Not a full rigid-body solver. */
export function createActorPhysics({colliders=[],groundY=0,gravity=18}={}){
 const stats={steps:0,collisions:0,agentSeparations:0,actorsMoved:0,lastCollision:null};
 const bounds=o=>{const p=o.entity?.getPosition?.(),s=o.entity?.getLocalScale?.();return p&&s?{x:p.x,z:p.z,hx:Math.abs(s.x)/2,hz:Math.abs(s.z)/2,top:Math.max(Number(o.height)||0,p.y+Math.abs(s.y)/2),id:o.id||o.entity.name}:null;};
 const hit=(x,z,y,a)=>{for(const o of colliders){const b=bounds(o);if(!b||y+(a.height||1.75)<=groundY+.05||y>=b.top-.08)continue;if(x>b.x-b.hx-(a.radius||.28)&&x<b.x+b.hx+(a.radius||.28)&&z>b.z-b.hz-(a.radius||.28)&&z<b.z+b.hz+(a.radius||.28)){stats.lastCollision=b.id;return true;}}return false;};
 function step(a,desired=[0,0,0],dt=1/60,peers=[]){if(!a||!Array.isArray(a.position))return null;const h=Math.max(0,Math.min(.05,Number(dt)||0));if(!h)return a.position;a.velocity||=[0,0,0];a.radius||=.28;a.height||=1.75;const p=a.position,v=a.velocity,ox=p[0],oz=p[2];let dx=Number(desired[0])||0,dz=Number(desired[2])||0;
  for(const peer of peers){if(!peer||peer===a||!Array.isArray(peer.position))continue;const x=p[0]-peer.position[0],z=p[2]-peer.position[2],d=Math.hypot(x,z),min=a.radius+(peer.radius||.28)+.08;if(d>.001&&d<min){const k=(min-d)/min;dx+=x/d*k*1.8;dz+=z/d*k*1.8;stats.agentSeparations++;}}
  const blend=a.traversing?1:Math.min(1,(a.grounded===false?6:14)*h);v[0]+=(dx-v[0])*blend;v[2]+=(dz-v[2])*blend;if(a.grounded!==false&&Math.abs(dx)+Math.abs(dz)<.02){const drag=Math.exp(-8*h);v[0]*=drag;v[2]*=drag;}
  const nx=p[0]+v[0]*h;if(!hit(nx,p[2],p[1],a))p[0]=nx;else{v[0]=0;stats.collisions++;}const nz=p[2]+v[2]*h;if(!hit(p[0],nz,p[1],a))p[2]=nz;else{v[2]=0;stats.collisions++;}
  if(a.grounded===false||p[1]>groundY+.02){v[1]=Math.max(-24,v[1]-gravity*h);p[1]+=v[1]*h;if(p[1]<=groundY){p[1]=groundY;v[1]=0;a.grounded=true;}}else{p[1]=groundY;v[1]=0;a.grounded=true;}
  stats.steps++;if(Math.hypot(p[0]-ox,p[2]-oz)>.002)stats.actorsMoved++;return p;}
 return {step,getState:()=>({...stats,colliderCount:colliders.length,gravity,groundY,mode:"kinematic-capsule"})};
}