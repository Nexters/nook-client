import { useCallback } from 'react';
import { useToast } from '@/shared/toast';

/**
 * 핀(= 장소 북마크) 토글 결과를 알리는 스낵바 — Figma `핀 활성화 시`·`핀 비활성화 시`(252:10479).
 * 지도 상세에서 눌렀든 게시물 상세의 연관 장소에서 눌렀든 같은 동작이라 문구도 하나로 둔다.
 */
const PIN_ON_TITLE = '지도에 표시했어요.';
const PIN_OFF_TITLE = '지도에서 숨겼어요.';

/**
 * 토글 성공 시 스낵바를 띄우는 함수를 돌려준다. 북마크 뮤테이션 훅(`useUpdatePlaceBookmark`)
 * 의 onSuccess 에서 부르므로, 화면마다 따로 배선하지 않아도 모든 토글 진입점이 같이 뜬다.
 */
export function usePlacePinToast() {
  const { showToast } = useToast();

  return useCallback(
    (bookmarked: boolean) =>
      showToast({ variant: 'simple', title: bookmarked ? PIN_ON_TITLE : PIN_OFF_TITLE }),
    [showToast],
  );
}
