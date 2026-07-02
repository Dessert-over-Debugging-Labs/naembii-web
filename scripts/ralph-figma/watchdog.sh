#!/bin/bash
# Figma 플러그인 살아있을 때만 supervise를 돌리는 자동 재개 감시견.
# 플러그인이 죽어 있으면(get_document_info timeout) 무거운 스토리 시도로 토큰을 낭비하지 않고
# 싼 probe로 대기하다가, 살아나면 완료까지 배치를 굴린다.
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"; cd "$ROOT"
export PATH="$HOME/.bun/bin:$PATH"
PRD="$SCRIPT_DIR/prd.json"
CH="$(jq -r '.figma.channel' "$PRD")"
export FIGMA_CHANNEL="$CH"
LOG="/tmp/figma-watchdog.log"
echo "WATCHDOG START $(date) channel=$CH" | tee -a "$LOG"

incomplete(){ jq '[.userStories[]|select(.passes==false)]|length' "$PRD" 2>/dev/null || echo 99; }

probe(){
  # 싼 liveness probe: 채널 조인 + get_document_info 성공 여부만 확인
  local out
  out=$(printf 'join_channel %s 를 호출해 조인한 뒤 get_document_info 를 호출하라. 성공(현재 페이지 정보 수신)하면 정확히 ALIVE_OK 만, 실패/타임아웃이면 정확히 DEAD_NO 만 출력하라. 그 외 아무 말도 하지 마라.' "$CH" \
        | timeout 100 claude --dangerously-skip-permissions --print 2>/dev/null)
  echo "$out" | grep -q "ALIVE_OK"
}

miss=0
while :; do
  inc=$(incomplete)
  if [ "$inc" -eq 0 ] 2>/dev/null; then echo "ALL DONE $(date)" | tee -a "$LOG"; break; fi
  if probe; then
    echo "$(date) 플러그인 ALIVE → supervise 배치 (남은 $inc)" | tee -a "$LOG"
    miss=0
    "$SCRIPT_DIR/supervise.sh" 5 3 >>"$LOG" 2>&1
  else
    miss=$((miss+1))
    echo "$(date) 플러그인 DEAD (miss=$miss) — 60s 대기 (남은 $inc)" | tee -a "$LOG"
    sleep 60
  fi
done
echo "WATCHDOG END $(date)" | tee -a "$LOG"
