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
