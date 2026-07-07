# 베타·레시피 모집 입력 저장 방식

## 추천 순서

1. **Google Form + Google Sheets**
   - 가장 빠르다.
   - 팀이 바로 시트로 볼 수 있다.
   - 단점: entry ID 매핑이 필요하고, 폼 구조를 바꾸면 환경변수도 다시 맞춰야 한다.

2. **Google Apps Script webhook + Google Sheets**
   - 커스텀 랜딩 UI를 그대로 유지하면서 시트에 저장하기 좋다.
   - Apps Script에서 Slack 알림, 중복 제거, 태그 분류, 반영완료 체크 자동화도 추가하기 쉽다.
   - 현재 API의 `NAEMBI_BETA_WEBHOOK_URL`에 Apps Script 배포 URL을 넣으면 된다.

3. **Airtable / Make / Zapier / Tally**
   - 비개발 운영자가 보기 좋고 자동화가 쉽다.
   - 월 사용량이나 권한 관리에 따라 비용이 생길 수 있다.

4. **Supabase / Postgres / Firebase**
   - 실제 서비스 운영 데이터로 이어갈 때 적합하다.
   - 인증, 개인정보 보관, 관리자 화면까지 고려해야 해서 초기 베타에는 과하다.

## 현재 구현

랜딩의 세 입력 흐름은 모두 서버 API를 거친다.

| 화면 입력 | API | 저장 종류 |
| --- | --- | --- |
| 출시 알림·베타테스트 신청 | `/api/beta-signup` | `beta-signup` |
| 원하는 레시피 요청 | `/api/feedback` | `feedback` 중 `type=recipe` |
| 베타 피드백 | `/api/feedback` | `feedback` |

서버 저장 우선순위:

```text
Google Form -> webhook/Apps Script -> GitHub Issue
```

## Google Form 연결 방법

1. Google Form을 만든다.
2. 질문을 만든다: `kind`, `requestId`, `email`, `name`, `profile`, `note`, `type`, `message`, `recipe`, `source`, `screen`, `page`, `createdAt`.
3. Form의 `formResponse` URL을 확인한다.
4. 각 질문의 `entry.xxxxx` ID를 확인한다.
5. Vercel 환경변수에 아래 값을 넣는다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","requestId":"entry.141414","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

베타 신청 폼과 피드백 폼을 Google Form에서 분리하고 싶으면 `NAEMBI_BETA_GOOGLE_FORM_FIELDS_BETA`, `NAEMBI_BETA_GOOGLE_FORM_FIELDS_FEEDBACK`을 따로 둔다.

## 운영 기준

- 초기 1~100명: Google Form 또는 Apps Script webhook.
- Slack에서 바로 확인하고 반영 여부를 관리하려면 `NAEMBI_SLACK_WEBHOOK_URL`, `NAEMBI_BETA_COMPLETION_URL`, `NAEMBI_BETA_COMPLETION_TOKEN`을 추가한다.
- 베타 인터뷰와 태그 관리가 필요해지면 Airtable.
- 실제 회원/레시피 데이터와 연결되면 Supabase/Postgres.
- 개인정보가 들어가므로 공개 클라이언트 코드에 Google token이나 private key를 넣지 않는다. 지금처럼 `/api/*` 서버 라우트를 통해 저장한다.
