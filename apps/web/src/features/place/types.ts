/**
 * 장소 — 사용자가 아카이브에 담는 대상.
 * 표시에 필요한 최소 형태만 둔다. 거리는 계산이 아니라 표시용 문자열로 받는다
 * (현재 위치 기준 계산은 호출부/서버 책임).
 */
export interface Place {
  id: string;
  name: string;
  /** 업종 (예: "카페") */
  category: string;
  /** 표시용 거리 문자열 (예: "16.2km"). 없으면 구분점과 함께 생략된다. */
  distance?: string;
  /** 지역 (예: "서울"). 세로형 카드에서 거리 대신 쓴다. */
  region?: string;
  address?: string;
  /** 가까운 지형지물 (예: "서울대입구역 2번 출구") */
  landmark?: string;
  /** AI 가 뽑은 요약 키워드 (예: ["조용한", "혼밥"]) */
  keywords?: string[];
  /** 대표 이미지. 없으면 빈 썸네일(시안 `Image_x`)로 렌더된다. */
  thumbnail?: string;
}
