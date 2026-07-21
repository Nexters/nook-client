# iOS 공유 수신 (Share Target)

| 작성자 | 작성일 | 수정일 |
| --- | --- | --- |
| coldbrow | 2026-07-21 | 2026-07-21 |

인스타 등에서 "공유 → nook"으로 콘텐츠를 받는 기능의 iOS 구조.

## 동작 구조

iOS에선 앱과 Share Extension이 별도 프로세스라 직접 통신이 안 되고, App Group을 거친다.

```
인스타 "공유하기"
  → Share Extension (ios/App/ShareExtension/, 우리 코드)
  → ① App Group UserDefaults("SharedData")에 기록
  → ② capacitor://share 로 본체 앱 깨움
  → ③ 플러그인이 App Group에서 읽음 → shareReceived 이벤트 → 홈 표시
```

## App Group ID — 4곳 일치 필수

현재 값: `group.com.nook.app`

| 파일 | 역할 |
| --- | --- |
| `capacitor.config.ts` → `plugins.CapacitorShareTarget.appGroupId` | 플러그인이 읽을 위치 |
| `ios/App/App/App.entitlements` | 앱 접근 권한 |
| `ios/App/ShareExtension/ShareExtension.entitlements` | 확장 접근 권한 |
| `ios/App/ShareExtension/ShareViewController.swift` | 확장이 쓸 위치 |

하나라도 다르면 에러 없이 공유 수신만 조용히 실패한다.

## 검증 방법 (시뮬레이터)

Safari → 공유(⋯ → Share) → nook 선택 → 홈 "마지막 공유 수신"에 URL 표시되면 성공.

## 히스토리

- 플러그인 7.x는 App Group ID가 소스에 하드코딩이라 pnpm patch로 우회했었음.
  8.x부터 `capacitor.config.ts`에서 읽으므로 패치 제거 (Capacitor 8 업그레이드 동반).
