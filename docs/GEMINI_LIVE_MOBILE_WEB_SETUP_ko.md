# Gemini Live 모바일 웹 세팅 검토

작성일: 2026-07-10

## 결론

모바일 웹에서도 마이크 접근은 가능하다. 단, 사용자가 버튼을 누르는 명시적 행동이 있어야 하고, 배포 주소는 HTTPS여야 한다. Vercel 배포 URL은 HTTPS라 조건을 만족한다.

Gemini API 키는 브라우저에 넣지 않는다. Vercel 서버리스 함수 `/api/gemini-live-token`이 `NAEMBI_GEMINI_API_KEY`로 Gemini Live용 1회성 ephemeral token을 발급하고, 브라우저는 그 토큰만 사용한다.

## 반영 범위

- `/app`의 `요리 비서` 버튼을 누르는 즉시 실제 Gemini Live 음성 세션과 마이크 권한 요청을 시작한다.
- 요리비서 패널은 음성 상태, 파형, 전사, 음소거/재개, 종료 중심의 음성 전용 UI로 제공한다.
- 마이크는 `getUserMedia` + AudioWorklet(미지원 브라우저는 ScriptProcessor 폴백)으로 PCM을 전송한다.
- Live 응답의 24 kHz PCM 오디오는 기존 요리비서 음량 설정을 따라 재생하고, 입력·출력 전사는 패널의 대화 기록에 표시한다.
- `/api/gemini-live-token`은 1회용 ephemeral token과 서버에서 고정한 모델·시스템 지시·전사·function declarations를 발급한다. SDK가 없는 로컬 실행에서도 Gemini REST token endpoint로 폴백한다.
- 음성 전사와 모델 답변은 패널의 대화 기록에 이어 표시한다. 연결 또는 권한 실패 시에는 상태와 재시도 가능한 마이크 버튼을 표시한다.
- 세션을 닫거나 조리 화면을 이탈하면 WebSocket, 마이크 track, AudioContext와 재생 큐를 정리한다.

## 조리 도구 호출

Live function call은 임의 JS를 실행하지 않는다. 허용 목록과 인자 검증을 거쳐 기존 UI 함수를 호출한다.

- 단계 이전/다음/특정 단계 이동
- 타이머 시작·일시정지·재개·취소
- 영상 재생/일시정지, 앞뒤 이동, 속도, 구간 반복
- 재료 목록 열기

음성 답변은 모델이 생성하며, 영상·단계·타이머 요청만 명시적 도구 호출로 처리한다.

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

로컬 `.env`는 `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `NAEMBI_GEMINI_API_KEY`를 모두 인식한다. 배포 환경은 `NAEMBI_GEMINI_API_KEY`를 권장한다.

## 로컬 실행 및 검증

기본 로컬 포트는 Fetch bad-port 목록에 포함된 `4190` 대신 `4876`이다.

```bash
npm run dev
npm run verify:gemini-live
npm run verify:gemini-live-browser
npm run verify:mobile-flow -- http://127.0.0.1:4876 9461
```

`verify:gemini-live`는 실제 ephemeral token, constrained WebSocket, 입력·출력 전사, 오디오 응답, function call/response 왕복을 확인한다. `verify:gemini-live-browser`는 실제 Chrome에서 화면 전사, 오디오 재생, `seek_video`가 기존 영상 제어 함수에 연결되는지를 확인한다.

## 모바일 검증 절차

1. Vercel 배포 URL을 iPhone Safari 또는 Android Chrome에서 연다.
2. `/app`으로 들어간다.
3. 조리 모드에서 `요리 비서`를 누른다.
4. 바로 나타나는 브라우저 권한 팝업에서 마이크 접근을 허용한다.
5. `Gemini Live가 듣고 있어요` 상태와 사용자/냄비 전사가 보이는지 확인한다.
6. `다음 단계`, `타이머 2분`, `10초 앞으로`, `재료 보여줘`를 말해 기존 조리 UI가 바뀌는지 확인한다.

## 운영 전 확인할 것

실시간 음성 스트리밍은 구현됐지만 베타 공개 전 다음 항목은 별도 운영 판단이 필요하다.

- 실제 사용자 음성이 외부 AI API로 전송되므로 베타 개인정보 고지와 동의 문구가 필요하다.
- Gemini Live 모델 사용량 비용과 지연 시간을 실제 모바일 네트워크에서 확인해야 한다.
- 주방 환경 소음, 화면 잠금, iOS Safari 오디오 정책에 대한 추가 검증이 필요하다.
- 공개 배포 전 token endpoint의 사용자 인증, rate limit, 사용량 제한을 추가한다.

## 참고 문서

- Google AI Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- Google AI Gemini Live ephemeral tokens: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
