import emptyIllustration from '@/assets/images/200_empty.svg';

/**
 * Figma `홈 - 아카이브 > 아카이브 없음`, `아카이브 상세 > 빈 아카이브` 의 빈 상태.
 * 일러스트는 같고 문구만 달라서 message 만 받는다.
 */
export interface ArchiveEmptyProps {
  message: string;
}

function ArchiveEmpty({ message }: ArchiveEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-5 pt-20">
      <img src={emptyIllustration} alt="" className="size-[200px]" />
      <p className="text-b2 font-medium text-gray-60">{message}</p>
    </div>
  );
}

export { ArchiveEmpty };
