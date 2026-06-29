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
