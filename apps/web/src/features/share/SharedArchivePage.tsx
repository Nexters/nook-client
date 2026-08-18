import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { useArchives } from '@/features/archive/api/queries';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { CollectionCard } from '@/features/archive/components/CollectionCard';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { PlaceCard } from '@/features/place';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { BackButton, Button, COLOR_BG_CLASS, Header } from '@/shared/ui';
import {
  useSharedArchive,
  useSharedArchivePlaces,
  useSharedArchivePosts,
  useSubscribeSharedArchive,
} from './api/queries';
import { OpenInAppBanner } from './components/OpenInAppBanner';
import { SharedPlaceSheet } from './components/SharedPlaceSheet';
import { ShareSheet } from './components/ShareSheet';
import { shareErrorMessage } from './lib/shareError';
import { buildShareUrl } from './lib/shareUrl';

type DetailTab = 'posts' | 'places';

/**
 * Figma `아카이브 공유 > 공유 아카이브 상세` — 링크로 진입하는 공개 열람 화면.
 * 로그인 없이 동작하며, 저장(구독)·공유 버튼만 로그인 상태를 탄다.
 */
export function SharedArchivePage() {
  const { token = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { gate, wall: loginWall } = useLoginGate();
  const subscribe = useSubscribeSharedArchive();

  // 장소 상세 시트 — `?placeId=` 쿼리 파라미터가 열림/닫힘을 결정한다(MapPage 의
  // `?placeId=` 딥링크와 같은 패턴). 잘못된 값(숫자가 아님)이면 닫힌 것으로 본다.
  const placeIdParam = searchParams.get('placeId');
  const selectedPlaceId =
    placeIdParam !== null && /^\d+$/.test(placeIdParam) ? Number(placeIdParam) : null;

  const openPlace = (placeId: string) =>
    gate('장소를 확인하려면 로그인이 필요해요', () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('placeId', placeId);
          return next;
        },
        // replace: MapPage 의 `?placeId=` 컨벤션과 동일 — 열고 닫는 매번 히스토리를
        // 쌓으면 닫은 뒤 뒤로가기가 시트를 다시 열어버린다.
        { replace: true },
      ),
    );

  const closePlace = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('placeId');
        return next;
      },
      { replace: true },
    );

  // 공유 링크로 앱을 처음 연 경우엔 돌아갈 히스토리가 없다(`key === 'default'`) —
  // 그때는 뒤로 대신 지도로 보낸다(`EntryLoginWall` 과 같은 패턴).
  const goBack = () =>
    location.key === 'default' ? navigate('/map', { replace: true }) : navigate(-1);

  const metaQuery = useSharedArchive(token);
  const postsQuery = useSharedArchivePosts(token);
  const placesQuery = useSharedArchivePlaces(token);
  // useArchives 는 비로그인이면 이미 자동으로 쿼리를 끄므로(가드 병합분) 여기서 따로
  // enabled 를 신경 쓸 필요가 없다 — 게스트는 그냥 data 가 undefined 다.
  const { data: myArchives } = useArchives();

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
        <Header left={<BackButton onClick={goBack} />} />
        <ArchiveEmpty message={shareErrorMessage(metaQuery.error)} />
      </main>
    );
  }

  const archive = metaQuery.data;
  const posts = postsQuery.data?.posts;
  const places = placesQuery.data?.places;

  // 저장 완료 판별 — 소유자(OWNED, 자기 링크)와 구독자(SHARED)를 groupId 하나로 커버한다.
  // shareToken 매칭은 내 그룹에서 null 이라 쓸 수 없다 (스펙 §7.1).
  const alreadySaved = myArchives?.some((item) => item.id === archive.id) ?? false;

  const handleSave = () => {
    gate('아카이브 서비스는 로그인이 필요해요', () => {
      subscribe.mutate(token, {
        onSuccess: () =>
          showToast({
            variant: 'action',
            title: '아카이브에 저장됐어요!',
            actionLabel: '보러가기',
            onAction: () => navigate(`/archive/${archive.id}`),
          }),
        onError: () =>
          showToast({
            variant: 'simple',
            title: '아카이브를 저장하지 못했어요',
          }),
      });
    });
  };

  const tabs: { key: DetailTab; label: string; count: number | undefined }[] = [
    { key: 'posts', label: '게시물', count: postsQuery.data?.totalElements },
    { key: 'places', label: '장소', count: placesQuery.data?.totalElements },
  ];

  return (
    <>
      <PinnedHeaderLayout
        header={
          <>
            <OpenInAppBanner token={token} />
            <Header left={<BackButton onClick={goBack} />} />
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

            <div className="flex gap-2 px-4 pb-4">
              <Button
                size="sm"
                variant="secondary"
                disabled={alreadySaved || subscribe.isPending}
                onClick={handleSave}
              >
                {alreadySaved ? '저장됨 ✓' : '아카이브에 저장 +'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShareSheetOpen(true)}>
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
        contentStyle={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <main>
          {activeTab === 'posts' ? (
            posts?.length === 0 ? (
              <ArchiveEmpty message="저장한 게시물이 없어요" />
            ) : (
              <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
                {posts?.map((post) => (
                  <CollectionCard
                    key={post.id}
                    archive={post}
                    onClick={() => navigate(`/shared/${token}/post/${post.id}`)}
                  />
                ))}
              </div>
            )
          ) : places?.length === 0 ? (
            <ArchiveEmpty message="저장한 장소가 없어요" />
          ) : (
            <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
              {places?.map((place) => (
                <PlaceCard key={place.id} place={place} onClick={() => openPlace(place.id)} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} aria-hidden="true" className="h-1" />
        </main>
      </PinnedHeaderLayout>
      {loginWall}
      <ShareSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        url={buildShareUrl(token)}
        archive={archive}
      />
      {selectedPlaceId !== null ? (
        <SharedPlaceSheet token={token} placeId={selectedPlaceId} onClose={closePlace} />
      ) : null}
    </>
  );
}
