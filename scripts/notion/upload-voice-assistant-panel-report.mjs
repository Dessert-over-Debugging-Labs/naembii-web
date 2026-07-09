const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_VOICE_ASSISTANT_PARENT_PAGE_ID || '396b1da1d9f98036b1a9ff5fdd8d020e';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `음성비서 패널 적용 결과 리포트 · ${today}`;

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

function code(content) {
  return { object: 'block', type: 'code', code: { rich_text: text(content), language: 'plain text' } };
}

function linkParagraph(label, url) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(label, url) } };
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
  heading(2, '연결된 작업 계획'),
  linkParagraph('노션 작업계획', 'https://app.notion.com/p/2026-07-09-398b1da1d9f981778916d22466e32043'),
  paragraph('로컬 계획 문서: docs/VOICE_ASSISTANT_PANEL_PLAN_ko.md'),
  heading(2, '반영 내용'),
  bullet('랜딩의 요리비서 소개를 조리 중 막히는 순간을 짧게 물어보는 기능 중심으로 보정했다.'),
  bullet('앱 홈의 요리비서 진입 카드를 재료, 시간, 막히는 상황 기준의 탐색 흐름으로 바꿨다.'),
  bullet('조리모드 음성비서 패널 상단에 손잡이 바를 추가했다.'),
  bullet('손잡이 바를 누르면 패널이 기본 크기와 크게 보기 사이에서 전환된다.'),
  bullet('패널을 닫거나 화면을 벗어나면 기본 크기로 초기화된다.'),
  bullet('Gemini Live 준비 안내와 추천 질문/직접 입력 흐름은 유지했다.'),
  bullet('모바일 검증 스크립트가 패널 크기 전환을 자동으로 확인하도록 보강했다.'),
  heading(2, '검증 결과'),
  code([
    'npm run check: PASS',
    'node --check scripts/validate-mobile-flow.mjs: PASS',
    'node --check scripts/validate-app-screens.mjs: PASS',
    'node --check scripts/notion/upload-voice-assistant-panel-plan.mjs: PASS',
    'npm run verify:mobile-flow -- http://127.0.0.1:4876 9432: PASS',
    'npm run verify:app-screens -- http://127.0.0.1:4876 /tmp/naembi-voice-panel-screens 9433: PASS, 30개 화면 실패 0',
    'npm run verify:visual -- --full --min-score=96 --base-url=http://127.0.0.1:4876/: PASS, 130 / 130'
  ].join('\n')),
  heading(2, '모바일 확인 포인트'),
  bullet('조리모드에서 물어보기를 누르면 요리비서 패널이 기본 크기로 열린다.'),
  bullet('상단 손잡이 바를 누르면 크게 보기로 전환된다.'),
  bullet('크게 보기 상태에서도 추천 질문과 직접 입력이 유지된다.'),
  bullet('패널이 열린 직후 자동 대화나 단계 이동은 발생하지 않는다.'),
  bullet('마이크 버튼은 모바일 권한과 Gemini Live 연결 준비 확인으로 유지된다.'),
  heading(2, '다음 단계'),
  bullet('Vercel 배포 후 실제 모바일 Safari/Chrome에서 손잡이 전환과 마이크 권한 안내를 확인한다.'),
  bullet('Gemini Live를 실제 대화로 켜기 전에는 개인정보 고지, 비용 제한, 베타 플래그를 먼저 정한다.'),
  bullet('홍보/마케팅 세션에서는 SNS 요리를 따라 하다 막히는 순간을 줄이는 베타로 설명하고, 완성형 음성 AI처럼 과장하지 않는다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: { title: { title: text(title) } },
  children
});

console.log(JSON.stringify({ title, pageId: page.id, url: page.url }, null, 2));
