import { describe, expect, it } from 'vitest';
import { FULL_SNAP_POINT, MID_SNAP_POINT, PEEK_SNAP_POINT } from '@/features/map/constants';
import { BOTTOM_MENU_HEIGHT } from '@/shared/ui/bottom-menu';
import {
  getPlaceSheetLayoutClassNames,
  getSnapTransitionDurationSeconds,
  PLACE_SHEET_HEADER_HEIGHT,
} from './place-sheet-layout';

describe('getPlaceSheetLayoutClassNames', () => {
  it('BottomMenu 가 떠 있으면 드로어를 그 높이만큼 띄운다', () => {
    const layout = getPlaceSheetLayoutClassNames(false, MID_SNAP_POINT);

    expect(layout.drawer.style?.bottom).toBe(BOTTOM_MENU_HEIGHT);
    expect(layout.drawer.style?.maxHeight).toBe(`calc(100dvh - ${BOTTOM_MENU_HEIGHT})`);
  });

  it('스크롤 영역은 드로어를 꽉 채우고(vaul 스냅 계산 전제) 스냅으로 밀린 몫을 하단 패딩으로 보정한다', () => {
    const layout = getPlaceSheetLayoutClassNames(false, MID_SNAP_POINT);

    // 높이를 줄이면 vaul 의 컨테이너 기준 translate 에 드로어가 통째로 화면 밖으로 밀려난다.
    expect(layout.scroller.style?.height).toBe(`calc(100dvh - ${BOTTOM_MENU_HEIGHT} - 0px)`);
    expect(layout.scroller.style?.paddingBottom).toContain(`${100 - MID_SNAP_POINT * 100}dvh`);
  });

  it('full 스냅에서는 밀린 몫이 없어 여유분 패딩만 남는다', () => {
    const layout = getPlaceSheetLayoutClassNames(false, FULL_SNAP_POINT);

    expect(layout.scroller.style?.paddingBottom).toContain('0dvh');
  });

  it('스냅을 모르면(초기 null) mid 만큼 밀린 것으로 보수적으로 보정한다', () => {
    const layout = getPlaceSheetLayoutClassNames(false, null);

    expect(layout.scroller.style?.paddingBottom).toContain(`${100 - MID_SNAP_POINT * 100}dvh`);
  });

  it('BottomMenu 가 숨겨져 있으면 그 공간을 그대로 쓴다', () => {
    const layout = getPlaceSheetLayoutClassNames(true, FULL_SNAP_POINT);

    expect(layout.drawer.className).toContain('bottom-0');
    expect(layout.drawer.className).toContain('max-h-dvh');
    expect(layout.scroller.style?.height).toBe('calc(100dvh - env(safe-area-inset-top))');
  });

  it('BottomMenu 숨김(검색 모드)에서도 스냅으로 밀린 몫을 하단 패딩으로 보정한다 — mid 스냅 스크롤이 맨 아래 장소까지 닿아야 한다', () => {
    const layout = getPlaceSheetLayoutClassNames(true, MID_SNAP_POINT);

    expect(layout.scroller.style?.paddingBottom).toContain(`${100 - MID_SNAP_POINT * 100}dvh`);
    // BottomMenu 가 없으니 홈 인디케이터 자리는 직접 비운다.
    expect(layout.scroller.style?.paddingBottom).toContain('env(safe-area-inset-bottom)');
  });

  it('BottomMenu 숨김 + full 스냅에서는 밀린 몫이 없어 여유분 패딩만 남는다', () => {
    const layout = getPlaceSheetLayoutClassNames(true, FULL_SNAP_POINT);

    expect(layout.scroller.style?.paddingBottom).toContain('0dvh');
  });

  it('full 스냅에서는 상단 safe-area 만큼 드로어 패딩을 주고 스크롤 높이를 그만큼 줄인다', () => {
    const layout = getPlaceSheetLayoutClassNames(false, FULL_SNAP_POINT);

    expect(layout.drawer.style?.paddingTop).toBe('env(safe-area-inset-top)');
    // 드로어 총 높이(패딩 + 스크롤)는 그대로여야 vaul 스냅 translate 가 어긋나지 않는다.
    expect(layout.scroller.style?.height).toBe(
      `calc(100dvh - ${BOTTOM_MENU_HEIGHT} - env(safe-area-inset-top))`,
    );
  });

  it('full 이 아닌 스냅에서는 상단 패딩을 주지 않는다', () => {
    const layout = getPlaceSheetLayoutClassNames(true, MID_SNAP_POINT);

    expect(layout.drawer.style?.paddingTop).toBe('0px');
  });

  it('스크롤 고정 헤더가 뜨면 그 높이만큼 스크롤 영역을 줄여 드로어 총 높이를 유지한다', () => {
    const withHeader = getPlaceSheetLayoutClassNames(true, FULL_SNAP_POINT, true);
    const withoutHeader = getPlaceSheetLayoutClassNames(true, FULL_SNAP_POINT, false);

    expect(withHeader.scroller.style?.height).toBe(
      `calc(100dvh - env(safe-area-inset-top) - ${PLACE_SHEET_HEADER_HEIGHT})`,
    );
    // 헤더가 없을 때는 계산식에 헤더 항이 아예 붙지 않는다.
    expect(withoutHeader.scroller.style?.height).not.toContain(PLACE_SHEET_HEADER_HEIGHT);
  });
});

describe('getSnapTransitionDurationSeconds', () => {
  it('멀리 갈수록 오래 걸린다 — 같은 시간에 끝나 "슝 떨어지는" 인상을 없앤다', () => {
    const shortHop = getSnapTransitionDurationSeconds(MID_SNAP_POINT, FULL_SNAP_POINT);
    const longDrop = getSnapTransitionDurationSeconds(FULL_SNAP_POINT, PEEK_SNAP_POINT);

    expect(shortHop).not.toBeNull();
    expect(longDrop).not.toBeNull();
    expect(longDrop as number).toBeGreaterThan(shortHop as number);
  });

  it('방향과 무관하게 같은 거리는 같은 시간이다', () => {
    expect(getSnapTransitionDurationSeconds(PEEK_SNAP_POINT, MID_SNAP_POINT)).toBe(
      getSnapTransitionDurationSeconds(MID_SNAP_POINT, PEEK_SNAP_POINT),
    );
  });

  it('가장 짧은 전환도 하한(0.6s) 아래로는 내려가지 않는다', () => {
    expect(getSnapTransitionDurationSeconds(0.5, 0.5)).toBe(0.6);
  });

  it('가장 긴 전환도 상한(0.95s) 위로는 올라가지 않는다', () => {
    expect(getSnapTransitionDurationSeconds(0, 1)).toBe(0.95);
  });

  it('비율이 아닌 스냅(px 문자열·null)은 계산하지 않고 null 을 준다 — 호출부가 기본값으로 돌아간다', () => {
    expect(getSnapTransitionDurationSeconds('320px', FULL_SNAP_POINT)).toBeNull();
    expect(getSnapTransitionDurationSeconds(null, FULL_SNAP_POINT)).toBeNull();
  });
});
