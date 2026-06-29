# Cookflow Android — 사용자 요구사항 / 결정 기록 (재검증용)

> 대화에서 사용자가 지시·결정한 모든 내용을 정리. **나중에 "요구대로 됐는지" 재검증**할 때 이 문서를 체크리스트로 사용.
> 상태: ✅반영 · 🔨빌드 백로그 · 🧩예정/후속 · 📌원칙
> 관련: `PRODUCT_BRIEF.md`(권위) · `UI_FEEDBACK_ko.md`(UI) · `scripts/ralph/prd.json`(백로그) · `docs/reference/cookflow_v3_2_interactive.html`(디자인 진실)

## 1. 프레임워크 결정 (논의 → 확정)
- RN(Expo) → Flutter → Kotlin 검토. **확정: Kotlin + Jetpack Compose 네이티브 Android.** → ✅ PRODUCT_BRIEF, 스택
- 이유: **내 파트가 Android, iOS는 다른 사람**이 별도 진행 → 크로스플랫폼 불필요, 네이티브가 최선. 볼륨 더킹도 AudioManager로 네이티브가 유리. → ✅
- "선제지식 먼저"는 별도 학습 대신 **Phase B 영상 스파이크로 핵심 리스크 검증과 동시에** 쌓기. → ✅ PB-01
- 검증 환경: 이 맥에 JDK21·Android SDK·에뮬레이터 있어 **컴파일+에뮬 실행+스크린샷 자가 검증 가능**. → ✅

## 2. 제품 스펙 (v3_2 + RN 프롬프트 → Kotlin 이식)
- Cookflow: 유튜브 요리 영상 핸즈프리 조리 앱. 핵심="영상 보며 요리하다 손 더럽혀지는 문제" 해결. → ✅ §1
- 5화면: 홈 / 영상가져오기+페르소나 / 조리전 리뷰 / 핸즈프리 조리 / 완료. → 🔨 PC-01~05
- 히어로 픽스처: **이연복 계란덮밥 EMTMscHNDjc**, 6단계(startSec/endSec/timerSec/showVideo/assistantAlert/prev/next). → 🔨 PA-03
- 페르소나: 이모/엄마/셰프. → 🔨 PC-02, PD-03
- 다크 테마 고정, v3_2 색/레이아웃 일치. → 📌 UI_FEEDBACK

## 3. 영상 연동 — 먼저 검증 (Phase B)
구현 전 4가지 에뮬레이터 실증: (a)구간 seekTo (b)볼륨 정상/대화중 더킹(반복)/정지 (c)loop vs 다시보기 (d)단계↔타임스탬프 자동 seek. → 🔨 PB-01
- 볼륨 더킹이 임베드서 불안정하면 **대안(음소거+TTS)** 설계 전환·기록. → 📌 PB-01/PD-04

## 4. Screen 4 핸즈프리 (핵심)
영상 상단~32% 구간재생 + 하단 단계카드 + **플로팅 비서(선제 안내·확장/축소)** + showVideo 동적 표시/숨김 + 볼륨 더킹 + 타이머 바텀시트(링) + 음성명령 UI(STT 제외) + 페이싱(자동진행 금지). → 🔨 PC-04, PD-01~05

## 5. UI / 인터랙션 요구 (★ 핵심)
- 📌 **모든 버튼이 실제 동작.** 화면 있으면 그 화면으로, **없으면 최소 안내(alert/스낵바)**. 무반응(dead UI) 0. → 🔨 PG-01(안내 시스템), PE-04(최종 점검)
- 📌 **화면 갯수를 실제 기능에 맞춰 늘림**: 레시피 상세·탐색(퀵칩)·저장함(요리북)·내설정 등. → 🔨 PC-06~09
- 📌 이전 모바일 피드백 전부 반영: 타이포 14~16sp·행간·한글 줄바꿈, 8dp 여백, 48dp 터치, 정보밀도 완화, 고정 하단탭바, 웹 대시보드 느낌 금지. → ✅ UI_FEEDBACK_ko.md, 🔨 PE-02
- 제공한 v3_2.html은 화면 안 버튼이 안 눌렸음 → **인터랙티브 버전으로 수정**(모든 in-screen 버튼 클릭 동작). → ✅ docs/reference/cookflow_v3_2_interactive.html

## 6. 작업 방식 (프로세스)
- 📌 **ralph-loop**로 검증 루프(codex 새 세션, green-gate=`./gradlew assembleDebug`). → ✅
- 📌 **전부 자율 진행, 승인 절대 받지 않음, 무조건 yes.** 결과물 나오기 전까지 멈추지 않기. → ✅ 적용 중
- 📌 **2~3시간, 최대 7~8시간 자율** 가능하게. → ✅ 백그라운드 루프 + 헬스체크
- 📌 **한글 progress/리포트** + 최종은 **명시적 MD(`docs/FINAL_REPORT_ko.md`)** 로 저장(7-8h 뒤 확인). → ✅ REPORT_ko.md, 🔨 FINAL_REPORT
- 📌 **17개로 먼저 완주 → 완주 후 fan-out으로 빈틈 채움.** → ✅ 헬스체크 완주 분기에 fan-out 연결
- 📌 UI 부분 필요 시 자율로 세분화. → ✅ 추가 6스토리 주입(PG-01/PC-06~09/PE-04)
- 📌 **언급한 내용 모두 MD 문서화 후 진행**(재검증용). → ✅ 이 문서 + UI_FEEDBACK + PRODUCT_BRIEF
- 📌 **원본 보존**: 웹 프로토타입·Downloads의 v3_2 원본 무수정, Android는 별도 cookflow-android. → ✅

## 7. 재검증 체크리스트 (완주 후 이걸로 점검)
- [ ] 5+추가 화면 모두 다크 디자인(v3_2 색) 일치
- [ ] **모든 버튼**이 화면 이동 또는 안내로 반응(무반응 0)
- [ ] PB 영상 4종(구간seek/볼륨/loop/단계매칭) 에뮬레이터 동작 + 더킹 결론 기록
- [ ] 핸즈프리: 비서 선제안내·확장축소, showVideo 슬라이드, 타이머 링, 음성명령 UI
- [ ] 타이포 14~16sp·8dp·48dp·정보밀도·하단탭바 = UI_FEEDBACK 준수
- [ ] 이연복 픽스처로 홈→완료 흐름 끊김 없음
- [ ] `./gradlew assembleDebug` green + 화면 스크린샷
- [ ] 한글 최종 리포트(FINAL_REPORT_ko.md) 존재
- [ ] 완주 후 fan-out 보정 반영

> 새 요구가 생기면 이 문서에 계속 append 하고, 완주 후 7장 체크리스트로 재검증한다.
