import { useState } from 'react';
import { useArchives } from '@/features/archive/api/queries';
import { ArchiveSelectRow } from '@/features/archive/components/ArchiveSelectRow';
import type { Archive } from '@/features/archive/types';
import type { ArchiveFilter } from '@/features/map/types';
import { Icon16ArrowRight, Icon24Back, Icon32Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import {
  Avatar,
  Button,
  ButtonGroup,
  CheckIndicator,
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/shared/ui';

type Group = 'OWNED' | 'SHARED';

const GROUP_TITLE: Record<Group, string> = {
  OWNED: '내 아카이브',
  SHARED: '공유받은 아카이브',
};

/** 그룹 행 우측 상태 — 전부 골랐으면 `전체`, 아니면 `선택 수/전체 수`. */
export function groupStatusLabel(selected: number, total: number) {
  return selected === total ? '전체' : `${selected}/${total}`;
}

/**
 * 내 아카이브는 최근 저장순(PM 결정). 공유 아카이브는 `lastSavedAt` 이 늘 비어 있어
 * 서버가 준 순서를 그대로 둔다 — 정렬이 안정적이라 저장 이력 없는 것끼리도 순서가 유지된다.
 */
export function sortByLastSaved(archives: Archive[]) {
  return [...archives].sort((a, b) => (b.lastSavedAt ?? '').localeCompare(a.lastSavedAt ?? ''));
}

/** 시트에서 고른 집합을 적용값으로 — 전부 골랐으면 null(전체)로 접어 서버에 groupIds 를 안 보낸다. */
export function toArchiveFilter(selected: ReadonlySet<number>, archives: Archive[]): ArchiveFilter {
  return archives.every((archive) => selected.has(archive.id)) ? null : [...selected];
}

interface ArchiveFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 지금 지도에 적용 중인 선택. 시트는 열 때 이 값에서 시작한다. */
  value: ArchiveFilter;
  onApply: (filter: ArchiveFilter) => void;
}

/**
 * Figma `지도 - 공유받은 아카이브 필터링` — 지도에 노출할 아카이브 선택(NOOK-311).
 * 첫 화면은 내/공유받은 아카이브 그룹, 그룹을 누르면 개별 아카이브 선택 화면으로 들어간다.
 * 선택은 [적용하기]를 눌러야 지도에 반영되고, 닫으면 만지던 선택은 버린다.
 */
export function ArchiveFilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: ArchiveFilterSheetProps) {
  const { data: archives = [] } = useArchives();
  const owned = sortByLastSaved(archives.filter((archive) => archive.accessType === 'OWNED'));
  const shared = archives.filter((archive) => archive.accessType === 'SHARED');

  // null 은 "전체" — 목록이 오기 전에 열려도 전체 선택으로 보이도록 id 집합으로 미리 펼치지 않는다.
  const [draft, setDraft] = useState<ReadonlySet<number> | null>(() =>
    value ? new Set(value) : null,
  );
  const [group, setGroup] = useState<Group | null>(null);
  // 열리는 순간 적용 중인 값으로 되돌린다 — 직전에 만지다 닫은 선택이 남아 있으면 안 된다
  // (SavePostSheet 와 같은 렌더 중 파생 갱신).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value ? new Set(value) : null);
      setGroup(null);
    }
  }

  const setSelected = (ids: number[], selected: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev ?? archives.map((archive) => archive.id));
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const isSelected = (id: number) => draft === null || draft.has(id);
  const countSelected = (list: Archive[]) =>
    list.filter((archive) => isSelected(archive.id)).length;
  const groupArchives = group === 'SHARED' ? shared : owned;
  const groupSelected = countSelected(groupArchives);
  const groupAllSelected = groupSelected === groupArchives.length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* 탭바(z-60)보다 위 — 딤과 함께 바텀내비를 덮는다(ShareSheet 와 같은 층). */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]" showHandle={false}>
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center">
            {group ? (
              <button type="button" aria-label="뒤로" onClick={() => setGroup(null)}>
                <Icon24Back />
              </button>
            ) : null}
            <DrawerTitle className="text-h2 font-semibold text-gray-100">
              {group ? GROUP_TITLE[group] : '필터'}
            </DrawerTitle>
          </div>
          <button type="button" aria-label="닫기" onClick={() => onOpenChange(false)}>
            <Icon32Delete />
          </button>
        </div>

        <div
          className={cn(
            'flex h-[17.25rem] flex-col overflow-y-auto px-4 pb-3',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {group ? (
            <>
              <label className="flex h-14 shrink-0 cursor-pointer items-center justify-between border-gray-20 border-b pr-4 pl-2.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100 has-[:focus-visible]:ring-inset">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={groupAllSelected}
                  onChange={(event) =>
                    setSelected(
                      groupArchives.map((archive) => archive.id),
                      event.target.checked,
                    )
                  }
                />
                <span className="flex items-center gap-2">
                  {/* 일부만 골랐으면 해제 상태로 그리고 우측 수치로 알린다(시안 주석). */}
                  <CheckIndicator checked={groupAllSelected} />
                  <span className="text-b1 font-medium text-gray-90">전체</span>
                </span>
                <span className="text-b1 font-medium text-gray-90">
                  {groupSelected}/{groupArchives.length}
                </span>
              </label>
              {groupArchives.map((archive) =>
                group === 'OWNED' ? (
                  <ArchiveSelectRow
                    key={archive.id}
                    archive={archive}
                    selected={isSelected(archive.id)}
                    onSelectedChange={(selected) => setSelected([archive.id], selected)}
                  />
                ) : (
                  <SharedArchiveRow
                    key={archive.id}
                    archive={archive}
                    selected={isSelected(archive.id)}
                    onSelectedChange={(selected) => setSelected([archive.id], selected)}
                  />
                ),
              )}
            </>
          ) : (
            (['OWNED', 'SHARED'] as const).map((key) => {
              const list = key === 'OWNED' ? owned : shared;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGroup(key)}
                  className="flex h-14 shrink-0 items-center gap-2 border-gray-20 pr-4 pl-2.5 text-left first:border-b"
                >
                  <span className="flex-1 text-b1 font-medium text-gray-100">
                    {GROUP_TITLE[key]}
                  </span>
                  <span className="text-b2 text-gray-60">
                    {groupStatusLabel(countSelected(list), list.length)}
                  </span>
                  <Icon16ArrowRight />
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {group ? (
            <Button size="lg" fullWidth onClick={() => setGroup(null)}>
              완료
            </Button>
          ) : (
            <ButtonGroup size="lg">
              {/* 시안의 Secondary 는 gray-20 바탕이라 공용 secondary(gray-60)를 여기서만 덮는다. */}
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setDraft(null)}
                className="bg-gray-20 text-gray-90 hover:bg-gray-30 active:bg-gray-30"
              >
                초기화
              </Button>
              <Button size="lg" onClick={() => onApply(draft && toArchiveFilter(draft, archives))}>
                적용하기
              </Button>
            </ButtonGroup>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Figma `List/Popup_Group > Shared` — 공유받은 아카이브 선택 행. 색 스와치 대신 소유자
 * 프로필과 닉네임을 그린다. 행 전체가 체크박스인 구조는 `ArchiveSelectRow` 와 같다.
 */
function SharedArchiveRow({
  archive,
  selected,
  onSelectedChange,
}: {
  archive: Archive;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex h-14 w-full shrink-0 cursor-pointer items-center gap-5 pr-4 pl-2.5 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100 has-[:focus-visible]:ring-inset',
        selected ? 'bg-gray-10' : 'bg-gray-0',
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={selected}
        onChange={(event) => onSelectedChange(event.target.checked)}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar size="xs" src={archive.owner?.profileImageUrl} />
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate text-b1 font-medium text-gray-100">{archive.name}</span>
          {archive.owner ? (
            <span className="shrink-0 text-b3 font-medium text-gray-60">
              {archive.owner.nickname}
            </span>
          ) : null}
        </span>
      </span>
      <CheckIndicator checked={selected} />
    </label>
  );
}
