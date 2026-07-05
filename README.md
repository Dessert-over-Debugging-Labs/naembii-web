# Naembi Web

냄비 베타테스트용 웹 랜딩과 웹앱 프로토타입입니다.

- 서비스명: 냄비 / Naembi
- 배포 대상: Vercel
- 랜딩 엔트리: `index.html`
- 웹앱 엔트리: `app.html` (`/app`)
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
7. 배포 후 `/`가 제품 소개 랜딩으로 열리고, `/app`이 웹앱으로 열리는지 확인합니다.
8. `/api/beta-signup`, `/api/feedback`이 동작하는지 확인합니다.

`vercel.json`에서 `/app` 요청은 `/app.html`로 rewrite됩니다. 루트 `/`는 `index.html` 랜딩을 그대로 사용합니다. 이 repo는 정적 HTML + Vercel 서버리스 API 구성이므로 별도 빌드 명령이 필요 없습니다.

## 환경변수

베타 신청과 피드백 저장은 아래 중 하나를 설정합니다. 베타 기간에는 Google Form + Google Sheets를 1순위로 권장합니다.

Google Form과 Sheet는 아래 Apps Script로 자동 생성할 수 있습니다.

```text
scripts/google-apps-script/create-naembi-beta-collection.js
```

`setupNaembiBetaCollection`을 실행하면 Google Form, 응답 Sheet, `Vercel env` 탭, `운영뷰` 탭이 같이 만들어집니다.
이미 이전 스크립트로 Form과 Sheet를 만들었다면 최신 코드로 교체한 뒤 `createNaembiOperatingView`만 실행하면 `운영뷰` 탭을 추가할 수 있습니다.

스크립트 실행 후 생성된 Sheet의 `Vercel env` 탭에서 아래 두 값을 복사합니다.
실행 중 `Google에서 확인하지 않은 앱` 경고가 뜨면, 개발자 이메일이 본인/팀 계정인지 확인한 뒤 `고급` → `프로젝트로 이동` → `허용` 순서로 승인합니다. 자세한 내용은 `docs/handoff/GOOGLE_FORM_VERCEL_SETUP_GUIDE_ko.md`를 확인합니다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

대안:

```bash
NAEMBI_BETA_WEBHOOK_URL=https://example.com/webhook
NAEMBI_BETA_GITHUB_REPO=owner/repo
NAEMBI_BETA_GITHUB_TOKEN=GITHUB_TOKEN_VALUE
NAEMBI_BETA_GITHUB_LABELS=naembi-beta
```

전체 예시는 `.env.example`을 확인합니다.
