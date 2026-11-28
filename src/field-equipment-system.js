import * as pc from 'playcanvas';

export const FIELD_EQUIPMENT_DEFINITIONS = Object.freeze([
  { id: 'field-radio', name: 'Field Radio', shortName: 'RADIO', description: 'Communications and location pings', kind: 'communication', cooldown: 1.4, maxCount: 1 },
  { id: 'repair-kit', name: 'Repair Kit', shortName: 'REPAIR', description: 'Utility kit for service-point interactions', kind: 'maintenance', cooldown: 4, maxCount: 2 },
  { id: 'survey-beacon', name: 'Survey Beacon', shortName: 'BEACON', description: 'Marks your current location with a visual pulse', kind: 'navigation', cooldown: 2.5, maxCount: 3 },
  { id: 'scout-drone', name: 'Scout Drone', shortName: 'DRONE', description: 'Deploy a camera drone to scout streets and rooftops', kind: 'remote-scouting', cooldown: 2, maxCount: 1 }
]);

export const FIELD_EQUIPMENT_DEFAULT_INVENTORY = Object.freeze({
  'field-radio': 1,
  'repair-kit': 1,
  'survey-beacon': 2,
  'scout-drone': 1
});

export const FIELD_EQUIPMENT_DEFAULT_SLOTS = Object.freeze([
  'field-radio',
  'survey-beacon',
  'repair-kit',
  'scout-drone'
]);

const DEFINITION_MAP = new Map(FIELD_EQUIPMENT_DEFINITIONS.map(item => [item.id, item]));

export function normalizeFieldEquipmentInventory(value = {}) {
  const inventory = {};
  for (const item of FIELD_EQUIPMENT_DEFINITIONS) {
    const raw = Number(value[item.id] ?? FIELD_EQUIPMENT_DEFAULT_INVENTORY[item.id] ?? 0);
    inventory[item.id] = Number.isFinite(raw) ? Math.max(0, Math.min(item.maxCount, Math.floor(raw))) : 0;
  }
  return inventory;
}

export function stepDroppedFieldProp(body, deltaSeconds, groundHit = null) {
  const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
  const next = {
    ...body,
    position: body.position.slice(),
    velocity: body.velocity.slice(),
    rotationY: (Number(body.rotationY) || 0) + dt * (Number(body.spin) || 0),
    bounceCount: Math.max(0, Math.floor(Number(body.bounceCount) || 0)),
    settled: Boolean(body.settled)
  };
  if (next.settled || dt <= 0) return next;

  const drag = Math.exp(-2.2 * dt);
  next.velocity[0] *= drag;
  next.velocity[2] *= drag;
  next.velocity[1] -= 15.5 * dt;
  next.position[0] += next.velocity[0] * dt;
  next.position[1] += next.velocity[1] * dt;
  next.position[2] += next.velocity[2] * dt;

  const radius = Math.max(0.08, Number(body.radius) || 0.16);
  if (groundHit?.point && next.velocity[1] <= 0 && next.position[1] <= groundHit.point[1] + radius) {
    next.position[1] = groundHit.point[1] + radius;
    const impactSpeed = Math.abs(next.velocity[1]);
    if (impactSpeed > 0.7 && next.bounceCount < 1) {
      next.velocity[1] = impactSpeed * 0.18;
      next.bounceCount += 1;
    } else {
      next.velocity[1] = 0;
      next.velocity[0] *= 0.35;
      next.velocity[2] *= 0.35;
      next.settled = Math.hypot(next.velocity[0], next.velocity[2]) < 0.12;
    }
  }
  return next;
}

/** Deterministic, frame-capped scout-drone movement used by the runtime and tests. */
export function stepScoutDrone(state, deltaSeconds, controls = {}) {
  const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
  const next = {
    ...state,
    position: state.position.slice(),
    battery: Math.max(0, Number(state.battery) || 0)
  };
  if (dt <= 0 || next.battery <= 0) return next;
  const yaw = Number(state.headingRadians) || 0;
  const x = Math.max(-1, Math.min(1, Number(controls.x) || 0));
  const y = Math.max(-1, Math.min(1, Number(controls.y) || 0));
  const magnitude = Math.hypot(x, y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw);
  const speed = 5.4;
  next.position[0] += (rightX * x + forwardX * y) * speed * scale * dt;
  next.position[2] += (rightZ * x + forwardZ * y) * speed * scale * dt;
  const vertical = Math.max(-1, Math.min(1, Number(controls.vertical) || 0));
  next.position[1] = Math.max(state.homePosition[1] + 2.8,
    Math.min(state.homePosition[1] + 18, next.position[1] + vertical * 3.2 * dt));
  const dx = next.position[0] - state.homePosition[0];
  const dz = next.position[2] - state.homePosition[2];
  const distance = Math.hypot(dx, dz);
  if (distance > 55) {
    next.position[0] = state.homePosition[0] + dx / distance * 55;
    next.position[2] = state.homePosition[2] + dz / distance * 55;
  }
  next.battery = Math.max(0, next.battery - dt * 0.28);
  return next;
}

/** Mobile-first non-combat field equipment, visual carry props and dropped-item physics. */
export function createFieldEquipmentSystem({
  app,
  player,
  playerController,
  playerPhysics,
  vfxSystem,
  audioSystem,
  lowMemoryDevice = false,
  onStatus = () => {}
} = {}) {
  if (!app || !player || !playerController) {
    throw new Error('Field equipment requires the game app, player entity and player controller.');
  }

  const storageKey = 'naija-city-field-equipment-v1';
  const materials = {};
  const makeMaterial = (name, color, roughness = 0.7) => {
    const material = new pc.StandardMaterial();
    material.name = name;
    material.diffuse = new pc.Color(color[0], color[1], color[2]);
    material.shininess = (1 - roughness) * 72;
    material.update();
    materials[name] = material;
    return material;
  };

  makeMaterial('field-case-charcoal', [0.075, 0.105, 0.105], 0.66);
  makeMaterial('field-case-green', [0.12, 0.28, 0.22], 0.72);
  makeMaterial('field-screen-blue', [0.12, 0.38, 0.48], 0.28);
  makeMaterial('field-trim-metal', [0.43, 0.48, 0.46], 0.42);
  makeMaterial('field-beacon-cyan', [0.12, 0.66, 0.72], 0.34);
  makeMaterial('field-rubber', [0.025, 0.035, 0.035], 0.92);
  makeMaterial('field-drone-carbon', [0.045, 0.06, 0.07], 0.5);
  makeMaterial('field-drone-arm', [0.17, 0.21, 0.22], 0.46);
  makeMaterial('field-drone-led', [0.08, 0.72, 0.62], 0.22);

  function addBox(parent, name, position, scale, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box', material });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    parent.addChild(entity);
    return entity;
  }

  function addSphere(parent, name, position, scale, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'sphere', material });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    parent.addChild(entity);
    return entity;
  }

  function buildProp(itemId, parent, prefix = 'field-gear') {
    const group = new pc.Entity(prefix + '-' + itemId);
    parent.addChild(group);
    const charcoal = materials['field-case-charcoal'];
    const green = materials['field-case-green'];
    const metal = materials['field-trim-metal'];
    const screen = materials['field-screen-blue'];
    const rubber = materials['field-rubber'];

    if (itemId === 'field-radio') {
      addBox(group, 'radio-body', [0, 0, 0], [0.22, 0.32, 0.105], green);
      addBox(group, 'radio-screen', [0, 0.075, 0.057], [0.135, 0.075, 0.012], screen);
      addBox(group, 'radio-speaker', [0, -0.075, 0.058], [0.13, 0.075, 0.012], charcoal);
      addBox(group, 'radio-antenna', [0.075, 0.205, 0], [0.018, 0.16, 0.018], metal);
      addSphere(group, 'radio-knob', [-0.073, 0.145, 0.055], [0.045, 0.045, 0.025], metal);
      addBox(group, 'radio-belt-clip', [0, -0.17, -0.06], [0.12, 0.035, 0.018], metal);
    } else if (itemId === 'repair-kit') {
      addBox(group, 'repair-case', [0, 0, 0], [0.31, 0.23, 0.19], charcoal);
      addBox(group, 'repair-lid', [0, 0.13, 0], [0.32, 0.045, 0.20], green);
      addBox(group, 'repair-handle-top', [0, 0.19, 0], [0.13, 0.035, 0.045], metal);
      addBox(group, 'repair-latch', [0, 0.02, 0.102], [0.055, 0.065, 0.018], metal);
      addBox(group, 'repair-label', [0, -0.035, 0.101], [0.13, 0.04, 0.012], screen);
      addBox(group, 'repair-foot-left', [-0.10, -0.135, 0], [0.07, 0.035, 0.13], rubber);
      addBox(group, 'repair-foot-right', [0.10, -0.135, 0], [0.07, 0.035, 0.13], rubber);
    } else if (itemId === 'survey-beacon') {
      addBox(group, 'beacon-body', [0, 0, 0], [0.19, 0.25, 0.15], charcoal);
      addBox(group, 'beacon-face', [0, 0.02, 0.083], [0.12, 0.11, 0.014], materials['field-beacon-cyan']);
      addSphere(group, 'beacon-dome', [0, 0.16, 0], [0.12, 0.07, 0.12], screen);
      addBox(group, 'beacon-base', [0, -0.14, 0], [0.22, 0.035, 0.18], metal);
      addBox(group, 'beacon-foot', [0, -0.18, 0], [0.13, 0.04, 0.11], green);
    } else if (itemId === 'scout-drone') {
      const droneBody = materials['field-drone-carbon'];
      const droneArm = materials['field-drone-arm'];
      const led = materials['field-drone-led'];
      addBox(group, 'drone-central-body', [0, 0, 0], [0.34, 0.105, 0.25], droneBody);
      addBox(group, 'drone-top-shell', [0, 0.065, -0.015], [0.22, 0.055, 0.18], green);
      addSphere(group, 'drone-front-camera', [0, -0.018, -0.14], [0.085, 0.07, 0.055], screen);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = sx * 0.23, z = sz * 0.19;
        const arm = addBox(group, 'drone-arm-' + sx + '-' + sz, [x * 0.52, 0, z * 0.52], [0.34, 0.04, 0.055], droneArm);
        arm.setLocalEulerAngles(0, sx === sz ? 42 : -42, 0);
        addSphere(group, 'drone-motor-' + sx + '-' + sz, [x, 0.045, z], [0.085, 0.045, 0.085], metal);
        const rotor = addBox(group, 'drone-rotor-' + sx + '-' + sz, [x, 0.075, z], [0.25, 0.018, 0.045], charcoal);
        rotor.tags.add('scout-drone-rotor');
        addSphere(group, 'drone-led-' + sx + '-' + sz, [x, -0.025, z], [0.045, 0.035, 0.045], led);
      }
    }
    group.setLocalScale(1, 1, 1);
    return group;
  }

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {}
  const inventory = normalizeFieldEquipmentInventory(saved?.inventory || FIELD_EQUIPMENT_DEFAULT_INVENTORY);
  const quickSlots = FIELD_EQUIPMENT_DEFAULT_SLOTS.map((fallback, index) => {
    const candidate = saved?.quickSlots?.[index];
    return DEFINITION_MAP.has(candidate) ? candidate : fallback;
  });
  const cooldowns = Object.fromEntries(FIELD_EQUIPMENT_DEFINITIONS.map(item => [item.id, 0]));
  const stats = { equips: 0, stows: 0, uses: 0, drops: 0, pickups: 0, physicsSteps: 0, groundContacts: 0 };
  const maximumDrops = lowMemoryDevice ? 3 : 6;
  const droppedProps = [];
  let scoutDrone = null;
  let droneEntity = null;
  let droneVerticalInput = 0;
  let dronePanInput = 0;
  let droneInput = { x: 0, y: 0 };
  let droneRotorAngle = 0;
  function findRightHandBone(root) {
    const wanted = ['righthand', 'handr', 'righthandindex1', 'mixamorigrighthand'];
    const stack = [...(root.children || [])];
    while (stack.length) {
      const node = stack.pop();
      const normalized = String(node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (wanted.some(name => normalized === name || normalized.endsWith(name))) return node;
      stack.push(...(node.children || []));
    }
    return null;
  }

  const rightHandBone = findRightHandBone(player);
  const carrier = new pc.Entity('field-equipment-carry-anchor');
  carrier.setLocalPosition(rightHandBone ? 0.01 : 0.32, rightHandBone ? 0.015 : 1.02, rightHandBone ? 0.035 : 0.20);
  carrier.setLocalEulerAngles(rightHandBone ? 0 : 8, rightHandBone ? 0 : 8, 0);
  (rightHandBone || player).addChild(carrier);

  const equippedModels = new Map();
  for (const item of FIELD_EQUIPMENT_DEFINITIONS) {
    const model = buildProp(item.id, carrier, 'carried');
    model.enabled = false;
    model.setLocalScale(0.001, 0.001, 0.001);
    equippedModels.set(item.id, model);
  }

  let activeItemId = null;
  let transition = null;
  let destroyed = false;

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ inventory, quickSlots }));
    } catch {}
  }

  function status(message, ok = true) {
    const result = { ok, message };
    onStatus(message, result);
    return result;
  }

  function launchScoutDrone() {
    if (scoutDrone) return status('SCOUT DRONE · already airborne. Use RECALL to bring it home.', false);
    const playerState = playerController.getState();
    const homePosition = playerState.position.slice();
    const headingRadians = (Number(playerState.facingYaw) || 0) * Math.PI / 180;
    scoutDrone = {
      position: [homePosition[0], homePosition[1] + 3.2, homePosition[2]],
      homePosition,
      headingRadians,
      battery: 100,
      deployed: true,
      flightSeconds: 0
    };
    droneEntity = buildProp('scout-drone', app.root, 'deployed');
    droneEntity.setPosition(...scoutDrone.position);
    droneEntity.setEulerAngles(0, Number(playerState.facingYaw) || 0, 0);
    droneEntity.setLocalScale(1.12, 1.12, 1.12);
    droneInput = { x: 0, y: 0 };
    droneVerticalInput = 0;
    dronePanInput = 0;
    playerController.setControlEnabled(false);
    audioSystem?.play?.('gearEquip');
    return status('SCOUT DRONE · link established. Left stick flies; UP/DOWN changes altitude.');
  }

  function recallScoutDrone(reason = 'Drone recalled to operator.') {
    if (!scoutDrone) return status('No scout drone is airborne.', false);
    droneEntity?.destroy();
    droneEntity = null;
    scoutDrone = null;
    droneInput = { x: 0, y: 0 };
    droneVerticalInput = 0;
    dronePanInput = 0;
    playerController.clearExternalCameraPose?.();
    playerController.setControlEnabled(true);
    playerController.resetCameraAfterVehicle?.();
    audioSystem?.play?.('gearEquip');
    return status('SCOUT DRONE · ' + reason);
  }

  function setDroneInput(x = 0, y = 0) {
    droneInput = {
      x: Math.max(-1, Math.min(1, Number(x) || 0)),
      y: Math.max(-1, Math.min(1, Number(y) || 0))
    };
    return Boolean(scoutDrone);
  }

  function setDroneVertical(value = 0) {
    droneVerticalInput = Math.max(-1, Math.min(1, Number(value) || 0));
    return Boolean(scoutDrone);
  }

  function setDronePan(value = 0) {
    dronePanInput = Math.max(-1, Math.min(1, Number(value) || 0));
    return Boolean(scoutDrone);
  }

  function getDroneState() {
    return scoutDrone ? {
      active: true,
      position: scoutDrone.position.slice(),
      battery: Math.round(scoutDrone.battery),
      flightSeconds: Number(scoutDrone.flightSeconds.toFixed(1)),
      maximumRangeMetres: 55,
      headingRadians: scoutDrone.headingRadians,
      altitudeMetres: Number((scoutDrone.position[1] - scoutDrone.homePosition[1]).toFixed(1))
    } : { active: false, battery: 100, maximumRangeMetres: 55 };
  }

  function equip(itemId) {
    if (!DEFINITION_MAP.has(itemId)) return status('Unknown field item.', false);
    if (inventory[itemId] <= 0) return status('That item is not in your bag.', false);
    if (activeItemId === itemId) return stow();
    if (activeItemId) {
      const previous = equippedModels.get(activeItemId);
      if (previous) previous.enabled = false;
    }
    activeItemId = itemId;
    const model = equippedModels.get(itemId);
    model.enabled = true;
    model.setLocalScale(0.001, 0.001, 0.001);
    model.setLocalPosition(0, -0.08, 0.10);
    transition = { itemId, elapsed: 0, duration: 0.18, from: 0.001, to: 1, action: 'equip' };
    stats.equips++;
    audioSystem?.play?.('gearEquip');
    persist();
    return status(DEFINITION_MAP.get(itemId).name + ' equipped.');
  }

  function stow() {
    if (!activeItemId) return status('No field item is equipped.', false);
    const itemId = activeItemId;
    transition = { itemId, elapsed: 0, duration: 0.14, from: 1, to: 0.001, action: 'stow' };
    activeItemId = null;
    stats.stows++;
    audioSystem?.play?.('gearEquip');
    return status(DEFINITION_MAP.get(itemId).name + ' stowed.');
  }

  function equipSlot(slotNumber) {
    const index = Math.floor(Number(slotNumber)) - 1;
    if (index < 0 || index >= quickSlots.length) return status('That quick slot does not exist.', false);
    const itemId = quickSlots[index];
    if (!itemId) return status('Quick slot ' + (index + 1) + ' is empty.', false);
    return equip(itemId);
  }

  function activate(itemId = activeItemId) {
    if (!itemId || !DEFINITION_MAP.has(itemId)) return status('Equip a field item first.', false);
    if (inventory[itemId] <= 0) return status('That item is not in your bag.', false);
    if (itemId === 'scout-drone') {
      if (scoutDrone) return recallScoutDrone();
      if (activeItemId !== itemId) equip(itemId);
      return launchScoutDrone();
    }
    if (activeItemId !== itemId) equip(itemId);
    if (cooldowns[itemId] > 0) return status('Ready in ' + cooldowns[itemId].toFixed(1) + 's.', false);

    const playerState = playerController.getState();
    const position = playerState.position.slice();
    let message = '';
    if (itemId === 'field-radio') {
      vfxSystem?.emit?.('scan', [position[0], position[1] + 0.85, position[2]], 0.7, 'concrete');
      audioSystem?.play?.('utilityPing');
      message = 'FIELD RADIO · location ping sent.';
    } else if (itemId === 'survey-beacon') {
      vfxSystem?.emit?.('arrival', position, 0.9, 'concrete');
      audioSystem?.play?.('utilityPing');
      message = 'SURVEY BEACON · current position marked.';
    } else if (itemId === 'repair-kit') {
      vfxSystem?.emit?.('arrival', position, 0.45, 'metal');
      audioSystem?.play?.('repairReady');
      message = 'REPAIR KIT · ready for a mechanic or vehicle-service interaction.';
    }

    cooldowns[itemId] = DEFINITION_MAP.get(itemId).cooldown;
    stats.uses++;
    return status(message || 'Field item used.');
  }

  function drop(itemId = activeItemId) {
    if (!itemId || !DEFINITION_MAP.has(itemId)) return status('Choose an item to drop.', false);
    if (itemId === 'scout-drone') return status('The scout drone is reusable field equipment and cannot be dropped.', false);
    if (inventory[itemId] <= 0) return status('No spare item is available to drop.', false);
    if (activeItemId === itemId) stow();

    const playerState = playerController.getState();
    const yaw = (Number(playerState.facingYaw) || 0) * Math.PI / 180;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const position = playerState.position;
    const entity = buildProp(itemId, app.root, 'dropped');
    const start = [
      position[0] + forwardX * 0.72,
      position[1] + 0.78,
      position[2] + forwardZ * 0.72
    ];
    entity.setPosition(start[0], start[1], start[2]);
    entity.setEulerAngles(8, (Number(playerState.facingYaw) || 0) + 20, 0);
    entity.setLocalScale(0.78, 0.78, 0.78);

    if (droppedProps.length >= maximumDrops) {
      const oldest = droppedProps.shift();
      oldest.entity.destroy();
    }

    const dropState = {
      id: 'field-drop-' + (stats.drops + 1),
      itemId,
      entity,
      position: start,
      velocity: [forwardX * 1.15, 2.1, forwardZ * 1.15],
      rotationY: (Number(playerState.facingYaw) || 0) + 20,
      spin: forwardX >= 0 ? 75 : -75,
      radius: 0.17,
      bounceCount: 0,
      settled: false
    };
    droppedProps.push(dropState);
    inventory[itemId] = Math.max(0, inventory[itemId] - 1);
    if (activeItemId === itemId) activeItemId = null;
    stats.drops++;
    persist();
    return status(DEFINITION_MAP.get(itemId).name + ' dropped. Use INTERACT nearby to pick it up.');
  }

  function pickupNearest(playerState = playerController.getState()) {
    if (!playerState?.position || !droppedProps.length) return false;
    let nearestIndex = -1;
    let nearestDistance = 1.35;
    for (let i = 0; i < droppedProps.length; i++) {
      const item = droppedProps[i];
      const distance = Math.hypot(playerState.position[0] - item.position[0], playerState.position[2] - item.position[2]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    if (nearestIndex < 0) return false;
    const [item] = droppedProps.splice(nearestIndex, 1);
    item.entity.destroy();
    inventory[item.itemId] = Math.min(DEFINITION_MAP.get(item.itemId).maxCount, inventory[item.itemId] + 1);
    stats.pickups++;
    persist();
    status(DEFINITION_MAP.get(item.itemId).name + ' collected.');
    return true;
  }

  function update(deltaSeconds) {
    if (destroyed) return;
    const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
    for (const itemId of Object.keys(cooldowns)) cooldowns[itemId] = Math.max(0, cooldowns[itemId] - dt);

    if (scoutDrone && droneEntity) {
      scoutDrone.headingRadians += dronePanInput * dt * 1.05;
      const next = stepScoutDrone(scoutDrone, dt, { ...droneInput, vertical: droneVerticalInput });
      scoutDrone.position = next.position;
      scoutDrone.battery = next.battery;
      scoutDrone.flightSeconds += dt;
      droneEntity.setPosition(...scoutDrone.position);
      droneEntity.setEulerAngles(0, scoutDrone.headingRadians * 180 / Math.PI, 0);
      droneRotorAngle = (droneRotorAngle + dt * 1480) % 360;
      for (const child of droneEntity.children) {
        if (child.tags?.has?.('scout-drone-rotor')) child.setLocalEulerAngles(0, droneRotorAngle, 0);
      }
      const yaw = scoutDrone.headingRadians;
      const cameraPosition = [scoutDrone.position[0], scoutDrone.position[1] + 0.24, scoutDrone.position[2]];
      const cameraTarget = [
        scoutDrone.position[0] - Math.sin(yaw) * 15,
        scoutDrone.position[1] - 1.7,
        scoutDrone.position[2] - Math.cos(yaw) * 15
      ];
      playerController.setExternalCameraPose?.(cameraPosition, cameraTarget, 82);
      if (scoutDrone.battery <= 0.01) recallScoutDrone('battery depleted; drone returned to operator.');
    }

    if (transition) {
      transition.elapsed += dt;
      const progress = Math.min(1, transition.elapsed / transition.duration);
      const eased = progress * progress * (3 - 2 * progress);
      const value = transition.from + (transition.to - transition.from) * eased;
      const model = equippedModels.get(transition.itemId);
      model?.setLocalScale(value, value, value);
      model?.setLocalPosition(0, -0.08 + (1 - value) * 0.08, 0.10 * (1 - value));
      if (progress >= 1) {
        if (transition.action === 'stow') {
          model.enabled = false;
          model.setLocalScale(0.001, 0.001, 0.001);
        }
        transition = null;
      }
    }

    for (const item of droppedProps) {
      if (item.settled) continue;
      const previousY = item.position[1];
      const nextY = previousY + item.velocity[1] * dt - 7.75 * dt * dt;
      let groundHit = null;
      if (playerPhysics?.raycast) {
        groundHit = playerPhysics.raycast(
          [item.position[0], previousY + item.radius, item.position[2]],
          [item.position[0], nextY - item.radius, item.position[2]]
        );
      } else if (nextY <= item.radius) {
        groundHit = { point: [item.position[0], 0, item.position[2]] };
      }
      const body = stepDroppedFieldProp(item, dt, groundHit);
      item.position = body.position;
      item.velocity = body.velocity;
      item.rotationY = body.rotationY;
      item.bounceCount = body.bounceCount;
      item.settled = body.settled;
      item.entity.setPosition(item.position[0], item.position[1], item.position[2]);
      item.entity.setEulerAngles(8, item.rotationY, 0);
      stats.physicsSteps++;
      if (groundHit && body.velocity[1] === 0) stats.groundContacts++;
    }
  }

  function getState() {
    const items = FIELD_EQUIPMENT_DEFINITIONS.map(item => ({
      ...item,
      count: inventory[item.id],
      cooldownRemaining: Number(cooldowns[item.id].toFixed(2)),
      equipped: activeItemId === item.id
    }));
    const slots = quickSlots.map((itemId, index) => {
      const item = DEFINITION_MAP.get(itemId);
      return {
        slot: index + 1,
        itemId,
        name: item?.name || 'Empty',
        shortName: item?.shortName || 'EMPTY',
        count: item ? inventory[itemId] : 0,
        equipped: itemId === activeItemId,
        cooldownRemaining: item ? Number(cooldowns[itemId].toFixed(2)) : 0
      };
    });
    return {
      ready: true,
      mode: 'non-combat-field-equipment',
      items,
      inventory: { ...inventory },
      activeItemId,
      quickSlots: slots,
      droppedProps: droppedProps.length,
      drone: getDroneState(),
      visuals: { proceduralModels: equippedModels.size, carryAnchor: rightHandBone ? 'right-hand bone attachment' : 'player-root offset fallback', transition: 'procedural equip/stow scale and position blend' },
      physics: { mode: 'raycast-supported arcade rigid-body drops', gravity: 15.5, maxDroppedProps: maximumDrops, liveDrops: droppedProps.length, groundContacts: stats.groundContacts },
      stats: { ...stats }
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (droneEntity) droneEntity.destroy();
    droneEntity = null;
    scoutDrone = null;
    playerController.clearExternalCameraPose?.();
    playerController.setControlEnabled(true);
    carrier.destroy();
    for (const item of droppedProps) item.entity.destroy();
    droppedProps.length = 0;
  }

  persist();
  return { equip, stow, equipSlot, activate, drop, pickupNearest, update, getState, getDroneState, setDroneInput, setDroneVertical, setDronePan, recallScoutDrone, destroy };
}
