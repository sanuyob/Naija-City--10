import * as pc from 'playcanvas';

const DISTRICT_ACTIVITY = {
  alimosho: {
    axis: 'x', span: [-326, -346], fixed: 454,
    people: [
      { role: 'Market trader', outfit: 'Printed blouse and wrapper', shirt: [0.64, 0.22, 0.12], trousers: [0.22, 0.16, 0.12], skin: [0.36, 0.20, 0.13], hair: [0.045, 0.035, 0.03] },
      { role: 'Commuter', outfit: 'Polo shirt and dark trousers', shirt: [0.12, 0.34, 0.48], trousers: [0.12, 0.13, 0.16], skin: [0.48, 0.29, 0.19], hair: [0.04, 0.03, 0.025] }
    ],
    vehicle: { kind: 'shared minibus', color: [0.83, 0.65, 0.12], glass: [0.08, 0.18, 0.20] }
  },
  lekki: {
    axis: 'z', span: [318, 338], fixed: 319,
    people: [
      { role: 'Estate security officer', outfit: 'Dark security uniform', shirt: [0.10, 0.18, 0.23], trousers: [0.08, 0.10, 0.13], skin: [0.42, 0.25, 0.16], hair: [0.035, 0.028, 0.025] },
      { role: 'Estate resident', outfit: 'Casual shirt and jeans', shirt: [0.76, 0.55, 0.30], trousers: [0.15, 0.22, 0.34], skin: [0.31, 0.17, 0.11], hair: [0.035, 0.025, 0.02] }
    ],
    vehicle: { kind: 'private SUV', color: [0.20, 0.22, 0.23], glass: [0.06, 0.15, 0.18] }
  },
  victoriaIsland: {
    axis: 'x', span: [301, 281], fixed: 73,
    people: [
      { role: 'Office worker', outfit: 'Button-up shirt and office trousers', shirt: [0.78, 0.80, 0.76], trousers: [0.12, 0.15, 0.20], skin: [0.42, 0.24, 0.15], hair: [0.035, 0.025, 0.02] },
      { role: 'Hospitality worker', outfit: 'Smart service uniform', shirt: [0.16, 0.25, 0.39], trousers: [0.12, 0.13, 0.16], skin: [0.30, 0.17, 0.11], hair: [0.035, 0.025, 0.02] }
    ],
    vehicle: { kind: 'city sedan', color: [0.68, 0.69, 0.67], glass: [0.07, 0.16, 0.19] }
  },
  ekoAtlantic: {
    axis: 'x', span: [556, 536], fixed: 78,
    people: [
      { role: 'Waterfront visitor', outfit: 'Light casual shirt and chinos', shirt: [0.18, 0.42, 0.55], trousers: [0.48, 0.39, 0.27], skin: [0.48, 0.29, 0.18], hair: [0.035, 0.025, 0.02] },
      { role: 'Infrastructure technician', outfit: 'Reflective work vest and work trousers', shirt: [0.86, 0.53, 0.08], trousers: [0.15, 0.17, 0.18], skin: [0.34, 0.20, 0.13], hair: [0.035, 0.025, 0.02], vest: true }
    ],
    vehicle: { kind: 'maintenance pickup', color: [0.78, 0.80, 0.78], glass: [0.07, 0.16, 0.19] }
  },
  ekiti: {
    axis: 'z', span: [690, 670], fixed: -312,
    people: [
      { role: 'Smallholder farmer', outfit: 'Practical work shirt and trousers', shirt: [0.42, 0.31, 0.18], trousers: [0.18, 0.17, 0.13], skin: [0.34, 0.20, 0.13], hair: [0.035, 0.025, 0.02] },
      { role: 'Local trader', outfit: 'Colourful blouse and wrapper', shirt: [0.54, 0.18, 0.30], trousers: [0.32, 0.18, 0.13], skin: [0.47, 0.28, 0.18], hair: [0.045, 0.035, 0.03] }
    ],
    vehicle: { kind: 'local utility van', color: [0.72, 0.67, 0.53], glass: [0.08, 0.17, 0.19] }
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Small, district-scoped ambient population for remote CCTV views.
 * All actors are ordinary live PlayCanvas entities, parented to the matching
 * streamed district root. Only the district currently viewed by CCTV simulates.
 */
export function createDistrictActivitySystem({ app, districtRoots = {}, lowMemoryDevice = false, realNpcDistricts = [] } = {}) {
  if (!app) throw new Error('District activity requires a PlayCanvas app.');
  const materialCache = new Map();
  const districts = new Map();
  const stats = { updates: 0, actorSteps: 0, vehicleSteps: 0, activeDistrict: null };
  const material = color => {
    const key = color.join(',');
    if (materialCache.has(key)) return materialCache.get(key);
    const value = new pc.StandardMaterial();
    value.diffuse = new pc.Color(...color);
    value.shininess = 10;
    value.update();
    materialCache.set(key, value);
    return value;
  };
  const part = (root, name, type, scale, position, mat) => {
    const entity = new pc.Entity(name, app);
    entity.addComponent('render', { type, material: mat });
    entity.setLocalScale(...scale);
    entity.setLocalPosition(...position);
    root.addChild(entity);
    return entity;
  };

  function buildPerson(root, district, index, definition) {
    const actor = new pc.Entity('district-npc-' + district + '-' + index, app);
    actor.tags.add('district-ambient-npc');
    actor.tags.add('occupation-' + definition.role.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    actor.enabled = false;
    root.addChild(actor);
    const shirt = material(definition.shirt), trousers = material(definition.trousers);
    const skin = material(definition.skin), hair = material(definition.hair);
    part(actor, 'npc-torso', 'box', [0.42, 0.68, 0.24], [0, 1.05, 0], shirt);
    part(actor, 'npc-head', 'sphere', [0.22, 0.25, 0.21], [0, 1.58, 0], skin);
    part(actor, 'npc-hair', 'sphere', [0.225, 0.09, 0.215], [0, 1.77, -0.015], hair);
    part(actor, 'npc-left-leg', 'box', [0.16, 0.57, 0.17], [-0.12, 0.46, 0], trousers);
    part(actor, 'npc-right-leg', 'box', [0.16, 0.57, 0.17], [0.12, 0.46, 0], trousers);
    if (definition.vest) part(actor, 'npc-work-vest', 'box', [0.45, 0.46, 0.255], [0, 1.08, 0.005], material([0.96, 0.68, 0.08]));
    const min = Math.min(...DISTRICT_ACTIVITY[district].span), max = Math.max(...DISTRICT_ACTIVITY[district].span);
    const start = min + (max - min) * (index === 0 ? 0.28 : 0.68);
    const end = min + (max - min) * (index === 0 ? 0.72 : 0.32);
    const axis = DISTRICT_ACTIVITY[district].axis;
    const fixed = DISTRICT_ACTIVITY[district].fixed + (index === 0 ? -1.8 : 1.8);
    const position = axis === 'x' ? [start, 0, fixed] : [fixed, 0, start];
    actor.setPosition(...position);
    return { entity: actor, role: definition.role, outfit: definition.outfit, active: false, axis, fixed, min: Math.min(start, end), max: Math.max(start, end), direction: index === 0 ? 1 : -1, speed: index === 0 ? 1.15 : 1.30, phase: index * 1.7 };
  }

  function buildVehicle(root, district, definition) {
    const entity = new pc.Entity('district-traffic-' + district + '-' + definition.kind.replace(/\s+/g, '-'), app);
    entity.tags.add('district-ambient-vehicle');
    entity.enabled = false;
    root.addChild(entity);
    const body = material(definition.color), glass = material(definition.glass), tyre = material([0.035, 0.04, 0.045]);
    part(entity, 'vehicle-body', 'box', [1.72, 0.62, 3.25], [0, 0.65, 0], body);
    part(entity, 'vehicle-cabin', 'box', [1.38, 0.62, 1.48], [0, 1.18, -0.18], glass);
    for (const x of [-0.76, 0.76]) for (const z of [-1.05, 1.05]) {
      part(entity, 'vehicle-wheel', 'cylinder', [0.32, 0.18, 0.32], [x, 0.34, z], tyre).setLocalEulerAngles(0, 0, 90);
    }
    const config = DISTRICT_ACTIVITY[district];
    const axis = config.axis;
    const start = Math.min(...config.span) - 3;
    const end = Math.max(...config.span) + 3;
    const fixed = config.fixed + 5.2;
    const position = axis === 'x' ? [start, 0, fixed] : [fixed, 0, start];
    entity.setPosition(...position);
    return { entity, kind: definition.kind, active: false, axis, fixed, min: start, max: end, direction: 1, speed: 2.8 };
  }

  const realNpcDistrictSet = new Set(realNpcDistricts);
  for (const [district, config] of Object.entries(DISTRICT_ACTIVITY)) {
    const root = districtRoots[district] || app.root;
    const people = config.people.slice(0, lowMemoryDevice ? 1 : 2)
      .filter((definition, index) => !(realNpcDistrictSet.has(district) && index === 0 && !lowMemoryDevice))
      .map((definition, index) => buildPerson(root, district, index, definition));
    const vehicle = buildVehicle(root, district, config.vehicle);
    districts.set(district, { people, vehicle });
  }

  function setActiveDistrict(districtKey = null) {
    const next = DISTRICT_ACTIVITY[districtKey] ? districtKey : null;
    stats.activeDistrict = next;
    for (const [key, group] of districts) {
      const active = key === next;
      for (const actor of group.people) { actor.active = active; actor.entity.enabled = active; }
      group.vehicle.active = active;
      group.vehicle.entity.enabled = active;
    }
    return getState();
  }

  function update(deltaSeconds) {
    const dt = clamp(Number(deltaSeconds) || 0, 0, 0.05);
    const key = stats.activeDistrict;
    if (!key || dt <= 0) return getState();
    const group = districts.get(key);
    for (const actor of group.people) {
      const position = actor.entity.getPosition();
      const current = position[actor.axis];
      let next = current + actor.direction * actor.speed * dt;
      if (next >= actor.max || next <= actor.min) {
        actor.direction *= -1;
        next = clamp(next, actor.min, actor.max);
      }
      if (actor.axis === 'x') actor.entity.setPosition(next, 0, actor.fixed);
      else actor.entity.setPosition(actor.fixed, 0, next);
      actor.entity.setEulerAngles(0, actor.axis === 'x' ? (actor.direction > 0 ? 90 : -90) : (actor.direction > 0 ? 180 : 0), 0);
      actor.phase += dt * 5;
      stats.actorSteps++;
    }
    const vehicle = group.vehicle;
    const position = vehicle.entity.getPosition();
    let next = position[vehicle.axis] + vehicle.direction * vehicle.speed * dt;
    if (next >= vehicle.max || next <= vehicle.min) {
      vehicle.direction *= -1;
      next = clamp(next, vehicle.min, vehicle.max);
    }
    if (vehicle.axis === 'x') vehicle.entity.setPosition(next, 0, vehicle.fixed);
    else vehicle.entity.setPosition(vehicle.fixed, 0, next);
    vehicle.entity.setEulerAngles(0, vehicle.axis === 'x' ? (vehicle.direction > 0 ? 90 : -90) : (vehicle.direction > 0 ? 180 : 0), 0);
    stats.vehicleSteps++;
    stats.updates++;
    return getState();
  }

  function getState() {
    const groups = {};
    for (const [key, group] of districts) {
      groups[key] = {
        active: key === stats.activeDistrict,
        pedestrians: group.people.map(actor => ({ role: actor.role, outfit: actor.outfit, position: actor.entity.getPosition().toArray(), visible: actor.active })),
        vehicles: [{ kind: group.vehicle.kind, position: group.vehicle.entity.getPosition().toArray(), visible: group.vehicle.active }]
      };
    }
    return { ...stats, districtCount: districts.size, activePedestrians: groups[stats.activeDistrict]?.pedestrians.length || 0, activeVehicles: stats.activeDistrict ? 1 : 0, districts: groups };
  }

  function destroy() {
    for (const group of districts.values()) {
      for (const actor of group.people) actor.entity.destroy();
      group.vehicle.entity.destroy();
    }
    districts.clear();
    materialCache.clear();
  }

  return { setActiveDistrict, update, getState, destroy };
}
