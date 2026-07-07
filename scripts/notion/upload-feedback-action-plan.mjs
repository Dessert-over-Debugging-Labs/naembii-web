const NOTION_VERSION = '2022-06-28';
const feedbackPageId = process.env.NOTION_FEEDBACK_PAGE_ID || '396b1da1d9f980deb3bff5582ba6aabe';
const docsParentPageId = process.env.NOTION_PARENT_PAGE_ID || '392b1da1d9f98020b3fce1290fee276c';
const token = process.env.NOTION_TOKEN;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

const today = '2026-07-08';
const actionTitle = `냄비 웹앱 피드백 실행 투두 · ${today}`;
const mixpanelTitle = '냄비 Mixpanel 세팅 가이드';
const categoryTitle = '냄비 홈 카테고리 논의 기록';

function text(content, href) {
  return [{ type: 'text', text: { content, ...(href ? { link: { url: href } } : {}) } }];
}

function paragraph(content) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function heading(level, content) {
  const type = `heading_${level}`;
  return { object: 'block', type, [type]: { rich_text: text(content) } };
}

function todo(content, checked = false) {
  return { object: 'block', type: 'to_do', to_do: { rich_text: text(content), checked } };
}

function bullet(content) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: text(content) } };
}

function code(content) {
  return {
    object: 'block',
    type: 'code',
    code: { rich_text: text(content), language: 'plain text' }
  };
}

async function notion(path, body, method = 'POST') {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function createPage(parentPageId, title, children) {
  return notion('/pages', {
    parent: { type: 'page_id', page_id: parentPageId },
    properties: { title: { title: text(title) } },
    children
  });
}

async function appendBlocks(blockId, children) {
  return notion(`/blocks/${blockId}/children`, { children }, 'PATCH');
}

const actionPlanChildren = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 멘토·팀원·지인 피드백을 제품 실행 투두로 바꾸고, 우선순위와 커밋 단위를 정해 단계별로 처리한다.'),
  heading(2, '우선순위 결론'),
  bullet('P0: 랜딩 길이 축소, 중복 카피 제거, 모바일 체험 안정성 확인, 핵심 행동 측정 기준 수립'),
  bullet('P1: 평점/완주 mock 보강, 타이머 직접 입력, 조리 중 채팅형 비서 입력, 재료 보기/재료 기반 추천 보강'),
  bullet('P2: 실제 AI 음성비서 구현, 설치형 앱 전환, 랜딩 유지 여부는 베타 반응을 보고 결정'),
  heading(2, '커밋 단위'),
  todo('commit 1: 랜딩 축소와 카피 중복 제거'),
  todo('commit 2: 앱 체험 기능 보강'),
  todo('commit 3: Mixpanel/운영 문서와 검증 리포트 정리'),
  heading(2, 'P0 투두'),
  todo('랜딩의 "이럴 때 필요해요"와 출시 후 로드맵성 중복 영역을 줄인다'),
  todo('첫 화면에서 바로 앱 체험, 베타 알림, 레시피 요청으로 이어지게 한다'),
  todo('모바일에서 체험해보기 진입 시 loading/blank 이슈를 재현 확인한다'),
  todo('핵심 행동 이벤트 목록을 Mixpanel 가이드에 정의한다'),
  heading(2, 'P1 투두'),
  todo('상세 화면에 평점과 완주한 사람 수 mock을 더 명확히 보여준다'),
  todo('타이머 분 값을 버튼뿐 아니라 숫자 입력으로 직접 수정할 수 있게 한다'),
  todo('조리 모드 비서 패널에서 정해진 질문을 채팅처럼 직접 선택/입력하는 흐름을 만든다'),
  todo('재료 시트를 아래로 나열되는 체크리스트 방식으로도 보기 좋게 정리한다'),
  todo('가지고 있는 재료 여러 개를 입력해 레시피를 찾는 흐름을 강화한다'),
  heading(2, 'P2 논의 보류'),
  todo('실제 AI 음성비서 기능을 이번 베타에 넣을지 결정한다'),
  todo('랜딩을 계속 유지할지, 앱 설치/체험 링크 중심으로 더 줄일지 베타 반응으로 판단한다'),
  todo('mock 평점/완주 수를 어디까지 공개 화면에 표시할지 문구 기준을 정한다'),
  heading(2, '검증 기준'),
  todo('npm run check 통과'),
  todo('npm run verify:dynamic -- --full --min-score=96 통과'),
  todo('모바일 폭에서 랜딩과 앱 체험이 끊기지 않는지 스크린샷으로 확인'),
  todo('공개 화면에 Notion, API, Vercel, GitHub, 환경변수 같은 내부어가 보이지 않는지 확인')
];

const stagePages = [
  {
    title: '1단계 P0 랜딩 압축·체험 안정화',
    children: [
      paragraph('상태: 진행 예정'),
      heading(2, '할 일'),
      todo('중복되는 설명 섹션 줄이기'),
      todo('모바일 첫 화면 스크롤 압박 줄이기'),
      todo('앱 체험 진입이 loading 상태에 갇히지 않는지 확인'),
      todo('검증 결과 기록'),
      heading(2, '완료 기준'),
      bullet('모바일에서 첫 화면 CTA가 명확하게 보인다.'),
      bullet('랜딩 하단까지 내려가지 않아도 앱 체험/알림 신청/레시피 요청 흐름을 이해할 수 있다.')
    ]
  },
  {
    title: '2단계 P1 앱 체험 기능 보강',
    children: [
      paragraph('상태: 진행 예정'),
      heading(2, '할 일'),
      todo('상세 화면에 평점/완주 mock 강화'),
      todo('타이머 숫자 직접 입력 지원'),
      todo('비서 패널에 채팅형 질문 선택/입력 흐름 추가'),
      todo('재료 시트 체크리스트 표시 보강'),
      todo('여러 재료 기반 검색 흐름 강화'),
      heading(2, '완료 기준'),
      bullet('사용자가 조리 중 직접 건드려볼 기능이 늘어난다.'),
      bullet('친구 피드백의 구체 항목이 화면에서 확인된다.')
    ]
  },
  {
    title: '3단계 P1 측정·운영 세팅',
    children: [
      paragraph('상태: 진행 예정'),
      heading(2, '할 일'),
      todo('Mixpanel 이벤트 설계 문서화'),
      todo('필요한 환경변수와 배포 세팅 정리'),
      todo('검증 루프와 Notion 진행 상태 업데이트'),
      heading(2, '완료 기준'),
      bullet('무엇을 측정할지 팀이 같은 기준으로 볼 수 있다.'),
      bullet('베타 반응을 보고 랜딩/앱 우선순위를 다시 판단할 수 있다.')
    ]
  },
  {
    title: '4단계 P2 추가 논의',
    children: [
      paragraph('상태: 보류'),
      heading(2, '논의할 것'),
      todo('실제 AI 음성비서 구현 시점'),
      todo('설치형 앱과 웹 체험의 우선순위'),
      todo('후기/완주/평점 mock 표시의 신뢰성 문구'),
      todo('정식 출시 전 개인정보/이메일 보관 정책')
    ]
  }
];

const categoryChildren = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 홈 화면 카테고리를 바로 개발에 반영하지 않고, 베타 사용자가 이해하기 쉬운 묶음인지 논의하고 기록한다.'),
  heading(2, '현재 후보'),
  todo('SNS 트렌드'),
  todo('간단 집밥'),
  todo('가벼운 한끼'),
  todo('재료 적게 가능'),
  todo('여름에 어울리는 요리'),
  heading(2, '논의 기준'),
  bullet('사용자가 요리 이름을 몰라도 누를 수 있는가'),
  bullet('레시피 데이터가 늘어났을 때 자동/수동으로 관리 가능한가'),
  bullet('베타 단계에서 실제 클릭과 검색어로 수요를 확인할 수 있는가'),
  bullet('카테고리끼리 의미가 겹치지 않는가'),
  bullet('계절성 카테고리는 언제 교체할지 기준이 있는가'),
  heading(2, '후보별 메모'),
  heading(3, 'SNS 트렌드'),
  bullet('장점: 후킹이 강하고 서비스 핵심인 SNS/유튜브 요리 따라하기와 바로 연결된다.'),
  bullet('고민: 트렌드 근거가 약하면 임의 추천처럼 보일 수 있다.'),
  todo('표시 문구를 SNS 트렌드 / 요즘 많이 만드는 요리 / 요즘 뜨는 요리 중 무엇으로 할지 결정'),
  heading(3, '간단 집밥'),
  bullet('장점: 대중적이고 반복 사용 맥락이 분명하다.'),
  bullet('고민: SNS 요리 후킹과는 조금 결이 다를 수 있다.'),
  todo('초보/퇴근 후 한 끼 사용자에게 더 잘 먹히는지 확인'),
  heading(3, '가벼운 한끼'),
  bullet('장점: 부담 없는 식사, 다이어트, 점심/저녁 대체까지 넓게 쓸 수 있다.'),
  bullet('고민: 너무 넓어서 레시피 선정 기준이 흐려질 수 있다.'),
  todo('가벼움의 기준을 시간, 칼로리, 재료 수, 조리 난이도 중 무엇으로 볼지 결정'),
  heading(3, '재료 적게 가능'),
  bullet('장점: 현재 검색/추천 방향과 잘 맞고 사용자가 바로 이해한다.'),
  bullet('고민: "재료 적게"와 "간단"이 겹칠 수 있다.'),
  todo('재료 5개 이하 / 8개 이하처럼 수치 기준을 둘지 결정'),
  heading(3, '여름에 어울리는 요리'),
  bullet('장점: 공유/홍보 시 계절감 있는 카피로 쓰기 좋다.'),
  bullet('고민: 계절이 지나면 관리가 필요하다.'),
  todo('계절 카테고리를 홈 상단 고정으로 둘지, 캠페인성으로 잠깐 둘지 결정'),
  heading(2, '베타에서 확인할 질문'),
  todo('사용자는 카테고리를 눌러 탐색하는가, 검색을 먼저 하는가'),
  todo('SNS 트렌드와 간단 집밥 중 어느 쪽이 더 클릭되는가'),
  todo('재료 기반 카테고리가 실제 레시피 요청으로 이어지는가'),
  todo('계절 카테고리가 베타 모집 카피에 도움이 되는가'),
  heading(2, '개발 반영 상태'),
  bullet('지금은 개발 반영하지 않는다.'),
  bullet('Mixpanel 또는 수동 피드백으로 클릭/요청 근거를 본 뒤 홈 카테고리를 확정한다.'),
  bullet('확정 전까지 기존 앱 화면의 카테고리 변경은 별도 작업으로 잡지 않는다.')
];

const mixpanelChildren = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 베타에서 사용자가 실제로 앱 체험을 하는지, 어디서 막히는지, 어떤 레시피를 원하는지 빠르게 확인한다.'),
  heading(2, '결론'),
  bullet('처음에는 Mixpanel만 가볍게 붙이고, DB/AWS 전환은 하지 않는다.'),
  bullet('측정 목표는 트래픽 숫자가 아니라 핵심 여정 완주 여부다.'),
  bullet('개인정보는 이메일 자체를 이벤트 프로퍼티로 보내지 않는다.'),
  heading(2, '필수 이벤트'),
  code('landing_view\nbeta_signup_submit\nopen_app\nsearch_recipe\nselect_recipe\nstart_cook\nassistant_open\nassistant_prompt_select\ntimer_start\nopen_ingredients\ncomplete_recipe\nfeedback_submit\nrecipe_request_submit\nshare_complete'),
  heading(2, '추천 프로퍼티'),
  code('source\nscreen\nrecipe_id\nrecipe_name\nrecipe_channel\nquery\nstep_index\nprompt_type\nresult_count\nsuccess'),
  heading(2, 'Vercel 환경변수'),
  code('NAEMBI_MIXPANEL_TOKEN=프로젝트 토큰\nNAEMBI_MIXPANEL_ENABLED=true'),
  bullet('클라이언트에서 쓰는 토큰은 Mixpanel project token이다. API secret을 넣지 않는다.'),
  bullet('이메일, 이름 같은 값은 Mixpanel 이벤트에 직접 넣지 않는다.'),
  heading(2, '초기 퍼널'),
  bullet('landing_view -> open_app -> select_recipe -> start_cook -> complete_recipe'),
  bullet('landing_view -> beta_signup_submit'),
  bullet('search_recipe -> select_recipe -> start_cook'),
  bullet('assistant_open -> assistant_prompt_select -> timer_start 또는 next_step'),
  heading(2, '검증 방법'),
  todo('개발 환경에서 이벤트가 전송되는지 확인'),
  todo('Production에서 landing_view와 open_app이 들어오는지 확인'),
  todo('이벤트 프로퍼티에 이메일이 들어가지 않는지 확인'),
  todo('1주일 뒤 랜딩 유지 여부를 퍼널 이탈률로 다시 판단')
];

const discussionBlocks = [
  heading(3, '고민할 부분'),
  bullet('랜딩을 유지할지, 앱 체험 링크 중심으로 더 줄일지: 멘토 피드백 기준으로는 MVP 앱 반응이 먼저다.'),
  bullet('앱 설치 직후 기대 행동: 검색, 레시피 선택, 조리 시작, 비서 질문, 완주 중 무엇을 핵심 지표로 볼지 정해야 한다.'),
  bullet('Mixpanel은 가볍게 붙이되 이메일 같은 개인정보는 이벤트에 보내지 않는다.'),
  bullet('평점/완주 수 mock은 후킹에는 도움이 되지만, 신뢰성 문구와 표시 범위를 정해야 한다.'),
  bullet('실제 AI 음성비서는 이번 베타에 바로 넣기보다, 먼저 정해진 질문/답변형 채팅으로 수요를 확인한다.'),
  bullet('모바일에서 체험해보기 진입 시 loading 이슈가 특정 기기 문제인지, iframe/hash/YouTube 로딩 문제인지 확인한다.')
];

const actionPage = await createPage(feedbackPageId, actionTitle, actionPlanChildren);
const stageResults = [];
for (const stage of stagePages) {
  const page = await createPage(actionPage.id, stage.title, stage.children);
  stageResults.push({ title: stage.title, url: page.url, pageId: page.id });
}
const categoryPage = await createPage(actionPage.id, categoryTitle, categoryChildren);
const mixpanelPage = await createPage(docsParentPageId, mixpanelTitle, mixpanelChildren);
await appendBlocks(feedbackPageId, [
  ...discussionBlocks,
  paragraph(`실행 투두 페이지: ${actionPage.url}`),
  paragraph(`카테고리 논의 기록: ${categoryPage.url}`),
  paragraph(`Mixpanel 세팅 가이드: ${mixpanelPage.url}`)
]);

console.log(JSON.stringify({
  actionPage: { title: actionTitle, pageId: actionPage.id, url: actionPage.url },
  stagePages: stageResults,
  categoryPage: { title: categoryTitle, pageId: categoryPage.id, url: categoryPage.url },
  mixpanelPage: { title: mixpanelTitle, pageId: mixpanelPage.id, url: mixpanelPage.url }
}, null, 2));
