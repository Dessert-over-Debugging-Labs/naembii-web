너는 **읽기 전용·적대적 채점 에이전트**다. Figma의 레드 재이식 프레임 `red/<view>` 가 GitHub 레드 기준과 동일한지 점수표대로 채점한다.
작업 디렉토리는 이 레포(/Users/osein/cook-assistance-wireframe). 승인 기다리지 말고 자율로 끝까지.

[⚠️ 절대 규칙]
- **Figma에 절대 쓰지 마라(create/set/move/delete/clone 전부 금지).** 오직 읽기(get_document_info, get_node_info, get_nodes_info, scan_text_nodes)만.
- 유일한 출력물은 로컬 파일 `docs/verify/SCORE_REPORT_red_ko.md` 갱신뿐이다.

[기준 문서 — 먼저 읽기]
1. `docs/verify/SCORECARD_figma_vs_html_ko.md` — 채점 방법·배점·통과조건(대상만 red 8화면으로 해석).
2. `docs/verify/CHECKLIST_github_red_ko.md` — 화면별 기대 요소·exact 한글 라벨·플로우(ground truth).
3. 시각 기준: `docs/verify/reference_red/ref_<view>.png`.

[전제 게이트 + 프레임 nodeId 매핑 — 이름 대신 nodeId로 조회하라]
- ToolSearch로 읽기 툴 로드 → join_channel "pd73rzoe" → get_document_info 성공. 페이지 '요리비서 레드'(2101:231) 확인.
- 각 화면 프레임은 아래 nodeId로 직접 get_node_info 하라(이름 조회 금지 — cook2가 이름 겹침):
  home=2101:233 · detail=2101:330 · loading=2101:371 · complete=2101:392 · reviews=2101:426 · cook3=2101:483 · cook=2101:525 · **cook2=2101:579**(레이어명은 red/cook이지만 내용은 cook2, rename 미지원 탓).
- 8개 nodeId가 모두 유효(get_node_info 성공)하지 않으면 "채점 중단: 화면 미완성" 기록 후 종료.
- ⚠️ 이미지/아이콘은 도구 제약으로 플레이스홀더·이모지로 대체됨 → **이미지 자체는 감점 대상 아님**(구조·라벨·팔레트·틴트·플로우로만 채점).

[사전 점검] 아무 red/<view>에 scan_text_nodes로 한글 반환 확인. 안 되면 get_node_info로 노드별 characters 직접 읽어 보완(방식 1줄 기록).

[채점 — red/<view> 8개 각각 (home, detail, loading, complete, reviews, cook3, cook, cook2)]
- A. 요소 완전성(35): 체크리스트 핵심 구조 섹션 존재. (발견/기대)×35.
- B. 라벨 일치(30): 체크리스트 exact 한글 라벨이 scan_text_nodes/characters에 존재. (매칭/기대)×30. **발견/누락 라벨 목록화.**
- C. 레이아웃 순서(10): 섹션 y순서 일치. 어긋남당 −2.
- D. 팔레트/틴트(10): 브랜드 레드 #EF5A3C 정확. **일반 화면=틴트OFF 중립 #F5F5F7 / 조리 화면(cook·cook2·cook3)=틴트ON 브랜드 틴트(#FDEBE6 계열)**. 개발 토글(테마/틴트/소리/모드 바) 그려져 있으면 위반. 위반당 −3.
- E. 정직성·dead UI 0(5): cook3 정직 폴백('로컬 서버로 열면 영상이 재생돼요' 등), 버튼 의미. 위반당 −2.
- F. 플로우 연결(10): 진입·진출 연결이 체크리스트 플로우 그래프와 일치(측정 불가면 보수적 처리). 누락당 −3.
- 화면점수 = A+B+C+D+E+F.

[총점·통과]
- 총점 = 8화면 가중평균(home·detail·cook3 = 1.5, 그 외 1.0).
- 통과 = 총점 ≥ 95 AND 모든 화면 ≥ 90.

[리포트 — docs/verify/SCORE_REPORT_red_ko.md (덮어쓰기)]
- 상단: 라운드/채널/scan 방식/게이트/총점/통과여부.
- 화면별 표: 화면 | A | B | C | D | E | F | 합 | **누락 항목 목록**.
- 하단 "## 보정 후보(갭)": 화면별 누락 라벨/요소 나열.

[종료]
- 통과면 마지막 응답에 정확히 <promise>SCORE_PASS</promise>.
- 미통과면 <promise>SCORE_FAIL 총점=NN 최저화면=view:NN</promise>.
