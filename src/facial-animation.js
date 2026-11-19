const PRESETS = Object.freeze({
  neutral: {},
  happy: { mouthSmile: 0.62, browInnerUp: 0.12, eyeSquintLeft: 0.12, eyeSquintRight: 0.12 },
  concerned: { browInnerUp: 0.56, browDownLeft: 0.18, browDownRight: 0.18, mouthFrown: 0.22 },
  focused: { browDownLeft: 0.26, browDownRight: 0.26, eyeSquintLeft: 0.12, eyeSquintRight: 0.12 },
  surprised: { browOuterUpLeft: 0.6, browOuterUpRight: 0.6, eyeWideLeft: 0.5, eyeWideRight: 0.5, jawOpen: 0.2 },
  tired: { eyeSquintLeft: 0.4, eyeSquintRight: 0.4, browInnerUp: 0.12 }
});
const VISemes = ['viseme_CH','viseme_DD','viseme_E','viseme_FF','viseme_I','viseme_O','viseme_PP','viseme_RR','viseme_SS','viseme_TH','viseme_U','viseme_aa','viseme_kk','viseme_nn'];

/** Deterministic lightweight facial layer: expressions + autonomous blinking + visemes. */
export function createFacialAnimation(character, { blinkInterval = 3.8, blinkDuration = 0.14, smoothing = 12 } = {}) {
  const supported = new Set(character?.morphNames || []);
  const channels = new Set([...Object.keys(PRESETS.happy), ...Object.keys(PRESETS.concerned), ...Object.keys(PRESETS.focused), ...Object.keys(PRESETS.surprised), ...Object.keys(PRESETS.tired), 'eyeBlinkLeft', 'eyeBlinkRight', ...VISemes]);
  const current = new Map(), target = new Map();
  for (const name of channels) { current.set(name, 0); target.set(name, 0); }
  let expression = 'neutral', blinkClock = 0, blinkElapsed = -1, blinkCount = 0, time = 0;
  let viseme = null;

  function setExpression(name = 'neutral', weight = 1) {
    if (!Object.prototype.hasOwnProperty.call(PRESETS, name)) return false;
    expression = name;
    const amount = Math.max(0, Math.min(1, Number(weight) || 0));
    for (const [channel, value] of Object.entries(PRESETS[name])) target.set(channel, value * amount);
    for (const channel of channels) {
      if (!Object.prototype.hasOwnProperty.call(PRESETS[name], channel) && !VISemes.includes(channel)) target.set(channel, 0);
    }
    return true;
  }

  function setMorph(name, weight = 1) {
    if (!supported.has(name)) return false;
    if (!current.has(name)) { current.set(name, 0); target.set(name, 0); channels.add(name); }
    target.set(name, Math.max(0, Math.min(1, Number(weight) || 0)));
    return true;
  }

  function setViseme(name, weight = 1) {
    const channel = name && !String(name).startsWith('viseme_') ? `viseme_${name}` : name;
    if (!VISemes.includes(channel) || !supported.has(channel)) return false;
    for (const item of VISemes) target.set(item, item === channel ? Math.max(0, Math.min(1, Number(weight) || 0)) : 0);
    viseme = Number(weight) > 0 ? channel : null;
    return true;
  }

  function update(dt) {
    const h = Math.max(0, Math.min(0.05, Number(dt) || 0));
    time += h;
    blinkClock += h;
    const interval = Math.max(1.2, Number(blinkInterval) || 3.8);
    if (blinkElapsed < 0 && blinkClock >= interval) { blinkElapsed = 0; blinkClock = 0; blinkCount++; }
    let blink = 0;
    if (blinkElapsed >= 0) {
      const progress = Math.min(1, blinkElapsed / Math.max(0.04, blinkDuration));
      blink = Math.sin(progress * Math.PI);
      blinkElapsed += h;
      if (progress >= 1) blinkElapsed = -1;
    }
    const alpha = 1 - Math.exp(-Math.max(1, smoothing) * h);
    let changed = 0;
    for (const channel of channels) {
      const wanted = channel === 'eyeBlinkLeft' || channel === 'eyeBlinkRight'
        ? Math.max(target.get(channel) || 0, blink)
        : target.get(channel) || 0;
      const previous = current.get(channel) || 0;
      const value = previous + (wanted - previous) * alpha;
      if (Math.abs(value - previous) > 0.002) {
        current.set(channel, value);
        if (supported.has(channel)) character?.setFaceExpression?.(channel, value);
        changed++;
      }
    }
    return { changed, blink, time };
  }

  return {
    setExpression, setMorph, setViseme, update,
    getState: () => ({ available: supported.size > 0, supportedMorphCount: supported.size, expression, viseme, blinkCount, time: Number(time.toFixed(2)), activeChannels: [...current].filter(([, value]) => value > 0.03).map(([name]) => name) })
  };
}
