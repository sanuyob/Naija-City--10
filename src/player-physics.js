import { loadAmmo } from './vehicle-physics.js';

/**
 * Bullet-backed player capsule. Visible character geometry is separate from
 * the collision body. The lighter kinematic solver remains available to crowds.
 */
export async function createPlayerPhysics({ colliders = [], groundY = 0, gravity = 18 } = {}) {
  const Ammo = await loadAmmo();
  const owned = [];
  const own = value => { owned.push(value); return value; };
  const release = value => {
    const index = owned.indexOf(value);
    if (index >= 0) owned.splice(index, 1);
    try { Ammo.destroy(value); } catch {}
  };
  const vector = (x, y, z) => own(new Ammo.btVector3(x, y, z));
  let capsuleHeight = 1.8;
  let halfHeight = capsuleHeight / 2;
  const radius = 0.31;
  const crouchHeight = 1.22;
  const worldConfig = own(new Ammo.btDefaultCollisionConfiguration());
  const dispatcher = own(new Ammo.btCollisionDispatcher(worldConfig));
  const broadphase = own(new Ammo.btDbvtBroadphase());
  const solver = own(new Ammo.btSequentialImpulseConstraintSolver());
  const world = own(new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, worldConfig));
  const gravityVector = vector(0, -gravity, 0);
  world.setGravity(gravityVector);

  function addStaticBox(position, halfExtents, friction = 0.82, rotationY = 0) {
    const shape = own(new Ammo.btBoxShape(vector(
      Math.max(0.04, halfExtents[0]),
      Math.max(0.04, halfExtents[1]),
      Math.max(0.04, halfExtents[2])
    )));
    const start = own(new Ammo.btTransform());
    start.setIdentity();
    start.setOrigin(vector(position[0], position[1], position[2]));
    const yaw = (Number(rotationY) || 0) * Math.PI / 180;
    if (Math.abs(yaw) > 1e-5 && typeof Ammo.btQuaternion === 'function') {
      const rotation = own(new Ammo.btQuaternion(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)));
      start.setRotation(rotation);
    }
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
  const colliderDescriptors = [];
  for (const item of colliders) {
    let position, halfExtents, rotationY = Number(item?.rotationY) || 0;
    if (Array.isArray(item?.position) && Array.isArray(item?.halfExtents)) {
      position = item.position;
      halfExtents = item.halfExtents;
    } else {
      const entity = item?.entity;
      const p = entity?.getPosition?.();
      const size = entity?.getLocalScale?.();
      const rotation = entity?.getEulerAngles?.();
      if (!p || !size) continue;
      position = [p.x, p.y, p.z];
      halfExtents = [Math.abs(size.x) / 2, Math.abs(size.y) / 2, Math.abs(size.z) / 2];
      rotationY = rotation?.y || 0;
    }
    const descriptor = { position: position.slice(), halfExtents: halfExtents.slice(), rotationY, id: item?.id || item?.name || item?.entity?.name || 'world-proxy' };
    colliderDescriptors.push(descriptor);
    colliderBodies.push(addStaticBox(descriptor.position, descriptor.halfExtents, 0.82, descriptor.rotationY));
    colliderEnabled.push(true);
  }

  let capsule = own(new Ammo.btCapsuleShape(radius, Math.max(0.1, capsuleHeight - radius * 2)));
  const actorStart = own(new Ammo.btTransform());
  actorStart.setIdentity();
  actorStart.setOrigin(vector(0, groundY + halfHeight, 0));
  const actorMotion = own(new Ammo.btDefaultMotionState(actorStart));
  const inertia = vector(0, 0, 0);
  const mass = 72;
  capsule.calculateLocalInertia(mass, inertia);
  const bodyInfo = own(new Ammo.btRigidBodyConstructionInfo(mass, actorMotion, capsule, inertia));
  const body = own(new Ammo.btRigidBody(bodyInfo));
  body.setUserIndex(1337);
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
  let activeGravity = gravity;

  function setGravity(value) {
    activeGravity = Math.max(0, Math.min(40, Number(value) || 0));
    gravityVector.setValue(0, -activeGravity, 0);
    world.setGravity(gravityVector);
  }

  // A character can stand on a vault box, ledge or ladder platform as well
  // as on the city floor. Detect an upward-facing Bullet contact instead of
  // declaring the player grounded only when its feet reach y=0.
  function hasSupportContact() {
    const count = dispatcher.getNumManifolds();
    for (let i = 0; i < count; i++) {
      const manifold = dispatcher.getManifoldByIndexInternal(i);
      const body0 = manifold.getBody0();
      const body1 = manifold.getBody1();
      const playerIsBody0 = body0.getUserIndex?.() === 1337;
      const playerIsBody1 = body1.getUserIndex?.() === 1337;
      if (!playerIsBody0 && !playerIsBody1) continue;
      for (let j = 0; j < manifold.getNumContacts(); j++) {
        const contact = manifold.getContactPoint(j);
        if (contact.getDistance() > 0.09) continue;
        const normal = contact.get_m_normalWorldOnB();
        const supportY = normal.y() * (playerIsBody0 ? 1 : -1);
        if (supportY > 0.55) return true;
      }
    }
    return false;
  }

  function canFitCapsule(position, height) {
    const x = Number(position?.[0]) || 0, feetY = Number(position?.[1]) || 0, z = Number(position?.[2]) || 0;
    for (const collider of colliderDescriptors) {
      const [cx, cy, cz] = collider.position;
      const [hx, hy, hz] = collider.halfExtents;
      const bottom = cy - hy, top = cy + hy;
      if (feetY + height <= bottom + 0.025 || feetY >= top - 0.025) continue;
      const yaw = collider.rotationY * Math.PI / 180;
      const dx = x - cx, dz = z - cz;
      const localX = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const localZ = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const nearX = Math.max(-hx, Math.min(hx, localX));
      const nearZ = Math.max(-hz, Math.min(hz, localZ));
      const ex = localX - nearX, ez = localZ - nearZ;
      if (ex * ex + ez * ez < (radius + 0.025) * (radius + 0.025)) return false;
    }
    return true;
  }

  function setCrouched(crouched, feetPosition = null) {
    const targetHeight = crouched ? crouchHeight : 1.8;
    if (Math.abs(targetHeight - capsuleHeight) < 0.001) return true;
    const transform = body.getWorldTransform();
    const currentOrigin = transform.getOrigin();
    const feet = feetPosition || [currentOrigin.x(), currentOrigin.y() - halfHeight, currentOrigin.z()];
    if (targetHeight > capsuleHeight && !canFitCapsule(feet, targetHeight)) return false;
    const nextShape = own(new Ammo.btCapsuleShape(radius, Math.max(0.1, targetHeight - radius * 2)));
    const previousShape = capsule;
    body.setCollisionShape(nextShape);
    capsule = nextShape;
    release(previousShape);
    capsuleHeight = targetHeight;
    halfHeight = targetHeight / 2;
    teleport(feet, [body.getLinearVelocity().x(), body.getLinearVelocity().y(), body.getLinearVelocity().z()]);
    world.updateSingleAabb(body);
    return true;
  }

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
    let grounded = hasSupportContact() && linear.y() <= 1.2;
    if (p[1] <= groundY + 0.075 && linear.y() <= 0.85) grounded = true;
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
    step, teleport, setColliderEnabled, setGravity, setCrouched, canFitCapsule, cleanup,
    getState: () => ({
      mode: 'ammo-bullet-capsule',
      steps, collisions,
      colliderCount: colliderBodies.length,
      capsuleRadius: radius,
      capsuleHeight,
      crouchHeight,
      crouched: capsuleHeight < 1.8,
      worldColliderCount: Math.max(0, colliderBodies.length - colliders.slice(0, 8).length),
      gravity: activeGravity, groundY
    })
  };
}
