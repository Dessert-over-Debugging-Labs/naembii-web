# Langfuse 대화 텍스트 기록

## 현재 구조

- `pk-lf...` / `sk-lf...` 키 한 쌍은 특정 Langfuse 프로젝트에 귀속된다. 키를 만든 화면에서 이미 프로젝트가 생성된 상태이므로 별도 프로젝트를 다시 만들 필요는 없다.
- 브라우저는 Gemini Live와 대화하고, 한 턴이 완료되거나 응답이 중단되거나 패널이 닫힐 때 `/api/ai-trace`로 현재까지의 사용자/냄비 전사만 보낸다.
- Vercel Function이 식별정보를 마스킹한 후 Langfuse Japan으로 전송한다.
- 원본 음성, PCM, base64 오디오, 전체 재료 목록은 Langfuse에 보내지 않는다.
- 토큰 사용량은 기존처럼 Google Sheet에 계속 집계한다.

Langfuse에서 한 턴은 `voice-cooking-turn` trace / `gemini-live-turn` generation으로 보이고, 같은 `sessionId`를 공유하는 턴은 Sessions 화면에서 하나의 대화로 묶인다. 메타데이터에는 레시피, 질문 시점의 조리 단계, 턴 번호, `completed`/`interrupted`/`abandoned` 상태가 들어간다.

## 로컬 확인

`.env`에 아래 값이 있어야 한다.

```dotenv
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
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
NAEMBI_LANGFUSE_ENABLED=true
NAEMBI_ALLOWED_ORIGINS=https://실제-도메인
```

환경변수를 바꾸면 새 배포에만 반영된다. Public/Secret key는 둘 다 서버 환경변수로만 두고 HTML에 직접 넣지 않는다.

## 운영 전 필수 확인

- 대화 전문 저장 목적, 저장 항목, 보유 기간, Langfuse 위탁과 일본 국외 이전을 개인정보 처리방침과 이용자 고지에 반영한다.
- Hobby/Core는 자동 보존 기간 설정을 제공하지 않으므로, 짧은 보유 기간을 약속하려면 삭제 API를 호출하는 별도 일일 작업이 필요하다.
- 현재 식별정보 마스킹은 이메일, 전화번호, 주민등록번호, 카드 번호 형식을 대상으로 한다. 주소·이름·자유 형식 민감정보를 모두 탐지하는 법적 익명화는 아니다.
