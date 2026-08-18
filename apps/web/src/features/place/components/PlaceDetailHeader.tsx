import type * as React from 'react';
import { Icon32MappinOff, Icon32MappinOn } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Badge, Thumbnail } from '@/shared/ui';
import type { Place } from '../types';

/**
 * Figma `업체 정보` (장소인식 default|fail × 추가 정보 Default|장소 info).
 * 장소 상세 상단 — 이름·업종·즐겨찾기 + 지형지물 + AI 키워드 + 대표 이미지.
 *
 * 실제로 쓰이는 조합은 아래 3가지다. 별도 컴포넌트로 쪼개지 않고 두 prop 의 조합으로
 * 표현한다 — 세 화면이 같은 헤더를 공유하고, 바텀시트를 끌어올리면 1 → 2 로 연속해서
 * 바뀌기 때문이다(끌어올릴 때 컴포넌트가 통째로 교체되면 상태가 끊긴다).
 *
 * 1. 바텀시트(접힘) — 상세 정보 없음
 *      <PlaceDetailHeader place={place} bookmarked={...} onBookmarkedChange={...} />
 *
 * 2. 풀페이지(바텀시트를 끌어올린 상태) — 상세 정보 노출
 *      <PlaceDetailHeader place={place} ... info={<PlaceInfo ... />} />
 *
 * 3. 위치를 찾지 못한 장소 — 업종 자리에 안내 문구, 아래에 "정보 추가하기" 버튼
 *      <PlaceDetailHeader place={place} recognized={false} onAddInfo={...} ... />
 *      즐겨찾기는 이 상태에서도 그대로 동작한다.
 *
 * `info` 를 ReactNode 로 받는 이유: `PlaceInfo` 는 메모 편집 상태를 스스로 들고 있어
 * 여기서 프롭을 대신 넘겨주면 5개를 그대로 통과시키는 껍데기가 된다.
 */
export interface PlaceDetailHeaderProps {
  place: Place;
  /** false 면 위치 인식 실패 상태 (시안 `장소인식=fail`) */
  recognized?: boolean;
  bookmarked?: boolean;
  onBookmarkedChange?: (bookmarked: boolean) => void;
  /** 인식 실패 시 "정보 추가하기" 액션. 없으면 안내 바를 렌더하지 않는다. */
  onAddInfo?: () => void;
  /** 하단 추가 정보 슬롯 — `<PlaceInfo />` 를 넣는다. */
  info?: React.ReactNode;
  className?: string;
}

function PlaceDetailHeader({
  place,
  recognized = true,
  bookmarked = false,
  onBookmarkedChange,
  onAddInfo,
  info,
  className,
}: PlaceDetailHeaderProps) {
  const keywords = place.keywords ?? [];

  return (
    <div className={cn('flex w-full flex-col bg-gray-0', info ? 'gap-3' : 'gap-1', className)}>
      <div className={cn('flex w-full flex-col', recognized ? 'gap-1' : 'gap-3')}>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-h1 font-semibold text-gray-100">{place.name}</h2>
            <p
              className={cn(
                'truncate text-b2 font-semibold',
                // 인식 실패면 업종 대신 안내 문구가 들어가고 톤이 한 단계 흐려진다.
                recognized ? 'text-gray-80' : 'font-medium text-gray-60',
              )}
            >
              {recognized ? place.category : '위치를 찾지 못한 장소'}
            </p>
          </div>
          {onBookmarkedChange ? (
            <button
              type="button"
              onClick={() => onBookmarkedChange(!bookmarked)}
              aria-pressed={bookmarked}
              aria-label={`${place.name} 즐겨찾기`}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
            >
              {bookmarked ? <Icon32MappinOn /> : <Icon32MappinOff />}
            </button>
          ) : null}
        </div>

        {recognized ? (
          <>
            {place.landmark ? (
              <p className="truncate text-b2 font-medium text-gray-70">{place.landmark}</p>
            ) : null}
            {keywords.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 py-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="label">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        ) : onAddInfo ? (
          <button
            type="button"
            onClick={onAddInfo}
            className={cn(
              'flex w-full items-center justify-center rounded-sm bg-gray-10 px-1 py-2',
              'text-b2 font-bold text-gray-80',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
            )}
          >
            정보 추가하기
          </button>
        ) : null}

        {place.thumbnail ? (
          <Thumbnail src={place.thumbnail} alt="" className="h-53 w-full" />
        ) : null}
      </div>

      {info}
    </div>
  );
}

export { PlaceDetailHeader };
