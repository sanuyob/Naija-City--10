# Naija City — external game asset register

## Grab3D: Police Officer
- Model page: https://grab3d.com/models/characters/police-officer/
- Runtime file: https://grab3d.com/dl/police-officer-rigged/police-officer-rigged.glb
- Format: GLB, rigged variant
- Published animation clips: Walk and Run
- License: CC0 1.0 (public domain; no attribution required)
- Runtime policy: streamed only on the standard-memory profile; the low-memory profile uses a lightweight procedural placeholder instead.
- Important: the model is a generic stylised police officer, not verified as an authentic Nigeria Police Force uniform.

## Grab3D: Police Car
- Model page: https://grab3d.com/models/vehicles/police-car/
- Runtime file: https://grab3d.com/dl/police-car/police-car.glb
- Format: GLB
- Published size: 1.4 MB
- Published geometry: 34,797 triangles
- License: CC0 1.0 (public domain; no attribution required)
- Runtime policy: streamed as a parked visual vehicle; it is not yet connected to the driving physics system.

## Mobile asset policy
- Keep the low-memory character fallback procedural and lightweight.
- Do not load the high-polygon police character on the low-memory profile.
- Profile texture memory, draw calls, animation cost and frame time on actual Android devices before increasing NPC counts.
- Keep external model loading optional and fail gracefully when the host blocks cross-origin downloads or the asset host is unavailable.

## Weapon and explosive content
This asset register intentionally excludes real weapon and explosive downloads. Naija City can use clearly fictional, non-functional props and abstract visual effects instead.
