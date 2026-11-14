import * as pc from 'playcanvas';

/**
 * Lightweight third-person controller for the Stage 06 mobile prototype.
 * Character geometry is assembled from primitive meshes; gait is procedural
 * so no large external rig or animation download is required.
 */
export function createThirdPersonController(app, camera, canvas, { onInteract, resolveMovement, heroCharacter, physics, onEffect } = {}) {
  const mat = (color, metalness = 0) => {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(...color);
    material.metalness = metalness;
    material.shininess = metalness ? 48 : 12;
    material.update();
    return material;
  };
  const skin = mat([0.36, 0.19, 0.105]);
  const shirt = mat([0.12, 0.25, 0.32]);
  const trousers = mat([0.075, 0.095, 0.11]);
  const shoes = mat([0.035, 0.04, 0.045]);
  const accent = mat([0.72, 0.48, 0.18], 0.15);

  const player = new pc.Entity('player-character');
  player.setPosition(0, 0, 0);
  app.root.addChild(player);
  const heroVisual = heroCharacter?.root ?? null;
  if (heroVisual) {
    heroVisual.setLocalPosition(0, 0, 0);
    heroVisual.setLocalScale(1, 1, 1);
    player.addChild(heroVisual);
  }

  function part(parent, name, type, scale, position, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type, material });
    entity.setLocalScale(...scale);
    entity.setLocalPosition(...position);
    parent.addChild(entity);
    return entity;
  }
  let torso = null, leftArm = null, rightArm = null, leftLeg = null, rightLeg = null;
  if (!heroVisual) {
    // A compact, readable human silhouette built from low-cost primitive meshes.
      torso = part(player, 'player-torso', 'box', [0.62, 0.78, 0.34], [0, 1.22, 0], shirt);
    part(torso, 'chest-panel', 'box', [0.62, 0.18, 1.025], [0, 0.12, 0], accent);
    part(player, 'player-neck', 'cylinder', [0.17, 0.18, 0.17], [0, 1.69, 0], skin);
    part(player, 'player-head', 'sphere', [0.25, 0.31, 0.24], [0, 1.94, 0], skin);
    part(player, 'player-hair', 'sphere', [0.255, 0.13, 0.245], [0, 2.12, -0.015], shoes);
      leftArm = new pc.Entity('left-arm-pivot');
    leftArm.setLocalPosition(-0.39, 1.49, 0); player.addChild(leftArm);
    part(leftArm, 'left-upper-arm', 'cylinder', [0.14, 0.48, 0.14], [0, -0.24, 0], shirt);
    part(leftArm, 'left-hand', 'sphere', [0.13, 0.14, 0.13], [0, -0.51, 0], skin);
      rightArm = new pc.Entity('right-arm-pivot');
    rightArm.setLocalPosition(0.39, 1.49, 0); player.addChild(rightArm);
    part(rightArm, 'right-upper-arm', 'cylinder', [0.14, 0.48, 0.14], [0, -0.24, 0], shirt);
    part(rightArm, 'right-hand', 'sphere', [0.13, 0.14, 0.13], [0, -0.51, 0], skin);
      leftLeg = new pc.Entity('left-leg-pivot');
    leftLeg.setLocalPosition(-0.17, 0.88, 0); player.addChild(leftLeg);
    part(leftLeg, 'left-trouser-leg', 'cylinder', [0.17, 0.62, 0.17], [0, -0.31, 0], trousers);
    part(leftLeg, 'left-shoe', 'box', [0.22, 0.13, 0.34], [0, -0.66, -0.075], shoes);
      rightLeg = new pc.Entity('right-leg-pivot');
    rightLeg.setLocalPosition(0.17, 0.88, 0); player.addChild(rightLeg);
    part(rightLeg, 'right-trouser-leg', 'cylinder', [0.17, 0.62, 0.17], [0, -0.31, 0], trousers);
    part(rightLeg, 'right-shoe', 'box', [0.22, 0.13, 0.34], [0, -0.66, -0.075], shoes);
  }

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
  let activeHeroClip = '';
  let actionClip = '';
  let actionTimer = 0;
  let landingTimer = 0;
  let traversalMotion = null;
  let jumpBuffer = 0;
  let coyote = 0;
  let footstepClock = 0;
  const availableHeroClips = new Set(heroCharacter?.clipNames || []);
  const heroClipDurations = heroCharacter?.clipDurations || {};
  const heroDefaults = heroCharacter?.defaultClips || {
    idle: 'Hero01_Idle', walk: 'Hero01_Walk', run: 'Hero01_Sprint',
    jump: 'Hero01_Jump', landing: 'Hero01_Landing', crouch: 'Hero01_Crouch'
  };
  const animationFallbacks = {
    idle: heroDefaults.idle,
    walk: heroDefaults.walk || heroDefaults.run || heroDefaults.idle,
    run: heroDefaults.run || heroDefaults.walk || heroDefaults.idle,
    jump: heroDefaults.jump || heroDefaults.idle,
    action: heroDefaults.jump || heroDefaults.idle,
    landing: heroDefaults.landing || heroDefaults.idle,
    crouch: heroDefaults.crouch || heroDefaults.idle
  };
  function resolveHeroClip(name) {
    if (availableHeroClips.has(name)) return name;
    const normalized = String(name || '').toLowerCase();
    let key = 'idle';
    if (/walk|shimmy|step|balance/.test(normalized)) key = 'walk';
    else if (/run|sprint|jog/.test(normalized)) key = 'run';
    else if (/jump|leap/.test(normalized)) key = 'jump';
    else if (/vault|mantle|wall|hop|climb|ladder|pullup|pull-up|hang/.test(normalized)) key = 'action';
    else if (/land|drop/.test(normalized)) key = 'landing';
    else if (/crouch/.test(normalized)) key = 'crouch';
    else key = 'idle';
    return animationFallbacks[key] || animationFallbacks.idle || null;
  }

  function transitionHeroClip(name, blendTime = 0.16) {
    const resolvedName = resolveHeroClip(name);
    if (!heroVisual?.anim || !resolvedName || activeHeroClip === resolvedName) return false;
    try {
      heroVisual.anim.baseLayer.transition(resolvedName, blendTime);
      activeHeroClip = resolvedName;
      return true;
    } catch (error) {
      console.warn('Character animation transition failed:', name, '→', resolvedName, error);
      return false;
    }
  }

  function playAnimation(name, durationSeconds = null) {
    const resolvedName = resolveHeroClip(name);
    if (!heroVisual?.anim || !resolvedName) return false;
    actionClip = name;
    const clipDuration = Number.isFinite(durationSeconds)
      ? durationSeconds
      : (heroClipDurations[resolvedName] || heroClipDurations[name] || 1.9);
    actionTimer = Math.max(0.1, Math.min(6, clipDuration));
    return transitionHeroClip(name, 0.12) || activeHeroClip === resolvedName;
  }

  function playFaceExpression(name, weight = 1) {
    return heroCharacter?.setFaceExpression?.(name, weight) ?? false;
  }

  function performTraversal(name,destination,options={}) {
    if(!grounded||traversalMotion)return false;
    if(!Array.isArray(destination)||destination.length!==3||!destination.every(Number.isFinite))return false;
    const p=player.getPosition();
    const requestedClips=Array.isArray(options.clips)?options.clips:[name];
    const missingActionClip=requestedClips.some(clip=>!availableHeroClips.has(clip));
    const clips=requestedClips.map(resolveHeroClip).filter(Boolean);
    if(!clips.length)return false;
    const end=[pc.math.clamp(destination[0],-46,46),Math.max(0,destination[1]),pc.math.clamp(destination[2],-195,420)];
    const dx=end[0]-p.x,dz=end[2]-p.z,distance=Math.hypot(dx,dz);
    if(distance<.2)return false;
    if(distance>.05)player.setEulerAngles(0,Math.atan2(dx,-dz)*180/Math.PI,0);
    const gravity=Math.max(9,Number(physics?.getState?.().gravity)||18);
    const apex=Math.max(.6,Math.min(4.2,Number(options.apex)||1.0));
    const launchVelocity=Math.sqrt(2*gravity*apex);
    const duration=Math.max(.55,Math.min(2.8,2*launchVelocity/gravity));
    const actionPose=options.mode||"vault";
    const activeClip=missingActionClip?(animationFallbacks.action||animationFallbacks.idle):clips[0];
    traversalMotion={start:[p.x,p.y,p.z],end,duration,elapsed:0,apex,mode:actionPose,
      clips,activePhase:0,activeClip,missingActionClip,gravity,launchVelocity};
    velocity.set(dx/duration,launchVelocity,dz/duration);
    actionClip=activeClip;actionTimer=duration+.45;grounded=false;jumpBuffer=0;
    heroCharacterPose(actionPose,missingActionClip);
    transitionHeroClip(activeClip,.08);
    onEffect?.("parkour",[p.x,p.y,p.z]);
    return true;
  }

  function heroCharacterPose(name, enabled=true) {
    heroCharacter?.setProceduralPose?.(enabled ? name : null);
  }

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
    const wasGrounded = grounded;
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    let axisX = input.x + keyX, axisY = input.y + keyY;
    const magnitude = Math.hypot(axisX, axisY);
    if (magnitude > 1) { axisX /= magnitude; axisY /= magnitude; }
    if (traversalMotion) { axisX = 0; axisY = 0; }
    moving = !traversalMotion && Math.hypot(axisX, axisY) > 0.12;
    running = !traversalMotion && moving && !input.crouch && (input.sprint || keys.shift) && stamina > 0;
    if (running) stamina = Math.max(0, stamina - 26 * step);
    else stamina = Math.min(100, stamina + 19 * step);
    // The Ara FBX walk take is a 1.067 s cycle and run is 0.733 s.
    // Keep travel speed proportionate to a 1.8 m human rather than making every step slide.
    const speed = input.crouch ? 0.95 : running ? 3.75 : 1.6;

    // Camera-relative movement: joystick up moves toward the camera's forward direction.
    forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    movement.set(0, 0, 0);
    movement.add(right.clone().mulScalar(axisX));
    movement.add(forward.clone().mulScalar(-axisY));
    if (movement.lengthSq() > 1) movement.normalize();

    const p=player.getPosition(),currentPosition=[p.x,p.y,p.z];
    if(grounded)coyote=.14;else coyote=Math.max(0,coyote-step);
    if(input.jumpQueued)jumpBuffer=.14;else jumpBuffer=Math.max(0,jumpBuffer-step);
    let proposedPosition;
    if(traversalMotion){
      traversalMotion.elapsed+=step;
      const progress=Math.min(.999,traversalMotion.elapsed/traversalMotion.duration);
      const phase=Math.min(traversalMotion.clips.length-1,Math.floor(progress*traversalMotion.clips.length));
      if(phase!==traversalMotion.activePhase){traversalMotion.activePhase=phase;traversalMotion.activeClip=traversalMotion.clips[phase]||traversalMotion.activeClip;actionClip=traversalMotion.activeClip;transitionHeroClip(traversalMotion.activeClip,.12);}
      const remaining=Math.max(step,traversalMotion.duration-traversalMotion.elapsed+step);
      const horizontal=[(traversalMotion.end[0]-p.x)/remaining,0,(traversalMotion.end[2]-p.z)/remaining];
      const body={position:currentPosition,velocity:[velocity.x,velocity.y,velocity.z],radius:.30,height:1.78,grounded:false,traversing:true};
      if(physics?.step){
        physics.step(body,horizontal,step);
        velocity.set(body.velocity[0],body.velocity[1],body.velocity[2]);
        grounded=body.grounded;
        proposedPosition=body.position;
      }else{
        velocity.y-=traversalMotion.gravity*step;
        proposedPosition=[p.x+velocity.x*step,p.y+velocity.y*step,p.z+velocity.z*step];
        if(proposedPosition[1]<=0){proposedPosition[1]=0;velocity.y=0;grounded=true;}else grounded=false;
      }
      if(grounded&&traversalMotion.elapsed>.18){
        traversalMotion=null;actionTimer=0;actionClip="";heroCharacterPose(null,false);
        onEffect?.("landing",proposedPosition);
      }else if(traversalMotion.elapsed>traversalMotion.duration*1.65){
        traversalMotion=null;actionTimer=0;actionClip="";heroCharacterPose(null,false);
      }
    }else{
      if(jumpBuffer>0&&coyote>0){velocity.y=6.45;grounded=false;coyote=0;jumpBuffer=0;onEffect?.("jump",currentPosition);}
      const desired=[movement.x*speed,0,movement.z*speed];
      if(physics?.step){
        const body={position:currentPosition,velocity:[velocity.x,velocity.y,velocity.z],radius:.30,height:1.78,grounded};
        physics.step(body,desired,step);
        velocity.set(body.velocity[0],body.velocity[1],body.velocity[2]);grounded=body.grounded;
        proposedPosition=[pc.math.clamp(body.position[0],-46,46),body.position[1],pc.math.clamp(body.position[2],-195,420)];
      }else{
        const blend=Math.min(1,(grounded?24:8)*step);velocity.x+=(desired[0]-velocity.x)*blend;velocity.z+=(desired[2]-velocity.z)*blend;
        if(!grounded)velocity.y-=18.5*step;
        proposedPosition=[pc.math.clamp(p.x+velocity.x*step,-46,46),p.y+velocity.y*step,pc.math.clamp(p.z+velocity.z*step,-195,420)];
      }
    }
    input.jumpQueued=false;
    const resolvedPosition=typeof resolveMovement==='function'
      ? resolveMovement(currentPosition,proposedPosition)
      : proposedPosition;
    p.set(resolvedPosition[0],resolvedPosition[1],resolvedPosition[2]);
    if(p.y<=0){p.y=0;velocity.y=0;grounded=true;}
    if(resolvedPosition[0]!==proposedPosition[0])velocity.x=0;
    if(resolvedPosition[2]!==proposedPosition[2])velocity.z=0;
    if(physics?.teleport&&(resolvedPosition[0]!==proposedPosition[0]||resolvedPosition[1]!==proposedPosition[1]||resolvedPosition[2]!==proposedPosition[2])){
      physics.teleport(resolvedPosition,[velocity.x,velocity.y,velocity.z]);
    }
    player.setPosition(p);
    if (!heroVisual) player.setLocalScale(1, input.crouch ? 0.78 : 1, 1);

    if (moving) {
      const desiredYaw = Math.atan2(movement.x, -movement.z) * 180 / Math.PI;
      const current = player.getEulerAngles().y;
      const difference = ((desiredYaw - current + 540) % 360) - 180;
      player.setEulerAngles(0, current + difference * Math.min(1, step * 13), 0);
    }

    if (heroVisual?.anim) {
      if(!wasGrounded&&grounded){landingTimer=.28;onEffect?.("landing",[p.x,p.y,p.z]);}
      if(traversalMotion){heroCharacterPose(traversalMotion.mode,traversalMotion.missingActionClip);transitionHeroClip(traversalMotion.activeClip,.1);}
      else if (landingTimer > 0) {
        landingTimer = Math.max(0, landingTimer - step);
        transitionHeroClip('Hero01_Landing', 0.08);
        heroCharacterPose('landing',!availableHeroClips.has('Hero01_Landing'));
      } else if (actionTimer > 0) {
        actionTimer = Math.max(0, actionTimer - step);
        transitionHeroClip(actionClip, 0.12);
        if (actionTimer === 0) actionClip = '';
      } else if (!grounded) {
        transitionHeroClip('Hero01_Jump');
        heroCharacterPose('jump',!availableHeroClips.has('Hero01_Jump'));
      } else if (input.crouch) {
        heroCharacterPose(null,false);
        transitionHeroClip(moving ? 'Hero01_CrouchWalk' : 'Hero01_Crouch');
      } else if (running) {
        heroCharacterPose(null,false);
        transitionHeroClip('Hero01_Sprint');
      } else if (moving) {
        heroCharacterPose(null,false);
        transitionHeroClip('Hero01_Walk');
      } else if (stamina < 30) {
        heroCharacterPose(null,false);
        transitionHeroClip('Hero01_TiredIdle');
      } else {
        heroCharacterPose(null,false);
        transitionHeroClip('Hero01_Idle');
      }
    } else {
      if (moving) {
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
    }

    if(running){footstepClock+=step;if(footstepClock>=.32){footstepClock=0;onEffect?.("dust",[p.x,p.y+.02,p.z]);}}else footstepClock=0;
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

  function setPositionForSmoke(position, yaw = 0) {
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) return false;
    player.setPosition(position[0], position[1], position[2]);
    physics?.teleport?.(position,[0,0,0]);
    player.setEulerAngles(0, Number(yaw) || 0, 0);
    velocity.set(0,0,0);grounded=true;traversalMotion=null;jumpBuffer=0;coyote=.14;footstepClock=0;input.jumpQueued=false;
    return true;
  }

  const getState=()=>({position:[player.getPosition().x,player.getPosition().y,player.getPosition().z],grounded,moving,running,traversing:!!traversalMotion,verticalVelocity:velocity.y,horizontalSpeed:Math.hypot(velocity.x,velocity.z),facingYaw:player.getEulerAngles().y,crouched:input.crouch,stamina,health:100,cameraYaw,cameraPitch});
  const queueJumpForSmoke=()=>{input.jumpQueued=true;return true;};
  return {
    player, update, destroy,
    interact: () => onInteract?.(getState()),
    playAnimation,
    playFaceExpression,
    performTraversal,
    setPositionForSmoke,
    queueJumpForSmoke,
    getAnimationState: () => ({
      activeClip: activeHeroClip, requestedClip: actionClip,
      availableClipCount: availableHeroClips.size,
      source: heroCharacter?.source || 'procedural-fallback',
      defaultClips: { ...animationFallbacks },
      parkourUsesLocomotionFallback: !availableHeroClips.has('Hero01_VaultLow') &&
        !availableHeroClips.has('Hero01_Mantle') && !availableHeroClips.has('Hero01_LedgePullUp'),
      faceMorphCount: heroCharacter?.morphNames?.length ?? 0,
      playable: !!heroVisual?.anim?.playable
    }),
    getRigSnapshot:()=>heroCharacter?.getRigSnapshot?.()||{skinnedMeshCount:0,weightedVertexCount:0,weightedClothingMeshCount:0,boneCount:0,bones:[]},
    getState
  };
}
