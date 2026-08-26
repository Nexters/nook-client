import { useState } from 'react';
import { nativeBridge } from '@/native-bridge';
import { Popup } from '@/shared/ui';
import type { AppVersionPolicy } from './api';
import { useAppVersionPolicy } from './api/queries';

/** "나중에"를 누른 최신 빌드 번호. 같은 빌드가 최신인 동안은 다시 묻지 않는다. */
const DISMISSED_BUILD_KEY = 'nook.app-update.dismissed-build';

function readDismissedBuild(): number | null {
  try {
    const raw = window.localStorage.getItem(DISMISSED_BUILD_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function rememberDismissedBuild(build: number | null): void {
  if (build === null) return;
  try {
    window.localStorage.setItem(DISMISSED_BUILD_KEY, String(build));
  } catch {
    // 저장이 막힌 환경이면 다음 실행에 한 번 더 묻는 것으로 그친다.
  }
}

function openStore(policy: AppVersionPolicy): void {
  if (!policy.storeUrl) return;
  nativeBridge.send({ v: 1, type: 'OPEN_EXTERNAL_URL', payload: { url: policy.storeUrl } });
}

/**
 * 서버의 앱 버전 정책에 따라 업데이트 안내를 띄운다. 앱 진입을 막지 않고(응답을 기다리지
 * 않고) 결과가 오면 그 위에 올린다 — 조회 실패로 앱이 안 열리는 상황을 만들지 않는다.
 * - FORCE: 닫을 수 없는 단일 버튼. 앱을 계속 쓰는 경로가 없어야 한다.
 * - RECOMMEND: 두 버튼. "나중에"는 그 빌드에 대해 기억해 새 빌드가 나올 때만 다시 묻는다.
 */
export function AppUpdateGateHost() {
  const { data: policy } = useAppVersionPolicy();
  const [dismissed, setDismissed] = useState(false);

  if (!policy || policy.updateType === 'NONE') return null;

  if (policy.updateType === 'FORCE') {
    return (
      <Popup
        open
        dismissible={false}
        onClose={() => undefined}
        title="업데이트가 필요해요"
        description="현재 버전은 더 이상 지원되지 않아요. 업데이트 후 이용할 수 있어요."
        cancelLabel={null}
        confirmLabel="업데이트하기"
        onConfirm={() => openStore(policy)}
      />
    );
  }

  if (dismissed || readDismissedBuild() === policy.latestBuildNumber) return null;

  return (
    <Popup
      open
      onClose={() => {
        rememberDismissedBuild(policy.latestBuildNumber);
        setDismissed(true);
      }}
      title="새로운 버전이 나왔어요"
      description="더 편리해진 눅을 만나보세요. 지금 업데이트할까요?"
      cancelLabel="나중에"
      confirmLabel="업데이트하기"
      onConfirm={() => openStore(policy)}
    />
  );
}
