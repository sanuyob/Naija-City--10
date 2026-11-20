// Stage 08C: static Nigerian street infrastructure and roadside environment.
// Keep assets procedural, shared-material and spatially batched. No animated traffic or NPCs here.
export function createStage08CStreetInfrastructure({ app, box, material }) {
  const mats = {
    concrete: material([0.48, 0.46, 0.41]),
    curb: material([0.62, 0.59, 0.52]),
    asphalt: material([0.15, 0.16, 0.16]),
    dark: material([0.075, 0.085, 0.085]),
    metal: material([0.22, 0.25, 0.25], 0.42),
    galvanized: material([0.42, 0.46, 0.45], 0.48),
    pole: material([0.25, 0.22, 0.17]),
    wire: material([0.055, 0.06, 0.06]),
    signBlue: material([0.08, 0.24, 0.42]),
    signGreen: material([0.08, 0.32, 0.2]),
    signWhite: material([0.82, 0.82, 0.76]),
    yellow: material([0.88, 0.68, 0.12]),
    red: material([0.62, 0.12, 0.08]),
    blue: material([0.1, 0.25, 0.48]),
    green: material([0.1, 0.34, 0.2]),
    bin: material([0.18, 0.28, 0.25]),
    wood: material([0.36, 0.23, 0.13]),
    roof: material([0.28, 0.29, 0.27])
  };
  const batchGroup = app.batcher?.addGroup('stage08c-static-street-infrastructure', false, 72);
  let detailMeshes = 0;
  const detail = (name, position, scale, mat, rotation = null) => {
    const entity = box(name, position, scale, mat);
    entity.tags.add('stage08c-street-detail');
    if (batchGroup && entity.render) entity.render.batchGroupId = batchGroup.id;
    if (rotation) entity.setEulerAngles(...rotation);
    detailMeshes++;
    return entity;
  };

  // Raised kerbs, drainage channels and access covers around the extended avenue.
  for (const side of [-1, 1]) {
    for (const [start, length] of [[-196, 82], [-88, 110], [72, 88], [166, 6]]) {
      const x = side * 5.58;
      detail('stage08c-main-road-kerb', [x, 0.14, start + length / 2], [0.22, 0.28, length], mats.curb);
      detail('stage08c-main-drain-channel', [side * 6.72, 0.045, start + length / 2], [0.22, 0.09, length], mats.dark);
      for (let z = start + 5; z < start + length - 2; z += 18) {
        detail('stage08c-main-drain-cover', [side * 6.72, 0.12, z], [0.52, 0.08, 1.25], mats.galvanized);
        detail('stage08c-main-drain-slot', [side * 6.72, 0.165, z], [0.035, 0.018, 0.9], mats.dark);
      }
    }
  }

  // Distributor-road kerbs and storm-water grates. Existing sidewalks remain untouched.
  for (const side of [-1, 1]) {
    for (const roadX of [-32, 32]) {
      const roadEdge = roadX + Math.sign(roadX) * 3.78;
      detail('stage08c-distributor-kerb', [roadEdge, 0.13, -18], [0.2, 0.26, 338], mats.curb);
      for (let z = -180; z <= 145; z += 36) {
        detail('stage08c-distributor-drain-cover', [roadX + Math.sign(roadX) * 4.55, 0.13, z], [0.58, 0.08, 1.5], mats.galvanized);
      }
    }
  }
  for (const z of [-110, 42, 118]) {
    for (const side of [-1, 1]) {
      detail('stage08c-cross-street-kerb', [0, 0.13, z + side * 3.85], [91, 0.26, 0.2], mats.curb);
      for (const x of [-40, -20, 20, 40]) {
        detail('stage08c-cross-street-drain-cover', [x, 0.13, z + side * 5.55], [1.35, 0.08, 0.55], mats.galvanized);
      }
    }
  }

  // Raised pedestrian crossings and speed tables at neighbourhood junction approaches.
  for (const z of [-110, 42, 118]) {
    for (const x of [-32, 32]) {
      detail('stage08c-speed-table-base', [x, 0.075, z - 8], [6.4, 0.12, 1.15], mats.asphalt);
      for (let stripe = -2; stripe <= 2; stripe++) {
        detail('stage08c-speed-table-marking', [x + stripe * 1.1, 0.145, z - 8], [0.48, 0.025, 0.9], mats.yellow);
      }
      detail('stage08c-tactile-paving', [x, 0.145, z - 5.15], [2.2, 0.045, 0.85], mats.yellow);
    }
  }

  // Utility poles and restrained overhead service cables along the older central avenue.
  const poleZ = [-188, -146, -104, -20, 22, 64, 106, 148];
  for (const side of [-1, 1]) {
    for (const z of poleZ) {
      const x = side * 7.55;
      detail('stage08c-utility-pole', [x, 4.15, z], [0.24, 8.3, 0.24], mats.pole);
      detail('stage08c-utility-crossarm', [x, 7.45, z], [1.5, 0.16, 0.18], mats.galvanized);
      for (const offset of [-0.48, 0, 0.48]) {
        detail('stage08c-insulator', [x + offset, 7.65, z], [0.16, 0.28, 0.16], mats.signWhite);
      }
    }
    for (let i = 0; i < poleZ.length - 1; i++) {
      const z = (poleZ[i] + poleZ[i + 1]) / 2;
      const length = poleZ[i + 1] - poleZ[i];
      for (const offset of [-0.48, 0, 0.48]) {
        detail('stage08c-overhead-service-wire', [side * 7.55 + offset, 7.82, z], [0.045, 0.045, length], mats.wire);
      }
    }
  }

  // Streetlights on the outer distributor streets; no dynamic light sources are added.
  for (const side of [-1, 1]) {
    for (const z of [-174, -126, -78, -30, 18, 66, 114, 162]) {
      const x = side * 27.45;
      detail('stage08c-streetlight-pole', [x, 3.45, z], [0.16, 6.9, 0.16], mats.metal);
      detail('stage08c-streetlight-arm', [x - side * 0.55, 6.75, z], [1.2, 0.12, 0.14], mats.metal);
      detail('stage08c-streetlight-head', [x - side * 1.1, 6.62, z], [0.55, 0.18, 0.34], mats.yellow);
    }
  }

  // Directional, neighbourhood and transit signs at junctions.
  const signs = [
    [-29, -110, 'junction'], [29, -110, 'junction'], [-29, 42, 'junction'], [29, 42, 'junction'],
    [-29, 118, 'junction'], [29, 118, 'junction'], [-7.3, -146, 'district'], [7.3, 106, 'district']
  ];
  for (const [x, z, kind] of signs) {
    const board = kind === 'junction' ? mats.signBlue : mats.signGreen;
    detail('stage08c-road-sign-post', [x, 1.65, z], [0.13, 3.3, 0.13], mats.galvanized);
    detail('stage08c-road-sign-board', [x, 3.05, z], [1.35, 0.78, 0.12], board);
    detail('stage08c-road-sign-face', [x, 3.05, z - 0.07], [1.16, 0.58, 0.025], mats.signWhite);
  }

  // Benches, litter bins and low planters furnish pocket parks without animated actors.
  for (const [x, z] of [[-20, -88], [20, 90], [42, -5]]) {
    for (const offset of [-2.4, 2.4]) {
      detail('stage08c-park-bench-seat', [x + offset, 0.62, z + 3.8], [2.1, 0.16, 0.48], mats.wood);
      detail('stage08c-park-bench-back', [x + offset, 1.05, z + 4.0], [2.1, 0.72, 0.12], mats.wood);
      for (const leg of [-0.75, 0.75]) detail('stage08c-park-bench-leg', [x + offset + leg, 0.3, z + 3.8], [0.12, 0.6, 0.12], mats.metal);
    }
    detail('stage08c-park-bin-body', [x - 3.1, 0.62, z - 3.1], [0.62, 1.24, 0.62], mats.bin);
    detail('stage08c-park-bin-lid', [x - 3.1, 1.28, z - 3.1], [0.72, 0.12, 0.72], mats.metal);
    detail('stage08c-park-planter-edge', [x + 3.1, 0.28, z - 2.7], [1.2, 0.5, 1.2], mats.curb);
    detail('stage08c-park-planter-fill', [x + 3.1, 0.56, z - 2.7], [1.05, 0.12, 1.05], mats.green);
  }

  // Compact bus shelters at two distributor stops; future passenger logic is out of scope.
  for (const [x, z] of [[-27.2, -62], [27.2, 86]]) {
    for (const dx of [-1.5, 1.5]) {
      detail('stage08c-bus-shelter-post', [x + dx, 1.45, z], [0.12, 2.9, 0.12], mats.metal);
      detail('stage08c-bus-shelter-side-panel', [x + dx, 1.55, z + 0.48], [0.08, 2.0, 0.95], mats.signBlue);
    }
    detail('stage08c-bus-shelter-roof', [x, 3.0, z], [3.6, 0.18, 1.8], mats.roof);
    detail('stage08c-bus-shelter-bench', [x, 0.65, z + 0.45], [2.5, 0.16, 0.48], mats.wood);
    detail('stage08c-bus-stop-pole', [x + 2.5, 1.55, z - 0.4], [0.12, 3.1, 0.12], mats.metal);
    detail('stage08c-bus-stop-sign', [x + 2.5, 2.85, z - 0.4], [0.9, 0.62, 0.12], mats.signGreen);
  }

  // Static roadside market fixtures: tables, shade canopies and a small waste point.
  for (const [x, z, tone] of [[-26.8, -152, mats.red], [26.8, 145, mats.blue]]) {
    detail('stage08c-roadside-stall-counter', [x, 0.95, z], [2.0, 0.18, 1.25], mats.wood);
    detail('stage08c-roadside-stall-support', [x, 0.48, z], [0.12, 0.9, 0.12], mats.metal);
    detail('stage08c-roadside-stall-canopy', [x, 2.15, z], [2.5, 0.14, 1.8], tone);
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.72, 0.72]) {
      detail('stage08c-roadside-stall-leg', [x + dx, 1.18, z + dz], [0.09, 2.1, 0.09], mats.metal);
    }
    detail('stage08c-roadside-litter-bin', [x + 1.65, 0.62, z + 1.25], [0.58, 1.24, 0.58], mats.bin);
  }

  // A small number of removable bollards protect pedestrian waiting areas.
  for (const [x, z] of [[-25.4, -62], [25.4, 86], [-25.4, -152], [25.4, 145]]) {
    for (let i = -1; i <= 1; i++) {
      detail('stage08c-pedestrian-bollard', [x + i * 0.55, 0.55, z - 2.1], [0.22, 1.1, 0.22], mats.yellow);
    }
  }

  const solidName = /(?:main-road-kerb|distributor-kerb|cross-street-kerb|utility-pole|streetlight-pole|road-sign-post|bus-shelter-post|bus-stop-pole|park-bench-seat|park-bench-back|park-bin-body|park-planter-edge|roadside-stall-support|roadside-stall-leg|pedestrian-bollard)/;
  const collisionProxies = (app.root.findByTag('stage08c-street-detail') || [])
    .filter(entity => solidName.test(entity.name))
    .map(entity => {
      const p = entity.getPosition(), size = entity.getLocalScale(), r = entity.getEulerAngles();
      return { id: entity.name + '-' + entity.getGuid(), position: [p.x,p.y,p.z],
        halfExtents: [Math.abs(size.x)/2,Math.abs(size.y)/2,Math.abs(size.z)/2],
        rotationY: r.y, source: 'stage08c-street-infrastructure' };
    });

  return {
    stage: '08C',
    collisionProxies,
    utilityPoles: poleZ.length * 2,
    overheadWireRuns: (poleZ.length - 1) * 2 * 3,
    distributorStreetlights: 16,
    roadSigns: signs.length,
    busShelters: 2,
    roadsideStalls: 2,
    pocketParksFurnished: 3,
    detailMeshes,
    batching: Boolean(batchGroup),
    batchGroupId: batchGroup?.id ?? null,
    dynamicActorsAdded: 0,
    features: ['kerbs and storm drains', 'drain covers and grates', 'raised crossing approaches and tactile paving', 'utility poles, insulators and overhead wires', 'distributor-road streetlights', 'junction and district signs', 'park benches, bins and planters', 'bus shelters and static roadside stalls'],
    note: 'Static environment dressing only. Traffic simulation, pedestrians, animated vendors and final collision refinement remain separate stages.'
  };
}
