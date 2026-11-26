# Stage 11 — World Identity and City Atlas

## Scope

The live city atlas now covers the retained Yaba starter area and the connected Ikeja neighbourhood extension. The GIDI 02 REBUILD region, its streamed cells, district buildings, authored interiors and map pins have been removed.

## Current location sources

- The 48 retained Stage 08E building placements in the compact Yaba/Ikeja building manifest.
- The original Yaba street kiosk and bus-stop locations.
- Local Yaba and Ikeja district labels based on the player's current position.

Stage 08E buildings are currently exterior-only. The map does not claim that these structures have enterable interiors.

## Map interaction

The atlas remains a schematic map. It supports pan/zoom, search, category filters, location inspection, player-position indication and GPS waypoint selection. Enterable status is supplied by the location record; no removed-world door or interior markers are registered.

## Validation

`npm run verify` includes the world-identity regression test. Browser verification confirms the live map loads from the compact asset set. Physical Android validation remains necessary for touch, performance and readability acceptance.
