# Naija City — local and external game asset register

## Police patrol visuals — procedural local version
- Officer: generated from lightweight PlayCanvas primitives in `src/police-patrol-system.js`.
- Parked patrol car: generated from lightweight PlayCanvas primitives in `src/police-patrol-system.js`.
- External Grab3D officer and car GLBs are not requested at runtime. Their previous URLs failed cross-origin checks in browser testing, so they have been removed from the default game path.
- These are ambience-only visuals. The car is parked scenery, not a drivable vehicle; no enforcement or combat interactions are connected.
- The officer uses a procedural walking loop and a four-waypoint neighbourhood patrol.

## Mobile asset policy
- Keep patrol visuals lightweight and fully local so they work offline and do not depend on third-party CORS headers.
- Profile draw calls, memory and frame time on actual Android devices before increasing NPC counts.
- External character and vehicle downloads should only be reintroduced after their hosting origin provides a verified CORS-safe distribution path.

## Weapon and explosive content
This asset register intentionally excludes real weapon and explosive downloads. Naija City can use clearly fictional, non-functional props only where supplied and explicitly requested as static cosmetic assets.

## Fictional Lagos district asset library (2026-11-27)

A new source-tracked library is curated under `public/assets/fictional-lagos/`. The extracted models are unchanged, and source archives are retained outside `public/` in `asset-sources/fictional-lagos/originals/`.

- Kenney City Kit (Commercial), 41 GLB models, CC0 1.0: https://kenney.nl/assets/city-kit-commercial
- Kenney City Kit (Suburban), 40 GLB models, CC0 1.0: https://kenney.nl/assets/city-kit-suburban
- Kenney City Kit (Roads), 95 GLB models, CC0 1.0: https://kenney.nl/assets/city-kit-roads
- Kenney City Kit (Industrial), 37 GLB models, CC0 1.0: https://kenney.nl/assets/city-kit-industrial
- Kenney Nature Kit, 44 selected GLB models, CC0 1.0: https://kenney.nl/assets/nature-kit
- Innerscene Low-poly Nature — Palm tree, 1 GLB model, CC0 dedication: https://www.innerscene.com/tools/library/3d-parts/low-poly-nature-palm-tree-5e953f37

Total: 258 GLB files (10.97 MiB) plus four shared colour atlases (46.2 KB), 11.01 MiB combined. The library includes a machine-readable asset index and CSV rights registers with source URLs, license, credits, file hashes, sizes and triangle counts. Files have been extracted unchanged. This library is not automatically loaded in the playable world; future placement must stream by district and reuse instances.
