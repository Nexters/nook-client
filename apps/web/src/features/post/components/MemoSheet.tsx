import { useEffect, useState } from 'react';
import { Button, Drawer, DrawerContent, DrawerTitle, Input } from '@/shared/ui';

/** 시안 카운터 표기(`0/25`) 기준. */
const MEMO_MAX_LENGTH = 25;

/**
 * Figma `그룹 > 메모하기`.
 * 게시물 메모를 고쳐 쓰는 바텀시트 — 라벨 + 입력 + 저장 버튼.
 *
 * 열릴 때마다 현재 값으로 초안을 되돌린다(취소하면 원래 값 유지).
 * 시트/오버레이/포커스 처리는 공용 `Drawer`(vaul)가 가져간다.
 */
export interface MemoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memo?: string;
  onSave: (memo: string) => void;
}

function MemoSheet({ open, onOpenChange, memo, onSave }: MemoSheetProps) {
  const [draft, setDraft] = useState(memo ?? '');

  useEffect(() => {
    if (open) setDraft(memo ?? '');
  }, [open, memo]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pt-4">
        <DrawerTitle className="text-b3 font-medium text-gray-60">메모</DrawerTitle>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClear={() => setDraft('')}
          maxLength={MEMO_MAX_LENGTH}
          placeholder="추가로 메모하고 싶은 내용이 있나요?"
          className="mt-2"
        />
        <Button
          size="lg"
          fullWidth
          disabled={draft.trim().length === 0}
          onClick={() => {
            onSave(draft.trim());
            onOpenChange(false);
          }}
          className="mt-4"
          style={{ marginBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          저장하기
        </Button>
      </DrawerContent>
    </Drawer>
  );
}

export { MemoSheet };
