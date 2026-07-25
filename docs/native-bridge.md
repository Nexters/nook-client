# Expo 셸 ↔ 원격 웹 브리지

| 작성자 | 작성일 | 수정일 |
| --- | --- | --- |
| coldbrow | 2026-07-23 | 2026-07-25 |

## 한 줄 요약

Expo(RN) 셸이 `react-native-webview` 로 원격 웹(app.nook.com)을 띄우고, WebView 가 못 하는 것만 브리지로 셸에 넘긴다.

## 어떻게 통신하나

| 방향 | 방법 (iOS/Android 공통) |
| --- | --- |
| 웹 → 네이티브 | `window.ReactNativeWebView.postMessage(json)` |
| 네이티브 → 웹 | `window.__nookReceive(json)` |

- 웹→네이티브 API 는 `react-native-webview` 가 양 플랫폼에 동일하게 넣어준다. (raw 셸처럼 플랫폼별로 갈리지 않는다)
- 네이티브→웹은 셸이 `injectJavaScript` 로 `__nookReceive` 를 호출한다.
- 플랫폼 감지는 `window.ReactNativeWebView` 존재 여부 + `window.__nookPlatform`(셸이 로드 전 주입). 둘 다 없으면 `web` 으로 보고 전송은 무시한다.
- 모든 메시지는 `{ v, type, payload }` 형태. **런타임 검증은 아직 없다**(JSON 파싱 실패 시 무시만 한다).

## 메시지 종류

| 방향 | 타입 | 뜻 | 상태 |
| --- | --- | --- | --- |
| →웹 | `APP_RESUMED` | 앱 복귀 | 계약만 *(예정)* |
| →셸 | `WEB_READY` | 웹 로드 완료 | 구현 |
| →셸 | `OPEN_EXTERNAL_URL` | 외부 링크 열기 | 구현 |
| →셸 | `REQUEST_PUSH_PERMISSION` | 푸시 권한 요청 | 계약만 *(예정)* |

> 공유 수신(`SHARE_RECEIVED`)·네이티브 공유 확장은 이 브랜치 범위에서 제외됐다. 별도 PR에서 다룬다.

## 핸드셰이크

웹이 준비됐다고 알려야 셸이 데이터를 보낸다.
```
웹 로드 → nativeBridge.start()
  → __nookReceive 등록 + WEB_READY 발신 → 그때부터 셸이 전달
```

## 주의할 점

- 계약 패키지(`@nook/bridge-contracts`)는 web·mobile 이 함께 참조한다(pnpm 워크스페이스 `workspace:*`). 계약을 바꾸면 양쪽이 같이 깨지므로, 타입 변경은 두 앱의 `tsc --noEmit`(`pnpm typecheck`)로 확인한다.
- mobile 은 계약을 `import type` 으로만 쓴다. 런타임 값(`BRIDGE_VERSION` 등)을 import 하면 Metro 번들에 포함되므로 주의.

## 코드 위치

- `packages/bridge-contracts/src/` — 메시지 계약(타입 전용): `message` / `native-to-web` / `web-to-native`
- `apps/web/src/native-bridge/` — 웹측 클라이언트
- `apps/mobile/App.tsx` — Expo 셸
