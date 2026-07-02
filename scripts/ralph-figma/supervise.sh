#!/bin/bash
# Cookflow 자기재시작 supervisor — 미완료 0까지 ralph 배치를 스스로 재시작.
# wakeup 의존 제거(공백 방지) + 진척 정체 감지(무한 그라인딩 방지).
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.bun/bin:$PATH"
PRD="$SCRIPT_DIR/prd.json"
export FIGMA_CHANNEL="$(jq -r '.figma.channel' "$PRD" 2>/dev/null)"
LOG="$ROOT/docs/progress/FIGMA_ACTIVITY_LOG_ko.md"
BATCH="${1:-3}"          # 배치당 codex iteration
MAX_STALL="${2:-3}"      # 진척 없는 배치 연속 한도
stall=0

incomplete() { jq '[.userStories[]|select(.passes==false)]|length' "$PRD" 2>/dev/null || echo 99; }
donecnt()    { jq '[.userStories[]|select(.passes==true)]|length' "$PRD" 2>/dev/null || echo 0; }

echo "SUPERVISE START $(date) batch=$BATCH"
while :; do
  inc=$(incomplete)
  if [ "$inc" -eq 0 ] 2>/dev/null; then
    echo "ALL DONE $(date)"
    printf '| %s | 완주 | supervisor: 전 스토리 완료 감지. FINAL_REPORT 단계로. |\n' "$(date '+%Y-%m-%d %H:%M')" >> "$LOG"
    break
  fi
  before=$(donecnt)
  "$SCRIPT_DIR/ralph.sh" --tool claude "$BATCH" >>"$ROOT/../ralph-figma-supervise.log" 2>&1
  after=$(donecnt)
  if [ "$after" -le "$before" ]; then stall=$((stall+1)); else stall=0; fi
  echo "batch done $(date) done=$after stall=$stall"
  if [ "$stall" -ge "$MAX_STALL" ]; then
    nextid=$(jq -r '[.userStories[]|select(.passes==false)]|sort_by(.priority,.id)|.[0].id // "?"' "$PRD")
    echo "STALLED at $nextid $(date)"
    printf '| %s | 정체 | supervisor STALL: %s에서 %d배치 무진척 → 중단. 로그 점검 필요. |\n' "$(date '+%Y-%m-%d %H:%M')" "$nextid" "$MAX_STALL" >> "$LOG"
    break
  fi
  sleep 2
done
echo "SUPERVISE END $(date)"
