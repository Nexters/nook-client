import { describe, expect, it } from 'vitest';
import { getPlaceSheetLayoutClassNames } from './place-sheet-layout';

describe('getPlaceSheetLayoutClassNames', () => {
  it('목록 상태에서는 바텀 메뉴 높이를 확보한다', () => {
    const layout = getPlaceSheetLayoutClassNames(false);

    expect(layout.drawer).toContain('bottom-[calc(60px+env(safe-area-inset-bottom))]');
    expect(layout.scroller).toContain('100dvh-60px');
  });

  it('장소 상세 상태에서는 숨겨진 바텀 메뉴 공간을 제거한다', () => {
    const layout = getPlaceSheetLayoutClassNames(true);

    expect(layout.drawer).toContain('bottom-0');
    expect(layout.drawer).toContain('max-h-dvh');
    expect(layout.scroller).toContain('h-dvh');
    expect(layout.scroller).not.toContain('100dvh-60px');
  });
});
