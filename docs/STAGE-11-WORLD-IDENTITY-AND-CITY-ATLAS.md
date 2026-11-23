# Stage 11 — Naija City World Identity & City Atlas

## Purpose

One shared identity registry now feeds the city map and nearby building nameplates. A location has one identity, one category, one world position and an explicit enterability flag. This avoids the map promising an interior that does not exist.

## Current registry

The initial runtime registry contains **79 locations**:

- 48 Stage 08E Yaba building placements from `public/assets/stage-08e-manifest.json`
- 20 Stage 08N district buildings across Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands
- 5 Stage 08L enterable activity hubs
- 4 street-facing authored GIDI interiors from GIDI 02 REBUILD r106: Fresh Cut, Mide Tech Hub, Grand Hotel Lobby and Player Home
- 2 Yaba starter-area destinations: Street Kiosk and Bus Stop

Grand Hotel Guest Room 01 is intentionally not a separate street POI. It is accessed from the hotel lobby, so it must not create a duplicate map pin.

The registry currently marks **29 locations as enterable**: the 20 Stage 08N buildings, five activity hubs and four GIDI authored spaces. Stage 08E buildings remain exterior-only until an interior and usable entrance are authored.

## Player-facing features

### 1. Building identity

A nearby, camera-projected world nameplate displays the building name and category. It is anchored to the authored building position, hidden when outside the nearby visibility radius or outside the camera view, and capped to the eight closest candidates. The Stage 08E manifest has generic building identifiers, so those currently display clear building-type names (for example, Yaba Commercial 02) rather than invented shop brands.

These are lightweight HUD nameplates, not physical facade-mounted 3D sign meshes. Physical signboards with individual business branding remain a later art/asset pass.

### 2. Enterability

Enterable map pins have a clear outline and the location detail panel explicitly says ENTERABLE BUILDING. Exterior-only buildings are shown separately. The existing Stage 08N door interaction system continues to provide OPEN DOOR / CLOSE DOOR prompts. GIDI's authored open entrances receive an OPEN TO ENTER nameplate.

### 3. World map

The full-screen City Atlas includes:

- North-up map covering the known city bounds (X −120 to 4,200m; Z −3,900 to 480m), with a player arrow oriented to the current camera heading
- 79 location pins, category symbols and enterable/exterior distinction
- Category filters and text search
- Marker clustering in dense areas, with cluster-click zoom-in
- Drag-to-pan and wheel/touch zoom
- Location detail panel and direct-distance readout
- Selectable GPS destination and a dotted straight-line bearing on the atlas
- A compact GPS destination/distance readout in the HUD minimap

The selected GPS target is stored as a destination and shown on the map. The current line is a straight-line bearing, not a road-following turn-by-turn route. Road-following GPS requires a routable road graph and is not claimed in this stage.

### 4. Building categories

The category schema supports shops, homes, offices, hotels, activities, barbers, restaurants, banks, hospitals, public buildings, mechanics, pharmacies, fuel and transport. The map only displays actual registered locations. It does not invent restaurants, banks or hospitals where the world currently has none.

## Accuracy and mobile-performance decisions

- POI positions come from the authored Stage 08E manifest, Stage 08L activity definitions, Stage 08N building state and GIDI r106 interior bounds.
- No second world model or duplicate building GLB is loaded for the map.
- The map is a lightweight 2D canvas; it does not render a second 3D city scene.
- The 48 dense starter-district building pins are clustered at overview scale.
- Nearby labels are limited to eight candidates and projected from the existing camera.
- The current road artwork is a schematic atlas. District footprints and authored POI positions are grounded; local grid strokes are not a surveyed extraction of every road centreline. Do not use this atlas as a lane-accurate navigation map.

## Validation

- `node scripts/world-identity.test.mjs`: passed; validates all 48 manifest placements, the 20 district buildings, five activity hubs, four street-facing interiors, category assignments, enterability and unique IDs.
- `npm run verify`: passed.
- `npm run build`: passed. Existing Vite warning remains for the large game JavaScript chunk.
- Browser smoke on an 844×390 landscape viewport: 79 map records, 29 enterable, map open/close pause behavior, category filter, search, Fresh Cut selection, GPS destination selection and no browser errors.
- Nearby signage browser check: 79 DOM nameplates registered; the eight-candidate visibility cap is applied. These are headless browser checks, not physical acceptance on the user's Android device.

## Research and implementation references

- PlayCanvas, [Screens: screen-space and world-space UI](https://developer.playcanvas.com/user-manual/user-interface/screens/). Used to guide the distinction between HUD map UI and world-anchored identity labels.
- PlayCanvas, [UI input](https://developer.playcanvas.com/user-manual/user-interface/input/). Used to guide touch/pointer handling for map interaction.
- Phoebe O. Toups Dugas, [Making Maps Available for Play: Analyzing the Design of Game Cartography Interfaces](https://doi.org/10.1145/3336144), ACM Transactions on Computer-Human Interaction, 2019. Used for the distinction between read-only map interfaces and interactive game cartography, plus symbol, waypoint and filtering concepts.
- [GTA V Interactive Map](https://gtamap.io/gta-5-interactive-map/). A community-made reference (not an official Rockstar interface specification) for layer filtering, dense POI catalogs, map styles, zoom and pan.

Firecrawl and Exa were used to locate and cross-check the PlayCanvas documentation and game-map reference. SciSpace was used to surface and review the game-cartography literature. Scite was not part of this task.
