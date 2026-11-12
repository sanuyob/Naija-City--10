# Naija City Drive — Stage 01 foundation

A phone-first Nigerian city driving game prototype using the open-source **PlayCanvas Engine** and Vite.

## Stage 01 scope

- Compact Lagos-inspired street blockout with roadside shop buildings
- Primitive player car and third-person chase camera
- Acceleration, braking and steering
- Keyboard and touch controls
- Arcade road-edge boundary guard
- Mobile-friendly HUD and capped device pixel ratio

## Run locally

Requires Node.js 22 and npm.

```bash
npm install
npm run dev
```

For checks and a production build:

```bash
npm run verify
npm run build
npm run test:browser
npm run preview
```

## Controls

- W / Up: accelerate
- S / Down: brake
- A / Left: steer left
- D / Right: steer right
- Mobile: hold the on-screen steering, brake and GO buttons

## Verification

GitHub Actions checks JavaScript syntax and project wiring, builds the production bundle, then launches it in headless Chromium at a 390 × 844 mobile viewport. The browser smoke test confirms WebGL 2 startup and that holding GO increases the speed readout.

This automated mobile-sized browser test is not a substitute for testing on a physical Android phone or measuring real-device frame rate and memory.

## Build note

The current production JavaScript bundle is approximately 1.23 MB minified (327 KB gzip). Vite reports a chunk-size warning. This is acceptable for the first prototype build but should be profiled and optimized before the district grows.

## Known limitations

This is an early prototype, not a finished driving simulator. Vehicle movement is kinematic rather than full suspension or rigid-body physics. The street uses procedural blockout geometry. Traffic AI, pedestrians, detailed Nigerian props, audio, save systems and measured Android performance qualification are not included yet.

## Next milestone

Improve vehicle handling and proper collisions, then add a compact street junction and carefully budgeted Nigerian street props.

## Engine references

- https://developer.playcanvas.com/user-manual/engine/
- https://developer.playcanvas.com/user-manual/engine/standalone/
