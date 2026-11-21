import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4175;
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
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin + '?smoke=1&stage08i=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 120000 });

  const runtime = await page.evaluate(async () => {
    const game = window.__NAIJA_GAME__;
    game.debugSetPlayerForSmoke?.([83, 0, 310], 0);
    const outerRoadGround = game.getGroundProbe?.([83, 2, 310], [83, -1, 310]);
    game.debugSetPlayerForSmoke?.([66, 0, 415], 0);
    const houseFrontGround = game.getGroundProbe?.([58, 1, 415], [72, 1, 415]);
    return {
      ready: game.ready,
      stage: game.stage08I,
      worldCollision: game.worldCollision,
      physics: game.getPhysicsState?.().player,
      outerRoadGround,
      houseFrontGround,
      player: game.getPlayerState?.(),
      diagnostics: window.__NAIJA_RENDER_DIAGNOSTICS__
    };
  });

  assert.equal(runtime.ready, true);
  assert.equal(runtime.stage?.stage, '08I');
  assert.equal(runtime.stage?.residentialBuildings, 9);
  assert.equal(runtime.stage?.commercialBuildings, 4);
  assert.equal(runtime.stage?.marketStalls, 6);
  assert.equal(runtime.stage?.roadNetwork?.connectedJunctions, 20);
  assert.equal(runtime.stage?.collisionProxies?.length, 87);
  assert.equal(runtime.stage?.groundColliders?.length, 3);
  assert.equal(runtime.worldCollision?.ikejaDistrictProxies, 87);
  assert.equal(runtime.worldCollision?.ikejaGroundColliders, 3);
  assert.ok(runtime.physics?.worldColliderCount >= 450, );
  assert.ok(runtime.outerRoadGround?.point, 'Raycast should hit the added outer residential road ground support');
  assert.ok(runtime.houseFrontGround?.point, 'Raycast should hit the residential building shell from the street approach');
  assert.deepEqual(errors, [], `Browser runtime errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({
    pass: true,
    stage: runtime.stage.stage,
    roadNetwork: runtime.stage.roadNetwork,
    buildings: { residential: runtime.stage.residentialBuildings, commercial: runtime.stage.commercialBuildings },
    marketStalls: runtime.stage.marketStalls,
    staticMeshes: runtime.stage.detailMeshes,
    collisionProxies: runtime.stage.collisionProxies.length,
    playerWorldColliders: runtime.physics.worldColliderCount,
    outerRoadGroundHit: runtime.outerRoadGround.point,
    residentialShellRayHit: runtime.houseFrontGround.point,
    drawCalls: runtime.diagnostics?.drawCallCount,
    meshInstances: runtime.diagnostics?.scene?.meshInstances,
    browserErrors: errors
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
