# Google Play 배포 가이드

production 앱을 EAS로 빌드해 Google Play의 비공개 테스트 트랙에 올리는 절차다. 테스터 배포, 심사, 프로덕션 승격은 업로드 후 Play Console에서 진행한다. EAS 로그인과 프로젝트 설정처럼 플랫폼 공통인 부분은 [App Store 배포 가이드](04-App-Store-배포.md)와 같고, 여기서는 iOS와 다른 것만 다룬다.

```text
배포 전 검사 → production 빌드(AAB) → Build ID 확인
→ Build ID를 지정해 제출 → Play Console에서 드래프트 롤아웃
```

## 1. iOS와 다른 점

| 항목 | iOS | Android |
| --- | --- | --- |
| 서명 | 배포 인증서 + 프로비저닝 프로파일 (EAS 보관) | 업로드 키스토어 (EAS 보관) + 앱 서명 키 (Google 보관) |
| 스토어 앱 | production·development 2개 | production 1개 |
| dev variant 배포 | TestFlight | Play에 올리지 않고 APK 직접 설치 |
| 산출물 | IPA | AAB |
| 제출 인증 | App Store Connect API 키 | Google Cloud 서비스 계정 JSON |
| 배포 채널 | TestFlight → App Store | 비공개 테스트(`alpha`) → 프로덕션 승격 |

Android는 APK 직접 설치가 되므로 dev variant를 Play에 올릴 이유가 없다. 앱을 하나 더 만들면 등재 정보와 심사가 한 벌 더 늘어난다.

## 2. 서명 키가 두 개다

Play 앱 서명을 쓰면 우리가 올린 AAB를 Google이 앱 서명 키로 다시 서명해서 사용자에게 내려보낸다.

| 키 | 보관 | 찍히는 곳 |
| --- | --- | --- |
| 업로드 키 | EAS | 우리가 빌드한 AAB·APK |
| 앱 서명 키 | Google | 사용자가 Play에서 받는 APK |

카카오 로그인은 실행 중인 앱의 서명 해시로 판정하므로 카카오 콘솔에 키 해시를 두 개 다 등록해야 한다. 앱 서명 키 해시가 빠지면 직접 설치한 빌드에서는 로그인이 되고 Play로 받은 앱에서만 실패한다. 같은 이유로 직접 빌드한 APK로는 이 문제를 검증할 수 없다. 반드시 Play가 내려준 빌드로 확인한다.

SHA-1을 카카오 키 해시로 바꾸는 명령이다.

```bash
echo <SHA1_콜론_제거> | xxd -r -p | openssl base64
```

| SHA-1 | 확인 위치 |
| --- | --- |
| 업로드 키 | `pnpm --filter mobile exec eas credentials --platform android` |
| 앱 서명 키 | Play Console → 테스트 및 출시 → 앱 무결성 → 앱 서명 키 인증서 |

앱 서명 키는 첫 AAB를 업로드해야 생성된다. 드래프트 릴리스만으로도 생기므로 롤아웃 전에 카카오에 먼저 등록할 수 있다.

## 3. 트랙

개인 개발자 계정이라 비공개 테스트에 테스터 12명이 14일 이상 참여해야 프로덕션 액세스를 신청할 수 있다.

| 트랙 | API 이름 | 사용 |
| --- | --- | --- |
| 내부 테스트 | `internal` | 안 씀. 14일에 카운트되지 않는다 |
| 비공개 테스트 | `alpha` | `eas submit`이 올리는 유일한 트랙 |
| 공개 테스트 | `beta` | 안 씀 |
| 프로덕션 | `production` | Play Console에서 alpha 릴리스를 승격해서만 |

`eas.json`의 `submit.prod-store.android`는 `track: alpha`, `releaseStatus: draft`다. 업로드만 되고 배포는 Play Console에서 눌러야 나간다. 프로덕션 트랙은 일부러 넣지 않았다. 새로 submit하면 14일 동안 검증한 것과 다른 바이너리가 나가고, 심사를 거치지 않은 빌드를 프로덕션에 쏘는 경로가 생긴다.

## 4. 배포 전 검사

레포 루트에서 실행한다.

```bash
git status --short
pnpm check
```

다음 설정도 확인한다.

- `apps/mobile/native-public-config.json`의 production `webUrl`
- EAS production environment의 `GOOGLE_SERVICES_FILE_ANDROID`. 이 파일이 없으면 `app.config.ts`가 EAS 빌드를 끊는다. 끊기지 않고 통과했는데 푸시가 안 오면 file 환경변수가 다른 environment에 등록된 것이다.

## 5. production 빌드

```bash
pnpm --filter mobile build:android:prod-store
```

`prod-store`는 `distribution: store`라 EAS가 AAB를 만들고, `autoIncrement`가 versionCode를 올린다. Android용 `:local` 스크립트는 없다. 로컬 컴파일은 `pnpm android`로 한다.

```bash
pnpm --filter mobile exec eas build:list \
  --platform android \
  --build-profile prod-store \
  --status finished \
  --limit 5
```

## 6. Play에 제출

여러 사람이 빌드할 수 있으므로 `--latest` 대신 확인한 Build ID를 지정하는 방식을 권장한다.

```bash
pnpm --filter mobile exec eas submit \
  --platform android \
  --profile prod-store \
  --id <EAS_BUILD_ID>
```

```bash
pnpm --filter mobile exec eas submit:list --platform android --limit 5
```

EAS Submit 완료는 alpha 트랙에 드래프트 릴리스가 생겼다는 뜻이다. 이후 Play Console에서 다음 작업을 진행한다.

1. 테스트 및 출시 → 비공개 테스트에서 드래프트 릴리스 확인
2. 출시 노트 입력 후 롤아웃
3. 14일 요건을 채운 뒤 프로덕션 액세스 신청
4. 승인 후 같은 릴리스를 프로덕션으로 승격

## 7. 최초 세팅

한 번만 하면 되는 작업이고, 순서가 서로 물려 있다.

1. Firebase 프로젝트에 Android 앱 2개(`kr.co.everynook.app`, `.dev`)를 추가하고 `google-services.json`을 EAS file 환경변수 `GOOGLE_SERVICES_FILE_ANDROID`로 development·production 양쪽 environment에 등록한다.
2. `pnpm --filter mobile build:android:prod-store`. 첫 빌드에서 EAS가 업로드 키스토어를 만든다.
3. Play Console에 앱을 만들고 첫 AAB를 비공개 테스트 드래프트로 직접 업로드한다. Google Play Developer API는 릴리스가 하나라도 있어야 동작해서 첫 제출은 `eas submit`으로 안 된다.
4. 카카오 콘솔에 키 해시 2개를 등록한다(2절).
5. 제출용 서비스 계정을 만들어 EAS에 올린다. Play Console에는 더 이상 API 액세스 메뉴가 없고 사용자 초대로 연결한다.
   1. Google Cloud Console → IAM 및 관리자 → 서비스 계정 → 서비스 계정 만들기. 키 관리 → 새 키 만들기 → JSON으로 키 파일을 받는다.
   2. 같은 Cloud 프로젝트에서 Google Play Android Developer API를 사용 설정한다.
   3. Play Console → 사용자 및 권한 → 새 사용자 초대에 서비스 계정 이메일을 넣고, 앱 권한으로 앱 정보 보기, 초안 앱 수정·삭제, 프로덕션 출시 및 테스트 트랙 관리, 스토어 등록정보 관리를 준다.
   4. `pnpm --filter mobile exec eas credentials --platform android` → Google Service Account 에서 JSON 키를 올린다. 이때부터 `eas submit`이 동작한다.

## 8. 빌드 구성

| 프로필 | 패키지 | JS | 산출물 | 용도 |
| --- | --- | --- | --- | --- |
| `dev-metro` | `kr.co.everynook.app.dev` | Metro에서 로드 | APK | 개발용 실기기 확인 |
| `prod-store` | `kr.co.everynook.app` | 앱에 내장 | AAB | 비공개 테스트와 프로덕션 |

| 고정값 | 값 |
| --- | --- |
| Play 개발자 계정 | `everynook` (개인 계정) |
| 패키지명 | `kr.co.everynook.app` |
| 알림 채널 id | `native-public-config.json`의 `android.notificationChannelId` |

## 9. 오류 해결

| 증상 | 조치 |
| --- | --- |
| 카카오 로그인이 Play 빌드에서만 실패 | 앱 서명 키 해시를 카카오 콘솔에 등록한다(2절) |
| `eas submit`이 앱을 찾지 못함 | Play Console에 앱이 없거나 첫 AAB를 아직 직접 올리지 않았다(7절 3번) |
| `eas submit` 인증 실패 | 서비스 계정 JSON이 EAS에 없거나, Play Console 사용자 및 권한에서 서비스 계정에 앱 권한이 빠졌다 |
| 빌드가 `google-services.json` 누락으로 끊김 | EAS file 환경변수 `GOOGLE_SERVICES_FILE_ANDROID`가 해당 environment에 있는지 확인 |
| Kotlin 컴파일이 `Internal compiler error`로 죽음 | 생성된 아이콘 코드가 JVM 메서드 크기 한계를 넘긴 것. `pnpm icons:generate`로 다시 생성한다 |
| 알림 아이콘이 흰 사각형 | `expo-notifications` 플러그인의 `icon`이 투명 배경 단색 실루엣이어야 한다 |
| 알림이 "기타" 채널로 잡힘 | 매니페스트의 `defaultChannel`과 앱이 만드는 채널 id가 어긋났다. 둘 다 `native-public-config.json`에서 읽는다 |

## 참고

- [Expo: EAS Submit for Android](https://docs.expo.dev/submit/android/)
- [Google Play: 앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Kakao: Android 키 해시 등록](https://developers.kakao.com/docs/latest/ko/android/getting-started)
