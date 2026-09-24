#!/bin/sh
# 웹(vite)과 앱(Metro)을 같이 띄운다. 앱은 이 맥의 웹 서버를 본다.
# 웹 주소는 EXPO_PUBLIC_WEB_URL 이 있으면 그것, 없으면 LAN IP 로 만든다 — 폰은 localhost 를
# 모르고, 시뮬레이터는 LAN IP 로도 맥에 닿는다. apps/web/.env.local 에 DEV_HTTPS_KEY 가 있으면 https.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${EXPO_PUBLIC_WEB_URL:-}" ]; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost)"
  SCHEME=http
  if grep -qE '^DEV_HTTPS_KEY=.+' "$ROOT/apps/web/.env.local" 2>/dev/null; then SCHEME=https; fi
  EXPO_PUBLIC_WEB_URL="$SCHEME://$IP:5173"
fi
export EXPO_PUBLIC_WEB_URL
echo "web=$EXPO_PUBLIC_WEB_URL"

pnpm --filter web dev &
WEB=$!
trap 'kill "$WEB" 2>/dev/null' EXIT INT TERM
"$ROOT/apps/mobile/scripts/metro.sh" development 8081
