import { env } from '@/shared/config/env';

/**
 * 지도 타일/스타일 옵션. 두 지도(`MapView`·`PlacePreviewMap`)가 같은 생김새를 갖도록 한 곳에서 정한다.
 *
 * - `gl`: Style Editor 스타일 ID 가 있을 때. GL 벡터맵을 켜고 커스텀 스타일을 입힌다 —
 *   상호 POI 는 숨기고 지하철역·노선만 남기는 식의 카테고리별 조절은 이 경로에서만 된다.
 *   줌이 실수형이 되지만 우리 줌 비교/클러스터 계산은 모두 실수를 그대로 받는다.
 * - `raster`: 스타일 ID 가 없을 때의 폴백. 기본 래스터 타일에서 한국어 라벨(lko)·버스 정류장(bs)을
 *   빼고 배경(bg)·도로/시설(ol)·지하철 노선(sw)만 요청한다. 라벨은 언어 단위로만 켜고 끌 수
 *   있어 역 이름도 함께 사라진다.
 */
export type MapStyleOptions =
  | { mode: 'gl'; gl: true; customStyleId: string }
  | { mode: 'raster'; overlayType: string };

export const RASTER_OVERLAY_TYPE = 'bg.ol.sw';

export function resolveMapStyle(styleId: string = env.naverMapStyleId): MapStyleOptions {
  const trimmed = styleId.trim();
  if (trimmed) return { mode: 'gl', gl: true, customStyleId: trimmed };
  return { mode: 'raster', overlayType: RASTER_OVERLAY_TYPE };
}

/**
 * `NaverMap` 에 펼쳐 넣을 props. raster 모드는 `mapTypes` 레지스트리를, gl 모드는 `gl`·`customStyleId` 를 준다.
 * 레지스트리는 호출부에서 `useMemo` 로 한 번만 만들어야 한다(매 렌더 새 객체면 지도 유형이 계속 재설정된다).
 */
export function buildNaverMapStyleProps(
  navermaps: typeof naver.maps,
  style: MapStyleOptions,
): { gl: true; customStyleId: string } | { mapTypes: naver.maps.MapTypeRegistry } {
  if (style.mode === 'gl') return { gl: true, customStyleId: style.customStyleId };
  return {
    mapTypes: new navermaps.MapTypeRegistry({
      normal: navermaps.NaverStyleMapTypeOptions.getNormalMap({ overlayType: style.overlayType }),
    }),
  };
}
