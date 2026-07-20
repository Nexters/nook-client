import { useEffect } from 'react';
import { platform } from '@/shared/native/platform';
import { onShareReceived } from '@/shared/native/shareTarget';
import { useAppStore } from '@/stores/appStore';
import { useShareStore } from '@/stores/shareStore';

/**
 * 스캐폴드 검증용 홈 화면. 라우터·zustand·네이티브 플랫폼 감지가
 * 배선됐는지 한 화면에서 확인한다.
 */
export function HomePage() {
  const ready = useAppStore((s) => s.ready);
  const setReady = useAppStore((s) => s.setReady);
  const lastShare = useShareStore((s) => s.lastShare);
  const setLastShare = useShareStore((s) => s.setLastShare);

  useEffect(() => {
    setReady(true);
  }, [setReady]);

  useEffect(() => onShareReceived(setLastShare), [setLastShare]);

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
        <div>
          <dt>마지막 공유 수신</dt>
          <dd>{lastShare ? lastShare.texts.join(', ') || '(텍스트 없음)' : '없음'}</dd>
        </div>
      </dl>
    </main>
  );
}
