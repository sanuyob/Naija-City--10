import * as pc from 'playcanvas';
import { createThirdPersonController } from './third-person-controller.js';
import { loadSceneAssets, loadHeroCharacter } from './asset-loader.js';
import { createStage08ACityExpansion } from './stage-08a-city-expansion.js';
import { createStage08BBuildingDetail } from './stage-08b-building-detail.js';
import { createStage08CStreetInfrastructure } from './stage-08c-street-infrastructure.js';
import { createStage08DBuildingRealism } from './stage-08d-building-realism.js';
import { createStage08EBuildings } from './stage-08e-building-assets.js';
import { createStage08FDeviceProfiler } from './stage-08f-device-profiler.js';
import { createStage08GIkejaStreetLife } from './stage-08g-ikeja-street-life.js';
import { createStage08HIkejaPropRealism } from './stage-08h-ikeja-prop-realism.js';
import { createTraversalSystem } from './traversal-system.js';
import { createCompanionSystem } from './companion-system.js';
import { createActorPhysics } from './actor-physics.js';
import { createPlayerPhysics } from './player-physics.js';
import { createPedestrianSystem } from './pedestrian-system.js';
import { createVfxSystem } from './vfx-system.js';
import { hasSavedPlayerCharacter } from './player-character-store.js';

export async function startGame({ statusLabel, perfToggle, perfPanel, assetStatusLabel }) {
  const canvas = document.getElementById('application');
  const speedLabel = document.getElementById('speed');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #application canvas');
  statusLabel.textContent = 'Preparing texture decoder…';
  const publicBase = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  const basisBase = new URL('assets/wasm/basis/', publicBase);
  pc.basisInitialize({
    glueUrl: new URL('basis.wasm.js', basisBase).href,
    wasmUrl: new URL('basis.wasm.wasm', basisBase).href,
    fallbackUrl: new URL('basis.js', basisBase).href,
    numWorkers: 1
  });
  statusLabel.textContent = 'Starting 3D engine…';
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2] });
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  const options = new pc.AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem, pc.AnimComponentSystem];
  options.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler];
  options.batchManager = pc.BatchManager;
  const app = new pc.AppBase(canvas);
  app.init(options);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100dvh' });
  app.resizeCanvas();
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
  camera.addComponent('camera',{clearColor:new pc.Color(0.49,0.72,0.88),fov:62,farClip:520});
  camera.setPosition(0,7,13); camera.lookAt(0,0,0); app.root.addChild(camera);
  const sun = new pc.Entity('sun');
  sun.addComponent('light',{type:'directional',color:new pc.Color(1,0.91,0.78),intensity:1.05});
  sun.setEulerAngles(48,28,0); app.root.addChild(sun);

  box('ground',[0,-0.35,-18],[46,0.5,154],m.ground);
  const stage08A = createStage08ACityExpansion({ app, box, material, m });
  const stage08B = createStage08BBuildingDetail({ app, box, material });
  const stage08C = createStage08CStreetInfrastructure({ app, box, material });
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

  // Keep explicit plot metadata for all original Yaba commercial buildings.
  const coreBuildings=[];
  for(let i=0;i<16;i++){
    const z=-82+i*9.5,lh=4+(i%3)*1.3,rh=4.5+((i+1)%3)*1.1;
    const left=box('street-shop-left',[-9.2,lh/2,z],[5.2,lh,6.8],m.shops[i%4]);
    const right=box('street-shop-right',[9.2,rh/2,z-2],[5.2,rh,6.8],m.shops[(i+2)%4]);
    left.tags.add('stage08d-core-building');
    right.tags.add('stage08d-core-building');
    coreBuildings.push({entity:left,kind:'commercial',x:-9.2,z,width:5.2,height:lh,depth:6.8,side:-1,source:'core'});
    coreBuildings.push({entity:right,kind:'commercial',x:9.2,z:z-2,width:5.2,height:rh,depth:6.8,side:1,source:'core'});
  }
  for(const side of [-1,1]) for(let z=-68;z<48;z+=24){box('drain-cover',[side*6.35,0.14,z],[0.45,0.06,1.5],m.dark);box('drain-grate',[side*6.35,0.18,z],[0.34,0.025,1.1],m.metal);}
  box('roadside-kiosk',[-7.9,1.15,-17],[2.3,2.3,2.4],m.green);
  box('kiosk-awning',[-7.9,2.42,-17],[2.7,0.18,2.8],m.red);
  box('bus-stop-post',[7.3,1.65,-37],[0.12,3.3,0.12],m.metal);
  box('bus-stop-sign',[7.3,3,-37],[1.25,0.65,0.12],m.blue);
  box('bus-stop-bench',[7.9,0.65,-37],[1.6,0.16,0.48],m.metal);
  for(const z of [-12,-39,-62]){box('streetlight-pole',[-7.2,3.3,z],[0.12,6.6,0.12],m.metal);box('streetlight-arm',[-6.8,6.45,z],[0.9,0.12,0.12],m.metal);box('streetlight-head',[-6.35,6.35,z],[0.55,0.18,0.32],m.yellow);}
  for(const x of [-6.9,6.9]) for(const z of [junctionZ-7,junctionZ+7]) box('junction-bollard',[x,0.55,z],[0.28,1.1,0.28],m.yellow);

  // Stage 03 traffic: a small, pooled set of low-poly vehicles follows lane paths.
  const trafficGlass=material([0.10,0.20,0.24],0.25);
  const trafficMaterials=[
    material([0.12,0.34,0.68],0.4),material([0.82,0.68,0.12],0.4),
    material([0.18,0.46,0.28],0.4),material([0.68,0.18,0.12],0.4)
  ];
  const traffic=[];
  function makeTrafficCar(name,color,x,z,yaw=0){
    const entity=new pc.Entity(name);app.root.addChild(entity);
    const body=new pc.Entity(name+'-body');body.addComponent('render',{type:'box',material:color});
    body.setLocalScale(1.65,0.58,3.15);body.setLocalPosition(0,0.62,0);entity.addChild(body);
    const cabin=new pc.Entity(name+'-cabin');cabin.addComponent('render',{type:'box',material:trafficGlass});
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
    box('traffic-signal-pole',[side*7.5,3.0,junctionZ+side*8],[0.16,6,0.16],m.metal);
    const head=box('traffic-signal-head',[side*7.5,5.0,junctionZ+side*8],[0.72,1.8,0.55],m.dark);
    const lamps=[
      box('signal-red',[side*7.5,5.55,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalRed,head),
      box('signal-amber',[side*7.5,5.0,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalAmber,head),
      box('signal-green',[side*7.5,4.45,junctionZ+side*8+0.29],[0.34,0.34,0.08],signalGreen,head)
    ];
    signalLamps.push(lamps);
  }
  // Stage 08D upgrades every original Yaba shop plus the 16 Stage 08A buildings.
  const expansionBuildings=(app.root.findByTag('stage08a-building')||[]).map(entity=>{
    const position=entity.getPosition();
    const scale=entity.getLocalScale();
    const residential=entity.name.includes('residential');
    return {
      entity,kind:residential?'residential':'commercial',
      x:position.x,z:position.z,width:scale.x,height:scale.y,depth:scale.z,
      side:position.x<0?-1:1,source:'08A'
    };
  });
  const stage08D=createStage08DBuildingRealism({
    app,box,graphicsDevice:device,buildings:[...coreBuildings,...expansionBuildings]
  });

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

  statusLabel.textContent='Loading GLB models and textures…';
  const assetState=await loadSceneAssets(app,{statusLabel:assetStatusLabel});

  // Ara 3D Female is the only playable character. Never fall back to Hero 01.
  const araFemaleAvailable=await hasSavedPlayerCharacter('ara-female').catch(()=>false);
  let heroCharacter=null;
  if(araFemaleAvailable){
    try{
      heroCharacter=await loadHeroCharacter(app,{
        urls:['assets/hero/NaijaCityHero01_60clips.glb.b64'],
        characterId:'ara-female',
        statusLabel:assetStatusLabel
      });
    }catch(error){
      console.error('Ara female player could not load:',error);
      if(assetStatusLabel){
        assetStatusLabel.textContent='Ara female needs to be re-imported from the Player menu.';
        assetStatusLabel.dataset.state='warning';
      }
    }
  }else if(assetStatusLabel){
    assetStatusLabel.textContent='Ara female is not installed on this device · open Player to import her.';
    assetStatusLabel.dataset.state='warning';
  }

  // Hero 01 is loaded independently for the city NPC population only.
  let hero01NpcCharacter=null;
  try{
    hero01NpcCharacter=await loadHeroCharacter(app,{
      urls:['assets/hero/NaijaCityHero01_60clips.glb.b64'],
      characterId:'hero01',
      statusLabel:assetStatusLabel
    });
  }catch(error){
    console.warn('Hero 01 city NPC model could not load:',error);
  }
  if(assetStatusLabel){
    assetStatusLabel.textContent=heroCharacter
      ? 'Ara 3D Female · main player ready · Hero 01 is a city NPC'
      : 'Ara female import required · Hero 01 remains an NPC';
  }
  const stage08E=createStage08EBuildings({app});
  await stage08E.initialize();
  const stage08G=createStage08GIkejaStreetLife({app,box,material});
  const stage08H=createStage08HIkejaPropRealism({app,graphicsDevice:device});

  // A small, bounded tutorial traversal lane beside the Yaba spawn route.
  const ladderFrame=new pc.Entity('traversal-ladder-assembly');
  app.root.addChild(ladderFrame);
  box('traversal-ladder-left-rail',[4.08,1.55,-31.0],[.08,3.1,.08],m.metal,ladderFrame);
  box('traversal-ladder-right-rail',[4.82,1.55,-31.0],[.08,3.1,.08],m.metal,ladderFrame);
  for(let rung=0;rung<7;rung++)box('traversal-ladder-rung-'+rung,[4.45,.30+rung*.4,-31.0],[.78,.055,.07],m.yellow,ladderFrame);
  const ladderCollider=box('traversal-ladder-collider',[4.45,1.55,-31.0],[.86,3.1,.28],m.metal);
  ladderCollider.render.enabled=false;
  const traversalObstacles=[
    {id:'yaba-step-01',type:'step',height:.44,entity:box('traversal-step-01',[.65,.22,-1.8],[1,.44,.55],m.concrete)},
    {id:'yaba-low-vault-01',type:'low-vault',height:.72,entity:box('traversal-low-vault-01',[7.2,.36,-8.2],[1.25,.72,.55],m.concrete)},
    {id:'yaba-high-vault-01',type:'high-vault',height:1.02,entity:box('traversal-high-vault-01',[-7.2,.51,-10.5],[1.25,1.02,.55],m.shops[1])},
    {id:'yaba-mantle-01',type:'mantle',height:1.26,entity:box('traversal-mantle-01',[7.5,.63,-15],[1.3,1.26,.6],m.shops[2])},
    {id:'yaba-ledge-01',type:'ledge',height:2.15,entity:box('traversal-ledge-01',[-.35,1.075,-23],[3.2,2.15,.6],m.concrete)},
    {id:'yaba-ladder-01',type:'ladder',height:3.1,entity:ladderCollider},
    {id:'yaba-wall-run-01',type:'wall-run',height:2.35,entity:box('traversal-wall-run-01',[-4.3,1.175,-43],[.55,2.35,5.2],m.shops[2])},
    {id:'yaba-drop-01',type:'drop',height:.72,entity:box('traversal-drop-01',[1.45,.36,-54],[1.8,.72,.62],m.red)}
  ];
  traversalObstacles.forEach(item=>item.entity.tags.add('stage09-traversal-obstacle'));
  const actorPhysics=createActorPhysics({colliders:traversalObstacles,groundY:0,gravity:18});
  let playerPhysics=actorPhysics;
  try {
    playerPhysics=await createPlayerPhysics({colliders:traversalObstacles,groundY:0,gravity:18});
  } catch(error) {
    console.warn('Bullet player physics unavailable; using the kinematic fallback:',error);
    if(assetStatusLabel)assetStatusLabel.textContent='Bullet unavailable · basic player physics fallback active';
  }
  const vfxSystem=createVfxSystem({app,poolSize:24});
  let traversalSystem=null;
  const playerController=createThirdPersonController(app,camera,canvas,{
    resolveMovement:(current,proposed)=>{
      const cityResolved=stage08E.resolveMovement(current,proposed);
      return traversalSystem ? traversalSystem.resolveMovement(current,cityResolved) : cityResolved;
    },
    heroCharacter,physics:playerPhysics,onEffect:(type,position)=>vfxSystem.emit(type,position),
    onInteract:state=>{
      if(traversalSystem?.tryContextualTraversal(state)){
        window.__NAIJA_RPG_UI__?.showToast('Traversal started · '+(traversalSystem.getState().lastTraversal?.clip||'movement'));
        return;
      }
      playerController?.playAnimation?.('Hero01_Interact');
      const [px,,pz]=state.position;
      const targets=[{name:'Street kiosk',x:-7.9,z:-17},{name:'Bus stop',x:7.3,z:-37}];
      const nearest=targets.map(target=>({...target,distance:Math.hypot(px-target.x,pz-target.z)})).sort((a,b)=>a.distance-b.distance)[0];
      if(nearest&&nearest.distance<4.5)window.__NAIJA_RPG_UI__?.showToast(nearest.name+' nearby — vendor/transport interaction is not active yet.');
      else window.__NAIJA_RPG_UI__?.showToast('Nothing nearby to interact with.');
    }
  });

  traversalSystem=createTraversalSystem({playerController,physics:playerPhysics,obstacles:traversalObstacles,onEffect:(type,position)=>vfxSystem.emit(type,position)});
  const companionSystem=createCompanionSystem({
    app,playerController,heroCharacter:heroCharacter||hero01NpcCharacter,obstacles:traversalObstacles,physics:actorPhysics,maxActive:2,
    onStatus:message=>window.__NAIJA_RPG_UI__?.showToast(message),onEffect:(type,position)=>vfxSystem.emit(type,position)
  });
  const pedestrianSystem=createPedestrianSystem({app,physics:actorPhysics,colliders:traversalObstacles,heroCharacter:hero01NpcCharacter});
  stage08E.update(playerController.getState().position);
  const stage08FProfiler = createStage08FDeviceProfiler({ app, canvas, device, stage08E });
  window.__NAIJA_STAGE08F_PROFILE__ = stage08FProfiler;
  window.__NAIJA_INTERACT__=()=>playerController.interact();
  window.__NAIJA_PLAY_HERO_ANIMATION__=(name,durationSeconds)=>playerController.playAnimation(name,durationSeconds);
  window.__NAIJA_SET_HERO_FACE__=(name,weight=1)=>playerController.playFaceExpression(name,weight);
  window.__NAIJA_TRAVERSE__=()=>traversalSystem.tryContextualTraversal(playerController.getState());
  window.__NAIJA_COMPANION_COMMAND__=(roleId,command)=>companionSystem.command(roleId,command);
  statusLabel.textContent='Third-person character ready — WASD / touch joystick';

  // Stage 06: city traffic continues as lightweight kinematic scenery.
  // The human character is now the only player-controlled actor.
  let hudClock=0;
  app.on('update',dt=>{
    if(window.__NAIJA_RPG_PAUSED__) return;
    const step=Math.min(dt,0.05);
    const greenForMain=updateSignal(step);
    for(const vehicle of traffic){
      const v=vehicle.entity.getPosition();
      if(vehicle.route==='main'){
        const approaching=Math.abs(v.z-junctionZ)<12;
        if(!(approaching&&!greenForMain)){
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
    playerController.update(step);
    traversalSystem.update(step);
    companionSystem.update(step);
    const playerState=playerController.getState();
    pedestrianSystem.update(step,playerState);
    vfxSystem.update(step);
    stage08E.update(playerState.position);
    hudClock+=step;
    if(hudClock>=0.12){hudClock=0;window.__NAIJA_RPG_UI__?.setVitals(playerState);window.__NAIJA_RPG_UI__?.setWorldActivity?.({pedestrians:10,companions:companionSystem.getState().activeCount});}
  });

  // Documented AppStats telemetry; GPU memory is estimated tracked resource usage.
  const stats=app.stats,perf={elapsed:0,samples:0,frameTotal:0,framePeak:0,cpuTotal:0,drawTotal:0};
  function samplePerformance(){
    const frame=stats.frameTime||0;perf.elapsed+=frame;perf.samples++;perf.frameTotal+=frame;perf.framePeak=Math.max(perf.framePeak,frame);
    perf.cpuTotal+=(stats.cpuUpdateTime||0)+(stats.cpuRenderTime||0);perf.drawTotal+=stats.drawCallCount||0;
    if(perf.elapsed<1000||!perfPanel)return;
    const avg=perf.frameTotal/perf.samples,heap=performance.memory?.usedJSHeapSize;
    const renderDiag=window.__NAIJA_RENDER_DIAGNOSTICS__;
    const fps=Math.round(1000/Math.max(avg,0.01));
    window.__NAIJA_ANDROID_BASELINE__={userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},devicePixelRatio:window.devicePixelRatio,canvas:{width:canvas.width,height:canvas.height},fps,averageFrameMs:avg,drawCalls:stats.drawCallCount,meshInstances:renderDiag?.scene?.meshInstances??null,gpuMemoryMiB:stats.vramTotalBytes/(1024*1024),jsHeapMiB:heap?heap/1048576:null,gpu:device.unmaskedRenderer||'Not exposed'};
    const vram=stats.vramTotalBytes/(1024*1024);
    perfPanel.textContent=`FPS ${fps} · Frame ${avg.toFixed(1)} ms (peak ${perf.framePeak.toFixed(1)}) · CPU ${(perf.cpuTotal/perf.samples).toFixed(1)} ms\nDraw calls ${Math.round(perf.drawTotal/perf.samples)} · GPU resources ${Number.isFinite(vram)?vram.toFixed(1):'N/A'} MiB · JS heap ${heap?(heap/1048576).toFixed(1):'N/A'} MiB\nCanvas ${canvas.width}×${canvas.height} · Viewport ${innerWidth}×${innerHeight} · DPR ${devicePixelRatio} · Meshes ${renderDiag?.scene?.meshInstances??'N/A'}\nGPU: ${device.unmaskedRenderer||'Not exposed by browser'}`;
    perf.elapsed=0;perf.samples=0;perf.frameTotal=0;perf.framePeak=0;perf.cpuTotal=0;perf.drawTotal=0;
  }
  app.on('frameend',samplePerformance);
  app.on('frameend',()=>{
    const rect=canvas.getBoundingClientRect(),cameraPos=camera.getPosition(),forward=camera.forward;
    const renderComponents=app.root.findComponents('render');
    const meshInstances=renderComponents.reduce((sum,component)=>sum+(component.meshInstances?.length||0),0);
    window.__NAIJA_RENDER_DIAGNOSTICS__={viewport:{width:window.innerWidth,height:window.innerHeight},canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height,bufferWidth:canvas.width,bufferHeight:canvas.height},camera:{position:[cameraPos.x,cameraPos.y,cameraPos.z],forward:[forward.x,forward.y,forward.z],fov:camera.camera.fov,farClip:camera.camera.farClip},scene:{rootEntities:app.root.children.length,renderComponents:renderComponents.length,meshInstances,knownBounds:{min:[-48,-1,-205],max:[48,10,402]},},drawCallCount:stats.drawCallCount,primitiveCount:stats.primitiveCount??null,frameTime:stats.frameTime,gpuMemoryBytes:stats.vramTotalBytes};
  });
  const profileExport=document.getElementById('profile-export');
  perfToggle?.addEventListener('click',()=>{const show=perfPanel.hidden;perfPanel.hidden=!show;perfToggle.setAttribute('aria-expanded',String(show));if(profileExport)profileExport.hidden=!show;});
  profileExport?.addEventListener('click',()=>stage08FProfiler.download());
  const gameApi={ready:true,stage:9,hudStage:7,mainCharacterId:'ara-female',mainCharacterName:'Ara 3D Female',hero01Role:'city-npc',stage08A,stage08B,stage08C,stage08D,stage08E:stage08E.getState(),getStage08EState:()=>stage08E.getState(),resolveBuildingMovement:stage08E.resolveMovement,stage08G,stage08H,stage08F:'device-profiling-harness',getStage08FProfile:()=>stage08FProfiler.snapshot(),landscapeOnly:true,mobileCrouch:true,mobileInteract:true,genre:'third-person open-world action RPG',cameraMode:'orbit-follow',thirdPersonCharacter:true,characterGeometry:heroCharacter?'rigged-glb':'no-visible-player-rig',heroAnimations:heroCharacter?.clipNames??[],heroFaceMorphs:heroCharacter?.morphNames??[],characterSource:heroCharacter?.source??'ara-female-not-installed',characterMetadata:heroCharacter?.metadata??null,heroDefaultClips:heroCharacter?.defaultClips??null,traversal:true,traversalObstacles:traversalObstacles.length,getTraversalState:()=>traversalSystem.getState(),companions:true,companionRoster:companionSystem.getState(),getCompanionState:()=>companionSystem.getState(),pedestrians:true,getPedestrianState:()=>pedestrianSystem.getState(),getHeroNpcState:()=>pedestrianSystem.getState().heroNpc,physics:actorPhysics.getState(),getPhysicsState:()=>({player:playerPhysics.getState(),agents:actorPhysics.getState()}),vfx:true,getVfxState:()=>vfxSystem.getState(),getHeroRigSnapshot:()=>playerController.getRigSnapshot(),movement:true,sprint:true,jump:true,proceduralAnimations:!heroCharacter,mobileJoystick:true,cameraOrbit:true,junction:true,traffic:traffic.length,trafficAI:true,assets:assetState,stats,getPlayerState:()=>playerController.getState(),getHeroAnimationState:()=>playerController.getAnimationState()};
  if(new URLSearchParams(window.location.search).has('smoke')) {
    gameApi.debugSetCameraForSmoke=(position,target)=>{camera.setPosition(...position);camera.lookAt(...target);};
    gameApi.debugSetPlayerForSmoke=(position,yaw=0)=>playerController.setPositionForSmoke(position,yaw);
    gameApi.debugAdvanceTraversalForSmoke=(frames=30)=>{
      const count=Math.max(1,Math.min(60,Math.floor(Number(frames)||30)));
      for(let i=0;i<count;i++){
        playerController.update(0.05);
        traversalSystem.update(0.05);
      }
      vfxSystem.update(.05);
      return {player:playerController.getState(),traversal:traversalSystem.getState()};
    };
    gameApi.debugTraverseTypeForSmoke=type=>{
      const obstacle=traversalObstacles.find(item=>item.type===type);if(!obstacle)return {started:false,type};
      const center=obstacle.entity.getPosition(),offset=type==="wall-run"?-.7:0;
      playerController.setPositionForSmoke([center.x+offset,0,center.z+1.55],0);
      const startPosition=playerController.getState().position.slice();
      const started=traversalSystem.tryContextualTraversal(playerController.getState());
      for(let i=0;i<58;i++){playerController.update(.05);traversalSystem.update(.05);vfxSystem.update(.05);}
      const traversal=traversalSystem.getState(),player=playerController.getState();
      const distanceTravelled=Math.hypot(player.position[0]-startPosition[0],player.position[2]-startPosition[2]);
      return {started,type,traversal,player,completed:!player.traversing&&traversal.traversalsCompleted>0,startPosition,distanceTravelled,verticalTravel:player.position[1]-startPosition[1]};
    };
    gameApi.debugJumpPhysicsForSmoke=()=>{
      playerController.setPositionForSmoke([0,0,0],0);playerController.queueJumpForSmoke();
      for(let i=0;i<7;i++){playerController.update(.05);vfxSystem.update(.05);}const airborne=playerController.getState();
      for(let i=0;i<40;i++){playerController.update(.05);vfxSystem.update(.05);}
      return {airborne,landed:playerController.getState(),vfx:vfxSystem.getState()};
    };
  }
  window.__NAIJA_GAME__=gameApi;
  window.__NAIJA_RPG_UI__?.setVitals(playerController.getState());
  
  window.addEventListener('pagehide',()=>{delete window.__NAIJA_INTERACT__;delete window.__NAIJA_PLAY_HERO_ANIMATION__;delete window.__NAIJA_SET_HERO_FACE__;delete window.__NAIJA_TRAVERSE__;delete window.__NAIJA_COMPANION_COMMAND__;companionSystem.destroy();pedestrianSystem.destroy();playerPhysics.cleanup?.();vfxSystem.destroy();delete window.__NAIJA_STAGE08F_PROFILE__;stage08FProfiler.destroy();playerController.destroy();},{once:true});
  app.start();statusLabel.textContent='Ready — Stage 09 parkour, city life and physics';
}
