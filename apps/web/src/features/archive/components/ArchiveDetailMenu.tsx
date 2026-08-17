import { useEffect, useRef, useState } from 'react';
import { Icon16CheckCircle, Icon16Pen, Icon16Trash, Icon24More } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `아카이브 상세 > 더보기 메뉴`(138:5298) — 헤더 더보기(⋯) 버튼이 여는 드롭다운.
 * Radix DropdownMenu 대신 컨트롤드 상태로 직접 그린다 — 항목이 넷뿐인 단발 메뉴라
 * 포지셔닝/포털이 필요 없고, jsdom 테스트에서도 클릭만으로 동작해야 해서다.
 */
export interface ArchiveDetailMenuProps {
  onEdit: () => void;
  /**
   * 선택 삭제 — 게시물 다중 선택 모드로 전환한다.
   * 넘기지 않으면 항목 자체가 빠진다(장소 탭처럼 지울 수 없는 화면).
   */
  onSelectDelete?: () => void;
  onDelete: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  /** 파괴적 액션(아카이브 삭제)만 빨간 글자로 구분한다. */
  destructive?: boolean;
}

function ArchiveDetailMenu({ onEdit, onSelectDelete, onDelete }: ArchiveDetailMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 탭·ESC 로 닫는다. 열려 있는 동안만 문서 리스너를 단다.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const items: MenuItem[] = [
    { label: '아카이브 편집', icon: <Icon16Pen />, onSelect: onEdit },
    // TODO(api): "아카이브 공유"는 공유 링크 스펙 확정 전이라 잠시 숨긴다 — 되살릴 땐
    // `{ label: '아카이브 공유', icon: <Icon16Share /> }` 항목을 이 자리에 다시 넣는다.
    ...(onSelectDelete
      ? [{ label: '선택 삭제', icon: <Icon16CheckCircle />, onSelect: onSelectDelete }]
      : []),
    { label: '아카이브 삭제', icon: <Icon16Trash />, onSelect: onDelete, destructive: true },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
      >
        <Icon24More />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 rounded-xl bg-gray-0 py-2.5 shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
              className={cn(
                'flex w-full items-center gap-2 whitespace-nowrap py-[9px] pr-5 pl-4 text-left text-b2 font-semibold',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
                item.destructive ? 'text-error' : 'text-gray-80',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { ArchiveDetailMenu };
