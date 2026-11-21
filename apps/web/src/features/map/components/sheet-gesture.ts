/** Short position history keeps a pause or a reversal from becoming a stale fling. */
export type GestureSample = { position: number; time: number };
export function sampleGesture(history: GestureSample[], position: number, time: number) {
  history.push({ position, time });
  while (history.length > 2 && time - (history[0]?.time ?? time) > 100) history.shift();
}

/** px/ms, measured over the most recent 100ms rather than the whole touch duration. */
export function releaseVelocity(history: GestureSample[], time: number) {
  const last = history.at(-1);
  if (!last || time - last.time > 100) return 0;
  const first = history.find((sample) => sample.time >= time - 100 && sample.time < last.time);
  if (!first) return 0;
  return (last.position - first.position) / (last.time - first.time);
}

/** Apple's exponential momentum projection, with the snappier 0.99 decay. */
export function shouldAdvanceSheet(distance: number, velocity: number, threshold: number) {
  if (Math.abs(distance) >= threshold) return true;
  if (Math.abs(distance) < 12 || Math.sign(distance) !== Math.sign(velocity)) return false;
  const projected = distance + (velocity * 0.99) / (1 - 0.99);
  return Math.abs(velocity) >= 0.4 && Math.abs(projected) >= threshold;
}
