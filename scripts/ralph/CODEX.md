# Ralph Agent Instructions — cook 와이어프레임 고도화 (HTML 프로토타입, Codex)

너는 이 레포의 인터랙티브 HTML 프로토타입을 고도화하는 자율 에이전트다. 한 번 호출당 **정확히 한 스토리**만 끝내고 커밋하고 멈춘다.

## 0. 먼저 읽을 것
1. `HANDOFF_ko.md` — 마스터 지침(목표·상속 자료·방식).
2. `CLAUDE.md` — 이 레포 규칙(라우팅 3중 동기 nav/show/applyHash, cook3/vpanel, **WebKit 합성-클립 함정**, lucide.createIcons 재호출, z-index 스택, 소셜 localStorage).
3. `WIREFRAME.md` — 서비스 기획.
4. `docs/_inherited/` — 우리 다른 트랙 학습: UI_FEEDBACK_ko.md(모바일 UI 바이블)·VERIFICATION_REGIME_ko.md·FANOUT_ROUND_1·2_ko.md(잡힌 결함 패턴)·FINAL_REPORT_ko.md(영상 정직성 교훈)·cookflow_v3_2_interactive.html(다크 톤 참고).
5. `PRD_FILE`(`scripts/ralph/prd.json`), `PROGRESS_FILE`(`scripts/ralph/progress.txt` 상단 Codebase Patterns).

## 1. 절차
1. `passes:false` 중 최저 priority 1개만 구현. 단일 브랜치(main), 브랜치 전환 금지.
2. green-gate(§2) 통과 → `passes:true`+notes → progress.txt + docs/progress/REPORT_ko.md 한글 기록 → 한글 커밋(`feat(app): W-XX 한글 요약`) → 영어면 amend.

## 2. Green-gate (통과해야만 커밋)
- **JS 문법**: app.html(및 수정 html)의 `<script>` 본문 추출해 `node --check` 통과.
- **렌더/콘솔**: 시스템 Chrome 헤드리스로 해당 화면 스크린샷 + **콘솔 에러 0** 확인:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --screenshot=scripts/ralph/screenshots/<id>.png --window-size=438,892 \
    --force-device-scale-factor=2 --virtual-time-budget=3000 "file://$PWD/app.html#<view>"
  ```
  콘솔 에러는 `--enable-logging --v=1` 또는 임시 주입 스크립트로 수집. 깨진 화면/잘린 패널(합성-클립 함정) 커밋 금지.
- 스토리의 핵심 인터랙션이 동작(라우팅 3중 동기 유지, lucide.createIcons 재호출).

## 3. 핵심 적용 원칙 (상속 학습 반영)
- **모든 버튼 실제 동작**: 화면 없으면 최소 안내(토스트). dead UI 0.
- **모바일 네이티브**(UI_FEEDBACK): 본문 14~16px·서브 12~13px·행간·한글 줄바꿈(keep-all)·8px 그리드·48px 터치·정보밀도 완화·고정 하단탭바.
- **핸즈프리 cook3 정직성**(FANOUT/FINAL 교훈): 영상 실제재생 못 하면 **거짓 "재생 중" 금지** + 상태기반/폴백 표기. 페이싱(자동진행은 vpScript 데모 한정, 사용자 진행 보장).
- **영어 누수 금지**(STEP/Mic 등 한글), 접근성(aria/contentDescription 상응), 다크/색은 토큰.
- app.html 구조·라우팅 규칙·합성-클립 함정 **반드시 준수**(CLAUDE.md).

## 4. progress / 리포트
progress.txt: `## [날짜] - [Story] / 구현 / 변경파일 / 검증(스크린샷·node --check) / 학습 ---`
REPORT_ko.md: `### [Story] 제목 · [날짜] / 무엇을 / 어떻게 / 확인 / 다음`

## 5. 세분화(중요)
W0 감사에서 화면 인벤토리·결함을 뽑은 뒤, **화면/결함마다 보정 스토리를 prd.json에 idempotent 추가**(codex 미실행 시 jq 병합). 단계게이트마다 적대적 fan-out 검증(VERIFICATION_REGIME §1 렌즈).

## 6. 커밋 금지
`scripts/ralph/session_logs|archive|screenshots|.last-branch`, 임시 캡처/스크래치.

## 7. 종료
모든 스토리 passes:true면 마지막 응답을 정확히:
```xml
<promise>COMPLETE</promise>
```
아니면 간결 요약만. 다음 스토리로 넘어가지 마라.
