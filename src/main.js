import * as pc from 'playcanvas';
import './style.css';

const canvas = document.getElementById('application');
const speedLabel = document.getElementById('speed');
const statusLabel = document.getElementById('status');
const perfLabel = document.getElementById('performance');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #application canvas');
const showStatus = (message) => { if (statusLabel) statusLabel.textContent = message; };

async function startGame() {
  showStatus('Starting 3D engine…');
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2] });
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  const options = new pc.AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
  options.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler];
  const app = new pc.AppBase(canvas);
  app.init(options);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight = new pc.Color(0.42, 0.43, 0.45);
  window.addEventListener('resize', () => app.resizeCanvas(), { passive: true });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); showStatus('Graphics context lost. Reload to recover.'); });

  const material = (color, roughness = 0.85) => {
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(...color);
    mat.shininess = (1 - roughness) * 80;
    mat.update();
    return mat;
  };
  const box = (name, pos, scale, mat) => {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box', material: mat });
    entity.setLocalPosition(...pos);
    entity.setLocalScale(...scale);
    app.root.addChild(entity);
    return entity;
  };
  const camera = new pc.Entity('chase-camera');
  camera.addComponent('camera', { clearColor: new pc.Color(0.49, 0.72, 0.88), fov: 62, farClip: 220 });
  camera.setPosition(0, 7, 13); camera.lookAt(0, 0, 0); app.root.addChild(camera);
  const sun = new pc.Entity('sun');
  sun.addComponent('light', { type: 'directional', color: new pc.Color(1, 0.91, 0.78), intensity: 1.1 });
  sun.setEulerAngles(48, 28, 0); app.root.addChild(sun);

  const asphalt = material([0.12, 0.14, 0.15]);
  const concrete = material([0.48, 0.47, 0.42]);
  const yellow = material([0.92, 0.83, 0.55]);
  const white = material([0.88, 0.87, 0.78]);
  const ground = material([0.24, 0.34, 0.24]);
  const drain = material([0.19, 0.21, 0.20]);
  const pole = material([0.25, 0.24, 0.21]);
  const sign = material([0.08, 0.32, 0.24]);
  const shops = [[0.68,0.49,0.31],[0.56,0.62,0.58],[0.70,0.66,0.52],[0.43,0.53,0.60]].map(c => material(c));
  box('ground',[0,-0.35,-18],[72,0.5,150],ground);
  box('main-road',[0,-0.07,-18],[11,0.16,150],asphalt);
  for (const side of [-1,1]) {
    box('footpath',[side*6.1,0.02,-18],[1.1,0.2,150],concrete);
    box('open-drain',[side*6.85,0.015,-18],[0.34,0.12,150],drain);
  }
  for (let z=-86;z<54;z+=9) box('lane-dash',[0,0.025,z],[0.14,0.025,3.8],yellow);

  // Stage 02: four-way junction, pedestrian crossings, stop lines and corners.
  const junctionZ=-29;
  box('cross-street',[0,-0.065,junctionZ],[58,0.16,11],asphalt);
  for (const side of [-1,1]) box('junction-kerb',[0,0.02,junctionZ+side*6.2],[58,0.2,0.45],concrete);
  for(let i=0;i<7;i++){
    const o=-3.6+i*1.2;
    box('zebra-west',[-6,0.035,junctionZ+o],[2,0.035,0.62],white);
    box('zebra-east',[6,0.035,junctionZ+o],[2,0.035,0.62],white);
    box('zebra-north',[o,0.035,junctionZ-6],[0.62,0.035,2],white);
    box('zebra-south',[o,0.035,junctionZ+6],[0.62,0.035,2],white);
  }
  box('stop-line-north',[0,0.035,junctionZ-8.4],[10.5,0.035,0.22],white);
  box('stop-line-south',[0,0.035,junctionZ+8.4],[10.5,0.035,0.22],white);
  for(const x of [-8,8]) box('corner-island',[x,0.11,junctionZ],[3,0.22,3],concrete);

  for(let i=0;i<14;i++){
    const z=-82+i*9.5, lh=4+(i%3)*1.3, rh=4.5+((i+1)%3)*1.1;
    box('shop-left',[-9.2,lh/2,z],[5.2,lh,6.8],shops[i%4]);
    box('shop-right',[9.2,rh/2,z-2],[5.2,rh,6.8],shops[(i+2)%4]);
  }
  // Shared low-poly props: utility poles, green street boards and market kiosks.
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){
      const z=-72+i*19;
      box('utility-pole',[side*7.8,3,z],[0.16,6,0.16],pole);
      box('street-board',[side*7.8,4.6,z+0.45],[1.1,0.62,0.08],sign);
    }
    box('roadside-kiosk-counter',[side*11.4,0.62,junctionZ+10],[2.2,1,1.5],shops[0]);
    box('roadside-kiosk-canopy',[side*11.4,1.55,junctionZ+10],[2.8,0.12,2],sign);
  }

  const car=new pc.Entity('player-car'); app.root.addChild(car);
  const body=material([0.72,0.12,0.08],0.35), glass=material([0.10,0.20,0.24],0.25), rubber=material([0.025,0.028,0.03]);
  const chassis=new pc.Entity('car-body'); chassis.addComponent('render',{type:'box',material:body});
  chassis.setLocalScale(1.8,0.62,3.6); chassis.setLocalPosition(0,0.65,0); car.addChild(chassis);
  const cabin=new pc.Entity('car-cabin'); cabin.addComponent('render',{type:'box',material:glass});
  cabin.setLocalScale(1.42,0.72,1.75); cabin.setLocalPosition(0,1.28,-0.25); car.addChild(cabin);
  const wheels=[];
  for(const x of [-0.94,0.94]) for(const z of [-1.12,1.12]){
    const w=new pc.Entity('wheel'); w.addComponent('render',{type:'cylinder',material:rubber});
    w.setLocalScale(0.42,0.22,0.42); w.setLocalEulerAngles(0,0,90); w.setLocalPosition(x,0.42,z); car.addChild(w); wheels.push(w);
  }
  car.setPosition(0,0,8);

  const keys=Object.create(null), held={left:false,right:false,accelerate:false,brake:false};
  window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;});
  window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  window.addEventListener('blur',()=>{for(const k of Object.keys(held))held[k]=false;for(const k of Object.keys(keys))keys[k]=false;});
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);held[control]=true;});
    const release=e=>{e.preventDefault();held[control]=false;};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
    button.addEventListener('lostpointercapture',()=>{held[control]=false;});
  });

  let speed=0,heading=0,lateral=0,perfElapsed=0;
  const stats=app.stats, maxSpeed=23;
  app.on('update',dt=>{
    const step=Math.min(dt,0.05);
    const accel=held.accelerate||keys.w||keys.arrowup, brake=held.brake||keys.s||keys.arrowdown;
    const left=held.left||keys.a||keys.arrowleft, right=held.right||keys.d||keys.arrowright;
    speed=accel?Math.min(maxSpeed,speed+11.5*step):Math.max(0,speed-2.6*step);
    if(brake)speed=Math.max(0,speed-20*step);
    const steer=(left?1:0)-(right?1:0), factor=Math.min(1,speed/5.5);
    heading+=steer*factor*64*step;
    const rad=heading*Math.PI/180, targetLateral=steer*speed*0.16;
    lateral+=(targetLateral-lateral)*Math.min(1,step*4.5);
    lateral*=Math.max(0,1-step*1.6);
    const p=car.getPosition(), nx=p.x+(Math.sin(rad)*speed+lateral)*step, nz=p.z-Math.cos(rad)*speed*step;
    const inJunction=Math.abs(nz-junctionZ)<8.2, limit=inJunction?25.5:4.45;
    car.setPosition(pc.math.clamp(nx,-limit,limit),0,nz<-100?8:nz);
    car.setEulerAngles(0,heading,0);
    for(const w of wheels)w.rotateLocal(360*speed*step,0,0);
    const t=car.getPosition(), desired=new pc.Vec3(t.x+Math.sin(rad)*2,6.2,t.z+11);
    camera.setPosition(camera.getPosition().lerp(desired,Math.min(1,step*4)));
    camera.lookAt(t.x,0.8,t.z-2);
    speedLabel.textContent=`${Math.round(speed*3.6)} km/h`;
    perfElapsed+=step;
    if(perfElapsed>=0.5){
      perfElapsed=0;
      const values=[];
      if(Number.isFinite(stats?.fps))values.push(`${Math.round(stats.fps)} FPS`);
      if(Number.isFinite(stats?.frameTime))values.push(`${stats.frameTime.toFixed(1)} ms`);
      if(Number.isFinite(stats?.drawCallCount))values.push(`${stats.drawCallCount} draws`);
      if(Number.isFinite(stats?.vramTotalBytes))values.push(`${(stats.vramTotalBytes/1048576).toFixed(1)} MiB GPU`);
      if(perfLabel)perfLabel.textContent=values.length?values.join(' · '):'Performance stats unavailable';
    }
  });
  app.start();showStatus('Ready — Stage 02 junction. Hold GO to drive.');
}
startGame().catch(error=>{console.error('Naija City Drive failed to start:',error);showStatus(`Could not start the 3D scene: ${error.message}`);});
