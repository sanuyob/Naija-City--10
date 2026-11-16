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
    const allocationStart = owned.length;
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
    world.addRigidBody(body, 1, 3);
    return { body, resources: owned.slice(allocationStart) };
  }

  // One continuous collision floor covers the Yaba/Ikeja prototype bounds.
  addStaticBox([0, groundY - 0.20, 105], [60, 0.20, 320], 1.0);
  const surfaceDescriptors = [{ id: 'world-ground-asphalt', surface: 'asphalt' }];

  const colliderBodies = [];
  const colliderEnabled = [];
  const colliderDescriptors = [];
  const colliderOwners = new Map();
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
    descriptor.surface = item?.surface || (/grass|park|planter/i.test(descriptor.id) ? 'grass' :
      /metal|rail|ladder|pipe|ac-/i.test(descriptor.id) ? 'metal' :
      /road|asphalt/i.test(descriptor.id) ? 'asphalt' : 'concrete');
    const staticRecord = addStaticBox(descriptor.position, descriptor.halfExtents, 0.82, descriptor.rotationY);
    staticRecord.body.setUserIndex?.(1000 + surfaceDescriptors.length);
    colliderDescriptors.push(descriptor);
    surfaceDescriptors.push(descriptor);
    colliderBodies.push(staticRecord);
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
  world.addRigidBody(body, 2, 1);

  const scratchVelocity = vector(0, 0, 0);
  const scratchTransform = own(new Ammo.btTransform());
  const scratchOrigin = vector(0, 0, 0);
  const colliderSyncTransform = own(new Ammo.btTransform());
  const colliderSyncOrigin = vector(0, 0, 0);
  const colliderSyncRotation = own(new Ammo.btQuaternion(0, 0, 0, 1));
  let steps = 0;
  let collisions = 0;
  let playerBodyEnabled = true;
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
      if (!collider) continue;
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
    const blend = actor.traversing ? 1 : 1 - Math.exp(-(actor.grounded === false ? 7.5 : 26) * h);
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
    // Probe farther above and below the capsule feet. The old 12 cm / 20 cm
    // ray only detected support; it never corrected penetration on elevated
    // surfaces, so the capsule could settle visibly inside rooftop colliders.
    const supportHit = raycast([p[0], p[1] + .42, p[2]], [p[0], p[1] - .26, p[2]]);
    const supportDelta = supportHit ? p[1] - supportHit.point[1] : Infinity;
    const raySupport = Boolean(supportHit && supportHit.normal[1] > .55 && supportDelta >= -.22 && supportDelta <= .22);
    // Ladder traversal must be allowed to rise through the ground probe's
    // support tolerance. Otherwise a slow first rung is repeatedly snapped
    // back to Y=0 and looks like the character is on an invisible elevator.
    const ignoreGroundSupport=actor.ignoreGroundSupport===true;
    let grounded = !ignoreGroundSupport && (hasSupportContact() || raySupport) && linear.y() <= 1.2;
    if (!ignoreGroundSupport && p[1] <= groundY + 0.075 && linear.y() <= 0.85) grounded = true;
    if (!ignoreGroundSupport && p[1] < groundY) grounded = true;
    // Snap the feet to the actual support hit, including rooftops, platforms,
    // and raised walkways. This is deliberately disabled during ladder ascent
    // and other authored traversal so it cannot pull the character off a rung.
    if (!ignoreGroundSupport && grounded && raySupport && linear.y() <= 1.2) {
      if (Math.abs(supportDelta) > .005) {
        p[1] = supportHit.point[1];
        teleport(p, [linear.x(), 0, linear.z()]);
      }
    } else if (grounded && p[1] <= groundY + 0.075) {
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


  function raycast(from, to) {
    const start = vector(Number(from[0]) || 0, Number(from[1]) || 0, Number(from[2]) || 0);
    const end = vector(Number(to[0]) || 0, Number(to[1]) || 0, Number(to[2]) || 0);
    const callback = own(new Ammo.ClosestRayResultCallback(start, end));
    callback.set_m_collisionFilterGroup?.(1);
    callback.set_m_collisionFilterMask?.(1);
    world.rayTest(start, end, callback);
    let result = null;
    if (callback.hasHit()) {
      const point = callback.get_m_hitPointWorld();
      const normal = callback.get_m_hitNormalWorld();
      const object = callback.get_m_collisionObject?.();
      const index = object?.getUserIndex?.() ?? 1000;
      const descriptor = surfaceDescriptors[index - 1000] || surfaceDescriptors[0];
      result = {
        point: [point.x(), point.y(), point.z()],
        normal: [normal.x(), normal.y(), normal.z()],
        surface: descriptor?.surface || 'asphalt',
        id: descriptor?.id || 'world-ground-asphalt'
      };
    }
    release(callback); release(start); release(end);
    return result;
  }

  function addStaticColliders(items = [], ownerId = 'dynamic-world') {
    if (!ownerId || !Array.isArray(items)) return 0;
    if (colliderOwners.has(ownerId)) return colliderOwners.get(ownerId).length;
    const indices = [];
    for (const item of items) {
      const position = item?.position;
      const halfExtents = item?.halfExtents;
      if (!Array.isArray(position) || !Array.isArray(halfExtents) || position.length < 3 || halfExtents.length < 3) continue;
      if (![...position, ...halfExtents].every(Number.isFinite)) continue;
      const rotationY = Number(item.rotationY) || 0;
      const descriptor = {
        id: item.id || `${ownerId}:proxy:${indices.length}`,
        kind: item.kind || 'world',
        position: position.slice(0, 3),
        halfExtents: halfExtents.slice(0, 3).map(value => Math.max(0.04, Math.abs(value))),
        rotationY,
        surface: item.surface || 'concrete'
      };
      const record = addStaticBox(descriptor.position, descriptor.halfExtents, descriptor.surface === 'asphalt' ? 1.0 : 0.82, rotationY);
      record.ownerId = ownerId;
      record.body.setUserIndex?.(1000 + surfaceDescriptors.length);
      const index = colliderBodies.length;
      colliderBodies.push(record);
      colliderEnabled.push(true);
      colliderDescriptors.push(descriptor);
      surfaceDescriptors.push(descriptor);
      indices.push(index);
    }
    colliderOwners.set(ownerId, indices);
    return indices.length;
  }

  // Keep selected static proxies synchronized with objects simulated in a
  // different Bullet world (for example, the player sedan). The shape remains
  // a compact OBB; only its transform changes each frame.
  function updateStaticColliders(ownerId, items = []) {
    const indices = colliderOwners.get(ownerId);
    if (!indices || !Array.isArray(items)) return 0;
    let updated = 0;
    for (let localIndex = 0; localIndex < Math.min(indices.length, items.length); localIndex++) {
      const index = indices[localIndex];
      const record = colliderBodies[index];
      const descriptor = colliderDescriptors[index];
      const item = items[localIndex];
      if (!record || !descriptor || !Array.isArray(item?.position) || item.position.length < 3 || !item.position.every(Number.isFinite)) continue;
      const yaw = Number(item.rotationY) || 0;
      descriptor.position = item.position.slice(0, 3);
      descriptor.rotationY = yaw;
      descriptor.surface = item.surface || descriptor.surface;
      colliderSyncTransform.setIdentity();
      colliderSyncOrigin.setValue(...descriptor.position);
      colliderSyncTransform.setOrigin(colliderSyncOrigin);
      const halfYaw = yaw * Math.PI / 360;
      colliderSyncRotation.setValue(0, Math.sin(halfYaw), 0, Math.cos(halfYaw));
      colliderSyncTransform.setRotation(colliderSyncRotation);
      record.body.setWorldTransform(colliderSyncTransform);
      record.body.getMotionState?.()?.setWorldTransform?.(colliderSyncTransform);
      if (colliderEnabled[index]) world.updateSingleAabb(record.body);
      updated++;
    }
    return updated;
  }

  function setStaticColliderEnabled(ownerId, localIndex, enabled) {
    const indices = colliderOwners.get(ownerId);
    if (!indices) return false;
    const index = indices[Math.floor(Number(localIndex))];
    return index === undefined ? false : setColliderEnabled(index, enabled);
  }

  function removeStaticColliders(ownerId) {
    const indices = colliderOwners.get(ownerId);
    if (!indices) return 0;
    let removed = 0;
    for (const index of indices) {
      const record = colliderBodies[index];
      if (!record) continue;
      if (colliderEnabled[index]) { try { world.removeRigidBody(record.body); } catch {} }
      for (let i = record.resources.length - 1; i >= 0; i--) release(record.resources[i]);
      colliderBodies[index] = null;
      colliderEnabled[index] = false;
      colliderDescriptors[index] = null;
      surfaceDescriptors[index + 1] = null;
      removed++;
    }
    colliderOwners.delete(ownerId);
    return removed;
  }

  function setColliderEnabled(index, enabled) {
    const i = Math.floor(Number(index));
    const collider = colliderBodies[i];
    if (!collider || colliderEnabled[i] === Boolean(enabled)) return false;
    if (enabled) { world.addRigidBody(collider.body, 1, 3); world.updateSingleAabb(collider.body); }
    else world.removeRigidBody(collider.body);
    colliderEnabled[i] = Boolean(enabled);
    return true;
  }

  function setPlayerEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === playerBodyEnabled) return playerBodyEnabled;
    if (next) {
      world.addRigidBody(body, 2, 1);
      world.updateSingleAabb(body);
    } else {
      world.removeRigidBody(body);
    }
    playerBodyEnabled = next;
    return playerBodyEnabled;
  }

  function cleanup() {
    if (playerBodyEnabled) { try { world.removeRigidBody(body); } catch {} }
    for (const collider of colliderBodies) {
      if (!collider) continue;
      try { if (colliderEnabled[colliderBodies.indexOf(collider)]) world.removeRigidBody(collider.body); } catch {}
    }
    for (let i = owned.length - 1; i >= 0; i--) {
      try { Ammo.destroy(owned[i]); } catch {}
    }
  }

  return {
    step, teleport, setColliderEnabled, addStaticColliders, updateStaticColliders, setStaticColliderEnabled, removeStaticColliders, setGravity, setCrouched, canFitCapsule, raycast, setPlayerEnabled, cleanup,
    getState: () => ({
      mode: 'ammo-bullet-capsule', playerBodyEnabled,
      steps, collisions,
      colliderCount: colliderBodies.filter(Boolean).length,
      capsuleRadius: radius,
      capsuleHeight,
      crouchHeight,
      crouched: capsuleHeight < 1.8,
      worldColliderCount: Math.max(0, colliderBodies.filter(Boolean).length - colliders.slice(0, 8).length),
      gravity: activeGravity, groundY
    })
  };
}
