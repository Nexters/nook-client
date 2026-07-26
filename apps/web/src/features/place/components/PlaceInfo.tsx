import clockIcon from '@/assets/icons/16_clock.svg';
import locationIcon from '@/assets/icons/16_location.svg';
import penIcon from '@/assets/icons/16_pen.svg';
import { cn } from '@/shared/lib/utils';
import { EditableTextRow } from '@/shared/ui';

/**
 * Figma `장소 info > Property 1=메모 O | 메모 X`.
 * 장소 상세의 주소·영업시간·메모 세 줄. 주소와 영업시간은 값이 없으면 줄째로 빠지고
 * (시안의 propValue 토글), 메모 줄은 항상 남아 비어 있으면 작성 유도 문구를 보여준다.
 *
 * 메모의 인라인 편집(Enter·blur 저장, Esc 취소)은 `EditableTextRow` 가 소유한다 —
 * `게시물 정보`의 메모 줄과 같은 구조라 공용으로 뽑아 썼다.
 */
export interface PlaceInfoProps {
  address?: string;
  /** 영업 상태 (예: "영업중") */
  businessStatus?: string;
  /** 영업 시간 (예: "11:00 - 19:30") */
  businessHours?: string;
  memo?: string;
  /**
   * 넘기면 메모가 편집 가능해진다. 저장 시점(Enter·blur)에 바뀐 값으로 호출된다.
   * 값이 그대로면 호출하지 않는다.
   */
  onMemoChange?: (memo: string) => void;
  className?: string;
}

function RowIcon({ src }: { src: string }) {
  return <img src={src} alt="" className="size-4 shrink-0" />;
}

function PlaceInfo({
  address,
  businessStatus,
  businessHours,
  memo,
  onMemoChange,
  className,
}: PlaceInfoProps) {
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {address ? (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon src={locationIcon} />
          <p className="truncate text-b2 font-medium text-gray-80">{address}</p>
        </div>
      ) : null}

      {businessStatus || businessHours ? (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon src={clockIcon} />
          <div className="flex min-w-0 items-center gap-1">
            {businessStatus ? (
              <span className="shrink-0 text-b2 font-medium text-gray-80">{businessStatus}</span>
            ) : null}
            {businessStatus && businessHours ? (
              <span className="size-0.5 shrink-0 rounded-full bg-gray-80" aria-hidden="true" />
            ) : null}
            {businessHours ? (
              <span className="truncate text-b2 font-medium text-gray-80">{businessHours}</span>
            ) : null}
          </div>
        </div>
      ) : null}

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

export { PlaceInfo };
