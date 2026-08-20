import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import profile24 from '@/assets/images/24_Profile.svg';
import profile60 from '@/assets/images/60_Profile.svg';
import profile100 from '@/assets/images/100_Profile.svg';
import { Icon32Edit } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `Img/24_Profile`, `Img/60_Profile`, `Img/100_Profile`, `Profile/100_edit` 기준.
 * 네 컴포넌트가 같은 원형 아바타라 size + onEdit 조합으로 합쳤다.
 * `src` 가 없으면 시안의 기본 프로필 이미지를 그대로 쓴다.
 *
 * 애셋은 색이 박혀 있어(gray-20 원 + gray-40 인물) 토큰으로 다시 칠하지 않는다.
 * 24 는 60/100 을 줄인 게 아니라 별도 시안이다 — 원이 gray-10 fill + gray-20 stroke 라
 * 흰 카드 위에서도 테두리가 남는다.
 */
const avatarVariants = cva('relative inline-flex shrink-0 rounded-full', {
  variants: {
    size: {
      /** Img/100_Profile */
      lg: 'size-25',
      /** Img/60_Profile */
      sm: 'size-15',
      /** Img/24_Profile — 목록 행의 이름 앞에 붙는 크기 */
      xs: 'size-6',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

const PLACEHOLDER = {
  lg: profile100,
  sm: profile60,
  xs: profile24,
} as const;

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  /** 넘기면 우하단에 편집 배지가 뜬다 (시안 `Profile/100_edit`). */
  onEdit?: () => void;
}

function Avatar({ src, alt = '', onEdit, size = 'lg', className, ...props }: AvatarProps) {
  return (
    <div data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props}>
      <img
        src={src ?? PLACEHOLDER[size ?? 'lg']}
        alt={alt}
        className="size-full rounded-full object-cover"
      />
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label="프로필 이미지 변경"
          className={cn(
            'absolute right-0 bottom-0 rounded-full',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
          )}
        >
          {/* 32_edit 애셋이 흰 원 + 테두리 + 펜을 모두 포함한다. */}
          <Icon32Edit />
        </button>
      ) : null}
    </div>
  );
}

export { Avatar, avatarVariants };
