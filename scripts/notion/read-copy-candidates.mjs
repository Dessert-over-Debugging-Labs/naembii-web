import { readSelectedCopyCandidates } from './copy-candidate-notion.mjs';

const token = process.env.NOTION_TOKEN;
const pageId = process.env.NOTION_COPY_CANDIDATES_PAGE_ID || process.argv[2];

const result = await readSelectedCopyCandidates({ token, pageId });

if (!result.ok) {
  console.error(JSON.stringify({
    ok: false,
    error: '같은 묶음에서 여러 후보가 체크되어 있습니다.',
    duplicates: result.duplicates
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: result.checked,
  unknown: result.unknown,
  selected: result.selected.map((candidate) => ({
    id: candidate.id,
    group: candidate.group,
    groupTitle: candidate.groupTitle,
    location: candidate.location,
    before: candidate.before,
    after: candidate.after,
    reason: candidate.reason
  }))
}, null, 2));
