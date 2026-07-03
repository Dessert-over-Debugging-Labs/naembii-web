# app.html 그라운드-트루스 체크리스트 (Figma 이식 채점용)

> 출처: `/Users/osein/cook-assistance-wireframe/app.html` (마크업·CSS `:root`·JS `nav`/`show`/`applyHash`), `scripts/ralph-figma/prd.json`, `docs/FIGMA_WIREFRAME_STORIES_ko.md`.
> 원칙: 모든 라벨은 app.html에서 **그대로 인용**. `[동적]` = JS가 주입/치환하는 텍스트(정적 마크업에 없음). 팔레트는 app.html `:root` 실측값 기준.

## 팔레트/모드 (전역 기준, app.html:10~39)
- **라이트(크림)**: `--bg:#F6F0E8`, `--surface:#FFFCF7`, `--ink:#231A14`, `--gray:#6E6258`, `--line:#DDD1C6`. 적용: home, cookbook, loading, detail, reviews, complete, tipWrite, sheet.
- **다크**: `.view.dark`는 `--bg:#120F0C`, `--surface:#1C1712`. cook3는 자체 토큰 `--cook-bg:#050505`/`--cook-panel:#111111`. 적용: cook3, cook, cook2.
- **주색(테라코타)**: `--primary:#D66B42`, `--primary-l:#E1875F`. ⚠ `--green:var(--primary)` = **초록 아님, 테라코타**. 진짜 초록은 성공색 `--fresh:#3FA76F`뿐. 골드 `--accent:#C99B4A`, 베리 `--berry:#E94B6D`.
- **팔레트 불일치(중요)**: prd.json 대부분의 acceptanceCriteria가 "그린 #46B581"을 토큰으로 명시하지만, app.html `:root`에는 #46B581이 **없다**. prd 후반 스토리(`home-DONE`, `FIX-home-color`)가 이를 인정하고 테라코타 #D66B42로 보정. 채점 시 app.html 실측(#D66B42)이 정답.

---

## home
**prd 대응**: F0, SEC-A, K-home, D-home-01~10, home-DONE, NOTE-home, FIX-home-color, home-FULL

### 핵심 구조 (top→bottom, app.html:951~995)
- 상태바 (`.statusbar`) — 9:41 + 신호/와이파이/배터리 아이콘
- 헤더 (`.nav.home-nav`) — 브랜드 락업(로고마크+워드마크+부제) + 헤드라인 + 우측 알림/프로필 아이콘
- 본문 (`.body`)
  - 퀵임포트 오렌지 카드 (`.quick-import`)
  - 검색바 (`.search`)
  - 카테고리 원형칩 스크롤 (`.cats`) — **7개**
  - 섹션 "당신만을 위한 추천" (`.section-t`) + 리스트 `#personalList`
  - 섹션 "인기 레시피" + 가로스크롤 `#popScroll`
  - 섹션 "오늘의 추천" + 가로스크롤 `#recScroll`
- FAB (`.fab`, CSS `display:none` — 기본 숨김)
- 하단 탭바 (`.bottom-tabs`) — 홈/등록/요리북

### 핵심 한글 라벨 (verbatim)
- 브랜드: `Cookflow` (워드마크, 영어 브랜드), `영상 레시피 요리 도우미` (부제)
- 헤드라인: `오늘 뭐 만들까요?` (마크업은 `오늘 뭐 만들까요<em>?</em>`)
- 퀵임포트: `영상 링크로 바로 요리하기` / `재료, 단계, 구간을 먼저 확인하고 시작`
- 검색바: `먹고 싶은 요리를 검색해보세요`
- 카테고리 7: `셰프` `급상승` `한식` `분식` `일식` `양식` `디저트`
- 섹션 제목: `당신만을 위한 추천` · `인기 레시피` · `오늘의 추천`, 각 `전체` 더보기
- 추천 카드 [동적, `#personalList`←`personalHTML`/PERSONAL_RECS+RECIPES, app.html:1832~1847,1867]:
  - 카드1: 사유 `뜨끈한 국물 요리를 요즘 많이 땡겨하시네요?` / 제목 `순두부찌개` / 메타 `백종원 · 2인분 · 30분 · 기록 기반`
  - 카드2: 사유 `새우 들어간 레시피를 자주 저장한 당신을 위한 추천` / 제목 `감바스 알 아히요` / 메타 `성시경 · 2인분 · 25분 · 기록 기반`
- 인기/오늘의 추천 카드 [동적, `#popScroll`/`#recScroll`←`cardHTML`/RECIPES]: `순두부찌개`(백종원·2인분) `감바스 알 아히요`(성시경) `아보카도 비빔밥`(다이어터 레시피·1인분) `까르보나라`(Chef Mama) `딸기 티라미수`(쿠킹트리·4인분) `명란 파스타`(혼밥 레시피·1인분) 등
- 하단 탭: `홈` `등록` `요리북`

### 버튼/인터랙션 → 목적지
- 추천/인기 카드 `onclick=goDetail(vid)` → **detail** (goDetail→setActiveRecipe→show('detail')); ⚠ detail은 항상 순두부에 바인딩
- 퀵임포트 카드 `openSheet()` → **sheet**(바텀시트 오픈)
- FAB `openSheet()` → **sheet** (단 CSS로 숨김)
- 하단 탭 홈 `appTab('home')`→home / 등록 `appTab('add')`→**sheet**(openSheet) / 요리북 `appTab('book')`→**cookbook**
- **의미 없는 stub(토스트만, dead-UI 주의)**: 검색바 `toast('검색은 프로토타입에서 생략했어요')`; 카테고리칩 `homeCategory()`→토스트; 섹션 전체 `homeMore()`→토스트; 알림 `toast('새 레시피 추천 3개가 있어요')`; 프로필 `appTab('settings')`→색상 시트

### 팔레트/모드
라이트(크림). 주색 테라코타. ⚠ prd D-home-06 초기 노트가 카테고리/추천을 초록(#46B581)으로 그렸다가 `home-DONE`/`FIX-home-color`에서 테라코타로 보정 → 정답은 테라코타.

---

## detail (레시피 상세, 순두부 바인딩)
**prd 대응**: SEC-B, K-detail, D-detail-01~09, detail-DONE, NOTE-detail, detail-FULL

### 핵심 구조 (app.html:1043~1105)
- 상태바
- 헤더 (`.nav`) — 뒤로(‹) / 제목 `레시피` / 공유(share-2)
- 본문
  - 영상 히어로 (`.hero`) — 썸네일 + 재생아이콘 + 정직 배지 + 플랫폼 배지
  - 상세 본문 (`.detail-body`): 제목+저장버튼(`.dhead`) / 평점 `#detRating` / 설명 문단 / `먼저 만든 사람의 팁` 스트립 / 추출 요약칩(`.extract-summary`) / 메타칩3(`.meta`) / 탭(`.dtabs`) / 재료(주재료·양념) / 레시피 스텝 `#detSteps` / 후기 영역
- 하단 플로팅 CTA (`.cta-bar.float-start`)

### 핵심 한글 라벨
- 헤더: `레시피`
- 정직 배지: `정적 미리보기` (`#detailVideoHonesty`), 플랫폼 배지: `YouTube` (`#detailPlatformBadge`, [동적—소스별 치환])
- 제목: `백종원이 알려주는 칼칼한 순두부찌개` (`#detailTitle`, 마크업 `<br>` 포함)
- 저장수: `#detLikeN` 초기 `0` **[동적]** — ⚠ prd D-detail-04 "저장수 342"와 불일치(app 실제는 social localStorage 기반, 정적 342 아님)
- 평점 `#detRating`, 후기 목록 `#detReviews`/`#detSummary`, 레시피 스텝 `#detSteps` **모두 [동적]** (`renderDetailSocial`). prd "⭐4.7 후기 3개"는 시드값 기준
- 설명: `칼칼한 국물에 몽글몽글한 순두부가 어우러지는…` (`#detailSummary`)
- 팁 스트립: `먼저 만든 사람의 팁` / `청양고추는 반만 넣어도 충분히 칼칼해요. 남은 국물에는 밥을 넣어 마무리해도 좋아요.`
- 추출 요약칩: `5단계 추출` `재료 9개` `타임스탬프 연동`
- 메타칩: `30분`/`조리시간`, `2인분`/`분량`, `쉬움`/`난이도`
- 탭: `재료` `레시피` `리뷰`
- 재료 그룹: `재료 9개`, `주재료`(순두부/양파/애호박/청양고추/계란), `양념`(다진마늘/진간장/멸치액젓/코인육수) — 정적 마크업 존재
- 후기 영역: `후기`, 버튼 `후기 쓰기`
- CTA: `요리 시작하기`

### 버튼/인터랙션 → 목적지
- 뒤로 `show('home')` → **home**
- 히어로 `videoFallback()` → 토스트(정직 안내), 네비게이션 아님
- 저장 `toggleLike()` → 좋아요 토글(localStorage)
- 공유 `toast('공유 링크가 복사되었어요')` → stub
- 후기 쓰기 `openReviewSheet()` → 후기 작성 시트
- `#detMore` `show('reviews')` → **reviews** (⚠ `display:none` 기본—리뷰 임계 넘을 때만 노출)
- **CTA `요리 시작하기` `startCook()` → cook3** (cook3Car.reset→show('cook3'))

### 정직성 요소
- `정적 미리보기` 배지(거짓 재생 표기 금지). 재생아이콘은 장식.

### 팔레트/모드
라이트(크림). CTA 버튼 테라코타 그라데이션.

---

## cook3 (주력 신 조리모드, 다크)
**prd 대응**: K-cook3, D-cook3-01~08, cook3-DONE, NOTE-cook3, cook3-FULL

### 핵심 구조 (app.html:1119~1153)
- 상태바(다크)
- 헤더(`.nav.dark`) — 뒤로 / 제목 `조리 모드`(14px) / 도움말(help-circle 아이콘, 텍스트 없음)
- 영상 영역(`.cook-video` + `#cook3Player`)
- 단계 진행 도트(`.cook-progress`) — 5칸(done,done,cur,공,공)
- 톤 선택칩(`.cook-tone`) — 4개
- 스와이프 힌트(`.cook-swipe-hint`)
- 단계 카드 캐러셀(`.cook-body`>`#cookTrack3`) **[동적—makeCarousel.build()]**
- 타이머 배지(`#vpTimer`)
- 하단 컨트롤(`.cook-ctrl`) — 4버튼 / 핸즈프리 켜면 음성패널(`#vpanel`)로 morph

### 핵심 한글 라벨
- 헤더: `조리 모드`
- 톤칩4: `화이트` `허브` `스틸` `크림`
- 스와이프 힌트: `단계 카드를 위아래로 스와이프`
- 타이머 배지: `3:00` / `타이머`
- 하단 컨트롤4: `타이머` / `핸즈프리 꺼짐` / `재료` / `요리 완성`
- 단계 카드 **[동적, steps 배열 app.html:2107~2113, build()]**: `1단계.`~`5단계.` 접두 + 제목 `육수 준비하기`/`고추기름 내기`/`채소 익히기`/`순두부 끓이기`/`마무리하기`, 배지 `1 / 5`…`5 / 5`, 서브 리스트(예: `냄비에 물 250ml를 붓는다`), 구간참조 `0:00 ~ 0:35 · YouTube 구간`
- 음성패널(핸즈프리 ON): 정직 라벨 `음성 인식 시뮬레이션`, `듣고 있어요`(`#vpUser` 초기), AI 답변 `#vpAi` **[동적, vpScript]**

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- 도움말 `openVoice()` → 음성 가이드 모달
- 영상 `videoFallback()` → 토스트(정직 안내)
- 톤칩 `setCookTone()` → 색상 버전 전환(같은 화면)
- 타이머 `openTimer()` / 재료 `openIngredients()` → 시트
- 핸즈프리 `toggleHf3()` → 음성패널 morph(같은 화면)
- **`요리 완성` `finishCooking()` → complete** (hf3Reset→show('complete'))
- 캐러셀: 스와이프/휠/클릭으로 단계 이동. **마지막 단계에서 next()→`finishCooking()`→complete**. ⚠ 이전/다음 버튼 없음(스와이프 페이싱).

### 정직성 요소 (핵심)
- 영상: `.cook-video` `data-clip="정적 미리보기 · 실제 재생은 실기기에서 확인"` (app.html:1122) — **속성값**, 정적 DOM 텍스트 아님(JS 소비).
- CLAUDE.md 명시: cook3는 재생 가능 환경(데스크톱/실기기)에서 **실제 YouTube 구간 재생**하고 캡션이 `N단계 … 원본 영상 재생 중`으로 바뀜 → 이 "재생 중"은 **진짜 재생**이라 정직(가짜 상태 아님). 재생 불가 시 정적 썸네일 + 정직 폴백 유지(try-real-else-honest).
- 음성패널 `음성 인식 시뮬레이션`(시뮬레이션 명시).

### 팔레트/모드
다크. cook3 전용 토큰(`--cook-bg:#050505`/`--cook-panel:#111111`), 톤별 액센트(mono #f8f8f4/herb #76D99E/steel #92C5FF/cream #F3E2BC). 완성 원형 버튼은 성공색 `--fresh` 초록.

---

## cook (레거시 구 조리모드, 다크)
**prd 대응**: K-cook, D-cook-01~06, cook-DONE, NOTE-cook

### 핵심 구조 (app.html:1156~1171)
- 상태바(다크) / 헤더(뒤로/제목/도움말) / 영상(`.cook-video`) / 진행 도트5 / 캐러셀(`#cookTrack` [동적]) / 하단 컨트롤 3버튼

### 핵심 한글 라벨
- 헤더 제목: `기본 조리 모드`
- 하단 컨트롤3: `타이머` / `핸즈프리 모드` / `재료 보기`
- 단계 카드: cook3와 동일 steps 배열 [동적]

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- 도움말 `openVoice()`, 타이머 `openTimer()`, 핸즈프리 `toggleHandsfree()`, 재료 `openIngredients()` (전부 같은 화면 시트/토글)
- ⚠ **인앱 진입점 없음**: `startCook()`은 cook3만 감. cook은 사이드바 `nav('cook')`/`#cook`(또는 `#ingredients`/`#timer`)로만 도달 = 레거시/개발용.

### 팔레트/모드
다크(`.view.dark`, #120F0C).

---

## cook2 (레거시 핸즈프리 정적 스냅샷, 다크)
**prd 대응**: K-cook2, D-cook2-01~03, cook2-DONE, NOTE-cook2

### 핵심 구조 (app.html:1174~1208)
- 상태바(다크) / 헤더(뒤로/제목/도움말) / 영상 / 진행 도트5 / **정적** 단계 카드1(`.scard.active.static`) / 듣기 바(`.hf-listen`) / 채팅(`.hf-chat`) — 전부 정적 마크업

### 핵심 한글 라벨 (전부 정적)
- 헤더 제목: `핸즈프리 모드`
- 단계 카드: `3단계.` `채소 익히기`, 배지 `3 / 5`, 서브 `양파 1/2개를 넣고 볶는다`/`애호박 1/3개를 넣어 숨을 죽인다`/`청양고추 1개로 칼칼함을 더한다`
- 듣기 바: `듣고 있어요…`, 타이머 `2:45`
- 채팅 버블: AI `핸즈프리 모드예요. 궁금한 건 편하게 말씀하세요.` / user `다음 단계로 가줘` / AI `D단계, 순두부 끓이기로 넘어갈게요. 준비한 육수를 붓고 끓여주세요.` / user `간장 없는데 대체할 수 있는 거 있나?` / AI `진간장 대신 멸치액젓이나 소금으로 간을 맞춰도 돼요. 액젓은 비슷한 양, 소금은 조금씩 넣어가며 맞춰보세요.` / user `타이머 3분 맞춰줘` / AI `3분 타이머를 시작했어요. 그동안 대파를 썰어두면 좋아요.`

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**. 도움말 `openVoice()`.
- ⚠ **인앱 진입점 없음**: 사이드바 `nav('cook2')`/`#cook2`로만 도달 = 레거시. 채팅/듣기 바는 정적(상호작용 없음).

### 팔레트/모드
다크.

---

## loading (영상 분석 로딩)
**prd 대응**: K-loading, D-loading-01~04, loading-DONE, NOTE-loading, loading-FULL

### 핵심 구조 (app.html:1028~1040)
- 상태바 / 중앙 로딩 블록(`.loading`): 스피너 + 제목·부제 + 단계 로그 4줄(`.steps-log`)

### 핵심 한글 라벨
- 제목: `레시피를 분석하고 있어요`
- 부제: `영상을 단계별로 쪼개는 중이에요.`
- 단계 로그4: `영상 불러오기` `재료·분량 추출` `조리 단계 분해` `핸즈프리용 재구성`

### 버튼/인터랙션 → 목적지
- 버튼 없음. 자동 전이: `analyze()`가 `show('loading')` 후 로그를 순차 `.done` 처리, `setTimeout(()=>show('detail'))` → **detail**로 자동 이동.

### 정직성 요소
- 4단계 로그가 순차적으로 done 처리(가짜 즉시완료 아님). `.done` 상태 [동적].

### 팔레트/모드
라이트(크림). 스피너/체크 성공색.

---

## complete (완료)
**prd 대응**: SEC-C, K-complete, D-complete-01~05, complete-DONE, NOTE-complete

### 핵심 구조 (app.html:1211~1233)
- 상태바 / 완료 뷰(`.done-view`): 배지(party-popper) + 헤드라인 + 설명 + 통계3(`.done-stat`) + 팁 카드(`.done-card`) + 액션(`.done-actions`) + 홈으로 버튼

### 핵심 한글 라벨
- 헤드라인: `순두부찌개 완성!`
- 설명: `방금 만든 요리 기록이 요리북에 추가됐어요. 다음에 다시 만들 때 오늘의 메모와 팁을 함께 볼 수 있어요.`
- 통계3: `완성`/`요리 기록`, `팁 1개`/`참고한 팁`, `30분`/`조리 시간`
- 팁 카드: `오늘 도움 된 팁` / `청양고추는 반만 넣어도 충분히 칼칼해요. 남은 국물에는 밥을 넣어 마무리해도 좋아요.`
- 액션 버튼: `다른 사용자를 위한 팁 남기기` / `후기 남기기` / `공유` / `홈으로`

### 버튼/인터랙션 → 목적지
- `다른 사용자를 위한 팁 남기기` `show('tipWrite')` → **tipWrite**
- `후기 남기기` `openReviewSheet()` → 후기 시트
- `공유` `toast('공유 기능은 다음 버전에서 지원해요')` → stub
- `홈으로` `show('home')` → **home**

### 불일치 (app vs prd)
- prd D-complete-04 라벨 `다시 요리하기` — **app.html에 없음**(액션은 팁/후기/공유/홈으로). "다시 요리하기" 버튼 부재.
- prd D-complete-03 `요약(소요 시간·난이도·완성 기록)` — app 통계는 `완성`/`팁 1개`/`30분`(난이도 칩 없음).

### 팔레트/모드
라이트(크림). 무의미 0-지표 없음(완성/팁1개/30분 유의미).

---

## tipWrite (팁 남기기)
**prd 대응**: K-tipWrite, D-tipWrite-01~06, tipWrite-DONE, NOTE-tipWrite

### 핵심 구조 (app.html:1236~1251)
- 상태바 / 헤더(뒤로/제목) / 팁 폼(`.tip-form`): 히어로 문구 + 팁 유형 태그(`.tip-tags`) + 텍스트박스(`.tip-box`>textarea) + 등록/나중에 버튼

### 핵심 한글 라벨
- 헤더 제목: `팁 남기기`
- 히어로: `다음 사람에게 어떤 팁을 남길까요?`(마크업 `<br>`) / `내가 실제로 만들어본 뒤 알게 된 조절 포인트를 남겨두면 같은 레시피를 보는 사람에게 보여줘요.`
- 팁 유형 태그4: `맛 조절` `재료 대체` `불 조절` `보관`
- textarea 기본값/placeholder: `청양고추는 반만 넣어도 충분히 칼칼했어요. 남은 국물에는 밥을 넣어 마무리하면 좋아요.`
- 버튼: `팁 등록` / `나중에 하기`

### 버튼/인터랙션 → 목적지
- 뒤로 `show('complete')` → **complete**
- 팁 유형 태그 `selectTipTag()` → 선택 토글(같은 화면)
- `팁 등록` `submitTip()` → 토스트 후 `show('complete')` → **complete**
- `나중에 하기` `show('complete')` → **complete**

### 불일치 (app vs prd)
- prd D-tipWrite-03 `별점 선택`(G2 라벨 `별점`), D-tipWrite-05 `사진 첨부`(`사진 추가`), D-tipWrite-04(`팁을 남겨주세요`) — **app.html에 별점/사진 첨부 UI 없음**. app 실제는 팁 유형 태그4 + textarea. placeholder도 `팁을 남겨주세요`가 아님(위 인용문).

### 팔레트/모드
라이트(크림).

---

## cookbook (요리북)
**prd 대응**: K-cookbook, D-cookbook-01~06, cookbook-DONE, NOTE-cookbook

### 핵심 구조 (app.html:998~1025)
- 상태바 / 헤더(제목 + 검색 아이콘) / 본문: 책 헤드(`.book-head`) + 통계3(`.book-stats`) + 필터칩(`.book-filter`) + 섹션 최근 조리(`#cookedScroll` [동적]) + 섹션 저장 레시피(`#gridMine` [동적]) + 기록 메모(`.book-note`) / 하단 탭바

### 핵심 한글 라벨
- 헤더: `요리북`
- 책 헤드: `내가 만든 요리와 저장한 레시피`(마크업 `<br>`) / `완성 기록, 다시 만들고 싶은 메뉴, 저장해둔 영상 레시피를 한 곳에서 봅니다.`
- 통계3: `2`/`최근 조리`, `6`/`저장 레시피`, `3`/`남긴 팁`
- 필터칩4: `전체` `최근 조리` `저장한 레시피` `남긴 팁`
- 섹션 제목: `최근 조리` · `저장한 레시피`, 각 `전체`
- 기록 메모: `최근 기록 메모` / `감바스는 소금을 줄여 다시 만들 후보로 저장됐어요. 다음 조리 때 메모가 먼저 표시됩니다.`
- 최근 조리 카드 [동적, COOKED_RECIPES app.html:1840~1843]: `순두부찌개`(백종원 · 어제 저녁, `완성 기록`/`팁 남김`), `감바스 알 아히요`(성시경 · 지난 주말, `재조리 후보`/`소금 줄이기`)
- 저장 레시피 그리드 [동적, `#gridMine`←RECIPES]
- 하단 탭: `홈` `등록` `요리북`(active)

### 버튼/인터랙션 → 목적지
- 헤더 검색 `toast('요리북 검색은 다음 버전에서 지원해요')` → stub
- 필터칩 `bookFilter()` → 토스트 stub
- 섹션 전체 `homeMore()` → 토스트 stub
- 카드 `goDetail(vid)` → **detail**
- 하단 탭 홈→**home** / 등록→**sheet** / 요리북→cookbook

### 팔레트/모드
라이트(크림).

---

## reviews (후기 전체)
**prd 대응**: K-reviews, D-reviews-01~05, reviews-DONE, NOTE-reviews

### 핵심 구조 (app.html:1108~1116)
- 상태바 / 헤더(뒤로/제목/빈 우측) / 본문: 평점 요약 `#revSummary` [동적] + 후기 목록 `#revAll` [동적] / 하단 CTA 바

### 핵심 한글 라벨
- 헤더 제목: `후기`
- CTA 버튼: `후기 쓰기`
- 평점 요약·후기 카드(작성자/별점/본문/사진) **전부 [동적]** — `renderReviewsScreen()`가 `#revSummary`/`#revAll` 채움(localStorage social 시드). 정적 마크업에 후기 텍스트 없음.

### 버튼/인터랙션 → 목적지
- 뒤로 `show('detail')` → **detail**
- `후기 쓰기` `openReviewSheet()` → 후기 작성 시트(제출 `submitReview`)

### 팔레트/모드
라이트(크림).

---

## sheet (영상 링크 등록 바텀시트)
**prd 대응**: K-sheet, D-sheet-01~06, sheet-DONE, NOTE-sheet, sheet-FULL
> ⚠ `<div class="view">`가 아니라 오버레이 시트(`.scrim`#scrim + `.sheet`#sheet, app.html:1254~1280). home/cookbook 위에 뜸.

### 핵심 구조
- 스크림(`.scrim`, rgba(0,0,0,.4))
- 시트 패널(`.sheet`): 그래버(`.grabber`) + 제목 + 부제 + 링크 입력 필드(`.field`) + 붙여넣기 노트(`.paste-note`) + 분석 미리보기(`.import-preview`) + 입력완료/취소 버튼

### 핵심 한글 라벨
- 제목: `레시피 등록하기`
- 부제: `영상 링크만 붙여넣으면 앱이 출처와 형식을 자동으로 감지해 단계별 레시피로 바꿉니다.`
- 링크 입력 기본값: `https://youtu.be/21j8SASqLJU` (input value)
- 붙여넣기 노트: `YouTube, Shorts, Instagram 링크를 그대로 붙여넣으세요. 어디서 가져왔는지는 따로 입력하지 않아도 됩니다.`
- 미리보기: 상태 `분석 완료`, 제목 `백종원이 알려주는 칼칼한 순두부찌개`, 메타 `백종원 · YouTube · 긴 영상 · 전문 요리사`, 정직 라벨 `정적 썸네일 미리보기 · 실제 재생은 원본 앱/실기기에서 확인`, 태그 `5단계` `재료 9개` `구간 연결` ([동적—`updateImportPreviewFromUrl` 소스별 치환])
- 버튼: `입력 완료` / `취소`

### 버튼/인터랙션 → 목적지
- 스크림/`취소` `closeSheet()` → 시트 닫힘
- **`입력 완료` `analyze()` → loading → (자동) detail**
- 링크 input `updateImportPreviewFromUrl()` → 미리보기 갱신

### 정직성 요소
- `정적 썸네일 미리보기 · 실제 재생은 원본 앱/실기기에서 확인`, 상태 `분석 완료`(가짜 아님).

### 불일치 (app vs prd)
- prd G2 라벨: D-sheet-03 `영상 링크 등록`, D-sheet-06 `분석 시작`. **app 실제는 `레시피 등록하기`(제목)·`입력 완료`(버튼)**. prd notes가 스토리 라벨 우선 정책을 명시(=의도적 불일치). 채점 시 app 원문 우선.
- prd D-sheet-05 "플랫폼 배지(YouTube/Instagram)"는 실제로 배지가 아니라 붙여넣기 힌트 문장(위 인용).

### 팔레트/모드
라이트(크림). 링크 아이콘 `#FF0000`(유튜브 레드). 버튼 테라코타.

---

## 플로우 그래프 (actual nav/show/hash/onclick)

### 인앱 실사용 플로우 (onclick 핸들러 기준)
- `home → detail` : 추천/인기/오늘 카드 `goDetail(vid)`
- `home → sheet` : 퀵임포트 카드·FAB·하단탭 등록 `openSheet()`
- `sheet → loading` : `입력 완료` `analyze()` → `show('loading')`
- `loading → detail` : `analyze()` 내 `setTimeout(show('detail'))` (자동)
- `detail → cook3` : `요리 시작하기` `startCook()`
- `detail → home` : 뒤로
- `detail → reviews` : `#detMore`(숨김, 조건부) 또는 후기 쓰기 시트
- `cook3 → complete` : `요리 완성` `finishCooking()` 또는 마지막 단계 next()
- `cook3 → detail` : 뒤로
- `complete → tipWrite` : `다른 사용자를 위한 팁 남기기`
- `complete → home` : `홈으로`
- `tipWrite → complete` : `팁 등록`(submitTip)/`나중에 하기`/뒤로
- `reviews → detail` : 뒤로
- `cookbook → detail` : 카드 `goDetail`
- 하단 탭바(home/cookbook 공통): `홈→home`, `등록→sheet`(openSheet), `요리북→cookbook`

### 레거시(인앱 진입점 없음 — 사이드바 nav()/#hash 전용)
- `cook`, `cook2` : `startCook()`은 cook3만 감. cook/cook2는 `nav('cook'|'cook2')`·`#cook`/`#cook2`/`#ingredients`/`#timer`로만 도달. 둘 다 뒤로→detail.

### 프로토타입 stub(네비 아님, 토스트만 — dead-UI 아님/의도적)
- home 검색·카테고리·섹션 전체·알림; cookbook 검색·필터·섹션 전체; detail 공유; complete 공유.

### prd 플로우(FLOW-01, docs 기준, 참고)
`home→sheet→loading→detail→cook3→complete→tipWrite`, 보조 `cookbook`/`reviews`. app.html 실측과 일치(단 detail→cook3 CTA 경유, loading→detail 자동).
