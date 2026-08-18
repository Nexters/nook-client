# 아카이브 공유 3·4단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유 게시물 상세(+단건 저장 → 내 게시물 전환), 공유 장소 시트, 공유 드로어 시안 반영까지 — 공유 기능 전체를 한 브랜치에서 완결한다.

**Architecture:** 1·2단계와 동일 — 공유 컨텍스트 분기는 라우트/쿼리파라미터 레벨에서 끝내고, 페이지는 기존 presentational 조각을 조립한다. 단건 저장은 save API(+메모 시 기존 메모 수정 API 2단계 조합) 후 **기존 게시물 상세(`/post/{postId}?entry=share`)로 replace 전환**한다 — 공유 상세에 "저장 후 편집 모드"를 만들지 않는다.

**Tech Stack:** React 19 + react-router-dom + TanStack Query + vitest/@testing-library/react. HTTP는 자체 `ApiClient`(요청 단위 `auth` 옵션), orval 생성 함수 사용.

**Spec:** `docs/superpowers/specs/2026-08-18-archive-share-design.md` (§7.2·§7.3·§7.4 는 2026-08-20 개정 반영본)

## Global Constraints

- 이 계획은 `feat/archive-share` 브랜치에서 1·2단계 위에 이어서 작업한다. 워크트리 금지.
- 카카오톡·인스타그램 스토리 공유는 범위 밖(§13) — 드로어에는 시안의 프리뷰 카드 + 링크 복사 + 더보기(`navigator.share`)까지만.
- 재방문한 공유 게시물(이미 저장됨, `groups` 비어있지 않음)의 칩은 **읽기 전용 표시** — 재저장 시트를 열지 않는다(서버 재호출 동작 미확정, §13).
- 서버 색상 매핑은 기존 `SERVER_TO_UI_COLOR` 계열 export 만 사용. 낙관적 갱신 금지, `invalidateQueries` 프리픽스 컨벤션 유지.
- 공개 조회는 `auth` 옵션 생략(기본 `'none'`), 게시물 상세만 `'optional'`, 쓰기는 `{ auth: 'required' }`.
- `/shared/...` 계열 라우트는 전부 `<AwaitSession>` 래핑 (부트스트래핑 중 `useIsAuthenticated()` 오판 방지 — 1·2단계 최종 리뷰에서 확정된 규칙).
- 새 코드 주석은 한국어, 비자명한 WHY 만. 사용자 노출 문구는 스펙 §11 표와 시안 문구 그대로.
- 각 Task 종료 시 `cd apps/web && pnpm test` 전체 그린 + 저장소 루트 `pnpm typecheck` 통과 후 커밋.
- 테스트는 기존 컨벤션: feature api 모듈 `vi.mock`, 페이지 레벨 실제 렌더링, mutation 인자 검증은 `.mock.calls[0]?.[0]` 이디엄(TanStack v5 가 mutationFn 에 두 번째 context 인자를 넘긴다).

---

### Task 1: 잔짐 정리 — API 스냅샷 커밋 + `.env.example`

기계적 작업이라 TDD 없음. 현재 작업 트리에 미커밋 상태인 api:refresh 산출물(단건 저장
API + 무관하게 딸려온 지도 장소검색 API)을 커밋하고, base URL 이중 결합 이슈의 재발을
막기 위해 `.env.example` 을 갱신한다.

**Files:**
- Commit (이미 수정됨): `packages/api-contracts/openapi/nook-dev.openapi.json`, `apps/web/src/shared/api/generated/**`
- Modify: `apps/web/.env.example`

**Interfaces:**
- Consumes: 없음.
- Produces: 생성 함수 `save(shareToken: string, sharedPostId: number, body: SaveSharedPostRequest, options?)` → `ApiResponseSaveSharedPostResponse`(`{ postId: number }`). Task 3이 사용.

- [ ] **Step 1: `.env.example` 수정**

`VITE_API_BASE_URL=/api/v1` 줄과 그 주석을 수정한다:

```
# BE API 베이스 URL — **오리진(또는 프록시 루트)만**. 생성된 API 경로가
# `/api/v1/...`·`/api/public/v1/...` 전체 경로를 이미 포함하므로 path 를 넣으면
# 이중 결합된다 (예: /api/v1/api/public/v1/...).
# 로컬 dev 는 vite 프록시(/api → api-dev)를 거친다. BE 가 CORS 를 열기 전까지
# 브라우저에서 직접 호출하면 preflight(OPTIONS)가 401 로 막힌다.
VITE_API_BASE_URL=/
```

- [ ] **Step 2: 검증**

Run: `pnpm typecheck` (루트) 및 `cd apps/web && pnpm test src/shared/api`
Expected: PASS (스냅샷 갱신이 기존 생성 코드 계약을 깨지 않았는지 확인)

- [ ] **Step 3: 커밋**

```bash
git add packages/api-contracts/openapi apps/web/src/shared/api/generated apps/web/.env.example
git commit -m "chore(api): 단건 저장 API 스냅샷 반영, base URL 이중 결합 예방 문서화"
```

---

### Task 2: 공유 드로어 시안 반영 (`ShareSheet` v2)

Figma `138:6075` — 프리뷰 카드(썸네일 + 이름/설명 오버레이 + 색 스와치·이름·핸들·N Places)
+ 공유 수단 아이콘 행. 카카오톡·스토리는 범위 밖이라 **링크 복사 + 더보기 두 개만** 그린다.

**Files:**
- Modify: `apps/web/src/features/share/components/ShareSheet.tsx`
- Modify: `apps/web/src/features/share/lib/shareUrl.ts` (`shareViaSystem` 추가)
- Modify: `apps/web/src/features/archive/ArchiveDetailPage.tsx` (archive prop 전달)
- Modify: `apps/web/src/features/share/SharedArchivePage.tsx` (archive prop 전달)
- Test: `apps/web/src/features/archive/ArchivePage.test.tsx`, `apps/web/src/features/share/SharedArchivePage.test.tsx` (기존 케이스 보강)

**Interfaces:**
- Consumes: `Archive`(name/color/thumbnails/placeCount/owner), `Thumbnail`/`COLOR_BG_CLASS`(`@/shared/ui`), 기존 `copyText`.
- Produces:
  - `ShareSheetProps` 확장: `{ open, onOpenChange, url, archive: Archive }` — archive 는 프리뷰 카드용.
  - `shareViaSystem({ title, url }: { title: string; url: string }): Promise<boolean>` — `navigator.share` 시도, 미지원·거부 시 `false`.

- [ ] **Step 1: 실패하는 테스트 작성**

`ArchivePage.test.tsx`의 기존 공유 시트 케이스("더보기 메뉴의 아카이브 공유는 링크를 발급해
공유 시트를 연다")에 프리뷰 카드 검증을 보강:

```tsx
    // 시트에 조립된 공유 URL 대신 시안의 프리뷰 카드와 공유 수단이 보인다.
    expect(await screen.findByText('링크 복사')).toBeInTheDocument();
    expect(screen.getByText('더보기')).toBeInTheDocument();
    // 프리뷰 카드 — 아카이브 이름과 개수 요약.
    expect(screen.getByText('114 Places')).toBeInTheDocument();
```

(기존 단언 `expect(await screen.findByText(/\/shared\/tok-123$/))` 는 URL 원문 노출이
사라지므로 위 단언으로 교체한다.)

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/archive/ArchivePage.test.tsx`
Expected: FAIL — 현재 시트는 URL 텍스트 + 버튼 하나뿐.

- [ ] **Step 3: 구현**

`shareUrl.ts`에 추가:

```ts
/**
 * OS 공유 시트("더보기"). WKWebView·모바일 브라우저는 navigator.share 를 지원한다 —
 * 미지원(구형 데스크톱)이거나 사용자가 취소하면 false 를 돌려주고 호출부가 무시한다.
 */
export async function shareViaSystem(data: { title: string; url: string }): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}
```

`ShareSheet.tsx` 재작성:

```tsx
import type { Archive } from '@/features/archive/types';
import { copyText, shareViaSystem } from '@/features/share/lib/shareUrl';
import { Icon16Link, Icon24More } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import { COLOR_BG_CLASS, Drawer, DrawerContent, DrawerTitle, Thumbnail } from '@/shared/ui';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 조립이 끝난 공유 URL. 발급 전에는 시트를 열지 않는다. */
  url: string;
  /** 프리뷰 카드용 — 공유하려는 아카이브 자신. */
  archive: Archive;
}

/**
 * Figma `공유 드로어`(138:6075) — 프리뷰 카드 + 공유 수단.
 * 카카오톡·스토리는 SDK 연동이 필요해 후속(§13) — 지금은 링크 복사와 OS 공유 시트만.
 */
export function ShareSheet({ open, onOpenChange, url, archive }: ShareSheetProps) {
  const { showToast } = useToast();

  const actions = [
    {
      label: '링크 복사',
      icon: <Icon16Link />,
      onSelect: async () => {
        const copied = await copyText(url);
        showToast({
          variant: 'simple',
          title: copied ? '링크를 복사했어요' : '링크를 복사하지 못했어요',
        });
        if (copied) onOpenChange(false);
      },
    },
    {
      label: '더보기',
      icon: <Icon24More />,
      onSelect: async () => {
        const shared = await shareViaSystem({ title: archive.name, url });
        if (shared) onOpenChange(false);
      },
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">아카이브 공유</DrawerTitle>
        <div className="flex flex-col gap-6 p-4 pb-8">
          {/* 프리뷰 카드 — 받는 사람이 보게 될 아카이브 요약. */}
          <div className="mx-auto flex w-full max-w-60 flex-col overflow-hidden rounded-sm border border-gray-20 bg-gray-0">
            <Thumbnail size="fluid" src={archive.thumbnails?.[0]} alt="" />
            <div className="flex flex-col gap-1 p-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-2 shrink-0 ${COLOR_BG_CLASS[archive.color]}`}
                  aria-hidden="true"
                />
                <span className="truncate text-b2 font-medium text-gray-100">{archive.name}</span>
              </span>
              <span className="font-mono text-e2 text-gray-60">
                {archive.owner ? `@${archive.owner.nickname} • ` : ''}
                {archive.placeCount} Places
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onSelect}
                className="flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-gray-10">
                  {action.icon}
                </span>
                <span className="text-e1 text-gray-80">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

주의: `Icon16Link`가 `@/shared/icons/NookIcons`에 없으면(1·2단계 사이 아이콘 개편이 있었다)
`Icon16Copy` 등 가장 가까운 기존 아이콘으로 대체하고 보고서에 남긴다 — 아이콘 추가는 이
계획의 범위가 아니다.

호출부 두 곳에 `archive` 전달:
- `ArchiveDetailPage.tsx`: `<ShareSheet open onOpenChange={...} url={shareUrl} archive={archive} />`
- `SharedArchivePage.tsx`: `<ShareSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} url={buildShareUrl(token)} archive={archive} />`

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/archive src/features/share`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/features/archive
git commit -m "feat(share): 공유 드로어를 시안대로 — 프리뷰 카드와 공유 수단"
```

---

### Task 3: share 데이터 레이어 확장 — 게시물/장소 상세 + 단건 저장

**Files:**
- Modify: `apps/web/src/features/post/api/index.ts` (`toPostDetail` export 승격)
- Modify: `apps/web/src/features/map/api/index.ts` (`fetchPlaceDetail`의 매핑을 `toPlaceDetail`로 추출·export)
- Modify: `apps/web/src/features/share/api/index.ts`, `queries.ts`
- Test: `apps/web/src/features/share/api/index.test.ts` (케이스 추가)

**Interfaces:**
- Consumes: 생성 함수 `postDetail(token, postId, options?)`, `placeDetail(token, placeId, params?, options?)`, `save(shareToken, sharedPostId, {groupIds}, options?)`; post feature `toPostDetail(dto): PostDetail`·`updatePostMemo(postId, memo)`; map feature `PlaceDetail` 모델.
- Produces:
  - post api: `export function toPostDetail(dto: SavedPostDetailResponse): PostDetail` (본문 변경 없음)
  - map api: `export function toPlaceDetail(dto: PlaceDetailResponse): PlaceDetail` — `fetchPlaceDetail`의 응답 매핑 본문을 그대로 추출, `fetchPlaceDetail`은 이를 호출 (동작 불변)
  - share api:
    - `fetchSharedPostDetail(token: string, postId: number): Promise<PostDetail>` — `{ auth: 'optional' }`
    - `fetchSharedPlaceDetail(token: string, placeId: number): Promise<PlaceDetail>` — auth 생략
    - `saveSharedPost(input: { shareToken: string; sharedPostId: number; groupIds: number[]; memo?: string }): Promise<number>` — save 호출 → 응답 postId → `memo`가 비어있지 않으면 `updatePostMemo(postId, memo)` 이어서 호출 → postId 반환
  - queries: `sharedQueryKeys.postDetail(token, postId) = ['shared', token, 'posts', postId]`, `.placeDetail(token, placeId) = ['shared', token, 'places', placeId]`; `useSharedPostDetail(token, postId)`, `useSharedPlaceDetail(token, placeId: number | null)`(null 이면 `enabled: false`), `useSaveSharedPost()`(onSuccess: `['archives']` + `sharedQueryKeys.postDetail` 무효화)

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/share/api/index.test.ts`의 `endpoints` mock 에 `postDetail`, `placeDetail`,
`save` 를 추가하고 케이스 추가:

```tsx
  it('게시물 상세는 로그인 시 저장 상태가 실리도록 optional 인증으로 조회한다', async () => {
    endpoints.postDetail.mockResolvedValue({
      resultType: 'SUCCESS',
      success: {
        postId: 5,
        canonicalUrl: 'https://instagram.com/p/x',
        groups: [],
        media: [],
        hashtags: [],
        places: [],
        processingStatus: 'COMPLETED',
        processingPercent: 100,
        placeParsingStatus: 'COMPLETED',
        savedAt: '2026-08-20T00:00:00Z',
      },
    });
    await fetchSharedPostDetail('tok-123', 5);
    expect(endpoints.postDetail).toHaveBeenCalledWith('tok-123', 5, { auth: 'optional' });
  });

  it('단건 저장은 저장 후 메모가 있으면 내 postId 로 메모 수정까지 이어 부른다', async () => {
    endpoints.save.mockResolvedValue({ resultType: 'SUCCESS', success: { postId: 123 } });
    const postId = await saveSharedPost({
      shareToken: 'tok-123',
      sharedPostId: 5,
      groupIds: [1, 2],
      memo: '지우랑 가면 좋겠다',
    });
    expect(endpoints.save).toHaveBeenCalledWith(
      'tok-123',
      5,
      { groupIds: [1, 2] },
      { auth: 'required' },
    );
    expect(postMemoMock).toHaveBeenCalledWith(123, '지우랑 가면 좋겠다');
    expect(postId).toBe(123);
  });

  it('메모가 없으면 저장만 하고 끝낸다', async () => {
    endpoints.save.mockResolvedValue({ resultType: 'SUCCESS', success: { postId: 123 } });
    await saveSharedPost({ shareToken: 'tok-123', sharedPostId: 5, groupIds: [1] });
    expect(postMemoMock).not.toHaveBeenCalled();
  });
```

`updatePostMemo`는 post feature 모듈을 부분 mock 한다 (`toPostDetail` 등 실제 구현은 유지):

```tsx
const postMemoMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/post/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/post/api')>()),
  updatePostMemo: postMemoMock,
}));
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/api/index.test.ts`
Expected: FAIL — 함수 없음.

- [ ] **Step 3: 구현**

post api — `toPostDetail`을 `export function`으로 승격 (본문 불변).
map api — `fetchPlaceDetail`의 `return { ... }` 매핑 본문을 `export function toPlaceDetail(dto: PlaceDetailResponse): PlaceDetail`로 추출하고 `fetchPlaceDetail`이 호출 (본문 불변, import 에 `PlaceDetailResponse` 타입 추가).

share api (`index.ts`):

```ts
import { toPostDetail, updatePostMemo } from '@/features/post/api';
import type { PostDetail } from '@/features/post/types';
import { toPlaceDetail } from '@/features/map/api';
import type { PlaceDetail } from '@/features/map/types';
import {
  placeDetail as sharedPlaceDetailEndpoint,
  postDetail as sharedPostDetailEndpoint,
  save as saveSharedPostEndpoint,
} from '@/shared/api'; // 기존 import 블록에 합류

/**
 * 공유 게시물 상세. 로그인 상태면 토큰을 실어(optional) 응답 groups 에
 * "내가 같은 원본을 저장해 둔 아카이브 목록"이 담긴다 — 저장 전/후 판별에 쓴다.
 */
export async function fetchSharedPostDetail(token: string, postId: number): Promise<PostDetail> {
  const dto = unwrapApiResponse(await sharedPostDetailEndpoint(token, postId, { auth: 'optional' }));
  if (!dto) throw new Error('공유 게시물 응답이 비어 있어요');
  return toPostDetail(dto);
}

export async function fetchSharedPlaceDetail(token: string, placeId: number): Promise<PlaceDetail> {
  const dto = unwrapApiResponse(await sharedPlaceDetailEndpoint(token, placeId));
  if (!dto) throw new Error('공유 장소 응답이 비어 있어요');
  return toPlaceDetail(dto);
}

/**
 * 공유 게시물 단건 저장. save 바디에 memo 필드가 없어(계약 확인) 메모는 저장으로 얻은
 * 내 postId 에 기존 메모 수정 API 를 이어 붙이는 2단계 조합이다. 반환값은 내 postId —
 * 호출부가 기존 게시물 상세(`/post/{postId}`)로 전환하는 데 쓴다.
 */
export async function saveSharedPost(input: {
  shareToken: string;
  sharedPostId: number;
  groupIds: number[];
  memo?: string;
}): Promise<number> {
  const response = unwrapApiResponse(
    await saveSharedPostEndpoint(
      input.shareToken,
      input.sharedPostId,
      { groupIds: input.groupIds },
      { auth: 'required' },
    ),
  );
  if (!response?.postId) throw new Error('게시물을 저장하지 못했어요');
  const memo = input.memo?.trim();
  if (memo) await updatePostMemo(response.postId, memo);
  return response.postId;
}
```

queries.ts:

```ts
export const sharedQueryKeys = {
  meta: (token: string) => ['shared', token, 'meta'] as const,
  posts: (token: string) => ['shared', token, 'posts'] as const,
  places: (token: string) => ['shared', token, 'places'] as const,
  postDetail: (token: string, postId: number) => ['shared', token, 'posts', postId] as const,
  placeDetail: (token: string, placeId: number) => ['shared', token, 'places', placeId] as const,
};

export function useSharedPostDetail(token: string, postId: number) {
  return useQuery({
    queryKey: sharedQueryKeys.postDetail(token, postId),
    queryFn: () => fetchSharedPostDetail(token, postId),
    retry: false,
  });
}

/** placeId 는 ?placeId= 쿼리에서 오므로 없을 수 있다 — 그동안은 조회를 끈다. */
export function useSharedPlaceDetail(token: string, placeId: number | null) {
  return useQuery({
    queryKey: sharedQueryKeys.placeDetail(token, placeId ?? -1),
    queryFn: () => fetchSharedPlaceDetail(token, placeId as number),
    enabled: placeId !== null,
    retry: false,
  });
}

export function useSaveSharedPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSharedPost,
    // 내 아카이브에 게시물이 늘었고, 공유 상세의 groups(저장 상태)도 달라졌다.
    onSuccess: (_postId, variables) => {
      queryClient.invalidateQueries({ queryKey: archiveQueryKeys.list });
      queryClient.invalidateQueries({
        queryKey: sharedQueryKeys.postDetail(variables.shareToken, variables.sharedPostId),
      });
    },
  });
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share src/features/post src/features/map`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/features/post/api/index.ts apps/web/src/features/map/api/index.ts
git commit -m "feat(share): 공유 게시물·장소 상세 조회와 단건 저장 데이터 레이어"
```

---

### Task 4: 단건 저장 바텀시트 (`SavePostSheet`)

v2 시안 — 새 아카이브 생성 행 + 내 아카이브 선택 목록(다중) + 메모 입력 + [저장하기].
저장 실행은 props 주입(스펙 §7.4) — 시트는 API 를 모른다.

**Files:**
- Create: `apps/web/src/features/share/components/SavePostSheet.tsx`
- Test: `apps/web/src/features/share/components/SavePostSheet.test.tsx`

**Interfaces:**
- Consumes: `useArchives()`(자동 게스트 게이팅), `ArchiveSelectRow { archive, selected, onSelectedChange }`, `ArchiveCreateRow { onClick, label? }`(dev 전용 → 프로덕션 승격), `Drawer`/`DrawerContent`/`DrawerTitle`/`Input`/`Button`(`@/shared/ui`), `useCreateArchive()`.
- Produces:
  - `SavePostSheet({ open, onOpenChange, onSave, pending }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (input: { groupIds: number[]; memo?: string }) => void; pending: boolean })`
  - 내부 규칙: OWNED 아카이브만 목록에 표시(SHARED 에는 저장 불가), 선택 0개면 저장하기 비활성, 메모 25자 제한(`MemoSheet`와 동일), "새 아카이브 생성"은 인라인 생성이 아니라 이름 입력 → `useCreateArchive` → 목록 갱신 후 자동 선택이 아닌 **기존 ArchiveFormPage 로 보내지 않고 시트 안에서 최소 UI** 로 하면 스코프가 커진다 — v1 은 `ArchiveCreateRow` 탭 시 `/archive/new` 로 이동(시트 닫힘)으로 단순화하고 주석으로 남긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// apps/web/src/features/share/components/SavePostSheet.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '@/features/archive/types';
import { SavePostSheet } from './SavePostSheet';

const archivesMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/archive/api', () => ({ fetchArchives: archivesMock }));

const MY_ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' },
  { id: 2, name: '토요일 모임 장소', color: 'blue', placeCount: 1, accessType: 'OWNED' },
  {
    id: 3,
    name: '지우랑 놀러가고 싶은 곳',
    color: 'cement',
    placeCount: 12,
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
  },
];

function renderSheet(onSave = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SavePostSheet open onOpenChange={() => {}} onSave={onSave} pending={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onSave;
}

describe('SavePostSheet', () => {
  beforeEach(() => {
    archivesMock.mockReset().mockResolvedValue(MY_ARCHIVES);
  });

  it('내 아카이브(OWNED)만 목록에 보여준다 — 공유받은 아카이브에는 저장할 수 없다', async () => {
    renderSheet();
    expect(await screen.findByText('카페')).toBeInTheDocument();
    expect(screen.queryByText('지우랑 놀러가고 싶은 곳')).not.toBeInTheDocument();
  });

  it('아카이브를 고르기 전에는 저장하기가 비활성이고, 고르면 선택과 메모를 담아 저장한다', async () => {
    const onSave = renderSheet();
    const submit = await screen.findByRole('button', { name: '저장하기' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByText('카페'));
    fireEvent.click(screen.getByText('토요일 모임 장소'));
    fireEvent.change(screen.getByPlaceholderText('추가로 메모하고 싶은 내용이 있나요?'), {
      target: { value: '지우랑 가면 좋겠다' },
    });
    fireEvent.click(submit);

    expect(onSave).toHaveBeenCalledWith({ groupIds: [1, 2], memo: '지우랑 가면 좋겠다' });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/components/SavePostSheet.test.tsx`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 3: 구현**

```tsx
// apps/web/src/features/share/components/SavePostSheet.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchives } from '@/features/archive/api/queries';
import { ArchiveCreateRow } from '@/features/archive/components/ArchiveCreateRow';
import { ArchiveSelectRow } from '@/features/archive/components/ArchiveSelectRow';
import { Button, Drawer, DrawerContent, DrawerTitle, Input } from '@/shared/ui';

/** 메모 최대 길이 — 게시물 메모(`MemoSheet`)와 동일. */
const MEMO_MAX_LENGTH = 25;

interface SavePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 저장 실행은 호출부 몫 — 시트는 API 를 모른다 (향후 일반 저장 플로우에서 재사용). */
  onSave: (input: { groupIds: number[]; memo?: string }) => void;
  pending: boolean;
}

/** Figma `게시물 저장 시트` — 아카이브 다중 선택 + 메모 입력. */
export function SavePostSheet({ open, onOpenChange, onSave, pending }: SavePostSheetProps) {
  const navigate = useNavigate();
  const { data: archives } = useArchives();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(new Set());
  const [memo, setMemo] = useState('');

  // 공유받은(SHARED) 아카이브는 남의 소유라 저장 대상이 아니다.
  const ownedArchives = archives?.filter((archive) => archive.accessType === 'OWNED') ?? [];

  const toggle = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">내 아카이브에 저장</DrawerTitle>
        <div className="flex flex-col gap-4 p-4 pb-8">
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {/* TODO(후속): 시트 안 인라인 생성 — v1 은 생성 화면으로 보낸다(시트는 닫힌다). */}
            <ArchiveCreateRow onClick={() => navigate('/archive/new')} />
            {ownedArchives.map((archive) => (
              <ArchiveSelectRow
                key={archive.id}
                archive={archive}
                selected={selectedIds.has(archive.id)}
                onSelectedChange={(selected) => toggle(archive.id, selected)}
              />
            ))}
          </div>

          <Input
            value={memo}
            maxLength={MEMO_MAX_LENGTH}
            placeholder="추가로 메모하고 싶은 내용이 있나요?"
            onChange={(event) => setMemo(event.target.value)}
          />

          <Button
            size="lg"
            fullWidth
            disabled={selectedIds.size === 0 || pending}
            onClick={() =>
              onSave({
                groupIds: [...selectedIds],
                memo: memo.trim() ? memo.trim() : undefined,
              })
            }
          >
            저장하기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

주의: `Input`의 실제 props(`placeholder`/`maxLength`/`onChange`)는 `shared/ui/input.tsx`를
읽고 맞춘다 — 시그니처가 다르면 그쪽 컨벤션을 따르고 테스트의 셀렉터를 조정한다.

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share
git commit -m "feat(share): 게시물 단건 저장 바텀시트"
```

---

### Task 5: 공유 게시물 상세 (`SharedPostDetailPage`) + 라우트 + 카드 연결

`/shared/:token/post/:postId`. 저장 전 화면 + 저장 성공 시 `/post/{myPostId}?entry=share`
replace 전환. 재방문(이미 저장됨)은 칩 읽기 전용.

**Files:**
- Create: `apps/web/src/features/share/SharedPostDetailPage.tsx`
- Modify: `apps/web/src/app/router.tsx` (라우트 추가, `AwaitSession` 래핑)
- Modify: `apps/web/src/features/share/SharedArchivePage.tsx` (게시물 카드 탭 연결)
- Modify: `apps/web/src/features/archive/ArchiveDetailPage.tsx` (SHARED 게시물 카드 탭 연결)
- Test: `apps/web/src/features/share/SharedPostDetailPage.test.tsx`

**Interfaces:**
- Consumes: Task 3 `useSharedPostDetail`/`useSaveSharedPost`, Task 4 `SavePostSheet`,
  `PostImages { images, onImageClick }`, `OriginalPostLink { label, href }`,
  `PlaceRow { place, onClick? }`(북마크 콜백 미전달 = 토글 미노출), `formatAuthorHandle`(post api),
  `useLoginGate`, `shareErrorMessage`, `PinnedHeaderLayout`/`Header`/`BackButton`/`Button`.
- Produces: 라우트 `/shared/:token/post/:postId`. 카드 탭 연결로 1·2단계의 `TODO(3단계)`
  두 곳(`SharedArchivePage.tsx`, `ArchiveDetailPage.tsx`)이 실제 내비게이션이 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// apps/web/src/features/share/SharedPostDetailPage.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@/features/post/types';
import { ToastProvider } from '@/shared/toast';
import { SharedPostDetailPage } from './SharedPostDetailPage';

const mocks = vi.hoisted(() => ({
  fetchSharedPostDetail: vi.fn(),
  saveSharedPost: vi.fn(),
}));
vi.mock('@/features/share/api', () => mocks);

const session = vi.hoisted(() => ({ status: 'anonymous' as 'anonymous' | 'authenticated' }));
vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useAuthSession: () => ({ status: session.status }),
  useIsAuthenticated: () => session.status === 'authenticated',
}));

const archivesMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/archive/api', () => ({ fetchArchives: archivesMock }));

const DETAIL: PostDetail = {
  id: 5,
  title: '지금 가기 좋은 초록뷰 카페',
  body: '초록뷰가 아름다운 카페',
  memo: '지우랑 가면 좋겠다',
  images: [],
  archives: [],
  places: [],
  authorHandle: '@nook.official',
  canonicalUrl: 'https://instagram.com/p/x',
  processingStatus: 'COMPLETED',
  placeParsingStatus: 'COMPLETED',
} as unknown as PostDetail;
// ↑ PostDetail 실제 필드는 features/post/types.ts 를 열어 맞춘다 — 다르면 픽스처를 실제
//   타입으로 수정한다 (as unknown as 캐스팅은 최종 코드에 남기지 말 것).

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/shared/tok-123/post/5']}>
          <Routes>
            <Route path="/shared/:token/post/:postId" element={<SharedPostDetailPage />} />
            <Route path="/post/:postId" element={<div>내 게시물 상세</div>} />
            <Route path="/login" element={<div>로그인 화면</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SharedPostDetailPage', () => {
  beforeEach(() => {
    session.status = 'anonymous';
    mocks.fetchSharedPostDetail.mockReset().mockResolvedValue(DETAIL);
    mocks.saveSharedPost.mockReset().mockResolvedValue(123);
    archivesMock.mockReset().mockResolvedValue([
      { id: 1, name: '카페', color: 'yellow', placeCount: 3, accessType: 'OWNED' },
    ]);
  });

  it('공유자 메모를 읽기 전용으로 그린다 — 수정 버튼이 없다', async () => {
    renderPage();
    expect(await screen.findByText('지우랑 가면 좋겠다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수정/ })).not.toBeInTheDocument();
  });

  it('비로그인 저장 칩은 로그인 월을 띄운다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 저장은 시트에서 고른 아카이브로 저장하고 내 게시물 상세로 전환한다', async () => {
    session.status = 'authenticated';
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /아카이브에 저장/ }));
    fireEvent.click(await screen.findByText('카페'));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(await screen.findByText('내 게시물 상세')).toBeInTheDocument();
    expect(mocks.saveSharedPost.mock.calls[0]?.[0]).toEqual({
      shareToken: 'tok-123',
      sharedPostId: 5,
      groupIds: [1],
      memo: undefined,
    });
  });

  it('이미 저장한 게시물은 칩이 읽기 전용 표시다 — 시트가 열리지 않는다', async () => {
    session.status = 'authenticated';
    mocks.fetchSharedPostDetail.mockResolvedValue({
      ...DETAIL,
      archives: [{ id: 1, name: '카페', color: 'yellow' }],
    });
    renderPage();
    expect(await screen.findByText(/「카페」에 저장/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /아카이브에 저장/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/SharedPostDetailPage.test.tsx`
Expected: FAIL — 페이지 없음.

- [ ] **Step 3: 구현**

`SharedPostDetailPage.tsx` — 조립 지침 (정확한 마크업은 v2 시안 `201:25085` 저장 전
프레임 기준, `PostDetailPage`의 성공 상태 레이아웃을 본뜬다):

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PinnedHeaderLayout } from '@/app/layouts/PinnedHeaderLayout';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { PlaceRow } from '@/features/place';
import { formatAuthorHandle } from '@/features/post/api';
import { OriginalPostLink } from '@/features/post/components/OriginalPostLink';
import { PostImages } from '@/features/post/components/PostImages';
import { useToast } from '@/shared/toast';
import { BackButton, Button, Header } from '@/shared/ui';
import { useSaveSharedPost, useSharedPostDetail } from './api/queries';
import { SavePostSheet } from './components/SavePostSheet';
import { shareErrorMessage } from './lib/shareError';

/**
 * Figma `아카이브 공유 > 공유 게시물 상세` — 공유자의 게시물을 읽기 전용으로 보고,
 * 마음에 들면 내 아카이브에 단건 저장한다. 저장하면 그 순간부터 내 게시물이므로
 * 기존 게시물 상세(`/post/{postId}`)로 전환한다 — 이 화면에는 "저장 후 편집 모드"가 없다.
 */
export function SharedPostDetailPage() {
  const { token = '', postId: postIdParam } = useParams();
  const sharedPostId = Number(postIdParam);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { gate, wall: loginWall } = useLoginGate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const detailQuery = useSharedPostDetail(token, sharedPostId);
  const savePost = useSaveSharedPost();

  // ... isPending → null / isError → shareErrorMessage + 에러 뷰 (SharedArchivePage 와 동일 패턴)

  const post = detailQuery.data;
  // 로그인 + 저장 이력: 공유 상세의 archives(groups)는 "내가 같은 원본을 저장한 내 아카이브".
  const alreadySaved = (post.archives?.length ?? 0) > 0;

  const handleSaveChip = () =>
    gate('아카이브 서비스는 로그인이 필요해요', () => setSheetOpen(true));

  const handleSave = (input: { groupIds: number[]; memo?: string }) =>
    savePost.mutate(
      { shareToken: token, sharedPostId, ...input },
      {
        onSuccess: (myPostId) => {
          setSheetOpen(false);
          // 저장한 순간부터 내 게시물이다 — 편집 가능한 기존 상세로 전환한다.
          // replace: 뒤로가기가 "저장 전 공유 상세"로 돌아가 상태가 어긋나지 않게.
          navigate(`/post/${myPostId}?entry=share`, { replace: true });
        },
        onError: () => showToast({ variant: 'simple', title: '게시물을 저장하지 못했어요' }),
      },
    );

  // JSX 골자:
  // <PinnedHeaderLayout header={<Header left={<BackButton />} />}>
  //   <PostImages images={post.images} onImageClick={...(PostDetailPage 의 뷰어 패턴)} />
  //   제목/캡션(더보기 접기 — PostDetailPage 인라인 패턴 복제)
  //   저장 칩 줄:
  //     {alreadySaved
  //       ? <span>「{post.archives[0].name}」{post.archives.length > 1 ? ` 외 ${post.archives.length - 1}개` : ''}에 저장</span>
  //       : <Button size="sm" variant="secondary" onClick={handleSaveChip}>아카이브에 저장 +</Button>}
  //   공유자 메모(있을 때만): 읽기 전용 <p> — 수정 버튼·EditableTextRow 미사용
  //   <OriginalPostLink label={formatAuthorHandle(...)} href={post.canonicalUrl} />
  //   "게시물에 포함된 장소": post.places 를 PlaceRow 로 — bookmarked/onBookmarkedChange/onDelete
  //     미전달(핀·삭제 미노출), onClick 은 로그인 게이트 후 `/shared/${token}?placeId=` (Task 6 연결)
  //   {loginWall}
  //   <SavePostSheet open={sheetOpen} onOpenChange={setSheetOpen} onSave={handleSave} pending={savePost.isPending} />
}
```

`PostDetail` 모델의 실제 필드명(`images`/`media`, `archives`/`groups`, `places` 등)은
`features/post/types.ts`와 `toPostDetail`을 읽고 맞춘다 — 위 골자의 필드명이 다르면 실제
모델을 따른다.

`router.tsx` — 기존 `/shared/:token` 옆에 추가:

```tsx
      {
        path: 'shared/:token/post/:postId',
        element: (
          <AwaitSession>
            <SharedPostDetailPage />
          </AwaitSession>
        ),
      },
```

카드 탭 연결 (TODO(3단계) 두 곳 교체):
- `SharedArchivePage.tsx`: `<CollectionCard ... onClick={() => navigate(`/shared/${token}/post/${post.id}`)} />`
- `ArchiveDetailPage.tsx`(SHARED 분기): `isShared ? () => navigate(`/shared/${archive.shareToken}/post/${post.id}`) : (기존 selecting 삼항)` — `shareToken`이 없으면(비정상 데이터) 기존처럼 undefined.

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share src/features/archive`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/features/archive apps/web/src/app/router.tsx
git commit -m "feat(share): 공유 게시물 상세와 단건 저장 — 저장하면 내 게시물로 전환"
```

---

### Task 6: 공유 장소 시트 (`SharedPlaceSheet`) + 장소 카드 연결

`/shared/:token?placeId={id}` — MapPage 의 `?placeId=` 패턴. 읽기 전용 장소 상세
(공유자의 북마크/메모 편집 미노출) + 해당 공유 아카이브 안의 저장 게시물 목록.

**Files:**
- Create: `apps/web/src/features/share/components/SharedPlaceSheet.tsx`
- Modify: `apps/web/src/features/share/SharedArchivePage.tsx` (?placeId= 파싱 + 시트 + 장소 카드 탭)
- Modify: `apps/web/src/features/share/SharedPostDetailPage.tsx` (장소 행 탭 연결)
- Modify: `apps/web/src/features/archive/ArchiveDetailPage.tsx` (SHARED 장소 카드 탭 연결)
- Test: `apps/web/src/features/share/SharedArchivePage.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: Task 3 `useSharedPlaceDetail`, `PlaceDetailHeader { place, recognized?, bookmarked?, onBookmarkedChange?, info?, className? }`, `PlaceInfo { address, distance?, mapHref?, businessStatus?, businessHours?, memo?, ... }`, `PlacePhotos`, `CollectionCard`, `Drawer` 계열, `useLoginGate`, `useSearchParams`.
- Produces:
  - `SharedPlaceSheet({ token, placeId, onClose }: { token: string; placeId: number; onClose: () => void })` — 열림/닫힘은 placeId 유무가 결정.
  - `/shared/:token?placeId={id}` 딥링크 계약 — SharedArchivePage 가 파싱·소유.

- [ ] **Step 1: 실패하는 테스트 작성**

`SharedArchivePage.test.tsx`의 mocks 에 `fetchSharedPlaceDetail: vi.fn()` 추가(beforeEach
reset + resolve), 케이스 추가:

```tsx
  it('비로그인 장소 카드 탭은 로그인 월을 띄운다', async () => {
    mocks.fetchSharedArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
  });

  it('로그인 장소 카드 탭은 공유 장소 시트를 연다', async () => {
    session.status = 'authenticated';
    mocks.fetchSharedArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });
    mocks.fetchSharedPlaceDetail.mockResolvedValue({
      id: 42,
      name: '을지다락',
      address: '서울 중구 을지로',
      lat: 37.5,
      lng: 127.0,
      bookmarked: false,
      photos: [],
      tags: [],
      posts: [],
    });
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));

    expect(await screen.findByText('서울 중구 을지로')).toBeInTheDocument();
    expect(mocks.fetchSharedPlaceDetail).toHaveBeenCalledWith('tok-123', 42);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test src/features/share/SharedArchivePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: 구현**

`SharedPlaceSheet.tsx` — vaul `Drawer`(기존 `shared/ui/drawer`)로 하단 시트, 내부 조립:

```tsx
// 골자 — 정확한 마크업은 MapPage 의 PlaceDetail 렌더 구조를 참고하되 편집 요소를 뺀다.
// <Drawer open onOpenChange={(open) => !open && onClose()}>
//   <DrawerContent>
//     로딩: null / 에러: shareErrorMessage + ArchiveEmpty
//     <PlaceDetailHeader place={...} />            // bookmarked/onBookmarkedChange 미전달 → 핀 미노출
//     <PlacePhotos photos={place.photos} ... />
//     <PlaceInfo address={place.address} businessStatus={...} businessHours={...}
//                memo={place.memo} />              // onMemoEdit/onMemoChange 미전달 → 읽기 전용
//     "저장한 게시물" — place.posts 를 CollectionCard 2열 그리드로,
//       onClick={() => navigate(`/shared/${token}/post/${post.id}`)} (같은 공유 스코프 상세)
//   </DrawerContent>
// </Drawer>
```

`PlaceDetailHeader`/`PlaceInfo`의 place 타입 요구는 컴포넌트 파일을 읽고 `PlaceDetail`
모델에서 필요한 필드만 넘긴다. `place.posts`의 항목 타입(`PlaceDetailPost`)이
`CollectionCard`의 `CollectionSummary`와 안 맞으면 간단한 인라인 매핑으로 맞춘다.

`SharedArchivePage.tsx`:

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const placeIdParam = searchParams.get('placeId');
const selectedPlaceId = placeIdParam !== null && /^\d+$/.test(placeIdParam)
  ? Number(placeIdParam)
  : null;

const openPlace = (placeId: string) =>
  gate('장소를 확인하려면 로그인이 필요해요', () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('placeId', placeId);
      return next;
    }),
  );

const closePlace = () =>
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete('placeId');
    return next;
  });
```

- 장소 카드: `<PlaceCard ... onClick={() => openPlace(place.id)} />` (TODO(4단계) 교체)
- JSX 하단: `{selectedPlaceId !== null ? <SharedPlaceSheet token={token} placeId={selectedPlaceId} onClose={closePlace} /> : null}`

`SharedPostDetailPage.tsx`의 장소 행: `onClick={() => gate('장소를 확인하려면 로그인이 필요해요', () => navigate(`/shared/${token}?placeId=${place.id}`))}`

`ArchiveDetailPage.tsx`(SHARED 장소 카드, TODO(4단계) 교체):
`isShared ? () => navigate(`/shared/${archive.shareToken}?placeId=${place.id}`) : () => navigate(`/map?placeId=${place.id}`)`

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test src/features/share src/features/archive` + 루트 `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/share apps/web/src/features/archive
git commit -m "feat(share): 공유 장소 시트 — 읽기 전용 상세와 아카이브 내 게시물"
```

---

## 마무리 체크 (전체 태스크 후)

- [ ] `cd apps/web && pnpm test` / `cd apps/mobile && pnpm test` / 루트 `pnpm typecheck` 전부 그린
- [ ] 남은 `TODO(3단계)`/`TODO(4단계)` 주석이 0건인지 grep 으로 확인
- [ ] 시각 QA 는 jade 가 직접 — dev 서버에서 발신→열람→저장→전환→장소 시트 전체 플로우
- [ ] PR 은 jade 가 diff 확인할 시간을 가진 뒤 오픈 (기존 합의)
- [ ] 서버 질의 3건(§13: groups 내 postId·재저장 동작·구독 장소 게이트)은 jade 가 서버 팀에 전달
