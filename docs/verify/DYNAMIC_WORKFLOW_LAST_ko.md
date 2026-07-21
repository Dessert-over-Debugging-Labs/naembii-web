# 동적 검증 워크플로우 실행 리포트

- 일시: 2026-07-21T18:00:50.602Z
- 판정: **PASS**
- 점수: **110 / 110 (100%)**
- 통과 기준: **96% 초과** (시각 검증 미포함 빠른 기준)
- 모드: static/API/deploy 중심
- 기준 URL: `http://127.0.0.1:4190/`

## 왜 빠르게 끝났나

기존 루프는 문법, DOM 존재, API validation, 금지어 캡처만 보는 스모크 검증이었다. 이번 리포트부터는 같은 게이트 위에 점수표를 얹어 카피, 전환, 수집, 미리보기, 비노출, 반응형, 배포, 루프 재현성을 별도로 평가한다.

## 변경 파일

- 감지된 변경 없음

## 선택된 워크플로우

| workflow | 선택 이유 |
| --- | --- |
| core | 항상 실행 |
| api | full 실행 |
| deploy | full 실행 |
| docs | full 실행 |

## 점수표

| 항목 | 배점 | 점수 | 달성률 | 근거 | 보정 후보 |
| --- | ---: | ---: | ---: | --- | --- |
| 단일 가치·카피 명확성 | 15 | 15 | 100% | 4/4 신호 충족 | 루트 앱은 SNS 요리를 바로 따라 하는 가치와 조회수 기반 탐색에 집중해야 한다. |
| 덜어내기 범위 | 15 | 15 | 100% | 7/7 신호 충족 | 루트는 웹앱 홈으로 열고, 홈 검색 UI와 후기/팁 스트립을 비활성화하며 기존 랜딩은 landing.html로 보존한다. |
| 의견 보내기 단순화 | 15 | 15 | 100% | 5/5 신호 충족 | 앱 의견은 종류/이메일 없이 입력창 하나와 보내기 버튼으로 수집한다. |
| SNS 조회수 카드·핵심 루프 | 10 | 10 | 100% | 5/5 신호 충족 | 레시피 카드는 SNS 조회수 중심으로 보이고, 조리·공유·피드백 루프는 유지한다. |
| 정적 앱 화면 소개 | 15 | 15 | 100% | 6/6 신호 충족 | 홈/검색/상세/조리/완료 화면 캡쳐가 랜딩에서 정적으로 제공되어야 한다. |
| 브랜드·디자인 검증 | 10 | 10 | 100% | 6/6 신호 충족 | /design에서 캐릭터/로고 후보, 아이덴티티 점수표, 음성비서 중심 배치, 커뮤니티 현실성을 검토할 수 있어야 한다. |
| 내부 정보 비노출 | 15 | 15 | 100% | 정적 0건, 시각 검증 미실행 | 사용자 화면에서 내부 문서명, 버전 태그, 저장소/배포 구현명을 제거한다. |
| 배포 준비도 | 10 | 10 | 100% | 4/4 신호 충족 | 루트 앱 엔트리와 /app 웹앱 라우팅, 수집 환경변수, 배포 제외, 검증 스크립트를 유지한다. |
| 검증 루프 재현성 | 5 | 5 | 100% | 8/8 신호 충족 | 다음 세션에서도 같은 검증자 역할, 점수표, 마지막 리포트를 재사용할 수 있어야 한다. |

## 게이트 결과

| 게이트 | 판정 | 근거 | 보정 후보 |
| --- | --- | --- | --- |
| package scripts | PASS | dev/check/verify:dynamic/verify:app-screens 스크립트 확인 | - |
| vercel app route | PASS | /는 index.html 정적 엔트리, /app -> /index.html, /landing -> /landing.html | - |
| landing archive structure | PASS | 기존 랜딩 보존 파일 확인 | - |
| app structure | PASS | 루트와 /app 기본 앱 홈, 조리 모드, 피드백 폼 확인 | - |
| design review page | PASS | 브랜드 캐릭터, 점수표, 서비스 배치, 현실성 검토 확인 | - |
| public copy static guard | PASS | 공개 HTML 내부 작업 용어 0건 | - |
| inline script syntax | PASS | index.html inline script 문법 통과 | - |
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

## 루프 규칙

- `FAIL`: 해당 게이트의 보정 후보만 고치고 같은 게이트를 재실행한다.
- `INCONCLUSIVE`: 제품 실패로 보지 않고 실행 환경, 권한, 서버 상태를 먼저 복구한다.
- `PASS`: 다음 워크플로우로 진행한다.
- 공개 사용자 화면은 내부 작업명, 버전 태그, 저장소/배포 구현명을 노출하지 않는다.
