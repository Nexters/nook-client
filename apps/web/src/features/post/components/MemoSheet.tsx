import { useEffect, useState } from 'react';
import { Button, Drawer, DrawerContent, DrawerTitle, Input } from '@/shared/ui';

/** 시안 카운터 표기(`0/25`) 기준. */
const MEMO_MAX_LENGTH = 25;

/**
 * Figma `아카이브 > 메모하기`.
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

  // 셸 컨테이너가 아니라 기본값(body)으로 포탈한다 — 게시물 상세가 문서 흐름을 따라
  // 셸이 콘텐츠만큼 길어지므로, 셸 기준 fixed 로는 시트가 화면 밖에 붙는다.
  // 데스크톱에서 뷰포트 전체 폭으로 퍼지는 건 max-w 로 셸 폭에 맞춰 막는다.
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[450px] px-4 pt-4">
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
