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
  /**
   * 썸네일 파싱 처리 상태 — 저장 직후엔 BE 가 썸네일을 비동기로 채운다.
   * `thumbnail` 이 비어 있는 동안 처리 중(`processing`)/실패(`failed`) 표시를 카드에 얹는 데 쓴다.
   * 이미 `thumbnail` 이 있으면 상태와 무관하게 항상 undefined 다(각 feature 매퍼의 방어 로직).
   */
  thumbnailState?: 'processing' | 'failed';
}
