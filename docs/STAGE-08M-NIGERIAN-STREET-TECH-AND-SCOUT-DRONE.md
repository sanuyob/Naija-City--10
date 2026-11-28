# Stage 08M — Nigerian Street Tech & Scout Drone

## Scope

Stage 08M adds a reusable Nigerian street-technology layer to the existing six-area Naija City map. It is a separate PlayCanvas stage and does not replace or modify the Stage 08L district blockouts.

## World dressing

The stage creates 23 assemblies and 177 render parts. 149 static parts use a shared batch group; 28 moving CCTV-head parts are deliberately excluded from static batching and tagged for runtime diagnostics. Props are distributed across Yaba, Alimosho, Lekki, Victoria Island, Eko Atlantic and the Ekiti uplands.

The prop set includes:

- Seven motorised street-mounted CCTV stations: two in Yaba and one each in Alimosho, Lekki, Victoria Island, Eko Atlantic and the Ekiti uplands.
- Two telecom distribution cabinets.
- A neighbourhood generator set and two prepaid electricity meters.
- Three solar streetlights.
- A smart estate access barrier and a digital street billboard.
- A public Wi-Fi mast, two EV charging stations, a compound video intercom, a roadside POS terminal and a transformer enclosure.

Twelve devices register with the existing world-interaction system: five utility/access devices plus all seven CCTV stations. Cabinet and charger interactions update their status displays; the smart gate raises and lowers its barrier arm. The Yaba telecom cabinet also toggles its local CCTV network into and out of maintenance mode. When a district network is offline, its cameras cannot be opened; an active feed is closed cleanly and player controls are restored.

## Remote city surveillance

The CCTV stations are connected to a fictional in-game surveillance service. Interacting at a station opens the actual PlayCanvas scene camera at the CCTV lens, locks player movement while the feed is active, and provides a remote console with:

- Live scene view, camera name/number, district, and a signal-quality indicator.
- Motorised pan and tilt that rotate the corresponding 3D camera-head pivot.
- Five steps of optical-style zoom implemented through the game camera field of view.
- Previous/next controls to switch between online stations.
- A scanner that identifies authored locations only when they are inside the camera's viewing cone and range and have a clear line of sight.
- A close-feed action that returns control and the normal player camera.

The scanner can add discovered locations to the city atlas and save discovery IDs locally and rehydrate them into the atlas on the next session, so already known locations remain visible and are not repeatedly awarded. CCTV and drone scanning have separate cooldowns. The same scanner works from the deployed drone using its position and heading. The map catalog currently contains seven authored discovery targets; additional district POIs can be added without changing the scan system.

The remote view is a live camera in the same scene, not a prerecorded clip or a static screenshot. This is a fictional game system; it does not connect to real cameras or real networks.

## Scout drone

The field-equipment inventory now includes one reusable Scout Drone in a fourth quick slot. Deploying it:

- Spawns a compact four-rotor camera drone.
- Switches the game camera to a drone-mounted forward view.
- Freezes player movement while the remote camera is active.
- Uses a dedicated mobile flight stick and press-and-hold UP/DOWN altitude controls.
- Enforces a 55-metre horizontal operating radius and an altitude range of 2.8–18 metres above the launch point.
- Drains battery during flight and supports manual recall; depleted batteries trigger automatic recall.

The flight model is a lightweight arcade controller. It is not a physics-simulated drone, and it does not yet include camera-network takeover, obstacle avoidance, payloads, thermal vision or remote multiplayer control.

## Runtime and verification

- `npm run test:field-equipment` — passed.
- `node scripts/stage-08m-street-tech.test.mjs` — passed.
- `node scripts/city-surveillance-system.test.mjs` — passed.
- `npm run test:stage-08m:runtime` — passed in an 844×390 Chromium / SwiftShader touch-profile viewport.
- `npm run verify` — passed.
- `npm run build` — passed.

The runtime smoke verified all seven CCTV stations, live feed entry/exit, Yaba cabinet network shutdown/restoration, camera pan/tilt/zoom and switching, line-of-sight discovery appearing on the map, drone deployment/flight/altitude, the shared discovery scanner, player-input isolation and recall.

This is software-rendered browser validation only. No claim is made about actual Android frame rate, thermal behaviour or battery drain. Those decisions remain deferred until the project is tested on the user's physical phone. No merge or deployment is included in this stage.


## Remote district life inside CCTV feeds

The fixed CCTV network now temporarily activates the streamed district root being viewed, including a small district-specific ambient population and one moving local vehicle. Alimosho, Lekki, Victoria Island, Eko Atlantic and Ekiti each have role/outfit variants (e.g. market trader and commuter; estate security and resident; office and hospitality workers; waterfront visitor and infrastructure technician; farmer and local trader). The entities are real PlayCanvas scene objects under their district roots, not screen-space overlays. Only the selected remote district simulates; closing the feed deactivates its activity and restores proximity-based district streaming. Low-memory devices use one pedestrian plus one vehicle per remote district; higher-memory devices use two pedestrians plus one vehicle.

Validation: `node scripts/district-activity-system.test.mjs`, `node scripts/city-surveillance-system.test.mjs`, `node scripts/stage-08l-district-rollout.test.mjs`, and `npm run test:stage-08m:runtime`. The browser smoke checks remote Lekki movement and all five remote district activations. It uses Chromium/SwiftShader; it is not a physical Android performance test.

NPC research and asset shortlist: see [NAIJA-CITY-NPC-CULTURE-AND-POPULATION-REFERENCE.md](./NAIJA-CITY-NPC-CULTURE-AND-POPULATION-REFERENCE.md). No external character assets have been downloaded or admitted yet.
