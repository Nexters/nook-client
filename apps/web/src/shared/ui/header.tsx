import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Tabloid - 4 > Header > Header/54` 기준 상단 바.
 *
 * 시안의 5개 variant 를 그대로 enum 으로 옮기지 않고 배경(variant) + 슬롯 조합으로
 * 표현한다. 로고·뒤로가기·공유 아이콘은 전부 애셋이라 이 컴포넌트가 소유하면
 * shared/ui 가 브랜드 자산에 묶이기 때문이다.
 *
 *   Logo_BG_White        → <Header left={<Logo />} />
 *   Logo_BG_Gray         → <Header variant="gray" left={<Logo />} />
 *   Logo_Transparency    → <Header variant="transparent" left={<Logo />} />
 *   Back                 → <Header left={<BackButton />} title="새 아카이브 생성" right={<ShareButton />} />
 *   bottom               → <Header size="bottom" left={<BackButton />} title="새 아카이브 생성" />
 *   Close(우상단만)       → <Header title="새 아카이브 생성" right={닫기 버튼} />
 *
 * 제목이 있는 헤더에서 비어 있는 좌·우 슬롯은 24px 빈 칸으로 채워 제목이 한쪽으로
 * 쏠리지 않게 한다(시안의 `bottom` variant 가 쓰는 방식 그대로) — 한쪽에만 아이콘이
 * 있는 시안도 제목은 가운데다. 슬롯이 둘 다 빈 로고 단독 헤더에는 제목이 없다.
 */
const headerVariants = cva('flex w-full items-center justify-between gap-2 px-4', {
  variants: {
    variant: {
      white: 'bg-gray-0',
      gray: 'bg-gray-10',
      transparent: 'bg-transparent',
    },
    size: {
      /** Header/54 — 고정 높이 54px, 제목 H2(18) */
      default: 'h-[54px]',
      /** Property 1=bottom — 높이 없이 하단 여백만, 제목 B1(16) */
      bottom: 'pb-5',
    },
  },
  defaultVariants: {
    variant: 'white',
    size: 'default',
  },
});

// `title` 은 네이티브 툴팁 속성과 이름이 겹쳐서 걷어내고 ReactNode 로 다시 정의한다.
export interface HeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>,
    VariantProps<typeof headerVariants> {
  /** 좌측 슬롯 — 로고 또는 뒤로가기 버튼 */
  left?: React.ReactNode;
  /** 가운데 제목. 없으면 렌더하지 않는다. */
  title?: React.ReactNode;
  /** 우측 슬롯 — 공유 등 액션. 생략하면 24px 빈 칸으로 균형만 맞춘다. */
  right?: React.ReactNode;
}

function Header({ variant, size, left, title, right, className, ...props }: HeaderProps) {
  // 제목의 좌우 균형을 맞추는 빈 칸(아이콘 하나 폭).
  const balance = <span aria-hidden="true" className="size-6 shrink-0" />;

  return (
    <header
      data-slot="header"
      className={cn(headerVariants({ variant, size }), className)}
      {...props}
    >
      {/* 제목이 있을 때만 균형을 맞춘다 — 로고 단독 헤더는 좌측 정렬이 맞다. */}
      {left ?? (title ? balance : null)}
      {title ? (
        <p
          className={cn(
            'min-w-0 truncate font-semibold text-gray-100',
            size === 'bottom' ? 'text-b1' : 'text-h2',
          )}
        >
          {title}
        </p>
      ) : null}
      {right ?? (title ? balance : null)}
    </header>
  );
}

export { Header, headerVariants };
