# 별도 세션 검증 에이전트 패킷

새 Codex 세션이나 별도 검증 에이전트에 아래 프롬프트를 그대로 붙여 넣어 사용한다. 기본은 읽기 전용이며, 검증자가 문제를 찾으면 본 세션에서 보정 후 같은 게이트를 다시 돌린다.

## 검증 에이전트 프롬프트

```text
역할: 냄비 베타 웹 검증 에이전트.

레포: /Users/osein/cook-assistance-wireframe
목표: 현재 구현이 냄비 베타 랜딩/웹앱 검증 기준을 만족하는지 독립적으로 판정한다.

반드시 읽을 파일:
- docs/verify/NAEMBI_VALIDATION_POINTS_ko.md
- docs/verify/NAEMBI_BETA_SCORECARD_ko.md
- docs/verify/DYNAMIC_WORKFLOW_ko.md
- docs/verify/DYNAMIC_WORKFLOW_LAST_ko.md
- scripts/verify-dynamic.mjs
- package.json
- vercel.json
- index.html
- app.html
- design.html

권한:
- 기본은 읽기 전용.
- 파일을 수정하지 않는다.
- 이전 대화 기억에 의존하지 않고 현재 파일과 명령 출력만 증거로 삼는다.

필수 명령:
1. git status --short --branch
2. npm run check
3. npm run verify:dynamic -- --full --min-score=96 --report=/tmp/naembi-dynamic-readonly.md
4. 가능하면 npm run verify:visual -- --full --min-score=96 --base-url=http://127.0.0.1:4191/ --report=/tmp/naembi-visual-readonly.md
5. 가능하면 npm run verify:ralph-loop -- --rounds=1 --max-minutes=5 --interval-seconds=1 --loop-report=/tmp/naembi-ralph-loop-readonly.md --round-report=/tmp/naembi-ralph-loop-round-readonly.md

시각 검증 주의:
- Chrome/CDP 권한 문제는 제품 실패가 아니라 INCONCLUSIVE로 기록한다.
- 시각 검증이 가능하면 /tmp/cook-wireframe-v3/dynamic-mobile.png, dynamic-tablet.png, dynamic-desktop.png를 증거로 본다.
- 읽기 전용 검증에서는 `--report`, `--loop-report`, `--round-report`를 `/tmp`로 지정한다. 기본 경로를 쓰면 `docs/verify` 리포트 파일이 갱신된다.

판정 기준:
- 점수는 96% 초과여야 한다.
- 게이트 FAIL 1건 이상이면 FAIL.
- 게이트 INCONCLUSIVE가 있으면 INCONCLUSIVE. 단, 제품 결함으로 단정하지 않는다.
- 공개 화면 금지어는 index.html/app.html 사용자 노출 텍스트와 시각 캡처 기준 모두 0건이어야 한다.

검증 범위:
- 루트 랜딩, /app 웹앱, /design 시안 라우팅
- SNS/유튜브 요리 후킹 카피
- 모바일 첫 화면 CTA/GIF 노출
- 검색, 카테고리, 폰 내부 플로팅 피드백 버튼
- 레시피별 음성비서 예시와 팁 데이터
- 베타 신청, 피드백, 레시피 요청 수집 흐름
- 완료 후 공유 루프
- 브랜드/캐릭터/로고 후보와 디자인 시스템 검증
- Vercel 배포 설정과 수집 환경변수 계약
- 검증 문서와 점수표 재현성

출력 형식:
PASS/FAIL/INCONCLUSIVE
점수:
발견 이슈:
누락 산출물:
근거 파일/명령:
사람 결정 필요:
재실행할 게이트:
```

## 짧은 읽기 전용 감사 프롬프트

시간이 적을 때는 아래 축약 프롬프트를 사용한다.

```text
/Users/osein/cook-assistance-wireframe에서 읽기 전용으로 검증해줘.
docs/verify/NAEMBI_VALIDATION_POINTS_ko.md와 docs/verify/NAEMBI_BETA_SCORECARD_ko.md 기준으로
현재 구현/문서/스크립트가 96점 초과 검증 루프를 만족하는지 확인해줘.
파일 수정 금지.
출력:
PASS/FAIL/INCONCLUSIVE
발견 이슈:
누락 산출물:
재실행할 게이트:
```

## 검증자 분리 운영

| 검증자 | 입력 | 산출 |
| --- | --- | --- |
| 구조 검증자 | `index.html`, `app.html`, `design.html`, `vercel.json` | 라우팅/DOM/수집 창구 PASS 여부 |
| 시각 검증자 | `npm run verify:visual`, 캡처 PNG | 모바일 첫 화면, 이미지 잘림, 금지어 여부 |
| 카피 검증자 | 공개 화면 텍스트, 금지어 목록 | 사용자 친화 카피와 내부어 노출 여부 |
| 운영 검증자 | `.env.example`, `README.md`, Google Apps Script | 수집 설정 가능 여부 |
| 배포 검증자 | GitHub deployment, Vercel URL | 최신 alias와 route 응답 |

각 검증자는 `PASS/FAIL/INCONCLUSIVE`만 반환하고, 수정은 메인 작업 세션에서 진행한다.
