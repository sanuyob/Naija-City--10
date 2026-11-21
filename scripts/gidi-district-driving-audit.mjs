import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4178;
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
  const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errors = [];
  const vertexWarnings = new Map();
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const alignment = text.match(/Non-interleaved vertex format with element size not multiple of 4[^]*?Element size: (\d+)/);
    if (alignment) vertexWarnings.set(Number(alignment[1]), (vertexWarnings.get(Number(alignment[1])) || 0) + 1);
    else errors.push('console: ' + text);
  });
  page.on('requestfailed', request => errors.push('requestfailed: ' + request.url() + ' ' + request.failure()?.errorText));
  await page.goto(origin + '?smoke=1&gidi-driving-audit=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 120000 });

  const points = [
    { name: 'Yaba Spine', district: 'Yaba', x: 705, z: -1300 },
    { name: 'Yaba bridge north approach', district: 'Yaba', x: 693.5, z: -710.75 },
    { name: 'Yaba bridge south approach', district: 'Yaba', x: 700, z: -1887.5 },
    { name: 'Eko CBD junction', district: 'Eko CBD', x: 1163.1326, z: -909.4154 },
    { name: 'Eko CBD local road', district: 'Eko CBD', x: 1288, z: -700 },
    { name: 'Eko canal bridge west approach', district: 'Eko CBD', x: 1277.5, z: -900 },
    { name: 'Eko canal bridge east approach', district: 'Eko CBD', x: 1309, z: -900 },
    { name: 'Canal Link bridge approach', district: 'Eko CBD', x: 1450, z: -1002 },
    { name: 'Victoria Island junction', district: 'Victoria Island', x: 1637.5, z: -1737.2677 },
    { name: 'Ikoyi waterfront junction', district: 'Ikoyi', x: 2088.2979, z: -911.0771 },
    { name: 'Lekki district junction', district: 'Lekki', x: 2987.9841, z: -1737.2674 },
    { name: 'Lekki bridge north approach', district: 'Lekki', x: 2982.5, z: -1798.0912 },
    { name: 'Lekki bridge south approach', district: 'Lekki', x: 2982.5, z: -1976.4546 },
    { name: 'Ekiti Highlands junction', district: 'Ekiti Highlands', x: 3438.0531, z: -512.9420 }
  ];

  const report = [];
  for (const point of points) {
    const result = await page.evaluate(async ({ x, z }) => {
      const g = window.__NAIJA_GAME__;
      const streamed = await g.debugLoadGidiForSmoke([x, 0, z]);
      const hit = g.getGroundProbe([x, 32, z], [x, -8, z]);
      if (!hit?.point) return { streamed, hit, error: 'No road ground ray hit' };
      const carPosition = [x, hit.point[1] + 0.94, z];
      const placed = g.debugSetVehiclePositionForSmoke(carPosition, 0);
      g.debugSetPlayerForSmoke([x, hit.point[1], z], 0);
      const entered = g.debugEnterVehicleForSmoke();
      if (!placed || !entered) return { streamed, hit, placed, entered, error: 'Vehicle placement or entry failed' };
      const settled = g.debugAdvanceVehicleForSmoke(150).vehicle;
      g.debugSetVehicleInputForSmoke(0, true, false);
      const driven = g.debugAdvanceVehicleForSmoke(30).vehicle;
      g.debugClearVehicleInputForSmoke();
      g.debugExitVehicleForSmoke();
      return {
        streamed: { loadedCells: streamed.loadedCells, playerCollisionProxies: streamed.playerCollisionProxies, errors: streamed.errors },
        hit,
        placed,
        entered,
        settled: { y: settled.position[1], wheelContacts: settled.dynamics?.measuredWheelContacts || 0 },
        driven: { position: driven.position, speedKmh: driven.speedKmh, wheelContacts: driven.dynamics?.measuredWheelContacts || 0 },
        deltaMetres: Math.hypot(driven.position[0] - carPosition[0], driven.position[2] - carPosition[2])
      };
    }, point);
    assert.equal(result.hit?.surface, 'asphalt', `${point.name}: expected asphalt road hit: ${JSON.stringify(result)}`);
    assert.equal(result.entered, true, `${point.name}: vehicle entry failed`);
    assert.ok(result.settled.wheelContacts >= 3, `${point.name}: resting car did not contact at least three wheels: ${JSON.stringify(result)}`);
    assert.ok(result.driven.wheelContacts >= 3, `${point.name}: vehicle lost wheel contact while driving: ${JSON.stringify(result)}`);
    assert.ok(result.driven.speedKmh > 5, `${point.name}: vehicle did not accelerate: ${JSON.stringify(result)}`);
    assert.ok(result.deltaMetres > 1, `${point.name}: vehicle did not move along the road: ${JSON.stringify(result)}`);
    report.push({ name: point.name, district: point.district, surface: result.hit.surface, roadHeight: Number(result.hit.point[1].toFixed(3)), wheelContacts: result.driven.wheelContacts, speedKmh: result.driven.speedKmh, distanceMetres: Number(result.deltaMetres.toFixed(2)), loadedCells: result.streamed.loadedCells });
  }
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ pass: true, pointCount: report.length, districts: [...new Set(report.map(item => item.district))], allRoadHits: report.length, allDrivingChecks: report.length, averageSpeedKmh: Number((report.reduce((a, b) => a + b.speedKmh, 0) / report.length).toFixed(1)), vertexAlignmentWarnings: Object.fromEntries(vertexWarnings), browserErrors: errors, report }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
