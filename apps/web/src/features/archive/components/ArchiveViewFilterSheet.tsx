import { useState } from 'react';
import check from '@/assets/images/archive-filter-check.svg';
import { Icon32Delete } from '@/shared/icons/NookIcons';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import type { ArchiveViewPreferences } from '../lib/viewPreferences';

export function ArchiveViewFilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ArchiveViewPreferences;
  onApply: (value: ArchiveViewPreferences) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setDraft(value);
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        showHandle={false}
        className="z-[70] rounded-t-none"
        overlayClassName="z-[70] bg-black/30"
      >
        <div className="flex items-center justify-between px-4 py-5">
          <DrawerTitle className="font-semibold text-b1 text-gray-100">필터</DrawerTitle>
          <button type="button" aria-label="필터 닫기" onClick={() => onOpenChange(false)}>
            <Icon32Delete />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-4 pb-3" data-vaul-no-drag>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-b2 text-gray-60">정렬 옵션</legend>
            <div>
              {(
                [
                  { id: 'LATEST', label: '최신순' },
                  { id: 'OLDEST', label: '오래된순' },
                ] as const
              ).map((option) => (
                <Option
                  key={option.id}
                  label={option.label}
                  name="archive-sort"
                  checked={draft.sort === option.id}
                  onChange={() => setDraft({ ...draft, sort: option.id })}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-b2 text-gray-60">보기 옵션</legend>
            <div>
              {(
                [
                  { id: 'feed', label: '피드형' },
                  { id: 'grid', label: '기본형' },
                  { id: 'list', label: '리스트형' },
                ] as const
              ).map((option) => (
                <Option
                  key={option.id}
                  label={option.label}
                  name="archive-view"
                  checked={draft.view === option.id}
                  onChange={() => setDraft({ ...draft, view: option.id })}
                />
              ))}
            </div>
          </fieldset>
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
function Option({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-between px-1 py-2 text-b2 font-medium text-gray-100 has-[:focus-visible]:ring-2">
      <input className="sr-only" type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
      <span className="grid size-6 place-items-center">
        {checked ? <img src={check} alt="" /> : null}
      </span>
    </label>
  );
}
