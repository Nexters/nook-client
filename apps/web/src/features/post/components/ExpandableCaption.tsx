import { useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 게시물 본문 — 접혀 있을 땐 한 줄만 보이고 "더보기"로 펼친다.
 *
 * 펼친 뒤엔 "접기" 버튼뿐 아니라 본문을 다시 눌러도 접힌다. 긴 본문을 펼치면 접기
 * 버튼이 화면 아래로 밀려나서, 읽던 자리에서 바로 접을 수 있어야 한다. 접힌 본문은
 * 그대로 텍스트다 — 펼치는 건 "더보기" 뿐이다.
 *
 * 접는 본문은 `tabIndex={-1}` 로 탭 순서에서 뺀다 — 키보드·보조기기는 바로 아래
 * "접기" 버튼으로 같은 일을 하므로 탭 정지점이 둘일 이유가 없다.
 */
export function ExpandableCaption({ caption, className }: { caption: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLButtonElement>(null);

  /**
   * 본문을 드래그하거나 길게 눌러 텍스트를 고르면 손을 뗄 때 click 이 따라온다 —
   * 복사하려던 것뿐인데 접히면 안 되므로, 본문 안에 잡힌 선택이 있으면 넘긴다.
   */
  function collapseUnlessSelecting() {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && bodyRef.current?.contains(selection.anchorNode)) {
      return;
    }
    setExpanded(false);
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {expanded ? (
        <button
          ref={bodyRef}
          type="button"
          tabIndex={-1}
          onClick={collapseUnlessSelecting}
          className="select-text whitespace-pre-wrap text-left text-b2 font-normal text-gray-80"
        >
          {caption}
        </button>
      ) : (
        <p className="line-clamp-1 whitespace-pre-wrap text-b2 font-normal text-gray-80">
          {caption}
        </p>
      )}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="self-start text-b2 font-medium text-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
      >
        {expanded ? '접기' : '더보기'}
      </button>
    </div>
  );
}
