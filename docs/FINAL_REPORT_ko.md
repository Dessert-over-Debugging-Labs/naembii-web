# cook 와이어프레임 최종 리포트

작성: 2026-06-29 21:35

## 결론

- PRD 기준 `18/18` 스토리 완료: 초기 14개 + W0 감사에서 주입된 `FIX-W0-1`~`FIX-W0-4`.
- `app.html` 단일 HTML 프로토타입을 상속 자료 기준으로 다크 모바일 폴리시, 모든 버튼 동작, cook3 페이싱, 영상 정직성, 한국어/접근성까지 보강했다.
- `./scripts/ralph/supervise.sh 3 3`는 최초 샌드박스에서 `codex exec` 권한 오류로 정체됐고, 외부 권한 재시도 후 W0-1까지만 실질 진척했다. 이후 동일 PRD 순서와 green-gate 기준으로 직접 완주했다.

## 완료 타임라인

| 단계 | 결과 |
|---|---|
| W0-1 | `docs/AUDIT_ko.md` 작성, 화면/라우팅/cook3/vpanel/소셜 구조 감사, 후속 FIX 4개 주입 |
| W1/W2/FIX-W0 | 전역 다크 토큰, 모바일 타이포/여백/48px 터치, 홈·상세·후기·완료·cook3 동작/접근성 보정 |
| W3-1 | 4렌즈 fan-out 적대적 검증, 자동 데모 전진·오버레이 잔존·48px 미달·완료 소셜 갭 등 확정 결함 즉시 보정 |
| W3-2 | 10개 진입점 headless Chrome 스크린샷, JS 문법/앱 오류 패턴 검증, 최종 리포트 작성 |

## 화면 목록

- `home`: 홈, 카테고리, 추천/인기/나의 레시피, 등록 FAB
- `sheet`: 레시피 등록 바텀시트, 실제 URL input, 분석 진입
- `loading`: 분석 로딩
- `detail`: 상세, 재료/단계/후기 탭, 저장/공유/후기
- `reviews`: 후기 전체
- `cook3`: 주력 조리 모드, 정적 영상 미리보기, 사용자 주도 이전/다음, 타이머, 재료, 핸즈프리 시뮬레이션
- `cook`: 구버전 기본 조리 모드
- `cook2`: 구버전 핸즈프리 스냅샷
- `voice`: 핸즈프리 명령 가이드(프로토타입 예시, 실제 STT 미연결 명시)
- `complete`: 완료, 저장/별점/사진 메모/공유/타인 팁

## 핵심 보정

- 모든 탭 가능 요소는 이동, 상태 변경, 시트 열림, 또는 한국어 토스트 안내로 수렴한다.
- 상세 CTA와 `#voice` 라우팅은 주력 `cook3` 기준으로 정합했다.
- cook3는 자동 전진을 제거했다. 시뮬레이션 패널은 예시 답변만 보여주며 실제 단계 이동은 사용자의 이전/다음 버튼으로만 진행한다.
- 영상은 실제 재생을 단정하지 않고 `정적 미리보기 · 실제 재생은 실기기에서 확인`으로 표시한다.
- 사용자 노출 카피에서 `STEP`, `Mic`, `off`, `YouTube`, `쉐프` 등 누수를 제거했다. 아이콘명/CSS 클래스의 `mic-off`는 사용자 노출 카피가 아니다.
- 별점 입력은 radiogroup/radio 상태를 제공하고, 아이콘 버튼·닫기·카드·단계 카드에는 aria/키보드 접근을 보강했다.

## Green-gate

- JS 문법: `app.html`의 `<script>` 추출 후 `node --check` 통과.
- 앱 오류 패턴: Chrome 로그에서 `Uncaught`, `ReferenceError`, `TypeError`, `SyntaxError`, `ERR_FILE_NOT_FOUND` 없음.
- 전 화면 스크린샷: `scripts/ralph/screenshots/W3-2-*.png`
  - `W3-2-home.png`
  - `W3-2-sheet.png`
  - `W3-2-loading.png`
  - `W3-2-detail.png`
  - `W3-2-cook3.png`
  - `W3-2-cook.png`
  - `W3-2-cook2.png`
  - `W3-2-voice.png`
  - `W3-2-complete.png`
  - `W3-2-reviews.png`

Chrome headless는 이 머신에서 GPU/Google 프로필 관련 로그를 출력한다. 앱 JS 오류와 무관한 실행환경 노이즈로 분리했다.

## 후속 앱 형태 검증

- 2026-06-30에 브라우저가 아닌 Android 런처 앱 형태 검증을 위해 `android-wrapper/`를 추가했다.
- `./android-wrapper/build-apk.sh`는 Android SDK 도구만 사용해 `app.html`과 `cheftory_image/`를 asset으로 포함한 debug APK를 만든다.
- `Pixel_5_API_31` 에뮬레이터에 APK 설치 후 런처 앱 실행으로 홈 화면을 확인했다.
- 실제 WebView에서 원격 썸네일 실패 시 카드가 검게 남는 결함을 발견했고, 로컬 이미지 폴백을 `app.html`에 추가했다.
- 검증 스크린샷: `scripts/ralph/screenshots/emulator-app-home.png`
- 사용자 지시에 따라 에뮬레이터는 기본적으로 꺼둔다. 이후 앱 검증이 필요할 때만 켜서 설치/실행/캡처한다.

## 남은 백로그

- 실제 유튜브 임베드 재생, 구간 seek, 오디오 더킹은 이 HTML 프로토타입 범위 밖이다. 실기기/네이티브 앱에서 별도 검증해야 한다.
- 실제 STT 음성 인식은 연결되어 있지 않다. 현재는 명령 예시와 시뮬레이션 UI다.
- 상세 화면은 대표 순두부 레시피에 고정되어 있다. 다중 레시피 상세 데이터 모델은 후속 구현 대상이다.

## 산출물

- 감사: `docs/AUDIT_ko.md`
- fan-out: `docs/progress/FANOUT_ROUND_1_ko.md`
- 진행: `docs/progress/REPORT_ko.md`, `docs/progress/ACTIVITY_LOG_ko.md`, `scripts/ralph/progress.txt`
- 최종: `docs/FINAL_REPORT_ko.md`
- 앱 래퍼: `android-wrapper/`
