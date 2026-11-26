import * as pc from 'playcanvas';

function findSourceMaterial(character, pattern) {
  for (const render of character?.root?.findComponents?.('render') || []) {
    for (const instance of render.meshInstances || []) {
      const material = instance.material;
      if (material?.name && pattern.test(material.name)) return material;
    }
  }
  return null;
}

function makeMaterial(source, name, fallbackColour) {
  const material = source?.clone?.() || new pc.StandardMaterial();
  material.name = name;
  if (!source) material.diffuse = new pc.Color(...fallbackColour);
  material.shininess = source?.shininess ?? 18;
  material.update();
  return material;
}

/**
 * Camera-local, unarmed first-person hands. Reuses Ara's existing jacket/skin
 * material appearance where possible and keeps the geometry budget small.
 */
export function createFirstPersonHands({ camera, heroCharacter, lowMemoryDevice = false } = {}) {
  if (!camera) throw new Error('First-person hands require the game camera.');
  const root = new pc.Entity('first-person-unarmed-hands');
  camera.addChild(root);
  root.enabled = false;

  const jacketSource = findSourceMaterial(heroCharacter, /suit jacket|silk blouse/i);
  const skinSource = findSourceMaterial(heroCharacter, /^skin$/i);
  const sleeveMaterial = makeMaterial(jacketSource, 'FP hands · jacket sleeve', [0.10, 0.13, 0.14]);
  const skinMaterial = makeMaterial(skinSource, 'FP hands · skin', [0.42, 0.28, 0.22]);
  const parts = [];

  function addShape(name, type, position, scale, euler, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type, material });
    entity.render.castShadows = false;
    entity.render.receiveShadows = false;
    entity.setLocalPosition(...position);
    entity.setLocalScale(...scale);
    entity.setLocalEulerAngles(...euler);
    root.addChild(entity);
    parts.push(entity);
  }

  addShape('fp-left-sleeve', 'capsule', [-0.35, -0.53, -0.66], [0.17, 0.45, 0.16], [0, 0, -28], sleeveMaterial);
  addShape('fp-right-sleeve', 'capsule', [0.35, -0.53, -0.66], [0.17, 0.45, 0.16], [0, 0, 28], sleeveMaterial);
  addShape('fp-left-forearm', 'capsule', [-0.18, -0.23, -0.90], [0.12, 0.29, 0.12], [0, 0, -20], skinMaterial);
  addShape('fp-right-forearm', 'capsule', [0.18, -0.23, -0.90], [0.12, 0.29, 0.12], [0, 0, 20], skinMaterial);
  addShape('fp-left-open-palm', 'sphere', [-0.105, -0.035, -1.055], [0.115, 0.085, 0.055], [0, 0, -10], skinMaterial);
  addShape('fp-right-open-palm', 'sphere', [0.105, -0.035, -1.055], [0.115, 0.085, 0.055], [0, 0, 10], skinMaterial);

  if (!lowMemoryDevice) {
    addShape('fp-left-thumb', 'capsule', [-0.195, -0.055, -1.045], [0.035, 0.095, 0.035], [0, 0, -42], skinMaterial);
    addShape('fp-right-thumb', 'capsule', [0.195, -0.055, -1.045], [0.035, 0.095, 0.035], [0, 0, 42], skinMaterial);
  }

  let visible = false, phase = 0;
  const setVisible = value => { visible = Boolean(value); root.enabled = visible; return visible; };
  const update = (deltaSeconds, playerState = {}) => {
    if (!visible) return;
    const dt = Math.max(0, Math.min(0.05, Number(deltaSeconds) || 0));
    const moving = Boolean(playerState.moving);
    phase += dt * (moving ? (playerState.running ? 9 : 7) : 2.2);
    root.setLocalPosition(0, Math.sin(phase) * (moving ? 0.009 : 0.0018), 0);
    root.setLocalEulerAngles(0, 0, Math.sin(phase * 0.5) * (moving ? 0.65 : 0.18));
  };
  const getState = () => ({
    available: true, visible, meshCount: parts.length,
    lowMemoryProfile: Boolean(lowMemoryDevice), pose: 'open-neutral',
    sourceMaterials: { sleeve: jacketSource?.name || 'procedural-fallback', skin: skinSource?.name || 'procedural-fallback' }
  });
  const destroy = () => { root.destroy(); sleeveMaterial.destroy?.(); skinMaterial.destroy?.(); };
  return { root, setVisible, update, getState, destroy };
}
