# 냄비 베타 웹 검증 포인트 전체 목록

이 문서는 냄비 베타 랜딩과 웹앱을 수정할 때 반드시 확인해야 하는 검증 포인트의 기준 목록이다. 공개 사용자 화면, 모바일 앱형 화면, 수집 흐름, 디자인 정체성, 배포 준비도를 한 번에 점검하기 위한 원본 체크리스트로 사용한다.

## 1. 공개 진입 경로

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 루트 랜딩 | `/`는 제품 소개와 베타 모집 랜딩이어야 한다. 기존 단일 앱 화면이나 내부 검증 화면이 바로 뜨면 실패다. | `index.html`, `vercel.json` |
| 웹앱 | `/app`은 모바일 앱처럼 쓰는 실제 웹앱 홈으로 들어가야 한다. | `app.html`, `vercel.json` |
| 디자인 시안 | `/design`은 브랜드/캐릭터/레이아웃 후보와 검증 근거를 보여줘야 한다. | `design.html`, `vercel.json` |
| 하위 경로 | `/app/:path*`, `/design/:path*`도 각 HTML entry로 rewrite되어 404가 나면 안 된다. | `vercel.json` |

## 2. 사용자 후킹과 카피

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 핵심 후킹 | “SNS/유튜브 요리를 보긴 하는데 따라 하기 어렵다”는 사용자 문제를 첫 화면에서 바로 말해야 한다. | `index.html` |
| 기술어 배제 | “단계별 제공”, “베타 웹앱”, “API”, “Vercel”, “GitHub”, “프로토타입” 같은 내부/기술 중심 표현은 공개 화면에 노출하지 않는다. | `scripts/verify-dynamic.mjs` 금지어 가드 |
| 행동 CTA | 사용자는 첫 화면에서 바로 앱 체험, 베타 신청, 레시피 요청 중 하나를 할 수 있어야 한다. | `index.html` |
| 작은 냄비 카피 | “작은 냄비가 옆에서 챙겨요” 계열의 감성 문구는 유지하되 모바일 첫 화면을 가리면 실패다. | `index.html`, visual capture |

## 3. 모바일 반응형

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 모바일 우선 | 390x844 기준 첫 화면에서 CTA와 핵심 앱 GIF가 모두 보이고, 과한 스크롤 압박이 없어야 한다. | `scripts/capture-landing.mjs`, `/tmp/cook-wireframe-v3/dynamic-mobile.png` |
| 앱 캡처 | 모바일에서 앱 캡처들은 세로로 길게 누적하지 않고 가로 스와이프/스크롤로 보여야 한다. | `index.html`, visual capture |
| 이미지 잘림 | 앱 화면 캡처와 GIF는 `object-fit: cover`로 잘리면 안 된다. | `scripts/capture-landing.mjs` |
| 버튼 겹침 | 폰 화면 내부 플로팅 버튼은 CTA, 완료 버튼, 조리 화면 핵심 UI를 가리면 실패다. | `app.html`, app screenshot |

## 4. 랜딩 안 상호작용

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 음성비서 중심 소개 | 요리 음성비서가 핵심 기능임을 서비스 소개에서 분명히 보여줘야 한다. | `index.html` |
| 설문형 추천 | 자유 입력 없이도 선택지를 누르면 레시피 하나를 추천하고 `/app#detail=<id>`로 이어져야 한다. | `index.html` |
| 인터랙션 GIF | GIF는 사진 앨범처럼 정적 이미지가 넘어가는 방식이 아니라 실제 검색, 상세 진입, 조리, 음성 도움, 완료 흐름을 보여야 한다. | `scripts/capture-core-flow-gif.mjs`, `assets/screens/naembi-core-flow.gif` |
| 앱 화면 소개 | 홈, 검색, 상세, 조리, 완료 화면이 랜딩에서 전체 비율로 확인되어야 한다. | `assets/screens/app-*.png`, `index.html` |

## 5. 앱 홈과 검색

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 검색 동작 | 요리 제목, 재료, 유튜버/창작자 이름, 요약/메타 텍스트로 검색되어야 한다. | `app.html` |
| 카테고리 | 검색 아래 카테고리는 “요즘 뜨는”, “많이 만드는”, “재료 적게”, “10분 컷”처럼 웹앱 목적에 맞아야 한다. | `app.html` |
| 피드백 위치 | 피드백은 검색 아래 카테고리가 아니라 모바일 폰 화면 내부 오른쪽 하단 플로팅으로 있어야 한다. | `app.html` |
| 신규 반영 중복 제거 | “신규 추가”, “요청반영”처럼 같은 의미가 반복되는 카테고리는 제거한다. | `app.html` |

## 6. 레시피와 음성비서 데이터

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 레시피별 데이터 | 음성비서 예시, 재료 대체, 조리 팁이 모든 레시피에서 순두부찌개 데이터로 반복되면 실패다. | `app.html` |
| 실제 임베드 | 레시피 영상은 임베드 가능한 YouTube 기준을 지켜야 한다. | `app.html`, recipe metadata |
| 타임코드 | 조리 단계 start/end는 단조 증가하고 확인 가능한 값만 써야 한다. | `app.html`, validator |
| 추천 후보 | 사람을 후킹하기 좋은 SNS형 메뉴가 홈/랜딩에서 먼저 노출되어야 한다. | `app.html`, `index.html` |

## 7. 피드백과 수집

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 베타 신청 | 이메일 기반 베타 신청 폼이 있고 성공/실패 메시지를 제공해야 한다. | `index.html`, `api/beta-signup.js` |
| 피드백 | 앱 안에서 의견/후기/레시피 요청으로 이어지는 수집 창구가 있어야 한다. | `app.html`, `api/feedback.js` |
| 레시피 요청 | 보고 싶은 SNS/유튜브 요리를 보낼 수 있어야 한다. | `index.html`, `app.html` |
| 저장 계약 | Google Form/Sheet, webhook, GitHub issue 중 하나로 저장 가능한 환경변수 계약이 문서화되어야 한다. | `.env.example`, `README.md`, `docs/handoff/GOOGLE_FORM_VERCEL_SETUP_GUIDE_ko.md` |
| 운영뷰 | Google Sheet 운영뷰는 사람이 보기 좋은 컬럼과 원본 field id를 함께 관리할 수 있어야 한다. | `scripts/google-apps-script/create-naembi-beta-collection.js` |

## 8. 후기, 공유, 커뮤니티 현실성

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 더미 후기 | 베타 단계에서는 실제 커뮤니티처럼 보이되 더미/운영 큐레이션 한계를 문서에서 분리해야 한다. | `app.html`, `design.html` |
| 완료 공유 | 요리 완료 후 친구에게 공유하기가 랜딩 유입 URL로 이어져야 한다. | `app.html` |
| 현실성 검토 | 후기/상호작용 기능은 베타에서 가능한 것과 앱 출시 후 필요한 인증/모더레이션/스토리지를 구분해야 한다. | `design.html` |

## 9. 브랜드와 디자인 정체성

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 냄비 캐릭터 | 김 물결 3개, 재생 버튼 코, 웃는 입, 귀처럼 보이는 손잡이, 냄비 밑부분 실루엣 규칙이 검토되어야 한다. | `design.html` |
| 로고 후보 | 한글/심볼/다크/app icon 후보가 별도 페이지에서 비교되어야 한다. | `design.html` |
| 디자인 시스템 | 색, 타입, 반경, 컴포넌트 원칙이 “AI가 만든 듯한” 범용 카드 UI를 피하도록 정리되어야 한다. | `design.html` |
| 서비스 배치 후보 | 음성비서 중심, 검색 중심, 공유 루프 중심 배치 후보가 비교되어야 한다. | `design.html` |

## 10. 배포와 운영

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| Vercel 정적 배포 | 별도 빌드 없이 정적 HTML과 서버리스 API가 배포되어야 한다. | `vercel.json`, `package.json` |
| 공개 도메인 | 실제 공유 도메인이 최신 Vercel 프로젝트 alias를 바라봐야 한다. 이전 프로젝트 alias면 404나 오래된 화면이 뜬다. | live `curl -I` |
| 배포 제외 | 내부 문서, 스크립트, `.env`는 배포 산출물에서 제외한다. | `.vercelignore` |
| GitHub 연동 | 기본 브랜치 `main` push가 Vercel deployment를 생성해야 한다. | GitHub deployment status |

## 11. 검증 루프

| 포인트 | 기준 | 주요 증거 |
| --- | --- | --- |
| 빠른 검증 | `npm run verify:dynamic -- --full --min-score=96`이 정적/API/배포/문서 게이트를 확인해야 한다. | `scripts/verify-dynamic.mjs` |
| 시각 검증 | `npm run verify:visual -- --full --min-score=96`이 모바일/태블릿/데스크톱 캡처를 확인해야 한다. | `scripts/capture-landing.mjs` |
| 점수표 | 점수표는 별도 문서로 분리되어 다음 세션이 그대로 읽을 수 있어야 한다. | `docs/verify/NAEMBI_BETA_SCORECARD_ko.md` |
| 검증 에이전트 | 별도 세션에서 붙여넣을 검증 에이전트 패킷이 있어야 한다. | `docs/verify/VALIDATION_AGENT_PACKET_ko.md` |
| Ralph 루프 | 점수 96점을 초과할 때까지 반복 실행하는 루프 명령이 있어야 한다. | `scripts/run-naembi-ralph-loop.mjs` |
