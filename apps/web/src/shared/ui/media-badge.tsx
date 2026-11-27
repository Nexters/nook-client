import { Icon20Images, Icon20PlayMini } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * Figma `8월 22일 작업 > List`(210:27127)의 `property1: default | video`.
 *
 * 미디어 위에 얹는 종류 표시. 카드·목록·그리드는 재생하지 않는 자리라 영상도 정지 화면
 * (포스터이거나 첫 프레임)으로 보인다 — 이게 없으면 사진과 구별이 안 된다.
 *
 * 부모가 `relative` 여야 한다. 자리는 시안대로 우상단 8px 고정이고, 사용처는 필요하면
 * `className` 으로 덮는다.
 *
 * `sm`: 64px 리스트 썸네일용 — 20px 아이콘이 썸네일 대비 커 보여 12px·우상단 4px(NOOK-454).
 */
export interface MediaBadgeProps {
  type: 'IMAGE' | 'VIDEO';
  size?: 'md' | 'sm';
  className?: string;
}

function MediaBadge({ type, size = 'md', className }: MediaBadgeProps) {
  const Icon = type === 'VIDEO' ? Icon20PlayMini : Icon20Images;

  return (
    <Icon
      data-slot="media-badge"
      data-type={type}
      size={size === 'sm' ? 12 : 20}
      className={cn('absolute', size === 'sm' ? 'top-1 right-1' : 'top-2 right-2', className)}
    />
  );
}

export { MediaBadge };
