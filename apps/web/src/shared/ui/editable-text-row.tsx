import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 아이콘 + 한 줄 텍스트 + 인라인 편집. Figma 의 `장소 info`·`게시물 정보` 메모 줄이
 * 같은 구조라 여기로 뽑았다.
 *
 * 편집 상태는 이 컴포넌트가 소유한다 — 사용처는 현재 값과 저장 콜백만 넘기면 된다.
 *   "수정" 탭 → 그 자리에서 입력 전환(자동 포커스)
 *   Enter / 바깥 클릭(blur) → 저장 (앞뒤 공백 제거, 값이 그대로면 콜백 미호출)
 *   Esc → 취소
 *
 * `onValueChange` 를 넘기지 않으면 읽기 전용이다(편집 버튼이 아예 렌더되지 않는다).
 * 도메인을 모르는 표현 컴포넌트라 shared/ui 에 둔다.
 */
export interface EditableTextRowProps {
  /** 좌측 16px 아이콘 슬롯 */
  icon?: React.ReactNode;
  value?: string;
  /** 값이 비었을 때 보여줄 문구 (입력 placeholder 로도 쓴다) */
  placeholder?: string;
  onValueChange?: (value: string) => void;
  /** 편집 버튼 라벨. 시안은 값 유무와 무관하게 "수정". */
  editLabel?: string;
  /** 접근성용 입력 라벨 */
  inputLabel?: string;
  className?: string;
}

function EditableTextRow({
  icon,
  value,
  placeholder = '',
  onValueChange,
  editLabel = '수정',
  inputLabel = '입력',
  className,
}: EditableTextRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  // Esc 로 빠져나갈 때 뒤따르는 blur 가 저장을 다시 부르지 않도록 막는다.
  const cancelledRef = React.useRef(false);

  const startEdit = () => {
    setDraft(value ?? '');
    cancelledRef.current = false;
    setEditing(true);
  };

  const commit = () => {
    if (cancelledRef.current) return;
    setEditing(false);
    const next = draft.trim();
    if (next !== (value ?? '')) onValueChange?.(next);
  };

  const cancel = () => {
    cancelledRef.current = true;
    setEditing(false);
  };

  return (
    <div className={cn('flex min-h-6 w-full items-center gap-2', className)}>
      {icon}
      {editing ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: 사용자가 편집 버튼을 눌러 진입한 상태라 포커스 이동이 기대 동작
          autoFocus
          value={draft}
          aria-label={inputLabel}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-80 outline-none',
            'placeholder:text-gray-50',
          )}
        />
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn('truncate text-b2 font-medium', value ? 'text-gray-80' : 'text-gray-50')}
          >
            {value || placeholder}
          </p>
          {onValueChange ? (
            <button
              type="button"
              onClick={startEdit}
              className="shrink-0 text-b2 font-medium text-nook-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              {editLabel}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { EditableTextRow };
