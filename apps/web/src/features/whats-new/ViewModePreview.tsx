import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { MediaBadge } from '@/shared/ui';

type Mode = 'feed' | 'grid' | 'list';

/** 피드 → 그리드 → 리스트 순서로 돈다. 토글 칸 순서도 같다. */
const ORDER: Mode[] = ['feed', 'grid', 'list'];
const LABEL: Record<Mode, string> = { feed: '피드', grid: '그리드', list: '리스트' };
const HOLD_MS: Record<Mode, number> = { feed: 1800, grid: 1800, list: 1800 };

/** 미리보기 안쪽 폭(343 - 좌우 16). 카드 위치·크기를 보기마다 계산해 같은 카드가 옮겨 가게 한다. */
const WIDTH = 311;
const GAP_X = 8;
const GAP_Y = 20;
const TEXT_GAP = 8;
const TEXT_H = 36;
const FEED_IMG_H = Math.round((WIDTH * 212) / 343);
const GRID_W = (WIDTH - GAP_X) / 2;
const GRID_IMG_H = Math.round((GRID_W * 134) / 167);
const LIST_THUMB = 64;
const LIST_GAP_Y = 12;
const LIST_TEXT_X = LIST_THUMB + 12;

const CARDS = [
  { src: '/prototype/reminder/post-1.png', name: '성수 브런치 카페', places: 3 },
  { src: '/prototype/reminder/post-2.png', name: '을지로 와인바', places: 1 },
  { src: '/prototype/reminder/post-3.png', name: '연남 베이커리', places: 2 },
  { src: '/prototype/reminder/post-1.png', name: '서촌 서점', places: 4 },
];

/** 카드 자리(x,y), 사진 크기(w,h), 글자 자리(tx,ty,tw). */
function layout(mode: Mode, index: number) {
  if (mode === 'feed') {
    const y = index * (FEED_IMG_H + TEXT_GAP + TEXT_H + GAP_Y);
    return { x: 0, y, w: WIDTH, h: FEED_IMG_H, tx: 0, ty: FEED_IMG_H + TEXT_GAP, tw: WIDTH };
  }
  if (mode === 'list') {
    const y = index * (LIST_THUMB + LIST_GAP_Y);
    return {
      x: 0,
      y,
      w: LIST_THUMB,
      h: LIST_THUMB,
      tx: LIST_TEXT_X,
      ty: (LIST_THUMB - TEXT_H) / 2,
      tw: WIDTH - LIST_TEXT_X,
    };
  }
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: col * (GRID_W + GAP_X),
    y: row * (GRID_IMG_H + TEXT_GAP + TEXT_H + GAP_Y),
    w: GRID_W,
    h: GRID_IMG_H,
    tx: 0,
    ty: GRID_IMG_H + TEXT_GAP,
    tw: GRID_W,
  };
}

/**
 * "보기 형식이 다양해졌어요" 안내용 미리보기 — 피드 → 그리드 → 리스트로
 * 같은 카드들이 자리·크기·글자 위치를 옮기며 바뀐다(레이아웃 모핑). 위 보기 토글도 함께
 * 넘어가 지금 어떤 보기인지 짚는다. 동작 줄이기에선 피드로 멈춰 있다.
 */
export function ViewModePreview() {
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [mode, setMode] = useState<Mode>('feed');

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(
      () => setMode((m) => ORDER[(ORDER.indexOf(m) + 1) % ORDER.length] ?? 'grid'),
      HOLD_MS[mode],
    );
    return () => window.clearTimeout(timer);
  }, [mode, reduced]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-b2 font-semibold text-gray-100">게시물 {CARDS.length}</p>
        {/* 보기 토글 — 고른 칸 뒤로 바탕이 미끄러져 간다. */}
        <div className="relative flex rounded-full bg-gray-10 p-0.5 text-b3 font-semibold">
          <span
            aria-hidden="true"
            className="view-preview-move absolute inset-y-0.5 left-0.5 w-12 rounded-full bg-gray-0 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            style={{ transform: `translateX(${ORDER.indexOf(mode) * 48}px)` }}
          />
          {ORDER.map((m) => (
            <span
              key={m}
              className={cn(
                'relative w-12 py-1 text-center transition-colors duration-300',
                mode === m ? 'text-gray-100' : 'text-gray-50',
              )}
            >
              {LABEL[m]}
            </span>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: 2 * (FEED_IMG_H + TEXT_GAP + TEXT_H + GAP_Y) }}>
        {CARDS.map((card, index) => {
          const box = layout(mode, index);
          // 앞 카드부터 차례로 옮겨 가 하나의 흐름으로 읽힌다.
          const delay = `${index * 45}ms`;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 고정 미리보기
              key={index}
              className="view-preview-move absolute top-0 left-0"
              style={{
                transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
                transitionDelay: delay,
              }}
            >
              <div
                className="view-preview-size relative overflow-hidden rounded-sm"
                style={{ width: box.w, height: box.h, transitionDelay: delay }}
              >
                <img src={card.src} alt="" className="size-full object-cover" />
                <span
                  className={cn('transition-opacity duration-300', mode === 'list' && 'opacity-0')}
                >
                  <MediaBadge type="IMAGE" />
                </span>
              </div>
              <div
                className="view-preview-move view-preview-size absolute top-0 left-0 flex min-w-0 flex-col"
                style={{
                  width: box.tw,
                  transform: `translate3d(${box.tx}px, ${box.ty}px, 0)`,
                  transitionDelay: delay,
                }}
              >
                <p className="truncate text-b3 font-semibold text-gray-90">{card.name}</p>
                <p className="font-mono text-e2 text-gray-60">{card.places} Places</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
