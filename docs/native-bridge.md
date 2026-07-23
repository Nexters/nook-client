# Expo 셸 ↔ 원격 웹 브리지

| 작성자 | 작성일 | 수정일 |
| --- | --- | --- |
| coldbrow | 2026-07-23 | 2026-07-23 |

## 한 줄 요약

Expo(RN) 셸이 `react-native-webview` 로 원격 웹(app.nook.com)을 띄우고, WebView 가 못 하는 것만 브리지로 셸에 넘긴다. 네이티브 저장소 접근은 로컬 Expo 모듈이 담당한다.

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
| →웹 | `SHARE_RECEIVED` | 공유받은 내용 전달 | 구현 |
| →웹 | `APP_RESUMED` | 앱 복귀 | 계약만 *(예정)* |
| →셸 | `WEB_READY` | 웹 로드 완료 | 구현 |
| →셸 | `OPEN_EXTERNAL_URL` | 외부 링크 열기 | 구현 |
| →셸 | `REQUEST_PUSH_PERMISSION` | 푸시 권한 요청 | 계약만 *(예정)* |

## 두 가지 핵심 흐름

**핸드셰이크** — 웹이 준비됐다고 알려야 셸이 데이터를 보낸다.
```
웹 로드 → nativeBridge.start()
  → __nookReceive 등록 + WEB_READY 발신 → 그때부터 셸이 전달
```

**공유 핸드오프** — 공유 화면(네이티브)이 저장 → 셸이 읽어 웹에 전달.
```
공유 저장(App Group UserDefaults "pending")
  → 앱 열림(WEB_READY) 또는 복귀(AppState 'active')
  → NookShare 모듈 takePending() = 읽고 즉시 비움
  → SHARE_RECEIVED → 웹
```
콜드스타트는 `WEB_READY`, 백그라운드 복귀는 `AppState 'active'` 가 트리거다. 읽으면 큐를 비우므로 두 경로가 겹쳐도 중복 전달되지 않는다.

## 주의할 점

- **dev 서버로 실기기 테스트하면 공유가 사라진다.** Vite 클라이언트는 WS 가 끊겼다 붙으면 페이지를 통째로 리로드한다. 앱이 백그라운드 가면 WS 가 끊기므로 복귀할 때마다 리로드 → 방금 전달된 공유가 날아간다. **콜드스타트만 되고 복귀는 안 되는 비대칭이 이 증상의 신호.** 실기기 확인은 `vite preview`(빌드본 서빙)로.
- **`takePending()` 은 읽는 즉시 비운다.** 웹이 처리에 실패하면 그 공유는 영구 소실이다. 실제 저장 로직이 붙으면 ack 받고 지우는 방식으로 바꿔야 한다(entry 에 id 추가 선행 필요).
- **Expo 셸(JS)은 App Group 을 직접 못 읽는다.** 그래서 `NookShare` 네이티브 모듈이 필요하다. raw Swift 셸이 공짜로 하던 일이다.
- **`mobile/ios`, `mobile/android` 는 gitignore 대상**(prebuild 생성물)이라 공유 확장은 수동 주입 상태다. `prebuild --clean` 하면 날아간다 — config plugin 화가 남은 숙제.
- 계약 패키지(`@nook/bridge-contract`)는 웹만 참조한다. mobile 은 standalone npm 이라 resolve 가 안 돼 같은 모양을 자체 타입으로 들고 있다.

## 코드 위치

- `packages/bridge-contract/src/index.ts` — 메시지 계약(타입 전용)
- `web/src/native-bridge/` — 웹측 클라이언트
- `mobile/App.tsx` — Expo 셸
- `mobile/modules/nook-share/` — App Group 을 읽는 네이티브 모듈(Swift)
- `ios/App/ShareExtension/` — 공유 확장 원본(SwiftUI)
