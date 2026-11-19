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
export function createCharacterRagdoll({ Ammo, world, rig, initialVelocity = [0, 0, 0] } = {}) {
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
  const bodies = new Map();
  const segments = [];
  const constraints = [];
  let disposed = false;
  let stepCount = 0;

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
    body.setDamping(0.07, 0.72);
    body.setActivationState(4);
    body.setUserIndex(2300 + segments.length);
    body.setLinearVelocity(vector(initialVelocity.map(v => Number(v) || 0)));
    world.addRigidBody(body, 2, 1);
    const inverse = quatInverse(bodyRotation);
    const offsetPosition = rotate(inverse, sub(bonePose.position, center));
    const offsetRotation = quatNormalize(quatMultiply(inverse, bonePose.rotation));
    const record = { name, boneKey, node: bones[boneKey], body, center: center.slice(), bodyRotation: bodyRotation.slice(), offsetPosition, offsetRotation };
    bodies.set(name, record);
    segments.push(record);
    return record;
  };

  const capsuleBody = (name, boneKey, childKey, radius, mass) => {
    const node = bones[boneKey], child = bones[childKey];
    const start = getPoint(node), end = getPoint(child), pose = readNode(node);
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
    joint.setLimit(limits[0], limits[1], limits[2]);
    world.addConstraint(joint, true);
    constraints.push(joint);
    return joint;
  };

  const hingeJoint = (name, bodyA, bodyB, anchor, low = -0.18, high = 2.35) => {
    const invA = quatInverse(bodyA.bodyRotation), invB = quatInverse(bodyB.bodyRotation);
    const pivotA = vector(rotate(invA, sub(anchor, bodyA.center)));
    const pivotB = vector(rotate(invB, sub(anchor, bodyB.center)));
    const axisWorld = [1, 0, 0];
    const axisA = vector(normalize(rotate(invA, axisWorld)));
    const axisB = vector(normalize(rotate(invB, axisWorld)));
    const joint = own(new Ammo.btHingeConstraint(bodyA.body, bodyB.body, pivotA, pivotB, axisA, axisB, true));
    joint.setLimit(low, high, 0.9, 0.3, 1);
    world.addConstraint(joint, true);
    constraints.push(joint);
    return joint;
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
      8.5, hipsPose.position, hipsPose.rotation, hipsPose
    );
    const chest = capsuleBody('chest', 'spine2', 'neck', 0.135, 12);
    const headPose = readNode(bones.head);
    const headCenter = add(headPose.position, rotate(headPose.rotation, [0, 0.065, 0]));
    const head = makeNodeBody('head', 'head', new Ammo.btSphereShape(0.115), 4, headCenter, headPose.rotation, headPose);

    const leftUpperArm = capsuleBody('left-upper-arm', 'leftUpperArm', 'leftForeArm', 0.062, 1.8);
    const leftForeArm = capsuleBody('left-forearm', 'leftForeArm', 'leftHand', 0.052, 1.2);
    const rightUpperArm = capsuleBody('right-upper-arm', 'rightUpperArm', 'rightForeArm', 0.062, 1.8);
    const rightForeArm = capsuleBody('right-forearm', 'rightForeArm', 'rightHand', 0.052, 1.2);
    const leftThigh = capsuleBody('left-thigh', 'leftThigh', 'leftShin', 0.088, 4.7);
    const leftShin = capsuleBody('left-shin', 'leftShin', 'leftFoot', 0.068, 3.3);
    const rightThigh = capsuleBody('right-thigh', 'rightThigh', 'rightShin', 0.088, 4.7);
    const rightShin = capsuleBody('right-shin', 'rightShin', 'rightFoot', 0.068, 3.3);

    ballJoint('spine', pelvis, chest, getPoint(bones.spine2), [0.65, 0.55, 0.5]);
    ballJoint('neck', chest, head, getPoint(bones.neck), [0.45, 0.4, 0.35]);
    ballJoint('left-shoulder', chest, leftUpperArm, getPoint(bones.leftUpperArm), [1.05, 0.9, 0.75]);
    hingeJoint('left-elbow', leftUpperArm, leftForeArm, getPoint(bones.leftForeArm), -2.2, 2.2);
    ballJoint('right-shoulder', chest, rightUpperArm, getPoint(bones.rightUpperArm), [1.05, 0.9, 0.75]);
    hingeJoint('right-elbow', rightUpperArm, rightForeArm, getPoint(bones.rightForeArm), -2.2, 2.2);
    ballJoint('left-hip', pelvis, leftThigh, getPoint(bones.leftThigh), [0.9, 0.75, 0.65]);
    hingeJoint('left-knee', leftThigh, leftShin, getPoint(bones.leftShin), -0.15, 2.35);
    ballJoint('right-hip', pelvis, rightThigh, getPoint(bones.rightThigh), [0.9, 0.75, 0.65]);
    hingeJoint('right-knee', rightThigh, rightShin, getPoint(bones.rightShin), -0.15, 2.35);


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
      const pose = makePose();
      rig.applyRagdollPose(pose);
      stepCount++;
      return { ...this.getState(), pose };
    },
    getPose() { return makePose(); },
    getState() {
      const pelvisRecord = bodies.get('pelvis');
      const root = pelvisRecord ? readBodyTransform(pelvisRecord) : null;
      return {
        active: !disposed,
        bodyCount: segments.length,
        constraintCount: constraints.length,
        stepCount,
        rootPosition: root?.position || null,
        rootRotation: root?.rotation || null,
        bodyNames: segments.map(item => item.name)
      };
    },
    dispose
  };
}
