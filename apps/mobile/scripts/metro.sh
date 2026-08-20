#!/bin/sh
# Metro 를 variant 고정으로 띄운다: ./scripts/metro.sh <development|production> <port>
# URL 은 native-public-config.json 의 variant 값을 강제 주입해, 로컬 .env 의
# EXPO_PUBLIC_* 오버라이드와 무관하게 항상 해당 variant 서버를 본다.
set -eu
VARIANT="$1"
PORT="$2"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_URL="$(node -p "require('$DIR/native-public-config.json').webUrl['$VARIANT']")"
API_URL="$(node -p "require('$DIR/native-public-config.json').apiBaseUrl['$VARIANT']")"
echo "Metro [$VARIANT] port=$PORT web=$WEB_URL api=$API_URL"
cd "$DIR"
APP_VARIANT="$VARIANT" EXPO_PUBLIC_WEB_URL="$WEB_URL" EXPO_PUBLIC_API_BASE_URL="$API_URL" exec pnpm exec expo start --port "$PORT"
