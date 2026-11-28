import assert from 'node:assert/strict';
import * as pc from 'playcanvas';
import { createDistrictActivitySystem } from '../src/district-activity-system.js';

const app = { systems: { render: { addComponent(entity, data) { entity.c.render = { ...data, meshInstances: [], enabled: true, system: this, onEnable() {}, onDisable() {}, onPostStateChange() {} }; return entity.c.render; }, removeComponent(entity) { delete entity.c.render; } } } };
app.root = new pc.Entity('app-root', app);
app.root.enabled = true;
const districtRoots = {};
for (const key of ['alimosho', 'lekki', 'victoriaIsland', 'ekoAtlantic', 'ekiti']) {
  districtRoots[key] = new pc.Entity('district-' + key, app);
  districtRoots[key].enabled = true;
  app.root.addChild(districtRoots[key]);
}
const system = createDistrictActivitySystem({ app, districtRoots, lowMemoryDevice: false });
let state = system.getState();
assert.equal(state.districtCount, 5, 'ambient actors are authored for all five expansion districts');
assert.equal(state.activeDistrict, null, 'remote populations begin dormant');
assert.equal(state.activePedestrians, 0);
assert.equal(state.activeVehicles, 0);
for (const key of Object.keys(districtRoots)) {
  assert.equal(state.districts[key].pedestrians.length, 2, key + ' has two role-specific ambient people');
  assert.equal(state.districts[key].vehicles.length, 1, key + ' has one moving local vehicle');
  assert.ok(state.districts[key].pedestrians.every(actor => !actor.visible), key + ' population is dormant until observed');
  assert.equal(state.districts[key].vehicles[0].visible, false);
  assert.equal(districtRoots[key].findByName('district-npc-' + key + '-0').parent, districtRoots[key], 'NPCs belong to their streamed district root');
}

state = system.setActiveDistrict('lekki');
assert.equal(state.activeDistrict, 'lekki');
assert.equal(state.activePedestrians, 2);
assert.equal(state.activeVehicles, 1);
assert.ok(state.districts.lekki.pedestrians.every(actor => actor.visible));
assert.equal(state.districts.lekki.vehicles[0].visible, true);
assert.ok(state.districts.lekki.pedestrians.some(actor => actor.role === 'Estate security officer'));
assert.ok(state.districts.lekki.pedestrians.some(actor => actor.outfit.includes('Casual')));
assert.ok(state.districts.alimosho.pedestrians.every(actor => !actor.visible), 'other districts remain hidden to protect mobile performance');
const before = state.districts.lekki.pedestrians[0].position;
for (let i = 0; i < 20; i++) system.update(0.05);
state = system.getState();
assert.notDeepEqual(state.districts.lekki.pedestrians[0].position, before, 'remote pedestrians move along their local sidewalk route');
assert.ok(state.vehicleSteps > 0, 'remote vehicles receive live movement updates');
assert.equal(state.updates, 20);

state = system.setActiveDistrict('ekiti');
assert.equal(state.activeDistrict, 'ekiti');
assert.ok(state.districts.ekiti.pedestrians.some(actor => actor.role === 'Smallholder farmer'));
assert.ok(state.districts.ekiti.pedestrians.some(actor => actor.role === 'Local trader'));
assert.ok(state.districts.lekki.pedestrians.every(actor => !actor.visible), 'switching cameras deactivates the previous district population');
state = system.setActiveDistrict(null);
assert.equal(state.activeDistrict, null);
assert.equal(state.activePedestrians, 0);
assert.equal(state.activeVehicles, 0);
system.destroy();
console.log('District activity tests passed: five district populations, role/outfit metadata, live pedestrian/vehicle movement, and single-district activation.');
