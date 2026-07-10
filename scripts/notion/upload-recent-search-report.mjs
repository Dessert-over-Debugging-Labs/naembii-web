const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `검색 시작·결과 화면 분리 작업 리포트 · ${today}`;
const planUrl = 'https://app.notion.com/p/2026-07-10-399b1da1d9f981a99759f2d7f788c30b';

if (!token) throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');

function richText(content, href) {
  return [{ type: 'text', text: { content, ...(href ? { link: { url: href } } : {}) } }];
}

function block(type, content, checked = false, href) {
  if (type === 'to_do') return { object: 'block', type, to_do: { rich_text: richText(content), checked } };
  return { object: 'block', type, [type]: { rich_text: richText(content, href) } };
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
  block('paragraph', `반영일: ${today}`),
  block('paragraph', '구현 전 계획 문서 보기', false, planUrl),
  block('heading_2', '반영 완료'),
  block('to_do', '검색 시작 화면에서 고정 예시 검색어와 기본 추천 결과 제거', true),
  block('to_do', '최근 검색어 최대 8개를 같은 브라우저에 최신순으로 저장', true),
  block('to_do', '같은 검색어 중복 제거 및 최근 위치 이동', true),
  block('to_do', '최근 검색어 선택, 개별 삭제, 전체 삭제 구현', true),
  block('to_do', '검색 제출 후 별도 검색 결과 목록 화면으로 이동', true),
  block('to_do', '결과 화면에서 검색어 수정과 재검색 지원', true),
  block('to_do', '요리 결과와 크리에이터 결과 분리 유지', true),
  block('to_do', '검색 흐름 GIF 캡처 스크립트를 새 화면 구조에 맞게 갱신', true),
  block('heading_2', '검증 결과'),
  block('to_do', 'npm run check 통과', true),
  block('to_do', '모바일 플로우: 검색 전 빈 상태, 결과 화면 이동, 저장·개별 삭제·전체 삭제 통과', true),
  block('to_do', '앱 화면 검증: 7개 뷰포트 × 18개 상태 = 126개, 실패 0건', true),
  block('to_do', '전체 동적 검증: 127/130점, 98%, PASS', true),
  block('to_do', '390px, 375×667, iPhone 16, Fold 접힘 화면 대표 캡처 직접 확인', true),
  block('heading_2', '동작 흐름'),
  block('numbered_list_item', '홈에서 검색을 열면 검색 입력과 최근 검색만 보인다.'),
  block('numbered_list_item', '검색어를 입력하고 Enter 또는 화살표 버튼을 누르면 검색 결과 화면으로 이동한다.'),
  block('numbered_list_item', '검색 결과 화면에서 크리에이터 행과 요리 카드 목록을 각각 확인한다.'),
  block('numbered_list_item', '뒤로 가면 방금 검색한 항목이 최근 검색 최상단에 보인다.'),
  block('heading_2', '저장 범위'),
  block('bulleted_list_item', '최근 검색은 localStorage 키 naembi.recentSearches.v1에 저장한다.'),
  block('bulleted_list_item', '같은 브라우저에서만 유지되며 로그인 계정이나 다른 기기와는 아직 동기화하지 않는다.'),
  block('bulleted_list_item', '고정 예시였던 Maangchi와 성시경은 사용자가 직접 검색한 경우에만 최근 검색에 나타난다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: richText(title) } },
  children
});

await notion(`/blocks/${actionPageId}/children`, {
  children: [
    block('heading_3', `검색 흐름 개선 완료 · ${today}`),
    block('paragraph', '최근 검색·별도 결과 화면 작업 리포트', false, page.url)
  ]
}, 'PATCH');

console.log(JSON.stringify({ title, pageId: page.id, url: page.url, parent: actionPageId }, null, 2));
