# 음성비서 패널 적용 결과 리포트

작성일: 2026-07-09

## 연결된 작업 계획

- 노션 작업계획: https://app.notion.com/p/2026-07-09-398b1da1d9f981778916d22466e32043
- 로컬 계획 문서: `docs/VOICE_ASSISTANT_PANEL_PLAN_ko.md`

## 반영 내용

- 랜딩의 요리비서 소개를 "조리 중 막히는 순간을 짧게 물어보는 기능" 중심으로 보정했다.
- 앱 홈의 요리비서 진입 카드를 재료, 시간, 막히는 상황 기준의 탐색 흐름으로 바꿨다.
- 조리모드 음성비서 패널 상단에 손잡이 바를 추가했다.
- 손잡이 바를 누르면 패널이 기본 크기와 크게 보기 사이에서 전환된다.
- 손잡이 바를 위/아래로 드래그해도 크게 보기/기본 크기 전환이 되도록 보강했다.
- `:has()` 상태 갱신에만 의존하지 않도록 하단 컨트롤바에 `vpanel-open`, `vpanel-expanded` 클래스를 직접 부여했다.
- 답변이 길어질 때 입력창을 밀어내지 않고 `vpScroll` 영역 안에서 세로 스크롤되도록 분리했다.
- 패널을 닫거나 화면을 벗어나면 기본 크기로 초기화된다.
- Gemini Live 준비 안내와 추천 질문/직접 입력 흐름은 유지했다.
- 모바일 검증 스크립트가 패널 크기 전환을 자동으로 확인하도록 보강했다.
- 타이머 설정은 분/초 직접 입력, `-10초`/`+10초`/`30초` 조정, 완료 알림음 호출과 진동 상태를 확인하도록 보강했다.

## 검증 결과

- `npm run check`: PASS
- `node --check scripts/validate-mobile-flow.mjs`: PASS
- `node --check scripts/validate-app-screens.mjs`: PASS
- `node --check scripts/notion/upload-voice-assistant-panel-plan.mjs`: PASS
- `npm run verify:mobile-flow -- http://127.0.0.1:4876 9432`: PASS
- `npm run verify:app-screens -- http://127.0.0.1:4876 /tmp/naembi-voice-panel-screens 9433`: PASS, 30개 화면 실패 0
- `npm run verify:visual -- --full --min-score=96 --base-url=http://127.0.0.1:4876/`: PASS, 130 / 130
- 2026-07-09 추가 검증:
  - `npm run check`: PASS
  - `npm run verify:mobile-flow`: PASS
    - 타이머 직접 입력 `7분 20초` + `+10초` = `450초` 반영 확인
    - 타이머 완료 상태 `완료`, 알림음 호출 카운터 `1`, 흔들림 상태 확인
    - 요리비서 기본 높이 `321px` → 확장 높이 `523px` 확인
    - 긴 답변 스크롤 `scrollHeight 942`, `clientHeight 436`, `scrollTop 506` 확인
  - `npm run verify:app-screens -- http://127.0.0.1:4873`: PASS, 84개 화면 실패 0

## 모바일 확인 포인트

- 조리모드에서 `물어보기`를 누르면 요리비서 패널이 기본 크기로 열린다.
- 상단 손잡이 바를 누르거나 위로 드래그하면 크게 보기로 전환된다.
- 긴 답변은 패널 전체를 밀어내지 않고 패널 내부에서 스크롤된다.
- 크게 보기 상태에서도 추천 질문과 직접 입력이 유지된다.
- 패널이 열린 직후 자동 대화나 단계 이동은 발생하지 않는다.
- 마이크 버튼은 모바일 권한과 Gemini Live 연결 준비 확인으로 유지된다.

## 다음 단계

- Vercel 배포 후 실제 모바일 Safari/Chrome에서 손잡이 전환과 마이크 권한 안내를 확인한다.
- Gemini Live를 실제 대화로 켜기 전에는 개인정보 고지, 비용 제한, 베타 플래그를 먼저 정한다.
- 홍보/마케팅 세션에서는 "SNS 요리를 따라 하다 막히는 순간을 줄이는 베타"로 설명하고, 완성형 음성 AI처럼 과장하지 않는다.
