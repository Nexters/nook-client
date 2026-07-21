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
    <main
      className="mx-auto max-w-md px-5 pb-6"
      style={{
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <h1 className="text-h1">nook</h1>
      <p className="text-b2 mt-1 text-gray-60">취향 기반 장소 아카이빙</p>
      <dl className="mt-7 flex flex-col gap-2.5">
        <div className="flex justify-between rounded-[10px] border border-gray-20 bg-gray-10 px-3.5 py-3">
          <dt className="text-b2 text-gray-60">플랫폼</dt>
          <dd className="text-b2 font-medium text-gray-100">{platform.name}</dd>
        </div>
        <div className="flex justify-between rounded-[10px] border border-gray-20 bg-gray-10 px-3.5 py-3">
          <dt className="text-b2 text-gray-60">네이티브</dt>
          <dd className="text-b2 font-medium text-gray-100">
            {platform.isNative ? '예 (Capacitor)' : '아니오 (웹)'}
          </dd>
        </div>
        <div className="flex justify-between rounded-[10px] border border-gray-20 bg-gray-10 px-3.5 py-3">
          <dt className="text-b2 text-gray-60">스토어</dt>
          <dd className="text-b2 font-medium text-gray-100">{ready ? 'ready' : 'booting…'}</dd>
        </div>
      </dl>
    </main>
  );
}
