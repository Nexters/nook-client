import groupIcon from '@/assets/icons/16_Group.svg';
import penIcon from '@/assets/icons/16_pen.svg';
import { cn } from '@/shared/lib/utils';
import { EditableTextRow, type GroupColor, GroupTag } from '@/shared/ui';

/**
 * Figma `게시물 정보 > Property 1=메모 O | 메모 X`.
 * 저장된 게시물 하단의 두 줄 — "<그룹> 에 저장" + 메모.
 *
 * 메모 줄은 `장소 info` 와 같은 구조라 `EditableTextRow` 를 그대로 쓴다.
 * 그룹은 도메인 객체 대신 이름·색만 받는다 — 여기서 필요한 건 표시뿐이고,
 * 그래야 group feature 에 의존하지 않는다.
 */
export interface PostInfoProps {
  groupName: string;
  groupColor: GroupColor;
  memo?: string;
  onMemoChange?: (memo: string) => void;
  className?: string;
}

function RowIcon({ src }: { src: string }) {
  return <img src={src} alt="" className="size-4 shrink-0" />;
}

function PostInfo({ groupName, groupColor, memo, onMemoChange, className }: PostInfoProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <div className="flex min-h-6 w-full items-center gap-2">
        <RowIcon src={groupIcon} />
        <div className="flex min-w-0 items-center gap-1">
          <GroupTag size="sm" color={groupColor}>
            {groupName}
          </GroupTag>
          <span className="shrink-0 text-b2 font-medium text-gray-80">에 저장</span>
        </div>
      </div>

      <EditableTextRow
        icon={<RowIcon src={penIcon} />}
        value={memo}
        placeholder="메모를 남겨보세요"
        onValueChange={onMemoChange}
        inputLabel="메모"
      />
    </div>
  );
}

export { PostInfo };
