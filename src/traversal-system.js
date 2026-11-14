/**
 * Bounded, contextual traversal for Hero 01.
 * PlayerController remains authoritative for movement and collision; this module
 * only requests approved in-game animation/motion sequences near tagged obstacles.
 */
export function createTraversalSystem({ playerController, obstacles = [] } = {}) {
  if (!playerController) throw new Error('Traversal system requires the player controller');

  const obstacleList = obstacles.map((obstacle, index) => ({
    id: obstacle.id || 'traversal-obstacle-' + index,
    entity: obstacle.entity,
    type: obstacle.type,
    height: Number(obstacle.height) || 0,
    clip: obstacle.clip
  })).filter(obstacle => obstacle.entity && obstacle.clip);

  let activeObstacleId = null;
  let activeTimer = 0;
  let traversalsStarted = 0;
  let lastTraversal = null;
  let lastBlockedReason = null;

  function resolveMovement(current, proposed) {
    // Keep the existing Stage 08E building/city resolver upstream of this function.
    for (const obstacle of obstacleList) {
      if (obstacle.id === activeObstacleId) continue;
      const center = obstacle.entity.getPosition();
      const scale = obstacle.entity.getLocalScale();
      const halfX = Math.abs(scale.x) * 0.5 + 0.32;
      const halfZ = Math.abs(scale.z) * 0.5 + 0.32;
      const playerBottom = proposed[1] || 0;
      if (playerBottom > obstacle.height + 0.15) continue;
      const insideX = Math.abs(proposed[0] - center.x) < halfX;
      const insideZ = Math.abs(proposed[2] - center.z) < halfZ;
      if (insideX && insideZ) return current;
    }
    return proposed;
  }

  function chooseClip(obstacle) {
    if (obstacle.type === 'step' && obstacle.height <= 0.55) return 'Hero01_StepUp';
    if (obstacle.type === 'low-vault' && obstacle.height <= 0.75) return 'Hero01_VaultLow';
    if (obstacle.type === 'high-vault' && obstacle.height <= 1.05) return 'Hero01_VaultHigh';
    if (obstacle.type === 'mantle' && obstacle.height <= 1.30) return 'Hero01_Mantle';
    return null;
  }

  function tryContextualTraversal(state = playerController.getState()) {
    if (!state?.grounded || state.traversing) {
      lastBlockedReason = 'Player must be grounded and not already traversing';
      return false;
    }
    const yaw = (Number(state.facingYaw) || 0) * Math.PI / 180;
    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const [px, , pz] = state.position;
    let best = null;

    for (const obstacle of obstacleList) {
      const clip = chooseClip(obstacle);
      if (!clip) continue;
      const center = obstacle.entity.getPosition();
      const dx = center.x - px;
      const dz = center.z - pz;
      const distance = Math.hypot(dx, dz);
      const along = dx * forwardX + dz * forwardZ;
      const lateral = Math.abs(dx * forwardZ - dz * forwardX);
      const width = Math.abs(obstacle.entity.getLocalScale().x);
      if (along < 0.4 || along > 2.4 || lateral > width * 0.5 + 0.5) continue;
      if (!best || along < best.along) best = { obstacle, clip, along, lateral, distance };
    }

    if (!best) {
      lastBlockedReason = 'No tagged traversal obstacle in front of the player';
      return false;
    }

    const obstacleScale = best.obstacle.entity.getLocalScale();
    const clearance = best.along + Math.abs(obstacleScale.z) * 0.5 + 0.82;
    const destination = [
      px + forwardX * clearance,
      state.position[1],
      pz + forwardZ * clearance
    ];
    const duration = best.obstacle.type === 'mantle' ? 1.45 : 1.15;
    const apex = Math.max(0.18, Math.min(0.60, best.obstacle.height * 0.42));
    const accepted = playerController.performTraversal(best.clip, destination, { duration, apex });
    if (!accepted) {
      lastBlockedReason = 'Traversal action was rejected by the player controller';
      return false;
    }

    activeObstacleId = best.obstacle.id;
    activeTimer = duration + 0.18;
    traversalsStarted++;
    lastBlockedReason = null;
    lastTraversal = {
      obstacle: best.obstacle.id,
      clip: best.clip,
      height: best.obstacle.height,
      destination
    };
    return true;
  }

  function update(dt) {
    if (activeTimer > 0) {
      activeTimer = Math.max(0, activeTimer - Math.max(0, Math.min(dt, 0.05)));
      if (activeTimer === 0) activeObstacleId = null;
    }
  }

  return {
    tryContextualTraversal,
    resolveMovement,
    update,
    getState: () => ({
      stage: '09-traversal',
      obstacleCount: obstacleList.length,
      traversalsStarted,
      activeObstacleId,
      lastTraversal,
      lastBlockedReason
    })
  };
}
