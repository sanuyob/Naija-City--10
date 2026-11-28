import * as pc from 'playcanvas';

export const DISTRICT_VEHICLE_ROSTERS = {
  alimosho: [
    ['saloon', 'silver'], ['hatchback', 'white'], ['suv', 'black'], ['taxi', 'yellow'], ['pickup', 'white'],
    ['danfo', 'yellow'], ['minibus', 'white'], ['keke', 'green'], ['okada', 'red'], ['light-truck', 'white']
  ],
  lekki: [
    ['saloon', 'white'], ['saloon', 'silver'], ['suv', 'black'], ['suv', 'blue'], ['executive', 'navy'],
    ['hatchback', 'silver'], ['taxi', 'dark'], ['minibus', 'white'], ['delivery-van', 'white'], ['keke', 'green']
  ],
  victoriaIsland: [
    ['saloon', 'black'], ['saloon', 'silver'], ['suv', 'white'], ['executive', 'navy'], ['taxi', 'yellow'],
    ['hatchback', 'silver'], ['police-suv', 'black'], ['coaster', 'white'], ['delivery-van', 'silver'], ['ambulance', 'white']
  ],
  ekoAtlantic: [
    ['saloon', 'white'], ['saloon', 'silver'], ['saloon', 'navy'], ['suv', 'black'], ['suv', 'white'],
    ['executive', 'dark'], ['hatchback', 'silver'], ['police-suv', 'black'], ['service-van', 'white'], ['pickup', 'silver']
  ],
  ekiti: [
    ['saloon', 'silver'], ['station-wagon', 'green'], ['taxi', 'yellow'], ['pickup', 'white'], ['suv', 'blue'],
    ['minibus', 'white'], ['keke', 'green'], ['okada', 'blue'], ['tractor', 'green'], ['light-truck', 'white']
  ]
};

const DISTRICT_ROUTES = {
  alimosho: (x, z) => [
    { start: [x - 76, z], end: [x + 76, z], lane: 2.45 },
    { start: [x, z - 61], end: [x, z + 61], lane: 2.25 }
  ],
  lekki: (x, z) => [
    { start: [x - 78, z], end: [x + 78, z], lane: 2.55 },
    { start: [x, z - 62], end: [x, z + 62], lane: 2.2 }
  ],
  victoriaIsland: (x, z) => [
    { start: [x - 78, z], end: [x + 78, z], lane: 2.55 },
    { start: [x, z - 60], end: [x, z + 60], lane: 2.15 }
  ],
  ekoAtlantic: (x, z) => [
    { start: [x - 78, z], end: [x + 78, z], lane: 3.35 },
    { start: [x, z - 62], end: [x, z + 62], lane: 3.25 }
  ],
  ekiti: (x, z) => [
    { start: [x - 78, z + 51], end: [x + 78, z + 26], lane: 1.65 },
    { start: [x - 35, z - 66], end: [x + 43, z + 65], lane: 1.45 }
  ]
};

const PAINT = {
  sedan: [0.72, 0.75, 0.78], silver: [0.60, 0.65, 0.68], white: [0.86, 0.86, 0.82],
  black: [0.055, 0.065, 0.075], dark: [0.10, 0.12, 0.14], navy: [0.055, 0.12, 0.25],
  blue: [0.08, 0.28, 0.62], yellow: [0.88, 0.68, 0.06], green: [0.08, 0.32, 0.16],
  red: [0.64, 0.09, 0.06]
};

export const DISTRICT_VEHICLE_PROFILES = {
  saloon: { width: 1.72, length: 3.75, body: 0.56, cabin: 0.66, speed: 8.5, wheels: 4, car: true },
  hatchback: { width: 1.66, length: 3.45, body: 0.57, cabin: 0.70, speed: 8.0, wheels: 4, car: true },
  suv: { width: 1.92, length: 4.20, body: 0.72, cabin: 0.80, speed: 8.8, wheels: 4, car: true },
  executive: { width: 1.90, length: 4.55, body: 0.63, cabin: 0.72, speed: 8.7, wheels: 4, car: true },
  taxi: { width: 1.72, length: 3.75, body: 0.56, cabin: 0.66, speed: 7.8, wheels: 4, car: true },
  'station-wagon': { width: 1.78, length: 4.15, body: 0.60, cabin: 0.72, speed: 7.7, wheels: 4, car: true },
  'police-suv': { width: 1.96, length: 4.25, body: 0.76, cabin: 0.82, speed: 9.0, wheels: 4, car: true, emergency: true },
  ambulance: { width: 2.02, length: 4.95, body: 1.92, cabin: 1.95, speed: 7.8, wheels: 4, van: true, emergency: true },
  'light-truck': { width: 2.02, length: 5.05, body: 1.03, cabin: 0.78, speed: 6.0, wheels: 4, truck: true },
  danfo: { width: 1.86, length: 4.35, body: 1.82, cabin: 1.82, speed: 6.4, wheels: 4, bus: true },
  minibus: { width: 1.90, length: 4.55, body: 1.90, cabin: 1.90, speed: 7.1, wheels: 4, bus: true },
  coaster: { width: 2.20, length: 6.55, body: 2.24, cabin: 2.24, speed: 7.5, wheels: 6, bus: true },
  'delivery-van': { width: 1.92, length: 4.45, body: 1.78, cabin: 1.85, speed: 7.4, wheels: 4, van: true },
  'service-van': { width: 2.00, length: 4.70, body: 1.90, cabin: 1.95, speed: 6.5, wheels: 4, van: true },
  pickup: { width: 1.92, length: 4.55, body: 0.62, cabin: 0.72, speed: 7.4, wheels: 4, pickup: true },
  keke: { width: 1.34, length: 2.45, body: 0.72, cabin: 0.78, speed: 5.2, wheels: 3, tricycle: true },
  okada: { width: 0.72, length: 1.95, body: 0.56, cabin: 0.48, speed: 7.0, wheels: 2, motorcycle: true },
  tractor: { width: 1.88, length: 3.50, body: 0.95, cabin: 1.35, speed: 3.6, wheels: 4, tractor: true }
};

function makeMaterial(color, cache) {
  const key = color.join(',');
  if (cache.has(key)) return cache.get(key);
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(...color);
  material.metalness = 0.10;
  material.shininess = 24;
  material.update();
  cache.set(key, material);
  return material;
}

function makeVehicle(app, parent, district, index, type, paintName, materials) {
  const spec = DISTRICT_VEHICLE_PROFILES[type];
  const paint = PAINT[paintName] || PAINT.silver;
  const bodyMat = makeMaterial(paint, materials);
  const glassMat = makeMaterial([0.045, 0.085, 0.11], materials);
  const tyreMat = makeMaterial([0.025, 0.028, 0.03], materials);
  const trimMat = makeMaterial([0.32, 0.34, 0.35], materials);
  const name = `traffic-${district}-${type}-${index + 1}`;
  const root = new pc.Entity(name);
  parent.addChild(root);
  root.tags.add('district-vehicle-traffic');
  root.tags.add(`vehicle-type-${type}`);

  const addBox = (partName, position, scale, material) => {
    const part = new pc.Entity(`${name}-${partName}`);
    part.addComponent('render', { type: 'box', material });
    part.setLocalPosition(...position);
    part.setLocalScale(...scale);
    root.addChild(part);
    return part;
  };
  const addWheel = (partName, x, z, radius = 0.34, width = 0.22) => {
    const wheel = new pc.Entity(`${name}-${partName}`);
    wheel.addComponent('render', { type: 'cylinder', material: tyreMat });
    wheel.setLocalScale(radius * 2, width, radius * 2);
    wheel.setLocalEulerAngles(0, 0, 90);
    wheel.setLocalPosition(x, radius, z);
    root.addChild(wheel);
  };

  if (spec.motorcycle) {
    addBox('frame', [0, 0.60, 0], [0.34, 0.32, 1.18], bodyMat);
    addBox('seat', [0, 0.91, -0.20], [0.40, 0.13, 0.56], trimMat);
    addBox('fuel-tank', [0, 0.91, 0.18], [0.48, 0.30, 0.46], bodyMat);
    addWheel('front-wheel', 0, 0.70, 0.34, 0.14);
    addWheel('rear-wheel', 0, -0.68, 0.34, 0.14);
  } else if (spec.tricycle) {
    addBox('lower-body', [0, 0.48, 0], [spec.width, 0.50, spec.length], bodyMat);
    addBox('passenger-canopy', [0, 1.43, -0.18], [spec.width * 0.92, 0.12, 1.62], paintName === 'yellow' ? trimMat : bodyMat);
    addBox('windscreen', [0, 1.06, 0.76], [spec.width * 0.78, 0.70, 0.055], glassMat);
    addBox('rear-seat', [0, 0.86, -0.47], [1.02, 0.24, 0.66], trimMat);
    addWheel('front-wheel', 0, 0.79, 0.34, 0.15);
    addWheel('rear-wheel-left', -0.48, -0.80, 0.31, 0.14);
    addWheel('rear-wheel-right', 0.48, -0.80, 0.31, 0.14);
  } else if (spec.tractor) {
    addBox('chassis', [0, 0.79, 0], [1.42, 0.54, 2.40], bodyMat);
    addBox('engine-hood', [0, 1.12, 0.75], [1.12, 0.72, 1.10], bodyMat);
    addBox('operator-canopy', [0, 2.18, -0.35], [1.5, 0.12, 1.35], trimMat);
    addBox('operator-cab-posts', [0, 1.65, -0.35], [1.42, 0.95, 0.08], trimMat);
    addWheel('front-left', -0.72, 0.88, 0.44, 0.22);
    addWheel('front-right', 0.72, 0.88, 0.44, 0.22);
    addWheel('rear-left', -0.78, -0.78, 0.62, 0.28);
    addWheel('rear-right', 0.78, -0.78, 0.62, 0.28);
  } else {
    const isBus = Boolean(spec.bus || spec.van);
    const isTruck = Boolean(spec.truck);
    const bodyY = isBus ? spec.body * 0.5 + 0.22 : 0.72;
    addBox('body', [0, bodyY, 0], [spec.width, spec.body, spec.length], bodyMat);
    if (spec.bus || spec.van || isTruck) {
      addBox('glass-band', [0, bodyY + spec.body * 0.21, 0.02], [spec.width * 0.91, 0.34, spec.length * 0.70], glassMat);
      addBox('roof', [0, bodyY + spec.body * 0.55, 0], [spec.width * 0.96, 0.12, spec.length * 0.94], trimMat);
      if (isTruck) addBox('cargo-box', [0, bodyY + 0.36, -spec.length * 0.18], [spec.width * 0.92, 1.10, spec.length * 0.48], bodyMat);
    } else {
      const cabinLength = spec.pickup ? 1.70 : Math.min(spec.length * 0.55, type === 'hatchback' ? 1.95 : 2.12);
      const cabinY = 0.72 + spec.body * 0.5 + spec.cabin * 0.44;
      addBox('cabin', [0, cabinY, spec.pickup ? -0.42 : -0.12], [spec.width * 0.79, spec.cabin, cabinLength], glassMat);
      if (spec.pickup) {
        addBox('cargo-bed', [0, 0.78, -1.38], [spec.width * 0.88, 0.48, 1.22], bodyMat);
        addBox('cargo-bed-floor', [0, 1.03, -1.38], [spec.width * 0.82, 0.06, 1.12], trimMat);
      }
      if (type === 'taxi') addBox('taxi-roof-sign', [0, 1.70, 0.12], [0.48, 0.13, 0.24], trimMat);
    }
    const axleZ = Math.max(0.95, spec.length * 0.34);
    const wheelXs = spec.width * 0.49;
    addWheel('front-left', -wheelXs, axleZ);
    addWheel('front-right', wheelXs, axleZ);
    addWheel('rear-left', -wheelXs, -axleZ);
    addWheel('rear-right', wheelXs, -axleZ);
    if (spec.wheels === 6) {
      addWheel('rear-axle-left', -wheelXs, -spec.length * 0.16);
      addWheel('rear-axle-right', wheelXs, -spec.length * 0.16);
    }
    if (spec.emergency) {
      const beacon = makeMaterial([0.04, 0.24, 0.92], materials);
      addBox('emergency-lightbar', [0, bodyY + spec.body * 0.62 + 0.12, 0.12], [0.74, 0.13, 0.25], beacon);
    }
    if (type === 'danfo') {
      addBox('danfo-yellow-route-band', [0, 0.62, spec.length * 0.51], [spec.width * 0.96, 0.18, 0.07], makeMaterial([0.10, 0.11, 0.10], materials));
    }
  }
  return root;
}

function makeRoute(route) {
  const dx = route.end[0] - route.start[0];
  const dz = route.end[1] - route.start[1];
  const length = Math.hypot(dx, dz);
  const ux = dx / length, uz = dz / length;
  const px = -uz, pz = ux;
  return { ...route, length, ux, uz, px, pz };
}

export function createDistrictVehicleTraffic({ app, districtRoots = {}, districtSpecs = {}, lowMemoryDevice = false } = {}) {
  if (!app || !app.root) throw new Error('District vehicle traffic requires a PlayCanvas app.');
  const materials = new Map();
  const fleets = {};
  const all = [];
  const activeRadius = lowMemoryDevice ? 165 : 220;

  for (const [district, entries] of Object.entries(DISTRICT_VEHICLE_ROSTERS)) {
    const districtParent = districtRoots[district];
    const spec = districtSpecs[district];
    if (!districtParent || !spec?.center) continue;
    const [cx, cz] = spec.center;
    const routes = (DISTRICT_ROUTES[district]?.(cx, cz) || []).map(makeRoute);
    const root = new pc.Entity(`district-traffic-${district}`);
    districtParent.addChild(root);
    const records = [];
    entries.forEach(([type, paintName], index) => {
      const routeIndex = index % routes.length;
      const route = routes[routeIndex];
      const direction = Math.floor(index / routes.length) % 2 === 0 ? 1 : -1;
      const progress = ((Math.floor(index / routes.length) + 0.5) / Math.ceil(entries.length / routes.length)) * route.length;
      const entity = makeVehicle(app, root, district, index, type, paintName, materials);
      entity.setPosition(
        route.start[0] + route.ux * progress + route.px * route.lane * direction,
        0,
        route.start[1] + route.uz * progress + route.pz * route.lane * direction
      );
      const yaw = Math.atan2(route.ux * direction, route.uz * direction) * 180 / Math.PI;
      entity.setEulerAngles(0, yaw, 0);
      const record = { district, type, paint: paintName, entity, route, progress, direction, speed: DISTRICT_VEHICLE_PROFILES[type].speed * (0.88 + (index % 4) * 0.055), updates: 0 };
      records.push(record); all.push(record);
    });
    fleets[district] = { root, records, center: spec.center.slice(), active: false };
  }

  function update(dt, playerPosition = [0, 0, 0], remoteDistrictKey = null) {
    const p = Array.isArray(playerPosition) ? playerPosition : playerPosition?.toArray?.() || [playerPosition?.x || 0, playerPosition?.y || 0, playerPosition?.z || 0];
    const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
    const active = [];
    for (const [district, fleet] of Object.entries(fleets)) {
      const distance = Math.hypot(Number(p[0] || 0) - fleet.center[0], Number(p[2] || 0) - fleet.center[1]);
      const enabled = remoteDistrictKey === district || distance <= activeRadius;
      fleet.root.enabled = enabled;
      fleet.active = enabled;
      if (!enabled || step <= 0) continue;
      active.push(district);
      for (const vehicle of fleet.records) {
        const route = vehicle.route;
        vehicle.progress += vehicle.speed * step * vehicle.direction;
        if (vehicle.progress >= route.length) vehicle.progress -= route.length;
        if (vehicle.progress < 0) vehicle.progress += route.length;
        const progress = vehicle.progress;
        vehicle.entity.setPosition(
          route.start[0] + route.ux * progress + route.px * route.lane * vehicle.direction,
          0,
          route.start[1] + route.uz * progress + route.pz * route.lane * vehicle.direction
        );
        const yaw = Math.atan2(route.ux * vehicle.direction, route.uz * vehicle.direction) * 180 / Math.PI;
        vehicle.entity.setEulerAngles(0, yaw, 0);
        vehicle.updates++;
      }
    }
    return { activeDistricts: active, activeVehicleCount: active.reduce((sum, key) => sum + fleets[key].records.length, 0) };
  }

  function getState() {
    const byDistrict = {};
    const byType = {};
    for (const [district, fleet] of Object.entries(fleets)) {
      byDistrict[district] = { count: fleet.records.length, active: fleet.active, types: fleet.records.reduce((out, vehicle) => { out[vehicle.type] = (out[vehicle.type] || 0) + 1; return out; }, {}), vehicles: fleet.records.map(vehicle => ({ type: vehicle.type, position: vehicle.entity.getPosition().toArray(), updates: vehicle.updates })) };
      for (const vehicle of fleet.records) byType[vehicle.type] = (byType[vehicle.type] || 0) + 1;
    }
    const carCount = all.filter(item => DISTRICT_VEHICLE_PROFILES[item.type]?.car).length;
    return { totalVehicles: all.length, activeVehicles: all.filter(item => fleets[item.district]?.active).length, carCount, carShare: all.length ? Number((carCount / all.length).toFixed(3)) : 0, byDistrict, byType, mobileBudget: lowMemoryDevice ? 'low-memory: one nearby district fleet' : 'one nearby district fleet' };
  }

  function destroy() {
    for (const fleet of Object.values(fleets)) fleet.root.destroy();
    for (const material of materials.values()) material.destroy?.();
  }

  return { update, getState, destroy };
}
