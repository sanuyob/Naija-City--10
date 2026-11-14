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

export async function createVehiclePhysics(car, traffic, wheelRoots) {
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
  const groundShape = own(new Ammo.btBoxShape(vector(100, 0.1, 100)));
  const ground = addBody({ shape: groundShape, mass: 0, position: { x: 0, y: -0.1, z: -18 }, friction: 1.0 });

  // The chassis is a single compound-sized box, not the detailed render mesh.
  // This is the recommended mobile-friendly separation of render and collision geometry.
  const chassisShape = own(new Ammo.btBoxShape(vector(0.9, 0.34, 1.75)));
  const chassis = addBody({ shape: chassisShape, mass: 820, position: { x: 0, y: 0.94, z: 8 }, yaw: 180, friction: 0.85 });
  chassis.body.setDamping(0.025, 0.12);
  chassis.body.setActivationState(4);

  const tuning = own(new Ammo.btVehicleTuning());
  const raycaster = own(new Ammo.btDefaultVehicleRaycaster(world));
  const vehicle = own(new Ammo.btRaycastVehicle(tuning, chassis.body, raycaster));
  vehicle.setCoordinateSystem(0, 1, 2);
  world.addAction(vehicle);

  // Bullet retains these vectors through each wheel's lifetime. Keep a unique
  // set per wheel; do not free or share the vectors before the vehicle is removed.
  const wheelDefinitions = [
    { x: -0.79, y: -0.10, z: 1.16, front: true },
    { x:  0.79, y: -0.10, z: 1.16, front: true },
    { x: -0.79, y: -0.10, z: -1.16, front: false },
    { x:  0.79, y: -0.10, z: -1.16, front: false }
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

  function step(dt, controls) {
    const speed = vehicle.getCurrentSpeedKmHour();
    const accelerating = controls.accelerate;
    const braking = controls.brake;
    const steering = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    let engineForce = 0;
    let brakeForce = 0;
    if (accelerating && Math.abs(speed) < 115) engineForce = speed < -2 ? 0 : 2100;
    if (braking) {
      if (speed > 2) brakeForce = 2600;
      else if (speed < -2) brakeForce = 2200;
      else engineForce = -1050;
    }
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);
    for (let i = 0; i < 4; i++) vehicle.setBrake(brakeForce, i);
    const steerLimit = 0.42 * Math.max(0.28, 1 - Math.abs(speed) / 170);
    const steerAngle = steering * steerLimit * (speed < -1 ? -1 : 1);
    vehicle.setSteeringValue(steerAngle, 0);
    vehicle.setSteeringValue(steerAngle, 1);
    world.stepSimulation(Math.min(dt, 0.05), 4, 1 / 60);
    syncPlayer();
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
    getSpeedKmh: () => vehicle.getCurrentSpeedKmHour(),
    cleanup,
    vehicle,
    world,
    trafficBodies
  };
}
