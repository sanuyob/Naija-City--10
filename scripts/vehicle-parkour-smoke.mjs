import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4188;
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
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
    controls: ['vehicle-controls', 'drive-accelerate', 'drive-brake', 'drive-exit'].map(id => !!document.getElementById(id))
  }));
  if (inventory.buildings !== 48 || inventory.accessPoints !== 144 ||
      inventory.traversal.buildingRouteCount !== 48 ||
      inventory.traversal.buildingAccessPointCount !== 144 ||
      inventory.vehicle.wheelCount !== 4 ||
      inventory.controls.some(value => !value)) {
    throw new Error('Building access or vehicle asset contract failed: ' + JSON.stringify(inventory));
  }

  const entered = await page.evaluate(() => window.__NAIJA_GAME__.debugEnterVehicleForSmoke());
  const seated = await page.evaluate(() => ({
    occupied: window.__NAIJA_GAME__.getVehicleState().occupied,
    controllerEnabled: window.__NAIJA_GAME__.getPlayerState().controlEnabled,
    bodyEnabled: window.__NAIJA_GAME__.getPhysicsState().player.playerBodyEnabled,
    hudHidden: document.querySelector('#vehicle-controls')?.hidden
  }));
  if (!entered || !seated.occupied || seated.controllerEnabled || seated.bodyEnabled || seated.hudHidden) {
    throw new Error('Vehicle enter handoff failed: ' + JSON.stringify(seated));
  }

  const startSteps = await page.evaluate(() => window.__NAIJA_GAME__.getVehicleState().physicsSteps);
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetVehicleInputForSmoke(0, true, false));
  await page.waitForFunction(steps => window.__NAIJA_GAME__.getVehicleState().physicsSteps >= steps + 70, startSteps, { timeout: 60000 });
  const accelerated = await page.evaluate(() => window.__NAIJA_GAME__.getVehicleState());
  if (accelerated.speedKmh < 50 || accelerated.dynamics.measuredWheelContacts < 3) {
    throw new Error('Vehicle did not accelerate with wheel probes on road: ' + JSON.stringify(accelerated));
  }

  const brakeSteps = accelerated.physicsSteps;
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetVehicleInputForSmoke(0, false, true));
  await page.waitForFunction(steps => window.__NAIJA_GAME__.getVehicleState().physicsSteps >= steps + 12, brakeSteps, { timeout: 30000 });
  const braked = await page.evaluate(() => window.__NAIJA_GAME__.getVehicleState());
  if (braked.speedKmh >= accelerated.speedKmh - 5) {
    throw new Error('Brake input did not reduce speed: ' + JSON.stringify({ accelerated: accelerated.speedKmh, braked: braked.speedKmh }));
  }

  const steeringSteps = braked.physicsSteps;
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetVehicleInputForSmoke(1, false, false));
  await page.waitForFunction(steps => window.__NAIJA_GAME__.getVehicleState().physicsSteps >= steps + 35, steeringSteps, { timeout: 30000 });
  const turned = await page.evaluate(() => window.__NAIJA_GAME__.getVehicleState());
  const turnDegrees = Math.abs(turned.yaw - braked.yaw);
  if (turnDegrees < 5) {
    throw new Error('Vehicle steering did not change the chassis heading: ' + JSON.stringify({ before: braked.yaw, after: turned.yaw }));
  }

  const exited = await page.evaluate(() => window.__NAIJA_GAME__.debugExitVehicleForSmoke());
  const onFoot = await page.evaluate(() => ({
    controllerEnabled: window.__NAIJA_GAME__.getPlayerState().controlEnabled,
    bodyEnabled: window.__NAIJA_GAME__.getPhysicsState().player.playerBodyEnabled,
    hudHidden: document.querySelector('#vehicle-controls')?.hidden,
    cameraDistance: window.__NAIJA_GAME__.getPlayerState().cameraActualDistance,
    occupied: window.__NAIJA_GAME__.getVehicleState().occupied
  }));
  if (!exited || !onFoot.controllerEnabled || !onFoot.bodyEnabled || !onFoot.hudHidden ||
      onFoot.occupied || onFoot.cameraDistance > 4.6) {
    throw new Error('Vehicle exit did not restore Ara and the close camera: ' + JSON.stringify(onFoot));
  }

  const parkour = [];
  for (const routeType of ['ladder', 'mantle', 'ledge']) {
    const result = await page.evaluate(type => {
      const action = window.__NAIJA_GAME__.debugTraverseBuildingForSmoke('yaba-core-01', type);
      return {
        started: action.started,
        requestedType: type,
        completedType: action.traversal.lastTraversal?.type,
        buildingId: action.traversal.lastTraversal?.buildingId,
        clip: action.traversal.lastTraversal?.clip,
        height: action.player.position[1],
        grounded: action.player.grounded,
        completed: action.traversal.traversalsCompleted
      };
    }, routeType);
    parkour.push(result);
  }
  if (parkour.some(route =>
    !route.started ||
    route.requestedType !== route.completedType ||
    route.buildingId !== 'yaba-core-01' ||
    route.height < 15 ||
    !route.grounded
  )) {
    throw new Error('One or more targeted building parkour routes failed: ' + JSON.stringify(parkour));
  }

  if (errors.length) throw new Error('Browser runtime errors: ' + errors.join(' | '));

  console.log(JSON.stringify({
    pass: true,
    buildingNetwork: { buildings: inventory.buildings, accessPoints: inventory.accessPoints },
    vehicle: {
      model: inventory.vehicle.modelSource,
      wheels: inventory.vehicle.wheelCount,
      measuredRoadWheelContacts: accelerated.dynamics.measuredWheelContacts,
      topTestSpeedKmh: accelerated.speedKmh,
      brakedSpeedKmh: braked.speedKmh,
      steeringTurnDegrees: turnDegrees,
      exitCameraDistance: onFoot.cameraDistance
    },
    parkour,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
