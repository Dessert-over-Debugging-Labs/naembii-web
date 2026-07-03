# 다른 세션용 프롬프트 — Claude로 디자인 개선하며 Figma에 등록

> 아래 "복사용 프롬프트" 블록을 **새 Claude Code 세션**(작업 디렉토리 = `/Users/osein/cook-assistance-wireframe`)에 붙여넣으세요.
> 이 세션은 원본 app.html을 **1:1로 옮기는** 게 아니라, **모바일 네이티브 관점에서 디자인을 개선**해 Figma에 그립니다.

## ⚠️ 먼저 — 충돌 방지 (중요)
현재 이 레포에서 **원본 충실 이식 ralph 루프**가 Figma 페이지 **'요리 비서'** 에 그리는 중입니다. 디자인 개선 세션이 같은 페이지/같은 플러그인 채널에 붙으면 **서로 그리기가 엉킵니다**. 그래서:
- 디자인 세션은 **별도 Figma 페이지**(예: `요리비서 · 디자인개선`) 또는 **별도 파일**에서 작업.
- 그 페이지에서 **플러그인을 따로 Connect**(자체 채널) — 채널은 연결마다 바뀌니 그때 값을 프롬프트에 반영.
- 가능하면 원본 이식 루프가 쉬는 시간에 돌리거나, 아예 다른 Figma 파일을 쓰는 게 가장 안전.

## 사전 준비 (사용자)
1. WebSocket 브리지가 떠 있어야 함: `cd /Users/osein/cursor-talk-to-figma-mcp && ~/.bun/bin/bun run src/socket.ts` (이미 실행 중이면 생략).
2. Figma에서 **디자인 개선용 페이지/파일**을 열고 TalkToFigma 플러그인 **Connect** → 표시된 **채널 ID** 확인.
3. 새 Claude Code 세션을 `/Users/osein/cook-assistance-wireframe`에서 시작(레포 루트 `.mcp.json`의 TalkToFigma 로드). MCP 툴이 안 보이면 세션 재시작.

---

## 복사용 프롬프트

```
너는 Cookflow(영상 레시피 핸즈프리 요리 어시스턴트, 페르소나 민지)의 와이어프레임을
"모바일 네이티브 출시급"으로 디자인을 개선하며 Figma에 그려 넣는 디자인 에이전트다.
원본을 1:1 복제하지 말고, 아래 원칙으로 더 낫게 다듬어 그린다.

[대상/참고]
- 원본 화면: /Users/osein/cook-assistance-wireframe/app.html 의 view들
  (home, detail, loading, cook3(주력 조리), complete, tipWrite, cookbook, reviews, sheet(등록), cook/cook2(레거시)).
- 원본 캡처: scripts/ralph-figma/source-screens/<view>.png
- 디자인 바이블: docs/_inherited/UI_FEEDBACK_ko.md (반드시 반영)
- 영상 정직성 교훈: docs/_inherited/FINAL_REPORT_ko.md (거짓 "재생 중" 금지, 상태/폴백 표기)

[Figma 연결]
- ToolSearch로 TalkToFigma 쓰기 툴 로드(join_channel, get_document_info, create_frame,
  create_text, create_rectangle, set_fill_color, set_stroke_color, set_corner_radius,
  set_layout_mode, set_padding, set_item_spacing, move_node, resize_node, clone_node,
  set_text_content, set_annotation, create_connections, export_node_as_image, get_node_info).
- join_channel "<디자인개선_페이지의_현재_채널>" 후 get_document_info로 현재 페이지 확인.
  ⚠️ 반드시 '디자인개선' 전용 페이지에서 작업할 것(원본 이식 루프가 쓰는 '요리 비서' 페이지 건드리지 말 것).

[디자인 개선 원칙 (UI_FEEDBACK + 실제 팔레트)]
- 실제 팔레트(app.html :root): 주색 #D66B42(테라코타 오렌지, l #E1875F, soft peach #FBE7DE),
  진짜 초록은 #3FA76F(성공만), 골드 #C99B4A, bg 크림 #F6F0E8, surface #FFFCF7,
  ink #231A14, gray #6E6258, line #DDD1C6, 다크(조리모드) #050505/#120F0C·panel #111111.
  ⚠️ app.html의 --green은 --primary(오렌지) 별칭 — 초록으로 칠하지 말 것.
- 타이포 본문 14~16 / 서브 12~13px, 위계는 weight로. 한글 keep-all 자연 줄바꿈.
- 8px 그리드, 터치 타깃 48px+, 정보밀도 완화, 고정 하단탭바.
- 모든 버튼은 의미 있는 액션(dead UI 0). cook3 영상은 정직한 상태/폴백 표기.
- Auto Layout 적극 사용, 재사용 요소(상태바·하단탭바·카드·버튼)는 컴포넌트로.
- "개선"이므로 원본 대비 정보구조·여백·대비·컴포넌트 일관성을 실제로 더 낫게. 단, 서비스 의미는 유지.

[작업 방식 — 화면 1개씩]
1. source-screens/<view>.png와 app.html을 보고, 그 화면의 "개선 포인트"를 2~4개 정한다.
2. 390x844 프레임 cook-v2/<view> 를 만들고(멱등: 이미 있으면 재사용해 이어 그림, 중복 생성 금지),
   개선된 레이아웃을 Auto Layout+컴포넌트로 그린다. 좌표: create_*는 부모-상대, move_node는 절대.
3. 개선 근거를 화면 옆 노란 포스트잇(#FFE8A3) NOTE-v2/<view> 에 적고, 핵심 변경엔 set_annotation 콜아웃.
4. get_node_info로 read-back(핵심 한글 라벨 텍스트 존재) 검증 후, export_node_as_image로
   scripts/ralph-figma/exports-v2/<view>.png 저장.
5. 진행/결정은 docs/progress/FIGMA_DESIGN_v2_ko.md 에 화면별로 한글 기록.

[순서] home → detail → cook3 → complete → sheet → loading → tipWrite → cookbook → reviews → cook → cook2.
한 번에 한 화면만 끝까지(개선 그리기+주석+export+기록) 하고 다음으로. 승인 기다리지 말고 자율로 끝까지.
```

---

## 참고 — 랄프 루프로 자동화하고 싶다면
이 디자인 개선도 별도 ralph 트랙(`scripts/ralph-figma`와 유사)으로 자동화 가능하나, **같은 Figma 파일에서 두 루프를 동시에 돌리면 충돌**한다. 자동화하려면 별도 파일/페이지 + 별도 채널 + 별도 감시견을 쓰고, 원본 이식 루프와 시간대를 분리하라.
