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

/** 장소 현지 기준 오늘 요일(0=일). timeZone 이 이상하면 기기 시간대로 폴백한다. */
function getTodayDay(timeZone: string, now: Date): number {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
    return WEEKDAY_TO_GOOGLE_DAY[weekday] ?? now.getDay();
  } catch {
    return now.getDay();
  }
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatBusinessStatus(openNow: boolean | undefined): string | undefined {
  if (openNow === undefined) return undefined;
  return openNow ? '영업중' : '영업 종료';
}

/**
 * 오늘의 영업 구간(`11:00 - 19:30`). 오늘 구간이 없으면 undefined(=휴무라 줄이 빠진다).
 * `close` 가 없는 구간은 Google 규약상 24시간 영업이다.
 *
 * ponytail: 브레이크 타임처럼 하루에 구간이 여러 개면 첫 구간만 보여준다.
 * 시안에 여러 구간 표기가 없어서다 — 시안이 생기면 join 으로 넓히면 된다.
 */
export function formatBusinessHours(
  openingHours: PlaceOpeningHoursResponse | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!openingHours) return undefined;

  const today = getTodayDay(openingHours.timeZone, now);
  const period = openingHours.periods.find((candidate) => candidate.open.day === today);
  if (!period) return undefined;

  const open = formatTime(period.open.hour, period.open.minute);
  if (!period.close) return '24시간 영업';
  return `${open} - ${formatTime(period.close.hour, period.close.minute)}`;
}
