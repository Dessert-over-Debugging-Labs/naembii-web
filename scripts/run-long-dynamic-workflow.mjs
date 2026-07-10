import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argList = process.argv.slice(2);
const argSet = new Set(argList);
const smoke = argSet.has('--smoke');
const full = argSet.has('--full') || argSet.has('--all');
const baseURL = (valueAfter('--base-url') || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const durationMinutes = Number(valueAfter('--duration-minutes') || (smoke ? 0 : 360));
const intervalMinutes = Number(valueAfter('--interval-minutes') || (smoke ? 0 : 20));
const cyclesArg = valueAfter('--cycles');
const explicitCycles = cyclesArg ? Number(cyclesArg) : 0;
const reportMd = valueAfter('--report') || 'docs/verify/LONG_DYNAMIC_WORKFLOW_LAST_ko.md';
const reportJson = reportMd.replace(/\.md$/i, '.json');
const reportHtml = reportMd.replace(/\.md$/i, '.html');
const outDir = resolve(root, valueAfter('--out-dir') || '/tmp/cook-wireframe-v3/long-dynamic-workflow');
const startedAt = new Date();

function valueAfter(name) {
  const inline = argList.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argList.indexOf(name);
  return index >= 0 ? argList[index + 1] : '';
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function commandLabel(command, args) {
  return [command, ...args].join(' ');
}

function writeLogFile(name, text) {
  const safeName = name.replace(/[^a-zA-Z0-9_.-]+/g, '-');
  const file = join(outDir, 'logs', safeName);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text || '');
  return file;
}

function tail(text, max = 1600) {
  const value = String(text || '').trim();
  return value.length > max ? value.slice(value.length - max) : value;
}

function parseLastJson(text) {
  const value = String(text || '').trim();
  for (let index = value.lastIndexOf('{'); index >= 0; index = value.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(value.slice(index));
    } catch {}
  }
  return null;
}

function runTask(cycle, name, command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 180000;
  const started = new Date();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 24,
    timeout: timeoutMs,
    env: process.env
  });
  const ended = new Date();
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const logPath = writeLogFile(`cycle-${cycle}-${name}.log`, [
    `$ ${commandLabel(command, args)}`,
    '',
    '# stdout',
    stdout,
    '',
    '# stderr',
    stderr
  ].join('\n'));
  const parsed = parseLastJson(stdout);
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  return {
    cycle,
    name,
    command: commandLabel(command, args),
    status: timedOut ? 'TIMEOUT' : result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status,
    signal: result.signal || '',
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    durationMs: ended - started,
    timeoutMs,
    logPath,
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
    parsed
  };
}

function landingTask(cycle, mode, portOffset) {
  return {
    name: `landing-${mode}`,
    command: process.execPath,
    args: [
      'scripts/capture-landing.mjs',
      `${baseURL}/`,
      join(outDir, `cycle-${cycle}`, `landing-${mode}.png`),
      mode,
      String(9700 + portOffset)
    ],
    timeoutMs: 90000
  };
}

function tasksForCycle(cycle, previousFailed) {
  const appScreensOut = join(outDir, `cycle-${cycle}`, 'app-screens');
  const tasks = [
    {
      name: 'check',
      command: 'npm',
      args: ['run', 'check'],
      timeoutMs: 90000
    },
    landingTask(cycle, 'mobile', cycle * 10 + 1),
    landingTask(cycle, 'tablet', cycle * 10 + 2),
    landingTask(cycle, 'desktop', cycle * 10 + 3),
    {
      name: 'load-performance',
      command: 'npm',
      args: ['run', 'verify:load-performance', '--', baseURL, String(9800 + cycle)],
      timeoutMs: 150000
    },
    {
      name: 'mobile-flow',
      command: 'npm',
      args: ['run', 'verify:mobile-flow', '--', baseURL, String(9900 + cycle)],
      timeoutMs: 300000
    }
  ];

  if (!smoke || full || previousFailed) {
    tasks.push({
      name: 'app-screens',
      command: 'npm',
      args: ['run', 'verify:app-screens', '--', baseURL, appScreensOut, String(10000 + cycle)],
      timeoutMs: 600000
    });
  }

  if ((!smoke && (full || cycle % 2 === 1 || previousFailed)) || previousFailed) {
    tasks.push({
      name: 'dynamic-scorecard',
      command: 'npm',
      args: [
        'run',
        'verify:visual',
        '--',
        `--base-url=${baseURL}/`,
        '--full',
        '--min-score=96',
        '--report',
        join('docs/verify', `LONG_DYNAMIC_SCORECARD_CYCLE_${cycle}_ko.md`)
      ],
      timeoutMs: 360000
    });
  }

  return tasks;
}

function plannedCycleCount() {
  if (explicitCycles > 0) return Math.max(1, Math.floor(explicitCycles));
  if (smoke) return 1;
  const interval = Math.max(intervalMinutes, 1);
  return Math.max(1, Math.ceil(durationMinutes / interval));
}

function cycleStatus(results) {
  return results.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL';
}

function summarizeMetrics(cycles) {
  const landing = [];
  const load = [];
  const appScreens = [];
  const mobileFlow = [];

  for (const cycle of cycles) {
    for (const task of cycle.results) {
      if (task.name.startsWith('landing-') && task.parsed) {
        landing.push({
          cycle: cycle.cycle,
          mode: task.parsed.mode,
          documentHeight: task.parsed.documentHeight,
          viewportHeight: task.parsed.viewportHeight,
          scrollScreens: task.parsed.mobileScrollScreens,
          cropped: task.parsed.croppedScreenImages || [],
          forbiddenTerms: task.parsed.forbiddenVisibleTerms || [],
          out: task.parsed.out
        });
      }
      if (task.name === 'load-performance' && task.parsed) {
        load.push({
          cycle: cycle.cycle,
          domContentLoadedMs: task.parsed.domContentLoadedMs,
          loadEventMs: task.parsed.loadEventMs,
          youtubeFrameCount: task.parsed.youtubeFrameCount,
          youtubePlayerRequestCount: task.parsed.youtubePlayerRequestCount,
          ytimgRequestCount: task.parsed.ytimgRequestCount
        });
      }
      if (task.name === 'app-screens' && task.parsed) {
        appScreens.push({
          cycle: cycle.cycle,
          status: task.parsed.status,
          checked: task.parsed.checked,
          failed: task.parsed.failed,
          outDir: task.parsed.outDir
        });
      }
      if (task.name === 'mobile-flow' && task.parsed) {
        mobileFlow.push({
          cycle: cycle.cycle,
          homeActive: task.parsed.home?.active,
          promptInputExists: task.parsed.assistant?.opened?.promptInputExists,
          duckedCommands: task.parsed.assistant?.ducked?.commands || [],
          restoredCommands: task.parsed.assistant?.restored?.commands || []
        });
      }
    }
  }

  return { landing, load, appScreens, mobileFlow };
}

function markdownReport(report) {
  const rows = report.cycles
    .map((cycle) => `| ${cycle.cycle} | ${cycle.status} | ${cycle.results.length} | ${Math.round(cycle.durationMs / 1000)}s |`)
    .join('\n');
  const taskRows = report.cycles
    .flatMap((cycle) => cycle.results.map((task) => (
      `| ${cycle.cycle} | ${task.name} | ${task.status} | ${Math.round(task.durationMs / 1000)}s | \`${task.command}\` | \`${relative(task.logPath)}\` |`
    )))
    .join('\n');
  const landingRows = report.metrics.landing
    .map((item) => `| ${item.cycle} | ${item.mode} | ${item.documentHeight} | ${item.viewportHeight} | ${item.scrollScreens} | ${item.cropped.length} | ${item.forbiddenTerms.length} | \`${item.out}\` |`)
    .join('\n');
  const loadRows = report.metrics.load
    .map((item) => `| ${item.cycle} | ${item.domContentLoadedMs}ms | ${item.loadEventMs}ms | ${item.youtubeFrameCount} | ${item.youtubePlayerRequestCount} | ${item.ytimgRequestCount} |`)
    .join('\n');
  const appRows = report.metrics.appScreens
    .map((item) => `| ${item.cycle} | ${item.status} | ${item.checked} | ${item.failed} | \`${item.outDir}\` |`)
    .join('\n');
  const flowRows = report.metrics.mobileFlow
    .map((item) => `| ${item.cycle} | ${item.homeActive} | ${item.promptInputExists} | ${item.duckedCommands.join(', ')} | ${item.restoredCommands.join(', ')} |`)
    .join('\n');

  return [
    '# 장시간 동적 검증 워크플로우 실행 리포트',
    '',
    `- 시작: ${report.startedAt}`,
    `- 종료: ${report.endedAt}`,
    `- 판정: **${report.status}**`,
    `- 모드: ${report.smoke ? 'smoke' : '5-6시간 반복 검증'}`,
    `- 기준 URL: \`${report.baseURL}\``,
    `- 목표 실행 시간: ${report.durationMinutes}분`,
    `- 주기: ${report.intervalMinutes}분`,
    `- 계획 주기 수: ${report.plannedCycles}`,
    `- 산출물: \`${relative(outDir)}\``,
    '',
    '## 전체 판정',
    '',
    '| cycle | status | tasks | duration |',
    '| ---: | --- | ---: | ---: |',
    rows || '| - | - | - | - |',
    '',
    '## 작업별 결과',
    '',
    '| cycle | task | status | duration | command | log |',
    '| ---: | --- | --- | ---: | --- | --- |',
    taskRows || '| - | - | - | - | - | - |',
    '',
    '## 랜딩 모바일 압축 지표',
    '',
    '| cycle | mode | document height | viewport | scroll screens | cropped images | forbidden terms | screenshot |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    landingRows || '| - | - | - | - | - | - | - | - |',
    '',
    '## 로딩 성능 지표',
    '',
    '| cycle | DCL | load | YouTube iframe | YouTube player requests | ytimg requests |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    loadRows || '| - | - | - | - | - | - |',
    '',
    '## 앱 화면 검증',
    '',
    '| cycle | status | checked | failed | outDir |',
    '| ---: | --- | ---: | ---: | --- |',
    appRows || '| smoke에서는 생략됨 | - | - | - | - |',
    '',
    '## 요리비서 플로우 검증',
    '',
    '| cycle | home active | direct input exists | ducked volume commands | restored volume commands |',
    '| ---: | --- | --- | --- | --- |',
    flowRows || '| - | - | - | - | - |',
    '',
    '## 전체 실행 명령',
    '',
    '```bash',
    'npm run verify:long-dynamic -- --base-url=http://127.0.0.1:4873 --duration-minutes=360 --interval-minutes=20 --full',
    '```',
    '',
    '## 운영 규칙',
    '',
    '- 실패가 한 번이라도 나오면 다음 cycle에서 앱 화면 캡처와 동적 점수표를 강제로 포함한다.',
    '- 랜딩은 mobile/tablet/desktop 모두 캡처하고 잘림, 금지어, 스크롤 압박을 기록한다.',
    '- 앱은 모바일 플로우, 로딩 성능, 126개 화면 상태 캡처를 반복한다.',
    '- 결과는 JSON/MD/HTML로 남겨 다음 세션에서 같은 기준으로 이어서 볼 수 있게 한다.',
    ''
  ].join('\n');
}

function htmlReport(markdown, status) {
  const body = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('|')) return `<pre>${line}</pre>`;
      if (line.startsWith('```')) return '';
      if (!line.trim()) return '';
      return `<p>${line}</p>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>장시간 동적 검증 워크플로우 실행 리포트</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f5f5f7;color:#1d1d1f;line-height:1.6}
    main{max-width:1120px;margin:0 auto;padding:40px 20px 80px}
    h1{font-size:34px;line-height:1.2}
    h2{margin-top:32px}
    p,pre{background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:10px 12px}
    pre{white-space:pre-wrap;overflow:auto}
    .status{display:inline-block;border-radius:999px;background:${status === 'PASS' ? '#1d8a57' : '#c8402a'};color:#fff;padding:8px 12px;font-weight:800}
  </style>
</head>
<body><main><p class="status">${status}</p>${body}</main></body>
</html>
`;
}

function relative(file) {
  return resolve(file).startsWith(root) ? resolve(file).slice(root.length + 1) : file;
}

function saveReport(cycles, status) {
  const endedAt = new Date().toISOString();
  const report = {
    startedAt: startedAt.toISOString(),
    endedAt,
    status,
    smoke,
    full,
    baseURL,
    durationMinutes,
    intervalMinutes,
    plannedCycles: plannedCycleCount(),
    outDir,
    cycles,
    metrics: summarizeMetrics(cycles)
  };
  const md = markdownReport(report);
  mkdirSync(dirname(resolve(root, reportMd)), { recursive: true });
  writeFileSync(resolve(root, reportMd), md);
  writeFileSync(resolve(root, reportJson), JSON.stringify(report, null, 2));
  writeFileSync(resolve(root, reportHtml), htmlReport(md, status));
  return report;
}

async function main() {
  if (!existsSync(resolve(root, 'package.json'))) {
    throw new Error('package.json을 찾을 수 없습니다. repo root에서 실행해야 합니다.');
  }

  mkdirSync(outDir, { recursive: true });
  const cycles = [];
  const planned = plannedCycleCount();
  let previousFailed = false;
  let overallStatus = 'PASS';

  for (let cycle = 1; cycle <= planned; cycle += 1) {
    const cycleStarted = new Date();
    const results = [];
    const tasks = tasksForCycle(cycle, previousFailed);

    console.log(`[cycle ${cycle}/${planned}] start ${cycleStarted.toISOString()}`);
    for (const task of tasks) {
      console.log(`[cycle ${cycle}] ${task.name}`);
      const result = runTask(cycle, task.name, task.command, task.args, { timeoutMs: task.timeoutMs });
      results.push(result);
      console.log(`[cycle ${cycle}] ${task.name}: ${result.status}`);
    }

    const status = cycleStatus(results);
    if (status !== 'PASS') overallStatus = 'FAIL';
    previousFailed = status !== 'PASS';
    const cycleEnded = new Date();
    cycles.push({
      cycle,
      status,
      startedAt: cycleStarted.toISOString(),
      endedAt: cycleEnded.toISOString(),
      durationMs: cycleEnded - cycleStarted,
      results
    });
    saveReport(cycles, overallStatus);

    const isLast = cycle === planned;
    if (!isLast && !smoke) {
      const elapsedMs = Date.now() - cycleStarted.getTime();
      const intervalMs = Math.max(0, intervalMinutes * 60 * 1000 - elapsedMs);
      console.log(`[cycle ${cycle}] wait ${Math.round(intervalMs / 1000)}s`);
      await delay(intervalMs);
    }
  }

  const report = saveReport(cycles, overallStatus);
  console.log(markdownReport(report));
  if (overallStatus !== 'PASS') process.exitCode = 1;
}

await main();
