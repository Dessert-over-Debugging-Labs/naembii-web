# 냄비 동적 검증 워크플로우

목적: 베타 랜딩과 앱 미리보기 변경이 생길 때, 변경 범위에 맞는 검증만 자동 선택하고 실패 지점을 작게 고친다.

## 실행 명령

```bash
npm run verify:dynamic
```

정적/API/배포 설정 중심 검증을 실행하고 결과를 아래 파일로 남긴다.

- `docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md`
- `docs/verify/DYNAMIC_WORKFLOW_LAST_ko.html`
- `docs/verify/DYNAMIC_WORKFLOW_LAST_ko.json`

시각 검증까지 포함할 때:

```bash
npm run verify:visual
```

이 명령은 로컬 서버(`npm run dev`)와 Chrome headless 실행 권한이 필요하다. Chrome/CDP 실행이 막히면 제품 실패가 아니라 `INCONCLUSIVE`로 기록한다. 최종 공유용 검증은 이 명령을 기준으로 한다.

## 동적 선택 규칙

| 변경 범위 | 자동 실행 게이트 |
| --- | --- |
| 항상 | package/vercel/app entry, 공개 문구 정적 가드, inline script syntax |
| `api/`, `app.html` | API 문법, 베타/피드백 validation smoke |
| `vercel.json`, `.env.example`, `.vercelignore`, `package.json`, `api/` | 배포 환경변수 계약, Vercel ignore hygiene |
| `docs/verify`, `docs/handoff`, `docs/progress` | 검증 문서 존재 확인 |
| `--visual` | 모바일/태블릿/데스크톱 CDP 캡처, 공개 화면 금지어와 핵심 섹션 확인 |

## 점수표

최종 검증은 게이트가 모두 통과해도 점수 기준을 넘지 못하면 실패로 본다. 현재 정본 점수표는 `docs/verify/NAEMBI_BETA_SCORECARD_ko.md`에 분리되어 있다. `npm run verify:visual -- --full --min-score=96` 기준 총점은 130점, 통과 기준은 96% 초과다.

| 항목 | 배점 | 검증 관점 |
| --- | ---: | --- |
| 사용자 가치·카피 명확성 | 15 | 히어로, CTA, 레시피 요청, 작은 냄비 감성 카피가 사용자 행동으로 이어지는가 |
| 베타 전환 흐름 | 15 | 모바일/데스크톱/하단 신청 폼과 성공 메시지가 유지되는가 |
| 피드백·레시피 수집 | 15 | 베타 피드백과 원하는 레시피 요청이 수집되는가 |
| 후킹·상호작용 루프 | 10 | 요리비서 추천, 후기/팁, 완료 공유, 폰 내부 플로팅 피드백이 유지되는가 |
| 정적 앱 화면 소개 | 15 | 홈/검색/상세/조리/완료 화면 캡처가 랜딩 안에서 전체 비율로 보이는가 |
| 브랜드·디자인 검증 | 10 | `/design`에서 캐릭터/로고 후보, 아이덴티티 점수표, 서비스 배치 후보를 검토할 수 있는가 |
| 내부 정보 비노출 | 15 | 공개 화면에 내부 문서명, 버전 태그, 저장소/배포 구현명이 노출되지 않는가 |
| 앱 캡처 전체 노출 | 10 | 정적 앱 화면 이미지가 잘리지 않고 원본 비율로 보이는가 |
| 반응형·시각 증거 | 10 | 모바일/태블릿/데스크톱 캡처에서 CTA, 핵심 GIF, 앱 미리보기, 카피 신호가 확인되는가 |
| 배포 준비도 | 10 | Vercel 루트, 수집 환경변수, 배포 제외, 검증 스크립트가 준비됐는가 |
| 검증 루프 재현성 | 5 | 다음 세션에서도 같은 점수표와 리포트를 재실행할 수 있는가 |

빠른 검증인 `npm run verify:dynamic -- --full --min-score=96`은 시각 항목을 제외하고 96% 초과를 기준으로 본다. 이 모드는 개발 중 빠른 회귀 확인용이고, 사용자 공유 전 최종 판정은 `verify:visual`로 한다.

## 판정 계약

모든 게이트는 아래 셋 중 하나로 판정한다.

| 판정 | 의미 | 다음 행동 |
| --- | --- | --- |
| `PASS` | 요구 조건 충족 | 다음 게이트로 진행 |
| `FAIL` | 제품/코드/문서 결함 | 보정 후보에 적힌 범위만 수정하고 같은 게이트 재실행 |
| `INCONCLUSIVE` | 실행 환경 불확실 | 서버, 권한, Chrome, 포트 등 실행 조건을 먼저 복구 |

## 검증자 역할 분리

검증을 에이전트나 사람에게 나눌 때는 아래처럼 입력과 출력 범위를 좁힌다. 각 검증자는 읽기 전용으로 시작하고, 수정은 실패 게이트가 확정된 뒤 별도 작업으로 진행한다.

| 역할 | 입력 | 판정 기준 |
| --- | --- | --- |
| 구조 검증자 | `app.html`, `package.json`, `vercel.json` | 랜딩 entry, 앱 iframe, 베타/피드백/레시피 요청 DOM 존재 |
| 문구 검증자 | 공개 화면 캡처 또는 `document.body.innerText` | 내부 작업명과 구현 세부 정보 노출 0건 |
| API 검증자 | `api/` 핸들러 | 저장소 환경변수 없이 validation 400 응답 확인 |
| 시각 검증자 | `/tmp/cook-wireframe-v3/dynamic-*.png` | 모바일/데스크톱 첫 화면에서 신청 CTA와 앱 미리보기 확인 |
| 배포 검증자 | `.env.example`, `.vercelignore`, `vercel.json` | 수집 환경변수 문서화, 내부 문서/스크립트 배포 제외 |

검증자 출력 형식:

```text
PASS/FAIL/INCONCLUSIVE
발견 이슈:
사람 결정 필요:
재실행할 게이트:
```

## 공개 화면 금지어

사용자에게 직접 제공되는 `app.html` 공개 화면에는 아래 항목이 노출되면 안 된다.

```text
Notion, notion, v2, v3, Ralph, 랄프, API, Vercel, GitHub, webhook, 환경변수, 프로토타입, AWS, 페이지 안에
```

검증 리포트와 내부 문서에는 남길 수 있지만, 랜딩/베타 사용자 화면에는 노출하지 않는다.

## 루프 운영 규칙

1. `npm run verify:dynamic`으로 빠른 게이트를 먼저 실행한다.
2. `FAIL`이 있으면 해당 게이트의 보정 후보만 고친다.
3. `INCONCLUSIVE`는 제품 점수에서 제외하고 실행 조건을 복구한다.
4. UI나 공개 문구를 바꿨으면 `npm run verify:visual`을 추가로 실행한다.
5. 최종 리포트는 `docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md`를 기준으로 공유한다.
6. 점수표에서 96%를 초과하지 못하면 게이트가 모두 PASS여도 보정 후 재검증한다.
7. 장시간 자율 검증은 `npm run verify:ralph-loop` 또는 `node scripts/run-naembi-ralph-loop.mjs --visual --full --min-score=96 --min-runtime-minutes=300 --interval-seconds=120`으로 실행한다.

## 검증 루프 고도화 포인트

- 변경 파일 기반으로 게이트를 선택해 불필요한 수동 점검을 줄인다.
- API validation은 저장소 환경변수 없이도 400 응답 케이스를 직접 호출해 확인한다.
- 시각 검증은 CDP 캡처 결과의 `forbiddenVisibleTerms=[]`, `hasRecipeRequest`, `hasLaunchInput`, `hasAppPreview`를 기준으로 판단한다.
- 실패가 나면 전체 랜딩을 다시 만들지 않고, 실패 게이트와 관련된 파일만 수정한다.
