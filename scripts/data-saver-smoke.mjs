import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4185;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited ${server.exitCode}`);
    await delay(250);
  }
  assert.ok(ready, 'Vite preview starts');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  const openSettings = async () => {
    await page.click('#rpg-interface [data-open="pause"]');
    await page.click('#rpg-interface [data-open="settings"]');
  };
  const readyGame = async () => {
    await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 120000 });
    await page.waitForFunction(() => window.__NAIJA_GAME__?.playerCharacterReady === true, null, { timeout: 60000 });
  };
  const snapshot = async () => page.evaluate(() => ({
    optimization: window.__NAIJA_GAME__?.dataOptimization,
    preload: window.__NAIJA_GAME__?.startupPreload,
    gidi: window.__NAIJA_GAME__?.getGidiState?.(),
    heroNpc: window.__NAIJA_GAME__?.getHeroNpcState?.() || null,
    stage08J: window.__NAIJA_GAME__?.stage08J || null,
    loadingHidden: document.querySelector('#city-loading')?.hidden ?? true,
    preference: localStorage.getItem('naijaCityDataSaver')
  }));

  await page.goto(origin + '?smoke=data-saver', { waitUntil: 'domcontentloaded' });
  await readyGame();
  await openSettings();
  let button = page.locator('#rpg-interface [data-setting="data-saver"]');
  let pressed = await button.getAttribute('aria-pressed');
  // Persist an explicit ON choice even if the browser initially suggested Data Saver.
  if (pressed === 'true') await button.click();
  await button.click();
  const enabledPreference = await page.evaluate(() => ({ stored: localStorage.getItem('naijaCityDataSaver'), runtime: window.__NAIJA_DATA_SAVER__ }));
  assert.equal(enabledPreference.stored, 'true', 'Data Saver ON persists in local storage');
  assert.equal(enabledPreference.runtime.enabled, true, 'Data Saver ON is shared with the game bootstrap');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await readyGame();
  const saverOn = await snapshot();
  assert.equal(saverOn.optimization.lowDataMode, true, 'Saved Data Saver ON activates low-data loading');
  assert.equal(saverOn.optimization.manualDataSaver, true, 'The runtime identifies the explicit ON choice');
  assert.equal(saverOn.optimization.manualDataSaverOverride, true, 'The saved preference overrides the network hint');
  assert.equal(saverOn.optimization.progressiveBuildingRadiusMetres, 85, 'Data Saver narrows background building streaming');
  assert.equal(saverOn.optimization.heroBuildingActivationRadiusMetres, 48, 'Data Saver defers the large district anchor');
  assert.equal(saverOn.optimization.startupBuildingRadiusMetres, 20, 'Data Saver limits startup to a compact 20m radius');
  assert.equal(saverOn.preload.total, 8, 'Data Saver loads only the eight nearest buildings at startup');
  assert.ok(saverOn.preload.bytes <= 1.5 * 1024 * 1024, 'Data Saver startup buildings stay below 1.5 MiB');
  assert.equal(saverOn.optimization.optionalStreetDownloadsSkipped, true, 'Data Saver defers optional street downloads');
  assert.equal(saverOn.stage08J?.dataSaver?.enabled, true, 'Data Saver skips optional Stage 08J textures and imported props');
  assert.equal(saverOn.stage08J?.optionalAssetsSkipped, true, 'The runtime records the skipped optional assets');
  assert.equal(saverOn.stage08J?.pbrRuntimeResolution, 'procedural-fallback', 'Data Saver uses lightweight procedural street materials');
  assert.ok(saverOn.stage08J?.importedAssets?.every(item => item.skipped === 'data-saver'), 'Data Saver skips optional downloaded street prop GLBs');
  assert.ok(!saverOn.gidi.infrastructureLoaded && saverOn.gidi.totalCells === 0, 'Distant GIDI remains unloaded during Yaba startup');
  assert.ok(saverOn.loadingHidden, 'The game becomes playable while optional assets are deferred');
  assert.notEqual(saverOn.heroNpc?.rigged, true, 'Optional Hero 01 stays out of the Data Saver startup path');

  await openSettings();
  button = page.locator('#rpg-interface [data-setting="data-saver"]');
  assert.equal(await button.getAttribute('aria-pressed'), 'true', 'Settings reflects the saved ON preference');
  await button.click();
  const disabledPreference = await page.evaluate(() => ({ stored: localStorage.getItem('naijaCityDataSaver'), runtime: window.__NAIJA_DATA_SAVER__ }));
  assert.equal(disabledPreference.stored, 'false', 'Data Saver OFF is also persisted');
  assert.equal(disabledPreference.runtime.enabled, false, 'Data Saver OFF updates the bootstrap preference');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await readyGame();
  const saverOff = await snapshot();
  assert.equal(saverOff.optimization.lowDataMode, false, 'Explicit Data Saver OFF overrides the automatic suggestion');
  assert.equal(saverOff.optimization.manualDataSaver, false, 'The runtime identifies the explicit OFF choice');
  assert.equal(saverOff.optimization.manualDataSaverOverride, true, 'The saved OFF preference remains authoritative after reload');
  assert.equal(saverOff.optimization.startupBuildingRadiusMetres, 20, 'Low-memory mobile devices retain the compact startup radius even with Data Saver OFF');
  assert.equal(saverOff.optimization.startupBuildings, 8, 'Low-memory mobile devices preload only the eight closest buildings');
  assert.equal(saverOff.optimization.optionalStreetDownloadsSkipped, true, 'Low-memory devices avoid optional street downloads without enabling Data Saver');
  assert.ok(!saverOff.gidi.infrastructureLoaded && saverOff.gidi.totalCells === 0, 'Normal Yaba startup also defers distant GIDI infrastructure');
  assert.ok(saverOff.loadingHidden, 'The game starts with Data Saver disabled too');
  assert.deepEqual(errors, [], 'No browser errors occur while changing and restoring Data Saver');

  console.log(JSON.stringify({ pass: true, saverOn: { lowDataMode: saverOn.optimization.lowDataMode, radiusMetres: saverOn.optimization.progressiveBuildingRadiusMetres, startupBytes: saverOn.preload.bytes, optionalHeroDeferred: saverOn.heroNpc?.rigged !== true }, saverOff: { lowDataMode: saverOff.optimization.lowDataMode, manualOverride: saverOff.optimization.manualDataSaverOverride }, gidiDeferredAtSpawn: true, browserErrors: errors }, null, 2));
  await context.close();
} catch (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
