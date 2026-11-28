import assert from 'node:assert/strict';
import { createStage08MStreetTech } from '../src/stage-08m-street-tech.js';

class FakeTags {
  values = new Set();
  add(value) { this.values.add(value); }
  has(value) { return this.values.has(value); }
  remove(value) { this.values.delete(value); }
}
class FakeEntity {
  constructor(name) { this.name = name; this.children = []; this.tags = new FakeTags(); this.render = null; this.position = [0, 0, 0]; }
  addChild(child) { this.children.push(child); child.parent = this; }
  addComponent(type, options) { if (type === 'render') this.render = { ...options, enabled: true }; }
  setPosition(x, y, z) { this.position = [x, y, z]; }
  setLocalPosition(x, y, z) { this.position = [x, y, z]; }
  setLocalScale() {}
  setEulerAngles() {}
  setLocalEulerAngles() {}
  findByTag(tag) { const out = []; const visit = node => { if (node.tags?.has(tag)) out.push(node); for (const child of node.children || []) visit(child); }; visit(this); return out; }
}
const app = { root: new FakeEntity('test-root'), batcher: { addGroup: () => ({ id: 108 }) } };
const material = rgb => ({ diffuse: { r: rgb[0], g: rgb[1], b: rgb[2] }, update() {} });
const entityFactory = name => new FakeEntity(name);
const box = (name, position, scale, mat, parent = app.root) => {
  const entity = entityFactory(name);
  entity.addComponent('render', { type: 'box', material: mat });
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);
  parent.addChild(entity);
  return entity;
};

const stage = createStage08MStreetTech({ app, box, material, entityFactory });
assert.equal(stage.stage, '08M');
assert.equal(stage.assemblyCount, 23, 'the rollout includes twenty-three street-tech assemblies');
assert.equal(stage.interactiveDevices, 12, 'five utilities and seven CCTV stations expose world interactions');
assert.ok(stage.staticCandidates > stage.assemblyCount * 3, 'assemblies contain multiple visible render parts');
assert.deepEqual(Object.keys(stage.byDistrict).sort(), ['alimosho', 'ekoAtlantic', 'ekiti', 'lekki', 'victoriaIsland', 'yaba'].sort());
assert.equal(stage.interactions.length, 12);
assert.equal(stage.surveillanceCameras.length, 7, 'one connected CCTV camera is available in each district, with a second in Yaba');
assert.ok(stage.dynamicRenderParts >= 28, 'moving pan/tilt camera heads stay out of static batches');
assert.ok(stage.surveillanceCameras.every(camera => camera.signalPercent >= 25 && Boolean(camera.pivot)));
assert.ok(stage.interactions.every(item => item.id.startsWith('stage08m-') && item.range > 0));
assert.ok(app.root.findByTag('stage08m-street-tech').length > stage.staticCandidates, 'the street-tech scene is tagged for diagnostics');
assert.equal(stage.batchGroupId, 108);
let requestedCamera = null;
stage.setSurveillanceRequestHandler(id => { requestedCamera = id; return { ok: true }; });
const cameraStation = stage.interactions.find(item => item.id.endsWith('yaba-cctv-1')) || stage.interactions.find(item => item.id.includes('cctv')) ;
assert.ok(cameraStation, 'CCTV station is registered as a world interaction');
assert.ok(cameraStation.onInteract().message.includes('CCTV link established'));
assert.ok(requestedCamera, 'CCTV interaction opens the matching remote feed');
const network = stage.interactions.find(item => item.id.endsWith('yaba-network-cabinet'));
assert.ok(network, 'Yaba network cabinet is interactable');
let networkChange = null;
stage.setNetworkStatusHandler((district, online) => { networkChange = { district, online }; });
const networkScreen = app.root.findByTag('stage08m-street-tech').find(entity => entity.name === 'stage08m-yaba-telecom-cabinet-status-screen');
assert.ok(networkScreen?.render?.material, 'telecom status display is authored');
const networkMaterialBefore = networkScreen.render.material;
assert.match(network.onInteract().message, /maintenance mode/i);
assert.notEqual(networkScreen.render.material, networkMaterialBefore, 'network cabinet screen changes when maintenance mode is enabled');
assert.deepEqual(networkChange, { district: 'yaba', online: false }, 'the telecom cabinet can put its district camera network into maintenance mode');
const networkMaterialOffline = networkScreen.render.material;
assert.match(network.onInteract().message, /network online/i);
assert.notEqual(networkScreen.render.material, networkMaterialOffline, 'network cabinet screen changes when the local network returns online');
assert.deepEqual(networkChange, { district: 'yaba', online: true }, 'restoring the network brings district cameras back online');
const gate = stage.interactions.find(item => item.id.endsWith('lekki-smart-gate'));
assert.ok(gate, 'Lekki smart gate is interactable');
assert.match(gate.onInteract().message, /barrier raised/i);
assert.match(gate.onInteract().message, /barrier lowered/i);
const charger = stage.interactions.find(item => item.id.endsWith('victoriaIsland-ev-charger'));
assert.ok(charger, 'Victoria Island EV charger is interactable');
assert.match(charger.onInteract().message, /charging session started/i);
assert.match(charger.onInteract().message, /charging session ended/i);

console.log('Stage 08M street-tech tests passed: 23 assemblies, seven moving CCTV heads, six district sets, twelve interactions and static/dynamic batching separation.');
