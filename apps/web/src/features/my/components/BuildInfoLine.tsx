import { useRef } from 'react';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { useToast } from '@/shared/toast';

const LONG_PRESS_MS = 500;

/**
 * 어떤 빌드가 떠 있는지 스크린샷 한 장으로 특정하기 위한 한 줄(`1.1.1 · 2026.08.28 · a3f9c21`).
 * 앱 버전은 셸 안에서만 알 수 있어, 브라우저로 열면 웹 빌드 정보만 남는다.
 * 길게 누르면 QA 리포트에 붙여넣을 수 있게 그대로 복사한다.
 */
export function BuildInfoLine() {
  const { showToast } = useToast();
  const pressedAt = useRef<number | null>(null);
  const text = [nativeBridge.appVersion, env.webBuildDate, env.webCommit]
    .filter(Boolean)
    .join(' · ');

  // 타이머가 아니라 손을 뗄 때 복사한다 — 터치에서는 pointerup 이 되어야 사용자 활성화로
  // 인정돼, 누르고 있는 동안 부르면 WebKit 이 클립보드 쓰기를 막는다.
  const handlePointerUp = async () => {
    const startedAt = pressedAt.current;
    pressedAt.current = null;
    if (startedAt === null || Date.now() - startedAt < LONG_PRESS_MS) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast({ variant: 'simple', title: '클립보드에 복사되었습니다.' });
    } catch {
      // 권한 거부·비보안 컨텍스트(LAN IP dev 서버)에서는 복사가 막힌다. 조용히 넘긴다.
    }
  };

  const cancelPress = () => {
    pressedAt.current = null;
  };

  return (
    // 길게 누르기가 OS 텍스트 선택·콜아웃으로 새지 않게 선택과 컨텍스트 메뉴를 끈다.
    <p
      className="select-none py-4 text-center font-mono text-e2 text-gray-40 [-webkit-touch-callout:none]"
      onPointerDown={() => {
        pressedAt.current = Date.now();
      }}
      onPointerUp={handlePointerUp}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => event.preventDefault()}
    >
      {text}
    </p>
  );
}
