// Stage 08A: connected neighbourhood expansion around the existing Yaba blockout.
// Geometry is intentionally modular and low-cost: reusable material families and simple
// box primitives keep the first expansion editable and suitable for mobile profiling.
export function createStage08ACityExpansion({ app, box, material, m }) {
  const batchGroup = app.batcher?.addGroup('stage08a-static-neighbourhood', false, 128);
  const staticBox = (...args) => {
    const entity = box(...args);
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    return entity;
  };

  const extra = {
    asphalt: m.asphalt,
    concrete: m.concrete,
    ground: m.ground,
    white: m.white,
    yellow: m.yellow,
    dark: m.dark,
    metal: m.metal,
    shops: m.shops,
    residential: [
      material([0.62, 0.55, 0.43]),
      material([0.47, 0.56, 0.48]),
      material([0.62, 0.62, 0.56]),
      material([0.42, 0.51, 0.58])
    ],
    storefront: material([0.10, 0.19, 0.22], 0.42),
    roof: material([0.22, 0.24, 0.23]),
    park: material([0.17, 0.39, 0.20]),
    tree: material([0.12, 0.28, 0.15]),
    sign: material([0.10, 0.27, 0.39])
  };

  // Extend terrain only beyond the old 46 x 154 m ground slab, avoiding coplanar overlap.
  staticBox('stage08-ground-west', [-35.5, -0.35, -18], [25, 0.5, 370], extra.ground);
  staticBox('stage08-ground-east', [35.5, -0.35, -18], [25, 0.5, 370], extra.ground);
  staticBox('stage08-ground-north', [0, -0.35, -150], [46, 0.5, 110], extra.ground);
  staticBox('stage08-ground-south', [0, -0.35, 114], [46, 0.5, 110], extra.ground);

  // Continue the original central avenue beyond its old north/south ends.
  for (const z of [-149, 113]) {
    staticBox('stage08-main-road-extension', [0, -0.07, z], [14, 0.16, 112], extra.asphalt);
    staticBox('stage08-main-road-footpath', [-8.0, 0.02, z], [1.1, 0.2, 112], extra.concrete);
    staticBox('stage08-main-road-footpath', [8.0, 0.02, z], [1.1, 0.2, 110], extra.concrete);
    for (let offset = -48; offset <= 48; offset += 12) {
      staticBox('stage08-main-road-lane-dash', [0, 0.025, z + offset], [0.14, 0.025, 4.2], extra.yellow);
    }
  }

  // Two distributor streets are widened for comfortable two-way traffic;
  // smaller neighbourhood lanes remain deliberately tighter.
  const parallelRoadWidth = 9.0;
  const parallelFootpathOffset = parallelRoadWidth / 2 + 1.5;
  for (const x of [-32, 32]) {
    staticBox('stage08-parallel-road', [x, -0.07, -18], [parallelRoadWidth, 0.16, 350], extra.asphalt);
    staticBox('stage08-roadside-footpath', [x - parallelFootpathOffset, 0.02, -18], [1.1, 0.2, 350], extra.concrete);
    staticBox('stage08-roadside-footpath', [x + parallelFootpathOffset, 0.02, -18], [1.1, 0.2, 350], extra.concrete);
    for (let z = -185; z < 150; z += 13) {
      staticBox('stage08-lane-dash', [x, 0.025, z], [0.13, 0.025, 4.5], extra.yellow);
    }
  }
  // Preserve the northern 9m neighbourhood street while widening only the
  // two busier east-west collectors. Local residential lanes stay narrow.
  const crossStreetWidths = new Map([[-110, 9.0], [42, 12.5], [118, 12.5]]);
  const crossStreetRoads = [];
  let busyCrossStreetLaneMarkingSegments = 0;
  for (const z of [-110, 42, 118]) {
    const roadWidth = crossStreetWidths.get(z);
    const sidewalkOffset = roadWidth / 2 + 0.75;
    const crossingOffset = roadWidth / 2 + 1.45;
    const roadEntity = staticBox('stage08-cross-street', [0, -0.055, z], [91, 0.17, roadWidth], extra.asphalt);
    crossStreetRoads.push({ z, entity: roadEntity });
    staticBox('stage08-cross-street-footpath', [0, 0.02, z - sidewalkOffset], [91, 0.2, 1.1], extra.concrete);
    staticBox('stage08-cross-street-footpath', [0, 0.02, z + sidewalkOffset], [91, 0.2, 1.1], extra.concrete);
    for (const x of [-32, 0, 32]) {
      const stripeRange = x === 0 ? (roadWidth > 8 ? 5 : 2) : 2;
      for (let i = -stripeRange; i <= stripeRange; i++) {
        staticBox('stage08-crosswalk-stripe', [x + i * 1.25, 0.035, z - crossingOffset], [0.72, 0.03, 0.8], extra.white);
        staticBox('stage08-crosswalk-stripe', [x + i * 1.25, 0.035, z + crossingOffset], [0.72, 0.03, 0.8], extra.white);
      }
    }
    // The two busiest east-west streets are four-lane collectors. Their
    // markings scale with the wider carriageway; the 9m northern lane stays
    // a simple neighbourhood road with no unnecessary extra lane paint.
    if (roadWidth >= 12) {
      for (let x = -42; x <= 42; x += 12) {
        staticBox('stage08-cross-street-centre-dash', [x, 0.035, z], [4.6, 0.03, 0.14], extra.yellow);
        busyCrossStreetLaneMarkingSegments++;
        for (const side of [-1, 1]) {
          staticBox('stage08-cross-street-lane-dash', [x, 0.035, z + side * 3.05], [4.6, 0.03, 0.12], extra.white);
          busyCrossStreetLaneMarkingSegments++;
        }
      }
      for (const side of [-1, 1]) {
        staticBox('stage08-cross-street-edge-line', [0, 0.035, z + side * (roadWidth / 2 - 0.22)], [91, 0.025, 0.12], extra.white);
        busyCrossStreetLaneMarkingSegments++;
      }
    }
  }

  // New neighbourhood plots: inner commercial/service blocks and outer residential blocks.
  const innerZ = [-160, -65, 62, 153];
  for (const side of [-1, 1]) {
    innerZ.forEach((z, index) => {
      const height = 5.2 + (index % 2) * 1.1;
      const x = side * 20.5;
      const body = box('stage08-commercial-building', [x, height / 2, z], [8.4, height, 13.5], extra.shops[(index + (side > 0 ? 1 : 0)) % extra.shops.length]);
      body.tags.add('stage08a-building');
      const frontX = x - side * 4.28;
      staticBox('stage08-shopfront-glazing', [frontX, 1.45, z], [0.12, 1.65, 8.6], extra.storefront);
      const roof = box('stage08-commercial-roof', [x, height + 0.12, z], [8.8, 0.24, 13.9], extra.roof);
      roof.tags.add('stage08a-roof');
    });
  }

  const outerZ = [-155, -72, 65, 150];
  for (const side of [-1, 1]) {
    outerZ.forEach((z, index) => {
      const x = side * 42.5;
      const height = 4.1 + (index % 3) * 0.45;
      const body = box('stage08-residential-building', [x, height / 2, z], [9.5, height, 14.5], extra.residential[index % extra.residential.length]);
      body.tags.add('stage08a-building');
      const roof = box('stage08-residential-roof', [x, height + 0.13, z], [9.8, 0.26, 14.8], extra.roof);
      roof.tags.add('stage08a-roof');
    });
  }

  // Small green pocket parks break up the repeated street grid.
  for (const [x, z] of [[-20, -88], [20, 90], [42, -5]]) {
    staticBox('stage08-pocket-park', [x, 0.02, z], [9, 0.12, 10], extra.park);
    for (const offset of [-2.7, 2.7]) {
      staticBox('stage08-park-tree-trunk', [x + offset, 1.15, z], [0.34, 2.3, 0.34], extra.roof);
      staticBox('stage08-park-tree-canopy', [x + offset, 2.8, z], [2.1, 2.1, 2.1], extra.tree);
    }
  }

  // A readable district marker at the new eastern distributor road.
  staticBox('stage08-district-sign-post', [36.8, 2.2, 4], [0.18, 4.4, 0.18], extra.metal);
  staticBox('stage08-district-sign-board', [36.8, 4.1, 4], [2.8, 1.1, 0.16], extra.sign);

  return {
    stage: '08A',
    expansionBounds: { min: [-48, -1, -205], max: [48, 8, 169] },
    parallelRoads: 2,
    crossStreets: 3,
    roadHierarchy: { mainAvenueMetres: 14, parallelDistributorRoadMetres: 9, parallelLocalRoadMetres: 9, parallelFootpathCentreOffsetMetres: 6, crossStreetsMetres: Object.fromEntries(crossStreetWidths), crossStreetsRenderedMetres: Object.fromEntries(crossStreetRoads.map(({z,entity})=>[String(z),entity.getLocalScale().z])), widenedCrossStreetIds: [...crossStreetWidths].filter(([,width])=>width>=12).map(([z])=>z), busyCrossStreetLaneMarkingSegments },
    commercialBuildings: 8,
    residentialBuildings: 8,
    pocketParks: 3,
    staticBatching: Boolean(batchGroup),
    batchGroupId: batchGroup?.id ?? null,
    note: 'Procedural blockout geometry; detailed facades and street props belong to later Stage 08 sub-stages.'
  };
}
