import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { PlaceRow } from '@/features/place';
import { toPlace } from '@/features/post/api/queries';
import { ExpandableCaption } from '@/features/post/components/ExpandableCaption';
import { OriginalPostLink } from '@/features/post/components/OriginalPostLink';
import { PostImages } from '@/features/post/components/PostImages';
import { PostImageViewer } from '@/features/post/components/PostImageViewer';
import { Icon16Archive, Icon16ArrowDown, Icon16Pen } from '@/shared/icons/NookIcons';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useToast } from '@/shared/toast';
import { BackButton, COLOR_BG_CLASS, EditableTextRow, Header } from '@/shared/ui';
import { useSaveSharedPost, useSharedPostDetail } from './api/queries';
import { SavePostSheet } from './components/SavePostSheet';
import { shareErrorMessage } from './lib/shareError';

/**
 * Figma `아카이브 공유 > 공유 게시물 상세` — 공유자의 게시물을 읽기 전용으로 보고,
 * 마음에 들면 내 아카이브에 단건 저장한다. 저장하면 그 순간부터 내 게시물이므로
 * 기존 게시물 상세(`/post/{postId}`)로 전환한다 — 이 화면에는 "저장 후 편집 모드"가 없다.
 */
export function SharedPostDetailPage() {
  const { token = '', postId: postIdParam } = useParams();
  const sharedPostId = Number(postIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { gate, wall: loginWall } = useLoginGate();
  const [sheetOpen, setSheetOpen] = useState(false);
  // 뒤로가기(버튼·하드웨어 백·스와이프)로 닫혀야 해서 히스토리 엔트리로 승격한다.
  const [viewerOpen, openViewer, closeViewer] = useHistoryBackedFlag('imageViewer');

  const detailQuery = useSharedPostDetail(token, sharedPostId);
  const savePost = useSaveSharedPost();

  // 공유 게시물 상세는 북마크·공유 장소 시트의 게시물 타일 등으로 콜드 스타트 진입이
  // 가능하다 — 돌아갈 히스토리가 없으면(`key === 'default'`) 뒤로 대신 지도로 보낸다
  // (SharedArchivePage 의 goBack 과 같은 패턴).
  const goBack = () =>
    location.key === 'default' ? navigate('/map', { replace: true }) : navigate(-1);

  if (detailQuery.isPending) return null;

  if (detailQuery.isError) {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header left={<BackButton onClick={goBack} />} />
        <ArchiveEmpty message={shareErrorMessage(detailQuery.error)} />
      </main>
    );
  }

  const detail = detailQuery.data;
  const { post, title, archives, memo } = detail;
  const images = post.images ?? [];
  // 로그인 + 저장 이력: 공유 상세의 archives 는 "내가 같은 원본을 저장한 내 아카이브".
  const [firstSavedArchive] = archives;

  const handleSaveChip = () =>
    gate('아카이브 서비스는 로그인이 필요해요', () => setSheetOpen(true));

  const handleSave = (input: { groupIds: number[]; memo?: string }) =>
    savePost.mutate(
      { shareToken: token, sharedPostId, ...input },
      {
        onSuccess: (myPostId) => {
          setSheetOpen(false);
          // 저장한 순간부터 내 게시물이다 — 편집 가능한 기존 상세로 전환한다.
          // replace: 뒤로가기가 "저장 전 공유 상세"로 돌아가 상태가 어긋나지 않게.
          // entry=share 는 붙이지 않는다 — 그건 네이티브 공유 확장 딥링크 전용 마커라
          // (appLink.ts/PostDetailPage.tsx) 여기서 재사용하면 뒤로가기가 엉뚱하게
          // /map 으로 튄다. 파라미터 없이 replace 하면 히스토리가
          // [/shared/tok, /post/123] 이 되어 평범한 뒤로가기로 공유 아카이브 상세로 돌아간다.
          navigate(`/post/${myPostId}`, { replace: true });
        },
        onError: () => showToast({ variant: 'simple', title: '게시물을 저장하지 못했어요' }),
      },
    );

  return (
    <PinnedHeaderLayout
      header={<Header left={<BackButton onClick={goBack} />} />}
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        <PostImages images={images} onImageClick={openViewer} />

        <div className="flex flex-col gap-2 px-4 pt-1">
          <h1 className="text-h2 font-semibold text-gray-100">{title}</h1>

          {post.caption ? <ExpandableCaption caption={post.caption} /> : null}

          {/* Figma `게시물 정보 > 공유받은화면` — 아카이브 칩과 메모 줄. */}
          <div className="flex min-h-6 items-center gap-2 pt-2">
            <Icon16Archive className="size-4 shrink-0" />
            {firstSavedArchive ? (
              <>
                {/* Figma `게시물 정보 > 그룹여러개` — 칩엔 실제 저장 색이 실린다. 재저장
                    시트를 열 postId 가 이 응답엔 없어(§13) 칩은 표시만 하고 탭은 없다. */}
                <span className="inline-flex h-[26px] w-fit items-center gap-1 rounded-md border border-gray-20 pl-2.5 pr-2.5">
                  <span
                    className={`size-2 shrink-0 ${COLOR_BG_CLASS[firstSavedArchive.color]}`}
                    aria-hidden="true"
                  />
                  <span className="text-b3 font-semibold text-gray-80">
                    {firstSavedArchive.name}
                  </span>
                </span>
                <span className="text-b2 font-medium text-gray-80">
                  {archives.length > 1 ? `외 ${archives.length - 1}곳에 저장` : '에 저장'}
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSaveChip}
                className="inline-flex h-[26px] w-fit items-center gap-1 rounded-md border border-gray-20 py-0 pr-1.5 pl-2.5 text-b3 font-semibold text-gray-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
              >
                아카이브에 저장
                <Icon16ArrowDown className="size-4" />
              </button>
            )}
          </div>

          {memo ? (
            <EditableTextRow
              icon={<Icon16Pen className="size-4 shrink-0" />}
              value={memo}
              inputLabel="메모"
            />
          ) : null}

          {post.originalUrl ? (
            <OriginalPostLink label={post.authorHandle} href={post.originalUrl} className="mt-2" />
          ) : null}
        </div>

        {detail.places.length > 0 ? (
          <>
            <div className="mt-4 h-1.5 w-full bg-gray-10" />
            <section className="px-4 pb-6">
              <h2 className="py-4 text-b1 font-semibold text-gray-100">게시물에 포함된 장소</h2>
              <div className="-mx-4 flex flex-col gap-4">
                {detail.places.map((place) => (
                  <PlaceRow
                    key={place.id}
                    place={toPlace(place)}
                    onClick={() =>
                      // 장소 상세는 지도 화면이 소유한다 — 아카이브 상세의 장소 탭과 같은 딥링크.
                      gate('장소를 확인하려면 로그인이 필요해요', () =>
                        navigate(`/map?placeId=${place.id}`),
                      )
                    }
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {/* fixed 오버레이 — 페이지가 뷰포트보다 길면 셸(will-change-transform)에 붙어
          화면 밖으로 밀려나니 body 로 포탈해 뷰포트 기준으로 띄운다. */}
      {viewerOpen
        ? createPortal(<PostImageViewer images={images} onClose={closeViewer} />, document.body)
        : null}

      {loginWall}

      <SavePostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        pending={savePost.isPending}
      />
    </PinnedHeaderLayout>
  );
}
