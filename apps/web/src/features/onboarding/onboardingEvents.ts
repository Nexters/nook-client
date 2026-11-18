import { useEffect } from 'react';
import { getSessionAccessToken, useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import {
  ApiClientError,
  type OnboardingEventRequest,
  OnboardingEventRequestEventName,
  record as recordOnboardingEvent,
} from '@/shared/api';

/**
 * 온보딩 전환 측정 이벤트(`POST /api/v1/onboarding/events`)의 로컬 큐.
 *
 * 탭한 순간 localStorage 에 먼저 적고 전송은 기다리지 않는다 — 바로 인스타그램으로 앱이
 * 전환돼도 기록이 남고, 돌아오거나 다음에 앱을 열 때 다시 보낸다. 서버가 `eventId` 로 중복을
 * 걸러 주므로(204) 같은 이벤트를 두 번 보내도 안전하다. 재전송은 id·종류·시각을 그대로 쓴다.
 *
 * 계정 귀속: 각 이벤트에 탭할 때의 계정(JWT `sub`)을 적어 두고, 지금 토큰의 계정과 같은
 * 것만 보낸다. 다른 계정의 이벤트는 그 계정으로 다시 로그인할 때까지(최대 7일) 남는다.
 */
const KEY = 'nook.onboarding.events.v1';
// 서버 허용 범위는 발생 후 7일. 경계에서 400 이 나지 않게 1시간 일찍 버린다.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 5 * 60_000;

interface QueuedEvent extends OnboardingEventRequest {
  owner: string;
}

/** 토큰의 `sub`. 서명은 확인하지 않는다 — 어느 계정 이벤트인지 가르는 데만 쓴다. */
export function tokenOwner(token: string | null): string | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const { sub } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: unknown;
    };
    return typeof sub === 'string' || typeof sub === 'number' ? String(sub) : null;
  } catch {
    return null;
  }
}

function read(): QueuedEvent[] {
  try {
    const events = JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueuedEvent[];
    const minTime = Date.now() - MAX_AGE_MS;
    return events.filter((event) => Date.parse(event.occurredAt) >= minTime);
  } catch {
    return [];
  }
}

function write(events: QueuedEvent[]): void {
  try {
    if (events.length) localStorage.setItem(KEY, JSON.stringify(events));
    else localStorage.removeItem(KEY);
  } catch {
    // ponytail: 저장소가 막힌 환경(프라이빗 모드)에서는 기록을 잃는다. WebView 에서는 쓸 수 있다.
  }
}

function remove(eventId: string): void {
  write(read().filter((event) => event.eventId !== eventId));
}

// 보안 컨텍스트가 아니면(LAN IP 의 dev 서버) randomUUID 가 없다. 서버가 UUID 형식을 검사하므로
// getRandomValues 로 v4 를 직접 만든다.
function uuid(): string {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = BASE_RETRY_MS;

/** 지금 계정의 대기 이벤트를 보낸다. 네트워크·5xx·401 은 남겨 두고 지수 backoff 로 다시 부른다. */
export async function flushOnboardingEvents(): Promise<void> {
  const token = getSessionAccessToken();
  const owner = tokenOwner(token);
  if (flushing || !token || !owner) return;
  flushing = true;
  clearTimeout(retryTimer);
  let failed = false;
  try {
    for (;;) {
      const event = read().find((item) => item.owner === owner);
      if (!event) break;
      const { eventId, eventName, occurredAt } = event;
      try {
        // 확인한 그 토큰으로 보낸다. 401 이면 http 계층이 같은 계정 토큰을 갱신해 한 번 더 보낸다.
        await recordOnboardingEvent(
          { eventId, eventName, occurredAt },
          { auth: 'required', headers: { Authorization: `Bearer ${token}` } },
        );
        remove(eventId);
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 400) {
          // 종류·UUID·시각(단말 시계가 서버보다 빠름 등) 오류. 다시 보내도 같다.
          console.warn('[onboardingEvents] 서버가 거절한 이벤트를 버립니다.', event, error);
          remove(eventId);
        } else {
          failed = true;
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }
  if (failed) {
    retryTimer = setTimeout(() => void flushOnboardingEvents(), retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
  } else {
    retryDelay = BASE_RETRY_MS;
  }
}

/** 온보딩 Instagram CTA 를 탭한 순간. 큐에 적고 전송은 기다리지 않는다. */
export function trackInstagramCtaClick(): void {
  const owner = tokenOwner(getSessionAccessToken());
  if (!owner) return;
  write([
    ...read(),
    {
      eventId: uuid(),
      eventName: OnboardingEventRequestEventName.INSTAGRAM_CTA_CLICK,
      occurredAt: new Date().toISOString(),
      owner,
    },
  ]);
  void flushOnboardingEvents();
}

/** 앱 시작·로그인·포그라운드 복귀·온라인 복귀 때 밀린 이벤트를 보낸다. */
export function OnboardingEventSyncHost() {
  const { accessToken } = useAuthSession();

  useEffect(() => {
    if (accessToken) void flushOnboardingEvents();
  }, [accessToken]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'visible') void flushOnboardingEvents();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  return null;
}
