const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `검색 시작·결과 화면 분리 계획 · ${today}`;

if (!token) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

function text(content) {
  return [{ type: 'text', text: { content } }];
}

function block(type, content, checked = false) {
  if (type === 'to_do') return { object: 'block', type, to_do: { rich_text: text(content), checked } };
  return { object: 'block', type, [type]: { rich_text: text(content) } };
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

const children = [
  block('paragraph', `작성일: ${today}`),
  block('heading_2', '목적'),
  block('paragraph', '검색 화면의 고정 예시 검색어와 기본 결과를 제거한다. 검색 시작 화면에서는 사용자가 실제로 검색한 기록을 보여주고, 검색을 실행한 뒤에는 별도의 목록 화면에서 요리와 크리에이터 결과를 확인하게 한다.'),
  block('heading_2', '구현 체크리스트'),
  block('to_do', '검색 시작 화면을 검색 입력과 최근 검색 목록 중심으로 정리'),
  block('to_do', '최근 검색어를 같은 브라우저에 최대 8개 저장하고 최신순으로 표시'),
  block('to_do', '최근 검색어 개별 삭제와 전체 삭제 제공'),
  block('to_do', '검색어 제출 또는 최근 검색어 선택 시 별도 검색 결과 화면으로 이동'),
  block('to_do', '검색 결과 화면에서 요리 결과와 크리에이터 결과를 분리해 표시'),
  block('to_do', '검색 결과 화면에서 검색어 수정 및 재검색 지원'),
  block('to_do', '모바일 짧은 화면과 Fold 폭에서 최근 검색·결과 목록 잘림 검증'),
  block('heading_2', '동작 원칙'),
  block('bulleted_list_item', '검색어를 입력하는 동안에는 시작 화면이 유지되며 Enter 또는 검색 버튼으로 검색을 확정한다.'),
  block('bulleted_list_item', '빈 검색어는 기록에 저장하지 않는다.'),
  block('bulleted_list_item', '같은 검색어는 중복 저장하지 않고 가장 최근 위치로 이동한다.'),
  block('bulleted_list_item', '기록은 localStorage에 저장하며 다른 기기와 동기화하지 않는다.'),
  block('heading_2', '완료 기준'),
  block('to_do', '고정 검색어 Maangchi·성시경 등이 검색 시작 화면에 노출되지 않음'),
  block('to_do', '검색 전에는 레시피 결과 카드가 노출되지 않음'),
  block('to_do', '검색 후 별도 결과 화면으로 이동하고 뒤로 가면 최근 검색 화면으로 돌아옴'),
  block('to_do', '최근 검색 저장·재검색·개별 삭제·전체 삭제 자동 검증 통과'),
  block('to_do', 'npm run check와 모바일 화면 검증 통과')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: text(title) } },
  children
});

await notion(`/blocks/${actionPageId}/children`, {
  children: [
    block('heading_3', `검색 흐름 개선 계획 · ${today}`),
    {
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: '최근 검색·별도 결과 화면 작업 계획', link: { url: page.url } } }] }
    }
  ]
}, 'PATCH');

console.log(JSON.stringify({ title, pageId: page.id, url: page.url, parent: actionPageId }, null, 2));
