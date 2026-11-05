import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/shared/api';

const session = vi.hoisted(() => ({ token: null as string | null }));
const record = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  getSessionAccessToken: () => session.token,
  useAuthSession: () => ({ accessToken: session.token }),
}));
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  record,
}));

const { flushOnboardingEvents, tokenOwner, trackInstagramCtaClick } = await import(
  './onboardingEvents'
);

const jwt = (sub: string) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`;
const A = jwt('1');
const B = jwt('2');
const queued = () => JSON.parse(localStorage.getItem('nook.onboarding.events.v1') ?? '[]');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('onboardingEvents', () => {
  beforeEach(() => {
    localStorage.clear();
    record.mockReset();
    session.token = A;
  });
  afterEach(() => vi.useRealTimers());

  it('JWT sub 로 계정을 가른다', () => {
    expect(tokenOwner(A)).toBe('1');
    expect(tokenOwner('opaque')).toBeNull();
  });

  it('탭하면 UUID·UTC 시각으로 보내고, 성공하면 큐에서 지운다', async () => {
    record.mockResolvedValue(undefined);
    trackInstagramCtaClick();
    await settle();

    const [body, options] = record.mock.calls[0] ?? [];
    expect(body).toEqual({
      eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      eventName: 'INSTAGRAM_CTA_CLICK',
      occurredAt: expect.stringMatching(/Z$/),
    });
    expect(options.headers.Authorization).toBe(`Bearer ${A}`);
    expect(queued()).toEqual([]);
  });

  it('네트워크 실패는 같은 id·시각 그대로 남겨 다시 보낸다', async () => {
    record.mockRejectedValueOnce(new ApiClientError('x', { kind: 'network' }));
    trackInstagramCtaClick();
    await settle();
    const [first] = queued();
    expect(first).toBeDefined();

    record.mockResolvedValue(undefined);
    await flushOnboardingEvents();
    expect(record.mock.calls[1]?.[0]).toEqual({
      eventId: first.eventId,
      eventName: first.eventName,
      occurredAt: first.occurredAt,
    });
    expect(queued()).toEqual([]);
  });

  it('400 은 다시 보내지 않고 버린다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    record.mockRejectedValue(new ApiClientError('x', { kind: 'http', status: 400 }));
    trackInstagramCtaClick();
    await settle();
    expect(queued()).toEqual([]);
  });

  it('다른 계정 토큰으로는 보내지 않고, 원래 계정이 돌아오면 보낸다', async () => {
    record.mockRejectedValue(new ApiClientError('x', { kind: 'network' }));
    trackInstagramCtaClick();
    await settle();

    record.mockReset().mockResolvedValue(undefined);
    session.token = B;
    await flushOnboardingEvents();
    expect(record).not.toHaveBeenCalled();

    session.token = A;
    await flushOnboardingEvents();
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('7일이 지난 이벤트는 버린다', async () => {
    record.mockResolvedValue(undefined);
    const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      'nook.onboarding.events.v1',
      JSON.stringify([
        { eventId: 'x', eventName: 'INSTAGRAM_CTA_CLICK', occurredAt: old, owner: '1' },
      ]),
    );
    await flushOnboardingEvents();
    expect(record).not.toHaveBeenCalled();
  });
});
