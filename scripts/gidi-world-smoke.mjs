import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4176;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error('Preview server exited: ' + server.exitCode);
    await delay(400);
  }
  if (!ready) throw new Error('Preview server did not start');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const errors = [];
  const vertexAlignmentWarnings = new Map();
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const alignment = text.match(/Non-interleaved vertex format with element size not multiple of 4[^]*?Element size: (\d+)/);
    if (alignment) vertexAlignmentWarnings.set(Number(alignment[1]), (vertexAlignmentWarnings.get(Number(alignment[1])) || 0) + 1);
    else errors.push('console: ' + text);
  });
  page.on('requestfailed', request => errors.push('requestfailed: ' + request.url() + ' ' + request.failure()?.errorText));
  await page.goto(origin + '?smoke=gidi', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.playerCharacterReady === true, null, { timeout: 60000 });

  await page.waitForFunction(() => window.__NAIJA_GAME__?.getGidiState?.()?.infrastructureLoaded === true, null, { timeout: 60000 });
  const startState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());

  const cellLoadState = await page.evaluate(async () => window.__NAIJA_GAME__.debugLoadGidiForSmoke([300, 0, -1900]));
  await page.waitForFunction(() => {
    const s = window.__NAIJA_GAME__?.getGidiState?.();
    return s && s.fullCells > 0 && s.playerCollisionProxies > 0 && s.vehicleCollisionProxies > 0;
  }, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const coreState = await page.evaluate(() => ({
    gidi: window.__NAIJA_GAME__.getGidiState(),
    player: window.__NAIJA_GAME__.getPlayerState(),
    physics: window.__NAIJA_GAME__.getPhysicsState(),
    roadProbe: window.__NAIJA_GAME__.getGroundProbe([300, 3, -1900], [300, -2, -1900])
  }));
  if (!coreState.gidi.infrastructureLoaded || coreState.gidi.fullCells < 1 || coreState.gidi.playerCollisionProxies < 1 || coreState.gidi.vehicleCollisionProxies < 1) {
    throw new Error('GIDI Yaba cell or dual-physics collision activation failed: ' + JSON.stringify(coreState));
  }

  // Move near a neighboring cell boundary. This should produce both full and medium cells.
  await page.evaluate(() => window.__NAIJA_GAME__.debugLoadGidiForSmoke([300, 0, -1200]));
  await page.waitForFunction(() => {
    const s = window.__NAIJA_GAME__?.getGidiState?.();
    return s && s.fullCells > 0 && s.mediumCells > 0;
  }, null, { timeout: 60000 });
  const lodState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  if (!lodState.mediumCells) throw new Error('Medium LOD did not activate at the intended distance: ' + JSON.stringify(lodState));

  // At a point 760–900m from cell assets, collision remains loaded while building meshes are hidden.
  await page.evaluate(() => window.__NAIJA_GAME__.debugLoadGidiForSmoke([300, 0, -600]));
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getGidiState?.()?.hiddenCollisionCells > 0, null, { timeout: 60000 });
  const cutoffState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  if (!cutoffState.hiddenCollisionCells) throw new Error('Distant cell visuals/collision separation not demonstrated: ' + JSON.stringify(cutoffState));

  // Move to the edge of the whole world. The loader must unload far cells and their colliders.
  const beforeUnload = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  await page.evaluate(() => window.__NAIJA_GAME__.debugLoadGidiForSmoke([10000, 0, 10000]));
  await page.waitForFunction(() => {
    const s = window.__NAIJA_GAME__?.getGidiState?.();
    return s && s.totalCellUnloads > 0 && s.playerCollisionProxies < 350;
  }, null, { timeout: 60000 });
  const unloadState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  if (!unloadState.infrastructureLoaded) throw new Error('Always-visible GIDI road/terrain infrastructure unloaded with distant building cells');
  if (unloadState.totalCellUnloads <= beforeUnload.totalCellUnloads || unloadState.playerCollisionProxies >= beforeUnload.playerCollisionProxies) {
    throw new Error('GIDI unload did not release cell geometry and player colliders: ' + JSON.stringify({ beforeUnload, unloadState }));
  }

  // Reload the Yaba core from the same cached/shared texture set.
  await page.evaluate(() => window.__NAIJA_GAME__.debugLoadGidiForSmoke([300, 0, -1900]));
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getGidiState?.()?.fullCells > 0 && window.__NAIJA_GAME__?.getGidiState?.()?.playerCollisionProxies > 0, null, { timeout: 60000 });
  const reloadState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  if (reloadState.totalCellLoads <= 0 || reloadState.sharedTextures !== 42 || reloadState.errors.length) {
    throw new Error('GIDI cell reload or shared-texture manifest failed: ' + JSON.stringify(reloadState));
  }

  // Gateway raycast: the connector starts where the original city road ends.
  const gatewayProbe = await page.evaluate(() => window.__NAIJA_GAME__.getGroundProbe([0, 2, -100], [0, -1, -100]));
  if (!gatewayProbe || gatewayProbe.surface !== 'asphalt') {
    throw new Error('Gateway road did not provide an asphalt collision/raycast surface: ' + JSON.stringify(gatewayProbe));
  }

  // Ara walks from the existing street onto the new connector. Drive the
  // controller's same normalized input state directly so the smoke is not
  // dependent on synthetic keyboard focus in headless mobile Chromium.
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([0, 0, -86.8], 0));
  const gatewayWalkTrace = await page.evaluate(() => {
    window.__NAIJA_GAME__.debugSetPlayerInputForSmoke(0, -1, false);
    const trace = window.__NAIJA_GAME__.debugAdvanceCharacterSimulationForSmoke(210, 1 / 60);
    window.__NAIJA_GAME__.debugSetPlayerInputForSmoke(0, 0, false);
    return trace;
  });
  const gatewayWalk = gatewayWalkTrace.player;
  if (gatewayWalk.position[2] >= -87.0 || !gatewayWalk.grounded || gatewayWalk.position[1] > 1.2 || gatewayWalk.footPlacementHits < 10) {
    throw new Error('Ara did not walk onto the connector while staying grounded: ' + JSON.stringify(gatewayWalk));
  }

  // Put the sedan on the physical connector and drive forward through its final segment.
  await page.evaluate(() => window.__NAIJA_GAME__.debugLoadGidiForSmoke([82, 0, -385]));
  const vehiclePlaced = await page.evaluate(() => window.__NAIJA_GAME__.debugSetVehiclePositionForSmoke([82, .94, -385], -15.5));
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([82, 0, -385], -15.5));
  const vehicleEntered = await page.evaluate(() => window.__NAIJA_GAME__.debugEnterVehicleForSmoke());
  if (!vehiclePlaced || !vehicleEntered) throw new Error('Could not place Ara and enter the vehicle at the connector threshold');
  // Finish the approach/door/seat phases in fixed game steps before enabling
  // throttle; wall-clock waits are unreliable under the heavy SwiftShader scene.
  const entryAdvance = await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceVehicleForSmoke(180));
  const vehicleStartState = entryAdvance.vehicle;
  if (!vehicleStartState?.occupied) throw new Error('Sedan staged entry did not reach the occupied state: '+JSON.stringify(entryAdvance));
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetVehicleInputForSmoke(0, true, false));
  const gatewayDrive = await page.evaluate(() => window.__NAIJA_GAME__.debugAdvanceVehicleForSmoke(600,{x:98,z:-447}));
  const gatewayDriveState = gatewayDrive.vehicle;
  const gatewayDriveSamples = [{frames:gatewayDrive.frames,position:gatewayDriveState.position,
    speedKmh:gatewayDriveState.speedKmh,wheelContacts:gatewayDriveState.dynamics?.measuredWheelContacts}];
  if (!gatewayDrive.completed || gatewayDriveState.position[2] >= -447 || gatewayDriveState.position[0] <= 98 ||
      gatewayDriveState.dynamics.measuredWheelContacts < 3 || gatewayDriveState.speedKmh < 5) {
    throw new Error('Sedan did not drive on the physical gateway with wheel contacts: ' + JSON.stringify({ vehiclePlaced, vehicleEntered, vehicleStartState, gatewayDrive, gatewayDriveSamples }));
  }
  await page.evaluate(() => { window.__NAIJA_GAME__.debugClearVehicleInputForSmoke(); window.__NAIJA_GAME__.debugExitVehicleForSmoke(); });

  const screenshot = '/tmp/gidi-integration/gidi-runtime.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  const result = {
    startState,
    coreState: {
      gidi: coreState.gidi,
      player: coreState.player,
      physics: coreState.physics,
      roadSurface: coreState.roadProbe?.surface || null
    },
    lodState: {
      fullCells: lodState.fullCells,
      mediumCells: lodState.mediumCells,
      loadedCells: lodState.loadedCells
    },
    cutoffState: {
      hiddenCollisionCells: cutoffState.hiddenCollisionCells,
      visibleMeshInstances: cutoffState.visibleMeshInstances
    },
    unloadState: {
      loadedCells: unloadState.loadedCells,
      totalCellUnloads: unloadState.totalCellUnloads,
      playerCollisionProxies: unloadState.playerCollisionProxies,
      vehicleCollisionProxies: unloadState.vehicleCollisionProxies
    },
    reloadState: {
      loadedCells: reloadState.loadedCells,
      totalCellLoads: reloadState.totalCellLoads,
      totalCellUnloads: reloadState.totalCellUnloads
    },
    gatewayProbe,
    gatewayWalk: { position: gatewayWalk.position, grounded: gatewayWalk.grounded, horizontalSpeed: gatewayWalk.horizontalSpeed },
    vehicleStartState: { position: vehicleStartState.position, speedKmh: vehicleStartState.speedKmh },
    gatewayDriveSamples,
    gatewayDrive: { position: gatewayDriveState.position, speedKmh: gatewayDriveState.speedKmh, measuredWheelContacts: gatewayDriveState.dynamics.measuredWheelContacts },
    screenshot,
    vertexAlignmentWarnings: Object.fromEntries(vertexAlignmentWarnings),
    errors
  };
  console.log('GIDI_RUNTIME_SMOKE ' + JSON.stringify(result));
  if (errors.some(error => /meshopt|GIDI|glTF|gltf|collision|stream/i.test(error))) throw new Error('GIDI runtime logged relevant errors: ' + JSON.stringify(errors));
} catch (error) {
  console.error(error.stack || error);
  if (browser) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        try {
          const debug = await page.evaluate(() => ({
            gameReady: window.__NAIJA_GAME__?.ready,
            gidi: window.__NAIJA_GAME__?.getGidiState?.(),
            vehicle: window.__NAIJA_GAME__?.getVehicleState?.(),
            player: window.__NAIJA_GAME__?.getPlayerState?.(),
            status: document.querySelector('#status')?.textContent,
            assetStatus: document.querySelector('#asset-status')?.textContent
          }));
          console.error('GIDI_DEBUG', JSON.stringify(debug));
          await page.screenshot({ path: '/tmp/gidi-integration/gidi-runtime-failed.png' }).catch(() => {});
        } catch {}
      }
    }
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}