# Slack 알림 + Google Sheet 반영완료 자동 체크

목표는 사용자가 남긴 베타 신청, 레시피 요청, 피드백을 운영자가 Slack에서 바로 보고, 실제로 반영한 뒤 버튼 한 번으로 Google Sheet에 체크가 남게 하는 것이다.

## 작동 흐름

```text
사용자 제출
-> Vercel /api/beta-signup 또는 /api/feedback
-> requestId 자동 생성
-> Google Form/Sheet 저장
-> Slack 알림 발송
-> Slack의 "반영완료 체크" 버튼 클릭
-> Apps Script Web App 호출
-> Google Sheet 운영뷰의 반영완료 체크박스 TRUE
```

Slack 버튼은 답변을 사용자에게 보내는 기능이 아니다. 운영자가 “이 요청을 제품/콘텐츠에 반영했다”는 상태를 Sheet에 남기는 기능이다. 사용자에게 회신하려면 Sheet의 이메일을 보고 별도 이메일을 보내거나, 이후 이메일 자동화 도구를 붙인다.

## 필요한 환경변수

Vercel Project Settings > Environment Variables에 아래 값을 추가한다.

```bash
NAEMBI_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NAEMBI_BETA_COMPLETION_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
NAEMBI_BETA_COMPLETION_TOKEN=GENERATED_OPERATION_TOKEN
```

기존 저장용 환경변수도 유지한다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=...
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry...","requestId":"entry...",...}
```

`requestId`가 필드 매핑에 없으면 Slack 버튼이 어느 행을 체크해야 하는지 찾을 수 없다. 기존 Form을 쓰고 있었다면 최신 Apps Script로 `requestId` 질문을 추가하고, `Vercel env` 탭의 매핑값을 다시 Vercel에 넣는다.

운영뷰는 최신 Apps Script 기준으로 Form 제출 트리거와 webhook 저장 경로에서 자동 갱신된다. 기존 Sheet를 쓰고 있다면 `installNaembiOperatingViewAutomation`을 한 번 실행한다.

## 1. Slack Incoming Webhook 만들기

1. Slack에서 앱을 만들거나 기존 앱 설정으로 들어간다.
2. `Incoming Webhooks`를 켠다.
3. 알림을 받을 채널을 고른다. 예: `#naembi-beta-feedback`
4. 생성된 Webhook URL을 복사한다.
5. Vercel 환경변수 `NAEMBI_SLACK_WEBHOOK_URL`에 넣는다.

Slack 알림에는 다음 정보가 들어간다.

| 항목 | 내용 |
| --- | --- |
| 구분 | 먼저 써보기 신청, 레시피 요청, 피드백 |
| 요청ID | Google Sheet와 연결되는 추적 ID |
| 저장 | google-form, webhook, github |
| 이메일 | 사용자가 남긴 이메일 |
| 요리/화면 | 요청 레시피 또는 제출 화면 |
| 내용 | 피드백/요청 본문 |
| 버튼 | 반영완료 체크 |

## 2. Apps Script Web App 배포

Google Apps Script의 `Code.gs`를 최신 `scripts/google-apps-script/create-naembi-beta-collection.js`로 교체한다.

새로 만드는 경우:

1. `setupNaembiBetaCollection` 실행
2. 생성된 Sheet의 `Vercel env` 탭 확인
3. Apps Script 우측 상단 `Deploy` -> `New deployment`
4. 유형은 `Web app`
5. Execute as: `Me`
6. Who has access: `Anyone with the link`
7. 배포 후 Web app URL 복사
8. `refreshNaembiAutomationEnv` 실행
9. `Vercel env` 탭에서 `NAEMBI_BETA_COMPLETION_URL`, `NAEMBI_BETA_COMPLETION_TOKEN` 복사

이미 Form/Sheet가 있다면:

1. `Code.gs`를 최신 코드로 교체
2. `installNaembiOperatingViewAutomation` 실행
3. Apps Script를 Web app으로 배포
4. `refreshNaembiAutomationEnv` 실행
5. `Vercel env` 탭의 환경변수들을 Vercel에 다시 반영

이후에는 `createNaembiOperatingView`를 매번 수동 실행하지 않는다. Google Form 응답은 `syncNaembiOperatingView` 트리거가 처리하고, Apps Script Web App/webhook 제출은 저장 직후 운영뷰를 갱신한다.

## 3. 운영뷰에서 확인할 컬럼

`운영뷰` 탭에는 아래 컬럼이 추가된다.

| 컬럼 | 의미 |
| --- | --- |
| 요청ID | Slack 버튼과 Sheet 행을 연결하는 값 |
| 상태 | 미확인, 확인, 반영중, 반영완료, 보류 |
| 반영완료 | Slack 버튼 클릭 시 체크됨 |
| 반영완료시각 | 버튼을 누른 시각 |
| 반영자 | 기본값은 `slack` |
| 반영메모 | Slack 버튼 URL에 note가 있을 때 기록 |

Slack 버튼을 누르면 Apps Script가 `requestId`로 행을 찾고 아래처럼 바꾼다.

```text
상태 = 반영완료
반영완료 = TRUE
반영완료시각 = 현재 시각
반영자 = slack
```

## 4. 테스트 방법

1. Vercel에 환경변수를 넣고 재배포한다.
2. 랜딩 또는 앱에서 테스트 피드백을 제출한다.
3. Slack 채널에 알림이 오는지 확인한다.
4. Slack 알림의 `요청ID`가 Google Sheet 운영뷰에 있는지 확인한다.
5. Slack의 `반영완료 체크` 버튼을 누른다.
6. Google Sheet에서 `반영완료` 체크박스와 `상태=반영완료`를 확인한다.

Apps Script에서 직접 테스트할 수도 있다.

```javascript
markNaembiReflected('요청ID', { by: 'test', note: '직접 테스트' })
```

## 장애 대응

| 증상 | 확인할 것 |
| --- | --- |
| Slack 알림은 오는데 버튼이 없음 | `NAEMBI_BETA_COMPLETION_URL`, `NAEMBI_BETA_COMPLETION_TOKEN`이 Vercel에 있는지 확인 |
| 버튼 클릭 시 실패 | Apps Script Web App URL과 토큰이 최신인지 확인 |
| Sheet 행을 못 찾음 | `NAEMBI_BETA_GOOGLE_FORM_FIELDS`에 `requestId` 매핑이 있는지 확인 |
| 새 응답이 운영뷰에 안 보임 | `installNaembiOperatingViewAutomation` 실행 여부와 Apps Script 트리거 목록 확인 |
| Slack 알림이 안 옴 | `NAEMBI_SLACK_WEBHOOK_URL` 값과 Vercel 재배포 여부 확인 |
| 제출은 성공인데 Slack만 실패 | 사용자 제출은 저장되도록 설계되어 있으므로 Vercel Function 로그에서 `Slack 알림 실패` 확인 |

## 보안 기준

- Slack Webhook URL과 completion token은 클라이언트 HTML에 넣지 않는다.
- Vercel 환경변수와 Apps Script Script Properties에만 둔다.
- Slack 버튼 URL에는 token이 query string으로 붙으므로, Slack 채널 권한은 운영자만 볼 수 있게 둔다.
- 실제 고객 개인정보가 늘어나면 이메일 회신, 삭제 요청, 보관 기간 정책을 별도 문서로 정한다.
