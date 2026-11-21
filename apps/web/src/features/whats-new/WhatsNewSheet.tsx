import './whats-new.css';
import { type ReactNode, useState } from 'react';
import { PlaceConnectionReminderCard } from '@/features/archive/components/PlaceConnectionReminder';
import {
  Icon16Archive,
  Icon20Filter,
  Icon24MappinOn,
  Icon24Share,
  Icon32Delete,
} from '@/shared/icons/NookIcons';
import {
  Button,
  CarouselIndicator,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  SwipePager,
} from '@/shared/ui';
import { PostSharePreview } from './PostSharePreview';
import { ViewModePreview } from './ViewModePreview';

export interface WhatsNewItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  /**
   * 미리보기 영역 343×220 (rounded-xl). 업데이트마다 Figma 에서 이 프레임 크기로 잡아
   * @3x(1029×660) PNG/WebP 로 내보내 `image` 로 넣는다. 이미지가 없을 때만 `preview`
   * (실제 컴포넌트를 줄여 얹은 임시 화면)를 쓴다.
   */
  image?: string;
  preview?: ReactNode;
}

/**
 * 업데이트 안내 바텀시트 — "새로워진 점".
 * 버전 → 큰 제목 → 미리보기(실제 컴포넌트) → 아이콘·설명 한 줄 → 하단 버튼.
 * 항목이 여럿이면 좌우로 넘기고, 마지막 장에서 버튼이 '확인'이 된다.
 */
export function WhatsNewSheet({
  open,
  onOpenChange,
  version,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: string;
  items: WhatsNewItem[];
}) {
  const [index, setIndex] = useState(0);
  const last = index >= items.length - 1;
  const close = () => onOpenChange(false);

  // 우리 제목형 바텀시트 규격(ArchiveFilterSheet 와 같다): 핸들 없음, rounded-t-xl,
  // 헤더 px-4 py-5 에 H2 제목 + 닫기(Icon32Delete), 탭바 위 z-[70],
  // 하단 버튼 Button_52(lg) 풀폭 p-4 + safe-area.
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setIndex(0);
      }}
    >
      <DrawerContent
        aria-describedby={undefined}
        showHandle={false}
        overlayClassName="z-[70]"
        className="z-[70] max-h-[calc(100dvh-2.5rem)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-start justify-between px-4 py-5">
          <div className="flex flex-col">
            <p className="text-b3 font-medium text-gray-60">버전 {version}</p>
            <DrawerTitle className="text-h2 font-semibold text-gray-100">새로워진 점</DrawerTitle>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <Icon32Delete />
          </button>
        </div>

        <SwipePager index={index} onIndexChange={setIndex} className="min-h-0">
          {items.map((item) => (
            <section key={item.id} aria-label={item.title} className="flex flex-col gap-5 px-4">
              <div
                aria-hidden="true"
                className="whats-new-enter whats-new-enter-2 relative h-[220px] overflow-hidden rounded-xl bg-gray-10"
              >
                {item.image ? (
                  <img src={item.image} alt="" className="size-full object-cover" />
                ) : (
                  // 임시 화면 — 실제 컴포넌트를 343 폭 그대로 그리고 줄여 얹는다.
                  <div className="absolute top-5 left-1/2 w-[343px] origin-top -translate-x-1/2 scale-[0.66] rounded-t-xl bg-gray-0 px-4 pt-5 pb-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]">
                    {item.preview}
                  </div>
                )}
              </div>
              <div className="whats-new-enter whats-new-enter-3 flex items-start gap-3">
                {/* 공유 시트 액션과 같은 원형 48 아이콘 칩. */}
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-10 [&_svg]:size-6">
                  {item.icon}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                  <p className="text-b1 font-semibold text-gray-100">{item.title}</p>
                  <DrawerDescription className="text-b2 font-medium text-gray-80">
                    {item.description}
                  </DrawerDescription>
                </div>
              </div>
            </section>
          ))}
        </SwipePager>

        {items.length > 1 ? (
          <CarouselIndicator
            count={items.length}
            activeIndex={index}
            onIndexChange={setIndex}
            className="mt-6"
          />
        ) : null}
        <div className="mt-auto p-4">
          <Button size="lg" fullWidth onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? '확인' : '다음'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const SAMPLE_PHOTOS = [1, 2, 3].map((n) => `/prototype/reminder/post-${n}.png`);

/** 프로토타입용 안내 항목 — 최근에 붙인 기능을 실제 컴포넌트로 보여준다. */
export const SAMPLE_WHATS_NEW: WhatsNewItem[] = [
  {
    id: 'archive-view',
    icon: <Icon20Filter />,
    title: '보기 형식이 다양해졌어요',
    description:
      '게시물을 피드·그리드·리스트 중 편한 모양으로 볼 수 있어요. 아카이브 필터에서 바꿔 보세요.',
    preview: <ViewModePreview />,
  },
  {
    id: 'post-share',
    icon: <Icon24Share />,
    title: '게시물 공유',
    description: '게시물 더보기에서 바로 링크를 보낼 수 있어요. 받은 사람도 장소까지 함께 봐요.',
    preview: <PostSharePreview />,
  },
  {
    id: 'unlinked-places',
    icon: <Icon24MappinOn />,
    title: '장소 없는 게시물 알림',
    description: '장소가 연결되지 않은 게시물을 아카이브 맨 위에서 모아 알려드려요.',
    preview: (
      <div className="pointer-events-none -mx-4 -mt-5 bg-gray-10 px-3 pt-3">
        <PlaceConnectionReminderCard
          count={12}
          revealDelay={250}
          thumbnails={SAMPLE_PHOTOS}
          onDismiss={() => {}}
          onDisable={() => {}}
          onView={() => {}}
        />
        <div className="flex items-center gap-2 rounded bg-gray-0 p-4 text-b2 text-gray-90">
          <Icon16Archive />
          커피 한 잔의 여유
        </div>
      </div>
    ),
  },
];
