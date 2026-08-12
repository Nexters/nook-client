import { describe, expect, it } from 'vitest';
import { formatBusinessHours, formatBusinessStatus } from './opening-hours';

/** 2026-08-13 은 목요일 → Google 규약 day 4. */
const THURSDAY = new Date('2026-08-13T05:00:00Z');

describe('formatBusinessStatus', () => {
  it('영업 여부를 모르면 줄을 만들지 않는다', () => {
    expect(formatBusinessStatus(undefined)).toBeUndefined();
  });

  it('영업중/영업 종료를 구분한다', () => {
    expect(formatBusinessStatus(true)).toBe('영업중');
    expect(formatBusinessStatus(false)).toBe('영업 종료');
  });
});

describe('formatBusinessHours', () => {
  it('오늘 구간을 24시간제 두 자리로 찍는다', () => {
    expect(
      formatBusinessHours(
        {
          timeZone: 'Asia/Seoul',
          weekdayDescriptions: [],
          periods: [
            { open: { day: 3, hour: 9, minute: 0 }, close: { day: 3, hour: 18, minute: 0 } },
            { open: { day: 4, hour: 11, minute: 0 }, close: { day: 4, hour: 19, minute: 30 } },
          ],
        },
        THURSDAY,
      ),
    ).toBe('11:00 - 19:30');
  });

  it('오늘 구간이 없으면(휴무) undefined 다', () => {
    expect(
      formatBusinessHours(
        {
          timeZone: 'Asia/Seoul',
          weekdayDescriptions: [],
          periods: [
            { open: { day: 0, hour: 11, minute: 0 }, close: { day: 0, hour: 19, minute: 0 } },
          ],
        },
        THURSDAY,
      ),
    ).toBeUndefined();
  });

  it('close 가 없으면 24시간 영업이다', () => {
    expect(
      formatBusinessHours(
        {
          timeZone: 'Asia/Seoul',
          weekdayDescriptions: [],
          periods: [{ open: { day: 4, hour: 0, minute: 0 } }],
        },
        THURSDAY,
      ),
    ).toBe('24시간 영업');
  });

  it('timeZone 이 장소 현지 요일을 정한다 — 서울은 목요일, 로스앤젤레스는 아직 수요일', () => {
    const periods = [
      { open: { day: 3, hour: 9, minute: 0 }, close: { day: 3, hour: 18, minute: 0 } },
      { open: { day: 4, hour: 11, minute: 0 }, close: { day: 4, hour: 19, minute: 30 } },
    ];
    expect(
      formatBusinessHours({ timeZone: 'Asia/Seoul', weekdayDescriptions: [], periods }, THURSDAY),
    ).toBe('11:00 - 19:30');
    expect(
      formatBusinessHours(
        { timeZone: 'America/Los_Angeles', weekdayDescriptions: [], periods },
        THURSDAY,
      ),
    ).toBe('09:00 - 18:00');
  });

  it('영업시간이 없으면 undefined 다', () => {
    expect(formatBusinessHours(undefined, THURSDAY)).toBeUndefined();
  });
});
