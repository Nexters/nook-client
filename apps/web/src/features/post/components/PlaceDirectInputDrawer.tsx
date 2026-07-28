import { useEffect, useState } from 'react';
import { useAppShellContainer } from '@/app/providers';
import { Icon16Location, Icon18MagnifyingGlass, Icon24Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import { searchMockPlaces } from '../mock/placeSearchResults';

export interface PlaceDirectInputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Figma `게시물 상세_직접 입력` — 연관 장소를 못 찾았을 때 사용자가 직접 검색해 넣는 바텀시트.
 *
 * 검색 결과 행을 눌렀을 때 나오는 다음 화면(장소 확정 등)은 이후 작업이라
 * 이 드로어는 검색어 입력과 결과 목록 표시까지만 담당한다 — 행에는 아직 onClick 이 없다.
 */
function PlaceDirectInputDrawer({ open, onOpenChange }: PlaceDirectInputDrawerProps) {
  const shellContainer = useAppShellContainer();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const results = searchMockPlaces(query);

  // 배경 페이지가 스크롤된 채로 열리면 vaul 이 "콘텐츠를 스크롤하는 중"으로 오인해
  // 끌어내리기(dismiss) 제스처를 막아버린다 — 열려 있는 동안만 문서 스크롤 위치를 고정해
  // 화면은 그대로 두면서 vaul 의 드래그 판정(scrollTop === 0)은 항상 통과하게 한다.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const scrollY = root.scrollTop;
    const previous = {
      position: root.style.position,
      top: root.style.top,
      width: root.style.width,
    };
    root.style.position = 'fixed';
    root.style.top = `-${scrollY}px`;
    root.style.width = '100%';
    return () => {
      root.style.position = previous.position;
      root.style.top = previous.top;
      root.style.width = previous.width;
      root.scrollTop = scrollY;
    };
  }, [open]);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
      container={shellContainer}
    >
      {/* 시안: 화면 높이의 90% 정도를 덮는 고정 높이 — 내용이 적어도/많아도 시트 높이는 그대로다. */}
      <DrawerContent className="h-[90dvh] px-4 pb-11">
        <DrawerTitle className="sr-only">장소 직접 입력</DrawerTitle>
        {/* 앞에 돋보기 아이콘 슬롯이 필요해 공용 `Input` (@/shared/ui) 을 못 쓰고 직접 구현한다 —
            대신 포커스 보더/클리어 버튼 동작은 `Input` 과 동일하게 맞춘다. */}
        <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-lg border border-gray-30 px-3 transition-colors focus-within:border-gray-100">
          <Icon18MagnifyingGlass className="shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="장소명을 입력해주세요"
            className="min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-50"
          />
          {focused && query.length > 0 ? (
            <button
              type="button"
              aria-label="입력 지우기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setQuery('')}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-1"
            >
              <Icon24Delete />
            </button>
          ) : null}
        </div>

        {results.length > 0 ? (
          <ul className="mt-5 flex w-full flex-1 flex-col overflow-y-auto">
            {results.map((place, index) => (
              <li
                key={place.id}
                className={cn(
                  'flex items-center gap-2 py-2',
                  index > 0 && 'border-t border-gray-10',
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-10">
                  <Icon16Location />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-end gap-0.5">
                    <span className="truncate text-b2 font-semibold text-gray-90">
                      {place.name}
                    </span>
                    <span className="shrink-0 text-b3 font-medium text-gray-70">
                      {place.category}
                    </span>
                  </div>
                  <p className="truncate text-b3 font-medium text-gray-80">
                    {place.address} · {place.distance}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export { PlaceDirectInputDrawer };
