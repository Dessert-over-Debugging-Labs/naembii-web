# W0-1 감사 — app.html 화면 인벤토리와 상속 갭 분석

작성일: 2026-06-29

## 범위

- 대상 파일: `app.html`, `WIREFRAME.md`, `CLAUDE.md`, `docs/_inherited/*`
- 목적: 현재 HTML 프로토타입의 화면, 라우팅, cook3/vpanel, 소셜 상태 구조를 확인하고 UI_FEEDBACK/FANOUT/FINAL 교훈 대비 보정 후보를 정리한다.
- 이번 스토리에서는 앱 코드를 수정하지 않는다. W0는 후속 구현을 안전하게 쪼개기 위한 감사 산출물이다.

## 화면 인벤토리

| view id | 역할 | 진입점 | 주요 상태/동작 |
|---|---|---|---|
| `home` | 홈, 레시피 카드 목록, 등록 FAB | 기본 진입, `#home`, 사이드바 1 | `renderHomeSections`, `hydrateHome`, 카드 클릭 `goDetail`, 저장 토글 `toggleLike` |
| `loading` | 영상 분석 로딩 | `analyze`, `#loading`, 사이드바 3 | 4개 로그를 `setTimeout`으로 순차 완료 후 `detail` 이동 |
| `detail` | 순두부 상세, 재료/단계/후기 | 카드 클릭, `#detail`, 사이드바 4 | 상세는 `DVID=21j8SASqLJU` 고정, `renderDetailSocial`, `detailTab`, 후기 시트 |
| `reviews` | 후기 전체 | 상세 `detMore`, `#reviews`, 사이드바 10 | `renderReviewsScreen`, 후기 작성 시트 공유 |
| `cook3` | 주력 조리 모드(신), 캐러셀 + `vpanel` | `#cook3`, 사이드바 5 | `cook3Car`, `toggleHf3`, `vpScript`, `hf3Reset`, `vpTimer` |
| `cook` | 기본 조리 모드(구) | `startCook`, `#cook`, 사이드바 6 | `cookCar`, 타이머/재료/핸즈프리 명령 가이드 |
| `cook2` | 핸즈프리 모드 구버전 스냅샷 | `#cook2`, 사이드바 7 | 정적 대화/단계 스냅샷 |
| `complete` | 완료 화면 | 캐러셀 마지막 단계, `#complete`, 사이드바 9 | 홈 이동, 다시 요리하기 |

## 오버레이와 보조 UI

| id/class | 역할 | 상태 관리 |
|---|---|---|
| `sheet` + `scrim` | 레시피 등록 바텀시트 | `openSheet`, `closeSheet`, `nav('sheet')`, `#sheet` |
| `ingSheet` | 재료 보기 시트 | `openIngredients`, `closeIngredients`, `#ingredients` |
| `timerSheet` | 타이머 설정 시트 | `openTimer`, `closeTimer`, `startCountdown`, `#timer` |
| `voiceModal` | 핸즈프리 명령 가이드 | `openVoice`, `closeVoice`, `#voice` |
| `reviewSheet` | 후기 작성 시트 | `openReviewSheet`, `closeReviewSheet`, `submitReview` |
| `toast` | 최소 안내/상태 피드백 | `toast(msg, icon)` |

## 라우팅 규칙 요약

- `nav(key)`는 우측 사이드바 진입점이다. 첫 줄에서 `hf3Reset()`을 호출하고 화면별로 시트/모달을 닫은 뒤 `show()`에 수렴한다.
- `show(id)`는 `.view.active`를 단일화하고 `setActiveNav(id)`를 호출한다. 화면별 렌더 훅은 `detail -> renderDetailSocial`, `reviews -> renderReviewsScreen`, `home -> hydrateHome`이다.
- `applyHash()`는 `flow.html` iframe과 직접 URL 진입용이다. 해시 처리 전 `closeSheet`, `closeVoice`, `closeIngredients`, `closeTimer`, `hf3Reset`으로 열린 상태를 정리한다.
- 새 화면 추가 시 `nav`, `applyHash`, 사이드바 버튼 3곳을 함께 갱신해야 한다.
- 현재 `sheet`, `ingredients`, `timer`, `voice`는 실제 view가 아니라 기존 view 위에 오버레이를 여는 해시/사이드바 상태다.

## cook3/vpanel 구조

- `cook3`은 `makeCarousel('cook3','cookTrack3')`로 생성된 `cook3Car`를 사용한다.
- 하단 `cook3Ctrl` 안의 `vpanel`은 `toggleHf3()`로 열리고 `runVp()`가 `vpScript`를 자동 데모한다.
- `vpScript`는 사용자 발화 타이핑, 생각 중, 답변 스트리밍, 일부 `next`와 `timer` 실행을 포함한다.
- `hf3Reset()`은 `vpTimers`, `vpTimerId`, 패널 클래스를 정리한다. `nav`와 `applyHash`가 호출하므로 화면 이탈 시 타이머 누수가 줄어든다.
- CLAUDE.md의 WebKit/Blink 합성-클립 함정 때문에 `vpanel`에는 transform/opacity 기반 등장 애니메이션을 추가하지 않는 것이 안전하다. 현재 패널은 `visibility` 중심 토글이다.

## 소셜/localStorage 구조

- 저장 키는 `cook.social`이다.
- `SEED`는 영상 id별 `{likes, liked, reviews}`를 제공하고 `seedSocial()`이 기존 데이터를 보존하며 누락 id만 채운다.
- 상세 화면은 항상 `DVID='21j8SASqLJU'`에 바인딩된다.
- `toggleLike`는 홈/상세 상태를 즉시 갱신하고, `submitReview`는 사진을 dataURL로 다운스케일 후 localStorage 용량 초과 시 사진을 제외해 재시도한다.
- 동적 HTML 주입 뒤 `lucide.createIcons()`를 재호출하는 패턴이 홈/상세/후기/토스트 등에 이미 있다.

## 상속 학습 대비 갭

| 렌즈 | 현재 상태 | 후속 보정 후보 |
|---|---|---|
| 모든 버튼 동작 | 검색/FAB/카드/저장/상세 탭/타이머/후기는 동작한다. 홈 카테고리, 섹션 `전체`, 프로필 아이콘은 클릭 가능해 보이지만 핸들러가 없다. 상세 히어로 재생 버튼도 시각적으로 재생 가능해 보이나 상태 안내가 없다. | W1-2, W1-8, `FIX-W0-1`, `FIX-W0-3` |
| 모바일 타이포/여백 | 본문 14~16px가 많지만 11~13px 보조 텍스트와 12px 이하 배지가 많다. 일부 gap은 7/9/10/11/12px로 8px 그리드와 섞여 있다. | W1-1 |
| 정보 밀도 | 상세 재료가 3열 그리드라 모바일에서 촘촘하다. 레시피 단계는 읽을 수 있으나 숨이 부족하다. | W1-4 |
| 주력 조리 경로 | PRD/CLAUDE 기준 주력은 `cook3`인데 상세 CTA `startCook()`는 `cook`으로 이동하고 `voice` 사이드바도 `cook`에 모달을 연다. | W1-5, `FIX-W0-2` |
| 영상 정직성 | 실제 iframe/재생 상태 없이 정적 썸네일과 재생 아이콘만 있다. 아직 "재생 중" 문구는 없지만 플레이 가능처럼 보이는 UI에는 폴백/상태 안내가 필요하다. | W1-6, `FIX-W0-3` |
| vpanel 정직성 | `vpScript` 자동 데모가 실제 음성 인식처럼 보일 수 있다. 시뮬레이션 표기와 사용자 진행 보장이 필요하다. | W1-6 |
| 접근성 | `<button>` 기반 컨트롤은 일부 확보되어 있으나 장식 div 클릭, 빈 `ic-btn`, 아이콘 라벨, aria 상태가 부족하다. | W2-2, `FIX-W0-4` |
| 한국어 카피 | 대부분 한국어다. `YouTube`, `off`, 구버전 스냅샷의 "핸즈프리 모드 off" 등 영어/혼용 표현이 남아 있다. | W2-1 |
| 다크 디자인 | cook3/cook/cook2는 다크지만 홈/상세/후기/완료는 라이트 톤이다. v3_2 다크 토큰과 현재 초록 브랜드 토큰의 통합 기준이 필요하다. | W1-1, W1-2~W1-9 |

## 후속 스토리 후보

- `FIX-W0-1`: 홈의 카테고리/섹션 전체/프로필 등 장식성 탭 요소를 화면 이동 또는 토스트 안내로 연결한다.
- `FIX-W0-2`: 상세 CTA와 사이드바 `voice` 진입을 주력 `cook3` 기준으로 정합한다.
- `FIX-W0-3`: 상세/cook3 영상 썸네일의 재생 아이콘을 상태 기반 안내로 바꾸고 거짓 재생 인상을 없앤다.
- `FIX-W0-4`: 주요 아이콘 버튼, 별점, 시트 닫기, 패널 닫기에 aria-label/상태 라벨을 추가한다.

위 후보는 기존 W1/W2 화면 단위 스토리와 겹치므로 PRD에 작은 보정 스토리로 추가하되, 이미 존재하면 다시 추가하지 않는 idempotent 규칙을 따른다.

## 검증 체크 포인트

- W0 문서 산출 후에도 현재 앱 기준으로 `<script>` 추출 `node --check`를 통과해야 한다.
- 대표 화면은 `app.html#home` 또는 `app.html#cook3`를 시스템 Chrome 헤드리스로 캡처하고 콘솔 에러 0을 확인한다.
- `scripts/ralph/screenshots` 산출물은 커밋 금지 대상이므로 검증 후 git에는 포함하지 않는다.
