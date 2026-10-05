import { useState } from 'react';
import { ArchiveSelectRow } from '@/features/archive/components/ArchiveSelectRow';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import type { PostArchive } from '../types';

interface PostDeleteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 이 게시물이 속한 아카이브 — 여기서 지울 곳을 고른다. */
  archives: PostArchive[];
  /** 고른 아카이브 id. 전부 고르면 게시물 삭제, 일부면 그 아카이브에서만 뺀다(호출부 몫). */
  onConfirm: (archiveIds: number[]) => void;
}

/**
 * Figma `게시물 삭제 탭 시 > 여러 아카이브에 저장된 경우 아카이브 선택 레이어`.
 * 아무것도 고르지 않은 채 열리고, 하나라도 골라야 [삭제하기]가 켜진다.
 */
export function PostDeleteSheet({ open, onOpenChange, archives, onConfirm }: PostDeleteSheetProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(() => new Set());
  // 열릴 때마다 빈 선택으로 다시 시작한다(SavePostSheet 와 같은 렌더 중 파생 갱신).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelectedIds(new Set());
  }
  const allSelected = selectedIds.size === archives.length;

  const toggle = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* z-70: 게시물 확대뷰(z-70) 위에서 열린다. */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]">
        <div className="flex flex-col gap-4 p-4 pb-8">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-b1 font-medium text-gray-100">
              어디에서 삭제할까요?
            </DrawerTitle>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(allSelected ? new Set() : new Set(archives.map(({ id }) => id)))
              }
              className="text-b2 font-medium text-nook-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              {allSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {archives.map((archive) => (
              <ArchiveSelectRow
                key={archive.id}
                archive={archive}
                selected={selectedIds.has(archive.id)}
                onSelectedChange={(selected) => toggle(archive.id, selected)}
              />
            ))}
          </div>

          <Button
            size="lg"
            fullWidth
            disabled={selectedIds.size === 0}
            onClick={() => onConfirm([...selectedIds])}
          >
            삭제하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
