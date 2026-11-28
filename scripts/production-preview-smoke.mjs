import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4192;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error('Vite production preview exited: ' + server.exitCode);
    await delay(350);
  }
  if (!ready) throw new Error('Production preview did not become ready');
  const manifest = JSON.parse(await readFile(new URL('../public/assets/npcs/gobkit-cc0/roster/manifest.json', import.meta.url), 'utf8'));
  if (manifest.count !== 64 || manifest.characters.length !== 64) throw new Error('Production NPC manifest does not contain 64 characters.');
  const assetChecks = await Promise.all(manifest.characters.map(async character => {
    const response = await fetch(`${origin}/${character.url}`, { method: 'HEAD' });
    if (!response.ok) throw new Error(`Production roster asset missing: ${character.slug} HTTP ${response.status}`);
    return { file: character.slug + '.glb', bytes: Number(response.headers.get('content-length')) || 0, status: response.status };
  }));
  if (assetChecks.length !== 64 || assetChecks.some(check => check.status !== 200)) throw new Error('Not all 64 roster GLBs are available from production dist.');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin + '?smoke=1&stage08m=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount > 0, null, { timeout: 30000 });
  const camera = await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.openCamera?.('cctv-ekiti-1'));
  if (!camera?.ok) throw new Error('Production build could not open Ekiti CCTV');
  await page.waitForFunction(() => {
    const fleet = window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.();
    return fleet?.totalVehicles === 50 && fleet.byDistrict?.ekiti?.active === true;
  }, null, { timeout: 15000 });
  const ekitiTraffic = await page.evaluate(() => window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.());
  if (ekitiTraffic.activeVehicles !== 10 || ekitiTraffic.byDistrict.ekiti.count !== 10) throw new Error('Ekiti district fleet did not stream ten vehicles: ' + JSON.stringify(ekitiTraffic));
  await page.waitForFunction(() => {
    const state = window.__NAIJA_GAME__?.getNpcPopulationState?.();
    return state?.activeDistrict === 'ekiti' && state.characters?.some(actor => actor.id === 'ekiti-farm-hand' && actor.loaded && actor.visible);
  }, null, { timeout: 30000 });
  const farmerVisual = await page.evaluate(() => window.__NAIJA_NPC_SYSTEM__?.getState?.()?.characters?.find(actor => actor.id === 'ekiti-farm-hand'));
  if (!farmerVisual?.loaded || farmerVisual.outfitRenderParts < 3) throw new Error('Ekiti farmer did not load its rigged garment meshes: ' + JSON.stringify(farmerVisual));
  const farmerInteraction = await page.evaluate(() => window.__NAIJA_NPC_SYSTEM__?.interact?.('ekiti-farm-hand'));
  const sparring = await page.evaluate(() => window.__NAIJA_NPC_SYSTEM__?.sparNearest?.([-250,0,650]));
  await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.closeFeed?.());
  const cleanerCamera = await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.openCamera?.('cctv-alimosho-1'));
  if (!cleanerCamera?.ok) throw new Error('Production build could not activate Alimosho for cleaner outfit verification.');
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.()?.byDistrict?.alimosho?.active === true, null, { timeout: 15000 });
  const alimoshoTraffic = await page.evaluate(() => window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.());
  if (alimoshoTraffic.activeVehicles !== 10 || alimoshoTraffic.byDistrict.alimosho.count !== 10) throw new Error('Alimosho district fleet did not stream ten vehicles: ' + JSON.stringify(alimoshoTraffic));
  try {
    await page.waitForFunction(() => {
      const cleaner = window.__NAIJA_NPC_SYSTEM__?.getState?.()?.characters?.find(actor => actor.id === 'alimosho-street-cleaner');
      return cleaner?.loaded && cleaner?.visible && cleaner?.outfitRenderParts >= 5;
    }, null, { timeout: 30000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({ player: window.__NAIJA_GAME__?.getPlayerState?.(), npc: window.__NAIJA_NPC_SYSTEM__?.getState?.(), activity: window.__NAIJA_GAME__?.getDistrictActivityState?.() }));
    throw new Error('Cleaner did not load within the production smoke window: ' + JSON.stringify({ error: error.message, cleaner: diagnostic.npc?.characters?.find(actor => actor.id === 'alimosho-street-cleaner'), activeDistrict: diagnostic.npc?.activeDistrict, player: diagnostic.player?.position, activity: diagnostic.activity?.activeDistrict }));
  }
  const cleanerVisual = await page.evaluate(() => window.__NAIJA_NPC_SYSTEM__?.getState?.()?.characters?.find(actor => actor.id === 'alimosho-street-cleaner'));
  if (cleanerVisual?.outfitStyle !== 'sanitation-green' || cleanerVisual?.model !== 'StockClerk' || cleanerVisual?.outfitRenderParts < 5) {
    throw new Error('Cleaner did not load the dedicated sanitation geometry: ' + JSON.stringify(cleanerVisual));
  }
  await page.evaluate(() => window.__NAIJA_SURVEILLANCE__?.closeFeed?.());
  const sparButtonVisible = await page.locator('#spar-button').isVisible();
  if (!sparButtonVisible) throw new Error('Production mobile SPAR control is missing');
  const result = await page.evaluate(({ farmerInteraction, farmerVisual, cleanerVisual, alimoshoTraffic }) => {
    const npcs = window.__NAIJA_GAME__?.getNpcPopulationState?.();
    const deviceProfile = window.__NAIJA_GAME__?.getStage08FProfile?.();
    return {
      gameReady: window.__NAIJA_GAME__?.ready,
      stage: window.__NAIJA_GAME__?.stage,
      npcs: { definitions: npcs?.definitions, districtCount: npcs?.districtCount, failedLoads: npcs?.failedLoads, activeDistrict: npcs?.activeDistrict, residentCharacters: npcs?.residentCharacters },
      vehicleFleets: { total: alimoshoTraffic.totalVehicles, activeAtFinalCheck: alimoshoTraffic.activeVehicles, districts: Object.keys(alimoshoTraffic.byDistrict || {}) },
      outfitChecks: {
        farmer: { id: farmerVisual?.id, style: farmerVisual?.outfitStyle, renderedGarmentParts: farmerVisual?.outfitRenderParts },
        cleaner: { id: cleanerVisual?.id, style: cleanerVisual?.outfitStyle, renderedGarmentParts: cleanerVisual?.outfitRenderParts }
      },
      interaction: farmerInteraction,
      deviceProfile: deviceProfile ? {
        sampleCount: deviceProfile.sampleCount,
        renderer: deviceProfile.rendering?.renderer,
        canvas: [deviceProfile.rendering?.canvasWidth, deviceProfile.rendering?.canvasHeight],
        npcDefinitions: deviceProfile.city?.npcs?.authoredDefinitions,
        outfitRenderParts: deviceProfile.city?.npcs?.outfitRenderParts,
        measurementSource: deviceProfile.measurementSource
      } : null,
      districtVehicleTraffic: window.__NAIJA_GAME__?.getDistrictVehicleTrafficState?.(),
      drawCalls: window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount,
      renderer: window.__NAIJA_RENDER_DIAGNOSTICS__ || null
    };
  }, { farmerInteraction, farmerVisual, cleanerVisual, alimoshoTraffic });
  if (!result.gameReady || result.npcs.failedLoads || result.npcs.definitions !== 64 || result.npcs.sparringHits < 1 ||
      result.vehicleFleets.total !== 50 || result.vehicleFleets.activeAtFinalCheck !== 10 ||
      !farmerInteraction?.ok || !sparring?.ok || !result.deviceProfile || result.deviceProfile.sampleCount < 1 ||
      result.deviceProfile.npcDefinitions !== 64 || !result.deviceProfile.canvas[0] || !result.deviceProfile.canvas[1] || errors.length) {
    throw new Error('Production browser verification failed: ' + JSON.stringify({ result, errors }));
  }
  console.log(JSON.stringify({ result: 'PASS', target: 'Vite production dist preview', rosterAssetCount: assetChecks.length, viewport: '844x390 Chromium/SwiftShader touch', assetChecks, farmerInteraction, sparring, sparButtonVisible, browser: result, errors, limitation: 'Software-rendered browser verification; no physical Android device test.' }, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
