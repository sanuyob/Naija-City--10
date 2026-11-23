import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = 4176;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
const consoleErrors = [];
const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    await delay(500);
  }
  if (!ready) throw new Error('Mobile soak Vite server did not become ready');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--enable-precise-memory-info', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 3 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 4 });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('crash', () => errors.push('Chromium renderer crashed during mobile soak'));
  browser.on('disconnected', () => errors.push('Chromium browser disconnected during mobile soak'));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${origin}?smoke=1`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount > 0, null, { timeout: 30000 });
  await page.evaluate(() => window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0, 0, -65], 0));
  await page.waitForFunction(() => window.__NAIJA_GAME__?.getStage08EState?.()?.heroBuildingLoaded === true, null, { timeout: 90000 });
  await page.evaluate(() => window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([0, 0, 0], 0));
  await page.waitForTimeout(500);

  const profile = await page.evaluate(() => ({
    lowMemoryMode: window.__NAIJA_GAME__?.dataOptimization?.lowMemoryDevice === true,
    startup: window.__NAIJA_GAME__?.startupPreload ?? null,
    deviceMemoryGiB: navigator.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    touchCapable: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
    viewport: { width: innerWidth, height: innerHeight },
    heap: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null
  }));
  if (!profile.lowMemoryMode || profile.startup?.failed !== 0 || profile.startup?.loaded !== profile.startup?.total || !profile.touchCapable) {
    throw new Error(`Mobile startup/profile gate failed: ${JSON.stringify(profile)}`);
  }

  const soak = await page.evaluate(async () => {
    const heap = () => performance.memory ? performance.memory.usedJSHeapSize : null;
    const heapStart = heap();
    const frameTimes = [];
    const start = performance.now();
    let previous = start;
    window.__NAIJA_RPG_PAUSED__ = false;
    await new Promise(resolve => {
      const tick = now => {
        frameTimes.push(now - previous);
        previous = now;
        if (now - start < 20000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    window.__NAIJA_RPG_PAUSED__ = true;
    const heapEnd = heap();
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const pick = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null;
    return {
      durationMs: performance.now() - start,
      frames: frameTimes.length,
      frameMs: { p50: pick(.50), p95: pick(.95), max: sorted.at(-1) ?? null },
      heapStartBytes: heapStart,
      heapEndBytes: heapEnd,
      heapGrowthBytes: heapStart == null || heapEnd == null ? null : heapEnd - heapStart,
      drawCalls: window.__NAIJA_RENDER_DIAGNOSTICS__?.drawCallCount ?? null,
      meshInstances: window.__NAIJA_RENDER_DIAGNOSTICS__?.scene?.meshInstances ?? null
    };
  });

  const result = { pass: errors.length === 0 && consoleErrors.length === 0 && soak.frames >= 30 && (soak.heapGrowthBytes == null || soak.heapGrowthBytes < 256 * 1024 * 1024), profile, soak, errors, consoleErrors, note: 'Chromium 3 GiB / 4-core / touch profile; software-rendered Box soak, not a physical Android device run.' };
  await mkdir('reports/stage-08q', { recursive: true });
  await writeFile('reports/stage-08q/mobile-soak.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) throw new Error(`Mobile soak gate failed: ${JSON.stringify(result)}`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
