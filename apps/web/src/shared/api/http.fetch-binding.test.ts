import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './http';

describe('ApiClient 의 fetch 호출', () => {
  it('전역 fetch 를 ApiClient 인스턴스에 바인딩하지 않는다', async () => {
    let receivedThis: unknown = 'NOT_CALLED';
    const fetchSpy = function (this: unknown) {
      receivedThis = this;
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    vi.stubGlobal('fetch', fetchSpy);

    // 전역 stub 이후에 만들어야 생성자가 stub 을 캡처한다.
    const client = new ApiClient({ baseUrl: 'https://example.com/api/v1' });
    await client.request('/groups');

    // 브라우저에서 window.fetch 를 다른 this 로 호출하면 Illegal invocation 이 난다.
    expect(receivedThis).not.toBeInstanceOf(ApiClient);
    expect(receivedThis).toBe(globalThis);
  });
});
