# 인수인계 — 원본 이식(포팅) 루프를 Codex로 이어가기

> **상태**: `app.html` Figma 원본 포팅 루프는 **113/113 완료**.
> 상태는 전부 디스크에 durable하게 저장돼 있어(멱등) 어디서든 이어갈 수 있다.
> 세션 트래킹: [`SESSIONS.md`](./SESSIONS.md) — 새 세션은 시작 시 자기 도구·세션ID를 그 표에 append.

---

## 0. 완료 상태 (2026-07-04 갱신)

원본 포팅은 `MILE-FINAL`까지 닫혀 **113/113 완료**됐다. 마지막 처리:
- `loading-FULL`, `cook3-FULL`: 접힌 전체 스크롤 콘텐츠가 없는 화면이라 적용 불가 no-op으로 정리.
- `FLOW-01`: FigJam 커넥터가 없는 Figma 디자인 파일 제약 때문에 `create_connections` 대신 `FLOW/01` 프레임+화살표 보드로 7화면 흐름을 시각화하고 통과.
- `MILE-FINAL`: `SEC/A`, `SEC/B`, `SEC/C`를 export(`board-A.png`, `board-B.png`, `board-C.png`)하고 최종 리포트 갱신.

현재 런타임 채널은 `9xw8xz3x`로 갱신했다. 다만 완료 산출 기록의 주요 작업은 채널 `cjb0km46`에서 수행됐다.

> **참고 — v1/v2 정본 결정(부차적)**: `요리 비서 - 세인` 페이지 최상위에 `cook-v2/*` 11화면 완전 세트도 공존한다. 원본 포팅 v1 트랙(`SEC/A·B·C` 안 `cook/*`)은 **113/113 완료**됐으므로, 남은 것은 **"어느 쪽을 최종 산출물로 볼지"의 정리 문제**다.

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

→ Codex는 **`요리비서` 페이지의 `cook/*` 만** 다룬다. 위 두 페이지/프레임은 절대 수정 금지.

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
`ralph.sh`는 `--tool codex`를 지원한다(내부적으로 `codex exec -C <root> --sandbox workspace-write --ephemeral -` 로 `CODEX.md`를 프롬프트로 투입, 한 iteration=한 스토리):
```bash
cd /Users/osein/cook-assistance-wireframe
./scripts/ralph-figma/ralph.sh --tool codex 6      # 남은 6 스토리
```
- 매 iteration 후 `prd.json`의 미완료 수가 0이 되면 자동 종료.
- 진행 확인:
  ```bash
  jq -r '"완료 "+([.userStories[]|select(.passes==true)]|length|tostring)+"/113, 다음="+([.userStories[]|select(.passes==false)]|sort_by(.priority)|.[0].id)' scripts/ralph-figma/prd.json
  ```
- 세션 로그: `scripts/ralph-figma/session_logs/<타임스탬프>-iter-*-codex.log`.

> 참고: 기존 `watchdog.sh`(플러그인 생사 감시)는 probe에 `claude`를 쓴다 → **Codex 단독 운용 시엔 watchdog 대신 위 `ralph.sh --tool codex`를 직접 돌리는 걸 권장**. 감시가 필요하면 probe를 `codex exec`로 바꾼 변형을 쓰거나, 사람이 진행 확인.

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

> `ralph.sh --tool codex`는 자동으로 `CODEX.md`를 프롬프트로 투입한다. 아래는 **수동으로 codex 세션에 붙여넣어 이어가고 싶을 때** 쓰는 자기완결 프롬프트다. (루프로 돌릴 땐 이 프롬프트 대신 `ralph.sh --tool codex`를 쓰면 된다.)

```
너는 cook 와이어프레임을 Figma 캔버스에 정밀 이식하는 자율 에이전트다. 작업 디렉토리는 /Users/osein/cook-assistance-wireframe.
이번 세션의 목표: 원본 포팅을 107/113 → 113으로 마무리한다. HTML(app.html)은 절대 고치지 않는다.

[먼저 할 일]
0. docs/handoff/SESSIONS.md 표에 이 세션(도구=codex, 세션ID, 오늘 날짜, 현재 채널)을 한 줄 append.
1. 읽기: scripts/ralph-figma/CODEX.md(규칙·green-gate·팔레트 §4b), scripts/ralph-figma/prd.json(스토리·figma.channel·figma.page="요리비서"), scripts/ralph-figma/progress.txt 상단 ## Codebase Patterns(nodeId 맵), docs/FIGMA_WIREFRAME_STORIES_ko.md(화면 목표), scripts/ralph-figma/source-screens/<view>.png(원본 이미지).

[연결(G0)]
2. ToolSearch로 TalkToFigma 쓰기 툴 로드(join_channel, get_document_info, get_node_info, get_nodes_info, scan_text_nodes, create_frame, create_rectangle, create_text, set_fill_color, set_stroke_color, set_corner_radius, set_layout_mode, set_padding, set_item_spacing, move_node, resize_node, clone_node, set_text_content, set_annotation, set_multiple_annotations, create_connections, export_node_as_image).
3. join_channel(prd.json .figma.channel) → get_document_info 성공 확인. 실패면 아무것도 그리지 말고 progress에 "브리지 미연결"만 남기고 종료.
4. 현재 페이지가 "요리비서"인지 확인. 이 페이지의 cook/* 프레임만 다룬다. cook-v2/*(디자인 v2)·red/*(레드) 프레임과 '요리 비서 2','요리비서 레드' 페이지는 절대 건드리지 마라.

[스토리 진행 — 한 번에 하나, 우선순위 낮은 미완료부터]
5. prd.json에서 passes=false 중 최저 priority 스토리 1개만 골라 그 acceptanceCriteria대로 구현한다. 다음 스토리로 넘어가지 마라.
   - 남은 스토리 성격: reviews-DONE(검수+export), NOTE-reviews(노란 #FFE8A3 포스트잇+set_annotation), FLOW-01(create_connections로 화면 흐름 화살표: home→sheet→loading→detail→cook3→complete→tipWrite 등), MILE-FINAL(전체 보드 정리·export 시도·최종 리포트), loading-FULL(loading 화면을 접힌 콘텐츠까지 전체 높이로 확장·resize_node).
6. 멱등: 그리기 전 get_document_info로 대상 프레임을 이름(cook/<view>)·nodeId(notes)로 찾는다. 있으면 그 프레임에 자식만 추가/수정, 없을 때만 create. 절대 중복 프레임 금지.
7. 좌표: create_*는 부모-상대. move_node는 부모-상대이며 Auto Layout 자식엔 무시됨(레이아웃 해제 후 이동).

[Green-gate]
8. G2 read-back(하드 게이트): get_node_info로 이번에 추가한 노드와 핵심 한글 라벨이 실제 존재하는지 확인.
9. G3 export: 스토리가 *-DONE/MILE-* 일 때만 export_node_as_image 시도(디스크 저장 경로 인자 없음 — read-back으로 대체 검증). G4: 영어 누수 0, 팔레트=CODEX §4b(주색 테라코타 #D66B42, 초록 금지·#3FA76F는 성공만), 본문 14~16/서브 12~13px, 8px 그리드, 48px 터치.

[기록·커밋]
10. 통과 시 해당 스토리만 prd.json passes=true + notes(nodeId) 기록, progress.txt에 한 줄, docs/progress/FIGMA_REPORT_ko.md에 한 줄. 한글 커밋 feat(figma): <id> <요약>. (커밋 실패해도 prd passes 갱신은 필수.)
11. 모든 스토리 passes=true면 마지막 응답을 정확히 <promise>COMPLETE</promise>. 아니면 간결 요약만.

[함정 요약] 채널은 재연결마다 바뀜(끊기면 resume.sh) · 플러그인 창 닫힘/절전 시 끊김(caffeinate) · 단일 writer만 · rename 없음 · export 디스크저장 불가 · --green은 오렌지 별칭.
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
