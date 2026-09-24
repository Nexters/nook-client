# App Store 배포 가이드

production 앱을 EAS로 빌드해 App Store Connect에 업로드하는 절차다. TestFlight 배포, 심사 제출, 실제 출시는 업로드 후 App Store Connect에서 진행한다.

```text
배포 전 검사 → production 빌드 → Build ID 확인
→ Build ID를 지정해 제출 → App Store Connect에서 처리 확인
```

## 1. 배포 전 검사

레포 루트에서 실행한다.

```bash
git status --short
pnpm check
```

다음 설정도 확인한다.

- `apps/mobile/native-public-config.json`의 production `webUrl`
- `apps/mobile/eas.json`의 App Store Connect 앱 ID
- production 웹 배포의 `VITE_API_BASE_URL`

평가된 앱 설정은 다음 명령으로 확인한다.

```bash
cd apps/mobile
pnpm exec expo config --json
cd ../..
```

## 2. production 빌드

```bash
pnpm --filter mobile build:ios:prod-store
```

`prod-store`는 JS를 앱에 내장하며 build number를 자동으로 증가시킨다. 완료되면 EAS Build ID, Git commit, 앱 버전, build number를 기록한다.

```bash
pnpm --filter mobile exec eas build:list \
  --platform ios \
  --build-profile prod-store \
  --status finished \
  --limit 5
```

## 3. App Store Connect에 제출

여러 사람이 빌드할 수 있으므로 `--latest` 대신 확인한 Build ID를 지정하는 방식을 권장한다.

```bash
pnpm --filter mobile exec eas submit \
  --platform ios \
  --profile prod-store \
  --id <EAS_BUILD_ID>
```

```bash
pnpm --filter mobile exec eas submit:list --platform ios --limit 5
```

EAS Submit 완료는 바이너리 업로드 완료를 뜻한다. 이후 App Store Connect에서 다음 작업을 진행한다.

1. Apple의 빌드 처리 완료 확인
2. TestFlight 테스터 또는 그룹에 빌드 배포
3. 심사 정보와 출시 버전 입력
4. App Review 제출
5. 승인 후 출시

## 4. 로컬 빌드

EAS 클라우드 빌드를 사용할 수 없다면 Xcode가 설치된 Mac에서 빌드할 수 있다.

```bash
pnpm --filter mobile build:ios:prod-store:local
pnpm --filter mobile exec eas submit \
  --platform ios \
  --profile prod-store \
  --path build/prod-store.ipa
```

IPA는 `apps/mobile/build/prod-store.ipa`에 생성된다.

## 5. 빌드 구성

| 프로필 | Bundle ID | JS | 설치 방식 | 용도 |
| --- | --- | --- | --- | --- |
| `dev-metro` | `kr.co.everynook.app.dev` | Metro에서 로드 | 등록된 기기에 직접 설치 | 개발용 실기기 확인 |
| `prod-store` | `kr.co.everynook.app` | 앱에 내장 | TestFlight/App Store | 심사와 실제 출시 |

| 고정값 | 값 |
| --- | --- |
| Expo owner | `everynook` |
| EAS project ID | `63adc1c0-079a-4ba2-99dd-7099b5789d8b` |
| production ASC 앱 ID | `6798223287` |
| development ASC 앱 ID | `6803065807` |
| Apple Team ID | `TDTGJZTB57` |

빌드와 제출에 필요한 배포 인증서, 프로비저닝 프로파일, ASC API 키는 EAS에 저장되어 있다. EAS 프로젝트 권한이 있는 팀원은 로컬에 Apple 키를 보관하지 않고 빌드하고 제출할 수 있다.

## 6. 오류 해결

| 오류 | 조치 |
| --- | --- |
| `expo config --json exited with non-zero code: 1` | `pnpm --filter mobile exec expo config --json`으로 실제 오류 확인 |
| `401 Unauthorized` | EAS에 저장된 ASC API 키의 폐기 여부 확인 |
| `403 Forbidden` | API 키 역할, 앱 접근 권한, 미승인 Apple 계약 확인 |
| 앱을 찾지 못함 | Bundle ID와 ASC 앱 ID 확인 |
| 잘못된 최신 빌드 선택 | 제출을 중단하고 올바른 Build ID를 지정해 다시 제출 |
| 서명 또는 capability 불일치 | Account Holder에게 EAS credentials 복구 요청 |

## 7. ASC API 키 교체

1. Account Holder가 App Store Connect에서 새 API 키를 발급한다. 역할은 App Manager 이상을 권장한다.
2. `.p8`은 한 번만 다운로드할 수 있으므로 즉시 안전하게 백업한다.
3. [EAS 프로젝트 credentials](https://expo.dev/accounts/everynook/projects/nook/credentials)에서 기존 키를 새 키로 교체한다.
4. 기기 등록과 프로파일 자동화에 사용하는 관리자의 로컬 환경변수도 갱신한다.

EAS에 등록한 제출용 `.p8`은 다시 내려받을 수 없다. 관리자가 보관한 원본이 유일한 복구 사본이다.

## 참고

- [Expo: EAS Submit for iOS](https://docs.expo.dev/submit/ios/)
- [Expo: eas.json](https://docs.expo.dev/eas/json/)
- [Apple: App Store Connect API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api)
- [Apple: 역할과 권한](https://developer.apple.com/help/app-store-connect/reference/account-management/role-permissions/)

