import { cn } from '@/shared/lib/utils';
import type { Post } from '../types';

/**
 * Figma `저장된 게시물/Saved post context`.
 * 장소를 연결하는 화면 상단에서 "지금 어떤 게시물을 다루는 중인지" 알려주는 안내 띠.
 * 표시 전용이라 클릭 동작이 없다.
 */
export interface SavedPostContextProps {
  post: Post;
  /** 썸네일 아래 보조 문구. 화면마다 달라져 사용처가 정한다. */
  description?: string;
  className?: string;
}

function SavedPostContext({
  post,
  description = '이 게시물에 연결할 장소를 입력해요',
  className,
}: SavedPostContextProps) {
  return (
    <div
      className={cn(
        'flex h-15 w-full items-center gap-2.5 overflow-hidden rounded-sm',
        'border border-gray-20 bg-gray-10 p-2',
        className,
      )}
    >
      {post.thumbnail ? (
        <img
          src={post.thumbnail}
          alt=""
          className="size-[50px] shrink-0 rounded-[2px] border border-gray-10 object-cover"
        />
      ) : (
        <div className="size-[50px] shrink-0 rounded-[2px] border border-gray-10 bg-gray-20" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-b2 font-medium text-gray-100">{post.authorHandle}</p>
        <p className="truncate text-b3 font-normal text-gray-60">{description}</p>
      </div>
    </div>
  );
}

export { SavedPostContext };
