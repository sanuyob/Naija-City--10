import assert from 'node:assert/strict';
import { createCharacterVitals } from '../src/character-vitals.js';
import { BT, action, condition, createBehaviourTree, selector, sequence } from '../src/behavior-tree.js';
import { createCharacterPerception, hasClearLineOfSight } from '../src/character-perception.js';
import { createNavigationGrid } from '../src/navigation-grid.js';
import { createWorldInteractionSystem } from '../src/world-interaction-system.js';
import { createFacialAnimation } from '../src/facial-animation.js';
import { makeFootPlantTarget, solveTwoBoneIK } from '../src/two-bone-ik.js';
import { chooseMotionCandidate } from '../src/motion-matching.js';

const vitals = createCharacterVitals({ staminaDrainPerSecond: 10, staminaRegenPerSecond: 20, staminaRegenDelay: .2, damageInvulnerability: .4 });
vitals.update(.05, { sprinting: true });
assert.ok(vitals.getState().stamina < 100, 'sprinting drains stamina');
const damaged = vitals.applyDamage(30, { source: 'test-impact' });
assert.equal(damaged.applied, true);
assert.equal(vitals.getState().health, 70);
assert.equal(vitals.applyDamage(15).applied, false, 'invulnerability prevents immediate repeat damage');
vitals.update(.05); assert.equal(vitals.getState().health, 70);
for (let i=0;i<12;i++) vitals.update(.05); assert.ok(vitals.getState().stamina > 0);
vitals.applyDamage(100);
assert.equal(vitals.getState().state, 'downed');
assert.equal(vitals.recover({ health: 45, stamina: 20 }).applied, true);
assert.equal(vitals.getState().health, 45);
assert.equal(vitals.heal(20, { source: 'test-medkit' }).health, 65);
assert.equal(vitals.getState().healingEvents, 1);
assert.equal(vitals.consumeStamina(5, { source: 'test-action' }), true);

let treeValue = 0;
const tree = createBehaviourTree(selector(
  sequence(condition(ctx => ctx.alert), action(() => { treeValue = 2; return BT.SUCCESS; })),
  action(() => { treeValue = 1; return BT.SUCCESS; })
));
tree.tick({ alert: false }); assert.equal(treeValue, 1);
tree.tick({ alert: true }); assert.equal(treeValue, 2);
assert.equal(tree.getState().ticks, 2);

const wall = { position: [0, 1, -2.5], halfExtents: [.55, 1, .55] };
assert.equal(hasClearLineOfSight([0, 1.4, 0], [0, 1.1, -5], []), true);
assert.equal(hasClearLineOfSight([0, 1.4, 0], [0, 1.1, -5], [wall]), false);
const senses = createCharacterPerception({ occluders: [wall], viewDistance: 10, fieldOfView: 100, hearingDistance: 8 });
assert.equal(senses.sense({ position: [0,0,0], yaw: 0 }, { position: [0,0,-5] }).visible, false);
const clearSenses = createCharacterPerception({ viewDistance: 10, fieldOfView: 100 });
assert.equal(clearSenses.sense({ position: [0,0,0], yaw: 0 }, { position: [0,0,-5] }).visible, true);
assert.equal(clearSenses.sense({ position: [0,0,0], yaw: 0 }, { position: [0,0,5] }).visible, false, 'vision cone excludes targets behind the observer');
const audible = senses.sense({ position: [0,0,0], yaw: 0 }, { position: [0,0,-5] }, { running: true });
assert.equal(audible.heard, true);
assert.ok(senses.getState().checks >= 2);

const nav = createNavigationGrid({ colliders: [{ position: [0,1,0], halfExtents: [.6,1,2.5] }], cellSize: .5 });
const route = nav.findPath([-3,0,0], [3,0,0], { radius: .2, maxNodes: 1800 });
assert.ok(route.length > 2, 'A* routes around a wall instead of crossing it');
assert.ok(route.some(point => Math.abs(point[2]) > 2.5), 'the route uses a clear detour');
assert.ok(nav.getState().pathsFound === 1);

let interacted = 0;
const interactions = createWorldInteractionSystem({ getPlayerState: () => ({ position: [0,0,0] }) });
interactions.register({ id: 'kiosk', name: 'Street kiosk', position: [1,0,0], range: 2, onInteract: () => { interacted++; return 'Hello from the kiosk'; } });
assert.equal(interactions.findNearest().available, true);
assert.equal(interactions.interact().success, true);
assert.equal(interacted, 1);
assert.equal(interactions.setEnabled('kiosk', false), true);
assert.equal(interactions.findNearest(), null);

const applied = new Map();
const face = createFacialAnimation({ morphNames: ['mouthSmile','browInnerUp','eyeBlinkLeft','eyeBlinkRight','viseme_aa'], setFaceExpression: (name, weight) => applied.set(name, weight) }, { blinkInterval: .1, blinkDuration: .1 });
assert.equal(face.setExpression('happy'), true);
for (let i=0;i<20;i++) face.update(1/60);
assert.ok((applied.get('mouthSmile') || 0) > .3);
face.setViseme('aa', .75);
for (let i=0;i<10;i++) face.update(1/60);
assert.ok((applied.get('viseme_aa') || 0) > .3);
for (let i=0;i<90;i++) face.update(1/60);
assert.ok(face.getState().blinkCount >= 1);

const ik = solveTwoBoneIK([0,0,0], [0,-1.5,0], .9, .9, [0,0,1]);
assert.ok(Math.abs(Math.hypot(...[ik.joint[0]-ik.root[0],ik.joint[1]-ik.root[1],ik.joint[2]-ik.root[2]])-.9) < 1e-6);
assert.ok(Math.abs(Math.hypot(ik.effector[0]-ik.joint[0],ik.effector[1]-ik.joint[1],ik.effector[2]-ik.joint[2])-.9) < 1e-6);
assert.equal(makeFootPlantTarget([0,.2,0], { point: [0,0,0], normal: [0,1,0], surface: 'concrete' }).surface, 'concrete');

const selected = chooseMotionCandidate([
  { id: 'walk-straight', speed: 1.5, direction: [0,1], turnRate: 0, state: 'locomotion' },
  { id: 'run-turn', speed: 4, direction: [1,0], turnRate: .5, state: 'locomotion' }
], { speed: 1.4, direction: [0,1], turnRate: 0, state: 'locomotion' });
assert.equal(selected.id, 'walk-straight');

console.log('Character simulation core tests passed: vitals, behavior tree, perception/LOS, A* navigation, interactions, facial morphs/blink, two-bone IK and motion-feature scoring.');
