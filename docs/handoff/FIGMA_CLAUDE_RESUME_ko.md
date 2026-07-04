# Figma Claude 세션 이어가기 세팅

> 목적: Claude Code에서 끝낸 `요리 비서 - 세인` Figma 원본 이식 트랙을 Codex/Claude 어느 쪽에서도 안전하게 이어받기 위한 최신 기준점.
> 원본 Claude 런타임 로그나 세션 저장소 원문은 복사하지 않는다. 필요한 상태는 repo 문서와 `prd.json`/Figma nodeId 기록으로만 이어받는다.

## 0. 현재 기준점

| 항목 | 기준 |
|---|---|
| repo | `/Users/osein/cook-assistance-wireframe` |
| Figma 페이지 | `요리 비서 - 세인` |
| page id | `939:2` |
| 상태 소스 | `scripts/ralph-figma/prd.json` |
| 완료 상태 | `113/113 passes`, `remaining=0` |
| 최종 리포트 | `docs/progress/FIGMA_REPORT_ko.md`, `docs/progress/FIGMA_REPORT_ko.html` |
| 최종 milestone commit | `42aa765 feat(figma): MILE-FINAL 전체 보드 export + 최종 리포트 (트랙 종료)` |
| 현재 branch 상태 | `main...origin/main`, 현재 `HEAD`는 이후 웹앱/env 작업 커밋까지 포함 |
| 최종 export | `scripts/ralph-figma/exports/board-A.png`, `board-B.png`, `board-C.png` |
| 정본 | v1 원본 충실 이식(`SEC/A·B·C` 안 `cook/*`) |
| v2 위치 | 병렬 디자인 개선 참고안(`cook-v2/*`), 정본 아님 |
| FLOW-01 | 현재 프레임+화살표 보드 유지 |

검증된 export 크기:

| 파일 | 크기 |
|---|---|
| `board-A.png` | `1999 x 1123` |
| `board-B.png` | `1998 x 746` |
| `board-C.png` | `2000 x 1080` |

## 1. 먼저 읽을 문서

새 세션은 아래 순서대로 읽는다.

1. `docs/handoff/FIGMA_CLAUDE_RESUME_ko.md` — 이 문서.
2. `docs/handoff/HANDOFF_CODEX_ko.md` — Figma 포팅 트랙 인수인계. 현재 기준으로 “루프 재실행 금지”가 반영돼 있다.
3. `scripts/ralph-figma/CODEX.md` — TalkToFigma 그리기 규칙, 멱등성, 좌표, 팔레트.
4. `scripts/ralph-figma/RESUME_ko.md` — Figma 플러그인/채널 재접속 절차.
5. `docs/progress/FIGMA_REPORT_ko.md` — MILE-FINAL과 POST-FINAL 정본 결정.
6. `docs/handoff/SESSIONS.md` — 세션 이력.

## 2. 지금 절대 하지 말 것

- `scripts/ralph-figma/ralph.sh`를 자동으로 다시 돌리지 않는다. `prd.json`은 이미 `113/113`이다.
- `cook/*` 원본 이식 v1, `cook-v2/*` 디자인 개선 v2, `red/*` 레드 재이식 트랙을 섞어 수정하지 않는다.
- Figma에 새 writer를 동시에 붙이지 않는다. TalkToFigma는 단일 writer만 둔다.
- raw Claude/Codex session log, transcript JSONL, auth 파일, 로컬 런타임 상태를 문서나 커밋에 복사하지 않는다.
- `exports/*.png`는 gitignore 대상이다. 증거 파일로 로컬 보관만 한다.

## 3. 이어서 할 수 있는 일

현재 남은 것은 구현이 아니라 공유/정리다.

| 작업 | 상태 | 실행 기준 |
|---|---|---|
| 정본 선택 | 완료 | v1 원본 충실 이식(`SEC/A·B·C` 안 `cook/*`)을 최종 정본으로 확정 |
| FLOW-01 커넥터 | 유지 | 현재는 Figma 디자인 파일 제약 때문에 `FLOW/01` 프레임+화살표 보드. 기능상 충분. 네이티브 커넥터가 꼭 필요할 때만 교체 |
| 산출물 정리 | 진행 완료 | 리포트/핸드오프/세션 문서에 “v1 정본, v2 참고안” 명시 |
| Figma 재검수 | 선택 사항 | Figma를 다시 열고 `get_document_info`, `get_node_info`로 주요 nodeId read-back |

## 4. Figma 연결이 필요한 경우

사람이 Figma에서 직접 확인하거나 커넥터 교체를 진행할 때만 연결한다.

```bash
cd /Users/osein/cook-assistance-wireframe

# Figma 데스크톱에서 TalkToFigma 플러그인 열기 -> Connect -> 표시 채널 확인
./scripts/ralph-figma/resume.sh <플러그인에_표시된_채널>

# 상태 재확인
jq -r '"완료 "+([.userStories[]|select(.passes==true)]|length|tostring)+"/"+(.userStories|length|tostring)+", 남은="+([.userStories[]|select(.passes==false)]|length|tostring)+", page="+.figma.page+", channel="+.figma.channel' scripts/ralph-figma/prd.json
```

예상 출력은 `완료 113/113, 남은=0, page=요리 비서 - 세인`이어야 한다.

## 5. 후속 세션 붙여넣기 프롬프트

아래 프롬프트는 “완료 상태에서 정리/결정 작업만 이어가기” 용이다.

```text
너는 /Users/osein/cook-assistance-wireframe 의 Figma 원본 이식 트랙을 이어받는다.

먼저 읽을 것:
1) docs/handoff/FIGMA_CLAUDE_RESUME_ko.md
2) docs/handoff/HANDOFF_CODEX_ko.md
3) scripts/ralph-figma/CODEX.md
4) scripts/ralph-figma/RESUME_ko.md
5) docs/progress/FIGMA_REPORT_ko.md
6) docs/handoff/SESSIONS.md

현재 사실:
- Figma 페이지는 "요리 비서 - 세인"(id 939:2).
- 원본 이식 v1은 113/113 passes 완료(F0 -> MILE-FINAL).
- 화면 11종, 섹션 SEC/A·B·C, 포스트잇 11, FLOW/01 보드가 완료됐다.
- 최종 milestone commit은 42aa765 feat(figma): MILE-FINAL 전체 보드 export + 최종 리포트 (트랙 종료).
- 현재 repo HEAD는 이후 웹앱/env 작업 커밋까지 포함할 수 있으니 git status/log를 먼저 확인한다.

작업 원칙:
- ralph-figma 루프를 다시 돌리지 마라. 남은 구현 스토리는 없다.
- Figma에 쓰기 작업을 하기 전에는 TalkToFigma 채널을 새로 확인하고 단일 writer만 둔다.
- raw 세션 로그/인증/로컬 런타임 상태는 문서나 커밋에 복사하지 않는다.
- v1 cook/*, v2 cook-v2/*, red/*를 섞지 말고 어느 트랙을 다루는지 먼저 명시한다.

이번 세션에서 할 수 있는 일:
A) v1 정본 기준을 공유 자료에 반영한다.
B) FLOW/01은 현 상태를 유지하고, 네이티브 커넥터 요구가 생길 때만 별도 작업으로 연다.
C) v2 cook-v2/*는 참고 개선안으로만 비교한다.

보고는 한국어로 하고, 커밋 메시지는 한글 Conventional Commit 규칙을 따른다.
```

## 6. 결정 기준

확정:

- v1을 정본으로 확정한다. 원본 `app.html` 충실도와 세분화된 nodeId/read-back 기록이 강하고, 핸드오프/검증 근거가 가장 탄탄하다.
- v2는 디자인 완성감이 강한 참고안으로 보존한다. 정본 대체가 아니라 이후 개선 아이디어 비교에 쓴다.

FLOW-01:

- 현재 유지로 확정한다. 디자인 파일에서 FigJam 커넥터 부재로 인한 제약을 보드에 정직하게 명시했다.
- 네이티브 커넥터 교체는 발표/검수 요구사항일 때만 한다. 매핑은 `홈 -> 링크 시트 -> 분석 로딩 -> 레시피 상세 -> 조리 모드 -> 완료 -> 팁 작성` 6개 전이다.
