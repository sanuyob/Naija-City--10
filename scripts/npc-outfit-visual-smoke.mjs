import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = 4194, origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) { try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {} if (server.exitCode !== null) throw new Error('Vite dev server exited'); await delay(350); }
  if (!ready) throw new Error('Vite dev server did not become ready');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '?smoke=1&stage08m=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__NAIJA_GAME__?.ready === true, null, { timeout: 90000 });
  await page.evaluate(() => { window.__NAIJA_RPG_PAUSED__ = false; window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([-260,0,386],180); });
  await page.waitForFunction(() => {
    const state = window.__NAIJA_NPC_SYSTEM__?.getState?.();
    return state?.activeDistrict === 'alimosho' && state?.characters?.some(actor => actor.id === 'alimosho-street-cleaner' && actor.loaded && actor.outfitRenderParts >= 5);
  }, null, { timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__NAIJA_GAME__?.debugSetPlayerForSmoke?.([-320, 0, 420], 0); window.__NAIJA_NPC_SYSTEM__?.setActiveDistrict?.('alimosho'); window.__NAIJA_RPG_PAUSED__ = true; window.__NAIJA_GAME__?.debugSetCameraForSmoke?.([-260.1, 0.60, 391.2], [-260.1, 0.075, 390.1]); });
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => ({ cleaner: window.__NAIJA_NPC_SYSTEM__?.getState?.()?.characters?.find(actor => actor.id === 'alimosho-street-cleaner'), camera: window.__NAIJA_GAME__?.getCameraPosition?.(), player: window.__NAIJA_GAME__?.getPlayerState?.()?.position }));
  await mkdir('artifacts/npc-clothing-review', { recursive: true });
  await page.screenshot({ path: 'artifacts/npc-clothing-review/alimosho-cleaner.png' });
  console.log(JSON.stringify({ result:'PASS', state, errors, screenshot:'artifacts/npc-clothing-review/alimosho-cleaner.png' },null,2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
