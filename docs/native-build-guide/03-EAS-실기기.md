# EAS 개발 빌드에 새 iPhone 추가하기

EAS의 `dev-metro` 빌드를 새 iPhone에 설치하기 위한 관리자 절차다. App Store Connect API 키가 필요하다.

```text
UDID 확인 → Apple에 기기 등록 → ad-hoc 프로파일 2개 재생성
→ EAS credentials에 업로드 → dev-metro 새 빌드 생성
```

| 항목 | 값 |
| --- | --- |
| Bundle ID | `kr.co.everynook.app.dev` |
| 배포 방식 | 등록된 기기만 설치 가능한 ad-hoc |
| JS | 앱에 내장하지 않고 Mac의 Metro에서 로드 |

## 1. 기기 등록

팀원에게 기기 이름과 UDID를 받아 레포 루트에서 실행한다.

```bash
pnpm ios:signing device "<기기 이름>" <UDID>
```

이 명령은 Apple에 기기를 등록하고 로컬 개발 프로파일도 갱신한다. ad-hoc 프로파일은 다음 단계에서 별도로 만든다.

## 2. ad-hoc 프로파일 재생성

본앱과 ShareExtension용 프로파일이 각각 필요하다. 현재 자동화된 명령이 없으므로 App Store Connect API로 생성한다.

### JWT 만들기

`EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`가 설정되어 있어야 한다.

```bash
export JWT="$(node -e '
const crypto = require("crypto"), fs = require("fs");
const b64 = (s) => Buffer.from(s).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = b64(JSON.stringify({ alg: "ES256", kid: process.env.EXPO_ASC_KEY_ID, typ: "JWT" }))
  + "." + b64(JSON.stringify({ iss: process.env.EXPO_ASC_ISSUER_ID, iat: now, exp: now + 1190, aud: "appstoreconnect-v1" }));
const sign = crypto.createSign("SHA256"); sign.update(unsigned); sign.end();
console.log(unsigned + "." + sign.sign({ key: fs.readFileSync(process.env.EXPO_ASC_API_KEY_PATH, "utf8"), dsaEncoding: "ieee-p1363" }).toString("base64url"));
')"
```

### 리소스 ID 조회

```bash
curl -H "Authorization: Bearer $JWT" \
  "https://api.appstoreconnect.apple.com/v1/bundleIds?filter%5Bidentifier%5D=kr.co.everynook.app.dev"
curl -H "Authorization: Bearer $JWT" \
  "https://api.appstoreconnect.apple.com/v1/certificates"
curl -H "Authorization: Bearer $JWT" \
  "https://api.appstoreconnect.apple.com/v1/devices"
```

본앱 식별자는 `kr.co.everynook.app.dev`, 확장 식별자는 `kr.co.everynook.app.dev.ShareExtension`이다.

### 프로파일 생성

두 Bundle ID에 대해 각각 요청한다. `devices`에는 설치를 허용할 전체 기기 ID를 넣는다.

```bash
curl -X POST "https://api.appstoreconnect.apple.com/v1/profiles" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"data":{"type":"profiles",
    "attributes":{"name":"<프로파일 이름>","profileType":"IOS_APP_ADHOC"},
    "relationships":{
      "bundleId":{"data":{"type":"bundleIds","id":"<번들 ID>"}},
      "certificates":{"data":[{"type":"certificates","id":"<인증서 ID>"}]},
      "devices":{"data":[{"type":"devices","id":"<기기 ID>"}]}}}}'
```

응답의 `profileContent`를 base64 디코딩해 `.mobileprovision`으로 저장한다. 업로드가 끝난 뒤 같은 이름의 이전 프로파일은 `DELETE /v1/profiles/{id}`로 정리할 수 있다.

## 3. EAS에 업로드

```bash
cd apps/mobile
pnpm exec eas credentials --platform ios
```

1. `dev-metro` 프로필을 선택하고 Apple 로그인에는 `No`를 선택한다.
2. `credentials.json: Upload/Download credentials`에서 `Download`를 선택한다.
3. 받은 `credentials.json`에서 `nook`, `ShareExtension`의 `provisioningProfilePath`를 새 프로파일 경로로 바꾼다.
4. 같은 메뉴에서 `Upload`를 선택하고 배포 타입으로 `Adhoc`을 선택한다.
5. 업로드를 확인한 뒤 내려받은 `credentials.json`과 `credentials` 디렉터리를 삭제한다.

이 파일들은 배포 인증서의 개인키를 포함할 수 있으므로 남겨두지 않는다.

## 4. 새 빌드 생성

레포 루트로 돌아가 실행한다.

```bash
pnpm --filter mobile build:ios:dev-metro
```

완료된 빌드의 QR 코드로 앱을 설치한다. 새 프로파일은 기존 빌드에 적용되지 않으므로 반드시 새 빌드가 필요하다.

