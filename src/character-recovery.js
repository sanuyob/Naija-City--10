const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dot3 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const sub3 = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const scale3 = (a, n) => [a[0]*n, a[1]*n, a[2]*n];
const length3 = a => Math.sqrt(dot3(a, a));
const normalizeQuat = q => {
  const size = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map(value => value / size);
};
const quatMultiply = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] - a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]
];
const quatInverse = q => [-q[0], -q[1], -q[2], q[3]];
const rotate3 = (q, v) => {
  const u = [q[0], q[1], q[2]];
  const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  const second = [u[1]*cross[2]-u[2]*cross[1], u[2]*cross[0]-u[0]*cross[2], u[0]*cross[1]-u[1]*cross[0]];
  return [v[0] + 2*(q[3]*cross[0] + second[0]), v[1] + 2*(q[3]*cross[1] + second[1]), v[2] + 2*(q[3]*cross[2] + second[2])];
};

export function smoothStep01(value) {
  const t = clamp(Number(value) || 0, 0, 1);
  return t*t*(3 - 2*t);
}

export function slerpQuaternion(from, to, weight) {
  const a = normalizeQuat(from), b = normalizeQuat(to);
  let cosine = a.reduce((sum, value, index) => sum + value*b[index], 0);
  let target = b;
  if (cosine < 0) { target = b.map(value => -value); cosine = -cosine; }
  const t = clamp(Number(weight) || 0, 0, 1);
  if (cosine > 0.9995) return normalizeQuat(a.map((value, index) => value + (target[index]-value)*t));
  const angle = Math.acos(clamp(cosine, -1, 1));
  const sine = Math.sin(angle) || 1;
  const wa = Math.sin((1-t)*angle)/sine, wb = Math.sin(t*angle)/sine;
  return normalizeQuat(a.map((value, index) => value*wa + target[index]*wb));
}

/** Blend world-space bone poses without introducing quaternion scale drift. */
export function interpolateCharacterPose(fromPose, toPose, weight) {
  if (!fromPose || !toPose) return null;
  const t = clamp(Number(weight) || 0, 0, 1);
  const result = {};
  for (const [key, target] of Object.entries(toPose)) {
    const source = fromPose[key];
    if (!source?.position || !source?.rotation || !target?.position || !target?.rotation) continue;
    result[key] = {
      position: source.position.map((value, index) => value + (target.position[index]-value)*t),
      rotation: slerpQuaternion(source.rotation, target.rotation, t)
    };
  }
  return result;
}

/** Determine which side of a prone character faces the sky from the head's local +Z forward axis. */
export function classifyRecoverySide(pose, threshold = 0.42) {
  const rotation = pose?.head?.rotation || pose?.spine2?.rotation || pose?.hips?.rotation;
  if (!Array.isArray(rotation) || rotation.length !== 4 || !rotation.every(Number.isFinite) || Math.hypot(...rotation) < 1e-5) return 'side';
  const facing = rotate3(normalizeQuat(rotation), [0, 0, 1]);
  if (facing[1] >= threshold) return 'face-up';
  if (facing[1] <= -threshold) return 'face-down';
  return 'side';
}

/** Return a stable world yaw from the face direction, preserving the last heading if the face points almost vertically. */
export function deriveRecoveryYaw(pose, fallbackYaw = 0) {
  const rotation = pose?.head?.rotation || pose?.spine2?.rotation || pose?.hips?.rotation;
  if (!Array.isArray(rotation) || rotation.length !== 4 || !rotation.every(Number.isFinite) || Math.hypot(...rotation) < 1e-5) return fallbackYaw;
  const facing = rotate3(normalizeQuat(rotation), [0, 0, 1]);
  if (Math.hypot(facing[0], facing[2]) < 0.18) return fallbackYaw;
  return Math.atan2(-facing[0], -facing[2]) * 180 / Math.PI;
}

/** Estimate per-bone linear/angular velocities from two recent animated world-pose samples. */
export function estimateBoneVelocities(previousPose, currentPose, deltaSeconds, rootVelocity = [0, 0, 0]) {
  const dt = Number(deltaSeconds);
  if (!(dt > 1e-4) || !Number.isFinite(dt)) return {};
  const clampVector = (value, maximum) => {
    const magnitude = length3(value);
    return magnitude > maximum ? scale3(value, maximum / magnitude) : value;
  };
  const result = {};
  for (const [key, current] of Object.entries(currentPose || {})) {
    const previous = previousPose?.[key];
    if (!previous?.position || !previous?.rotation || !current?.position || !current?.rotation) continue;
    const linear = clampVector(scale3(sub3(current.position, previous.position), 1/dt), 8.5);
    let delta = normalizeQuat(quatMultiply(normalizeQuat(current.rotation), quatInverse(normalizeQuat(previous.rotation))));
    if (delta[3] < 0) delta = delta.map(value => -value);
    const halfAngle = Math.acos(clamp(delta[3], -1, 1));
    const sine = Math.sin(halfAngle);
    let angular = [0, 0, 0];
    if (Math.abs(sine) > 1e-5 && halfAngle > 1e-5) {
      const factor = (2 * halfAngle) / (sine * dt);
      angular = clampVector([delta[0]*factor, delta[1]*factor, delta[2]*factor], 16);
    }
    result[key] = { linear: linear.every(Number.isFinite) ? linear : rootVelocity.slice(), angular };
  }
  return result;
}
