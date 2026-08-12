import {
  Icon24Close,
  Icon24MappinOff,
  Icon24MappinOn,
  Icon32Delete,
  Icon32MappinOff,
  Icon32MappinOn,
} from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { useUpdatePlaceBookmark } from '../api/queries';

/**
 * Figma `업체 정보`(126:13548) 우상단 / `Header > Place Header/44`(126:13403) 우측.
 * 저장 토글 + 닫기 두 버튼 묶음 — 상세 본문 헤더(32px)와 스크롤 시 고정 헤더(24px)가
 * 같은 두 동작을 크기만 달리해 보여줘서 한 컴포넌트로 둔다.
 */
const ICONS = {
  lg: { on: Icon32MappinOn, off: Icon32MappinOff, close: Icon32Delete },
  sm: { on: Icon24MappinOn, off: Icon24MappinOff, close: Icon24Close },
} as const;

export function PlaceActions({
  placeId,
  bookmarked,
  onClose,
  size = 'lg',
  className,
}: {
  placeId: number;
  bookmarked: boolean;
  onClose: () => void;
  /** `lg` = 상세 본문 헤더(32px), `sm` = 스크롤 고정 헤더(24px) */
  size?: 'lg' | 'sm';
  className?: string;
}) {
  const updateBookmark = useUpdatePlaceBookmark();
  const { on: MappinOn, off: MappinOff, close: Close } = ICONS[size];

  return (
    <div className={cn('flex shrink-0 items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => updateBookmark.mutate({ placeId, bookmarked: !bookmarked })}
        disabled={updateBookmark.isPending}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? '저장 취소' : '저장'}
      >
        {bookmarked ? <MappinOn /> : <MappinOff />}
      </button>
      <button type="button" onClick={onClose} aria-label="닫기">
        <Close />
      </button>
    </div>
  );
}
