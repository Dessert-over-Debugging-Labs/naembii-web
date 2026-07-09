const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_SEARCH_TUTORIAL_PARENT_PAGE_ID || '396b1da1d9f980deb3bff5582ba6aabe';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `검색·따라해보기·반응형 검증 작업 리포트 · ${today}`;

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
  paragraph('기준 URL: http://127.0.0.1:4876'),
  paragraph('최종 검증: PASS · 기존 점수표 130 / 130, 100%'),
  heading(2, '반영 내용'),
  numbered('검색 화면에서 요리 결과와 창작자 결과를 분리했다. Maangchi는 창작자 행으로 보이고, 실제 요리는 별도 카드로 표시된다.'),
  numbered('조리 모드 튜토리얼을 전체 화면 덮개가 아니라 조리 화면 내부 안내 패널로 바꿨다.'),
  numbered('Fold 접힘 폭에서 튜토리얼 문구가 잘리지 않도록 버튼을 다음 줄로 내렸다.'),
  numbered('랜딩 히어로 CTA는 앱 진입과 베타 신청으로 줄이고, 레시피 요청은 하단 폼에서 유지했다.'),
  numbered('iPhone 16, iPhone 16 Pro Max, Galaxy Fold 접힘/펼침 뷰포트를 앱 캡처 검증에 추가했다.'),
  heading(2, '검증 결과'),
  bullet('npm run check: PASS'),
  bullet('npm run verify:mobile-flow -- http://127.0.0.1:4876 9485: PASS'),
  bullet('npm run verify:app-screens -- http://127.0.0.1:4876 /tmp/naembi-app-screens-20260709-r3 9484: PASS, 77개 상태 실패 0건'),
  bullet('npm run verify:ralph-loop -- --base-url=http://127.0.0.1:4876 --rounds=1 --max-minutes=5 --interval-seconds=5: PASS, 130/130, 100%'),
  heading(2, '확인한 캡처'),
  bullet('/tmp/naembi-app-screens-20260709-r3/mobile-short-search-creator.png'),
  bullet('/tmp/naembi-app-screens-20260709-r3/fold-closed-cook3-hint.png'),
  heading(2, '남은 논의'),
  bullet('Notion 어휘 후보 페이지에서 체크된 항목이 0개라서 문구 후보 교체는 보류했다.'),
  bullet('후보가 체크되면 npm run notion:copy-candidates:read로 승인 항목만 읽고 반영한다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: { title: { title: text(title) } },
  children
});

console.log(JSON.stringify({ title, pageId: page.id, url: page.url }, null, 2));
