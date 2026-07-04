# 냄비 베타 배포·수집 세팅 단계 v3

> Notion 페이지 제목: **냄비 베타 배포·수집 세팅 v3**
> 기준 문서: Notion `웹앱 전체 구현 계획 (AWS·랜딩·베타·피드백)` + `전체 구현 계획 v2 (정정판)`.

## 현재 결론

- 제품 프론트 기준 repo는 **`Dessert-over-Debugging-Labs/cook-assistance-wireframe`** 이다.
- 현재 주력 엔트리는 **`app.html` 단일 HTML** 이고, React/Next 전환은 베타 범위가 아니다.
- 레시피 데이터의 현재 계약은 `app.html` 안 **`RECIPES` 배열 형식**이다. `cookflow/web` 스키마는 현재 제품 프론트의 정본 계약으로 보지 않는다.
- 배포는 **Vercel**로 진행한다.
- 입력값 저장은 우선 **Google Form + Google Sheets**로 진행한다.
- AWS는 지금 하지 않는다. 다만 AWS로 넘어갈 때는 Notion v2 정정판 기준으로 **PostgreSQL ERD / RDS 또는 Aurora**를 먼저 검토하고, DynamoDB를 기본값으로 가정하지 않는다.
- 공개 랜딩 후보는 기본적으로 **A 앱 미리보기형**을 쓴다.
- B/C 후보는 카피 테스트용으로 보관한다.

## 이미 문서화된 위치

- 저장 방식 비교: `docs/handoff/BETA_COLLECTION_OPTIONS_ko.md`
- 최종 검증 리포트: `docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md`
- 환경변수 예시: `.env.example`
- AWS 보류/베타 방향 관련 기존 인수인계: `docs/handoff/HANDOFF_WEBAPP_CODEX_ko.md`
- 구현계획 정정 근거: Notion `전체 구현 계획 v2 (정정판)`

## 0. 구현계획 정정 반영

v3 실행 기준:

- **프론트는 이 repo의 `app.html`** 을 계속 제품 베타 기준으로 사용한다.
- `naembi.vercel.app` 모양을 맞추되, 별도 새 앱으로 재작성하지 않는다.
- 베타 데이터는 우선 `RECIPES` 배열에 사람이 검수한 레시피를 넣어 운영한다.
- `recipe-ingest`류 자동화는 지금 제품 프론트가 아니라 레시피 후보 발견·검수·배치 도구로 본다.
- 백엔드는 지금은 Vercel `api/` + Google Form/Sheets로 충분하다.
- AWS는 "지금 세팅할 일"이 아니라 "베타 이후 조건 충족 시 검토할 일"이다.
- 장기 백엔드가 필요해지면 Notion v2 정정판의 PostgreSQL ERD를 먼저 읽고 설계한다.
- 저장소를 나눈다면 제품 프론트 repo와 백엔드/도구 repo를 분리한다. 지금은 이 repo에서 베타 배포를 먼저 끝낸다.

## 1. 후보 URL 확인

- [ ] A 앱 미리보기형 확인: `/?variants=1&variant=demo`
- [ ] B 베타 모집형 확인: `/?variants=1&variant=beta`
- [ ] C 레시피 모집형 확인: `/?variants=1&variant=recipe`
- [ ] 공개 기본 랜딩은 내부 후보 스위처 없이 보이는지 확인: `/`

현재 추천:

```text
공개 기본안 = A 앱 미리보기형
광고/커뮤니티 테스트 = B 또는 C를 별도 링크로 공유
```

## 2. Google Form 만들기

목적: 베타 신청, 레시피 요청, 피드백을 일단 Google Sheets로 모은다.

- [ ] Google Form 새로 만들기
- [ ] 응답을 Google Sheets에 연결하기
- [ ] 아래 질문을 만든다

| 질문명 | 용도 | 필수 |
| --- | --- | --- |
| `kind` | `beta-signup` / `feedback` 구분 | 선택 |
| `email` | 베타 초대/반영 소식 받을 이메일 | 베타 신청은 필수 |
| `name` | 이름 또는 닉네임 | 선택 |
| `profile` | 요리 스타일/사용자 유형 | 선택 |
| `note` | 테스트하고 싶은 상황 | 선택 |
| `type` | feedback 종류 | 선택 |
| `message` | 피드백 또는 레시피 요청 이유 | 피드백은 필수 |
| `recipe` | 요청 요리 이름 | 레시피 요청은 필수 |
| `source` | 어느 폼에서 왔는지 | 자동 |
| `screen` | 앱/랜딩 화면 구분 | 자동 |
| `page` | 제출 당시 URL | 자동 |
| `createdAt` | 제출 시각 | 자동 |

## 3. Google Form entry ID 확인

목적: 커스텀 랜딩에서 Google Form으로 값을 보낼 수 있게 매핑한다.

- [ ] Google Form 미리보기 또는 페이지 소스에서 `entry.xxxxx` 값을 확인한다
- [ ] 각 질문명과 `entry.xxxxx`를 매칭한다
- [ ] 아래 JSON을 실제 값으로 바꾼다

```json
{
  "kind": "entry.111111",
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

주의:

- Google Form 질문을 나중에 삭제/재생성하면 entry ID가 바뀔 수 있다.
- 질문명은 사람이 보기 위한 이름이고, 실제 저장은 `entry.xxxxx`로 매핑된다.

## 4. Vercel 프로젝트 연결

목적: GitHub repo를 Vercel에서 배포하고 `/api/*` 서버 라우트를 활성화한다.

- [ ] Vercel에서 새 프로젝트 생성
- [ ] GitHub repo 연결: `Dessert-over-Debugging-Labs/cook-assistance-wireframe`
- [ ] Framework preset은 자동 감지 또는 Other로 둔다
- [ ] Root Directory는 repo root로 둔다
- [ ] Build command는 비워도 된다
- [ ] Output directory도 비워도 된다
- [ ] 배포 후 `/`가 `app.html`로 열리는지 확인한다
- [ ] 공개 도메인은 기존 `naembi.vercel.app` 유지 또는 새 프로젝트 도메인 연결 중 하나로 확정한다

현재 repo 설정:

```text
vercel.json: / -> /app.html
api/beta-signup.js
api/feedback.js
api/_lib/collect.js
```

## 5. Vercel 환경변수 추가

목적: 폼 제출값이 Google Form/Sheets로 저장되게 한다.

Vercel Project Settings → Environment Variables에 추가:

```bash
COOK_BETA_GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/formResponse
COOK_BETA_GOOGLE_FORM_FIELDS={"kind":"entry.111111","email":"entry.222222","name":"entry.333333","profile":"entry.444444","note":"entry.555555","type":"entry.666666","message":"entry.777777","recipe":"entry.888888","source":"entry.999999","screen":"entry.131313","page":"entry.101010","createdAt":"entry.121212"}
```

- [ ] Production 환경에 추가
- [ ] Preview 환경에도 추가할지 결정
- [ ] 환경변수 추가 후 재배포한다

선택 예비 옵션:

```bash
COOK_BETA_WEBHOOK_URL=https://example.com/webhook
COOK_BETA_GITHUB_REPO=owner/repo
COOK_BETA_GITHUB_TOKEN=GITHUB_TOKEN_VALUE
COOK_BETA_GITHUB_LABELS=cook-beta
```

## 6. 배포 후 제출 테스트

목적: 실제 사용자 제출이 저장되는지 확인한다.

- [ ] 배포 URL `/` 접속
- [ ] 출시 알림 이메일 제출
- [ ] Google Sheet에 `beta-signup` 행이 생겼는지 확인
- [ ] 원하는 레시피 요청 제출
- [ ] Google Sheet에 `feedback` 또는 `recipe` 행이 생겼는지 확인
- [ ] 피드백 모달에서 피드백 제출
- [ ] Google Sheet에 피드백 행이 생겼는지 확인
- [ ] 잘못된 이메일 입력 시 오류 메시지가 나오는지 확인

예상 성공 메시지:

```text
신청이 접수됐습니다. 초대 준비가 되면 이메일로 안내할게요.
요청이 접수됐습니다. 베타 레시피 후보에 반영할게요.
피드백이 접수됐습니다. 베타 개선 목록에 반영할게요.
```

## 7. 검증 루프 실행

로컬에서 확인:

```bash
npm run check
npm run verify:dynamic
npm run verify:visual
```

통과 기준:

- [ ] `npm run check` PASS
- [ ] `npm run verify:dynamic` PASS
- [ ] `npm run verify:visual` PASS
- [ ] 최종 점수 95점 이상
- [ ] 공개 화면 금지어 `forbiddenVisibleTerms=[]`

최신 검증 리포트:

```text
docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md
```

## 8. 베타 공개 전 최종 결정

- [ ] 기본 랜딩 후보 확정: A / B / C
- [ ] 공유할 배포 URL 확정
- [ ] Google Sheet 컬럼 확인
- [ ] 수집된 이메일/요청을 누가 확인할지 정하기
- [ ] 베타 안내 문구 작성
- [ ] 개인정보/이메일 수집 안내 문구가 필요한지 확인
- [ ] GitHub repo 이름 유지/변경 결정

## 9. GitHub repo 이름 후보

추천 우선순위:

1. `naembi` — 서비스/도메인 이름과 일치해서 베타 공유, Vercel 프로젝트, 사용성 테스트 기록을 연결하기 쉽다.
2. `naembi-web` — 향후 iOS/AWS/backend repo가 분리될 가능성을 남기면서도 제품 프론트임이 명확하다.
3. `cook-assistance-wireframe` — 현재 이름을 유지하는 선택지. 다만 베타 테스트용 제품 repo로는 와이어프레임 인상이 강하다.

권장 결정:

```text
제품 프론트 repo = naembi-web
Vercel project = naembi
도구/백엔드 repo가 필요해질 때 = naembi-labs 또는 naembi-platform
```

## 추천 진행 순서

```text
오늘:
1. Google Form 만들기
2. entry ID 확인
3. Vercel 환경변수 넣기
4. 재배포
5. 실제 제출 테스트

그 다음:
6. 후보 A/B/C 중 공개안 확정
7. 20~30명에게 베타 링크 공유
8. Sheet 응답 기준으로 카피와 레시피 우선순위 조정
```

## AWS로 넘어가는 조건

아래 중 하나가 실제로 필요해질 때만 AWS 또는 DB를 검토한다.

- 사용자 로그인
- 사용자별 저장/히스토리
- 레시피 수백 개 이상 운영
- 조리 세션 로그 분석
- 음성 로그/개인화 데이터 저장
- 관리자 화면과 권한 관리

지금은 해당하지 않으므로 AWS는 보류한다. 넘어갈 경우에는 Notion v2 정정판의 PostgreSQL ERD를 기준으로 RDS/Aurora부터 검토한다.
