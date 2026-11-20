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

  const airborneResults = [];
  const airborneCases = [
    {
      name: 'airborne-rising-upward-knockback',
      position: [28, 0, 18],
      velocity: [0, 4.0, 0],
      direction: [0, 1, 0],
      knockback: 1.8,
      minVerticalSpeed: 1.5
    },
    {
      name: 'airborne-falling-downward-knockback',
      position: [32, 4.2, 18],
      velocity: [0, -3.0, 0],
      direction: [0, -1, 0],
      knockback: 2.0,
      maxVerticalSpeed: -3.0
    }
  ];

  for (const item of airborneCases) {
    const setup = await page.evaluate(({ position, velocity }) =>
      window.__NAIJA_GAME__.debugSetPlayerMotionForSmoke(position, velocity, 0), item
    );
    assert(setup, `${item.name}: failed to establish airborne motion`);
    await advance(page, 6);
    const airborne = await page.evaluate(() => window.__NAIJA_GAME__.getPlayerState());
    assert(!airborne.grounded, `${item.name}: character was not airborne before the hit`);
    assert(item.name.includes('rising') ? airborne.verticalVelocity > 0.5 : airborne.verticalVelocity < -1.0,
      `${item.name}: wrong pre-impact vertical state: ${airborne.verticalVelocity}`);

    const impact = await page.evaluate(({ direction, knockback }) => {
      const damage = window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, { knockback, direction });
      return { damage, ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll };
    }, item);
    assert(impact.damage?.downed && impact.ragdoll.active, `${item.name}: ragdoll did not start`);
    const verticalSpeed = impact.ragdoll.rootLinearVelocity?.[1];
    assert(Number.isFinite(verticalSpeed), `${item.name}: missing vertical ragdoll velocity`);
    assert(item.minVerticalSpeed !== undefined ? verticalSpeed > item.minVerticalSpeed : verticalSpeed < item.maxVerticalSpeed,
      `${item.name}: vertical knockback was not transferred (vy ${verticalSpeed})`);
    const outcome = await settleAndRecover(page, item.name);
    airborneResults.push({
      scenario: item.name,
      preImpactVerticalSpeed: Number(airborne.verticalVelocity.toFixed(3)),
      ragdollVerticalSpeed: Number(verticalSpeed.toFixed(3)),
      finalMaxBodySpeed: Number(outcome.resting.maxBodySpeed.toFixed(3)),
      recovered: outcome.recovered.player.controlEnabled
    });
  }

  const collisionResults = [];
  const collisionCases = [
    {
      name: 'side-impact-into-wall',
      owner: 'character-stress-wall',
      start: [35, 0, 30],
      direction: [1, 0, 0],
      wallPlane: 35.70,
      colliders: [
        { id: 'stress-solid-wall', position: [35.78, 1.35, 30], halfExtents: [0.08, 1.35, 2.5], surface: 'concrete' }
      ],
      assertBlocked: root => root[0] > 35.05 && root[0] < 35.95
    },
    {
      name: 'diagonal-impact-into-corner',
      owner: 'character-stress-corner',
      start: [38, 0, 35],
      direction: [Math.SQRT1_2, 0, Math.SQRT1_2],
      colliders: [
        { id: 'stress-corner-east-wall', position: [38.78, 1.35, 35], halfExtents: [0.08, 1.35, 2.5], surface: 'concrete' },
        { id: 'stress-corner-north-wall', position: [38, 1.35, 35.78], halfExtents: [2.5, 1.35, 0.08], surface: 'concrete' }
      ],
      assertBlocked: root => root[0] > 38.05 && root[0] < 39.03 && root[2] > 35.05 && root[2] < 36.03
    }
  ];

  for (const item of collisionCases) {
    const created = await page.evaluate(({ owner, colliders }) =>
      window.__NAIJA_GAME__.debugAddCharacterTerrainForSmoke(owner, colliders), { owner: item.owner, colliders: item.colliders }
    );
    assert(created === item.colliders.length, `${item.name}: wall/corner collision geometry was not created`);
    await page.evaluate(start => {
      window.__NAIJA_GAME__.debugSetPlayerForSmoke(start, 0);
      window.__NAIJA_PLAY_HERO_ANIMATION__?.('Idle', 1);
    }, item.start);
    await advance(page, 5);
    const preflight = await page.evaluate(({ from, to }) =>
      window.__NAIJA_GAME__.debugRaycastForSmoke(from, to), {
        from: [item.start[0] + 0.3, 1.05, item.start[2] + 0.3],
        to: [item.start[0] + 1.0, 1.05, item.start[2] + 1.0]
      }
    );
    assert(preflight && /stress-(solid-wall|corner)/.test(preflight.id),
      `${item.name}: collision wall was not queryable: ${JSON.stringify(preflight)}`);

    const impact = await page.evaluate(direction => {
      const damage = window.__NAIJA_GAME__.debugApplyPlayerDamageForSmoke(100, { knockback: 3.5, direction });
      return { damage, ragdoll: window.__NAIJA_GAME__.getCharacterSimulationState().ragdoll };
    }, item.direction);
    assert(impact.damage?.downed && impact.ragdoll.active, `${item.name}: ragdoll did not start`);
    const projected = impact.ragdoll.rootLinearVelocity[0] * item.direction[0] +
      impact.ragdoll.rootLinearVelocity[2] * item.direction[2];
    assert(projected > 2.0, `${item.name}: impact did not reach the barrier with enough momentum (${projected})`);
    const outcome = await settleAndRecover(page, item.name);
    assert(item.assertBlocked(outcome.resting.rootPosition),
      `${item.name}: ragdoll crossed the collision boundary: ${JSON.stringify(outcome.resting.rootPosition)}`);
    const positions = outcome.resting.bodyPositions || {};
    const bodyCenters = Object.values(positions);
    assert(Object.keys(positions).length === 11 && bodyCenters.every(finiteVector),
      `${item.name}: per-body collision diagnostics were incomplete`);
    const maxBodyX = Math.max(...bodyCenters.map(position => position[0]));
    const maxBodyZ = Math.max(...bodyCenters.map(position => position[2]));
    if (item.name === 'side-impact-into-wall') {
      assert(maxBodyX < 35.95, `${item.name}: an articulated body crossed the wall plane (max X ${maxBodyX})`);
    } else {
      assert(maxBodyX < 39.03 && maxBodyZ < 36.03,
        `${item.name}: an articulated body crossed the corner planes (max X/Z ${maxBodyX}/${maxBodyZ})`);
    }
    collisionResults.push({
      scenario: item.name,
      impactSpeedTowardBarrier: Number(projected.toFixed(3)),
      restingRoot: outcome.resting.rootPosition.map(value => Number(value.toFixed(3))),
      finalMaxBodySpeed: Number(outcome.resting.maxBodySpeed.toFixed(3)),
      bodyCount: Object.keys(positions).length,
      recovered: outcome.recovered.player.controlEnabled
    });
    await page.evaluate(owner => window.__NAIJA_GAME__.debugRemoveCharacterTerrainForSmoke(owner), item.owner);
  }

  const terrainResults = [];
  const terrainCases = [
    {
      name: 'five-step-staircase-and-landing',
      owner: 'character-stress-stairs',
      start: [32.85, 0.90, 10],
      colliders: [
        { id: 'stress-stair-01', position: [30.00, 0.09, 10], halfExtents: [0.34, 0.09, 1.2], surface: 'concrete' },
        { id: 'stress-stair-02', position: [30.65, 0.18, 10], halfExtents: [0.34, 0.18, 1.2], surface: 'concrete' },
        { id: 'stress-stair-03', position: [31.30, 0.27, 10], halfExtents: [0.34, 0.27, 1.2], surface: 'concrete' },
        { id: 'stress-stair-04', position: [31.95, 0.36, 10], halfExtents: [0.34, 0.36, 1.2], surface: 'concrete' },
        { id: 'stress-stair-05', position: [32.60, 0.45, 10], halfExtents: [0.34, 0.45, 1.2], surface: 'concrete' },
        { id: 'stress-stair-top-landing', position: [33.15, 0.45, 10], halfExtents: [0.58, 0.45, 1.2], surface: 'concrete' }
      ],
      minGroundY: 0.90,
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
    airborneImpacts: airborneResults,
    wallAndCornerCollisions: collisionResults,
    recoveryTerrain: terrainResults,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
