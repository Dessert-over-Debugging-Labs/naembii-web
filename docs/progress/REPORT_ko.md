# cook 와이어프레임 — 진행 리포트 (한국어)

> Ralph가 스토리마다 append. HANDOFF_ko.md 참조.

## 진행 로그

### W0-1 감사 — app.html 화면 인벤토리·라우팅·상태 + 상속 자료 갭 분석 · 2026-06-29

#### 무엇을
- `app.html`의 7개 view(`home`, `loading`, `detail`, `reviews`, `cook3`, `cook`, `cook2`, `complete`)와 5개 오버레이/시트 구조를 인벤토리화했다.
- `nav`, `show`, `applyHash`의 3중 라우팅 동기 규칙과 cook3/vpanel, 소셜 localStorage 구조를 문서화했다.
- 상속 자료(UI_FEEDBACK, FANOUT, FINAL_REPORT, v3_2 레퍼런스) 기준으로 갭을 정리했다.

#### 어떻게
- `docs/AUDIT_ko.md`를 신규 작성해 화면별 역할, 진입점, 상태 훅, 후속 보정 후보를 표로 남겼다.
- W0에서 발견한 결함 후보를 PRD 후속 스토리 `FIX-W0-1`~`FIX-W0-4`로 추가했다.
- `W0-1`은 `passes:true`로 갱신하고 감사 메모를 PRD notes에 남겼다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- 시스템 Chrome 헤드리스 `app.html#cook3` 스크린샷 생성: `scripts/ralph/screenshots/W0-1-cook3.png`.
- 앱 JS 오류 패턴(`Uncaught`, `ReferenceError`, `TypeError`) 없음. Chrome 자체 GPU/업데이터 로그는 앱 콘솔 오류가 아니므로 별도 노이즈로 기록.

#### 다음
- 다음 최저 priority 미완료 스토리는 `W1-1` 글로벌 디자인 토큰/타이포/여백 정합이다.

### W1/W2 통합 UI·동작 보정 — 2026-06-29

#### 무엇을
- `W1-1`~`W1-9`, `W2-1`, `W2-2`, `FIX-W0-1`~`FIX-W0-4`를 화면별 세부 기준에 맞춰 반영했다.
- 홈, 링크 입력, 상세/리뷰, cook3, 완료 화면을 전면 다크 토큰과 모바일 터치 기준으로 정리했다.

#### 어떻게
- 전역 토큰을 `#0A0A0A`, `#161616`, `#242424`, `#F0EBE3`, `#4ADE80` 중심으로 통일했다.
- 홈 카테고리, 섹션 전체, 프로필, 검색, 영상 썸네일처럼 탭 가능해 보이는 요소를 실제 안내/이동으로 연결했다.
- 상세 CTA와 `#voice` 라우팅을 주력 `cook3` 기준으로 고쳤고, cook3 하단에 이전/다음 단계 버튼을 추가했다.
- 상세/cook3 영상은 `정적 미리보기`와 `실제 재생은 실기기에서 확인` 문구로 정직하게 표시했다.
- 별점, 닫기, 카드, 아이콘 버튼에 aria-label/role/키보드 활성화/48px 터치 기준을 보강했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- 시스템 Chrome 헤드리스 스크린샷 생성: `W1-home.png`, `W1-detail.png`, `W1-cook3.png`, `W2-complete.png`, `W2-reviews.png`.
- 사용자 노출 카피 스캔에서 `STEP/Mic/off/YouTube/쉐프/.../emoji` 누수 제거. 앱 JS 오류 패턴 0.
- Chrome headless의 GPU/프로필 로그는 앱 콘솔 오류가 아닌 실행환경 노이즈로 분리 기록.

#### 다음
- `W3-1` 적대적 fan-out 검증으로 잔여 결함을 확인한다.

### W3-1 fan-out 적대적 검증 라운드 + 보정 · 2026-06-29

#### 무엇을
- 다크 디자인, 모든 버튼, 핸즈프리/영상 정직성, 한국어/접근성 렌즈로 병렬 적대적 검증을 수행했다.

#### 어떻게
- 확정 발견점은 `docs/progress/FANOUT_ROUND_1_ko.md`에 정리했다.
- cook3 자동 데모 단계 전진 제거, 수동 이동 문구 정직화, 오버레이 정리, 입력 필드 실제화, 완료 소셜 흐름, 48px 터치 타깃, 별점 접근성, 구버전 조리 화면 aria/영상 안내를 즉시 보정했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- Chrome headless 스크린샷: `W3-1-cook3-fixed.png`, `W3-1-complete-fixed.png`, `W3-1-sheet-fixed.png`.
- 앱 JS 오류 패턴 0. Chrome 자체 GPU/프로필 로그는 앱 오류가 아닌 실행환경 노이즈로 분리.

#### 다음
- `W3-2` 전 화면 E2E 스크린샷과 `docs/FINAL_REPORT_ko.md` 작성.

### W3-2 통합 E2E + 한글 최종 리포트 · 2026-06-29

#### 무엇을
- 사이드바 기준 10개 진입점 전 화면을 headless Chrome으로 캡처했다.
- `docs/FINAL_REPORT_ko.md`를 작성했다.

#### 어떻게
- `home`, `sheet`, `loading`, `detail`, `cook3`, `cook`, `cook2`, `voice`, `complete`, `reviews` 해시로 직접 진입해 스크린샷을 생성했다.
- PRD의 마지막 `W3-2`를 완료 처리했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- `scripts/ralph/screenshots/W3-2-*.png` 10장 생성.
- Chrome 로그 앱 오류 패턴(`Uncaught`, `ReferenceError`, `TypeError`, `SyntaxError`, `ERR_FILE_NOT_FOUND`) 0.

#### 다음
- PRD 전 스토리 완료.

### MVP 와이어프레임 정리 라운드 · 2026-07-01

#### 무엇을
- 최신 대화 요구를 별도 파일 `docs/MVP_WIREFRAME_STORIES_ko.md`에 저장했다.
- 상세 CTA, 조리 모드, 완료 화면, 팁 남기기 화면, 최근 만든 요리 카피를 MVP 기준으로 정리했다.
- Figma MCP 와이어프레임 제작과 Notion 또는 Excel 기술명세서 제작은 후속 TODO로 등록했다.

#### 어떻게
- 상세 `요리 시작하기`는 하단 직사각형 배경을 없애고 실제 플로팅 버튼만 남겼다.
- cook3 하단에서 이전/다음 버튼을 제거하고 `요리 완성` 버튼을 추가했다. 단계 이동은 단계 카드 스와이프/휠/키보드 흐름으로 유지했다.
- 완료 화면은 완성 결과를 먼저 보여주고, `팁 남기기`, `후기 남기기`, `공유`, `홈으로`를 각각 하나의 액션으로 분리했다.
- `다른 사용자를 위한 팁 남기기` 화면을 추가했다.
- `최근 만든 요리`에서 `0회 터치`, `성공`, `다시 만들기`처럼 의미가 섞인 카피를 제거하고 `완성 기록`, `팁 남김`, `재조리 후보`, `소금 줄이기`처럼 만든 요리의 근거를 보여줬다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- `scripts/ralph/validate-prd.sh scripts/ralph/prd.json` 통과.
- Chrome CDP 스크린샷 생성: `mvp-detail-cta.png`, `mvp-cook3-complete.png`, `mvp-complete.png`, `mvp-tip-write.png`.
- 핵심 버튼 8개 클릭 매트릭스 통과: `docs/progress/BUTTON_MATRIX_MVP_ko.md`.

#### 다음
- Ralph 다음 스토리는 `MVP-06` 전체 버튼 클릭 매트릭스 검증이다.
- 그 다음 `MVP-07`에서 실제 외부 영상 소스 테스트 케이스(YouTube 긴 영상/짧은 영상, Instagram, 전문 요리사/일반 사용자)를 정리한다.

### MVP-09 요리북 세부 페이지 분리 · 2026-07-01

#### 무엇을
- 홈에서 최근 조리/저장 레시피 영역을 제거했다.
- 하단 `요리북` 탭을 별도 `cookbook` 페이지로 연결했다.

#### 어떻게
- 홈은 영상 등록, 검색, 카테고리, 인기 레시피, 오늘의 추천 중심으로 유지했다.
- `cookbook` view를 추가해 최근 조리, 저장한 레시피, 기록 기반 추천, 기록 메모를 보여준다.
- 사이드바, `nav()`, `show()`, `appTab()`, `applyHash()` 라우팅에 `cookbook`을 추가했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- Chrome CDP 스크린샷: `mvp-home-no-cooked.png`, `mvp-cookbook-page.png`.
- `#cookbook` 콘솔 에러 0.

#### 다음
- `MVP-06` 전체 버튼 클릭 매트릭스 검증을 이어간다.

### 후속 앱 형태 검증 — Android WebView APK 래퍼 · 2026-06-30

#### 무엇을
- 브라우저 Chrome이 아니라 런처 앱 형태로 `app.html`을 띄우기 위해 `android-wrapper/`를 추가했다.
- Android SDK만으로 빌드 가능한 최소 WebView APK 경로를 만들었다.

#### 어떻게
- `android-wrapper/build-apk.sh`가 `app.html`과 `cheftory_image/`를 Android asset으로 복사하고 `aapt`/`javac`/`d8`/`zipalign`/`apksigner` 순서로 debug APK를 만든다.
- `MainActivity`는 `file:///android_asset/app.html#home`을 전체 화면 WebView로 로드한다.
- Android의 암묵 권한 화면을 막기 위해 `minSdkVersion=23`, `targetSdkVersion=34`를 manifest에 명시했다.
- 실제 앱 실행에서 원격 유튜브 썸네일 실패 시 홈 카드가 검게 남는 결함을 발견해, 로컬 `cheftory_image` 폴백으로 보정했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- `./android-wrapper/build-apk.sh` 빌드 및 APK 서명 검증 통과.
- Android Emulator `Pixel_5_API_31`에 설치 후 런처 앱 형태로 홈 화면 렌더링 확인: `scripts/ralph/screenshots/emulator-app-home.png`.
- 사용자 지시에 따라 에뮬레이터는 검증 후 종료했고, 이후 기본 상태는 꺼둔 상태로 둔다.

#### 다음
- 다음 실제 앱 검증이 필요할 때만 에뮬레이터를 켜서 APK 설치/실행/캡처를 다시 수행한다.

### OPS-C1 와이어프레임 home→cook3 흐름 검증 · 2026-07-01 02:49

#### 무엇을
- `app.html`의 홈에서 레시피 상세를 거쳐 주력 조리 모드 `cook3`까지 실제 브라우저 클릭 흐름으로 확인했다.
- `cook3` 캐러셀 이동과 `#home`, `#cook`, `#cook2`, `#cook3` 해시 라우팅을 함께 점검했다.

#### 어떻게
- `python3 -m http.server 8899 --bind 127.0.0.1 --directory /Users/osein/cook-assistance-wireframe`로 정적 서버를 띄웠다.
- 인라인 `<script>`를 `/private/tmp/cookflow-wireframe-inline.js`로 추출해 `node --check`를 실행했다.
- Chrome headless + CDP로 첫 홈 카드 클릭, 상세 CTA 클릭, `ArrowDown` 키 입력, 해시 라우팅을 검증했다.
- 콘솔 경고를 없애기 위해 Lucide 미지원 `youtube` 아이콘을 `play`로 바꾸고, `/favicon.ico` 404 방지를 위해 data favicon을 추가했다.

#### 확인
- `node --check /private/tmp/cookflow-wireframe-inline.js` 통과.
- 중복 ID 0개, `onclick` 호출 함수 누락 0개, `getElementById` 대상 누락 0개.
- `rg "console.error|console.warn" app.html` 결과 없음.
- CDP 결과: `home → detail → cook3`, 캐러셀 `0 → 1`, 해시 라우팅 `home/cook/cook2/cook3` 모두 통과, `consoleIssues: []`.
- 스크린샷: `/private/tmp/OPS-C1-cook3.png`.

#### 다음
- 사람-눈 실브라우저 클릭 확인은 리뷰어가 수행해야 한다. 이번 검증은 headless 정적/DOM/브라우저 CDP 범위까지 수행했다.
