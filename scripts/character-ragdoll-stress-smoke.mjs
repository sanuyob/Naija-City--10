import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4231;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'
], { stdio: 'ignore' });
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

async function advance(page, frames = 180) {
  return page.evaluate(count => window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(count, 1 / 60), frames);
}

async function settleAndRecover(page, label) {
  await advance(page, 180);
  const resting = await page.evaluate(() => window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll);
  assert(resting.active, `${label}: ragdoll stopped before recovery`);
  assert(finiteVector(resting.rootPosition), `${label}: invalid resting root position`);
  assert(Number.isFinite(resting.maxBodySpeed) && resting.maxBodySpeed < 3,
    `${label}: physics did not settle cleanly (speed ${resting.maxBodySpeed})`);
  assert((resting.hingeLimitViolations || []).length === 0,
    `${label}: hinge-limit violation(s): ${JSON.stringify((resting.jointConfigurations || []).filter(joint => resting.hingeLimitViolations.includes(joint.name)))}`);
  const hinges = (resting.jointConfigurations || []).filter(joint => joint.type === 'hinge');
  assert(hinges.length === 4 && hinges.every(joint => Number.isFinite(joint.angle)),
    `${label}: expected four measurable elbow/knee hinge angles`);

  const recovery = await page.evaluate(() =>
    window.__NAIJA_GAME__.debugRecoverPlayerForSmoke({ health: 100, stamina: 100 })
  );
  assert(recovery?.applied && recovery.recoveryInProgress, `${label}: recovery did not start`);
  await advance(page, 120);
  const recovered = await page.evaluate(() => ({
    ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll,
    player: window.__NAIJA_GAME__.getPlayerState(),
    recovery: window.__NAIJA_GAME__.debugGetRecoveryStateForSmoke(),
    floor: window.__NAIJA_GAME__.debugRaycastForSmoke([55, 10, 400], [55, -10, 400])
  }));
  assert(!recovered.ragdoll.active, `${label}: ragdoll remained active after recovery`);
  assert(recovered.player.controlEnabled && recovered.player.state === 'ready',
    `${label}: player controls/state were not restored: ${JSON.stringify(recovered.player)}`);
  assert(!recovered.recovery.active, `${label}: recovery state machine did not finish`);
  assert(recovered.floor?.normal?.[1] > 0.9,
    `${label}: Bullet world raycasts failed after capsule restoration`);
  return { resting, recovery, recovered };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited with ${server.exitCode}`);
    await delay(250);
  }
  assert(ready, 'Vite did not start');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${origin}/?smoke=character-ragdoll-stress`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => window.__NAIJA_GAME__?.ready && window.__NAIJA_GAME__?.playerCharacterReady,
    null,
    { timeout: 120000 }
  );

  const directions = [
    { name: 'north', vector: [0, 0, -1] },
    { name: 'north-east', vector: [Math.SQRT1_2, 0, -Math.SQRT1_2] },
    { name: 'east', vector: [1, 0, 0] },
    { name: 'south-east', vector: [Math.SQRT1_2, 0, Math.SQRT1_2] },
    { name: 'south', vector: [0, 0, 1] },
    { name: 'south-west', vector: [-Math.SQRT1_2, 0, Math.SQRT1_2] },
    { name: 'west', vector: [-1, 0, 0] },
    { name: 'north-west', vector: [-Math.SQRT1_2, 0, -Math.SQRT1_2] }
  ];

  const directionResults = [];
  for (const item of directions) {
    await page.evaluate(() => {
      window.__NAIJA_GAME__.debugSetPlayerForSmoke([0, 0, 0], 0);
      window.__NAIJA_PLAY_HERO_ANIMATION__?.('Idle', 1);
    });
    await advance(page, 5);
    // Read the just-created Bullet bodies in the same browser task as the
    // damage event. A separate evaluate yields to requestAnimationFrame and
    // can measure a later solver step rather than the transferred impact.
    const impactStart = await page.evaluate(direction => {
      const damage = window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, {
        knockback: 1.6,
        direction
      });
      return { damage, ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll };
    }, item.vector);
    const damage = impactStart.damage;
    const start = impactStart.ragdoll;
    assert(damage?.downed, `${item.name}: did not enter the downed state`);
    assert(start.active && start.bodyCount === 11 && start.constraintCount === 10,
      `${item.name}: articulated ragdoll did not start`);
    assert(Math.abs(start.totalMass - 72) < 0.01,
      `${item.name}: body mass budget mismatch (${start.totalMass} kg)`);
    const expectedMasses = {
      pelvis: 15, chest: 19, head: 5.5,
      'left-upper-arm': 2.4, 'left-forearm': 1.4,
      'right-upper-arm': 2.4, 'right-forearm': 1.4,
      'left-thigh': 8.1, 'left-shin': 4.35,
      'right-thigh': 8.1, 'right-shin': 4.35
    };
    assert(Object.entries(expectedMasses).every(([name, mass]) => Math.abs(start.bodyMasses?.[name] - mass) < 0.001),
      `${item.name}: segment mass profile drifted: ${JSON.stringify(start.bodyMasses)}`);
    assert(start.jointConfigurations?.length === 10 && start.jointConfigurations.every(joint =>
      Array.isArray(joint.limits) && joint.limits.length >= 2 && joint.limits.every(Number.isFinite)),
      `${item.name}: joint configuration diagnostics/limits missing`);
    assert(finiteVector(start.rootLinearVelocity),
      `${item.name}: pelvis velocity diagnostics missing`);
    const dot = start.rootLinearVelocity[0] * item.vector[0] + start.rootLinearVelocity[2] * item.vector[2];
    assert(dot > 0.35,
      `${item.name}: impact direction was not transferred to the ragdoll (dot ${dot.toFixed(3)})`);

    const outcome = await settleAndRecover(page, item.name);
    directionResults.push({
      direction: item.name,
      projectedInitialSpeed: Number(dot.toFixed(3)),
      finalMaxBodySpeed: Number(outcome.resting.maxBodySpeed.toFixed(3)),
      maxAngularSpeed: Number(outcome.resting.maxAngularSpeed.toFixed(3)),
      hingeLimitViolations: outcome.resting.hingeLimitViolations || [],
      recovered: outcome.recovered.player.controlEnabled
    });
  }

  const terrainResults = [];
  const terrainCases = [
    {
      name: 'three-step-staircase',
      owner: 'character-stress-stairs',
      start: [11.7, 0.56, 0],
      colliders: [
        { id: 'stress-lower-step', position: [10.8, 0.14, 0], halfExtents: [0.45, 0.14, 2.5], surface: 'concrete' },
        { id: 'stress-middle-step', position: [11.7, 0.28, 0], halfExtents: [0.45, 0.28, 2.5], surface: 'concrete' },
        { id: 'stress-upper-step', position: [12.6, 0.42, 0], halfExtents: [0.45, 0.42, 2.5], surface: 'concrete' }
      ],
      minGroundY: 0.56,
      minNormalY: 0.90
    },
    {
      name: 'sloped-walkway',
      owner: 'character-stress-slope',
      start: [24, 0.37, 0],
      colliders: [
        { id: 'stress-sloped-walkway', position: [24, 0.25, 0], halfExtents: [4, 0.12, 3], rotationZ: 8, surface: 'concrete' }
      ],
      minGroundY: 0.20,
      minNormalY: 0.90
    }
  ];

  for (const terrain of terrainCases) {
    const created = await page.evaluate(({ owner, colliders }) =>
      window.__NAIJA_GAME__.debugAddCharacterTerrainForSmoke(owner, colliders), terrain
    );
    assert(created > 0, `${terrain.name}: test terrain was not created`);
    await page.evaluate(start => {
      window.__NAIJA_GAME__.debugSetPlayerForSmoke(start, 0);
      window.__NAIJA_PLAY_HERO_ANIMATION__?.('Idle', 1);
    }, terrain.start);
    await advance(page, 6);

    const preflight = await page.evaluate(start =>
      window.__NAIJA_GAME__.debugRaycastForSmoke(
        [start[0], start[1] + 2, start[2]],
        [start[0], start[1] - 2, start[2]]
      ), terrain.start
    );
    assert(preflight && preflight.normal?.[1] >= terrain.minNormalY,
      `${terrain.name}: the test surface was not detected as walkable: ${JSON.stringify(preflight)}`);

    await page.evaluate(() => window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, {
      knockback: 0,
      direction: [0, 0, 0]
    }));
    const outcome = await settleAndRecover(page, terrain.name);
    const placement = outcome.recovery;
    assert(Number.isFinite(placement.recoveryGroundY) && placement.recoveryGroundY >= terrain.minGroundY,
      `${terrain.name}: recovery did not use the elevated surface: ${JSON.stringify(placement)}`);
    assert(finiteVector(placement.recoveryGroundNormal) && placement.recoveryGroundNormal[1] >= terrain.minNormalY,
      `${terrain.name}: recovery did not retain the walkable support normal: ${JSON.stringify(placement)}`);
    assert(placement.recoverySupportSamples >= 3,
      `${terrain.name}: insufficient multi-point support samples (${placement.recoverySupportSamples})`);
    terrainResults.push({
      terrain: terrain.name,
      recoveredGroundY: Number(placement.recoveryGroundY.toFixed(3)),
      supportNormal: placement.recoveryGroundNormal.map(value => Number(value.toFixed(3))),
      supportSamples: placement.recoverySupportSamples,
      surface: placement.recoverySurface,
      recovered: outcome.recovered.player.controlEnabled
    });
    await page.evaluate(owner => window.__NAIJA_GAME__.debugRemoveCharacterTerrainForSmoke(owner), terrain.owner);
  }

  assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({
    pass: true,
    physicsBudget: { bodyCount: 11, constraintCount: 10, totalMassKg: 72 },
    impactDirections: directionResults,
    recoveryTerrain: terrainResults,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
