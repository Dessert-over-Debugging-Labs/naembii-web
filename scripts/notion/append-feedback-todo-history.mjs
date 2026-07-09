import { execFileSync } from 'node:child_process';

const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

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

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
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

const commitRange = gitLines(['log', '--pretty=format:%h %s', 'b2e6028..HEAD'], '');
const latestCommit = gitLines(['rev-parse', '--short', 'HEAD'], 'HEAD 확인 실패');

const children = [
  divider(),
  heading(2, `작업 히스토리 · ${today} · 타이머/요리비서/성능/반응형`),
  paragraph('목적: 이번 세션에서 처리한 피드백을 피드백 실행 투두 안에 한 번에 남기고, 이후 별도 중복 페이지를 만들지 않도록 관리한다.'),
  heading(3, '반영 완료'),
  todo('타이머 10분 상태에서 +30초가 0:30으로 초기화되던 문제 수정', true),
  todo('타이머 완료 알림음/진동은 최대 1분 반복 후 자동 정지되도록 수정', true),
  todo('요리비서 직접 입력이 "다음 단계" 명령으로 오인식되어 단계가 넘어가던 문제 수정', true),
  todo('홈 초기 로딩에서 상세/조리 YouTube iframe과 랜딩 미리보기 iframe을 지연 로딩 처리', true),
  todo('YouTube 썸네일을 화면 근처에서만 로드하고, 외부 아이콘/폰트가 첫 렌더를 막지 않도록 조정', true),
  todo('요리비서 패널을 클릭 확장뿐 아니라 드래그 중간 높이에 멈출 수 있게 수정', true),
  todo('설정 모달 이름을 "소리·재생 설정"으로 변경', true),
  todo('요리비서 볼륨 조절을 추가하고 알림음 채널 gain에 반영', true),
  todo('재생속도 +/- 조절과 0.5×, 0.75× 저속 옵션 추가', true),
  todo('요리비서 가이드 문구를 "이렇게 물어볼 수 있어요"로 수정', true),
  todo('영상 볼륨 슬라이더 값이 음소거/복구 뒤에도 유지되도록 보정', true),
  todo('랜딩 태블릿 폭에서 히어로 증거 카드를 숨겨 핵심 GIF가 첫 화면에 보이도록 반응형 보정', true),
  heading(3, '검증 결과'),
  todo('npm run check PASS', true),
  todo('npm run verify:load-performance -- http://127.0.0.1:4873 PASS · DOMContentLoaded 136ms, YouTube 플레이어 요청 0건', true),
  todo('npm run verify:mobile-flow -- http://127.0.0.1:4873 PASS · 피드백, 타이머, 재료, 설정, 요리비서 입력/리사이즈 확인', true),
  todo('npm run verify:app-screens -- http://127.0.0.1:4873 /tmp/cook-wireframe-v3/app-screens PASS · 84개 앱 내부 상태 잘림 0건', true),
  todo('npm run verify:visual -- --base-url=http://127.0.0.1:4873 --full --min-score=96 PASS · 127/130, 98%', true),
  heading(3, '중복 문서 정리'),
  todo('이번 세션은 새 별도 리포트 페이지를 만들지 않고 이 피드백 실행 투두 본문에 히스토리로 병합', true),
  todo('임시 worklog 체크리스트 업로드 스크립트 초안 제거', true),
  todo('기존 개별 계획/리포트 페이지는 참조용으로 보존하고, 이후 작업 완료 기록은 이 히스토리에 누적', true),
  heading(3, '커밋 히스토리'),
  code(commitRange || 'b2e6028 이후 커밋 없음'),
  paragraph(`최신 커밋: ${latestCommit}`)
];

await appendBlocks(actionPageId, children);

console.log(JSON.stringify({
  actionPageId,
  date: today,
  latestCommit,
  appendedBlocks: children.length
}, null, 2));
