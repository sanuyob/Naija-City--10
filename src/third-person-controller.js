import * as pc from 'playcanvas';

/**
 * Lightweight third-person controller for the Stage 06 mobile prototype.
 * Ara 3D Female supplies the visible player rig and skeletal animations.
 * Hero 01 is created separately as a moving city NPC by pedestrian-system.js.
 */
export function createThirdPersonController(app, camera, canvas, {
  onInteract, onTraversal, tryTraversal, resolveMovement, heroCharacter, physics, onEffect
} = {}) {
  // The player root owns movement, camera follow and collision. The visible
  // body must be the imported Ara female rig; Hero 01 is now a separate NPC.
  const player = new pc.Entity('player-character');
  player.setPosition(0, 0, 0);
  app.root.addChild(player);
  let activeHeroCharacter = heroCharacter ?? null;
  let heroVisual = activeHeroCharacter?.root ?? null;
  if (heroVisual) {
    heroVisual.setLocalPosition(0, 0, 0);
    heroVisual.setLocalScale(1, 1, 1);
    player.addChild(heroVisual);
  }

  const torso = null, leftArm = null, rightArm = null, leftLeg = null, rightLeg = null;

  const input = { x: 0, y: 0, sprint: false, jumpQueued: false, crouch: false };
  let sprintToggled = false;
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
  let manualCameraHold = 0;
  let facingYaw = 0;
  let smoothedMoveSpeed = 0;
  let smoothedTurnInput = 0;
  let controlEnabled = true;
  const cameraProbe = new pc.Vec3();
  const cameraDistance = 3.85;
  const cameraTarget = new pc.Vec3();
  const desiredCamera = new pc.Vec3();
  const smoothedCamera = camera.getPosition().clone();
  let cameraInitialized = false;
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
  let lastFootstepCycle = null;
  let lastFootstepProgress = null;
  let footstepContacts = 0;
  let footPlacementHits = 0;
  let availableHeroClips = new Set(activeHeroCharacter?.clipNames || []);
  let heroClipDurations = activeHeroCharacter?.clipDurations || {};
  let heroDefaults = activeHeroCharacter?.defaultClips || {
    idle: 'Hero01_Idle', walk: 'Hero01_Walk', run: 'Hero01_Sprint',
    jump: 'Hero01_Jump', landing: 'Hero01_Landing', crouch: 'Hero01_Crouch'
  };
  const buildAnimationFallbacks = defaults => ({
    idle: defaults.idle,
    walk: defaults.walk || defaults.run || defaults.idle,
    run: defaults.run || defaults.walk || defaults.idle,
    jump: defaults.jump || defaults.idle,
    jumpStart: defaults.jumpStart || defaults.jump || defaults.idle,
    action: defaults.vault || defaults.climb || defaults.jump || defaults.idle,
    vault: defaults.vault || defaults.climb || defaults.jump || defaults.idle,
    climb: defaults.climb || defaults.vault || defaults.jump || defaults.idle,
    roll: defaults.roll || defaults.vault || defaults.jump || defaults.idle,
    dodgeLeft: defaults.dodgeLeft || defaults.roll || defaults.run || defaults.idle,
    dodgeRight: defaults.dodgeRight || defaults.roll || defaults.run || defaults.idle,
    landing: defaults.landing || defaults.idle,
    crouch: defaults.crouch || defaults.idle,
    crouchWalk: defaults.crouchWalk || defaults.crouch || defaults.walk || defaults.idle
  });
  let animationFallbacks = buildAnimationFallbacks(heroDefaults);
  let jumpStartTimer = 0;
  function resolveHeroClip(name) {
    if (availableHeroClips.has(name)) return name;
    const normalized = String(name || '').toLowerCase();
    let key = 'idle';
    if (/dodge.*left|left.*dodge/.test(normalized)) key = 'dodgeLeft';
    else if (/dodge.*right|right.*dodge/.test(normalized)) key = 'dodgeRight';
    else if (/roll/.test(normalized)) key = 'roll';
    else if (/jump.*start|take.?off/.test(normalized)) key = 'jumpStart';
    else if (/jump|leap/.test(normalized)) key = 'jump';
    else if (/walk|shimmy|balance/.test(normalized)) key = 'walk';
    else if (/step/.test(normalized)) key = 'climb';
    else if (/run|sprint|jog/.test(normalized)) key = 'run';
    else if (/vault|wall.?run|wall.?hop/.test(normalized)) key = 'vault';
    else if (/mantle|climb|ladder|ledge|pullup|pull-up|hang/.test(normalized)) key = 'climb';
    else if (/land|drop/.test(normalized)) key = 'landing';
    else if (/crouch/.test(normalized)) key = 'crouch';
    else if (/interact/.test(normalized)) key = 'idle';
    return animationFallbacks[key] || animationFallbacks.action || animationFallbacks.idle || null;
  }

  function transitionHeroClip(name, blendTime = 0.22) {
    const resolvedName = resolveHeroClip(name);
    const layer = heroVisual?.anim?.baseLayer;
    if (!layer || !resolvedName) return false;
    const locomotionClips = [animationFallbacks.idle, animationFallbacks.walk, animationFallbacks.run];
    const targetState = locomotionClips.includes(resolvedName) ? 'Locomotion' : resolvedName;
    if (activeHeroClip === resolvedName && layer.activeState === targetState) return false;
    try {
      if (layer.activeState !== targetState) layer.transition(targetState, blendTime);
      activeHeroClip = resolvedName;
      return true;
    } catch (error) {
      console.warn('Character animation transition failed:', name, '→', resolvedName, error);
      return false;
    }
  }

  function setCrouched(value) {
    const next = Boolean(value);
    if (next === input.crouch) return true;
    if (!grounded || traversalMotion) return false;
    const position = player.getPosition();
    if (physics?.setCrouched && !physics.setCrouched(next, [position.x, position.y, position.z])) return false;
    input.crouch = next;
    actionTimer = 0;
    actionClip = '';
    crouchButton?.setAttribute('aria-pressed', String(next));
    lastFootstepCycle = null;
    lastFootstepProgress = null;
    transitionHeroClip(next ? (moving ? heroDefaults.crouchWalk : heroDefaults.crouch) : (moving ? 'Hero01_Walk' : 'Hero01_Idle'), .08);
    return true;
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
    return activeHeroCharacter?.setFaceExpression?.(name, weight) ?? false;
  }

  function performTraversal(name,destination,options={}) {
    if(!grounded||traversalMotion)return false;
    if(!Array.isArray(destination)||destination.length!==3||!destination.every(Number.isFinite))return false;
    const p=player.getPosition();
    const requestedClips=Array.isArray(options.clips)?options.clips:[name];
    const missingActionClip=requestedClips.some(clip=>{const resolved=resolveHeroClip(clip);return !resolved||!availableHeroClips.has(resolved);});
    const clips=requestedClips.map(resolveHeroClip).filter(Boolean);
    if(!clips.length)return false;
    const end=[pc.math.clamp(destination[0],-46,46),Math.max(0,destination[1]),pc.math.clamp(destination[2],-195,420)];
    const dx=end[0]-p.x,dz=end[2]-p.z,distance=Math.hypot(dx,dz);
    if(distance<.2)return false;
    if(distance>.05) {
      facingYaw = Math.atan2(dx,-dz)*180/Math.PI;
      player.setEulerAngles(0,facingYaw,0);
    }
    const gravity=Math.max(9,Number(physics?.getState?.().gravity)||18);
    const apex=Math.max(.6,Math.min(4.2,Number(options.apex)||1.0));
    const launchVelocity=Math.sqrt(2*gravity*apex);
    const actionPose=options.mode||"vault";
    const kinematicClimb=["step","mantle","ledge","ladder"].includes(actionPose);
    const duration=kinematicClimb
      ? Math.max(.55,Math.min(5.2,Number(options.duration)||1.0))
      : Math.max(.55,Math.min(2.8,2*launchVelocity/gravity));
    const activeClip=missingActionClip?(animationFallbacks.action||animationFallbacks.idle):clips[0];
    traversalMotion={start:[p.x,p.y,p.z],end,duration,elapsed:0,apex,mode:actionPose,
      clips,activePhase:0,activeClip,missingActionClip,gravity,launchVelocity,
      kinematic:kinematicClimb,restoreGravity:gravity};
    if(kinematicClimb)physics?.setGravity?.(0);
    velocity.set(dx/duration,kinematicClimb?(end[1]-p.y)/duration:launchVelocity,dz/duration);
    actionClip=activeClip;actionTimer=duration+.45;grounded=false;jumpBuffer=0;
    heroCharacterPose(actionPose,missingActionClip);
    transitionHeroClip(activeClip,.08);
    onEffect?.("parkour",[p.x,p.y,p.z]);
    return true;
  }

  function heroCharacterPose(name, enabled=true) {
    activeHeroCharacter?.setProceduralPose?.(enabled ? name : null);
  }

  function readJoystick(event) {
    if (!joystick) return;
    const rect = joystick.getBoundingClientRect();
    // Match the analog range to the real thumb travel inside the circular pad.
    // The earlier 0.38 multiplier left part of the stick's usable travel unused.
    let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.34);
    let y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.34);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const deadZone = 0.045;
    const remap = value => {
      const magnitude = Math.abs(value);
      return magnitude <= deadZone ? 0 : Math.sign(value) * (magnitude - deadZone) / (1 - deadZone);
    };
    input.x = remap(x); input.y = remap(y);
    if (knob) {
      knob.style.transform = `translate(${x * 24}px, ${y * 24}px)`;
    }
  }
  function resetJoystick() {
    const wasActive = joystickPointer !== null;
    joystickPointer = null; input.x = 0; input.y = 0;
    if (knob) knob.style.transform = 'translate(0, 0)';
    // Stop the physics body at release, not merely the next desired input.
    // This prevents residual Bullet momentum from making the character look
    // as if an NPC is still walking after the thumb has lifted.
    if (wasActive) {
      const p = player.getPosition();
      smoothedMoveSpeed = 0;
      moving = false;
      velocity.x = 0; velocity.z = 0;
      physics?.teleport?.([p.x, p.y, p.z], [0, velocity.y, 0]);
    }
  }
  joystick?.addEventListener('pointerdown', event => {
    event.preventDefault(); joystickPointer = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId); readJoystick(event);
  });
  joystick?.addEventListener('pointermove', event => {
    if (event.pointerId === joystickPointer) { event.preventDefault(); readJoystick(event); }
  });
  const endJoystickPointer = event => {
    if (joystickPointer !== null && (event.pointerId === undefined || event.pointerId === joystickPointer)) resetJoystick();
  };
  joystick?.addEventListener('pointerup', endJoystickPointer);
  joystick?.addEventListener('pointercancel', endJoystickPointer);
  joystick?.addEventListener('lostpointercapture', endJoystickPointer);
  // Pointer capture can be interrupted by mobile browser UI or orientation
  // changes. A window-level release is the final safety net against stuck input.
  window.addEventListener('pointerup', endJoystickPointer, true);
  window.addEventListener('pointercancel', endJoystickPointer, true);
  const queueJump = event => {
    event.preventDefault();
    const started = typeof tryTraversal === 'function' && tryTraversal(getState()) === true;
    if (started) {
      input.jumpQueued = false;
      sprintToggled = false;
      input.sprint = false;
      sprintButton?.setAttribute('aria-pressed', 'false');
      sprintButton?.classList.remove('is-pressed');
      onTraversal?.(getState());
      return;
    }
    input.jumpQueued = true;
  };
  jumpButton?.addEventListener('pointerdown', queueJump);
  let sprintPointerHandled = false;
  const toggleSprint = event => {
    event?.preventDefault?.();
    sprintToggled = !sprintToggled;
    input.sprint = sprintToggled;
    sprintButton?.setAttribute('aria-pressed', String(sprintToggled));
    sprintButton?.classList.toggle('is-pressed', sprintToggled);
  };
  const onSprintPointerDown = event => {
    if (event.button !== undefined && event.button !== 0) return;
    sprintPointerHandled = true;
    toggleSprint(event);
    event.stopPropagation?.();
  };
  const onSprintClick = event => {
    if (sprintPointerHandled) { sprintPointerHandled = false; event.preventDefault(); return; }
    toggleSprint(event);
  };
  sprintButton?.addEventListener('pointerdown', onSprintPointerDown);
  sprintButton?.addEventListener('click', onSprintClick);
  const toggleCrouch = event => {
    event?.preventDefault?.();
    if (!setCrouched(!input.crouch)) onInteract?.({ ...getState(), crouchBlocked: true });
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
    input.sprint = false; sprintToggled = false;
    sprintButton?.setAttribute('aria-pressed', 'false');
    sprintButton?.classList.remove('is-pressed');
    resetJoystick();
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
    manualCameraHold = 2.1;
  };
  const onPointerUp = event => { if (event.pointerId === orbitPointer) orbitPointer = null; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function update(dt) {
    if (!controlEnabled) return;
    const step = Math.min(dt, 0.05);
    // Preserve the authored kinematic path on its completion frame too. The
    // traversal state is cleared before the final position is applied.
    const scriptedKinematicFrame = traversalMotion?.kinematic === true;
    const wasGrounded = grounded;
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    let axisX = input.x + keyX, axisY = input.y + keyY;
    const magnitude = Math.hypot(axisX, axisY);
    if (magnitude > 1) { axisX /= magnitude; axisY /= magnitude; }
    if (traversalMotion) { axisX = 0; axisY = 0; }
    // Camera-relative mobile movement: the thumb direction always maps to
    // the direction visible on screen. X strafes; Y moves forward/backward.
    // Character heading follows forward travel, never autonomous steering.
    const cameraForwardX = -Math.sin(cameraYaw);
    const cameraForwardZ = -Math.cos(cameraYaw);
    const cameraRightX = Math.cos(cameraYaw);
    const cameraRightZ = -Math.sin(cameraYaw);
    let moveX = cameraRightX * axisX + cameraForwardX * -axisY;
    let moveZ = cameraRightZ * axisX + cameraForwardZ * -axisY;
    const moveLength = Math.hypot(moveX, moveZ);
    if (moveLength > 1) { moveX /= moveLength; moveZ /= moveLength; }
    if (!traversalMotion && axisY < -0.14 && moveLength > 0.12) {
      const targetFacing = Math.atan2(-moveX, -moveZ) * 180 / Math.PI;
      let yawDelta = ((targetFacing - facingYaw + 540) % 360) - 180;
      facingYaw += yawDelta * (1 - Math.exp(-12 * step));
      facingYaw = ((facingYaw + 540) % 360) - 180;
      player.setEulerAngles(0, facingYaw, 0);
    }
    smoothedTurnInput = 0;
    const driveMagnitude = Math.hypot(axisX, axisY);
    moving = !traversalMotion && driveMagnitude > 0.12;
    running = !traversalMotion && moving && !input.crouch && (sprintToggled || input.sprint || keys.shift) && stamina > 0;
    if (running) stamina = Math.max(0, stamina - 15 * step);
    else stamina = Math.min(100, stamina + 19 * step);
    const stickStrength = pc.math.clamp((driveMagnitude - 0.075) / 0.925, 0, 1);
    const maxSpeed = input.crouch ? 1.05 : running ? 4.45 : 2.65;
    const targetMoveSpeed = moving ? maxSpeed * Math.pow(stickStrength, 0.78) : 0;
    const response = moving ? 11.5 : 24;
    smoothedMoveSpeed += (targetMoveSpeed - smoothedMoveSpeed) * (1 - Math.exp(-response * step));
    const speed = smoothedMoveSpeed;

    // Camera orbit is respected while moving. No auto-turning or camera snap
    // occurs from an idle thumb, so the player cannot appear to take over.
    manualCameraHold = Math.max(0, manualCameraHold - step);
    if (manualCameraHold <= 0 && moving && axisY < -0.14) {
      const targetCameraYaw = facingYaw * Math.PI / 180;
      const delta = ((targetCameraYaw - cameraYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      cameraYaw += delta * (1 - Math.exp(-3.8 * step));
    }
    movement.set(moveX, 0, moveZ);

    const p=player.getPosition(),currentPosition=[p.x,p.y,p.z];
    if(grounded)coyote=.14;else coyote=Math.max(0,coyote-step);
    if(input.jumpQueued)jumpBuffer=.14;else jumpBuffer=Math.max(0,jumpBuffer-step);
    let proposedPosition;
    if(traversalMotion){
      traversalMotion.elapsed+=step;
      const progress=Math.min(1,traversalMotion.elapsed/traversalMotion.duration);
      const phase=Math.min(traversalMotion.clips.length-1,Math.floor(Math.min(.999,progress)*traversalMotion.clips.length));
      if(phase!==traversalMotion.activePhase){traversalMotion.activePhase=phase;traversalMotion.activeClip=traversalMotion.clips[phase]||traversalMotion.activeClip;actionClip=traversalMotion.activeClip;transitionHeroClip(traversalMotion.activeClip,.12);}
      if(traversalMotion.kinematic){
        // Step-ups, mantles, ledge pulls and ladders need a controlled climb,
        // not a generic ballistic jump that lands back at street level.
        const eased=progress*progress*(3-2*progress);
        const target=traversalMotion.start.map((value,index)=>value+(traversalMotion.end[index]-value)*eased);
        velocity.set((target[0]-p.x)/step,(target[1]-p.y)/step,(target[2]-p.z)/step);
        proposedPosition=target;
        physics?.teleport?.(target,[velocity.x,velocity.y,velocity.z]);
        grounded=progress>=1;
        if(progress>=1){
          proposedPosition=traversalMotion.end.slice();
          velocity.y=0;
          physics?.teleport?.(proposedPosition,[velocity.x,0,velocity.z]);
          physics?.setGravity?.(traversalMotion.restoreGravity);
          traversalMotion=null;actionTimer=0;actionClip="";heroCharacterPose(null,false);
          onEffect?.("landing",proposedPosition);
        }
      }else{
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
      }
    }else{
      if(jumpBuffer>0&&coyote>0){velocity.y=6.45;grounded=false;coyote=0;jumpBuffer=0;jumpStartTimer=.22;transitionHeroClip('Hero01_JumpStart',.07);onEffect?.("jump",currentPosition);}
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
    // Scripted step/mantle/ledge/ladder trajectories already have their
    // dedicated traversal obstacle temporarily released from Bullet. Do not
    // run the ordinary building-proxy resolver over these authored paths:
    // it can pin the capsule against the very ledge it is climbing.
    const resolvedPosition=(traversalMotion?.kinematic || scriptedKinematicFrame)
      ? proposedPosition
      : typeof resolveMovement==='function'
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

    // Facing changes only in response to forward movement input. Reverse and
    // lateral movement never create autonomous rotation.

    if (heroVisual?.anim) {
      const animationSpeed = input.crouch ? 0 : Math.min(3.75, Math.hypot(velocity.x, velocity.z));
      heroVisual.anim.setFloat?.('moveSpeed', animationSpeed);
      if(!wasGrounded&&grounded){landingTimer=.28;onEffect?.("landing",[p.x,p.y,p.z]);}
      if(traversalMotion){heroCharacterPose(traversalMotion.mode,traversalMotion.missingActionClip);transitionHeroClip(traversalMotion.activeClip,.1);}
      else if (landingTimer > 0) {
        landingTimer = Math.max(0, landingTimer - step);
        transitionHeroClip('Hero01_Landing', 0.08);
        heroCharacterPose('landing',!availableHeroClips.has(resolveHeroClip('Hero01_Landing')));
      } else if (actionTimer > 0) {
        actionTimer = Math.max(0, actionTimer - step);
        transitionHeroClip(actionClip, 0.12);
        if (actionTimer === 0) actionClip = '';
      } else if (!grounded) {
        jumpStartTimer=Math.max(0,jumpStartTimer-step);
        transitionHeroClip(jumpStartTimer>0?'Hero01_JumpStart':'Hero01_Jump');
        heroCharacterPose('jump',!availableHeroClips.has(resolveHeroClip('Hero01_Jump')));
      } else if (input.crouch) {
        heroCharacterPose(null,false);
        transitionHeroClip(moving ? (heroDefaults.crouchWalk || 'Ara_CrouchWalk') : heroDefaults.crouch, .08);
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
    } else if (leftLeg && rightLeg && leftArm && rightArm && torso) {
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

    if (heroVisual?.anim && grounded && !traversalMotion && !input.crouch) {
      const feet = activeHeroCharacter?.getFootPositions?.();
      if (feet?.left && feet?.right) {
        const probe = foot => physics?.raycast?.(
          [foot[0], foot[1] + .26, foot[2]],
          [foot[0], foot[1] - .48, foot[2]]
        );
        const leftHit = probe(feet.left), rightHit = probe(feet.right);
        if (leftHit || rightHit) footPlacementHits++;
        activeHeroCharacter?.applyFootPlacement?.({
          left: leftHit?.point,
          right: rightHit?.point
        }, Math.min(1, step * 9));
      }
    }

    if(moving&&grounded&&!traversalMotion){
      const layer = heroVisual?.anim?.baseLayer;
      const loopState = layer?.activeState === 'Locomotion' || layer?.activeState === heroDefaults.crouchWalk;
      const progress = loopState ? layer.activeStateProgress : null;
      if (Number.isFinite(progress)) {
        const cycle = Math.floor(progress * 2);
        if (lastFootstepProgress !== null && progress + 0.25 < lastFootstepProgress) lastFootstepCycle = -1;
        if (lastFootstepCycle === null) lastFootstepCycle = cycle;
        else if (cycle !== lastFootstepCycle) {
          const feet = activeHeroCharacter?.getFootPositions?.();
          const foot = cycle % 2 === 0 ? feet?.left : feet?.right;
          const footPosition = foot || [p.x, p.y + .02, p.z];
          const surfaceHit = physics?.raycast?.([footPosition[0], footPosition[1] + .22, footPosition[2]], [footPosition[0], footPosition[1] - .42, footPosition[2]]);
          onEffect?.('dust', footPosition, { surface: surfaceHit?.surface || 'asphalt' });
          footstepContacts++;
          lastFootstepCycle = cycle;
        }
        lastFootstepProgress = progress;
      } else {
        footstepClock += step;
        const stepInterval = running ? .31 : .46;
        if (footstepClock >= stepInterval) {
          footstepClock -= stepInterval;
          const surfaceHit = physics?.raycast?.([p.x, p.y + .28, p.z], [p.x, p.y - .35, p.z]);
          onEffect?.('dust', [p.x, p.y + .02, p.z], { surface: surfaceHit?.surface || 'asphalt' });
          footstepContacts++;
        }
      }
    } else {
      footstepClock = 0;
      lastFootstepCycle = null;
      lastFootstepProgress = null;
    }
    const yaw = cameraYaw;
    const horizontal = Math.cos(cameraPitch) * cameraDistance;
    const cameraHeight = input.crouch ? 1.02 : 1.28;
    cameraTarget.set(p.x, p.y + cameraHeight, p.z);
    desiredCamera.set(
      p.x + Math.sin(yaw) * horizontal,
      p.y + cameraHeight + Math.sin(cameraPitch) * cameraDistance + 0.35,
      p.z + Math.cos(yaw) * horizontal
    );
    const cameraHit = physics?.raycast?.(
      [cameraTarget.x, cameraTarget.y, cameraTarget.z],
      [desiredCamera.x, desiredCamera.y, desiredCamera.z]
    );
    if (cameraHit) {
      const hitPoint = cameraHit.point;
      const dx = desiredCamera.x - cameraTarget.x, dy = desiredCamera.y - cameraTarget.y, dz = desiredCamera.z - cameraTarget.z;
      const length = Math.hypot(dx, dy, dz) || 1;
      const safeDistance = Math.max(.72, Math.hypot(hitPoint[0]-cameraTarget.x,hitPoint[1]-cameraTarget.y,hitPoint[2]-cameraTarget.z)-.24);
      const ratio = Math.min(1, safeDistance / length);
      cameraProbe.set(cameraTarget.x + dx * ratio, cameraTarget.y + dy * ratio, cameraTarget.z + dz * ratio);
      desiredCamera.copy(cameraProbe);
    }
    // Start at the authored chase position instead of showing the old wide
    // startup camera for several seconds. Later movement remains damped.
    if (!cameraInitialized) {
      smoothedCamera.copy(desiredCamera);
      cameraInitialized = true;
    } else {
      smoothedCamera.lerp(smoothedCamera, desiredCamera, Math.min(1, step * (cameraHit ? 18 : 14)));
    }
    camera.setPosition(smoothedCamera);
    camera.lookAt(cameraTarget);
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointerup', endJoystickPointer, true);
    window.removeEventListener('pointercancel', endJoystickPointer, true);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    crouchButton?.removeEventListener('click', toggleCrouch);
    jumpButton?.removeEventListener('pointerdown', queueJump);
    sprintButton?.removeEventListener('pointerdown', onSprintPointerDown);
    sprintButton?.removeEventListener('click', onSprintClick);
    player.destroy();
  }

  function setControlEnabled(enabled) {
    controlEnabled = Boolean(enabled);
    if (!controlEnabled) {
      resetJoystick();
      input.jumpQueued = false;
      input.sprint = false;
      sprintToggled = false;
      sprintButton?.setAttribute('aria-pressed', 'false');
      sprintButton?.classList.remove('is-pressed');
      smoothedMoveSpeed = 0;
      smoothedTurnInput = 0;
    }
    return controlEnabled;
  }

  function setVisible(visible) {
    if (heroVisual) heroVisual.enabled = Boolean(visible);
    return Boolean(heroVisual);
  }

  function setPosition(position, yaw = 0) {
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) return false;
    player.setPosition(position[0], position[1], position[2]);
    physics?.teleport?.(position, [0, 0, 0]);
    facingYaw = ((Number(yaw) || 0) + 540) % 360 - 180;
    player.setEulerAngles(0, facingYaw, 0);
    velocity.set(0, 0, 0);
    smoothedMoveSpeed = 0;
    smoothedTurnInput = 0;
    grounded = true;
    traversalMotion = null;
    jumpBuffer = 0;
    jumpStartTimer = 0;
    coyote = .14;
    footstepClock = 0;
    lastFootstepCycle = null;
    lastFootstepProgress = null;
    input.jumpQueued = false;
    return true;
  }

  function getControlInput() {
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    return {
      x: pc.math.clamp(input.x + keyX, -1, 1),
      y: pc.math.clamp(input.y + keyY, -1, 1),
      controlEnabled
    };
  }

  function resetCameraAfterVehicle() {
    cameraYaw = facingYaw * Math.PI / 180;
    manualCameraHold = 0;
    cameraPitch = 0.23;
    const p=player.getPosition();
    const height=input.crouch?1.02:1.28;
    const horizontal=Math.cos(cameraPitch)*cameraDistance;
    cameraTarget.set(p.x,p.y+height,p.z);
    desiredCamera.set(
      p.x+Math.sin(cameraYaw)*horizontal,
      p.y+height+Math.sin(cameraPitch)*cameraDistance+.35,
      p.z+Math.cos(cameraYaw)*horizontal
    );
    const hit=physics?.raycast?.(
      [cameraTarget.x,cameraTarget.y,cameraTarget.z],
      [desiredCamera.x,desiredCamera.y,desiredCamera.z]
    );
    if(hit){
      const dx=desiredCamera.x-cameraTarget.x,dy=desiredCamera.y-cameraTarget.y,dz=desiredCamera.z-cameraTarget.z;
      const length=Math.hypot(dx,dy,dz)||1;
      const safe=Math.max(.72,Math.hypot(hit.point[0]-cameraTarget.x,hit.point[1]-cameraTarget.y,hit.point[2]-cameraTarget.z)-.24);
      const ratio=Math.min(1,safe/length);
      desiredCamera.set(cameraTarget.x+dx*ratio,cameraTarget.y+dy*ratio,cameraTarget.z+dz*ratio);
    }
    smoothedCamera.copy(desiredCamera);
    cameraInitialized=true;
    camera.setPosition(smoothedCamera);
    camera.lookAt(cameraTarget);
    return true;
  }

  function setPositionForSmoke(position, yaw = 0) {
    return setPosition(position, yaw);
  }

  const getState=()=>({position:[player.getPosition().x,player.getPosition().y,player.getPosition().z],grounded,moving,running,traversing:!!traversalMotion,verticalVelocity:velocity.y,horizontalSpeed:Math.hypot(velocity.x,velocity.z),targetMoveSpeed:smoothedMoveSpeed,cameraDistance:cameraDistance,facingYaw,turnInput:smoothedTurnInput,turning:Math.abs(smoothedTurnInput)>.04,controlEnabled,crouched:input.crouch,sprintEnabled:sprintToggled,stamina,health:100,cameraYaw,cameraPitch,cameraFollowActive:manualCameraHold<=0,cameraManualHold:manualCameraHold,footstepContacts,footPlacementHits,cameraActualDistance:Math.hypot(camera.getPosition().x-cameraTarget.x,camera.getPosition().y-cameraTarget.y,camera.getPosition().z-cameraTarget.z)});
  const queueJumpForSmoke=()=>{input.jumpQueued=true;return true;};
  return {
    player, update, destroy,
    interact: () => onInteract?.(getState()),
    playAnimation,
    playFaceExpression,
    setCrouched,
    setControlEnabled,
    setVisible,
    setPosition,
    getControlInput,
    resetCameraAfterVehicle,
    performTraversal,
    setPositionForSmoke,
    queueJumpForSmoke,
    getAnimationState: () => ({
      activeClip: activeHeroClip, activeState: heroVisual?.anim?.baseLayer?.activeState || null,
      transitioning: heroVisual?.anim?.baseLayer?.transitioning || false,
      transitionProgress: heroVisual?.anim?.baseLayer?.transitionProgress ?? null,
      activeStateCurrentTime: heroVisual?.anim?.baseLayer?.activeStateCurrentTime ?? null,
      activeStateDuration: heroVisual?.anim?.baseLayer?.activeStateDuration ?? null,
      componentPlaying: heroVisual?.anim?.playing ?? null,
      componentEnabled: heroVisual?.anim?.enabled ?? null,
      entityEnabled: heroVisual?.enabled ?? null,
      layerPlaying: heroVisual?.anim?.baseLayer?.playing ?? null,
      layerPlayable: heroVisual?.anim?.baseLayer?.playable ?? null,
      availableStates: heroVisual?.anim?.baseLayer?.states || [],
      requestedClip: actionClip,
      availableClipCount: availableHeroClips.size,
      source: activeHeroCharacter?.source || 'ara-female-not-installed',
      visualForward: activeHeroCharacter?.getFacingDirection?.() || null,
      characterId: activeHeroCharacter?.characterId || 'ara-female',
      displayName: activeHeroCharacter?.displayName || 'Ara 3D Female',
      defaultClips: { ...animationFallbacks },
      parkourUsesLocomotionFallback: !availableHeroClips.has('Hero01_VaultLow') &&
        !availableHeroClips.has('Hero01_Mantle') && !availableHeroClips.has('Hero01_LedgePullUp'),
      faceMorphCount: activeHeroCharacter?.morphNames?.length ?? 0,
      playable: !!heroVisual?.anim?.playable
    }),
    getRigSnapshot:()=>activeHeroCharacter?.getRigSnapshot?.()||{skinnedMeshCount:0,weightedVertexCount:0,weightedClothingMeshCount:0,boneCount:0,bones:[]},
    getState
  };
}
