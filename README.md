# Naija City Drive — Stage 02
Phone-first Nigerian city driving prototype using PlayCanvas Engine and Vite.

## Stage 02 changes
- Lazy-loads PlayCanvas after the small page shell, reducing the initial entry chunk and deferring engine download until scene startup.
- Removes unused texture and GLB resource handlers because the current procedural scene loads no external assets.
- Adds a four-way junction, connected cross street, zebra crossings, stop lines and kerbs.
- Adds roadside drainage covers, kiosk, bus-stop sign/bench, streetlights and junction bollards.
- Improves arcade handling with forward/reverse movement, progressive steering, coasting, braking and shoulder drag.
- Adds a PERF panel with FPS, frame interval, peak frame interval, CPU update+render, draw calls, estimated GPU resource memory, optional JS heap and GPU renderer.
- Uses a conservative 1.25 device-pixel-ratio cap for mobile.

## Run and verify
```bash
npm install
npm run verify
npm run build
npm run analyze:bundle
npm run test:browser
npm run dev
```

## Bundle budgets
The initial page entry must stay below 50 KiB raw / 20 KiB gzip. All JavaScript chunks together must stay below 1,400 KiB raw / 400 KiB gzip. The Vite per-chunk warning is calibrated at 1,200 KiB for this standalone PlayCanvas runtime; the separate CI budgets are the actual regression gates and report each emitted chunk. The game runtime is lazy-loaded, but still downloads before 3D gameplay starts.

## Performance interpretation
The PERF panel uses documented PlayCanvas AppStats getters. GPU resource memory estimates tracked graphics resources, not total physical GPU memory. JavaScript heap appears only where the browser exposes `performance.memory`; otherwise it displays N/A. GPU time is not shown unless supported and enabled.

For a real-phone baseline, open the game on the same Android device, keep it foregrounded, let shaders warm up, then drive the same route for at least 60 seconds. Record average FPS, frame time, peak frame time, draw calls and GPU resource memory. The headless Chromium check is functional QA, not Android performance certification.

## Controls
- W / Up: accelerate
- S / Down: brake and reverse after stopping
- A / Left, D / Right: steer
- Mobile: hold the on-screen controls
- PERF: show live performance telemetry

## Limitations
Handling remains arcade-style, not rigid-body/suspension physics. Junction boundaries use soft road-edge drag rather than physical collision meshes. Traffic AI, pedestrians, production vehicle models, audio and save systems are not included.

## Engine references
- https://developer.playcanvas.com/user-manual/engine/standalone/
- https://developer.playcanvas.com/user-manual/optimization/guidelines/
- https://developer.playcanvas.com/user-manual/optimization/runtime-devicepixelratio/
- https://developer.playcanvas.com/user-manual/optimization/app-stats.md
