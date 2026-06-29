# Cookflow Android — 제품 브리프 (권위 문서)

상태: active · 2026-06-28 · 스택: **Kotlin + Jetpack Compose (네이티브 Android)**

> 스코프를 지어내지 않게 고정하는 권위 문서. 충돌 시 이 문서 우선.
> 디자인 진실: `docs/reference/cookflow_v3_2_interactive.html` · UI 규칙: `docs/UI_FEEDBACK_ko.md`(필독).
> 팀: 이 저장소는 **Android**. iOS는 별도 담당 → 공통은 디자인 레퍼런스 + 데이터 계약만 맞춘다.

## 1. 한 줄
유튜브 요리 영상을 분석해 **핸즈프리 조리**를 돕는 앱. "영상 보며 요리하다 손 더럽혀지는 문제" 해결. 영상이 **내 속도에 맞춰** 단계별 구간을 재생하고, **능동형 AI 비서**가 선제적으로 챙긴다.

## 2. 가장 위험한 것 = 먼저 검증 (Phase B 스파이크)
풀 빌드 전 **영상 연동 4가지를 에뮬레이터에서 실제 동작 확인**:
- (a) 유튜브 임베드 + 구간 `seekTo(startSec)` 재생 (android-youtube-player)
- (b) 오디오: 정상 / 비서 대화 중(볼륨↓·무한반복, AudioManager 오디오포커스 DUCK 또는 TTS) / 일시정지(off)
- (c) 반복(loop: 구간 끝→시작 복귀) vs 다시보기(replay once: 시작점 1회 이동)
- (d) 단계 ↔ 타임스탬프: 단계 이동 시 해당 구간 시작점 자동 seek
> 볼륨 더킹이 임베드에서 불안정하면 **대안(영상 음소거 + 비서 TTS 레이어)** 로 설계 전환하고 리포트.

## 3. 화면 5개 (MVP)
1. **홈** — AI 추천 버블(냉장고 재료 기반) · 퀵칩 · 추천/트렌딩 카드
2. **영상 가져오기 + 페르소나** — URL 분석 미리보기 · 페르소나 이모/엄마/셰프
3. **조리 전 리뷰** — 헤더 · 재료(밀도 완화된 리스트) · 단계+타임스탬프(탭 seek)
4. **핸즈프리 조리** [핵심·최복잡] — 아래 §4
5. **완료** — 사진+메모 · 저장 · 별점/평가 · 타인 후기 · 공유

## 4. Screen 4 — 핸즈프리 조리 (핵심)
- 상단 ~32% 영상(현재 단계 구간 자동재생) + 오버레이(STEP n/6·타임스탬프·재생바·재생/정지) + [↩구간 다시보기][🔁반복].
- 하단 단계 카드: 6분할 진행바 · 현재 동작 큰 글씨 + 보조 · 이전완료/다음예고 peek · 이전/다음 버튼.
- **플로팅 비서**: 작은 버블 ↔ 확장 대화. 단계 진입/타이머 10초 전/정체 시 선제 안내(assistantAlert). 이전 말풍선 유지, 아래 스와이프로 최소화.
- **영상 동적 표시/숨김**: 단계 `showVideo:false`(예: 달걀 스크램블)면 영상 슬라이드업 숨김 → 비서+타이머 중앙 확장. 탭으로 복귀.
- **볼륨 더킹**: 비서 말할 때 영상↓+반복, 끝나면 복구.
- **타이머**: 단계 카드 우상단 뱃지 → 바텀시트(Canvas 링 + 프리셋 30초/1분/2분/5분 + 시작/정지/초기화). (Dynamic Island는 iOS 담당 — Android는 포그라운드 서비스+알림은 post-MVP)
- **음성명령 UI만**(STT는 MVP 제외): 다음/이전/다시/타이머/영상/줄여줘.
- 페이싱: 자동 진행 금지 — 사용자가 "다음"(탭/음성).

## 5. 데이터 모델 (iOS와 공통 계약)
`Recipe{ videoId, title, channel, duration, ingredients[], steps[] }`
`Step{ index, title, main, sub, startSec, endSec, timerSec, showVideo, assistantAlert, prevText, nextText }`
히어로 픽스처: **이연복 계란덮밥** `videoId=EMTMscHNDjc`, 6단계(레퍼런스 HTML/프롬프트 값 그대로). 실제 스크래핑/자동분석은 MVP 제외 — 픽스처 사용.

## 6. 기술 결정 (드리프트 방지)
- Kotlin + Compose, 단일 Activity + Navigation-Compose(5 화면).
- 툴체인(권장 known-good): AGP 8.5.2 · Gradle 8.7(wrapper) · Kotlin 1.9.24 · Compose BOM 2024.06.00 · compileSdk 34 · minSdk 26 · JDK 17+(이 머신 21). compileSdk/build-tools 34 미설치 시 `sdkmanager`로 설치.
- 유튜브: `com.pierfrancescosoffritti.androidyoutubeplayer:core` (IFrame 래퍼, seek/볼륨/loop).
- 애니메이션: Compose 내장(animate*AsState, AnimatedVisibility) + 제스처(pointerInput).
- 다크 테마 고정, 색은 UI_FEEDBACK 토큰.

## 7. 스코프 가드레일
- MVP 포함: 5화면 내비 · 유튜브 임베드+구간seek+볼륨제어 · loop/replay · 6단계 상태 · showVideo 슬라이드 · 플로팅 비서(선제 안내·확장/축소) · 볼륨 더킹 · 타이머 바텀시트(링) · 음성명령 UI · 별점.
- 제외(후속): 실제 STT · 유튜브 자동분석 · Dynamic Island 네이티브 · 냉장고 트래킹 · 실제 카메라 · 백엔드/DB.
- **모든 버튼 실제 동작(dead UI 금지)**, 모바일 네이티브 가독성/여백(UI_FEEDBACK 준수).

## 8. 성공 기준
- Phase B 4가지 에뮬레이터 실증.
- 5화면이 v3_2 다크 디자인과 일치하고 모든 in-screen 버튼이 동작.
- Screen4 핸즈프리 루프(단계 이동·구간 재생·비서·타이머)가 이연복 픽스처로 끊김 없이.
- `./gradlew assembleDebug` green + 에뮬레이터 렌더 스크린샷 확보.
