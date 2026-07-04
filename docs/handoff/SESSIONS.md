# 세션 트래킹 (Claude ↔ Codex 인수인계)

> 이 프로젝트(cook 와이어프레임 → Figma 이식)를 여러 세션/도구가 이어서 작업한다.
> **새 세션을 시작하면 아래 표에 한 줄 추가**하라 (도구, 세션ID, 날짜, 채널, 한 일).

## 세션 로그

| # | 도구 | 세션 ID | 날짜 | Figma 채널 | 한 일 / 상태 |
|---|------|---------|------|-----------|--------------|
| 1 | Claude Code (Opus 4.8 1M) | `68dce752-3c5e-4b33-8b86-d2037d4d6c23` | 2026-07-02~04 | ihbg56ny→kpgtp6vl→607h63ew→**9p9mv14b**(포팅) / fjthvb00→o52fsjkb→**s43yj3ig**(디자인v2) / **pd73rzoe**(레드) | 디자인 v2 11화면 완료, 레드 재이식 8화면 완료(채점 99.7 PASS), 원본 포팅 **107/113**까지 진행 후 인수인계 |
| 2 | Codex | `rollout-2026-07-04T19-52-12-019f2cc1-e3c6-70e1-997f-f86bb59fcca3` | 2026-07-04 | **cjb0km46**(포팅) | Codex MCP에 TalkToFigma 등록 후 원본 포팅 **109/113 → 113/113** 마무리 이어감 |
| 3 | Claude Code (Opus 4.8 1M) | 인터랙티브(스크래치패드 UUID) | 2026-07-04 | **cjb0km46**(포팅) | `FLOW-01` 커넥터 벽 **3회차 재확인**(join OK → `set_default_connector` `No connector found`). **자율 종료 불가 판정** → 루프 대신 사람 결정 3건(§0)으로 인수인계 종료. 그리기·커밋 대상 없음(가짜 통과 거부, 리스케줄 없음). |
| 4 | Claude Code (Opus 4.8 1M) | `323929bf-d21d-4ad5-82f1-bf9aed546036` | 2026-07-04 | — (**웹앱 트랙**, Figma 아님) | **베타 방향 확정**: 프론트 더미 레시피(app.html `RECIPES`) + 기존 Vercel `api/` 수집기, **AWS 보류**. `docs/RECIPES_CANDIDATES.js`(추가 후보 4종·영상 TODO) 준비. cookflow 계획 정정(실제 제품 프론트=이 repo `app.html`). 웹앱 이어가기 상세 프롬프트: [`HANDOFF_WEBAPP_CODEX_ko.md`](./HANDOFF_WEBAPP_CODEX_ko.md) |

## 세션 ID 확인 방법
- **Claude Code**: 헤드리스 실행 시 `--session-id <uuid>`. 인터랙티브 세션은 스크래치패드 경로의 UUID.
- **Codex**: `codex exec` 실행 시 롤아웃 파일이 `~/.codex/sessions/`(또는 `~/.codex/`) 아래 생성됨. 그 파일명/경로의 세션 식별자를 위 표에 기록.
- 새 세션은 시작 시 위 표에 **자기 도구·세션ID·날짜·채널**을 append 할 것.

## 진행 상태 요약 (2026-07-04 기준)
- **원본 이식(포팅) — ⚠ 루프 자율 종료 불가**: 페이지 `요리 비서 - 세인`, 프레임 `cook/<view>`, `scripts/ralph-figma/prd.json` **109/113**. 남은 4개(`FLOW-01`, `MILE-FINAL`, `loading-FULL`, `cook3-FULL`)는 **전부 사람 결정 필요** → 상세·결정 3건은 [`HANDOFF_CODEX_ko.md` §0](./HANDOFF_CODEX_ko.md) 참조. FLOW-01 커넥터가 유일한 실질 블로커(FigJam 커넥터 1개 수동 생성 or 대체 승인 or 드롭).
- **디자인 v2 (완료)**: 페이지 `요리 비서 2 - 은성님 깃허브`(2042:241), `cook-v2/*` 11화면. 채널 fjthvb00.
- **레드 재이식 (완료, 채점 99.7 PASS)**: 페이지 `요리비서 레드`(2101:231), `red/*` 8화면. 채널 pd73rzoe.
- **웹앱 트랙 (베타, Figma와 별개)**: 프론트=`app.html`(RECIPES 다건 큐레이션 진행 중, Vercel `api/` 수집기), 배포 Vercel(naembi). 방향 확정=더미 레시피+api, AWS 보류. 이어가기: [`HANDOFF_WEBAPP_CODEX_ko.md`](./HANDOFF_WEBAPP_CODEX_ko.md). 세션 #4 참조.
