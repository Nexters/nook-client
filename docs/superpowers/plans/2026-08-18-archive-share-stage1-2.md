# 아카이브 공유 1·2단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아카이브 공유 링크 발급(발신)과 공개 열람 페이지, 로그인 복귀, 아카이브 구독·목록 통합, "앱에서 보기" 딥링크까지 — 스펙의 배포 1·2단계를 구현한다.

**Architecture:** 공유 컨텍스트 분기는 라우트 레벨(`/shared/:token`, `RequireAuth` 밖)에서 끝내고, 페이지는 기존 presentational 조각(`CollectionCard`, `PlaceCard`, `ArchiveEmpty` 등)을 조립한다. 데이터는 `features/share/api`가 public 엔드포인트(요청 단위 `auth` 옵션)로 가져오고, TanStack Query 키는 `['shared', token, ...]` 프리픽스를 쓴다.

**Tech Stack:** React 19 + react-router-dom(BrowserRouter) + TanStack Query + vitest/@testing-library/react. HTTP는 자체 `ApiClient`(fetch), 코드는 orval 생성 함수 사용.

**Spec:** `docs/superpowers/specs/2026-08-18-archive-share-design.md`

## Global Constraints

- 3·4단계(공유 게시물 상세·단건 저장·장소 시트)는 이 계획의 범위가 아니다. 카드 탭 등 3·4단계로 이어지는 진입점은 no-op으로 두고 주석으로 표기한다.
- 서버 색상 코드 ↔ UI 색상 매핑은 기존 `SERVER_TO_UI_COLOR`(features/archive/api/index.ts)만 사용.
- 낙관적 갱신 금지 — mutation 후 `invalidateQueries` 프리픽스 무효화로 통일 (기존 컨벤션).
- 새 파일의 주석·문구는 기존 코드처럼 한국어. 사용자 노출 문구는 스펙 §11 표의 문구를 그대로 사용.
- 각 Task 종료 시 `cd apps/web && pnpm test` 전체 그린 + 저장소 루트에서 `pnpm typecheck` 통과 후 커밋 (pre-commit 훅이 typecheck를 돌린다).
- 테스트는 기존 컨벤션대로 페이지/유닛 레벨: feature api 모듈은 `vi.mock`, HTTP 전송은 검증하지 않는다.
- 공유 URL 경로는 `/shared/{token}`, 커스텀 스킴은 `kr.co.everynook.app://shared/{token}`.

---

### Task 1: `Archive` 모델에 공유 필드 추가

`GroupResponse`에 추가된 `accessType`/`owner`/`shareToken`을 화면 모델에 보존한다.
현재 `toArchive()`가 이 필드들을 버리고 있다.

**Files:**
- Modify: `apps/web/src/features/archive/types.ts`
- Modify: `apps/web/src/features/archive/api/index.ts` (`toArchive` — export로 승격)
- Test: `apps/web/src/features/archive/api/index.test.ts` (신규)

**Interfaces:**
- Consumes: `GroupResponse`(`accessType: 'OWNED'|'SHARED'`, `owner?: {nickname, profileImageUrl?}|null`, `shareToken?: string|null`) — 생성 코드에 이미 존재.
- Produces: `Archive.accessType: 'OWNED' | 'SHARED'`, `Archive.owner?: ArchiveOwner`, `Archive.shareToken?: string`, named export `toArchive(dto: GroupResponse): Archive`. Task 2·6·7이 이 필드에 의존한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// apps/web/src/features/archive/api/index.test.ts
import { describe, expect, it } from 'vitest';
import type { GroupResponse } from '@/shared/api';
import { toArchive } from '.';

const BASE: GroupResponse = {
  id: 27,
  name: '카페',
  color: 'GRAY',
  postCount: 12,
  thumbnailUrls: [],
  accessType: 'OWNED',
};

describe('toArchive', () => {
  it('내 아카이브는 accessType OWNED 로, owner/shareToken 없이 변환한다', () => {
    const archive = toArchive(BASE);
    expect(archive.accessType).toBe('OWNED');
    expect(archive.owner).toBeUndefined();
    expect(archive.shareToken).toBeUndefined();
  });

  it('공유받은 아카이브는 owner 와 shareToken 을 보존한다', () => {
    const archive = toArchive({
      ...BASE,
      accessType: 'SHARED',
      owner: { nickname: 'ehoidi', profileImageUrl: 'https://img.example/p.png' },
      shareToken: 'tok-123',
    });
    expect(archive.accessType).toBe('SHARED');
    expect(archive.owner).toEqual({ nickname: 'ehoidi', profileImageUrl: 'https://img.example/p.png' });
    expect(archive.shareToken).toBe('tok-123');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/archive/api/index.test.ts`
Expected: FAIL — `toArchive` is not exported.

- [ ] **Step 3: 타입·매핑 구현**

`types.ts`의 `Archive`에 추가:

```ts
/** 공유 아카이브(SHARED)의 원 소유자 표시용. */
export interface ArchiveOwner {
  nickname: string;
  profileImageUrl?: string;
}
```

`Archive` 인터페이스에 필드 추가:

```ts
  /** 소유 관계 — SHARED 면 읽기 전용 카드로 동작한다. */
  accessType: 'OWNED' | 'SHARED';
  /** SHARED 아카이브의 원 소유자. OWNED 에는 없다. */
  owner?: ArchiveOwner;
  /** 공유 상세 진입용 토큰. 내(OWNED) 아카이브에는 없다. */
  shareToken?: string;
```

`api/index.ts`의 `toArchive`를 export하고 매핑 확장:

```ts
/** 서버 DTO → 화면 모델. 서버의 `postCount`가 카드 배지의 개수다. */
export function toArchive(dto: GroupResponse): Archive {
  return {
    id: dto.id,
    name: dto.name,
    color: SERVER_TO_UI_COLOR[dto.color as CreateGroupRequestColor] ?? 'cement',
    placeCount: dto.postCount,
    thumbnails: dto.thumbnailUrls,
    accessType: dto.accessType,
    owner: dto.owner
      ? { nickname: dto.owner.nickname, profileImageUrl: dto.owner.profileImageUrl ?? undefined }
      : undefined,
    shareToken: dto.shareToken ?? undefined,
  };
}
```

기존 테스트(`ArchivePage.test.tsx`)의 `ARCHIVES` 픽스처처럼 `Archive`를 직접 만드는 곳에
`accessType: 'OWNED'`를 추가해 타입 에러를 없앤다 (typecheck가 위치를 다 알려준다).

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/archive`
Expected: PASS (신규 + 기존 아카이브 테스트 전부)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/archive
git commit -m "feat(archive): Archive 모델에 accessType·owner·shareToken 보존"
```

---

### Task 2: 공유 데이터 레이어 (`features/share/api`)

public 엔드포인트용 fetcher와 Query 훅. 목록 응답 shape가 기존 그룹 API와 동일하므로
`toArchivePost`/`toArchivePlace` 변환을 재사용한다 (archive api에서 export로 승격).

**Files:**
- Modify: `apps/web/src/features/archive/api/index.ts` (`toArchivePost`, `toArchivePlace` export 승격)
- Create: `apps/web/src/features/share/api/index.ts`
- Create: `apps/web/src/features/share/api/queries.ts`
- Test: `apps/web/src/features/share/api/index.test.ts`

**Interfaces:**
- Consumes: 생성 엔드포인트 `get(token)`, `posts(token, {page,size})`, `places(token, {page,size})`, `subscribe(token)` (`@/shared/api`), Task 1의 `toArchive`, archive api의 `ArchivePostPage`/`ArchivePlacePage` 타입.
- Produces:
  - `fetchSharedArchive(token: string): Promise<Archive>` — public 메타, `auth` 미지정(none)
  - `fetchSharedArchivePosts(token: string, page?: number): Promise<ArchivePostPage>`
  - `fetchSharedArchivePlaces(token: string, page?: number): Promise<ArchivePlacePage>`
  - `subscribeSharedArchive(token: string): Promise<void>` — `auth: 'required'`
  - `sharedQueryKeys = { meta(token), posts(token), places(token) }`
  - 훅: `useSharedArchive(token)`, `useSharedArchivePosts(token)`, `useSharedArchivePlaces(token)`, `useSubscribeSharedArchive()`

- [ ] **Step 1: 실패하는 테스트 작성**

fetcher가 public 엔드포인트를 인증 없이 부르고 기존 변환을 재사용하는 배선을 검증한다.

```tsx
// apps/web/src/features/share/api/index.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const endpoints = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  places: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  ...endpoints,
}));

import {
  fetchSharedArchive,
  fetchSharedArchivePosts,
  subscribeSharedArchive,
} from '.';

const META_RESPONSE = {
  resultType: 'SUCCESS',
  success: {
    id: 27,
    name: '카페',
    color: 'GRAY',
    postCount: 12,
    thumbnailUrls: [],
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
    shareToken: 'tok-123',
  },
};

describe('share fetchers', () => {
  beforeEach(() => {
    endpoints.get.mockReset().mockResolvedValue(META_RESPONSE);
    endpoints.posts.mockReset().mockResolvedValue({
      resultType: 'SUCCESS',
      success: { items: [], hasNext: false, totalElements: 0, ownerNickname: 'ehoidi' },
    });
    endpoints.subscribe.mockReset().mockResolvedValue({ resultType: 'SUCCESS', success: null });
  });

  it('메타는 인증 없이 조회하고 Archive 모델로 변환한다', async () => {
    const archive = await fetchSharedArchive('tok-123');
    expect(endpoints.get).toHaveBeenCalledWith('tok-123');
    expect(archive).toMatchObject({ id: 27, name: '카페', owner: { nickname: 'ehoidi' } });
  });

  it('게시물 목록은 페이지 파라미터를 넘겨 인증 없이 조회한다', async () => {
    const page = await fetchSharedArchivePosts('tok-123', 2);
    expect(endpoints.posts).toHaveBeenCalledWith('tok-123', { page: 2, size: 20 });
    expect(page).toEqual({ posts: [], nextPage: undefined, ownerNickname: 'ehoidi', totalElements: 0 });
  });

  it('구독은 인증 필수로 호출한다', async () => {
    await subscribeSharedArchive('tok-123');
    expect(endpoints.subscribe).toHaveBeenCalledWith('tok-123', { auth: 'required' });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/api/index.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

먼저 `features/archive/api/index.ts`에서 `toArchivePost`, `toArchivePlace`를 `export function`으로
승격한다 (본문 변경 없음).

```ts
// apps/web/src/features/share/api/index.ts
import {
  type ArchivePlacePage,
  type ArchivePostPage,
  toArchive,
  toArchivePlace,
  toArchivePost,
} from '@/features/archive/api';
import type { Archive } from '@/features/archive/types';
import {
  get as getSharedArchiveEndpoint,
  places as listSharedPlacesEndpoint,
  posts as listSharedPostsEndpoint,
  subscribe as subscribeEndpoint,
  unwrapApiResponse,
} from '@/shared/api';

/** 목록 페이지 크기 — 기존 아카이브 상세와 동일. */
const PAGE_SIZE = 20;

/**
 * 공유 아카이브 메타 — 비로그인 공개 조회라 auth 옵션을 아예 주지 않는다(기본 'none').
 * 응답이 GroupResponse 그대로라 화면 모델도 Archive 를 그대로 쓴다.
 */
export async function fetchSharedArchive(token: string): Promise<Archive> {
  const dto = unwrapApiResponse(await getSharedArchiveEndpoint(token));
  if (!dto) throw new Error('공유 아카이브 응답이 비어 있어요');
  return toArchive(dto);
}

export async function fetchSharedArchivePosts(token: string, page = 0): Promise<ArchivePostPage> {
  const response = unwrapApiResponse(
    await listSharedPostsEndpoint(token, { page, size: PAGE_SIZE }),
  );
  return {
    posts: (response?.items ?? []).map(toArchivePost),
    nextPage: response?.hasNext ? page + 1 : undefined,
    ownerNickname: response?.ownerNickname,
    totalElements: response?.totalElements ?? 0,
  };
}

export async function fetchSharedArchivePlaces(
  token: string,
  page = 0,
): Promise<ArchivePlacePage> {
  const response = unwrapApiResponse(
    await listSharedPlacesEndpoint(token, { page, size: PAGE_SIZE }),
  );
  return {
    places: (response?.items ?? []).map(toArchivePlace),
    nextPage: response?.hasNext ? page + 1 : undefined,
    totalElements: response?.totalElements ?? 0,
  };
}

/** 공유 아카이브를 내 목록에 추가(구독). 멱등이라 중복 호출해도 안전하다. */
export async function subscribeSharedArchive(token: string): Promise<void> {
  await subscribeEndpoint(token, { auth: 'required' });
}
```

```ts
// apps/web/src/features/share/api/queries.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveQueryKeys } from '@/features/archive/api/queries';
import {
  fetchSharedArchive,
  fetchSharedArchivePlaces,
  fetchSharedArchivePosts,
  subscribeSharedArchive,
} from '.';

export const sharedQueryKeys = {
  meta: (token: string) => ['shared', token] as const,
  posts: (token: string) => ['shared', token, 'posts'] as const,
  places: (token: string) => ['shared', token, 'places'] as const,
};

/** 공유 아카이브 메타 — 잘못된/해제된 토큰이면 에러로 떨어진다(화면이 코드별 안내를 그린다). */
export function useSharedArchive(token: string) {
  return useQuery({
    queryKey: sharedQueryKeys.meta(token),
    queryFn: () => fetchSharedArchive(token),
    // 해제·만료 링크는 재시도해도 결과가 같다 — 안내 화면을 바로 보여준다.
    retry: false,
  });
}

export function useSharedArchivePosts(token: string) {
  return useInfiniteQuery({
    queryKey: sharedQueryKeys.posts(token),
    queryFn: ({ pageParam }) => fetchSharedArchivePosts(token, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      posts: data.pages.flatMap((page) => page.posts),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
  });
}

export function useSharedArchivePlaces(token: string) {
  return useInfiniteQuery({
    queryKey: sharedQueryKeys.places(token),
    queryFn: ({ pageParam }) => fetchSharedArchivePlaces(token, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    select: (data) => ({
      places: data.pages.flatMap((page) => page.places),
      totalElements: data.pages[0]?.totalElements ?? 0,
    }),
  });
}

export function useSubscribeSharedArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeSharedArchive,
    // 내 목록에 SHARED 카드가 새로 생긴다 — 프리픽스 무효화로 목록·상세 캐시 갱신.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share src/features/archive`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/features/archive/api/index.ts
git commit -m "feat(share): 공유 아카이브 public 조회·구독 데이터 레이어"
```

---

### Task 3: 로그인 복귀 (returnTo)

`RedirectAuthenticated`가 `/map` 하드코딩 대신 `?returnTo=` 내부 경로로 복귀시킨다.

**Files:**
- Modify: `apps/web/src/features/auth/session/AuthRouteGuards.tsx`
- Test: `apps/web/src/features/auth/session/AuthRouteGuards.test.tsx` (신규)

**Interfaces:**
- Produces: `/login?returnTo=<encodeURIComponent(내부경로)>` 계약 — 로그인 완료 시 그 경로로 replace 이동. 내부 경로(`/`로 시작, `//` 아님)만 허용, 그 외엔 기존 `/map`. Task 6의 로그인 모달이 이 계약을 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// apps/web/src/features/auth/session/AuthRouteGuards.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RedirectAuthenticated } from './AuthRouteGuards';

const holder = vi.hoisted(() => ({ status: 'authenticated' as const }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: holder.status }),
}));

function renderGuard(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<RedirectAuthenticated>로그인 화면</RedirectAuthenticated>} />
        <Route path="/map" element={<div>지도</div>} />
        <Route path="/shared/:token" element={<div>공유 아카이브</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RedirectAuthenticated returnTo', () => {
  it('returnTo 내부 경로가 있으면 그리로 복귀한다', () => {
    renderGuard(`/login?returnTo=${encodeURIComponent('/shared/tok-123')}`);
    expect(screen.getByText('공유 아카이브')).toBeInTheDocument();
  });

  it('returnTo 가 없으면 기존대로 지도로 보낸다', () => {
    renderGuard('/login');
    expect(screen.getByText('지도')).toBeInTheDocument();
  });

  it('외부 URL 성 returnTo(// 시작)는 무시하고 지도로 보낸다', () => {
    renderGuard(`/login?returnTo=${encodeURIComponent('//evil.example')}`);
    expect(screen.getByText('지도')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/auth/session/AuthRouteGuards.test.tsx`
Expected: FAIL — returnTo 미지원이라 첫 케이스가 지도로 감.

- [ ] **Step 3: 구현**

```tsx
import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';

const AUTHENTICATED_ENTRY_PATH = '/map';

/** 오픈 리다이렉트 방지 — 앱 내부 경로만 복귀 대상으로 인정한다. */
function toInternalPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return children;
}

export function RedirectAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();
  const [searchParams] = useSearchParams();

  if (status === 'bootstrapping') return null;
  if (status === 'authenticated') {
    // 공유 화면 등에서 로그인 유도로 들어온 경우 원래 보던 곳으로 돌려보낸다.
    const returnTo = toInternalPath(searchParams.get('returnTo'));
    return <Navigate to={returnTo ?? AUTHENTICATED_ENTRY_PATH} replace />;
  }
  return children;
}

export function AuthEntryRedirect() {
  const { status } = useAuthSession();

  if (status === 'bootstrapping') return null;
  return <Navigate to={status === 'authenticated' ? AUTHENTICATED_ENTRY_PATH : '/login'} replace />;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/auth`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/auth
git commit -m "feat(auth): 로그인 후 returnTo 내부 경로로 복귀"
```

---

### Task 4: 공유 링크 발급 + 공유 시트 (발신)

아카이브 상세 더보기 메뉴의 "아카이브 공유"(TODO 자리)를 복원한다.
발급 → URL 조립 → 웹 UI 드로어에서 링크 복사.

**Files:**
- Modify: `apps/web/src/shared/config/env.ts` (`webOrigin` 추가)
- Create: `apps/web/src/features/share/lib/shareUrl.ts`
- Create: `apps/web/src/features/share/components/ShareSheet.tsx`
- Modify: `apps/web/src/features/archive/api/index.ts` (`issueShareLink` fetcher)
- Modify: `apps/web/src/features/archive/api/queries.ts` (`useIssueShareLink`)
- Modify: `apps/web/src/features/archive/components/ArchiveDetailMenu.tsx` (`onShare` 항목)
- Modify: `apps/web/src/features/archive/ArchiveDetailPage.tsx` (배선)
- Test: `apps/web/src/features/share/lib/shareUrl.test.ts`, 기존 `ArchivePage.test.tsx`에 케이스 추가

**Interfaces:**
- Consumes: 생성 엔드포인트 `issue(groupId, {auth:'required'})` → `GroupShareLinkResponse { token, expiresAt? }`.
- Produces:
  - `env.webOrigin: string` — `VITE_WEB_ORIGIN` 우선, 없으면 `window.location.origin`
  - `buildShareUrl(token: string): string` — `` `${env.webOrigin}/shared/${token}` ``
  - `copyText(text: string): Promise<boolean>`
  - `issueShareLink(archiveId: number): Promise<string>` (token 반환), `useIssueShareLink()`
  - `ShareSheet({ open, onOpenChange, url }: { open: boolean; onOpenChange: (open: boolean) => void; url: string })`
  - `ArchiveDetailMenuProps`에 `onShare: () => void` 추가 (owned 메뉴 필수 항목)

- [ ] **Step 1: 실패하는 테스트 작성 — shareUrl 유틸**

```ts
// apps/web/src/features/share/lib/shareUrl.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/env', () => ({
  env: { webOrigin: 'https://www.everynook.co.kr' },
}));

import { buildShareUrl } from './shareUrl';

describe('buildShareUrl', () => {
  it('웹 오리진 + /shared/{token} 으로 조립한다', () => {
    expect(buildShareUrl('tok-123')).toBe('https://www.everynook.co.kr/shared/tok-123');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/lib/shareUrl.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 유틸 + env 구현**

`env.ts`의 `env` 객체에 추가 (다른 키들 사이, 주석 포함):

```ts
  /**
   * 공유 링크에 쓰는 웹 오리진. 셸 웹뷰에서도 링크는 항상 공개 웹 주소여야 하므로
   * 배포 환경 변수로 고정하고, 미설정 시(로컬 등) 현재 오리진으로 대체한다.
   */
  webOrigin: import.meta.env.VITE_WEB_ORIGIN ?? window.location.origin,
```

```ts
// apps/web/src/features/share/lib/shareUrl.ts
import { env } from '@/shared/config/env';

/** 서버는 token 만 주고 URL 조립은 클라이언트 몫이다 (계약 문서 §1). */
export function buildShareUrl(token: string): string {
  return `${env.webOrigin}/shared/${token}`;
}

/** 복사 성공 여부를 돌려준다 — 실패해도 throw 하지 않고 호출부가 토스트로 알린다. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share/lib/shareUrl.test.ts`
Expected: PASS

- [ ] **Step 5: 실패하는 테스트 작성 — 메뉴에서 공유 열기**

`ArchivePage.test.tsx`의 mocks 객체에 `issueShareLink: vi.fn()`을 추가하고
(`beforeEach`에서 `.mockReset().mockResolvedValue('tok-123')`), describe 안에 케이스 추가:

```tsx
  it('더보기 메뉴의 아카이브 공유는 링크를 발급해 공유 시트를 연다', async () => {
    renderArchiveRoutes('/archive/1');

    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 공유' }));

    await vi.waitFor(() => expect(mocks.issueShareLink).toHaveBeenCalledWith(1));
    // 시트에 조립된 공유 URL 이 보인다.
    expect(await screen.findByText(/\/shared\/tok-123$/)).toBeInTheDocument();
  });
```

- [ ] **Step 6: 실패 확인**

Run: `cd apps/web && pnpm test src/features/archive/ArchivePage.test.tsx`
Expected: FAIL — 메뉴 항목 없음.

- [ ] **Step 7: 발급 fetcher·훅·시트·배선 구현**

`features/archive/api/index.ts`:

```ts
import { issue as issueShareLinkEndpoint } from '@/shared/api'; // 기존 import 블록에 합류

/** 공유 링크 발급 — 활성 링크가 있으면 서버가 같은 token 을 돌려준다(멱등). */
export async function issueShareLink(archiveId: number): Promise<string> {
  const response = unwrapApiResponse(await issueShareLinkEndpoint(archiveId, { auth: 'required' }));
  if (!response?.token) throw new Error('공유 링크를 발급하지 못했어요');
  return response.token;
}
```

`features/archive/api/queries.ts`:

```ts
export function useIssueShareLink() {
  // 발급은 조회 캐시에 영향이 없다 — 응답 token 을 바로 쓴다.
  return useMutation({ mutationFn: issueShareLink });
}
```

`features/share/components/ShareSheet.tsx`:

```tsx
import { copyText } from '@/features/share/lib/shareUrl';
import { useToast } from '@/shared/toast';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 조립이 끝난 공유 URL. 발급 전에는 시트를 열지 않는다. */
  url: string;
}

/** 공유 수단은 우선 링크 복사만 — 카카오/OS 시트는 이 컴포넌트에 항목만 늘리면 된다. */
export function ShareSheet({ open, onOpenChange, url }: ShareSheetProps) {
  const { showToast } = useToast();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="px-4 pt-2 text-b1 font-semibold text-gray-100">
          아카이브 공유
        </DrawerTitle>
        <div className="flex flex-col gap-4 p-4 pb-8">
          <p className="break-all rounded-sm bg-gray-10 p-3 font-mono text-e1 text-gray-80">{url}</p>
          <Button
            size="lg"
            fullWidth
            onClick={async () => {
              const copied = await copyText(url);
              showToast({
                variant: 'simple',
                title: copied ? '링크를 복사했어요' : '링크를 복사하지 못했어요',
              });
              if (copied) onOpenChange(false);
            }}
          >
            링크 복사
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

`ArchiveDetailMenu.tsx` — props에 `onShare: () => void` 추가, TODO 주석 자리를 실제 항목으로 교체:

```ts
    { label: '아카이브 편집', icon: <Icon16Pen />, onSelect: onEdit },
    { label: '아카이브 공유', icon: <Icon16Share />, onSelect: onShare },
    { label: '선택 삭제', icon: <Icon16CheckCircle />, onSelect: onSelectDelete },
    { label: '아카이브 삭제', icon: <Icon16Trash />, onSelect: onDelete, destructive: true },
```

(`Icon16Share`는 `@/shared/icons/NookIcons`에 이미 있다.)

`ArchiveDetailPage.tsx` 배선:

```tsx
const issueShare = useIssueShareLink();
const [shareUrl, setShareUrl] = useState<string | null>(null);
// ...
<ArchiveDetailMenu
  onEdit={...}
  onShare={() =>
    issueShare.mutate(archive.id, {
      onSuccess: (token) => setShareUrl(buildShareUrl(token)),
      onError: () => showToast({ variant: 'simple', title: '공유 링크를 만들지 못했어요' }),
    })
  }
  ...
/>
// JSX 하단 Popup 들 옆:
{shareUrl ? (
  <ShareSheet open onOpenChange={(open) => !open && setShareUrl(null)} url={shareUrl} />
) : null}
```

- [ ] **Step 8: 통과 확인**

Run: `cd apps/web && pnpm test src/features/archive src/features/share`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/features/archive apps/web/src/features/share apps/web/src/shared/config/env.ts
git commit -m "feat(share): 아카이브 공유 링크 발급과 공유 시트"
```

---

### Task 5: 공개 열람 페이지 (`SharedArchivePage`) + 라우트 + 에러 안내

`/shared/:token` — 비로그인 열람. 게시물/장소 탭, 무한 스크롤, 링크 에러 안내.

**Files:**
- Create: `apps/web/src/features/share/SharedArchivePage.tsx`
- Create: `apps/web/src/features/share/lib/shareError.ts`
- Modify: `apps/web/src/app/router.tsx`
- Test: `apps/web/src/features/share/SharedArchivePage.test.tsx`

**Interfaces:**
- Consumes: Task 2의 훅, `PinnedHeaderLayout`, `Header`/`BackButton`/`Button`/`COLOR_BG_CLASS`/`Popup`(`@/shared/ui`), `CollectionCard`(archive), `PlaceCard`(place), `ArchiveEmpty`(archive), `ApiClientError`(`@/shared/api`), `useAuthSession`.
- Produces: 라우트 `/shared/:token`, `shareErrorMessage(error: unknown): string`. Task 6이 이 페이지에 구독 로직을 붙인다 — 이 Task에서는 [아카이브에 저장 +] 버튼을 렌더만 하고 onClick은 Task 6에서 채운다(빈 핸들러 금지: 이 Task에서는 버튼을 disabled로 둔다).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// apps/web/src/features/share/SharedArchivePage.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { ApiClientError } from '@/shared/api';
import { ToastProvider } from '@/shared/toast';
import { SharedArchivePage } from './SharedArchivePage';

const mocks = vi.hoisted(() => ({
  fetchSharedArchive: vi.fn(),
  fetchSharedArchivePosts: vi.fn(),
  fetchSharedArchivePlaces: vi.fn(),
  subscribeSharedArchive: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

const session = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
}));

// 로그인 상태에서만 도는 내 아카이브 목록 조회 — 이 테스트에서는 비어 있으면 된다.
vi.mock('@/features/archive/api', () => ({ fetchArchives: vi.fn().mockResolvedValue([]) }));

const META: Archive = {
  id: 27,
  name: '카페',
  color: 'cement',
  placeCount: 12,
  accessType: 'SHARED',
  owner: { nickname: 'ehoidi' },
  shareToken: 'tok-123',
};

function renderPage(token = 'tok-123') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return render(
    wrapper(
      <MemoryRouter initialEntries={[`/shared/${token}`]}>
        <Routes>
          <Route path="/shared/:token" element={<SharedArchivePage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('SharedArchivePage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchSharedArchive.mockReset().mockResolvedValue(META);
    mocks.fetchSharedArchivePosts.mockReset().mockResolvedValue({
      posts: [{ id: 5, name: '지금 가기 좋은 초록뷰 카페', placeCount: 3 }],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 1,
    });
    mocks.fetchSharedArchivePlaces.mockReset().mockResolvedValue({
      places: [],
      nextPage: undefined,
      totalElements: 0,
    });
    mocks.subscribeSharedArchive.mockReset().mockResolvedValue(undefined);
  });

  it('비로그인으로 아카이브 이름·소유자·게시물 목록을 그린다', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(screen.getByText('by ehoidi')).toBeInTheDocument();
    expect(screen.getByText('지금 가기 좋은 초록뷰 카페')).toBeInTheDocument();
  });

  it('장소 탭으로 전환하면 장소 목록 조회 결과를 그린다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    expect(await screen.findByText('저장한 장소가 없어요')).toBeInTheDocument();
  });

  it('해제된 링크는 코드별 안내 문구를 보여준다', async () => {
    mocks.fetchSharedArchive.mockRejectedValue(
      new ApiClientError('revoked', { kind: 'http', status: 410, code: 'SHARE_LINK_REVOKED' }),
    );
    renderPage();
    expect(await screen.findByText('공유가 해제된 아카이브예요.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/SharedArchivePage.test.tsx`
Expected: FAIL — 페이지 없음.

- [ ] **Step 3: 에러 매핑 + 페이지 + 라우트 구현**

```ts
// apps/web/src/features/share/lib/shareError.ts
import { ApiClientError } from '@/shared/api';

/** 계약 문서 §8 의 권장 안내 문구를 그대로 쓴다. */
const SHARE_ERROR_MESSAGES: Record<string, string> = {
  SHARE_LINK_NOT_FOUND: '유효하지 않은 공유 링크예요.',
  SHARE_LINK_REVOKED: '공유가 해제된 아카이브예요.',
  SHARE_LINK_EXPIRED: '공유 기간이 만료된 아카이브예요.',
  SHARED_GROUP_UNAVAILABLE: '더 이상 볼 수 없는 아카이브예요.',
};

export function shareErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code) {
    const message = SHARE_ERROR_MESSAGES[error.code];
    if (message) return message;
  }
  return '아카이브를 불러오지 못했어요';
}
```

`SharedArchivePage.tsx` — `ArchiveDetailPage`의 열람 골격을 따르되 선택/삭제 없이:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { CollectionCard } from '@/features/archive/components/CollectionCard';
import { PlaceCard } from '@/features/place';
import { cn } from '@/shared/lib/utils';
import { BackButton, Button, COLOR_BG_CLASS, Header } from '@/shared/ui';
import { useSharedArchive, useSharedArchivePlaces, useSharedArchivePosts } from './api/queries';
import { shareErrorMessage } from './lib/shareError';

type DetailTab = 'posts' | 'places';

/**
 * Figma `아카이브 공유 > 공유 아카이브 상세` — 링크로 진입하는 공개 열람 화면.
 * 로그인 없이 동작하며, 저장(구독)·공유 버튼만 로그인 상태를 탄다.
 */
export function SharedArchivePage() {
  const { token = '' } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>('posts');

  const metaQuery = useSharedArchive(token);
  const postsQuery = useSharedArchivePosts(token);
  const placesQuery = useSharedArchivePlaces(token);

  // 무한 스크롤 sentinel — ArchiveDetailPage 와 동일 패턴.
  const activeQuery = activeTab === 'posts' ? postsQuery : placesQuery;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = activeQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (metaQuery.isPending) return null;

  if (metaQuery.isError) {
    return (
      <main
        className="fixed inset-0 flex flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header left={<BackButton />} />
        <ArchiveEmpty message={shareErrorMessage(metaQuery.error)} />
      </main>
    );
  }

  const archive = metaQuery.data;
  const posts = postsQuery.data?.posts;
  const places = placesQuery.data?.places;

  const tabs: { key: DetailTab; label: string; count: number | undefined }[] = [
    { key: 'posts', label: '게시물', count: postsQuery.data?.totalElements },
    { key: 'places', label: '장소', count: placesQuery.data?.totalElements },
  ];

  return (
    <PinnedHeaderLayout
      header={
        <>
          <Header left={<BackButton />} />
          <div className="flex flex-col gap-1 px-4 pt-2 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`size-3 shrink-0 ${COLOR_BG_CLASS[archive.color]}`}
                aria-hidden="true"
              />
              <h1 className="min-w-0 truncate text-h1 font-semibold text-gray-100">
                {archive.name}
              </h1>
            </div>
            {archive.owner ? (
              <p className="font-mono text-e2 text-gray-60">by {archive.owner.nickname}</p>
            ) : null}
          </div>

          {/* 저장(구독)·재공유 — 동작은 다음 Task 에서 붙는다. */}
          <div className="flex gap-2 px-4 pb-4">
            <Button size="sm" variant="secondary" disabled>
              아카이브에 저장 +
            </Button>
            <Button size="sm" variant="secondary" disabled>
              공유
            </Button>
          </div>

          <div role="tablist" className="flex px-4">
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b px-2.5 py-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
                    selected ? 'border-gray-100 text-gray-100' : 'border-gray-20 text-gray-50',
                  )}
                >
                  <span className={cn('text-b2', selected ? 'font-semibold' : 'font-medium')}>
                    {tab.label}
                  </span>
                  {tab.count !== undefined ? (
                    <span className="font-mono text-e2">{tab.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      }
      contentStyle={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <main>
        {activeTab === 'posts' ? (
          posts?.length === 0 ? (
            <ArchiveEmpty message="저장한 게시물이 없어요" />
          ) : (
            <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
              {posts?.map((post) => (
                // TODO(3단계): 공유 게시물 상세(`/shared/:token/post/:id`) 라우트가 생기면 연결한다.
                <CollectionCard key={post.id} archive={post} />
              ))}
            </div>
          )
        ) : places?.length === 0 ? (
          <ArchiveEmpty message="저장한 장소가 없어요" />
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-5 px-4 pt-4">
            {places?.map((place) => (
              // TODO(4단계): 공유 장소 시트(`?placeId=`)가 생기면 연결한다 (비로그인은 로그인 모달).
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      </main>
    </PinnedHeaderLayout>
  );
}
```

`router.tsx` — 공개 라우트 블록(`privacy` 위)에 추가:

```tsx
      // 공유 아카이브 열람 — 링크만 있으면 비로그인도 본다.
      {
        path: 'shared/:token',
        element: <SharedArchivePage />,
      },
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/app/router.tsx
git commit -m "feat(share): 공유 아카이브 공개 열람 페이지와 에러 안내"
```

---

### Task 6: 구독 플로우 — 로그인 게이트 + 아카이브에 저장

> **2026-08-19 개정:** 이 태스크는 원래 전용 `LoginPromptPopup`을 새로 만드는 것으로
> 작성됐었다. 그 사이 main에 병합된 "게스트 모드"(#108)가 정확히 이 문제(계정이 필요한
> 동작에 로그인 유도 UI를 씌우는 것)를 이미 일반화된 형태(`useLoginGate` 훅 +
> `LoginWall`/`EntryLoginWall` 컴포넌트, `@/features/auth/session/useLoginGate`·
> `@/features/auth/components/LoginWall`)로 풀어놨다. 로그인 복귀도 이제
> `returnTo` 쿼리(Task 3, 병합 중 완전히 제거됨)가 아니라 `location.state.from`
> 방식이다(`LoginWall`이 이미 처리). 그래서 아래는 새 컴포넌트를 만들지 않고
> **기존 `useLoginGate`를 그대로 재사용**하도록 다시 썼다. `useArchives()`도
> 같은 병합에서 이미 `useIsAuthenticated` 기반으로 자동 게이팅되므로
> (`enabled: isAuthenticated`), 이 태스크에서 별도로 손댈 필요가 없다.

Task 5의 disabled 버튼에 실제 동작을 붙인다.

**Files:**
- Modify: `apps/web/src/features/share/SharedArchivePage.tsx`
- Test: `apps/web/src/features/share/SharedArchivePage.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: Task 2 `useSubscribeSharedArchive`, Task 4 `buildShareUrl`+`ShareSheet`,
  기존 `useLoginGate()`(`@/features/auth/session/useLoginGate` — `gate(reason, run)`,
  `wall: ReactNode` 반환), 기존 `useArchives()`(`@/features/archive/api/queries` —
  이미 비로그인이면 자동으로 쿼리를 끈다), `useToast`.
- Produces: `SharedArchivePage`의 저장/공유 버튼이 실제로 동작함. 새 컴포넌트나
  새 export는 없다 — 전부 기존 훅 재사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`SharedArchivePage.test.tsx`의 auth mock을 `useIsAuthenticated`까지 포함하도록 확장하고
(`useLoginGate`가 `useAuthSession`이 아니라 `useIsAuthenticated`를 쓴다), Routes에
`<Route path="/login" element={<div>로그인 화면</div>} />`를 추가한 뒤 케이스를 추가한다:

```tsx
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
  useIsAuthenticated: () => session.status === 'authenticated',
}));
```

```tsx
  it('비로그인 저장 탭은 로그인 월을 띄우고, 로그인하기를 누르면 로그인 화면으로 간다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '로그인하기' }));
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  });

  it('로그인 상태의 저장 탭은 구독을 호출하고 완료 토스트를 띄운다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));

    await vi.waitFor(() => expect(mocks.subscribeSharedArchive).toHaveBeenCalledWith('tok-123'));
    expect(await screen.findByText('아카이브에 저장됐어요!')).toBeInTheDocument();
  });
```

또한 로그인 케이스를 위해 `@/features/archive/api` mock의 `fetchArchives`를 홀더로 승격해
케이스별 반환을 바꿀 수 있게 한다 (구독 완료 상태 케이스):

```tsx
  it('이미 내 목록에 있는 아카이브는 저장 버튼이 완료 상태다', async () => {
    session.status = 'authenticated';
    archivesMock.mockResolvedValue([{ ...META, accessType: 'SHARED' }]);
    renderPage();
    expect(await screen.findByRole('button', { name: /저장됨/ })).toBeDisabled();
  });
```

(`archivesMock`은 `vi.hoisted`로 만든 `fetchArchives` mock을 가리키는 이름 — 파일 상단 mock 배선을
그에 맞게 조정한다.)

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/SharedArchivePage.test.tsx`
Expected: FAIL — 버튼이 disabled 라 월이 안 뜬다.

- [ ] **Step 3: 구현**

`SharedArchivePage.tsx` 배선 (Task 5의 disabled 버튼 교체, import 추가):

```tsx
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { useArchives } from '@/features/archive/api/queries';
import { useSubscribeSharedArchive } from './api/queries';
import { buildShareUrl } from './lib/shareUrl';
import { ShareSheet } from './components/ShareSheet';
```

```tsx
const { showToast } = useToast();
const navigate = useNavigate();
const { gate, wall: loginWall } = useLoginGate();
const [shareSheetOpen, setShareSheetOpen] = useState(false);
const subscribe = useSubscribeSharedArchive();

// 저장 완료 판별 — 소유자(OWNED, 자기 링크)와 구독자(SHARED)를 groupId 하나로 커버한다.
// shareToken 매칭은 내 그룹에서 null 이라 쓸 수 없다 (스펙 §7.1).
// useArchives 는 비로그인이면 이미 자동으로 쿼리를 끄므로(가드 병합분) 여기서 따로
// enabled 를 신경 쓸 필요가 없다 — 게스트는 그냥 data 가 undefined 다.
const { data: myArchives } = useArchives();
const alreadySaved = myArchives?.some((item) => item.id === archive.id) ?? false;

const handleSave = () => {
  gate('아카이브 서비스는 로그인이 필요해요', () => {
    subscribe.mutate(token, {
      onSuccess: () =>
        showToast({
          variant: 'action',
          title: '아카이브에 저장됐어요!',
          actionLabel: '보러가기',
          onAction: () => navigate(`/archive/${archive.id}`),
        }),
      onError: () => showToast({ variant: 'simple', title: '아카이브를 저장하지 못했어요' }),
    });
  });
};
```

버튼 줄 (Task 5의 disabled 두 버튼을 교체):

```tsx
<div className="flex gap-2 px-4 pb-4">
  <Button
    size="sm"
    variant="secondary"
    disabled={alreadySaved || subscribe.isPending}
    onClick={handleSave}
  >
    {alreadySaved ? '저장됨 ✓' : '아카이브에 저장 +'}
  </Button>
  <Button size="sm" variant="secondary" onClick={() => setShareSheetOpen(true)}>
    공유
  </Button>
</div>
```

JSX 하단 (`</PinnedHeaderLayout>` 형제로, `useLoginGate`의 `wall`은 엘리먼트라 그냥 끼워 넣는다):

```tsx
{loginWall}
<ShareSheet
  open={shareSheetOpen}
  onOpenChange={setShareSheetOpen}
  url={buildShareUrl(token)}
/>
```

(재공유는 이미 가진 token 으로 URL 만 조립하면 된다 — 발급 API 불필요.)

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share src/features/archive`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share
git commit -m "feat(share): 로그인 게이트 재사용과 공유 아카이브 구독 플로우"
```

---

### Task 7: 아카이브 목록·상세의 SHARED 대응

> **2026-08-19 개정:** 원래 계획은 `ArchiveDetailMenu`의 `onSelectDelete`가 항상 필수
> prop이던 시절, `selectedPlaceIds`/장소용 삭제 팝업이 아직 있던 시절 기준으로 쓰였다.
> 그 사이 main의 다른 PR(#100 "장소 탭에서는 선택 삭제를 없앤다")이 장소 선택삭제
> 자체를 걷어내 `ArchiveDetailPage.tsx`엔 이제 `selectedPostIds` 하나와 삭제 팝업
> 하나만 남았고, `ArchiveDetailMenu.tsx`의 `onSelectDelete`는 **이미 optional**
> (`onSelectDelete?: () => void`, 안 주면 "선택 삭제" 항목 자체가 안 뜬다)이다.
> 또한 게스트 모드(#108) 병합으로 `ArchiveDetailPage.tsx`는 이미 `isAuthenticated`가
> false면 메뉴 전체를 안 그린다(`isAuthenticated ? <ArchiveDetailMenu .../> : null`).
> Task 4가 이미 `onShare: () => void`를 필수 prop으로 메뉴에 추가해뒀다. 아래는 이
> 현재 상태를 기준으로 다시 썼다 — **`onSelectDelete`의 optional 성질은 그대로 유지**하고
> (건드리지 않는다), 인증 게이트 안에서 owned/shared 두 갈래로만 더 나눈다.
> 테스트에 대한 참고: `ArchivePage.test.tsx`는 세션 프로바이더/mock이 전혀 없고,
> `useIsAuthenticated()`는 프로바이더가 없으면 의도적으로 `true`(인증됨)로 폴백하도록
> 설계돼 있다(`AuthSessionProvider.tsx`의 문서화된 동작) — 그래서 이 테스트 파일은
> 새로 인증 mock을 추가할 필요가 없다.

내 목록에 섞여 내려오는 SHARED 아카이브 — 카드 owner 표시, 읽기 전용 상세, 구독 해제.

**Files:**
- Modify: `apps/web/src/features/archive/components/ArchiveCard.tsx` (owner 줄)
- Modify: `apps/web/src/features/archive/components/ArchiveDetailMenu.tsx` (kind 분기 — `onSelectDelete` optional 성질은 유지)
- Modify: `apps/web/src/features/archive/api/index.ts` + `queries.ts` (`removeSharedArchive`)
- Modify: `apps/web/src/features/archive/ArchiveDetailPage.tsx`
- Test: `apps/web/src/features/archive/ArchivePage.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: Task 1의 `Archive.accessType`/`owner`, 생성 엔드포인트 `unsubscribe(groupId, {auth:'required'})`,
  현재 `ArchiveDetailMenuProps`(`{ onEdit; onShare; onSelectDelete?; onDelete }`, Task 4가 만듦).
- Produces:
  - `removeSharedArchive(archiveId: number): Promise<void>`, `useRemoveSharedArchive()`
  - `ArchiveDetailMenu` props 를 discriminated union 으로 교체:
    `{ kind: 'owned'; onEdit; onShare; onSelectDelete?; onDelete } | { kind: 'shared'; onRemove: () => void }`
    (`onSelectDelete` 는 owned 변형 안에서도 여전히 optional — 장소 탭 조건부 노출은 그대로다.)

- [ ] **Step 1: 실패하는 테스트 작성**

`ArchivePage.test.tsx`의 `ARCHIVES` 픽스처에 SHARED 항목 추가:

```tsx
  {
    id: 3,
    name: '지우랑 놀러가고 싶은 곳',
    color: 'cement',
    placeCount: 12,
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
    shareToken: 'tok-123',
  },
```

mocks 객체에 `removeSharedArchive: vi.fn()` 추가 (beforeEach에서 reset + resolve), 케이스 추가:

```tsx
  it('공유받은 아카이브 카드는 소유자 닉네임을 보여준다', async () => {
    renderArchiveRoutes('/archive');
    expect(await screen.findByText('by ehoidi')).toBeInTheDocument();
  });

  it('공유받은 아카이브 상세 메뉴는 제거만 제공하고, 제거하면 구독 해제를 호출한다', async () => {
    renderArchiveRoutes('/archive/3');

    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    expect(screen.queryByRole('menuitem', { name: '아카이브 편집' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: '내 목록에서 제거' }));
    fireEvent.click(screen.getByRole('button', { name: '제거하기' }));

    await vi.waitFor(() => expect(mocks.removeSharedArchive).toHaveBeenCalledWith(3));
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/archive/ArchivePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: 구현**

`ArchiveCard.tsx` — 이름 줄 아래 owner 줄 추가 (이름 `<span>` 블록과 `Badge` 사이가 아니라
카드 컬럼에 한 줄 추가):

```tsx
      {archive.accessType === 'SHARED' && archive.owner ? (
        <span className="flex items-center gap-1 font-mono text-e2 text-gray-60">
          {archive.owner.profileImageUrl ? (
            <img
              src={archive.owner.profileImageUrl}
              alt=""
              className="size-4 shrink-0 rounded-full object-cover"
            />
          ) : null}
          by {archive.owner.nickname}
        </span>
      ) : null}
```

`api/index.ts`:

```ts
import { unsubscribe as unsubscribeEndpoint } from '@/shared/api'; // 기존 import 블록에 합류

/** 내 목록에서 공유 아카이브 제거 — 내 구독만 사라지고 공유자 원본에는 영향 없다. */
export async function removeSharedArchive(archiveId: number): Promise<void> {
  await unsubscribeEndpoint(archiveId, { auth: 'required' });
}
```

`queries.ts`:

```ts
export function useRemoveSharedArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeSharedArchive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list }),
  });
}
```

`ArchiveDetailMenu.tsx` — props 를 union 으로 (현재 파일은 `onEdit`/`onShare`/`onSelectDelete?`/`onDelete`
플랫 인터페이스다 — `onSelectDelete`의 optional 성질을 그대로 옮긴다):

```ts
export type ArchiveDetailMenuProps =
  | {
      kind: 'owned';
      onEdit: () => void;
      onShare: () => void;
      /**
       * 선택 삭제 — 게시물 다중 선택 모드로 전환한다.
       * 넘기지 않으면 항목 자체가 빠진다(장소 탭처럼 지울 수 없는 화면).
       */
      onSelectDelete?: () => void;
      onDelete: () => void;
    }
  | {
      /** 공유받은(SHARED) 아카이브 — 읽기 전용이라 제거만 가능하다. */
      kind: 'shared';
      onRemove: () => void;
    };
```

컴포넌트 시그니처를 `function ArchiveDetailMenu(props: ArchiveDetailMenuProps)`로 바꾸고
(구조분해 대신 `props.kind`로 분기해야 하므로), `items` 계산을 분기로:

```ts
  const items: MenuItem[] =
    props.kind === 'owned'
      ? [
          { label: '아카이브 편집', icon: <Icon16Pen />, onSelect: props.onEdit },
          { label: '아카이브 공유', icon: <Icon16Share />, onSelect: props.onShare },
          ...(props.onSelectDelete
            ? [{ label: '선택 삭제', icon: <Icon16CheckCircle />, onSelect: props.onSelectDelete }]
            : []),
          { label: '아카이브 삭제', icon: <Icon16Trash />, onSelect: props.onDelete, destructive: true },
        ]
      : [{ label: '내 목록에서 제거', icon: <Icon16Trash />, onSelect: props.onRemove, destructive: true }];
```

`ArchiveDetailPage.tsx` — 기존 `isAuthenticated`/`issueShare`/`shareUrl` 상태는 그대로 두고 추가:

```tsx
const isShared = archive.accessType === 'SHARED'; // isPending/!archive 이후, archive 가 확정된 자리에 둔다
const removeShared = useRemoveSharedArchive();
const [removePopupOpen, setRemovePopupOpen] = useState(false);
```

- 메뉴 자리(기존 `isAuthenticated ? <ArchiveDetailMenu ...> : null`)를 이렇게 바꾼다 —
  인증 게이트는 그대로 바깥에 두고, 그 안에서 owned/shared 두 갈래로 나눈다:

```tsx
right={
  isAuthenticated ? (
    isShared ? (
      <ArchiveDetailMenu kind="shared" onRemove={() => setRemovePopupOpen(true)} />
    ) : (
      <ArchiveDetailMenu
        kind="owned"
        onEdit={() => navigate(`/archive/${archive.id}/edit`)}
        onShare={() =>
          issueShare.mutate(archive.id, {
            onSuccess: (token) => setShareUrl(buildShareUrl(token)),
            onError: () => showToast({ variant: 'simple', title: '공유 링크를 만들지 못했어요' }),
          })
        }
        onSelectDelete={activeTab === 'posts' ? () => setSelecting(true) : undefined}
        onDelete={() => setDeletePopupOpen(true)}
      />
    )
  ) : null
}
```

- 제거 확인 팝업 (기존 삭제 팝업들 옆):

```tsx
<Popup
  open={removePopupOpen}
  onClose={() => setRemovePopupOpen(false)}
  title="내 목록에서 제거하시겠어요?"
  description={
    <>
      공유받은 아카이브가 내 목록에서 사라져요.
      <br />
      원본에는 영향이 없어요.
    </>
  }
  confirmLabel="제거하기"
  variant="warning"
  onConfirm={() =>
    removeShared.mutate(archive.id, {
      onSuccess: () => {
        navigate('/archive', { replace: true });
        showToast({ variant: 'simple', title: `"${archive.name}" 아카이브를 제거했어요.` });
      },
      onError: () => showToast({ variant: 'simple', title: '아카이브를 제거하지 못했어요' }),
    })
  }
/>
```

- SHARED 상세의 카드 탭 분기 — 현재 게시물 카드의 `onClick`(`selecting` 삼항)을 감싼다.
  SHARED 는 `onSelectDelete`가 아예 없어 `selecting`이 절대 `true`가 될 수 없지만, 명시적으로
  최상위에서 막아 의도를 분명히 한다:

```tsx
                onClick={
                  isShared
                    ? undefined
                    : // TODO(3단계): 공유 상세(`/shared/{shareToken}/post/{id}`)로 연결한다 — 기존
                      // `/post/{id}`는 소유 데이터 전용이라 공유 게시물에선 404 다.
                      selecting
                      ? () => togglePostSelected(post.id)
                      : () => navigate(`/post/${post.id}`)
                }
```

  장소 카드도 동일하게:

```tsx
                onClick={
                  isShared
                    ? undefined
                    : // TODO(4단계): 공유 장소 시트(`?placeId=`)가 생기면 연결한다.
                      () => navigate(`/map?placeId=${place.id}`)
                }
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/archive src/features/share`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/archive
git commit -m "feat(archive): 공유받은 아카이브의 목록 표시·읽기 전용 상세·구독 해제"
```

---

### Task 8: "앱에서 보기" 딥링크 — 웹 배너 + 모바일 화이트리스트

**Files:**
- Create: `apps/web/src/features/share/lib/appLink.ts`
- Create: `apps/web/src/features/share/components/OpenInAppBanner.tsx`
- Modify: `apps/web/src/features/share/SharedArchivePage.tsx` (배너 삽입)
- Modify: `apps/mobile/src/webview/appLink.ts`
- Test: `apps/mobile/src/webview/appLink.test.ts` (케이스 추가), `apps/web/src/features/share/lib/appLink.test.ts`

**Interfaces:**
- Consumes: `nativeBridge.platform`(`@/native-bridge`), 모바일 `resolveAppLinkWebUrl(appLink, webBaseUrl)`.
- Produces:
  - 웹 `buildAppSharedLink(token: string): string` → `` `kr.co.everynook.app://shared/${token}` ``
  - 모바일: `kr.co.everynook.app://shared/{token}` → `${webBaseUrl}/shared/{token}` 변환 규칙

- [ ] **Step 1: 실패하는 테스트 작성 — 모바일 화이트리스트**

`apps/mobile/src/webview/appLink.test.ts`에 케이스 추가:

```ts
  it('공유 아카이브 딥링크를 웹 공유 화면으로 변환한다', () => {
    expect(resolveAppLinkWebUrl('kr.co.everynook.app://shared/tok_A1-b2', WEB_URL)).toBe(
      `${WEB_URL}/shared/tok_A1-b2`,
    );
  });

  it.each([
    'kr.co.everynook.app://shared/tok/extra',
    'kr.co.everynook.app://shared/한글토큰',
    'kr.co.everynook.app://shared/tok?x=1',
  ])('형식이 다른 공유 딥링크는 거부한다: %s', (value) => {
    expect(resolveAppLinkWebUrl(value, WEB_URL)).toBeNull();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/mobile && pnpm test src/webview/appLink.test.ts`
Expected: FAIL

- [ ] **Step 3: 모바일 규칙 구현**

`apps/mobile/src/webview/appLink.ts` — `POST_ID` 아래에 토큰 형식 추가:

```ts
// 공유 토큰은 서버가 url-safe 문자로만 발급한다 — 그 외 문자는 위조로 보고 거른다.
const SHARE_TOKEN = /^[A-Za-z0-9_-]+$/;
```

분기 추가 (`post` 분기 아래):

```ts
  } else if (segments.length === 2 && segments[0] === 'shared' && SHARE_TOKEN.test(segments[1])) {
    // 공유 링크의 "앱에서 보기" 진입 — 웹의 공개 공유 화면을 그대로 연다.
    webPath = `/shared/${segments[1]}`;
  }
```

- [ ] **Step 4: 모바일 테스트 통과 확인**

Run: `cd apps/mobile && pnpm test src/webview/appLink.test.ts`
Expected: PASS

- [ ] **Step 5: 실패하는 테스트 작성 — 웹 유틸**

```ts
// apps/web/src/features/share/lib/appLink.test.ts
import { describe, expect, it } from 'vitest';
import { buildAppSharedLink } from './appLink';

describe('buildAppSharedLink', () => {
  it('본앱 스킴의 공유 딥링크를 만든다', () => {
    expect(buildAppSharedLink('tok-123')).toBe('kr.co.everynook.app://shared/tok-123');
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/lib/appLink.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 7: 웹 유틸 + 배너 구현**

```ts
// apps/web/src/features/share/lib/appLink.ts
/** 본앱 커스텀 스킴 — apps/mobile 의 appLink.ts 화이트리스트와 짝이다. */
const APP_SCHEME = 'kr.co.everynook.app';

export function buildAppSharedLink(token: string): string {
  return `${APP_SCHEME}://shared/${token}`;
}
```

```tsx
// apps/web/src/features/share/components/OpenInAppBanner.tsx
import { nativeBridge } from '@/native-bridge';
import { useToast } from '@/shared/toast';
import { Button } from '@/shared/ui';
import { buildAppSharedLink } from '../lib/appLink';

/** 앱 미설치 판별 타이머 — 스킴 이동이 성공하면 탭이 백그라운드로 빠져 문서가 숨는다. */
const OPEN_TIMEOUT_MS = 1500;

interface OpenInAppBannerProps {
  token: string;
}

/**
 * 브라우저에서 공유 페이지를 열었을 때만 노출 — 셸 웹뷰(ios/android)에선 이미 앱 안이다.
 * 스토어 폴백 링크는 앱 등록 후 이 컴포넌트에 추가한다.
 */
export function OpenInAppBanner({ token }: OpenInAppBannerProps) {
  const { showToast } = useToast();

  if (nativeBridge.platform !== 'web') return null;

  return (
    <div className="flex items-center justify-between gap-2 bg-gray-10 px-4 py-2">
      <span className="text-b2 text-gray-80">nook 앱에서 보기</span>
      <Button
        size="sm"
        onClick={() => {
          window.location.href = buildAppSharedLink(token);
          setTimeout(() => {
            if (!document.hidden) {
              showToast({ variant: 'simple', title: '앱이 설치되어 있지 않아요' });
            }
          }, OPEN_TIMEOUT_MS);
        }}
      >
        열기
      </Button>
    </div>
  );
}
```

`SharedArchivePage.tsx` — `PinnedHeaderLayout`의 `header` 최상단(뒤로가기 `Header` 위)에
`<OpenInAppBanner token={token} />` 삽입.

- [ ] **Step 8: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share && cd ../mobile && pnpm test src/webview`
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/features/share apps/mobile/src/webview
git commit -m "feat(share): 공유 페이지 앱에서 보기 딥링크"
```

---

## 마무리 체크 (전체 태스크 후)

- [ ] 저장소 루트에서 `pnpm typecheck` / `cd apps/web && pnpm test` / `cd apps/mobile && pnpm test` 전부 그린 확인
- [ ] 시각 QA는 jade 가 직접 (기존 합의) — dev 서버로 `/shared/{실토큰}` 열람·발급·구독 흐름 확인
- [ ] PR 은 jade 가 diff 확인할 시간을 갖은 뒤 오픈 (기존 합의)
