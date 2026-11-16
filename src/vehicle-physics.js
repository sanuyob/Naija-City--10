import * as pc from 'playcanvas';

// Ammo is fetched only when the driving scene starts. The initial HTML shell and
// PlayCanvas renderer stay separate from this several-hundred-kilobyte module.
const BASE = import.meta.env.BASE_URL || '/';
const localAmmo = file => new URL(`${BASE}assets/wasm/ammo/${file}`, window.location.origin).href;
const AMMO_ASSETS = {
  glueUrl: localAmmo('ammo.wasm.js'),
  wasmUrl: localAmmo('ammo.wasm.wasm'),
  fallbackUrl: localAmmo('ammo.js')
};

export async function loadAmmo() {
  pc.WasmModule.setConfig('Ammo', AMMO_ASSETS);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Ammo physics module timed out while loading. Check your connection and reload.')), 25000);
    pc.WasmModule.getInstance('Ammo', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  const Ammo = globalThis.Ammo;
  if (!Ammo?.btDiscreteDynamicsWorld || !Ammo?.btRaycastVehicle) {
    throw new Error('Ammo loaded, but the required Bullet vehicle APIs are unavailable.');
  }
  return Ammo;
}

export async function createVehiclePhysics(car, traffic = [], wheelRoots = [], options = {}) {
  const Ammo = await loadAmmo();
  const owned = [];
  const own = value => { owned.push(value); return value; };
  const vector = (x, y, z) => own(new Ammo.btVector3(x, y, z));
  const transform = (x, y, z, yaw = 0) => {
    const t = own(new Ammo.btTransform());
    t.setIdentity();
    t.setOrigin(vector(x, y, z));
    const half = yaw * Math.PI / 360;
    t.setRotation(own(new Ammo.btQuaternion(0, Math.sin(half), 0, Math.cos(half))));
    return t;
  };

  const collisionConfig = own(new Ammo.btDefaultCollisionConfiguration());
  const dispatcher = own(new Ammo.btCollisionDispatcher(collisionConfig));
  const broadphase = own(new Ammo.btDbvtBroadphase());
  const solver = own(new Ammo.btSequentialImpulseConstraintSolver());
  const world = own(new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig));
  world.setGravity(vector(0, -9.81, 0));

  function addBody({ shape, mass, position, yaw = 0, kinematic = false, friction = 0.8 }) {
    const start = transform(position.x, position.y, position.z, yaw);
    const motionState = own(new Ammo.btDefaultMotionState(start));
    const inertia = vector(0, 0, 0);
    if (mass > 0) shape.calculateLocalInertia(mass, inertia);
    const info = own(new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, inertia));
    const body = own(new Ammo.btRigidBody(info));
    body.setFriction(friction);
    if (kinematic) {
      body.setCollisionFlags(body.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
      body.setActivationState(4); // DISABLE_DEACTIVATION
    }
    world.addRigidBody(body);
    return { body, shape, motionState, kinematic, transform: own(new Ammo.btTransform()), origin: vector(position.x, position.y, position.z), rotation: own(new Ammo.btQuaternion(0, 0, 0, 1)) };
  }

  // A simple low-poly collision floor is deliberately cheaper than colliding
  // against every visible road and pavement primitive.
  const groundShape = own(new Ammo.btBoxShape(vector(100, 0.1, 310)));
  const ground = addBody({ shape: groundShape, mass: 0, position: { x: 0, y: -0.1, z: 135 }, friction: 1.0 });

  // The chassis is a single compound-sized box, not the detailed render mesh.
  // This is the recommended mobile-friendly separation of render and collision geometry.
  const chassisShape = own(new Ammo.btBoxShape(vector(1.04, 0.60, 2.42)));
  const initialPosition = options.position || { x: 0, y: 0.94, z: 8 };
  const initialYaw = Number.isFinite(options.yaw) ? options.yaw : 180;
  const chassis = addBody({ shape: chassisShape, mass: 820, position: initialPosition, yaw: initialYaw, friction: 0.85 });
  chassis.body.setDamping(0.025, 0.18);
  // A player sedan should steer around world-up, not roll or pitch like a
  // loose box. Bullet's angular factor locks X/Z while preserving yaw.
  const uprightAngularFactor = vector(0, 1, 0);
  chassis.body.setAngularFactor(uprightAngularFactor);
  chassis.body.setActivationState(4);
  chassis.body.setCcdMotionThreshold?.(0.5);
  chassis.body.setCcdSweptSphereRadius?.(0.62);

  const tuning = own(new Ammo.btVehicleTuning());
  const raycaster = own(new Ammo.btDefaultVehicleRaycaster(world));
  const vehicle = own(new Ammo.btRaycastVehicle(tuning, chassis.body, raycaster));
  const driveForceVector = vector(0,0,0);
  const lateralForceVector = vector(0,0,0);
  const steeringTorqueVector = vector(0,0,0);
  let controlledSpeedMps = 0;
  let simulationSteps = 0;
  vehicle.setCoordinateSystem(0, 1, 2);
  world.addAction(vehicle);

  // Bullet retains these vectors through each wheel's lifetime. Keep a unique
  // set per wheel; do not free or share the vectors before the vehicle is removed.
  const wheelDefinitions = [
    { x: -0.912, y: -0.10, z: -1.662, front: true },
    { x:  0.912, y: -0.10, z: -1.662, front: true },
    { x: -0.912, y: -0.10, z:  1.662, front: false },
    { x:  0.912, y: -0.10, z:  1.662, front: false }
  ];
  wheelDefinitions.forEach((wheel, index) => {
    const connection = vector(wheel.x, wheel.y, wheel.z);
    const direction = vector(0, -1, 0);
    const axle = vector(-1, 0, 0);
    const info = vehicle.addWheel(connection, direction, axle, 0.36, 0.42, tuning, wheel.front);
    info.set_m_suspensionStiffness(25);
    info.set_m_wheelsDampingRelaxation(2.3);
    info.set_m_wheelsDampingCompression(4.4);
    info.set_m_frictionSlip(4.6);
    info.set_m_rollInfluence(0.12);
  });

  // Scripted traffic remains AI-driven, but now each car has a kinematic Bullet
  // collider. The player chassis can physically collide with it and lose momentum.
  // Compact static collision proxies let the car hit real buildings and street
  // infrastructure without asking Bullet to collide with every visual mesh.
  const environmentBodies = [];
  const environmentOwners = new Map();
  const addEnvironmentBox = (position, halfExtents, rotationY = 0, ownerId = 'initial') => {
    const allocationStart = owned.length;
    const shape = own(new Ammo.btBoxShape(vector(
      Math.max(.04, halfExtents[0]), Math.max(.04, halfExtents[1]), Math.max(.04, halfExtents[2])
    )));
    const record = addBody({ shape, mass: 0, position: { x: position[0], y: position[1], z: position[2] }, yaw: rotationY, friction: .88 });
    record.resources = owned.slice(allocationStart);
    record.ownerId = ownerId;
    environmentBodies.push(record);
    return record;
  };
  for (const item of (options.colliders || [])) {
    let position, halfExtents, rotationY = Number(item?.rotationY) || 0;
    if (Array.isArray(item?.position) && Array.isArray(item?.halfExtents)) {
      position = item.position; halfExtents = item.halfExtents;
    } else {
      const p = item?.entity?.getPosition?.(), s = item?.entity?.getLocalScale?.();
      if (!p || !s) continue;
      position = [p.x,p.y,p.z];
      halfExtents = [Math.abs(s.x)/2,Math.abs(s.y)/2,Math.abs(s.z)/2];
      rotationY = item?.entity?.getEulerAngles?.().y || rotationY;
    }
    if (!position || !halfExtents || halfExtents[1] < 0.18) continue;
    addEnvironmentBox(position, halfExtents, rotationY, 'initial');
  }

  function addStaticColliders(items = [], ownerId = 'dynamic-world') {
    if (!ownerId || !Array.isArray(items)) return 0;
    if (environmentOwners.has(ownerId)) return environmentOwners.get(ownerId).length;
    const records = [];
    for (const item of items) {
      const position = item?.position;
      const halfExtents = item?.halfExtents;
      if (!Array.isArray(position) || !Array.isArray(halfExtents) || position.length < 3 || halfExtents.length < 3) continue;
      if (![...position, ...halfExtents].every(Number.isFinite)) continue;
      if (Math.abs(halfExtents[1]) < 0.18) continue;
      const record = addEnvironmentBox(position, halfExtents, Number(item.rotationY) || 0, ownerId);
      records.push(record);
    }
    environmentOwners.set(ownerId, records);
    return records.length;
  }

  function removeStaticColliders(ownerId) {
    const records = environmentOwners.get(ownerId);
    if (!records) return 0;
    let removed = 0;
    for (const record of records) {
      try { world.removeRigidBody(record.body); } catch {}
      for (let i = (record.resources || []).length - 1; i >= 0; i--) {
        const resource = record.resources[i];
        const ownedIndex = owned.indexOf(resource);
        if (ownedIndex >= 0) owned.splice(ownedIndex, 1);
        try { Ammo.destroy(resource); } catch {}
      }
      const index = environmentBodies.indexOf(record);
      if (index >= 0) environmentBodies.splice(index, 1);
      removed++;
    }
    environmentOwners.delete(ownerId);
    return removed;
  }

  const trafficBodies = traffic.map(item => {
    const shape = own(new Ammo.btBoxShape(vector(0.86, 0.55, 1.62)));
    const p = item.entity.getPosition();
    return { item, ...addBody({
      shape, mass: 0, kinematic: true,
      position: { x: p.x, y: 0.88, z: p.z },
      yaw: item.entity.getEulerAngles().y,
      friction: 0.7
    }) };
  });

  const updateKinematic = record => {
    const p = record.item.entity.getPosition();
    const yaw = record.item.entity.getEulerAngles().y;
    const half = yaw * Math.PI / 360;
    record.transform.setIdentity();
    record.origin.setValue(p.x, 0.88, p.z);
    record.rotation.setValue(0, Math.sin(half), 0, Math.cos(half));
    record.transform.setOrigin(record.origin);
    record.transform.setRotation(record.rotation);
    record.body.setWorldTransform(record.transform);
    record.motionState.setWorldTransform(record.transform);
    world.updateSingleAabb(record.body);
  };

  function syncPlayer() {
    const t = chassis.body.getWorldTransform();
    const p = t.getOrigin(), q = t.getRotation();
    car.setPosition(p.x(), p.y(), p.z());
    car.setRotation(new pc.Quat(q.x(), q.y(), q.z(), q.w()));
    for (let i = 0; i < 4; i++) {
      vehicle.updateWheelTransform(i, true);
      const wt = vehicle.getWheelTransformWS(i);
      const wp = wt.getOrigin(), wq = wt.getRotation();
      wheelRoots[i].setPosition(wp.x(), wp.y(), wp.z());
      wheelRoots[i].setRotation(new pc.Quat(wq.x(), wq.y(), wq.z(), wq.w()));
    }
  }

  function setPositionForSmoke(position, yaw = 0) {
    if (!Array.isArray(position) || position.length < 3 || !position.slice(0, 3).every(Number.isFinite)) return false;
    const angle = (Number(yaw) || 0) * Math.PI / 360;
    chassis.origin.setValue(position[0], position[1], position[2]);
    chassis.rotation.setValue(0, Math.sin(angle), 0, Math.cos(angle));
    chassis.transform.setIdentity();
    chassis.transform.setOrigin(chassis.origin);
    chassis.transform.setRotation(chassis.rotation);
    chassis.body.setWorldTransform(chassis.transform);
    chassis.motionState.setWorldTransform(chassis.transform);
    driveForceVector.setValue(0, 0, 0);
    lateralForceVector.setValue(0, 0, 0);
    steeringTorqueVector.setValue(0, 0, 0);
    chassis.body.setLinearVelocity(driveForceVector);
    chassis.body.setAngularVelocity(steeringTorqueVector);
    chassis.body.clearForces();
    chassis.body.activate(true);
    controlledSpeedMps = 0;
    world.updateSingleAabb(chassis.body);
    vehicle.resetSuspension?.();
    syncPlayer();
    return true;
  }

  function step(dt, controls) {
    const h=Math.max(0,Math.min(.05,Number(dt)||0));
    if(!h)return;
    const transform=chassis.body.getWorldTransform();
    const rotation=transform.getRotation();
    const forwardX=-2*(rotation.x()*rotation.z()+rotation.w()*rotation.y());
    const forwardZ=-(1-2*(rotation.x()*rotation.x()+rotation.y()*rotation.y()));
    const forwardLength=Math.hypot(forwardX,forwardZ)||1;
    const fx=forwardX/forwardLength,fz=forwardZ/forwardLength;
    const linear=chassis.body.getLinearVelocity();
    const actualForwardSpeed=linear.x()*fx+linear.z()*fz;
    // Use post-collision rigid-body velocity as the next frame's speed. This
    // lets wall/vehicle impacts naturally slow the car without fake teleporting.
    if(Math.abs(actualForwardSpeed)<Math.abs(controlledSpeedMps)+1.5 || Math.abs(controlledSpeedMps)<.25) {
      controlledSpeedMps=actualForwardSpeed;
    }
    const accelerating=Boolean(controls.accelerate),braking=Boolean(controls.brake);
    const steeringInput=Math.max(-1,Math.min(1,Number(controls.steering)||0));
    if(controls.enabled===false) {
      controlledSpeedMps=approach(controlledSpeedMps,0,12*h);
    } else if(accelerating&&!braking) {
      if(controlledSpeedMps<-.4) controlledSpeedMps=approach(controlledSpeedMps,0,10*h);
      else controlledSpeedMps=Math.min(23.6,controlledSpeedMps+10.5*h);
    } else if(braking) {
      if(controlledSpeedMps>.3) controlledSpeedMps=Math.max(0,controlledSpeedMps-13*h);
      else controlledSpeedMps=Math.max(-5.5,controlledSpeedMps-4.2*h);
    } else {
      controlledSpeedMps=approach(controlledSpeedMps,0,(.7+Math.abs(controlledSpeedMps)*.10)*h);
    }

    // Vehicle dynamics: v = v + a*dt, yaw-rate follows steering and speed.
    // The Bullet rigid body still resolves chassis impacts against city proxies.
    const speedSign=controlledSpeedMps<-.05?-1:1;
    const yawRate=-steeringInput*Math.min(.82,.045+Math.abs(controlledSpeedMps)*.045)*speedSign;
    // setAngularVelocity expects radians/second. Multiplying this by chassis
    // mass (820 kg) was the source of the violent spin/tumble on throttle.
    steeringTorqueVector.setValue(0,yawRate,0);
    chassis.body.setAngularVelocity(steeringTorqueVector);
    driveForceVector.setValue(fx*controlledSpeedMps,linear.y(),fz*controlledSpeedMps);
    chassis.body.setLinearVelocity(driveForceVector);
    chassis.body.activate(true);

    const speedKmh=Math.abs(controlledSpeedMps*3.6);
    const steerAngle=-steeringInput*.52*Math.max(.42,1-speedKmh/130);
    vehicle.setSteeringValue(steerAngle,0);
    vehicle.setSteeringValue(steerAngle,1);
    vehicle.applyEngineForce(0,2);
    vehicle.applyEngineForce(0,3);
    const parkBrake=braking&&Math.abs(controlledSpeedMps)>.4?900:0;
    for(let i=0;i<4;i++)vehicle.setBrake(parkBrake,i);
    world.stepSimulation(h,4,1/60);
    simulationSteps++;
    const postTransform=chassis.body.getWorldTransform();
    const postRotation=postTransform.getRotation();
    const postForwardX=-2*(postRotation.x()*postRotation.z()+postRotation.w()*postRotation.y());
    const postForwardZ=-(1-2*(postRotation.x()*postRotation.x()+postRotation.y()*postRotation.y()));
    const postLength=Math.hypot(postForwardX,postForwardZ)||1;
    const postVelocity=chassis.body.getLinearVelocity();
    const postSpeed=postVelocity.x()*postForwardX/postLength+postVelocity.z()*postForwardZ/postLength;
    controlledSpeedMps=postSpeed;
    syncPlayer();
  }

  function approach(value,target,delta) {
    if(value<target)return Math.min(target,value+delta);
    return Math.max(target,value-delta);
  }

  function syncTraffic() {
    for (const record of trafficBodies) updateKinematic(record);
  }

  function cleanup() {
    try { world.removeAction(vehicle); } catch {}
    for (const record of trafficBodies) {
      try { world.removeRigidBody(record.body); } catch {}
    }
    try { world.removeRigidBody(chassis.body); } catch {}
    try { world.removeRigidBody(ground.body); } catch {}
    for (const record of environmentBodies) { try { world.removeRigidBody(record.body); } catch {} }
    // Destroy in reverse allocation order after detaching everything from Bullet.
    for (let i = owned.length - 1; i >= 0; i--) {
      try { Ammo.destroy(owned[i]); } catch {}
    }
  }

  syncPlayer();
  syncTraffic();
  return {
    step,
    syncTraffic,
    syncPlayer,
    getSpeedKmh: () => controlledSpeedMps*3.6,
    getStepCount: () => simulationSteps,
    getPosition: () => { const p=car.getPosition(); return [p.x,p.y,p.z]; },
    getYaw: () => {
      const q=chassis.body.getWorldTransform().getRotation();
      return Math.atan2(2*(q.w()*q.y()+q.x()*q.z()),1-2*(q.y()*q.y()+q.x()*q.x()))*180/Math.PI;
    },
    getEnvironmentColliderCount: () => environmentBodies.length,
    addStaticColliders,
    removeStaticColliders,
    setPositionForSmoke,
    getWheelPositions: () => {
      const positions = [];
      for (let i = 0; i < 4; i++) {
        vehicle.updateWheelTransform(i, true);
        const origin = vehicle.getWheelTransformWS(i).getOrigin();
        positions.push([origin.x(), origin.y(), origin.z()]);
      }
      return positions;
    },
    getDynamicsState: () => {
      const velocity = chassis.body.getLinearVelocity();
      const angularVelocity=chassis.body.getAngularVelocity();
      const orientation=chassis.body.getWorldTransform().getRotation();
      const qx=orientation.x(),qy=orientation.y(),qz=orientation.z(),qw=orientation.w();
      // Measure upright tilt from the transformed local up axis; Euler roll
      // is ambiguous at a 180-degree yaw and falsely reports 180° for upright cars.
      const uprightTilt=Math.acos(Math.max(-1,Math.min(1,1-2*(qx*qx+qz*qz))))*180/Math.PI;
      // In this Y-up scene, heading is rotation about Y. Measure nose-up/down
      // from the car's local forward axis, not the yaw quaternion component.
      const forwardY=2*(qw*qx-qy*qz);
      const pitch=Math.asin(Math.max(-1,Math.min(1,forwardY)))*180/Math.PI;
      const forward=[-2*(qx*qz+qw*qy),0,-(1-2*(qx*qx+qy*qy))];
      const wheels = [];
      for (let i=0;i<4;i++) {
        try {
          const info=vehicle.getWheelInfo(i);
          const ray=info.get_m_raycastInfo?.();
          const wheelTransform=vehicle.getWheelTransformWS(i);
          const wheelOrigin=wheelTransform.getOrigin();
          const probeFrom=vector(wheelOrigin.x(),wheelOrigin.y()+.5,wheelOrigin.z());
          const probeTo=vector(wheelOrigin.x(),wheelOrigin.y()-1.4,wheelOrigin.z());
          const callback=own(new Ammo.ClosestRayResultCallback(probeFrom,probeTo));
          world.rayTest(probeFrom,probeTo,callback);
          const rayHit=callback.hasHit()?callback.get_m_hitPointWorld():null;
          const result={
            inContact: ray?.get_m_isInContact?.() ?? ray?.m_isInContact ?? null,
            suspensionLength: info.get_m_raycastInfo?.()?.get_m_suspensionLength?.() ?? info.get_m_suspensionLength?.() ?? null,
            engineForce: info.get_m_engineForce?.() ?? null,
            rotation: info.get_m_rotation?.() ?? null,
            wheelPosition:[wheelOrigin.x(),wheelOrigin.y(),wheelOrigin.z()],
            groundRayHit:Boolean(rayHit),
            contactMeasured:Boolean(rayHit && rayHit.y() < wheelOrigin.y() + .1 && rayHit.y() > wheelOrigin.y()-1.4),
            groundRayY:rayHit?rayHit.y():null
          };
          Ammo.destroy(callback);Ammo.destroy(probeFrom);Ammo.destroy(probeTo);
          owned.splice(owned.indexOf(callback),1);owned.splice(owned.indexOf(probeFrom),1);owned.splice(owned.indexOf(probeTo),1);
          wheels.push(result);
        } catch { wheels.push({inContact:null,suspensionLength:null,groundRayHit:false}); }
      }
      return {velocity:[velocity.x(),velocity.y(),velocity.z()],angularVelocity:[angularVelocity.x(),angularVelocity.y(),angularVelocity.z()],orientation:[qx,qy,qz,qw],uprightTiltDegrees:uprightTilt,pitchDegrees:pitch,forward,simulationSteps,wheels,measuredWheelContacts:wheels.filter(w=>w.contactMeasured).length};
    },
    cleanup,
    vehicle,
    world,
    trafficBodies
  };
}
