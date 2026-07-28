# 검색 결과 클릭 → 장소 상세 Drawer + 게시물 이미지 뷰어 + 연관 장소 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `PlaceDirectInputDrawer`(직접 입력 드로어)의 검색 결과를 눌렀을 때 장소 상세(collapsed/expanded)를 보여주고, 상세 안의 게시물 썸네일을 누르면 그 게시물의 전체 이미지를 볼 수 있게 하며, 하단 sticky bar의 "추가하기"를 누르면 `PostDetailPage`로 돌아가 그 장소가 연관 장소에 연결된 상태를 보여준다.

**Architecture:** `PlaceDirectInputDrawer`는 지금까지 "검색 입력 + 결과 리스트"만 담당하는 단일 상태였다. 여기에 `selectedPlace: Place | null` 상태를 추가해, 검색 결과를 누르면 같은 Drawer 안에서 콘텐츠를 "검색 리스트 ↔ 장소 상세"로 교체한다(라우트 이동이 아니라 `map/PlaceSheet`+`PlaceDetail`이 이미 쓰는 "같은 시트 안에서 콘텐츠 스왑" 컨벤션을 그대로 따른다). 장소 상세는 collapsed/expanded 두 상태를 갖는데, 이것도 `map/PlaceSheet`가 쓰는 vaul `snapPoints`/`activeSnapPoint` 패턴을 그대로 재사용한다(검색 리스트 모드일 땐 `snapPoints`를 안 주고 지금처럼 고정 `h-[90dvh]`를 유지). 장소 상세 안에서 게시물 썸네일을 누르면 기존 `PostImageViewer`(오버레이 레이어, 라우트 아님)를 그대로 재사용해 그 게시물의 이미지를 보여준다. "추가하기"를 누르면 `PlaceDirectInputDrawer`가 `onPlaceConfirmed(place)` 콜백으로 부모(`PostDetailPage`)에 알리고 스스로 닫힌다. `PostDetailPage`는 이렇게 확정된 장소를 `manualPlaces` 로컬 상태에 담아 파싱 API 결과와 무관하게 항상 연관 장소 목록에 보여주고, 북마크 기본값을 true로 준다(시안: 파란 별).

**Tech Stack:** 기존과 동일 — React 19, TypeScript, vaul(Drawer, snapPoints), Tailwind v4, vitest + @testing-library/react. 새 라이브러리 추가 없음.

## Global Constraints

- 새 라우트를 만들지 않는다 — 장소 상세, 게시물 이미지 뷰어 모두 기존 컨벤션대로 오버레이/드로어 콘텐츠 스왑으로 구현한다(`PostImageViewer`/`MemoSheet`/`map/PlaceSheet`와 동일 철학).
- 검색 결과 → 장소 상세로 진입한 뒤 "검색 리스트로 되돌아가기" 버튼은 이번 범위에 없다 — 제공된 Figma 프레임 어디에도 그런 인터랙션이 없다. 되돌리려면 드로어를 닫고 다시 열어 재검색해야 한다(알려진 제약으로 문서화만 하고 별도 구현 안 함).
- 장소 상세의 헤더(이름/업종/지형지물/키워드)는 새로 만들지 않고 기존에 있지만 실사용처가 없던 `apps/web/src/features/place/components/PlaceDetailHeader.tsx`를 그대로 쓴다.
- 게시물 썸네일 클릭 후 이미지 확대는 새로 만들지 않고 `apps/web/src/features/post/components/PostImageViewer.tsx`를 그대로 재사용한다.
- collapsed/expanded 전환은 `map/PlaceSheet.tsx`와 동일한 vaul `snapPoints`/`activeSnapPoint` 패턴을 쓴다 — 새로운 expand 매커니즘을 발명하지 않는다.
- "이 장소가 맞나요? / 추가하기" 하단 바는 `apps/web/src/shared/ui/drawer.tsx`의 기존 `DrawerFooter`(현재 미사용)를 쓴다 — 새 프리미티브를 만들지 않는다.
- 색상/타이포는 전부 기존 `@theme` 토큰 클래스를 쓴다. 임의 hex 값을 새로 넣지 않는다.
- 커밋마다 `pnpm --filter web typecheck`와 `pnpm --filter web test`가 통과해야 한다. 각 태스크는 이전 태스크가 만든 파일에만 의존하도록 순서를 짜서(검색 mock → 상세 컴포넌트 → 드로어 통합 → 페이지 연동) 중간에 "아직 없는 파일을 import하는 커밋"이 생기지 않게 한다.

---

## Task 1: 장소 상세 mock 데이터 — 지형지물/키워드 보강 + 매핑된 게시물

**Files:**
- Modify: `apps/web/src/features/post/mock/placeSearchResults.ts` (전체 — 기존 3개 검색 결과에 `landmark`·`keywords` 필드 추가)
- Create: `apps/web/src/features/post/mock/placePosts.ts`
- Test: `apps/web/src/features/post/mock/placePosts.test.ts`

**Interfaces:**
- Produces: `export function getMockPlacePosts(placeId: string): Post[]` — 알려진 placeId 면 해당 장소에 매핑된 게시물(각 게시물은 `images: string[]` 1개 이상) 배열, 모르는 id 면 빈 배열.
- Consumes: `Post` type(`@/features/post`).

- [ ] **Step 1: `placeSearchResults.ts`에 `landmark`/`keywords` 추가**

`apps/web/src/features/post/mock/placeSearchResults.ts` 전체를 아래로 교체한다(기존 `id/name/category/distance/address`는 그대로 두고 `landmark`/`keywords`만 추가):
```ts
import type { Place } from '@/features/place';

/**
 * `PlaceDirectInputDrawer` 검색 결과 목데이터. 실제 장소 검색 API 연동 전까지
 * 이름에 검색어가 포함되는 항목만 클라이언트에서 필터링해 보여준다.
 *
 * landmark/keywords 는 장소 상세(`PlaceSearchResultDetail`)에서 쓴다 — 검색 리스트
 * 자체는 이 필드들을 표시하지 않는다.
 */
const MOCK_SEARCH_PLACES: Place[] = [
  {
    id: 'search-1',
    name: '앤미',
    category: '일식',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 2번 출구',
    keywords: ['조용한', '정갈한', '혼밥', '친절한'],
  },
  {
    id: 'search-2',
    name: '앤미용실',
    category: '미용실',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 2번 출구',
    keywords: ['친절한'],
  },
  {
    id: 'search-3',
    name: '앤미술',
    category: '교습소',
    distance: '16.2km',
    address: '서울 관악구 관악로 12길 47 (봉천동)',
    landmark: '서울대입구역 3번 출구',
    keywords: ['조용한'],
  },
];

export function searchMockPlaces(query: string): Place[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  return MOCK_SEARCH_PLACES.filter((place) => place.name.toLowerCase().includes(normalized));
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/features/post/mock/placePosts.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getMockPlacePosts } from './placePosts';

describe('getMockPlacePosts', () => {
  it('알려진 장소 id 면 매핑된 게시물 목록을 반환한다', () => {
    const posts = getMockPlacePosts('search-1');

    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].images?.length).toBeGreaterThan(0);
  });

  it('게시물이 여러 장 이미지를 가진 경우도 있다(이미지 뷰어 인디케이터 테스트용)', () => {
    const posts = getMockPlacePosts('search-1');

    expect(posts.some((post) => (post.images?.length ?? 0) > 1)).toBe(true);
  });

  it('모르는 장소 id 면 빈 배열을 반환한다', () => {
    expect(getMockPlacePosts('unknown-place')).toEqual([]);
  });
});
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/mock/placePosts.test.ts`
Expected: FAIL — `Cannot find module './placePosts'`

- [ ] **Step 4: 구현**

`apps/web/src/features/post/mock/placePosts.ts`:
```ts
import type { Post } from '@/features/post';

/** 실제 이미지 API 연동 전까지 쓰는 단색 플레이스홀더. */
function placeholder(hex: string, width: number, height: number) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${hex}"/></svg>`,
  )}`;
}

const IMAGE_A = placeholder('#c3cbd6', 160, 200);
const IMAGE_B = placeholder('#b4bdc9', 160, 200);
const IMAGE_C = placeholder('#d7dce3', 160, 200);

/**
 * `PlaceSearchResultDetail`(장소 상세)에서 보여줄, 장소에 매핑된 게시물 목데이터.
 * 검색 결과의 `Place.id`(`placeSearchResults.ts`)를 키로 쓴다.
 */
const MOCK_PLACE_POSTS: Record<string, Post[]> = {
  'search-1': [
    {
      id: 'search-1-post-1',
      authorHandle: '@nook.official on instagram',
      caption: '집밥처럼 정성 가득한 일본 가정식, 반찬까지 푸짐해 자취생 취향 저격.',
      images: [IMAGE_A, IMAGE_B, IMAGE_C],
      originalUrl: 'https://www.instagram.com/p/mock-search-1-post-1/',
    },
    {
      id: 'search-1-post-2',
      authorHandle: '@nook.official on instagram',
      caption: '관악구 자취생 필독 점심 식당 대방출.',
      images: [IMAGE_B],
      originalUrl: 'https://www.instagram.com/p/mock-search-1-post-2/',
    },
  ],
  'search-2': [
    {
      id: 'search-2-post-1',
      authorHandle: '@nook.official on instagram',
      caption: '단골이 많은 동네 미용실.',
      images: [IMAGE_A],
      originalUrl: 'https://www.instagram.com/p/mock-search-2-post-1/',
    },
  ],
};

export function getMockPlacePosts(placeId: string): Post[] {
  return MOCK_PLACE_POSTS[placeId] ?? [];
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/mock/placePosts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/post/mock/placeSearchResults.ts apps/web/src/features/post/mock/placePosts.ts apps/web/src/features/post/mock/placePosts.test.ts
git commit -m "feat(post): 장소 검색 결과에 지형지물/키워드 추가 + 매핑 게시물 mock"
```

---

## Task 2: `PlaceSearchResultDetail` 컴포넌트 (collapsed/expanded)

**Files:**
- Create: `apps/web/src/features/post/components/PlaceSearchResultDetail.tsx`
- Test: `apps/web/src/features/post/components/PlaceSearchResultDetail.test.tsx`

**Interfaces:**
- Consumes: `PlaceDetailHeader`(`@/features/place`), `Place`(`@/features/place`), `Post`(`@/features/post`), `Button`/`Carousel`/`DrawerFooter`(`@/shared/ui`), `cn`(`@/shared/lib/utils`).
- Produces: `PlaceSearchResultDetail({ place, posts, expanded, onSelectPost, onConfirm })` — `onSelectPost: (post: Post) => void`(게시물 썸네일 클릭), `onConfirm: () => void`("추가하기" 클릭). Task 3의 `PlaceDirectInputDrawer`가 이 컴포넌트를 렌더한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/post/components/PlaceSearchResultDetail.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSearchResultDetail } from './PlaceSearchResultDetail';

const PLACE = {
  id: 'search-1',
  name: '앤미',
  category: '일식',
  address: '서울 관악구 관악로 12길 47 (봉천동)',
  landmark: '서울대입구역 2번 출구',
  keywords: ['조용한', '정갈한'],
};

const POSTS = [
  { id: 'p1', authorHandle: '@a', images: ['a.png'], originalUrl: 'https://x.com/1' },
  { id: 'p2', authorHandle: '@a', images: ['b.png', 'c.png'], originalUrl: 'https://x.com/2' },
];

describe('PlaceSearchResultDetail', () => {
  it('장소 이름·업종·지형지물·키워드를 보여준다', () => {
    render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded={false}
        onSelectPost={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('앤미')).toBeInTheDocument();
    expect(screen.getByText('일식')).toBeInTheDocument();
    expect(screen.getByText('서울대입구역 2번 출구')).toBeInTheDocument();
    expect(screen.getByText('조용한')).toBeInTheDocument();
  });

  it('게시물 썸네일을 누르면 onSelectPost 가 그 게시물로 호출된다', () => {
    const onSelectPost = vi.fn();
    render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded={false}
        onSelectPost={onSelectPost}
        onConfirm={() => {}}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: '게시물 크게 보기' })[0]);
    expect(onSelectPost).toHaveBeenCalledWith(POSTS[0]);
  });

  it('"추가하기"를 누르면 onConfirm 이 호출된다', () => {
    const onConfirm = vi.fn();
    render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded={false}
        onSelectPost={() => {}}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('expanded=true 면 게시물이 그리드로 보인다', () => {
    const { container } = render(
      <PlaceSearchResultDetail
        place={PLACE}
        posts={POSTS}
        expanded
        onSelectPost={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(container.querySelector('.grid')).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/components/PlaceSearchResultDetail.test.tsx`
Expected: FAIL — `Cannot find module './PlaceSearchResultDetail'`

- [ ] **Step 3: 구현**

`apps/web/src/features/post/components/PlaceSearchResultDetail.tsx`:
```tsx
import type { Place } from '@/features/place';
import { PlaceDetailHeader } from '@/features/place';
import type { Post } from '@/features/post';
import { cn } from '@/shared/lib/utils';
import { Button, Carousel, DrawerFooter } from '@/shared/ui';

export interface PlaceSearchResultDetailProps {
  place: Place;
  /** 이 장소에 매핑된 게시물 — 각 항목의 대표 이미지(`images[0]`)를 썸네일로 쓴다. */
  posts: Post[];
  /** collapsed 면 가로 스크롤 캐러셀, expanded 면 2열 그리드로 게시물을 보여준다. */
  expanded: boolean;
  onSelectPost: (post: Post) => void;
  onConfirm: () => void;
}

function PostThumbnailButton({
  post,
  onClick,
  className,
}: {
  post: Post;
  onClick: () => void;
  className?: string;
}) {
  const cover = post.images?.[0];
  return (
    <button
      type="button"
      aria-label="게시물 크게 보기"
      onClick={onClick}
      className={cn(
        'overflow-hidden rounded-sm bg-gray-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset',
        className,
      )}
    >
      {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
    </button>
  );
}

/**
 * Figma `장소 바텀시트`(74:3748 collapsed / 74:3623 expanded) — 검색 결과 상세.
 *
 * 헤더(이름/업종/지형지물/키워드)는 기존에 있었지만 실사용처가 없던
 * `PlaceDetailHeader` 를 그대로 쓴다. 매핑된 게시물은 collapsed 에서는 가로
 * 캐러셀(각 카드 = 게시물 1개의 대표 이미지), expanded 에서는 2열 그리드로
 * 레이아웃만 바뀐다 — 게시물 목록 자체는 동일하다.
 *
 * 하단 "이 장소가 맞나요? / 추가하기" 바는 `DrawerFooter`(mt-auto)로 스크롤 영역과
 * 분리해 항상 바닥에 붙인다.
 */
function PlaceSearchResultDetail({
  place,
  posts,
  expanded,
  onSelectPost,
  onConfirm,
}: PlaceSearchResultDetailProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <PlaceDetailHeader place={place} className="pt-4 pb-4" />

        {posts.length > 0 ? (
          expanded ? (
            <div className="grid grid-cols-2 gap-2 pb-4">
              {posts.map((post) => (
                <PostThumbnailButton
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                  className="aspect-[160/200] w-full"
                />
              ))}
            </div>
          ) : (
            <Carousel indicator={false} className="pb-4">
              {posts.map((post) => (
                <PostThumbnailButton
                  key={post.id}
                  post={post}
                  onClick={() => onSelectPost(post)}
                  className="h-[175px] w-35"
                />
              ))}
            </Carousel>
          )
        ) : null}
      </div>

      <DrawerFooter className="flex-row items-center gap-2.5 border-t border-gray-10 p-4">
        <p className="flex-1 text-b2 font-semibold text-gray-80">이 장소가 맞나요?</p>
        <Button size="md" onClick={onConfirm} className="flex-1">
          추가하기
        </Button>
      </DrawerFooter>
    </div>
  );
}

export { PlaceSearchResultDetail };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/components/PlaceSearchResultDetail.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/post/components/PlaceSearchResultDetail.tsx apps/web/src/features/post/components/PlaceSearchResultDetail.test.tsx
git commit -m "feat(post): 장소 검색 결과 상세(PlaceSearchResultDetail) 컴포넌트 추가"
```

---

## Task 3: `PlaceDirectInputDrawer` 통합 — 검색 결과 클릭 → 상세 → 게시물 뷰어

이 태스크에서 "검색 결과 행에는 onClick 이 없다"던 기존 제약을 없앤다 — 이번이 바로 그 다음 작업이다.

**Files:**
- Modify: `apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx` (전체)
- Modify: `apps/web/src/features/post/components/PlaceDirectInputDrawer.test.tsx` (테스트 추가)

**Interfaces:**
- Consumes: `PlaceSearchResultDetail`(Task 2), `getMockPlacePosts`(Task 1), `PostImageViewer`(`./PostImageViewer`, 기존), `Place`(`@/features/place`), `Post`(`@/features/post`).
- Produces: `PlaceDirectInputDrawer({ open, onOpenChange, onPlaceConfirmed })` — `onPlaceConfirmed: (place: Place) => void` prop 신규 추가. Task 4의 `PostDetailPage`가 이 시그니처로 호출한다.

- [ ] **Step 1: 실패하는 테스트 추가 (기존 3개 테스트는 그대로 둔다)**

`apps/web/src/features/post/components/PlaceDirectInputDrawer.test.tsx`의 기존 테스트 3개 아래(파일의 마지막 `});` 직전)에 추가:
```tsx

  it('검색 결과를 누르면 장소 상세로 전환된다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미용실'));

    expect(screen.getByText('서울대입구역 2번 출구')).toBeInTheDocument();
  });

  it('상세에서 게시물을 누르면 이미지 뷰어가 뜬다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    fireEvent.click(screen.getAllByRole('button', { name: '게시물 크게 보기' })[0]);

    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
  });

  it('상세에서 "추가하기"를 누르면 onPlaceConfirmed 가 해당 장소로 호출된다', () => {
    const onPlaceConfirmed = vi.fn();
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={onPlaceConfirmed} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    expect(onPlaceConfirmed).toHaveBeenCalledWith(expect.objectContaining({ id: 'search-1' }));
  });
```
파일 상단 import 에 `vi`를 추가한다: `import { describe, expect, it, vi } from 'vitest';`. 그리고 기존 3개 테스트의 `render(<PlaceDirectInputDrawer open onOpenChange={() => {}} />)` 호출에도 `onPlaceConfirmed={() => {}}`를 추가한다(prop 이 필수가 되므로).

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `pnpm --filter web test -- run src/features/post/components/PlaceDirectInputDrawer.test.tsx`
Expected: FAIL — `onPlaceConfirmed` 관련 타입 에러 또는 "서울대입구역 2번 출구" 텍스트를 찾지 못함(아직 클릭 핸들러가 없음)

- [ ] **Step 3: 구현**

`apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx` 전체를 아래로 교체한다:
```tsx
import { useEffect, useState } from 'react';
import { useAppShellContainer } from '@/app/providers';
import type { Place } from '@/features/place';
import type { Post } from '@/features/post';
import { Icon16Location, Icon18MagnifyingGlass, Icon24Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';
import { getMockPlacePosts } from '../mock/placePosts';
import { searchMockPlaces } from '../mock/placeSearchResults';
import { PlaceSearchResultDetail } from './PlaceSearchResultDetail';
import { PostImageViewer } from './PostImageViewer';

export interface PlaceDirectInputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 장소 상세에서 "추가하기"를 눌렀을 때 호출된다. 이 드로어는 그 후 스스로 닫는다. */
  onPlaceConfirmed: (place: Place) => void;
}

/** Figma `장소 바텀시트`(장소 상세) collapsed/expanded 스냅 — `map/PlaceSheet` 와 동일 패턴. */
const PLACE_DETAIL_SNAP_POINTS = [0.55, 1];

/**
 * Figma `게시물 상세_직접 입력` — 연관 장소를 못 찾았을 때 사용자가 직접 검색해 넣는 바텀시트.
 *
 * 검색 리스트와 장소 상세는 별도 드로어가 아니라 같은 Drawer 안에서 콘텐츠만 바꾼다
 * (`selectedPlace` 유무로 분기) — `map/PlaceSheet`+`PlaceDetail` 이 이미 쓰는 컨벤션과 동일.
 * 장소 상세 안에서 게시물을 누르면 `PostImageViewer`(기존 오버레이)를 그대로 재사용한다.
 */
function PlaceDirectInputDrawer({ open, onOpenChange, onPlaceConfirmed }: PlaceDirectInputDrawerProps) {
  const shellContainer = useAppShellContainer();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(
    PLACE_DETAIL_SNAP_POINTS[0],
  );
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const results = searchMockPlaces(query);

  // 배경 페이지가 스크롤된 채로 열리면 vaul 이 "콘텐츠를 스크롤하는 중"으로 오인해
  // 끌어내리기(dismiss) 제스처를 막아버린다 — 열려 있는 동안만 문서 스크롤 위치를 고정해
  // 화면은 그대로 두면서 vaul 의 드래그 판정(scrollTop === 0)은 항상 통과하게 한다.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const scrollY = root.scrollTop;
    const previous = {
      position: root.style.position,
      top: root.style.top,
      width: root.style.width,
    };
    root.style.position = 'fixed';
    root.style.top = `-${scrollY}px`;
    root.style.width = '100%';
    return () => {
      root.style.position = previous.position;
      root.style.top = previous.top;
      root.style.width = previous.width;
      root.scrollTop = scrollY;
    };
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('');
      setSelectedPlace(null);
      setActiveSnapPoint(PLACE_DETAIL_SNAP_POINTS[0]);
    }
    onOpenChange(next);
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        container={shellContainer}
        snapPoints={selectedPlace ? PLACE_DETAIL_SNAP_POINTS : undefined}
        activeSnapPoint={selectedPlace ? activeSnapPoint : undefined}
        setActiveSnapPoint={selectedPlace ? setActiveSnapPoint : undefined}
      >
        <DrawerContent
          className={cn('flex flex-col', selectedPlace ? 'overflow-hidden' : 'h-[90dvh] px-4 pb-11')}
        >
          <DrawerTitle className="sr-only">
            {selectedPlace ? `${selectedPlace.name} 상세` : '장소 직접 입력'}
          </DrawerTitle>

          {selectedPlace ? (
            <PlaceSearchResultDetail
              place={selectedPlace}
              posts={getMockPlacePosts(selectedPlace.id)}
              expanded={activeSnapPoint === PLACE_DETAIL_SNAP_POINTS[1]}
              onSelectPost={setViewingPost}
              onConfirm={() => onPlaceConfirmed(selectedPlace)}
            />
          ) : (
            <>
              {/* 앞에 돋보기 아이콘 슬롯이 필요해 공용 `Input` (@/shared/ui) 을 못 쓰고 직접 구현한다 —
                  대신 포커스 보더/클리어 버튼 동작은 `Input` 과 동일하게 맞춘다. */}
              <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-lg border border-gray-30 px-3 transition-colors focus-within:border-gray-100">
                <Icon18MagnifyingGlass className="shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="장소명을 입력해주세요"
                  className="min-w-0 flex-1 bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-50"
                />
                {focused && query.length > 0 ? (
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
                <ul className="mt-5 flex w-full flex-1 flex-col overflow-y-auto">
                  {results.map((place, index) => (
                    <li
                      key={place.id}
                      className={cn(index > 0 && 'border-t border-gray-10')}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlace(place)}
                        className="flex w-full items-center gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-10">
                          <Icon16Location />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-end gap-0.5">
                            <span className="truncate text-b2 font-semibold text-gray-90">
                              {place.name}
                            </span>
                            <span className="shrink-0 text-b3 font-medium text-gray-70">
                              {place.category}
                            </span>
                          </div>
                          <p className="truncate text-b3 font-medium text-gray-80">
                            {place.address} · {place.distance}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </DrawerContent>
      </Drawer>

      {viewingPost ? (
        <PostImageViewer images={viewingPost.images ?? []} onClose={() => setViewingPost(null)} />
      ) : null}
    </>
  );
}

export { PlaceDirectInputDrawer };
```
(`li`가 이제 `<button>`을 감싸므로 기존 `flex items-center gap-2 py-2` 클래스는 버튼 쪽으로 옮기고 `li`는 구분선 클래스만 남긴다.)

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/components/PlaceDirectInputDrawer.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/post/components/PlaceDirectInputDrawer.tsx apps/web/src/features/post/components/PlaceDirectInputDrawer.test.tsx
git commit -m "feat(post): 검색 결과 클릭 시 장소 상세/게시물 뷰어로 이어지도록 드로어 통합"
```

---

## Task 4: `PostDetailPage` 연동 — 확정한 장소를 연관 장소에 연결

**Files:**
- Modify: `apps/web/src/features/post/components/RelatedPlacesSection.tsx` (전체)
- Modify: `apps/web/src/features/post/PostDetailPage.tsx` (전체)
- Modify: `apps/web/src/features/post/PostDetailPage.test.tsx` (테스트 추가)

**Interfaces:**
- Consumes: `PlaceDirectInputDrawer`(Task 3, `onPlaceConfirmed` prop 추가됨), `Place`(`@/features/place`).
- Produces: `RelatedPlacesSection`에 `manualPlaces: Place[]` prop 추가 — 파싱 상태(`state.status`)와 무관하게 항상 렌더한다.

- [ ] **Step 1: `RelatedPlacesSection`에 `manualPlaces` 추가**

`apps/web/src/features/post/components/RelatedPlacesSection.tsx` 전체를 아래로 교체한다:
```tsx
import type { Place } from '@/features/place';
import { PlaceRow } from '@/features/place';
import { Icon16ExclamationCircle } from '@/shared/icons/NookIcons';
import type { RelatedPlacesState } from '../hooks/useRelatedPlaces';

export interface RelatedPlacesSectionProps {
  state: RelatedPlacesState;
  /** "직접 추가"로 사용자가 확정한 장소 — 파싱 상태(로딩/성공/실패)와 무관하게 항상 보여준다. */
  manualPlaces: Place[];
  bookmarkedPlaceIds: string[];
  onBookmarkedChange: (placeId: string, next: boolean) => void;
  onDirectAddClick: () => void;
}

/**
 * Figma `연관 장소` — 파싱 API 의 로딩/성공/실패에 따라 달라지는 섹션.
 * 로딩 중엔 안내 문구만 보여주고, 로딩이 끝나면(성공/실패 모두) 장소 목록(있으면)과
 * "찾는 장소가 없으신가요? 직접 추가" 배너를 함께 보여준다.
 * 사용자가 직접 추가로 확정한 장소(`manualPlaces`)는 파싱 상태와 무관하게 항상 목록에
 * 포함된다 — 파싱이 실패했어도 방금 직접 추가한 장소는 바로 보여야 하기 때문이다.
 * 실패했다는 사실 자체를 알리는 스낵바는 상위(PostDetailPage)책임이다 — 이 섹션은 배너만 그린다.
 */
function RelatedPlacesSection({
  state,
  manualPlaces,
  bookmarkedPlaceIds,
  onBookmarkedChange,
  onDirectAddClick,
}: RelatedPlacesSectionProps) {
  const parsedPlaces = state.status === 'success' ? state.places : [];
  const places = [...parsedPlaces, ...manualPlaces];

  return (
    <>
      {/* 시안의 6px 회색 띠 — 게시물 정보와 연관 장소를 가르는 구분면 */}
      <div className="mt-4 h-1.5 w-full bg-gray-10" />
      <section className="px-4 pb-6">
        <h2 className="py-4 text-b1 font-semibold text-gray-100">연관 장소</h2>

        {state.status === 'loading' ? (
          <p className="pb-4 text-b2 font-medium text-gray-60">연관 장소를 찾는 중…</p>
        ) : null}

        {places.length > 0 ? (
          <div className="flex flex-col gap-4 pb-4">
            {places.map((place) => (
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
            className="flex w-full items-center justify-between rounded-sm bg-gray-0 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
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

- [ ] **Step 2: `PostDetailPage.tsx` 연동**

`apps/web/src/features/post/PostDetailPage.tsx`의 관련 부분을 아래처럼 바꾼다:

1번째 줄 뒤, import 블록에 `Place` 타입 추가(`useHideBottomMenu` import 다음 줄):
```tsx
import type { Place } from '@/features/place';
```

39-42번째 줄(`bookmarkOverrides`/`toggleBookmark` 선언부) 다음에 추가:
```tsx
  // "직접 추가"로 확정한 장소 — 파싱 상태와 무관하게 항상 연관 장소에 보여준다.
  const [manualPlaces, setManualPlaces] = useState<Place[]>([]);

  function handlePlaceConfirmed(place: Place) {
    setManualPlaces((prev) => (prev.some((existing) => existing.id === place.id) ? prev : [...prev, place]));
    // 시안: 직접 추가한 장소는 항상 파란 북마크(저장됨) 상태로 시작한다.
    setBookmarkOverrides((prev) => ({ ...prev, [place.id]: true }));
    setDirectInputOpen(false);
  }
```

44-51번째 줄(`bookmarkedPlaceIds` 계산)을 아래로 교체한다(파싱 결과 + 직접 추가한 장소를 합쳐서 계산):
```tsx
  const allPlaceIds = [
    ...(relatedPlacesState.status === 'success' ? relatedPlacesState.places.map((place) => place.id) : []),
    ...manualPlaces.map((place) => place.id),
  ];

  const bookmarkedPlaceIds = allPlaceIds.filter(
    (id) =>
      bookmarkOverrides[id] ??
      (relatedPlacesState.status === 'success' && relatedPlacesState.bookmarkedPlaceIds.includes(id)),
  );
```

`<RelatedPlacesSection ... />` 호출에 `manualPlaces` prop 추가:
```tsx
      <RelatedPlacesSection
        state={relatedPlacesState}
        manualPlaces={manualPlaces}
        bookmarkedPlaceIds={bookmarkedPlaceIds}
        onBookmarkedChange={toggleBookmark}
        onDirectAddClick={() => setDirectInputOpen(true)}
      />
```

`<PlaceDirectInputDrawer ... />` 호출에 `onPlaceConfirmed` prop 추가:
```tsx
      <PlaceDirectInputDrawer
        open={directInputOpen}
        onOpenChange={setDirectInputOpen}
        onPlaceConfirmed={handlePlaceConfirmed}
      />
```

- [ ] **Step 3: 통합 테스트 추가**

`apps/web/src/features/post/PostDetailPage.test.tsx`의 마지막 테스트(`'드로어에 검색어를 입력하면...'`) 다음, 파일의 `});` 닫는 괄호 직전에 추가:
```tsx

  it('검색 결과에서 장소를 확정하면 연관 장소에 연결되고 드로어가 닫힌다', async () => {
    await renderPost('post-3'); // 파싱 실패 케이스 — 직접 추가가 실제로 필요한 시나리오

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));

    expect(screen.queryByPlaceholderText('장소명을 입력해주세요')).not.toBeInTheDocument();
    expect(screen.getByText('앤미')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앤미 즐겨찾기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `pnpm --filter web test -- run src/features/post/PostDetailPage.test.tsx`
Expected: PASS (10 tests)

- [ ] **Step 5: 전체 검증**

Run: `pnpm --filter web typecheck`
Expected: PASS

Run: `pnpm --filter web test`
Expected: PASS (모든 기존 테스트 포함)

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/post/components/RelatedPlacesSection.tsx apps/web/src/features/post/PostDetailPage.tsx apps/web/src/features/post/PostDetailPage.test.tsx
git commit -m "feat(post): 직접 확정한 장소를 연관 장소에 연결"
```

---

## Task 5: 브라우저 수동 검증

이전 태스크(직접 입력 드로어)에서 자동 테스트만으로는 못 잡은 실제 버그(vaul 드래그 판정, 배경 스크롤 고정)가 있었다 — 이번에 새로 추가되는 snapPoints 기반 collapsed/expanded 전환과 중첩된 오버레이(장소 상세 위에 이미지 뷰어)도 같은 방식으로 실제 브라우저에서 확인한다.

- [ ] **Step 1**: 개발 서버에서 게시물 상세(예: `/post/post-3`, 연관 장소 없음)로 이동, "직접 추가" → 검색 → 결과 클릭 → 장소 상세(collapsed)가 뜨는지 확인.
- [ ] **Step 2**: collapsed 상태에서 위로 끌어올려 expanded(풀페이지)로 전환되는지, 게시물이 캐러셀 → 2열 그리드로 바뀌는지 확인.
- [ ] **Step 3**: 게시물 썸네일 클릭 → `PostImageViewer` 가 뜨는지, 뒤로가기를 누르면 장소 상세로 정확히 돌아오는지 확인.
- [ ] **Step 4**: 배경 페이지를 스크롤한 채로 드로어를 연 상태에서 collapsed/expanded 양쪽 모두 끌어내리기(dismiss)가 되는지 확인(Task 3 이전에 고쳤던 `documentElement` 스크롤 고정 로직이 snapPoints 모드에서도 그대로 동작하는지).
- [ ] **Step 5**: "추가하기" 클릭 → 드로어가 닫히고 `PostDetailPage`의 연관 장소 목록에 해당 장소가 파란 북마크 상태로 나타나는지 확인.
- [ ] **Step 6**: 위 확인 중 문제가 있으면 여기서 수정하고 관련 태스크의 커밋에 fixup 하지 말고 별도 `fix(post): ...` 커밋으로 남긴다(지금까지 세션 컨벤션과 동일).
