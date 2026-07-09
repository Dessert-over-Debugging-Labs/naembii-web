import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readSelectedCopyCandidates } from './copy-candidate-notion.mjs';

const token = process.env.NOTION_TOKEN;
const pageId = process.env.NOTION_COPY_CANDIDATES_PAGE_ID || process.argv.find((arg) => /^[0-9a-f-]{32,36}$/i.test(arg));
const dryRun = process.argv.includes('--dry-run');
const root = process.cwd();

function normalizeReplacement(candidate, replacement) {
  return {
    id: candidate.id,
    group: candidate.groupTitle,
    file: replacement.file,
    from: replacement.from,
    to: replacement.to
  };
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

const result = await readSelectedCopyCandidates({ token, pageId });

if (!result.ok) {
  console.error(JSON.stringify({
    ok: false,
    error: '같은 묶음에서 여러 후보가 체크되어 있습니다.',
    duplicates: result.duplicates
  }, null, 2));
  process.exit(1);
}

const replacements = result.selected.flatMap((candidate) => (
  (candidate.replacements || []).map((replacement) => normalizeReplacement(candidate, replacement))
));
const byFile = new Map();

for (const replacement of replacements) {
  const list = byFile.get(replacement.file) || [];
  list.push(replacement);
  byFile.set(replacement.file, list);
}

const summary = {
  ok: true,
  dryRun,
  checked: result.checked,
  changedFiles: [],
  applied: [],
  alreadyApplied: [],
  missing: []
};

for (const [file, items] of byFile) {
  const filePath = resolve(root, file);
  let source = readFileSync(filePath, 'utf8');
  let next = source;
  let touched = false;

  for (const item of items) {
    const beforeCount = countOccurrences(next, item.from);
    const afterCount = countOccurrences(next, item.to);

    if (beforeCount === 0) {
      if (afterCount > 0) {
        summary.alreadyApplied.push({ id: item.id, file: item.file, text: item.to, count: afterCount });
      } else {
        summary.missing.push({ id: item.id, file: item.file, from: item.from, to: item.to });
      }
      continue;
    }

    next = next.replaceAll(item.from, item.to);
    touched = true;
    summary.applied.push({ id: item.id, group: item.group, file: item.file, from: item.from, to: item.to, count: beforeCount });
  }

  if (touched) {
    summary.changedFiles.push(file);
    if (!dryRun) writeFileSync(filePath, next);
  }
}

summary.changedFiles = [...new Set(summary.changedFiles)];

if (summary.missing.length) {
  summary.ok = false;
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
