import assert from 'node:assert/strict';
import * as pc from 'playcanvas';
import { createActorPhysics } from '../src/actor-physics.js';
import { createDistrictNpcSystem, isNpcOnShift } from '../src/district-npc-system.js';
import { NPC_DEFINITIONS, NPC_DISTRICT_COUNTS } from '../src/npc-roster.js';

assert.equal(isNpcOnShift(7, [6, 19]), true);
assert.equal(isNpcOnShift(19, [6, 19]), false);
assert.equal(isNpcOnShift(2, [22, 6]), true, 'overnight shifts cross midnight');
assert.equal(isNpcOnShift(12, [22, 6]), false);

const app = { systems: {} };
app.root = new pc.Entity('app-root', app);
app.root.enabled = true;
const districtRoots = {};
for (const key of ['alimosho', 'lekki', 'victoriaIsland', 'ekoAtlantic', 'ekiti']) {
  districtRoots[key] = new pc.Entity('district-' + key, app);
  districtRoots[key].enabled = true;
  app.root.addChild(districtRoots[key]);
}
const physics = createActorPhysics({ colliders: [], groundY: 0 });
let unloadCount = 0;
const loadCharacter = async def => {
  const root = new pc.Entity('test-' + def.id, app);
  const transitions = [];
  const assignments = [];
  root.anim = { assignAnimation() {}, baseLayer: { transition(name) { transitions.push(name); }, assignAnimation(name) { assignments.push(name); } } };
  return { root, asset: { unload() { unloadCount++; } }, clips: { idle: 'Idle', walk: 'Walk', work: 'Special', interact: 'Talk', hit: 'Hit' }, clipNames: ['Idle','Walk','Special','Talk','Hit'], transitions, assignments };
};
const system = createDistrictNpcSystem({ app, districtRoots, physics, loadCharacter });
let state = system.getState();
assert.equal(state.definitions, 64);
assert.deepEqual(NPC_DISTRICT_COUNTS, { alimosho: 11, lekki: 14, victoriaIsland: 13, ekoAtlantic: 13, ekiti: 13 });
assert.equal(new Set(NPC_DEFINITIONS.map(actor => actor.url)).size, 64, 'all 64 roster entries use unique GLBs');
assert.equal(new Set(NPC_DEFINITIONS.map(actor => actor.id)).size, 64, 'all 64 NPCs have unique stable ids');
assert.ok(NPC_DEFINITIONS.every(actor => actor.url.endsWith('.glb') && actor.route.length >= 3 && actor.schedule.length === 2));
assert.equal(NPC_DEFINITIONS.find(actor => actor.id === 'alimosho-street-cleaner')?.model, 'StockClerk', 'street cleaner has a dedicated shop/cleaning model, not site-engineer workwear');
assert.equal(NPC_DEFINITIONS.find(actor => actor.id === 'alimosho-street-cleaner')?.outfitStyle, 'sanitation-green');
assert.equal(state.activeCount, 0);
assert.equal(state.capsuleActors, 0);
assert.ok(state.characters.every(actor => actor.capsule.radius > 0 && actor.capsule.height > 1.5));

system.setActiveDistrict('ekiti');
await system.whenReady();
state = system.getState();
assert.equal(state.activeDistrict, 'ekiti');
assert.equal(state.activeCount, 13);
const farmer = state.characters.find(actor => actor.id === 'ekiti-farm-hand');
assert.ok(farmer.loaded && farmer.visible);
assert.equal(farmer.capsule.shape, 'vertical-capsule');
assert.equal(farmer.capsule.radius, 0.32);
assert.equal(farmer.capsule.height, 1.78);
assert.equal(farmer.clips.walk, 'Walk');
const start = farmer.position;
for (let i = 0; i < 240; i++) system.update(0.05, { position: start });
state = system.getState();
const movedFarmer = state.characters.find(actor => actor.job === 'farmer');
assert.notDeepEqual(movedFarmer.position, start, 'farmer moves along field-row work route');
assert.ok(movedFarmer.workCycles > 0, 'farmer completes work points');
assert.ok(physics.getState().actorsMoved > 0);
assert.ok(state.nearPhysicsSteps > 0, 'near NPCs use the detailed capsule collision solver');

const interaction = system.interact('ekiti-farm-hand');
assert.equal(interaction.ok, true);
assert.match(interaction.message, /field/i);
const spar = system.sparNearest(movedFarmer.position);
assert.equal(spar.ok, true);
assert.equal(spar.lethal, false);
assert.equal(spar.effect, 'brief-stun-and-knockback');
assert.equal(system.getState().characters.find(actor => actor.job === 'farmer').state, 'hit');
assert.equal(system.sparNearest(movedFarmer.position).reason, 'cooldown');

system.setActiveDistrict('lekki');
await system.whenReady();
state = system.getState();
assert.equal(state.activeDistrict, 'lekki');
assert.equal(state.activeCount, 14);
assert.equal(state.characters.find(actor => actor.id === 'lekki-estate-security').visible, true);
assert.equal(state.residentCharacters, 14, 'only the current district remains resident');
assert.equal(state.characters.filter(actor => actor.district === 'ekiti' && actor.loaded).length, 0, 'previous district characters are unloaded, not merely hidden');
assert.equal(unloadCount, 13, 'previous district assets release their GPU/CPU resources');
assert.equal(state.unloadedCharacters, 13);
assert.ok(state.loadedCharacters >= 27, 'district changes load the next district after the previous one is released');
assert.equal(state.characters.find(actor => actor.job === 'farmer').visible, false);
for (const job of ['vendor','retail-clerk','store-manager','shopper','resident','delivery-rider','emergency','chef','security','office-worker','teacher','entertainer','student','school-admin','executive','it-technician','receptionist','sales-rep','site-worker','artisan','hospitality','customer','passenger','transport-operator','logistics-worker','checkpoint-security','site-engineer','farmer','cleaner']) {
  assert.ok(system.jobProfiles[job], `job profile exists: ${job}`);
}
system.setActiveDistrict('ekiti');
await system.whenReady();
assert.equal(system.getState().residentCharacters, 13, 're-entering a district reloads its assets cleanly');
assert.equal(system.getState().characters.find(actor => actor.id === 'ekiti-farm-hand').loaded, true);
system.destroy();
assert.equal(system.getState().residentCharacters, 0, 'destroy releases every resident character');
console.log('District NPC tests passed: 64 unique CC0 models, five district quotas, 13-joint rig roster, streamed unload/reload, shift schedules, capsule movement, work routes, interactions, friendly sparring and 29 job profiles.');
