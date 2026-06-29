# Fan-out 검증 라운드 1 (완주 후 종합·적대적) — 2026-06-28

> 23/23 완주 후 4개 적대적 에이전트(다크디자인 / 모든버튼·카피 / 핸즈프리·영상 / 아키텍처·접근성)로 코드+스크린샷 검증. skeptic 필터 적용.
> 확정 발견점은 FIX-01~05 보정 스토리로 주입.

## 심각 (정직성/핵심)
- **[심각] "재생 중" 거짓 UI** — playerReady(=cued)면 "YouTube 구간 재생 중" 단정, onExpand도 상태 무관 "재생 중" 스낵바. 실제 PLAYING 무관. → 상태기반(onStateChange PLAYING) 표기. (FIX-01)
- **[심각·미검증] 영상 실제 재생 증거 0** — 스크린샷(PE-03-cook-video-wait/late)이 "YouTube 연결 중" 폴백, IFrame 미재생. VERIFICATION §6대로 **미검증** 처리. 에뮬 WebView91 한계 → 실기기/최신 WebView 필요. 코드 경로(seek/endSec/loop/replay)는 실재. (FIX-01 정직 표기 + 실기기 백로그)

## 높음
- **[높음] onReady 타임아웃 폴백 부재** — onReady/onError 둘 다 안 오면 "연결 중" 영구 정지. → LaunchedEffect 8s 타임아웃 시 onUnavailable. (FIX-01)
- **[높음] RecipeDetail 영상 썸네일 dead UI** — 재생처럼 보이나 onClick 없음(유일한 진짜 무반응). → showInfo 연결. (FIX-02)
- **[높음] 접근성 contentDescription 전무** — grep=0. 모든 아이콘/별점/탭이 글리프. → semantics/contentDescription, 별점 stateDescription. (FIX-03)
- **[높음] 색 토큰 하드코딩 일탈 대량** — 서피스(#151515/#1E1E1E/#1A1A1A)·보더(#2E2E2E/#2A2A2A)·서브텍스트(#CCCCCC/#BBBBBB) 산재. 배경 #0D0D0D(Done/Import)≠v3_2 #0A0A0A. → CookflowColors 토큰 치환. (FIX-04)

## 중간
- 카드 목적지 불일치(순두부/탐색 카드 → 전부 계란덮밥 상세) → 미지원 카드 showInfo "준비 중". (FIX-02)
- 영어 누수 STEP/Mic/YOUTUBE → 단계/마이크/유튜브. (FIX-05)
- Muted #555 대비 ≈1.6:1 (AA 미달) → 보조텍스트 ≥Sub #999. (FIX-03)
- 선제 안내 2/3 누락(타이머 10초전·정체) → 트리거 추가. (FIX-01)
- 더킹 overclaim(AudioFocus 장식적, setVolume만 실제) → 문구 정직화. (FIX-01)
- 8dp 그리드 위반(10/12/14dp 다수) + Review 재료 2열 바둑판 → 8배수·1열/간격. (FIX-04)
- 중복함수 cookFormatTime/Duration, 이중 loadVideo, 타이머 드리프트 → 정리. (FIX-01/04)

## 낮음
- 셰프 페르소나 접두사 톤 불일치, fontSize 직접지정(theme 우회), empty list 크래시 가드.

## 기각 (skeptic — false positive)
- **"MVP 5화면 → 9화면 = 스코프 드리프트"**: 사용자가 화면 확장(상세/탐색/저장함/설정)을 **명시 요구**(USER_REQUESTS §5, PC-06~09)했으므로 드리프트 아님. 유지.

## 양호 (확정)
- 자동진행 없음(페이싱)·showVideo 슬라이드 숨김·loop/replay seek 코드 실재·하단탭 균등분할·48dp 터치·공유 Intent·페르소나 3종 톤 분기·DisposableEffect 정리.
