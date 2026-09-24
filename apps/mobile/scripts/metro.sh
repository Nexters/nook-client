#!/bin/sh
# Metro 를 variant 고정으로 띄운다: ./scripts/metro.sh <development|production> <port>
# URL 은 기본적으로 native-public-config.json 의 variant 값을 사용하고,
# EXPO_PUBLIC_WEB_URL 이 있으면 로컬 개발 서버 주소로 재정의한다.
set -eu
VARIANT="$1"
PORT="$2"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_URL="${EXPO_PUBLIC_WEB_URL:-$(node -p "require('$DIR/native-public-config.json').webUrl['$VARIANT']")}"
echo "Metro [$VARIANT] port=$PORT web=$WEB_URL"
cd "$DIR"
APP_VARIANT="$VARIANT" EXPO_PUBLIC_WEB_URL="$WEB_URL" exec pnpm exec expo start --port "$PORT"
