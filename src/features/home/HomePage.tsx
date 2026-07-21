import { useEffect } from 'react';
import { platform } from '@/shared/native/platform';
import { useAppStore } from '@/stores/appStore';

/**
 * 스캐폴드 검증용 홈 화면. 라우터·zustand·네이티브 플랫폼 감지가
 * 배선됐는지 한 화면에서 확인한다.
 */
export function HomePage() {
  const ready = useAppStore((s) => s.ready);
  const setReady = useAppStore((s) => s.setReady);

  useEffect(() => {
    setReady(true);
  }, [setReady]);

  return (
    <main className="home">
      <h1>nook</h1>
      <p className="tagline">취향 기반 장소 아카이빙</p>
      <dl className="status">
        <div>
          <dt>플랫폼</dt>
          <dd>{platform.name}</dd>
        </div>
        <div>
          <dt>네이티브</dt>
          <dd>{platform.isNative ? '예 (Capacitor)' : '아니오 (웹)'}</dd>
        </div>
        <div>
          <dt>스토어</dt>
          <dd>{ready ? 'ready' : 'booting…'}</dd>
        </div>
      </dl>
    </main>
  );
}
