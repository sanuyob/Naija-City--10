import { interpolateCharacterPose, smoothStep01 } from './character-recovery.js';

const EPSILON = 1e-7;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = a => Math.sqrt(dot(a, a));
const normalize = (a, fallback = [0, 1, 0]) => {
  const size = length(a);
  return size > EPSILON ? scale(a, 1 / size) : fallback.slice();
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

const quatNormalize = q => {
  const m = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map(value => value / m);
};
const quatInverse = q => [-q[0], -q[1], -q[2], q[3]];
const quatMultiply = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const rotate = (q, v) => {
  const u = [q[0], q[1], q[2]];
  const uv = cross(u, v);
  const uuv = cross(u, uv);
  return add(v, add(scale(uv, 2 * q[3]), scale(uuv, 2)));
};
const quatFromUp = direction => {
  const from = [0, 1, 0], to = normalize(direction);
  const d = dot(from, to);
  if (d < -0.999999) return [1, 0, 0, 0];
  const c = cross(from, to);
  return quatNormalize([c[0], c[1], c[2], 1 + d]);
};
const readNode = node => {
  if (!node?.getPosition || !node?.getRotation) return null;
  const p = node.getPosition(), q = node.getRotation();
  return { position: [p.x, p.y, p.z], rotation: quatNormalize([q.x, q.y, q.z, q.w]) };
};

/**
 * A compact Bullet ragdoll built in the player's existing dynamics world.
 * It intentionally uses only the main articulated body chains (not fingers).
 * All constraint pivots are calculated from the live animated pose.
 */
export function createCharacterRagdoll({ Ammo, world, rig, initialVelocity = [0, 0, 0], impactVelocity = [0, 0, 0], boneVelocities = {}, handoffDuration = 0.16 } = {}) {
  if (!Ammo || !world || !rig?.getRagdollBones || !rig?.applyRagdollPose) {
    throw new TypeError('Ragdoll needs Ammo, the player Bullet world and an Ara rig adapter');
  }
  if (typeof Ammo.btConeTwistConstraint !== 'function' || typeof Ammo.btHingeConstraint !== 'function') {
    throw new Error('Ammo build is missing Bullet cone-twist or hinge constraints');
  }

  const resources = [];
  const own = value => { resources.push(value); return value; };
  const vector = v => own(new Ammo.btVector3(v[0], v[1], v[2]));
  const rotation = q => own(new Ammo.btQuaternion(q[0], q[1], q[2], q[3]));
  const transform = (p, q) => {
    const value = own(new Ammo.btTransform());
    value.setIdentity();
    value.setOrigin(vector(p));
    value.setRotation(rotation(q));
    return value;
  };
  const bones = rig.getRagdollBones();
  rig.root?.syncHierarchy?.();
  const animatedPose = rig.getRagdollPose();
  if (!animatedPose || !Object.keys(animatedPose).length) throw new Error('Ara animation pose is unavailable for ragdoll handoff');
  const bodies = new Map();
  const segments = [];
  const constraints = [];
  const jointRecords = [];
  let disposed = false;
  let stepCount = 0;
  let handoffElapsed = 0;
  const handoffSeconds = Math.max(0.04, Math.min(0.5, Number(handoffDuration) || 0.16));
  let lastPose = animatedPose;

  const getPoint = node => readNode(node)?.position || null;
  const makeNodeBody = (name, boneKey, shape, mass, center, bodyRotation, bonePose) => {
    if (!bonePose) throw new Error('Missing live bone pose for ragdoll body: ' + boneKey);
    const shapeHandle = own(shape);
    const bodyTransform = transform(center, bodyRotation);
    const motion = own(new Ammo.btDefaultMotionState(bodyTransform));
    const inertia = vector([0, 0, 0]);
    shapeHandle.calculateLocalInertia(mass, inertia);
    const info = own(new Ammo.btRigidBodyConstructionInfo(mass, motion, shapeHandle, inertia));
    const body = own(new Ammo.btRigidBody(info));
    body.setFriction(0.82);
    body.setRestitution(0.015);
    body.setDamping(0.07, 0.82);
    body.setActivationState(4);
    body.setUserIndex(2300 + segments.length);
    const sampledMotion = boneVelocities?.[boneKey] || {};
    const angularVelocity = Array.isArray(sampledMotion.angular) ? sampledMotion.angular.map(v => Number(v) || 0) : [0, 0, 0];
    const hasSampledLinear = Array.isArray(sampledMotion.linear);
    const boneLinear = hasSampledLinear ? sampledMotion.linear.map(v => Number(v) || 0) : initialVelocity.map(v => Number(v) || 0);
    const centerOffset = sub(center, bonePose.position);
    // The gameplay impact is authoritative and must be transferred even when
    // a bone has no valid animation-velocity sample (for example immediately
    // after a teleport, spawn, or animation reset).
    const impact = Array.isArray(impactVelocity)
      ? impactVelocity.map(v => Number(v) || 0) : [0, 0, 0];
    // A stale/fast animation sample may point opposite to the actual hit. Keep
    // the pelvis's inherited component bounded against the requested impact so
    // the physical handoff cannot reverse the knockback direction. Other body
    // segments retain their sampled pose momentum for a natural fall response.
    if (boneKey === 'hips') {
      const impactSpeed = length(impact);
      if (impactSpeed > 1e-4) {
        const impactDirection = scale(impact, 1 / impactSpeed);
        const inheritedAlongImpact = boneLinear[0] * impactDirection[0] + boneLinear[1] * impactDirection[1] + boneLinear[2] * impactDirection[2];
        const minimumInheritedAlongImpact = -impactSpeed * 0.25;
        if (inheritedAlongImpact < minimumInheritedAlongImpact) {
          const correction = minimumInheritedAlongImpact - inheritedAlongImpact;
          boneLinear[0] += impactDirection[0] * correction;
          boneLinear[1] += impactDirection[1] * correction;
          boneLinear[2] += impactDirection[2] * correction;
        }
      }
    }
    const centerVelocity = add(add(boneLinear, cross(angularVelocity, centerOffset)), impact);
    if (boneKey === 'hips') {
      const impactSpeed = length(impact);
      if (impactSpeed > 1e-4) {
        const impactDirection = scale(impact, 1 / impactSpeed);
        const projectedVelocity = centerVelocity[0] * impactDirection[0] + centerVelocity[1] * impactDirection[1] + centerVelocity[2] * impactDirection[2];
        const minimumProjectedVelocity = impactSpeed * 0.75;
        if (projectedVelocity < minimumProjectedVelocity) {
          const correction = minimumProjectedVelocity - projectedVelocity;
          centerVelocity[0] += impactDirection[0] * correction;
          centerVelocity[1] += impactDirection[1] * correction;
          centerVelocity[2] += impactDirection[2] * correction;
        }
      }
    }
    const maxSpeed = length(centerVelocity);
    if (maxSpeed > 9) centerVelocity.splice(0, 3, ...scale(centerVelocity, 9 / maxSpeed));
    body.setLinearVelocity(vector(centerVelocity));
    body.setAngularVelocity?.(vector(angularVelocity));
    world.addRigidBody(body, 2, 1);
    body.activate?.(true);
    const inverse = quatInverse(bodyRotation);
    const offsetPosition = rotate(inverse, sub(bonePose.position, center));
    const offsetRotation = quatNormalize(quatMultiply(inverse, bonePose.rotation));
    const record = { name, boneKey, node: bones[boneKey], body, mass, center: center.slice(), bodyRotation: bodyRotation.slice(), offsetPosition, offsetRotation };
    bodies.set(name, record);
    segments.push(record);
    return record;
  };

  const capsuleBody = (name, boneKey, childKey, radius, mass, startKey = boneKey) => {
    const node = bones[boneKey], startNode = bones[startKey], child = bones[childKey];
    const start = getPoint(startNode), end = getPoint(child), pose = readNode(node);
    if (!start || !end || !pose) throw new Error('Missing ragdoll limb chain: ' + boneKey + ' -> ' + childKey);
    const delta = sub(end, start);
    const span = length(delta);
    if (span < 0.12) throw new Error('Ragdoll limb segment is too short: ' + boneKey);
    const bodyRotation = quatFromUp(delta);
    const center = scale(add(start, end), 0.5);
    const cylinderHeight = Math.max(0.035, span - radius * 2);
    return makeNodeBody(name, boneKey, new Ammo.btCapsuleShape(radius, cylinderHeight), mass, center, bodyRotation, pose);
  };

  const ballJoint = (name, bodyA, bodyB, anchor, limits) => {
    const qA = quatInverse(bodyA.bodyRotation), qB = quatInverse(bodyB.bodyRotation);
    const localA = rotate(qA, sub(anchor, bodyA.center));
    const localB = rotate(qB, sub(anchor, bodyB.center));
    const frameA = transform(localA, qA);
    const frameB = transform(localB, qB);
    const joint = own(new Ammo.btConeTwistConstraint(bodyA.body, bodyB.body, frameA, frameB));
    const softness = 0.84, biasFactor = 0.28, relaxationFactor = 1.0;
    joint.setLimit(limits[0], limits[1], limits[2], softness, biasFactor, relaxationFactor);
    world.addConstraint(joint, true);
    constraints.push(joint);
    jointRecords.push({ name, type: 'cone-twist', limits: limits.slice(), softness, biasFactor, relaxationFactor, joint });
    return joint;
  };

  const hingeJoint = (name, bodyA, bodyB, anchor, axisWorld = [1, 0, 0], low = -0.18, high = 2.35) => {
    const invA = quatInverse(bodyA.bodyRotation), invB = quatInverse(bodyB.bodyRotation);
    const pivotA = vector(rotate(invA, sub(anchor, bodyA.center)));
    const pivotB = vector(rotate(invB, sub(anchor, bodyB.center)));
    const axisA = vector(normalize(rotate(invA, axisWorld)));
    const axisB = vector(normalize(rotate(invB, axisWorld)));
    const joint = own(new Ammo.btHingeConstraint(bodyA.body, bodyB.body, pivotA, pivotB, axisA, axisB, true));
    const softness = 0.9, biasFactor = 0.3, relaxationFactor = 1.0;
    joint.setLimit(low, high, softness, biasFactor, relaxationFactor);
    world.addConstraint(joint, true);
    constraints.push(joint);
    jointRecords.push({ name, type: 'hinge', limits: [low, high], softness, biasFactor, relaxationFactor, joint });
    return joint;
  };


  const getHingeAxis = (startKey, pivotKey, endKey, fallbackRotation) => {
    const start = getPoint(bones[startKey]), pivot = getPoint(bones[pivotKey]), end = getPoint(bones[endKey]);
    if (start && pivot && end) {
      const upper = normalize(sub(pivot, start));
      const lower = normalize(sub(end, pivot));
      const axis = cross(upper, lower);
      if (length(axis) > 0.08) return normalize(axis);
    }
    return normalize(rotate(fallbackRotation || [0, 0, 0, 1], [0, 0, 1]), [1, 0, 0]);
  };

  try {
    for (const key of ['hips','spine2','neck','head','leftUpperArm','leftForeArm','leftHand','rightUpperArm','rightForeArm','rightHand','leftThigh','leftShin','leftFoot','rightThigh','rightShin','rightFoot']) {
      if (!bones[key]) throw new Error('Ara ragdoll bone not found: ' + key);
    }
    rig.root?.syncHierarchy?.();

    const hipsPose = readNode(bones.hips);
    const pelvis = makeNodeBody(
      'pelvis', 'hips',
      new Ammo.btBoxShape(vector([0.145, 0.095, 0.115])),
      15, hipsPose.position, hipsPose.rotation, hipsPose
    );
    // The torso proxy must span pelvis-to-upper-spine; using Spine2-to-Neck
    // leaves most of the chest unsupported and puts the spine joint at the wrong end.
    const chest = capsuleBody('chest', 'spine2', 'spine2', 0.145, 19, 'hips');
    const headPose = readNode(bones.head);
    const headCenter = add(headPose.position, rotate(headPose.rotation, [0, 0.065, 0]));
    const head = makeNodeBody('head', 'head', new Ammo.btSphereShape(0.115), 5.5, headCenter, headPose.rotation, headPose);

    const leftUpperArm = capsuleBody('left-upper-arm', 'leftUpperArm', 'leftForeArm', 0.062, 2.4);
    const leftForeArm = capsuleBody('left-forearm', 'leftForeArm', 'leftHand', 0.052, 1.4);
    const rightUpperArm = capsuleBody('right-upper-arm', 'rightUpperArm', 'rightForeArm', 0.062, 2.4);
    const rightForeArm = capsuleBody('right-forearm', 'rightForeArm', 'rightHand', 0.052, 1.4);
    const leftThigh = capsuleBody('left-thigh', 'leftThigh', 'leftShin', 0.088, 8.1);
    const leftShin = capsuleBody('left-shin', 'leftShin', 'leftFoot', 0.068, 4.35);
    const rightThigh = capsuleBody('right-thigh', 'rightThigh', 'rightShin', 0.088, 8.1);
    const rightShin = capsuleBody('right-shin', 'rightShin', 'rightFoot', 0.068, 4.35);

    ballJoint('spine', pelvis, chest, getPoint(bones.hips), [0.50, 0.42, 0.36]);
    ballJoint('neck', chest, head, getPoint(bones.neck), [0.38, 0.34, 0.28]);
    ballJoint('left-shoulder', chest, leftUpperArm, getPoint(bones.leftUpperArm), [1.45, 1.25, 0.90]);
    hingeJoint('left-elbow', leftUpperArm, leftForeArm, getPoint(bones.leftForeArm), getHingeAxis('leftUpperArm','leftForeArm','leftHand', readNode(bones.leftUpperArm).rotation), -0.22, 2.42);
    ballJoint('right-shoulder', chest, rightUpperArm, getPoint(bones.rightUpperArm), [1.45, 1.25, 0.90]);
    hingeJoint('right-elbow', rightUpperArm, rightForeArm, getPoint(bones.rightForeArm), getHingeAxis('rightUpperArm','rightForeArm','rightHand', readNode(bones.rightUpperArm).rotation), -0.22, 2.42);
    ballJoint('left-hip', pelvis, leftThigh, getPoint(bones.leftThigh), [1.00, 0.85, 0.72]);
    hingeJoint('left-knee', leftThigh, leftShin, getPoint(bones.leftShin), getHingeAxis('leftThigh','leftShin','leftFoot', readNode(bones.leftThigh).rotation), -0.22, 2.50);
    ballJoint('right-hip', pelvis, rightThigh, getPoint(bones.rightThigh), [1.00, 0.85, 0.72]);
    hingeJoint('right-knee', rightThigh, rightShin, getPoint(bones.rightShin), getHingeAxis('rightThigh','rightShin','rightFoot', readNode(bones.rightThigh).rotation), -0.22, 2.50);


  } catch (error) {
    dispose();
    throw error;
  }

  const readBodyTransform = record => {
    const worldTransform = record.body.getWorldTransform();
    const p = worldTransform.getOrigin(), q = worldTransform.getRotation();
    return {
      position: [p.x(), p.y(), p.z()],
      rotation: quatNormalize([q.x(), q.y(), q.z(), q.w()])
    };
  };

  const makePose = () => {
    const pose = {};
    for (const record of segments) {
      const t = readBodyTransform(record);
      pose[record.boneKey] = {
        position: add(t.position, rotate(t.rotation, record.offsetPosition)),
        rotation: quatNormalize(quatMultiply(t.rotation, record.offsetRotation))
      };
    }
    return pose;
  };

  const syncToRig = () => {
    rig.applyRagdollPose(makePose());
  };

  const getHandoffWeight = () => smoothStep01(handoffElapsed / handoffSeconds);
  const applyHandoffPose = physicsPose => {
    const weight = getHandoffWeight();
    const displayPose = weight < 1 ? interpolateCharacterPose(animatedPose, physicsPose, weight) : physicsPose;
    if (displayPose) rig.applyRagdollPose(displayPose);
    lastPose = displayPose || physicsPose;
    return lastPose;
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const joint of constraints) {
      try { world.removeConstraint(joint); } catch {}
    }
    for (const record of segments) {
      try { world.removeRigidBody(record.body); } catch {}
    }
    for (let i = resources.length - 1; i >= 0; i--) {
      try { Ammo.destroy(resources[i]); } catch {}
    }
    resources.length = 0;
  }

  return {
    step(dt) {
      if (disposed) return null;
      const h = Math.max(0, Math.min(0.05, Number(dt) || 0));
      if (h <= 0) return this.getState();
      world.stepSimulation(h, 4, 1 / 60);
      handoffElapsed = Math.min(handoffSeconds, handoffElapsed + h);
      const physicsPose = makePose();
      const pose = applyHandoffPose(physicsPose);
      stepCount++;
      return { ...this.getState(), pose };
    },
    getPose() { return makePose(); },
    getState() {
      const pelvisRecord = bodies.get('pelvis');
      const root = pelvisRecord ? readBodyTransform(pelvisRecord) : null;
      let maxBodySpeed = 0, maxAngularSpeed = 0;
      for (const record of segments) {
        const velocity = record.body.getLinearVelocity?.();
        const angular = record.body.getAngularVelocity?.();
        if (velocity) maxBodySpeed = Math.max(maxBodySpeed, Math.hypot(velocity.x(), velocity.y(), velocity.z()));
        if (angular) maxAngularSpeed = Math.max(maxAngularSpeed, Math.hypot(angular.x(), angular.y(), angular.z()));
      }
      const jointConfigurations = jointRecords.map(record => {
        let angle = null, appliedImpulse = null;
        try { if (record.type === 'hinge' && typeof record.joint.getHingeAngle === 'function') angle = record.joint.getHingeAngle(); } catch {}
        try { if (typeof record.joint.getAppliedImpulse === 'function') appliedImpulse = record.joint.getAppliedImpulse(); } catch {}
        return { name: record.name, type: record.type, limits: record.limits.slice(), softness: record.softness, biasFactor: record.biasFactor, relaxationFactor: record.relaxationFactor, angle, appliedImpulse };
      });
      const hingeLimitViolations = jointConfigurations.filter(record => record.type === 'hinge' && Number.isFinite(record.angle) &&
        (record.angle < record.limits[0] - 0.03 || record.angle > record.limits[1] + 0.03)).map(record => record.name);
      const bodyMasses = Object.fromEntries(segments.map(record => [record.name, record.mass]));
      const rootVelocity = pelvisRecord?.body.getLinearVelocity?.();
      return {
        active: !disposed,
        bodyCount: segments.length,
        constraintCount: constraints.length,
        stepCount,
        phase: getHandoffWeight() < 1 ? 'handoff-blend' : 'ragdoll',
        handoffWeight: getHandoffWeight(),
        handoffDuration: handoffSeconds,
        maxBodySpeed,
        maxAngularSpeed,
        rootLinearVelocity: rootVelocity ? [rootVelocity.x(), rootVelocity.y(), rootVelocity.z()] : null,
        totalMass: segments.reduce((sum, record) => sum + record.mass, 0),
        bodyMasses,
        jointConfigurations,
        hingeLimitViolations,
        rootPosition: root?.position || null,
        rootRotation: root?.rotation || null,
        bodyNames: segments.map(item => item.name)
      };
    },
    dispose
  };
}
