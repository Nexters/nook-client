import { useCallback, useEffect, useRef, useState } from 'react';
import { capturePostHogEvent } from '@/lib/posthog';
import { TOAST_DURATION_MS, TOAST_EXIT_MS, useToast } from '@/shared/toast';

/** 삭제 확인 모달·토스트에 이름을 보여줘야 해서 id 만으로는 부족하다. */
export interface DeletablePlace {
  id: string;
  name: string;
}

/**
 * 실행취소를 받아줄 시간. 이 창이 닫혀야 서버에 삭제를 보낸다 —
 * 되돌리기(연결 복구) API 가 없어서 실행 자체를 미루는 쪽으로 만든다.
 */
const UNDO_WINDOW_MS = TOAST_DURATION_MS + TOAST_EXIT_MS;

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

export interface PlaceDeletionOptions {
  /**
   * 실제 삭제. 실행취소 창이 닫힌 뒤에 한 번 호출된다.
   * 실패하면 목록을 되돌리고 안내 토스트를 띄운다.
   */
  onDelete: (placeId: string) => Promise<unknown>;
}

/**
 * 장소 삭제(진입점 → 확인 모달 → 실행취소 토스트 → 서버 반영)의 상태를 한곳에 모은 훅.
 * 지도 장소 상세와 게시물 상세가 같은 흐름을 쓰므로 화면마다 재구현하지 않는다.
 *
 * 확인 직후엔 목록에서만 감추고, 실행취소 창(토스트가 떠 있는 동안)이 닫혀야 실제 삭제를
 * 보낸다 — 서버에 연결 복구 API 가 없어서(`POST /posts/{postId}/places` 는 검색
 * selectionToken 을 받는다) 되돌리기를 "아직 안 보냄"으로 구현한다. 창이 닫히기 전에
 * 화면을 떠나면 그 자리에서 바로 보낸다.
 */
export function usePlaceDeletion({ onDelete }: PlaceDeletionOptions): PlaceDeletion {
  const { showToast } = useToast();
  const [deletedPlaceIds, setDeletedPlaceIds] = useState<string[]>([]);
  const [pendingPlace, setPendingPlace] = useState<DeletablePlace | null>(null);

  // 아직 서버로 보내지 않은 삭제들. 언마운트 때 남은 것을 그대로 흘려보낸다.
  const pendingCommits = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // 최신 onDelete 를 타이머가 보게 한다 — 타이머는 확인 시점의 클로저를 오래 들고 있다.
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const restore = useCallback((placeId: string) => {
    setDeletedPlaceIds((prev) => prev.filter((deletedId) => deletedId !== placeId));
  }, []);

  const commit = useCallback(
    (placeId: string) => {
      pendingCommits.current.delete(placeId);
      void onDeleteRef.current(placeId).catch(() => {
        // 실패하면 목록을 건드리지 않은 상태로 되돌린다(성공 기준: 임의로 변경되지 않는다).
        restore(placeId);
        showToast({ variant: 'simple', title: '장소를 삭제하지 못했어요' });
      });
    },
    [restore, showToast],
  );

  useEffect(() => {
    const commits = pendingCommits.current;
    return () => {
      for (const [placeId, timer] of commits) {
        clearTimeout(timer);
        // 언마운트 후에는 되돌릴 수단이 없다 — 실패 안내 없이 보내기만 한다.
        void onDeleteRef.current(placeId);
      }
      commits.clear();
    };
  }, []);

  const requestDelete = useCallback((place: DeletablePlace) => setPendingPlace(place), []);
  const cancelDelete = useCallback(() => setPendingPlace(null), []);

  const confirmDelete = useCallback(() => {
    if (!pendingPlace) return;
    const { id } = pendingPlace;

    setDeletedPlaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPendingPlace(null);
    capturePostHogEvent('place_deleted', { place_id: id });

    pendingCommits.current.set(
      id,
      setTimeout(() => commit(id), UNDO_WINDOW_MS),
    );

    showToast({
      variant: 'undo',
      title: '장소가 삭제 됐어요.',
      onUndo: () => {
        const timer = pendingCommits.current.get(id);
        if (timer !== undefined) clearTimeout(timer);
        pendingCommits.current.delete(id);
        restore(id);
        capturePostHogEvent('place_delete_undone', { place_id: id });
      },
    });
  }, [pendingPlace, showToast, commit, restore]);

  return { deletedPlaceIds, requestDelete, pendingPlace, cancelDelete, confirmDelete };
}
