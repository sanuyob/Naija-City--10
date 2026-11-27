import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = 4187;
const origin = 'http://127.0.0.1:' + port;
const reviewDir = new URL('../artifacts/stage-08l-review/', import.meta.url);
await mkdir(reviewDir, { recursive: true });

const districts = [
  { key: 'alimosho', x: -250, z: 390, camera: [-214, 10, 434], target: [-250, 2, 390] },
  { key: 'lekki', x: 250, z: 270, camera: [210, 13, 310], target: [250, 3, 270] },
  { key: 'victoriaIsland', x: 250, z: 45, camera: [315, 28, 120], target: [250, 16, 45] },
  { key: 'ekoAtlantic', x: 500, z: 45, camera: [585, 26, 120], target: [535, 8, 45] },
  { key: 'ekiti', x: -250, z: 650, camera: [-210, 16, 700], target: [-250, 3, 650] }
];

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(origin);
      if (response.ok) { ready = true; break; }
    } catch {}
    if (server.exitCode !== null) throw new Error('Vite preview exited with code ' + server.exitCode);
    await delay(350);
  }
  if (!ready) throw new Error('Vite preview did not become ready');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin + '?smoke=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount > 0, null, { timeout: 25000 });

  const baseline = await page.evaluate(() => {
    const g = window.__NAIJA_GAME__;
    return {
      stage: g.stage08L?.stage,
      districtKeys: Object.keys(g.stage08L?.districts || {}),
      mapPins: g.stage08L?.mapRecords?.length || 0,
      roadNetwork: g.stage08L?.roadNetwork || null,
      staticBatch: g.getStaticBatchState?.().stage08L || null,
      stage08QBatching: g.getStaticBatchState?.().stage08Q || null,
      renderBreakdown: g.getRenderBreakdown?.() || null,
      worldMapCount: g.getWorldIdentityState?.().count || 0,
      farClip: window.__NAIJA_RENDER_DIAGNOSTICS__?.camera?.farClip || null
    };
  });
  if (baseline.stage !== '08L' || baseline.districtKeys.length !== 5 || baseline.mapPins !== 5 || baseline.roadNetwork?.interDistrictConnectors !== 5) {
    throw new Error('Stage 08L runtime manifest failed: ' + JSON.stringify(baseline));
  }

  const probes = [];
  await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; });
  for (const district of districts) {
    await page.evaluate(({ key, x, z }) => {
      window.__NAIJA_GAME__.debugSetPlayerForSmoke([x, 0, z], 0);
    }, district);
    await page.waitForFunction(key => window.__NAIJA_GAME__?.stage08L?.districtRoots?.[key]?.enabled === true, district.key, { timeout: 5000 });
    await page.evaluate(({ camera, target }) => {
      window.__NAIJA_RPG_PAUSED__ = true;
      const g = window.__NAIJA_GAME__;
      g.debugSetCameraForSmoke(camera, target);
      g.debugSetCameraFarClipForSmoke(300);
    }, district);
    await page.waitForTimeout(120);
    const result = await page.evaluate(({ key, x, z }) => {
      const g = window.__NAIJA_GAME__;
      const position = g.getPlayerState?.().position || [];
      const root = g.stage08L?.districtRoots?.[key];
      const ground = g.getGroundProbe?.([x, 4, z], [x, -2, z]) || null;
      return {
        district: key,
        rootActive: root?.enabled === true,
        playerPosition: position,
        groundHit: Boolean(ground),
        groundNormalY: ground?.normal?.[1] ?? null,
        groundSurface: ground?.surface ?? null,
        visibleChildren: root?.children?.length ?? 0
      };
    }, district);
    if (!result.rootActive || result.visibleChildren < 20 || !result.groundHit || (result.groundNormalY ?? 0) < 0.5) {
      throw new Error('District walkability/stream activation failed: ' + JSON.stringify(result));
    }
    probes.push(result);
    await page.screenshot({ path: new URL(district.key + '.png', reviewDir).pathname });
    await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; });
  }

  if (errors.length) throw new Error('Browser errors: ' + JSON.stringify(errors));
  const summary = {
    result: 'PASS',
    viewport: '1024x640 Chromium / SwiftShader',
    baseline,
    districtGroundAndStreamingProbes: probes,
    browserErrors: errors,
    limitation: 'Software WebGL validation only; this is not a physical Android performance or thermal test.'
  };
  await writeFile(new URL('runtime-summary.json', reviewDir), JSON.stringify(summary, null, 2) + '\n');
  await writeFile(new URL('contact-sheet.html', reviewDir),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#101916;color:#eee;font:16px sans-serif;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}figure{margin:0}img{width:100%;height:auto;border:1px solid #41544b}figcaption{padding:6px}</style></head><body><h1>Stage 08L district review</h1><main>' +
    districts.map(d => '<figure><figcaption>' + d.key + '</figcaption><img src="' + d.key + '.png"></figure>').join('') +
    '</main></body></html>');
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
