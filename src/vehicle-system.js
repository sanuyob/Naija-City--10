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
  let accelerateHeld = false;
  let brakeHeld = false;
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
  onStatus('Naija City sedan is ready · walk close and tap INTERACT to enter');

  function setVehicleUi(active) {
    window.__NAIJA_RPG_UI__?.setVehicleMode?.(active, getState());
  }

  function clearInput() {
    accelerateHeld = false;
    brakeHeld = false;
    throttle = 0;
    brake = false;
  }

  function enter(force = false, playerState = playerController.getState()) {
    if (destroyed || occupied) return false;
    const [px, , pz] = playerState.position;
    const p = vehiclePhysics.getPosition();
    const distance = Math.hypot(px - p[0], pz - p[2]);
    if (!force && distance > 6.5) return false;
    occupied = true;
    clearInput();
    playerController.setControlEnabled?.(false);
    playerPhysics?.setPlayerEnabled?.(false);
    playerController.setVisible?.(false);
    audioSystem?.startVehicleEngine?.();
    audioSystem?.updateVehicleEngine?.(0, .14);
    cameraYaw = vehiclePhysics.getYaw() * Math.PI / 180;
    cameraInitialized = false;
    if (driverDoor) {
      driverDoorTarget = 74.48;
      driverDoorCloseDelay = .72;
    }
    setVehicleUi(true);
    onStatus('Entered the sedan · use the left stick to steer');
    return true;
  }

  function exit() {
    if (!occupied || destroyed) return false;
    const p = vehiclePhysics.getPosition();
    const yaw = vehiclePhysics.getYaw();
    const radians = yaw * Math.PI / 180;
    const rightX = Math.cos(radians);
    const rightZ = -Math.sin(radians);
    const rightCandidate=[p[0]+rightX*2.05,p[2]+rightZ*2.05];
    const leftCandidate=[p[0]-rightX*2.05,p[2]-rightZ*2.05];
    const rightBlocked=playerPhysics?.raycast?.([p[0],p[1]+.45,p[2]],[rightCandidate[0],p[1]+.45,rightCandidate[1]]);
    const leftBlocked=playerPhysics?.raycast?.([p[0],p[1]+.45,p[2]],[leftCandidate[0],p[1]+.45,leftCandidate[1]]);
    const useRight=!rightBlocked||(leftBlocked&&rightBlocked);
    const exitPosition = [useRight?rightCandidate[0]:leftCandidate[0], 0, useRight?rightCandidate[1]:leftCandidate[1]];
    clearInput();
    occupied = false;
    if (driverDoor) {
      driverDoorTarget = 74.48;
      driverDoorCloseDelay = .82;
    }
    audioSystem?.stopVehicleEngine?.();
    playerPhysics?.setPlayerEnabled?.(true);
    playerController.setPosition?.(exitPosition, yaw);
    playerController.setVisible?.(true);
    playerController.setControlEnabled?.(true);
    playerController.resetCameraAfterVehicle?.();
    setVehicleUi(false);
    onStatus('Exited the sedan');
    return true;
  }

  function toggle(playerState) {
    return occupied ? exit() : enter(false, playerState);
  }

  function onAccelerateDown(event) {
    event?.preventDefault?.();
    if (event?.pointerId !== undefined) accelerator?.setPointerCapture?.(event.pointerId);
    accelerateHeld = true;
    audioSystem?.unlock?.();
  }
  function onAccelerateUp(event) { event?.preventDefault?.(); accelerateHeld = false; }
  function onBrakeDown(event) { event?.preventDefault?.(); brakeHeld = true; }
  function onBrakeUp(event) { event?.preventDefault?.(); brakeHeld = false; }

  const accelerator = document.getElementById('drive-accelerate');
  const brakeButton = document.getElementById('drive-brake');
  const exitButton = document.getElementById('drive-exit');
  accelerator?.addEventListener('pointerdown', onAccelerateDown);
  accelerator?.addEventListener('pointerup', onAccelerateUp);
  accelerator?.addEventListener('pointercancel', onAccelerateUp);
  accelerator?.addEventListener('lostpointercapture', onAccelerateUp);
  brakeButton?.addEventListener('pointerdown', onBrakeDown);
  brakeButton?.addEventListener('pointerup', onBrakeUp);
  brakeButton?.addEventListener('pointercancel', onBrakeUp);
  brakeButton?.addEventListener('lostpointercapture', onBrakeUp);
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
    if (occupied) {
      const touchInput = playerController.getControlInput?.() || { x: 0, y: 0 };
      const steering = pc.math.clamp((debugSteering === null ? touchInput.x : debugSteering) + (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), -1, 1);
      const accelerate = accelerateHeld || keys.w || keys.arrowup;
      const braking = brakeHeld || keys.s || keys.arrowdown;
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
    if (occupied) {
      playerPhysics?.setPlayerEnabled?.(true);
      playerController.setVisible?.(true);
      playerController.setControlEnabled?.(true);
      occupied = false;
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
    exitButton?.removeEventListener('click', exit);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    vehiclePhysics?.cleanup?.();
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
    }
  };
}
