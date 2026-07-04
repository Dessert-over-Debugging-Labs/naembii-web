import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1].trim())
  .filter(Boolean);

const dir = mkdtempSync(join(tmpdir(), 'cook-app-check-'));
const file = join(dir, 'inline-script.js');

try {
  writeFileSync(file, scripts.join('\n;\n'));
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  process.exitCode = result.status || 0;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
