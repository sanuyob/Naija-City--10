const distance2 = (a = [0,0], b = [0,0]) => Math.hypot((a[0]||0)-(b[0]||0), (a[1]||0)-(b[1]||0));

/**
 * Trajectory-feature scorer for a future motion-matching database.
 * This is not a full pose-search engine until authored clip samples are supplied.
 */
export function scoreMotionCandidates(candidates, query, { weights = {} } = {}) {
  const w = { speed: 1.0, direction: 1.6, turnRate: 0.65, state: 3.0, ...weights };
  const speed = Math.max(0, Number(query?.speed) || 0);
  const direction = query?.direction || [0, 0];
  const turnRate = Number(query?.turnRate) || 0;
  const state = query?.state || 'locomotion';
  return (candidates || []).map(candidate => {
    const speedCost = Math.abs(speed - (Number(candidate.speed) || 0));
    const directionCost = distance2(direction, candidate.direction || [0, 0]);
    const turnCost = Math.abs(turnRate - (Number(candidate.turnRate) || 0));
    const stateCost = candidate.state === state ? 0 : 1;
    const cost = speedCost*w.speed + directionCost*w.direction + turnCost*w.turnRate + stateCost*w.state;
    return { id: candidate.id, cost: Number(cost.toFixed(6)), parts: { speed: speedCost, direction: directionCost, turnRate: turnCost, state: stateCost } };
  }).sort((a, b) => a.cost - b.cost);
}

export function chooseMotionCandidate(candidates, query, previousId = null, switchPenalty = 0.15) {
  const ranked = scoreMotionCandidates(candidates, query);
  if (!ranked.length) return null;
  const current = ranked.find(item => item.id === previousId);
  const best = ranked[0];
  return current && current.cost <= best.cost + Math.max(0, switchPenalty)
    ? { ...current, retained: true, ranked }
    : { ...best, retained: false, ranked };
}
