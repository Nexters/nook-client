import { useEffect, useState } from 'react';
import { nativeBridge } from '@/native-bridge';
import { useAppStore } from '@/stores/appStore';

/**
 * 스캐폴드 검증용 홈. Expo 셸(RN webview) 브리지가 배선됐는지 한 화면에서 확인한다.
 */
export function HomePage() {
  const ready = useAppStore((s) => s.ready);
  const setReady = useAppStore((s) => s.setReady);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    setReady(true);
  }, [setReady]);

  useEffect(() => {
    nativeBridge.start();
    return nativeBridge.on((message) => {
      const detail =
        message.type === 'SHARE_RECEIVED'
          ? `: ${JSON.stringify((message.payload as { items?: { text: string }[] })?.items ?? [])}`
          : '';
      setLog((prev) => [`${prev.length + 1}. ${message.type}${detail}`, ...prev].slice(0, 6));
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
          <dd>{nativeBridge.isNative ? '예 (Expo/RN)' : '아니오 (웹)'}</dd>
        </div>
        <div>
          <dt>스토어</dt>
          <dd>{ready ? 'ready' : 'booting…'}</dd>
        </div>
      </dl>
      <section style={{ padding: '12px 16px', fontSize: 12, opacity: 0.85 }}>
        <div style={{ marginBottom: 6 }}>수신 로그 (셸→웹)</div>
        {log.length === 0 ? <div>— 없음 —</div> : log.map((line) => <div key={line}>{line}</div>)}
      </section>
    </main>
  );
}
