# 동적 검증 워크플로우 실행 리포트

- 일시: 2026-07-04T15:59:31.612Z
- 판정: **PASS**
- 점수: **100 / 100 (100%)**
- 통과 기준: **95% 이상**
- 모드: visual 포함
- 기준 URL: `http://127.0.0.1:4191/`

## 왜 빠르게 끝났나

기존 루프는 문법, DOM 존재, API validation, 금지어 캡처만 보는 스모크 검증이었다. 이번 리포트부터는 같은 게이트 위에 점수표를 얹어 카피, 전환, 수집, 미리보기, 비노출, 반응형, 배포, 루프 재현성을 별도로 평가한다.

## 변경 파일

- `README.md`
- `app.html`

## 선택된 워크플로우

| workflow | 선택 이유 |
| --- | --- |
| core | 항상 실행 |
| api | api/app 변경 감지 |
| deploy | full 실행 |
| docs | full 실행 |
| visual | --visual 요청 |

## 점수표

| 항목 | 배점 | 점수 | 달성률 | 근거 | 보정 후보 |
| --- | ---: | ---: | ---: | --- | --- |
| 사용자 가치·카피 명확성 | 15 | 15 | 100% | 4/4 신호 충족 | 히어로, CTA, 레시피 요청, 작은 냄비 감성 카피가 모두 사용자 행동으로 이어져야 한다. |
| 베타 전환 흐름 | 15 | 15 | 100% | 5/5 신호 충족 | 모바일/데스크톱/하단 신청 폼과 성공 메시지를 모두 유지한다. |
| 피드백·레시피 수집 | 15 | 15 | 100% | 5/5 신호 충족 | 베타 피드백과 레시피 요청이 같은 저장 흐름으로 수집되어야 한다. |
| 앱 미리보기 깊이 | 15 | 15 | 100% | 5/5 신호 충족 | 홈/상세/조리/완료 탭이 랜딩 안에서 바로 전환되어야 한다. |
| 내부 정보 비노출 | 15 | 15 | 100% | 정적 0건, 시각 0건 | 사용자 화면에서 내부 문서명, 버전 태그, 저장소/배포 구현명을 제거한다. |
| 반응형·시각 증거 | 10 | 10 | 100% | 5/5 신호 충족 | 모바일/데스크톱 캡처에서 CTA, 앱 미리보기, 카피 신호가 모두 보여야 한다. |
| 배포 준비도 | 10 | 10 | 100% | 4/4 신호 충족 | Vercel 루트, 수집 환경변수, 배포 제외, 검증 스크립트를 유지한다. |
| 검증 루프 재현성 | 5 | 5 | 100% | 4/4 신호 충족 | 다음 세션에서도 같은 검증자 역할, 점수표, 마지막 리포트를 재사용할 수 있어야 한다. |

## 게이트 결과

| 게이트 | 판정 | 근거 | 보정 후보 |
| --- | --- | --- | --- |
| package scripts | PASS | dev/check/verify:dynamic 스크립트 확인 | - |
| vercel root rewrite | PASS | / -> /app.html 확인 | - |
| landing structure | PASS | 랜딩, 앱 미리보기, 베타/피드백/레시피 요청 폼 확인 | - |
| public copy static guard | PASS | app.html 내부 작업 용어 0건 | - |
| inline script syntax | PASS | app.html inline script 문법 통과 | - |
| api syntax: api/_lib/collect.js | PASS | 문법 통과 | - |
| api syntax: api/beta-signup.js | PASS | 문법 통과 | - |
| api syntax: api/feedback.js | PASS | 문법 통과 | - |
| api validation: beta email | PASS | 잘못된 이메일 400 응답 | - |
| api validation: feedback required | PASS | 빈 피드백 400 응답 | - |
| api validation: feedback email | PASS | 잘못된 선택 이메일 400 응답 | - |
| deploy env contract | PASS | Google Form/webhook/GitHub 수집 환경변수 문서화 확인 | - |
| vercel ignore hygiene | PASS | docs/scripts/.env 배포 제외 확인 | - |
| workflow script hook | PASS | npm run verify:dynamic 가능 | - |
| verification docs | PASS | 동적 워크플로우/랜딩 검증 문서 확인 | - |
| visual capture: mobile | PASS | /tmp/cook-wireframe-v3/dynamic-mobile.png, forbiddenVisibleTerms=[] | - |
| visual capture: desktop | PASS | /tmp/cook-wireframe-v3/dynamic-desktop.png, forbiddenVisibleTerms=[] | - |

## 루프 규칙

- `FAIL`: 해당 게이트의 보정 후보만 고치고 같은 게이트를 재실행한다.
- `INCONCLUSIVE`: 제품 실패로 보지 않고 실행 환경, 권한, 서버 상태를 먼저 복구한다.
- `PASS`: 다음 워크플로우로 진행한다.
- 공개 사용자 화면은 내부 작업명, 버전 태그, 저장소/배포 구현명을 노출하지 않는다.
