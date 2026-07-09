import { copyCandidateById } from './naembi-copy-candidate-data.mjs';

export const NOTION_VERSION = '2022-06-28';

function plainText(richText = []) {
  return richText.map((item) => item.plain_text || item.text?.content || '').join('');
}

async function notion({ token, path, method = 'GET' }) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function listChildren({ token, blockId }) {
  const blocks = [];
  let cursor = '';
  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : '';
    const data = await notion({ token, path: `/blocks/${blockId}/children${query}` });
    blocks.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : '';
  } while (cursor);
  return blocks;
}

export async function readSelectedCopyCandidates({ token, pageId }) {
  if (!token) {
    throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
  }

  if (!pageId) {
    throw new Error('NOTION_COPY_CANDIDATES_PAGE_ID 환경변수 또는 첫 번째 인자로 후보 페이지 ID가 필요합니다.');
  }

  const blocks = await listChildren({ token, blockId: pageId.replaceAll('-', '') });
  const checkedIds = [];

  for (const block of blocks) {
    if (block.type !== 'to_do') continue;
    const content = plainText(block.to_do?.rich_text);
    const id = content.match(/\[(COPY-\d+)\]/)?.[1];
    if (id && block.to_do?.checked) checkedIds.push(id);
  }

  const selected = checkedIds.map((id) => copyCandidateById.get(id)).filter(Boolean);
  const unknown = checkedIds.filter((id) => !copyCandidateById.has(id));
  const byGroup = new Map();

  for (const candidate of selected) {
    const list = byGroup.get(candidate.group) || [];
    list.push(candidate);
    byGroup.set(candidate.group, list);
  }

  const duplicates = [...byGroup.values()].filter((items) => items.length > 1);
  return {
    ok: duplicates.length === 0,
    checked: selected.length,
    selected,
    unknown,
    duplicates: duplicates.map((items) => ({
      group: items[0].groupTitle,
      ids: items.map((item) => item.id)
    }))
  };
}
