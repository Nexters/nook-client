import { Icon16ArrowDiagonal } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `원본 보기 버튼`.
 * 저장된 게시물의 원본(인스타그램 등)으로 나가는 행 — 좌측 계정 표기, 우측 화살표.
 *
 * 이름은 "버튼"이지만 공용 `Button` 과 무관하다 (gray-10 배경 / radius 4 / B2 Regular
 * gray-80 / 좌우 분산). 지금 쓰임이 게시물 상세 한 곳뿐이라 features/post 에 둔다.
 * 다른 곳에도 같은 "라벨 + 우측 아이콘 행"이 생기면 그때 shared/ui 로 올린다.
 */
export interface OriginalPostLinkProps {
  /** 예: "@nook.official on instagram" */
  label: string;
  /** 외부 링크. 없으면 button 으로 렌더되고 onClick 이 쓰인다. */
  href?: string;
  onClick?: () => void;
  className?: string;
}

function OriginalPostLink({ label, href, onClick, className }: OriginalPostLinkProps) {
  const classes = cn(
    'flex h-11 w-full items-center justify-between gap-2 rounded-sm bg-gray-10 px-4 py-2.5',
    'text-b2 font-normal text-gray-80',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
    className,
  );

  const content = (
    <>
      <span className="truncate">{label}</span>
      <Icon16ArrowDiagonal className="shrink-0" />
    </>
  );

  if (href) {
    return (
      // 외부 링크라 새 탭 + noreferrer. 네이티브에서는 시스템 브라우저로 열린다.
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export { OriginalPostLink };
