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

### OPS-C3 와이어프레임 결함 보정 검증 · 2026-07-01 03:13

#### 무엇을
- 홈/요리북/레시피 등록/핸즈프리 조리 화면의 최근 보정이 dead UI, 중복 ID, 콘솔 경고 없이 유지되는지 확인했다.

#### 어떻게
- `app.html`의 홈 브랜드 락업, 개인화 추천, 외부 영상 소스 테스트 케이스, 요리북 탭 카피, cook3 터치 스와이프 fallback 보정 상태를 기준으로 정적/DOM 검증을 다시 돌렸다.
- 기존 `127.0.0.1:8899` 정적 서버를 재사용하고 Chrome headless `--dump-dom`으로 주요 해시 화면의 active view를 대조했다.

#### 확인
- 인라인 `<script>` 추출 `node --check` 통과.
- `console.error|console.warn` grep 결과 없음.
- 중복 ID 0, `onclick` 함수 누락 0, `getElementById` 대상 누락 0.
- Chrome headless 라우팅: `#home → home`, `#cook → cook`, `#cook2 → cook2`, `#cook3 → cook3`.

#### 다음
- 사람-눈 실브라우저 클릭 확인은 리뷰어가 수행해야 한다. 이번 확인은 headless 정적/DOM/브라우저 로드 범위까지 수행했다.

### MVP-10 조리 과정 블랙·화이트 컬러 변형 · 2026-07-01

#### 무엇을
- 사용자 피드백에 따라 조리 과정 화면 `cook3`만 블랙 배경을 유지하고, 주력 액센트를 오렌지에서 화이트 중심으로 바꿨다.
- 비교용 보조 버전으로 `허브`, `스틸`, `크림` 액센트 칩을 추가했다.

#### 어떻게
- `#cook3` 전용 CSS 변수(`--cook-bg`, `--cook-accent` 등)를 추가해 홈/상세/요리북 전역 색상과 분리했다.
- 조리 진행바, 단계 카드, 단계 번호, 스와이프 힌트, 타이머, 핸즈프리 버튼은 `setCookTone()`으로 선택한 조리 전용 액센트만 반영한다.
- 이번 요구는 `docs/MVP_WIREFRAME_STORIES_ko.md`의 `MVP-10` 스토리로 별도 등록했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome `#cook3` 검증 통과: 4개 색상 칩(`화이트`, `허브`, `스틸`, `크림`) 클릭 시 `data-cook-tone` 전환, 콘솔 에러 0.
- 스와이프 힌트가 단계 카드와 겹치던 결함을 발견해 힌트를 별도 고정 행으로 분리했고, 재검증에서 `hintOverlapsCard:false` 확인.
- 스크린샷: `scripts/ralph/screenshots/mvp10-cook3-white-clean.png`, `scripts/ralph/screenshots/mvp10-cook3-tones-white-fixed.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱 탭 이동으로 `cook3` 진입 스크린샷 저장: `scripts/ralph/screenshots/emulator-mvp10-cook3-white.png`.

### MVP-11 라이트 일반 화면·3탭 내비게이션 · 2026-07-01

#### 무엇을
- 조리 화면은 다크 모드로 유지하고, 일반 앱 화면은 라이트 모드로 전환했다.
- 하단 내비게이션을 `홈 / 등록 / 요리북` 3개로 정리했다.
- 설정은 하단 탭에서 제거하고 홈 상단 계정 아이콘 진입점만 남겼다.

#### 어떻게
- 전역 색 토큰(`--bg`, `--surface`, `--ink`, `--line`)을 라이트 앱 기준으로 변경했다.
- `.view.dark`와 `cook3` 전용 토큰은 다크 값을 유지하도록 분리했다.
- 조리 관련 재료/타이머/음성 가이드 시트는 다크 변수를 다시 주입해 조리 흐름과 톤이 섞이지 않게 했다.
- 홈/요리북 하단 탭 HTML을 3개 버튼으로 정리하고, 기존 플로팅 등록 버튼은 숨김 상태로 유지했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome 홈 검증 통과: 배경 `rgb(255, 248, 240)`, 하단 탭 `홈/등록/요리북`, 하단 `settings` 탭 없음, 계정 버튼 `appTab('settings')` 유지.
- headless Chrome 요리북 검증 통과: 라이트 배경, 하단 탭 3개, `요리북` 활성.
- headless Chrome 상세/완료 검증 통과: 상세/완료 모두 라이트 배경.
- headless Chrome `cook3` 검증 통과: 배경 `rgb(5, 5, 5)`, 활성 단계 카드 `rgb(17, 17, 17)`, 하단 내비게이션 없음.
- 스크린샷: `scripts/ralph/screenshots/mvp11-home-light-tabs.png`, `mvp11-cookbook-light-tabs.png`, `mvp11-detail-light.png`, `mvp11-complete-light.png`, `mvp11-cook3-dark-kept.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱에서 홈 라이트/3탭과 조리 다크 화면 캡처 저장: `emulator-mvp11-home-light-tabs-wait.png`, `emulator-mvp11-cook3-dark.png`.

### MVP-12 레시피 등록 링크 단일 입력 · 2026-07-01

#### 무엇을
- 레시피 등록 시트에서 YouTube/Shorts/Instagram 및 제작자 유형을 사용자가 고르는 버튼을 제거했다.
- 사용자는 영상 링크만 붙여넣고 `입력 완료`를 누르면 된다.

#### 어떻게
- `.source-cases` / `.source-case` UI 블록을 제거하고, 링크 자동 감지 안내 문구만 남겼다.
- `recipeUrl` 입력에 `oninput="updateImportPreviewFromUrl()"`를 연결했다.
- 입력 URL을 기준으로 내부 미리보기 데이터만 자동 전환하도록 `detectSourceCase()`와 `updateImportPreviewFromUrl()`를 추가했다.
- 기존 테스트 케이스 데이터는 사용자 입력 UI가 아니라 자동 감지/검증용 내부 데이터로만 유지했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome 등록 시트 검증 통과: `.source-case` / `.source-cases` 0개, 링크 입력 유지, 자동 감지 안내 문구 표시.
- URL 입력 후 미리보기 자동 전환 확인: YouTube Shorts 링크 입력 시 `다이어터 레시피 · YouTube Shorts`로 메타 갱신.
- 스크린샷: `scripts/ralph/screenshots/mvp12-register-link-only.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱 등록 시트 스크린샷 저장: `scripts/ralph/screenshots/emulator-mvp12-register-link-only.png`.

### MVP-13 눈 편한 색상 테마 선택 · 2026-07-01

#### 무엇을
- 라이트 화면의 밝기와 오렌지 채도를 낮춰 기본값을 더 편안하게 조정했다.
- 홈 상단 계정 버튼에서 `화면 색상` 시트를 열어 색상 테마를 직접 바꿔볼 수 있게 했다.

#### 어떻게
- 전역 라이트 팔레트 기본값을 `편안` 톤으로 낮췄다.
- `body[data-app-theme]` 기반으로 `따뜻`, `세이지`, `차분` 테마 변수를 추가했다.
- `themeSheet`를 추가하고, `setAppTheme()` / `applyThemeState()` / `openThemeSheet()` 흐름을 연결했다.
- 선택한 테마는 `localStorage.cookAppTheme`에 저장한다.
- 조리 화면은 `cook3` 전용 다크 변수와 `.view.dark` 분리 규칙을 유지했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome 검증 통과: 홈 계정 버튼 흐름으로 `themeSheet` 열림, 4개 테마(`편안`, `따뜻`, `세이지`, `차분`) 클릭 시 `body[data-app-theme]`와 전역 배경/액센트 값 변경.
- headless Chrome 조리 화면 검증 통과: 테마 기능 추가 후에도 `cook3` 배경 `rgb(5, 5, 5)`, 단계 카드 `rgb(17, 17, 17)`로 다크 유지.
- 스크린샷: `scripts/ralph/screenshots/mvp13-theme-sheet-sage.png`, `scripts/ralph/screenshots/mvp13-cook3-dark-still.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱 색상 시트 스크린샷 저장: `scripts/ralph/screenshots/emulator-mvp13-theme-sheet.png`.

### MVP-14 iOS 시계형 하단 탭바 · 2026-07-01

#### 무엇을
- 홈/요리북 하단 탭바를 `Timers.png` 기준의 iPhone 시계 앱 하단 탭바처럼 떠 있는 캡슐 형태로 변경했다.
- 순검정 OS 위젯처럼 보이지 않도록 앱의 따뜻한 잉크톤과 낮은 그림자 강도로 조정했다.
- 가운데 `등록` 탭의 그라데이션/돌출 강조를 제거하고, 활성 탭만 내부 캡슐로 강조되게 했다.

#### 어떻게
- `.bottom-tabs`를 하단 inset이 있는 따뜻한 잉크톤 반투명 캡슐, 38px radius, 3등분 그리드로 재구성했다.
- 각 탭은 아이콘 위/라벨 아래 구조를 유지하고, 비활성은 부드러운 흰색 계열, 활성 탭은 앱 오렌지 계열과 더 밝은 내부 캡슐로 표시한다.
- 높이와 그림자 강도를 낮춰 홈/요리북 카드 위에서 과하게 분리되어 보이지 않게 했다.
- `홈 / 등록 / 요리북` 탭 구성과 기존 클릭 액션은 유지했다.
- 변경 요구를 `docs/MVP_WIREFRAME_STORIES_ko.md`의 `MVP-14` 스토리로 등록했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome 홈/요리북 검증 통과: 하단 탭 3개, 플로팅 캡슐, 따뜻한 어두운 배경, 활성 탭 오렌지+내부 캡슐, 비활성 탭 흰색 계열, `등록` 탭 별도 그라데이션 제거.
- headless Chrome 클릭 검증 통과: `등록` 클릭 시 등록 시트 열림, `요리북` 클릭 시 `cookbook` 화면 전환, 콘솔 에러 0.
- 스크린샷: `scripts/ralph/screenshots/mvp14-integrated-tabs-home.png`, `mvp14-integrated-tabs-cookbook.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱 홈 캡처 저장: `scripts/ralph/screenshots/emulator-mvp14-integrated-tabs-home.png`.

### MVP-15 실제 영상 링크 기반 단계별 구간 바인딩 · 2026-07-02

#### 무엇을
- 등록 시트에 붙여넣은 실제 YouTube/Shorts/Instagram 링크가 상세 화면과 cook3 조리 단계까지 이어지도록 연결했다.
- 기존에는 등록 미리보기만 바뀌고 상세/조리 단계는 고정 순두부 데이터였기 때문에, `activeRecipe`를 기준으로 앱 전체가 같은 레시피 데이터를 보게 바꿨다.
- 앱 전체 디자인시스템 통일성 기준으로 등록/상세/조리에서 `썸네일`, `플랫폼 배지`, `단계 수`, `재료 수`, `원본 구간` 표현을 같은 구조로 맞췄다.

#### 어떻게
- `parseYouTubeId()`를 추가해 `youtu.be`, `youtube.com/watch?v=`, `youtube.com/shorts/` 링크에서 실제 video id를 파싱한다.
- `recipeFromSource()` / `setActiveRecipe()` 구조를 추가해 링크 입력값을 활성 레시피로 만들고, 제목/요약/재료/단계/썸네일/플랫폼/후기 대상을 동적으로 렌더링한다.
- cook3 캐러셀은 현재 단계가 바뀔 때 `cook3Video.dataset.clip`과 `cook3Video.dataset.url`을 같이 갱신한다.
- YouTube는 실제 썸네일 URL과 단계별 `?t=` 구간 URL을 만들고, Instagram은 직접 재생을 단정하지 않는 정적 미리보기/원본 확인 상태를 유지한다.
- 영상 영역 클릭 토스트는 “실제 재생 중”을 말하지 않고, 원본 링크가 연결돼 있다는 상태만 알려준다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- headless Chrome 링크 입력 흐름 검증 통과: Shorts 링크 입력 후 등록 미리보기 `아보카도 비빔밥 쇼츠 따라 만들기`, 썸네일 `https://i.ytimg.com/vi/eJekYxjFewM/mqdefault.jpg`.
- 상세 화면 검증 통과: `YouTube Shorts`, `4단계`, `재료 6개`, 단계 시간 `0:00 ~ 0:08`부터 `0:28 ~ 0:40`까지 반영.
- cook3 단계 검증 통과: 1단계 `0:00 ~ 0:08`에서 2단계 `0:08 ~ 0:18`로 이동할 때 영상 구간 라벨이 함께 변경.
- cook3 단계 URL 검증 통과: 1단계 `https://youtu.be/eJekYxjFewM`, 2단계 `https://youtu.be/eJekYxjFewM?t=8`로 변경.
- Instagram 적대 케이스 검증 통과: `Instagram Reels`, `검토 필요`, `수동 확인`으로 표시하고 직접 재생을 단정하지 않음.
- 시트가 열린 상태의 토스트가 `입력 완료` CTA를 가리지 않도록 상단 알림 위치로 분리했고, DOM 좌표 검증에서 `toastOverlapsButton:false` 확인.
- 콘솔 에러 0.
- 스크린샷: `scripts/ralph/screenshots/mvp15-youtube-step-binding.png`, `mvp15-youtube-step-binding-final.png`, `mvp15-register-instagram-no-overlap.png`.
- `./android-wrapper/build-apk.sh` 통과. `app.html`과 `android-wrapper/src/main/assets/app.html` SHA-256 일치: `a9d4195da905cadfb9aa9076f1ec744bda6cda57470b7dde13f0831a44b43c52`.
- APK SHA-256: `3b8f7ad753ff0473fc7f7e85d85c0b40e3246a3c902f72ea7bf4706a122706a7`.
- Android Emulator `emulator-5554`에 최신 APK 설치 후 `com.cook.wireframe/.MainActivity` 실행 확인. 실제 앱 홈 캡처 저장: `scripts/ralph/screenshots/emulator-mvp15-app-home.png`.

#### Ralph loop
- 사용자 요청에 따라 `./scripts/ralph/supervise.sh 100 100` 실행.
- `scripts/ralph/session_logs` 기준 2026-07-02 02시대 iteration 로그 116개 생성 확인.
- 중첩 `codex exec`가 모든 iteration에서 `failed to initialize in-process app-server client: Operation not permitted`로 실패해 PRD false 스토리 자동 완료는 진행되지 않았다.
- 동일 실패가 100회 이상 반복된 뒤 추가 배치는 결과 없이 로그만 늘릴 상태라 supervisor를 수동 중단했다.
- 이번 `MVP-15` 구현/검증은 현재 세션에서 직접 green-gate로 완료했다.
- 이후 남은 `MVP-06`, `MVP-07`을 현재 세션에서 직접 CDP/문서 검증으로 완료 처리했다.
- `./scripts/ralph/validate-prd.sh scripts/ralph/prd.json` 결과: 모든 스토리 `passes:true`.
- `./scripts/ralph/supervise.sh 100 100` 재실행 결과: `ALL DONE`.
- 원인 확인: 현재 셸 환경은 `CODEX_SANDBOX=seatbelt`, `CODEX_SANDBOX_NETWORK_DISABLED=1`이며, 이 안에서 `codex exec`를 다시 띄우면 app-server 초기화 권한 오류가 난다.
- 반증 확인: 같은 최소 `codex exec` 명령을 샌드박스 밖 권한으로 실행하면 정상 응답했다. 따라서 인증/CLI 설치 문제가 아니라 중첩 실행 샌드박스 권한 문제다.
- 재발 방지: `scripts/ralph/supervise.sh`에 해당 app-server 권한 오류 로그를 감지하면 반복 배치를 중단하고 활동 로그에 원인을 남기는 가드를 추가했다.

### MVP-06/07 잔여 스토리 정리 · 2026-07-02

#### 무엇을
- Ralph 중첩 실행이 권한 문제로 처리하지 못한 `MVP-06 버튼별 클릭 매트릭스 검증`, `MVP-07 외부 영상 소스 테스트 케이스 정리`를 현재 세션에서 직접 완료했다.

#### 확인
- `MVP-06`: CDP 버튼 매트릭스 3묶음, 총 32개 주요 표시 버튼 클릭, 실패 0, 콘솔 에러 0.
- `MVP-06` 스크린샷: `mvp06-button-matrix-a.png`, `mvp06-button-matrix-b.png`, `mvp06-button-matrix-c.png`.
- `MVP-07`: `SOURCE_CASES`/`RECIPE_PRESETS`로 YouTube 긴 영상, YouTube Shorts, Instagram Reels, 전문 요리사, 일반 사용자 케이스 분리.
- `MVP-07`: 링크 입력값 자동 감지, 등록 시트 분석 상태, 상세/cook3 단계 구간, Instagram 정직 표기 확인.
- PRD 미완료 0.

### BETA-RECIPES Maangchi 레시피 4종 통합 · 2026-07-05

#### 무엇을
- `docs/RECIPES_CANDIDATES.js`의 후보 4종(김치볶음밥·계란말이·된장찌개·제육볶음)을 실제 YouTube 영상 ID와 단계 구간으로 채워 `app.html`의 `RECIPES`에 통합했다.
- 홈 인기 목록(`popIds`)에는 4개 모두, 빠른 추천(`recIds`)에는 김치볶음밥·계란말이를 등록했다.
- 후보 문서(`RECIPES_CANDIDATES_ko.md/html`)를 TODO 초안에서 완료 기록으로 갱신했다.

#### 어떻게
- Maangchi 공식 레시피 페이지와 YouTube watch HTML을 대조해 4개 영상의 `playabilityStatus=OK`, `embed.iframeUrl`, 제목/채널/길이를 확인했다.
- `youtube-transcript-api`를 임시 venv(`/private/tmp`)에 설치해 영어 transcript 타임코드를 가져오고, 공식 레시피 directions와 맞춰 각 step의 `time`/`start`/`end`를 산출했다.
- 원문 transcript JSON은 repo에 넣지 않고 `/private/tmp`에서만 처리했다.

#### 확인
- `<script>` 추출 `node --check` 통과.
- `git diff --check` 통과.
- 새 영상 ID 4개가 `app.html`과 후보 문서에 반영됐고 이전 영상 placeholder 표기 잔존 없음.
- Chrome headless CDP 검증 통과: 홈 `popIds`에 4개 모두 노출, 추천 `recIds`에 김치볶음밥·계란말이 노출, `#detail=Lf44Fk7H24s` 상세 5단계/YouTube iframe 확인, `cook3` 김치볶음밥 5단계+완료카드 확인.
- 앱 예외/console.error 0, lucide 미지원 아이콘 경고 0. 검증 중 기존 `youtube`/`hand-pointer` 미지원 아이콘을 `video`/`hand`로 보정하고 favicon 자동 404 방지를 위해 data favicon을 추가했다.
- 스크린샷: `scripts/ralph/screenshots/beta-recipes-home.png`, `beta-recipes-detail-kimchi.png`, `beta-recipes-cook3-kimchi.png`.
