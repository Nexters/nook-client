import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nativeBridge } from '@/native-bridge';

/** 알림을 탭해 앱을 연 경우(콜드 스타트 포함) postId 기준으로 게시물 상세로 이동한다. */
export function NativePushHost() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!nativeBridge.isNative) return undefined;
    return nativeBridge.on((message) => {
      if (message.type !== 'PUSH_NOTIFICATION_OPENED') return;

      const { data } = message.payload;
      if (data.type !== 'POST_PROCESSING' || !data.postId) return;
      navigate(`/post/${data.postId}`);
    });
  }, [navigate]);

  return null;
}
