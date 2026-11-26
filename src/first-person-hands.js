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
  const root = new pc.Entity('first-person-unarmed-hands');
  camera.addChild(root);
  root.enabled = false;
  const sleeve = makeMaterial(sourceMaterial(heroCharacter, /suit jacket|silk blouse/i), 'FP jacket sleeve', [.10, .13, .14]);
  const skin = makeMaterial(sourceMaterial(heroCharacter, /^skin$/i), 'FP skin', [.42, .28, .22]);
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
    add(label + '-forearm', 'capsule', [side * .18, -.23, -.90], [.12, .29, .12], side * 20, skin);
    add(label + '-palm', 'sphere', [side * .105, -.035, -1.055], [.115, .085, .055], side * 10, skin);
    if (!lowMemoryDevice) add(label + '-thumb', 'capsule', [side * .195, -.055, -1.045], [.035, .095, .035], side * 42, skin);
  }
  return {
    root,
    setVisible: value => (root.enabled = Boolean(value)),
    getState: () => ({ enabled: root.enabled, partCount: parts.length }),
    destroy: () => { root.destroy(); sleeve.destroy?.(); skin.destroy?.(); }
  };
}
