import * as pc from 'playcanvas';

/** Fixed-size, reusable event effects for low-end mobile rendering. */
export function createVfxSystem({ app, poolSize = 24 } = {}) {
  if (!app) throw new Error('VFX requires an app');

  const colors = {
    dust: [0.58, 0.49, 0.34],
    jump: [0.54, 0.77, 0.96],
    landing: [0.81, 0.68, 0.44],
    parkour: [0.96, 0.7, 0.25],
    arrival: [0.38, 0.85, 0.66]
  };
  const pool = [];
  const stats = { emitted: 0, expired: 0, active: 0, byType: {} };
  const maxParticles = Math.max(12, Math.min(24, Math.floor(poolSize) || 24));

  function makeMaterial(color) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(...color);
    material.emissive = new pc.Color(color[0] * 0.28, color[1] * 0.28, color[2] * 0.28);
    material.useLighting = false;
    material.opacity = 0.58;
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;
    material.update();
    return material;
  }

  for (let i = 0; i < maxParticles; i++) {
    const entity = new pc.Entity('pooled-vfx-' + i);
    const material = makeMaterial(colors.dust);
    entity.addComponent('render', { type: 'sphere', material });
    entity.render.enabled = false;
    entity.setLocalScale(0.01, 0.01, 0.01);
    app.root.addChild(entity);
    pool.push({
      entity, material, active: false, age: 0, life: 0.5, type: 'dust', size: 0.1,
      position: [0, 0, 0], velocity: [0, 0, 0], rotation: [0, 0, 0], phase: 0
    });
  }

  function emit(type = 'dust', position = [0, 0, 0], intensity = 1) {
    const effect = colors[type] ? type : 'dust';
    const [x, y, z] = position;
    const desired = Math.max(2, Math.min(7, Math.round((effect === 'landing' ? 6 : effect === 'parkour' ? 5 : 3) * Math.max(0.5, intensity))));
    let made = 0;
    const seed = stats.emitted + pool.length * 0.618;

    for (let i = 0; i < pool.length && made < desired; i++) {
      const particle = pool[i];
      if (particle.active) continue;
      const angle = (i * 2.399963 + seed * 0.37) % (Math.PI * 2);
      const radial = effect === 'parkour' ? 0.78 : effect === 'landing' ? 0.62 : 0.22;
      particle.active = true;
      particle.age = 0;
      particle.life = effect === 'dust' ? 0.46 : effect === 'landing' ? 0.52 : effect === 'parkour' ? 0.4 : 0.58;
      particle.type = effect;
      particle.size = effect === 'landing' ? 0.13 : effect === 'parkour' ? 0.105 : 0.09;
      particle.position[0] = x + Math.cos(angle) * 0.11;
      particle.position[1] = y + (effect === 'jump' ? 0.12 : 0.035);
      particle.position[2] = z + Math.sin(angle) * 0.11;
      particle.velocity[0] = Math.cos(angle) * radial;
      particle.velocity[1] = effect === 'jump' ? 1.55 : effect === 'parkour' ? 0.72 : effect === 'arrival' ? 0.95 : 0.48;
      particle.velocity[2] = Math.sin(angle) * radial;
      particle.rotation[0] = effect === 'dust' || effect === 'landing' ? -90 : 0;
      particle.rotation[1] = angle * 57.2958;
      particle.rotation[2] = angle * 28.6479;
      particle.phase = angle;
      particle.material.diffuse = new pc.Color(...colors[effect]);
      particle.material.emissive = new pc.Color(colors[effect][0] * 0.28, colors[effect][1] * 0.28, colors[effect][2] * 0.28);
      particle.material.opacity = 0.58;
      particle.material.update();
      particle.entity.setPosition(...particle.position);
      particle.entity.setEulerAngles(...particle.rotation);
      particle.entity.setLocalScale(particle.size, particle.size, particle.size);
      particle.entity.render.enabled = true;
      made++;
    }

    stats.emitted += made;
    stats.byType[effect] = (stats.byType[effect] || 0) + made;
    stats.active = pool.reduce((count, particle) => count + Number(particle.active), 0);
    return made;
  }

  function update(dt) {
    const h = Math.max(0, Math.min(0.05, Number(dt) || 0));
    let active = 0;
    for (const particle of pool) {
      if (!particle.active) continue;
      particle.age += h;
      const t = Math.min(1, particle.age / particle.life);
      const [px, py, pz] = particle.position;
      const [vx, vy, vz] = particle.velocity;
      const slowHorizontal = particle.type === 'dust' || particle.type === 'landing' ? 2.1 : 0.72;
      particle.velocity[0] = vx * Math.exp(-slowHorizontal * h);
      particle.velocity[2] = vz * Math.exp(-slowHorizontal * h);
      particle.velocity[1] = vy - (particle.type === 'dust' || particle.type === 'landing' ? 1.9 : 4.6) * h;
      particle.position[0] = px + particle.velocity[0] * h;
      particle.position[1] = Math.max(0.025, py + particle.velocity[1] * h);
      particle.position[2] = pz + particle.velocity[2] * h;
      const grow = 1 + t * (particle.type === 'landing' ? 1.75 : 1.25);
      const fade = 0.58 * (1 - t) * (1 - t * 0.18);
      const size = particle.size * grow;
      const stretchX = particle.type === 'landing' ? 1.8 : particle.type === 'dust' ? 1.45 : 0.38;
      const stretchY = particle.type === 'dust' || particle.type === 'landing' ? 0.32 : 2.15;
      const stretchZ = particle.type === 'landing' ? 1.25 : particle.type === 'dust' ? 1.05 : 0.38;
      particle.entity.setPosition(particle.position[0], particle.position[1], particle.position[2]);
      particle.entity.setLocalScale(size * stretchX, size * stretchY, size * stretchZ);
      particle.material.opacity = fade;
      particle.material.update();

      if (t >= 1) {
        particle.active = false;
        particle.entity.render.enabled = false;
        stats.expired++;
      } else active++;
    }
    stats.active = active;
  }

  function destroy() {
    for (const particle of pool) particle.entity.destroy();
  }

  return {
    emit, update, destroy,
    getState: () => ({ ...stats, poolSize: pool.length, peakActiveCapacity: pool.length, mode: 'fixed-pooled-ellipsoid-event-vfx' })
  };
}
