import { useEffect, useRef, useState } from 'react';
import { useArchives } from '@/features/archive/api/queries';
import { useSearchSavedPlaces } from '@/features/map/api/queries';
import { EmptySavedPlaces } from '@/features/map/components/EmptySavedPlaces';
import { PlaceCard } from '@/features/place';
import { Icon24Back, Icon24Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { ArchiveTag } from '@/shared/ui';

/**
 * 지도 바텀시트의 검색 모드 콘텐츠 — Figma `검색 추가`.
 * 검색 필드(뒤로가기·입력·지우기) + 아카이브 칩 필터 + 건수 + 장소 카드 그리드.
 *
 * 시트 안에 어떻게 얹히는지(슬라이드 전환·높이)는 `PlaceSheet` 가 정하고,
 * 이 패널은 주어진 높이(h-full)를 채우는 콘텐츠만 책임진다.
 */
export function PlaceSearchPanel({
  canScroll,
  onExit,
  onSelectPlace,
}: {
  /** 내부 스크롤 허용 여부 — 시트의 스냅 규칙(`PlaceSheet` 의 canScroll)을 그대로 받는다. */
  canScroll: boolean;
  /** 검색 필드의 뒤로가기 — 검색 모드를 닫는다. */
  onExit: () => void;
  onSelectPlace: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasQuery = query.trim().length > 0;
  const archives = useArchives().data ?? [];
  const results = useSearchSavedPlaces(query, archiveId).data ?? [];

  // 검색 모드 진입 = 검색하려는 의도가 확실하므로 바로 입력을 받는다.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col gap-3 px-4">
      {/* Figma `search field` — 뒤로가기가 필드 안 왼쪽에 붙는 형태라 공용 Input 을 못 쓰고
          직접 구현한다(§PlaceDirectInputDrawer 와 같은 이유). 포커스 보더는 Input 과 맞춘다. */}
      <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-lg border border-gray-30 px-3 transition-colors focus-within:border-gray-100">
        <button type="button" aria-label="검색 닫기" onClick={onExit} className="shrink-0">
          <Icon24Back />
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="장소명을 입력해주세요"
          className="min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-50"
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="입력 지우기"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-1"
          >
            <Icon24Delete />
          </button>
        ) : null}
      </div>

      {/* 칩·건수·결과는 검색어가 있어야 나온다(Figma: 진입 직후엔 필드만 있는 빈 화면). */}
      {hasQuery ? (
        <div
          className={cn(
            'flex flex-1 flex-col pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
            canScroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
          )}
        >
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto py-2">
            <button
              type="button"
              onClick={() => setArchiveId(null)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-b2 font-semibold',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                archiveId === null ? 'border-gray-90 text-gray-90' : 'border-gray-20 text-gray-80',
              )}
            >
              전체
            </button>
            {archives.map((archive) => (
              <ArchiveTag
                key={archive.id}
                color={archive.color}
                onClick={() => setArchiveId(archive.id)}
                className={cn(archiveId === archive.id && 'border-gray-90 text-gray-90')}
              >
                {archive.name}
              </ArchiveTag>
            ))}
          </div>

          <p className="flex shrink-0 items-center py-3 text-b2 font-medium">
            <span className="text-blue">{results.length}</span>
            <span className="text-gray-90">건</span>
          </p>

          {results.length === 0 ? (
            <EmptySavedPlaces />
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-2">
              {results.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={{
                    id: String(place.id),
                    name: place.name,
                    category: place.category ?? '',
                    region: place.region,
                    thumbnail: place.thumbnail,
                  }}
                  onClick={() => onSelectPlace(place.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
