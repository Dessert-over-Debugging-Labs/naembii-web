# Naembi Web

냄비 베타테스트용 웹 랜딩과 웹앱 프로토타입입니다.

- 서비스명: 냄비 / Naembi
- 배포 대상: Vercel
- 메인 엔트리: `app.html`
- 수집 API: `api/beta-signup.js`, `api/feedback.js`
- 현재 목적: 앱 출시 전 베타 테스터 모집, 레시피 요청, 피드백 수집

## 로컬 실행

```bash
npm run dev
```

기본 URL:

```text
http://127.0.0.1:4190/
```

## 검증

```bash
npm run check
npm run verify:dynamic
```

브라우저 캡처까지 확인할 때:

```bash
npm run verify:visual
```

## Vercel 앱 등록 방법

1. Vercel 대시보드에서 `Add New...` → `Project`를 선택합니다.
2. GitHub import 목록에서 `Dessert-over-Debugging-Labs/naembi-web`을 선택합니다.
3. 프로젝트 이름은 `naembi` 또는 `naembi-web`으로 둡니다.
4. 아래 설정을 확인합니다.

- Framework Preset: Other 또는 자동 감지
- Root Directory: repo root
- Build Command: 비워둠
- Output Directory: 비워둠

5. `Environment Variables`에 베타 신청/피드백 저장용 값을 추가합니다.
6. `Deploy`를 누릅니다.
7. 배포 후 `/`가 랜딩으로 열리고, `/api/beta-signup`, `/api/feedback`이 동작하는지 확인합니다.

`vercel.json`에서 `/` 요청은 `/app.html`로 rewrite됩니다. 이 repo는 정적 HTML + Vercel 서버리스 API 구성이므로 별도 빌드 명령이 필요 없습니다.

## 환경변수

베타 신청과 피드백 저장은 아래 중 하나를 설정합니다. 베타 기간에는 Google Form + Google Sheets를 1순위로 권장합니다.

```bash
COOK_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
COOK_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","page":"entry.101010","createdAt":"entry.121212"}
```

대안:

```bash
COOK_BETA_WEBHOOK_URL=https://example.com/webhook
COOK_BETA_GITHUB_REPO=owner/repo
COOK_BETA_GITHUB_TOKEN=GITHUB_TOKEN_VALUE
COOK_BETA_GITHUB_LABELS=cook-beta
```

전체 예시는 `.env.example`을 확인합니다.
