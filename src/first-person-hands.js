import * as pc from 'playcanvas';

function sourceMaterial(character, pattern) {
  for (const render of character?.root?.findComponents?.('render') || []) {
    for (const item of render.meshInstances || []) {
      if (item.material?.name && pattern.test(item.material.name)) return item.material;
    }
  }
  return null;
}

function makeMaterial(source, name, colour) {
  const material = source?.clone?.() || new pc.StandardMaterial();
  material.name = name;
  if (!source) material.diffuse = new pc.Color(...colour);
  material.shininess = source?.shininess ?? 18;
  material.update();
  return material;
}

export function createFirstPersonHands({ camera, heroCharacter, lowMemoryDevice = false } = {}) {
  if (!camera) throw new Error('First-person hands require a camera.');
  const root = new pc.Entity('first-person-unarmed-hands');
  camera.addChild(root);
  root.enabled = false;
  const jacket = sourceMaterial(heroCharacter, /suit jacket|silk blouse/i);
  const skin = sourceMaterial(heroCharacter, /^skin$/i);
  const sleeve = makeMaterial(jacket, 'FP jacket sleeve', [0.10, 0.13, 0.14]);
  const hand = makeMaterial(skin, 'FP skin', [0.42, 0.28, 0.22]);
  const parts = [];
  const add = (name, type, pos, scale, angle, material) => {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type, material });
    entity.render.castShadows = entity.render.receiveShadows = false;
    entity.setLocalPosition(...pos);
    entity.setLocalScale(...scale);
    entity.setLocalEulerAngles(0, 0, angle);
    root.addChild(entity);
    parts.push(entity);
  };
  for (const side of [-1, 1]) {
    const label = side < 0 ? 'left' : 'right';
    add(label + '-sleeve', 'capsule', [side * .35, -.53, -.66], [.17, .45, .16], side * 28, sleeve);
    add(label + '-forearm', 'capsule', [side * .18, -.23, -.90], [.12, .29, .12], side * 20, hand);
    add(label + '-palm', 'sphere', [side * .105, -.035, -1.055], [.115, .085, .055], side * 10, hand);
    if (!lowMemoryDevice) add(label + '-thumb', 'capsule', [side * .195, -.055, -1.045], [.035, .095, .035], side * 42, hand);
  }
  let visible = false, phase = 0;
  const setVisible = value => (root.enabled = visible = Boolean(value));
  const update = (dt, state = {}) => {
    if (!visible) return;
    phase += Math.max(0, Math.min(.05, Number(dt) || 0)) * (state.moving ? 7 : 2);
    root.setLocalPosition(0, Math.sin(phase) * (state.moving ? .009 : .001), 0);
  };
  return {
    root, setVisible, update,
    getState: () => ({ available: true, visible, meshCount: parts.length, lowMemoryProfile: !!lowMemoryDevice, pose: 'open-neutral' }),
    destroy: () => { root.destroy(); sleeve.destroy?.(); hand.destroy?.(); }
  };
}
