import emptyIllustration from '@/assets/images/200_empty.svg';

/**
 * Figma `홈 - 그룹 > 그룹 없음`, `그룹 상세 > 빈 그룹` 의 빈 상태.
 * 일러스트는 같고 문구만 달라서 message 만 받는다.
 */
export interface GroupEmptyProps {
  message: string;
}

function GroupEmpty({ message }: GroupEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-5 pt-20">
      <img src={emptyIllustration} alt="" className="size-[200px]" />
      <p className="text-b2 font-medium text-gray-60">{message}</p>
    </div>
  );
}

export { GroupEmpty };
