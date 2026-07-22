import { useEffect, useState } from 'react';
import { nativeBridge } from '@/bridge';
import { useAppStore } from '@/stores/appStore';

/**
 * 스캐폴드 검증용 홈. 라우터·zustand·네이티브 브리지가 배선됐는지 한 화면에서 확인한다.
 * (원격 웹의 실제 화면 map/group/place/post/my 는 후속 레그에서 추가)
 */
export function HomePage() {
  const ready = useAppStore((s) => s.ready);
  const setReady = useAppStore((s) => s.setReady);
  const [lastShare, setLastShare] = useState('없음');

  useEffect(() => {
    setReady(true);
  }, [setReady]);

  useEffect(() => {
    nativeBridge.start();
    return nativeBridge.on((message) => {
      if (message.type === 'SHARE_RECEIVED') {
        setLastShare(message.payload.items.map((i) => i.text).join(', ') || '(텍스트 없음)');
      }
    });
  }, []);

  return (
    <main className="home">
      <h1>nook</h1>
      <p className="tagline">취향 기반 장소 아카이빙</p>
      <dl className="status">
        <div>
          <dt>플랫폼</dt>
          <dd>{nativeBridge.platform}</dd>
        </div>
        <div>
          <dt>네이티브 셸</dt>
          <dd>{nativeBridge.isNative ? '예' : '아니오 (웹)'}</dd>
        </div>
        <div>
          <dt>스토어</dt>
          <dd>{ready ? 'ready' : 'booting…'}</dd>
        </div>
        <div>
          <dt>마지막 공유 수신</dt>
          <dd>{lastShare}</dd>
        </div>
      </dl>
    </main>
  );
}
