import { useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { COLOR_BG_CLASS, Snackbar } from '@/shared/ui';
import { BOTTOM_BAR_INSET_VAR, BOTTOM_INSET_VAR } from '@/shared/ui/bottom-menu';
import type { PostArchive } from '../types';

interface Jump {
  title: string;
  archives: PostArchive[];
}

// 띄우는 쪽(확대뷰)은 실행취소 시점에 이미 닫혀 있다 — 그래서 상태를 화면 밖에 두고
// 앱 레이아웃에 한 번 마운트한 `ArchiveJumpHost` 가 그린다.
let current: Jump | null = null;
const listeners = new Set<() => void>();

function setJump(next: Jump | null) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * `"카페"에 저장됐어요. · 보러가기` 스낵바 — 게시물 이동 완료와 삭제 실행취소(복구)가 같이 쓴다
 * (Figma 353:15885). 보러가기는 아카이브가 하나면 바로 그 상세로, 여럿이면 목록 팝오버를 연다.
 */
export function useSavedToArchivesToast() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  return useCallback(
    (archives: PostArchive[]) => {
      const [only] = archives;
      const title =
        archives.length === 1 && only
          ? `"${only.name}"에 저장됐어요.`
          : `"${archives.length}개의 아카이브"에 저장됐어요.`;
      showToast({
        variant: 'link',
        title,
        actionLabel: '보러가기',
        onAction: () => {
          if (archives.length === 1 && only) navigate(`/archive/${only.id}`);
          else setJump({ title, archives });
        },
      });
    },
    [showToast, navigate],
  );
}

/**
 * Figma `"3개의 아카이브"에 저장됐어요 > 보러가기` — 스낵바 위로 아카이브 목록(`List/Popup_Group`)이
 * 펼쳐지고 액션은 [닫기]가 된다. 행을 누르면 그 아카이브 상세로 간다.
 * 토스트와 달리 저절로 사라지지 않는다 — 고르는 중이라서다.
 */
export function ArchiveJumpHost() {
  const jump = useSyncExternalStore(subscribe, () => current);
  const navigate = useNavigate();
  if (!jump) return null;

  const close = () => setJump(null);

  return createPortal(
    // z-100: 토스트와 같은 최상단 레이어 — 확대뷰(70) 위에 뜬다.
    <div className="fixed inset-0 z-[100]">
      {/* 바깥을 누르면 닫힌다. */}
      <button
        type="button"
        aria-label="아카이브 목록 닫기"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="absolute inset-x-0 mx-auto flex max-w-[375px] flex-col gap-1.5 px-4"
        // 토스트 뷰포트와 같은 자리 — 탭바·하단 바가 있으면 그 위로 비켜 앉는다.
        style={{
          bottom: `calc(1.5rem + max(var(${BOTTOM_INSET_VAR}, env(safe-area-inset-bottom)), var(${BOTTOM_BAR_INSET_VAR}, 0px)))`,
        }}
      >
        {jump.archives.map((archive) => (
          <button
            key={archive.id}
            type="button"
            onClick={() => {
              close();
              navigate(`/archive/${archive.id}`);
            }}
            className="flex h-13 items-center gap-2 rounded-xl bg-gray-0 px-4 text-left shadow-[0_4px_20px_0_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span
              className={cn('size-2 shrink-0', COLOR_BG_CLASS[archive.color])}
              aria-hidden="true"
            />
            <span className="truncate text-b2 font-medium text-gray-90">{archive.name}</span>
          </button>
        ))}
        <Snackbar
          className="mt-1.5"
          title={jump.title}
          action={
            <button
              type="button"
              onClick={close}
              className="shrink-0 px-2 py-1 text-b2 font-semibold text-nook-blue"
            >
              닫기
            </button>
          }
        />
      </div>
    </div>,
    document.body,
  );
}
