import type * as React from 'react';
import type { PostArchive } from '@/features/post/types';
import { Icon16Archive, Icon16Pen } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { ArchiveTag, EditableTextRow } from '@/shared/ui';

/**
 * Figma `게시물 정보 > Property 1=메모 O | 메모 X`.
 * 저장된 게시물 하단의 두 줄 — "<아카이브> 에 저장" + 메모. 게시물이 여러 아카이브에
 * 저장돼 있으면 아카이브 태그를 나란히 여러 개 보여준다.
 *
 * 메모 줄은 `장소 info` 와 같은 구조라 `EditableTextRow` 를 그대로 쓴다.
 * 아카이브는 도메인 객체 대신 이름·색만 받는다 — 여기서 필요한 건 표시뿐이고,
 * 그래야 archive feature 에 의존하지 않는다.
 */
export interface PostInfoProps {
  archives: PostArchive[];
  memo?: string;
  onMemoChange?: (memo: string) => void;
  /** 넘기면 인라인 편집 대신 이 콜백을 부른다 (게시물 상세의 `메모하기` 바텀시트). */
  onMemoEdit?: () => void;
  /** 넘기면 아카이브 태그가 버튼이 된다 — 게시물 상세에서 그 아카이브 상세로 이동한다. */
  onArchiveClick?: (archiveId: number) => void;
  className?: string;
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return <span className="size-4 shrink-0">{children}</span>;
}

function PostInfo({
  archives,
  memo,
  onMemoChange,
  onMemoEdit,
  onArchiveClick,
  className,
}: PostInfoProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {archives.length > 0 && (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon>
            <Icon16Archive />
          </RowIcon>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {archives.map((archive) => (
              <ArchiveTag
                key={archive.id}
                size="sm"
                color={archive.color}
                onClick={onArchiveClick ? () => onArchiveClick(archive.id) : undefined}
              >
                {archive.name}
              </ArchiveTag>
            ))}
            <span className="shrink-0 text-b2 font-medium text-gray-80">에 저장</span>
          </div>
        </div>
      )}

      <EditableTextRow
        icon={
          <RowIcon>
            <Icon16Pen />
          </RowIcon>
        }
        value={memo}
        placeholder="메모를 남겨보세요"
        onValueChange={onMemoChange}
        onEdit={onMemoEdit}
        inputLabel="메모"
      />
    </div>
  );
}

export { PostInfo };
