import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postQueryKeys } from '@/features/post/api/queries';
import { nativeBridge } from '@/native-bridge';

/** 알림을 탭해 앱을 연 경우(콜드 스타트 포함) postId 기준으로 게시물 상세로 이동한다. */
export function NativePushHost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return nativeBridge.on((message) => {
      if (message.type !== 'PUSH_NOTIFICATION_OPENED') return;

      const { data } = message.payload;
      if (data.type !== 'POST_PROCESSING' || !data.postId) return;

      // 웜 스타트면 WebView 가 살아 있어 이 게시물의 캐시가 그대로다. 이미 그 상세에
      // 있었다면 이동해도 리마운트가 없어 낡은 화면이 남으므로 먼저 캐시를 버린다.
      // ['posts', postId] 프리픽스라 장소 파싱 쿼리도 함께 무효화된다.
      const postId = Number(data.postId);
      if (Number.isFinite(postId)) {
        queryClient.invalidateQueries({ queryKey: postQueryKeys.detail(postId) });
      }
      navigate(`/post/${data.postId}`);
    });
  }, [navigate, queryClient]);

  return null;
}
