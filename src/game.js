import * as pc from 'playcanvas';
import { makeFootPlantTarget } from './two-bone-ik.js';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { createGidiWorldStreamer } from './gidi-world-streamer.js';
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
import { createStage08ICityDistrictExpansion } from './stage-08i-ikeja-city-expansion.js';
import { createStage08JYabaIkejaNetworkAndStreets } from './stage-08j-yaba-ikeja-network-and-yaba-streets.js';
import { createStage08KGidiDistrictRoadsAndBridges } from './stage-08k-gidi-district-roads-and-bridges.js';
import { createStage08LGidiDistrictActivities } from './stage-08l-gidi-district-activities.js';
import { createStage08NDistrictNeighbourhoods } from './stage-08n-district-neighbourhoods.js';
import { createCityEconomy } from './city-economy.js';
import { createCityTrafficAI } from './city-traffic-ai.js';
import { createGidiAuthoredInteriors, getGidiAuthoredInteriorDefinitions } from './gidi-authored-interiors.js';
import { buildWorldIdentityRecords, createWorldSignage } from './world-identity.js';
import { createTraversalSystem } from './traversal-system.js';
import { createCompanionSystem } from './companion-system.js';
import { createActorPhysics } from './actor-physics.js';
import { createPlayerPhysics } from './player-physics.js';
import { createPedestrianSystem } from './pedestrian-system.js';
import { createVfxSystem } from './vfx-system.js';
import { createAudioSystem } from './audio-system.js';
import { createVehicleSystem } from './vehicle-system.js';
import { createWorldInteractionSystem } from './world-interaction-system.js';
import { hasClearLineOfSight } from './character-perception.js';
import { createWorldLighting } from './world-lighting.js';

export async function startGame({ statusLabel, perfToggle, perfPanel, assetStatusLabel }) {
  const startupStartedAt=performance.now();
  window.__NAIJA_RPG_UI__?.updateLoading?.({percent:2,label:'Preparing the game engine…'});
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
  await MeshoptDecoder.ready;
  pc.meshoptInitialize({ decoder: MeshoptDecoder, numWorkers: 1 });
  statusLabel.textContent = 'Starting 3D engine…';
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2] });
  const lowMemoryDevice = (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4) || (Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 4);
  const networkInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const dataSaverPreference=window.__NAIJA_DATA_SAVER__||null;
  const manualDataSaver=dataSaverPreference?.explicit===true?Boolean(dataSaverPreference.enabled):null;
  const networkLowData=Boolean(networkInfo?.saveData)||/^(slow-2g|2g)$/i.test(networkInfo?.effectiveType||'')||(Number(networkInfo?.downlink)>0&&Number(networkInfo.downlink)<1.2);
  const lowDataMode=manualDataSaver===null?networkLowData:manualDataSaver;
  device.maxPixelRatio = lowMemoryDevice ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
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
  window.__NAIJA_RPG_UI__?.updateLoading?.({percent:14,label:'3D engine ready · preparing Yaba…'});
  // Reduce the cool-white wash on GIDI's PBR terrain and concrete while keeping daylight readable.
  app.scene.ambientLight = new pc.Color(0.18, 0.20, 0.23);
  app.scene.exposure = 0.82;
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
  camera.addComponent('camera',{clearColor:new pc.Color(0.22,0.38,0.54),fov:62,farClip:lowMemoryDevice?650:850});
  camera.camera.toneMapping = pc.TONEMAP_ACES2;
  camera.setPosition(0,7,13); camera.lookAt(0,0,0); app.root.addChild(camera);
  const sun = new pc.Entity('sun');
  sun.addComponent('light',{type:'directional',color:new pc.Color(1,0.82,0.66),intensity:1.65});
  sun.setEulerAngles(48,28,0); app.root.addChild(sun);
  const worldLighting=createWorldLighting({app,camera,sun,lowMemoryDevice});

  box('ground',[0,-0.35,-18],[46,0.5,154],m.ground);
  const stage08A = createStage08ACityExpansion({ app, box, material, m });
  const stage08B = createStage08BBuildingDetail({ app, box, material });
  const stage08C = createStage08CStreetInfrastructure({ app, box, material });
  box('main-road',[0,-0.07,-18],[11,0.16,150],m.asphalt);
  box('left-footpath',[-6.1,0.02,-18],[1.1,0.2,150],m.concrete);
  box('right-footpath',[6.1,0.02,-18],[1.1,0.2,150],m.concrete);
  for(let z=-86;z<54;z+=9) box('lane-dash',[0,0.025,z],[0.14,0.025,3.8],m.yellow);

  // A new physical road gateway branches from the existing Yaba road without
  // moving any of the original street or building entities.
  const gatewayColliders=[];
  const gatewayPath=[[0,-88],[3,-135],[16,-195],[36,-255],[60,-315],[82,-385],[100,-450]];
  for(let i=0;i<gatewayPath.length-1;i++){
    const a=gatewayPath[i],b=gatewayPath[i+1],dx=b[0]-a[0],dz=b[1]-a[1];
    const length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz)*180/Math.PI;
    const center=[(a[0]+b[0])/2,.055,(a[1]+b[1])/2];
    const segment=box('gidi-gateway-road-'+i,center,[14,.24,length+1],m.asphalt);
    segment.setEulerAngles(0,yaw,0);
    gatewayColliders.push({id:'gidi-gateway-road-'+i,position:[center[0],center[1]-.1,center[2]],halfExtents:[7,.22,length/2+.5],rotationY:yaw,surface:'asphalt'});
    // Broken centre markings orient with the same road segment.
    for(let t=0;t<length-8;t+=17){
      const d=(t+8)/length,px=a[0]+dx*d,pz=a[1]+dz*d;
      const dash=box('gidi-gateway-lane-dash-'+i+'-'+t,[px,.185,pz],[.16,.035,5],m.yellow);
      dash.setEulerAngles(0,yaw,0);
    }
  }
  // Entry arch marks the threshold into the new region.
  box('gidi-gateway-left-pillar',[92.5,3.6,-445],[.8,7.2,.8],m.concrete);
  box('gidi-gateway-right-pillar',[107.5,3.6,-445],[.8,7.2,.8],m.concrete);
  box('gidi-gateway-overhead-beam',[100,7.5,-445],[16,.85,1.1],m.metal);
  box('gidi-gateway-sign-panel',[100,6.35,-444.85],[6.8,1.2,.22],m.blue);

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
  const ikejaTraffic=[
    {x:-4.2,z:258,dir:1,speed:5.2},
    {x:4.2,z:356,dir:-1,speed:4.8}
  ];
  ikejaTraffic.forEach((v,i)=>traffic.push({entity:makeTrafficCar('traffic-ikeja-'+i,trafficMaterials[(i+2)%4],v.x,v.z,v.dir<0?180:0),...v,route:'ikeja'}));

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
  window.__NAIJA_RPG_UI__?.updateLoading?.({percent:19,label:'Preparing player and nearby streets…'});

  // Ara 3D Female is bundled from the ready-made Ara 3D Gen Female Executive preset.
  // It is the only playable character; Hero 01 remains an NPC.
  let heroCharacter=null;
  let araLoadError=null;
  try{
    window.__NAIJA_RPG_UI__?.updateLoading?.({percent:22,label:'Loading Ara · player character…'});
    heroCharacter=await loadHeroCharacter(app,{
      bundledUrl:'assets/hero/Ara_Female_Executive_Animated_Ladder_Mobile.glb.gz',
      bundledFallbackUrl:'assets/hero/Ara_Female_Executive_Animated_Ladder.glb',
      characterId:'ara-female',
      statusLabel:assetStatusLabel
    });
  }catch(error){
    araLoadError=String(error?.message||error);
    console.error('Ara female player could not load:',error);
    if(assetStatusLabel){assetStatusLabel.textContent='Ara 3D Female failed to load · '+araLoadError;assetStatusLabel.dataset.state='warning';}
  }
  if(heroCharacter) {window.__NAIJA_RPG_UI__?.setPlayerCharacterReady?.();window.__NAIJA_RPG_UI__?.updateLoading?.({percent:61,label:'Player ready · loading nearby Yaba buildings…'});}
  else window.__NAIJA_RPG_UI__?.requirePlayerCharacter?.('Ara 3D Female could not load: '+araLoadError);

  // Hero 01 is optional city-NPC content. It is streamed after the player can
  // enter the world, so its 3.1 MiB animation bundle cannot block first play.
  let hero01NpcCharacter=null;
  if(assetStatusLabel){
    assetStatusLabel.textContent=heroCharacter
      ? 'Ara 3D Gen Female Executive · main player ready'
      : 'Ara 3D Female failed to load · Hero 01 remains an NPC';
  }
  const stage08E=createStage08EBuildings({app,lowMemoryDevice,lowDataMode,applyShadowPolicy:worldLighting.applyToEntity});
  await stage08E.initialize();
  window.__NAIJA_RPG_UI__?.updateLoading?.({percent:61,label:'Preparing the nearby Yaba district…'});
  const startupBuildingRadiusMetres=(lowDataMode||lowMemoryDevice)?20:35;
  const startupPreload=await stage08E.preloadArea([0,0,0],startupBuildingRadiusMetres,progress=>{
    window.__NAIJA_RPG_UI__?.updateLoading?.({...progress,percent:61+(progress.percent||0)*.28,label:'Loading nearby Yaba streets…'});
  });
  window.__NAIJA_RPG_UI__?.updateLoading?.({percent:90,label:'Nearby streets ready · preparing world systems…'});
  const stage08G=createStage08GIkejaStreetLife({app,box,material});
  const stage08H=createStage08HIkejaPropRealism({app,graphicsDevice:device});
  const stage08I=createStage08ICityDistrictExpansion({app,box,material});
  const skipOptionalStreetDownloads=lowDataMode||lowMemoryDevice;
  const stage08J=await createStage08JYabaIkejaNetworkAndStreets({app,box,material,lowDataMode,skipOptionalDownloads:skipOptionalStreetDownloads});
  const stage08K=createStage08KGidiDistrictRoadsAndBridges({app,box,material});
  const cityEconomy=createCityEconomy();
  window.__NAIJA_RPG_UI__?.setEconomy?.(cityEconomy.getState());
  const stage08L=createStage08LGidiDistrictActivities({app,box,material,economy:cityEconomy});
  const gidiManifestResponse=await fetch(new URL('assets/gidi/manifest.json',publicBase),{cache:'force-cache'});
  if(!gidiManifestResponse.ok)throw new Error('GIDI district manifest could not be loaded for Stage 08N.');
  const gidiManifest=await gidiManifestResponse.json();
  const stage08N=createStage08NDistrictNeighbourhoods({app,box,material,manifest:gidiManifest});

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
    {id:'yaba-mantle-01',type:'mantle',height:1.26,entity:box('traversal-mantle-01',[4.8,.63,-15],[1.3,1.26,.6],m.shops[2])},
    {id:'yaba-ledge-01',type:'ledge',height:2.15,entity:box('traversal-ledge-01',[-.35,1.075,-23],[3.2,2.15,.6],m.concrete)},
    {id:'yaba-ladder-01',type:'ladder',height:3.1,entity:ladderCollider},
    {id:'yaba-wall-run-01',type:'wall-run',height:1.3,entity:box('traversal-wall-run-01',[-4.3,.65,-43],[.55,1.3,5.2],m.shops[2])},
    {id:'yaba-drop-01',type:'drop',height:.72,entity:box('traversal-drop-01',[1.45,.36,-54],[1.8,.72,.62],m.red)}
  ];
  // Building-side traversal details: starter foundations, an AC service
  // platform, low railings, parapet caps and ladder hardware. These are
  // authored as readable route cues, not invisible Superman-height targets.
  const propMetal=m.metal, propConcrete=m.concrete, propLight=m.white;
  // Foundation cap and anti-slip strips on the starter step.
  box('prop-foundation-cap',[.65,.47,-1.8],[1.08,.06,.62],m.yellow);
  for(let i=0;i<4;i++)box('prop-foundation-grip-'+i,[.28+i*.24,.515,-1.8],[.08,.018,.42],m.dark);
  // Small glossy puddles mark wet-road footstep zones on the asphalt.
  box('prop-wet-road-patch-01',[1.25,.014,-34],[1.8,.008,3.2],m.dark);
  box('prop-wet-road-patch-02',[-2.2,.014,-65],[2.3,.008,2.2],m.dark);
  // A realistic wall-mounted AC condenser with a support shelf and side rails.
  box('prop-ac-service-shelf',[-7.2,1.08,-10.5],[1.55,.12,.82],propMetal);
  box('prop-ac-condenser',[-7.2,1.66,-10.5],[1.16,1.02,.62],propLight);
  box('prop-ac-front-panel',[-7.2,1.66,-10.825],[.88,.76,.035],propMetal);
  for(let i=0;i<6;i++)box('prop-ac-grille-'+i,[-7.56+i*.145,1.66,-10.85],[.025,.68,.025],m.yellow);
  box('prop-ac-left-bracket',[-7.82,.82,-10.5],[.08,.48,.12],m.red);
  box('prop-ac-right-bracket',[-6.58,.82,-10.5],[.08,.48,.12],m.red);
  // Guard rail around the mantle starter; top rail is intentionally low enough to vault.
  for(let i=0;i<4;i++)box('prop-mantle-rail-post-'+i,[4.15+i*.43,1.54,-15.28],[.055,.92,.06],propMetal);
  box('prop-mantle-rail-top',[4.795,1.98,-15.28],[1.42,.07,.07],propMetal);
  box('prop-mantle-rail-mid',[4.795,1.62,-15.28],[1.42,.045,.045],m.yellow);
  // Parapet cap and a short pipe connector beside the ledge.
  box('prop-roof-parapet-cap',[-.35,2.19,-23],[3.32,.08,.68],propLight);
  box('prop-roof-step-pipe',[-2.55,.72,-23],[.09,.09,1.25],propMetal);
  // Ladder safety hoops / standoff brackets.
  for(let i=0;i<3;i++)box('prop-ladder-standoff-'+i,[4.45,.55+i*.95,-30.62],[.54,.07,.42],m.red);
  // Wall-run grip bars and a short roof-edge rail make the route legible.
  for(let i=0;i<3;i++)box('prop-wallrun-grip-'+i,[-4.3,.62+i*.62,-40.35],[.82,.055,.08],propMetal);
  box('prop-drop-parapet-cap',[1.45,.78,-54],[1.92,.08,.72],propLight);
  traversalObstacles.forEach(item=>item.entity.tags.add('stage09-traversal-obstacle'));
  // Thin surface-query zones follow the visible road, footpaths and pocket
  // grass. Their top is almost exactly at street level, so they classify
  // footsteps without creating noticeable bumps in the capsule collision.
  const surfacePatches=[
    {id:'yaba-concrete-sidewalk-west',surface:'concrete',position:[-6.1,.06,-18],halfExtents:[.55,.06,75]},
    {id:'yaba-concrete-sidewalk-east',surface:'concrete',position:[6.1,.06,-18],halfExtents:[.55,.06,75]},
    {id:'yaba-grass-verge-west',surface:'grass',position:[-9.1,-.006,-18],halfExtents:[1.2,.006,70]},
    {id:'yaba-grass-verge-east',surface:'grass',position:[9.1,-.006,-18],halfExtents:[1.2,.006,70]},
    {id:'yaba-wet-asphalt-puddle-01',surface:'wet',position:[1.25,-.004,-34],halfExtents:[.9,.004,1.6]},
    {id:'yaba-wet-asphalt-puddle-02',surface:'wet',position:[-2.2,-.004,-65],halfExtents:[1.15,.004,1.1]}
  ];
  // Stage 09B: multiple authored access routes for every building proxy:
  // a facade ladder, an adjacent-face mantle, and a second ledge pull-up.
  // Each route has its own approach direction, landing point and collider pair.
  const buildingProxies=stage08E.getCollisionProxies();
  const tutorialObstacleCount=traversalObstacles.length;
  const buildingRouteObstacles=[];
  const addBuildingRoute=(proxy,buildingIndex,routeType,normal,routeIndex)=>{
    const [cx,cy,cz]=proxy.position,[hx,hy,hz]=proxy.halfExtents;
    const height=Math.max(2.4,hy*2);
    const nx=normal[0],nz=normal[1];
    const edge=nx?hx:hz;
    const routeX=cx+nx*(edge+.46),routeZ=cz+nz*(edge+.46);
    const entity=new pc.Entity('roof-route-'+routeType+'-'+buildingIndex);
    entity.setPosition(routeX,cy,routeZ);
    // Ladder rungs span the wall tangent, not the wall normal. Keep the
    // collision rail thin through the wall and wide along the rung axis.
    const facesAlongX=Math.abs(nx)>.5;
    entity.setLocalScale(facesAlongX?.34:.86,height,facesAlongX?.86:.34);
    entity.tags.add('stage09-roof-access');
    app.root.addChild(entity);
    const destination=routeType==='wall-run'
      ? [routeX-nz*3.6,0,routeZ+nx*3.6]
      : [cx+nx*(edge-.38),height,cz+nz*(edge-.38)];
    const approachYaw=Math.atan2(nx,nz)*180/Math.PI;
    const route={
      id:'roof-route-'+routeType+'-'+proxy.id.replace(/^building-/,''),
      buildingId:proxy.id.replace(/^building-/,''),
      type:routeType,height,entity,roofRoute:true,
      destination,approach:[nx,nz],approachYaw,
      routeOrdinal:routeIndex,
      physicsColliderIndices:[tutorialObstacleCount+routeIndex,tutorialObstacleCount+buildingProxies.length*4+surfacePatches.length+buildingIndex],
      buildingHalfExtents:[hx,hy,hz],visuals:null
    };
    buildingRouteObstacles.push(route);
  };
  for(let i=0;i<buildingProxies.length;i++){
    const proxy=buildingProxies[i];
    const [cx,,cz]=proxy.position;
    // Road-facing side varies with district position; the other two routes
    // approach from the front and rear elevations.
    const side=cx<0?1:-1;
    const front=cz<0?1:-1;
    addBuildingRoute(proxy,i,'ladder',[side,0],i*4);
    addBuildingRoute(proxy,i,'mantle',[0,front],i*4+1);
    addBuildingRoute(proxy,i,'ledge',[0,-front],i*4+2);
    addBuildingRoute(proxy,i,'wall-run',[-side,0],i*4+3);
  }
  const allTraversalObstacles=[...traversalObstacles,...buildingRouteObstacles];
  let roofVisualClock=0,roofVisualCount=0;
  function updateRoofAccessVisuals(position,dt){
    roofVisualClock-=dt;
    if(roofVisualClock>0)return;
    roofVisualClock=.55;
    const nearby=buildingRouteObstacles
      .map(route=>{const p=route.entity.getPosition();return {route,distance:Math.hypot(position[0]-p.x,position[2]-p.z)};})
      .filter(item=>item.distance<62)
      .sort((a,b)=>a.distance-b.distance)
      .slice(0,4);
    const active=new Set(nearby.map(item=>item.route));
    for(const route of buildingRouteObstacles){
      const visible=active.has(route);
      if(visible&&!route.visuals){
        const p=route.entity.getPosition(),h=route.height,visuals=[];
        const gripMaterial=route.type==='ladder'?m.yellow:route.type==='mantle'?m.red:m.white;
        if(route.type==='ladder'){
          const facesAlongX=Math.abs(route.approach[0])>.5;
          const railOffset=facesAlongX?[-.28,.28]:[-.28,.28];
          for(let side=0;side<2;side++){
            const offset=railOffset[side];
            const railPosition=facesAlongX?[p.x,p.y-h/2,p.z+offset]:[p.x+offset,p.y-h/2,p.z];
            visuals.push(box(route.id+'-rail-'+side,railPosition,[.07,h,.07],m.metal));
          }
          // 40 cm authored rung spacing matches the climb IK grid.
          let rungIndex=0;
          for(let y=.32;y<h-.20&&rungIndex<120;y+=.4,rungIndex++){
            visuals.push(box(route.id+'-rung-'+rungIndex,[p.x,y,p.z],facesAlongX?[.07,.055,.58]:[.58,.055,.07],gripMaterial));
          }
        }else{
          const normal=route.approach;
          for(let grip=0;grip<5;grip++){
            const y=(grip+1)*h/6;
            visuals.push(box(route.id+'-wall-grip-'+grip,[p.x-normal[0]*.22,y,p.z-normal[1]*.22],normal[0]?[.74,.065,.09]:[.09,.065,.74],gripMaterial));
          }
          visuals.push(box(route.id+'-ledge-cap',[p.x-normal[0]*.2,Math.max(.08,h-.14),p.z-normal[1]*.2],normal[0]?[.95,.14,.12]:[.12,.14,.95],m.metal));
        }
        route.visuals=visuals;
      }
      if(route.visuals)for(const visual of route.visuals){
        if(visual.render)visual.render.enabled=visible;
      }
    }
    roofVisualCount=nearby.length;
  }

  const actorWorldColliders=[...traversalObstacles,...(stage08I.collisionProxies||[]),...(stage08J.collisionProxies||[]),...(stage08K.collisionProxies||[]),...(stage08L.collisionProxies||[]),...gatewayColliders];
  const navigationColliders=[
    ...allTraversalObstacles,
    ...buildingProxies,
    ...(stage08C.collisionProxies||[]),
    ...(stage08G.collisionProxies||[]),
    ...(stage08I.collisionProxies||[]),
    ...(stage08J.collisionProxies||[]),
    ...(stage08K.collisionProxies||[]),
    ...gatewayColliders
  ].filter(item=>{
    const halfY=Array.isArray(item?.halfExtents)?Math.abs(item.halfExtents[1]):Math.abs(item?.entity?.getLocalScale?.().y||0)/2;
    const centerY=Array.isArray(item?.position)?item.position[1]:(item?.entity?.getPosition?.().y||0);
    return halfY>=.28&&centerY+halfY>.85;
  });
  navigationColliders.push(...(stage08L.collisionProxies||[]),...(stage08N.collisionProxies||[]));
  const actorPhysics=createActorPhysics({colliders:actorWorldColliders,groundY:0,gravity:18});
  const playerWorldColliders=[
    ...allTraversalObstacles,
    ...surfacePatches,
    ...buildingProxies,
    ...(stage08C.collisionProxies||[]),
    ...(stage08G.collisionProxies||[]),
    ...(stage08I.collisionProxies||[]),
    ...(stage08I.groundColliders||[]),
    ...(stage08J.collisionProxies||[]),
    ...(stage08K.collisionProxies||[]),
    ...(stage08L.collisionProxies||[]),
    ...gatewayColliders
  ];
  let playerPhysics=actorPhysics;
  try {
    // Keep the eight tutorial obstacles at the front: traversal temporarily
    // disables their matching Bullet bodies by index while the player climbs.
    playerPhysics=await createPlayerPhysics({colliders:playerWorldColliders,groundY:0,gravity:18});
  } catch(error) {
    console.warn('Bullet player physics unavailable; using the kinematic fallback:',error);
    if(assetStatusLabel)assetStatusLabel.textContent='Bullet unavailable · basic player physics fallback active';
  }
  const stage08NPhysics=stage08N.attachRuntime({playerPhysics});
  const vfxSystem=createVfxSystem({app,poolSize:24});
  const audioSystem=createAudioSystem();
  const emitPlayerFeedback=(type,position,meta={})=>{
    vfxSystem.emit(type,position,1,meta.surface||'asphalt');
    const sound=type==='dust'?'footstep':type==='jump'?'jump':type==='landing'?'landing':type==='parkour'?'parkour':null;
    if(sound)audioSystem.play(sound,meta.surface||'asphalt');
  };
  let traversalSystem=null;
  const playerController=createThirdPersonController(app,camera,canvas,{
    tryTraversal:state=>traversalSystem?.tryContextualTraversal(state)===true,
    onTraversal:()=>window.__NAIJA_RPG_UI__?.showToast('Parkour move started'),
    resolveMovement:(current,proposed)=>{
      // Bullet owns building and solid street-prop collision when available;
      // retain the legacy manifest resolver only for the lightweight fallback.
      const cityResolved=playerPhysics===actorPhysics?stage08E.resolveMovement(current,proposed):proposed;
      return traversalSystem ? traversalSystem.resolveMovement(current,cityResolved) : cityResolved;
    },
    heroCharacter,physics:playerPhysics,onEffect:emitPlayerFeedback,
    onCharacterEvent:event=>{
      if(event.type==='damage')window.__NAIJA_RPG_UI__?.showToast('Impact · health '+Math.round(event.health));
      else if(event.type==='healing')window.__NAIJA_RPG_UI__?.showToast('Recovered '+Math.round(event.amount)+' health');
      else if(event.type==='stamina-empty')window.__NAIJA_RPG_UI__?.showToast('Stamina depleted');
    },
    onInteract:state=>{
      if(vehicleSystem?.toggle(state)) return;
      const nearestInteractable=interactionSystem?.findNearest(state);
      if(nearestInteractable?.available){
        interactionSystem.interact(state);
        return;
      }
      if(traversalSystem?.tryContextualTraversal(state)){
        window.__NAIJA_RPG_UI__?.showToast('Traversal started · '+(traversalSystem.getState().lastTraversal?.clip||'movement'));
        return;
      }
      window.__NAIJA_RPG_UI__?.showToast(nearestInteractable
        ? nearestInteractable.name+' is too far away or blocked.'
        : 'Nothing nearby to interact with.');
    }
  });

  // Spawn Ara on the west pedestrian footpath, clear of the moving traffic lanes.
  // The matching Bullet surface patch is raised to the visible 12cm sidewalk top.
  const firstSpawnPosition = [-6.1, 0.12, -40];
  playerController.setPosition(firstSpawnPosition, 90);
  playerController.setCameraViewYaw?.(0);

  traversalSystem=createTraversalSystem({playerController,physics:playerPhysics,obstacles:allTraversalObstacles,onEffect:(type,position)=>vfxSystem.emit(type,position)});
  let vehicleSystem=null;
  let interactionSystem=null;
  try{
    vehicleSystem=await createVehicleSystem({
      app,camera,canvas,traffic,playerController,playerPhysics,
      buildingColliders:buildingProxies,
      streetColliders:[...(stage08C.collisionProxies||[]),...(stage08G.collisionProxies||[]),...(stage08I.collisionProxies||[]),...(stage08I.groundColliders||[]),...(stage08J.collisionProxies||[]),...(stage08K.collisionProxies||[]),...(stage08L.collisionProxies||[]),...(stage08N.collisionProxies||[]),...gatewayColliders],
      audioSystem,vfxSystem,
      onStatus:message=>window.__NAIJA_RPG_UI__?.showToast(message)
    });
  }catch(error){
    console.warn('Enterable vehicle failed to initialize:',error);
    window.__NAIJA_RPG_UI__?.showToast('Vehicle unavailable · walking mode remains active');
  }

  interactionSystem=createWorldInteractionSystem({
    getPlayerState:()=>playerController.getState(),
    defaultRange:3.25,
    lineOfSight:(from,to)=>hasClearLineOfSight(from,to,navigationColliders,.03),
    onMessage:message=>window.__NAIJA_RPG_UI__?.showToast(message)
  });
  interactionSystem.register({
    id:'yaba-street-kiosk',name:'Street kiosk',position:[-5.5,0,-17],range:3.25,prompt:'TALK · STREET KIOSK',
    onInteract:()=>({message:'You greet the kiosk owner. Vendor trading will connect to the inventory system next.'})
  });
  interactionSystem.register({
    id:'yaba-bus-stop',name:'Bus stop',position:[5.8,0,-37],range:3.25,prompt:'CHECK · BUS STOP',
    onInteract:()=>({message:'Bus stop · the route board is not connected yet.'})
  });
  stage08L.registerInteractions(interactionSystem);
  stage08N.registerInteractions(interactionSystem,{economy:cityEconomy});

  const gidiStreamer=createGidiWorldStreamer({
    app, playerPhysics, vehicleSystem, statusLabel: assetStatusLabel,
    fullDetailRadius: lowDataMode ? 85 : (lowMemoryDevice ? 105 : 160),
    mediumDetailRadius: lowDataMode ? 145 : (lowMemoryDevice ? 220 : 360),
    unloadRadius: lowDataMode ? 320 : (lowMemoryDevice ? 620 : 900),
    collisionLoadRadius: lowMemoryDevice ? 200 : 220,
    collisionUnloadRadius: lowMemoryDevice ? 360 : 460,
    updateInterval: lowDataMode ? 0.55 : (lowMemoryDevice ? 0.32 : 0.22),
    maxLoadsPerUpdate: lowDataMode || lowMemoryDevice ? 1 : 2,
    activationRadius: lowDataMode ? 115 : 220,
    applyShadowPolicy:worldLighting.applyToEntity
  });
  const gidiAuthoredInteriors=createGidiAuthoredInteriors({
    playerPhysics,gidiStreamer,getPlayerState:()=>playerController.getState(),
    collisionLoadRadius:200,collisionUnloadRadius:360
  });
  const worldIdentityRecords=buildWorldIdentityRecords({
    stage08EState:stage08E.getState(),stage08NState:stage08N.getState(),stage08LState:stage08L.getState(),
    interiors:getGidiAuthoredInteriorDefinitions()
  });
  const worldSignage=createWorldSignage({root:document.getElementById('rpg-interface'),camera,canvas});
  worldSignage.setRecords(worldIdentityRecords);
  worldSignage.update(playerController.getState().position);
  window.__NAIJA_RPG_UI__?.setWorldMapData?.(worldIdentityRecords);
  let worldWaypoint=null;
  window.__NAIJA_SET_WAYPOINT__=record=>{worldWaypoint=record;const label=document.getElementById('hud-gps-label');if(label)label.textContent=record?'GPS · '+record.name.toUpperCase():'NO GPS DESTINATION';return true;};

  const companionSystem=createCompanionSystem({
    app,playerController,heroCharacter,obstacles:traversalObstacles,physics:actorPhysics,maxActive:2,
    onStatus:message=>window.__NAIJA_RPG_UI__?.showToast(message),onEffect:(type,position)=>vfxSystem.emit(type,position)
  });
  const pedestrianSystem=createPedestrianSystem({
    app,physics:actorPhysics,colliders:actorWorldColliders,occluders:navigationColliders,
    navigationColliders,heroCharacter:null
  });
  const cityTrafficAI=createCityTrafficAI({traffic,junctionZ});
  const stage08FProfiler = createStage08FDeviceProfiler({ app, canvas, device, stage08E });
  window.__NAIJA_STAGE08F_PROFILE__ = stage08FProfiler;
  window.__NAIJA_INTERACT__=()=>playerController.interact();
  window.__NAIJA_PLAY_HERO_ANIMATION__=(name,durationSeconds)=>playerController.playAnimation(name,durationSeconds);
  window.__NAIJA_SET_HERO_FACE__=(name,weight=1)=>playerController.playFaceExpression(name,weight);
  window.__NAIJA_TRAVERSE__=()=>traversalSystem.tryContextualTraversal(playerController.getState());
  window.__NAIJA_VEHICLE_ENTER__=()=>vehicleSystem?.enter(true);
  window.__NAIJA_VEHICLE_EXIT__=()=>vehicleSystem?.exit();
  window.__NAIJA_COMPANION_COMMAND__=(roleId,command)=>companionSystem.command(roleId,command);
  statusLabel.textContent='Third-person character ready — WASD / touch joystick';

  // Stage 06: city traffic continues as lightweight kinematic scenery.
  // The human character is now the only player-controlled actor.
  let hudClock=0;
  app.on('update',dt=>{
    if(window.__NAIJA_RPG_PAUSED__) return;
    worldLighting.update(dt);
    const step=Math.min(dt,0.05);
    const greenForMain=updateSignal(step);
    cityTrafficAI.update(step,{mainGreen:greenForMain,pedestrians:pedestrianSystem.getState().roster});
    playerController.update(step);
    playerController.applyGroundedFootLock?.();
    traversalSystem.update(step);
    vehicleSystem?.update(step);
    companionSystem.update(step);
    const playerState=playerController.getState();
    const vehicleState=vehicleSystem?.getState?.();
    const worldActorState=vehicleState?.occupied
      ? {...playerState,position:vehicleState.position,vehicleOccupied:true,noiseEvent:true}
      : playerState;
    gidiStreamer.update(worldActorState.position,step);
    gidiAuthoredInteriors.update(worldActorState.position);
    pedestrianSystem.update(step,worldActorState);
    stage08N.update(step,worldActorState,pedestrianSystem.getState());
    vfxSystem.update(step);
    stage08E.update(worldActorState.position);
    if(!vehicleState?.occupied)updateRoofAccessVisuals(playerState.position,step);
    hudClock+=step;
    if(hudClock>=0.12){
      hudClock=0;
      const [district,region]=(()=>{const [x,,z]=worldActorState.position;if(x>3200)return ['Ekiti Highlands','Ekiti'];if(x>2700)return ['Lekki','Lagos'];if(x>1800)return ['Ikoyi','Lagos'];if(x>1450)return ['Victoria Island','Lagos'];if(x>1000)return ['Eko CBD','Lagos'];if(x>300)return ['Yaba','Lagos'];if(x>=-120&&x<=120&&z>=165&&z<=500)return ['Ikeja','Lagos'];return ['Yaba','Lagos'];})();
      window.__NAIJA_RPG_UI__?.setDistrictLabel?.(district,region);
      window.__NAIJA_RPG_UI__?.setVitals(playerState);
      window.__NAIJA_RPG_UI__?.setWorldActivity?.({pedestrians:10,companions:companionSystem.getState().activeCount});
      window.__NAIJA_RPG_UI__?.setInteractionPrompt?.(interactionSystem?.findNearest(playerState)||null);
      window.__NAIJA_RPG_UI__?.setWorldMapPlayerPosition?.(worldActorState.position,Math.atan2(camera.forward.x,-camera.forward.z));
      worldSignage.update(worldActorState.position);
      if(worldWaypoint){const d=Math.hypot(worldActorState.position[0]-worldWaypoint.position[0],worldActorState.position[2]-worldWaypoint.position[2]);const gps=document.getElementById('hud-gps-label');if(gps)gps.textContent='GPS · '+(d>=1000?(d/1000).toFixed(1)+' KM':Math.round(d)+' M')+' · '+worldWaypoint.name.toUpperCase();}
    }
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
    window.__NAIJA_RENDER_DIAGNOSTICS__={viewport:{width:window.innerWidth,height:window.innerHeight},canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height,bufferWidth:canvas.width,bufferHeight:canvas.height},camera:{position:[cameraPos.x,cameraPos.y,cameraPos.z],forward:[forward.x,forward.y,forward.z],fov:camera.camera.fov,farClip:camera.camera.farClip},scene:{rootEntities:app.root.children.length,renderComponents:renderComponents.length,meshInstances,exposure:app.scene.exposure,toneMapping:camera.camera.toneMapping,knownBounds:{min:[-120,-9,-3900],max:[4200,269,480]},},drawCallCount:stats.drawCallCount,primitiveCount:stats.primitiveCount??null,frameTime:stats.frameTime,gpuMemoryBytes:stats.vramTotalBytes};
  });
  const profileExport=document.getElementById('profile-export');
  perfToggle?.addEventListener('click',()=>{const show=perfPanel.hidden;perfPanel.hidden=!show;perfToggle.setAttribute('aria-expanded',String(show));if(profileExport)profileExport.hidden=!show;});
  profileExport?.addEventListener('click',()=>stage08FProfiler.download());
  const gameApi={ready:true,stage:10,hudStage:7,firstSpawnPosition:firstSpawnPosition.slice(),dataOptimization:{lowMemoryDevice,lowDataMode,startupBuildingRadiusMetres,startupBuildings:startupPreload.total,startupBuildingBytes:startupPreload.bytes,progressiveBuildingRadiusMetres:lowDataMode?85:(lowMemoryDevice?140:180),heroBuildingActivationRadiusMetres:lowDataMode?48:(lowMemoryDevice?65:76),manualDataSaver:manualDataSaver===true,manualDataSaverOverride:dataSaverPreference?.explicit===true,hero01NpcDeferred:true,gidiInfrastructureDeferred:true,optionalStreetDownloadsSkipped:skipOptionalStreetDownloads,hero01NpcSkipped:lowDataMode||lowMemoryDevice},rendering:{toneMapping:camera.camera.toneMapping,exposure:app.scene.exposure,worldLighting:worldLighting.getState()},mainCharacterId:'ara-female',mainCharacterName:'Ara 3D Female',hero01Role:'city-npc',stage08A,stage08B,stage08C,stage08D,stage08E:stage08E.getState(),startupPreload,getStage08EState:()=>stage08E.getState(),resolveBuildingMovement:stage08E.resolveMovement,worldCollision:{buildingProxies:stage08E.getCollisionProxies().length,streetInfrastructureProxies:stage08C.collisionProxies?.length||0,ikejaProxies:stage08G.collisionProxies?.length||0,ikejaDistrictProxies:stage08I.collisionProxies?.length||0,ikejaGroundColliders:stage08I.groundColliders?.filter(collider=>collider.surface==='grass').length||0,yabaIkejaStreetProxies:stage08J.collisionProxies?.length||0,gidiRoadDetailProxies:stage08K.collisionProxies?.length||0,gidiActivityInteriors:stage08L.collisionProxies?.length||0,gidiNeighbourhoodProxies:stage08N.collisionProxies?.length||0,gidiDoorProxies:stage08N.doorProxies?.length||0,totalProxies:playerWorldColliders.length},stage08G,stage08H,stage08I,stage08J,stage08K,stage08L,stage08N,stage08NPhysics,getStage08LState:()=>stage08L.getState(),getStage08NState:()=>stage08N.getState(),getCityEconomyState:()=>cityEconomy.getState(),getTrafficAIState:()=>cityTrafficAI.getState(),stage08F:'device-profiling-harness',getStage08FProfile:()=>stage08FProfiler.snapshot(),getRenderBreakdown:()=>{const rows=new Map();const components=[...(app.root.findComponents('render')||[]),...(app.root.findComponents('model')||[])];const stageTags=['stage08a-building','stage08a-roof','stage08b-detail','stage08c-street-detail','stage08d-building','stage08d-architecture','stage08e-building','stage08g-ikeja-street-life','stage08h-ikeja-prop','stage08i-ikeja-district','stage08j-yaba-ikeja-network','stage08k-gidi-road-detail','stage08l-gidi-activity','stage08n-neighbourhood'];for(const component of components){const instances=component.meshInstances||component.model?.meshInstances||[];let node=component.entity,key='unclassified';while(node){for(const tag of stageTags){if(node.tags?.has(tag)){key=tag;break;}}if(key!=='unclassified')break;if(node.name?.startsWith('gidi-cell-')){key='gidi-cell';break;}if(node.name==='GIDI-streamed-infrastructure'){key='gidi-infrastructure';break;}node=node.parent;}const row=rows.get(key)||{components:0,meshInstances:0,visibleComponents:0,shadowCasters:0,batchGroupIds:{}};row.components++;row.meshInstances+=instances.length;if(component.enabled!==false&&component.entity?.enabledInHierarchy!==false)row.visibleComponents++;if(component.castShadows===true)row.shadowCasters++;const id=component.batchGroupId??'none';row.batchGroupIds[id]=(row.batchGroupIds[id]||0)+1;rows.set(key,row);}return {frameDrawCalls:stats.drawCallCount,components:components.length,groups:[...rows.entries()].map(([name,value])=>({name,...value})).sort((a,b)=>b.meshInstances-a.meshInstances)};},getStaticBatchState:()=>{const state={};for(const [name,id] of Object.entries({stage08A:stage08A.batchGroupId,stage08B:stage08B.batchGroupId,stage08C:stage08C.batchGroupId,stage08D:stage08D.batchGroupId,stage08E:stage08E.getState().batchGroupId,stage08H:stage08H.batchGroupId,stage08I:stage08I.batchGroupId,stage08J:stage08J.batchGroupId,stage08K:stage08K.batchGroupId})){const group=id==null?null:app.batcher?.getGroupById?.(id);const members=group?Object.values(group._obj||{}).reduce((sum,list)=>sum+(Array.isArray(list)?list.length:0),0):0;state[name]={groupId:id,batches:id==null?0:app.batcher?.getBatches?.(id)?.length||0,members};}state.stage08L=stage08L.batchGroupIds.map((id,index)=>({groupId:id,batches:app.batcher?.getBatches?.(id)?.length||0,index}));state.stage08N=stage08N.batchGroupIds.map((id,index)=>({groupId:id,batches:app.batcher?.getBatches?.(id)?.length||0,index}));state.stage08B.legacySuppressed=(app.root.findByTag('stage08b-detail')||[]).filter(entity=>entity.render?.enabled===false).length;state.stage08D.legacySuppressed=(app.root.findByTag('stage08d-architecture')||[]).filter(entity=>entity.render?.enabled===false).length;state.stage08G={taggedEntities:(app.root.findByTag('stage08g-ikeja-street-life')||[]).length,reassignedToStage08H:stage08H.batchGroupId};state.gidiCells={groupId:gidiStreamer.getState().cellBatchGroupId,batches:gidiStreamer.getState().cellBatchCount,components:gidiStreamer.getState().streamedRenderComponents};state.gidiInfrastructure={groupId:gidiStreamer.getState().infrastructureBatchGroupId,batches:gidiStreamer.getState().infrastructureBatchCount,components:gidiStreamer.getState().infrastructureRenderComponents};return state;},landscapeOnly:true,mobileCrouch:true,mobileInteract:true,genre:'third-person open-world action RPG',cameraMode:'orbit-follow',thirdPersonCharacter:true,characterGeometry:heroCharacter?'rigged-glb':'no-visible-player-rig',playerCharacterReady:!!heroCharacter,characterSource:heroCharacter?.source??'ara-female-not-installed',characterForwardCorrection:heroCharacter?.forwardAxisCorrectionDegrees??null,characterVisualGroundOffset:heroCharacter?.visualGroundOffset??0,characterLoadError:araLoadError,heroAnimations:heroCharacter?.clipNames??[],heroFaceMorphs:heroCharacter?.morphNames??[],characterMetadata:heroCharacter?.metadata??null,heroDefaultClips:heroCharacter?.defaultClips??null,traversal:true,traversalObstacles:allTraversalObstacles.length,buildingRoofRoutes:new Set(buildingRouteObstacles.map(route=>route.buildingId)).size,buildingAccessPoints:buildingRouteObstacles.length,getRoofVisualCount:()=>roofVisualCount,getTraversalState:()=>traversalSystem.getState(),getInteractionState:()=>interactionSystem?.getState?.()||null,getWorldIdentityState:()=>({count:worldIdentityRecords.length,enterable:worldIdentityRecords.filter(item=>item.enterable).length,byCategory:worldIdentityRecords.reduce((out,item)=>{out[item.category]=(out[item.category]||0)+1;return out;},{})}),getWorldMapState:()=>window.__NAIJA_RPG_UI__?.getWorldMapState?.()||null,getWaypoint:()=>worldWaypoint?.id||null,getCharacterSimulationState:()=>({vitals:playerController.getVitalsState?.(),facial:playerController.getFacialAnimationState?.(),footLock:playerController.getFootLockState?.(),ragdoll:playerController.getRagdollState?.(),recovery:playerController.getRecoveryState?.(),pedestrians:pedestrianSystem.getState(),interactions:interactionSystem?.getState?.()}),companions:true,companionRoster:companionSystem.getState(),getCompanionState:()=>companionSystem.getState(),pedestrians:true,getPedestrianState:()=>pedestrianSystem.getState(),getHeroNpcState:()=>pedestrianSystem.getState().heroNpc,physics:actorPhysics.getState(),getPhysicsState:()=>({player:playerPhysics.getState(),agents:actorPhysics.getState()}),vfx:true,getVfxState:()=>vfxSystem.getState(),audio:true,getAudioState:()=>audioSystem.getState(),vehicle:true,vehicleName:'Naija City Sedan',getVehicleState:()=>vehicleSystem?.getState?.()||{available:false},getHeroRigSnapshot:()=>playerController.getRigSnapshot(),getHeroFootPositions:()=>heroCharacter?.getFootPositions?.()||null,getHeroLimbPositions:()=>heroCharacter?.getLimbPositions?.()||null,getHeroSoleMarkerInfo:()=>heroCharacter?.getSoleMarkerInfo?.()||null,getHeroFootLockState:()=>playerController.getFootLockState?.()||null,getHeroVisualBounds:()=>heroCharacter?.getVisualBounds?.()||null,getGroundProbe:(from,to)=>playerPhysics.raycast?.(from,to)||null,getCameraPosition:()=>camera.getPosition().toArray(),getVisualSettings:()=>({ambientLight:app.scene.ambientLight.toArray(),exposure:app.scene.exposure,toneMapping:pc.tonemapNames[camera.camera.toneMapping],directionalIntensity:sun.light.intensity,directionalColour:sun.light.color.toArray(),clearColour:camera.camera.clearColor.toArray()}),getLightingAudit:()=>{const renderComponents=app.root.findComponents('render')||[];const modelComponents=app.root.findComponents('model')||[];const components=[...renderComponents,...modelComponents];const visible=component=>component.enabled!==false&&component.entity?.enabledInHierarchy!==false;const meshInstances=component=>component.meshInstances?.length??component.model?.meshInstances?.length??0;return {renderComponents:renderComponents.length,modelComponents:modelComponents.length,visibleComponents:components.filter(visible).length,visibleMeshInstances:components.filter(visible).reduce((sum,component)=>sum+meshInstances(component),0),shadowCastingComponents:components.filter(component=>visible(component)&&component.castShadows===true).length,shadowReceivingComponents:components.filter(component=>visible(component)&&component.receiveShadows===true).length,worldLighting:worldLighting.getState()}},getGidiState:()=>gidiStreamer.getState(),getGidiAuthoredInteriorsState:()=>gidiAuthoredInteriors.getState(),
    surfacePatches:surfacePatches.map(patch=>({id:patch.id,surface:patch.surface,position:patch.position.slice(),halfExtents:patch.halfExtents.slice()})),movement:true,sprint:true,jump:true,proceduralAnimations:!heroCharacter,mobileJoystick:true,cameraOrbit:true,junction:true,traffic:traffic.length,getTrafficPositions:()=>traffic.map(item=>({name:item.entity.name,position:item.entity.getPosition().toArray()})),trafficAI:true,assets:assetState,stats,getPlayerState:()=>playerController.getState(),getHeroAnimationState:()=>playerController.getAnimationState()};
  if(import.meta.env.DEV && new URLSearchParams(window.location.search).has('smoke')) {
    gameApi.debugSetCameraFarClipForSmoke=(value)=>{camera.camera.farClip=Math.max(100,Math.min(1000,Number(value)||650));return camera.camera.farClip;};
    gameApi.debugSetWorldTimeForSmoke=(hours)=>worldLighting.setTimeHours(hours);
    gameApi.debugInteractForSmoke=()=>interactionSystem.interact(playerController.getState());
    gameApi.debugLoadGidiForSmoke=async(position=[100,0,-450])=>{playerController.setPositionForSmoke(position,0);await gidiStreamer.update(position,1);gidiAuthoredInteriors.update(position);return {streamer:gidiStreamer.getState(),interiors:gidiAuthoredInteriors.getState()};};
    gameApi.debugUpdateGidiInteriorsForSmoke=position=>gidiAuthoredInteriors.update(position);
    gameApi.debugGetGidiNamedEntityForSmoke=name=>gidiStreamer.getNamedEntityState(name);
    gameApi.debugGetGidiStateForSmoke=()=>gidiStreamer.getState();
    gameApi.debugSetCameraForSmoke=(position,target)=>{camera.setPosition(...position);camera.lookAt(...target);};
    gameApi.debugSetPlayerForSmoke=(position,yaw=0)=>playerController.setPositionForSmoke(position,yaw);
    gameApi.debugSetPlayerMotionForSmoke=(position,velocity,yaw=0)=>playerController.setMotionForSmoke(position,velocity,yaw);
    gameApi.debugSetPlayerInputForSmoke=(x=0,y=0,sprint=false)=>playerController.setInputForSmoke(x,y,sprint);
    gameApi.debugSetControlEnabledForSmoke=value=>playerController.setControlEnabled(value);
    gameApi.debugSetCrouchedForSmoke=value=>playerController.setCrouched(value);
    gameApi.debugApplyPlayerDamageForSmoke=(amount=25,options={})=>playerController.applyDamage(amount,{source:'smoke-impact',...options});
    gameApi.debugHealPlayerForSmoke=(amount=25)=>playerController.heal(amount,{source:'smoke-heal'});
    gameApi.debugRecoverPlayerForSmoke=options=>playerController.recoverFromDowned(options||{});
    gameApi.debugSetFaceExpressionForSmoke=(name='happy',weight=1)=>playerController.playFaceExpression(name,weight);
    gameApi.debugSetFaceVisemeForSmoke=(name,weight=1)=>playerController.playFaceViseme(name,weight);
    gameApi.debugApplyHeroLimbIKForSmoke=(side,target,weight=1)=>heroCharacter?.applyLimbIK?.(side,target,weight)||null;
    gameApi.debugGetHeroRagdollPoseForSmoke=()=>heroCharacter?.getRagdollPose?.()||null;
    gameApi.debugGetRagdollStateForSmoke=()=>playerController.getRagdollState?.()||null;
    gameApi.debugGetRecoveryStateForSmoke=()=>playerController.getRecoveryState?.()||{active:false};
    gameApi.debugProbeCharacterRecoverySupportForSmoke=(x,y,z,yaw=0)=>playerController.probeRecoverySupportForSmoke?.(x,y,z,yaw)||null;
    gameApi.debugAddCharacterTerrainForSmoke=(owner,colliders)=>playerPhysics.addStaticColliders(colliders,owner);
    gameApi.debugRemoveCharacterTerrainForSmoke=owner=>playerPhysics.removeStaticColliders(owner);
    gameApi.debugRaycastForSmoke=(from,to)=>playerPhysics.raycast(from,to);
    gameApi.debugRunUnevenTerrainIKForSmoke=()=>{
      const originalState=playerController.getState(),original=originalState.position.slice(),originalYaw=originalState.facingYaw;
      playerController.setPositionForSmoke([0,0,0],0);
      window.__NAIJA_PLAY_HERO_ANIMATION__?.('Idle',1.0);
      const animationSystem=app.systems?.anim;
      for(let i=0;i<5;i++)animationSystem?.onAnimationUpdate?.(1/60);
      const feet=heroCharacter?.getLimbPositions?.()||{};
      const left=feet.leftAnkle||feet.leftFoot,right=feet.rightAnkle||feet.rightFoot;
      if(!left||!right)return {pass:false,error:'Ara ankle bones unavailable'};
      const owner='smoke-uneven-terrain';
      const colliders=[
        {id:'smoke-left-incline',position:[left[0],left[1]-.12,left[2]],halfExtents:[.12,.08,.44],rotationZ:14,surface:'concrete'},
        {id:'smoke-right-step',position:[right[0],right[1]-.005,right[2]],halfExtents:[.12,.11,.44],rotationZ:-8,surface:'concrete'}
      ];
      const created=playerPhysics.addStaticColliders(colliders,owner);
      const results={};
      for(const side of ['left','right']){
        const ankle=(side==='left'?left:right).slice();
        const hit=playerPhysics.raycast([ankle[0],ankle[1]+.65,ankle[2]],[ankle[0],ankle[1]-.65,ankle[2]]);
        const marker=(feet[side+'SoleHeel']||feet[side+'SoleToe']||ankle);
        const target=makeFootPlantTarget(ankle,hit,{maxVerticalOffset:.48,soleOffset:ankle[1]-marker[1]});
        const ik=target?heroCharacter?.applyLimbIK?.(side,target.position,1,target.normal):null;
        const actual=(heroCharacter?.getLimbPositions?.()||{})[side+'Ankle'];
        const normal=heroCharacter?.getFootSoleNormal?.(side)||null;
        const error=actual&&target?Math.hypot(actual[0]-target.position[0],actual[1]-target.position[1],actual[2]-target.position[2]):Infinity;
        results[side]={hit:!!hit,surface:hit?.surface||null,groundNormal:hit?.normal||null,target:target?.position||null,ikApplied:!!ik?.applied,reachable:!!ik?.reachable,endEffectorError:error,footNormal:normal,normalAlignment:normal&&hit?.normal?normal[0]*hit.normal[0]+normal[1]*hit.normal[1]+normal[2]*hit.normal[2]:null};
      }
      playerPhysics.removeStaticColliders(owner);
      playerController.setPositionForSmoke(original,originalYaw);
      const pass=['left','right'].every(side=>results[side].hit&&results[side].ikApplied&&results[side].reachable&&results[side].endEffectorError<.025&&results[side].normalAlignment>.94);
      return {pass,created,results};
    };
    gameApi.debugAdvanceCharacterSimulationForSmoke=(frames=60,dt=1/60)=>{
      const limit=Math.max(1,Math.min(600,Math.floor(Number(frames)||60)));
      const step=Math.max(1/120,Math.min(1/30,Number(dt)||1/60));
      const animationSystem=app.systems?.anim,ragdollTrace=[];
      for(let i=0;i<limit;i++){
        animationSystem?.onAnimationUpdate?.(step);
        playerController.update(step);
        playerController.applyGroundedFootLock?.();
        vfxSystem.update(step);
        const ragdoll=playerController.getRagdollState?.();
        if(ragdoll?.active)ragdollTrace.push({frame:i,stepCount:ragdoll.stepCount,phase:ragdoll.phase,handoffWeight:ragdoll.handoffWeight});
      }
      app.render?.();
      return {frames:limit,dt:step,player:playerController.getState(),animation:playerController.getAnimationState(),ragdollTrace,facial:playerController.getFacialAnimationState?.()||null};
    };
    gameApi.debugEnterVehicleForSmoke=()=>vehicleSystem?.debugEnter?.()||false;
    gameApi.debugExitVehicleForSmoke=()=>vehicleSystem?.debugExit?.()||false;
    gameApi.debugSetVehicleInputForSmoke=(steering=0,accelerate=false,brake=false)=>vehicleSystem?.debugSetInput?.(steering,accelerate,brake)||null;
    gameApi.debugAdvanceVehicleForSmoke=(maxFrames=300,target=null,dt=1/60)=>{
      const limit=Math.max(1,Math.min(1200,Math.floor(Number(maxFrames)||300)));
      const step=Math.max(1/120,Math.min(.05,Number(dt)||1/60));
      let frames=0,state=vehicleSystem?.getState?.()||null;
      for(let i=0;i<limit;i++){
        vehicleSystem?.update(step);
        vfxSystem.update(step);
        frames++;
        state=vehicleSystem?.getState?.()||null;
        if(target&&state?.occupied&&state.position[0]>Number(target.x??Infinity)&&
          state.position[2]<Number(target.z??-Infinity)&&state.position[1]>.35&&state.position[1]<1.7&&
          (state.dynamics?.measuredWheelContacts||0)>=3&&state.speedKmh>5)break;
      }
      return {frames,completed:!!(target&&state?.occupied&&state.position[0]>Number(target.x??Infinity)&&
        state.position[2]<Number(target.z??-Infinity)&&(state.dynamics?.measuredWheelContacts||0)>=3&&state.speedKmh>5),vehicle:state};
    };
    gameApi.debugSetVehiclePositionForSmoke=(position,yaw=0)=>vehicleSystem?.debugSetPositionForSmoke?.(position,yaw)||false;
    gameApi.debugProbeVehicleColliderForSmoke=()=>{
      const vehicle=vehicleSystem?.getState?.()||{};
      const p=vehicle.position||[0,.94,5.5];
      const hit=playerPhysics.raycast?.([p[0],1,p[2]+4],[p[0],1,p[2]-4])||null;
      return {vehicleColliderReady:!!vehicle.playerCarColliderReady,hit,vehicle};
    };
    gameApi.debugProbeVehicleBodyCollisionForSmoke=()=>{
      const vehicle=vehicleSystem?.getState?.()||{};
      const carPosition=vehicle.position||[0,.94,5.5];
      const yaw=(Number(vehicle.yaw)||180)*Math.PI/180;
      const sideX=-Math.cos(yaw),sideZ=Math.sin(yaw);
      const start=[carPosition[0]+sideX*2.35,0,carPosition[2]+sideZ*2.35];
      const original=playerController.getState().position.slice();
      const originalYaw=playerController.getState().facingYaw||0;
      playerController.setPositionForSmoke(start,vehicle.yaw||180);
      const actor={position:start.slice(),velocity:[0,0,0],grounded:true,traversing:true};
      for(let i=0;i<24;i++)playerPhysics.step(actor,[-sideX*3,0,-sideZ*3],.05);
      const finalOffset=(actor.position[0]-carPosition[0])*sideX+(actor.position[2]-carPosition[2])*sideZ;
      playerController.setPositionForSmoke(original,originalYaw);
      return {vehicleColliderReady:!!vehicle.playerCarColliderReady,start,finalPosition:actor.position,
        finalOffset:Number(finalOffset.toFixed(3)),blockedByCar:finalOffset>1.25,
        movementTowardCar:Number((2.35-finalOffset).toFixed(3)),playerBodyEnabled:playerPhysics.getState().playerBodyEnabled};
    };
    gameApi.debugClearVehicleInputForSmoke=()=>vehicleSystem?.debugClearInput?.()||null;
    gameApi.debugTraverseBuildingForSmoke=(buildingId,routeType='ladder')=>{
      const route=buildingRouteObstacles.find(item=>(!buildingId||item.buildingId===buildingId)&&item.type===routeType);
      if(!route)return {started:false,buildingRouteCount:buildingRouteObstacles.length,routeType};
      const p=route.entity.getPosition();
      const start=[p.x+route.approach[0]*2.2,0,p.z+route.approach[1]*2.2];
      playerController.setPositionForSmoke(start,route.approachYaw);
      const started=traversalSystem.tryContextualTraversal(playerController.getState(),route.id);
      const mountDuration=playerController.getClipDuration?.('Ara_LadderMount')||.75;
      const climbCycle=playerController.getClipDuration?.('Ara_LadderClimb')||.958;
      const dismountDuration=playerController.getClipDuration?.('Ara_LadderDismount')||.75;
      const traversalFrames=Math.min(1800,Math.ceil((mountDuration+Math.ceil(route.height/.4)*climbCycle+dismountDuration)/.05)+12);
      for(let i=0;i<traversalFrames;i++){playerController.update(.05);traversalSystem.update(.05);app.systems?.anim?.onAnimationUpdate?.(.05);vfxSystem.update(.05);}
      return {started,route:route.id,buildingId:route.buildingId,routeType:route.type,height:route.height,
        expectedFacingYaw:route.approachYaw,player:playerController.getState(),traversal:traversalSystem.getState(),feet:heroCharacter?.getFootPositions?.()||null,visualBounds:heroCharacter?.getVisualBounds?.()||null,traversalFrames};
    };
    gameApi.debugStartBuildingTraversalForSmoke=(buildingId,routeType='ladder')=>{
      const route=buildingRouteObstacles.find(item=>(!buildingId||item.buildingId===buildingId)&&item.type===routeType);
      if(!route)return {started:false,buildingRouteCount:buildingRouteObstacles.length,routeType};
      const p=route.entity.getPosition();
      const start=[p.x+route.approach[0]*2.2,0,p.z+route.approach[1]*2.2];
      const before=traversalSystem.getState().traversalsCompleted;
      playerController.setPositionForSmoke(start,route.approachYaw);
      const started=traversalSystem.tryContextualTraversal(playerController.getState(),route.id);
      return {started,route:route.id,buildingId:route.buildingId,routeType:route.type,height:route.height,
        expectedFacingYaw:route.approachYaw,start,before,routePosition:p.toArray(),approach:route.approach.slice(),
        expectedDuration:(playerController.getClipDuration?.('Ara_LadderMount')||.75)+Math.ceil(route.height/.4)*(playerController.getClipDuration?.('Ara_LadderClimb')||.958)+(playerController.getClipDuration?.('Ara_LadderDismount')||.75)};
    };
    gameApi.debugProbeWorldCollisionForSmoke=()=>({
      buildingBlocked:playerPhysics.canFitCapsule?.([-9.2,0,-82],1.8)===false,
      roadwayClear:playerPhysics.canFitCapsule?.([0,0,-82],1.8)===true,
      corridorProxies:playerWorldColliders.length,
      physics:playerPhysics.getState()
    });
    gameApi.debugProbeBulletCollisionForSmoke=()=>{
      const start=[-16,0,-82];
      playerController.setPositionForSmoke(start,90);
      const actor={position:start.slice(),velocity:[0,0,0],grounded:true};
      for(let i=0;i<60;i++)playerPhysics.step(actor,[3,0,0],.05);
      playerController.setPositionForSmoke([0,0,0],0);
      return {startX:start[0],endX:actor.position[0],buildingBoundaryX:-12.45,
        stoppedByBuilding:actor.position[0]<-12.5,physics:playerPhysics.getState()};
    };
    gameApi.debugAdvanceTraversalForSmoke=(frames=90)=>{
      const count=Math.max(1,Math.min(180,Math.floor(Number(frames)||90)));
      const step=1/60;
      const trace=[];
      const animationSystem=app.systems?.anim;
      for(let i=0;i<count;i++){
        playerController.update(step);
        traversalSystem.update(step);
        // Step PlayCanvas's actual AnimComponentSystem alongside Bullet, then
        // pin the active shoe marker before collecting this 60 Hz sample.
        animationSystem?.onAnimationUpdate?.(step);
        const footLock=playerController.applyGroundedFootLock?.()||null;
        vfxSystem.update(step);
        {
          const player=playerController.getState();
          const roof=playerPhysics.raycast?.([player.position[0],player.position[1]+.45,player.position[2]],
            [player.position[0],player.position[1]-.45,player.position[2]])||null;
          trace.push({time:Number(((i+1)*step).toFixed(5)),dt:step,position:player.position,grounded:player.grounded,roofY:roof?.point?.[1]??null,groundY:roof?.point?.[1]??null,
            clip:playerController.getAnimationState()?.activeClip||'',activeStateProgress:playerController.getAnimationState()?.activeStateProgress??null,
            locomotionPlaybackRates:playerController.getAnimationState()?.locomotionPlaybackRates||null,footLock,
            evaluatorClips:playerController.getAnimationState()?.evaluatorClips||[],limbs:heroCharacter?.getLimbPositions?.()||null});
        }
      }
      app.render?.();
      return {player:playerController.getState(),traversal:traversalSystem.getState(),trace,
        animationSystemAvailable:!!animationSystem?.onAnimationUpdate};
    };
    gameApi.debugAdvanceLocomotionForSmoke=(frames=120,dt=1/60)=>{
      const count=Math.max(1,Math.min(360,Math.floor(Number(frames)||120)));
      const step=Math.max(1/120,Math.min(1/30,Number(dt)||1/60));
      const trace=[];
      const animationSystem=app.systems?.anim;
      if(!animationSystem?.onAnimationUpdate)throw new Error('PlayCanvas AnimComponentSystem.onAnimationUpdate is unavailable');
      for(let i=0;i<count;i++){
        playerController.update(step);
        animationSystem.onAnimationUpdate(step);
        const footLock=playerController.applyGroundedFootLock?.()||null;
        const player=playerController.getState();
        const limbs=heroCharacter?.getLimbPositions?.()||null;
        const ground=playerPhysics.raycast?.([player.position[0],player.position[1]+.7,player.position[2]],
          [player.position[0],player.position[1]-.65,player.position[2]])||null;
        const animation=playerController.getAnimationState?.()||{};
        trace.push({time:Number(((i+1)*step).toFixed(5)),dt:step,position:player.position,
          grounded:player.grounded,groundY:ground?.point?.[1]??null,horizontalSpeed:player.horizontalSpeed,
          running:player.running,moving:player.moving,facingYaw:player.facingYaw,clip:animation.activeClip||'',activeState:animation.activeState||'',
          activeStateProgress:animation.activeStateProgress??null,activeStateCurrentTime:animation.activeStateCurrentTime??null,activeStateDuration:animation.activeStateDuration??null,locomotionPlaybackRates:animation.locomotionPlaybackRates||null,
          footLock,footLockState:playerController.getFootLockState?.()||null,limbs});
      }
      app.render?.();
      return {player:playerController.getState(),trace,animationSystemAvailable:true,dt:step};
    };
    gameApi.debugCompleteTraversalForSmoke=(maxFrames=900)=>{
      const limit=Math.max(1,Math.min(1800,Math.floor(Number(maxFrames)||900)));
      const samples=[],clipChanges=[],animationTrace=[];
      const limbSamples={leftHandTip:[],rightHandTip:[],leftFoot:[],rightFoot:[]};
      const animationSystem=app.systems?.anim;
      if(!animationSystem?.onAnimationUpdate)throw new Error('PlayCanvas AnimComponentSystem.onAnimationUpdate is unavailable');
      let previousY=playerController.getState().position[1],lastClip='';
      let simulatedFrames=0,animationSteps=0;
      const sampleLimbs=()=>{
        const player=playerController.getState(),limbs=heroCharacter?.getLimbPositions?.()||{};
        for(const key of Object.keys(limbSamples))if(limbs[key])limbSamples[key].push(limbs[key][1]);
      };
      for(let i=0;i<limit;i++){
        playerController.update(.05);
        traversalSystem.update(.05);
        animationSystem.onAnimationUpdate(.05);
        animationSteps++;
        vfxSystem.update(.05);
        const player=playerController.getState();
        const delta=player.position[1]-previousY;
        samples.push(Number(delta.toFixed(5)));
        previousY=player.position[1];
        const animationState=playerController.getAnimationState()||{};
        const clip=animationState.activeClip||'';
        if(clip&&clip!==lastClip){clipChanges.push(clip);lastClip=clip;}
        if(i%2===0)sampleLimbs();
        if(i%10===0){
          const limbs=heroCharacter?.getLimbPositions?.()||{};
          animationTrace.push({frame:i,rootY:player.position[1],clip,state:animationState.activeState,
            time:animationState.activeStateCurrentTime,leftHandY:limbs.leftHand?.[1],rightHandY:limbs.rightHand?.[1],
            leftFootY:limbs.leftFoot?.[1],rightFootY:limbs.rightFoot?.[1]});
        }
        simulatedFrames++;
        if(!player.traversing)break;
      }
      // The ladder controller owns Ara's root while the Bullet capsule is detached.
      // After dismount, physics is reattached at the roof and receives a few
      // ordinary frames to establish real rooftop support.
      for(let i=0;i<4&&!playerController.getState().grounded;i++){
        playerController.update(.05);
        traversalSystem.update(.05);
        animationSystem.onAnimationUpdate(.05);
        animationSteps++;
        vfxSystem.update(.05);
        const player=playerController.getState();
        samples.push(Number((player.position[1]-previousY).toFixed(5)));
        previousY=player.position[1];
        const clip=playerController.getAnimationState()?.activeClip||'';
        if(clip&&clip!==lastClip){clipChanges.push(clip);lastClip=clip;}
        sampleLimbs();
        simulatedFrames++;
      }
      const positive=samples.filter(value=>value>.001),holds=samples.filter(value=>Math.abs(value)<.001).length;
      const limbMotion=Object.fromEntries(Object.entries(limbSamples).map(([key,values])=>[key,{samples:values.length,verticalRange:values.length?Number((Math.max(...values)-Math.min(...values)).toFixed(3)):0,min:values.length?Number(Math.min(...values).toFixed(3)):null,max:values.length?Number(Math.max(...values).toFixed(3)):null}]));
      app.render?.();
      return {completed:!playerController.getState().traversing,simulatedFrames,animationSteps,animationSystemAvailable:true,limbMotion,
        pulseTrace:{samples,positiveSamples:positive.length,holdSamples:holds,
          maxStep:Math.max(0,...samples),minStep:Math.min(...positive,0)},
        clipChanges,animationTrace,player:playerController.getState(),traversal:traversalSystem.getState(),
        physics:playerPhysics.getState(),feet:heroCharacter?.getFootPositions?.()||null};
    };
    gameApi.debugTraverseTypeForSmoke=type=>{
      const obstacle=traversalObstacles.find(item=>item.type===type);if(!obstacle)return {started:false,type};
      const center=obstacle.entity.getPosition(),offset=type==="wall-run"?-.7:0;
      playerController.setPositionForSmoke([center.x+offset,0,center.z+1.55],0);
      const startPosition=playerController.getState().position.slice();
      const before=traversalSystem.getState().traversalsCompleted;
      const started=traversalSystem.tryContextualTraversal(playerController.getState(),obstacle.id);
      const duration=Number(traversalSystem.getState().lastTraversal?.duration)||2.9;
      const frames=Math.min(900,Math.max(58,Math.ceil(duration/.05)+12));
      for(let i=0;i<frames&&playerController.getState().traversing;i++){
        playerController.update(.05);traversalSystem.update(.05);app.systems?.anim?.onAnimationUpdate?.(.05);vfxSystem.update(.05);
      }
      // Let the normal Bullet support test settle after a rung-based climb.
      for(let i=0;i<4&&!playerController.getState().grounded&&!playerController.getState().traversing;i++){
        playerController.update(.05);traversalSystem.update(.05);app.systems?.anim?.onAnimationUpdate?.(.05);vfxSystem.update(.05);
      }
      const traversal=traversalSystem.getState(),player=playerController.getState();
      const distanceTravelled=Math.hypot(player.position[0]-startPosition[0],player.position[2]-startPosition[2]);
      return {started,type,traversal,player,completed:!player.traversing&&traversal.traversalsCompleted>before,
        simulatedFrames:frames,expectedDuration:duration,startPosition,distanceTravelled,verticalTravel:player.position[1]-startPosition[1]};
    };
    gameApi.debugJumpPhysicsForSmoke=()=>{
      playerController.setPositionForSmoke([0,0,0],0);playerController.queueJumpForSmoke();
      // Sample the rising phase near the jump apex (about 0.25 seconds).
      for(let i=0;i<5;i++){playerController.update(.05);app.systems?.anim?.onAnimationUpdate?.(.05);vfxSystem.update(.05);}const airborne=playerController.getState();
      for(let i=0;i<42;i++){playerController.update(.05);app.systems?.anim?.onAnimationUpdate?.(.05);vfxSystem.update(.05);}
      return {airborne,landed:playerController.getState(),vfx:vfxSystem.getState()};
    };
  }
  gameApi.dataOptimization.startupDurationMs=Math.round(performance.now()-startupStartedAt);
  window.__NAIJA_GAME__=gameApi;
  window.__NAIJA_RPG_UI__?.setVitals(playerController.getState());

  window.addEventListener('pagehide',()=>{delete window.__NAIJA_INTERACT__;delete window.__NAIJA_PLAY_HERO_ANIMATION__;delete window.__NAIJA_SET_HERO_FACE__;delete window.__NAIJA_TRAVERSE__;delete window.__NAIJA_COMPANION_COMMAND__;delete window.__NAIJA_VEHICLE_ENTER__;delete window.__NAIJA_VEHICLE_EXIT__;worldLighting.destroy();gidiStreamer.destroy();stage08N.destroy();vehicleSystem?.destroy?.();companionSystem.destroy();pedestrianSystem.destroy();playerPhysics.cleanup?.();vfxSystem.destroy();audioSystem.destroy();delete window.__NAIJA_STAGE08F_PROFILE__;stage08FProfiler.destroy();playerController.destroy();},{once:true});
  // Apply the initial 4.8k-component shadow classification once while the loading screen is active.
  worldLighting.applyInitialShadowPolicy();
  app.start();
  window.__NAIJA_RPG_UI__?.finishLoading?.();
  statusLabel.textContent='Ready — Stage 09 parkour, city life and physics';
  const loadOptionalNpc=async()=>{
    // Respect Android/browser Data Saver. Procedural pedestrians remain active
    // and the character download is skipped entirely on a metered connection.
    if(lowDataMode||lowMemoryDevice){
      if(assetStatusLabel)assetStatusLabel.textContent='Data saver active · optional Hero 01 animation download skipped';
      return;
    }
    try{
      hero01NpcCharacter=await loadHeroCharacter(app,{
        urls:['assets/hero/NaijaCityHero01_60clips.glb.b64'],
        characterId:'hero01',
        statusLabel:assetStatusLabel
      });
      pedestrianSystem.setHeroCharacter?.(hero01NpcCharacter);
      companionSystem.setHeroCharacter?.(hero01NpcCharacter);
      if(assetStatusLabel)assetStatusLabel.textContent='Ara 3D Gen Female Executive · Hero 01 city NPC streamed in';
    }catch(error){
      console.warn('Optional Hero 01 city NPC model could not load:',error);
    }
  };
  if(!lowDataMode){
    if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(()=>{void loadOptionalNpc();},{timeout:5000});
    else window.setTimeout(()=>{void loadOptionalNpc();},2500);
  }
}
