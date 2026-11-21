import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { MapPin } from '@/features/map/types';
import { Icon16ArrowUp, Icon24Close } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Badge, Thumbnail } from '@/shared/ui';

/** 도보 속도(m/분) — 약 4km/h. 지도 앱들이 도보 시간을 셀 때 쓰는 보수적인 값. */
const WALK_M_PER_MIN = 67;
const MAX_WALK_MIN = 10;
const MAX_ITEMS = 5;
/** 접힌 상태에서 뒤로 겹쳐 보이는 장 수(맨 앞 포함). */
const STACK_DEPTH = 3;

/** 카드 높이 — Thumbnail sm(Figma `Thumbnail/60_img_x`, 64px) + 위아래 8px. */
const CARD_H = 80;
const CARD_STEP = CARD_H + 8;

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;

function walkMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const r = 6371000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const meters = 2 * r * Math.asin(Math.sqrt(a));
  return Math.max(1, Math.round(meters / WALK_M_PER_MIN));
}

/**
 * VOC: "지금 위치에서 5~10분 거리에 저장해 둔 곳을 보여줬으면" — 지도 위 토스트 스택.
 *
 * 접힌 상태: 가장 가까운 곳 한 장이 앞에, 나머지는 뒤로 작게 겹쳐 '더 있다'를 알린다.
 * 누르면 겹친 카드들이 아래로 펼쳐져 목록이 되고, 장소를 누르면 그 장소를 고른다.
 * 카드 하나하나가 같은 요소라 접기 ↔ 펼치기가 끊기지 않고 스프링으로 이어진다.
 */
export function NearbyToastStack({
  pins,
  userCoords,
  onSelectPlace,
}: {
  pins: MapPin[];
  userCoords: { lat: number; lng: number };
  onSelectPlace: (placeId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const nearby = useMemo(
    () =>
      pins
        .map((pin) => ({ pin, minutes: walkMinutes(userCoords, pin) }))
        .filter((item) => item.minutes <= MAX_WALK_MIN)
        .sort((a, b) => a.minutes - b.minutes)
        .slice(0, MAX_ITEMS),
    [pins, userCoords],
  );

  const visible = !dismissed && nearby.length > 0;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <AnimatePresence>
        {visible ? (
          <motion.section
            key="nearby"
            aria-label="가까운 저장 장소"
            className="pointer-events-auto relative"
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ ...SPRING, delay: 0.5 }}
          >
            {/* 펼쳤을 때만 보이는 머리줄 — 몇 곳인지, 접기·닫기. */}
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="head"
                  className="mb-2 flex items-center justify-between rounded-xl bg-gray-0 py-2 pr-2 pl-4 shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={SPRING}
                >
                  <p className="text-b2 font-semibold text-gray-100">
                    걸어서 {MAX_WALK_MIN}분 안에 저장한 곳{' '}
                    <span className="text-nook-blue">{nearby.length}곳</span>
                  </p>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label="접기"
                      onClick={() => setExpanded(false)}
                      className="flex size-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
                    >
                      <Icon16ArrowUp />
                    </button>
                    <button
                      type="button"
                      aria-label="가까운 저장 장소 닫기"
                      onClick={() => setDismissed(true)}
                      className="flex size-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
                    >
                      <Icon24Close />
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <ul
              className="relative"
              style={{
                height: expanded
                  ? nearby.length * CARD_STEP - 8
                  : CARD_H + (Math.min(nearby.length, STACK_DEPTH) - 1) * 8,
              }}
            >
              {nearby.map(({ pin, minutes }, index) => {
                const behind = Math.min(index, STACK_DEPTH - 1);
                const hidden = !expanded && index >= STACK_DEPTH;
                return (
                  <motion.li
                    key={pin.id}
                    className="absolute inset-x-0 top-0"
                    style={{ zIndex: nearby.length - index, transformOrigin: 'top center' }}
                    initial={false}
                    animate={
                      expanded
                        ? { y: index * CARD_STEP, scale: 1, opacity: 1 }
                        : { y: behind * 8, scale: 1 - behind * 0.05, opacity: hidden ? 0 : 1 }
                    }
                    // 펼칠 땐 앞 카드부터, 접을 땐 뒤 카드부터 움직여 한 줄기로 읽히게 한다.
                    transition={{
                      ...SPRING,
                      delay: (expanded ? index : nearby.length - 1 - index) * 0.035,
                    }}
                  >
                    <button
                      type="button"
                      tabIndex={!expanded && index > 0 ? -1 : undefined}
                      aria-hidden={!expanded && index > 0 ? true : undefined}
                      onClick={() => (expanded ? onSelectPlace(pin.id) : setExpanded(true))}
                      className={cn(
                        'flex h-20 w-full items-center gap-3 rounded-xl bg-gray-0 p-2 pr-4 text-left shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                      )}
                    >
                      <Thumbnail size="sm" src={pin.thumbnail} alt="" className="shrink-0" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        {!expanded && index === 0 ? (
                          <span className="truncate text-b3 font-medium text-gray-60">
                            걸어서 {MAX_WALK_MIN}분 안에 저장한 곳 {nearby.length}곳
                          </span>
                        ) : null}
                        <span className="truncate text-b2 font-semibold text-gray-100">
                          {pin.name}
                        </span>
                      </span>
                      <Badge variant="label">도보 {minutes}분</Badge>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
