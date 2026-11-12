import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4173;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  'preview',
  '--host', '127.0.0.1',
  '--port', String(port),
  '--strictPort'
], { stdio: 'ignore' });

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) { ready = true; break; }
    } catch {}
    if (server.exitCode !== null) throw new Error(`Vite preview exited with code ${server.exitCode}`);
    await delay(500);
  }
  if (!ready) throw new Error('Vite preview did not become ready');

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.locator('#status').filter({ hasText: 'Ready' }).waitFor({ timeout: 30000 });

  const webgl2Available = await page.locator('#application').evaluate(canvas => Boolean(canvas.getContext('webgl2')));
  if (!webgl2Available) throw new Error('WebGL 2 context is not available in the browser smoke test');

  const go = page.locator('[data-control="accelerate"]');
  const bounds = await go.boundingBox();
  if (!bounds) throw new Error('Mobile accelerate button is not visible');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  const speedText = await page.locator('#speed').textContent();
  await page.mouse.up();
  const speed = Number.parseInt(speedText ?? '0', 10);
  if (!(speed > 0)) throw new Error(`Accelerate control did not increase speed (read: ${speedText})`);

  if (pageErrors.length) throw new Error(`Browser console errors: ${pageErrors.join(' | ')}`);
  console.log(`Browser smoke passed: 390x844 mobile viewport, WebGL 2, ready scene and accelerate input (${speedText}).`);
  await context.close();
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
