# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 응답·주석·문서·커밋은 한국어, 변수명/함수명은 영어 (전역 규칙 준수).

## 프로젝트 개요

유튜브 레시피를 **핸즈프리 음성 가이드**로 따라 하는 요리 어시스턴트 앱의 **인터랙티브 프로토타입**. 빌드 도구·프레임워크·백엔드 없는 **순수 단일 HTML 파일** 데모로, 아이폰 화면을 흉내 낸 목업 안에서 화면 전환·캐러셀·음성 대화·소셜(좋아요/후기) 기능이 JS로 실제 동작한다.

## 실행 / 디버깅

빌드·테스트·린트 명령 없음. 브라우저로 직접 연다.

```bash
open app.html              # 메인 프로토타입 (왼쪽 사이드바로 화면 이동)
open flow.html             # 전체 화면 플로우 보드 (app.html 화면들을 iframe 썸네일로)
```

- **헤드리스 스크린샷 디버깅** (Playwright/Puppeteer 없음, 시스템 Chrome 사용):
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --screenshot=out.png --window-size=438,892 \
    --force-device-scale-factor=2 --virtual-time-budget=3000 \
    "file:///Users/eunsung/Documents/Soma/cook/app.html#cook3"
  ```
  특정 상태를 강제하려면 임시 복사본에 `window.addEventListener('load', …)` 스크립트를 주입해 `show('cook3')` 호출 + 패널 클래스/텍스트를 세팅한 뒤 캡처한다. 임시 파일은 스크래치패드 디렉터리에 만들고 끝나면 정리.
- JS 문법 검증: `<script>` 본문만 추출해 `node --check` (DOM 의존이라 실행 검증은 브라우저에서).

## 아키텍처

전부 `app.html` 한 파일 안에 있다(`<style>` + 마크업 + `<script>`). 약 1300줄.

### 화면(View) 라우팅
- 모든 화면은 `<div class="view" id="...">`. `.active` 클래스 하나만 보이게 토글.
- **3중 진입점이 모두 같은 상태로 수렴해야 한다**:
  - `nav(key)` — 사이드바 버튼. 시트/모달을 닫고 캐러셀을 reset 후 `show()`.
  - `show(id)` — 실제 `.active` 토글 + `setActiveNav()` + 화면별 렌더 훅(`detail→renderDetailSocial`, `reviews→renderReviewsScreen`, `home→hydrateHome`).
  - `applyHash()` — `#해시` 라우팅(`hashchange` + 로드 시 1회). `flow.html`이 iframe `app.html#detail` 식으로 각 화면을 박는 데 쓰인다.
- **새 화면을 추가하면 `nav`·`applyHash`·사이드바 마크업 세 곳을 모두 갱신**해야 한다. 사이드바 번호(`.sn-num`)는 표시용이며 id와 무관 — 번호 재정렬을 피하려고 신규 항목은 보통 끝에 붙인다.

### 조리 모드 3종 (혼동 주의)
| id | 사이드바 | 설명 |
|----|---------|------|
| `cook3` | 5 조리 모드(신) | **현재 주력**. 캐러셀 + 하단 `.cook-ctrl`이 3버튼↔음성 대화 패널(`#vpanel`)로 morph |
| `cook` | 6 기본 조리 모드(구) | 구버전. 타이머/재료/음성 가이드 모달 진입점 |
| `cook2` | 7 핸즈프리 모드(구) | 정적 스냅샷 |

`cook3`·`cook`은 `makeCarousel(viewId, trackId)` 팩토리로 만든 인스턴스(`cook3Car`, `cookCar`)를 쓴다 — `{reset, layout, next, prev, advance}` 반환, 단계 데이터는 모듈 스코프 `steps` 배열(letter/title/time/subs).

#### cook3 영상: 실제 유튜브 단계별 구간재생 + 정직 폴백 (v4 엔진 이식)
- `cook3`의 `.cook-video`는 **정적 전용이 아니다**. 재생 가능 환경(데스크톱 Chrome/실기기)에서는 `#cook3Player`에 YouTube IFrame API 플레이어를 띄워 **단계 구간(`step.start`~다음 단계 start)으로 실제 seek·재생**하고, 재생 중엔 캡션이 "N단계 … 원본 영상 재생 중"으로 바뀐다.
- 재생 불가 환경(에뮬레이터 WebView 등)·비YouTube 소스에서는 기존 **정적 썸네일 + "원본 구간 연결" 정직 폴백**을 그대로 유지한다(try-real-else-honest). 즉 앱은 여전히 정직하되, 가능한 곳에선 진짜로 재생한다.
- 핵심 함수: `cookVideoStart()`(cook3 진입 시 `show('cook3')`에서 호출) · `ensureCookPlayer()` · `seekCookStep(i)`(구간 seek+endSec 도달 시 구간 반복) · `cookYtCleanup()`(cook3 이탈 시 `hf3Reset()`에서 호출). 단계 변경 seek 훅은 `updateCookVideoForStep(i)`(캐러셀 `layout()`이 매 단계 호출).
- **합성-클립 함정 주의**: 플레이어 iframe은 `.cook-video`(`overflow:hidden`) 안에만 두고, `.screen`/`.vpanel`에 transform/opacity/will-change를 추가하지 말 것(44px 모서리 깨짐). 데스크톱 Chrome에서 모서리·음성패널 정상 확인 완료.

### 음성 대화 패널 (`#vpanel`, cook3 전용)
핸즈프리 버튼(`toggleHf3()`)을 켜면 하단 컨트롤이 시리/ChatGPT 음성모드풍 패널로 바뀐다. `runVp()`가 `vpScript`(사용자 발화↔AI 답변, 일부는 `next`로 단계 진행 / `timer`로 타이머 가동)를 **상태머신**으로 자동 재생: idle("듣고 있어요") → listening(`vpType`으로 한 글자씩 타이핑) → thinking(···) → answering(스트리밍) → 유지 → 5초 후 다음 발화. `hf3Reset()`이 모든 타이머를 정리하므로 화면 이탈/토글 OFF 시 반드시 호출(`nav`·`applyHash` 첫 줄에서 호출됨).

> **⚠️ WebKit/Blink 합성-클립 함정**: `.vpanel`이나 `.screen`에 `transform: translateZ(0)`·opacity 트랜지션 등으로 **합성 레이어가 생기면**, 상위 `.screen border-radius:44px`가 패널 네 모서리에 잘못 적용돼 둥근 인셋 카드처럼 보인다. 패널 등장은 `visibility` 토글로 처리하고 합성 승격을 유발하는 속성을 추가하지 말 것. 배경 그라데이션 회전(`--vpang` conic)·`fog` 드리프트 애니메이션 자체는 무해함.

### 소셜 (좋아요 · 후기) — localStorage 백엔드
- 키 `cook.social`, 구조 `store[vid] = {likes, liked, reviews:[{user,rating,text,photo,ts}]}`. `vid`는 유튜브 영상 ID.
- `loadSocial`/`saveSocial`(JSON), `seedSocial`(최초 1회 시드, 기존 데이터 보존). 사진은 `downscale()`로 ~480px 다운스케일 dataURL 저장(용량 초과 시 try/catch로 텍스트만).
- 렌더: `hydrateHome`(홈 카드 저장수), `renderDetailSocial`/`summaryHTML`/`reviewsHTML`(상세 평점요약·목록), `renderReviewsScreen`(후기 전체 화면). 제출은 `submitReview(vid)`.
- **상세(`#detail`)는 항상 순두부(`21j8SASqLJU`)에 바인딩**된다(프로토타입 제약).

### UI 공통 규칙
- **아이콘은 Lucide CDN** (`<i data-lucide="...">`). HTML을 동적 주입한 뒤에는 **반드시 `lucide.createIcons()`** 를 다시 호출해야 아이콘이 렌더된다.
- **유튜브 썸네일**: `https://i.ytimg.com/vi/<VID>/mqdefault.jpg` (16:9, 레터박스 없음).
- **z-index 스택**: 컨텐츠 1~5, 상태바 40, scrim 50, 시트 60/70, 사이드바 100, 재료시트 150, 음성모달 160, vpTimer 200, toast 300/500. 새 오버레이는 이 순서를 깨지 말 것.
- 색·간격은 FormFactor 디자인 기준(표준 스케일 8의 배수, 본문 ≥16px). 브랜드 컬러 CSS 변수 `--green:#46B581` 외 `:root`에 정의.
- iframe 안(`window.self!==window.top`)에서는 사이드바·테스트 토글을 숨긴다 — `flow.html` 임베드용.

## 보조 파일
- `WIREFRAME.md` — 서비스 기획(페인포인트/시나리오)과 와이어프레임 변경 로그. 화면을 크게 바꾸면 함께 갱신.
- `flow.html` — 화면 플로우 보드(피그마식). 화면 추가 시 카드 1장 추가.
- `wireframe.html`, `wireframe-screens.html` — 초기 와이어프레임(레거시).
- `cheftory_image/` — 참고용 레퍼런스 스크린샷(Cheftories 앱).
