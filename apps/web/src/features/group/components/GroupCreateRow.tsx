import { Icon24Add } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `List/Popup_Group > Property 1=add`.
 * 그룹 선택 목록 맨 끝에 붙는 "새 그룹 생성" 행.
 *
 * 같은 Figma 컴포넌트의 variant 지만 그룹 데이터를 받지 않아
 * `GroupSelectRow` 와 별도 컴포넌트로 뒀다 (nullable group 을 피하려고).
 */
export interface GroupCreateRowProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

function GroupCreateRow({ onClick, label = '새 그룹 생성', className }: GroupCreateRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 bg-gray-0 px-2.5 py-4 text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        className,
      )}
    >
      <Icon24Add className="shrink-0" />
      <span className="truncate text-b1 font-medium text-gray-70">{label}</span>
    </button>
  );
}

export { GroupCreateRow };
