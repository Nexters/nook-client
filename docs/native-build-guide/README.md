# 앱 개발·배포 가이드

Nook 앱은 웹을 보여주는 Expo 앱이다. 화면 대부분은 `apps/web`에 있고 카메라·푸시·공유처럼 웹에서 처리하기 어려운 기능만 네이티브 코드에 있다.

```text
iPhone · Android
└─ Nook 앱 (Expo)
   └─ WebView
      └─ apps/web
```

## 무엇을 하려는가

| 목적 | 문서 |
| --- | --- |
| 처음 세팅하거나 평소 개발하기 | [팀원 개발 가이드](01-팀원-개발.md) |
| 기기 등록, 인증서 발급, 환경변수 관리 | [관리자 서명 가이드](02-관리자-서명.md) |
| EAS 개발 앱을 새 iPhone에 설치하기 | [EAS 실기기 가이드](03-EAS-실기기.md) |
| TestFlight 또는 App Store에 배포하기 | [App Store 배포 가이드](04-App-Store-배포.md) |
| Google Play 비공개 테스트에 배포하기 | [Google Play 배포 가이드](05-Play-배포.md) |

## 자주 쓰는 명령

레포 루트에서 실행한다.

| 작업 | 명령 |
| --- | --- |
| 로컬 웹과 앱 JS 개발 | `pnpm dev` |
| 개발 웹에 연결 | `pnpm dev:remote` |
| iOS 시뮬레이터 빌드 | `pnpm ios` |
| 연결된 iPhone 빌드 | `pnpm ios:device` |
| Android 에뮬레이터·실기기 빌드 | `pnpm android` |

## 변경 위치별 빌드 여부

| 변경한 곳 | 다시 빌드 | 반영 방법 |
| --- | --- | --- |
| `apps/web/` | 필요 없음 | `pnpm dev` 실행 중 저장 |
| `apps/mobile/src/` | 필요 없음 | `pnpm dev` 실행 중 저장 |
| `apps/mobile/modules/`, `targets/`, `app.config.ts` | 필요 | `pnpm ios`, `pnpm ios:device` 또는 `pnpm android` |

`apps/mobile/ios`와 `apps/mobile/android`는 prebuild가 만드는 생성물이다. 직접 수정하지 않는다.

## 용어

| 용어 | 뜻 |
| --- | --- |
| Metro | 앱 JS를 개발 중인 기기에 전달하는 서버 |
| dev client | JS를 내장하지 않고 Metro에서 받아 실행하는 개발 앱 |
| UDID | iPhone 한 대를 식별하는 번호 |
| 프로비저닝 프로파일 | 앱을 어떤 인증서와 기기에서 실행할 수 있는지 정한 Apple 파일 |
| EAS | 앱 빌드와 서명 자격증명 보관을 담당하는 Expo 서비스 |
