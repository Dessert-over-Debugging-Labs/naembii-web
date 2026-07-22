# Langfuse 대화 텍스트·토큰 사용량 기록

## 현재 구조

- `pk-lf...` / `sk-lf...` 키 한 쌍은 특정 Langfuse 프로젝트에 귀속된다. 키를 만든 화면에서 이미 프로젝트가 생성된 상태이므로 별도 프로젝트를 다시 만들 필요는 없다.
- 브라우저는 Gemini Live와 대화하고, 한 턴이 완료되거나 응답이 중단되거나 패널이 닫힐 때 `/api/ai-trace`로 현재까지의 사용자/냄비 전사와 그 턴의 토큰 사용량을 보낸다.
- Vercel Function이 브라우저 사용자 ID를 HMAC 가명화하고 식별정보 형식을 마스킹한 후 Langfuse Japan으로 전송한다. 원본 브라우저 ID는 Langfuse에 보내지 않는다.
- **원본 음성, PCM, base64 오디오, 전체 재료 목록은 Langfuse에 보내지 않는다.** 오디오는 "몇 토큰을 썼는지"만 숫자로 남고 소리 자체는 저장되지 않는다.
- 세션 누적 스냅샷은 기존처럼 Google Sheet에도 계속 집계한다(`/api/usage`). Langfuse는 턴 단위, 시트는 세션 단위라 용도가 다르다.

Langfuse에서는 한 턴이 `레시피 · 2/5단계 · 3턴` 형태의 trace/generation으로 보이고, 한 번의 조리 시작부터 종료까지 같은 `sessionId`를 공유해 Sessions 화면에서 하나의 대화로 묶인다. 입력은 `system` 조리 맥락과 `user` 발화, 출력은 `assistant` 답변으로 구분된다. 메타데이터에는 레시피, 질문 시점의 단계, 턴 번호, `completed`/`interrupted`/`abandoned` 상태, 실행 또는 차단된 조작이 들어간다.

`userId`는 브라우저별 가명 ID다. 같은 브라우저에서 다시 요리하면 같은 사용자로 볼 수 있지만, 로그인 없이 한 기기를 여러 사람이 함께 쓰는 경우 실제 사람별로 구분할 수는 없다. 실제 사람별 구분이 필요하면 로그인 또는 사용 프로필 선택 기능이 별도로 필요하다.

Langfuse에서 대화를 볼 때는 다음 순서로 확인한다.

1. `Sessions`에서 `cook:<recipeId>:<usageId>` 세션을 연다.
2. 턴 이름과 `turnNumber` 순서로 사용자/냄비 대화를 본다.
3. 특정 턴의 Input에서 당시 레시피·단계와 사용자 발화를 보고, Output에서 냄비 답변을 본다.
4. 잘못된 조작을 조사할 때 Metadata의 `toolCalls`에서 `allowed: true/false`와 차단 사유를 확인한다.

## 토큰 사용량

Gemini Live는 응답마다 `usageMetadata`를 보낸다. 브라우저가 이것을 누적하면서 **직전에 기록한 대화 턴 이후의 차분**만 그 턴의 `usageDetails`로 실어 보낸다. 나가는 키는 아래 7개다.

| 키 | 내용 |
|---|---|
| `input` / `output` / `total` | Langfuse UI 합계 표시용 |
| `input_audio` / `input_text` | 사용자 발화(오디오)와 조리 맥락·도구 정의(텍스트) |
| `output_audio` / `output_text` | 냄비 음성 답변(오디오)과 전사(텍스트) |

**비용은 Langfuse 모델 가격표가 계산한다.** Project Settings → Models → Add model definition에서 아래처럼 등록한다. 값은 Google 공시가를 1,000,000으로 나눈 **토큰 1개당 가격**이다.

| 항목 | 값 |
|---|---|
| Model name | `gemini-3.1-flash-live-preview` (`NAEMBI_GEMINI_LIVE_MODEL` 값) |
| Match pattern | `(?i)^(google(ai)?/)?(gemini-3.1-flash-live-preview)$` |
| Unit | `TOKENS` |
| Tokenizer | 없음 (usage를 직접 보내므로 불필요) |
| `input_text` | `0.00000075` ($0.75 / 1M) |
| `input_audio` | `0.000003` ($3.00 / 1M) |
| `output_text` | `0.0000045` ($4.50 / 1M) |
| `output_audio` | `0.000012` ($12.00 / 1M) |

**가격은 위 모달리티 4개 키에만 매긴다.** `input`/`output`/`total`도 함께 전송되지만 UI 합계 표시용이라, 여기에 단가를 넣으면 같은 토큰이 두 번 계산된다. Langfuse 관리형 정의인 `gemini-live-2.5-flash-native-audio`도 같은 방식(모달리티 키에만 가격)을 쓴다.

주의할 점 두 가지.

- **공개 API(`POST /api/public/models`)로는 등록할 수 없다.** `prices` 맵을 무시하고 legacy `inputPrice`/`outputPrice`만 받는 버그가 미해결이라 모달리티 가격이 빈 채로 들어간다. UI로만 등록한다.
- **비용은 ingestion 시점에 계산되고 소급 적용되지 않는다.** 가격표를 나중에 등록하면 그 전 trace는 영구히 비용 0으로 남는다. 실사용 트래픽을 열기 전에 등록한다.

등록 후 검증: `input_audio 1500 / input_text 320 / output_audio 600 / output_text 40`인 턴의 비용이 **$0.01212**로 나오면 정상이다. 자릿수가 어긋나면 10⁶ 배 단위 실수다.

귀속 규칙은 두 가지만 기억하면 된다.

- **턴 값 = 직전 기록 턴 이후의 사용량.** 그래서 세션 첫 턴에는 setup·컨텍스트 재시작처럼 대화가 아닌 구간의 토큰이 함께 잡힐 수 있다. 그 턴이 몇 건의 `usageMetadata`를 흡수했는지는 Metadata의 `usageUpdates`에 있다 — 값이 유난히 크면 이걸 먼저 본다.
- **마지막 턴 이후 남은 토큰은 버려지지 않는다.** 세션이 닫힐 때 `레시피 · 세션 잔여 사용량`이라는 generation으로 한 번 더 기록된다(태그 `session-residual`). 이 항목에는 전사 텍스트가 없고 토큰만 있다. **한 세션의 실제 사용량 = 대화 턴들 + 이 잔여 항목**이므로, 비용을 볼 때 잔여 항목을 빼면 과소 집계된다.

`Metadata`의 `weightedTokens`는 사용 한도 판정에 쓰는 가중치 합(`입력텍스트 1 : 입력오디오 4 : 출력텍스트 6 : 출력오디오 16`)이다. 이 가중치는 위 단가표를 `input_text` 기준으로 정규화한 값과 정확히 같다(`0.75 : 3 : 4.5 : 12`). 따라서 **가중치 1단위 = $0.00000075**이고, `app.html`의 `GEMINI_LIVE_WEIGHTED_TOKEN_LIMIT=280000`은 **세션당 약 $0.21** 한도를 뜻한다. 모델을 바꾸면 이 가중치도 새 단가비로 다시 맞춰야 한다.

단, 오디오·텍스트 외 모달리티(이미지·비디오)가 `promptTokensDetails`에 섞이면 현재 구현은 그 몫을 텍스트로 계산한다($3.00를 $0.75로 과소 계상). 지금은 영상 프레임을 보내지 않아 발생하지 않지만, 멀티모달 입력을 추가하면 `guUsageBreakdown`에서 분리해야 한다.

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
- 비용 대시보드를 신뢰하기 전에 모델 가격표가 등록됐는지 확인한다. 가격이 없으면 토큰 수는 보이지만 비용은 0으로 표시된다.
- 보존기간 자동 삭제, 저장 텍스트 범위 축소, 운영 대시보드는 이 PR에 섞지 않고 별도 운영 PR로 처리한다.
