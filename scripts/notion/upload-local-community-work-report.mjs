import { execFileSync } from 'node:child_process';

const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `냄비 로컬 후기·팁·게스트 흐름 작업 리포트 · ${today}`;
const planUrl = 'https://app.notion.com/p/2026-07-10-399b1da1d9f98167a230ec093ddcb91c';

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

function gitLines(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function text(content, href) {
  return [{ type: 'text', text: { content, ...(href ? { link: { url: href } } : {}) } }];
}

function paragraph(content) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function linkParagraph(label, url) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(label, url) } };
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

async function appendBlocks(blockId, children) {
  return notion(`/blocks/${blockId}/children`, { children }, 'PATCH');
}

const commits = gitLines(['log', '-9', '--pretty=format:%h %s'], '커밋 정보 확인 실패');

const children = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 로컬 후기·조리 팁 저장, 완료 화면 액션 정돈, 게스트 계정/알림 예정 화면, 모바일 검증 보강 결과를 한 곳에 남긴다.'),
  linkParagraph('선행 작업 계획 페이지', planUrl),
  heading(2, '반영 완료'),
  todo('요리 후기와 조리 팁을 localStorage에 저장하고 상세/후기/홈에서 다시 보이게 했다.', true),
  todo('제품 의견 모달과 요리 후기/팁 저장 흐름을 문구와 동작 기준으로 분리했다.', true),
  todo('완료 화면에 홈으로 가기, 다시 요리하기, 이 요리 후기, 내 조리 팁, 공유 액션을 정리했다.', true),
  todo('홈 계정 아이콘을 게스트 저장/향후 로그인 안내 화면으로 연결했다.', true),
  todo('홈 알림 아이콘을 영상 링크 요청/레시피 준비 알림 예정 화면으로 연결했다.', true),
  todo('모바일 플로우 검증과 앱 화면 잘림 검증에 새 흐름을 추가했다.', true),
  todo('375x667 짧은 모바일에서 완료 화면이 잘리지 않도록 반응형 밀도를 조정했다.', true),
  heading(2, '검증 결과'),
  todo('npm run check PASS', true),
  todo('npm run verify:mobile-flow -- http://127.0.0.1:4873 9415 PASS', true),
  todo('npm run verify:app-screens -- http://127.0.0.1:4873 /tmp/cook-wireframe-v3/app-screens 9414 PASS · 119개 상태 잘림 0건', true),
  todo('npm run verify:visual -- --full --min-score=96 --base-url=http://127.0.0.1:4873 PASS · 127/130, 98%', true),
  todo('캡처 확인: /tmp/cook-wireframe-v3/app-screens/mobile-short-complete.png · /tmp/cook-wireframe-v3/dynamic-mobile.png', true),
  heading(2, '남은 리스크'),
  bullet('로컬 저장은 같은 브라우저 기준이다. 서버 저장, 로그인 동기화, 실제 사용자 간 커뮤니티 피드는 이후 단계에서 별도 설계가 필요하다.'),
  bullet('알림 화면은 실제 푸시가 아니라 베타 요청/출시 알림 안내다. 배포 화면에서도 과장되지 않게 유지해야 한다.'),
  bullet('검증 점수에서 피드백·레시피 수집은 12/15로 남아 있다. 실제 운영 저장소와 Slack/Sheet 자동화 연결 상태는 별도 운영 테스트가 필요하다.'),
  heading(2, '커밋'),
  code(commits)
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: text(title) } },
  children
});

await appendBlocks(actionPageId, [
  heading(3, `작업 완료 리포트 · ${today}`),
  paragraph(`로컬 후기·팁·게스트 흐름 작업 리포트: ${page.url}`)
]);

console.log(JSON.stringify({
  title,
  pageId: page.id,
  url: page.url,
  parent: actionPageId
}, null, 2));
