#!/bin/sh
# 처음 한 번: 웹 env 파일 생성 + EAS 에서 앱 env(카카오 키·Firebase 설정 파일) 내려받기.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/apps/web/.env.local" ]; then
  cp "$ROOT/apps/web/.env.example" "$ROOT/apps/web/.env.local"
  echo "apps/web/.env.local 을 만들었다. 값(VITE_NAVER_MAP_CLIENT_ID 등)은 관리자에게 받아 채운다."
fi

cd "$ROOT/apps/mobile"
pnpm exec eas whoami >/dev/null 2>&1 || pnpm exec eas login
pnpm exec eas env:pull --environment production

echo
echo "끝. 다음은 레포 루트에서:"
echo "  pnpm dev          # 웹 + 앱 서버를 같이 띄운다"
echo "  pnpm --filter mobile ios   # 시뮬레이터에 앱 설치 (첫 번만)"
