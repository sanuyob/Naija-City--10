const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const add = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scale = (a, n) => [a[0]*n, a[1]*n, a[2]*n];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const length = a => Math.sqrt(dot(a, a));
const normalise = (a, fallback = [0, 1, 0]) => { const l = length(a); return l > 1e-8 ? scale(a, 1/l) : fallback.slice(); };

/** Solve a 3D two-segment limb using the law of cosines and a pole direction. */
export function solveTwoBoneIK(root, target, upperLength, lowerLength, pole = [0, 0, 1]) {
  if (![root, target, pole].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) throw new TypeError('IK points must be finite 3D vectors');
  const rawL1 = Number(upperLength), rawL2 = Number(lowerLength);
  if (!Number.isFinite(rawL1) || !Number.isFinite(rawL2) || rawL1 <= 0 || rawL2 <= 0) throw new RangeError('IK segment lengths must be positive and finite');
  const l1 = rawL1, l2 = rawL2;
  const delta = sub(target, root), rawDistance = length(delta);
  const direction = normalise(delta, [0, -1, 0]);
  const maxReach = Math.max(1e-4, l1 + l2 - 1e-4);
  const minReach = Math.abs(l1 - l2) + 1e-4;
  const distance = Math.max(minReach, Math.min(maxReach, rawDistance || minReach));
  let bend = sub(pole, scale(direction, dot(pole, direction)));
  if (length(bend) < 1e-6) {
    const alternate = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    bend = cross(direction, alternate);
  }
  bend = normalise(bend, [0, 0, 1]);
  const along = (l1*l1 - l2*l2 + distance*distance) / (2*distance);
  const height = Math.sqrt(Math.max(0, l1*l1 - along*along));
  const joint = add(add(root, scale(direction, along)), scale(bend, height));
  const effector = add(root, scale(direction, distance));
  return { root: root.slice(), joint, effector, requestedTarget: target.slice(), reachable: rawDistance <= maxReach && rawDistance >= minReach, error: Number(length(sub(effector, target)).toFixed(6)), upperLength: l1, lowerLength: l2 };
}

/** Convert a ground ray hit into a bounded foot target for an IK chain. */
export function makeFootPlantTarget(footPosition, hit, { maxVerticalOffset = 0.35, soleOffset = 0.035 } = {}) {
  if (!Array.isArray(footPosition) || !hit?.point || !Array.isArray(hit.point) || !hit.point.every(Number.isFinite)) return null;
  const deltaY = hit.point[1] + soleOffset - footPosition[1];
  if (Math.abs(deltaY) > Math.max(0, maxVerticalOffset)) return null;
  return { position: [footPosition[0], hit.point[1] + soleOffset, footPosition[2]], normal: hit.normal?.slice?.() || [0, 1, 0], surface: hit.surface || 'unknown', verticalOffset: deltaY };
}
