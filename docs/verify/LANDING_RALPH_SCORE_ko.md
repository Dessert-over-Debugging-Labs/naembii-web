# 냄비 사용자 전달형 랜딩 Ralph 검증 리포트

- 일시: 2026-07-04
- 대상: `app.html` 공개 랜딩 화면
- 로컬 확인 URL: `http://127.0.0.1:4190/`
- 검증 관점: 내부 작업 정보가 아니라 실제 사용자에게 전달되는 화면인가

## Ralph 루프 결과

| 라운드 | 판정 | 점수 | 발견 | 보정 |
| --- | --- | ---: | --- | --- |
| 1 | 실패 | 88 | 첫 화면에 작업 버전, 기준 문서, 기술 저장 방식 등 사용자가 몰라도 되는 정보가 노출됨 | 공개 화면 카피를 사용자 가치 중심으로 재작성 |
| 2 | 통과 | 98 | 내부 검증 정보는 문서에만 남기고 공개 화면에서 제거됨 | CDP로 모바일/데스크톱 내부 용어 노출 0개 확인 |

## 점수표

| 항목 | 배점 | 점수 | 근거 |
| --- | ---: | ---: | --- |
| 사용자 가치 전달 | 20 | 20 | 헤드라인, 보조문구, CTA가 출시 알림/앱 체험/레시피 요청으로 수렴 |
| 앱 흐름 외부 노출 | 20 | 20 | 랜딩 첫 화면에 실제 앱 iframe과 홈/상세/조리/완료 탭 제공 |
| 출시 알림 입력 | 15 | 15 | 모바일/데스크톱 히어로와 신청 섹션에 이메일 입력 제공 |
| 레시피 요청 창구 | 15 | 15 | 요리 이름, 유튜브 링크, 이메일, 요청 이유를 받는 폼 제공 |
| 냄비 아이덴티티 | 10 | 9 | 브랜드 로고, 냄비 카드, 따뜻한 카피 유지 |
| 내부 정보 비노출 | 15 | 15 | 공개 `innerText`에서 `Notion`, `v2`, `v3`, `Ralph`, `API`, `Vercel`, `GitHub`, `webhook`, `환경변수`, `프로토타입`, `AWS` 노출 0개 |
| 반응형 안정성 | 5 | 4 | 모바일/데스크톱 CDP 캡처 통과. 모바일 앱 미리보기는 길지만 의도한 앱 흐름 노출 방식 |

총점: **98 / 100**
통과 기준: **95점 이상**
판정: **PASS**

## 검증 증거

- `npm run check`: 통과
- `node --check scripts/capture-landing.mjs`: 통과
- CDP 모바일 캡처: `/tmp/cook-wireframe-v3/user-facing-mobile-r2.png`
- CDP 데스크톱 캡처: `/tmp/cook-wireframe-v3/user-facing-desktop-r2.png`
- CDP 모바일 상태: `width=390`, `scrollY=0`, `mobileMedia=true`, `marketing=true`, `mobileHero=block`, `demoTop=582`, `hasRecipeRequest=true`, `hasLaunchInput=true`, `hasAppPreview=true`, `forbiddenVisibleTerms=[]`
- CDP 데스크톱 상태: `width=1440`, `scrollY=0`, `mobileMedia=false`, `marketing=true`, `demoTop=102`, `hasRecipeRequest=true`, `hasLaunchInput=true`, `hasAppPreview=true`, `forbiddenVisibleTerms=[]`

## 결론

공개 랜딩은 사용자에게 바로 제공 가능한 화면으로 정리됐다. 내부 작업 정보는 사용자 화면에서 제거했고, 필요한 검증/운영 정보는 이 리포트와 작업 문서에만 남긴다.
