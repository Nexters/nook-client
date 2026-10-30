import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { useInfiniteScrollSentinel } from '@/shared/lib/useInfiniteScrollSentinel';
import { Avatar, BackButton, BOTTOM_INSET_VAR, Header } from '@/shared/ui';
import type { ArchiveSubscriber } from '../types';

/**
 * 시안 378:15895 `추가한 사람` — 아카이브 상세(내·공유받은)와 공유 링크가 같은 화면을 쓴다.
 * 목록은 읽기 전용이라 행을 눌러도 아무 데도 가지 않는다(프로필 상세가 아직 없다).
 */
export function ArchiveSubscriberList({
  archiveName,
  query,
}: {
  archiveName?: string;
  query: {
    data?: ArchiveSubscriber[];
    isError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };
}) {
  const sentinelRef = useInfiniteScrollSentinel(query);

  return (
    <PinnedHeaderLayout header={<Header left={<BackButton />} title={archiveName} />}>
      {/* 시안: 단일 탭 모양의 제목 줄(높이 54, 아래 gray-90 선). */}
      <h2 className="flex h-13.5 items-center justify-center border-gray-90 border-b text-b2 font-semibold text-gray-100">
        추가한 사람
      </h2>
      {query.isError ? (
        <p className="pt-10 text-center text-b2 text-gray-60">목록을 불러오지 못했어요</p>
      ) : (
        <ul
          className="flex flex-col gap-2 px-4 pt-6.5"
          // 아카이브 쪽은 하단 탭바가 fixed 로 떠 있어 그만큼 비켜준다. 탭바 밖(공유 링크)은
          // 변수가 없어 safe area 만 남는다.
          style={{
            paddingBottom: `calc(1rem + var(${BOTTOM_INSET_VAR}, env(safe-area-inset-bottom)))`,
          }}
        >
          {(query.data ?? []).map((subscriber, index) => (
            // 서버가 닉네임·이미지만 주고 id 는 주지 않는다 — 순서가 고정된 읽기 전용 목록이다.
            // biome-ignore lint/suspicious/noArrayIndexKey: 위 이유로 안정적인 키가 없다.
            <li key={index} className="flex items-center gap-4 py-2">
              <Avatar size="md" src={subscriber.profileImageUrl} />
              <span className="min-w-0 truncate font-mono text-e1 text-gray-100">
                {subscriber.nickname}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinelRef} aria-hidden="true" className="h-1" />
    </PinnedHeaderLayout>
  );
}
