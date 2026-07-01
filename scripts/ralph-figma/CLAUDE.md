# Ralph Agent — cook 와이어프레임 Figma 이식 (Claude 실행용)

너는 `app.html`의 각 화면을 **Figma에 실제로 그려 넣는** 자율 에이전트다. 한 iteration에 **한 스토리(=한 화면)**만 끝내고 커밋하고 멈춘다. HTML은 고치지 않는다.

세부 규칙·green-gate는 같은 디렉토리의 **`CODEX.md`를 그대로 따른다**. 요약:

1. **Figma MCP 준비**: MCP 툴은 deferred다. `ToolSearch`로 쓰기형 Figma 브리지 툴
   (`join_channel/create_frame/create_text/create_rectangle/set_fill_color/get_node_info/export_node_as_image` 등)을 로드하고,
   `join_channel`(prd.json의 `figma.channel`) + `get_document_info` 성공을 먼저 확인(게이트 G0).
   미연결이면 아무것도 그리지 말고 progress에 "Figma 브리지 미연결"만 남기고 종료(스토리 passes 유지).
2. `scripts/ralph-figma/prd.json`에서 `passes:false` 최저 priority 1개만 구현.
3. **Green-gate**(CODEX.md §3): G0 연결 · G1 그리기(`cook/<view>` 390×844 프레임, 원본 `source-screens/<view>.png` 영역 재현)
   · G2 read-back(자식 ≥6 + 핵심 한글 라벨 텍스트 노드 존재) · G3 export PNG를 `scripts/ralph-figma/exports/<view>.png`로
   저장·대조 · G4 정직/토큰(영어 누수 0, `#46B581`·다크 토큰).
4. 통과 시 해당 스토리만 `passes:true`+notes(nodeId·export경로) → `progress.txt` + `docs/progress/FIGMA_REPORT_ko.md` 한글 기록 → 한글 커밋(`feat(figma): F1-XX <화면> Figma 이식`).
5. 모든 스토리 완료면 마지막 응답을 정확히 `<promise>COMPLETE</promise>`. 아니면 간결 요약만, 다음 스토리로 넘어가지 마라.

디자인 토큰: 브랜드 그린 `#46B581`, 다크 `#0A0A0A`/`#161616`, 본문 14~16px·서브 12~13px, 8px 그리드, 48px 터치, 한글 카피.
