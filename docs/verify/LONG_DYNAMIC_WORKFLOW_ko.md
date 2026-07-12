# 장시간 동적 검증 워크플로우

## 목적

베타테스트용 냄비 웹앱을 5-6시간 동안 반복 검증하기 위한 실행 규칙이다. 한 번의 빠른 PASS가 아니라 모바일 랜딩 길이, 앱 화면 잘림, 요리비서 흐름, 로딩 성능, 동적 점수표를 여러 주기로 확인한다.

## 전체 실행

```bash
npm run verify:long-dynamic -- --base-url=http://127.0.0.1:4873 --duration-minutes=360 --interval-minutes=20 --full
```

기본값도 6시간 실행이다.

```bash
npm run verify:long-dynamic
```

## Smoke 실행

현재 세션에서 스크립트 자체가 정상 동작하는지만 빠르게 확인할 때 사용한다.

```bash
npm run verify:long-dynamic:smoke -- --base-url=http://127.0.0.1:4873
```

## 반복 검증 항목

| 항목 | 검증 내용 |
| --- | --- |
| `check` | `app.html` inline script 문법과 기본 앱 스크립트 점검 |
| `landing-mobile/tablet/desktop` | 랜딩 화면 캡처, 스크롤 압박, 금지어, 이미지 잘림 |
| `load-performance` | 모바일 `/app` 초기 진입 성능, 홈 준비 상태, YouTube 선로딩 차단 |
| `mobile-flow` | 검색, 피드백, 후기/팁, 타이머, 재료 보기, 요리비서, 오디오 덕킹 |
| `app-screens` | 7개 뷰포트 x 18개 앱 상태, 총 126개 화면 잘림/오버플로우 |
| `dynamic-scorecard` | 공개 카피, 앱 구조, 디자인/검증 산출물, 점수표 기준 |

## 동적 규칙

- 실패가 한 번이라도 나오면 다음 cycle에서 `app-screens`와 `dynamic-scorecard`를 강제로 포함한다.
- 랜딩은 매 cycle에서 mobile/tablet/desktop을 모두 캡처한다.
- 앱 화면 검증은 기본 장시간 실행에서 포함하고, smoke에서는 빠른 확인을 위해 생략한다.
- 최종 요약 결과는 `docs/verify/LONG_DYNAMIC_WORKFLOW_LAST_ko.md`, `.json`, `.html`에 누적 저장한다.
- cycle별 원본 점수표는 기본적으로 `outDir/scorecards`에 저장하고 저장소에는 커밋하지 않는다.
- 상세 stdout/stderr는 `/tmp/cook-wireframe-v3/long-dynamic-workflow/logs`에 남긴다.

## 저장소 커밋 정책

| 산출물 | 위치 | 커밋 여부 |
| --- | --- | --- |
| 최종 요약 리포트 | `docs/verify/LONG_DYNAMIC_WORKFLOW_LAST_ko.md` 또는 날짜형 최종 리포트 | 커밋 |
| 실행기/검증 기준 문서 | `scripts/run-long-dynamic-workflow.mjs`, `docs/verify/LONG_DYNAMIC_WORKFLOW_ko.md` | 커밋 |
| cycle별 점수표 원본 | `outDir/scorecards` | 커밋하지 않음 |
| 브라우저 캡처/로그 원본 | `/tmp/cook-wireframe-v3-*` | 커밋하지 않음 |

이 정책은 검증 재현성은 유지하되, 매 cycle마다 생성되는 대량의 HTML/JSON/MD 원본이 저장소 히스토리를 흐리지 않게 하기 위한 기준이다.

## 판정 기준

- `PASS`: 모든 cycle의 모든 task가 exit code 0으로 끝난 상태.
- `FAIL`: 하나 이상의 task가 실패하거나 timeout이 발생한 상태.
- `TIMEOUT`: 개별 task가 제한 시간 안에 끝나지 않은 상태. 다음 cycle에서 더 강한 검증을 붙여 재확인한다.

## 다음 세션 인계

새 세션에서 검증만 계속할 때는 아래 프롬프트를 붙여넣는다.

```text
냄비 베타 웹앱 장시간 검증을 이어서 진행한다.
1. /Users/osein/cook-assistance-wireframe 에서 작업한다.
2. 로컬 서버를 http://127.0.0.1:4873 으로 띄운다.
3. npm run verify:long-dynamic -- --base-url=http://127.0.0.1:4873 --duration-minutes=360 --interval-minutes=20 --full 을 실행한다.
4. docs/verify/LONG_DYNAMIC_WORKFLOW_LAST_ko.md 와 /tmp/cook-wireframe-v3/long-dynamic-workflow 산출물을 확인한다.
5. 실패가 있으면 해당 task 로그의 첫 실패 경계를 수정하고 같은 명령을 재실행한다.
```
