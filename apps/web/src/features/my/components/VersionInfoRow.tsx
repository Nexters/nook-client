import { type MouseEvent, useRef } from 'react';
import { MyMenuRow } from '@/features/my/components/MyMenuRow';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { Icon16Version } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';

const LONG_PRESS_MS = 500;

/**
 * 버전 정보 행. 웹은 머지마다 배포돼 앱 버전만으로는 어떤 빌드인지 알 수 없어,
 * 라벨 아래에 빌드 ID(`v1.1.1-20261018-e7d4caa`)를 둬 스크린샷 한 장으로 빌드를 특정할 수 있게 한다.
 * 길게 누르면 QA 리포트에 붙여넣을 수 있게 그 ID 를 그대로 복사한다.
 */
export function VersionInfoRow() {
  const { showToast } = useToast();
  const pressedAt = useRef<number | null>(null);
  // 셸이 주입한 실제 앱 버전. 브라우저로 열면 알 수 없어 행에서 값만 빠진다.
  const appVersion = nativeBridge.appVersion;
  // 앱 버전이 붙은 하나의 빌드 ID 로 읽히게 한다. 셸 밖에서는 웹 빌드뿐이라 `web-` 로 시작한다.
  const buildId = appVersion ? `v${appVersion}-${env.webBuild}` : `web-${env.webBuild}`;

  // 타이머가 아니라 손을 뗄 때 복사한다 — 터치에서는 pointerup 이 되어야 사용자 활성화로
  // 인정돼, 누르고 있는 동안 부르면 WebKit 이 클립보드 쓰기를 막는다.
  const handlePointerUp = async () => {
    const startedAt = pressedAt.current;
    pressedAt.current = null;
    if (startedAt === null || Date.now() - startedAt < LONG_PRESS_MS) return;
    try {
      await navigator.clipboard.writeText(buildId);
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
        description={buildId}
        badge="최신버전"
        value={appVersion ? `v${appVersion}` : undefined}
      />
    </div>
  );
}
