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
  /** 열 때 미리 체크해 둘 아카이브 — 게시물 상세에서 이 게시물이 이미 속한 아카이브. */
  initialGroupIds?: number[];
  /** 열 때 메모 입력에 채워 둘 값. */
  initialMemo?: string;
  /**
   * 넘기면 체크를 전부 해제했을 때 CTA 가 [게시물 삭제]로 바뀌고 이걸 부른다(Figma `게시물 삭제`
   * — 속한 아카이브가 하나도 없는 게시물은 지운다는 뜻). 확인 팝업은 호출부 몫이다.
   */
  onDelete?: () => void;
  /** 스크린 리더용 시트 제목. */
  title?: string;
}

/**
 * Figma `게시물 저장 시트` — 아카이브 다중 선택 + 메모 입력. 공유 게시물 저장과 게시물 상세의
 * 이동·삭제(`initialGroupIds`·`onDelete`)가 함께 쓴다. 열 때마다 초기값으로 다시 시작한다.
 */
export function SavePostSheet({
  open,
  onOpenChange,
  onSave,
  pending,
  initialGroupIds,
  initialMemo,
  onDelete,
  title = '아카이브 추가',
}: SavePostSheetProps) {
  const navigate = useNavigate();
  const { data: archives } = useArchives();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set(initialGroupIds),
  );
  const [memo, setMemo] = useState(initialMemo ?? '');
  // 열리는 순간 초기값으로 되돌린다 — 닫혔다 다시 열면 직전에 만지다 만 체크가 남아 있으면 안 된다
  // (게시물 상세에선 그사이 서버 값이 바뀌었을 수도 있다). 렌더 중 파생 갱신이라 한 프레임도 안 비친다.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedIds(new Set(initialGroupIds));
      setMemo(initialMemo ?? '');
    }
  }
  const deleting = onDelete !== undefined && selectedIds.size === 0;

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
      {/* z-70: 게시물 확대뷰(z-70, 장소 상세)에서도 열린다 — 그 위로 띄운다. */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
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
            disabled={(selectedIds.size === 0 && !deleting) || pending}
            onClick={() =>
              deleting
                ? onDelete()
                : onSave({
                    groupIds: [...selectedIds],
                    memo: memo.trim() ? memo.trim() : undefined,
                  })
            }
          >
            {deleting ? '게시물 삭제' : '저장하기'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
