const STORAGE_KEY = 'naija-city-progress-v1';
const SAVE_VERSION = 1;
const STARTING_CASH = 5000;

function normalizeProgress(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    version: SAVE_VERSION,
    cash: Number.isFinite(source.cash) ? Math.max(0, Math.floor(source.cash)) : STARTING_CASH,
    inventory: source.inventory && typeof source.inventory === 'object' ? { ...source.inventory } : {},
    quickSlots: source.quickSlots && typeof source.quickSlots === 'object' ? { 1: source.quickSlots[1] || null, 2: source.quickSlots[2] || null, 3: source.quickSlots[3] || null } : { 1: null, 2: null, 3: null },
    activities: source.activities && typeof source.activities === 'object' ? { ...source.activities } : {},
    purchases: Number.isFinite(source.purchases) ? Math.max(0, Math.floor(source.purchases)) : 0,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null
  };
}

/** Small, versioned local save for wallet, shop inventory and district activity progress. */
export function createCityEconomy({ storage = globalThis.localStorage, key = STORAGE_KEY, startingCash = STARTING_CASH } = {}) {
  let state = normalizeProgress({ cash: startingCash });
  let saveAvailable = !!storage;
  let saves = 0;
  let saveErrors = 0;

  try {
    const raw = storage?.getItem?.(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === SAVE_VERSION) state = normalizeProgress(parsed);
    }
  } catch {
    saveAvailable = false;
    saveErrors++;
  }

  function persist() {
    state.updatedAt = new Date().toISOString();
    try {
      if (!storage?.setItem) throw new Error('Persistent browser storage is unavailable.');
      storage.setItem(key, JSON.stringify(state));
      saveAvailable = true;
      saves++;
      return true;
    } catch {
      saveAvailable = false;
      saveErrors++;
      return false;
    }
  }

  function awardActivity(activityId, amount = 500) {
    if (typeof activityId !== 'string' || !activityId || !Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Invalid activity reward.' };
    }
    if (state.activities[activityId]?.rewardClaimed) {
      return { success: false, duplicate: true, message: 'This activity reward has already been claimed.' };
    }
    state.cash += Math.floor(amount);
    state.activities[activityId] = { ...(state.activities[activityId] || {}), completed: true, rewardClaimed: true, reward: Math.floor(amount) };
    const saved = persist();
    return { success: true, cash: state.cash, reward: Math.floor(amount), saved, message: `Reward received: ₦${Math.floor(amount).toLocaleString()}. Wallet: ₦${state.cash.toLocaleString()}.` };
  }

  function setActivityProgress(activityId, progress) {
    if (typeof activityId !== 'string' || !activityId || !progress || typeof progress !== 'object') return false;
    const existing = state.activities[activityId] || {};
    state.activities[activityId] = {
      ...existing,
      pickups: Array.isArray(progress.pickups) ? progress.pickups.map(Boolean) : (existing.pickups || []),
      completed: Boolean(progress.completed || existing.completed),
      rewardClaimed: Boolean(existing.rewardClaimed)
    };
    return persist();
  }

  function getActivityProgress(activityId) {
    const entry = state.activities[activityId];
    return entry ? { ...entry, pickups: Array.isArray(entry.pickups) ? entry.pickups.slice() : [] } : null;
  }

  function addItem(productId, quantity = 1) {
    if (typeof productId !== 'string' || !productId || !Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, message: 'This item cannot be added right now.' };
    }
    const amount = Math.max(1, Math.floor(quantity));
    state.inventory[productId] = Math.max(0, Math.floor(Number(state.inventory[productId]) || 0)) + amount;
    const saved = persist();
    return { success: true, productId, quantity: amount, saved, state: getState(), message: `Collected ${productId.replaceAll('-', ' ')}.` };
  }

  function setQuickSlot(slot, productId = null) {
    const index = String(slot);
    if (!['1', '2', '3'].includes(index)) return { success: false, message: 'That quick slot is unavailable.' };
    if (productId !== null && (typeof productId !== 'string' || !productId || (Number(state.inventory[productId]) || 0) < 1)) {
      return { success: false, message: 'Collect the item before equipping it.' };
    }
    state.quickSlots[index] = productId;
    const saved = persist();
    return { success: true, slot: Number(index), productId, saved, state: getState(), message: productId ? `Equipped ${productId.replaceAll('-', ' ')} to slot ${index}.` : `Quick slot ${index} cleared.` };
  }

  function purchase(productId, price) {
    if (typeof productId !== 'string' || !productId || !Number.isFinite(price) || price <= 0) {
      return { success: false, message: 'This item is not available right now.' };
    }
    const cost = Math.floor(price);
    if (state.cash < cost) return { success: false, message: `Not enough cash. You need ₦${cost.toLocaleString()}; wallet: ₦${state.cash.toLocaleString()}.` };
    state.cash -= cost;
    state.inventory[productId] = (Number(state.inventory[productId]) || 0) + 1;
    state.purchases++;
    const saved = persist();
    return { success: true, productId, cash: state.cash, saved, message: `Purchased ${productId.replaceAll('-', ' ')} for ₦${cost.toLocaleString()}. Wallet: ₦${state.cash.toLocaleString()}.` };
  }

  function getState() {
    return { ...state, inventory: { ...state.inventory }, quickSlots: { ...state.quickSlots }, activities: JSON.parse(JSON.stringify(state.activities)), persistence: { available: saveAvailable, saves, errors: saveErrors, key } };
  }

  return { awardActivity, setActivityProgress, getActivityProgress, addItem, setQuickSlot, purchase, getState, save: persist };
}

export const CITY_ECONOMY_DEFAULTS = Object.freeze({ startingCash: STARTING_CASH, activityReward: 500, storageKey: STORAGE_KEY });
