import { type ReactNode, useCallback, useState } from 'react';
import { LoginWall } from '@/features/auth/components/LoginWall';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';

interface LoginGate {
  /**
   * 로그인했으면 `run` 을 그대로 실행하고, 게스트면 대신 월을 띄운다.
   * `reason` 은 월의 설명 한 줄이다 — 예: `아카이브를 만들려면 로그인이 필요해요`.
   */
  gate: (reason: string, run: () => void) => void;
  /** 이미 게스트인 걸 아는 자리에서 월만 띄운다 (예: 시트를 끌어올린 순간). */
  open: (reason: string) => void;
  /** 화면 어딘가에 한 번 그려둔다. 월이 필요 없을 땐 아무것도 그리지 않는다. */
  wall: ReactNode;
}

/**
 * 계정이 필요한 **동작**에 씌우는 문지기.
 *
 * 취소하면 아무 일도 일어나지 않고 그 자리에 그대로 남는다 — 동작을 시도했을 뿐
 * 화면을 옮긴 게 아니기 때문이다. 화면 진입 자체를 막아야 하는 곳은 이 훅이 아니라
 * `EntryLoginWall` 을 쓴다(취소 시 돌아갈 곳이 필요하다).
 *
 * 월을 element 로 돌려주는 건 호출부를 한 줄로 유지하려는 것이다 — 진입점이 많아
 * 화면마다 open 상태와 문구를 따로 들고 있으면 같은 코드가 계속 불어난다.
 */
export function useLoginGate(): LoginGate {
  const isAuthenticated = useIsAuthenticated();
  const [reason, setReason] = useState<string | null>(null);

  const gate = useCallback(
    (nextReason: string, run: () => void) => {
      if (isAuthenticated) {
        run();
        return;
      }
      setReason(nextReason);
    },
    [isAuthenticated],
  );

  return {
    gate,
    open: setReason,
    wall: reason ? <LoginWall open description={reason} onCancel={() => setReason(null)} /> : null,
  };
}
