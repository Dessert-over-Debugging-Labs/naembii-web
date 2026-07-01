# Figma 쓰기형 MCP 셋업 가이드 (사용자 직접 수행)

와이어프레임을 Figma에 **그리려면** 쓰기 가능한 MCP가 필요합니다. Framelink·Figma REST·공식 Dev Mode MCP는 모두 **읽기 전용**이라 프레임/텍스트 생성이 불가합니다. 그리기가 되는 성숙한 옵션은 **플러그인 브리지형**(예: `cursor-talk-to-figma-mcp`, "TalkToFigma") — MCP 서버 + Figma 플러그인이 로컬 WebSocket으로 통신하며 `create_frame`/`create_text`/`create_rectangle`/`export_node_as_image` 등을 노출합니다.

> 아래 5단계 중 **1~4는 사람만 할 수 있는 작업**입니다(플러그인 설치·파일 열기·브리지 실행·채널 조인). 완료 후 세션을 재시작하면 에이전트가 F0 스파이크부터 자율로 그립니다.

## 0. 사전 요구
- Figma 데스크톱 앱(또는 브라우저 편집 권한) + 그릴 대상 Figma 파일.
- `bun`(또는 `node`/`npx`) 설치. (`brew install oven-sh/bun/bun` 또는 https://bun.sh)

## 1. WebSocket 브리지(릴레이) 실행
로컬에서 MCP ↔ 플러그인을 잇는 소켓 서버를 켭니다. (패키지/명령은 사용 버전에 맞게 확인)
```bash
bunx cursor-talk-to-figma-socket     # 또는 저장소 클론 후 `bun socket`
```
> 정확한 패키지명·명령은 설치 시점 문서로 확인하세요(카테고리=플러그인 브리지 쓰기 MCP는 안정적).

## 2. Figma 플러그인 설치 + 대상 파일 열기
> ⚠️ 이 플러그인은 **커뮤니티 검색에 안 뜰 수 있습니다.** 아래 A(직접 링크) 또는 B(수동 임포트)로 설치하세요.

**A. 커뮤니티 직접 링크** — 검색창 대신 URL로 바로 진입:
- https://www.figma.com/community/plugin/1485687494525374295/talk-to-figma-mcp-plugin

**B. 로컬 개발 플러그인 수동 임포트 (가장 확실, Figma 데스크톱 앱 전용)**:
```bash
git clone https://github.com/grab/cursor-talk-to-figma-mcp.git
# (원 저장소 sonnylazuardi/... 가 grab/ 로 이전됨)
```
- Figma 데스크톱 → 메뉴 → **Plugins → Development → Import plugin from manifest…**
- 클론 폴더의 `src/cursor_mcp_plugin/manifest.json` 선택 → 개발 플러그인 목록에 등록.
- (대안: Claude 특화 포크 `arinspunk/claude-talk-to-figma-mcp`)

- **그릴 대상 파일을 열고** 페이지 하나를 `Cookflow Wireframes`로 만들어 둡니다.

## 3. 플러그인 실행 → 채널 조인
- 플러그인 실행 → "Connect" → 표시되는 **채널 ID**를 복사.
- 리포에 `.env` 생성 후 채널 값 입력:
  ```bash
  cp .env.example .env
  # .env 의 FIGMA_CHANNEL 를 복사한 채널 ID로 교체
  ```
- `scripts/ralph-figma/prd.json` 의 `figma.channel` 도 같은 값으로 교체(에이전트가 join_channel에 사용).

## 4. MCP 등록 확인
- 리포 루트 `.mcp.json` 에 `TalkToFigma` 서버가 이미 정의돼 있습니다(이 세팅으로 추가됨).
- 필요 시 명령/패키지명을 실제 설치본에 맞게 수정하세요.

## 5. 세션 재시작 (중요)
- MCP 툴은 **세션 시작 시 바인딩**됩니다. `.mcp.json` 추가 후 **Claude Code 세션을 재시작**해야 Figma 그리기 툴이 로드됩니다.
- 재시작 후 확인:
  ```bash
  # 1회 스파이크 (home 최소 그리기 + read-back + export)
  ./scripts/ralph-figma/ralph.sh --tool claude 1
  ```
  통과하면 자율 루프:
  ```bash
  ./scripts/ralph-figma/supervise.sh 3 3
  ```

## 트러블슈팅
- **툴이 안 보임**: 세션 재시작 안 됨 / `.mcp.json` 명령 오류 / bun 미설치.
- **join_channel 실패**: 브리지(1단계) 미실행 또는 플러그인(3단계) 미연결 / 채널 ID 불일치.
- **그려지는데 export 실패**: 플러그인 권한/파일 편집 권한 확인.
- **헤드리스 ralph에서 연결 불안정**: 브리지는 stateful WebSocket이라 배치 iteration 간 연결 유지가 관건. 먼저 `--tool claude 1`로 1회 검증 후 supervise 사용.
