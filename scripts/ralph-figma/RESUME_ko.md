# Figma 이식 루프 — 재개 가이드 (네트워크 끊김 / 세션 종료 후 복구)

## 상태는 어디에 저장되나 (이미 durable)
- **`scripts/ralph-figma/prd.json`** 이 곧 상태다. 각 스토리의 `passes`(완료 여부)와 `notes`(생성된 Figma nodeId)가 디스크에 남는다. 네트워크가 끊겨도 이 파일은 그대로다.
- **`scripts/ralph-figma/progress.txt`** 상단 `## Codebase Patterns`에 nodeId 맵·학습 누적.
- 매 스토리는 **멱등**하게 그려지므로(이름/nodeId로 기존 프레임을 찾아 이어그림), 중간에 죽어도 다시 돌리면 **완료 지점부터** 이어간다. 같은 화면을 두 번 그리지 않는다.

## 재개 방법 (원클릭)
Figma 플러그인은 **재접속할 때마다 채널이 바뀐다**(예: 5evd9cs8 → 6rkd10x7). 그래서 재개 시 보통 새 채널을 넘긴다.

```bash
cd /Users/osein/cook-assistance-wireframe

# 1) Figma 데스크톱에서 TalkToFigma 플러그인 열고 Connect → 표시된 채널 확인
# 2) 그 채널로 재개 (브리지 자동 기동 + 중복 정리 + 감시견 가동까지 한 번에)
./scripts/ralph-figma/resume.sh <플러그인에_표시된_새_채널>

# 채널이 그대로면 인자 없이:
./scripts/ralph-figma/resume.sh
```

`resume.sh`가 하는 일: bun PATH 세팅 → WebSocket 브리지(:3055) 없으면 기동 → 채널 갱신 → 기존 감시견/supervise 정리(중복 방지) → 연결 probe → **단일 감시견** 가동.

## 진행 확인
```bash
# 완료/남은/다음
jq -r '"완료 "+([.userStories[]|select(.passes==true)]|length|tostring)+"/106, 다음="+([.userStories[]|select(.passes==false)]|sort_by(.priority)|.[0].id)' scripts/ralph-figma/prd.json
tail -f /tmp/figma-watchdog.log      # 감시견 로그
```

## 감시견 동작
- 1분 주기로 싼 probe(join+get_document_info)로 플러그인 생사 확인.
- 살아있으면 supervise 배치로 스토리를 완료까지 진행. 죽어 있으면 토큰 낭비 없이 대기.
- 네트워크가 끊기면 probe가 실패(DEAD 취급)하고 대기 → 네트워크 복구되면 자동 재개.
- **주의**: 감시견은 nohup 프로세스라 터미널을 닫아도 살지만, **재부팅/로그아웃하면 죽는다.** 그 경우 위 `resume.sh`로 다시 띄우면 된다.

## 새 Claude Code 세션에서 이어가려면
1. 위 `resume.sh <채널>` 실행(감시견이 실제 그리기를 수행).
2. 규칙: `scripts/ralph-figma/CODEX.md` · 스토리: `docs/FIGMA_WIREFRAME_STORIES_ko.md` · 상태: `prd.json`.
3. 세션이 직접 그리려면 이 레포에서 세션을 시작해야 `.mcp.json`(TalkToFigma)이 로드된다(현재 세션엔 미로드).

## 트러블슈팅
- **계속 DEAD**: 플러그인 창이 닫혔거나(창 닫으면 실행 멈춤) 채널 불일치. Connect 후 채널 재확인.
- **브리지 죽음**: `cd /Users/osein/cursor-talk-to-figma-mcp && bun run src/socket.ts` (resume.sh가 자동 처리).
- **중복 그리기 우려**: 감시견/supervise는 반드시 1개만. `pkill -f ralph-figma/watchdog.sh` 후 resume.sh로 재기동.
