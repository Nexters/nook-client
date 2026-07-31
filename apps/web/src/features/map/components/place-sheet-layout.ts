import type * as React from 'react';
import { MID_SNAP_POINT } from '@/features/map/constants';
import { BOTTOM_MENU_HEIGHT } from '@/shared/ui/bottom-menu';

/**
 * PlaceSheet(지도 바텀시트)의 위치·크기.
 *
 * `bottomMenuHidden` 은 실제 `useBottomMenuVisibility().hidden` 값을 받는다 — 지금은
 * "장소 선택됨"과 우연히 일치하지만, BottomMenu 를 숨기는 다른 이유가 생겨도 이
 * 레이아웃이 자동으로 따라가려면 실제 표시 여부를 직접 물어야 한다.
 *
 * BottomMenu 가 떠 있을 때(목록 모드):
 *
 * 1. 드로어를 BottomMenu 높이만큼 띄운다(bottom). 값(`BOTTOM_MENU_HEIGHT`)이 Tailwind
 *    클래스로 조합할 수 없는 JS 상수라 inline style 로만 적용한다.
 * 2. 스크롤 영역(= 드로어 높이를 결정)은 반드시 지금처럼 꽉 채워야 한다 — vaul 은 스냅
 *    translate 를 드로어가 아니라 컨테이너(뷰포트) 높이 기준으로 계산하므로, 드로어가
 *    작아지면 같은 translate 에 통째로 화면 밖으로 밀려나 시트가 사라져 보인다(실측 확인).
 * 3. 대신 vaul 이 현재 스냅에서 드로어를 (100 − snap×100)dvh 만큼 아래로 밀어둔 몫은 하단
 *    패딩으로 보정한다 — 이게 없으면 그만큼이 스크롤로도 닿지 않는 죽은 영역이 되어
 *    마지막 콘텐츠가 BottomMenu 뒤/화면 밖에 숨는다(`PlaceDirectInputDrawer` 주석 참고).
 *    드로어 밖으로 밀린 몫에서 bottom 오프셋(BottomMenu 높이)만큼은 이미 상쇄되고 그
 *    자리를 BottomMenu 가 도로 가리므로, 패딩은 정확히 (100 − snap×100)dvh + 여유분이다.
 *    밀린 몫이 스냅마다 다르므로(탐색 모드는 mid·full 양쪽에서 스크롤된다) 현재 스냅을
 *    받아 계산한다 — full(1)에서는 밀린 몫이 없어 여유분만 남는다.
 */
export function getPlaceSheetLayoutClassNames(
  bottomMenuHidden: boolean,
  /** 현재 활성 스냅. vaul 계약상 string(px)일 수도 있지만 이 시트는 비율(number)만 쓴다. */
  snap: number | string | null,
): {
  drawer: { className: string; style?: React.CSSProperties };
  scroller: { className: string; style?: React.CSSProperties };
} {
  if (bottomMenuHidden) {
    return {
      drawer: { className: 'bottom-0 max-h-dvh' },
      scroller: { className: 'h-dvh pb-[calc(1.25rem+env(safe-area-inset-bottom))]' },
    };
  }

  // 스냅을 모르는 상태(초기 null 등)에서는 가장 보수적으로 mid 만큼 밀렸다고 본다 —
  // 패딩이 남으면 스크롤 끝에 여백이 생길 뿐이지만, 모자라면 콘텐츠가 가려진다.
  const snapRatio = typeof snap === 'number' ? snap : MID_SNAP_POINT;
  const drawerHeight = `calc(100dvh - ${BOTTOM_MENU_HEIGHT})`;
  return {
    drawer: {
      className: '',
      style: { bottom: BOTTOM_MENU_HEIGHT, maxHeight: drawerHeight },
    },
    scroller: {
      className: '',
      style: {
        height: drawerHeight,
        paddingBottom: `calc(${100 - snapRatio * 100}dvh + 1.25rem)`,
      },
    },
  };
}
