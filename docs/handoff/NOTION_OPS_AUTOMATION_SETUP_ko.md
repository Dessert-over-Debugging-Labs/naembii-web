# 냄비 베타 운영 자동화 세팅 가이드

> 목적: 베타 신청, 레시피 요청, 피드백이 들어오면 Slack에서 바로 확인하고, 실제 반영 완료 시 Google Sheet 운영뷰에 체크가 남도록 세팅한다.
> 기준 repo: `Dessert-over-Debugging-Labs/naembi-web`
> 기준 문서: `docs/handoff/SLACK_SHEET_COMPLETION_AUTOMATION_ko.md`, `docs/handoff/GOOGLE_FORM_VERCEL_SETUP_GUIDE_ko.md`

## 결론

베타 운영 단계에서는 별도 DB나 AWS 없이 아래 흐름으로 충분하다.

```text
사용자 제출
-> Vercel API
-> Google Form/Sheet 저장
-> Slack 알림
-> 운영자가 Slack 버튼 클릭
-> Apps Script Web App
-> Google Sheet 운영뷰 반영완료 체크
```

이 자동화는 "사용자에게 답변을 보내는 기능"이 아니라, 운영자가 실제 반영 여부를 추적하는 기능이다. 사용자 회신 자동화는 베타 수요가 확인된 뒤 이메일 도구나 CRM을 붙여서 결정한다.

## 1. 필요한 계정과 권한

- Google 계정: Form, Sheet, Apps Script를 만들 계정
- Slack 워크스페이스: 알림을 받을 운영 채널
- Vercel 프로젝트: `naembi-web` 배포와 환경변수 관리
- GitHub repo: `Dessert-over-Debugging-Labs/naembi-web`
- Notion 부모 페이지: 베타 배포/수집 문서를 모아둘 페이지

## 2. Google Apps Script 세팅

1. `https://script.google.com`에서 새 프로젝트를 만든다.
2. `scripts/google-apps-script/create-naembi-beta-collection.js` 전체를 `Code.gs`에 붙여넣는다.
3. 새로 만드는 경우 `setupNaembiBetaCollection`을 실행한다.
4. 기존 Form/Sheet가 있다면 최신 코드로 교체한 뒤 `installNaembiOperatingViewAutomation`을 실행한다.
5. Google 권한 경고가 뜨면 개발자 계정이 팀 계정인지 확인한 뒤 승인한다.
6. 생성된 Spreadsheet의 `Vercel env` 탭을 확인한다.

최신 스크립트는 운영뷰를 수동으로 계속 갱신하지 않도록 자동화한다.

- `setupNaembiBetaCollection` 실행 시 운영뷰와 Form 제출 트리거가 같이 만들어진다.
- 기존 Sheet는 `installNaembiOperatingViewAutomation`을 한 번 실행한다.
- Google Form 응답 제출 시 `syncNaembiOperatingView`가 자동 실행된다.
- Apps Script Web App/webhook 저장은 저장 직후 운영뷰를 갱신한다.

`운영뷰` 탭에 아래 컬럼이 있어야 한다.

```text
요청ID
상태
우선순위
담당자
운영메모
반영완료
반영완료시각
반영자
반영메모
```

## 3. Apps Script Web App 배포

Slack 버튼이 Google Sheet를 수정하려면 Apps Script를 Web App으로 배포해야 한다.

1. Apps Script 우측 상단 `Deploy`를 누른다.
2. `New deployment`를 선택한다.
3. 유형은 `Web app`으로 선택한다.
4. Execute as는 `Me`로 둔다.
5. Who has access는 `Anyone with the link`로 둔다.
6. 배포 후 Web app URL을 복사한다.
7. Apps Script에서 `refreshNaembiAutomationEnv`를 실행한다.
8. Sheet의 `Vercel env` 탭에 새 자동화 환경변수가 채워졌는지 확인한다.

## 4. Slack Incoming Webhook 세팅

1. Slack API에서 앱을 만들거나 기존 앱을 연다.
2. `Incoming Webhooks`를 켠다.
3. 운영 채널을 선택한다. 예: `#naembi-beta-feedback`
4. 생성된 Webhook URL을 복사한다.
5. Vercel 환경변수 `NAEMBI_SLACK_WEBHOOK_URL`에 넣는다.

Slack 채널은 운영자만 볼 수 있게 관리한다. Webhook URL과 completion token은 외부 화면에 노출하면 안 된다.

## 5. Vercel 환경변수

Vercel Project Settings -> Environment Variables에 아래 값을 넣는다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry...","requestId":"entry...","email":"entry...","name":"entry...","profile":"entry...","note":"entry...","type":"entry...","message":"entry...","recipe":"entry...","source":"entry...","screen":"entry...","page":"entry...","createdAt":"entry..."}
NAEMBI_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NAEMBI_BETA_COMPLETION_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
NAEMBI_BETA_COMPLETION_TOKEN=GENERATED_OPERATION_TOKEN
```

중요한 점:

- `NAEMBI_BETA_GOOGLE_FORM_FIELDS`에는 반드시 `requestId` 매핑이 있어야 한다.
- 환경변수는 Production에 먼저 넣고, Preview 테스트가 필요하면 Preview에도 넣는다.
- 환경변수 변경 후 Vercel에서 재배포한다.
- 이전 이름인 `COOK_BETA_*`는 유지보수용 fallback으로만 본다. 신규 세팅은 `NAEMBI_*`를 기준으로 한다.

## 6. 테스트 루프

아래 순서대로 실제 배포 URL에서 확인한다.

1. 출시 알림 신청을 제출한다.
2. 레시피 요청을 제출한다.
3. 피드백 버튼에서 일반 피드백을 제출한다.
4. Google Sheet 원본 응답 탭에 각 행이 생겼는지 확인한다.
5. 운영뷰에 `요청ID`가 표시되는지 확인한다.
6. Slack 채널에 알림이 오는지 확인한다.
7. Slack 알림의 `반영완료 체크` 버튼을 누른다.
8. Google Sheet 운영뷰에서 `상태=반영완료`, `반영완료=TRUE`가 되는지 확인한다.

로컬 검증은 아래 기준을 유지한다.

```bash
npm run check
npm run verify:dynamic -- --full --min-score=96
```

## 7. 반영완료 기준

`반영완료`는 사용자의 요청을 운영자가 실제로 제품, 콘텐츠, 레시피 후보, 카피, 디자인, 버그 수정 목록 중 하나에 반영했을 때만 체크한다.

예시:

- 레시피 요청을 신규 후보 목록에 넣고 담당자가 확인한 경우
- 피드백을 실제 UI 수정 또는 다음 작업 목록에 반영한 경우
- 버그 제보를 재현하고 이슈 또는 작업 항목으로 만든 경우

체크하지 않는 경우:

- Slack 알림을 보기만 한 경우
- 아직 판단하지 않은 경우
- 답변만 하고 제품/운영 목록에는 반영하지 않은 경우

## 8. Codex 세션 운영 규칙

새 세션에서 이어 작업할 때는 아래 원칙을 유지한다.

- 작업 시작 전 체크리스트를 만들고 단계별로 갱신한다.
- repo-local `AGENTS.md`가 있으면 그 지시를 우선한다.
- 커밋은 사용자가 요청했을 때만 한다.
- 커밋 메시지는 Conventional Commit 토큰 뒤 설명을 한국어로 쓴다.
- 커밋 후 `git log -1 --pretty=%s`로 메시지를 확인한다.
- `.DS_Store` 같은 로컬 파일은 커밋하지 않는다.
- 사용자의 기존 변경사항은 되돌리지 않는다.
- 공개 화면에는 Notion, API, Vercel, GitHub, 환경변수 같은 내부 운영어가 보이면 안 된다.

## 9. 장애 대응

| 증상 | 확인할 것 |
| --- | --- |
| 제출은 되는데 Slack 알림이 없음 | `NAEMBI_SLACK_WEBHOOK_URL`, Vercel 재배포 여부 |
| Slack 버튼이 없음 | `NAEMBI_BETA_COMPLETION_URL`, `NAEMBI_BETA_COMPLETION_TOKEN` 누락 여부 |
| 버튼 클릭 후 Sheet가 안 바뀜 | Apps Script Web App URL, token, `requestId` 매핑 |
| 운영뷰에 요청ID가 없음 | 최신 Apps Script 적용 여부, Form 질문에 `requestId`가 있는지, `installNaembiOperatingViewAutomation` 실행 여부 |
| Vercel 제출이 실패함 | `NAEMBI_BETA_GOOGLE_FORM_URL`, `NAEMBI_BETA_GOOGLE_FORM_FIELDS` JSON 형식 |
| Notion 페이지 업로드가 실패함 | `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID`, 통합 권한 |

## 10. 다음 단계

- Slack 알림을 운영 채널에 연결한다.
- Apps Script Web App 배포 URL을 Vercel 환경변수에 넣는다.
- 실배포 URL에서 3종 제출 테스트를 진행한다.
- 운영뷰에서 반영완료 체크가 자동으로 남는지 확인한다.
- 베타 수요가 늘어나면 이메일 회신 자동화, 개인정보 보관 기간, DB 전환 기준을 별도 문서로 정한다.
