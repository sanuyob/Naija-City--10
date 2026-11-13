import * as pc from 'playcanvas';

/**
 * Lightweight third-person controller for the Stage 06 mobile prototype.
 * Character geometry is assembled from primitive meshes; gait is procedural
 * so no large external rig or animation download is required.
 */
export function createThirdPersonController(app, camera, canvas, { onInteract, resolveMovement } = {}) {
  const mat = (color, metalness = 0) => {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(...color);
    material.metalness = metalness;
    material.shininess = metalness ? 48 : 12;
    material.update();
    return material;
  };
  // Native PlayCanvas character build: original Nigerian city-resident design.
  // Kept as a lightweight entity-pivot rig so the existing mobile controller survives.
  const skin = mat([0.39, 0.205, 0.12]);
  const skinShadow = mat([0.28, 0.125, 0.075]);
  const shirt = mat([0.075, 0.19, 0.20]);
  const overshirt = mat([0.44, 0.385, 0.27]);
  const overshirtDark = mat([0.32, 0.285, 0.20]);
  const trousers = mat([0.085, 0.095, 0.105]);
  const trouserSeam = mat([0.15, 0.16, 0.17]);
  const shoes = mat([0.055, 0.06, 0.065]);
  const sole = mat([0.72, 0.70, 0.64]);
  const hair = mat([0.035, 0.029, 0.025]);
  const eyes = mat([0.025, 0.022, 0.02]);
  const eyeWhite = mat([0.72, 0.66, 0.56]);
  const bag = mat([0.13, 0.15, 0.105]);
  const bagTrim = mat([0.27, 0.28, 0.20], 0.1);
  const accent = mat([0.63, 0.46, 0.22], 0.12);

  const player = new pc.Entity('player-character');
  player.setPosition(0, 0, 0);
  app.root.addChild(player);

  function part(parent, name, type, scale, position, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type, material });
    entity.setLocalScale(...scale);
    entity.setLocalPosition(...position);
    parent.addChild(entity);
    return entity;
  }

  // The torso is a pivot. All jacket, face and accessory detail follows its idle bob.
  const torso = new pc.Entity('player-torso');
  torso.setLocalPosition(0, 1.22, 0);
  player.addChild(torso);
  part(torso, 'player-tshirt-body', 'box', [0.62, 0.72, 0.34], [0, 0, 0], shirt);
  part(torso, 'player-jacket-back', 'box', [0.70, 0.74, 0.12], [0, 0, 0.15], overshirtDark);
  part(torso, 'player-jacket-front-left', 'box', [0.18, 0.70, 0.065], [-0.215, 0, -0.19], overshirt);
  part(torso, 'player-jacket-front-right', 'box', [0.18, 0.70, 0.065], [0.215, 0, -0.19], overshirt);
  part(torso, 'player-jacket-lapel-left', 'box', [0.085, 0.28, 0.055], [-0.105, 0.22, -0.226], overshirtDark).setLocalEulerAngles(0, 0, -13);
  part(torso, 'player-jacket-lapel-right', 'box', [0.085, 0.28, 0.055], [0.105, 0.22, -0.226], overshirtDark).setLocalEulerAngles(0, 0, 13);
  part(torso, 'player-shirt-neckline', 'box', [0.19, 0.055, 0.035], [0, 0.335, -0.183], overshirtDark);
  part(torso, 'player-jacket-pocket', 'box', [0.11, 0.105, 0.018], [0.235, -0.12, -0.229], overshirtDark);
  part(torso, 'player-jacket-pocket-flap', 'box', [0.12, 0.025, 0.022], [0.235, -0.065, -0.241], overshirt);
  for (const y of [0.10, -0.02, -0.14]) {
    part(torso, 'player-jacket-button', 'sphere', [0.018, 0.018, 0.012], [-0.11, y, -0.235], accent);
  }

  // Neck and compact low-taper hairstyle.
  part(torso, 'player-neck', 'cylinder', [0.145, 0.17, 0.145], [0, 0.43, 0], skin);
  const head = new pc.Entity('player-head-root');
  head.setLocalPosition(0, 0.70, -0.005);
  torso.addChild(head);
  part(head, 'player-head', 'sphere', [0.235, 0.285, 0.215], [0, 0, 0], skin);
  part(head, 'player-ear-left', 'sphere', [0.047, 0.072, 0.04], [-0.225, -0.015, 0], skin);
  part(head, 'player-ear-right', 'sphere', [0.047, 0.072, 0.04], [0.225, -0.015, 0], skin);
  part(head, 'player-hair-cap', 'sphere', [0.245, 0.13, 0.225], [0, 0.19, 0.005], hair);
  part(head, 'player-hair-low-left', 'sphere', [0.045, 0.12, 0.205], [-0.205, 0.095, 0.018], hair);
  part(head, 'player-hair-low-right', 'sphere', [0.045, 0.12, 0.205], [0.205, 0.095, 0.018], hair);
  for (const [x, z, size] of [[-0.14,-0.08,0.07],[-0.07,-0.13,0.075],[0,-0.145,0.075],[0.07,-0.13,0.075],[0.14,-0.08,0.07]]) {
    part(head, 'player-hair-coil', 'sphere', [size, 0.075, size], [x, 0.245, z], hair);
  }
  // Face is intentionally restrained at mobile resolution: brows, eyes, nose and mouth.
  for (const x of [-0.083, 0.083]) {
    part(head, 'player-eye-socket', 'sphere', [0.043, 0.026, 0.018], [x, 0.015, -0.198], skinShadow);
    part(head, 'player-eye-white', 'sphere', [0.028, 0.014, 0.012], [x, 0.015, -0.211], eyeWhite);
    part(head, 'player-eye-pupil', 'sphere', [0.010, 0.012, 0.008], [x, 0.015, -0.222], eyes);
    part(head, 'player-eyebrow', 'box', [0.065, 0.014, 0.014], [x, 0.064, -0.202], hair);
  }
  part(head, 'player-nose', 'sphere', [0.035, 0.052, 0.035], [0, -0.045, -0.225], skin);
  part(head, 'player-mouth', 'box', [0.052, 0.009, 0.008], [0, -0.112, -0.209], skinShadow);

  // Crossbody strap sits over the open overshirt; the pouch is attached near the hip.
  const strap = part(torso, 'player-crossbody-strap', 'box', [0.052, 0.76, 0.035], [0.115, -0.015, -0.235], bag);
  strap.setLocalEulerAngles(0, 0, -22);
  part(torso, 'player-crossbody-adjuster', 'box', [0.07, 0.085, 0.045], [0.215, -0.16, -0.258], bagTrim);
  part(torso, 'player-crossbody-pouch', 'box', [0.25, 0.30, 0.12], [0.30, -0.34, 0.12], bag);
  part(torso, 'player-crossbody-pouch-flap', 'box', [0.255, 0.08, 0.13], [0.30, -0.22, 0.105], bagTrim);
  part(torso, 'player-crossbody-clasp', 'box', [0.045, 0.035, 0.018], [0.30, -0.255, -0.15], accent);

  const leftArm = new pc.Entity('left-arm-pivot');
  leftArm.setLocalPosition(-0.37, 0.23, 0);
  torso.addChild(leftArm);
  part(leftArm, 'left-jacket-sleeve', 'cylinder', [0.145, 0.27, 0.145], [0, -0.14, 0], overshirt);
  part(leftArm, 'left-sleeve-cuff', 'cylinder', [0.119, 0.045, 0.119], [0, -0.30, 0], overshirtDark);
  part(leftArm, 'left-forearm', 'cylinder', [0.105, 0.25, 0.105], [0, -0.435, 0], skin);
  part(leftArm, 'left-hand', 'sphere', [0.105, 0.125, 0.095], [0, -0.57, -0.005], skin);
  part(leftArm, 'left-hand-thumb', 'sphere', [0.045, 0.075, 0.05], [-0.075, -0.55, -0.035], skin);
  const rightArm = new pc.Entity('right-arm-pivot');
  rightArm.setLocalPosition(0.37, 0.23, 0);
  torso.addChild(rightArm);
  part(rightArm, 'right-jacket-sleeve', 'cylinder', [0.145, 0.27, 0.145], [0, -0.14, 0], overshirt);
  part(rightArm, 'right-sleeve-cuff', 'cylinder', [0.119, 0.045, 0.119], [0, -0.30, 0], overshirtDark);
  part(rightArm, 'right-forearm', 'cylinder', [0.105, 0.25, 0.105], [0, -0.435, 0], skin);
  part(rightArm, 'right-hand', 'sphere', [0.105, 0.125, 0.095], [0, -0.57, -0.005], skin);
  part(rightArm, 'right-hand-thumb', 'sphere', [0.045, 0.075, 0.05], [0.075, -0.55, -0.035], skin);

  // Hip block, tapered trouser legs and layered low-top sneakers.
  part(player, 'player-trouser-waist', 'box', [0.53, 0.23, 0.31], [0, 0.82, 0], trousers);
  part(player, 'player-belt', 'box', [0.54, 0.045, 0.325], [0, 0.91, 0], overshirtDark);
  part(player, 'player-belt-buckle', 'box', [0.07, 0.06, 0.025], [0, 0.91, -0.17], accent);
  const leftLeg = new pc.Entity('left-leg-pivot');
  leftLeg.setLocalPosition(-0.16, 0.79, 0);
  player.addChild(leftLeg);
  part(leftLeg, 'left-trouser-leg', 'cylinder', [0.16, 0.48, 0.16], [0, -0.25, 0], trousers);
  part(leftLeg, 'left-trouser-knee-panel', 'box', [0.27, 0.12, 0.035], [0, -0.29, -0.14], trouserSeam);
  part(leftLeg, 'left-trouser-hem', 'cylinder', [0.16, 0.055, 0.16], [0, -0.49, 0], trouserSeam);
  part(leftLeg, 'left-shoe-sole', 'box', [0.24, 0.065, 0.37], [0, -0.70, -0.065], sole);
  part(leftLeg, 'left-shoe-upper', 'box', [0.225, 0.13, 0.33], [0, -0.63, -0.075], shoes);
  part(leftLeg, 'left-shoe-tongue', 'box', [0.105, 0.055, 0.12], [0, -0.585, -0.19], bagTrim);
  const rightLeg = new pc.Entity('right-leg-pivot');
  rightLeg.setLocalPosition(0.16, 0.79, 0);
  player.addChild(rightLeg);
  part(rightLeg, 'right-trouser-leg', 'cylinder', [0.16, 0.48, 0.16], [0, -0.25, 0], trousers);
  part(rightLeg, 'right-trouser-knee-panel', 'box', [0.27, 0.12, 0.035], [0, -0.29, -0.14], trouserSeam);
  part(rightLeg, 'right-trouser-hem', 'cylinder', [0.16, 0.055, 0.16], [0, -0.49, 0], trouserSeam);
  part(rightLeg, 'right-shoe-sole', 'box', [0.24, 0.065, 0.37], [0, -0.70, -0.065], sole);
  part(rightLeg, 'right-shoe-upper', 'box', [0.225, 0.13, 0.33], [0, -0.63, -0.075], shoes);
  part(rightLeg, 'right-shoe-tongue', 'box', [0.105, 0.055, 0.12], [0, -0.585, -0.19], bagTrim);

  const input = { x: 0, y: 0, sprint: false, jumpQueued: false, crouch: false };
  const keys = Object.create(null);
  const joystick = document.getElementById('move-joystick');
  const knob = document.getElementById('move-knob');
  const jumpButton = document.getElementById('jump-button');
  const sprintButton = document.getElementById('sprint-button');
  const crouchButton = document.getElementById('crouch-button');
  let joystickPointer = null;
  let orbitPointer = null;
  let orbitLastX = 0, orbitLastY = 0;
  let cameraYaw = 0, cameraPitch = 0.23;
  const cameraDistance = 6.2;
  const cameraTarget = new pc.Vec3();
  const desiredCamera = new pc.Vec3();
  const smoothedCamera = camera.getPosition().clone();
  const velocity = new pc.Vec3();
  let grounded = true;
  let stamina = 100;
  let gaitTime = 0;
  let moving = false;
  let running = false;
  const forward = new pc.Vec3();
  const right = new pc.Vec3();
  const movement = new pc.Vec3();

  function readJoystick(event) {
    if (!joystick) return;
    const rect = joystick.getBoundingClientRect();
    let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.38);
    let y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.38);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    input.x = x; input.y = y;
    if (knob) {
      knob.style.transform = `translate(${x * 24}px, ${y * 24}px)`;
    }
  }
  function resetJoystick() {
    joystickPointer = null; input.x = 0; input.y = 0;
    if (knob) knob.style.transform = 'translate(0, 0)';
  }
  joystick?.addEventListener('pointerdown', event => {
    event.preventDefault(); joystickPointer = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId); readJoystick(event);
  });
  joystick?.addEventListener('pointermove', event => {
    if (event.pointerId === joystickPointer) { event.preventDefault(); readJoystick(event); }
  });
  joystick?.addEventListener('pointerup', event => { if (event.pointerId === joystickPointer) resetJoystick(); });
  joystick?.addEventListener('pointercancel', resetJoystick);
  jumpButton?.addEventListener('pointerdown', event => {
    event.preventDefault(); input.jumpQueued = true;
  });
  const sprintOn = event => { event.preventDefault(); input.sprint = true; };
  const sprintOff = () => { input.sprint = false; };
  sprintButton?.addEventListener('pointerdown', sprintOn);
  sprintButton?.addEventListener('pointerup', sprintOff);
  sprintButton?.addEventListener('pointercancel', sprintOff);
  sprintButton?.addEventListener('lostpointercapture', sprintOff);
  const toggleCrouch = event => {
    event?.preventDefault?.();
    input.crouch = !input.crouch;
    crouchButton?.setAttribute('aria-pressed', String(input.crouch));
  };
  crouchButton?.addEventListener('click', toggleCrouch);

  const onKeyDown = event => {
    const key = event.key.toLowerCase();
    keys[key] = true;
    if (key === ' ' || key === 'space') { event.preventDefault(); input.jumpQueued = true; }
    if (key === 'c' && !event.repeat) toggleCrouch(event);
    if (key === 'e' && !event.repeat) onInteract?.(getState());
  };
  const onKeyUp = event => { keys[event.key.toLowerCase()] = false; };
  const onBlur = () => {
    Object.keys(keys).forEach(key => keys[key] = false);
    input.sprint = false; resetJoystick();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // Drag the empty scene area to orbit the follow camera. UI controls keep their own gestures.
  const onPointerDown = event => {
    if (event.target.closest?.('#rpg-interface, #assets-panel, #perf-panel')) return;
    orbitPointer = event.pointerId; orbitLastX = event.clientX; orbitLastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if (event.pointerId !== orbitPointer) return;
    const dx = event.clientX - orbitLastX, dy = event.clientY - orbitLastY;
    orbitLastX = event.clientX; orbitLastY = event.clientY;
    cameraYaw -= dx * 0.006;
    cameraPitch = pc.math.clamp(cameraPitch + dy * 0.004, -0.02, 0.72);
  };
  const onPointerUp = event => { if (event.pointerId === orbitPointer) orbitPointer = null; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function update(dt) {
    const step = Math.min(dt, 0.05);
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    let axisX = input.x + keyX, axisY = input.y + keyY;
    const magnitude = Math.hypot(axisX, axisY);
    if (magnitude > 1) { axisX /= magnitude; axisY /= magnitude; }
    moving = Math.hypot(axisX, axisY) > 0.12;
    running = moving && !input.crouch && (input.sprint || keys.shift) && stamina > 0;
    if (running) stamina = Math.max(0, stamina - 26 * step);
    else stamina = Math.min(100, stamina + 19 * step);
    const speed = input.crouch ? 1.55 : running ? 6.0 : 3.15;

    // Camera-relative movement: joystick up moves toward the camera's forward direction.
    forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    movement.set(0, 0, 0);
    movement.add(right.clone().mulScalar(axisX));
    movement.add(forward.clone().mulScalar(-axisY));
    if (movement.lengthSq() > 1) movement.normalize();

    velocity.x = movement.x * speed;
    velocity.z = movement.z * speed;
    if (input.jumpQueued && grounded) { velocity.y = 6.0; grounded = false; }
    input.jumpQueued = false;
    if (!grounded) velocity.y -= 17.5 * step;
    const p = player.getPosition();
    const currentPosition=[p.x,p.y,p.z];
    const proposedPosition=[
      pc.math.clamp(p.x + velocity.x * step, -46, 46),
      p.y + velocity.y * step,
      pc.math.clamp(p.z + velocity.z * step, -195, 420)
    ];
    const resolvedPosition=typeof resolveMovement==='function'
      ? resolveMovement(currentPosition,proposedPosition)
      : proposedPosition;
    p.set(resolvedPosition[0],resolvedPosition[1],resolvedPosition[2]);
    if (p.y <= 0) { p.y = 0; velocity.y = 0; grounded = true; }
    player.setPosition(p);
    player.setLocalScale(1, input.crouch ? 0.78 : 1, 1);

    if (moving) {
      const desiredYaw = Math.atan2(movement.x, -movement.z) * 180 / Math.PI;
      const current = player.getEulerAngles().y;
      const difference = ((desiredYaw - current + 540) % 360) - 180;
      player.setEulerAngles(0, current + difference * Math.min(1, step * 13), 0);
      gaitTime += step * (running ? 12 : 8);
      const swing = Math.sin(gaitTime) * (running ? 0.72 : 0.48);
      leftLeg.setLocalEulerAngles(swing * 57.2958, 0, 0);
      rightLeg.setLocalEulerAngles(-swing * 57.2958, 0, 0);
      leftArm.setLocalEulerAngles(-swing * 38, 0, 0);
      rightArm.setLocalEulerAngles(swing * 38, 0, 0);
      torso.setLocalPosition(0, 1.22 + Math.abs(swing) * 0.035, 0);
    } else {
      gaitTime = 0;
      leftLeg.setLocalEulerAngles(0, 0, 0); rightLeg.setLocalEulerAngles(0, 0, 0);
      leftArm.setLocalEulerAngles(0, 0, 0); rightArm.setLocalEulerAngles(0, 0, 0);
      torso.setLocalPosition(0, 1.22, 0);
    }
    if (!grounded) {
      leftLeg.setLocalEulerAngles(-18, 0, 0); rightLeg.setLocalEulerAngles(18, 0, 0);
      leftArm.setLocalEulerAngles(-28, 0, 0); rightArm.setLocalEulerAngles(-28, 0, 0);
    }

    const yaw = cameraYaw;
    const horizontal = Math.cos(cameraPitch) * cameraDistance;
    cameraTarget.set(p.x, p.y + 1.28, p.z);
    desiredCamera.set(
      p.x + Math.sin(yaw) * horizontal,
      p.y + 1.28 + Math.sin(cameraPitch) * cameraDistance + 0.35,
      p.z + Math.cos(yaw) * horizontal
    );
    smoothedCamera.lerp(smoothedCamera, desiredCamera, Math.min(1, step * 8));
    camera.setPosition(smoothedCamera);
    camera.lookAt(cameraTarget);
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    crouchButton?.removeEventListener('click', toggleCrouch);
    player.destroy();
  }

  const getState = () => ({ position: [player.getPosition().x, player.getPosition().y, player.getPosition().z], grounded, moving, running, crouched: input.crouch, stamina, health: 100, cameraYaw, cameraPitch });
  return {
    player, update, destroy,
    interact: () => onInteract?.(getState()),
    getState
  };
}
