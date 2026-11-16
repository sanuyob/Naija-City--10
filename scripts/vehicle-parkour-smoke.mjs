import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4188;
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;

try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(origin)).ok) { ready = true; break; }
    } catch {}
    if (server.exitCode !== null) throw new Error('Preview exited with ' + server.exitCode);
    await delay(300);
  }
  if (!ready) throw new Error('Preview did not start');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(origin + '?smoke=vehicle-parkour', { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.__NAIJA_GAME__?.ready &&
    window.__NAIJA_GAME__?.playerCharacterReady &&
    window.__NAIJA_GAME__?.getVehicleState?.()?.modelReady,
    null, { timeout: 120000 }
  );
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getPhysicsState?.().player.steps > 10, null, { timeout: 30000 });

  const inventory = await page.evaluate(() => ({
    buildings: window.__NAIJA_GAME__.buildingRoofRoutes,
    accessPoints: window.__NAIJA_GAME__.buildingAccessPoints,
    traversal: window.__NAIJA_GAME__.getTraversalState(),
    vehicle: window.__NAIJA_GAME__.getVehicleState(),
    controls: ['vehicle-controls', 'drive-accelerate', 'drive-brake', 'drive-left', 'drive-right', 'drive-exit'].map(id => !!document.getElementById(id))
  }));
  if (inventory.buildings !== 48 || inventory.accessPoints !== 192 ||
      inventory.traversal.buildingRouteCount !== 48 ||
      inventory.traversal.buildingAccessPointCount !== 192 ||
      inventory.vehicle.wheelCount !== 4 ||
      !String(inventory.vehicle.modelSource).includes('Ara 3D Gen') ||
      !inventory.vehicle.modelParts?.driverDoor ||
      !inventory.vehicle.modelParts?.driverWindow ||
      !inventory.vehicle.modelParts?.passengerDoor ||
      !inventory.vehicle.modelParts?.passengerWindow ||
      !inventory.vehicle.modelParts?.steeringWheel ||
      inventory.vehicle.wheelAlignmentMaxError === null ||
      !inventory.vehicle.playerCarColliderReady ||
      inventory.controls.some(value => !value)) {
    throw new Error('Building access or vehicle asset contract failed: ' + JSON.stringify(inventory));
  }

  const carCollision = await page.evaluate(() => window.__NAIJA_GAME__.debugProbeVehicleColliderForSmoke());
  const bodyCollision = await page.evaluate(() => window.__NAIJA_GAME__.debugProbeVehicleBodyCollisionForSmoke());
  if (!carCollision.vehicleColliderReady || !carCollision.hit || carCollision.hit.surface !== 'metal' ||
      !bodyCollision.vehicleColliderReady || !bodyCollision.blockedByCar || bodyCollision.finalOffset < 1.25 || bodyCollision.movementTowardCar < .65) {
    throw new Error('The sedan must physically stop the player capsule, not merely be raycast-visible: ' + JSON.stringify({carCollision,bodyCollision}));
  }
  const entered = await page.evaluate(() => window.__NAIJA_GAME__.debugEnterVehicleForSmoke());
  const enteringState = await page.evaluate(() => ({
    vehicle:window.__NAIJA_GAME__.getVehicleState(),
    visible:window.__NAIJA_GAME__.getPlayerState().visible,
    controllerEnabled:window.__NAIJA_GAME__.getPlayerState().controlEnabled,
    bodyEnabled:window.__NAIJA_GAME__.getPhysicsState().player.playerBodyEnabled,
    hudHidden:document.querySelector('#vehicle-controls')?.hidden
  }));
  if (!entered || !enteringState.vehicle.entering || enteringState.vehicle.entryPhase !== 'approach' || !enteringState.visible ||
      enteringState.controllerEnabled || enteringState.bodyEnabled !== true || !enteringState.hudHidden) {
    throw new Error('Visible, collision-aware vehicle approach did not start: ' + JSON.stringify(enteringState));
  }
  await page.waitForFunction(() => {
    const car=window.__NAIJA_GAME__?.getVehicleState?.();
    return car?.entryPhase==='door' && car?.entryAnimation==='Ara_DoorOpen' && car?.modelParts?.driverDoorAngle>15;
  }, null, { timeout: 45000 });
  const doorPose=await page.evaluate(()=>({vehicle:window.__NAIJA_GAME__.getVehicleState(),animation:window.__NAIJA_GAME__.getHeroAnimationState()}));
  if(doorPose.animation.activeClip!=='Ara_DoorOpen'||!doorPose.vehicle.entering){
    throw new Error('Ara must visibly play the dedicated door-opening pose: '+JSON.stringify(doorPose));
  }
  await page.waitForFunction(() => {
    const car=window.__NAIJA_GAME__?.getVehicleState?.();
    return car?.entryPhase==='seat' && car?.entryAnimation==='Ara_EnterVehicle';
  }, null, { timeout: 15000 });
  const seatPose=await page.evaluate(()=>({vehicle:window.__NAIJA_GAME__.getVehicleState(),animation:window.__NAIJA_GAME__.getHeroAnimationState(),visible:window.__NAIJA_GAME__.getPlayerState().visible}));
  if(seatPose.animation.activeClip!=='Ara_EnterVehicle'||!seatPose.visible||seatPose.vehicle.playerCarColliderReady!==true){
    throw new Error('Ara must play the dedicated seat-entry pose while visible: '+JSON.stringify(seatPose));
  }
  try {
    await page.waitForFunction(() => window.__NAIJA_GAME__?.getVehicleState?.().occupied === true, null, { timeout: 20000 });
  } catch (error) {
    const state=await page.evaluate(()=>window.__NAIJA_GAME__?.getVehicleState?.());
    if(!state?.occupied)throw new Error('Vehicle entry did not complete: '+JSON.stringify({state,browserErrors:errors,waitError:error.message}));
  }
  const seated = await page.evaluate(() => ({
    vehicle:window.__NAIJA_GAME__.getVehicleState(),
    controllerEnabled:window.__NAIJA_GAME__.getPlayerState().controlEnabled,
    bodyEnabled:window.__NAIJA_GAME__.getPhysicsState().player.playerBodyEnabled,
    visible:window.__NAIJA_GAME__.getPlayerState().visible,
    hudHidden:document.querySelector('#vehicle-controls')?.hidden
  }));
  if (!seated.vehicle.occupied || seated.vehicle.entering || seated.controllerEnabled || seated.bodyEnabled || seated.visible || seated.hudHidden) {
    throw new Error('Vehicle enter handoff did not finish: ' + JSON.stringify(seated));
  }
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getVehicleState?.().modelParts?.driverDoorAngle < 2, null, { timeout: 20000 });

  // Check both control layouts. Two-Handed is the default: steering left,
  // accelerator/brake right. One-Handed moves those axes onto the thumb stick.
  const twoHandedLayout=await page.evaluate(()=>({
    mode:window.__NAIJA_RPG_UI__?.getVehicleControlsMode?.(),
    pedalDisplay:getComputedStyle(document.querySelector('.drive-pedals')).display,
    steeringDisplay:getComputedStyle(document.querySelector('.drive-steering')).display
  }));
  if(twoHandedLayout.mode!=='two-handed'||twoHandedLayout.pedalDisplay==='none'||twoHandedLayout.steeringDisplay==='none'){
    throw new Error('Two-Handed vehicle controls must be visible by default: '+JSON.stringify(twoHandedLayout));
  }
  await page.evaluate(()=>window.__NAIJA_RPG_UI__?.setVehicleControlsMode?.('one-handed'));
  const oneHandedLayout=await page.evaluate(()=>({
    mode:window.__NAIJA_RPG_UI__?.getVehicleControlsMode?.(),
    pedalDisplay:getComputedStyle(document.querySelector('.drive-pedals')).display,
    steeringDisplay:getComputedStyle(document.querySelector('.drive-steering')).display,
    stickDisplay:getComputedStyle(document.querySelector('#move-joystick')).display
  }));
  if(oneHandedLayout.mode!=='one-handed'||oneHandedLayout.pedalDisplay!=='none'||oneHandedLayout.steeringDisplay!=='none'||oneHandedLayout.stickDisplay==='none'){
    throw new Error('One-Handed layout must hide the arrow buttons and expose the thumb stick: '+JSON.stringify(oneHandedLayout));
  }
  await page.evaluate(()=>window.__NAIJA_RPG_UI__?.setVehicleControlsMode?.('two-handed'));

  async function holdButton(selector,physicsFrames){
    const box=await page.locator(selector).boundingBox();
    if(!box)throw new Error('Vehicle touch control is not visible: '+selector);
    const before=await page.evaluate(()=>window.__NAIJA_GAME__.getVehicleState().physicsSteps);
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    try{
      // Keep the control pressed until the vehicle simulation—not wall-clock
      // time—has advanced the requested number of frames. SwiftShader can
      // render slowly, so releasing after a fixed delay produces false fails.
      await page.waitForFunction(({before,physicsFrames})=>
        window.__NAIJA_GAME__?.getVehicleState?.().physicsSteps>=before+physicsFrames,
        {before,physicsFrames},{timeout:120000});
      return await page.evaluate(()=>window.__NAIJA_GAME__.getVehicleState());
    }finally{
      await page.mouse.up();
    }
  }
  const accelerated = await holdButton('#drive-accelerate',90);
  if (accelerated.speedKmh < 50 || accelerated.dynamics.measuredWheelContacts < 3 ||
      accelerated.wheelAlignmentMaxError > .18 || accelerated.dynamics.uprightTiltDegrees>4.5 || Math.abs(accelerated.dynamics.pitchDegrees)>4.5) {
    throw new Error('The Two-Handed accelerator must move the sedan without tipping and retain four wheel contacts: ' + JSON.stringify(accelerated));
  }

  const turned = await holdButton('#drive-right',36);
  const turnDegrees = Math.abs(((turned.yaw - accelerated.yaw + 540) % 360) - 180);
  if (turnDegrees < 4 || turned.dynamics.uprightTiltDegrees>4.5 || Math.abs(turned.dynamics.pitchDegrees)>4.5) {
    throw new Error('The steering arrows must change heading without tumbling the car: ' + JSON.stringify({turnDegrees,turned}));
  }

  const braked = await holdButton('#drive-brake',36);
  if (braked.speedKmh >= turned.speedKmh - 4 || braked.dynamics.uprightTiltDegrees>4.5) {
    throw new Error('The brake/reverse arrow must slow the sedan without upsetting the chassis: ' + JSON.stringify({turned:turned.speedKmh,braked}));
  }

  const exited = await page.evaluate(() => window.__NAIJA_GAME__.debugExitVehicleForSmoke());
  await page.waitForFunction(() => {
    const car=window.__NAIJA_GAME__?.getVehicleState?.();
    const player=window.__NAIJA_GAME__?.getPlayerState?.();
    return car&&!car.occupied&&player?.controlEnabled===true&&player?.visible===true;
  }, null, { timeout: 15000 });
  const onFoot = await page.evaluate(() => ({
    player:window.__NAIJA_GAME__.getPlayerState(),
    vehicle:window.__NAIJA_GAME__.getVehicleState(),
    bodyEnabled:window.__NAIJA_GAME__.getPhysicsState().player.playerBodyEnabled,
    hudHidden:document.querySelector('#vehicle-controls')?.hidden,
    cameraDistance:window.__NAIJA_GAME__.getPlayerState().cameraActualDistance
  }));
  if (!exited || !onFoot.player.controlEnabled || !onFoot.bodyEnabled || !onFoot.hudHidden ||
      onFoot.vehicle.occupied || onFoot.cameraDistance > 4.6) {
    throw new Error('Vehicle exit must animate Ara back outside and restore the close chase camera: ' + JSON.stringify(onFoot));
  }
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getVehicleState?.().modelParts?.driverDoorAngle < 2, null, { timeout: 15000 });

  const ladderStart=await page.evaluate(()=>window.__NAIJA_GAME__.debugStartBuildingTraversalForSmoke('yaba-core-01','ladder'));
  if(!ladderStart.started)throw new Error('Could not start a live Yaba building ladder climb: '+JSON.stringify(ladderStart));
  // Run the real PlayCanvas AnimComponentSystem and Bullet solver together at
  // deterministic 50 ms steps. Unlike the old helper, this advances the
  // imported skeletal animation on every physics step and samples limb motion.
  const ladderSimulation=await page.evaluate(()=>window.__NAIJA_GAME__.debugCompleteTraversalForSmoke(900));
  if(!ladderSimulation.completed||ladderSimulation.simulatedFrames<5||!ladderSimulation.animationSystemAvailable){
    throw new Error('The PlayCanvas animation + Bullet ladder simulation did not complete: '+JSON.stringify(ladderSimulation));
  }
  const ladderMidTrace=ladderSimulation.pulseTrace;
  const ladderPulseMetrics={positiveSamples:ladderMidTrace.positiveSamples,holdSamples:ladderMidTrace.holdSamples,maxStep:ladderMidTrace.maxStep};
  const ladderFinal=await page.evaluate(start=>{
    const game=window.__NAIJA_GAME__,player=game.getPlayerState(),traversal=game.getTraversalState();
    const feet=game.getHeroFootPositions?.()||null;
    const roofGround=game.getGroundProbe?.([player.position[0],player.position[1]+.45,player.position[2]],
      [player.position[0],player.position[1]-.45,player.position[2]])||null;
    return {started:true,requestedType:'ladder',completedType:traversal.lastTraversal?.type,
      buildingId:traversal.lastTraversal?.buildingId,clip:traversal.lastTraversal?.clip,
      clips:traversal.lastTraversal?.clips||[],height:player.position[1],destination:traversal.lastTraversal?.destination,
      finalPosition:player.position,facingYaw:player.facingYaw,expectedFacingYaw:start.expectedFacingYaw,
      grounded:player.grounded,rungCount:traversal.lastTraversal?.rungCount||0,
      climbDuration:traversal.lastTraversal?.duration||0,roofGround,feet,
      footPlacementHits:player.footPlacementHits,visualBounds:game.getHeroVisualBounds?.()||null,
      animation:game.getHeroAnimationState?.()||null,traversalsCompleted:traversal.traversalsCompleted,
      routePosition:start.routePosition,approach:start.approach};
  },ladderStart);
  const ladderFootY=[ladderFinal.feet?.left?.[1],ladderFinal.feet?.right?.[1]].filter(Number.isFinite);
  const roofY=ladderFinal.roofGround?.point?.[1];
  const footErrors=Number.isFinite(roofY)&&ladderFootY.length?ladderFootY.map(y=>Number((y-roofY).toFixed(3))):[];
  const ladder= {...ladderFinal,footErrors,pulseTrace:ladderPulseMetrics,clipChanges:ladderSimulation.clipChanges,limbMotion:ladderSimulation.limbMotion,animationSteps:ladderSimulation.animationSteps,physicsSteps:ladderSimulation.physics?.steps||0};

  // Walk on the roof using real keyboard events and fixed-step PlayCanvas
  // controller/animation updates. This verifies that the capsule remains on
  // the raised roof and that the authored feet do not skate across it.
  await page.keyboard.down('w');
  const roofWalkRun=await page.evaluate(()=>window.__NAIJA_GAME__.debugAdvanceTraversalForSmoke(30));
  await page.keyboard.up('w');
  const roofSettle=await page.evaluate(()=>window.__NAIJA_GAME__.debugAdvanceTraversalForSmoke(4));
  const roofWalkSamples=roofWalkRun.trace||[];
  const validRoofWalk=roofWalkSamples.filter(x=>Number.isFinite(x.roofY));
  const maxRoofPenetration=validRoofWalk.length?Math.max(...validRoofWalk.map(x=>x.roofY-x.position[1])):Infinity;
  const maxRoofError=validRoofWalk.length?Math.max(...validRoofWalk.map(x=>Math.abs(x.roofY-x.position[1]))):Infinity;
  const roofTravel=roofWalkSamples.length>1?Math.hypot(roofWalkSamples.at(-1).position[0]-roofWalkSamples[0].position[0],roofWalkSamples.at(-1).position[2]-roofWalkSamples[0].position[2]):0;
  // Select the sole marker (toe or heel) nearest the roof plane for each
  // foot. Reset on marker switches so heel-to-toe rocking is not counted as
  // sliding. Only real sole contacts within 10 cm of the collision surface
  // contribute to the planted-foot displacement measurement.
  const footSlideFor=side=>{
    let previous=null,max=0,total=0,count=0,contacts=0;
    for(const sample of roofWalkSamples){
      if(!Number.isFinite(sample.roofY)){previous=null;continue;}
      const candidates=[
        {kind:'toe',point:sample.limbs?.[side+'SoleToe']},
        {kind:'heel',point:sample.limbs?.[side+'SoleHeel']}
      ].filter(item=>item.point?.every(Number.isFinite));
      if(!candidates.length){previous=null;continue;}
      candidates.sort((a,b)=>Math.abs(a.point[1]-sample.roofY)-Math.abs(b.point[1]-sample.roofY));
      const contact=candidates[0];
      if(Math.abs(contact.point[1]-sample.roofY)>.10){previous=null;continue;}
      contacts++;
      if(previous&&sample.time-previous.time>.034)previous=null;
      if(previous&&previous.kind===contact.kind){
        const delta=Math.hypot(contact.point[0]-previous.point[0],contact.point[2]-previous.point[2]);
        max=Math.max(max,delta);total+=delta;count++;
      }
      previous={kind:contact.kind,point:contact.point};
    }
    return {max:Number(max.toFixed(3)),mean:Number((count?total/count:0).toFixed(3)),pairs:count,contacts};
  };
  const leftFootSlide=footSlideFor('left'),rightFootSlide=footSlideFor('right');
  ladder.roofWalk={samples:roofWalkSamples.length,validSamples:validRoofWalk.length,
    maxRoofPenetration:Number(maxRoofPenetration.toFixed(3)),maxRoofError:Number(maxRoofError.toFixed(3)),travel:Number(roofTravel.toFixed(3)),
    leftFootSlide,rightFootSlide,
    maxLeftFootSlide:leftFootSlide.max,maxRightFootSlide:rightFootSlide.max,
    final:{position:roofSettle.player.position,grounded:roofSettle.player.grounded,animationSystemAvailable:roofSettle.animationSystemAvailable}};

  const parkour=[ladder];
  for (const routeType of ['mantle', 'ledge', 'wall-run']) {
    const result = await page.evaluate(type => {
      const action = window.__NAIJA_GAME__.debugTraverseBuildingForSmoke('yaba-core-01', type);
      return {
        started: action.started,
        requestedType: type,
        completedType: action.traversal.lastTraversal?.type,
        buildingId: action.traversal.lastTraversal?.buildingId,
        clip: action.traversal.lastTraversal?.clip,
        clips: action.traversal.lastTraversal?.clips||[],
        height: action.player.position[1],
        destination: action.traversal.lastTraversal?.destination,
        finalPosition: action.player.position,
        facingYaw: action.player.facingYaw,
        expectedFacingYaw: action.expectedFacingYaw,
        grounded: action.player.grounded,
        rungCount: action.traversal.lastTraversal?.rungCount||0,
        climbDuration: action.traversal.lastTraversal?.duration||0,
        roofGround: window.__NAIJA_GAME__.getGroundProbe?.(
          [action.player.position[0],action.player.position[1]+.45,action.player.position[2]],
          [action.player.position[0],action.player.position[1]-.45,action.player.position[2]]
        )||null,
        completed: action.traversal.traversalsCompleted
      };
    }, routeType);
    await page.waitForTimeout(500);
    result.feet = await page.evaluate(()=>window.__NAIJA_GAME__.getHeroFootPositions?.()||null);
    parkour.push(result);
  }
  if (parkour.some(route =>
    !route.started ||
    route.requestedType !== route.completedType ||
    route.buildingId !== 'yaba-core-01' ||
    (route.requestedType !== 'wall-run' && route.height < 15) ||
    (route.requestedType === 'wall-run' && Math.hypot(
      route.finalPosition[0] - route.destination[0],
      route.finalPosition[2] - route.destination[2]
    ) > 1.25) ||
    !route.grounded ||
    Math.abs(((route.facingYaw-route.expectedFacingYaw+540)%360)-180)>2 ||
    (route.requestedType==='ladder'&&route.rungCount<20) ||
    (route.requestedType==='ladder'&&route.climbDuration<10) ||
    (route.requestedType==='ladder'&&!['Ara_LadderMount','Ara_LadderClimb','Ara_LadderDismount'].every(name=>route.clips.includes(name))) ||
    (route.requestedType==='ladder'&&(!route.roofGround||Math.abs(route.roofGround.point?.[1]-route.height)>.16)) ||
    (route.requestedType==='ladder'&&(!route.pulseTrace||route.pulseTrace.positiveSamples<8||route.pulseTrace.holdSamples<2||route.pulseTrace.maxStep<.02)) ||
    (route.requestedType==='ladder'&&['Ara_LadderMount','Ara_LadderClimb','Ara_LadderDismount'].some(name=>!route.clipChanges.includes(name))) ||
    (route.requestedType==='ladder'&&['leftHandTip','rightHandTip','leftFoot','rightFoot'].some(name=>(route.limbMotion?.[name]?.verticalRange||0)<.12)) ||
    (route.requestedType==='ladder'&&(!route.roofWalk?.validSamples||route.roofWalk.maxRoofPenetration>.08||route.roofWalk.maxRoofError>.08||route.roofWalk.final?.grounded!==true||route.roofWalk.travel<.5)) ||
    (route.requestedType==='ladder'&&Math.max(route.roofWalk?.maxLeftFootSlide??Infinity,route.roofWalk?.maxRightFootSlide??Infinity)>.10) ||
    (route.requestedType==='ladder'&&(route.footErrors.length!==2||route.footErrors.some(error=>error<-.08||error>.55))) ||
    (route.requestedType==='ladder'&&route.footPlacementHits<1) ||
    (route.requestedType!=='wall-run'&&(!route.roofGround||Math.abs(route.finalPosition[1]-route.roofGround.point[1])>.08))
  )) {
    throw new Error('One or more targeted building parkour routes failed: ' + JSON.stringify(parkour));
  }

  if (errors.length) throw new Error('Browser runtime errors: ' + errors.join(' | '));

  console.log(JSON.stringify({
    pass: true,
    buildingNetwork: { buildings: inventory.buildings, accessPoints: inventory.accessPoints, stuntTypes: inventory.traversal.availableTypes },
    vehicle: {
      model: inventory.vehicle.modelSource,
      wheels: inventory.vehicle.wheelCount,
      driverDoorAnimations: 'visible approach + Ara_DoorOpen + Ara_EnterVehicle + Ara_ExitVehicle + door close',
      solidChassisProxy: carCollision.vehicleColliderReady && carCollision.hit?.surface==='metal' && bodyCollision.blockedByCar,
      twoHandedTouchControls: twoHandedLayout.pedalDisplay!=='none' && twoHandedLayout.steeringDisplay!=='none',
      oneHandedTouchControls: oneHandedLayout.stickDisplay!=='none' && oneHandedLayout.pedalDisplay==='none',
      maximumRollPitchDegrees: Math.max(accelerated.dynamics.uprightTiltDegrees,Math.abs(accelerated.dynamics.pitchDegrees)),
      wheelAlignmentMaxError: accelerated.wheelAlignmentMaxError,
      measuredRoadWheelContacts: accelerated.dynamics.measuredWheelContacts,
      topTestSpeedKmh: accelerated.speedKmh,
      brakedSpeedKmh: braked.speedKmh,
      steeringTurnDegrees: turnDegrees,
      exitCameraDistance: onFoot.cameraDistance
    },
    carCollision,
    bodyCollision,
    entry: { visibleApproach: enteringState.visible, dedicatedDoorPose:doorPose.animation.activeClip, dedicatedSeatPose:seatPose.animation.activeClip, staged: true, final: seated },
    parkour,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
