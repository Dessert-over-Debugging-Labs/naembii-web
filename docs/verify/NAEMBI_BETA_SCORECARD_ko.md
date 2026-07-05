# 냄비 베타 웹 별도 점수표

이 점수표는 `scripts/verify-dynamic.mjs`의 현재 채점 체계를 문서로 분리한 기준표다. 최종 판정은 게이트 결과와 점수를 함께 본다. 게이트가 `FAIL`이면 점수가 높아도 실패이고, `INCONCLUSIVE`는 제품 실패로 단정하지 않고 실행 환경을 복구한 뒤 재검증한다.

## 통과 기준

- 빠른 검증: `npm run verify:dynamic -- --full --min-score=96`
- 시각 포함 최종 검증: `npm run verify:visual -- --full --min-score=96`
- 판정 기준: 점수 비율이 **96%를 초과**해야 PASS다.
- 권장 최종 목표: `verify:visual` 기준 **100%**.

## 시각 포함 최종 점수표

총점: 130점

| 항목 | 배점 | 필수 신호 | 실패 시 보정 |
| --- | ---: | --- | --- |
| 사용자 가치·카피 명확성 | 15 | SNS 요리 영상 문제, 따라 하기 어려움, 앱 체험 CTA, 베타 신청 CTA, 레시피 요청, 작은 냄비 감성 카피 | `index.html` 히어로/CTA/레시피 요청 카피를 사용자 행동 중심으로 수정 |
| 베타 전환 흐름 | 15 | `betaForm`, `/app` 링크, `/api/beta-signup` 전송, 신청 문구, 성공 메시지 | 랜딩 폼과 제출 성공/실패 상태 복구 |
| 피드백·레시피 수집 | 15 | `recipeRequestForm`, `feedbackForm`, `openFeedback`, `/api/feedback`, 접수 메시지 | 앱/랜딩 수집 창구와 API 전송 복구 |
| 후킹·상호작용 루프 | 10 | 요리비서 설문, 트렌드/많이 만드는 섹션, 폰 내부 플로팅 피드백, 후기/팁 더미, 완료 공유, 인터랙션 GIF | 검색 아래 피드백 카테고리 제거, 공유/후기/추천 루프 복구 |
| 정적 앱 화면 소개 | 15 | 홈, 검색, 상세, 조리, 완료 캡처 5종이 랜딩에 있고 파일도 존재 | `npm run capture:screens`로 캡처 재생성 후 랜딩 연결 |
| 브랜드·디자인 검증 | 10 | 캐릭터 규칙, 로고 후보, 아이덴티티 점수표, 음성비서 중심 배치, 커뮤니티 현실성, 핵심 GIF | `/design` 페이지와 `assets/screens/naembi-core-flow.gif` 복구 |
| 내부 정보 비노출 | 15 | 정적 HTML과 캡처에서 내부 작업명/도구명/배포 구현명 0건 | 공개 HTML 카피에서 내부 용어 제거 |
| 앱 캡처 전체 노출 | 10 | 모든 캡처가 비율 그대로 보이고 `object-fit: cover`로 잘리지 않음 | 캡처 CSS를 contain/auto 비율로 수정 |
| 반응형·시각 증거 | 10 | 모바일, 태블릿, 데스크톱 캡처 PASS. 모바일 첫 화면 CTA/GIF 노출, 앱 캡처 가로 스크롤 | 모바일 히어로 높이, proof 카드, 캡처 레이아웃 수정 |
| 배포 준비도 | 10 | Vercel rewrite, 수집 환경변수 계약, `.vercelignore`, 검증 스크립트 | `vercel.json`, `.env.example`, `.vercelignore`, `package.json` 수정 |
| 검증 루프 재현성 | 5 | 동적 워크플로우 문서, PASS/FAIL/INCONCLUSIVE 계약, 마지막 리포트 MD/JSON | `docs/verify` 문서와 실행 리포트 복구 |

## 빠른 검증 점수표

시각 캡처를 제외하면 총점은 110점이다. 빠른 검증도 96%를 초과해야 PASS로 본다.

| 제외 항목 | 이유 |
| --- | --- |
| 앱 캡처 전체 노출 | 브라우저 캡처/이미지 자연 비율 확인이 필요함 |
| 반응형·시각 증거 | 모바일/태블릿/데스크톱 Chrome 캡처가 필요함 |

## 하드 게이트

아래 항목은 점수와 별개로 하나라도 실패하면 최종 실패다.

| 게이트 | 실패 의미 |
| --- | --- |
| package scripts | 다음 세션이 검증 명령을 재현할 수 없음 |
| vercel app route | `/app`, `/design` 배포 라우팅 실패 가능 |
| landing structure | 루트 랜딩이 제품 소개/베타 모집 역할을 못 함 |
| app structure | 앱 홈, 조리 모드, 피드백 폼이 깨짐 |
| design review page | 캐릭터/로고/디자인 후보 검증 근거가 사라짐 |
| public copy static guard | 공개 화면에 내부 작업어가 노출됨 |
| inline script syntax | 앱 실행 자체가 깨질 수 있음 |
| api validation | 베타 신청/피드백 수집 입력 방어가 깨짐 |
| deploy env contract | 실제 저장 연결이 불가능해짐 |
| vercel ignore hygiene | 내부 문서/스크립트/비밀이 배포될 위험 |
| visual capture | 모바일/태블릿/데스크톱 실제 화면 검증 실패 |

## 금지어 기준

공개 사용자 화면에는 아래 단어가 보이면 안 된다.

```text
Notion, notion, v2, v3, Ralph, 랄프, API, Vercel, GitHub, webhook, 환경변수, 프로토타입, AWS, 페이지 안에
```

내부 검증 문서에는 사용할 수 있지만, `index.html`과 `app.html`의 사용자 노출 텍스트에는 남기지 않는다.

## 최종 판정 예시

```text
PASS
점수: 130 / 130 (100%)
통과 기준: > 96%
게이트: FAIL 0건, INCONCLUSIVE 0건
```
