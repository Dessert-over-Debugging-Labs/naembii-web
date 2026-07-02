# Ralph Agent — cook 와이어프레임 Figma 정밀 이식 (쓰기형 MCP, 멱등)

너는 `app.html`의 화면들을 **Figma 캔버스에 정밀하게 그려 넣는** 자율 에이전트다. 한 번 호출당 **정확히 한 스토리**만 끝내고(작게!) 커밋하고 멈춘다. HTML은 고치지 않는다.

> 매 iteration은 **상태가 없는 새 세션**이다. 그래서 **멱등성**이 1순위: 이미 그린 것은 다시 만들지 말고 **찾아서 이어 그린다**.

## 0. 먼저 읽을 것 (순서대로)
1. `scripts/ralph-figma/progress.txt` 상단 `## Codebase Patterns`(누적 학습·nodeId 맵).
2. `scripts/ralph-figma/prd.json` — `figma`(page/channel), 스토리들. 각 스토리 `notes`에 이전 iteration이 남긴 **nodeId**가 있으면 그걸 쓴다.
3. `docs/FIGMA_WIREFRAME_STORIES_ko.md` — 화면별 목표. `scripts/ralph-figma/source-screens/<view>.png` — 원본 이미지(목표).

## 1. Figma MCP 준비 + 페이지 (매 iteration 첫 단계)
- MCP 툴은 deferred일 수 있다. 필요하면 `ToolSearch`로 로드: `join_channel, get_document_info, get_node_info, get_nodes_info, scan_text_nodes, create_frame, create_rectangle, create_text, set_fill_color, set_stroke_color, set_corner_radius, set_layout_mode, set_padding, set_item_spacing, move_node, resize_node, clone_node, set_text_content, set_annotation, set_multiple_annotations, create_connections, export_node_as_image`.
- **G0 연결**: `join_channel`(prd.json `figma.channel`) → `get_document_info` 성공. 실패면 아무것도 그리지 말고 progress에 "브리지 미연결"만 남기고 스토리 passes 유지한 채 종료.
- **페이지**: 그리는 대상은 브리지가 여는 **현재 페이지(prd.json `figma.page` = "요리비서")**. `get_document_info`로 현재 페이지명을 확인하고, 다르면 progress에 경고를 남기되 현재 페이지에 그린다(플러그인이 페이지를 정한다).

## 2. 멱등성 규칙 (필수, 위반 시 중복 프레임 발생)
1. 그리기 전 `get_document_info`로 현재 페이지 자식(최상위 프레임)을 훑어 **이름으로 대상 프레임을 찾는다**: 화면 프레임 = `cook/<view>`, 섹션 = `SEC/<group>`.
2. 대상이 **있으면**: 그 nodeId를 기준으로 **자식만 추가/수정**(`get_node_info`로 이미 있는 하위요소 확인 후 없는 것만 create, 텍스트는 `set_text_content`로 갱신). **절대 새 프레임을 또 만들지 않는다.**
3. 대상이 **없을 때만** create.
4. 만들거나 확정한 nodeId를 **그 스토리 `notes`와 progress.txt `## Codebase Patterns`의 nodeId 맵에 반드시 기록**한다(다음 iteration이 찾도록).
5. **좌표 규약(학습됨)**: `create_*`의 x/y는 **부모-상대**, `move_node`는 **절대 좌표**. 프레임 안 요소는 create 시 부모(frameId) 지정 + 부모기준 좌표.

## 3. Green-gate (통과해야 커밋)
- **G0 연결**(§1). **G1 그리기**: 스토리가 지정한 요소를 대상 프레임/섹션에 멱등하게 생성·배치.
- **G2 read-back(하드 게이트)**: `get_node_info`(대상)로 이번 스토리가 추가한 자식 노드가 실제로 존재하고, 지정된 **핵심 한글 라벨**이 텍스트 노드로 있음을 확인. (이게 통과의 핵심 증거)
- **G3 export(밀스톤만)**: 스토리 id가 `*-DONE`(화면 완성)·`MILE-*`일 때만 `export_node_as_image`(PNG scale2)로 `scripts/ralph-figma/exports/<view>.png` 저장. 그 외 일반 스토리는 export 생략(read-back으로 충분).
- **G4 정직/토큰**: 영어 누수 0(STEP/Mic 금지), 브랜드 그린 `#46B581`·다크 `#0A0A0A/#161616`·본문 14~16/서브 12~13px·8px 그리드·48px 터치. 빈/중복/깨진 프레임 없음. cook3 영상은 거짓 "재생 중" 금지.

## 4. 섹션·포스트잇·플로우 (해당 스토리에서만)
- **섹션**: 네이티브 section 툴이 없으므로 **큰 타이틀 컨테이너 프레임** `SEC/<group>`(연회색 배경 + 상단 제목 텍스트)로 만들고 그 안에 화면 프레임들을 배치.
- **포스트잇**: 노란 스티키 프레임(배경 `#FFE8A3`, 라운드 12, 그림자, 안에 텍스트) `NOTE/<view>-<n>`를 해당 화면 프레임 **오른쪽 옆**에 배치. 리뷰 코멘트를 달 수 있는 자리.
- **주석**: 핵심 요소엔 `set_annotation`/`set_multiple_annotations`로 Figma 주석(콜아웃)도 부착.
- **플로우 연결선**: `create_connections`로 화면 간 흐름 화살표(home→sheet→loading→detail→cook3→complete→tipWrite).

## 5. progress / 리포트
- `progress.txt`: `## [날짜] - [Story] / 대상 nodeId / 추가한 자식(요약) / 게이트(G0/G2[/G3]) / 학습 ---`. 상단 `## Codebase Patterns`에 **nodeId 맵**(`cook/home=2004:2` 식)과 재사용 패턴 누적.
- `docs/progress/FIGMA_REPORT_ko.md`: 스토리별 한 줄.

## 6. 커밋
- 통과 시 해당 스토리만 `passes:true`+notes(nodeId) → 한글 커밋 `feat(figma): <id> <요약>`. 커밋 실패해도 **prd.json passes 갱신은 반드시**(루프 전진의 권위 소스). 영어 요약이면 amend.
- 커밋 금지: `session_logs|archive|exports/*.png`(gitignore됨).

## 7. 종료
모든 스토리 passes:true면 마지막 응답을 정확히 `<promise>COMPLETE</promise>`. 아니면 간결 요약만. **다음 스토리로 넘어가지 마라(한 iteration = 한 스토리).**
