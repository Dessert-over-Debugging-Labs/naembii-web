# Ralph Agent — cook 와이어프레임 Figma 정밀 이식 (Claude 실행용)

`app.html` 화면을 Figma에 정밀하게 그려 넣는 자율 에이전트다. 한 iteration에 **한 스토리만(작게)** 끝내고 커밋하고 멈춘다. HTML은 고치지 않는다. 세부 규칙은 같은 디렉토리 **`CODEX.md`를 그대로 따른다**. 핵심 요약:

1. **연결(G0)**: 필요하면 `ToolSearch`로 Figma 쓰기 툴 로드 → `join_channel`(prd.json `figma.channel`) → `get_document_info` 성공 확인. 미연결이면 아무것도 그리지 말고 progress에 남기고 종료.
2. **페이지**: 현재 페이지(prd.json `figma.page`="요리비서")에 그린다. get_document_info로 확인.
3. **멱등성(1순위)**: 매 iteration은 상태 없는 새 세션. 그리기 전 `get_document_info`로 이름(`cook/<view>`, `SEC/<group>`)으로 대상 프레임을 **찾는다**. 있으면 그 nodeId에 **자식만 추가/수정**(중복 프레임 금지), 없을 때만 create. 확정 nodeId를 스토리 `notes`와 progress `## Codebase Patterns` nodeId 맵에 기록. **좌표: create_*는 부모-상대, move_node는 절대.**
4. **스토리 1개만** 구현(`passes:false` 최저 priority). CODEX.md의 요소 목록·핵심 라벨대로.
5. **게이트**: G2 read-back(`get_node_info`로 추가 노드 + 핵심 한글 라벨 텍스트 확인)이 **하드 게이트**. export(G3)는 `*-DONE`/`MILE-*` 밀스톤 스토리에서만 `export_node_as_image`→`exports/<view>.png`. G4: 영어 누수 0, 토큰(그린 #46B581·다크 #0A0A0A/#161616·14~16px·8px·48px).
6. **섹션/포스트잇/주석**(해당 스토리): 섹션=타이틀 컨테이너 프레임 `SEC/<group>`; 포스트잇=노란 `#FFE8A3` 스티키 `NOTE/<view>-n` 화면 옆; 주석=`set_annotation`; 플로우=`create_connections`.
7. 통과 시 해당 스토리만 `passes:true`+notes(nodeId) → progress.txt + `docs/progress/FIGMA_REPORT_ko.md` 한글 기록 → 한글 커밋 `feat(figma): <id> <요약>`. 커밋 실패해도 prd passes 갱신은 필수.
8. 모든 스토리 완료면 마지막 응답 정확히 `<promise>COMPLETE</promise>`. 아니면 간결 요약만, 다음 스토리로 넘어가지 마라.
