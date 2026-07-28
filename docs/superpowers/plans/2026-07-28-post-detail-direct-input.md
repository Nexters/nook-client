# 게시물 상세 — 연관 장소 예외 처리 + 직접 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게시물 상세(`/post/:postId`)에서 연관 장소 파싱 API의 로딩/에러 상태를 처리하고, 로딩이 끝나면(성공/실패 모두) "찾는 장소가 없으신가요? 직접 추가" 배너를 노출하며, 배너를 누르면 장소를 직접 검색해 넣는 바텀시트(초기 뷰 + 검색 결과 뷰)를 띄운다.

**Architecture:** 연관 장소는 게시물 상세와 별도로 비동기 응답하는 API라는 전제 하에, `useRelatedPlaces` 훅이 `{status:'loading'|'success'|'error'}` 상태를 관리한다. `PostDetailPage`는 이 상태를 `RelatedPlacesSection`(로딩 문구 / 장소 목록 / 배너)에 넘기고, 에러일 때만 별도로 하단 `Snackbar` 토스트를 띄운다. 배너 클릭은 `PlaceDirectInputDrawer`(검색 인풋 + 결과 목록)를 연다. 실제 API가 아직 없으므로 모든 데이터는 `postId` 별로 분기하는 mock 함수로 흉내내고, `TODO(api)` 주석으로 교체 지점을 표시한다(기존 `mock/posts.ts` 컨벤션을 따른다).

**Tech Stack:** React 19 + TypeScript, react-router-dom v7, Tailwind v4(`@theme` 토큰), vaul(Drawer), vitest + @testing-library/react.

## Global Constraints

- 실제 연관 장소 API는 아직 없다 — 모든 신규 로직은 mock 함수로 구현하고 `// TODO(api): ...` 주석으로 교체 지점을 남긴다(기존 `getMockPostDetail` 컨벤션과 동일).
- 새 UI는 반드시 `apps/web/src/shared/ui`의 기존 프리미티브(`Drawer`, `Snackbar`, `Button` 등)와 `@/shared/icons/NookIcons`의 아이콘만 쓴다. 새 디자인 시스템 컴포넌트를 만들지 않는다.
- 새 아이콘이 필요하면 `packages/icons/src/*.svg`에 소스를 추가하고 `pnpm icons:generate`로 생성한다 — `apps/web/src/shared/icons/NookIcons.tsx`를 직접 손으로 고치지 않는다(파일 상단에 "Do not edit directly" 명시됨). `pnpm typecheck`가 `icons:check`를 포함하므로 생성 파일이 최신이 아니면 타입체크가 실패한다.
- "이후 장소 리스트를 클릭했을 때 나오는 화면"은 이번 범위가 아니다 — 검색 결과 행은 표시만 하고 `onClick`을 달지 않는다.
- 색상/타이포는 전부 기존 `@theme` 토큰 클래스(`text-b1/b2/b3`, `text-gray-NN`, `text-nook-blue`, `border-nook-blue/80` 등)를 쓴다. 임의 hex 값을 새로 넣지 않는다.
- 커밋마다 `pnpm --filter web typecheck`와 `pnpm --filter web test -- run <test file>`(혹은 전체 `pnpm --filter web test`)이 통과해야 한다.

---

## Task 1: 아이콘 2종 추가 — `exclamation-circle`, `magnifying-glass`

Figma에서 실제 벡터를 다운로드해 확보한 값이다(추측 X). `packages/icons/generate.mjs`는 소스 SVG의 `<path>`/`<circle>` 태그만 읽으므로 그대로 넣으면 된다.

**Files:**
- Create: `packages/icons/src/16_exclamation_circle.svg`
- Create: `packages/icons/src/18_magnifying_glass.svg`
- Generated (하지 말고 커맨드로만 갱신): `apps/web/src/shared/icons/NookIcons.tsx`, `apps/mobile/targets/share-target/NookIcons.generated.swift`, `apps/mobile/modules/share-target/android/src/main/java/com/nook/app/share/ui/NookIcons.generated.kt`

**Interfaces:**
- Produces: `Icon16ExclamationCircle`, `Icon18MagnifyingGlass` — `apps/web/src/shared/icons/NookIcons.tsx`에서 export되는 `({ size, width, height, ...props }: NookIconProps) => JSX.Element` 컴포넌트. 이후 태스크에서 `import { Icon16ExclamationCircle, Icon18MagnifyingGlass } from '@/shared/icons/NookIcons'`로 사용한다.

- [ ] **Step 1: 아이콘 소스 SVG 추가**

`packages/icons/src/16_exclamation_circle.svg`:
```svg
<svg width="16.25" height="16.25" viewBox="0 0 16.25 16.25" fill="none" xmlns="http://www.w3.org/2000/svg">
<title>16 exclamation circle</title>
<path d="M8.125 5.625V8.75M15.625 8.125C15.625 9.10991 15.431 10.0852 15.0541 10.9951C14.6772 11.9051 14.1247 12.7319 13.4283 13.4283C12.7319 14.1247 11.9051 14.6772 10.9951 15.0541C10.0852 15.431 9.10991 15.625 8.125 15.625C7.14009 15.625 6.16482 15.431 5.25487 15.0541C4.34493 14.6772 3.51814 14.1247 2.8217 13.4283C2.12526 12.7319 1.57281 11.9051 1.1959 10.9951C0.818993 10.0852 0.625 9.10991 0.625 8.125C0.625 6.13588 1.41518 4.22822 2.8217 2.8217C4.22822 1.41518 6.13588 0.625 8.125 0.625C10.1141 0.625 12.0218 1.41518 13.4283 2.8217C14.8348 4.22822 15.625 6.13588 15.625 8.125ZM8.125 11.25H8.13167V11.2567H8.125V11.25Z" stroke="#4E5662" stroke-width="1.25" stroke-linecap="round"/>
</svg>
```

`packages/icons/src/18_magnifying_glass.svg`:
```svg
<svg width="18.0289" height="18.0274" viewBox="0 0 18.0289 18.0274" fill="none" xmlns="http://www.w3.org/2000/svg">
<title>18 magnifying glass</title>
<path fill-rule="evenodd" d="M11.9484 13.5384C10.4255 14.6603 8.53489 15.1653 6.65538 14.9523C4.77588 14.7393 3.04628 13.8239 1.81308 12.3897C0.57988 10.9554 -0.0658291 9.10813 0.00531084 7.21793C0.0764507 5.32774 0.859186 3.53422 2.1967 2.1967C3.53422 0.859186 5.32773 0.0764507 7.21793 0.00531084C9.10813 -0.0658291 10.9554 0.57988 12.3897 1.81308C13.8239 3.04628 14.7393 4.77588 14.9523 6.65539C15.1653 8.53489 14.6603 10.4255 13.5384 11.9484L17.6709 16.0794C17.7814 16.1824 17.8701 16.3066 17.9316 16.4446C17.993 16.5826 18.0261 16.7315 18.0288 16.8826C18.0314 17.0337 18.0036 17.1837 17.9471 17.3238C17.8905 17.4639 17.8063 17.5911 17.6994 17.6979C17.5926 17.8048 17.4654 17.889 17.3253 17.9456C17.1852 18.0021 17.0352 18.0299 16.8841 18.0273C16.733 18.0246 16.5841 17.9915 16.4461 17.9301C16.3081 17.8686 16.1839 17.7799 16.0809 17.6694L11.9484 13.5384ZM12.7509 7.49938C12.7509 8.89177 12.1978 10.2271 11.2132 11.2117C10.2286 12.1963 8.89327 12.7494 7.50088 12.7494C6.10849 12.7494 4.77313 12.1963 3.78857 11.2117C2.804 10.2271 2.25088 8.89177 2.25088 7.49938C2.25088 6.10699 2.804 4.77163 3.78857 3.78707C4.77313 2.8025 6.10849 2.24938 7.50088 2.24938C8.89327 2.24938 10.2286 2.8025 11.2132 3.78707C12.1978 4.77163 12.7509 6.10699 12.7509 7.49938Z" fill="#848B96"/>
</svg>
```

- [ ] **Step 2: 아이콘 코드 생성**

Run: `pnpm icons:generate`

이 명령이 `apps/web/src/shared/icons/NookIcons.tsx`(그리고 iOS/Android 생성 파일)를 갱신한다. `git diff apps/web/src/shared/icons/NookIcons.tsx`로 `Icon16ExclamationCircle`, `Icon18MagnifyingGlass` 두 함수가 알파벳 순서(파일 목록은 `readdir` 결과를 `.sort()`한 순서)로 추가됐는지 확인한다.

- [ ] **Step 3: 생성 결과 검증**

Run: `pnpm icons:check`
Expected: `Checked <N> icons.` (에러 없이 통과)

- [ ] **Step 4: Commit**

```bash
git add packages/icons/src/16_exclamation_circle.svg packages/icons/src/18_magnifying_glass.svg \
  apps/web/src/shared/icons/NookIcons.tsx \
  apps/mobile/targets/share-target/NookIcons.generated.swift \
  apps/mobile/modules/share-target/android/src/main/java/com/nook/app/share/ui/NookIcons.generated.kt
git commit -m "feat(icons): 느낌표 원형, 돋보기 아이콘 추가"
```

---

## Task 2: `useRelatedPlaces` 훅 + 연관 장소 mock

**Files:**
- Create: `apps/web/src/features/post/mock/relatedPlaces.ts`
- Create: `apps/web/src/features/post/hooks/useRelatedPlaces.ts`
- Test: `apps/web/src/features/post/hooks/useRelatedPlaces.test.ts`
- Modify: `apps/web/src/features/post/mock/posts.ts:22-99` (아래 Task 3 Step 1에서 `relatedPlaces` 필드 제거 — 이 태스크에서는 새 파일만 추가하고 기존 파일은 건드리지 않는다)

**Interfaces:**
- Produces:
  - `export type RelatedPlacesResult = { status: 'success'; places: Place[] } | { status: 'error' }` — `mock/relatedPlaces.ts`
  - `export function getMockRelatedPlaces(postId: string | undefined): Promise<RelatedPlacesResult>` — `mock/relatedPlaces.ts`
  - `export type RelatedPlacesState = { status: 'loading' } | { status: 'success'; places: Place[] } | { status: 'error' }` — `hooks/useRelatedPlaces.ts`
  - `export function useRelatedPlaces(postId: string | undefined): RelatedPlacesState` — `hooks/useRelatedPlaces.ts`
- Consumes: `Place` type from `@/features/place`.

- [ ] **Step 1: mock 함수 작성**

`apps/web/src/features/post/mock/relatedPlaces.ts`:
```ts
import type { Place } from '../../place/types';

/**
 * 연관 장소는 게시물 상세와 별도로 파싱되는 API 결과라는 전제로 만든 목데이터.
 * API 스펙 확정 시 이 파일의 `getMockRelatedPlaces` 호출부를 `features/post/api.ts` 의
 * 실제 쿼리로 교체한다.
 */

function placeholder(hex: string, width: number, height: number) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`,
  )}`;
}

export type RelatedPlacesResult = { status: 'success'; places: Place[] } | { status: 'error' };

/** 실제 파싱 API 의 응답 지연을 흉내내는 값. 테스트에서는 `waitFor` 로 기다린다. */
const MOCK_DELAY_MS = 300;

const MOCK_RESULTS: Record<string, RelatedPlacesResult> = {
  'post-1': {
    status: 'success',
    places: [
      {
        id: 'place-1',
        name: '아이소',
        category: '카페',
        distance: '16.2km',
        address: '경기 용인시 처인구 양지읍 은이로 72',
        thumbnail: placeholder('#b4bdc9', 64, 64),
      },
      {
        id: 'place-2',
        name: '퍼머넌트해비탯',
        category: '카페',
        distance: '16.2km',
        address: '경기 용인시 처인구 양지읍 은이로 72',
        thumbnail: placeholder('#d7dce3', 64, 64),
      },
      {
        id: 'place-3',
        // 썸네일이 없으면 `PlaceRow` 가 시안 `Image_x` 로 떨어진다.
        name: '탐석과 사랑',
        category: '카페',
        distance: '16.2km',
        address: '경기 용인시 처인구 양지읍 은이로 72',
      },
    ],
  },
  // 시안 `연관 장소 X` — 파싱은 성공했지만 매칭된 장소가 없는 게시물.
  'post-2': { status: 'success', places: [] },
  // 시안 `게시물 상세_직접 입력` 실패 케이스 — 파싱 자체가 실패한 게시물.
  'post-3': { status: 'error' },
};

export function getMockRelatedPlaces(postId: string | undefined): Promise<RelatedPlacesResult> {
  const result: RelatedPlacesResult = (postId && MOCK_RESULTS[postId]) || { status: 'error' };
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), MOCK_DELAY_MS);
  });
}
```

- [ ] **Step 2: 훅의 실패하는 테스트 작성**

`apps/web/src/features/post/hooks/useRelatedPlaces.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRelatedPlaces } from './useRelatedPlaces';

describe('useRelatedPlaces', () => {
  it('로딩 후 매칭된 장소 목록을 성공으로 반환한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-1'));

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.places.map((place) => place.name)).toContain('아이소');
    }
  });

  it('매칭된 장소가 없으면 빈 목록으로 성공한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-2'));

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current).toEqual({ status: 'success', places: [] });
  });

  it('파싱이 실패하면 에러 상태를 반환한다', async () => {
    const { result } = renderHook(() => useRelatedPlaces('post-3'));

    await waitFor(() => expect(result.current.status).not.toBe('loading'));

    expect(result.current).toEqual({ status: 'error' });
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/hooks/useRelatedPlaces.test.ts`
Expected: FAIL — `Cannot find module './useRelatedPlaces'` (아직 훅 파일이 없음)

- [ ] **Step 4: 훅 구현**

`apps/web/src/features/post/hooks/useRelatedPlaces.ts`:
```ts
import { useEffect, useState } from 'react';
import type { Place } from '@/features/place';
import { getMockRelatedPlaces } from '../mock/relatedPlaces';

export type RelatedPlacesState =
  | { status: 'loading' }
  | { status: 'success'; places: Place[] }
  | { status: 'error' };

/**
 * 연관 장소는 게시물 상세와 별도로 파싱되는 API 라 훅을 분리했다.
 * API 스펙 확정 시 `getMockRelatedPlaces` 호출부만 실제 쿼리로 교체한다.
 */
export function useRelatedPlaces(postId: string | undefined): RelatedPlacesState {
  const [state, setState] = useState<RelatedPlacesState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getMockRelatedPlaces(postId).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return state;
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/hooks/useRelatedPlaces.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/post/mock/relatedPlaces.ts apps/web/src/features/post/hooks/useRelatedPlaces.ts apps/web/src/features/post/hooks/useRelatedPlaces.test.ts
git commit -m "feat(post): 연관 장소 로딩/성공/에러 상태를 관리하는 useRelatedPlaces 훅 추가"
```

---

## Task 3: `RelatedPlacesSection` 컴포넌트 + `PostDetailPage` 연동 + 에러 스낵바

**Files:**
- Create: `apps/web/src/features/post/components/RelatedPlacesSection.tsx`
- Modify: `apps/web/src/features/post/mock/posts.ts` (전체 — `relatedPlaces`/`RELATED_PLACES` 제거, `post-3` 목데이터 추가)
- Modify: `apps/web/src/features/post/PostDetailPage.tsx:1-148`
- Modify: `apps/web/src/features/post/PostDetailPage.test.tsx` (전체)

**Interfaces:**
- Consumes: `useRelatedPlaces(postId): RelatedPlacesState`(Task 2), `Place`(`@/features/place`), `PlaceRow`(`@/features/place`), `Icon16ExclamationCircle`(`@/shared/icons/NookIcons`, Task 1), `Snackbar`(`@/shared/ui`).
- Produces: `RelatedPlacesSection({ state, bookmarkedPlaceIds, onBookmarkedChange, onDirectAddClick })` — `onBookmarkedChange: (placeId: string, next: boolean) => void`, `onDirectAddClick: () => void`. `PostDetailPage`가 소유하는 `directInputOpen` 상태(Task 4에서 `PlaceDirectInputDrawer`에 연결)를 이 콜백으로 연다.

- [ ] **Step 1: `mock/posts.ts`에서 `relatedPlaces` 제거 + `post-3` 추가**

`apps/web/src/features/post/mock/posts.ts` 전체를 아래 내용으로 교체한다(연관 장소는 이제 `mock/relatedPlaces.ts`가 담당하므로 `RELATED_PLACES` 상수와 `PostDetail.relatedPlaces` 필드를 제거하고, 에러 케이스 데모용 `post-3`을 추가한다):

```ts
import type { GroupColor } from '@/shared/ui';
import type { Post } from '../types';

/**
 * 게시물 상세 목데이터. **API 스펙 확정 시 `features/post/api.ts` + TanStack Query 로
 * 교체한다** — 화면은 `getMockPostDetail` 하나만 부르므로 교체 지점이 그 함수다.
 *
 * 연관 장소는 별도 API(`mock/relatedPlaces.ts` → `getMockRelatedPlaces`)가 담당한다.
 */

/** 이미지 API 연동 전까지 쓰는 단색 플레이스홀더. */
function placeholder(hex: string, width: number, height: number) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`,
  )}`;
}

const IMAGE_A = placeholder('#c3cbd6', 281, 300);
const IMAGE_B = placeholder('#b4bdc9', 281, 300);
const IMAGE_C = placeholder('#d7dce3', 281, 300);
const IMAGE_D = placeholder('#cfd5dd', 281, 300);

/** 게시물 상세가 한 화면에 필요로 하는 묶음 — 게시물 + 저장된 그룹. */
export interface PostDetail {
  post: Post;
  title: string;
  groupName: string;
  groupColor: GroupColor;
  memo?: string;
  /** 이미 즐겨찾기한 연관 장소 id — 시안의 파란 북마크 상태. 연관 장소 목록 자체는 별도 API 다. */
  bookmarkedPlaceIds: string[];
}

const MOCK_POST_DETAILS: Record<string, PostDetail> = {
  'post-1': {
    title: '지금 가기 좋은 초록뷰 카페',
    groupName: '카페',
    groupColor: 'yellow',
    memo: '지우랑 가면 좋겠다',
    // 시안: 앞의 두 장소만 파란 북마크(저장됨) — place-1, place-2 는 mock/relatedPlaces.ts 참고.
    bookmarkedPlaceIds: ['place-1', 'place-2'],
    post: {
      id: 'post-1',
      authorHandle: '@nook.official on instagram',
      caption:
        '초록뷰가 아름다운 카페 공간 아직 4월 말인데도 여름이 벌써 코앞에 있는 것 같아요. 더운 건 힘들지만, 녹색 빛 가득한 풍경을 떠올리면 왜인지 좋았던 것 같기도…👀 우선 더위는 잠시 뒤로 하고, 푸르게 물든 자연 속에서 힐링부터 즐겨요!\n\n#숲뷰 #카페추천 #서울근교카페 #숲속카페',
      images: [IMAGE_A, IMAGE_B, IMAGE_C, IMAGE_D],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `연관 장소 X` — 파싱은 성공했지만 연결된 장소가 없는 게시물.
  'post-2': {
    title: '몰래 가려고 저장해둔 서울 카페',
    groupName: '카페',
    groupColor: 'yellow',
    bookmarkedPlaceIds: [],
    post: {
      id: 'post-2',
      authorHandle: '@nook.official on instagram',
      caption: '조용히 혼자 가고 싶은 서울 카페들을 모아뒀어요. 주말 오전이 가장 한산합니다.',
      images: [IMAGE_B, IMAGE_C],
      originalUrl: 'https://instagram.com',
    },
  },
  // 시안 `게시물 상세_직접 입력` 실패 케이스 — 연관 장소 파싱 자체가 실패하는 게시물.
  'post-3': {
    title: '위치 태그 없이 올라온 카페 사진',
    groupName: '카페',
    groupColor: 'yellow',
    bookmarkedPlaceIds: [],
    post: {
      id: 'post-3',
      authorHandle: '@nook.official on instagram',
      caption: '위치 정보 없이 올라온 게시물이라 연관 장소 파싱이 실패할 수 있어요.',
      images: [IMAGE_D],
      originalUrl: 'https://instagram.com',
    },
  },
};

export function getMockPostDetail(postId: string | undefined): PostDetail | undefined {
  return postId ? MOCK_POST_DETAILS[postId] : undefined;
}
```

- [ ] **Step 2: `RelatedPlacesSection` 작성**

`apps/web/src/features/post/components/RelatedPlacesSection.tsx`:
```tsx
import { PlaceRow } from '@/features/place';
import type { RelatedPlacesState } from '../hooks/useRelatedPlaces';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';

export interface RelatedPlacesSectionProps {
  state: RelatedPlacesState;
  bookmarkedPlaceIds: string[];
  onBookmarkedChange: (placeId: string, next: boolean) => void;
  onDirectAddClick: () => void;
}

/**
 * Figma `연관 장소` — 파싱 API 의 로딩/성공/실패에 따라 달라지는 섹션.
 * 로딩 중엔 안내 문구만 보여주고, 로딩이 끝나면(성공/실패 모두) 장소 목록(있으면)과
 * "찾는 장소가 없으신가요? 직접 추가" 배너를 함께 보여준다.
 * 실패했다는 사실 자체를 알리는 스낵바는 상위(PostDetailPage)책임이다 — 이 섹션은 배너만 그린다.
 */
function RelatedPlacesSection({
  state,
  bookmarkedPlaceIds,
  onBookmarkedChange,
  onDirectAddClick,
}: RelatedPlacesSectionProps) {
  return (
    <>
      {/* 시안의 6px 회색 띠 — 게시물 정보와 연관 장소를 가르는 구분면 */}
      <div className="mt-4 h-1.5 w-full bg-gray-10" />
      <section className="px-4 pb-6">
        <h2 className="py-4 text-b1 font-semibold text-gray-100">연관 장소</h2>

        {state.status === 'loading' ? (
          <p className="pb-4 text-b2 font-medium text-gray-60">연관 장소를 찾는 중…</p>
        ) : null}

        {state.status === 'success' && state.places.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {state.places.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                bookmarked={bookmarkedPlaceIds.includes(place.id)}
                onBookmarkedChange={(next) => onBookmarkedChange(place.id, next)}
              />
            ))}
          </div>
        ) : null}

        {state.status !== 'loading' ? (
          <button
            type="button"
            onClick={onDirectAddClick}
            className="flex w-full items-center justify-between rounded-sm border border-nook-blue/80 bg-gray-0 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <span className="flex items-center gap-2">
              <Icon16ExclamationCircle />
              <span className="text-b2 font-medium text-gray-80">찾는 장소가 없으신가요? </span>
            </span>
            <span className="shrink-0 text-b3 font-semibold text-gray-90">직접 추가</span>
          </button>
        ) : null}
      </section>
    </>
  );
}

export { RelatedPlacesSection };
```

- [ ] **Step 3: `PostDetailPage.tsx` 연동**

`apps/web/src/features/post/PostDetailPage.tsx`의 관련 부분을 아래처럼 바꾼다:

1-12번째 줄(파일 맨 위 import 블록 전체)을 아래로 교체한다:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { cn } from '@/shared/lib/utils';
import { BackButton, Carousel, Header, Snackbar } from '@/shared/ui';
import { MemoSheet } from './components/MemoSheet';
import { OriginalPostLink } from './components/OriginalPostLink';
import { PlaceDirectInputDrawer } from './components/PlaceDirectInputDrawer';
import { PostImageViewer } from './components/PostImageViewer';
import { PostInfo } from './components/PostInfo';
import { RelatedPlacesSection } from './components/RelatedPlacesSection';
import { useRelatedPlaces } from './hooks/useRelatedPlaces';
// TODO(api): 게시물 상세 API 연동 시 목데이터 대신 TanStack Query 훅으로 교체한다.
import { getMockPostDetail } from './mock/posts';
```
(`PlaceRow` import는 지운다 — 더 이상 이 파일에서 직접 쓰지 않고 `RelatedPlacesSection`이 대신 import한다. `PlaceDirectInputDrawer` 는 Task 4 에서 만든다 — 이 태스크 시점엔 아직 파일이 없어 타입체크가 실패하는 게 정상이다. Step 순서상 Task 4 완료 후에 전체 타입체크가 통과한다.)

25번째 줄 `const detail = getMockPostDetail(postId);` 바로 아래, 32번째 줄 `bookmarkedPlaceIds` 선언 다음에 추가:
```tsx
  const relatedPlacesState = useRelatedPlaces(postId);
  const [directInputOpen, setDirectInputOpen] = useState(false);
  const [showRelatedPlacesErrorToast, setShowRelatedPlacesErrorToast] = useState(false);

  useEffect(() => {
    if (relatedPlacesState.status !== 'error') return;
    setShowRelatedPlacesErrorToast(true);
    const timer = setTimeout(() => setShowRelatedPlacesErrorToast(false), 3000);
    return () => clearTimeout(timer);
  }, [relatedPlacesState.status]);
```

50번째 줄 `const { post, title, groupName, groupColor, relatedPlaces } = detail;` →
```tsx
  const { post, title, groupName, groupColor } = detail;
```

123-141번째 줄의 아래 블록을 전부 삭제하고:
```tsx
      {relatedPlaces.length > 0 ? (
        <>
          {/* 시안의 6px 회색 띠 — 게시물 정보와 연관 장소를 가르는 구분면 */}
          <div className="mt-4 h-1.5 w-full bg-gray-10" />
          <section className="px-4">
            <h2 className="py-4 text-b1 font-semibold text-gray-100">연관 장소</h2>
            <div className="flex flex-col gap-4">
              {relatedPlaces.map((place) => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  bookmarked={bookmarkedPlaceIds.includes(place.id)}
                  onBookmarkedChange={(next) => toggleBookmark(place.id, next)}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
```
아래로 교체한다:
```tsx
      <RelatedPlacesSection
        state={relatedPlacesState}
        bookmarkedPlaceIds={bookmarkedPlaceIds}
        onBookmarkedChange={toggleBookmark}
        onDirectAddClick={() => setDirectInputOpen(true)}
      />
```

145번째 줄(`{viewerOpen ? ... : null}`) 다음, `</main>` 직전에 추가:
```tsx

      <PlaceDirectInputDrawer open={directInputOpen} onOpenChange={setDirectInputOpen} />

      {showRelatedPlacesErrorToast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Snackbar
            title="위치를 찾지 못 했어요"
            description="게시물은 저장됐지만 지도에는 표시되지 않아요"
            className="w-full max-w-[343px]"
          />
        </div>
      ) : null}
```

- [ ] **Step 4: 기존 테스트를 새 동작에 맞게 갱신**

`apps/web/src/features/post/PostDetailPage.test.tsx` 전체를 아래로 교체한다:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { PostDetailPage } from '@/features/post/PostDetailPage';

async function renderPost(postId: string) {
  render(
    <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
      <MemoryRouter initialEntries={[`/post/${postId}`]}>
        <Routes>
          <Route path="/post/:postId" element={<PostDetailPage />} />
        </Routes>
      </MemoryRouter>
    </BottomMenuVisibilityProvider>,
  );
  // 연관 장소는 별도 API 로 비동기 로드된다 — 로딩 문구가 사라질 때까지 기다린다.
  await waitFor(() =>
    expect(screen.queryByText('연관 장소를 찾는 중…')).not.toBeInTheDocument(),
  );
}

describe('게시물 상세', () => {
  it('연관 장소가 있으면 섹션과 장소 행을 렌더한다', async () => {
    await renderPost('post-1');

    expect(screen.getByRole('heading', { name: '지금 가기 좋은 초록뷰 카페' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByText('아이소')).toBeInTheDocument();
  });

  it('매칭된 장소가 없으면 목록 없이 직접 추가 배너만 보여준다', async () => {
    await renderPost('post-2');

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.queryByText('아이소')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
  });

  it('연관 장소 파싱이 실패하면 에러 스낵바를 보여준다', async () => {
    await renderPost('post-3');

    expect(screen.getByRole('heading', { name: '연관 장소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /직접 추가/ })).toBeInTheDocument();
    expect(screen.getByText('위치를 찾지 못 했어요')).toBeInTheDocument();
  });

  it('이미지를 누르면 확대 뷰가 열린다', async () => {
    await renderPost('post-1');

    // 상세의 캐러셀 이미지는 확대 뷰를 여는 버튼이다.
    fireEvent.click(screen.getByRole('button', { name: '1번째 이미지 크게 보기' }));

    // 확대 뷰가 열리면 뒤로가기 버튼이 하나 더 생긴다(상세 헤더 + 뷰어 헤더).
    expect(screen.getAllByRole('button', { name: '뒤로 가기' })).toHaveLength(2);
  });

  it('연관 장소의 즐겨찾기를 토글한다', async () => {
    await renderPost('post-1');

    // 시안: 앞의 두 곳은 저장됨, 세 번째는 아님
    const saved = screen.getByRole('button', { name: '아이소 즐겨찾기' });
    const unsaved = screen.getByRole('button', { name: '탐석과 사랑 즐겨찾기' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    expect(unsaved).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(unsaved);
    expect(unsaved).toHaveAttribute('aria-pressed', 'true');
  });

  it('본문은 접혀 있고 더보기로 펼친다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });
});
```

(직접 추가 배너 → 드로어 오픈 테스트는 Task 4에서 드로어가 만들어진 뒤 추가한다.)

- [ ] **Step 5: 테스트 실행**

Run: `pnpm --filter web test -- run src/features/post/PostDetailPage.test.tsx`
Expected: FAIL — `PlaceDirectInputDrawer` 모듈을 찾을 수 없음(Task 4 에서 만든다). 이 시점의 실패는 예상된 것이다.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/post/mock/posts.ts apps/web/src/features/post/components/RelatedPlacesSection.tsx apps/web/src/features/post/PostDetailPage.tsx apps/web/src/features/post/PostDetailPage.test.tsx
git commit -m "feat(post): 연관 장소 로딩/에러 처리 + 직접 추가 배너, 에러 스낵바 연동"
```

---

## Task 4: 장소 검색 mock 데이터

**Files:**
- Create: `apps/web/src/features/post/mock/placeSearchResults.ts`
- Test: `apps/web/src/features/post/mock/placeSearchResults.test.ts`

**Interfaces:**
- Produces: `export function searchMockPlaces(query: string): Place[]` — 검색어가 비어있으면 빈 배열, 아니면 이름에 검색어가 포함된(대소문자 무시) 장소만 반환.
- Consumes: `Place` from `@/features/place`.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/post/mock/placeSearchResults.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { searchMockPlaces } from './placeSearchResults';

describe('searchMockPlaces', () => {
  it('검색어가 비어 있으면 빈 배열을 반환한다', () => {
    expect(searchMockPlaces('')).toEqual([]);
    expect(searchMockPlaces('   ')).toEqual([]);
  });

  it('이름에 검색어가 포함된 장소만 반환한다', () => {
    const results = searchMockPlaces('앤미');
    expect(results.map((place) => place.name)).toEqual(['앤미', '앤미용실', '앤미술']);
  });

  it('일치하는 장소가 없으면 빈 배열을 반환한다', () => {
    expect(searchMockPlaces('존재하지않는장소')).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/mock/placeSearchResults.test.ts`
Expected: FAIL — `Cannot find module './placeSearchResults'`

- [ ] **Step 3: 구현**

`apps/web/src/features/post/mock/placeSearchResults.ts`:
```ts
import type { Place } from '@/features/place';

/**
 * `PlaceDirectInputDrawer` 검색 결과 목데이터. 실제 장소 검색 API 연동 전까지
 * 이름에 검색어가 포함되는 항목만 클라이언트에서 필터링해 보여준다.
 */
const MOCK_SEARCH_PLACES: Place[] = [
  {
    id: 'search-1',
    name: '앤미',
    category: '일식',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
  {
    id: 'search-2',
    name: '앤미용실',
    category: '미용실',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
  {
    id: 'search-3',
    name: '앤미술',
    category: '교습소',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
  },
];

export function searchMockPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  return MOCK_SEARCH_PLACES.filter((place) => place.name.toLowerCase().includes(normalized));
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/mock/placeSearchResults.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/post/mock/placeSearchResults.ts apps/web/src/features/post/mock/placeSearchResults.test.ts
git commit -m "feat(post): 장소 직접 입력 검색 mock 데이터 추가"
```

---

## Task 5: `PlaceDirectInputDrawer` (초기 뷰 + 검색 결과 뷰) + 최종 검증

이 시안(node 74-4111, 74-4193)에서 검색 결과 행을 눌렀을 때 나오는 다음 화면은 범위 밖이다 — 행에는 `onClick`을 달지 않는다.

**Files:**
- Modify: `apps/web/src/test/setup.ts:1` (vaul Drawer가 jsdom에 없는 `ResizeObserver`를 요구한다 — 스텁 추가)
- Create: `apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx`
- Modify: `apps/web/src/features/post/PostDetailPage.test.tsx` (드로어 오픈 테스트 추가)

**Interfaces:**
- Consumes: `Drawer`, `DrawerContent`, `DrawerTitle`(`@/shared/ui`), `Icon18MagnifyingGlass`, `Icon24Delete`, `Icon16Location`(`@/shared/icons/NookIcons`), `searchMockPlaces`(Task 4), `cn`(`@/shared/lib/utils`).
- Produces: `PlaceDirectInputDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void })` — Task 3의 `PostDetailPage`가 이미 이 시그니처로 호출하고 있다.

- [ ] **Step 1: jsdom에 `ResizeObserver` 스텁 추가**

`apps/web/src/test/setup.ts`(1번째 줄 `import '@testing-library/jest-dom/vitest';` 다음)에 추가:
```ts
// vaul(Drawer)이 콘텐츠 높이 측정에 ResizeObserver 를 쓰는데 jsdom 에는 없다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
```

- [ ] **Step 2: 드로어를 여는 실패하는 테스트 추가**

`apps/web/src/features/post/PostDetailPage.test.tsx`의 마지막 `it(...)` 다음(파일의 `});` 닫는 괄호 직전)에 추가:
```tsx

  it('직접 추가 배너를 누르면 장소 검색 드로어가 열린다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('드로어에 검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', async () => {
    await renderPost('post-1');

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/PostDetailPage.test.tsx`
Expected: FAIL — `Cannot find module './components/PlaceDirectInputDrawer'`

- [ ] **Step 4: `PlaceDirectInputDrawer` 구현**

`apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx`:
```tsx
import { useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import { Icon16Location, Icon18MagnifyingGlass, Icon24Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { searchMockPlaces } from '../mock/placeSearchResults';

export interface PlaceDirectInputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Figma `게시물 상세_직접 입력` — 연관 장소를 못 찾았을 때 사용자가 직접 검색해 넣는 바텀시트.
 *
 * 검색 결과 행을 눌렀을 때 나오는 다음 화면(장소 확정 등)은 이후 작업이라
 * 이 드로어는 검색어 입력과 결과 목록 표시까지만 담당한다 — 행에는 아직 onClick 이 없다.
 */
function PlaceDirectInputDrawer({ open, onOpenChange }: PlaceDirectInputDrawerProps) {
  const [query, setQuery] = useState('');
  const results = searchMockPlaces(query);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DrawerContent className="px-4 pb-11">
        <DrawerTitle className="sr-only">장소 직접 입력</DrawerTitle>
        <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-gray-30 px-3">
          <Icon18MagnifyingGlass className="shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="장소명을 입력해주세요"
            className="min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-50"
          />
          {query.length > 0 ? (
            <button
              type="button"
              aria-label="입력 지우기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setQuery('')}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-1"
            >
              <Icon24Delete />
            </button>
          ) : null}
        </div>

        {results.length > 0 ? (
          <ul className="mt-5 flex w-full flex-col">
            {results.map((place, index) => (
              <li
                key={place.id}
                className={cn('flex items-center gap-2 py-2', index > 0 && 'border-t border-gray-10')}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-10">
                  <Icon16Location />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-end gap-0.5">
                    <span className="truncate text-b2 font-semibold text-gray-90">{place.name}</span>
                    <span className="shrink-0 text-b3 font-medium text-gray-70">{place.category}</span>
                  </div>
                  <p className="truncate text-b3 font-medium text-gray-80">
                    {place.address} · {place.distance}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export { PlaceDirectInputDrawer };
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/PostDetailPage.test.tsx`
Expected: PASS (8 tests). `ResizeObserver` 관련 에러가 나면 Step 1의 스텁이 `setupFiles`(vite.config.ts의 `test.setupFiles: ['./src/test/setup.ts']`)를 통해 실제로 로드되는지 확인한다.

- [ ] **Step 6: 전체 검증**

Run: `pnpm --filter web typecheck`
Expected: PASS

Run: `pnpm --filter web test`
Expected: PASS (모든 기존 테스트 포함)

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/test/setup.ts apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx apps/web/src/features/post/PostDetailPage.test.tsx
git commit -m "feat(post): 장소 직접 입력 드로어(초기/검색 뷰) 추가"
```
