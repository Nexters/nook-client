import { describe, expect, it } from 'vitest';
import type { PlaceOpeningHoursResponse } from '@/shared/api';
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

  /** 서울 현지 시각. */
  const seoul = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`);
  const hours = (periods: PlaceOpeningHoursResponse['periods']) => ({
    timeZone: 'Asia/Seoul',
    weekdayDescriptions: [],
    periods,
  });

  it('00:00 → 다음 날 00:00 구간은 24시간 영업이다', () => {
    expect(
      formatBusinessHours(
        hours([{ open: { day: 4, hour: 0, minute: 0 }, close: { day: 5, hour: 0, minute: 0 } }]),
        THURSDAY,
      ),
    ).toBe('24시간 영업');
  });

  it('close 가 없는 상시 영업 구간은 요일과 상관없이 24시간 영업이다', () => {
    expect(formatBusinessHours(hours([{ open: { day: 0, hour: 0, minute: 0 } }]), THURSDAY)).toBe(
      '24시간 영업',
    );
  });

  it('새벽에는 전날 시작해 자정을 넘긴 영업 구간을 보여준다', () => {
    const periods = [
      { open: { day: 4, hour: 18, minute: 0 }, close: { day: 5, hour: 3, minute: 0 } },
      { open: { day: 5, hour: 18, minute: 0 }, close: { day: 6, hour: 3, minute: 0 } },
    ];
    // 금요일 02:00 — 목요일 18:00 에 열어 아직 영업 중.
    expect(formatBusinessHours(hours(periods), seoul('2026-08-14', '02:00'))).toBe('18:00 - 03:00');
    // 금요일 10:00 — 이어지던 구간은 끝났고 오늘 저녁 구간.
    expect(formatBusinessHours(hours(periods), seoul('2026-08-14', '10:00'))).toBe('18:00 - 03:00');
  });

  it('토요일 밤에 열어 일요일 새벽까지 이어지는 구간도 일요일 새벽에 잡힌다', () => {
    const periods = [
      { open: { day: 6, hour: 20, minute: 0 }, close: { day: 0, hour: 2, minute: 0 } },
    ];
    expect(formatBusinessHours(hours(periods), seoul('2026-08-16', '01:00'))).toBe('20:00 - 02:00');
  });

  it('브레이크 타임이 있으면 지금 영업 중이거나 다음에 열 구간을 보여준다', () => {
    const periods = [
      { open: { day: 4, hour: 10, minute: 0 }, close: { day: 4, hour: 14, minute: 0 } },
      { open: { day: 4, hour: 17, minute: 0 }, close: { day: 4, hour: 22, minute: 0 } },
    ];
    const at = (time: string) => formatBusinessHours(hours(periods), seoul('2026-08-13', time));
    expect(at('08:00')).toBe('10:00 - 14:00');
    expect(at('12:00')).toBe('10:00 - 14:00');
    expect(at('15:00')).toBe('17:00 - 22:00');
    expect(at('18:00')).toBe('17:00 - 22:00');
    expect(at('23:00')).toBe('10:00 - 14:00');
  });

  it('영업시간이 없으면 undefined 다', () => {
    expect(formatBusinessHours(undefined, THURSDAY)).toBeUndefined();
  });
});
