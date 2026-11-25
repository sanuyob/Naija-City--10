/** Small data-driven interaction registry for vendors, transit, doors and vehicles. */
export function createWorldInteractionSystem({ targets = [], getPlayerState = () => null, lineOfSight = null, defaultRange = 2.8, onMessage = () => {} } = {}) {
  const registry = new Map();
  let nearest = null, interactions = 0, rejected = 0, lastInteraction = null;

  function register(target) {
    if (!target?.id || typeof target.onInteract !== 'function') throw new TypeError('Interactable requires id and onInteract');
    const position = Array.isArray(target.position) ? target.position.slice(0, 3) : null;
    if (!position || position.length !== 3 || !position.every(Number.isFinite)) throw new TypeError(`Interactable ${target.id} requires a finite world position`);
    registry.set(target.id, { range: defaultRange, enabled: true, ...target, position });
    return () => registry.delete(target.id);
  }

  function findNearest(playerState = getPlayerState()) {
    const p = playerState?.position;
    if (!Array.isArray(p)) { nearest = null; return null; }
    const matches = [];
    for (const target of registry.values()) {
      if (target.enabled === false || target.canInteract?.(playerState) === false) continue;
      const distance = Math.hypot(p[0] - target.position[0], p[2] - target.position[2]);
      const visible = target.requiresLineOfSight === false ? true : (lineOfSight ? lineOfSight([p[0], p[1] + 1.2, p[2]], [target.position[0], target.position[1] + (target.eyeHeight || 0.9), target.position[2]]) : true);
      matches.push({ target, distance, visible, available: visible && distance <= (target.range || defaultRange) });
    }
    matches.sort((a, b) => a.distance - b.distance);
    const best = matches[0];
    nearest = best ? {
      id: best.target.id, name: best.target.name || best.target.id,
      prompt: typeof best.target.prompt === 'function' ? best.target.prompt({ player: playerState, target: best.target, distance: best.distance }) : (best.target.prompt || `INTERACT · ${best.target.name || best.target.id}`),
      distance: Number(best.distance.toFixed(2)), visible: best.visible,
      available: best.available
    } : null;
    return nearest;
  }

  function interact(playerState = getPlayerState()) {
    const info = findNearest(playerState);
    if (!info?.available) {
      rejected++;
      const message = info ? `${info.name} is too far away or not visible.` : 'Nothing nearby to interact with.';
      onMessage(message);
      return { success: false, reason: 'unavailable', nearest: info, message };
    }
    const target = registry.get(info.id);
    const result = target?.onInteract({ player: playerState, target, distance: info.distance });
    if (result === false) {
      rejected++;
      return { success: false, reason: 'rejected', nearest: info };
    }
    interactions++;
    lastInteraction = { id: target.id, name: target.name || target.id, at: Date.now() };
    if (typeof result === 'string') onMessage(result);
    else if (result?.message) onMessage(result.message);
    return { success: true, id: target.id, result: result ?? null, nearest: info };
  }

  function setEnabled(id, enabled) {
    const target = registry.get(id);
    if (!target) return false;
    target.enabled = Boolean(enabled);
    return true;
  }

  return {
    register, findNearest, interact, setEnabled,
    getState: () => {
      findNearest(getPlayerState());
      return { targetCount: registry.size, interactions, rejected, nearest, lastInteraction, targets: [...registry.values()].map(target => ({ id: target.id, name: target.name, enabled: target.enabled, position: target.position.slice() })) };
    }
  };
}
