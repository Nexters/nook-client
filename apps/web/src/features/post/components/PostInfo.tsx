import type * as React from 'react';
import type { PostArchive } from '@/features/post/types';
import { Icon16Archive, Icon16ArrowDown, Icon16Pen } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { COLOR_BG_CLASS, EditableTextRow } from '@/shared/ui';

/**
 * Figma `게시물 정보 > Property 1=메모 O | 메모 X`.
 * 저장된 게시물 하단의 두 줄 — "<아카이브> 에 저장" + 메모. 게시물이 여러 아카이브에
 * 저장돼 있어도 칩은 하나로 합쳐 "카페 외 1개"로 보여준다(Figma `Chip/Group_Tag`, QA).
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
  /** 넘기면 아카이브 칩이 드롭다운 버튼이 된다 — 게시물 상세의 아카이브 시트(이동·삭제)를 연다. */
  onArchivesClick?: () => void;
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
  onArchivesClick,
  className,
}: PostInfoProps) {
  const [first] = archives;
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {first && (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon>
            <Icon16Archive />
          </RowIcon>
          <div className="flex min-w-0 items-center gap-1.5">
            <ArchivesChip
              color={first.color}
              label={archives.length > 1 ? `${first.name} 외 ${archives.length - 1}개` : first.name}
              onClick={onArchivesClick}
            />
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

/** 합친 아카이브 칩. 누를 수 있을 때만 구분선 + ⌄ 를 붙여 드롭다운임을 드러낸다. */
function ArchivesChip({
  color,
  label,
  onClick,
}: {
  color: PostArchive['color'];
  label: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'inline-flex h-[26px] min-w-0 items-center gap-2 rounded-md border border-gray-20 pl-2.5',
        onClick ? 'pr-1.5' : 'pr-2.5',
        onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className={cn('size-2 shrink-0', COLOR_BG_CLASS[color])} aria-hidden="true" />
        <span className="truncate text-b3 font-semibold text-gray-80">{label}</span>
      </span>
      {onClick ? (
        <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
          <span className="h-3.5 w-px bg-gray-10" />
          <Icon16ArrowDown />
        </span>
      ) : null}
    </Tag>
  );
}

export { PostInfo };
