import { execFileSync } from 'node:child_process';

const NOTION_VERSION = '2022-06-28';
const actionPageId = process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec';
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `냄비 웹앱 피드백·검증 반영 리포트 · ${today}`;

const stagePages = [
  {
    id: '396b1da1d9f981608b6ffc6a7612399d',
    title: '1단계 P0 랜딩 압축·체험 안정화',
    note: '완료: 랜딩 중복 설명을 줄이고, 모바일 첫 화면 CTA와 앱 체험 진입을 검증했다.'
  },
  {
    id: '396b1da1d9f98121ad70e7b4e5f965bc',
    title: '2단계 P1 앱 체험 기능 보강',
    note: '완료: 앱 내부 피드백 제출 버그, 타이머 직접 입력, 기존 재료 보기+체크리스트 추가 보기, 요리비서 질문 입력/추천 질문을 반영했다.'
  },
  {
    id: '396b1da1d9f981b09bf5f39714849acb',
    title: '3단계 P1 측정·운영 세팅',
    note: '완료: Mixpanel 가이드, Slack/Sheet 반영완료, 운영뷰 자동 갱신, 검증 루프를 문서화했다.'
  },
  {
    id: '396b1da1d9f98197989efc44fe97097f',
    title: '4단계 P2 추가 논의',
    note: '보류: 실제 AI 음성비서와 카테고리 확정은 별도 논의 페이지에서 결정한다.'
  }
];

const categoryPageUrl = 'https://app.notion.com/p/396b1da1d9f981ceb62fc696935522c6';
const mixpanelPageUrl = 'https://app.notion.com/p/Mixpanel-396b1da1d9f9816097c6d4e10fc7608b';
const actionPageUrl = 'https://app.notion.com/p/2026-07-08-396b1da1d9f981c0b960c20c6cf6b7ec';

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

function latestCommits() {
  try {
    return execFileSync('git', ['log', '-5', '--pretty=format:%h %s'], { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
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

const commits = latestCommits();

const children = [
  paragraph(`작성일: ${today}`),
  paragraph('목적: Notion 체크리스트 기반 웹앱 피드백 반영 결과, 모바일 화면 잘림 검증, Ralph 루프 결과를 한 곳에 남긴다.'),
  heading(2, '반영 요약'),
  bullet('랜딩 하단 중복 설명을 줄이고 요리비서 예시와 앱 체험/신청/요청 흐름을 더 앞쪽에 배치했다.'),
  bullet('웹앱 내부 의견 남기기 제출이 멈추던 원인을 수정했다. 원인은 `currentViewId()` 누락으로 submit 중 JS 에러가 난 점이었다.'),
  bullet('타이머 숫자 직접 입력, 기존 재료 보기와 체크리스트 추가 보기 전환, 요리비서 질문 선택/입력, 여러 재료 검색 진입을 추가했다.'),
  bullet('웹앱 내부 화면 잘림 검증을 추가했다. 홈/검색/상세/조리/타이머/재료/음성비서/완료를 390x844, 375x667, 데스크톱 앱 쉘에서 검사한다.'),
  bullet('`verify:visual`에 `app screen clipping` 하드 게이트를 통합해, 랜딩 캡처뿐 아니라 `/app` 내부 30개 상태 overflow를 함께 검증한다.'),
  bullet('Apps Script 운영뷰를 매번 수동 실행하지 않도록 Form submit 트리거와 webhook 저장 직후 갱신 경로를 추가했다.'),
  bullet('카테고리 후보는 바로 개발 반영하지 않고 별도 논의 페이지로 분리했다.'),
  heading(2, '검증 결과'),
  todo('npm run check PASS', true),
  todo('node --check scripts/google-apps-script/create-naembi-beta-collection.js PASS', true),
  todo('npm run verify:dynamic -- --full --min-score=96 PASS, 110/110', true),
  todo('npm run verify:visual -- --full --min-score=96 PASS, 130/130', true),
  todo('npm run verify:app-screens PASS: /app 내부 30개 상태 잘림/overflow 0건', true),
  todo('Ralph 루프 1라운드 PASS: 130/130, app screen clipping PASS', true),
  todo('node scripts/validate-mobile-flow.mjs PASS: /app 홈, 피드백 제출, 타이머 7분, 요리비서 입력 확인', true),
  todo('별도 검증 에이전트 PASS: 재료 보기 추가 방식과 앱 내부 잘림 검증 통합 확인', true),
  todo('Vercel /app HTTP 200 확인, 최신 배포 반영', true),
  heading(2, '생성/갱신한 Notion 문서'),
  linkParagraph('실행 투두 페이지', actionPageUrl),
  linkParagraph('카테고리 논의 기록', categoryPageUrl),
  linkParagraph('Mixpanel 세팅 가이드', mixpanelPageUrl),
  heading(2, '커밋'),
  code(commits.join('\n') || '커밋 정보 없음'),
  heading(2, '남은 결정'),
  bullet('홈 카테고리는 SNS 트렌드, 간단 집밥, 가벼운 한끼, 재료 적게 가능, 여름에 어울리는 요리 후보를 논의 후 확정한다.'),
  bullet('실제 AI 음성비서 구현은 이번 반영 범위가 아니며, 베타에서 정해진 질문/답변형 사용성을 먼저 확인한다.'),
  bullet('운영자가 기존 Google Sheet를 쓰고 있다면 Apps Script에서 `installNaembiOperatingViewAutomation`을 한 번 실행해야 한다.')
];

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: actionPageId },
  properties: { title: { title: text(title) } },
  children
});

for (const stage of stagePages) {
  await appendBlocks(stage.id, [
    heading(3, `진행 업데이트 · ${today}`),
    paragraph(stage.note),
    linkParagraph('상세 리포트', page.url)
  ]);
}

await appendBlocks(actionPageId, [
  heading(3, `작업 완료 리포트 · ${today}`),
  linkParagraph(title, page.url)
]);

console.log(JSON.stringify({
  title,
  pageId: page.id,
  url: page.url,
  updatedStagePages: stagePages.map((stage) => stage.title)
}, null, 2));
