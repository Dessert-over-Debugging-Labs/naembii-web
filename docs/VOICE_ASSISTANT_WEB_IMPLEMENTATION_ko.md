# 음성비서 웹앱 적용 결과

작성일: 2026-07-12

## 적용 범위

Naembi 웹앱의 조리 화면 요리비서에 브라우저 음성 인식을 연결했다.

사용자 흐름은 다음과 같다.

1. `물어보기`로 요리비서 패널을 연다.
2. `말하기 시작`을 누르고 브라우저 마이크 권한을 허용한다.
3. `듣는 중 · 말씀하세요` 배지, 파형, `듣기 중지` 버튼을 확인한다.
4. 사용자의 말이 중간 transcript로 표시된다.
5. 최종 transcript가 `인식 완료` 상태로 확정된다.
6. 확정 문장을 현재 레시피의 요리비서 응답/명령 엔진에 전달한다.
7. `응답 생성 중 → 응답 중 → 응답 완료` 상태와 답변을 표시한다.
8. 응답 중 YouTube 볼륨 명령을 낮추고 `영상 소리 자동 낮춤` 배지를 표시한 뒤 원래 값으로 복구한다.
9. 완료 후 `다시 말하기`로 새 질문을 시작할 수 있다.

## 구현 방식

- 음성 인식: `SpeechRecognition` 또는 `webkitSpeechRecognition`
- 언어: `ko-KR`
- 중간 결과: `interimResults=true`
- 입력 연결: final transcript를 `answerForVpPrompt()`에 전달
- 지원 명령: 현재 레시피의 재료 대체/조리 문제 질문, 다음 단계, 이전 단계, 분·초 타이머
- 응답: 현재 레시피별 검증된 응답 세트와 정직한 미매칭 폴백

`/api/gemini-live-token`은 향후 Gemini Live 오디오 왕복을 위한 준비 API로 남아 있다. 현재 웹 음성 입력 흐름은 이 API나 `NAEMBI_GEMINI_API_KEY`가 없어도 동작한다.

브라우저 음성 인식 구현에 따라 음성이 브라우저 제공자의 음성 인식 서비스에서 처리될 수 있다. 베타 공개 전 개인정보 고지와 실제 브라우저 정책 확인이 필요하다.

## 상태 UI

- `마이크 대기`
- `마이크 권한 요청 중`
- `마이크 준비됨`
- `듣는 중 · 말씀하세요`
- `인식 완료`
- `응답 생성 중`
- `응답 중`
- `응답 완료`
- 권한 거부, 무음, 마이크 없음, 네트워크 오류, HTTPS 필요, 브라우저 미지원

권한 거부와 인식 실패는 `다시 시도`, 브라우저 미지원은 `추천 질문 사용`으로 연결한다. 직접 텍스트 입력은 노출하지 않고 `현재는 음성 또는 추천 질문만 지원해요`라고 표시한다.

## 레이아웃·접근성

- 패널 기본/확장 높이를 줄여 현재 조리 단계, 영상, 타이머와 겹치지 않도록 보정했다.
- 손잡이 클릭과 드래그 크기 조절을 유지했다.
- 긴 transcript와 답변은 패널 내부에서 스크롤된다.
- 마이크, 닫기, 패널 손잡이에 상태별 접근성 이름을 제공한다.
- YouTube iframe 로드 전에 발생한 명령은 큐에 보관하고 로드 후 전송한다.

## 검증

```bash
npm run check
npm run verify:voice-assistant -- http://127.0.0.1:4873 /tmp/naembi-voice-assistant-ux-final
npm run verify:mobile-flow -- http://127.0.0.1:4873 9904
npm run verify:app-screens -- http://127.0.0.1:4873 /tmp/naembi-voice-app-screens-final 9905
npm run verify:long-dynamic:smoke -- --base-url=http://127.0.0.1:4873 --full --report=/tmp/naembi-voice-long-smoke-final.md --out-dir=/tmp/naembi-voice-long-smoke-final
```

결과:

- 음성비서 전용 검증: PASS, WebKit iPhone / Chromium Android / 데스크톱 Chrome
- 음성비서 점수표: 권한 흐름, 음성 인식 확인, 응답 연결, 모바일 사용성, 영상 볼륨, 오류 안내, 베타 적합성 모두 10/10
- 상태별 스크린샷: 27개(9개 상태 × 3개 브라우저 프로필)
- 모바일 회귀 검증: PASS
- 전체 앱 화면 회귀: PASS, 126개 화면 / 실패 0
- 장시간 워크플로우 smoke/full: PASS, 8개 task / 실패 0, 앱 화면 126개 상태 / 실패 0

자동 검증의 마이크 권한과 음성 인식 이벤트는 테스트 더블이다. 실제 사용자의 마이크 음질, 운영체제 권한 팝업, 주방 소음, 화면 잠금, 실제 스피커 볼륨은 배포 HTTPS 주소와 실기기에서 추가 확인해야 한다.
