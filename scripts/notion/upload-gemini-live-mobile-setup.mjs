const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_GEMINI_LIVE_PARENT_PAGE_ID || '396b1da1d9f98036b1a9ff5fdd8d020e';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `Gemini Live 모바일 웹 세팅 검토 · ${today}`;

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
  heading(2, '결론'),
  bullet('모바일 웹에서도 마이크 접근은 가능하다. 단, HTTPS 배포 주소와 사용자의 명시적 권한 허용이 필요하다.'),
  bullet('Vercel 배포 URL은 HTTPS라 모바일 Safari/Chrome에서 getUserMedia 조건을 만족한다.'),
  bullet('Gemini API 키는 브라우저에 노출하지 않고, Vercel 서버리스 함수가 Live용 1회성 ephemeral token을 발급하는 구조로 세팅한다.'),
  heading(2, '이번 코드 반영'),
  todo('/app 요리비서 패널의 마이크 버튼을 모바일 권한 확인 + Gemini Live 준비 확인으로 연결', true),
  todo('/api/gemini-live-token 추가: @google/genai authTokens.create()로 token.name 발급', true),
  todo('NAEMBI_GEMINI_API_KEY 환경변수 계약 추가', true),
  todo('환경변수 미설정 또는 권한 거부 시 기존 추천 질문/직접 입력 흐름 유지', true),
  heading(2, 'Vercel 환경변수'),
  code([
    'NAEMBI_GEMINI_API_KEY=Google AI Studio에서 발급한 Gemini API key',
    'NAEMBI_GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview',
    'NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES=30',
    'NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS=60'
  ].join('\n')),
  heading(2, '모바일 검증 절차'),
  todo('iPhone Safari 또는 Android Chrome에서 Vercel 배포 URL 접속'),
  todo('/app 진입 후 조리 모드에서 물어보기 클릭'),
  todo('마이크 아이콘 클릭'),
  todo('브라우저 마이크 권한 허용'),
  todo('마이크 권한 확인 · Gemini Live 연결 준비됨 문구 확인'),
  heading(2, '아직 기본 활성화하지 않는 범위'),
  bullet('실시간 음성 송수신은 실제 사용자 음성이 외부 AI API로 전송되므로 개인정보 고지와 동의 문구가 필요하다.'),
  bullet('Gemini Live 사용량 비용, 모바일 네트워크 지연, 주방 소음 환경을 별도 베타 플래그로 검증한 뒤 켠다.'),
  bullet('현재 반영은 배포 가능한 안전한 연결 준비 단계이며, 실패 시 기존 요리비서 mock 흐름이 유지된다.'),
  heading(2, '참고 문서'),
  linkParagraph('Google AI Gemini Live API', 'https://ai.google.dev/gemini-api/docs/live'),
  linkParagraph('Google AI Gemini Live ephemeral tokens', 'https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens'),
  linkParagraph('MDN getUserMedia', 'https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: { title: { title: text(title) } },
  children
});

console.log(JSON.stringify({ title, pageId: page.id, url: page.url }, null, 2));
