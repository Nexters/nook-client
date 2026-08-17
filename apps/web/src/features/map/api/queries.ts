import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchSavedPlacesMock } from '../mock/savedPlaceSearch';
import type { MapBounds } from '../types';
import {
  disconnectPostPlace,
  fetchMapPins,
  fetchPlaceDetail,
  fetchRecentPlaces,
  updatePlaceBookmark,
  updatePlaceMemo,
} from '.';

export const mapQueryKeys = {
  pinsAll: ['map', 'pins'] as const,
  pins: (bounds: MapBounds) => ['map', 'pins', bounds] as const,
  recent: ['map', 'recent'] as const,
  detail: (placeId: number) => ['map', 'detail', placeId] as const,
  search: (query: string, archiveId: number | null) => ['map', 'search', query, archiveId] as const,
};

/** 지도 핀(bbox 안의 북마크 장소). 실제 idle 이벤트를 못 받은 동안엔 호출부가 근사 bbox를 대신 넘긴다. */
export function useMapPins(bounds: MapBounds) {
  return useQuery({
    queryKey: mapQueryKeys.pins(bounds),
    queryFn: () => fetchMapPins(bounds),
    // bbox 가 바뀔 때마다 쿼리 키가 통째로 바뀐다 — placeholder 없이는 새 응답이 올
    // 때까지 data 가 undefined 로 떨어져, 팬/줌 때마다 화면의 핀이 전부 사라졌다가
    // 다시 찍힌다. 직전 bbox 의 핀을 유지해 그 깜빡임을 없앤다.
    placeholderData: keepPreviousData,
  });
}

/** "최근 저장한 공간" — 장소 미선택 상태의 목록 모드. */
export function useRecentPlaces() {
  return useQuery({
    queryKey: mapQueryKeys.recent,
    queryFn: fetchRecentPlaces,
  });
}

/**
 * 저장한 공간 검색 — 검색 모드의 결과 목록. 서버 검색 API 가 아직 없어 mock 을
 * 물려두었다. 연동 시 queryFn 만 `../api` 의 실제 fetch 로 바꾸면 된다(키·시그니처 유지).
 */
export function useSearchSavedPlaces(query: string, archiveId: number | null) {
  return useQuery({
    queryKey: mapQueryKeys.search(query, archiveId),
    queryFn: () => searchSavedPlacesMock(query, archiveId),
    // 타이핑마다 쿼리 키가 통째로 바뀐다 — 직전 결과를 유지해 목록 깜빡임을 없앤다(useMapPins 와 동일).
    placeholderData: keepPreviousData,
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
 * 북마크 토글. 성공하면 상세 쿼리를 무효화하고(낙관적 갱신 없음, archive/post 와 동일 컨벤션)
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
      // 연관 장소의 별 표시는 게시물 상세 응답(`postQueryKeys.detail` = ['posts', postId])의
      // places 에서 온다 — post → map 방향 import 가 이미 있어 순환을 피해 접두사를 직접 쓴다.
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * 장소 메모 저장. 게시물 메모(`useUpdatePostMemo`)와 저장 위치가 다른 별개의 메모다.
 * 성공하면 상세 쿼리만 무효화한다 — 핀·목록엔 메모가 안 나온다(낙관적 갱신 없음, 동일 컨벤션).
 */
export function useUpdatePlaceMemo(placeId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memo: string) => updatePlaceMemo(placeId, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
    },
  });
}

/**
 * 장소 삭제 = 그 장소를 가리키던 저장 게시물들과의 연결 끊기.
 * 지도 장소 상세의 "게시물에 포함된 장소"는 여러 게시물에서 모아 보여주므로, 화면이
 * 넘겨준 게시물마다 한 번씩 끊는다. 하나라도 실패하면 실패로 본다(호출부가 목록을 되돌린다).
 */
export function useDisconnectPlaceFromPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ placeId, postIds }: { placeId: number; postIds: number[] }) =>
      Promise.all(postIds.map((postId) => disconnectPostPlace(postId, placeId))),
    onSuccess: (_data, { placeId, postIds }) => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.pinsAll });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.recent });
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.detail(placeId) });
      for (const postId of postIds) {
        // 게시물 상세는 post feature 소유지만 키 접두사가 같아 여기서 무효화한다
        // (map → post 방향 import 가 이미 있어 순환을 피해 접두사를 직접 쓴다).
        queryClient.invalidateQueries({ queryKey: ['posts', postId] });
      }
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
  });
}
