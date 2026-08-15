import { useCallback, useState } from 'react';
import { capturePostHogEvent } from '@/lib/posthog';
import { useToast } from '@/shared/toast';

/** 삭제 확인 모달·토스트에 이름을 보여줘야 해서 id 만으로는 부족하다. */
export interface DeletablePlace {
  id: string;
  name: string;
}

export interface PlaceDeletion {
  /** 목록에서 걸러내야 하는 장소 id — 삭제한 행은 화면에서 즉시 사라진다. */
  deletedPlaceIds: string[];
  /** 삭제 버튼(행 스와이프)이 부른다 — 바로 지우지 않고 확인 모달을 연다. */
  requestDelete: (place: DeletablePlace) => void;
  /** 확인 모달이 떠 있는 대상. null 이면 모달은 닫혀 있다. */
  pendingPlace: DeletablePlace | null;
  cancelDelete: () => void;
  confirmDelete: () => void;
}

/**
 * 장소 삭제(진입점 → 확인 모달 → 삭제 → 실행취소 토스트)의 상태를 한곳에 모은 훅.
 * 지도 장소 상세와 게시물 상세가 같은 흐름을 쓰므로 화면마다 재구현하지 않는다.
 *
 * TODO(api): 서버에 장소 삭제 API 가 아직 없다(dev OpenAPI 기준 `/places/{placeId}` 는
 * GET 과 북마크 PATCH 뿐). 그래서 지금은 삭제 결과를 이 화면 상태로만 들고 있어
 * 새로고침·재진입하면 되살아난다. API 가 생기면 `confirmDelete` 에서 호출하고
 * (실행취소는 복구 호출), 성공 시 지도 핀(`mapQueryKeys.pinsAll`)·최근 저장 공간
 * (`mapQueryKeys.recent`)·장소 상세·그룹 상세 캐시를 무효화한 뒤 이 로컬 목록은 걷어낸다.
 * 실패하면 `deletedPlaceIds` 를 되돌려 목록이 임의로 바뀌지 않게 해야 한다.
 */
export function usePlaceDeletion(): PlaceDeletion {
  const { showToast } = useToast();
  const [deletedPlaceIds, setDeletedPlaceIds] = useState<string[]>([]);
  const [pendingPlace, setPendingPlace] = useState<DeletablePlace | null>(null);

  const requestDelete = useCallback((place: DeletablePlace) => setPendingPlace(place), []);
  const cancelDelete = useCallback(() => setPendingPlace(null), []);

  const confirmDelete = useCallback(() => {
    if (!pendingPlace) return;
    const { id } = pendingPlace;

    setDeletedPlaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPendingPlace(null);
    capturePostHogEvent('place_deleted', { place_id: id });

    showToast({
      variant: 'undo',
      title: '장소가 삭제 됐어요.',
      onUndo: () => {
        setDeletedPlaceIds((prev) => prev.filter((deletedId) => deletedId !== id));
        capturePostHogEvent('place_delete_undone', { place_id: id });
      },
    });
  }, [pendingPlace, showToast]);

  return { deletedPlaceIds, requestDelete, pendingPlace, cancelDelete, confirmDelete };
}
