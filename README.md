# Naembi Web

냄비 베타테스트용 웹앱 프로토타입입니다.

- 서비스명: 냄비 / Naembi
- 배포 대상: Vercel
- 공식 베타 URL: `https://naembii-web.vercel.app`
- 웹앱 엔트리: `app.html` (`/`, `/app`)
- 보존 랜딩: `landing.html` (현재 라우트 비활성)
- 수집 API: `api/beta-signup.js`, `api/feedback.js`
- 현재 목적: SNS 요리 영상을 바로 따라 만들 수 있는 조리 모드 경험 검증과 피드백 수집

## 로컬 실행

```bash
npm run dev
```

기본 URL:

```text
http://127.0.0.1:4876/
```

## Gemini Live 로컬 테스트

`.env`에 아래 중 하나로 키를 둡니다. 현재 로컬 개발 서버는 `.env`를 자동으로 읽습니다.

```text
GEMINI_API_KEY=...
# 또는 NAEMBI_GEMINI_API_KEY=...
```

`/app`의 조리 모드에서 `요리 비서`를 누르면 즉시 마이크 권한을 요청하고 Gemini Live 음성 세션을 시작합니다. 로컬 기본 포트는 Fetch가 차단하는 `4190` 대신 `4876`입니다.

```bash
npm run dev
npm run verify:gemini-live
npm run verify:gemini-live-browser
```

데스크톱의 `localhost`는 마이크 권한 테스트가 가능하지만, 휴대폰에서 로컬 서버를 열려면 HTTPS 터널 또는 배포 주소가 필요합니다.

Gemini Live 대화 텍스트를 Langfuse Japan에 기록하는 방법과 Vercel 환경변수는 `docs/LANGFUSE_CONVERSATION_LOGGING_ko.md`를 확인합니다.

## 검증

```bash
npm run check
npm run verify:dynamic
```

브라우저 캡처까지 확인할 때:

```bash
npm run verify:visual
```

음성비서의 권한 → 듣는 중 → transcript → 응답 → 오류 상태를 확인할 때:

```bash
PORT=4873 npm run dev
npm run verify:voice-assistant -- http://127.0.0.1:4873 /tmp/naembi-voice-assistant-validation
```

사용자 문구의 구현 설명, 내부 용어, 이전 말투 재등장을 확인할 때:

```bash
npm run verify:copy-tone
```

말투 검토 경고까지 실패로 처리하려면 `npm run verify:copy-tone -- --strict`를 사용합니다. 세부 기준은 `docs/COPY_TONE_GUIDE_ko.md`에서 확인할 수 있습니다.

Mixpanel 이벤트명, 공개 설정, 개인정보 원문 누락 여부를 확인할 때:

```bash
PORT=4873 npm run dev
npm run verify:mixpanel -- http://127.0.0.1:4873
```

구현 범위와 실기기 검증 게이트는 `docs/VOICE_ASSISTANT_WEB_IMPLEMENTATION_ko.md`를 확인합니다.

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
7. 배포 후 `/`와 `/app`이 모두 웹앱 홈으로 열리는지 확인합니다.
8. `/api/feedback`이 동작하는지 확인합니다.

`vercel.json`에서 `/`와 `/app` 요청은 `/app.html`로 rewrite됩니다. 기존 랜딩은 `landing.html`로 보존되어 있으며 현재 기본 라우트에서는 사용하지 않습니다. 이 repo는 정적 HTML + Vercel 서버리스 API 구성이므로 별도 빌드 명령이 필요 없습니다.

## 환경변수

베타 신청과 피드백 저장은 아래 중 하나를 설정합니다. 베타 기간에는 Google Form + Google Sheets를 1순위로 권장합니다.

Google Form과 Sheet는 아래 Apps Script로 자동 생성할 수 있습니다.

```text
scripts/google-apps-script/create-naembi-beta-collection.js
```

`setupNaembiBetaCollection`을 실행하면 Google Form, 응답 Sheet, `Vercel env` 탭, `운영뷰` 탭, 운영뷰 자동 갱신 트리거가 같이 만들어집니다.
이미 이전 스크립트로 Form과 Sheet를 만들었다면 최신 코드로 교체한 뒤 `installNaembiOperatingViewAutomation`을 실행하면 `운영뷰` 탭을 만들고 Form 제출 시 자동 갱신되도록 트리거를 설치합니다.

스크립트 실행 후 생성된 Sheet의 `Vercel env` 탭에서 아래 두 값을 복사합니다.
실행 중 `Google에서 확인하지 않은 앱` 경고가 뜨면, 개발자 이메일이 본인/팀 계정인지 확인한 뒤 `고급` → `프로젝트로 이동` → `허용` 순서로 승인합니다. 자세한 내용은 `docs/handoff/GOOGLE_FORM_VERCEL_SETUP_GUIDE_ko.md`를 확인합니다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","requestId":"entry.141414","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

### Slack 알림 + Google Sheet 반영완료 체크

최신 Apps Script는 요청마다 `requestId`를 저장하고, Slack 알림에 `반영완료 체크` 버튼을 붙일 수 있습니다. 버튼을 누르면 Apps Script가 같은 `requestId` 행을 찾아 `운영뷰`의 `반영완료` 체크박스를 TRUE로 바꿉니다. 운영뷰 자체는 Form 제출 트리거와 webhook 저장 경로에서 자동 갱신됩니다.

추가 환경변수:

```bash
NAEMBI_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NAEMBI_BETA_COMPLETION_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
NAEMBI_BETA_COMPLETION_TOKEN=GENERATED_OPERATION_TOKEN
```

기존 Form을 쓰고 있다면 최신 Apps Script로 `requestId` 질문과 운영뷰 완료 컬럼을 추가한 뒤, `Vercel env` 탭의 값을 다시 Vercel에 반영해야 합니다. 자세한 절차는 `docs/handoff/SLACK_SHEET_COMPLETION_AUTOMATION_ko.md`를 확인합니다.

대안:

```bash
NAEMBI_BETA_WEBHOOK_URL=https://example.com/webhook
NAEMBI_BETA_GITHUB_REPO=owner/repo
NAEMBI_BETA_GITHUB_TOKEN=GITHUB_TOKEN_VALUE
NAEMBI_BETA_GITHUB_LABELS=naembi-beta
```

### Mixpanel 행동 분석

Vercel `Environment Variables`에 아래 값을 넣고 재배포합니다. 브라우저에는 Project Token만 공개 설정으로 내려갑니다. API Secret, Service Account Secret, Slack/Gemini/Google 관련 비밀키는 `/api/public-config`에 포함하지 않습니다.

```bash
NAEMBI_MIXPANEL_TOKEN=MIXPANEL_PROJECT_TOKEN
NAEMBI_MIXPANEL_ENABLED=true
NAEMBI_MIXPANEL_DEBUG=false
```

현재 1차 이벤트는 랜딩 진입, 앱 열기, 검색, 레시피 선택, 조리 시작, 재료 보기, 타이머, 음성비서, 완료, 공유, 피드백/신청/레시피 요청입니다. 이메일, 피드백 본문, 레시피 요청 본문, 유튜브 URL 원문은 Mixpanel 이벤트 프로퍼티로 보내지 않습니다.

전체 예시는 `.env.example`을 확인합니다.
