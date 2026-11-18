/**
 * 게시물 여러 개를 보여주는 화면(아카이브 상세 그리드, 장소 드로어의 게시물 줄)에서 게시물 상세로
 * 들어갈 때 실어 보내는 history state. 게시물을 지운 뒤 그 화면으로 돌아가 머무를지(있으면),
 * 홈 지도로 갈지(없으면 — 딥링크·공유 확장·알림처럼 단일 게시물로 곧장 들어온 경우)를 가른다(QA).
 */
export const POST_FROM_LIST_STATE = { postFromList: true } as const;

export function isPostFromList(state: unknown): boolean {
  return (state as { postFromList?: unknown } | null)?.postFromList === true;
}

/**
 * 게시물을 열 수 없어 아카이브 목록으로 돌려보낼 때의 안내 — 상세 404, 저장 게시물 ID 가 없는
 * 구형·잘못된 푸시 공용. 사용자 잘못이 아니라 "못 찾았다" 는 사실만 알린다.
 * TODO(NOOK-410): 시안에 없는 임시 문구 — 기획 확인 후 교체.
 */
export const POST_NOT_FOUND_TOAST = {
  variant: 'simple',
  title: '게시물을 찾을 수 없어요',
} as const;
