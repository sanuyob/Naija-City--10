import * as pc from 'playcanvas';

export async function startGame({ statusLabel, perfToggle, perfPanel }) {
  const canvas = document.getElementById('application');
  const speedLabel = document.getElementById('speed');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #application canvas');
  statusLabel.textContent = 'Starting 3D engine…';
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2] });
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  const options = new pc.AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
  // No external textures or GLB assets are loaded in this procedural blockout; keep asset handlers out of the bundle.
  const app = new pc.AppBase(canvas);
  app.init(options);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight = new pc.Color(0.42, 0.43, 0.45);
  window.addEventListener('resize', () => app.resizeCanvas());
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); statusLabel.textContent = 'Graphics context lost. Reload this page to try again.'; });

  function material(color, roughness = 0.85) {
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(...color);
    mat.shininess = (1 - roughness) * 80;
    mat.update();
    return mat;
  }
  function box(name, position, scale, mat, parent = app.root) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box', material: mat });
    e.setLocalPosition(...position);
    e.setLocalScale(...scale);
    parent.addChild(e);
    return e;
  }
  const m = {
    asphalt: material([0.12,0.14,0.15]), concrete: material([0.48,0.47,0.42]),
    yellow: material([0.92,0.83,0.55]), white: material([0.86,0.86,0.81]),
    ground: material([0.24,0.34,0.24]), dark: material([0.07,0.08,0.08]),
    metal: material([0.24,0.27,0.28],0.45), green: material([0.08,0.32,0.20]),
    red: material([0.68,0.12,0.08]), blue: material([0.12,0.28,0.48]),
    shops: [material([0.68,0.49,0.31]),material([0.56,0.62,0.58]),material([0.70,0.66,0.52]),material([0.43,0.53,0.60])]
  };

  const camera = new pc.Entity('chase-camera');
  camera.addComponent('camera',{clearColor:new pc.Color(0.49,0.72,0.88),fov:62,farClip:190});
  camera.setPosition(0,7,13); camera.lookAt(0,0,0); app.root.addChild(camera);
  const sun = new pc.Entity('sun');
  sun.addComponent('light',{type:'directional',color:new pc.Color(1,0.91,0.78),intensity:1.05});
  sun.setEulerAngles(48,28,0); app.root.addChild(sun);

  box('ground',[0,-0.35,-18],[46,0.5,154],m.ground);
  box('main-road',[0,-0.07,-18],[11,0.16,150],m.asphalt);
  box('left-footpath',[-6.1,0.02,-18],[1.1,0.2,150],m.concrete);
  box('right-footpath',[6.1,0.02,-18],[1.1,0.2,150],m.concrete);
  for(let z=-86;z<54;z+=9) box('lane-dash',[0,0.025,z],[0.14,0.025,3.8],m.yellow);

  // Stage 02 four-way junction with side street, zebra crossings and stop lines.
  const junctionZ=-25;
  box('cross-street',[0,-0.055,junctionZ],[42,0.17,9],m.asphalt);
  box('junction-left-kerb',[-21.2,0.02,junctionZ],[0.55,0.24,9.8],m.concrete);
  box('junction-right-kerb',[21.2,0.02,junctionZ],[0.55,0.24,9.8],m.concrete);
  for(let i=0;i<5;i++){const x=-3.1+i*1.55;box('north-crosswalk',[x,0.035,junctionZ-5.1],[0.95,0.035,0.85],m.white);box('south-crosswalk',[x,0.035,junctionZ+5.1],[0.95,0.035,0.85],m.white);}
  for(let i=0;i<4;i++){const z=junctionZ-2.6+i*1.7;box('west-crosswalk',[-6.3,0.035,z],[0.9,0.035,1],m.white);box('east-crosswalk',[6.3,0.035,z],[0.9,0.035,1],m.white);}
  box('north-stop-line',[0,0.04,junctionZ-6],[7.8,0.035,0.18],m.white);
  box('south-stop-line',[0,0.04,junctionZ+6],[7.8,0.035,0.18],m.white);
  box('junction-center-mark',[0,0.035,junctionZ],[0.22,0.025,0.22],m.yellow);

  for(let i=0;i<16;i++){const z=-82+i*9.5,lh=4+(i%3)*1.3,rh=4.5+((i+1)%3)*1.1;box('street-shop-left',[-9.2,lh/2,z],[5.2,lh,6.8],m.shops[i%4]);box('street-shop-right',[9.2,rh/2,z-2],[5.2,rh,6.8],m.shops[(i+2)%4]);}
  for(const side of [-1,1]) for(let z=-68;z<48;z+=24){box('drain-cover',[side*6.35,0.14,z],[0.45,0.06,1.5],m.dark);box('drain-grate',[side*6.35,0.18,z],[0.34,0.025,1.1],m.metal);}
  box('roadside-kiosk',[-7.9,1.15,-17],[2.3,2.3,2.4],m.green);
  box('kiosk-awning',[-7.9,2.42,-17],[2.7,0.18,2.8],m.red);
  box('bus-stop-post',[7.3,1.65,-37],[0.12,3.3,0.12],m.metal);
  box('bus-stop-sign',[7.3,3,-37],[1.25,0.65,0.12],m.blue);
  box('bus-stop-bench',[7.9,0.65,-37],[1.6,0.16,0.48],m.metal);
  for(const z of [-12,-39,-62]){box('streetlight-pole',[-7.2,3.3,z],[0.12,6.6,0.12],m.metal);box('streetlight-arm',[-6.8,6.45,z],[0.9,0.12,0.12],m.metal);box('streetlight-head',[-6.35,6.35,z],[0.55,0.18,0.32],m.yellow);}
  for(const x of [-6.9,6.9]) for(const z of [junctionZ-7,junctionZ+7]) box('junction-bollard',[x,0.55,z],[0.28,1.1,0.28],m.yellow);

  // Stage 03 traffic: a small, pooled set of low-poly vehicles follows lane paths.
  const trafficMaterials=[
    material([0.12,0.34,0.68],0.4),material([0.82,0.68,0.12],0.4),
    material([0.18,0.46,0.28],0.4),material([0.68,0.18,0.12],0.4)
  ];
  const traffic=[];
  function makeTrafficCar(name,color,x,z,yaw=0){
    const entity=new pc.Entity(name);app.root.addChild(entity);
    const body=new pc.Entity(name+'-body');body.addComponent('render',{type:'box',material:color});
    body.setLocalScale(1.65,0.58,3.15);body.setLocalPosition(0,0.62,0);entity.addChild(body);
    const cabin=new pc.Entity(name+'-cabin');cabin.addComponent('render',{type:'box',material:glass});
    cabin.setLocalScale(1.32,0.62,1.45);cabin.setLocalPosition(0,1.17,-0.18);entity.addChild(cabin);
    entity.setPosition(x,0,z);entity.setEulerAngles(0,yaw,0);
    return entity;
  }
  const mainTraffic=[
    {x:-2.65,z:-64,dir:1,speed:7.0},
    {x:2.65,z:-48,dir:-1,speed:6.2},
    {x:-2.65,z:5,dir:1,speed:7.8},
    {x:2.65,z:35,dir:-1,speed:6.8}
  ];
  mainTraffic.forEach((v,i)=>traffic.push({entity:makeTrafficCar('traffic-main-'+i,trafficMaterials[i%4],v.x,v.z,v.dir<0?180:0),...v,route:'main'}));
  const crossTraffic=[
    {x:-17,z:junctionZ-2.2,dir:1,speed:5.5},
    {x:17,z:junctionZ+2.2,dir:-1,speed:5.0}
  ];
  crossTraffic.forEach((v,i)=>traffic.push({entity:makeTrafficCar('traffic-cross-'+i,trafficMaterials[(i+1)%4],v.x,v.z,v.dir>0?90:-90),...v,route:'cross'}));

  // Traffic signal phases are deliberately simple and deterministic for repeatable mobile tests.
  const signalRed=material([0.9,0.04,0.025]),signalAmber=material([0.95,0.55,0.04]),signalGreen=material([0.05,0.75,0.2]);
  const signalLamps=[];
  for(const side of [-1,1]){
    const poleEntity=box('traffic-signal-pole',[side*7.5,3.0,junctionZ+side*8],[0.16,6,0.16],m.metal);
    const head=box('traffic-signal-head',[side*7.5,5.0,junctionZ+side*8],[0.72,1.8,0.55],m.dark);
    const lamps=[
      box('signal-red',[side*7.5,5.55,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalRed,head),
      box('signal-amber',[side*7.5,5.0,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalAmber,head),
      box('signal-green',[side*7.5,4.45,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalGreen,head)
    ];
    signalLamps.push(lamps);
  }
  let signalClock=0,mainGreen=true;
  const trafficStatus=document.getElementById('traffic-status');
  function updateSignal(dt){
    signalClock+=dt;
    if(signalClock>=14){signalClock=0;mainGreen=!mainGreen;}
    const active=mainGreen?2:0,inactive=mainGreen?0:2;
    for(const lamps of signalLamps){
      lamps[0].render.material=mainGreen?signalRed:signalGreen;
      lamps[1].render.material=signalAmber;
      lamps[2].render.material=mainGreen?signalGreen:signalRed;
    }
    if(trafficStatus)trafficStatus.textContent=mainGreen?'TRAFFIC: MAIN ROAD GREEN':'TRAFFIC: CROSS STREET GREEN';
    return mainGreen;
  }

  const car=new pc.Entity('player-car'); app.root.addChild(car);
  const carPaint=material([0.72,0.12,0.08],0.35), glass=material([0.10,0.20,0.24],0.25), rubber=material([0.025,0.028,0.03]);
  box('car-body',[0,0.65,0],[1.8,0.62,3.6],carPaint,car);
  box('car-cabin',[0,1.28,-0.25],[1.42,0.72,1.75],glass,car);
  for(const x of [-0.94,0.94]) for(const z of [-1.12,1.12]){const w=new pc.Entity('wheel');w.addComponent('render',{type:'cylinder',material:rubber});w.setLocalScale(0.42,0.22,0.42);w.setLocalEulerAngles(0,0,90);w.setLocalPosition(x,0.42,z);car.addChild(w);}
  car.setPosition(0,0,8);

  const keys=Object.create(null), held={left:false,right:false,accelerate:false,brake:false};
  window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;});
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  window.addEventListener('blur',()=>{Object.keys(held).forEach(k=>held[k]=false);Object.keys(keys).forEach(k=>keys[k]=false);});
  document.querySelectorAll('[data-control]').forEach(button=>{const control=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);held[control]=true;});const release=e=>{e.preventDefault();held[control]=false;};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',()=>held[control]=false);});

  // Arcade vehicle: signed forward/reverse speed, progressive steering, coasting and shoulder drag.
  let speed=0,heading=0;const maxForward=25,maxReverse=5;
  const position=new pc.Vec3(),desiredCamera=new pc.Vec3(),cameraPosition=new pc.Vec3();
  app.on('update',dt=>{
    const step=Math.min(dt,0.05);
    const accelerate=held.accelerate||keys.w||keys.arrowup,brake=held.brake||keys.s||keys.arrowdown,left=held.left||keys.a||keys.arrowleft,right=held.right||keys.d||keys.arrowright;
    if(accelerate)speed=Math.min(maxForward,speed+(speed<0?20:12)*step);
    else if(!brake)speed=speed>0?Math.max(0,speed-2.6*step):Math.min(0,speed+2.6*step);
    if(brake)speed=speed>0?Math.max(0,speed-19*step):Math.max(-maxReverse,speed-7*step);
    const steering=(left?1:0)-(right?1:0),factor=Math.min(1,Math.abs(speed)/5);
    heading+=steering*factor*(speed<0?-1:1)*68*step;
    const rad=heading*Math.PI/180;
    position.copy(car.getPosition());
    const nx=position.x+Math.sin(rad)*speed*step,nz=position.z-Math.cos(rad)*speed*step;
    const inJunction=Math.abs(nz-junctionZ)<10.5,onMain=Math.abs(nx)<4.55,onCross=inJunction&&Math.abs(nx)<20;
    if(!onMain&&!onCross)speed*=Math.max(0,1-5*step);
    position.set(pc.math.clamp(nx,-20.2,20.2),0,nz);
    if(position.z < -88)position.z=52;if(position.z>58)position.z=-84;

    // Advance traffic on fixed lanes. Vehicles yield at the junction when their signal is red.
    const greenForMain=updateSignal(step);
    for(const vehicle of traffic){
      const v=vehicle.entity.getPosition();
      if(vehicle.route==='main'){
        const approaching=Math.abs(v.z-junctionZ)<12;
        const allowed=greenForMain;
        if(!(approaching&&!allowed)){
          v.z+=vehicle.dir*vehicle.speed*step;
          if(v.z < -88)v.z=52;if(v.z>58)v.z=-84;
          vehicle.entity.setPosition(v);
        }
      }else{
        const approaching=Math.abs(v.x)<12;
        const allowed=!greenForMain;
        if(!(approaching&&!allowed)){
          v.x+=vehicle.dir*vehicle.speed*step;
          if(v.x < -22)v.x=22;if(v.x>22)v.x=-22;
          vehicle.entity.setPosition(v);
        }
      }
    }
    // Low-cost broad-phase proximity collision: keeps this prototype light without loading Ammo.
    let collision=false;
    for(const vehicle of traffic){
      const v=vehicle.entity.getPosition(),dx=position.x-v.x,dz=position.z-v.z;
      if(dx*dx+dz*dz<5.0){
        collision=true;
        speed*=Math.max(0,1-12*step);
        position.x+=Math.sign(dx||1)*0.35*step;
      }
    }
    if(collision&&trafficStatus)trafficStatus.textContent='TRAFFIC: VEHICLE CONTACT — SLOW DOWN';
    car.setPosition(position);car.setEulerAngles(0,heading,0);
    desiredCamera.set(position.x+Math.sin(rad)*2.2,6.2,position.z+11);
    cameraPosition.copy(camera.getPosition()).lerp(desiredCamera,Math.min(1,step*4));
    camera.setPosition(cameraPosition);camera.lookAt(position.x,0.8,position.z-2);
    speedLabel.textContent=`${Math.round(Math.abs(speed)*3.6)} km/h`;
  });

  // Documented AppStats telemetry; GPU memory is estimated tracked resource usage.
  const stats=app.stats,perf={elapsed:0,samples:0,frameTotal:0,framePeak:0,cpuTotal:0,drawTotal:0};
  function samplePerformance(){
    const frame=stats.frameTime||0;perf.elapsed+=frame;perf.samples++;perf.frameTotal+=frame;perf.framePeak=Math.max(perf.framePeak,frame);
    perf.cpuTotal+=(stats.cpuUpdateTime||0)+(stats.cpuRenderTime||0);perf.drawTotal+=stats.drawCallCount||0;
    if(perf.elapsed<1000||!perfPanel)return;
    const avg=perf.frameTotal/perf.samples,heap=performance.memory?.usedJSHeapSize;
    const vram=stats.vramTotalBytes/(1024*1024);
    perfPanel.textContent=`FPS ${Math.round(1000/Math.max(avg,0.01))} · Frame ${avg.toFixed(1)} ms (peak ${perf.framePeak.toFixed(1)}) · CPU ${(perf.cpuTotal/perf.samples).toFixed(1)} ms\nDraw calls ${Math.round(perf.drawTotal/perf.samples)} · GPU resources ${Number.isFinite(vram)?vram.toFixed(1):'N/A'} MiB · JS heap ${heap?(heap/1048576).toFixed(1):'N/A'} MiB\nGPU: ${device.unmaskedRenderer||'Not exposed by browser'}`;
    perf.elapsed=0;perf.samples=0;perf.frameTotal=0;perf.framePeak=0;perf.cpuTotal=0;perf.drawTotal=0;
  }
  app.on('frameend',samplePerformance);
  perfToggle?.addEventListener('click',()=>{const show=perfPanel.hidden;perfPanel.hidden=!show;perfToggle.setAttribute('aria-expanded',String(show));});
  window.__NAIJA_GAME__={ready:true,stage:3,junction:true,traffic:traffic.length,stats};
  app.start();statusLabel.textContent='Stage 03 ready — live traffic and signal junction';
}
