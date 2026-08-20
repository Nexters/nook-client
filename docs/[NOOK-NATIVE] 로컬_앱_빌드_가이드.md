# 로컬 앱 빌드 가이드

| 작성자 | 작성일 | 수정일 | 관련 작업 |
| --- | --- | --- | --- |
| coldbrow | 2026-08-19 | 2026-08-19 | 없음 |

> 저장소를 처음 clone한 개발자가 연결된 실기기에 **로컬(Xcode/Android Studio) 빌드**로 앱을
> 띄우는 절차. `expo run:ios`/`expo run:android`로 내 맥에서 직접 컴파일해 기기에 설치하고,
> JS/TS는 Metro로 라이브 리로드하는 평소 개발 흐름을 다룬다. iOS와 Android는 도구·연결 방식이
> 아예 달라서 절을 완전히 나눴다 — 필요한 플랫폼 절만 읽으면 된다.
>
> EAS 클라우드로 서명된 dev-client 빌드나 배포용 빌드는 다루지 않는다 — 그건
> [배포 빌드 설치 가이드](<[NOOK-NATIVE] 배포_빌드_설치_가이드.md>)와
> [iOS EAS 빌드 및 App Store 제출](<[NOOK-115] 01.iOS_EAS_빌드_및_App_Store_제출.md>) 참고.

## 1. 공통: 클론 & 설치

플랫폼과 무관하게 한 번만 하면 된다.

```bash
git clone git@github.com:Nexters/nook-client.git
cd nook-client
nvm install
corepack enable
pnpm install

cd apps/mobile
cp .env.example .env.local
```

`.env.local` 채우기:

| 값 | 필요 여부 | 설명 |
| --- | --- | --- |
| `APP_VARIANT` | 선택 | `development`로 두면 `kr.co.everynook.app.dev` 식별자로 빌드된다. 비워두면 production 식별자 |
| `APPLE_TEAM_ID` | 선택 (iOS) | 2-2절 참고 — 팀 계정에 초대된 게 아니라면 비워두고 Xcode가 본인 Apple ID로 서명하게 둔다 |
| `KAKAO_NATIVE_APP_KEY_DEV`/`_PROD` | 선택 | 카카오 로그인을 직접 테스트할 때만 필요. 값 없어도 빌드·설치는 된다(로그인 버튼만 실패) |
| `EXPO_PUBLIC_WEB_URL`/`EXPO_PUBLIC_API_BASE_URL` | 선택 | LAN IP로 로컬 웹을 띄워 확인할 때만 |

---

## 2. iOS

### 2-1. 사전 준비

| 도구 | 확인 명령 | 비고 |
| --- | --- | --- |
| Xcode | `xcode-select -p` | App Store에서 설치. 최초 실행 시 Command Line Tools 설치 동의 필요 |
| CocoaPods | `pod --version` | `brew install cocoapods` |
| Watchman | `watchman --version` | 선택. 대형 리포에서 파일 감시 성능이 나아진다 — `brew install watchman` |

이 프로젝트의 `APPLE_TEAM_ID`(`TDTGJZTB57`)는 Individual 멤버십 계정이라, 팀원으로 초대받지
않았다면 그 팀으로는 로컬 서명이 안 된다. `.env.local`의 `APPLE_TEAM_ID`를 비워두면 Xcode가
본인 Apple ID의 **Personal Team**으로 자동 서명한다 — 무료 계정이면 설치된 앱이 7일 뒤 만료되어
재설치가 필요한데, 로컬 개발에서는 정상이다. Xcode 실행 → Settings › Accounts에 본인 Apple ID를
미리 로그인해 둔다.

### 2-2. 기기 연결

#### 유선

1. 케이블로 Mac에 연결하고, 기기에서 "이 컴퓨터를 신뢰하시겠습니까?" 확인
2. iOS 16 이상은 개발자 모드가 꺼져 있으면 설치가 막힌다 — 첫 설치 시도 후 뜨는 안내를 따라
   설정 › 개인정보 보호 및 보안 › 개발자 모드를 켜고 기기를 재부팅한다
3. `xcrun devicectl list devices`로 인식 여부 확인

#### 무선 (Wi-Fi)

무선 디버깅도 **최초 1회는 케이블 연결이 필요**하다. 이후엔 케이블 없이 같은 Wi-Fi에서 바로 된다.

1. 케이블로 연결한 상태에서 Xcode 실행 → Window › Devices and Simulators(`⇧⌘2`)
2. 왼쪽에서 기기를 선택하고 **"Connect via network"** 체크
3. 기기 이름 옆에 지구본 아이콘이 뜨면 무선 페어링 완료 — 이제 케이블을 뽑아도 된다
4. Mac과 기기가 같은 Wi-Fi에 있어야 계속 인식된다

첫 설치(전체 IPA 전송)는 무선이 느릴 수 있어 유선으로 하고, 이후 반복 설치부터 무선으로
전환하는 걸 권장한다.

### 2-3. 실행

```bash
cd apps/mobile
pnpm ios        # 연결된 기기 자동 인식, 여러 대면 선택 프롬프트. 특정 기기: pnpm ios --device "<기기 이름>"
```

첫 실행은 CocoaPods 설치 + 네이티브 컴파일까지 포함돼 오래 걸린다(5~15분). 이후는 캐시로 빨라진다.

- 최초 실행에서 Xcode가 서명 팀을 물으면 본인 Apple ID 팀을 선택한다.
- 기기에 앱을 처음 깐 뒤 "신뢰되지 않는 기업용 개발자" 경고가 뜨면, 기기의
  설정 › 일반 › VPN 및 기기 관리에서 해당 개발자 프로필을 신뢰 처리해야 앱이 켜진다.

### 2-4. 흔한 문제

- **`pod install`이 UTF-8 로케일 경고를 내며 실패**: `export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8`
  설정 후 재시도.
- **기기가 안 잡힌다**: 기기 잠금 해제 상태에서 케이블 재연결, `xcrun devicectl list devices`로
  인식 여부 확인. 무선 연결이었다면 Wi-Fi가 같은 네트워크인지 먼저 의심한다.
- **"신뢰할 수 없는 개발자" 이후에도 앱이 안 켜진다**: 위 2-3절의 개발자 프로필 신뢰 처리를
  건너뛴 경우가 대부분이다.
- **카카오 로그인만 실패**: `.env.local`에 `KAKAO_NATIVE_APP_KEY_DEV`/`_PROD`를 안 채운 경우다.

---

## 3. Android

### 3-1. 사전 준비

```bash
brew install --cask android-commandlinetools   # 또는 Android Studio로 SDK 설치
```

`~/.zshrc`에 추가:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

새 셸을 열거나 `source ~/.zshrc`로 반영한다.

### 3-2. 기기 연결

#### 유선

1. 기기에서 설정 › 휴대전화 정보 › 빌드 번호를 7번 눌러 개발자 옵션을 켠다
2. 개발자 옵션 › USB 디버깅 켜기
3. 케이블로 연결 후 기기에서 뜨는 "USB 디버깅을 허용하시겠습니까?" 확인
4. `adb devices`로 인식 확인

#### 무선 (Wi-Fi)

**Android 11(API 30) 이상 — 페어링 코드 방식**, 케이블이 아예 필요 없다:

1. 기기에서 개발자 옵션 › **무선 디버깅** 켜기
2. 무선 디버깅 항목 탭 → "페어링 코드로 기기 페어링" — IP:포트와 6자리 코드가 뜬다
3. Mac에서 페어링:
   ```bash
   adb pair <IP>:<페어링 포트>
   # 코드 입력 프롬프트가 뜨면 6자리 코드 입력
   ```
4. 페어링 후 무선 디버깅 메인 화면에 표시되는 **연결용 IP:포트**(페어링 포트와 다르다)로 연결:
   ```bash
   adb connect <IP>:<연결 포트>
   ```
5. `adb devices`로 확인

**Android 10 이하 — 케이블로 최초 1회 설정 후 전환**:

```bash
# 케이블로 연결된 상태에서
adb tcpip 5555
# 케이블을 뽑고
adb connect <기기 IP>:5555
```

기기 IP는 설정 › Wi-Fi › 연결된 네트워크 상세정보에서 확인하거나 `adb shell ip addr show wlan0`.

두 방식 모두 Mac과 기기가 같은 Wi-Fi(게스트/격리 네트워크 아님)에 있어야 한다.

### 3-3. 실행

```bash
cd apps/mobile
pnpm android    # adb devices에 잡힌 기기에 설치
```

첫 실행은 Gradle 의존성 설치 + 네이티브 컴파일까지 포함돼 오래 걸린다(5~15분). 이후는 캐시로 빨라진다.

### 3-4. 흔한 문제

- **`ANDROID_HOME`을 못 찾는다**: 3-1절의 `~/.zshrc` 설정이 안 됐거나 새 셸에서 반영을 안 한 경우다.
- **`adb devices`에 기기가 안 뜬다**: 무선 연결이면 페어링(3번)과 연결(4번)의 **포트가 다르다**는
  점부터 확인 — 같은 포트로 `connect`를 시도하면 실패한다.
- **무선 연결이 자꾸 끊긴다**: 기기가 절전 모드로 들어가면 무선 디버깅도 같이 꺼지는 기종이 있다.
  이 경우 유선으로 전환하거나 화면을 켜둔다.
- **카카오 로그인만 실패**: `.env.local`에 `KAKAO_NATIVE_APP_KEY_DEV`/`_PROD`를 안 채운 경우다.

---

## 4. 이후 개발 흐름 (공통)

- JS/TS만 바꿨다면 재빌드 필요 없다 — Metro가 떠 있으면 저장할 때마다 기기에 바로 반영된다
  (Fast Refresh). Metro만 다시 띄우려면 루트에서 `pnpm mobile:start`.
- 네이티브가 바뀌는 경우(라이브러리 추가·삭제, `app.config.ts`·`app.json` 변경, 권한/엔타이틀먼트
  변경)만 플랫폼별 2-3절/3-3절을 다시 실행한다.
- 로컬 웹을 앱 WebView에 띄우는 법(포트 프록시, LAN IP·네이버 지도 SDK 제약 등)은
  [배포 빌드 설치 가이드의 "로컬 웹을 앱에 띄울 때" 절](<[NOOK-NATIVE] 배포_빌드_설치_가이드.md>)을
  그대로 따른다 — 로컬 빌드든 EAS dev-client 빌드든 동일하다.

## 5. 이 문서가 다루지 않는 것

- EAS 클라우드로 서명된 dev-client/배포용 빌드 설치, 새 테스트 기기 등록:
  [배포 빌드 설치 가이드](<[NOOK-NATIVE] 배포_빌드_설치_가이드.md>)
- production 빌드와 App Store Connect 제출:
  [iOS EAS 빌드 및 App Store 제출](<[NOOK-115] 01.iOS_EAS_빌드_및_App_Store_제출.md>)
