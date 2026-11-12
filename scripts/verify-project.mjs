import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const game = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(html, /id="application"/, 'HTML must provide the PlayCanvas canvas');
assert.match(html, /src="\/src\/main\.js"/, 'HTML must load the game entry point');
assert.match(html, /data-control="accelerate"/, 'Mobile accelerate control is missing');
assert.match(html, /data-control="brake"/, 'Mobile brake control is missing');
assert.match(html, /data-control="left"/, 'Mobile left control is missing');
assert.match(html, /data-control="right"/, 'Mobile right control is missing');
assert.match(game, /createGraphicsDevice/, 'PlayCanvas graphics device is not initialized');
assert.match(game, /CameraComponentSystem/, 'Camera system is not registered');
assert.match(game, /RenderComponentSystem/, 'Render system is not registered');
assert.match(game, /app\.on\('update'/, 'Game update loop is missing');
assert.match(game, /pointerdown/, 'Touch/pointer input is missing');
assert.match(game, /keydown/, 'Keyboard input is missing');
assert.match(game, /pc\.math\.clamp/, 'Road boundary guard is missing');
assert.match(css, /touch-action:\s*none/, 'Touch controls need touch-action handling');
assert.ok(pkg.dependencies?.playcanvas, 'PlayCanvas dependency is missing');
assert.ok(pkg.devDependencies?.vite, 'Vite dependency is missing');

console.log('Stage 01 project checks passed (HTML hooks, controls, PlayCanvas setup, input, boundary guard, CSS and dependencies).');
