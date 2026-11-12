# Naija City Drive — Stage 02

A phone-first Nigerian city driving prototype built with the PlayCanvas Engine and Vite.

## Stage 02 additions
- Four-way street junction with zebra crossings, stop lines, kerbs and corner islands.
- Improved arcade steering response, acceleration, coasting, braking and lateral grip.
- Low-poly roadside details: open drains, utility poles, street boards and small kiosks.
- Live performance HUD: FPS, frame time, draw calls and estimated GPU resource memory when exposed by the engine build.
- Reduced device pixel ratio cap to 1.25 for a more conservative mobile rendering load.

## Controls
- W / Up: accelerate
- S / Down: brake
- A / Left: steer left
- D / Right: steer right
- Mobile: hold the on-screen controls

## Verification
GitHub Actions runs source checks, a production build, a JavaScript raw/gzip budget gate, and a headless Chromium test at 390 × 844. The browser test checks WebGL 2 startup, Stage 02 readiness, the performance HUD and accelerator input.

## Performance budgets
Latest verified build: 1,201.1 KiB total minified JavaScript and 320.0 KiB gzip across two chunks. The HTML entry's game bootstrap is only about 2.29 KiB; the PlayCanvas game/engine chunk remains about 1,227.64 KiB (327.27 KiB gzip) and still triggers Vite's 500 KiB warning. Lazy-loading improves initial shell loading and caching, but does not remove the engine payload. The analyzer enforces 1,400 KiB raw / 400 KiB gzip budgets. Vite's warning is intentionally not hidden or raised. Further engine-level trimming is still a performance task.

## Physical Android qualification
The headless browser test is not a substitute for a physical phone test. On the target Android device, open the deployed game, allow shaders to settle, drive the same junction loop for at least two minutes, and record the HUD's FPS, frame time, draw calls and GPU memory. Also note startup time, stutter, heat and whether the browser reloads. GPU memory is an engine estimate, not total Android RAM.

## Current scope and limitations
This remains a compact arcade prototype. Vehicle handling is improved but still kinematic, not rigid-body or suspension physics. There is no traffic AI, pedestrian simulation, collision system, audio or save system. No real-device FPS or RAM result is claimed until a physical Android run is completed.

## Run locally
Requires Node.js 22 and npm.
```bash
npm install
npm run dev
npm run verify
npm run build
npm run analyze:bundle
npm run test:browser
npm run preview
```

## Engine references
- https://developer.playcanvas.com/user-manual/engine/standalone/
- https://developer.playcanvas.com/user-manual/optimization/guidelines/
- https://developer.playcanvas.com/user-manual/optimization/app-stats/
- https://developer.playcanvas.com/user-manual/optimization/mini-stats/
- https://vite.dev/guide/build
