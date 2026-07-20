# Langfuse 대화 텍스트 기록

## 현재 구조

- `pk-lf...` / `sk-lf...` 키 한 쌍은 특정 Langfuse 프로젝트에 귀속된다. 키를 만든 화면에서 이미 프로젝트가 생성된 상태이므로 별도 프로젝트를 다시 만들 필요는 없다.
- 브라우저는 Gemini Live와 대화하고, 한 턴이 완료되거나 응답이 중단되거나 패널이 닫힐 때 `/api/ai-trace`로 현재까지의 사용자/냄비 전사만 보낸다.
- Vercel Function이 브라우저 사용자 ID를 HMAC 가명화하고 식별정보 형식을 마스킹한 후 Langfuse Japan으로 전송한다. 원본 브라우저 ID는 Langfuse에 보내지 않는다.
- 원본 음성, PCM, base64 오디오, 전체 재료 목록은 Langfuse에 보내지 않는다.
- 토큰 사용량은 기존처럼 Google Sheet에 계속 집계한다.

Langfuse에서는 한 턴이 `레시피 · 2/5단계 · 3턴` 형태의 trace/generation으로 보이고, 한 번의 조리 시작부터 종료까지 같은 `sessionId`를 공유해 Sessions 화면에서 하나의 대화로 묶인다. 입력은 `system` 조리 맥락과 `user` 발화, 출력은 `assistant` 답변으로 구분된다. 메타데이터에는 레시피, 질문 시점의 단계, 턴 번호, `completed`/`interrupted`/`abandoned` 상태, 실행 또는 차단된 조작이 들어간다.

`userId`는 브라우저별 가명 ID다. 같은 브라우저에서 다시 요리하면 같은 사용자로 볼 수 있지만, 로그인 없이 한 기기를 여러 사람이 함께 쓰는 경우 실제 사람별로 구분할 수는 없다. 실제 사람별 구분이 필요하면 로그인 또는 사용 프로필 선택 기능이 별도로 필요하다.

Langfuse에서 대화를 볼 때는 다음 순서로 확인한다.

1. `Sessions`에서 `cook:<recipeId>:<usageId>` 세션을 연다.
2. 턴 이름과 `turnNumber` 순서로 사용자/냄비 대화를 본다.
3. 특정 턴의 Input에서 당시 레시피·단계와 사용자 발화를 보고, Output에서 냄비 답변을 본다.
4. 잘못된 조작을 조사할 때 Metadata의 `toolCalls`에서 `allowed: true/false`와 차단 사유를 확인한다.

## 로컬 확인

`.env`에 아래 값이 있어야 한다.

```dotenv
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
NAEMBI_USER_HASH_SECRET=충분히-긴-임의-문자열
NAEMBI_LANGFUSE_ENABLED=true
```

```bash
npm run dev
```

`http://127.0.0.1:4876/app` 조리 모드에서 요리 비서와 한 턴 대화한 뒤, Langfuse의 Tracing 또는 Sessions 화면에서 확인한다. 전송을 긴급히 끄려면 `NAEMBI_LANGFUSE_ENABLED=false`로 바꾸면 된다.

## Vercel 배포

로컬 `.env`는 Vercel에 자동 복사되지 않는다. Vercel Project Settings → Environment Variables의 Production에 아래를 등록한다.

```dotenv
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=production
NAEMBI_USER_HASH_SECRET=충분히-긴-임의-문자열
NAEMBI_LANGFUSE_ENABLED=true
NAEMBI_ALLOWED_ORIGINS=https://실제-도메인
```

환경변수를 바꾸면 새 배포에만 반영된다. Public/Secret key는 둘 다 서버 환경변수로만 두고 HTML에 직접 넣지 않는다.

## 운영 전 필수 확인

- `LANGFUSE_SECRET_KEY`, `NAEMBI_USER_HASH_SECRET`는 Vercel 서버 환경변수로만 등록하고 `index.html`, `app.html`, `/api/public-config` 응답에 포함되지 않는지 확인한다.
- `NAEMBI_ALLOWED_ORIGINS`에는 공식 운영 도메인만 넣는다. Preview 배포에서 Langfuse 전송을 테스트할 때는 임시로 해당 Preview origin을 추가하고 테스트 후 제거한다.
- 실제 사용자에게 열기 전, 대화 원문 저장 목적, 저장 항목, 보유 기간, Langfuse 위탁과 일본 국외 이전을 제품 내 고지 또는 개인정보 처리방침에 반영했는지 확인한다.
- Hobby/Core는 자동 보존 기간 설정을 제공하지 않으므로, 짧은 보유 기간을 약속하려면 삭제 API를 호출하는 별도 일일 작업이 필요하다.
- 현재 식별정보 마스킹은 이메일, 전화번호, 주민등록번호, 카드 번호 형식을 대상으로 한다. 주소·이름·자유 형식 민감정보를 모두 탐지하는 법적 익명화는 아니다.
- 보존기간 자동 삭제, 저장 텍스트 범위 축소, 운영 대시보드는 이 PR에 섞지 않고 별도 운영 PR로 처리한다.
