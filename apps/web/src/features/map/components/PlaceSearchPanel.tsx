import { useEffect, useRef, useState } from 'react';
import { SLIDE_DURATION_MS } from '@/app/slide-screen';
import { useSearchSavedPlaces } from '@/features/map/api/queries';
import { EmptySavedPlaces } from '@/features/map/components/EmptySavedPlaces';
import { PlaceCard } from '@/features/place';
import { Icon24Back, Icon24Delete } from '@/shared/icons/NookIcons';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { cn } from '@/shared/lib/utils';
import { ArchiveTag } from '@/shared/ui';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * 지도 바텀시트의 검색 모드 콘텐츠 — Figma `검색 추가`.
 * 검색 필드(뒤로가기·입력·지우기) + 그룹 칩 필터 + 건수 + 장소 카드 그리드.
 *
 * 시트 안에 어떻게 얹히는지(슬라이드 전환·높이)는 `PlaceSheet` 가 정하고,
 * 이 패널은 주어진 높이(h-full)를 채우는 콘텐츠만 책임진다.
 */
export function PlaceSearchPanel({
  canScroll,
  scrollPaddingBottom,
  onExit,
  onSelectPlace,
}: {
  /** 내부 스크롤 허용 여부 — 시트의 스냅 규칙(`PlaceSheet` 의 canScroll)을 그대로 받는다. */
  canScroll: boolean;
  /**
   * 스크롤 영역 하단 패딩 — 시트의 스냅 보정값(`place-sheet-layout` 의 paddingBottom)을
   * 그대로 받는다. full 이 아닌 스냅에서는 vaul 이 드로어를 아래로 밀어둔 몫만큼 목록
   * 끝이 화면 밖에 남으므로, 이 보정 없이는 맨 아래 장소까지 스크롤이 닿지 않는다.
   */
  scrollPaddingBottom?: React.CSSProperties['paddingBottom'];
  /** 검색 필드의 뒤로가기 — 검색 모드를 닫는다. */
  onExit: () => void;
  onSelectPlace: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  // 그룹 칩 선택 — 어느 검색어에서 골랐는지와 함께 둔다. 검색어가 바뀌면 그룹 목록도
  // 바뀌므로, 지난 검색어에서 고른 필터는 새 결과에 적용하지 않는다(아래 groupId 파생).
  // 이펙트로 리셋하면 새 검색어 + 옛 필터 조합의 요청이 한 번 새어 나가서 파생값으로 푼다.
  const [selectedGroup, setSelectedGroup] = useState<{
    query: string;
    groupId: number | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const groupId = selectedGroup?.query === debouncedQuery ? selectedGroup.groupId : null;
  const setGroupId = (id: number | null) =>
    setSelectedGroup({ query: debouncedQuery, groupId: id });
  // 칩 목록은 필터 없는 응답의 그룹 기준 — 칩을 눌러도 다른 칩이 사라지지 않는다.
  // 필터가 없는 동안(groupId === null)은 아래 page 와 같은 쿼리라 요청이 두 번 나가지 않는다.
  // 첫 결과가 오기 전(undefined)에는 결과 영역을 그리지 않는다(Figma: 진입 직후엔 필드만).
  const basePage = useSearchSavedPlaces(debouncedQuery, null);
  const filteredPage = useSearchSavedPlaces(debouncedQuery, groupId);
  // 칩 전환 직후 새 키의 응답이 오기 전엔 직전 화면을 유지한다(keepPreviousData 와 같은 취지).
  const page = filteredPage ?? basePage;

  // 검색 모드 진입 = 검색하려는 의도가 확실하므로 자동으로 입력을 받는다. 단 슬라이드
  // 전환이 끝난 뒤에 — 패널이 아직 translate 로 화면 밖(오른쪽)에 있는 동안 포커스하면
  // iOS Safari 가 입력을 보이게 하려고 비주얼 뷰포트를 옆으로 팬해, 전환이 끝나도 화면이
  // 왼쪽으로 밀린 채 남는다. preventScroll 은 같은 스크롤-인투-뷰 동작의 이중 안전장치다.
  useEffect(() => {
    const timer = setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      SLIDE_DURATION_MS,
    );
    return () => clearTimeout(timer);
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

      {basePage && page ? (
        <div
          style={{
            paddingBottom: scrollPaddingBottom ?? 'calc(1.25rem + env(safe-area-inset-bottom))',
          }}
          className={cn(
            'flex flex-1 flex-col',
            canScroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
          )}
        >
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto py-2">
            <button
              type="button"
              onClick={() => setGroupId(null)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-b2 font-semibold',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                groupId === null ? 'border-gray-90 text-gray-90' : 'border-gray-20 text-gray-80',
              )}
            >
              전체
            </button>
            {basePage.groups.map((group) => (
              <ArchiveTag
                key={group.id}
                color={group.color}
                onClick={() => setGroupId(group.id)}
                className={cn(groupId === group.id && 'border-gray-90 text-gray-90')}
              >
                {group.name}
              </ArchiveTag>
            ))}
          </div>

          <p className="flex shrink-0 items-center py-3 text-b2 font-medium">
            <span className="text-blue">{page.totalCount}</span>
            <span className="text-gray-90">건</span>
          </p>

          {page.items.length === 0 ? (
            <EmptySavedPlaces />
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-2">
              {page.items.map((place) => (
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
