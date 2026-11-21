import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4179;
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
  assert.ok(ready, 'Vite server did not start');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
  page.on('console', message => { if (message.type() === 'error' && !/Non-interleaved vertex format with element size not multiple of 4/.test(message.text())) errors.push(message.text()); });
  await page.goto(origin + '?smoke=1&yaba-ikeja-driving-audit=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 120000 });
  const firstSpawn = await page.evaluate(() => {
    const g = window.__NAIJA_GAME__;
    const player = g.getPlayerState();
    return {
      position: player.position,
      grounded: player.grounded,
      ground: g.getGroundProbe([-6.1, 2, -40], [-6.1, -2, -40]),
      spawn: g.firstSpawnPosition,
      camera: g.getCameraPosition(),
      visualSettings: g.getVisualSettings()
    };
  });
  assert.ok(Math.abs(firstSpawn.position[0] + 6.1) < 0.1 && Math.abs(firstSpawn.position[1] - 0.12) < 0.1 && Math.abs(firstSpawn.position[2] + 40) < 0.1,
    `Ara should start on the Yaba west pedestrian footpath: ${JSON.stringify(firstSpawn)}`);
  assert.equal(firstSpawn.grounded, true, 'Ara should be grounded at first spawn');
  assert.equal(firstSpawn.ground?.surface, 'concrete', 'first spawn should be on the pedestrian sidewalk, not the carriageway');
  assert.equal(firstSpawn.ground?.id, 'yaba-concrete-sidewalk-west', 'first spawn should use the matching sidewalk support collider');
  assert.ok(firstSpawn.camera?.every(Number.isFinite), 'first-person-follow camera should be initialized');
  const points = [
    { name: 'Yaba main road / first-spawn frontage', x: 0, z: -40, yaw: 0, expected: 'asphalt' },
    { name: 'Yaba-Ikeja connector', x: 0, z: 207, yaw: 0, expected: 'asphalt' },
    { name: 'Ikeja approach', x: 0, z: 220, yaw: 0, expected: 'asphalt' },
    { name: 'Ikeja commercial avenue', x: 0, z: 310, yaw: 0, expected: 'asphalt' },
    { name: 'Ikeja west collector', x: -45, z: 320, yaw: 0, expected: 'asphalt' },
    { name: 'Ikeja east collector', x: 45, z: 320, yaw: 0, expected: 'asphalt' },
    { name: 'Ikeja west residential access', x: -83, z: 320, yaw: 0, expected: 'asphalt', id: 'stage08i-road-outer-residential-west' },
    { name: 'Ikeja east residential access', x: 83, z: 320, yaw: 0, expected: 'asphalt', id: 'stage08i-road-outer-residential-east' },
    { name: 'Ikeja west cross-street extension', x: -80, z: 246, yaw: 90, expected: 'asphalt', id: ['stage08i-road-cross-246', 'stage08i-road-outer-residential-west'] },
    { name: 'Ikeja east cross-street extension', x: 80, z: 438, yaw: 90, expected: 'asphalt', id: ['stage08i-road-cross-438', 'stage08i-road-outer-residential-east'] }
  ];
  const report = [];
  const visualAuditDir = '/tmp/naija-city-visual-audit/yaba-ikeja';
  mkdirSync(visualAuditDir, { recursive: true });
  for (const point of points) {
    const result = await page.evaluate(({ x, z, yaw }) => {
      const g = window.__NAIJA_GAME__;
      // Move the player sedan away before raycasting so its own chassis proxy
      // cannot masquerade as an asphalt surface at the next audit point.
      g.debugSetVehiclePositionForSmoke([1000, 12, 1000], 0);
      const hit = g.getGroundProbe([x, 5, z], [x, -3, z]);
      if (!hit?.point) return { hit };
      const placed = g.debugSetVehiclePositionForSmoke([x, hit.point[1] + 0.94, z], yaw);
      g.debugSetPlayerForSmoke([x, hit.point[1], z], yaw);
      const entered = g.debugEnterVehicleForSmoke();
      if (!placed || !entered) return { hit, placed, entered };
      const settled = g.debugAdvanceVehicleForSmoke(120).vehicle;
      g.debugSetVehicleInputForSmoke(0, true, false);
      const driven = g.debugAdvanceVehicleForSmoke(30).vehicle;
      g.debugClearVehicleInputForSmoke();
      g.debugExitVehicleForSmoke();
      return {
        hit, placed, entered,
        settledWheelContacts: settled.dynamics?.measuredWheelContacts || 0,
        wheelContacts: driven.dynamics?.measuredWheelContacts || 0,
        speedKmh: driven.speedKmh,
        position: driven.position,
        vehicleColliderCount: driven.environmentColliderCount
      };
    }, point);
    assert.equal(result.hit?.surface, point.expected, `${point.name}: wrong ground surface: ${JSON.stringify(result)}`);
    if (point.id) assert.ok((Array.isArray(point.id) ? point.id : [point.id]).includes(result.hit?.id), `${point.name}: expected an adjoining asphalt collider, got ${result.hit?.id}`);
    assert.equal(result.entered, true, `${point.name}: vehicle entry failed`);
    assert.ok(result.settledWheelContacts >= 3, `${point.name}: wheels not grounded before driving`);
    assert.ok(result.wheelContacts >= 3, `${point.name}: wheel contact lost while driving`);
    assert.ok(result.speedKmh > 5, `${point.name}: no forward movement`);
    await page.evaluate(({ x, z, yaw }) => {
      window.__NAIJA_RPG_PAUSED__ = true;
      const g = window.__NAIJA_GAME__;
      g.debugSetVehiclePositionForSmoke([1000, 12, 1000], 0);
      g.debugSetCameraForSmoke([x + 32, 18, z + 38], [x, 0, z]);
    }, point);
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${visualAuditDir}/${point.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png` });
    await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; });
    report.push({ name: point.name, surface: result.hit.surface, collider: result.hit.id, wheelContacts: result.wheelContacts, speedKmh: result.speedKmh });
  }
  const initialTraffic = await page.evaluate(() => window.__NAIJA_GAME__.getTrafficPositions());
  await page.waitForTimeout(1200);
  const laterTraffic = await page.evaluate(() => window.__NAIJA_GAME__.getTrafficPositions());
  const movingTraffic = initialTraffic.filter(item => {
    const next = laterTraffic.find(other => other.name === item.name);
    return next && Math.hypot(next.position[0] - item.position[0], next.position[2] - item.position[2]) > 0.1;
  }).map(item => item.name);
  assert.ok(movingTraffic.includes('traffic-ikeja-0') && movingTraffic.includes('traffic-ikeja-1'), 'Ikeja traffic actors should advance along the road');
  assert.deepEqual(errors, [], 'Browser/runtime errors: ' + errors.join('; '));
  console.log(JSON.stringify({ pass: true, firstSpawn, roadAndJunctionPoints: report.length, allDrivingChecks: report.length, movingTraffic, report, browserErrors: errors }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
