import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postQueryKeys } from '@/features/post/api/queries';
import { POST_NOT_FOUND_TOAST } from '@/features/post/postEntry';
import { nativeBridge } from '@/native-bridge';
import { useToast } from '@/shared/toast';

/** 양의 정수 문자열만 저장 게시물 ID 로 받는다. */
const SAVED_POST_ID = /^[1-9]\d*$/;

/**
 * 알림을 탭해 앱을 연 경우(콜드 스타트 포함) 내 저장 게시물 상세로 이동한다.
 * `data.postId` 는 원본 게시물 ID 라 내 상세 ID 와 다르다 — 수신자별 `savedPostId` 를 쓴다
 * (서버 계약, BE #260). 이 값이 없는 구형 알림이나 잘못된 값은 원본 ID 로 열지 않고
 * 아카이브 목록으로 보낸다.
 */
export function NativePushHost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return nativeBridge.on((message) => {
      if (message.type !== 'PUSH_NOTIFICATION_OPENED') return;

      const { data } = message.payload;
      if (data.type !== 'POST_PROCESSING') return;

      const savedPostId = data.savedPostId;
      if (!savedPostId || !SAVED_POST_ID.test(savedPostId)) {
        showToast(POST_NOT_FOUND_TOAST);
        navigate('/archive');
        return;
      }

      // 웜 스타트면 WebView 가 살아 있어 이 게시물의 캐시가 그대로다. 이미 그 상세에
      // 있었다면 이동해도 리마운트가 없어 낡은 화면이 남으므로 먼저 캐시를 버린다.
      // ['posts', postId] 프리픽스라 장소 파싱 쿼리도 함께 무효화된다.
      queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(Number(savedPostId)) });
      navigate(`/post/${savedPostId}`);
    });
  }, [navigate, queryClient, showToast]);

  return null;
}
