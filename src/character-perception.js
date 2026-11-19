const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function colliderShape(collider) {
  if (Array.isArray(collider?.position) && Array.isArray(collider?.halfExtents)) {
    return { position: collider.position, halfExtents: collider.halfExtents, rotationY: Number(collider.rotationY) || 0 };
  }
  const p = collider?.entity?.getPosition?.();
  const s = collider?.entity?.getLocalScale?.();
  if (!p || !s) return null;
  return { position: [p.x, p.y, p.z], halfExtents: [Math.abs(s.x) / 2, Math.abs(s.y) / 2, Math.abs(s.z) / 2], rotationY: collider?.entity?.getEulerAngles?.().y || 0 };
}

function segmentHitsBox(from, to, collider, padding = 0) {
  const box = colliderShape(collider);
  if (!box) return false;
  const angle = -box.rotationY * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  const transform = point => {
    const dx = point[0] - box.position[0], dz = point[2] - box.position[2];
    return [dx * c - dz * s, point[1] - box.position[1], dx * s + dz * c];
  };
  const a = transform(from), b = transform(to);
  const half = box.halfExtents.map(value => Math.abs(value) + padding);
  let enter = 0, exit = 1;
  for (let axis = 0; axis < 3; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-8) {
      if (a[axis] < -half[axis] || a[axis] > half[axis]) return false;
      continue;
    }
    let t0 = (-half[axis] - a[axis]) / delta;
    let t1 = (half[axis] - a[axis]) / delta;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter > exit) return false;
  }
  return exit >= 0 && enter <= 1;
}

export function hasClearLineOfSight(from, to, occluders = [], padding = 0.05) {
  for (const obstacle of occluders) {
    if (segmentHitsBox(from, to, obstacle, padding)) return false;
  }
  return true;
}

/** Lightweight cone/range/occlusion senses; no per-NPC raycast allocation. */
export function createCharacterPerception({ occluders = [], viewDistance = 14, fieldOfView = 120, hearingDistance = 18, vehicleHearingDistance = 32 } = {}) {
  const fovCos = Math.cos(clamp(fieldOfView, 1, 359) * Math.PI / 360);
  let checks = 0, visibleCount = 0, heardCount = 0;

  function sense(observer, target, signals = {}) {
    const a = observer?.position, b = target?.position;
    if (!Array.isArray(a) || !Array.isArray(b)) return { visible: false, heard: false, distance: Infinity, angleDegrees: 180, lineOfSight: false };
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const distance = Math.hypot(dx, dz);
    const yaw = Number(observer.yaw) || 0;
    const forwardX = Math.sin(yaw * Math.PI / 180), forwardZ = -Math.cos(yaw * Math.PI / 180);
    const dot = distance > 1e-6 ? (dx * forwardX + dz * forwardZ) / distance : 1;
    const inCone = dot >= fovCos;
    const from = [a[0], a[1] + (observer.eyeHeight ?? 1.45), a[2]];
    const to = [b[0], b[1] + (target.eyeHeight ?? 1.1), b[2]];
    const lineOfSight = distance <= viewDistance && inCone && hasClearLineOfSight(from, to, occluders);
    const hearingRadius = signals.vehicle ? vehicleHearingDistance : signals.running ? hearingDistance * 1.3 : hearingDistance;
    const heard = Boolean(signals.noise || signals.running || signals.vehicle) && distance <= hearingRadius;
    checks++;
    if (lineOfSight) visibleCount++;
    if (heard) heardCount++;
    return {
      visible: lineOfSight,
      heard,
      distance: Number(distance.toFixed(2)),
      angleDegrees: Number((Math.acos(clamp(dot, -1, 1)) * 180 / Math.PI).toFixed(1)),
      lineOfSight,
      source: lineOfSight ? 'vision' : heard ? 'hearing' : 'none'
    };
  }

  return { sense, getState: () => ({ checks, visibleCount, heardCount, occluderCount: occluders.length, viewDistance, fieldOfView, hearingDistance }) };
}
