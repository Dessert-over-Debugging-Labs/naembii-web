const NOTION_VERSION = '2022-06-28';
const token = process.env.NOTION_TOKEN;

const rootPages = [
  process.env.NOTION_ACTION_PAGE_ID || '396b1da1d9f981c0b960c20c6cf6b7ec',
  process.env.NOTION_FEEDBACK_PAGE_ID || '396b1da1d9f980deb3bff5582ba6aabe'
];

if (!token) {
  throw new Error('NOTION_TOKEN 환경변수가 필요합니다.');
}

async function notion(path) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
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

function richText(block) {
  const value = block[block.type];
  return (value?.rich_text || value?.title || [])
    .map((item) => item.plain_text || item.text?.content || '')
    .join('')
    .trim();
}

async function getPageTitle(pageId) {
  try {
    const page = await notion(`/pages/${pageId}`);
    const titleProp = Object.values(page.properties || {}).find((prop) => prop.type === 'title');
    return (titleProp?.title || []).map((item) => item.plain_text || '').join('').trim() || pageId;
  } catch {
    return pageId;
  }
}

async function listChildren(blockId) {
  const items = [];
  let cursor = '';
  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const data = await notion(`/blocks/${blockId}/children${query}`);
    items.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : '';
  } while (cursor);
  return items;
}

async function collectTodos(blockId, path, depth = 0, maxDepth = 2) {
  const blocks = await listChildren(blockId);
  const todos = [];
  for (const block of blocks) {
    if (block.type === 'to_do') {
      todos.push({
        path,
        checked: !!block.to_do.checked,
        text: richText(block)
      });
    }
    if (block.type === 'child_page' && depth < maxDepth) {
      const title = block.child_page.title || block.id;
      todos.push(...await collectTodos(block.id, `${path} > ${title}`, depth + 1, maxDepth));
    }
  }
  return todos;
}

const results = [];
for (const pageId of [...new Set(rootPages)]) {
  const title = await getPageTitle(pageId);
  const todos = await collectTodos(pageId, title);
  results.push({
    pageId,
    title,
    total: todos.length,
    open: todos.filter((item) => !item.checked).length,
    done: todos.filter((item) => item.checked).length,
    openItems: todos.filter((item) => !item.checked).slice(0, 80)
  });
}

console.log(JSON.stringify(results, null, 2));
