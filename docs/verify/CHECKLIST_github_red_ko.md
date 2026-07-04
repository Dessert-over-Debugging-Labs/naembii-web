# app_ref_red.html 그라운드-트루스 체크리스트 (Figma 이식 채점용 · GitHub RED 버전)

> 출처(단일 파일): `/Users/osein/cook-assistance-wireframe/docs/verify/reference_red/app_ref_red.html`
> GitHub origin/main 을 강제 세팅한 버전: **테마=tomato(RED)** `data-theme="tomato"`, **배경 틴트 OFF** `data-tint="off"`, **라이트 모드**(`data-mode` 제거), DEV 오버레이 토글(theme-bar·tint·sound·mode·dev-timer) **DOM에서 제거**(app_ref_red.html:2032~2043 강제 스크립트). → 이 토글들은 제품 요소가 아니므로 채점 대상에서 제외.
> 원칙: 모든 라벨은 소스에서 **그대로 인용**. `[동적]` = JS가 주입/치환(정적 마크업에 없음). 팔레트는 `:root` + `:root[data-theme="tomato"]` 실측값.

## 팔레트/모드 (전역 기준)

### RED 브랜드 토큰 (`:root[data-theme="tomato"]`, app_ref_red.html:40)
- `--brand:#EF5A3C` (Primary) · `--brand-l:#F5836B` · `--brand-strong:#C7402A` · `--brand-soft:#FDEBE6` · `--brand-deep:#B23A26` · `--brand-rgb:239,90,60`
- 하위호환 별칭: `--green:var(--brand)`, `--green-l:var(--brand-l)`, `--green-soft:var(--brand-soft)` → 코드의 모든 `--green*` 사용처가 **RED**로 렌더됨(초록 아님).

### 뉴트럴/배경 (라이트 + 틴트 OFF)
- `--bg:#F5F5F7` (틴트 OFF, app_ref_red.html:46) · `--surface:#ffffff` · `--surface-2:#EBEDEF` · `--border:#ECECEE` · `--text:#1A1A1C` · `--text-sub:#6E6E73` · `--gray2:#C7C7CC`
- 조리 화면 표면 별칭: `--dark:var(--bg)`(=#F5F5F7), `--dark2:var(--surface)`(=#fff), `--dark3:var(--surface-2)`(=#EBEDEF)

### ⚠ "다크" 조리 화면이 이 상태에선 실제로 라이트로 렌더됨
- `cook`·`cook2`·`cook3`은 `class="view dark"`지만 `.view.dark{background:var(--dark)}` → `--dark=var(--bg)=#F5F5F7`. **다크 배경은 하드코딩이 아니라 `data-mode="dark"`에서만 반전**되는데, 강제 세팅은 라이트라 조리 3화면 배경은 **#F5F5F7(라이트)**, 카드 표면 `--surface=#fff`, 텍스트는 `--text=#1A1A1C`. `.statusbar.dark`/`.nav.dark`도 라이트에선 어두운 글자.
- 예외: 영상 블록 `.cook-video`는 항상 `background:#000`.
- **결론: 강제 세팅(라이트+틴트OFF)에서 다크모드 전용 화면은 없다.** (로컬 체크리스트가 cook3=#050505 / cook·cook2=#120F0C 로 본 것과 다름 — 그 토큰들은 이 파일에 존재하지 않음.)

---

## home
### 핵심 구조 (top→bottom, app_ref_red.html:801~823)
- 상태바 (`.statusbar`) — `9:41` + signal/wifi/battery-full
- 헤더 (`.nav`) — 로고 락업 `chef-hat + cook` / 우측 알림 뱃지(`.noti` bell `268`) + 프로필 아이콘(`circle-user-round`)
- 본문 (`.body`)
  - 검색바 (`.search`)
  - 카테고리 원형칩 스크롤 (`.cats`) — **7개**
  - 섹션 `나의 레시피` + 그리드 `#gridMine` [동적]
  - 섹션 `인기 레시피` + 가로스크롤 `#popScroll` [동적]
  - 섹션 `오늘의 추천` + 가로스크롤 `#recScroll` [동적]
- **FAB** (`.fab`, plus 아이콘) — **표시됨**(display:flex, 숨김 아님)
- (하단 탭바 없음 · 퀵임포트 카드 없음 · 헤드라인 문구 없음)

### 핵심 한글 라벨 (verbatim)
- 로고: `cook` (chef-hat 아이콘)
- 알림 뱃지 숫자: `268`
- 검색바: `먹고 싶은 요리를 검색해보세요`
- 카테고리 7: `쉐프` `급상승` `한식` `분식` `일식` `양식` `디저트`
- 섹션 제목: `나의 레시피` · `인기 레시피` · `오늘의 추천`, 각 우측 `전체`
- 카드 [동적, `RECIPES` 배열 app_ref_red.html:1335~1342, `cardHTML`]:
  - `순두부찌개` / `백종원 · 2인분` / 뱃지 `30분`
  - `감바스 알 아히요` / `성시경 · 2인분` / `25분`
  - `아보카도 비빔밥` / `유튜브 쇼츠 · 1인분` / `15분`
  - `까르보나라` / `유튜브 · 2인분` / `40분`
  - `딸기 티라미수` / `쿠킹트리 · 4인분` / `20분`
  - `명란 파스타` / `유튜브 · 1인분` / `10분`

### 버튼/인터랙션 → 목적지
- 카드 `onclick="goDetail()"` → **detail** (항상 순두부에 바인딩; `DVID='21j8SASqLJU'`)
- 카드 저장 버튼 `.savebtn` `toggleLike(event,vid)` → 좋아요 토글(localStorage)
- FAB `openSheet()` → **sheet**(바텀시트)
- **의미 없는 dead-UI (핸들러 없음, 장식)**: 카테고리칩 7개, 각 섹션 `전체` more, 알림 뱃지 `268`, 프로필 아이콘 — onclick 없음
- **stub(토스트만)**: 검색바 `toast('검색은 프로토타입에서 생략')`

### 팔레트/모드
라이트 · RED. 로고·카테고리 아이콘·FAB·savebtn liked 상태 모두 `--brand`(RED).

---

## detail (레시피 상세, 순두부 바인딩)
### 핵심 구조 (app_ref_red.html:841~896)
- 상태바
- 헤더 (`.nav`) — 뒤로(chevron-left) / 제목 `레시피` / 공유(share-2)
- 본문
  - 영상 히어로 (`.hero`) — 썸네일 img + 재생아이콘(장식) + 플랫폼 뱃지 `YouTube` (**정직 배지 없음**)
  - 상세 본문 (`.detail-body`): 제목+저장버튼(`.dhead`) / 평점 `#detRating` [동적] / 설명 문단(`.dsummary`) / 메타칩3(`.meta`) / 스티키 탭(`.dtabs`) / 재료(주재료·양념) / 레시피 스텝 `#detSteps` [동적] / 후기 영역 / `후기 쓰기` 버튼
- 하단 CTA 바 (`.cta-bar`)

### 핵심 한글 라벨
- 헤더: `레시피`
- 플랫폼 뱃지: `YouTube`
- 제목: `백종원이 알려주는<br>칼칼한 순두부찌개`
- 저장수 `#detLikeN` 초기 마크업 `0` → **[동적]** 시드 후 `342` (`SEED['21j8SASqLJU'].likes=342`, app_ref_red.html:1297)
- 평점 `#detRating` **[동적]** (`renderDetailSocial`; 시드 후기 3개 평균 → `4.7`, `후기 3개`)
- 설명 (`.dsummary`): `고추참치로 감칠맛을 빠르게 잡고, 순두부와 계란을 넣어 몽글몽글하게 끓이는 간단한 순두부찌개예요. 파기름을 먼저 내고 양파와 애호박을 더해 국물 맛을 자연스럽게 채웁니다.`
- 메타칩3: `30분`/`조리시간`, `2인분`/`분량`, `쉬움`/`난이도`
- 탭: `재료` `레시피` `리뷰`
- 재료 라벨: `재료 11개` **(⚠ 라벨은 "11개"지만 실제 정적 항목은 12개)**
  - 주재료 7: `순두부`(1팩) `고추참치`(1캔) `양파`(1/2개) `애호박`(조금) `대파`(조금) `계란`(1개) `팽이버섯`(조금)
  - 양념 5: `식용유`(2숟갈) `고춧가루`(1숟갈) `멸치액젓`(1숟갈) `국간장`(1숟갈) `후추`(조금)
- 레시피 스텝 `#detSteps` **[동적, `steps` 배열 A~G, `renderSteps`]** — 아래 cook3/cook 참조
- 후기 제목 `#detRevTitle` 마크업 `후기` → [동적] `후기 3`
- 후기 요약/목록 `#detSummary`/`#detReviews` **[동적]**
- 전체보기 `#detMore` [동적, 후기 2개 초과 시만 노출] `후기 전체보기 (N)`
- 후기 쓰기 버튼: `후기 쓰기` (연필 아이콘)
- CTA: `요리 시작하기`

### 버튼/인터랙션 → 목적지
- 뒤로 `show('home')` → **home**
- 공유 `toast('공유 링크가 복사되었어요','share-2')` → stub
- 히어로 → 인터랙션 없음(재생아이콘 장식)
- 저장 `toggleLike(event,'21j8SASqLJU')` → 좋아요 토글
- 탭 `detailTab('sec-ing'|'sec-steps'|'detRevTitle')` → 같은 화면 스크롤 이동
- 후기 쓰기 `openReviewSheet()` → 후기 작성 시트
- `#detMore` `show('reviews')` → **reviews** (숨김 기본, 후기>2일 때만)
- **CTA `요리 시작하기` `startCook()` → cook** (⚠ cook3 아님. `startCook`=`cookCar.reset();show('cook');setTimeout(openVoice,600)`, app_ref_red.html:1523)

### 정직성 요소
- 이 버전 detail에는 **정직 배지가 없다** — 히어로는 `img` + 재생아이콘 + `YouTube` 뱃지뿐. (로컬의 `정적 미리보기` 배지·`먼저 만든 사람의 팁` 스트립·추출 요약칩 모두 부재.)

### 팔레트/모드
라이트 · RED. CTA/탭 언더라인/재료 뱃지 = `--brand`(RED). 별점은 `#FFB400`(골드).

---

## cook3 (조리 모드 신, class="dark"이나 강제 라이트)
### 핵심 구조 (app_ref_red.html:910~959)
- 상태바(`.statusbar.dark`)
- 헤더(`.nav.dark`) — 뒤로 / 제목 `조리 모드`(14px) / **설정(settings 아이콘 · `openVideoSettings`)**
- 영상 영역(`.cook-video`): `#cook3Youtube` 마운트(`data-video-id="CgapOjKdo9I"`) + 제스처 레이어(`#videoGesture`: `-10초`/`+10초`/재생 플래시)
- 단계 진행 도트(`.cook-progress`) — **7칸**(첫 칸 `cur`)
- 단계 카드 캐러셀(`.cook-body`>`#cookTrack3`) **[동적, `makeCarousel('cook3',...).build()`]**
- 단계 타이머 배지(`#stageTimer`, 일시정지/취소/`타이머`/`3:00`)
- 스와이프 힌트 오버레이(`#cookHint`)
- 하단 컨트롤(`#cook3Ctrl` > `.ctrl-buttons` 3버튼) ↔ 음성 패널(`#vpanel`) morph
- (⚠ 톤 선택칩 없음 — 로컬의 화이트/허브/스틸/크림 부재)

### 핵심 한글 라벨
- 헤더: `조리 모드`
- 타이머 배지: `타이머` / `3:00`
- 스와이프 힌트 오버레이: `위로 스와이프하세요` / `다음 단계 카드도 터치할 수 있어요` / `다시 보지 않기` / `탭해서 닫기`
- 하단 컨트롤 3: `타이머` / `AI 비서`(bot 아이콘, `#hf3`) / `재료 보기`
- 음성 패널(AI 비서 ON): `#vpUser` 초기 `듣고 있어요`, `#vpAi` [동적, `vpScript`]
- 단계 카드 **[동적, `steps` app_ref_red.html:1446~1454, `build()`]**: 접두 `A.`~`G.` + 배지 `1 / 7`~`7 / 7`
  - `A. 파기름 내기` (`0:08 ~ 0:16`) — 예: `대파를 송송 썰어 준비한다`
  - `B. 고추참치 볶기` (`0:16 ~ 0:22`)
  - `C. 양파 볶기` (`0:22 ~ 0:29`)
  - `D. 순두부와 물 넣기` (`0:29 ~ 0:37`)
  - `E. 애호박 넣기` (`0:38 ~ 0:43`)
  - `F. 간 맞추고 버섯 넣기` (`0:43 ~ 0:50`)
  - `G. 계란과 고명으로 마무리` (`0:50 ~ 0:56`)
  - 마지막 완료 카드(`.sc-finish`, cook3만): `요리 완성`
- 음성 대사 [동적, `vpScript` app_ref_red.html:1852~1857]: `양파 얼마나 익혀야 해?`→`투명해질 때까지 중불에서 2분 정도면 충분해요.` / `다음 단계로 넘어가줘`(next) / `간장 없는데 대체할 거 있어?` / `타이머 3분 맞춰줘`(timer 180)

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- 설정 `openVideoSettings()` → 영상 설정 모달(같은 화면)
- 영상 탭 `onVideoTap(event)` → 재생/일시정지·시크(같은 화면)
- 타이머 `openTimer()` / 재료 `openIngredients()` → 시트
- `AI 비서` `toggleHf3()` → 음성 패널 morph(같은 화면)
- 캐러셀: 스와이프/휠/클릭으로 단계 이동. **마지막(완료 카드)에서 `next()`/클릭 → `finishCook()` → complete**(아래→위 rise-in + 폭죽)
- ⚠ **인앱 진입점 없음**: `startCook()`은 cook으로 감. cook3는 사이드바 `nav('cook3')` / `#cook3` 로만 도달.

### 정직성 요소
- 영상: `file://` 직접 열기 등 비-http 프로토콜에서 정직 폴백(`initCookYoutube`, app_ref_red.html:1947~1951):
  - `로컬 서버로 열면 영상이 재생돼요` / `YouTube 임베드는 파일 직접 열기에서 오류 153이 날 수 있어요.` / 링크 `YouTube에서 보기`
  - http(s)로 서빙되면 실제 YouTube IFrame(`#cook3YoutubePlayer`) 생성 → 진짜 재생(try-real-else-honest).
- ⚠ cook3 영상 id는 `CgapOjKdo9I` (홈/상세 썸네일 `21j8SASqLJU`와 다름).
- 이 버전엔 `정적 미리보기` / `data-clip` 속성 / `재생 중` 캡션 / `음성 인식 시뮬레이션` 라벨이 **모두 없음**(로컬 대비 정직 표기 축소).

### 팔레트/모드
라이트 · RED(강제 세팅). AI 비서 버튼/음성 패널 그라데이션·완료 뱃지·활성 카드 테두리 = `--brand`(RED).

---

## complete (완료)
### 핵심 구조 (app_ref_red.html:1016~1037)
- 상태바 / 완료 뷰(`.done-view`): 배지(party-popper) + 헤드라인 + 설명 + 통계3(`.done-stats`) + 후기 유도(`.done-review`) + 액션 2버튼

### 핵심 한글 라벨
- 헤드라인: `순두부찌개 완성!`
- 설명: `화면 한 번 안 만지고 끝까지 해냈어요.<br>맛있게 드세요 👏`
- 통계3: `30분`/`조리 시간`, `5단계`/`음성 진행`, `0회`/`화면 터치` (⚠ `5단계`는 실제 7단계 레시피와 불일치 — 정적 카피)
- 후기 유도: `이 레시피, 후기를 남겨보세요` (별 5개 장식)
- 액션 버튼: `홈으로` / `다시 요리하기`

### 버튼/인터랙션 → 목적지
- 후기 유도 `openReviewSheet()` → 후기 시트
- `홈으로` `show('home')` → **home**
- `다시 요리하기` `startCook()` → **cook** (⚠ cook3 아님)
- (로컬의 `다른 사용자를 위한 팁 남기기`/팁 카드/공유 버튼 모두 부재)

### 팔레트/모드
라이트 · RED. 배지/통계 아이콘 `--brand-soft`+`--brand`(RED). 진입 시 폭죽(confetti) — RED 포함 다색.

---

## cook (기본 조리 모드 구, class="dark"이나 강제 라이트)
### 핵심 구조 (app_ref_red.html:962~977)
- 상태바(dark) / 헤더(뒤로 / 제목 / 도움말) / 영상(`.cook-video` 정적 썸네일 img) / 진행 도트 **7칸** / 캐러셀(`#cookTrack` [동적]) / 하단 컨트롤 **3버튼**

### 핵심 한글 라벨
- 헤더 제목: `기본 조리 모드`
- 하단 컨트롤3: `타이머` / `핸즈프리 모드`(mic 아이콘) / `재료 보기`
- 단계 카드: cook3와 동일 `steps`(A~G) [동적] — 단, cook에는 완료 카드 없음(`maxIdx=steps.length-1`)

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- 도움말 `openVoice()` → 명령 가이드 모달
- 타이머 `openTimer()` / 핸즈프리 `toggleHandsfree()` / 재료 `openIngredients()` → 시트/토글(같은 화면)
- 캐러셀 **마지막 단계 `next()` → `show('complete')` → complete**
- ★ **인앱 주 진입점**: `startCook()`(detail CTA·complete 다시 요리하기)이 cook으로 옴 + 진입 0.6초 뒤 `openVoice()` 자동. (로컬과 반대: 로컬은 startCook→cook3, cook은 레거시였음)

### 팔레트/모드
라이트 · RED(강제). 영상 블록만 `#000`.

---

## cook2 (핸즈프리 모드 구, 정적 스냅샷, class="dark"이나 강제 라이트)
### 핵심 구조 (app_ref_red.html:980~1013)
- 상태바(dark) / 헤더(뒤로 / 제목 / 도움말) / 영상(정적 썸네일) / 진행 도트 7칸(2 done, 1 cur) / **정적** 단계 카드1(`.scard.active.static`) / 듣기 바(`.hf-listen`) / 채팅(`.hf-chat`) — 전부 정적 마크업

### 핵심 한글 라벨 (전부 정적)
- 헤더 제목: `핸즈프리 모드`
- 단계 카드: `C. 양파 볶기`, 배지 `3 / 7`, 서브 `양파 반 개를 깍둑썰기해 넣는다` / `양파가 투명해질 때까지 충분히 볶는다`
- 듣기 바: `듣고 있어요…`, 타이머 `2:45`
- 채팅 버블:
  - AI `핸즈프리 모드예요. 궁금한 건 편하게 말씀하세요.`
  - user `다음 단계로 가줘`
  - AI `D단계, 순두부와 물 넣기로 넘어갈게요. 순두부를 넣고 참치캔 한 캔 분량의 물을 부어주세요.`
  - user `간장 없는데 대체할 수 있는 거 있나?`
  - AI `국간장이 없으면 멸치액젓을 조금 더 넣거나 소금으로 간을 맞춰도 돼요. 한 번에 많이 넣지 말고 조금씩 맞춰보세요.`
  - user `타이머 3분 맞춰줘`
  - AI `3분 타이머를 시작했어요. 그동안 대파를 썰어두면 좋아요. ⏱`

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**. 도움말 `openVoice()`.
- ⚠ **인앱 진입점 없음**: 사이드바 `nav('cook2')` / `#cook2` 로만 도달. 채팅/듣기 바는 정적(상호작용 없음).

### 팔레트/모드
라이트 · RED(강제).

---

## loading (영상 분석 로딩)
### 핵심 구조 (app_ref_red.html:826~838)
- 상태바 / 중앙 로딩 블록(`.loading`): 스피너 + 제목·부제 + 단계 로그 4줄(`.steps-log`)

### 핵심 한글 라벨
- 제목: `레시피를 분석하고 있어요`
- 부제: `영상을 단계별로 쪼개는 중...`
- 단계 로그4: `영상 불러오기` `재료·분량 추출` `조리 단계 분해` `핸즈프리용 재구성`

### 버튼/인터랙션 → 목적지
- 버튼 없음. `analyze()`가 `show('loading')` 후 로그를 순차 `.done` 처리, 마지막에 `setTimeout(()=>show('detail'))` → **detail** 자동 이동.

### 정직성 요소
- 4단계 로그가 순차 `.done` [동적] (가짜 즉시완료 아님).

### 팔레트/모드
라이트 · RED. 스피너/체크 = `--green`(=RED).

---

## reviews (후기 전체)
### 핵심 구조 (app_ref_red.html:899~907)
- 상태바 / 헤더(뒤로 / 제목 / 빈 우측) / 본문: 평점 요약 `#revSummary` [동적] + 후기 목록 `#revAll` [동적] / 하단 CTA 바

### 핵심 한글 라벨
- 헤더 제목: `후기`
- CTA 버튼: `후기 쓰기`
- 평점 요약·후기 카드(작성자/별점/본문/사진) **전부 [동적]** — `renderReviewsScreen()`가 `#revSummary`/`#revAll` 채움(localStorage 시드). 정적 마크업엔 후기 텍스트 없음.

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- `후기 쓰기` `openReviewSheet()` → 후기 작성 시트(제출 `submitReview`)

### 팔레트/모드
라이트 · RED. 별점 `#FFB400`, 분포 막대 `--green`(=RED).

---

## (참고) 뷰가 아닌 오버레이 — 8뷰 위에 뜸
- **sheet**(`#scrim`+`#sheet`): 제목 `레시피 등록하기` / 부제 `유튜브 링크만 붙여넣으면 단계별 레시피로 만들어드려요` / 필드 `https://youtube.com/watch?v=...` / 버튼 `입력 완료`(→`analyze()`→loading→detail) · `취소`
- **ingSheet**: `재료 11개`(⚠ 12항목) + x 닫기
- **timerSheet**: `타이머 설정` / `3` `분` / 프리셋 `1분` `3분` `5분` `10분` / `시작`
- **reviewSheet**: `후기 쓰기` / `맛은 어땠나요?` / 별점 입력 / `한 줄 후기` / placeholder `레시피는 어땠나요? 팁이 있다면 남겨주세요` / 사진 첨부 / `등록`
- **voiceModal**: `핸즈프리로<br>편하게 말해보세요` / `핸즈프리 모드 명령 가이드` / 카테고리 5(`단계 이동`·`궁금한 거 물어보기`·`재료 · 대체`·`타이머`·`영상 · 기타`) + 예시 칩 / `알겠어요!`
- **videoSettings**: `영상 설정` / `구간 반복`(1·2·3·무한, 멈춤/다음 단계로) / `볼륨` / `재생 속도`(1×·1.2×·1.5×·2×)

---

## 플로우 그래프 (실측 nav/show/hash/onclick)

### 인앱 실사용 플로우 (onclick 핸들러 기준)
- `home → detail` : 카드 `goDetail()`
- `home → sheet` : FAB `openSheet()`
- `sheet → loading` : `입력 완료` `analyze()` → `show('loading')`
- `loading → detail` : `analyze()` 내 `setTimeout(show('detail'))` (자동)
- **`detail → cook`** : `요리 시작하기` `startCook()` (→ show('cook'), 0.6초 뒤 openVoice)
- `detail → home` : 뒤로
- `detail → reviews` : `#detMore`(숨김·조건부)
- `cook → complete` : 마지막 단계 `next()` → `show('complete')`
- `cook → detail` : 뒤로
- **`complete → cook`** : `다시 요리하기` `startCook()`
- `complete → home` : `홈으로`
- `cook3 → complete` : 마지막(완료 카드) `next()`/클릭 → `finishCook()` (rise-in)
- `cook3 → detail` : 뒤로
- `cook2 → detail` : 뒤로
- `reviews → detail` : 뒤로

### 레거시/사이드바·해시 전용 (인앱 forward 진입점 없음)
- **`cook3`** : `startCook()`이 cook으로 가므로 cook3는 `nav('cook3')` / `#cook3` 로만 도달. (⚠ CLAUDE.md는 cook3를 "주력"이라 하지만, 이 ref 빌드의 CTA는 cook으로 감 — 실측)
- **`cook2`** : `nav('cook2')` / `#cook2` 로만 도달.
- 해시 라우팅(`applyHash`, app_ref_red.html:2009~2027): `#home #sheet #loading #detail #cook #ingredients #timer #voice #cook3 #cook2 #complete #reviews` (`ingredients`/`timer`/`voice`는 cook을 띄우고 해당 시트/모달 오픈)

### 프로토타입 stub(네비 아님, 토스트만)
- home 검색(`검색은 프로토타입에서 생략`); detail 공유(`공유 링크가 복사되었어요`).

### dead-UI(핸들러 자체 없음, 장식)
- home 카테고리칩 7·섹션 `전체` more·알림 뱃지 `268`·프로필 아이콘.

---

## 로컬 대비 주요 차이 (docs/verify/CHECKLIST_app_html_ko.md 기준, 실측)
1. **팔레트 초록/테라코타 → RED**: 로컬 = 테라코타 `--primary:#D66B42`(진짜 초록은 성공색 `--fresh`뿐). GitHub RED = `--brand:#EF5A3C`(tomato 프리셋), 토큰명 `--primary`→`--brand`, 별칭 `--green`이 RED로 매핑. 배경 `#F6F0E8`(크림) → `#F5F5F7`(틴트 OFF 중립).
2. **화면 삭제**: 로컬에 있던 **cookbook(요리북)·tipWrite(팁 남기기)** 두 화면이 **없음**. (로컬 11뷰 → 여기 8뷰)
3. **home 재구성**: 로컬의 퀵임포트 오렌지 카드·하단 탭바(`홈/등록/요리북`)·헤드라인 `오늘 뭐 만들까요?`·워드마크 `Cookflow`·부제 → **전부 제거**. 대신 로고 `cook` + 알림 뱃지 `268`. 섹션 `당신만을 위한 추천`(personalList) → `나의 레시피`(gridMine). 카테고리 `셰프`→`쉐프`. **네비게이션이 하단탭 → FAB 방식**(FAB가 로컬은 숨김이었으나 여기선 표시).
4. **detail 변경**: 재료 `9개`→라벨 `11개`(실제 12항목, 고추참치 추가·청양고추 제거·대파/팽이버섯 등). 스텝 `5단계`→**7단계(A~G)**, 레시피 내용 재작성(파기름 먼저·고추참치 기반). **정직 배지 `정적 미리보기`·`먼저 만든 사람의 팁` 스트립·추출 요약칩 모두 제거**. CTA 목적지 cook3→**cook**.
5. **조리 플로우 반전**: 로컬 `startCook()`→cook3(주력) / cook 레거시. GitHub RED `startCook()`→**cook** / **cook3가 사이드바·해시 전용**.
6. **cook3 UI**: 톤 선택칩(화이트/허브/스틸/크림) **제거**. 스와이프 힌트 = 칩→전체 오버레이 `위로 스와이프하세요`. 하단 컨트롤 4→**3버튼**, 가운데 `핸즈프리`→`AI 비서`(bot). 헤더 우측 도움말→**설정(영상 설정 모달: 구간 반복/볼륨/재생 속도)**. 진행 도트 5→**7**.
7. **정직 표기 축소**: `정적 미리보기`/`data-clip` 속성/`재생 중` 캡션/`음성 인식 시뮬레이션` 라벨 **모두 제거**. cook3 정직성은 `file://` 폴백(`로컬 서버로 열면 영상이 재생돼요`)만 남음(+http에서 실제 재생). cook3 영상 id `CgapOjKdo9I`.
8. **complete 단순화**: 팁 관련 액션(`다른 사용자를 위한 팁 남기기`)·팁 카드·공유 버튼 제거. 통계 `완성/팁1개/30분` → `30분/5단계/0회`. `다시 요리하기` 추가(→cook).
9. **"다크" 조리 화면 라이트 렌더**: 로컬은 cook3 `#050505`·cook/cook2 `#120F0C` 하드코딩. 여기선 `.view.dark`→`--bg`=`#F5F5F7`(모드 종속)라 강제 라이트에서 **라이트로 렌더**. 다크모드 전용 화면 없음.
