# Gemini Live 모바일 웹 세팅 검토

작성일: 2026-07-09

## 결론

모바일 웹에서도 마이크 접근은 가능하다. 단, 사용자가 버튼을 누르는 명시적 행동이 있어야 하고, 배포 주소는 HTTPS여야 한다. Vercel 배포 URL은 HTTPS라 조건을 만족한다.

Gemini API 키는 브라우저에 넣지 않는다. Vercel 서버리스 함수 `/api/gemini-live-token`이 `NAEMBI_GEMINI_API_KEY`로 Gemini Live용 1회성 ephemeral token을 발급하고, 브라우저는 그 토큰만 사용한다.

## 이번 반영 범위

- `/app` 요리비서 패널의 마이크 버튼을 “모바일 권한 + Gemini Live 준비 확인”으로 연결했다.
- `navigator.mediaDevices.getUserMedia({ audio: true })`로 모바일 마이크 권한 가능 여부를 확인한다.
- `/api/gemini-live-token`에서 `@google/genai`의 `authTokens.create()`로 1회용 Live 토큰을 발급한다.
- 토큰 발급 실패 또는 환경변수 미설정 시 기존 추천 질문/직접 입력형 요리비서는 계속 사용할 수 있다.

## Vercel 환경변수

필수:

```text
NAEMBI_GEMINI_API_KEY=Google AI Studio에서 발급한 Gemini API key
```

선택:

```text
NAEMBI_GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES=30
NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS=60
```

## 모바일 검증 절차

1. Vercel 배포 URL을 iPhone Safari 또는 Android Chrome에서 연다.
2. `/app`으로 들어간다.
3. 조리 모드에서 `물어보기`를 누른다.
4. 마이크 아이콘을 누른다.
5. 브라우저 권한 팝업에서 마이크 접근을 허용한다.
6. `마이크 권한 확인 · Gemini Live 연결 준비됨`이 보이면 토큰 발급까지 통과한 것이다.

## 아직 켜지 않은 것

실시간 음성 스트리밍 송수신은 아직 기본 활성화하지 않는다. 이유는 다음과 같다.

- 실제 사용자 음성이 외부 AI API로 전송되므로 베타 개인정보 고지와 동의 문구가 필요하다.
- Gemini Live 모델 사용량 비용과 지연 시간을 실제 모바일 네트워크에서 확인해야 한다.
- 주방 환경 소음, 화면 잠금, iOS Safari 오디오 정책에 대한 추가 검증이 필요하다.

## 참고 문서

- Google AI Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- Google AI Gemini Live ephemeral tokens: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
