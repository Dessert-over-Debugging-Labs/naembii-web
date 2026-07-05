import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const startedAt = new Date();

function hasFlag(name) {
  return args.includes(name);
}

function valueAfter(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : '';
}

function numberArg(name, fallback) {
  const value = Number(valueAfter(name));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const visual = hasFlag('--no-visual') ? false : true;
const full = hasFlag('--no-full') ? false : true;
const minScore = numberArg('--min-score', 96);
const maxMinutes = numberArg('--max-minutes', 30);
const minRuntimeMinutes = numberArg('--min-runtime-minutes', 0);
const intervalSeconds = numberArg('--interval-seconds', 90);
const maxRounds = numberArg('--rounds', 999);
const reportMd = valueAfter('--loop-report') || 'docs/verify/NAEMBI_RALPH_LOOP_LAST_ko.md';
const reportJson = reportMd.replace(/\.md$/i, '.json');
const roundReportMd = valueAfter('--round-report') || 'docs/verify/NAEMBI_RALPH_LOOP_ROUND_LAST_ko.md';
const roundReportJson = roundReportMd.replace(/\.md$/i, '.json');
let baseURL = valueAfter('--base-url');
let server = null;

function portFromBaseURL(url) {
  try {
    return Number(new URL(url).port || 80);
  } catch {
    return 4191;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await delay(250);
  }
  return false;
}

async function ensureServer() {
  if (baseURL) return { started: false, baseURL };

  const port = Number(process.env.PORT || 4191);
  baseURL = `http://127.0.0.1:${port}/`;
  const alreadyRunning = await waitForServer(baseURL);
  if (alreadyRunning) return { started: false, baseURL };

  server = spawn(process.execPath, ['scripts/serve-static.mjs'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = await waitForServer(baseURL);
  if (!ready) {
    server.kill('SIGTERM');
    throw new Error(`로컬 서버 시작 실패: ${baseURL}`);
  }
  return { started: true, baseURL };
}

function runRound(round) {
  const commandArgs = ['scripts/verify-dynamic.mjs', `--base-url=${baseURL}`, `--min-score=${minScore}`, `--report=${roundReportMd}`];
  if (full) commandArgs.push('--full');
  if (visual) commandArgs.push('--visual');

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 24,
    timeout: 120000
  });

  let parsed = null;
  if (existsSync(resolve(root, roundReportJson))) {
    try {
      parsed = JSON.parse(readFileSync(resolve(root, roundReportJson), 'utf8'));
    } catch {}
  }

  const summary = parsed?.summary || (result.status === 0 ? 'PASS' : result.status === 2 ? 'INCONCLUSIVE' : 'FAIL');
  const percent = parsed?.scorecard?.percent ?? 0;
  const scorePass = summary === 'PASS' && percent > minScore;

  return {
    round,
    at: new Date().toISOString(),
    command: [process.execPath, ...commandArgs].join(' '),
    exitCode: result.status,
    summary,
    percent,
    score: parsed?.scorecard ? `${parsed.scorecard.total} / ${parsed.scorecard.max}` : '-',
    scorePass,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
}

function tail(text, max = 2000) {
  const value = String(text || '').trim();
  return value.length > max ? value.slice(value.length - max) : value;
}

function writeLoopReport(rounds, finalStatus, note) {
  const latest = rounds.at(-1);
  const rows = rounds.map((round) => (
    `| ${round.round} | ${round.at} | ${round.summary} | ${round.score} | ${round.percent}% | ${round.exitCode ?? '-'} |`
  )).join('\n');

  const md = [
    '# 냄비 Ralph 검증 루프 실행 리포트',
    '',
    `- 시작: ${startedAt.toISOString()}`,
    `- 종료: ${new Date().toISOString()}`,
    `- 최종 판정: **${finalStatus}**`,
    `- 기준 URL: \`${baseURL}\``,
    `- 통과 기준: **${minScore}% 초과**`,
    `- 모드: ${visual ? 'visual 포함' : 'static/API/deploy 중심'}`,
    `- 최소 실행 시간: ${minRuntimeMinutes}분`,
    `- 최대 실행 시간: ${maxMinutes}분`,
    note ? `- 메모: ${note}` : '',
    '',
    '## 라운드',
    '',
    '| round | at | summary | score | percent | exit |',
    '| ---: | --- | --- | --- | ---: | ---: |',
    rows || '| - | - | - | - | - | - |',
    '',
    '## 최신 라운드 리포트',
    '',
    `- Markdown: \`${roundReportMd}\``,
    `- JSON: \`${roundReportJson}\``,
    '',
    '## 최신 stdout tail',
    '',
    '```text',
    latest?.stdoutTail || '',
    '```',
    '',
    '## 최신 stderr tail',
    '',
    '```text',
    latest?.stderrTail || '',
    '```',
    ''
  ].filter((line) => line !== '').join('\n');

  mkdirSync(dirname(resolve(root, reportMd)), { recursive: true });
  writeFileSync(resolve(root, reportMd), md);
  writeFileSync(resolve(root, reportJson), JSON.stringify({
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    finalStatus,
    note,
    baseURL,
    minScore,
    visual,
    full,
    minRuntimeMinutes,
    maxMinutes,
    intervalSeconds,
    maxRounds,
    rounds
  }, null, 2));
  console.log(md);
}

const rounds = [];
let finalStatus = 'TIMEOUT';
let note = '';

try {
  await ensureServer();
  const deadline = Date.now() + maxMinutes * 60 * 1000;
  const minDeadline = Date.now() + minRuntimeMinutes * 60 * 1000;

  for (let round = 1; round <= maxRounds && Date.now() <= deadline; round += 1) {
    const result = runRound(round);
    rounds.push(result);

    if (result.scorePass && Date.now() >= minDeadline) {
      finalStatus = 'PASS';
      note = '점수 기준과 게이트를 만족했다.';
      break;
    }

    if (result.scorePass && Date.now() < minDeadline) {
      note = 'PASS 상태지만 최소 실행 시간이 남아 있어 지속 검증 중이다.';
    } else if (result.summary === 'INCONCLUSIVE') {
      note = '실행 환경 불확실성이 있어 다음 라운드에서 재시도한다.';
    } else if (result.summary === 'FAIL') {
      note = '제품/문서/설정 게이트 실패가 있어 보정이 필요하다.';
    }

    if (round < maxRounds && Date.now() + intervalSeconds * 1000 <= deadline) {
      await delay(intervalSeconds * 1000);
    }
  }

  if (finalStatus !== 'PASS') {
    const latest = rounds.at(-1);
    finalStatus = latest?.summary === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'FAIL';
    note = note || '정해진 시간 안에 96% 초과 PASS를 확보하지 못했다.';
  }
} catch (error) {
  finalStatus = 'INCONCLUSIVE';
  note = error.message || '루프 실행 중 오류';
} finally {
  writeLoopReport(rounds, finalStatus, note);
  if (server) server.kill('SIGTERM');
}

if (finalStatus === 'FAIL') process.exitCode = 1;
if (finalStatus === 'INCONCLUSIVE') process.exitCode = 2;
