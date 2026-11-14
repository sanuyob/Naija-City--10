/** Small, original Web Audio effects for mobile-friendly player feedback.
 * Audio is created only after a real user gesture, as required by mobile browsers.
 */
export function createAudioSystem() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let unlocked = false;
  let destroyed = false;
  let lastFootstepAt = -Infinity;
  const played = { footstep: 0, jump: 0, landing: 0, parkour: 0 };
  const now = () => context?.currentTime || 0;

  function ensureContext() {
    if (destroyed || !AudioContextClass) return false;
    if (!context) {
      context = new AudioContextClass({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = 0.34;
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.22), context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length * 0.12);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    unlocked = context.state === 'running';
    return true;
  }

  const unlock = () => { ensureContext(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  function tone({ frequency = 120, endFrequency = frequency, duration = 0.12, type = 'sine', gain = 0.12, delay = 0 } = {}) {
    if (!ensureContext() || !master || !context) return;
    const start = now() + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(25, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.012, duration * 0.22));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  }

  function noise({ duration = 0.1, frequency = 900, endFrequency = frequency, gain = 0.08, q = 0.7, delay = 0 } = {}) {
    if (!ensureContext() || !master || !context || !noiseBuffer) return;
    const start = now() + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'lowpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(80, frequency), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.01, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
    source.stop(start + duration + 0.015);
  }

  function play(type = 'footstep') {
    if (destroyed || !Object.hasOwn(played, type) || !ensureContext()) return false;
    if (type === 'footstep') {
      const time = now();
      if (time - lastFootstepAt < 0.16) return false;
      lastFootstepAt = time;
      tone({ frequency: 92, endFrequency: 58, duration: 0.075, type: 'triangle', gain: 0.12 });
      noise({ duration: 0.055, frequency: 520, endFrequency: 240, gain: 0.075 });
    } else if (type === 'jump') {
      tone({ frequency: 170, endFrequency: 430, duration: 0.19, type: 'sine', gain: 0.09 });
      noise({ duration: 0.1, frequency: 1100, endFrequency: 500, gain: 0.035 });
    } else if (type === 'landing') {
      tone({ frequency: 105, endFrequency: 42, duration: 0.2, type: 'triangle', gain: 0.19 });
      noise({ duration: 0.13, frequency: 420, endFrequency: 120, gain: 0.12 });
    } else if (type === 'parkour') {
      noise({ duration: 0.2, frequency: 1500, endFrequency: 260, gain: 0.075, q: 0.45 });
      tone({ frequency: 135, endFrequency: 78, duration: 0.16, type: 'triangle', gain: 0.08, delay: 0.035 });
    }
    played[type]++;
    return true;
  }

  function destroy() {
    destroyed = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    if (context && context.state !== 'closed') context.close().catch(() => {});
    context = null;
    master = null;
    noiseBuffer = null;
  }

  return { play, unlock, destroy, getState: () => ({ available: !!AudioContextClass, unlocked, state: context?.state || 'locked-until-user-gesture', effects: ['footstep', 'jump', 'landing', 'parkour'], played: { ...played }, mode: 'procedural-web-audio' }) };
}
