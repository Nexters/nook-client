import { type MouseEvent, useRef } from 'react';
import { MyMenuRow } from '@/features/my/components/MyMenuRow';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { Icon16Version } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';

const LONG_PRESS_MS = 500;

/**
 * 버전 정보 행. 웹은 머지마다 배포돼 앱 버전만으로는 어떤 빌드인지 알 수 없어,
 * 라벨 아래에 웹 빌드 날짜·커밋을 함께 둬 스크린샷 한 장으로 빌드를 특정할 수 있게 한다.
 * 길게 누르면 QA 리포트에 붙여넣을 한 줄(`1.1.1 · 2026.08.28 · a3f9c21`)을 복사한다.
 */
export function VersionInfoRow() {
  const { showToast } = useToast();
  const pressedAt = useRef<number | null>(null);
  // 셸이 주입한 실제 앱 버전. 브라우저로 열면 알 수 없어 행에서 값만 빠진다.
  const appVersion = nativeBridge.appVersion;
  const webBuild = `${env.webBuildDate} · ${env.webCommit}`;

  // 타이머가 아니라 손을 뗄 때 복사한다 — 터치에서는 pointerup 이 되어야 사용자 활성화로
  // 인정돼, 누르고 있는 동안 부르면 WebKit 이 클립보드 쓰기를 막는다.
  const handlePointerUp = async () => {
    const startedAt = pressedAt.current;
    pressedAt.current = null;
    if (startedAt === null || Date.now() - startedAt < LONG_PRESS_MS) return;
    try {
      await navigator.clipboard.writeText(appVersion ? `${appVersion} · ${webBuild}` : webBuild);
      showToast({ variant: 'simple', title: '클립보드에 복사되었습니다.' });
    } catch {
      // 권한 거부·비보안 컨텍스트(LAN IP dev 서버)에서는 복사가 막힌다. 조용히 넘긴다.
    }
  };

  const cancelPress = () => {
    pressedAt.current = null;
  };

  const pressHandlers = {
    onPointerDown: () => {
      pressedAt.current = Date.now();
    },
    onPointerUp: handlePointerUp,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
  };

  return (
    // 길게 누르기가 OS 텍스트 선택·콜아웃으로 새지 않게 선택과 컨텍스트 메뉴를 끈다.
    <div className="select-none [-webkit-touch-callout:none]" {...pressHandlers}>
      {/* TODO: "최신버전" 배지는 아직 하드코딩이다 — 스토어 최신 버전을 알려주는
        API 가 생기기 전까지는 실제 최신 여부를 판단할 수 없다. */}
      <MyMenuRow
        icon={<Icon16Version />}
        label="버전 정보"
        description={webBuild}
        badge="최신버전"
        value={appVersion ? `v${appVersion}` : undefined}
      />
    </div>
  );
}
