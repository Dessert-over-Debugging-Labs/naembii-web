# Notion AWS 페이지 업데이트 블록

> 대상 Notion: `https://app.notion.com/p/AWS-392b1da1d9f9816e9983e13fa7248cce`
>
> 2026-07-04 기준 Notion 토큰을 `NOTION_TOKEN` 전역 환경변수로 정리했고, v3 문서는 Notion 하위 페이지 `냄비 베타 배포·수집 세팅 v3`에 직접 반영한다.

## v3 정정 — 구현계획 기준 재정렬

- 제품 프론트는 `Dessert-over-Debugging-Labs/cook-assistance-wireframe`의 `app.html` 단일 HTML이다.
- 베타에서는 React/Next 재작성, 별도 앱 신설, AWS 선세팅을 하지 않는다.
- 현재 데이터 계약은 `app.html` 내부 `RECIPES` 배열이다.
- `cookflow/web` 스키마는 현재 제품 프론트의 정본 계약이 아니라 참고/side artifact로 본다.
- 입력값 저장은 우선 Google Form + Google Sheets, 대안은 Vercel `api/` → GitHub Issue 또는 webhook이다.
- AWS가 필요해질 때는 v2 정정판의 PostgreSQL ERD를 기준으로 RDS/Aurora부터 검토한다. DynamoDB를 기본값으로 가정하지 않는다.
- repo 이름은 제품 공개용으로 `naembi-web`을 1순위 추천한다. Vercel 프로젝트/도메인은 `naembi`로 두는 편이 가장 단순하다.

## v2 — 앱 프로토타입 흐름

- `naembi` 앱의 홈, 레시피 상세, 조리 모드, 완료 화면을 랜딩페이지 바깥에서 바로 확인할 수 있게 구성.
- 랜딩 첫 화면 우측에 실제 구동 가능한 `app.html#home` iframe을 배치.
- 홈 / 상세 / 조리 / 완료 탭으로 앱 흐름을 즉시 전환할 수 있게 구성.
- 목적: 랜딩을 읽기만 하는 페이지가 아니라 제품 사용감을 바로 보여주는 베타 모집 페이지로 전환.

## v3 — 베타 모집 랜딩

- 출시 알림을 받을 이메일 입력창을 히어로와 베타 신청 섹션에 배치.
- 사용자가 추가를 원하는 레시피를 요청할 수 있는 별도 입력창을 추가.
- 레시피 요청 항목: 요리 이름, 유튜브 링크, 이메일, 요청 이유.
- 피드백/레시피 요청은 `/api/feedback`으로, 베타 신청은 `/api/beta-signup`으로 전달.
- 저장소 환경변수가 없으면 성공처럼 처리하지 않고 설정 오류를 명확히 표시.

## 냄비 아이덴티티

- `냄비` 브랜드 로고와 작은 냄비 캐릭터 카드를 랜딩에 노출.
- 모바일 첫 화면에서도 냄비 로고, `v3 베타 모집`, `v2 앱 흐름` 태그가 바로 보이도록 구성.

## 검증 결과

- Ralph 루프 점수: `96 / 100`, PASS.
- `npm run check` 통과.
- CDP 모바일 캡처 통과: `width=390`, `scrollY=0`, `mobileHeroTop=0`, `demoTop=444`.
- 검증 리포트:
  - `docs/verify/LANDING_RALPH_SCORE_ko.md`
  - `docs/verify/LANDING_RALPH_SCORE_ko.html`

## 남은 운영 작업

- Vercel 환경변수 설정 필요:
  - GitHub Issues 저장: `COOK_BETA_GITHUB_REPO`, `COOK_BETA_GITHUB_TOKEN`, 선택 `COOK_BETA_GITHUB_LABELS`
  - Webhook 저장: `COOK_BETA_WEBHOOK_URL`
