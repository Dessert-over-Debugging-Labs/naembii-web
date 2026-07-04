# 인수인계 — cook 웹앱(app.html) 베타 트랙을 Codex로 이어가기

> **목표**: 이 repo의 `app.html`(핸즈프리 요리 웹앱)을 **베타 출시급**으로 이어서 고도화한다.
> 이 문서는 **웹앱 트랙** 전용이다. **Figma 이식 트랙은 별개** → [`HANDOFF_CODEX_ko.md`](./HANDOFF_CODEX_ko.md)(FLOW-01 블록).
> 세션 트래킹: [`SESSIONS.md`](./SESSIONS.md) — 새 세션은 시작 시 자기 도구·세션ID를 그 표에 append.

## 0. 세션 트래킹 (반드시)

- 시작하면 `SESSIONS.md` 표에 **자기 줄 추가**: 도구(Codex), 세션ID, 날짜, "웹앱 트랙", 한 일.
- Codex 세션ID = `codex exec` 롤아웃 파일명(`~/.codex/sessions/` 아래). 그 식별자를 기록.
- 직전 인계 세션: **#4 Claude Code `323929bf-d21d-4ad5-82f1-bf9aed546036` (2026-07-04)** — 베타 방향 확정 + 레시피 후보 준비.

## 1. 현재 상태 (2026-07-04 실측)

- repo: 로컬 `~/cook-assistance-wireframe` (origin/main보다 **129커밋 앞선** 활성 라인). 라이브 **naembi.vercel.app**.
- **주력 파일 `app.html`**(단일 HTML, 빌드툴 없음). 데이터=파일 내 **`RECIPES` 배열**(line ~1590). 이미 다건 큐레이션됨:
  순두부찌개(`CgapOjKdo9I`)·감바스(`VvM59BXz6Bw`)·아보카도 비빔밥(`eJekYxjFewM`) 등, **실제 videoId·구간 타임코드** 보유.
  형식: `{id, name, title, channel, servings, time, difficulty, food, summary, ingredients:{main,seasoning:[{n,q}]}, steps:[{letter,title,time,start,end,subs:[]}]}`.
- 백엔드 = **Vercel 서버리스 `api/`**(`beta-signup.js`·`feedback.js`·`_lib/collect.js`) → 이메일/피드백을 **GitHub Issue 또는 웹훅**으로 수집(`.env`). **AWS 아님.**
- 배포 = **Vercel**(`vercel.json`: `/`→`/app.html`, `.vercelignore`로 app.html+api만). GitHub↔Vercel 미연동일 수 있음(수동 배포).
- 자율 루프: 루트 [`HANDOFF_ko.md`](../../HANDOFF_ko.md) + `scripts/ralph/`(prd.json·supervise.sh·green-gate) + `docs/_inherited/`(cookflow 학습 상속).
- ⚠️ **주의 — CLAUDE.md 일부 stale**: "모듈 스코프 steps 배열/상세는 순두부 고정" 서술은 옛 버전 기준. **현재 코드는 `RECIPES` 배열 다건 + `currentRecipe`/`recipeById`/`goDetail`** 로 리팩토링됨. **코드가 정답**(CLAUDE.md 원칙).
- ⚠️ **미커밋 WIP 가능성**: 2026-07-04 기준 `app.html`에 대규모(±1700줄) 미커밋 변경이 있었다. **시작 시 `git status`/`git diff --stat`로 확인**하고, 진행 중 작업이 있으면 **덮지 말고 사용자와 조율**한 뒤 이어가라.

## 2. 이 세션(#4)이 확정/준비한 것

- **베타 방향 확정**: 베타 = **프론트 더미 레시피(`RECIPES`) + 기존 Vercel `api/` 수집기**. **AWS·DB 보류.**
  AWS 트리거(하나라도 실제로 필요할 때만): 로그인/개인화 저장 · 레시피 수백 개 · 조리세션/음성로그 분석.
- **추가 레시피 후보 준비**: [`docs/RECIPES_CANDIDATES.js`](../RECIPES_CANDIDATES.js) + [`docs/RECIPES_CANDIDATES_ko.md`](../RECIPES_CANDIDATES_ko.md).
  김치볶음밥·계란말이·된장찌개·제육볶음 4종. **요리 내용(재료/단계/subs)은 채웠고, 영상 바인딩(id·channel·start/end)은 `TODO(영상)`** — 정직성 원칙상 지어내지 않음. RECIPES 형식과 일치 확인됨.

## 3. Codex가 이어서 할 일 (우선순위)

- **A. app.html WIP 상태 파악·정리** — `git status`/`diff` 확인. 진행 중 대작업이 있으면 사용자와 커밋/정리 방침 합의 후 진행(가로채지 말 것).
- **B. 추가 레시피 완성** — 각 후보 요리의 **임베드 가능** 유튜브 영상 1개 선정 → `.claude/skills/recipe-from-youtube` 스킬로 단계 구간(start/end 초)·재료 추출 → `RECIPES_CANDIDATES.js`의 TODO 채움 → `app.html`의 `RECIPES`에 통합 → `renderHomeSections()`의 `popIds`/`recIds`에 id 등록 → 조리모드 seek 확인.
- **C. ralph-loop 다음 스토리** — `scripts/ralph/prd.json`의 `passes:false` 최저 priority 1개를 green-gate 통과시켜 구현→검증→한글 커밋(HANDOFF_ko.md 방식).
- **D. 배포 준비** — `api/` 수집처를 **사용자 본인 것으로 전환**(`.env`의 `COOK_BETA_GITHUB_REPO`/`COOK_BETA_GITHUB_TOKEN` 또는 `COOK_BETA_WEBHOOK_URL`), beta-signup·feedback 폼 e2e 확인.

## 4. 가드레일 (CLAUDE.md·HANDOFF_ko.md 준수)

- **라우팅 3중 동기**: 화면 추가/변경 시 `nav`·`show`·`applyHash`·사이드바 마크업 모두 갱신.
- **합성-클립 함정**: `.screen`/`.vpanel`에 transform/opacity/will-change 추가 금지(44px 모서리 깨짐). 패널 등장은 visibility 토글.
- **영상 정직성**: 재생 못 하는 환경에서 **거짓 "재생 중" 금지** — 정적 썸네일+정직 폴백. 타임코드 틀리면 seek 깨짐 → 실제 값만.
- **UI**: 한국어 카피, **모든 버튼 동작(dead UI 0)**, 동적 주입 후 `lucide.createIcons()` 재호출, z-index 스택 준수, 본문 ≥16px·8px 그리드·48px 터치.
- **green-gate**: `<script>` 추출 `node --check` + 헤드리스 Chrome 스크린샷 + **콘솔 에러 0** 통과해야 커밋. **한글 Conventional Commit.**
- **배포 워크플로우**: 수정 → **사용자가 본인 GitHub에 push → Vercel 배포**. **Codex는 커밋까지만**(푸시·배포·시크릿 설정은 사용자).

## 5. 붙여넣기용 Codex 프롬프트

```
너는 cook 핸즈프리 요리 웹앱을 이어서 고도화한다. 작업 repo는 ~/cook-assistance-wireframe 이다.

■ 시작 전 이 순서로 읽어라(이 repo의 진짜 지침, 코드가 정답):
  1) HANDOFF_ko.md (루트) — 마스터 지침·ralph-loop 방식·가드레일·상속 자료.
  2) docs/handoff/HANDOFF_WEBAPP_CODEX_ko.md — 이 웹앱 트랙 인수인계(현재 상태·할 일·가드레일).
  3) CLAUDE.md — app.html 구조·라우팅(nav/show/applyHash 3중 동기)·cook3 영상·합성클립 함정.
     단 CLAUDE.md의 "steps 배열/순두부 고정" 서술은 stale — 현재는 RECIPES 배열 다건이다(코드 확인).
  4) docs/handoff/SESSIONS.md — 시작 시 여기 표에 네 세션(Codex, 세션ID, 날짜, 웹앱 트랙, 할 일) 한 줄 append.

■ 사실
- 주력 파일 app.html(단일 HTML). 데이터=파일 내 RECIPES 배열(순두부·감바스·아보카도 등 실제 videoId·타임코드).
- 백엔드는 이미 Vercel 서버리스 api/(beta-signup·feedback → GitHub Issue/웹훅). AWS로 다시 만들지 마라.
- 배포는 Vercel. 확정 방향: 베타=프론트 더미 레시피+api 수집기, AWS 보류. React/Next로 옮기거나 다른 repo에 새로 만들지 마라.
- app.html에 미커밋 대작업이 있을 수 있으니 시작 시 git status/diff 확인, 진행 중 작업은 덮지 말고 사용자와 조율.

■ 이번에 할 일: <구체 요청을 적는다. 미지정 시 우선순위:
  (A) app.html WIP 상태 파악·정리(사용자 조율) →
  (B) docs/RECIPES_CANDIDATES.js의 후보(김치볶음밥·계란말이·된장찌개·제육볶음)를 recipe-from-youtube 스킬로
      영상 바인딩(id·channel·start/end) 채워 RECIPES에 통합 + popIds/recIds 등록 →
  (C) scripts/ralph/prd.json의 다음 passes:false 스토리를 green-gate 통과시켜 구현 →
  (D) api/ 수집처를 사용자 본인 것으로 전환 안내 + beta-signup/feedback e2e 확인.>

■ 가드레일: 라우팅 3중 동기, 합성클립 함정(.screen/.vpanel transform 금지), 영상 정직성(거짓 재생 금지·타임코드 실제값),
  한국어 카피·모든 버튼 동작·lucide.createIcons() 재호출. green-gate(node --check + 헤드리스 스크린샷 + 콘솔에러0) 통과 시
  한글 Conventional Commit. 푸시·배포·시크릿 설정은 사용자가 한다(너는 커밋까지). 자율 진행.

작업 후 로컬로 확인(스크린샷/URL)하고 한글로 보고. SESSIONS.md에 세션 기록을 남겨라.
```
