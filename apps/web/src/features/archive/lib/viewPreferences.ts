import { useState } from 'react';
export type ArchiveView = 'feed' | 'grid' | 'list';
export type ArchiveSort = 'LATEST' | 'OLDEST';
export interface ArchiveViewPreferences {
  view: ArchiveView;
  sort: ArchiveSort;
}
export const DEFAULT_ARCHIVE_VIEW: ArchiveViewPreferences = { view: 'grid', sort: 'LATEST' };
export function readArchiveView(id: string): ArchiveViewPreferences {
  try {
    const data = JSON.parse(localStorage.getItem(`nook.archive-view.v1.${id}`) ?? '{}');
    return {
      view: ['feed', 'grid', 'list'].includes(data.view) ? data.view : 'grid',
      sort: data.sort === 'OLDEST' ? 'OLDEST' : 'LATEST',
    };
  } catch {
    return DEFAULT_ARCHIVE_VIEW;
  }
}
export function useArchiveView(id: string) {
  const [stored, setStored] = useState(() => ({ id, value: readArchiveView(id) }));
  const value = stored.id === id ? stored.value : readArchiveView(id);
  if (stored.id !== id) setStored({ id, value });
  const apply = (next: ArchiveViewPreferences) => {
    setStored({ id, value: next });
    try {
      localStorage.setItem(`nook.archive-view.v1.${id}`, JSON.stringify(next));
    } catch {
      /* Keep the current session usable when storage is full. */
    }
  };
  return [value, apply] as const;
}
