import type * as React from 'react';
import { FULL_SNAP_POINT, MID_SNAP_POINT } from '@/features/map/constants';
import { BOTTOM_MENU_HEIGHT } from '@/shared/ui/bottom-menu';

/**
 * 스크롤 시 드래그핸들을 대신하는 고정 헤더의 높이 — Figma `Header > Place Header/44`.
 * `<Header size="bottom">`(제목 B1 24px + pb-5 20px)의 실제 높이와 같다.
 */
export const PLACE_SHEET_HEADER_HEIGHT = '44px';

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
 *
 * full 스냅(드로어가 화면 최상단까지 올라옴)에서는 노치/상태바가 콘텐츠를 덮으므로 상단
 * safe-area 만큼 비운다. 단 드로어 높이는 건드리지 않는다(위 2번) — 드로어에 상단 패딩을
 * 주고 스크롤 영역 높이를 정확히 그만큼 줄여 총 높이를 유지한다. full 이 아닐 땐 시트 위쪽이
 * 이미 화면 안쪽이라 패딩이 죽은 여백이 되므로 넣지 않는다.
 */
export function getPlaceSheetLayoutClassNames(
  bottomMenuHidden: boolean,
  /** 현재 활성 스냅. vaul 계약상 string(px)일 수도 있지만 이 시트는 비율(number)만 쓴다. */
  snap: number | string | null,
  /**
   * 스크롤을 내려 드래그핸들 대신 고정 헤더가 떠 있는 상태(`PLACE_SHEET_HEADER_HEIGHT`).
   * 헤더는 스크롤 영역 밖 형제라, 그만큼 스크롤 영역 높이를 줄여야 드로어 총 높이가
   * 유지된다 — 안 줄이면 스크롤 영역 아래가 `max-h` 에 잘려 마지막 콘텐츠에 닿지 못한다.
   */
  stickyHeader = false,
): {
  drawer: { className: string; style?: React.CSSProperties };
  scroller: { className: string; style?: React.CSSProperties };
} {
  const safeAreaTop = snap === FULL_SNAP_POINT ? 'env(safe-area-inset-top)' : '0px';
  const minusHeader = stickyHeader ? ` - ${PLACE_SHEET_HEADER_HEIGHT}` : '';
  // 스냅을 모르는 상태(초기 null 등)에서는 가장 보수적으로 mid 만큼 밀렸다고 본다 —
  // 패딩이 남으면 스크롤 끝에 여백이 생길 뿐이지만, 모자라면 콘텐츠가 가려진다.
  const snapRatio = typeof snap === 'number' ? snap : MID_SNAP_POINT;
  // vaul 이 현재 스냅에서 드로어를 아래로 밀어둔 몫(위 3번 주석) — 양쪽 분기 공통이다.
  const snapOffset = `${100 - snapRatio * 100}dvh`;

  if (bottomMenuHidden) {
    return {
      drawer: { className: 'bottom-0 max-h-dvh', style: { paddingTop: safeAreaTop } },
      scroller: {
        className: '',
        style: {
          height: `calc(100dvh - ${safeAreaTop}${minusHeader})`,
          // 검색 모드는 full 이 아닌 스냅(mid)에서도 스크롤되므로 밀린 몫을 보정해야
          // 맨 아래 장소까지 닿는다. BottomMenu 가 없으니 홈 인디케이터 자리도 직접 비운다.
          paddingBottom: `calc(${snapOffset} + 1.25rem + env(safe-area-inset-bottom))`,
        },
      },
    };
  }

  const drawerHeight = `calc(100dvh - ${BOTTOM_MENU_HEIGHT})`;
  return {
    drawer: {
      className: '',
      style: { bottom: BOTTOM_MENU_HEIGHT, maxHeight: drawerHeight, paddingTop: safeAreaTop },
    },
    scroller: {
      className: '',
      style: {
        height: `calc(100dvh - ${BOTTOM_MENU_HEIGHT} - ${safeAreaTop}${minusHeader})`,
        paddingBottom: `calc(${snapOffset} + 1.25rem)`,
      },
    },
  };
}

/**
 * 스냅 전환 duration 을 담는 CSS 변수. vaul 이 매 프레임 transition 을 inline style 로
 * 덮어써서 global.css 의 `!important` 규칙으로만 오버라이드되는데, 그 규칙이 이 변수를
 * 읽는다(정의는 `global.css` 의 `[data-vaul-drawer]`).
 */
export const SNAP_DURATION_VAR = '--sheet-snap-duration';

/** 뷰포트 한 화면(스냅 거리 1.0)을 지나는 데 쓰는 시간(초). 사실상 시트의 이동 속도다. */
const SNAP_SECONDS_PER_VIEWPORT = 1.2;
/** 아주 짧은 전환(mid↔full 0.24)이 툭 끊겨 보이지 않을 만큼의 하한. */
const SNAP_DURATION_MIN_S = 0.6;
/** 가장 긴 전환(full→peek 0.77)도 늘어지지 않게 두는 상한. */
const SNAP_DURATION_MAX_S = 0.95;

/**
 * 스냅 사이를 오갈 때 쓸 transition duration(초).
 *
 * vaul 은 이동 거리와 무관하게 고정 시간을 쓰므로, full→peek 처럼 화면을 가로지르는
 * 전환이 mid↔full 같은 짧은 전환과 같은 시간에 끝나 "슝 떨어진다"는 인상을 준다(QA).
 * 거리에 비례시키면 속도가 일정해져 짧은 건 산뜻하게, 긴 건 차분하게 움직인다.
 *
 * 비율이 아닌 스냅(vaul 계약상 가능한 px 문자열)이면 계산할 수 없으므로 null 을 준다 —
 * 호출부가 기본값으로 되돌린다.
 */
export function getSnapTransitionDurationSeconds(
  from: number | string | null,
  to: number | string | null,
): number | null {
  if (typeof from !== 'number' || typeof to !== 'number') return null;
  const distance = Math.abs(to - from);
  return Math.min(
    SNAP_DURATION_MAX_S,
    Math.max(SNAP_DURATION_MIN_S, distance * SNAP_SECONDS_PER_VIEWPORT),
  );
}
