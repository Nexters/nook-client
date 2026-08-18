# 아카이브 공유 기능 설계

- 작성일: 2026-08-18
- 브랜치: `feat/archive-share`
- 근거 자료: 서버 API 답변 문서(2026-08-17 개정), 피그마 v2 시안(`node-id=201-25085`)

## 1. 배경과 목표

아카이브(그룹) 소유자가 공유 링크를 발급하고, 링크를 받은 사람이 **비로그인 상태로도** 아카이브를
열람하며, 로그인하면 아카이브 전체를 구독하거나 게시물 단건을 내 아카이브에 저장할 수 있게 한다.

핵심 제품 정책:

- 아카이브 저장 = **구독**(완전 동기화, 복사본 없음). 데이터 소유자는 계속 공유자다.
- 게시물 단건 저장 = **독립 복제**(core 게시물 데이터는 공유하되 user_saved_posts 소유 관계 복사).
- 공유 링크는 무기한(`expiresAt: null`), 해제(revoke) 가능하나 이번 스코프의 UI에는 없음.

## 2. 스코프

### 포함

1. 공유 링크 발급 + 공유 시트(웹 UI 드로어, 링크 복사)
2. 공유 아카이브 상세 페이지 (공개) — 게시물/장소 탭
3. 로그인 복귀(returnTo) + 아카이브 구독("아카이브에 저장")
4. 아카이브 목록/상세의 SHARED 대응 (owner 표시, 편집 숨김, 상세 라우팅 분기)
5. 공유 게시물 상세 (저장 전/후 상태) + 게시물 단건 저장 바텀시트
6. 공유 장소 상세 (로그인 필요)
7. "앱에서 보기" 딥링크 배너 (커스텀 스킴)
8. 공유 에러 코드 5종 안내 처리

### 제외 (후속)

- 공유 해제(revoke) UI — 시안 없음, 서버만 준비됨
- Universal Links / App Links — 인프라 협의 후 (AASA·assetlinks 호스팅 + 앱 재배포 필요)
- 카카오톡 등 타겟 지정 공유 — 공유 시트가 웹 UI라 후속에 항목 추가로 확장
- 지도(bbox) 화면과 공유 장소의 연동 — 공유 장소 상세는 별도 페이지로 완결

## 3. 서버 계약 요약

| 용도 | 엔드포인트 | 인증 | 생성 코드 |
|---|---|---|---|
| 링크 발급 | `PUT /api/v1/groups/{groupId}/share-link` → `{token, expiresAt}` | 필수 | `issue()` |
| 링크 해제 | `DELETE /api/v1/groups/{groupId}/share-link` | 필수 | `revoke()` (미사용) |
| 아카이브 메타 | `GET /api/public/v1/groups/{token}` | 없음 | `get()` |
| 게시물 목록 | `GET .../posts?page&size` (`GroupPostPageResponse`) | 없음 | `posts()` |
| 장소 목록 | `GET .../places?page&size` (`GroupPlacePageResponse`) | 없음 | `places()` |
| 게시물 상세 | `GET .../posts/{postId}` (`SavedPostDetailResponse`) | **선택** | `postDetail()` |
| 장소 상세 | `GET .../places/{placeId}?page&size` | 없음(화면은 로그인 게이트) | `placeDetail()` |
| 구독 | `PUT /api/v1/shared-groups/{token}` (멱등) | 필수 | `subscribe()` |
| 구독 해제 | `DELETE /api/v1/shared-groups/{groupId}` | 필수 | `unsubscribe()` |
| 단건 저장 | `POST /api/v1/shared-posts/{shareToken}/{sharedPostId}/save` body `{groupIds}` → `{postId}` | 필수 | **dev 미배포** — 수동 fetcher로 선작업 |

계약상 주의점:

- 공유 게시물 상세의 `groups`는 공유자의 아카이브가 아니라 **뷰어(나)가 같은 원본을 저장해 둔 내
  아카이브 목록**이다. 토큰 없이 호출하거나 저장 이력이 없으면 `[]`. → 저장 전/후 판별에 사용.
- 공유 컨텍스트의 `bookmarked`/`memo`는 **공유자 데이터**다. 뷰어의 편집 UI를 붙이면 안 된다.
- 구독자의 재진입: 목록 탭은 기존 그룹 API(`/groups/{groupId}/posts`), **상세는 계속 public API**.
  기존 `GET /posts/{postId}`·`GET /places/{placeId}`를 공유 상세에 쓰지 않는다.
- `GroupResponse`에 `accessType: 'OWNED'|'SHARED'`, `owner`, `shareToken`(내 그룹이면 null) 추가됨.

## 4. 라우트 설계

```
/shared/:token                  SharedArchivePage      공개
/shared/:token?placeId={id}     장소 상세 시트 (MapPage 의 ?placeId= 패턴, 로그인 게이트)
/shared/:token/post/:postId     SharedPostDetailPage   공개 (로그인 시 auth 첨부)
```

- `RequireAuth` 밖, `privacy`/`terms`와 같은 층위에 등록한다.
- `/shared/:token`을 layout route로 두고 `Outlet` 하위 페이지가 `useParams`로 token을 읽는다.
  공유 링크 에러(5종) 처리도 layout 층에서 공통화한다.
- 공유 URL 조립: `${VITE_WEB_ORIGIN}/shared/${token}` (env 변수는 jade가 설정).

분기 원칙: **컨텍스트(내 것 vs 공유) 분기는 라우트 레벨에서 끝낸다.** 기존
`PostDetailPage`/`ArchiveDetailPage`에 공유 모드 if문을 심지 않고, 공유 페이지가 공용
presentational 조각을 조립한다.

## 5. 폴더 구조

```
features/share/
  SharedArchivePage.tsx
  SharedPostDetailPage.tsx
  components/
    SharedPlaceSheet.tsx      # 장소 상세 시트 (?placeId= 로 열림, PlaceSheet 조각 재사용)
    ShareSheet.tsx            # 공유 시트 (웹 UI 드로어: 링크 복사)
    SavePostSheet.tsx         # 단건 저장 바텀시트 (Drawer+ArchiveSelectRow+ArchiveCreateRow+메모)
    OpenInAppBanner.tsx       # "앱에서 보기" 배너
  api/
    index.ts                  # fetcher + DTO→모델 (archive의 toArchivePost 등 재사용)
    queries.ts                # 훅 + sharedQueryKeys
  lib/
    shareUrl.ts               # URL 조립 · 클립보드 복사 · (후속) navigator.share
    appLink.ts                # 커스텀 스킴 URL 생성 + 스토어 폴백
    shareError.ts              # errorCode → 안내 문구 매핑
```

> **2026-08-19 개정(1·2단계 구현 완료 후):** 로그인 유도는 별도 `LoginPromptPopup`을
> 새로 만들지 않고, 병렬로 main에 병합된 게스트 모드 기능의 기존 `useLoginGate()`
> (`@/features/auth/session/useLoginGate`)를 그대로 재사용했다 — 정확히 같은 문제를
> 이미 일반화된 형태로 풀어놓은 상태였다. 에러 안내도 별도 `ShareErrorView` 컴포넌트
> 대신 `lib/shareError.ts`의 `shareErrorMessage()` 매핑 함수 + 기존 `ArchiveEmpty`
> 컴포넌트 조합으로 대체했다. §11의 표는 그대로 유효하다 — 컴포넌트 이름만 실제
> 구현과 다르다.

재사용하는 기존 조각: `CollectionCard`, `PlaceCard`, `PlaceRow`, `PostImages`,
`OriginalPostLink`, `MemoSheet`, `PinnedHeaderLayout`, `Popup`, `Drawer`,
`ArchiveSelectRow`/`ArchiveCreateRow`(현재 dev 전용 → 프로덕션 승격).

## 6. 데이터 레이어

- queryKeys: `sharedQueryKeys = { meta(token), posts(token), places(token), postDetail(token, postId), placeDetail(token, placeId) }`
  — 프리픽스 `['shared', token, ...]`, 무효화는 기존 컨벤션대로 `invalidateQueries` 프리픽스.
- auth 모드 (요청 단위 `ApiRequestInit.auth` 활용, 인터셉터 불필요):
  - 메타/목록/장소 상세: `'none'`
  - 게시물 상세: `'optional'` — 로그인 시 `groups`로 저장 상태 수신
  - issue/subscribe/unsubscribe/단건 저장: `'required'`
- mutation 후 무효화:
  - `subscribe` 성공 → `['archives']` 무효화 (목록에 SHARED 카드 등장)
  - 단건 저장 성공 → `sharedQueryKeys.postDetail(token, postId)` + `['archives']` 무효화
  - `issue`는 캐시 영향 없음 (응답 토큰을 바로 사용)
- 단건 저장 API는 dev 미배포: 문서 계약대로 `features/share/api/index.ts`에 수동 fetcher를 먼저
  쓰고, 배포 후 `pnpm api:refresh`로 생성 코드 교체 (관련 메모리: shared-post-save-api-pending).

## 7. 화면 설계

### 7.1 공유 아카이브 상세 (`SharedArchivePage`)

- `ArchiveDetailPage`의 골격을 따른 별도 페이지: `PinnedHeaderLayout` + 색 스와치·이름·`by {owner.nickname}`
  + 게시물/장소 탭 + 2열 그리드 + IntersectionObserver 페이지네이션.
- 헤더 액션: 편집 메뉴 대신 **[아카이브에 저장 +] [공유]**.
  - 저장: 비로그인 → 로그인 모달("아카이브 서비스는 로그인이 필요해요") → `/login?returnTo=현재경로`.
    로그인 → `subscribe(token)` → 토스트 "아카이브에 저장됐어요! 보러가기"(action variant) →
    보러가기 시 `/archive/{meta.id}`.
  - 저장 완료 판별: 공유 메타의 `id`(groupId)가 내 `GET /groups` 목록에 존재하는지로 판별.
    한 규칙으로 **소유자**(OWNED, 자기 링크를 연 경우 — "이미 저장됨" 표시)와 **구독자**(SHARED)를
    모두 커버한다. `shareToken` 매칭은 내 그룹에서 null 이라 소유자 케이스에 쓸 수 없다.
  - 공유: `ShareSheet` 열기 (재공유 — 같은 token URL).
- 게시물 카드 탭 → `/shared/:token/post/:postId`.
- 장소 탭: **비로그인도 목록 열람 가능.** 장소 카드 탭 시 비로그인이면 로그인 모달,
  로그인이면 `?placeId=` 세팅으로 `SharedPlaceSheet` 오픈.
- 상단에 `OpenInAppBanner` (셸 웹뷰 안에서는 미노출 — `nativeBridge.platform !== 'web'`이면 숨김).

### 7.2 공유 게시물 상세 (`SharedPostDetailPage`) — v2 시안

- 조립: `PostImages` + 제목/캡션(더보기) + 저장 칩 줄 + 메모 줄 + `OriginalPostLink` +
  "게시물에 포함된 장소" 섹션(읽기 전용 `PlaceRow`, 핀 토글 미노출).
- 데이터: `postDetail(token, postId, {auth:'optional'})`.
- **저장 전** (`groups: []`): 칩 "아카이브에 저장 ∨" → 탭 시 비로그인이면 로그인 모달,
  로그인이면 `SavePostSheet`. 메모 줄에는 공유자 메모 읽기 전용(수정 버튼 미노출).
- **저장 성공 시 화면 전환** (2026-08-20 확정, jade): 공유 상세에 "저장 후 편집 모드"를
  만들지 않고, save 응답의 내 `postId`로 **기존 게시물 상세(`/post/{postId}?entry=share`)로
  전환**한다. 메모 수정·핀·아카이브 태그가 기존 화면에서 전부 완전하게 동작하고,
  "내 것이 된 게시물은 내 화면으로"라는 모델과도 맞는다. v2 시안의 "저장 후" 프레임은
  기존 게시물 상세와 사실상 같은 레이아웃이라 시안과도 어긋나지 않는다.
  - 전환은 `replace` — 뒤로가기가 "저장 전 공유 상세"로 돌아가면 방금 저장한 상태와
    화면이 어긋난다. 뒤로가기 목적지는 공유 아카이브 상세(`?entry=share` 컨텍스트,
    `useBackInterceptor` 선례).
  - 메모: save 요청 바디에 memo 필드가 없다(스키마 확인). 시트에 입력된 메모는
    save 성공 → 응답 `postId`로 기존 메모 수정 API를 이어 부르는 **2단계 조합**으로 저장한다.
- **재방문** (`groups` 비어있지 않음, 저장 직후가 아님): 공유 상세 응답의 `groups`엔
  그룹 `{id, name, color}`만 있고 내 저장본 postId가 없다(스키마 확인) — 내 게시물로
  보내거나 메모를 수정할 방법이 없다. 칩은 "「{첫 그룹}」 외 N개에 저장" **읽기 전용 표시**까지만
  하고, 메모 줄은 공유자 메모 읽기 전용 유지. 서버에 `groups` 항목 내 postId 포함을
  질의하고(§13), 반영되면 재방문 시에도 내 게시물로 전환하도록 후속 개선한다.
- 장소 행 탭: 비로그인이면 로그인 모달, 로그인이면 `/shared/{token}?placeId={id}` 로 이동
  (`SharedPlaceSheet`).

### 7.3 공유 장소 상세 (`SharedPlaceSheet`)

- 별도 라우트 대신 **`/shared/:token?placeId={id}` 쿼리 파라미터로 여는 시트** (MapPage 의
  `?placeId=` 패턴과 동일 — 딥링크·뒤로가기가 URL 에 보존됨).
- 조립: `features/place`의 presentational 조각(`PlaceDetailHeader`, `PlaceInfo`, `PlacePhotos`) +
  "저장한 게시물" 목록. 데이터는 public 장소 상세 API — 게시물 목록이 **해당 공유 아카이브 안의
  게시물**로 내려와 "연결된 게시물 확인" 요구를 만족한다.
- 기존 지도 화면(`/map?placeId=`)으로 보내지 않는 이유: 기존 장소 상세 API 는 뷰어 소유
  데이터(북마크·내 저장 게시물 연결)가 아니면 404 이고, 게시물 섹션도 뷰어 본인 기준이라
  공유 장소에서는 비거나 실패한다. 서버가 구독 장소의 게이트 통과를 지원하게 되면 그때
  실제 지도 화면 연결로 전환한다 (§13 질의).
- `bookmarked`/`memo`는 공유자 데이터 → 북마크 토글·메모 편집 미노출.
- 진입은 로그인 게이트: 장소 카드/행 탭 시 비로그인이면 로그인 모달 (7.1·7.2에서 처리).

### 7.4 단건 저장 바텀시트 (`SavePostSheet`)

- `Drawer` + `ArchiveCreateRow`(새 아카이브 생성 → 기존 `useCreateArchive`) +
  `ArchiveSelectRow` 목록(`useArchives`, **OWNED만** 표시 — SHARED에는 저장 불가) +
  메모 입력(25자, `MemoSheet` 패턴) + [저장하기].
- 저장: `savePost(shareToken, sharedPostId, {groupIds})` → 메모가 입력됐으면 응답 `postId`로
  메모 수정 API를 이어 호출(2단계 조합, §7.2) → 시트 닫기 + `/post/{postId}?entry=share` 전환.
- 이미 저장된 그룹은 체크 표시 (`groups` 필드 기준). 재저장(그룹 재지정)의 서버 동작은
  미확정(§13)이라 v1 에서는 이미 저장된 게시물의 칩을 읽기 전용으로 두고 시트를 다시 열지 않는다.
- share 전용이 아니라 향후 웹 내 일반 저장 플로우에서 재사용 가능하도록 props로 저장 실행을 주입.

### 7.5 공유 시트 (`ShareSheet`) — 발신

- 진입: `ArchiveDetailMenu`의 TODO 자리 복원("아카이브 공유" + `Icon16Share`) 및
  공유 아카이브 상세의 [공유] 버튼.
- 동작: `issue(groupId)` → URL 조립 → 드로어에 URL 표시 + [링크 복사](Clipboard API) + 복사 토스트.
- 공유 실행은 `lib/shareUrl.ts` 함수로 추상화 — 수단이 바뀌어도(OS 시트, 카카오) 호출부 불변.

## 8. 로그인 복귀 (returnTo)

- `RedirectAuthenticated`: `?returnTo=` 쿼리가 있으면 `/map` 대신 그 경로로 replace.
  내부 경로만 허용(`/`로 시작, `//` 금지)하는 검증 포함.
- 공유 화면의 로그인 모달 확인 → `/login?returnTo=${encodeURIComponent(현재 경로)}`.
- 로그인 후 **복귀까지만**. 저장/구독 자동 이어하기는 하지 않는다(YAGNI, 시안에도 없음).

## 9. 기존 화면 변경

1. `toArchive()` 매핑 확장: `accessType`, `shareToken`, `owner` 보존.
2. 아카이브 목록 카드: `accessType === 'SHARED'`면 `owner.profileImageUrl`·`nickname` 표시.
3. `ArchiveDetailPage`(구독한 SHARED 아카이브 재진입):
   - 편집·선택 삭제 메뉴 숨김, `by {owner.nickname}` 표시.
   - 게시물 카드 탭 → `/shared/{shareToken}/post/{postId}`, 장소 카드 탭 →
     `/shared/{shareToken}?placeId={id}`로 **라우팅만 분기** (목록 데이터는 기존 그룹 API 유지).
   - 메뉴에 "내 목록에서 제거"(`unsubscribe(groupId)` → `['archives']` 무효화 + 토스트) 추가.
4. `ArchiveDetailMenu`: OWNED일 때 "아카이브 공유" 항목 복원.

## 10. 딥링크 — "앱에서 보기" (방법 A)

- 웹: `OpenInAppBanner` → `kr.co.everynook.app://shared/{token}`으로 이동 시도,
  1.5초 내 페이지 이탈 없으면 스토어로 폴백.
- 모바일: `appLink.ts` 화이트리스트에 `shared/{token}` 규칙 추가
  (`segments.length === 2 && segments[0] === 'shared'` + token 형식 검증 → `/shared/{token}`).
  token은 path 세그먼트라 기존 "쿼리 있으면 거부" 규칙과 충돌 없음.
- dev 스킴(`kr.co.everynook.app.dev:`)도 동일 처리.
- Universal Links(방법 B)는 후속 — 방법 A가 선행 작업으로 그대로 유효.

## 11. 에러 처리

`/shared/:token` layout 층에서 메타 조회 에러를 공통 처리한다. `ApiClientError.code` 기준:

| errorCode | HTTP | 처리 |
|---|---|---|
| `SHARE_LINK_NOT_FOUND` | 404 | `shareErrorMessage()`+`ArchiveEmpty` "유효하지 않은 공유 링크예요." |
| `SHARE_LINK_REVOKED` | 410 | `shareErrorMessage()`+`ArchiveEmpty` "공유가 해제된 아카이브예요." |
| `SHARE_LINK_EXPIRED` | 410 | `shareErrorMessage()`+`ArchiveEmpty` "공유 기간이 만료된 아카이브예요." |
| `SHARED_GROUP_UNAVAILABLE` | 410 | `shareErrorMessage()`+`ArchiveEmpty` "더 이상 볼 수 없는 아카이브예요." |
| `SHARED_RESOURCE_NOT_FOUND` | 404 | 상세 화면 에러 뷰 (게시물/장소 없음) |
| 그 외 | - | 기존 패턴(범용 에러 뷰/토스트) |

구독한 아카이브가 해제된 경우: 기존 그룹 API가 목록을 주더라도 상세(public)가 410을 반환하므로
같은 `shareErrorMessage()`+`ArchiveEmpty`로 수렴한다.

## 12. 배포 단계

1. **발신 + 공개 열람**: §7.5 공유 시트, §4 라우트, §7.1 아카이브 상세(게시물/장소 탭), §11 에러.
   이것만으로 링크 공유·열람이 성립 → 1차 배포 가능.
2. **구독**: §8 returnTo, 구독 mutation, §9 목록/상세 SHARED 대응, §10 딥링크 배너.
3. **게시물 상세 + 단건 저장**: §7.2, §7.4. (단건 저장 API dev 배포 후 완결)
4. **장소 상세**: §7.3.

각 단계는 TDD로 진행하고, 단계 종료 시 기존 검증(`pnpm typecheck`, 테스트) 통과 확인.

## 13. 미확정/대기 항목

- [x] 단건 저장 API dev 배포 → `pnpm api:refresh` (2026-08-20 배포 확인·스냅샷 반영 완료.
      바디는 `{groupIds}` 뿐 — memo 필드 없음 → §7.2 의 2단계 조합으로 확정)
- [ ] 공유 상세 `groups` 항목에 내 저장본 postId 포함 서버 질의 (§7.2 재방문 개선용 —
      v1 은 재방문 시 읽기 전용 표시로 출시)
- [ ] 단건 저장 재호출(그룹 재지정) 시 서버 동작 질의 — 멱등 병합인지, 기존 저장본의
      `replaceGroups`(`PUT /posts/{postId}/groups`)를 써야 하는지 (§7.4 — v1 은 재저장
      UI 를 열지 않는 것으로 우회)
- [ ] 구독한 아카이브의 장소가 기존 장소 상세(`GET /places/{placeId}`) 게이트를 통과하는지
      서버 질의 — 통과 + 게시물 섹션까지 지원되면 §7.3 을 실제 지도 화면 연결로 전환
- [ ] `VITE_WEB_ORIGIN` env 설정 (jade)
- [ ] Universal Links 인프라 협의 (후속)
- [ ] 공유 드로어의 카카오톡·인스타그램 스토리 공유 (SDK 연동 필요 — 후속.
      3·4단계에서는 시안의 프리뷰 카드 + 링크 복사 + 더보기(`navigator.share`)까지만)
