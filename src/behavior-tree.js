export const BT = Object.freeze({ SUCCESS: 'success', FAILURE: 'failure', RUNNING: 'running' });

function normaliseChildren(children) {
  return children.flat().filter(child => child && typeof child.tick === 'function');
}

export function condition(predicate) {
  if (typeof predicate !== 'function') throw new TypeError('Behaviour condition requires a function');
  return { tick: context => predicate(context) ? BT.SUCCESS : BT.FAILURE, reset() {} };
}

export function action(callback) {
  if (typeof callback !== 'function') throw new TypeError('Behaviour action requires a function');
  return {
    tick(context) {
      const result = callback(context);
      return Object.values(BT).includes(result) ? result : result === false ? BT.FAILURE : BT.SUCCESS;
    },
    reset() {}
  };
}

export function sequence(...items) {
  const children = normaliseChildren(items);
  let cursor = 0;
  return {
    tick(context) {
      while (cursor < children.length) {
        const result = children[cursor].tick(context);
        if (result === BT.RUNNING) return BT.RUNNING;
        if (result === BT.FAILURE) { this.reset(); return BT.FAILURE; }
        cursor++;
      }
      this.reset();
      return BT.SUCCESS;
    },
    reset() { cursor = 0; for (const child of children) child.reset?.(); }
  };
}

export function selector(...items) {
  const children = normaliseChildren(items);
  let cursor = 0;
  return {
    tick(context) {
      while (cursor < children.length) {
        const result = children[cursor].tick(context);
        if (result === BT.RUNNING) return BT.RUNNING;
        if (result === BT.SUCCESS) { this.reset(); return BT.SUCCESS; }
        cursor++;
      }
      this.reset();
      return BT.FAILURE;
    },
    reset() { cursor = 0; for (const child of children) child.reset?.(); }
  };
}

export function inverter(child) {
  return {
    tick(context) {
      const result = child.tick(context);
      return result === BT.SUCCESS ? BT.FAILURE : result === BT.FAILURE ? BT.SUCCESS : result;
    },
    reset() { child.reset?.(); }
  };
}

export function createBehaviourTree(root) {
  if (!root || typeof root.tick !== 'function') throw new TypeError('Behaviour tree requires a root node');
  let ticks = 0;
  return {
    tick(context) { ticks++; return root.tick(context); },
    reset() { root.reset?.(); },
    getState() { return { ticks }; }
  };
}
