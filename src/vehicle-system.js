import * as pc from 'playcanvas';
import { createVehiclePhysics } from './vehicle-physics.js';

const BASE = import.meta.env.BASE_URL || '/';
const assetUrl = name => new URL('assets/vehicles/' + name, new URL(BASE, window.location.origin)).href;

async function isGlbAvailable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && !contentType.includes('text/html') &&
      (contentType.includes('model/gltf-binary') || contentType.includes('octet-stream') || contentType.includes('binary/octet-stream'));
  } catch {
    return false;
  }
}

function waitForAsset(app, name, url) {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url });
    app.assets.add(asset);
    asset.once('load', () => resolve(asset));
    asset.once('error', error => reject(new Error(error?.message || String(error || 'vehicle GLB failed to load'))));
    app.assets.load(asset);
  });
}

function makeFallbackWheel(app, parent, name, material) {
  const wheel = new pc.Entity(name);
  wheel.addComponent('render', { type: 'cylinder', material });
  wheel.setLocalScale(.72, .25, .72);
  wheel.setLocalEulerAngles(0, 0, 90);
  parent.addChild(wheel);
  return wheel;
}

function makeFallbackCar(app, car) {
  const bodyMaterial = new pc.StandardMaterial();
  bodyMaterial.diffuse = new pc.Color(.035, .18, .30);
  bodyMaterial.metalness = .68;
  bodyMaterial.shininess = 48;
  bodyMaterial.update();
  const glass = new pc.StandardMaterial();
  glass.diffuse = new pc.Color(.02, .055, .07);
  glass.update();
  const addBox = (name, position, scale, material) => {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box', material });
    entity.setLocalPosition(...position);
    entity.setLocalScale(...scale);
    car.addChild(entity);
    return entity;
  };
  addBox('fallback-car-body', [0, -.21, 0], [1.82, .66, 3.82], bodyMaterial);
  addBox('fallback-car-cabin', [0, .38, -.12], [1.45, .72, 1.72], glass);
  const wheelMat = new pc.StandardMaterial();
  wheelMat.diffuse = new pc.Color(.018, .021, .024); wheelMat.update();
  return [
    makeFallbackWheel(app, car, 'wheel_FL', wheelMat),
    makeFallbackWheel(app, car, 'wheel_FR', wheelMat),
    makeFallbackWheel(app, car, 'wheel_RL', wheelMat),
    makeFallbackWheel(app, car, 'wheel_RR', wheelMat)
  ];
}

export async function createVehicleSystem({
  app, camera, canvas, traffic = [], playerController, playerPhysics,
  buildingColliders = [], streetColliders = [], audioSystem, vfxSystem,
  onStatus = () => {}
} = {}) {
  if (!app || !camera || !canvas || !playerController) throw new Error('Vehicle system requires the game, camera, canvas and player controller.');

  const car = new pc.Entity('naija-city-player-sedan');
  app.root.addChild(car);
  let modelSource = 'procedural-fallback';
  let carAsset = null;
  let carVisual = null;
  let wheelRoots = [];
  let driverDoor = null;
  let driverWindow = null;
  let passengerDoor = null;
  let passengerWindow = null;
  let steeringWheel = null;
  let driverDoorAngle = 0;
  let driverDoorTarget = 0;
  let driverDoorCloseDelay = 0;
  let vehiclePhysics = null;
  let destroyed = false;
  let occupied = false;
  let entering = false;
  let entryTransition = null;
  let accelerateHeld = false;
  let brakeHeld = false;
  let steerLeftHeld = false;
  let steerRightHeld = false;
  let playerCarColliderReady = false;
  const playerCarColliderOwner = 'player-driven-sedan';
  let throttle = 0;
  let brake = false;
  let skidClock = 0;
  let exhaustClock = 0;
  let collisionCooldown = 0;
  let previousSpeed = 0;
  let fuelPercent = 100;
  let engineTempC = 77;
  let engineLoad = 0;
  let debugSteering = null;
  let cameraYaw = Math.PI;
  let cameraPitch = .18;
  let cameraDistance = 6.2;
  let pointerId = null;
  let pointerX = 0, pointerY = 0;
  const keys = Object.create(null);
  const cameraTarget = new pc.Vec3();
  const desiredCamera = new pc.Vec3();
  const smoothedCamera = camera.getPosition().clone();
  let cameraInitialized = false;
  let uiClock = 0;

  try {
    const preferredAraModel = 'ara-3d-gen-car.glb';
    const preferredUrl = assetUrl(preferredAraModel);
    if (await isGlbAvailable(preferredUrl)) {
      carAsset = await waitForAsset(app, 'ara-3d-gen-car', preferredUrl);
      modelSource = 'Ara 3D Gen vehicle model';
    } else {
      carAsset = await waitForAsset(app, 'naija-city-sedan', assetUrl('naija-city-sedan.glb'));
      modelSource = 'ATL Sandbox Blender · Naija City original sedan';
    }
    carVisual = carAsset.resource.instantiateRenderEntity();
    carVisual.name = 'naija-city-sedan-visual';
    car.addChild(carVisual);
    if (modelSource === 'Ara 3D Gen vehicle model') {
      // Ara's car faces local +Z and its mesh origin is 0.356 m left of centre.
      // The Bullet chassis faces local -Z, so flip the visual hierarchy and
      // recenter it without changing the physics body's world transform.
      carVisual.setLocalPosition(-.356, -.94, -.034);
      carVisual.setLocalEulerAngles(0, 180, 0);
      // Physics wheel order is front-left, front-right, rear-left, rear-right.
      // Mirroring the Ara +Z-facing model swaps left/right in local space.
      const aliases = [
        ['Vehicle_3_Wheel_front_1'],
        ['Vehicle_2_Wheel_front_-1'],
        ['Vehicle_5_Wheel_rear_1'],
        ['Vehicle_4_Wheel_rear_-1']
      ];
      wheelRoots = aliases.map(names => names.map(name => carVisual.findByName(name)).find(Boolean) || null);
      driverDoor = carVisual.findByName('Vehicle_9_Door_left');
      driverWindow = carVisual.findByName('Vehicle_10_Window_left');
      passengerDoor = carVisual.findByName('Vehicle_7_Door_right');
      passengerWindow = carVisual.findByName('Vehicle_8_Window_right');
      steeringWheel = carVisual.findByName('Vehicle_6_Steering_wheel');
      if (wheelRoots.some(root => !root)) {
        throw new Error('Ara vehicle rig is missing one or more named wheel joints.');
      }
      modelSource = 'Ara 3D Gen · Saloon · mobile LOD';
    } else {
      // The original Blender sedan is already authored for the game chassis.
      carVisual.setLocalPosition(0, -.94, 0);
      const aliases = [
        ['wheel_FL', 'wheel_fl', 'wheel_front_left'],
        ['wheel_FR', 'wheel_fr', 'wheel_front_right'],
        ['wheel_RL', 'wheel_rl', 'wheel_rear_left'],
        ['wheel_RR', 'wheel_rr', 'wheel_rear_right']
      ];
      wheelRoots = aliases.map(names => {
        for (const name of names) {
          const node = carVisual.findByName(name);
          if (node) return node;
        }
        return null;
      });
      if (wheelRoots.some(root => !root)) {
        wheelRoots = makeFallbackCar(app, car);
        modelSource += ' · fallback wheel set';
      }
    }
  } catch (error) {
    console.warn('Ready-made vehicle GLB could not load; using the built-in fallback sedan.', error);
    wheelRoots = makeFallbackCar(app, car);
  }

  const startPosition = { x: 0, y: .94, z: 5.5 };
  const colliders = [...buildingColliders, ...streetColliders];
  vehiclePhysics = await createVehiclePhysics(car, traffic, wheelRoots, {
    position: startPosition,
    yaw: 180,
    colliders
  });
  // Player and vehicle physics currently use separate Bullet worlds. Mirror
  // the sedan chassis into the player world so Ara cannot walk through it.
  playerCarColliderReady = (playerPhysics?.addStaticColliders?.([{
    id:'player-sedan-chassis-proxy',kind:'vehicle',position:vehiclePhysics.getPosition(),
    halfExtents:[1.04,.60,2.42],rotationY:vehiclePhysics.getYaw(),surface:'metal'
  }],playerCarColliderOwner)||0)>0;
  function syncPlayerSedanCollider(enabled=true) {
    if(!playerCarColliderReady)return false;
    const position=vehiclePhysics.getPosition();
    playerPhysics?.updateStaticColliders?.(playerCarColliderOwner,[{
      position,rotationY:vehiclePhysics.getYaw(),surface:'metal'
    }]);
    playerPhysics?.setStaticColliderEnabled?.(playerCarColliderOwner,0,enabled);
    return true;
  }
  syncPlayerSedanCollider(true);
  onStatus('Naija City sedan is ready · walk to the driver door and tap INTERACT');

  function setVehicleUi(active) {
    window.__NAIJA_RPG_UI__?.setVehicleMode?.(active, getState());
  }

  function clearInput() {
    accelerateHeld = false;
    brakeHeld = false;
    steerLeftHeld = false;
    steerRightHeld = false;
    throttle = 0;
    brake = false;
  }

  function enter(force = false, playerState = playerController.getState()) {
    if (destroyed || occupied || entering) return false;
    const [px, , pz] = playerState.position;
    const vehiclePosition = vehiclePhysics.getPosition();
    const distance = Math.hypot(px - vehiclePosition[0], pz - vehiclePosition[2]);
    if (!force && distance > 6.5) return false;
    const yawDegrees=vehiclePhysics.getYaw(),yaw=yawDegrees*Math.PI/180;
    // The imported sedan is mirrored 180 degrees, so its authored left/driver
    // door maps to this world-space side vector.
    const driverSideX=-Math.cos(yaw),driverSideZ=Math.sin(yaw);
    const forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw);
    const doorPosition=[vehiclePosition[0]+driverSideX*1.62,0,vehiclePosition[2]+driverSideZ*1.62];
    const seatPosition=[vehiclePosition[0]+driverSideX*.24,0,vehiclePosition[2]-.10];
    // Route around the rear/front corner before approaching the door. A
    // straight diagonal from the spawn point crossed the sedan's rear quarter.
    const longitudinal=pc.math.clamp((px-vehiclePosition[0])*forwardX+(pz-vehiclePosition[2])*forwardZ,-3.15,3.15);
    const sideWaypoint=[vehiclePosition[0]+driverSideX*1.98+forwardX*longitudinal,0,
      vehiclePosition[2]+driverSideZ*1.98+forwardZ*longitudinal];
    const start=[px,0,pz];
    const pathLength=Math.hypot(sideWaypoint[0]-start[0],sideWaypoint[2]-start[2])+
      Math.hypot(doorPosition[0]-sideWaypoint[0],doorPosition[2]-sideWaypoint[2]);
    const approachYaw=Math.atan2(-(doorPosition[0]-sideWaypoint[0]),-(doorPosition[2]-sideWaypoint[2]))*180/Math.PI;
    entering=true;
    entryTransition={phase:'approach',elapsed:0,approachDuration:Math.max(.72,Math.min(2.2,pathLength/3.8)),
      doorDuration:.56,seatDuration:.78,start,sideWaypoint,doorPosition,seatPosition,approachYaw,vehicleYaw:yawDegrees,
      activeAnimation:'Hero01_Run'};
    clearInput();
    playerController.setControlEnabled?.(false);
    // Keep the player body and sedan proxy active while Ara walks around the
    // outside of the car. Release only the sedan proxy once the open door is
    // reached and the seat-entry animation begins.
    playerPhysics?.setPlayerEnabled?.(true);
    syncPlayerSedanCollider(true);
    playerController.setVisible?.(true);
    playerController.playAnimation?.('Hero01_Run',entryTransition.approachDuration);
    if(driverDoor){driverDoorTarget=0;driverDoorCloseDelay=0;}
    setVehicleUi(false);
    onStatus('Approaching the driver door…');
    return true;
  }

  function samplePath(points,progress) {
    const lengths=[];let total=0;
    for(let i=1;i<points.length;i++){
      const length=Math.hypot(points[i][0]-points[i-1][0],points[i][2]-points[i-1][2]);
      lengths.push(length);total+=length;
    }
    let remaining=pc.math.clamp(progress,0,1)*Math.max(.001,total);
    for(let i=0;i<lengths.length;i++){
      if(remaining<=lengths[i]||i===lengths.length-1){
        const a=points[i],b=points[i+1],t=lengths[i]>.001?pc.math.clamp(remaining/lengths[i],0,1):1;
        return a.map((value,index)=>value+(b[index]-value)*t);
      }
      remaining-=lengths[i];
    }
    return points[points.length-1].slice();
  }

  function updateEntry(step) {
    if(!entering||!entryTransition)return false;
    const state=entryTransition;
    state.elapsed+=step;
    const ease=t=>t*t*(3-2*t);
    if(state.phase==='approach'){
      const t=Math.min(1,state.elapsed/state.approachDuration);
      const position=samplePath([state.start,state.sideWaypoint,state.doorPosition],ease(t));
      const travelled=ease(t)*Math.max(.001,Math.hypot(state.sideWaypoint[0]-state.start[0],state.sideWaypoint[2]-state.start[2])+
        Math.hypot(state.doorPosition[0]-state.sideWaypoint[0],state.doorPosition[2]-state.sideWaypoint[2]));
      const firstLength=Math.hypot(state.sideWaypoint[0]-state.start[0],state.sideWaypoint[2]-state.start[2]);
      const nextPoint=travelled<firstLength?state.sideWaypoint:state.doorPosition;
      const faceYaw=Math.atan2(-(nextPoint[0]-position[0]),-(nextPoint[2]-position[2]))*180/Math.PI;
      playerController.setPosition?.(position,faceYaw);
      if(t>=1){state.phase='door';state.elapsed=0;state.activeAnimation='Ara_DoorOpen';
        playerController.setPosition?.(state.doorPosition,state.approachYaw);
        playerController.playAnimation?.('Ara_DoorOpen',state.doorDuration);
        if(driverDoor){driverDoorTarget=74.48;driverDoorCloseDelay=0;}}
      return true;
    }
    if(state.phase==='door'){
      playerController.setPosition?.(state.doorPosition,state.approachYaw);
      if(state.elapsed>=state.doorDuration){
        state.phase='seat';state.elapsed=0;state.activeAnimation='Ara_EnterVehicle';
        syncPlayerSedanCollider(false);
        playerController.playAnimation?.('Ara_EnterVehicle',state.seatDuration);
      }
      return true;
    }
    if(state.phase==='seat'){
      const t=Math.min(1,state.elapsed/state.seatDuration),e=ease(t);
      const position=state.doorPosition.map((value,index)=>value+(state.seatPosition[index]-value)*e);
      playerController.setPosition?.(position,state.vehicleYaw);
      if(t>=1){
        entering=false;entryTransition=null;occupied=true;
        playerPhysics?.setPlayerEnabled?.(false);
        syncPlayerSedanCollider(false);
        playerController.setVisible?.(false);
        audioSystem?.startVehicleEngine?.();audioSystem?.updateVehicleEngine?.(0,.14);
        cameraYaw=vehiclePhysics.getYaw()*Math.PI/180;cameraInitialized=false;
        if(driverDoor){driverDoorTarget=74.48;driverDoorCloseDelay=.58;}
        setVehicleUi(true);
        onStatus('Entered the sedan · steer left/right, hold accelerate or brake');
      }
      return true;
    }
    return true;
  }

  function exit() {
    if (!occupied || destroyed) return false;
    const p=vehiclePhysics.getPosition(),yaw=vehiclePhysics.getYaw(),radians=yaw*Math.PI/180;
    const driverX=-Math.cos(radians),driverZ=Math.sin(radians);
    const driverCandidate=[p[0]+driverX*2.05,p[2]+driverZ*2.05];
    const passengerCandidate=[p[0]-driverX*2.05,p[2]-driverZ*2.05];
    syncPlayerSedanCollider(false);
    const driverBlocked=playerPhysics?.raycast?.([p[0],p[1]+.45,p[2]],[driverCandidate[0],p[1]+.45,driverCandidate[1]]);
    const passengerBlocked=playerPhysics?.raycast?.([p[0],p[1]+.45,p[2]],[passengerCandidate[0],p[1]+.45,passengerCandidate[1]]);
    const useDriver=!driverBlocked||(passengerBlocked&&Math.hypot(driverCandidate[0]-p[0],driverCandidate[1]-p[2])<=Math.hypot(passengerCandidate[0]-p[0],passengerCandidate[1]-p[2]));
    const exitPosition=[useDriver?driverCandidate[0]:passengerCandidate[0],0,useDriver?driverCandidate[1]:passengerCandidate[1]];
    occupied=false;clearInput();audioSystem?.stopVehicleEngine?.();
    playerPhysics?.setPlayerEnabled?.(true);
    playerController.setPosition?.(exitPosition,yaw);
    playerController.setVisible?.(true);
    playerController.setControlEnabled?.(true);
    playerController.playAnimation?.('Ara_ExitVehicle',.72);
    syncPlayerSedanCollider(true);
    if(driverDoor){driverDoorTarget=74.48;driverDoorCloseDelay=.58;}
    setVehicleUi(false);
    playerController.resetCameraAfterVehicle?.();
    onStatus('Exited the sedan');
    return true;
  }

  function toggle(playerState) {
    if(entering)return true;
    return occupied ? exit() : enter(false, playerState);
  }

  function onAccelerateDown(event) {
    event?.preventDefault?.();
    if (event?.pointerId !== undefined) accelerator?.setPointerCapture?.(event.pointerId);
    accelerateHeld = true;
    audioSystem?.unlock?.();
  }
  function onAccelerateUp(event) { event?.preventDefault?.(); accelerateHeld = false; }
  function onBrakeDown(event) { event?.preventDefault?.(); brakeButton?.setPointerCapture?.(event.pointerId); brakeHeld = true; }
  function onBrakeUp(event) { event?.preventDefault?.(); brakeHeld = false; }
  function onSteerLeftDown(event) { event?.preventDefault?.(); steerLeftButton?.setPointerCapture?.(event.pointerId); steerLeftHeld = true; }
  function onSteerLeftUp(event) { event?.preventDefault?.(); steerLeftHeld = false; }
  function onSteerRightDown(event) { event?.preventDefault?.(); steerRightButton?.setPointerCapture?.(event.pointerId); steerRightHeld = true; }
  function onSteerRightUp(event) { event?.preventDefault?.(); steerRightHeld = false; }

  const accelerator = document.getElementById('drive-accelerate');
  const brakeButton = document.getElementById('drive-brake');
  const steerLeftButton = document.getElementById('drive-left');
  const steerRightButton = document.getElementById('drive-right');
  const exitButton = document.getElementById('drive-exit');
  accelerator?.addEventListener('pointerdown', onAccelerateDown);
  accelerator?.addEventListener('pointerup', onAccelerateUp);
  accelerator?.addEventListener('pointercancel', onAccelerateUp);
  accelerator?.addEventListener('lostpointercapture', onAccelerateUp);
  brakeButton?.addEventListener('pointerdown', onBrakeDown);
  brakeButton?.addEventListener('pointerup', onBrakeUp);
  brakeButton?.addEventListener('pointercancel', onBrakeUp);
  brakeButton?.addEventListener('lostpointercapture', onBrakeUp);
  steerLeftButton?.addEventListener('pointerdown',onSteerLeftDown);
  steerLeftButton?.addEventListener('pointerup',onSteerLeftUp);
  steerLeftButton?.addEventListener('pointercancel',onSteerLeftUp);
  steerLeftButton?.addEventListener('lostpointercapture',onSteerLeftUp);
  steerRightButton?.addEventListener('pointerdown',onSteerRightDown);
  steerRightButton?.addEventListener('pointerup',onSteerRightUp);
  steerRightButton?.addEventListener('pointercancel',onSteerRightUp);
  steerRightButton?.addEventListener('lostpointercapture',onSteerRightUp);
  exitButton?.addEventListener('click', exit);

  const onKeyDown = event => { keys[event.key.toLowerCase()] = true; };
  const onKeyUp = event => { keys[event.key.toLowerCase()] = false; };
  const onBlur = () => { Object.keys(keys).forEach(key => keys[key] = false); clearInput(); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const onPointerDown = event => {
    if (!occupied || event.target.closest?.('#rpg-interface, #assets-panel, #perf-panel')) return;
    pointerId = event.pointerId; pointerX = event.clientX; pointerY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if (!occupied || event.pointerId !== pointerId) return;
    const dx = event.clientX - pointerX, dy = event.clientY - pointerY;
    pointerX = event.clientX; pointerY = event.clientY;
    cameraYaw -= dx * .006;
    cameraPitch = pc.math.clamp(cameraPitch + dy * .0035, .04, .48);
  };
  const onPointerUp = event => { if (event.pointerId === pointerId) pointerId = null; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function updateDoor(step) {
    if (!driverDoor) return;
    if (driverDoorCloseDelay > 0) {
      driverDoorCloseDelay = Math.max(0, driverDoorCloseDelay - step);
      if (driverDoorCloseDelay === 0) driverDoorTarget = 0;
    }
    const difference = driverDoorTarget - driverDoorAngle;
    driverDoorAngle += Math.sign(difference) * Math.min(Math.abs(difference), 190 * step);
    driverDoor?.setLocalEulerAngles?.(0, -driverDoorAngle, 0);
    driverWindow?.setLocalEulerAngles?.(0, -driverDoorAngle, 0);
  }

  function update(dt) {
    if (destroyed || !vehiclePhysics) return;
    const step = Math.min(.05, Math.max(0, Number(dt) || 0));
    vehiclePhysics.syncTraffic();
    updateDoor(step);
    if(entering){
      updateEntry(step);
      vehiclePhysics.step(step,{enabled:false,accelerate:false,brake:true,steering:0});
      previousSpeed=vehiclePhysics.getSpeedKmh();
    }else if (occupied) {
      const touchInput = playerController.getControlInput?.() || { x: 0, y: 0 };
      const vehicleControlsMode=window.__NAIJA_RPG_UI__?.getVehicleControlsMode?.()||'two-handed';
      const twoHanded=vehicleControlsMode==='two-handed';
      const steeringSource=debugSteering===null
        ? (twoHanded?(Number(steerRightHeld)-Number(steerLeftHeld)):touchInput.x)
        : debugSteering;
      const steering = pc.math.clamp(steeringSource + (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), -1, 1);
      const accelerate = (twoHanded?accelerateHeld:touchInput.y<-.18) || keys.w || keys.arrowup;
      const braking = (twoHanded?brakeHeld:touchInput.y>.18) || keys.s || keys.arrowdown;
      throttle = accelerate && !braking ? 1 : 0;
      brake = Boolean(braking);
      const wasSpeed = previousSpeed;
      vehiclePhysics.step(step, { enabled: true, accelerate: throttle > 0, brake, steering });
      const speed = vehiclePhysics.getSpeedKmh();
      const absSpeed = Math.abs(speed);
      engineLoad = throttle > 0 ? .62 + .38 * Math.min(1, absSpeed / 55) : .10;
      // Stylized thermal/fuel telemetry for gameplay, not a calibrated engine model.
      const cooling = .018 + Math.min(.075, absSpeed * .00115);
      engineTempC = pc.math.clamp(engineTempC + engineLoad * .40 * step - cooling * step, 35, 145);
      fuelPercent = Math.max(0, fuelPercent - throttle * (.012 + engineLoad * .006) * step);
      audioSystem?.updateVehicleEngine?.(speed, throttle);
      skidClock -= step;
      exhaustClock -= step;
      collisionCooldown = Math.max(0, collisionCooldown - step);
      if (Math.abs(steering) > .58 && absSpeed > 30 && skidClock <= 0) {
        const p = vehiclePhysics.getPosition();
        vfxSystem?.emit?.('skid', [p[0], .08, p[2]], .9, 'asphalt');
        audioSystem?.playVehicleSkid?.();
        skidClock = .8;
      }
      if (exhaustClock <= 0 && throttle > 0) {
        const p = vehiclePhysics.getPosition(), yaw = vehiclePhysics.getYaw() * Math.PI / 180;
        vfxSystem?.emit?.('exhaust', [p[0] + Math.sin(yaw) * 1.45, .42, p[2] + Math.cos(yaw) * 1.45], .65, 'asphalt');
        exhaustClock = .38;
      }
      if (collisionCooldown <= 0 && Math.abs(wasSpeed) - absSpeed > 18) {
        const p = vehiclePhysics.getPosition();
        vfxSystem?.emit?.('collision', [p[0], .8, p[2]], 1, 'metal');
        audioSystem?.playVehicleImpact?.();
        collisionCooldown = 1.25;
      }
      previousSpeed = speed;
      const cameraPosition = vehiclePhysics.getPosition();
      cameraTarget.set(cameraPosition[0], cameraPosition[1] + 1.2, cameraPosition[2]);
      const horizontal = Math.cos(cameraPitch) * cameraDistance;
      desiredCamera.set(
        cameraPosition[0] + Math.sin(cameraYaw) * horizontal,
        cameraPosition[1] + 1.2 + Math.sin(cameraPitch) * cameraDistance + .35,
        cameraPosition[2] + Math.cos(cameraYaw) * horizontal
      );
      const hit = playerPhysics?.raycast?.(
        [cameraTarget.x, cameraTarget.y, cameraTarget.z],
        [desiredCamera.x, desiredCamera.y, desiredCamera.z]
      );
      if (hit) {
        const dx = desiredCamera.x - cameraTarget.x, dy = desiredCamera.y - cameraTarget.y, dz = desiredCamera.z - cameraTarget.z;
        const length = Math.hypot(dx,dy,dz) || 1;
        const safe = Math.max(.9,Math.hypot(hit.point[0]-cameraTarget.x,hit.point[1]-cameraTarget.y,hit.point[2]-cameraTarget.z)-.28);
        const ratio = Math.min(1,safe/length);
        desiredCamera.set(cameraTarget.x+dx*ratio,cameraTarget.y+dy*ratio,cameraTarget.z+dz*ratio);
      }
      if (!cameraInitialized) { smoothedCamera.copy(desiredCamera); cameraInitialized = true; }
      else smoothedCamera.lerp(smoothedCamera, desiredCamera, Math.min(1, step * 8.5));
      camera.setPosition(smoothedCamera);
      camera.lookAt(cameraTarget);
      uiClock -= step;
      if (uiClock <= 0) { uiClock = .12; window.__NAIJA_RPG_UI__?.setVehicleMode?.(true, getState()); }
    } else {
      clearInput();
      syncPlayerSedanCollider(true);
      vehiclePhysics.step(step, { enabled: false, accelerate: false, brake: true, steering: 0 });
      previousSpeed = vehiclePhysics.getSpeedKmh();
    }
  }

  function getState() {
    const speedKmh = vehiclePhysics?.getSpeedKmh?.() || 0;
    const physicsWheelPositions = vehiclePhysics?.getWheelPositions?.() || [];
    const renderedWheelPositions = wheelRoots.map(root => {
      const position = root.getPosition();
      return [position.x, position.y, position.z];
    });
    const wheelAlignmentMaxError = physicsWheelPositions.length === 4 && renderedWheelPositions.length === 4
      ? Math.max(...physicsWheelPositions.map((position, index) =>
          Math.hypot(position[0] - renderedWheelPositions[index][0],
                     position[1] - renderedWheelPositions[index][1],
                     position[2] - renderedWheelPositions[index][2])))
      : null;
    return {
      stage: '10-vehicle',
      occupied,
      entering,
      entryPhase:entryTransition?.phase||null,
      entryAnimation:entryTransition?.activeAnimation||null,
      entryElapsed:Number((entryTransition?.elapsed||0).toFixed(2)),
      entryDuration:entryTransition?Number((entryTransition.approachDuration+entryTransition.doorDuration+entryTransition.seatDuration).toFixed(2)):0,
      vehicleControlsMode:window.__NAIJA_RPG_UI__?.getVehicleControlsMode?.()||'two-handed',
      playerCarColliderReady,
      modelSource,
      modelReady: Boolean(carVisual || wheelRoots.length),
      wheelCount: wheelRoots.length,
      wheelAlignmentMaxError: Number.isFinite(wheelAlignmentMaxError) ? Number(wheelAlignmentMaxError.toFixed(4)) : null,
      modelParts: {
        driverDoor: Boolean(driverDoor),
        driverWindow: Boolean(driverWindow),
        passengerDoor: Boolean(passengerDoor),
        passengerWindow: Boolean(passengerWindow),
        steeringWheel: Boolean(steeringWheel),
        driverDoorAngle: Number(driverDoorAngle.toFixed(1)),
        driverDoorTarget: Number(driverDoorTarget.toFixed(1))
      },
      speedKmh: Number(speedKmh.toFixed(1)),
      physicsSteps: vehiclePhysics?.getStepCount?.() || 0,
      fuelPercent: Number(fuelPercent.toFixed(1)),
      engineTempC: Number(engineTempC.toFixed(1)),
      engineLoad: Number(engineLoad.toFixed(2)),
      position: vehiclePhysics?.getPosition?.() || car.getPosition().toArray(),
      yaw: Number((vehiclePhysics?.getYaw?.() || 0).toFixed(2)),
      environmentColliderCount: vehiclePhysics?.getEnvironmentColliderCount?.() || 0,
      dynamics: vehiclePhysics?.getDynamicsState?.() || null,
      physics: vehiclePhysics ? 'Ammo.js / Bullet rigid-body + raycast wheels' : 'unavailable'
    };
  }

  function destroy() {
    if (destroyed) return;
    if (occupied || entering) {
      playerPhysics?.setPlayerEnabled?.(true);
      playerController.setVisible?.(true);
      playerController.setControlEnabled?.(true);
      occupied = false; entering = false; entryTransition = null;
      syncPlayerSedanCollider(true);
    }
    destroyed = true;
    clearInput();
    audioSystem?.stopVehicleEngine?.();
    accelerator?.removeEventListener('pointerdown', onAccelerateDown);
    accelerator?.removeEventListener('pointerup', onAccelerateUp);
    accelerator?.removeEventListener('pointercancel', onAccelerateUp);
    accelerator?.removeEventListener('lostpointercapture', onAccelerateUp);
    brakeButton?.removeEventListener('pointerdown', onBrakeDown);
    brakeButton?.removeEventListener('pointerup', onBrakeUp);
    brakeButton?.removeEventListener('pointercancel', onBrakeUp);
    brakeButton?.removeEventListener('lostpointercapture', onBrakeUp);
    steerLeftButton?.removeEventListener('pointerdown',onSteerLeftDown);
    steerLeftButton?.removeEventListener('pointerup',onSteerLeftUp);
    steerLeftButton?.removeEventListener('pointercancel',onSteerLeftUp);
    steerLeftButton?.removeEventListener('lostpointercapture',onSteerLeftUp);
    steerRightButton?.removeEventListener('pointerdown',onSteerRightDown);
    steerRightButton?.removeEventListener('pointerup',onSteerRightUp);
    steerRightButton?.removeEventListener('pointercancel',onSteerRightUp);
    steerRightButton?.removeEventListener('lostpointercapture',onSteerRightUp);
    exitButton?.removeEventListener('click', exit);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    vehiclePhysics?.cleanup?.();
    playerPhysics?.removeStaticColliders?.(playerCarColliderOwner);
    car.destroy();
    carAsset?.unload?.();
  }

  return {
    car, enter, exit, toggle, update, destroy,
    addStaticColliders: (items, ownerId) => vehiclePhysics?.addStaticColliders?.(items, ownerId) || 0,
    removeStaticColliders: ownerId => vehiclePhysics?.removeStaticColliders?.(ownerId) || 0,
    debugSetPositionForSmoke: (position, yaw) => vehiclePhysics?.setPositionForSmoke?.(position, yaw) || false,
    getState,
    debugEnter: () => enter(true),
    debugExit: exit,
    debugSetInput: (steering = 0, accelerate = false, brakeInput = false) => {
      accelerateHeld = Boolean(accelerate); brakeHeld = Boolean(brakeInput);
      const input = Math.max(-1,Math.min(1,Number(steering)||0));
      debugSteering = input;
      return getState();
    },
    debugClearInput: () => { debugSteering=null; accelerateHeld=false; brakeHeld=false; steerLeftHeld=false; steerRightHeld=false; return getState(); }
  };
}
