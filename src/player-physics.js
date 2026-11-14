import { loadAmmo } from './vehicle-physics.js';

/**
 * Bullet-backed player capsule. Visible character geometry is separate from
 * the collision body. The lighter kinematic solver remains available to crowds.
 */
export async function createPlayerPhysics({ colliders = [], groundY = 0, gravity = 18 } = {}) {
  const Ammo = await loadAmmo();
  const owned = [];
  const own = value => { owned.push(value); return value; };
  const vector = (x, y, z) => own(new Ammo.btVector3(x, y, z));
  const halfHeight = 0.9;
  const radius = 0.31;
  const worldConfig = own(new Ammo.btDefaultCollisionConfiguration());
  const dispatcher = own(new Ammo.btCollisionDispatcher(worldConfig));
  const broadphase = own(new Ammo.btDbvtBroadphase());
  const solver = own(new Ammo.btSequentialImpulseConstraintSolver());
  const world = own(new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, worldConfig));
  world.setGravity(vector(0, -gravity, 0));

  function addStaticBox(position, halfExtents, friction = 0.82) {
    const shape = own(new Ammo.btBoxShape(vector(
      Math.max(0.04, halfExtents[0]),
      Math.max(0.04, halfExtents[1]),
      Math.max(0.04, halfExtents[2])
    )));
    const start = own(new Ammo.btTransform());
    start.setIdentity();
    start.setOrigin(vector(position[0], position[1], position[2]));
    const motion = own(new Ammo.btDefaultMotionState(start));
    const inertia = vector(0, 0, 0);
    const info = own(new Ammo.btRigidBodyConstructionInfo(0, motion, shape, inertia));
    const body = own(new Ammo.btRigidBody(info));
    body.setFriction(friction);
    world.addRigidBody(body);
    return body;
  }

  // One continuous collision floor covers the Yaba/Ikeja prototype bounds.
  addStaticBox([0, groundY - 0.20, 105], [60, 0.20, 320], 1.0);

  const colliderBodies = [];
  const colliderEnabled = [];
  for (const item of colliders) {
    const entity = item?.entity;
    const p = entity?.getPosition?.();
    const s = entity?.getLocalScale?.();
    if (!p || !s) continue;
    colliderBodies.push(addStaticBox(
      [p.x, p.y, p.z],
      [Math.abs(s.x) / 2, Math.abs(s.y) / 2, Math.abs(s.z) / 2]
    ));
    colliderEnabled.push(true);
  }

  const capsule = own(new Ammo.btCapsuleShape(radius, Math.max(0.1, halfHeight * 2 - radius * 2)));
  const actorStart = own(new Ammo.btTransform());
  actorStart.setIdentity();
  actorStart.setOrigin(vector(0, groundY + halfHeight, 0));
  const actorMotion = own(new Ammo.btDefaultMotionState(actorStart));
  const inertia = vector(0, 0, 0);
  const mass = 72;
  capsule.calculateLocalInertia(mass, inertia);
  const bodyInfo = own(new Ammo.btRigidBodyConstructionInfo(mass, actorMotion, capsule, inertia));
  const body = own(new Ammo.btRigidBody(bodyInfo));
  body.setFriction(0.24);
  body.setRestitution(0);
  body.setDamping(0.02, 0.04);
  body.setAngularFactor(vector(0, 0, 0));
  body.setActivationState(4);
  world.addRigidBody(body);

  const scratchVelocity = vector(0, 0, 0);
  const scratchTransform = own(new Ammo.btTransform());
  const scratchOrigin = vector(0, 0, 0);
  let steps = 0;
  let collisions = 0;

  function teleport(position, velocity = [0, 0, 0]) {
    scratchTransform.setIdentity();
    scratchOrigin.setValue(position[0], position[1] + halfHeight, position[2]);
    scratchTransform.setOrigin(scratchOrigin);
    body.setWorldTransform(scratchTransform);
    actorMotion.setWorldTransform(scratchTransform);
    scratchVelocity.setValue(velocity[0] || 0, velocity[1] || 0, velocity[2] || 0);
    body.setLinearVelocity(scratchVelocity);
    body.clearForces();
    body.activate(true);
    world.updateSingleAabb(body);
  }

  function step(actor, desired = [0, 0, 0], dt = 1 / 60) {
    if (!actor || !Array.isArray(actor.position)) return null;
    const h = Math.max(0, Math.min(0.05, Number(dt) || 0));
    if (!h) return actor.position;
    const currentVelocity = body.getLinearVelocity();
    const blend = actor.traversing ? 1 : 1 - Math.exp(-(actor.grounded === false ? 7.5 : 17) * h);
    const vx = currentVelocity.x() + ((Number(desired[0]) || 0) - currentVelocity.x()) * blend;
    const vz = currentVelocity.z() + ((Number(desired[2]) || 0) - currentVelocity.z()) * blend;
    const requestedY = Number.isFinite(actor.velocity?.[1]) ? actor.velocity[1] : currentVelocity.y();
    scratchVelocity.setValue(vx, requestedY, vz);
    body.setLinearVelocity(scratchVelocity);
    body.activate(true);
    const beforeContacts = dispatcher.getNumManifolds();
    world.stepSimulation(h, 4, 1 / 60);
    const transform = body.getWorldTransform();
    const origin = transform.getOrigin();
    const p = [origin.x(), origin.y() - halfHeight, origin.z()];
    const linear = body.getLinearVelocity();
    let grounded = p[1] <= groundY + 0.075 && linear.y() <= 0.85;
    if (p[1] < groundY) grounded = true;
    if (grounded && p[1] <= groundY + 0.075) {
      p[1] = groundY;
      teleport(p, [linear.x(), 0, linear.z()]);
    }
    actor.position[0] = p[0];
    actor.position[1] = p[1];
    actor.position[2] = p[2];
    actor.velocity[0] = linear.x();
    actor.velocity[1] = grounded ? 0 : linear.y();
    actor.velocity[2] = linear.z();
    actor.grounded = grounded;
    steps++;
    if (dispatcher.getNumManifolds() > 0 || beforeContacts > 0) collisions++;
    return actor.position;
  }

  function setColliderEnabled(index, enabled) {
    const i = Math.floor(Number(index));
    const collider = colliderBodies[i];
    if (!collider || colliderEnabled[i] === Boolean(enabled)) return false;
    if (enabled) world.addRigidBody(collider);
    else world.removeRigidBody(collider);
    colliderEnabled[i] = Boolean(enabled);
    return true;
  }

  function cleanup() {
    try { world.removeRigidBody(body); } catch {}
    for (const collider of colliderBodies) {
      try { world.removeRigidBody(collider); } catch {}
    }
    for (let i = owned.length - 1; i >= 0; i--) {
      try { Ammo.destroy(owned[i]); } catch {}
    }
  }

  return {
    step, teleport, setColliderEnabled, cleanup,
    getState: () => ({
      mode: 'ammo-bullet-capsule',
      steps, collisions,
      colliderCount: colliderBodies.length,
      capsuleRadius: radius,
      capsuleHeight: halfHeight * 2,
      gravity, groundY
    })
  };
}
