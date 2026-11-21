import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useRouteError } from 'react-router-dom';

const RECOVER_KEY = 'nook.route-error-recovered-at';
/** 이 시간 안에 또 터지면 같은 원인이 반복되는 것으로 보고 자동 복구를 멈춘다(무한 루프 방지). */
const RECOVER_WINDOW_MS = 5000;

function readRecoveredAt() {
  try {
    return Number(sessionStorage.getItem(RECOVER_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function markRecovered() {
  try {
    sessionStorage.setItem(RECOVER_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 쓰면 자동 복구를 한 번만 시도하고 끝난다.
  }
}

/** dev 에서만 — 에러를 dev 서버 터미널로 보낸다(vite.config 의 clientErrorLogger). */
export function reportClientError(kind: string, error: unknown) {
  if (!import.meta.hot) return;
  const err = error instanceof Error ? error : null;
  import.meta.hot.send('nook:client-error', {
    kind,
    message: err ? `${err.name}: ${err.message}` : String(error),
    stack: err?.stack,
    url: window.location.href,
  });
}

if (import.meta.hot) {
  window.addEventListener('error', (e) => reportClientError('window', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError('promise', e.reason));
}

/**
 * 라우트 렌더 중 예외가 나면 React Router 기본 "Unexpected Application Error!" 화면 대신
 * 이 화면을 쓴다. 처음 한 번은 같은 주소로 다시 이동해 조용히 다시 그린다 — 뒤로가기 직후
 * 일시적인 상태 어긋남 같은 오류는 이것만으로 사라진다. 짧은 시간 안에 또 나면 반복되는
 * 오류라 복구 안내를 보여준다.
 */
export function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFallback, setShowFallback] = useState(
    () => Date.now() - readRecoveredAt() < RECOVER_WINDOW_MS,
  );

  useEffect(() => {
    console.error('[route-error]', error);
    reportClientError('route', error);
    if (showFallback) return;
    markRecovered();
    // 새 내비게이션이 끝나면 라우터가 에러 상태를 비우고 원래 화면을 다시 그린다.
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: location.state,
    });
    // 이동이 안 먹히는 경우를 대비해 잠깐 뒤에도 남아 있으면 안내를 띄운다.
    const timer = setTimeout(() => setShowFallback(true), 1500);
    return () => clearTimeout(timer);
  }, [error, showFallback, navigate, location]);

  if (!showFallback) return null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-0 px-6 text-center">
      <p className="text-b2 text-gray-60">화면을 불러오지 못했어요</p>
      {import.meta.env.DEV ? (
        <pre className="max-h-40 w-full overflow-auto whitespace-pre-wrap text-left text-[11px] text-gray-50">
          {error instanceof Error ? `${error.name}: ${error.message}` : String(error)}
        </pre>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-gray-30 px-4 py-2 text-b2 font-medium text-gray-80"
        >
          다시 시도
        </button>
        <button
          type="button"
          onClick={() => window.location.assign(`/map${location.search}`)}
          className="rounded-lg border border-gray-30 px-4 py-2 text-b2 font-medium text-gray-80"
        >
          지도로 가기
        </button>
      </div>
    </div>
  );
}
