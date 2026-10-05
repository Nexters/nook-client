import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { archiveQueryKeys } from '@/features/archive/api/queries';
import type { Archive } from '@/features/archive/types';
import { SavedPostActions, SavedPostCard, SavedPostPreview } from '@/features/post';
import { ArchiveJumpHost } from '@/features/post/components/ArchiveJumpPopover';
import { useHiddenPostIds } from '@/features/post/lib/pendingPostRemoval';
import type { PostArchive, PostDetail } from '@/features/post/types';
import { apiClient } from '@/shared/api/http';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { BackButton, Header } from '@/shared/ui';

/**
 * `/dev/post-actions` — 게시물 확대뷰 더보기 메뉴(이동·삭제·실행취소, NOOK-305)를 로그인·서버 없이
 * 확인하는 목 화면. `장소 > 저장된 게시물`(`PlacePostsPage`)과 같은 목록·확대뷰를 목 데이터로 그린다.
 *
 * 쓰기 요청(PUT/PATCH/DELETE `/posts/...`)은 이 화면에 있는 동안만 API 클라이언트의 fetcher 를
 * 바꿔 끼워 가로채고, 목 목록에 그대로 반영한다(나머지 요청은 원래 fetcher 로 보낸다).
 * 실행취소 창(3.2초)이 지나 실제로 "보내는" 시점을 콘솔 로그로도 남긴다.
 */

const image = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="469"><rect width="375" height="469" fill="${color}"/></svg>`,
  )}`;

const MOCK_ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 4, accessType: 'OWNED' },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 2, accessType: 'OWNED' },
  { id: 3, name: 'LP바', color: 'green', placeCount: 1, accessType: 'OWNED' },
  { id: 4, name: '토요일 모임 장소', color: 'purple', placeCount: 0, accessType: 'OWNED' },
];

const archive = (id: number): PostArchive => {
  const found = MOCK_ARCHIVES.find((candidate) => candidate.id === id) as Archive;
  return { id: found.id, name: found.name, color: found.color };
};

const detail = (
  id: number,
  title: string,
  archiveIds: number[],
  colors: string[],
  memo?: string,
): PostDetail => ({
  post: {
    id: String(id),
    authorHandle: '@nook.official on instagram',
    sharedBy: 'by Purr',
    caption:
      '북적이는 성수에서 여유로운 카페를 찾고 있다면 망설임 없이 추천드릴 퍼머넌트해비탯🥛\n성수는 사람이 많아서 카페를 잘 골라야 해요.',
    media: colors.map((color) => ({ url: image(color), type: 'IMAGE' as const })),
    originalUrl: 'https://www.instagram.com/',
  },
  processingStatus: 'COMPLETED',
  processingPercent: 100,
  title,
  archives: archiveIds.map(archive),
  memo,
  places: [],
  placeParsingStatus: 'COMPLETED',
  placeParsingFailureReason: null,
});

const INITIAL_POSTS: PostDetail[] = [
  detail(101, '아카이브 2개에 저장된 게시물', [1, 2], ['#38c8c4', '#a58af2']),
  detail(102, '아카이브 1개에 저장된 게시물', [3], ['#f2a58a'], '토요일에 가보기'),
  detail(103, '아카이브 3개에 저장된 게시물', [1, 2, 3], ['#8af2a5', '#f28ac8', '#c8f28a']),
];

/** 이 화면에 있는 동안만 쓰기 요청을 목 목록에 반영한다. */
function useMockPostWrites(setPosts: React.Dispatch<React.SetStateAction<PostDetail[]>>) {
  const queryClient = useQueryClient();
  const setPostsRef = useRef(setPosts);
  setPostsRef.current = setPosts;

  useEffect(() => {
    // 저장 시트·이동 토스트가 이름을 찾는 내 아카이브 목록. 게스트면 쿼리가 꺼져 있어 캐시가 그대로 쓰인다.
    queryClient.setQueryData(archiveQueryKeys.list, MOCK_ARCHIVES);

    // ApiClient 의 fetcher·토큰은 private 이다 — 개발 화면에서만 런타임으로 바꿔 끼우고 나갈 때 되돌린다.
    const client = apiClient as unknown as {
      fetcher: typeof fetch;
      getAccessToken?: () => Promise<string | null> | string | null;
    };
    const originalFetcher = client.fetcher;
    const originalToken = client.getAccessToken;

    client.getAccessToken = async () => (await originalToken?.()) ?? 'dev-mock-token';
    client.fetcher = async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method?.toUpperCase() ?? 'GET';
      const match = url.pathname.match(/\/posts\/(\d+)(\/groups|\/memo)?$/);
      if (method === 'GET' || !match) return originalFetcher(input, init);

      const postId = match[1];
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      console.info('[dev/post-actions]', method, url.pathname, body ?? '');

      setPostsRef.current((prev) => {
        if (method === 'DELETE') return prev.filter((post) => post.post.id !== postId);
        if (match[2] === '/groups') {
          return prev.map((post) =>
            post.post.id === postId
              ? { ...post, archives: (body.groupIds as number[]).map(archive) }
              : post,
          );
        }
        if (match[2] === '/memo') {
          return prev.map((post) =>
            post.post.id === postId ? { ...post, memo: body?.memo ?? undefined } : post,
          );
        }
        return prev;
      });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    return () => {
      client.fetcher = originalFetcher;
      client.getAccessToken = originalToken;
    };
  }, [queryClient]);
}

export function PostActionsDevPage() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  useMockPostWrites(setPosts);

  const hiddenPostIds = useHiddenPostIds();
  const visiblePosts = posts.filter((post) => !hiddenPostIds.has(Number(post.post.id)));

  const [preview, setPreview] = useState<{ postId: string; imageIndex: number } | null>(null);
  const [previewOpen, openPreview, closePreview] = useHistoryBackedFlag('savedPostPreview');
  const previewDetail = posts.find((post) => post.post.id === preview?.postId);

  return (
    <PinnedHeaderLayout
      header={
        <Header
          left={<BackButton />}
          title="저장된 게시물 (목 데이터)"
          right={
            <button
              type="button"
              onClick={() => setPosts(INITIAL_POSTS)}
              className="text-b2 font-medium text-nook-blue"
            >
              초기화
            </button>
          }
        />
      }
    >
      <p className="px-4 py-3 text-b3 text-gray-60">
        사진을 누르면 확대뷰가 열리고, 헤더 ⋯ 에서 이동·삭제를 해볼 수 있어요. 요청은 서버로 가지
        않고 이 목록에만 반영돼요(콘솔에 기록).
      </p>
      <div className="flex flex-col gap-1.5 bg-gray-10">
        {visiblePosts.map((post) => (
          <div key={post.post.id} className="bg-gray-0 px-4">
            <SavedPostCard
              title={null}
              post={post.post}
              archives={post.archives}
              onImageClick={(imageIndex) => {
                setPreview({ postId: post.post.id, imageIndex });
                openPreview();
              }}
            />
          </div>
        ))}
        {visiblePosts.length === 0 ? (
          <p className="bg-gray-0 py-10 text-center text-b2 text-gray-60">게시물이 없어요</p>
        ) : null}
      </div>

      {previewOpen && previewDetail ? (
        <SavedPostPreview
          title={previewDetail.title}
          post={previewDetail.post}
          initialIndex={preview?.imageIndex}
          onClose={closePreview}
          headerRight={<SavedPostActions detail={previewDetail} onDeleted={closePreview} />}
        />
      ) : null}

      {/* 앱 레이아웃(ProtectedAppLayout) 밖의 개발 라우트라 여기서 직접 마운트한다. */}
      <ArchiveJumpHost />
    </PinnedHeaderLayout>
  );
}
