import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { useArchives } from '@/features/archive/api/queries';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { CollectionCard } from '@/features/archive/components/CollectionCard';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { PlaceCard } from '@/features/place';
import { Icon16ArrowUpTray, Icon16Check, Icon16Plus } from '@/shared/icons/NookIcons';
import { useInfiniteScrollSentinel } from '@/shared/lib/useInfiniteScrollSentinel';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { BackButton, COLOR_BG_CLASS, Header } from '@/shared/ui';
import {
  useSharedArchive,
  useSharedArchivePlaces,
  useSharedArchivePosts,
  useSubscribeSharedArchive,
} from './api/queries';
import { OpenInAppBanner } from './components/OpenInAppBanner';
import { ShareSheet } from './components/ShareSheet';
import { shareErrorMessage } from './lib/shareError';
import { buildShareUrl } from './lib/shareUrl';

type DetailTab = 'posts' | 'places';

/** Figma `butto/40_save` Default·`button/40_share` — gray-10 바탕 + gray-100 라벨 칩. */
const ACTION_CHIP_DEFAULT = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-gray-10 px-4',
  'text-b3 font-medium text-gray-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
);

/** Figma `butto/40_save` Selected — 저장 완료 상태의 채워진 칩. */
const ACTION_CHIP_SELECTED = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-gray-80 px-4',
  'text-b3 font-semibold text-gray-0',
);

/**
 * Figma `아카이브 공유 > 공유 아카이브 상세` — 링크로 진입하는 공개 열람 화면.
 * 로그인 없이 동작하며, 저장(구독)·공유 버튼만 로그인 상태를 탄다.
 */
export function SharedArchivePage() {
  const { token = '' } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { gate, wall: loginWall } = useLoginGate();
  const subscribe = useSubscribeSharedArchive();

  // 장소 상세는 지도 화면이 소유한다 — 아카이브 상세의 장소 탭과 같은 `/map?placeId=`
  // 딥링크. 내 상세 API 는 저장 안 한 장소면 404 라, 공개 API 우회용 공유 토큰을 함께
  // 실어 보낸다. 지도는 로그인 전용 화면이라 게이트를 먼저 태운다(게스트는 이동 없이
  // 제자리에서 월만 보고, 취소하면 공유 화면에 그대로 남는다).
  const openPlace = (placeId: string) =>
    gate('장소를 확인하려면 로그인이 필요해요', () =>
      navigate(`/map?placeId=${placeId}&shareToken=${token}`),
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

  const sentinelRef = useInfiniteScrollSentinel(activeTab === 'posts' ? postsQuery : placesQuery);

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

  // 내 목록에서 이 아카이브를 찾는다 — shareToken 매칭은 내 그룹에서 null 이라 쓸 수 없다
  // (스펙 §7.1). OWNED 면 자기 링크를 연 소유자라 저장 대신 편집 버튼을 보여준다.
  const myEntry = myArchives?.find((item) => item.id === archive.id);
  const isOwner = myEntry?.accessType === 'OWNED';
  const alreadySaved = myEntry !== undefined;

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

            {/* Figma `butto/40_save`·`button/40_share`(227:9934) — 40px 칩 버튼.
                공용 Button 은 전 variant 라벨이 흰색 고정이라(gray-10 바탕 + gray-100 라벨을
                못 만든다) 여기서 직접 그린다. 저장 완료는 채워진 칩(gray-80)으로 굳는다. */}
            <div className="flex gap-2 px-4 pb-4">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => navigate(`/archive/${archive.id}/edit`)}
                  className={ACTION_CHIP_DEFAULT}
                >
                  아카이브 편집
                </button>
              ) : (
                <button
                  type="button"
                  disabled={alreadySaved || subscribe.isPending}
                  onClick={handleSave}
                  className={alreadySaved ? ACTION_CHIP_SELECTED : ACTION_CHIP_DEFAULT}
                >
                  아카이브에 저장
                  {alreadySaved ? <Icon16Check /> : <Icon16Plus />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareSheetOpen(true)}
                className={ACTION_CHIP_DEFAULT}
              >
                공유
                <Icon16ArrowUpTray />
              </button>
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
                    // 처리 중·실패 게시물은 상세에 보여줄 데이터(제목·이미지 등)가 아직
                    // 없거나 영영 없다 — 카드에도 "처리 중…"/"처리 실패"만 보이니 탭도 막는다.
                    onClick={
                      post.processingState
                        ? undefined
                        : () => navigate(`/shared/${token}/post/${post.id}`)
                    }
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
    </>
  );
}
