import { Icon24CheckOn } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import type { PlaceSort } from '../types';

export const PLACE_SORT_LABEL: Record<PlaceSort['type'], string> = {
  LATEST: '최신순',
  NEAREST: '가까운순',
  OLDEST: '오래된순',
};

/** 시안 순서 그대로 — 최신순·가까운순·오래된순. */
const OPTIONS = Object.keys(PLACE_SORT_LABEL) as PlaceSort['type'][];

interface PlaceSortSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PlaceSort['type'];
  /** 고르는 즉시 반영한다 — 시안에 [적용하기] 가 없다. 시트를 닫는 것도 호출부 몫이다. */
  onSelect: (type: PlaceSort['type']) => void;
}

/** Figma `홈_지도` 정렬 시트(NOOK-430) — 지도 장소 목록의 정렬을 고른다. */
export function PlaceSortSheet({ open, onOpenChange, value, onSelect }: PlaceSortSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* 탭바(z-60)보다 위 — 딤과 함께 바텀내비를 덮는다(ArchiveFilterSheet 와 같은 층). */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]">
        <DrawerTitle className="sr-only">정렬</DrawerTitle>
        {/* 옵션 영역은 3줄(40×3) 높이로 고정하고 넘치면 스크롤한다 — 내용 높이를 따라가게 두면 일부
            iOS 에서 열리는 동안 시트 위쪽 끝이 출렁인다(NOOK-450, 아카이브 필터 시트와 같은 처리).
            옵션 수가 바뀌면 이 높이도 같이 바꾼다. */}
        <fieldset
          className={cn(
            'mx-4 mt-3 mb-[max(1.5rem,env(safe-area-inset-bottom))] flex h-[7.5rem] flex-col overflow-y-auto',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          <legend className="sr-only">정렬</legend>
          {OPTIONS.map((type) => (
            <label
              key={type}
              className="flex h-10 cursor-pointer items-center justify-between px-1 text-b2 font-medium text-gray-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100 has-[:focus-visible]:ring-inset"
            >
              <input
                type="radio"
                name="place-sort"
                className="sr-only"
                checked={type === value}
                // 이미 고른 걸 다시 눌러도 시트는 닫혀야 해서 onChange 가 아니라 onClick 이다.
                onClick={() => onSelect(type)}
                readOnly
              />
              {PLACE_SORT_LABEL[type]}
              {type === value ? <Icon24CheckOn /> : null}
            </label>
          ))}
        </fieldset>
      </DrawerContent>
    </Drawer>
  );
}
