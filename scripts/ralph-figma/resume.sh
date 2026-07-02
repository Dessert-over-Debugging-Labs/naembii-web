#!/bin/bash
# Figma 이식 루프 재개 스크립트 (네트워크 끊김/세션 종료 후 복구용)
# 사용법:
#   ./scripts/ralph-figma/resume.sh <새채널>   # 플러그인 재접속으로 채널이 바뀌었을 때(대부분)
#   ./scripts/ralph-figma/resume.sh            # 채널 그대로면 인자 없이
#
# 하는 일: bun PATH 세팅 → WebSocket 브리지 없으면 기동 → (채널 인자 있으면) prd/env 갱신
#          → 기존 감시견/supervise 정리(중복 방지) → 연결 probe → 단일 감시견 가동.
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"; cd "$ROOT"
export PATH="$HOME/.bun/bin:$PATH"
PRD="$SCRIPT_DIR/prd.json"
BRIDGE_DIR="/Users/osein/cursor-talk-to-figma-mcp"

# 1) 채널 인자 반영
if [ -n "$1" ]; then
  tmp=$(mktemp); jq --arg c "$1" '.figma.channel=$c' "$PRD" > "$tmp" && mv "$tmp" "$PRD"
  printf 'FIGMA_CHANNEL=%s\n' "$1" > "$ROOT/.env"
  echo "채널 갱신 → $1"
fi
CH="$(jq -r '.figma.channel' "$PRD")"; export FIGMA_CHANNEL="$CH"

# 2) 브리지(:3055) 없으면 기동
if ! lsof -iTCP:3055 -sTCP:LISTEN -n >/dev/null 2>&1; then
  echo "브리지 미실행 → 기동"
  ( cd "$BRIDGE_DIR" && nohup bun run src/socket.ts > /tmp/figma-socket.log 2>&1 & )
  sleep 2
fi
echo "브리지: $(lsof -iTCP:3055 -sTCP:LISTEN -n >/dev/null 2>&1 && echo UP || echo DOWN)"

# 3) 중복 정리
pkill -f "ralph-figma/watchdog.sh" 2>/dev/null
pkill -f "ralph-figma/supervise.sh" 2>/dev/null
sleep 1

# 4) 진행 상황
DONE=$(jq '[.userStories[]|select(.passes==true)]|length' "$PRD")
INC=$(jq '[.userStories[]|select(.passes==false)]|length' "$PRD")
NEXT=$(jq -r '[.userStories[]|select(.passes==false)]|sort_by(.priority)|.[0].id // "-"' "$PRD")
echo "진행: 완료 $DONE / 남은 $INC / 다음 $NEXT / 채널 $CH"
if [ "$INC" -eq 0 ] 2>/dev/null; then echo "이미 전부 완료됨 🎉"; exit 0; fi

# 5) 연결 probe (선택적 안내)
echo "연결 확인 중..."
if printf 'join_channel %s 조인 후 get_document_info 호출. 성공하면 ALIVE_OK, 실패면 DEAD_NO만 답해.' "$CH" \
   | timeout 100 claude --dangerously-skip-permissions --print 2>/dev/null | grep -q ALIVE_OK; then
  echo "✅ 플러그인 연결 OK"
else
  echo "⚠ 플러그인 미응답 — Figma에서 플러그인 Connect 후에도 계속되면 채널 확인 필요. 감시견은 살아나면 자동 재개함."
fi

# 6) 단일 감시견 가동
nohup "$SCRIPT_DIR/watchdog.sh" > /tmp/figma-watchdog-boot.log 2>&1 &
echo "감시견 가동 (pid $!). 진행은 /tmp/figma-watchdog.log 확인."
