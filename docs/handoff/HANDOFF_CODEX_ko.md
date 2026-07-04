# 인수인계 — 원본 이식(포팅) 루프를 Codex로 이어가기

> **상태**: `app.html` Figma 원본 포팅 루프는 **113/113 완료**.
> **정본**: v1 원본 충실 이식(`SEC/A·B·C` 안 `cook/*`)을 최종 산출물로 확정했다. `cook-v2/*`는 디자인 개선 참고안이다.
> 상태는 전부 디스크에 durable하게 저장돼 있어(멱등) 어디서든 이어갈 수 있다.
> 세션 트래킹: [`SESSIONS.md`](./SESSIONS.md) — 새 세션은 시작 시 자기 도구·세션ID를 그 표에 append.

---

## 0. 완료 상태 (2026-07-04 갱신)

원본 포팅은 `MILE-FINAL`까지 닫혀 **113/113 완료**됐다. 마지막 처리:
- `loading-FULL`, `cook3-FULL`: 접힌 전체 스크롤 콘텐츠가 없는 화면이라 적용 불가 no-op으로 정리.
- `FLOW-01`: FigJam 커넥터가 없는 Figma 디자인 파일 제약 때문에 `create_connections` 대신 `FLOW/01` 프레임+화살표 보드로 7화면 흐름을 시각화하고 통과.
- `MILE-FINAL`: `SEC/A`, `SEC/B`, `SEC/C`를 export(`board-A.png`, `board-B.png`, `board-C.png`)하고 최종 리포트 갱신.

현재 런타임 채널은 `9xw8xz3x`로 갱신했다. 다만 완료 산출 기록의 주요 작업은 채널 `cjb0km46`에서 수행됐다.

> **정본 결정(2026-07-05)**: `요리 비서 - 세인` 페이지 최상위에 `cook-v2/*` 11화면 완전 세트도 공존하지만, 최종 산출물은 원본 포팅 v1 트랙(`SEC/A·B·C` 안 `cook/*`)이다. v2는 디자인 개선 참고안으로만 보존한다.

---

## 1. 지금 상태 (2026-07-04)

### 완료된 작업 — 원본 이식(포팅)
- **소스**: 로컬 `app.html`(이 레포). **주의**: 로컬은 깃허브 origin/main과 갈라진(diverged) 버전 — 포팅은 **로컬 기준**이다.
- **Figma 페이지**: `요리 비서 - 세인` / 프레임 이름 `cook/<view>`, 섹션 `SEC/<group>`, 포스트잇 `NOTE/<view>`, 플로우 보드 `FLOW/01`.
- **상태 파일**: `scripts/ralph-figma/prd.json` — **113/113 완료**. 각 스토리 `passes`(완료) + `notes`(생성된 Figma nodeId).
- **최종 export**: `scripts/ralph-figma/exports/board-A.png`, `board-B.png`, `board-C.png`(gitignore 대상).
- **규칙 파일**: `scripts/ralph-figma/CODEX.md`(green-gate·멱등·좌표규약). **스토리라인**: `docs/FIGMA_WIREFRAME_STORIES_ko.md`. **학습 누적**: `scripts/ralph-figma/progress.txt` 상단 `## Codebase Patterns`(nodeId 맵).

### 참고: 이미 끝난 다른 트랙(건드리지 말 것)
| 트랙 | 페이지(nodeId) | 프레임 | 채널 | 상태 |
|---|---|---|---|---|
| 디자인 개선 v2 | `요리 비서 2 - 은성님 깃허브` (2042:241) | `cook-v2/*` 11화면 | fjthvb00 | 완료 |
| 레드 재이식 | `요리비서 레드` (2101:231) | `red/*` 8화면 | pd73rzoe | 완료·채점 99.7 PASS |

→ Codex는 정본 작업 시 **`요리 비서 - 세인` 페이지의 `SEC/A·B·C` 안 `cook/*` 만** 다룬다. 위 두 페이지/프레임은 절대 수정 금지.

---

## 2. Codex로 이어가는 법 (사전 준비 → 실행)

### (A) 사전 준비 — 사람이 1회
1. **WebSocket 브리지** 실행(없으면):
   ```bash
   cd /Users/osein/cursor-talk-to-figma-mcp && ~/.bun/bin/bun run src/socket.ts
   ```
   (포트 `:3055`. `lsof -iTCP:3055 -sTCP:LISTEN` 로 확인.)
2. **Figma 데스크톱**에서 `요리비서` 페이지를 열고 TalkToFigma 플러그인 **Connect** → 표시된 **채널 ID** 확인. (채널은 재연결마다 바뀐다.)
3. **채널 반영**: `.env`의 `FIGMA_CHANNEL`과 `prd.json`의 `.figma.channel`을 그 채널로 맞춘다. 가장 쉬운 방법:
   ```bash
   cd /Users/osein/cook-assistance-wireframe
   ./scripts/ralph-figma/resume.sh <표시된_채널>   # .env·prd.json 채널 갱신 + 브리지 확인
   ```
4. **절전 방지**(장시간 실행 시 플러그인 끊김 방지):
   ```bash
   caffeinate -dimsu -t 21600 &   # 6시간
   ```

### (B) Codex MCP 설정 — TalkToFigma를 Codex가 쓰도록
이 레포의 `.mcp.json`은 **Claude Code 포맷**이라 Codex는 자동으로 읽지 않는다. Codex 설정(`~/.codex/config.toml`)에 아래를 추가(키 이름은 사용 중인 Codex 버전 문서로 확인):
```toml
[mcp_servers.TalkToFigma]
command = "bunx"
args = ["cursor-talk-to-figma-mcp@latest"]
env = { FIGMA_CHANNEL = "<현재_채널>" }
```
확인: `codex mcp list`(또는 해당 서브커맨드)로 TalkToFigma가 보이는지. 안 보이면 Codex의 MCP 등록 방식대로 등록.

### (C) 실행 — 루프
현재는 **실행하지 않는다.** `prd.json`이 이미 113/113 완료라 `ralph.sh --tool codex` 재실행은 중복 작업을 만들 수 있다. 아래 명령은 과거 미완료 시점 재개용으로만 남긴다.

`ralph.sh`는 `--tool codex`를 지원하지만, 현재 문서에는 실행 명령을 남기지 않는다.
- 완료 상태 확인:
  ```bash
  jq -r '"완료 "+([.userStories[]|select(.passes==true)]|length|tostring)+"/"+(.userStories|length|tostring)+", 남은="+([.userStories[]|select(.passes==false)]|length|tostring)' scripts/ralph-figma/prd.json
  ```
- 세션 로그: `scripts/ralph-figma/session_logs/<타임스탬프>-iter-*-codex.log`.

> 참고: 기존 `watchdog.sh`(플러그인 생사 감시)는 probe에 `claude`를 쓴다. 현재 정본은 이미 완료됐으므로 watchdog도 다시 켜지 않는다.

---

## 3. ⚠️ 반드시 알아야 할 함정 (이 세션에서 크게 데인 것들)

1. **플러그인 채널은 재연결마다 바뀐다**(예: fjthvb00→o52fsjkb→s43yj3ig). 끊기면 실행 에이전트는 죽은 채널에 헛그리기만 한다 → 재연결 후 `resume.sh <새채널>`로 재핀.
2. **플러그인 창을 닫거나 맥이 절전되면 연결이 끊긴다.** → `caffeinate`로 방지, 창은 계속 열어둘 것. 소켓 로그 `/tmp/figma-socket.log`에 `No other clients in channel "<ch>"`가 뜨면 끊긴 것.
3. **단일 writer만.** 같은 채널/페이지에 두 에이전트가 동시에 그리면 서로 노드를 지워 "트윈 충돌"이 난다. 한 번에 하나만.
4. **좌표 규약(학습됨)**: `create_*`의 x/y는 **부모-상대**. `move_node`는 이 채널에서 **부모-상대로 동작**하고, **Auto Layout 자식은 move가 무시**된다(레이아웃 해제 후 이동).
5. **`export_node_as_image`는 이미지 반환만 하고 디스크 저장 경로 인자가 없다** → `exports/<view>.png` 파일 저장은 tool 단독으론 불가(세션 내 read-back으로 검증). MILE-FINAL의 export는 이 제약을 감안.
6. **프레임 rename 기능 없음** — 클론하면 원본 이름이 남는다(레이어명 대신 nodeId로 식별).
7. **멱등성 1순위**: 매 iteration은 상태 없는 새 세션. 그리기 전 `get_document_info`로 이름/nodeId로 기존 프레임을 **찾아 이어그림**(중복 프레임 금지). `notes`의 nodeId를 신뢰.
8. **팔레트 함정**: app.html `--green`은 이름만 green이고 실제는 `--primary`(테라코타 오렌지 #D66B42) 별칭 — **초록으로 칠하지 말 것**(진짜 초록 #3FA76F은 성공 강조만). 상세는 CODEX.md §4b.
9. **헤드리스 종료 gotcha**(참고): `pkill -f <프롬프트경로>`는 래퍼만 죽고 실제 프로세스가 고아로 남는다 → 실제 프로세스 커맨드라인 패턴으로 kill.

---

## 4. Codex에 붙여넣을 상세 프롬프트

현재는 완료 후 정리 세션용 프롬프트를 사용한다. 새 구현 루프를 시작하지 않는다.

```
너는 /Users/osein/cook-assistance-wireframe 의 Figma 원본 이식 트랙을 이어받는다.

현재 사실:
- Figma 페이지는 "요리 비서 - 세인"(id 939:2).
- 원본 이식 v1은 113/113 passes 완료(F0 -> MILE-FINAL).
- 최종 정본은 v1 원본 충실 이식이다: SEC/A·SEC/B·SEC/C 안 cook/* 프레임 세트.
- cook-v2/*는 병렬 디자인 개선 참고안이고, red/*는 레드 재이식 별도 트랙이다.
- FLOW/01은 프레임+화살표 보드를 유지한다. 네이티브 커넥터 교체는 발표/검수 요구가 있을 때만 별도 작업으로 연다.

작업 원칙:
- ralph-figma 루프를 다시 돌리지 마라. 남은 구현 스토리는 없다.
- Figma 쓰기 작업을 하기 전에는 TalkToFigma 채널을 새로 확인하고 단일 writer만 둔다.
- raw 세션 로그/인증/로컬 런타임 상태는 문서나 커밋에 복사하지 않는다.
- 필요한 문서 정리만 수행하고, 한국어 Conventional Commit 규칙을 따른다.
```

---

## 5. 완료 판정 / 검증
- `jq '[.userStories[]|select(.passes==false)]|length' scripts/ralph-figma/prd.json` == 0 이면 포팅 완료.
- Figma `요리비서` 페이지에서 cook/* 프레임 전체가 채워지고 플로우 화살표(FLOW-01)가 연결됐는지 육안 확인.
- 최종 리포트는 `docs/progress/FIGMA_REPORT_ko.md`.

## 6. 관련 문서
- 규칙: `scripts/ralph-figma/CODEX.md` · 스토리: `docs/FIGMA_WIREFRAME_STORIES_ko.md` · 재개: `scripts/ralph-figma/RESUME_ko.md`
- 채점(레드): `docs/verify/SCORECARD_figma_vs_html_ko.md`, `docs/verify/SCORE_REPORT_red_ko.md`
- 세션 트래킹: `docs/handoff/SESSIONS.md`
