import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NativePushHost } from '@/app/native-push';
import { postQueryKeys } from '@/features/post/api/queries';
import { nativeBridge } from '@/native-bridge';
import { ToastProvider } from '@/shared/toast';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

let queryClient: QueryClient;

function renderHost() {
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/map']}>
          <NativePushHost />
          <Routes>
            <Route path="/map" element={<LocationProbe />} />
            <Route path="/archive" element={<LocationProbe />} />
            <Route path="/post/:postId" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
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

    receivePush({ type: 'POST_PROCESSING', postId: '101', savedPostId: '7' });

    expect(screen.getByTestId('path').textContent).toBe('/post/7');
    expect(queryClient.getQueryState(postQueryKeys.detail(7))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(postQueryKeys.placeParsing(7))?.isInvalidated).toBe(true);
  });

  it('다른 게시물의 캐시는 건드리지 않는다', () => {
    queryClient.setQueryData(postQueryKeys.detail(8), { placeParsingStatus: 'COMPLETED' });
    renderHost();

    receivePush({ type: 'POST_PROCESSING', postId: '101', savedPostId: '7' });

    expect(queryClient.getQueryState(postQueryKeys.detail(8))?.isInvalidated).toBe(false);
  });
});

/** 푸시의 postId 는 원본 게시물 ID 라 내 상세 ID 와 다르다 — 수신자별 savedPostId 로 연다. */
describe('푸시의 게시물 ID', () => {
  it('원본 postId 가 아니라 savedPostId 로 상세를 연다', () => {
    renderHost();

    receivePush({
      type: 'POST_PROCESSING',
      outcome: 'COMPLETED',
      postId: '101',
      savedPostId: '710',
    });

    expect(screen.getByTestId('path').textContent).toBe('/post/710');
  });

  it.each([
    ['savedPostId 가 없는 구형 알림', { postId: '101' }],
    ['양의 정수가 아닌 값', { postId: '101', savedPostId: '0' }],
    ['숫자가 아닌 값', { postId: '101', savedPostId: 'abc' }],
  ])('%s은 원본 ID 로 열지 않고 안내 후 아카이브 목록으로 보낸다', async (_, data) => {
    renderHost();

    receivePush({ type: 'POST_PROCESSING', ...data });

    expect(screen.getByTestId('path').textContent).toBe('/archive');
    expect(await screen.findByText('게시물을 찾을 수 없어요')).toBeInTheDocument();
  });
});
