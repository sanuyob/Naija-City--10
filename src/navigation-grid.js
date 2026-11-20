function getBox(collider) {
  if (Array.isArray(collider?.position) && Array.isArray(collider?.halfExtents)) {
    return { position: collider.position, half: collider.halfExtents.map(Math.abs), rotationY: Number(collider.rotationY) || 0 };
  }
  const p = collider?.entity?.getPosition?.(), s = collider?.entity?.getLocalScale?.();
  if (!p || !s) return null;
  return { position: [p.x, p.y, p.z], half: [Math.abs(s.x) / 2, Math.abs(s.y) / 2, Math.abs(s.z) / 2], rotationY: collider?.entity?.getEulerAngles?.().y || 0 };
}

function nearestWalkable(cell, isWalkable, maxRing = 5) {
  if (isWalkable(cell.x, cell.z)) return cell;
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const candidate = { x: cell.x + dx, z: cell.z + dz };
        if (isWalkable(candidate.x, candidate.z)) return candidate;
      }
    }
  }
  return null;
}

/** A* grid navigation for pedestrians/companions, backed by the game's collision proxies. */
export function createNavigationGrid({ colliders = [], cellSize = 1.25, agentHeight = 1.75, groundY = 0, minColliderHeight = 0.3 } = {}) {
  const boxes = colliders.map(getBox).filter(box => box && box.half[1] * 2 >= minColliderHeight && box.position[1] + box.half[1] > groundY + 0.08 && box.position[1] - box.half[1] < groundY + agentHeight);
  const size = Math.max(0.35, Number(cellSize) || 1.25);
  let queries = 0, pathsFound = 0, pathsFailed = 0, expandedNodes = 0;
  const key = (x, z) => `${x},${z}`;
  const toCell = point => ({ x: Math.round(point[0] / size), z: Math.round(point[2] / size) });
  const toWorld = cell => [cell.x * size, groundY, cell.z * size];

  function isWalkable(x, z, radius = 0.32) {
    const wx = x * size, wz = z * size;
    for (const box of boxes) {
      const angle = -box.rotationY * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
      const dx = wx - box.position[0], dz = wz - box.position[2];
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < box.half[0] + radius && Math.abs(lz) < box.half[2] + radius) return false;
    }
    return true;
  }

  function findPath(start, goal, { radius = 0.32, maxNodes = 1800 } = {}) {
    queries++;
    if (!Array.isArray(start) || !Array.isArray(goal) || ![...start, ...goal].every(Number.isFinite)) return [];
    const startCell = toCell(start);
    const goalCellRaw = toCell(goal);
    const startNode = nearestWalkable(startCell, (x, z) => isWalkable(x, z, radius));
    const goalNode = nearestWalkable(goalCellRaw, (x, z) => isWalkable(x, z, radius));
    if (!startNode || !goalNode) { pathsFailed++; return []; }
    if (startNode.x === goalNode.x && startNode.z === goalNode.z) { pathsFound++; return [goal.slice(0, 3)]; }

    const directions = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
    ];
    const open = [{ ...startNode, g: 0, f: Math.hypot(goalNode.x - startNode.x, goalNode.z - startNode.z) }];
    const cameFrom = new Map();
    const costs = new Map([[key(startNode.x, startNode.z), 0]]);
    const closed = new Set();
    let reached = false, expanded = 0;
    while (open.length && expanded < Math.max(64, maxNodes)) {
      let bestIndex = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bestIndex].f) bestIndex = i;
      const current = open.splice(bestIndex, 1)[0];
      const currentKey = key(current.x, current.z);
      if (closed.has(currentKey)) continue;
      closed.add(currentKey); expanded++;
      if (current.x === goalNode.x && current.z === goalNode.z) { reached = true; break; }
      for (const [dx, dz, cost] of directions) {
        const nx = current.x + dx, nz = current.z + dz, nextKey = key(nx, nz);
        if (closed.has(nextKey) || !isWalkable(nx, nz, radius)) continue;
        if (dx && dz && (!isWalkable(current.x + dx, current.z, radius) || !isWalkable(current.x, current.z + dz, radius))) continue;
        const nextCost = current.g + cost;
        if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, nextCost);
        cameFrom.set(nextKey, currentKey);
        const heuristic = Math.hypot(goalNode.x - nx, goalNode.z - nz);
        open.push({ x: nx, z: nz, g: nextCost, f: nextCost + heuristic });
      }
    }
    expandedNodes += expanded;
    if (!reached) { pathsFailed++; return []; }
    const cells = [];
    let cursor = key(goalNode.x, goalNode.z);
    while (cursor && cursor !== key(startNode.x, startNode.z)) {
      const [x, z] = cursor.split(',').map(Number);
      cells.push({ x, z });
      cursor = cameFrom.get(cursor);
    }
    cells.reverse();
    const points = cells.map(toWorld);
    if (points.length) points[points.length - 1] = goal.slice(0, 3);
    pathsFound++;
    return points;
  }

  return { findPath, isWalkable, getState: () => ({ queries, pathsFound, pathsFailed, expandedNodes, obstacleCount: boxes.length, cellSize: size, agentHeight, groundY }) };
}
