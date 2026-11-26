import * as pc from 'playcanvas';
import { getAraGaitStance } from './ara-gait-contact.js';
import { createCharacterVitals } from './character-vitals.js';
import { createFacialAnimation } from './facial-animation.js';
import { makeFootPlantTarget } from './two-bone-ik.js';
import { classifyRecoverySide, deriveRecoveryYaw, estimateBoneVelocities, smoothStep01 } from './character-recovery.js';

/**
 * Lightweight third-person controller for the Stage 06 mobile prototype.
 * Ara 3D Female supplies the visible player rig and skeletal animations.
 * Hero 01 is created separately as a moving city NPC by pedestrian-system.js.
 */
export function createThirdPersonController(app, camera, canvas, {
  onInteract, onTraversal, tryTraversal, resolveMovement, heroCharacter, physics, onEffect, onCameraModeChange = () => {}, onCharacterEvent = () => {}
} = {}) {
  // The player root owns movement, camera follow and collision. The visible
  // body must be the imported Ara female rig; Hero 01 is now a separate NPC.
  const player = new pc.Entity('player-character');
  player.setPosition(0, 0, 0);
  app.root.addChild(player);
  let activeHeroCharacter = heroCharacter ?? null;
  const vitals = createCharacterVitals({ onEvent: event => onCharacterEvent?.(event) });
  const facialAnimation = createFacialAnimation(activeHeroCharacter);
  let heroVisual = activeHeroCharacter?.root ?? null;
  if (heroVisual) {
    heroVisual.setLocalPosition(0, activeHeroCharacter?.visualGroundOffset || 0, 0);
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
  let cameraMode = 'third-person';
  let heroVisibleRequested = true;
  const defaultCameraFov = Number(camera.camera?.fov) || 65;
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
  let recoveryTimer = 0;
  let ragdollActive = false;
  let ragdollRootOffset = [0, 0.94, 0];
  let lastRagdollState = null;
  let lastAnimationPoseSample = null;
  let animationPoseSampleClock = 0;
  let lastAnimationPoseSampleClock = 0;
  let animationBoneVelocities = {};
  let recoverySequence = null;
  let traversalMotion = null;
  let jumpBuffer = 0;
  let coyote = 0;
  let footstepClock = 0;
  let lastFootstepCycle = null;
  let lastFootstepProgress = null;
  let footstepContacts = 0;
  let footPlacementHits = 0;
  const footLockState={
    left:{active:false,kind:null,anchor:null},
    right:{active:false,kind:null,anchor:null},
    lastCorrection:[0,0,0],lastSupportSide:null,maxCorrection:0,applications:0,ikApplications:0,lastIKError:0,lastIKSide:null
  };
  const resetFootLock=()=>{
    for(const side of ['left','right']){footLockState[side].active=false;footLockState[side].kind=null;footLockState[side].anchor=null;}
    footLockState.lastCorrection=[0,0,0];footLockState.lastSupportSide=null;
  };
  function applyGroundedFootLock(){
    const layer=heroVisual?.anim?.baseLayer;
    const clip=layer?.activeState;
    if(activeHeroCharacter?.characterId!=='ara-female'||!grounded||!moving||traversalMotion||input.crouch||
       !['Walk','Run'].includes(clip)||layer?.transitioning){resetFootLock();return {active:false,correction:[0,0,0]};}
    const stance=getAraGaitStance(clip,layer.activeStateProgress);
    const limbs=activeHeroCharacter.getLimbPositions?.();
    if(!limbs){resetFootLock();return {active:false,correction:[0,0,0]};}
    const baseY=player.getPosition().y;
    const corrections=[];
    for(const side of ['left','right']){
      const state=footLockState[side];
      if(!stance[side]){state.active=false;state.kind=null;state.anchor=null;continue;}
      const candidates=[
        {kind:'toe',point:limbs[side+'SoleToe']},
        {kind:'heel',point:limbs[side+'SoleHeel']}
      ].filter(item=>Array.isArray(item.point)&&item.point.length===3&&item.point.every(Number.isFinite)&&Math.abs(item.point[1]-baseY)<.18)
        .map(item=>({ ...item, hit: physics?.raycast?.([item.point[0],item.point[1]+.42,item.point[2]],[item.point[0],item.point[1]-.48,item.point[2]]) }))
        .filter(item=>item.hit&&Array.isArray(item.hit.normal)&&item.hit.normal[1]>.45&&Math.abs(item.point[1]-item.hit.point[1])<.34);
      // Preserve the original contact selection priority (closest to the
      // controller's support height); the raycast only adds true surface data.
      candidates.sort((a,b)=>Math.abs(a.point[1]-baseY)-Math.abs(b.point[1]-baseY));
      const contact=candidates[0];
      if(!contact){state.active=false;state.kind=null;state.anchor=null;continue;}
      if(!state.active||state.kind!==contact.kind){state.anchor=contact.point.slice();state.kind=contact.kind;state.active=true;}
      const dx=state.anchor[0]-contact.point[0];
      const dz=state.anchor[2]-contact.point[2];
      corrections.push({side,x:dx,z:dz,clearance:Math.abs(contact.point[1]-contact.hit.point[1]),kind:contact.kind,contact:contact.point,hit:contact.hit});
    }
    if(!corrections.length){footLockState.lastCorrection=[0,0,0];footLockState.lastSupportSide=null;return {active:false,correction:[0,0,0]};}
    corrections.sort((a,b)=>a.clearance-b.clearance);
    // During double-support transitions, pin the lowest shoe (the true load
    // bearing contact). Averaging conflicting toe-off/landing corrections
    // makes both shoes drift, so only blend when the vectors already agree.
    let dx=corrections[0].x,dz=corrections[0].z;
    if(corrections.length>1&&Math.hypot(corrections[0].x-corrections[1].x,corrections[0].z-corrections[1].z)<.012){
      dx=(corrections[0].x+corrections[1].x)*.5;
      dz=(corrections[0].z+corrections[1].z)*.5;
    }
    const length=Math.hypot(dx,dz),limit=.065;
    if(length>limit){dx*=limit/length;dz*=limit/length;}
    const correction=[dx,0,dz];
    // Keep Ara's proven pelvis translation as the primary world-space foot
    // lock. IK then handles the residual ankle height/leg pose rather than
    // replacing a stable trajectory with a high-gain joint solve.
    const pelvisApplied=Math.hypot(dx,dz)>.0001&&activeHeroCharacter.applyHipsWorldOffset?.(correction)===true;
    if(pelvisApplied){
      footLockState.applications++;
      footLockState.maxCorrection=Math.max(footLockState.maxCorrection,Math.hypot(dx,dz));
    }
    const correctedLimbs=activeHeroCharacter.getLimbPositions?.()||limbs;
    let ikApplied=0,lastIKError=0;
    for(const item of corrections){
      const markerName=item.side+(item.kind==='heel'?'SoleHeel':'SoleToe');
      const marker=correctedLimbs[markerName];
      const ankle=correctedLimbs[item.side+'Ankle']||correctedLimbs[item.side+'Foot'];
      if(!Array.isArray(marker)||!Array.isArray(ankle)||!marker.every(Number.isFinite)||!ankle.every(Number.isFinite))continue;
      const calibratedSoleOffset=ankle[1]-marker[1];
      const targetInfo=makeFootPlantTarget(ankle,item.hit,{maxVerticalOffset:.48,soleOffset:calibratedSoleOffset});
      if(!targetInfo)continue;
      const verticalCorrection=targetInfo.position[1]-ankle[1];
      const normalTilt=Math.hypot(targetInfo.normal[0],targetInfo.normal[2]);
      // Flat level-ground gait stays on its calibrated sole lock. Real height
      // offsets and non-flat support normals invoke the two-bone chain solve.
      if((Math.abs(verticalCorrection)<.08&&normalTilt<.06)||Math.hypot(item.x,item.z)>.02)continue;
      const result=activeHeroCharacter.applyLimbIK?.(item.side,targetInfo.position,.72,targetInfo.normal);
      if(result?.applied){
        ikApplied++;
        lastIKError=result.error;
        footLockState.ikApplications++;
        footLockState.lastIKError=result.error;
        footLockState.lastIKSide=item.side;
      }
    }
    footLockState.lastCorrection=correction;
    footLockState.lastSupportSide=corrections[0].side;
    return {active:true,correction,contacts:corrections.length,supportSide:corrections[0].side,phaseFrame:stance.frame,ikApplied,lastIKError};
  }
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
    const targetState = resolvedName;
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

  function syncLocomotionPlaybackRates(horizontalSpeed) {
    const layer = heroVisual?.anim?.baseLayer;
    const clips = layer?._controller?.animEvaluator?.clips;
    if (!Array.isArray(clips)) return null;
    const speed = Math.max(0, Number(horizontalSpeed) || 0);
    // Calibrated from the Blender 5.2.2 foot-locked gait exports and
    // PlayCanvas sole-marker traces. The clip cadence scales with actual
    // horizontal physics speed so planted steps stay synchronized.
    const WALK_CONTACT_SPEED = 1.515;
    const RUN_CONTACT_SPEED = 3.55;
    const walkRate = pc.math.clamp(speed / WALK_CONTACT_SPEED, 0.08, 3.6);
    const runRate = pc.math.clamp(speed / RUN_CONTACT_SPEED, 0.08, 3.6);
    const rates = { walk: walkRate, run: runRate };
    for (const clip of clips) {
      const trackName = String(clip?.track?.name || clip?.name || '').toLowerCase();
      if (trackName.includes('walk')) clip.speed = walkRate;
      else if (trackName.includes('run') || trackName.includes('sprint')) clip.speed = runRate;
    }
    return rates;
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
    return facialAnimation.setExpression(name, weight) || facialAnimation.setMorph(name, weight);
  }

  function playFaceViseme(name, weight = 1) {
    return facialAnimation.setViseme(name, weight);
  }

  function sampleAnimationMotion(step) {
    if (!activeHeroCharacter?.getRagdollPose || activeHeroCharacter.characterId !== 'ara-female' || ragdollActive || recoverySequence) return;
    animationPoseSampleClock += Math.max(0, Number(step) || 0);
    if (animationPoseSampleClock - lastAnimationPoseSampleClock < 0.05) return;
    const pose = activeHeroCharacter.getRagdollPose();
    if (!pose || !Object.keys(pose).length) return;
    if (lastAnimationPoseSample) {
      const elapsed = animationPoseSampleClock - lastAnimationPoseSampleClock;
      animationBoneVelocities = estimateBoneVelocities(lastAnimationPoseSample, pose, elapsed, [velocity.x, velocity.y, velocity.z]);
    }
    lastAnimationPoseSample = pose;
    lastAnimationPoseSampleClock = animationPoseSampleClock;
  }

  function updateRecoverySequence(step) {
    if (!recoverySequence) return false;
    recoverySequence.elapsed += step;
    if (recoverySequence.phase === 'handoff' && recoverySequence.elapsed <= recoverySequence.blendDuration) {
      const targetPose = activeHeroCharacter?.getRagdollPose?.();
      const weight = smoothStep01(recoverySequence.elapsed / recoverySequence.blendDuration);
      if (targetPose) activeHeroCharacter?.applyBlendedRagdollPose?.(recoverySequence.sourcePose, targetPose, weight);
    }
    if (recoverySequence.phase === 'handoff' && recoverySequence.elapsed >= recoverySequence.blendDuration) {
      recoverySequence.phase = 'get-up';
    }
    if (recoverySequence.phase === 'get-up' && recoverySequence.elapsed >= recoverySequence.clipDuration) {
      transitionHeroClip(heroDefaults.idle, 0.22);
      recoverySequence.phase = 'settle';
      recoverySequence.elapsed = 0;
    } else if (recoverySequence.phase === 'settle' && recoverySequence.elapsed >= 0.24) {
      recoverySequence = null;
      recoveryTimer = 0;
      vitals.finishRecovery();
      setControlEnabled(true);
      return true;
    }
    return false;
  }

  function startCharacterRagdoll({ impactVelocity = [0, 0, 0] } = {}) {
    const rigPose = activeHeroCharacter?.getRagdollPose?.();
    const hipPosition = rigPose?.hips?.position;
    const playerPosition = player.getPosition();
    if (Array.isArray(hipPosition)) {
      ragdollRootOffset = [
        hipPosition[0] - playerPosition.x,
        hipPosition[1] - playerPosition.y,
        hipPosition[2] - playerPosition.z
      ];
    }
    const result = physics?.startRagdoll?.(activeHeroCharacter, {
      velocity: [velocity.x, velocity.y, velocity.z],
      boneVelocities: animationBoneVelocities,
      impactVelocity,
      handoffDuration: 0.16
    });
    if (result?.active) {
      ragdollActive = true;
      lastRagdollState = result;
      lastAnimationPoseSample = null;
      animationBoneVelocities = {};
      if (heroVisual?.anim) heroVisual.anim.playing = false;
      resetFootLock();
    }
    return result || { active: false, error: 'Ragdoll physics adapter unavailable' };
  }

  function updateRagdoll(step) {
    if (!ragdollActive) return null;
    const state = physics?.stepRagdoll?.(step);
    if (!state?.active || !state.rootPosition) return state || null;
    lastRagdollState = state;
    const rootPosition = [
      state.rootPosition[0] - ragdollRootOffset[0],
      Math.max(Number(physics?.getState?.().groundY) || 0, state.rootPosition[1] - ragdollRootOffset[1]),
      state.rootPosition[2] - ragdollRootOffset[2]
    ];
    player.setPosition(rootPosition[0], rootPosition[1], rootPosition[2]);
    // Moving the camera/player anchor also moves Ara's parent entity. Reapply
    // the exact Bullet world pose after that parent shift so the mesh stays
    // attached to the physical body transforms.
    if (state.pose) activeHeroCharacter?.applyRagdollPose?.(state.pose);
    return state;
  }

  function applyDamage(amount, options = {}) {
    const result = vitals.applyDamage(amount, options);
    if (!result.applied) return result;
    const p = player.getPosition();
    const rawDirection = Array.isArray(options.direction) ? options.direction : [0, 0, 0];
    const direction = [0, 1, 2].map(index => Number.isFinite(Number(rawDirection[index])) ? Number(rawDirection[index]) : 0);
    const directionLength = Math.hypot(direction[0], direction[1], direction[2]);
    const impulse = Math.max(0, Math.min(3.5, Number(options.knockback ?? 0.8) || 0));
    // Knockback is a 3D velocity change: preserve vertical hits as well as
    // horizontal ones. A zero direction intentionally produces no impulse.
    const impactVelocity = directionLength > 1e-5
      ? direction.map(value => value / directionLength * impulse)
      : [0, 0, 0];
    resetFootLock();
    if (!result.downed) {
      // Ordinary hit reactions keep the impact on the kinematic player body.
      // For a downing hit, pass it separately to the ragdoll so sampled bone
      // velocities do not already contain the same impulse and double it.
      velocity.x += impactVelocity[0];
      velocity.z += impactVelocity[2];
      if (physics?.teleport) physics.teleport([p.x, p.y, p.z], [velocity.x, velocity.y, velocity.z]);
      actionClip = availableHeroClips.has('Ara_Crouch') ? 'Ara_Crouch' : heroDefaults.landing;
      actionTimer = 0.38;
      transitionHeroClip(actionClip, 0.07);
    } else {
      actionTimer = 0;
      actionClip = '';
      setControlEnabled(false);
      const ragdoll = startCharacterRagdoll({ impactVelocity });
      if (!ragdoll.active) {
        // Keep the previous non-physics downed fallback on unsupported rigs.
        transitionHeroClip(availableHeroClips.has('Ara_Crouch') ? 'Ara_Crouch' : heroDefaults.idle, 0.08);
      }
    }
    onEffect?.('hit-reaction', [p.x, p.y, p.z], { source: options.source || 'world' });
    return result;
  }

  function heal(amount, options = {}) {
    return vitals.heal(amount, options);
  }

  function probeRecoverySupport(x, pelvisY, z, yawDegrees) {
    const yaw = (Number(yawDegrees) || 0) * Math.PI / 180;
    const forward = [Math.sin(yaw), Math.cos(yaw)];
    const right = [Math.cos(yaw), -Math.sin(yaw)];
    const offsets = [[0, 0], [right[0] * 0.16, right[1] * 0.16], [-right[0] * 0.16, -right[1] * 0.16], [forward[0] * 0.18, forward[1] * 0.18], [-forward[0] * 0.18, -forward[1] * 0.18]];
    const hits = offsets.map(([dx, dz]) => {
      const px = x + dx, pz = z + dz;
      const hit = physics?.raycast?.([px, pelvisY + 1.8, pz], [px, pelvisY - 3.2, pz]);
      if (!hit || !Number.isFinite(hit.point?.[1]) || !Array.isArray(hit.normal) || hit.normal[1] < 0.62) return null;
      return { point: hit.point, normal: hit.normal, surface: hit.surface, id: hit.id, center: Math.abs(dx) + Math.abs(dz) < 1e-5 };
    }).filter(Boolean);
    if (!hits.length) return null;
    const heights = hits.map(hit => hit.point[1]).sort((a, b) => a - b);
    const groundY = heights[Math.floor(heights.length / 2)];
    const centerHit = hits.find(hit => hit.center) || null;
    // Keep the reported normal/surface tied to the same height cluster that
    // selected the recovery position. At a stair edge, the center ray can hit
    // a different tread from the median of the surrounding support samples.
    const supportHit = hits.reduce((best, hit) => {
      if (!best) return hit;
      const distance = Math.abs(hit.point[1] - groundY);
      const bestDistance = Math.abs(best.point[1] - groundY);
      if (distance < bestDistance - 1e-4) return hit;
      if (Math.abs(distance - bestDistance) <= 1e-4 && hit.center) return hit;
      return best;
    }, null);
    return {
      groundY,
      normal: supportHit.normal.slice(),
      surface: supportHit.surface,
      id: supportHit.id,
      sampleCount: hits.length,
      supportMinY: heights[0],
      supportMaxY: heights[heights.length - 1],
      supportHeightRange: heights[heights.length - 1] - heights[0],
      centerGroundY: centerHit ? centerHit.point[1] : null
    };
  }

  function recoverFromDowned(options = {}) {
    const result = vitals.recover(options);
    if (!result.applied) return result;
    let recoveryPosition = player.getPosition();
    let recoveryYaw = facingYaw;
    let recoveryPose = null;
    let recoverySupport = null;
    let recoveryVariant = 'face-up';
    if (ragdollActive) {
      const state = physics?.getRagdollState?.() || lastRagdollState || {};
      recoveryPose = physics?.getRagdollPose?.() || activeHeroCharacter?.getRagdollPose?.() || null;
      recoveryVariant = classifyRecoverySide(recoveryPose);
      const pelvis = state.rootPosition;
      if (Array.isArray(pelvis) && pelvis.length === 3) {
        const x = pelvis[0] - ragdollRootOffset[0];
        const z = pelvis[2] - ragdollRootOffset[2];
        const support = probeRecoverySupport(x, pelvis[1], z, recoveryYaw);
        const groundY = Number.isFinite(support?.groundY) ? support.groundY : (Number(physics?.getState?.().groundY) || 0);
        recoveryPosition = new pc.Vec3(x, groundY, z);
        recoverySupport = support;
      }
      recoveryYaw = deriveRecoveryYaw(recoveryPose, recoveryYaw);
      physics?.stopRagdoll?.({ enablePlayer: false });
      ragdollActive = false;
      lastRagdollState = null;
      player.setPosition(recoveryPosition);
      player.setEulerAngles(0, recoveryYaw, 0);
      physics?.teleport?.([recoveryPosition.x, recoveryPosition.y, recoveryPosition.z], [0, 0, 0]);
      physics?.setPlayerEnabled?.(true);
      velocity.set(0, 0, 0);
      smoothedMoveSpeed = 0;
      grounded = true;
      resetFootLock();
      if (heroVisual?.anim) {
        heroVisual.anim.enabled = true;
        heroVisual.anim.playing = true;
      }
      const recoveryClip = recoveryVariant === 'face-down' ? 'Ara_GetUp_FaceDown' : 'Ara_GetUp_FaceUp';
      const selectedClip = availableHeroClips.has(recoveryClip)
        ? recoveryClip
        : (availableHeroClips.has('Ara_Crouch') ? 'Ara_Crouch' : heroDefaults.idle);
      const clipDuration = heroClipDurations[selectedClip] || (selectedClip.startsWith('Ara_GetUp_') ? 1.16 : 0.85);
      transitionHeroClip(selectedClip, 0.06);
      recoverySequence = recoveryPose ? {
        variant: recoveryVariant,
        clip: selectedClip,
        phase: 'handoff',
        sourcePose: recoveryPose,
        elapsed: 0,
        blendDuration: 0.18,
        clipDuration: Math.max(0.3, clipDuration),
        groundY: recoveryPosition.y,
        groundNormal: recoverySupport?.normal || [0, 1, 0],
        supportSamples: recoverySupport?.sampleCount || 0,
        supportSurface: recoverySupport?.surface || 'fallback',
        supportHeightRange: recoverySupport?.supportHeightRange ?? 0,
        supportMinY: recoverySupport?.supportMinY ?? recoveryPosition.y,
        supportMaxY: recoverySupport?.supportMaxY ?? recoveryPosition.y,
        centerGroundY: recoverySupport?.centerGroundY ?? null
      } : null;
      if (recoverySequence) {
        recoveryTimer = 0;
        setControlEnabled(false);
        return { ...result, recoveryVariant, recoveryClip: selectedClip, proceduralGetUp: selectedClip.startsWith('Ara_GetUp_'), recoveryInProgress: true, recoveryGroundY: recoveryPosition.y, recoveryGroundNormal: recoverySupport?.normal || [0, 1, 0], recoverySupportSamples: recoverySupport?.sampleCount || 0, recoverySurface: recoverySupport?.surface || 'fallback', recoverySupportHeightRange: recoverySupport?.supportHeightRange ?? 0, recoverySupportMinY: recoverySupport?.supportMinY ?? recoveryPosition.y, recoverySupportMaxY: recoverySupport?.supportMaxY ?? recoveryPosition.y, recoveryCenterGroundY: recoverySupport?.centerGroundY ?? null };
      }
    }
    velocity.set(0, 0, 0);
    smoothedMoveSpeed = 0;
    physics?.teleport?.([recoveryPosition.x, recoveryPosition.y, recoveryPosition.z], [0, 0, 0]);
    grounded = true;
    recoveryTimer = 0.85;
    setControlEnabled(true);
    actionTimer = 0;
    actionClip = '';
    transitionHeroClip(availableHeroClips.has('Ara_Crouch') ? 'Ara_Crouch' : heroDefaults.idle, 0.32);
    return { ...result, recoveryVariant, recoveryInProgress: true };
  }

  function performTraversal(name,destination,options={}) {
    if(!grounded||traversalMotion)return false;
    if(!Array.isArray(destination)||destination.length!==3||!destination.every(Number.isFinite))return false;
    const p=player.getPosition();
    const requestedClips=Array.isArray(options.clips)?options.clips:[name];
    const missingActionClip=requestedClips.some(clip=>{const resolved=resolveHeroClip(clip);return !resolved||!availableHeroClips.has(resolved);});
    const clips=requestedClips.map(resolveHeroClip).filter(Boolean);
    if(!clips.length)return false;
    const end=[pc.math.clamp(destination[0],-120,4200),Math.max(0,destination[1]),pc.math.clamp(destination[2],-3900,480)];
    const dx=end[0]-p.x,dz=end[2]-p.z,distance=Math.hypot(dx,dz);
    if(distance<.2)return false;
    if(distance>.05 || Number.isFinite(options.facingYaw)) {
      // World-forward is (-sin(yaw), -cos(yaw)); the former positive X
      // delta made horizontal ladder approaches face directly away from walls.
      facingYaw = Number.isFinite(options.facingYaw)
        ? ((options.facingYaw + 540) % 360) - 180
        : Math.atan2(-dx,-dz)*180/Math.PI;
      player.setEulerAngles(0,facingYaw,0);
    }
    const gravity=Math.max(9,Number(physics?.getState?.().gravity)||18);
    const apex=Math.max(.6,Math.min(4.2,Number(options.apex)||1.0));
    const launchVelocity=Math.sqrt(2*gravity*apex);
    const actionPose=options.mode||"vault";
    const kinematicClimb=["step","mantle","ledge","ladder"].includes(actionPose);
    const phaseDurations=Array.isArray(options.phaseDurations)
      ? options.phaseDurations.map(value=>Math.max(.05,Number(value)||.05)) : null;
    const duration=phaseDurations?.length
      ? phaseDurations.reduce((sum,value)=>sum+value,0)
      : kinematicClimb
        ? Math.max(.55,Math.min(40,Number(options.duration)||1.0))
        : Math.max(.55,Math.min(2.8,2*launchVelocity/gravity));
    const activeClip=missingActionClip?(animationFallbacks.action||animationFallbacks.idle):clips[0];
    const ladderBodyWasEnabled = actionPose === 'ladder'
      ? physics?.getState?.().playerBodyEnabled !== false
      : false;
    traversalMotion={start:[p.x,p.y,p.z],end,duration,elapsed:0,apex,mode:actionPose,
      clips,activePhase:0,activeClip,missingActionClip,gravity,launchVelocity,
      kinematic:kinematicClimb,restoreGravity:gravity,phaseDurations,
      playerBodyWasEnabled:ladderBodyWasEnabled,
      mountPosition:Array.isArray(options.mountPosition)?options.mountPosition.slice():null,
      ladderPosition:options.ladderPosition||null,ladderNormal:options.ladderNormal||null,
      rungSpacing:Math.max(.2,Number(options.rungSpacing)||.4),rungCount:Math.max(1,Math.floor(Number(options.rungCount)||1)),blockedTime:0};
    if(kinematicClimb)physics?.setGravity?.(0);
    // The authored ladder path owns the root transform for the whole climb.
    // Disable the dynamic Bullet capsule temporarily so physics cannot pull
    // the player down or push it through the facade while the animation runs.
    if(actionPose === 'ladder' && ladderBodyWasEnabled) physics?.setPlayerEnabled?.(false);
    velocity.set(dx/duration,kinematicClimb?(end[1]-p.y)/duration:launchVelocity,dz/duration);
    actionClip=activeClip;actionTimer=duration;grounded=false;jumpBuffer=0;
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
    if (key === 'v' && !event.repeat) setCameraMode(cameraMode === 'first-person' ? 'third-person' : 'first-person');
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
    cameraPitch = pc.math.clamp(cameraPitch + dy * 0.004,
      cameraMode === 'first-person' ? -1.05 : -0.02,
      cameraMode === 'first-person' ? 1.05 : 0.72);
    manualCameraHold = 2.1;
  };
  const onPointerUp = event => { if (event.pointerId === orbitPointer) orbitPointer = null; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function update(dt) {
    const step = Math.min(dt, 0.05);
    facialAnimation.update(step);
    if (recoverySequence) {
      updateRecoverySequence(step);
      vitals.update(step, { active: false });
      return;
    }
    if (recoveryTimer > 0) {
      recoveryTimer = Math.max(0, recoveryTimer - step);
      if (recoveryTimer === 0) {
        vitals.finishRecovery();
        transitionHeroClip(heroDefaults.idle, 0.18);
      }
      vitals.update(step, { active: false });
      return;
    }
    if (!controlEnabled) {
      vitals.update(step, { active: false });
      if (ragdollActive) updateRagdoll(step);
      return;
    }
    sampleAnimationMotion(step);
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
    const driveMagnitude = Math.hypot(axisX, axisY);
    const hasMoveInput = !traversalMotion && driveMagnitude > 0.12;
    // Ara turns toward the direction the stick is actually moving. The old
    // controller played a forward walk while sliding sideways/backwards, which
    // made her feet and torso look disconnected from the travel direction.
    if (cameraMode === 'first-person') {
      // In FPS mode the camera heading is the player's heading. Horizontal
      // movement remains camera-relative, while lateral movement does not
      // rotate the visible first-person avatar independently of the view.
      facingYaw = ((cameraYaw * 180 / Math.PI + 540) % 360) - 180;
      player.setEulerAngles(0, facingYaw, 0);
    } else if (hasMoveInput && moveLength > 0.12) {
      const targetFacing = Math.atan2(-moveX, -moveZ) * 180 / Math.PI;
      const yawDelta = ((targetFacing - facingYaw + 540) % 360) - 180;
      facingYaw += yawDelta * (1 - Math.exp(-15 * step));
      facingYaw = ((facingYaw + 540) % 360) - 180;
      player.setEulerAngles(0, facingYaw, 0);
    }
    smoothedTurnInput = 0;
    running = hasMoveInput && !input.crouch && (sprintToggled || input.sprint || keys.shift) && vitals.getState().canSprint;
    vitals.update(step, { sprinting: running, active: controlEnabled });
    const stickStrength = pc.math.clamp((driveMagnitude - 0.075) / 0.925, 0, 1);
    // The authored Ara walk gait is calibrated around 1.515 m/s. Keeping the
    // normal walk close to that speed avoids the brisk, almost jogging cadence
    // produced by the old 1.8 m/s target.
    const maxSpeed = input.crouch ? 1.05 : running ? 7.2 : 1.55;
    const targetMoveSpeed = hasMoveInput ? maxSpeed * Math.pow(stickStrength, 0.78) : 0;
    // Give starts a little more weight and releases a crisp, predictable stop.
    const response = hasMoveInput ? 10.5 : 28;
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
      let phase=Math.min(traversalMotion.clips.length-1,Math.floor(Math.min(.999,progress)*traversalMotion.clips.length));
      let phaseProgress=progress;
      if(traversalMotion.phaseDurations?.length){
        let phaseStart=0;phase=traversalMotion.phaseDurations.length-1;
        for(let i=0;i<traversalMotion.phaseDurations.length;i++){
          const phaseEnd=phaseStart+traversalMotion.phaseDurations[i];
          if(traversalMotion.elapsed<phaseEnd||i===traversalMotion.phaseDurations.length-1){
            phase=i;phaseProgress=pc.math.clamp((traversalMotion.elapsed-phaseStart)/traversalMotion.phaseDurations[i],0,1);break;
          }
          phaseStart=phaseEnd;
        }
      }
      if(phase!==traversalMotion.activePhase){traversalMotion.activePhase=phase;traversalMotion.activeClip=traversalMotion.clips[phase]||traversalMotion.activeClip;actionClip=traversalMotion.activeClip;transitionHeroClip(traversalMotion.activeClip,.12);}
      if(traversalMotion.kinematic){
        const smooth=t=>t*t*(3-2*t);
        let target;
        if(traversalMotion.mode==='ladder'&&traversalMotion.mountPosition&&traversalMotion.phaseDurations?.length===3){
          const mount=traversalMotion.mountPosition;
          const climbHeight=Math.max(0,traversalMotion.end[1]-mount[1]);
          const rungCount=traversalMotion.rungCount;
          if(phase===0){
            const eased=smooth(phaseProgress);
            target=traversalMotion.start.map((value,index)=>value+(mount[index]-value)*eased);
          }else if(phase===1){
            // Hold/grip followed by a distinct pull to the next rung. This
            // replaces the old constant smoothstep elevator trajectory.
            const rungPhase=phaseProgress*rungCount;
            const rungIndex=Math.min(rungCount-1,Math.floor(rungPhase));
            const within=rungPhase-rungIndex;
            const pull=smooth(pc.math.clamp((within-.16)/.64,0,1));
            const rungHeight=climbHeight/rungCount;
            const climbed=phaseProgress>=1?climbHeight:(rungIndex+pull)*rungHeight;
            target=[mount[0],mount[1]+climbed,mount[2]];
          }else{
            const top=[mount[0],traversalMotion.end[1],mount[2]];
            const eased=smooth(phaseProgress);
            target=top.map((value,index)=>value+(traversalMotion.end[index]-value)*eased);
          }
          // Ladder poses are now authored and baked on Ara's actual rig in Blender.
          // Do not layer runtime two-bone IK over those rotations: it stretches the limbs.
        }else{
          const eased=smooth(progress);
          target=traversalMotion.start.map((value,index)=>value+(traversalMotion.end[index]-value)*eased);
        }
        const requestedVelocity=[(target[0]-p.x)/step,(target[1]-p.y)/step,(target[2]-p.z)/step];
        // One movement authority per mode: ladder roots follow the authored
        // rung path with the Bullet body detached; other authored climbs can
        // still use the physics solver or a synchronized transform.
        velocity.set(requestedVelocity[0],requestedVelocity[1],requestedVelocity[2]);
        proposedPosition=target;
        if(traversalMotion.mode!=='ladder') physics?.teleport?.(target,[velocity.x,velocity.y,velocity.z]);
        grounded=progress>=1;
        const finishLadderBody=(position)=>{
          physics?.setGravity?.(traversalMotion.restoreGravity);
          if(traversalMotion.mode==='ladder'&&traversalMotion.playerBodyWasEnabled){
            physics?.setPlayerEnabled?.(true);
            physics?.teleport?.(position,[0,0,0]);
          }
        };
        if(traversalMotion.blockedTime>1.25){
          // The root was authored to reach the roof, but a failed route is
          // treated as an abort. Reattach physics at the last safe position.
          finishLadderBody(proposedPosition);
          velocity.set(0,0,0);grounded=false;traversalMotion=null;actionTimer=0;actionClip="";
          heroCharacterPose(null,false);
          onEffect?.("landing",proposedPosition);
        }else if(progress>=1){
          proposedPosition=proposedPosition.slice();
          velocity.set(0,0,0);
          grounded=true;
          finishLadderBody(proposedPosition);
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
      if(jumpBuffer>0&&coyote>0){velocity.y=5.8;grounded=false;coyote=0;jumpBuffer=0;jumpStartTimer=.22;transitionHeroClip('Hero01_JumpStart',.07);onEffect?.("jump",currentPosition);}
      const desired=[movement.x*speed,0,movement.z*speed];
      if(physics?.step){
        const body={position:currentPosition,velocity:[velocity.x,velocity.y,velocity.z],radius:.30,height:1.78,grounded};
        physics.step(body,desired,step);
        velocity.set(body.velocity[0],body.velocity[1],body.velocity[2]);grounded=body.grounded;
        proposedPosition=[pc.math.clamp(body.position[0],-120,4200),body.position[1],pc.math.clamp(body.position[2],-3900,480)];
      }else{
        const blend=Math.min(1,(grounded?24:8)*step);velocity.x+=(desired[0]-velocity.x)*blend;velocity.z+=(desired[2]-velocity.z)*blend;
        if(!grounded)velocity.y-=18.5*step;
        proposedPosition=[pc.math.clamp(p.x+velocity.x*step,-120,4200),p.y+velocity.y*step,pc.math.clamp(p.z+velocity.z*step,-3900,480)];
      }
    }
    input.jumpQueued=false;
    // Authored traversal paths are resolved either by Bullet (ladders) or by
    // their temporary obstacle release (short mantles/ledges). Do not apply a
    // second AABB resolver to those already collision-checked trajectories.
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
    // Drive the animation state from measured motion, not only from the thumb
    // position. This prevents the Walk clip appearing at a near-zero speed and
    // lets the final planted step finish before Ara returns to Idle.
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    moving = !traversalMotion && horizontalSpeed > (input.crouch ? 0.14 : 0.22);
    if (!heroVisual) player.setLocalScale(1, input.crouch ? 0.78 : 1, 1);

    // Heading now follows actual travel direction for forward, reverse and
    // lateral stick input; manual camera orbit remains independent.

    if (heroVisual?.anim) {
      const animationSpeed = input.crouch ? 0 : Math.min(7.2, Math.hypot(velocity.x, velocity.z));
      // The active Idle/Walk/Run state is discrete. Playback cadence follows
      // measured physics speed; we do not blend two incompatible gait cycles.
      const locomotionPlaybackRates = syncLocomotionPlaybackRates(animationSpeed);
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
      } else if (vitals.getState().stamina < 30) {
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
        // Probe the complete foot-to-floor column. The earlier short ray
        // ended above some elevated roof surfaces when a landing pose lifted
        // the ankle bone, so it never reached the actual collision plane.
        const probe = foot => physics?.raycast?.(
          [foot[0], Math.max(foot[1] + .24, p.y + 1.82), foot[2]],
          [foot[0], p.y - .24, foot[2]]
        );
        const leftHit = probe(feet.left), rightHit = probe(feet.right);
        if (leftHit || rightHit) footPlacementHits++;
        // These are support diagnostics only. Keep the imported walk/run rig
        // animation intact; per-frame IK on top of its authored rotations caused
        // visible knee twists and mesh deformation. Ground contact is corrected
        // by the physics capsule's surface snap instead.

      }
    }

    if(moving&&grounded&&!traversalMotion){
      const layer = heroVisual?.anim?.baseLayer;
      const loopState = [heroDefaults.walk, heroDefaults.run, heroDefaults.crouchWalk].includes(layer?.activeState);
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
    if (cameraMode === 'first-person') {
      // Keep the eye camera on the shared physics-controlled player root.
      // The player mesh is hidden in this mode so it cannot clip into the view.
      const eyeHeight = input.crouch ? 1.18 : 1.58;
      const lookDistance = 5;
      cameraTarget.set(p.x, p.y + eyeHeight, p.z);
      desiredCamera.set(
        p.x - Math.sin(yaw) * Math.cos(cameraPitch) * lookDistance,
        p.y + eyeHeight - Math.sin(cameraPitch) * lookDistance,
        p.z - Math.cos(yaw) * Math.cos(cameraPitch) * lookDistance
      );
      camera.setPosition(cameraTarget);
      camera.lookAt(desiredCamera);
      smoothedCamera.copy(cameraTarget);
      cameraInitialized = true;
    } else {
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
      // Keep the existing collision-aware, smoothed third-person follow view.
      if (!cameraInitialized) {
        smoothedCamera.copy(desiredCamera);
        cameraInitialized = true;
      } else {
        smoothedCamera.lerp(smoothedCamera, desiredCamera, Math.min(1, step * (cameraHit ? 18 : 14)));
      }
      camera.setPosition(smoothedCamera);
      camera.lookAt(cameraTarget);
    }
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
    if (enabled && vitals.getState().downed) return false;
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
    heroVisibleRequested = Boolean(visible);
    if (heroVisual) heroVisual.enabled = heroVisibleRequested && cameraMode === 'third-person';
    return Boolean(heroVisual);
  }

  function setCameraMode(mode) {
    const normalized = mode === 'first-person' || mode === 'fps'
      ? 'first-person'
      : mode === 'third-person' || mode === 'tps'
        ? 'third-person'
        : null;
    if (!normalized) return false;
    if (cameraMode === normalized) return cameraMode;

    cameraMode = normalized;
    if (heroVisual) heroVisual.enabled = heroVisibleRequested && cameraMode === 'third-person';
    if (cameraMode === 'first-person') {
      facingYaw = ((cameraYaw * 180 / Math.PI + 540) % 360) - 180;
      player.setEulerAngles(0, facingYaw, 0);
      if (camera.camera) camera.camera.fov = Math.max(defaultCameraFov, 72);
    } else if (camera.camera) {
      camera.camera.fov = defaultCameraFov;
    }

    cameraInitialized = false;
    onCameraModeChange?.(cameraMode);
    return cameraMode;
  }


  function setPosition(position, yaw = 0) {
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) return false;
    player.setPosition(position[0], position[1], position[2]);
    physics?.teleport?.(position, [0, 0, 0]);
    facingYaw = ((Number(yaw) || 0) + 540) % 360 - 180;
    player.setEulerAngles(0, facingYaw, 0);
    velocity.set(0, 0, 0);
    // Teleports invalidate world-space pose deltas. Clearing these samples
    // prevents the next animation tick from mistaking the teleport for bone
    // momentum and injecting an extreme velocity into the Bullet ragdoll.
    lastAnimationPoseSample = null;
    animationBoneVelocities = {};
    animationPoseSampleClock = 0;
    lastAnimationPoseSampleClock = 0;
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
    if(!controlEnabled)resetCameraAfterVehicle();
    return true;
  }

  function setCameraViewYaw(degrees = 0) {
    const value = Number(degrees);
    if (!Number.isFinite(value)) return false;
    cameraYaw = value * Math.PI / 180;
    if (cameraMode === 'first-person') {
      facingYaw = ((value + 540) % 360) - 180;
      player.setEulerAngles(0, facingYaw, 0);
    }
    manualCameraHold = 0.85;
    return cameraYaw;
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
    if (cameraMode === 'first-person') {
      const eyeHeight = input.crouch ? 1.18 : 1.58;
      cameraTarget.set(p.x, p.y + eyeHeight, p.z);
      desiredCamera.set(
        p.x - Math.sin(cameraYaw) * 5 * Math.cos(cameraPitch),
        p.y + eyeHeight - 5 * Math.sin(cameraPitch),
        p.z - Math.cos(cameraYaw) * 5 * Math.cos(cameraPitch)
      );
      camera.setPosition(cameraTarget);
      camera.lookAt(desiredCamera);
      smoothedCamera.copy(cameraTarget);
      cameraInitialized = true;
      return true;
    }
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

  function setMotionForSmoke(position, initialVelocity = [0, 0, 0], yaw = 0) {
    if (!setPosition(position, yaw) || !Array.isArray(initialVelocity) || initialVelocity.length < 3) return false;
    const motion = initialVelocity.slice(0, 3).map(value => Number.isFinite(Number(value)) ? Number(value) : 0);
    velocity.set(motion[0], motion[1], motion[2]);
    grounded = false;
    coyote = 0;
    physics?.teleport?.(position, motion);
    return true;
  }

  function setInputForSmoke(x = 0, y = 0, sprint = false) {
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return false;
    input.x = pc.math.clamp(Number(x), -1, 1);
    input.y = pc.math.clamp(Number(y), -1, 1);
    input.sprint = Boolean(sprint);
    return true;
  }

  const getState=()=>({recovery:recoverySequence?{active:true,variant:recoverySequence.variant,clip:recoverySequence.clip,phase:recoverySequence.phase,elapsed:recoverySequence.elapsed,duration:recoverySequence.clipDuration,groundY:recoverySequence.groundY,groundNormal:recoverySequence.groundNormal,supportSamples:recoverySequence.supportSamples,supportSurface:recoverySequence.supportSurface,supportHeightRange:recoverySequence.supportHeightRange,supportMinY:recoverySequence.supportMinY,supportMaxY:recoverySequence.supportMaxY,centerGroundY:recoverySequence.centerGroundY}: {active:false},position:[player.getPosition().x,player.getPosition().y,player.getPosition().z],grounded,moving,running,traversing:!!traversalMotion,traversalMode:traversalMotion?.mode||null,traversalProgress:traversalMotion?Math.min(1,traversalMotion.elapsed/traversalMotion.duration):1,visible:heroVisual?.enabled!==false,verticalVelocity:velocity.y,horizontalSpeed:Math.hypot(velocity.x,velocity.z),targetMoveSpeed:smoothedMoveSpeed,cameraDistance:cameraDistance,facingYaw,turnInput:smoothedTurnInput,turning:Math.abs(smoothedTurnInput)>.04,controlEnabled,crouched:input.crouch,sprintEnabled:sprintToggled,...vitals.getState(),cameraYaw,cameraPitch,cameraMode,cameraFollowActive:manualCameraHold<=0,cameraManualHold:manualCameraHold,footstepContacts,footPlacementHits,cameraActualDistance:Math.hypot(camera.getPosition().x-cameraTarget.x,camera.getPosition().y-cameraTarget.y,camera.getPosition().z-cameraTarget.z),inputX:input.x,inputY:input.y});
  const queueJumpForSmoke=()=>{input.jumpQueued=true;return true;};
  return {
    player, update, destroy, applyGroundedFootLock, resetFootLock,
    getFootLockState:()=>({applications:footLockState.applications,ikApplications:footLockState.ikApplications,lastIKError:footLockState.lastIKError,lastIKSide:footLockState.lastIKSide,maxCorrection:footLockState.maxCorrection,lastCorrection:footLockState.lastCorrection.slice(),supportSide:footLockState.lastSupportSide,leftActive:footLockState.left.active,rightActive:footLockState.right.active}),
    interact: () => onInteract?.(getState()),
    playAnimation,
    playFaceExpression,
    playFaceViseme,
    applyDamage,
    heal,
    recoverFromDowned,
    getVitalsState: vitals.getState,
    getRagdollState: () => ragdollActive ? (physics?.getRagdollState?.() || lastRagdollState) : { active: false, bodyCount: 0, constraintCount: 0 },
    getRecoveryState: () => recoverySequence ? { active:true, variant:recoverySequence.variant, clip:recoverySequence.clip, phase:recoverySequence.phase, elapsed:recoverySequence.elapsed, duration:recoverySequence.clipDuration } : { active:false },
    probeRecoverySupportForSmoke: (x, pelvisY, z, yaw = facingYaw) => probeRecoverySupport(x, pelvisY, z, yaw),
    getFacialAnimationState: facialAnimation.getState,
    setCrouched,
    setControlEnabled,
    setVisible,
    setPosition,
    getControlInput,
    resetCameraAfterVehicle,
    setCameraViewYaw,
    setCameraMode,
    performTraversal,
    setPositionForSmoke,
    setMotionForSmoke,
    setInputForSmoke,
    queueJumpForSmoke,
    getClipDuration: name => {
      const resolved = resolveHeroClip(name);
      return heroClipDurations[resolved] || heroClipDurations[name] || null;
    },
    getAnimationState: () => ({
      activeClip: activeHeroClip, activeState: heroVisual?.anim?.baseLayer?.activeState || null,
      transitioning: heroVisual?.anim?.baseLayer?.transitioning || false,
      transitionProgress: heroVisual?.anim?.baseLayer?.transitionProgress ?? null,
      activeStateCurrentTime: heroVisual?.anim?.baseLayer?.activeStateCurrentTime ?? null,
      activeStateDuration: heroVisual?.anim?.baseLayer?.activeStateDuration ?? null,
      activeStateProgress: heroVisual?.anim?.baseLayer?.activeStateProgress ?? null,
      componentPlaying: heroVisual?.anim?.playing ?? null,
      componentEnabled: heroVisual?.anim?.enabled ?? null,
      entityEnabled: heroVisual?.enabled ?? null,
      layerPlaying: heroVisual?.anim?.baseLayer?.playing ?? null,
      layerPlayable: heroVisual?.anim?.baseLayer?.playable ?? null,
      availableStates: heroVisual?.anim?.baseLayer?.states || [],
      locomotionPlaybackRates: syncLocomotionPlaybackRates(Math.hypot(velocity.x,velocity.z)),
      evaluatorClips: (heroVisual?.anim?.baseLayer?._controller?.animEvaluator?.clips||[]).map(clip=>({name:clip.name,trackName:clip.track?.name||null,speed:clip.speed,playing:clip.playing})),
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
      facialAnimation: facialAnimation.getState(),
      vitals: vitals.getState(),
      recovery: recoverySequence ? { active:true, variant:recoverySequence.variant, clip:recoverySequence.clip, phase:recoverySequence.phase } : { active:false },
      playable: !!heroVisual?.anim?.playable
    }),
    getRigSnapshot:()=>activeHeroCharacter?.getRigSnapshot?.()||{skinnedMeshCount:0,weightedVertexCount:0,weightedClothingMeshCount:0,boneCount:0,bones:[]},
    getState
  };
}
