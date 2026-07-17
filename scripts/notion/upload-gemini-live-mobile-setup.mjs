const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_GEMINI_LIVE_PARENT_PAGE_ID || process.env.NOTION_PARENT_PAGE_ID || '392b1da1d9f98020b3fce1290fee276c';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `00. Gemini Live · Vercel 세팅 가이드 · ${today}`;

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
  paragraph('요청한 구현계획 문서 내부에서 바로 볼 수 있도록 00번 문서로 만든다. Notion API는 기존 블록의 맨 위 재정렬을 직접 지원하지 않으므로 제목에 00 접두어를 붙여 최상단 관리 문서로 식별한다.'),
  heading(2, '결론 먼저'),
  bullet('모바일 웹에서도 마이크 접근은 가능하다. 조건은 HTTPS 배포 주소와 사용자의 명시적 마이크 권한 허용이다. Vercel 배포 URL은 HTTPS라 기본 조건을 만족한다.'),
  bullet('브라우저에 Gemini API 키를 넣으면 안 된다. Vercel 서버리스 함수가 Gemini Live용 짧은 수명의 ephemeral token을 만들고, 프론트는 그 토큰으로 Live 연결을 준비하는 구조로 둔다.'),
  bullet('현재 냄비 웹앱은 /api/gemini-live-token 엔드포인트와 요리비서 마이크 버튼의 권한 확인 흐름까지 준비되어 있다. 실제 음성 송수신을 베타에 켜기 전에는 개인정보 고지, 비용 제한, 베타 플래그가 필요하다.'),
  heading(2, '현재 코드 기준'),
  todo('/api/gemini-live-token.js가 Vercel Function으로 배포됨', true),
  todo('@google/genai 패키지 사용', true),
  todo('요리비서 마이크 버튼 클릭 시 navigator.mediaDevices.getUserMedia({ audio: true }) 권한 확인', true),
  todo('토큰 발급 성공 시 “마이크 권한 확인 · Gemini Live 연결 준비됨” 상태 표시', true),
  todo('환경변수 미설정/권한 거부/토큰 실패 시 기존 추천 질문·직접 입력 흐름 유지', true),
  heading(2, 'Vercel에 넣을 환경변수'),
  code([
    'NAEMBI_GEMINI_API_KEY=Google AI Studio 또는 Google Cloud에서 발급한 Gemini API key',
    'NAEMBI_GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview',
    'NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES=30',
    'NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS=60',
    '',
    '# fallback으로 GOOGLE_API_KEY도 읽지만, 운영 명확성을 위해 NAEMBI_GEMINI_API_KEY 사용 권장'
  ].join('\n')),
  heading(2, 'Vercel Dashboard 세팅 순서'),
  todo('Vercel 프로젝트 naembii-web으로 이동'),
  todo('Settings → Environment Variables 열기'),
  todo('NAEMBI_GEMINI_API_KEY 추가. 값은 절대 GitHub, Notion 공개 페이지, 프론트 코드에 쓰지 않음'),
  todo('Environment는 우선 Production + Preview에 체크. 로컬 vercel dev로 확인할 계획이면 Development도 체크'),
  todo('선택값 NAEMBI_GEMINI_LIVE_MODEL / TTL / NEW_SESSION_SECONDS는 기본값을 그대로 쓸 거면 생략 가능'),
  todo('Save 후 새 Production Deploy 실행. Vercel 환경변수 변경은 이전 배포에는 적용되지 않고 새 배포부터 적용됨'),
  heading(2, 'CLI로 넣는 경우'),
  code([
    'vercel link',
    'vercel env add NAEMBI_GEMINI_API_KEY production preview development',
    'vercel env add NAEMBI_GEMINI_LIVE_MODEL production preview development',
    'vercel env add NAEMBI_GEMINI_LIVE_TOKEN_TTL_MINUTES production preview development',
    'vercel env add NAEMBI_GEMINI_LIVE_NEW_SESSION_SECONDS production preview development',
    '',
    '# 로컬 확인용',
    'vercel env pull .env.local --yes'
  ].join('\n')),
  heading(2, '값을 어디서 가져오나'),
  bullet('NAEMBI_GEMINI_API_KEY: Google AI Studio 또는 Google Cloud의 Gemini API 키. 개인/팀 결제와 사용량 제한을 먼저 확인한다.'),
  bullet('NAEMBI_GEMINI_LIVE_MODEL: 현재 코드 기본값은 gemini-3.1-flash-live-preview. Google 문서 예시와 맞춰둔 값이며, 모델명이 바뀌면 이 환경변수만 교체한다.'),
  bullet('TTL 30분 / 새 세션 시작 60초: Google ephemeral token 기본 개념과 맞춘 값. 사용자가 마이크를 누른 뒤 바로 연결하는 흐름이므로 새 세션 시작 시간은 짧게 둔다.'),
  heading(2, '배포 후 테스트'),
  todo('Vercel 최신 배포가 Ready인지 확인'),
  todo('모바일 Safari/Chrome에서 https://naembii-web.vercel.app/app 접속'),
  todo('조리 모드 → 물어보기 → 마이크 아이콘 클릭'),
  todo('브라우저 마이크 권한 허용'),
  todo('“마이크 권한 확인 · Gemini Live 연결 준비됨” 표시 확인'),
  todo('권한 거부 시 “마이크 권한이 필요해요” 표시 확인'),
  todo('환경변수 누락 시 API가 “NAEMBI_GEMINI_API_KEY가 필요합니다” 계열 오류를 반환하는지 확인'),
  heading(2, '로컬 테스트'),
  code([
    'vercel env pull .env.local --yes',
    'PORT=4873 npm run dev',
    'curl -X POST http://127.0.0.1:4873/api/gemini-live-token \\',
    '  -H "content-type: application/json" \\',
    '  -d \'{"recipe":"콘치즈 불닭볶음면","step":"콘치즈 녹이기"}\''
  ].join('\n')),
  bullet('로컬 일반 npm 서버는 .env.local 자동 로딩이 없을 수 있다. 그 경우 vercel dev를 쓰거나 서버 실행 시 환경변수를 주입한다.'),
  heading(2, '주의할 점'),
  bullet('Gemini Live는 실시간 음성 데이터가 외부 AI API로 전송되는 기능이다. 베타에 켜기 전 개인정보 안내와 동의 문구가 필요하다.'),
  bullet('Live API는 WebSocket 기반 실시간 기능이라 모바일 네트워크, 주방 소음, 배터리 사용량을 별도로 검증해야 한다.'),
  bullet('API 키는 서버 환경변수에만 둔다. NEXT_PUBLIC_ 같은 브라우저 노출 접두어를 쓰면 안 된다.'),
  bullet('사용량 비용 제한과 실패 시 fallback 문구를 먼저 정한 뒤 실제 음성 대화 UI를 켠다.'),
  heading(2, '작업 체크리스트'),
  todo('Vercel 환경변수 추가'),
  todo('새 Production Deploy 실행'),
  todo('모바일 실기기 마이크 권한 테스트'),
  todo('토큰 발급 API 성공/실패 로그 확인'),
  todo('개인정보 안내 문구와 베타 동의 문구 작성'),
  todo('실제 Live 음성 송수신 활성화 여부 결정'),
  heading(2, '참고 문서'),
  linkParagraph('Vercel Environment Variables', 'https://vercel.com/docs/environment-variables'),
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
