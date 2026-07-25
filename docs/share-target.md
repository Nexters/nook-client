# 네이티브 공유 대상

외부 앱에서 텍스트나 URL을 공유하면 nook의 그룹 선택 UI를 네이티브로 표시한다.

## 구조

| 플랫폼 | 소스 | CNG 연결 방식 |
| --- | --- | --- |
| Android | `apps/mobile/modules/share-target/android` | local Expo module의 Manifest와 리소스를 앱에 병합 |
| iOS | `apps/mobile/targets/share-target` | `@bacons/apple-targets`가 SwiftUI Share Extension target 생성 |

생성되는 `apps/mobile/android`, `apps/mobile/ios`는 커밋하지 않는다. 네이티브 설정은 local module과 target 설정에 두고 `expo prebuild --clean`으로 재생성한다.

## 앱 식별자

`APP_VARIANT`에 따라 본앱, Share Extension, App Group이 함께 바뀐다.

| Variant | 본앱 | Share Extension | App Group |
| --- | --- | --- | --- |
| development | `com.nook.app.dev` | `com.nook.app.dev.ShareExtension` | `group.com.nook.app.dev` |
| preview | `com.nook.app.preview` | `com.nook.app.preview.ShareExtension` | `group.com.nook.app.preview` |
| production | `com.nook.app` | `com.nook.app.ShareExtension` | `group.com.nook.app` |

## 확인

```bash
cd apps/mobile
APP_VARIANT=development pnpm exec expo prebuild --clean
pnpm android
pnpm ios
```

Android는 `ACTION_SEND`의 `text/plain`, iOS는 텍스트와 웹 URL을 받는다. 저장 결과는 Android SharedPreferences의 `nook_shares/pending`, iOS App Group UserDefaults의 `pending`에 누적한다.
