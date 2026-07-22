import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge 는 Tailwind 기본 스케일만 알고 있어서, 우리 디자인 시스템의
 * 타이포 토큰(`text-b1`, `text-h1` …)을 "글자 크기"가 아니라 "글자 색"으로 오인한다.
 *
 * 그 결과 `cn('text-gray-0', 'text-b1')` 처럼 색과 크기를 함께 주면 둘을 같은 그룹으로 보고
 * 뒤에 온 `text-b1` 이 `text-gray-0` 을 덮어써 색이 통째로 사라진다
 * (→ 버튼 라벨이 흰색이 아니라 body 의 gray-100 을 상속해 검정으로 렌더).
 *
 * 아래에서 `--text-*` 토큰 이름을 font-size 그룹으로 명시해 이 오분류를 막는다.
 * global.css 의 `@theme` 에 타이포 토큰을 추가하면 이 목록도 함께 갱신해야 한다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'b1', 'b2', 'b3', 's1', 'e1', 'e2'] }],
    },
  },
});

/**
 * 클래스명 병합 유틸.
 * Tailwind 클래스 충돌(e.g. "bg-gray-10 bg-yellow")을 twMerge 로 해소하고,
 * 조건부 클래스는 clsx 문법으로 작성한다.
 *
 * 컴포넌트에서 색상/타이포/여백 값을 매번 하드코딩하지 않도록,
 * 항상 src/styles/global.css 의 @theme 토큰(--color-*, --text-*)에서 파생된
 * Tailwind 유틸리티 클래스(bg-gray-100, text-b1 등)만 조합해서 넘긴다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
