import { useState } from 'react';
import { Icon32Delete } from '@/shared/icons/NookIcons';
import { Button, CheckIndicator, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import type { ArchiveSort, ArchiveView, ArchiveViewPreferences } from '../lib/viewPreferences';

const SORT_OPTIONS: { id: ArchiveSort; label: string }[] = [
  { id: 'LATEST', label: '최신순' },
  { id: 'OLDEST', label: '오래된순' },
];

const VIEW_OPTIONS: { id: ArchiveView; label: string }[] = [
  { id: 'feed', label: '피드형' },
  { id: 'grid', label: '기본형' },
  { id: 'list', label: '리스트형' },
];

interface ArchiveViewFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 지금 적용 중인 설정. 시트는 열 때 이 값에서 시작한다. */
  value: ArchiveViewPreferences;
  onApply: (value: ArchiveViewPreferences) => void;
}

/**
 * 아카이브 상세 `필터` 시트(NOOK-376) — 정렬·보기 옵션을 고르고 [적용하기]로 반영한다.
 * 닫으면 만지던 선택은 버린다(지도 ArchiveFilterSheet 와 같은 규칙).
 */
export function ArchiveViewFilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: ArchiveViewFilterSheetProps) {
  const [draft, setDraft] = useState(value);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* 탭바(z-60)보다 위 — 딤과 함께 바텀내비를 덮는다. */}
      <DrawerContent className="z-[70]" overlayClassName="z-[70]" showHandle={false}>
        <div className="flex items-center justify-between px-4 py-5">
          <DrawerTitle className="text-h2 font-semibold text-gray-100">필터</DrawerTitle>
          <button type="button" aria-label="닫기" onClick={() => onOpenChange(false)}>
            <Icon32Delete />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-4 pb-3">
          <OptionGroup
            legend="정렬 옵션"
            name="archive-sort"
            options={SORT_OPTIONS}
            selected={draft.sort}
            onSelect={(sort) => setDraft({ ...draft, sort })}
          />
          <OptionGroup
            legend="보기 옵션"
            name="archive-view"
            options={VIEW_OPTIONS}
            selected={draft.view}
            onSelect={(view) => setDraft({ ...draft, view })}
          />
        </div>
        <div
          className="px-4 pt-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            적용하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  name: string;
  options: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-b2 text-gray-60">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.id}
          className="flex h-10 cursor-pointer items-center justify-between px-1 py-2 text-b2 font-medium text-gray-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100"
        >
          <input
            className="sr-only"
            type="radio"
            name={name}
            checked={selected === option.id}
            onChange={() => onSelect(option.id)}
          />
          {option.label}
          {selected === option.id ? <CheckIndicator checked /> : null}
        </label>
      ))}
    </fieldset>
  );
}
