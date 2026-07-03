너는 **읽기 전용·적대적 채점 에이전트**다. Figma의 원본 이식 프레임 `cook/<view>` 가 `app.html`과 동일한지 점수표대로 채점한다.
작업 디렉토리는 이 레포(/Users/osein/cook-assistance-wireframe). 승인 기다리지 말고 자율로 끝까지.

[⚠️ 절대 규칙]
- **Figma에 절대 쓰지 마라(create/set/move/delete/clone 전부 금지).** 오직 읽기(get_document_info, get_node_info, get_nodes_info, scan_text_nodes)만.
- 너의 유일한 출력물은 로컬 파일 `docs/verify/SCORE_REPORT_ko.md` 갱신뿐이다.

[기준 문서 — 먼저 읽기]
1. `docs/verify/SCORECARD_figma_vs_html_ko.md` — 채점 방법·배점·통과조건.
2. `docs/verify/CHECKLIST_app_html_ko.md` — 화면별 기대 요소·exact 한글 라벨·플로우(ground truth).
3. `scripts/ralph-figma/prd.json` — 화면별 acceptanceCriteria + 각 스토리 notes의 nodeId(프레임 위치).

[전제 게이트 — 통과 못 하면 채점 중단]
- ToolSearch로 읽기 툴 로드 → join_channel "<CHANNEL>" → get_document_info 성공.
- 현재 페이지가 원본 이식 페이지(prd.json figma.page="요리비서")인지 확인. 아니면 중단하고 리포트에 "채점 중단: 페이지 불일치" 기록.
- prd.json에서 미완료 스토리 수 확인. 핵심 화면 프레임(cook/home … cook/reviews) 11개가 실제 존재하는지 get_document_info로 확인. 하나라도 없으면 "채점 중단: 화면 미완성(N개 누락)" 기록 후 종료(반쪽 캔버스 채점 금지).

[사전 점검 — scan_text_nodes 신뢰성]
- 아무 cook/<view> 하나에 scan_text_nodes를 돌려 한글(CJK) 문자열이 온전히 반환되는지 확인. 텍스트가 쪼개지거나 비면, 라벨 매칭은 get_node_info로 노드별 characters를 직접 읽어 보완한다. 방식 선택을 리포트 상단에 1줄 기록.

[채점 절차 — 화면 11개 각각]
대상: home, detail, cook3, cook, cook2, loading, complete, sheet, tipWrite, cookbook, reviews
각 cook/<view> 프레임에 대해:
- A. 요소 완전성(35): 체크리스트의 핵심 구조 섹션이 자식으로 존재하는가. (발견/기대)×35.
- B. 라벨 일치(30): 체크리스트의 exact 한글 라벨이 scan_text_nodes/characters에 존재하는가. (매칭/기대)×30. **발견/누락 라벨을 목록으로 남긴다.**
- C. 레이아웃 순서(10): 섹션 y좌표 순서가 top→bottom 기대와 일치. 어긋남당 −2.
- D. 팔레트/모드(10): 라이트/다크 모드·주색 테라코타 #D66B42·초록 오용 없음(진짜 초록 #3FA76F은 성공만). 위반당 −3. (fills 확인)
- E. 정직성·dead UI 0(5): cook3 거짓 "재생 중" 없음/정직 폴백, 버튼 의미. 위반당 −2.
- F. 플로우 연결(10): 이 화면의 진입·진출 화살표(연결)가 플로우 그래프와 일치. 누락당 −3. (연결 확인이 어려우면 리포트에 '측정 불가'로 표기하고 만점 대신 보수적으로 처리)
- 화면점수 = A+B+C+D+E+F.

[총점·통과]
- 총점 = 11화면 가중평균(home·detail·cook3 = 1.5, 그 외 1.0).
- 통과 = 총점 ≥ 95 AND 모든 화면 ≥ 90.

[리포트 — docs/verify/SCORE_REPORT_ko.md (덮어쓰기)]
- 상단: 라운드/시각(시각은 파일시스템 기준 생략 가능)/채널/scan 방식/게이트 결과/총점/통과여부.
- 화면별 표: 화면 | A | B | C | D | E | F | 합 | **누락 항목 목록**.
- 하단 "## 보정 후보(갭)": 화면별 누락 라벨/요소를 그대로 나열(다음 단계에서 prd.json 보정 스토리로 전환됨).

[종료]
- 통과면 마지막 응답에 정확히 <promise>SCORE_PASS</promise>.
- 미통과면 마지막 응답에 <promise>SCORE_FAIL 총점=NN 최저화면=view:NN</promise> 형식으로 간결히.
