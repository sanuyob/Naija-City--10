/** Lightweight lane-following traffic AI for the Yaba/Ikeja arterial routes. */
export function createCityTrafficAI({ traffic = [], junctionZ = -25, mainMin = -88, mainMax = 58, crossLimit = 22, ikejaMin = 224, ikejaMax = 410 } = {}) {
  const stats={updates:0,vehicles:traffic.length,redLightStops:0,vehicleFollowing:0,pedestrianYields:0,routeWraps:0};

  function laneKey(vehicle) {
    const p=vehicle.entity.getPosition();
    return vehicle.route==='cross' ? `${vehicle.route}:${Math.round(p.z*10)/10}` : `${vehicle.route}:${Math.round(p.x*10)/10}`;
  }

  function update(dt,{mainGreen=true,pedestrians=[]}={}) {
    const step=Math.max(0,Math.min(.05,Number(dt)||0));
    if(!step)return getState();
    stats.updates++;
    const snapshots=traffic.map(vehicle=>({vehicle,position:vehicle.entity.getPosition(),lane:laneKey(vehicle)}));
    for(const snapshot of snapshots){
      const vehicle=snapshot.vehicle,p=snapshot.position;
      const axis=vehicle.route==='cross'?'x':'z';
      const current=p[axis],direction=vehicle.dir>0?1:-1;
      let speedScale=1,state='cruising';

      const ahead=snapshots.filter(other=>other.vehicle!==vehicle&&other.lane===snapshot.lane&&other.vehicle.dir===vehicle.dir)
        .map(other=>({gap:(other.position[axis]-current)*direction}))
        .filter(item=>item.gap>0&&item.gap<10).sort((a,b)=>a.gap-b.gap)[0];
      if(ahead){
        speedScale=Math.min(speedScale,ahead.gap<4.8?0:ahead.gap<7?.25:.65);
        state='following-vehicle';stats.vehicleFollowing++;
      }

      let redStopDistance=Infinity;
      if(vehicle.route==='main'){
        const stopLine=direction>0?junctionZ-7:junctionZ+7;
        redStopDistance=(stopLine-current)*direction;
        if(!mainGreen&&redStopDistance>=-0.25&&redStopDistance<9){speedScale=0;state='stopped-at-red';stats.redLightStops++;}
        else if(mainGreen&&redStopDistance>=0&&redStopDistance<5)speedScale=Math.min(speedScale,.45);
      }else if(vehicle.route==='cross'){
        const crossGreen=!mainGreen;
        const stopLine=direction>0?-7:7;
        redStopDistance=(stopLine-current)*direction;
        if(!crossGreen&&redStopDistance>=-0.25&&redStopDistance<9){speedScale=0;state='stopped-at-red';stats.redLightStops++;}
        else if(crossGreen&&redStopDistance>=0&&redStopDistance<5)speedScale=Math.min(speedScale,.45);
      }

      const pedestrianNear=pedestrians.some(actor=>{
        const q=actor.position;if(!Array.isArray(q))return false;
        const distance=Math.hypot(q[0]-p.x,q[2]-p.z);
        return distance<3.6;
      });
      if(pedestrianNear){speedScale=0;state='yielding-to-pedestrian';stats.pedestrianYields++;}

      const targetSpeed=vehicle.speed*speedScale;
      vehicle.currentSpeed=Number.isFinite(vehicle.currentSpeed)?vehicle.currentSpeed:vehicle.speed;
      const acceleration=targetSpeed<vehicle.currentSpeed?7.5:2.8;
      vehicle.currentSpeed+=Math.max(-acceleration*step,Math.min(acceleration*step,targetSpeed-vehicle.currentSpeed));
      p[axis]+=direction*vehicle.currentSpeed*step;

      if(vehicle.route==='main'){
        if(p.z<mainMin){p.z=mainMax;vehicle.currentSpeed=0;stats.routeWraps++;}
        if(p.z>mainMax){p.z=mainMin;vehicle.currentSpeed=0;stats.routeWraps++;}
        vehicle.entity.setEulerAngles(0,direction<0?180:0,0);
      }else if(vehicle.route==='cross'){
        if(p.x < -crossLimit){p.x=crossLimit;vehicle.currentSpeed=0;stats.routeWraps++;}
        if(p.x > crossLimit){p.x=-crossLimit;vehicle.currentSpeed=0;stats.routeWraps++;}
        vehicle.entity.setEulerAngles(0,direction>0?90:-90,0);
      }else{
        if(p.z>ikejaMax){p.z=ikejaMin;vehicle.currentSpeed=0;stats.routeWraps++;}
        if(p.z<ikejaMin){p.z=ikejaMax;vehicle.currentSpeed=0;stats.routeWraps++;}
        vehicle.entity.setEulerAngles(0,direction<0?180:0,0);
      }
      vehicle.entity.setPosition(p);
      vehicle.aiState=state;
    }
    return getState();
  }

  function getState(){
    return {...stats,states:traffic.reduce((out,vehicle)=>{const key=vehicle.aiState||'cruising';out[key]=(out[key]||0)+1;return out;},{})};
  }
  return {update,getState};
}
