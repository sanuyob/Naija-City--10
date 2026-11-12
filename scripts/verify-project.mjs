import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const game = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(html, /id="application"/, 'HTML must provide the PlayCanvas canvas');
assert.match(html, /src="\/src\/main\.js"/, 'HTML must load the game entry point');
for (const control of ['accelerate', 'brake', 'left', 'right']) {
  assert.match(html, new RegExp(`data-control="${control}"`), `Missing ${control} control`);
}
assert.match(html, /id="performance"/, 'Live performance HUD is missing');
assert.match(game, /createGraphicsDevice/, 'PlayCanvas graphics device is not initialized');
assert.match(game, /new pc\.AppBase/, 'Tree-shakeable AppBase setup is required');
assert.match(game, /CameraComponentSystem/, 'Camera system is not registered');
assert.match(game, /RenderComponentSystem/, 'Render system is not registered');
assert.match(game, /app\.on\('update'/, 'Game update loop is missing');
assert.match(game, /pointerdown/, 'Touch/pointer input is missing');
assert.match(game, /keydown/, 'Keyboard input is missing');
assert.match(game, /junctionZ/, 'Stage 02 junction geometry is missing');
assert.match(game, /zebra-west/, 'Pedestrian crossing is missing');
assert.match(game, /roadside-kiosk-counter/, 'Roadside Nigerian detail is missing');
assert.match(game, /stats\?\.fps/, 'FPS telemetry is missing');
assert.match(game, /drawCallCount/, 'Draw-call telemetry is missing');
assert.match(game, /vramTotalBytes/, 'GPU memory telemetry is missing');
assert.match(css, /touch-action:\s*none/, 'Touch controls need touch-action handling');
assert.ok(pkg.dependencies?.playcanvas, 'PlayCanvas dependency is missing');
assert.ok(pkg.devDependencies?.vite, 'Vite dependency is missing');
console.log('Stage 02 checks passed: engine setup, mobile input, junction, roadside props, handling and performance HUD.');
