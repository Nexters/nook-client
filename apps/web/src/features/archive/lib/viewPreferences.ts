import { useState } from 'react';

/** 아카이브 상세 목록 보기 형식(NOOK-376) — 피드형 1열 / 기본형 2열 / 리스트형. */
export type ArchiveView = 'feed' | 'grid' | 'list';
/** 아카이브에 추가된 시점 기준 정렬. */
export type ArchiveSort = 'LATEST' | 'OLDEST';

export interface ArchiveViewPreferences {
  view: ArchiveView;
  sort: ArchiveSort;
}

export const DEFAULT_ARCHIVE_VIEW: ArchiveViewPreferences = { view: 'grid', sort: 'LATEST' };

const VIEWS: readonly ArchiveView[] = ['feed', 'grid', 'list'];
const storageKey = (archiveId: string) => `nook.archive-view.v1.${archiveId}`;

/**
 * 아카이브별로 기기 로컬에 저장한 설정(PM 결정 — 재설치·다른 기기에선 기본값으로 돌아간다).
 * 저장값이 없거나 깨졌으면 기본형 2열 + 최신순.
 */
export function readArchiveView(archiveId: string): ArchiveViewPreferences {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(archiveId)) ?? '{}');
    return {
      view: VIEWS.includes(data.view) ? data.view : DEFAULT_ARCHIVE_VIEW.view,
      sort: data.sort === 'OLDEST' ? 'OLDEST' : 'LATEST',
    };
  } catch {
    return DEFAULT_ARCHIVE_VIEW;
  }
}

export function useArchiveView(archiveId: string) {
  const [stored, setStored] = useState(() => ({ archiveId, value: readArchiveView(archiveId) }));
  // 같은 화면에서 다른 아카이브로 넘어가면 그 아카이브 설정을 다시 읽는다(렌더 중 파생 갱신).
  const value = stored.archiveId === archiveId ? stored.value : readArchiveView(archiveId);
  if (stored.archiveId !== archiveId) setStored({ archiveId, value });

  const apply = (next: ArchiveViewPreferences) => {
    setStored({ archiveId, value: next });
    try {
      localStorage.setItem(storageKey(archiveId), JSON.stringify(next));
    } catch {
      // 저장소가 막혀도(사생활 보호 모드·용량 초과) 이번 화면에서는 적용된 채로 쓴다.
    }
  };

  return [value, apply] as const;
}
