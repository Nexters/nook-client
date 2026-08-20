# iOS EAS 빌드 및 App Store 제출 개요

| 작성자      | 작성일        | 수정일        | 관련 작업    |
| -------- | ---------- | ---------- | -------- |
| coldbrow | 2026-08-06 | 2026-08-20 | NOOK-115 |

> nook iOS 앱을 EAS로 빌드하고 App Store Connect에 제출하는 전체 구조와 절차.
> 무엇이 EAS 서버에 있고 무엇이 각자 PC에 있어야 하는지를 기준으로 읽으면 된다.
>
> 실기기 sideload 설치는 [배포 빌드 설치 가이드](<[NOOK-NATIVE] 배포_빌드_설치_가이드.md>),
> 내 맥에서 Xcode로 직접 컴파일은 [로컬 앱 빌드 가이드](<[NOOK-NATIVE] 로컬_앱_빌드_가이드.md>) 참고.

## 1. 전체 구조: 무엇이 어디에 있나

### EAS 서버에 있는 것

| 항목 | 내용 |
| --- | --- |
| 서명 자격 증명 | Distribution Certificate + Provisioning Profile. App Store Configuration과 Ad Hoc Configuration이 별도로 공존하며, 본앱·ShareExtension 타깃별로 프로파일이 있다 |
| App Store Connect API 키 | `eas submit`의 Apple 업로드 인증 키(`nook-asc-submit-key`, Key ID `L2F7D68453`). expo.dev 프로젝트 credentials에 업로드돼 있다 |
| 환경변수 | `KAKAO_NATIVE_APP_KEY_DEV`/`_PROD` (EAS Environment Variables, `development`·`production` 두 environment 모두 등록) |
| 빌드 인프라 | iOS 네이티브 컴파일 + 서명. 클라우드 빌드하는 PC에는 Xcode도 필요 없다 |

빌드와 제출에 필요한 자격 증명이 전부 EAS에 있으므로, **어느 PC든 `eas login`만 하면
빌드부터 제출까지 가능**하다. 서명 파일도, App Store Connect API 키도 로컬에 둘 필요 없다.

로컬 빌드(`build:*:local`)도 EAS에서 자격 증명을 내려받아 서명하므로 서명 파일이 필요 없다
(단, Xcode + fastlane이 있는 Mac이어야 한다).

### 앱과 프로필

앱은 variant 2개 × App Store Connect 앱 2개다.

| variant | Bundle ID | ASC 앱 ID | 용도 |
| --- | --- | --- | --- |
| production | `kr.co.everynook.app` | `6798223287` | 실서비스 (TestFlight/App Store) |
| development | `kr.co.everynook.app.dev` | `6803065807` | dev 서버 대상 TestFlight 배포 |

EAS 빌드 프로필은 **variant(dev/prod) × 배포 채널(adhoc/store)** 조합 4개다.

| 프로필 | variant | 채널 | 설치 방법 | 용도 |
| --- | --- | --- | --- | --- |
| `dev-adhoc` | development | ad-hoc | 등록된 기기에 직접 설치 | dev client 실기기 디버깅 |
| `prod-adhoc` | development(env) + production(variant) | ad-hoc | 등록된 기기에 직접 설치 | production 변형을 Apple ID 없이 실기기 테스트 |
| `dev-store` | development | store | TestFlight | dev 앱 테스터 배포 |
| `prod-store` | production | store | TestFlight/App Store | 실제 출시 |

`package.json` 스크립트는 프로필 이름과 1:1이다: `build:<프로필>`, `build:<프로필>:local`,
`submit:dev-store`, `submit:prod-store`.

| 기타 고정값 | |
| --- | --- |
| Expo owner | `everynook` |
| EAS project ID | `63adc1c0-079a-4ba2-99dd-7099b5789d8b` |
| Apple Team ID | `TDTGJZTB57` |
| Node.js / pnpm | `>=22.18.0` / `9.15.9` |

### Apple 계정 제약

Apple Developer Program은 **Individual 멤버십**이다. 초대받은 Admin 사용자는 App Store
Connect에서 앱과 제출을 관리할 수 있지만, Certificates, Identifiers & Profiles 권한은 없고
Apple ID 로그인이 필요한 작업(eas-cli의 일부 대화형 흐름 포함)은 Account Holder만 할 수 있다.
EAS에 저장된 자격 증명을 재사용하는 동안은 문제없고, 다음 상황에서만 Account Holder인 팀장이
`pnpm exec eas credentials --platform ios`로 복구해야 한다.

- Distribution Certificate 만료 또는 폐기
- Provisioning Profile 만료 또는 capability 불일치
- 새 Bundle ID나 Share Extension 추가
- Sign in with Apple 또는 App Group 설정 변경

## 2. 새 PC 세팅

```bash
git clone git@github.com:Nexters/nook-client.git
cd nook-client
nvm install
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile

cd apps/mobile
pnpm exec eas login       # everynook/nook 프로젝트 접근 권한 필요
pnpm exec eas whoami
```

이걸로 끝이다. 빌드·제출 자격 증명은 전부 EAS 서버에 있어 추가 세팅이 없다.
전역 EAS CLI 대신 저장소에 설치된 버전을 쓴다 (`pnpm exec eas` — npx는 TS 버전 충돌로 깨진다).

## 3. 배포 전 검사

```bash
git status --short
pnpm check
```

릴리스 전에 `apps/mobile/native-public-config.json`의 `apiBaseUrl`·`webUrl`(variant별)과
`apps/mobile/eas.json`의 ASC 앱 ID를 확인한다. 특히 production `apiBaseUrl`이 이번 릴리스가
사용할 서버를 가리키는지 확인해야 한다.

앱 설정 평가 확인:

```bash
cd apps/mobile
pnpm exec expo config --json
```

## 4. 빌드

```bash
cd apps/mobile
pnpm build:prod-store     # 실서비스. dev 앱은 build:dev-store
```

`*-store` 프로필은 build number를 자동 증가시킨다(`autoIncrement`). 빌드가 완료되면 EAS Build
페이지의 Build ID, Git commit, 앱 버전과 build number를 기록한다.

```bash
pnpm exec eas build:list --platform ios --build-profile prod-store --status finished --limit 5
pnpm exec eas build:view <EAS_BUILD_ID>
```

EAS 클라우드 빌드 쿼터를 다 썼을 때는 `build:<프로필>:local`로 내 Mac에서 빌드할 수 있다.
IPA는 `apps/mobile/build/` 밑에 생성되며, `eas submit --path <ipa>`로 제출도 가능하다.

## 5. App Store Connect 제출

`submit:*`는 가장 최근의 iOS EAS 빌드를 선택한다(`--latest`). 다른 사람의 빌드나 이전 commit을
잘못 제출하지 않도록 먼저 `eas build:list`로 대상 빌드를 확인한다.

```bash
cd apps/mobile
pnpm submit:prod-store    # dev 앱은 submit:dev-store
```

Apple 업로드 인증은 EAS에 저장된 ASC API 키로 자동 처리된다. 여러 명이 동시에 빌드하는
상황에서는 Build ID 지정이 더 안전하다:

```bash
pnpm exec eas submit --platform ios --profile prod-store --id <EAS_BUILD_ID>
```

제출 상태 확인:

```bash
pnpm exec eas submit:list --platform ios --limit 5
```

EAS Submit 완료는 바이너리가 App Store Connect에 업로드됐다는 뜻이다. TestFlight 배포, 심사
정보 입력, App Review 제출과 실제 출시는 App Store Connect에서 별도로 진행한다.

## 6. 오류 해결

### `expo config --json exited with non-zero code: 1`

`pnpm exec expo config --json`으로 실제 평가 오류를 확인한다. `app.config.ts`는 로컬 전용
비밀값이 없어도 평가될 수 있어야 한다. URL·번들 ID 등 공개 네이티브 설정은
`native-public-config.json`, 빌드 프로필과 제출 설정은 `eas.json`에서 관리한다.

### 제출 시 App Store Connect `401 Unauthorized`

EAS에 저장된 ASC API 키가 App Store Connect에서 revoke됐을 가능성이 크다. 7절을 따라 새 키를
발급해 교체한다.

### App Store Connect `403 Forbidden`

API 키 역할이 `App Manager` 이상인지, nook 앱 접근 권한이 있는지, Account Holder가 최신
Apple 계약을 승인했는지 확인한다.

### 앱을 찾지 못함

Bundle ID와 ASC 앱 ID가 1절의 표와 일치하는지 확인한다.

### 잘못된 최신 빌드를 선택함

제출을 중단하고 `eas build:list`로 올바른 Build ID를 확인한 뒤 `eas submit --id`로 다시 제출한다.

## 7. ASC API 키 교체

키가 revoke되거나 만료되면:

1. App Store Connect에서 새 API 키 발급 (`App Manager` 역할 권장). `.p8`은 한 번만 다운로드할
   수 있으므로 안전한 곳에 보관한다.
2. [expo.dev 프로젝트 credentials](https://expo.dev/accounts/everynook/projects/nook/credentials)에서
   기존 키를 삭제하고 새 `.p8` + Key ID + Issuer ID를 업로드한다.
   (eas-cli의 키 업로드 흐름은 Apple ID 로그인을 요구해 Account Holder가 아니면 진행할 수 없다 —
   웹 업로드가 팀원도 가능한 경로다.)
3. 업로드한 `.p8` 로컬 사본은 삭제한다. EAS에 올라간 뒤에는 PC에 남겨둘 이유가 없다.

## 참고 문서

- [Expo: Submit to the Apple App Store with EAS Submit](https://docs.expo.dev/submit/ios/)
- [Expo: EAS configuration with eas.json](https://docs.expo.dev/eas/json/)
- [Apple: App Store Connect API 시작하기](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api)
- [Apple: App Store Connect 역할과 권한](https://developer.apple.com/help/app-store-connect/reference/account-management/role-permissions/)
