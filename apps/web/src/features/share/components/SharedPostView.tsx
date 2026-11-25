import { type ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PinnedHeaderLayout, PinnedHeaderTitle } from '@/app/layouts/PinnedHeaderLayout';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { PlaceRow } from '@/features/place';
import { toPlace } from '@/features/post/api/queries';
import { ExpandableCaption } from '@/features/post/components/ExpandableCaption';
import { OriginalPostLink } from '@/features/post/components/OriginalPostLink';
import { PostImages } from '@/features/post/components/PostImages';
import { PostImageViewer } from '@/features/post/components/PostImageViewer';
import { PostVideoViewer } from '@/features/post/components/PostVideoViewer';
import type { PostDetail } from '@/features/post/types';
import { Icon16Archive, Icon16ArrowDown, Icon16Pen } from '@/shared/icons/NookIcons';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { BackButton, COLOR_BG_CLASS, EditableTextRow, Header } from '@/shared/ui';
import { OpenInAppBanner } from './OpenInAppBanner';
import { SavePostSheet } from './SavePostSheet';

/** 공유 링크가 잘못됐거나 만료됐을 때 — 헤더(뒤로)와 안내 문구만. */
export function SharedPostErrorView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <main
      className="fixed inset-0 flex flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header left={<BackButton onClick={onBack} />} />
      <ArchiveEmpty message={message} />
    </main>
  );
}

interface SharedPostViewProps {
  detail: PostDetail;
  onBack: () => void;
  headerRight?: ReactNode;
  /** 저장 시트의 [저장하기]. 성공하면 호출부가 시트를 닫도록 `closeSheet` 를 넘긴다. */
  onSave: (input: { groupIds: number[]; memo?: string }, closeSheet: () => void) => void;
  savePending: boolean;
  /** 장소 행 탭 — 없으면 행이 눌리지 않는다. 로그인 게이트는 이 뷰가 씌운다. */
  onPlaceClick?: (placeId: number) => void;
  /** 브라우저로 연 공유 링크에 "nook 앱에서 보기" 배너를 띄울 웹 경로. 없으면 배너도 없다. */
  appPath?: string;
  /** 저장 칩 문구. */
  saveLabel?: string;
}

/**
 * 공유받은 게시물을 읽기 전용으로 보여주고 내 아카이브에 저장하게 하는 화면 본문.
 * 아카이브 공유 속 게시물(`SharedPostDetailPage`)과 게시물 단위 공유(`SharedPostSharePage`)가
 * 데이터 출처만 달리해 함께 쓴다.
 */
export function SharedPostView({
  detail,
  onBack,
  headerRight,
  onSave,
  savePending,
  onPlaceClick,
  appPath,
  saveLabel = '아카이브 추가',
}: SharedPostViewProps) {
  const { gate, wall: loginWall } = useLoginGate();
  const [sheetOpen, setSheetOpen] = useState(false);
  // 뒤로가기(버튼·하드웨어 백·스와이프)로 닫혀야 해서 히스토리 엔트리로 승격한다.
  const [viewerOpen, openViewer, closeViewer] = useHistoryBackedFlag('imageViewer');
  // 확대뷰가 시작할 이미지 — 누른 그 이미지다. 열림 여부는 위 히스토리 플래그가 소유하고,
  // 인덱스는 거기 딸린 부가 정보라 컴포넌트 state 로 든다(뒤로가기 계약은 그대로).
  const [viewerIndex, setViewerIndex] = useState(0);
  const openViewerAt = (index: number) => {
    setViewerIndex(index);
    openViewer();
  };
  // 영상 확대뷰는 이미지 뷰어와 레이아웃이 달라 별도 레이어다. 닫는 방식은 같다.
  const [videoViewerOpen, openVideoViewer, closeVideoViewer] = useHistoryBackedFlag('videoViewer');

  // 게시물 상세와 같은 계약 — 제목이 헤더 뒤로 숨으면 헤더가 이어받는다.
  const titleRef = useRef<HTMLHeadingElement>(null);

  const { post, title, archives, memo } = detail;
  const media = post.media ?? [];
  // 로그인 + 저장 이력: 공유 상세의 archives 는 "내가 같은 원본을 저장한 내 아카이브".
  const [firstSavedArchive] = archives;

  const handleSaveChip = () =>
    gate('아카이브 서비스는 로그인이 필요해요', () => setSheetOpen(true));

  return (
    <PinnedHeaderLayout
      header={
        <>
          {appPath ? <OpenInAppBanner path={appPath} /> : null}
          <Header
            left={<BackButton onClick={onBack} />}
            title={<PinnedHeaderTitle target={titleRef}>{title}</PinnedHeaderTitle>}
            right={headerRight}
          />
        </>
      }
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        <PostImages media={media} onImageClick={openViewerAt} onVideoExpand={openVideoViewer} />

        <div className="flex flex-col gap-2 px-4 pt-1">
          <h1 ref={titleRef} className="text-h2 font-semibold text-gray-100">
            {title}
          </h1>

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
                {saveLabel}
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
                    onClick={
                      onPlaceClick
                        ? () =>
                            gate('장소를 확인하려면 로그인이 필요해요', () =>
                              onPlaceClick(place.id),
                            )
                        : undefined
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
        ? createPortal(
            <PostImageViewer media={media} initialIndex={viewerIndex} onClose={closeViewer} />,
            document.body,
          )
        : null}

      {/* 확대 버튼은 단일 영상일 때만 뜨므로 여는 쪽이 곧 media[0] 이다. */}
      {videoViewerOpen && media[0]
        ? createPortal(
            <PostVideoViewer src={media[0].url} onClose={closeVideoViewer} />,
            document.body,
          )
        : null}

      {loginWall}

      <SavePostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={(input) => onSave(input, () => setSheetOpen(false))}
        pending={savePending}
      />
    </PinnedHeaderLayout>
  );
}
