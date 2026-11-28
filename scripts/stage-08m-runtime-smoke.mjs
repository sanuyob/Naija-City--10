import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4191;
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error('Vite preview exited with code ' + server.exitCode);
    await delay(350);
  }
  if (!ready) throw new Error('Vite preview did not become ready');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin + '?smoke=1&stage08m=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount > 0, null, { timeout: 30000 });

  const scene = await page.evaluate(() => {
    const game = window.__NAIJA_GAME__;
    const stage = game?.stage08M;
    const batch = game?.getStaticBatchState?.().stage08M;
    const interactions = game?.getInteractionState?.();
    return {
      stage: stage?.stage,
      assemblies: stage?.assemblyCount,
      renderParts: stage?.renderParts,
      staticCandidates: stage?.staticCandidates,
      dynamicRenderParts: stage?.dynamicRenderParts,
      cameraCount: stage?.surveillanceCameras?.length || 0,
      interactiveDevices: stage?.interactiveDevices,
      districts: stage?.byDistrict,
      features: stage?.features,
      batch,
      registeredInteractionCount: interactions?.targetCount,
      surveillance: game?.getSurveillanceState?.() || null
    };
  });
  if (scene.stage !== '08M' || scene.assemblies !== 23 || scene.renderParts < 130 || scene.dynamicRenderParts < 28 || scene.cameraCount !== 7 || scene.interactiveDevices !== 12 ||
      Object.keys(scene.districts || {}).length !== 6 || scene.batch?.members < 80 || scene.batch?.batches < 1 || scene.registeredInteractionCount < 14 || scene.surveillance?.cameraCount !== 7 || scene.surveillance?.onlineCameraCount !== 7) {
    throw new Error('Stage 08M scene integration failed: ' + JSON.stringify(scene));
  }

  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([12.2, 0, -53], 0));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__NAIJA_INTERACT__?.());
  await page.waitForTimeout(160);
  const networkInteraction = await page.evaluate(() => ({
    interaction: window.__NAIJA_GAME__?.getInteractionState?.()?.lastInteraction,
    toast: document.querySelector('#hud-toast')?.textContent || '',
    camerasOnline: window.__NAIJA_GAME__?.getSurveillanceState?.()?.cameras?.filter(camera => camera.district === 'Yaba' && camera.online).length
  }));
  if (networkInteraction.interaction?.id !== 'stage08m-yaba-network-cabinet' || !/maintenance mode/i.test(networkInteraction.toast) || networkInteraction.camerasOnline !== 0) {
    throw new Error('Yaba telecom cabinet did not place its local CCTV network into maintenance mode: ' + JSON.stringify(networkInteraction));
  }
  await page.evaluate(() => window.__NAIJA_INTERACT__?.());
  await page.waitForTimeout(100);
  const networkRestored = await page.evaluate(() => ({ toast: document.querySelector('#hud-toast')?.textContent || '', camerasOnline: window.__NAIJA_GAME__?.getSurveillanceState?.()?.cameras?.filter(camera => camera.district === 'Yaba' && camera.online).length }));
  if (!/network online/i.test(networkRestored.toast) || networkRestored.camerasOnline !== 2) throw new Error('Yaba CCTV network did not return online: ' + JSON.stringify(networkRestored));

  // Walk to a real CCTV station, open its live scene feed, scan, pan/tilt, zoom and switch cameras.
  await page.evaluate(() => {
    window.__NAIJA_RPG_PAUSED__ = false;
    window.__NAIJA_GAME__.debugSetPlayerForSmoke([13, 0, -34], 0);
  });
  await page.waitForTimeout(180);
  await page.evaluate(() => window.__NAIJA_INTERACT__?.());
  await page.waitForTimeout(180);
  const cctvOpened = await page.evaluate(() => ({
    state: window.__NAIJA_GAME__?.getSurveillanceState?.(),
    player: window.__NAIJA_GAME__?.getPlayerState?.(),
    camera: window.__NAIJA_GAME__?.getCameraPosition?.(),
    controlsVisible: !document.querySelector('#cctv-controls')?.hidden,
    interaction: window.__NAIJA_GAME__?.getInteractionState?.()?.lastInteraction
  }));
  if (cctvOpened.state?.activeFeed?.type !== 'cctv' || cctvOpened.state.activeFeed.cameraId !== 'cctv-yaba-1' ||
      cctvOpened.player?.controlEnabled !== false || !cctvOpened.controlsVisible ||
      cctvOpened.interaction?.id !== 'stage08m-yaba-cctv-1' || cctvOpened.camera?.[1] < 5) {
    throw new Error('Walking up to the Yaba CCTV and opening its live feed failed: ' + JSON.stringify(cctvOpened));
  }
  const cctvScan = await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.scanActiveCamera?.());
  const cctvAfterScan = await page.evaluate(() => ({
    state: window.__NAIJA_GAME__?.getSurveillanceState?.(),
    map: window.__NAIJA_RPG_UI__?.getWorldMapState?.(),
    toast: document.querySelector('#hud-toast')?.textContent || ''
  }));
  if (!cctvScan?.ok || !cctvScan.discoveries?.length || cctvAfterScan.state?.discoveryCount < 1 || cctvAfterScan.map?.count < scene.surveillance.targetCount + 1) {
    throw new Error('CCTV scan did not discover a new location on the city map: ' + JSON.stringify({ cctvScan, cctvAfterScan }));
  }
  await page.evaluate(() => {
    window.__NAIJA_SURVEILLANCE__?.setPanInput?.(1, 1);
  });
  await page.waitForTimeout(450);
  await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.setPanInput?.(0, 0));
  const ptz = await page.evaluate(() => {
    const before = window.__NAIJA_GAME__?.getSurveillanceState?.()?.activeFeed;
    const zoom = window.__NAIJA_SURVEILLANCE__?.setZoom?.(1);
    const next = window.__NAIJA_SURVEILLANCE__?.cycleCamera?.(1);
    return { before, zoom, next, after: window.__NAIJA_GAME__?.getSurveillanceState?.()?.activeFeed };
  });
  if ((ptz.before?.panDegrees || 0) <= 0 || (ptz.before?.tiltDegrees || 0) <= 0 || ptz.zoom?.zoomLevel !== 1 ||
      ptz.after?.cameraId !== 'cctv-yaba-2') {
    throw new Error('CCTV pan/tilt/zoom or network camera switching failed: ' + JSON.stringify(ptz));
  }
  await page.locator('[data-cctv-action="close"]').click();
  await page.waitForTimeout(150);
  const cctvClosed = await page.evaluate(() => ({
    state: window.__NAIJA_GAME__?.getSurveillanceState?.(),
    playerControl: window.__NAIJA_GAME__?.getPlayerState?.()?.controlEnabled,
    controlsHidden: document.querySelector('#cctv-controls')?.hidden === true
  }));
  if (cctvClosed.state?.activeFeed || cctvClosed.playerControl !== true || !cctvClosed.controlsHidden) {
    throw new Error('Closing a CCTV feed did not restore the player camera and controls: ' + JSON.stringify(cctvClosed));
  }
  await page.waitForTimeout(3200);

  // A remote camera must wake only its own streamed district and show moving world entities.
  const remoteBefore = await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.openCamera?.('cctv-lekki-1'));
  if (!remoteBefore?.ok) throw new Error('Lekki remote CCTV feed could not be opened: ' + JSON.stringify(remoteBefore));
  const remoteStart = await page.evaluate(() => ({
    activity: window.__NAIJA_GAME__?.getDistrictActivityState?.(),
    rootEnabled: window.__NAIJA_GAME__?.stage08L?.districtRoots?.lekki?.enabled,
    districtTraffic: window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.()?.byDistrict?.lekki
  }));
  await page.waitForTimeout(3600);
  const remoteLive = await page.evaluate(() => ({
    activity: window.__NAIJA_GAME__?.getDistrictActivityState?.(),
    feed: window.__NAIJA_GAME__?.getSurveillanceState?.()?.activeFeed,
    rootEnabled: window.__NAIJA_GAME__?.stage08L?.districtRoots?.lekki?.enabled,
    districtTraffic: window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.()?.byDistrict?.lekki
  }));
  const remotePedestrianMoved = remoteStart.activity?.districts?.lekki?.pedestrians?.some((actor, index) => {
    const after = remoteLive.activity?.districts?.lekki?.pedestrians?.[index]?.position || [];
    return Math.hypot(after[0] - actor.position[0], after[2] - actor.position[2]) > 0.2;
  });
  const remotePedestrianTicksAdvanced = (remoteLive.activity?.actorSteps || 0) > (remoteStart.activity?.actorSteps || 0);
  const remoteDistrictVehicleMoved = (() => {
    const before = remoteStart.districtTraffic?.vehicles?.[0]?.position || [];
    const after = remoteLive.districtTraffic?.vehicles?.[0]?.position || [];
    return Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.2;
  })();
  const remoteVehicleMoved = (() => {
    const before = remoteStart.activity?.districts?.lekki?.vehicles?.[0]?.position || [];
    const after = remoteLive.activity?.districts?.lekki?.vehicles?.[0]?.position || [];
    return Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.2;
  })();
  if (remoteLive.activity?.activeDistrict !== 'lekki' || remoteLive.activity?.activePedestrians < 1 ||
      remoteLive.activity?.activeVehicles !== 1 || !remoteLive.rootEnabled || !remotePedestrianMoved || !remotePedestrianTicksAdvanced || !remoteVehicleMoved ||
      remoteLive.districtTraffic?.count !== 10 || !remoteLive.districtTraffic?.active || !remoteDistrictVehicleMoved ||
      remoteLive.feed?.cameraId !== 'cctv-lekki-1') {
    throw new Error('Remote CCTV did not stream its district population and traffic as live scene entities: ' + JSON.stringify({ remoteStart, remoteLive, remotePedestrianMoved, remotePedestrianTicksAdvanced, remoteVehicleMoved, remoteDistrictVehicleMoved }));
  }
  await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.closeFeed?.());
  const remoteClosed = await page.evaluate(() => ({ activity: window.__NAIJA_GAME__?.getDistrictActivityState?.(), rootEnabled: window.__NAIJA_GAME__?.stage08L?.districtRoots?.lekki?.enabled }));
  if (remoteClosed.activity?.activeDistrict !== null || remoteClosed.activity?.activePedestrians !== 0 || remoteClosed.activity?.activeVehicles !== 0) {
    throw new Error('Closing remote CCTV did not stop its district-only simulation: ' + JSON.stringify(remoteClosed));
  }
  const remoteDistrictChecks = [];
  for (const [district, cameraId] of [['alimosho','cctv-alimosho-1'],['lekki','cctv-lekki-1'],['victoriaIsland','cctv-victoriaIsland-1'],['ekoAtlantic','cctv-ekoAtlantic-1'],['ekiti','cctv-ekiti-1']]) {
    const opened = await page.evaluate(id => window.__NAIJA_SURVEILLANCE__?.openCamera?.(id), cameraId);
    if (!opened?.ok) throw new Error('Remote CCTV could not open ' + district);
    await page.waitForFunction(key => {
      const state = window.__NAIJA_GAME__?.getDistrictActivityState?.();
      const fleet = window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.()?.byDistrict?.[key];
      return state?.activeDistrict === key && fleet?.active === true && fleet?.count === 10;
    }, district, { timeout: 12000 });
    const check = await page.evaluate(key => {
      const activity = window.__NAIJA_GAME__?.getDistrictActivityState?.();
      const vehicleFleet = window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.()?.byDistrict?.[key];
      return { district:key, opened:true, activeDistrict:activity?.activeDistrict,
        activePedestrians:activity?.activePedestrians, activeVehicles:activity?.activeVehicles,
        rootEnabled:window.__NAIJA_GAME__?.stage08L?.districtRoots?.[key]?.enabled,
        visiblePedestrians:activity?.districts?.[key]?.pedestrians?.filter(actor=>actor.visible).length,
        visibleVehicles:activity?.districts?.[key]?.vehicles?.filter(vehicle=>vehicle.visible).length,
        vehicleFleet };
    }, district);
    if (check.activeDistrict !== district || !check.rootEnabled || check.activePedestrians < 1 || check.activeVehicles !== 1 ||
        check.visiblePedestrians < 1 || check.visibleVehicles !== 1 || check.vehicleFleet?.vehicles?.length !== 10) {
      throw new Error('Remote district streaming failed in ' + district + ': ' + JSON.stringify(check));
    }
    remoteDistrictChecks.push(check);
    await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.closeFeed?.());
  }

  // Stage 10: load and inspect one real skinned civilian in every district.
  const npcDistrictChecks = [];
  for (const [district, cameraId] of [
    ['alimosho','cctv-alimosho-1'],['lekki','cctv-lekki-1'],
    ['victoriaIsland','cctv-victoriaIsland-1'],['ekoAtlantic','cctv-ekoAtlantic-1'],['ekiti','cctv-ekiti-1']
  ]) {
    const opened = await page.evaluate(id => window.__NAIJA_SURVEILLANCE__?.openCamera?.(id), cameraId);
    if (!opened?.ok) throw new Error('NPC district camera failed to open: ' + district);
    await page.waitForFunction(key => {
      const state = window.__NAIJA_GAME__?.getNpcPopulationState?.();
      return state?.activeDistrict === key && state.characters?.some(actor => actor.district === key && actor.loaded && actor.visible);
    }, district, { timeout: 30000 });
    const snapshot = await page.evaluate(key => {
      const state = window.__NAIJA_GAME__?.getNpcPopulationState?.();
      return { district:key, activeDistrict:state?.activeDistrict, loaded:state?.characters?.filter(actor=>actor.district===key&&actor.loaded),
        visible:state?.characters?.filter(actor=>actor.district===key&&actor.visible), capsuleActors:state?.capsuleActors };
    }, district);
    if (!snapshot.loaded?.length || snapshot.loaded.some(actor => actor.capsule?.shape !== 'vertical-capsule' || actor.capsule.radius !== 0.32 || actor.capsule.height !== 1.78 || !actor.clips?.idle || !actor.clips?.walk)) {
      throw new Error('Imported NPC capsule or animation setup failed in ' + district + ': ' + JSON.stringify(snapshot));
    }
    npcDistrictChecks.push(snapshot);
    await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.closeFeed?.());
  }
  const npcAssetsLoaded = await page.evaluate(() => window.__NAIJA_GAME__?.getNpcPopulationState?.());
  if (npcAssetsLoaded.loadedCharacters < 5 || npcAssetsLoaded.failedLoads > 0) {
    throw new Error('One or more district civilian GLBs failed to load: ' + JSON.stringify(npcAssetsLoaded));
  }

  // Move into Ekiti to test local activation, real character interaction and
  // the short non-lethal sparring response on the mobile HUD.
  await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; window.__NAIJA_GAME__.debugSetPlayerForSmoke([-250, 0, 650], 0); });
  await page.waitForFunction(() => {
    const state = window.__NAIJA_GAME__?.getNpcPopulationState?.();
    return state?.activeDistrict === 'ekiti' && state.characters?.some(actor => actor.id === 'ekiti-farm-hand' && actor.loaded && actor.visible);
  }, null, { timeout: 30000 });
  const farmerInteraction = await page.evaluate(() => window.__NAIJA_NPC_SYSTEM__?.interact?.('ekiti-farm-hand'));
  const sparring = await page.evaluate(() => window.__NAIJA_NPC_SPAR__?.());
  const npcCombatState = await page.evaluate(() => window.__NAIJA_GAME__?.getNpcPopulationState?.());
  if (!farmerInteraction?.ok || !/field/i.test(farmerInteraction.message || '') || !sparring?.ok || sparring.lethal !== false ||
      sparring.effect !== 'brief-stun-and-knockback' || npcCombatState.sparringHits < 1) {
    throw new Error('NPC interaction or friendly sparring failed: ' + JSON.stringify({farmerInteraction,sparring,npcCombatState}));
  }
  await page.evaluate(() => window.__NAIJA_GAME__.debugSetPlayerForSmoke([13, 0, -15], 180));

  await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; window.__NAIJA_GAME__.debugSetPlayerForSmoke([13, 0, -15], 180); });
  const playerBefore = await page.evaluate(() => window.__NAIJA_GAME__?.getPlayerState?.()?.position || []);
  const deployed = await page.evaluate(() => {
    window.__NAIJA_RPG_PAUSED__ = false;
    const result = window.__NAIJA_FIELD_EQUIPMENT__?.activate?.('scout-drone');
    window.__NAIJA_RPG_UI__?.setDroneState?.(window.__NAIJA_FIELD_EQUIPMENT__?.getDroneState?.());
    return { result, state: window.__NAIJA_GAME__?.getScoutDroneState?.() };
  });
  if (!deployed.state?.active || deployed.state.battery !== 100) throw new Error('Scout drone deployment failed: ' + JSON.stringify(deployed));
  await page.waitForTimeout(250);
  const uiActive = await page.locator('#drone-controls').isVisible();
  if (!uiActive) throw new Error('Drone flight HUD did not open after deployment');

  await page.evaluate(() => {
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneInput?.(0, 1);
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneVertical?.(1);
    window.__NAIJA_FIELD_EQUIPMENT__?.setDronePan?.(0);
  });
  await page.waitForTimeout(700);
  const flight = await page.evaluate(() => ({
    drone: window.__NAIJA_GAME__?.getScoutDroneState?.(),
    player: window.__NAIJA_GAME__?.getPlayerState?.()?.position || [],
    camera: window.__NAIJA_GAME__?.getCameraPosition?.() || [],
    controlsVisible: !document.querySelector('#drone-controls')?.hidden
  }));
  const droneScan = await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.scanFromDrone?.(window.__NAIJA_FIELD_EQUIPMENT__?.getDroneState?.()));
  if (!flight.drone?.active || flight.drone.position[2] <= deployed.state.position[2] ||
      flight.drone.altitudeMetres <= deployed.state.altitudeMetres ||
      Math.hypot(flight.player[0] - playerBefore[0], flight.player[2] - playerBefore[2]) > 0.05 ||
      !flight.controlsVisible || flight.camera.length !== 3 || !droneScan?.ok || droneScan.detections < 1) {
    throw new Error('Scout drone flight/camera/input isolation failed: ' + JSON.stringify({ flight, droneScan, playerBefore, paused: await page.evaluate(() => window.__NAIJA_RPG_PAUSED__) }));
  }

  await page.evaluate(() => {
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneInput?.(0, 0);
    window.__NAIJA_FIELD_EQUIPMENT__?.setDroneVertical?.(0);
    window.__NAIJA_FIELD_EQUIPMENT__?.recallScoutDrone?.();
    window.__NAIJA_RPG_UI__?.setDroneState?.(window.__NAIJA_FIELD_EQUIPMENT__?.getDroneState?.());
  });
  await page.waitForTimeout(120);
  const recalled = await page.evaluate(() => ({
    drone: window.__NAIJA_GAME__?.getScoutDroneState?.(),
    controlsHidden: document.querySelector('#drone-controls')?.hidden === true,
    playerControlsEnabled: window.__NAIJA_GAME__?.getPlayerState?.()?.controlEnabled
  }));
  if (recalled.drone?.active || !recalled.controlsHidden) throw new Error('Scout drone recall did not restore the normal HUD: ' + JSON.stringify(recalled));
  if (errors.length) throw new Error('Stage 08M browser errors: ' + JSON.stringify(errors));

  console.log(JSON.stringify({ result: 'PASS', viewport: '844x390 Chromium / SwiftShader touch profile', scene, networkInteraction, cctv: { opened: cctvOpened, scan: cctvScan, discovered: cctvAfterScan, ptz, closed: cctvClosed, remoteDistrict: { start: remoteStart, live: remoteLive, closed: remoteClosed, allDistrictChecks: remoteDistrictChecks } }, drone: { deployed, flight, scan: droneScan, recalled }, npcDistrictChecks, npcAssetsLoaded, farmerInteraction, sparring, npcCombatState, browserErrors: errors, limitation: 'Software WebGL smoke only; no physical Android performance claims.' }, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
