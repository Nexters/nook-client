import type * as React from 'react';
import { Icon16Clock, Icon16Copy, Icon16Location, Icon16Pen } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { EditableTextRow } from '@/shared/ui';

/**
 * Figma `장소 info > Property 1=메모 O | 메모 X`.
 * 장소 상세의 주소·영업시간·메모 세 줄. 값이 없는 줄은 통째로 빠진다(시안의 propValue
 * 토글). 메모 줄은 비어 있어도 편집 가능하면(`onMemoChange`) 남아 작성 유도 문구를
 * 보여주고, 편집도 불가하면 저장할 곳이 없으므로 렌더하지 않는다.
 *
 * 메모 줄은 `EditableTextRow` 가 소유한다 — `게시물 정보`의 메모 줄과 같은 구조라
 * 공용으로 뽑아 썼다. `onMemoEdit` 를 넘기면 인라인 편집 대신 그 콜백(바텀시트)이 열린다.
 */
export interface PlaceInfoProps {
  address?: string;
  /** 주소 앞에 `4.6km · ` 처럼 붙는 거리 표기. 현재 위치를 못 얻으면 생략된다. */
  distance?: string;
  /** 넘기면 주소 우측에 복사 버튼이 생긴다. 복사 성공 후 호출된다(토스트는 사용처가 띄운다). */
  onAddressCopied?: () => void;
  /** 넘기면 주소 줄 끝에 파란 "지도" 링크가 생겨 새 탭으로 연다(시안 `장소 info`). 없으면 줄에서 빠진다. */
  mapHref?: string;
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
  /** 넘기면 인라인 편집 대신 이 콜백을 부른다 (장소 상세의 `메모하기` 바텀시트). */
  onMemoEdit?: () => void;
  className?: string;
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return <span className="size-4 shrink-0">{children}</span>;
}

function PlaceInfo({
  address,
  distance,
  onAddressCopied,
  mapHref,
  businessStatus,
  businessHours,
  memo,
  onMemoChange,
  onMemoEdit,
  className,
}: PlaceInfoProps) {
  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      onAddressCopied?.();
    } catch {
      // 권한 거부·비보안 컨텍스트 등 복사가 막힌 경우. 실패 안내는 시안에 없어 조용히 넘긴다.
    }
  }

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {address ? (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon>
            <Icon16Location />
          </RowIcon>
          <p className="truncate text-b2 font-medium text-gray-80">
            {distance ? `${distance} · ${address}` : address}
          </p>
          {onAddressCopied ? (
            <button type="button" onClick={copyAddress} aria-label="주소 복사" className="shrink-0">
              <Icon16Copy />
            </button>
          ) : null}
          {mapHref ? (
            // 시안 `장소 info` 의 파란 "지도" — 외부 지도(네이버) 검색 링크로 새 탭에 연다.
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-b2 font-medium text-nook-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              지도
            </a>
          ) : null}
        </div>
      ) : null}

      {businessStatus || businessHours ? (
        <div className="flex min-h-6 w-full items-center gap-2">
          <RowIcon>
            <Icon16Clock />
          </RowIcon>
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

      {/* 값도 없고 편집도 못 하면(=저장할 곳이 없으면) 작성 유도 문구만 남으므로
          주소·영업시간과 같은 규칙으로 줄째 뺀다. */}
      {memo || onMemoChange || onMemoEdit ? (
        <EditableTextRow
          icon={
            <RowIcon>
              <Icon16Pen />
            </RowIcon>
          }
          value={memo}
          placeholder="메모를 남겨보세요"
          onValueChange={onMemoChange}
          onEdit={onMemoEdit}
          inputLabel="메모"
        />
      ) : null}
    </div>
  );
}

export { PlaceInfo };
