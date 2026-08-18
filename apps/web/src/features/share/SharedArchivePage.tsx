import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { CollectionCard } from '@/features/archive/components/CollectionCard';
import { PlaceCard } from '@/features/place';
import { cn } from '@/shared/lib/utils';
import { BackButton, Button, COLOR_BG_CLASS, Header } from '@/shared/ui';
import { useSharedArchive, useSharedArchivePlaces, useSharedArchivePosts } from './api/queries';
import { shareErrorMessage } from './lib/shareError';

type DetailTab = 'posts' | 'places';

/**
 * Figma `아카이브 공유 > 공유 아카이브 상세` — 링크로 진입하는 공개 열람 화면.
 * 로그인 없이 동작하며, 저장(구독)·공유 버튼만 로그인 상태를 탄다.
 */
export function SharedArchivePage() {
  const { token = '' } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');

  const metaQuery = useSharedArchive(token);
  const postsQuery = useSharedArchivePosts(token);
  const placesQuery = useSharedArchivePlaces(token);

  // 무한 스크롤 sentinel — ArchiveDetailPage 와 동일 패턴.
  const activeQuery = activeTab === 'posts' ? postsQuery : placesQuery;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = activeQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (metaQuery.isPending) return null;

  if (metaQuery.isError) {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header left={<BackButton />} />
        <ArchiveEmpty message={shareErrorMessage(metaQuery.error)} />
      </main>
    );
  }

  const archive = metaQuery.data;
  const posts = postsQuery.data?.posts;
  const places = placesQuery.data?.places;

  const tabs: { key: DetailTab; label: string; count: number | undefined }[] = [
    { key: 'posts', label: '게시물', count: postsQuery.data?.totalElements },
    { key: 'places', label: '장소', count: placesQuery.data?.totalElements },
  ];

  return (
    <PinnedHeaderLayout
      header={
        <>
          <Header left={<BackButton />} />
          <div className="flex flex-col gap-1 px-4 pt-2 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`size-3 shrink-0 ${COLOR_BG_CLASS[archive.color]}`}
                aria-hidden="true"
              />
              <h1 className="min-w-0 truncate text-h1 font-semibold text-gray-100">
                {archive.name}
              </h1>
            </div>
            {archive.owner ? (
              <p className="font-mono text-e2 text-gray-60">by {archive.owner.nickname}</p>
            ) : null}
          </div>

          {/* 저장(구독)·재공유 — 동작은 다음 Task 에서 붙는다. */}
          <div className="flex gap-2 px-4 pb-4">
            <Button size="sm" variant="secondary" disabled>
              아카이브에 저장 +
            </Button>
            <Button size="sm" variant="secondary" disabled>
              공유
            </Button>
          </div>

          <div role="tablist" className="flex px-4">
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b px-2.5 py-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
                    selected ? 'border-gray-100 text-gray-100' : 'border-gray-20 text-gray-50',
                  )}
                >
                  <span className={cn('text-b2', selected ? 'font-semibold' : 'font-medium')}>
                    {tab.label}
                  </span>
                  {tab.count !== undefined ? (
                    <span className="font-mono text-e2">{tab.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      }
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        {activeTab === 'posts' ? (
          posts?.length === 0 ? (
            <ArchiveEmpty message="저장한 게시물이 없어요" />
          ) : (
            <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
              {posts?.map((post) => (
                // TODO(3단계): 공유 게시물 상세(`/shared/:token/post/:id`) 라우트가 생기면 연결한다.
                <CollectionCard key={post.id} archive={post} />
              ))}
            </div>
          )
        ) : places?.length === 0 ? (
          <ArchiveEmpty message="저장한 장소가 없어요" />
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
            {places?.map((place) => (
              // TODO(4단계): 공유 장소 시트(`?placeId=`)가 생기면 연결한다 (비로그인은 로그인 모달).
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      </main>
    </PinnedHeaderLayout>
  );
}
