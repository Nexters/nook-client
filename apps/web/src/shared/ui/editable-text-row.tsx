import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * 아이콘 + 한 줄 텍스트 + 인라인 편집. Figma 의 `장소 info`·`게시물 정보` 메모 줄이
 * 같은 구조라 여기로 뽑았다.
 *
 * 편집 상태는 이 컴포넌트가 소유한다 — 사용처는 현재 값과 저장 콜백만 넘기면 된다.
 *   값이 있으면 "수정" 탭, 값이 없으면 안내 문구 자체를 탭 → 그 자리에서 입력 전환(자동 포커스)
 *   Enter / 바깥 클릭(blur) → 저장 (앞뒤 공백 제거, 값이 그대로면 콜백 미호출)
 *   Esc → 취소
 *
 * 값이 없을 때 "수정" 버튼을 따로 두지 않는 건 정책이다 — 아직 쓴 게 없으면
 * "수정"할 대상도 없으므로, 작성 진입점은 안내 문구 하나로 통일한다.
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
  /**
   * 넘기면 인라인 편집 대신 이 콜백만 부른다 — 시안이 그 자리 입력이 아니라
   * 별도 편집 화면(게시물 상세의 `메모하기` 바텀시트)을 여는 경우에 쓴다.
   */
  onEdit?: () => void;
  /** 값이 있을 때의 편집 버튼 라벨. 값이 없으면 이 버튼 대신 안내 문구가 진입점이다. */
  editLabel?: string;
  /** 접근성용 입력 라벨 */
  inputLabel?: string;
  className?: string;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100';

function EditableTextRow({
  icon,
  value,
  placeholder = '',
  onValueChange,
  onEdit,
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

  const canEdit = Boolean(onEdit || onValueChange);
  const openEditor = onEdit ?? startEdit;

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
          {value ? (
            <>
              <p className="truncate text-b2 font-medium text-gray-80">{value}</p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={openEditor}
                  className={cn('shrink-0 text-b2 font-medium text-nook-blue', focusRing)}
                >
                  {editLabel}
                </button>
              ) : null}
            </>
          ) : canEdit ? (
            <button
              type="button"
              onClick={openEditor}
              className={cn(
                'min-w-0 truncate text-left text-b2 font-medium text-gray-50',
                focusRing,
              )}
            >
              {placeholder}
            </button>
          ) : (
            <p className="truncate text-b2 font-medium text-gray-50">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}

export { EditableTextRow };
