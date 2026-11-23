# Stage 08L — GIDI district activity hubs and enterable interiors

## Scope delivered

Adds five small, open-roofed, enterable community buildings at surveyed GIDI land tiles in Eko CBD, Victoria Island, Ikoyi, Lekki and Ekiti Highlands. Each interior has a floor, three full side/rear walls, a front wall split around a 1.8m doorway, lintel, perimeter canopy, counter, shelves, service window, entrance step, a concrete footpath spur to the nearby road, entry bollards and district-specific service props. Interiors use compact box geometry and five separate local static batch groups to preserve spatial culling.

Each district has one three-pickup activity:

| District | Interior | Activity | Pickups |
|---|---|---|---:|
| Eko CBD | Eko Parcel Depot | Parcel Dispatch | 3 parcels |
| Victoria Island | Island Art Room | Gallery Trail | 3 artwork cards |
| Ikoyi | Ikoyi Marina Shed | Marina Supply | 3 supply crates |
| Lekki | Lekki Coast Hut | Beach Clean-up | 3 clean-up bags |
| Ekiti Highlands | Ekiti Produce Shed | Farm Produce Run | 3 produce baskets |

Players collect the three objects using the existing interaction control, then check in at the entrance counter to complete the activity. Pickups disable after collection; completion is tracked for the current runtime session. This is not yet persistent save data, inventory/economy integration, timed mission scoring or a reward system.

## Placement and physics

All five hubs were placed on existing 100m GIDI terrain collision tiles. Their floor elevations match the terrain collider top after applying the manifest worldYOffset. A placement audit checked each hub against the streamed manifest: all have at least 9m clearance from road collision rectangles and 10m from existing building collision bounds. The module adds 40 static collision proxies for the walls, lintels, counter and shelves to player, pedestrian-navigation, and vehicle collision systems. Five spatially bounded static batch groups keep the hubs separate.

## Validation

- Unit/placement test: 5 interiors, 5 activities, 15 pickup targets, 40 collision proxies, 165 detail meshes, 5 batch groups.
- Browser runtime smoke: all five GIDI cells loaded; each hub's floor raycast hit grass at the surveyed height; all 15 pickups and 5 counters interacted successfully; all five activities completed; 20 interactions, 0 rejected interactions and no browser errors.
- Visual captures saved to `/tmp/naija-city-visual-audit/stage-08l-activities/` in the cloud sandbox.

## Not claimed complete

This pass adds five local activity interiors, not full district build-out. The wider districts still need their remaining unique residential/commercial buildings, larger enterable interiors, district-specific pedestrian populations and schedules, complete traffic AI at signals/junctions, and persistent activity rewards/save state. Yaba and Ikeja retain their earlier district-specific environments and street-life work.
