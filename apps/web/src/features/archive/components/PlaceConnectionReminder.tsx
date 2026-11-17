import './place-connection-reminder.css';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { POST_FROM_LIST_STATE } from '@/features/post/postEntry';
import { get2, list1, unwrapApiResponse, update1 } from '@/shared/api';
import { env } from '@/shared/config/env';
import { Icon32Delete } from '@/shared/icons/NookIcons';
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useToast } from '@/shared/toast';
import { BackButton, Button, Header } from '@/shared/ui';
import { toArchivePost } from '../api';
import { CollectionCard } from './CollectionCard';

export const PLACE_REMINDER_KEY = ['place-connection-reminder'] as const;

/** Figma 51:3830 / 3987 / 3866 / 3905 / 3945. Images remain post data. */
export function PlaceConnectionReminderCard({
  count,
  thumbnails,
  onDismiss,
  onDisable,
  onView,
  disabling = false,
}: {
  count: number;
  thumbnails: string[];
  onDismiss: () => void;
  onDisable: () => void;
  onView: () => void;
  disabling?: boolean;
}) {
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [readySources, setReadySources] = useState<Set<string>>(() => new Set());
  const visible = thumbnails.slice(0, Math.min(count, 3));
  const revealed = delayElapsed && visible.every((src) => readySources.has(src));
  const markReady = (src: string) =>
    setReadySources((previous) => {
      if (previous.has(src)) return previous;
      return new Set(previous).add(src);
    });
  // 페이지가 자리 잡은 뒤 배너가 등장한다. 사진이 있으면 다 받은 뒤에 — 빈 사진 자리로 열리지 않게.
  useEffect(() => {
    const timer = window.setTimeout(() => setDelayElapsed(true), 900);
    return () => window.clearTimeout(timer);
  }, []);
  if (count < 1) return null;
  return (
    <div className="reminder-reveal" data-revealed={revealed}>
      <div className="reminder-reveal-clip">
        <section
          aria-label="장소 미연결 게시물 안내"
          className="reminder-card relative mb-2 flex flex-col items-center rounded bg-gray-0 p-4"
        >
          <div className="flex w-full flex-col gap-1 p-2">
            <p className="font-semibold text-b1 text-gray-100">
              장소 없는 게시물이 <span className="text-nook-blue">{count}개</span> 있어요!
            </p>
            <p className="text-b2 text-gray-70">게시물 확인하고 장소를 직접 추가해보세요.</p>
          </div>
          {visible.length > 0 ? (
            <div className="flex items-start justify-center pt-4">
              {visible.map((src, index) => {
                const angle =
                  visible.length === 1
                    ? 0
                    : visible.length === 2
                      ? index === 0
                        ? -4
                        : 4
                      : [-8, 0, 8][index];
                return (
                  <div
                    key={src}
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: angle === 0 ? 90 : visible.length === 2 ? 97.593 : 104.712,
                      height: angle === 0 ? 112 : visible.length === 2 ? 118.005 : 123.436,
                      marginRight: index < visible.length - 1 ? -20 : 0,
                    }}
                  >
                    <div
                      className="reminder-photo relative h-28 w-[90px] overflow-hidden rounded-lg shadow-[0_10px_10px_rgba(0,0,0,0.1)]"
                      style={{
                        transform: revealed
                          ? `rotate(${angle}deg)`
                          : `translate3d(${((visible.length - 1) / 2 - index) * 16}px, 8px, 0) rotate(0deg) scale(.97)`,
                        // 카드가 거의 다 열린 뒤 펼친다.
                        transitionDelay: `${260 + ([0, 45, 75][index] ?? 0)}ms`,
                      }}
                    >
                      <img
                        src={src}
                        onLoad={() => markReady(src)}
                        onError={() => markReady(src)}
                        alt={`미연결 게시물 ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {count > 3 && index === 2 ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 font-medium text-b3 text-white">
                          +{count - 3}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="mt-4 flex w-full gap-2">
            <Button
              variant="secondary"
              className="flex-1 bg-gray-20 text-gray-90 hover:bg-gray-30"
              onClick={onDisable}
              disabled={disabling}
            >
              다시 보지 않음
            </Button>
            <Button className="flex-1" onClick={onView}>
              게시물 보기
            </Button>
          </div>
          <button
            type="button"
            aria-label="미연결 게시물 안내 닫기"
            className="absolute top-3 right-3 rounded-full focus-visible:ring-2"
            onClick={onDismiss}
          >
            <Icon32Delete />
          </button>
        </section>
      </div>
    </div>
  );
}

export function PlaceConnectionReminder() {
  const authenticated = useIsAuthenticated();
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [open, openList, closeList] = useHistoryBackedFlag('unlinkedPosts');
  const reminder = useQuery({
    queryKey: PLACE_REMINDER_KEY,
    queryFn: async () => unwrapApiResponse(await get2({ auth: 'required' })),
    enabled: authenticated,
    refetchOnMount: 'always',
  });
  const posts = useInfiniteQuery({
    queryKey: ['unlinked-posts'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unwrapApiResponse(await list1({ page: pageParam, size: 20 }, { auth: 'required' })),
    getNextPageParam: (last) => (last?.hasNext ? last.page + 1 : undefined),
    enabled: authenticated && (Boolean(reminder.data?.showBanner) || open),
    refetchOnMount: 'always',
  });
  const restore = useMutation({
    mutationFn: () => update1({ enabled: true }, { auth: 'required' }),
    onSuccess: () => client.invalidateQueries({ queryKey: PLACE_REMINDER_KEY }),
    onError: () =>
      toast.showToast({ variant: 'simple', title: '설정을 복원하지 못했어요. 다시 시도해주세요.' }),
  });
  const disable = useMutation({
    mutationFn: () => update1({ enabled: false }, { auth: 'required' }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: PLACE_REMINDER_KEY });
      toast.showToast({
        variant: 'link',
        title: '설정에서 언제든지 변경할 수 있어요',
        actionLabel: '취소',
        onAction: () => restore.mutate(),
      });
    },
    onError: () =>
      toast.showToast({ variant: 'simple', title: '설정을 변경하지 못했어요. 다시 시도해주세요.' }),
  });
  const items = posts.data?.pages.flatMap((page) => page?.items ?? []) ?? [];
  const textOnly =
    env.localPrototype && sessionStorage.getItem('nook.prototype.reminder') === 'text';
  return (
    <>
      {!dismissed && reminder.data?.showBanner ? (
        <PlaceConnectionReminderCard
          count={reminder.data.unlinkedPostCount}
          thumbnails={
            textOnly
              ? []
              : items.slice(0, 3).flatMap((post) => {
                  const media = post.representativeMedia;
                  return media ? [media.thumbnailUrl ?? media.url] : [];
                })
          }
          onDismiss={() => setDismissed(true)}
          onDisable={() => disable.mutate()}
          disabling={disable.isPending}
          onView={openList}
        />
      ) : null}
      {open ? (
        <Dialog.Root
          open
          onOpenChange={(next) => {
            if (!next) closeList();
          }}
        >
          <Dialog.Portal>
            <Dialog.Content
              className="fixed inset-0 z-[70] overflow-y-auto bg-gray-0"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">장소 없는 게시물</Dialog.Title>
              <div
                style={{
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                }}
              >
                <Header
                  className="sticky top-0 z-10"
                  left={<BackButton onClick={closeList} />}
                  title="장소 없는 게시물"
                />
                <div className="grid grid-cols-2 gap-x-2 gap-y-6 px-4 pb-8">
                  {items.map((post) => (
                    <CollectionCard
                      key={post.postId}
                      archive={toArchivePost({ ...post, placeCount: 0 })}
                      onClick={() =>
                        navigate(`/post/${post.postId}`, { state: POST_FROM_LIST_STATE })
                      }
                    />
                  ))}
                </div>
                {posts.isPending ? (
                  <p className="p-4 text-b2 text-gray-70">게시물을 불러오는 중이에요.</p>
                ) : posts.isError ? (
                  <Button onClick={() => posts.refetch()}>다시 불러오기</Button>
                ) : items.length === 0 ? (
                  <p className="p-4 text-b2 text-gray-70">장소 없는 게시물이 없어요.</p>
                ) : null}
                {posts.hasNextPage ? (
                  <Button disabled={posts.isFetchingNextPage} onClick={() => posts.fetchNextPage()}>
                    더 보기
                  </Button>
                ) : null}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </>
  );
}
