import { cn } from '@/shared/lib/utils';
import { CheckIndicator, COLOR_BG_CLASS } from '@/shared/ui';
import type { Group } from '../types';

/**
 * Figma `List/Popup_Group > Property 1=Default | selected`.
 * 그룹을 고르는 행 — 좌측 색 스와치 + 이름, 우측 체크 표시.
 * 선택되면 배경이 gray-10 으로 바뀐다.
 *
 * 행 전체가 하나의 체크박스다(이름을 눌러도 토글). 공용 `Checkbox` 는 button 이라
 * label 안에 넣으면 클릭이 겹치므로, 여기선 숨긴 네이티브 checkbox 를 peer 로 두고
 * 표시는 `CheckIndicator` 로 그린다 — 키보드·스크린리더 동작은 네이티브가 가져간다.
 *
 * 시안의 `add` variant 는 그룹 데이터가 없는 다른 행이라 `GroupCreateRow` 로 분리했다.
 */
export interface GroupSelectRowProps {
  group: Group;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  className?: string;
}

function GroupSelectRow({ group, selected, onSelectedChange, className }: GroupSelectRowProps) {
  return (
    <label
      className={cn(
        'flex w-full cursor-pointer items-center justify-between p-4 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100 has-[:focus-visible]:ring-inset',
        selected ? 'bg-gray-10' : 'bg-gray-0',
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={selected}
        onChange={(event) => onSelectedChange(event.target.checked)}
      />
      <span className="flex min-w-0 items-center gap-4">
        {/* 시안의 스와치는 10px 정사각 (GroupTag 의 8px 과 다르다) */}
        <span className={cn('size-2.5 shrink-0', COLOR_BG_CLASS[group.color])} aria-hidden="true" />
        <span className="truncate text-b1 font-medium text-gray-100">{group.name}</span>
      </span>
      <CheckIndicator />
    </label>
  );
}

export { GroupSelectRow };
