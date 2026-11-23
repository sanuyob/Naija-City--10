// Stage 08K: finish the street-level road language across the existing GIDI
// arterial network. The source already contains a connected 3,049-tile road
// collision graph, 4 named bridge decks and the main CBD/lagoon road grid.
// This stage therefore adds verified approach safety, junction markings,
// drainage and district wayfinding instead of laying duplicate road slabs.
export function createStage08KGidiDistrictRoadsAndBridges({ app, box, material }) {
  const group = app.batcher?.addGroup('stage08k-gidi-district-road-details', false, 256);
  const mats = {
    asphalt: material([0.13, 0.14, 0.145]),
    concrete: material([0.46, 0.45, 0.41]),
    curb: material([0.63, 0.61, 0.54]),
    drain: material([0.055, 0.065, 0.065]),
    metal: material([0.22, 0.25, 0.26], 0.42),
    galvanized: material([0.45, 0.48, 0.47], 0.48),
    white: material([0.9, 0.9, 0.86]),
    yellow: material([0.91, 0.71, 0.13]),
    green: material([0.07, 0.30, 0.18]),
    blue: material([0.07, 0.24, 0.42]),
    red: material([0.66, 0.15, 0.1]),
    dark: material([0.055, 0.065, 0.07]),
    wood: material([0.35, 0.24, 0.15]),
    plastic: material([0.16, 0.29, 0.27])
  };
  const collisionProxies = [];
  const junctions = [];
  const bridgeTreatments = [];
  const districtSigns = [];
  let detailMeshes = 0;
  let crosswalkStripes = 0;
  let tactilePads = 0;
  let bridgeReflectors = 0;
  let drainGrates = 0;
  let streetlights = 0;
  let utilityCabinets = 0;
  let wayfindingSigns = 0;

  function detail(name, position, scale, mat, rotation = null, solid = false) {
    const entity = box('stage08k-' + name, position, scale, mat);
    entity.tags.add('stage08k-gidi-road-detail');
    if (group && entity.render) entity.render.batchGroupId = group.id;
    if (rotation) entity.setEulerAngles(...rotation);
    detailMeshes++;
    if (solid) {
      const p = entity.getPosition(), s = entity.getLocalScale(), r = entity.getEulerAngles();
      collisionProxies.push({
        id: entity.name + '-' + entity.getGuid(),
        position: [p.x, p.y, p.z],
        halfExtents: [Math.abs(s.x) / 2, Math.abs(s.y) / 2, Math.abs(s.z) / 2],
        rotationY: r.y,
        rotationX: r.x,
        rotationZ: r.z,
        source: 'stage08k-gidi-road-details'
      });
    }
    return entity;
  }

  function wayfinding(id, label, position, yaw = 0, tone = 'green') {
    const board = tone === 'blue' ? mats.blue : mats.green;
    const [x, y, z] = position;
    const poleX = yaw === 90 ? 0.14 : 0.14;
    detail(id + '-left-post', [x - 1.15, y + 1.48, z], [poleX, 2.96, 0.14], mats.galvanized, [0, yaw, 0], true);
    detail(id + '-right-post', [x + 1.15, y + 1.48, z], [poleX, 2.96, 0.14], mats.galvanized, [0, yaw, 0], true);
    detail(id + '-panel', [x, y + 2.57, z], [2.6, 0.92, 0.16], board, [0, yaw, 0]);
    detail(id + '-face', [x, y + 2.57, z - 0.09], [2.35, 0.68, 0.035], mats.white, [0, yaw, 0]);
    detail(id + '-direction-mark', [x, y + 2.56, z - 0.115], [0.56, 0.1, 0.035], tone === 'blue' ? mats.yellow : mats.white, [0, yaw, 0]);
    districtSigns.push({ id, label, position: [x, y, z] });
    wayfindingSigns++;
  }

  function warningBoard(id, position, yaw = 0) {
    const [x, y, z] = position;
    detail(id + '-post', [x, y + 1.15, z], [0.13, 2.3, 0.13], mats.galvanized, [0, yaw, 0], true);
    detail(id + '-board', [x, y + 2.15, z], [1.15, 0.74, 0.14], mats.yellow, [0, yaw, 0]);
    detail(id + '-stripe-a', [x, y + 2.15, z - 0.08], [0.82, 0.08, 0.025], mats.dark, [0, yaw, 0]);
    detail(id + '-stripe-b', [x, y + 1.95, z - 0.08], [0.64, 0.06, 0.025], mats.red, [0, yaw, 0]);
  }

  function reflector(id, position) {
    detail(id, position, [0.18, 0.82, 0.18], mats.yellow, null, true);
    bridgeReflectors++;
  }

  function bridgeApproach(bridgeId, point, outsideOffset, axis = 'x') {
    const [x, z] = point;
    const off = outsideOffset;
    if (axis === 'x') {
      for (const side of [-1, 1]) {
        const px = x + side * off;
        warningBoard(`${bridgeId}-warning-${side}`, [px, 0.25, z], 90);
        reflector(`${bridgeId}-reflector-${side}`, [px - side * 1.1, 0.68, z + 2.0]);
        reflector(`${bridgeId}-reflector-${side}-outer`, [px - side * 1.1, 0.68, z - 2.0]);
      }
    } else {
      for (const side of [-1, 1]) {
        const pz = z + side * off;
        warningBoard(`${bridgeId}-warning-${side}`, [x, 0.25, pz], 0);
        reflector(`${bridgeId}-reflector-${side}`, [x + 2.0, 0.68, pz - side * 1.1]);
        reflector(`${bridgeId}-reflector-${side}-outer`, [x - 2.0, 0.68, pz - side * 1.1]);
      }
    }
  }

  // Bridge A: measured deck is 28m wide, 1.2km long, from z=-700 to -1900.
  // End markers and ramp approach warnings sit outside the 14m deck edge.
  bridgeApproach('bridge-a-north', [705.4, -700], 22, 'x');
  bridgeApproach('bridge-a-south', [705.4, -1900], 22, 'x');
  bridgeApproach('bridge-a-aux-ramp-1', [705.4, -1116.5], 22, 'x');
  bridgeApproach('bridge-a-aux-ramp-2', [705.4, -1569.5], 22, 'x');
  bridgeTreatments.push({ id: 'B01', label: 'Yaba Spine Bridge', deckBounds: { x: [686, 714], z: [-1900, -700] }, treatment: 'approach warnings, reflective markers and ramp-end delineation' });

  // Bridge B: the deck spans the canal at x≈1306,z≈-724. The pair of ramps
  // are measured at x≈1246 and 1309,z=-900; do not place signs on the deck.
  bridgeApproach('bridge-b-west-approach', [1246, -900], 21, 'x');
  bridgeApproach('bridge-b-east-approach', [1309, -900], 21, 'x');
  bridgeTreatments.push({ id: 'B02', label: 'Eko Canal Bridge', deckBounds: { x: [1159, 1453], z: [-859, -590] }, treatment: 'ramp warnings and edge delineation' });

  // Bridge C: short canal crossing with two short ramps on the z-axis.
  bridgeApproach('bridge-c-north-approach', [1450, -972], 18, 'z');
  bridgeApproach('bridge-c-south-approach', [1450, -1038], 18, 'z');
  bridgeTreatments.push({ id: 'B03', label: 'Canal Link Bridge', deckBounds: { x: [1445, 1455], z: [-1028, -982] }, treatment: 'low-clearance warnings and ramp reflectors' });

  // Bridge D: Lekki-side connector. Its 22m deck and two measured end ramps
  // receive the same safety language without obscuring the driveline.
  bridgeApproach('bridge-d-north-approach', [2982.5, -1798], 18, 'x');
  bridgeApproach('bridge-d-south-approach', [2982.5, -1977], 18, 'x');
  bridgeTreatments.push({ id: 'B04', label: 'Lekki Connector Bridge', deckBounds: { x: [2971, 2994], z: [-1964, -1816] }, treatment: 'approach warnings and ramp reflectors' });

  // Five high-value road junctions on the existing primary grid. Coordinates
  // come from the named ROAD_SURFACE primary EW/NS corridor centre lines.
  function junction(id, x, z, roadWidth = 22) {
    const stripes = 9;
    for (let i = -4; i <= 4; i++) {
      detail(id + '-crosswalk-north-south-' + (i + 4), [x, 0.30, z + i * 1.18], [roadWidth, 0.035, 0.54], mats.white);
      detail(id + '-crosswalk-east-west-' + (i + 4), [x + i * 1.18, 0.30, z], [0.54, 0.035, roadWidth], mats.white);
      crosswalkStripes += 2;
    }
    detail(id + '-stop-line-north', [x, 0.31, z - roadWidth * 0.72], [roadWidth + 1.5, 0.035, 0.2], mats.white);
    detail(id + '-stop-line-south', [x, 0.31, z + roadWidth * 0.72], [roadWidth + 1.5, 0.035, 0.2], mats.white);
    detail(id + '-stop-line-west', [x - roadWidth * 0.72, 0.31, z], [0.2, 0.035, roadWidth + 1.5], mats.white);
    detail(id + '-stop-line-east', [x + roadWidth * 0.72, 0.31, z], [0.2, 0.035, roadWidth + 1.5], mats.white);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      detail(id + '-tactile-pad', [x + sx * (roadWidth / 2 + 2.2), 0.33, z + sz * (roadWidth / 2 + 2.2)], [1.6, 0.06, 1.6], mats.yellow);
      tactilePads++;
    }
    // Kerbside grated inlets make the roadside drainage pattern legible at
    // the low points without carving or replacing the existing road mesh.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      detail(id + '-corner-drain', [x + sx * (roadWidth / 2 + 4.4), 0.20, z + sz * (roadWidth / 2 + 4.4)], [1.1, 0.09, 0.72], mats.galvanized);
      drainGrates++;
    }
    junctions.push({ id, position: [x, z], crosswalkStripes: stripes * 2, tactilePads: 4, stopLines: 4 });
  }
  junction('vi-cbd-primary-junction-1162-900', 1162.5, -900);
  junction('eko-cbd-primary-junction-1642-1740', 1642.5, -1740);
  junction('ikoyi-east-primary-junction-2082-900', 2082.5, -900);
  junction('lekki-corridor-junction-2982-1740', 2982.5, -1740);
  junction('north-lagoon-link-junction-3442-520', 3442.5, -520);

  // Yaba Spine local frontage: repeated street lamps and wayfinding flank the
  // measured GCR-001 roadway (x≈92..367, z≈-2201..-449).
  for (const x of [80, 380]) {
    for (const z of [-700, -980, -1260, -1540, -1820, -2100]) {
      detail('yaba-gcr-streetlight-pole', [x, 3.3, z], [0.15, 6.6, 0.15], mats.metal, null, true);
      detail('yaba-gcr-streetlight-arm', [x + (x < 200 ? 0.62 : -0.62), 6.48, z], [1.15, 0.12, 0.14], mats.metal);
      detail('yaba-gcr-streetlight-head', [x + (x < 200 ? 1.13 : -1.13), 6.34, z], [0.52, 0.16, 0.3], mats.yellow);
      streetlights++;
    }
  }

  // Regional signs follow the arterial lines and mark the transitions between
  // the actual existing districts, including the upland road approach.
  wayfinding('district-yaba-core', 'YABA CITY CORE', [77, 0.25, -1350], 0, 'green');
  wayfinding('district-eko-cbd', 'EKO CBD', [1177, 0.25, -740], 0, 'blue');
  wayfinding('district-victoria-island', 'VICTORIA ISLAND', [1655, 0.25, -1180], 0, 'blue');
  wayfinding('district-ikoyi-waterfront', 'IKOYI WATERFRONT', [2098, 0.25, -760], 0, 'green');
  wayfinding('district-lekki', 'LEKKI', [3005, 0.25, -2080], 0, 'green');
  wayfinding('district-ekiti-highlands', 'EKITI HIGHLANDS', [3005, 0.25, -545], 0, 'green');

  // Ikoyi-side public-realm details sit outside the measured 7m secondary
  // north/south road at x=2300, leaving its drivable corridor clear.
  for (const z of [-770, -830]) {
    detail('ikoyi-waterfront-bench-seat', [2312, 0.62, z], [1.9, 0.16, 0.46], mats.wood, null, true);
    detail('ikoyi-waterfront-bench-back', [2312, 1.02, z + 0.12], [1.9, 0.64, 0.12], mats.wood);
    detail('ikoyi-waterfront-bin', [2315, 0.62, z + 2.2], [0.54, 1.24, 0.54], mats.plastic, null, true);
  }

  // Local collector/frontage treatment follows the verified secondary road
  // alignments in Yaba, the CBD and Ikoyi. These are roadside items; the
  // existing collision/road surfaces remain authoritative and are not paved over.
  const localStreetlight = (id, x, z) => {
    detail(id + '-pole', [x, 3.55, z], [0.15, 6.6, 0.15], mats.metal, null, true);
    detail(id + '-arm', [x + (x < 1000 ? 0.58 : -0.58), 6.68, z], [1.16, 0.12, 0.14], mats.metal);
    detail(id + '-head', [x + (x < 1000 ? 1.12 : -1.12), 6.56, z], [0.52, 0.16, 0.3], mats.yellow);
    streetlights++;
  };
  // GCR-002 Market Loop and GCR-003 Tech Hub Link have their own frontage
  // lighting, separated from the main Yaba Spine poles.
  for (const x of [132, 516]) for (const z of [-960, -1105, -1250]) {
    localStreetlight('yaba-market-loop-light', x, z);
  }
  for (const x of [196, 486]) for (const z of [-1400, -1580, -1760]) {
    localStreetlight('yaba-tech-hub-link-light', x, z);
  }
  // Eko CBD's primary and secondary local roads receive a low-cost light rhythm.
  for (const x of [1432, 1468, 1862, 1898]) for (const z of [-760, -1180, -1600, -2020]) {
    localStreetlight('eko-cbd-local-road-light', x, z);
  }
  // Ikoyi-side local streets flank the 7m secondary corridor, keeping the
  // bench/promenade area at z=-770/-830 clear of the light poles.
  for (const x of [2290, 2310]) for (const z of [-1080, -1380, -1680, -1980]) {
    localStreetlight('ikoyi-local-road-light', x, z);
  }
  // Lekki estate local access and the Ekiti foothill approach use the existing
  // primary north/south road edge as their alignment reference.
  for (const x of [2965, 3000]) for (const z of [-1840, -2120]) {
    localStreetlight('lekki-estate-road-light', x, z);
  }
  for (const x of [2960, 3005]) for (const z of [-760, -1040, -1280]) {
    reflector('ekiti-foothill-road-reflector-' + x + '-' + Math.abs(z), [x, 0.68, z]);
  }
  wayfinding('yaba-market-loop-entry', 'YABA MARKET LOOP', [132, 0.25, -960], 0, 'green');
  wayfinding('yaba-tech-hub-link-entry', 'TECH HUB LINK', [196, 0.25, -1400], 0, 'blue');
  wayfinding('yaba-south-connector-entry', 'YABA SOUTH CONNECTOR', [81, 0.25, -520], 0, 'green');

  // A pair of short paving margins and open-drain inlets mark the Ikoyi local
  // waterfront walk where it meets the collector road; they do not change
  // the road width or the water/bridge geometry.
  for (const z of [-1080, -1140]) {
    detail('ikoyi-prom-paving-margin', [2312, 0.06, z], [2.2, 0.12, 38], mats.concrete);
    detail('ikoyi-prom-drain-channel', [2310, 0.02, z - 20], [0.22, 0.08, 8], mats.drain);
    detail('ikoyi-prom-drain-grate', [2310, 0.12, z - 20], [0.62, 0.08, 1.2], mats.galvanized);
    drainGrates++;
  }

  // Lekki estate and Ekiti foothill entrances use roadside sign posts, not
  // freehand roads over the already connected primary/secondary surfaces.
  for (const z of [-2140, -2060]) {
    reflector('lekki-collector-reflector-left-' + Math.abs(z), [2967, 0.68, z]);
    reflector('lekki-collector-reflector-right-' + Math.abs(z), [2998, 0.68, z]);
  }
  detail('ekiti-trailhead-marker-post', [3030, 1.45, -548], [0.16, 2.9, 0.16], mats.galvanized, null, true);
  detail('ekiti-trailhead-marker-board', [3030, 2.6, -548], [2.8, 0.8, 0.16], mats.green);
  detail('ekiti-trailhead-marker-face', [3030, 2.6, -548.09], [2.55, 0.58, 0.035], mats.white);

  return {
    stage: '08K',
    districtCoverage: ['Yaba', 'Eko CBD', 'Victoria Island', 'Ikoyi Waterfront', 'Lekki', 'Ekiti Highlands'],
    existingNetworkPreserved: true,
    existingRoadGraph: { colliderTiles: 3049, connectedComponents: 1, sourceCells: 42 },
    bridgeTreatments,
    junctions,
    districtSigns,
    detailMeshes,
    crosswalkStripes,
    tactilePads,
    bridgeReflectors,
    drainGrates,
    streetlights,
    utilityCabinets,
    wayfindingSigns,
    collisionProxies,
    staticBatching: Boolean(group),
    batchGroupId: group?.id ?? null,
    roadsDuplicated: 0,
    liveTrafficAdded: false,
    features: [
      'four named bridge decks with approach warnings and reflectors',
      'five primary-road intersections with zebra crossings, stop lines, tactile pads and drain grates',
      'Yaba Spine streetlighting and roadside frontage details',
      'CBD, waterfront, Lekki and Ekiti Highlands district wayfinding',
      'Ikoyi waterfront seating and litter points',
      'Lekki bridge/collector delineation and Ekiti trailhead marker'
    ],
    note: 'The GIDI road collision graph is already connected across the 42 streamed cells. This stage adds junction/bridge safety and local streetscape rather than duplicating primary or secondary road meshes.'
  };
}
