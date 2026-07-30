import type * as React from 'react';
import type { PostGroup } from '@/features/post/types';
import { Icon16Group, Icon16Pen } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { EditableTextRow, GroupTag } from '@/shared/ui';

/**
 * Figma `게시물 정보 > Property 1=메모 O | 메모 X`.
 * 저장된 게시물 하단의 두 줄 — "<그룹> 에 저장" + 메모. 게시물이 여러 그룹에
 * 저장돼 있으면 그룹 태그를 나란히 여러 개 보여준다.
 *
 * 메모 줄은 `장소 info` 와 같은 구조라 `EditableTextRow` 를 그대로 쓴다.
 * 그룹은 도메인 객체 대신 이름·색만 받는다 — 여기서 필요한 건 표시뿐이고,
 * 그래야 group feature 에 의존하지 않는다.
 */
export interface PostInfoProps {
  groups: PostGroup[];
  memo?: string;
  onMemoChange?: (memo: string) => void;
  /** 넘기면 인라인 편집 대신 이 콜백을 부른다 (게시물 상세의 `메모하기` 바텀시트). */
  onMemoEdit?: () => void;
  className?: string;
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return <span className="size-4 shrink-0">{children}</span>;
}

function PostInfo({ groups, memo, onMemoChange, onMemoEdit, className }: PostInfoProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {groups.length > 0 && (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon>
            <Icon16Group />
          </RowIcon>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {groups.map((group) => (
              <GroupTag key={group.id} size="sm" color={group.color}>
                {group.name}
              </GroupTag>
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
