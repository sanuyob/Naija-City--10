# Stage 08N — GIDI Neighbourhoods, Interiors, Shops, NPCs and Traffic

## Goal and scope

Stage 08N extends the five Stage 08L community hubs into small, usable neighbourhood blocks. It is a district-content pass, not a claim that every building in the whole GIDI map has been completed. It adds four authored procedural buildings per district, interactive hinged doors, interior floors and furnishings, five purchase-enabled shops, local pedestrian routines and road-following traffic. The completed pass contains 20 enterable buildings, 20 doors, 20 NPCs, 20 local traffic vehicles, 585 counted detail meshes, 230 static wall/floor/step/path/fixture collision proxies and 20 separately toggled door colliders.

## Existing-building audit

The source audit found that a visible front door or storefront is not evidence of an enterable interior:

| Existing stage | What is present | Enterable? |
|---|---|---|
| Stage 08A / 08B Yaba building expansion | Procedural shop and home shells, glazing, shutters, doors, fascia and roof detail | No; the doors are facade detail |
| Stage 08D Yaba realism | Shopfront glass, door frames, security grilles and residential entry detailing | No; no interior floor/room collision or interaction door system |
| Stage 08I Ikeja expansion | Static residential/commercial blocks and street-facing doors | No; the stage documents these as static geometry |
| Stage 08L GIDI activities | Five open-roof community hubs with service counters and pickups | Yes; compact open-roof spaces, not hinged-door buildings |
| Stage 08N GIDI neighbourhoods | Twenty complete small buildings with floors, walls, furnishing, doorway and door collision | Yes; the player can enter and NPCs can route through the doorway |

**Current audited total: 25 enterable GIDI spaces** — five Stage 08L activity hubs plus twenty Stage 08N buildings. The existing Yaba and Ikeja facade sets are still not enterable. The separate sedan driver door is an animated vehicle feature, not a building interior.

## District building roster

| District | Commercial | Residential | Office / additional residential |
|---|---|---|---|
| Eko CBD | Obalende Print & Parcel | Broad Street Courtyard Flat | Finance House Annex; Court View Apartments |
| Victoria Island | Victoria Tailors & Textiles | Oniru Garden Apartment | Island Creative Offices; Atlantic Court Residences |
| Ikoyi | Ikoyi Marina Grocers | Park View Duplex | Awolowo Business Suites; Ikoyi Palm Court |
| Lekki | Lekki Fresh Mart | Chevron Garden Bungalow | Coastal Co-Work Studio; Lekki Palm Villas |
| Ekiti Highlands | Ado Highlands Farm Store | Efon Ridge Family Home | Highlands Cooperative Office; Ridge View Courtyard Homes |

Each building has an interior floor, collision-backed wall sections, a split front wall and lintel around a 1.9m doorway, an animated door panel, a roof slab that hides while the player is inside, and simple role-appropriate furniture. A front step and short collision-backed pedestrian entry path lead out from the doorway. Shops have a service counter and stock props; homes have living/kitchen/bed furnishings; offices have reception and meeting furniture.

## Door behaviour

- The interaction registry exposes `OPEN / CLOSE DOOR` when the player is within range.
- The door panel rotates around a local pivot to an approximately 100-degree open angle.
- Opening disables the doorway's static collision proxy; closing restores it.
- NPCs approaching a doorway trigger automatic opening; the door closes after the NPC clears the entrance.
- Roof slabs are hidden when the player enters the corresponding building and restored on exit.
- Door wall/floor/step/path collision is activated only while the district is within the 360m active radius.

The visual hinge is a lightweight pivot animation with a paired collision proxy, not a Bullet hinge constraint. PlayCanvas documents the Joint component as alpha and requires rigid bodies/collision shapes on both constrained entities; this implementation avoids adding two physics bodies and an alpha joint for each of twenty doors. It still tests the essential gameplay behaviour: the doorway blocks when closed and clears when open.

## Shops and persistent progression

Five shops accept in-game purchases:

| Shop | Product | Price |
|---|---|---:|
| Obalende Print & Parcel | Print pack | ₦650 |
| Victoria Tailors & Textiles | Fabric kit | ₦1,200 |
| Ikoyi Marina Grocers | Market basket | ₦900 |
| Lekki Fresh Mart | Fresh pack | ₦750 |
| Ado Highlands Farm Store | Farm crate | ₦1,100 |

The player starts with ₦5,000. Completing each Stage 08L district activity awards ₦500 once, for a maximum of ₦2,500 across the five activities. Purchases subtract from the wallet and add one item to the inventory. The HUD displays the current wallet and bag count, and the Inventory panel lists the purchased products and remaining cash. The versioned `naija-city-progress-v1` local save stores wallet, inventory, pickup progress, activity completion and claimed rewards. Storage errors are caught and exposed through the economy state; if browser storage is unavailable, progress remains session-only. This is local browser persistence, not cloud sync.

## Pedestrian population

Twenty district NPCs are placed — four per district — with simple procedural visual bodies and short interior/door/plaza routes. Shopkeepers and office workers have different simulated working hours from residents. NPCs only move when their district is active. They can open and clear the same doors used by the player.

These are lightweight route-following NPCs, not a dense animated crowd system: they do not yet have full rigged walk cycles, dialogue trees, individual schedules saved to disk, complex avoidance, or navmesh pathfinding around every prop. Existing Yaba/Ikeja pedestrians remain a separate system.

## Traffic behaviour

Stage 08N adds twenty local district vehicles (four per district) following surveyed road-collider segments. They maintain lane offsets, follow/reverse at segment ends, reduce speed behind another vehicle and yield to nearby pedestrians. The existing eight Yaba/Ikeja traffic actors now use a shared traffic controller for red-light stopping, same-lane following, pedestrian yielding, route wrapping and speed smoothing.

This is foundational traffic AI, not yet a complete city-wide traffic network. It does not implement lane changes, overtaking, parking, full road-graph A* routing, multi-junction reservation, gridlock recovery, public transport schedules or emergency-vehicle priority. District cars run on short surveyed road segments rather than every road in the GIDI world.

## Streaming and mobile considerations

- Five static batch groups separate the districts.
- A district's render entities, NPC updates, traffic updates and 230 wall/floor/step/path collision proxies are enabled only inside a 360m radius.
- Door colliders are separately toggled so an open doorway is passable.
- The implementation keeps the authored district entities allocated but disables them when far away; it does not yet destroy/recreate the entire district on unload. The runtime smoke generated 21–30 static batches for the active district.
- No real Itel A90 device acceptance or thermal/battery profiling was performed. The headless SwiftShader smoke profile reported about 143 average draw calls and an engine-tracked GPU-resource estimate near 288 MiB, but ran at only about 3.2 estimated FPS on a 2-core software-rendered browser; those figures are test-harness measurements, not phone performance claims. The browser smoke test is not a substitute for a physical Android test.

## Validation

The Stage 08N unit test verifies placement, unique door IDs, building counts, dynamic collision toggles, shop transactions, NPC route movement and traffic yielding. The browser smoke test loads each of the five GIDI districts and verifies:

1. the closed door collider is hit;
2. the player interaction opens the door;
3. the doorway ray is clear after opening;
4. the shop counter completes a purchase;
5. the door closes again;
6. the interior floor collider is present; and
7. the interior roof hides while the player is inside.

The economy test reconstructs the store from the same storage adapter to verify that wallet, inventory, pickup state and one-time activity rewards survive a reload.

## Reference guidance consulted

- [PlayCanvas Physics](https://developer.playcanvas.com/user-manual/physics/) — Bullet/Ammo-backed rigid bodies, collision shapes, triggers and physics concepts.
- [PlayCanvas Joint component](https://developer.playcanvas.com/user-manual/editor/scenes/components/joint/) — hinge support, rigid-body requirements and alpha status.
- [PlayCanvas Ray Casting](https://developer.playcanvas.com/user-manual/physics/ray-casting/) — collision-ray queries used in the doorway smoke test.
- [DOTS Traffic City overview](https://assetstore.unity.com/packages/templates/systems/dots-traffic-city-220203) — cross-engine reference for lane-following, traffic speed control, pedestrian avoidance and distance-based culling; its Unity APIs are not used in this PlayCanvas project.

Scite literature search was attempted but the connected Scite service rejected access because the account does not have a paid plan or active trial. No Scite paper findings are claimed in this stage.
