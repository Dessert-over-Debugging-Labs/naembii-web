const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `냄비 다음 작업 계획 · 로컬 후기·팁·게스트 흐름 · ${today}`;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

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

const children = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: 베타 체험자가 앱 안에서 요리 후기와 조리 팁을 남기고 다시 볼 수 있게 하며, 제품 의견·요리 후기·레시피 요청의 의미가 섞이지 않도록 정리한다.'),
  heading(2, '이번 작업 범위'),
  todo('완료 화면의 "후기 남기기"를 제품 피드백이 아니라 현재 요리 후기 작성으로 분리한다.'),
  todo('내 조리 팁 남기기 화면을 추가하고 로컬 저장 후 상세/홈에서 다시 보이게 한다.'),
  todo('로컬에서도 저장되는 게스트 사용 상태를 홈 계정 아이콘에서 안내한다.'),
  todo('알림 아이콘 클릭 시 앞으로 영상 링크를 보내면 레시피 생성/반영 알림을 받을 수 있다는 예정 화면으로 연결한다.'),
  todo('완성 화면에 홈으로 가기 버튼을 추가하고 다시 요리하기, 공유, 후기/팁 액션을 정돈한다.'),
  heading(2, '범위 밖'),
  bullet('서버 DB 저장, 소셜 로그인 실제 구현, 실시간 커뮤니티 피드는 이번 범위에서 제외한다.'),
  bullet('게스트 저장은 같은 브라우저 localStorage 기준이며, 운영 저장은 이후 로그인/동기화 기능에서 다룬다.'),
  bullet('제품 전반 의견은 기존 오른쪽 하단 의견 남기기 버튼으로 유지한다.'),
  heading(2, '커밋 단위'),
  todo('commit 1: 로컬 요리 후기·팁 저장과 표시'),
  todo('commit 2: 완료 화면 액션 정돈과 홈 이동'),
  todo('commit 3: 게스트 계정/알림 예정 화면 연결'),
  todo('commit 4: 모바일 검증 스크립트와 화면 캡처 상태 보강'),
  heading(2, '검증 기준'),
  todo('npm run check 통과'),
  todo('모바일 플로우에서 후기 작성, 팁 작성, 완료 화면 홈 이동, 계정/알림 화면 진입 확인'),
  todo('앱 화면 캡처 검증에 reviews/tipWrite/account/notifications 상태를 포함하고 화면 잘림 0건 확인'),
  todo('제품 의견 모달과 요리 후기/팁 저장 흐름이 서로 다른 문구와 동작으로 보이는지 확인'),
  heading(2, '예상 UI 문구'),
  code([
    '이 요리 후기 남기기',
    '내 조리 팁 남기기',
    '홈으로 가기',
    '게스트로 저장 중',
    '앱 출시 후 로그인하면 저장한 레시피와 후기를 이어서 볼 수 있게 준비할 예정',
    '영상 링크를 보내면 레시피가 준비될 때 알려드릴게요'
  ].join('\n')),
  heading(2, '논의할 부분'),
  bullet('로컬 후기/팁을 홈에 어느 정도 노출할지: 너무 커뮤니티처럼 보이면 실제 서버 저장으로 오해할 수 있다.'),
  bullet('완료 화면에서 가장 중요한 액션을 공유, 후기, 홈 중 무엇으로 둘지 베타 사용 흐름을 보고 조정한다.'),
  bullet('알림 예정 화면은 실제 푸시 알림처럼 과장하지 않고, 현재는 출시 알림/레시피 요청과 연결한다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: text(title) } },
  children
});

await appendBlocks(actionPageId, [
  heading(3, `다음 작업 계획 · ${today}`),
  paragraph(`로컬 후기·팁·게스트 흐름 작업 계획: ${page.url}`)
]);

console.log(JSON.stringify({
  title,
  pageId: page.id,
  url: page.url,
  parent: actionPageId
}, null, 2));
