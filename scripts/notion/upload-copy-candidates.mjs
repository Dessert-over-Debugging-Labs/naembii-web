import { COPY_CANDIDATE_PARENT_PAGE_ID, copyCandidateGroups } from './naembi-copy-candidate-data.mjs';

const NOTION_VERSION = '2022-06-28';
const parentPageId = process.env.NOTION_COPY_CANDIDATES_PARENT_PAGE_ID || COPY_CANDIDATE_PARENT_PAGE_ID;
const token = process.env.NOTION_TOKEN;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const title = `어색한 어휘 수정 후보 · ${today}`;

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

function text(content) {
  return [{ type: 'text', text: { content } }];
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

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function candidateLine(candidate) {
  return `[${candidate.id}] ${candidate.location} | 기존: ${candidate.before} | 후보: ${candidate.after} | 이유: ${candidate.reason}`;
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
  heading(2, '사용 방법'),
  bullet('실제 반영할 후보만 체크합니다. 체크하지 않은 문구는 코드에 반영하지 않습니다.'),
  bullet('같은 묶음 안에서는 하나만 체크합니다. 여러 개를 체크하면 읽기 스크립트가 실패하도록 만들었습니다.'),
  bullet('체크 후 Codex에 "어휘 후보 체크 완료"라고 말하면 체크된 항목만 읽고 dry-run 검증 후 반영합니다.'),
  bullet('적용 순서: notion:copy-candidates:read → notion:copy-candidates:apply -- --dry-run → notion:copy-candidates:apply'),
  bullet('검색 결과 분리, 모바일 레이아웃 같은 구조 수정은 별도로 진행하고, 문구 교체는 이 페이지의 체크 상태를 기준으로 합니다.'),
  divider()
];

for (const group of copyCandidateGroups) {
  children.push(heading(2, group.title));
  children.push(paragraph(group.note));
  children.push(...group.candidates.map((candidate) => todo(candidateLine(candidate))));
}

const page = await notion('/pages', {
  parent: { type: 'page_id', page_id: parentPageId },
  properties: { title: { title: text(title) } },
  children
});

console.log(JSON.stringify({ title, pageId: page.id, url: page.url }, null, 2));
