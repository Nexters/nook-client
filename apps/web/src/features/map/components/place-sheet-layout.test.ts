import { describe, expect, it } from 'vitest';
import { MID_SNAP_POINT } from '@/features/map/constants';
import { BOTTOM_MENU_HEIGHT } from '@/shared/ui/bottom-menu';
import { getPlaceSheetLayoutClassNames } from './place-sheet-layout';

describe('getPlaceSheetLayoutClassNames', () => {
  it('BottomMenu 가 떠 있으면 드로어를 그 높이만큼 띄운다', () => {
    const layout = getPlaceSheetLayoutClassNames(false);

    expect(layout.drawer.style?.bottom).toBe(BOTTOM_MENU_HEIGHT);
    expect(layout.drawer.style?.maxHeight).toBe(`calc(100dvh - ${BOTTOM_MENU_HEIGHT})`);
  });

  it('스크롤 영역은 드로어를 꽉 채우고(vaul 스냅 계산 전제) 스냅으로 밀린 몫을 하단 패딩으로 보정한다', () => {
    const layout = getPlaceSheetLayoutClassNames(false);

    // 높이를 줄이면 vaul 의 컨테이너 기준 translate 에 드로어가 통째로 화면 밖으로 밀려난다.
    expect(layout.scroller.style?.height).toBe(`calc(100dvh - ${BOTTOM_MENU_HEIGHT})`);
    expect(layout.scroller.style?.paddingBottom).toContain(`${100 - MID_SNAP_POINT * 100}dvh`);
  });

  it('BottomMenu 가 숨겨져 있으면 그 공간을 그대로 쓴다', () => {
    const layout = getPlaceSheetLayoutClassNames(true);

    expect(layout.drawer.className).toContain('bottom-0');
    expect(layout.drawer.className).toContain('max-h-dvh');
    expect(layout.drawer.style).toBeUndefined();
    expect(layout.scroller.className).toContain('h-dvh');
    expect(layout.scroller.style).toBeUndefined();
  });
});
