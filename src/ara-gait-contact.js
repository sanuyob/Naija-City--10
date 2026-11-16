// Blender 5.2.2 foot-lock windows for Ara's authored Walk and Run clips.
// Frame indices are inclusive and match the exported glTF action ranges.
const CONTACT_WINDOWS = Object.freeze({
  Walk: Object.freeze({
    frameEnd: 25,
    left: Object.freeze([[0, 3], [9, 25]]),
    right: Object.freeze([[0, 16], [23, 25]])
  }),
  Run: Object.freeze({
    frameEnd: 17,
    left: Object.freeze([[12, 16]]),
    right: Object.freeze([[4, 7]])
  })
});

export function getAraGaitStance(clipName, progress) {
  const clip = CONTACT_WINDOWS[clipName];
  if (!clip || !Number.isFinite(progress)) return { left: false, right: false, frame: null };
  const phase = ((progress % 1) + 1) % 1;
  const frame = phase * clip.frameEnd;
  const planted = side => clip[side].some(([start, end]) => frame >= start - 0.12 && frame <= end + 0.12);
  return { left: planted('left'), right: planted('right'), frame };
}
