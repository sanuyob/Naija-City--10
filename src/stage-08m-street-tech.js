import * as pc from 'playcanvas';

/** Stage 08M: Nigerian street technology, utilities and interactive smart-city fixtures. */
export function createStage08MStreetTech({ app, box, material, entityFactory = name => new pc.Entity(name) }) {
  if (!app || typeof box !== 'function' || typeof material !== 'function') {
    throw new Error('Stage 08M requires the app, shared box factory and material factory.');
  }

  const m = {
    dark: material([0.055, 0.075, 0.075], 0.72),
    graphite: material([0.13, 0.16, 0.16], 0.58),
    metal: material([0.34, 0.39, 0.38], 0.38),
    galvanized: material([0.54, 0.58, 0.55], 0.46),
    cream: material([0.72, 0.69, 0.58], 0.78),
    green: material([0.10, 0.28, 0.19], 0.62),
    fadedGreen: material([0.20, 0.34, 0.25], 0.75),
    blue: material([0.08, 0.23, 0.36], 0.48),
    yellow: material([0.88, 0.65, 0.16], 0.52),
    red: material([0.62, 0.12, 0.09], 0.52),
    rubber: material([0.025, 0.03, 0.03], 0.9),
    wood: material([0.36, 0.23, 0.13], 0.82),
    concrete: material([0.45, 0.44, 0.39], 0.88),
    solar: material([0.035, 0.10, 0.16], 0.22),
    screen: material([0.025, 0.13, 0.15], 0.2),
    screenOn: material([0.10, 0.55, 0.43], 0.18),
    screenAmber: material([0.72, 0.39, 0.08], 0.2),
    glass: material([0.12, 0.27, 0.31], 0.2)
  };
  for (const key of ['screenOn', 'screenAmber']) {
    m[key].emissive = new pc.Color(m[key].diffuse.r * 0.28, m[key].diffuse.g * 0.28, m[key].diffuse.b * 0.28);
    m[key].update();
  }

  const batchGroup = app.batcher?.addGroup('stage08m-nigerian-street-tech', false, 144);
  const roots = new Map();
  const stats = { assemblies: 0, renderParts: 0, batchedRenderParts: 0, dynamicRenderParts: 0, interactiveDevices: 0, byDistrict: {} };
  const interactions = [];
  const surveillanceCameras = [];
  let onSurveillanceRequest = null;
  let onNetworkStatusChange = null;

  function rootFor(district) {
    if (!roots.has(district)) {
      const root = entityFactory('stage08m-' + district);
      root.tags.add('stage08m-street-tech');
      app.root.addChild(root);
      roots.set(district, root);
      stats.byDistrict[district] = 0;
    }
    return roots.get(district);
  }

  function addBox(parent, district, name, position, scale, mat, yaw = 0, batch = true) {
    const entity = box('stage08m-' + district + '-' + name, position, scale, mat, parent);
    entity.tags.add('stage08m-street-tech');
    if (entity.render) entity.render.batchGroupId = batch && batchGroup ? batchGroup.id : -1;
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    stats.renderParts++;
    if (batch) stats.batchedRenderParts++; else stats.dynamicRenderParts++;
    return entity;
  }

  function addCylinder(parent, district, name, position, scale, mat, yaw = 0, batch = true) {
    const entity = entityFactory('stage08m-' + district + '-' + name);
    entity.addComponent('render', { type: 'cylinder', material: mat });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    parent.addChild(entity);
    entity.tags.add('stage08m-street-tech');
    if (entity.render) entity.render.batchGroupId = batch && batchGroup ? batchGroup.id : -1;
    stats.renderParts++;
    if (batch) stats.batchedRenderParts++; else stats.dynamicRenderParts++;
    return entity;
  }

  function assembly(district, kind, position, build) {
    const root = rootFor(district);
    const group = entityFactory('stage08m-' + district + '-' + kind);
    group.setPosition(position[0], position[1], position[2]);
    group.tags.add('stage08m-street-tech');
    root.addChild(group);
    build(group, district);
    stats.assemblies++;
    stats.byDistrict[district]++;
    return group;
  }

  function cameraUnit(district, position, yaw = 0, cameraName = null, signalPercent = 92) {
    const cameraId = 'cctv-' + district + '-' + (surveillanceCameras.filter(camera => camera.districtKey === district).length + 1);
    let pivot = null;
    const group = assembly(district, 'cctv-camera', position, (g, d) => {
      addBox(g, d, 'cctv-wall-mount', [0, -0.10, 0], [0.48, 0.10, 0.12], m.metal);
      addBox(g, d, 'cctv-wall-bracket', [0, 0.02, -0.05], [0.11, 0.22, 0.10], m.galvanized);
      pivot = entityFactory('stage08m-' + district + '-cctv-pan-tilt-' + surveillanceCameras.length);
      pivot.setLocalPosition(0, 0.12, -0.12);
      pivot.setLocalEulerAngles(0, yaw, 0);
      pivot.tags.add('stage08m-street-tech');
      pivot.tags.add('stage08m-dynamic-cctv-head');
      g.addChild(pivot);
      // The head is deliberately excluded from static batching because its pan/tilt servos move it.
      addBox(pivot, d, 'cctv-camera-body', [0, 0, 0], [0.34, 0.18, 0.34], m.cream, 0, false);
      addBox(pivot, d, 'cctv-camera-hood', [0, 0.10, -0.06], [0.29, 0.055, 0.28], m.dark, 0, false);
      addCylinder(pivot, d, 'cctv-lens', [0, -0.01, -0.18], [0.105, 0.09, 0.07], m.glass, 0, false);
      addBox(pivot, d, 'cctv-status-led', [0.10, -0.03, -0.18], [0.035, 0.035, 0.025], m.screenOn, 0, false);
      addBox(g, d, 'cctv-network-conduit', [0.20, -0.08, 0.02], [0.045, 0.24, 0.045], m.rubber);
    });
    const record = {
      id: cameraId,
      name: cameraName || (district === 'victoriaIsland' ? 'Victoria Island Plaza' : district === 'ekoAtlantic' ? 'Eko Atlantic Waterfront' : district === 'ekiti' ? 'Ekiti Ridge Camera' : district.charAt(0).toUpperCase() + district.slice(1) + ' Street Camera ' + (surveillanceCameras.length + 1)),
      district: district === 'victoriaIsland' ? 'Victoria Island' : district === 'ekoAtlantic' ? 'Eko Atlantic' : district === 'ekiti' ? 'Ekiti Uplands' : district.charAt(0).toUpperCase() + district.slice(1),
      districtKey: district,
      viewPosition: [position[0], position[1] + 0.11, position[2] - 0.30],
      interactionPosition: [position[0], 0, position[2]],
      baseYawDegrees: yaw,
      signalPercent,
      pivot
    };
    surveillanceCameras.push(record);
    addInteraction(district + '-cctv-' + surveillanceCameras.length, record.name + ' CCTV station', record.interactionPosition, 'OPEN · CCTV NETWORK FEED', () => {
      if (typeof onSurveillanceRequest !== 'function') return { message: 'CCTV network controller is offline.' };
      const result = onSurveillanceRequest(record.id);
      return result?.ok ? { message: 'CCTV link established · ' + record.name + ' live.' } : { message: result?.message || 'CCTV link unavailable.' };
    });
    return group;
  }

  function telecomCabinet(district, position, interactive = false) {
    let screenDisplay = null;
    const group = assembly(district, 'telecom-cabinet', position, (g, d) => {
      addBox(g, d, 'telecom-cabinet-plinth', [0, 0.12, 0], [1.05, 0.24, 0.72], m.concrete);
      addBox(g, d, 'telecom-cabinet-shell', [0, 0.86, 0], [0.92, 1.42, 0.62], m.fadedGreen);
      addBox(g, d, 'telecom-cabinet-door', [0, 0.87, 0.32], [0.82, 1.28, 0.035], m.green);
      screenDisplay = addBox(g, d, 'telecom-cabinet-status-screen', [0, 1.24, 0.345], [0.27, 0.16, 0.025], m.screenOn);
      addBox(g, d, 'telecom-cabinet-lock', [0.31, 0.77, 0.35], [0.055, 0.12, 0.04], m.metal);
      for (let i = 0; i < 5; i++) addBox(g, d, 'telecom-cabinet-vent-' + i, [0, 0.48 + i * 0.085, 0.345], [0.48, 0.022, 0.018], m.dark);
      addBox(g, d, 'telecom-cabinet-warning', [-0.30, 1.38, 0.35], [0.18, 0.10, 0.02], m.yellow);
    });
    group.tags.add('network-online');
    if (interactive) addInteraction(district + '-network-cabinet', 'Telecom network cabinet', position, 'CHECK · NETWORK CABINET', () => {
      const online = group.tags.has('network-online');
      if (online) group.tags.remove('network-online'); else group.tags.add('network-online');
      const nextOnline = !online;
      if (screenDisplay?.render) screenDisplay.render.material = nextOnline ? m.screenOn : m.screen;
      onNetworkStatusChange?.(district, nextOnline);
      return { message: nextOnline ? 'Street network cabinet · local service network online.' : 'Street network cabinet · maintenance mode enabled · district CCTV offline.' };
    });
    return group;
  }

  function generatorSet(district, position) {
    return assembly(district, 'neighbourhood-generator', position, (g, d) => {
      addBox(g, d, 'generator-base', [0, 0.14, 0], [1.55, 0.28, 0.92], m.rubber);
      addBox(g, d, 'generator-body', [0, 0.68, 0], [1.36, 0.82, 0.78], m.green);
      addBox(g, d, 'generator-top-cover', [0, 1.12, 0], [1.42, 0.12, 0.84], m.fadedGreen);
      addBox(g, d, 'generator-control-panel', [0.40, 0.73, 0.405], [0.28, 0.30, 0.035], m.dark);
      addBox(g, d, 'generator-panel-meter', [0.40, 0.78, 0.43], [0.12, 0.075, 0.018], m.screenAmber);
      for (let i = 0; i < 6; i++) addBox(g, d, 'generator-side-vent-' + i, [-0.69, 0.47 + i * 0.085, 0.08], [0.025, 0.035, 0.48], m.dark);
      addCylinder(g, d, 'generator-exhaust', [-0.48, 1.29, -0.22], [0.085, 0.28, 0.085], m.metal);
      addBox(g, d, 'generator-warning-stripe', [0, 0.23, 0.47], [0.88, 0.07, 0.025], m.yellow);
    });
  }

  function prepaidMeter(district, position) {
    return assembly(district, 'prepaid-electricity-meter', position, (g, d) => {
      addBox(g, d, 'meter-wall-backplate', [0, 0.72, 0], [0.58, 0.94, 0.12], m.metal);
      addBox(g, d, 'meter-weather-cover', [0, 0.72, 0.09], [0.48, 0.82, 0.11], m.cream);
      addBox(g, d, 'meter-display', [0, 0.84, 0.155], [0.28, 0.15, 0.025], m.screenOn);
      addBox(g, d, 'meter-keypad', [0, 0.56, 0.16], [0.22, 0.20, 0.025], m.dark);
      addBox(g, d, 'meter-service-seal', [0.17, 0.36, 0.16], [0.055, 0.06, 0.025], m.red);
    });
  }

  function solarStreetlight(district, position, panelYaw = 0) {
    return assembly(district, 'solar-streetlight', position, (g, d) => {
      addCylinder(g, d, 'solar-streetlight-pole', [0, 3.1, 0], [0.12, 6.2, 0.12], m.galvanized);
      addBox(g, d, 'solar-streetlight-arm', [0.52, 5.95, 0], [1.12, 0.09, 0.10], m.metal, panelYaw);
      addBox(g, d, 'solar-streetlight-head', [1.04, 5.83, 0], [0.48, 0.18, 0.36], m.cream, panelYaw);
      addBox(g, d, 'solar-streetlight-led-face', [1.04, 5.72, 0], [0.36, 0.035, 0.27], m.screenOn, panelYaw);
      addBox(g, d, 'solar-streetlight-panel-frame', [-0.05, 5.64, -0.58], [1.12, 0.09, 0.78], m.metal, panelYaw);
      addBox(g, d, 'solar-streetlight-panel', [-0.05, 5.70, -0.58], [1.02, 0.035, 0.68], m.solar, panelYaw);
      for (let i = 0; i < 3; i++) addBox(g, d, 'solar-panel-cell-line-' + i, [-0.05 + (i - 1) * 0.27, 5.723, -0.58], [0.018, 0.012, 0.63], m.galvanized, panelYaw);
    });
  }

  function smartGate(district, position, yaw = 0) {
    const group = assembly(district, 'smart-estate-entry-gate', position, (g, d) => {
      addBox(g, d, 'gate-control-pedestal', [0, 0.72, 0], [0.58, 1.44, 0.62], m.graphite, yaw);
      addBox(g, d, 'gate-reader-screen', [0, 1.04, 0.33], [0.30, 0.25, 0.04], m.screenOn, yaw);
      addBox(g, d, 'gate-reader-panel', [0, 0.71, 0.34], [0.32, 0.20, 0.04], m.metal, yaw);
      addBox(g, d, 'gate-reader-led', [0.18, 0.72, 0.37], [0.055, 0.055, 0.025], m.green, yaw);
      addBox(g, d, 'gate-barrier-housing', [0.48, 0.12, 0], [0.26, 0.24, 0.32], m.yellow, yaw);
    });
    const arm = addBox(group, district, 'gate-barrier-arm', [2.05, 0.58, 0], [3.25, 0.10, 0.12], m.white, yaw);
    addBox(group, district, 'gate-barrier-red-band', [1.45, 0.64, 0], [0.42, 0.025, 0.13], m.red, yaw);
    addInteraction(district + '-smart-gate', 'Smart estate access gate', position, 'USE · ACCESS TERMINAL', () => {
      const open = group.tags.has('gate-open');
      if (open) { group.tags.remove('gate-open'); arm.setLocalEulerAngles(0, 0, 0); }
      else { group.tags.add('gate-open'); arm.setLocalEulerAngles(0, 0, -74); }
      return { message: open ? 'Estate access barrier lowered.' : 'Estate access verified · barrier raised.' };
    });
    return group;
  }

  function digitalBillboard(district, position) {
    return assembly(district, 'digital-street-billboard', position, (g, d) => {
      addBox(g, d, 'billboard-support', [0, 2.2, 0], [0.22, 4.4, 0.22], m.metal);
      addBox(g, d, 'billboard-frame', [0, 4.65, 0], [3.45, 2.0, 0.28], m.dark);
      addBox(g, d, 'billboard-screen', [0, 4.65, 0.16], [3.16, 1.72, 0.035], m.screenOn);
      addBox(g, d, 'billboard-brand-panel', [-0.82, 4.66, 0.19], [1.12, 0.72, 0.025], m.blue);
      addBox(g, d, 'billboard-lower-strip', [0, 3.76, 0.17], [3.24, 0.10, 0.04], m.yellow);
    });
  }

  function wifiMast(district, position) {
    return assembly(district, 'public-wifi-mast', position, (g, d) => {
      addCylinder(g, d, 'wifi-mast-pole', [0, 4.0, 0], [0.11, 8.0, 0.11], m.galvanized);
      addBox(g, d, 'wifi-sector-antenna-left', [-0.34, 7.2, 0], [0.16, 1.15, 0.42], m.cream);
      addBox(g, d, 'wifi-sector-antenna-right', [0.34, 7.2, 0], [0.16, 1.15, 0.42], m.cream);
      addBox(g, d, 'wifi-backhaul-radio', [0, 6.0, -0.28], [0.38, 0.55, 0.18], m.blue);
      addBox(g, d, 'wifi-mast-status-light', [0, 8.1, 0], [0.18, 0.12, 0.18], m.screenOn);
      addBox(g, d, 'wifi-cabinet', [0.65, 0.65, 0], [0.75, 1.25, 0.62], m.green);
    });
  }

  function evCharger(district, position, interactive = false) {
    let screenDisplay = null;
    const group = assembly(district, 'electric-vehicle-charger', position, (g, d) => {
      addBox(g, d, 'ev-charger-base', [0, 0.12, 0], [0.62, 0.24, 0.62], m.concrete);
      addBox(g, d, 'ev-charger-pedestal', [0, 1.0, 0], [0.48, 1.68, 0.34], m.cream);
      screenDisplay = addBox(g, d, 'ev-charger-screen', [0, 1.34, 0.19], [0.30, 0.28, 0.025], interactive ? m.screenOn : m.screen);
      addBox(g, d, 'ev-charger-logo', [0, 0.94, 0.19], [0.18, 0.10, 0.025], m.green);
      addCylinder(g, d, 'ev-charger-cable-hook', [0.31, 0.82, 0], [0.06, 0.30, 0.06], m.dark);
      addCylinder(g, d, 'ev-charger-cable', [0.42, 0.55, 0.04], [0.035, 0.72, 0.035], m.rubber);
    });
    if (interactive) addInteraction(district + '-ev-charger', 'EV charging station', position, 'CHECK · CHARGING STATION', () => {
      const charging = group.tags.has('charging-session');
      if (charging) group.tags.remove('charging-session'); else group.tags.add('charging-session');
      if (screenDisplay?.render) screenDisplay.render.material = charging ? m.screen : m.screenAmber;
      return { message: charging ? 'EV charging session ended.' : 'EV charging station · charging session started.' };
    });
    return group;
  }

  function intercom(district, position) {
    const group = assembly(district, 'compound-video-intercom', position, (g, d) => {
      addBox(g, d, 'intercom-backplate', [0, 0.78, 0], [0.52, 1.05, 0.14], m.metal);
      addBox(g, d, 'intercom-weather-face', [0, 0.78, 0.10], [0.43, 0.93, 0.09], m.graphite);
      addBox(g, d, 'intercom-camera-lens', [0, 1.08, 0.16], [0.09, 0.09, 0.025], m.glass);
      addBox(g, d, 'intercom-display', [0, 0.88, 0.16], [0.28, 0.17, 0.025], m.screenOn);
      addBox(g, d, 'intercom-speaker', [0, 0.62, 0.16], [0.20, 0.07, 0.025], m.metal);
      addBox(g, d, 'intercom-call-button', [0, 0.42, 0.16], [0.12, 0.10, 0.025], m.yellow);
    });
    addInteraction(district + '-compound-intercom', 'Compound video intercom', position, 'RING · COMPOUND INTERCOM', () => ({ message: 'Compound intercom · calling the home security desk.' }));
    return group;
  }

  function posTerminal(district, position) {
    return assembly(district, 'roadside-pos-terminal', position, (g, d) => {
      addBox(g, d, 'pos-counter', [0, 0.62, 0], [1.15, 0.14, 0.72], m.wood || m.cream);
      addBox(g, d, 'pos-terminal-body', [0, 0.94, 0], [0.28, 0.43, 0.12], m.dark);
      addBox(g, d, 'pos-terminal-screen', [0, 1.02, 0.07], [0.22, 0.16, 0.025], m.screenOn);
      addBox(g, d, 'pos-terminal-keypad', [0, 0.83, 0.07], [0.18, 0.09, 0.025], m.metal);
      addBox(g, d, 'pos-counter-leg-left', [-0.44, 0.30, 0], [0.08, 0.58, 0.08], m.metal);
      addBox(g, d, 'pos-counter-leg-right', [0.44, 0.30, 0], [0.08, 0.58, 0.08], m.metal);
    });
  }

  function transformer(district, position) {
    return assembly(district, 'neighbourhood-transformer', position, (g, d) => {
      addBox(g, d, 'transformer-concrete-base', [0, 0.16, 0], [1.9, 0.32, 1.45], m.concrete);
      addBox(g, d, 'transformer-enclosure', [0, 1.14, 0], [1.65, 1.72, 1.22], m.green);
      addBox(g, d, 'transformer-door', [0, 1.13, 0.63], [1.42, 1.46, 0.04], m.fadedGreen);
      for (let i = 0; i < 7; i++) addBox(g, d, 'transformer-vent-' + i, [0, 0.60 + i * 0.10, 0.67], [0.72, 0.025, 0.018], m.dark);
      addBox(g, d, 'transformer-warning-sign', [0.50, 1.68, 0.67], [0.20, 0.19, 0.025], m.yellow);
      for (let i = 0; i < 3; i++) addCylinder(g, d, 'transformer-insulator-' + i, [-0.40 + i * 0.40, 2.17, -0.20], [0.12, 0.30, 0.12], m.cream);
    });
  }

  function addInteraction(id, name, position, prompt, onInteract) {
    interactions.push({ id: 'stage08m-' + id, name, position: position.slice(), range: 3.0, prompt, onInteract });
    stats.interactiveDevices++;
  }

  // Yaba: dense telecom, retail-payment and surveillance infrastructure.
  cameraUnit('yaba', [13.0, 5.1, -34], 180, 'Yaba Junction East', 97);
  cameraUnit('yaba', [-13.0, 5.0, -62], 0, 'Yaba Workshop Row', 93);
  telecomCabinet('yaba', [12.2, 0, -53], true);
  posTerminal('yaba', [-13.2, 0, -20]);

  // Alimosho: generator-backed streets, prepaid power and neighbourhood utility hardware.
  generatorSet('alimosho', [-318, 0, 374]);
  prepaidMeter('alimosho', [-188, 0, 412]);
  cameraUnit('alimosho', [-300, 4.9, 454], 90, 'Alimosho Market Road', 86);
  transformer('alimosho', [-322, 0, 428]);

  // Lekki: gated estates, solar-powered lighting and modern security fixtures.
  smartGate('lekki', [181, 0, 276], 90);
  solarStreetlight('lekki', [316, 0, 238], 12);
  cameraUnit('lekki', [319, 4.8, 300], 180, 'Lekki Estate Gate', 95);
  telecomCabinet('lekki', [183, 0, 316], false);

  // Victoria Island: digital advertising, commercial charging and managed access.
  digitalBillboard('victoriaIsland', [311, 0, 17]);
  evCharger('victoriaIsland', [188, 0, 90], true);
  cameraUnit('victoriaIsland', [321, 5.0, 73], 90, 'Victoria Island Boulevard', 98);

  // Eko Atlantic: connected waterfront and high-capacity public infrastructure.
  wifiMast('ekoAtlantic', [577, 0, 78]);
  evCharger('ekoAtlantic', [416, 0, 13], true);
  solarStreetlight('ekoAtlantic', [572, 0, 10], -15);
  cameraUnit('ekoAtlantic', [577, 5.1, 78], 90, 'Eko Atlantic Waterfront', 90);

  // Ekiti uplands: solar power, home intercoms and compound security.
  solarStreetlight('ekiti', [-312, 0, 708], 0);
  intercom('ekiti', [-184, 0, 625]);
  prepaidMeter('ekiti', [-314, 0, 618]);
  cameraUnit('ekiti', [-312, 5.0, 708], 0, 'Ekiti Ridge View', 88);

  return {
    stage: '08M',
    batchGroupId: batchGroup?.id ?? null,
    staticCandidates: stats.batchedRenderParts,
    renderParts: stats.renderParts,
    dynamicRenderParts: stats.dynamicRenderParts,
    assemblyCount: stats.assemblies,
    interactiveDevices: stats.interactiveDevices,
    surveillanceCameras,
    setSurveillanceRequestHandler(handler) { onSurveillanceRequest = typeof handler === 'function' ? handler : null; return surveillanceCameras.length; },
    setNetworkStatusHandler(handler) { onNetworkStatusChange = typeof handler === 'function' ? handler : null; return true; },
    byDistrict: { ...stats.byDistrict },
    interactions,
    features: [
      'seven motorised network CCTV stations with live remote pan/tilt/zoom feeds', 'telecom and fibre distribution cabinets',
      'neighbourhood generator sets', 'prepaid electricity meters', 'solar streetlights',
      'smart estate access barriers', 'digital commercial billboards', 'public Wi-Fi mast',
      'EV charging stations', 'compound video intercoms', 'roadside POS terminal',
      'neighbourhood transformer enclosure'
    ]
  };
}
