import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionProvider } from '@/features/auth/session/AuthSessionProvider';

vi.mock('@/native-bridge', () => ({ nativeBridge: { isNative: false } }));

const holder = vi.hoisted(() => ({
  provider: undefined as (() => string | null) | undefined,
  timeline: [] as string[],
}));

vi.mock('@/shared/api/http', () => ({
  apiClient: {
    setAccessTokenProvider: (next: () => string | null) => {
      holder.provider = next;
      holder.timeline.push('provider-registered');
    },
    setSessionRefresher: () => {},
  },
}));

function RequestingChild() {
  useEffect(() => {
    // useQuery 가 마운트 직후 queryFn 을 실행하는 시점을 흉내낸다.
    holder.timeline.push(`child-request:${holder.provider?.() ?? 'NO_TOKEN'}`);
  }, []);
  return null;
}

describe('세션 토큰 provider 등록 순서', () => {
  beforeEach(() => {
    localStorage.clear();
    holder.timeline.length = 0;
  });

  it('자식의 첫 요청이 복구된 토큰을 읽는다', () => {
    localStorage.setItem('nook.dev.session.v1', JSON.stringify({ accessToken: 'stored-token' }));

    render(
      <AuthSessionProvider>
        <RequestingChild />
      </AuthSessionProvider>,
    );

    expect(holder.timeline).toEqual(['child-request:stored-token']);
  });
});
