import { execFileSync } from 'node:child_process';

const NOTION_VERSION = '2022-06-28';
const token = process.env.NOTION_TOKEN;
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const docsParentPageId = process.env.NOTION_PARENT_PAGE_ID || '392b1da1d9f98020b3fce1290fee276c';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const mode = process.argv[2] || 'plan';

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

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function gitLines(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
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

async function createPage(parentPageId, title, children) {
  return notion('/pages', {
    parent: { type: 'page_id', page_id: parentPageId },
    properties: { title: { title: text(title) } },
    children
  });
}

function landingPlanChildren() {
  return [
    paragraph(`작성일: ${today}`),
    paragraph('목적: 모바일에서 랜딩페이지 스크롤이 길어 베타 사용자 이탈 가능성이 높다. 제품 소개와 핵심 CTA는 유지하되, 모바일에서는 중복 설명을 접고 앱 체험·출시 알림·요리 요청까지 빠르게 도달하게 만든다.'),
    heading(2, '현재 측정값'),
    code([
      'viewport: 390x844',
      'documentHeight: 7462px',
      'mobileScrollScreens: 8.84',
      'hero: 782px',
      'screens: 948px',
      'flow: 991px',
      'assistant: 2003px',
      'roadmap: 958px',
      'beta: 1599px'
    ].join('\n')),
    heading(2, '우선순위'),
    todo('P0: 모바일 랜딩 전체 스크롤 길이를 줄인다.', false),
    todo('P0: 첫 화면에서 핵심 GIF, 먼저 경험해보기, 출시 소식 받기가 유지되는지 검증한다.', false),
    todo('P0: 화면 미리보기는 모바일에서 작은 가로 스와이프 카드로 압축한다.', false),
    todo('P0: 사용 흐름과 로드맵은 모바일에서 중복 설명을 줄이거나 접는다.', false),
    todo('P0: 요리비서 소개는 대화 예시 1개와 추천 선택 1개로 줄인다.', false),
    todo('P0: 베타 신청과 요리 요청은 모바일에서 탭/요약형으로 압축한다.', false),
    heading(2, '단계별 작업'),
    bullet('1단계: 랜딩 모바일 기준값과 실패 지점 측정'),
    bullet('2단계: 모바일 CSS/마크업 압축'),
    bullet('3단계: 랜딩 캡처 검증과 실제 스크린샷 확인'),
    bullet('4단계: 앱 내부 요리비서 변경과 충돌 여부 확인'),
    bullet('5단계: 5-6시간 장시간 동적 검증 워크플로우 제작'),
    bullet('6단계: Android 개발 세팅 문서와 다음 세션 프롬프트 작성'),
    heading(2, '완료 기준'),
    code([
      '1. mobileScrollScreens를 현재 8.84보다 유의미하게 낮춘다.',
      '2. hero CTA와 핵심 GIF가 첫 화면에 유지된다.',
      '3. beta 섹션까지 도달하는 부담이 줄어든다.',
      '4. npm run check PASS',
      '5. landing capture mobile/tablet/desktop PASS',
      '6. npm run verify:mobile-flow PASS',
      '7. npm run verify:app-screens PASS',
      '8. 장시간 워크플로우는 smoke 실행과 5-6시간 실행 명령을 제공한다.'
    ].join('\n')),
    heading(2, '커밋 단위'),
    todo('commit 1: 랜딩 모바일 압축 계획과 측정 지표 문서화'),
    todo('commit 2: 랜딩 모바일 압축 구현'),
    todo('commit 3: 요리비서 UX/오디오 덕킹 유지 및 검증 업데이트'),
    todo('commit 4: 장시간 동적 검증 워크플로우 추가'),
    todo('commit 5: Android 세팅 문서와 다음 세션 프롬프트')
  ];
}

function reportChildren() {
  const commits = gitLines(['log', '--pretty=format:%h %s', '--max-count=16']);
  const status = gitLines(['status', '--short']);
  return [
    divider(),
    heading(2, `완료 리포트 · ${today}`),
    paragraph('랜딩 모바일 스크롤 압축, 요리비서 UX, 검증 워크플로우, Android 세팅 문서 작업 완료 후 누적 기록이다.'),
    heading(3, '완료 체크'),
    todo('모바일 랜딩 섹션 압축 완료', true),
    todo('랜딩 모바일/태블릿/데스크톱 캡처 검증 완료', true),
    todo('앱 내부 모바일 플로우 검증 완료', true),
    todo('앱 화면 7개 뷰포트 캡처 검증 완료', true),
    todo('장시간 동적 검증 워크플로우 스크립트 추가 및 smoke 확인', true),
    todo('Android 개발 세팅 문서와 다음 세션 프롬프트 작성', true),
    heading(3, '측정 결과'),
    code([
      'landing mobile: 7462px / 8.84 screens -> 2957px / 3.5 screens',
      'landing tablet: 3827px / 3.48 screens',
      'landing desktop: 5071px / 4.61 screens',
      'cropped screen images: 0',
      'visible forbidden internal terms: 0',
      'load-performance: DOMContentLoaded 48ms, load 671ms, YouTube iframe 0',
      'verify:mobile-flow: PASS',
      'verify:app-screens: PASS, 126 checked / 0 failed',
      'verify:long-dynamic:smoke: PASS, 1 cycle / 6 tasks / 34s'
    ].join('\n')),
    heading(3, '추가 보정'),
    bullet('짧은 모바일 화면에서 요리비서 패널 기본 높이를 낮추고 영상 높이를 줄여 현재 단계 카드가 먼저 보이도록 수정했다.'),
    bullet('짧은 화면에서는 요리비서 베타 배지를 접고 질문 칩과 말하기 준비 버튼이 같이 보이도록 압축했다.'),
    bullet('전체 5-6시간 검증은 npm run verify:long-dynamic -- --base-url=http://127.0.0.1:4873 --duration-minutes=360 --interval-minutes=20 --full 로 실행한다.'),
    heading(3, '최근 커밋'),
    code(commits || '커밋 확인 실패'),
    heading(3, '작업 트리'),
    code(status || 'clean')
  ];
}

function androidChildren() {
  return [
    paragraph(`작성일: ${today}`),
    heading(2, '목적'),
    paragraph('웹 베타가 모바일 중심으로 안정화된 뒤 Android 개발을 시작하기 위한 로컬 세팅, 검증 기준, 다음 세션 인계 프롬프트를 정리한다.'),
    heading(2, '현재 방향'),
    bullet('지금은 웹 베타를 먼저 배포하고, Android는 WebView 래퍼 또는 네이티브 전환 중 무엇이 맞는지 검토한다.'),
    bullet('이미 `android-wrapper/` 폴더가 있으므로 첫 단계는 기존 래퍼가 최신 웹 URL을 안정적으로 띄우는지 확인하는 것이다.'),
    bullet('Gemini Live나 마이크 권한은 Android WebView 권한 처리와 개인정보 문구가 필요해 별도 검증 항목으로 둔다.'),
    heading(2, '로컬 준비'),
    code([
      '1. Android Studio 설치',
      '2. JDK 17 확인',
      '3. ANDROID_HOME 확인',
      '4. 에뮬레이터 또는 실기기 준비',
      '5. android-wrapper/README_ko.md 확인',
      '6. android-wrapper/build-apk.sh 실행 가능 여부 확인'
    ].join('\n')),
    heading(2, '검증 체크리스트'),
    todo('WebView에서 https://naembii-web.vercel.app/app 접속 가능'),
    todo('홈, 검색, 상세, 조리 모드가 모바일 폭에서 잘리지 않음'),
    todo('YouTube iframe 재생/음량 제어 정책 확인'),
    todo('마이크 권한 요청이 WebView에서 정상 표시되는지 확인'),
    todo('피드백/요리 요청 폼 제출 가능'),
    todo('뒤로가기 버튼과 Android 시스템 back 동작 정리'),
    heading(2, '다음 세션 프롬프트'),
    code([
      '목표: 냄비 웹 베타를 기준으로 Android 개발 세팅을 시작한다.',
      '1. /Users/osein/cook-assistance-wireframe 저장소에서 시작한다.',
      '2. 먼저 AGENTS.md 지침과 android-wrapper/README_ko.md를 읽는다.',
      '3. 웹 베타 최신 main을 pull/fetch하고 /app 배포 URL 동작을 확인한다.',
      '4. android-wrapper가 최신 Vercel URL을 띄우는지 확인하고, 필요하면 설정을 수정한다.',
      '5. Android Studio/Gradle/JDK/ANDROID_HOME 상태를 점검한다.',
      '6. 에뮬레이터 또는 연결된 기기에서 빌드/실행한다.',
      '7. WebView 마이크 권한, YouTube 재생/음량, 뒤로가기, 폼 제출을 체크리스트로 검증한다.',
      '8. 모든 단계는 Notion 작업 페이지에 기록하고, 커밋 메시지는 한국어 Conventional Commit으로 분리한다.'
    ].join('\n'))
  ];
}

if (mode === 'plan') {
  const title = `랜딩 모바일 압축·장시간 검증·Android 인계 계획 · ${today}`;
  const page = await createPage(actionPageId, title, landingPlanChildren());
  await appendBlocks(actionPageId, [
    heading(3, `진행 작업 · ${today}`),
    paragraph(`랜딩 모바일 압축·장시간 검증·Android 인계 계획: ${page.url}`)
  ]);
  console.log(JSON.stringify({ mode, title, pageId: page.id, url: page.url }, null, 2));
} else if (mode === 'report') {
  const pageId = process.env.NOTION_MOBILE_LANDING_WORKLOG_PAGE_ID;
  if (!pageId) throw new Error('report 모드에는 NOTION_MOBILE_LANDING_WORKLOG_PAGE_ID가 필요합니다.');
  await appendBlocks(pageId, reportChildren());
  console.log(JSON.stringify({ mode, pageId, appended: true }, null, 2));
} else if (mode === 'android') {
  const title = `Android 개발 세팅 인계 문서 · ${today}`;
  const page = await createPage(docsParentPageId, title, androidChildren());
  console.log(JSON.stringify({ mode, title, pageId: page.id, url: page.url }, null, 2));
} else {
  throw new Error(`지원하지 않는 mode입니다: ${mode}`);
}
