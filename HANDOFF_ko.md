# 핸드오프 — cook 와이어프레임 고도화 (독립 세션/서브에이전트용)

> **이 문서부터 읽고 시작하라.** 새 세션(또는 서브에이전트)이 이 레포를 자율로 고도화하기 위한 마스터 지침.
> 전부 자율·승인 없이 yes·사용자 인풋 없이 진행. 스토리라인을 **세세하게 쪼개** ralph-loop로 1스토리씩 구현→검증→커밋.

## 0. 이 레포가 뭔가
- 같은 서비스(영상 레시피 핸즈프리 요리 어시스턴트, 페르소나 민지)의 **다른 사람이 만든 인터랙티브 HTML 프로토타입**.
- 메인: `app.html`(~1298줄, iPhone 목업 + 뷰 라우팅 nav/show/applyHash + 캐러셀 + 음성대화 + 소셜). 조리모드 cook3(주력)/cook/cook2. 보조: `flow.html`, `wireframe-screens.html`, `wireframe.html`. 기획: `WIREFRAME.md`. 규칙: `CLAUDE.md`. 레퍼런스 이미지: `cheftory_image/`.

## 1. 목표
이 와이어프레임을 **우리가 다른 트랙(Cookflow)에서 쌓은 수정·검증 학습**과 합쳐 **모바일 네이티브 출시급**으로 발전시킨다. 단, 이 레포의 자체 방향(WIREFRAME.md)과 기존 구조(app.html 라우팅 규칙)를 존중한다.

## 2. 반드시 검토·반영할 상속 자료 (`docs/_inherited/`)
- **UI_FEEDBACK_ko.md** — 모바일 네이티브 UI 바이블: 타이포 14~16/서브 12~13px·행간·한글 줄바꿈·8px 그리드·48px 터치·정보밀도 완화·고정 하단탭바·**모든 버튼 실제 동작(dead UI 0, 없으면 최소 안내)**.
- **USER_REQUESTS_ko.md** — 사용자 요구/결정 + §7 재검증 체크리스트.
- **VERIFICATION_REGIME_ko.md** — 다중 에이전트 적대적·단계게이트·loop-until-clean 검증 레짐.
- **FANOUT_ROUND_1·2_ko.md** — 실제로 잡힌 결함 패턴(예: "재생 중" 거짓 UI, 영상 미검증, dead UI, 접근성 0, 색 하드코딩, 영어 누수). **이 레포에서도 같은 렌즈로 점검**.
- **FINAL_REPORT_ko.md** — Cookflow 결론(특히 **영상 연동: 임베드 유튜브 실제 재생은 에뮬 한계→실기기 필요, 폴백·정직 표기 필수**). 거짓 "재생 중" UI 금지 교훈을 cook3에 적용.
- **cookflow_v3_2_interactive.html** — 다크 디자인/인터랙션 레퍼런스(화면 안 버튼 전부 클릭 동작). 톤 참고.

## 3. 작업 방식 (자율 ralph-loop + 세분 검증)
1. `docs/PRODUCT_BRIEF.md`(있으면)·`WIREFRAME.md`·`CLAUDE.md`·상속 자료를 읽는다.
2. `scripts/ralph/prd.json`의 `passes:false` 최저 priority 스토리 1개만 구현.
3. **green-gate**(CODEX.md): `node --check`(script 추출) + 헤드리스 Chrome 스크린샷 + **콘솔 에러 0** + 핵심 인터랙션. 통과해야만 커밋.
4. `passes:true`+notes, `progress.txt`+`docs/progress/REPORT_ko.md` 한글 기록, 한글 커밋.
5. **세분화**: W0 감사 후 발견된 화면/결함마다 보정 스토리를 prd.json에 추가(fan-out 확장). 단계게이트마다 적대적 검증.
6. 자기재시작 supervisor로 무인 진행: `./scripts/ralph/supervise.sh 3 3`.

## 4. 실행
```bash
cd /Users/osein/cook-assistance-wireframe
./scripts/ralph/validate-prd.sh scripts/ralph/prd.json
./scripts/ralph/supervise.sh 3 3      # 미완료 0까지 자율 재시작(공백 0)
# 또는 1회: ./scripts/ralph/ralph.sh --tool codex 1
```
검증 스크린샷(시스템 Chrome 헤드리스):
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --screenshot=out.png --window-size=438,892 --force-device-scale-factor=2 \
  --virtual-time-budget=3000 "file://$PWD/app.html#cook3"
```

## 5. 가드레일
- app.html 라우팅 3곳(nav/applyHash/사이드바) 동기 규칙 준수(CLAUDE.md).
- 핸즈프리 핵심(cook3)은 정직하게: 영상 실제재생 못 하면 **거짓 "재생 중" 금지 + 폴백·상태기반 표기**.
- 한국어 카피, 모든 버튼 동작, 다크/타이포/여백/터치 = UI_FEEDBACK 준수.
- 원본 커밋 히스토리 존중, 작은 스토리 단위 커밋.

## 6. 산출
`docs/progress/REPORT_ko.md`(스토리별)·`ACTIVITY_LOG_ko.md`(시간순)·`FANOUT_ROUND_*_ko.md`(검증)·완주 시 `docs/FINAL_REPORT_ko.md`.
