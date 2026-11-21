// Stage 08I: extend the existing Ikeja corridor into a connected, playable
// neighbourhood district. Geometry stays modular, static and mobile-batched.
// The existing Stage 08G/08H corridor is preserved; this module adds the
// residential, market, civic and collector-street fabric around it.
export function createStage08ICityDistrictExpansion({ app, box, material }) {
  const mats = {
    ground: material([0.24, 0.32, 0.23]),
    grass: material([0.13, 0.30, 0.16]),
    asphalt: material([0.12, 0.13, 0.135]),
    asphaltPatch: material([0.19, 0.185, 0.16]),
    concrete: material([0.47, 0.45, 0.41]),
    curb: material([0.65, 0.62, 0.55]),
    drain: material([0.065, 0.075, 0.07]),
    metal: material([0.23, 0.26, 0.26], 0.42),
    galvanized: material([0.43, 0.46, 0.45], 0.5),
    wire: material([0.045, 0.05, 0.05]),
    white: material([0.83, 0.83, 0.78]),
    yellow: material([0.9, 0.68, 0.12]),
    blue: material([0.07, 0.23, 0.43]),
    green: material([0.08, 0.32, 0.19]),
    red: material([0.61, 0.14, 0.09]),
    wood: material([0.34, 0.22, 0.13]),
    fabricA: material([0.68, 0.16, 0.11]),
    fabricB: material([0.08, 0.34, 0.22]),
    fabricC: material([0.88, 0.68, 0.15]),
    plastic: material([0.16, 0.27, 0.31]),
    glass: material([0.08, 0.18, 0.21], 0.32),
    roof: material([0.24, 0.25, 0.23]),
    facade: [
      material([0.65, 0.52, 0.38]),
      material([0.47, 0.54, 0.51]),
      material([0.65, 0.63, 0.53]),
      material([0.48, 0.49, 0.56])
    ]
  };

  // Keep batches static and spatially bounded so distant blocks can be culled.
  const batchGroup = app.batcher?.addGroup('stage08i-ikeja-neighbourhood-static', false, 128);
  const collisionProxies = [];
  const groundColliders = [];
  const roads = [];
  let detailMeshes = 0;
  let residentialBuildings = 0;
  let commercialBuildings = 0;
  let marketStalls = 0;
  let junctions = 0;
  let drainCovers = 0;
  let streetlights = 0;
  let utilityPoles = 0;

  function detail(name, position, scale, mat, rotation = null, solid = false) {
    const entity = box('stage08i-' + name, position, scale, mat);
    entity.tags.add('stage08i-ikeja-district');
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    if (rotation) entity.setEulerAngles(...rotation);
    detailMeshes++;
    if (solid) {
      collisionProxies.push({
        id: entity.name + '-' + entity.getGuid(),
        position: position.slice(),
        halfExtents: scale.map(value => Math.abs(value) / 2),
        rotationY: rotation?.[1] || 0,
        rotationX: rotation?.[0] || 0,
        rotationZ: rotation?.[2] || 0,
        source: 'stage08i-ikeja-city-expansion'
      });
    }
    return entity;
  }

  function road(name, position, scale, orientation = 'north-south') {
    // Raise the road deck 2cm above the surrounding ground and give it a real
    // asphalt Bullet surface. This is essential where the east/west extensions
    // cross the grass verge colliders beyond the original city floor.
    const roadPosition = [position[0], -0.06, position[2]];
    const entity = detail('road-' + name, roadPosition, scale, mats.asphalt);
    roads.push({ name, orientation, position: roadPosition.slice(), dimensions: scale.slice() });
    groundColliders.push({
      id: 'stage08i-road-' + name,
      position: roadPosition.slice(),
      halfExtents: [Math.abs(scale[0]) / 2, Math.abs(scale[1]) / 2, Math.abs(scale[2]) / 2],
      surface: 'asphalt'
    });
    return entity;
  }

  // Continuous visual land cover fills the previously exposed edges around the
  // 08G corridor. It sits below the existing road/sidewalk surfaces.
  detail('ground-extension', [0, -0.36, 320], [220, 0.5, 300], mats.ground);
  detail('west-green-verge', [-104, -0.06, 320], [10, 0.08, 286], mats.grass);
  detail('east-green-verge', [104, -0.06, 320], [10, 0.08, 286], mats.grass);

  // The original city floor covers x=-60..60 and z=-215..425. Add only the
  // uncovered western/eastern strips and southern tail; do not stack a second
  // large collider over the existing floor.
  groundColliders.push(
    { id: 'stage08i-ground-west', position: [-80, -0.2, 320], halfExtents: [20, 0.2, 150], surface: 'grass' },
    { id: 'stage08i-ground-east', position: [80, -0.2, 320], halfExtents: [20, 0.2, 150], surface: 'grass' },
    { id: 'stage08i-ground-south', position: [0, -0.2, 450], halfExtents: [60, 0.2, 25], surface: 'grass' }
  );

  // Two collector streets and two outer access streets create a true block
  // network around the existing north-south Ikeja commercial avenue.
  for (const x of [-45, 45]) {
    road('collector-' + (x < 0 ? 'west' : 'east'), [x, -0.08, 320], [11, 0.16, 260]);
    for (const side of [-1, 1]) {
      detail('collector-sidewalk', [x + side * 6.35, 0.015, 320], [1.35, 0.19, 260], mats.concrete);
      detail('collector-kerb', [x + side * 5.68, 0.14, 320], [0.2, 0.28, 260], mats.curb);
      detail('collector-gutter', [x + side * 7.42, 0.015, 320], [0.26, 0.08, 260], mats.drain);
      for (let z = 215; z <= 430; z += 27) {
        detail('collector-drain-cover', [x + side * 7.42, 0.105, z], [0.58, 0.08, 1.4], mats.galvanized);
        drainCovers++;
      }
    }
  }
  for (const x of [-83, 83]) {
    road('outer-residential-' + (x < 0 ? 'west' : 'east'), [x, -0.08, 320], [10, 0.16, 250]);
    for (const side of [-1, 1]) {
      detail('outer-road-footpath', [x + side * 5.9, 0.015, 320], [1.15, 0.18, 250], mats.concrete);
      detail('outer-road-kerb', [x + side * 5.12, 0.13, 320], [0.18, 0.26, 250], mats.curb);
    }
  }

  // East-west local streets tie the old Ikeja avenue into both collectors and
  // both residential streets. These intersections are the new network spine.
  const crossStreetZ = [246, 310, 374, 438];
  for (const z of crossStreetZ) {
    road('cross-' + z, [0, -0.08, z], [190, 0.16, 11], 'east-west');
    for (const side of [-1, 1]) {
      detail('cross-street-footpath', [0, 0.015, z + side * 6.35], [190, 0.18, 1.2], mats.concrete);
      detail('cross-street-kerb', [0, 0.13, z + side * 5.68], [190, 0.26, 0.18], mats.curb);
      detail('cross-street-gutter', [0, 0.015, z + side * 7.35], [190, 0.08, 0.24], mats.drain);
      for (let x = -76; x <= 76; x += 25) {
        detail('cross-street-drain-cover', [x, 0.105, z + side * 7.35], [1.35, 0.08, 0.55], mats.galvanized);
        drainCovers++;
      }
    }
    junctions += 3; // The main avenue and the two collector-road crossings.

    // Raised approaches and zebra crossings appear at the principal nodes.
    for (const x of [-45, 0, 45]) {
      detail('speed-table-approach', [x, 0.045, z - 7.6], [9.3, 0.1, 1.05], mats.asphaltPatch);
      for (let stripe = -2; stripe <= 2; stripe++) {
        detail('speed-table-marking', [x + stripe * 1.22, 0.105, z - 7.6], [0.48, 0.025, 0.78], mats.yellow);
      }
      detail('tactile-crossing-pad', [x, 0.11, z - 5.25], [2.4, 0.04, 0.82], mats.yellow);
    }
    for (let stripe = -4; stripe <= 4; stripe++) {
      detail('zebra-crossing-stripe', [stripe * 0.92, 0.025, z + 5.3], [0.52, 0.03, 1.15], mats.white);
    }
    detail('junction-stop-line', [0, 0.028, z - 6.4], [10.5, 0.035, 0.22], mats.white);
  }

  // Residential compounds: modest low-rise homes, service balconies, security
  // grilles, rooftop tanks and front doors; not a repeated high-rise wall.
  function house(x, z, variant = 0) {
    const width = 10.6, depth = 13.2, height = 4.8;
    const frontSign = x < 0 ? 1 : -1;
    const frontX = x + frontSign * (width / 2 + 0.07);
    const shell = detail('residential-house-shell', [x, height / 2, z], [width, height, depth], mats.facade[variant % mats.facade.length], null, true);
    detail('residential-house-plinth', [x, 0.22, z], [width + 0.24, 0.44, depth + 0.24], mats.concrete);
    detail('residential-house-roof', [x, height + 0.12, z], [width + 0.5, 0.24, depth + 0.5], mats.roof);
    for (const dz of [-3.5, 3.5]) {
      detail('residential-window', [frontX, 2.55, z + dz], [0.12, 1.35, 1.75], mats.glass);
      detail('residential-window-lintel', [frontX + frontSign * 0.08, 3.28, z + dz], [0.15, 0.12, 2.0], mats.concrete);
      for (let bar = -2; bar <= 2; bar++) {
        detail('residential-window-grille', [frontX + frontSign * 0.09, 2.55, z + dz + bar * 0.28], [0.055, 1.35, 0.045], mats.metal);
      }
    }
    detail('residential-entry-door', [frontX, 1.16, z], [0.16, 2.32, 1.25], mats.wood);
    detail('residential-entry-canopy', [frontX + frontSign * 0.38, 2.45, z], [0.95, 0.14, 2.0], mats.roof);
    detail('residential-rooftop-water-tank', [x - 2.8, height + 1.1, z + 3.2], [1.55, 1.7, 1.55], mats.blue);
    detail('residential-ac-condenser', [frontX + frontSign * 0.03, 3.75, z - 1.7], [0.42, 0.62, 0.78], mats.metal);
    residentialBuildings++;
    return shell;
  }
  for (const z of [230, 270, 296, 360, 390, 420]) house(-66, z, (z / 30) | 0);
  for (const z of [195, 415, 460]) house(66, z, (z / 30 + 1) | 0);

  // A few mixed-use service blocks face the collectors. Their ground floors
  // can later become enterable shops without moving the street layout.
  function commercialBlock(x, z, variant = 0) {
    const width = 11.5, depth = 14.0, height = 6.2;
    const facing = x < 0 ? 1 : -1;
    const frontX = x + facing * (width / 2 + 0.06);
    const shell = detail('mixed-use-commercial-shell', [x, height / 2, z], [width, height, depth], mats.facade[(variant + 1) % mats.facade.length], null, true);
    detail('commercial-shopfront-glass', [frontX, 1.55, z], [0.13, 2.8, 8.5], mats.glass);
    detail('commercial-security-grille', [frontX + facing * 0.1, 1.6, z], [0.07, 2.3, 8.7], mats.metal);
    detail('commercial-fascia', [frontX + facing * 0.18, 3.45, z], [0.18, 0.62, 9.4], variant % 2 ? mats.green : mats.blue);
    detail('commercial-awning', [frontX + facing * 1.1, 2.65, z], [2.3, 0.16, 9.7], variant % 2 ? mats.fabricB : mats.fabricC);
    detail('commercial-upper-window', [frontX, 4.9, z], [0.13, 1.45, 4.4], mats.glass);
    detail('commercial-roof-parapet', [x, height + 0.16, z], [width + 0.3, 0.32, depth + 0.3], mats.roof);
    commercialBuildings++;
    return shell;
  }
  for (const z of [232, 275, 355, 395]) commercialBlock(66, z, Math.floor(z / 40));

  // Ikeja neighbourhood market: a compact open-air produce/food/electronics
  // cluster, offset from the central road so the road corridor remains clear.
  // The compact market-direction post and board below now serve this entrance.
  detail('market-plaza-ground', [66, -0.015, 316], [19.5, 0.08, 50], mats.concrete);
  for (const [x, z, canopy] of [
    [59, 301, mats.fabricA], [70, 301, mats.fabricB],
    [59, 319, mats.fabricC], [70, 319, mats.fabricA],
    [59, 331, mats.fabricB], [70, 331, mats.fabricC]
  ]) {
    detail('market-stall-counter', [x, 0.92, z], [2.5, 0.18, 1.55], mats.wood, null, true);
    detail('market-stall-canopy', [x, 2.6, z], [3.2, 0.16, 2.9], canopy);
    for (const dx of [-1.38, 1.38]) for (const dz of [-1.15, 1.15]) {
      detail('market-stall-post', [x + dx, 1.35, z + dz], [0.09, 2.7, 0.09], mats.metal, null, true);
    }
    detail('market-goods-display', [x, 1.14, z - 0.48], [1.85, 0.28, 0.72], mats.facade[(Math.floor(z) % 4)]);
    detail('market-plastic-chair', [x + 1.9, 0.48, z + 1.5], [0.52, 0.88, 0.52], mats.plastic);
    marketStalls++;
  }
  detail('market-direction-pole', [55.2, 1.7, 290], [0.14, 3.4, 0.14], mats.galvanized);
  detail('market-direction-board', [55.2, 3.0, 290], [1.8, 0.78, 0.14], mats.blue);

  // A small public forecourt and transport/community hall provide a strong
  // landmark and a navigational anchor at the south-west side of the district.
  detail('transport-hall-forecourt', [-66, 0.025, 190], [21, 0.12, 25], mats.concrete);
  const transportHall = detail('transport-hall-main-shell', [-66, 4.0, 190], [17, 8, 18], mats.facade[1], null, true);
  detail('transport-hall-roof', [-66, 8.15, 190], [17.8, 0.3, 18.8], mats.roof);
  detail('transport-hall-entry', [-57.35, 1.8, 190], [0.15, 3.6, 5.0], mats.glass);
  detail('transport-hall-canopy', [-55.8, 3.7, 190], [2.7, 0.2, 6.6], mats.blue);
  detail('transport-hall-nameboard', [-56.9, 6.8, 190], [0.18, 1.05, 9.5], mats.green);
  detail('transport-hall-clock-face', [-56.85, 6.95, 190], [0.16, 0.7, 0.7], mats.white);

  // A pocket green with seating softens the residential block, not a uniform
  // blanket of props across the entire district.
  detail('residential-pocket-park', [-66, 0.025, 330], [17, 0.12, 22], mats.grass);
  // The two blocky park trees were removed after the road/sidewalk clearance audit.
  for (const x of [-71, -61]) {
    detail('park-bench-seat', [x, 0.65, 336], [2.0, 0.16, 0.48], mats.wood);
    detail('park-bench-back', [x, 1.02, 336.15], [2.0, 0.62, 0.12], mats.wood);
    detail('park-bin', [x + 2.1, 0.62, 335], [0.54, 1.24, 0.54], mats.metal);
  }

  // Utility poles and non-dynamic streetlights follow the new residential grid.
  for (const x of [-91, -53, 53, 91]) {
    for (const z of [220, 276, 332, 388, 444]) {
      detail('utility-pole', [x, 4.1, z], [0.22, 8.2, 0.22], mats.roof, null, true);
      detail('utility-crossarm', [x, 7.45, z], [1.4, 0.15, 0.16], mats.galvanized);
      for (const offset of [-0.43, 0, 0.43]) detail('utility-insulator', [x + offset, 7.64, z], [0.12, 0.22, 0.12], mats.white);
      utilityPoles++;
    }
  }
  for (const x of [-54, 54, -89.1, 89.1]) {
    for (const z of [236, 300, 364, 428]) {
      detail('streetlight-pole', [x, 3.35, z], [0.15, 6.7, 0.15], mats.metal, null, true);
      detail('streetlight-arm', [x + (x < 0 ? 0.6 : -0.6), 6.55, z], [1.2, 0.12, 0.14], mats.metal);
      detail('streetlight-head', [x + (x < 0 ? 1.15 : -1.15), 6.42, z], [0.56, 0.16, 0.3], mats.yellow);
      streetlights++;
    }
  }

  // District wayfinding marks the connection from the older city, the market,
  // the quieter housing blocks and the local transit/community anchor.
  for (const [x, z, board] of [
    [-14.6, 257, 'district'], [52, 294, 'market'], [-54.5, 232, 'residential'], [52, 414, 'hub']
  ]) {
    detail('wayfinding-post', [x, 1.65, z], [0.13, 3.3, 0.13], mats.galvanized, null, true);
    detail('wayfinding-board-' + board, [x, 3.0, z], [2.4, 0.78, 0.14], board === 'market' ? mats.green : mats.blue);
  }

  // Local drainage paths terminate at the existing roadside gutter system.
  // Covers are spaced; open channels remain visible between them.
  for (const x of [-49.8, 49.8, -87.2, 87.2]) {
    detail('open-storm-drain', [x, 0.02, 320], [0.24, 0.08, 246], mats.drain);
    for (let z = 230; z <= 420; z += 30) {
      detail('storm-drain-grate', [x, 0.105, z], [0.68, 0.08, 1.45], mats.galvanized);
      drainCovers++;
    }
  }

  // Minor asphalt repair patches and modest paint keep the collector streets
  // from reading as untouched, identical strips.
  for (const [x, z, w, d] of [
    [-22, 246, 2.4, 3.2], [25, 310, 2.0, 4.0], [-62, 374, 1.8, 3.0], [38, 438, 2.8, 2.5]
  ]) detail('asphalt-repair-patch', [x, 0.008, z], [w, 0.025, d], mats.asphaltPatch);

  return {
    stage: '08I',
    district: 'Ikeja',
    subdistricts: ['Residential Quarter', 'Neighbourhood Market', 'Collector Streets', 'Transport and Community Hub'],
    districtBounds: { min: [-110, -1, 170], max: [110, 12, 470] },
    roads,
    roadNetwork: {
      collectorRoads: 2,
      outerResidentialRoads: 2,
      crossStreets: crossStreetZ.length,
      connectedJunctions: crossStreetZ.length * 5,
      principalJunctions: junctions,
      connectedToExistingIkejaCorridor: true,
      approachRoadInheritedFromStage08G: true,
      roadWidthsMetres: { collector: 11, outerResidential: 10, crossStreet: 11 }
    },
    treesRemoved: 2,
    overheadMarketGateRemoved: true,
    mainAvenueWayfindingMovedToVerge: true,
    residentialBuildings,
    commercialBuildings,
    marketStalls,
    landmark: 'Ikeja Transport and Community Hall',
    pocketParks: 1,
    utilityPoles,
    streetlights,
    drainCovers,
    collisionProxies,
    groundColliders,
    detailMeshes,
    staticBatching: Boolean(batchGroup),
    batchGroupId: batchGroup?.id ?? null,
    liveTrafficAdded: false,
    liveNpcAdded: false,
    features: [
      'continuous ground cover and physics support around the Ikeja extension',
      'widened 11m collectors, 10m residential access roads and 11m cross streets',
      'sixteen-plus connected road junction approaches and crossings',
      'residential compounds with doors, security grilles and rooftop tanks',
      'mixed-use commercial frontage',
      'six-stall open-air neighbourhood market',
      'transport/community hall landmark and forecourt',
      'open pocket park without the two former trees, drainage channels, grates, utility poles and static streetlights'
    ],
    note: 'A connected Ikeja neighbourhood expansion. Static city geometry only; animated vendors, live traffic routing and interactive building interiors remain separate work.'
  };
}
