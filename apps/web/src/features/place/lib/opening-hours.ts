import type { PlaceOpeningHoursResponse } from '@/shared/api';

/**
 * `PlaceDetailResponse` 의 영업시간을 `PlaceInfo` 가 그리는 두 문자열로 옮긴다
 * (시안 `영업중 · 11:00 - 19:30`).
 *
 * 서버가 주는 `weekdayDescriptions` 는 `"월요일: 오전 11:00~오후 7:30"` 형태라 시안 표기와
 * 다르다 — 구조화된 `periods` 에서 오늘 구간을 직접 골라 24시간제로 찍는다.
 * `day` 는 Google 규약(0=일요일)이고, "오늘"은 서버가 함께 주는 장소의 `timeZone` 기준이다.
 */

const WEEKDAY_TO_GOOGLE_DAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_MINUTES = 24 * 60;
const WEEK_MINUTES = 7 * DAY_MINUTES;

/** 장소 현지 기준 지금이 한 주(일요일 00:00 기준)의 몇 분째인지. timeZone 이 이상하면 기기 시간대로 폴백한다. */
function getNowWeekMinute(timeZone: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value;
    const day = WEEKDAY_TO_GOOGLE_DAY[part('weekday') ?? ''];
    if (day !== undefined) {
      return day * DAY_MINUTES + Number(part('hour')) * 60 + Number(part('minute'));
    }
  } catch {
    // 아래 기기 시간대 폴백
  }
  return now.getDay() * DAY_MINUTES + now.getHours() * 60 + now.getMinutes();
}

type Point = { day: number; hour: number; minute: number };

function toWeekMinute({ day, hour, minute }: Point): number {
  return day * DAY_MINUTES + hour * 60 + minute;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatBusinessStatus(openNow: boolean | undefined): string | undefined {
  if (openNow === undefined) return undefined;
  return openNow ? '영업중' : '영업 종료';
}

/**
 * 지금 기준으로 보여줄 영업 구간(`11:00 - 19:30`). 오늘 열지 않으면 undefined(=휴무라 줄이 빠진다).
 *
 * - 구간은 한 주를 분 단위로 펼쳐 비교한다 — 전날 시작해 자정을 넘겨 아직 영업 중인 구간도 잡힌다.
 * - `close` 가 없거나 열고 닫는 사이가 하루(00:00 → 다음 날 00:00) 이상이면 `24시간 영업`.
 * - 브레이크 타임처럼 구간이 여러 개면 지금 영업 중인 구간, 아니면 오늘 다음에 열 구간,
 *   그것도 없으면 오늘 첫 구간을 보여준다 — `영업중`과 시간이 어긋나지 않게.
 */
export function formatBusinessHours(
  openingHours: PlaceOpeningHoursResponse | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!openingHours) return undefined;

  const nowMinute = getNowWeekMinute(openingHours.timeZone, now);
  const today = Math.floor(nowMinute / DAY_MINUTES);
  const ranges = openingHours.periods.map((period) => {
    const start = toWeekMinute(period.open);
    // close 가 없으면 Google 규약상 상시 영업(24/7)이다.
    let end = period.close ? toWeekMinute(period.close) : start + WEEK_MINUTES;
    // 토요일 밤 → 일요일 새벽처럼 주를 넘기면 다음 주로 민다.
    if (end <= start) end += WEEK_MINUTES;
    return { period, start, end, allDay: !period.close || end - start >= DAY_MINUTES };
  });

  // 지난주에 시작한 구간이 이번 주 일요일 새벽까지 이어질 수 있어 한 주 앞당긴 지금도 본다.
  const isOpenAt = (range: (typeof ranges)[number]) =>
    [nowMinute, nowMinute + WEEK_MINUTES].some((m) => range.start <= m && m < range.end);
  const startsToday = ranges
    .filter((range) => range.period.open.day === today)
    .sort((a, b) => a.start - b.start);
  const shown =
    ranges.find(isOpenAt) ?? startsToday.find((range) => range.start > nowMinute) ?? startsToday[0];
  if (!shown) return undefined;

  if (shown.allDay) return '24시간 영업';
  const { open, close } = shown.period;
  // allDay 가 아니면 close 가 있다.
  return `${formatTime(open.hour, open.minute)} - ${formatTime(close?.hour ?? 0, close?.minute ?? 0)}`;
}
