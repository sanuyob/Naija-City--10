# Character Stage 01A — Animation Runtime Foundation

**Status:** implementation in progress  
**Branch:** character-stage-01a-animation-runtime  
**Parent:** main  
**Runtime:** PlayCanvas 2.24

## Objective

Prepare the existing PlayCanvas application to host the approved rigged hero animation system without changing current player movement or replacing the current placeholder body before a validated hero asset exists.

## Repository audit

- src/game.js creates the PlayCanvas application and registers component systems.
- src/third-person-controller.js constructs the current player from primitive render entities and animates limb pivots procedurally.
- src/asset-loader.js loads GLB container assets and instantiates render entities.
- public/assets/manifest.json has only diagnostic assets; no rigged hero or animation clips are available.

## Changes in this stage

1. Register pc.AnimComponentSystem with the application component systems.
2. Add a source-level verification assertion so the animation runtime registration cannot be accidentally removed.
3. Keep the current placeholder controller, movement, collision resolver, camera, stamina, jump and mobile controls unchanged.

## Explicit non-goals

- No fabricated or third-party hero model.
- No placeholder skeletal rig.
- No unverified animation-only GLB binding.
- No edits to the movement controller.
- No parkour, equipment or teammate gameplay in this stage.

## Acceptance criteria

- The application build and project verification pass.
- Existing browser smoke tests pass.
- Existing player controls and world loading remain unchanged.
- No claim of character animation is made until a validated GLB and clip binding test exist.

## Next stage

Character Stage 01B — Hero Appearance, Mesh, Materials and Rig. Requires an original hero asset with consistent scale, orientation, skeleton hierarchy, skin weights, facial controls and attachment sockets. After it exists, validate it with glTF Validator and a PlayCanvas test scene before connecting it to the live controller.
