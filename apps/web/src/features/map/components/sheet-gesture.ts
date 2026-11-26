/**
 * 시트·카드 끌기의 "툭 튕기기" 판정(NOOK-441, 프로토타입 PR #247 에서 가져옴).
 *
 * 놓는 순간의 속도는 터치 전체가 아니라 최근 100ms 로만 잰다 — 오래 누르고 있다가 마지막에
 * 짧게 튕겨도 넘어가고, 멈췄다 놓거나 방향을 바꿨다 놓은 건 튕긴 것으로 보지 않는다.
 */
export type GestureSample = { position: number; time: number };

const WINDOW_MS = 100;

export function sampleGesture(history: GestureSample[], position: number, time: number) {
  history.push({ position, time });
  while (history.length > 2 && time - (history[0]?.time ?? time) > WINDOW_MS) history.shift();
}

/** 최근 100ms 의 속도(px/ms). 그동안 움직임이 없었으면 0. */
export function releaseVelocity(history: GestureSample[], time: number): number {
  const last = history.at(-1);
  if (!last || time - last.time > WINDOW_MS) return 0;
  const first = history.find(
    (sample) => sample.time >= time - WINDOW_MS && sample.time < last.time,
  );
  if (!first) return 0;
  return (last.position - first.position) / (last.time - first.time);
}

/** 이보다 짧게 움직인 건 튕겨도 넘기지 않는다 — 탭과 구분한다. */
const MIN_FLICK_PX = 12;
const MIN_FLICK_VELOCITY = 0.4;
/** iOS 스크롤 관성(지수 감속) 근사 — 놓은 뒤 더 갔을 거리를 더해 문턱을 넘는지 본다. */
const DECELERATION = 0.99;

/** 문턱 거리를 넘었거나, 같은 방향으로 충분히 빠르게 튕겨 관성으로 넘어갈 만하면 다음 단계로. */
export function shouldAdvanceSheet(distance: number, velocity: number, threshold: number): boolean {
  if (Math.abs(distance) >= threshold) return true;
  if (Math.abs(distance) < MIN_FLICK_PX || Math.sign(distance) !== Math.sign(velocity))
    return false;
  const projected = distance + (velocity * DECELERATION) / (1 - DECELERATION);
  return Math.abs(velocity) >= MIN_FLICK_VELOCITY && Math.abs(projected) >= threshold;
}
