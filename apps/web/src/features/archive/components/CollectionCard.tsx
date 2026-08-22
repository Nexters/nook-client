import {
  Icon14Processing,
  Icon16Sad,
  Icon24CheckOff,
  Icon24CheckOn,
} from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Thumbnail } from '@/shared/ui';
import type { CollectionSummary } from '../types';

/**
 * Figma `List/2Line`.
 * 다른 사람이 공개한 아카이브를 2열 그리드에 보여주는 세로 카드 —
 * 큰 커버 + 제목 + "@계정 · N Places".
 *
 * 시안 `List/Thumbnail_2Lines` 는 이 카드를 2열로 깐 그리드라 별도 컴포넌트가 아니다.
 * 시안 폭 167px 도 (343 - gap 8) / 2 라서, 카드는 `w-full` 이고 열 수는 부모가 정한다.
 *
 * 커버는 `archive.thumbnails[0]` 을 쓴다 — 없으면 `Thumbnail` 의 기본 이미지가 나온다.
 *
 * 아카이브 상세의 게시물 그리드도 같은 모양이라 `CollectionSummary` 로 넓혀 재사용한다
 * (공개 아카이브 / 저장된 게시물 양쪽이 이 모양을 만족한다).
 */
export interface CollectionCardProps {
  archive: CollectionSummary;
  onClick?: () => void;
  /**
   * 선택 삭제 모드(Figma `게시글 편집`) — 정의하면 썸네일 우상단에 체크가 뜨고
   * 선택된 카드는 흰색 딤으로 표시된다. 토글 동작 자체는 onClick 책임이다.
   */
  selected?: boolean;
  className?: string;
}

function CollectionCard({ archive, onClick, selected, className }: CollectionCardProps) {
  const Comp = onClick ? 'button' : 'div';
  const cover = archive.thumbnails?.[0];
  const isProcessing = archive.processingState === 'processing';
  const isFailed = archive.processingState === 'failed';

  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      {...(selected !== undefined ? { 'aria-pressed': selected } : {})}
      className={cn(
        'flex w-full flex-col items-start gap-2 text-left',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* 시안 167x208. 화면 폭이 달라져도 같은 모양이 되게 고정 높이 대신 비율로 잡는다. */}
      <span className="relative w-full">
        <Thumbnail
          src={cover}
          alt=""
          loading={isProcessing}
          failed={isFailed}
          className="aspect-[167/208] h-auto w-full"
        />
        {selected !== undefined ? (
          <>
            {/* 선택된 카드는 시안대로 흰색 40% 딤으로 가라앉힌다. */}
            {selected ? (
              <span aria-hidden="true" className="absolute inset-0 rounded-sm bg-gray-0/40" />
            ) : null}
            <span aria-hidden="true" className="absolute top-2 right-2">
              {selected ? <Icon24CheckOn /> : <Icon24CheckOff />}
            </span>
          </>
        ) : null}
      </span>
      <div className="flex w-full flex-col">
        {isProcessing || isFailed ? (
          <div className="flex items-center gap-1">
            {/* 처리 중 표시는 정지 아이콘이 아니라 실제로 도는 스피너여야 한다(QA) —
                아이콘 자체가 회색 링 + 진한 호라서 회전만 얹으면 스피너가 된다. */}
            {isProcessing ? (
              <Icon14Processing className="shrink-0 animate-spin" />
            ) : (
              <Icon16Sad className="shrink-0" />
            )}
            <p className="truncate text-b3 font-semibold text-gray-60">
              {isProcessing ? '게시글 불러오는 중...' : '불러오지 못했어요.'}
            </p>
          </div>
        ) : (
          <>
            <p className="truncate text-b3 font-semibold text-gray-90">{archive.name}</p>
            <div className="flex items-center gap-1">
              {archive.authorHandle ? (
                <>
                  <span className="truncate font-mono text-e2 text-gray-60">
                    {archive.authorHandle}
                  </span>
                  <span className="size-0.5 shrink-0 rounded-full bg-gray-60" aria-hidden="true" />
                </>
              ) : null}
              <span className="shrink-0 font-mono text-e2 text-gray-60">
                {archive.placeCount} Places
              </span>
            </div>
          </>
        )}
      </div>
    </Comp>
  );
}

export { CollectionCard };
