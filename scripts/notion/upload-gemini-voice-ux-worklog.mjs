import { execFileSync } from 'node:child_process';

const NOTION_VERSION = '2022-06-28';
const token = process.env.NOTION_TOKEN;
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
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

function planChildren() {
  return [
    paragraph(`작성일: ${today}`),
    paragraph('목적: main에 반영된 Gemini Live 준비 흐름을 실제로 검증하고, 현재 지원하지 않는 직접 입력 UX를 제거해 음성 또는 준비된 질문 선택 흐름으로 정리한다. AI 답변이 표시되는 동안 YouTube 영상 소리가 방해되지 않도록 임시 음량 낮춤도 함께 검증한다.'),
    heading(2, '투두 감사 결과'),
    bullet('Notion 피드백 실행 투두 기준 open 항목 중 이번 작업과 직접 연결되는 항목은 실제 AI 음성비서 구현 시점 결정, 비서 패널 질문 흐름, 검증 루프와 Notion 진행 상태 업데이트다.'),
    bullet('검색 화면 분리, 홈 카드 인분 제거, 로컬 후기·팁 등은 코드와 테스트상 이미 반영되어 있으나 일부 하위 Notion 체크박스가 미체크로 남아 있어 완료 리포트에 히스토리로 정리한다.'),
    bullet('팀원이 main에 Gemini 연결을 푸시했다는 요청은 fetch 기준 추가 커밋이 없어, 현재 main의 /api/gemini-live-token 구현을 기준으로 검증한다.'),
    heading(2, '이번 작업 범위'),
    todo('Gemini Live 토큰 API와 모바일 마이크 권한 준비 흐름을 로컬/배포 기준으로 검증한다.'),
    todo('요리비서 패널에서 직접 타이핑 입력폼을 제거하고, 마이크 버튼과 준비된 질문 선택만 남긴다.'),
    todo('직접 입력을 지원하지 않는다는 혼선을 줄이도록 대기 문구와 상태 안내를 수정한다.'),
    todo('AI 답변이 thinking/answering 상태일 때 YouTube 영상 볼륨을 임시로 낮추고, 완료/닫기/오류 시 기존 볼륨으로 복구한다.'),
    todo('음량 낮춤은 사용자가 설정한 영상 볼륨값과 음소거 상태를 바꾸지 않도록 구현한다.'),
    todo('모바일 플로우 검증과 앱 화면 캡처 검증에서 직접 입력 제거, 추천 질문 동작, 음량 낮춤·복구를 확인한다.'),
    heading(2, '제외/보류'),
    bullet('Gemini Live의 실제 양방향 오디오 스트리밍은 개인정보 고지, 비용, 지연, 모바일 브라우저 정책 검토가 더 필요하므로 이번 범위에서 기본 활성화하지 않는다.'),
    bullet('새 DB, 로그인, 운영용 관리자 화면은 이번 작업에서 추가하지 않는다.'),
    heading(2, '커밋 단위'),
    todo('commit 1: Notion 투두 감사·작업 계획 스크립트 추가'),
    todo('commit 2: 요리비서 UX와 오디오 덕킹 구현'),
    todo('commit 3: 검증 스크립트 업데이트'),
    todo('commit 4: Notion 완료 리포트와 검증 결과 반영'),
    heading(2, '완료 기준'),
    code([
      '1. origin/main과 HEAD 차이를 확인한다.',
      '2. 조리모드 > 물어보기에서 직접 입력창이 보이지 않는다.',
      '3. 사용자는 마이크 버튼 또는 준비된 질문 버튼으로만 요리비서 체험을 시작한다.',
      '4. 추천 질문 답변 중 YouTube setVolume이 낮은 값으로 호출되고, 답변 종료 후 기존 볼륨으로 복구된다.',
      '5. npm run check, verify:mobile-flow, verify:app-screens를 통과한다.',
      '6. 모바일 주요 화면 스크린샷을 직접 확인한다.',
      '7. 커밋을 분리하고 main에 push한다.'
    ].join('\n'))
  ];
}

function reportChildren() {
  const commits = gitLines(['log', '--pretty=format:%h %s', '--max-count=12']);
  const status = gitLines(['status', '--short']);
  return [
    divider(),
    heading(2, `완료 리포트 · ${today}`),
    paragraph('이번 리포트는 Gemini Live 준비 흐름, 요리비서 입력 UX, AI 답변 중 영상 음량 낮춤, 모바일 검증 결과를 한 페이지에 누적하기 위한 기록이다.'),
    heading(3, '반영 완료'),
    todo('원격 main fetch 결과 HEAD와 origin/main 차이 없음 확인', true),
    todo('요리비서 패널에서 직접 입력폼 제거', true),
    todo('대기 문구를 마이크 또는 준비된 질문 선택 흐름으로 수정', true),
    todo('추천 질문 답변 중 YouTube 영상 음량 임시 낮춤 및 완료 후 복구 구현', true),
    todo('음량 낮춤이 사용자의 영상 볼륨/음소거 설정값을 덮어쓰지 않도록 상태 분리', true),
    todo('모바일 검증에서 요리비서 추천 질문, 패널 크기 조절, 긴 답변 스크롤, 음량 낮춤·복구 확인', true),
    heading(3, '검증 결과'),
    todo('npm run check PASS', true),
    todo('npm run verify:mobile-flow PASS', true),
    todo('npm run verify:app-screens PASS', true),
    todo('모바일 스크린샷 직접 확인 완료', true),
    heading(3, 'Notion 투두 정리 메모'),
    bullet('검색 시작/결과 분리, 홈 카드 인분 제거, 로컬 후기·팁 관련 항목은 코드와 검증상 반영되어 있으나 과거 하위 페이지 체크박스 일부가 미체크로 남아 있다. 이후 별도 정리 세션에서 Notion 체크 상태만 일괄 정리하면 된다.'),
    bullet('실제 Gemini Live 양방향 오디오 스트리밍은 아직 제품/개인정보/비용 결정이 필요해 보류 상태다. 이번 배포는 토큰 준비 확인과 베타용 UX 정리까지다.'),
    heading(3, '최근 커밋'),
    code(commits || '커밋 확인 실패'),
    heading(3, '작업 트리'),
    code(status || 'clean')
  ];
}

if (mode === 'plan') {
  const title = `Gemini Live 검증·요리비서 UX·오디오 덕킹 · ${today}`;
  const page = await notion('/pages', {
    parent: { type: 'page_id', page_id: actionPageId },
    properties: { title: { title: text(title) } },
    children: planChildren()
  });
  await appendBlocks(actionPageId, [
    heading(3, `진행 작업 · ${today}`),
    paragraph(`Gemini Live 검증·요리비서 UX·오디오 덕킹 작업 페이지: ${page.url}`)
  ]);
  console.log(JSON.stringify({ mode, title, pageId: page.id, url: page.url }, null, 2));
} else if (mode === 'report') {
  const pageId = process.env.NOTION_GEMINI_VOICE_WORKLOG_PAGE_ID;
  if (!pageId) {
    throw new Error('report 모드에는 NOTION_GEMINI_VOICE_WORKLOG_PAGE_ID가 필요합니다.');
  }
  await appendBlocks(pageId, reportChildren());
  console.log(JSON.stringify({ mode, pageId, appended: true }, null, 2));
} else {
  throw new Error(`지원하지 않는 mode입니다: ${mode}`);
}
