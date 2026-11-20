import assert from 'node:assert/strict';
import { classifyRecoverySide, deriveRecoveryYaw, estimateBoneVelocities, interpolateCharacterPose, smoothStep01 } from '../src/character-recovery.js';

const half = Math.SQRT1_2;
const faceUp = { head: { rotation: [-half, 0, 0, half], position: [0, 1, 0] } };
const faceDown = { head: { rotation: [half, 0, 0, half], position: [0, 1, 0] } };
const side = { head: { rotation: [0, 0, 0, 1], position: [0, 1, 0] } };
assert.equal(classifyRecoverySide(faceUp), 'face-up');
assert.equal(classifyRecoverySide(faceDown), 'face-down');
assert.equal(classifyRecoverySide(side), 'side');
assert.ok(Number.isFinite(deriveRecoveryYaw(faceUp, 23)));
assert.equal(deriveRecoveryYaw({ head: { rotation: [0,0,0,0] } }, 23), 23);

const from = { hips: { position: [0,0,0], rotation: [0,0,0,1] } };
const to = { hips: { position: [2,1,-2], rotation: [0,half,0,half] } };
const blended = interpolateCharacterPose(from, to, .5);
assert.deepEqual(blended.hips.position, [1,.5,-1]);
assert.ok(Math.abs(Math.hypot(...blended.hips.rotation)-1) < 1e-6, 'blended rotation must remain normalized');
assert.ok(smoothStep01(.5) > .49 && smoothStep01(.5) < .51);

const previous = { hips: { position: [0,0,0], rotation: [0,0,0,1] } };
const current = { hips: { position: [.1,0,0], rotation: [0,Math.sin(.05),0,Math.cos(.05)] } };
const velocity = estimateBoneVelocities(previous, current, .1);
assert.ok(Math.abs(velocity.hips.linear[0]-1) < .001);
assert.ok(Math.abs(velocity.hips.angular[1]-1) < .01);
assert.ok(velocity.hips.linear.every(Number.isFinite) && velocity.hips.angular.every(Number.isFinite));
console.log('Character recovery tests passed: front/back classification, pose blending, yaw recovery, smoothstep and per-bone motion estimates.');
