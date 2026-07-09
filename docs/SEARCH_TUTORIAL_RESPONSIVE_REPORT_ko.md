# 검색·따라해보기·반응형 검증 작업 리포트

- 작성일: 2026-07-09
- 기준 URL: `http://127.0.0.1:4876`
- 최종 검증: PASS
- 기존 점수표 결과: 130 / 130, 100%

## 반영 내용

1. 검색 화면에서 요리 결과와 크리에이터 결과를 분리했다.
   - Maangchi는 크리에이터 빠른 검색어와 크리에이터 결과 행으로 표시된다.
   - Maangchi 검색 시 실제 요리들은 별도의 요리 카드로 유지된다.
   - 요리 빠른 검색어와 크리에이터 빠른 검색어를 분리했다.

2. 조리 모드 튜토리얼을 화면 전체 덮개에서 내부 안내 패널로 바꿨다.
   - 조리 카드 아래에 패널이 붙어 현재 단계 카드를 가리지 않는다.
   - `다시 보지 않기`를 누르기 전에는 다시 조리 모드에 들어갈 때 안내가 다시 보인다.
   - Fold 접힘 폭에서도 안내 문구가 줄임표로 잘리지 않게 보정했다.

3. 랜딩 히어로 CTA 부담을 줄였다.
   - 히어로 CTA는 앱 진입과 베타 신청으로 줄였다.
   - 레시피 요청은 하단 폼에서 유지한다.
   - Notion 어휘 후보 체크가 0개라서 `지금 써보기`, `미리 써보기 신청` 같은 문구 교체는 적용하지 않았다.

4. 반응형 검증 루프를 확장했다.
   - `iPhone 16`, `iPhone 16 Pro Max`, `Galaxy Fold 접힘`, `Galaxy Fold 펼침`에 가까운 뷰포트를 추가했다.
   - 검색 크리에이터 상태를 캡처 검증 상태에 추가했다.
   - active view가 두 개 이상 뜨는 회귀를 잡도록 `activeViewCount` 검사를 추가했다.

## 검증 결과

- `npm run check`: PASS
- `npm run verify:mobile-flow -- http://127.0.0.1:4876 9485`: PASS
- `npm run verify:app-screens -- http://127.0.0.1:4876 /tmp/naembi-app-screens-20260709-r3 9484`: PASS
  - 77개 앱 내부 상태 검사
  - 실패 0건
- `npm run verify:ralph-loop -- --base-url=http://127.0.0.1:4876 --rounds=1 --max-minutes=5 --interval-seconds=5`: PASS
  - 130 / 130
  - 100%
  - 96% 초과 기준 만족

## 확인한 화면

- `/tmp/naembi-app-screens-20260709-r3/mobile-short-search-creator.png`
- `/tmp/naembi-app-screens-20260709-r3/fold-closed-cook3-hint.png`

## 남은 논의

- Notion 어휘 후보 페이지에서 체크된 항목이 아직 없어서 문구 후보 교체는 보류했다.
- 후보가 체크되면 `npm run notion:copy-candidates:read`로 승인 항목만 읽고 문구를 반영한다.
