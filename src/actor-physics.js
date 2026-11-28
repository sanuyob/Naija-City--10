/** Shared mobile kinematic capsule physics: swept horizontal capsules against static AABBs, gravity and agent separation. */
export function createActorPhysics({ colliders = [], groundY = 0, gravity = 18 } = {}) {
  const stats = { steps: 0, collisions: 0, agentSeparations: 0, actorsMoved: 0, lastCollision: null, capsuleTests: 0 };
  const owners = new Map();

  const bounds = o => {
    if (Array.isArray(o?.position) && Array.isArray(o?.halfExtents)) {
      const [x, y, z] = o.position, [rawX, rawY, rawZ] = o.halfExtents;
      const angle = (Number(o.rotationY) || 0) * Math.PI / 180;
      const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
      const hx = c * Math.abs(rawX) + s * Math.abs(rawZ);
      const hz = s * Math.abs(rawX) + c * Math.abs(rawZ);
      return { x, z, hx, hz, top: y + Math.abs(rawY), bottom: y - Math.abs(rawY), id: o.id || 'world-proxy' };
    }
    const p = o.entity?.getPosition?.(), scale = o.entity?.getLocalScale?.();
    return p && scale ? { x: p.x, z: p.z, hx: Math.abs(scale.x) / 2, hz: Math.abs(scale.z) / 2, top: Math.max(Number(o.height) || 0, p.y + Math.abs(scale.y) / 2), bottom: p.y - Math.abs(scale.y) / 2, id: o.id || o.entity.name } : null;
  };

  // A standing capsule is a vertical cylinder with hemispherical ends. On a
  // grounded character its horizontal footprint is a circle; circle/AABB
  // closest-point testing avoids the old square-corner collision false hits.
  const hit = (x, z, y, actor) => {
    const radius = actor.radius || 0.28;
    const height = actor.height || 1.75;
    for (const collider of colliders) {
      const b = bounds(collider);
      if (!b || y + height <= b.bottom + 0.025 || y >= b.top - 0.025) continue;
      stats.capsuleTests++;
      const closestX = Math.max(b.x - b.hx, Math.min(x, b.x + b.hx));
      const closestZ = Math.max(b.z - b.hz, Math.min(z, b.z + b.hz));
      const dx = x - closestX, dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) {
        stats.lastCollision = b.id;
        return true;
      }
    }
    return false;
  };

  function step(actor, desired = [0, 0, 0], dt = 1 / 60, peers = []) {
    if (!actor || !Array.isArray(actor.position)) return null;
    const h = Math.max(0, Math.min(0.05, Number(dt) || 0));
    if (!h) return actor.position;
    actor.velocity ||= [0, 0, 0];
    actor.radius ||= 0.28;
    actor.height ||= 1.75;
    actor.shape = 'capsule';
    const p = actor.position, v = actor.velocity, oldX = p[0], oldZ = p[2];
    let dx = Number(desired[0]) || 0, dz = Number(desired[2]) || 0;

    for (const peer of peers) {
      if (!peer || peer === actor || !Array.isArray(peer.position)) continue;
      const x = p[0] - peer.position[0], z = p[2] - peer.position[2];
      const d = Math.hypot(x, z), min = actor.radius + (peer.radius || 0.28) + 0.08;
      if (d > 0.001 && d < min) {
        const k = (min - d) / min;
        dx += x / d * k * 1.8;
        dz += z / d * k * 1.8;
        stats.agentSeparations++;
      }
    }

    const blend = actor.traversing ? 1 : Math.min(1, (actor.grounded === false ? 6 : 14) * h);
    v[0] += (dx - v[0]) * blend;
    v[2] += (dz - v[2]) * blend;
    if (actor.grounded !== false && Math.abs(dx) + Math.abs(dz) < 0.02) {
      const drag = Math.exp(-8 * h);
      v[0] *= drag; v[2] *= drag;
    }

    const nextX = p[0] + v[0] * h;
    if (!hit(nextX, p[2], p[1], actor)) p[0] = nextX;
    else { v[0] = 0; stats.collisions++; }
    const nextZ = p[2] + v[2] * h;
    if (!hit(p[0], nextZ, p[1], actor)) p[2] = nextZ;
    else { v[2] = 0; stats.collisions++; }

    if (actor.grounded === false || p[1] > groundY + 0.02) {
      v[1] = Math.max(-24, v[1] - gravity * h);
      p[1] += v[1] * h;
      if (p[1] <= groundY) { p[1] = groundY; v[1] = 0; actor.grounded = true; }
    } else { p[1] = groundY; v[1] = 0; actor.grounded = true; }

    stats.steps++;
    if (Math.hypot(p[0] - oldX, p[2] - oldZ) > 0.002) stats.actorsMoved++;
    return p;
  }

  function addStaticColliders(items = [], ownerId = 'dynamic-world') {
    if (!ownerId || !Array.isArray(items) || owners.has(ownerId)) return owners.get(ownerId)?.length || 0;
    const added = [];
    for (const item of items) {
      if (!Array.isArray(item?.position) || !Array.isArray(item?.halfExtents)) continue;
      const proxy = { ...item, ownerId };
      colliders.push(proxy); added.push(proxy);
    }
    owners.set(ownerId, added);
    return added.length;
  }
  function setStaticColliderEnabled(ownerId, localIndex, enabled) {
    const items = owners.get(ownerId); if (!items) return false;
    const item = items[Math.floor(Number(localIndex))]; if (!item) return false;
    const index = colliders.indexOf(item);
    if (enabled && index < 0) colliders.push(item); else if (!enabled && index >= 0) colliders.splice(index, 1);
    return true;
  }
  function removeStaticColliders(ownerId) {
    const items = owners.get(ownerId); if (!items) return 0;
    const refs = new Set(items);
    for (let i = colliders.length - 1; i >= 0; i--) if (refs.has(colliders[i])) colliders.splice(i, 1);
    owners.delete(ownerId); return items.length;
  }
  return { step, addStaticColliders, setStaticColliderEnabled, removeStaticColliders, getState: () => ({ ...stats, colliderCount: colliders.length, gravity, groundY, mode: 'kinematic-capsule' }) };
}
