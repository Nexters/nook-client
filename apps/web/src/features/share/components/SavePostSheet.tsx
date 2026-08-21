import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchives } from '@/features/archive/api/queries';
import { ArchiveCreateRow } from '@/features/archive/components/ArchiveCreateRow';
import { ArchiveSelectRow } from '@/features/archive/components/ArchiveSelectRow';
import { Button, Drawer, DrawerContent, DrawerTitle, Input } from '@/shared/ui';

/** 메모 최대 길이 — 게시물 메모(`MemoSheet`)와 동일. */
const MEMO_MAX_LENGTH = 25;

interface SavePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 저장 실행은 호출부 몫 — 시트는 API 를 모른다 (향후 일반 저장 플로우에서 재사용). */
  onSave: (input: { groupIds: number[]; memo?: string }) => void;
  pending: boolean;
}

/** Figma `게시물 저장 시트` — 아카이브 다중 선택 + 메모 입력. */
export function SavePostSheet({ open, onOpenChange, onSave, pending }: SavePostSheetProps) {
  const navigate = useNavigate();
  const { data: archives } = useArchives();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set());
  const [memo, setMemo] = useState('');

  // 공유받은(SHARED) 아카이브는 남의 소유라 저장 대상이 아니다.
  const ownedArchives = archives?.filter((archive) => archive.accessType === 'OWNED') ?? [];

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
      <DrawerContent>
        <DrawerTitle className="sr-only">내 아카이브에 저장</DrawerTitle>
        <div className="flex flex-col gap-4 p-4 pb-8">
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {/* TODO(후속): 시트 안 인라인 생성 — v1 은 아카이브 목록으로 보내 그 위에 생성
                오버레이를 띄운다(`?new`). 시트는 닫힌다. */}
            <ArchiveCreateRow onClick={() => navigate('/archive?new=1')} />
            {ownedArchives.map((archive) => (
              <ArchiveSelectRow
                key={archive.id}
                archive={archive}
                selected={selectedIds.has(archive.id)}
                onSelectedChange={(selected) => toggle(archive.id, selected)}
              />
            ))}
          </div>

          <Input
            value={memo}
            maxLength={MEMO_MAX_LENGTH}
            placeholder="추가로 메모하고 싶은 내용이 있나요?"
            onChange={(event) => setMemo(event.target.value)}
          />

          <Button
            size="lg"
            fullWidth
            disabled={selectedIds.size === 0 || pending}
            onClick={() =>
              onSave({
                groupIds: [...selectedIds],
                memo: memo.trim() ? memo.trim() : undefined,
              })
            }
          >
            저장하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
