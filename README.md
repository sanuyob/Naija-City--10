# Naija City Drive — Stage 04
Phone-first Nigerian city driving prototype using PlayCanvas Engine, Vite and Ammo.js (Bullet).

## Stage 04 — real vehicle physics
- Replaces the player's arcade speed/heading integration with Bullet's `btRaycastVehicle`.
- Adds a dynamic chassis, four raycast wheels, suspension tuning, steering, rear-wheel engine force, braking and reverse.
- Adds six kinematic Bullet traffic colliders. Traffic still follows the Stage 03 signal-controlled routes, but the player vehicle now collides through the physics world instead of proximity-distance nudges.
- Keeps render geometry separate from simple collision geometry to limit physics cost on mobile.
- Loads Ammo on demand when the driving scene starts. The small HTML shell and initial application entry do not bundle the Ammo WebAssembly payload.
- Uses fixed-step Bullet simulation and keeps the existing 1.25 device-pixel-ratio cap and performance HUD.

## Physics implementation notes
PlayCanvas documents Ammo.js as an opt-in WebAssembly dependency weighing several hundred kilobytes. This project loads the official PlayCanvas-hosted module files only when the game scene starts. The player uses Bullet's `btRaycastVehicle` directly, as in the official PlayCanvas Vehicle Physics tutorial; the physics world is stepped at 1/60-second substeps. The visible vehicle uses a low-poly box chassis collider rather than its render meshes. The six traffic cars are kinematic bodies synchronized to their scripted AI paths, so they can physically interact with the player without turning every environment prop into a dynamic body.

## Run and verify
```bash
npm install
npm run verify
npm run build
npm run analyze:bundle
npm run test:browser
npm run dev
```

## Bundle and runtime loading
The initial page entry must stay below 50 KiB raw / 20 KiB gzip. All bundled JavaScript chunks together must stay below 1,400 KiB raw / 400 KiB gzip. Ammo is fetched separately from the official PlayCanvas module host at runtime, so it does not inflate the initial JavaScript bundle; it still adds a separate network download and WebAssembly memory/runtime cost when the driving scene starts. The browser must be online to load the hosted physics files.

## Performance interpretation and Android test
The PERF panel uses documented PlayCanvas AppStats getters. GPU resource memory estimates tracked graphics resources, not total physical GPU memory. JavaScript heap appears only where the browser exposes `performance.memory`; otherwise it displays N/A. The Ammo download and physics simulation introduce costs not represented by JavaScript bundle size alone.

The CI browser smoke test verifies that Ammo loads, the four-wheel physics vehicle initializes, the six traffic colliders are registered, the mobile controls accelerate the car, and the performance panel updates. Headless Chromium is functional QA, **not** Android performance certification.

A real-phone test is still required on the target Itel A90. After opening the game on the phone, allow the shaders and physics module to warm up, then drive for at least 60 seconds. Record:
- average FPS and frame time, including peak frame time;
- draw calls and GPU resource memory from PERF;
- whether steering, braking and suspension remain stable;
- loading time and any freezes, reloads or browser tab closures.

Do not increase traffic count or physics detail until this phone baseline is measured. If the device struggles, first reduce physics bodies, resolution and visual load rather than adding more simulation complexity.

## Controls
- W / Up: accelerate
- S / Down: brake; reverse after stopping
- A / Left, D / Right: steer
- Mobile: hold the on-screen controls
- PERF: show live performance telemetry

## Known limitations
- Stage 04 adds physical chassis/wheel/suspension simulation and player-to-traffic rigid-body contacts, but the traffic AI itself still follows simple scripted lanes and signal phases.
- The scene uses one simple ground collision surface; it does not yet model every kerb, drain, shop or roadside obstacle as a collider.
- No pedestrians, complex lane-changing traffic AI, audio, save system or production vehicle assets yet.
- Real Android FPS, memory and thermal behaviour have not been measured. Do not treat CI's headless browser as proof of phone performance.

## Official references
- [PlayCanvas Vehicle Physics tutorial](https://developer.playcanvas.com/tutorials/vehicle-physics/)
- [PlayCanvas Physics Basics — Ammo loading and fixed simulation steps](https://developer.playcanvas.com/user-manual/physics/physics-basics/)
- [PlayCanvas Calling Ammo.js Directly](https://developer.playcanvas.com/user-manual/physics/calling-ammo/)
- [PlayCanvas performance guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
- [PlayCanvas AppStats](https://developer.playcanvas.com/user-manual/optimization/app-stats/)
