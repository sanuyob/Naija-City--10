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

For a production build:

```bash
npm run verify
npm run build
npm run preview
```

## Controls

- W / Up: accelerate
- S / Down: brake
- A / Left: steer left
- D / Right: steer right
- Mobile: hold the on-screen steering, brake and GO buttons

## Verification

GitHub Actions runs source checks and a Vite production build on pushes to the Stage 01 branch and on pull requests into `main`. A successful production build verifies bundling; it does not replace a real Android browser playtest.

## Known limitations

This is an early prototype, not a finished driving simulator. Vehicle movement is kinematic rather than full suspension or rigid-body physics. The street uses procedural blockout geometry. Traffic AI, pedestrians, detailed Nigerian props, audio, save systems and measured Android performance qualification are not included yet.

## Next milestone

After Stage 01 passes CI and a browser smoke test, improve vehicle handling and collisions, then add a compact street junction and carefully budgeted Nigerian street props.

## Engine references

- https://developer.playcanvas.com/user-manual/engine/
- https://developer.playcanvas.com/user-manual/engine/standalone/
