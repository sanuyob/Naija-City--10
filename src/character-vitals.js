const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

/** Deterministic health/stamina model shared by player, companions and NPCs. */
export function createCharacterVitals({
  maxHealth = 100,
  maxStamina = 100,
  staminaDrainPerSecond = 12,
  staminaRegenPerSecond = 20,
  staminaRegenDelay = 0.8,
  damageInvulnerability = 0.55,
  onEvent = () => {}
} = {}) {
  const limits = {
    health: Math.max(1, Number(maxHealth) || 100),
    stamina: Math.max(1, Number(maxStamina) || 100)
  };
  let health = limits.health;
  let stamina = limits.stamina;
  let invulnerability = 0;
  let regenDelay = 0;
  let damageEvents = 0;
  let healingEvents = 0;
  let state = 'ready';
  let lastEvent = null;

  function emit(type, data = {}) {
    lastEvent = { type, ...data };
    onEvent(lastEvent);
    return lastEvent;
  }

  function update(dt, { sprinting = false, active = true } = {}) {
    const step = clamp(dt, 0, 0.05);
    invulnerability = Math.max(0, invulnerability - step);
    if (health <= 0) {
      state = 'downed';
      return getState();
    }
    if (sprinting && stamina > 0) {
      const before = stamina;
      stamina = Math.max(0, stamina - Math.max(0, staminaDrainPerSecond) * step);
      regenDelay = Math.max(regenDelay, staminaRegenDelay);
      if (before > 0 && stamina === 0) emit('stamina-empty');
    } else if (regenDelay > 0) {
      regenDelay = Math.max(0, regenDelay - step);
    } else if (active && stamina < limits.stamina) {
      stamina = Math.min(limits.stamina, stamina + Math.max(0, staminaRegenPerSecond) * step);
    }
    if (state === 'damaged' && invulnerability <= 0) state = 'ready';
    return getState();
  }

  function applyDamage(amount, { source = 'world', direction = null, invulnerabilitySeconds = damageInvulnerability } = {}) {
    const damage = clamp(amount, 0, limits.health);
    if (damage <= 0 || health <= 0 || invulnerability > 0) {
      return { applied: false, reason: health <= 0 ? 'downed' : invulnerability > 0 ? 'invulnerable' : 'zero-damage', ...getState() };
    }
    const previousHealth = health;
    health = Math.max(0, health - damage);
    invulnerability = Math.max(0, Number(invulnerabilitySeconds) || 0);
    regenDelay = Math.max(regenDelay, 1.0);
    damageEvents++;
    state = health <= 0 ? 'downed' : 'damaged';
    const event = emit('damage', { source, amount: previousHealth - health, health, direction, downed: health <= 0 });
    return { applied: true, event, ...getState() };
  }

  function heal(amount, { source = 'recovery' } = {}) {
    const value = clamp(amount, 0, limits.health);
    if (value <= 0 || health <= 0) return { applied: false, ...getState() };
    const before = health;
    health = Math.min(limits.health, health + value);
    if (health > 0 && state === 'damaged' && invulnerability <= 0) state = 'ready';
    if (health > before) {
      healingEvents++;
      emit('healing', { source, amount: health - before, health });
    }
    return { applied: health > before, ...getState() };
  }

  function consumeStamina(amount, { source = 'action' } = {}) {
    const cost = clamp(amount, 0, limits.stamina);
    if (health <= 0 || cost <= 0 || stamina + 1e-6 < cost) return false;
    stamina = Math.max(0, stamina - cost);
    regenDelay = Math.max(regenDelay, staminaRegenDelay);
    emit('stamina-used', { source, amount: cost, stamina });
    return true;
  }

  function recover({ health: restoredHealth = 40, stamina: restoredStamina = 35 } = {}) {
    if (health > 0) return { applied: false, reason: 'not-downed', ...getState() };
    health = clamp(restoredHealth, 1, limits.health);
    stamina = clamp(restoredStamina, 0, limits.stamina);
    invulnerability = Math.max(invulnerability, 1.1);
    regenDelay = 0.5;
    state = 'recovering';
    emit('recovered', { health, stamina });
    return { applied: true, ...getState() };
  }

  function finishRecovery() {
    if (health <= 0) return false;
    state = 'ready';
    emit('recovery-finished', { health, stamina });
    return true;
  }

  function reset() {
    health = limits.health;
    stamina = limits.stamina;
    invulnerability = 0;
    regenDelay = 0;
    state = 'ready';
    emit('reset', { health, stamina });
    return getState();
  }

  function getState() {
    return {
      health: Number(health.toFixed(2)), maxHealth: limits.health,
      stamina: Number(stamina.toFixed(2)), maxStamina: limits.stamina,
      invulnerability: Number(invulnerability.toFixed(3)), staminaRecoveryDelay: Number(regenDelay.toFixed(3)),
      state, downed: health <= 0, canSprint: health > 0 && stamina > 0.5,
      damageEvents, healingEvents, lastEvent
    };
  }

  return { update, applyDamage, heal, consumeStamina, recover, finishRecovery, reset, getState };
}
