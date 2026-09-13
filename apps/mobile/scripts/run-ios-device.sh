#!/bin/sh
# 개발 앱을 실기기에 빌드·설치한다. 서명은 app.config.ts 가 맥에 설치된 팀 개발 프로파일로 잡는데, prebuild 는
# ios/ 가 없을 때만 돌기 때문에 프로파일 설치 전에 만들어진 ios/ 는 여기서 한 번 다시 만든다.
set -eu
cd "$(dirname "$0")/.."
export APP_VARIANT=development

PROFILE="$(node -p "require('./native-public-config.json').ios.devProfiles['kr.co.everynook.app.dev']")"
signed() { grep -q "PROVISIONING_PROFILE_SPECIFIER = \"$PROFILE\"" ios/*.xcodeproj/project.pbxproj 2>/dev/null; }

if ! signed; then
  npx expo prebuild --platform ios --clean
  if ! signed; then
    echo "팀 개발 프로파일(\"$PROFILE\")이 이 맥에 없다. 관리자에게 받은 .cer 와 .mobileprovision 2개를 더블클릭해 설치한 뒤 다시 실행한다." >&2
    exit 1
  fi
fi

exec npx expo run:ios --device "$@"
