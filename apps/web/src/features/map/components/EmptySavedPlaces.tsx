import emptyIllustration from '@/assets/images/200_empty.svg';

/** 저장한 공간이 하나도 없을 때의 빈 상태 — 탐색 목록과 검색 결과가 같은 화면을 쓴다(Figma 동일 시안). */
export function EmptySavedPlaces() {
  return (
    <div className="flex flex-1 flex-col items-center mt-[60px] gap-5">
      <img src={emptyIllustration} alt="" className="size-[200px]" />
      <p className="text-b1 font-medium text-gray-70">아직 저장한 공간이 없어요</p>
    </div>
  );
}
