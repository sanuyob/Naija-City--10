import * as pc from 'playcanvas';

function makeMaterial(name, rgb, roughness = 0.78) {
  const material = new pc.StandardMaterial();
  material.name = name;
  material.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
  material.shininess = (1 - roughness) * 72;
  material.update();
  return material;
}

function addPart(parent, name, type, scale, position, material, rotation = [0, 0, 0]) {
  const part = new pc.Entity(name);
  part.addComponent('render', { type, material });
  part.setLocalScale(scale[0], scale[1], scale[2]);
  part.setLocalPosition(position[0], position[1], position[2]);
  part.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
  parent.addChild(part);
  return part;
}

function createProceduralOfficer(app, position, materials) {
  const root = new pc.Entity('naija-city-police-officer-procedural');
  const limbs = {
    leftArm: addPart(root, 'uniform-left-arm', 'capsule', [.12, .43, .12], [-.29, 1.13, 0], materials.uniform),
    rightArm: addPart(root, 'uniform-right-arm', 'capsule', [.12, .43, .12], [.29, 1.13, 0], materials.uniform),
    leftLeg: addPart(root, 'uniform-left-leg', 'capsule', [.14, .48, .14], [-.12, .48, 0], materials.dark),
    rightLeg: addPart(root, 'uniform-right-leg', 'capsule', [.14, .48, .14], [.12, .48, 0], materials.dark)
  };
  addPart(root, 'uniform-torso', 'box', [.43, .64, .24], [0, 1.12, 0], materials.uniform);
  addPart(root, 'officer-head', 'sphere', [.22, .25, .21], [0, 1.60, 0], materials.skin);
  addPart(root, 'uniform-cap', 'cylinder', [.25, .07, .25], [0, 1.77, 0], materials.dark);
  root.tags.add('ambient-pedestrian');
  root.tags.add('police-patrol-npc');
  root.setPosition(position[0], position[1], position[2]);
  app.root.addChild(root);
  return { root, limbs };
}

function createProceduralPoliceCar(app, position, materials) {
  const root = new pc.Entity('naija-city-police-patrol-car-procedural');
  root.tags.add('parked-traffic-vehicle');
  root.tags.add('police-patrol-visual');
  // Decorative parked vehicle only: no driving or collision system.
  addPart(root, 'patrol-car-lower-body', 'box', [1.55, .48, 3.35], [0, .67, 0], materials.navy);
  addPart(root, 'patrol-car-upper-body', 'box', [1.36, .62, 1.72], [0, 1.18, -.10], materials.glass);
  addPart(root, 'patrol-car-roof', 'box', [1.38, .09, 1.78], [0, 1.53, -.10], materials.navy);
  addPart(root, 'patrol-car-side-stripe-left', 'box', [.025, .16, 2.12], [-.789, .82, -.05], materials.white);
  addPart(root, 'patrol-car-side-stripe-right', 'box', [.025, .16, 2.12], [.789, .82, -.05], materials.white);
  addPart(root, 'patrol-car-door-panel-left', 'box', [.018, .24, .52], [-.805, .84, -.18], materials.white);
  addPart(root, 'patrol-car-door-panel-right', 'box', [.018, .24, .52], [.805, .84, -.18], materials.white);
  addPart(root, 'patrol-car-front-bumper', 'box', [1.58, .12, .14], [0, .46, 1.70], materials.trim);
  addPart(root, 'patrol-car-rear-bumper', 'box', [1.58, .12, .14], [0, .46, -1.70], materials.trim);
  for (const side of [-1, 1]) for (const z of [-1.08, 1.08]) {
    addPart(root, 'patrol-car-wheel', 'cylinder', [.15, .27, .27], [side * .78, .36, z], materials.rubber, [0, 0, 90]);
    addPart(root, 'patrol-car-wheel-hub', 'cylinder', [.16, .12, .12], [side * .80, .36, z], materials.trim, [0, 0, 90]);
  }
  addPart(root, 'patrol-roof-lightbar', 'box', [.72, .10, .20], [0, 1.64, .03], materials.dark);
  addPart(root, 'patrol-light-red', 'box', [.28, .13, .20], [-.20, 1.76, .03], materials.red);
  addPart(root, 'patrol-light-blue', 'box', [.28, .13, .20], [.20, 1.76, .03], materials.blue);
  addPart(root, 'patrol-headlight-left', 'box', [.20, .13, .035], [-.52, .78, 1.69], materials.lamp);
  addPart(root, 'patrol-headlight-right', 'box', [.20, .13, .035], [.52, .78, 1.69], materials.lamp);
  addPart(root, 'patrol-tail-left', 'box', [.18, .13, .035], [-.52, .78, -1.69], materials.red);
  addPart(root, 'patrol-tail-right', 'box', [.18, .13, .035], [.52, .78, -1.69], materials.red);
  root.setPosition(position[0], position[1], position[2]);
  root.setEulerAngles(0, 180, 0);
  app.root.addChild(root);
  return root;
}

/**
 * Offline-safe ambient police patrol.
 * Both characters are generated locally; no third-party model requests are made.
 * This is neighbourhood ambience only, not an enforcement or combat system.
 */
export function createPolicePatrolSystem({ app, playerPhysics, lowMemoryDevice = false, onStatus = () => {} } = {}) {
  if (!app) throw new Error('Police patrol requires the PlayCanvas app.');

  const materials = {
    uniform: makeMaterial('patrol-uniform-navy', [.035, .075, .16]),
    dark: makeMaterial('patrol-uniform-dark', [.018, .025, .04]),
    skin: makeMaterial('patrol-officer-skin', [.48, .29, .20]),
    navy: makeMaterial('patrol-car-navy', [.025, .065, .14]),
    white: makeMaterial('patrol-car-white', [.78, .82, .82]),
    glass: makeMaterial('patrol-car-glass', [.08, .15, .19], .38),
    trim: makeMaterial('patrol-car-trim', [.20, .23, .24], .48),
    rubber: makeMaterial('patrol-car-rubber', [.012, .015, .018], .94),
    red: makeMaterial('patrol-light-red', [.80, .045, .035], .36),
    blue: makeMaterial('patrol-light-blue', [.035, .20, .90], .36),
    lamp: makeMaterial('patrol-headlamp', [.92, .82, .55], .32)
  };
  const route = [[8.2, 0, -18], [8.2, 0, -29], [10.8, 0, -29], [10.8, 0, -18]];
  const carPosition = [11.6, 0, -33.5];
  const officerParts = createProceduralOfficer(app, route[0], materials);
  const officer = officerParts.root;
  const patrolCar = createProceduralPoliceCar(app, carPosition, materials);
  const speed = .78;
  let destroyed = false, elapsed = 0, gaitClock = 0, waypoint = 0;
  const state = 'active';
  onStatus('Procedural police patrol added to the neighbourhood.');

  function update(deltaSeconds) {
    if (destroyed) return;
    elapsed += Math.max(0, Math.min(.05, Number(deltaSeconds) || 0));
    if (elapsed < .05) return;
    const dt = elapsed;
    elapsed = 0;
    gaitClock += dt;
    const target = route[waypoint];
    const p = officer.getPosition();
    const dx = target[0] - p.x, dz = target[2] - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .28) { waypoint = (waypoint + 1) % route.length; return; }
    const step = Math.min(distance, speed * dt);
    const x = p.x + dx / distance * step, z = p.z + dz / distance * step;
    let y = p.y;
    const hit = playerPhysics?.raycast?.([x, p.y + .8, z], [x, p.y - 1.2, z]);
    if (hit?.point) y = hit.point[1];
    officer.setPosition(x, y, z);
    officer.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
    const swing = Math.sin(gaitClock * 7.2) * 18;
    officerParts.limbs.leftArm.setLocalEulerAngles(0, 0, swing);
    officerParts.limbs.rightArm.setLocalEulerAngles(0, 0, -swing);
    officerParts.limbs.leftLeg.setLocalEulerAngles(0, 0, -swing * .65);
    officerParts.limbs.rightLeg.setLocalEulerAngles(0, 0, swing * .65);
  }

  function getState() {
    return {
      state, ai: 'four-waypoint pedestrian patrol',
      officerLoaded: Boolean(officer), carLoaded: Boolean(patrolCar),
      officerPosition: officer.getPosition().toArray(), carPosition: patrolCar.getPosition().toArray(),
      animation: 'procedural walk cycle', assetMode: 'offline-procedural',
      externalRequests: 0, lowMemoryProfile: Boolean(lowMemoryDevice), loadError: null
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    officer.destroy();
    patrolCar.destroy();
    for (const material of Object.values(materials)) material.destroy();
  }

  return { update, getState, destroy };
}
