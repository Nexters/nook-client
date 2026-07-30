import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MapBounds } from '../types';
import { fetchMapPins, fetchPlaceDetail, fetchRecentPlaces, updatePlaceBookmark } from '.';

export const mapQueryKeys = {
  pinsAll: ['map', 'pins'] as const,
  pins: (bounds: MapBounds) => ['map', 'pins', bounds] as const,
  recent: ['map', 'recent'] as const,
  detail: (placeId: number) => ['map', 'detail', placeId] as const,
};

/** 지도 핀(bbox 안의 북마크 장소). 실제 idle 이벤트를 못 받은 동안엔 호출부가 근사 bbox를 대신 넘긴다. */
export function useMapPins(bounds: MapBounds) {
  return useQuery({
    queryKey: mapQueryKeys.pins(bounds),
    queryFn: () => fetchMapPins(bounds),
  });
}

/** "최근 저장한 공간" — 장소 미선택 상태의 목록 모드. */
export function useRecentPlaces() {
  return useQuery({
    queryKey: mapQueryKeys.recent,
    queryFn: fetchRecentPlaces,
  });
}

export function usePlaceDetail(placeId: number | null) {
  return useQuery({
    queryKey: mapQueryKeys.detail(placeId ?? -1),
    queryFn: () => fetchPlaceDetail(placeId as number),
    enabled: placeId !== null,
  });
}

/**
 * 북마크 토글. 성공하면 상세 쿼리를 무효화하고(낙관적 갱신 없음, group/post 와 동일 컨벤션)
 * `/places/map`이 북마크된 장소만 내려주므로 지도 핀도 함께 무효화한다 — 그래야 이 화면을
 * 벗어나지 않고도 방금 북마크를 뗀 핀이 지도에서 사라지고(또는 새로 단 핀이 나타나고) 반영된다.
 */
export function useUpdatePlaceBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placeId, bookmarked }: { placeId: number; bookmarked: boolean }) =>
      updatePlaceBookmark(placeId, bookmarked),
    onSuccess: (_data, { placeId }) => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
    },
  });
}
