import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { CollectionSummary } from '../types';

/**
 * Figma `List/2Line`.
 * 다른 사람이 공개한 그룹을 2열 그리드에 보여주는 세로 카드 —
 * 큰 커버 + 제목 + "@계정 · N Places".
 *
 * 시안 `List/Thumbnail_2Lines` 는 이 카드를 2열로 깐 그리드라 별도 컴포넌트가 아니다.
 * 시안 폭 167px 도 (343 - gap 8) / 2 라서, 카드는 `w-full` 이고 열 수는 부모가 정한다.
 *
 * 커버는 `group.thumbnails[0]` 을 쓴다 — 없으면 `Thumbnail` 의 기본 이미지가 나온다.
 *
 * 그룹 상세의 게시물 그리드도 같은 모양이라 `CollectionSummary` 로 넓혀 재사용한다
 * (공개 그룹 / 저장된 게시물 양쪽이 이 모양을 만족한다).
 */
export interface CollectionCardProps {
  group: CollectionSummary;
  onClick?: () => void;
  className?: string;
}

function CollectionCard({ group, onClick, className }: CollectionCardProps) {
  const Comp = onClick ? 'button' : 'div';
  const cover = group.thumbnails?.[0];
  const isProcessing = group.processingState === 'processing';
  const isFailed = group.processingState === 'failed';

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex w-full flex-col items-start gap-2 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* 시안 167x208. 화면 폭이 달라져도 같은 모양이 되게 고정 높이 대신 비율로 잡는다. */}
      <Thumbnail
        src={cover}
        alt=""
        loading={isProcessing}
        failed={isFailed}
        className="aspect-[167/208] h-auto w-full"
      />
      <div className="flex w-full flex-col">
        <p className="truncate text-b3 font-semibold text-gray-90">
          {isProcessing ? '처리 중…' : isFailed ? '처리 실패' : group.name}
        </p>
        {isProcessing || isFailed ? null : (
          <div className="flex items-center gap-1">
            {group.authorHandle ? (
              <>
                <span className="truncate font-mono text-e2 text-gray-60">
                  {group.authorHandle}
                </span>
                <span className="size-0.5 shrink-0 rounded-full bg-gray-60" aria-hidden="true" />
              </>
            ) : null}
            <span className="shrink-0 font-mono text-e2 text-gray-60">
              {group.placeCount} Places
            </span>
          </div>
        )}
      </div>
    </Comp>
  );
}

export { CollectionCard };
