import { cn } from '@/shared/lib/utils';

/** 로딩 상태에서 콘텐츠 자리를 채우는 뼈대 블록. 색은 시안의 `#f4f5f7`(gray-10). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded bg-gray-10', className)}
      {...props}
    />
  );
}

export { Skeleton };
