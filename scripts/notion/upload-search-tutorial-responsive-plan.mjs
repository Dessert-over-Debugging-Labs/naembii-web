const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_SEARCH_TUTORIAL_PARENT_PAGE_ID || '396b1da1d9f980deb3bff5582ba6aabe';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `검색·따라해보기·모바일 검증 개선 계획 · ${today}`;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

function text(content) {
  return [{ type: 'text', text: { content } }];
}

function paragraph(content) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function heading(level, content) {
  const type = `heading_${level}`;
  return { object: 'block', type, [type]: { rich_text: text(content) } };
}

function bullet(content) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: text(content) } };
}

function todo(content, checked = false) {
  return { object: 'block', type: 'to_do', to_do: { rich_text: text(content), checked } };
}

function numbered(content) {
  return { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: text(content) } };
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

const children = [
  paragraph(`작성일: ${today}`),
  heading(2, '목적'),
  paragraph('사용자가 Maangchi 같은 창작자를 음식 카드로 오해하지 않도록 검색 결과를 요리와 창작자로 분리한다. 랜딩/앱의 행동 요구를 줄이고, 따라해보기는 화면 밖 안내가 아니라 조리 화면 안의 튜토리얼로 경험하게 만든다. iPhone 16 계열과 Galaxy Fold 계열에서 로딩 멈춤, 중복 렌더링, 화면 잘림을 검증한다.'),
  heading(2, '이번 작업 범위'),
  bullet('검색 화면에서 요리 결과와 창작자 결과를 시각적으로 분리한다.'),
  bullet('빠른 검색어에서 창작자와 요리 카테고리를 섞지 않는다.'),
  bullet('써보기 표현은 사용해보기, 먼저 경험해보기처럼 사용자 행동이 분명한 표현으로 바꾼다.'),
  bullet('따라해보기 버튼 이후 안내는 조리 화면 안 튜토리얼로 넣는다.'),
  bullet('튜토리얼은 다시 보지 않기를 누르기 전까지 조리 화면 안에서 계속 보이게 한다.'),
  bullet('조리 화면 하단의 스크롤 유도성 보조 문구/버튼은 줄인다.'),
  bullet('랜딩과 앱 화면에서 CTA 수를 줄이고, 핵심 행동은 먼저 경험해보기로 모은다.'),
  bullet('모바일 검증 스크립트에 iPhone 16 계열과 Fold 계열 뷰포트를 추가한다.'),
  heading(2, '제외 범위'),
  bullet('실제 벡터 검색 서버나 외부 DB는 이번에 붙이지 않는다.'),
  bullet('검색 결과 데이터의 원천 확장은 하지 않고, 현재 더미 레시피 안에서 표현과 점수 로직만 정리한다.'),
  bullet('실제 iOS/Android 네이티브 앱 빌드는 하지 않는다.'),
  bullet('Google Form/Sheet 수집 구조는 이번 범위에서 변경하지 않는다.'),
  heading(2, '구현 체크리스트'),
  todo('검색 빠른 칩을 요리/상황 중심으로 정리하고 창작자 칩은 별도 영역으로 분리'),
  todo('검색 결과 헤더를 요리 결과와 창작자 결과로 분리'),
  todo('창작자 결과는 작은 행 형태로 보여 요리 카드와 혼동되지 않게 처리'),
  todo('Maangchi 검색 시 레시피 카드와 창작자 행이 동시에 보이되, 의미가 분리되도록 처리'),
  todo('상세 화면의 따라해보기 CTA 문구를 먼저 경험해보기 계열로 수정'),
  todo('조리 화면 튜토리얼을 화면 내부 오버레이/패널로 유지'),
  todo('튜토리얼 안에서 필요한 조작만 안내하고, 화면 밖 보조 요소는 줄임'),
  todo('다시 보지 않기를 누른 경우만 튜토리얼 숨김 상태를 유지'),
  todo('CTA 버튼 수를 줄여 랜딩 첫 화면의 행동 부담 완화'),
  todo('iPhone 16, iPhone 16 Pro Max, Galaxy Fold 접힘/펼침에 가까운 뷰포트 검증 추가'),
  todo('로딩 멈춤, 중복 표시, 화면 잘림, 버튼/텍스트 overflow를 검증 스크립트에서 확인'),
  heading(2, '완료 기준'),
  numbered('Maangchi는 음식 카드처럼 보이지 않고 창작자 결과로 분리된다.'),
  numbered('요리 결과는 계속 카드로 보이며, 제목/재료/창작자 검색이 동작한다.'),
  numbered('따라해보기 진입 후 사용자가 봐야 할 안내가 조리 화면 안에 있다.'),
  numbered('다시 보지 않기를 누르기 전까지 튜토리얼이 조리 화면 안에서 다시 확인 가능하다.'),
  numbered('모바일 짧은 화면과 Fold 폭에서 주요 CTA, 검색 결과, 조리 화면, 음성비서 패널이 잘리지 않는다.'),
  numbered('npm run check, 모바일 플로우 검증, 앱 화면 검증, 전체 동적 검증이 통과한다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: { title: { title: text(title) } },
  children
});

console.log(JSON.stringify({ title, pageId: page.id, url: page.url }, null, 2));

