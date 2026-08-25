import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NativePushHost } from '@/app/native-push';
import { postQueryKeys } from '@/features/post/api/queries';
import { nativeBridge } from '@/native-bridge';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

let queryClient: QueryClient;

function renderHost() {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/archive']}>
        <NativePushHost />
        <Routes>
          <Route path="/archive" element={<LocationProbe />} />
          <Route path="/post/:postId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function receivePush(data: Record<string, string>) {
  act(() => {
    window.__nookReceive?.(
      JSON.stringify({ v: 1, type: 'PUSH_NOTIFICATION_OPENED', payload: { data } }),
    );
  });
}

beforeEach(() => {
  window.ReactNativeWebView = { postMessage: () => {} };
  nativeBridge.start();
  queryClient = new QueryClient();
});

afterEach(() => {
  window.ReactNativeWebView = undefined;
});

/**
 * 웜 스타트로 알림을 타고 들어오면 WebView 가 살아 있어 캐시가 그대로다 —
 * refetchOnWindowFocus 도 꺼져 있어, 이동만 해서는 낡은 상태가 남는다(NOOK-297).
 */
describe('푸시로 게시물 상세에 들어갈 때', () => {
  it('이동 전에 그 게시물의 캐시를 무효화한다', () => {
    queryClient.setQueryData(postQueryKeys.detail(7), { placeParsingStatus: 'PENDING' });
    queryClient.setQueryData(postQueryKeys.placeParsing(7), { placeParsingStatus: 'PENDING' });
    renderHost();

    receivePush({ type: 'POST_PROCESSING', postId: '7' });

    expect(screen.getByTestId('path').textContent).toBe('/post/7');
    expect(queryClient.getQueryState(postQueryKeys.detail(7))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(postQueryKeys.placeParsing(7))?.isInvalidated).toBe(true);
  });

  it('다른 게시물의 캐시는 건드리지 않는다', () => {
    queryClient.setQueryData(postQueryKeys.detail(8), { placeParsingStatus: 'COMPLETED' });
    renderHost();

    receivePush({ type: 'POST_PROCESSING', postId: '7' });

    expect(queryClient.getQueryState(postQueryKeys.detail(8))?.isInvalidated).toBe(false);
  });
});
