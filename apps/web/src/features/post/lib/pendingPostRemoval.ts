import { useSyncExternalStore } from 'react';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '@/shared/toast';

/**
 * 게시물 삭제의 실행취소 창. 이 창이 닫혀야 서버에 보낸다 — 되돌리기(복구) API 가 없어서
 * `usePlaceDeletion` 처럼 실행 자체를 미룬다.
 *
 * 장소 삭제와 달리 게시물 삭제는 확대뷰를 닫고 목록으로 돌아가는 동작이라, 타이머를 화면
 * 컴포넌트에 두면 화면과 함께 사라진다. 그래서 화면 밖(모듈)에 둔다.
 *
 * ponytail: 창이 닫히기 전에 앱을 완전히 종료하면 요청이 나가지 않아 삭제가 반영되지 않는다.
 * 서버에 복구 API 가 생기면 즉시 보내고 실행취소 때 복구하는 쪽으로 바꾼다.
 */
const UNDO_WINDOW_MS = TOAST_DURATION_MS + TOAST_EXIT_MS;

const timers = new Map<number, ReturnType<typeof setTimeout>>();
/** 목록에서 감출 게시물 — 확인 직후부터 서버 반영(목록 재조회)이 끝날 때까지. */
let hiddenPostIds: ReadonlySet<number> = new Set();
const listeners = new Set<() => void>();

function setHidden(postId: number, hidden: boolean) {
  const next = new Set(hiddenPostIds);
  if (hidden) next.add(postId);
  else next.delete(postId);
  hiddenPostIds = next;
  for (const listener of listeners) listener();
}

/**
 * 실행취소 창이 닫힌 뒤 `commit` 을 보낸다. `hide` 면 그동안 목록에서 감춘다.
 * 실패하면 다시 보이게 하고 `onError` 를 부른다. 돌려준 함수가 실행취소다.
 */
export function deferPostRemoval(
  postId: number,
  { hide, commit, onError }: { hide: boolean; commit: () => Promise<unknown>; onError: () => void },
): () => void {
  if (hide) setHidden(postId, true);
  timers.set(
    postId,
    setTimeout(() => {
      timers.delete(postId);
      commit()
        .catch(onError)
        // 목록 재조회까지 기다린 뒤 풀어야 지운 카드가 한 번 다시 비치지 않는다.
        .finally(() => {
          if (hide) setHidden(postId, false);
        });
    }, UNDO_WINDOW_MS),
  );

  return () => {
    clearTimeout(timers.get(postId));
    timers.delete(postId);
    if (hide) setHidden(postId, false);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 삭제 대기 중이라 목록에서 걸러야 하는 게시물 id. */
export function useHiddenPostIds(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, () => hiddenPostIds);
}
