import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { MediaBadge } from '@/shared/ui';

type Mode = 'feed' | 'grid' | 'list';

/** 피드 → 그리드 → 리스트 순서로 돈다. 토글 칸 순서도 같다. */
const ORDER: Mode[] = ['feed', 'grid', 'list'];
const HOLD_MS: Record<Mode, number> = { feed: 1800, grid: 1800, list: 1800 };

/** 미리보기 안쪽 폭(343 - 좌우 16). 카드 위치·크기를 보기마다 계산해 같은 카드가 옮겨 가게 한다. */
const WIDTH = 311;
const GAP_X = 8;
const GAP_Y = 20;
const TEXT_GAP = 8;
const TEXT_H = 36;
const FEED_IMG_H = Math.round((WIDTH * 212) / 343);
const GRID_W = (WIDTH - GAP_X) / 2;
const GRID_IMG_H = 189;
const LIST_THUMB = 64;
const LIST_GAP_Y = 12;
const LIST_TEXT_X = LIST_THUMB + 12;

const CARDS = [
  { src: '/whats-new/view-1.jpg', name: '대흥 LP 바', places: 3 },
  { src: '/whats-new/pangyo-cafe.jpg', name: '판교 카페', places: 1 },
  { src: '/whats-new/view-3.jpg', name: '연남 베이커리', places: 2 },
  { src: '/whats-new/view-1.jpg', name: '서촌 서점', places: 4 },
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
      ty: 0,
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
 * 같은 카드들이 자리·크기·글자 위치를 옮기며 바뀐다(레이아웃 모핑). 동작 줄이기에선 시안의 그리드 보기로 멈춰 있다.
 */
export function ViewModePreview() {
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [mode, setMode] = useState<Mode>('grid');

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
                <img
                  src={card.src}
                  alt=""
                  className="size-full object-cover"
                  style={{
                    objectPosition: card.src.includes('pangyo-cafe') ? '50% 25%' : 'center',
                  }}
                />
                <span
                  className={cn('transition-opacity duration-300', mode === 'list' && 'opacity-0')}
                >
                  <MediaBadge type="IMAGE" />
                </span>
              </div>
              <div
                className="view-preview-move view-preview-size absolute top-0 left-0 flex min-w-0 flex-col items-start justify-center text-left"
                style={{
                  width: box.tw,
                  height: mode === 'list' ? LIST_THUMB : TEXT_H,
                  transform: `translate3d(${box.tx}px, ${box.ty}px, 0)`,
                  transitionDelay: delay,
                }}
              >
                <p className="w-full truncate text-b3 font-semibold text-gray-90">{card.name}</p>
                <p className="font-mono text-e2 text-gray-60">{card.places} Places</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
