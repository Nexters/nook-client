import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useArchives } from '@/features/archive/api/queries';
import { SavePostSheet } from '@/features/share/components/SavePostSheet';
import { Icon16Move, Icon16Trash } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import { MoreMenu, Popup } from '@/shared/ui';
import { deletePost, replacePostArchives } from '../api';
import { invalidatePostLists, postQueryKeys, useUpdatePostArchives } from '../api/queries';
import { deferPostRemoval } from '../lib/pendingPostRemoval';
import type { PostDetail } from '../types';
import { useSavedToArchivesToast } from './ArchiveJumpPopover';
import { PostDeleteSheet } from './PostDeleteSheet';

export interface SavedPostActionsProps {
  detail: PostDetail;
  /**
   * 삭제를 확인한 직후 — 사용처가 확대뷰를 닫는다(직전 화면으로 복귀, NOOK-305).
   * `removed` 는 게시물 자체를 지웠는지(전부 선택) — 아니면 일부 아카이브에서만 뺐다.
   */
  onDeleted: (removed: boolean) => void;
}

/**
 * Figma `장소 > 저장된 게시물 상세` 헤더 더보기 메뉴 — `게시물 이동` / `게시물 삭제`.
 * 게시물 확대뷰(`SavedPostPreview`) 헤더 오른쪽에 들어가고, 메뉴가 여는 시트·팝업·스낵바를
 * 함께 소유한다(시트·팝업은 body 로 포탈돼 확대뷰 위에 뜬다).
 *
 * 삭제는 실행취소 창이 닫힌 뒤에 서버로 보낸다(`deferPostRemoval`) — 그동안 확대뷰는 닫히고
 * 목록에서만 감춰진다.
 */
export function SavedPostActions({ detail, onDeleted }: SavedPostActionsProps) {
  const postId = Number(detail.post.id);
  const { archives, memo } = detail;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const showSavedToast = useSavedToArchivesToast();
  const { data: myArchives } = useArchives();

  const [moveOpen, setMoveOpen] = useState(false);
  const updateArchivesMutation = useUpdatePostArchives(postId);

  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  // 확인 팝업이 떠 있으면 지울 아카이브 id — 게시물 자체를 지우는 경우에만 묻는다.
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);

  function handleMoveSave({ groupIds, memo: nextMemo }: { groupIds: number[]; memo?: string }) {
    updateArchivesMutation.mutate(
      {
        archiveIds: groupIds,
        // 메모는 바뀌었을 때만 보낸다 — 비우면 빈 문자열로 보내 지운다.
        memo: (nextMemo ?? '') !== (memo ?? '') ? (nextMemo ?? '') : undefined,
      },
      {
        onSuccess: () => {
          setMoveOpen(false);
          // 이름·색은 상세를 다시 받기 전이라 내 아카이브 목록에서 찾는다.
          showSavedToast(
            groupIds.flatMap((id) => {
              const archive = myArchives?.find((candidate) => candidate.id === id);
              return archive ? [{ id, name: archive.name, color: archive.color }] : [];
            }),
          );
        },
        onError: () => showToast({ variant: 'simple', title: '게시물을 옮기지 못했어요' }),
      },
    );
  }

  function remove(archiveIds: number[]) {
    const remaining = archives.filter(({ id }) => !archiveIds.includes(id)).map(({ id }) => id);
    const removed = remaining.length === 0;
    setDeleteSheetOpen(false);
    setConfirmIds(null);
    onDeleted(removed);

    const undo = deferPostRemoval(postId, {
      hide: removed,
      commit: async () => {
        if (removed) await deletePost(postId);
        else {
          await replacePostArchives(postId, remaining);
          await queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
        }
        await invalidatePostLists(queryClient);
      },
      onError: () => showToast({ variant: 'simple', title: '게시물을 삭제하지 못했어요' }),
    });
    showToast({
      variant: 'undo',
      title: '게시물이 삭제 됐어요.',
      // 되돌리면 원래 아카이브로 돌아왔다고 알린다(Figma 353:15885 — 실행취소 → 보러가기).
      onUndo: () => {
        undo();
        showSavedToast(archives);
      },
    });
  }

  function handleDeleteSelected(archiveIds: number[]) {
    // 게시물 자체가 지워질 때만 확인을 받는다 — 일부 아카이브에서 빼는 건 장소가 남는다.
    if (archiveIds.length === archives.length) {
      setDeleteSheetOpen(false);
      setConfirmIds(archiveIds);
    } else {
      remove(archiveIds);
    }
  }

  return (
    <>
      <MoreMenu
        items={[
          { label: '게시물 이동', icon: <Icon16Move />, onSelect: () => setMoveOpen(true) },
          {
            label: '게시물 삭제',
            icon: <Icon16Trash />,
            destructive: true,
            // 한 아카이브에만 있으면 고를 게 없다 — 바로 확인 팝업.
            onSelect: () =>
              archives.length > 1
                ? setDeleteSheetOpen(true)
                : setConfirmIds(archives.map(({ id }) => id)),
          },
        ]}
      />

      <SavePostSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="게시물 이동"
        initialGroupIds={archives.map(({ id }) => id)}
        initialMemo={memo}
        pending={updateArchivesMutation.isPending}
        onSave={handleMoveSave}
      />

      <PostDeleteSheet
        open={deleteSheetOpen}
        onOpenChange={setDeleteSheetOpen}
        archives={archives}
        onConfirm={handleDeleteSelected}
      />

      <Popup
        open={confirmIds !== null}
        onClose={() => setConfirmIds(null)}
        title="게시물을 삭제하시겠어요?"
        description={
          <>
            게시물을 삭제하면 게시물에 포함된
            <br />
            장소도 모두 삭제돼요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={() => confirmIds && remove(confirmIds)}
      />
    </>
  );
}
