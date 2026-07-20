# nook-client

취향 기반 장소 아카이빙 서비스, nook — 앱 클라이언트.

## 스택

| 항목         | 선택                     |
| ------------ | ------------------------ |
| 빌드/패키지  | Vite + pnpm              |
| 크로스플랫폼 | Capacitor (번들 웹)      |
| 서버 상태    | TanStack Query           |
| 클라 상태    | zustand                  |
| 라우팅       | React Router v7 (SPA)    |
| 언어         | TypeScript               |
| 린트/포맷    | Biome                    |
| 테스트       | Vitest + Testing Library |
| CI           | GitHub Actions           |

## 구조

```
src/
├── app/            # 진입 배선: App, router, providers, queryClient
├── features/       # 기능 단위 폴더 (components/hooks/api를 기능별 응집)
│   └── home/
├── shared/
│   ├── ui/         # 공용 컴포넌트
│   ├── lib/        # 순수 유틸
│   ├── api/        # http 래퍼 (BE 호출 기반)
│   ├── config/     # env 게이트
│   └── native/     # ★ Capacitor 플러그인 호출을 감싸는 유일한 지점
├── stores/         # zustand 슬라이스
└── styles/
```

- `shared/native/` 외에서는 `@capacitor/*` 를 직접 import 하지 않는다. 네이티브 접점을 한 곳에 격리해 features 는 플랫폼을 모르게, 웹 dev 에서도 안전하게 동작하게 한다.
- `@/` 는 `src/` alias (Vite·tsc·Vitest 공통).

## 실행

```bash
pnpm install
cp .env.example .env      # BE 주소 설정 (미설정 시 localhost:8080 폴백)

pnpm dev                  # http://localhost:5173
pnpm build                # tsc --noEmit + vite build → dist/
pnpm typecheck            # tsc --noEmit
pnpm lint                 # biome check
pnpm format               # biome format --write
pnpm test                 # vitest run
```

## 네이티브 (Capacitor)

```bash
# 웹 번들을 네이티브로 동기화
pnpm cap:sync             # = pnpm build && cap sync

# 네이티브 실행
npx cap run android       # 에뮬레이터
npx cap run ios           # 시뮬레이터

# dev 라이브리로드 (원격 dev 서버를 네이티브 웹뷰가 로드)
CAP_DEV=1 npx cap run android   # server.url=10.0.2.2:5173 주입 (dev 한정)
```
