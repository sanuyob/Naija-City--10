import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4220;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'
], { stdio: 'ignore' });
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) { ready = true; break; }
    } catch {}
    await delay(250);
  }
  assert(ready, 'Vite did not start');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${origin}/?smoke=ara-ik-ragdoll`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(
    () => window.__NAIJA_GAME__?.ready && window.__NAIJA_GAME__?.playerCharacterReady,
    null,
    { timeout: 120000 }
  );

  // Exercise the real animated Ara leg chain and check the end-effector error
  // before the next animation tick can replace this procedural correction.
  await page.evaluate(() => {
    const game = window.__NAIJA_GAME__;
    game.debugSetPlayerForSmoke([0, 0, 0], 0);
    game.debugSetPlayerInputForSmoke(0, 0, false);
    window.__NAIJA_PLAY_HERO_ANIMATION__('Walk', 2.2);
  });
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(30, 1 / 60));
  const ik = await page.evaluate(() => {
    const game = window.__NAIJA_GAME__;
    const before = game.getHeroRigSnapshot().bones;
    const beforeUpper = before.find(bone => bone.name === 'LeftUpLeg')?.rotation;
    const beforeLower = before.find(bone => bone.name === 'LeftLeg')?.rotation;
    const ankle = game.getHeroLimbPositions().leftAnkle;
    const pose = game.debugGetHeroRagdollPoseForSmoke();
    const hip = pose?.leftThigh?.position;
    const knee = pose?.leftShin?.position;
    if (!hip || !knee || !ankle) throw new Error('Ara IK test could not read the live left-leg chain');
    const distance = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
    const upperLength = distance(hip, knee);
    const lowerLength = distance(knee, ankle);
    const currentReach = distance(hip, ankle);
    const minReach = Math.abs(upperLength-lowerLength) + 0.02;
    const maxReach = upperLength + lowerLength - 0.02;
    const targetReach = Math.max(minReach, Math.min(maxReach, currentReach - 0.035));
    const direction = ankle.map((value, index) => (value-hip[index]) / Math.max(currentReach, 1e-6));
    const target = hip.map((value, index) => value + direction[index] * targetReach);
    const result = game.debugApplyHeroLimbIKForSmoke('left', target, 0.95);
    const after = game.getHeroRigSnapshot().bones;
    return {
      result,
      upperBefore: beforeUpper,
      upperAfter: after.find(bone => bone.name === 'LeftUpLeg')?.rotation,
      lowerBefore: beforeLower,
      lowerAfter: after.find(bone => bone.name === 'LeftLeg')?.rotation
    };
  });
  assert(ik.result?.applied, 'Ara left-leg IK did not bind to the live skeleton');
  assert(ik.result?.reachable, `Ara IK test target was unexpectedly unreachable: ${JSON.stringify(ik.result)}`);
  assert(Number.isFinite(ik.result?.error) && ik.result.error <= 0.01,
    `Ara IK end-effector error exceeded 1 cm: ${ik.result?.error}`);
  assert(JSON.stringify(ik.upperBefore) !== JSON.stringify(ik.upperAfter), 'IK did not rotate Ara upper-leg bone');
  assert(JSON.stringify(ik.lowerBefore) !== JSON.stringify(ik.lowerAfter), 'IK did not rotate Ara lower-leg bone');

  // Lethal damage must create a physics ragdoll, not just a crouch animation.
  const damage = await page.evaluate(() =>
    window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, { knockback: 0.6, direction: [1, 0, 0] })
  );
  const started = await page.evaluate(() => ({
    ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll,
    physics: window.__NAIJA_GAME__.getPhysicsState().player,
    player: window.__NAIJA_GAME__.getPlayerState(),
    animations: window.__NAIJA_GAME__.heroAnimations
  }));
  assert(damage?.downed, 'Lethal damage did not enter the downed state');
  assert(started.ragdoll.active && started.ragdoll.bodyCount === 11 && started.ragdoll.constraintCount === 10,
    `Ragdoll did not create the expected articulated body: ${JSON.stringify(started.ragdoll)}`);
  assert(started.physics.playerBodyEnabled === false, 'Player capsule was not disabled during ragdoll');
  assert(started.player.controlEnabled === false, 'Player controls were not disabled during ragdoll');
  assert(started.animations.includes('Ara_GetUp_FaceUp') && started.animations.includes('Ara_GetUp_FaceDown'),
    'Both generated front/back get-up clips must be bound to Ara skeleton');

  const handoffRun = await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(3, 1 / 60));
  const partialHandoff = handoffRun.ragdollTrace.find(item => item.handoffWeight > 0 && item.handoffWeight < 1);
  const handoff = await page.evaluate(() => window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll);
  assert(partialHandoff || handoff.handoffWeight === 1,
    `Ragdoll handoff blend did not produce an in-between state or complete safely: ${JSON.stringify({partialHandoff,handoff})}`);
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(177, 1 / 60));
  const resting = await page.evaluate(() => ({
    ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll,
    physics: window.__NAIJA_GAME__.getPhysicsState().player
  }));
  assert(resting.ragdoll.active && resting.ragdoll.stepCount >= 180,
    'Ragdoll did not advance through the physics simulation');
  assert(resting.ragdoll.handoffWeight === 1 && resting.ragdoll.phase === 'ragdoll',
    'Ragdoll handoff did not finish blending to physics ownership');
  assert(resting.ragdoll.maxBodySpeed < 12,
    `Ragdoll body velocity became unstable: ${resting.ragdoll.maxBodySpeed}`);
  assert(Number.isFinite(resting.ragdoll.rootPosition?.[1]) &&
    resting.ragdoll.rootPosition[1] >= -0.05 && resting.ragdoll.rootPosition[1] < 0.4,
    `Ragdoll failed to settle on the city floor: ${JSON.stringify(resting.ragdoll.rootPosition)}`);

  const recovery = await page.evaluate(() => window.__NAIJA_GAME__.debugRecoverPlayerForSmoke());
  const recoveryStarted = await page.evaluate(() => ({
    ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll,
    physics: window.__NAIJA_GAME__.getPhysicsState().player,
    player: window.__NAIJA_GAME__.getPlayerState(),
    recovery: window.__NAIJA_GAME__.debugGetRecoveryStateForSmoke(),
    animation: window.__NAIJA_GAME__.getHeroAnimationState()
  }));
  assert(recovery?.applied, 'Recovery was rejected');
  assert(recoveryStarted.ragdoll.active === false, 'Ragdoll bodies were not removed during recovery');
  assert(recoveryStarted.physics.playerBodyEnabled === true, 'Player capsule was not restored');
  assert(recoveryStarted.player.controlEnabled === false && recoveryStarted.player.downed === false,
    'Player controls should remain locked during the get-up sequence');
  assert(recoveryStarted.recovery.active && recoveryStarted.recovery.clip.startsWith('Ara_GetUp_'),
    `A front/back get-up animation was not selected: ${JSON.stringify(recoveryStarted.recovery)}`);
  await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(110, 1 / 60));
  const recovered = await page.evaluate(() => ({
    ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll,
    physics: window.__NAIJA_GAME__.getPhysicsState().player,
    player: window.__NAIJA_GAME__.getPlayerState(),
    recovery: window.__NAIJA_GAME__.debugGetRecoveryStateForSmoke()
  }));
  assert(recovered.ragdoll.active === false, 'Ragdoll unexpectedly restarted during recovery');
  assert(recovered.physics.playerBodyEnabled === true, 'Player capsule was not retained after recovery');
  assert(recovered.player.controlEnabled === true && recovered.player.downed === false,
    'Player controls/vitals were not restored after the get-up animation');
  assert(recovered.recovery.active === false, 'Get-up state machine did not finish');

  const terrain = await page.evaluate(() => window.__NAIJA_GAME__.debugRunUnevenTerrainIKForSmoke());
  assert(terrain.pass, `Uneven-terrain foot IK failed: ${JSON.stringify(terrain)}`);
  assert(errors.length === 0, `Browser runtime errors: ${errors.join(' | ')}`);

  console.log(JSON.stringify({
    pass: true,
    ik: {
      applied: ik.result.applied,
      reachable: ik.result.reachable,
      endEffectorErrorMetres: Number(ik.result.error.toFixed(5)),
      upperLegRotated: JSON.stringify(ik.upperBefore) !== JSON.stringify(ik.upperAfter),
      lowerLegRotated: JSON.stringify(ik.lowerBefore) !== JSON.stringify(ik.lowerAfter)
    },
    ragdoll: {
      bodyCount: resting.ragdoll.bodyCount,
      constraintCount: resting.ragdoll.constraintCount,
      simulationSteps: resting.ragdoll.stepCount,
      restingPelvisHeight: Number(resting.ragdoll.rootPosition[1].toFixed(4)),
      playerCapsuleDisabledDuringFall: !started.physics.playerBodyEnabled,
      handoffBlendWeight: partialHandoff?.handoffWeight ?? handoff.handoffWeight,
      maxBodySpeedMps: Number(resting.ragdoll.maxBodySpeed.toFixed(3))
    },
    recovery: {
      applied: recovery.applied,
      variant: recoveryStarted.recovery.variant,
      clip: recoveryStarted.recovery.clip,
      proceduralGetUp: recovery.proceduralGetUp,
      ragdollRemoved: !recovered.ragdoll.active,
      playerCapsuleRestored: recovered.physics.playerBodyEnabled,
      controlsRestored: recovered.player.controlEnabled,
      health: recovered.player.health,
      stamina: recovered.player.stamina,
      state: recovered.player.state
    },
    terrainIK: terrain,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
