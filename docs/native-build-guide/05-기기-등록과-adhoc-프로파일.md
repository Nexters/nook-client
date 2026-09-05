# 05. 기기 등록과 ad-hoc 프로파일 재발급

| 작성자 | 작성일 | 수정일 | 관련 작업 |
| --- | --- | --- | --- |
| coldbrow | 2026-08-19 | 2026-09-02 | NOOK-115, NOOK-332 |

> 실기기에 개발용 앱(`prod-metro`)을 깔려면 그 폰의 UDID 가 ad-hoc 프로파일에 들어 있어야 한다.
> 새 기기 등록 → 프로파일 재생성 → EAS 재업로드 절차를 다룬다. **App Store Connect API 키를 가진
> 관리자만** 할 수 있다. 팀원이 할 일(UDID 확인, QR 설치, Metro 연결)은 [01. 팀원 지침서](01-팀원-지침서.md) 2절.

## 구성 요약

실기기 디버깅은 `eas.json`의 **`prod-metro` 프로필**을 사용한다. Metro 없이 단독 실행되는
앱이 필요하면 TestFlight(store 채널)로 배포한다([06](06-App-Store-제출.md) 1절 참고).

| 항목 | 값 |
| --- | --- |
| 번들 ID | `kr.co.everynook.app` (production과 동일) |
| 배포 방식 | ad-hoc 내부 배포 — 등록된 기기 UDID에만 설치 가능 |
| JS 번들 | 앱에 미내장. 실행 시 Mac의 Metro 서버에서 로드 |

> `prod-metro`는 TestFlight/App Store의 production 앱과 번들 ID가 같아 한 기기에 둘 중
> 하나만 설치된다. `.dev` 식별자로 공존시키던 `dev-metro` 프로필은 NOOK-332 에서 걷어냈다.

ad-hoc 서명 자격 증명(배포 인증서 + ad-hoc 프로비저닝 프로파일)은 EAS 서버에 저장돼 있어
(Ad Hoc Configuration — App Store Configuration과 별도로 공존), 빌드하는 PC에는 아무
서명 파일도 필요 없다 — Xcode 로컬 빌드와 달리 Xcode
서명 설정을 신경 쓸 필요가 없다는 뜻이다.

## 3. 새 테스트 기기(iPhone) 추가

ad-hoc 프로파일에는 설치 허용 기기의 UDID 목록이 박혀 있어, 새 기기는
**UDID 등록 → 프로파일 재생성 → EAS 재업로드**가 필요하다.

**키가 없는 팀원**: 아래 절차는 App Store Connect API 키가 필요해서 키 보유자만 할 수 있다.
기기 UDID를 확인해서(기기를 Mac에 연결하고 `xcrun devicectl list devices`, 또는 Finder에서
기기 클릭) 키 보유자에게 전달해 등록을 요청하면 된다. 등록 후 새 ad-hoc 빌드부터 그 기기에
설치된다.

**키 보유자**: Individual 멤버십이라 `eas device:create`가 요구하는 Apple ID 로그인을
Account Holder 외에는 할 수 없으므로, App Store Connect API 키로 직접 처리한다. `.p8` 경로·
Key ID·Issuer ID를 아래 스크립트의 환경변수(`EXPO_ASC_*`)로 설정해 쓴다
([06. App Store 제출](06-App-Store-제출.md) 7절 참고).
모든 요청은 `Authorization: Bearer <JWT>` 헤더를 쓴다.

### 3-1. JWT 발급

```bash
node -e '
const crypto = require("crypto"), fs = require("fs");
const b64 = (s) => Buffer.from(s).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = b64(JSON.stringify({ alg: "ES256", kid: process.env.EXPO_ASC_KEY_ID, typ: "JWT" }))
  + "." + b64(JSON.stringify({ iss: process.env.EXPO_ASC_ISSUER_ID, iat: now, exp: now + 1190, aud: "appstoreconnect-v1" }));
const sign = crypto.createSign("SHA256"); sign.update(unsigned); sign.end();
console.log(unsigned + "." + sign.sign({ key: fs.readFileSync(process.env.EXPO_ASC_API_KEY_PATH, "utf8"), dsaEncoding: "ieee-p1363" }).toString("base64url"));
'
```

### 3-2. 기기 UDID 등록

UDID는 기기를 Mac에 연결하고 `xcrun devicectl list devices`로 확인하거나, Finder에서
기기를 클릭해 확인한다.

```bash
curl -X POST "https://api.appstoreconnect.apple.com/v1/devices" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"data":{"type":"devices","attributes":{"name":"<기기이름>","platform":"IOS","udid":"<UDID>"}}}'
```

### 3-3. ad-hoc 프로파일 재생성

프로파일은 본앱·ShareExtension 두 개가 필요하다. 생성에 쓸 리소스 ID를 조회한다:

```bash
# 번들 ID 리소스 (kr.co.everynook.app, kr.co.everynook.app.ShareExtension 두 건의 id)
curl -H "Authorization: Bearer $JWT" "https://api.appstoreconnect.apple.com/v1/bundleIds?filter\[identifier\]=kr.co.everynook.app"

# 배포 인증서 id 목록
curl -H "Authorization: Bearer $JWT" "https://api.appstoreconnect.apple.com/v1/certificates"

# 등록된 기기 id 목록 (새 기기 포함 전체를 프로파일에 넣는다)
curl -H "Authorization: Bearer $JWT" "https://api.appstoreconnect.apple.com/v1/devices"
```

번들 ID마다 프로파일을 생성한다 (`devices`에 전체 기기 id를 나열):

```bash
curl -X POST "https://api.appstoreconnect.apple.com/v1/profiles" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"data":{"type":"profiles",
    "attributes":{"name":"<프로파일 이름>","profileType":"IOS_APP_ADHOC"},
    "relationships":{
      "bundleId":{"data":{"type":"bundleIds","id":"<번들 리소스 id>"}},
      "certificates":{"data":[{"type":"certificates","id":"<인증서 id>"}]},
      "devices":{"data":[{"type":"devices","id":"<기기 id>"}, ...]}}}}'
```

응답의 `profileContent`(base64)를 디코드해 `.mobileprovision` 파일로 저장한다.
같은 이름의 옛 프로파일은 `DELETE /v1/profiles/{id}`로 정리한다.

### 3-4. EAS에 재업로드

`apps/mobile`에서 `pnpm exec eas credentials --platform ios` 실행 후:

1. 프로필 `prod-metro` 선택(internal 배포 프로필이면 어느 것이든 무방), Apple 로그인은 **No**
2. `credentials.json: Upload/Download credentials` → **Download** — 인증서 p12가
   `credentials/ios/`에 내려온다 (`.gitignore` 처리돼 있음)
3. 내려온 `credentials.json`에서 두 타깃(`nook`, `ShareExtension`)의
   `provisioningProfilePath`를 3-3에서 만든 새 프로파일 경로로 교체
4. 같은 메뉴에서 **Upload** → 배포 타입 **Adhoc** 선택
5. 업로드 확인 후 로컬 `credentials.json`과 `credentials/` 디렉터리는 삭제한다

이후 `pnpm --filter mobile build:ios:prod-metro`로 새 빌드를 만들면 새 기기에서도 설치된다.
