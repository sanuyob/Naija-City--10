# Naija City Drive — Stage 03
Phone-first Nigerian city driving prototype using PlayCanvas Engine and Vite.

## Stage 03 — traffic and collision update
- Adds six low-poly AI traffic vehicles on main-road and cross-street lanes.
- Adds a deterministic two-phase traffic signal. Main-road and cross-street traffic yield at the junction on red.
- Adds player-to-traffic proximity collision response that slows the player and nudges the car away.
- Adds live traffic status text and exposes Stage 03 readiness for automated testing.
- Keeps the existing mobile controls, performance panel and conservative 1.25 device-pixel-ratio cap.

## Important physics decision
This stage uses lightweight scripted/kinematic traffic and proximity collision checks. It does **not** claim to deliver full rigid-body vehicle physics or suspension. Official PlayCanvas documentation says physics requires the Ammo.js WebAssembly module, which adds several hundred kilobytes and must be loaded before physics components work. Given the project's current mobile bundle/performance constraints, adding Ammo blindly would be a poor trade. The next physics upgrade should be an optional, lazy-loaded Ammo module after the target Android baseline is measured. The official RaycastVehicle tutorial is the reference for that later upgrade.

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
The initial page entry must stay below 50 KiB raw / 20 KiB gzip. All JavaScript chunks together must stay below 1,400 KiB raw / 400 KiB gzip. The PlayCanvas runtime is lazy-loaded after the small page shell. The current chunk warning threshold is calibrated at 1,200 KiB; the separate CI budgets remain the regression gates.

## Performance interpretation
The PERF panel uses documented PlayCanvas AppStats getters. GPU resource memory estimates tracked graphics resources, not total physical GPU memory. JavaScript heap appears only where the browser exposes `performance.memory`; otherwise it displays N/A.

For a real-phone baseline, open the game on the target Android device, allow shaders to warm up, then drive for at least 60 seconds. Record average FPS, frame time, peak frame time, draw calls and GPU resource memory. Headless Chromium is functional QA, not Android performance certification.

## Controls
- W / Up: accelerate
- S / Down: brake and reverse after stopping
- A / Left, D / Right: steer
- Mobile: hold the on-screen controls
- PERF: show live performance telemetry

## Known limitations
- No full rigid-body vehicle physics, suspension, wheel-ground raycasts or physically simulated tire grip yet.
- Traffic uses six scripted vehicles on fixed routes, not complex lane-changing AI.
- Player collision uses distance-based contact checks, not full physical collision meshes.
- No pedestrian simulation, licensed production vehicle models, audio or save system.

## Engine references
- https://developer.playcanvas.com/user-manual/physics/physics-basics/
- https://developer.playcanvas.com/user-manual/physics/rigid-bodies/
- https://developer.playcanvas.com/tutorials/vehicle-physics/
- https://developer.playcanvas.com/user-manual/optimization/guidelines/
- https://developer.playcanvas.com/user-manual/optimization/app-stats/
