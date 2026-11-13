# Character Hero 01 — Native PlayCanvas Visual Prototype

**Implementation:** PR #17  
**Runtime:** PlayCanvas Engine 2.24  
**Source:** `src/third-person-controller.js`  
**Status:** implemented in branch; automated verification pending

## Purpose

Provide a more recognizable original Nigerian city-resident player character using only geometry created directly by the PlayCanvas runtime. This work stays inside the existing game code and preserves the current controller.

## Visual direction

- Fictional young Nigerian male city resident with deep warm-brown skin and compact low-taper hairstyle.
- Dark teal T-shirt under an open sand/olive overshirt.
- Charcoal trousers and low-top dark sneakers with light soles.
- Crossbody sling bag and restrained clothing details.
- Face landmarks, hair volume, layered clothing and limb separation are designed to remain readable in the third-person mobile camera.

## Technical construction

The character is assembled from PlayCanvas primitive render entities and `StandardMaterial` colour values. Torso, arms and legs use entity pivots so the existing procedural gait can continue to animate the limbs. No external character generator, downloaded model or other 3D application was used.

## What this prototype is not

- It is not a sculpted or retopologized production character mesh.
- It has no UV-authored texture maps, PBR texture set, skin weights or reusable humanoid bone hierarchy.
- Its gait remains entity-pivot procedural animation; it is not a skeletal animation clip system.
- No animation-only GLB binding, facial control rig or equipment socket has been validated.

## Acceptance gates

1. Repository source verification and production build pass.
2. Browser smoke test confirms the game still launches and the character remains visible.
3. Visually inspect front, rear and side views in the PlayCanvas scene.
4. Profile draw calls, frame time and memory on the target Android device.
5. Keep production Character 01B open until a real hero mesh, UVs, skinning and skeleton are available and validated.

The prototype is a useful in-engine appearance step, not a substitute for the production character asset stage.
