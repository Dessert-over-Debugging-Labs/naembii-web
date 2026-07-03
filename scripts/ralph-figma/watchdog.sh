#!/bin/bash
# Figma 이식 루프 감시견 (채널 자동 감지판).
# TalkToFigma 플러그인은 재연결할 때마다 채널 ID가 바뀐다. 그래서 매 루프에서 socket 로그의
# '가장 최근 join 채널'을 읽어 현재 채널과 다르면 자동으로 갱신(자기 치유)한다.
# 플러그인 살아있을 때만 supervise를 돌려 토큰 낭비를 막는다.
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"; cd "$ROOT"
export PATH="$HOME/.bun/bin:$PATH"
PRD="$SCRIPT_DIR/prd.json"
SOCKLOG="/tmp/figma-socket.log"
LOG="/tmp/figma-watchdog.log"
CH="$(jq -r '.figma.channel' "$PRD")"
echo "WATCHDOG START $(date) channel=$CH (auto-detect on)" | tee -a "$LOG"

incomplete(){ jq '[.userStories[]|select(.passes==false)]|length' "$PRD" 2>/dev/null || echo 99; }

set_channel(){ # $1=new channel
  local tmp; tmp=$(mktemp)
  jq --arg c "$1" '.figma.channel=$c' "$PRD" > "$tmp" && mv "$tmp" "$PRD"
  printf 'FIGMA_CHANNEL=%s\n' "$1" > "$ROOT/.env"
  CH="$1"; export FIGMA_CHANNEL="$1"
}

detect_channel(){ # socket 로그의 가장 최근 join 채널 (플러그인 재연결 감지)
  grep -oE 'joined channel "[a-z0-9]+"' "$SOCKLOG" 2>/dev/null | tail -1 | grep -oE '"[a-z0-9]+"' | tr -d '"'
}

probe(){ # 현재 CH에서 플러그인 응답 확인
  printf 'join_channel %s 호출로 조인한 뒤 get_document_info 호출. 성공하면 정확히 ALIVE_OK, 실패/타임아웃이면 정확히 DEAD_NO 만 출력.' "$CH" \
    | timeout 100 claude --dangerously-skip-permissions --print 2>/dev/null | grep -q ALIVE_OK
}

export FIGMA_CHANNEL="$CH"
while :; do
  inc=$(incomplete)
  if [ "$inc" -eq 0 ] 2>/dev/null; then echo "ALL DONE $(date)" | tee -a "$LOG"; break; fi

  # 1) 채널 자동 감지 비활성 (다중 세션 공유 브리지에서 다른 세션 채널을 훔치는 문제로 OFF).
  #    채널은 prd.json 고정값 사용. 재연결로 바뀌면 resume.sh <채널> 로 사용자가 재핀.

  # 2) 생사 확인 후 진행
  if probe; then
    echo "$(date) 플러그인 ALIVE(ch=$CH) → supervise (남은 $inc)" | tee -a "$LOG"
    "$SCRIPT_DIR/supervise.sh" 5 3 >>"$LOG" 2>&1
  else
    echo "$(date) 플러그인 DEAD(ch=$CH) — 30s 대기 (남은 $inc)" | tee -a "$LOG"
    sleep 30
  fi
done
echo "WATCHDOG END $(date)" | tee -a "$LOG"
