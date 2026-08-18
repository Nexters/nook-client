import type { Archive } from './types';

/**
 * 게스트에게 보여줄 기본 아카이브.
 *
 * 서버 데이터가 아니라 "로그인하면 여기에 모인다" 를 설명하는 자리다. 목록에 한 칸으로
 * 서고, 눌러 들어간 상세는 빈 상태로 열린다 — 상세 안의 편집·삭제 같은 동작만 로그인
 * 월이 막는다. 목록에서 통째로 막지 않는 이유는, 게스트도 앱의 구조를 실제로 둘러볼 수
 * 있어야 하기 때문이다.
 */
export const GUEST_ARCHIVE: Archive = {
  id: 0,
  name: '내 아카이브',
  color: 'green',
  placeCount: 0,
  accessType: 'OWNED',
};
