import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Icon16Move,
  Icon16Share,
  Icon24Back,
  Icon24Link,
  Icon24More,
} from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * 0 게시물 상세 → 1 더보기 탭 → 2 메뉴 열림 → 3 '게시물 공유' 탭 → 4 공유 시트 → 처음으로.
 * 실제 화면 순서 그대로 손가락이 짚어 가며 보여준다.
 */
const STEP_MS = [1000, 380, 900, 380, 2300] as const;

const MENU = [
  { icon: <Icon16Share />, label: '게시물 공유' },
  { icon: <Icon16Move />, label: '게시물 이동' },
  {
    icon: <Trash2 size={16} strokeWidth={1.5} className="text-[#FA5947]" aria-hidden="true" />,
    label: '게시물 삭제',
  },
];

/** 탭 표시 — 짚은 자리에 원이 한 번 퍼진다. */
function Tap({ show, className }: { show: boolean; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'share-preview-tap pointer-events-none absolute size-9 rounded-full bg-gray-100/15',
        show && 'is-on',
        className,
      )}
    />
  );
}

/** "게시물 공유" 안내용 미리보기 — 더보기 → 게시물 공유 → 공유 시트까지 이어서 보여준다. */
export function PostSharePreview() {
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  // 동작 줄이기: 공유 시트가 열린 마지막 장면에 멈춘다.
  const [step, setStep] = useState(reduced ? 4 : 0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(
      () => setStep((s) => (s + 1) % STEP_MS.length),
      STEP_MS[step] ?? 1000,
    );
    return () => window.clearTimeout(timer);
  }, [step, reduced]);

  const menuOpen = step === 2 || step === 3;
  const sheetOpen = step === 4;

  return (
    <div className="relative -mx-4 -mt-5 h-[300px] overflow-hidden">
      {/* 게시물 상세 헤더 — 뒤로가기 / 더보기 */}
      <div className="flex h-12 items-center justify-between px-4">
        <Icon24Back />
        <span className="relative">
          <Icon24More />
          <Tap show={step === 1} className="-top-1.5 -left-1.5" />
        </span>
      </div>
      <img
        src="/whats-new/pangyo-cafe.jpg"
        alt=""
        className="mx-4 aspect-[343/212] w-[311px] rounded object-cover object-[50%_25%]"
      />
      <div className="flex flex-col gap-1 px-4 pt-3">
        <p className="text-b1 font-semibold text-gray-100">판교 카페</p>
        <p className="text-b2 font-medium text-gray-60">경기 성남시 분당구 · 카페</p>
      </div>

      {/* MoreMenu 패널과 같은 모양 — 더보기 아래 오른쪽에서 펼쳐진다. */}
      <ul
        className={cn(
          'share-preview-menu absolute top-11 right-4 rounded-xl bg-gray-0 py-2.5 shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]',
          menuOpen && 'is-on',
        )}
      >
        {MENU.map((item, index) => (
          <li
            key={item.label}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap py-[9px] pr-5 pl-4 text-b2 font-semibold text-gray-80 transition-colors duration-200',
              index === 0 && step === 3 && 'bg-gray-10 text-gray-100',
            )}
          >
            {item.icon}
            {item.label}
            {index === 0 ? <Tap show={step === 3} className="top-0 left-6" /> : null}
          </li>
        ))}
      </ul>

      {/* 공유 시트 — 딤 위로 아래에서 올라온다(ShareSheet 의 링크 복사 / 더보기). */}
      <div
        aria-hidden="true"
        className={cn('share-preview-dim absolute inset-0 bg-gray-100/50', sheetOpen && 'is-on')}
      />
      <div
        className={cn(
          'share-preview-sheet absolute inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-xl bg-gray-0 p-4 pb-6',
          sheetOpen && 'is-on',
        )}
      >
        <div className="flex items-center gap-3 rounded-xl border border-gray-20 p-2">
          <img
            src="/whats-new/pangyo-cafe.jpg"
            alt=""
            className="size-12 rounded-sm object-cover object-[50%_25%]"
          />
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-b3 font-semibold text-gray-100">판교 카페</p>
            <p className="truncate font-mono text-e2 text-gray-60">nook.app/shared-post/…</p>
          </div>
        </div>
        <div className="flex justify-center gap-6">
          {[
            { icon: <Icon24Link />, label: '링크 복사' },
            { icon: <Icon24More />, label: '더보기' },
          ].map((action) => (
            <span key={action.label} className="flex flex-col items-center gap-1.5">
              <span className="flex size-12 items-center justify-center rounded-full bg-gray-10">
                {action.icon}
              </span>
              <span className="text-e1 text-gray-80">{action.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
