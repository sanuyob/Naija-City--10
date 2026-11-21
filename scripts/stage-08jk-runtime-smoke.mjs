import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4177;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    await delay(500);
  }
  assert.ok(ready, 'Vite preview should start');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
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
  await page.goto(origin + '?smoke=1&stage08jk=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.playerCharacterReady === true, null, { timeout: 60000 });

  const local = await page.evaluate(() => {
    const g = window.__NAIJA_GAME__;
    const pbr = g.stage08J?.pbrMaterials || {};
    return {
      stage08J: g.stage08J,
      stage08K: g.stage08K,
      worldCollision: g.worldCollision,
      playerPhysics: g.getPhysicsState?.().player,
      connectorProbe: g.getGroundProbe?.([0, 2, 207], [0, -1, 207]),
      utilityBoxProbe: g.getGroundProbe?.([12.9, 2, 115], [12.9, 0, 115]),
      stage08JTextureMapCounts: Object.fromEntries(Object.entries(pbr).map(([family, maps]) => [family, maps.length])),
      batches: g.getStaticBatchState?.(),
      diagnostics: window.__NAIJA_RENDER_DIAGNOSTICS__,
      visualSettings: g.getVisualSettings?.(),
      deviceProfile: g.getStage08FProfile?.(),
      firstSpawn: {
        player: g.getPlayerState(),
        ground: g.getGroundProbe?.([-6.1, 2, -40], [-6.1, -2, -40]),
        camera: g.getCameraPosition?.()
      }
    };
  });
  assert.ok(Math.abs(local.firstSpawn.player.position[0] + 6.1) < 0.1 && Math.abs(local.firstSpawn.player.position[1] - 0.12) < 0.1 && Math.abs(local.firstSpawn.player.position[2] + 40) < 0.1, 'first spawn should be on the west Yaba pedestrian sidewalk');
  assert.equal(local.firstSpawn.player.grounded, true);
  assert.equal(local.firstSpawn.ground?.surface, 'concrete');
  assert.equal(local.firstSpawn.ground?.id, 'yaba-concrete-sidewalk-west');
  assert.equal(local.visualSettings?.toneMapping, 'ACES2');
  assert.ok(Math.abs(local.visualSettings?.exposure - 0.88) < 0.001);
  assert.deepEqual(local.visualSettings?.ambientLight?.slice(0, 3), [0.24, 0.26, 0.28]);
  assert.ok(local.deviceProfile?.sampleCount > 0, 'Stage 08F device profiler should collect frame samples');
  assert.ok(local.deviceProfile?.rendering?.averageDrawCalls > 0, 'Stage 08F should report average draw calls');
  assert.ok(local.deviceProfile?.city?.trafficActors > 0, 'Stage 08F should report traffic actors');
  assert.ok(local.firstSpawn.camera?.every(Number.isFinite));
  assert.equal(local.stage08J?.stage, '08J');
  assert.equal(local.stage08J?.connector?.lengthMetres, 79);
  assert.equal(local.stage08J?.connector?.roadWidthMetres, 14);
  assert.equal(local.stage08J?.importedAssets?.length, 2);
  assert.ok(local.stage08J.importedAssets.every(item => item.loaded === true), JSON.stringify(local.stage08J.importedAssets));
  assert.deepEqual(local.stage08J.assetFailures, []);
  assert.deepEqual(local.stage08J.textureFailures, []);
  assert.ok(Object.values(local.stage08JTextureMapCounts).every(count => count === 3), JSON.stringify(local.stage08JTextureMapCounts));
  assert.equal(local.stage08J.pbrRuntimeResolution, 512);
  assert.ok(local.stage08J.collisionProxies.length >= 15);
  assert.equal(local.stage08K?.stage, '08K');
  assert.equal(local.stage08K?.bridgeTreatments?.length, 4);
  assert.equal(local.stage08K?.junctions?.length, 5);
  assert.equal(local.stage08K?.districtCoverage?.length, 6);
  assert.ok(local.stage08K.collisionProxies.length >= 50);
  assert.ok(local.batches?.stage08J?.batches > 0, 'Yaba/Ikeja static street meshes should be batched');
  assert.ok(local.batches?.stage08K?.batches > 0, 'GIDI bridge/junction details should be batched');
  assert.ok(local.batches.stage08J.batches < local.stage08J.detailMeshes, 'Yaba/Ikeja batching should reduce render instances');
  assert.ok(local.batches.stage08K.batches < local.stage08K.detailMeshes, 'GIDI batching should reduce render instances');
  assert.ok(local.worldCollision?.yabaIkejaStreetProxies >= 15);
  assert.ok(local.worldCollision?.gidiRoadDetailProxies >= 50);
  assert.ok(local.playerPhysics?.worldColliderCount > 500);
  assert.ok(local.connectorProbe?.point, 'Yaba–Ikeja connector should have continuous player ground contact');
  assert.ok(local.utilityBoxProbe?.point && local.utilityBoxProbe.point[1] > 0.7, 'Downloaded utility box must have a physical player collision');

  // Move into the GIDI Yaba core so the live streamed road cells and bridge
  // approach collision can be checked with the same runtime streamer used by play.
  const gidi = await page.evaluate(async () => window.__NAIJA_GAME__.debugLoadGidiForSmoke?.([705, 0, -1300]));
  await page.waitForFunction(() => {
    const s = window.__NAIJA_GAME__?.getGidiState?.();
    return s && s.infrastructureLoaded && s.loadedCells > 0 && s.fullCells > 0 && s.inFlightLoads === 0 && s.playerCollisionProxies > 0 && s.visibleMeshInstances > 0;
  }, null, { timeout: 90000 });
  const gidiState = await page.evaluate(() => window.__NAIJA_GAME__.getGidiState());
  assert.ok(gidiState.loadedCells > 0);
  assert.ok(gidiState.playerCollisionProxies > 0);
  assert.equal(gidiState.errors.length, 0);
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    pass: true,
    stage08J: {
      connector: local.stage08J.connector,
      importedAssets: local.stage08J.importedAssets,
      pbrMaps: local.stage08JTextureMapCounts,
      detailMeshes: local.stage08J.detailMeshes,
      collisionProxies: local.stage08J.collisionProxies.length,
      generatedBatches: local.batches?.stage08J?.batches
    },
    stage08K: {
      districts: local.stage08K.districtCoverage,
      bridges: local.stage08K.bridgeTreatments.length,
      junctions: local.stage08K.junctions.length,
      crosswalkStripes: local.stage08K.crosswalkStripes,
      detailMeshes: local.stage08K.detailMeshes,
      collisionProxies: local.stage08K.collisionProxies.length,
      generatedBatches: local.batches?.stage08K?.batches
    },
    firstSpawn: local.firstSpawn,
    visualSettings: local.visualSettings,
    deviceProfile: { sampleCount: local.deviceProfile.sampleCount, sampledDurationMs: local.deviceProfile.sampledDurationMs, averageDrawCalls: local.deviceProfile.rendering.averageDrawCalls, peakDrawCalls: local.deviceProfile.rendering.peakDrawCalls, averageGpuResourceMiB: local.deviceProfile.rendering.averageGpuResourceMiB },
    playerWorldColliders: local.playerPhysics.worldColliderCount,
    connectorGroundContact: local.connectorProbe.point,
    utilityCabinetCollision: local.utilityBoxProbe.point,
    gidi: { loadedCells: gidiState.loadedCells, fullCells: gidiState.fullCells, playerCollisionProxies: gidiState.playerCollisionProxies, infrastructureBatchCount: gidiState.infrastructureBatchCount, cellBatchCount: gidiState.cellBatchCount, infrastructureRenderComponents: gidiState.infrastructureRenderComponents, staticImportsBatched: gidiState.staticImportsBatched, materialRefractionDowngrades: gidiState.materialRefractionDowngrades, errors: gidiState.errors },
    vertexAlignmentWarnings: Object.fromEntries(vertexAlignmentWarnings),
    drawCalls: local.diagnostics?.drawCallCount,
    meshInstances: local.diagnostics?.scene?.meshInstances,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
