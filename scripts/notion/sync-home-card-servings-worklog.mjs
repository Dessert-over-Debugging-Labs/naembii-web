const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const mode = process.argv[2] || 'plan';
const worklogPageId = process.env.NOTION_HOME_CARD_WORKLOG_PAGE_ID || process.argv[3];
const title = `홈 레시피 카드 인분 표시 제거 · ${today}`;

if (!token) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

function text(content, href) {
  return [{ type: 'text', text: { content, ...(href ? { link: { url: href } } : {}) } }];
}

function block(type, content, checked = false, href) {
  if (type === 'to_do') return { object: 'block', type, to_do: { rich_text: text(content), checked } };
  if (type === 'divider') return { object: 'block', type, divider: {} };
  return { object: 'block', type, [type]: { rich_text: text(content, href) } };
}

async function notion(path, body, method = 'POST') {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  return data;
}

const planBlocks = [
  block('paragraph', `작성일: ${today}`),
  block('heading_2', '변경 범위'),
  block('paragraph', '홈 화면의 레시피 카드 메타에서 인분 표시만 제거한다. 검색 결과와 상세 화면은 레시피 선택 판단에 필요한 정보이므로 기존 인분 표시를 유지한다.'),
  block('to_do', '홈의 지금 사람들이 많이 만드는 요리 카드에서 인분 제거'),
  block('to_do', '홈의 재료 8개 이하로 시작 카드에서 인분 제거'),
  block('to_do', '홈의 SNS에서 자주 보이는 메뉴 카드에서 인분 제거'),
  block('to_do', '검색 결과 카드의 크리에이터·인분 메타 유지'),
  block('to_do', '모바일 홈 화면과 검색 결과 화면 자동 검증'),
  block('heading_2', '구현 원칙'),
  block('bulleted_list_item', '공용 카드 함수에 홈 전용 메타 옵션을 전달해 다른 화면의 정보를 바꾸지 않는다.'),
  block('bulleted_list_item', '카드 높이와 제목·반응 수 배치는 그대로 유지해 레이아웃 변화를 최소화한다.')
];

const reportBlocks = [
  block('divider'),
  block('heading_2', '반영 결과'),
  block('to_do', '홈 세 섹션 레시피 카드에서 인분 표시 제거', true),
  block('to_do', '검색 결과 카드 인분 표시 유지', true),
  block('to_do', 'npm run check 통과', true),
  block('to_do', '모바일 플로우에서 홈 인분 0건·검색 결과 인분 유지 확인', true),
  block('to_do', '검색 입력의 브라우저 기본 취소 버튼을 숨겨 X 아이콘 하나만 표시', true),
  block('to_do', '7개 뷰포트 앱 화면 잘림 검증 통과', true),
  block('to_do', 'GitHub main push 후 Vercel 공개 /app 응답과 모바일 흐름 확인', true)
];

const scopeBlocks = [
  block('heading_2', '추가 범위 · 검색 입력 중복 X'),
  block('paragraph', '모바일 Safari와 일부 Chromium에서 type="search" 기본 취소 버튼과 앱의 커스텀 X가 동시에 보일 수 있다. 브라우저 기본 버튼만 숨기고 앱 버튼 하나를 유지한다.'),
  block('to_do', '검색 시작 화면과 결과 화면에서 X 아이콘 중복 제거'),
  block('to_do', '검색어가 있을 때 커스텀 X와 검색 실행 버튼이 각각 하나씩 보이는지 캡처 확인')
];

if (mode === 'scope') {
  if (!worklogPageId) throw new Error('scope 모드에는 작업 페이지 ID가 필요합니다.');
  await notion(`/blocks/${worklogPageId}/children`, { children: scopeBlocks }, 'PATCH');
  console.log(JSON.stringify({ mode, pageId: worklogPageId, appendedBlocks: scopeBlocks.length }, null, 2));
  process.exit(0);
}

if (mode === 'report') {
  if (!worklogPageId) throw new Error('report 모드에는 작업 페이지 ID가 필요합니다.');
  await notion(`/blocks/${worklogPageId}/children`, { children: reportBlocks }, 'PATCH');
  console.log(JSON.stringify({ mode, pageId: worklogPageId, appendedBlocks: reportBlocks.length }, null, 2));
  process.exit(0);
}

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: text(title) } },
  children: planBlocks
});

await notion(`/blocks/${actionPageId}/children`, {
  children: [
    block('heading_3', `홈 카드 메타 수정 · ${today}`),
    block('paragraph', '홈 레시피 카드 인분 표시 제거 작업 기록', false, page.url)
  ]
}, 'PATCH');

console.log(JSON.stringify({ mode: 'plan', title, pageId: page.id, url: page.url }, null, 2));
