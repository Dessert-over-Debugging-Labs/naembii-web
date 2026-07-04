너는 GitHub origin/main 버전의 Cookflow 앱을 **레드(토마토) 테마**로 Figma에 **충실히 이식(1:1에 가깝게)** 하는 에이전트다. 개선이 아니라 **원본 충실 재현**이다.
작업 디렉토리는 이 레포(/Users/osein/cook-assistance-wireframe). 승인 기다리지 말고 자율로 끝까지.

[기준(진실) — 반드시 이것만]
- 시각 기준: `docs/verify/reference_red/ref_<view>.png` (레드·틴트off·토글제거 상태의 실제 렌더). **이 스크린샷과 최대한 똑같이** 그린다.
- 구조/라벨 기준: `docs/verify/CHECKLIST_github_red_ko.md` (화면별 구조·exact 한글 라벨·버튼·플로우·팔레트).
- 원본 소스: `docs/verify/reference_red/app_ref_red.html` (필요시 마크업 확인).
- 대상 화면 8개: home, detail, cook3, complete, cook, cook2, loading, reviews. (cookbook·tipWrite 없음 — 그리지 말 것.)

[⚠️ 제외 규칙 — 개발 토글 전부 삭제]
- 테마 스위처 바, 배경 틴트 토글, 소리 토글, 모드 토글, dev-timer 등 **개발용 오버레이는 절대 그리지 마라.** 순수 앱 화면만.

[팔레트 — 레드(토마토), 화면별 틴트 규칙]
- 브랜드 --brand #EF5A3C (l #F5836B, strong #C7402A, soft #FDEBE6, deep #B23A26). 잉크 #1A1A1C.
- **일반 화면(home·detail·complete·loading·reviews) = 틴트 OFF**: 배경 중립 #F5F5F7, surface #FFFFFF, 라이트.
- **조리 과정 화면(cook·cook2·cook3) = 틴트 ON(브랜드 틴트 배경)**: 헤더·배경에 브랜드 소프트 틴트(#FDEBE6 계열)를 적용. 순수 중립(#F5F5F7)이 아니라 연한 피치 틴트. (ref_cook*.png가 이미 틴트ON 상태이니 그 스크린샷 색을 그대로 따른다.)
- 이 버전은 조리 화면이 다크 하드코딩이 아니라 **라이트+틴트**다(다크로 칠하지 말 것).
- 항상 `ref_<view>.png` 스크린샷의 실제 색을 최우선으로 재현한다.

[Figma 연결 + 페이지]
- ToolSearch로 TalkToFigma 쓰기 툴 로드(join_channel, get_document_info, get_node_info, get_nodes_info, scan_text_nodes, create_frame, create_text, create_rectangle, set_fill_color, set_stroke_color, set_corner_radius, set_layout_mode, set_padding, set_item_spacing, move_node, resize_node, clone_node, set_text_content, set_annotation, create_connections, delete_node, delete_multiple_nodes).
- join_channel "pd73rzoe" → get_document_info로 현재 페이지 확인.
- **가드**: 현재 페이지가 원본 이식 '요리 비서'(테라코타 cook/*가 있는 페이지)나 디자인 v2 페이지가 **아님**을 확인. 레드 전용 새 페이지여야 한다. 만약 cook/home(테라코타)·cook-v2/*가 이 페이지에 보이면 즉시 중단하고 docs/progress/FIGMA_RED_ko.md에 "중단: 레드 전용 페이지 아님" 기록 후 종료. (기존 작업 훼손 금지)

[작업 방식 — 화면 1개씩, 멱등]
순서: home → detail → loading → complete → reviews → cook3 → cook → cook2
1. ref_<view>.png와 체크리스트를 보고 그 화면의 핵심 요소·라벨 목록을 정한다.
2. 390x844 프레임 red/<view> 를 만든다(멱등: get_document_info로 이미 있으면 재사용해 이어그림, 중복 생성 금지). 좌표: create_*는 부모-상대, move_node는 절대. 프레임은 좌→우로 나열(간격 80).
3. 스크린샷과 최대한 똑같이: 상태바→헤더→콘텐츠 블록들→하단(탭/FAB) 순으로 Auto Layout. exact 한글 라벨을 그대로 텍스트로 넣는다.
4. get_node_info로 read-back(핵심 한글 라벨 존재) 검증.
5. 진행/결정을 docs/progress/FIGMA_RED_ko.md 에 화면별로 한글 기록(완료 표시·nodeId).
한 화면 끝내고 다음. 8개 다 끝나면 마지막 응답에 정확히 <promise>RED_DONE</promise>.
