# nook-client

취향 기반 장소 아카이빙 서비스, nook — 앱 클라이언트.

## 스택

| 항목         | 선택                                         |
| ------------ | -------------------------------------------- |
| 빌드/패키지  | pnpm workspace + Vite (web)                  |
| 크로스플랫폼 | Expo(RN) 셸 + `react-native-webview` (원격 웹) |
| 서버 상태    | TanStack Query                               |
| 클라 상태    | zustand                                      |
| 라우팅       | React Router v7 (SPA)                        |
| 언어         | TypeScript                                   |
| 린트/포맷    | Biome                                        |
| 테스트       | Vitest + Testing Library                     |
| CI           | GitHub Actions                               |

얇은 Expo 셸이 원격 웹(app.nook.com)을 WebView 로 띄우고, 웹이 서비스 본체다. 셸은 WebView 가 못 하는 네이티브 접점만 담당한다.

## 구조 (모노레포)

```
apps/
├── web/                     # Vite SPA — 서비스 본체 (화면 전부)
│   └── src/
│       ├── app/             # 진입 배선: App, router, providers, queryClient
│       ├── features/        # 기능 단위 폴더 (home/ …)
│       ├── native-bridge/   # 셸 통신 클라이언트 (postMessage 프로토콜)
│       ├── shared/api/      # http 래퍼 (BE 호출 기반)
│       │   └── generated/   # Orval 생성 DTO·API 함수
│       ├── shared/config/   # env 게이트
│       └── styles/
└── mobile/                  # Expo(RN) 셸 — WebView + 네이티브 공유 대상

packages/
├── api-contracts/           # OpenAPI 스냅샷과 Orval 생성 설정
├── bridge-contracts/        # 셸 ↔ 웹 메시지 계약 (SSOT, 타입 전용)
└── icons/                   # Web·iOS·Android 공용 SVG와 코드 생성기

docs/
├── ops/                     # 현재 유효한 운영 규칙·빌드/배포 가이드
└── tickets/                 # 티켓별 작업 기록 (당시 시점 기록)
```

- pnpm 워크스페이스: `apps/*` + `packages/*` (web·mobile·계약을 한 락으로 관리).
- 웹↔셸 통신은 `packages/bridge-contracts` 의 `{ v, type, payload }` postMessage 프로토콜. 상세는 `docs/tickets/[NOOK-11] 03.네이티브_통신_브리지.md`.
- API 계층과 플랫폼별 인증·생성 코드 경계는 `docs/tickets/[NOOK-55] 01.API_통신_구조.md`를 따른다.
- OpenAPI 명세와 Orval 설정은 `packages/api-contracts`에서 관리하고 생성 코드는 Web의 `shared/api/generated`에 둔다. `pnpm api:refresh`로 재생성하며, 상세 규칙은 `docs/tickets/[NOOK-56] 01.OpenAPI_스키마_DTO.md`를 따른다.
- 공용 아이콘은 `packages/icons/src`의 SVG를 기준으로 플랫폼 코드를 생성한다. 상세는 `docs/tickets/[NOOK-12] 01.아이콘.md`.
- `@/` 는 web 의 `src/` alias (Vite·tsc·Vitest 공통).

## 브랜치

```
작업 브랜치 ──Squash PR──▶ develop ──Merge commit PR──▶ main ──▶ 태그 vX.Y.Z
```

- 기본 브랜치는 `develop`. `main` 은 프로덕션(Vercel Production Branch)이다.
- `develop` 으로는 Squash 만 들어간다. 릴리스 PR(`develop → main`)은 제목이 `chore(release): vX.Y.Z` 이고 **Merge commit** 으로 머지한다.
- 상세 규칙(hotfix, 보호 규칙, CI 범위)은 `docs/ops/브랜치_운영_규칙.md` 를 따른다.

## 실행

### web

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # BE 주소 필수

pnpm web:dev               # http://localhost:5173
pnpm web:build             # tsc --noEmit + vite build → apps/web/dist/
pnpm api:refresh           # 개발 서버 명세 + Orval 코드 재생성
pnpm check                 # 생성물 + lint + typecheck + test 검증
pnpm typecheck             # web + mobile tsc --noEmit
pnpm lint                  # biome check
pnpm format                # biome format --write
pnpm test                  # vitest run
```

### mobile (Expo 셸)

```bash
cd apps/mobile
cp .env.example .env.local  # EXPO_PUBLIC_WEB_URL: 웹뷰가 로드할 원격 웹 URL

pnpm start                  # Expo dev
pnpm ios                    # 시뮬레이터/실기기
pnpm android                # 에뮬레이터/실기기
```

> 실기기에서는 dev 서버 대신 `vite preview`(빌드본 서빙)로 확인한다 — dev 서버의 재연결 리로드가 웹뷰 상태를 날린다.

iOS EAS production 빌드와 App Store Connect 제출은 [iOS EAS 빌드 및 App Store 제출](<docs/ops/iOS_EAS_빌드_및_App_Store_제출.md>)를,
실기기에 직접 로컬 빌드해 올리는 절차는 [로컬 앱 빌드 가이드](<docs/ops/로컬_앱_빌드_가이드.md>)를,
EAS가 빌드한 dev client를 설치해 쓰는 절차(새 PC·새 기기 세팅 포함)는
[배포 빌드 설치 가이드](<docs/ops/배포_빌드_설치_가이드.md>)를 따른다.

## 환경변수 / 앱 variant

env 파일은 **앱별로** 둔다. 루트에는 두지 않는다(Vite·Expo 모두 각 앱 디렉터리를 기준으로 읽는다).

| 위치 | 용도 |
| --- | --- |
| `apps/{web,mobile}/.env.example` | 예시값, 커밋 |
| `apps/{web,mobile}/.env.local` | 로컬 전용, gitignore |
| EAS environment | mobile 배포 환경(development/production) 값 |
| 배포 플랫폼 환경변수 | web 배포 값 |

- `VITE_*` 는 번들에 인라인, `EXPO_PUBLIC_*` 는 앱 번들에 포함된다. **둘 다 공개값만** 넣는다.
- 앱 식별자는 `APP_VARIANT` 로 갈린다 (`apps/mobile/app.config.ts`). 미설정·오타는 production 으로 떨어진다.

| APP_VARIANT | App ID (iOS·Android 공통) | App Group |
| --- | --- | --- |
| `production`(기본) | `kr.co.everynook.app` | `group.kr.co.everynook.app` |
| `development` | `kr.co.everynook.app.dev` | `group.kr.co.everynook.app.dev` |

별도 개발 서버를 운영하지 않아 현재는 `production` 만 사용한다. Share Extension 은 본앱 식별자 뒤에 `.ShareExtension` 이 붙는다. EAS 빌드 프로필은 `apps/mobile/eas.json` 참고.
