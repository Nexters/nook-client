# 네이티브 셸 ↔ 원격 웹 브리지

| 작성자 | 작성일 | 수정일 |
| --- | --- | --- |
| coldbrow | 2026-07-23 | 2026-07-23 |

## 한 줄 요약

얇은 네이티브 셸이 WebView 로 원격 웹(app.nook.com)을 띄우고, WebView 가 못 하는 것만 브리지로 셸에 넘긴다. (Capacitor 없음)

## 어떻게 통신하나

| 방향 | iOS | Android |
| --- | --- | --- |
| 웹 → 네이티브 | `webkit.messageHandlers.nook.postMessage(obj)` | `window.NookNative.postMessage(json)` |
| 네이티브 → 웹 | `window.__nookReceive(json)` | `window.__nookReceive(json)` |

- 웹은 어느 플랫폼인지 위 객체 존재로 감지한다. 둘 다 없으면 `web`(데스크톱)으로 보고 전송은 무시한다.
- 모든 메시지는 `{ v, type, payload }` 형태. 수신 시 Zod 로 검증한다.

## 메시지 종류

| 방향 | 타입 | 뜻 |
| --- | --- | --- |
| →웹 | `SHARE_RECEIVED` | 공유받은 내용 전달 |
| →웹 | `APP_RESUMED` | 앱 복귀 |
| →웹 | `LOCATION_RESULT` · `BACK_PRESSED` | 위치 응답 · 안드 뒤로가기 *(예정)* |
| →셸 | `WEB_READY` | 웹 로드 완료 |
| →셸 | `OPEN_EXTERNAL_URL` | 외부 링크 열기 |
| →셸 | `REQUEST_LOCATION` · `NAV_STATE` | 위치 요청 · 뒤로가기 가능 여부 *(예정)* |

## 두 가지 핵심 흐름

**핸드셰이크** — 웹이 준비됐다고 알려야 셸이 데이터를 보낸다.
```
웹 로드 → WEB_READY 발신 → 셸이 "준비됨" 표시 → 그때부터 전달
```

**공유 핸드오프** — 공유 화면(네이티브)이 저장 → 셸이 읽어 웹에 전달.
```
공유 저장(iOS: App Group 파일 / Android: SharedPreferences)
  → 앱 열림/복귀 시 셸이 읽음 → SHARE_RECEIVED → 웹 표시 → 비움
```

## 주의할 점

- **dev 서버로 실기기 테스트하면 무한 리로드**가 난다(Vite HMR + WebView 조합). 프로덕션엔 없다. 실기기 확인은 `vite preview`(빌드본 서빙)로.
  - 공유 핸드오프가 "완전 종료 후에만 되는" 것처럼 보였던 것도 이 리로드 탓이었다. 프로덕션 빌드에선 UserDefaults 로도 복귀 케이스가 정상 동작함(실기기 확인).

## 코드 위치

- `web/src/bridge/` — 계약(contract.ts) + 웹측 클라이언트(nativeBridge.ts)
- `ios/App/App/WebViewController.swift` — iOS 셸
- `android/.../shell/MainActivity.kt` — Android 셸
