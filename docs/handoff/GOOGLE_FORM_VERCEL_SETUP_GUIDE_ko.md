# 냄비 베타 Google Form + Vercel 수집 세팅 가이드

> 목적: 냄비 베타 랜딩에서 들어오는 `베타 신청`, `레시피 요청`, `피드백`을 Google Form 응답과 Google Sheets에 저장한다.
> 기준 repo: `Dessert-over-Debugging-Labs/naembi-web`
> 권장 방식: Google Form 1개 + Vercel 환경변수 2개

## 결론

지금은 별도 DB나 AWS를 만들지 않는다.

베타 테스트 단계에서는 다음 구성이 가장 빠르고 관리하기 쉽다.

```text
사용자 입력 -> Vercel /api/* -> Google Form formResponse -> Google Sheets
```

Vercel에 넣을 환경변수는 기본적으로 2개다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
NAEMBI_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","requestId":"entry.141414","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

`entry.111111` 같은 값은 예시다. 실제 Google Form에서 직접 확인해서 바꿔야 한다.

## 0. 자동 생성 스크립트로 만들기

수동으로 Google Form 질문을 만들고 `entry.xxxxx`를 찾는 대신, 아래 Apps Script를 먼저 쓰는 것을 권장한다.

```text
scripts/google-apps-script/create-naembi-beta-collection.js
```

실행 순서:

1. `https://script.google.com`에서 새 프로젝트를 만든다.
2. `scripts/google-apps-script/create-naembi-beta-collection.js` 전체를 `Code.gs`에 붙여넣는다.
3. 함수 선택 드롭다운에서 `setupNaembiBetaCollection`을 선택하고 실행한다.
4. 처음 실행 시 Google 권한을 승인한다.
5. 생성된 Spreadsheet를 열고 `Vercel env` 탭을 확인한다.
6. 아래 두 값을 Vercel 환경변수로 그대로 넣는다.

```bash
NAEMBI_BETA_GOOGLE_FORM_URL=...
NAEMBI_BETA_GOOGLE_FORM_FIELDS=...
```

스크립트가 자동으로 만드는 것:

| 항목 | 내용 |
| --- | --- |
| Google Form | `냄비 베타 신청·레시피 요청·피드백` |
| Google Sheet | `냄비 베타 응답` |
| 질문 | `kind`, `requestId`, `email`, `name`, `profile`, `note`, `type`, `message`, `recipe`, `source`, `screen`, `page`, `createdAt` |
| Vercel env 탭 | Vercel에 넣을 `NAEMBI_BETA_GOOGLE_FORM_URL`, `NAEMBI_BETA_GOOGLE_FORM_FIELDS` |
| 운영뷰 탭 | 한글 컬럼, 접수구분 자동 변환, 필터, 상태/우선순위 드롭다운, 반영완료 체크박스 |
| 운영뷰 자동화 | Form 제출 트리거와 webhook 저장 경로에서 운영뷰 자동 갱신 |

이미 예전 버전의 스크립트로 Form과 Sheet를 만들었다면:

1. Apps Script의 `Code.gs`를 최신 `scripts/google-apps-script/create-naembi-beta-collection.js` 내용으로 교체한다.
2. 함수 선택 드롭다운에서 `installNaembiOperatingViewAutomation`을 선택한다.
3. 실행하면 기존 Google Sheet에 `운영뷰` 탭이 생성/갱신되고, 이후 Form 제출 때 자동 갱신되는 트리거가 설치된다.

`installNaembiOperatingViewAutomation`은 내부적으로 `createNaembiOperatingView`와 같은 운영뷰 갱신을 먼저 수행한다. 원본 응답 탭은 건드리지 않고, 기존 `운영뷰`의 `상태`, `우선순위`, `담당자`, `운영메모` 값도 보존하며, 자동으로 계산되는 왼쪽 컬럼만 갱신한다.

운영뷰가 갱신되는 경로:

- `setupNaembiBetaCollection` 실행 시 자동 생성 및 트리거 설치
- `installNaembiOperatingViewAutomation` 실행 시 기존 Sheet에 트리거 설치
- Google Form 응답 제출 시 `syncNaembiOperatingView` 자동 실행
- Apps Script Web App/webhook으로 저장 시 즉시 운영뷰 갱신
- Slack `반영완료 체크` 처리 시 운영뷰 체크박스 갱신

선택 테스트:

- `submitNaembiSmokeTest` 함수를 실행하면 테스트 행 1개가 Google Sheet에 들어간다.
- 이 테스트 행은 운영 데이터가 아니므로 확인 후 지워도 된다.
- Slack 알림과 반영완료 체크 자동화까지 쓰려면 `docs/handoff/SLACK_SHEET_COMPLETION_AUTOMATION_ko.md`를 이어서 설정한다.
- 기존 Sheet에서 운영뷰를 수동으로 계속 갱신하고 있었다면 최신 스크립트 적용 후 `installNaembiOperatingViewAutomation`을 한 번 실행한다.

주의:

- 이 스크립트는 실행한 Google 계정의 Drive에 새 Form과 Sheet를 만든다.
- Vercel에 env를 넣은 뒤에는 반드시 재배포해야 한다.
- 이후 Google Form 질문을 삭제하고 다시 만들면 `entry.xxxxx`가 바뀌므로 스크립트를 다시 실행하거나 수동으로 매핑을 갱신한다.

### Google에서 확인하지 않은 앱 경고가 뜰 때

Apps Script를 방금 만든 상태에서는 Google OAuth 검증을 받지 않았기 때문에 아래 경고가 뜰 수 있다.

```text
Google에서 확인하지 않은 앱
앱에서 Google 계정의 민감한 정보에 대한 액세스를 요청합니다.
```

이 경우 먼저 확인한다.

- 개발자 이메일이 본인 계정 또는 팀 계정인지 확인한다.
- 예: `asm.dod.team@gmail.com`이 직접 만든 팀 계정이면 계속 진행해도 된다.
- 모르는 이메일이면 승인하지 말고 중단한다.

본인/팀 계정이 맞다면 아래 순서로 진행한다.

1. `고급`을 누른다.
2. `프로젝트 이름(으)로 이동(안전하지 않음)`을 누른다.
3. 요청 권한을 확인한다.
4. `허용`을 누른다.

이 스크립트가 필요한 권한:

| 권한 | 이유 |
| --- | --- |
| Google Forms 보기/수정 | 베타 수집용 Form 생성, 질문 생성, 응답 테스트 |
| Google Sheets 보기/수정 | 응답 Sheet 생성, `Vercel env` 탭 작성 |

이 경고는 공개 서비스 이용자에게 보이는 화면이 아니다. 스크립트를 실행하는 관리자 계정에게만 보인다.

## 1. Google Form 만들기

Google Forms에서 새 양식을 만든다.

추천 제목:

```text
냄비 베타 신청·레시피 요청·피드백
```

설정에서 확인할 것:

- 응답 수집: 켜기
- 응답을 Google Sheets에 연결하기
- 이메일 주소 수집 기능은 선택사항이다
- 단, 앱에서 보내는 `email`을 저장하려면 별도 질문 `email`은 반드시 만든다
- 외부 베타테스터가 쓸 수 있게 조직 내부 제한, 로그인 필수, 1회 응답 제한은 끈다

중요:

- 같은 Form 하나로 베타 신청과 피드백을 같이 받을 경우, Google Form 질문은 전부 필수 해제하는 편이 안전하다.
- 필수 검사는 이미 앱 API에서 한다.
- Google Form에서 필수로 걸면 어떤 입력 흐름에서는 비어 있는 필드 때문에 저장이 실패할 수 있다.

## 2. 질문 만들기

아래 질문을 순서대로 만든다.

| 질문 제목 | 질문 유형 | 필수 여부 | 앱에서 들어오는 값 |
| --- | --- | --- | --- |
| `kind` | 단답형 | 선택 | `beta-signup` 또는 `feedback` |
| `requestId` | 단답형 | 선택 | Slack 알림과 완료 체크를 연결하는 자동 추적 ID |
| `email` | 단답형 | 선택 | 베타 초대/답변 받을 이메일 |
| `name` | 단답형 | 선택 | 이름 또는 닉네임 |
| `profile` | 단답형 또는 드롭다운 | 선택 | 요리 스타일, 사용자 유형 |
| `note` | 장문형 | 선택 | 테스트하고 싶은 상황 |
| `type` | 단답형 또는 드롭다운 | 선택 | `bug`, `recipe`, `voice`, `video`, `other` |
| `message` | 장문형 | 선택 | 피드백 내용 또는 레시피 요청 이유 |
| `recipe` | 단답형 | 선택 | 요청 요리 이름 |
| `source` | 단답형 | 선택 | 어느 폼/버튼에서 들어왔는지 |
| `screen` | 단답형 | 선택 | 앱 화면 구분 |
| `page` | 장문형 | 선택 | 제출 당시 URL |
| `createdAt` | 단답형 | 선택 | 제출 시각 |

질문 제목은 위 이름 그대로 쓰는 것을 권장한다.

Google Form에는 숨김 필드가 없지만, `source`, `screen`, `page`, `createdAt` 같은 운영용 질문도 단답형 질문으로 만들어두면 앱이 값을 자동으로 채워 보낼 수 있다.

## 3. 응답 Sheet 연결

Google Form 상단의 `응답` 탭에서 Google Sheets 아이콘을 눌러 새 스프레드시트를 만든다.

추천 Sheet 이름:

```text
냄비 베타 응답
```

연결 후 첫 행에 질문 제목들이 컬럼으로 생기는지 확인한다.

운영할 때는 Sheet에서 `kind`, `type`, `recipe`, `createdAt` 기준으로 필터를 걸면 된다.

```text
kind=beta-signup -> 베타 신청
kind=feedback, type=recipe -> 레시피 요청
kind=feedback, type=bug/voice/video/other -> 일반 피드백
```

## 4. formResponse URL 확인

Google Form의 공유 URL은 보통 이렇게 생겼다.

```text
https://docs.google.com/forms/d/e/1FAIpQLSAMPLE_FORM_ID/viewform
```

Vercel에는 `viewform`이 아니라 `formResponse` URL을 넣어야 한다.

```text
https://docs.google.com/forms/d/e/1FAIpQLSAMPLE_FORM_ID/formResponse
```

즉, 마지막만 바꾼다.

```text
viewform -> formResponse
```

이 값이 Vercel의 `NAEMBI_BETA_GOOGLE_FORM_URL`에 들어간다.

## 5. entry ID 확인

각 질문마다 Google Form 내부 ID가 있다.

형태:

```text
entry.1234567890
```

확인 방법:

1. Google Form에서 우측 상단 `미리보기`를 연다.
2. 미리보기 페이지에서 브라우저 페이지 소스 보기를 연다.
3. `entry.`를 검색한다.
4. 질문 순서와 `entry.xxxxx` 값을 맞춰 적는다.

헷갈릴 때는 질문을 하나씩 고유한 예시 문구로 채운 뒤 개발자도구 Network에서 제출 요청의 form data를 보면 더 확실하다.

주의:

- 질문을 삭제하고 다시 만들면 `entry.xxxxx`가 바뀔 수 있다.
- 질문 제목을 바꾸는 것은 대체로 괜찮지만, 삭제/재생성 후에는 Vercel 환경변수도 다시 맞춰야 한다.
- `entry.xxxxx`는 질문 제목이 아니라 Google Form 내부 ID다.

## 6. 필드 매핑 JSON 만들기

확인한 값을 아래 형태로 바꾼다.

```json
{
  "kind": "entry.111111",
  "requestId": "entry.141414",
  "email": "entry.222222",
  "name": "entry.333333",
  "profile": "entry.444444",
  "note": "entry.555555",
  "type": "entry.666666",
  "message": "entry.777777",
  "recipe": "entry.888888",
  "source": "entry.999999",
  "screen": "entry.131313",
  "page": "entry.101010",
  "createdAt": "entry.121212"
}
```

Vercel 환경변수에는 한 줄 JSON으로 넣는다.

```json
{"kind":"entry.111111","requestId":"entry.141414","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

JSON 규칙:

- 큰따옴표를 쓴다.
- 마지막 쉼표를 넣지 않는다.
- `entry.xxxxx`는 실제 값으로 바꾼다.
- 줄바꿈 없이 한 줄로 넣는 것이 안전하다.

## 7. Vercel 환경변수 넣기

Vercel 프로젝트에서 다음 경로로 이동한다.

```text
Project -> Settings -> Environment Variables
```

추가할 값:

| Name | Value |
| --- | --- |
| `NAEMBI_BETA_GOOGLE_FORM_URL` | `https://docs.google.com/forms/d/e/FORM_ID/formResponse` |
| `NAEMBI_BETA_GOOGLE_FORM_FIELDS` | 한 줄 JSON 매핑 |
| `NAEMBI_SLACK_WEBHOOK_URL` | 선택. Slack 제출 알림용 Incoming Webhook URL |
| `NAEMBI_BETA_COMPLETION_URL` | 선택. Apps Script Web App URL |
| `NAEMBI_BETA_COMPLETION_TOKEN` | 선택. 반영완료 체크 링크 보호용 토큰 |

환경 선택:

- `Production`: 반드시 추가
- `Preview`: 테스트 배포에서도 제출을 확인하고 싶으면 추가
- `Development`: 로컬 Vercel 개발을 쓸 때만 추가

환경변수 추가 후 해야 할 일:

1. Vercel에서 재배포한다.
2. 배포 URL에 접속한다.
3. 베타 신청, 레시피 요청, 피드백을 각각 한 번씩 제출한다.
4. Google Sheet에 행이 생기는지 확인한다.
5. Slack 알림을 켰다면 `반영완료 체크` 버튼을 눌러 운영뷰 체크박스가 TRUE로 바뀌는지 확인한다.

## 8. 테스트 시나리오

배포 후 아래 순서대로 확인한다.

### 베타 신청

랜딩 상단 또는 베타 신청 영역에서 이메일을 넣고 제출한다.

성공 메시지:

```text
신청이 접수됐습니다. 초대 준비가 되면 이메일로 안내할게요.
```

Sheet에서 확인할 값:

```text
kind = beta-signup
email = 입력한 이메일
source = landing
```

### 레시피 요청

레시피 모집 영역에서 요리 이름, 유튜브 링크, 요청 이유를 넣고 제출한다.

성공 메시지:

```text
요청이 접수됐습니다. 베타 레시피 후보에 반영할게요.
```

Sheet에서 확인할 값:

```text
kind = feedback
type = recipe
recipe = 입력한 요리 이름
message = 요리 이름, 유튜브 링크, 요청 이유
```

### 피드백

피드백 버튼을 누르고 내용을 입력한다.

성공 메시지:

```text
피드백이 접수됐습니다. 베타 개선 목록에 반영할게요.
```

Sheet에서 확인할 값:

```text
kind = feedback
type = bug / recipe / voice / video / other
message = 입력한 피드백
screen = 제출한 화면
```

## 9. 자주 막히는 지점

### 제출은 성공처럼 보이는데 Sheet에 안 들어온다

확인할 것:

- `NAEMBI_BETA_GOOGLE_FORM_URL`이 `viewform`이 아니라 `formResponse`인지 확인
- `NAEMBI_BETA_GOOGLE_FORM_FIELDS`의 `entry.xxxxx`가 실제 질문 ID인지 확인
- Google Form이 외부 응답을 받을 수 있는 상태인지 확인
- Vercel 환경변수 추가 후 재배포했는지 확인

### Vercel에서 JSON 값 입력이 어렵다

한 줄로 넣는다.

```json
{"kind":"entry.111111","email":"entry.222222"}
```

아래처럼 마지막 쉼표가 있으면 안 된다.

```json
{"kind":"entry.111111","email":"entry.222222",}
```

### Google Form 질문을 바꿨다

질문을 삭제하거나 새로 만들었다면 `entry.xxxxx`를 다시 확인한다.

Vercel의 `NAEMBI_BETA_GOOGLE_FORM_FIELDS`도 수정하고 재배포한다.

### 같은 Form이 아니라 분리하고 싶다

가능하지만 지금 베타 단계에서는 Form 하나를 권장한다.

나중에 분리할 때는 코드가 이미 아래 환경변수도 지원한다.

```bash
NAEMBI_BETA_GOOGLE_FORM_FIELDS_BETA=...
NAEMBI_BETA_GOOGLE_FORM_FIELDS_FEEDBACK=...
```

다만 URL은 현재 하나의 `NAEMBI_BETA_GOOGLE_FORM_URL`을 기본으로 쓰므로, 완전히 다른 Form 2개로 나누려면 API 코드도 같이 조정하는 편이 낫다.

## 10. 현재 추천 운영 방식

초기 베타에서는 이렇게 운영한다.

```text
Google Form 1개
Google Sheet 1개
Vercel 환경변수 2개
운영뷰 탭에서 베타 신청 / 레시피 요청 / 피드백 구분
```

베타 인원이 많아져서 태그, 담당자, 상태 관리가 필요해지면 그때 Airtable, Supabase, PostgreSQL, AWS를 검토한다.

지금 단계에서 AWS를 먼저 세팅할 필요는 없다.
