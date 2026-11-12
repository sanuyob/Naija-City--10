# Naija City Drive

A phone-first Nigerian city driving game prototype built with the open-source PlayCanvas Engine and Vite.

The project starts with a compact Lagos-inspired street, one player-controlled car, a third-person chase camera, keyboard input and touch controls. The goal of Stage 01 is to establish a small, lightweight playable foundation before expanding the city.

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Controls

- W / Up: accelerate
- S / Down: brake
- A / Left: steer left
- D / Right: steer right
- On mobile: hold the on-screen steering, brake and GO buttons

## Stage 01 contents

- Procedural starter road, lane markings and roadside shop blocks
- Primitive player car with a third-person chase camera
- Acceleration, braking and steering
- Keyboard and touch input
- Lightweight WebGL 2 scene with no external art assets

## Known limitations

This is an early prototype, not a finished driving simulator. Vehicle movement is kinematic rather than full suspension/vehicle physics. The street is blockout geometry. Traffic AI, pedestrians, detailed Nigerian props, sound, save systems and device performance qualification are not included yet.

## Next milestone

Improve vehicle handling and collisions, then add a compact street junction and carefully budgeted Nigerian street props. Test the browser build and Android touch experience before expanding the map.

## Engine references

- https://developer.playcanvas.com/user-manual/engine/
- https://developer.playcanvas.com/user-manual/engine/standalone/
