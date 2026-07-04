너는 레드 재이식의 **보정(fix) 에이전트**다. 채점에서 드러난 **누락 콘텐츠만** 기존 프레임에 추가한다. 새 프레임 생성·기존 통과 화면 수정 금지.
작업 디렉토리는 이 레포(/Users/osein/cook-assistance-wireframe). 승인 기다리지 말고 자율로 끝까지.

[기준]
- 시각: `docs/verify/reference_red/ref_<view>.png` (그대로 재현)
- 구조/라벨(exact): `docs/verify/CHECKLIST_github_red_ko.md`
- 소스 마크업 필요시: `docs/verify/reference_red/app_ref_red.html`(일반) / `app_ref_red_tinton.html`(조리)

[Figma 연결]
- ToolSearch로 쓰기 툴 로드(join_channel, get_document_info, get_node_info, get_nodes_info, scan_text_nodes, create_frame, create_text, create_rectangle, set_fill_color, set_stroke_color, set_corner_radius, set_layout_mode, set_padding, set_item_spacing, move_node, resize_node, clone_node, set_text_content, set_annotation).
- join_channel "pd73rzoe" → get_document_info. 페이지 '요리비서 레드'(2101:231) 확인.
- **대상 프레임(nodeId로 접근, 이름조회 금지)**: home=2101:233 · detail=2101:330 · cook3=2101:483 · cook2=2101:579. (loading/complete/reviews/cook는 만점 → 절대 건드리지 마라.)

[⚠️ 규칙]
- 기존 자식은 지우지 말고 **누락분만 추가**(멱등: 이미 있으면 스킵). create_*는 부모-상대 좌표. 프레임 높이가 부족하면 resize_node로 늘린다.
- 팔레트: 브랜드 레드 #EF5A3C, 별점 골드 #FFB400. 일반화면 배경 중립 #F5F5F7, 조리화면(cook3·cook2) 브랜드 틴트 #FDEBE6. 개발 토글 그리지 말 것.
- 이미지/아이콘은 placeholder(사각형/이모지) 허용. 핵심은 **구조·exact 한글 라벨**.

[보정할 누락 (채점 리포트 기준)]
1) **home (2101:233)**: 현재 카드 6장이 전부 '나의 레시피' 그리드에 몰려 있음. 기준(ref_home.png/체크리스트)대로 **3개 섹션으로 분리**: `나의 레시피` + `인기 레시피`(가로 스크롤) + `오늘의 추천`(가로 스크롤). 각 섹션 제목 텍스트와 해당 카드들을 배치(카드 재사용/클론 가능). 최소한 `인기 레시피`, `오늘의 추천` 섹션 제목과 카드 1~2장씩 추가.
2) **detail (2101:330)**: 탭(재료/레시피/리뷰) 아래 **기본 노출 콘텐츠 추가**: 재료 리스트(`재료 11개`(또는 체크리스트상 실제 개수) 헤더 + 주재료·양념 항목들, 체크리스트 exact 라벨), 레시피 스텝(A~G 제목), 후기 영역 요약, `후기 쓰기` 버튼. ref_detail.png의 기본 상태를 따른다.
3) **cook3 (2101:483)**: 빈 faded-card 자리에 **단계 카드**(현재 단계 제목=체크리스트 A단계 라벨, 배지 `1 / 7`)와 **단계 타이머 배지**(`타이머` / `3:00`) 추가, 그리고 마지막 **완료 카드**(`요리 완성`) 표현. ref_cook3.png 참고.
4) **cook2 (2101:579)**: 대화 후반 **3버블 추가**(체크리스트/소스의 국간장 대체 답변, 사용자 `타이머 3분 맞춰줘`, AI `3분 타이머를 시작했어요` — exact 문구는 체크리스트/app_ref_red.html vpScript에서 확인).

각 보정 후 get_node_info로 추가 노드·핵심 라벨 read-back 검증. 진행을 docs/progress/FIGMA_RED_ko.md 하단에 "## 보정 라운드1" 로 기록.
4개 화면 보정 완료 시 마지막 응답에 정확히 <promise>RED_FIX_DONE</promise>.
